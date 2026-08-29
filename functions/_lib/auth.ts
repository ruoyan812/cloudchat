/**
 * 认证与共享工具：密码哈希（PBKDF2）、会话管理、Cookie 解析
 * 注：位于 _lib 目录下，不会被当作 Pages 路由编译。
 */

export interface UserRow {
  id: string;
  username: string;
  role: 'admin' | 'user';
  nickname?: string;
  avatar?: string | null;
  oauthProvider?: string | null;
  /** 是否已设置密码（OAuth 用户默认无密码） */
  hasPassword?: boolean;
}

/** 公开用户信息（返回给前端的结构） */
export interface PublicUser {
  id: string;
  username: string;
  nickname: string;
  role: 'admin' | 'user';
  avatar: string | null;
  hasPassword: boolean;
  oauthLinks: string[];
}

export interface Env {
  DB: D1Database;
}

export const SESSION_COOKIE = 'yanverse_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 天

const enc = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function generateSalt(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
}

export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

/** 生成「盐(32位hex) + 哈希(64位hex)」拼接串，存入数据库 */
export async function createPasswordRecord(password: string): Promise<string> {
  const salt = generateSalt();
  const hash = await hashPassword(password, salt);
  return salt + hash;
}

/** 校验密码是否匹配 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // 正常哈希记录长度为 96（盐 32 + 哈希 64）；OAuth 占位符等非法记录直接拒绝
  if (stored.length < 96) return false;
  const salt = stored.slice(0, 32);
  const hash = await hashPassword(password, salt);
  return constantTimeEqual(hash, stored.slice(32));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function generateToken(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = generateToken();
  const now = Date.now();
  await db
    .prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(token, userId, now, now + SESSION_TTL_SECONDS * 1000)
    .run();
  return token;
}

export async function destroySession(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(value);
      } catch {
        out[key] = value;
      }
    }
  }
  return out;
}

export async function getUserFromRequest(env: Env, request: Request): Promise<UserRow | null> {
  const cookies = parseCookies(request.headers.get('Cookie'));
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.id, u.username, u.role, u.nickname, u.avatar, u.oauth_provider, u.password_hash
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
  )
    .bind(token, Date.now())
    .first();
  if (!row) return null;
  return {
    id: String(row.id),
    username: String(row.username),
    role: row.role === 'admin' ? 'admin' : 'user',
    nickname: row.nickname ? String(row.nickname) : String(row.username),
    avatar: row.avatar ? String(row.avatar) : null,
    oauthProvider: row.oauth_provider ? String(row.oauth_provider) : null,
    hasPassword: String(row.password_hash ?? '').length >= 96,
  };
}

export async function getUserById(db: D1Database, id: string): Promise<UserRow | null> {
  const row = await db
    .prepare(
      'SELECT id, username, role, nickname, avatar, oauth_provider, password_hash FROM users WHERE id = ?',
    )
    .bind(id)
    .first();
  if (!row) return null;
  return {
    id: String(row.id),
    username: String(row.username),
    role: row.role === 'admin' ? 'admin' : 'user',
    nickname: row.nickname ? String(row.nickname) : String(row.username),
    avatar: row.avatar ? String(row.avatar) : null,
    oauthProvider: row.oauth_provider ? String(row.oauth_provider) : null,
    hasPassword: String(row.password_hash ?? '').length >= 96,
  };
}

/** 查询用户已绑定的 OAuth 提供商列表 */
export async function getOAuthLinks(db: D1Database, userId: string): Promise<string[]> {
  const { results } = await db
    .prepare('SELECT provider FROM oauth_links WHERE user_id = ? ORDER BY created_at')
    .bind(userId)
    .all();
  return results.map((r) => String(r.provider));
}

/** 组装公开用户信息（昵称、密码状态、OAuth 绑定列表） */
export async function serializeUser(db: D1Database, row: UserRow): Promise<PublicUser> {
  const links = await getOAuthLinks(db, row.id);
  return {
    id: row.id,
    username: row.username,
    nickname: row.nickname || row.username,
    role: row.role,
    avatar: row.avatar ?? null,
    hasPassword: !!row.hasPassword,
    oauthLinks: links,
  };
}

/** 仅返回管理员用户，非管理员返回 null */
export async function getAdminFromRequest(
  env: Env,
  request: Request,
): Promise<UserRow | null> {
  const user = await getUserFromRequest(env, request);
  if (!user || user.role !== 'admin') return null;
  return user;
}

export function isSecureRequest(request: Request): boolean {
  return request.url.startsWith('https://');
}

export function setSessionCookie(response: Response, token: string, secure: boolean): Response {
  response.headers.append(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${
      secure ? '; Secure' : ''
    }`,
  );
  return response;
}

export function clearSessionCookie(response: Response): Response {
  response.headers.append(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  return response;
}

export function json(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return Response.json(data, { status, headers: extraHeaders });
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}
