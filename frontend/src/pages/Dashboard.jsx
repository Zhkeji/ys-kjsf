import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, FileText, MessageSquare, Trophy, Award, Bookmark,
  Settings, ChevronRight, Sparkles, Plus, ArrowUpRight, PenSquare, Flame,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import ThreadCard from '../components/ui/ThreadCard.jsx';
import { FullSpinner, EmptyState } from '../components/ui/Loading.jsx';
import {
  formatNumber, formatTime, getRoleColor, getRoleLabel, getTierColor,
} from '../lib/utils.js';

const TIER_LABEL = { bronze: '铜牌', silver: '银牌', gold: '金牌', platinum: '白金' };

function BadgeGlyph({ icon }) {
  if (icon && [...icon].length <= 2) return <span className="text-lg leading-none">{icon}</span>;
  return <Award size={18} />;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [me, setMe] = useState(null);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingThreads, setLoadingThreads] = useState(true);

  useEffect(() => {
    api.me()
      .then(u => setMe(u))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    api.getThreads(`?userId=${user.id}&limit=5`)
      .then(r => setThreads(r.items || []))
      .catch(() => {})
      .finally(() => setLoadingThreads(false));
  }, [user]);

  if (loading) {
    return <div className="max-w-5xl mx-auto px-3 sm:px-5 py-6"><FullSpinner /></div>;
  }

  const data = me || user || {};
  const roleColor = getRoleColor(data.role);
  const badges = data.badges || [];

  const stats = [
    { label: '声望', value: data.reputation || 0, icon: Trophy, color: '#f59e0b', to: `/u/${data.username}` },
    { label: '主题', value: data.threadCount ?? 0, icon: FileText, color: '#6366f1', to: `/u/${data.username}` },
    { label: '回复', value: data.postCount ?? 0, icon: MessageSquare, color: '#06b6d4', to: `/u/${data.username}` },
    { label: '徽章', value: badges.length, icon: Award, color: '#ec4899', to: `/u/${data.username}` },
  ];

  const quickLinks = [
    { label: '我的收藏', desc: '查看收藏的主题', icon: Bookmark, to: '/bookmarks', color: '#6366f1' },
    { label: '账户设置', desc: '编辑资料与安全', icon: Settings, to: '/settings', color: '#8b5cf6' },
    { label: '个人主页', desc: '查看公开资料', icon: ArrowUpRight, to: `/u/${data.username}`, color: '#06b6d4' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-6">
        {/* Welcome header */}
        <div className="relative overflow-hidden card p-6 sm:p-8 mb-6">
          <div className="absolute inset-0 bg-grid-pattern opacity-20" style={{ backgroundSize: '32px 32px' }} />
          <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full blur-3xl opacity-25" style={{ background: `radial-gradient(circle, ${roleColor}, transparent)` }} />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            <Avatar user={data} size={84} showStatus ring />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold">
                  {data.displayName || data.username}
                </h1>
                <span className="chip" style={{ background: `${roleColor}1a`, color: roleColor, borderColor: `${roleColor}40` }}>
                  {getRoleLabel(data.role)}
                </span>
              </div>
              <p className="text-muted text-sm mt-1">
                {data.signature || data.bio || '欢迎回到你的控制台，继续保持活跃吧 ✨'}
              </p>
            </div>
            <Link to="/new" className="btn-primary px-5 py-2.5 rounded-xl inline-flex items-center gap-2 text-sm shrink-0">
              <PenSquare size={16} /> 发布主题
            </Link>
          </div>
          <div className="relative flex items-center gap-2 mt-4 text-xs text-muted">
            <Sparkles size={13} className="text-brand-400" />
            上次活跃 {data.lastSeen ? formatTime(data.lastSeen) : '刚刚'}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link to={s.to} className="card surface-hover p-4 block relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-20" style={{ background: s.color }} />
                <div className="relative flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg" style={{ background: `${s.color}1a` }}>
                    <s.icon size={16} style={{ color: s.color }} />
                  </div>
                </div>
                <p className="font-display text-2xl sm:text-3xl font-extrabold relative">{formatNumber(s.value)}</p>
                <p className="text-xs text-muted relative">{s.label}</p>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent threads */}
          <div className="lg:col-span-2">
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-default">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-brand-400" />
                  <h2 className="font-display font-bold">最近主题</h2>
                </div>
                <Link to={`/u/${data.username}`} className="text-xs text-brand-400 hover:underline inline-flex items-center gap-0.5">
                  查看全部 <ChevronRight size={12} />
                </Link>
              </div>
              <div className="p-3">
                {loadingThreads ? (
                  <FullSpinner />
                ) : threads.length === 0 ? (
                  <EmptyState icon={FileText} title="还没有发布主题" desc="分享你的第一个想法，开启社区之旅。" action={
                    <Link to="/new" className="btn-primary px-4 py-2 rounded-xl inline-flex items-center gap-2 text-sm">
                      <Plus size={16} /> 发布主题
                    </Link>
                  } />
                ) : (
                  <div className="space-y-2">
                    {threads.map((t, i) => <ThreadCard key={t.id} thread={t} index={i} />)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick links */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <LayoutDashboard size={16} className="text-brand-400" />
                <h3 className="font-display font-bold">快捷入口</h3>
              </div>
              <div className="space-y-2">
                {quickLinks.map(l => (
                  <Link key={l.label} to={l.to} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-2 transition group">
                    <div className="p-1.5 rounded-lg shrink-0" style={{ background: `${l.color}1a` }}>
                      <l.icon size={15} style={{ color: l.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium group-hover:text-brand-400 transition">{l.label}</p>
                      <p className="text-xs text-muted">{l.desc}</p>
                    </div>
                    <ChevronRight size={15} className="text-muted group-hover:text-brand-400 transition shrink-0" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Badges */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg" style={{ background: '#f59e0b1a' }}><Award size={15} className="text-amber-400" /></div>
                  <h3 className="font-display font-bold">我的徽章</h3>
                </div>
                <span className="text-xs text-muted">{badges.length} 枚</span>
              </div>
              {badges.length === 0 ? (
                <div className="text-center py-6">
                  <Award size={28} className="text-muted mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-muted">还没有获得徽章</p>
                  <p className="text-xs text-muted mt-0.5">多参与社区互动即可解锁</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {badges.map(b => {
                    const tier = getTierColor(b.tier);
                    return (
                      <div key={b.id} className="relative overflow-hidden rounded-xl p-2.5" style={{ background: `${tier}12`, border: `1px solid ${tier}40` }}>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${tier}26`, color: tier }}>
                            <BadgeGlyph icon={b.icon} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{b.name}</p>
                            <p className="text-[10px] text-muted">{TIER_LABEL[b.tier] || '徽章'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
