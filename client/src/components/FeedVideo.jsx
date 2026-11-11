import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

// Instagram-style feed video: autoplays (muted) when in view, tap to pause, speaker button
export default function FeedVideo({ src, className }) {
  const ref = useRef();
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const v = ref.current;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.6 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  const toggle = () => { const v = ref.current; if (v.paused) { v.play(); setPaused(false); } else { v.pause(); setPaused(true); } };
  return (
    <>
      <video ref={ref} src={src} className={className} loop muted={muted} playsInline onClick={toggle} />
      <button type="button" className="mute" onClick={(e) => { e.stopPropagation(); setMuted(!muted); }} aria-label="Sound">
        <Icon name={muted ? 'volume-mute-fill' : 'volume-up-fill'} />
      </button>
      {paused && <Icon name="play-fill" className="play-ico" />}
    </>
  );
}
