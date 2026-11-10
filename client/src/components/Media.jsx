export default function Media({ post, ...rest }) {
  const isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(post.media) || post.type === 'reel';
  return isVideo
    ? <video src={post.media} controls loop muted playsInline {...rest} />
    : <img src={post.media} alt="" {...rest} />;
}
