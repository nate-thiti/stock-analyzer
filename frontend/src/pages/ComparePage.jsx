import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  GitCompare, AlertTriangle, Trophy, ArrowRight, Search, X, Plus,
  Loader2, ChevronDown, ChevronUp, Sparkles, Link2, Check, Briefcase, ShieldCheck,
} from 'lucide-react';
import { api, ACTION_STYLES, GRADE_LABELS, POPULAR_STOCKS, COMPARE_PRESET_GROUPS, formatPct, formatMoney } from '../api';
import CompareValuationChart from '../components/valuation/CompareValuationChart';
import { riskToleranceLabel, useRiskProfile, RISK_USAGE_BAND_LABELS } from '../context/RiskProfileContext';
import { ANALYSIS_POLL_MS, useQuotePoll } from '../hooks/useQuotePoll';
import DataFreshnessNotice from '../components/DataFreshnessNotice';

const MAX_STOCKS = 5;
const MIN_STOCKS = 2;

const PRESETS = COMPARE_PRESET_GROUPS.flatMap((g) => g.presets);

const ACTION_LABELS = {
  buy: 'ซื้อ',
  sell: 'ขาย',
  hold: 'ถือ/รอ',
  error: 'ผิดพลาด',
};

const METRIC_GROUPS = [
  {
    title: 'ภาพรวม',
    rows: [
      { label: 'ราคา', get: (r) => formatMoney(r.current_price, r.currency) },
      {
        label: 'คำแนะนำ',
        get: (r) => {
          const s = ACTION_STYLES[r.recommendation] || ACTION_STYLES.hold;
          return <span className={`font-bold ${s.text}`}>{ACTION_LABELS[r.recommendation] || r.recommendation}</span>;
        },
      },
      { label: 'ความมั่นใจ', get: (r) => `${((r.confidence || 0) * 100).toFixed(0)}%` },
      { label: 'Score', get: (r) => r.trading_plan?.score?.toFixed(2) ?? '-' },
    ],
  },
  {
    title: 'มูลค่า',
    rows: [
      { label: 'P/E', get: (r) => r.fundamental?.pe_ratio?.toFixed(2) || '-' },
      { label: 'PEG', get: (r) => r.fundamental?.peg_ratio?.toFixed(2) || '-' },
      { label: 'P/S', get: (r) => r.fundamental?.ps_ratio?.toFixed(2) || '-' },
      { label: 'P/B', get: (r) => r.fundamental?.pb_ratio?.toFixed(2) || '-' },
      { label: 'ROE', get: (r) => formatPct(r.fundamental?.roe) },
      {
        label: 'Valuation',
        get: (r) => {
          const g = GRADE_LABELS[r.fundamental?.valuation_grade] || GRADE_LABELS.neutral;
          return <span className={g.color}>{g.label}</span>;
        },
      },
    ],
  },
  {
    title: 'เทคนิค & แผน',
    rows: [
      { label: 'Trend', get: (r) => r.trend?.trend_direction?.replace('_', ' ').toUpperCase() || '-' },
      { label: 'Stop Loss', get: (r) => formatMoney(r.trading_plan?.stop_loss, r.currency) || '-' },
      { label: 'Target', get: (r) => formatMoney(r.trading_plan?.target_price, r.currency) || '-' },
      { label: 'จำนวนหุ้น', get: (r) => r.trading_plan?.position_size_shares || '-' },
      { label: 'R:R', get: (r) => (r.trading_plan?.risk_reward_ratio ? `1:${r.trading_plan.risk_reward_ratio}` : '-') },
    ],
  },
  {
    title: 'พอร์ต & ความเสี่ยงส่วนบุคคล',
    rows: [
      {
        label: 'สถานะในพอร์ต',
        get: (r) => r.holding
          ? <span className="font-bold text-primary">ถืออยู่</span>
          : <span className="text-muted">ยังไม่มี</span>,
      },
      { label: 'จำนวนที่ถือ', get: (r) => r.holding ? r.holding.shares.toLocaleString() : '-' },
      { label: 'ต้นทุนเฉลี่ย', get: (r) => r.holding ? formatMoney(r.holding.avg_cost, r.currency) : '-' },
      { label: 'กำไร/ขาดทุน', get: (r) => <PortfolioPnl holding={r.holding} /> },
      {
        label: 'สัดส่วนในพอร์ต',
        get: (r) => r.holding?.position_pct != null ? `${r.holding.position_pct}%` : '-',
      },
      {
        label: 'คำแนะนำสำหรับคุณ',
        get: (r) => r.personalized_risk?.action_label || '-',
      },
      {
        label: 'ใช้ขีดจำกัดความเสี่ยง',
        get: (r) => r.personalized_risk?.risk_usage_pct != null
          ? `${r.personalized_risk.risk_usage_pct}%`
          : '-',
      },
      {
        label: 'Stop ที่เหมาะกับคุณ',
        get: (r) => r.personalized_risk?.effective_stop != null
          ? formatMoney(r.personalized_risk.effective_stop, r.currency)
          : '-',
      },
    ],
  },
];

