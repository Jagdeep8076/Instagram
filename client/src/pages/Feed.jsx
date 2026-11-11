import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';
import Stories from '../components/Stories';
import Icon from '../components/Icon';

const PAGE = 5;

function Sidebar() {
  const { user, logout } = useAuth();
  const [list, setList] = useState([]);
  useEffect(() => { api.get('/users/suggestions').then((r) => setList(r.data)); }, []);
  const follow = async (u) => { await api.put(`/users/${u._id}/follow`); setList(list.filter((x) => x._id !== u._id)); };
  return (
    <aside className="side">
      <div className="row between me">
        <Link to={'/' + user.username} className="row"><Avatar src={user.avatar} size={56} /><span><b>{user.username}</b><br /><small className="muted">{user.fullName}</small></span></Link>
        <button className="link small" onClick={logout}>Log out</button>
      </div>
      {list.length > 0 && <div className="row between sg-head"><b className="muted">Suggested for you</b><Link to="/explore" className="small"><b>See All</b></Link></div>}
      {list.map((u) => (
        <div key={u._id} className="row between">
          <Link to={'/' + u.username} className="row"><Avatar src={u.avatar} size={44} /><span><b className="small">{u.username}</b><br /><small className="muted">{u.fullName || 'Suggested for you'}</small></span></Link>
          <button className="link small" onClick={() => follow(u)}>Follow</button>
        </div>
      ))}
    </aside>
  );
}

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [first, setFirst] = useState(true);
  const sentinel = useRef();

  const loadPage = async (p) => {
    setLoading(true);
    try {
      const { data } = await api.get('/posts/feed', { params: { page: p, limit: PAGE } });
      setPosts((x) => (p === 1 ? data : [...x, ...data]));
      setMore(data.length === PAGE);
    } catch { setMore(false); }
    setLoading(false); setFirst(false);
  };
  useEffect(() => { loadPage(1); }, []);
  useEffect(() => {
    if (first || loading || !more || !sentinel.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setPage(page + 1); loadPage(page + 1); } }, { rootMargin: '400px' });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [first, loading, more, page]);

  return (
    <div className="feed-wrap">
      <div className="feed">
        <Stories />
        {!first && posts.length === 0 && (
          <div className="empty"><Icon name="camera-lens-line" /><h3>Welcome to Instagram</h3><p>Follow people from the right side or <Link to="/create" className="tag">share your first photo</Link>.</p></div>
        )}
        {posts.map((p) => <PostCard key={p._id} post={p} onDelete={(id) => setPosts(posts.filter((x) => x._id !== id))} />)}
        <div ref={sentinel} className="muted center-text small end">{loading ? 'Loading…' : !more && posts.length > 0 ? <><Icon name="checkbox-circle-line" /> You&apos;re all caught up</> : ''}</div>
      </div>
      <Sidebar />
    </div>
  );
}
