import {
  getUserFromRequest,
  getUserById,
  serializeUser,
  json,
  corsHeaders,
  type Env,
} from '../../_lib/auth';

/** PATCH /api/auth/profile → 修改昵称（页面显示名） */
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  try {
    const user = await getUserFromRequest(env, request);
    if (!user) {
      return json({ error: '请先登录' }, 401, headers);
    }

    const body = (await request.json()) as { nickname?: unknown };
    const nickname = String(body.nickname ?? '').trim().slice(0, 30);
    if (!nickname) {
      return json({ error: '昵称不能为空' }, 400, headers);
    }

    await env.DB.prepare('UPDATE users SET nickname = ? WHERE id = ?')
      .bind(nickname, user.id)
      .run();

    const updated = await getUserById(env.DB, user.id);
    return json(
      { user: updated ? await serializeUser(env.DB, updated) : null },
      200,
      headers,
    );
  } catch (err) {
    console.error('profile error:', err);
    return json({ error: '保存失败，请稍后重试' }, 500, headers);
  }
};
