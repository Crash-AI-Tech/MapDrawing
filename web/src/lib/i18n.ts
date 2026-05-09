/**
 * Unified i18n system for the web app.
 * Centralized dictionary with Zustand-backed language state.
 */

import { create } from 'zustand';

export type Lang = 'zh' | 'en' | 'ja';

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
  lang: detectLang(),
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

// --------------- Dictionary ---------------

const dict = {
  // ─── General ───
  appName: { zh: 'DrawMap', en: 'DrawMap', ja: 'DrawMap' },

  // ─── Toolbar ───
  toolNavigation: { zh: '导航 (H)', en: 'Navigation (H)', ja: 'ナビゲーション (H)' },
  toolDraw: { zh: '画笔 (D)', en: 'Draw (D)', ja: '描画 (D)' },
  toolPin: { zh: '图钉 (P)', en: 'Pin (P)', ja: 'ピン (P)' },
  toolUndo: { zh: '撤销 (Ctrl+Z)', en: 'Undo (Ctrl+Z)', ja: '元に戻す (Ctrl+Z)' },
  toolRedo: { zh: '重做 (Ctrl+Shift+Z)', en: 'Redo (Ctrl+Shift+Z)', ja: 'やり直す (Ctrl+Shift+Z)' },
  toolTransparencyOn: { zh: '半透明绘制（查看地图）', en: 'Semi-transparent (reveal map)', ja: '半透明（地図を表示）' },
  toolTransparencyOff: { zh: '恢复绘制不透明度', en: 'Restore opacity', ja: '不透明度を復元' },
  toolExport: { zh: '导出 / 分享', en: 'Export / Share', ja: 'エクスポート / 共有' },

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
  menuProfile: { zh: '个人资料', en: 'Profile', ja: 'プロフィール' },
  menuSettings: { zh: '设置', en: 'Settings', ja: '設定' },
  menuLogout: { zh: '退出', en: 'Log Out', ja: 'ログアウト' },

  // ─── Landing Page ───
  landingNavFeatures: { zh: '玩法', en: 'Features', ja: '機能' },
  landingNavSteps: { zh: '上手', en: 'Get Started', ja: '始める' },
  landingNavCta: { zh: '开始探索', en: 'Start Exploring', ja: '探索を始める' },
  landingHeroTag: { zh: '在真实地图上画画 🌍', en: 'DRAW ON THE REAL WORLD 🌍', ja: 'リアルワールドに描こう 🌍' },
  landingHeroTitle1: { zh: '在真实地图上，', en: 'Draw on the ', ja: 'リアルワールドの' },
  landingHeroTitle2: { zh: '和全世界一起涂鸦', en: 'Real World Map', ja: '地図に描こう' },
  landingHeroDesc: {
    zh: '选一支画笔，在任何城市的街道上留下你的创作——所有人都能看到、续写。一张永远不会完成的全球涂鸦墙。',
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

  const t = (key: DictKey, params?: Record<string, string | number>): string => {
    let text: string = dict[key]?.[lang] ?? dict[key]?.en ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  };

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
