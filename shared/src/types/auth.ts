import type { z } from 'zod';

import type {
  authErrorSchema,
  authProvidersResponseSchema,
  authResponseSchema,
  authUserSchema,
  loginRequestSchema,
  registerRequestSchema,
} from '../schemas/auth.js';

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type AuthProvidersResponse = z.infer<typeof authProvidersResponseSchema>;
export type AuthError = z.infer<typeof authErrorSchema>;
