import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { INVENTORY_REASONS } from '@boundary11/shared';
import { adminApi } from '../services/adminApi.js';
import { useInvalidatingMutation, useInventory, useMovements, keys } from '../hooks/useAdminQueries.js';
import { useToast } from '../context/ToastContext.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { Icon } from '../components/ui/Icons.jsx';
import { Spinner, ErrorState, TableSkeleton, EmptyState } from '../components/ui/States.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Link } from 'react-router-dom';

function StockBadge({ row }) {
  if (row.outOfStock) return <StatusBadge value="failed" />;
  if (row.lowStock) return <StatusBadge value="refunded" />;
  return <span className="badge badge-green"><span className="dot" />in stock</span>;
}

export function Inventory() {
  const { push } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const lowOnly = searchParams.get('low') === '1';

  const inventory = useInventory(lowOnly);
  const movements = useMovements(false);

  const [adjusting, setAdjusting] = useState(null);
  const [form, setForm] = useState({ delta: '', reason: 'restock', note: '' });
  const [errors, setErrors] = useState({});

  const adjustMutation = useInvalidatingMutation(
    (body) => adminApi.adjustInventory(body),
    [keys.inventory(false), keys.analytics],
  );

  function toggleLow() {
    const next = new URLSearchParams(searchParams);
    if (lowOnly) next.delete('low');
    else next.set('low', '1');
    setSearchParams(next, { replace: true });
  }

  function openAdjust(row) {
    setAdjusting(row);
    setForm({ delta: row.outOfStock ? '10' : '', reason: 'restock', note: '' });
    setErrors({});
  }

  async function submitAdjust(event) {
    event.preventDefault();
    setErrors({});
    try {
      const result = await adjustMutation.mutateAsync({
        variantId: adjusting.variantId,
        delta: Number(form.delta) || 0,
        reason: form.reason,
        note: form.note,
      });
      push(`Stock adjusted to ${result.variant.stock}`, 'success');
      setAdjusting(null);
    } catch (error) {
      setErrors(error.fields || { _: error.message });
    }
  }

  if (inventory.isLoading) return <Spinner label="Loading inventory…" />;
  if (inventory.isError) return <ErrorState message={inventory.error.message} onRetry={inventory.refetch} />;

  const lowCount = lowOnly ? inventory.data.length : inventory.data.filter((r) => r.lowStock).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Inventory</h2>
          <p>
            {inventory.data.length} variants · {lowCount} need attention
          </p>
        </div>
        <label className="btn btn-outline btn-sm" style={{ gap: 8 }}>
          <input type="checkbox" checked={lowOnly} onChange={toggleLow} />
          Low stock only
        </label>
      </div>

      {inventory.isError ? null : inventory.data.length === 0 ? (
        <EmptyState title="No variants match" description="Try clearing the low-stock filter." />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Variant</th>
                  <th className="num">Stock</th>
                  <th className="num">Low at</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inventory.data.map((row) => (
                  <tr key={row.variantId}>
                    <td>
                      <Link to={`/products/${row.productId}/edit`} style={{ fontWeight: 600 }}>
                        {row.productName}
                      </Link>
                    </td>
                    <td className="muted">{row.sku}</td>
                    <td>{row.size}{row.color ? ` / ${row.color}` : ''}</td>
                    <td className="num"><strong>{row.stock}</strong></td>
                    <td className="num muted">{row.lowStockThreshold}</td>
                    <td><StockBadge row={row} /></td>
                    <td>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => openAdjust(row)}>
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card-pad">
        <h3 style={{ marginBottom: 6 }}>Recent stock movements</h3>
        <p className="muted" style={{ marginBottom: 14, fontSize: '0.85rem' }}>Latest adjustments across all variants.</p>
        {movements.isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : movements.isError ? (
          <ErrorState message={movements.error.message} onRetry={movements.refetch} />
        ) : movements.data.length === 0 ? (
          <EmptyState title="No movements recorded" />
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>SKU</th>
                    <th className="num">Delta</th>
                    <th className="num">Balance</th>
                    <th>Reason</th>
                    <th>Note</th>
                    <th>Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.data.slice(0, 20).map((m) => (
                    <tr key={m.id}>
                      <td className="muted">{new Date(m.createdAt).toLocaleString('en-IN')}</td>
                      <td className="muted" style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{m.variantId}</td>
                      <td className="num"><strong className={m.delta > 0 ? '' : ''}>{m.delta > 0 ? `+${m.delta}` : m.delta}</strong></td>
                      <td className="num">{m.balanceAfter}</td>
                      <td className="muted">{m.reason}</td>
                      <td className="muted">{m.note || '—'}</td>
                      <td className="muted">{m.actor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {adjusting && (
        <Modal
          title={`Adjust stock — ${adjusting.sku}`}
          onClose={() => setAdjusting(null)}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setAdjusting(null)}>Cancel</button>
              <button type="submit" form="adjust-form" className="btn btn-primary" disabled={adjustMutation.isPending}>
                {adjustMutation.isPending ? 'Saving…' : 'Apply'}
              </button>
            </>
          }
        >
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            <strong>{adjusting.productName}</strong> · {adjusting.size}{adjusting.color ? ` / ${adjusting.color}` : ''} · current stock <strong>{adjusting.stock}</strong>
          </div>
          <form id="adjust-form" onSubmit={submitAdjust} noValidate>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="delta">Change (±)</label>
                <input id="delta" className="input" type="number" value={form.delta} onChange={(e) => setForm({ ...form, delta: e.target.value })} placeholder="-2 or +10" autoFocus />
                {errors.delta ? <span className="field-error">{errors.delta}</span> : null}
              </div>
              <div className="field">
                <label htmlFor="reason">Reason</label>
                <select id="reason" className="select" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                  {INVENTORY_REASONS.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
                {errors.reason ? <span className="field-error">{errors.reason}</span> : null}
              </div>
            </div>
            <div className="field">
              <label htmlFor="note">Note</label>
              <input id="note" className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional context for the audit trail" />
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}