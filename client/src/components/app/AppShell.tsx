import { CHAT_SOCKET_EVENTS, type AdminMember, type AuthUser } from '@x/shared';
import { useEffect, useState } from 'react';

import { ApiError, getCommunityMembers } from '../../lib/api';
import { createChatSocket } from '../../lib/chat-socket';

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
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const [chatSocket] = useState(createChatSocket);
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

  useEffect(() => {
    function handleConnect() {
      setSocketConnected(true);
      setSocketError(null);
    }
    function handleDisconnect() {
      setSocketConnected(false);
      setOnlineUserIds([]);
    }
    function handleConnectError(error: Error) {
      setSocketConnected(false);
      setSocketError(error.message || 'Realtime connection failed');
    }
    function handlePresenceSnapshot(event: { onlineUserIds: string[] }) {
      setOnlineUserIds(event.onlineUserIds);
    }
    function handlePresenceChanged(event: {
      userId: string;
      status: 'online' | 'offline';
    }) {
      setOnlineUserIds((current) =>
        event.status === 'online'
          ? [...new Set([...current, event.userId])]
          : current.filter((id) => id !== event.userId),
      );
    }

    chatSocket.on('connect', handleConnect);
    chatSocket.on('disconnect', handleDisconnect);
    chatSocket.on('connect_error', handleConnectError);
    chatSocket.on(CHAT_SOCKET_EVENTS.PRESENCE_SNAPSHOT, handlePresenceSnapshot);
    chatSocket.on(CHAT_SOCKET_EVENTS.PRESENCE_CHANGED, handlePresenceChanged);
    chatSocket.connect();

    return () => {
      chatSocket.off('connect', handleConnect);
      chatSocket.off('disconnect', handleDisconnect);
      chatSocket.off('connect_error', handleConnectError);
      chatSocket.off(
        CHAT_SOCKET_EVENTS.PRESENCE_SNAPSHOT,
        handlePresenceSnapshot,
      );
      chatSocket.off(
        CHAT_SOCKET_EVENTS.PRESENCE_CHANGED,
        handlePresenceChanged,
      );
      chatSocket.disconnect();
    };
  }, [chatSocket]);

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
            {currentView === 'chat' && (
              <ChatPanel
                user={user}
                socket={chatSocket}
                connected={socketConnected}
                connectionError={socketError}
              />
            )}
            {currentView === 'announcements' && <AnnouncementsPanel />}
            {currentView === 'info' && <InfoPanel />}
            {currentView === 'calls' && <CallsPanel />}
            {currentView === 'members' && (
              <MembersPanel
                members={members}
                onlineUserIds={onlineUserIds}
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
              onlineUserIds={onlineUserIds}
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
