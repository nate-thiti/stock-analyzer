import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase, Plus, Trash2, Loader2, AlertTriangle, TrendingUp, TrendingDown, Pencil, BellRing,
} from 'lucide-react';
import { api } from '../api';
import { useQuotePoll } from '../hooks/useQuotePoll';
import { usePriceAlerts } from '../hooks/usePriceAlerts';
import PortfolioDashboard from '../components/PortfolioDashboard';
import PriceAlertButton, { AlertTriggeredBadge } from '../components/PriceAlertButton';

export default function PortfolioPage() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ symbol: '', shares: '', avg_cost: '' });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ shares: '', avg_cost: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.listPositions();
      setPositions(list);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useQuotePoll(load, { enabled: true });
  const { alerts, load: reloadAlerts, triggered } = usePriceAlerts();

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.createPosition({
        symbol: form.symbol.trim().toUpperCase(),
        shares: parseFloat(form.shares),
        avg_cost: parseFloat(form.avg_cost),
      });
      setForm({ symbol: '', shares: '', avg_cost: '' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editId) return;
    try {
      await api.updatePosition(editId, {
        shares: parseFloat(editForm.shares),
        avg_cost: parseFloat(editForm.avg_cost),
      });
      setEditId(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id, symbol) => {
    if (!window.confirm(`ลบ ${symbol} ออกจากพอร์ต?`)) return;
    try {
      await api.deletePosition(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const totalCost = positions.reduce((s, p) => s + (p.cost_basis || 0), 0);
  const totalValue = positions.reduce((s, p) => s + (p.market_value || 0), 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost ? (totalPnl / totalCost) * 100 : 0;

  return (
    <div className="space-y-6 w-full min-w-0">
      <div>
        <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Briefcase size={24} className="text-primary" />
          พอร์ตของฉัน
        </h2>
        <p className="text-sm text-muted mt-1">บันทึกหุ้นที่ถือ + ราคาซื้อเฉลี่ย — ราคาอัปเดต auto 30s</p>
      </div>

      {error && (
        <div className="bg-danger/5 border border-danger/25 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-danger shrink-0" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {positions.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="มูลค่ารวม" value={totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
            <SummaryCard label="ต้นทุนรวม" value={totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
            <SummaryCard
              label="กำไร/ขาดทุน"
              value={`${totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              positive={totalPnl >= 0}
            />
            <SummaryCard
              label="% P/L"
              value={`${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}%`}
              positive={totalPnlPct >= 0}
            />
          </div>
          <PortfolioDashboard positions={positions} totalValue={totalValue} />
        </>
      )}

      {triggered.length > 0 && (
        <Link
          to="/alerts"
          className="block glass-card rounded-2xl p-4 border border-warning/30 bg-warning/5 hover:border-warning/50 transition-colors"
        >
          <p className="text-sm font-bold text-warning flex items-center gap-2 mb-2">
            <BellRing size={16} /> แจ้งเตือนราคา ({triggered.length}) — ดูทั้งหมด
          </p>
          <div className="flex flex-wrap gap-2">
            {triggered.map((a) => (
              <span key={a.id} className="text-xs px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/25">
                <span className="font-mono font-bold">{a.symbol}</span>
                <span className="text-muted ml-1">{a.direction === 'above' ? '≥' : '≤'} {a.target_price}</span>
              </span>
            ))}
          </div>
        </Link>
      )}

      <form onSubmit={handleCreate} className="glass-card rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Plus size={16} className="text-primary" /> เพิ่มหุ้นในพอร์ต
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="สัญลักษณ์" value={form.symbol} onChange={(v) => setForm({ ...form, symbol: v })} placeholder="AAPL, PTT.BK" required />
          <Field label="จำนวนหุ้น" type="number" step="any" value={form.shares} onChange={(v) => setForm({ ...form, shares: v })} placeholder="100" required />
          <Field label="ราคาซื้อเฉลี่ย" type="number" step="any" value={form.avg_cost} onChange={(v) => setForm({ ...form, avg_cost: v })} placeholder="150.00" required />
        </div>
        <button type="submit" disabled={saving} className="px-6 py-2 bg-gradient-primary border border-primary rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
          {saving ? 'กำลังบันทึก...' : 'เพิ่ม'}
        </button>
      </form>

      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 size={24} className="animate-spin text-primary" /></div>
        ) : positions.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">ยังไม่มีหุ้นในพอร์ต — เพิ่มด้านบน</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-surface/40">
                  <th className="text-left py-3 px-4 text-[10px] text-muted uppercase">หุ้น</th>
                  <th className="text-right py-3 px-4 text-[10px] text-muted uppercase">จำนวน</th>
                  <th className="text-right py-3 px-4 text-[10px] text-muted uppercase">ทุนเฉลี่ย</th>
                  <th className="text-right py-3 px-4 text-[10px] text-muted uppercase">ราคาปัจจุบัน</th>
                  <th className="text-right py-3 px-4 text-[10px] text-muted uppercase">มูลค่า</th>
                  <th className="text-right py-3 px-4 text-[10px] text-muted uppercase">P/L</th>
                  <th className="text-right py-3 px-4 text-[10px] text-muted uppercase">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.id} className="border-b border-border/30 hover:bg-surface/30">
                    {editId === p.id ? (
                      <td colSpan={7} className="p-4">
                        <form onSubmit={handleUpdate} className="flex flex-wrap gap-2 items-end">
                          <span className="font-mono font-bold text-primary w-full sm:w-auto mb-2 sm:mb-0">{p.symbol}</span>
                          <Field label="จำนวน" type="number" step="any" value={editForm.shares} onChange={(v) => setEditForm({ ...editForm, shares: v })} compact />
                          <Field label="ทุนเฉลี่ย" type="number" step="any" value={editForm.avg_cost} onChange={(v) => setEditForm({ ...editForm, avg_cost: v })} compact />
                          <button type="submit" className="px-3 py-1.5 bg-primary/15 text-primary rounded-lg text-xs">บันทึก</button>
                          <button type="button" onClick={() => setEditId(null)} className="px-3 py-1.5 text-muted text-xs">ยกเลิก</button>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="py-3 px-4">
                          <Link to={`/stock/${p.symbol}`} className="font-mono font-bold hover:text-primary">{p.symbol}</Link>
                          <AlertTriggeredBadge show={alerts.some((a) => a.symbol === p.symbol && a.triggered)} />
                        </td>
                        <td className="py-3 px-4 text-right font-mono">{p.shares}</td>
                        <td className="py-3 px-4 text-right font-mono">{p.avg_cost?.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-mono">{p.current_price?.toFixed(2) ?? '-'}</td>
                        <td className="py-3 px-4 text-right font-mono">{p.market_value?.toLocaleString() ?? '-'}</td>
                        <td className={`py-3 px-4 text-right font-mono font-bold ${(p.unrealized_pnl ?? 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                          {p.unrealized_pnl != null ? (
                            <span className="inline-flex items-center gap-0.5 justify-end">
                              {(p.unrealized_pnl ?? 0) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                              {p.unrealized_pnl >= 0 ? '+' : ''}{p.unrealized_pnl?.toFixed(0)}
                              <span className="text-[10px] font-normal ml-1">({p.unrealized_pnl_pct?.toFixed(1)}%)</span>
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <PriceAlertButton
                            symbol={p.symbol}
                            currentPrice={p.current_price}
                            alerts={alerts}
                            onChange={reloadAlerts}
                            compact
                          />
                          <button type="button" onClick={() => { setEditId(p.id); setEditForm({ shares: String(p.shares), avg_cost: String(p.avg_cost) }); }} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                            <Pencil size={12} /> แก้
                          </button>
                          <button type="button" onClick={() => handleDelete(p.id, p.symbol)} className="text-xs text-danger hover:underline inline-flex items-center gap-1">
                            <Trash2 size={12} /> ลบ
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, positive }) {
  const color = positive === undefined ? 'text-foreground' : positive ? 'text-success' : 'text-danger';
  return (
    <div className="glass-card rounded-xl p-4">
      <p className="text-[10px] text-muted uppercase">{label}</p>
      <p className={`text-lg font-black mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, required, step, compact }) {
  return (
    <div className={compact ? 'min-w-[120px]' : ''}>
      <label className="text-[10px] font-bold text-muted uppercase">{label}</label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full mt-1 bg-surface border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
      />
    </div>
  );
}
