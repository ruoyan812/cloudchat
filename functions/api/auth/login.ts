import {
  verifyPassword,
  createSession,
  setSessionCookie,
  isSecureRequest,
  getUserById,
  serializeUser,
  json,
  corsHeaders,
  type Env,
} from '../../_lib/auth';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  try {
    const body = (await request.json()) as {
      identifier?: unknown;
      username?: unknown;
      password?: unknown;
    };
    const identifier = String(body.identifier ?? body.username ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!identifier || !password) {
      return json({ error: '请输入用户名/邮箱和密码' }, 400, headers);
    }

    const row = await env.DB.prepare(
      'SELECT id, username, role, password_hash FROM users WHERE username = ? OR email = ?',
    )
      .bind(identifier, identifier)
      .first();
    if (!row) {
      return json({ error: '用户名/邮箱或密码错误' }, 401, headers);
    }

    const ok = await verifyPassword(password, String(row.password_hash));
    if (!ok) {
      return json({ error: '用户名/邮箱或密码错误' }, 401, headers);
    }

    const token = await createSession(env.DB, String(row.id));
    const userRow = await getUserById(env.DB, String(row.id));
    const res = json(
      { user: userRow ? await serializeUser(env.DB, userRow) : null },
      200,
      headers,
    );
    return setSessionCookie(res, token, isSecureRequest(request));
  } catch (err) {
    console.error('login error:', err);
    return json({ error: '登录失败，请稍后重试' }, 500, headers);
  }
};
