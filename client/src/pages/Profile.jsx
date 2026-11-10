import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import Avatar from '../components/Avatar';
import Media from '../components/Media';
import EmptyState from '../components/EmptyState';

export default function Profile() {
  const { username } = useParams();
  const nav = useNavigate();
  const [savedPosts, setSavedPosts] = useState([]);
  const { user: me, setUser } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState('post');

  // Edit profile state
  const [form, setForm] = useState({ fullName: '', username: '', bio: '', avatar: null });
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Change password modal / section state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passMsg, setPassMsg] = useState({ error: '', success: '' });
  const [changingPass, setChangingPass] = useState(false);

  const load = () =>
    api
      .get('/users/' + username)
      .then((r) => {
        setData(r.data);
        setErr('');
      })
      .catch(() => setErr('User not found'));

  useEffect(() => {
    setData(null);
    load();
  }, [username]);

  // Debounced username availability check for edit profile
  useEffect(() => {
    if (!editing || !form.username || form.username === data?.user?.username) {
      setUsernameStatus(null);
      return;
    }
    const clean = form.username.trim().toLowerCase();
    if (!/^[a-zA-Z0-9._]{3,30}$/.test(clean)) {
      setUsernameStatus({ available: false, msg: '3-30 letters, numbers, periods or underscores' });
      return;
    }
    const t = setTimeout(() => {
      api
        .get(`/auth/check-username?username=${encodeURIComponent(clean)}`)
        .then((r) => {
          setUsernameStatus(r.data);
        })
        .catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [form.username, editing, data?.user?.username]);

  if (err) {
    return (
      <EmptyState
        icon="ri-user-unfollow-line"
        title="User not found"
        message="The link you followed may be broken, or the user may have changed their username."
        action={
          <Link to="/" className="primary btn">
            Go to home
          </Link>
        }
      />
    );
  }

  if (!data) return <p className="muted center-text pad">Loading…</p>;

  const { user, posts } = data;
  const isMe = me && (user._id === me._id || user.username === me.username);

  const toggleFollow = async () => {
    const { data: r } = await api.put(`/users/${user._id}/follow`);
    setData({
      ...data,
      user: {
        ...user,
        isFollowing: r.following,
        followersCount: user.followersCount + (r.following ? 1 : -1),
      },
    });
  };

  const startEdit = () => {
    setForm({
      fullName: user.fullName || '',
      username: user.username || '',
      bio: user.bio || '',
      avatar: null,
    });
    setRemoveAvatar(false);
    setEditError('');
    setUsernameStatus(null);
    setEditing(true);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (usernameStatus && !usernameStatus.available) {
      setEditError(usernameStatus.msg || 'Please choose an available username');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      const fd = new FormData();
      fd.append('fullName', form.fullName.trim());
      fd.append('username', form.username.trim().toLowerCase());
      fd.append('bio', form.bio.trim());
      if (removeAvatar) {
        fd.append('removeAvatar', 'true');
      } else if (form.avatar) {
        fd.append('avatar', form.avatar);
      }
      const { data: r } = await api.put('/users/me', fd);
      setUser(r.user);
      setEditing(false);
      if (r.user.username !== username) {
        nav('/' + r.user.username, { replace: true });
      } else {
        load();
      }
    } catch (ex) {
      setEditError(ex.response?.data?.msg || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassMsg({ error: '', success: '' });
    if (passForm.newPassword.length < 8) {
      setPassMsg({ error: 'New password must be at least 8 characters long', success: '' });
      return;
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      setPassMsg({ error: 'New passwords do not match', success: '' });
      return;
    }
    setChangingPass(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      setPassMsg({ error: '', success: 'Password changed successfully!' });
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setShowPasswordChange(false), 2000);
    } catch (ex) {
      setPassMsg({ error: ex.response?.data?.msg || 'Failed to change password', success: '' });
    } finally {
      setChangingPass(false);
    }
  };

  const shown = tab === 'saved' ? savedPosts : posts.filter((p) => p.type === tab);
  const openTab = (t) => {
    setTab(t);
    if (t === 'saved') api.get('/posts/saved').then((r) => setSavedPosts(r.data));
  };

  return (
    <div className="profile">
      <div className="card profile-card">
        <div className="profile-avatar-wrap">
          <Avatar src={user.avatar} size={110} />
        </div>
        <div className="info">
          <div className="row profile-header-row">
            <h2>{user.username}</h2>
            {isMe ? (
              <div className="row">
                <button className="btn" onClick={startEdit}>
                  <i className="ri-settings-3-line" /> Edit profile
                </button>
                <button
                  className="btn"
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  title="Change account password"
                >
                  <i className="ri-lock-password-line" /> Password
                </button>
              </div>
            ) : (
              <div className="row">
                <button
                  className={user.isFollowing ? 'btn' : 'btn primary'}
                  onClick={toggleFollow}
                >
                  {user.isFollowing ? 'Unfollow' : 'Follow'}
                </button>
                <button
                  className="btn"
                  onClick={() => nav('/messages/' + user.username)}
                >
                  <i className="ri-chat-3-line" /> Message
                </button>
              </div>
            )}
          </div>
          <div className="stats">
            <span>
              <b>{posts.length}</b> {posts.length === 1 ? 'post' : 'posts'}
            </span>
            <span>
              <b>{user.followersCount}</b> {user.followersCount === 1 ? 'follower' : 'followers'}
            </span>
            <span>
              <b>{user.followingCount}</b> following
            </span>
          </div>
          {user.fullName && <b>{user.fullName}</b>}
          {user.bio && <p className="bio">{user.bio}</p>}
        </div>
      </div>

      {editing && (
        <form className="card edit" onSubmit={saveProfile}>
          <h3>Edit Profile</h3>
          <div className="edit-field">
            <label>Name</label>
            <input
              placeholder="Full name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div className="edit-field">
            <label>Username</label>
            <input
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
            {usernameStatus && (
              <small className={usernameStatus.available ? 'text-success' : 'error'}>
                {usernameStatus.available ? '✓ Username is available' : `✕ ${usernameStatus.msg}`}
              </small>
            )}
          </div>
          <div className="edit-field">
            <label>Bio</label>
            <textarea
              placeholder="Bio"
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </div>
          <div className="edit-field">
            <label>Profile photo</label>
            <input
              type="file"
              accept="image/*"
              disabled={removeAvatar}
              onChange={(e) => setForm({ ...form, avatar: e.target.files[0] })}
            />
            {user.avatar && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={removeAvatar}
                  onChange={(e) => setRemoveAvatar(e.target.checked)}
                />
                Remove current photo
              </label>
            )}
          </div>

          {editError && <p className="error">{editError}</p>}

          <div className="row">
            <button className="primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {showPasswordChange && (
        <form className="card edit" onSubmit={handlePasswordChange}>
          <h3>Change Password</h3>
          <div className="edit-field">
            <label>Current password</label>
            <input
              type="password"
              required
              placeholder="Current password"
              value={passForm.currentPassword}
              onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
            />
          </div>
          <div className="edit-field">
            <label>New password (min 8 chars)</label>
            <input
              type="password"
              required
              placeholder="New password"
              value={passForm.newPassword}
              onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
            />
          </div>
          <div className="edit-field">
            <label>Confirm new password</label>
            <input
              type="password"
              required
              placeholder="Confirm new password"
              value={passForm.confirmPassword}
              onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
            />
          </div>

          {passMsg.error && <p className="error">{passMsg.error}</p>}
          {passMsg.success && <p className="text-success">{passMsg.success}</p>}

          <div className="row">
            <button className="primary" disabled={changingPass}>
              {changingPass ? 'Updating…' : 'Update password'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setShowPasswordChange(false);
                setPassMsg({ error: '', success: '' });
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="tabs">
        <button
          className={tab === 'post' ? 'on' : ''}
          onClick={() => openTab('post')}
        >
          <i className="ri-grid-line" /> Posts
        </button>
        <button
          className={tab === 'reel' ? 'on' : ''}
          onClick={() => openTab('reel')}
        >
          <i className="ri-movie-line" /> Reels
        </button>
        {isMe && (
          <button
            className={tab === 'saved' ? 'on' : ''}
            onClick={() => openTab('saved')}
          >
            <i className="ri-bookmark-line" /> Saved
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        tab === 'saved' ? (
          <EmptyState
            icon="ri-bookmark-line"
            title="Nothing saved yet"
            message="Save photos and videos that you want to see again. Only you can see what you've saved."
          />
        ) : tab === 'reel' ? (
          <EmptyState
            icon="ri-film-line"
            title="No reels yet"
            message={isMe ? 'Share videos that reflect your world.' : `${user.username} hasn't posted any reels yet.`}
          />
        ) : (
          <EmptyState
            icon="ri-camera-line"
            title="No posts yet"
            message={isMe ? 'When you share photos and videos, they will appear on your profile.' : `${user.username} hasn't posted anything yet.`}
          />
        )
      ) : (
        <div className="grid">
          {shown.map((p) => (
            <Link key={p._id} to={'/post/' + p._id} className="tile">
              <Media post={p} controls={false} />
              <span className="hover">
                <i className="ri-heart-fill" /> {p.likes.length} &nbsp;{' '}
                <i className="ri-chat-3-fill" /> {p.comments.length}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
