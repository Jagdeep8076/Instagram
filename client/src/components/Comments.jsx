import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import Avatar from './Avatar';
import Caption from './Caption';
import Icon from './Icon';
import timeAgo from './timeAgo';

export default function Comments({ postId, postOwnerId, comments, setComments }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try { const { data } = await api.post(`/posts/${postId}/comment`, { text }); setComments(data); setText(''); setErr(''); }
    catch (x) { setErr(errMsg(x)); }
  };
  const remove = async (cid) => {
    try { const { data } = await api.delete(`/posts/${postId}/comments/${cid}`); setComments(data); }
    catch (x) { setErr(errMsg(x)); }
  };
  return (
    <div className="comments">
      <div className="comment-list">
        {comments.length === 0 && <p className="muted">No comments yet. Start the conversation.</p>}
        {comments.map((c) => (
          <div key={c._id} className="comment">
            <Avatar src={c.user?.avatar} size={28} />
            <span className="grow"><Link to={'/' + c.user?.username}><b>{c.user?.username}</b></Link> <Caption text={c.text} /> <small className="muted">{timeAgo(c.createdAt)}</small></span>
            {(c.user?._id === user._id || postOwnerId === user._id) && (
              <button className="c-del" title="Delete comment" aria-label="Delete comment" onClick={() => remove(c._id)}><Icon name="delete-bin-6-line" /></button>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="comment-form">
        <input placeholder="Add a comment…" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
        <button disabled={!text.trim()}>Post</button>
      </form>
      {err && <p className="error">{err}</p>}
    </div>
  );
}
