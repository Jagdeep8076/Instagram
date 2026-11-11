import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Avatar from '../components/Avatar';
import Tile from '../components/Tile';
import Icon from '../components/Icon';

export default function Explore() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  useEffect(() => { api.get('/posts/explore').then((r) => setPosts(r.data)); }, []);
  useEffect(() => {
    const t = setTimeout(() => (q.trim() ? api.get('/users/search', { params: { q } }).then((r) => setUsers(r.data)) : setUsers([])), 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div>
      <div className="search-wrap"><Icon name="search-line" /><input className="search" placeholder="Search users or #hashtags" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {q.trim() ? (
        <div className="card">
          {q.trim().startsWith('#') && <Link className="row pad" to={'/tag/' + q.trim().slice(1)}><Icon name="hashtag" /> Posts with <b>{q.trim()}</b></Link>}
          {users.length === 0 && !q.trim().startsWith('#') && <p className="muted pad">No users found</p>}
          {users.map((u) => (
            <Link key={u._id} to={'/' + u.username} className="row pad"><Avatar src={u.avatar} size={40} /><span><b>{u.username}</b><br /><small className="muted">{u.fullName}</small></span></Link>
          ))}
        </div>
      ) : (
        <div className="grid">
          {posts.map((p) => <Tile key={p._id} p={p} />)}
        </div>
      )}
    </div>
  );
}
