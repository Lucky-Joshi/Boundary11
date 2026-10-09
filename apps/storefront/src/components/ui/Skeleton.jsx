export function Spinner({ label = 'Loading' }) {
  return (
    <span className="row" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="muted">{label}…</span>
    </span>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="product-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="product-card">
          <div className="skeleton" style={{ aspectRatio: '1 / 1.06' }} />
          <div className="product-body">
            <div className="skeleton" style={{ height: 12, width: '40%' }} />
            <div className="skeleton" style={{ height: 16, width: '80%' }} />
            <div className="skeleton" style={{ height: 18, width: '50%', marginTop: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
