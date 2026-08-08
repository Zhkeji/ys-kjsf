import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Zap, TrendingUp, MessageSquare, Compass, ChevronRight } from 'lucide-react';
import { api } from '../lib/api.js';
import ThreadCard from '../components/ui/ThreadCard.jsx';
import { FullSpinner, EmptyState } from '../components/ui/Loading.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { formatNumber } from '../lib/utils.js';

const SORTS = [
  { key: 'new', label: '最新', icon: Zap },
  { key: 'top', label: '热门', icon: Flame },
  { key: 'views', label: '最多阅读', icon: TrendingUp },
];

// Keep glyph rendering consistent with the Sidebar mapping.
const GLYPHS = {
  'code-2': '⌘',
  'brain-circuit': '◈',
  'palette': '◑',
  'gamepad-2': '▣',
  'coffee': '◉',
  'megaphone': '◆',
};

function CategoryGlyph({ icon, color, size = 30 }) {
  return (
    <span style={{ color, fontSize: size }} className="leading-none font-display">
      {GLYPHS[icon] || '◇'}
    </span>
  );
}

export default function CategoryPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loadingCat, setLoadingCat] = useState(true);
  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState(searchParams.get('sort') || 'new');
  const limit = 15;

  useEffect(() => {
    setLoadingCat(true);
    setNotFound(false);
    setCategory(null);
    setPage(1);
    api.getCategory(slug)
      .then(c => setCategory(c))
      .catch(() => setNotFound(true))
      .finally(() => setLoadingCat(false));
  }, [slug]);

  useEffect(() => {
    if (!category) return;
    setLoadingThreads(true);
    api.getThreads(`?category=${category.id}&page=${page}&limit=${limit}&sort=${sort}`)
      .then(r => { setThreads(r.items || []); setTotal(r.total || 0); })
      .catch(() => { setThreads([]); setTotal(0); })
      .finally(() => setLoadingThreads(false));
  }, [category, page, sort]);

  const changeSort = (s) => {
    setSort(s);
    setPage(1);
    setSearchParams(s === 'new' ? {} : { sort: s });
  };

  if (loadingCat) {
    return (
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-6">
        <FullSpinner />
      </div>
    );
  }

  if (notFound || !category) {
    return (
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-6">
        <EmptyState
          icon={Compass}
          title="找不到这个版块"
          desc="它可能已被移除或链接有误。"
          action={
            <Link to="/" className="btn-primary px-5 py-2.5 rounded-xl inline-flex items-center gap-2">
              返回首页 <ChevronRight size={16} />
            </Link>
          }
        />
      </div>
    );
  }

  const color = category.color || '#6366f1';
  const threadCount = category.threadCount ?? total;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted mb-4">
          <Link to="/" className="hover:text-brand-400 transition">首页</Link>
          <ChevronRight size={14} />
          <span className="text-current font-medium">{category.name}</span>
        </div>

        {/* Header banner */}
        <div
          className="relative overflow-hidden rounded-3xl mb-6 p-7 sm:p-9"
          style={{ background: `linear-gradient(135deg, ${color}26, ${color}0d 60%, transparent)`, border: `1px solid ${color}40` }}
        >
          <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full blur-3xl opacity-30" style={{ background: `radial-gradient(circle, ${color}, transparent)` }} />
          <div className="absolute inset-0 bg-grid-pattern opacity-20" style={{ backgroundSize: '32px 32px' }} />
          <div className="relative flex items-start gap-5">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: `${color}1f`, border: `1px solid ${color}40`, boxShadow: `0 8px 30px -8px ${color}80` }}
            >
              <CategoryGlyph icon={category.icon} color={color} size={36} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold leading-tight">{category.name}</h1>
              {category.description && (
                <p className="text-muted text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">{category.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2.5 mt-4">
                <span className="chip" style={{ background: `${color}1a`, color, borderColor: `${color}40` }}>
                  <MessageSquare size={12} /> {formatNumber(threadCount)} 个主题
                </span>
                {category.postCount != null && (
                  <span className="chip"><MessageSquare size={12} /> {formatNumber(category.postCount)} 条回复</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between mb-4 sticky top-16 z-20 py-2 -mx-3 px-3 backdrop-blur-md">
          <div className="flex items-center gap-1 glass rounded-xl p-1">
            {SORTS.map(s => (
              <button key={s.key} onClick={() => changeSort(s.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${sort === s.key ? 'btn-primary' : 'hover:bg-surface-2 text-muted'}`}>
                <s.icon size={15} /> <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Threads */}
        {loadingThreads ? (
          <FullSpinner />
        ) : threads.length === 0 ? (
          <EmptyState icon={MessageSquare} title="这个版块还没有主题" desc="成为第一个在这里发起讨论的人吧！" />
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
