import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import FloatingInput from '../components/FloatingInput';

export default function VerifyEmail() {
  const nav = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();

  const email = location.state?.email || '';
  const username = location.state?.username || '';

  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState('');
  const [err, setErr] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!email) {
      nav('/accounts/emailsignup');
      return;
    }
  }, [email, nav]);

  // 60-second cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    const cleanCode = code.trim();
    if (cleanCode.length !== 6 || busy) return;
    setErr('');
    setBusy(true);

    try {
      const { data } = await api.post('/auth/verify-email', {
        email,
        code: cleanCode,
      });

      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      if (data.user) {
        setUser(data.user);
      }
      nav('/', { replace: true });
    } catch (ex) {
      const msg = ex.response?.data?.msg || 'Verification failed. Please check the code.';
      setErr(msg);
      if (ex.response?.data?.attemptsRemaining !== undefined) {
        setAttemptsRemaining(ex.response.data.attemptsRemaining);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setErr('');
    setResendNotice('');

    try {
      await api.post('/auth/resend-code', { email });
      setResendNotice('A new confirmation code has been sent.');
      setCooldown(60);
      setAttemptsRemaining(5);
    } catch (ex) {
      setErr(ex.response?.data?.msg || 'Failed to resend code. Please try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card-content">
        <div className="auth-top-nav">
          <button
            type="button"
            className="icon-btn auth-back-btn"
            onClick={() => nav('/accounts/emailsignup')}
            aria-label="Back to signup"
          >
            <i className="ri-arrow-left-s-line" />
          </button>
        </div>

        <div className="auth-badge-icon">
          <i className="ri-mail-check-line" />
        </div>

        <h1 className="auth-heading">Enter confirmation code</h1>
        <p className="auth-subtext muted">
          Enter the 6-digit code we sent to <b>{email}</b>.
        </p>

        {resendNotice && (
          <div className="auth-notice success-banner">
            <i className="ri-checkbox-circle-fill" /> {resendNotice}
          </div>
        )}

        <form onSubmit={handleVerify} className="auth-form" noValidate>
          <FloatingInput
            id="confirmation-code"
            label="Confirmation code (6 digits)"
            value={code}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(val);
            }}
            maxLength={6}
            required
            disabled={busy}
            autoComplete="one-time-code"
          />

          <p className="muted small" style={{ margin: '-4px 0 16px' }}>
            Attempts remaining: <b>{attemptsRemaining}</b> · Code expires in 10 minutes
          </p>

          <div className="auth-actions">
            <button
              type="submit"
              className="btn-pill btn-primary"
              disabled={code.trim().length !== 6 || busy}
            >
              {busy ? 'Verifying…' : 'Next'}
            </button>

            <button
              type="button"
              className="btn-pill btn-secondary"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
            >
              {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
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

