/**
 * Yanverse AI 对话 API
 *
 * 路由：POST /api/chat
 * 请求体：{ "messages": [{ "role": "user"|"assistant"|"system", "content": "..." }] }
 * 响应：SSE 流（text/event-stream），每条 data 为 { "response": "增量文本" }
 *
 * 部署在 Cloudflare Pages Functions 上，通过 AI Binding 调用 Workers AI 模型。
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface Env {
  AI: Ai;
  CHAT_MODEL?: string;
  SITE_NAME?: string;
}

const DEFAULT_MODEL = '@cf/meta/llama-3.2-3b-instruct';

const DEFAULT_SYSTEM_PROMPT = `你是一个友好、专业、乐于助人的中文 AI 助手，名叫「Yan」。
请始终使用简体中文回答用户的问题。回答要清晰、有条理、准确。
如果用户的问题涉及代码，请提供可直接运行的代码并附上简要解释。`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/** 校验并规范化消息列表：过滤掉空内容，限制长度，确保首条为用户消息 */
function sanitizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) {
    throw new Error('请求格式错误：messages 必须是数组');
  }
  const messages: ChatMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const role = (item as ChatMessage).role;
    const content = (item as ChatMessage).content;
    if ((role === 'user' || role === 'assistant') && typeof content === 'string' && content.trim()) {
      messages.push({ role, content: content.slice(0, 16000) });
    }
  }
  if (messages.length === 0) {
    throw new Error('消息内容为空');
  }
  // 组装时始终在头部注入系统提示词
  return messages;
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { headers: CORS_HEADERS });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = (await request.json()) as { messages?: unknown; model?: string };
    const messages = sanitizeMessages(body.messages);
    const model = (body.model as string) || env.CHAT_MODEL || DEFAULT_MODEL;

    const fullMessages: ChatMessage[] = [
      { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
      ...messages,
    ];

    const stream = (await env.AI.run(model, {
      messages: fullMessages,
      stream: true,
      max_tokens: 2048,
    })) as ReadableStream<Uint8Array>;

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        ...CORS_HEADERS,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    console.error('Chat API error:', err);
    return Response.json(
      { error: `对话服务暂时不可用：${message}` },
      {
        status: 500,
        headers: CORS_HEADERS,
      },
    );
  }
};
