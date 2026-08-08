import { Router } from 'express';
import db from '../db.js';
import { authRequired, optionalAuth, adminRequired } from '../middleware/auth.js';
import { decorateThread, decoratePost, createNotification, adjustReputation, slugify, ensureTag } from '../helpers.js';

const router = Router();

// List threads with filters
router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const where = ['1=1'];
  const params = [];

  if (req.query.category) { where.push('t.category_id=?'); params.push(req.query.category); }
  if (req.query.tag) { where.push('t.id IN (SELECT tt.thread_id FROM thread_tags tt JOIN tags tg ON tg.id=tt.tag_id WHERE tg.slug=?)'); params.push(req.query.tag); }
  if (req.query.userId) { where.push('t.user_id=?'); params.push(req.query.userId); }
  if (req.query.type) { where.push('t.type=?'); params.push(req.query.type); }
  if (req.query.featured === 'true') where.push('t.featured=1');
  if (req.query.following && req.user) {
    where.push('t.user_id IN (SELECT following_id FROM follows WHERE follower_id=?)');
    params.push(req.user.id);
  }

  let orderBy = 't.pinned DESC, t.last_post_at DESC';
  if (req.query.sort === 'top') orderBy = 't.pinned DESC, t.reaction_count DESC, t.views DESC';
  else if (req.query.sort === 'views') orderBy = 't.pinned DESC, t.views DESC';
  else if (req.query.sort === 'new') orderBy = 't.pinned DESC, t.created_at DESC';

  const whereSql = where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) as c FROM threads t WHERE ${whereSql}`).get(...params).c;
  const threads = db.prepare(`SELECT t.* FROM threads t WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).all(...params, limit, offset);
  res.json({ items: threads.map(t => decorateThread(t, req.user?.id)), total, page, limit });
});

// Trending threads (based on recent activity score)
router.get('/trending/week', (req, res) => {
  const weekAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
  const threads = db.prepare(`
    SELECT t.*, (t.reaction_count * 3 + t.post_count * 2 + t.views * 0.1 + (t.last_post_at > ?) * 50) as score
    FROM threads t WHERE t.created_at > ? ORDER BY score DESC LIMIT 10`).all(weekAgo, weekAgo - 7 * 86400);
  res.json({ items: threads.map(t => decorateThread(t, req.user?.id)) });
});

// Get single thread
router.get('/:id', optionalAuth, (req, res) => {
  const id = parseInt(req.params.id);
  let thread;
  if (isNaN(id)) {
    thread = db.prepare('SELECT * FROM threads WHERE slug=?').get(req.params.id);
  } else {
    thread = db.prepare('SELECT * FROM threads WHERE id=?').get(id);
  }
  if (!thread) return res.status(404).json({ error: '主题不存在' });
  db.prepare('UPDATE threads SET views = views + 1 WHERE id=?').run(thread.id);

  const decorated = decorateThread(thread, req.user?.id);
  // attach poll if exists
  if (thread.type === 'poll') {
    const poll = db.prepare('SELECT * FROM polls WHERE thread_id=?').get(thread.id);
    if (poll) {
      const options = db.prepare('SELECT * FROM poll_options WHERE poll_id=?').all(poll.id);
      const totalVotes = options.reduce((s, o) => s + o.vote_count, 0);
      let userVotes = [];
      if (req.user) {
        userVotes = db.prepare('SELECT option_id FROM poll_votes WHERE user_id=? AND option_id IN (SELECT id FROM poll_options WHERE poll_id=?)').all(req.user.id, poll.id).map(v => v.option_id);
      }
      decorated.poll = { ...poll, options, totalVotes, userVotes };
    }
  }
  res.json(decorated);
});

