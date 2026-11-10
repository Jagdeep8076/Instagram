import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Avatar from '../components/Avatar';
import Actions from '../components/Actions';
import Comments from '../components/Comments';
import Caption from '../components/Caption';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../AuthContext';

function Reel({ post, onDelete }) {
  const ref = useRef();
  const { user } = useAuth();
  const [likes, setLikes] = useState(post.likes || []);
  const [comments, setComments] = useState(post.comments || []);
  const [open, setOpen] = useState(false);
  const [following, setFollowing] = useState(false);
  const [muted, setMuted] = useState(true);
  const [caption, setCaption] = useState(post.caption || '');
  const [isEdited, setIsEdited] = useState(Boolean(post.isEdited));
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption || '');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()),
      { threshold: 0.7 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const isOwner = user && post.user && (post.user._id === user._id || post.user === user._id);

  const follow = async () => {
    const { data } = await api.put(`/users/${post.user._id}/follow`);
    setFollowing(data.following);
  };

  const doubleTap = async () => {
    if (!likes.includes(user?._id)) {
      setLikes([...likes, user._id]);
      api.put(`/posts/${post._id}/like`).then((r) => setLikes(r.data.likes));
    }
  };

  const del = async () => {
    setMenuOpen(false);
    if (!window.confirm('Delete this reel? This cannot be undone.')) return;
    try {
      await api.delete('/posts/' + post._id);
      onDelete?.(post._id);
    } catch (e) {
      alert(e.response?.data?.msg || 'Failed to delete reel');
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const { data } = await api.put('/posts/' + post._id, { caption: editCaption });
      setCaption(data.caption);
      setIsEdited(true);
      setIsEditing(false);
    } catch (e) {
      alert(e.response?.data?.msg || 'Failed to update caption');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <section className="reel">
      <div className="reel-box">
        <video
          ref={ref}
          src={post.media}
          loop
          muted={muted}
          playsInline
          onDoubleClick={doubleTap}
          onClick={(e) => (e.target.paused ? e.target.play() : e.target.pause())}
        />
        <button
          className="mute"
          onClick={() => setMuted(!muted)}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          <i className={muted ? 'ri-volume-mute-fill' : 'ri-volume-up-fill'} />
        </button>

        {isOwner && (
          <div className="reel-owner-menu">
            <button
              className="reel-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Reel options"
            >
              <i className="ri-more-fill" />
            </button>
            {menuOpen && (
              <div className="post-dropdown card reel-dropdown">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setIsEditing(true);
                    setEditCaption(caption);
                  }}
                >
                  <i className="ri-edit-line" /> Edit caption
                </button>
                <button className="danger" onClick={del}>
                  <i className="ri-delete-bin-line" /> Delete reel
                </button>
                <button onClick={() => setMenuOpen(false)}>Cancel</button>
              </div>
            )}
          </div>
        )}

        <div className="reel-info">
          <div className="row">
            <Link to={'/' + post.user?.username} className="row">
              <Avatar src={post.user?.avatar} />
              <b>{post.user?.username}</b>
            </Link>
            {!isOwner && (
              <button className="btn-w" onClick={follow}>
                {following ? 'Following' : 'Follow'}
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="reel-edit-caption">
              <textarea
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                rows={2}
                placeholder="Write a caption…"
              />
              <div className="row">
                <button className="primary small" disabled={savingEdit}>
                  {savingEdit ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  className="btn small"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <p>
              <Caption text={caption} />
              {isEdited && <span className="edited-badge"> · Edited</span>}
            </p>
          )}
        </div>

        {open && (
          <div className="reel-comments">
            <button className="link" onClick={() => setOpen(false)}>
              <i className="ri-close-line" /> Close
            </button>
            <Comments
              postId={post._id}
              postOwnerId={post.user?._id || post.user}
              comments={comments}
              setComments={setComments}
            />
          </div>
        )}
      </div>
      <div className="reel-actions">
        <Actions
          post={post}
          likes={likes}
          setLikes={setLikes}
          commentCount={comments.length}
          onComment={() => setOpen(!open)}
        />
      </div>
    </section>
  );
}

export default function Reels() {
  const [reels, setReels] = useState(null);

  const loadReels = () =>
    api
      .get('/posts/reels')
      .then((r) => setReels(r.data))
      .catch(() => setReels([]));

  useEffect(() => {
    loadReels();
  }, []);

  if (!reels) return <p className="muted center-text pad">Loading…</p>;

  if (!reels.length) {
    return (
      <div className="reels-empty-wrap">
        <EmptyState
          icon="ri-film-line"
          title="No reels yet"
          message="Any video reels uploaded will appear here."
          action={
            <Link to="/create" className="primary btn">
              <i className="ri-video-add-line" /> Upload a reel
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="reels">
      {reels.map((r) => (
        <Reel
          key={r._id}
          post={r}
          onDelete={(id) => setReels(reels.filter((x) => x._id !== id))}
        />
      ))}
    </div>
  );
}
