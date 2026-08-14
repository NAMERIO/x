import type { OAuthProvider } from '@x/shared';

import { env } from '../../config/env.js';
import { createFacebookProvider } from './facebook.js';
import { createGoogleProvider } from './google.js';
import type { OAuthProviderAdapter } from './types.js';

const providers = new Map<OAuthProvider, OAuthProviderAdapter>();

if (
  env.GOOGLE_CLIENT_ID &&
  env.GOOGLE_CLIENT_SECRET &&
  env.GOOGLE_REDIRECT_URI
) {
  const provider = createGoogleProvider({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
  });
  providers.set(provider.id, provider);
}

if (
  env.FACEBOOK_CLIENT_ID &&
  env.FACEBOOK_CLIENT_SECRET &&
  env.FACEBOOK_REDIRECT_URI
) {
  const provider = createFacebookProvider({
    clientId: env.FACEBOOK_CLIENT_ID,
    clientSecret: env.FACEBOOK_CLIENT_SECRET,
    redirectUri: env.FACEBOOK_REDIRECT_URI,
  });
  providers.set(provider.id, provider);
}

export function getOAuthProvider(
  provider: OAuthProvider,
): OAuthProviderAdapter | undefined {
  return providers.get(provider);
}

export function getOAuthProviderAvailability() {
  return {
    google: providers.has('google'),
    facebook: providers.has('facebook'),
  };
}
