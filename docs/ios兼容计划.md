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

---

## 6. iOS 端现状问题分析与下一步兼容计划 (v2.1)

> **日期**: 2026-02-12
> **问题概述**: iOS 端地图看不到街道/地名;绘制线条效果与 Web 端不一致;缺失大量核心逻辑

### 6.1 问题一：地图瓦片 — 无街道和地名显示

**根本原因**: iOS 端使用了 MapLibre 官方 Demo Tiles，而非 Web 端的 OpenFreeMap Liberty 矢量瓦片。

| 端 | StyleURL | 效果 |
|---|---|---|
| **Web** | `https://tiles.openfreemap.org/styles/liberty` | ✅ 完整的 OSM 矢量瓦片，包含街道、地名、建筑、POI 等全部标注 |
| **iOS** | `https://demotiles.maplibre.org/style.json` | ❌ 仅包含国界线、水域等极简化内容，**无任何街道和地名** |

**修复方案**: 将 iOS 端的 `styleURL` 改为 Web 端同款：

```tsx
// ios/app/(app)/index.tsx — 修改前
styleURL="https://demotiles.maplibre.org/style.json"

// 修改后 — 使用 OpenFreeMap Liberty（与 Web 完全一致）
styleURL="https://tiles.openfreemap.org/styles/liberty"
```

> **注意**: OpenFreeMap Liberty 瓦片完全免费、无需 API Key、支持 MapLibre GL Native。如遇中国大陆网络问题可考虑在 Cloudflare Workers 搭代理。

**同时修正 zoom 默认值**:
- iOS 当前: `zoomLevel: 10` — 太小，看不到细节
- Web: `MAP_DEFAULT_ZOOM = 14` — 适合看到街区级别
- 应统一为 `14` 并从 `@niubi/shared` 引入

---

### 6.2 问题二：绘制逻辑差异 — 线条效果不一致

经过逐行对比 Web 端 `core/brushes/` 与 iOS 端 `getBrushSettings()`，发现**iOS 端的笔刷系统是极度简化的占位实现**，与 Web 端存在以下核心差异：

#### 6.2.1 铅笔 (Pencil)

| 特性 | Web 端 (`PencilBrush.ts`) | iOS 端 (当前) | 差异 |
|---|---|---|---|
| 曲线算法 | **二次贝塞尔曲线** (`quadraticCurveTo`) 通过中点平滑 | `Skia.Path.lineTo()` 直线段拼接 | ❌ iOS 线条锯齿严重，拐角生硬 |
| 压力感应 | ✅ `getWidth(size, pressure)` = `size * (0.5 + pressure * 0.5)` 动态线宽 | ❌ 固定线宽，无压感 | ❌ 缺失压感变宽效果 |
| 渲染方式 | Canvas2D `stroke()` 逐段绘制 | Skia `<Path>` 整体渲染 | 可接受但需加平滑 |

#### 6.2.2 马克笔 (Marker)

| 特性 | Web 端 (`MarkerBrush.ts`) | iOS 端 (当前) | 差异 |
|---|---|---|---|
| 不叠色技术 | **OffscreenCanvas 双缓冲** — 先在离屏画布以 opacity=1 绘制，再以 `globalAlpha=0.3` 合成到主画布 | 直接设 `opacity: 0.8`，线段交叉处**颜色重叠** | ❌ 核心效果缺失 |
| 线宽 | `size * 3` | `size * 3` | ✅ 一致 |
| Opacity | 0.3 (合成) | 0.8 (直接) | ❌ 不一致 |

#### 6.2.3 荧光笔 (Highlighter)

| 特性 | Web 端 (`HighlighterBrush.ts`) | iOS 端 (当前) | 差异 |
|---|---|---|---|
| 混合模式 | `globalCompositeOperation = 'multiply'` | `BlendMode.SrcOver`（普通叠加） | ❌ 无 multiply 效果 |
| 线头 | `square`（方头） | `StrokeCap.Round`（圆头） | ❌ 外观不一致 |
| 线宽 | `size * 2.5` | `size * 8` | ❌ iOS 偏粗 3.2 倍 |
| Opacity | 0.4 (固定) | 0.4 | ✅ 一致 |

