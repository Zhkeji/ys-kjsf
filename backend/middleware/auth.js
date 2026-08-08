import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ys-forum-secret-key-2024-very-secure';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: '未登录' });
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND banned = 0').get(payload.id);
    if (!user) return res.status(401).json({ error: '用户不存在或已被封禁' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: '登录已过期' });
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header) {
    const token = header.startsWith('Bearer ') ? header.slice(7) : header;
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT * FROM users WHERE id = ? AND banned = 0').get(payload.id);
      if (user) req.user = user;
    } catch (e) { /* ignore */ }
  }
  next();
}

export function adminRequired(req, res, next) {
  if (!req.user || !['admin', 'moderator'].includes(req.user.role)) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

export function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要超级管理员权限' });
  }
  next();
}

// Sanitize user object for public output
export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    displayName: u.display_name || u.username,
    avatar: u.avatar,
    bio: u.bio,
    signature: u.signature,
    role: u.role,
    reputation: u.reputation,
    postCount: u.post_count,
    threadCount: u.thread_count,
    status: u.status,
    title: u.title,
    location: u.location,
    website: u.website,
    lastSeen: u.last_seen,
    createdAt: u.created_at,
  };
}

export { JWT_SECRET };
