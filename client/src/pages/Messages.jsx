import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import { useSocket } from '../SocketContext';
import Avatar from '../components/Avatar';
import timeAgo from '../components/timeAgo';
import EmptyState from '../components/EmptyState';

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

  const loadConvos = () =>
    api
      .get('/messages/conversations')
      .then((r) => setConvos(r.data))
      .catch(() => {});

  useEffect(() => {
    loadConvos();
  }, []);

  useEffect(() => {
    setMsgs([]);
    setTyping(false);
    if (!username) return setActive(null);
    api
      .get('/users/' + username)
      .then((r) => setActive(r.data.user))
      .catch(() => nav('/messages'));
  }, [username]);

  useEffect(() => {
    if (!active) return;
    api.get('/messages/' + active._id).then((r) => {
      setMsgs(r.data);
      refreshCounts();
      loadConvos();
    });
  }, [active?._id]);

  useEffect(() => {
    if (!socket) return;
    const onMsg = (m) => {
      if (active && (m.from === active._id || m.to === active._id)) {
        setMsgs((x) => (x.some((item) => item._id === m._id) ? x : [...x, m]));
        if (m.from === active._id) {
          api.put(`/messages/${m.from}/read`).then(() => {
            refreshCounts();
            loadConvos();
          });
        }
      } else {
        loadConvos();
      }
    };

    const onUnsent = ({ messageId }) => {
      setMsgs((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, isUnsent: true, text: '' } : m
        )
      );
      loadConvos();
    };

    const onTyping = ({ from }) => {
      if (active && from === active._id) {
        setTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 1500);
      }
    };

    socket.on('message', onMsg);
    socket.on('message_unsent', onUnsent);
    socket.on('typing', onTyping);

    return () => {
      socket.off('message', onMsg);
      socket.off('message_unsent', onUnsent);
      socket.off('typing', onTyping);
    };
  }, [socket, active?._id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, typing]);

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !active) return;
    setText('');
    try {
      const { data } = await api.post('/messages/' + active._id, { text: t });
      setMsgs((x) => (x.some((item) => item._id === data._id) ? x : [...x, data]));
      loadConvos();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to send message');
    }
  };

  const unsend = async (messageId) => {
    if (!window.confirm('Unsend this message for everyone?')) return;
    try {
      await api.delete('/messages/' + messageId);
      setMsgs((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, isUnsent: true, text: '' } : m
        )
      );
      loadConvos();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to unsend message');
    }
  };

  const onChange = (e) => {
    setText(e.target.value);
    if (active) socket?.emit('typing', { to: active._id });
  };

  return (
    <div className="card chat">
      <aside className={'chat-list' + (active ? ' hide-sm' : '')}>
        <div className="chat-list-header">
          <h3>{user?.username}</h3>
        </div>
        {convos.length === 0 && (
          <p className="muted pad small">No messages yet. Send a message to get started.</p>
        )}
        {convos.map((c) => (
          <Link
            key={c.user._id}
            to={'/messages/' + c.user.username}
            className={'convo' + (active?._id === c.user._id ? ' on' : '')}
          >
            <span className="dot-wrap">
              <Avatar src={c.user.avatar} size={44} />
              {online.has(c.user._id) && <i className="dot" />}
            </span>
            <span className="grow">
              <b>{c.user.username}</b>
              <br />
              <small className="muted">
                {c.last.mine ? 'You: ' : ''}
                {c.last.isUnsent ? 'Message unsent' : c.last.text?.slice(0, 28)} ·{' '}
                {timeAgo(c.last.createdAt)}
              </small>
            </span>
            {c.unread > 0 && <em className="badge inline">{c.unread}</em>}
          </Link>
        ))}
      </aside>

      <section className={'chat-main' + (active ? '' : ' hide-sm')}>
        {!active ? (
          <div className="chat-placeholder">
            <EmptyState
              icon="ri-chat-3-line"
              title="Your messages"
              message="Send private photos and messages to a friend."
            />
          </div>
        ) : (
          <>
            <header className="row">
              <button
                className="icon-btn back"
                onClick={() => nav('/messages')}
                aria-label="Back to conversations"
              >
                <i className="ri-arrow-left-line" />
              </button>
              <Link to={'/' + active.username} className="row">
                <span className="dot-wrap">
                  <Avatar src={active.avatar} size={36} />
                  {online.has(active._id) && <i className="dot" />}
                </span>
                <span>
                  <b>{active.username}</b>
                  <br />
                  <small className="muted">
                    {typing
                      ? 'typing…'
                      : online.has(active._id)
                      ? 'Active now'
                      : 'Offline'}
                  </small>
                </span>
              </Link>
            </header>

            <div className="chat-msgs">
              {msgs.map((m) => {
                const isMe = m.from === user?._id;
                return (
                  <div
                    key={m._id}
                    className={
                      'bubble-wrap ' + (isMe ? 'bubble-me-wrap' : 'bubble-them-wrap')
                    }
                  >
                    <div
                      className={
                        'bubble ' +
                        (isMe ? 'me' : 'them') +
                        (m.isUnsent ? ' unsent' : '')
                      }
                    >
                      {m.isUnsent ? (
                        <span className="unsent-text">
                          <i className="ri-information-line" /> Message unsent
                        </span>
                      ) : (
                        m.text
                      )}
                      <small>{timeAgo(m.createdAt)}</small>
                    </div>
                    {isMe && !m.isUnsent && (
                      <button
                        className="unsend-btn"
                        onClick={() => unsend(m._id)}
                        title="Unsend"
                        aria-label="Unsend message"
                      >
                        <i className="ri-delete-bin-line" />
                      </button>
                    )}
                  </div>
                );
              })}
              {typing && <div className="bubble them typing">• • •</div>}
              <div ref={endRef} />
            </div>

            <form className="row chat-form" onSubmit={send}>
              <input
                placeholder="Message…"
                value={text}
                onChange={onChange}
                maxLength={1000}
              />
              <button className="primary" disabled={!text.trim()}>
                Send
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
