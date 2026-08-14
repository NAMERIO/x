import type { AdminMember, AuthUser } from '@x/shared';
import { useEffect, useState } from 'react';

import { ApiError, getCommunityMembers } from '../../lib/api';

import { ChatPanel } from './ChatPanel';
import {
  AnnouncementsPanel,
  CallsPanel,
  InfoPanel,
  MembersPanel,
  SettingsPanel,
} from './ContentPanels';
import { MemberPanel } from './MemberPanel';
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
  const [memberPanelOpen, setMemberPanelOpen] = useState(true);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [theme, setTheme] = useState<AppTheme>(() =>
    window.localStorage.getItem('gtg-app-theme') === 'dark' ? 'dark' : 'warm',
  );

  function changeTheme(nextTheme: AppTheme) {
    setTheme(nextTheme);
    window.localStorage.setItem('gtg-app-theme', nextTheme);
  }

  useEffect(() => {
    let active = true;
    void getCommunityMembers()
      .then((response) => {
        if (!active) return;
        setMembers(response.members);
        setMembersError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setMembersError(
          error instanceof ApiError
            ? error.message
            : 'Could not load community members.',
        );
      })
      .finally(() => {
        if (active) setMembersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentView]);

  return (
    <main className={`application-shell theme-${theme}`}>
      <Sidebar
        currentView={currentView}
        user={user}
        onChangeView={setCurrentView}
      />
      <section className="application-workspace">
        <TopHeader
          view={currentView}
          memberPanelOpen={memberPanelOpen}
          onToggleMemberPanel={() => setMemberPanelOpen((current) => !current)}
        />
        <div className="application-content-row">
          <div className="application-main-content">
            {currentView === 'chat' && <ChatPanel channel="community" />}
            {currentView === 'announcements' && <AnnouncementsPanel />}
            {currentView === 'info' && <InfoPanel />}
            {currentView === 'calls' && <CallsPanel />}
            {currentView === 'members' && (
              <MembersPanel
                members={members}
                currentUserId={user.id}
                loading={membersLoading}
                error={membersError}
              />
            )}
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
              members={members}
              currentUserId={user.id}
              loading={membersLoading}
              error={membersError}
              open={memberPanelOpen}
              onClose={() => setMemberPanelOpen(false)}
            />
          )}
        </div>
      </section>
    </main>
  );
}
