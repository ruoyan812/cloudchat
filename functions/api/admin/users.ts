import {
  getAdminFromRequest,
  createPasswordRecord,
  json,
  corsHeaders,
  type Env,
} from '../../_lib/auth';

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request) });
};

/** GET /api/admin/users → 用户列表（仅管理员） */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  const admin = await getAdminFromRequest(env, request);
  if (!admin) return json({ error: '无权限，需要管理员身份' }, 403, headers);

  const { results } = await env.DB.prepare(
    `SELECT id, username, nickname, email, role, oauth_provider, avatar, created_at
     FROM users ORDER BY created_at ASC`,
  ).all();

  const users = (results as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    username: String(r.username),
    nickname: r.nickname ? String(r.nickname) : String(r.username),
    email: r.email ? String(r.email) : null,
    role: r.role === 'admin' ? 'admin' : 'user',
    oauthProvider: r.oauth_provider ? String(r.oauth_provider) : null,
    avatar: r.avatar ? String(r.avatar) : null,
    createdAt: Number(r.created_at),
  }));
  return json({ users }, 200, headers);
};

/** POST /api/admin/users → 创建用户（仅管理员） */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  const admin = await getAdminFromRequest(env, request);
  if (!admin) return json({ error: '无权限，需要管理员身份' }, 403, headers);

  try {
    const body = (await request.json()) as {
      username?: unknown;
      email?: unknown;
      password?: unknown;
      role?: unknown;
      oauthProvider?: unknown;
      oauthId?: unknown;
      avatar?: unknown;
    };
    const username = String(body.username ?? '').trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return json({ error: '用户名需为 3-20 位字母、数字或下划线' }, 400, headers);
    }
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: '请输入有效的邮箱地址' }, 400, headers);
    }
    const role: 'admin' | 'user' = body.role === 'admin' ? 'admin' : 'user';
    const oauthProvider = String(body.oauthProvider ?? '').trim() || null;
    const oauthId = String(body.oauthId ?? '').trim() || null;
    const avatar = String(body.avatar ?? '').trim() || null;

    // OAuth 绑定用户无需密码；密码用户密码必填
    const password = String(body.password ?? '');
    if (!oauthId && (password.length < 6 || password.length > 64)) {
      return json({ error: '密码长度需为 6-64 位' }, 400, headers);
    }
    if (oauthId && !/^[a-z0-9_]{3,20}$/.test(oauthProvider ?? '')) {
      return json({ error: 'OAuth 提供商格式不正确' }, 400, headers);
    }

    const exists = await env.DB.prepare('SELECT id FROM users WHERE username = ?')
      .bind(username)
      .first();
    if (exists) {
      return json({ error: '该用户名已被占用' }, 409, headers);
    }
    const emailExists = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first();
    if (emailExists) {
      return json({ error: '该邮箱已被注册' }, 409, headers);
    }
    if (oauthId) {
      const bound = await env.DB
        .prepare('SELECT id FROM users WHERE oauth_provider = ? AND oauth_id = ?')
        .bind(oauthProvider, oauthId)
        .first();
      if (bound) {
        return json({ error: '该 OAuth 账号已绑定其他用户' }, 409, headers);
      }
    }

    const id = crypto.randomUUID();
    // password_hash 为 NOT NULL 列，OAuth 用户无密码，用占位符（verifyPassword 会拒绝）
    const passwordHash = oauthId ? '!' : await createPasswordRecord(password);
    await env.DB
      .prepare(
        `INSERT INTO users (id, username, nickname, password_hash, role, oauth_provider, oauth_id, avatar, email, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        username,
        username,
        passwordHash,
        role,
        oauthProvider,
        oauthId,
        avatar,
        email,
        Date.now(),
      )
      .run();

    return json(
      {
        user: {
          id,
          username,
          nickname: username,
          email,
          role,
          oauthProvider,
          avatar,
          createdAt: Date.now(),
        },
      },
      201,
      headers,
    );
  } catch (err) {
    console.error('admin create user error:', err);
    return json({ error: '创建失败，请稍后重试' }, 500, headers);
  }
};
