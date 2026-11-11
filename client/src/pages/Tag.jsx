import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import Tile from '../components/Tile';

export default function Tag() {
  const { tag } = useParams();
  const [posts, setPosts] = useState(null);
  useEffect(() => { setPosts(null); api.get('/posts/tag/' + tag).then((r) => setPosts(r.data)); }, [tag]);
  return (
    <div>
      <h2 className="tag-title">#{tag}</h2>
      {posts && <p className="muted">{posts.length} posts</p>}
      {posts && posts.length === 0 && <p className="muted">No posts with this hashtag yet.</p>}
      <div className="grid">
        {(posts || []).map((p) => <Tile key={p._id} p={p} />)}
      </div>
    </div>
  );
}
