import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import Avatar from './Avatar';
import Media from './Media';
import Actions from './Actions';
import Comments from './Comments';
import Caption from './Caption';
import Icon from './Icon';
import FeedVideo from './FeedVideo';
import EditCaption from './EditCaption';
import timeAgo from './timeAgo';

export default function PostCard({ post, onDelete }) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(post.likes);
  const [comments, setComments] = useState(post.comments || []);
  const [caption, setCaption] = useState(post.caption);
  const [edited, setEdited] = useState(!!post.edited);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [burst, setBurst] = useState(false);
  const mine = post.user._id === user._id;
  const isVideo = post.type === 'reel' || /\.(mp4|webm|mov|mkv|avi)$/i.test(post.media);

  const doubleTap = async () => {
    setBurst(true); setTimeout(() => setBurst(false), 800);
    if (likes.includes(user._id)) return;
    setLikes([...likes, user._id]);
    try { const { data } = await api.put(`/posts/${post._id}/like`); setLikes(data.likes); } catch { setLikes(likes); }
  };
  const del = async () => {
    setMenu(false);
    if (!confirm('Delete this post? This can\'t be undone.')) return;
    try { await api.delete('/posts/' + post._id); onDelete?.(post._id); } catch (x) { alert(errMsg(x)); }
  };
  const copy = async () => { await navigator.clipboard.writeText(`${location.origin}/post/${post._id}`); setMenu(false); };

  return (
    <article className="post">
      <header>
        <Link to={'/' + post.user.username}><Avatar src={post.user.avatar} size={32} /></Link>
        <Link to={'/' + post.user.username}><b>{post.user.username}</b></Link>
        <span className="muted">• {timeAgo(post.createdAt)}{edited && ' • Edited'}</span>
        <button className="more" onClick={() => setMenu(!menu)} aria-label="More options"><Icon name="more-fill" /></button>
        {menu && (
          <div className="menu" onMouseLeave={() => setMenu(false)}>
            {mine && <button className="danger" onClick={del}>Delete</button>}
            {mine && <button onClick={() => { setMenu(false); setEditing(true); }}>Edit</button>}
            <button onClick={copy}>Copy link</button>
            <button onClick={() => setMenu(false)}>Cancel</button>
          </div>
        )}
      </header>
      <div className="media-wrap" onDoubleClick={doubleTap}>
        {isVideo ? <FeedVideo src={post.media} className="post-media" /> : <Media post={post} className="post-media" />}
        {burst && <Icon name="heart-3-fill" className="burst" />}
      </div>
      <Actions post={post} likes={likes} setLikes={setLikes} commentCount={comments.length} onComment={() => setOpen(!open)} showCounts={false} />
      {likes.length > 0 && <p className="likes">{likes.length.toLocaleString()} {likes.length === 1 ? 'like' : 'likes'}</p>}
      {caption && <p className="caption"><b>{post.user.username}</b> <Caption text={caption} /></p>}
      {comments.length > 0 && !open && <button className="link muted" onClick={() => setOpen(true)}>View all {comments.length} comments</button>}
      {open ? <Comments postId={post._id} postOwnerId={post.user._id} comments={comments} setComments={setComments} />
        : <button className="link muted add-c" onClick={() => setOpen(true)}>Add a comment…</button>}
      {editing && <EditCaption post={{ ...post, caption }} onClose={() => setEditing(false)} onSaved={(p) => { setCaption(p.caption); setEdited(!!p.edited); }} />}
    </article>
  );
}
