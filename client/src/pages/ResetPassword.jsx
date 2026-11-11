import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import AuthShell from '../components/AuthShell';
import Logo from '../components/Logo';
import { Field } from '../components/Field';
import Icon from '../components/Icon';

export default function ResetPassword() {
  const { token } = useParams();
  const nav = useNavigate();
  const [valid, setValid] = useState(null);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get('/auth/reset/validate/' + token).then((r) => setValid(r.data.valid)).catch(() => setValid(false)); }, [token]);

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (pw !== pw2) return setErr("The passwords don't match.");
    setBusy(true);
    try { await api.post('/auth/reset', { token, password: pw }); nav('/login', { replace: true, state: { notice: 'Your password was changed. Log in with your new password.' } }); }
    catch (x) { setErr(errMsg(x)); setBusy(false); }
  };

  if (valid === null) return <AuthShell><p className="sub center-text">Checking your link…</p></AuthShell>;
  if (!valid) {
    return (
      <AuthShell>
        <div className="auth2-form center-block">
          <Icon name="link-unlink" className="big-ico" />
          <h1>This link isn&apos;t valid</h1>
          <p className="sub">It may have expired or already been used. Request a new link to reset your password.</p>
          <Link to="/accounts/password/reset" className="btn-pill btn-blue">Request a new link</Link>
          <Link to="/login" className="btn-pill btn-grey">Back to log in</Link>
        </div>
      </AuthShell>
    );
  }
  return (
    <AuthShell>
      <div className="auth2-logo"><Logo size={60} /></div>
      <form className="auth2-form" onSubmit={submit}>
        <h1>Create a new password</h1>
        <p className="sub">Your password must be at least 8 characters. Use a mix of letters, numbers and symbols.</p>
        <Field label="New password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" autoFocus />
        <Field label="Confirm new password" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
        {err && <p className="field-msg bad"><Icon name="error-warning-line" /> {err}</p>}
        <button className="btn-pill btn-blue" disabled={busy || !pw || !pw2}>{busy ? 'Saving…' : 'Reset password'}</button>
      </form>
    </AuthShell>
  );
}
