import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PRODUCT_STATUS } from '@boundary11/shared';
import { adminApi } from '../services/adminApi.js';
import { useProducts } from '../hooks/useAdminQueries.js';
import { useToast } from '../context/ToastContext.jsx';
import { useInvalidatingMutation, keys } from '../hooks/useAdminQueries.js';
import { Money } from '../components/ui/Money.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { Icon } from '../components/ui/Icons.jsx';
import { ErrorState, TableSkeleton, EmptyState } from '../components/ui/States.jsx';
import { Modal } from '../components/ui/Modal.jsx';

const STATUSES = Object.values(PRODUCT_STATUS);

export function Products() {
  const { push } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const status = searchParams.get('status') || '';
  const includeArchived = searchParams.get('archived') === '1';

  const params = useMemo(() => ({ q: q || undefined, status: status || undefined, includeArchived }), [q, status, includeArchived]);
  const { data, isLoading, isError, error, refetch } = useProducts(params);

  const statusMutation = useInvalidatingMutation(
    ({ id, status: next }) => adminApi.setProductStatus(id, next),
    [keys.products(params), keys.analytics],
  );
  const deleteMutation = useInvalidatingMutation((id) => adminApi.archiveProduct(id), [keys.products(params), keys.analytics]);

  const [confirm, setConfirm] = useState(null);

  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  async function toggleStatus(product) {
    const next = product.status === 'published' ? 'draft' : 'published';
    await statusMutation.mutateAsync({ id: product.id, status: next });
    push(`${product.name} → ${next}`, 'success');
  }

  async function confirmArchive() {
    await deleteMutation.mutateAsync(confirm.id);
    push(`${confirm.name} archived`, 'success');
    setConfirm(null);
  }

  const showArchived = includeArchived || [...(data?.items || [])].some((p) => p.status === 'archived');

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Products</h2>
          <p>{isLoading ? 'Loading products…' : `${data.total} product(s)`}</p>
        </div>
        <div className="row wrap">
          <div className="row" style={{ position: 'relative' }}>
            <input
              className="input"
              placeholder="Search products…"
              value={q}
              onChange={(e) => setFilter('q', e.target.value)}
              style={{ width: 240, paddingLeft: 34 }}
              aria-label="Search products"
            />
            <span style={{ position: 'absolute', left: 10, color: 'var(--grey-400)' }}>
              <Icon name="search" size={16} />
            </span>
          </div>
          <select className="select" value={status} onChange={(e) => setFilter('status', e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <Link to="/products/new" className="btn btn-primary">
            <Icon name="plus" size={16} /> New product
          </Link>
        </div>
      </div>

      {(includeArchived || showArchived) && (
        <div className="row" style={{ gap: 8 }}>
          <label className="row" style={{ gap: 6, fontSize: '0.85rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={includeArchived} onChange={(e) => setFilter('archived', e.target.checked ? '1' : '')} />
            Include archived
          </label>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : isError ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : data.items.length === 0 ? (
        <EmptyState title="No products found" description="Try changing filters or create a product." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th className="num">Price</th>
                  <th className="num">Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="row" style={{ gap: 12 }}>
                        <span
                          style={{
                            width: 40, height: 40, borderRadius: 8, flex: 'none',
                            background: product.primaryImage ? 'transparent' : 'linear-gradient(145deg,#eef4ff,#dbeafe)',
                            display: 'grid', placeItems: 'center', fontSize: '1.1rem',
                            overflow: 'hidden', border: '1px solid var(--border)',
                          }}
                        >
                          {product.primaryImage ? <img src={product.primaryImage.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏏'}
                        </span>
                        <div>
                          <Link to={`/products/${product.id}/edit`} style={{ fontWeight: 600 }}>
                            {product.name}
                          </Link>
                          <div className="muted" style={{ fontSize: '0.78rem' }}>{product.slug} · {product.variants.length} variant(s)</div>
                        </div>
                      </div>
                    </td>
                    <td>{product.categoryName}</td>
                    <td><StatusBadge value={product.status} /></td>
                    <td className="num"><Money paise={product.minPricePaise} withDecimals={false} /></td>
                    <td className="num">
                      <span className={product.totalStock <= 0 ? 'badge badge-red' : product.totalStock <= 10 ? 'badge badge-amber' : 'badge badge-green'}>
                        {product.totalStock}
                      </span>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleStatus(product)}>
                          {product.status === 'published' ? 'Unpublish' : 'Publish'}
                        </button>
                        <Link to={`/products/${product.id}/edit`} className="btn btn-outline btn-sm">
                          <Icon name="edit" size={14} /> Edit
                        </Link>
                        {product.status !== 'archived' && (
                          <button type="button" className="btn btn-outline btn-sm" style={{ color: 'var(--red)' }} onClick={() => setConfirm(product)}>
                            <Icon name="trash" size={14} /> Archive
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirm && (
        <Modal
          title="Archive product"
          onClose={() => setConfirm(null)}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setConfirm(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={confirmArchive} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Archiving…' : 'Archive'}
              </button>
            </>
          }
        >
          <p>
            Archive <strong>{confirm.name}</strong>? It will be hidden everywhere in catalog and can be
            included again from this list.
          </p>
        </Modal>
      )}
    </>
  );
}