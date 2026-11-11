import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { useSocket } from '../SocketContext';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import timeAgo from '../components/timeAgo';

export default function Messages() {
  const { username } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { socket, online, refreshCounts } = useSocket();
  const [convos, setConvos] = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef();
  const typingTimer = useRef();

  const loadConvos = () => api.get('/messages/conversations').then((r) => setConvos(r.data));
  useEffect(() => { loadConvos(); }, []);

  useEffect(() => {
    setMsgs([]); setTyping(false);
    if (!username) return setActive(null);
    api.get('/users/' + username).then((r) => setActive(r.data.user)).catch(() => nav('/messages'));
  }, [username]);

  useEffect(() => {
    if (!active) return;
    api.get('/messages/' + active._id).then((r) => { setMsgs(r.data); refreshCounts(); loadConvos(); });
  }, [active?._id]);

  useEffect(() => {
    if (!socket) return;
    const onMsg = (m) => {
      if (active && m.from === active._id) {
        setMsgs((x) => [...x, m]);
        api.put(`/messages/${m.from}/read`).then(() => { refreshCounts(); loadConvos(); });
      } else loadConvos();
    };
    const onDel = ({ _id }) => { setMsgs((x) => x.map((m) => (m._id === _id ? { ...m, deleted: true, text: '' } : m))); loadConvos(); refreshCounts(); };
    const onTyping = ({ from }) => {
      if (active && from === active._id) { setTyping(true); clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => setTyping(false), 1500); }
    };
    socket.on('message', onMsg); socket.on('typing', onTyping); socket.on('message-deleted', onDel);
    return () => { socket.off('message', onMsg); socket.off('typing', onTyping); socket.off('message-deleted', onDel); };
  }, [socket, active?._id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, typing]);

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !active) return;
    setText('');
    const { data } = await api.post('/messages/' + active._id, { text: t });
    setMsgs((x) => [...x, data]); loadConvos();
  };
  const unsend = async (id) => { if (!confirm('Unsend this message?')) return; try { await api.delete('/messages/' + id); } catch (x) { alert(errMsg(x)); } };
  const onChange = (e) => { setText(e.target.value); socket?.emit('typing', { to: active._id }); };

  return (
    <div className="card chat">
      <aside className={'chat-list' + (active ? ' hide-sm' : '')}>
        <h3>{user.username}</h3>
        {convos.length === 0 && <p className="muted pad small">No chats yet. Open a profile and tap “Message”.</p>}
        {convos.map((c) => (
          <Link key={c.user._id} to={'/messages/' + c.user.username} className={'convo' + (active?._id === c.user._id ? ' on' : '')}>
            <span className="dot-wrap"><Avatar src={c.user.avatar} size={44} />{online.has(c.user._id) && <i className="dot" />}</span>
            <span className="grow"><b>{c.user.username}</b><br /><small className="muted">{c.last.mine ? 'You: ' : ''}{c.last.text.slice(0, 28)} · {timeAgo(c.last.createdAt)}</small></span>
            {c.unread > 0 && <em className="badge inline">{c.unread}</em>}
          </Link>
        ))}
      </aside>
      <section className={'chat-main' + (active ? '' : ' hide-sm')}>
        {!active ? <div className="empty"><Icon name="send-plane-line" /><h3>Your messages</h3><p>Send a message to start a chat.</p></div> : (
          <>
            <header className="row">
              <button className="link back" onClick={() => nav('/messages')}><Icon name="arrow-left-s-line" /></button>
              <Link to={'/' + active.username} className="row"><span className="dot-wrap"><Avatar src={active.avatar} size={36} />{online.has(active._id) && <i className="dot" />}</span>
                <span><b>{active.username}</b><br /><small className="muted">{typing ? 'typing…' : online.has(active._id) ? 'Active now' : 'Offline'}</small></span></Link>
            </header>
            <div className="chat-msgs">
              {msgs.map((m) => (
                <div key={m._id} className={'bubble ' + (m.from === user._id ? 'me' : 'them') + (m.deleted ? ' gone' : '')}>
                  {m.deleted ? 'Message unsent' : m.text}<small>{timeAgo(m.createdAt)}</small>
                  {m.from === user._id && !m.deleted && <button className="unsend" title="Unsend" aria-label="Unsend message" onClick={() => unsend(m._id)}><Icon name="delete-bin-6-line" /></button>}
                </div>
              ))}
              {typing && <div className="bubble them typing">• • •</div>}
              <div ref={endRef} />
            </div>
            <form className="row chat-form" onSubmit={send}>
              <input placeholder="Message…" value={text} onChange={onChange} maxLength={1000} />
              <button className="link send" disabled={!text.trim()}>Send</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
