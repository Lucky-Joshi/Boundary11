import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  function validate() {
    const next = {};
    if (form.fullName.trim().length < 2) next.fullName = 'Enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email.';
    if (form.password.length < 8) next.password = 'Use at least 8 characters.';
    else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      next.password = 'Include at least one letter and one number.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    setErrors({});
    if (!validate()) return;
    setBusy(true);
    try {
      await register(form);
      navigate('/account', { replace: true });
    } catch (err) {
      setErrors(err.fields || { _: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container page">
      <div className="auth-wrap">
        <div className="card card-pad auth-card">
          <h1 className="h2">Create your account</h1>
          <p className="muted" style={{ margin: '6px 0 20px' }}>
            Track orders, save addresses and build a wishlist.
          </p>

          {errors._ ? <p className="alert alert-error" style={{ marginBottom: 16 }}>{errors._}</p> : null}

          <form onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="reg-name">Full name</label>
              <input
                id="reg-name"
                className="input"
                autoComplete="name"
                value={form.fullName}
                aria-invalid={Boolean(errors.fullName)}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              />
              {errors.fullName ? <span className="field-error">{errors.fullName}</span> : null}
            </div>
            <div className="field">
              <label htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                className="input"
                type="email"
                autoComplete="email"
                value={form.email}
                aria-invalid={Boolean(errors.email)}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
              {errors.email ? <span className="field-error">{errors.email}</span> : null}
            </div>
            <div className="field">
              <label htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                className="input"
                type="password"
                autoComplete="new-password"
                value={form.password}
                aria-invalid={Boolean(errors.password)}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
              {errors.password ? (
                <span className="field-error">{errors.password}</span>
              ) : (
                <span className="field-hint">At least 8 characters with a letter and a number.</span>
              )}
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="muted" style={{ marginTop: 16, fontSize: '0.9rem' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
