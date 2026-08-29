-- 用户角色与 OAuth 支持
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN oauth_provider TEXT;
ALTER TABLE users ADD COLUMN oauth_id TEXT;
ALTER TABLE users ADD COLUMN avatar TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id) WHERE oauth_id IS NOT NULL;

-- OAuth 提供商配置（client_secret 仅管理员可读写）
CREATE TABLE IF NOT EXISTS oauth_providers (
  provider TEXT PRIMARY KEY,
  client_id TEXT NOT NULL DEFAULT '',
  client_secret TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO oauth_providers (provider, client_id, client_secret, enabled, updated_at)
VALUES ('github', '', '', 0, 0), ('google', '', '', 0, 0);
