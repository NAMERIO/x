import { defineConfig } from 'drizzle-kit';

import { env } from '../config/env.js';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './src/database/migrations',
  dbCredentials: {
    url: env.DATABASE_URL,
    ssl: env.DATABASE_SSL,
  },
  strict: true,
  verbose: true,
});
