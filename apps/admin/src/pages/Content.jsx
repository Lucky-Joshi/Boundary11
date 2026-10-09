import { Link } from 'react-router-dom';
import { CONTACT_STATUS } from '@boundary11/shared';
import { adminApi } from '../services/adminApi.js';
import { useInvalidatingMutation, useBanners, useMessages, useSubscribers } from '../hooks/useAdminQueries.js';
import { useToast } from '../context/ToastContext.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { Spinner, ErrorState, EmptyState } from '../components/ui/States.jsx';

function Messages() {
  const { push } = useToast();
  const { data, isLoading, isError, error, refetch } = useMessages();
  const mutation = useInvalidatingMutation(
    ({ id, status }) => adminApi.setMessageStatus(id, status),
    [['admin', 'messages']],
  );

  async function setStatus(message, status) {
    try {
      await mutation.mutateAsync({ id: message.id, status });
      push(`Message marked ${status}`, 'success');
    } catch (err) {
      push(err.message || 'Could not update message', 'error');
    }
  }

  return (
    <div className="card-pad">
      <h3 style={{ marginBottom: 6 }}>Contact messages</h3>
      <p className="muted" style={{ marginBottom: 14, fontSize: '0.85rem' }}>
        Notes submitted through the storefront contact form.
      </p>
      {isLoading ? (
        <Spinner label="Loading messages…" />
      ) : isError ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : !data.items.length ? (
        <EmptyState title="No messages" />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Received</th>
                  <th>From</th>
                  <th>Subject</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((message) => (
                  <tr key={message.id}>
                    <td className="muted">{new Date(message.createdAt).toLocaleString('en-IN')}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{message.name}</div>
                      <div className="muted" style={{ fontSize: '0.78rem' }}>{message.email}</div>
                    </td>
                    <td>{message.subject}</td>
                    <td className="muted" style={{ maxWidth: 320 }}>{message.message}</td>
                    <td><StatusBadge value={message.status} /></td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        {message.status !== CONTACT_STATUS.READ ? (
                          <button type="button" className="btn btn-outline btn-sm" disabled={mutation.isPending} onClick={() => setStatus(message, CONTACT_STATUS.READ)}>
                            Mark read
                          </button>
                        ) : null}
                        {message.status !== CONTACT_STATUS.RESOLVED ? (
                          <button type="button" className="btn btn-outline btn-sm" disabled={mutation.isPending} onClick={() => setStatus(message, CONTACT_STATUS.RESOLVED)}>
                            Resolve
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
    </div>
  );
}

function Subscribers() {
  const { data, isLoading, isError, error, refetch } = useSubscribers();

  return (
    <div className="card-pad">
      <h3 style={{ marginBottom: 6 }}>Newsletter subscribers</h3>
      <p className="muted" style={{ marginBottom: 14, fontSize: '0.85rem' }}>
        {isLoading ? 'Loading…' : `${data?.items?.length || 0} subscriber(s)`}
      </p>
      {isLoading ? (
        <Spinner label="Loading subscribers…" />
      ) : isError ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : !data.items.length ? (
        <EmptyState title="No subscribers yet" />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Subscribed</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((subscriber) => (
                  <tr key={subscriber.id}>
                    <td>{subscriber.email}</td>
                    <td className="muted">{new Date(subscriber.createdAt).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function Content() {
  const { data, isLoading, isError, error, refetch } = useBanners();

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Content</h2>
          <p>Homepage banners, contact messages and newsletter sign-ups.</p>
        </div>
      </div>

      {isLoading ? (
        <Spinner label="Loading banners…" />
      ) : isError ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : !data.items.length ? (
        <EmptyState title="No banners" />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))' }}>
          {data.items.map((banner) => (
            <div key={banner.id} className="card" style={{ overflow: 'hidden' }}>
              <div
                style={{
                  height: 120,
                  background: `linear-gradient(135deg, ${banner.accent}, ${banner.accent}cc)`,
                  color: '#fff',
                  padding: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                }}
              >
                <h3 style={{ color: '#fff', fontSize: '1.15rem' }}>{banner.title}</h3>
                <p style={{ opacity: 0.9, fontSize: '0.85rem', marginTop: 4 }}>{banner.subtitle}</p>
              </div>
              <div className="card-pad">
                <div className="row-between">
                  <StatusBadge value={banner.active ? 'active' : 'disabled'} />
                  <span className="muted" style={{ fontSize: '0.8rem' }}>Order {banner.order}</span>
                </div>
                <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                  <span className="muted" style={{ fontSize: '0.85rem' }}>CTA:</span>
                  <Link to={banner.ctaHref} style={{ color: 'var(--blue)', fontSize: '0.85rem' }}>
                    {banner.ctaLabel} · {banner.ctaHref}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 24 }}>
        <Messages />
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <Subscribers />
      </div>
    </>
  );
}
