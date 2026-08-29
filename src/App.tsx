import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Menu as MenuIcon,
  Github as GithubIcon,
  Home as HomeIcon,
  LogIn as LogInIcon,
  Shield as ShieldIcon,
  Settings as SettingsIcon,
} from 'lucide-react';
import type { ChatMessage, Conversation } from './types';
import { streamChat, uid, fetchRemoteConversations, pushRemoteConversations } from './lib/api';
import { getMe, logout as apiLogout, type User } from './lib/auth';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import WelcomeScreen from './components/WelcomeScreen';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import AdminPanel from './components/AdminPanel';
import NoticeModal from './components/NoticeModal';

const STORAGE_KEY = 'cloudchat.conversations.v1';

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.filter(
      (c): c is Conversation =>
        !!c && typeof c === 'object' && typeof (c as Conversation).id === 'string',
    );
  } catch {
    return [];
  }
}

function titleFrom(content: string): string {
  const clean = content.replace(/\s+/g, ' ').trim();
  return clean.length > 20 ? `${clean.slice(0, 20)}…` : clean || '新对话';
}

/** 合并本地与云端对话：以 id 去重，较新的 updatedAt 胜出 */
function mergeConversations(local: Conversation[], remote: Conversation[]): Conversation[] {
  const map = new Map<string, Conversation>();
  for (const c of local) map.set(c.id, c);
  for (const c of remote) {
    const existing = map.get(c.id);
    if (!existing || (c.updatedAt ?? 0) > existing.updatedAt) map.set(c.id, c);
  }
  return Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const pulledRef = useRef(false);

  const active = conversations.find((c) => c.id === activeId) ?? null;

  // 默认选中第一个会话
  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  // 持久化到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      /* 存储空间不足时忽略 */
    }
  }, [conversations]);

  // 启动时恢复登录态并拉取云端对话
  useEffect(() => {
    let cancelled = false;
    getMe()
      .then(async (u) => {
        if (cancelled) return;
        if (u) {
          setUser(u);
          try {
            const remote = await fetchRemoteConversations();
            if (!cancelled) setConversations((local) => mergeConversations(local, remote));
          } catch {
            /* 云端不可用时保留本地 */
          }
        }
      })
      .catch(() => {
        /* 忽略恢复失败 */
      })
      .finally(() => {
        if (!cancelled) pulledRef.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 处理 OAuth 绑定回调结果（?oauth=link_*）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');
    if (oauth === 'link_success' || oauth === 'link_conflict' || oauth === 'link_error') {
      window.history.replaceState({}, '', window.location.pathname);
      if (oauth === 'link_success') {
        getMe()
          .then((u) => {
            if (u) setUser(u);
          })
          .catch(() => {
            /* 忽略 */
          });
        window.alert('第三方账号绑定成功');
      } else if (oauth === 'link_conflict') {
        window.alert('该第三方账号已被其他账户绑定，请先在对应平台解除后重试');
      } else {
        window.alert('第三方账号绑定失败，请重试');
      }
    }
  }, []);

  // 登录成功后拉取并合并云端对话
  const handleAuthed = useCallback((u: User) => {
    setUser(u);
    fetchRemoteConversations()
      .then((remote) => setConversations((local) => mergeConversations(local, remote)))
      .catch(() => {
        /* 云端不可用时保留本地 */
      })
      .finally(() => {
        pulledRef.current = true;
      });
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      /* 忽略 */
    }
    setUser(null);
    setAuthOpen(false);
  }, []);

  // 登录状态下防抖同步到云端（流式生成期间不推送）
  useEffect(() => {
    if (!user || !pulledRef.current || isGenerating) return;
    const timer = window.setTimeout(() => {
      pushRemoteConversations(conversations).catch(() => {
        /* 同步失败静默处理，下次变更会重试 */
      });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [conversations, user, isGenerating]);

  const updateConversation = useCallback(
    (id: string, updater: (c: Conversation) => Conversation) => {
      setConversations((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
    },
    [],
  );

  const newConversation = useCallback(() => {
    const conv: Conversation = {
      id: uid(),
      title: '新对话',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setSidebarOpen(false);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveId((prev) => (prev === id ? null : prev));
  }, []);

  const clearAll = useCallback(() => {
    if (conversations.length === 0) return;
    if (window.confirm('确定要清空全部对话吗？此操作不可恢复。')) {
      setConversations([]);
      setActiveId(null);
    }
  }, [conversations.length]);

  const stopGenerating = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const sendMessage = useCallback(
    async (rawContent: string) => {
      const content = rawContent.trim();
      if (!content || isGenerating) return;

      // 若当前没有活动会话，则创建新会话
      let convId = activeId;
      let history: ChatMessage[] = [];
      if (active) {
        convId = active.id;
        history = active.messages;
      } else {
        const conv: Conversation = {
          id: uid(),
          title: titleFrom(content),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
        };
        convId = conv.id;
        setConversations((prev) => [conv, ...prev]);
        setActiveId(conv.id);
      }

      const userMsg: ChatMessage = { role: 'user', content };
      const assistantMsg: ChatMessage = { role: 'assistant', content: '' };

      // 先渲染用户消息与空的助手消息
      updateConversation(convId!, (c) => ({
        ...c,
        title: c.messages.length === 0 ? titleFrom(content) : c.title,
        updatedAt: Date.now(),
        messages: [...c.messages, userMsg, assistantMsg],
      }));

      setIsGenerating(true);
      const abort = new AbortController();
      abortRef.current = abort;

      let acc = '';
      try {
        const payload = [...history, userMsg];
        for await (const chunk of streamChat(payload, abort.signal)) {
          acc += chunk;
          updateConversation(convId!, (c) => ({
            ...c,
            updatedAt: Date.now(),
            messages: c.messages.map((m, i, arr) =>
              i === arr.length - 1 && m.role === 'assistant' ? { ...m, content: acc } : m,
            ),
          }));
        }
      } catch (err) {
        if (!abort.signal.aborted) {
          const msg = err instanceof Error ? err.message : '网络错误，请稍后重试';
          updateConversation(convId!, (c) => ({
            ...c,
            messages: c.messages.map((m, i, arr) =>
              i === arr.length - 1 && m.role === 'assistant'
                ? { ...m, content: m.content || `（生成失败：${msg}）` }
                : m,
            ),
          }));
        }
      } finally {
        setIsGenerating(false);
        abortRef.current = null;
      }
    },
    [active, activeId, isGenerating, updateConversation],
  );

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        open={sidebarOpen}
        user={user}
        onClose={() => setSidebarOpen(false)}
        onSelect={(id) => {
          setActiveId(id);
          setSidebarOpen(false);
        }}
        onNew={newConversation}
        onDelete={deleteConversation}
        onClear={clearAll}
        onLogin={() => setAuthOpen(true)}
        onLogout={handleLogout}
        onOpenAdmin={() => setAdminOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="flex-1 flex flex-col min-w-0 h-full">
        {/* 顶栏 */}
        <header className="h-14 shrink-0 flex items-center gap-3 px-4 border-b border-slate-200 bg-white/70 backdrop-blur">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="打开菜单"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="/favicon.svg"
              alt="Yanverse"
              className="lg:hidden w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 p-1 shrink-0"
            />
            <h1 className="font-semibold text-slate-800 truncate">
              {active ? active.title : 'Yanverse'}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              基于 Cloudflare Workers AI
            </span>
            {user ? (
              <div className="flex items-center gap-1.5 pl-1.5">
                {user.role === 'admin' && (
                  <button
                    onClick={() => setAdminOpen(true)}
                    className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-amber-500 hover:bg-amber-50 rounded-lg px-2.5 py-1.5 transition-colors"
                    title="管理后台"
                  >
                    <ShieldIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">管理</span>
                  </button>
                )}
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg px-2.5 py-1.5 transition-colors"
                  title="账户设置"
                >
                  <SettingsIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">设置</span>
                </button>
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {(user.nickname || user.username)[0].toUpperCase()}
                </span>
                <span className="hidden sm:block text-sm text-slate-700 font-medium max-w-[120px] truncate">
                  {user.nickname || user.username}
                </span>
              </div>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg px-2.5 py-1.5 transition-colors"
              >
                <LogInIcon className="w-4 h-4" />
                <span className="hidden sm:inline">登录</span>
              </button>
            )}
            <a
              href="https://page.roooooyan.work"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="返回主页"
            >
              <HomeIcon className="w-5 h-5" />
            </a>
            <a
              href="https://github.com/ruoyan812/cloudchat"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="GitHub"
            >
              <GithubIcon className="w-5 h-5" />
            </a>
          </div>
        </header>

        {/* 内容区 */}
        {active && active.messages.length > 0 ? (
          <ChatWindow messages={active.messages} isGenerating={isGenerating} />
        ) : (
          <WelcomeScreen onPick={sendMessage} onNew={newConversation} />
        )}

        <ChatInput onSend={sendMessage} onStop={stopGenerating} isGenerating={isGenerating} />
      </main>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthed={handleAuthed}
      />

      {user && (
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          user={user}
          onUpdated={setUser}
        />
      )}

      <AdminPanel
        open={adminOpen}
        user={user}
        onClose={() => setAdminOpen(false)}
      />

      <NoticeModal />
    </div>
  );
}
