/**
 * Unified i18n system for the web app.
 * Centralized dictionary with Zustand-backed language state.
 */

import { create } from 'zustand';
import { useCallback } from 'react';
import type { AppLanguage } from '@niubi/shared';

export type Lang = AppLanguage;

// --------------- Language Store ---------------

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

const STORAGE_KEY = 'niubi-lang';

function detectLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'zh' || stored === 'en' || stored === 'ja') return stored;
  } catch {}
  const nav = navigator.language || '';
  if (nav.startsWith('zh')) return 'zh';
  if (nav.startsWith('ja')) return 'ja';
  return 'en';
}

export const useLangStore = create<LangState>((set, get) => ({
  // Keep the server and the first client render identical. Browser preference
  // is applied after hydration by LanguageDocumentSync.
  lang: 'en',
  setLang: (lang) => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
    set({ lang });
  },
  toggleLang: () => {
    const order: Lang[] = ['zh', 'en', 'ja'];
    const idx = order.indexOf(get().lang);
    const next = order[(idx + 1) % order.length];
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    set({ lang: next });
  },
}));

export function hydrateLanguageFromBrowser(): void {
  useLangStore.setState({ lang: detectLang() });
}

// --------------- Dictionary ---------------

const dict = {
  // ─── General ───
  appName: { zh: 'DrawMap', en: 'DrawMap', ja: 'DrawMap' },

  // ─── Toolbar ───
  toolNavigation: { zh: '导航 (H)', en: 'Navigation (H)', ja: 'ナビゲーション (H)' },
  toolDraw: { zh: '画笔 (D)', en: 'Draw (D)', ja: '描画 (D)' },
  toolPencilToggle: { zh: '画笔（再次点击切换橡皮擦）', en: 'Pencil (click again for eraser)', ja: '鉛筆（もう一度押すと消しゴム）' },
  toolEraserToggle: { zh: '橡皮擦（再次点击切换画笔）', en: 'Eraser (click again for pencil)', ja: '消しゴム（もう一度押すと鉛筆）' },
  toolPin: { zh: '图钉 (P)', en: 'Pin (P)', ja: 'ピン (P)' },
  toolUndo: { zh: '撤销 (Ctrl+Z)', en: 'Undo (Ctrl+Z)', ja: '元に戻す (Ctrl+Z)' },
  toolRedo: { zh: '重做 (Ctrl+Shift+Z)', en: 'Redo (Ctrl+Shift+Z)', ja: 'やり直す (Ctrl+Shift+Z)' },
  toolTransparencyOn: { zh: '半透明绘制（查看地图）', en: 'Semi-transparent (reveal map)', ja: '半透明（地図を表示）' },
  toolTransparencyOff: { zh: '恢复绘制不透明度', en: 'Restore opacity', ja: '不透明度を復元' },
  toolExport: { zh: '导出 / 分享', en: 'Export / Share', ja: 'エクスポート / 共有' },
  toolMore: { zh: '更多工具', en: 'More tools', ja: 'その他のツール' },
  brushSettings: { zh: '颜色与笔触 (B)', en: 'Color and stroke (B)', ja: '色とストローク (B)' },
  brushPresets: { zh: '预设颜色', en: 'Presets', ja: 'プリセット' },
  brushCustom: { zh: '自定义', en: 'Custom', ja: 'カスタム' },
  brushSize: { zh: '大小', en: 'Size', ja: 'サイズ' },
  brushOpacity: { zh: '不透明度', en: 'Opacity', ja: '不透明度' },
  inkLabel: { zh: '墨水', en: 'Ink', ja: 'インク' },
  inkNextRegen: { zh: '{seconds}秒后恢复 +1', en: '+1 in {seconds}s', ja: '{seconds}秒後に +1' },
  inkFull: { zh: '墨水已满', en: 'Ink is full', ja: 'インクは満タンです' },

  // ─── Export Menu ───
  exportDownloadPNG: { zh: '下载 PNG', en: 'Download PNG', ja: 'PNG をダウンロード' },
  exportCopyClipboard: { zh: '复制到剪贴板', en: 'Copy to clipboard', ja: 'クリップボードにコピー' },
  exportShareLink: { zh: '生成分享链接', en: 'Generate share link', ja: '共有リンクを生成' },
  exportDownloaded: { zh: '已下载 PNG', en: 'PNG downloaded', ja: 'PNG をダウンロードしました' },
  exportCopied: { zh: '已复制到剪贴板', en: 'Copied to clipboard', ja: 'クリップボードにコピーしました' },
  exportCopyFailed: { zh: '复制失败，浏览器可能不支持', en: 'Copy failed, browser may not support this', ja: 'コピーに失敗しました。ブラウザが対応していない可能性があります' },
  exportCaptureFailed: { zh: '截图失败', en: 'Capture failed', ja: 'キャプチャに失敗しました' },
  exportCanvasNotFound: { zh: '无法获取画布', en: 'Canvas not found', ja: 'キャンバスが見つかりません' },
  exportShareCopied: { zh: '分享链接已复制到剪贴板', en: 'Share link copied to clipboard', ja: '共有リンクをクリップボードにコピーしました' },
  exportShareFailed: { zh: '生成分享链接失败', en: 'Failed to generate share link', ja: '共有リンクの生成に失敗しました' },

  // ─── Sync Status ───
  syncConnected: { zh: '已连接', en: 'Connected', ja: '接続済み' },
  syncConnecting: { zh: '连接中...', en: 'Connecting...', ja: '接続中...' },
  syncDisconnected: { zh: '离线 — 操作将在恢复后同步', en: 'Offline — changes will sync later', ja: 'オフライン — 変更は後で同期されます' },
  syncError: { zh: '连接错误 — 操作已缓存', en: 'Connection error — changes cached', ja: '接続エラー — 変更はキャッシュ済み' },
  syncOnline: { zh: '在线', en: 'Online', ja: 'オンライン' },
  syncOffline: { zh: '离线', en: 'Offline', ja: 'オフライン' },
  mapLoading: { zh: '加载地图引擎…', en: 'Loading map…', ja: '地図を読み込み中…' },

  // ─── Zoom Hints ───
  zoomDrawHint: { zh: '请放大到 {zoom} 级以上才能绘画（当前 {current} 级）', en: 'Zoom in to level {zoom}+ to draw (current: {current})', ja: '描画するにはレベル {zoom} 以上にズームしてください（現在: {current}）' },
  zoomPinHint: { zh: '请放大到 {zoom} 级以上才能放置图钉（当前 {current} 级）', en: 'Zoom in to level {zoom}+ to place pins (current: {current})', ja: 'ピンを配置するにはレベル {zoom} 以上にズームしてください（現在: {current}）' },
  zoomPinPrompt: { zh: '点击地图选择图钉位置', en: 'Click the map to place a pin', ja: '地図をクリックしてピンを配置' },

  // ─── Ink ───
  inkDepleted: { zh: '墨水耗尽，请稍等片刻…', en: 'Ink depleted, please wait...', ja: 'インクが切れました。しばらくお待ちください…' },

  // ─── Time Ago ───
  timeJustNow: { zh: '刚刚', en: 'just now', ja: 'たった今' },
  timeMinutesAgo: { zh: '{n}分钟前', en: '{n}m ago', ja: '{n}分前' },
  timeHoursAgo: { zh: '{n}小时前', en: '{n}h ago', ja: '{n}時間前' },
  timeDaysAgo: { zh: '{n}天前', en: '{n}d ago', ja: '{n}日前' },

  // ─── Pins ───
  pinAnonymous: { zh: '匿名', en: 'Anonymous', ja: '匿名' },
  pinReport: { zh: '举报', en: 'Report', ja: '報告' },
  pinBlockUser: { zh: '屏蔽用户', en: 'Block User', ja: 'ユーザーをブロック' },
  pinReportReason: { zh: '举报原因:', en: 'Report reason:', ja: '報告理由:' },
  pinBlockConfirm: { zh: '屏蔽 {name}？他们的图钉将被隐藏。', en: 'Block {name}? Their pins will be hidden.', ja: '{name} をブロックしますか？ピンが非表示になります。' },
  reportSubmitted: { zh: '举报已提交，我们会尽快审核。', en: 'Report submitted. We will review it as soon as practical.', ja: '通報を送信しました。可能な限り早く確認します。' },
  reportFailed: { zh: '举报提交失败，请重试。', en: 'Failed to submit the report. Please try again.', ja: '通報の送信に失敗しました。もう一度お試しください。' },

  // ─── Share Page ───
  shareCreatedBy: { zh: '由 DrawMap 创建', en: 'Created with DrawMap', ja: 'DrawMap で作成' },
  shareOpenApp: { zh: '打开 DrawMap 绘制', en: 'Open DrawMap to draw', ja: 'DrawMap を開いて描画' },

  // ─── Auth Dialog ───
  authLoginTitle: { zh: '欢迎回来', en: 'Welcome Back', ja: 'おかえりなさい' },
  authLoginDesc: { zh: '登录后即可在地图上涂鸦和留言', en: 'Log in to draw and pin on the map', ja: '地図に描画やピンを配置するにはログインしてください' },
  authRegisterTitle: { zh: '创建账号', en: 'Create Account', ja: 'アカウントを作成' },
  authRegisterDesc: { zh: '注册账号，开始你的创作之旅', en: 'Join us and start your creative journey', ja: 'コミュニティに参加してクリエイティブな旅を始めましょう' },
  authVerifyTitle: { zh: '验证邮箱', en: 'Verify Email', ja: 'メールアドレスを確認' },
  authVerifyDesc: { zh: '输入你收到的验证码', en: 'Enter the verification code we sent you', ja: '送信された確認コードを入力してください' },
  authForgotTitle: { zh: '找回密码', en: 'Forgot Password', ja: 'パスワードをお忘れの場合' },
  authForgotDesc: { zh: '输入注册邮箱，获取重置验证码', en: 'Enter your email to get a reset code', ja: 'メールアドレスを入力してリセットコードを受け取ってください' },
  authResetTitle: { zh: '重置密码', en: 'Reset Password', ja: 'パスワードをリセット' },
  authResetDesc: { zh: '输入验证码和新密码', en: 'Enter the code and your new password', ja: 'コードと新しいパスワードを入力してください' },

  // ─── Auth Forms ───
  authEmail: { zh: '邮箱', en: 'Email', ja: 'メールアドレス' },
  authEmailPlaceholder: { zh: '请输入邮箱', en: 'Enter your email', ja: 'メールアドレスを入力' },
  authPassword: { zh: '密码', en: 'Password', ja: 'パスワード' },
  authPasswordPlaceholder: { zh: '请输入密码', en: 'Enter your password', ja: 'パスワードを入力' },
  authNewPassword: { zh: '新密码', en: 'New Password', ja: '新しいパスワード' },
  authNewPasswordPlaceholder: { zh: '设置新密码（至少8位）', en: 'Set new password (min 8 chars)', ja: '新しいパスワードを設定（8文字以上）' },
  authCode: { zh: '验证码', en: 'Verification Code', ja: '確認コード' },
  authCodePlaceholder: { zh: '6位验证码', en: '6-digit code', ja: '6桁のコード' },
  authUserName: { zh: '用户名', en: 'Username', ja: 'ユーザー名' },
  authUserNamePlaceholder: { zh: '你的昵称', en: 'Your display name', ja: '表示名' },
  authLogin: { zh: '登录', en: 'Log In', ja: 'ログイン' },
  authRegister: { zh: '注册', en: 'Sign Up', ja: '新規登録' },
  authVerify: { zh: '验证', en: 'Verify', ja: '確認' },
  authSendCode: { zh: '发送验证码', en: 'Send Code', ja: 'コードを送信' },
  authResetPassword: { zh: '重置密码', en: 'Reset Password', ja: 'パスワードをリセット' },
  authLoggingIn: { zh: '登录中...', en: 'Logging in...', ja: 'ログイン中...' },
  authRegistering: { zh: '注册中...', en: 'Signing up...', ja: '登録中...' },
  authVerifying: { zh: '验证中...', en: 'Verifying...', ja: '確認中...' },
  authSending: { zh: '发送中...', en: 'Sending...', ja: '送信中...' },
  authResetting: { zh: '重置中...', en: 'Resetting...', ja: 'リセット中...' },
  authNoAccount: { zh: '没有账号？', en: "Don't have an account?", ja: 'アカウントがありませんか？' },
  authGoRegister: { zh: '去注册', en: 'Sign Up', ja: '新規登録' },
  authHasAccount: { zh: '已有账号？', en: 'Already have an account?', ja: 'すでにアカウントをお持ちですか？' },
  authGoLogin: { zh: '去登录', en: 'Log In', ja: 'ログイン' },
  authForgotPassword: { zh: '忘记密码？', en: 'Forgot password?', ja: 'パスワードをお忘れですか？' },
  authBackToLogin: { zh: '返回登录', en: 'Back to Login', ja: 'ログインに戻る' },
  authCodeSent: { zh: '验证码已发送到 {email}', en: 'Code sent to {email}', ja: 'コードを {email} に送信しました' },
  authResendCode: { zh: '重新发送', en: 'Resend', ja: '再送信' },
  authAppleSignIn: { zh: '使用 Apple 登录', en: 'Sign in with Apple', ja: 'Apple でサインイン' },
  langToggle: { zh: 'EN', en: '日本語', ja: '中文' },

  // ─── User Menu ───
  menuLogin: { zh: '登录', en: 'Log In', ja: 'ログイン' },
  menuUserFallback: { zh: '用户', en: 'User', ja: 'ユーザー' },
  menuPins: { zh: '图钉', en: 'Pins', ja: 'ピン' },
  menuDrawings: { zh: '绘画', en: 'Drawings', ja: '描画' },
  menuSupportLegal: { zh: '帮助与法律', en: 'Support & Legal', ja: 'サポートと法務' },
  menuTerms: { zh: '服务条款', en: 'Terms of Service', ja: '利用規約' },
  menuPrivacy: { zh: '隐私政策', en: 'Privacy Policy', ja: 'プライバシーポリシー' },
  menuBlockedUsers: { zh: '已屏蔽用户', en: 'Blocked Users', ja: 'ブロック中のユーザー' },
  menuBlockedLoading: { zh: '加载中…', en: 'Loading…', ja: '読み込み中…' },
  menuBlockedEmpty: { zh: '尚未屏蔽任何用户', en: 'No users blocked yet.', ja: 'ブロック中のユーザーはいません' },
  menuUnblock: { zh: '解除屏蔽', en: 'Unblock', ja: 'ブロック解除' },
  menuUnblockFailed: { zh: '解除屏蔽失败，请重试。', en: 'Failed to unblock user. Please try again.', ja: 'ブロック解除に失敗しました。もう一度お試しください。' },
  menuLogout: { zh: '退出登录', en: 'Log Out', ja: 'ログアウト' },
  menuDeleteAccount: { zh: '删除账号', en: 'Delete Account', ja: 'アカウントを削除' },
  menuDeleting: { zh: '删除中…', en: 'Deleting…', ja: '削除中…' },
  menuDeleteConfirm: { zh: '确定删除账号吗？账号、头像、绘画、图钉和其他关联数据都会被永久删除，此操作无法撤销。', en: 'Delete your account? Your account, avatar, drawings, pins, and other associated data will be permanently removed. This cannot be undone.', ja: 'アカウントを削除しますか？アカウント、アバター、描画、ピン、その他の関連データは完全に削除され、元に戻せません。' },
  menuDeleteFailed: { zh: '账号删除失败，请重试。', en: 'Failed to delete account. Please try again.', ja: 'アカウントの削除に失敗しました。もう一度お試しください。' },
  menuUploadTooLarge: { zh: '文件过大，最大为 2MB。', en: 'File too large (max 2MB).', ja: 'ファイルが大きすぎます（最大2MB）。' },
  menuUploadFailed: { zh: '头像上传失败。', en: 'Avatar upload failed.', ja: 'アバターのアップロードに失敗しました。' },
  menuChangeAvatar: { zh: '更换头像', en: 'Change avatar', ja: 'アバターを変更' },
  close: { zh: '关闭', en: 'Close', ja: '閉じる' },
  language: { zh: '语言', en: 'Language', ja: '言語' },
  support: { zh: '支持', en: 'Support', ja: 'サポート' },

  // ─── Landing Page ───
  landingNavFeatures: { zh: '玩法', en: 'Features', ja: '機能' },
  landingNavSteps: { zh: '上手', en: 'Get Started', ja: '始める' },
  landingNavCta: { zh: '开始探索', en: 'Start Exploring', ja: '探索を始める' },
  landingHeroTag: { zh: '在真实地图上画画 🌍', en: 'DRAW ON THE REAL WORLD 🌍', ja: 'リアルワールドに描こう 🌍' },
  landingHeroTitle1: { zh: '在真实地图上，', en: 'Draw on the ', ja: 'リアルワールドの' },
  landingHeroTitle2: { zh: '和全世界一起涂鸦', en: 'Real World Map', ja: '地図に描こう' },
  landingHeroDesc: {
    zh: '选一支画笔，在任何城市的街道上留下你的创作——所有人都能看到、续写。一张持续生长的全球涂鸦墙。',
    en: 'Pick a brush and leave your mark on any street in any city — everyone can see it, everyone can add to it. A never-ending global graffiti wall.',
    ja: 'ブラシを選んで、世界中のどの都市の通りにも作品を残そう — みんなが見れて、みんなが描き足せる。終わることのないグローバル落書きウォール。',
  },
  landingHeroCta: { zh: '开始探索 ', en: 'Start Exploring ', ja: '探索を始める ' },
} as const;

// --------------- Types ---------------

type DictKey = keyof typeof dict;

// --------------- Hook ---------------

/**
 * Returns the current language translations.
 * Usage: const { t, lang, setLang, toggleLang } = useI18n();
 * Access: t('toolDraw') or t('zoomDrawHint', { zoom: 18, current: 14 })
 */
export function useI18n() {
  const { lang, setLang, toggleLang } = useLangStore();

  const t = useCallback((key: DictKey, params?: Record<string, string | number>): string => {
    let text: string = dict[key]?.[lang] ?? dict[key]?.en ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  }, [lang]);

  return { t, lang, setLang, toggleLang };
}

/**
 * Non-hook version for use outside React components.
 * Uses the current language from the store.
 */
export function getI18nText(key: DictKey, params?: Record<string, string | number>): string {
  const lang = useLangStore.getState().lang;
  let text: string = dict[key]?.[lang] ?? dict[key]?.en ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}
