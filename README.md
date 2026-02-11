# Map (Monorepo)

> 在真实地图上画画的全球协作平台 — Cloudflare 全家桶 Edge 架构

## 项目结构

本项目采用 Monorepo (单体仓库) 架构，包含以下模块：

- **`web/`**: Next.js 16 前端应用 (Web App)。
- **`ios/`**: React Native (Expo) 移动端应用 (开发中)。
- **`cf-workers/`**: Cloudflare Workers 后端 (Durable Objects / WebSocket)。
- **`drizzle/`**: 数据库 Schema 定义与迁移文件。

## 技术栈 (Web)

| 类别 | 技术 |
|------|------|
| **框架** | Next.js 16 (App Router / Edge Runtime) |
| **部署** | Cloudflare Workers (OpenNext) |
| **数据库** | Cloudflare D1 (SQLite) |
| **同步服务** | Cloudflare Durable Objects (WebSocket) |
| **认证** | Lucia Auth v3 |
| **地图/绘画** | MapLibre GL JS + Canvas 2D |

---

## 本地开发指南

### 前置条件

- Node.js >= 20
- pnpm (`npm i -g pnpm`)
- Cloudflare 账号 ([免费注册](https://dash.cloudflare.com/sign-up))

### 快速启动 (Web + Backend)

**注意**: 所有命令请在 **根目录** 执行。

```bash
# 1. 安装所有依赖
pnpm install

# 2. 初始化本地 D1 数据库
pnpm --filter web db:migrate

# 3. 配置本地机密 (进入 web 目录创建)
# web/.dev.vars
echo 'AUTH_SECRET="any-random-string-at-least-32-chars"' > web/.dev.vars
echo 'RESEND_API_KEY="your_resend_api_key"' >> web/.dev.vars

# 4. 启动 Web 前端 (默认端口 3000)
pnpm --filter web dev
```

如需调试 WebSocket 同步（画笔实时共享），需单独启动后端 Worker：

```bash
# 5. 启动 Durable Objects 后端 (默认端口 8787)
pnpm --filter web deploy:workers # 部署到远端用于测试 (推荐)
# 或者本地启动
cd cf-workers && pnpm wrangler dev
```

---

## 生产部署

本项目采用 Cloudflare Workers 架构。

### 资源准备

如果你是第一次部署，需要创建 Cloudflare 资源：

```bash
# 1. 创建 D1 数据库
npx wrangler d1 create map-db

# 2. 创建 R2 存储桶
npx wrangler r2 bucket create map-storage
npx wrangler r2 bucket create map-next-cache

# 3. 创建 KV 和 Queue
npx wrangler kv namespace create CACHE
npx wrangler queues create stroke-queue
```

请确保根目录 `web/wrangler.toml` 和 `cf-workers/wrangler.toml` 中的 `database_id` 已更新为你的 D1 ID。

### 部署命令

```bash
# 1. 部署后端 (WebSocket 服务)
pnpm --filter web deploy:workers
# 记录输出的 URL，例如: https://map-worker.username.workers.dev

# 2. 部署前端 (Next.js)
pnpm --filter web run deploy
```

部署后，请在 Cloudflare Dashboard 或 `web/wrangler.toml` 中配置 `NEXT_PUBLIC_DO_WEBSOCKET_URL` 环境变量为后端的 URL。

---

## 常用命令汇总

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装所有项目的依赖 (Web + iOS + Root) |
| `pnpm --filter web dev` | 启动 Web 前端开发服务器 |
| `pnpm --filter web db:migrate` | 本地数据库迁移 |
| `pnpm --filter web db:migrate:prod` | 生产数据库迁移 |
| `pnpm --filter web deploy` | 部署 Web 前端 |
| `pnpm --filter web deploy:workers` | 部署后端 Workers |
