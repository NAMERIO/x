import 'dotenv/config';

import { buildApp } from './app.js';
import { env } from './config/env.js';

const app = buildApp({
  logger: {
    level: env.LOG_LEVEL,
  },
});

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
