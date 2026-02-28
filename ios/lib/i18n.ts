/**
 * i18n — centralized multi-language support for the iOS app.
 * Supports: Chinese (zh), English (en), Japanese (ja)
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Lang = 'zh' | 'en' | 'ja';
const LANG_KEY = 'niubi-lang';

// Global listeners for language changes
type LangListener = (lang: Lang) => void;
const listeners = new Set<LangListener>();
let currentLang: Lang = 'en';

export function getCurrentLang(): Lang {
  return currentLang;
}

export async function initLang(): Promise<Lang> {
  const saved = await AsyncStorage.getItem(LANG_KEY);
  if (saved === 'zh' || saved === 'en' || saved === 'ja') {
    currentLang = saved;
  }
  return currentLang;
}

export async function setLang(lang: Lang): Promise<void> {
  currentLang = lang;
  await AsyncStorage.setItem(LANG_KEY, lang);
  listeners.forEach((fn) => fn(lang));
}

/** Hook that returns current language and a setter. Re-renders on language change. */
export function useLang(): [Lang, (lang: Lang) => void] {
  const [lang, setLangState] = useState<Lang>(currentLang);

  useEffect(() => {
    // Init from storage on mount
    initLang().then((l) => setLangState(l));
    const listener: LangListener = (l) => setLangState(l);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const changeLang = useCallback((l: Lang) => {
    setLang(l);
  }, []);

  return [lang, changeLang];
}

// ===== Translation dictionary =====
export const translations = {
  // ===== Map Screen =====
  signInRequired: { zh: '需要登录', en: 'Sign In Required', ja: 'サインインが必要です' },
  signInToDrawOrPin: { zh: '您需要登录才能绘画或放置图钉。', en: 'You need to sign in to draw or place pins.', ja: '描画やピンの配置にはサインインが必要です。' },
  cancel: { zh: '取消', en: 'Cancel', ja: 'キャンセル' },
  signIn: { zh: '登录', en: 'Sign In', ja: 'サインイン' },
  pinsCount: { zh: (n: number) => `${n} 图钉`, en: (n: number) => `${n} pins`, ja: (n: number) => `${n} ピン` },
  hint: { zh: '提示', en: 'Hint', ja: 'ヒント' },
  zoomInForPin: { zh: (z: number) => `请放大到 ${z} 级以上才能放置图钉`, en: (z: number) => `Please zoom in to level ${z} or higher to place a pin`, ja: (z: number) => `ピンを配置するにはズームレベル ${z} 以上に拡大してください` },
  inkInsufficient: { zh: '墨水不足', en: 'Ink Insufficient', ja: 'インク不足' },
  pinInkCost: { zh: (n: number) => `放置图钉需要 ${n} 墨水`, en: (n: number) => `Placing a pin requires ${n} ink`, ja: (n: number) => `ピンの配置には ${n} インクが必要です` },
  placeFailed: { zh: '放置失败', en: 'Place Failed', ja: '配置に失敗しました' },
  zoomHintDraw: { zh: (min: number, cur: number) => `请放大到 ${min} 级以上才能绘画（当前 ${cur} 级）`, en: (min: number, cur: number) => `Zoom to level ${min}+ to draw (current: ${cur})`, ja: (min: number, cur: number) => `描画するにはレベル ${min} 以上にズームしてください（現在: ${cur}）` },
  zoomHintPin: { zh: (min: number, cur: number) => `请放大到 ${min} 级以上才能放置图钉（当前 ${cur} 级）`, en: (min: number, cur: number) => `Zoom to level ${min}+ to place pins (current: ${cur})`, ja: (min: number, cur: number) => `ピンを配置するにはレベル ${min} 以上にズームしてください（現在: ${cur}）` },
  inkDepleted: { zh: '墨水耗尽，请稍等片刻…', en: 'Ink depleted, please wait…', ja: 'インクが切れました。しばらくお待ちください…' },

  // ===== Profile =====
  pins: { zh: '图钉', en: 'Pins', ja: 'ピン' },
  drawings: { zh: '绘制', en: 'Drawings', ja: '描画' },
  supportLegal: { zh: '帮助 & 法律', en: 'Support & Legal', ja: 'サポート & 法律' },
  terms: { zh: '服务条款', en: 'Terms of Service', ja: '利用規約' },
  privacy: { zh: '隐私政策', en: 'Privacy Policy', ja: 'プライバシーポリシー' },
  blocked: { zh: '已屏蔽的用户', en: 'Blocked Users', ja: 'ブロック中のユーザー' },
  blockedEmpty: { zh: '暂无已屏蔽的用户', en: 'No users blocked yet.', ja: 'ブロック中のユーザーはいません' },
  logOut: { zh: '退出登录', en: 'Log Out', ja: 'ログアウト' },
  deleteAccount: { zh: '删除账号', en: 'Delete Account', ja: 'アカウントを削除' },
  deleting: { zh: '删除中...', en: 'Deleting...', ja: '削除中...' },
  language: { zh: '语言', en: 'Language', ja: '言語' },
  deleteTitle: { zh: '删除账号', en: 'Delete Account', ja: 'アカウントを削除' },
  deleteMsg: { zh: '确定要删除账号吗？此操作不可撤销，所有数据将被永久删除。', en: 'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.', ja: 'アカウントを削除してよろしいですか？この操作は元に戻せず、すべてのデータが完全に削除されます。' },
  delete: { zh: '删除', en: 'Delete', ja: '削除' },
  accountDeleted: { zh: '账号已删除', en: 'Account Deleted', ja: 'アカウントが削除されました' },
  accountDeletedMsg: { zh: '您的账号已成功删除。', en: 'Your account has been successfully deleted.', ja: 'アカウントは正常に削除されました。' },
  anonymousAgent: { zh: '匿名用户', en: 'Anonymous Agent', ja: '匿名ユーザー' },
  uploadFailed: { zh: '上传失败', en: 'Upload Failed', ja: 'アップロードに失敗しました' },

  // ===== DrawingToolbar =====
  cannotDraw: { zh: '无法绘制', en: 'Cannot Draw', ja: '描画できません' },
  cannotPin: { zh: '无法放置图钉', en: 'Cannot Place Pin', ja: 'ピンを配置できません' },
  zoomInToDraw: { zh: (z: number) => `请放大到 ${z} 级以上才能绘画`, en: (z: number) => `Please zoom in to level ${z} or higher to draw.`, ja: (z: number) => `描画するにはレベル ${z} 以上にズームしてください` },
  zoomInToPin: { zh: (z: number) => `请放大到 ${z} 级以上才能放置图钉`, en: (z: number) => `Please zoom in to level ${z} or higher to place a pin.`, ja: (z: number) => `ピンを配置するにはレベル ${z} 以上にズームしてください` },
  recentColors: { zh: '最近使用', en: 'Recent', ja: '最近使用した色' },
  colors: { zh: '颜色', en: 'Colors', ja: '色' },
  custom: { zh: '自定义', en: 'Custom', ja: 'カスタム' },
  size: { zh: '大小', en: 'Size', ja: 'サイズ' },
  opacity: { zh: '透明度', en: 'Opacity', ja: '不透明度' },

  // ===== PinPlacer =====
  placePin: { zh: '📌 放置图钉', en: '📌 Place Pin', ja: '📌 ピンを配置' },
  pinPlaceholder: { zh: '写点什么… (最多50字)', en: "What's on your mind? (max 50)", ja: 'メッセージを入力… (最大50文字)' },
  placing: { zh: '放置中…', en: 'Placing…', ja: '配置中…' },
  placeWithCost: { zh: (n: number) => `放置 (−${n} 墨水)`, en: (n: number) => `Place (−${n} ink)`, ja: (n: number) => `配置 (−${n} インク)` },

  // ===== MapPinOverlay =====
  justNow: { zh: '刚刚', en: 'just now', ja: 'たった今' },
  minutesAgo: { zh: (n: number) => `${n}分钟前`, en: (n: number) => `${n}m ago`, ja: (n: number) => `${n}分前` },
  hoursAgo: { zh: (n: number) => `${n}小时前`, en: (n: number) => `${n}h ago`, ja: (n: number) => `${n}時間前` },
  daysAgo: { zh: (n: number) => `${n}天前`, en: (n: number) => `${n}d ago`, ja: (n: number) => `${n}日前` },
  anonymous: { zh: '匿名', en: 'Anonymous', ja: '匿名' },
  report: { zh: '🚩 举报', en: '🚩 Report', ja: '🚩 報告' },
  block: { zh: '🚫 屏蔽', en: '🚫 Block', ja: '🚫 ブロック' },

  // ===== PinDetailModal =====
  reportContent: { zh: '不当内容', en: 'Inappropriate content', ja: '不適切なコンテンツ' },
  reportBtn: { zh: '举报', en: 'Report', ja: '報告' },
  blockUser: { zh: '屏蔽用户', en: 'Block User', ja: 'ユーザーをブロック' },

  // ===== Auth =====
  welcomeBack: { zh: '欢迎回来', en: 'Welcome Back', ja: 'おかえりなさい' },
  signInSubtitle: { zh: '登录以在世界地图上涂鸦', en: 'Sign in to draw on the world map', ja: '世界地図に描画するためにサインイン' },
  email: { zh: '邮箱', en: 'Email', ja: 'メールアドレス' },
  password: { zh: '密码', en: 'Password', ja: 'パスワード' },
  signingIn: { zh: '登录中...', en: 'Signing in...', ja: 'サインイン中...' },
  forgotPassword: { zh: '忘记密码？', en: 'Forgot Password?', ja: 'パスワードをお忘れですか？' },
  or: { zh: '或', en: 'OR', ja: 'または' },
  noAccount: { zh: '没有账号？', en: "Don't have an account? ", ja: 'アカウントがありませんか？' },
  signUp: { zh: '注册', en: 'Sign Up', ja: '新規登録' },
  continueAsGuest: { zh: '以访客身份继续', en: 'Continue as Guest', ja: 'ゲストとして続行' },
  loginFailed: { zh: '登录失败', en: 'Login Failed', ja: 'ログインに失敗しました' },
  unknownError: { zh: '未知错误', en: 'Unknown error', ja: '不明なエラー' },
  appleSignInError: { zh: 'Apple 登录错误', en: 'Apple Sign In Error', ja: 'Apple サインインエラー' },
  error: { zh: '错误', en: 'Error', ja: 'エラー' },
  enterEmailPassword: { zh: '请输入邮箱和密码', en: 'Please enter email and password', ja: 'メールアドレスとパスワードを入力してください' },
  invalidCredentials: { zh: '无效的凭证', en: 'Invalid credentials', ja: '無効な資格情報' },
  networkError: { zh: '网络错误', en: 'Network Error', ja: 'ネットワークエラー' },
  enterCode: { zh: '请输入6位验证码', en: 'Please enter the 6-digit code', ja: '6桁のコードを入力してください' },
  verifyEmail: { zh: '验证邮箱', en: 'Verify Email', ja: 'メールアドレスを確認' },
  enterCodeSentTo: { zh: '输入发送到该邮箱的验证码', en: 'Enter the code sent to', ja: '送信されたコードを入力' },
  verifying: { zh: '验证中...', en: 'Verifying...', ja: '確認中...' },
  verify: { zh: '验证', en: 'Verify', ja: '確認' },
  verificationFailed: { zh: '验证失败', en: 'Verification Failed', ja: '確認に失敗しました' },
  invalidCode: { zh: '验证码无效', en: 'Invalid code', ja: '無効なコード' },
  backToLogin: { zh: '返回登录', en: 'Back to Login', ja: 'ログインに戻る' },

  // ===== Register =====
  createAccount: { zh: '创建账号', en: 'Create Account', ja: 'アカウントを作成' },
  joinCommunity: { zh: '加入世界地图绘画社区', en: 'Join the global map drawing community', ja: 'グローバルマップ描画コミュニティに参加' },
  usernameOptional: { zh: '用户名（可选）', en: 'Username (optional)', ja: 'ユーザー名（任意）' },
  passwordMin6: { zh: '密码（至少6位）', en: 'Password (min 6 characters)', ja: 'パスワード（6文字以上）' },
  creating: { zh: '创建中...', en: 'Creating...', ja: '作成中...' },
  alreadyHaveAccount: { zh: '已有账号？登录', en: 'Already have an account? Log In', ja: 'すでにアカウントをお持ちですか？ログイン' },
  registrationFailed: { zh: '注册失败', en: 'Registration Failed', ja: '登録に失敗しました' },
  passwordTooShort: { zh: '密码至少需要6个字符', en: 'Password must be at least 6 characters', ja: 'パスワードは6文字以上必要です' },
  weSentCode: { zh: '已发送6位验证码到', en: 'We sent a 6-digit code to', ja: '6桁のコードを送信しました' },
  sent: { zh: '已发送', en: 'Sent', ja: '送信完了' },
  newCodeSent: { zh: '新的验证码已发送到您的邮箱', en: 'A new verification code has been sent to your email', ja: '新しい確認コードがメールに送信されました' },
  resendFailed: { zh: '重新发送失败', en: 'Failed to resend', ja: '再送信に失敗しました' },
  sending: { zh: '发送中...', en: 'Sending...', ja: '送信中...' },
  resendCode: { zh: '重新发送验证码', en: 'Resend Code', ja: 'コードを再送信' },

  // ===== Forgot Password =====
  forgotPasswordTitle: { zh: '忘记密码', en: 'Forgot Password', ja: 'パスワードをお忘れの場合' },
  forgotPasswordSubtitle: { zh: '输入您的邮箱，我们将发送重置验证码', en: "Enter your email and we'll send a reset code", ja: 'メールアドレスを入力してリセットコードを送信します' },
  sendResetCode: { zh: '发送重置验证码', en: 'Send Reset Code', ja: 'リセットコードを送信' },
  resetPassword: { zh: '重置密码', en: 'Reset Password', ja: 'パスワードをリセット' },
  newPasswordMin6: { zh: '新密码（至少6位）', en: 'New Password (min 6 characters)', ja: '新しいパスワード（6文字以上）' },
  resetting: { zh: '重置中...', en: 'Resetting...', ja: 'リセット中...' },
  passwordReset: { zh: '密码已重置！', en: 'Password Reset!', ja: 'パスワードがリセットされました！' },
  passwordResetMsg: { zh: '您的密码已成功更新。', en: 'Your password has been updated successfully.', ja: 'パスワードは正常に更新されました。' },
  failedToSendCode: { zh: '发送验证码失败', en: 'Failed to send code', ja: 'コードの送信に失敗しました' },
  failedToResetPassword: { zh: '重置密码失败', en: 'Failed to reset password', ja: 'パスワードのリセットに失敗しました' },
  enterEmail: { zh: '请输入邮箱', en: 'Please enter your email', ja: 'メールアドレスを入力してください' },

  // ===== Language display names =====
  langZh: { zh: '中文', en: '中文', ja: '中国語' },
  langEn: { zh: 'English', en: 'English', ja: '英語' },
  langJa: { zh: '日本語', en: '日本語', ja: '日本語' },
} as const;

type TranslationKey = keyof typeof translations;

/** Get a translation string for the current language */
export function t(key: TranslationKey, lang?: Lang): string | ((...args: any[]) => string) {
  const l = lang ?? currentLang;
  return (translations[key] as any)[l] ?? (translations[key] as any).en;
}

/** Convenience: get a string translation (no function params) */
export function ts(key: TranslationKey, lang?: Lang): string {
  const val = t(key, lang);
  return typeof val === 'string' ? val : '';
}

/** Get a function translation and call it */
export function tf(key: TranslationKey, lang?: Lang): (...args: any[]) => string {
  const val = t(key, lang);
  return typeof val === 'function' ? val : () => String(val);
}
