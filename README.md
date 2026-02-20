# Map (Monorepo)

> 在真实地图上画画的全球协作平台 — Cloudflare 全家桶 Edge 架构

## 项目结构

本项目采用 Monorepo (单体仓库) 架构，包含以下模块：

- **`web/`**: Next.js 16 前端应用 (Web App)。
- **`ios/`**: React Native (Expo) 移动端应用 (开发中)。
- **`ios/`**: React Native (Expo) 移动端应用 (开发中)。
- **`drizzle/`**: 数据库 Schema 定义与迁移文件。

## 技术栈 (Web)

| 类别 | 技术 |
|------|------|
| **框架** | Next.js 16 (App Router / Edge Runtime) |
| **部署** | Cloudflare Workers (OpenNext) |
| **数据库** | Cloudflare D1 (SQLite) |
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

```

# 6. 启动 iOS 应用 (可选)

```bash
# 查询可用设备
xcrun xctrace list devices
# 启动 iOS 模拟器或真机 (替换为你的设备 ID)
pnpm --filter ios ios --device 00008140-000C2D3E1E63001C  # 16pro
pnpm --filter ios ios --device 00008103-000E20503A8A001E  # ipad

# 启动 Expo 开发服务器

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

# 3. 创建 KV (可选)
npx wrangler kv namespace create CACHE
```

请确保根目录 `web/wrangler.toml` 中的 `database_id` 已更新为你的 D1 ID。

### 部署命令

```bash
# 1. 部署前端 (Next.js)
pnpm --filter web run deploy

# 2. 同步数据库配置 (执行生产环境迁移)
pnpm --filter web db:migrate:prod
```

---

## 常用命令汇总

| 命令 | 说明 |
|------|------|
| `pnpm install` | 安装所有项目的依赖 (Web + iOS + Root) |
| `pnpm --filter web dev` | 启动 Web 前端开发服务器 |
| `pnpm --filter web db:migrate` | 本地数据库迁移 |
| `pnpm --filter web db:migrate:prod` | 生产数据库迁移 |
| `pnpm --filter web deploy` | 部署 Web 前端 |
