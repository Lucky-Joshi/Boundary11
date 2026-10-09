import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useProductReviews, useCreateReview } from '../../hooks/useCatalog.js';
import { StarRating } from './StarRating.jsx';
import { Spinner } from '../ui/Skeleton.jsx';
import { ErrorState } from '../ui/States.jsx';
import { StarIcon } from '../ui/Icons.jsx';

function RatingBars({ summary }) {
  const total = summary.count || 0;
  return (
    <div className="stack" style={{ gap: 6 }}>
      {[5, 4, 3, 2, 1].map((star) => {
        const count = summary.distribution?.[star] || 0;
        const percent = total ? Math.round((count / total) * 100) : 0;
        return (
          <div key={star} className="row" style={{ gap: 10, fontSize: '0.82rem' }}>
            <span className="row muted" style={{ gap: 3, width: 34 }}>
              {star}
              <StarIcon size={12} filled />
            </span>
            <span style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--line, #e5e7eb)', overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: `${percent}%`, background: 'var(--saffron, #f59e0b)' }} />
            </span>
            <span className="muted" style={{ width: 28, textAlign: 'right' }}>
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ProductReviews({ slug }) {
  const { isAuthenticated } = useAuth();
  const { push } = useToast();
  const query = useProductReviews(slug);
  const createReview = useCreateReview(slug);
  const [form, setForm] = useState({ rating: 5, title: '', body: '' });
  const [errors, setErrors] = useState({});

  async function submit(event) {
    event.preventDefault();
    setErrors({});
    try {
      await createReview.mutateAsync({ rating: Number(form.rating), title: form.title, body: form.body });
      push('Thanks for sharing your review!', 'success');
      setForm({ rating: 5, title: '', body: '' });
    } catch (error) {
      setErrors(error.fields || { _: error.message });
      push(error.message || 'Could not submit your review.', 'error');
    }
  }

  if (query.isLoading) return <Spinner label="Loading reviews" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />;

  const { items = [], summary, reviewCount } = query.data;

  return (
    <section className="product-reviews">
      <div className="grid" style={{ gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 32, alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="h3">Customer reviews</h3>
          <div className="row" style={{ gap: 12, margin: '12px 0' }}>
            <strong style={{ fontSize: '2rem', lineHeight: 1 }}>{(summary.average || 0).toFixed(1)}</strong>
            <div>
              <StarRating value={summary.average} compact />
              <p className="muted" style={{ fontSize: '0.82rem', marginTop: 2 }}>
                {reviewCount} rating{reviewCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <RatingBars summary={summary} />
          <p className="muted" style={{ fontSize: '0.78rem', marginTop: 14 }}>
            {summary.count} written review{summary.count === 1 ? '' : 's'}. Ratings include purchases from
            the wider community.
          </p>
        </div>

        <div className="stack" style={{ gap: 20 }}>
          {isAuthenticated ? (
            <form className="card card-pad" onSubmit={submit} noValidate>
              <h3 className="h3" style={{ marginBottom: 12 }}>
                Write a review
              </h3>
              {errors._ ? <p className="alert alert-error" style={{ marginBottom: 14 }}>{errors._}</p> : null}
              <div className="field">
                <label htmlFor="review-rating">Your rating</label>
                <select
                  id="review-rating"
                  className="select"
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: e.target.value })}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} star{n === 1 ? '' : 's'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="review-title">Title (optional)</label>
                <input
                  id="review-title"
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Sums up your experience"
                />
              </div>
              <div className="field">
                <label htmlFor="review-body">Review</label>
                <textarea
                  id="review-body"
                  className="textarea"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="What did you like or not like?"
                />
                {errors.body ? <span className="field-error">{errors.body}</span> : null}
              </div>
              <button type="submit" className="btn btn-primary" disabled={createReview.isPending}>
                {createReview.isPending ? 'Submitting…' : 'Submit review'}
              </button>
            </form>
          ) : (
            <div className="card card-pad">
              <p className="muted">
                <Link to="/login" className="link-btn">Sign in</Link> to share your thoughts on this product.
              </p>
            </div>
          )}

          {items.length === 0 ? (
            <p className="muted">No written reviews yet — be the first to add one.</p>
          ) : (
            <ul className="stack" style={{ gap: 14 }}>
              {items.map((review) => (
                <li key={review.id} className="card card-pad">
                  <div className="row-between">
                    <div className="row" style={{ gap: 10 }}>
                      <span className="avatar" aria-hidden="true">
                        {review.authorName.slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <strong>{review.authorName}</strong>
                        <div className="muted" style={{ fontSize: '0.78rem' }}>
                          {new Date(review.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    </div>
                    <StarRating value={review.rating} compact />
                  </div>
                  {review.title ? (
                    <p style={{ fontWeight: 600, marginTop: 12 }}>{review.title}</p>
                  ) : null}
                  <p className="muted" style={{ marginTop: review.title ? 4 : 12 }}>
                    {review.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