function parseSymbols(raw) {
  return [...new Set(raw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))].slice(0, MAX_STOCKS);
}

function findMatchingPreset(list) {
  if (list.length === 0) return null;
  const match = PRESETS.find((p) => {
    const presetSyms = p.symbols.map((s) => s.toUpperCase());
    return list.length === presetSyms.length && list.every((s, i) => s === presetSyms[i]);
  });
  return match?.label ?? null;
}

export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [symbols, setSymbols] = useState(() => {
    const initial = parseSymbols(searchParams.get('symbols') || 'AAPL,MSFT,GOOGL');
    return initial;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [activePreset, setActivePreset] = useState(() => {
    const initial = parseSymbols(searchParams.get('symbols') || 'AAPL,MSFT,GOOGL');
    return findMatchingPreset(initial);
  });
  const [copied, setCopied] = useState(false);
  const { profile } = useRiskProfile();

  const quickAddItems = activePreset
    ? (PRESETS.find((p) => p.label === activePreset)?.symbols ?? []).map((symbol) => ({ symbol }))
    : POPULAR_STOCKS.slice(0, 8);

  const runCompare = useCallback(async (list) => {
    if (list.length < MIN_STOCKS) {
      setError(`ต้องเลือกอย่างน้อย ${MIN_STOCKS} หุ้น`);
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.compare(list.join(','), '6mo', '1d');
      setData(result);
      setSearchParams({ symbols: list.join(',') });
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [setSearchParams]);

  useEffect(() => {
    const syms = searchParams.get('symbols');
    if (syms) {
      const list = parseSymbols(syms);
      setSymbols(list);
      if (list.length >= MIN_STOCKS) runCompare(list);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const comparedSymbolKey = data?.symbols?.join(',') || '';
  const refreshComparison = useCallback(async () => {
    if (!comparedSymbolKey) return;
    try {
      const result = await api.compare(comparedSymbolKey, '6mo', '1d');
      setData(result);
    } catch {
      // Keep the last complete comparison visible when Yahoo is temporarily unavailable.
    }
  }, [comparedSymbolKey]);

  useQuotePoll(refreshComparison, {
    enabled: Boolean(comparedSymbolKey),
    intervalMs: ANALYSIS_POLL_MS,
    immediate: false,
  });

  const addSymbol = (sym) => {
    const upper = sym.trim().toUpperCase();
    if (!upper || symbols.includes(upper)) return;
    if (symbols.length >= MAX_STOCKS) {
      setError(`เปรียบเทียบได้สูงสุด ${MAX_STOCKS} หุ้น`);
      return;
    }
    setSymbols((prev) => [...prev, upper]);
    setSearchQuery('');
    setSearchResults([]);
    setError(null);
  };

  const removeSymbol = (sym) => {
    setSymbols((prev) => prev.filter((s) => s !== sym));
    setError(null);
  };

  const previewPreset = (preset) => {
    setActivePreset(preset.label);
    setError(null);
  };

  const addAllFromPreset = (preset) => {
    const list = preset.symbols.slice(0, MAX_STOCKS).map((s) => s.toUpperCase());
    setSymbols(list);
    setActivePreset(preset.label);
    setError(null);
  };

  const copyShareLink = async () => {
    if (symbols.length < MIN_STOCKS) return;
    const url = `${window.location.origin}/compare?symbols=${encodeURIComponent(symbols.join(','))}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('ไม่สามารถคัดลอกลิงก์ได้');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await api.search(q);
      if (res.length === 1) {
        addSymbol(res[0].symbol);
      } else if (res.length > 0) {
        setSearchResults(res.slice(0, 6));
      } else {
        addSymbol(q);
      }
    } catch {
      addSymbol(q);
    } finally {
      setSearching(false);
    }
  };

  const handleCompare = () => runCompare(symbols);

  const validResults = data?.results?.filter((r) => r.recommendation !== 'error') || [];

  return (
    <div className="space-y-6 w-full min-w-0">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-2">
          <GitCompare size={24} className="text-primary" />
          เปรียบเทียบหุ้น
        </h2>
        <p className="text-sm text-muted mt-1">เลือก 2–5 หุ้น แล้วเปรียบเทียบโดยรวมสถานะในพอร์ตและความเสี่ยงส่วนบุคคล</p>
      </div>

      <DataFreshnessNotice />

      {profile?.configured ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-xs">
          <span className="flex items-center gap-1.5 font-bold text-primary">
            <ShieldCheck size={15} /> ใช้โปรไฟล์ความเสี่ยงของคุณ
          </span>
          <span className="text-muted">
            ยอมรับขาดทุน {profile.max_loss_tolerance_pct}% ({riskToleranceLabel(profile.max_loss_tolerance_pct)})
          </span>
          <span className="text-muted">เพดานต่อหุ้น {profile.max_position_pct}%</span>
          <span className="text-muted">เสี่ยงต่อครั้ง {profile.risk_per_trade_pct}%</span>
          <span className="text-muted">ฐานคำนวณพอร์ต {profile.effective_account_size?.toLocaleString()}</span>
        </div>
      ) : (
        <Link
          to="/settings"
          className="flex items-center gap-2 rounded-2xl border border-warning/25 bg-warning/5 px-4 py-3 text-xs text-warning hover:border-warning/50"
        >
          <AlertTriangle size={15} />
          ตั้งค่าโปรไฟล์ความเสี่ยงก่อน เพื่อให้ผลเปรียบเทียบคำนวณตามขีดจำกัดของคุณ
        </Link>
      )}

      {/* เลือกหุ้น */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2 min-h-[36px]">
          {symbols.length === 0 && (
            <span className="text-xs text-muted">ยังไม่ได้เลือกหุ้น — ค้นหาหรือกด preset ด้านล่าง</span>
          )}
          {symbols.map((sym) => (
            <span
              key={sym}
              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-sm font-mono font-bold text-foreground"
            >
              {sym}
              <button
                type="button"
                onClick={() => removeSymbol(sym)}
                className="p-0.5 rounded-lg hover:bg-danger/20 hover:text-danger transition-colors"
                aria-label={`ลบ ${sym}`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
          {symbols.length > 0 && symbols.length < MAX_STOCKS && (
            <span className="text-xs text-muted">{symbols.length}/{MAX_STOCKS}</span>
          )}
        </div>

        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchResults([]); }}
            placeholder={symbols.length >= MAX_STOCKS ? `ครบ ${MAX_STOCKS} หุ้นแล้ว` : 'ค้นหาเพิ่ม เช่น NVDA, PTT.BK...'}
            disabled={symbols.length >= MAX_STOCKS}
            className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary disabled:opacity-50"
          />
          {searching && (
            <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary" />
          )}
          {searchResults.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 glass-card rounded-xl overflow-hidden border border-border shadow-lg">
              {searchResults.map((r) => (
                <button
                  key={r.symbol}
                  type="button"
                  onClick={() => addSymbol(r.symbol)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-primary/5 border-b border-border/30 last:border-0 text-left"
                >
                  <div>
                    <span className="font-mono font-bold text-foreground">{r.symbol}</span>
                    <span className="text-xs text-muted ml-2 truncate">{r.name}</span>
                  </div>
                  <Plus size={14} className="text-primary shrink-0" />
                </button>
              ))}
            </div>
          )}
        </form>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 sm:flex-wrap sm:overflow-visible">
          <span className="text-xs text-muted self-center mr-1 shrink-0">Preset:</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => previewPreset(preset)}
              className={`px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors shrink-0 whitespace-nowrap ${
                activePreset === preset.label
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-surface border-border text-muted hover:border-primary hover:text-primary'
              }`}
            >
              {preset.label}
            </button>
          ))}
          {activePreset && (
            <button
              type="button"
              onClick={() => {
                const p = PRESETS.find((x) => x.label === activePreset);
                if (p) addAllFromPreset(p);
              }}
              className="px-3 py-1.5 border border-primary/40 rounded-lg text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 shrink-0 whitespace-nowrap"
            >
              + เลือกหุ้นจาก {activePreset}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
          <span className="text-xs text-muted self-center mr-1 w-full sm:w-auto">
            เพิ่มด่วน{activePreset ? ` (${activePreset})` : ''}:
          </span>
          {quickAddItems.map(({ symbol }) => (
            <button
              key={symbol}
              type="button"
              onClick={() => addSymbol(symbol)}
              disabled={symbols.includes(symbol) || symbols.length >= MAX_STOCKS}
              className="px-2 py-1 rounded-md text-xs font-mono bg-surface/60 border border-border/40 text-muted hover:border-primary hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              +{symbol}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCompare}
            disabled={loading || symbols.length < MIN_STOCKS}
            className="flex-1 sm:flex-none px-8 py-2.5 bg-gradient-primary border border-primary rounded-xl text-sm font-medium text-foreground hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                กำลังวิเคราะห์...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                เปรียบเทียบ {symbols.length >= MIN_STOCKS ? `(${symbols.length} หุ้น)` : ''}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={copyShareLink}
            disabled={symbols.length < MIN_STOCKS}
            className="px-4 py-2.5 border border-border rounded-xl text-sm text-muted hover:text-primary hover:border-primary/40 disabled:opacity-40 flex items-center gap-2 transition-colors"
          >
            {copied ? <Check size={16} className="text-success" /> : <Link2 size={16} />}
            {copied ? 'คัดลอกแล้ว' : 'แชร์ลิงก์'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-danger/5 border border-danger/25 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-danger shrink-0" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {loading && !data && (
        <div className="glass-card rounded-2xl p-8 flex flex-col items-center gap-3 text-muted">
          <Loader2 size={28} className="animate-spin text-primary" />
          <p className="text-sm">กำลังวิเคราะห์ {symbols.length} หุ้น — อาจใช้ 15–30 วินาที</p>
        </div>
      )}

      {!loading && !data && !error && symbols.length >= MIN_STOCKS && (
        <div className="glass-card rounded-2xl p-8 text-center text-muted">
          <GitCompare size={32} className="mx-auto mb-3 text-primary/50" />
          <p className="text-sm">กด「เปรียบเทียบ」เพื่อเริ่มวิเคราะห์</p>
        </div>
      )}

      {data?.best_pick && (
        <div className="bg-success/5 border border-success/25 rounded-2xl p-5 flex items-center gap-4">
          <Trophy size={24} className="text-success shrink-0" />
          <div>
            <p className="text-sm font-bold text-success">
              เหมาะที่สุดตามข้อมูลพอร์ตและความเสี่ยงของคุณ: {data.best_pick}
            </p>
            <p className="text-xs text-muted mt-1">{data.summary}</p>
          </div>
        </div>
      )}

      {validResults.length > 0 && (
        <>
          <div className={`grid gap-4 ${
            validResults.length === 2 ? 'grid-cols-1 md:grid-cols-2'
              : validResults.length === 3 ? 'grid-cols-1 md:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {validResults.map((r) => (
              <CompareStockCard key={r.symbol} result={r} isBest={r.symbol === data.best_pick} />
            ))}
          </div>

          <CompareValuationChart results={data.results} />

          <div className="glass-card rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface/40 transition-colors"
            >
              <span className="text-sm font-bold text-foreground">ตารางเปรียบเทียบละเอียด</span>
              {showDetails ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
            </button>
            {showDetails && (
              <div className="px-5 pb-5 space-y-5 border-t border-border/40">
                {METRIC_GROUPS.map((group) => (
                  <div key={group.title}>
                    <h4 className="text-xs font-bold text-primary uppercase mb-2">{group.title}</h4>
                    <div className="overflow-x-auto rounded-xl border border-border/40">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-surface/60 border-b border-border/40">
                            <th className="text-left py-2 px-3 text-xs text-muted font-bold">{group.title}</th>
                            {validResults.map((r) => (
                              <th key={r.symbol} className="text-center py-2 px-3 text-xs font-mono font-bold text-foreground">
                                {r.symbol}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {group.rows.map((row) => (
                            <tr key={row.label} className="border-b border-border/30 last:border-0">
                              <td className="py-2 px-3 text-sm text-muted">{row.label}</td>
                              {validResults.map((r) => (
                                <td key={r.symbol} className="py-2 px-3 text-center text-xs font-mono text-foreground">
                                  {row.get(r) ?? '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CompareStockCard({ result: r, isBest }) {
  const style = ACTION_STYLES[r.recommendation] || ACTION_STYLES.hold;
  const grade = GRADE_LABELS[r.fundamental?.valuation_grade] || GRADE_LABELS.neutral;
  const trend = r.trend?.trend_direction?.replace('_', ' ') || '-';
  const trendColor = r.trend?.trend_direction?.includes('up') ? 'text-success'
    : r.trend?.trend_direction?.includes('down') ? 'text-danger' : 'text-warning';
  const personalized = r.personalized_risk;
  const riskBand = RISK_USAGE_BAND_LABELS[personalized?.risk_usage_band];

  return (
    <Link
      to={`/stock/${r.symbol}`}
      className={`glass-card rounded-2xl p-5 hover:border-primary/50 transition-all group relative ${
        isBest ? 'ring-2 ring-success/40 border-success/30' : ''
      }`}
    >
      {isBest && (
        <span className="absolute -top-2 -right-2 bg-success text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
          <Trophy size={10} /> Best
        </span>
      )}

      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono font-black text-xl text-foreground">{r.symbol}</span>
          {r.holding && (
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-xs font-bold text-primary">
              <Briefcase size={10} /> ในพอร์ต
            </span>
          )}
        </div>
        <ArrowRight size={16} className="text-muted group-hover:text-primary transition-colors" />
      </div>

      <p className="text-2xl font-black text-foreground mb-1">
        {r.current_price?.toLocaleString()}
        <span className="text-xs text-muted font-normal ml-1">{r.currency || 'USD'}</span>
      </p>

      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border mb-4 ${style.bg} ${style.border}`}>
        <span className={`text-sm font-black ${style.text}`}>
          {ACTION_LABELS[r.recommendation] || r.recommendation}
        </span>
        <span className="text-xs text-muted">
          {(r.confidence * 100).toFixed(0)}%
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <MiniStat label="P/E" value={r.fundamental?.pe_ratio?.toFixed(1)} />
        <MiniStat label="PEG" value={r.fundamental?.peg_ratio?.toFixed(2)} />
        <MiniStat label="P/S" value={r.fundamental?.ps_ratio?.toFixed(1)} />
      </div>

      <div className="flex items-center justify-between text-sm pt-3 border-t border-border/40">
        <span className={grade.color}>{grade.label}</span>
        <span className={`font-semibold uppercase ${trendColor}`}>{trend}</span>
      </div>

      {r.trading_plan && (
        <p className="text-xs text-muted mt-2 font-mono">
          SL {formatMoney(r.trading_plan.stop_loss, r.currency)} → Target {formatMoney(r.trading_plan.target_price, r.currency)}
        </p>
      )}

      {r.holding && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-border/40 bg-surface/40 p-2.5">
          <MiniStat label="ถือ / ต้นทุน" value={`${r.holding.shares.toLocaleString()} @ ${formatMoney(r.holding.avg_cost, r.currency)}`} />
          <PortfolioPnl holding={r.holding} compact />
        </div>
      )}

      {personalized && (
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
            <ShieldCheck size={13} /> {personalized.action_label}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{personalized.summary}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            {personalized.position_pct != null && <span>สัดส่วน {personalized.position_pct}%</span>}
            {personalized.risk_usage_pct != null && (
              <span className={personalized.risk_usage_pct >= 75 ? 'text-warning' : ''}>
                ใช้ขีดจำกัด {personalized.risk_usage_pct}%{riskBand ? ` • ${riskBand}` : ''}
              </span>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}

function PortfolioPnl({ holding, compact = false }) {
  if (!holding) return '-';
  const isPositive = holding.unrealized_pnl >= 0;
  const value = `${isPositive ? '+' : ''}${holding.unrealized_pnl_pct.toFixed(2)}%`;

  if (compact) {
    return (
      <div className="bg-surface/50 rounded-lg py-1.5 px-2 text-center border border-border/30">
        <p className="text-xs text-muted uppercase">P/L พอร์ต</p>
        <p className={`text-xs font-mono font-bold mt-0.5 ${isPositive ? 'text-success' : 'text-danger'}`}>
          {value}
        </p>
      </div>
    );
  }

  return <span className={`font-bold ${isPositive ? 'text-success' : 'text-danger'}`}>{value}</span>;
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-surface/50 rounded-lg py-1.5 px-2 text-center border border-border/30">
      <p className="text-xs text-muted uppercase">{label}</p>
      <p className="text-xs font-mono font-bold text-foreground mt-0.5">{value || '-'}</p>
    </div>
  );
}
