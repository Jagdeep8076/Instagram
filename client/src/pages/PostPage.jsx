import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import PostCard from '../components/PostCard';

export default function PostPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get('/posts/' + id).then((r) => setPost(r.data)).catch(() => setErr('This post isn\'t available.')); }, [id]);
  if (err) return <p className="muted">{err}</p>;
  return post ? <div className="feed"><PostCard post={post} onDelete={() => history.back()} /></div> : <p className="muted">Loading…</p>;
}
