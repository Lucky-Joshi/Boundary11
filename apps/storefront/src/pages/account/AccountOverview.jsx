import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchOrders } from '../../services/orders.js';
import { Money } from '../../components/ui/Money.jsx';
import { Spinner } from '../../components/ui/Skeleton.jsx';

export function AccountOverview() {
  const { user } = useAuth();
  const ordersQuery = useQuery({ queryKey: ['orders', 'mine'], queryFn: fetchOrders });

  const orders = ordersQuery.data?.items || [];
  const totalSpent = orders
    .filter((order) => order.paymentStatus === 'paid' && order.status !== 'refunded')
    .reduce((sum, order) => sum + order.totalPaise, 0);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <section className="card card-pad">
        <h2 className="h3" style={{ marginBottom: 12 }}>
          Account details
        </h2>
        <div className="spec-list">
          <div>
            <dt>Name</dt>
            <dd>{user?.fullName}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd style={{ textTransform: 'capitalize' }}>{user?.role}</dd>
          </div>
        </div>
      </section>

      <section className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="card card-pad">
          <span className="muted" style={{ fontSize: '0.82rem' }}>Orders placed</span>
          <p className="h2" style={{ marginTop: 6 }}>
            {ordersQuery.isLoading ? '—' : orders.length}
          </p>
        </div>
        <div className="card card-pad">
          <span className="muted" style={{ fontSize: '0.82rem' }}>Total spent (paid)</span>
          <p className="h2" style={{ marginTop: 6 }}>
            {ordersQuery.isLoading ? '—' : <Money paise={totalSpent} />}
          </p>
        </div>
        <div className="card card-pad">
          <span className="muted" style={{ fontSize: '0.82rem' }}>Loyalty tier</span>
          <p className="h2" style={{ marginTop: 6 }}>Boundary Club</p>
        </div>
      </section>

      <section className="card card-pad">
        <div className="row-between" style={{ marginBottom: 12 }}>
          <h2 className="h3">Recent orders</h2>
          <Link to="/account/orders" className="link-btn">
            View all
          </Link>
        </div>
        {ordersQuery.isLoading ? (
          <Spinner label="Loading orders" />
        ) : orders.length === 0 ? (
          <p className="muted">You haven’t placed any orders yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Status</th>
                <th>Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 4).map((order) => (
                <tr key={order.id}>
                  <td>{order.orderNumber}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>
                    <span className="badge badge-blue">{order.status}</span>
                  </td>
                  <td>
                    <Money paise={order.totalPaise} />
                  </td>
                  <td>
                    <Link to={`/account/orders/${order.id}`} className="link-btn">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
