import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import Actions from '../components/Actions';
import Comments from '../components/Comments';
import Caption from '../components/Caption';
import EditCaption from '../components/EditCaption';
import { useAuth } from '../AuthContext';

function Reel({ post, onDelete }) {
  const ref = useRef();
  const { user } = useAuth();
  const [likes, setLikes] = useState(post.likes);
  const [comments, setComments] = useState(post.comments);
  const [caption, setCaption] = useState(post.caption);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [following, setFollowing] = useState(!!post.isFollowing);
  const [muted, setMuted] = useState(true);
  const mine = post.user._id === user._id;

  useEffect(() => {
    const v = ref.current;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.7 });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const follow = async () => { const { data } = await api.put(`/users/${post.user._id}/follow`); setFollowing(data.following); };
  const doubleTap = async () => { if (!likes.includes(user._id)) { setLikes([...likes, user._id]); api.put(`/posts/${post._id}/like`).then((r) => setLikes(r.data.likes)); } };
  const del = async () => {
    setMenu(false);
    if (!confirm('Delete this reel? This can\'t be undone.')) return;
    try { await api.delete('/posts/' + post._id); onDelete(post._id); } catch (x) { alert(errMsg(x)); }
  };

  return (
    <section className="reel">
      <div className="reel-box">
        <video ref={ref} src={post.media} loop muted={muted} playsInline onDoubleClick={doubleTap} onClick={(e) => (e.target.paused ? e.target.play() : e.target.pause())} />
        <button className="mute" onClick={() => setMuted(!muted)} aria-label="Toggle sound"><Icon name={muted ? 'volume-mute-fill' : 'volume-up-fill'} /></button>
        {mine && (
          <>
            <button className="reel-more" onClick={() => setMenu(!menu)} aria-label="More options"><Icon name="more-fill" /></button>
            {menu && (
              <div className="menu reel-menu" onMouseLeave={() => setMenu(false)}>
                <button className="danger" onClick={del}>Delete</button>
                <button onClick={() => { setMenu(false); setEditing(true); }}>Edit</button>
                <button onClick={() => setMenu(false)}>Cancel</button>
              </div>
            )}
          </>
        )}
        <div className="reel-info">
          <div className="row">
            <Link to={'/' + post.user.username} className="row"><Avatar src={post.user.avatar} /><b>{post.user.username}</b></Link>
            {!mine && <button className="btn-w" onClick={follow}>{following ? 'Following' : 'Follow'}</button>}
          </div>
          <p><Caption text={caption} /></p>
        </div>
        {open && <div className="reel-comments"><button className="link" onClick={() => setOpen(false)}><Icon name="close-line" /> Close</button><Comments postId={post._id} postOwnerId={post.user._id} comments={comments} setComments={setComments} /></div>}
      </div>
      <div className="reel-actions">
        <Actions post={post} likes={likes} setLikes={setLikes} commentCount={comments.length} onComment={() => setOpen(!open)} />
      </div>
      {editing && <EditCaption post={{ ...post, caption }} onClose={() => setEditing(false)} onSaved={(p) => setCaption(p.caption)} />}
    </section>
  );
}

export default function Reels() {
  const [reels, setReels] = useState(null);
  useEffect(() => { api.get('/posts/reels').then((r) => setReels(r.data)); }, []);
  if (!reels) return <p className="muted">Loading…</p>;
  if (!reels.length) return <div className="empty"><Icon name="clapperboard-line" /><h3>No reels yet</h3><p><Link to="/create" className="tag">Upload the first reel</Link></p></div>;
  return <div className="reels">{reels.map((r) => <Reel key={r._id} post={r} onDelete={(id) => setReels(reels.filter((x) => x._id !== id))} />)}</div>;
}
