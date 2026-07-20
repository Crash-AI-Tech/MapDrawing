import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing the DrawMaps website, iOS app, shared canvas, accounts, and user content.',
  alternates: { canonical: '/legal/terms' },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
