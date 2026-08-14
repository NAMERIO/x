import type { AuthUser } from '@x/shared';
import { useState } from 'react';

import { ChatPanel } from './ChatPanel';
import {
  AnnouncementsPanel,
  CallsPanel,
  MembersPanel,
  SettingsPanel,
} from './ContentPanels';
import { MemberPanel } from './MemberPanel';
import { mockMembers } from './mockData';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import type { AppTheme, AppView } from './types';
import './app-shell.css';

interface AppShellProps {
  user: AuthUser;
  signingOut: boolean;
  onLogout: () => void;
}

export function AppShell({ user, signingOut, onLogout }: AppShellProps) {
  const [currentView, setCurrentView] = useState<AppView>('chat');
  const [currentChannel, setCurrentChannel] = useState('general');
  const [memberPanelOpen, setMemberPanelOpen] = useState(true);
  const [theme, setTheme] = useState<AppTheme>(() =>
    window.localStorage.getItem('gtg-app-theme') === 'dark' ? 'dark' : 'warm',
  );

  function changeTheme(nextTheme: AppTheme) {
    setTheme(nextTheme);
    window.localStorage.setItem('gtg-app-theme', nextTheme);
  }

  return (
    <main className={`application-shell theme-${theme}`}>
      <Sidebar
        currentView={currentView}
        currentChannel={currentChannel}
        user={user}
        onChangeView={setCurrentView}
        onChangeChannel={setCurrentChannel}
      />
      <section className="application-workspace">
        <TopHeader
          view={currentView}
          channel={currentChannel}
          memberPanelOpen={memberPanelOpen}
          onToggleMemberPanel={() => setMemberPanelOpen((current) => !current)}
        />
        <div className="application-content-row">
          <div className="application-main-content">
            {currentView === 'chat' && <ChatPanel channel={currentChannel} />}
            {currentView === 'announcements' && <AnnouncementsPanel />}
            {currentView === 'calls' && <CallsPanel />}
            {currentView === 'members' && <MembersPanel />}
            {currentView === 'settings' && (
              <SettingsPanel
                user={user}
                theme={theme}
                signingOut={signingOut}
                onChangeTheme={changeTheme}
                onLogout={onLogout}
              />
            )}
          </div>
          {currentView === 'chat' && (
            <MemberPanel
              members={mockMembers}
              open={memberPanelOpen}
              onClose={() => setMemberPanelOpen(false)}
            />
          )}
        </div>
      </section>
    </main>
  );
}
