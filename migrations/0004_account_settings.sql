-- 账户设置：昵称（页面显示名，默认=用户名）+ OAuth 多账号绑定表

ALTER TABLE users ADD COLUMN nickname TEXT NOT NULL DEFAULT '';
UPDATE users SET nickname = username WHERE nickname = '';

CREATE TABLE IF NOT EXISTS oauth_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  oauth_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(provider, oauth_id)
);
CREATE INDEX IF NOT EXISTS idx_oauth_links_user ON oauth_links(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_links_provider ON oauth_links(provider, oauth_id);

-- 将 users 表旧的单绑定数据迁移到 oauth_links
INSERT OR IGNORE INTO oauth_links (id, user_id, provider, oauth_id, created_at)
SELECT 'legacy-' || id, id, oauth_provider, oauth_id, created_at FROM users
WHERE oauth_provider IS NOT NULL AND oauth_provider != '' AND oauth_id IS NOT NULL AND oauth_id != '';
