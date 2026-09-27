import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import CoordinatorDashboard from './pages/CoordinatorDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

function RequireRole({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    const dest = user.role === 'Student' ? '/student' : user.role === 'Coordinator' ? '/coordinator' : '/admin';
    return <Navigate to={dest} replace />;
  }
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeFor(user)} replace /> : <LoginPage />} />
      <Route path="/student" element={<RequireRole role="Student"><StudentDashboard /></RequireRole>} />
      <Route path="/coordinator" element={<RequireRole role="Coordinator"><CoordinatorDashboard /></RequireRole>} />
      <Route path="/admin" element={<RequireRole role="Admin"><AdminDashboard /></RequireRole>} />
      <Route path="*" element={<Navigate to={user ? homeFor(user) : '/login'} replace />} />
    </Routes>
  );
}

function homeFor(user) {
  if (user.role === 'Student') return '/student';
  if (user.role === 'Coordinator') return '/coordinator';
  return '/admin';
}
