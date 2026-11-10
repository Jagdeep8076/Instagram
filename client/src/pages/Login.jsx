import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import FloatingInput from '../components/FloatingInput';
import { BrandLogo } from '../components/Navbar';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ login: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const notice = location.state?.notice || '';
  const canSubmit = form.login.trim().length > 0 && form.password.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setErr('');
    setBusy(true);

    try {
      const res = await login({ login: form.login.trim(), password: form.password });
      if (res?.needsVerification) {
        nav('/accounts/confirm-email', { state: { email: res.email, username: res.username } });
        return;
      }
      nav('/');
    } catch (x) {
      if (x.response?.data?.needsVerification) {
        nav('/accounts/confirm-email', {
          state: { email: x.response.data.email, username: x.response.data.username },
        });
        return;
      }
      setErr(x.response?.data?.msg || 'Incorrect username or password. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card-content">
        <div className="auth-brand-header">
          <BrandLogo size={36} />
        </div>

        <h1 className="auth-heading">Log into Instaclone</h1>
        <p className="auth-subtext muted">Welcome back! Please enter your details.</p>

        {notice && (
          <div className="auth-notice success-banner">
            <i className="ri-checkbox-circle-fill" /> {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <FloatingInput
            id="login-identifier"
            label="Username or email"
            value={form.login}
            onChange={(e) => setForm({ ...form, login: e.target.value })}
            autoComplete="username"
            required
            disabled={busy}
          />

          <FloatingInput
            id="login-password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="current-password"
            required
            disabled={busy}
            endAdornment={
              <button
                type="button"
                className="input-adornment-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex="-1"
              >
                <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} />
              </button>
            }
          />

          <div className="auth-actions">
            <button
              type="submit"
              className="btn-pill btn-primary"
              disabled={!canSubmit || busy}
            >
              {busy ? 'Logging in…' : 'Log in'}
            </button>

            <Link
              to="/accounts/password/reset"
              className="btn-pill btn-secondary center-text"
            >
              Forgot password?
            </Link>

            <Link
              to="/accounts/emailsignup"
              className="btn-pill btn-outline center-text"
            >
              Create new account
            </Link>
          </div>

          {err && (
            <div className="auth-error-banner" role="alert">
              <i className="ri-error-warning-fill" />
              <span>{err}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

