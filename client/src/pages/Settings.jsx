import { useState } from 'react';
import api, { errMsg, setToken } from '../api';
import { useAuth } from '../AuthContext';
import { Field } from '../components/Field';
import Icon from '../components/Icon';

export default function Settings() {
  const { user, logout } = useAuth();
  const [f, setF] = useState({ current: '', next: '', again: '' });
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr(''); setOk(''); };

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setOk('');
    if (f.next !== f.again) return setErr("The new passwords don't match.");
    setBusy(true);
    try {
      const { data } = await api.post('/auth/change-password', { current: f.current, next: f.next });
      setToken(data.accessToken); setF({ current: '', next: '', again: '' });
      setOk('Password changed. You were logged out on your other devices.');
    } catch (x) { setErr(errMsg(x)); }
    setBusy(false);
  };
  return (
    <div className="narrow settings">
      <h2>Settings</h2>
      <section className="card pad">
        <h3>Account</h3>
        <p className="muted">Logged in as <b>{user.username}</b> · {user.email}</p>
      </section>
      <form className="card pad stack" onSubmit={submit}>
        <h3>Change password</h3>
        <Field label="Current password" type="password" value={f.current} onChange={set('current')} autoComplete="current-password" />
        <Field label="New password" type="password" value={f.next} onChange={set('next')} autoComplete="new-password" />
        <Field label="Confirm new password" type="password" value={f.again} onChange={set('again')} autoComplete="new-password" />
        {err && <p className="field-msg bad"><Icon name="error-warning-line" /> {err}</p>}
        {ok && <p className="field-msg good"><Icon name="checkbox-circle-fill" /> {ok}</p>}
        <button className="btn-pill btn-blue" disabled={busy || !f.current || !f.next || !f.again}>{busy ? 'Saving…' : 'Change password'}</button>
      </form>
      <button className="btn-pill btn-grey" onClick={logout}><Icon name="logout-box-r-line" /> &nbsp;Log out</button>
    </div>
  );
}
