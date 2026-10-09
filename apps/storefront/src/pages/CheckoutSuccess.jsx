import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Money } from '../components/ui/Money.jsx';
import { fetchOrder } from '../services/orders.js';

export function CheckoutSuccess() {
  const location = useLocation();
  const [params] = useSearchParams();
  const orderId = params.get('order');
  const stateOrder = location.state?.order;

  const query = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: Boolean(orderId) && !stateOrder,
    retry: false,
  });

  const order = stateOrder || query.data;

  return (
    <div className="container page">
      <div className="auth-wrap" style={{ maxWidth: 640, textAlign: 'center' }}>
        <div
          className="card card-pad"
          style={{ display: 'grid', gap: 16, justifyItems: 'center' }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--green-50)',
              color: 'var(--green)',
              display: 'grid',
              placeItems: 'center',
              fontSize: '1.8rem',
              fontWeight: 800,
            }}
            aria-hidden="true"
          >
            ✓
          </div>
          <h1 className="h1">Order confirmed</h1>
          <p className="lead">
            Thanks for your order. This is a demo confirmation — no payment was taken and nothing will
            be shipped.
          </p>

          {order ? (
            <>
              <div className="card card-pad" style={{ width: '100%', textAlign: 'left' }}>
                <div className="summary-row">
                  <span>Order number</span>
                  <strong>{order.orderNumber}</strong>
                </div>
                <div className="summary-row">
                  <span>Status</span>
                  <span className="badge badge-blue">{order.status}</span>
                </div>
                <div className="summary-row">
                  <span>Payment</span>
                  <span className="badge badge-green">{order.paymentStatus}</span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <Money paise={order.totalPaise} />
                </div>
              </div>
              <div className="row" style={{ gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link to="/shop" className="btn btn-primary">
                  Continue shopping
                </Link>
                <Link to="/account/orders" className="btn btn-outline">
                  View your orders
                </Link>
              </div>
            </>
          ) : (
            <p className="muted">
              {query.isError
                ? 'Sign in to view the full order details. Your order was still created in the demo store.'
                : 'Loading order details…'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
