/**
 * AI 模型配置读写：管理员在后台维护，存于 D1 ai_models 表。
 * - provider = 'workers-ai'：走 Cloudflare Workers AI（env.AI 绑定），model_name 即 @cf/... 模型名
 * - provider = 'custom'：OpenAI 兼容的自定义提供商，需 base_url / api_key / model_name
 */

export type ModelProvider = 'workers-ai' | 'custom';

export interface ModelRow {
  id: string;
  provider: ModelProvider;
  label: string;
  modelName: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  sortOrder: number;
}

export interface ModelUpsert {
  id: string;
  provider: ModelProvider;
  label: string;
  modelName?: string;
  baseUrl?: string;
  apiKey?: string;
  enabled: boolean;
  sortOrder: number;
}

const SELECT_COLS =
  'id, provider, label, model_name, base_url, api_key, enabled, sort_order';

function rowToModel(r: Record<string, unknown>): ModelRow {
  return {
    id: String(r.id),
    provider: r.provider === 'custom' ? 'custom' : 'workers-ai',
    label: String(r.label ?? ''),
    modelName: String(r.model_name ?? r.id),
    baseUrl: String(r.base_url ?? ''),
    apiKey: String(r.api_key ?? ''),
    enabled: Number(r.enabled) === 1,
    sortOrder: Number(r.sort_order ?? 0),
  };
}

/** 所有模型（含未启用），按 sort_order / id 排序 */
export async function getModels(db: D1Database): Promise<ModelRow[]> {
  const { results } = await db
    .prepare(`SELECT ${SELECT_COLS} FROM ai_models ORDER BY sort_order ASC, id ASC`)
    .all();
  return (results as Record<string, unknown>[]).map(rowToModel);
}

/** 仅已启用的模型 */
export async function getEnabledModels(db: D1Database): Promise<ModelRow[]> {
  const { results } = await db
    .prepare(`SELECT ${SELECT_COLS} FROM ai_models WHERE enabled = 1 ORDER BY sort_order ASC, id ASC`)
    .all();
  return (results as Record<string, unknown>[]).map(rowToModel);
}

/** 按 id 查询单个模型（用于对话路由解析自定义提供商） */
export async function getModelById(db: D1Database, id: string): Promise<ModelRow | null> {
  const row = await db
    .prepare(`SELECT ${SELECT_COLS} FROM ai_models WHERE id = ?`)
    .bind(id)
    .first();
  return row ? rowToModel(row as Record<string, unknown>) : null;
}

/** 批量 upsert；apiKey 为空串表示保留原值 */
export async function upsertModels(db: D1Database, models: ModelUpsert[]): Promise<void> {
  const now = Date.now();
  const stmts: D1PreparedStatement[] = [];
  for (const m of models) {
    const hasKey = !!m.apiKey;
    const cols =
      'id, provider, label, model_name, base_url' +
      (hasKey ? ', api_key' : '') +
      ', enabled, sort_order, created_at, updated_at';
    const placeholders = hasKey
      ? '?, ?, ?, ?, ?, ?, ?, ?, ?, ?'
      : '?, ?, ?, ?, ?, ?, ?, ?, ?';
    const baseVals: (string | number)[] = [
      m.id,
      m.provider,
      m.label,
      m.modelName ?? m.id,
      m.baseUrl ?? '',
      m.enabled ? 1 : 0,
      m.sortOrder,
      now,
      now,
    ];
    const vals = hasKey ? [m.id, m.provider, m.label, m.modelName ?? m.id, m.baseUrl ?? '', m.apiKey, m.enabled ? 1 : 0, m.sortOrder, now, now] : baseVals;

    const sql = `INSERT INTO ai_models (${cols}) VALUES (${placeholders})
      ON CONFLICT(id) DO UPDATE SET
        provider=excluded.provider,
        label=excluded.label,
        model_name=excluded.model_name,
        base_url=excluded.base_url${hasKey ? ', api_key=excluded.api_key' : ''},
        enabled=excluded.enabled,
        sort_order=excluded.sort_order,
        updated_at=excluded.updated_at`;

    stmts.push(db.prepare(sql).bind(...vals));
  }
  if (stmts.length) await db.batch(stmts);
}

/** 删除指定模型 */
export async function deleteModel(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM ai_models WHERE id = ?').bind(id).run();
}
