# CloudChat 详细部署指南（Cloudflare + GitHub）

本文档提供从零开始的完整部署过程，你只需跟随步骤操作即可将本对话网站部署到公网。**整个部署过程完全免费**（免费额度足够个人使用）。

---

## 一、方案总览

### 1.1 架构图

```
┌─────────────┐      ┌──────────────────────────────────────┐
│   用户浏览器   │ ───▶ │        Cloudflare Pages 全球边缘网络       │
└─────────────┘      │                                      │
                     │  ├─ 静态资源（React 前端）                │
                     │  └─ /api/chat（Pages Functions）       │
                     │         │                             │
                     │         ▼                             │
                     │  ┌──────────────────────┐             │
                     │  │  Workers AI（AI 模型）   │             │
                     │  └──────────────────────┘             │
                     └──────────────────────────────────────┘
          ▲
          │ git push（代码托管）
   ┌─────────────┐
   │   GitHub 仓库  │
   └─────────────┘
```

- **前端**：Vite + React，构建产物 `dist/` 由 Cloudflare Pages 托管
- **后端**：`functions/api/chat.ts` 是 Pages Functions，运行在 Cloudflare 边缘网络，通过 AI Binding 调用 Workers AI 模型
- **数据**：对话记录保存在用户浏览器 localStorage，无需任何数据库
- **GitHub**：代码托管 + 触发自动部署

### 1.2 三种部署方式对比

| 方式 | 难度 | 是否自动更新 | 适用场景 |
|---|---|---|---|
| **A. GitHub 直连 Pages**（推荐） | ⭐ | ✅ push 即部署 | 日常开发维护 |
| B. Wrangler CLI 手动部署 | ⭐ | ❌ 需手动执行 | 快速上线、不用 GitHub |
| C. GitHub Actions | ⭐⭐ | ✅ push 即部署 | 已熟悉 GitHub Actions 的团队 |

> 本指南已按「方式 A」为你实际验证部署成功（线上示例：`https://cloudchat-5q5.pages.dev`）。

### 1.3 费用说明（重要）

| 项目 | 免费额度 | 超出后 |
|---|---|---|
| Cloudflare Pages | 无限静态托管 | — |
| Pages Functions 请求 | 10 万次/天 | 按量计费 |
| Workers AI | 10,000 neurons/天 | 约 $0.3~0.5/百万 tokens |
| GitHub | 公开仓库无限 | — |

> 默认模型 `llama-3.2-3b-instruct` 每次对话仅消耗约 1~5 neurons，免费额度可支持每天**上千次对话**，个人使用完全足够。

---

## 二、前置准备

### 2.1 注册账号（若没有）

| 平台 | 地址 | 说明 |
|---|---|---|
| GitHub | https://github.com | 免费注册 |
| Cloudflare | https://dash.cloudflare.com/sign-up | 免费注册 |

### 2.2 本地安装工具

| 工具 | 版本要求 | 安装方式 | 验证 |
|---|---|---|---|
| Node.js | ≥ 20（建议 22 LTS） | https://nodejs.org | `node -v` |
| Git | 任意新版 | https://git-scm.com | `git --version` |

### 2.3 登录 Cloudflare CLI（方式 B 需要，方式 A 可选）

```bash
# 在项目目录执行
npx wrangler login
# 浏览器会自动打开，点击「Allow」授权即可
```

验证是否登录成功：

```bash
npx wrangler whoami
# 应显示你的邮箱和 Account ID
```

> 若本地网络无法访问 OAuth 页面，可在环境变量中配置 API Token：`WRANGLER_API_TOKEN`（Dashboard → 右上角头像 → My Profile → API Tokens → Create Token）。

---

## 三、方式 A：GitHub + Cloudflare Pages 直连部署（推荐）

这是官方推荐的「Git 集成」方式：**把代码推到 GitHub，Cloudflare 自动构建并发布**，之后每次 `git push` 都自动上线新版本。

### 步骤 1：在 GitHub 创建仓库

1. 登录 GitHub，点击右上角 **+ → New repository**
2. 仓库名填 `cloudchat`，选择 **Public**（免费）或 **Private** 均可
3. **不要勾选** "Add a README" 等初始化选项（保持空仓库）
4. 点击 **Create repository**

创建后页面会显示两条命令，先放着，下一步使用。

### 步骤 2：本地代码推送到 GitHub

在本项目 `cloudchat` 目录打开终端，执行：

```bash
# 1. 初始化本地仓库（若未执行过）
git init

# 2. 添加所有文件并提交
git add -A
git commit -m "feat: CloudChat AI 对话网站初始版本"

# 3. 关联远程仓库（把 <你的用户名> 换成实际用户名）
git branch -M main
git remote add origin https://github.com/<你的用户名>/cloudchat.git

# 4. 推送
git push -u origin main
```