#### 6.2.4 喷枪 (Spray)

| 特性 | Web 端 (`SprayBrush.ts`) | iOS 端 (当前) | 差异 |
|---|---|---|---|
| 渲染方式 | **随机粒子散点** — 高斯衰减密度，30 粒子/帧 | 简单粗线条 (`lineTo`) | ❌ 完全不同的视觉效果 |
| 确定性回放 | ✅ 基于 stroke.id 哈希的确定性随机种子 | ❌ 无 | ❌ 无法复现相同效果 |

#### 6.2.5 通用缺失

| 缺失项 | 说明 | 影响 |
|---|---|---|
| **地理坐标转换** | iOS 仅使用屏幕像素坐标 `(g.x, g.y)` 绘图，**未投影到经纬度** | ❌ 地图移动/缩放后，线条不会跟随地图，无法持久化 |
| **缩放跟随 (Zoom Scaling)** | Web 端历史笔画以 `size * 2^(currentZoom - createdZoom)` 缩放 | ❌ iOS 线条大小固定，不随缩放变化 |
| **笔画显隐规则** | Web 端 `currentZoom >= createdZoom - 3` 否则隐藏 | ❌ iOS 全部显示 |
| **MIN_DRAW_ZOOM 门控** | Web 端 zoom < 18 禁止绘画 | ❌ iOS 任意 zoom 可画 |
| **Redo** | Web 端双栈 Undo/Redo (max 100) | ❌ iOS 仅有 Undo (数组裁剪) |
| **墨水系统** | 面积 × 缩放的 ink cost 公式 | ❌ 未接入 |
| **笔画大小 Slider** | Web 端工具栏有大小/透明度调节 | ❌ iOS 工具栏无此 UI |

---

### 6.3 下一步兼容计划 (iOS Sprint Plan)

> 目标: 使 iOS 端的地图显示、绘制效果、坐标系统与 Web 端完全对齐

#### 第零阶段：即时修复 (Day 0 — 30 分钟)

- [ ] **P0-1**: 修改 `styleURL` → `https://tiles.openfreemap.org/styles/liberty`
- [ ] **P0-2**: 修改默认 `zoomLevel` → `MAP_DEFAULT_ZOOM (14)` ，从 `@niubi/shared` 导入
- [ ] **P0-3**: 修改地图交互：draw 模式下仍可双指缩放/平移地图 (后续手势冲突处理)

#### 第一阶段：坐标系统对齐 (Day 1 — 核心)

这是**最关键**的一步。不解决坐标问题，所有绘制数据都无法持久化和跨端同步。

- [ ] **P1-1**: 创建 `MapLibreNativeAdapter` (实现 `CoordinateConverter` 接口)
  - `screenToGeo(screenX, screenY)` → 调用 MapLibre React Native 的 `getCoordinateFromView([x, y])` 
  - `geoToScreen(lng, lat)` → 调用 `getPointInView([lng, lat])`
  - `getViewportBounds()` → 调用 `getVisibleBounds()`
  - `getViewState()` → 获取 center, zoom, bearing, pitch
  
  ```typescript
  // ios/platform/MapLibreNativeAdapter.ts (新建)
  import MapLibreGL from '@maplibre/maplibre-react-native';
  import type { CoordinateConverter, ViewState, GeoBounds } from '@niubi/shared/types';
  
  export class MapLibreNativeAdapter implements CoordinateConverter {
    private mapRef: MapLibreGL.MapView;
    
    async screenToGeo(screenX: number, screenY: number) {
      const coord = await this.mapRef.getCoordinateFromView([screenX, screenY]);
      return { lng: coord[0], lat: coord[1] };
    }
    
    async geoToScreen(lng: number, lat: number) {
      const point = await this.mapRef.getPointInView([lng, lat]);
      return { x: point[0], y: point[1] };
    }
    // ...
  }
  ```

  > **关键差异**: MapLibre React Native 的坐标转换 API 是 **异步** 的 (需要跨 Native Bridge)，而 Web 端是同步的。需要设计异步适配方案。

