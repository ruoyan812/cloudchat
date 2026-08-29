import { useMemo, useState } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { ChatMessage } from '../types';

marked.setOptions({ gfm: true, breaks: true });

function TypingDots() {
  return (
    <div className="flex gap-1 py-1.5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

interface MessageItemProps {
  message: ChatMessage;
  streaming: boolean;
}

export default function MessageItem({ message, streaming }: MessageItemProps) {
  const [copied, setCopied] = useState(false);

  const html = useMemo(() => {
    if (!message.content) return '';
    const parsed = marked.parse(message.content, { async: false }) as string;
    return DOMPurify.sanitize(parsed);
  }, [message.content]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时忽略 */
    }
  };

  // 用户消息：右对齐渐变色气泡
  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="max-w-[85%] bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  // 助手消息：左对齐白色卡片
  return (
    <div className="flex gap-3 animate-fade-up">
      <div className="w-8 h-8 rounded-full bg-slate-800 text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
          {message.content ? (
            <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <TypingDots />
          )}
          {streaming && message.content && (
            <span className="inline-block w-[3px] h-4 bg-teal-500 ml-0.5 align-text-bottom animate-blink" />
          )}
        </div>
        {message.content && !streaming && (
          <button
            onClick={copy}
            className="mt-1.5 ml-1 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-teal-600 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? '已复制' : '复制'}
          </button>
        )}
      </div>
    </div>
  );
}
