import { Clock3, Database, Layers3, ChevronDown } from 'lucide-react';

/**
 * แถบแจ้งแหล่งข้อมูลแบบย่อ — บรรทัดเดียว กดเพื่อดูรอบอัปเดตแต่ละประเภท
 * (เดิมเป็นกล่องใหญ่ซ้ำทุกหน้า ดันเนื้อหาหลักลงไป)
 */
export default function DataFreshnessNotice({ className = '' }) {
  return (
    <details
      className={`group rounded-xl border border-border/50 bg-surface/40 px-3 py-2 text-xs text-muted ${className}`}
      aria-label="แหล่งข้อมูลและรอบการอัปเดต"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 select-none [&::-webkit-details-marker]:hidden">
        <Database size={14} className="shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate">
          ราคาจาก Yahoo Finance อาจล่าช้า ไม่ใช่เรียลไทม์ · อัปเดตทุก 5 นาที
        </span>
        <span className="hidden sm:inline shrink-0 text-primary/90 group-open:hidden">รายละเอียด</span>
        <ChevronDown size={14} className="shrink-0 transition-transform group-open:rotate-180" />
      </summary>

      <div className="mt-2 flex flex-wrap gap-2 border-t border-border/40 pt-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-surface/60 px-2.5 py-1.5">
          <Layers3 size={13} className="text-primary" />
          ราคาแบบ Batch <strong className="text-foreground">ทุก 5 นาที</strong>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-surface/60 px-2.5 py-1.5">
          <Clock3 size={13} className="text-primary" />
          บริษัทและงบ <strong className="text-foreground">วันละครั้ง</strong>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-surface/60 px-2.5 py-1.5">
          Cache ในแท็บนี้ <strong className="text-foreground">เปิดซ้ำโหลดทันที</strong>
        </span>
      </div>
    </details>
  );
}
