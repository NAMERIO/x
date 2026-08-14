import {
  PERMISSIONS,
  type ChatHistoryResponse,
  type ChatMessage,
  type ChatReaction,
  type EditMessageRequest,
  type Permission,
  type ReactionRequest,
  type SendMessageRequest,
} from '@x/shared';
import { and, desc, eq, inArray, lt, or } from 'drizzle-orm';

import { database } from '../database/client.js';
import {
  messageMentions,
  messageReactions,
  messageReplies,
  messages,
  roles,
  userRoles,
  users,
} from '../database/schema/index.js';

export interface ChatActor {
  id: string;
  isOwner: boolean;
  permissions: readonly Permission[];
}

export class ChatServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ChatServiceError';
  }
}

function actorHasPermission(
  actor: Pick<ChatActor, 'isOwner' | 'permissions'>,
  permission: Permission,
): boolean {
  return actor.isOwner || actor.permissions.includes(permission);
}

export function assertCanUseEveryoneMention(
  actor: Pick<ChatActor, 'isOwner' | 'permissions'>,
  content: string,
): void {
  if (
    /(^|[^a-z0-9_])@everyone\b/i.test(content) &&
    !actorHasPermission(actor, PERMISSIONS.MENTION_EVERYONE)
  ) {
    throw new ChatServiceError(
      403,
      'MENTION_EVERYONE_FORBIDDEN',
      'The MENTION_EVERYONE permission is required',
    );
  }
}

function requireSendMessages(actor: ChatActor) {
  if (!actorHasPermission(actor, PERMISSIONS.SEND_MESSAGES)) {
    throw new ChatServiceError(
      403,
      'SEND_MESSAGES_FORBIDDEN',
      'The SEND_MESSAGES permission is required',
    );
  }
}

function extractMentionUsernames(content: string): string[] {
  const usernames = new Set<string>();
  for (const match of content.matchAll(
    /(?:^|[^a-z0-9_])@([a-z0-9_]{2,32})\b/gi,
  )) {
    const username = match[1]?.toLowerCase();
    if (username && username !== 'everyone') usernames.add(username);
  }
  return [...usernames];
}

async function resolveMentionedUserIds(content: string): Promise<string[]> {
  const usernames = extractMentionUsernames(content);
  if (usernames.length === 0) return [];
  const records = await database
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.username, usernames));
  return records.map((record) => record.id);
}

