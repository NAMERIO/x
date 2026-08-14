import { API_PREFIX } from '@x/shared';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyServerOptions } from 'fastify';

import { env } from './config/env.js';
import { attachChatSocket } from './chat/socket.js';
import { closeDatabase } from './database/client.js';
import { authRoutes } from './routes/auth.js';
import { authorizationRoutes } from './routes/authorization.js';
import { chatRoutes } from './routes/chat.js';
import { healthRoutes } from './routes/health.js';
import { memberRoutes } from './routes/members.js';

export function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify(options);

  app.register(cookie, {
    secret: env.COOKIE_SECRET,
    hook: 'onRequest',
  });
  app.register(rateLimit, { global: false });
  app.decorateRequest('authorization', null);
  attachChatSocket(app);
  app.register(healthRoutes, { prefix: API_PREFIX });
  app.register(authRoutes, { prefix: API_PREFIX });
  app.register(authorizationRoutes, { prefix: API_PREFIX });
  app.register(chatRoutes, { prefix: API_PREFIX });
  app.register(memberRoutes, { prefix: API_PREFIX });
  app.addHook('onClose', closeDatabase);

  return app;
}
