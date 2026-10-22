import http from 'http';
import { Client, GatewayIntentBits } from 'discord.js';
import { config } from './config/env';
import { logger } from './utils/logger';
import { testDatabaseConnection, pool } from './database/pool';
import { initializeDatabaseSchema } from './database/schema';
import { handleReady } from './events/ready';
import { handleMessageCreate } from './events/messageCreate';
import { handleInteractionCreate } from './events/interactionCreate';
import { slashCommands } from './commands/slashDefinitions';

// 1. Initialize Discord Client with necessary gateway intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 2. Register Discord Event Listeners
client.once('ready', async () => {
  await handleReady(client);
});

client.on('messageCreate', async (message) => {
  await handleMessageCreate(client, message);
});

client.on('interactionCreate', async (interaction) => {
  await handleInteractionCreate(interaction);
});

// 3. Lightweight HTTP server for Render Web Service health checks (optional)
function startHealthCheckServer(): http.Server {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        botStatus: client.isReady() ? 'ready' : 'connecting',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      })
    );
  });

  server.listen(config.port, () => {
    logger.info(`Health check HTTP server listening on port ${config.port}`);
  });

  return server;
}

// 4. Graceful Shutdown Handler
let healthCheckServer: http.Server | null = null;

async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (healthCheckServer) {
    healthCheckServer.close(() => {
      logger.info('HTTP health check server stopped.');
    });
  }

  try {
    client.destroy();
    logger.info('Discord client destroyed.');
  } catch (err) {
    logger.error('Error destroying Discord client:', err);
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

// 5. Bot Startup Sequence
async function start() {
  try {
    logger.info('Starting Discord Work Logger Bot...');

    // Test database connection
    logger.info('Connecting to PostgreSQL database...');
    await testDatabaseConnection();

    // Verify and apply schema migrations
    logger.info('Verifying database schema...');
    await initializeDatabaseSchema();

    // Start health check server for Render compatibility
    healthCheckServer = startHealthCheckServer();

    // Log in to Discord
    logger.info('Logging into Discord Gateway...');
    await client.login(config.discordToken);
  } catch (error) {
    logger.error('Fatal initialization error:', error);
    process.exit(1);
  }
}

start();
