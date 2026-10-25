import http from 'http';
import { config } from './config/env';
import { logger } from './utils/logger';
import { testDatabaseConnection, pool } from './database/pool';
import { initializeDatabaseSchema } from './database/schema';
import { botManager } from './platform/botManager';
import { createManagementServer } from './api/managementServer';

let managementServer: http.Server | null = null;

/**
 * Starts the authenticated HTTPS/HTTP management server for Render 2 (website) integration.
 * Provides live telemetry, dynamic bot registration, lifecycle controls, and health probes.
 */
function startServer(): http.Server {
  const server = createManagementServer();

  server.listen(config.port, () => {
    logger.info(`=============================================`);
    logger.info(`  Render 1 Bot Management API Active         `);
    logger.info(`  Port: ${config.port}                      `);
    logger.info(`  Authentication: Enabled (BOT_HOST_API_KEY) `);
    logger.info(`=============================================`);
  });

  return server;
}

/**
 * Graceful shutdown sequence
 */
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Initiating graceful multi-bot shutdown...`);

  if (managementServer) {
    managementServer.close(() => {
      logger.info('Management API server stopped.');
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
    try {
      await testDatabaseConnection();
      // 2. Schema verification & automatic migrations
      logger.info('Verifying database schema and tables...');
      await initializeDatabaseSchema();
    } catch (dbErr: any) {
      logger.warn(`PostgreSQL connection notice: ${dbErr.message || dbErr}. Running with resilient in-memory fallback.`);
    }

    // 3. Initialize bot configs and mark prior states offline
    await botManager.initAll();

    // 4. Start authenticated Management API server for Render
    managementServer = startServer();

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
