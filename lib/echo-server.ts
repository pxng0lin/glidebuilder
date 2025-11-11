import { cookies } from 'next/headers';

import type { EchoSession } from '@/types/echo';

/**
 * Server-side helper that would normally exchange Echo tokens for a session.
 * Replace the stubbed values with secure verification logic once Echo backend
 * integration is available. See Echo documentation for the appropriate APIs.
 */
export async function getEchoSession(): Promise<EchoSession | null> {
  const echoToken = cookies().get('echo_token')?.value;

  if (!echoToken) {
    return null;
  }

  // TODO: Call Echo session verification API with the cookie token and return
  // the hydrated session payload. For now we return mocked data for wiring.
  return {
    user: {
      id: 'mock-user-id',
      name: 'Echo Developer',
      email: 'developer@example.com',
      isOnboarded: true,
    },
    balance: {
      credits: 42,
      currency: 'credits',
      lastUpdatedIso: new Date().toISOString(),
    },
    token: echoToken,
  };
}
