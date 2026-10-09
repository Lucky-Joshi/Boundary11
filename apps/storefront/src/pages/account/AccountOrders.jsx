import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchOrders } from '../../services/orders.js';
import { Money } from '../../components/ui/Money.jsx';
import { Spinner } from '../../components/ui/Skeleton.jsx';
import { EmptyState, ErrorState } from '../../components/ui/States.jsx';

export function AccountOrders() {
  const query = useQuery({ queryKey: ['orders', 'mine'], queryFn: fetchOrders });

  if (query.isLoading) {
    return <Spinner label="Loading your orders" />;
  }
  if (query.isError) {
    return <ErrorState error={query.error} onRetry={query.refetch} />;
  }

  const orders = query.data.items;

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        description="When you place an order it will appear here."
        actionLabel="Start shopping"
        actionTo="/shop"
        icon="📦"
      />
    );
  }

  return (
    <div className="card card-pad">
      <h2 className="h3" style={{ marginBottom: 12 }}>
        Your orders
      </h2>
      <table className="table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Date</th>
            <th>Items</th>
            <th>Status</th>
            <th>Total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{order.orderNumber}</td>
              <td>{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
              <td>{order.items.length}</td>
              <td>
                <span className="badge badge-blue">{order.status}</span>
              </td>
              <td>
                <Money paise={order.totalPaise} />
              </td>
              <td>
                <Link to={`/account/orders/${order.id}`} className="link-btn">
                  Details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
