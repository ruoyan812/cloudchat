-- 用户邮箱：用于 OAuth 登录时检测/绑定现有账号
ALTER TABLE users ADD COLUMN email TEXT;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
