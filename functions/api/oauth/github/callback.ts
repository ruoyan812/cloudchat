import type { Env } from '../../../_lib/auth';
import { handleOAuthCallback } from '../../../_lib/oauth';

/** GET /api/oauth/github/callback → GitHub 授权回调 */
export const onRequestGet: PagesFunction<Env> = ({ request, env }) =>
  handleOAuthCallback(env, request, 'github');
