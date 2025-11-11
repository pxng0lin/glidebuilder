import { Suspense } from 'react';
import { useEcho } from '@merit-systems/echo-next-sdk/client';

import { ReportUploader } from '@/components/dashboard/report-uploader';

export function Dashboard() {
  const { user } = useEcho();

  if (!user) {
    return null;
  }

  return (
    <div className="section-stack">
      <section className="panel">
        <div className="panel-header">
          <h1>Welcome back, {user.name ?? 'Echo user'}</h1>
          <p className="text-muted">
            Upload vulnerability reports to receive an investigation-ready breakdown plus a
            boilerplate Glider skeleton you can customize for detection.
          </p>
        </div>
      </section>

      <ReportUploader />
    </div>
  );
}
