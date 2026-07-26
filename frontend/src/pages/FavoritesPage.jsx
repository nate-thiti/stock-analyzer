import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { api, inferCurrency, formatMoney } from '../api';
import { useFavorites } from '../context/FavoritesContext';
import { useQuotePoll } from '../hooks/useQuotePoll';
import { usePriceAlerts } from '../hooks/usePriceAlerts';
import PriceAlertButton, { AlertTriggeredBadge } from '../components/PriceAlertButton';

export default function FavoritesPage() {
  const { favorites, loading: favLoading } = useFavorites();
  const { alerts, load: reloadAlerts, triggered } = usePriceAlerts();

  return (
    <div className="space-y-6 w-full min-w-0">
      <div>
        <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Star size={24} className="text-warning fill-warning" />
          หุ้นติดดาว
        </h2>
        <p className="text-sm text-muted mt-1">รายการหุ้นที่คุณบันทึกไว้</p>
      </div>

      {triggered.length > 0 && (
        <Link
          to="/alerts"
          className="block glass-card rounded-xl p-3 border border-warning/30 bg-warning/5 text-xs text-warning hover:border-warning/50 transition-colors"
        >
          มี {triggered.length} alert ถึงราคาเป้าแล้ว — ดู Notifications
        </Link>
      )}

      {favLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : favorites.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center text-muted">
          <Star size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">ยังไม่มีหุ้นติดดาว</p>
          <p className="text-xs mt-1">กดไอคอนดาวในหน้าหุ้นเพื่อเพิ่ม</p>
          <Link to="/" className="inline-block mt-4 text-sm text-primary hover:underline">ไปค้นหาหุ้น</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((f) => (
            <FavoriteCard key={f.symbol} symbol={f.symbol} alerts={alerts} onAlertChange={reloadAlerts} />
          ))}
        </div>
      )}
    </div>
  );
}

function FavoriteCard({ symbol, alerts, onAlertChange }) {
  const [quote, setQuote] = useState(null);
  const { toggle } = useFavorites();
  const hasTriggered = alerts.some((a) => a.symbol === symbol && a.triggered);

  const refreshQuote = useCallback(async () => {
    try {
      const q = await api.quote(symbol);
      setQuote(q);
    } catch { /* keep stale */ }
  }, [symbol]);

  useEffect(() => { refreshQuote(); }, [refreshQuote]);
  useQuotePoll(refreshQuote);

  const isUp = quote?.change >= 0;

  return (
    <div className="glass-card rounded-2xl p-5 hover:border-primary/50 transition-all group relative">
      <div className="absolute top-4 right-4 flex items-center gap-1 z-10">
        <PriceAlertButton symbol={symbol} currentPrice={quote?.price} currency={quote?.currency} alerts={alerts} onChange={onAlertChange} compact />
        <button
          type="button"
          onClick={() => toggle(symbol)}
          className="p-1.5 rounded-lg hover:bg-warning/10 transition-colors"
          aria-label="เอาดาวออก"
        >
          <Star size={18} className="text-warning fill-warning" />
        </button>
      </div>

      <Link to={`/stock/${symbol}`} className="block">
        <p className="font-mono font-black text-xl text-foreground pr-20">{symbol}</p>
        {hasTriggered && <div className="mt-1"><AlertTriggeredBadge show /></div>}
        {quote?.name && <p className="text-xs text-muted truncate mt-0.5">{quote.name}</p>}

        {quote ? (
          <>
            <p className="text-2xl font-black mt-3">
              {quote.price?.toLocaleString()}
              <span className="text-xs text-muted font-normal ml-1">{quote.currency}</span>
            </p>
            <span className={`text-xs font-bold flex items-center gap-0.5 mt-1 ${isUp ? 'text-success' : 'text-danger'}`}>
              {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {quote.change_percent?.toFixed(2)}%
            </span>
          </>
        ) : (
          <p className="text-sm text-muted mt-3">กำลังโหลด...</p>
        )}
      </Link>
    </div>
  );
}
