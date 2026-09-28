import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api.js';
import { errorMessage } from '../hooks.js';
import { isStrongPassword, PASSWORD_RULES } from '../passwordRules.js';

export default function ResetPasswordPage() {
  const location = useLocation();
  const resetToken = new URLSearchParams(location.search).get('token');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!isStrongPassword(password)) {
      setError('Choose a password that meets all the requirements.');
      return;
    }
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { resetToken, newPassword: password });
      setMessage(res.data.message);
      setPassword('');
      setConfirmation('');
    } catch (err) {
      setError(errorMessage(err, 'Could not reset your password.'));
    } finally {
      setLoading(false);
    }
  }

  const resetComplete = Boolean(message);

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand"><span className="display">CourtSide</span><span className="tag">Equipment Booking</span></div>
        <h2 style={{ fontSize: 24, margin: '20px 0 8px' }}>Reset password</h2>
        <div className="login-sub">
          {resetToken ? 'Choose a new password for your account.' : 'This reset link is missing its token.'}
        </div>

        {error && <div className="error-banner" role="alert">{error}</div>}
        {message && <div className="error-banner verification-success" role="status">{message}</div>}

        {resetToken && !resetComplete && (
          <form onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="new-password">New password</label>
            <div className="password-field">
              <input
                id="new-password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="new-password"
                placeholder="Create a strong password"
              />
              <button
                className="password-visibility"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="password-rules" aria-label="Password requirements">
              {PASSWORD_RULES.map(({ label, test }) => (
                <div key={label} className={test(password) ? 'met' : ''}>
                  {test(password) ? '\u2713' : '\u2022'} {label}
                </div>
              ))}
            </div>

            <label className="field-label" htmlFor="confirm-password">Confirm new password</label>
            <div className="password-field">
              <input
                id="confirm-password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
                autoComplete="new-password"
                placeholder="Re-enter your password"
              />
            </div>
            <button className="btn-primary" disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}

        <Link className="forgot-link" to="/login">Return to log in</Link>
      </div>
    </div>
  );
}
