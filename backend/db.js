import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'ysforum.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============ SCHEMA ============
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  display_name TEXT,
  avatar TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  signature TEXT DEFAULT '',
  role TEXT DEFAULT 'member',            -- member | moderator | admin
  reputation INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  thread_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'online',           -- online | away | busy | offline
  title TEXT DEFAULT '',                  -- custom title
  location TEXT DEFAULT '',
  website TEXT DEFAULT '',
  last_seen INTEGER,
  banned INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'folder',
  color TEXT DEFAULT '#6366f1',
  parent_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  thread_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  color TEXT DEFAULT '#6366f1',
  usage_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,                  -- markdown
  excerpt TEXT DEFAULT '',
  views INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  reaction_count INTEGER DEFAULT 0,
  bookmark_count INTEGER DEFAULT 0,
  pinned INTEGER DEFAULT 0,
  locked INTEGER DEFAULT 0,
  solved INTEGER DEFAULT 0,
  featured INTEGER DEFAULT 0,
  type TEXT DEFAULT 'discussion',         -- discussion | question | guide | poll | announcement
  last_post_at INTEGER DEFAULT (strftime('%s','now')),
  last_post_user_id INTEGER,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_threads_category ON threads(category_id);
CREATE INDEX IF NOT EXISTS idx_threads_user ON threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_pinned ON threads(pinned);
CREATE INDEX IF NOT EXISTS idx_threads_last_post ON threads(last_post_at);

CREATE TABLE IF NOT EXISTS thread_tags (
  thread_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (thread_id, tag_id),
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  parent_id INTEGER,                      -- for nested replies
  content TEXT NOT NULL,                  -- markdown
  reaction_count INTEGER DEFAULT 0,
  is_best_answer INTEGER DEFAULT 0,
  edited INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES posts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_posts_thread ON posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);

CREATE TABLE IF NOT EXISTS reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  target_type TEXT NOT NULL,              -- thread | post
  target_id INTEGER NOT NULL,
  type TEXT NOT NULL,                     -- like | love | haha | wow | sad | angry | fire | brain
  created_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(user_id, target_type, target_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  thread_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(user_id, thread_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS follows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  follower_id INTEGER NOT NULL,
  following_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(follower_id, following_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,               -- recipient
  actor_id INTEGER,                       -- who triggered
  type TEXT NOT NULL,                     -- reply | reaction | mention | follow | message | system | best_answer | badge
  target_type TEXT,                       -- thread | post | user | message
  target_id INTEGER,
  content TEXT DEFAULT '',
  read INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  last_read_at INTEGER DEFAULT 0,
  PRIMARY KEY (conversation_id, user_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'hash',
  type TEXT DEFAULT 'public',             -- public | private
  created_by INTEGER,
  member_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room_id, created_at);

CREATE TABLE IF NOT EXISTS chat_room_members (
  room_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  joined_at INTEGER DEFAULT (strftime('%s','now')),
  PRIMARY KEY (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS polls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  multi_vote INTEGER DEFAULT 0,
  expires_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS poll_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  vote_count INTEGER DEFAULT 0,
  FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS poll_votes (
  user_id INTEGER NOT NULL,
  option_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  PRIMARY KEY (user_id, option_id),
  FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'award',
  color TEXT DEFAULT '#f59e0b',
  tier TEXT DEFAULT 'bronze',             -- bronze | silver | gold | platinum
  criteria TEXT DEFAULT '',
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id INTEGER NOT NULL,
  badge_id INTEGER NOT NULL,
  awarded_at INTEGER DEFAULT (strftime('%s','now')),
  PRIMARY KEY (user_id, badge_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  location TEXT DEFAULT '',
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  max_attendees INTEGER,
  color TEXT DEFAULT '#6366f1',
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event_attendees (
  event_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT DEFAULT 'going',            -- going | interested
  PRIMARY KEY (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reputation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  actor_id INTEGER,
  amount INTEGER NOT NULL,
  reason TEXT DEFAULT '',
  target_type TEXT,
  target_id INTEGER,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER NOT NULL,
  target_type TEXT NOT NULL,              -- thread | post | user | message
  target_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'open',             -- open | resolved | dismissed
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id INTEGER,
  details TEXT DEFAULT '',
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);
`);

// Full-text search virtual table for threads
db.exec(`
CREATE VIRTUAL TABLE IF NOT EXISTS threads_fts USING fts5(
  title, content, content='threads', content_rowid='id'
);
`);
// Triggers to keep FTS in sync
db.exec(`
CREATE TRIGGER IF NOT EXISTS threads_ai AFTER INSERT ON threads BEGIN
  INSERT INTO threads_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
CREATE TRIGGER IF NOT EXISTS threads_ad AFTER DELETE ON threads BEGIN
  INSERT INTO threads_fts(threads_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
END;
CREATE TRIGGER IF NOT EXISTS threads_au AFTER UPDATE ON threads BEGIN
  INSERT INTO threads_fts(threads_fts, rowid, title, content) VALUES('delete', old.id, old.title, old.content);
  INSERT INTO threads_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
`);

export default db;
