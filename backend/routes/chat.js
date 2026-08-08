import { Router } from 'express';
import db from '../db.js';
import { authRequired, publicUser } from '../middleware/auth.js';

const router = Router();

// List chat rooms
router.get('/rooms', (req, res) => {
  const rooms = db.prepare('SELECT * FROM chat_rooms ORDER BY id').all();
  res.json({ items: rooms });
});

router.get('/rooms/:id/messages', (req, res) => {
  const limit = Math.min(100, parseInt(req.query.limit) || 50);
  const messages = db.prepare(`
    SELECT cm.*, u.username, u.display_name, u.avatar, u.role FROM chat_messages cm
    JOIN users u ON u.id=cm.user_id
    WHERE cm.room_id=? ORDER BY cm.created_at DESC LIMIT ?`).all(req.params.id, limit);
  res.json({ items: messages.reverse().map(m => ({
    id: m.id, roomId: m.room_id, userId: m.user_id, content: m.content, createdAt: m.created_at,
    sender: { id: m.user_id, username: m.username, displayName: m.display_name, avatar: m.avatar, role: m.role }
  })) });
});

router.post('/rooms/:id/messages', authRequired, (req, res) => {
  const { content } = req.body || {};
  if (!content || !content.trim()) return res.status(400).json({ error: '内容不能为空' });
  const info = db.prepare('INSERT INTO chat_messages (room_id, user_id, content) VALUES (?,?,?)').run(req.params.id, req.user.id, content);
  const msg = db.prepare('SELECT * FROM chat_messages WHERE id=?').get(info.lastInsertRowid);
  res.json({ ...msg, sender: publicUser(req.user) });
});

router.post('/rooms', authRequired, (req, res) => {
  const { name, description, icon } = req.body || {};
  if (!name) return res.status(400).json({ error: '请填写名称' });
  const info = db.prepare('INSERT INTO chat_rooms (name, description, icon, created_by) VALUES (?,?,?,?)').run(name, description || '', icon || 'hash', req.user.id);
  res.json(db.prepare('SELECT * FROM chat_rooms WHERE id=?').get(info.lastInsertRowid));
});

export default router;
