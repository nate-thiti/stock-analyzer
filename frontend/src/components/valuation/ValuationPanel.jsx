import ValuationScoreRing from './ValuationScoreRing';
import ValuationRadar from './ValuationRadar';
import ValuationMetricBars from './ValuationMetricBars';
import QuarterlyFundamentalsChart from './QuarterlyFundamentalsChart';
import PeHistoryChart from './PeHistoryChart';
import TradingPlanPanel from '../TradingPlanPanel';
import InfoTip from '../InfoTip';
import { GLOSSARY } from '../../utils/glossary';
import { Loader2 } from 'lucide-react';

function TrendBadge({ label, value }) {
  const color = value?.includes('up') || value === 'increasing' ? 'text-success'
    : value?.includes('down') || value === 'decreasing' ? 'text-danger' : 'text-warning';
  return (
    <div className="text-center bg-surface/40 rounded-xl py-2">
      <p className="text-[10px] text-muted uppercase">{label}</p>
      <p className={`text-xs font-bold mt-1 ${color}`}>{value?.replace('_', ' ').toUpperCase()}</p>
    </div>
  );
}

export default function ValuationPanel({
  fundamental,
  technical,
  trend,
  quarterly,
  peHistory,
  loadingExtra,
  tradingPlan,
  currency,
  planLoading,
  position,
}) {
  if (!fundamental) return null;

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6 lg:p-8 animate-fadeIn min-w-0">
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-border/40">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <span className="w-1.5 h-5 bg-gradient-primary rounded-full" />
          ตัวชี้วัดมูลค่า & แผนลงทุน
        </h3>
        <p className="text-[10px] text-muted hidden sm:block">อ่านกราฟพร้อมสรุปคำแนะนำ — ไม่ต้องเลื่อนหา</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 xl:gap-8 items-start">
        {/* Charts — ซ้าย ใหญ่ */}
        <div className="space-y-8 min-w-0 order-last xl:order-none">
          <div className="grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] gap-6 items-center">
            <ValuationScoreRing
              grade={fundamental.valuation_grade}
              pe={fundamental.pe_ratio}
              peg={fundamental.peg_ratio}
            />
            <div>
              <p className="text-[10px] text-muted font-bold uppercase mb-3 text-center md:text-left">Radar Profile</p>
              <ValuationRadar fundamental={fundamental} large />
            </div>
          </div>

          <div>
            <p className="text-[10px] text-muted font-bold uppercase mb-3">Benchmark vs มาตรฐาน</p>
            <ValuationMetricBars fundamental={fundamental} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="min-h-[340px] flex flex-col">
              <p className="text-xs text-muted font-bold uppercase mb-4">Quarterly Revenue & EPS</p>
              {loadingExtra ? (
                <div className="flex-1 flex items-center justify-center text-sm text-muted">กำลังโหลด...</div>
              ) : (
                <QuarterlyFundamentalsChart quarters={quarterly} large />
              )}
            </div>
            <div className="min-h-[340px] flex flex-col">
              <p className="text-xs text-muted font-bold uppercase mb-4">Historical P/E (TTM)</p>
              {loadingExtra ? (
                <div className="flex-1 flex items-center justify-center text-sm text-muted">กำลังโหลด...</div>
              ) : (
                <PeHistoryChart history={peHistory} large />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/40">
            <MiniStat label="Rev Growth" value={fundamental.revenue_growth} pct />
            <MiniStat label="EPS Growth" value={fundamental.earnings_growth} pct />
            <MiniStat label="Debt/Equity" value={fundamental.debt_to_equity} />
            <MiniStat label="RSI" value={technical?.rsi?.slice(-1)[0]?.toFixed(0)} hint={technical?.rsi_signal} tip={GLOSSARY.rsi} />
          </div>

          {trend && (
            <div className="grid grid-cols-3 gap-3">
              <TrendBadge label="Trend" value={trend.trend_direction} />
              <TrendBadge label="Strength" value={trend.trend_strength} />
              <TrendBadge label="Volume" value={trend.volume_trend} />
            </div>
          )}
        </div>

        {/* แผนลงทุน — มือถืออยู่บน / desktop sticky ขวา */}
        <aside className="order-first xl:order-none xl:sticky xl:top-20 xl:self-start">
          {planLoading && !tradingPlan ? (
            <div className="rounded-xl p-6 bg-surface/50 border border-border flex items-center justify-center gap-2 text-sm text-muted min-h-[280px]">
              <Loader2 size={16} className="animate-spin text-primary" />
              รอผลวิเคราะห์...
            </div>
          ) : tradingPlan ? (
            <TradingPlanPanel plan={tradingPlan} currency={currency} embedded position={position} />
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function MiniStat({ label, value, pct, hint, tip }) {
  const display = value == null ? '-'
    : pct ? `${(Math.abs(value) < 1 ? value * 100 : value).toFixed(1)}%`
    : typeof value === 'number' ? value.toFixed(2) : value;
  return (
    <div className="bg-surface/60 p-3 rounded-xl border border-border/50 text-center">
      <p className="text-[10px] text-muted font-bold uppercase flex items-center justify-center gap-0.5">
        <InfoTip term={tip} label={label} />
      </p>
      <p className="text-sm font-mono font-bold text-foreground mt-1">{display}</p>
      {hint && <p className="text-[9px] text-muted">{hint}</p>}
    </div>
  );
}
