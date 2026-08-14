import { Icon } from './Icon';
import type { AppView } from './types';

interface TopHeaderProps {
  view: AppView;
  channel: string;
  memberPanelOpen: boolean;
  onToggleMemberPanel: () => void;
}

const viewDetails: Record<
  Exclude<AppView, 'chat'>,
  { title: string; subtitle: string }
> = {
  announcements: {
    title: 'Announcements',
    subtitle: 'Important updates from community leaders',
  },
  calls: {
    title: 'Calls',
    subtitle: 'Voice and video spaces',
  },
  members: {
    title: 'Members',
    subtitle: 'People in this community',
  },
  settings: {
    title: 'Settings / Admin',
    subtitle: 'Community and account preferences',
  },
};

export function TopHeader({
  view,
  channel,
  memberPanelOpen,
  onToggleMemberPanel,
}: TopHeaderProps) {
  const details =
    view === 'chat'
      ? {
          title: channel,
          subtitle:
            channel === 'general'
              ? 'Everyday conversation for the whole community'
              : channel === 'introductions'
                ? 'Say hello and get to know one another'
                : 'Share requests and support one another',
        }
      : viewDetails[view];

  return (
    <header className="app-top-header">
      <div className="header-title-group">
        <span className="header-title-icon">
          <Icon
            name={
              view === 'chat'
                ? 'hash'
                : view === 'calls'
                  ? 'call'
                  : view === 'members'
                    ? 'members'
                    : view === 'settings'
                      ? 'settings'
                      : 'announcement'
            }
          />
        </span>
        <div>
          <h1>{details.title}</h1>
          <p>{details.subtitle}</p>
        </div>
      </div>
      <div className="header-actions">
        {view === 'chat' && (
          <>
            <button
              type="button"
              aria-label="Pinned messages"
              title="Pinned messages"
            >
              <Icon name="pin" />
            </button>
            <button
              className={memberPanelOpen ? 'is-active' : ''}
              type="button"
              aria-label="Toggle member panel"
              title="Toggle members"
              onClick={onToggleMemberPanel}
            >
              <Icon name="members" />
            </button>
          </>
        )}
        <label className="header-search">
          <Icon name="search" size={15} />
          <input aria-label="Search" placeholder="Search" />
          <kbd>⌘K</kbd>
        </label>
        <button type="button" aria-label="Inbox" title="Inbox">
          <Icon name="inbox" />
        </button>
        <button type="button" aria-label="Help" title="Help">
          <Icon name="help" />
        </button>
      </div>
    </header>
  );
}
