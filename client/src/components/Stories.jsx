import { useEffect, useRef, useState } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import Avatar from './Avatar';
import timeAgo from './timeAgo';

const isVideo = (m) => /\.(mp4|webm|mov|mkv|avi)$/i.test(m);

function Viewer({ groups, start, onClose, onDeleteStory }) {
  const { user } = useAuth();
  const [gi, setGi] = useState(start);
  const [si, setSi] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [viewersList, setViewersList] = useState([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  const g = groups[gi];
  const s = g?.stories[si];

  const next = () => {
    setShowViewers(false);
    if (!g) return onClose();
    if (si < g.stories.length - 1) setSi(si + 1);
    else if (gi < groups.length - 1) {
      setGi(gi + 1);
      setSi(0);
    } else {
      onClose();
    }
  };

  const prev = () => {
    setShowViewers(false);
    if (si > 0) setSi(si - 1);
    else if (gi > 0) {
      setGi(gi - 1);
      setSi(groups[gi - 1].stories.length - 1);
    }
  };

  useEffect(() => {
    if (!s) return;
    api.put(`/stories/${s._id}/view`).catch(() => {});
    if (showViewers || isVideo(s.media)) return;
    const t = setTimeout(next, 5000);
    return () => clearTimeout(t);
  }, [gi, si, showViewers]);

  useEffect(() => {
    const k = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const isOwner = user && g && (g.user._id === user._id || g.user === user._id);

  const handleDelete = async () => {
    if (!window.confirm('Delete this story?')) return;
    try {
      await api.delete(`/stories/${s._id}`);
      onDeleteStory?.(s._id);
      if (g.stories.length > 1) {
        g.stories.splice(si, 1);
        if (si >= g.stories.length) setSi(g.stories.length - 1);
      } else {
        onClose();
      }
    } catch (e) {
      alert(e.response?.data?.msg || 'Failed to delete story');
    }
  };

  const handleOpenViewers = async () => {
    setShowViewers(true);
    setLoadingViewers(true);
    try {
      const { data } = await api.get(`/stories/${s._id}/viewers`);
      setViewersList(data);
    } catch {
      setViewersList([]);
    } finally {
      setLoadingViewers(false);
    }
  };

  if (!g || !s) return null;

  return (
    <div className="story-view" onClick={onClose}>
      <div className="story-box" onClick={(e) => e.stopPropagation()}>
        <div className="story-bars">
          {g.stories.map((x, i) => (
            <i key={x._id}>
              <b
                className={i < si ? 'full' : i === si && !showViewers ? 'run' : ''}
                style={i === si && !isVideo(s.media) ? { animationDuration: '5s' } : undefined}
                key={gi + '-' + si + '-' + i}
              />
            </i>
          ))}
        </div>

        <div className="story-head">
          <Avatar src={g.user.avatar} size={32} />
          <b>{g.user.username}</b>
          <span className="muted small story-time">{timeAgo(s.createdAt)}</span>
          <div className="story-head-actions">
            {isOwner && (
              <button
                className="story-action-btn danger"
                onClick={handleDelete}
                title="Delete story"
                aria-label="Delete story"
              >
                <i className="ri-delete-bin-line" />
              </button>
            )}
            <button
              className="story-action-btn"
              onClick={onClose}
              title="Close"
              aria-label="Close story viewer"
            >
              <i className="ri-close-line" />
            </button>
          </div>
        </div>

        {isVideo(s.media) ? (
          <video key={s._id} src={s.media} autoPlay playsInline onEnded={next} />
        ) : (
          <img key={s._id} src={s.media} alt="" />
        )}

        <div className="story-nav l" onClick={prev} />
        <div className="story-nav r" onClick={next} />

        {isOwner && (
          <div className="story-footer">
            <button className="story-viewers-btn" onClick={handleOpenViewers}>
              <i className="ri-eye-line" /> Seen by {s.viewersCount || s.viewers?.length || 0}
            </button>
          </div>
        )}

        {showViewers && (
          <div className="story-viewers-modal">
            <div className="story-viewers-header">
              <b>Viewers</b>
              <button onClick={() => setShowViewers(false)}>
                <i className="ri-close-line" />
              </button>
            </div>
            <div className="story-viewers-list">
              {loadingViewers ? (
                <p className="muted pad small">Loading viewers…</p>
              ) : viewersList.length === 0 ? (
                <p className="muted pad small">No viewers yet</p>
              ) : (
                viewersList.map((v) => (
                  <div key={v._id} className="row pad story-viewer-item">
                    <Avatar src={v.avatar} size={36} />
                    <span>
                      <b>{v.username}</b>
                      {v.fullName && <br />}
                      {v.fullName && <small className="muted">{v.fullName}</small>}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Stories() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [view, setView] = useState(null);
  const [busy, setBusy] = useState(false);
  const input = useRef();

  const load = () =>
    api
      .get('/stories')
      .then((r) => setGroups(r.data))
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('media', file);
    setBusy(true);
    try {
      await api.post('/stories', fd);
      await load();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to upload story');
    }
    setBusy(false);
    e.target.value = '';
  };

  return (
    <>
      <div className="stories">
        <button
          className="story-item"
          onClick={() => input.current.click()}
          disabled={busy}
          title="Add to your story"
        >
          <span className="ring add">
            <Avatar src={user?.avatar} size={56} />
            <em>
              <i className="ri-add-line" />
            </em>
          </span>
          <small>{busy ? 'Uploading…' : 'Your story'}</small>
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={upload}
        />
        {groups.map((g, i) => (
          <button
            key={g.user._id}
            className="story-item"
            onClick={() => setView(i)}
            title={`${g.user._id === user?._id ? 'Your' : g.user.username + "'s"} story`}
          >
            <span className={'ring' + (g.allSeen ? ' seen' : '')}>
              <Avatar src={g.user.avatar} size={56} />
            </span>
            <small>{g.user._id === user?._id ? 'You' : g.user.username}</small>
          </button>
        ))}
      </div>
      {view !== null && (
        <Viewer
          groups={groups}
          start={view}
          onClose={() => {
            setView(null);
            load();
          }}
          onDeleteStory={() => load()}
        />
      )}
    </>
  );
}
