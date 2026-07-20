import type { Metadata } from 'next';

export const SITE_URL = 'https://map.wisebamboo.fun';
export const PUBLIC_LOCALES = ['en', 'zh-cn', 'ja'] as const;
export const PUBLIC_SLUGS = ['how-it-works', 'use-cases', 'faq', 'safety', 'press'] as const;

export type PublicLocale = (typeof PUBLIC_LOCALES)[number];
export type PublicSlug = (typeof PUBLIC_SLUGS)[number];

type Section = {
  heading: string;
  body: string;
  bullets?: readonly string[];
};

type Faq = {
  question: string;
  answer: string;
};

export type PublicPage = {
  eyebrow: string;
  title: string;
  description: string;
  summary: string;
  sections: readonly Section[];
  faqs?: readonly Faq[];
};

type LocaleCopy = {
  languageTag: string;
  languageName: string;
  nav: Record<'overview' | PublicSlug, string>;
  openCanvas: string;
  resources: string;
  operatedBy: string;
  pages: Record<'overview' | PublicSlug, PublicPage>;
};

const sharedFacts = {
  en: [
    'Drawings are attached to map coordinates and loaded in geographic tiles.',
    'Drawing starts at zoom level 18; high-precision pins start at zoom level 20.',
    'Ink is capped at 100 points and regenerates by 1 point every 18 seconds.',
    'Web and iOS clients use the same account, canvas, ink balance, and safety controls.',
  ],
  'zh-cn': [
    '笔画绑定真实地图坐标，并按地理瓦片加载。',
    '缩放至 18 级可绘画，缩放至 20 级可放置高精度图钉。',
    '墨水上限为 100 点，每 18 秒恢复 1 点。',
    'Web 与 iOS 共享账号、画布、墨水和安全控制。',
  ],
  ja: [
    '描画は地図座標に結び付けられ、地理タイル単位で読み込まれます。',
    'ズーム 18 以上で描画、20 以上で高精度ピンを配置できます。',
    'インク上限は 100、18 秒ごとに 1 回復します。',
    'Web と iOS はアカウント、キャンバス、インク、安全機能を共有します。',
  ],
} as const;

