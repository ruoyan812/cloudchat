/**
 * 创建对话分享
 *
 * 路由：POST /api/share
 * 请求体：{ "messages": [{ "role": "user"|"assistant", "content": string }], "expiry": number }
 *   - expiry 单位：天；0 或省略表示永久
 * 响应：{ "id": string, "expiresAt": number }
 *
 * 需要登录：分享者必须是已登录用户。
 */

import { getUserFromRequest, json, corsHeaders, type Env } from '../_lib/auth';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function genId(len = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let s = '';
  for (let i = 0; i < len; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

/** 校验并规范化要分享的消息，过滤空内容、限制长度 */
function sanitize(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) throw new Error('messages 必须是数组');
  const out: ChatMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const role = (item as ChatMessage).role;
    const content = (item as ChatMessage).content;
    if (
      (role === 'user' || role === 'assistant') &&
      typeof content === 'string' &&
      content.trim()
    ) {
      out.push({ role, content: content.slice(0, 16000) });
    }
    if (out.length >= 200) break;
  }
  if (out.length === 0) throw new Error('没有可分享的内容');
  return out;
}

export const onRequestOptions: PagesFunction<Env> = async ({ request }) => {
  return new Response(null, { headers: corsHeaders(request) });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const headers = corsHeaders(request);
  const user = await getUserFromRequest(env, request);
  if (!user) return json({ error: '请先登录后再分享' }, 401, headers);

  let body: { messages?: unknown; expiry?: unknown };
  try {
    body = (await request.json()) as { messages?: unknown; expiry?: unknown };
  } catch {
    return json({ error: '请求格式错误' }, 400, headers);
  }

  let messages: ChatMessage[];
  try {
    messages = sanitize(body.messages);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : '内容校验失败' }, 400, headers);
  }

  const expiryDays = typeof body.expiry === 'number' ? body.expiry : 0;
  const now = Date.now();
  const expiresAt = expiryDays > 0 ? now + expiryDays * 86_400_000 : 0;

  // 生成不冲突的短 ID（极低概率冲突时重试）
  let id = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    id = genId(8);
    const existing = await env.DB.prepare('SELECT id FROM shares WHERE id = ?').bind(id).first();
    if (!existing) break;
  }

  await env.DB.prepare(
    'INSERT INTO shares (id, user_id, messages, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(id, user.id, JSON.stringify(messages), now, expiresAt)
    .run();

  return json({ id, expiresAt }, 200, headers);
};
