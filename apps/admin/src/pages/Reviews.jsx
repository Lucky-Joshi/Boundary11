import { useState } from 'react';
import { REVIEW_STATUS, REVIEW_STATUS_LABELS } from '@boundary11/shared';
import { adminApi } from '../services/adminApi.js';
import { useInvalidatingMutation, useReviews } from '../hooks/useAdminQueries.js';
import { useToast } from '../context/ToastContext.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { ErrorState, TableSkeleton, EmptyState } from '../components/ui/States.jsx';

function Stars({ value }) {
  return (
    <span aria-label={`${value} out of 5`} style={{ color: 'var(--saffron, #f59e0b)', letterSpacing: 1 }}>
      {'★'.repeat(value)}
      <span style={{ color: 'var(--line, #d1d5db)' }}>{'★'.repeat(5 - value)}</span>
    </span>
  );
}

export function Reviews() {
  const { push } = useToast();
  const [status, setStatus] = useState('');
  const { data, isLoading, isError, error, refetch } = useReviews(status || undefined);
  const mutation = useInvalidatingMutation(
    ({ id, next }) => adminApi.setReviewStatus(id, next),
    [['admin', 'reviews']],
  );

  async function moderate(review, next) {
    try {
      await mutation.mutateAsync({ id: review.id, next });
      push(`Review ${REVIEW_STATUS_LABELS[next].toLowerCase()}`, 'success');
    } catch (err) {
      push(err.message || 'Could not update review', 'error');
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Reviews</h2>
          <p>{isLoading ? 'Loading…' : `${data.items.length} review(s)`}</p>
        </div>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {Object.values(REVIEW_STATUS).map((value) => (
            <option key={value} value={value}>
              {REVIEW_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : isError ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : data.items.length === 0 ? (
        <EmptyState title="No reviews" description="Customer reviews will appear here for moderation." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Author</th>
                  <th>Rating</th>
                  <th>Review</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((review) => (
                  <tr key={review.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{review.productName || '—'}</div>
                      <div className="muted" style={{ fontSize: '0.78rem' }}>{review.productSlug}</div>
                    </td>
                    <td>
                      <div>{review.authorName}</div>
                      <div className="muted" style={{ fontSize: '0.78rem' }}>
                        {new Date(review.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                    <td><Stars value={review.rating} /></td>
                    <td style={{ maxWidth: 360 }}>
                      {review.title ? <div style={{ fontWeight: 600 }}>{review.title}</div> : null}
                      <div className="muted" style={{ fontSize: '0.82rem' }}>{review.body}</div>
                    </td>
                    <td><StatusBadge value={review.status} /></td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        {review.status !== REVIEW_STATUS.PUBLISHED ? (
                          <button type="button" className="btn btn-outline btn-sm" disabled={mutation.isPending} onClick={() => moderate(review, REVIEW_STATUS.PUBLISHED)}>
                            Publish
                          </button>
                        ) : null}
                        {review.status !== REVIEW_STATUS.REJECTED ? (
                          <button type="button" className="btn btn-outline btn-sm" disabled={mutation.isPending} onClick={() => moderate(review, REVIEW_STATUS.REJECTED)}>
                            Reject
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
