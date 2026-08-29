import {
  Plus,
  MessageSquare,
  Trash2,
  X,
  CloudOff,
  Github,
  Home,
  LogIn,
  LogOut,
  CloudUpload,
  Shield,
  Settings,
} from 'lucide-react';
import type { Conversation } from '../types';
import type { User } from '../lib/auth';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
  onOpenSettings: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

export default function Sidebar({
  conversations,
  activeId,
  open,
  user,
  onClose,
  onSelect,
  onNew,
  onDelete,
  onClear,
  onLogin,
  onLogout,
  onOpenAdmin,
  onOpenSettings,
}: SidebarProps) {
  return (
    <>
      {/* 移动端遮罩 */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 shrink-0 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* 头部 */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800">
          <img
            src="/favicon.svg"
            alt="Yanverse"
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20 p-1.5"
          />
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white text-[15px] leading-tight">Yanverse</h1>
            <p className="text-[11px] text-slate-400 leading-tight">AI 在线对话</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="关闭菜单"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 新建对话 */}
        <div className="p-3">
          <button
            onClick={onNew}
            className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 active:scale-[0.98] transition-all text-white font-medium rounded-xl py-2.5 text-sm shadow-lg shadow-teal-500/25"
          >
            <Plus className="w-4 h-4" />
            新建对话
          </button>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
          {conversations.length === 0 && (
            <div className="flex flex-col items-center gap-2 text-slate-500 py-12 px-4 text-center">
              <MessageSquare className="w-8 h-8 opacity-40" />
              <p className="text-xs leading-relaxed">
                暂无对话记录
                <br />
                点击上方「新建对话」开始
              </p>
            </div>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${
                c.id === activeId
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
              onClick={() => onSelect(c.id)}
            >
              <MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] truncate">{c.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {formatTime(c.updatedAt)}
                  {c.messages.length > 0 && ` · ${Math.ceil(c.messages.length / 2)} 轮`}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 transition-all"
                aria-label="删除对话"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* 底部 */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {user ? (
            <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-800/60 rounded-xl">
              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                {(user.nickname || user.username)[0].toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-white font-medium truncate">
                  {user.nickname || user.username}
                </p>
                <p className="text-[11px] text-teal-400 flex items-center gap-1">
                  <CloudUpload className="w-3 h-3" />
                  云端同步已开启
                </p>
              </div>
              <button
                onClick={onOpenSettings}
                className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-700/60 transition-colors"
                aria-label="账户设置"
                title="账户设置"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 transition-colors"
                aria-label="退出登录"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg py-2 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              登录以同步对话记录
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={onOpenAdmin}
              className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg py-2 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              管理后台
            </button>
          )}
          <button
            onClick={onClear}
            className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg py-2 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空全部对话
          </button>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <CloudOff className="w-3.5 h-3.5" />
            由 Cloudflare Workers AI 驱动
          </div>
          <div className="flex items-center justify-center gap-3 text-[11px]">
            <a
              href="https://page.roooooyan.work"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-slate-500 hover:text-teal-400 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              返回主页
            </a>
            <span className="text-slate-700">·</span>
            <a
              href="https://github.com/ruoyan812/cloudchat"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-slate-500 hover:text-teal-400 transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              查看源码
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
