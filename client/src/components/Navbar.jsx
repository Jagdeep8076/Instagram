import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useSocket } from '../SocketContext';
import { APP_NAME } from '../config';
import Avatar from './Avatar';
import Icon from './Icon';
import Logo from './Logo';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { counts } = useSocket();
  const [dark, setDark] = useState(document.documentElement.dataset.theme === 'dark');
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const items = [
    ['/', 'home-5', 'Home', 0],
    ['/explore', 'compass-3', 'Explore', 0],
    ['/reels', 'clapperboard', 'Reels', 0],
    ['/messages', 'messenger', 'Messages', counts.m],
    ['/notifications', 'heart-3', 'Notifications', counts.n],
    ['/create', 'add-box', 'Create', 0],
  ];
  const cls = ({ isActive }) => 'nav-item' + (isActive ? ' active' : '');
  return (
    <>
      <header className="mtop"><Logo size={26} /><span className="logo">{APP_NAME}</span></header>
      <nav className="nav">
        <div className="logo-wrap"><span className="logo-full"><Logo size={28} /><span className="logo">{APP_NAME}</span></span><Logo size={28} className="logo-mini" /></div>
        {items.map(([to, icon, label, badge]) => (
          <NavLink key={to} to={to} end={to === '/'} className={cls}>
            {({ isActive }) => (
              <>
                <span className="ico"><Icon name={`${icon}-${isActive ? 'fill' : 'line'}`} />{badge > 0 && <em className="badge">{badge > 9 ? '9+' : badge}</em>}</span>
                <b>{label}</b>
              </>
            )}
          </NavLink>
        ))}
        <NavLink to={'/' + user.username} end className={cls}>
          <span className="ico"><Avatar src={user.avatar} size={26} /></span><b>Profile</b>
        </NavLink>
        <div className="nav-bottom">
          <NavLink to="/settings" className={cls}>{({ isActive }) => (<><span className="ico"><Icon name={isActive ? 'settings-3-fill' : 'settings-3-line'} /></span><b>Settings</b></>)}</NavLink>
          <button className="nav-item" onClick={() => setDark(!dark)}><span className="ico"><Icon name={dark ? 'sun-line' : 'moon-line'} /></span><b>{dark ? 'Light mode' : 'Dark mode'}</b></button>
          <button className="nav-item" onClick={logout}><span className="ico"><Icon name="logout-box-r-line" /></span><b>Log out</b></button>
        </div>
      </nav>
    </>
  );
}
