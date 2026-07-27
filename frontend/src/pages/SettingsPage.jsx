import { useState } from 'react';
import { Shield, Settings } from 'lucide-react';
import { useRiskProfile, riskToleranceLabel } from '../context/RiskProfileContext';
import RiskProfileModal from '../components/RiskProfileModal';
import { formatMoney } from '../api';

export default function SettingsPage() {
  const { profile, save, load } = useRiskProfile();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-2">
          <Settings size={20} className="text-primary" />
          ตั้งค่า
        </h1>
        <p className="text-sm text-muted mt-1">โปรไฟล์ความเสี่ยงและพารามิเตอร์พอร์ตส่วนตัว</p>
      </div>

      <div className="glass-card rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Shield size={16} className="text-primary" />
          โปรไฟล์ความเสี่ยง
        </h2>

        {profile?.configured ? (
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-surface/50 p-3 rounded-xl border border-border/40">
              <dt className="text-muted text-xs uppercase">ขาดทุนสูงสุด/หุ้น</dt>
              <dd className="font-bold text-lg mt-0.5">{profile.max_loss_tolerance_pct}%</dd>
              <dd className="text-xs text-muted">{riskToleranceLabel(profile.max_loss_tolerance_pct)}</dd>
            </div>
            <div className="bg-surface/50 p-3 rounded-xl border border-border/40">
              <dt className="text-muted text-xs uppercase">เพดานสัดส่วน/หุ้น</dt>
              <dd className="font-bold text-lg mt-0.5">{profile.max_position_pct}%</dd>
            </div>
            <div className="bg-surface/50 p-3 rounded-xl border border-border/40 col-span-2">
              <dt className="text-muted text-xs uppercase">มูลค่าพอร์ต (จากที่บันทึก)</dt>
              <dd className="font-bold mt-0.5">
                {profile.portfolio_from_positions
                  ? formatMoney(profile.portfolio_value, null, { compact: true })
                  : 'ยังไม่มีหุ้น — ใช้ค่าเริ่มต้น'}
              </dd>
              {profile.portfolio_from_positions && (
                <dd className="text-xs text-muted mt-0.5">
                  ใช้คำนวณขนาดสถานะและสัดส่วนอัตโนมัติ
                </dd>
              )}
            </div>
            <div className="bg-surface/50 p-3 rounded-xl border border-border/40">
              <dt className="text-muted text-xs uppercase">เสี่ยงต่อเทรด</dt>
              <dd className="font-bold mt-0.5">{profile.risk_per_trade_pct}%</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-warning">ยังไม่ได้ตั้งค่าความเสี่ยง — คำแนะนำส่วนบุคคลจะยังไม่แสดง</p>
        )}

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full py-2.5 rounded-xl border border-primary/40 bg-primary/10 text-sm font-medium text-primary hover:bg-primary/15"
        >
          {profile?.configured ? 'แก้ไขโปรไฟล์ความเสี่ยง' : 'ตั้งค่าโปรไฟล์ความเสี่ยง'}
        </button>
      </div>

      <RiskProfileModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialProfile={profile}
        onSave={async (data) => {
          await save(data);
          await load();
          setModalOpen(false);
        }}
      />
    </div>
  );
}
