import 'dotenv/config';

import { z } from 'zod';

const localDatabaseUrl = 'postgresql://postgres:postgres@127.0.0.1:5432/x';
const developmentCookieSecret =
  'development-only-cookie-secret-change-before-production';
const exampleCookieSecret =
  'replace-with-a-long-random-secret-at-least-32-characters';

const optionalEnvironmentString = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  DATABASE_URL: z.string().min(1).default(localDatabaseUrl),
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  DATABASE_IDLE_TIMEOUT_MS: z.coerce.number().int().min(1_000).default(30_000),
  DATABASE_CONNECTION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .default(5_000),
  APP_ORIGIN: z.url().default('http://localhost:3000'),
  COOKIE_SECRET: z.string().min(32).default(developmentCookieSecret),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  OAUTH_FLOW_TTL_MINUTES: z.coerce.number().int().min(1).max(30).default(10),
  GOOGLE_CLIENT_ID: optionalEnvironmentString,
  GOOGLE_CLIENT_SECRET: optionalEnvironmentString,
  GOOGLE_REDIRECT_URI: optionalEnvironmentString,
  FACEBOOK_CLIENT_ID: optionalEnvironmentString,
  FACEBOOK_CLIENT_SECRET: optionalEnvironmentString,
  FACEBOOK_REDIRECT_URI: optionalEnvironmentString,
});

export const env = environmentSchema
  .superRefine((value, context) => {
    if (value.NODE_ENV !== 'production') {
      return;
    }

    if (
      value.COOKIE_SECRET === developmentCookieSecret ||
      value.COOKIE_SECRET === exampleCookieSecret
    ) {
      context.addIssue({
        code: 'custom',
        message: 'COOKIE_SECRET must be set in production',
        path: ['COOKIE_SECRET'],
      });
    }

    if (value.DATABASE_URL === localDatabaseUrl) {
      context.addIssue({
        code: 'custom',
        message: 'DATABASE_URL must be set in production',
        path: ['DATABASE_URL'],
      });
    }

    if (new URL(value.APP_ORIGIN).hostname === 'localhost') {
      context.addIssue({
        code: 'custom',
        message: 'APP_ORIGIN must be set in production',
        path: ['APP_ORIGIN'],
      });
    }
  })
  .parse(process.env);
