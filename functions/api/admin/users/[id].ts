import {
  getAdminFromRequest,
  createPasswordRecord,
  json,
  corsHeaders,
  type Env,
} from '../../../_lib/auth';

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request) });
};

/** DELETE /api/admin/users/:id → 删除用户及其全部数据（仅管理员，不能删除自己） */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const headers = corsHeaders(request);
  const admin = await getAdminFromRequest(env, request);
  if (!admin) return json({ error: '无权限，需要管理员身份' }, 403, headers);

  const id = String(params.id ?? '');
  if (!id) return json({ error: '缺少用户 ID' }, 400, headers);
  if (id === admin.id) {
    return json({ error: '不能删除当前登录的管理员账号' }, 400, headers);
  }

  const target = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
  if (!target) return json({ error: '用户不存在' }, 404, headers);

  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id),
    env.DB.prepare('DELETE FROM conversations WHERE user_id = ?').bind(id),
    env.DB.prepare('DELETE FROM oauth_links WHERE user_id = ?').bind(id),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id),
  ]);
  return json({ ok: true }, 200, headers);
};

/** PATCH /api/admin/users/:id → 修改用户名 / 邮箱 / 昵称 / 重置密码（仅管理员） */
export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const headers = corsHeaders(request);
  const admin = await getAdminFromRequest(env, request);
  if (!admin) return json({ error: '无权限，需要管理员身份' }, 403, headers);

  const id = String(params.id ?? '');
  if (!id) return json({ error: '缺少用户 ID' }, 400, headers);

  const target = await env.DB
    .prepare('SELECT id, username, nickname, email, role, oauth_provider, avatar, created_at FROM users WHERE id = ?')
    .bind(id)
    .first();
  if (!target) return json({ error: '用户不存在' }, 404, headers);

  try {
    const body = (await request.json()) as {
      username?: unknown;
      email?: unknown;
      nickname?: unknown;
      password?: unknown;
    };

    const sets: string[] = [];
    const binds: unknown[] = [];

    // 修改用户名
    if (body.username !== undefined && body.username !== null) {
      const username = String(body.username).trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        return json({ error: '用户名需为 3-20 位字母、数字或下划线' }, 400, headers);
      }
      if (username !== String(target.username)) {
        const taken = await env.DB
          .prepare('SELECT id FROM users WHERE username = ? AND id != ?')
          .bind(username, id)
          .first();
        if (taken) return json({ error: '该用户名已被占用' }, 409, headers);
      }
      sets.push('username = ?');
      binds.push(username);
    }

    // 修改邮箱
    if (body.email !== undefined && body.email !== null) {
      const email = String(body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ error: '请输入有效的邮箱地址' }, 400, headers);
      }
      if (email !== String(target.email ?? '')) {
        const taken = await env.DB
          .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
          .bind(email, id)
          .first();
        if (taken) return json({ error: '该邮箱已被注册' }, 409, headers);
      }
      sets.push('email = ?');
      binds.push(email);
    }

    // 修改昵称
    if (body.nickname !== undefined && body.nickname !== null) {
      const nickname = String(body.nickname).trim().slice(0, 30);
      if (!nickname) return json({ error: '昵称不能为空' }, 400, headers);
      sets.push('nickname = ?');
      binds.push(nickname);
    }

    // 重置密码（非空则重置）
    if (body.password !== undefined && body.password !== null) {
      const password = String(body.password);
      if (password.length < 6 || password.length > 64) {
        return json({ error: '新密码长度需为 6-64 位' }, 400, headers);
      }
      sets.push('password_hash = ?');
      binds.push(await createPasswordRecord(password));
    }

    if (sets.length === 0) {
      return json({ error: '没有需要修改的字段' }, 400, headers);
    }

    binds.push(id);
    await env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...(binds as string[]))
      .run();

    // 返回更新后的用户信息
    const updated = await env.DB
      .prepare('SELECT id, username, nickname, email, role, oauth_provider, avatar, created_at FROM users WHERE id = ?')
      .bind(id)
      .first();
    return json(
      {
        user: {
          id: String(updated.id),
          username: String(updated.username),
          nickname: updated.nickname ? String(updated.nickname) : String(updated.username),
          email: updated.email ? String(updated.email) : null,
          role: updated.role === 'admin' ? 'admin' : 'user',
          oauthProvider: updated.oauth_provider ? String(updated.oauth_provider) : null,
          avatar: updated.avatar ? String(updated.avatar) : null,
          createdAt: Number(updated.created_at),
        },
      },
      200,
      headers,
    );
  } catch (err) {
    console.error('admin update user error:', err);
    return json({ error: '保存失败，请稍后重试' }, 500, headers);
  }
};
