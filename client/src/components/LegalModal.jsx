export default function LegalModal({ title, content, onClose }) {
  if (!title) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <i className="ri-close-line" />
          </button>
        </div>
        <div className="modal-body">
          {content}
        </div>
        <div className="modal-footer">
          <button className="btn-pill btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

