import { useEffect, useRef } from 'react';

const POLL_MS = 60_000;
const HOME_POLL_MS = 60_000;
const SIGNALS_POLL_MS = 60_000;
const ANALYSIS_POLL_MS = 60_000;

export function useQuotePoll(fetchQuote, { enabled = true, intervalMs = POLL_MS, immediate = true } = {}) {
  const fetchRef = useRef(fetchQuote);
  const inFlightRef = useRef(false);
  fetchRef.current = fetchQuote;

  useEffect(() => {
    if (!enabled) return;

    let timer;
    let backoffMs = intervalMs;

    const tick = async () => {
      if (document.hidden || inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        await fetchRef.current();
        backoffMs = intervalMs;
      } catch {
        backoffMs = Math.min(backoffMs * 2, intervalMs * 8);
      } finally {
        inFlightRef.current = false;
      }
    };

    const schedule = () => {
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

    if (immediate) tick();
    document.addEventListener('visibilitychange', onVisibility);
    schedule();

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, intervalMs, immediate]);
}

export { POLL_MS, HOME_POLL_MS, SIGNALS_POLL_MS, ANALYSIS_POLL_MS };
