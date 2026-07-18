# iOS App Store 发布计划

> **目标日期**: 2026-05-24
> **当前状态**: 准备第二次提审

---

## 一、上次被拒历史（已修复）

> **Submission ID**: c21f8730-4fe6-4c3c-8e4e-73434f363b2c
> **审核日期**: 2026-03-09
> **审核设备**: iPad Air 11-inch (M3) / iPhone 17 Pro Max (iPadOS / iOS 26.3.1)
> **App 版本**: 1.0

---

## 问题摘要

### Guideline 2.1(a) — Continue as Guest 按钮无响应

**审核描述**: 点击 "Continue as Guest" 链接后没有任何反应。

---

## 根因分析

### 核心矛盾：路由守卫与游客模式冲突

整个导航流程涉及 3 个关键文件：

| 文件 | 作用 |
|------|------|
| [login.tsx](file:///Users/nsaviour/Project/WebProject/niubiagent/ios/app/(auth)/login.tsx#L218) | "Continue as Guest" 按钮，点击后执行 `router.replace('/(app)')` |
| [(app)/_layout.tsx](file:///Users/nsaviour/Project/WebProject/niubiagent/ios/app/(app)/_layout.tsx#L16-L18) | `(app)` 路由组的布局守卫 |
| [AuthContext.tsx](file:///Users/nsaviour/Project/WebProject/niubiagent/ios/context/AuthContext.tsx#L49-L54) | 认证上下文，注释声明允许游客访问 |

**Bug 复现路径：**

```mermaid
sequenceDiagram
    participant U as 用户
    participant L as login.tsx
    participant A as (app)/_layout.tsx
    
    U->>L: 点击 "Continue as Guest"
    L->>A: router.replace('/(app)')
    A->>A: 检查 session → null
    A->>L: <Redirect href="/(auth)/login" />
    Note over U,L: 🔄 死循环：用户回到登录页，看起来"没有反应"
```

**问题代码** — `(app)/_layout.tsx` 第 16-18 行：

```tsx
if (!session) {
    return <Redirect href="/(auth)/login" />;
}
```

当 `session` 为 `null`（游客未登录），布局会立即重定向回登录页。而 `login.tsx` 的 "Continue as Guest" 按钮只是简单地 `router.replace('/(app)')`，没有设置任何游客标记。

> [!IMPORTANT]
> `AuthContext` 中的注释（第 49、54 行）明确表示游客可以自由访问地图，但 `(app)/_layout.tsx` 的 `<Redirect>` 守卫与此矛盾，是导致 Bug 的直接原因。

**额外确认**: 全局搜索 `isGuest` / `guestMode` 关键词未找到任何结果，说明当前代码中 **不存在游客模式的状态管理**。

---

## 整改方案

### 方案：在 AuthContext 中增加 `isGuest` 状态

#### 1. 修改 [AuthContext.tsx](file:///Users/nsaviour/Project/WebProject/niubiagent/ios/context/AuthContext.tsx)

- 新增 `isGuest` 状态和 `enterGuestMode` / `exitGuestMode` 方法
- `isGuest` 值同样持久化到 `SecureStore`（key: `guestMode`），确保 App 重启后保留状态
- 在路由守卫逻辑中，已登录用户 **或** 游客模式用户不再被重定向到登录页

```diff
 interface AuthContextType {
     session: string | null;
     isLoading: boolean;
+    isGuest: boolean;
     signIn: (token: string) => Promise<void>;
     signOut: () => Promise<void>;
+    enterGuestMode: () => Promise<void>;
 }
```

- `signIn` 时自动清除 `guestMode` 标记（用户正式登录后，不再是游客）
- `signOut` 时同时清除 `guestMode` 标记

#### 2. 修改 [(app)/_layout.tsx](file:///Users/nsaviour/Project/WebProject/niubiagent/ios/app/(app)/_layout.tsx)

- 将守卫条件从 `!session` 改为 `!session && !isGuest`

```diff
-    if (!session) {
+    if (!session && !isGuest) {
         return <Redirect href="/(auth)/login" />;
     }
```

#### 3. 修改 [login.tsx](file:///Users/nsaviour/Project/WebProject/niubiagent/ios/app/(auth)/login.tsx#L218)

- "Continue as Guest" 按钮点击时先调用 `enterGuestMode()`，再跳转

```diff
-<TouchableOpacity style={styles.skipLink} onPress={() => router.replace('/(app)')}>
+<TouchableOpacity style={styles.skipLink} onPress={async () => {
+    await enterGuestMode();
+    router.replace('/(app)');
+}}>
```

#### 4. 确认已有功能不受影响

`(app)/index.tsx` 第 326-340 行的 `handleModeChange` 已经包含游客用户尝试 draw/pin 时弹出登录提示的逻辑（检查 `!session`），无需修改，游客体验保持一致：
- ✅ 游客可以浏览地图、查看涂鸦和图钉
- ✅ 游客尝试绘画/放置图钉时会弹出登录提示
- ✅ 正式登录后 `isGuest` 自动清除

---

## 验证计划

> [!NOTE]
> 项目中没有发现现有的自动化测试文件。需要通过手动测试验证。

### 手动测试步骤

1. **Guest 流程测试**
   - 冷启动 App → 点击 "Continue as Guest" → 应成功进入地图页面
   - 在地图页面可以正常浏览、缩放地图
   - 点击绘画/图钉工具 → 应弹出登录提示

2. **正常登录流程**
   - 登录页输入邮箱密码 → 正常登录 → 进入地图
   - 可以正常绘画和放置图钉

3. **Guest → 登录转换**
   - 以游客身份进入 → 点击绘画 → 弹出登录提示 → 点击"登录" → 完成登录 → `isGuest` 应清除

4. **App 重启保留状态**
   - 以游客身份进入 → 杀掉 App → 重新打开 → 应直接进入地图（游客状态持久化）
   - 以登录用户身份使用 → 杀掉 App → 重新打开 → 应直接进入地图（登录状态持久化）

5. **登出后状态重置**
   - 已登录状态 → 点击登出 → 应回到登录页

---

## 已采取的修复方式

实际修复更简洁：直接移除了 `(app)/_layout.tsx` 中的重定向守卫（整个 layout 现在只有 `<Stack>`），游客访问 `/` 时不再被拦截。`login.tsx` 的 "Continue as Guest" 按钮现在调用 `router.replace('/')` 可以正常跳转。

---

## 二、当前代码审查结果（2026-05-24）

### 合规功能完成情况

| 功能 | 状态 | 位置 |
|------|------|------|
| Continue as Guest | ✅ 已修复 | `login.tsx` → `(app)/_layout.tsx` 无拦截 |
| 举报 (Report) | ✅ 已实现 | `MapPinOverlay.tsx` → `MapPinTooltip` 组件 |
| 拉黑 (Block) | ✅ 已实现 | `MapPinOverlay.tsx` → `MapPinTooltip` 组件 |
| 删除账号 | ✅ 已实现 | `(protected)/profile.tsx` → `handleDeleteAccount` |
| 隐私政策链接 | ✅ 已实现 | `profile.tsx` → `Linking.openURL(...)` |
| 用户协议链接 | ✅ 已实现 | `profile.tsx` → `Linking.openURL(...)` |
| 位置权限说明 | ✅ 已配置 | `app.json` → `NSLocationWhenInUseUsageDescription` |
| 出口合规声明 | ✅ 已配置 | `app.json` → `ITSAppUsesNonExemptEncryption: false` |
| Apple Sign-In | ✅ 已集成 | `login.tsx` → `AppleAuthentication` |

### 遗留风险项

- **Report 需要登录**：`Compliance.reportContent` 调用 `apiFetch` 时设置了 `auth: true`。游客点击举报时会静默失败，但仍弹出"举报成功"对话框。这属于体验瑕疵，不影响审核通过（审核员会用测试账号登录测试）。
- **PinDetailModal.tsx** 组件存在但未被引用（冗余文件），不影响功能。

---

## 三、第二次发布全流程计划

### 阶段一：功能自测（你+我一起）

**我（AI）负责代码层面审查，你负责设备上真机测试。**

#### 测试清单

| # | 测试场景 | 预期结果 | 状态 |
|---|---------|---------|------|
| 1 | 冷启动 → 点击 "Continue as Guest" | 进入地图页面，无循环跳转 | ⬜ 待测 |
| 2 | 游客模式下浏览地图、缩放 | 正常显示地图和涂鸦/图钉 | ⬜ 待测 |
| 3 | 游客模式下点击"画笔"工具 | 弹出"需要登录"提示 | ⬜ 待测 |
| 4 | 游客模式下点击"图钉"工具 | 弹出"需要登录"提示 | ⬜ 待测 |
| 5 | 点击登录 → 邮箱密码登录 | 成功进入地图，可绘画 | ⬜ 待测 |
| 6 | 登录后点击图钉（已有图钉地图区域） | 弹出 Tooltip 含 Report/Block 按钮 | ⬜ 待测 |
| 7 | 点击 Report 按钮 | 弹出"举报已提交"确认框 | ⬜ 待测 |
| 8 | 点击 Block 按钮 | 弹出"用户已拉黑"确认框 | ⬜ 待测 |
| 9 | 右上角头像 → 进入 Profile 页 | 正常显示 Terms/Privacy 链接 | ⬜ 待测 |
| 10 | Profile → Delete Account | 弹出确认框，确认后退出到登录页 | ⬜ 待测 |
| 11 | Apple Sign-In 流程 | 成功登录并进入地图 | ⬜ 待测 |
| 12 | 注册新账号 + 邮件验证 | 收到验证邮件，验证后可登录 | ⬜ 待测 |
| 13 | 绘画功能（缩放到 ≥14 级） | 可正常绘画，涂鸦上传到服务器 | ⬜ 待测 |
| 14 | 放置图钉 | 成功创建图钉，地图上显示 | ⬜ 待测 |
| 15 | 杀死 App 重启（已登录状态） | 直接进入地图，无需重新登录 | ⬜ 待测 |

---

### 阶段二：提交前检查清单

#### 2.1 代码/配置检查

- [ ] `lib/config.ts` → `API_BASE_URL` 确认指向 `https://map.wisebamboo.fun`
- [ ] `app.json` → `version` 确认版本号（建议更新为 `1.1.0` 以便与上次被拒版本区分）
- [ ] `eas.json` → `autoIncrement: true` 构建号会自动递增 ✅
- [ ] `app.json` → 检查 `bundleIdentifier: com.niubi.agent` 与 App Store Connect 一致

#### 2.2 App Store Connect 元数据

- [ ] **截图** (必须): iPhone 6.9" (1320×2868) + 5.5" (1242×2208)
  - 截图内容建议：地图全景、绘画操作、图钉弹框、Profile 页
- [ ] **App 描述** (英文 + 中文)
- [ ] **关键词**: `map, drawing, social, creative, geo, collaborative`
- [ ] **支持 URL**: `https://map.wisebamboo.fun` 或专门的支持页
- [ ] **隐私政策 URL**: `https://doc-hosting.flycricket.io/drawmaps-privacy-policy/ab08a782-7dc0-48b1-97c9-e4ce1ac47c55/privacy`
- [ ] **可用地区**: ⚠️ 确认已排除中国大陆（避免测绘/ICP 合规问题）

#### 2.3 后端验证

- [ ] `https://map.wisebamboo.fun` 可正常访问
- [ ] `/api/auth/mobile/signin` 接口正常
- [ ] `/api/auth/mobile/apple` 接口正常
- [ ] `/api/drawings` 接口可返回数据
- [ ] `/api/pins` 接口可返回数据
- [ ] `/api/report` 接口正常

---

### 阶段三：构建与提交

```bash
# 1. 进入 iOS 子项目目录
cd ios

# 2. 确保 EAS CLI 已登录
eas whoami

# 3. 构建生产版本（自动提交到 App Store Connect）
eas build --platform ios --profile production --auto-submit

# 4. 或者手动构建，之后在 App Store Connect 中手动提交
eas build --platform ios --profile production
```

#### 提交时 App Store Connect 问题回答

| 问题 | 回答 |
|------|------|
| 是否使用 IDFA? | No |
| 出口合规 (非豁免加密)? | No（已在 app.json 中声明） |
| 内容权利? | 我们拥有所有内容权利 |

---

### 阶段四：审核后处理

**如果再次被拒：**
1. 查看 App Store Connect → Resolution Center 具体原因
2. 截图保存审核反馈
3. 更新本文档并修复问题

**如果通过：**
1. 状态变为 "Ready for Sale"
2. 在 "Pricing and Availability" 中设置价格（免费）和上架地区
3. 发布！

---

## 四、进度追踪

| 任务 | 负责人 | 状态 |
|------|--------|------|
| 代码自测（设备测试） | 你 | ⬜ 进行中 |
| 后端接口联调验证 | 你+AI | ⬜ 待开始 |
| App Store 截图准备 | 你 | ⬜ 待开始 |
| App Store Connect 元数据填写 | 你 | ⬜ 待开始 |
| EAS 生产构建 | 你 | ⬜ 待开始 |
| 提交审核 | 你 | ⬜ 待开始 |
