import type { ChatMessage, Conversation } from '../types';

/**
 * 解析 Workers AI 返回的 SSE 流，逐段产出 AI 生成的文本。
 */
export async function* streamChat(
  messages: ChatMessage[],
  signal?: AbortSignal,
  model?: string,
): AsyncGenerator<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(model ? { messages, model } : { messages }),
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

/** 创建分享：把选中的消息存入云端，返回短链 ID 与过期时间戳 */
export async function createShare(
  messages: ChatMessage[],
  expiryDays: number,
): Promise<{ id: string; expiresAt: number }> {
  const res = await fetch('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, expiry: expiryDays }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    expiresAt?: number;
    error?: string;
  };
  if (!res.ok || !data.id) throw new Error(data.error || '创建分享失败');
  return { id: data.id, expiresAt: data.expiresAt ?? 0 };
}

/** 读取分享内容（公开，无需登录） */
export async function getShare(
  id: string,
): Promise<{ id: string; messages: ChatMessage[]; createdAt: number; expiresAt: number }> {
  const res = await fetch(`/api/share/${encodeURIComponent(id)}`);
  const data = (await res.json().catch(() => ({}))) as {
    messages?: ChatMessage[];
    createdAt?: number;
    expiresAt?: number;
    error?: string;
  };
  if (!res.ok) throw new Error(data.error || '加载分享失败');
  return {
    id,
    messages: data.messages ?? [],
    createdAt: data.createdAt ?? 0,
    expiresAt: data.expiresAt ?? 0,
  };
}
