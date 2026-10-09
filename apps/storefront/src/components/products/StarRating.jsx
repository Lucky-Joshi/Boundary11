import { StarIcon } from '../ui/Icons.jsx';

export function StarRating({ value = 0, count, compact = false }) {
  if (!value) {
    return <span className="stars muted">No reviews yet</span>;
  }
  const filled = Math.round(value);
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      <span style={{ display: 'inline-flex', gap: 1 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <StarIcon key={n} size={14} filled={n <= filled} className={n <= filled ? 'star' : ''} />
        ))}
      </span>
      {!compact ? (
        <span>
          {value.toFixed(1)}
          {count ? ` (${count})` : ''}
        </span>
      ) : null}
    </span>
  );
}
