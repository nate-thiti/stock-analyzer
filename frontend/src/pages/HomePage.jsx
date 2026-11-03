import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Globe, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { POPULAR_STOCKS } from '../api';
import { useBatchQuotes } from '../hooks/useBatchQuotes';
import { useRiskProfile } from '../context/RiskProfileContext';
import StarButton from '../components/StarButton';
import MarketStateBadge from '../components/MarketStateBadge';
import MarketSignalSections from '../components/MarketSignalSections';
import QuickCompareSection from '../components/QuickCompareSection';
import RecentStocksSection from '../components/RecentStocksSection';
import RiskProfileModal from '../components/RiskProfileModal';
import DataFreshnessNotice from '../components/DataFreshnessNotice';
import StockSearch from '../components/StockSearch';

export default function HomePage() {
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

  return (
    <div className="space-y-8 w-full min-w-0">
      <section className="text-center py-6 sm:py-10 relative z-20">
        <h2 className="text-2xl sm:text-3xl lg:text-5xl font-black text-foreground mb-3 animate-fadeIn px-1">
          วิเคราะห์<span className="text-gradient">หุ้นทั่วโลก</span>
        </h2>
        <p className="text-sm text-muted max-w-lg mx-auto mb-8 px-2">
          คำนวณ P/E, PEG, P/S • วิเคราะห์ Technical • แนะนำซื้อ/ขาย • Stop Loss • แผนแบ่งซื้อ DCA
        </p>

        <StockSearch className="max-w-xl mx-auto text-left" />
        <p className="mt-3 hidden sm:block text-xs text-muted">
          พิมพ์ชื่อบริษัทหรือสัญลักษณ์ — กด <kbd className="font-mono">/</kbd> หรือ <kbd className="font-mono">Ctrl K</kbd> เพื่อค้นหาจากหน้าไหนก็ได้
        </p>
      </section>

      <DataFreshnessNotice />

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
