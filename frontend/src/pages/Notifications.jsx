import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, BellOff, CheckCheck, Trash2, MessageSquare, Heart, UserPlus,
  AtSign, Award, ShieldAlert, MessageCircle, Sparkles,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { FullSpinner, EmptyState } from '../components/ui/Loading.jsx';
import { formatTime } from '../lib/utils.js';

const TYPE_META = {
  reply: { icon: MessageSquare, color: '#6366f1', label: '回复' },
  mention: { icon: AtSign, color: '#06b6d4', label: '提及' },
  reaction: { icon: Heart, color: '#ec4899', label: '反应' },
  follow: { icon: UserPlus, color: '#10b981', label: '关注' },
  badge: { icon: Award, color: '#f59e0b', label: '徽章' },
  message: { icon: MessageCircle, color: '#8b5cf6', label: '私信' },
  report: { icon: ShieldAlert, color: '#ef4444', label: '举报' },
  system: { icon: Sparkles, color: '#a5b4fc', label: '系统' },
};

function getTypeMeta(type) {
  return TYPE_META[type] || { icon: Bell, color: '#6366f1', label: '通知' };
}

function dateBucket(ts) {
  if (!ts) return '更早';
  const d = new Date(ts * 1000);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
  const startOfYesterday = startOfToday - 86400;
  if (ts >= startOfToday) return '今天';
  if (ts >= startOfYesterday) return '昨天';
  if (ts >= startOfToday - 86400 * 6) return '本周';
  return '更早';
}

export default function Notifications() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    api.getNotifications('?limit=50')
      .then(r => setItems(r.items || []))
      .catch(e => toast(e.message || '加载通知失败', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const unreadCount = useMemo(() => items.filter(n => !n.read).length, [items]);

  const filtered = useMemo(() => {
    return filter === 'unread' ? items.filter(n => !n.read) : items;
  }, [items, filter]);

  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach(n => {
      const key = dateBucket(n.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(n);
    });
    return [...map.entries()];
  }, [filtered]);

  const markRead = async (id) => {
    const target = items.find(n => n.id === id);
    if (!target || target.read) return;
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await api.readNotification(id);
    } catch (e) {
      setItems(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
      toast(e.message || '操作失败', 'error');
    }
  };

  const readAll = async () => {
    if (unreadCount === 0) return;
    setBusy(true);
    const prev = items;
    setItems(p => p.map(n => ({ ...n, read: true })));
    try {
      await api.readAllNotifications();
      toast('已全部标记为已读', 'success');
    } catch (e) {
      setItems(prev);
      toast(e.message || '操作失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    const prev = items;
    setItems(p => p.filter(n => n.id !== id));
    try {
      await api.deleteNotification(id);
      toast('已删除通知', 'success');
    } catch (e) {
      setItems(prev);
      toast(e.message || '删除失败', 'error');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="max-w-3xl mx-auto px-3 sm:px-5 py-6">
        {/* Header */}
        <div className="relative overflow-hidden card p-6 mb-5">
          <div className="absolute -top-14 -right-8 w-52 h-52 rounded-full blur-3xl opacity-25" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
          <div className="absolute inset-0 bg-grid-pattern opacity-20" style={{ backgroundSize: '30px 30px' }} />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative p-3 rounded-2xl shrink-0" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(6,182,212,0.16))', border: '1px solid rgba(139,92,246,0.3)' }}>
                <Bell size={24} className="text-violetx-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold">
                  <span className="gradient-text">通知</span>中心
                </h1>
                <p className="text-muted text-sm mt-1">
                  {unreadCount > 0 ? `你有 ${unreadCount} 条未读通知` : '所有通知都已读完'}
                </p>
              </div>
            </div>
            <button
              onClick={readAll}
              disabled={busy || unreadCount === 0}
              className="btn-primary px-4 py-2.5 rounded-xl inline-flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCheck size={16} /> 全部已读
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 glass rounded-xl p-1 mb-4 w-fit">
          <FilterTab active={filter === 'all'} onClick={() => setFilter('all')} label="全部" count={items.length} />
          <FilterTab active={filter === 'unread'} onClick={() => setFilter('unread')} label="未读" count={unreadCount} />
        </div>

        {/* List */}
        {loading ? (
          <FullSpinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title={filter === 'unread' ? '没有未读通知' : '还没有通知'}
            desc={filter === 'unread' ? '你已经处理完所有通知啦。' : '当有人回复、点赞或关注你时，会在这里提醒你。'}
          />
        ) : (
          <div className="space-y-6">
            {groups.map(([group, list]) => (
              <div key={group}>
                <div className="flex items-center gap-3 mb-2 px-1">
                  <h2 className="font-display text-xs font-bold uppercase tracking-wider text-muted">{group}</h2>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  <span className="text-xs text-muted">{list.length}</span>
                </div>
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {list.map(n => (
                      <NotificationItem
                        key={n.id}
                        n={n}
                        onRead={markRead}
                        onDelete={remove}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function FilterTab({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${active ? 'btn-primary' : 'hover:bg-surface-2 text-muted'}`}
    >
      {label}
      {count > 0 && (
        <span className={`text-[11px] px-1.5 rounded-full ${active ? 'bg-white/25' : 'bg-surface-2'}`}>{count}</span>
      )}
    </button>
  );
}

function NotificationItem({ n, onRead, onDelete }) {
  const meta = getTypeMeta(n.type);
  const Icon = meta.icon;
  const actor = n.actor || n.user || n.from;
  const body = n.content || n.message || n.text || '';
  const unread = !n.read;

  const link = n.threadId ? `/thread/${n.threadId}` : n.username ? `/u/${n.username}` : null;

  const inner = (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onClick={() => { if (unread) onRead(n.id); }}
      className={`group relative card surface-hover p-3.5 cursor-pointer overflow-hidden ${unread ? '' : 'opacity-75'}`}
      style={unread ? { borderColor: `${meta.color}55`, boxShadow: `0 0 0 1px ${meta.color}22` } : {}}
    >
      {unread && (
        <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: `linear-gradient(180deg, ${meta.color}, transparent)` }} />
      )}
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <Avatar user={actor} size={42} showStatus />
          <span
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2"
            style={{ background: `${meta.color}26`, color: meta.color, borderColor: 'var(--surface)' }}
          >
            <Icon size={11} />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">
              {actor ? (actor.displayName || actor.username) : '系统'}
            </span>
            {n.title && <span className="text-sm text-muted">{n.title}</span>}
            {unread && <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />}
          </div>
          {body && <p className="text-sm text-muted mt-0.5 line-clamp-2 leading-relaxed">{body}</p>}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="chip" style={{ color: meta.color, borderColor: `${meta.color}40`, background: `${meta.color}12` }}>
              {meta.label}
            </span>
            <span className="text-xs text-muted">{formatTime(n.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
          {unread && (
            <button
              onClick={(e) => { e.stopPropagation(); onRead(n.id); }}
              title="标记已读"
              className="p-1.5 rounded-lg hover:bg-surface-2 text-muted hover:text-brand-400 transition"
            >
              <CheckCheck size={15} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(n.id); }}
            title="删除"
            className="p-1.5 rounded-lg hover:bg-red-500/15 text-muted hover:text-red-400 transition"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </motion.div>
  );

  return link ? <Link to={link} className="block">{inner}</Link> : inner;
}