async function hydrateMessages(messageIds: string[]): Promise<ChatMessage[]> {
  if (messageIds.length === 0) return [];

  const baseRecords = await database
    .select({
      id: messages.id,
      authorId: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      content: messages.content,
      mentionsEveryone: messages.mentionsEveryone,
      createdAt: messages.createdAt,
      updatedAt: messages.updatedAt,
      editedAt: messages.editedAt,
      deletedAt: messages.deletedAt,
    })
    .from(messages)
    .innerJoin(users, eq(messages.authorId, users.id))
    .where(inArray(messages.id, messageIds));

  const authorIds = [...new Set(baseRecords.map((record) => record.authorId))];
  const roleRecords =
    authorIds.length === 0
      ? []
      : await database
          .select({
            userId: userRoles.userId,
            name: roles.name,
            color: roles.color,
          })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(inArray(userRoles.userId, authorIds));

  const rolesByUser = new Map<
    string,
    Array<{ name: string; color: string | null }>
  >();
  for (const role of roleRecords) {
    const assigned = rolesByUser.get(role.userId) ?? [];
    assigned.push({ name: role.name, color: role.color });
    rolesByUser.set(role.userId, assigned);
  }

  const [replyLinks, reactionRecords, mentionRecords] = await Promise.all([
    database
      .select({
        messageId: messageReplies.messageId,
        parentMessageId: messageReplies.parentMessageId,
      })
      .from(messageReplies)
      .where(inArray(messageReplies.messageId, messageIds)),
    database
      .select({
        messageId: messageReactions.messageId,
        userId: messageReactions.userId,
        emoji: messageReactions.emoji,
      })
      .from(messageReactions)
      .where(inArray(messageReactions.messageId, messageIds)),
    database
      .select({
        messageId: messageMentions.messageId,
        userId: messageMentions.userId,
      })
      .from(messageMentions)
      .where(inArray(messageMentions.messageId, messageIds)),
  ]);

  const parentIds = [
    ...new Set(replyLinks.map((link) => link.parentMessageId)),
  ];
  const parentRecords =
    parentIds.length === 0
      ? []
      : await database
          .select({
            id: messages.id,
            authorId: users.id,
            username: users.username,
            displayName: users.displayName,
            avatarUrl: users.avatarUrl,
            content: messages.content,
            deletedAt: messages.deletedAt,
          })
          .from(messages)
          .innerJoin(users, eq(messages.authorId, users.id))
          .where(inArray(messages.id, parentIds));

  const missingParentAuthorIds = parentRecords
    .map((record) => record.authorId)
    .filter((id) => !rolesByUser.has(id));
  if (missingParentAuthorIds.length > 0) {
    const parentRoles = await database
      .select({
        userId: userRoles.userId,
        name: roles.name,
        color: roles.color,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(inArray(userRoles.userId, [...new Set(missingParentAuthorIds)]));
    for (const role of parentRoles) {
      const assigned = rolesByUser.get(role.userId) ?? [];
      assigned.push({ name: role.name, color: role.color });
      rolesByUser.set(role.userId, assigned);
    }
  }

  const parentsById = new Map(
    parentRecords.map((record) => [record.id, record]),
  );
  const replyParentByMessage = new Map(
    replyLinks.map((link) => [link.messageId, link.parentMessageId]),
  );
  const mentionsByMessage = new Map<string, string[]>();
  for (const mention of mentionRecords) {
    const mentioned = mentionsByMessage.get(mention.messageId) ?? [];
    mentioned.push(mention.userId);
    mentionsByMessage.set(mention.messageId, mentioned);
  }

  const reactionUsers = new Map<string, Map<string, string[]>>();
  for (const reaction of reactionRecords) {
    const byEmoji = reactionUsers.get(reaction.messageId) ?? new Map();
    const userIds = byEmoji.get(reaction.emoji) ?? [];
    userIds.push(reaction.userId);
    byEmoji.set(reaction.emoji, userIds);
    reactionUsers.set(reaction.messageId, byEmoji);
  }

  const hydratedById = new Map<string, ChatMessage>();
  for (const record of baseRecords) {
    const parentId = replyParentByMessage.get(record.id);
    const parent = parentId ? parentsById.get(parentId) : undefined;
    const reactions: ChatReaction[] = [
      ...(reactionUsers.get(record.id)?.entries() ?? []),
    ].map(([emoji, userIds]) => ({ emoji, count: userIds.length, userIds }));
    hydratedById.set(record.id, {
      id: record.id,
      author: {
        id: record.authorId,
        username: record.username,
        displayName: record.displayName,
        avatarUrl: record.avatarUrl,
        roles: rolesByUser.get(record.authorId) ?? [],
      },
      content: record.deletedAt ? 'Message deleted' : record.content,
      replyTo: parent
        ? {
            id: parent.id,
            author: {
              id: parent.authorId,
              username: parent.username,
              displayName: parent.displayName,
              avatarUrl: parent.avatarUrl,
              roles: rolesByUser.get(parent.authorId) ?? [],
            },
            content: parent.deletedAt ? 'Message deleted' : parent.content,
            deletedAt: parent.deletedAt?.toISOString() ?? null,
          }
        : null,
      reactions,
      mentionedUserIds: mentionsByMessage.get(record.id) ?? [],
      mentionsEveryone: record.mentionsEveryone,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      editedAt: record.editedAt?.toISOString() ?? null,
      deletedAt: record.deletedAt?.toISOString() ?? null,
    });
  }

  return messageIds.flatMap((id) => {
    const message = hydratedById.get(id);
    return message ? [message] : [];
  });
}

export async function getMessageById(messageId: string): Promise<ChatMessage> {
  const [message] = await hydrateMessages([messageId]);
  if (!message) {
    throw new ChatServiceError(404, 'MESSAGE_NOT_FOUND', 'Message not found');
  }
  return message;
}

export async function getMessageHistory(
  cursor: string | null,
  limit: number,
): Promise<ChatHistoryResponse> {
  let cursorRecord: { id: string; createdAt: Date } | null = null;
  if (cursor) {
    const [record] = await database
      .select({ id: messages.id, createdAt: messages.createdAt })
      .from(messages)
      .where(eq(messages.id, cursor))
      .limit(1);
    if (!record) {
      throw new ChatServiceError(
        400,
        'INVALID_CURSOR',
        'History cursor is invalid',
      );
    }
    cursorRecord = record;
  }

  const records = await database
    .select({ id: messages.id })
    .from(messages)
    .where(
      cursorRecord
        ? or(
            lt(messages.createdAt, cursorRecord.createdAt),
            and(
              eq(messages.createdAt, cursorRecord.createdAt),
              lt(messages.id, cursorRecord.id),
            ),
          )
        : undefined,
    )
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(limit + 1);

  const hasMore = records.length > limit;
  const page = records.slice(0, limit);
  const hydrated = await hydrateMessages(page.map((record) => record.id));
  return {
    messages: hydrated.reverse(),
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  };
}

export async function createChatMessage(
  actor: ChatActor,
  input: SendMessageRequest,
): Promise<ChatMessage> {
  requireSendMessages(actor);
  assertCanUseEveryoneMention(actor, input.content);
  const mentionedUserIds = await resolveMentionedUserIds(input.content);

  const messageId = await database.transaction(async (transaction) => {
    if (input.replyToId) {
      const [parent] = await transaction
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.id, input.replyToId))
        .limit(1);
      if (!parent) {
        throw new ChatServiceError(
          400,
          'INVALID_REPLY_TARGET',
          'Reply target does not exist',
        );
      }
    }

    const [created] = await transaction
      .insert(messages)
      .values({
        authorId: actor.id,
        content: input.content,
        mentionsEveryone: /(^|[^a-z0-9_])@everyone\b/i.test(input.content),
      })
      .returning({ id: messages.id });
    if (!created) throw new Error('Message could not be created');

    if (input.replyToId) {
      await transaction.insert(messageReplies).values({
        messageId: created.id,
        parentMessageId: input.replyToId,
      });
    }
    if (mentionedUserIds.length > 0) {
      await transaction.insert(messageMentions).values(
        mentionedUserIds.map((userId) => ({
          messageId: created.id,
          userId,
        })),
      );
    }
    return created.id;
  });

  return getMessageById(messageId);
}

