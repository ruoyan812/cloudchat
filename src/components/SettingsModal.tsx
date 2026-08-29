import { useEffect, useState, type FormEvent } from 'react';
import {
  X,
  Loader2,
  Github,
  Link2,
  Check,
  UserRound,
  KeyRound,
  LinkIcon,
  Settings,
} from 'lucide-react';
import {
  fetchOAuthProviders,
  updateProfile,
  changePassword,
  getMe,
  type User,
  type OAuthProviderInfo,
} from '../lib/auth';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  user: User;
  onUpdated: (user: User) => void;
}

const OAUTH_ICONS: Record<string, typeof Github> = {
  github: Github,
  google: Link2,
};

const inputClass =
  'w-full bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-colors';

export default function SettingsModal({ open, onClose, user, onUpdated }: SettingsModalProps) {
  const [nickname, setNickname] = useState(user.nickname || user.username);
  const [savingNick, setSavingNick] = useState(false);
  const [nickMsg, setNickMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [providers, setProviders] = useState<OAuthProviderInfo[]>([]);

  useEffect(() => {
    if (!open) return;
    setNickname(user.nickname || user.username);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setNickMsg(null);
    setPwdMsg(null);
    fetchOAuthProviders()
      .then(setProviders)
      .catch(() => setProviders([]));
  }, [open, user.nickname, user.username]);

  if (!open) return null;

  async function handleSaveNickname(e: FormEvent) {
    e.preventDefault();
    setSavingNick(true);
    setNickMsg(null);
    try {
      const updated = await updateProfile(nickname.trim());
      onUpdated(updated);
      setNickMsg({ type: 'ok', text: '昵称已保存' });
    } catch (err) {
      setNickMsg({
        type: 'err',
        text: err instanceof Error ? err.message : '保存失败，请稍后重试',
      });
    } finally {
      setSavingNick(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'err', text: '两次输入的新密码不一致' });
      return;
    }
    setSavingPwd(true);
    setPwdMsg(null);
    try {
      await changePassword(user.hasPassword ? oldPassword : '', newPassword);
      setPwdMsg({
        type: 'ok',
        text: user.hasPassword
          ? '密码已修改，下次登录请使用新密码'
          : '密码已设置，以后可使用邮箱 + 密码登录',
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // 刷新用户状态（hasPassword 已变为 true）
      const me = await getMe();
      if (me) onUpdated(me);
    } catch (err) {
      setPwdMsg({
        type: 'err',
        text: err instanceof Error ? err.message : '修改失败，请稍后重试',
      });
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/60 shadow-2xl shadow-teal-500/10 p-6 max-h-[85vh] overflow-y-auto animate-fade-up">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="关闭"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-white font-bold text-lg mb-0.5 flex items-center gap-2">
          <Settings className="w-5 h-5 text-teal-400" />
          账户设置
        </h2>
        <p className="text-slate-400 text-xs mb-5">
          管理昵称、第三方账号绑定与登录密码
        </p>

        {/* 昵称 */}
        <section className="mb-6">
          <h3 className="text-sm text-slate-300 font-medium mb-2 flex items-center gap-1.5">
            <UserRound className="w-4 h-4 text-teal-400" />
            昵称
          </h3>
          <form onSubmit={handleSaveNickname} className="flex gap-2">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="页面显示的名称（默认用户名）"
              maxLength={30}
              required
              className={inputClass}
            />
            <button
              type="submit"
              disabled={savingNick || !nickname.trim()}
              className="shrink-0 px-4 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              {savingNick ? <Loader2 className="w-4 h-4 animate-spin" /> : '保存'}
            </button>
          </form>
          {nickMsg && (
            <p
              className={`text-xs mt-1.5 ${
                nickMsg.type === 'ok' ? 'text-teal-400' : 'text-rose-400'
              }`}
            >
              {nickMsg.text}
            </p>
          )}
          <p className="text-[11px] text-slate-500 mt-1.5">
            昵称仅用于页面展示，不影响登录使用的用户名
          </p>
        </section>

        {/* OAuth 绑定 */}
        <section className="mb-6">
          <h3 className="text-sm text-slate-300 font-medium mb-2 flex items-center gap-1.5">
            <LinkIcon className="w-4 h-4 text-teal-400" />
            第三方账号绑定
          </h3>
          <p className="text-[11px] text-slate-500 mb-2">
            绑定后可直接用该第三方账号登录，可绑定多个
          </p>
          <div className="space-y-2">
            {providers.length === 0 && (
              <p className="text-xs text-slate-500">暂未配置第三方登录</p>
            )}
            {providers.map((p) => {
              const Icon = OAUTH_ICONS[p.provider] ?? Link2;
              const linked = (user.oauthLinks ?? []).includes(p.provider);
              return (
                <div
                  key={p.provider}
                  className="flex items-center justify-between bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2.5"
                >
                  <span className="flex items-center gap-2 text-sm text-slate-200">
                    <Icon className="w-4 h-4" />
                    {p.displayName}
                  </span>
                  {linked ? (
                    <span className="flex items-center gap-1 text-xs text-teal-400">
                      <Check className="w-3.5 h-3.5" />
                      已绑定
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = p.loginUrl;
                      }}
                      className="text-xs text-slate-300 bg-slate-700/60 hover:bg-teal-500 hover:text-white rounded-lg px-3 py-1.5 transition-colors"
                    >
                      绑定
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 密码 */}
        <section>
          <h3 className="text-sm text-slate-300 font-medium mb-2 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-teal-400" />
            {user.hasPassword ? '修改密码' : '设置密码'}
          </h3>
          <p className="text-[11px] text-slate-500 mb-2">
            {user.hasPassword
              ? '修改后，下次登录请使用新密码'
              : '当前使用第三方登录，设置密码后可用邮箱 + 密码登录'}
          </p>
          <form onSubmit={handleChangePassword} className="space-y-2.5">
            {user.hasPassword && (
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="当前密码"
                autoComplete="current-password"
                required
                className={inputClass}
              />
            )}
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新密码（至少 6 位）"
              autoComplete="new-password"
              minLength={6}
              maxLength={64}
              required
              className={inputClass}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="确认新密码"
              autoComplete="new-password"
              minLength={6}
              maxLength={64}
              required
              className={inputClass}
            />
            {pwdMsg && (
              <p
                className={`text-xs ${pwdMsg.type === 'ok' ? 'text-teal-400' : 'text-rose-400'}`}
              >
                {pwdMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={savingPwd}
              className="w-full flex items-center justify-center gap-2 bg-slate-700/70 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
            >
              {savingPwd ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  处理中…
                </>
              ) : user.hasPassword ? (
                '修改密码'
              ) : (
                '设置密码'
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
