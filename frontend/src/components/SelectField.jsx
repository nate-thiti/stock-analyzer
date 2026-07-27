import { useState, useRef, useEffect, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

function normalizeOptions(options) {
  return options.map((opt) => {
    if (Array.isArray(opt)) return { value: opt[0], label: opt[1] };
    return opt;
  });
}

function getModalRoot() {
  return document.getElementById('modal-root') || document.body;
}

export default function SelectField({
  label,
  value,
  onChange,
  options,
  className = '',
  size = 'md',
  disabled = false,
  id: idProp,
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const wrapRef = useRef(null);
  const listRef = useRef(null);
  const items = normalizeOptions(options);
  const selected = items.find((o) => o.value === value);

  const updateMenuPos = useCallback(() => {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const menuMaxH = 240;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < Math.min(menuMaxH, items.length * 40) && spaceAbove > spaceBelow;

    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 100000,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + gap }
        : { top: rect.bottom + gap }),
    });
  }, [items.length]);

  useEffect(() => {
    if (!open) return undefined;
    updateMenuPos();
    const onScroll = () => updateMenuPos();
    const onResize = () => updateMenuPos();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, updateMenuPos]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (listRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (next) => {
    onChange(next);
    setOpen(false);
  };

  const sizeClass = size === 'sm'
    ? 'text-sm py-2 px-3'
    : 'text-base py-2.5 px-3';

  const menu = open && !disabled ? createPortal(
    <ul
      ref={listRef}
      role="listbox"
      aria-labelledby={label ? `${id}-label` : undefined}
      style={menuStyle}
      className="rounded-xl border border-border/70 bg-card shadow-2xl py-1 max-h-60 overflow-y-auto animate-fadeIn"
    >
      {items.map((opt) => {
        const active = opt.value === value;
        return (
          <li key={String(opt.value)} role="option" aria-selected={active}>
            <button
              type="button"
              onClick={() => pick(opt.value)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                active
                  ? 'bg-primary/12 text-primary font-semibold'
                  : 'text-foreground hover:bg-surface/80'
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {active && <Check size={14} className="shrink-0 text-primary" />}
            </button>
          </li>
        );
      })}
    </ul>,
    getModalRoot(),
  ) : null;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {label && (
        <span id={`${id}-label`} className="text-sm text-muted font-bold uppercase tracking-wide">
          {label}
        </span>
      )}
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`mt-1 w-full flex items-center justify-between gap-2 rounded-xl border bg-surface text-foreground transition-all ${sizeClass} ${
          open
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-border hover:border-primary/40'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="truncate">{selected?.label ?? '—'}</span>
        <ChevronDown
          size={size === 'sm' ? 14 : 16}
          className={`shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {menu}
    </div>
  );
}
