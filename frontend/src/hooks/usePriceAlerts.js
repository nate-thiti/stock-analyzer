import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useQuotePoll } from './useQuotePoll';

export function usePriceAlerts({ enabled = true, poll = true } = {}) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const list = await api.listPriceAlerts();
      setAlerts(list);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { load(); }, [load]);
  useQuotePoll(load, { enabled: enabled && poll });

  const triggered = alerts.filter((a) => a.triggered);
  const bySymbol = (symbol) => alerts.filter((a) => a.symbol === symbol.toUpperCase());
  const triggeredFor = (symbol) => bySymbol(symbol).some((a) => a.triggered);

  return { alerts, loading, load, triggered, bySymbol, triggeredFor };
}
