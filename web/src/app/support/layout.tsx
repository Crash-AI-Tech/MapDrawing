import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support Center',
  description: 'DrawMaps support, account help, frequently asked questions, privacy, and content reporting information.',
  alternates: { canonical: '/support' },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
