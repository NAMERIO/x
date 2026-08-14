import { Icon } from './Icon';

interface ChatPanelProps {
  channel: string;
}

export function ChatPanel({ channel }: ChatPanelProps) {
  return (
    <section className="chat-panel">
      <div className="message-scroll-region">
        <div className="channel-intro">
          <span>
            <Icon name="hash" size={26} />
          </span>
          <h2>Welcome to #{channel}</h2>
          <p>This is the beginning of the #{channel} room.</p>
        </div>
        <div className="chat-empty-state">
          <Icon name="chat" size={20} />
          <strong>No messages yet</strong>
          <span>
            Real community messages will appear here once chat is connected.
          </span>
        </div>
      </div>
      <div className="message-composer-wrap">
        <div className="message-composer">
          <button
            type="button"
            aria-label="Add attachment"
            title="Add attachment"
          >
            <Icon name="plus" size={18} />
          </button>
          <textarea
            aria-label={`Message #${channel}`}
            rows={1}
            placeholder={`Message #${channel}`}
          />
          <button type="button" aria-label="Send a gift" title="Gift">
            <Icon name="gift" size={18} />
          </button>
          <button type="button" aria-label="Choose emoji" title="Emoji">
            <Icon name="emoji" size={18} />
          </button>
          <button
            className="composer-send"
            type="button"
            aria-label="Send message"
          >
            <Icon name="send" size={17} />
          </button>
        </div>
        <small>Mock interface — messages are not sent or stored.</small>
      </div>
    </section>
  );
}
