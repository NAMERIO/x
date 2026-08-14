import { createHash } from 'node:crypto';

import { OAUTH_PROVIDERS } from '@x/shared';
import { z } from 'zod';

import {
  OAuthProviderError,
  requestAccessToken,
  requestJson,
} from './request.js';
import type { OAuthProviderAdapter } from './types.js';

const googleProfileSchema = z.object({
  sub: z.string().min(1),
  email: z.email().max(320).optional(),
  email_verified: z.boolean().optional(),
  name: z.string().min(1),
  picture: z.string().url().optional(),
});

export function createGoogleProvider(options: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): OAuthProviderAdapter {
  return {
    id: OAUTH_PROVIDERS.GOOGLE,
    usesPkce: true,
    createAuthorizationUrl(state, codeVerifier) {
      if (!codeVerifier) {
        throw new OAuthProviderError('Google requires a PKCE verifier');
      }

      const codeChallenge = createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('client_id', options.clientId);
      url.searchParams.set('redirect_uri', options.redirectUri);
      url.searchParams.set('scope', 'openid profile email');
      url.searchParams.set('state', state);
      url.searchParams.set('code_challenge', codeChallenge);
      url.searchParams.set('code_challenge_method', 'S256');
      return url;
    },
    async exchangeCode(code, codeVerifier) {
      if (!codeVerifier) {
        throw new OAuthProviderError('Missing Google PKCE verifier');
      }

      const parameters = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
        client_id: options.clientId,
        client_secret: options.clientSecret,
        redirect_uri: options.redirectUri,
      });
      const accessToken = await requestAccessToken(
        'https://oauth2.googleapis.com/token',
        parameters,
      );
      const profile = googleProfileSchema.safeParse(
        await requestJson(
          'https://openidconnect.googleapis.com/v1/userinfo',
          accessToken,
        ),
      );

      if (!profile.success) {
        throw new OAuthProviderError('Invalid Google profile response');
      }

      return {
        providerAccountId: profile.data.sub,
        email: profile.data.email?.toLowerCase() ?? null,
        emailVerifiedAt: profile.data.email_verified ? new Date() : null,
        displayName: profile.data.name.slice(0, 64),
        avatarUrl: profile.data.picture ?? null,
      };
    },
  };
}
