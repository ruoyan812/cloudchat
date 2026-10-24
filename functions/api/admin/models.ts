/**
 * 管理员模型配置接口
 * GET  /api/admin/models  → 读取全部模型（含未启用，apiKey 仅回传 hasKey 标记）
 * PUT  /api/admin/models  → 批量 upsert；并删除「不在本次提交中的 custom 模型」
 * DELETE 由 [id].ts 处理
 */
import {
  getAdminFromRequest,
  json,
  corsHeaders,
  type Env,
} from '../../_lib/auth';
import {
  getModels,
  upsertModels,
  type ModelProvider,
} from '../../_lib/models';

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request) });
};

/** GET /api/admin/models */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  const admin = await getAdminFromRequest(env, request);
  if (!admin) return json({ error: '无权限，需要管理员身份' }, 403, headers);

  try {
    const models = await getModels(env.DB);
    return json(
      {
        models: models.map((m) => ({
          id: m.id,
          provider: m.provider,
          label: m.label,
          modelName: m.modelName,
          baseUrl: m.baseUrl,
          apiKey: '',
          hasKey: !!m.apiKey,
          enabled: m.enabled,
          sortOrder: m.sortOrder,
        })),
      },
      200,
      headers,
    );
  } catch (err) {
    console.error('admin models GET error:', err);
    return json({ error: '读取模型配置失败' }, 500, headers);
  }
};

/** PUT /api/admin/models */
export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  const admin = await getAdminFromRequest(env, request);
  if (!admin) return json({ error: '无权限，需要管理员身份' }, 403, headers);

  try {
    const body = (await request.json()) as { models?: unknown };
    if (!Array.isArray(body.models)) {
      return json({ error: '请求格式错误' }, 400, headers);
    }

    const clean = (body.models as Array<Record<string, unknown>>)
      .filter((m) => typeof m?.id === 'string' && m.id.trim())
      .map((m) => ({
        id: String(m.id).trim(),
        provider: (m.provider === 'custom' ? 'custom' : 'workers-ai') as ModelProvider,
        label: String(m.label ?? m.id).trim(),
        modelName: String(m.modelName ?? m.id).trim(),
        baseUrl: String(m.baseUrl ?? '').trim(),
        apiKey: m.apiKey ? String(m.apiKey) : '',
        enabled: m.enabled ? true : false,
        sortOrder: Number(m.sortOrder ?? 0),
      }));

    // 删除「不在本次提交中的 custom 模型」（workers-ai 由前端始终全量提交，不会被误删）
    const incomingIds = clean.map((c) => c.id);
    const existing = await getModels(env.DB);
    const toDelete = existing
      .filter((r) => r.provider === 'custom' && !incomingIds.includes(r.id))
      .map((r) => r.id);

    if (toDelete.length) {
      await env.DB.batch(
        toDelete.map((id) =>
          env.DB.prepare('DELETE FROM ai_models WHERE id = ?').bind(id),
        ),
      );
    }

    await upsertModels(env.DB, clean);
    return json({ ok: true }, 200, headers);
  } catch (err) {
    console.error('admin models PUT error:', err);
    return json({ error: '保存失败，请稍后重试' }, 500, headers);
  }
};
