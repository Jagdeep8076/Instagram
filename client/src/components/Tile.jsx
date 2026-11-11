import { Link } from 'react-router-dom';
import Media from './Media';
import Icon from './Icon';

// Square grid tile (profile / explore / hashtag) with hover counts like Instagram
export default function Tile({ p }) {
  return (
    <Link to={'/post/' + p._id} className="tile">
      <Media post={p} controls={false} />
      {p.type === 'reel' && <Icon name="clapperboard-fill" className="tile-ico" />}
      <span className="hover">
        <b><Icon name="heart-3-fill" /> {p.likes?.length || 0}</b>
        <b><Icon name="chat-3-fill" /> {p.comments?.length || 0}</b>
      </span>
    </Link>
  );
}
