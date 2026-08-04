import { useCallback, useMemo, useState } from 'react';
import { api } from '../api';
import { HOME_POLL_MS, useQuotePoll } from './useQuotePoll';

export function useBatchQuotes(symbols, { enabled = true, intervalMs = HOME_POLL_MS } = {}) {
  const symbolKey = useMemo(
    () => [...new Set((symbols || []).map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))].join(','),
    [symbols],
  );
  const [quotes, setQuotes] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(Boolean(symbolKey));

  const load = useCallback(async () => {
    if (!symbolKey) return;
    setLoading(true);
    try {
      const result = await api.quotes(symbolKey.split(','));
      setQuotes((current) => ({ ...current, ...(result.quotes || {}) }));
      setErrors(result.errors || {});
      if (Object.keys(result.quotes || {}).length === 0 && Object.keys(result.errors || {}).length > 0) {
        throw new Error('โหลดราคาหุ้นจาก Yahoo Finance ไม่สำเร็จ');
      }
    } finally {
      setLoading(false);
    }
  }, [symbolKey]);

  useQuotePoll(load, { enabled: enabled && !!symbolKey, intervalMs });
  return { quotes, errors, loading, reload: load };
}
