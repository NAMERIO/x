import {
  API_ROUTES,
  CHAT_HISTORY_DEFAULT_LIMIT,
  CHAT_HISTORY_MAX_LIMIT,
  CHAT_SOCKET_EVENTS,
  chatHistoryResponseSchema,
  chatMessageSchema,
  editMessageRequestSchema,
  reactionRequestSchema,
  sendMessageRequestSchema,
  type AuthError,
} from '@x/shared';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { requireAuth } from '../authorization/guards.js';
import {
  ChatServiceError,
  addChatReaction,
  createChatMessage,
  deleteChatMessage,
  editChatMessage,
  getMessageHistory,
  removeChatReaction,
  type ChatActor,
} from '../chat/service.js';
import { env } from '../config/env.js';

const messageParamsSchema = z.object({ id: z.uuid() });
const historyQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(CHAT_HISTORY_MAX_LIMIT)
    .default(CHAT_HISTORY_DEFAULT_LIMIT),
});

function sendChatError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
) {
  const body: AuthError = { error: { code, message } };
  return reply.code(statusCode).send(body);
}

async function handleChatCall<T>(
  reply: FastifyReply,
  operation: () => Promise<T>,
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ChatServiceError) {
      sendChatError(reply, error.statusCode, error.code, error.message);
      return undefined;
    }
    throw error;
  }
}

function actorFromRequest(request: FastifyRequest): ChatActor {
  const context = request.authorization;
  if (!context) throw new Error('Authorization context is missing');
  return {
    id: context.user.id,
    isOwner: context.user.isOwner,
    permissions: context.permissions,
  };
}

export const chatRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', async (request, reply) => {
    if (request.method === 'GET') return;
    const origin = request.headers.origin;
    if (origin && origin !== new URL(env.APP_ORIGIN).origin) {
      return sendChatError(
        reply,
        403,
        'INVALID_ORIGIN',
        'Request origin is not allowed',
      );
    }
  });

  app.get(API_ROUTES.chat.messages, async (request, reply) => {
    const query = historyQuerySchema.safeParse(request.query);
    if (!query.success) {
      return sendChatError(
        reply,
        400,
        'INVALID_HISTORY_REQUEST',
        'Invalid cursor or history limit',
      );
    }
    const history = await handleChatCall(reply, () =>
      getMessageHistory(query.data.cursor ?? null, query.data.limit),
    );
    if (!history) return;
    return chatHistoryResponseSchema.parse(history);
  });

  app.post(API_ROUTES.chat.messages, async (request, reply) => {
    const input = sendMessageRequestSchema.safeParse(request.body);
    if (!input.success) {
      return sendChatError(
        reply,
        400,
        'INVALID_MESSAGE',
        input.error?.issues[0]?.message ?? 'Invalid message',
      );
    }
    const message = await handleChatCall(reply, () =>
      createChatMessage(actorFromRequest(request), input.data),
    );
    if (!message) return;
    app.chatIo.emit(CHAT_SOCKET_EVENTS.MESSAGE_CREATED, message);
    return reply.code(201).send(chatMessageSchema.parse(message));
  });

  app.patch<{ Params: { id: string } }>(
    API_ROUTES.chat.message(':id'),
    async (request, reply) => {
      const params = messageParamsSchema.safeParse(request.params);
      const input = editMessageRequestSchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return sendChatError(
          reply,
          400,
          'INVALID_MESSAGE_EDIT',
          'Invalid message edit',
        );
      }
      const message = await handleChatCall(reply, () =>
        editChatMessage(params.data.id, actorFromRequest(request), input.data),
      );
      if (!message) return;
      app.chatIo.emit(CHAT_SOCKET_EVENTS.MESSAGE_UPDATED, message);
      return chatMessageSchema.parse(message);
    },
  );

  app.delete<{ Params: { id: string } }>(
    API_ROUTES.chat.message(':id'),
    async (request, reply) => {
      const params = messageParamsSchema.safeParse(request.params);
      if (!params.success) {
        return sendChatError(
          reply,
          400,
          'INVALID_MESSAGE_ID',
          'Invalid message identifier',
        );
      }
      const deleted = await handleChatCall(reply, () =>
        deleteChatMessage(params.data.id, actorFromRequest(request)),
      );
      if (!deleted) return;
      app.chatIo.emit(CHAT_SOCKET_EVENTS.MESSAGE_DELETED, deleted);
      return reply.code(200).send(deleted);
    },
  );

  app.put<{ Params: { id: string } }>(
    API_ROUTES.chat.reactions(':id'),
    async (request, reply) => {
      const params = messageParamsSchema.safeParse(request.params);
      const input = reactionRequestSchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return sendChatError(
          reply,
          400,
          'INVALID_REACTION',
          'Invalid reaction',
        );
      }
      const result = await handleChatCall(reply, () =>
        addChatReaction(params.data.id, actorFromRequest(request), input.data),
      );
      if (!result) return;
      const event = {
        messageId: params.data.id,
        reactions: result.reactions,
      };
      app.chatIo.emit(CHAT_SOCKET_EVENTS.REACTIONS_UPDATED, event);
      return event;
    },
  );

  app.delete<{ Params: { id: string } }>(
    API_ROUTES.chat.reactions(':id'),
    async (request, reply) => {
      const params = messageParamsSchema.safeParse(request.params);
      const input = reactionRequestSchema.safeParse(request.body);
      if (!params.success || !input.success) {
        return sendChatError(
          reply,
          400,
          'INVALID_REACTION',
          'Invalid reaction',
        );
      }
      const result = await handleChatCall(reply, () =>
        removeChatReaction(
          params.data.id,
          actorFromRequest(request),
          input.data,
        ),
      );
      if (!result) return;
      const event = {
        messageId: params.data.id,
        reactions: result.reactions,
      };
      app.chatIo.emit(CHAT_SOCKET_EVENTS.REACTIONS_UPDATED, event);
      return event;
    },
  );
};
