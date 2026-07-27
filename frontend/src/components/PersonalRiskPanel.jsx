import { AlertTriangle } from 'lucide-react';
import { formatMoney } from '../api';
import { RISK_USAGE_BAND_LABELS } from '../context/RiskProfileContext';

export default function PersonalRiskPanel({ personalized, currency }) {
  if (!personalized) return null;

  const bandLabel = RISK_USAGE_BAND_LABELS[personalized.risk_usage_band];

  return (
    <div className="mb-4 p-4 rounded-xl border border-primary/25 bg-primary/5 space-y-3">
      <h4 className="text-xs font-bold text-primary uppercase">ความเสี่ยงส่วนบุคคล</h4>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <Stat label="ยอมรับขาดทุนสูงสุด" value={`${personalized.max_loss_tolerance_pct}%`} />
        <Stat
          label="ขาดทุนปัจจุบัน"
          value={personalized.has_position && personalized.current_loss_pct != null
            ? `${personalized.current_loss_pct}%`
            : '-'}
        />
        <Stat
          label="ใช้ขีดจำกัดไป"
          value={personalized.risk_usage_pct != null ? `${personalized.risk_usage_pct}%` : '-'}
          hint={bandLabel}
        />
        {personalized.personal_risk_floor != null && (
          <Stat label="เส้นขอบเขตส่วนบุคคล" value={formatMoney(personalized.personal_risk_floor, currency)} />
        )}
        {personalized.technical_stop != null && (
          <Stat label="Technical Stop" value={formatMoney(personalized.technical_stop, currency)} />
        )}
        {personalized.effective_stop != null && personalized.has_position && (
          <Stat label="Stop ที่ระบบใช้" value={formatMoney(personalized.effective_stop, currency)} />
        )}
        {personalized.position_pct != null && (
          <Stat
            label="สัดส่วนในพอร์ต"
            value={`${personalized.position_pct}%`}
            hint={`เพดาน ${personalized.max_position_pct}%`}
          />
        )}
      </div>

      {personalized.technical_stop_breached && (
        <p className="text-xs text-danger flex items-center gap-1">
          <AlertTriangle size={11} />
          ราคาต่ำกว่า Technical Stop — พิจารณาลดความเสี่ยง
        </p>
      )}

      {personalized.notes?.length > 0 && (
        <ul className="text-xs text-muted space-y-1 border-t border-border/30 pt-2">
          {personalized.notes.map((note, i) => (
            <li key={i} className="leading-relaxed">• {note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="bg-surface/50 p-2 rounded-lg border border-border/30">
      <p className="text-muted uppercase text-xs">{label}</p>
      <p className="font-mono font-bold text-foreground mt-0.5">{value}</p>
      {hint && <p className="text-xs text-warning/90 mt-0.5">{hint}</p>}
    </div>
  );
}
