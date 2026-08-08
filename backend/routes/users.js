import { Router } from 'express';
import db from '../db.js';
import { authRequired, optionalAuth, publicUser } from '../middleware/auth.js';
import { createNotification, adjustReputation } from '../helpers.js';

const router = Router();

// Get user profile
router.get('/:username', optionalAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(req.params.username);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const badges = db.prepare(`SELECT b.* FROM badges b JOIN user_badges ub ON ub.badge_id=b.id WHERE ub.user_id=?`).all(user.id);
  const recentThreads = db.prepare('SELECT id, title, slug, views, post_count, reaction_count, created_at FROM threads WHERE user_id=? ORDER BY created_at DESC LIMIT 5').all(user.id);
  const followerCount = db.prepare('SELECT COUNT(*) as c FROM follows WHERE following_id=?').get(user.id).c;
  const followingCount = db.prepare('SELECT COUNT(*) as c FROM follows WHERE follower_id=?').get(user.id).c;

  let isFollowing = false;
  if (req.user) {
    isFollowing = !!db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(req.user.id, user.id);
  }

  res.json({
    ...publicUser(user),
    badges,
    recentThreads,
    followerCount,
    followingCount,
    isFollowing,
  });
});

// List all users (with pagination)
router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const sort = req.query.sort === 'reputation' ? 'reputation DESC' : req.query.sort === 'posts' ? 'post_count DESC' : 'created_at DESC';
  const total = db.prepare('SELECT COUNT(*) as c FROM users WHERE banned=0').get().c;
  const users = db.prepare(`SELECT * FROM users WHERE banned=0 ORDER BY ${sort} LIMIT ? OFFSET ?`).all(limit, (page - 1) * limit);
  res.json({ items: users.map(publicUser), total, page, limit });
});

// Follow / unfollow
router.post('/:id/follow', authRequired, (req, res) => {
  if (req.user.id == req.params.id) return res.status(400).json({ error: '不能关注自己' });
  const target = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!target) return res.status(404).json({ error: '用户不存在' });
  const existing = db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(req.user.id, req.params.id);
  if (existing) {
    db.prepare('DELETE FROM follows WHERE follower_id=? AND following_id=?').run(req.user.id, req.params.id);
    return res.json({ following: false });
  }
  db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?,?)').run(req.user.id, req.params.id);
  createNotification(req.params.id, req.user.id, 'follow', 'user', req.user.id, `${req.user.username} 关注了你`);
  res.json({ following: true });
});

// Get followers / following
router.get('/:id/followers', (req, res) => {
  const users = db.prepare(`SELECT u.* FROM users u JOIN follows f ON f.follower_id=u.id WHERE f.following_id=?`).all(req.params.id);
  res.json({ items: users.map(publicUser) });
});
router.get('/:id/following', (req, res) => {
  const users = db.prepare(`SELECT u.* FROM users u JOIN follows f ON f.following_id=u.id WHERE f.follower_id=?`).all(req.params.id);
  res.json({ items: users.map(publicUser) });
});

// Reputation history
router.get('/:id/reputation', (req, res) => {
  const logs = db.prepare(`SELECT r.*, u.username as actor_username FROM reputation_log r
    LEFT JOIN users u ON u.id=r.actor_id WHERE r.user_id=? ORDER BY r.created_at DESC LIMIT 50`).all(req.params.id);
  res.json({ items: logs });
});

// Online users
router.get('/online/list', (req, res) => {
  const users = db.prepare("SELECT * FROM users WHERE status='online' AND banned=0 ORDER BY reputation DESC LIMIT 100").all();
  res.json({ items: users.map(publicUser) });
});

// Leaderboard
router.get('/leaderboard/top', (req, res) => {
  const users = db.prepare('SELECT * FROM users WHERE banned=0 ORDER BY reputation DESC, post_count DESC LIMIT 20').all();
  res.json({ items: users.map(publicUser) });
});

export default router;