- [ ] **P1-2**: 修改手势 `onEnd` — 将屏幕坐标转换为经纬度后存入 `StrokeData.points`
- [ ] **P1-3**: 实现渲染时的 geo→screen 反向投影 — 地图移动/缩放时重新渲染所有可见笔画
- [ ] **P1-4**: 引入 `StrokeData` 类型 (from `@niubi/shared`) 统一笔画数据模型

#### 第二阶段：笔刷效果对齐 (Day 2-3)

使用 Skia API 复刻 Web 端 Canvas2D 的笔刷效果：

- [ ] **P2-1**: **铅笔 — 贝塞尔平滑**
  - 将 `path.lineTo()` 替换为 `path.quadTo()` (Skia 的二次贝塞尔)
  - 算法: 取最后 3 个点，计算中点，`quadTo(controlX, controlY, endX, endY)`
  - 优先级: 🔴 高 (直接影响线条质感)
  
  ```typescript
  // Skia 贝塞尔平滑示例
  if (points.length >= 3) {
    const prev = points[points.length - 3];
    const ctrl = points[points.length - 2]; 
    const curr = points[points.length - 1];
    const midX1 = (prev.x + ctrl.x) / 2;
    const midY1 = (prev.y + ctrl.y) / 2;
    const midX2 = (ctrl.x + curr.x) / 2;
    const midY2 = (ctrl.y + curr.y) / 2;
    path.moveTo(midX1, midY1);
    path.quadTo(ctrl.x, ctrl.y, midX2, midY2);
  }
  ```

- [ ] **P2-2**: **铅笔 — 压力感应变宽**
  - 方案 A: 将一条连续 Path 拆分为逐段独立 Path，每段用不同 `strokeWidth`
  - 方案 B: 使用 Skia 的 `PathEffect` 或将 stroke 转为 fill (变宽的贝塞尔带)
  - 推荐方案 A，实现简单且视觉差异可接受

- [ ] **P2-3**: **马克笔 — 不叠色**
  - 使用 Skia 的 `<Group layer={...}>` 配合 `SaveLayerRec` 实现:
    1. 在一个独立图层 (layer) 中以 `opacity=1.0` 绘制完整笔画
    2. 整个图层以 `opacity=0.3` 合成到画布
  - 或者使用 `Paint` 的 `setAlphaf()` + `Skia.SaveLayerFlag`
  
  ```tsx
  // Skia 马克笔不叠色方案
  <Group layer={
    <Paint opacity={0.3} />
  }>
    <Path path={markerPath} color={color} style="stroke" 
          strokeWidth={size * 3} opacity={1.0} />
  </Group>
  ```

- [ ] **P2-4**: **荧光笔 — Multiply 混合模式**
  - Skia 支持 `BlendMode.Multiply`，直接替换 `BlendMode.SrcOver`
  - 线头改为 `StrokeCap.Butt` (对应 Web 的 `square`)
  - 线宽修正: `size * 2.5` (当前是 `size * 8`，过粗)

- [ ] **P2-5**: **喷枪 — 粒子散点**
  - 使用 Skia `<Points>` 或 `<Circle>` 逐粒子渲染
  - 实现高斯密度衰减: 距中心越远 → alpha 越低
  - 确定性回放: 从 stroke.id 计算 hash → 作为 PRNG 种子
  
  ```typescript
  // Skia 喷枪粒子渲染
  const DENSITY = 30;
  for (const point of stroke.points) {
    const count = Math.floor(DENSITY * point.pressure);
    for (let i = 0; i < count; i++) {
      const angle = seededRandom() * Math.PI * 2;
      const r = seededRandom() * radius;
      const alpha = (1 - r / radius) * 0.6;
      // 使用 Skia canvas.drawCircle() 或批量 Points
    }
  }
  ```

#### 第三阶段：渲染管线对齐 (Day 3-4)

- [ ] **P3-1**: 实现 **双层 Canvas 架构**
  - 层 1 (compositeLayer): 渲染所有已完成的历史笔画 (geo→screen 变换后)
  - 层 2 (activeLayer): 渲染当前正在绘制的实时笔画
  - 使用 Skia `<Canvas>` 嵌套或 `<Picture>` 缓存机制

- [ ] **P3-2**: 实现 **zoom-scale 笔画大小**
  - 历史笔画渲染时: `screenSize = storedSize * 2^(currentZoom - createdZoom)`
  - 确保放大看到粗线，缩小看到细线

