# Map

> 在真实地图上画画的全球协作平台 — Cloudflare 全家桶 Edge 架构

## 技术栈

| 类别 | 技术 |
|------|------|
| **框架** | Next.js 16 (App Router / Edge Runtime) |
| **部署** | Cloudflare Workers (OpenNext) |
| **数据库** | Cloudflare D1 (SQLite) |
| **对象存储** | Cloudflare R2 |
| **实时同步** | Cloudflare Durable Objects (WebSocket) |
| **异步队列** | Cloudflare Queues |
| **认证** | Lucia Auth v3 (PBKDF2 适配 Edge) |
| **地图引擎** | MapLibre GL JS 4.7 + OpenFreeMap |
| **状态管理** | Zustand 5 (5 stores) |
| **绘画引擎** | 纯 TypeScript Canvas 2D (4 种笔刷) |
| **UI** | shadcn/ui + Tailwind CSS 4 |

---

## 本地开发

### 前置条件

- Node.js >= 20
- pnpm (`npm i -g pnpm`)
- Cloudflare 账号 ([免费注册](https://dash.cloudflare.com/sign-up))

### 快速启动

```bash
# 1. 安装依赖
pnpm install

# 2. 初始化本地 D1 数据库
pnpm db:migrate

# 3. 创建本地密钥文件 (.dev.vars)
echo 'AUTH_SECRET="any-random-string-at-least-32-chars"' > .dev.vars
echo 'RESEND_API_KEY="your_resend_api_key"' >> .dev.vars

# 4. 初始化开发环境并启动
pnpm dev
```

如需调试 WebSocket 同步，请在另一个终端启动同步服务器：

```bash
# 终端 2: Durable Objects 同步服务器 (默认端口 8787)
cd cf-workers && pnpm install && pnpm wrangler dev
```

浏览器打开 http://localhost:3000 → 进入画布。

### 本地调试提示

- 本地 D1 文件位于 `.wrangler/state/v3/d1/`
- 修改 `src/core/` 下的引擎代码后 HMR 即时生效
- 如需清空数据库：删除 `.wrangler/` 目录并重新 `pnpm db:migrate`

---

## 生产部署

项目采用 **Cloudflare Workers** 架构（配合 `OpenNext` 适配器），不再使用 Pages。

### 第一步：创建 Cloudflare 资源

```bash
# 1. 创建 D1 数据库
npx wrangler d1 create map-db

# 2. 创建 R2 存储桶 (用户上传)
npx wrangler r2 bucket create map-storage

# 3. 创建 R2 存储桶 (Next.js 增量缓存 - OpenNext 必须)
npx wrangler r2 bucket create map-next-cache

# 4. 创建 KV 命名空间 (缓存)
npx wrangler kv namespace create CACHE

# 5. 创建队列 (异步写入)
npx wrangler queues create stroke-queue
```

### 第二步：配置 wrangler.toml

替换根目录 `wrangler.toml` 中的 `database_id` 和 `kv_id`：

```toml
# 根目录 wrangler.toml
[[d1_databases]]
database_id = "你的_database_id"

[[kv_namespaces]]
id = "你的_kv_id"
```

同时替换 `cf-workers/wrangler.toml` 中的 D1 `database_id`（共用同一个数据库）。

### 第三步：部署同步服务器 (Required)

```bash
pnpm deploy:workers
# → 记录输出的 URL，例如: https://map-worker.username.workers.dev
```

### 第四步：部署 Next.js 应用

```bash
# 设置机密环境变量
npx wrangler secret put AUTH_SECRET
npx wrangler secret put RESEND_API_KEY

# 构建并部署
pnpm deploy
```

部署完成后，在 `wrangler.toml` 的 `[vars]` 中更新 `NEXT_PUBLIC_DO_WEBSOCKET_URL` 为记录的服务地址。

---

## 项目迁移说明 (Pages -> Workers)

如果你之前部署过 Pages 版本：
1. **删除 Pages 项目**：在仪表盘中删除名为 `map` 的 Pages 项目。
2. **迁移自定义域名**：
   - 移除 Pages 中的域名绑定。
   - 在 Workers 项目 `map` 的 **Settings -> Domains & Routes** 中添加你的自定义域名。

---

## 需要申请的资源清单

| 资源 | 是否需要申请 | 费用 | 说明 |
|------|-------------|------|------|
| Cloudflare 账号 | 是 | 免费 | [注册](https://dash.cloudflare.com/sign-up) |
| D1 数据库 | wrangler 命令创建 | 免费 (5M 读/天) | 超出后 $0.001/百万读 |
| R2 存储桶 | wrangler 命令创建 | 免费 (10GB) | 超出后 $0.015/GB/月 |
| KV 命名空间 | wrangler 命令创建 | 免费 (100K 读/天) | 预留，暂未使用 |
| Workers (DO) | 自动随 deploy | **需开通 Workers Paid ($5/月)** | DO 必须 Paid Plan |
| Queue | 自动随 deploy | 含在 Workers Paid | — |
| 域名 | 可选 | ~$10/年 | Cloudflare Registrar 或任意注册商 |
| MapLibre 瓦片 | 无需申请 | 免费 | OpenFreeMap，无 API Key |

> **重要**: Durable Objects 需要 Workers Paid Plan ($5/月)。其余资源初期均在免费额度内。

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动 Next.js 开发服务器 |
| `pnpm deploy` | 构建并部署 Next.js 到 Cloudflare Workers |
| `pnpm deploy:workers` | 部署同步服务器 (Durable Objects) |
| `pnpm db:migrate` | 本地 D1 数据库建表 |
| `pnpm db:migrate:prod` | 生产 D1 数据库建表 |
| `pnpm preview` | 在本地预览 Workers 生产构建 |

---

## 项目结构

```
src/
  app/          # Next.js App Router (页面 + API + 认证)
  core/         # 纯 TS 绘画引擎 (笔刷/渲染/输入/同步/墨水)
  components/   # React 组件 (画布/工具栏/认证/图钉/UI)
  hooks/        # React Hooks (引擎 ↔ React 桥接)
  stores/       # Zustand 状态 (auth/drawing/ink/pin/ui)
  lib/          # 工具 (认证/数据库/存储/Cloudflare 绑定)
  platform/     # 平台适配 (MapLibre + Canvas DOM)
cf-workers/     # Cloudflare Workers (Durable Objects + Queue)
drizzle/        # 数据库 Schema + 迁移 SQL
```

## 架构文档

详细系统设计见 [docs/架构设计文档.md](docs/架构设计文档.md)
