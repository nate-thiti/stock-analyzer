import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Briefcase, PieChart, Target } from 'lucide-react';
import Modal from './Modal';
import { riskToleranceLabel } from '../context/RiskProfileContext';

function FieldHint({ children }) {
  return (
    <p className="text-[10px] text-muted/90 leading-relaxed mt-1.5">{children}</p>
  );
}

function ExampleBox({ children }) {
  return (
    <p className="text-[10px] text-foreground/70 bg-surface/60 border border-border/30 rounded-lg px-2.5 py-1.5 mt-1.5 leading-relaxed">
      ตัวอย่าง: {children}
    </p>
  );
}

export default function RiskProfileModal({
  open,
  onClose,
  onSave,
  initialProfile,
  required = false,
  title = 'ตั้งค่าโปรไฟล์ความเสี่ยง',
}) {
  const [maxLoss, setMaxLoss] = useState(25);
  const [maxPosition, setMaxPosition] = useState(10);
  const [riskPerTrade, setRiskPerTrade] = useState(2);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const portfolioValue = initialProfile?.portfolio_value ?? 0;
  const riskAmountExample = portfolioValue > 0
    ? Math.round(portfolioValue * (riskPerTrade / 100))
    : Math.round(100_000 * (riskPerTrade / 100));

  useEffect(() => {
    if (!open) return;
    setMaxLoss(initialProfile?.max_loss_tolerance_pct ?? 25);
    setMaxPosition(initialProfile?.max_position_pct ?? 10);
    setRiskPerTrade(initialProfile?.risk_per_trade_pct ?? 2);
    setError(null);
  }, [open, initialProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        max_loss_tolerance_pct: Number(maxLoss),
        max_position_pct: Number(maxPosition),
        risk_per_trade_pct: Number(riskPerTrade),
      });
      onClose?.();
    } catch (err) {
      setError(err.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClose = required ? undefined : onClose;

  return (
    <Modal
      open={open}
      onClose={handleOverlayClose ?? (() => {})}
      title={title}
      titleId="risk-profile-modal-title"
      dismissible={!required}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="text-[11px] text-muted leading-relaxed space-y-1">
          <p>
            ตั้งค่านี้ครั้งเดียว ระบบจะใช้ปรับคำแนะนำในหน้าวิเคราะห์ให้ตรงกับความทนขาดทุนของคุณ
          </p>
          <p className="text-warning/90">
            ไม่ใช่คำสั่งให้ถือจนขาดทุนถึงระดับที่ตั้ง — เป็นแค่ขีดจำกัดส่วนตัวเพื่อเตือนและช่วยตัดสินใจ
          </p>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 space-y-1">
          <p className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
            <Briefcase size={11} />
            มูลค่าพอร์ตที่ใช้คำนวณ
          </p>
          {initialProfile?.portfolio_from_positions ? (
            <>
              <p className="text-[11px] text-foreground/90">
                ดึงจากหุ้นที่คุณบันทึกในหน้า <strong>พอร์ต</strong> โดยอัตโนมัติ
                {portfolioValue > 0 && (
                  <> — ตอนนี้ประมาณ <strong>{portfolioValue.toLocaleString()}</strong></>
                )}
              </p>
              <FieldHint>
                เพิ่มหรือแก้หุ้นในหน้าพอร์ต ค่านี้จะอัปเดตเอง ไม่ต้องพิมพ์เงินทุนเอง
              </FieldHint>
            </>
          ) : (
            <>
              <p className="text-[11px] text-foreground/90">
                ยังไม่มีหุ้นในพอร์ต — ระบบใช้ค่าเริ่มต้นชั่วคราวในการคำนวณขนาดสถานะ
              </p>
              <FieldHint>
                ไปที่หน้า <strong>พอร์ต</strong> แล้วบันทึกหุ้นที่ถืออยู่ จะได้คำแนะนำที่ตรงพอร์ตจริงมากขึ้น
              </FieldHint>
            </>
          )}
        </div>

        {error && (
          <div className="bg-danger/5 border border-danger/25 rounded-xl p-3 flex items-center gap-2 text-xs text-danger">
            <AlertTriangle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] font-bold text-muted uppercase flex items-center gap-1">
              <Shield size={11} className="text-primary" />
              ขาดทุนสูงสุดที่ยอมรับได้ต่อหุ้น
            </label>
            <span className="text-sm font-black text-primary">{maxLoss}%</span>
          </div>
          <FieldHint>
            ถ้าหุ้นที่ถืออยู่ <strong>ขาดทุนจากต้นทุน</strong> เกิน % นี้ ระบบจะเน้นเตือนให้ลดความเสี่ยง
            แทนการแนะนำซื้อเพิ่ม
          </FieldHint>
          <input
            type="range"
            min={5}
            max={80}
            step={1}
            value={maxLoss}
            onChange={(e) => setMaxLoss(Number(e.target.value))}
            className="w-full accent-primary mt-2"
          />
          <p className="text-[10px] text-muted mt-1">
            ระดับ: <strong>{riskToleranceLabel(maxLoss)}</strong>
            {' '}• 5–15% อนุรักษนิยม • 15–25% ปานกลาง • 25–40% สูง • &gt;40% สูงมาก
          </p>
          <ExampleBox>
            ซื้อที่ 100 บาท ตั้ง {maxLoss}% = ถ้าราคาเหลือ {Math.round(100 * (1 - maxLoss / 100))} บาท
            {' '}(ลง {maxLoss}%) ถือว่าใกล้ขีดจำกัดส่วนตัว
          </ExampleBox>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] font-bold text-muted uppercase flex items-center gap-1">
              <PieChart size={11} className="text-primary" />
              สัดส่วนสูงสุดต่อหุ้น
            </label>
            <span className="text-sm font-bold text-foreground">{maxPosition}%</span>
          </div>
          <FieldHint>
            จำกัดว่าหุ้น <strong>หนึ่งตัว</strong> ควรกินพอร์ตไม่เกินกี่ % — กันพอร์ตล้วนตัวเดียว
            แม้สัญญาณซื้อดี ระบบจะบอก &quot;ถือต่อ ไม่ควรเพิ่ม&quot; ถ้าใกล้เพดาน
          </FieldHint>
          <input
            type="range"
            min={5}
            max={50}
            step={1}
            value={maxPosition}
            onChange={(e) => setMaxPosition(Number(e.target.value))}
            className="w-full accent-primary mt-2"
          />
          <ExampleBox>
            พอร์ต 100,000 ตั้ง {maxPosition}% = หุ้นตัวเดียวไม่ควรเกิน {(100_000 * maxPosition / 100).toLocaleString()} มูลค่า
          </ExampleBox>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] font-bold text-muted uppercase flex items-center gap-1">
              <Target size={11} className="text-primary" />
              เสี่ยงต่อเทรด (% ของพอร์ต)
            </label>
            <span className="text-sm font-bold text-foreground">{riskPerTrade}%</span>
          </div>
          <FieldHint>
            ใช้คำนวณ <strong>จำนวนหุ้นที่แนะนำ</strong> ในแผน DCA — ถ้าราคาไปถึง stop loss
            คุณจะเสียไม่เกิน % นี้ของพอร์ตในการเทรดครั้งนั้น
          </FieldHint>
          <input
            type="range"
            min={0.5}
            max={10}
            step={0.5}
            value={riskPerTrade}
            onChange={(e) => setRiskPerTrade(Number(e.target.value))}
            className="w-full accent-primary mt-2"
          />
          <ExampleBox>
            พอร์ต {portfolioValue > 0 ? portfolioValue.toLocaleString() : '100,000'} × {riskPerTrade}%
            {' '}= เสียได้ไม่เกิน ~{riskAmountExample.toLocaleString()} ต่อครั้งเมื่อโดน stop
          </ExampleBox>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 bg-gradient-primary border border-primary rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์ความเสี่ยง'}
        </button>

        {!required && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs text-muted hover:text-foreground"
          >
            ภายหลัง
          </button>
        )}
      </form>
    </Modal>
  );
}
