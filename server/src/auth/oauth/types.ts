import type { OAuthProvider } from '@x/shared';

export interface OAuthIdentity {
  providerAccountId: string;
  email: string | null;
  emailVerifiedAt: Date | null;
  displayName: string;
  avatarUrl: string | null;
}

export interface OAuthProviderAdapter {
  id: OAuthProvider;
  usesPkce: boolean;
  createAuthorizationUrl(state: string, codeVerifier: string | null): URL;
  exchangeCode(
    code: string,
    codeVerifier: string | null,
  ): Promise<OAuthIdentity>;
}
