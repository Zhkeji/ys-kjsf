import { Router } from 'express';
import db from '../db.js';
import { authRequired, adminRequired } from '../middleware/auth.js';

const router = Router();

router.get('/', (req, res) => {
  const cats = db.prepare('SELECT * FROM categories ORDER BY sort_order, id').all();
  res.json({ items: cats });
});

router.get('/:slug', (req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE slug=?').get(req.params.slug);
  if (!cat) return res.status(404).json({ error: '版块不存在' });
  res.json(cat);
});

router.post('/', authRequired, adminRequired, (req, res) => {
  const { name, slug, description, icon, color, parentId, sortOrder } = req.body || {};
  if (!name) return res.status(400).json({ error: '请填写名称' });
  const s = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
  const info = db.prepare('INSERT INTO categories (name, slug, description, icon, color, parent_id, sort_order) VALUES (?,?,?,?,?,?,?)')
    .run(name, s, description || '', icon || 'folder', color || '#6366f1', parentId || null, sortOrder || 0);
  res.json(db.prepare('SELECT * FROM categories WHERE id=?').get(info.lastInsertRowid));
});

router.put('/:id', authRequired, adminRequired, (req, res) => {
  const { name, description, icon, color, sortOrder } = req.body || {};
  db.prepare('UPDATE categories SET name=COALESCE(?,name), description=COALESCE(?,description), icon=COALESCE(?,icon), color=COALESCE(?,color), sort_order=COALESCE(?,sort_order) WHERE id=?')
    .run(name, description, icon, color, sortOrder, req.params.id);
  res.json(db.prepare('SELECT * FROM categories WHERE id=?').get(req.params.id));
});

router.delete('/:id', authRequired, adminRequired, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
