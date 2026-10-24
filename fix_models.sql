-- 修正已废弃的 Workers AI 模型 ID（2026-10 官方更名）
UPDATE ai_models
SET id = '@cf/mistralai/mistral-small-3.1-24b-instruct',
    model_name = '@cf/mistralai/mistral-small-3.1-24b-instruct',
    label = 'Workers AI · Mistral Small 3.1 24B',
    updated_at = strftime('%s', 'now') * 1000
WHERE id = '@cf/mistralai/mistral-7b-instruct-v0.1';

UPDATE ai_models
SET id = '@cf/qwen/qwen3-30b-a3b-fp8',
    model_name = '@cf/qwen/qwen3-30b-a3b-fp8',
    label = 'Workers AI · Qwen3 30B',
    updated_at = strftime('%s', 'now') * 1000
WHERE id = '@cf/qwen/qwen1.5-7b-chat';

UPDATE ai_models
SET id = '@cf/google/gemma-4-26b-a4b-it',
    model_name = '@cf/google/gemma-4-26b-a4b-it',
    label = 'Workers AI · Gemma 4 26B',
    updated_at = strftime('%s', 'now') * 1000
WHERE id = '@cf/google/gemma-2-9b-it';
