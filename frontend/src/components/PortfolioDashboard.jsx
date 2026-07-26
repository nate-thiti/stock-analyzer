import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, PieChart } from 'lucide-react';

const COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4',
  '#a855f7', '#ec4899', '#84cc16', '#f97316', '#14b8a6',
];

function groupBySector(positions) {
  const map = {};
  for (const p of positions) {
    const sector = p.sector || 'อื่นๆ';
    map[sector] = (map[sector] || 0) + (p.market_value || 0);
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function allocationBySymbol(positions, total) {
  if (!total) return [];
  return positions
    .filter((p) => p.market_value > 0)
    .map((p) => ({
      symbol: p.symbol,
      value: p.market_value,
      pct: (p.market_value / total) * 100,
    }))
    .sort((a, b) => b.value - a.value);
}

function PieChartSvg({ slices }) {
  if (slices.length === 0) return null;
  const r = 54;
  const cx = 64;
  const cy = 64;
  let start = -Math.PI / 2;
  const paths = slices.map((slice, i) => {
    const angle = (slice.pct / 100) * Math.PI * 2;
    const end = start + angle;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = angle > Math.PI ? 1 : 0;
    const d = slices.length === 1
      ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    start = end;
    return { d, color: COLORS[i % COLORS.length], ...slice };
  });

  return (
    <svg viewBox="0 0 128 128" className="w-32 h-32 shrink-0">
      {paths.map((p) => (
        <path key={p.symbol} d={p.d} fill={p.color} opacity={0.9} />
      ))}
      <circle cx={cx} cy={cy} r={28} className="fill-[var(--color-surface)]" />
    </svg>
  );
}

export default function PortfolioDashboard({ positions, totalValue }) {
  const withValue = positions.filter((p) => p.market_value != null);
  const symbolSlices = allocationBySymbol(withValue, totalValue);
  const sectors = groupBySector(withValue);
  const maxSector = sectors[0]?.value || 1;

  const ranked = [...withValue]
    .filter((p) => p.unrealized_pnl_pct != null)
    .sort((a, b) => b.unrealized_pnl_pct - a.unrealized_pnl_pct);
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];

  if (withValue.length === 0) return null;

  return (
    <div className="space-y-4">
      {(best || worst) && best !== worst && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {best && (
            <PerformerCard
              label="กำไรสูงสุด"
              position={best}
              positive
              icon={<TrendingUp size={16} />}
            />
          )}
          {worst && (
            <PerformerCard
              label="ขาดทุนมากสุด"
              position={worst}
              positive={worst.unrealized_pnl >= 0}
              icon={<TrendingDown size={16} />}
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
            <PieChart size={16} className="text-primary" /> สัดส่วนตามหุ้น
          </h3>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <PieChartSvg slices={symbolSlices} />
            <div className="flex-1 w-full space-y-1.5">
              {symbolSlices.map((s, i) => (
                <div key={s.symbol} className="flex items-center justify-between text-xs gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <Link to={`/stock/${s.symbol}`} className="font-mono font-bold hover:text-primary truncate">{s.symbol}</Link>
                  </span>
                  <span className="font-mono text-muted shrink-0">{s.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-bold mb-4">สัดส่วนตาม Sector</h3>
          <div className="space-y-3">
            {sectors.map(({ name, value }) => (
              <div key={name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted truncate pr-2">{name}</span>
                  <span className="font-mono font-bold shrink-0">
                    {totalValue ? ((value / totalValue) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface border border-border/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/70 transition-all"
                    style={{ width: `${Math.max(4, (value / maxSector) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {sectors.length === 0 && (
              <p className="text-xs text-muted">ไม่มีข้อมูล sector</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PerformerCard({ label, position, positive, icon }) {
  return (
    <Link
      to={`/stock/${position.symbol}`}
      className={`glass-card rounded-xl p-4 border transition-colors hover:border-primary/40 ${positive ? 'border-success/20' : 'border-danger/20'}`}
    >
      <p className="text-[10px] text-muted uppercase flex items-center gap-1">{icon} {label}</p>
      <p className="font-mono font-black text-lg mt-1">{position.symbol}</p>
      {position.name && <p className="text-xs text-muted truncate">{position.name}</p>}
      <p className={`text-sm font-mono font-bold mt-2 ${positive ? 'text-success' : 'text-danger'}`}>
        {position.unrealized_pnl >= 0 ? '+' : ''}{position.unrealized_pnl?.toFixed(0)}
        <span className="text-xs ml-1">({position.unrealized_pnl_pct?.toFixed(1)}%)</span>
      </p>
    </Link>
  );
}
