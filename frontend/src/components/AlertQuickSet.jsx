import { formatMoney } from '../api';
import { QUICK_SET_OFFSETS, targetFromOffset, isSuggestedOffset } from '../utils/priceAlert';

export default function AlertQuickSet({ currentPrice, currency, direction, onSelect, loading = false }) {
  if (loading) {
    return <p className="text-[10px] text-muted mt-1">กำลังโหลดราคา…</p>;
  }
  if (!currentPrice) return null;

  return (
    <div className="mt-2">
      <p className="text-[10px] text-muted">
        Quick set จากราคาปัจจุบัน{' '}
        <span className="font-mono font-bold text-foreground">{formatMoney(currentPrice, currency)}</span>
      </p>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {QUICK_SET_OFFSETS.map((pct) => {
          const suggested = isSuggestedOffset(pct, direction);
          const target = targetFromOffset(currentPrice, pct);
          return (
            <button
              key={pct}
              type="button"
              onClick={() => onSelect(String(target))}
              title={formatMoney(target, currency)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors ${
                suggested
                  ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
                  : 'bg-surface/60 border-border/40 text-muted hover:border-border hover:text-foreground'
              }`}
            >
              {pct > 0 ? '+' : ''}{pct}%
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted/80 mt-1">
        {direction === 'above'
          ? 'แนะนำ +5% / +10% สำหรับ alert ขึ้นถึงเป้า'
          : 'แนะนำ −5% / −10% สำหรับ alert ลงถึงเป้า'}
      </p>
    </div>
  );
}
