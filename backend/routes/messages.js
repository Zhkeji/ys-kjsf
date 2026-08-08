import { Router } from 'express';
import db from '../db.js';
import { authRequired, publicUser } from '../middleware/auth.js';
import { createNotification } from '../helpers.js';

const router = Router();

// List user's conversations
router.get('/', authRequired, (req, res) => {
  const convos = db.prepare(`
    SELECT c.*, 
      (SELECT content FROM direct_messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM direct_messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
      cm.last_read_at
    FROM conversations c
    JOIN conversation_members cm ON cm.conversation_id=c.id
    WHERE cm.user_id=?
    ORDER BY last_message_at DESC NULLS LAST`).all(req.user.id);

  const result = convos.map(c => {
    const members = db.prepare(`
      SELECT u.* FROM users u JOIN conversation_members cm ON cm.user_id=u.id WHERE cm.conversation_id=? AND u.id != ?`).all(c.id, req.user.id);
    const unread = db.prepare(`SELECT COUNT(*) as c FROM direct_messages WHERE conversation_id=? AND sender_id != ? AND created_at > ?`).get(c.id, req.user.id, c.last_read_at).c;
    return {
      id: c.id,
      lastMessage: c.last_message,
      lastMessageAt: c.last_message_at,
      members: members.map(publicUser),
      unread,
    };
  });
  res.json({ items: result });
});

// Get or create a conversation with a user
router.post('/with/:userId', authRequired, (req, res) => {
  const other = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.userId);
  if (!other) return res.status(404).json({ error: '用户不存在' });
  if (other.id === req.user.id) return res.status(400).json({ error: '不能和自己对话' });

  // find existing 1-1 conversation
  const existing = db.prepare(`
    SELECT c.id FROM conversations c
    JOIN conversation_members cm1 ON cm1.conversation_id=c.id AND cm1.user_id=?
    JOIN conversation_members cm2 ON cm2.conversation_id=c.id AND cm2.user_id=?
    WHERE (SELECT COUNT(*) FROM conversation_members WHERE conversation_id=c.id) = 2
  `).get(req.user.id, other.id);

  if (existing) return res.json({ id: existing.id, members: [publicUser(req.user), publicUser(other)] });

  const info = db.prepare('INSERT INTO conversations DEFAULT VALUES').run();
  db.prepare('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?,?)').run(info.lastInsertRowid, req.user.id);
  db.prepare('INSERT INTO conversation_members (conversation_id, user_id) VALUES (?,?)').run(info.lastInsertRowid, other.id);
  res.json({ id: info.lastInsertRowid, members: [publicUser(req.user), publicUser(other)] });
});

// Get messages in a conversation
router.get('/:id/messages', authRequired, (req, res) => {
  const member = db.prepare('SELECT 1 FROM conversation_members WHERE conversation_id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!member) return res.status(403).json({ error: '无权访问' });
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 50);
  const offset = (page - 1) * limit;
  const total = db.prepare('SELECT COUNT(*) as c FROM direct_messages WHERE conversation_id=?').get(req.params.id).c;
  const messages = db.prepare(`
    SELECT dm.*, u.username, u.display_name, u.avatar, u.role FROM direct_messages dm
    JOIN users u ON u.id=dm.sender_id
    WHERE dm.conversation_id=? ORDER BY dm.created_at DESC LIMIT ? OFFSET ?`).all(req.params.id, limit, offset);
  // mark as read
  db.prepare('UPDATE conversation_members SET last_read_at=? WHERE conversation_id=? AND user_id=?').run(Math.floor(Date.now() / 1000), req.params.id, req.user.id);
  res.json({ items: messages.reverse().map(m => ({
    id: m.id, conversationId: m.conversation_id, senderId: m.sender_id, content: m.content, createdAt: m.created_at,
    sender: { id: m.sender_id, username: m.username, displayName: m.display_name, avatar: m.avatar, role: m.role }
  })), total, page, limit });
});

// Send a message
router.post('/:id/messages', authRequired, (req, res) => {
  const { content } = req.body || {};
  if (!content || !content.trim()) return res.status(400).json({ error: '内容不能为空' });
  const member = db.prepare('SELECT 1 FROM conversation_members WHERE conversation_id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!member) return res.status(403).json({ error: '无权访问' });
  const info = db.prepare('INSERT INTO direct_messages (conversation_id, sender_id, content) VALUES (?,?,?)').run(req.params.id, req.user.id, content);
  const msg = db.prepare('SELECT * FROM direct_messages WHERE id=?').get(info.lastInsertRowid);
  // notify other members
  const others = db.prepare('SELECT user_id FROM conversation_members WHERE conversation_id=? AND user_id!=?').all(req.params.id, req.user.id);
  for (const o of others) {
    createNotification(o.user_id, req.user.id, 'message', 'message', parseInt(req.params.id), `${req.user.username} 给你发了一条消息`);
  }
  res.json({ ...msg, sender: publicUser(req.user) });
});

export default router;
