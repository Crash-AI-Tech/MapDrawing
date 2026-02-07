-- D1 初始化迁移 (SQLite)
-- 创建用户、会话、笔画三张核心表

-- =====================
-- 用户表
-- =====================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  user_name TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- =====================
-- Session 表 (Lucia Auth)
-- =====================
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- =====================
-- 笔画数据表
-- =====================
CREATE TABLE IF NOT EXISTS drawings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  brush_id TEXT NOT NULL DEFAULT 'pencil',
  color TEXT NOT NULL DEFAULT '#000000',
  opacity REAL NOT NULL DEFAULT 1.0,
  size REAL NOT NULL DEFAULT 1.0,
  points TEXT NOT NULL,         -- JSON 数组
  min_lat REAL NOT NULL,
  max_lat REAL NOT NULL,
  min_lng REAL NOT NULL,
  max_lng REAL NOT NULL,
  center_lat REAL NOT NULL,
  center_lng REAL NOT NULL,
  created_zoom INTEGER NOT NULL DEFAULT 18,
  meta TEXT,                    -- JSON 对象
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 空间查询索引 (边界框)
CREATE INDEX IF NOT EXISTS idx_drawings_bounds ON drawings(min_lng, max_lng, min_lat, max_lat);

-- 用户索引
CREATE INDEX IF NOT EXISTS idx_drawings_user ON drawings(user_id);

-- 时间索引
CREATE INDEX IF NOT EXISTS idx_drawings_created ON drawings(created_at DESC);
