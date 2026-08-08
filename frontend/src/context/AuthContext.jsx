import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('ys_token');
    if (!token) { setLoading(false); return; }
    try {
      const data = await api.me();
      setUser(data);
      connectSocket(data.id);
    } catch {
      localStorage.removeItem('ys_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = (token, userData) => {
    localStorage.setItem('ys_token', token);
    setUser(userData);
    connectSocket(userData.id);
  };

  const logout = () => {
    localStorage.removeItem('ys_token');
    setUser(null);
    disconnectSocket();
  };

  const updateUser = (data) => setUser(prev => prev ? { ...prev, ...data } : prev);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, fetchMe, updateUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
