# NiubiAgent

> 高性能地图绘画协作平台 — 10万用户 / 5万并发 / Cloudflare 全家桶架构

## 🚀 技术基座

本项目已全面迁移至 **Cloudflare 全家桶** 架构，实现边缘优先、高性能、零跨境延迟：

- **前端**: Next.js 15 (App Router) @ Cloudflare Pages
- **数据库**: Cloudflare D1 (关系型 SQLite)
- **存储**: Cloudflare R2 (S3 兼容对象存储)
- **实时同步**: Cloudflare Durable Objects (边缘有状态同步)
- **异步写入**: Cloudflare Queues (削峰填谷)
- **认证**: Lucia Auth v3 (自建认证，适配 D1)
- **状态管理**: Zustand (轻量级本地状态)
- **地图引擎**: MapLibre GL JS (WebGL 渲染)

---

## 💻 本地开发调试

本地开发完全使用 `wrangler` 模拟 Cloudflare 环境，无需连接真实云端资源。

### 1️⃣ 前置条件

- **Node.js**: v20.x 或更高版本
- **pnpm**: `npm install -g pnpm`
- **Cloudflare 账号**: [免费注册](https://dash.cloudflare.com/sign-up)

### 2️⃣ 快速启动

#### A. 安装依赖
```bash
pnpm install
```

#### B. 初始化本地数据库 (D1)
本项目使用 D1 (SQLite) 存储用户和笔画。首先运行迁移脚本初始化本地 DB 文件：

```bash
# 初始化本地 SQLite 数据库
pnpm db:migrate
```

#### C. 配置本地密钥
在项目根目录创建 `.dev.vars` (这是 Cloudflare 的本地密钥文件，不提交到 Git)：

```bash
echo 'AUTH_SECRET="your-32-char-random-string"' > .dev.vars
```

同时确保 `.env.local` 存在：
```env
NEXT_PUBLIC_DO_WEBSOCKET_URL="ws://localhost:8787"
```

#### D. 启动开发环境 (并排启动)

**终端 1: Next.js 前端**
```bash
# 现在可以直接使用 next dev，已通过 next.config.ts 集成 Cloudflare 绑定
pnpm dev
```

**终端 2: Cloudflare Workers (Durable Objects 服务器)**
```bash
cd cf-workers
pnpm wrangler dev
```

### 3️⃣ 调试提示
- **递归构建错误**: 如果遇到 `vercel build recursive invocation` 错误，是因为 `build` 脚本配置成了 `next-on-pages`。现已修正：`build` 对应 `next build`，`pages:build` 对应 Cloudflare 构建。
- **数据库**: 本地 D1 存储在 `.wrangler/state/v3/d1` 目录下。
- **WebSocket**: 确保终端 2 运行在 8787 端口，前端 `useSync` 会自动连接。
- **登录**: 首次运行需先点击右上角「注册」。

---

## ☁️ Cloudflare 生产环境配置

部署到生产环境需要先在 Cloudflare 控制台创建对应的资源。

### 1️⃣ 创建 D1 数据库
```bash
# 创建 D1 实例
npx wrangler d1 create niubiagent-db
```
复制输出中的 `database_id`，替换根目录 `wrangler.toml` 中的 `database_id`。

### 2️⃣ 创建 R2 存储桶
```bash
# 创建用于头像和快照的存储桶
npx wrangler r2 bucket create niubiagent-storage
```

### 3️⃣ 配置认证密钥 (Secret)
```bash
# 设置 Lucia Auth 加密密钥
npx wrangler pages secret put AUTH_SECRET
```

### 4️⃣ 执行线上数据库迁移
```bash
# 在生产环境 D1 执行 SQL
pnpm db:migrate:prod
```

### 5️⃣ 部署

**部署 Worker (DO + Queue):**
```bash
pnpm deploy:workers
```

**部署 Next.js (Pages):**
```bash
# 该命令会自动运行 pages:build
pnpm deploy
```

---

## 📂 核心目录结构

- `src/core/`: **核心引擎** (纯 TS)，框架无关，包含笔刷、渲染、视口管理。
- `src/lib/auth/`: **Lucia Auth** 配置与 Session 验证。
- `src/lib/db/`: **D1 (Drizzle)** 查询封装。
- `src/app/api/`: **Edge API** 路由，处理 D1/R2 读写。
- `cf-workers/`: **Durable Objects** 实时同步服务器代码。
- `drizzle/`: 数据库表结构与迁移脚本。

## 🛠️ 常用开发命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动标准 Next.js 开发环境 (支持 Cloudflare 绑定) |
| `pnpm pages:build` | 构建适用于 Cloudflare Pages 的产物 |
| `pnpm pages:preview` | 在本地预览 Pages 构建后的效果 |
| `pnpm db:migrate` | 执行本地 D1 数据库初始化 |
| `pnpm deploy` | 执行构建并部署到 Cloudflare Pages |
| `cd cf-workers && pnpm wrangler dev` | 启动实时同步服务器本地调试 |

## 📄 架构文档
详细的系统设计、高并发方案与数据库方案请参考：[docs/架构设计文档.md](docs/架构设计文档.md)
