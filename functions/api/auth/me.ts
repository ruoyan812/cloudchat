import {
  getUserFromRequest,
  serializeUser,
  json,
  corsHeaders,
  type Env,
} from '../../_lib/auth';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  const user = await getUserFromRequest(env, request);
  if (!user) return json({ user: null }, 200, headers);
  const publicUser = await serializeUser(env.DB, user);
  return json({ user: publicUser }, 200, headers);
};
