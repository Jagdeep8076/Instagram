import { useState } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';
import Icon from './Icon';

export default function Actions({ post, likes, setLikes, commentCount, onComment, showCounts = true }) {
  const { user, setUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const liked = likes.includes(user._id);
  const saved = (user.saved || []).includes(post._id);

  const like = async () => {
    setLikes(liked ? likes.filter((l) => l !== user._id) : [...likes, user._id]);
    try { const { data } = await api.put(`/posts/${post._id}/like`); setLikes(data.likes); } catch { setLikes(likes); }
  };
  const save = async () => {
    const { data } = await api.put(`/posts/${post._id}/save`);
    const cur = user.saved || [];
    setUser({ ...user, saved: data.saved ? [...cur, post._id] : cur.filter((i) => i !== post._id) });
  };
  const share = async () => {
    const url = `${window.location.origin}/post/${post._id}`;
    if (navigator.share) { try { await navigator.share({ title: 'Instagram', url }); return; } catch {} }
    await navigator.clipboard.writeText(url);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className={'actions' + (showCounts ? ' counts' : '')}>
      <button className={liked ? 'liked' : ''} onClick={like} title="Like">
        <Icon name={liked ? 'heart-3-fill' : 'heart-3-line'} />{showCounts && <small>{likes.length}</small>}
      </button>
      <button onClick={onComment} title="Comment"><Icon name="chat-3-line" />{showCounts && <small>{commentCount}</small>}</button>
      <button onClick={share} title="Share"><Icon name={copied ? 'check-line' : 'send-plane-line'} />{showCounts && <small>{copied ? 'Copied' : 'Share'}</small>}</button>
      <button className="save" onClick={save} title={saved ? 'Unsave' : 'Save'}><Icon name={saved ? 'bookmark-fill' : 'bookmark-line'} /></button>
    </div>
  );
}
