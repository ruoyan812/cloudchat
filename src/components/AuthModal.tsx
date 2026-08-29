import { useEffect, useState, type FormEvent } from 'react';
import { X, Loader2, Sparkles, Github, Link2 } from 'lucide-react';
import { login, register, fetchOAuthProviders, type User, type OAuthProviderInfo } from '../lib/auth';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthed: (user: User) => void;
}

const OAUTH_ICONS: Record<string, typeof Github> = {
  github: Github,
  google: Link2,
};

export default function AuthModal({ open, onClose, onAuthed }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [account, setAccount] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthProviders, setOauthProviders] = useState<OAuthProviderInfo[]>([]);

  useEffect(() => {
    if (!open) return;
    fetchOAuthProviders()
      .then(setOauthProviders)
      .catch(() => setOauthProviders([]));
  }, [open]);

  if (!open) return null;

  function switchMode(next: 'login' | 'register') {
    setMode(next);
    setError('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const trimmed = account.trim();
      const user =
        mode === 'login'
          ? await login(trimmed, password)
          : await register(trimmed, email.trim(), password);
      onAuthed(user);
      setAccount('');
      setEmail('');
      setPassword('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  const tabBase =
    'py-1.5 rounded-lg text-sm font-medium transition-colors text-center';
  const tabActive = 'bg-teal-500 text-white shadow shadow-teal-500/30';
  const tabIdle = 'text-slate-400 hover:text-slate-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/60 shadow-2xl shadow-teal-500/10 p-6 animate-fade-up">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="关闭"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center mb-5">
          <img
            src="/favicon.svg"
            alt="Yanverse"
            className="w-14 h-14 rounded-2xl shadow-lg shadow-teal-500/20 mb-3"
          />
          <h2 className="text-white font-bold text-lg">
            {mode === 'login' ? '欢迎回来' : '创建账号'}
          </h2>
          <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-teal-400" />
            登录后对话记录云端同步，多端随时继续
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 bg-slate-800/60 rounded-xl p-1 mb-4">
          <button
            type="button"
            className={`${tabBase} ${mode === 'login' ? tabActive : tabIdle}`}
            onClick={() => switchMode('login')}
          >
            登录
          </button>
          <button
            type="button"
            className={`${tabBase} ${mode === 'register' ? tabActive : tabIdle}`}
            onClick={() => switchMode('register')}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {mode === 'login' ? '用户名或邮箱' : '用户名'}
            </label>
            <input
              type="text"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder={mode === 'login' ? '用户名或邮箱' : '3-20 位字母、数字或下划线'}
              autoComplete="username"
              minLength={3}
              maxLength={64}
              required
              className="w-full bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-colors"
            />
          </div>
          {mode === 'register' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="用于登录和找回账号"
                autoComplete="email"
                required
                className="w-full bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-colors"
              />
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-400 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
              maxLength={64}
              required
              className="w-full bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 transition-colors"
            />
          </div>

          {error && (
            <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm shadow-lg shadow-teal-500/25 transition-all active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                处理中…
              </>
            ) : mode === 'login' ? (
              '登录'
            ) : (
              '注册并登录'
            )}
          </button>
        </form>

        {oauthProviders.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex-1 h-px bg-slate-700/70" />
              <span className="text-[11px] text-slate-500">或使用第三方账号</span>
              <span className="flex-1 h-px bg-slate-700/70" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {oauthProviders.map((p) => {
                const Icon = OAUTH_ICONS[p.provider] ?? Link2;
                return (
                  <button
                    key={p.provider}
                    type="button"
                    onClick={() => {
                      window.location.href = p.loginUrl;
                    }}
                    className="flex items-center justify-center gap-2 text-sm text-slate-200 bg-slate-800/70 border border-slate-700 hover:border-teal-500/50 hover:bg-slate-800 rounded-lg py-2 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {p.displayName}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-500 text-center mt-4">
          支持邮箱登录 · 密码经 PBKDF2 加密存储 · 数据存放于 Cloudflare D1
        </p>
      </div>
    </div>
  );
}
