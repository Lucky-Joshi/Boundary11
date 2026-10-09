import { useState } from 'react';
import { downloadExport } from '../../services/adminApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Icon } from './Icons.jsx';

/** Downloads a server-generated CSV export (orders, customers or inventory). */
export function ExportButton({ kind, label = 'Export CSV' }) {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      await downloadExport(kind);
      push('Export downloaded', 'success');
    } catch (error) {
      push(error.message || 'Export failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn btn-outline btn-sm" onClick={handleClick} disabled={busy}>
      <Icon name="external" size={15} />
      {busy ? 'Exporting…' : label}
    </button>
  );
}
