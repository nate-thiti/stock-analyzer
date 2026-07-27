import { formatMoney } from '../api';

export default function PriceRangeGrid({ low, high, current, currency, rangeLabel, compact = false }) {
  if (low == null && high == null) return null;

  const range = high != null && low != null ? high - low : null;
  const pctInRange = range && current != null && range > 0
    ? Math.min(100, Math.max(0, ((current - low) / range) * 100))
    : null;

  return (
    <div className={compact ? 'space-y-2' : 'mt-3 space-y-2'}>
      {rangeLabel && (
        <p className="text-xs text-muted font-bold uppercase text-center md:text-left">
          ช่วงราคา ({rangeLabel})
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface/60 p-2.5 rounded-xl border border-danger/20 text-center">
          <p className="text-xs text-muted uppercase">ต่ำสุด</p>
          <p className="text-xs font-mono font-bold text-danger mt-1">{formatMoney(low, currency)}</p>
        </div>
        <div className="bg-surface/60 p-2.5 rounded-xl border border-success/20 text-center">
          <p className="text-xs text-muted uppercase">สูงสุด</p>
          <p className="text-xs font-mono font-bold text-success mt-1">{formatMoney(high, currency)}</p>
        </div>
      </div>
      {current != null && range != null && range > 0 && (
        <div>
          <div className="flex justify-between text-xs text-muted mb-1">
            <span>ราคาปัจจุบัน</span>
            <span className="font-mono font-bold text-foreground">{formatMoney(current, currency)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface border border-border/40 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/70 transition-all"
              style={{ width: `${pctInRange}%` }}
            />
          </div>
          {rangeLabel && (
            <p className="text-xs text-muted mt-1 text-right">
              {pctInRange?.toFixed(0)}% ของช่วงที่เลือก
            </p>
          )}
        </div>
      )}
    </div>
  );
}
