import { API_PREFIX } from '@x/shared';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyServerOptions } from 'fastify';

import { env } from './config/env.js';
import { closeDatabase } from './database/client.js';
import { authRoutes } from './routes/auth.js';
import { healthRoutes } from './routes/health.js';

export function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify(options);

  app.register(cookie, {
    secret: env.COOKIE_SECRET,
    hook: 'onRequest',
  });
  app.register(rateLimit, { global: false });
  app.register(healthRoutes, { prefix: API_PREFIX });
  app.register(authRoutes, { prefix: API_PREFIX });
  app.addHook('onClose', closeDatabase);

  return app;
}
