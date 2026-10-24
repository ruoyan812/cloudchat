import { useState } from 'react';
import { X, Loader2, Copy, Check, Share2 } from 'lucide-react';
import type { ChatMessage } from '../types';
import { createShare } from '../lib/api';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
}

const EXPIRY_OPTIONS = [
  { label: '1 天', value: 1 },
  { label: '7 天', value: 7 },
  { label: '30 天', value: 30 },
  { label: '永久', value: 0 },
];

export default function ShareModal({ open, onClose, messages }: ShareModalProps) {
  const [expiry, setExpiry] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const { id } = await createShare(messages, expiry);
      setLink(`${location.origin}/?share=${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时忽略 */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/60 shadow-2xl shadow-teal-500/10 p-6 animate-fade-up">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="关闭"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-white font-bold text-lg mb-0.5 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-teal-400" />
          分享对话
        </h2>
        <p className="text-slate-400 text-xs mb-4">
          将选中的 {messages.length} 条消息生成公开只读链接，任何人凭链接即可查看
        </p>

        {!link ? (
          <>
            <div className="mb-4">
              <p className="text-sm text-slate-300 font-medium mb-2">链接有效期</p>
              <div className="grid grid-cols-4 gap-2">
                {EXPIRY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExpiry(opt.value)}
                    className={`py-2 rounded-lg text-sm border transition-colors ${
                      expiry === opt.value
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-xs text-rose-400 mb-3">{error}</p>}
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中…
                </>
              ) : (
                '生成分享链接'
              )}
            </button>
          </>
        ) : (
          <>
            <div className="mb-3">
              <p className="text-sm text-slate-300 font-medium mb-2">
                分享链接（已公开，可随意转发）
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={link}
                  className="flex-1 bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 truncate"
                />
                <button
                  onClick={copy}
                  className="shrink-0 px-3 rounded-lg bg-slate-700/60 hover:bg-teal-500 text-white text-sm transition-colors flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-slate-700/70 hover:bg-slate-600 text-white rounded-lg py-2.5 text-sm transition-colors"
            >
              完成
            </button>
          </>
        )}
      </div>
    </div>
  );
}
