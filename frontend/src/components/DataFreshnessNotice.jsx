import { Clock3, Database, Layers3 } from 'lucide-react';

export default function DataFreshnessNotice({ className = '' }) {
  return (
    <aside
      className={`rounded-2xl border border-primary/20 bg-primary/[0.04] px-4 py-3 ${className}`}
      aria-label="แหล่งข้อมูลและรอบการอัปเดต"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Database size={15} className="shrink-0 text-primary" />
            แหล่งข้อมูลและรอบอัปเดต
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            ราคาจาก Yahoo Finance อาจล่าช้าและไม่ใช่ข้อมูลเรียลไทม์
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] sm:text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-surface/60 px-2.5 py-1.5 text-muted">
            <Layers3 size={13} className="text-primary" />
            ราคาแบบ Batch <strong className="text-foreground">ทุก 5 นาที</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-surface/60 px-2.5 py-1.5 text-muted">
            <Clock3 size={13} className="text-primary" />
            บริษัทและงบ <strong className="text-foreground">วันละครั้ง</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-surface/60 px-2.5 py-1.5 text-muted">
            Cache ในแท็บนี้ <strong className="text-foreground">เปิดซ้ำโหลดทันที</strong>
          </span>
        </div>
      </div>
    </aside>
  );
}
