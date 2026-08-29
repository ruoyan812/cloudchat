export interface User {
  id: string;
  username: string;
  /** 页面显示名（默认等于用户名） */
  nickname: string;
  role?: 'admin' | 'user';
  avatar?: string | null;
  /** 是否已设置密码（OAuth 用户默认无） */
  hasPassword?: boolean;
  /** 已绑定的 OAuth 提供商列表 */
  oauthLinks?: string[];
}

export interface OAuthProviderInfo {
  provider: string;
  displayName: string;
  loginUrl: string;
}

async function handle<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(data.error || `请求失败（HTTP ${res.status}）`);
  }
  return data;
}

export async function register(username: string, email: string, password: string): Promise<User> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await handle<{ user: User }>(res);
  return data.user;
}

/** identifier 支持用户名或邮箱 */
export async function login(identifier: string, password: string): Promise<User> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const data = await handle<{ user: User }>(res);
  return data.user;
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export async function getMe(): Promise<User | null> {
  const res = await fetch('/api/auth/me');
  const data = await handle<{ user: User | null }>(res);
  return data.user ?? null;
}

/** 获取已启用的 OAuth 提供商（供登录弹窗渲染按钮） */
export async function fetchOAuthProviders(): Promise<OAuthProviderInfo[]> {
  const res = await fetch('/api/oauth/providers');
  const data = await handle<{ providers: OAuthProviderInfo[] }>(res);
  return data.providers ?? [];
}

/** 修改昵称 */
export async function updateProfile(nickname: string): Promise<User> {
  const res = await fetch('/api/auth/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  const data = await handle<{ user: User }>(res);
  return data.user;
}

/** 修改密码：已有密码需传旧密码，OAuth 用户无密码时 oldPassword 传空 */
export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  const res = await fetch('/api/auth/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPassword, newPassword }),
  });
  await handle<{ ok: true }>(res);
}
