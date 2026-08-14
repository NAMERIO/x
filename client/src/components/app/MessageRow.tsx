import type { AuthUser, ChatMessage } from '@x/shared';

import { Avatar } from './Avatar';
import { Icon } from './Icon';

interface MessageRowProps {
  message: ChatMessage;
  user: AuthUser;
  onReply: (message: ChatMessage) => void;
  onEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
  onToggleReaction: (message: ChatMessage, emoji: string) => void;
  onAddReaction: (message: ChatMessage) => void;
}

function formatMessageTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function MessageText({
  content,
  username,
}: {
  content: string;
  username: string;
}) {
  return content.split(/(@everyone|@[a-z0-9_]{2,32})/gi).map((part, index) => {
    const normalized = part.toLowerCase();
    const isMention =
      normalized === '@everyone' || normalized === `@${username.toLowerCase()}`;
    return isMention ? (
      <mark className="message-mention" key={`${part}-${index}`}>
        {part}
      </mark>
    ) : (
      part
    );
  });
}

export function MessageRow({
  message,
  user,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
  onAddReaction,
}: MessageRowProps) {
  const primaryRole = message.author.roles[0];
  const isAuthor = message.author.id === user.id;
  const avatarColor =
    message.author.roles.find((role) => role.color)?.color ?? '#557d9f';

  return (
    <article
      className={`message-row${message.deletedAt ? ' is-deleted' : ''}`}
      id={`message-${message.id}`}
    >
      <Avatar
        name={message.author.displayName}
        imageUrl={message.author.avatarUrl ?? undefined}
        color={avatarColor}
        size="medium"
      />
      <div className="message-content">
        {message.replyTo && (
          <div className="message-reply">
            <Icon name="reply" size={13} />
            Replying to <strong>{message.replyTo.author.displayName}</strong>
            <span>{message.replyTo.content.slice(0, 90)}</span>
          </div>
        )}
        <header>
          <strong>{message.author.displayName}</strong>
          {primaryRole && (
            <span style={{ borderColor: primaryRole.color ?? undefined }}>
              {primaryRole.name}
            </span>
          )}
          <time dateTime={message.createdAt}>
            {formatMessageTime(message.createdAt)}
          </time>
          {message.editedAt && <small>(edited)</small>}
        </header>
        <p>
          {message.deletedAt ? (
            <em>Message deleted</em>
          ) : (
            <MessageText content={message.content} username={user.username} />
          )}
        </p>
        {!message.deletedAt && message.reactions.length > 0 && (
          <div className="message-reactions">
            {message.reactions.map((reaction) => (
              <button
                className={
                  reaction.userIds.includes(user.id) ? 'is-active' : ''
                }
                key={reaction.emoji}
                type="button"
                aria-label={`${reaction.emoji}, ${reaction.count} reactions`}
                onClick={() => onToggleReaction(message, reaction.emoji)}
              >
                <span>{reaction.emoji}</span>
                {reaction.count}
              </button>
            ))}
            <button
              type="button"
              aria-label="Add reaction"
              onClick={() => onAddReaction(message)}
            >
              <Icon name="emoji" size={14} />
              <Icon name="plus" size={10} />
            </button>
          </div>
        )}
      </div>
      {!message.deletedAt && (
        <div className="message-actions">
          <button
            type="button"
            aria-label="Add reaction"
            title="Add reaction"
            onClick={() => onAddReaction(message)}
          >
            <Icon name="emoji" size={16} />
          </button>
          <button
            type="button"
            aria-label="Reply"
            title="Reply"
            onClick={() => onReply(message)}
          >
            <Icon name="reply" size={16} />
          </button>
          {isAuthor && (
            <button
              type="button"
              aria-label="Edit message"
              title="Edit message"
              onClick={() => onEdit(message)}
            >
              <span className="message-action-text">Edit</span>
            </button>
          )}
          <button
            type="button"
            aria-label="Delete message"
            title="Delete message"
            onClick={() => onDelete(message)}
          >
            <span className="message-action-text">Delete</span>
          </button>
        </div>
      )}
    </article>
  );
}
