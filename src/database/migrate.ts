import { pool, testDatabaseConnection } from './pool';
import { initializeDatabaseSchema } from './schema';
import { logger } from '../utils/logger';

async function runMigration() {
  try {
    logger.info('Starting manual database migration...');
    await testDatabaseConnection();
    await initializeDatabaseSchema();
    logger.info('Migration finished successfully.');
    await pool.end();
    process.exit(0);
  } catch (err) {
    logger.error('Migration failed:', err);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
