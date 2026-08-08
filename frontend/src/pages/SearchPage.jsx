import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Hash, MessageSquare, Users, SearchX, ArrowRight, UserPlus, Check } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import ThreadCard from '../components/ui/ThreadCard.jsx';
import { FullSpinner, EmptyState } from '../components/ui/Loading.jsx';
import { formatNumber, getRoleColor, getRoleLabel } from '../lib/utils.js';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [input, setInput] = useState(q);
  const [results, setResults] = useState({ threads: [], users: [], tags: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [followed, setFollowed] = useState({});

  useEffect(() => { setInput(q); }, [q]);

  useEffect(() => {
    if (!q.trim()) {
      setResults({ threads: [], users: [], tags: [] });
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    api.search(q)
      .then(r => {
        const res = r.items || r;
        const users = res.users || [];
        setResults({
          threads: res.threads || [],
          users,
          tags: res.tags || [],
        });
        const fm = {};
        users.forEach(u => { if (u.isFollowing || u.followed) fm[u.id] = true; });
        setFollowed(fm);
      })
      .catch(() => { setResults({ threads: [], users: [], tags: [] }); })
      .finally(() => setLoading(false));
  }, [q]);

  const submit = (e) => {
    e.preventDefault();
    const val = input.trim();
    if (!val) return;
    setSearchParams({ q: val });
  };

  const toggleFollow = async (u) => {
    if (!currentUser) { toast('请先登录后再关注', 'info'); return; }
    const prev = !!followed[u.id];
    setFollowed(f => ({ ...f, [u.id]: !prev }));
    try {
      await api.follow(u.id);
      toast(prev ? '已取消关注' : '关注成功', 'success');
    } catch (e) {
      setFollowed(f => ({ ...f, [u.id]: prev }));
      toast(e.message || '操作失败', 'error');
    }
  };

  const { threads, users, tags } = results;
  const total = threads.length + users.length + tags.length;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-6">
        {/* Search input */}
        <form onSubmit={submit} className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            className="input-field pl-11 pr-28 py-3.5 text-base"
            placeholder="搜索主题、用户或标签…"
            value={input}
            onChange={e => setInput(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg text-sm">
            搜索
          </button>
        </form>

        {q && (
          <p className="text-sm text-muted mb-5">
            搜索 <span className="text-current font-semibold">"{q}"</span>
            {searched && !loading && ` · 共 ${total} 条结果`}
          </p>
        )}

        {!q.trim() ? (
          <EmptyState icon={Search} title="搜索整个社区" desc="输入关键词，查找你感兴趣的主题、用户和标签。" />
        ) : loading ? (
          <FullSpinner />
        ) : total === 0 ? (
          <EmptyState icon={SearchX} title={`没有找到与 "${q}" 相关的内容`} desc="试试换个关键词，或检查拼写。" />
        ) : (
          <div className="space-y-8">
            {/* Threads */}
            {threads.length > 0 && (
              <section>
                <SectionHeader icon={MessageSquare} title="主题" count={threads.length} color="#6366f1" />
                <div className="space-y-3">
                  {threads.map((t, i) => <ThreadCard key={t.id} thread={t} index={i} />)}
                </div>
              </section>
            )}

            {/* Users */}
            {users.length > 0 && (
              <section>
                <SectionHeader icon={Users} title="用户" count={users.length} color="#ec4899" />
                <div className="grid sm:grid-cols-2 gap-3">
                  {users.map(u => {
                    const roleColor = getRoleColor(u.role);
                    const isFollowing = !!followed[u.id];
                    const isOwn = currentUser && currentUser.id === u.id;
                    return (
                      <div key={u.id} className="card surface-hover p-3.5 flex items-center gap-3 group">
                        <Link to={`/u/${u.username}`}><Avatar user={u} size={44} showStatus /></Link>
                        <Link to={`/u/${u.username}`} className="flex-1 min-w-0">
                          <p className="font-medium truncate group-hover:text-brand-400 transition">{u.displayName || u.username}</p>
                          <p className="text-xs text-muted truncate">@{u.username}</p>
                          {u.role && (
                            <span className="inline-block text-[11px] mt-0.5" style={{ color: roleColor }}>{getRoleLabel(u.role)}</span>
                          )}
                        </Link>
                        {isOwn ? (
                          <span className="chip text-xs shrink-0">你自己</span>
                        ) : currentUser ? (
                          <button
                            onClick={() => toggleFollow(u)}
                            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${isFollowing ? 'border hover:bg-surface-2' : 'btn-primary'}`}
                            style={isFollowing ? { borderColor: 'var(--border)' } : {}}
                          >
                            {isFollowing ? <Check size={13} /> : <UserPlus size={13} />}
                            {isFollowing ? '已关注' : '关注'}
                          </button>
                        ) : (
                          <Link to={`/u/${u.username}`} className="chip text-xs shrink-0 hover:text-brand-400 transition">查看</Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <section>
                <SectionHeader icon={Hash} title="标签" count={tags.length} color="#06b6d4" />
                <div className="flex flex-wrap gap-2.5">
                  {tags.map(t => {
                    const color = t.color || '#06b6d4';
                    const count = t.usageCount ?? t.usage_count ?? t.threadCount ?? 0;
                    return (
                      <Link
                        key={t.id}
                        to={`/tag/${t.slug}`}
                        className="group card surface-hover px-4 py-3 flex items-center gap-2.5"
                        style={{ borderColor: `${color}40` }}
                      >
                        <span
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ background: `${color}1a`, color }}
                        >#</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium group-hover:text-brand-400 transition truncate">{t.name}</p>
                          <p className="text-[11px] text-muted">{formatNumber(count)} 个主题</p>
                        </div>
                        <ArrowRight size={15} className="text-muted group-hover:text-brand-400 group-hover:translate-x-0.5 transition ml-1 shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SectionHeader({ icon: Icon, title, count, color }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="p-1.5 rounded-lg" style={{ background: `${color}1a` }}><Icon size={16} style={{ color }} /></div>
      <h2 className="font-display font-bold text-lg">{title}</h2>
      <span className="text-xs text-muted">· {count}</span>
    </div>
  );
}
