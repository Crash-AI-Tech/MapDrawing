'use client';

import Link from 'next/link';
import { ArrowLeft, HelpCircle, Mail, MessageCircle, Shield } from 'lucide-react';
import { LanguageSelector } from '@/components/shared/LanguageSelector';
import { useI18n } from '@/lib/i18n';

const COPY = {
  zh: {
    back: '返回首页', title: '支持中心', subtitle: '我们会帮助你更好地使用 DrawMaps。',
    contact: '联系我们', contactBody: '如果你遇到问题、需要举报内容或有功能建议，请发送邮件，我们会尽快回复。',
    faq: '常见问题', privacy: '隐私政策', privacyBody: '了解我们收集哪些数据、为什么使用它们，以及你如何行使数据权利。',
    viewPrivacy: '查看隐私政策 →', terms: '服务条款', footer: 'DrawMaps — 全球协作艺术平台',
    questions: [
      ['DrawMaps 是什么？', 'DrawMaps 是一个可以直接在真实世界地图上绘画和留下定位消息的协作画布。'],
      ['墨水如何工作？', '每位用户最多有 100 点墨水。绘画和放置图钉会消耗墨水，每 18 秒自动恢复 1 点。'],
      ['可以在 Web 和 iOS 上同时使用吗？', '可以。两端共享同一账号、画布、墨水和屏蔽列表。'],
      ['如何举报不当内容？', '在图钉或绘画的内容操作中选择举报，并填写原因。也可以通过支持邮箱联系我们。'],
      ['如何删除账号？', '在 Web 用户菜单或 iOS「资料」页面选择「删除账号」。确认后，账号、会话、头像、绘画、图钉与其他关联数据将被删除，无法恢复。'],
    ],
  },
  en: {
    back: 'Back to home', title: 'Support Center', subtitle: 'Help with your DrawMaps account and shared canvas.',
    contact: 'Contact us', contactBody: 'For technical help, content reports, or feature requests, email us and we will respond as soon as practical.',
    faq: 'Frequently asked questions', privacy: 'Privacy Policy', privacyBody: 'See what data we collect, why we use it, and how you can exercise your data rights.',
    viewPrivacy: 'View Privacy Policy →', terms: 'Terms of Service', footer: 'DrawMaps — Global Collaborative Art Platform',
    questions: [
      ['What is DrawMaps?', 'DrawMaps is a collaborative canvas for drawing and leaving location-based messages directly on a real-world map.'],
      ['How does ink work?', 'Each user can hold up to 100 ink points. Drawing and placing pins consumes ink, which regenerates by 1 point every 18 seconds.'],
      ['Can I use both Web and iOS?', 'Yes. Both clients share your account, canvas, ink balance, and blocked-user list.'],
      ['How do I report inappropriate content?', 'Choose Report from the actions for a pin or drawing and provide a reason. You can also contact the support email.'],
      ['How do I delete my account?', 'Choose Delete Account in the Web user menu or the iOS Profile screen. After confirmation, your account, sessions, avatar, drawings, pins, and other associated data are deleted and cannot be recovered.'],
    ],
  },
  ja: {
    back: 'ホームに戻る', title: 'サポートセンター', subtitle: 'DrawMaps のアカウントと共有キャンバスをサポートします。',
    contact: 'お問い合わせ', contactBody: '技術的な問題、コンテンツの通報、機能のご要望はメールでお送りください。可能な限り早く返信します。',
    faq: 'よくある質問', privacy: 'プライバシーポリシー', privacyBody: '取得するデータ、利用目的、およびデータに関する権利をご確認ください。',
    viewPrivacy: 'プライバシーポリシーを見る →', terms: '利用規約', footer: 'DrawMaps — グローバル共同アートプラットフォーム',
    questions: [
      ['DrawMaps とは？', '現実の地図上に絵や位置付きメッセージを残せる共同キャンバスです。'],
      ['インクの仕組みは？', '最大 100 ポイントのインクを保有できます。描画とピンで消費し、18 秒ごとに 1 ポイント回復します。'],
      ['Web と iOS の両方で使えますか？', 'はい。アカウント、キャンバス、インク残量、ブロックリストが共有されます。'],
      ['不適切なコンテンツを通報するには？', 'ピンまたは描画のアクションから通報し、理由を入力してください。サポートメールでも受け付けます。'],
      ['アカウントを削除するには？', 'Web のユーザーメニューまたは iOS のプロフィールで「アカウントを削除」を選びます。確認後、アカウント、セッション、画像、描画、ピン、関連データは復元不可能な形で削除されます。'],
    ],
  },
} as const;

const FONT = { fontFamily: 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif' };

export default function SupportPage() {
  const { lang } = useI18n();
  const copy = COPY[lang];

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white font-sans">
      <header className="border-b border-white/70 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-violet-600">
            <ArrowLeft className="h-4 w-4" />{copy.back}
          </Link>
          <LanguageSelector compact />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-14 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100"><HelpCircle className="h-8 w-8 text-violet-600" /></div>
          <h1 className="text-4xl font-bold text-gray-900 md:text-5xl" style={FONT}>{copy.title}</h1>
          <p className="mt-3 text-lg text-gray-500">{copy.subtitle}</p>
        </div>

        <section className="mb-12 rounded-3xl border border-white/80 bg-white/70 p-8 shadow-sm backdrop-blur-xl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100"><Mail className="h-6 w-6 text-violet-600" /></div>
            <div><h2 className="text-xl font-bold text-gray-900" style={FONT}>{copy.contact}</h2><p className="mt-1 text-gray-600">{copy.contactBody}</p>
              <a href="mailto:wenjian@wisebamboo.fun" className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"><Mail className="h-4 w-4" />wenjian@wisebamboo.fun</a>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <div className="mb-6 flex items-center gap-3"><MessageCircle className="h-6 w-6 text-violet-500" /><h2 className="text-2xl font-bold text-gray-900" style={FONT}>{copy.faq}</h2></div>
          <div className="space-y-4">{copy.questions.map(([question, answer]) => <details key={question} className="group rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-sm"><summary className="cursor-pointer text-base font-semibold text-gray-900 marker:text-violet-400">{question}</summary><p className="mt-3 text-sm leading-relaxed text-gray-600">{answer}</p></details>)}</div>
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100"><Shield className="h-6 w-6 text-emerald-600" /></div>
            <div><h2 className="text-xl font-bold text-gray-900" style={FONT}>{copy.privacy}</h2><p className="mt-1 text-gray-600">{copy.privacyBody}</p>
              <div className="mt-3 flex flex-wrap gap-4"><Link href={`/legal/privacy?lang=${lang}`} className="text-sm font-medium text-violet-600 underline underline-offset-2">{copy.viewPrivacy}</Link><Link href={`/legal/terms?lang=${lang}`} className="text-sm font-medium text-violet-600 underline underline-offset-2">{copy.terms}</Link></div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-gray-100 bg-gray-50 px-6 py-6 text-center"><p className="text-sm text-gray-400" style={FONT}>© {new Date().getFullYear()} {copy.footer}</p></footer>
    </div>
  );
}
