import { OAUTH_PROVIDERS } from '@x/shared';
import { z } from 'zod';

import { OAuthProviderError, requestAccessToken } from './request.js';
import type { OAuthProviderAdapter } from './types.js';

const facebookProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.email().max(320).optional(),
  picture: z
    .object({
      data: z.object({
        url: z.string().url().optional(),
      }),
    })
    .optional(),
});

export function createFacebookProvider(options: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): OAuthProviderAdapter {
  return {
    id: OAUTH_PROVIDERS.FACEBOOK,
    usesPkce: false,
    createAuthorizationUrl(state) {
      const url = new URL('https://www.facebook.com/dialog/oauth');
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('client_id', options.clientId);
      url.searchParams.set('redirect_uri', options.redirectUri);
      url.searchParams.set('scope', 'email public_profile');
      url.searchParams.set('state', state);
      return url;
    },
    async exchangeCode(code) {
      const parameters = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: options.clientId,
        client_secret: options.clientSecret,
        redirect_uri: options.redirectUri,
      });
      const accessToken = await requestAccessToken(
        'https://graph.facebook.com/oauth/access_token',
        parameters,
      );
      const profileUrl = new URL('https://graph.facebook.com/me');
      profileUrl.searchParams.set('fields', 'id,name,email,picture');
      profileUrl.searchParams.set('access_token', accessToken);
      const response = await fetch(profileUrl, {
        headers: { accept: 'application/json' },
      });
      const profile = facebookProfileSchema.safeParse(await response.json());

      if (!response.ok || !profile.success) {
        throw new OAuthProviderError('Invalid Facebook profile response');
      }

      return {
        providerAccountId: profile.data.id,
        email: profile.data.email?.toLowerCase() ?? null,
        emailVerifiedAt: null,
        displayName: profile.data.name.slice(0, 64),
        avatarUrl: profile.data.picture?.data.url ?? null,
      };
    },
  };
}
