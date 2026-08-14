import {
  API_PREFIX,
  API_ROUTES,
  healthResponseSchema,
  type HealthResponse,
} from '@x/shared';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? API_PREFIX).replace(
  /\/$/,
  '',
);

export async function getHealth(signal: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${apiBaseUrl}${API_ROUTES.health}`, {
    headers: {
      accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}`);
  }

  return healthResponseSchema.parse(await response.json());
}
