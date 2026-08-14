import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be at most 128 characters');

export const registerRequestSchema = z.object({
  displayName: z.string().trim().min(2).max(64),
  email: z.email().trim().toLowerCase(),
  password: passwordSchema,
});

export const loginRequestSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(128),
});

export const authUserSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  email: z.string().nullable(),
  isOwner: z.boolean(),
  roles: z.array(z.string()),
});

export const authResponseSchema = z.object({
  user: authUserSchema,
});

export const authProvidersResponseSchema = z.object({
  providers: z.object({
    google: z.boolean(),
    facebook: z.boolean(),
  }),
});

export const authErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    field: z.string().optional(),
  }),
});
