import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import FloatingInput from '../components/FloatingInput';
import LegalModal from '../components/LegalModal';

export default function ForgotPassword() {
  const nav = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [err, setErr] = useState('');

  const canSubmit = identifier.trim().length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setErr('');
    setBusy(true);

    try {
      const { data } = await api.post('/auth/forgot-password', {
        identifier: identifier.trim(),
      });
      setSubmitted(true);
      if (data?.maskedEmail) {
        setMaskedEmail(data.maskedEmail);
      }
    } catch (ex) {
      // Even on error, server returns generic message or rate-limit error
      if (ex.response?.status === 429) {
        setErr('Too many recovery attempts. Please try again later.');
      } else {
        setSubmitted(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card-content">
        <div className="auth-top-nav">
          <button
            type="button"
            className="icon-btn auth-back-btn"
            onClick={() => nav('/login')}
            aria-label="Back to login"
          >
            <i className="ri-arrow-left-s-line" />
          </button>
        </div>

        <h1 className="auth-heading">Find your account</h1>
        <p className="auth-subtext muted">
          Enter your username or email address linked to your account.
        </p>

        {submitted ? (
          <div className="auth-success-card">
            <div className="auth-success-icon">
              <i className="ri-mail-send-line" />
            </div>
            <h3>Check your email</h3>
            <p className="muted">
              {maskedEmail ? (
                <>
                  We sent a link to reset your password to <b>{maskedEmail}</b>. Please check your inbox and spam folder.
                </>
              ) : (
                'If an account matches that username or email, we have sent a link to reset your password.'
              )}
            </p>
            <div className="auth-actions" style={{ marginTop: '24px' }}>
              <Link to="/login" className="btn-pill btn-primary center-text">
                Back to log in
              </Link>
              <button
                type="button"
                className="btn-pill btn-secondary"
                onClick={() => {
                  setSubmitted(false);
                  setIdentifier('');
                }}
              >
                Try another account
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <FloatingInput
              id="forgot-identifier"
              label="Username or email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              disabled={busy}
              autoComplete="username"
            />

            <div className="auth-actions">
              <button
                type="submit"
                className="btn-pill btn-primary"
                disabled={!canSubmit || busy}
              >
                {busy ? 'Searching…' : 'Continue'}
              </button>

              <button
                type="button"
                className="link muted center-text cant-reset-link"
                onClick={() => setShowHelp(true)}
              >
                Can't reset your password?
              </button>
            </div>

            {err && (
              <div className="auth-error-banner" role="alert">
                <i className="ri-error-warning-fill" />
                <span>{err}</span>
              </div>
            )}
          </form>
        )}
      </div>

      {showHelp && (
        <LegalModal
          title="Can't reset your password?"
          onClose={() => setShowHelp(false)}
          content={
            <div className="help-content">
              <p>Here are a few things you can try to get back into your account:</p>
              <ul>
                <li>Double-check that you typed your username or email correctly.</li>
                <li>Check your email's spam or junk folders for an email from Instaclone.</li>
                <li>If you created your account with an email address, enter your full email address instead of your username.</li>
                <li>In local development, the password reset link is printed directly to the server terminal output.</li>
              </ul>
            </div>
          }
        />
      )}
    </div>
  );
}

