// import { Navigate } from 'react-router-dom';
// import { useAuthStore } from '../../stores/authStore';

// export default function DashboardRedirect() {
//   const { user } = useAuthStore();

//   if (!user) return <Navigate to="/login" />;

//   if (user.role === 'worker') {
//     return <Navigate to="/worker/dashboard" />;
//   } else if (user.role === 'employer') {
//     return <Navigate to="/employer/dashboard" />;
//   } else {
//     return <Navigate to="/home" />;
//   }
// }