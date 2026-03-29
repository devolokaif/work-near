// ─── ProtectedRoute (src/components/ProtectedRoute.jsx) ─────
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function ProtectedRoute({ roles }) {
  const { user, accessToken } = useAuthStore();

  if (!accessToken) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard"/>;
  }

  return <Outlet />;
}
