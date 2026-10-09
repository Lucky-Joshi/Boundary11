import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { Icon } from '../ui/Icons.jsx';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/products', label: 'Products', icon: 'products' },
  { to: '/categories', label: 'Categories', icon: 'categories' },
  { to: '/inventory', label: 'Inventory', icon: 'inventory' },
  { to: '/orders', label: 'Orders', icon: 'orders' },
  { to: '/customers', label: 'Customers', icon: 'customers' },
  { to: '/discounts', label: 'Discounts', icon: 'discounts' },
  { to: '/content', label: 'Content', icon: 'content' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export function AdminLayout() {
  const { user, logout, isAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const initials = (user?.fullName || 'Staff')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="admin-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="mark" />
          Boundary11
        </div>
        <span className="sidebar-badge">Admin console</span>
        <nav className="sidebar-nav" onClick={() => setOpen(false)}>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <p style={{ color: '#fff', fontWeight: 600 }}>{user?.fullName}</p>
          <p>{isAdmin ? 'Administrator' : 'Support staff'}</p>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button type="button" className="hamburger" onClick={() => setOpen((v) => !v)} aria-label="Toggle navigation">
            <Icon name="menu" size={20} />
          </button>
          <h1>Boundary11 Operations</h1>
          <span className="spacer" />
          <div className="user-chip">
            <span className="avatar">{initials}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.email}</span>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
            <Icon name="logout" size={16} />
            Sign out
          </button>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
