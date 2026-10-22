/**
 * Yanverse AI 对话 API
 *
 * 路由：POST /api/chat
 * 请求体：{ "messages": [...], "model"?: string }
 * 响应：SSE 流（text/event-stream），每条 data 为 { "response": "增量文本" }
 *
 * 模型来源（通过 model 字段区分）：
 *  - @cf/... 开头        → Cloudflare Workers AI（默认，原有能力保留）
 *  - local/ 开头          → 自托管 Ollama（OpenAI 兼容端点），local/ 后面为 Ollama 模型名
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface Env {
  AI: Ai;
  CHAT_MODEL?: string;
  SITE_NAME?: string;
  OLLAMA_BASE_URL?: string;
  OLLAMA_API_KEY?: string;
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

    // 自托管 Ollama 模型（以 local/ 前缀标识），走独立代理分支
    if (model.startsWith('local/')) {
      return proxyOllama(fullMessages, model.slice('local/'.length), env);
    }

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

/**
 * 代理到自托管的 OpenAI 兼容端点（Ollama）。
 * 入参 messages 已包含系统提示词，直接转发；
 * 把 OpenAI 的 SSE（data: {"choices":[{"delta":{"content":"..."}}]}）
 * 翻译成前端期望的格式（data: {"response":"..."}）。
 */
async function proxyOllama(
  messages: ChatMessage[],
  model: string,
  env: Env,
): Promise<Response> {
  const base = env.OLLAMA_BASE_URL || 'https://api.ai.roooooyan.work:11434/v1';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (env.OLLAMA_API_KEY) headers['Authorization'] = `Bearer ${env.OLLAMA_API_KEY}`;

  const upstream = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, messages, stream: true, max_tokens: 2048 }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    return Response.json(
      { error: `模型服务暂时不可用（${upstream.status}）${detail.slice(0, 200)}` },
      { status: 502, headers: CORS_HEADERS },
    );
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        // 处理流末尾残留的片段
        if (buffer) {
          for (const part of parseOpenAI(buffer)) controller.enqueue(encoder.encode(part));
          buffer = '';
        }
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';
      for (const ev of events) {
        for (const part of parseOpenAI(ev)) controller.enqueue(encoder.encode(part));
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...CORS_HEADERS,
    },
  });
}

/** 把 OpenAI SSE 缓冲解析成前端期望的 text/event-stream 片段 */
function parseOpenAI(buffer: string): string[] {
  const out: string[] = [];
  for (const ev of buffer.split('\n\n')) {
    for (const line of ev.split('\n')) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const data = t.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const json = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[];
        };
        const content = json.choices?.[0]?.delta?.content;
        if (content) out.push(`data: ${JSON.stringify({ response: content })}\n\n`);
      } catch {
        /* 忽略无法解析的片段 */
      }
    }
  }
  return out;
}
