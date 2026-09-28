import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api.js';
import { errorMessage } from '../hooks.js';

export default function VerifyEmailPage() {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token');
  const [status, setStatus] = useState('ready');
  const [message, setMessage] = useState('');

  async function verifyEmail() {
    setStatus('loading');
    setMessage('');
    try {
      const res = await api.post('/auth/verify-email', { token });
      setMessage(res.data.message);
      setStatus('success');
    } catch (err) {
      setMessage(errorMessage(err, 'Could not verify your email.'));
      setStatus('error');
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand"><span className="display">CourtSide</span><span className="tag">Equipment Booking</span></div>
        <h2 style={{ fontSize: 24, margin: '20px 0 8px' }}>Verify your email</h2>
        {!message && <div className="login-sub">Confirm your email address to finish creating your account.</div>}
        {message && (
          <div className={`error-banner${status === 'success' ? ' verification-success' : ''}`} role="status">
            {message}
          </div>
        )}
        {status !== 'success' && (
          <button className="btn-primary" type="button" onClick={verifyEmail} disabled={!token || status === 'loading'}>
            {status === 'loading' ? 'Verifying…' : 'Verify email'}
          </button>
        )}
        {!token && <div className="login-sub">This verification link is missing its token.</div>}
        <Link className="forgot-link" to="/login">Return to log in</Link>
      </div>
    </div>
  );
}