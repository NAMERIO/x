import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { env } from '../config/env.js';
import * as schema from './schema/index.js';

export const databasePool = new Pool({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: env.DATABASE_CONNECTION_TIMEOUT_MS,
  idleTimeoutMillis: env.DATABASE_IDLE_TIMEOUT_MS,
  max: env.DATABASE_POOL_MAX,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: true } : undefined,
});

databasePool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error', error);
});

export const database = drizzle({
  client: databasePool,
  schema,
});

export async function closeDatabase(): Promise<void> {
  await databasePool.end();
}
