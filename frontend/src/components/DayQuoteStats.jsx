import { formatMoney } from '../api';

export default function DayQuoteStats({ open, high, low, currency }) {
  if (open == null && high == null && low == null) return null;

  const items = [
    { label: 'เปิดวัน', value: open, className: 'text-foreground' },
    { label: 'สูงสุด', value: high, className: 'text-success' },
    { label: 'ต่ำสุด', value: low, className: 'text-danger' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-border/20">
      {items.map(({ label, value, className }) => (
        <div key={label} className="bg-surface/50 rounded-lg px-2 py-1.5 border border-border/30 text-center min-w-0">
          <p className="text-xs text-muted uppercase truncate">{label}</p>
          <p className={`text-sm font-mono font-bold mt-0.5 truncate ${className}`}>
            {value != null ? formatMoney(value, currency) : '-'}
          </p>
        </div>
      ))}
    </div>
  );
}
