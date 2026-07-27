import { GRADE_LABELS, formatPct } from '../api';

export default function MetricsGrid({ fundamental, technical, trend }) {
  if (!fundamental) return null;
  const grade = GRADE_LABELS[fundamental.valuation_grade] || GRADE_LABELS.neutral;

  const metrics = [
    { label: 'P/E', value: fundamental.pe_ratio?.toFixed(2), hint: '< 20 ดี' },
    { label: 'Forward P/E', value: fundamental.forward_pe?.toFixed(2) },
    { label: 'PEG', value: fundamental.peg_ratio?.toFixed(2), hint: '< 1 ดี' },
    { label: 'P/S', value: fundamental.ps_ratio?.toFixed(2) },
    { label: 'P/B', value: fundamental.pb_ratio?.toFixed(2) },
    { label: 'ROE', value: formatPct(fundamental.roe) },
    { label: 'Debt/Equity', value: fundamental.debt_to_equity?.toFixed(2) },
    { label: 'Rev Growth', value: formatPct(fundamental.revenue_growth) },
    { label: 'EPS Growth', value: formatPct(fundamental.earnings_growth) },
    { label: 'Net Margin', value: formatPct(fundamental.net_margin) },
    { label: 'Valuation', value: grade.label, color: grade.color },
    { label: 'RSI', value: technical?.rsi?.slice(-1)[0]?.toFixed(0), hint: technical?.rsi_signal },
  ];

  return (
    <div className="glass-card rounded-2xl p-6 animate-fadeIn">
      <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
        <span className="w-1.5 h-4 bg-gradient-primary rounded-full" />
        ตัวชี้วัดมูลค่า (Valuation)
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="bg-surface/60 p-3 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
            <p className="text-xs text-muted font-bold uppercase">{m.label}</p>
            <p className={`text-sm font-mono font-bold mt-1 ${m.color || 'text-foreground'}`}>{m.value || '-'}</p>
            {m.hint && <p className="text-xs text-muted mt-0.5">{m.hint}</p>}
          </div>
        ))}
      </div>

      {trend && (
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/40">
          <TrendBadge label="Trend" value={trend.trend_direction} />
          <TrendBadge label="Strength" value={trend.trend_strength} />
          <TrendBadge label="Volume" value={trend.volume_trend} />
        </div>
      )}
    </div>
  );
}

function TrendBadge({ label, value }) {
  const color = value?.includes('up') || value === 'increasing' ? 'text-success'
    : value?.includes('down') || value === 'decreasing' ? 'text-danger' : 'text-warning';
  return (
    <div className="text-center bg-surface/40 rounded-xl py-2">
      <p className="text-xs text-muted uppercase">{label}</p>
      <p className={`text-xs font-bold mt-1 ${color}`}>{value?.replace('_', ' ').toUpperCase()}</p>
    </div>
  );
}