- [ ] **P3-3**: 实现 **笔画显隐规则**
  - `currentZoom >= stroke.createdZoom - STROKE_HIDE_ZOOM_DIFF (3)` → 显示
  - 否则 → 不渲染

- [ ] **P3-4**: 实现 **MIN_DRAW_ZOOM 门控**
  - 当 `zoom < 18` 时禁止绘画
  - 显示提示: "请放大到 18 级以上才能绘画"

- [ ] **P3-5**: 监听地图 **move/zoom 事件** → 触发重新渲染
  - 地图视口变化时，所有历史笔画需要重新 geo→screen 转换并重绘
  - 使用 `onRegionDidChange` 回调

#### 第四阶段：手势系统优化 (Day 4-5)

- [ ] **P4-1**: **绘画与地图手势共存**
  - 当前实现: draw 模式下完全禁止地图交互 → 体验差
  - 目标: 单指画画、双指缩放平移 (与 Web 端一致)
  - 方案: 使用 `Gesture.Simultaneous()` / `Gesture.Race()` + `GestureRecognizer` 逻辑
    - 1 finger → draw
    - 2 fingers → 取消当前笔画 → 传递给地图做 pinch-zoom/pan
    - 3 fingers → undo

- [ ] **P4-2**: **PressureAdapter** 移植
  - Apple Pencil: 直接读取 `nativeEvent.force`
  - 手指触摸: 有 force 用 force，否则基于速度模拟
  - 计算方式: `pressure = clamp(1 - velocity / 3, 0.1, 1)` (Web 端同款)

#### 第五阶段：引擎移植 (Day 5-7)

将 Web 端 `core/engine/` 的纯 TS 逻辑移植到共享包或直接复用：

- [ ] **P5-1**: 移植 `InkManager` → iOS 接入面积墨水消耗公式
  - 使用 `@react-native-async-storage/async-storage` 替代 `localStorage` 做持久化
- [ ] **P5-2**: 移植 `HistoryManager` → 双栈 Undo/Redo (max 100)
- [ ] **P5-3**: 移植 `StrokeManager` + R-tree 空间索引 (`rbush` 包 React Native 可用)
- [ ] **P5-4**: 移植 `ViewportManager` → 对接 `MapLibreNativeAdapter`
- [ ] **P5-5**: 整合 `DrawingEngine` → 用 Skia 的渲染方法替代 Canvas2D 调用

> **迁移策略**: 由于 `core/engine/` 和 `core/types/` 为纯 TypeScript、零 Web DOM 依赖，可考虑将其提取到 `packages/shared/` 中，iOS 和 Web 直接复用相同引擎逻辑，仅在渲染层 (`brushes/` + `renderer/`) 做平台适配。

#### 第六阶段：工具栏增强 + 同步 (Day 7-9)

- [ ] **P6-1**: 工具栏增加 **笔画大小 Slider** (使用 `@react-native-community/slider` 或 `react-native-reanimated` 自定义)
- [ ] **P6-2**: 工具栏增加 **透明度 Slider**
- [ ] **P6-3**: 增加 **Redo 按钮**
- [ ] **P6-4**: 增加 **墨水条 (InkBar)** — 渐变色 + 数值显示
- [ ] **P6-5**: WebSocket 同步 — 移植 `DurableObjectClient`，使用 Token 认证 (替代 Cookie)
- [ ] **P6-6**: REST API 加载 — 视口变化时 `GET /api/drawings` 批量加载笔画
- [ ] **P6-7**: Pin 图钉系统 — 实现放置、渲染、消息展示

---

### 6.4 关键技术难点与对策

