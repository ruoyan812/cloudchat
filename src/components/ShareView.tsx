import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import type { ChatMessage } from '../types';
import { getShare } from '../lib/api';
import MessageItem from './MessageItem';

interface ShareViewProps {
  id: string;
  onBack: () => void;
}

export default function ShareView({ id, onBack }: ShareViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [expiresAt, setExpiresAt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getShare(id)
      .then((data) => {
        if (cancelled) return;
        setMessages(data.messages);
        setExpiresAt(data.expiresAt);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-teal-50/40">
      <header className="h-14 shrink-0 flex items-center gap-3 px-4 border-b border-slate-200 bg-white/70 backdrop-blur">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg px-2.5 py-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <h1 className="font-semibold text-slate-800 truncate">Yanverse 分享</h1>
        </div>
        <span className="ml-auto text-xs text-slate-400">由 Yanverse 生成</span>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center gap-2 text-slate-400 py-20">
              <Loader2 className="w-5 h-5 animate-spin" />
              加载中…
            </div>
          )}
          {error && !loading && (
            <div className="flex flex-col items-center gap-2 text-rose-500 py-20 text-center">
              <AlertCircle className="w-8 h-8" />
              <p className="text-sm">{error}</p>
              <button onClick={onBack} className="mt-2 text-sm text-teal-600 hover:underline">
                返回主页
              </button>
            </div>
          )}
          {!loading && !error && (
            <>
              {messages.map((m, i) => (
                <MessageItem key={i} message={m} streaming={false} />
              ))}
              {expiresAt > 0 && (
                <p className="text-center text-xs text-slate-400">
                  本分享将于 {new Date(expiresAt).toLocaleString('zh-CN')} 过期
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
