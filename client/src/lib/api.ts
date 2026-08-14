import {
  API_PREFIX,
  API_ROUTES,
  authErrorSchema,
  authProvidersResponseSchema,
  authResponseSchema,
  type AuthProvidersResponse,
  type AuthUser,
  type LoginRequest,
  type RegisterRequest,
} from '@x/shared';

export const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? API_PREFIX
).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      accept: 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const error = authErrorSchema.safeParse(await response.json());
    throw new ApiError(
      error.success ? error.data.error.code : 'REQUEST_FAILED',
      error.success ? error.data.error.message : 'Request failed',
      response.status,
    );
  }

  return response;
}

export async function register(input: RegisterRequest): Promise<AuthUser> {
  const response = await request(API_ROUTES.auth.register, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return authResponseSchema.parse(await response.json()).user;
}

export async function login(input: LoginRequest): Promise<AuthUser> {
  const response = await request(API_ROUTES.auth.login, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return authResponseSchema.parse(await response.json()).user;
}

export async function logout(): Promise<void> {
  await request(API_ROUTES.auth.logout, { method: 'POST' });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await request(API_ROUTES.auth.me);
    return authResponseSchema.parse(await response.json()).user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function getAuthProviders(): Promise<AuthProvidersResponse> {
  const response = await request(API_ROUTES.auth.providers);
  return authProvidersResponseSchema.parse(await response.json());
}

export function getOAuthUrl(provider: 'google' | 'facebook'): string {
  const route =
    provider === 'google'
      ? API_ROUTES.auth.oauthGoogle
      : API_ROUTES.auth.oauthFacebook;
  return `${apiBaseUrl}${route}`;
}
