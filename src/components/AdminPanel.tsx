import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  X,
  Shield,
  Settings2,
  Users as UsersIcon,
  Github,
  KeyRound,
  Trash2,
  Loader2,
  Plus,
  Link2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import type { User } from '../lib/auth';
import {
  fetchOAuthConfig,
  saveOAuthConfig,
  fetchUsers,
  createAdminUser,
  deleteAdminUser,
  type OAuthProviderConfig,
  type AdminUser,
} from '../lib/admin';
import EditUserModal from './EditUserModal';

interface AdminPanelProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
}

interface OAuthDraft {
  provider: string;
  displayName: string;
  clientId: string;
  clientSecret: string;
  enabled: boolean;
  hasSecret: boolean;
}

const PROVIDER_META: Record<string, { name: string; icon: typeof Github }> = {
  github: { name: 'GitHub', icon: Github },
  google: { name: 'Google', icon: Link2 },
};

const inputCls =
  'w-full bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-colors';
const labelCls = 'block text-xs text-slate-400 mb-1';

export default function AdminPanel({ open, user, onClose }: AdminPanelProps) {
  const [tab, setTab] = useState<'oauth' | 'users'>('oauth');
  const [drafts, setDrafts] = useState<OAuthDraft[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // 新建用户表单
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [newOAuthProvider, setNewOAuthProvider] = useState('');
  const [newOAuthId, setNewOAuthId] = useState('');

  const flash = useCallback((type: 'ok' | 'err', text: string) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 3500);
  }, []);

  const loadOAuth = useCallback(async () => {
    setLoading(true);
    try {
      const configs = await fetchOAuthConfig();
      const sorted = ['github', 'google']
        .map((p) => configs.find((c) => c.provider === p))
        .filter(Boolean) as OAuthProviderConfig[];
      setDrafts(
        sorted.map((c) => ({
          provider: c.provider,
          displayName: c.displayName,
          clientId: c.clientId,
          clientSecret: '',
          enabled: c.enabled,
          hasSecret: !!c.clientSecret,
        })),
      );
    } catch (err) {
      flash('err', err instanceof Error ? err.message : '读取 OAuth 配置失败');
    } finally {
      setLoading(false);
    }
  }, [flash]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await fetchUsers());
    } catch (err) {
      flash('err', err instanceof Error ? err.message : '读取用户列表失败');
    } finally {
      setLoading(false);
    }
  }, [flash]);

  useEffect(() => {
    if (!open) return;
    setMessage(null);
    setTab('oauth');
    void loadOAuth();
    void loadUsers();
  }, [open, loadOAuth, loadUsers]);

  async function handleSaveOAuth() {
    setSaving(true);
    try {
      await saveOAuthConfig(
        drafts.map((d) => ({
          provider: d.provider,
          clientId: d.clientId,
          clientSecret: d.clientSecret,
          enabled: d.enabled,
        })),
      );
      flash('ok', 'OAuth 配置已保存');
      await loadOAuth();
    } catch (err) {
      flash('err', err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const isOAuth = !!newOAuthProvider;
      await createAdminUser({
        username: newUsername,
        email: newEmail,
        password: newPassword || undefined,
        role: newRole,
        oauthProvider: isOAuth ? newOAuthProvider : undefined,
        oauthId: isOAuth ? newOAuthId : undefined,
      });
      flash('ok', '用户创建成功');
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('user');
      setNewOAuthProvider('');
      setNewOAuthId('');
      await loadUsers();
    } catch (err) {
      flash('err', err instanceof Error ? err.message : '创建用户失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteUser(id: string, username: string) {
    if (!window.confirm(`确定要删除用户「${username}」吗？其所有对话记录与登录会话将一并删除，此操作不可恢复。`)) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteAdminUser(id);
      flash('ok', '用户已删除');
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      flash('err', err instanceof Error ? err.message : '删除用户失败');
    } finally {
      setDeletingId(null);
    }
  }

  if (!open) return null;

  const isAdmin = user?.role === 'admin';

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/60 shadow-2xl shadow-teal-500/10 animate-fade-up">
        {/* 头部 */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 shrink-0">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-base leading-tight">管理后台</h2>
            <p className="text-[11px] text-slate-400 leading-tight">
              配置 OAuth 登录 · 管理用户账号
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="关闭管理后台"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-1 px-5 pt-3 shrink-0">
          <button
            onClick={() => setTab('oauth')}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
              tab === 'oauth'
                ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            OAuth 配置
          </button>
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
              tab === 'users'
                ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <UsersIcon className="w-4 h-4" />
            用户管理
            <span className="text-[10px] bg-slate-700 rounded-full px-1.5 py-0.5">{users.length}</span>
          </button>
        </div>

        {!isAdmin ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex flex-col items-center gap-3 text-slate-400 py-16">
              <AlertTriangle className="w-10 h-10 text-amber-400" />
              <p className="text-sm">当前账号不是管理员，无权访问管理后台</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {message && (
              <div
                className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border ${
                  message.type === 'ok'
                    ? 'text-teal-300 bg-teal-500/10 border-teal-500/30'
                    : 'text-rose-300 bg-rose-500/10 border-rose-500/30'
                }`}
              >
                {message.type === 'ok' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                )}
                {message.text}
              </div>
            )}

            {tab === 'oauth' ? (
              <div className="space-y-5">
                <div className="flex items-start gap-2 text-[12px] text-slate-400 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2.5">
                  <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-teal-400" />
                  <p>
                    在 GitHub / Google 开发者后台创建 OAuth App，将回调地址填写到对应平台，
                    再把 Client ID 与 Client Secret 填入下方并启用。保存后登录弹窗即会出现对应登录按钮。
                  </p>
                </div>

                {loading && drafts.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 text-slate-400 text-sm py-10">
                    <Loader2 className="w-4 h-4 animate-spin" /> 加载中…
                  </div>
                ) : (
                  drafts.map((d) => {
                    const meta = PROVIDER_META[d.provider] ?? {
                      name: d.displayName,
                      icon: Link2,
                    };
                    const Icon = meta.icon;
                    return (
                      <div
                        key={d.provider}
                        className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-4"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <span className="w-9 h-9 rounded-lg bg-slate-700/60 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-slate-200" />
                          </span>
                          <div className="flex-1">
                            <h3 className="text-white text-sm font-semibold">{meta.name}</h3>
                            <p className="text-[11px] text-slate-500 font-mono truncate">
                              回调地址：{window.location.origin}/api/oauth/{d.provider}/callback
                            </p>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <span className="text-xs text-slate-300">
                              {d.enabled ? '已启用' : '已停用'}
                            </span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={d.enabled}
                              onClick={() =>
                                setDrafts((prev) =>
                                  prev.map((x) =>
                                    x.provider === d.provider ? { ...x, enabled: !x.enabled } : x,
                                  ),
                                )
                              }
                              className={`relative w-10 h-5.5 rounded-full transition-colors ${
                                d.enabled ? 'bg-teal-500' : 'bg-slate-600'
                              }`}
                              style={{ height: '22px' }}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                  d.enabled ? 'translate-x-5' : ''
                                }`}
                              />
                            </button>
                          </label>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>Client ID</label>
                            <input
                              type="text"
                              value={d.clientId}
                              onChange={(e) =>
                                setDrafts((prev) =>
                                  prev.map((x) =>
                                    x.provider === d.provider
                                      ? { ...x, clientId: e.target.value }
                                      : x,
                                  ),
                                )
                              }
                              placeholder="粘贴 Client ID"
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>
                              Client Secret
                              {d.hasSecret && (
                                <span className="text-slate-500">（已保存，留空则不修改）</span>
                              )}
                            </label>
                            <input
                              type="password"
                              value={d.clientSecret}
                              onChange={(e) =>
                                setDrafts((prev) =>
                                  prev.map((x) =>
                                    x.provider === d.provider
                                      ? { ...x, clientSecret: e.target.value }
                                      : x,
                                  ),
                                )
                              }
                              placeholder={d.hasSecret ? '••••••••••••' : '粘贴 Client Secret'}
                              className={inputCls}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <button
                  onClick={handleSaveOAuth}
                  disabled={saving || loading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm shadow-lg shadow-teal-500/25 transition-all active:scale-[0.99]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> 保存中…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> 保存 OAuth 配置
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* 创建用户 */}
                <form
                  onSubmit={handleCreateUser}
                  className="rounded-xl bg-slate-800/40 border border-slate-700/50 p-4 space-y-3"
                >
                  <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                    <Plus className="w-4 h-4 text-teal-400" />
                    创建新用户
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>用户名（3-20 位字母、数字、下划线）</label>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="例如：xiaoming"
                        minLength={3}
                        maxLength={20}
                        required
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>邮箱（用于邮箱登录）</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="user@example.com"
                        required
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>登录方式</label>
                      <select
                        value={newOAuthProvider}
                        onChange={(e) => setNewOAuthProvider(e.target.value)}
                        className={`${inputCls} appearance-none`}
                      >
                        <option value="">用户名 + 密码</option>
                        <option value="github">GitHub OAuth</option>
                        <option value="google">Google OAuth</option>
                      </select>
                    </div>
                    {newOAuthProvider ? (
                      <div className="sm:col-span-2">
                        <label className={labelCls}>
                          OAuth 账号 ID（GitHub：User ID / Google：sub）
                        </label>
                        <input
                          type="text"
                          value={newOAuthId}
                          onChange={(e) => setNewOAuthId(e.target.value)}
                          placeholder="该用户在 GitHub/Google 的唯一数字 ID"
                          required
                          className={inputCls}
                        />
                      </div>
                    ) : (
                      <div>
                        <label className={labelCls}>初始密码（6-64 位）</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="设置初始密码"
                          minLength={6}
                          maxLength={64}
                          required
                          className={inputCls}
                        />
                      </div>
                    )}
                    <div>
                      <label className={labelCls}>角色</label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                        className={`${inputCls} appearance-none`}
                      >
                        <option value="user">普通用户</option>
                        <option value="admin">管理员</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1.5 text-sm text-white bg-teal-500/15 border border-teal-500/40 hover:bg-teal-500/25 rounded-lg px-3 py-2 transition-colors disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    创建用户
                  </button>
                </form>

                {/* 用户列表 */}
                <div className="rounded-xl bg-slate-800/40 border border-slate-700/50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-700/50">
                    <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                      <UsersIcon className="w-4 h-4 text-teal-400" />
                      全部用户（{users.length}）
                    </h3>
                  </div>
                  {users.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">暂无用户</p>
                  ) : (
                    <div className="divide-y divide-slate-700/40">
                      {users.map((u) => (
                        <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt={u.username}
                              className="w-8 h-8 rounded-full bg-slate-700 object-cover shrink-0"
                            />
                          ) : (
                            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                              {u.username[0].toUpperCase()}
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-white font-medium truncate flex items-center gap-1.5">
                              {u.username}
                              {u.id === user?.id && (
                                <span className="text-[10px] text-slate-500">（我）</span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {u.nickname && u.nickname !== u.username ? `${u.nickname} · ` : ''}
                              {u.email ?? '未设置邮箱'}
                              {' · '}
                              {u.oauthProvider
                                ? `通过 ${u.oauthProvider} 登录`
                                : '用户名 + 密码'}
                              {' · '}
                              {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                            </p>
                          </div>
                          {u.role === 'admin' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                              管理员
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 shrink-0">
                              用户
                            </span>
                          )}
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-700/60 transition-colors shrink-0"
                            aria-label={`编辑用户 ${u.username}`}
                            title="编辑用户名 / 邮箱 / 重置密码"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            disabled={u.id === user?.id || deletingId === u.id}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                            aria-label={`删除用户 ${u.username}`}
                            title={u.id === user?.id ? '不能删除自己' : '删除用户'}
                          >
                            {deletingId === u.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 底部提示 */}
        <div className="flex items-center gap-1.5 px-5 py-3 border-t border-slate-800 text-[11px] text-slate-500 shrink-0">
          <Shield className="w-3.5 h-3.5" />
          管理操作会记录生效；删除用户不可恢复
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>

    {editingUser && (
      <EditUserModal
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSaved={(updated) => {
          setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
          setEditingUser(null);
          flash('ok', '用户信息已更新');
        }}
      />
    )}
    </>
  );
}
