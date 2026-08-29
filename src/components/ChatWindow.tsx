import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../types';
import MessageItem from './MessageItem';

interface ChatWindowProps {
  messages: ChatMessage[];
  isGenerating: boolean;
}

export default function ChatWindow({ messages, isGenerating }: ChatWindowProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastContent = messages[messages.length - 1]?.content;

  // 消息或流式内容更新时自动滚动到底部
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [lastContent, messages.length]);

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-teal-50/40">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {messages.map((m, i) => (
          <MessageItem
            key={i}
            message={m}
            streaming={isGenerating && i === messages.length - 1 && m.role === 'assistant'}
          />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
