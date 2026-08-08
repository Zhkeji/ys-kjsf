import db from './db.js';
import bcrypt from 'bcryptjs';
import { ensureTag, slugify } from './helpers.js';

export function seed() {
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count > 0) return; // already seeded

  const hash = bcrypt.hashSync('password', 10);

  // ============ USERS ============
  const users = [
    { username: 'admin', email: 'admin@ysforum.com', displayName: 'YS管理员', role: 'admin', reputation: 9999, title: '系统管理员', bio: 'YS论坛创始人，致力于打造最好的社区。', signature: '构建连接思想的桥梁 ✦', location: '上海', website: 'https://ysforum.com' },
    { username: 'nova_dev', email: 'nova@ysforum.com', displayName: 'Nova开发者', role: 'moderator', reputation: 5420, title: '技术版主', bio: '全栈工程师，开源爱好者。React / Node.js / Rust', signature: 'Code is poetry.', location: '深圳', website: 'https://github.com' },
    { username: 'luna_design', email: 'luna@ysforum.com', displayName: 'Luna设计', role: 'moderator', reputation: 4810, title: '设计版主', bio: 'UI/UX设计师，热爱创造美好的数字体验。', signature: 'Design is thinking made visual.', location: '杭州' },
    { username: 'kai_gamer', email: 'kai@ysforum.com', displayName: 'Kai玩家', role: 'member', reputation: 2340, title: '资深玩家', bio: '十年游戏龄，什么都玩。', location: '北京' },
    { username: 'aria_writer', email: 'aria@ysforum.com', displayName: 'Aria作者', role: 'member', reputation: 3120, title: '内容创作者', bio: '用文字记录世界的观察者。', signature: 'Words have power.' },
    { username: 'zen_coder', email: 'zen@ysforum.com', displayName: 'Zen极客', role: 'member', reputation: 1980, title: '后端工程师', bio: '分布式系统 / 数据库 / 性能优化' },
    { username: 'mira_ai', email: 'mira@ysforum.com', displayName: 'MiraAI', role: 'member', reputation: 4250, title: 'AI研究员', bio: '探索智能的边界。ML / DL / NLP', location: '硅谷' },
    { username: 'rex_traveler', email: 'rex@ysforum.com', displayName: 'Rex旅人', role: 'member', reputation: 1560, title: '旅行博主', bio: '足迹遍布40个国家。' },
    { username: 'sora_music', email: 'sora@ysforum.com', displayName: 'Sora音乐', role: 'member', reputation: 2890, title: '音乐人', bio: '独立音乐制作人，电子音乐爱好者。' },
    { username: 'fin_chef', email: 'fin@ysforum.com', displayName: 'Fin主厨', role: 'member', reputation: 1340, title: '美食家', bio: '用代码写菜谱的程序员厨师。' },
  ];

  const userIds = {};
  for (const u of users) {
    const info = db.prepare('INSERT INTO users (username, email, password, display_name, role, reputation, title, bio, signature, location, website) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .run(u.username, u.email, hash, u.displayName, u.role, u.reputation, u.title, u.bio, u.signature, u.location || '', u.website || '');
    userIds[u.username] = info.lastInsertRowid;
    db.prepare("UPDATE users SET status='online', last_seen=? WHERE id=?").run(Math.floor(Date.now()/1000), info.lastInsertRowid);
  }

  // ============ BADGES ============
  const badges = [
    { name: '欢迎加入', slug: 'welcome', icon: 'hand', color: '#10b981', tier: 'bronze', description: '注册成为YS论坛会员', criteria: '注册账号' },
    { name: '初出茅庐', slug: 'first-post', icon: 'message-circle', color: '#3b82f6', tier: 'bronze', description: '发布第一条内容', criteria: '发布1条内容' },
    { name: '话唠达人', slug: 'chatterbox', icon: 'messages-square', color: '#8b5cf6', tier: 'silver', description: '发布50条评论', criteria: '50条评论' },
    { name: '人气之星', slug: 'popular', icon: 'flame', color: '#ef4444', tier: 'silver', description: '获得100个反应', criteria: '100个反应' },
    { name: '知识渊博', slug: 'expert', icon: 'brain', color: '#f59e0b', tier: 'gold', description: '获得10个最佳答案', criteria: '10个最佳答案' },
    { name: '社区支柱', slug: 'pillar', icon: 'crown', color: '#eab308', tier: 'platinum', description: '声望达到5000', criteria: '声望≥5000' },
    { name: '创意先锋', slug: 'creative', icon: 'sparkles', color: '#ec4899', tier: 'gold', description: '发布5篇精华帖', criteria: '5篇精华' },
    { name: '乐于助人', slug: 'helper', icon: 'heart-handshake', color: '#06b6d4', tier: 'silver', description: '帮助50位用户', criteria: '50个最佳答案/反应' },
  ];
  for (const b of badges) {
    db.prepare('INSERT INTO badges (name, slug, description, icon, color, tier, criteria) VALUES (?,?,?,?,?,?,?)').run(b.name, b.slug, b.description, b.icon, b.color, b.tier, b.criteria);
  }
  // award some badges
  db.prepare('INSERT INTO user_badges (user_id, badge_id) VALUES (?,?)').run(userIds.admin, 6);
  db.prepare('INSERT INTO user_badges (user_id, badge_id) VALUES (?,?)').run(userIds.nova_dev, 4);
  db.prepare('INSERT INTO user_badges (user_id, badge_id) VALUES (?,?)').run(userIds.nova_dev, 5);
  db.prepare('INSERT INTO user_badges (user_id, badge_id) VALUES (?,?)').run(userIds.mira_ai, 5);
  db.prepare('INSERT INTO user_badges (user_id, badge_id) VALUES (?,?)').run(userIds.luna_design, 7);

  // ============ CATEGORIES ============
  const categories = [
    { name: '技术分享', slug: 'tech', description: '编程、开发、架构等技术讨论', icon: 'code-2', color: '#6366f1' },
    { name: '前端开发', slug: 'frontend', description: 'React, Vue, CSS, 等前端技术', icon: 'layout', color: '#06b6d4', parentSlug: 'tech' },
    { name: '后端开发', slug: 'backend', description: 'Node.js, Python, Go, 数据库等', icon: 'server', color: '#10b981', parentSlug: 'tech' },
    { name: '移动开发', slug: 'mobile', description: 'iOS, Android, 跨平台开发', icon: 'smartphone', color: '#8b5cf6', parentSlug: 'tech' },
    { name: 'AI与机器学习', slug: 'ai', description: '人工智能、深度学习、大模型', icon: 'brain-circuit', color: '#ec4899' },
    { name: '设计创意', slug: 'design', description: 'UI/UX、平面设计、创意分享', icon: 'palette', color: '#f59e0b' },
    { name: '游戏天地', slug: 'gaming', description: '游戏推荐、评测、讨论', icon: 'gamepad-2', color: '#ef4444' },
    { name: '生活随想', slug: 'lifestyle', description: '旅行、美食、音乐、生活分享', icon: 'coffee', color: '#14b8a6' },
    { name: '站务公告', slug: 'announcements', description: '论坛公告与反馈', icon: 'megaphone', color: '#64748b' },
  ];
  const catIds = {};
  for (const c of categories) {
    const parentId = c.parentSlug ? catIds[c.parentSlug] : null;
    const info = db.prepare('INSERT INTO categories (name, slug, description, icon, color, parent_id, sort_order) VALUES (?,?,?,?,?,?,?)')
      .run(c.name, c.slug, c.description, c.icon, c.color, parentId, Object.keys(catIds).length);
    catIds[c.slug] = info.lastInsertRowid;
  }

  // ============ CHAT ROOMS ============
  const rooms = [
    { name: '综合大厅', description: '啥都聊的地方', icon: 'message-square' },
    { name: '技术交流', description: '技术问题与分享', icon: 'code' },
    { name: '灌水摸鱼', description: '日常闲聊', icon: 'fish' },
    { name: '求助问答', description: '有问题来这里', icon: 'help-circle' },
  ];
  for (const r of rooms) {
    db.prepare('INSERT INTO chat_rooms (name, description, icon, created_by) VALUES (?,?,?,?)').run(r.name, r.description, r.icon, userIds.admin);
  }

  // ============ THREADS ============
  const now = Math.floor(Date.now() / 1000);
  const threads = [
    {
      author: 'admin', category: 'announcements', type: 'announcement', pinned: true, featured: true,
      title: '欢迎使用 YS 论坛系统 —— 重新定义社区体验',
      content: `# 欢迎来到 YS 论坛

YS 论坛是一款**全新一代**的社区系统，融合了传统论坛的深度讨论与现代社交的即时互动。

## ✨ 核心特性

- **实时聊天** — 多房间即时通讯，随时随地交流
- **私信系统** — 一对一加密私聊
- **丰富反应** — 8种表情反应，超越简单的点赞
- **声望系统** — 完整的声望与徽章体系
- **投票功能** — 内置投票，支持多选
- **标签体系** — 灵活的内容分类与发现
- **全文搜索** — 强大的智能搜索
- **活动日历** — 社区活动管理
- **暗黑模式** — 护眼的深色主题
- **@提及** — 轻松提及社区成员
- **最佳答案** — 问答模式专属功能

## 🚀 开始探索

注册账号后，你就可以发帖、回复、聊天、结识志同道合的朋友。

让我们一起，构建有温度的数字社区。`,
      tags: ['公告', '欢迎', '新手指南'],
      replies: [
        { author: 'nova_dev', content: '太棒了！界面非常漂亮，功能也很齐全。期待后续更新！' },
        { author: 'mira_ai', content: '实时聊天功能很实用，社区终于有了自己的即时通讯。' },
        { author: 'luna_design', content: '暗黑模式深得我心，设计师点赞 👏' },
      ],
    },
    {
      author: 'mira_ai', category: 'ai', type: 'guide', featured: true,
      title: '2026年大语言模型发展趋势深度解析',
      content: `# 2026 LLM 发展趋势

随着技术的飞速演进，大语言模型在2026年呈现出几个显著趋势：

## 1. 多模态融合深化

模型不再局限于文本，而是原生支持图像、音频、视频的理解与生成。**统一架构**成为主流。

## 2. 推理能力飞跃

通过**思维链**训练和强化学习，模型在数学、编程、逻辑推理上的表现接近甚至超越人类专家水平。

## 3. 个性化与记忆

长期记忆机制让模型能够真正"记住"用户偏好，提供持续个性化的服务。

## 4. 端侧部署普及

模型压缩技术进步，让百亿参数模型也能在消费级设备上流畅运行。

## 5. Agent 生态成熟

基于LLM的智能体从单任务走向多Agent协作，自主完成复杂工作流。

---

大家觉得哪个趋势最让你兴奋？欢迎讨论！`,
      tags: ['AI', '大模型', '深度学习', '趋势'],
      reactions: { fire: 12, brain: 8, like: 5 },
      replies: [
        { author: 'zen_coder', content: '端侧部署这块确实潜力巨大，隐私和延迟都是优势。' },
        { author: 'nova_dev', content: 'Agent生态是我最期待的，感觉会改变整个软件开发方式。' },
        { author: 'admin', content: '写得很好！已加精。' },
      ],
    },
    {
      author: 'nova_dev', category: 'frontend', type: 'question', pinned: true,
      title: 'React 19 的 use() Hook 有什么实际应用场景？',
      content: `最近在研究 React 19 的新特性，对 \`use()\` Hook 有点困惑。

从文档看，它可以读取 Promise 和 Context，但和 \`useEffect\` + \`useState\` 的组合相比，优势在哪里？

有没有实际项目中的例子？求大佬解答 🙏`,
      tags: ['React', '前端', '提问'],
      replies: [
        { author: 'zen_coder', content: '`use()` 最大的优势是可以在条件语句中调用（不像其他Hook必须在顶层）。配合 Suspense 可以优雅地处理异步数据加载，不用再写一堆 loading state。', bestAnswer: true },
        { author: 'mira_ai', content: '补充一点，`use()` 配合 Server Components 在 RSC 场景下体验非常好。' },
      ],
    },
    {
      author: 'luna_design', category: 'design', type: 'guide', featured: true,
      title: 'Glassmorphism 设计实战：如何做出高级感的毛玻璃效果',
      content: `# Glassmorphism 实战指南

毛玻璃效果（Glassmorphism）是近年来最流行的设计趋势之一。本文分享几个实战技巧。

## 核心三要素

1. **半透明背景** — \`background: rgba(255,255,255,0.1)\`
2. **背景模糊** — \`backdrop-filter: blur(12px)\`
3. **细微边框** — \`border: 1px solid rgba(255,255,255,0.2)\`

## 进阶技巧

- 配合渐变背景才能出效果
- 注意层级关系，模糊层要在彩色元素之上
- 添加微妙的光影增加立体感
- 暗色模式用 \`rgba(0,0,0,0.3)\` 替代

## 性能注意

\`backdrop-filter\` 在低端设备上可能卡顿，建议：
- 限制使用区域
- 提供 fallback
- 使用 \`will-change\` 优化

好的设计是在美感和性能间找到平衡。`,
      tags: ['设计', 'CSS', 'UI', '教程'],
      reactions: { love: 15, fire: 6, like: 10 },
      replies: [
        { author: 'aria_writer', content: '正好在做一个项目需要这个效果，太及时了！' },
        { author: 'kai_gamer', content: '暗色模式那段很有用，之前一直做不出高级感。' },
      ],
    },
    {
      author: 'kai_gamer', category: 'gaming', type: 'discussion',
      title: '2026年最期待的5款独立游戏盘点',
      content: `独立游戏永远充满惊喜。盘点一下我今年最期待的几款：

1. **星渊回响** — 太空生存探索，画面绝美
2. **织梦者** — 叙事冒险，美术风格独特
3. **机械之心** — 机甲动作RPG
4. **山海异闻录** — 国风开放世界
5. **霓虹余烬** — 赛博朋克平台跳跃

大家有补充的吗？`,
      tags: ['游戏', '独立游戏', '推荐'],
      reactions: { fire: 8, like: 12 },
      replies: [
        { author: 'sora_music', content: '霓虹余烬的音乐我预购了原声带，太赞了。' },
        { author: 'rex_traveler', content: '山海异闻录的国风美术确实吸引人。' },
      ],
    },
    {
      author: 'zen_coder', category: 'backend', type: 'guide',
      title: 'SQLite 能撑住多大的并发？实测数据分享',
      content: `# SQLite 并发性能实测

很多人觉得 SQLite 不适合生产环境，但 WAL 模式下的表现可能出乎你意料。

## 测试环境

- 4核8G 云服务器
- SQLite 3.45 + WAL 模式
- Node.js + better-sqlite3

## 结果

| 场景 | QPS |
|------|-----|
| 纯读 | ~80,000 |
| 读写混合 8:2 | ~12,000 |
| 纯写 | ~2,500 |

## 优化建议

1. 开启 WAL：\`PRAGMA journal_mode=WAL\`
2. 合理设置 \`busy_timeout\`
3. 批量写入用事务
4. 读多写少的场景，SQLite 真的很能打

对于中小型应用，SQLite 完全够用，省去了运维数据库的成本。`,
      tags: ['SQLite', '数据库', '后端', '性能'],
      reactions: { brain: 10, like: 7, fire: 3 },
      replies: [
        { author: 'nova_dev', content: 'WAL模式确实是关键，之前没开的时候并发写直接锁库了。' },
      ],
    },
    {
      author: 'aria_writer', category: 'lifestyle', type: 'discussion',
      title: '你最近读到的一本好书是什么？',
      content: `读书是最好的独处方式。分享一本最近读的好书：

**《思维的边界》** — 一本关于认知科学的科普书，用通俗的语言解释了人类思维的局限性。

最喜欢的一句话：「我们看到的不是世界本身，而是大脑构建的世界。」

大家最近在读什么？欢迎分享 📚`,
      tags: ['读书', '生活', '分享'],
      reactions: { like: 9, love: 4 },
      replies: [
        { author: 'mira_ai', content: '在读《人工智能简史》，推荐给对AI感兴趣的朋友。' },
        { author: 'fin_chef', content: '最近在看美食散文集《人间至味》，读完更饿了哈哈。' },
      ],
    },
    {
      author: 'fin_chef', category: 'lifestyle', type: 'discussion', featured: true,
      title: '程序员的一人食：15分钟搞定的高级晚餐',
      content: `# 15分钟蒜香黄油虾意面

加班狗也要好好吃饭。分享一道快手的意面：

## 食材
- 意面 100g
- 大虾 8只
- 蒜 4瓣
- 黄油 15g
- 白葡萄酒 30ml（可选）

## 步骤
1. 烧水煮意面（按包装时间少1分钟）
2. 虾去壳去虾线，蒜切末
3. 热锅黄油融化，爆香蒜末
4. 下虾煎至两面变色
5. 倒入白葡萄酒收汁
6. 意面捞出入锅拌匀，加盐黑胡椒调味

**总用时：15分钟。** 比外卖快，还好吃十倍。

程序员的厨房哲学：**复用、抽象、自动化**。`,
      tags: ['美食', '快手菜', '生活'],
      reactions: { love: 18, fire: 5, like: 11 },
      replies: [
        { author: 'kai_gamer', content: '看着就饿了，今晚就试试！' },
        { author: 'luna_design', content: '"程序员的厨房哲学"这段笑死，太真实了。' },
      ],
    },
    {
      author: 'sora_music', category: 'lifestyle', type: 'poll',
      title: '你平时听音乐用什么平台？',
      content: `音乐是我们生活的BGM。好奇大家平时主要用哪个平台听歌？

选择你最常用的一个（或多个），看看社区的偏好～`,
      tags: ['音乐', '投票', '生活'],
      poll: { question: '你最常用的音乐平台是？', options: ['Spotify', 'Apple Music', '网易云音乐', 'QQ音乐', 'YouTube Music', '其他'], multiVote: false },
      replies: [
        { author: 'kai_gamer', content: '网易云老用户了，评论区是灵魂。' },
        { author: 'mira_ai', content: 'Spotify的推荐算法确实强。' },
      ],
    },
    {
      author: 'rex_traveler', category: 'lifestyle', type: 'guide',
      title: '日本关西7日自由行完整攻略（2026版）',
      content: `# 关西7日自由行攻略

刚从日本回来，整理了一份详细攻略。

## 行程概览
- Day 1-2: 大阪（道顿堀、大阪城、环球影城）
- Day 3-4: 京都（清水寺、伏见稻荷、岚山）
- Day 5: 奈良（喂鹿、东大寺）
- Day 6-7: 神户（夜景、牛肉）

## 实用Tips
1. **交通**：买关西周游券，地铁JR随便坐
2. **支付**：现在很多地方支持支付宝/微信
3. **住宿**：推荐难波附近，交通枢纽
4. **美食**：一兰拉面排队太久，本地小店更好吃

详细的每日行程和花费我放在评论区了，有问题随时问！`,
      tags: ['旅行', '日本', '攻略'],
      reactions: { like: 14, love: 8, fire: 3 },
      replies: [],
    },
  ];

  for (const t of threads) {
    const authorId = userIds[t.author];
    const catId = catIds[t.category];
    const slug = slugify(t.title) + '-' + Math.random().toString(36).slice(2, 6);
    const excerpt = t.content.replace(/[#*`>\-\[\]\(\)!]/g, '').slice(0, 200);
    const tinfo = db.prepare(`INSERT INTO threads (category_id, user_id, title, slug, content, excerpt, type, pinned, featured, last_post_at, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(catId, authorId, t.title, slug, t.content, excerpt, t.type, t.pinned ? 1 : 0, t.featured ? 1 : 0, now - Math.floor(Math.random() * 86400 * 3), now - Math.floor(Math.random() * 86400 * 7));
    const threadId = tinfo.lastInsertRowid;

    // tags
    if (t.tags) {
      for (const tagName of t.tags) {
        const tag = ensureTag(tagName);
        db.prepare('INSERT OR IGNORE INTO thread_tags (thread_id, tag_id) VALUES (?,?)').run(threadId, tag.id);
        db.prepare('UPDATE tags SET usage_count = usage_count + 1 WHERE id=?').run(tag.id);
      }
    }

    // poll
    if (t.poll) {
      const pinfo = db.prepare('INSERT INTO polls (thread_id, question, multi_vote) VALUES (?,?,?)').run(threadId, t.poll.question, t.poll.multiVote ? 1 : 0);
      for (const opt of t.poll.options) {
        const oinfo = db.prepare('INSERT INTO poll_options (poll_id, text) VALUES (?,?)').run(pinfo.lastInsertRowid, opt);
        // add some random votes
        const votes = Math.floor(Math.random() * 15) + 1;
        db.prepare('UPDATE poll_options SET vote_count=? WHERE id=?').run(votes, oinfo.lastInsertRowid);
      }
    }

    // reactions
    if (t.reactions) {
      for (const [type, count] of Object.entries(t.reactions)) {
        for (let i = 0; i < count; i++) {
          const uids = Object.values(userIds);
          const uid = uids[Math.floor(Math.random() * uids.length)];
          db.prepare('INSERT OR IGNORE INTO reactions (user_id, target_type, target_id, type) VALUES (?,?,?,?)').run(uid, 'thread', threadId, type);
        }
        db.prepare('UPDATE threads SET reaction_count = reaction_count + ? WHERE id=?').run(count, threadId);
      }
    }

    // replies
    if (t.replies) {
      for (const r of t.replies) {
        const rAuthorId = userIds[r.author];
        const rinfo = db.prepare('INSERT INTO posts (thread_id, user_id, content, is_best_answer, created_at) VALUES (?,?,?,?,?)')
          .run(threadId, rAuthorId, r.content, r.bestAnswer ? 1 : 0, now - Math.floor(Math.random() * 86400 * 2));
        if (r.bestAnswer) {
          db.prepare('UPDATE threads SET solved=1 WHERE id=?').run(threadId);
        }
        db.prepare('UPDATE users SET post_count = post_count + 1 WHERE id=?').run(rAuthorId);
        // random reactions on replies
        const rc = Math.floor(Math.random() * 8);
        for (let i = 0; i < rc; i++) {
          const uids = Object.values(userIds);
          const uid = uids[Math.floor(Math.random() * uids.length)];
          const types = ['like', 'love', 'fire', 'brain'];
          db.prepare('INSERT OR IGNORE INTO reactions (user_id, target_type, target_id, type) VALUES (?,?,?,?)').run(uid, 'post', rinfo.lastInsertRowid, types[Math.floor(Math.random() * types.length)]);
        }
        db.prepare('UPDATE posts SET reaction_count=? WHERE id=?').run(rc, rinfo.lastInsertRowid);
      }
      const replyCount = t.replies.length;
      db.prepare('UPDATE threads SET post_count=?, last_post_at=? WHERE id=?').run(replyCount, now, threadId);
      db.prepare('UPDATE categories SET thread_count = thread_count + 1, post_count = post_count + ? WHERE id=?').run(replyCount, catId);
    } else {
      db.prepare('UPDATE categories SET thread_count = thread_count + 1 WHERE id=?').run(catId);
    }
    db.prepare('UPDATE users SET thread_count = thread_count + 1 WHERE id=?').run(authorId);
    db.prepare('UPDATE threads SET views=? WHERE id=?').run(Math.floor(Math.random() * 500) + 50, threadId);
  }

  // ============ EVENTS ============
  const events = [
    { author: 'admin', title: 'YS社区线上技术沙龙：全栈实战', description: '邀请社区技术达人分享全栈开发经验，含Q&A环节。', location: '线上 - 腾讯会议', startTime: now + 86400 * 3, color: '#6366f1' },
    { author: 'luna_design', title: '设计思维工作坊', description: '一起探索设计背后的思维方法论。', location: '线上 - Zoom', startTime: now + 86400 * 7, color: '#f59e0b' },
    { author: 'kai_gamer', title: '社区游戏之夜', description: '一起联机玩游戏，畅聊到深夜！', location: 'Discord', startTime: now + 86400 * 5, color: '#ef4444' },
  ];
  for (const e of events) {
    db.prepare('INSERT INTO events (user_id, title, description, location, start_time, color) VALUES (?,?,?,?,?,?)').run(userIds[e.author], e.title, e.description, e.location, e.startTime, e.color);
  }

  // ============ FOLLOWERS ============
  const followPairs = [
    ['nova_dev', 'admin'], ['luna_design', 'admin'], ['mira_ai', 'admin'],
    ['kai_gamer', 'nova_dev'], ['aria_writer', 'luna_design'], ['zen_coder', 'nova_dev'],
    ['mira_ai', 'nova_dev'], ['sora_music', 'aria_writer'], ['fin_chef', 'luna_design'],
    ['rex_traveler', 'aria_writer'], ['kai_gamer', 'mira_ai'], ['zen_coder', 'mira_ai'],
  ];
  for (const [follower, following] of followPairs) {
    db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?,?)').run(userIds[follower], userIds[following]);
  }

  console.log('✅ Seed data inserted successfully');
}
