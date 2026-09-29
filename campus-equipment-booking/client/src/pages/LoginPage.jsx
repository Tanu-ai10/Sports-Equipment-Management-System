import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';
import { errorMessage } from '../hooks.js';
import { isStrongPassword, PASSWORD_RULES } from '../passwordRules.js';

const ROLES = [
  { key: 'Student', icon: '🎓' },
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
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegistrationPassword, setShowRegistrationPassword] = useState(false);
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordIsStrong = isStrongPassword(password);

  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      const user = await login(email, password, role);
      const dest = user.role === 'Student' ? '/student' : '/admin';
      navigate(dest);
    } catch (err) {
      setError(errorMessage(err, 'Login failed. Check your email and password.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!passwordIsStrong) {
      setError('Choose a password that meets all the requirements.');
      setInfo('');
      return;
    }
    setError(''); setInfo(''); setLoading(true);
    try {
      const res = await api.post(
        '/auth/register',
        { name, email, password, role, department, phone },
        { timeout: 30_000 }
      );
      setInfo(res.data.message);
      setPassword('');
      setMode('login');
    } catch (err) {
      setError(errorMessage(
        err,
        err.code === 'ECONNABORTED'
          ? 'Signup timed out while contacting the email service. Please try again later.'
          : 'Could not create account.'
      ));
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
            <div className="password-field">
              <input className="input" type={showLoginPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
              <button className="password-visibility" type="button" aria-label={showLoginPassword ? 'Hide password' : 'Show password'} aria-pressed={showLoginPassword} onClick={() => setShowLoginPassword((visible) => !visible)}>
                {showLoginPassword ? 'Hide' : 'Show'}
              </button>
            </div>
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
            <div className="password-field">
              <input className="input" type={showRegistrationPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" placeholder="Create a strong password" />
              <button className="password-visibility" type="button" aria-label={showRegistrationPassword ? 'Hide password' : 'Show password'} aria-pressed={showRegistrationPassword} onClick={() => setShowRegistrationPassword((visible) => !visible)}>
                {showRegistrationPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="password-rules" aria-label="Password requirements">
              {PASSWORD_RULES.map(({ label, test }) => (
                <div key={label} className={test(password) ? 'met' : ''}>
                  {test(password) ? '\u2713' : '\u2022'} {label}
                </div>
              ))}
            </div>
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
