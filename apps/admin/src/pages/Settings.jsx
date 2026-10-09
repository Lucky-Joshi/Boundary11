import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../services/adminApi.js';
import { keys, useSettings } from '../hooks/useAdminQueries.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import { Money } from '../components/ui/Money.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { Spinner, ErrorState, EmptyState } from '../components/ui/States.jsx';

export function Settings() {
  const { isAdmin } = useAdminAuth();
  const settings = useSettings();
  const staff = useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: adminApi.listStaff,
    enabled: isAdmin,
  });
  const audit = useQuery({
    queryKey: keys.audit,
    queryFn: adminApi.listAuditLogs,
    enabled: isAdmin,
  });

  if (settings.isLoading) return <Spinner label="Loading settings…" />;
  if (settings.isError) return <ErrorState message={settings.error.message} onRetry={settings.refetch} />;
  const s = settings.data;

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Settings</h2>
          <p>Store configuration and team information. Read-only in this prototype.</p>
        </div>
      </div>

      <div className="two-col">
        <div className="card card-pad">
          <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Store details</h3>
          <div className="spec-list">
            <div><dt>Store name</dt><dd>{s.storeName}</dd></div>
            <div><dt>Support email</dt><dd>{s.supportEmail}</dd></div>
            <div><dt>Support phone</dt><dd>{s.supportPhone}</dd></div>
            <div><dt>Currency</dt><dd>{s.currency}</dd></div>
            <div><dt>Free shipping at</dt><dd><Money paise={s.freeShippingThresholdPaise} withDecimals={false} /></dd></div>
            <div><dt>Flat shipping</dt><dd><Money paise={s.flatShippingPaise} withDecimals={false} /></dd></div>
          </div>
          <p className="muted" style={{ fontSize: '0.88rem', marginTop: 14 }}>{s.taxNote}</p>
          <p style={{ fontSize: '0.9rem', marginTop: 8 }}><strong>Announcement:</strong> {s.announcement}</p>
        </div>

        <div className="grid" style={{ gap: 16 }}>
          <div className="card card-pad">
            <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Staff accounts</h3>
            {isAdmin ? (
              staff.isLoading ? (
                <Spinner />
              ) : staff.isError ? (
                <ErrorState message={staff.error.message} onRetry={staff.refetch} />
              ) : !staff.data.items.length ? (
                <EmptyState title="No staff accounts" />
              ) : (
                <div className="stack">
                  {staff.data.items.map((member) => (
                    <div key={member.email} className="row-between">
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{member.name}</div>
                        <div className="muted" style={{ fontSize: '0.78rem' }}>{member.email}</div>
                      </div>
                      <StatusBadge value={member.role} />
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="alert alert-info">Only administrators can view staff accounts.</div>
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="card-pad">
          <h3 style={{ fontSize: '1rem', marginBottom: 6 }}>Audit log</h3>
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 14 }}>
            Every administrative action is recorded with the acting account.
          </p>
          {audit.isLoading ? (
            <Spinner />
          ) : audit.isError ? (
            <ErrorState message={audit.error.message} onRetry={audit.refetch} />
          ) : !audit.data.items.length ? (
            <EmptyState title="No audit entries yet" />
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Actor</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.data.items.slice(0, 50).map((entry) => (
                      <tr key={entry.id}>
                        <td className="muted">{new Date(entry.createdAt).toLocaleString('en-IN')}</td>
                        <td className="muted">{entry.actor}</td>
                        <td style={{ fontWeight: 600 }}>{entry.action}</td>
                        <td className="muted">{entry.entity}</td>
                        <td className="muted">{entry.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}