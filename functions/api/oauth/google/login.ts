import type { Env } from '../../../_lib/auth';
import { startOAuthLogin } from '../../../_lib/oauth';

/** GET /api/oauth/google/login → 跳转 Google 授权 */
export const onRequestGet: PagesFunction<Env> = ({ request, env }) =>
  startOAuthLogin(env, request, 'google');
