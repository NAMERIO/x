import assert from 'node:assert/strict';
import { test } from 'node:test';

import { API_PREFIX, API_ROUTES, CHAT_SOCKET_EVENTS } from '@x/shared';
import { eq, inArray } from 'drizzle-orm';
import { io } from 'socket.io-client';

import { buildApp } from '../dist/app.js';
import { database } from '../dist/database/client.js';
import { messages, userRoles, users } from '../dist/database/schema/index.js';

function waitForEvent(socket, eventName, timeoutMs = 5_000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);
    function handler(value) {
      clearTimeout(timeout);
      resolve(value);
    }
    socket.once(eventName, handler);
  });
}

function connectSocket(baseUrl, cookie) {
  const socket = io(baseUrl, {
    autoConnect: false,
    transports: ['websocket'],
    extraHeaders: {
      Cookie: cookie,
      Origin: 'http://localhost:3000',
    },
  });
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
    socket.connect();
  });
}

async function register(baseUrl, displayName, email) {
  const response = await fetch(
    `${baseUrl}${API_PREFIX}${API_ROUTES.auth.register}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify({
        displayName,
        email,
        password: 'integration-password-123!',
      }),
    },
  );
  assert.equal(response.status, 201);
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie);
  return { cookie, user: (await response.json()).user };
}

async function chatRequest(baseUrl, cookie, path, method, body) {
  const headers = {
    cookie,
    origin: 'http://localhost:3000',
  };
  if (body !== undefined) headers['content-type'] = 'application/json';
  return fetch(`${baseUrl}${API_PREFIX}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test(
  'two authenticated sessions receive authoritative chat and presence events',
  { timeout: 30_000 },
  async () => {
    const app = buildApp({ logger: false });
    await app.listen({ host: '127.0.0.1', port: 0 });
    const address = app.server.address();
    assert.ok(address && typeof address === 'object');
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    let first;
    let second;
    let firstSocket;
    let secondSocket;

    try {
      first = await register(
        baseUrl,
        'Realtime Test One',
        `chat-one-${unique}@example.com`,
      );
      second = await register(
        baseUrl,
        'Realtime Test Two',
        `chat-two-${unique}@example.com`,
      );

      firstSocket = await connectSocket(baseUrl, first.cookie);
      const firstSeesSecondOnline = waitForEvent(
        firstSocket,
        CHAT_SOCKET_EVENTS.PRESENCE_CHANGED,
      );
      secondSocket = await connectSocket(baseUrl, second.cookie);
      const onlineEvent = await firstSeesSecondOnline;
      assert.equal(onlineEvent.userId, second.user.id);
      assert.equal(onlineEvent.status, 'online');

      const createdEventPromise = waitForEvent(
        firstSocket,
        CHAT_SOCKET_EVENTS.MESSAGE_CREATED,
      );
      const createResponse = await chatRequest(
        baseUrl,
        second.cookie,
        API_ROUTES.chat.messages,
        'POST',
        { content: `hello @${first.user.username}`, replyToId: null },
      );
      assert.equal(createResponse.status, 201);
      const created = await createdEventPromise;
      assert.equal(created.author.id, second.user.id);
      assert.ok(created.mentionedUserIds.includes(first.user.id));

      const editedEventPromise = waitForEvent(
        firstSocket,
        CHAT_SOCKET_EVENTS.MESSAGE_UPDATED,
      );
      const editResponse = await chatRequest(
        baseUrl,
        second.cookie,
        API_ROUTES.chat.message(created.id),
        'PATCH',
        { content: 'edited in real time' },
      );
      assert.equal(editResponse.status, 200);
      assert.equal((await editedEventPromise).content, 'edited in real time');

      const replyEventPromise = waitForEvent(
        secondSocket,
        CHAT_SOCKET_EVENTS.MESSAGE_CREATED,
      );
      const replyResponse = await chatRequest(
        baseUrl,
        first.cookie,
        API_ROUTES.chat.messages,
        'POST',
        { content: 'reply from the other session', replyToId: created.id },
      );
      assert.equal(replyResponse.status, 201);
      assert.equal((await replyEventPromise).replyTo.id, created.id);

      const reactionEventPromise = waitForEvent(
        secondSocket,
        CHAT_SOCKET_EVENTS.REACTIONS_UPDATED,
      );
      const reactionResponse = await chatRequest(
        baseUrl,
        first.cookie,
        API_ROUTES.chat.reactions(created.id),
        'PUT',
        { emoji: '🙏' },
      );
      assert.equal(reactionResponse.status, 200);
      const reactionEvent = await reactionEventPromise;
      assert.equal(reactionEvent.reactions[0].emoji, '🙏');
      assert.ok(reactionEvent.reactions[0].userIds.includes(first.user.id));

      const historyResponse = await chatRequest(
        baseUrl,
        first.cookie,
        API_ROUTES.chat.messages,
        'GET',
      );
      assert.equal(historyResponse.status, 200);
      const history = await historyResponse.json();
      const persistedMessage = history.messages.find(
        (message) => message.id === created.id,
      );
      assert.equal(persistedMessage.content, 'edited in real time');
      assert.equal(persistedMessage.reactions[0].emoji, '🙏');
      assert.ok(
        history.messages.some((message) => message.replyTo?.id === created.id),
      );

      const typingEventPromise = waitForEvent(
        firstSocket,
        CHAT_SOCKET_EVENTS.TYPING,
      );
      secondSocket.emit(CHAT_SOCKET_EVENTS.TYPING, {
        isTyping: true,
        userId: first.user.id,
      });
      const typingEvent = await typingEventPromise;
      assert.equal(typingEvent.userId, second.user.id);
      assert.equal(typingEvent.displayName, second.user.displayName);

      const everyoneResponse = await chatRequest(
        baseUrl,
        second.cookie,
        API_ROUTES.chat.messages,
        'POST',
        { content: 'forged (@everyone) permission attempt', replyToId: null },
      );
      assert.equal(everyoneResponse.status, 403);

      await database
        .delete(userRoles)
        .where(eq(userRoles.userId, second.user.id));
      const missingPermissionResponse = await chatRequest(
        baseUrl,
        second.cookie,
        API_ROUTES.chat.messages,
        'POST',
        { content: 'SEND_MESSAGES bypass attempt', replyToId: null },
      );
      assert.equal(missingPermissionResponse.status, 403);

      const unauthenticatedResponse = await fetch(
        `${baseUrl}${API_PREFIX}${API_ROUTES.chat.messages}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ content: 'unauthorized', replyToId: null }),
        },
      );
      assert.equal(unauthenticatedResponse.status, 401);

      const deletedEventPromise = waitForEvent(
        firstSocket,
        CHAT_SOCKET_EVENTS.MESSAGE_DELETED,
      );
      const deleteResponse = await chatRequest(
        baseUrl,
        second.cookie,
        API_ROUTES.chat.message(created.id),
        'DELETE',
      );
      assert.equal(deleteResponse.status, 200);
      assert.equal((await deletedEventPromise).messageId, created.id);

      const offlineEventPromise = waitForEvent(
        firstSocket,
        CHAT_SOCKET_EVENTS.PRESENCE_CHANGED,
      );
      secondSocket.disconnect();
      const offlineEvent = await offlineEventPromise;
      assert.equal(offlineEvent.userId, second.user.id);
      assert.equal(offlineEvent.status, 'offline');

      const unauthenticatedSocket = io(baseUrl, {
        autoConnect: false,
        transports: ['websocket'],
        extraHeaders: { Origin: 'http://localhost:3000' },
      });
      const connectionError = await new Promise((resolve) => {
        unauthenticatedSocket.once('connect_error', resolve);
        unauthenticatedSocket.connect();
      });
      assert.match(connectionError.message, /UNAUTHENTICATED/);
      unauthenticatedSocket.disconnect();
    } finally {
      firstSocket?.disconnect();
      secondSocket?.disconnect();
      const userIds = [first?.user.id, second?.user.id].filter(Boolean);
      if (userIds.length > 0) {
        await database
          .delete(messages)
          .where(inArray(messages.authorId, userIds));
        await database.delete(users).where(inArray(users.id, userIds));
      }
      await app.close();
    }
  },
);
