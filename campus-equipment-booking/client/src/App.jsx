import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import VerifyEmailPage from './pages/VerifyEmailPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import LandingPage from './pages/LandingPage.jsx';

function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    return <Navigate to={homeFor(user)} replace />;
  }
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={homeFor(user)} replace /> : <LandingPage />} />
      <Route path="/login" element={user ? <Navigate to={homeFor(user)} replace /> : <LoginPage />} />
      <Route path="/student" element={<RequireRole role="Student"><StudentDashboard /></RequireRole>} />
      <Route path="/admin" element={<RequireRole role="Admin"><AdminDashboard /></RequireRole>} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<Navigate to={user ? homeFor(user) : '/'} replace />} />
    </Routes>
  );
}

function homeFor(user) {
  if (user.role === 'Student') return '/student';
  return '/admin';
}
