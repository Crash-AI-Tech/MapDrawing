# iOS 开发与上架指南 (Expo 版) - v3.0

> **核心目标**: 打造与 Web 端体验一致、数据互通的 iOS 移动端应用。
> **技术栈**: React Native (Expo) + MapLibre GL + Skia + Next.js Backend

## 1. 架构与现状

### 1.1 核心技术选型
*   **绘图引擎**: **React Native Skia**。直接在 GPU 上绘制，高性能且能通过 `Gesture Handler` 完全掌控笔画坐标，确保与 Web 端数据格式 (Geo-Coordinate) 一致。
*   **地图引擎**: **MapLibre GL Native**。加载 OpenFreeMap 矢量瓦片，与 Web 端使用相同的 Style URL (`https://tiles.openfreemap.org/styles/liberty`)。
*   **同步机制**: **Tile-based Caching (瓦片化缓存)**。
    *   移除 WebSocket，改为按需拉取当前视野内的瓦片数据 (`GET /api/drawings?tiles=x,y,z`)。
    *   **离线队列**: 离线状态下将操作写入 `OfflineQueue`，恢复网络后自动重试。
*   **数据持久化**: 
    *   API: `POST /api/drawings` (新增/删除)。
    *   Auth: Lucia Auth v3 (`/api/auth/mobile/*`)，支持 Sign in with Apple。

### 1.2 当前进度
*   [x] **架构重构**: 移除了 `cf-workers`/WebSocket，统一使用 Next.js API。
*   [x] **地图集成**: 已切换至 OpenFreeMap 矢量瓦片，街道/地名显示正常。
*   [x] **基础绘图**: 实现了基础的笔画渲染。
*   [x] **数据同步**: 已实现 `TileManager` 和 `SyncManager`，支持按需加载和离线队列。

## 2. 待开发/优化任务 (Roadmap)

> 目标: 进一步对齐 Web 端的交互细节和视觉效果。

### 2.1 交互与手势
- [ ] **多指手势共存**: 优化 `Gesture Handler`，实现“单指绘画、双指缩放平移”，解决当前 Drawing 模式下地图无法移动的问题。
- [ ] **压感适配**: 适配 Apple Pencil 压感 (`nativeEvent.force`) 和手指模拟压感 (基于速度)。

### 2.2 渲染效果对齐
- [ ] **贝塞尔平滑**: 将 `path.lineTo` 升级为 `path.quadTo`，消除线条锯齿。
- [ ] **不叠色马克笔**: 使用 Skia Layer 实现 Web 端的“高亮笔不叠加变黑”效果。
- [ ] **缩放跟随**: 实现笔画宽度随地图缩放动态调整 (Scale by Zoom)。

### 2.3 功能补全
- [ ] **撤销/重做**: 实现通过 `HistoryManager` 管理的双栈 Undo/Redo。
- [ ] **工具栏 UI**: 增加笔刷大小、透明度调节滑块，以及颜色选择器。
- [ ] **位置权限引导**: 完善首次启动时的权限请求流程。

---

## 3. TestFlight 开发与测试指南

TestFlight 是苹果官方的内测平台，允许在不上架 App Store 的情况下分发 App 给测试人员。

### 3.1 准备工作
1.  **Apple Developer账号**: 确保已加入 Apple Developer Program (个人或公司)。
2.  **App ID**: 在 Apple Developer Console 创建 App ID (Bundle ID, 如 `com.yourcompany.niubiagent`).
3.  **App Store Connect**: 在 App Store Connect 中新建 App，绑定上述 Bundle ID。
4.  **本地环境**: 安装 `eas-cli`: `npm install -g eas-cli`，并登录 `eas login`。

