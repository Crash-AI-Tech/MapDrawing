# iOS 兼容与开发方案计划 (Expo 版) - v2.0

## 1. 架构概览 (Monorepo)

已完成架构重构，采用 Monorepo 结构：
- **`web/`**: Next.js 前端 (已验证)
- **`ios/`**: Expo Go / Development Build 项目 (待开发)
- **`cf-workers/`**: 后端 API + WebSocket 服务 (复用)
- **`drizzle/`**: 数据库 Schema (共享)

## 2. 核心技术选型：绘图引擎 (PencilKit vs Skia)

用户询问是否能使用 `PencilKit`。经过分析：
- **PencilKit**: Apple 原生框架，体验极佳，但 **数据格式私有 (PKDrawing)**，很难解析出我们需要的“像素点”或“矢量路径”数据来发送给 WebSocket。且无法在 Android 上运行（如果未来考虑）。
- **React Native Skia (`@shopify/react-native-skia`)**: 
    - **高性能**: 直接在 GPU 上绘制，性能接近原生。
    - **可控性强**: 我们可以完全掌控每一个笔画的坐标点 (Points)，这对于我们“基于地理位置的绘图” (Geo-Coordinate) 至关重要。
    - **跨平台**: iOS/Android 表现一致。
    - **现有兼容**: Web 端使用 Canvas 2D，Skia 的 API 与 Canvas 2D 非常相似，逻辑复用率高。

**结论**: 推荐继续使用 **React Native Skia**，通过手势响应器 (Gesture Handler) 获取点坐标，实时渲染。

## 3. 数据库与 API 改造

目前 `users` 表仅支持 Email/Password。为支持 iOS App Store 审核要求的 **Sign in with Apple**，需要改造：

### 3.1 数据库变更 (`drizzle/schema.ts`)
需增加 OAuth 字段：
```typescript
export const users = sqliteTable('users', {
  // ... existing fields
  appleId: text('apple_id').unique(), // 对应 Apple User Identity
  avatarUrl: text('avatar_url'),      // 存储头像
});
```

### 3.2 API 接口 (Web 端新增)
iOS 端无法直接操作 Cookie，需开发基于 Token 的 API：
- `POST /api/auth/mobile/login`: 邮箱登录，返回 `{ token, user }`
- `POST /api/auth/mobile/apple`: 接收 Apple Identity Token，验证并登录/注册，返回 `{ token, user }`
- `GET /api/auth/mobile/me`: 校验 Token 获取用户信息

## 4. iOS App 交互设计 (Canvas-First)

由于 App 没有主页 (Landing Page)，打开即画布，需设计引导流程：

### 4.1 启动流程 (App Launch)
1.  **Splash Screen**: Logo 展示（Expo 默认）。
2.  **权限请求**: 
    - **位置权限**: "我们需要您的位置来在地图上显示您的画作。" (必须，否则无法定位)
    - **通知权限**: (可选) "当有人在您附近绘画时通知您。"
3.  **Onboarding (首次打开)**:
    - 半透明遮罩覆盖地图，简单的 3 步动画引导：
        - "这里是画布" (指向地图)
        - "这是画笔" (指向工具栏)
        - "开始创作！"
4.  **未登录状态**:
    - 允许**游客浏览** (View Only)。
    - 当用户点击“画笔”或“发布”时，弹出 **登录/注册 Sheet (半屏弹窗)**。
    - 支持 "Sign in with Apple" 一键登录。

### 4.2 核心界面布局
- **底图**: MapLibre GL Native (全屏)。
- **绘图层**: Skia Canvas (覆盖全屏，透明背景)。
- **顶部栏 (Floating)**:
    - 左侧: 个人头像 (点击滑出菜单)。
    - 中间: 当前位置/房间信息。
    - 右侧: 搜索/定位按钮。
- **底部栏 (Floating Tool Bar)**:
    - 类似 Web 端的悬浮胶囊设计。
    - 包含：画笔选择、颜色选择、撤销/重做。
    - 点击画笔弹出详细设置面板 (BottomSheet)。

## 5. 开发任务拆解

### 第一阶段：基础设施 & 认证 (Day 1-2)
- [ ] **Schema 更新**: 添加 `appleId` 字段，运行 migration。
- [ ] **API 开发**: 实现 `/api/auth/mobile/*` 接口。
- [ ] **Expo 基础**: 配置 TypeScript, Alias, import 共享代码。
- [ ] **Auth 并没有**: 集成 `expo-apple-authentication` 和 `expo-secure-store`。

### 第二阶段：地图与绘图 (Day 3-5)
- [ ] **地图集成**: 引入 `@maplibre/maplibre-react-native`，加载自定义 Style。
- [ ] **定位功能**: 集成 `expo-location`，实现定位跳转。
- [ ] **Skia 画板**: 实现全屏透明 Canvas，处理手势 (PanGesture)。
- [ ] **笔刷逻辑**: 复用 Web 端的笔刷算法 (Need to extract to `shared/`).

### 第三阶段：同步与交互 (Day 6-7)
- [ ] **WebSocket**: 移植 `DurableObjectClient`，适配 Token 认证。
- [ ] **UI 实现**: 使用 React Native Reanimated 重写悬浮工具栏。
- [ ] **性能优化**: 确保 60fps 绘图体验。

---

**决策点**: 是否同意采用 Skia 替代 PencilKit 以换取数据控制权和跨平台一致性？(默认推荐 Skia)
