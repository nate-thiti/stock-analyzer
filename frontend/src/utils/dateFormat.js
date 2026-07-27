export function formatCalendarDateYmd(ymd) {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '-';
  const [y, m, d] = ymd.split('-').map(Number);
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d, 12, 0, 0)));
}

/** YYYY-MM-DD in a specific IANA timezone (for aligning quote vs chart). */
export function calendarDateInTimezone(iso, timezone) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  if (!timezone) return iso.slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  }).format(date);
}

export function formatHistoryDate(rawTime, timezone) {
  if (!rawTime) return '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawTime)) {
    return formatCalendarDateYmd(rawTime);
  }
  const date = new Date(rawTime);
  if (Number.isNaN(date.getTime())) return rawTime;
  return date.toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone || undefined,
  });
}

export function isDailyChartInterval(interval) {
  return interval === '1d' || interval === '1wk';
}

export function buildMarketTimeDisplay(iso, timezone) {
  if (!iso) return { dateLabel: null, timeOnly: null };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { dateLabel: null, timeOnly: null };
  }
  const cal = calendarDateInTimezone(iso, timezone);
  const timeOnly = date.toLocaleString('th-TH', {
    timeStyle: 'short',
    timeZone: timezone || undefined,
  });
  const hideTime = timeOnly.startsWith('00:00');
  return {
    dateLabel: cal ? formatCalendarDateYmd(cal) : null,
    timeOnly: hideTime ? null : timeOnly,
  };
}

export function isMidnightMarketTime(iso, timezone) {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const timeOnly = date.toLocaleString('th-TH', {
    timeStyle: 'short',
    timeZone: timezone || undefined,
  });
  return timeOnly.startsWith('00:00');
}