### 3.2 配置 EAS (Expo Application Services)
在项目根目录运行:
```bash
eas build:configure
```
选择 `iOS`。这会生成 `eas.json`。确保配置如下:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "distribution": "store"
    }
  }
}
```

### 3.3 环境变量配置
iOS App 需要连接后端 API。
1.  在 `ios/` 目录下创建 `.env.production`:
    ```ini
    EXPO_PUBLIC_API_URL=https://your-production-domain.com/api
    ```
2.  确保代码中使用 `process.env.EXPO_PUBLIC_API_URL`。

### 3.4 构建与上传
执行以下命令构建生产包并自动上传到 TestFlight:

```bash
# 在项目根目录执行
eas build --platform ios --profile production --auto-submit
```

*   **构建过程**: EAS 会在云端完成 Xcode 构建。
*   **自动提交**: 构建完成后，会自动上传 IPA 到 App Store Connect。
*   **首次运行**: 可能需要你登录 Apple ID 并生成 App Store Connect API Key (EAS 会引导你完成)。

### 3.5 添加测试员
1.  进入 [App Store Connect](https://appstoreconnect.apple.com/) -> My Apps -> 选择应用 -> TestFlight。
2.  **内部测试 (Internal Testing)**: 点击 "+" 添加开发团队成员。他们会在设备上的 TestFlight App 中立即收到通知。
3.  **外部测试 (External Testing)**:
    *   创建测试组 (如 "Public Beta")。
    *   添加构建版本 (需经过苹果简单的 Beta 审核，通常 < 24h)。
    *   生成 **公开链接 (Public Link)**，发送给任何人即可安装。

---

## 4. App Store 上架详细步骤

### 4.1 核心合规性检查 (必读)
在提交审核前，**必须**解决以下问题，否则 **100% 被拒**:

1.  **UGC (用户生成内容) 合规**:
    *   **举报功能**: 点击地图上的画作或 Pin，必须有【举报】(Report) 按钮。
    *   **拉黑功能**: 必须能拉黑 (Block) 恶意用户。
    *   **EULA**: 在“关于”或“注册”页展示用户协议，声明“对违规内容零容忍”。
2.  **删除账号**: App 内必须提供【彻底删除账号】的功能入口。
3.  **权限描述**: `Info.plist` (在 `app.json` 中配置) 必须详细说明用途。
    *   `NSLocationWhenInUseUsageDescription`: "我们需要您的位置以便在地图上显示您的绘画和发现周围的作品。"

### 4.2 准备元数据
在 App Store Connect 的 "App Information" 和 "Prepare for Submission" 页面填写:
*   **截图**: 需要 iPhone 6.5" (1284x2778) 和 5.5" (1242x2208) 的截图。
*   **关键词 (Keywords)**: Map, Drawing, Social, Creative, Geo等 (100字符以内)。
*   **描述 (Description)**: 详细介绍功能和玩法。
*   **支持 URL**: 公司官网或落地页。

### 4.3 提交审核
1.  在 TestFlight 中验证无误的构建版本。
2.  在 "Prepare for Submission" 页面的 "Build" 部分，点击 "+"，选择该版本。
3.  **出口合规 (Export Compliance)**: 通常选择 "No" (除非涉及大量自研加密)。
4.  **IDFA (广告标识符)**: 如果没用广告 SDK，选 "No"。
5.  **提交审核 (Submit for Review)**。

### 4.4 审核后处理
*   **通过**: 状态变为 "Ready for Sale"，通常 1-2 小时内上架。
*   **被拒 (Rejected)**:
    *   查看 Resolution Center 的具体原因。
    *   **不要慌张**，按要求修改代码或在回复中解释。
    *   常见理由: 元数据不符、UGC 缺乏监管、Crash 等。修改后重新打包上传即可。

## 5. 中国区上架特别说明
由于中国区对地图 (测绘资质) 和 UGC (ICP备案/安全评估) 的严格限制，**强烈建议**:
*   **首发**: 在 App Store Connect 的 "Availability" 中 **取消勾选 "China Mainland"**。
*   **策略**: 优先上架美国、香港、台湾、日本等地区。这些地区只需遵守 Apple 通用规则，无需中国特有的牌照。


## 打包
### 编译打包
eas build --platform ios
或
eas build --platform ios --local

### 在Expo服务器上构建
eas submit -p ios
或
使用Transporter上传ipa

### 查看构建结果
浏览器登录 Apple Developer 控制台：App Store Connect。https://appstoreconnect.apple.com/


### 隐私政策生成
** 生成地址**
https://app-privacy-policy-generator.nisrulz.com/

**生成内容**
```
https://doc-hosting.flycricket.io/drawmaps-privacy-policy/ab08a782-7dc0-48b1-97c9-e4ce1ac47c55/privacy
https://doc-hosting.flycricket.io/drawmaps-terms-of-use/2197a713-a352-47c7-bf8f-a5a19eee3ddb/terms
```