export async function editChatMessage(
  messageId: string,
  actor: ChatActor,
  input: EditMessageRequest,
): Promise<ChatMessage> {
  requireSendMessages(actor);
  assertCanUseEveryoneMention(actor, input.content);
  const mentionedUserIds = await resolveMentionedUserIds(input.content);

  await database.transaction(async (transaction) => {
    const [existing] = await transaction
      .select({ authorId: messages.authorId, deletedAt: messages.deletedAt })
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);
    if (!existing) {
      throw new ChatServiceError(404, 'MESSAGE_NOT_FOUND', 'Message not found');
    }
    if (existing.deletedAt) {
      throw new ChatServiceError(
        409,
        'MESSAGE_DELETED',
        'Deleted messages cannot be edited',
      );
    }
    if (existing.authorId !== actor.id) {
      throw new ChatServiceError(
        403,
        'MESSAGE_EDIT_FORBIDDEN',
        'You can only edit your own messages',
      );
    }

    const now = new Date();
    await transaction
      .update(messages)
      .set({
        content: input.content,
        mentionsEveryone: /(^|[^a-z0-9_])@everyone\b/i.test(input.content),
        editedAt: now,
        updatedAt: now,
      })
      .where(eq(messages.id, messageId));
    await transaction
      .delete(messageMentions)
      .where(eq(messageMentions.messageId, messageId));
    if (mentionedUserIds.length > 0) {
      await transaction
        .insert(messageMentions)
        .values(mentionedUserIds.map((userId) => ({ messageId, userId })));
    }
  });

  return getMessageById(messageId);
}

export async function deleteChatMessage(
  messageId: string,
  actor: ChatActor,
): Promise<{ messageId: string; deletedAt: string }> {
  const message = await getMessageById(messageId);
  if (
    message.author.id !== actor.id &&
    !actorHasPermission(actor, PERMISSIONS.MANAGE_MESSAGES)
  ) {
    throw new ChatServiceError(
      403,
      'MESSAGE_DELETE_FORBIDDEN',
      'You can only delete your own messages without MANAGE_MESSAGES',
    );
  }
  if (message.deletedAt) {
    return {
      messageId,
      deletedAt: message.deletedAt,
    };
  }

  const deletedAt = new Date();
  await database.transaction(async (transaction) => {
    await transaction
      .update(messages)
      .set({ content: '', deletedAt, updatedAt: deletedAt })
      .where(eq(messages.id, messageId));
    await transaction
      .delete(messageMentions)
      .where(eq(messageMentions.messageId, messageId));
    await transaction
      .delete(messageReactions)
      .where(eq(messageReactions.messageId, messageId));
  });
  return {
    messageId,
    deletedAt: deletedAt.toISOString(),
  };
}

async function getReactions(messageId: string): Promise<ChatReaction[]> {
  const records = await database
    .select({ emoji: messageReactions.emoji, userId: messageReactions.userId })
    .from(messageReactions)
    .where(eq(messageReactions.messageId, messageId));
  const grouped = new Map<string, string[]>();
  for (const record of records) {
    const userIds = grouped.get(record.emoji) ?? [];
    userIds.push(record.userId);
    grouped.set(record.emoji, userIds);
  }
  return [...grouped.entries()].map(([emoji, userIds]) => ({
    emoji,
    count: userIds.length,
    userIds,
  }));
}

export async function addChatReaction(
  messageId: string,
  actor: ChatActor,
  input: ReactionRequest,
): Promise<{ reactions: ChatReaction[] }> {
  requireSendMessages(actor);
  const message = await getMessageById(messageId);
  if (message.deletedAt) {
    throw new ChatServiceError(
      409,
      'MESSAGE_DELETED',
      'Deleted messages cannot receive reactions',
    );
  }
  await database
    .insert(messageReactions)
    .values({ messageId, userId: actor.id, emoji: input.emoji })
    .onConflictDoNothing();
  return {
    reactions: await getReactions(messageId),
  };
}

export async function removeChatReaction(
  messageId: string,
  actor: ChatActor,
  input: ReactionRequest,
): Promise<{ reactions: ChatReaction[] }> {
  await getMessageById(messageId);
  await database
    .delete(messageReactions)
    .where(
      and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, actor.id),
        eq(messageReactions.emoji, input.emoji),
      ),
    );
  return {
    reactions: await getReactions(messageId),
  };
}
