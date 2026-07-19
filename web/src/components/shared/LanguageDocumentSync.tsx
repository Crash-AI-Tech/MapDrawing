'use client';

import { useEffect } from 'react';
import { hydrateLanguageFromBrowser, useLangStore } from '@/lib/i18n';

export function LanguageDocumentSync() {
  const lang = useLangStore((state) => state.lang);

  useEffect(() => {
    hydrateLanguageFromBrowser();
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en';
  }, [lang]);

  return null;
}
