'use client';

import { useMemo } from 'react';
import { useEcho } from '@merit-systems/echo-next-sdk/client';

type BalanceAwareEchoContext = ReturnType<typeof useEcho> & {
  balance?: {
    credits?: number;
    currency?: string;
  };
  balanceError?: unknown;
  isLoadingBalance?: boolean;
};

export function BalanceCard() {
  const {
    balance,
    balanceError: error,
    isLoadingBalance,
  } = useEcho() as BalanceAwareEchoContext;

  const isLoading = isLoadingBalance ?? false;

  const statusLabel = useMemo(() => {
    if (isLoading) return '⏳ Fetching balance…';
    if (error) return '⚠️ Unavailable';
    return 'Current Balance';
  }, [isLoading, error]);

  const displayValue = useMemo(() => {
    if (isLoading) return '...';
    if (error) return '—';
    return balance?.credits?.toLocaleString() ?? '0';
  }, [isLoading, error, balance]);

  const displayCurrency = useMemo(() => {
    if (isLoading || error) return '';
    return balance?.currency?.toUpperCase() ?? 'CREDITS';
  }, [isLoading, error, balance]);

  return (
    <section className="card-balance">
      <p className="card-balance__status">{statusLabel}</p>
      <div className="card-balance__value">
        <span>{displayValue}</span>
        <span>{displayCurrency}</span>
      </div>
      {error ? (
        <p className="status error" style={{ marginTop: '8px' }}>
          ❌ Balance could not be loaded. Please check your Echo billing configuration.
        </p>
      ) : null}
      {!error && !isLoading && balance && (
        <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
          Available for AI generation requests
        </p>
      )}
    </section>
  );
}
