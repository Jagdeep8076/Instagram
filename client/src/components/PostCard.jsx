import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import Avatar from './Avatar';
import Media from './Media';
import Actions from './Actions';
import Comments from './Comments';
import Caption from './Caption';
import timeAgo from './timeAgo';

export default function PostCard({ post, onDelete, onUpdate }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(post.likes || []);
  const [comments, setComments] = useState(post.comments || []);
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState(post.caption || '');
  const [isEdited, setIsEdited] = useState(Boolean(post.isEdited));
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption || '');
  const [savingEdit, setSavingEdit] = useState(false);

  const isOwner = user && post.user && (post.user._id === user._id || post.user === user._id);

  const del = async () => {
    setMenuOpen(false);
    if (!window.confirm('Are you sure you want to delete this post? This cannot be undone.')) return;
    try {
      await api.delete('/posts/' + post._id);
      onDelete?.(post._id);
    } catch (e) {
      alert(e.response?.data?.msg || 'Failed to delete post');
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
      onUpdate?.(data);
    } catch (e) {
      alert(e.response?.data?.msg || 'Failed to update caption');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <article className="card post">
      <header>
        <Link to={'/' + post.user?.username} className="row">
          <Avatar src={post.user?.avatar} />
          <b>{post.user?.username}</b>
        </Link>
        <div className="row post-meta">
          <span className="muted small">
            {timeAgo(post.createdAt)}
            {isEdited && <span className="edited-badge"> · Edited</span>}
          </span>
          {isOwner && (
            <div className="post-menu-wrap">
              <button
                className="icon-btn post-menu-btn"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Post options"
                title="Options"
              >
                <i className="ri-more-fill" />
              </button>
              {menuOpen && (
                <div className="post-dropdown card">
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
                    <i className="ri-delete-bin-line" /> Delete post
                  </button>
                  <button onClick={() => setMenuOpen(false)}>Cancel</button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <Media post={post} className="post-media" />

      <Actions
        post={post}
        likes={likes}
        setLikes={setLikes}
        commentCount={comments.length}
        onComment={() => setOpen(!open)}
      />

      {isEditing ? (
        <form onSubmit={handleSaveEdit} className="edit-caption-form pad">
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
        caption && (
          <p className="caption">
            <b>{post.user?.username}</b> <Caption text={caption} />
          </p>
        )
      )}

      {comments.length > 0 && !open && (
        <button className="link muted" onClick={() => setOpen(true)}>
          View all {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </button>
      )}

      {open && (
        <Comments
          postId={post._id}
          postOwnerId={post.user?._id || post.user}
          comments={comments}
          setComments={setComments}
        />
      )}
    </article>
  );
}
