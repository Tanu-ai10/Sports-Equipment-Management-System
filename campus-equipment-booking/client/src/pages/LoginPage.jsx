import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';
import { errorMessage } from '../hooks.js';

const ROLES = [
  { key: 'Student', icon: '🎓' },
  { key: 'Coordinator', icon: '🧑\u200d💼' },
  { key: 'Admin', icon: '🛡️' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [role, setRole] = useState('Student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      const user = await login(email, password);
      const dest = user.role === 'Student' ? '/student' : user.role === 'Coordinator' ? '/coordinator' : '/admin';
      navigate(dest);
    } catch (err) {
      setError(errorMessage(err, 'Login failed. Check your email and password.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      await api.post('/auth/register', { name, email, password, role, department, phone });
      setInfo('Account created — you can log in now.');
      setMode('login');
    } catch (err) {
      setError(errorMessage(err, 'Could not create account.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setInfo(res.data.message);
    } catch (err) {
      setError(errorMessage(err, 'Could not process the request.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand"><span className="display">CourtSide</span><span className="tag">Equipment Booking</span></div>
        <div className="login-sub">
          {mode === 'login' && 'Reserve sports equipment for practice, tournaments & events.'}
          {mode === 'register' && 'Create an account to get started.'}
          {mode === 'forgot' && 'Enter your email and we\u2019ll send a reset link.'}
        </div>

        {error && <div className="error-banner">{error}</div>}
        {info && <div className="error-banner" style={{ background: 'var(--turf-pale)', color: 'var(--turf)' }}>{info}</div>}

        {mode !== 'forgot' && (
          <>
            <label className="field-label">Role</label>
            <div className="role-picker">
              {ROLES.map((r) => (
                <button
                  type="button"
                  key={r.key}
                  className={`role-btn ${role === r.key ? 'active' : ''}`}
                  onClick={() => setRole(r.key)}
                >
                  <span className="ic">{r.icon}</span>{r.key}
                </button>
              ))}
            </div>
          </>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <label className="field-label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@college.edu" />
            <label className="field-label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            <button className="btn-primary" disabled={loading}>{loading ? 'Signing in…' : `Log in as ${role}`}</button>
            <button type="button" className="forgot-link" onClick={() => { setMode('forgot'); setError(''); setInfo(''); }}>Forgot password?</button>
            <div className="login-hint">
              New here?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode('register'); setError(''); setInfo(''); }} style={{ color: 'var(--scoreboard-blue)', fontWeight: 600 }}>
                Create an account
              </a>
            </div>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister}>
            <label className="field-label">Full name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Tanu Sharma" />
            <label className="field-label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@college.edu" />
            <label className="field-label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" />
            <div className="field-row">
              <div>
                <label className="field-label">Department</label>
                <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Optional" />
              </div>
              <div>
                <label className="field-label">Phone</label>
                <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <button className="btn-primary" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
            <button type="button" className="forgot-link" onClick={() => { setMode('login'); setError(''); setInfo(''); }}>Back to log in</button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot}>
            <label className="field-label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@college.edu" />
            <button className="btn-primary" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
            <button type="button" className="forgot-link" onClick={() => { setMode('login'); setError(''); setInfo(''); }}>Back to log in</button>
          </form>
        )}

      </div>
    </div>
  );
}
