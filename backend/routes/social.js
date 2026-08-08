import { Router } from 'express';
import db from '../db.js';
import { authRequired, optionalAuth } from '../middleware/auth.js';
import { decorateThread, createNotification, adjustReputation } from '../helpers.js';

const router = Router();

// ============ REACTIONS ============
const REACTION_TYPES = ['like', 'love', 'haha', 'wow', 'sad', 'angry', 'fire', 'brain'];
const REACTION_REP = { like: 1, love: 2, fire: 2, brain: 3, haha: 1, wow: 1, sad: 0, angry: -1 };

router.post('/react', authRequired, (req, res) => {
  const { targetType, targetId, type } = req.body || {};
  if (!['thread', 'post'].includes(targetType)) return res.status(400).json({ error: '无效目标' });
  if (!REACTION_TYPES.includes(type)) return res.status(400).json({ error: '无效反应类型' });

  // verify target exists
  const table = targetType === 'thread' ? 'threads' : 'posts';
  const target = db.prepare(`SELECT user_id FROM ${table} WHERE id=?`).get(targetId);
  if (!target) return res.status(404).json({ error: '目标不存在' });

  const existing = db.prepare('SELECT * FROM reactions WHERE user_id=? AND target_type=? AND target_id=?').get(req.user.id, targetType, targetId);
  if (existing) {
    if (existing.type === type) {
      // toggle off
      db.prepare('DELETE FROM reactions WHERE id=?').run(existing.id);
      db.prepare(`UPDATE ${table} SET reaction_count = reaction_count - 1 WHERE id=?`).run(targetId);
      if (REACTION_REP[type]) adjustReputation(target.user_id, req.user.id, -REACTION_REP[type], '取消反应', targetType, targetId);
    } else {
      db.prepare('UPDATE reactions SET type=? WHERE id=?').run(type, existing.id);
      if (REACTION_REP[existing.type]) adjustReputation(target.user_id, req.user.id, -REACTION_REP[existing.type], '更改反应', targetType, targetId);
      if (REACTION_REP[type]) adjustReputation(target.user_id, req.user.id, REACTION_REP[type], '反应', targetType, targetId);
      createNotification(target.user_id, req.user.id, 'reaction', targetType, targetId, `${req.user.username} 对你的${targetType === 'thread' ? '主题' : '评论'}点了 ${type}`);
    }
  } else {
    db.prepare('INSERT INTO reactions (user_id, target_type, target_id, type) VALUES (?,?,?,?)').run(req.user.id, targetType, targetId, type);
    db.prepare(`UPDATE ${table} SET reaction_count = reaction_count + 1 WHERE id=?`).run(targetId);
    if (REACTION_REP[type]) adjustReputation(target.user_id, req.user.id, REACTION_REP[type], '反应', targetType, targetId);
    createNotification(target.user_id, req.user.id, 'reaction', targetType, targetId, `${req.user.username} 对你的${targetType === 'thread' ? '主题' : '评论'}点了 ${type}`);
  }

  const reactions = db.prepare('SELECT type, COUNT(*) as count FROM reactions WHERE target_type=? AND target_id=? GROUP BY type').all(targetType, targetId);
  const myReaction = db.prepare('SELECT type FROM reactions WHERE user_id=? AND target_type=? AND target_id=?').get(req.user.id, targetType, targetId);
  res.json({ reactions, userReaction: myReaction?.type || null });
});

router.get('/:targetType/:targetId/reactions', (req, res) => {
  const reactions = db.prepare('SELECT type, COUNT(*) as count FROM reactions WHERE target_type=? AND target_id=? GROUP BY type').all(req.params.targetType, req.params.targetId);
  res.json({ reactions });
});

// ============ BOOKMARKS ============
router.get('/bookmarks', authRequired, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const total = db.prepare('SELECT COUNT(*) as c FROM bookmarks WHERE user_id=?').get(req.user.id).c;
  const threads = db.prepare(`SELECT t.* FROM threads t JOIN bookmarks b ON b.thread_id=t.id WHERE b.user_id=? ORDER BY b.created_at DESC LIMIT ? OFFSET ?`).all(req.user.id, limit, offset);
  res.json({ items: threads.map(t => decorateThread(t, req.user.id)), total, page, limit });
});

router.post('/bookmarks/:threadId', authRequired, (req, res) => {
  const existing = db.prepare('SELECT 1 FROM bookmarks WHERE user_id=? AND thread_id=?').get(req.user.id, req.params.threadId);
  if (existing) {
    db.prepare('DELETE FROM bookmarks WHERE user_id=? AND thread_id=?').run(req.user.id, req.params.threadId);
    db.prepare('UPDATE threads SET bookmark_count = bookmark_count - 1 WHERE id=?').run(req.params.threadId);
    return res.json({ bookmarked: false });
  }
  db.prepare('INSERT INTO bookmarks (user_id, thread_id) VALUES (?,?)').run(req.user.id, req.params.threadId);
  db.prepare('UPDATE threads SET bookmark_count = bookmark_count + 1 WHERE id=?').run(req.params.threadId);
  res.json({ bookmarked: true });
});

// ============ TAGS ============
router.get('/tags', (req, res) => {
  const tags = db.prepare('SELECT * FROM tags ORDER BY usage_count DESC LIMIT 100').all();
  res.json({ items: tags });
});

router.get('/tags/:slug', optionalAuth, (req, res) => {
  const tag = db.prepare('SELECT * FROM tags WHERE slug=?').get(req.params.slug);
  if (!tag) return res.status(404).json({ error: '标签不存在' });
  res.json(tag);
});

export default router;
