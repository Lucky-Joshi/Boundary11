import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ORDER_STATUS_TRANSITIONS } from '@boundary11/shared';
import { adminApi } from '../services/adminApi.js';
import { useInvalidatingMutation, useOrder, keys } from '../hooks/useAdminQueries.js';
import { useToast } from '../context/ToastContext.jsx';
import { Money } from '../components/ui/Money.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { Icon } from '../components/ui/Icons.jsx';
import { Spinner, ErrorState } from '../components/ui/States.jsx';

export function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const { data: order, isLoading, isError, error, refetch } = useOrder(id);

  const [nextStatus, setNextStatus] = useState('');
  const [note, setNote] = useState('');

  const statusMutation = useInvalidatingMutation(
    (body) => adminApi.setOrderStatus(id, body.status, body.note),
    [keys.order(id), keys.orders({}), keys.analytics],
  );

  if (isLoading) return <Spinner label="Loading order…" />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;

  const allowed = ORDER_STATUS_TRANSITIONS[order.status] || [];
  const itemsCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  async function applyStatus(event) {
    event.preventDefault();
    try {
      await statusMutation.mutateAsync({ status: nextStatus, note });
      push(`Order marked ${nextStatus}`, 'success');
      setNextStatus('');
      setNote('');
    } catch (err) {
      push(err.message, 'error');
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
              <Icon name="arrowLeft" size={16} />
            </button>
            <h2>{order.orderNumber || order.id}</h2>
            <StatusBadge value={order.status} />
          </div>
          <p>Placed {new Date(order.createdAt).toLocaleString('en-IN')} · {order.paymentMethod} · ref {order.paymentRef || '—'}</p>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-pad row-between">
            <h3 style={{ fontSize: '1rem' }}>Items</h3>
            <span className="muted" style={{ fontSize: '0.85rem' }}>{itemsCount} item(s)</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th className="num">Unit</th>
                  <th className="num">Qty</th>
                  <th className="num">Line</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={`${item.variantId}-${index}`}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td className="muted">{item.sku} · {item.size}{item.color ? ` · ${item.color}` : ''}</td>
                    <td className="num"><Money paise={item.unitPrice} withDecimals={false} /></td>
                    <td className="num">{item.quantity}</td>
                    <td className="num"><Money paise={item.unitPrice * item.quantity} withDecimals={false} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-pad" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="stack" style={{ gap: 8 }}>
              <div className="row-between"><span className="muted">Subtotal</span><span><Money paise={order.subtotalPaise} /></span></div>
              <div className="row-between"><span className="muted">Discount</span><span style={{ color: order.discountPaise ? 'var(--green)' : undefined }}>−<Money paise={order.discountPaise} /></span></div>
              <div className="row-between"><span className="muted">Shipping</span><span>{order.shippingPaise ? <Money paise={order.shippingPaise} /> : 'Free'}</span></div>
              <div className="row-between" style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                <strong>Total</strong>
                <strong style={{ fontSize: '1.1rem' }}><Money paise={order.totalPaise} /></strong>
              </div>
            </div>
          </div>
        </div>

        <div className="grid" style={{ gap: 16 }}>
          <div className="card card-pad">
            <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Update status</h3>
            {allowed.length === 0 ? (
              <div className="alert alert-info">This order is in a final state and cannot be changed.</div>
            ) : (
              <form onSubmit={applyStatus}>
                <div className="field">
                  <label htmlFor="next-status">Move to</label>
                  <select id="next-status" className="select" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
                    <option value="">Choose…</option>
                    {allowed.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="status-note">Note <span className="field-hint">(visible to customer)</span></label>
                  <input id="status-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={!nextStatus || statusMutation.isPending}>
                  {statusMutation.isPending ? 'Saving…' : 'Apply status'}
                </button>
              </form>
            )}
          </div>

          <div className="card card-pad">
            <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Customer &amp; shipping</h3>
            <div className="spec-list">
              <div><dt>Name</dt><dd>{order.customerName}</dd></div>
              <div><dt>Email</dt><dd>{order.contactEmail}</dd></div>
              <div><dt>Phone</dt><dd>{order.contactPhone || '—'}</dd></div>
              <div><dt>Coupon</dt><dd>{order.couponCode || '—'}</dd></div>
              <div><dt>Payment</dt><dd>{order.paymentStatus}</dd></div>
            </div>
            <div style={{ marginTop: 14, fontSize: '0.9rem', lineHeight: 1.7 }}>
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.postalCode}
              <br />
              {order.shippingAddress.country}
            </div>
          </div>

          <div className="card card-pad">
            <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>History</h3>
            <div className="stack" style={{ gap: 0 }}>
              {[...order.statusHistory].reverse().map((entry, index) => (
                <div key={index} className="row" style={{ gap: 12, padding: '9px 0', borderBottom: index < order.statusHistory.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'flex-start' }}>
                  <span className="dot" style={{ marginTop: 6 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{entry.status}</div>
                    <div className="muted" style={{ fontSize: '0.78rem' }}>
                      {new Date(entry.at).toLocaleString('en-IN')} · {entry.actor}
                    </div>
                    {entry.note ? <div className="muted" style={{ fontSize: '0.82rem' }}>{entry.note}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}