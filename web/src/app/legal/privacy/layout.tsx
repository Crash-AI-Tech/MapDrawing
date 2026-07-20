import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How DrawMaps handles account data, public creations, map coordinates, safety records, data rights, and account deletion.',
  alternates: { canonical: '/legal/privacy' },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
