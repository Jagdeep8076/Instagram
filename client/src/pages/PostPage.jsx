import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import PostCard from '../components/PostCard';
import EmptyState from '../components/EmptyState';

export default function PostPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [post, setPost] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api
      .get('/posts/' + id)
      .then((r) => setPost(r.data))
      .catch(() => setErr('Post not found'));
  }, [id]);

  if (err) {
    return (
      <EmptyState
        icon="ri-error-warning-line"
        title="Post not found"
        message="The post you are looking for may have been deleted or the link is broken."
        action={
          <Link to="/" className="primary btn">
            Back to Feed
          </Link>
        }
      />
    );
  }

  return post ? (
    <div className="feed">
      <PostCard
        post={post}
        onDelete={() => nav('/', { replace: true })}
        onUpdate={(updated) => setPost(updated)}
      />
    </div>
  ) : (
    <p className="muted center-text pad">Loading…</p>
  );
}
