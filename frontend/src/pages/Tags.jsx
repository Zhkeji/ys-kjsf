import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Hash, ArrowLeft, MessageSquare, ChevronRight, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import ThreadCard from '../components/ui/ThreadCard.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { FullSpinner, EmptyState } from '../components/ui/Loading.jsx';
import { formatNumber } from '../lib/utils.js';

export default function Tags() {
  const { slug } = useParams();
  if (slug) return <TagDetail slug={slug} />;
  return <TagList />;
}

function TagList() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getTags()
      .then(r => setTags(r.items || []))
      .catch(() => setTags([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-6">
        {/* Header */}
        <div
          className="relative overflow-hidden rounded-3xl mb-6 p-7 sm:p-9"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.10), rgba(6,182,212,0.10))', border: '1px solid var(--border)' }}
        >
          <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
          <div className="absolute inset-0 bg-grid-pattern opacity-25" style={{ backgroundSize: '32px 32px' }} />
          <div className="relative">
            <div className="inline-flex items-center gap-2 chip mb-3" style={{ background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
              <Sparkles size={13} /> 探索话题
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold mb-2">
              全部<span className="gradient-text">标签</span>
            </h1>
            <p className="text-muted text-sm sm:text-base max-w-xl">通过标签发现你感兴趣的话题，找到同好与精彩讨论。</p>
          </div>
        </div>

        {loading ? (
          <FullSpinner />
        ) : tags.length === 0 ? (
          <EmptyState icon={Hash} title="还没有标签" desc="当社区产生足够内容后，标签会在此展示。" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {tags.map((t, i) => {
              const color = t.color || '#6366f1';
              const count = t.usageCount ?? t.usage_count ?? t.threadCount ?? 0;
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.4) }}
                >
                  <Link
                    to={`/tag/${t.slug}`}
                    className="group block card surface-hover p-4 h-full relative overflow-hidden"
                    style={{ borderColor: `${color}33` }}
                  >
                    <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition" style={{ background: color }} />
                    <div className="relative flex items-center gap-2.5 mb-2.5">
                      <span
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
                        style={{ background: `${color}1f`, color, border: `1px solid ${color}40` }}
                      >#</span>
                      <div className="min-w-0">
                        <p className="font-semibold font-display truncate group-hover:text-brand-400 transition">{t.name}</p>
                        <p className="text-[11px] text-muted flex items-center gap-1"><MessageSquare size={11} /> {formatNumber(count)} 主题</p>
                      </div>
                    </div>
                    {t.description && <p className="relative text-xs text-muted line-clamp-2">{t.description}</p>}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TagDetail({ slug }) {
  const [tag, setTag] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loadingTag, setLoadingTag] = useState(true);
  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  useEffect(() => {
    setLoadingTag(true);
    setNotFound(false);
    setTag(null);
    setPage(1);
    api.getTag(slug)
      .then(t => setTag(t))
      .catch(() => setNotFound(true))
      .finally(() => setLoadingTag(false));
  }, [slug]);

  useEffect(() => {
    setLoadingThreads(true);
    api.getThreads(`?tag=${slug}&page=${page}&limit=${limit}`)
      .then(r => { setThreads(r.items || []); setTotal(r.total || 0); })
      .catch(() => { setThreads([]); setTotal(0); })
      .finally(() => setLoadingThreads(false));
  }, [slug, page]);

  if (loadingTag) {
    return <div className="max-w-5xl mx-auto px-3 sm:px-5 py-6"><FullSpinner /></div>;
  }

  if (notFound || !tag) {
    return (
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-6">
        <EmptyState
          icon={Hash}
          title="找不到这个标签"
          desc="它可能已被移除或链接有误。"
          action={
            <Link to="/tags" className="btn-primary px-5 py-2.5 rounded-xl inline-flex items-center gap-2">
              查看全部标签 <ChevronRight size={16} />
            </Link>
          }
        />
      </div>
    );
  }

  const color = tag.color || '#6366f1';
  const count = tag.usageCount ?? tag.usage_count ?? tag.threadCount ?? total;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted mb-4">
          <Link to="/tags" className="flex items-center gap-1 hover:text-brand-400 transition"><ArrowLeft size={14} /> 标签</Link>
          <ChevronRight size={14} />
          <span className="text-current font-medium">#{tag.name}</span>
        </div>

        {/* Header */}
        <div
          className="relative overflow-hidden rounded-3xl mb-6 p-7 sm:p-9"
          style={{ background: `linear-gradient(135deg, ${color}26, ${color}0d 60%, transparent)`, border: `1px solid ${color}40` }}
        >
          <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full blur-3xl opacity-30" style={{ background: `radial-gradient(circle, ${color}, transparent)` }} />
          <div className="absolute inset-0 bg-grid-pattern opacity-20" style={{ backgroundSize: '32px 32px' }} />
          <div className="relative flex items-center gap-4">
            <span
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl font-bold shrink-0"
              style={{ background: `${color}1f`, color, border: `1px solid ${color}40`, boxShadow: `0 8px 30px -8px ${color}80` }}
            >#</span>
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold leading-tight">{tag.name}</h1>
              {tag.description && <p className="text-muted text-sm mt-2 max-w-2xl">{tag.description}</p>}
              <span className="chip mt-3" style={{ background: `${color}1a`, color, borderColor: `${color}40` }}>
                <MessageSquare size={12} /> {formatNumber(count)} 个主题
              </span>
            </div>
          </div>
        </div>

        {/* Threads */}
        {loadingThreads ? (
          <FullSpinner />
        ) : threads.length === 0 ? (
          <EmptyState icon={MessageSquare} title="这个标签下还没有主题" desc="成为第一个为这个标签贡献内容的人吧！" />
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
