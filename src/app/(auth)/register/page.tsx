'use client';

import RegisterForm from '@/components/auth/RegisterForm';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-lg">
        <RegisterForm onSwitchToLogin={() => router.push('/login')} />
      </div>
    </div>
  );
}
