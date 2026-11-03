import { useState, useEffect, useRef, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, History, TrendingUp, CornerDownLeft, Loader2 } from 'lucide-react';
import { api, POPULAR_STOCKS } from '../api';
import { getRecentStocks } from '../utils/recentStocks';

const DEBOUNCE_MS = 280;

/**
 * ช่องค้นหาหุ้นแบบ combobox — แนะนำผลขณะพิมพ์ + เลือกด้วยคีย์บอร์ด (↑ ↓ Enter Esc)
 * ช่องว่าง = แสดง "ดูล่าสุด" และ "ยอดนิยม" ให้กดได้ทันที
 */
export default function StockSearch({
  variant = 'hero',
  autoFocus = false,
  onNavigate,
  onEscape,
  className = '',
}) {
  const navigate = useNavigate();
  const listId = useId();
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(variant === 'palette');
  const [active, setActive] = useState(0);
  const isPalette = variant === 'palette';

  const q = query.trim();

  useEffect(() => {
    if (!q) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      api.search(q)
        .then((res) => { if (!cancelled) setResults(Array.isArray(res) ? res : []); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, DEBOUNCE_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [q]);

  // ปิด dropdown เมื่อคลิกนอกช่อง (palette ปิดผ่าน overlay ของตัวเอง)
  useEffect(() => {
    if (isPalette) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [isPalette]);

  const suggestions = q ? buildQueryItems(results) : buildIdleItems();

  useEffect(() => { setActive(0); }, [q, results.length]);

  const go = (symbol) => {
    if (!symbol) return;
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
    navigate(`/stock/${encodeURIComponent(symbol.toUpperCase())}`);
    onNavigate?.(symbol);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = suggestions[active];
      if (item) go(item.symbol);
      else if (q) go(q);
    } else if (e.key === 'Escape') {
      if (query) setQuery('');
      else {
        setOpen(false);
        onEscape?.();
      }
    }
  };

  const showList = open && suggestions.length > 0;
  const activeId = showList ? `${listId}-opt-${active}` : undefined;

  const inputClass = isPalette
    ? 'w-full bg-transparent pl-12 pr-12 py-4 text-base text-foreground placeholder-muted focus:outline-none'
    : 'relative w-full bg-surface border border-border rounded-2xl pl-12 pr-12 py-3.5 text-sm text-foreground placeholder-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative group">
        {!isPalette && (
          <div className="absolute -inset-0.5 bg-gradient-primary rounded-2xl opacity-20 group-focus-within:opacity-60 blur transition-opacity duration-300" />
        )}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          aria-label="ค้นหาหุ้น"
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          placeholder="ค้นหาชื่อหรือสัญลักษณ์ เช่น AAPL, PTT.BK, Tencent"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={inputClass}
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={18} />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          {loading ? <Loader2 size={18} className="animate-spin text-primary" /> : q ? <CornerDownLeft size={16} /> : null}
        </span>
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="ผลการค้นหาหุ้น"
          className={isPalette
            ? 'max-h-[min(60vh,420px)] overflow-y-auto border-t border-border/50 py-2'
            : 'absolute left-0 right-0 top-full mt-2 z-30 max-h-[min(60vh,420px)] overflow-y-auto rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl shadow-2xl py-2 text-left animate-fadeIn'}
        >
          {suggestions.map((item, i) => (
            <SuggestionRow
              key={`${item.group}-${item.symbol}`}
              id={`${listId}-opt-${i}`}
              item={item}
              active={i === active}
              showGroup={i === 0 || suggestions[i - 1].group !== item.group}
              onHover={() => setActive(i)}
              onPick={() => go(item.symbol)}
            />
          ))}
        </ul>
      )}

      {open && q && !loading && results.length === 0 && (
        <p className={`px-4 py-3 text-xs text-muted ${isPalette ? 'border-t border-border/50' : ''}`}>
          ไม่พบรายชื่อที่ตรง — กด Enter เพื่อเปิด <span className="font-mono font-bold text-foreground">{q.toUpperCase()}</span> โดยตรง
        </p>
      )}
    </div>
  );
}

const GROUP_LABELS = {
  recent: 'ดูล่าสุด',
  popular: 'ยอดนิยม',
  results: 'ผลการค้นหา',
};

function buildIdleItems() {
  const recent = getRecentStocks().slice(0, 5).map((symbol) => ({ symbol, group: 'recent' }));
  const recentSet = new Set(recent.map((r) => r.symbol));
  const popular = POPULAR_STOCKS
    .filter((s) => !recentSet.has(s.symbol))
    .slice(0, 6)
    .map((s) => ({ symbol: s.symbol, name: s.name, exchange: s.market, group: 'popular' }));
  return [...recent, ...popular];
}

function buildQueryItems(results) {
  return results.map((r) => ({
    symbol: r.symbol,
    name: r.name,
    exchange: r.exchange,
    type: r.type,
    group: 'results',
  }));
}

function SuggestionRow({ id, item, active, showGroup, onHover, onPick }) {
  const Icon = item.group === 'recent' ? History : item.group === 'popular' ? TrendingUp : Search;
  return (
    <>
      {showGroup && (
        <li role="presentation" className="px-4 pt-2 pb-1 text-xs font-bold text-muted uppercase tracking-wider">
          {GROUP_LABELS[item.group]}
        </li>
      )}
      <li
        id={id}
        role="option"
        aria-selected={active}
        onPointerEnter={onHover}
        onPointerDown={(e) => { e.preventDefault(); onPick(); }}
        className={`mx-2 flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer transition-colors ${
          active ? 'bg-primary/12 text-foreground' : 'text-foreground/90'
        }`}
      >
        <Icon size={15} className={`shrink-0 ${active ? 'text-primary' : 'text-muted'}`} />
        <span className="font-mono font-bold text-sm shrink-0">{item.symbol}</span>
        {item.name && <span className="text-xs text-muted truncate min-w-0 flex-1">{item.name}</span>}
        {!item.name && <span className="flex-1" />}
        {item.exchange && (
          <span className="text-xs font-mono text-muted bg-surface px-1.5 py-0.5 rounded border border-border shrink-0">
            {item.exchange}
          </span>
        )}
      </li>
    </>
  );
}
