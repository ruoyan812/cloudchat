import type { User } from './auth';
import type { AdminModel } from './models';

export interface OAuthProviderConfig {
  provider: string;
  displayName: string;
  clientId: string;
  clientSecret: string;
  enabled: boolean;
  updatedAt: number;
}

/** 读取全部模型配置（含未启用，仅管理员） */
export async function fetchAdminModels(): Promise<AdminModel[]> {
  const res = await fetch('/api/admin/models');
  const data = await handle<{ models: AdminModel[] }>(res);
  return data.models ?? [];
}

/** 批量保存模型配置（apiKey 留空表示不修改） */
export async function saveAdminModels(models: AdminModel[]): Promise<void> {
  const res = await fetch('/api/admin/models', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      models: models.map((m) => ({
        id: m.id,
        provider: m.provider,
        label: m.label,
        modelName: m.modelName,
        baseUrl: m.baseUrl,
        apiKey: m.apiKey,
        enabled: m.enabled,
        sortOrder: m.sortOrder,
      })),
    }),
  });
  await handle<{ ok: boolean }>(res);
}

/** 删除指定模型 */
export async function deleteAdminModel(id: string): Promise<void> {
  const res = await fetch(`/api/admin/models/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  await handle<{ ok: boolean }>(res);
}

export interface AdminUser {
  id: string;
  username: string;
  nickname: string;
  email: string | null;
  role: 'admin' | 'user';
  oauthProvider: string | null;
  avatar: string | null;
  createdAt: number;
}

async function handle<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(data.error || `请求失败（HTTP ${res.status}）`);
  }
  return data;
}

/** 读取 OAuth 配置（含密钥，仅管理员） */
export async function fetchOAuthConfig(): Promise<OAuthProviderConfig[]> {
  const res = await fetch('/api/admin/oauth');
  const data = await handle<{ providers: OAuthProviderConfig[] }>(res);
  return data.providers ?? [];
}

/** 保存 OAuth 配置（clientSecret 留空表示不修改） */
export async function saveOAuthConfig(
  providers: Array<Pick<OAuthProviderConfig, 'provider' | 'clientId' | 'clientSecret' | 'enabled'>>,
): Promise<void> {
  const res = await fetch('/api/admin/oauth', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ providers }),
  });
  await handle<{ ok: boolean }>(res);
}

/** 获取用户列表 */
export async function fetchUsers(): Promise<AdminUser[]> {
  const res = await fetch('/api/admin/users');
  const data = await handle<{ users: AdminUser[] }>(res);
  return data.users ?? [];
}

/** 创建用户（OAuth 绑定用户可不填密码；邮箱必填） */
export async function createAdminUser(input: {
  username: string;
  email: string;
  password?: string;
  role: 'admin' | 'user';
  oauthProvider?: string;
  oauthId?: string;
}): Promise<AdminUser> {
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await handle<{ user: AdminUser }>(res);
  return data.user;
}

/** 修改用户：仅传需要变更的字段；password 非空则重置密码 */
export async function updateAdminUser(
  id: string,
  input: { username?: string; email?: string; nickname?: string; password?: string },
): Promise<AdminUser> {
  const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await handle<{ user: AdminUser }>(res);
  return data.user;
}

/** 删除用户 */
export async function deleteAdminUser(id: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  await handle<{ ok: boolean }>(res);
}

export type { User as AdminAuthUser };
