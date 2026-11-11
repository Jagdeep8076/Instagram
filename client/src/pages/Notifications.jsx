import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { notifText, useSocket } from '../SocketContext';
import Avatar from '../components/Avatar';
import Media from '../components/Media';
import Icon from '../components/Icon';
import timeAgo from '../components/timeAgo';

export default function Notifications() {
  const { socket, refreshCounts } = useSocket();
  const [items, setItems] = useState(null);
  const markRead = () => api.put('/notifications/read').then(refreshCounts);
  useEffect(() => { api.get('/notifications').then((r) => { setItems(r.data); markRead(); }); }, []);
  useEffect(() => {
    if (!socket) return;
    const h = (n) => { setItems((x) => [n, ...(x || [])]); markRead(); };
    socket.on('notification', h);
    return () => socket.off('notification', h);
  }, [socket]);
  if (!items) return <p className="muted">Loading…</p>;
  return (
    <div className="narrow">
      <h2>Notifications</h2>
      {items.length === 0 ? (
        <div className="empty"><Icon name="heart-3-line" /><h3>Activity on your posts</h3><p>When someone likes or comments on one of your posts, or follows you, you&apos;ll see it here.</p></div>
      ) : (
        <div className="card">
          {items.map((n) => (
            <div key={n._id} className={'notif row between' + (n.read ? '' : ' unread')}>
              <Link to={'/' + n.from.username} className="row grow">
                <Avatar src={n.from.avatar} size={40} />
                <span><b>{n.from.username}</b> {notifText(n)} <small className="muted">{timeAgo(n.createdAt)}</small></span>
              </Link>
              {n.post && <Link to={'/post/' + n.post._id} className="thumb"><Media post={n.post} controls={false} /></Link>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
