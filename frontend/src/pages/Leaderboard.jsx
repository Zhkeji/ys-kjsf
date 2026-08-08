import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy, Medal, Crown, FileText, MessageSquare, UserPlus, UserCheck, Sparkles,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { FullSpinner, EmptyState } from '../components/ui/Loading.jsx';
import {
  formatNumber, getRoleColor, getRoleLabel,
} from '../lib/utils.js';

const PODIUM = [
  { medal: '#ffd700', glow: 'rgba(255,215,0,0.45)', height: 'h-36', label: '冠军', icon: Crown, order: 'sm:order-2' },
  { medal: '#c0c0c0', glow: 'rgba(192,192,192,0.40)', height: 'h-28', label: '亚军', icon: Medal, order: 'sm:order-1' },
  { medal: '#cd7f32', glow: 'rgba(205,127,50,0.40)', height: 'h-24', label: '季军', icon: Medal, order: 'sm:order-3' },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState({});
  const [pending, setPending] = useState({});

  useEffect(() => {
    api.getLeaderboard()
      .then(r => setItems(r.items || []))
      .catch(e => toast(e.message || '加载排行榜失败', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const toggleFollow = async (u) => {
    if (!user) { toast('请先登录后再关注', 'info'); return; }
    if (u.id === user.id) return;
    const prev = following[u.id] ?? !!u.isFollowing;
    setFollowing(f => ({ ...f, [u.id]: !prev }));
    setPending(p => ({ ...p, [u.id]: true }));
    try {
      await api.follow(u.id);
      toast(prev ? '已取消关注' : '关注成功', 'success');
    } catch (e) {
      setFollowing(f => ({ ...f, [u.id]: prev }));
      toast(e.message || '操作失败', 'error');
    } finally {
      setPending(p => ({ ...p, [u.id]: false }));
    }
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto px-3 sm:px-5 py-6"><FullSpinner /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-6">
        <EmptyState icon={Trophy} title="榜单暂未生成" desc="社区活跃后将会在此展示声望排行榜。" />
      </div>
    );
  }

  const top3 = items.slice(0, 3);
  const rest = items.slice(3);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-6">
        {/* Header */}
        <div className="relative overflow-hidden card p-6 sm:p-8 mb-8">
          <div className="absolute inset-0 bg-grid-pattern opacity-20" style={{ backgroundSize: '32px 32px' }} />
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl opacity-25" style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />
          <div className="relative flex items-center gap-4">
            <div className="p-3 rounded-2xl shrink-0 animate-float" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.30), rgba(236,72,153,0.18))', border: '1px solid rgba(245,158,11,0.35)' }}>
              <Trophy size={28} className="text-amber-400" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold">
                声望<span className="gradient-text">排行榜</span>
              </h1>
              <p className="text-muted text-sm mt-1">社区中最活跃、最有贡献的成员，每周更新。</p>
            </div>
          </div>
        </div>

        {/* Podium */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 items-end">
          {top3.map((u, i) => {
            const p = PODIUM[i];
            const PodiumIcon = p.icon;
            const roleColor = getRoleColor(u.role);
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, type: 'spring', stiffness: 120, damping: 16 }}
                className={p.order}
              >
                <Link to={`/u/${u.username}`} className="block group">
                  <div className="card overflow-hidden relative" style={{ borderColor: `${p.medal}66`, boxShadow: `0 12px 50px -16px ${p.glow}` }}>
                    {/* glow */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: p.medal }} />
                    <div className="relative px-4 pt-6 pb-5 text-center">
                      <div className="inline-flex items-center gap-1 mb-3 chip" style={{ background: `${p.medal}1a`, color: p.medal, borderColor: `${p.medal}40` }}>
                        <PodiumIcon size={13} /> {p.label}
                      </div>
                      <div className="relative inline-block">
                        <span className="absolute -top-3 -left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center font-display font-extrabold text-sm text-white shadow-lg" style={{ background: p.medal }}>
                          {i + 1}
                        </span>
                        <Avatar user={u} size={84} showStatus ring />
                      </div>
                      <h3 className="font-display font-bold text-lg mt-3 truncate group-hover:text-brand-400 transition">
                        {u.displayName || u.username}
                      </h3>
                      <p className="text-xs text-muted">@{u.username}</p>
                      <div className="inline-flex items-center gap-1 mt-2 chip" style={{ background: `${roleColor}1a`, color: roleColor, borderColor: `${roleColor}40` }}>
                        {getRoleLabel(u.role)}
                      </div>
                      <div className="mt-4 flex items-center justify-center gap-1.5">
                        <Trophy size={16} style={{ color: p.medal }} />
                        <span className="font-display text-2xl font-extrabold" style={{ color: p.medal }}>
                          {formatNumber(u.reputation)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted">声望值</p>
                    </div>
                    <div className={p.height} style={{ background: `linear-gradient(180deg, ${p.medal}33, ${p.medal}08)` }} />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Rest rows */}
        {rest.length > 0 && (
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-default">
              <Sparkles size={16} className="text-brand-400" />
              <h2 className="font-display font-bold">全部榜单</h2>
              <span className="text-xs text-muted">· {items.length} 位成员</span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {rest.map((u, i) => (
                <LeaderRow
                  key={u.id}
                  u={u}
                  rank={i + 4}
                  isFollowing={following[u.id] ?? !!u.isFollowing}
                  pending={!!pending[u.id]}
                  onFollow={() => toggleFollow(u)}
                  isSelf={user && u.id === user.id}
                  loggedIn={!!user}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function LeaderRow({ u, rank, isFollowing, pending, onFollow, isSelf, loggedIn }) {
  const roleColor = getRoleColor(u.role);
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(rank * 0.03, 0.4) }}
      className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 surface-hover"
    >
      <span className="font-display text-lg font-bold text-muted w-8 text-center shrink-0">{rank}</span>
      <Link to={`/u/${u.username}`} className="shrink-0">
        <Avatar user={u} size={44} showStatus />
      </Link>
      <Link to={`/u/${u.username}`} className="flex-1 min-w-0 group">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate group-hover:text-brand-400 transition">{u.displayName || u.username}</p>
          <span className="chip hidden sm:inline-flex" style={{ background: `${roleColor}1a`, color: roleColor, borderColor: `${roleColor}40` }}>
            {getRoleLabel(u.role)}
          </span>
        </div>
        <p className="text-xs text-muted truncate">@{u.username}</p>
      </Link>
      <div className="hidden sm:flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1"><FileText size={13} /> {formatNumber(u.threadCount)}</span>
        <span className="flex items-center gap-1"><MessageSquare size={13} /> {formatNumber(u.postCount)}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.12)' }}>
          <Trophy size={13} className="text-amber-400" />
          <span className="font-display font-bold text-sm text-amber-400">{formatNumber(u.reputation)}</span>
        </div>
        {loggedIn && !isSelf && (
          <button
            onClick={onFollow}
            disabled={pending}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${isFollowing ? 'border hover:bg-surface-2 text-muted' : 'btn-primary'}`}
            style={isFollowing ? { borderColor: 'var(--border)' } : {}}
          >
            {isFollowing ? <UserCheck size={14} /> : <UserPlus size={14} />}
            <span className="ml-1 hidden sm:inline">{isFollowing ? '已关注' : '关注'}</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
