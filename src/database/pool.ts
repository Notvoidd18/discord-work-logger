import { Pool, PoolConfig } from 'pg';
import { config } from '../config/env';
import { logger } from '../utils/logger';

function sanitizeDatabaseUrl(rawUrl: string): { sanitizedUrl: string; hasSslFlag: boolean } {
  try {
    const parsed = new URL(rawUrl);
    const sslmode = parsed.searchParams.get('sslmode');
    const ssl = parsed.searchParams.get('ssl');
    const hasSslFlag = Boolean(
      (sslmode && sslmode !== 'disable') ||
      ssl === 'true' ||
      rawUrl.includes('sslmode=require')
    );

    // Remove sslmode and ssl query params so pg-connection-string
    // does not overwrite our explicit `rejectUnauthorized: false` configuration
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('ssl');

    return {
      sanitizedUrl: parsed.toString(),
      hasSslFlag,
    };
  } catch {
    const hasSslFlag = rawUrl.includes('sslmode=require') || rawUrl.includes('ssl=true');
    const sanitizedUrl = rawUrl
      .replace(/([?&])ssl(mode)?=[^&]+(&|$)/g, '$1')
      .replace(/[?&]$/, '');
    return { sanitizedUrl, hasSslFlag };
  }
}

function createPoolConfig(): PoolConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const { sanitizedUrl, hasSslFlag } = sanitizeDatabaseUrl(config.databaseUrl);

  const isCloudHost =
    config.databaseUrl.includes('render.com') ||
    config.databaseUrl.includes('neon.tech') ||
    config.databaseUrl.includes('supabase.co');

  const requiresSsl = hasSslFlag || isCloudHost || isProduction;

  const poolConfig: PoolConfig = {
    connectionString: sanitizedUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };

  if (requiresSsl) {
    // Explicitly accept self-signed certificates used by Render and cloud providers
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
