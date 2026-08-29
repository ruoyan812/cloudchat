import {
  verifyPassword,
  createPasswordRecord,
  getUserFromRequest,
  json,
  corsHeaders,
  type Env,
} from '../../_lib/auth';

/** POST /api/auth/password → 修改密码（已有密码需验证旧密码；OAuth 用户可直接设置） */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  try {
    const user = await getUserFromRequest(env, request);
    if (!user) {
      return json({ error: '请先登录' }, 401, headers);
    }

    const body = (await request.json()) as {
      oldPassword?: unknown;
      newPassword?: unknown;
    };
    const oldPassword = String(body.oldPassword ?? '');
    const newPassword = String(body.newPassword ?? '');

    if (newPassword.length < 6 || newPassword.length > 64) {
      return json({ error: '新密码长度需为 6-64 位' }, 400, headers);
    }

    const row = await env.DB
      .prepare('SELECT password_hash FROM users WHERE id = ?')
      .bind(user.id)
      .first();
    const storedHash = String(row?.password_hash ?? '');

    // 已有密码 → 必须验证旧密码；无密码（OAuth 用户）→ 直接设置
    if (storedHash.length >= 96) {
      const ok = await verifyPassword(oldPassword, storedHash);
      if (!ok) {
        return json({ error: '当前密码不正确' }, 401, headers);
      }
    }

    const passwordRecord = await createPasswordRecord(newPassword);
    await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(passwordRecord, user.id)
      .run();

    return json({ ok: true }, 200, headers);
  } catch (err) {
    console.error('password error:', err);
    return json({ error: '修改失败，请稍后重试' }, 500, headers);
  }
};
