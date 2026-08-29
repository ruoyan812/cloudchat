import { useEffect, useRef, useState } from 'react';
import { Send, Square } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string) => void;
  onStop: () => void;
  isGenerating: boolean;
}

export default function ChatInput({ onSend, onStop, isGenerating }: ChatInputProps) {
  const [value, setValue] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  // 输入框自适应高度
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [value]);

  const submit = () => {
    const v = value.trim();
    if (!v || isGenerating) return;
    onSend(v);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="shrink-0 border-t border-slate-200 bg-white/80 backdrop-blur px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2 shadow-sm transition-all focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-500/10">
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="输入你的问题，Enter 发送，Shift+Enter 换行"
            className="flex-1 resize-none bg-transparent outline-none text-[15px] leading-relaxed py-1 max-h-[180px] placeholder:text-slate-400"
          />
          {isGenerating ? (
            <button
              onClick={onStop}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-rose-500 hover:bg-rose-400 text-white transition-all active:scale-95"
              aria-label="停止生成"
              title="停止生成"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!value.trim()}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-teal-500 hover:bg-teal-400 text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-teal-500"
              aria-label="发送"
              title="发送"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-center text-[11px] text-slate-400 mt-2">
          AI 生成内容仅供参考 · 由 Cloudflare Workers AI 提供支持
        </p>
      </div>
    </div>
  );
}
