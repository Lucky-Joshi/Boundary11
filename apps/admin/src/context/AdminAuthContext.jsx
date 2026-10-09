import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken } from '../services/api.js';

const AdminAuthContext = createContext(null);

const STAFF_ROLES = ['admin', 'support'];

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('admin-auth:expired', onExpired);
    return () => window.removeEventListener('admin-auth:expired', onExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await api.post('/auth/login', { email, password });
    if (!STAFF_ROLES.includes(result.user.role)) {
      throw new Error('This account does not have access to the admin console.');
    }
    setAuthToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Best effort — the local token is still cleared below.
    }
    setAuthToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), isAdmin: user?.role === 'admin', login, logout }),
    [user, login, logout],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return context;
}
