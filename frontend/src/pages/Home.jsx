import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Flame, Sparkles, ArrowRight, TrendingUp, Trophy, Zap } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ThreadCard from '../components/ui/ThreadCard.jsx';
import { FullSpinner, EmptyState } from '../components/ui/Loading.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { formatNumber } from '../lib/utils.js';

const SORTS = [
  { key: 'new', label: '最新', icon: Zap },
  { key: 'top', label: '热门', icon: Flame },
  { key: 'views', label: '最多阅读', icon: TrendingUp },
];

export default function Home() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [threads, setThreads] = useState([]);
  const [trending, setTrending] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState(searchParams.get('sort') || 'new');
  const [scope, setScope] = useState('all');

  useEffect(() => {
    const s = searchParams.get('sort');
    if (s) setFilter(s);
  }, [searchParams]);

  useEffect(() => {
    api.getTrending().then(r => setTrending(r.items || [])).catch(() => {});
    api.getLeaderboard().then(r => setLeaderboard(r.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    let params = `?page=${page}&limit=15&sort=${filter}`;
    if (scope === 'following' && user) params += '&following=true';
    api.getThreads(params).then(r => {
      setThreads(r.items || []);
      setTotal(r.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page, filter, scope, user]);

  const changeFilter = (f) => {
    setFilter(f);
    setPage(1);
    setSearchParams(f === 'new' ? {} : { sort: f });
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-5 py-6">
      {/* Hero */}
      {!user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl mb-8 p-8 sm:p-12"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.10), rgba(6,182,212,0.10))', border: '1px solid var(--border)' }}
        >
          <div className="absolute inset-0 bg-grid-pattern opacity-30" style={{ backgroundSize: '32px 32px' }} />
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
          <div className="relative">
            <div className="inline-flex items-center gap-2 chip mb-4" style={{ background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
              <Sparkles size={13} /> 全新社区体验
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold leading-tight mb-3">
              连接思想，<span className="gradient-text">激发灵感</span>
            </h1>
            <p className="text-muted text-base sm:text-lg max-w-xl mb-6">
              YS 论坛 —— 融合深度讨论与即时互动的新一代社区。实时聊天、丰富反应、声望体系，让每一次交流都有温度。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary px-6 py-3 rounded-xl flex items-center gap-2 font-semibold">
                立即加入 <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="px-6 py-3 rounded-xl font-semibold hover:bg-surface-2 transition border" style={{ borderColor: 'var(--border)' }}>
                登录账号
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex gap-6">
        {/* Main feed */}
        <div className="flex-1 min-w-0">
          {/* Filter bar */}
          <div className="flex items-center justify-between mb-4 sticky top-16 z-20 py-3 -mx-3 px-3 backdrop-blur-md">
            <div className="flex items-center gap-1 glass rounded-xl p-1">
              {SORTS.map(s => (
                <button key={s.key} onClick={() => changeFilter(s.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === s.key ? 'btn-primary' : 'hover:bg-surface-2 text-muted'}`}>
                  <s.icon size={15} /> <span className="hidden sm:inline">{s.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 glass rounded-xl p-1">
              <button onClick={() => { setScope('all'); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${scope === 'all' ? 'bg-surface-2 text-current' : 'text-muted hover:text-current'}`}>
                全部
              </button>
              {user && (
                <button onClick={() => { setScope('following'); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${scope === 'following' ? 'bg-surface-2 text-current' : 'text-muted hover:text-current'}`}>
                  关注
                </button>
              )}
            </div>
          </div>

          {user && (
            <Link to="/new" className="card surface-hover p-4 mb-3 flex items-center gap-3 group">
              <Avatar user={user} size={40} />
              <div className="flex-1 input-field rounded-full text-muted">分享你的想法…</div>
              <div className="btn-primary p-2.5 rounded-full"><Plus size={18} /></div>
            </Link>
          )}

          {loading ? <FullSpinner /> : threads.length === 0 ? (
            <EmptyState icon={Sparkles} title="还没有内容" desc={scope === 'following' ? '关注一些用户来看到他们的动态' : '成为第一个发帖的人吧！'}
              action={user ? <Link to="/new" className="btn-primary px-5 py-2.5 rounded-xl inline-flex items-center gap-2"><Plus size={18} /> 发布主题</Link> : null} />
          ) : (
            <div className="space-y-3">
              {threads.map((t, i) => <ThreadCard key={t.id} thread={t} index={i} />)}
            </div>
          )}

          <Pagination page={page} total={total} limit={15} onChange={setPage} />
        </div>

        {/* Right sidebar */}
        <div className="hidden xl:block w-80 shrink-0">
          <div className="sticky top-20 space-y-4">
            {/* Trending */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg" style={{ background: '#ef44441a' }}><Flame size={16} className="text-red-400" /></div>
                <h3 className="font-display font-bold">本周热门</h3>
              </div>
              <div className="space-y-2.5">
                {trending.slice(0, 5).map((t, i) => (
                  <Link key={t.id} to={`/thread/${t.id}`} className="flex gap-3 group">
                    <span className="font-display text-2xl font-bold text-muted/30 group-hover:text-brand-400 transition shrink-0 w-7">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm leading-snug group-hover:text-brand-400 transition line-clamp-2">{t.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted mt-1">
                        <span>{t.author?.displayName}</span>
                        <span className="flex items-center gap-0.5"><Flame size={11} /> {formatNumber(t.reactionCount)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
                {trending.length === 0 && <p className="text-sm text-muted">暂无热门内容</p>}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg" style={{ background: '#f59e0b1a' }}><Trophy size={16} className="text-amber-400" /></div>
                <h3 className="font-display font-bold">声望榜</h3>
              </div>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((u, i) => (
                  <Link key={u.id} to={`/u/${u.username}`} className="flex items-center gap-3 group p-1.5 rounded-lg hover:bg-surface-2 transition">
                    <span className="font-display text-sm font-bold w-5 text-center" style={{ color: ['#f59e0b', '#9aa3bd', '#cd7f32'][i] || 'var(--text-muted)' }}>{i + 1}</span>
                    <Avatar user={u} size={32} showStatus />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-brand-400 transition">{u.displayName || u.username}</p>
                      <p className="text-xs text-muted">{formatNumber(u.reputation)} 声望</p>
                    </div>
                  </Link>
                ))}
              </div>
              <Link to="/leaderboard" className="block text-center text-sm text-brand-400 hover:underline mt-3">查看完整榜单</Link>
            </div>

            {/* Quick stats */}
            <div className="card p-4 relative overflow-hidden">
              <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-20" style={{ background: '#6366f1' }} />
              <h3 className="font-display font-bold mb-3 relative">社区数据</h3>
              <div className="grid grid-cols-2 gap-3 relative">
                <Stat label="在线用户" value={leaderboard.length} color="#10b981" />
                <Stat label="今日活跃" value="—" color="#6366f1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="p-3 rounded-xl bg-surface-2">
      <p className="text-2xl font-bold font-display" style={{ color }}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
