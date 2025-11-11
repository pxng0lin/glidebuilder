'use client';

import { useMemo } from 'react';
import { useEcho } from '@merit-systems/echo-next-sdk/client';

export function BalanceCard() {
  const { balance, isLoadingBalance: isLoading, balanceError: error } = useEcho();

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
