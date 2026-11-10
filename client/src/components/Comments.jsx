import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import Avatar from './Avatar';
import Caption from './Caption';

export default function Comments({ postId, postOwnerId, comments, setComments }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/posts/${postId}/comment`, { text: text.trim() });
      setComments(data);
      setText('');
    } catch {}
    setBusy(false);
  };

  const deleteComment = async (commentId) => {
    if (!confirm('Delete this comment?')) return;
    try {
      const { data } = await api.delete(`/posts/${postId}/comment/${commentId}`);
      setComments(data);
    } catch {}
  };

  return (
    <div className="comments">
      <div className="comment-list">
        {comments.length === 0 && (
          <p className="muted small">No comments yet. Be the first to comment!</p>
        )}
        {comments.map((c) => {
          const isCommentAuthor = user && c.user && c.user._id === user._id;
          const isPostAuthor = user && postOwnerId && (postOwnerId === user._id || postOwnerId._id === user._id);
          const canDelete = isCommentAuthor || isPostAuthor;

          return (
            <div key={c._id} className="comment between row">
              <div className="row grow">
                <Avatar src={c.user?.avatar} size={24} />
                <span>
                  <Link to={'/' + c.user?.username}>
                    <b>{c.user?.username}</b>
                  </Link>{' '}
                  <Caption text={c.text} />
                </span>
              </div>
              {canDelete && (
                <button
                  className="link-danger icon-btn"
                  onClick={() => deleteComment(c._id)}
                  title="Delete comment"
                  aria-label="Delete comment"
                >
                  <i className="ri-delete-bin-line" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <form onSubmit={submit} className="comment-form">
        <input
          placeholder="Add a comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button disabled={!text.trim() || busy}>Post</button>
      </form>
    </div>
  );
}
