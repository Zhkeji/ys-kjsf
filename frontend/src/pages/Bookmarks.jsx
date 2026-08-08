import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bookmark, BookmarkX, ChevronRight } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ThreadCard from '../components/ui/ThreadCard.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { FullSpinner, EmptyState } from '../components/ui/Loading.jsx';
import { formatNumber } from '../lib/utils.js';

export default function Bookmarks() {
  const { user } = useAuth();
  const toast = useToast();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  const load = (p) => {
    setLoading(true);
    api.getBookmarks(`?page=${p}&limit=${limit}`)
      .then(r => {
        setBookmarks(r.items || []);
        setTotal(r.total || 0);
      })
      .catch(e => toast(e.message || '加载收藏失败', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [page]);

  const remove = async (threadId) => {
    const prev = bookmarks;
    setBookmarks(bs => bs.filter(b => (b.thread || b).id !== threadId));
    setTotal(t => Math.max(0, t - 1));
    try {
      await api.toggleBookmark(threadId);
      toast('已移出收藏', 'success');
    } catch (e) {
      setBookmarks(prev);
      setTotal(t => t + 1);
      toast(e.message || '操作失败', 'error');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-6">
        {/* Header */}
        <div className="relative overflow-hidden card p-6 sm:p-8 mb-6">
          <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full blur-3xl opacity-25" style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
          <div className="absolute inset-0 bg-grid-pattern opacity-20" style={{ backgroundSize: '30px 30px' }} />
          <div className="relative flex items-center gap-4">
            <div className="p-3 rounded-2xl shrink-0" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.18))', border: '1px solid rgba(99,102,241,0.3)' }}>
              <Bookmark size={26} className="text-brand-400" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold">
                我的<span className="gradient-text">收藏</span>
              </h1>
              <p className="text-muted text-sm mt-1">
                共 {formatNumber(total)} 个收藏的主题，随时回看精彩内容。
              </p>
            </div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <FullSpinner />
        ) : bookmarks.length === 0 ? (
          <EmptyState
            icon={BookmarkX}
            title="还没有收藏内容"
            desc="浏览社区时遇到喜欢的主题，点击收藏即可在这里找到。"
            action={
              <Link to="/" className="btn-primary px-5 py-2.5 rounded-xl inline-flex items-center gap-2">
                去逛逛 <ChevronRight size={16} />
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {bookmarks.map((b, i) => {
              const thread = b.thread || b;
              return (
                <div key={thread.id || b.id} className="relative group">
                  <ThreadCard thread={thread} index={i} />
                  <button
                    onClick={() => remove(thread.id)}
                    title="移出收藏"
                    className="absolute top-3 right-3 p-2 rounded-lg bg-surface-2/80 backdrop-blur border border-default opacity-0 group-hover:opacity-100 hover:bg-red-500/15 hover:text-red-400 transition z-10"
                  >
                    <BookmarkX size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <Pagination page={page} total={total} limit={limit} onChange={setPage} />
      </div>
    </motion.div>
  );
}
