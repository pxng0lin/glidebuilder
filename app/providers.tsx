'use client';

import type { ReactNode } from 'react';
import { EchoProvider } from '@merit-systems/echo-next-sdk/client';

import { echoClientConfig } from '@/lib/echo-client-config';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  if (!echoClientConfig.appId) {
    console.warn('Echo app ID missing; sign-in and billing will fail.');
  }

  return (
    <EchoProvider config={echoClientConfig}>
      {children}
    </EchoProvider>
  );
}
