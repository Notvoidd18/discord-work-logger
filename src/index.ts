import http from 'http';
import { config } from './config/env';
import { logger } from './utils/logger';
import { testDatabaseConnection, pool } from './database/pool';
import { initializeDatabaseSchema } from './database/schema';
import { botManager } from './platform/botManager';

let healthCheckServer: http.Server | null = null;

/**
 * Lightweight HTTP server for Render Web Service compatibility
 * Provides real-time health telemetry across all managed bot instances without exposing secrets.
 */
function startHealthCheckServer(): http.Server {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const summary = botManager.getSummary();

    res.end(
      JSON.stringify(
        {
          status: 'ok',
          platform: summary.platform,
          totalBots: summary.totalBots,
          onlineBots: summary.onlineBots,
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          bots: summary.bots,
        },
        null,
        2
      )
    );
  });

  server.listen(config.port, () => {
    logger.info(`Multi-Bot health check server listening on port ${config.port}`);
  });

  return server;
}

/**
 * Graceful shutdown sequence
 */
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Initiating graceful multi-bot shutdown...`);

  if (healthCheckServer) {
    healthCheckServer.close(() => {
      logger.info('HTTP health check server stopped.');
    });
  }

  try {
    await botManager.stopAll();
  } catch (err) {
    logger.error('Error shutting down bot instances:', err);
  }

  try {
    await pool.end();
    logger.info('Database pool closed.');
  } catch (err) {
    logger.error('Error closing database pool:', err);
  }

  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

/**
 * Application Bootstrapper
 */
async function bootstrap() {
  try {
    logger.info('=============================================');
    logger.info('  Starting Ongrywolf Multi-Bot Platform      ');
    logger.info('=============================================');

    // 1. Database connection check
    logger.info('Connecting to PostgreSQL database...');
    await testDatabaseConnection();

    // 2. Schema verification & automatic migrations
    logger.info('Verifying database schema and tables...');
    await initializeDatabaseSchema();

    // 3. Initialize bot configs and mark prior states offline
    await botManager.initAll();

    // 4. Start health check server for Render
    healthCheckServer = startHealthCheckServer();

    // 5. Connect all enabled bots
    await botManager.startAll();

    const summary = botManager.getSummary();
    logger.info(
      `Platform ready. Active bots: ${summary.onlineBots}/${summary.totalBots} (${summary.configuredBots} configured with tokens).`
    );
  } catch (error) {
    logger.error('Fatal initialization error:', error);
    process.exit(1);
  }
}

bootstrap();
