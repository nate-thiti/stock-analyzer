let audioCtx = null;
let prevTriggeredIds = null;
let lastPlayedAt = 0;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audioCtx ??= new Ctx();
  return audioCtx;
}

/** Short two-tone chime — no external asset */
export async function playAlertSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => {});
  }

  const t = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

  [880, 1174.66].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    const start = t + i * 0.12;
    osc.start(start);
    osc.stop(start + 0.28);
  });
}

/**
 * Play once when new alert IDs become triggered (skip initial page load).
 */
export function handleTriggeredAlerts(alerts) {
  if (typeof window === 'undefined') return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;

  const triggeredIds = new Set(
    alerts.filter((a) => a.triggered).map((a) => a.id),
  );

  if (prevTriggeredIds === null) {
    prevTriggeredIds = triggeredIds;
    return;
  }

  const hasNew = [...triggeredIds].some((id) => !prevTriggeredIds.has(id));
  prevTriggeredIds = triggeredIds;

  if (!hasNew || document.hidden) return;

  const now = Date.now();
  if (now - lastPlayedAt < 3000) return;
  lastPlayedAt = now;

  playAlertSound().catch(() => {});
}

if (typeof window !== 'undefined') {
  const unlock = () => {
    getAudioContext()?.resume().catch(() => {});
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}
