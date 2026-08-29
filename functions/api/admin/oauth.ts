import {
  getAdminFromRequest,
  json,
  corsHeaders,
  type Env,
} from '../../_lib/auth';
import { getOAuthConfigs } from '../../_lib/oauth';

const PROVIDERS = ['github', 'google'] as const;

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request) });
};

/** GET /api/admin/oauth → 读取 OAuth 配置（含密钥，仅管理员） */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  const admin = await getAdminFromRequest(env, request);
  if (!admin) return json({ error: '无权限，需要管理员身份' }, 403, headers);

  const configs = await getOAuthConfigs(env.DB);
  const providers = configs.map((c) => ({
    provider: c.provider,
    displayName: c.displayName,
    clientId: c.clientId,
    clientSecret: c.clientSecret,
    enabled: c.enabled,
    updatedAt: c.updatedAt,
  }));
  return json({ providers }, 200, headers);
};

/** PUT /api/admin/oauth → 保存 OAuth 配置（clientSecret 留空表示不修改） */
export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  const admin = await getAdminFromRequest(env, request);
  if (!admin) return json({ error: '无权限，需要管理员身份' }, 403, headers);

  try {
    const body = (await request.json()) as {
      providers?: Array<{
        provider?: unknown;
        clientId?: unknown;
        clientSecret?: unknown;
        enabled?: unknown;
      }>;
    };
    if (!Array.isArray(body.providers)) {
      return json({ error: '请求格式错误' }, 400, headers);
    }

    const now = Date.now();
    const stmts: D1PreparedStatement[] = [];
    for (const p of body.providers) {
      const provider = String(p.provider ?? '');
      if (!PROVIDERS.includes(provider as (typeof PROVIDERS)[number])) continue;

      const clientId = String(p.clientId ?? '').trim();
      const clientSecret = String(p.clientSecret ?? '').trim();
      const enabled = p.enabled ? 1 : 0;

      // 密钥留空 → 保留原值
      if (!clientSecret) {
        stmts.push(
          env.DB.prepare(
            'UPDATE oauth_providers SET client_id = ?, enabled = ?, updated_at = ? WHERE provider = ?',
          ).bind(clientId, enabled, now, provider),
        );
      } else {
        stmts.push(
          env.DB.prepare(
            'UPDATE oauth_providers SET client_id = ?, client_secret = ?, enabled = ?, updated_at = ? WHERE provider = ?',
          ).bind(clientId, clientSecret, enabled, now, provider),
        );
      }
    }

    if (stmts.length === 0) {
      return json({ error: '没有可保存的配置' }, 400, headers);
    }
    await env.DB.batch(stmts);
    return json({ ok: true }, 200, headers);
  } catch (err) {
    console.error('admin oauth PUT error:', err);
    return json({ error: '保存失败，请稍后重试' }, 500, headers);
  }
};
