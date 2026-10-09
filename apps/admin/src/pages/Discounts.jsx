import { useState } from 'react';
import { rupeesToPaise } from '@boundary11/shared';
import { adminApi } from '../services/adminApi.js';
import { keys } from '../hooks/useAdminQueries.js';
import { useDiscounts, useInvalidatingMutation } from '../hooks/useAdminQueries.js';
import { useToast } from '../context/ToastContext.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { Money } from '../components/ui/Money.jsx';
import { Spinner, ErrorState, TableSkeleton, EmptyState } from '../components/ui/States.jsx';

const EMPTY = { code: '', type: 'percent', valueRupees: '', minSubtotalRupees: '', maxDiscountRupees: '', usageLimit: '' };

export function Discounts() {
  const { push } = useToast();
  const { data, isLoading, isError, error, refetch } = useDiscounts();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const createMutation = useInvalidatingMutation(
    (body) => adminApi.createDiscount(body),
    [keys.discounts],
  );

  function set(key, value) {
    setForm({ ...form, [key]: value });
  }

  async function submit(event) {
    event.preventDefault();
    setErrors({});
    try {
      await createMutation.mutateAsync({
        code: form.code,
        type: form.type,
        value: rupeesToPaise(Number(form.valueRupees) || 0),
        minSubtotalPaise: form.minSubtotalRupees ? rupeesToPaise(Number(form.minSubtotalRupees) || 0) : 0,
        maxDiscountPaise: form.maxDiscountRupees ? rupeesToPaise(Number(form.maxDiscountRupees) || 0) : null,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        active: true,
      });
      push(`Coupon ${form.code} created`, 'success');
      setForm(EMPTY);
    } catch (err) {
      setErrors(err.fields || { _: err.message });
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Discounts</h2>
          <p>Coupons customers can apply at checkout.</p>
        </div>
      </div>

      {errors._ ? <div className="alert alert-error">{errors._}</div> : null}

      <div className="card card-pad">
        <h3 style={{ marginBottom: 12 }}>New coupon</h3>
        <form onSubmit={submit} noValidate>
          <div className="inline-form">
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="code">Code</label>
              <input id="code" className="input" value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="POWERPLAY" style={{ width: 160 }} />
              {errors.code ? <span className="field-error">{errors.code}</span> : null}
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="type">Type</label>
              <select id="type" className="select" value={form.type} onChange={(e) => set('type', e.target.value)} style={{ width: 130 }}>
                <option value="percent">Percent</option>
                <option value="fixed">Fixed ₹</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="value">Value (₹)</label>
              <input id="value" className="input" type="number" min="1" value={form.valueRupees} onChange={(e) => set('valueRupees', e.target.value)} style={{ width: 120 }} />
              {errors.value ? <span className="field-error">{errors.value}</span> : null}
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="min">Min subtotal (₹)</label>
              <input id="min" className="input" type="number" min="0" value={form.minSubtotalRupees} onChange={(e) => set('minSubtotalRupees', e.target.value)} style={{ width: 120 }} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="max">Max discount (₹)</label>
              <input id="max" className="input" type="number" min="0" value={form.maxDiscountRupees} onChange={(e) => set('maxDiscountRupees', e.target.value)} style={{ width: 120 }} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="uses">Usage limit</label>
              <input id="uses" className="input" type="number" min="1" value={form.usageLimit} onChange={(e) => set('usageLimit', e.target.value)} style={{ width: 100 }} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
              Create
            </button>
          </div>
        </form>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : isError ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : !isLoading && data.items.length === 0 ? (
        <EmptyState title="No coupons yet" />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th className="num">Value</th>
                  <th className="num">Min subtotal</th>
                  <th className="num">Max discount</th>
                  <th className="num">Used</th>
                  <th>Status</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((coupon) => (
                  <tr key={coupon.code}>
                    <td style={{ fontWeight: 700, letterSpacing: '0.03em' }}>{coupon.code}</td>
                    <td className="muted">{coupon.type}</td>
                    <td className="num">
                      {coupon.type === 'percent' ? `${coupon.value}%` : <Money paise={coupon.value} withDecimals={false} />}
                    </td>
                    <td className="num">{coupon.minSubtotalPaise ? <Money paise={coupon.minSubtotalPaise} withDecimals={false} /> : '—'}</td>
                    <td className="num">{coupon.maxDiscountPaise ? <Money paise={coupon.maxDiscountPaise} withDecimals={false} /> : '—'}</td>
                    <td className="num">{coupon.usedCount || 0}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}</td>
                    <td><StatusBadge value={coupon.active ? 'active' : 'disabled'} /></td>
                    <td className="muted">{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('en-IN') : 'Never'}</td>
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