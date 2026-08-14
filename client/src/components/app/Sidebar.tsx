import type { AuthUser } from '@x/shared';

import { Icon } from './Icon';
import { NavigationItem } from './NavigationItem';
import type { AppView } from './types';
import { UserControls } from './UserControls';

interface SidebarProps {
  currentView: AppView;
  user: AuthUser;
  onChangeView: (view: AppView) => void;
}

const primaryNavigation = [
  { id: 'calls', label: 'Calls', icon: 'call' },
  { id: 'members', label: 'Members', icon: 'members' },
  { id: 'settings', label: 'Settings / Admin', icon: 'settings' },
] as const;

export function Sidebar({ currentView, user, onChangeView }: SidebarProps) {
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
        <NavigationItem
          icon="info"
          label="Info"
          active={currentView === 'info'}
          onClick={() => onChangeView('info')}
        />
        <NavigationItem
          icon="announcement"
          label="Announcements"
          active={currentView === 'announcements'}
          badge="2"
          onClick={() => onChangeView('announcements')}
        />
        <NavigationItem
          icon="chat"
          label="Community"
          active={currentView === 'chat'}
          onClick={() => onChangeView('chat')}
        />
        {primaryNavigation.map((item) => (
          <NavigationItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={currentView === item.id}
            onClick={() => onChangeView(item.id)}
          />
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <UserControls
        name={user.displayName}
        email={user.email}
        onOpenSettings={() => onChangeView('settings')}
      />
    </aside>
  );
}
