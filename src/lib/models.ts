export type ModelProvider = 'workers-ai' | 'custom';

export interface ModelOption {
  /** 传给后端 /api/chat 的 model 字段 */
  id: string;
  /** 下拉框展示名 */
  label: string;
  /** 提供商类型 */
  provider?: ModelProvider;
  /** 是否为自托管（兼容旧 local/ 前缀） */
  local?: boolean;
}

/** 管理员在后台配置、存储于后端的模型结构 */
export interface AdminModel {
  id: string;
  provider: ModelProvider;
  label: string;
  /** 实际发送给提供商的模型名（Workers AI 即 @cf/...，自定义即填写的名称） */
  modelName: string;
  /** 自定义提供商的接口地址（OpenAI 兼容 base URL） */
  baseUrl: string;
  /** 自定义提供商的 API Key（仅写入，读取时为空） */
  apiKey: string;
  /** 后端是否已保存密钥 */
  hasKey: boolean;
  enabled: boolean;
  sortOrder: number;
}

export const DEFAULT_MODEL_ID = '@cf/meta/llama-3.2-3b-instruct';

/**
 * Cloudflare Workers AI 可选模型目录。
 * 管理员在后台从中勾选需要开放的模型；这些模型已绑定在 Cloudflare AI 上。
 */
export const WORKERS_AI_CATALOG: { id: string; label: string }[] = [
  { id: '@cf/meta/llama-3.2-3b-instruct', label: 'Workers AI · Llama 3.2 3B' },
  { id: '@cf/meta/llama-3.1-8b-instruct', label: 'Workers AI · Llama 3.1 8B' },
  { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', label: 'Workers AI · Llama 3.3 70B' },
  { id: '@cf/mistralai/mistral-small-3.1-24b-instruct', label: 'Workers AI · Mistral Small 3.1 24B' },
  { id: '@cf/qwen/qwen3-30b-a3b-fp8', label: 'Workers AI · Qwen3 30B' },
  { id: '@cf/google/gemma-4-26b-a4b-it', label: 'Workers AI · Gemma 4 26B' },
];

/** 拉取当前已启用的模型列表（公开接口） */
export async function fetchModels(): Promise<ModelOption[]> {
  try {
    const res = await fetch('/api/models');
    const data = (await res.json().catch(() => ({}))) as {
      models?: Array<{ id: string; label: string; provider: string }>;
    };
    if (!res.ok || !data.models?.length) return fallbackModels();
    return data.models.map((m) => ({
      id: m.id,
      label: m.label,
      provider: m.provider === 'custom' ? 'custom' : 'workers-ai',
      local: m.id.startsWith('local/'),
    }));
  } catch {
    return fallbackModels();
  }
}

function fallbackModels(): ModelOption[] {
  return WORKERS_AI_CATALOG.map((c) => ({
    id: c.id,
    label: c.label,
    provider: 'workers-ai' as const,
  }));
}
