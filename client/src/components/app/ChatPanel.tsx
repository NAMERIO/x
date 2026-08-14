import {
  CHAT_SOCKET_EVENTS,
  type AuthUser,
  type ChatMessage,
  type ChatReactionsUpdatedEvent,
  type ChatTypingEvent,
} from '@x/shared';
import { useEffect, useRef, useState } from 'react';

import {
  ApiError,
  addChatReaction,
  deleteChatMessage,
  editChatMessage,
  getChatHistory,
  removeChatReaction,
  sendChatMessage,
} from '../../lib/api';
import type { ChatSocket } from '../../lib/chat-socket';
import { Icon } from './Icon';
import { MessageRow } from './MessageRow';

interface ChatPanelProps {
  user: AuthUser;
  socket: ChatSocket;
  connected: boolean;
  connectionError: string | null;
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong.';
}

function mergeMessage(messages: ChatMessage[], message: ChatMessage) {
  const existingIndex = messages.findIndex((item) => item.id === message.id);
  if (existingIndex < 0) return [...messages, message];
  return messages.map((item) => (item.id === message.id ? message : item));
}

export function ChatPanel({
  user,
  socket,
  connected,
  connectionError,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingRemovalTimers = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );
  const scrollRegion = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      if (socket.connected) {
        socket.emit(CHAT_SOCKET_EVENTS.TYPING, {
          isTyping: false,
        });
      }
    };
  }, [socket]);

  useEffect(() => {
    let active = true;
    void getChatHistory()
      .then((response) => {
        if (!active) return;
        setMessages(response.messages);
        setNextCursor(response.nextCursor);
        setError(null);
        requestAnimationFrame(() => {
          if (scrollRegion.current) {
            scrollRegion.current.scrollTop = scrollRegion.current.scrollHeight;
          }
        });
      })
      .catch((caughtError: unknown) => {
        if (active) setError(errorMessage(caughtError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!connected) return;

    function handleCreated(message: ChatMessage) {
      setMessages((current) => mergeMessage(current, message));
      requestAnimationFrame(() => {
        if (scrollRegion.current) {
          scrollRegion.current.scrollTop = scrollRegion.current.scrollHeight;
        }
      });
    }
    function handleUpdated(message: ChatMessage) {
      setMessages((current) => mergeMessage(current, message));
    }
    function handleDeleted(event: { messageId: string; deletedAt: string }) {
      setMessages((current) =>
        current.map((message) =>
          message.id === event.messageId
            ? {
                ...message,
                content: 'Message deleted',
                deletedAt: event.deletedAt,
                reactions: [],
              }
            : message,
        ),
      );
    }
    function handleReactions(event: ChatReactionsUpdatedEvent) {
      setMessages((current) =>
        current.map((message) =>
          message.id === event.messageId
            ? { ...message, reactions: event.reactions }
            : message,
        ),
      );
    }
    function handleTyping(event: ChatTypingEvent) {
      if (event.userId === user.id) return;
      const existingTimer = typingRemovalTimers.current.get(event.userId);
      if (existingTimer) clearTimeout(existingTimer);
      if (!event.isTyping) {
        setTypingUsers((current) => {
          const next = { ...current };
          delete next[event.userId];
          return next;
        });
        return;
      }
      setTypingUsers((current) => ({
        ...current,
        [event.userId]: event.displayName,
      }));
      typingRemovalTimers.current.set(
        event.userId,
        setTimeout(() => {
          setTypingUsers((current) => {
            const next = { ...current };
            delete next[event.userId];
            return next;
          });
          typingRemovalTimers.current.delete(event.userId);
        }, 2_500),
      );
    }

    socket.on(CHAT_SOCKET_EVENTS.MESSAGE_CREATED, handleCreated);
    socket.on(CHAT_SOCKET_EVENTS.MESSAGE_UPDATED, handleUpdated);
    socket.on(CHAT_SOCKET_EVENTS.MESSAGE_DELETED, handleDeleted);
    socket.on(CHAT_SOCKET_EVENTS.REACTIONS_UPDATED, handleReactions);
    socket.on(CHAT_SOCKET_EVENTS.TYPING, handleTyping);

    const removalTimers = typingRemovalTimers.current;
    return () => {
      socket.off(CHAT_SOCKET_EVENTS.MESSAGE_CREATED, handleCreated);
      socket.off(CHAT_SOCKET_EVENTS.MESSAGE_UPDATED, handleUpdated);
      socket.off(CHAT_SOCKET_EVENTS.MESSAGE_DELETED, handleDeleted);
      socket.off(CHAT_SOCKET_EVENTS.REACTIONS_UPDATED, handleReactions);
      socket.off(CHAT_SOCKET_EVENTS.TYPING, handleTyping);
      for (const timer of removalTimers.values()) clearTimeout(timer);
      removalTimers.clear();
    };
  }, [connected, socket, user.id]);

  function stopTyping() {
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = null;
    if (socket.connected) {
      socket.emit(CHAT_SOCKET_EVENTS.TYPING, {
        isTyping: false,
      });
    }
  }

  function updateDraft(value: string) {
    setDraft(value);
    if (!connected) return;
    socket.emit(CHAT_SOCKET_EVENTS.TYPING, {
      isTyping: value.trim().length > 0,
    });
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(stopTyping, 1_200);
  }

  async function submitMessage() {
    if (!draft.trim() || sending) return;
    setSending(true);
    setError(null);
    stopTyping();
    try {
      const message = await sendChatMessage({
        content: draft,
        replyToId: replyTo?.id ?? null,
      });
      setMessages((current) => mergeMessage(current, message));
      setDraft('');
      setReplyTo(null);
      requestAnimationFrame(() => {
        if (scrollRegion.current) {
          scrollRegion.current.scrollTop = scrollRegion.current.scrollHeight;
        }
      });
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    } finally {
      setSending(false);
    }
  }

  async function loadEarlier() {
    if (!nextCursor || loadingEarlier) return;
    setLoadingEarlier(true);
    try {
      const response = await getChatHistory(nextCursor);
      setMessages((current) => [
        ...response.messages.filter(
          (message) => !current.some((item) => item.id === message.id),
        ),
        ...current,
      ]);
      setNextCursor(response.nextCursor);
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    } finally {
      setLoadingEarlier(false);
    }
  }

  async function editMessage(message: ChatMessage) {
    const content = window.prompt('Edit message', message.content);
    if (!content || content.trim() === message.content) return;
    try {
      const updated = await editChatMessage(message.id, { content });
      setMessages((current) => mergeMessage(current, updated));
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    }
  }

  async function deleteMessage(message: ChatMessage) {
    if (!window.confirm('Delete this message?')) return;
    try {
      await deleteChatMessage(message.id);
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    }
  }

  async function toggleReaction(message: ChatMessage, emoji: string) {
    try {
      const currentReaction = message.reactions.find(
        (reaction) => reaction.emoji === emoji,
      );
      const event = currentReaction?.userIds.includes(user.id)
        ? await removeChatReaction(message.id, { emoji })
        : await addChatReaction(message.id, { emoji });
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? { ...item, reactions: event.reactions }
            : item,
        ),
      );
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    }
  }

  function addReaction(message: ChatMessage) {
    const emoji = window.prompt('Enter an emoji reaction', '🙏');
    if (emoji?.trim()) void toggleReaction(message, emoji.trim());
  }

  const typingNames = Object.values(typingUsers);

  return (
    <section className="chat-panel">
      <div className="message-scroll-region" ref={scrollRegion}>
        <div className="channel-intro">
          <span>
            <Icon name="chat" size={26} />
          </span>
          <h2>Welcome to the community</h2>
          <p>A shared conversation for the whole community.</p>
        </div>
        {nextCursor && (
          <button
            className="load-history-button"
            type="button"
            disabled={loadingEarlier}
            onClick={() => void loadEarlier()}
          >
            {loadingEarlier ? 'Loading…' : 'Load earlier messages'}
          </button>
        )}
        {loading && <div className="chat-empty-state">Loading messages…</div>}
        {!loading && messages.length === 0 && (
          <div className="chat-empty-state">
            <Icon name="chat" size={20} />
            <strong>No messages yet</strong>
            <span>Start the community conversation.</span>
          </div>
        )}
        <div className="message-list">
          {messages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              user={user}
              onReply={setReplyTo}
              onEdit={(item) => void editMessage(item)}
              onDelete={(item) => void deleteMessage(item)}
              onToggleReaction={(item, emoji) =>
                void toggleReaction(item, emoji)
              }
              onAddReaction={addReaction}
            />
          ))}
        </div>
      </div>
      <div className="message-composer-wrap">
        {error && <div className="chat-error-state">{error}</div>}
        {replyTo && (
          <div className="composer-replying">
            <span>
              Replying to <strong>{replyTo.author.displayName}</strong>
            </span>
            <button type="button" onClick={() => setReplyTo(null)}>
              <Icon name="close" size={14} />
            </button>
          </div>
        )}
        <div className="message-composer">
          <button
            type="button"
            aria-label="Add attachment"
            disabled
            title="File uploads are not available yet"
          >
            <Icon name="plus" size={18} />
          </button>
          <textarea
            aria-label="Message the community"
            rows={1}
            value={draft}
            maxLength={4_000}
            disabled={sending}
            placeholder="Message the community"
            onChange={(event) => updateDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void submitMessage();
              }
            }}
          />
          <button
            type="button"
            aria-label="Choose emoji"
            title="Emoji"
            onClick={() => updateDraft(`${draft}🙏`)}
          >
            <Icon name="emoji" size={18} />
          </button>
          <button
            className="composer-send"
            type="button"
            aria-label="Send message"
            disabled={!draft.trim() || sending}
            onClick={() => void submitMessage()}
          >
            <Icon name="send" size={17} />
          </button>
        </div>
        <div className="composer-status">
          <span>
            {typingNames.length > 0
              ? `${typingNames.slice(0, 2).join(', ')} ${typingNames.length === 1 ? 'is' : 'are'} typing…`
              : connected
                ? 'Connected'
                : connectionError || 'Reconnecting…'}
          </span>
          <small>Enter to send · Shift+Enter for a new line</small>
        </div>
      </div>
    </section>
  );
}
