import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import Tile from '../components/Tile';

export default function Profile() {
  const { username } = useParams();
  const nav = useNavigate();
  const { user: me, setUser } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: '', username: '', bio: '', avatar: null, removeAvatar: false });
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('post');
  const [savedPosts, setSavedPosts] = useState([]);
  const fileRef = useRef();

  const load = () => api.get('/users/' + username).then((r) => { setData(r.data); setErr(''); }).catch(() => setErr('User not found.'));
  useEffect(() => { setData(null); setEditing(false); setTab('post'); load(); }, [username]);
  if (err) return <div className="empty"><Icon name="user-search-line" /><h3>Sorry, this page isn&apos;t available.</h3><p>The link may be broken, or the account may have been removed. <Link to="/" className="tag">Go back to Home</Link></p></div>;
  if (!data) return <p className="muted">Loading…</p>;

  const { user, posts } = data;
  const isMe = user._id === me._id;
  const toggleFollow = async () => {
    const { data: r } = await api.put(`/users/${user._id}/follow`);
    setData({ ...data, user: { ...user, isFollowing: r.following, followersCount: user.followersCount + (r.following ? 1 : -1) } });
  };
  const startEdit = () => { setForm({ fullName: user.fullName, username: user.username, bio: user.bio, avatar: null, removeAvatar: false }); setFormErr(''); setEditing(true); };
  const save = async (e) => {
    e.preventDefault(); setFormErr(''); setSaving(true);
    const fd = new FormData();
    fd.append('fullName', form.fullName); fd.append('bio', form.bio); fd.append('username', form.username);
    if (form.avatar) fd.append('avatar', form.avatar); else if (form.removeAvatar) fd.append('removeAvatar', 'true');
    try {
      const { data: r } = await api.put('/users/me', fd);
      setUser({ ...me, ...r.user });
      setEditing(false);
      r.user.username !== username ? nav('/' + r.user.username, { replace: true }) : load();
    } catch (x) { setFormErr(errMsg(x)); }
    setSaving(false);
  };
  const openTab = (t) => { setTab(t); if (t === 'saved') api.get('/posts/saved').then((r) => setSavedPosts(r.data)); };
  const shown = tab === 'saved' ? savedPosts : posts.filter((p) => p.type === tab);
  const previewAvatar = form.avatar ? URL.createObjectURL(form.avatar) : form.removeAvatar ? '' : user.avatar;

  return (
    <div className="profile">
      <div className="profile-card">
        <Avatar src={editing ? previewAvatar : user.avatar} size={150} />
        <div className="info">
          <div className="row">
            <h2>{user.username}</h2>
            {isMe ? <button className="btn" onClick={startEdit}>Edit profile</button>
              : <><button className={user.isFollowing ? 'btn' : 'btn primary'} onClick={toggleFollow}>{user.isFollowing ? 'Unfollow' : 'Follow'}</button>
                  <button className="btn" onClick={() => nav('/messages/' + user.username)}>Message</button></>}
          </div>
          <div className="stats">
            <span><b>{posts.length}</b> posts</span>
            <span><b>{user.followersCount}</b> followers</span>
            <span><b>{user.followingCount}</b> following</span>
          </div>
          <b>{user.fullName}</b>
          <p className="bio">{user.bio}</p>
        </div>
      </div>

      {editing && (
        <form className="edit" onSubmit={save}>
          <h3>Edit profile</h3>
          <div className="row">
            <Avatar src={previewAvatar} size={56} />
            <div className="stack-sm">
              <button type="button" className="link" onClick={() => fileRef.current.click()}>Change photo</button>
              {(user.avatar || form.avatar) && !form.removeAvatar && <button type="button" className="link danger-text" onClick={() => setForm({ ...form, avatar: null, removeAvatar: true })}>Remove photo</button>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setForm({ ...form, avatar: e.target.files[0], removeAvatar: false })} />
          </div>
          <label>Name<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} maxLength={60} /></label>
          <label>Username<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} maxLength={30} /></label>
          <label>Bio<textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} maxLength={150} /><small className="muted">{form.bio.length}/150</small></label>
          {formErr && <p className="error">{formErr}</p>}
          <div className="row">
            <button className="btn primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>
            <Link to="/settings" className="link right">Change password</Link>
          </div>
        </form>
      )}

      <div className="tabs">
        <button className={tab === 'post' ? 'on' : ''} onClick={() => openTab('post')}><Icon name="grid-line" /> Posts</button>
        <button className={tab === 'reel' ? 'on' : ''} onClick={() => openTab('reel')}><Icon name="clapperboard-line" /> Reels</button>
        {isMe && <button className={tab === 'saved' ? 'on' : ''} onClick={() => openTab('saved')}><Icon name="bookmark-line" /> Saved</button>}
      </div>
      {shown.length === 0 && (
        <div className="empty small-empty">
          <Icon name={tab === 'saved' ? 'bookmark-line' : tab === 'reel' ? 'clapperboard-line' : 'camera-line'} />
          <h3>{tab === 'saved' ? 'Nothing saved yet' : tab === 'reel' ? 'No reels yet' : 'No posts yet'}</h3>
          {isMe && tab !== 'saved' && <p><Link to="/create" className="tag">Share your first {tab === 'reel' ? 'reel' : 'photo'}</Link></p>}
        </div>
      )}
      <div className="grid">{shown.map((p) => <Tile key={p._id} p={p} />)}</div>
    </div>
  );
}
