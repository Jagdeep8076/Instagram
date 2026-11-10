import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import FloatingInput from '../components/FloatingInput';

export default function ResetPasswordConfirm() {
  const { token } = useParams();
  const nav = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = password.length >= 8 && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setErr('Password must be at least 8 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setErr('Passwords do not match');
      return;
    }
    setErr('');
    setBusy(true);

    try {
      await api.post(`/auth/reset-password/${token}`, {
        password,
      });
      nav('/login', {
        state: { notice: 'Password changed successfully! Please log in with your new password.' },
        replace: true,
      });
    } catch (ex) {
      setErr(ex.response?.data?.msg || 'Password reset link is invalid or has expired.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card-content">
        <h1 className="auth-heading">Create a new password</h1>
        <p className="auth-subtext muted">
          Create a new password that is at least 8 characters long. A strong password includes a mix of letters, numbers, and symbols.
        </p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <FloatingInput
            id="reset-password"
            label="New password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={busy}
            autoComplete="new-password"
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

          <FloatingInput
            id="reset-confirm-password"
            label="Confirm new password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={busy}
            autoComplete="new-password"
          />

          {password && password.length < 8 && (
            <p className="muted small">Password must be at least 8 characters</p>
          )}

          {password && confirmPassword && password !== confirmPassword && (
            <p className="error small">Passwords do not match</p>
          )}

          <div className="auth-actions">
            <button
              type="submit"
              className="btn-pill btn-primary"
              disabled={!canSubmit || busy}
            >
              {busy ? 'Updating…' : 'Reset password'}
            </button>
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

