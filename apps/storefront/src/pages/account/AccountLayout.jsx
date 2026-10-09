import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export function AccountLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function signOut() {
    logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="container page">
      <div className="breadcrumbs">
        <span>Home</span>
        <span>/</span>
        <span>Account</span>
      </div>
      <h1 className="h1" style={{ marginBottom: 22 }}>
        Hi{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
      </h1>

      <div className="account-layout">
        <nav className="account-nav" aria-label="Account">
          <NavLink to="/account" end>
            Overview
          </NavLink>
          <NavLink to="/account/orders">Orders</NavLink>
          <NavLink to="/wishlist">Wishlist</NavLink>
          <button type="button" className="link-btn" style={{ textAlign: 'left', padding: '11px 14px' }} onClick={signOut}>
            Sign out
          </button>
        </nav>
        <div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
