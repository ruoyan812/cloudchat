import { PenLine, FileCode2, HelpCircle, Languages } from 'lucide-react';

interface WelcomeScreenProps {
  onPick: (prompt: string) => void;
  onNew: () => void;
}

const SUGGESTIONS = [
  {
    icon: PenLine,
    title: '写作助手',
    desc: '帮我写一篇关于秋天的散文',
    prompt: '请帮我写一篇关于秋天的散文，语言优美，约 300 字。',
  },
  {
    icon: FileCode2,
    title: '代码编程',
    desc: '用 Python 写冒泡排序',
    prompt: '请用 Python 实现冒泡排序算法，并逐步解释它的原理和时间复杂度。',
  },
  {
    icon: HelpCircle,
    title: '学习答疑',
    desc: '解释什么是量子纠缠',
    prompt: '请用通俗易懂的方式解释什么是量子纠缠，适合完全没有物理基础的初学者理解。',
  },
  {
    icon: Languages,
    title: '翻译润色',
    desc: '把这句话翻译成英文',
    prompt: '请帮我把「今天的天气真好，适合出去散步」翻译成地道的英文，并给出两种风格。',
  },
];

export default function WelcomeScreen({ onPick }: WelcomeScreenProps) {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full py-8 animate-fade-up">
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 items-center justify-center mb-5 shadow-xl shadow-teal-500/25 p-3">
            <img
              src="/favicon.svg"
              alt="Yanverse"
              className="w-full h-full"
            />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">你好，我是 Yan</h2>
          <p className="text-slate-500 mt-2 text-[15px]">
            你的 AI 对话助手 · 写作、编程、答疑、翻译样样精通
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.title}
              onClick={() => onPick(s.prompt)}
              className="group text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-teal-400 hover:shadow-md hover:shadow-teal-500/5 transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <s.icon className="w-4 h-4 text-teal-500" />
                </span>
                <span className="font-medium text-slate-800 text-sm">{s.title}</span>
              </div>
              <p className="text-[13px] text-slate-500 pl-[42px]">{s.desc}</p>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-slate-400 mt-10">
          对话记录保存在本地浏览器 · 无需注册 · 基于 Cloudflare Workers AI
        </p>
      </div>
    </div>
  );
}
