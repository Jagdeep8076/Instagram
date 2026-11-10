import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';
import Stories from '../components/Stories';
import EmptyState from '../components/EmptyState';

const PAGE = 5;

function Suggestions() {
  const [list, setList] = useState([]);

  useEffect(() => {
    api.get('/users/suggestions').then((r) => setList(r.data)).catch(() => {});
  }, []);

  const follow = async (u) => {
    await api.put(`/users/${u._id}/follow`);
    setList(list.filter((x) => x._id !== u._id));
  };

  if (!list.length) return null;

  return (
    <aside className="card suggest">
      <b>Suggested for you</b>
      {list.map((u) => (
        <div key={u._id} className="row between">
          <Link to={'/' + u.username} className="row">
            <Avatar src={u.avatar} />
            <span>{u.username}</span>
          </Link>
          <button className="link" onClick={() => follow(u)}>
            Follow
          </button>
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
    } catch {
      setMore(false);
    }
    setLoading(false);
    setFirst(false);
  };

  useEffect(() => {
    loadPage(1);
  }, []);

  // infinite scroll
  useEffect(() => {
    if (first || loading || !more || !sentinel.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setPage(page + 1);
          loadPage(page + 1);
        }
      },
      { rootMargin: '400px' }
    );
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [first, loading, more, page]);

  return (
    <div className="feed-wrap">
      <div className="feed">
        <Stories />
        {!first && posts.length === 0 && (
          <EmptyState
            icon="ri-home-heart-line"
            title="Welcome to Instaclone"
            message="When you follow people, you'll see their photos and videos here."
            action={
              <Link to="/create" className="primary btn">
                <i className="ri-add-box-line" /> Create first post
              </Link>
            }
          />
        )}
        {posts.map((p) => (
          <PostCard
            key={p._id}
            post={p}
            onDelete={(id) => setPosts(posts.filter((x) => x._id !== id))}
          />
        ))}
        <div ref={sentinel} className="muted center-text small caught-up">
          {loading ? (
            'Loading…'
          ) : !more && posts.length > 0 ? (
            <span>
              <i className="ri-checkbox-circle-line" /> You're all caught up
            </span>
          ) : (
            ''
          )}
        </div>
      </div>
      <Suggestions />
    </div>
  );
}
