/**
 * 管理员：列举全部分享链接
 *
 * 路由：GET /api/admin/shares
 * 响应：{ "shares": [{ id, username, userId, createdAt, expiresAt, messageCount, preview }] }
 * 需要管理员权限。
 */

import { getAdminFromRequest, json, corsHeaders, type Env } from '../../_lib/auth';

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request) });
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  const admin = await getAdminFromRequest(env, request);
  if (!admin) return json({ error: '需要管理员权限' }, 403, headers);

  const { results } = await env.DB.prepare(
    `SELECT s.id, s.user_id, u.username, s.created_at, s.expires_at, s.messages
     FROM shares s LEFT JOIN users u ON u.id = s.user_id
     ORDER BY s.created_at DESC`,
  ).all();

  const shares = (results as Array<Record<string, unknown>>).map((r) => {
    let msgs: Array<{ role: string; content: string }> = [];
    try {
      msgs = JSON.parse(String(r.messages));
    } catch {
      msgs = [];
    }
    const firstUser = msgs.find((m) => m.role === 'user');
    return {
      id: String(r.id),
      username: r.username ? String(r.username) : '(已删除用户)',
      userId: String(r.user_id),
      createdAt: Number(r.created_at),
      expiresAt: Number(r.expires_at),
      messageCount: msgs.length,
      preview: firstUser ? String(firstUser.content).slice(0, 60) : '',
    };
  });

  return json({ shares }, 200, headers);
};
