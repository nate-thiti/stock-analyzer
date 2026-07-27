import {
  calendarDateInTimezone,
  formatCalendarDateYmd,
  formatHistoryDate,
  isDailyChartInterval,
  isMidnightMarketTime,
} from './utils/dateFormat.js';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export { formatCalendarDateYmd, calendarDateInTimezone, formatHistoryDate, isDailyChartInterval };

export const DEFAULT_ACCOUNT_SIZE = 100_000;
export const DEFAULT_RISK_PCT = 2;

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.isAuthError = true;
  }
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (res.status === 401) {
    throw new AuthError('กรุณาเข้าสู่ระบบ');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail;
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg).join(', ')
      : (detail || `HTTP ${res.status}`);
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (email, password) =>
    fetchJSON('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (username, email, password) =>
    fetchJSON('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) }),
  logout: () => fetchJSON('/auth/logout', { method: 'POST' }),
  me: () => fetchJSON('/auth/me'),

  getRiskProfile: () => fetchJSON('/me/risk-profile'),
  updateRiskProfile: (data) =>
    fetchJSON('/me/risk-profile', { method: 'PATCH', body: JSON.stringify(data) }),

  listUsers: () => fetchJSON('/users'),
  createUser: (data) => fetchJSON('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => fetchJSON(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => fetchJSON(`/users/${id}`, { method: 'DELETE' }),

  listFavorites: () => fetchJSON('/favorites'),
  addFavorite: (symbol) => fetchJSON('/favorites', { method: 'POST', body: JSON.stringify({ symbol }) }),
  removeFavorite: (symbol) => fetchJSON(`/favorites/${encodeURIComponent(symbol)}`, { method: 'DELETE' }),

  listPositions: () => fetchJSON('/positions'),
  createPosition: (data) => fetchJSON('/positions', { method: 'POST', body: JSON.stringify(data) }),
  updatePosition: (id, data) => fetchJSON(`/positions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePosition: (id) => fetchJSON(`/positions/${id}`, { method: 'DELETE' }),

  listPriceAlerts: () => fetchJSON('/price-alerts'),
  createPriceAlert: (data) => fetchJSON('/price-alerts', { method: 'POST', body: JSON.stringify(data) }),
  deletePriceAlert: (id) => fetchJSON(`/price-alerts/${id}`, { method: 'DELETE' }),

  getWatchlist: () => fetchJSON('/watchlist'),
  setWatchlist: (symbols) => fetchJSON('/watchlist', { method: 'PUT', body: JSON.stringify({ symbols }) }),

  quote: (symbol) => fetchJSON(`/stock/quote?symbol=${encodeURIComponent(symbol)}`),
  info: (symbol) => fetchJSON(`/stock/info?symbol=${encodeURIComponent(symbol)}`),
  history: (symbol, period, interval) =>
    fetchJSON(`/stock/history?symbol=${encodeURIComponent(symbol)}&period=${period}&interval=${interval}`),
  search: (q) => fetchJSON(`/stock/search?q=${encodeURIComponent(q)}`),
  analysis: (symbol, period, interval, accountSize = DEFAULT_ACCOUNT_SIZE, riskPct = DEFAULT_RISK_PCT) =>
    fetchJSON(
      `/analysis/full?symbol=${encodeURIComponent(symbol)}&period=${period}&interval=${interval}` +
      `&account_size=${accountSize}&risk_pct=${riskPct}`
    ),
  compare: (symbols, period, interval, accountSize = DEFAULT_ACCOUNT_SIZE, riskPct = DEFAULT_RISK_PCT) =>
    fetchJSON(
      `/analysis/compare?symbols=${encodeURIComponent(symbols)}&period=${period}&interval=${interval}` +
      `&account_size=${accountSize}&risk_pct=${riskPct}`
    ),
  quarterlyFundamentals: (symbol) =>
    fetchJSON(`/stock/fundamentals/quarterly?symbol=${encodeURIComponent(symbol)}`),
  peHistory: (symbol, period = '2y') =>
    fetchJSON(`/stock/fundamentals/pe-history?symbol=${encodeURIComponent(symbol)}&period=${period}`),
  marketSignals: (refresh = false, scope = 'global') => {
    const params = new URLSearchParams();
    if (refresh) params.set('refresh', 'true');
    if (scope === 'personal') params.set('scope', 'personal');
    const qs = params.toString();
    return fetchJSON(`/analysis/market-signals${qs ? `?${qs}` : ''}`);
  },
};

export { AuthError };

export const POPULAR_STOCKS = [
  { symbol: 'AAPL', name: 'Apple', market: 'US' },
  { symbol: 'MSFT', name: 'Microsoft', market: 'US' },
  { symbol: 'NVDA', name: 'NVIDIA', market: 'US' },
  { symbol: 'TSLA', name: 'Tesla', market: 'US' },
  { symbol: 'PTT.BK', name: 'PTT', market: 'TH' },
  { symbol: 'CPALL.BK', name: 'CP ALL', market: 'TH' },
  { symbol: '0700.HK', name: 'Tencent', market: 'HK' },
  { symbol: 'BABA', name: 'Alibaba', market: 'CN' },
  { symbol: 'GOOGL', name: 'Alphabet', market: 'US' },
  { symbol: 'AMZN', name: 'Amazon', market: 'US' },
];

export const COMPARE_PRESET_GROUPS = [
  {
    title: 'เทคโนโลยี',
    presets: [
      { label: 'Big Tech', symbols: ['AAPL', 'MSFT', 'GOOGL'] },
      { label: 'Chips', symbols: ['NVDA', 'AMD', 'INTC'] },
      { label: 'Cloud & AI', symbols: ['AMZN', 'META', 'CRM'] },
      { label: 'China Tech', symbols: ['BABA', 'JD', 'PDD'] },
    ],
  },
  {
    title: 'พลังงาน & โครงสร้างพื้นฐาน',
    presets: [
      { label: 'พลังงาน', symbols: ['XOM', 'CVX', 'COP'] },
      { label: 'พลังงานไทย', symbols: ['PTT.BK', 'PTTEP.BK', 'TOP.BK'] },
      { label: 'สาธารณูปโภ', symbols: ['NEE', 'DUK', 'SO'] },
      { label: 'โทรคม', symbols: ['VZ', 'T', 'TMUS'] },
    ],
  },
  {
    title: 'ผู้บริโภค',
    presets: [
      { label: 'สินค้าฟุ่มเฟือย', symbols: ['LVMUY', 'EL', 'TPR'] },
      { label: 'สินค้าอุปโภค', symbols: ['PG', 'KO', 'PEP'] },
      { label: 'ค้าปลีก', symbols: ['WMT', 'COST', 'TGT'] },
      { label: 'ร้านอาหาร', symbols: ['MCD', 'SBUX', 'YUM'] },
    ],
  },
  {
    title: 'การเงิน & สุขภาพ',
    presets: [
      { label: 'ธนาคาร', symbols: ['JPM', 'BAC', 'GS'] },
      { label: 'ธนาคารไทย', symbols: ['KBANK.BK', 'SCB.BK', 'BBL.BK'] },
      { label: 'สุขภาพ', symbols: ['JNJ', 'UNH', 'LLY'] },
      { label: 'ยา & Biotech', symbols: ['PFE', 'MRK', 'ABBV'] },
    ],
  },
  {
    title: 'อุตสาหกรรม & อื่นๆ',
    presets: [
      { label: 'รถยนต์ & EV', symbols: ['TSLA', 'TM', 'F'] },
      { label: 'อุตสาหกรรม', symbols: ['CAT', 'DE', 'HON'] },
      { label: 'วัสดุ & เหมือง', symbols: ['FCX', 'NEM', 'BHP'] },
      { label: 'อสังหา REIT', symbols: ['PLD', 'AMT', 'O'] },
    ],
  },
  {
    title: 'ตลาดเอเชีย',
    presets: [
      { label: 'SET ยอดนิยม', symbols: ['PTT.BK', 'CPALL.BK', 'AOT.BK'] },
      { label: 'SET ค้าปลีก', symbols: ['CPALL.BK', 'HMPRO.BK', 'CRC.BK'] },
      { label: 'Hong Kong', symbols: ['0700.HK', '9988.HK', '3690.HK'] },
    ],
  },
];

export const COMPARE_PRESETS = COMPARE_PRESET_GROUPS.flatMap((g) => g.presets);

export function formatMarketCap(num) {
  if (!num) return '-';
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  return num.toLocaleString();
}

export function formatPct(val, decimals = 1) {
  if (val == null) return '-';
  const pct = Math.abs(val) < 1 ? val * 100 : val;
  return pct.toFixed(decimals) + '%';
}

export function inferCurrency(symbol, currency) {
  if (currency) return currency;
  const s = symbol?.toUpperCase() ?? '';
  if (s.endsWith('.BK')) return 'THB';
  if (s.endsWith('.HK')) return 'HKD';
  return 'USD';
}

export function formatNumber(num, { decimals, compact = false } = {}) {
  if (num == null || Number.isNaN(Number(num))) return null;
  const n = Number(num);
  if (compact) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const d = decimals ?? 2;
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function formatMoney(num, currency, options = {}) {
  const formatted = formatNumber(num, options);
  if (formatted == null) return '-';
  return currency ? `${formatted} ${currency}` : formatted;
}

export function formatSignedMoney(num, currency, options = {}) {
  if (num == null || Number.isNaN(Number(num))) return '-';
  const n = Number(num);
  const formatted = formatNumber(n, options);
  const signed = `${n >= 0 ? '+' : ''}${formatted}`;
  return currency ? `${signed} ${currency}` : signed;
}

export function formatSignedPct(num, decimals = 2) {
  if (num == null || Number.isNaN(Number(num))) return '-';
  const n = Number(num);
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

export function formatPnl(amount, pct, currency, { pctDecimals = 1 } = {}) {
  if (amount == null) return '-';
  const money = formatSignedMoney(amount, currency, { compact: true });
  if (pct == null) return money;
  return `${money} (${formatSignedPct(pct, pctDecimals)})`;
}

export const EXTENDED_HOURS_LABEL = 'ก่อนตลาดเปิด';
export const POST_MARKET_LABEL = 'ก่อนตลาดปิด';

const MARKET_STATE_LABELS = {
  REGULAR: 'ตลาดเปิด',
  CLOSED: 'ตลาดปิด',
  PRE: EXTENDED_HOURS_LABEL,
  POST: POST_MARKET_LABEL,
  PREPRE: 'ตลาดปิด',
  POSTPOST: 'ตลาดปิด',
};

export function getMarketStateLabel(marketState) {
  return MARKET_STATE_LABELS[marketState] || marketState || null;
}

export function isMarketRegular(marketState) {
  return marketState === 'REGULAR';
}

export function formatMarketTime(iso, timezone, marketState) {
  if (!iso) return { time: '-', state: null, dateLabel: null, timeOnly: null };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { time: iso, state: marketState, dateLabel: null, timeOnly: null };
  }

  const cal = calendarDateInTimezone(iso, timezone);
  const time = date.toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone || undefined,
  });
  const timeOnlyRaw = date.toLocaleString('th-TH', {
    timeStyle: 'short',
    timeZone: timezone || undefined,
  });
  const timeOnly = isMidnightMarketTime(iso, timezone) ? null : timeOnlyRaw;

  return {
    time,
    timeOnly,
    dateLabel: cal ? formatCalendarDateYmd(cal) : null,
    state: MARKET_STATE_LABELS[marketState] || marketState || null,
  };
}

export function formatFetchedAt(iso, timezone) {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('th-TH', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: timezone || undefined,
  });
}

export const GRADE_LABELS = {
  undervalued: { label: 'ถูก', color: 'text-success' },
  fair: { label: 'เหมาะสม', color: 'text-primary' },
  neutral: { label: 'กลางๆ', color: 'text-warning' },
  overvalued: { label: 'แพง', color: 'text-danger' },
};

export const ACTION_STYLES = {
  buy: { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success' },
  sell: { bg: 'bg-danger/10', border: 'border-danger/30', text: 'text-danger' },
  hold: { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning' },
};
