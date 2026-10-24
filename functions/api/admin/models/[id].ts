/**
 * 删除单个模型：DELETE /api/admin/models/:id
 */
import {
  getAdminFromRequest,
  json,
  corsHeaders,
  type Env,
} from '../../../_lib/auth';
import { deleteModel } from '../../../_lib/models';

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request) });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const headers = corsHeaders(request);
  const admin = await getAdminFromRequest(env, request);
  if (!admin) return json({ error: '无权限，需要管理员身份' }, 403, headers);

  const id = String((params as Record<string, string>).id ?? '');
  if (!id) return json({ error: '缺少模型 id' }, 400, headers);

  try {
    await deleteModel(env.DB, id);
    return json({ ok: true }, 200, headers);
  } catch (err) {
    console.error('admin models DELETE error:', err);
    return json({ error: '删除失败' }, 500, headers);
  }
};
