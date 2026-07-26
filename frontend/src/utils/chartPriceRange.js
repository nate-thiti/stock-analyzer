const PERIOD_LABELS = {
  '1mo': '1 เดือน',
  '3mo': '3 เดือน',
  '6mo': '6 เดือน',
  '1y': '1 ปี',
  '5y': '5 ปี',
};

const INTERVAL_LABELS = {
  '1d': 'รายวัน',
  '1wk': 'รายสัปดาห์',
  '1h': '1 ชม.',
  '15m': '15 นาที',
};

export function computeHistoryPriceRange(history) {
  if (!history?.length) return null;

  let low = Infinity;
  let high = -Infinity;

  for (const bar of history) {
    if (bar.low != null) low = Math.min(low, bar.low);
    if (bar.high != null) high = Math.max(high, bar.high);
  }

  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
  return { low, high };
}

export function formatChartRangeLabel(period, interval) {
  const p = PERIOD_LABELS[period] ?? period;
  const i = INTERVAL_LABELS[interval] ?? interval;
  return `${p} • ${i}`;
}
