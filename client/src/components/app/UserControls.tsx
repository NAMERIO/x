import { useState } from 'react';

import { Avatar } from './Avatar';
import { Icon } from './Icon';

interface UserControlsProps {
  name: string;
  email: string | null;
  onOpenSettings: () => void;
}

export function UserControls({
  name,
  email,
  onOpenSettings,
}: UserControlsProps) {
  const [microphoneMuted, setMicrophoneMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);

  return (
    <div className="user-controls">
      <div className="user-controls-profile" title={email ?? 'Account'}>
        <Avatar name={name} color="#3f6ea8" size="small" status="online" />
        <span className="user-controls-copy">
          <strong>{name}</strong>
          <small>Online</small>
        </span>
      </div>
      <div className="user-controls-actions">
        <button
          className={microphoneMuted ? 'is-disabled' : ''}
          type="button"
          aria-label={microphoneMuted ? 'Unmute microphone' : 'Mute microphone'}
          title={microphoneMuted ? 'Unmute' : 'Mute'}
          onClick={() => setMicrophoneMuted((current) => !current)}
        >
          <Icon name="microphone" size={17} />
          {microphoneMuted && <i />}
        </button>
        <button
          className={deafened ? 'is-disabled' : ''}
          type="button"
          aria-label={deafened ? 'Enable audio' : 'Deafen'}
          title={deafened ? 'Enable audio' : 'Deafen'}
          onClick={() => setDeafened((current) => !current)}
        >
          <Icon name="headphones" size={17} />
          {deafened && <i />}
        </button>
        <button
          type="button"
          aria-label="Open settings"
          title="Settings"
          onClick={onOpenSettings}
        >
          <Icon name="settings" size={17} />
        </button>
      </div>
    </div>
  );
}
