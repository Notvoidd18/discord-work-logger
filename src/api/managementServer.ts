import http from 'http';
import { botManager } from '../platform/botManager';
import { logger } from '../utils/logger';
import { ActivityType } from 'discord.js';

function getApiKey(): string {
  return process.env.BOT_HOST_API_KEY || 'ongrywolf_secret_host_key';
}

function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload Too Large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: http.ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
  });
  res.end(JSON.stringify(data));
}

function verifyAuth(req: http.IncomingMessage): boolean {
  const currentKey = getApiKey();
  const authHeader = req.headers['authorization'];
  const xApiKey = req.headers['x-api-key'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token === currentKey) return true;
  }

  if (xApiKey && typeof xApiKey === 'string' && xApiKey.trim() === currentKey) {
    return true;
  }

  return false;
}

export function createManagementServer(): http.Server {
  const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
      });
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const method = req.method || 'GET';

    // 1. Public Health Check (Render Health Monitoring)
    if (pathname === '/health' || pathname === '/api/health' || (pathname === '/' && method === 'GET')) {
      const summary = botManager.getSummary();
      sendJson(res, 200, {
        status: 'ok',
        platform: summary.platform,
        uptimeSeconds: Math.floor(process.uptime()),
        totalBots: summary.totalBots,
        onlineBots: summary.onlineBots,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 2. Authentication Enforcement for all management endpoints
    if (!verifyAuth(req)) {
      sendJson(res, 401, {
        error: 'Unauthorized: Invalid or missing management API key.',
      });
      return;
    }

    try {
      // 3. GET /api/managed-bots - List all bots
      if (pathname === '/api/managed-bots' && method === 'GET') {
        const bots = botManager.getAllRuntimeStatuses();
        sendJson(res, 200, {
          success: true,
          total: bots.length,
          bots,
        });
        return;
      }

      // 4. POST /api/managed-bots - Register a new bot dynamically
      if (pathname === '/api/managed-bots' && method === 'POST') {
        const body = await parseJsonBody(req);
        const {
          id,
          displayName,
          applicationId,
          token,
          defaultPrefix,
          defaultStatusText,
          defaultStatusType,
          assignedCommands,
          ownerAccount,
          enabledModules,
          desiredEnabled,
        } = body;

        if (!displayName || !displayName.trim()) {
          sendJson(res, 400, { error: 'Bot display name is required' });
          return;
        }

        if (!token || !token.trim()) {
          sendJson(res, 400, { error: 'Bot token is required' });
          return;
        }

        const botId = (id || `bot_${displayName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_${Date.now().toString().slice(-4)}`).trim();

        botManager.registerBot({
          id: botId,
          displayName: displayName.trim(),
          applicationId: applicationId?.trim(),
          explicitToken: token.trim(),
          defaultPrefix: defaultPrefix?.trim() || '!',
          defaultStatusText: defaultStatusText?.trim() || 'Hosting on Ongrywolf',
          defaultStatusType: ActivityType.Custom,
          brandWatermark: 'Hosting on Ongrywolf',
          defaultCommands: Array.isArray(assignedCommands) && assignedCommands.length > 0 ? assignedCommands : ['log', 'listlog', 'channellog'],
          ownerAccount: ownerAccount?.trim(),
          enabledModules: Array.isArray(enabledModules) ? enabledModules : ['work_logs'],
          version: '1.0.0',
        });

        const instance = botManager.getBot(botId);
        if (instance) {
          await instance.initConfig();
          if (desiredEnabled !== false) {
            instance.start().catch((err) => {
              logger.error(`Background start error for bot "${botId}":`, err);
            });
          }
          sendJson(res, 201, {
            success: true,
            bot: instance.getRuntimeStatus(),
          });
        } else {
          sendJson(res, 500, { error: 'Failed to initialize bot instance' });
        }
        return;
      }

      // Regex matching: /api/managed-bots/:id[/action]
      const singleBotMatch = pathname.match(/^\/api\/managed-bots\/([a-zA-Z0-9_-]+)(?:\/([a-zA-Z0-9_-]+))?$/);

      if (singleBotMatch) {
        const botId = singleBotMatch[1];
        const action = singleBotMatch[2];
        const bot = botManager.getBot(botId);

        if (!bot) {
          sendJson(res, 404, { error: `Managed bot "${botId}" not found` });
          return;
        }

        // GET /api/managed-bots/:id
        if (!action && method === 'GET') {
          sendJson(res, 200, {
            success: true,
            bot: bot.getRuntimeStatus(),
          });
          return;
        }

        // DELETE /api/managed-bots/:id
        if (!action && method === 'DELETE') {
          const deleted = await botManager.deleteBot(botId);
          sendJson(res, 200, {
            success: deleted,
            message: `Bot "${botId}" permanently removed from hosting runtime.`,
          });
          return;
        }

        // POST /api/managed-bots/:id/start
        if (action === 'start' && method === 'POST') {
          await bot.start();
          sendJson(res, 200, {
            success: true,
            status: bot.getRuntimeStatus(),
          });
          return;
        }

        // POST /api/managed-bots/:id/stop
        if (action === 'stop' && method === 'POST') {
          await bot.stop();
          sendJson(res, 200, {
            success: true,
            status: bot.getRuntimeStatus(),
          });
          return;
        }

        // POST /api/managed-bots/:id/restart
        if (action === 'restart' && method === 'POST') {
          await bot.restart();
          sendJson(res, 200, {
            success: true,
            status: bot.getRuntimeStatus(),
          });
          return;
        }

        // PATCH /api/managed-bots/:id/config
        if (action === 'config' && (method === 'PATCH' || method === 'POST')) {
          const body = await parseJsonBody(req);
          await bot.updateConfig(body);
          sendJson(res, 200, {
            success: true,
            status: bot.getRuntimeStatus(),
          });
          return;
        }

        // GET /api/managed-bots/:id/status
        if (action === 'status' && method === 'GET') {
          sendJson(res, 200, {
            success: true,
            status: bot.getRuntimeStatus(),
          });
          return;
        }

        // GET /api/managed-bots/:id/logs
        if (action === 'logs' && method === 'GET') {
          const logs = bot.getSanitizedLogs();
          sendJson(res, 200, {
            success: true,
            botId,
            total: logs.length,
            logs,
          });
          return;
        }
      }

      // Not found
      sendJson(res, 404, { error: 'Route not found' });
    } catch (err: any) {
      logger.error('Management API error:', err);
      sendJson(res, 500, { error: err.message || 'Internal server error' });
    }
  });

  return server;
}
