// Remix Icon wrapper:  <Icon name="heart-3-fill" />  ->  <i class="ri-heart-3-fill" />
export default function Icon({ name, className = '', ...rest }) {
  return <i className={`ri-${name} ${className}`} {...rest} />;
}
