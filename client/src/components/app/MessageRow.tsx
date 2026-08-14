import { Avatar } from './Avatar';
import { Icon } from './Icon';
import type { MockMessage } from './types';

interface MessageRowProps {
  message: MockMessage;
}

export function MessageRow({ message }: MessageRowProps) {
  return (
    <article className="message-row">
      <Avatar
        name={message.author.name}
        color={message.author.avatarColor}
        size="medium"
      />
      <div className="message-content">
        {message.replyTo && (
          <div className="message-reply">
            <Icon name="reply" size={13} />
            Replying to <strong>{message.replyTo}</strong>
          </div>
        )}
        <header>
          <strong>{message.author.name}</strong>
          <span>{message.author.role}</span>
          <time>{message.timestamp}</time>
        </header>
        <p>{message.content}</p>
        {message.reactions && (
          <div className="message-reactions">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                type="button"
                aria-label={`${reaction.emoji}, ${reaction.count} reactions`}
              >
                <span>{reaction.emoji}</span>
                {reaction.count}
              </button>
            ))}
            <button
              type="button"
              aria-label="Add reaction"
              title="Add reaction"
            >
              <Icon name="emoji" size={14} />
              <Icon name="plus" size={10} />
            </button>
          </div>
        )}
      </div>
      <div className="message-actions">
        <button type="button" aria-label="Add reaction" title="Add reaction">
          <Icon name="emoji" size={16} />
        </button>
        <button type="button" aria-label="Reply" title="Reply">
          <Icon name="reply" size={16} />
        </button>
        <button type="button" aria-label="More message actions" title="More">
          <Icon name="more" size={16} />
        </button>
      </div>
    </article>
  );
}
