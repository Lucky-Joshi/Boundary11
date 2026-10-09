export function Spinner({ label }) {
  return (
    <div className="row" style={{ justifyContent: 'center', padding: 40, color: 'var(--text-muted)' }} role="status">
      <span className="spinner" />
      {label ? <span>{label}</span> : null}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="alert alert-error">
      <strong>Something went wrong.</strong>
      <p style={{ marginTop: 4 }}>{message}</p>
      {onRetry ? (
        <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="card card-pad stack">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="row" style={{ gap: 12 }}>
          {Array.from({ length: cols }).map((__, c) => (
            <div key={c} className="skeleton" style={{ height: 16, flex: c === 0 ? 2 : 1 }} />
          ))}
        </div>
      ))}
    </div>
  );
}
