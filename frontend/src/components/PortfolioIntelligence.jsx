import { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, BarChart3, CalendarDays, FlaskConical,
  HeartPulse, Loader2, Network, RefreshCw, Scale,
} from 'lucide-react';
import { formatSignedPct } from '../api';

const ACTION_LABELS = {
  buy: 'ซื้อเพิ่ม',
  reduce: 'ลดสัดส่วน',
  hold: 'คงไว้',
};

const SERIES = [
  { key: 'portfolio', label: 'พอร์ต', color: '#3b82f6' },
  { key: 'sp500', label: 'S&P 500', color: '#10b981' },
  { key: 'nasdaq', label: 'Nasdaq', color: '#8b5cf6' },
  { key: 'set50', label: 'SET50', color: '#f59e0b' },
];

export default function PortfolioIntelligence({
  data,
  loading,
  error,
  positions,
  onRefresh,
  onSimulate,
}) {
  const [simulation, setSimulation] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState(null);
  const first = positions[0];
  const [form, setForm] = useState({
    symbol: first?.symbol || '',
    action: 'buy',
    shares: '',
    price: '',
  });

  const submitSimulation = async (event) => {
    event.preventDefault();
    setSimulating(true);
    setSimulationError(null);
    try {
      const result = await onSimulate({
        symbol: form.symbol.trim().toUpperCase(),
        action: form.action,
        shares: Number(form.shares),
        price: form.price ? Number(form.price) : null,
      });
      setSimulation(result);
    } catch (err) {
      setSimulationError(err.message);
    } finally {
      setSimulating(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="glass-card rounded-2xl p-8 flex items-center justify-center gap-3 text-muted">
        <Loader2 size={22} className="animate-spin text-primary" />
        กำลังวิเคราะห์สุขภาพพอร์ต...
      </div>
    );
  }
  if (!data) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black flex items-center gap-2">
            <Activity size={19} className="text-primary" /> Portfolio Intelligence
          </h3>
          <p className="text-xs text-muted">วิเคราะห์จากน้ำหนักพอร์ตปัจจุบันและโปรไฟล์ความเสี่ยงของคุณ</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-lg border border-border text-primary hover:bg-primary/5 disabled:opacity-50"
          aria-label="รีเฟรช Portfolio Intelligence"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {(error || data.warning) && (
        <div className="rounded-xl border border-warning/25 bg-warning/5 p-3 text-xs text-warning flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {error || data.warning}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <HealthScore health={data.health} />
        <div className="xl:col-span-2">
          <RebalancePlan rebalance={data.rebalance} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <CorrelationPanel correlation={data.correlation} />
        <WhatIfPanel
          form={form}
          setForm={setForm}
          positions={positions}
          onSubmit={submitSimulation}
          simulating={simulating}
          result={simulation}
          error={simulationError}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <EventCalendar events={data.events || []} />
        <BenchmarkPanel benchmark={data.benchmark || {}} />
      </div>
    </section>
  );
}

function HealthScore({ health }) {
  const score = health?.score || 0;
  const color = score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div className="glass-card rounded-2xl p-5">
      <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
        <HeartPulse size={16} className="text-primary" /> Portfolio Health Score
      </h4>
      <div className="flex items-center gap-5">
        <div
          className="w-28 h-28 rounded-full grid place-items-center shrink-0"
          style={{ background: `conic-gradient(${color} ${score}%, var(--surface) 0)` }}
        >
          <div className="w-20 h-20 rounded-full bg-card grid place-items-center text-center">
            <div>
              <p className="text-2xl font-black">{score}</p>
              <p className="text-xs text-muted">{health?.grade}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {Object.entries(health?.breakdown || {}).map(([key, value]) => (
            <div key={key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted capitalize">{key}</span><span>{value}</span>
              </div>
              <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <ul className="mt-4 border-t border-border/40 pt-3 space-y-1 text-xs text-muted">
        {(health?.risks || []).map((risk) => <li key={risk}>• {risk}</li>)}
      </ul>
    </div>
  );
}

function RebalancePlan({ rebalance }) {
  return (
    <div className="glass-card rounded-2xl p-5 h-full">
      <h4 className="text-sm font-bold flex items-center gap-2">
        <Scale size={16} className="text-primary" /> Rebalancing Plan
      </h4>
      <p className="text-xs text-muted mt-1">
        {rebalance?.method}
        {rebalance?.target_cash_pct > 0 && ` • เงินสดเป้าหมาย ${rebalance.target_cash_pct}%`}
      </p>
      <div className="overflow-x-auto mt-3">
        <table className="w-full text-xs">
          <thead><tr className="text-muted border-b border-border/40">
            <th className="text-left py-2">หุ้น</th><th className="text-right">ปัจจุบัน</th>
            <th className="text-right">เป้าหมาย</th><th className="text-right">แผน</th>
          </tr></thead>
          <tbody>
            {(rebalance?.items || []).map((item) => (
              <tr key={item.symbol} className="border-b border-border/25 last:border-0">
                <td className="py-2 font-mono font-bold">{item.symbol}</td>
                <td className="text-right">{item.current_pct}%</td>
                <td className="text-right">{item.target_pct}%</td>
                <td className={`text-right font-bold ${
                  item.action === 'buy' ? 'text-success' : item.action === 'reduce' ? 'text-danger' : 'text-muted'
                }`}>
                  {ACTION_LABELS[item.action]} {item.action !== 'hold' && `${Math.abs(item.delta_shares)} หุ้น`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CorrelationPanel({ correlation }) {
  const symbols = correlation?.symbols || [];
  return (
    <div className="glass-card rounded-2xl p-5">
      <h4 className="text-sm font-bold flex items-center gap-2">
        <Network size={16} className="text-primary" /> Correlation & Diversification
      </h4>
      {symbols.length < 2 ? (
        <p className="text-xs text-muted mt-4">ต้องมีข้อมูลอย่างน้อย 2 หุ้นเพื่อคำนวณ correlation</p>
      ) : (
        <>
          <div className="overflow-x-auto mt-4">
            <table className="text-xs mx-auto">
              <thead><tr><th className="p-1" />{symbols.map((s) => <th key={s} className="p-1 font-mono">{s}</th>)}</tr></thead>
              <tbody>
                {symbols.map((symbol, row) => (
                  <tr key={symbol}>
                    <th className="p-1 text-left font-mono">{symbol}</th>
                    {symbols.map((other, col) => {
                      const value = correlation.matrix?.[row]?.[col] ?? 0;
                      return (
                        <td
                          key={other}
                          className="p-1.5 text-center rounded"
                          style={{ background: `color-mix(in srgb, ${value >= 0.8 ? 'var(--danger)' : 'var(--primary)'} ${Math.abs(value) * 35}%, transparent)` }}
                        >
                          {value.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted mt-3">
            ค่าเฉลี่ย |correlation|: {correlation.average ?? '-'}
          </p>
          {correlation.high_pairs?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {correlation.high_pairs.map((pair) => (
                <span key={`${pair.first}-${pair.second}`} className="px-2 py-1 rounded-md bg-danger/5 border border-danger/20 text-xs text-danger">
                  {pair.first}/{pair.second} {pair.correlation}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function WhatIfPanel({ form, setForm, positions, onSubmit, simulating, result, error }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <h4 className="text-sm font-bold flex items-center gap-2">
        <FlaskConical size={16} className="text-primary" /> What-if Simulator
      </h4>
      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-2 mt-4">
        <input
          list="portfolio-symbols"
          required
          value={form.symbol}
          onChange={(e) => setForm({ ...form, symbol: e.target.value })}
          placeholder="AAPL"
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
        />
        <datalist id="portfolio-symbols">{positions.map((p) => <option key={p.symbol} value={p.symbol} />)}</datalist>
        <select
          value={form.action}
          onChange={(e) => setForm({ ...form, action: e.target.value })}
          className="select-native bg-surface border border-border rounded-lg px-3 py-2 text-sm"
        >
          <option value="buy">ซื้อเพิ่ม</option><option value="sell">ขาย</option>
        </select>
        <input
          type="number" min="0.0001" step="any" required value={form.shares}
          onChange={(e) => setForm({ ...form, shares: e.target.value })}
          placeholder="จำนวนหุ้น"
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
        />
        <input
          type="number" min="0.0001" step="any" value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          placeholder="ราคา (ว่าง=ล่าสุด)"
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm"
        />
        <button type="submit" disabled={simulating} className="col-span-2 py-2 rounded-lg bg-primary/15 text-primary font-bold text-sm disabled:opacity-50">
          {simulating ? 'กำลังจำลอง...' : 'จำลองผลกระทบ'}
        </button>
      </form>
      {error && <p className="text-xs text-danger mt-2">{error}</p>}
      {result && (
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <ResultStat label="ก่อน" value={result.before.score} />
            <ResultStat label="หลัง" value={result.after.score} />
            <ResultStat label="เปลี่ยน" value={`${result.score_change >= 0 ? '+' : ''}${result.score_change}`} positive={result.score_change >= 0} />
          </div>
          <p className="text-xs text-muted mt-2">
            {result.symbol} จะมีน้ำหนัก {result.symbol_weight_pct}% • มูลค่าลงทุนรวม {result.total_invested.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}

function ResultStat({ label, value, positive }) {
  return <div><p className="text-xs text-muted">{label}</p><p className={`font-black ${positive == null ? '' : positive ? 'text-success' : 'text-danger'}`}>{value}</p></div>;
}

function EventCalendar({ events }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <h4 className="text-sm font-bold flex items-center gap-2">
        <CalendarDays size={16} className="text-primary" /> Earnings & Dividend Calendar
      </h4>
      <div className="mt-3 space-y-2">
        {events.length === 0 && <p className="text-xs text-muted">ยังไม่พบวันประกาศที่กำลังจะมาถึง</p>}
        {events.map((event) => (
          <div key={`${event.symbol}-${event.type}-${event.date}`} className="flex items-center justify-between rounded-lg border border-border/35 bg-surface/40 px-3 py-2">
            <div><span className="font-mono font-bold text-sm">{event.symbol}</span><span className="text-xs text-muted ml-2">{event.type === 'earnings' ? 'งบการเงิน' : 'ปันผล'}</span></div>
            <span className="text-xs font-mono text-primary">{new Date(`${event.date}T00:00:00`).toLocaleDateString('th-TH')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BenchmarkPanel({ benchmark }) {
  const available = SERIES.filter((series) => benchmark.summary?.[series.key] != null);
  return (
    <div className="glass-card rounded-2xl p-5">
      <h4 className="text-sm font-bold flex items-center gap-2">
        <BarChart3 size={16} className="text-primary" /> Performance Benchmark
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
        {available.map((series) => (
          <div key={series.key} className="rounded-lg bg-surface/50 border border-border/30 p-2">
            <p className="text-xs text-muted">{series.label}</p>
            <p className={`text-sm font-bold ${benchmark.summary[series.key] >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatSignedPct(benchmark.summary[series.key])}
            </p>
          </div>
        ))}
      </div>
      <BenchmarkChart points={benchmark.points || []} series={available} />
      {benchmark.note && <p className="text-xs text-muted mt-2">{benchmark.note}</p>}
    </div>
  );
}

function BenchmarkChart({ points, series }) {
  const paths = useMemo(() => {
    if (points.length < 2) return [];
    const values = points.flatMap((point) => series.map((item) => point[item.key]).filter((v) => v != null));
    if (!values.length) return [];
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    const range = max - min || 1;
    return series.map((item) => {
      const coords = points
        .map((point, index) => point[item.key] == null ? null : [
          (index / (points.length - 1)) * 100,
          56 - ((point[item.key] - min) / range) * 52,
        ])
        .filter(Boolean);
      return { ...item, d: coords.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ') };
    }).filter((item) => item.d);
  }, [points, series]);
  if (!paths.length) return <p className="text-xs text-muted mt-4">ข้อมูล benchmark ยังไม่เพียงพอ</p>;
  return (
    <div className="mt-4">
      <svg viewBox="0 0 100 60" preserveAspectRatio="none" className="w-full h-40 rounded-lg bg-surface/30 border border-border/30">
        <line x1="0" y1="56" x2="100" y2="56" stroke="var(--border)" strokeWidth="0.5" />
        {paths.map((path) => <path key={path.key} d={path.d} fill="none" stroke={path.color} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />)}
      </svg>
      <div className="flex flex-wrap gap-3 mt-2">
        {paths.map((path) => <span key={path.key} className="text-xs text-muted flex items-center gap-1"><i className="w-2 h-2 rounded-full" style={{ background: path.color }} />{path.label}</span>)}
      </div>
    </div>
  );
}