export const PUBLIC_CONTENT: Record<PublicLocale, LocaleCopy> = {
  en: {
    languageTag: 'en',
    languageName: 'English',
    nav: { overview: 'Overview', 'how-it-works': 'How it works', 'use-cases': 'Use cases', faq: 'FAQ', safety: 'Safety', press: 'Press kit' },
    openCanvas: 'Open the canvas',
    resources: 'Product resources',
    operatedBy: 'DrawMaps is operated by Shenzhen Yuzhu Intelligent Co., Ltd.',
    pages: {
      overview: {
        eyebrow: 'One map. One shared canvas.',
        title: 'Draw together on the real-world map',
        description: 'DrawMaps is a collaborative map canvas for geographic drawing and location-based messages on Web and iOS.',
        summary: 'DrawMaps turns the real-world map into a shared public canvas. Choose a place, zoom in, draw with a pencil or leave a short pin message, and discover what other people created there.',
        sections: [
          { heading: 'What DrawMaps is', body: 'A location-based creative community, not a navigation service. Every drawing and pin belongs to a chosen map coordinate, so a place can collect visual stories over time.' },
          { heading: 'Verified product facts', body: 'These are current product rules that users, search engines, and assistants can cite.', bullets: sharedFacts.en },
          { heading: 'Who it is for', body: 'DrawMaps is designed for travelers, local communities, map lovers, illustrators, students, and anyone who wants to leave a lightweight creative mark on a meaningful place.' },
        ],
      },
      'how-it-works': {
        eyebrow: 'Product guide',
        title: 'How DrawMaps works',
        description: 'Learn how to explore the map, draw at real coordinates, place pins, use ink, and sync between Web and iOS.',
        summary: 'Move to any place on the map, zoom in, choose a tool, and create. DrawMaps stores drawings in geographic tiles so the client only requests content near the current view.',
        sections: [
          { heading: '1. Find a place', body: 'Pan and zoom to a street, landmark, neighborhood, or other location that matters to you. DrawMaps does not need your device GPS location; you choose the coordinates by moving the map.' },
          { heading: '2. Draw or leave a pin', body: 'At zoom level 18 or above, use the pencil and eraser. At zoom level 20 or above, place a colored pin with a short message.' },
          { heading: '3. Use ink fairly', body: 'Drawing and pins consume ink. The balance is capped at 100 and restores one point every 18 seconds. Larger strokes and broader map coverage cost more.' },
          { heading: '4. Continue across devices', body: 'Authenticated Web and iOS clients share the same account and global canvas. Offline drawing operations are queued locally and sent after connectivity returns.' },
        ],
      },
      'use-cases': {
        eyebrow: 'Ideas for places',
        title: 'Ways to use a collaborative map canvas',
        description: 'Explore practical and creative ways to use DrawMaps for travel memories, local art, place-based stories, and shared map activities.',
        summary: 'DrawMaps works best when the creation has a real connection to a place. It can be a tiny sketch, a short memory, a local welcome, or a collaborative visual layer.',
        sections: [
          { heading: 'Travel memories', body: 'Sketch a moment near the place where it happened or leave a short pin for future visitors. Avoid publishing private itineraries or sensitive personal details.' },
          { heading: 'Neighborhood creativity', body: 'Create small pieces around familiar streets, parks, campuses, and public landmarks, then invite others to add their own visual response.' },
          { heading: 'Place-based learning', body: 'Teachers and learners can use a shared map to explore geography, local culture, visual storytelling, and how scale changes the way we represent space.' },
          { heading: 'Remote collaboration', body: 'Friends in different regions can draw on one global canvas from Web or iOS and explore each other’s locations without sharing live GPS data.' },
        ],
      },
      faq: {
        eyebrow: 'Direct answers',
        title: 'DrawMaps frequently asked questions',
        description: 'Answers about DrawMaps drawing, map pins, ink, accounts, privacy, moderation, Web, and iOS.',
        summary: 'Short, factual answers to the questions people and AI assistants most often ask about DrawMaps.',
        sections: [],
        faqs: [
          { question: 'What is DrawMaps?', answer: 'DrawMaps is a collaborative public canvas built on a real-world map. People can draw at selected coordinates and leave short location-based pin messages.' },
          { question: 'Is DrawMaps a navigation app?', answer: 'No. It is a creative map canvas and must not be used for emergency response, turn-by-turn navigation, or other high-risk decisions.' },
          { question: 'Does DrawMaps track my GPS location?', answer: 'No. The iOS app does not request device-location permission. DrawMaps stores map coordinates that you intentionally select when moving the map, drawing, or placing a pin.' },
          { question: 'When can I draw or place a pin?', answer: 'Drawing is available from zoom level 18. High-precision pins are available from zoom level 20.' },
          { question: 'How does ink work?', answer: 'Ink is an in-product fairness allowance. It is capped at 100 points, regenerates by 1 every 18 seconds, and costs more for larger strokes or broader map coverage.' },
          { question: 'Do Web and iOS share the same content?', answer: 'Yes. Authenticated Web and iOS clients use the same account, global canvas, ink balance, and blocked-user list.' },
          { question: 'Can I report or block content?', answer: 'Yes. DrawMaps provides reporting and user blocking. Reports can be reviewed and content or accounts may be restricted when rules are violated.' },
          { question: 'Can I delete my account?', answer: 'Yes. Account deletion is available in the Web account menu and the iOS profile. Associated live account data and user content are removed after confirmation, subject to ordinary backup rotation described in the privacy policy.' },
        ],
      },
      safety: {
        eyebrow: 'Community and privacy',
        title: 'DrawMaps safety and content principles',
        description: 'Understand public content, reporting, blocking, account deletion, location privacy, and acceptable use on DrawMaps.',
        summary: 'Drawings, pins, display names, and pin messages are public by default. Do not publish personal, confidential, illegal, hateful, threatening, infringing, or sexually explicit content.',
        sections: [
          { heading: 'Public by design', body: 'The shared canvas can be seen by people around the world. Treat every drawing, display name, pin, and message as public and do not post sensitive personal information.' },
          { heading: 'Location without GPS tracking', body: 'DrawMaps does not request iOS device-location permission. Coordinates come from the place you intentionally select on the map, not a background location feed.' },
          { heading: 'User controls', body: 'Users can report inappropriate pins or drawings, block users, and delete their own account. Support requests can be sent to wenjian@wisebamboo.fun.' },
          { heading: 'Moderation', body: 'Reports may be investigated. Violating content can be hidden or removed, and accounts can be restricted or terminated when reasonably necessary to protect people and the service.' },
        ],
      },
      press: {
        eyebrow: 'Company facts',
        title: 'DrawMaps press and product facts',
        description: 'Verified company, product, platform, contact, and brand facts for journalists, creators, search engines, and AI assistants.',
        summary: 'DrawMaps is a collaborative map drawing product operated by Shenzhen Yuzhu Intelligent Co., Ltd. It combines geographic drawing, location-based messages, and a shared Web and iOS canvas.',
        sections: [
          { heading: 'Product', body: 'Name: DrawMaps. Category: collaborative map canvas and location-based creative community. Primary website: map.wisebamboo.fun.' },
          { heading: 'Operator', body: 'Shenzhen Yuzhu Intelligent Co., Ltd. (深圳市玉竹智能有限公司). Contact person: Wen Jian.' },
          { heading: 'Core capabilities', body: 'Coordinate-based pencil drawing and erasing, colored location pins with short messages, geographic tile loading, fair-use ink, account sync, reporting, blocking, and account deletion.' },
          { heading: 'Contact and assets', body: 'Product, press, privacy, and support questions: wenjian@wisebamboo.fun. The logo and current product illustration on this website may be referenced when accurately describing DrawMaps.' },
        ],
      },
    },
  },
  'zh-cn': {
    languageTag: 'zh-CN',
    languageName: '简体中文',
    nav: { overview: '产品简介', 'how-it-works': '使用方法', 'use-cases': '使用场景', faq: '常见问题', safety: '安全与隐私', press: '媒体资料' },
    openCanvas: '打开全球画布',
    resources: '产品资料',
    operatedBy: 'DrawMaps 由深圳市玉竹智能有限公司运营。',
    pages: {
      overview: {
        eyebrow: '一张地图，一块共享画布',
        title: '在真实世界地图上共同创作',
        description: 'DrawMaps 是一个支持 Web 与 iOS 的协作地图画布，可在真实坐标绘画并留下定位留言。',
        summary: 'DrawMaps 把真实世界地图变成所有人共享的公共画布。找到一个地点，放大地图，用铅笔绘画或留下简短图钉留言，也可以发现其他人在这里创作的内容。',
        sections: [
          { heading: 'DrawMaps 是什么', body: '它是基于地点的创作社区，不是导航服务。每一笔绘画和每个图钉都绑定到用户主动选择的地图坐标，让地点逐渐积累视觉故事。' },
          { heading: '已验证的产品事实', body: '以下是用户、搜索引擎和智能助手可以准确引用的当前规则。', bullets: sharedFacts['zh-cn'] },
          { heading: '适合谁', body: 'DrawMaps 适合旅行者、本地社区、地图爱好者、插画创作者、学生，以及想在有意义的地点留下轻量创作的人。' },
        ],
      },
      'how-it-works': {
        eyebrow: '产品指南',
        title: 'DrawMaps 如何使用',
        description: '了解如何探索地图、在真实坐标绘画、放置图钉、使用墨水，并在 Web 与 iOS 之间同步。',
        summary: '移动到地图上的任意地点，放大后选择工具即可创作。DrawMaps 按地理瓦片存储和加载笔画，客户端只请求当前视野附近的内容。',
        sections: [
          { heading: '1. 找到地点', body: '平移和缩放地图，找到对你有意义的街道、地标、社区或其他地点。DrawMaps 不需要设备 GPS 定位，你通过移动地图主动选择坐标。' },
          { heading: '2. 绘画或留言', body: '缩放至 18 级或以上，可以使用铅笔和橡皮擦；缩放至 20 级或以上，可以放置带有简短留言的彩色图钉。' },
          { heading: '3. 公平使用墨水', body: '绘画和放置图钉会消耗墨水。墨水上限为 100 点，每 18 秒恢复 1 点；笔画越大、覆盖范围越广，消耗越高。' },
          { heading: '4. 跨设备继续', body: '登录后的 Web 与 iOS 客户端共享同一账号和全球画布。离线绘画操作会在本地排队，网络恢复后再同步。' },
        ],
      },
      'use-cases': {
        eyebrow: '地点创作灵感',
        title: '协作地图画布可以怎样使用',
        description: '探索 DrawMaps 在旅行记忆、本地艺术、地点故事和共享地图活动中的创意用途。',
        summary: '当创作和真实地点有关时，DrawMaps 最有意义：可以是一幅小画、一段简短回忆、一句本地问候，或大家共同完成的视觉图层。',
        sections: [
          { heading: '旅行记忆', body: '在故事发生的地点附近画下瞬间，或给后来者留一枚简短图钉。请勿公开私人行程或敏感个人信息。' },
          { heading: '社区共创', body: '在熟悉的街道、公园、校园和公共地标附近进行小型创作，再邀请其他人用画笔回应。' },
          { heading: '地点学习', body: '师生可以通过共享地图探索地理、本地文化、视觉叙事，以及比例尺如何改变我们表达空间的方式。' },
          { heading: '远程协作', body: '身处不同地区的朋友可以通过 Web 或 iOS 在同一张全球画布创作和探索彼此的地点，无需共享实时 GPS。' },
        ],
      },
      faq: {
        eyebrow: '直接回答',
        title: 'DrawMaps 常见问题',
        description: '关于 DrawMaps 绘画、地图图钉、墨水、账号、隐私、内容治理、Web 和 iOS 的准确回答。',
        summary: '针对用户和智能助手最常询问的 DrawMaps 问题，提供简短、明确、可引用的答案。',
        sections: [],
        faqs: [
          { question: 'DrawMaps 是什么？', answer: 'DrawMaps 是建立在真实世界地图上的公共协作画布。用户可以在主动选择的坐标绘画，并留下简短的定位图钉留言。' },
          { question: 'DrawMaps 是导航应用吗？', answer: '不是。它是创作型地图画布，不应用于紧急救援、路线导航或其他高风险决策。' },
          { question: 'DrawMaps 会追踪我的 GPS 位置吗？', answer: '不会。iOS 应用不请求设备定位权限。DrawMaps 只保存你移动地图、绘画或放置图钉时主动选择的地图坐标。' },
          { question: '什么时候可以绘画和放置图钉？', answer: '缩放至 18 级可以绘画；缩放至 20 级可以放置高精度图钉。' },
          { question: '墨水如何工作？', answer: '墨水是用于公平分配创作能力的产品内额度。上限为 100 点，每 18 秒恢复 1 点；笔画越大或覆盖越广，消耗越高。' },
          { question: 'Web 与 iOS 内容互通吗？', answer: '是。登录后的 Web 与 iOS 客户端共享账号、全球画布、墨水余额和屏蔽列表。' },
          { question: '可以举报或屏蔽内容吗？', answer: '可以。DrawMaps 支持举报和用户屏蔽。举报可被审核，违反规则的内容或账号可能受到限制。' },
          { question: '可以删除账号吗？', answer: '可以。Web 账号菜单和 iOS 资料页均提供账号删除。确认后会删除在线账号数据和关联用户内容；安全备份按隐私政策说明的常规周期轮换。' },
        ],
      },
      safety: {
        eyebrow: '社区与隐私',
        title: 'DrawMaps 安全与内容原则',
        description: '了解 DrawMaps 的公开内容、举报、屏蔽、账号删除、位置隐私与可接受使用规则。',
        summary: '绘画、图钉、昵称和图钉留言默认公开。请勿发布个人敏感、机密、违法、仇恨、威胁、侵权或色情露骨内容。',
        sections: [
          { heading: '公开画布', body: '共享画布可能被世界各地的人看到。请把每一笔绘画、昵称、图钉和留言都视为公开信息，不要发布个人敏感信息。' },
          { heading: '不追踪 GPS 的地点创作', body: 'DrawMaps 不请求 iOS 设备定位权限。坐标来自你在地图上主动选择的地点，不来自后台定位信息流。' },
          { heading: '用户控制', body: '用户可以举报不当图钉或绘画、屏蔽用户并删除自己的账号。支持请求可发送至 wenjian@wisebamboo.fun。' },
          { heading: '内容治理', body: '我们可能调查举报。违规内容可被隐藏或删除；在保护用户和服务确有必要时，账号可能受到限制或终止。' },
        ],
      },
      press: {
        eyebrow: '公司事实',
        title: 'DrawMaps 媒体与产品资料',
        description: '供媒体、创作者、搜索引擎和智能助手引用的公司、产品、平台、联系方式与品牌事实。',
        summary: 'DrawMaps 是由深圳市玉竹智能有限公司运营的协作地图绘画产品，融合地理坐标绘画、定位留言以及 Web 与 iOS 共享画布。',
        sections: [
          { heading: '产品', body: '名称：DrawMaps。类别：协作地图画布与地点创作社区。主网站：map.wisebamboo.fun。' },
          { heading: '运营主体', body: '深圳市玉竹智能有限公司（Shenzhen Yuzhu Intelligent Co., Ltd.）。联系人：温建。' },
          { heading: '核心能力', body: '基于坐标的铅笔绘画与擦除、带短留言的彩色地点图钉、地理瓦片加载、公平墨水系统、账号同步、举报、屏蔽和账号删除。' },
          { heading: '联系与素材', body: '产品、媒体、隐私和支持问题：wenjian@wisebamboo.fun。准确介绍 DrawMaps 时，可引用本网站的品牌标志和当前产品插图。' },
        ],
      },
    },
  },
  ja: {
    languageTag: 'ja',
    languageName: '日本語',
    nav: { overview: '概要', 'how-it-works': '使い方', 'use-cases': '活用例', faq: 'よくある質問', safety: '安全とプライバシー', press: 'プレス資料' },
    openCanvas: 'キャンバスを開く',
    resources: '製品資料',
    operatedBy: 'DrawMaps は Shenzhen Yuzhu Intelligent Co., Ltd. が運営しています。',
    pages: {
      overview: {
        eyebrow: '一つの地図、一つの共有キャンバス',
        title: 'リアルワールドの地図で共同制作',
        description: 'DrawMaps は Web と iOS に対応し、実際の座標に描画や位置付きメッセージを残せる共同地図キャンバスです。',
        summary: 'DrawMaps は現実世界の地図を公開共有キャンバスに変えます。場所を選んで拡大し、鉛筆で描くか短いピンメッセージを残し、その場所で他の人が作ったものを発見できます。',
        sections: [
          { heading: 'DrawMaps とは', body: 'ナビゲーションではなく、場所を軸にした創作コミュニティです。描画とピンは選択した地図座標に結び付き、場所に視覚的な物語が積み重なります。' },
          { heading: '確認済みの製品情報', body: '利用者、検索エンジン、AI アシスタントが正確に参照できる現在のルールです。', bullets: sharedFacts.ja },
          { heading: '対象となる人', body: '旅行者、地域コミュニティ、地図好き、イラスト制作者、学生、意味のある場所に小さな作品を残したい人向けです。' },
        ],
      },
      'how-it-works': {
        eyebrow: '製品ガイド',
        title: 'DrawMaps の使い方',
        description: '地図の探索、実座標での描画、ピン、インク、Web と iOS の同期について説明します。',
        summary: '地図上の場所へ移動し、拡大してツールを選ぶと制作できます。描画は地理タイル単位で保存・取得され、現在の表示範囲付近だけを読み込みます。',
        sections: [
          { heading: '1. 場所を見つける', body: '通り、ランドマーク、地域などをパンとズームで選びます。端末 GPS は不要で、地図を動かして座標を自分で選択します。' },
          { heading: '2. 描画またはピン', body: 'ズーム 18 以上で鉛筆と消しゴムを使用でき、20 以上で短いメッセージ付きの色付きピンを配置できます。' },
          { heading: '3. インクを公平に使う', body: '描画とピンはインクを消費します。上限は 100、18 秒ごとに 1 回復し、太い線や広い範囲ほど消費が増えます。' },
          { heading: '4. デバイス間で続ける', body: 'ログインした Web と iOS は同じアカウントとグローバルキャンバスを共有します。オフライン操作はローカルに待機し、接続回復後に送信されます。' },
        ],
      },
      'use-cases': {
        eyebrow: '場所のアイデア',
        title: '共同地図キャンバスの活用例',
        description: '旅行の記憶、地域アート、場所の物語、共有地図活動での DrawMaps 活用例です。',
        summary: '実際の場所と作品につながりがあると DrawMaps は最も魅力的です。小さな絵、短い記憶、地域の挨拶、共同の視覚レイヤーを残せます。',
        sections: [
          { heading: '旅の記憶', body: '出来事があった場所の近くに瞬間を描いたり、将来の訪問者へ短いピンを残せます。個人の旅程や機密情報は公開しないでください。' },
          { heading: '地域の共同制作', body: '身近な通り、公園、学校、公共ランドマークの周辺に小さな作品を作り、他の人の視覚的な返答を招けます。' },
          { heading: '場所を使った学習', body: '地理、地域文化、視覚的な物語、縮尺による空間表現の違いを共有地図で学べます。' },
          { heading: '遠隔コラボレーション', body: '異なる地域の友人が Web または iOS から同じキャンバスで制作し、リアルタイム GPS を共有せずに互いの場所を探索できます。' },
        ],
      },
      faq: {
        eyebrow: '明確な回答',
        title: 'DrawMaps よくある質問',
        description: 'DrawMaps の描画、ピン、インク、アカウント、プライバシー、モデレーション、Web、iOS に関する回答です。',
        summary: '利用者と AI アシスタントからよく聞かれる DrawMaps の質問に、短く正確に回答します。',
        sections: [],
        faqs: [
          { question: 'DrawMaps とは何ですか？', answer: '実世界の地図上に構築された公開共同キャンバスです。選択した座標に描画し、短い位置付きピンメッセージを残せます。' },
          { question: 'ナビゲーションアプリですか？', answer: 'いいえ。創作用の地図キャンバスであり、緊急対応、経路案内、その他の高リスク判断には使用できません。' },
          { question: 'GPS 位置を追跡しますか？', answer: 'いいえ。iOS では端末位置権限を要求しません。地図を移動、描画、ピン配置したときに意図的に選択した座標のみを保存します。' },
          { question: 'いつ描画やピン配置ができますか？', answer: 'ズーム 18 から描画でき、ズーム 20 から高精度ピンを配置できます。' },
          { question: 'インクの仕組みは？', answer: '公平性のための製品内枠です。上限は 100、18 秒ごとに 1 回復し、太い線や広い範囲ほど消費が増えます。' },
          { question: 'Web と iOS は同じ内容ですか？', answer: 'はい。ログインしたクライアントはアカウント、グローバルキャンバス、インク残量、ブロックリストを共有します。' },
          { question: '通報やブロックはできますか？', answer: 'はい。通報とユーザーブロックがあり、違反したコンテンツやアカウントは審査後に制限される場合があります。' },
          { question: 'アカウントを削除できますか？', answer: 'はい。Web のアカウントメニューと iOS のプロフィールから削除できます。確認後、稼働中のアカウントデータと関連作品が削除されます。' },
        ],
      },
      safety: {
        eyebrow: 'コミュニティとプライバシー',
        title: 'DrawMaps の安全とコンテンツ原則',
        description: '公開コンテンツ、通報、ブロック、アカウント削除、位置プライバシー、利用ルールを説明します。',
        summary: '描画、ピン、表示名、メッセージは原則公開です。個人情報、機密情報、違法、差別、脅迫、権利侵害、性的に露骨な内容は投稿しないでください。',
        sections: [
          { heading: '公開を前提とした設計', body: '共有キャンバスは世界中から見られます。描画、表示名、ピン、メッセージは公開情報として扱い、機密性の高い個人情報を投稿しないでください。' },
          { heading: 'GPS 追跡なしの場所表現', body: 'iOS の端末位置権限は要求しません。座標はバックグラウンド位置情報ではなく、地図上で自分が選んだ場所から得られます。' },
          { heading: '利用者の管理機能', body: '不適切な描画やピンの通報、ユーザーのブロック、自分のアカウント削除ができます。サポートは wenjian@wisebamboo.fun です。' },
          { heading: 'モデレーション', body: '通報を調査し、違反コンテンツを非表示または削除する場合があります。利用者とサービスを守るため必要な場合、アカウントを制限できます。' },
        ],
      },
      press: {
        eyebrow: '会社・製品情報',
        title: 'DrawMaps プレス・製品資料',
        description: '報道、制作者、検索エンジン、AI アシスタント向けの確認済み会社・製品・連絡先情報です。',
        summary: 'DrawMaps は Shenzhen Yuzhu Intelligent Co., Ltd. が運営する共同地図描画製品で、座標描画、位置付きメッセージ、Web と iOS の共有キャンバスを提供します。',
        sections: [
          { heading: '製品', body: '名称：DrawMaps。分類：共同地図キャンバス、場所を軸にした創作コミュニティ。公式サイト：map.wisebamboo.fun。' },
          { heading: '運営者', body: 'Shenzhen Yuzhu Intelligent Co., Ltd.（深圳市玉竹智能有限公司）。担当者：温建（Wen Jian）。' },
          { heading: '主な機能', body: '座標ベースの鉛筆と消しゴム、短いメッセージ付き色ピン、地理タイル読み込み、公平なインク、同期、通報、ブロック、アカウント削除。' },
          { heading: '連絡先と素材', body: '製品、報道、プライバシー、サポート：wenjian@wisebamboo.fun。正確な紹介には本サイトのロゴと現在の製品画像を参照できます。' },
        ],
      },
    },
  },
};

