'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { MixerAnimation } from '@/components/dashboard/mixer-animation';

export function ReportUploader() {
  const [markdown, setMarkdown] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>(
    'idle'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [documentText, setDocumentText] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string>('vulnerability-breakdown.md');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  useEffect(() => {
    if (copyStatus === 'idle') {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCopyStatus('idle');
    }, 2400);

    return () => window.clearTimeout(timeout);
  }, [copyStatus]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setErrorMessage(null);
    setDocumentText(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markdown, source: source || undefined }),
      });

      if (!response.ok) {
        // Try to parse error message from response
        const errorData = await response.json().catch(() => ({ error: 'Generation failed' }));
        throw new Error(errorData.error || 'Generation failed');
      }

      const { document: generatedDocument, fileName } = (await response.json()) as {
        document: string;
        fileName?: string;
      };

      setDocumentText(generatedDocument);
      setDownloadName(fileName || 'vulnerability-breakdown.md');

      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
      setErrorMessage((err as Error).message || 'An unexpected error occurred. Please try again.');
    }
  }

  const downloadReady = useMemo(() => Boolean(documentText && status === 'success'), [documentText, status]);

  function handleDownload() {
    if (!documentText) {
      return;
    }

    const blob = new Blob([documentText], { type: 'text/markdown;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    if (!documentText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(documentText);
      setCopyStatus('copied');
    } catch (err) {
      console.warn('Failed to copy breakdown:', err);
      setCopyStatus('error');
    }
  }

  return (
    <section className="panel">
      <form className="section-stack mixer-form" onSubmit={handleSubmit}>
        <header className="panel-header">
          <h2>🧭 Vulnerability Breakdown Builder</h2>
          <p className="text-muted">
            Toss in the spiciest bug lore and watch the glider crew storyboard it into evidence, signals, and plug-and-play detection code—no turbulence, just takeoff-ready intel.
          </p>
        </header>

        <div className="mixer-stage">
          <MixerAnimation key={status === 'loading' ? 'running' : 'stopped'} isRunning={status === 'loading'} />
          <div className="mixer-caption">
            {status === 'loading' ? (
              <p>
                The glider bay is spinning up telemetry—give the crew a moment while they weave the breakdown from the incoming signals.
              </p>
            ) : (
              <p>
                Gliders don&apos;t flap—they gossip. Hand over the report so they can glide in circles and spill the juiciest vulnerability secrets.
              </p>
            )}
          </div>
        </div>

        <div className="mixer-controls">
          <div className="mixer-control">
            <label htmlFor="source-input" className="input-label">
              Source (optional)
              <span className="text-muted"> - e.g., &ldquo;Sherlock Contest #123&rdquo; or &ldquo;GitHub Issue #456&rdquo;</span>
            </label>
            <input
              id="source-input"
              type="text"
              className="input-text"
              placeholder="Sherlock Contest, GitHub Issue, Internal Audit, etc."
              value={source}
              onChange={(event) => setSource(event.target.value)}
            />
          </div>

          <div className="mixer-control">
            <textarea
              className="input-textarea"
              placeholder={'## Vulnerability Report\nSummaries, PoCs, and mitigation details…'}
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="mixer-actions">
          <button type="submit" className="button" disabled={status === 'loading'}>
            {status === 'loading' ? 'Rolling the glider reel…' : 'Generate Breakdown'}
          </button>

          {downloadReady ? (
            <button type="button" className="button button-secondary" onClick={handleDownload}>
              ⬇️ Download Markdown
            </button>
          ) : null}

          {downloadReady ? (
            <button type="button" className="button button-secondary" onClick={handleCopy}>
              Copy Breakdown
            </button>
          ) : null}

          <div className="mixer-status" aria-live="polite">
            {status === 'loading' ? (
              <p className="status info">Mixer engaged! We&apos;ll serve the breakdown as soon as the cauldron settles.</p>
            ) : null}

            {status === 'error' ? (
              <p className="status error">❌ {errorMessage ?? 'An unexpected error occurred.'}</p>
            ) : null}

            {status === 'success' ? (
              <p className="status success">✅ Breakdown ready below. Download the Markdown or copy what you need.</p>
            ) : null}

            {status === 'idle' ? (
              <p className="status info">Tip: Detailed reports give the glider crew more signals to stitch into the breakdown.</p>
            ) : null}

            {copyStatus === 'copied' ? (
              <p className="status success">📋 Copied breakdown to clipboard.</p>
            ) : null}

            {copyStatus === 'error' ? (
              <p className="status error">⚠️ Copy failed. Try again or use download instead.</p>
            ) : null}
          </div>
        </div>

        {documentText ? (
          <div className="mixer-results">
            <h3 className="mixer-results__title">✨ Freshly Brewed Breakdown</h3>
            <div className="mixer-document" aria-live="polite">
              <pre>{documentText}</pre>
            </div>
          </div>
        ) : null}
      </form>
    </section>
  );
}
