import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import FloatingInput from '../components/FloatingInput';
import LegalModal from '../components/LegalModal';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getPasswordStrength(p) {
  if (!p) return { score: 0, text: '', color: '' };
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;

  if (score <= 1) return { score: 1, text: 'Weak', color: '#ed4956' };
  if (score === 2 || score === 3) return { score: 2, text: 'Good', color: '#f39c12' };
  return { score: 3, text: 'Strong', color: '#2ecc71' };
}

export default function EmailSignup() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    username: '',
    birthMonth: '1',
    birthDay: '1',
    birthYear: '2000',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showWhyBirthday, setShowWhyBirthday] = useState(false);
  const [legalModal, setLegalModal] = useState(null); // 'terms' | 'privacy' | 'cookies' | 'learnMore'
  const [usernameStatus, setUsernameStatus] = useState(null); // { available: boolean, msg: string }
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Generate Year options from current year down to 1920
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= 1920; y--) years.push(y);

  // Generate Day options
  const days = [];
  for (let d = 1; d <= 31; d++) days.push(d);

  // Debounced username check
  useEffect(() => {
    const u = form.username.trim().toLowerCase();
    if (!u) {
      setUsernameStatus(null);
      return;
    }
    if (u.length < 3) {
      setUsernameStatus({ available: false, msg: 'Username must be at least 3 characters' });
      return;
    }
    if (!/^[a-zA-Z0-9._]{3,30}$/.test(u)) {
      setUsernameStatus({ available: false, msg: 'Only letters, numbers, periods and underscores' });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/auth/check-username?username=${encodeURIComponent(u)}`);
        setUsernameStatus(data);
      } catch {
        setUsernameStatus(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [form.username]);

  // Age validation
  const getAge = () => {
    const birthDate = new Date(+form.birthYear, +form.birthMonth - 1, +form.birthDay);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const strength = getPasswordStrength(form.password);
  const isAgeValid = getAge() >= 13;
  const canSubmit =
    form.email.includes('@') &&
    form.password.length >= 8 &&
    form.username.trim().length >= 3 &&
    usernameStatus?.available &&
    isAgeValid;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAgeValid) {
      setErr('You must be at least 13 years old to create an account.');
      return;
    }
    if (!usernameStatus?.available) {
      setErr(usernameStatus?.msg || 'Please choose an available username.');
      return;
    }
    if (form.password.length < 8) {
      setErr('Password must be at least 8 characters long.');
      return;
    }

    setErr('');
    setBusy(true);

    try {
      const birthdate = `${form.birthYear}-${String(form.birthMonth).padStart(2, '0')}-${String(form.birthDay).padStart(2, '0')}`;
      const { data } = await api.post('/auth/register', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        fullName: form.fullName.trim(),
        username: form.username.trim().toLowerCase(),
        birthdate,
      });

      // Redirect to confirmation code verification
      nav('/accounts/confirm-email', {
        state: {
          email: form.email.trim().toLowerCase(),
          username: form.username.trim().toLowerCase(),
          needsVerification: data.needsVerification,
        },
      });
    } catch (ex) {
      setErr(ex.response?.data?.msg || 'Registration failed. Please check your information.');
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

        <h1 className="auth-heading">Get started on Instaclone</h1>
        <p className="auth-subtext muted">
          Sign up to see photos and videos from your friends.
        </p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <FloatingInput
            id="signup-email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
            required
            disabled={busy}
          />

          <FloatingInput
            id="signup-password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
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

          {form.password && (
            <div className="password-strength-bar">
              <div
                className="strength-meter"
                style={{
                  width: `${(strength.score / 3) * 100}%`,
                  backgroundColor: strength.color,
                }}
              />
              <span className="strength-text" style={{ color: strength.color }}>
                {strength.text} password
              </span>
            </div>
          )}

          {/* Birthday Field */}
          <div className="birthday-section">
            <div className="birthday-header">
              <span className="birthday-label">Birthday</span>
              <button
                type="button"
                className="icon-btn birthday-help-btn"
                onClick={() => setShowWhyBirthday(true)}
                title="Why do I need to provide my birthday?"
                aria-label="Why do I need to provide my birthday?"
              >
                <i className="ri-question-line" />
              </button>
            </div>
            <div className="birthday-selects">
              <div className="select-wrapper">
                <select
                  value={form.birthMonth}
                  onChange={(e) => setForm({ ...form, birthMonth: e.target.value })}
                  aria-label="Birth month"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line select-arrow" />
              </div>

              <div className="select-wrapper">
                <select
                  value={form.birthDay}
                  onChange={(e) => setForm({ ...form, birthDay: e.target.value })}
                  aria-label="Birth day"
                >
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line select-arrow" />
              </div>

              <div className="select-wrapper">
                <select
                  value={form.birthYear}
                  onChange={(e) => setForm({ ...form, birthYear: e.target.value })}
                  aria-label="Birth year"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line select-arrow" />
              </div>
            </div>
            {!isAgeValid && (
              <small className="error">You must be at least 13 years old to sign up</small>
            )}
          </div>

          <FloatingInput
            id="signup-fullname"
            label="Name"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            autoComplete="name"
            disabled={busy}
          />

          <FloatingInput
            id="signup-username"
            label="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            autoComplete="username"
            required
            disabled={busy}
            endAdornment={
              usernameStatus ? (
                <span
                  className={usernameStatus.available ? 'text-success' : 'error'}
                  title={usernameStatus.msg}
                >
                  <i className={usernameStatus.available ? 'ri-checkbox-circle-fill' : 'ri-close-circle-fill'} />
                </span>
              ) : null
            }
          />

          {usernameStatus && !usernameStatus.available && (
            <small className="error" style={{ marginTop: '-8px', display: 'block' }}>
              {usernameStatus.msg}
            </small>
          )}

          {/* Legal Text Blocks from reference */}
          <div className="legal-blocks muted small">
            <p>
              People who use our service may have uploaded your contact information to Instaclone.{' '}
              <button
                type="button"
                className="link"
                onClick={() => setLegalModal('learnMore')}
              >
                Learn More
              </button>
            </p>
            <p>
              By signing up, you agree to our{' '}
              <button
                type="button"
                className="link"
                onClick={() => setLegalModal('terms')}
              >
                Terms
              </button>
              ,{' '}
              <button
                type="button"
                className="link"
                onClick={() => setLegalModal('privacy')}
              >
                Privacy Policy
              </button>{' '}
              and{' '}
              <button
                type="button"
                className="link"
                onClick={() => setLegalModal('cookies')}
              >
                Cookies Policy
              </button>
              .
            </p>
          </div>

          <div className="auth-actions">
            <button
              type="submit"
              className="btn-pill btn-primary"
              disabled={!canSubmit || busy}
            >
              {busy ? 'Creating account…' : 'Submit'}
            </button>

            <Link to="/login" className="btn-pill btn-secondary center-text">
              I already have an account
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

      {showWhyBirthday && (
        <LegalModal
          title="Birthdays"
          onClose={() => setShowWhyBirthday(false)}
          content={
            <div className="help-content">
              <p>
                Providing your birthday helps make sure that you get the right age-appropriate experience on Instaclone.
              </p>
              <p>
                You must be at least 13 years old to use Instaclone. Your birthday will not be shared publicly without your permission.
              </p>
            </div>
          }
        />
      )}

      {legalModal === 'learnMore' && (
        <LegalModal
          title="Contact Uploads"
          onClose={() => setLegalModal(null)}
          content={
            <div className="help-content">
              <p>
                People who use Instaclone may choose to sync their device contacts to find friends. When they do, contact information such as email addresses or phone numbers may be uploaded to help connect users.
              </p>
              <p>
                You can manage your contact discovery settings at any time in your profile settings.
              </p>
            </div>
          }
        />
      )}

      {legalModal === 'terms' && (
        <LegalModal
          title="Terms of Service"
          onClose={() => setLegalModal(null)}
          content={
            <div className="help-content">
              <h4>Welcome to Instaclone!</h4>
              <p>
                By creating an account or using Instaclone, you agree to these Terms. You agree to use the service in a manner consistent with all applicable laws and respect community guidelines.
              </p>
              <p>
                You own the content you post, but you grant us a license to host and display it within the app.
              </p>
            </div>
          }
        />
      )}

      {legalModal === 'privacy' && (
        <LegalModal
          title="Privacy Policy"
          onClose={() => setLegalModal(null)}
          content={
            <div className="help-content">
              <h4>Your Privacy Matters</h4>
              <p>
                We collect information you provide directly to us (such as profile details, posts, messages, and comments) to deliver and improve our services.
              </p>
              <p>
                We do not sell your personal data. You retain full control to edit or delete your account, posts, stories, and comments at any time.
              </p>
            </div>
          }
        />
      )}

      {legalModal === 'cookies' && (
        <LegalModal
          title="Cookies Policy"
          onClose={() => setLegalModal(null)}
          content={
            <div className="help-content">
              <h4>How We Use Cookies</h4>
              <p>
                We use secure, httpOnly session cookies to keep you safely logged in and remember your preferences like dark mode.
              </p>
            </div>
          }
        />
      )}
    </div>
  );
}