推送完成后，刷新 GitHub 仓库页面，应能看到全部代码。

### 步骤 3：Cloudflare 控制台连接 Git 仓库

1. 登录 https://dash.cloudflare.com ，进入你的账号
2. 左侧菜单选择 **Workers & Pages** → 点击 **Create** → 选择 **Pages** 标签页
3. 选择 **Connect to Git**（连接到 Git 提供商）
4. 首次使用需授权：点击 **Connect to GitHub**，允许 Cloudflare 访问你的 GitHub 仓库
5. 选择刚才的 `cloudchat` 仓库，点击 **Begin setup**

### 步骤 4：配置构建设置与 AI Binding

在 **Set up builds and deployments** 页面填写：

| 配置项 | 值 |
|---|---|
| Framework preset | **Vite**（会自动填充下方命令） |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Production branch | `main` |

点击 **Save and Deploy**，等待 1~2 分钟首次构建完成。

> 项目根目录的 `wrangler.jsonc` 已包含 AI Binding（`ai.binding = "AI"`）和 `CHAT_MODEL` 环境变量，Pages 构建时会自动读取。如果部署后接口报错，请手动检查一下：

1. 进入 Pages 项目 → **Settings** → **Functions**
2. **AI Bindings** → 确认存在绑定，变量名为 **AI**（如缺失点击 **Add binding** 添加）
3. **Compatibility flags** → 确认包含 `nodejs_compat`

### 步骤 5：验证部署成功

首次部署完成后，页面会显示你的专属域名，格式为：

```
https://cloudchat-xxxx.pages.dev
```

1. 点击该域名打开网站，应看到聊天界面
2. 输入任意问题（如「你好，介绍一下你自己」）并发送
3. 应看到 AI 逐字流式回复

> 若遇到问题，先看文末「十、常见问题排查」。

### 步骤 6：日常更新（push 即部署）

以后每次修改代码，只需：

```bash
git add -A
git commit -m "更新说明"
git push
```

Cloudflare 会自动重新构建并部署，无需任何手动操作。可在 **Workers & Pages → 项目 → Deployments** 查看每次部署记录，并支持一键回滚到任意历史版本。

---

## 四、方式 B：Wrangler CLI 命令行部署（备选）

不想用 GitHub 时，可用命令行直接部署：

```bash
# 1. 构建生产代码
npm run build

# 2. 创建 Pages 项目（只需第一次）
npx wrangler pages project create cloudchat --production-branch main

# 3. 部署
npx wrangler pages deploy dist --project-name cloudchat
```

部署成功后会输出类似：

```
✨ Deployment complete! Take a peek over at https://d158901c.cloudchat-5q5.pages.dev
```

### 配置 AI Binding

CLI 部署时，`wrangler.jsonc` 中的配置（AI Binding、CHAT_MODEL）会随部署自动生效。

也可以在 Cloudflare 控制台手动确认：**Workers & Pages → cloudchat → Settings → Functions → AI Bindings**。

---

## 五、方式 C：GitHub Actions 自动部署

仓库中已包含 `.github/workflows/deploy.yml`，可在 GitHub Actions 中自动构建部署。

### 配置 Secrets

1. 登录 Cloudflare Dashboard → **My Profile → API Tokens → Create Token**
2. 使用模板 **Edit Cloudflare Workers**，选择你的账号
3. 生成 Token 后保存（只显示一次）
4. 回到 GitHub 仓库 → **Settings → Secrets and variables → Actions**
5. 添加两个 Secrets：
   - `CLOUDFLARE_API_TOKEN`：上一步生成的 Token
   - `CLOUDFLARE_ACCOUNT_ID`：Cloudflare Dashboard 首页可看到（形如 `84fc8baf...`）

### 触发部署

之后每次 `git push` 到 `main` 分支，GitHub Actions 会自动执行：

```bash
npm ci → npm run build → wrangler pages deploy dist
```

在仓库 **Actions** 标签页可查看执行日志。

> 💡 方式 A 与方式 C 二选一即可，不要同时使用，避免重复部署。

---

## 六、本地开发调试

```bash
# 安装依赖
npm install

# 方式 1：仅前端 UI（改样式/组件用）
npm run dev            # 打开 http://localhost:5173

# 方式 2：完整环境（含 AI 对话，需已登录 wrangler）
npm run build
npx wrangler pages dev dist    # 打开 http://localhost:8788
```

