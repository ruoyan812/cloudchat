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
  ('@cf/mistralai/mistral-small-3.1-24b-instruct', 'workers-ai', 'Workers AI · Mistral Small 3.1 24B', '@cf/mistralai/mistral-small-3.1-24b-instruct', 0, 40, 0, 0),
  ('@cf/qwen/qwen3-30b-a3b-fp8', 'workers-ai', 'Workers AI · Qwen3 30B', '@cf/qwen/qwen3-30b-a3b-fp8', 0, 50, 0, 0),
  ('@cf/google/gemma-4-26b-a4b-it', 'workers-ai', 'Workers AI · Gemma 4 26B', '@cf/google/gemma-4-26b-a4b-it', 0, 60, 0, 0);