| 难点 | 描述 | 对策 |
|---|---|---|
| **Native Bridge 异步坐标转换** | MapLibre RN 的 `getCoordinateFromView()` 是异步的，而 Web 是同步 | 方案 1: 在 `onUpdate` 中缓存最近的 viewState + 自行计算经纬度 (用 Web Mercator 公式，不过 bridge)；方案 2: 使用 `MapLibre.Camera.onUserTrackingModeChange` / `getCenter` 缓存投影参数后本地计算 |
| **Skia 无 OffscreenCanvas** | 马克笔双缓冲需要额外画布 | 使用 Skia `<Group layer>` + `Paint` 的 layer 机制实现等效效果 |
| **运行在 JS 线程 vs Worklet** | 当前 `runOnJS(true)`，高频触控可能卡顿 | 未来迁移到 Worklet 线程: `gesture.onUpdate(worklet)` + `useSharedValue` 进行 Skia path 操作，确保 60fps |
| **R-tree 在 RN 中的兼容性** | `rbush` 本身纯 JS，可直接用；但大量笔画时内存需注意 | 直接复用 `rbush`，配合视口裁剪限制内存笔画数 ≤ 5000 |
| **Skia multiply 混合模式** | `BlendMode.Multiply` 在 Skia 中是逐像素混合，需要底层有内容 | 如本身在透明层上 multiply 效果不明显，可改为 `ColorBurn` 或降低 alpha + `SrcOver` 近似 |

---

### 6.5 优先级总结

```
 紧急度
  │
  │  ┌─────────────────┐
  │  │ P0: styleURL +   │  ← 立即修复（30 min）
  │  │     zoomLevel    │
  │  └────────┬────────┘
  │           ▼
  │  ┌─────────────────┐
  │  │ P1: 坐标系统    │  ← 核心基础，阻塞后续所有功能
  │  │  (Native Adapter)│
  │  └────────┬────────┘
  │           ▼
  │  ┌─────────────────┐
  │  │ P2: 笔刷效果    │  ← 视觉一致性
  │  │  (贝塞尔/不叠色) │
  │  └────────┬────────┘
  │           ▼
  │  ┌─────────────────┐
  │  │ P3: 渲染管线    │  ← 缩放/显隐规则
  │  └────────┬────────┘
  │           ▼
  │  ┌─────────────────┐
  │  │ P4: 手势系统    │  ← 交互体验
  │  └────────┬────────┘
  │           ▼
  │  ┌─────────────────┐
  │  │ P5: 引擎移植    │  ← 数据持久化和公平机制
  │  └────────┬────────┘
  │           ▼
  │  ┌─────────────────┐
  │  │ P6: UI + 同步    │  ← 功能完整性
  │  └─────────────────┘
  └──────────────────────▶ 时间
```

> **预计总工期**: 7~9 天 (一人全职)。P0+P1 完成后即可实现"线条跟随地图"的基本效果;P2 完成后视觉一致性提升 80%;P3-P6 为渐进增强。




iOS 上架与兼容性计划
本文档针对你提出的三个核心疑问进行解答，并结合当前代码库的分析，提供具体的解决方案和待办清单。

1. 预发布版本与线上数据库链接
你提到的“预发布版本”在 iOS 开发中通过 TestFlight 也就是苹果官方的测试平台来实现。

A. TestFlight (预发布版本)
TestFlight 允许你将 App 上传到 App Store Connect，但暂不上架。

内部测试：无需苹果审核，添加开发团队成员的 Apple ID 即可立即安装。
外部测试：需要经过苹果简单的 Beta 审核，通过后可以生成公开链接（Public Link），发送给任何人下载安装，有效期 90 天。
体验：用户下载的 App 和 App Store 版本几乎一致，只是图标旁边有一个黄色的小点，且 App 会定期过期（需更新构建版本）。
B. 本地/测试版链接线上数据库
App 实际上不应直接链接数据库（如 PostgreSQL），而是链接 后端 API。要让 iOS App 在本地或 TestFlight 中使用线上数据，你需要配置 环境变量 来切换 API 地址。

解决方案：

使用 .env 文件管理环境： 在 ios/ 根目录下建立 .env (开发) 和 .env.production (生产)。
bash
# ios/.env (本地开发)
EXPO_PUBLIC_API_URL=http://<你的电脑内网IP>:3000/api
# ios/.env.production (打包发布/TestFlight)
EXPO_PUBLIC_API_URL=https://your-production-domain.com/api
代码中引用： 在代码中使用 process.env.EXPO_PUBLIC_API_URL 获取地址。Expo 会在打包时自动根据构建类型（Development vs Production）替换变量。
2. App Store 上架合规性检查清单
根据对当前代码（iOS 部分）的分析，发现以下 必须修改 的问题，否则会被拒审。

