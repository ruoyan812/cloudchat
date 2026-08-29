import { json, corsHeaders, type Env } from '../../_lib/auth';
import { getOAuthConfigs } from '../../_lib/oauth';

/** GET /api/oauth/providers → 返回已启用的 OAuth 提供商（不含密钥），供登录弹窗渲染 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  const configs = await getOAuthConfigs(env.DB);
  const providers = configs
    .filter((c) => c.enabled && c.clientId)
    .map((c) => ({
      provider: c.provider,
      displayName: c.displayName,
      loginUrl: `/api/oauth/${c.provider}/login`,
    }));
  return json({ providers }, 200, headers);
};
