import {
  API_ROUTES,
  healthResponseSchema,
  type HealthResponse,
} from '@x/shared';
import type { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: HealthResponse }>(API_ROUTES.health, async () => {
    return healthResponseSchema.parse({
      status: 'ok',
      service: 'x-server',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
};
