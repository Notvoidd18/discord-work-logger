import { pool } from './pool';
import { logger } from '../utils/logger';

/**
 * Initializes the database schema.
 * Creates the work_logs table and indexes if they do not already exist.
 */
export async function initializeDatabaseSchema(): Promise<void> {
  const query = `
    CREATE TABLE IF NOT EXISTS work_logs (
      id BIGSERIAL PRIMARY KEY,
      guild_id VARCHAR(32) NOT NULL,
      channel_id VARCHAR(32) NOT NULL,
      user_id VARCHAR(32) NOT NULL,
      username VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_work_logs_guild_id ON work_logs (guild_id);
    CREATE INDEX IF NOT EXISTS idx_work_logs_user_id ON work_logs (user_id);
    CREATE INDEX IF NOT EXISTS idx_work_logs_created_at ON work_logs (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_work_logs_guild_user ON work_logs (guild_id, user_id);

    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id VARCHAR(32) PRIMARY KEY,
      log_channel_id VARCHAR(32),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
    );
  `;

  const client = await pool.connect();
  try {
    await client.query(query);
    logger.info('Database schema verified/initialized successfully.');
  } catch (error) {
    logger.error('Failed to initialize database schema:', error);
    throw error;
  } finally {
    client.release();
  }
}
