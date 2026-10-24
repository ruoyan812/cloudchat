import { useMemo, useState } from 'react';
import { Sparkles, Check } from 'lucide-react';
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
  /** 是否处于「多选分享」模式，传入则在每条消息前显示勾选框 */
  selected?: boolean;
  onToggleSelect?: () => void;
}

function SelectBox({
  selected,
  onToggle,
}: {
  selected?: boolean;
  onToggle?: () => void;
}) {
  if (!onToggle) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={selected ? '取消选择' : '选择该消息'}
      className={`mt-0.5 w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-colors ${
        selected
          ? 'bg-teal-500 border-teal-500 text-white'
          : 'border-slate-300 text-transparent hover:border-teal-400'
      }`}
    >
      <Check className="w-3.5 h-3.5" />
    </button>
  );
}

/** 复制按钮：默认隐藏，鼠标悬停整条消息时淡入显示，位于气泡下方，点击后变为「已复制」 */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时忽略 */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? '已复制' : '点击复制'}
      className="mt-1 text-[12px] text-slate-400 hover:text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity"
    >
      {copied ? '已复制' : '点击复制'}
    </button>
  );
}

export default function MessageItem({ message, streaming, selected, onToggleSelect }: MessageItemProps) {
  const html = useMemo(() => {
    if (!message.content) return '';
    const parsed = marked.parse(message.content, { async: false }) as string;
    return DOMPurify.sanitize(parsed);
  }, [message.content]);

  const showCopy = !!message.content && !streaming;

  // 用户消息：右对齐渐变色气泡
  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-fade-up items-start gap-2 group">
        <SelectBox selected={selected} onToggle={onToggleSelect} />
        <div className="flex flex-col items-end max-w-[85%]">
          <div className="w-full bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed break-words">{message.content}</p>
          </div>
          {showCopy && <CopyButton text={message.content} />}
        </div>
      </div>
    );
  }

  // 助手消息：左对齐白色卡片
  return (
    <div className="flex gap-3 animate-fade-up items-start group">
      <SelectBox selected={selected} onToggle={onToggleSelect} />
      <div className="w-8 h-8 rounded-full bg-slate-800 text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col items-start">
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
        {showCopy && <CopyButton text={message.content} />}
      </div>
    </div>
  );
}
