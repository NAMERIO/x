import { API_ROUTES, membersResponseSchema } from '@x/shared';
import type { FastifyPluginAsync } from 'fastify';

import { requireAuth } from '../authorization/guards.js';
import { listMembers } from '../authorization/service.js';

export const memberRoutes: FastifyPluginAsync = async (app) => {
  app.get(API_ROUTES.members.list, { preHandler: requireAuth }, async () =>
    membersResponseSchema.parse({ members: await listMembers() }),
  );
};
