import type { Env } from '../../../_lib/auth';
import { startOAuthLogin } from '../../../_lib/oauth';

/** GET /api/oauth/github/login → 跳转 GitHub 授权 */
export const onRequestGet: PagesFunction<Env> = ({ request, env }) =>
  startOAuthLogin(env, request, 'github');
