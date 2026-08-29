import {
  createPasswordRecord,
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
      username?: unknown;
      email?: unknown;
      password?: unknown;
    };
    const username = String(body.username ?? '').trim().toLowerCase();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return json({ error: '用户名需为 3-20 位字母、数字或下划线' }, 400, headers);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: '请输入有效的邮箱地址' }, 400, headers);
    }
    if (password.length < 6 || password.length > 64) {
      return json({ error: '密码长度需为 6-64 位' }, 400, headers);
    }

    const exists = await env.DB.prepare('SELECT id FROM users WHERE username = ?')
      .bind(username)
      .first();
    if (exists) {
      return json({ error: '该用户名已被注册' }, 409, headers);
    }
    const emailExists = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first();
    if (emailExists) {
      return json({ error: '该邮箱已被注册' }, 409, headers);
    }

    // 第一个注册的用户自动成为管理员，可进入管理后台
    const count = await env.DB.prepare('SELECT COUNT(*) AS cnt FROM users').first();
    const role: 'admin' | 'user' = count && Number(count.cnt) === 0 ? 'admin' : 'user';

    const id = crypto.randomUUID();
    const passwordRecord = await createPasswordRecord(password);
    await env.DB.prepare(
      'INSERT INTO users (id, username, nickname, password_hash, role, email, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(id, username, username, passwordRecord, role, email, Date.now())
      .run();

    const token = await createSession(env.DB, id);
    const userRow = await getUserById(env.DB, id);
    const res = json(
      { user: userRow ? await serializeUser(env.DB, userRow) : null },
      200,
      headers,
    );
    return setSessionCookie(res, token, isSecureRequest(request));
  } catch (err) {
    console.error('register error:', err);
    return json({ error: '注册失败，请稍后重试' }, 500, headers);
  }
};
