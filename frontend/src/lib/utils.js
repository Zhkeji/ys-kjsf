export function formatTime(ts) {
  if (!ts) return '';
  const now = Date.now() / 1000;
  const diff = now - ts;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}天前`;
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatTimeFull(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatNumber(n) {
  if (n === undefined || n === null) return '0';
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];
export function avatarColor(seed) {
  const s = String(seed || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function initials(name) {
  if (!name) return '?';
  const trimmed = name.trim();
  if (/[\u4e00-\u9fa5]/.test(trimmed)) return trimmed.slice(-2);
  return trimmed.slice(0, 2).toUpperCase();
}

export function getRoleColor(role) {
  return { admin: '#ef4444', moderator: '#f59e0b', member: '#6366f1' }[role] || '#6366f1';
}

export function getRoleLabel(role) {
  return { admin: '管理员', moderator: '版主', member: '成员' }[role] || '成员';
}

export function getTierColor(tier) {
  return { bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', platinum: '#e5e4e2' }[tier] || '#6366f1';
}

export function getReactionEmoji(type) {
  return { like: '👍', love: '❤️', haha: '😂', wow: '😮', sad: '😢', angry: '😡', fire: '🔥', brain: '🧠' }[type] || '👍';
}

export function getReactionLabel(type) {
  return { like: '赞', love: '爱', haha: '哈哈', wow: '哇', sad: '伤心', angry: '怒', fire: '火', brain: '聪明' }[type] || '赞';
}

export function getThreadTypeMeta(type) {
  return {
    discussion: { label: '讨论', color: '#6366f1', icon: 'MessageCircle' },
    question: { label: '提问', color: '#f59e0b', icon: 'HelpCircle' },
    guide: { label: '教程', color: '#10b981', icon: 'BookOpen' },
    poll: { label: '投票', color: '#8b5cf6', icon: 'Vote' },
    announcement: { label: '公告', color: '#ef4444', icon: 'Megaphone' },
  }[type] || { label: '讨论', color: '#6366f1', icon: 'MessageCircle' };
}
