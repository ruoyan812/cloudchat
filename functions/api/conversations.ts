import {
  getUserFromRequest,
  json,
  corsHeaders,
  type Env,
} from '../_lib/auth';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ConversationIn {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

const MAX_CONVERSATIONS = 500;
const MAX_MESSAGES = 200;
const MAX_CONTENT = 20000;

/** 校验并规范化同步上来的对话列表 */
function sanitizeConversations(raw: unknown): ConversationIn[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ConversationIn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const c = item as Record<string, unknown>;
    const id = typeof c.id === 'string' && c.id ? c.id : null;
    if (!id) continue;
    const title = typeof c.title === 'string' ? c.title.slice(0, 100) : '新对话';
    const createdAt = typeof c.createdAt === 'number' ? c.createdAt : Date.now();
    const updatedAt = typeof c.updatedAt === 'number' ? c.updatedAt : createdAt;

    const messages: ChatMessage[] = [];
    if (Array.isArray(c.messages)) {
      for (const m of c.messages) {
        if (!m || typeof m !== 'object') continue;
        const mm = m as Record<string, unknown>;
        if (
          (mm.role === 'user' || mm.role === 'assistant') &&
          typeof mm.content === 'string'
        ) {
          messages.push({ role: mm.role, content: mm.content.slice(0, MAX_CONTENT) });
        }
        if (messages.length >= MAX_MESSAGES) break;
      }
    }

    out.push({ id, title, createdAt, updatedAt, messages });
    if (out.length >= MAX_CONVERSATIONS) break;
  }
  return out;
}

function parseMessages(raw: string): ChatMessage[] {
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request) });
};

/** GET /api/conversations → 拉取当前用户的全部对话 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  const user = await getUserFromRequest(env, request);
  if (!user) return json({ error: '未登录' }, 401, headers);

  const { results } = await env.DB.prepare(
    'SELECT id, title, created_at, updated_at, messages FROM conversations WHERE user_id = ? ORDER BY updated_at DESC',
  )
    .bind(user.id)
    .all();

  const conversations = (results as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    title: String(r.title),
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
    messages: parseMessages(String(r.messages)),
  }));
  return json({ conversations }, 200, headers);
};

/** PUT /api/conversations → 全量覆盖同步当前用户的对话 */
export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  const user = await getUserFromRequest(env, request);
  if (!user) return json({ error: '未登录' }, 401, headers);

  try {
    const body = (await request.json()) as { conversations?: unknown };
    const convs = sanitizeConversations(body.conversations);
    if (!convs) return json({ error: '请求格式错误' }, 400, headers);

    const stmts: D1PreparedStatement[] = [
      env.DB.prepare('DELETE FROM conversations WHERE user_id = ?').bind(user.id),
    ];
    for (const c of convs) {
      stmts.push(
        env.DB.prepare(
          'INSERT INTO conversations (id, user_id, title, created_at, updated_at, messages) VALUES (?, ?, ?, ?, ?, ?)',
        ).bind(c.id, user.id, c.title, c.createdAt, c.updatedAt, JSON.stringify(c.messages)),
      );
    }
    await env.DB.batch(stmts);
    return json({ ok: true, count: convs.length }, 200, headers);
  } catch (err) {
    console.error('conversations PUT error:', err);
    return json({ error: '同步失败，请稍后重试' }, 500, headers);
  }
};

/** DELETE /api/conversations → 清空当前用户的全部对话 */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  const user = await getUserFromRequest(env, request);
  if (!user) return json({ error: '未登录' }, 401, headers);

  await env.DB.prepare('DELETE FROM conversations WHERE user_id = ?').bind(user.id).run();
  return json({ ok: true }, 200, headers);
};
