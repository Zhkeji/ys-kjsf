import { Router } from 'express';
import db from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { decorateNotification } from '../helpers.js';

const router = Router();

router.get('/', authRequired, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const filter = req.query.unread === 'true' ? 'AND read=0' : '';
  const total = db.prepare(`SELECT COUNT(*) as c FROM notifications WHERE user_id=? ${filter}`).get(req.user.id).c;
  const unread = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND read=0').get(req.user.id).c;
  const items = db.prepare(`SELECT * FROM notifications WHERE user_id=? ${filter} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(req.user.id, limit, offset);
  res.json({ items: items.map(decorateNotification), total, unread, page, limit });
});

router.get('/unread-count', authRequired, (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND read=0').get(req.user.id).c;
  res.json({ count });
});

router.post('/read-all', authRequired, (req, res) => {
  db.prepare('UPDATE notifications SET read=1 WHERE user_id=?').run(req.user.id);
  res.json({ ok: true });
});

router.post('/:id/read', authRequired, (req, res) => {
  db.prepare('UPDATE notifications SET read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

router.delete('/:id', authRequired, (req, res) => {
  db.prepare('DELETE FROM notifications WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

export default router;
