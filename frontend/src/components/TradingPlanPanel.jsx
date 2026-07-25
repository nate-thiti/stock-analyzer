import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Shield, Target, Wallet, Layers, Calendar, AlertCircle, Package, ShoppingCart } from 'lucide-react';
import { ACTION_STYLES } from '../api';

const POSITION_MODES = {
  holding: { id: 'holding', label: 'ถืออยู่แล้ว', icon: Package },
  new: { id: 'new', label: 'ยังไม่ได้ซื้อ', icon: ShoppingCart },
};

const POSITION_GUIDANCE = {
  holding: {
    buy: {
      label: 'ถือต่อ / สะสมเพิ่ม',
      hint: 'สัญญาณบวก — ถือต่อได้ หรือเพิ่มสัดส่วนตามแผน DCA ด้านล่าง',
      style: 'buy',
    },
    sell: {
      label: 'พิจารณาขาย',
      hint: 'สัญญาณลบ — ควรลดสัดส่วน หรือ take profit บางส่วนใกล้ resistance',
      style: 'sell',
    },
    hold: {
      label: 'ถือต่อ',
      hint: 'ยังไม่ชัดเจนพอ — ถือต่อได้ แต่ไม่จำเป็นต้องเพิ่ม',
      style: 'hold',
    },
  },
  new: {
    buy: {
      label: 'ซื้อได้',
      hint: 'สัญญาณบวก — เหมาะเริ่มเข้าตามแผน DCA ด้านล่าง',
      style: 'buy',
    },
    sell: {
      label: 'อย่าเข้า / รอ',
      hint: 'สัญญาณลบ — ยังไม่เหมาะเปิดสถานะใหม่ รอสัญญาณดีขึ้น',
      style: 'hold',
    },
    hold: {
      label: 'รอดูก่อน',
      hint: 'ยังไม่ชัดเจน — รอราคาใกล้ support หรือ breakout ยืนยันก่อนเข้า',
      style: 'hold',
    },
  },
};

function formatPlanDate(iso) {
  if (!iso) return new Date().toLocaleDateString('th-TH', { dateStyle: 'long' });
  const d = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('th-TH', { dateStyle: 'long' });
}

function getContextualDca(plan, positionMode) {
  if (!plan.dca_splits?.length) return [];

  if (plan.action === 'buy') {
    return plan.dca_splits.map((s) => ({
      ...s,
      note: positionMode === 'holding'
        ? s.note.replace('ซื้อ', 'เพิ่ม').replace('ลด average cost', 'เฉลี่ยต้นทุนลง')
        : s.note,
    }));
  }

  if (plan.action === 'hold') {
    if (positionMode === 'holding') {
      return [{
        tranche: 1,
        pct: 100,
        price_target: plan.entry_price,
        shares: 0,
        amount: 0,
        note: 'ถือต่อ — ไม่ต้องเพิ่มจนกว่าจะมีสัญญาณชัดขึ้น (breakout หรือ pullback ใกล้ support)',
      }];
    }
    return plan.dca_splits;
  }

  if (plan.action === 'sell') {
    if (positionMode === 'new') {
      return [{
        tranche: 1,
        pct: 100,
        price_target: plan.entry_price,
        shares: 0,
        amount: 0,
        note: 'ไม่แนะนำเปิดสถานะใหม่ — รอจน score ดีขึ้น',
      }];
    }
    return plan.dca_splits;
  }

  return plan.dca_splits;
}

