import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, role } = useAuth();

  // Not logged in → login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but role is missing → broken/stale session, force fresh login
  if (!role) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  // Force first-login password change before accessing any page
  if (localStorage.getItem('is_first_login') === 'true') {
    return <Navigate to="/change-password" replace />;
  }

  // Role doesn't match this route → access denied
  if (roles.length > 0 && !roles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;