// Create thread
router.post('/', authRequired, (req, res) => {
  const { categoryId, title, content, tags, type, poll } = req.body || {};
  if (!categoryId || !title || !content) return res.status(400).json({ error: '请填写必填字段' });
  const cat = db.prepare('SELECT * FROM categories WHERE id=?').get(categoryId);
  if (!cat) return res.status(404).json({ error: '版块不存在' });

  const slug = slugify(title) + '-' + Math.random().toString(36).slice(2, 6);
  const excerpt = content.replace(/[#*`>\-\[\]\(\)!]/g, '').slice(0, 200);
  const info = db.prepare(`INSERT INTO threads (category_id, user_id, title, slug, content, excerpt, type, last_post_at)
    VALUES (?,?,?,?,?,?,?,?)`).run(categoryId, req.user.id, title, slug, content, excerpt, type || 'discussion', Math.floor(Date.now() / 1000));
  const threadId = info.lastInsertRowid;

  db.prepare('UPDATE users SET thread_count = thread_count + 1 WHERE id=?').run(req.user.id);
  db.prepare('UPDATE categories SET thread_count = thread_count + 1 WHERE id=?').run(categoryId);
  adjustReputation(req.user.id, null, 5, '发布主题', 'thread', threadId);

  // tags
  if (tags && Array.isArray(tags)) {
    for (const tagName of tags.slice(0, 8)) {
      const tag = ensureTag(tagName);
      db.prepare('INSERT OR IGNORE INTO thread_tags (thread_id, tag_id) VALUES (?,?)').run(threadId, tag.id);
      db.prepare('UPDATE tags SET usage_count = usage_count + 1 WHERE id=?').run(tag.id);
    }
  }

  // poll
  if (type === 'poll' && poll && poll.options && poll.options.length >= 2) {
    const pinfo = db.prepare('INSERT INTO polls (thread_id, question, multi_vote, expires_at) VALUES (?,?,?,?)')
      .run(threadId, poll.question || title, poll.multiVote ? 1 : 0, poll.expiresAt || null);
    for (const opt of poll.options) {
      db.prepare('INSERT INTO poll_options (poll_id, text) VALUES (?,?)').run(pinfo.lastInsertRowid, opt);
    }
  }

  // notify followers
  const followers = db.prepare('SELECT follower_id FROM follows WHERE following_id=?').all(req.user.id);
  for (const f of followers) {
    createNotification(f.follower_id, req.user.id, 'system', 'thread', threadId, `${req.user.username} 发布了新主题: ${title}`);
  }

  const thread = db.prepare('SELECT * FROM threads WHERE id=?').get(threadId);
  res.json(decorateThread(thread, req.user.id));
});

// Update thread
router.put('/:id', authRequired, (req, res) => {
  const thread = db.prepare('SELECT * FROM threads WHERE id=?').get(req.params.id);
  if (!thread) return res.status(404).json({ error: '主题不存在' });
  if (thread.user_id !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) return res.status(403).json({ error: '无权操作' });
  const { title, content, tags } = req.body || {};
  const excerpt = content ? content.replace(/[#*`>\-\[\]\(\)!]/g, '').slice(0, 200) : thread.excerpt;
  db.prepare('UPDATE threads SET title=COALESCE(?,title), content=COALESCE(?,content), excerpt=?, updated_at=? WHERE id=?')
    .run(title, content, excerpt, Math.floor(Date.now() / 1000), thread.id);
  if (tags && Array.isArray(tags)) {
    db.prepare('DELETE FROM thread_tags WHERE thread_id=?').run(thread.id);
    for (const tagName of tags.slice(0, 8)) {
      const tag = ensureTag(tagName);
      db.prepare('INSERT OR IGNORE INTO thread_tags (thread_id, tag_id) VALUES (?,?)').run(thread.id, tag.id);
    }
  }
  res.json(decorateThread(db.prepare('SELECT * FROM threads WHERE id=?').get(thread.id), req.user.id));
});

// Delete thread
router.delete('/:id', authRequired, (req, res) => {
  const thread = db.prepare('SELECT * FROM threads WHERE id=?').get(req.params.id);
  if (!thread) return res.status(404).json({ error: '主题不存在' });
  if (thread.user_id !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) return res.status(403).json({ error: '无权操作' });
  db.prepare('DELETE FROM threads WHERE id=?').run(thread.id);
  db.prepare('UPDATE users SET thread_count = thread_count - 1 WHERE id=?').run(thread.user_id);
  db.prepare('UPDATE categories SET thread_count = thread_count - 1 WHERE id=?').run(thread.category_id);
  adjustReputation(thread.user_id, req.user.id, -5, '删除主题', 'thread', thread.id);
  res.json({ ok: true });
});

// Moderate thread (pin/lock/feature/etc)
router.patch('/:id/moderate', authRequired, adminRequired, (req, res) => {
  const { pinned, locked, featured, type, solved } = req.body || {};
  db.prepare(`UPDATE threads SET
    pinned=COALESCE(?,pinned), locked=COALESCE(?,locked), featured=COALESCE(?,featured),
    type=COALESCE(?,type), solved=COALESCE(?,solved) WHERE id=?`)
    .run(pinned !== undefined ? (pinned ? 1 : 0) : null,
         locked !== undefined ? (locked ? 1 : 0) : null,
         featured !== undefined ? (featured ? 1 : 0) : null,
         type, solved !== undefined ? (solved ? 1 : 0) : null, req.params.id);
  res.json(decorateThread(db.prepare('SELECT * FROM threads WHERE id=?').get(req.params.id), req.user.id));
});

// ============ POSTS / REPLIES ============

router.get('/:id/posts', optionalAuth, (req, res) => {
  const thread = db.prepare('SELECT * FROM threads WHERE id=?').get(req.params.id);
  if (!thread) return res.status(404).json({ error: '主题不存在' });
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const total = db.prepare('SELECT COUNT(*) as c FROM posts WHERE thread_id=?').get(req.params.id).c;
  const posts = db.prepare('SELECT * FROM posts WHERE thread_id=? ORDER BY is_best_answer DESC, created_at ASC LIMIT ? OFFSET ?').all(req.params.id, limit, offset);
  res.json({ items: posts.map(p => decoratePost(p, req.user?.id)), total, page, limit });
});

router.post('/:id/posts', authRequired, (req, res) => {
  const thread = db.prepare('SELECT * FROM threads WHERE id=?').get(req.params.id);
  if (!thread) return res.status(404).json({ error: '主题不存在' });
  if (thread.locked && !['admin', 'moderator'].includes(req.user.role)) return res.status(403).json({ error: '主题已锁定' });
  const { content, parentId } = req.body || {};
  if (!content || content.length < 2) return res.status(400).json({ error: '内容过短' });
  const info = db.prepare('INSERT INTO posts (thread_id, user_id, parent_id, content) VALUES (?,?,?,?)')
    .run(thread.id, req.user.id, parentId || null, content);
  const now = Math.floor(Date.now() / 1000);
  db.prepare('UPDATE threads SET post_count = post_count + 1, last_post_at=?, last_post_user_id=? WHERE id=?').run(now, req.user.id, thread.id);
  db.prepare('UPDATE users SET post_count = post_count + 1 WHERE id=?').run(req.user.id);
  db.prepare('UPDATE categories SET post_count = post_count + 1 WHERE id=?').run(thread.category_id);
  adjustReputation(req.user.id, null, 2, '回复主题', 'post', info.lastInsertRowid);

  // notify thread author and mentioned parent author
  if (thread.user_id !== req.user.id) {
    createNotification(thread.user_id, req.user.id, 'reply', 'thread', thread.id, `${req.user.username} 回复了你的主题: ${thread.title}`);
  }
  if (parentId) {
    const parent = db.prepare('SELECT user_id FROM posts WHERE id=?').get(parentId);
    if (parent && parent.user_id !== req.user.id && parent.user_id !== thread.user_id) {
      createNotification(parent.user_id, req.user.id, 'reply', 'post', parentId, `${req.user.username} 回复了你的评论`);
    }
  }

  // @mentions
  const mentions = content.match(/@(\w+)/g) || [];
  for (const m of [...new Set(mentions)].slice(0, 10)) {
    const uname = m.slice(1);
    const mentioned = db.prepare('SELECT id FROM users WHERE username=?').get(uname);
    if (mentioned) createNotification(mentioned.id, req.user.id, 'mention', 'post', info.lastInsertRowid, `${req.user.username} 在评论中提到了你`);
  }

  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(info.lastInsertRowid);
  res.json(decoratePost(post, req.user.id));
});

router.put('/posts/:postId', authRequired, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.postId);
  if (!post) return res.status(404).json({ error: '评论不存在' });
  if (post.user_id !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) return res.status(403).json({ error: '无权操作' });
  db.prepare('UPDATE posts SET content=?, edited=1, updated_at=? WHERE id=?').run(req.body.content, Math.floor(Date.now() / 1000), post.id);
  res.json(decoratePost(db.prepare('SELECT * FROM posts WHERE id=?').get(post.id), req.user.id));
});

router.delete('/posts/:postId', authRequired, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.postId);
  if (!post) return res.status(404).json({ error: '评论不存在' });
  if (post.user_id !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) return res.status(403).json({ error: '无权操作' });
  db.prepare('DELETE FROM posts WHERE id=?').run(post.id);
  db.prepare('UPDATE threads SET post_count = post_count - 1 WHERE id=?').run(post.thread_id);
  db.prepare('UPDATE users SET post_count = post_count - 1 WHERE id=?').run(post.user_id);
  res.json({ ok: true });
});

