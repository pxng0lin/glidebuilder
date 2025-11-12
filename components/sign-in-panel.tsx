'use client';

import { useCallback } from 'react';
import { useEcho } from '@merit-systems/echo-next-sdk/client';

type SignInAwareEchoContext = ReturnType<typeof useEcho> & {
  isSigningIn?: boolean;
};

export function SignInPanel() {
  const { signIn, isSigningIn } = useEcho() as SignInAwareEchoContext;

  const handleSignIn = useCallback(async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('Echo sign-in failed', error);
    }
  }, [signIn]);

  return (
    <section className="panel" style={{ textAlign: 'center', gap: '24px', maxWidth: '500px', margin: '0 auto' }}>
      <div className="section-stack" style={{ alignItems: 'center', gap: '16px' }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔐</div>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Welcome to GlideBuilder</h2>
        <p className="text-muted" style={{ textAlign: 'center', lineHeight: '1.6' }}>
          Sign in with Echo to unlock AI-powered vulnerability detection script generation.
          Transform security reports into production-ready Glider queries instantly.
        </p>
      </div>
      <button type="button" onClick={handleSignIn} className="button" disabled={isSigningIn} style={{ width: '100%', fontSize: '1rem' }}>
        {isSigningIn ? '⏳ Signing in…' : '🚀 Sign in with Echo'}
      </button>
    </section>
  );
}