function NoteList({ title, items, color = 'primary' }) {
  if (!items?.length) return null;
  const dot = color === 'success' ? 'bg-success' : color === 'warning' ? 'bg-warning' : 'bg-primary';
  return (
    <div>
      <h4 className="text-[10px] font-bold text-muted uppercase mb-2">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((r, i) => (
          <li key={i} className="text-[11px] text-foreground/85 flex items-start gap-2 leading-relaxed">
            <span className={`w-1 h-1 rounded-full ${dot} mt-1.5 shrink-0`} />
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TradingPlanPanel({ plan, currency, embedded = false, position = null }) {
  const [positionMode, setPositionMode] = useState(position ? 'holding' : 'new');

  useEffect(() => {
    setPositionMode(position ? 'holding' : 'new');
  }, [position?.id, position?.symbol]);

  if (!plan) return null;

  const guidance = POSITION_GUIDANCE[positionMode][plan.action] || POSITION_GUIDANCE[positionMode].hold;
  const style = ACTION_STYLES[guidance.style] || ACTION_STYLES.hold;
  const planDate = formatPlanDate(plan.plan_date);
  const dcaTitle = positionMode === 'holding' && plan.action === 'buy'
    ? 'แผนแบ่งซื้อเพิ่ม (DCA)'
    : plan.action === 'buy'
      ? 'แผนแบ่งซื้อ (DCA)'
      : 'แนวทางปฏิบัติ';
  const dcaSplits = getContextualDca(plan, positionMode);

  const wrapperClass = embedded
    ? `rounded-xl p-4 bg-surface/50 border h-full max-h-[85vh] overflow-y-auto ${style.border}`
    : `glass-card rounded-2xl p-6 animate-fadeIn max-h-[85vh] overflow-y-auto ${style.border}`;

  return (
    <div className={wrapperClass}>
      <div className="mb-4 pb-3 border-b border-border/40">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Wallet size={16} className="text-primary" />
          แผนการลงทุนวันนี้
        </h3>
        <p className="text-[11px] text-muted mt-1 flex items-center gap-1.5">
          <Calendar size={11} className="text-primary shrink-0" />
          {planDate}
        </p>
        <p className="text-[10px] text-muted/80 mt-0.5 italic">
          (คาดการณ์จากข้อมูลย้อนหลัง)
        </p>
      </div>

      <div className="flex gap-2 mb-4 p-1 bg-surface/60 rounded-xl border border-border/40">
        {Object.values(POSITION_MODES).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setPositionMode(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] font-semibold transition-colors ${
              positionMode === id
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <span className={`text-3xl font-black ${style.text}`}>
            {guidance.label}
          </span>
          <p className="text-xs text-muted mt-1">
            ความมั่นใจ {(plan.confidence * 100).toFixed(0)}% • Score {plan.score?.toFixed(2)}
          </p>
        </div>
        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${style.bg}`}>
          {guidance.style === 'buy' ? <TrendingUp size={24} className="text-success" /> :
           guidance.style === 'sell' ? <TrendingDown size={24} className="text-danger" /> :
           <Activity size={24} className="text-warning" />}
        </div>
      </div>

      <p className="text-[11px] text-foreground/75 bg-surface/40 px-3 py-2 rounded-lg border border-border/30 mb-4 leading-relaxed">
        {guidance.hint}
      </p>

      <p className="text-xs text-foreground/80 bg-surface/60 p-3 rounded-xl border border-border/30 mb-4 leading-relaxed">
        {plan.summary}
      </p>

      {position && (
        <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20 grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-[10px] text-muted uppercase">ถืออยู่จริง</p>
            <p className="font-mono font-bold text-foreground">{position.shares} หุ้น @ {position.avg_cost?.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted uppercase">P/L</p>
            <p className={`font-mono font-bold ${(position.unrealized_pnl ?? 0) >= 0 ? 'text-success' : 'text-danger'}`}>
              {position.unrealized_pnl != null
                ? `${position.unrealized_pnl >= 0 ? '+' : ''}${position.unrealized_pnl?.toFixed(0)} (${position.unrealized_pnl_pct?.toFixed(1)}%)`
                : '-'}
            </p>
          </div>
        </div>
      )}

      {plan.detailed_analysis && (
        <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <h4 className="text-[10px] font-bold text-primary uppercase mb-2 flex items-center gap-1">
            <AlertCircle size={11} /> บทวิเคราะห์โดยสรุป
          </h4>
          <div className="text-[11px] text-foreground/85 leading-relaxed space-y-2 whitespace-pre-line">
            {plan.detailed_analysis}
          </div>
        </div>
      )}

      {(plan.action === 'buy' || plan.stop_loss) && (
        <div className={`grid gap-3 mb-4 ${embedded ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
          <Metric label="Entry" value={plan.entry_price?.toFixed(2)} suffix={currency} />
          <Metric label="Target" value={plan.target_price?.toFixed(2)} suffix={currency} icon={<Target size={10} />} />
          <Metric label="Stop Loss" value={plan.stop_loss?.toFixed(2)} suffix={`-${plan.stop_loss_pct}%`} icon={<Shield size={10} />} danger />
          <Metric label="R:R" value={plan.risk_reward_ratio ? `1:${plan.risk_reward_ratio}` : '-'} />
        </div>
      )}

      {plan.action === 'buy' && plan.position_size_shares > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-surface/60 p-3 rounded-xl border border-border/30">
            <p className="text-[10px] text-muted font-bold uppercase">
              {positionMode === 'holding' ? 'จำนวนเพิ่ม' : 'จำนวนหุ้น'}
            </p>
            <p className="text-lg font-bold text-foreground mt-1">{plan.position_size_shares.toLocaleString()} หุ้น</p>
            <p className="text-[10px] text-muted">~{plan.position_size_amount?.toLocaleString()} {currency}</p>
          </div>
          <div className="bg-surface/60 p-3 rounded-xl border border-border/30">
            <p className="text-[10px] text-muted font-bold uppercase">สัดส่วนพอร์ต</p>
            <p className="text-lg font-bold text-foreground mt-1">{plan.portfolio_allocation_pct}%</p>
            <p className="text-[10px] text-muted">ATR {plan.atr?.toFixed(2) ?? '-'}</p>
          </div>
        </div>
      )}

      {dcaSplits.length > 0 && (
        <div className="mb-4">
          <h4 className="text-[10px] font-bold text-muted uppercase mb-2 flex items-center gap-1">
            <Layers size={12} /> {dcaTitle}
          </h4>
          <div className="space-y-2">
            {dcaSplits.map((s) => (
              <div key={s.tranche} className="flex items-center justify-between bg-surface/60 p-3 rounded-xl border border-border/30 text-xs">
                <div className="min-w-0 pr-2">
                  {plan.action === 'buy' && (
                    <>
                      <span className="font-bold text-foreground">งวด {s.tranche}</span>
                      <span className="text-muted ml-2">({s.pct}%)</span>
                    </>
                  )}
                  <p className={`text-muted leading-snug ${plan.action === 'buy' ? 'mt-0.5' : ''}`}>{s.note}</p>
                </div>
                {plan.action === 'buy' && s.shares > 0 && (
                  <div className="text-right shrink-0">
                    <p className="font-mono font-bold text-foreground">{s.shares} หุ้น @ {s.price_target?.toFixed(2)}</p>
                    <p className="text-muted">{s.amount?.toLocaleString()} {currency}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 pt-3 border-t border-border/40">
        <NoteList title="มูลค่า & พื้นฐาน" items={plan.fundamental_notes} color="success" />
        <NoteList title="เทคนิค & เทรนด์" items={plan.technical_notes} color="primary" />
        <NoteList title="ความเสี่ยง & การจัดการ" items={plan.risk_notes} color="warning" />
        {!plan.fundamental_notes?.length && plan.reasons?.length > 0 && (
          <NoteList title="เหตุผลประกอบ" items={plan.reasons} />
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, suffix, icon, danger }) {
  return (
    <div className="bg-surface/60 p-3 rounded-xl border border-border/50">
      <p className="text-[10px] text-muted font-bold uppercase flex items-center gap-1">
        {icon} {label}
      </p>
      <p className={`text-sm font-mono font-bold mt-1 ${danger ? 'text-danger' : 'text-foreground'}`}>
        {value || '-'} {suffix && <span className="text-[10px] text-muted">{suffix}</span>}
      </p>
    </div>
  );
}
