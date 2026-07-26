import {
  Search, Star, Bell, Home, Briefcase, GitCompare, Menu, Sun,
  ArrowUpRight, TrendingUp, Activity, TrendingDown, BellRing, Plus,
} from 'lucide-react';

/** กรอบ mock UI — จำลองหน้าจอแอป */
export function MockFrame({ title, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-border/60 bg-surface/40 overflow-hidden shadow-lg ${className}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-surface/60">
        <span className="w-2 h-2 rounded-full bg-danger/70" />
        <span className="w-2 h-2 rounded-full bg-warning/70" />
        <span className="w-2 h-2 rounded-full bg-success/70" />
        {title && <span className="ml-2 text-[10px] text-muted font-mono truncate">{title}</span>}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

export function MockHeader() {
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface/80 border border-border/50 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold truncate">Stock Analyzer</p>
          <p className="text-[8px] text-muted">Global Markets</p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="p-1.5 rounded-lg bg-warning/10 text-warning relative">
          <BellRing size={12} />
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-warning text-[7px] font-bold flex items-center justify-center text-background">1</span>
        </span>
        <Sun size={12} className="text-muted p-1" />
        <Menu size={14} className="text-muted p-1" />
      </div>
    </div>
  );
}

export function MockNavPills() {
  const items = [
    { icon: Home, label: 'หน้าแรก', active: true },
    { icon: Briefcase, label: 'พอร์ต' },
    { icon: Star, label: 'ติดดาว' },
    { icon: Bell, label: 'แจ้งเตือน' },
    { icon: GitCompare, label: 'เปรียบเทียบ' },
  ];
  return (
    <div className="flex flex-wrap gap-1 mb-3">
      {items.map(({ icon: Icon, label, active }) => (
        <span
          key={label}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium ${
            active ? 'bg-primary/15 text-primary border border-primary/30' : 'text-muted border border-transparent'
          }`}
        >
          <Icon size={10} /> {label}
        </span>
      ))}
    </div>
  );
}

export function MockSearchBar() {
  return (
    <div className="relative mb-3">
      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <div className="w-full pl-8 pr-3 py-2 rounded-xl bg-surface border border-border text-[10px] text-muted">
        ค้นหาหุ้น เช่น AAPL, PTT.BK...
      </div>
    </div>
  );
}

export function MockStockCard({ symbol = 'MSFT', name = 'Microsoft', price = '381.7', pct = '+0.03' }) {
  return (
    <div className="rounded-xl p-3 bg-card/60 border border-border/50 min-w-[120px]">
      <p className="text-[9px] font-mono text-muted">US</p>
      <p className="text-xs font-bold truncate">{name}</p>
      <p className="text-[9px] font-mono text-muted">{symbol}</p>
      <div className="flex items-end justify-between mt-2">
        <p className="text-sm font-mono font-bold">{price}</p>
        <Star size={12} className="text-warning fill-warning" />
      </div>
      <span className="text-[9px] text-success flex items-center gap-0.5">
        <ArrowUpRight size={10} /> {pct}%
      </span>
    </div>
  );
}

export function MockRecentChip() {
  return (
    <div className="shrink-0 rounded-xl px-3 py-2 bg-card/60 border border-border/50 min-w-[100px] relative">
      <p className="font-mono font-bold text-xs">NVDA</p>
      <p className="text-base font-black">892.1</p>
      <span className="text-[9px] text-success flex items-center"><ArrowUpRight size={10} /> 1.2%</span>
      <span className="absolute top-1 right-1 text-muted text-[10px]">×</span>
    </div>
  );
}

export function MockSignalSection() {
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <span className="px-2 py-1 rounded-lg bg-primary/15 text-primary text-[9px] border border-primary/25">Watchlist ทั่วไป</span>
        <span className="px-2 py-1 rounded-lg text-muted text-[9px]">รายการโปรด</span>
      </div>
      <p className="text-[9px] font-bold text-success flex items-center gap-1">
        <TrendingUp size={10} /> ควรซื้อเป็นอย่างยิ่ง (2)
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-2 border border-success/25 bg-success/5">
          <span className="text-[8px] px-1 py-0.5 rounded bg-success/10 text-success">ซื้อ 78%</span>
          <p className="text-xs font-bold mt-1">NVDA</p>
          <p className="text-sm font-mono font-bold">892</p>
        </div>
        <div className="rounded-xl p-2 border border-warning/25 bg-warning/5">
          <span className="text-[8px] px-1 py-0.5 rounded bg-warning/10 text-warning">ถือ 55%</span>
          <p className="text-xs font-bold mt-1">AAPL</p>
          <p className="text-sm font-mono font-bold">189</p>
        </div>
      </div>
    </div>
  );
}

export function MockStockHeader() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-lg font-black">MSFT</span>
        <Star size={14} className="text-warning fill-warning" />
        <Bell size={14} className="text-muted" />
      </div>
      <p className="text-[10px] text-muted">Microsoft Corporation</p>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-black">381.7</span>
        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-success/10 text-success border border-success/20 flex items-center gap-0.5">
          <ArrowUpRight size={10} /> +0.03%
        </span>
      </div>
    </div>
  );
}

export function MockChart() {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-2 space-y-2">
      <div className="flex flex-wrap gap-1">
        {['เทรนด์: Uptrend', 'EMA 9', 'RSI', 'MACD'].map((l) => (
          <span key={l} className="text-[8px] px-1.5 py-0.5 rounded bg-surface border border-border/40 text-muted">{l}</span>
        ))}
      </div>
      <div className="h-24 sm:h-32 rounded-lg bg-gradient-to-t from-primary/5 to-transparent border border-border/30 relative overflow-hidden">
        <svg viewBox="0 0 200 80" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <polyline fill="none" stroke="#10b981" strokeWidth="1.5" points="0,60 40,55 80,45 120,50 160,30 200,25" />
          <polyline fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.7" points="0,65 50,58 100,52 150,48 200,40" />
        </svg>
      </div>
      <div className="h-8 rounded bg-surface/50 border border-border/30 flex items-end px-1 gap-px">
        {[40, 55, 35, 60, 45, 50, 38].map((h, i) => (
          <div key={i} className="flex-1 bg-primary/40 rounded-t" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function MockTradingPlan() {
  return (
    <div className="rounded-xl border border-success/30 bg-success/5 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-success">ซื้อ (Buy)</span>
        <span className="text-[9px] text-muted">Score +0.72</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[9px]">
        <div className="bg-surface/60 rounded-lg p-2">
          <p className="text-muted">Stop Loss</p>
          <p className="font-mono font-bold">365.20</p>
        </div>
        <div className="bg-surface/60 rounded-lg p-2">
          <p className="text-muted">Target</p>
          <p className="font-mono font-bold">410.00</p>
        </div>
        <div className="bg-surface/60 rounded-lg p-2">
          <p className="text-muted">จำนวนหุ้น</p>
          <p className="font-mono font-bold">52</p>
        </div>
        <div className="bg-surface/60 rounded-lg p-2">
          <p className="text-muted">R:R</p>
          <p className="font-mono font-bold">1:2.4</p>
        </div>
      </div>
      <div className="flex gap-1">
        <span className="flex-1 text-center py-1 rounded-lg bg-primary/15 text-primary text-[9px] border border-primary/25">ถืออยู่แล้ว</span>
        <span className="flex-1 text-center py-1 rounded-lg text-muted text-[9px]">ยังไม่ได้ซื้อ</span>
      </div>
    </div>
  );
}

export function MockPortfolioForm() {
  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-3 space-y-2">
      <p className="text-[10px] font-bold text-muted uppercase flex items-center gap-1">
        <Plus size={10} /> เพิ่มหุ้นในพอร์ต
      </p>
      <div className="grid grid-cols-3 gap-2">
        {['AAPL', '10', '175.5'].map((v, i) => (
          <div key={i} className="bg-surface rounded-lg px-2 py-1.5 text-[10px] border border-border/40">
            <p className="text-[8px] text-muted">{['Symbol', 'จำนวน', 'ทุนเฉลี่ย'][i]}</p>
            <p className="font-mono font-bold">{v}</p>
          </div>
        ))}
      </div>
      <div className="h-16 rounded-lg bg-surface/50 border border-border/30 flex items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary" />
        <div className="space-y-1">
          <div className="h-2 w-16 rounded bg-primary/30" />
          <div className="h-2 w-12 rounded bg-accent/30" />
          <div className="h-2 w-20 rounded bg-success/30" />
        </div>
      </div>
    </div>
  );
}

export function MockFavoriteCard() {
  return (
    <div className="rounded-xl p-3 bg-card/60 border border-border/50 relative">
      <div className="absolute top-2 right-2 flex gap-1">
        <Bell size={12} className="text-muted" />
        <Star size={12} className="text-warning fill-warning" />
      </div>
      <p className="font-mono font-black text-sm">MSFT</p>
      <p className="text-[9px] text-muted truncate">Microsoft Corporation</p>
      <p className="text-xl font-black mt-2">381.7</p>
      <span className="text-[10px] text-success flex items-center gap-0.5">
        <ArrowUpRight size={10} /> 0.03%
      </span>
    </div>
  );
}

export function MockAlertModal() {
  return (
    <div className="rounded-xl border border-primary/30 bg-card p-3 space-y-2 shadow-xl max-w-[220px] mx-auto">
      <p className="text-xs font-bold flex items-center gap-1">
        <Bell size={12} className="text-primary" /> แจ้งเตือนราคา MSFT
      </p>
      <p className="text-[9px] text-muted">ราคาปัจจุบัน: <span className="font-mono font-bold text-foreground">381.7</span></p>
      <div className="bg-surface rounded-lg px-2 py-1.5 text-[10px] border border-border/40">ราคา ≥ เป้า (ขึ้นถึง)</div>
      <div className="bg-surface rounded-lg px-2 py-1.5 text-[10px] font-mono border border-border/40">400.00</div>
      <div className="py-1.5 rounded-lg bg-gradient-to-r from-primary to-accent text-center text-[10px] font-medium text-white">ตั้ง Alert</div>
    </div>
  );
}

export function MockAlertsPage() {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1">
        {[
          { l: 'ทั้งหมด', v: '3' },
          { l: 'เฝ้า', v: '2' },
          { l: 'ถึงเป้า', v: '1', warn: true },
        ].map(({ l, v, warn }) => (
          <div key={l} className={`rounded-lg p-2 text-center border ${warn ? 'border-warning/30 bg-warning/5' : 'border-border/40 bg-surface/40'}`}>
            <p className="text-[8px] text-muted">{l}</p>
            <p className={`text-sm font-black ${warn ? 'text-warning' : ''}`}>{v}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg p-2 border border-warning/30 bg-warning/5 flex items-center gap-2">
        <BellRing size={12} className="text-warning shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] font-bold">MSFT ≥ 400</p>
          <p className="text-[8px] text-warning">ถึงแล้ว!</p>
        </div>
      </div>
    </div>
  );
}

export function MockCompare() {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {['AAPL', 'MSFT', 'GOOGL'].map((s) => (
          <span key={s} className="px-2 py-1 rounded-lg bg-primary/10 border border-primary/30 text-[10px] font-mono font-bold">{s} ×</span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {['Big Tech', 'Chips', 'SET ยอดนิยม'].map((p, i) => (
          <span key={p} className={`px-2 py-0.5 rounded text-[8px] ${i === 0 ? 'bg-primary/15 text-primary border border-primary/25' : 'bg-surface text-muted border border-border/40'}`}>{p}</span>
        ))}
      </div>
      <div className="rounded-lg p-2 bg-success/5 border border-success/25 text-center">
        <p className="text-[8px] text-muted">Best Pick</p>
        <p className="text-sm font-black text-success">NVDA</p>
      </div>
    </div>
  );
}

export function MockLogin() {
  return (
    <div className="max-w-[200px] mx-auto rounded-xl border border-border/50 bg-card/60 p-4 space-y-2">
      <p className="text-xs font-bold text-center">เข้าสู่ระบบ</p>
      <div className="bg-surface rounded-lg px-2 py-1.5 text-[9px] text-muted border border-border/40">you@example.com</div>
      <div className="bg-surface rounded-lg px-2 py-1.5 text-[9px] text-muted border border-border/40">••••••••</div>
      <div className="py-1.5 rounded-lg bg-gradient-to-r from-primary to-accent text-center text-[10px] text-white">เข้าสู่ระบบ</div>
      <p className="text-[8px] text-center text-muted">ยังไม่มีบัญชี? <span className="text-primary">สมัครสมาชิก</span></p>
    </div>
  );
}

export function StepList({ items }) {
  return (
    <ol className="space-y-2 text-sm text-muted list-none counter-reset-none">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center border border-primary/25">
            {i + 1}
          </span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

export function TipBox({ children, variant = 'info' }) {
  const styles = {
    info: 'border-primary/30 bg-primary/5 text-foreground',
    warn: 'border-warning/30 bg-warning/5 text-foreground',
  };
  return (
    <div className={`rounded-xl px-4 py-3 text-sm border ${styles[variant]}`}>
      {children}
    </div>
  );
}
