/**
 * 读取分享内容（公开，无需登录）
 *
 * 路由：GET /api/share/:id
 * 响应：{ "id", "messages": [...], "createdAt", "expiresAt" }
 *   - 不存在 → 404
 *   - 已过期（expiresAt>0 且 < now）→ 410
 */

import { json, corsHeaders, type Env } from '../../_lib/auth';

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request) });
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  const id = new URL(request.url).pathname.split('/').pop() || '';
  if (!id) return json({ error: '缺少分享 ID' }, 400, headers);

  const row = await env.DB.prepare(
    'SELECT messages, created_at, expires_at FROM shares WHERE id = ?',
  )
    .bind(id)
    .first();
  if (!row) return json({ error: '分享不存在或已被删除' }, 404, headers);

  const expiresAt = Number(row.expires_at);
  if (expiresAt > 0 && expiresAt < Date.now()) {
    return json({ error: '该分享链接已过期' }, 410, headers);
  }

  let messages: { role: string; content: string }[] = [];
  try {
    messages = JSON.parse(String(row.messages));
  } catch {
    messages = [];
  }

  return json(
    {
      id,
      messages,
      createdAt: Number(row.created_at),
      expiresAt,
    },
    200,
    headers,
  );
};
