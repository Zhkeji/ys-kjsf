import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';
import { getSocket } from '../../lib/socket.js';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      api.getUnreadCount().then(r => {
        window.dispatchEvent(new CustomEvent('unread-count', { detail: r.count }));
      }).catch(() => {});
    }
  }, [user]);

  // Real-time notifications via socket
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    const onNotification = () => {
      api.getUnreadCount().then(r => {
        window.dispatchEvent(new CustomEvent('unread-count', { detail: r.count }));
      }).catch(() => {});
    };
    socket.on('notification', onNotification);
    return () => socket.off('notification', onNotification);
  }, [user]);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Scroll to top on route change
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 pt-16">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-1 min-w-0 lg:pl-64"
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
