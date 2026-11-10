import { useState } from 'react';
import api from '../api';
import { useAuth } from '../AuthContext';

export default function Actions({ post, likes, setLikes, commentCount, onComment }) {
  const { user, setUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const liked = likes.includes(user?._id);
  const saved = (user?.saved || []).includes(post._id);

  const like = async () => {
    if (!user) return;
    setLikes(liked ? likes.filter((l) => l !== user._id) : [...likes, user._id]);
    try {
      const { data } = await api.put(`/posts/${post._id}/like`);
      setLikes(data.likes);
    } catch {
      setLikes(likes);
    }
  };

  const save = async () => {
    if (!user) return;
    try {
      const { data } = await api.put(`/posts/${post._id}/save`);
      const cur = user.saved || [];
      setUser({ ...user, saved: data.saved ? [...cur, post._id] : cur.filter((i) => i !== post._id) });
    } catch {}
  };

  const share = async () => {
    const url = `${window.location.origin}/post/${post._id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Instaclone', url });
        return;
      } catch {}
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="actions">
      <button onClick={like} title={liked ? 'Unlike' : 'Like'} aria-label="Like post">
        <i className={liked ? 'ri-heart-fill icon-liked' : 'ri-heart-line'} />
        <small>{likes.length}</small>
      </button>
      <button onClick={onComment} title="Comment" aria-label="Comment on post">
        <i className="ri-chat-3-line" />
        <small>{commentCount}</small>
      </button>
      <button onClick={share} title="Share" aria-label="Share post">
        <i className={copied ? 'ri-check-line' : 'ri-share-forward-line'} />
        <small>{copied ? 'Link copied' : 'Share'}</small>
      </button>
      <button className="save" onClick={save} title={saved ? 'Unsave' : 'Save'} aria-label="Save post">
        <i className={saved ? 'ri-bookmark-fill' : 'ri-bookmark-line'} />
      </button>
    </div>
  );
}
