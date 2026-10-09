import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import { useWishlist } from '../../context/WishlistContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { BagIcon, HeartIcon, MenuIcon, CloseIcon, SearchIcon, UserIcon } from '../ui/Icons.jsx';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/collections/matchday', label: 'Matchday' },
  { to: '/collections/training-camp', label: 'Training' },
  { to: '/about', label: 'Our Story' },
  { to: '/contact', label: 'Contact' },
];

export function Header() {
  const navigate = useNavigate();
  const cart = useCart();
  const wishlist = useWishlist();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  function onSearch(event) {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
    setMenuOpen(false);
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <button
          type="button"
          className="icon-btn menu-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        <Link to="/" className="logo" onClick={() => setMenuOpen(false)}>
          <span className="logo-mark" aria-hidden="true" />
          Boundary11
        </Link>

        <nav className="nav" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <form className="header-search" role="search" onSubmit={onSearch}>
          <span className="search-icon" aria-hidden="true">
            <SearchIcon size={18} />
          </span>
          <label htmlFor="site-search" className="sr-only">
            Search products
          </label>
          <input
            id="site-search"
            className="input"
            type="search"
            placeholder="Search jerseys, caps, hoodies…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>

        <div className="header-actions">
          <NavLink to="/wishlist" className="icon-btn" aria-label="Wishlist">
            <HeartIcon />
            {wishlist.count > 0 ? <span className="count">{wishlist.count}</span> : null}
          </NavLink>
          <NavLink
            to={user ? '/account' : '/login'}
            className="icon-btn"
            aria-label={user ? 'Your account' : 'Sign in'}
          >
            <UserIcon />
          </NavLink>
          <NavLink to="/cart" className="icon-btn" aria-label="Shopping bag">
            <BagIcon />
            {cart.totals.itemCount > 0 ? <span className="count">{cart.totals.itemCount}</span> : null}
          </NavLink>
        </div>
      </div>

      <div className={`mobile-nav container ${menuOpen ? 'open' : ''}`}>
        <form role="search" onSubmit={onSearch} style={{ margin: '8px 0 12px' }}>
          <label htmlFor="mobile-search" className="sr-only">
            Search products
          </label>
          <input
            id="mobile-search"
            className="input"
            type="search"
            placeholder="Search products…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
        {NAV.map((item) => (
          <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)}>
            {item.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
