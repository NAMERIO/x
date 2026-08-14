import {
  API_ROUTES,
  OAUTH_PROVIDERS,
  authProvidersResponseSchema,
  authResponseSchema,
  loginRequestSchema,
  registerRequestSchema,
  type AuthError,
} from '@x/shared';
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { z } from 'zod';

import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from '../auth/cookies.js';
import { consumeOAuthFlow, createOAuthFlow } from '../auth/oauth/flows.js';
import {
  getOAuthProvider,
  getOAuthProviderAvailability,
} from '../auth/oauth/providers.js';
import {
  AuthenticationError,
  loginWithOAuth,
  loginWithPassword,
  registerWithPassword,
} from '../auth/service.js';
import { deleteSession, getSessionUser } from '../auth/sessions.js';
import { env } from '../config/env.js';

const oauthProviderSchema = z.enum([
  OAUTH_PROVIDERS.GOOGLE,
  OAUTH_PROVIDERS.FACEBOOK,
]);

const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

function sendAuthError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
) {
  const body: AuthError = { error: { code, message } };
  return reply.code(statusCode).send(body);
}

function oauthFailureRedirect(code: string): string {
  const url = new URL(env.APP_ORIGIN);
  url.searchParams.set('auth_error', code);
  return url.toString();
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (request, reply) => {
    if (request.method === 'GET') {
      return;
    }

    const origin = request.headers.origin;
    if (origin && origin !== new URL(env.APP_ORIGIN).origin) {
      return sendAuthError(
        reply,
        403,
        'INVALID_ORIGIN',
        'Request origin is not allowed',
      );
    }
  });

  app.post(
    API_ROUTES.auth.register,
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const input = registerRequestSchema.safeParse(request.body);
      if (!input.success) {
        return sendAuthError(
          reply,
          400,
          'INVALID_REGISTRATION',
          input.error.issues[0]?.message ?? 'Invalid registration details',
        );
      }

      try {
        const result = await registerWithPassword(input.data);
        setSessionCookie(reply, result.session);
        return reply
          .code(201)
          .send(authResponseSchema.parse({ user: result.user }));
      } catch (error) {
        if (error instanceof AuthenticationError) {
          return sendAuthError(
            reply,
            error.statusCode,
            error.code,
            error.message,
          );
        }
        throw error;
      }
    },
  );

  app.post(
    API_ROUTES.auth.login,
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const input = loginRequestSchema.safeParse(request.body);
      if (!input.success) {
        return sendAuthError(
          reply,
          400,
          'INVALID_LOGIN',
          'Enter a valid email and password',
        );
      }

      try {
        const result = await loginWithPassword(input.data);
        setSessionCookie(reply, result.session);
        return authResponseSchema.parse({ user: result.user });
      } catch (error) {
        if (error instanceof AuthenticationError) {
          return sendAuthError(
            reply,
            error.statusCode,
            error.code,
            error.message,
          );
        }
        throw error;
      }
    },
  );

  app.post(API_ROUTES.auth.logout, async (request, reply) => {
    const token = readSessionToken(request);
    if (token) {
      await deleteSession(token);
    }
    clearSessionCookie(reply);
    return reply.code(204).send();
  });

  app.get(API_ROUTES.auth.me, async (request, reply) => {
    const token = readSessionToken(request);
    if (!token) {
      clearSessionCookie(reply);
      return sendAuthError(reply, 401, 'UNAUTHENTICATED', 'Not signed in');
    }

    const user = await getSessionUser(token);
    if (!user) {
      clearSessionCookie(reply);
      return sendAuthError(reply, 401, 'UNAUTHENTICATED', 'Session expired');
    }

    return authResponseSchema.parse({ user });
  });

  app.get(API_ROUTES.auth.providers, async () => {
    return authProvidersResponseSchema.parse({
      providers: getOAuthProviderAvailability(),
    });
  });

  app.get<{ Params: { provider: string } }>(
    '/auth/oauth/:provider',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const providerId = oauthProviderSchema.safeParse(request.params.provider);
      if (!providerId.success) {
        return sendAuthError(
          reply,
          404,
          'UNKNOWN_OAUTH_PROVIDER',
          'OAuth provider is not supported',
        );
      }

      const provider = getOAuthProvider(providerId.data);
      if (!provider) {
        return sendAuthError(
          reply,
          503,
          'OAUTH_NOT_CONFIGURED',
          'OAuth provider is not configured',
        );
      }

      const authorizationUrl = await createOAuthFlow(provider);
      return reply.redirect(authorizationUrl.toString());
    },
  );

  app.get<{
    Params: { provider: string };
    Querystring: { code?: string; state?: string };
  }>('/auth/oauth/:provider/callback', async (request, reply) => {
    const providerId = oauthProviderSchema.safeParse(request.params.provider);
    const query = oauthCallbackQuerySchema.safeParse(request.query);

    if (!providerId.success || !query.success) {
      return reply.redirect(oauthFailureRedirect('invalid_oauth_callback'));
    }

    const provider = getOAuthProvider(providerId.data);
    if (!provider) {
      return reply.redirect(oauthFailureRedirect('oauth_not_configured'));
    }

    const flow = await consumeOAuthFlow(provider.id, query.data.state);
    if (!flow) {
      return reply.redirect(oauthFailureRedirect('invalid_oauth_state'));
    }

    try {
      const identity = await provider.exchangeCode(
        query.data.code,
        flow.codeVerifier,
      );
      const result = await loginWithOAuth(provider.id, identity);
      setSessionCookie(reply, result.session);
      return reply.redirect(env.APP_ORIGIN);
    } catch (error) {
      request.log.warn(
        { err: error, provider: provider.id },
        'OAuth login failed',
      );
      return reply.redirect(oauthFailureRedirect('oauth_login_failed'));
    }
  });
};
