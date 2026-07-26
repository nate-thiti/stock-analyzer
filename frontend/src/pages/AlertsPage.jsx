import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, BellRing, Loader2, Trash2, Plus, ArrowUpRight, ArrowDownRight,
  TrendingUp, TrendingDown, ExternalLink,
} from 'lucide-react';
import { api, inferCurrency, formatMoney, formatSignedMoney } from '../api';
import { usePriceAlerts } from '../hooks/usePriceAlerts';
import SelectField from '../components/SelectField';
import SegmentedControl from '../components/SegmentedControl';

function directionLabel(direction) {
  return direction === 'above' ? 'ราคา ≥ เป้า' : 'ราคา ≤ เป้า';
}

function directionSymbol(direction) {
  return direction === 'above' ? '≥' : '≤';
}

export default function AlertsPage() {
  const { alerts, loading, load, triggered } = usePriceAlerts();
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ symbol: '', target_price: '', direction: 'above' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const active = alerts.filter((a) => !a.triggered);

  const filtered = alerts.filter((a) => {
    if (filter === 'triggered') return a.triggered;
    if (filter === 'watching') return !a.triggered;
    return true;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    const price = parseFloat(form.target_price);
    if (!form.symbol.trim() || !price || price <= 0) return;
    setSaving(true);
    setError(null);
    try {
      await api.createPriceAlert({
        symbol: form.symbol.trim().toUpperCase(),
        target_price: price,
        direction: form.direction,
      });
      setForm({ symbol: '', target_price: '', direction: form.direction });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, symbol) => {
    if (!window.confirm(`ลบ alert ของ ${symbol}?`)) return;
    setDeletingId(id);
    try {
      await api.deletePriceAlert(id);
      await load();
    } catch { /* ignore */ }
    finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      <div>
        <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Bell size={24} className="text-primary" />
          แจ้งเตือนราคา
        </h2>
        <p className="text-sm text-muted mt-1">
          จัดการ alert ทั้งหมด — ตรวจอัตโนมัติทุก 1 นาที
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <StatCard label="ทั้งหมด" value={alerts.length} />
        <StatCard label="กำลังเฝ้า" value={active.length} accent="primary" />
        <StatCard label="ถึงเป้าแล้ว" value={triggered.length} accent="warning" />
      </div>

      {triggered.length > 0 && (
        <section className="glass-card rounded-2xl p-5 border border-warning/30 bg-warning/5 space-y-3">
          <h3 className="text-sm font-bold text-warning flex items-center gap-2">
            <BellRing size={18} className="animate-pulse" />
            Notifications — ถึงราคาเป้าแล้ว ({triggered.length})
          </h3>
          <div className="space-y-2">
            {triggered.map((a) => (
              <NotificationRow key={a.id} alert={a} onDelete={handleDelete} deleting={deletingId === a.id} />
            ))}
          </div>
        </section>
      )}

      <form onSubmit={handleCreate} className="glass-card rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Plus size={16} className="text-primary" />
          ตั้ง Alert ใหม่
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-[10px] font-bold text-muted uppercase">สัญลักษณ์</label>
            <input
              type="text"
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
              placeholder="AAPL, PTT.BK"
              required
              className="w-full mt-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:border-primary"
            />
          </div>
          <SelectField
            label="เงื่อนไข"
            value={form.direction}
            onChange={(v) => setForm({ ...form, direction: v })}
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
              value={form.target_price}
              onChange={(e) => setForm({ ...form, target_price: e.target.value })}
              placeholder="150.00"
              required
              className="w-full mt-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="py-2.5 bg-gradient-primary border border-primary rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
            ตั้ง Alert
          </button>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </form>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <h3 className="text-xs font-bold text-muted uppercase tracking-wider shrink-0">รายการ Alert</h3>
        <div className="w-full sm:w-auto min-w-0 overflow-x-auto">
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            className="min-w-max sm:min-w-0"
          options={[
            { value: 'all', label: `ทั้งหมด (${alerts.length})` },
            { value: 'watching', label: `เฝ้า (${active.length})`, icon: Bell },
            { value: 'triggered', label: `ถึงเป้า (${triggered.length})`, icon: BellRing },
          ]}
        />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center text-muted">
          <Bell size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {filter === 'all' ? 'ยังไม่มี alert' : filter === 'triggered' ? 'ยังไม่มี alert ที่ถึงเป้า' : 'ไม่มี alert ที่กำลังเฝ้า'}
          </p>
          <p className="text-xs mt-1">ตั้งได้จากฟอร์มด้านบน หรือกดกระดิ่งในหน้าหุ้น / รายการโปรด</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-[10px] text-muted uppercase">
                  <th className="text-left py-3 px-4">หุ้น</th>
                  <th className="text-left py-3 px-4">เงื่อนไข</th>
                  <th className="text-right py-3 px-4">ราคาปัจจุบัน</th>
                  <th className="text-center py-3 px-4">สถานะ</th>
                  <th className="text-right py-3 px-4">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <AlertRow key={a.id} alert={a} onDelete={handleDelete} deleting={deletingId === a.id} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }) {
  const color = accent === 'warning' ? 'text-warning' : accent === 'primary' ? 'text-primary' : 'text-foreground';
  return (
    <div className="glass-card rounded-xl p-4 text-center">
      <p className="text-[10px] text-muted uppercase">{label}</p>
      <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function NotificationRow({ alert: a, onDelete, deleting }) {
  const cur = inferCurrency(a.symbol);
  const diff = a.current_price != null ? a.current_price - a.target_price : null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 bg-warning/10 border border-warning/25">
      <div className="flex items-center gap-3 min-w-0">
        <BellRing size={18} className="text-warning shrink-0" />
        <div>
          <Link to={`/stock/${a.symbol}`} className="font-mono font-bold text-foreground hover:text-primary">
            {a.symbol}
          </Link>
          <p className="text-xs text-muted mt-0.5">
            {directionLabel(a.direction)} {directionSymbol(a.direction)} {formatMoney(a.target_price, cur)}
            {a.current_price != null && (
              <span className="ml-2 font-mono text-warning">ตอนนี้ {formatMoney(a.current_price, cur)}</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {diff != null && (
          <span className={`text-xs font-bold flex items-center gap-0.5 ${diff >= 0 ? 'text-success' : 'text-danger'}`}>
            {diff >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {formatSignedMoney(diff, cur)}
          </span>
        )}
        <Link
          to={`/stock/${a.symbol}`}
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
        >
          ดูหุ้น <ExternalLink size={12} />
        </Link>
        <button
          type="button"
          onClick={() => onDelete(a.id, a.symbol)}
          disabled={deleting}
          className="p-1.5 rounded-lg text-danger hover:bg-danger/10 disabled:opacity-50"
          aria-label="ลบ alert"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </div>
  );
}

function AlertRow({ alert: a, onDelete, deleting }) {
  const cur = inferCurrency(a.symbol);
  const pctToTarget = a.current_price != null && a.target_price
    ? ((a.current_price - a.target_price) / a.target_price) * 100
    : null;

  return (
    <tr className={`border-b border-border/30 hover:bg-surface/30 ${a.triggered ? 'bg-warning/5' : ''}`}>
      <td className="py-3 px-4">
        <Link to={`/stock/${a.symbol}`} className="font-mono font-bold hover:text-primary">
          {a.symbol}
        </Link>
      </td>
      <td className="py-3 px-4">
        <span className="text-xs">{directionLabel(a.direction)}</span>
        <p className="font-mono font-bold mt-0.5">
          {directionSymbol(a.direction)} {formatMoney(a.target_price, cur)}
        </p>
      </td>
      <td className="py-3 px-4 text-right font-mono">
        {a.current_price != null ? formatMoney(a.current_price, cur) : '—'}
        {pctToTarget != null && !a.triggered && (
          <p className={`text-[10px] mt-0.5 flex items-center justify-end gap-0.5 ${pctToTarget >= 0 ? 'text-success' : 'text-danger'}`}>
            {pctToTarget >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {Math.abs(pctToTarget).toFixed(1)}% จากเป้า
          </p>
        )}
      </td>
      <td className="py-3 px-4 text-center">
        {a.triggered ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warning/15 border border-warning/30 text-warning text-[10px] font-bold">
            <BellRing size={10} /> ถึงแล้ว
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/25 text-primary text-[10px] font-bold">
            <Bell size={10} /> เฝ้าอยู่
          </span>
        )}
      </td>
      <td className="py-3 px-4 text-right">
        <button
          type="button"
          onClick={() => onDelete(a.id, a.symbol)}
          disabled={deleting}
          className="text-xs text-danger hover:underline inline-flex items-center gap-1 disabled:opacity-50"
        >
          {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          ลบ
        </button>
      </td>
    </tr>
  );
}
