import db from './db.js';
import { publicUser } from './middleware/auth.js';

// Add computed fields to a thread row
export function decorateThread(t, currentUserId) {
  if (!t) return null;
  let bookmarked = false;
  let userReaction = null;
  if (currentUserId) {
    const bm = db.prepare('SELECT 1 FROM bookmarks WHERE user_id=? AND thread_id=?').get(currentUserId, t.id);
    bookmarked = !!bm;
    const rx = db.prepare('SELECT type FROM reactions WHERE user_id=? AND target_type=? AND target_id=?').get(currentUserId, 'thread', t.id);
    userReaction = rx?.type || null;
  }
  const tags = db.prepare(`
    SELECT t.id, t.name, t.slug, t.color FROM tags t
    JOIN thread_tags tt ON tt.tag_id=t.id WHERE tt.thread_id=?`).all(t.id);
  const author = publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(t.user_id));
  const category = db.prepare('SELECT id, name, slug, color, icon FROM categories WHERE id=?').get(t.category_id);
  return {
    id: t.id,
    categoryId: t.category_id,
    userId: t.user_id,
    title: t.title,
    slug: t.slug,
    content: t.content,
    excerpt: t.excerpt || t.content.slice(0, 200),
    views: t.views,
    postCount: t.post_count,
    reactionCount: t.reaction_count,
    bookmarkCount: t.bookmark_count,
    pinned: !!t.pinned,
    locked: !!t.locked,
    solved: !!t.solved,
    featured: !!t.featured,
    type: t.type,
    lastPostAt: t.last_post_at,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    author,
    category,
    tags,
    bookmarked,
    userReaction,
  };
}

export function decoratePost(p, currentUserId) {
  if (!p) return null;
  let userReaction = null;
  if (currentUserId) {
    const rx = db.prepare('SELECT type FROM reactions WHERE user_id=? AND target_type=? AND target_id=?').get(currentUserId, 'post', p.id);
    userReaction = rx?.type || null;
  }
  const author = publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(p.user_id));
  const reactions = db.prepare(`
    SELECT type, COUNT(*) as count FROM reactions WHERE target_type='post' AND target_id=? GROUP BY type`).all(p.id);
  return {
    id: p.id,
    threadId: p.thread_id,
    userId: p.user_id,
    parentId: p.parent_id,
    content: p.content,
    reactionCount: p.reaction_count,
    isBestAnswer: !!p.is_best_answer,
    edited: !!p.edited,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    author,
    reactions,
    userReaction,
  };
}

export function decorateNotification(n) {
  if (!n) return null;
  return {
    id: n.id,
    userId: n.user_id,
    actor: publicUser(n.actor_id ? db.prepare('SELECT * FROM users WHERE id=?').get(n.actor_id) : null),
    type: n.type,
    targetType: n.target_type,
    targetId: n.target_id,
    content: n.content,
    read: !!n.read,
    createdAt: n.created_at,
  };
}

export function createNotification(userId, actorId, type, targetType, targetId, content) {
  if (userId === actorId) return; // don't notify self
  db.prepare(`INSERT INTO notifications (user_id, actor_id, type, target_type, target_id, content)
    VALUES (?,?,?,?,?,?)`).run(userId, actorId, type, targetType, targetId, content || '');
  return { userId, type, targetType, targetId, content };
}

export function adjustReputation(userId, actorId, amount, reason, targetType, targetId) {
  db.prepare('UPDATE users SET reputation = reputation + ? WHERE id=?').run(amount, userId);
  db.prepare(`INSERT INTO reputation_log (user_id, actor_id, amount, reason, target_type, target_id)
    VALUES (?,?,?,?,?,?)`).run(userId, actorId, amount, reason, targetType || null, targetId || null);
}

export function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'thread-' + Date.now();
}

export function ensureTag(name) {
  const slug = slugify(name);
  let tag = db.prepare('SELECT * FROM tags WHERE slug=?').get(slug);
  if (!tag) {
    const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ef4444', '#14b8a6'];
    const info = db.prepare('INSERT INTO tags (name, slug, color) VALUES (?,?,?)').run(name, slug, colors[Math.floor(Math.random() * colors.length)]);
    tag = db.prepare('SELECT * FROM tags WHERE id=?').get(info.lastInsertRowid);
  }
  return tag;
}
