import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Activity, TrendingDown, Loader2, RefreshCw, ArrowUpRight, ArrowDownRight, Star, Globe } from 'lucide-react';
import { api, ACTION_STYLES } from '../api';
import { useQuotePoll, SIGNALS_POLL_MS } from '../hooks/useQuotePoll';
import StarButton from './StarButton';
import SegmentedControl from './SegmentedControl';

const SECTIONS = [
  { key: 'buy', title: 'ควรซื้อเป็นอย่างยิ่ง', icon: TrendingUp, color: 'text-success', border: 'border-success/25', bg: 'bg-success/5' },
  { key: 'hold', title: 'ถือต่อ', icon: Activity, color: 'text-warning', border: 'border-warning/25', bg: 'bg-warning/5' },
  { key: 'sell', title: 'ขาย', icon: TrendingDown, color: 'text-danger', border: 'border-danger/25', bg: 'bg-danger/5' },
];

function marketFromSymbol(symbol) {
  if (symbol.endsWith('.BK')) return 'TH';
  if (symbol.endsWith('.HK')) return 'HK';
  if (['BABA', 'JD', 'NIO'].includes(symbol)) return 'CN';
  return 'US';
}

function formatUpdated(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
}

export default function MarketSignalSections() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [scope, setScope] = useState('global');

  const load = useCallback(async (refresh = false, scopeOverride = scope) => {
    if (refresh) setRefreshing(true);
    else if (!data) setLoading(true);
    setError(null);
    try {
      const res = await api.marketSignals(refresh, scopeOverride);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [scope]);

  useEffect(() => {
    setLoading(true);
    load(false, scope);
  }, [scope]); // eslint-disable-line react-hooks/exhaustive-deps

  useQuotePoll(() => load(false, scope), { enabled: true, intervalMs: SIGNALS_POLL_MS });

  if (loading && !data) {
    return (
      <div className="glass-card rounded-2xl p-8 flex flex-col items-center gap-3 text-muted">
        <Loader2 size={28} className="animate-spin text-primary" />
        <p className="text-sm">กำลังสแกนและจัดกลุ่มหุ้น... (ครั้งแรกอาจใช้ 20–40 วินาที)</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="glass-card rounded-2xl p-6 text-center">
        <p className="text-sm text-danger">{error}</p>
        <button type="button" onClick={() => load()} className="mt-3 text-xs text-primary hover:underline">ลองใหม่</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <SegmentedControl
            value={scope}
            onChange={setScope}
            options={[
              { value: 'global', label: 'Watchlist ทั่วไป', icon: Globe },
              { value: 'personal', label: 'รายการโปรด', icon: Star },
            ]}
          />
          <p className="text-[11px] text-muted">
            สแกน {data?.scanned} ตัว
            {data?.updated_at && <span> • อัปเดต {formatUpdated(data.updated_at)}</span>}
            <span className="text-primary/70 ml-1">• auto 15m</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-[11px] text-primary hover:underline disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          รีเฟรช
        </button>
      </div>

      {scope === 'personal' && data?.scope_used === 'global' && (
        <p className="text-xs text-muted bg-surface/50 border border-border/40 rounded-xl px-4 py-3">
          ยังไม่มีรายการโปรด — แสดง watchlist ทั่วไปแทน (กด ⭐ ที่หุ้นเพื่อใช้รายการโปรด)
        </p>
      )}

      {SECTIONS.map(({ key, title, icon: Icon, color, border, bg }) => {
        const items = data?.[key] || [];
        return (
          <section key={key}>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${color}`}>
              <Icon size={14} />
              {title}
              <span className="text-muted font-normal normal-case">({items.length})</span>
            </h3>
            {items.length === 0 ? (
              <div className={`rounded-2xl border ${border} ${bg} p-5 text-center text-xs text-muted`}>
                ไม่มีหุ้นในกลุ่มนี้จาก watchlist วันนี้
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {items.map((item) => (
                  <SignalCard key={item.symbol} item={item} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function SignalCard({ item }) {
  const style = ACTION_STYLES[item.recommendation] || ACTION_STYLES.hold;
  const isUp = (item.change_percent ?? 0) >= 0;
  const market = marketFromSymbol(item.symbol);
  const actionLabel = { buy: 'ซื้อ', hold: 'ถือ', sell: 'ขาย' }[item.recommendation] || item.recommendation;

  return (
    <Link
      to={`/stock/${item.symbol}`}
      className={`glass-card rounded-2xl p-4 group flex flex-col min-h-[130px] border ${style.border} hover:border-primary/40 transition-all`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-mono text-muted bg-surface px-1.5 py-0.5 rounded border border-border shrink-0">{market}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${style.bg} ${style.text}`}>
          {actionLabel} {(item.confidence * 100).toFixed(0)}%
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-foreground group-hover:text-primary transition-colors truncate">{item.name || item.symbol}</p>
        <p className="text-[10px] font-mono text-muted">{item.symbol}</p>
        <p className="text-[10px] text-muted mt-1">Score {item.score >= 0 ? '+' : ''}{item.score?.toFixed(2)}</p>
      </div>
      <div className="flex items-end justify-between mt-2 gap-2">
        <div>
          <p className="text-sm font-mono font-bold text-foreground">
            {item.current_price?.toLocaleString()}
            <span className="text-[10px] text-muted font-normal ml-1">{item.currency}</span>
          </p>
          {item.change_percent != null && (
            <span className={`text-[10px] font-bold flex items-center ${isUp ? 'text-success' : 'text-danger'}`}>
              {isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
              {item.change_percent?.toFixed(2)}%
            </span>
          )}
        </div>
        <StarButton symbol={item.symbol} size={16} className="shrink-0 -mr-1 -mb-1" />
      </div>
    </Link>
  );
}
