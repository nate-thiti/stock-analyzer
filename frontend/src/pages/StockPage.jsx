import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowUpRight, ArrowDownRight, AlertTriangle, Building2,
  GitCompare, Info, BarChart3, Percent, Coins, Layers, Loader2, Clock, Radio, Briefcase,
} from 'lucide-react';
import { api, formatHistoryDate, formatMarketCap, formatMarketTime, formatFetchedAt, formatPct } from '../api';
import { useQuotePoll, ANALYSIS_POLL_MS } from '../hooks/useQuotePoll';
import { usePriceAlerts } from '../hooks/usePriceAlerts';
import { addRecentStock } from '../utils/recentStocks';
import StarButton from '../components/StarButton';
import StockChart from '../components/StockChart';
import ValuationPanel from '../components/valuation/ValuationPanel';
import PriceAlertButton from '../components/PriceAlertButton';
import DividendPanel from '../components/DividendPanel';
import SelectField from '../components/SelectField';

export default function StockPage() {
  const { symbol } = useParams();
  const [quote, setQuote] = useState(null);
  const [info, setInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [period, setPeriod] = useState('6mo');
  const [candleInterval, setCandleInterval] = useState('1d');
  const [chartLoading, setChartLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quoteRefreshing, setQuoteRefreshing] = useState(false);
  const [quarterly, setQuarterly] = useState([]);
  const [peHistory, setPeHistory] = useState([]);
  const [valuationChartsLoading, setValuationChartsLoading] = useState(false);
  const [position, setPosition] = useState(null);
  const { alerts, load: reloadAlerts } = usePriceAlerts();

  useEffect(() => {
    if (symbol) {
      addRecentStock(symbol);
      window.dispatchEvent(new Event('recent-stocks-updated'));
    }
  }, [symbol]);

  const refreshQuote = useCallback(async () => {
    if (!symbol) return;
    setQuoteRefreshing(true);
    try {
      const q = await api.quote(symbol);
      setQuote(q);
    } catch {
      /* keep last quote on poll failure */
    } finally {
      setQuoteRefreshing(false);
    }
  }, [symbol]);

  useQuotePoll(refreshQuote, { enabled: !!symbol });

  const refreshHistory = useCallback(async () => {
    if (!symbol) return;
    try {
      const h = await api.history(symbol, period, candleInterval);
      setHistory(h.history || []);
    } catch {
      /* keep last history */
    }
  }, [symbol, period, candleInterval]);

  useQuotePoll(refreshHistory, { enabled: !!symbol, intervalMs: 300_000 });

  const refreshAnalysis = useCallback(async () => {
    if (!symbol) return;
    try {
      const a = await api.analysis(symbol, period, candleInterval);
      setAnalysis(a);
    } catch {
      /* keep last analysis */
    }
  }, [symbol, period, candleInterval]);

  useQuotePoll(refreshAnalysis, { enabled: !!symbol, intervalMs: ANALYSIS_POLL_MS });

  // โหลดราคา + กราฟก่อน (เร็ว)
  useEffect(() => {
    if (!symbol) return;
    setChartLoading(true);
    setError(null);
    setQuote(null);
    setHistory([]);

    Promise.all([
      api.quote(symbol),
      api.history(symbol, period, candleInterval),
    ])
      .then(([q, h]) => {
        setQuote(q);
        setHistory(h.history || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setChartLoading(false));
  }, [symbol, period, candleInterval]);

  useEffect(() => {
    if (!symbol) return;
    setValuationChartsLoading(true);
    setQuarterly([]);
    setPeHistory([]);

    Promise.all([
      api.quarterlyFundamentals(symbol).catch(() => ({ quarters: [] })),
      api.peHistory(symbol, '2y').catch(() => ({ history: [] })),
    ])
      .then(([q, p]) => {
        setQuarterly(q.quarters || []);
        setPeHistory(p.history || []);
      })
      .finally(() => setValuationChartsLoading(false));
  }, [symbol]);

  useEffect(() => {
    if (!symbol) return;
    api.listPositions()
      .then((list) => {
        const sym = symbol.toUpperCase();
        setPosition(list.find((p) => p.symbol === sym) || null);
      })
      .catch(() => setPosition(null));
  }, [symbol]);

  // โหลดวิเคราะห์แยก
  useEffect(() => {
    if (!symbol) return;
    setAnalysisLoading(true);
    setAnalysis(null);
    setInfo(null);

    api.analysis(symbol, period, candleInterval)
      .then((a) => {
        setAnalysis(a);
        return api.info(symbol).catch(() => null);
      })
      .then((i) => { if (i) setInfo(i); })
      .catch((err) => setError(err.message))
      .finally(() => setAnalysisLoading(false));
  }, [symbol, period, candleInterval]);

  const currency = quote?.currency || analysis?.currency || 'USD';
  const marketUpdate = quote
    ? formatMarketTime(quote.market_time, quote.exchange_timezone, quote.market_state)
    : null;
  const chartLastBar = history.length > 0
    ? formatHistoryDate(history[history.length - 1].time, quote?.exchange_timezone)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link to="/" className="text-xs text-muted hover:text-primary transition-colors">← หน้าแรก</Link>
        <Link
          to={`/compare?symbols=${symbol}`}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-foreground transition-colors"
        >
          <GitCompare size={14} /> เปรียบเทียบหุ้นนี้
        </Link>
      </div>

      {error && (
        <div className="bg-danger/5 border border-danger/25 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-danger font-semibold">ไม่พบข้อมูล</p>
            <p className="text-xs text-muted mt-1">{error}</p>
          </div>
        </div>
      )}

      {position && (
        <Link
          to="/portfolio"
          className="glass-card rounded-xl px-4 py-3 flex items-center justify-between gap-3 border border-primary/25 bg-primary/5 hover:border-primary/40 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm">
            <Briefcase size={16} className="text-primary shrink-0" />
            <span>
              ถืออยู่ <strong>{position.shares}</strong> หุ้น @ {position.avg_cost?.toFixed(2)}
            </span>
          </div>
          {position.unrealized_pnl != null && (
            <span className={`text-sm font-mono font-bold ${position.unrealized_pnl >= 0 ? 'text-success' : 'text-danger'}`}>
              {position.unrealized_pnl >= 0 ? '+' : ''}{position.unrealized_pnl?.toFixed(0)}
              ({position.unrealized_pnl_pct?.toFixed(1)}%)
            </span>
          )}
        </Link>
      )}

      {/* กราฟราคา + ข้อมูลบริษัท */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2 h-full">
          <div className="glass-card rounded-2xl p-6 h-full">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-5">
              {quote ? (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-black text-foreground">{quote.symbol}</h2>
                    <StarButton symbol={quote.symbol} />
                    <PriceAlertButton
                      symbol={quote.symbol}
                      currentPrice={quote.price}
                      alerts={alerts}
                      onChange={reloadAlerts}
                    />
                    <span className="text-sm text-muted">{quote.name}</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black">{quote.price?.toLocaleString()}</span>
                    <span className="text-xs text-muted uppercase">{currency}</span>
                    <span className={`flex items-center text-xs font-semibold px-2 py-1 rounded-lg border ${
                      quote.change >= 0 ? 'bg-success/5 border-success/20 text-success' : 'bg-danger/5 border-danger/20 text-danger'
                    }`}>
                      {quote.change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {quote.change >= 0 ? '+' : ''}{quote.change?.toFixed(2)} ({quote.change_percent?.toFixed(2)}%)
                    </span>
                  </div>
                  {marketUpdate && (
                    <div className="mt-2 space-y-1 text-[11px] text-muted">
                      <p className="flex items-center gap-1.5 flex-wrap">
                        <Clock size={12} className="text-primary shrink-0" />
                        <span>
                          เวลาซื้อขายล่าสุด {marketUpdate.time}
                          {quote.exchange_timezone && (
                            <span className="text-muted/70"> ({quote.exchange_timezone.replace('_', ' ')})</span>
                          )}
                        </span>
                        {marketUpdate.state && (
                          <span className="px-1.5 py-0.5 rounded-md bg-surface border border-border/50 text-[10px]">
                            {marketUpdate.state}
                          </span>
                        )}
                      </p>
                      <p className="flex items-center gap-1.5 flex-wrap pl-[18px]">
                        <Radio size={10} className={`text-primary shrink-0 ${quoteRefreshing ? 'animate-pulse' : ''}`} />
                        <span>
                          ดึงข้อมูลเมื่อ {formatFetchedAt(quote.fetched_at)}
                          <span className="text-primary/80 ml-1">• auto 30s</span>
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              ) : chartLoading ? (
                <div className="h-16 flex items-center text-sm text-muted">กำลังโหลดราคา...</div>
              ) : null}

              <div className="flex gap-2">
                <SelectField
                  label="ช่วงเวลา"
                  value={period}
                  onChange={setPeriod}
                  size="sm"
                  options={[['1mo', '1 เดือน'], ['3mo', '3 เดือน'], ['6mo', '6 เดือน'], ['1y', '1 ปี'], ['5y', '5 ปี']]}
                />
                <SelectField
                  label="แท่งเทียน"
                  value={candleInterval}
                  onChange={setCandleInterval}
                  size="sm"
                  options={[['1d', 'รายวัน'], ['1wk', 'รายสัปดาห์'], ['1h', '1 ชม.'], ['15m', '15 นาที']]}
                />
              </div>
            </div>

            {chartLoading ? (
              <div className="h-[520px] sm:h-[760px] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : history.length > 0 ? (
              <>
                <StockChart history={history} interval={candleInterval} />
                {chartLastBar && (
                  <p className="mt-2 text-[10px] text-muted text-right">
                    แท่งล่าสุด: {chartLastBar}
                    {quote?.exchange_timezone && (
                      <span className="text-muted/70"> (วันซื้อขาย)</span>
                    )}
                  </p>
                )}
              </>
            ) : (
              <div className="h-[520px] sm:h-[760px] flex items-center justify-center text-sm text-muted">ไม่มีข้อมูลกราฟ</div>
            )}
          </div>
        </div>

        {info && (
          <div className="glass-card rounded-2xl p-5 h-full flex flex-col">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2 shrink-0">
              <Building2 size={16} className="text-primary" /> ข้อมูลบริษัท
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
              <InfoItem icon={<Layers size={11} />} label="Sector" value={info.sector} />
              <InfoItem icon={<Building2 size={11} />} label="Industry" value={info.industry} />
              <InfoItem icon={<BarChart3 size={11} />} label="Market Cap" value={formatMarketCap(info.market_cap)} />
              <InfoItem icon={<Coins size={11} />} label="P/E" value={info.pe_ratio?.toFixed(2)} />
              <InfoItem icon={<Percent size={11} />} label="Div Yield" value={formatPct(info.dividend_yield)} />
              <InfoItem icon={<Info size={11} />} label="Beta" value={info.beta?.toFixed(2)} />
            </div>
            {info.summary && (
              <p className="text-xs text-muted leading-relaxed flex-1 min-h-0 overflow-y-auto">{info.summary}</p>
            )}
          </div>
        )}
      </div>

      {info && (info.dividends?.length > 0 || info.annual_dividend) && (
        <DividendPanel
          dividends={info.dividends || []}
          annualDividend={info.annual_dividend}
          dividendYield={info.dividend_yield}
          currency={currency}
        />
      )}

      {analysisLoading && !analysis && (
        <div className="glass-card rounded-2xl p-6 flex items-center gap-3 text-sm text-muted">
          <Loader2 size={16} className="animate-spin text-primary" />
          กำลังวิเคราะห์ P/E, Technical, แผนลงทุน... (อาจใช้เวลา 10-20 วินาที)
        </div>
      )}

      {analysis && (
        <ValuationPanel
          fundamental={analysis.fundamental}
          technical={analysis.technical}
          trend={analysis.trend}
          quarterly={quarterly}
          peHistory={peHistory}
          loadingExtra={valuationChartsLoading}
          tradingPlan={analysis.trading_plan}
          currency={currency}
          planLoading={analysisLoading}
          position={position}
        />
      )}
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="bg-surface/40 p-2.5 rounded-xl border border-border/30">
      <p className="text-[10px] text-muted flex items-center gap-1">{icon} {label}</p>
      <p className="text-xs font-semibold text-foreground mt-0.5 truncate">{value || '-'}</p>
    </div>
  );
}
