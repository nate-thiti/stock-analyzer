const METRICS = [
  { key: 'pe_ratio', label: 'P/E', max: 50 },
  { key: 'peg_ratio', label: 'PEG', max: 3 },
  { key: 'ps_ratio', label: 'P/S', max: 15 },
];

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function CompareValuationChart({ results }) {
  const valid = (results || []).filter((r) => r.fundamental && r.recommendation !== 'error');
  if (valid.length < 2) return null;

  const chartH = 140;

  return (
    <div className="glass-card rounded-2xl p-6 space-y-5">
      <h3 className="text-sm font-bold text-foreground">เปรียบเทียบ Valuation</h3>
      {METRICS.map(({ key, label, max }) => (
        <div key={key}>
          <p className="text-xs font-bold text-muted uppercase mb-2">{label}</p>
          <div className="space-y-2">
            {valid.map((r, i) => {
              const val = r.fundamental[key];
              const width = val != null ? Math.min((val / max) * 100, 100) : 0;
              return (
                <div key={r.symbol} className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold w-16 shrink-0 text-foreground">{r.symbol}</span>
                  <div className="flex-1 h-3 rounded-full bg-surface border border-border/40 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(width, 2)}%`, background: COLORS[i % COLORS.length] }}
                    />
                  </div>
                  <span className="text-xs font-mono w-12 text-right text-muted">{val?.toFixed(1) ?? '-'}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-border/40">
        {valid.map((r, i) => (
          <span key={r.symbol} className="text-xs flex items-center gap-1 text-muted">
            <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            {r.symbol}
          </span>
        ))}
      </div>
    </div>
  );
}