🚨 严重问题 (会导致直接拒审)
[ ] 1. 用户生成内容 (UGC) 合规机制 (缺失)
你的 App 包含 聊天 和 地图协作 (Drawing/Pin) 功能，属于 UGC (User Generated Content) 应用。苹果对此有严格审核要求。 当前代码缺失：

举报功能：在聊天消息或地图 Pin 点上必须有“举报 (Report)”按钮。
拉黑功能：必须允许用户拉黑 (Block) 其他用户。
EULA (用户协议)：必须在 App 内（通常在注册页或关于页）展示最终用户许可协议，明确声明“对 objectionable content (令人反感的内容) 零容忍”以及“滥用用户将被封禁”。
解决方案：

在 
DrawingToolbar
 或点击 Pin 点的详情页增加 Report 按钮。
在用户个人主页增加 Block 按钮。
提示：如果未实现这些，100% 会被拒审 (Guideline 1.2)。
[ ] 2. 权限描述不完整 (
app.json
)
当前 
ios/app.json
 中仅配置了 NSLocationWhenInUseUsageDescription。 风险点：

相册/保存图片：如果 
DrawingToolbar
 允许保存图片到相册，必须添加 NSPhotoLibraryUsageDescription 和 NSPhotoLibraryAddUsageDescription。
相机/麦克风：如果聊天功能支持发图或语音，必须添加 NSCameraUsageDescription 和 NSMicrophoneUsageDescription。
定位描述：当前的描述 "Allow $(PRODUCT_NAME) to access..." 使用了占位符，建议改为更具体的文案，例如："Allow NiubiAgent to access your location to show your position on the shared map."
[ ] 3. 账户删除功能 (Apple 强制要求)
如果 App 允许用户注册/登录，必须 在 App 内部提供“删除账户” (Delete Account) 的功能/按钮。

不能仅是“停用”，必须是彻底删除数据。
必须容易找到（通常放在 Settings -> Account 中）。
[ ] 4. 第三方登录
如果你使用了 Google/Facebook 登录，则 必须 同时集成 Sign in with Apple。
如果只用手机号/邮箱登录，则不需要 Sign in with Apple。
代码中依赖了 expo-apple-authentication，看来你已有准备，请确保已正确集成。
3. 区域上架策略 (中国区 vs 美国/全球)
结论先行：建议 优先上架非中国区 (Rest of World)，中国区单独处理或暂时放弃。

A. 中国区上架的特殊困难
对于“地图+聊天”类应用，中国区 App Store 审核极难：

ICP 备案：你的后端域名必须经过工信部 ICP 备案（公司主体必须在国内）。
互联网信息服务安全评估：因为涉及“即时通讯/舆论属性”，可能需要通过网信办的安全评估。
地图测绘资质 (最难)：
在中国通过 App 展示地图，必须使用合规的地图服务商（如高德、百度）。
你使用的是 OpenStreetMap / MapLibre (这类通用 OSM 数据源)，在中国区属于 非法地图数据，极大概率无法通过审核，甚至可能违规。
UGC 地图标注：用户在地图上画画/标记属于“互联网地图服务”，需要特许资质。
B. 公司主体与海外上架
"我的开发者账号是以公司名义申请的，是一家注册在深圳的公司。"

这是一个优势，也是可行的路径。

中国公司可以发布海外区 App：苹果允许中国开发者账号将 App 仅发布在 US (美国) 或其他海外地区，勾选掉 "China Mainland" 即可。
合规性：发布在海外区（如美国），只需遵守美国的法律（DMCA、GDPR等）和苹果审核指南，不需要中国的 ICP 备案或地图测绘资质。
地图数据：在海外使用 MapLibre/OSM 是完全合规的。
✅ 推荐方案
首发上线：在 App Store Connect 的 "Availability" (销售范围) 中，取消勾选 "China Mainland"，勾选美国、香港、台湾、日本、欧洲等地区。
规避风险：这样可以只需满足苹果通用审核规则（上述第2点清单），无需处理复杂的中国区牌照问题。
后续：如果必须上架中国区，建议开发“中国特供版”，移除 UGC 地图标记功能，并接入高德/百度地图 SDK，同时完成域名 ICP 备案。