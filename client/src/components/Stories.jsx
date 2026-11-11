import { useEffect, useRef, useState } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import Avatar from './Avatar';
import Icon from './Icon';
import timeAgo from './timeAgo';

const isVideo = (m) => /\.(mp4|webm|mov|mkv|avi)$/i.test(m);

function Viewer({ groups, start, onClose, onChanged }) {
  const { user } = useAuth();
  const [gi, setGi] = useState(start);
  const [si, setSi] = useState(0);
  const [viewers, setViewers] = useState(null); // null = closed, array = open
  const g = groups[gi], s = g.stories[si];
  const own = g.user._id === user._id;
  const next = () => (si < g.stories.length - 1 ? setSi(si + 1) : gi < groups.length - 1 ? (setGi(gi + 1), setSi(0)) : onClose());
  const prev = () => (si > 0 ? setSi(si - 1) : gi > 0 ? (setGi(gi - 1), setSi(0)) : null);

  useEffect(() => {
    setViewers(null);
    api.put(`/stories/${s._id}/view`).catch(() => {});
    if (isVideo(s.media) || own) return; // own stories stay until you move on (so you can check viewers)
    const t = setTimeout(next, 5000);
    return () => clearTimeout(t);
  }, [gi, si]);
  useEffect(() => {
    const k = (e) => (e.key === 'Escape' ? onClose() : e.key === 'ArrowRight' ? next() : e.key === 'ArrowLeft' ? prev() : null);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const showViewers = async () => {
    if (viewers) return setViewers(null);
    try { setViewers((await api.get(`/stories/${s._id}/viewers`)).data); } catch (x) { alert(errMsg(x)); }
  };
  const remove = async () => {
    if (!confirm('Delete this story?')) return;
    try { await api.delete('/stories/' + s._id); onChanged(); onClose(); } catch (x) { alert(errMsg(x)); }
  };

  return (
    <div className="story-view" onClick={onClose}>
      <div className="story-box" onClick={(e) => e.stopPropagation()}>
        <div className="story-bars">
          {g.stories.map((x, i) => (
            <i key={x._id}><b className={i < si ? 'full' : i === si && !own ? 'run' : i === si ? 'full' : ''} key={gi + '-' + si + '-' + i} /></i>
          ))}
        </div>
        <div className="story-head">
          <Avatar src={g.user.avatar} size={32} /><b>{g.user.username}</b><small>{timeAgo(s.createdAt)}</small>
          {own && <button onClick={remove} title="Delete story" aria-label="Delete story"><Icon name="delete-bin-6-line" /></button>}
          <button onClick={onClose} aria-label="Close"><Icon name="close-line" /></button>
        </div>
        {isVideo(s.media)
          ? <video key={s._id} src={s.media} autoPlay playsInline onEnded={next} />
          : <img key={s._id} src={s.media} alt="" />}
        <div className="story-nav l" onClick={prev} /><div className="story-nav r" onClick={next} />
        {own && (
          <button className="story-viewers" onClick={showViewers}><Icon name="eye-line" /> {s.viewersCount ?? 0} {s.viewersCount === 1 ? 'viewer' : 'viewers'}</button>
        )}
        {viewers && (
          <div className="viewers-sheet">
            <div className="row between"><b>Viewers</b><button onClick={() => setViewers(null)} aria-label="Close viewers"><Icon name="close-line" /></button></div>
            {viewers.length === 0 && <p className="muted">No views yet.</p>}
            {viewers.map((v) => <div key={v._id} className="row"><Avatar src={v.avatar} size={36} /><span><b>{v.username}</b><br /><small className="muted">{v.fullName}</small></span></div>)}
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
  const load = () => api.get('/stories').then((r) => setGroups(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData(); fd.append('media', file);
    setBusy(true);
    try { await api.post('/stories', fd); await load(); } catch (x) { alert(errMsg(x)); }
    setBusy(false); e.target.value = '';
  };

  return (
    <>
      <div className="stories">
        <button className="story-item" onClick={() => input.current.click()} disabled={busy}>
          <span className="ring add"><Avatar src={user.avatar} size={56} /><em><Icon name="add-line" /></em></span>
          <small>{busy ? 'Uploading…' : 'Add story'}</small>
        </button>
        <input ref={input} type="file" accept="image/*,video/*" hidden onChange={upload} />
        {groups.map((g, i) => (
          <button key={g.user._id} className="story-item" onClick={() => setView(i)}>
            <span className={'ring' + (g.allSeen ? ' seen' : '')}><Avatar src={g.user.avatar} size={56} /></span>
            <small>{g.user._id === user._id ? 'Your story' : g.user.username}</small>
          </button>
        ))}
      </div>
      {view !== null && <Viewer groups={groups} start={view} onChanged={load} onClose={() => { setView(null); load(); }} />}
    </>
  );
}
