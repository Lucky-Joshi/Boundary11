import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Money } from '../components/ui/Money.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { checkout, verifyMockPayment } from '../services/orders.js';

const PAYMENT_METHODS = [
  { value: 'mock_upi', label: 'UPI (demo)', hint: 'Simulated UPI payment' },
  { value: 'mock_card', label: 'Card (demo)', hint: 'Simulated card payment' },
  { value: 'cod', label: 'Cash on delivery', hint: 'Pay when your order arrives' },
];

const initialForm = {
  contactEmail: '',
  contactPhone: '',
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  paymentMethod: 'mock_upi',
  notes: '',
};

export function Checkout() {
  const navigate = useNavigate();
  const cart = useCart();
  const { user } = useAuth();
  const [form, setForm] = useState({
    ...initialForm,
    contactEmail: user?.email || '',
    fullName: user?.fullName || '',
  });
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState('details');
  const [pendingOrder, setPendingOrder] = useState(null);
  const [paymentError, setPaymentError] = useState('');
  const [busy, setBusy] = useState(false);

  if (cart.items.length === 0 && phase === 'details') {
    return (
      <div className="container page">
        <div className="empty">
          <h3>Your bag is empty</h3>
          <p>Add something to your bag before checking out.</p>
          <Link to="/shop" className="btn btn-primary">
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validateClient() {
    const next = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) next.contactEmail = 'Enter a valid email.';
    if (!/^[+]?[0-9\s-]{8,15}$/.test(form.contactPhone)) next.contactPhone = 'Enter a valid phone number.';
    if (form.fullName.trim().length < 2) next.fullName = 'Enter the recipient name.';
    if (form.line1.trim().length < 3) next.line1 = 'Enter the street address.';
    if (form.city.trim().length < 2) next.city = 'Enter the city.';
    if (form.state.trim().length < 2) next.state = 'Enter the state.';
    if (!/^[1-9][0-9]{5}$/.test(form.postalCode)) next.postalCode = 'Enter a valid 6-digit PIN code.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function placeOrder(event) {
    event.preventDefault();
    setPaymentError('');
    if (!validateClient()) return;
    setBusy(true);
    try {
      const result = await checkout({
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        shippingAddress: {
          fullName: form.fullName,
          phone: form.contactPhone,
          line1: form.line1,
          line2: form.line2,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: 'India',
        },
        paymentMethod: form.paymentMethod,
        couponCode: cart.appliedCoupon?.code || '',
        notes: form.notes,
      });

      if (result.payment.status === 'on_delivery') {
        await cart.clear();
        navigate(`/checkout/success?order=${result.order.id}`, { state: { order: result.order } });
        return;
      }
      setPendingOrder({ order: result.order, payment: result.payment });
      setPhase('payment');
    } catch (error) {
      setErrors(error.fields || { _: error.message });
      setPaymentError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function resolvePayment(outcome) {
    if (!pendingOrder) return;
    setBusy(true);
    setPaymentError('');
    try {
      const result = await verifyMockPayment(pendingOrder.order.id, outcome);
      if (result.order.paymentStatus === 'paid') {
        await cart.clear();
        navigate(`/checkout/success?order=${result.order.id}`, { state: { order: result.order } });
      } else {
        setPaymentError(result.payment.message || 'Demo payment failed. You can try again.');
      }
    } catch (error) {
      setPaymentError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container page">
      <div className="breadcrumbs">
        <Link to="/cart">Bag</Link>
        <span>/</span>
        <span>Checkout</span>
      </div>
      <h1 className="h1" style={{ marginBottom: 8 }}>
        Checkout
      </h1>
      <p className="alert alert-info" style={{ marginBottom: 22 }}>
        <strong>Demo checkout.</strong> No real payment is processed and no goods are shipped. Use the
        buttons below to simulate payment success or failure.
      </p>

      {phase === 'details' ? (
        <form onSubmit={placeOrder} className="checkout-layout" noValidate>
          <div className="stack" style={{ gap: 20 }}>
            <section className="card card-pad">
              <h3 className="h3" style={{ marginBottom: 16 }}>
                Contact information
              </h3>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    className="input"
                    type="email"
                    autoComplete="email"
                    value={form.contactEmail}
                    aria-invalid={Boolean(errors.contactEmail)}
                    onChange={(event) => set('contactEmail', event.target.value)}
                  />
                  {errors.contactEmail ? <span className="field-error">{errors.contactEmail}</span> : null}
                </div>
                <div className="field">
                  <label htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    className="input"
                    type="tel"
                    autoComplete="tel"
                    value={form.contactPhone}
                    aria-invalid={Boolean(errors.contactPhone)}
                    onChange={(event) => set('contactPhone', event.target.value)}
                  />
                  {errors.contactPhone ? <span className="field-error">{errors.contactPhone}</span> : null}
                </div>
              </div>
            </section>

            <section className="card card-pad">
              <h3 className="h3" style={{ marginBottom: 16 }}>
                Shipping address
              </h3>
              <div className="form-grid">
                <div className="field span-2">
                  <label htmlFor="fullName">Full name</label>
                  <input
                    id="fullName"
                    className="input"
                    autoComplete="name"
                    value={form.fullName}
                    aria-invalid={Boolean(errors.fullName)}
                    onChange={(event) => set('fullName', event.target.value)}
                  />
                  {errors.fullName ? <span className="field-error">{errors.fullName}</span> : null}
                </div>
                <div className="field span-2">
                  <label htmlFor="line1">Address line 1</label>
                  <input
                    id="line1"
                    className="input"
                    autoComplete="address-line1"
                    value={form.line1}
                    aria-invalid={Boolean(errors.line1)}
                    onChange={(event) => set('line1', event.target.value)}
                  />
                  {errors.line1 ? <span className="field-error">{errors.line1}</span> : null}
                </div>
                <div className="field span-2">
                  <label htmlFor="line2">Address line 2 (optional)</label>
                  <input
                    id="line2"
                    className="input"
                    autoComplete="address-line2"
                    value={form.line2}
                    onChange={(event) => set('line2', event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    className="input"
                    autoComplete="address-level2"
                    value={form.city}
                    aria-invalid={Boolean(errors.city)}
                    onChange={(event) => set('city', event.target.value)}
                  />
                  {errors.city ? <span className="field-error">{errors.city}</span> : null}
                </div>
                <div className="field">
                  <label htmlFor="state">State</label>
                  <input
                    id="state"
                    className="input"
                    autoComplete="address-level1"
                    value={form.state}
                    aria-invalid={Boolean(errors.state)}
                    onChange={(event) => set('state', event.target.value)}
                  />
                  {errors.state ? <span className="field-error">{errors.state}</span> : null}
                </div>
                <div className="field">
                  <label htmlFor="postalCode">PIN code</label>
                  <input
                    id="postalCode"
                    className="input"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    value={form.postalCode}
                    aria-invalid={Boolean(errors.postalCode)}
                    onChange={(event) => set('postalCode', event.target.value)}
                  />
                  {errors.postalCode ? <span className="field-error">{errors.postalCode}</span> : null}
                </div>
                <div className="field">
                  <label htmlFor="country">Country</label>
                  <input id="country" className="input" value="India" readOnly />
                </div>
              </div>
            </section>

            <section className="card card-pad">
              <h3 className="h3" style={{ marginBottom: 16 }}>
                Payment method
              </h3>
              <div className="stack" style={{ gap: 10 }}>
                {PAYMENT_METHODS.map((method) => (
                  <label key={method.value} className="check" style={{ gap: 12 }}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.value}
                      checked={form.paymentMethod === method.value}
                      onChange={(event) => set('paymentMethod', event.target.value)}
                    />
                    <span>
                      <strong>{method.label}</strong>
                      <span className="muted" style={{ display: 'block', fontSize: '0.82rem' }}>
                        {method.hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="field" style={{ marginTop: 16, marginBottom: 0 }}>
                <label htmlFor="notes">Order notes (optional)</label>
                <textarea
                  id="notes"
                  className="textarea"
                  value={form.notes}
                  onChange={(event) => set('notes', event.target.value)}
                  placeholder="Delivery instructions, gift note, etc."
                />
              </div>
            </section>

            {paymentError ? <p className="alert alert-error">{paymentError}</p> : null}
          </div>

          <aside className="card card-pad summary">
            <h3 className="h3" style={{ marginBottom: 12 }}>
              Order summary
            </h3>
            {cart.items.map((item) => (
              <div key={item.id} className="summary-row">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <Money paise={item.unitPrice * item.quantity} />
              </div>
            ))}
            <div className="summary-row">
              <span>Subtotal</span>
              <Money paise={cart.totals.subtotalPaise} />
            </div>
            {cart.totals.discountPaise > 0 ? (
              <div className="summary-row">
                <span>Discount</span>
                <span className="discount">
                  −<Money paise={cart.totals.discountPaise} />
                </span>
              </div>
            ) : null}
            <div className="summary-row">
              <span>Shipping</span>
              {cart.totals.shippingPaise === 0 ? <span className="discount">Free</span> : <Money paise={cart.totals.shippingPaise} />}
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <Money paise={cart.totals.totalPaise} />
            </div>
            <button type="submit" className="btn btn-primary btn-lg btn-block" style={{ marginTop: 18 }} disabled={busy || cart.isMutating}>
              {busy ? 'Placing order…' : 'Place order'}
            </button>
            <p className="field-hint" style={{ marginTop: 12, textAlign: 'center' }}>
              By placing this order you confirm it is a demo. No payment is taken.
            </p>
          </aside>
        </form>
      ) : (
        <div className="checkout-layout">
          <section className="card card-pad">
            <span className="badge badge-navy">DEMO payment</span>
            <h3 className="h3" style={{ margin: '14px 0 6px' }}>
              Confirm your payment
            </h3>
            <p className="muted">
              Order <strong>{pendingOrder.order.orderNumber}</strong> · Amount{' '}
              <strong>
                <Money paise={pendingOrder.order.totalPaise} />
              </strong>
            </p>
            <p className="alert alert-warn" style={{ margin: '16px 0' }}>
              This is a simulated gateway. No card details are collected and no money is charged.
            </p>
            {paymentError ? <p className="alert alert-error" style={{ marginBottom: 16 }}>{paymentError}</p> : null}
            <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-accent btn-lg" disabled={busy} onClick={() => resolvePayment('success')}>
                Simulate successful payment
              </button>
              <button type="button" className="btn btn-outline btn-lg" disabled={busy} onClick={() => resolvePayment('failure')}>
                Simulate failed payment
              </button>
            </div>
            <p className="field-hint" style={{ marginTop: 14 }}>
              Order ID: {pendingOrder.order.id}
            </p>
          </section>
          <aside className="card card-pad summary">
            <h3 className="h3" style={{ marginBottom: 12 }}>
              Order summary
            </h3>
            {pendingOrder.order.items.map((item) => (
              <div key={item.variantId} className="summary-row">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <Money paise={item.unitPrice * item.quantity} />
              </div>
            ))}
            <div className="summary-row">
              <span>Shipping</span>
              {pendingOrder.order.shippingPaise === 0 ? <span className="discount">Free</span> : <Money paise={pendingOrder.order.shippingPaise} />}
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <Money paise={pendingOrder.order.totalPaise} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
