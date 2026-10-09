import { Link } from 'react-router-dom';

export function EmptyState({ title, description, actionLabel, actionTo, icon = '✦' }) {
  return (
    <div className="empty">
      <div className="icon" aria-hidden="true">
        {icon}
      </div>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {actionTo && actionLabel ? (
        <Link to={actionTo} className="btn btn-primary">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="empty" role="alert">
      <div className="icon" aria-hidden="true">
        !
      </div>
      <h3>Something went wrong</h3>
      <p>{error?.message || 'We could not load this content.'}</p>
      {onRetry ? (
        <button type="button" className="btn btn-outline" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
