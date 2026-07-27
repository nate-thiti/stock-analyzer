import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { History, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import { api } from '../api';
import { getRecentStocks, removeRecentStock } from '../utils/recentStocks';
import { useQuotePoll, HOME_POLL_MS } from '../hooks/useQuotePoll';
import MarketStateBadge from './MarketStateBadge';

export default function RecentStocksSection() {
  const [symbols, setSymbols] = useState(getRecentStocks());

  useEffect(() => {
    const refresh = () => setSymbols(getRecentStocks());
    window.addEventListener('storage', refresh);
    window.addEventListener('recent-stocks-updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('recent-stocks-updated', refresh);
    };
  }, []);

  const handleRemove = (symbol) => {
    removeRecentStock(symbol);
    setSymbols(getRecentStocks());
  };

  if (symbols.length === 0) return null;

  return (
    <section>
      <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
        <History size={14} className="text-primary icon-animate" /> ดูล่าสุด
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {symbols.map((sym) => (
          <RecentChip key={sym} symbol={sym} onRemove={() => handleRemove(sym)} />
        ))}
      </div>
    </section>
  );
}

function RecentChip({ symbol, onRemove }) {
  const [quote, setQuote] = useState(null);

  const refreshQuote = useCallback(async () => {
    try {
      const q = await api.quote(symbol);
      setQuote(q);
    } catch { /* ignore */ }
  }, [symbol]);

  useEffect(() => { refreshQuote(); }, [refreshQuote]);
  useQuotePoll(refreshQuote, { intervalMs: HOME_POLL_MS });

  const isUp = quote?.change >= 0;

  return (
    <div className="relative shrink-0 min-w-[140px] group">
      <Link
        to={`/stock/${symbol}`}
        className="block glass-card rounded-xl px-4 py-3 pr-8 hover:border-primary/40 transition-colors"
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-mono font-bold text-sm">{symbol}</p>
          {quote?.market_state && <MarketStateBadge marketState={quote.market_state} compact />}
        </div>
        {quote ? (
          <>
            <p className="text-lg font-black mt-1">
              {quote.price?.toLocaleString()}
              <span className="text-[10px] text-muted font-normal ml-1">{quote.currency}</span>
            </p>
            <span className={`text-[10px] font-bold flex items-center gap-0.5 ${isUp ? 'text-success' : 'text-danger'}`}>
              {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {quote.change_percent?.toFixed(2)}%
            </span>
          </>
        ) : (
          <p className="text-xs text-muted mt-2">...</p>
        )}
      </Link>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); onRemove(); }}
        className="absolute top-2 right-2 p-1 rounded-md text-muted hover:text-danger hover:bg-danger/10 opacity-70 group-hover:opacity-100 transition-all"
        aria-label={`ลบ ${symbol} ออกจากดูล่าสุด`}
      >
        <X size={14} />
      </button>
    </div>
  );
}
