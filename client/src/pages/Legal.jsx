import { Link, useParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell';

const DOCS = {
  terms: ['Terms of Use', ['Be respectful: no harassment, hate, spam or illegal content.', 'You are responsible for what you post and for keeping your password safe.', 'You must be at least 13 years old to use this service.', 'We may remove content or accounts that break these rules.']],
  privacy: ['Privacy Policy', ['We store the information you give us: email, username, name, birthday, profile details and the posts, messages and comments you create.', 'Your birthday is only used to check your age and is never shown to others.', 'Passwords are stored as one-way hashes. We never see or store your plain password.', 'You can edit or delete your posts, stories, comments and messages at any time.']],
  cookies: ['Cookies Policy', ['We use one essential cookie to keep you logged in (a secure, httpOnly session cookie).', 'We store your theme choice (light or dark) in your browser.', 'We do not use advertising or tracking cookies.']],
};
export default function Legal() {
  const doc = DOCS[useParams().doc];
  return (
    <AuthShell back="/login">
      <div className="auth2-form legal-doc">
        <h1>{doc ? doc[0] : 'Page not found'}</h1>
        {doc ? <ul>{doc[1].map((t) => <li key={t}>{t}</li>)}</ul> : <p className="sub">That page doesn&apos;t exist. <Link to="/login" className="link-blue">Go to log in</Link></p>}
        {doc && <p className="small-text">This is a learning project; these are short, plain-language summaries.</p>}
      </div>
    </AuthShell>
  );
}
