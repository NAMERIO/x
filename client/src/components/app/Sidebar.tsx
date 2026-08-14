import type { AuthUser } from '@x/shared';

import { Icon } from './Icon';
import { NavigationItem } from './NavigationItem';
import type { AppView } from './types';
import { UserControls } from './UserControls';

interface SidebarProps {
  currentView: AppView;
  currentChannel: string;
  user: AuthUser;
  onChangeView: (view: AppView) => void;
  onChangeChannel: (channel: string) => void;
}

const primaryNavigation = [
  { id: 'chat', label: 'Chat', icon: 'chat' },
  { id: 'announcements', label: 'Announcements', icon: 'announcement' },
  { id: 'calls', label: 'Calls', icon: 'call' },
  { id: 'members', label: 'Members', icon: 'members' },
  { id: 'settings', label: 'Settings / Admin', icon: 'settings' },
] as const;

const channels = [
  { id: 'general', label: 'general', unread: '' },
  { id: 'introductions', label: 'introductions', unread: '3' },
  { id: 'prayer-requests', label: 'prayer-requests', unread: '' },
];

export function Sidebar({
  currentView,
  currentChannel,
  user,
  onChangeView,
  onChangeChannel,
}: SidebarProps) {
  return (
    <aside className="app-sidebar">
      <div className="community-identity">
        <img src="/god-thirsty-generation-logo.png" alt="" />
        <span>
          <strong>God Thirsty</strong>
          <small>Generation</small>
        </span>
        <Icon name="chevron" size={14} />
      </div>

      <nav className="app-primary-nav" aria-label="Main navigation">
        {primaryNavigation.map((item) => (
          <NavigationItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={currentView === item.id}
            badge={item.id === 'announcements' ? '2' : undefined}
            onClick={() => onChangeView(item.id)}
          />
        ))}
      </nav>

      <div className="sidebar-divider" />

      <section className="channel-navigation">
        <div className="sidebar-section-label">
          <span>Chat rooms</span>
          <button type="button" aria-label="Add chat room" title="Add room">
            <Icon name="plus" size={14} />
          </button>
        </div>
        <div className="channel-list">
          {channels.map((channel) => (
            <button
              key={channel.id}
              className={
                currentView === 'chat' && currentChannel === channel.id
                  ? 'is-active'
                  : ''
              }
              type="button"
              title={`# ${channel.label}`}
              onClick={() => {
                onChangeView('chat');
                onChangeChannel(channel.id);
              }}
            >
              <Icon name="hash" size={16} />
              <span>{channel.label}</span>
              {channel.unread && <i>{channel.unread}</i>}
            </button>
          ))}
        </div>
      </section>

      <UserControls
        name={user.displayName}
        email={user.email}
        onOpenSettings={() => onChangeView('settings')}
      />
    </aside>
  );
}
