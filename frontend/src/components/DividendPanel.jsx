import { Banknote } from 'lucide-react';
import { formatPct, formatMoney } from '../api';

function sortChronological(dividends) {
  return [...dividends].sort((a, b) => a.ex_date.localeCompare(b.ex_date));
}

function linearTrend(values) {
  const n = values.length;
  if (n < 2) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function formatExLabel(dateStr) {
  if (!dateStr) return '';
  const [y, m] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m) - 1] || m} '${String(y).slice(2)}`;
}

function DividendBarChart({ dividends, currency }) {
  const sorted = sortChronological(dividends);
  if (sorted.length === 0) return null;

  const W = 640;
  const H = 220;
  const pad = { top: 16, right: 12, bottom: 36, left: 44 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const amounts = sorted.map((d) => d.amount);
  const maxY = Math.max(...amounts, 0.0001) * 1.12;
  const n = sorted.length;
  const slot = chartW / n;
  const barW = Math.min(28, slot * 0.55);

  const yScale = (v) => pad.top + chartH - (v / maxY) * chartH;

  const bars = sorted.map((d, i) => {
    const cx = pad.left + slot * i + slot / 2;
    const h = (d.amount / maxY) * chartH;
    const y = pad.top + chartH - h;
    return { ...d, cx, y, h, i };
  });

  const trend = linearTrend(amounts);
  let trendLine = null;
  if (trend) {
    const x0 = pad.left + slot / 2;
    const x1 = pad.left + slot * (n - 1) + slot / 2;
    const y0 = yScale(trend.intercept);
    const y1 = yScale(trend.intercept + trend.slope * (n - 1));
    trendLine = { x0, y0, x1, y1 };
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    v: maxY * t,
    y: yScale(maxY * t),
  }));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[320px] h-auto" role="img" aria-label="ประวัติเงินปันผล">
        {yTicks.map(({ v, y }) => (
          <g key={v}>
            <line x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="var(--border)" strokeOpacity="0.35" />
            <text x={pad.left - 6} y={y + 3} textAnchor="end" className="fill-muted" fontSize="9">
              {v.toFixed(v < 1 ? 3 : 2)}
            </text>
          </g>
        ))}

        {bars.map((b) => (
          <g key={b.ex_date}>
            <rect
              x={b.cx - barW / 2}
              y={b.y}
              width={barW}
              height={Math.max(b.h, 1)}
              rx={3}
              className="fill-success/75 hover:fill-success transition-colors"
            >
              <title>{`${b.ex_date}: ${b.amount.toFixed(4)} ${currency}`}</title>
            </rect>
            {(n <= 12 || b.i % Math.ceil(n / 10) === 0 || b.i === n - 1) && (
              <text
                x={b.cx}
                y={H - 10}
                textAnchor="middle"
                className="fill-muted"
                fontSize="8"
              >
                {formatExLabel(b.ex_date)}
              </text>
            )}
          </g>
        ))}

        {trendLine && (
          <line
            x1={trendLine.x0}
            y1={trendLine.y0}
            x2={trendLine.x1}
            y2={trendLine.y1}
            stroke="var(--primary)"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinecap="round"
          />
        )}

        {trendLine && (
          <circle cx={trendLine.x1} cy={trendLine.y1} r="3" className="fill-primary" />
        )}
      </svg>

      <div className="flex gap-4 text-xs text-muted justify-center mt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-success/75" /> เงินปันผล/งวด
        </span>
        {trendLine && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0 border-t-2 border-dashed border-primary" /> แนวโน้ม
          </span>
        )}
      </div>
    </div>
  );
}

export default function DividendPanel({ dividends = [], annualDividend, dividendYield, currency = 'USD' }) {
  if (!dividends.length && !annualDividend) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-2">
          <Banknote size={16} className="text-primary" /> เงินปันผล
        </h3>
        <p className="text-xs text-muted">ไม่มีข้อมูลเงินปันผลสำหรับหุ้นนี้</p>
      </div>
    );
  }

  const sorted = sortChronological(dividends);
  const latest = sorted[sorted.length - 1];

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
        <Banknote size={16} className="text-primary" /> เงินปันผล
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {annualDividend != null && (
          <Stat label="ประมาณการ/ปี" value={`${annualDividend.toFixed(2)} ${currency}`} />
        )}
        {dividendYield != null && (
          <Stat label="Div Yield" value={formatPct(dividendYield)} />
        )}
        <Stat label="งวดล่าสุด" value={latest ? formatMoney(latest.amount, currency, { decimals: 4 }) : '-'} />
      </div>

      {sorted.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-muted uppercase mb-2">ประวัติเงินปันผล</p>
          <DividendBarChart dividends={sorted} currency={currency} />
        </div>
      )}

      {sorted.length > 0 && (
        <details className="group">
          <summary className="text-xs font-bold text-muted uppercase cursor-pointer hover:text-primary transition-colors">
            ตารางรายละเอียด ({sorted.length} งวด)
          </summary>
          <div className="overflow-x-auto mt-3 max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40 text-muted sticky top-0 bg-card/90">
                  <th className="text-left py-2 pr-4 font-bold uppercase text-xs">Ex-Date</th>
                  <th className="text-right py-2 font-bold uppercase text-xs">จำนวน ({currency})</th>
                </tr>
              </thead>
              <tbody>
                {[...sorted].reverse().map((d) => (
                  <tr key={d.ex_date} className="border-b border-border/20">
                    <td className="py-2 pr-4 font-mono text-muted">{d.ex_date}</td>
                    <td className="py-2 text-right font-mono font-bold">{d.amount.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-surface/40 p-3 rounded-xl border border-border/30">
      <p className="text-xs text-muted uppercase">{label}</p>
      <p className="text-sm font-bold mt-0.5">{value}</p>
    </div>
  );
}
