import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Money } from '../ui/Money.jsx';
import { useCart } from '../../context/CartContext.jsx';

export function CouponForm() {
  const { coupon, setCoupon, appliedCoupon, totals } = useCart();
  const [value, setValue] = useState(coupon || '');

  return (
    <div style={{ marginTop: 14 }}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setCoupon(value.trim());
        }}
        className="row"
        style={{ gap: 8 }}
      >
        <label htmlFor="coupon" className="sr-only">
          Coupon code
        </label>
        <input
          id="coupon"
          className="input"
          placeholder="Coupon code"
          value={value}
          onChange={(event) => setValue(event.target.value.toUpperCase())}
        />
        <button type="submit" className="btn btn-outline btn-sm">
          Apply
        </button>
      </form>
      {appliedCoupon ? (
        <p className="field-hint row-between" style={{ marginTop: 8 }}>
          <span className="badge badge-green">Applied {appliedCoupon.code}</span>
          <button
            type="button"
            className="link-btn"
            style={{ color: 'var(--red)' }}
            onClick={() => {
              setValue('');
              setCoupon('');
            }}
          >
            Remove
          </button>
        </p>
      ) : value && coupon ? (
        <p className="field-error" style={{ marginTop: 8 }}>
          {totals?.couponReason || 'Coupon not valid for this order.'}
        </p>
      ) : null}
    </div>
  );
}

export function CartSummary({ showCheckout = true, actionLabel = 'Proceed to checkout', onAction, actionTo = '/checkout' }) {
  const { totals, items } = useCart();
  const empty = items.length === 0;

  return (
    <aside className="card card-pad summary" aria-label="Order summary">
      <h3 className="h3" style={{ marginBottom: 12 }}>
        Order summary
      </h3>
      <div className="summary-row">
        <span>Subtotal</span>
        <Money paise={totals.subtotalPaise} />
      </div>
      {totals.discountPaise > 0 ? (
        <div className="summary-row">
          <span>Discount</span>
          <span className="discount">
            −<Money paise={totals.discountPaise} />
          </span>
        </div>
      ) : null}
      <div className="summary-row">
        <span>Shipping</span>
        {totals.shippingPaise === 0 ? <span className="discount">Free</span> : <Money paise={totals.shippingPaise} />}
      </div>
      <div className="summary-row total">
        <span>Total</span>
        <Money paise={totals.totalPaise} />
      </div>

      <CouponForm />

      {showCheckout ? (
        empty ? (
          <Link to="/shop" className="btn btn-primary btn-block" style={{ marginTop: 18 }}>
            Browse products
          </Link>
        ) : onAction ? (
          <button type="button" className="btn btn-primary btn-block btn-lg" style={{ marginTop: 18 }} onClick={onAction}>
            {actionLabel}
          </button>
        ) : (
          <Link to={actionTo} className="btn btn-primary btn-block btn-lg" style={{ marginTop: 18 }}>
            {actionLabel}
          </Link>
        )
      ) : null}
      <p className="field-hint" style={{ marginTop: 12, textAlign: 'center' }}>
        Prices include GST. Demo checkout — no real payment is taken.
      </p>
    </aside>
  );
}
