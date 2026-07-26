import { useState, useId } from 'react';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import { api, inferCurrency, formatMoney } from '../api';
import Modal from './Modal';
import SelectField from './SelectField';

export default function PriceAlertButton({ symbol, currentPrice, currency, alerts = [], onChange, compact = false }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState('');
  const [direction, setDirection] = useState('above');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const titleId = useId();

  const sym = symbol?.toUpperCase();
  const cur = inferCurrency(sym, currency);
  const symbolAlerts = alerts.filter((a) => a.symbol === sym);
  const hasTriggered = symbolAlerts.some((a) => a.triggered);

  const handleCreate = async (e) => {
    e.preventDefault();
    const price = parseFloat(target);
    if (!price || price <= 0) return;
    setSaving(true);
    setError(null);
    try {
      await api.createPriceAlert({ symbol: sym, target_price: price, direction });
      setTarget('');
      setOpen(false);
      onChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deletePriceAlert(id);
      onChange?.();
    } catch { /* ignore */ }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`relative inline-flex items-center gap-1 rounded-lg transition-colors ${
          compact
            ? 'p-1.5 hover:bg-primary/10 text-muted hover:text-primary'
            : 'px-2 py-1 text-xs text-muted hover:text-primary hover:bg-primary/10'
        }`}
        aria-label="ตั้งราคาแจ้งเตือน"
      >
        {hasTriggered ? (
          <BellRing size={compact ? 16 : 14} className="text-warning animate-pulse" />
        ) : (
          <Bell size={compact ? 16 : 14} />
        )}
        {!compact && <span>Alert</span>}
        {hasTriggered && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-warning rounded-full" />
        )}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        titleId={titleId}
        title={(
          <span className="flex items-center gap-2">
            <Bell size={16} className="text-primary shrink-0" />
            แจ้งเตือนราคา {sym}
          </span>
        )}
      >
        {currentPrice != null && (
          <p className="text-xs text-muted -mt-1">
            ราคาปัจจุบัน:{' '}
            <span className="font-mono font-bold text-foreground">{formatMoney(currentPrice, cur)}</span>
          </p>
        )}

        <form onSubmit={handleCreate} className="space-y-3">
          <SelectField
            label="เงื่อนไข"
            value={direction}
            onChange={setDirection}
            options={[
              { value: 'above', label: 'ราคา ≥ เป้า (ขึ้นถึง)' },
              { value: 'below', label: 'ราคา ≤ เป้า (ลงถึง)' },
            ]}
          />
          <div>
            <label className="text-[10px] font-bold text-muted uppercase">ราคาเป้า</label>
            <input
              type="number"
              step="any"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={currentPrice ? String(currentPrice) : '150.00'}
              required
              autoFocus
              className="w-full mt-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm font-mono"
            />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-gradient-primary border border-primary rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            ตั้ง Alert
          </button>
        </form>

        {symbolAlerts.length > 0 && (
          <div className="border-t border-border/40 pt-3 space-y-2">
            <p className="text-[10px] font-bold text-muted uppercase">Alert ที่ตั้งไว้</p>
            {symbolAlerts.map((a) => (
              <div
                key={a.id}
                className={`flex items-center justify-between text-xs rounded-lg px-3 py-2 ${a.triggered ? 'bg-warning/10 border border-warning/30' : 'bg-surface/50'}`}
              >
                <span>
                  {a.direction === 'above' ? '≥' : '≤'} {formatMoney(a.target_price, cur)}
                  {a.triggered && <span className="ml-2 text-warning font-bold">ถึงแล้ว!</span>}
                </span>
                <button type="button" onClick={() => handleDelete(a.id)} className="text-danger hover:underline">ลบ</button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}

export function AlertTriggeredBadge({ show, label = 'ถึงราคาเป้า' }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning/15 border border-warning/30 text-warning text-[10px] font-bold">
      <BellRing size={10} /> {label}
    </span>
  );
}
