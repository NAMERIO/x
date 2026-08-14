import type { AuthUser } from '@x/shared';
import { useState } from 'react';

import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { MemberRow } from './MemberRow';
import { mockAnnouncements, mockMembers } from './mockData';
import type { AppTheme } from './types';

export function AnnouncementsPanel() {
  return (
    <section className="content-panel announcements-panel">
      <div className="content-panel-heading">
        <div>
          <p className="section-kicker">Community updates</p>
          <h2>Latest announcements</h2>
        </div>
        <button className="compact-primary-button" type="button">
          <Icon name="plus" size={15} />
          New announcement
        </button>
      </div>
      <div className="announcement-list">
        {mockAnnouncements.map((announcement) => (
          <article key={announcement.id} className="announcement-row">
            <div className="announcement-marker">
              <Icon
                name={announcement.pinned ? 'pin' : 'announcement'}
                size={17}
              />
            </div>
            <div className="announcement-body">
              <header>
                <span>{announcement.tag}</span>
                {announcement.pinned && <small>Pinned</small>}
              </header>
              <h3>{announcement.title}</h3>
              <p>{announcement.body}</p>
              <footer>
                {announcement.author} · {announcement.date}
              </footer>
            </div>
            <button type="button" aria-label="More announcement actions">
              <Icon name="more" size={18} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function InfoPanel() {
  return (
    <section className="content-panel info-panel">
      <div className="content-panel-heading">
        <div>
          <p className="section-kicker">Church information</p>
          <h2>God Thirsty Generation</h2>
        </div>
      </div>
      <div className="info-layout">
        <section className="info-about">
          <img
            src="/god-thirsty-generation-logo.png"
            alt="God Thirsty Generation"
          />
          <div>
            <h3>About our community</h3>
            <p>
              This page is ready for the church description, mission, and other
              information leaders want every member to have nearby.
            </p>
          </div>
        </section>
        <section className="info-details">
          <h3>Weekly schedule</h3>
          <div className="info-detail-row">
            <span>
              <Icon name="calendar" size={17} />
            </span>
            <div>
              <strong>Sunday gathering</strong>
              <small>Sundays · 10:00 AM</small>
            </div>
          </div>
          <div className="info-detail-row">
            <span>
              <Icon name="members" size={17} />
            </span>
            <div>
              <strong>Community night</strong>
              <small>Wednesdays · 7:00 PM</small>
            </div>
          </div>
        </section>
        <section className="info-details">
          <h3>Contact</h3>
          <div className="info-detail-row">
            <span>
              <Icon name="at" size={17} />
            </span>
            <div>
              <strong>Community email</strong>
              <small>hello@godthirstygeneration.org</small>
            </div>
          </div>
          <div className="info-detail-row">
            <span>
              <Icon name="info" size={17} />
            </span>
            <div>
              <strong>More information</strong>
              <small>Church leaders can update these details later.</small>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

const callRooms = [
  {
    name: 'Community Room',
    description: 'Open voice room for casual conversation',
    people: ['Maya Brooks', 'Daniel Okafor'],
  },
  {
    name: 'Prayer Room',
    description: 'A quiet space for prayer and support',
    people: [],
  },
  {
    name: 'Leadership Meeting',
    description: 'Private planning room for community leaders',
    people: ['Elias Mensah'],
  },
];

export function CallsPanel() {
  return (
    <section className="content-panel calls-panel">
      <div className="content-panel-heading">
        <div>
          <p className="section-kicker">Voice and video</p>
          <h2>Call rooms</h2>
        </div>
        <button className="compact-primary-button" type="button">
          <Icon name="plus" size={15} />
          Start a room
        </button>
      </div>
      <p className="panel-supporting-copy">
        Rooms are visual placeholders for now. Real-time audio and video will be
        connected later.
      </p>
      <div className="call-room-list">
        {callRooms.map((room) => (
          <article key={room.name} className="call-room-row">
            <span className="call-room-icon">
              <Icon name="call" size={20} />
            </span>
            <div>
              <h3>{room.name}</h3>
              <p>{room.description}</p>
              <div className="call-participants">
                {room.people.length > 0 ? (
                  <>
                    <span className="participant-avatars">
                      {room.people.map((name, index) => (
                        <Avatar
                          key={name}
                          name={name}
                          color={index === 0 ? '#5579b8' : '#7b6aa8'}
                          size="small"
                        />
                      ))}
                    </span>
                    <small>{room.people.join(', ')}</small>
                  </>
                ) : (
                  <small>Room is empty</small>
                )}
              </div>
            </div>
            <button className="room-action-button" type="button">
              <Icon name="call" size={15} />
              Join
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MembersPanel() {
  return (
    <section className="content-panel members-directory">
      <div className="content-panel-heading">
        <div>
          <p className="section-kicker">Directory</p>
          <h2>Community members</h2>
        </div>
        <label className="panel-search">
          <Icon name="search" size={15} />
          <input aria-label="Search members" placeholder="Search members" />
        </label>
      </div>
      <div className="member-directory-head">
        <span>Member</span>
        <span>Role</span>
      </div>
      <div className="member-directory-list">
        {mockMembers.map((member) => (
          <MemberRow key={member.id} member={member} detailed />
        ))}
      </div>
    </section>
  );
}

interface SettingsPanelProps {
  user: AuthUser;
  theme: AppTheme;
  signingOut: boolean;
  onChangeTheme: (theme: AppTheme) => void;
  onLogout: () => void;
}

export function SettingsPanel({
  user,
  theme,
  signingOut,
  onChangeTheme,
  onLogout,
}: SettingsPanelProps) {
  const [section, setSection] = useState<'account' | 'appearance'>('account');

  return (
    <section className="content-panel settings-panel">
      <div className="settings-navigation" aria-label="Settings sections">
        <p>Personal</p>
        <button
          className={section === 'account' ? 'is-active' : ''}
          type="button"
          onClick={() => setSection('account')}
        >
          <Icon name="settings" size={16} /> Account
        </button>
        <button
          className={section === 'appearance' ? 'is-active' : ''}
          type="button"
          onClick={() => setSection('appearance')}
        >
          <Icon name="sidebar" size={16} /> Appearance
        </button>
        <button type="button">
          <Icon name="bell" size={16} /> Notifications
        </button>
        <button type="button">
          <Icon name="microphone" size={16} /> Voice & video
        </button>
        <p>Administration</p>
        <button type="button">
          <Icon name="shield" size={16} /> Community settings
        </button>
        <button type="button">
          <Icon name="members" size={16} /> Roles & permissions
        </button>
      </div>
      <div className="settings-content">
        {section === 'account' ? (
          <>
            <p className="section-kicker">Account</p>
            <h2>Your profile</h2>
            <div className="profile-summary">
              <Avatar
                name={user.displayName}
                color="#3f6ea8"
                size="large"
                status="online"
              />
              <div>
                <strong>{user.displayName}</strong>
                <span>{user.email ?? 'Connected social account'}</span>
                {user.isOwner && <small>Application owner</small>}
              </div>
              <button type="button">Edit profile</button>
            </div>
            <div className="settings-field-list">
              <div>
                <span>Display name</span>
                <strong>{user.displayName}</strong>
                <button type="button">Edit</button>
              </div>
              <div>
                <span>Email address</span>
                <strong>{user.email ?? 'Connected social account'}</strong>
                <button type="button">Edit</button>
              </div>
              <div>
                <span>Theme</span>
                <strong>{theme === 'dark' ? 'Dark' : 'Warm'}</strong>
                <button type="button" onClick={() => setSection('appearance')}>
                  Change
                </button>
              </div>
            </div>
            <div className="settings-session-row">
              <div>
                <strong>Current session</strong>
                <span>Sign out of this device.</span>
              </div>
              <button type="button" disabled={signingOut} onClick={onLogout}>
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              className="appearance-back"
              type="button"
              onClick={() => setSection('account')}
            >
              ← Account settings
            </button>
            <p className="section-kicker">Appearance</p>
            <h2>Choose your theme</h2>
            <p className="appearance-description">
              Change how the application looks on this device. Your selection is
              saved automatically.
            </p>
            <div
              className="theme-options"
              role="radiogroup"
              aria-label="Application theme"
            >
              <button
                className={theme === 'warm' ? 'is-selected' : ''}
                type="button"
                role="radio"
                aria-checked={theme === 'warm'}
                onClick={() => onChangeTheme('warm')}
              >
                <span className="theme-preview theme-preview-warm">
                  <i />
                  <b />
                  <em />
                </span>
                <span className="theme-option-copy">
                  <strong>Warm</strong>
                  <small>Muted stone surfaces with teal navigation</small>
                </span>
                <span className="theme-check">
                  {theme === 'warm' && <Icon name="check" size={14} />}
                </span>
              </button>
              <button
                className={theme === 'dark' ? 'is-selected' : ''}
                type="button"
                role="radio"
                aria-checked={theme === 'dark'}
                onClick={() => onChangeTheme('dark')}
              >
                <span className="theme-preview theme-preview-dark">
                  <i />
                  <b />
                  <em />
                </span>
                <span className="theme-option-copy">
                  <strong>Dark</strong>
                  <small>Low-light charcoal surfaces with muted accents</small>
                </span>
                <span className="theme-check">
                  {theme === 'dark' && <Icon name="check" size={14} />}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
