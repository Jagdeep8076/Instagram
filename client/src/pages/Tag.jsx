import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import Media from '../components/Media';
import EmptyState from '../components/EmptyState';

export default function Tag() {
  const { tag } = useParams();
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    setPosts(null);
    api
      .get('/posts/tag/' + tag)
      .then((r) => setPosts(r.data))
      .catch(() => setPosts([]));
  }, [tag]);

  return (
    <div className="tag-page">
      <div className="tag-header">
        <div className="tag-circle">
          <i className="ri-hashtag" />
        </div>
        <div>
          <h2 className="tag-title">#{tag}</h2>
          {posts !== null && (
            <p className="muted">
              <b>{posts.length}</b> {posts.length === 1 ? 'post' : 'posts'}
            </p>
          )}
        </div>
      </div>

      {posts === null ? (
        <p className="muted center-text pad">Loading…</p>
      ) : posts.length === 0 ? (
        <EmptyState
          icon="ri-hashtag"
          title="No posts yet"
          message={`Be the first to share a post with #${tag}`}
          action={
            <Link to="/create" className="primary btn">
              Create post
            </Link>
          }
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
