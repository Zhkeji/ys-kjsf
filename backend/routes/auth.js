import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { signToken, authRequired, publicUser } from '../middleware/auth.js';

const router = Router();

router.post('/register', (req, res) => {
  const { username, email, password, displayName } = req.body || {};
  if (!username || !email || !password) return res.status(400).json({ error: '请填写所有必填字段' });
  if (username.length < 2 || username.length > 20) return res.status(400).json({ error: '用户名长度需2-20个字符' });
  if (password.length < 6) return res.status(400).json({ error: '密码至少6个字符' });
  if (db.prepare('SELECT id FROM users WHERE username=?').get(username)) return res.status(409).json({ error: '用户名已被占用' });
  if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) return res.status(409).json({ error: '邮箱已被注册' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (username, email, password, display_name) VALUES (?,?,?,?)')
    .run(username, email, hash, displayName || username);
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid);

  // Award welcome badge if exists
  const welcomeBadge = db.prepare("SELECT id FROM badges WHERE slug='welcome'").get();
  if (welcomeBadge) db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?,?)').run(user.id, welcomeBadge.id);

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { login, password, scope } = req.body || {};
  if (!login || !password) return res.status(400).json({ error: '请输入账号和密码' });
  const user = db.prepare('SELECT * FROM users WHERE username=? OR email=?').get(login, login);
  if (!user) return res.status(401).json({ error: '账号不存在' });
  if (user.banned) return res.status(403).json({ error: '账号已被封禁' });
  if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: '密码错误' });

  // 三端分开：按入口校验角色权限
  if (scope === 'admin' && user.role !== 'admin') {
    return res.status(403).json({ error: '该账号无管理员权限，请前往用户端登录' });
  }
  if (scope === 'moderator' && !['admin', 'moderator'].includes(user.role)) {
    return res.status(403).json({ error: '该账号无版主权限，请前往用户端登录' });
  }

  db.prepare("UPDATE users SET status='online', last_seen=? WHERE id=?").run(Math.floor(Date.now() / 1000), user.id);
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get('/me', authRequired, (req, res) => {
  const badges = db.prepare(`
    SELECT b.* FROM badges b JOIN user_badges ub ON ub.badge_id=b.id WHERE ub.user_id=?`).all(req.user.id);
  res.json({ ...publicUser(req.user), badges });
});

router.put('/me', authRequired, (req, res) => {
  const { displayName, bio, signature, title, location, website, avatar } = req.body || {};
  db.prepare(`UPDATE users SET display_name=?, bio=?, signature=?, title=?, location=?, website=?, avatar=?, updated_at=? WHERE id=?`)
    .run(displayName || req.user.display_name, bio ?? req.user.bio, signature ?? req.user.signature,
         title ?? req.user.title, location ?? req.user.location, website ?? req.user.website,
         avatar ?? req.user.avatar, Math.floor(Date.now() / 1000), req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  res.json(publicUser(user));
});

router.put('/password', authRequired, (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!bcrypt.compareSync(oldPassword, req.user.password)) return res.status(401).json({ error: '原密码错误' });
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: '新密码至少6个字符' });
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password=? WHERE id=?').run(hash, req.user.id);
  res.json({ ok: true });
});

router.put('/status', authRequired, (req, res) => {
  const { status } = req.body || {};
  const valid = ['online', 'away', 'busy', 'offline'];
  if (!valid.includes(status)) return res.status(400).json({ error: '无效状态' });
  db.prepare('UPDATE users SET status=?, last_seen=? WHERE id=?').run(status, Math.floor(Date.now() / 1000), req.user.id);
  res.json({ ok: true });
});

export default router;
