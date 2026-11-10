import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Avatar from '../components/Avatar';
import Media from '../components/Media';
import EmptyState from '../components/EmptyState';

export default function Explore() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    api
      .get('/posts/explore')
      .then((r) => setPosts(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim()) {
        api
          .get('/users/search', { params: { q } })
          .then((r) => setUsers(r.data))
          .catch(() => {});
      } else {
        setUsers([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="explore-page">
      <div className="search-wrap">
        <i className="ri-search-line search-icon" />
        <input
          className="search"
          placeholder="Search users or #hashtags…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button
            className="search-clear-btn"
            onClick={() => setQ('')}
            aria-label="Clear search"
          >
            <i className="ri-close-circle-fill" />
          </button>
        )}
      </div>

      {q.trim() ? (
        <div className="card search-results">
          {q.trim().startsWith('#') && (
            <Link className="row pad tag-search-row" to={'/tag/' + q.trim().slice(1)}>
              <span className="search-tag-icon">
                <i className="ri-hashtag" />
              </span>
              <span>
                Posts with <b>{q.trim()}</b>
              </span>
            </Link>
          )}
          {users.length === 0 && !q.trim().startsWith('#') && (
            <p className="muted pad center-text">No users found matching "{q}"</p>
          )}
          {users.map((u) => (
            <Link key={u._id} to={'/' + u.username} className="row pad search-user-row">
              <Avatar src={u.avatar} size={40} />
              <span>
                <b>{u.username}</b>
                {u.fullName && <br />}
                {u.fullName && <small className="muted">{u.fullName}</small>}
              </span>
            </Link>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon="ri-compass-3-line"
          title="Explore Instaclone"
          message="Discover new photos, videos, and creators."
        />
      ) : (
        <div className="grid">
          {posts.map((p) => (
            <Link key={p._id} to={'/post/' + p._id} className="tile">
              <Media post={p} controls={false} />
              {p.type === 'reel' && (
                <i className="tile-badge">
                  <i className="ri-movie-fill" />
                </i>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
