import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchOrder } from '../../services/orders.js';
import { Money } from '../../components/ui/Money.jsx';
import { Spinner } from '../../components/ui/Skeleton.jsx';
import { ErrorState } from '../../components/ui/States.jsx';

const STATUS_STEPS = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

export function AccountOrderDetail() {
  const { id } = useParams();
  const query = useQuery({ queryKey: ['order', id], queryFn: () => fetchOrder(id) });

  if (query.isLoading) return <Spinner label="Loading order" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />;

  const order = query.data;
  const isCancelled = ['cancelled', 'refunded'].includes(order.status);
  const currentIndex = STATUS_STEPS.indexOf(order.status);
  const history = order.statusHistory || [];
  const eventFor = (status) => history.find((entry) => entry.status === status);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row-between">
        <div>
          <h2 className="h3">Order {order.orderNumber}</h2>
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Placed {new Date(order.createdAt).toLocaleString('en-IN')}
          </p>
        </div>
        <span className={`badge ${isCancelled ? 'badge-red' : 'badge-blue'}`}>{order.status}</span>
      </div>

      <section className="card card-pad">
        <h3 className="h3" style={{ marginBottom: 16 }}>
          Progress
        </h3>
        {isCancelled ? (
          <>
            <p className="alert alert-warn">
              This order is {order.status}. {order.paymentStatus === 'refunded' ? 'A demo refund was recorded.' : ''}
            </p>
            <div className="timeline" style={{ marginTop: 16 }}>
              {history.map((entry) => (
                <div key={`${entry.status}-${entry.at}`} className="timeline-item">
                  <span className="timeline-dot" />
                  <div>
                    <strong style={{ textTransform: 'capitalize' }}>{entry.status}</strong>
                    <p className="muted" style={{ fontSize: '0.82rem' }}>
                      {new Date(entry.at).toLocaleString('en-IN')}
                      {entry.note ? ` · ${entry.note}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="timeline">
            {STATUS_STEPS.map((step, index) => {
              const event = eventFor(step);
              return (
                <div key={step} className="timeline-item">
                  <span className="timeline-dot" style={{ opacity: index <= currentIndex ? 1 : 0.35 }} />
                  <div>
                    <strong style={{ textTransform: 'capitalize' }}>{step}</strong>
                    {event ? (
                      <p className="muted" style={{ fontSize: '0.82rem' }}>
                        {new Date(event.at).toLocaleString('en-IN')}
                        {event.note ? ` · ${event.note}` : ''}
                      </p>
                    ) : index <= currentIndex ? (
                      <p className="muted" style={{ fontSize: '0.82rem' }}>
                        Completed
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card card-pad">
        <h3 className="h3" style={{ marginBottom: 12 }}>
          Items
        </h3>
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Size</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.variantId}>
                <td>
                  <Link to={`/products/${item.slug}`} className="link-btn">
                    {item.name}
                  </Link>
                </td>
                <td>{item.size}</td>
                <td>{item.quantity}</td>
                <td>
                  <Money paise={item.unitPrice} />
                </td>
                <td>
                  <Money paise={item.unitPrice * item.quantity} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ maxWidth: 340, marginLeft: 'auto', marginTop: 16 }}>
          <div className="summary-row">
            <span>Subtotal</span>
            <Money paise={order.subtotalPaise} />
          </div>
          {order.discountPaise > 0 ? (
            <div className="summary-row">
              <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
              <span className="discount">
                −<Money paise={order.discountPaise} />
              </span>
            </div>
          ) : null}
          <div className="summary-row">
            <span>Shipping</span>
            {order.shippingPaise === 0 ? <span className="discount">Free</span> : <Money paise={order.shippingPaise} />}
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <Money paise={order.totalPaise} />
          </div>
        </div>
      </section>

      <section className="card card-pad">
        <h3 className="h3" style={{ marginBottom: 12 }}>
          Shipping address
        </h3>
        <p>
          {order.shippingAddress.fullName}
          <br />
          {order.shippingAddress.line1}
          {order.shippingAddress.line2 ? (
            <>
              <br />
              {order.shippingAddress.line2}
            </>
          ) : null}
          <br />
          {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
          <br />
          {order.shippingAddress.country}
          <br />
          {order.contactPhone}
        </p>
      </section>
    </div>
  );
}
