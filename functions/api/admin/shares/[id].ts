/**
 * 管理员：删除指定分享链接
 *
 * 路由：DELETE /api/admin/shares/:id
 * 响应：{ "ok": true }
 * 需要管理员权限；删除后该链接立即失效。
 */

import { getAdminFromRequest, json, corsHeaders, type Env } from '../../../_lib/auth';

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request) });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  const admin = await getAdminFromRequest(env, request);
  if (!admin) return json({ error: '需要管理员权限' }, 403, headers);

  const id = new URL(request.url).pathname.split('/').pop() || '';
  if (!id) return json({ error: '缺少分享 ID' }, 400, headers);

  await env.DB.prepare('DELETE FROM shares WHERE id = ?').bind(id).run();
  return json({ ok: true }, 200, headers);
};
