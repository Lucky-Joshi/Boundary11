import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext.jsx';
import { subscribeNewsletter } from '../../services/orders.js';

export function Footer() {
  const { push } = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  async function subscribe(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await subscribeNewsletter(email);
      push(result.message || 'Subscribed', 'success');
      setEmail('');
    } catch (error) {
      push(error.message || 'Could not subscribe', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="newsletter" style={{ marginTop: 48 }}>
          <div>
            <h2 className="h2">Join the Boundary11 newsletter</h2>
            <p className="muted" style={{ color: '#a9bae0', marginTop: 8 }}>
              New drops, restocks and training tips. This is a prototype — no email is actually sent.
            </p>
          </div>
          <form onSubmit={subscribe}>
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              className="input"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="submit" className="btn btn-accent" disabled={busy}>
              {busy ? 'Subscribing…' : 'Subscribe'}
            </button>
          </form>
        </div>

        <div className="footer-grid" style={{ paddingTop: 40 }}>
          <div>
            <span className="logo">
              <span className="logo-mark" aria-hidden="true" />
              Boundary11
            </span>
            <p className="muted" style={{ color: '#a9bae0', marginTop: 12, maxWidth: '34ch' }}>
              Original cricket-inspired merchandise for players, supporters and everyone in between.
            </p>
            <p className="disclaimer">
              Boundary11 is an original, fictional brand created for this demo. It is not affiliated
              with, endorsed by, or licensed by any cricket board or team.
            </p>
          </div>
          <div>
            <h4>Shop</h4>
            <Link to="/shop">All products</Link>
            <Link to="/collections/matchday">Matchday</Link>
            <Link to="/collections/training-camp">Training camp</Link>
            <Link to="/collections/fan-favourites">Fan favourites</Link>
            <Link to="/collections/new-season">New season</Link>
          </div>
          <div>
            <h4>Help</h4>
            <Link to="/contact">Contact us</Link>
            <Link to="/shipping-policy">Shipping policy</Link>
            <Link to="/returns-policy">Returns policy</Link>
            <Link to="/account/orders">Track an order</Link>
            <Link to="/about">About Boundary11</Link>
          </div>
          <div>
            <h4>Legal</h4>
            <Link to="/privacy">Privacy policy</Link>
            <Link to="/terms">Terms &amp; conditions</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Boundary11 (demo). All rights reserved.</span>
          <span>Built with React, Express and Supabase-ready architecture.</span>
        </div>
      </div>
    </footer>
  );
}
