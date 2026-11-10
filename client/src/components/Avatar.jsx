export default function Avatar({ src, size = 32 }) {
  return src
    ? <img className="avatar" src={src} width={size} height={size} alt="" />
    : <span className="avatar ph" style={{ width: size, height: size }} />;
}
