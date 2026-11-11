import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { APP_NAME } from '../config';
import AuthShell, { DevBox } from '../components/AuthShell';
import { Field, Select } from '../components/Field';
import Icon from '../components/Icon';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 121 }, (_, i) => THIS_YEAR - i);
const strength = (p) => { let s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++; return s; };

function ConfirmCode({ pending, onBack }) {
  const { verify } = useAuth();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(pending.retryAfter ?? 60);
  const [dev, setDev] = useState(pending);

  useEffect(() => { if (left <= 0) return; const t = setTimeout(() => setLeft(left - 1), 1000); return () => clearTimeout(t); }, [left]);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await verify({ email: pending.email, code }); } // success -> user is set and the app switches to the feed
    catch (x) { setErr(errMsg(x)); setBusy(false); }
  };
  const resend = async () => {
    setErr('');
    try { const { data } = await api.post('/auth/resend', { email: pending.email }); setLeft(data.retryAfter || 60); setDev({ ...pending, ...data }); setCode(''); }
    catch (x) { setErr(errMsg(x)); setLeft(x.response?.data?.retryAfter || 60); }
  };
  return (
    <AuthShell onBack={onBack}>
      <form className="auth2-form" onSubmit={submit}>
        <h1>Enter confirmation code</h1>
        <p className="sub">Enter the 6-digit code we sent to <b>{pending.email}</b>. It expires in 10 minutes.</p>
        {dev.devCode && (
          <DevBox>
            {dev.emailError ? 'The email could not be sent (check SMTP settings in server/.env). ' : dev.emailSent ? '' : 'No email was sent (SMTP is not configured). '}
            Your code is <b className="mono">{dev.devCode}</b>
          </DevBox>
        )}
        <Field label="Confirmation code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus className="code-input" />
        {err && <p className="field-msg bad"><Icon name="error-warning-line" /> {err}</p>}
        <button className="btn-pill btn-blue" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Next'}</button>
        <button type="button" className="btn-pill btn-grey" disabled={left > 0} onClick={resend}>{left > 0 ? `Resend code in ${left}s` : 'Resend code'}</button>
        <p className="small-text center-text">Wrong email? <button type="button" className="link-blue" onClick={onBack}>Go back and change it</button></p>
      </form>
    </AuthShell>
  );
}

export default function Signup() {
  const st = useLocation().state;
  const [f, setF] = useState({ email: '', password: '', month: '', day: '', year: '', fullName: '', username: '' });
  const [errs, setErrs] = useState({});
  const [apiErr, setApiErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(st?.confirmEmail ? { email: st.confirmEmail, devCode: st.devCode, emailSent: st.emailSent, retryAfter: 60 } : null);
  const [uname, setUname] = useState({ state: 'idle' });
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErrs({ ...errs, [k]: undefined }); };

  // live username availability (debounced)
  useEffect(() => {
    const u = f.username.trim();
    if (!u) return setUname({ state: 'idle' });
    setUname({ state: 'checking' });
    const t = setTimeout(async () => {
      try { const { data } = await api.get('/auth/check-username', { params: { u } }); setUname(data.available ? { state: 'ok' } : { state: 'bad', msg: data.reason }); }
      catch { setUname({ state: 'idle' }); }
    }, 400);
    return () => clearTimeout(t);
  }, [f.username]);

  const validate = () => {
    const e = {};
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email address.';
    if (f.password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (!f.month || !f.day || !f.year) e.birthday = 'Select your birthday.';
    if (!f.username.trim()) e.username = 'Choose a username.';
    else if (uname.state === 'bad') e.username = uname.msg;
    return e;
  };
  const submit = async (ev) => {
    ev.preventDefault(); setApiErr('');
    const e = validate(); setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const { data } = await api.post('/auth/signup', { email: f.email.trim(), password: f.password, fullName: f.fullName.trim(), username: f.username.trim(), birthday: { year: +f.year, month: +f.month, day: +f.day } });
      setPending(data);
    } catch (x) {
      const d = x.response?.data;
      d?.field ? setErrs({ [d.field]: d.msg }) : setApiErr(errMsg(x));
    }
    setBusy(false);
  };

  if (pending) return <ConfirmCode pending={pending} onBack={() => setPending(null)} />;

  const days = Array.from({ length: f.month && f.year ? new Date(+f.year, +f.month, 0).getDate() : 31 }, (_, i) => [i + 1, i + 1]);
  const sc = strength(f.password);
  return (
    <AuthShell back="/login">
      <form className="auth2-form" onSubmit={submit} noValidate>
        <h1>Get started on {APP_NAME}</h1>
        <p className="sub">Create an account to share photos and videos, and follow people you know.</p>

        <label className="sec">Email</label>
        <Field label="Email" type="email" value={f.email} onChange={set('email')} error={errs.email} autoComplete="email" autoFocus />

        <label className="sec">Password</label>
        <Field label="Password" type="password" value={f.password} onChange={set('password')} error={errs.password} autoComplete="new-password"
          hint={f.password && <p className={'field-msg s' + (sc <= 2 ? 'weak' : sc === 3 ? 'ok' : 'strong')}>{sc <= 2 ? 'Weak' : sc === 3 ? 'Okay' : 'Strong'} password</p>} />

        <label className="sec">Birthday <span title="We ask for your birthday to make sure you're old enough (13+). It isn't shown on your profile." className="qmark"><Icon name="question-line" /></span></label>
        <div className="row3">
          <Select label="Month" value={f.month} onChange={set('month')} options={MONTHS.map((m, i) => [i + 1, m])} error={errs.birthday} />
          <Select label="Day" value={f.day} onChange={set('day')} options={days} error={errs.birthday} />
          <Select label="Year" value={f.year} onChange={set('year')} options={YEARS.map((y) => [y, y])} error={errs.birthday} />
        </div>
        {errs.birthday && <p className="field-msg bad"><Icon name="error-warning-line" /> {errs.birthday}</p>}

        <label className="sec">Name</label>
        <Field label="Full name" value={f.fullName} onChange={set('fullName')} autoComplete="name" maxLength={60} />

        <label className="sec">Username</label>
        <Field label="Username" value={f.username} onChange={set('username')} error={errs.username} autoComplete="username" maxLength={30}
          right={uname.state === 'ok' ? <Icon name="checkbox-circle-fill" className="uname ok" /> : uname.state === 'bad' ? <Icon name="close-circle-fill" className="uname bad" /> : null}
          hint={uname.state === 'ok' && <p className="field-msg good">Username is available</p>} />

        <p className="legal">By tapping Submit, you agree to create an account and to {APP_NAME}&apos;s <Link to="/legal/terms">Terms</Link>, <Link to="/legal/privacy">Privacy Policy</Link> and <Link to="/legal/cookies">Cookies Policy</Link>.</p>
        {apiErr && <p className="field-msg bad"><Icon name="error-warning-line" /> {apiErr}</p>}
        <button className="btn-pill btn-blue" disabled={busy}>{busy ? 'Please wait…' : 'Submit'}</button>
        <Link to="/login" className="btn-pill btn-grey">I already have an account</Link>
      </form>
    </AuthShell>
  );
}
