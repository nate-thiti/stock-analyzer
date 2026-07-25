import { formatPct } from '../../api';

const METRICS = [
  { key: 'pe_ratio', label: 'P/E', benchmark: 20, invert: true, pct: false },
  { key: 'peg_ratio', label: 'PEG', benchmark: 1, invert: true, pct: false },
  { key: 'ps_ratio', label: 'P/S', benchmark: 5, invert: true, pct: false },
  { key: 'pb_ratio', label: 'P/B', benchmark: 3, invert: true, pct: false },
  { key: 'roe', label: 'ROE', benchmark: 0.15, invert: false, pct: true },
  { key: 'net_margin', label: 'Net Margin', benchmark: 0.15, invert: false, pct: true },
];

function fmt(value, pct) {
  if (value == null) return '-';
  return pct ? formatPct(value) : value.toFixed(value < 10 ? 2 : 1);
}

function barWidth(value, benchmark, invert, pct) {
  if (value == null) return 0;
  let v = value;
  let b = benchmark;
  if (pct && Math.abs(v) > 1) v /= 100;
  const ratio = Math.min(v / (b * 2), 1);
  const score = invert ? 1 - ratio : ratio;
  return Math.max(8, score * 100);
}

function zoneColor(value, benchmark, invert, pct) {
  if (value == null) return 'bg-muted';
  let v = value;
  let b = benchmark;
  if (pct && Math.abs(v) > 1) v /= 100;
  const good = invert ? v <= b : v >= b;
  const ok = invert ? v <= b * 1.5 : v >= b * 0.7;
  if (good) return 'bg-success';
  if (ok) return 'bg-warning';
  return 'bg-danger';
}

export default function ValuationMetricBars({ fundamental }) {
  if (!fundamental) return null;

  return (
    <div className="space-y-3">
      {METRICS.map(({ key, label, benchmark, invert, pct }) => {
        const value = fundamental[key];
        const width = barWidth(value, benchmark, invert, pct);
        const color = zoneColor(value, benchmark, invert, pct);
        return (
          <div key={key}>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="font-bold text-muted uppercase">{label}</span>
              <span className="font-mono font-bold text-foreground">{fmt(value, pct)}</span>
            </div>
            <div className="relative h-2.5 rounded-full bg-surface border border-border/40 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${color}`}
                style={{ width: `${width}%`, opacity: 0.85 }}
              />
            </div>
            <p className="text-[9px] text-muted mt-0.5">
              benchmark {invert ? '≤' : '≥'} {pct ? formatPct(benchmark) : benchmark}
            </p>
          </div>
        );
      })}
    </div>
  );
}
