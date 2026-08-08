import { Router } from 'express';
import db from '../db.js';
import { authRequired, adminRequired, adminOnly, publicUser } from '../middleware/auth.js';

const router = Router();

// Stats dashboard
router.get('/stats', authRequired, adminRequired, (req, res) => {
  const stats = {
    users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    threads: db.prepare('SELECT COUNT(*) as c FROM threads').get().c,
    posts: db.prepare('SELECT COUNT(*) as c FROM posts').get().c,
    online: db.prepare("SELECT COUNT(*) as c FROM users WHERE status='online'").get().c,
    todayThreads: db.prepare('SELECT COUNT(*) as c FROM threads WHERE created_at > ?').get(Math.floor(Date.now()/1000) - 86400).c,
    todayPosts: db.prepare('SELECT COUNT(*) as c FROM posts WHERE created_at > ?').get(Math.floor(Date.now()/1000) - 86400).c,
    openReports: db.prepare("SELECT COUNT(*) as c FROM reports WHERE status='open'").get().c,
  };
  // activity over last 14 days
  const activity = db.prepare(`
    SELECT date(created_at, 'unixepoch') as date, COUNT(*) as threads FROM threads
    WHERE created_at > ? GROUP BY date ORDER BY date`).all(Math.floor(Date.now()/1000) - 14*86400);
  const topCategories = db.prepare('SELECT name, slug, color, thread_count, post_count FROM categories ORDER BY thread_count DESC LIMIT 10').all();
  const recentUsers = db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT 10').all().map(publicUser);
  res.json({ ...stats, activity, topCategories, recentUsers });
});

// ============ USER MANAGEMENT ============
router.get('/users', authRequired, adminRequired, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 30);
  const offset = (page - 1) * limit;
  const search = req.query.search;
  let where = '1=1';
  let params = [];
  if (search) { where += ' AND (username LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  const total = db.prepare(`SELECT COUNT(*) as c FROM users WHERE ${where}`).get(...params).c;
  const users = db.prepare(`SELECT * FROM users WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  res.json({ items: users.map(publicUser), total, page, limit });
});

router.patch('/users/:id', authRequired, adminRequired, (req, res) => {
  const { role, banned } = req.body || {};
  if (role) db.prepare('UPDATE users SET role=? WHERE id=?').run(role, req.params.id);
  if (banned !== undefined) db.prepare('UPDATE users SET banned=? WHERE id=?').run(banned ? 1 : 0, req.params.id);
  res.json(publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id)));
});

// ============ REPORTS ============
router.get('/reports', authRequired, adminRequired, (req, res) => {
  const reports = db.prepare(`
    SELECT r.*, u.username as reporter_username FROM reports r
    JOIN users u ON u.id=r.reporter_id ORDER BY r.created_at DESC`).all();
  res.json({ items: reports });
});

router.post('/reports', authRequired, (req, res) => {
  const { targetType, targetId, reason } = req.body || {};
  if (!targetType || !targetId || !reason) return res.status(400).json({ error: '请填写完整' });
  db.prepare('INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES (?,?,?,?)').run(req.user.id, targetType, targetId, reason);
  res.json({ ok: true });
});

router.patch('/reports/:id', authRequired, adminRequired, (req, res) => {
  const { status } = req.body || {};
  db.prepare('UPDATE reports SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ ok: true });
});

// ============ BADGES ============
router.get('/badges', (req, res) => {
  res.json({ items: db.prepare('SELECT * FROM badges ORDER BY tier, id').all() });
});

router.post('/badges', authRequired, adminOnly, (req, res) => {
  const { name, slug, description, icon, color, tier, criteria } = req.body || {};
  if (!name) return res.status(400).json({ error: '请填写名称' });
  const info = db.prepare('INSERT INTO badges (name, slug, description, icon, color, tier, criteria) VALUES (?,?,?,?,?,?,?)')
    .run(name, slug || name.toLowerCase().replace(/\s+/g, '-'), description || '', icon || 'award', color || '#f59e0b', tier || 'bronze', criteria || '');
  res.json(db.prepare('SELECT * FROM badges WHERE id=?').get(info.lastInsertRowid));
});

router.post('/badges/:id/award', authRequired, adminRequired, (req, res) => {
  const { userId } = req.body || {};
  db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?,?)').run(userId, req.params.id);
  res.json({ ok: true });
});

// ============ AUDIT LOG ============
router.get('/audit', authRequired, adminOnly, (req, res) => {
  const logs = db.prepare(`SELECT a.*, u.username as actor_username FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 100`).all();
  res.json({ items: logs });
});

export default router;
