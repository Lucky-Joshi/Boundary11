const TONES = {
  pending: 'badge-amber',
  paid: 'badge-blue',
  processing: 'badge-blue',
  shipped: 'badge-navy',
  delivered: 'badge-green',
  cancelled: 'badge-red',
  refunded: 'badge-amber',
  failed: 'badge-red',
  published: 'badge-green',
  draft: 'badge',
  archived: 'badge-red',
  active: 'badge-green',
  disabled: 'badge-red',
  admin: 'badge-navy',
  support: 'badge-blue',
  customer: 'badge',
};

export function StatusBadge({ value }) {
  return (
    <span className={`badge ${TONES[value] || 'badge'}`}>
      <span className="dot" />
      {value}
    </span>
  );
}
