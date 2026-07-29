import { useCallback, useMemo, useState } from 'react';
import { api } from '../api';
import { HOME_POLL_MS, useQuotePoll } from './useQuotePoll';

export function useBatchQuotes(symbols, { enabled = true, intervalMs = HOME_POLL_MS } = {}) {
  const symbolKey = useMemo(
    () => [...new Set((symbols || []).map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))].join(','),
    [symbols],
  );
  const [quotes, setQuotes] = useState({});

  const load = useCallback(async () => {
    if (!symbolKey) return;
    const result = await api.quotes(symbolKey.split(','));
    setQuotes((current) => ({ ...current, ...(result.quotes || {}) }));
  }, [symbolKey]);

  useQuotePoll(load, { enabled: enabled && !!symbolKey, intervalMs });
  return { quotes, reload: load };
}
