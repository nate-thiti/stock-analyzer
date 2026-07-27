import { TrendingUp, TrendingDown, Activity, Shield, Target, Wallet, Layers, Calendar, AlertCircle, Package, ShoppingCart } from 'lucide-react';
import { ACTION_STYLES, formatMoney, formatPnl } from '../api';
import PersonalRiskPanel from './PersonalRiskPanel';

const POSITION_GUIDANCE = {
  holding: {
    buy: {
      label: 'ถือต่อ / สะสมเพิ่ม',
      hint: 'สัญญาณรวมเป็นบวก — ถือต่อได้ตามแผน หรือเพิ่มทีละน้อยตาม DCA ด้านล่าง อย่าลงครั้งเดียวเกินสัดส่วนที่คำนวณ',
      style: 'buy',
    },
    sell: {
      label: 'พิจารณาขาย',
      hint: 'สัญญาณกดดัน — ควร take profit บางส่วนหรือลดสัดส่วนเมื่อราคาใกล้แนวต้าน ตั้ง stop loss ให้ล็อกกำไร',
      style: 'sell',
    },
    hold: {
      label: 'ถือต่อ',
      hint: 'สัญญาณยังไม่ชัด — ถือต่อได้ แต่ยังไม่จำเป็นต้องเพิ่ม รอ breakout หรือ pullback ใกล้แนวรับก่อน',
      style: 'hold',
    },
  },
  new: {
    buy: {
      label: 'ซื้อได้',
      hint: 'สัญญาณบวก — เหมาะเริ่มเข้าตามแผน DCA แบ่ง 3 งวด ไม่ all-in ครั้งเดียว และตั้ง stop loss ตามแผน',
      style: 'buy',
    },
    sell: {
      label: 'อย่าเข้า / รอ',
      hint: 'สัญญาณลบ — ยังไม่เหมาะเปิดสถานะใหม่ รอจน score ดีขึ้นหรือราคาปรับตัวใกล้แนวรับ',
      style: 'hold',
    },
    hold: {
      label: 'รอดูก่อน',
      hint: 'ยังไม่ชัดเจน — รอราคาใกล้แนวรับหรือ breakout ยืนยันก่อนเข้า อย่ารีบตามราคา',
      style: 'hold',
    },
  },
};

const PERSONALIZED_STYLE_MAP = {
  CONSIDER_ADDING: 'buy',
  CONSIDER_BUY_NEW: 'buy',
  HOLD: 'hold',
  HOLD_DO_NOT_ADD: 'hold',
  HOLD_WITH_TIGHT_RISK_CONTROL: 'hold',
  CONSIDER_REDUCING: 'sell',
  REDUCE_OR_SELL: 'sell',
  REDUCE_RISK: 'sell',
  WAIT: 'hold',
  AVOID_NEW: 'hold',
};

const SELL_PERSONALIZED_ACTIONS = new Set(['REDUCE_OR_SELL', 'CONSIDER_REDUCING', 'REDUCE_RISK']);
const BUY_PERSONALIZED_ACTIONS = new Set(['CONSIDER_ADDING', 'CONSIDER_BUY_NEW']);

function effectivePlanAction(plan, personalizedRisk) {
  if (!personalizedRisk?.has_position) return plan.action;
  if (SELL_PERSONALIZED_ACTIONS.has(personalizedRisk.action)) return 'sell';
  if (BUY_PERSONALIZED_ACTIONS.has(personalizedRisk.action)) return 'buy';
  return 'hold';
}

function patchDetailedAnalysis(detailed, personalizedRisk) {
  if (!detailed || !personalizedRisk?.has_position) return detailed;
  const label = personalizedRisk.action_label;
  const note = personalizedRisk.summary;
  return detailed.replace(
    /【แผนปฏิบัติ】[^\n]*/,
    `【แผนปฏิบัติ】${note} — คำแนะนำหลัก「${label}」(ปรับตามความเสี่ยงส่วนบุคคลและสถานะพอร์ตจริง)`,
  );
}

