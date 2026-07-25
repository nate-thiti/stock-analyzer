function fmtBillions(n) {
  if (n == null) return '-';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return n.toLocaleString();
}

export default function QuarterlyFundamentalsChart({ quarters, large = false }) {
  if (!quarters?.length) {
    return (
      <div className={`flex items-center justify-center text-xs text-muted ${large ? 'h-[300px]' : 'h-48'}`}>
        ไม่มีข้อมูลรายไตรมาส
      </div>
    );
  }

  const maxRev = Math.max(...quarters.map((q) => q.revenue || 0), 1);
  const maxEps = Math.max(...quarters.map((q) => Math.abs(q.eps || 0)), 0.01);
  const chartH = large ? 260 : 160;
  const containerH = large ? 300 : 180;
  const barW = Math.min(large ? 52 : 36, (large ? 480 : 280) / quarters.length - 6);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2 px-1 border-b border-border/40" style={{ height: containerH }}>
        {quarters.map((q) => {
          const revH = ((q.revenue || 0) / maxRev) * chartH;
          const epsH = (Math.abs(q.eps || 0) / maxEps) * (chartH * 0.55);
          const epsNeg = (q.eps || 0) < 0;
          return (
            <div key={q.fiscal_date} className="flex-1 flex flex-col items-center justify-end min-w-0">
              <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: chartH }}>
                <div
                  className="rounded-t-md bg-primary/70 hover:bg-primary transition-colors"
                  style={{ width: barW * 0.45, height: Math.max(revH, 2) }}
                  title={`Revenue ${fmtBillions(q.revenue)}`}
                />
                <div
                  className={`rounded-t-md ${epsNeg ? 'bg-danger/70' : 'bg-success/70'}`}
                  style={{ width: barW * 0.35, height: Math.max(epsH, 2) }}
                  title={`EPS ${q.eps?.toFixed(2) ?? '-'}`}
                />
              </div>
              <p className={`text-muted mt-1 truncate w-full text-center ${large ? 'text-[10px]' : 'text-[8px]'}`}>{q.fiscal_date?.slice(0, 7)}</p>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 text-[10px] text-muted justify-center">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary/70" /> Revenue</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-success/70" /> EPS</span>
      </div>
    </div>
  );
}
