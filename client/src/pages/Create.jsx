import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';

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
    if (!file) return setErr('Please select a file to share');
    const fd = new FormData();
    fd.append('media', file);
    fd.append('caption', caption.trim());
    fd.append('type', type);
    setBusy(true);
    setErr('');
    try {
      await api.post('/posts', fd);
      nav(type === 'reel' ? '/reels' : '/' + user.username);
    } catch (x) {
      setErr(x.response?.data?.msg || 'Failed to upload media. Please try again.');
      setBusy(false);
    }
  };

  const preview = file && URL.createObjectURL(file);

  return (
    <form className="card create" onSubmit={submit}>
      <h2>Create new</h2>
      <div className="seg">
        <button
          type="button"
          className={type === 'post' ? 'on' : ''}
          onClick={() => setType('post')}
        >
          <i className="ri-image-line" /> Post
        </button>
        <button
          type="button"
          className={type === 'reel' ? 'on' : ''}
          onClick={() => setType('reel')}
        >
          <i className="ri-movie-line" /> Reel
        </button>
      </div>

      <div className="file-input-wrap">
        <input
          type="file"
          accept={type === 'reel' ? 'video/*' : 'image/*,video/*'}
          onChange={(e) => setFile(e.target.files[0])}
        />
      </div>

      {preview &&
        (file.type.startsWith('video') ? (
          <video src={preview} controls className="preview" />
        ) : (
          <img src={preview} className="preview" alt="Upload preview" />
        ))}

      <textarea
        placeholder="Write a caption… (use #hashtags and @mentions)"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={3}
      />

      {err && <p className="error">{err}</p>}

      <button className="primary" disabled={busy || !file}>
        {busy ? 'Sharing…' : 'Share'}
      </button>
    </form>
  );
}
