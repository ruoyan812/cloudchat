import type { ChatMessage, Conversation } from '../types';

/**
 * 解析 Workers AI 返回的 SSE 流，逐段产出 AI 生成的文本。
 */
export async function* streamChat(
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!res.ok) {
    let detail = `请求失败（HTTP ${res.status}）`;
    try {
      const data = await res.json();
      if (data?.error) detail = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  if (!res.body) throw new Error('浏览器不支持流式响应');

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE 事件以空行分隔，逐条解析
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const event of events) {
        for (const line of event.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const json = JSON.parse(data) as { response?: string };
            if (typeof json.response === 'string' && json.response) {
              yield json.response;
            }
          } catch {
            /* 忽略无法解析的片段 */
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** 拉取云端对话记录（需已登录） */
export async function fetchRemoteConversations(): Promise<Conversation[]> {
  const res = await fetch('/api/conversations');
  const data = (await res.json().catch(() => ({}))) as { conversations?: Conversation[]; error?: string };
  if (!res.ok) throw new Error(data.error || '拉取云端对话失败');
  return data.conversations ?? [];
}

/** 全量推送对话记录到云端 */
export async function pushRemoteConversations(conversations: Conversation[]): Promise<void> {
  const res = await fetch('/api/conversations', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversations }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error || '同步云端对话失败');
}

/** 生成唯一 ID */
export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
