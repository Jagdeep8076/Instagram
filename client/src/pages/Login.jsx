import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { errMsg } from '../api';
import { APP_NAME } from '../config';
import AuthShell from '../components/AuthShell';
import Logo from '../components/Logo';
import { Field } from '../components/Field';
import Icon from '../components/Icon';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const notice = useLocation().state?.notice;
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await login({ login: id, password }); }
    catch (x) {
      const d = x.response?.data;
      if (d?.code === 'UNVERIFIED') return nav('/accounts/emailsignup', { state: { confirmEmail: d.email, devCode: d.devCode, emailSent: d.emailSent } });
      setErr(errMsg(x));
    }
    setBusy(false);
  };
  return (
    <AuthShell>
      <div className="auth2-logo"><Logo size={60} /></div>
      <form className="auth2-form" onSubmit={submit}>
        <h1 className="sm">Log into {APP_NAME}</h1>
        {notice && <p className="notice"><Icon name="checkbox-circle-fill" /> {notice}</p>}
        <Field label="Username or email" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" autoFocus />
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        {err && <p className="field-msg bad"><Icon name="error-warning-line" /> {err}</p>}
        <button className="btn-pill btn-blue" disabled={busy || !id.trim() || !password}>{busy ? 'Logging in…' : 'Log in'}</button>
        <Link to="/accounts/password/reset" className="btn-pill btn-grey">Forgot password?</Link>
        <div className="gap" />
        <Link to="/accounts/emailsignup" className="btn-pill btn-outline">Create new account</Link>
      </form>
    </AuthShell>
  );
}
