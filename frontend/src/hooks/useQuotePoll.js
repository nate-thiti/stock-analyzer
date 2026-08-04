import { useEffect, useRef } from 'react';

const FIVE_MINUTES_MS = 5 * 60_000;
const POLL_MS = FIVE_MINUTES_MS;
const HOME_POLL_MS = FIVE_MINUTES_MS;
const SIGNALS_POLL_MS = FIVE_MINUTES_MS;
const ANALYSIS_POLL_MS = FIVE_MINUTES_MS;

export function useQuotePoll(fetchQuote, { enabled = true, intervalMs = POLL_MS, immediate = true } = {}) {
  const fetchRef = useRef(fetchQuote);
  const inFlightRef = useRef(false);
  fetchRef.current = fetchQuote;

  useEffect(() => {
    if (!enabled) return;

    let timer;
    let cancelled = false;
    let backoffMs = intervalMs;
    let consecutiveFailures = 0;

    const tick = async () => {
      if (document.hidden || inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await fetchRef.current();
        consecutiveFailures = 0;
        backoffMs = intervalMs;
      } catch {
        consecutiveFailures += 1;
        backoffMs = Math.min(30_000 * (2 ** (consecutiveFailures - 1)), intervalMs * 2);
      } finally {
        inFlightRef.current = false;
      }
    };

    const schedule = () => {
      if (cancelled) return;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await tick();
        schedule();
      }, backoffMs);
    };

    const onVisibility = () => {
      if (!document.hidden) {
        tick();
      }
    };

    const start = async () => {
      if (immediate) await tick();
      schedule();
    };

    document.addEventListener('visibilitychange', onVisibility);
    start();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, intervalMs, immediate]);
}

export { POLL_MS, HOME_POLL_MS, SIGNALS_POLL_MS, ANALYSIS_POLL_MS };
