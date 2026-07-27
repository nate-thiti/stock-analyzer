import { Link } from 'react-router-dom';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { COMPARE_PRESET_GROUPS } from '../api';

export default function QuickCompareSection() {
  return (
    <section className="glass-card rounded-2xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <TrendingUp size={16} className="text-primary icon-animate" />
            เปรียบเทียบด่วน
          </h3>
          <p className="text-xs text-muted mt-1">เลือกหมวดเพื่อเปรียบเทียบมูลค่าและคำแนะนำ (2–5 หุ้น)</p>
        </div>
        <Link
          to="/compare"
          className="hidden sm:flex items-center gap-1 text-sm text-primary hover:underline shrink-0 mt-1"
        >
          เปรียบเทียบเอง <ArrowRight size={12} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {COMPARE_PRESET_GROUPS.map((group) => (
          <div
            key={group.title}
            className="rounded-xl border border-border/50 bg-surface/30 p-3 hover:border-primary/20 transition-colors"
          >
            <p className="text-xs font-bold text-muted uppercase tracking-wide mb-2.5 pb-2 border-b border-border/30">
              {group.title}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {group.presets.map(({ label, symbols }) => (
                <Link
                  key={label}
                  to={`/compare?symbols=${symbols.join(',')}`}
                  className="group/item flex flex-col px-2.5 py-2 rounded-lg bg-background/60 border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all min-h-[52px] justify-center"
                  title={symbols.join(', ')}
                >
                  <span className="text-sm font-semibold text-foreground group-hover/item:text-primary leading-tight">
                    {label}
                  </span>
                  <span className="text-xs font-mono text-muted/80 truncate mt-0.5">
                    {symbols.join(' · ')}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Link
        to="/compare"
        className="sm:hidden flex items-center justify-center gap-1 mt-4 py-2 text-xs text-primary border border-primary/30 rounded-xl hover:bg-primary/5"
      >
        เปรียบเทียบเอง <ArrowRight size={12} />
      </Link>
    </section>
  );
}
