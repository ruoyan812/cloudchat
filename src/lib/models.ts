export interface ModelOption {
  /** 传给后端 /api/chat 的 model 字段 */
  id: string;
  /** 下拉框展示名 */
  label: string;
  /** 是否为自托管（Ollama），影响前端文案与后端路由 */
  local?: boolean;
}

/**
 * 模型列表：
 * - 以 @cf/ 开头的走 Cloudflare Workers AI（默认，原有能力保留）
 * - 以 local/ 开头的走自托管 Ollama，后端会把 local/ 前缀后的部分当作 Ollama 模型名
 */
export const MODELS: ModelOption[] = [
  { id: '@cf/meta/llama-3.2-3b-instruct', label: 'Workers AI · Llama 3.2 3B' },
  { id: 'local/qwen2.5:1.5b', label: '自托管 · Qwen2.5 1.5B', local: true },
  { id: 'local/qwen2.5:0.5b', label: '自托管 · Qwen2.5 0.5B', local: true },
];

export const DEFAULT_MODEL_ID = MODELS[0].id;
