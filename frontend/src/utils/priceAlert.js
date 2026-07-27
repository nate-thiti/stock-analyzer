/** @typedef {'above' | 'below'} AlertDirection */

export const QUICK_SET_OFFSETS = [-10, -5, 5, 10];

export function roundAlertPrice(price) {
  if (price >= 100) return Math.round(price * 100) / 100;
  if (price >= 1) return Math.round(price * 100) / 100;
  return Math.round(price * 10000) / 10000;
}

/** Target price from current price + offset % */
export function targetFromOffset(currentPrice, offsetPct) {
  if (!currentPrice || currentPrice <= 0) return null;
  return roundAlertPrice(currentPrice * (1 + offsetPct / 100));
}

/**
 * Distance from current price to trigger threshold.
 * Uses current price as base: "how much % must price move from here?"
 */
export function computeDistanceToTrigger(currentPrice, targetPrice, direction) {
  if (currentPrice == null || !targetPrice || targetPrice <= 0 || currentPrice <= 0) {
    return null;
  }

  if (direction === 'above') {
    if (currentPrice >= targetPrice) {
      return { pct: 0, atTarget: true, move: 'up', label: 'ถึงเป้าแล้ว' };
    }
    const pct = ((targetPrice - currentPrice) / currentPrice) * 100;
    return {
      pct,
      atTarget: false,
      move: 'up',
      label: `อีก ${pct.toFixed(1)}% ถึงเป้า`,
    };
  }

  if (currentPrice <= targetPrice) {
    return { pct: 0, atTarget: true, move: 'down', label: 'ถึงเป้าแล้ว' };
  }
  const pct = ((currentPrice - targetPrice) / currentPrice) * 100;
  return {
    pct,
    atTarget: false,
    move: 'down',
    label: `อีก ${pct.toFixed(1)}% ถึงเป้า`,
  };
}

/** Tailwind text color by proximity to target */
export function distanceColorClass(pct, atTarget = false) {
  if (atTarget) return 'text-warning';
  if (pct <= 2) return 'text-warning';
  if (pct <= 8) return 'text-primary';
  return 'text-muted';
}

/** Whether a quick-set offset matches the alert direction */
export function isSuggestedOffset(offsetPct, direction) {
  if (direction === 'above') return offsetPct > 0;
  if (direction === 'below') return offsetPct < 0;
  return true;
}