// Mark best answer
router.post('/posts/:postId/best', authRequired, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.postId);
  if (!post) return res.status(404).json({ error: '评论不存在' });
  const thread = db.prepare('SELECT * FROM threads WHERE id=?').get(post.thread_id);
  if (thread.user_id !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) return res.status(403).json({ error: '无权操作' });
  db.prepare('UPDATE posts SET is_best_answer=0 WHERE thread_id=?').run(thread.id);
  db.prepare('UPDATE posts SET is_best_answer=1 WHERE id=?').run(post.id);
  db.prepare('UPDATE threads SET solved=1 WHERE id=?').run(thread.id);
  adjustReputation(post.user_id, req.user.id, 15, '最佳答案', 'post', post.id);
  createNotification(post.user_id, req.user.id, 'best_answer', 'post', post.id, `你的回答被选为最佳答案!`);
  res.json({ ok: true });
});

// Vote on poll
router.post('/:id/poll/vote', authRequired, (req, res) => {
  const thread = db.prepare('SELECT * FROM threads WHERE id=?').get(req.params.id);
  if (!thread || thread.type !== 'poll') return res.status(404).json({ error: '投票不存在' });
  const poll = db.prepare('SELECT * FROM polls WHERE thread_id=?').get(thread.id);
  if (!poll) return res.status(404).json({ error: '投票不存在' });
  const { optionIds } = req.body || {};
  const opts = Array.isArray(optionIds) ? optionIds : [optionIds];
  if (!opts.length) return res.status(400).json({ error: '请选择选项' });

  // remove existing votes
  db.prepare('DELETE FROM poll_votes WHERE user_id=? AND option_id IN (SELECT id FROM poll_options WHERE poll_id=?)').run(req.user.id, poll.id);
  for (const oid of opts) {
    const opt = db.prepare('SELECT * FROM poll_options WHERE id=? AND poll_id=?').get(oid, poll.id);
    if (opt) {
      db.prepare('INSERT OR IGNORE INTO poll_votes (user_id, option_id) VALUES (?,?)').run(req.user.id, oid);
      db.prepare('UPDATE poll_options SET vote_count = vote_count + 1 WHERE id=?').run(oid);
    }
  }
  const options = db.prepare('SELECT * FROM poll_options WHERE poll_id=?').all(poll.id);
  const totalVotes = options.reduce((s, o) => s + o.vote_count, 0);
  const userVotes = db.prepare('SELECT option_id FROM poll_votes WHERE user_id=? AND option_id IN (SELECT id FROM poll_options WHERE poll_id=?)').all(req.user.id, poll.id).map(v => v.option_id);
  res.json({ options, totalVotes, userVotes });
});

export default router;
