import { Link } from 'react-router-dom';
import { useAnalytics } from '../hooks/useAdminQueries.js';
import { Money } from '../components/ui/Money.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { Spinner, ErrorState } from '../components/ui/States.jsx';

function maxOf(list, key) {
  return Math.max(1, ...list.map((item) => item[key]));
}

export function Dashboard() {
  const { data, isLoading, isError, error, refetch } = useAnalytics();

  if (isLoading) return <Spinner label="Loading dashboard…" />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;

  const trendMax = maxOf(data.revenueTrend, 'revenuePaise');
  const statusTotal = data.statusBreakdown.reduce((sum, s) => sum + s.count, 0) || 1;

  return (
    <>
      <div className="page-head">
        <div>
          <h2 style={{ fontSize: '1.3rem' }}>Overview</h2>
          <p>Performance across the store at a glance. Data from the in-memory demo provider.</p>
        </div>
        <span className="badge badge-navy">mode: {data.mode}</span>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <span className="label">Net revenue</span>
          <div className="value"><Money paise={data.netRevenuePaise} withDecimals={false} /></div>
          <div className="sub">Gross <Money paise={data.grossRevenuePaise} withDecimals={false} /> · refunded <Money paise={data.refundedPaise} withDecimals={false} /></div>
        </div>
        <div className="stat">
          <span className="label">Paid orders</span>
          <div className="value">{data.paidOrderCount}</div>
          <div className="sub">{data.orderCount} orders lifetime</div>
        </div>
        <div className="stat">
          <span className="label">Average order value</span>
          <div className="value"><Money paise={data.aovPaise} withDecimals={false} /></div>
          <div className="sub">Across paid orders</div>
        </div>
        <div className="stat">
          <span className="label">Customers</span>
          <div className="value">{data.customerCount}</div>
          <div className="sub">{data.publishedProductCount} published · {data.draftProductCount} drafts</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card card-pad">
          <div className="row-between" style={{ marginBottom: 6 }}>
            <h3 style={{ fontSize: '1rem' }}>Revenue trend</h3>
            <span className="muted" style={{ fontSize: '0.8rem' }}>Last 14 days</span>
          </div>
          <div className="bar-chart" aria-hidden>
            {data.revenueTrend.map((day) => (
              <div key={day.date} className="bar-col" title={`${day.date}: ${day.orders} orders`}>
                <div className="bar" style={{ height: `${Math.round((day.revenuePaise / trendMax) * 100)}%` }} />
                <span>{day.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-pad">
          <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Order status</h3>
          <div className="stack">
            {data.statusBreakdown.map((row) => (
              <div key={row.status}>
                <div className="row-between" style={{ marginBottom: 4 }}>
                  <StatusBadge value={row.status} />
                  <strong style={{ fontSize: '0.85rem' }}>{row.count}</strong>
                </div>
                <div style={{ height: 6, background: 'var(--grey-100)', borderRadius: 999 }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.round((row.count / statusTotal) * 100)}%`,
                      background: 'var(--blue)',
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-pad row-between">
            <h3 style={{ fontSize: '1rem' }}>Recent orders</h3>
            <Link to="/orders" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link to={`/orders/${order.id}`} style={{ color: 'var(--blue)', fontWeight: 600 }}>
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>{order.customerName}</td>
                    <td><StatusBadge value={order.status} /></td>
                    <td className="num"><Money paise={order.totalPaise} withDecimals={false} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card card-pad">
          <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Bestsellers</h3>
          {data.bestsellers.length === 0 ? (
            <p className="muted">No sales recorded yet.</p>
          ) : (
            <div className="stack">
              {data.bestsellers.map((item, index) => (
                <div key={item.productId} className="row-between">
                  <div className="row" style={{ gap: 10 }}>
                    <span className="badge badge-blue">{index + 1}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</div>
                      <div className="muted" style={{ fontSize: '0.78rem' }}>{item.units} units</div>
                    </div>
                  </div>
                  <strong style={{ fontSize: '0.9rem' }}><Money paise={item.revenuePaise} withDecimals={false} /></strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(data.lowStockCount > 0 || data.outOfStockCount > 0) && (
        <div className="alert alert-warn">
          <strong>Inventory attention:</strong> {data.lowStockCount} variant(s) low on stock, {data.outOfStockCount} out of stock.{' '}
          <Link to="/inventory" style={{ color: 'inherit', textDecoration: 'underline' }}>Review inventory</Link>
        </div>
      )}
    </>
  );
}
