import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, MessageCircle, Flame, Pin, Lock, CheckCircle2, Star, Bookmark } from 'lucide-react';
import Avatar from './Avatar.jsx';
import { formatTime, formatNumber, getThreadTypeMeta } from '../../lib/utils.js';

export default function ThreadCard({ thread, index = 0 }) {
  const meta = getThreadTypeMeta(thread.type);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
    >
      <Link to={`/thread/${thread.id}`} className="block card surface-hover p-4 sm:p-5 group">
        <div className="flex gap-3 sm:gap-4">
          <Avatar user={thread.author} size={44} showStatus />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="chip" style={{ background: `${meta.color}1a`, color: meta.color, borderColor: `${meta.color}33` }}>
                {meta.label}
              </span>
              {thread.pinned && <span className="chip" style={{ background: '#f59e0b1a', color: '#f59e0b', borderColor: '#f59e0b33' }}><Pin size={11} /> 置顶</span>}
              {thread.featured && <span className="chip" style={{ background: '#ec48991a', color: '#ec4899', borderColor: '#ec489933' }}><Star size={11} /> 精华</span>}
              {thread.locked && <span className="chip" style={{ background: '#6b75911a', color: '#9aa3bd' }}><Lock size={11} /> 锁定</span>}
              {thread.solved && <span className="chip" style={{ background: '#10b9811a', color: '#10b981', borderColor: '#10b98133' }}><CheckCircle2 size={11} /> 已解决</span>}
              <span className="text-xs text-muted">{formatTime(thread.createdAt)}</span>
            </div>

            <h3 className="font-semibold font-display text-base sm:text-lg leading-snug group-hover:text-brand-400 transition mb-1 line-clamp-2">
              {thread.title}
            </h3>
            <p className="text-sm text-muted line-clamp-2 mb-2.5">{thread.excerpt}</p>

            {thread.tags && thread.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {thread.tags.slice(0, 4).map(tag => (
                  <Link key={tag.id} to={`/tag/${tag.slug}`} onClick={e => e.stopPropagation()}
                    className="chip hover:scale-105 transition" style={{ color: tag.color, borderColor: `${tag.color}40` }}>
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-muted">
              <span className="font-medium" style={{ color: thread.author.role === 'admin' ? '#ef4444' : thread.author.role === 'moderator' ? '#f59e0b' : 'var(--text-muted)' }}>
                {thread.author.displayName || thread.author.username}
              </span>
              <span className="flex items-center gap-1"><Eye size={13} /> {formatNumber(thread.views)}</span>
              <span className="flex items-center gap-1"><MessageCircle size={13} /> {formatNumber(thread.postCount)}</span>
              <span className="flex items-center gap-1"><Flame size={13} /> {formatNumber(thread.reactionCount)}</span>
              {thread.bookmarked && <Bookmark size={13} className="text-brand-400 fill-brand-400" />}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