function getPersonalizedDca(plan, positionMode, personalizedRisk) {
  if (!personalizedRisk?.has_position) {
    return getContextualDca(plan, positionMode);
  }

  const effective = effectivePlanAction(plan, personalizedRisk);
  const virtualPlan = { ...plan, action: effective };

  if (SELL_PERSONALIZED_ACTIONS.has(personalizedRisk.action)) {
    return [{
      tranche: 1,
      pct: 100,
      price_target: plan.entry_price,
      shares: 0,
      amount: 0,
      note: personalizedRisk.action === 'REDUCE_OR_SELL'
        ? 'ลดสัดส่วนหรือขาย — เกินขีดจำกัดความเสี่ยงส่วนบุคคลหรือสัดส่วนในพอร์ต ปกป้องพอร์ตก่อนรอสัญญาณกลับตัว'
        : 'พิจารณาลดบางส่วน — สัญญาณวิเคราะห์และสถานะพอร์ตไม่สนับสนุนการถือเต็มที่',
    }];
  }

  if (personalizedRisk.action === 'HOLD_DO_NOT_ADD' || personalizedRisk.action === 'HOLD_WITH_TIGHT_RISK_CONTROL') {
    return [{
      tranche: 1,
      pct: 100,
      price_target: plan.entry_price,
      shares: 0,
      amount: 0,
      note: personalizedRisk.summary,
    }];
  }

  return getContextualDca(virtualPlan, positionMode);
}

function getPersonalizedRiskNotes(riskNotes, personalizedRisk, plan) {
  if (!personalizedRisk?.has_position || !riskNotes?.length) return riskNotes;

  const conf = ((plan.confidence ?? 0) * 100).toFixed(0);
  const notes = [...riskNotes];
  notes[0] = `หลักการจัดการความเสี่ยง (ความมั่นใจ ${conf}%): ${personalizedRisk.summary}`;

  if (SELL_PERSONALIZED_ACTIONS.has(personalizedRisk.action)) {
    const portfolioNotes = [
      `สถานะปัจจุบัน: ขาดทุน ${personalizedRisk.current_loss_pct ?? '-'}% · ใช้ขีดจำกัดไป ${personalizedRisk.risk_usage_pct ?? '-'}%`,
    ];
    if (
      personalizedRisk.position_pct != null
      && personalizedRisk.position_pct >= personalizedRisk.max_position_pct
    ) {
      portfolioNotes.push(
        `สัดส่วนในพอร์ต ~${personalizedRisk.position_pct}% เกินเพดาน ${personalizedRisk.max_position_pct}% — ควรลดให้อยู่ในระดับที่ตั้งไว้`,
      );
    }
    if (personalizedRisk.effective_stop != null) {
      portfolioNotes.push(
        `Stop ที่ระบบใช้ ${personalizedRisk.effective_stop.toLocaleString()} — ถ้าราคาหลุดจุดนี้ให้ออกตามแผน`,
      );
    }

    return notes
      .filter((n) => !n.startsWith('ขนาดสถานะ:') && !n.startsWith('เมื่อราคาไปถึงเป้าหมาย'))
      .concat(portfolioNotes);
  }

  if (personalizedRisk.action === 'HOLD_DO_NOT_ADD' || personalizedRisk.action === 'HOLD_WITH_TIGHT_RISK_CONTROL') {
    return notes.filter((n) => !n.startsWith('ขนาดสถานะ:'));
  }

  return notes;
}

