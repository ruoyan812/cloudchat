import { useState, type FormEvent } from 'react';
import { X, Loader2, UserRound, Mail, KeyRound, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { updateAdminUser, type AdminUser } from '../lib/admin';

interface EditUserModalProps {
  user: AdminUser;
  onClose: () => void;
  onSaved: (updated: AdminUser) => void;
}

const inputCls =
  'w-full bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-colors';
const labelCls = 'block text-xs text-slate-400 mb-1';

export default function EditUserModal({ user, onClose, onSaved }: EditUserModalProps) {
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email ?? '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const input: { username?: string; email?: string; password?: string } = {};
      if (username.trim() !== user.username) input.username = username.trim();
      if (email.trim() !== (user.email ?? '')) input.email = email.trim();
      if (password) input.password = password;
      if (Object.keys(input).length === 0) {
        setMsg({ type: 'err', text: '没有需要修改的内容' });
        return;
      }
      const updated = await updateAdminUser(user.id, input);
      onSaved(updated);
    } catch (err) {
      setMsg({
        type: 'err',
        text: err instanceof Error ? err.message : '保存失败，请稍后重试',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/60 shadow-2xl shadow-teal-500/10 p-5 space-y-4 animate-fade-up"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <UserRound className="w-5 h-5 text-teal-400" />
            编辑用户
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className={labelCls}>
            <UserRound className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
            用户名（登录用，3-20 位字母、数字、下划线）
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="用户名"
            minLength={3}
            maxLength={20}
            required
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>
            <Mail className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
            邮箱（用于邮箱登录）
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>
            <KeyRound className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
            重置密码（留空则不修改）
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入新密码（6-64 位）"
            minLength={6}
            maxLength={64}
            autoComplete="new-password"
            className={inputCls}
          />
          <p className="text-[11px] text-slate-500 mt-1">
            重置后，该用户需使用新密码登录（OAuth 用户也可用邮箱 + 新密码登录）
          </p>
        </div>

        {msg && (
          <div
            className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border ${
              msg.type === 'ok'
                ? 'text-teal-300 bg-teal-500/10 border-teal-500/30'
                : 'text-rose-300 bg-rose-500/10 border-rose-500/30'
            }`}
          >
            {msg.type === 'ok' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            )}
            {msg.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> 保存中…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> 保存修改
            </>
          )}
        </button>
      </form>
    </div>
  );
}
