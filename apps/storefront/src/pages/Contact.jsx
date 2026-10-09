import { useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import { sendContactMessage } from '../services/orders.js';

export function Contact() {
  const { push } = useToast();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      const result = await sendContactMessage(form);
      setSent(true);
      push(result.message || 'Message received', 'success');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      setErrors(error.fields || { _: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container page">
      <div className="breadcrumbs">
        <span>Home</span>
        <span>/</span>
        <span>Contact</span>
      </div>

      <div className="auth-wrap" style={{ maxWidth: 720 }}>
        <h1 className="h1">Get in touch</h1>
        <p className="lead" style={{ margin: '8px 0 24px' }}>
          Questions about sizing, an order or a return? Send us a note and we&rsquo;ll get back to you.
          This is a prototype — no email is actually sent.
        </p>

        {sent ? <p className="alert alert-success" style={{ marginBottom: 18 }}>Thanks — your message was received.</p> : null}
        {errors._ ? <p className="alert alert-error" style={{ marginBottom: 18 }}>{errors._}</p> : null}

        <form className="card card-pad" onSubmit={submit} noValidate>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="c-name">Name</label>
              <input id="c-name" className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
              {errors.name ? <span className="field-error">{errors.name}</span> : null}
            </div>
            <div className="field">
              <label htmlFor="c-email">Email</label>
              <input id="c-email" className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
              {errors.email ? <span className="field-error">{errors.email}</span> : null}
            </div>
            <div className="field span-2">
              <label htmlFor="c-subject">Subject</label>
              <input id="c-subject" className="input" value={form.subject} onChange={(e) => set('subject', e.target.value)} />
              {errors.subject ? <span className="field-error">{errors.subject}</span> : null}
            </div>
            <div className="field span-2">
              <label htmlFor="c-message">Message</label>
              <textarea id="c-message" className="textarea" value={form.message} onChange={(e) => set('message', e.target.value)} />
              {errors.message ? <span className="field-error">{errors.message}</span> : null}
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
            {busy ? 'Sending…' : 'Send message'}
          </button>
        </form>

        <div className="card card-pad" style={{ marginTop: 20 }}>
          <h2 className="h3" style={{ marginBottom: 10 }}>Other ways to reach us</h2>
          <div className="spec-list">
            <div>
              <dt>Email</dt>
              <dd>support@boundary11.example</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>+91 90000 00000</dd>
            </div>
            <div>
              <dt>Hours</dt>
              <dd>Mon–Sat, 10:00–18:00 IST</dd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
