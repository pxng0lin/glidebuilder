'use client';

import Link from 'next/link';

import { useEcho } from '@merit-systems/echo-next-sdk/client';

import { Dashboard } from '@/components/dashboard';
import { SignInPanel } from '@/components/sign-in-panel';

export default function HomePage() {
  const { user } = useEcho();

  if (!user) {
    return (
      <section className="section-stack" style={{ alignItems: 'center' }}>
        <SignInPanel />
        <p className="text-muted">
          Need an Echo sandbox account?{' '}
          <Link href="https://echo.merit.systems" target="_blank" rel="noreferrer" className="link">
            Request access
          </Link>
        </p>
      </section>
    );
  }

  return <Dashboard />;
}
