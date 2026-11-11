import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import Icon from '../components/Icon';

export default function Create() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [file, setFile] = useState(null);
  const [type, setType] = useState('post');
  const [caption, setCaption] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setErr('Select a file first');
    const fd = new FormData();
    fd.append('media', file); fd.append('caption', caption); fd.append('type', type);
    setBusy(true); setErr('');
    try { await api.post('/posts', fd); nav(type === 'reel' ? '/reels' : '/' + user.username); }
    catch (x) { setErr(x.response?.data?.msg || 'Upload failed'); setBusy(false); }
  };
  const preview = file && URL.createObjectURL(file);
  return (
    <form className="create" onSubmit={submit}>
      <div className="create-head"><b>Create new {type}</b>{file && <button className="link" disabled={busy}>{busy ? 'Sharing…' : 'Share'}</button>}</div>
      <div className="seg">
        <button type="button" className={type === 'post' ? 'on' : ''} onClick={() => setType('post')}><Icon name="image-line" /> Post</button>
        <button type="button" className={type === 'reel' ? 'on' : ''} onClick={() => setType('reel')}><Icon name="clapperboard-line" /> Reel</button>
      </div>
      {!file ? (
        <label className="drop">
          <Icon name={type === 'reel' ? 'movie-2-line' : 'image-add-line'} />
          <p>{type === 'reel' ? 'Select a video for your reel' : 'Select photos and videos here'}</p>
          <span className="primary">Select from computer</span>
          <input type="file" hidden accept={type === 'reel' ? 'video/*' : 'image/*,video/*'} onChange={(e) => setFile(e.target.files[0])} />
        </label>
      ) : (
        <div className="create-body">
          {file.type.startsWith('video') ? <video src={preview} controls className="preview" /> : <img src={preview} className="preview" alt="" />}
          <div className="create-side">
            <div className="row"><b>{user.username}</b></div>
            <textarea placeholder="Write a caption… use #hashtags" value={caption} onChange={(e) => setCaption(e.target.value)} rows={6} maxLength={2200} />
            <small className="muted">{caption.length}/2,200</small>
            {err && <p className="error">{err}</p>}
            <button type="button" className="link" onClick={() => setFile(null)}>Choose another file</button>
          </div>
        </div>
      )}
      {!file && err && <p className="error pad">{err}</p>}
    </form>
  );
}
