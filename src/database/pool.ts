import { Pool, PoolConfig } from 'pg';
import { config } from '../config/env';
import { logger } from '../utils/logger';

function createPoolConfig(): PoolConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const requiresSsl =
    config.databaseUrl.includes('sslmode=require') ||
    config.databaseUrl.includes('render.com') ||
    isProduction;

  const poolConfig: PoolConfig = {
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  if (requiresSsl) {
    poolConfig.ssl = {
      rejectUnauthorized: false,
    };
  }

  return poolConfig;
}

export const pool = new Pool(createPoolConfig());

pool.on('error', (err: Error) => {
  logger.error('Unexpected PostgreSQL client error on idle client:', err);
});

/**
 * Verify connectivity to the database
 */
export async function testDatabaseConnection(): Promise<void> {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT NOW() AS current_time');
    logger.info(`Database connected successfully at ${res.rows[0].current_time}`);
  } finally {
    client.release();
  }
}
