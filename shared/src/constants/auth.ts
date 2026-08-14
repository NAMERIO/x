export const AUTH_PROVIDERS = {
  PASSWORD: 'password',
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
} as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[keyof typeof AUTH_PROVIDERS];

export const OAUTH_PROVIDERS = {
  GOOGLE: AUTH_PROVIDERS.GOOGLE,
  FACEBOOK: AUTH_PROVIDERS.FACEBOOK,
} as const;

export type OAuthProvider =
  (typeof OAUTH_PROVIDERS)[keyof typeof OAUTH_PROVIDERS];
