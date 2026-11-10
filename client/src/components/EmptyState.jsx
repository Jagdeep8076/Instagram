export default function EmptyState({
  icon = 'ri-inbox-line',
  title,
  message,
  action,
  className = '',
}) {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state-icon">
        <i className={icon} />
      </div>
      {title && <h3 className="empty-state-title">{title}</h3>}
      {message && <p className="empty-state-message muted">{message}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

