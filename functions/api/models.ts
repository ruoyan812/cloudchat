/**
 * 公开模型列表：返回已启用的模型（id / label / provider），供前端下拉框使用。
 * 不返回任何密钥或接口地址。
 */
import { json, corsHeaders, type Env } from '../_lib/auth';
import { getEnabledModels } from '../_lib/models';

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request) });
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  try {
    const models = await getEnabledModels(env.DB);
    return json(
      {
        models: models.map((m) => ({
          id: m.id,
          label: m.label,
          provider: m.provider,
        })),
      },
      200,
      headers,
    );
  } catch (err) {
    console.error('models GET error:', err);
    return json({ error: '读取模型列表失败' }, 500, headers);
  }
};
