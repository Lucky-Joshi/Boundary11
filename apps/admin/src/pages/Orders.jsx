import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useOrders } from '../hooks/useAdminQueries.js';
import { Money } from '../components/ui/Money.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { Spinner, ErrorState, TableSkeleton, EmptyState } from '../components/ui/States.jsx';

const STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

export function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || '';
  const q = searchParams.get('q') || '';

  const params = useMemo(() => ({ status: status || undefined, q: q || undefined }), [status, q]);
  const { data, isLoading, isError, error, refetch } = useOrders(params);

  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Orders</h2>
          <p>{isLoading ? 'Loading…' : `${data.items.length} order(s)`}</p>
        </div>
        <div className="row wrap">
          <input
            className="input"
            placeholder="Search #order, email…"
            value={q}
            onChange={(e) => setFilter('q', e.target.value)}
            style={{ width: 230 }}
            aria-label="Search orders"
          />
          <select className="select" value={status} onChange={(e) => setFilter('status', e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : isError ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : data.items.length === 0 ? (
        <EmptyState title="No orders found" description="Try a different filter or place an order from the storefront." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Placed</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th className="num">Items</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link to={`/orders/${order.id}`} style={{ color: 'var(--blue)', fontWeight: 600 }}>
                        {order.orderNumber || order.id}
                      </Link>
                    </td>
                    <td className="muted">{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div>{order.customerName}</div>
                      <div className="muted" style={{ fontSize: '0.78rem' }}>{order.contactEmail}</div>
                    </td>
                    <td><StatusBadge value={order.status} /></td>
                    <td className="num">{order.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
                    <td className="num"><Money paise={order.totalPaise} withDecimals={false} /></td>
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