import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { getReactionEmoji, getReactionLabel } from '../../lib/utils.js';

const REACTIONS = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'fire', 'brain'];

export default function ReactionBar({ targetType, targetId, reactions = [], userReaction, onReact, size = 'md' }) {
  const { user } = useAuth();
  const toast = useToast();
  const [showPicker, setShowPicker] = useState(false);
  const [localReactions, setLocalReactions] = useState(reactions);
  const [localUserReaction, setLocalUserReaction] = useState(userReaction);

  const total = localReactions.reduce((s, r) => s + r.count, 0);

  const handleReact = async (type) => {
    if (!user) { toast('请先登录', 'error'); return; }
    setShowPicker(false);
    try {
      const res = await api.react({ targetType, targetId, type });
      setLocalReactions(res.reactions);
      setLocalUserReaction(res.userReaction);
      onReact?.(res);
    } catch (e) { toast(e.message, 'error'); }
  };

  const topReactions = localReactions.filter(r => r.count > 0).slice(0, 3);

  return (
    <div className="relative flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {topReactions.map(r => (
          <button
            key={r.type}
            onClick={() => handleReact(r.type)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-surface-2 transition text-sm"
            title={getReactionLabel(r.type)}
          >
            <span className="text-base leading-none">{getReactionEmoji(r.type)}</span>
            <span className="text-xs font-medium text-muted">{r.count}</span>
          </button>
        ))}
        {total === 0 && (
          <span className="text-xs text-muted px-1">还没有反应</span>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => user ? setShowPicker(s => !s) : toast('请先登录', 'error')}
          className={`p-1.5 rounded-lg transition ${localUserReaction ? 'bg-brand-500/15 text-brand-400' : 'hover:bg-surface-2 text-muted'}`}
          title="添加反应"
        >
          <span className="text-base leading-none">{localUserReaction ? getReactionEmoji(localUserReaction) : '＋'}</span>
        </button>
        <AnimatePresence>
          {showPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowPicker(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="absolute z-50 bottom-full mb-2 left-0 glass-strong rounded-2xl p-1.5 flex gap-0.5 shadow-2xl border"
                style={{ borderColor: 'var(--border)' }}
              >
                {REACTIONS.map((type, i) => (
                  <motion.button
                    key={type}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                    whileHover={{ scale: 1.3, y: -4 }}
                    onClick={() => handleReact(type)}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl text-xl transition ${localUserReaction === type ? 'bg-brand-500/20' : 'hover:bg-surface-2'}`}
                    title={getReactionLabel(type)}
                  >
                    {getReactionEmoji(type)}
                  </motion.button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
