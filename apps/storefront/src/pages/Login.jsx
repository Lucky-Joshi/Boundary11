import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const redirectTo = location.state?.from || '/account';

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email, form.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container page">
      <div className="auth-wrap">
        <div className="card card-pad auth-card">
          <h1 className="h2">Welcome back</h1>
          <p className="muted" style={{ margin: '6px 0 20px' }}>
            Sign in to view your orders and saved items.
          </p>

          {error ? <p className="alert alert-error" style={{ marginBottom: 16 }}>{error}</p> : null}

          <form onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                className="input"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                className="input"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="muted" style={{ marginTop: 16, fontSize: '0.9rem' }}>
            New to Boundary11? <Link to="/register" style={{ color: 'var(--blue)', fontWeight: 600 }}>Create an account</Link>
          </p>
        </div>

        <div className="auth-aside">
          <strong>Demo accounts</strong>
          <p style={{ marginTop: 6 }}>
            Customer: <code>fan@boundary11.example</code> / <code>customer123</code>
          </p>
          <p>
            Admin (for the admin app): <code>admin@boundary11.example</code> / <code>admin12345</code>
          </p>
          <p style={{ marginTop: 6 }}>
            These are prototype credentials. Authentication tokens are held in memory only and are not
            written to localStorage.
          </p>
        </div>
      </div>
    </div>
  );
}
