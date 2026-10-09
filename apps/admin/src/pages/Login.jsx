import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';

export function Login() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = location.state?.from || '/dashboard';

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email.trim(), form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  }

  function fill(email, password) {
    setForm({ email, password });
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="row" style={{ gap: 10, marginBottom: 6 }}>
          <span
            style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(145deg,#2563eb,#22d3ee)' }}
          />
          <strong style={{ fontSize: '1.2rem' }}>Boundary11 Admin</strong>
        </div>
        <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 22 }}>
          Staff access only. Sign in with an administrator or support account.
        </p>

        {error ? <p className="alert alert-error" style={{ marginBottom: 16 }}>{error}</p> : null}

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="username"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="alert alert-info" style={{ marginTop: 22, fontSize: '0.82rem' }}>
          <strong>Demo accounts</strong>
          <div className="stack" style={{ marginTop: 8, gap: 6 }}>
            <button type="button" className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => fill('admin@boundary11.example', 'admin12345')}>
              admin@boundary11.example / admin12345 (admin)
            </button>
            <button type="button" className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => fill('support@boundary11.example', 'support123')}>
              support@boundary11.example / support123 (support)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