> ⚠️ 已知问题：`wrangler pages dev` 本地模式下，远程 AI Binding 可能报 `internal error; reference = xxx`。这是 wrangler 本地开发环境的已知 bug（GitHub issue #9356），**部署到线上后不受影响**。若本地必须调试 AI，可改用线上部署版本验证。

---

## 七、自定义域名（可选）

1. 在 Cloudflare 添加你的域名（**Add a site** → 按向导修改 DNS 服务器为 Cloudflare 的 NS）
2. 进入 **Workers & Pages → cloudchat → Custom domains → Set up a custom domain**
3. 输入子域名，如 `chat.example.com`，点击 **Activate**
4. 等待 DNS 生效（通常几分钟），即可通过 `https://chat.example.com` 访问

---

## 八、切换 AI 模型（关键配置）

默认使用 `@cf/meta/llama-3.2-3b-instruct`（免费、快速）。如需更强的中文能力，可通过环境变量 `CHAT_MODEL` 切换：

### 修改方式

**方式 A（Git 集成）**：Pages 项目 → **Settings → Environment variables** → 添加 `CHAT_MODEL`，填写下方模型 ID，然后重新部署。

**方式 B（CLI）**：修改 `wrangler.jsonc` 中的 `vars.CHAT_MODEL`，重新执行 `npm run build && npx wrangler pages deploy dist`。

### 推荐模型

| 模型 ID | 特点 | 适用计划 |
|---|---|---|
| `@cf/meta/llama-3.2-3b-instruct` | 默认，轻量快速，中文可用 | 免费 ✅ |
| `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | 更强推理能力 | 免费/付费 |
| `@cf/zai-org/glm-5.3-flash` | 智谱 GLM，中文极佳，百万级上下文 | 付费 |
| `@cf/qwen/qwen3-30b-a3b-fp8` | 阿里通义 Qwen3，MoE 高性价比 | 付费 |

> 模型清单可随时在 https://developers.cloudflare.com/workers-ai/models/ 查询；不确定模型 ID 时，可在 Workers AI Playground 中直接测试。

---

## 九、费用与配额详解

### Workers AI 免费额度

- 免费计划每天 **10,000 neurons** 的推理额度
- 每次对话消耗 neurons 由模型和长度决定（默认模型约 1~5 neurons/次回复）
- 用量可在 Dashboard → **Workers & Pages → Workers AI** 查看

### 何时需要付费

- 每日对话量很大（个人使用几乎不可能超过）
- 需要使用付费模型（如 GLM-5.3-Flash）
- 需要更大上下文 / 更多并发

付费套餐：Workers Paid 计划（$5/月起），或使用 AI Gateway 预付费积分。

---

## 十、常见问题排查

| 现象 | 原因 | 解决方法 |
|---|---|---|
| 网站打开但发送消息报「对话服务暂时不可用」 | AI Binding 未配置或名称不是 `AI` | 检查 Settings → Functions → AI Bindings |
| 提示「模型不存在 / Invalid model」 | `CHAT_MODEL` 拼写错误或模型不在免费计划 | 确认模型 ID，参考第八章 |
| 部署后页面是旧版本 | 构建缓存 | 在 Deployments 页面点「Retry deployment」 |
| 本地 `wrangler pages dev` 报 `internal error` | wrangler 本地开发 bug | 用线上部署版本验证，不影响生产 |
| 页面 404 | 输出目录不对 | 确认构建输出目录为 `dist` |
| 收到「超出每日配额」 | Workers AI 额度耗尽 | 次日自动恢复，或升级付费计划 |
| GitHub 推送失败 | 远程仓库未关联 | 执行 `git remote add origin <仓库地址>` |

---

## 十一、安全与隐私说明

- **不收集个人信息**：本项目无登录系统、无后端数据库，服务器只接收对话消息并转发给 AI 模型
- **对话数据存本地**：所有对话历史保存在访问者自己的浏览器 localStorage 中，关浏览器不丢失，清缓存即清除
- **无鉴权暴露**：`/api/chat` 接口未做鉴权。若担心被滥用，可在 API 中增加速率限制或简单令牌校验（生产环境建议）
- **内容合规**：AI 回复内容由模型生成，建议在生产环境接入 Cloudflare AI Gateway 的内容审核能力

---

## 附：常用命令速查

```bash
npm install              # 安装依赖
npm run dev              # 本地前端开发
npm run build            # 构建生产产物
npx wrangler pages dev dist   # 本地完整运行（含 AI）
npx wrangler pages deploy dist --project-name cloudchat  # 部署到线上
npx wrangler login       # 登录 Cloudflare
npx wrangler whoami      # 查看登录状态
```

祝部署顺利！如有任何问题，欢迎提交 GitHub Issue。
