import { HelpCircle } from 'lucide-react';

export default function InfoTip({ term, label, className = '' }) {
  if (!term) return label ? <span className={className}>{label}</span> : null;

  return (
    <span className={`inline-flex items-center gap-1 group/tip relative ${className}`}>
      {label && <span>{label}</span>}
      <button
        type="button"
        className="text-muted/70 hover:text-primary transition-colors shrink-0"
        aria-label={`คำอธิบาย ${label || ''}`}
        tabIndex={0}
      >
        <HelpCircle size={11} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 px-2.5 py-2 rounded-lg bg-surface border border-border text-[10px] text-foreground leading-relaxed opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible group-focus-within/tip:opacity-100 group-focus-within/tip:visible z-50 shadow-lg"
      >
        {term}
      </span>
    </span>
  );
}
