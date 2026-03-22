import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { ROLES } from './config/permissions';
import ProtectedRoute from './components/ProtectedRoute';
import useIdleTimeout from './hooks/useIdleTimeout';

// Pages
import Dashboard   from './pages/Dashboard';
import Users       from './pages/Users';
import Equipment   from './pages/Equipment';
import EquipmentDetail from './pages/EquipmentDetail';
import MyEquipment from './pages/MyEquipment';
import MyEquipmentList from './pages/MyEquipmentList';
import Deployments from './pages/Deployments';
import Stock       from './pages/Stock';
import Maintenance from './pages/Maintenance';
import MyRequests  from './pages/MyRequests';
import Reports     from './pages/Reports';
import Settings    from './pages/Settings';
import Login           from './pages/Login';
import ChangePassword  from './pages/ChangePassword';
import Unauthorized    from './pages/Unauthorized';

// Inner component — must be inside Router so useNavigate works
function AppShell() {
  const navigate = useNavigate();

  const handleIdleLogout = useCallback(() => {
    localStorage.clear();
    navigate('/login', { replace: true });
  }, [navigate]);

  // Runs only when user is logged in; auto-logs out after 15 min of inactivity
  const isLoggedIn = !!localStorage.getItem('access_token');
  useIdleTimeout(isLoggedIn ? { onLogout: handleIdleLogout } : { onLogout: null });

  return (
    <Routes>
      {/* Public */}
      <Route path="/"              element={<Navigate to="/dashboard" replace />} />
      <Route path="/login"           element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/unauthorized"    element={<Unauthorized />} />


      {/* All authenticated users */}
      <Route path="/dashboard" element={
        <ProtectedRoute roles={[ROLES.ADMIN, ROLES.IT_STAFF, ROLES.TECHNICIAN, ROLES.USER]}>
          <Dashboard />
        </ProtectedRoute>
      } />

      {/* Admin only */}
      <Route path="/users/*" element={
        <ProtectedRoute roles={[ROLES.ADMIN]}>
          <Users />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute roles={[ROLES.ADMIN]}>
          <Settings />
        </ProtectedRoute>
      } />

      {/* Admin + IT Staff */}
      <Route path="/equipment/:id" element={
        <ProtectedRoute roles={[ROLES.ADMIN, ROLES.IT_STAFF]}>
          <EquipmentDetail />
        </ProtectedRoute>
      } />
      <Route path="/equipment" element={
        <ProtectedRoute roles={[ROLES.ADMIN, ROLES.IT_STAFF]}>
          <Equipment />
        </ProtectedRoute>
      } />
      <Route path="/stock" element={
        <ProtectedRoute roles={[ROLES.ADMIN, ROLES.IT_STAFF]}>
          <Stock />
        </ProtectedRoute>
      } />
      <Route path="/deployments/*" element={
        <ProtectedRoute roles={[ROLES.ADMIN, ROLES.IT_STAFF]}>
          <Deployments />
        </ProtectedRoute>
      } />
      <Route path="/reports/*" element={
        <ProtectedRoute roles={[ROLES.ADMIN, ROLES.IT_STAFF]}>
          <Reports />
        </ProtectedRoute>
      } />

      {/* Admin + IT Staff + Technician */}
      <Route path="/maintenance/*" element={
        <ProtectedRoute roles={[ROLES.ADMIN, ROLES.IT_STAFF, ROLES.TECHNICIAN]}>
          <Maintenance />
        </ProtectedRoute>
      } />

      {/* Technician + User */}
      <Route path="/my-equipment" element={
        <ProtectedRoute roles={[ROLES.TECHNICIAN, ROLES.USER]}>
          <MyEquipment />
        </ProtectedRoute>
      } />
      <Route path="/my-equipment/list" element={
        <ProtectedRoute roles={[ROLES.TECHNICIAN, ROLES.USER]}>
          <MyEquipmentList />
        </ProtectedRoute>
      } />

      {/* User only */}
      <Route path="/my-requests/*" element={
        <ProtectedRoute roles={[ROLES.USER]}>
          <MyRequests />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AppShell />;
}