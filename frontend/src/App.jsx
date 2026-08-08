import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/layout/Layout.jsx';
import Home from './pages/Home.jsx';
import CategoryPage from './pages/CategoryPage.jsx';
import ThreadDetail from './pages/ThreadDetail.jsx';
import NewThread from './pages/NewThread.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import ModeratorLogin from './pages/ModeratorLogin.jsx';
import Profile from './pages/Profile.jsx';
import SearchPage from './pages/SearchPage.jsx';
import Chat from './pages/Chat.jsx';
import Messages from './pages/Messages.jsx';
import Notifications from './pages/Notifications.jsx';
import Bookmarks from './pages/Bookmarks.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Admin from './pages/Admin.jsx';
import Events from './pages/Events.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Tags from './pages/Tags.jsx';
import Settings from './pages/Settings.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* 三端独立登录界面 — 全屏，不套主框架 */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/moderator/login" element={<ModeratorLogin />} />

      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/thread/:id" element={<ThreadDetail />} />
        <Route path="/new" element={<Protected><NewThread /></Protected>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/u/:username" element={<Profile />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/chat" element={<Protected><Chat /></Protected>} />
        <Route path="/messages" element={<Protected><Messages /></Protected>} />
        <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
        <Route path="/bookmarks" element={<Protected><Bookmarks /></Protected>} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/events" element={<Events />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/tags" element={<Tags />} />
        <Route path="/tag/:slug" element={<Tags />} />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />
        <Route path="/admin" element={<Protected><Admin /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
