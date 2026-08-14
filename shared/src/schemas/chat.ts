import { z } from 'zod';

import { CHAT_MESSAGE_MAX_LENGTH } from '../constants/chat.js';
import { roleColorSchema } from './authorization.js';

export const chatAuthorSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  roles: z.array(
    z.object({
      name: z.string(),
      color: roleColorSchema,
    }),
  ),
});

export const chatReplyPreviewSchema = z.object({
  id: z.uuid(),
  author: chatAuthorSchema,
  content: z.string(),
  deletedAt: z.iso.datetime().nullable(),
});

export const chatReactionSchema = z.object({
  emoji: z.string(),
  count: z.number().int().positive(),
  userIds: z.array(z.uuid()),
});

export const chatMessageSchema = z.object({
  id: z.uuid(),
  author: chatAuthorSchema,
  content: z.string(),
  replyTo: chatReplyPreviewSchema.nullable(),
  reactions: z.array(chatReactionSchema),
  mentionedUserIds: z.array(z.uuid()),
  mentionsEveryone: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  editedAt: z.iso.datetime().nullable(),
  deletedAt: z.iso.datetime().nullable(),
});

export const chatHistoryResponseSchema = z.object({
  messages: z.array(chatMessageSchema),
  nextCursor: z.uuid().nullable(),
});

export const sendMessageRequestSchema = z.object({
  content: z.string().trim().min(1).max(CHAT_MESSAGE_MAX_LENGTH),
  replyToId: z.uuid().nullable().default(null),
});

export const editMessageRequestSchema = z.object({
  content: z.string().trim().min(1).max(CHAT_MESSAGE_MAX_LENGTH),
});

export const reactionRequestSchema = z.object({
  emoji: z.string().trim().min(1).max(32),
});

export const chatTypingPayloadSchema = z.object({
  isTyping: z.boolean(),
});
