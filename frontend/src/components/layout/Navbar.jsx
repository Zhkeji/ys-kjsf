import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Bell, MessageSquare, Menu, Sun, Moon, Plus, LogOut, User as UserIcon,
  Settings, Bookmark, LayoutDashboard, Shield, Sparkles, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import Avatar from '../ui/Avatar.jsx';
import { formatTime, getRoleLabel } from '../../lib/utils.js';

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const menuRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handler = (e) => setUnread(e.detail);
    window.addEventListener('unread-count', handler);
    return () => window.removeEventListener('unread-count', handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      api.getUnreadCount().then(r => setUnread(r.count)).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, [user]);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setSearchFocus(false);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim() || !searchFocus) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      api.suggest(searchQuery).then(r => setSuggestions(r.suggestions || [])).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery, searchFocus]);

  const openNotifications = () => {
    if (!user) { navigate('/login'); return; }
    setNotifOpen(o => !o);
    if (!notifOpen) {
      api.getNotifications('?limit=8').then(r => setNotifications(r.items || [])).catch(() => {});
    }
  };

  const readAll = async () => {
    try {
      await api.readAllNotifications();
      setNotifications(n => n.map(x => ({ ...x, read: true })));
      setUnread(0);
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16">
      <div className="glass-strong border-b h-full flex items-center px-3 sm:px-5 gap-2 sm:gap-4" style={{ borderColor: 'var(--border)' }}>
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-surface-2 transition">
          <Menu size={20} />
        </button>

        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-extrabold text-white text-lg"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)', backgroundSize: '200% auto' }}>
              Y
            </div>
            <div className="absolute inset-0 rounded-xl blur-md opacity-50 -z-10" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }} />
          </div>
          <div className="hidden sm:block">
            <span className="font-display font-bold text-lg leading-none">YS</span>
            <span className="gradient-text font-display font-bold text-lg leading-none">论坛</span>
          </div>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-auto relative">
          <div className="relative">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setTimeout(() => setSearchFocus(false), 200)}
              placeholder="搜索主题、用户、标签…"
              className="input-field pl-9 pr-3 py-2 text-sm rounded-full"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-current">
                <X size={15} />
              </button>
            )}
          </div>
          <AnimatePresence>
            {searchFocus && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute top-full mt-2 left-0 right-0 glass-strong rounded-xl py-1.5 shadow-2xl border overflow-hidden"
                style={{ borderColor: 'var(--border)' }}
              >
                {suggestions.map((s, i) => (
                  <button key={i} type="button" onMouseDown={() => { setSearchQuery(s); handleSearch({ preventDefault: () => {} }); }}
                    className="w-full text-left px-3 py-2 hover:bg-surface-2 flex items-center gap-2 text-sm transition">
                    <Search size={14} className="text-muted" /> {s}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
          {user && (
            <Link to="/new" className="hidden sm:flex btn-primary items-center gap-1.5 px-3.5 py-2 rounded-full text-sm">
              <Plus size={16} /> 发帖
            </Link>
          )}

          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-surface-2 transition" title="切换主题">
            <AnimatePresence mode="wait">
              {theme === 'dark' ? (
                <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><Sun size={19} /></motion.span>
              ) : (
                <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><Moon size={19} /></motion.span>
              )}
            </AnimatePresence>
          </button>

          {user ? (
            <>
              <Link to="/messages" className="p-2 rounded-lg hover:bg-surface-2 transition relative" title="私信">
                <MessageSquare size={19} />
              </Link>

              <div className="relative" ref={notifRef}>
                <button onClick={openNotifications} className="p-2 rounded-lg hover:bg-surface-2 transition relative" title="通知">
                  <Bell size={19} />
                  {unread > 0 && (
                    <motion.span
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
                    >
                      {unread > 99 ? '99+' : unread}
                    </motion.span>
                  )}
                </button>
                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      className="absolute right-0 top-full mt-2 w-80 glass-strong rounded-2xl shadow-2xl border overflow-hidden"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                        <span className="font-semibold font-display">通知</span>
                        {unread > 0 && <button onClick={readAll} className="text-xs text-brand-400 hover:underline">全部已读</button>}
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="py-10 text-center text-sm text-muted">暂无通知</div>
                        ) : notifications.map(n => (
                          <Link key={n.id} to="/notifications" onClick={() => { setNotifOpen(false); api.readNotification(n.id); }}
                            className={`flex gap-3 px-4 py-3 hover:bg-surface-2 transition border-b ${!n.read ? 'bg-brand-500/5' : ''}`}
                            style={{ borderColor: 'var(--border)' }}>
                            {n.actor ? <Avatar user={n.actor} size={36} /> : <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center"><Sparkles size={16} className="text-brand-400" /></div>}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm leading-snug">{n.content}</p>
                              <span className="text-xs text-muted">{formatTime(n.createdAt)}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <Link to="/notifications" onClick={() => setNotifOpen(false)} className="block text-center py-2.5 text-sm text-brand-400 hover:bg-surface-2 transition border-t" style={{ borderColor: 'var(--border)' }}>
                        查看全部
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative" ref={menuRef}>
                <button onClick={() => setMenuOpen(o => !o)} className="rounded-full transition hover:opacity-80">
                  <Avatar user={user} size={36} showStatus ring />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      className="absolute right-0 top-full mt-2 w-60 glass-strong rounded-2xl shadow-2xl border overflow-hidden py-1.5"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-3">
                          <Avatar user={user} size={40} />
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{user.displayName || user.username}</p>
                            <p className="text-xs text-muted">@{user.username} · {getRoleLabel(user.role)}</p>
                          </div>
                        </div>
                      </div>
                      <MenuItem icon={UserIcon} label="个人主页" to={`/u/${user.username}`} onClick={() => setMenuOpen(false)} />
                      <MenuItem icon={LayoutDashboard} label="我的动态" to="/dashboard" onClick={() => setMenuOpen(false)} />
                      <MenuItem icon={Bookmark} label="我的收藏" to="/bookmarks" onClick={() => setMenuOpen(false)} />
                      <MenuItem icon={MessageSquare} label="私信" to="/messages" onClick={() => setMenuOpen(false)} />
                      <MenuItem icon={Settings} label="设置" to="/settings" onClick={() => setMenuOpen(false)} />
                      {['admin', 'moderator'].includes(user.role) && (
                        <MenuItem icon={Shield} label="管理后台" to="/admin" onClick={() => setMenuOpen(false)} />
                      )}
                      <div className="border-t my-1.5" style={{ borderColor: 'var(--border)' }} />
                      <button onClick={() => { logout(); setMenuOpen(false); navigate('/'); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-2 transition text-red-400">
                        <LogOut size={17} /> 退出登录
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="px-3.5 py-2 rounded-full text-sm font-medium hover:bg-surface-2 transition">登录</Link>
              <Link to="/register" className="btn-primary px-4 py-2 rounded-full text-sm">注册</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuItem({ icon: Icon, label, to, onClick }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-2 transition">
      <Icon size={17} className="text-muted" /> {label}
    </Link>
  );
}
