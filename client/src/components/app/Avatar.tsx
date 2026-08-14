interface AvatarProps {
  name: string;
  color: string;
  size?: 'small' | 'medium' | 'large';
  status?: 'online' | 'idle' | 'offline';
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function Avatar({ name, color, size = 'medium', status }: AvatarProps) {
  return (
    <span
      className={`app-avatar app-avatar-${size}`}
      style={{ backgroundColor: color }}
      aria-label={name}
    >
      {getInitials(name)}
      {status && <i className={`presence-dot presence-${status}`} />}
    </span>
  );
}
