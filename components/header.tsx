'use client';

export function Header() {
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo-section">
          <div className="logo-icon">⚡</div>
          <div className="logo-text">
            <h1 className="logo-title">GlideBuilder</h1>
            <p className="logo-subtitle">Glider Breakdown & Skeleton Builder</p>
          </div>
        </div>
        <div className="header-badge">
          <span className="badge-dot"></span>
          <span className="badge-text">Beta</span>
        </div>
      </div>
    </header>
  );
}
