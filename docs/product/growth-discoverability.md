# DrawMaps 搜索与 AI 可发现性

## 已实现

- `/robots.txt` 允许公开产品、支持和法律页面，禁止抓取 API、画布、登录和用户分享页。
- `/sitemap.xml` 列出英文、简体中文和日文产品页面，并提供 `hreflang` 对应关系。
- 每个公开产品页面都有独立 canonical、描述、Open Graph 和 Twitter 元数据。
- 全站提供 `Organization`、`WebSite`、`SoftwareApplication` 结构化数据，FAQ 页面提供 `FAQPage`。
- `/llms.txt` 与 `/llms-full.txt` 提供可供搜索代理和 LLM 抓取的产品事实、权威链接与使用边界。
- 用户生成内容默认不进入搜索索引；在建立明确的公开授权和审核机制前，不开放 UGC 批量索引。

## 发布后配置

1. 在 Google Search Console 添加 `https://map.wisebamboo.fun`，取得验证值并设置 `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`。
2. 在 Bing Webmaster Tools 添加同一站点，取得验证值并设置 `NEXT_PUBLIC_BING_SITE_VERIFICATION`。
3. 两个平台都提交 `https://map.wisebamboo.fun/sitemap.xml`。
4. 每次修改产品规则、隐私、安全或公司事实时，同步更新 `web/src/lib/public-content.ts`、`web/public/llms.txt` 与 `web/public/llms-full.txt`。

验证值不属于密钥，可以提交到部署配置；但当前仓库仅保留变量名，避免提交尚未确认的占位值。

## 每月观察指标

- 搜索曝光、自然点击、品牌词与非品牌词占比。
- `/en`、`/zh-cn`、`/ja` 及 FAQ/场景页的收录与点击。
- Bing AI Performance 中的引用次数、被引用页面和 grounding queries。
- 来自 ChatGPT、Perplexity、Copilot、Gemini 等域名的引荐访问。
- 公开资料页到 `/canvas` 的进入率，以及登录/注册完成率。

## 内容原则

- 先直接回答问题，再补充解释；关键数字必须与代码和产品实际一致。
- 只陈述可核验能力，不写虚假评价、虚构用户规模或“保证被 AI 推荐”等承诺。
- 不批量生成薄内容城市页。未来只有在某个地点具备真实、经授权且经过治理的内容时，才建立地点落地页。
- 公开用户内容不得被视为运营方认可的事实；导航、紧急救援和高风险决策必须明确排除。
