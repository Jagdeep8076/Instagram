import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import AuthShell, { DevBox } from '../components/AuthShell';
import { Field } from '../components/Field';
import Icon from '../components/Icon';

export default function ForgotPassword() {
  const [id, setId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  const [help, setHelp] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { const { data } = await api.post('/auth/forgot', { login: id }); setDone(data); }
    catch (x) { setErr(errMsg(x)); }
    setBusy(false);
  };

  if (done) {
    return (
      <AuthShell back="/login">
        <div className="auth2-form center-block">
          <Icon name="mail-send-line" className="big-ico" />
          <h1>Check your email</h1>
          <p className="sub">{done.message} The link expires in 1 hour. Don&apos;t see it? Check your spam folder.</p>
          {done.devLink && (
            <DevBox>
              {done.emailError ? 'The email could not be sent (check SMTP settings in server/.env). ' : done.emailSent ? '' : 'No email was sent (SMTP is not configured). '}
              Use this link: <a className="link-blue" href={done.devLink}>Open reset link</a>
            </DevBox>
          )}
          <Link to="/login" className="btn-pill btn-blue">Back to log in</Link>
          <button type="button" className="btn-pill btn-grey" onClick={() => { setDone(null); setId(''); }}>Try a different account</button>
        </div>
      </AuthShell>
    );
  }
  return (
    <AuthShell back="/login">
      <form className="auth2-form" onSubmit={submit}>
        <h1>Find your account</h1>
        <p className="sub">Enter your username or email. <button type="button" className="link-blue" onClick={() => setHelp(!help)}>Can&apos;t reset your password?</button></p>
        {help && (
          <div className="helpbox">
            <b>Trouble resetting?</b>
            <ul>
              <li>Use the username or email address you signed up with.</li>
              <li>The link is sent to your account&apos;s email. Check spam or junk folders.</li>
              <li>Each link works once and expires after 1 hour.</li>
              <li>If you no longer have access to that email, you can <Link to="/accounts/emailsignup" className="link-blue">create a new account</Link>.</li>
            </ul>
          </div>
        )}
        <Field label="Username or email" value={id} onChange={(e) => setId(e.target.value)} autoFocus autoComplete="username" />
        <p className="small-text">We&apos;ll email you a link to reset your password. For your security, we don&apos;t say whether an account exists.</p>
        {err && <p className="field-msg bad"><Icon name="error-warning-line" /> {err}</p>}
        <button className="btn-pill btn-blue" disabled={busy || !id.trim()}>{busy ? 'Please wait…' : 'Continue'}</button>
      </form>
    </AuthShell>
  );
}
