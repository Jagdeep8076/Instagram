import { Link } from 'react-router-dom';
// Turns #hashtags and @mentions into links
export default function Caption({ text = '' }) {
  return text.split(/([#@]\w+)/g).map((part, i) =>
    part[0] === '#' && part.length > 1 ? <Link key={i} className="tag" to={'/tag/' + part.slice(1)}>{part}</Link>
    : part[0] === '@' && part.length > 1 ? <Link key={i} className="tag" to={'/' + part.slice(1).toLowerCase()}>{part}</Link>
    : part
  );
}
