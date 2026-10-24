-- AI 模型配置（管理员在后台维护）
CREATE TABLE IF NOT EXISTS ai_models (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'workers-ai',
  label TEXT NOT NULL DEFAULT '',
  model_name TEXT NOT NULL DEFAULT '',
  base_url TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);

-- 预置 Cloudflare Workers AI 模型目录，默认仅启用一个作为兜底
INSERT OR IGNORE INTO ai_models (id, provider, label, model_name, enabled, sort_order, created_at, updated_at)
VALUES
  ('@cf/meta/llama-3.2-3b-instruct', 'workers-ai', 'Workers AI · Llama 3.2 3B', '@cf/meta/llama-3.2-3b-instruct', 1, 10, 0, 0),
  ('@cf/meta/llama-3.1-8b-instruct', 'workers-ai', 'Workers AI · Llama 3.1 8B', '@cf/meta/llama-3.1-8b-instruct', 0, 20, 0, 0),
  ('@cf/meta/llama-3.3-70b-instruct-fp8-fast', 'workers-ai', 'Workers AI · Llama 3.3 70B', '@cf/meta/llama-3.3-70b-instruct-fp8-fast', 0, 30, 0, 0),
  ('@cf/mistralai/mistral-7b-instruct-v0.1', 'workers-ai', 'Workers AI · Mistral 7B', '@cf/mistralai/mistral-7b-instruct-v0.1', 0, 40, 0, 0),
  ('@cf/qwen/qwen1.5-7b-chat', 'workers-ai', 'Workers AI · Qwen 1.5 7B', '@cf/qwen/qwen1.5-7b-chat', 0, 50, 0, 0),
  ('@cf/google/gemma-2-9b-it', 'workers-ai', 'Workers AI · Gemma 2 9B', '@cf/google/gemma-2-9b-it', 0, 60, 0, 0);
