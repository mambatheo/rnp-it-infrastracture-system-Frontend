import { useMemo } from 'react';

const BASE = (process.env.REACT_APP_API_URL || 'https://historical-clair-it-infrastracture-system-e80431e7.koyeb.app') + '/api/v1';

/**
 * Reads auth state from localStorage and exposes helpers.
 * No Context needed — keeps it simple and works across components.
 */
export function useAuth() {
  const token        = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');
  const role         = localStorage.getItem('role');
  const rawUser      = localStorage.getItem('user');

  const user = useMemo(() => {
    try { return rawUser ? JSON.parse(rawUser) : null; }
    catch { return null; }
  }, [rawUser]);

  const isAuthenticated = !!token;

  /** Check if current user has one of the given roles */
  const can = (...roles) => roles.includes(role);

  const logout = async () => {
    // Clear session first so ProtectedRoute sees isAuthenticated=false immediately
    localStorage.clear();
    // Navigate BEFORE the async call so React Router + ProtectedRoute redirect to /login, not /unauthorized
    window.location.replace('/login');
    // Fire blacklist call in background (non-blocking)
    try {
      await fetch(`${BASE}/accounts/auth/logout/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });
    } catch { /* ignore */ }
  };

  return { user, role, isAuthenticated, can, logout };
}

export default useAuth;