function buildPortfolioAlignedSummary(plan, personalizedRisk, currency) {
  if (!personalizedRisk?.has_position) return plan.summary;
  const label = personalizedRisk.action_label;
  const price = plan.entry_price?.toFixed(2);
  const stop = personalizedRisk.effective_stop ?? plan.stop_loss;
  const stopText = stop != null ? `${stop.toFixed(2)} ${currency}` : '-';
  return `สรุป (ตามพอร์ต): ${label} — ${personalizedRisk.summary} ราคาปัจจุบัน ${price} ${currency} · Stop ที่ใช้ ${stopText}`;
}

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
  const introBg = color === 'success' ? 'bg-success/5 border-success/20' : color === 'warning' ? 'bg-warning/5 border-warning/20' : 'bg-primary/5 border-primary/20';
  return (
    <div>
      <h4 className="text-xs font-bold text-muted uppercase mb-2">{title}</h4>
      <ul className="space-y-2">
        {items.map((r, i) => (
          <li
            key={i}
            className={`text-sm text-foreground/85 flex items-start gap-2 leading-relaxed ${
              i === 0 ? `p-2.5 rounded-lg border ${introBg} font-medium` : ''
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dot} mt-1.5 shrink-0`} />
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function TradingPlanPanel({ plan, currency, embedded = false, position = null, personalizedRisk = null }) {
  const positionMode = position ? 'holding' : 'new';

  if (!plan) return null;

  const guidance = POSITION_GUIDANCE[positionMode][plan.action] || POSITION_GUIDANCE[positionMode].hold;
  const planDate = formatPlanDate(plan.plan_date);
  const effectiveAction = effectivePlanAction(plan, personalizedRisk);
  const dcaTitle = positionMode === 'holding' && effectiveAction === 'buy'
    ? 'แผนแบ่งซื้อเพิ่ม (DCA)'
    : effectiveAction === 'buy'
      ? 'แผนแบ่งซื้อ (DCA)'
      : 'แนวทางปฏิบัติ';
  const dcaSplits = getPersonalizedDca(plan, positionMode, personalizedRisk);
  const displaySummary = buildPortfolioAlignedSummary(plan, personalizedRisk, currency);
  const displayDetailedAnalysis = patchDetailedAnalysis(plan.detailed_analysis, personalizedRisk);
  const displayRiskNotes = getPersonalizedRiskNotes(plan.risk_notes, personalizedRisk, plan);

  const displayLabel = personalizedRisk?.action_label ?? guidance.label;
  const displayStyleKey = personalizedRisk
    ? (PERSONALIZED_STYLE_MAP[personalizedRisk.action] || 'hold')
    : guidance.style;
  const displayStyle = ACTION_STYLES[displayStyleKey] || ACTION_STYLES.hold;

  const wrapperClass = embedded
    ? `rounded-xl p-4 bg-surface/50 border h-full max-h-[85vh] overflow-y-auto ${displayStyle.border}`
    : `glass-card rounded-2xl p-6 animate-fadeIn max-h-[85vh] overflow-y-auto ${displayStyle.border}`;

  return (
    <div className={wrapperClass}>
      <div className="mb-4 pb-3 border-b border-border/40">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Wallet size={16} className="text-primary" />
          {personalizedRisk ? 'แผนการลงทุนที่ปรับตามความเสี่ยงของคุณ' : 'แผนการลงทุนวันนี้'}
        </h3>
        <p className="text-sm text-muted mt-1 flex items-center gap-1.5">
          <Calendar size={11} className="text-primary shrink-0" />
          {planDate}
        </p>
        <p className="text-xs text-muted/80 mt-0.5 italic">
          (คาดการณ์จากข้อมูลย้อนหลัง)
        </p>
      </div>

      <div className="mb-4">
        {position ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <Package size={13} />
            ถืออยู่
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg border border-border/50 bg-surface/60 text-muted">
            <ShoppingCart size={13} />
            ยังไม่ได้ถือ
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <span className={`text-3xl font-black ${displayStyle.text}`}>
            {displayLabel}
          </span>
          <p className="text-xs text-muted mt-1">
            ความมั่นใจ {(plan.confidence * 100).toFixed(0)}% • Score {plan.score?.toFixed(2)}
            {personalizedRisk && (
              <span className="text-primary/80"> • ปรับตามความเสี่ยง {personalizedRisk.max_loss_tolerance_pct}%</span>
            )}
          </p>
        </div>
        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${displayStyle.bg}`}>
          {displayStyleKey === 'buy' ? <TrendingUp size={24} className="text-success" /> :
           displayStyleKey === 'sell' ? <TrendingDown size={24} className="text-danger" /> :
           <Activity size={24} className="text-warning" />}
        </div>
      </div>

      <p className="text-sm text-foreground/75 bg-surface/40 px-3 py-2 rounded-lg border border-border/30 mb-4 leading-relaxed">
        {personalizedRisk?.summary ?? guidance.hint}
      </p>

      <PersonalRiskPanel personalized={personalizedRisk} currency={currency} />

      <p className="text-xs text-foreground/80 bg-surface/60 p-3 rounded-xl border border-border/30 mb-4 leading-relaxed">
        {displaySummary}
      </p>

      {position && (
        <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20 grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-xs text-muted uppercase">ถืออยู่จริง</p>
            <p className="font-mono font-bold text-foreground">{position.shares} หุ้น @ {formatMoney(position.avg_cost, currency)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted uppercase">P/L</p>
            <p className={`font-mono font-bold ${(position.unrealized_pnl ?? 0) >= 0 ? 'text-success' : 'text-danger'}`}>
              {position.unrealized_pnl != null
                ? formatPnl(position.unrealized_pnl, position.unrealized_pnl_pct, currency)
                : '-'}
            </p>
          </div>
        </div>
      )}

      {displayDetailedAnalysis && (
        <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <h4 className="text-xs font-bold text-primary uppercase mb-2 flex items-center gap-1">
            <AlertCircle size={11} /> บทวิเคราะห์โดยสรุป
          </h4>
          <div className="text-sm text-foreground/85 leading-relaxed space-y-3 whitespace-pre-line">
            {displayDetailedAnalysis.split('\n\n').map((para, i) => (
              <p key={i} className={i === 0 ? 'font-medium text-foreground/90' : ''}>{para}</p>
            ))}
          </div>
        </div>
      )}

      {(effectiveAction === 'buy' || plan.stop_loss) && (
        <div className={`grid gap-3 mb-4 ${embedded ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
          <Metric label="Entry" value={plan.entry_price?.toFixed(2)} suffix={currency} />
          <Metric label="Target" value={plan.target_price?.toFixed(2)} suffix={currency} icon={<Target size={10} />} />
          <Metric label="Stop Loss" value={plan.stop_loss?.toFixed(2)} suffix={`-${plan.stop_loss_pct}%`} icon={<Shield size={10} />} danger />
          <Metric label="R:R" value={plan.risk_reward_ratio ? `1:${plan.risk_reward_ratio}` : '-'} />
        </div>
      )}

      {effectiveAction === 'buy' && plan.position_size_shares > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-surface/60 p-3 rounded-xl border border-border/30">
            <p className="text-xs text-muted font-bold uppercase">
              {positionMode === 'holding' ? 'จำนวนเพิ่ม' : 'จำนวนหุ้น'}
            </p>
            <p className="text-lg font-bold text-foreground mt-1">{plan.position_size_shares.toLocaleString()} หุ้น</p>
            <p className="text-xs text-muted">~{plan.position_size_amount?.toLocaleString()} {currency}</p>
          </div>
          <div className="bg-surface/60 p-3 rounded-xl border border-border/30">
            <p className="text-xs text-muted font-bold uppercase">สัดส่วนพอร์ต</p>
            <p className="text-lg font-bold text-foreground mt-1">{plan.portfolio_allocation_pct}%</p>
            <p className="text-xs text-muted">ATR {plan.atr?.toFixed(2) ?? '-'}</p>
          </div>
        </div>
      )}

      {dcaSplits.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-bold text-muted uppercase mb-2 flex items-center gap-1">
            <Layers size={12} /> {dcaTitle}
          </h4>
          <div className="space-y-2">
            {dcaSplits.map((s) => (
              <div key={s.tranche} className="flex items-center justify-between bg-surface/60 p-3 rounded-xl border border-border/30 text-xs">
                <div className="min-w-0 pr-2">
                  {effectiveAction === 'buy' && (
                    <>
                      <span className="font-bold text-foreground">งวด {s.tranche}</span>
                      <span className="text-muted ml-2">({s.pct}%)</span>
                    </>
                  )}
                  <p className={`text-muted leading-snug ${effectiveAction === 'buy' ? 'mt-0.5' : ''}`}>{s.note}</p>
                </div>
                {effectiveAction === 'buy' && s.shares > 0 && (
                  <div className="text-right shrink-0">
                    <p className="font-mono font-bold text-foreground">{s.shares} หุ้น @ {formatMoney(s.price_target, currency)}</p>
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
        <NoteList title="ความเสี่ยง & การจัดการ" items={displayRiskNotes} color="warning" />
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
      <p className="text-xs text-muted font-bold uppercase flex items-center gap-1">
        {icon} {label}
      </p>
      <p className={`text-sm font-mono font-bold mt-1 ${danger ? 'text-danger' : 'text-foreground'}`}>
        {value || '-'} {suffix && <span className="text-xs text-muted">{suffix}</span>}
      </p>
    </div>
  );
}