export function isPublicLocale(value: string): value is PublicLocale {
  return PUBLIC_LOCALES.includes(value as PublicLocale);
}

export function isPublicSlug(value: string): value is PublicSlug {
  return PUBLIC_SLUGS.includes(value as PublicSlug);
}

export function publicPath(locale: PublicLocale, slug: 'overview' | PublicSlug): string {
  return slug === 'overview' ? `/${locale}` : `/${locale}/${slug}`;
}

export function getPublicMetadata(locale: PublicLocale, slug: 'overview' | PublicSlug): Metadata {
  const page = PUBLIC_CONTENT[locale].pages[slug];
  const path = publicPath(locale, slug);
  const languages = Object.fromEntries(PUBLIC_LOCALES.map((candidate) => [PUBLIC_CONTENT[candidate].languageTag, publicPath(candidate, slug)]));

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: path, languages: { ...languages, 'x-default': publicPath('en', slug) } },
    openGraph: {
      title: page.title,
      description: page.description,
      type: 'website',
      url: path,
      locale: PUBLIC_CONTENT[locale].languageTag.replace('-', '_'),
      images: [{ url: '/hero-illustration.png', width: 600, height: 600, alt: 'DrawMaps collaborative map canvas' }],
    },
    twitter: { card: 'summary_large_image', title: page.title, description: page.description, images: ['/hero-illustration.png'] },
  };
}
