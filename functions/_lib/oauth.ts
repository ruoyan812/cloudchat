/**
 * OAuth 登录共享逻辑：提供商配置读取、授权跳转、回调换取用户信息
 * 支持 GitHub / Google，配置存于 D1 oauth_providers 表，由管理员维护。
 */
import {
  createSession,
  setSessionCookie,
  parseCookies,
  getUserFromRequest,
  type Env,
} from './auth';

export type ProviderName = 'github' | 'google';

interface ProviderDef {
  displayName: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
}

const PROVIDER_DEFS: Record<ProviderName, ProviderDef> = {
  github: {
    displayName: 'GitHub',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scope: 'read:user user:email',
  },
  google: {
    displayName: 'Google',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    scope: 'openid email profile',
  },
};

export interface OAuthConfig {
  provider: ProviderName;
  displayName: string;
  clientId: string;
  clientSecret: string;
  enabled: boolean;
  updatedAt: number;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
}

export async function getOAuthConfig(db: D1Database, provider: ProviderName): Promise<OAuthConfig | null> {
  const row = await db
    .prepare('SELECT provider, client_id, client_secret, enabled, updated_at FROM oauth_providers WHERE provider = ?')
    .bind(provider)
    .first();
  if (!row) return null;
  const def = PROVIDER_DEFS[provider];
  return {
    provider,
    displayName: def.displayName,
    clientId: String(row.client_id ?? ''),
    clientSecret: String(row.client_secret ?? ''),
    enabled: Number(row.enabled) === 1,
    updatedAt: Number(row.updated_at ?? 0),
    authorizeUrl: def.authorizeUrl,
    tokenUrl: def.tokenUrl,
    userInfoUrl: def.userInfoUrl,
    scope: def.scope,
  };
}

export async function getOAuthConfigs(db: D1Database): Promise<OAuthConfig[]> {
  const { results } = await db.prepare('SELECT provider FROM oauth_providers').all();
  const out: OAuthConfig[] = [];
  for (const r of results) {
    const cfg = await getOAuthConfig(db, String(r.provider) as ProviderName);
    if (cfg) out.push(cfg);
  }
  return out;
}

function stateCookieName(provider: ProviderName): string {
  return `yanverse_oauth_${provider}`;
}

