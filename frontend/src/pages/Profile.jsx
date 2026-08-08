import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin, Link as LinkIcon, Calendar, Trophy, MessageSquare, FileText,
  Users, Heart, Award, Bookmark, UserX, Shield, ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import ThreadCard from '../components/ui/ThreadCard.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { FullSpinner, EmptyState } from '../components/ui/Loading.jsx';
import {
  formatNumber, formatTime, getRoleColor, getRoleLabel, getTierColor,
} from '../lib/utils.js';

const TIER_LABEL = { bronze: '铜牌', silver: '银牌', gold: '金牌', platinum: '白金' };

function BadgeIcon({ icon }) {
  // Render emoji-like / short glyph icons as text, fall back to the Award icon.
  if (icon && [...icon].length <= 2) return <span className="text-xl leading-none">{icon}</span>;
  return <Award size={20} />;
}

export default function Profile() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('threads');
  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [following, setFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);
  const limit = 15;

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setProfile(null);
    setTab('threads');
    setPage(1);
    api.getUser(username)
      .then(u => {
        setProfile(u);
        setFollowing(!!(u.isFollowing || u.followed));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    setPage(1);
  }, [tab, username]);

  useEffect(() => {
    if (!profile) return;
    setLoadingThreads(true);
    const promise = tab === 'threads'
      ? api.getThreads(`?userId=${profile.id}&page=${page}&limit=${limit}`)
      : api.getBookmarks(`?page=${page}&limit=${limit}`).then(r => {
          const items = (r.items || []).map(b => b.thread || b).filter(Boolean);
          return { items, total: r.total ?? items.length };
        });
    promise
      .then(r => { setThreads(r.items || []); setTotal(r.total || 0); })
      .catch(() => { setThreads([]); setTotal(0); })
      .finally(() => setLoadingThreads(false));
  }, [profile, tab, page]);

  const toggleFollow = async () => {
    if (!currentUser) { toast('请先登录后再关注', 'info'); return; }
    if (!profile) return;
    setFollowPending(true);
    const prev = following;
    setFollowing(!prev);
    setProfile(p => p ? { ...p, followersCount: Math.max(0, (p.followersCount || 0) + (prev ? -1 : 1)) } : p);
    try {
      await api.follow(profile.id);
      toast(prev ? '已取消关注' : '关注成功', 'success');
    } catch (e) {
      setFollowing(prev);
      setProfile(p => p ? { ...p, followersCount: Math.max(0, (p.followersCount || 0) + (prev ? 1 : -1)) } : p);
      toast(e.message || '操作失败', 'error');
    } finally {
      setFollowPending(false);
    }
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto px-3 sm:px-5 py-6"><FullSpinner /></div>;
  }

  if (notFound || !profile) {
    return (
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-6">
        <EmptyState
          icon={UserX}
          title="找不到该用户"
          desc="此用户不存在或已注销账号。"
          action={
            <Link to="/" className="btn-primary px-5 py-2.5 rounded-xl inline-flex items-center gap-2">
              返回首页 <ChevronRight size={16} />
            </Link>
          }
        />
      </div>
    );
  }

  const isOwn = currentUser && currentUser.id === profile.id;
  const roleColor = getRoleColor(profile.role);
  const accent = profile.accentColor || roleColor;

  const stats = [
    { label: '声望', value: profile.reputation, icon: Trophy, color: '#f59e0b' },
    { label: '主题', value: profile.threadCount ?? 0, icon: FileText, color: '#6366f1' },
    { label: '回复', value: profile.postCount ?? 0, icon: MessageSquare, color: '#06b6d4' },
    { label: '关注者', value: profile.followersCount ?? 0, icon: Users, color: '#ec4899' },
    { label: '正在关注', value: profile.followingCount ?? 0, icon: Heart, color: '#ef4444' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-6">
        {/* Header */}
        <div className="card overflow-hidden mb-6">
          {/* Cover */}
          <div
            className="relative h-32 sm:h-40"
            style={{ background: `linear-gradient(120deg, ${accent}40, ${accent}14 50%, transparent), linear-gradient(135deg, #6366f133, #8b5cf622)` }}
          >
            <div className="absolute inset-0 bg-grid-pattern opacity-25" style={{ backgroundSize: '28px 28px' }} />
            <div className="absolute -bottom-16 left-5 sm:left-8">
              <Avatar user={profile} size={112} showStatus ring />
            </div>
          </div>

          {/* Body */}
          <div className="px-5 sm:px-8 pt-20 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-2xl sm:text-3xl font-extrabold">{profile.displayName || profile.username}</h1>
                  <span className="chip" style={{ background: `${roleColor}1a`, color: roleColor, borderColor: `${roleColor}40` }}>
                    <Shield size={12} /> {getRoleLabel(profile.role)}
                  </span>
                </div>
                <p className="text-muted text-sm mt-0.5">@{profile.username}</p>
                {profile.title && (
                  <p className="mt-2 text-sm font-medium" style={{ color: accent }}>{profile.title}</p>
                )}
                {profile.bio && (
                  <p className="text-sm mt-3 max-w-2xl leading-relaxed">{profile.bio}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-muted">
                  {profile.location && (
                    <span className="flex items-center gap-1"><MapPin size={13} /> {profile.location}</span>
                  )}
                  {profile.website && (
                    <a
                      href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 hover:text-brand-400 transition"
                    >
                      <LinkIcon size={13} /> {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                  {profile.createdAt && (
                    <span className="flex items-center gap-1"><Calendar size={13} /> 加入于 {formatTime(profile.createdAt)}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {isOwn ? (
                  <Link to="/settings" className="btn-primary px-5 py-2.5 rounded-xl inline-flex items-center gap-2 text-sm">
                    编辑资料 <ChevronRight size={16} />
                  </Link>
                ) : currentUser ? (
                  <button
                    onClick={toggleFollow}
                    disabled={followPending}
                    className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${following ? 'border hover:bg-surface-2' : 'btn-primary'}`}
                    style={following ? { borderColor: 'var(--border)' } : {}}
                  >
                    {following ? '已关注' : '关注'}
                  </button>
                ) : null}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-6">
              {stats.map(s => (
                <div key={s.label} className="rounded-xl p-3 bg-surface-2">
                  <div className="flex items-center gap-1.5 text-muted mb-1">
                    <s.icon size={13} style={{ color: s.color }} />
                    <span className="text-xs">{s.label}</span>
                  </div>
                  <p className="font-display text-xl font-bold">{formatNumber(s.value)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Badges */}
        {profile.badges && profile.badges.length > 0 && (
          <div className="card p-5 sm:p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg" style={{ background: '#f59e0b1a' }}><Award size={16} className="text-amber-400" /></div>
              <h2 className="font-display font-bold">徽章</h2>
              <span className="text-xs text-muted">· {profile.badges.length} 枚</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {profile.badges.map(b => {
                const tier = getTierColor(b.tier);
                return (
                  <div key={b.id} className="relative overflow-hidden rounded-xl p-3.5"
                    style={{ background: `${tier}14`, border: `1px solid ${tier}40` }}>
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-30" style={{ background: tier }} />
                    <div className="relative flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${tier}26`, color: tier }}>
                        <BadgeIcon icon={b.icon} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{b.name}</p>
                        <p className="text-[11px] text-muted">{TIER_LABEL[b.tier] || '徽章'}</p>
                      </div>
                    </div>
                    {b.description && <p className="relative text-xs text-muted mt-2 line-clamp-2">{b.description}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 glass rounded-xl p-1 mb-4 w-fit">
          <TabButton active={tab === 'threads'} onClick={() => setTab('threads')} icon={FileText} label="主题" />
          <TabButton active={tab === 'bookmarks'} onClick={() => setTab('bookmarks')} icon={Bookmark} label="收藏" />
        </div>

        {/* Tab content */}
        {loadingThreads ? (
          <FullSpinner />
        ) : threads.length === 0 ? (
          <EmptyState
            icon={tab === 'threads' ? FileText : Bookmark}
            title={tab === 'threads' ? '还没有发布主题' : '还没有收藏内容'}
            desc={tab === 'threads' ? '这个用户还没有发起任何讨论。' : '这个用户还没有收藏任何主题。'}
          />
        ) : (
          <div className="space-y-3">
            {threads.map((t, i) => <ThreadCard key={t.id} thread={t} index={i} />)}
          </div>
        )}

        <Pagination page={page} total={total} limit={limit} onChange={setPage} />
      </div>
    </motion.div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${active ? 'btn-primary' : 'hover:bg-surface-2 text-muted'}`}
    >
      <Icon size={15} /> {label}
    </button>
  );
}
