import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Globe, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { api, POPULAR_STOCKS } from '../api';
import { useBatchQuotes } from '../hooks/useBatchQuotes';
import { useRiskProfile } from '../context/RiskProfileContext';
import StarButton from '../components/StarButton';
import MarketStateBadge from '../components/MarketStateBadge';
import MarketSignalSections from '../components/MarketSignalSections';
import QuickCompareSection from '../components/QuickCompareSection';
import RecentStocksSection from '../components/RecentStocksSection';
import RiskProfileModal from '../components/RiskProfileModal';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, needsSetup, save, load, loading: profileLoading } = useRiskProfile();
  const popularSymbols = POPULAR_STOCKS.map((stock) => stock.symbol);
  const { quotes: popularQuotes } = useBatchQuotes(popularSymbols);

  useEffect(() => {
    if (profile?.configured) {
      setRiskModalOpen(false);
      return;
    }
    if (!profileLoading && (needsSetup || location.state?.setupRisk)) {
      setRiskModalOpen(true);
    }
  }, [needsSetup, profileLoading, location.state?.setupRisk, profile?.configured]);

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    try {
      const res = await api.search(q);
      if (res.length === 1) {
        navigate(`/stock/${res[0].symbol}`);
      } else if (res.length > 0) {
        setResults(res);
      } else {
        navigate(`/stock/${q.toUpperCase()}`);
      }
    } catch {
      navigate(`/stock/${q.toUpperCase()}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 w-full min-w-0">
      <section className="text-center py-6 sm:py-10 relative">
        <h2 className="text-2xl sm:text-3xl lg:text-5xl font-black text-foreground mb-3 animate-fadeIn px-1">
          วิเคราะห์<span className="text-gradient">หุ้นทั่วโลก</span>
        </h2>
        <p className="text-sm text-muted max-w-lg mx-auto mb-8 px-2">
          คำนวณ P/E, PEG, P/S • วิเคราะห์ Technical • แนะนำซื้อ/ขาย • Stop Loss • แผนแบ่งซื้อ DCA
        </p>

        <form onSubmit={handleSearch} className="relative max-w-xl mx-auto group">
          <div className="absolute -inset-0.5 bg-gradient-primary rounded-2xl opacity-20 group-focus-within:opacity-60 blur transition-opacity duration-300" />
          <input
            type="text"
            placeholder="ค้นหาหุ้น เช่น AAPL, PTT.BK, 0700.HK..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="relative w-full bg-surface border border-border rounded-2xl pl-12 pr-4 py-3.5 text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <Search className="absolute left-4 top-4 text-muted" size={18} />
          {loading && (
            <div className="absolute right-4 top-4 w-5 h-5 border-2 border-primary border-t-transparent rounded-full icon-spin" />
          )}
        </form>

        {results.length > 0 && (
          <div className="max-w-xl mx-auto mt-3 glass-card rounded-xl overflow-hidden text-left animate-fadeIn">
            {results.map((r) => (
              <Link
                key={r.symbol}
                to={`/stock/${r.symbol}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-primary/5 border-b border-border/30 last:border-0 transition-colors"
                onClick={() => setResults([])}
              >
                <div>
                  <span className="font-mono font-bold text-foreground">{r.symbol}</span>
                  <span className="text-xs text-muted ml-2">{r.name}</span>
                </div>
                <span className="text-xs text-muted">{r.exchange}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <RecentStocksSection />

      <section>
        <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
          <Globe size={14} className="text-primary icon-animate" /> หุ้นยอดนิยม
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {POPULAR_STOCKS.map((s) => (
            <StockCard
              key={s.symbol}
              symbol={s.symbol}
              name={s.name}
              market={s.market}
              quote={popularQuotes[s.symbol]}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
          <TrendingUp size={14} className="text-primary icon-animate" />
          สัญญาณจากระบบ
        </h3>
        <MarketSignalSections />
      </section>

      <QuickCompareSection />

      <RiskProfileModal
        open={riskModalOpen}
        required={needsSetup}
        initialProfile={profile}
        title={needsSetup ? 'ตั้งค่าความเสี่ยงก่อนเริ่มใช้งาน' : 'ตั้งค่าโปรไฟล์ความเสี่ยง'}
        onClose={() => {
          setRiskModalOpen(false);
          if (location.state?.setupRisk) {
            navigate('.', { replace: true, state: {} });
          }
        }}
        onSave={async (data) => {
          await save(data);
          await load();
          setRiskModalOpen(false);
          if (location.state?.setupRisk) {
            navigate('.', { replace: true, state: {} });
          }
        }}
      />
    </div>
  );
}

function StockCard({ symbol, name, market, quote }) {
  const isUp = quote?.change >= 0;

  return (
    <Link
      to={`/stock/${symbol}`}
      className="glass-card rounded-2xl p-4 group flex flex-col min-h-[120px]"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span className="text-xs font-mono text-muted bg-surface px-1.5 py-0.5 rounded border border-border shrink-0">{market}</span>
          {quote?.market_state && <MarketStateBadge marketState={quote.market_state} compact />}
        </div>
        {quote && (
          <span className={`text-xs font-bold flex items-center shrink-0 ${isUp ? 'text-success' : 'text-danger'}`}>
            {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {quote.change_percent?.toFixed(2)}%
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <p className="font-bold text-foreground group-hover:text-primary transition-colors truncate">{name}</p>
        <p className="text-xs font-mono text-muted">{symbol}</p>
      </div>

      <div className="flex items-end justify-between mt-2 gap-2">
        {quote ? (
          <p className="text-sm font-mono font-bold text-foreground">
            {quote.price?.toLocaleString()}
            <span className="text-xs text-muted font-normal ml-1">{quote.currency}</span>
          </p>
        ) : (
          <span className="text-xs text-muted">...</span>
        )}
        <StarButton symbol={symbol} size={16} className="shrink-0 -mr-1 -mb-1" />
      </div>
    </Link>
  );
}