/** 发起授权：校验配置 → 生成 state → 302 跳转 */
export async function startOAuthLogin(
  env: Env,
  request: Request,
  provider: ProviderName,
): Promise<Response> {
  const cfg = await getOAuthConfig(env.DB, provider);
  const origin = new URL(request.url).origin;
  const failUrl = `${origin}/?oauth=not_configured`;

  if (!cfg || !cfg.enabled || !cfg.clientId) {
    return Response.redirect(failUrl, 302);
  }

  const stateBytes = crypto.getRandomValues(new Uint8Array(16));
  const state = Array.from(stateBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // 已登录 → 绑定模式（把 OAuth 身份绑定到当前账号）；未登录 → 登录模式
  const current = await getUserFromRequest(env, request);
  const mode = current ? 'bind' : 'login';

  const url = new URL(cfg.authorizeUrl);
  url.searchParams.set('client_id', cfg.clientId);
  url.searchParams.set('redirect_uri', `${origin}/api/oauth/${provider}/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', cfg.scope);
  url.searchParams.set('state', state);

  // 手动构造 302（Response.redirect 的 headers 不可变，无法附加 Set-Cookie）
  const res = new Response(null, { status: 302, headers: { Location: url.toString() } });
  res.headers.append(
    'Set-Cookie',
    `${stateCookieName(provider)}=${state}.${mode}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
  );
  return res;
}

/** 处理回调：校验 state → 换 token → 取用户信息 → 登录或自动注册 */
export async function handleOAuthCallback(
  env: Env,
  request: Request,
  provider: ProviderName,
): Promise<Response> {
  const cfg = await getOAuthConfig(env.DB, provider);
  const origin = new URL(request.url).origin;
  const redirect = (status: string) =>
    new Response(null, { status: 302, headers: { Location: `${origin}/?oauth=${status}` } });

  if (!cfg || !cfg.enabled || !cfg.clientId || !cfg.clientSecret) {
    return redirect('not_configured');
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookies = parseCookies(request.headers.get('Cookie'));
  const expected = cookies[stateCookieName(provider)];
  const [expectedState, rawMode] = String(expected ?? '').split('.');

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirect('error');
  }
  const mode = rawMode === 'bind' ? 'bind' : 'login';

  // 用授权码换取 access_token
  let tokenData: Record<string, unknown>;
  try {
    const tokenRes = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        code,
        redirect_uri: `${origin}/api/oauth/${provider}/callback`,
        state,
        // Google 强制要求 grant_type；GitHub 会忽略多余字段
        grant_type: 'authorization_code',
      }),
    });
    tokenData = (await tokenRes.json()) as Record<string, unknown>;
  } catch {
    return redirect('error');
  }
  const accessToken = tokenData.access_token;
  if (typeof accessToken !== 'string' || !accessToken) {
    return redirect('error');
  }

  // 拉取用户信息
  let profile: Record<string, unknown>;
  try {
    const userRes = await fetch(cfg.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'Yanverse',
        Accept: 'application/json',
      },
    });
    profile = (await userRes.json()) as Record<string, unknown>;
  } catch {
    return redirect('error');
  }

  const oauthId = String(profile.id ?? profile.sub ?? '');
  if (!oauthId) return redirect('error');

  const rawName = String(
    profile.login ?? profile.name ?? (profile.email as string | undefined)?.split('@')[0] ?? '',
  );
  const avatar =
    typeof profile.avatar_url === 'string' && profile.avatar_url
      ? profile.avatar_url
      : typeof profile.picture === 'string'
        ? profile.picture
        : null;

  // 获取已验证邮箱：Google 直接提供；GitHub 需要单独调用 emails API
  let email = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : '';
  if (!email && provider === 'github') {
    try {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'Yanverse',
          Accept: 'application/json',
        },
      });
      const emails = (await emailsRes.json()) as Array<{
        email?: string;
        primary?: boolean;
        verified?: boolean;
      }>;
      if (Array.isArray(emails)) {
        const picked =
          emails.find((e) => e.primary && e.verified) ??
          emails.find((e) => e.verified) ??
          emails[0];
        if (picked?.email) email = String(picked.email).trim().toLowerCase();
      }
    } catch {
      // 拿不到邮箱则跳过绑定检测
    }
  }

  if (mode === 'bind') {
    // 绑定模式：把 OAuth 身份绑定到当前已登录账号，不创建新会话
    const sessionUser = await getUserFromRequest(env, request);
    if (!sessionUser) return redirect('error');
    // 该 OAuth 身份是否已被其他账号绑定
    const occupied = await env.DB
      .prepare('SELECT user_id FROM oauth_links WHERE provider = ? AND oauth_id = ?')
      .bind(provider, oauthId)
      .first();
    if (occupied && String(occupied.user_id) !== sessionUser.id) {
      return redirect('link_conflict');
    }
    await env.DB
      .prepare(
        'INSERT OR IGNORE INTO oauth_links (id, user_id, provider, oauth_id, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(crypto.randomUUID(), sessionUser.id, provider, oauthId, Date.now())
      .run();
    // 顺手补齐邮箱到用户资料（仅当尚未填写）
    if (email) {
      await env.DB
        .prepare("UPDATE users SET email = ? WHERE id = ? AND (email IS NULL OR email = '')")
        .bind(email, sessionUser.id)
        .run();
    }
    const res = redirect('link_success');
    res.headers.append(
      'Set-Cookie',
      `${stateCookieName(provider)}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    );
    return res;
  }

  // 登录模式：OAuth 身份已在绑定表中 → 直接登录
  const existing = await env.DB
    .prepare('SELECT user_id FROM oauth_links WHERE provider = ? AND oauth_id = ?')
    .bind(provider, oauthId)
    .first();

  let userId: string;
  if (existing) {
    userId = String(existing.user_id);
  } else if (email) {
    // 新 OAuth 身份：复核邮箱是否已存在对应账号
    const match = await env.DB
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first();
    if (match) {
      // 邮箱已被用过 → 直接登录该账号，并自动记录 OAuth 绑定（下次直接命中）
      userId = String(match.id);
      await env.DB
        .prepare(
          'INSERT OR IGNORE INTO oauth_links (id, user_id, provider, oauth_id, created_at) VALUES (?, ?, ?, ?, ?)',
        )
        .bind(crypto.randomUUID(), userId, provider, oauthId, Date.now())
        .run();
    } else {
      // 邮箱无对应账号 → 创建新账号（保存邮箱，便于日后邮箱登录）
      userId = crypto.randomUUID();
      const username = await uniqueUsername(env, rawName, oauthId);
      await env.DB
        .prepare(
          `INSERT INTO users (id, username, password_hash, role, avatar, email, created_at)
           VALUES (?, ?, ?, 'user', ?, ?, ?)`,
        )
        // password_hash 为 NOT NULL 列，OAuth 用户无密码，用占位符（verifyPassword 会拒绝）
        .bind(userId, username, '!', avatar, email, Date.now())
        .run();
      await env.DB
        .prepare(
          'INSERT INTO oauth_links (id, user_id, provider, oauth_id, created_at) VALUES (?, ?, ?, ?, ?)',
        )
        .bind(crypto.randomUUID(), userId, provider, oauthId, Date.now())
        .run();
    }
  } else {
    // 无邮箱可用 → 直接注册新账号
    userId = crypto.randomUUID();
    const username = await uniqueUsername(env, rawName, oauthId);
    await env.DB
      .prepare(
        `INSERT INTO users (id, username, password_hash, role, avatar, created_at)
         VALUES (?, ?, ?, 'user', ?, ?)`,
      )
      .bind(userId, username, '!', avatar, Date.now())
      .run();
    await env.DB
      .prepare(
        'INSERT INTO oauth_links (id, user_id, provider, oauth_id, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(crypto.randomUUID(), userId, provider, oauthId, Date.now())
      .run();
  }

  const token = await createSession(env.DB, userId);
  const res = redirect('success');
  setSessionCookie(res, token, request.url.startsWith('https://'));
  res.headers.append(
    'Set-Cookie',
    `${stateCookieName(provider)}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  return res;
}

/** 生成合法且唯一的小写用户名：过滤非法字符，冲突时追加数字 */
export async function uniqueUsername(
  env: Env,
  raw: string,
  oauthId: string,
): Promise<string> {
  let base = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
  if (base.length < 3) base = `user${oauthId.replace(/[^a-z0-9]/gi, '').slice(0, 6)}`;
  if (!base) base = 'user';

  let username = base;
  let i = 1;
  for (;;) {
    const row = await env.DB
      .prepare('SELECT id FROM users WHERE username = ?')
      .bind(username)
      .first();
    if (!row) return username;
    username = `${base}${i}`.slice(0, 20);
    i += 1;
  }
}
