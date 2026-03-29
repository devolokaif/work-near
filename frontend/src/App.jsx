// ============================================================
// WorkNear — App Router (src/App.jsx)
// ============================================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout/Layout';
import ProtectedRoute  from './components/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import { LoginPage } from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import HomePage from './pages/Home/HomePage';
import JobsPage from './pages/Jobs/JobsPage';
import JobDetailPage from './pages/Jobs/JobDetailPage';
import PostJobPage from './pages/Jobs/PostJobPage';
import BookingsPage from './pages/Bookings/BookingsPage';
import BookingDetailPage from './pages/Bookings/BookingDetailPage';
import WorkerProfilePage from './pages/Workers/WorkerProfilePage';
import WorkerDashboard from './pages/Dashboard/WorkerDashboard';
import EmployerDashboard from './pages/Dashboard/EmployerDashboard';
import ProfilePage from './pages/Profile/ProfilePage';
import PaymentsPage from './pages/Payments/PaymentsPage';
import WalletPage from './pages/Payments/WalletPage';
import TrackingPage from './pages/Tracking/TrackingPage';
import NotificationsPage from './pages/Notifications/NotificationsPage';
import SearchPage from './pages/Search/SearchPage';
import AdminPanel from './pages/Admin/AdminPanel';
// import DashboardRedirect from './pages/Dashboard/DashboardRedirect';

function App() {
  const { user } = useAuthStore();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={!user ? <LandingPage /> : <Navigate to="/home" />} />
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/dashboard" />} />
      

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/jobs/post" element={<PostJobPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/bookings/:id" element={<BookingDetailPage />} />
          <Route path="/tracking/:bookingId" element={<TrackingPage />} />
          <Route path="/workers/:id" element={<WorkerProfilePage />} />
          {/* <Route path="/dashboard" element={<DashboardRedirect/>} /> */}
          {/* <Route path="/employer/dashboard" element={<EmployerDashboard/>} /> */}
          {/* <Route path="/worker/dashboard" element={<WorkerDashboard/>} /> */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>
      </Route>

      {/* Admin */}
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="/admin/*" element={<AdminPanel />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;