# CloudChat · AI 在线对话网站

基于 **Cloudflare Workers AI** 的免费 AI 对话网站，部署在 **Cloudflare Pages**，代码托管在 **GitHub**。支持流式回复、多轮对话、Markdown 渲染、对话历史本地保存。

## 功能特性

- 流式 AI 回复（打字机效果，可随时停止）
- 多轮上下文对话
- 对话历史保存在浏览器 localStorage（无需后端数据库）
- 新建 / 删除 / 清空对话
- Markdown 渲染（代码块、表格、列表等）
- 移动端响应式布局

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vite 7 · React 19 · TypeScript · Tailwind CSS 4 · Lucide 图标 |
| 后端 | Cloudflare Pages Functions · Workers AI（SSE 流式） |
| 部署 | Cloudflare Pages · GitHub（代码托管 / 自动部署） |

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 本地运行（仅前端 UI，无 AI 功能）
npm run dev

# 3. 本地完整运行（含 AI 对话，需已登录 wrangler）
npm run build
npx wrangler pages dev dist
```

## 部署

完整的图文部署过程见 **[DEPLOY.md](./DEPLOY.md)**，包含：

- 方式 A：GitHub + Cloudflare Pages 直连（推荐，push 即自动部署）
- 方式 B：Wrangler CLI 命令行部署
- AI 模型切换、自定义域名、成本说明、常见问题排查

## 项目结构

```
cloudchat/
├── functions/api/chat.ts   # AI 对话 API（Workers AI 流式）
├── src/
│   ├── App.tsx             # 主应用（会话状态 + 对话逻辑）
│   ├── lib/api.ts          # SSE 流式解析
│   └── components/         # Sidebar / ChatWindow / MessageItem / ChatInput ...
├── public/                 # 静态资源
├── .github/workflows/      # GitHub Actions 自动部署
└── wrangler.jsonc          # Cloudflare 配置（AI Binding、模型、构建目录）
```

## 免责声明

本项目为演示用途，AI 生成内容仅供参考。用户对话数据仅存储在浏览器本地，服务器不保存任何个人信息。
