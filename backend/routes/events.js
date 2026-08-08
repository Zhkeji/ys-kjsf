import { Router } from 'express';
import db from '../db.js';
import { authRequired, optionalAuth, publicUser } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, (req, res) => {
  const events = db.prepare(`
    SELECT e.*, u.username, u.display_name, u.avatar,
      (SELECT COUNT(*) FROM event_attendees WHERE event_id=e.id) as attendee_count
    FROM events e JOIN users u ON u.id=e.user_id
    ORDER BY e.start_time ASC`).all();
  res.json({ items: events.map(e => ({
    ...e,
    author: { id: e.user_id, username: e.username, displayName: e.display_name, avatar: e.avatar },
    attendeeCount: e.attendee_count,
    isAttending: req.user ? !!db.prepare('SELECT 1 FROM event_attendees WHERE event_id=? AND user_id=?').get(e.id, req.user.id) : false,
  })) });
});

router.post('/', authRequired, (req, res) => {
  const { title, description, location, startTime, endTime, maxAttendees, color } = req.body || {};
  if (!title || !startTime) return res.status(400).json({ error: '请填写标题和时间' });
  const info = db.prepare('INSERT INTO events (user_id, title, description, location, start_time, end_time, max_attendees, color) VALUES (?,?,?,?,?,?,?,?)')
    .run(req.user.id, title, description || '', location || '', startTime, endTime || null, maxAttendees || null, color || '#6366f1');
  res.json(db.prepare('SELECT * FROM events WHERE id=?').get(info.lastInsertRowid));
});

router.post('/:id/attend', authRequired, (req, res) => {
  const { status } = req.body || {};
  const valid = ['going', 'interested'];
  if (!valid.includes(status)) return res.status(400).json({ error: '无效状态' });
  const existing = db.prepare('SELECT 1 FROM event_attendees WHERE event_id=? AND user_id=?').get(req.params.id, req.user.id);
  if (existing) {
    db.prepare('UPDATE event_attendees SET status=? WHERE event_id=? AND user_id=?').run(status, req.params.id, req.user.id);
  } else {
    db.prepare('INSERT INTO event_attendees (event_id, user_id, status) VALUES (?,?,?)').run(req.params.id, req.user.id, status);
  }
  res.json({ ok: true, status });
});

router.delete('/:id/attend', authRequired, (req, res) => {
  db.prepare('DELETE FROM event_attendees WHERE event_id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

router.delete('/:id', authRequired, (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);
  if (!event) return res.status(404).json({ error: '活动不存在' });
  if (event.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '无权操作' });
  db.prepare('DELETE FROM events WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

router.get('/:id/attendees', (req, res) => {
  const attendees = db.prepare(`
    SELECT u.*, ea.status FROM users u JOIN event_attendees ea ON ea.user_id=u.id WHERE ea.event_id=?`).all(req.params.id);
  res.json({ items: attendees.map(a => ({ ...publicUser(a), attendStatus: a.status })) });
});

export default router;
