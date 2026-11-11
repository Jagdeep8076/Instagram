export default function Logo({ size = 40, className = '' }) {
  return <img src="/logo.svg" width={size} height={size} alt="Instagram" className={className} draggable={false} />;
}
