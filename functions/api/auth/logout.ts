import {
  destroySession,
  parseCookies,
  SESSION_COOKIE,
  clearSessionCookie,
  json,
  corsHeaders,
  type Env,
} from '../../_lib/auth';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  try {
    const cookies = parseCookies(request.headers.get('Cookie'));
    const token = cookies[SESSION_COOKIE];
    if (token) {
      await destroySession(env.DB, token);
    }
    const res = json({ ok: true }, 200, headers);
    return clearSessionCookie(res);
  } catch (err) {
    console.error('logout error:', err);
    return json({ error: '退出失败，请稍后重试' }, 500, headers);
  }
};
