import { useEffect, useRef } from 'react';

const POLL_MS = 60_000;
const HOME_POLL_MS = 60_000;
const SIGNALS_POLL_MS = 60_000;
const ANALYSIS_POLL_MS = 60_000;

export function useQuotePoll(fetchQuote, { enabled = true, intervalMs = POLL_MS } = {}) {
  const fetchRef = useRef(fetchQuote);
  fetchRef.current = fetchQuote;

  useEffect(() => {
    if (!enabled) return;

    let timer;
    let backoffMs = intervalMs;

    const tick = async () => {
      if (document.hidden) return;
      try {
        await fetchRef.current();
        backoffMs = intervalMs;
      } catch {
        backoffMs = Math.min(backoffMs * 2, intervalMs * 8);
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

    tick();
    document.addEventListener('visibilitychange', onVisibility);
    schedule();

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, intervalMs]);
}

export { POLL_MS, HOME_POLL_MS, SIGNALS_POLL_MS, ANALYSIS_POLL_MS };
