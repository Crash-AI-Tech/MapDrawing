-- 邮箱验证 + 密码重置
-- 新增 email_verified 字段 + verification_codes 表

-- 用户表新增 email_verified 字段
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;

-- 验证码表 (邮箱验证 + 密码重置共用)
CREATE TABLE IF NOT EXISTS verification_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'email_verification',  -- email_verification | password_reset
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_verification_email ON verification_codes(email, type);
CREATE INDEX IF NOT EXISTS idx_verification_expires ON verification_codes(expires_at);
