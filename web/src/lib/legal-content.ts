import type { Lang } from '@/lib/i18n';

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export interface LegalDocumentCopy {
  title: string;
  updated: string;
  summary: string;
  sections: LegalSection[];
}

const contact = 'wenjian@wisebamboo.fun';

export const LEGAL_COPY: Record<'terms' | 'privacy', Record<Lang, LegalDocumentCopy>> = {
  terms: {
    zh: {
      title: '服务条款', updated: '生效日期：2026 年 7 月 19 日', summary: '本条款适用于 DrawMaps Web 网站、iOS 应用及相关服务。创建账号或使用服务即表示你同意本条款。',
      sections: [
        { title: '1. 服务与账号', paragraphs: ['DrawMaps 由 Shenzhen Yuzhu Intelligent Co., Ltd 运营，提供在共享地图上绘画、放置图钉、留言和浏览他人内容的服务。', '你必须年满 13 岁，并为账号资料与凭据安全负责。不得代表他人创建账号或提供虚假信息。'] },
        { title: '2. 用户内容与公开性', paragraphs: ['你保留对自己创作内容的权利。为了运行全球共享画布，你授予我们在服务内存储、复制、渲染、传输和展示该内容的非独家许可，该许可仅限于提供、保护和改进服务。', '绘画、图钉、昵称和留言默认是公开的，可能被世界各地的用户查看。请勿发布个人敏感信息。'] },
        { title: '3. 可接受使用', paragraphs: ['不得发布违法、侵权、威胁、骚扰、仇恨、露骨或泄露他人隐私的内容；不得冒充他人、绕过墨水或限流机制、自动化滥用、攻击服务或干扰他人使用。', '我们可以调查举报，并对违规内容进行限制、隐藏或删除，必要时暂停或终止账号。'] },
        { title: '4. 墨水与可用性', paragraphs: ['墨水是用于公平分配创作能力的服务内配额，不是货币、财产或可兑换价值。我们可为了安全、公平性或产品运行调整其规则。', '服务可能因维护、网络、地图或云服务商故障而中断。我们会采取合理措施恢复，但不保证永不中断或所有内容永久保留。'] },
        { title: '5. 第三方服务', paragraphs: ['地图图块、登录、邮件和基础设施可由第三方提供。你对这些服务的使用也可能受其条款约束。地图信息不应用于紧急救援、导航或其他高风险决策。'] },
        { title: '6. 删除与终止', paragraphs: ['你可在 Web 用户菜单或 iOS 资料页面删除账号。删除后，账号与关联用户内容将从在线服务中永久移除，但安全备份可按常规轮换周期延迟清除。', '对于严重违规、法律要求或保护用户和服务的必要情况，我们可暂停或终止访问。'] },
        { title: '7. 责任与变更', paragraphs: ['在法律允许的最大范围内，服务按现状提供。我们不对间接损失、用户内容、第三方服务或不可控事件承担法律不要求我们承担的责任。', '我们可能更新本条款。重大变更将通过服务或其他合理方式通知。继续使用即表示接受更新后的条款。'] },
        { title: '8. 联系方式', paragraphs: [`条款问题请联系 ${contact}。本条款受运营者所在地适用法律管辖，不影响你依强制性消费者保护法享有的权利。`] },
      ],
    },
    en: {
      title: 'Terms of Service', updated: 'Effective: July 19, 2026', summary: 'These terms apply to the DrawMaps website, iOS app, and related services. By creating an account or using DrawMaps, you agree to them.',
      sections: [
        { title: '1. Service and accounts', paragraphs: ['DrawMaps is operated by Shenzhen Yuzhu Intelligent Co., Ltd and provides a shared map on which users can draw, place pins, leave messages, and view public creations.', 'You must be at least 13 and are responsible for accurate account information and the security of your credentials. Do not create an account for someone else or misrepresent your identity.'] },
        { title: '2. User content and visibility', paragraphs: ['You retain your rights in content you create. To operate the shared canvas, you give us a non-exclusive license to store, copy, render, transmit, and display it only as needed to provide, protect, and improve DrawMaps.', 'Drawings, pins, display names, and messages are public by default and may be viewed worldwide. Do not publish private or sensitive personal information.'] },
        { title: '3. Acceptable use', paragraphs: ['Do not post illegal, infringing, threatening, harassing, hateful, sexually explicit, or privacy-invasive content. Do not impersonate others, bypass ink or rate limits, automate abuse, attack the service, or interfere with other users.', 'We may investigate reports and restrict, hide, or remove violating content. We may suspend or terminate accounts when reasonably necessary.'] },
        { title: '4. Ink and availability', paragraphs: ['Ink is an in-service allowance designed to distribute creative capacity fairly. It is not money, property, or redeemable value. We may adjust its rules for safety, fairness, or operation of the product.', 'Maintenance, networks, map providers, and cloud providers can interrupt the service. We will take reasonable steps to restore it, but do not promise uninterrupted availability or permanent preservation of every item.'] },
        { title: '5. Third-party services', paragraphs: ['Map tiles, authentication, email, and infrastructure may be supplied by third parties and may also be subject to their terms. Do not rely on map information for emergency response, navigation, or other high-risk decisions.'] },
        { title: '6. Deletion and termination', paragraphs: ['You may delete your account from the Web user menu or iOS Profile screen. Your account and associated user content are then permanently removed from the live service, although secure backups may expire later through ordinary rotation.', 'We may suspend or end access for serious violations, legal requirements, or when reasonably necessary to protect users and the service.'] },
        { title: '7. Liability and changes', paragraphs: ['To the maximum extent permitted by law, DrawMaps is provided as is. We are not responsible for indirect losses, user content, third-party services, or events outside our control where the law does not require otherwise.', 'We may update these terms. Material changes will be announced through the service or another reasonable channel. Continued use after the effective date means you accept the updated terms.'] },
        { title: '8. Contact and governing law', paragraphs: [`Questions may be sent to ${contact}. These terms are governed by the law applicable where the operator is established, without limiting mandatory consumer rights that apply to you.`] },
      ],
    },
    ja: {
      title: '利用規約', updated: '2026 年 7 月 19 日施行', summary: '本規約は DrawMaps の Web サイト、iOS アプリおよび関連サービスに適用されます。',
      sections: [
        { title: '1. サービスとアカウント', paragraphs: ['DrawMaps は Shenzhen Yuzhu Intelligent Co., Ltd が運営し、共有地図上での描画、ピン、メッセージ、公開作品の閲覧を提供します。', '利用者は 13 歳以上で、正確な情報と認証情報の管理に責任を負います。'] },
        { title: '2. ユーザーコンテンツ', paragraphs: ['作成者は自分の作品に対する権利を保持します。サービスの提供・保護・改善に必要な範囲で、保存、複製、表示、送信する非独占的な許諾を当社に与えます。', '描画、ピン、表示名、メッセージは原則公開です。個人の機密情報は投稿しないでください。'] },
        { title: '3. 禁止事項', paragraphs: ['違法、権利侵害、脅迫、嫌がらせ、差別、性的に露骨、またはプライバシーを侵害する内容を禁止します。なりすまし、制限回避、自動化された不正利用、攻撃も禁止します。', '通報を調査し、違反コンテンツの制限・非表示・削除、アカウントの停止を行う場合があります。'] },
        { title: '4. インクと可用性', paragraphs: ['インクは創作能力を公平に配分するサービス内の枠で、通貨、財産、換金可能な価値ではありません。', 'メンテナンス、通信網、地図やクラウド事業者により一時停止する場合があります。'] },
        { title: '5. 外部サービス', paragraphs: ['地図、認証、メール、基盤に外部事業者を利用します。地図情報を緊急対応、導航、その他の高リスクな判断に利用しないでください。'] },
        { title: '6. 削除と終了', paragraphs: ['Web または iOS からアカウントを削除できます。アカウントと関連作品は稼働サービスから永久に削除されますが、バックアップは通常の循環で後日消去される場合があります。'] },
        { title: '7. 責任と変更', paragraphs: ['法律の許す最大範囲で現状のまま提供されます。間接損害、ユーザーコンテンツ、外部サービスについて、法律が要求しない責任は負いません。', '重要な規約変更はサービス等で通知します。'] },
        { title: '8. 連絡先', paragraphs: [`ご質問は ${contact} まで。本規約は運営者所在地の適用法に従い、利用者の強行的な消費者権利を制限しません。`] },
      ],
    },
  },
  privacy: {
    zh: {
      title: '隐私政策', updated: '生效日期：2026 年 7 月 19 日', summary: 'Shenzhen Yuzhu Intelligent Co., Ltd 是 DrawMaps 个人信息的处理者。我们仅收集运行共享地图、保护用户和履行法律义务所需的数据。',
      sections: [
        { title: '1. 我们收集的数据', paragraphs: ['账号数据：邮箱、用户名、密码的安全哈希、邮箱验证状态，或「通过 Apple 登录」的标识符与撤销凭据；你主动上传的头像。', '公开创作数据：绘画点与其地图坐标、笔刷外观、图钉坐标、颜色、留言、昵称和时间。', '安全与审核数据：会话标识符、限流计数、屏蔽关系、举报理由和处理记录。服务器可在请求处理、防滥用和安全日志中短期处理 IP 地址、设备/浏览器类型和请求时间。'] },
        { title: '2. 定位与跟踪', paragraphs: ['DrawMaps 不请求 iOS 设备定位权限，也不收集 GPS 定位。当你移动地图、绘画或放置图钉时，我们会保存你主动选择的地图坐标。', '我们不使用广告 SDK，不进行跨应用或跨网站跟踪，不出售个人数据。'] },
        { title: '3. 使用目的与法律基础', paragraphs: ['我们使用数据来创建账号、验证身份、同步作品、维持墨水、展示共享画布、处理举报、防止滥用、提供客服与履行法律义务。', '根据所在地法律，处理可基于履行与你的服务合同、我们保护服务的正当利益、履行法律义务，或你的同意。'] },
        { title: '4. 数据共享与跨境处理', paragraphs: ['我们不出售个人数据。为提供服务，数据可由 Cloudflare（托管、数据库、文件与安全）、Resend（账号邮件）、Apple（Apple 登录）和地图图块提供商处理。', '这些供应商可以在你所在国家之外处理数据。我们会使用合同、技术措施和适用的跨境机制进行保护。法律要求或保护权利与安全时，我们也可能向有权机关披露必要数据。'] },
        { title: '5. 保留与删除', paragraphs: ['账号存续期间，我们保留提供服务所需的账号和公开创作。会话按过期时间清理，验证码、限流与安全记录仅在相应目的所需期间保留。', '你在应用内删除账号后，账号、头像、会话、绘画、图钉、举报与其他关联数据将从在线系统中删除。已进入加密安全备份的副本可在常规轮换周期内保留，且不会恢复到在线服务，除非法律要求。'] },
        { title: '6. 安全、未成年人与权利', paragraphs: ['我们使用 HTTPS、密码哈希、访问控制、限流和供应商安全能力保护数据，但任何系统都无法保证绝对安全。DrawMaps 不面向 13 岁以下儿童。', '依适用法律，你可请求访问、更正、删除、限制或反对处理，以及获取可携带的数据副本。你可在产品内更新部分资料或直接删除账号。'] },
        { title: '7. 联系与变更', paragraphs: [`隐私问题或权利请求请联系 ${contact}。为保护账号，我们可能要求验证身份。`, '我们可能更新本政策，并在页面标明新的生效日期。重大变更将通过服务或其他合理方式通知。'] },
      ],
    },
    en: {
      title: 'Privacy Policy', updated: 'Effective: July 19, 2026', summary: 'Shenzhen Yuzhu Intelligent Co., Ltd is responsible for personal data processed by DrawMaps. We collect only what is needed to operate the shared map, protect users, and meet legal obligations.',
      sections: [
        { title: '1. Data we collect', paragraphs: ['Account data: email, display name, a securely hashed password, verification status, or a Sign in with Apple identifier and revocation credential; plus an avatar you choose to upload.', 'Public creation data: drawing points and map coordinates, brush appearance, pin coordinates, colors, messages, display name, and timestamps.', 'Safety and moderation data: session identifiers, rate-limit counters, block relationships, report reasons, and review records. Servers may briefly process IP address, device or browser type, and request time to handle requests, prevent abuse, and maintain security logs.'] },
        { title: '2. Location and tracking', paragraphs: ['DrawMaps does not request iOS device-location permission and does not collect GPS location. When you move the map, draw, or place a pin, we store the map coordinates you intentionally select.', 'We do not use advertising SDKs, track you across apps or websites, or sell personal data.'] },
        { title: '3. Purposes and legal bases', paragraphs: ['We use data to create accounts, verify identity, sync creations, maintain ink, display the shared canvas, review reports, prevent abuse, provide support, and comply with law.', 'Depending on applicable law, processing is based on performing our service contract with you, our legitimate interest in protecting the service, legal obligations, or your consent.'] },
        { title: '4. Sharing and international processing', paragraphs: ['We do not sell personal data. To provide DrawMaps, data may be processed by Cloudflare for hosting, databases, files, and security; Resend for account email; Apple for Sign in with Apple; and map-tile providers.', 'Providers may process data outside your country. We use contractual, technical, and applicable transfer safeguards. We may disclose necessary data to authorities when legally required or to protect rights and safety.'] },
        { title: '5. Retention and deletion', paragraphs: ['We retain account and public creation data while the account exists. Sessions expire; verification codes, rate limits, and security records are kept only as long as needed for their purpose.', 'When you delete your account in the app, the account, avatar, sessions, drawings, pins, reports, and other associated data are deleted from live systems. Copies already in encrypted security backups may remain until ordinary rotation and will not be restored to the live service unless legally required.'] },
        { title: '6. Security, children, and your rights', paragraphs: ['We use HTTPS, password hashing, access controls, rate limits, and provider security features, but no system can guarantee absolute security. DrawMaps is not directed to children under 13.', 'Depending on your law, you may request access, correction, deletion, restriction, objection, or a portable copy. You can update some profile data or delete the account directly in the product.'] },
        { title: '7. Contact and changes', paragraphs: [`For privacy questions or rights requests, contact ${contact}. We may verify identity to protect the account.`, 'We may update this policy and will show a new effective date. Material changes will be announced through the service or another reasonable channel.'] },
      ],
    },
    ja: {
      title: 'プライバシーポリシー', updated: '2026 年 7 月 19 日施行', summary: 'Shenzhen Yuzhu Intelligent Co., Ltd は DrawMaps で処理される個人データに責任を負います。共有地図の運営、利用者の保護、法的義務に必要なデータのみを取得します。',
      sections: [
        { title: '1. 取得するデータ', paragraphs: ['アカウント：メール、表示名、ハッシュ化されたパスワード、確認状態、または Apple ログイン識別子と取消用認証情報、任意のアバター。', '公開作品：描画点と地図座標、ブラシの外観、ピン座標、色、メッセージ、表示名、時刻。', '安全性と審査：セッション識別子、速度制限、ブロック関係、通報理由、審査記録。要求処理や不正防止のため IP アドレス、端末種別、時刻を短期処理する場合があります。'] },
        { title: '2. 位置情報とトラッキング', paragraphs: ['iOS の端末位置権限を求めず、GPS 位置を取得しません。地図を移動し、描画またはピンを置いた際に、意図的に選択した地図座標を保存します。', '広告 SDK、アプリやサイトを跨ぐ追跡、個人データの販売は行いません。'] },
        { title: '3. 利用目的', paragraphs: ['アカウント作成、本人確認、作品同期、インク管理、キャンバス表示、通報審査、不正防止、サポート、法的義務に利用します。', '処理は、契約の履行、サービス保護の正当な利益、法的義務、または同意に基づきます。'] },
        { title: '4. 共有と国際処理', paragraphs: ['個人データは販売しません。Cloudflare（ホスティング、DB、ファイル、セキュリティ）、Resend（メール）、Apple（Apple ログイン）、地図タイル事業者が処理する場合があります。', 'データは国外で処理される場合があり、契約・技術的対策・適用される移転保護を用います。'] },
        { title: '5. 保持と削除', paragraphs: ['アカウント存続中は必要なアカウントと公開作品を保持します。セッション、確認コード、速度制限、セキュリティ記録は必要期間のみ保持します。', 'アカウント削除後、アカウント、アバター、セッション、描画、ピン、通報、関連データは稼働系から削除されます。暗号化バックアップは通常の循環で後日消去されます。'] },
        { title: '6. セキュリティ、子ども、権利', paragraphs: ['HTTPS、パスワードハッシュ、アクセス制御、速度制限を用いますが、絶対的な安全は保証できません。DrawMaps は 13 歳未満を対象としません。', '適用法により、アクセス、訂正、削除、制限、異議、データポータビリティを請求できます。'] },
        { title: '7. 連絡先と変更', paragraphs: [`プライバシーに関するご質問・権利請求は ${contact} まで。アカウント保護のため本人確認を求める場合があります。`, 'ポリシーを変更する場合は新しい施行日を表示し、重要な変更を合理的な方法で通知します。'] },
      ],
    },
  },
};
