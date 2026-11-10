import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useSocket } from '../SocketContext';
import Avatar from './Avatar';

export const APP_NAME = 'Instaclone';

export function BrandLogo({ showText = true, size = 28 }) {
  return (
    <div className="brand-logo" style={{ fontSize: size }}>
      <span className="brand-glyph">
        <i className="ri-camera-lens-line" />
      </span>
      {showText && <span className="brand-text">{APP_NAME}</span>}
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { counts } = useSocket();
  const [dark, setDark] = useState(
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const items = [
    { to: '/', lineIcon: 'ri-home-5-line', fillIcon: 'ri-home-5-fill', label: 'Home', badge: 0 },
    { to: '/explore', lineIcon: 'ri-compass-3-line', fillIcon: 'ri-compass-3-fill', label: 'Explore', badge: 0 },
    { to: '/reels', lineIcon: 'ri-movie-line', fillIcon: 'ri-movie-fill', label: 'Reels', badge: 0 },
    { to: '/messages', lineIcon: 'ri-chat-3-line', fillIcon: 'ri-chat-3-fill', label: 'Messages', badge: counts?.m || 0 },
    { to: '/notifications', lineIcon: 'ri-heart-line', fillIcon: 'ri-heart-fill', label: 'Notifications', badge: counts?.n || 0 },
    { to: '/create', lineIcon: 'ri-add-box-line', fillIcon: 'ri-add-box-fill', label: 'Create', badge: 0 },
  ];

  return (
    <nav className="nav">
      <div className="logo-wrap">
        <BrandLogo />
      </div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
        >
          {({ isActive }) => (
            <>
              <span className="ico">
                <i className={isActive ? item.fillIcon : item.lineIcon} />
                {item.badge > 0 && <em className="badge">{item.badge > 9 ? '9+' : item.badge}</em>}
              </span>
              <b>{item.label}</b>
            </>
          )}
        </NavLink>
      ))}
      <NavLink
        to={'/' + user.username}
        end
        className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
      >
        <Avatar src={user.avatar} size={24} />
        <b>Profile</b>
      </NavLink>
      <button className="nav-item theme" onClick={() => setDark(!dark)} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
        <span className="ico">
          <i className={dark ? 'ri-sun-line' : 'ri-moon-line'} />
        </span>
        <b>{dark ? 'Light mode' : 'Dark mode'}</b>
      </button>
      <button className="nav-item logout" onClick={logout} title="Log out">
        <span className="ico">
          <i className="ri-logout-box-r-line" />
        </span>
        <b>Log out</b>
      </button>
    </nav>
  );
}
