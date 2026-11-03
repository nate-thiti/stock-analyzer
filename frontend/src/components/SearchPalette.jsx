import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import StockSearch from './StockSearch';

/** หน้าต่างค้นหาหุ้นแบบลอย — เปิดได้จากทุกหน้า (ปุ่มบน header, Ctrl/⌘+K หรือ /) */
export default function SearchPalette({ open, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-start justify-center px-3 pt-[12vh] sm:pt-[15vh] bg-black/55 backdrop-blur-sm"
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="ค้นหาหุ้น"
    >
      <div className="w-full max-w-xl rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-fadeIn">
        <StockSearch variant="palette" autoFocus onNavigate={onClose} onEscape={onClose} />
        <div className="hidden sm:flex items-center gap-4 border-t border-border/50 px-4 py-2 text-xs text-muted">
          <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> เลือก</span>
          <span><Kbd>Enter</Kbd> เปิด</span>
          <span><Kbd>Esc</Kbd> ปิด</span>
        </div>
      </div>
    </div>,
    document.getElementById('modal-root') || document.body,
  );
}

export function Kbd({ children }) {
  return (
    <kbd className="inline-flex min-w-5 items-center justify-center rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-xs leading-none text-muted">
      {children}
    </kbd>
  );
}
