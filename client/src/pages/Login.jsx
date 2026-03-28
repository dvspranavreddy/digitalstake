import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/endpoints';
import './Auth.css';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false); // false | 'email' | 'reset'
  const [fpEmail, setFpEmail] = useState('');
  const [fpPassword, setFpPassword] = useState('');
  const [fpConfirm, setFpConfirm] = useState('');
  const [fpMessage, setFpMessage] = useState('');
  const [fpError, setFpError] = useState('');
  const [fpLoading, setFpLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form);
      navigate(data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotCheckEmail = async (e) => {
    e.preventDefault();
    setFpError('');
    setFpMessage('');
    setFpLoading(true);
    try {
      await authService.forgotPassword(fpEmail);
      setFpMessage('Account found! Set your new password below.');
      setForgotMode('reset');
    } catch (err) {
      setFpError(err.response?.data?.error || 'Email not found');
    } finally {
      setFpLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setFpError('');
    setFpMessage('');

    if (fpPassword !== fpConfirm) {
      setFpError('Passwords do not match');
      return;
    }
    if (fpPassword.length < 6) {
      setFpError('Password must be at least 6 characters');
      return;
    }

    setFpLoading(true);
    try {
      await authService.resetPassword(fpEmail, fpPassword);
      setFpMessage('Password reset successfully! You can now log in.');
      setTimeout(() => {
        setForgotMode(false);
        setFpEmail('');
        setFpPassword('');
        setFpConfirm('');
        setFpMessage('');
        setFpError('');
      }, 2000);
    } catch (err) {
      setFpError(err.response?.data?.error || 'Reset failed');
    } finally {
      setFpLoading(false);
    }
  };

  const resetForgot = () => {
    setForgotMode(false);
    setFpEmail('');
    setFpPassword('');
    setFpConfirm('');
    setFpMessage('');
    setFpError('');
  };

  // ─── Forgot Password UI ───
  if (forgotMode) {
    return (
      <div className="auth-page" id="forgot-password-page">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <h1>{forgotMode === 'email' ? 'Forgot Password' : 'Reset Password'}</h1>
              <p>
                {forgotMode === 'email'
                  ? 'Enter your registered email to verify your account'
                  : `Resetting password for ${fpEmail}`
                }
              </p>
            </div>

            {fpError && <div className="auth-error">{fpError}</div>}
            {fpMessage && <div className="auth-success">{fpMessage}</div>}

            {forgotMode === 'email' ? (
              <form onSubmit={handleForgotCheckEmail} className="auth-form">
                <div className="form-group">
                  <label htmlFor="fp-email">Email Address</label>
                  <input
                    id="fp-email"
                    type="email"
                    value={fpEmail}
                    onChange={e => setFpEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary auth-submit" disabled={fpLoading}>
                  {fpLoading ? 'Checking...' : 'Verify Email'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="auth-form">
                <div className="form-group">
                  <label htmlFor="fp-new-pw">New Password</label>
                  <input
                    id="fp-new-pw"
                    type="password"
                    value={fpPassword}
                    onChange={e => setFpPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="fp-confirm-pw">Confirm Password</label>
                  <input
                    id="fp-confirm-pw"
                    type="password"
                    value={fpConfirm}
                    onChange={e => setFpConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    minLength={6}
                  />
                </div>
                <button type="submit" className="btn-primary auth-submit" disabled={fpLoading}>
                  {fpLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}

            <p className="auth-switch">
              <button className="forgot-back-link" onClick={resetForgot}>← Back to Sign In</button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Normal Login UI ───
  return (
    <div className="auth-page" id="login-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Welcome Back</h1>
            <p>Sign in to your DigitalStake account</p>
          </div>
          {error && <div className="auth-error">{error}</div>}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="forgot-password-row">
              <button type="button" className="forgot-password-link" onClick={() => setForgotMode('email')}>
                Forgot password?
              </button>
            </div>
            <button type="submit" className="btn-primary auth-submit" disabled={loading} id="login-submit">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
