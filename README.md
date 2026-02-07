# NiubiAgent

> 在真实地图上画画的全球协作平台 — Cloudflare 全家桶 Edge 架构

## 技术栈

| 类别 | 技术 |
|------|------|
| **框架** | Next.js 15 (App Router / Edge Runtime) |
| **部署** | Cloudflare Pages + Workers |
| **数据库** | Cloudflare D1 (SQLite) |
| **对象存储** | Cloudflare R2 |
| **实时同步** | Cloudflare Durable Objects (WebSocket) |
| **异步队列** | Cloudflare Queues |
| **认证** | Lucia Auth v3 + PBKDF2 |
| **地图引擎** | MapLibre GL JS 4.7 + OpenFreeMap |
| **状态管理** | Zustand 5 (5 stores) |
| **绘画引擎** | 纯 TypeScript Canvas 2D (4 种笔刷) |
| **UI** | shadcn/ui + Radix UI + Tailwind CSS 4 |

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

# 2. 初始化本地 D1 数据库 (两个迁移都会执行)
pnpm db:migrate

# 3. 创建本地密钥文件
echo 'AUTH_SECRET="any-random-string-for-local-dev"' > .dev.vars

# 4. 创建 .env.local
echo 'NEXT_PUBLIC_DO_WEBSOCKET_URL="ws://localhost:8787"' > .env.local
```

并排启动两个终端：

```bash
# 终端 1: Next.js 前端 (端口 3000)
pnpm dev

# 终端 2: Durable Objects 同步服务器 (端口 8787)
cd cf-workers && pnpm install && pnpm wrangler dev
```

浏览器打开 http://localhost:3000 → 注册账号 → 进入画布。

### 本地调试提示

- 本地 D1 文件位于 `.wrangler/state/v3/d1/`
- 修改 `src/core/` 下的引擎代码后 HMR 即时生效
- 如需清空数据库：删除 `.wrangler/` 目录并重新 `pnpm db:migrate`

---

## 生产部署

### 第一步：创建 Cloudflare 资源

登录 Cloudflare Dashboard 或使用 CLI 创建以下资源：

```bash
# 创建 D1 数据库 → 输出 database_id
npx wrangler d1 create niubiagent-db
# ⚠️ 记录输出的 database_id，后面要用

# 创建 R2 存储桶 (头像上传)
npx wrangler r2 bucket create niubiagent-storage

# 创建 KV 命名空间 (预留缓存) → 输出 id
npx wrangler kv namespace create CACHE
# ⚠️ 记录输出的 id
```

### 第二步：替换 wrangler.toml 中的 ID

**两个** wrangler.toml 都需要替换：

**根目录 `wrangler.toml`：**
```toml
[[d1_databases]]
database_id = "替换为你的 database_id"   # ← 这里

[[kv_namespaces]]
id = "替换为你的 kv_id"                  # ← 这里
```

**`cf-workers/wrangler.toml`：**
```toml
[[d1_databases]]
database_id = "替换为你的 database_id"   # ← 同一个 D1 的 database_id

[vars]
ALLOWED_ORIGINS = "https://你的域名.com"  # ← 改为你的线上域名
```

### 第三步：执行生产数据库迁移

```bash
# 在生产 D1 上建表 (users + sessions + drawings + map_pins)
pnpm db:migrate:prod
```

### 第四步：设置 Secrets

```bash
# 为 Pages 项目设置认证密钥
npx wrangler pages secret put AUTH_SECRET
# → 输入一个 32 字符以上的随机字符串

# 为 Workers 项目设置认证密钥 (DO 授权需要)
cd cf-workers && npx wrangler secret put AUTH_SECRET
```

### 第五步：部署

```bash
# 部署 cf-workers (Durable Objects + Queue Consumer)
pnpm deploy:workers
# → 记录输出的 Worker URL (如 https://niubiagent-worker.你的子域名.workers.dev)

# 部署 Next.js 到 Cloudflare Pages
pnpm deploy
# 首次部署会创建 Pages 项目，后续部署自动更新
```

### 第六步：配置 WebSocket URL

部署 Workers 后，需要在 Pages 项目里配置 WebSocket 地址：

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages → niubiagent
2. **Settings → Environment Variables**
3. 添加变量：
   - `NEXT_PUBLIC_DO_WEBSOCKET_URL` = `wss://niubiagent-worker.你的子域名.workers.dev`

或使用命令行：
```bash
npx wrangler pages secret put NEXT_PUBLIC_DO_WEBSOCKET_URL
# → 输入: wss://niubiagent-worker.你的子域名.workers.dev
```

---

## 自定义域名 (可选)

### 方式一：域名已在 Cloudflare DNS

1. Dashboard → Pages → niubiagent → **Custom domains**
2. 添加域名 (如 `niubiagent.com` 或 `draw.yourdomain.com`)
3. Cloudflare 自动配置 DNS 记录 + SSL

### 方式二：域名不在 Cloudflare

1. 将域名 DNS 转移到 Cloudflare (免费)：Dashboard → **Add a Site**
2. 按提示修改域名注册商的 Nameservers → Cloudflare 提供的 NS
3. 等待 DNS 生效 (通常 5 分钟 ~ 24 小时)
4. 然后按方式一操作

### Workers 自定义域名

如需给 WebSocket Worker 配自定义域名 (如 `ws.yourdomain.com`)：

1. Dashboard → Workers → niubiagent-worker → **Settings → Triggers**
2. 添加 **Custom Domain**: `ws.yourdomain.com`
3. 更新 Pages 环境变量：`NEXT_PUBLIC_DO_WEBSOCKET_URL=wss://ws.yourdomain.com`

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
| `pnpm dev` | 启动 Next.js 开发服务器 (Turbopack) |
| `pnpm build` | 构建 Next.js 产物 |
| `pnpm pages:build` | 构建 Cloudflare Pages 产物 |
| `pnpm pages:preview` | 本地预览 Pages 构建 |
| `pnpm db:migrate` | 执行本地 D1 迁移 (全部) |
| `pnpm db:migrate:prod` | 执行生产 D1 迁移 (全部) |
| `pnpm deploy` | 构建 + 部署到 Cloudflare Pages |
| `pnpm deploy:workers` | 部署 Durable Objects + Queue |
| `pnpm type-check` | TypeScript 类型检查 |
| `pnpm lint` | ESLint 检查 |

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
