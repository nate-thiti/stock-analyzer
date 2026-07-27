import { getMarketStateLabel, isMarketRegular } from '../api';

const STATE_STYLES = {
  REGULAR: 'bg-success/10 border-success/30 text-success',
  CLOSED: 'bg-surface border-border/50 text-muted',
  PRE: 'bg-warning/10 border-warning/30 text-warning',
  POST: 'bg-warning/10 border-warning/30 text-warning',
  PREPRE: 'bg-surface border-border/50 text-muted',
  POSTPOST: 'bg-surface border-border/50 text-muted',
};

export default function MarketStateBadge({ marketState, compact = false }) {
  const label = getMarketStateLabel(marketState);
  if (!label) return null;

  const open = isMarketRegular(marketState);
  const style = STATE_STYLES[marketState] || STATE_STYLES.CLOSED;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-bold shrink-0 ${
        compact ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-sm'
      } ${style}`}
      title={label}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {open && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
        )}
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
            open ? 'bg-success' : marketState === 'PRE' || marketState === 'POST' ? 'bg-warning' : 'bg-muted'
          }`}
        />
      </span>
      {label}
    </span>
  );
}
