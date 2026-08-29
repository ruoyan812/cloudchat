import { useEffect, useState } from 'react';
import { Info, X, CheckCircle2 } from 'lucide-react';

const NOTICE_KEY = 'cloudchat.notice.v1';

/**
 * 网站访问提示：每次打开网站弹出一次（同一浏览器会话内刷新不再弹出）
 */
export default function NoticeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let shown = false;
    try {
      shown = sessionStorage.getItem(NOTICE_KEY) === '1';
    } catch {
      /* 隐私模式下忽略 */
    }
    if (shown) return;
    const t = window.setTimeout(() => setOpen(true), 400);
    return () => window.clearTimeout(t);
  }, []);

  if (!open) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(NOTICE_KEY, '1');
    } catch {
      /* 忽略 */
    }
    setOpen(false);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={dismiss}
      />
      <div className="relative w-full max-w-sm rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/60 shadow-2xl shadow-teal-500/10 p-5 space-y-4 animate-fade-up">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center">
            <Info className="w-5 h-5 text-teal-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-white font-bold text-base">温馨提示</h3>
            <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
              本网站 AI 生成的内容不一定准确，且当前可用的 token
              量较少，内容仅供参考。如有更改需求，请联系站主。
            </p>
          </div>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={dismiss}
          className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          我知道了
        </button>
      </div>
    </div>
  );
}
