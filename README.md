# MapDrawing

一个面向旅行者、城市探索者和本地社区的地图 UGC 产品：用户在真实地图上画线、擦除内容并放置留言图钉。Web 与 iOS 共用数据协议，后端运行在 Cloudflare Workers，使用 D1、R2 和 KV。

## 项目结构

- `web/`：Next.js 16 App Router，同时承载页面和 Route Handlers 后端
- `ios/`：Expo / React Native 客户端
- `packages/shared/`：跨端类型、常量和地图瓦片算法
- `drizzle/migrations/`：Cloudflare D1 数据库迁移

## 本地开发：不需要 Docker

Wrangler 会在 `web/.wrangler/` 中模拟 D1、KV 和 R2。推荐使用 Node.js 22 LTS 与 pnpm 9：

```bash
nvm use
pnpm install --frozen-lockfile
cp web/.dev.vars.example web/.dev.vars
pnpm --filter web db:migrate
pnpm --filter web dev
```

`next dev` 适合日常开发，地址通常是 `http://localhost:3000`。Route Handlers 就是项目后端；`initOpenNextCloudflareForDev()` 会把本地 Wrangler bindings 注入 Next.js，因此无需另启后端容器。

要验证与线上 Worker 更接近的构建、路由和 bindings，请运行：

```bash
pnpm --filter web preview
```

本地 D1 数据仅保存在 `web/.wrangler/`，不会读写生产数据库。iOS 默认连接已提交的 Cloudflare 测试环境；直接运行：

```bash
pnpm --filter ios ios:staging
```

如需连接电脑上的 Next.js，可临时覆盖公开环境变量（不要提交本机 IP）：

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3000 pnpm --filter ios ios
```

要明确连接生产环境则运行 `pnpm --filter ios ios:production`。`EXPO_PUBLIC_*` 只能保存公开配置，任何令牌或密钥都不得放入其中。

## 质量检查

```bash
pnpm db:check
pnpm type-check
pnpm lint
pnpm --filter web build
```

## Cloudflare 部署

仓库包含独立测试配置 `web/wrangler.staging.toml`。其中只保存可公开的 Worker、D1、R2、KV 名称和 ID，确保不同电脑拉取代码后使用相同 bindings；真实密钥使用 Cloudflare Secrets。测试环境部署命令：

测试站地址：<https://map-staging.privacy2privacy.workers.dev>

```bash
pnpm --filter web db:migrate:staging
pnpm --filter web deploy:staging
```

测试环境资源均以 `-staging` 结尾，不包含生产用户或作品数据。测试账号由管理员直接写入测试 D1，密码不进入 GitHub。

生产环境迁移和部署是显式操作，不会在本地开发时自动执行。新版本依赖最新 D1 表结构，因此上线顺序是：

```bash
pnpm --filter web db:migrate:prod
pnpm --filter web deploy
```

先在 Cloudflare 控制台或备份流程中保留 D1 恢复点，再应用生产迁移。`AUTH_SECRET` 和 `RESEND_API_KEY` 应使用 `wrangler secret put` 管理，不要写入仓库。实时光标功能默认关闭，因为 KV 不适合高频 presence 写入；将来需要实时协作时应迁移到 Durable Objects。

只读地图接口已经使用 D1 Sessions API。发布后可在 D1 数据库的 Settings 中启用 Read Replication；未启用时 Sessions API 仍可正常工作，只是查询继续由主实例处理。
