import { useEffect, useRef } from "react";

// Native <dialog>: focus trapping, Esc to close and the backdrop come for free.
export default function Modal({ title, eyebrow, onClose, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.open && dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
    >
      <div className="modal-body">
        <header className="modal-head">
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h2 id="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
