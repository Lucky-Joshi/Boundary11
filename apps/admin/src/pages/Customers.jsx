import { useCustomers } from '../hooks/useAdminQueries.js';
import { Money } from '../components/ui/Money.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { Spinner, ErrorState, TableSkeleton, EmptyState } from '../components/ui/States.jsx';

export function Customers() {
  const { data, isLoading, isError, error, refetch } = useCustomers();

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Customers</h2>
          <p>Accounts and order history derived from placed orders.</p>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : isError ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : !data.items.length ? (
        <EmptyState title="No customers yet" />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="num">Orders</th>
                  <th className="num">Total spent</th>
                  <th>Last order</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((customer) => (
                  <tr key={customer.email}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{customer.name}</div>
                      <div className="muted" style={{ fontSize: '0.78rem' }}>{customer.email}</div>
                    </td>
                    <td>{customer.role ? <StatusBadge value={customer.role} /> : <span className="muted">guest</span>}</td>
                    <td>{customer.status ? <StatusBadge value={customer.status} /> : <span className="muted">—</span>}</td>
                    <td className="num">{customer.orderCount}</td>
                    <td className="num"><Money paise={customer.totalSpentPaise} withDecimals={false} /></td>
                    <td className="muted">{customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="muted">{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-IN') : '—'}</td>
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