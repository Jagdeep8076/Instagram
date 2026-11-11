import { useState } from 'react';
import api, { errMsg } from '../api';
import Avatar from './Avatar';

// Modal to edit a post / reel caption
export default function EditCaption({ post, onClose, onSaved }) {
  const [text, setText] = useState(post.caption || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => {
    setBusy(true); setErr('');
    try { const { data } = await api.put('/posts/' + post._id, { caption: text }); onSaved(data); onClose(); }
    catch (x) { setErr(errMsg(x, 'Could not save your changes.')); setBusy(false); }
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Edit caption">
        <div className="modal-head">
          <button className="link muted" onClick={onClose}>Cancel</button>
          <b>Edit info</b>
          <button className="link" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Done'}</button>
        </div>
        <div className="modal-body">
          <div className="row"><Avatar src={post.user.avatar} size={32} /><b>{post.user.username}</b></div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} maxLength={2200} placeholder="Write a caption…" autoFocus />
          <small className="muted">{text.length.toLocaleString()}/2,200</small>
          {err && <p className="error">{err}</p>}
        </div>
      </div>
    </div>
  );
}
