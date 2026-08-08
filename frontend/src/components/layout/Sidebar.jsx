import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Layers, Hash, Calendar, Trophy, MessageSquare, X, Flame,
  Users, TrendingUp, Bookmark, ChevronRight, Wifi
} from 'lucide-react';
import { api } from '../../lib/api.js';

const NAV = [
  { icon: Home, label: '首页', to: '/' },
  { icon: TrendingUp, label: '热门', to: '/?sort=top' },
  { icon: Hash, label: '标签', to: '/tags' },
  { icon: Calendar, label: '活动', to: '/events' },
  { icon: Trophy, label: '排行榜', to: '/leaderboard' },
  { icon: MessageSquare, label: '聊天室', to: '/chat' },
];

export default function Sidebar({ open, onClose }) {
  const [categories, setCategories] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    api.getCategories().then(r => setCategories(r.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    api.getOnline().then(r => setOnlineCount((r.items || []).length)).catch(() => {});
    const id = setInterval(() => {
      api.getOnline().then(r => setOnlineCount((r.items || []).length)).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to.split('?')[0]);
  };

  const content = (
    <div className="flex flex-col h-full">
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-1">
        {NAV.map((item, i) => {
          const active = isActive(item.to);
          return (
            <Link key={i} to={item.to}>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition group ${active ? 'bg-brand-500/15 text-brand-400' : 'hover:bg-surface-2 text-muted hover:text-current'}`}>
                <item.icon size={19} className={active ? '' : 'group-hover:text-brand-400 transition'} />
                <span className="text-sm font-medium">{item.label}</span>
                {active && <motion.div layoutId="sidebar-active" className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400" />}
              </div>
            </Link>
          );
        })}

        <div className="pt-5 pb-2 px-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">版块</span>
          <Link to="/tags" className="text-xs text-brand-400 hover:underline">全部</Link>
        </div>

        {categories.map(cat => {
          if (cat.parent_id) return null;
          const active = location.pathname === `/category/${cat.slug}`;
          const children = categories.filter(c => c.parent_id === cat.id);
          return (
            <div key={cat.id}>
              <Link to={`/category/${cat.slug}`}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${active ? 'bg-brand-500/15' : 'hover:bg-surface-2'}`}>
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ background: `${cat.color}1a`, color: cat.color }}>
                    {cat.icon === 'code-2' ? '⌘' : cat.icon === 'brain-circuit' ? '◈' : cat.icon === 'palette' ? '◑' : cat.icon === 'gamepad-2' ? '▣' : cat.icon === 'coffee' ? '◉' : cat.icon === 'megaphone' ? '◆' : '◇'}
                  </span>
                  <span className="text-sm font-medium flex-1 truncate">{cat.name}</span>
                  {active && <ChevronRight size={15} className="text-brand-400" />}
                </div>
              </Link>
              {children.length > 0 && (
                <div className="ml-5 pl-2 border-l space-y-0.5 my-1" style={{ borderColor: 'var(--border)' }}>
                  {children.map(child => (
                    <Link key={child.id} to={`/category/${child.slug}`}>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${location.pathname === `/category/${child.slug}` ? 'text-brand-400' : 'text-muted hover:text-current hover:bg-surface-2'}`}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: child.color }} />
                        {child.name}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 text-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-muted"><span className="font-semibold text-emerald-400">{onlineCount}</span> 人在线</span>
          <Wifi size={14} className="ml-auto text-muted" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex fixed left-0 top-16 bottom-0 w-64 glass border-r flex-col z-30" style={{ borderColor: 'var(--border)' }}>
        {content}
      </aside>

      {/* Mobile */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onClose}
              className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 glass-strong z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-4 h-16 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
                <span className="font-display font-bold text-lg">导航</span>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-2"><X size={20} /></button>
              </div>
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
