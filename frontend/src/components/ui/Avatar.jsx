import { avatarColor, initials, getRoleColor } from '../../lib/utils.js';

export default function Avatar({ user, size = 40, showStatus = false, ring = false }) {
  if (!user) return <div style={{ width: size, height: size }} className="rounded-full bg-surface-2 animate-pulse" />;
  const color = avatarColor(user.username || user.id);
  const src = user.avatar ? (user.avatar.startsWith('http') ? user.avatar : user.avatar) : null;
  return (
    <div className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={user.displayName || user.username} className="rounded-full object-cover w-full h-full" style={ring ? { boxShadow: `0 0 0 2px ${color}` } : {}} />
      ) : (
        <div
          className="rounded-full flex items-center justify-center font-semibold text-white w-full h-full select-none"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, fontSize: size * 0.38, ...(ring ? { boxShadow: `0 0 0 2px ${color}66` } : {}) }}
        >
          {initials(user.displayName || user.username)}
        </div>
      )}
      {showStatus && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2"
          style={{
            width: size * 0.3, height: size * 0.3,
            background: user.status === 'online' ? '#10b981' : user.status === 'away' ? '#f59e0b' : user.status === 'busy' ? '#ef4444' : '#6b7591',
            borderColor: 'var(--bg)',
          }}
        />
      )}
    </div>
  );
}
