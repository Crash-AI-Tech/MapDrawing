# iOS 兼容与开发方案计划 (Expo 版)

## 1. 架构概览

我们将采用 **Monorepo (单体仓库)** 架构，将现有的 Web 端代码和新的 iOS 端 (Expo) 代码放在同一个仓库中，以便最大程度地复用代码（尤其是 WebSocket 逻辑、Zustand 状态管理和 TypeScript 类型定义）。

### 目录结构设计
我们将现有的根目录重构为 Turborepo 或 Pnpm Workspace 结构：

```text
/
├── apps/
│   ├── web/                 # 移动原有的 Next.js 项目到这里
│   └── mobile/              # 新建 Expo 项目 (iOS/Android)
├── packages/
│   ├── shared/              # [新增] 共享代码库
│   │   ├── src/
│   │   │   ├── types/       # 共享 TS 类型 (User, Stroke, Room...)
│   │   │   ├── constants.ts # 共享常量 (API URL, WebSocket Config)
│   │   │   ├── utils/       # 纯 JS 工具函数
│   │   │   └── logic/       # 核心业务逻辑 (如数据转换算法)
│   │   └── package.json
│   ├── api-client/          # [可选] 统一的 API 请求层
│   └── ui/                  # [可选] 如果计划复用 UI 组件 (比较难，因为 Web 是 HTML, App 是 View)
├── package.json             # Root package.json (Workspaces 配置)
└── turbo.json               # Turborepo 配置 (负责构建管线)
```

## 2. 核心技术栈 (Expo)

*   **框架**: `Expo SDK 52+` (React Native 0.76+, New Architecture enabled)
*   **开发语言**: TypeScript
*   **路由**: `expo-router` (文件系统路由，体验接近 Next.js App Router)
*   **地图**: `@maplibre/maplibre-react-native` (完美兼容 MapLibre GL JS 的原生版)
*   **绘图引擎**: `@shopify/react-native-skia` (高性能 2D 图形库，用于实现画笔效果，性能远超 SVG)
*   **状态管理**: Zustand (直接复用 Web 端代码)
*   **网络/WebSocket**: 原生 `fetch` + `WebSocket` API (代码与 Web 端 99% 一致)
*   **本地存储**: `expo-secure-store` (存储 Session Token)

## 3. 用户注册与登录模块 (重点)

目前的 Web 端使用的是 Lucia Auth + Cookies (`httpOnly`)。原生 App 无法像浏览器那样自动处理 Cookie，且 Apple 审核强制要求第三方登录的应用必须同时支持 **Sign in with Apple**。

### 改造方案

**后端 (Cloudflare Workers/Next.js API)**:
我们需要新增一套专门给 App 使用的 API 接口，通过 JSON Body 返回 Session Token，而不是 Set-Cookie。

1.  **数据库变更**: 修改 `drizzle/schema.ts` 的 `users` 表，增加 OAuth 字段。
    ```typescript
    appleId: text('apple_id').unique(), // 对应 Apple User ID
    // 如果未来支持 Google/微信，也在这里加
    ```
2.  **新增 API 路由**:
    *   `POST /api/auth/mobile/login`: 接收邮箱/密码，验证通过后返回 `{ token: "session_id", user: {...} }`。
    *   `POST /api/auth/mobile/register`: 注册新用户，返回 Token。
    *   `POST /api/auth/mobile/apple`: 接收 Apple 返回的 `identityToken`，后端验证后：
        *   如果 `apple_id` 已存在 -> 登录 (返回 Token)。
        *   如果不存在 -> 自动注册新用户 (创建 User & Session) -> 返回 Token。

**前端 (Expo App)**:
1.  **登录/注册**: 表单提交到上述 API。
2.  **苹果登录**: 使用 `expo-apple-authentication`。
    ```typescript
    import * as AppleAuthentication from 'expo-apple-authentication';
    // 调起系统原生 Apple 登录面板
    const credential = await AppleAuthentication.signInAsync({ ... });
    // 将 credential.identityToken 发送给我们的后端验证
    ```
3.  **Token 管理**: 拿到 Token 后，存储在 `SecureStore` 中。
4.  **WebSocket 连接**: 在 `DurableObjectClient.ts` 中，连接 URL 携带 Token: `ws://.../ws/room?token=YOUR_TOKEN` (目前后端已支持 query param `token`，所以这部分逻辑完美复用！)。

## 4. 开发流程与新建项目详细步骤

### 第一步：环境准备 & 仓库重构 (最耗时)
1.  将当前所有代码移动到 `apps/web` 目录。
2.  在根目录配置 `pnpm-workspace.yaml`。
3.  提取共享类型到 `packages/shared`。

### 第二步：初始化 Expo 项目
1.  在 `apps/` 目录下运行：
    ```bash
    npx create-expo-app@latest mobile -t default
    ```
2.  进入 `apps/mobile`，安装依赖：
    ```bash
    npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
    npx expo install @shopify/react-native-skia @maplibre/maplibre-react-native expo-location expo-secure-store expo-apple-authentication
    ```
3.  配置 `metro.config.js` 以支持 Monorepo (允许引用 `packages/shared`)。

### 第三步：移植核心逻辑
1.  复制 `src/services` 或 `src/core/sync` 到 `packages/shared` 或直接在 App 中引用。
2.  在 App 中重写 `DurableObjectClient` 的连接部分 (主要是获取 Token 的方式不同，从 SecureStore 取)。

### 第四步：UI 开发
1.  **登录页**: 使用 RN View/Text/TextInput 重写登录表单。
2.  **地图页**: 使用 `<MapView />` 组件。
3.  **绘图层**: 使用 `<SkiaCanvas />` 覆盖在地图上，根据 WebSocket 收到的点数据进行绘制。

---

## 5. 需要确认的问题 & 风险点

1.  **Apple Developer 账号**: 上架 AppStore 需要 $99/年的开发者账号。你需要注册一个。
2.  **Mac 开发环境**: Expo 开发 iOS 应用可以在模拟器运行，但最终打包和上传需要 Mac 环境 (你目前是 Mac，没问题)。
3.  **地图兼容性**: MapLibre Native 的样式文件通常与 Web 版通用，但图标/字体可能需要打包进 App 资源中，或者确保 Web URL 允许 App 访问。
4.  **工作量预期**: 虽然逻辑可复用，但 **UI (视图层) 是无法复用的**。你需要用 React Native 的 Flexbox 布局系统重写所有界面（因为 Web 是 HTML/CSS）。这包括登录页、设置面板、画笔选择器等。

**是否接受这个工作量？** 如果接受，我们可以开始规划目录结构重构。
