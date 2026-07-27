import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

function getModalRoot() {
  return document.getElementById('modal-root') || document.body;
}

export default function Modal({ open, onClose, title, titleId, children, dismissible = true, size = 'sm' }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, dismissible]);

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={dismissible ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={`glass-card rounded-2xl p-5 w-full space-y-4 shadow-2xl border border-border/60 animate-fadeIn ${
          size === 'md' ? 'max-w-md' : 'max-w-sm'
        }`}
        style={{ maxHeight: 'min(90vh, 640px)', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between gap-3">
            <h3 id={titleId} className="text-sm font-bold text-foreground">{title}</h3>
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                className="text-muted hover:text-foreground p-1 rounded-lg hover:bg-surface/80 shrink-0"
                aria-label="ปิด"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    getModalRoot(),
  );
}
