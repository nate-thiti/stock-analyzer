const STORAGE_KEY = 'stock-analyzer-recent';
const MAX_RECENT = 10;

export function getRecentStocks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentStock(symbol) {
  if (!symbol) return;
  const sym = symbol.trim().toUpperCase();
  const prev = getRecentStocks().filter((s) => s !== sym);
  const next = [sym, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function removeRecentStock(symbol) {
  if (!symbol) return;
  const sym = symbol.trim().toUpperCase();
  const next = getRecentStocks().filter((s) => s !== sym);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('recent-stocks-updated'));
}
