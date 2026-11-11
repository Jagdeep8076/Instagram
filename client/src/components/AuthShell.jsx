import { Link } from 'react-router-dom';
import { APP_NAME } from '../config';
import Icon from './Icon';

// Shared frame for login / signup / password pages
export default function AuthShell({ back, onBack, children }) {
  return (
    <div className="auth2">
      <div className="auth2-col">
        {back && <Link to={back} className="auth2-back" aria-label="Back"><Icon name="arrow-left-s-line" /></Link>}
        {onBack && <button type="button" className="auth2-back" aria-label="Back" onClick={onBack}><Icon name="arrow-left-s-line" /></button>}
        {children}
        <footer className="auth2-foot">© {new Date().getFullYear()} {APP_NAME}</footer>
      </div>
    </div>
  );
}
export const DevBox = ({ children }) => <div className="devbox"><i className="ri-terminal-box-line" /><div><b>Development mode</b><br />{children}</div></div>;
