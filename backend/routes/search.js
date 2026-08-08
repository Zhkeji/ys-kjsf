import { Router } from 'express';
import db from '../db.js';
import { optionalAuth } from '../middleware/auth.js';
import { decorateThread } from '../helpers.js';
import { publicUser } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q || q.length < 1) return res.json({ threads: [], posts: [], users: [], tags: [] });
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  // FTS search on threads
  let threads = [];
  try {
    const ftsQuery = q.replace(/"/g, '""');
    const rows = db.prepare(`SELECT t.* FROM threads_fts fts JOIN threads t ON t.id=fts.rowid
      WHERE threads_fts MATCH ? ORDER BY rank LIMIT ? OFFSET ?`).all(ftsQuery, limit, offset);
    threads = rows.map(r => decorateThread(r, req.user?.id));
  } catch (e) { /* FTS query syntax error - fallback */ }
  if (!threads.length) {
    const rows = db.prepare(`SELECT * FROM threads WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC LIMIT ?`)
      .all(`%${q}%`, `%${q}%`, limit);
    threads = rows.map(r => decorateThread(r, req.user?.id));
  }

  // search users
  const users = db.prepare('SELECT * FROM users WHERE username LIKE ? OR display_name LIKE ? LIMIT 10').all(`%${q}%`, `%${q}%`).map(publicUser);

  // search tags
  const tags = db.prepare('SELECT * FROM tags WHERE name LIKE ? LIMIT 10').all(`%${q}%`);

  const total = threads.length;
  res.json({ threads, users, tags, total, page, limit });
});

// Search suggestions
router.get('/suggest', (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (q.length < 1) return res.json({ suggestions: [] });
  const threads = db.prepare("SELECT title FROM threads WHERE title LIKE ? LIMIT 5").all(`%${q}%`).map(t => t.title);
  const tags = db.prepare("SELECT name FROM tags WHERE name LIKE ? LIMIT 5").all(`%${q}%`).map(t => t.name);
  res.json({ suggestions: [...threads, ...tags] });
});

export default router;
