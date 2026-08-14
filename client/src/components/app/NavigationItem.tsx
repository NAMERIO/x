import { Icon, type IconName } from './Icon';

interface NavigationItemProps {
  icon: IconName;
  label: string;
  active?: boolean;
  badge?: string;
  onClick: () => void;
}

export function NavigationItem({
  icon,
  label,
  active = false,
  badge,
  onClick,
}: NavigationItemProps) {
  return (
    <button
      className={`app-nav-item${active ? ' is-active' : ''}`}
      type="button"
      aria-current={active ? 'page' : undefined}
      title={label}
      onClick={onClick}
    >
      <Icon name={icon} size={18} />
      <span className="app-nav-label">{label}</span>
      {badge && <span className="app-nav-badge">{badge}</span>}
    </button>
  );
}
