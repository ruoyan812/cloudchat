-- 分享对话记录表
-- 创建分享需登录；查看链接完全公开（任何人凭 ID 即可读取）

CREATE TABLE IF NOT EXISTS shares (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  messages    TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL DEFAULT 0  -- 0 表示永久有效
);

CREATE INDEX IF NOT EXISTS idx_shares_user ON shares(user_id);
