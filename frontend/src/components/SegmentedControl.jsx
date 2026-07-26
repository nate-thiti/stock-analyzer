export default function SegmentedControl({
  value,
  onChange,
  options,
  className = '',
  size = 'sm',
  fullWidth = false,
}) {
  const pad = size === 'sm' ? 'py-1.5 px-3 text-[11px]' : 'py-2 px-3 text-xs';

  return (
    <div
      className={`${fullWidth ? 'flex w-full' : 'inline-flex'} rounded-xl border border-border/70 bg-surface/50 p-1 gap-0.5 ${className}`}
      role="tablist"
    >
      {options.map(({ value: v, label, icon: Icon }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v)}
            className={`${fullWidth ? 'flex-1' : ''} flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all ${pad} ${
              active
                ? 'bg-primary/15 text-primary border border-primary/25 shadow-sm'
                : 'text-muted hover:text-foreground hover:bg-surface/80 border border-transparent'
            }`}
          >
            {Icon && <Icon size={size === 'sm' ? 12 : 14} className="shrink-0" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
