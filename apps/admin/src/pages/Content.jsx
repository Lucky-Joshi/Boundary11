import { Link } from 'react-router-dom';
import { useBanners } from '../hooks/useAdminQueries.js';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { Spinner, ErrorState, EmptyState } from '../components/ui/States.jsx';

export function Content() {
  const { data, isLoading, isError, error, refetch } = useBanners();

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Content</h2>
          <p>Homepage banners shown in the storefront. Editing is part of a later milestone.</p>
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
    </>
  );
}