// popups/motion.mjs - the popup MOTION LANGUAGE: one easing family and the phase maths of a card's life, pure functions of time (a card's look at time t depends on nothing else, so a
// screenshot, a test and the live page agree).  All durations come from the dials (popup.motion.*); reduced motion collapses every transition to a short opacity fade with no movement.
//
//   enter     decelerating (ease-out): the card arrives quickly and settles, rising a few pixels
//   exit      accelerating (ease-in), shorter than enter: leaving should not hold the viewer up
//   move      a card whose place was taken fades out where it was (it never glides across tiles) and fades in at its new place
//   leader    the line from card to subject draws itself from the card to the tile
//   pulse     a ring on the subject tile grows and fades once when the card appears

/** cubic-bezier easing as a function of progress (the CSS definition), solved with a few Newton steps */
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1; const bx = 3 * (x2 - x1) - cx; const ax = 1 - cx - bx; const cy = 3 * y1; const by = 3 * (y2 - y1) - cy; const ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t; const sy = (t) => ((ay * t + by) * t + cy) * t; const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x; for (let i = 0; i < 6; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-6) break; const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
    let lo = 0; let hi = 1; if (t < 0 || t > 1) { t = x; for (let i = 0; i < 24; i++) { const v = sx(t); if (Math.abs(v - x) < 1e-6) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; } }
    return sy(t);
  };
}
export const easeOut = bezier(0.16, 1, 0.3, 1);           // D4 FORK: the Dispatch arrival curve (expo-out: quick, then a long settle); the CSS variable --ease-out is the same curve
export const easeIn = bezier(0.4, 0, 1, 1);
export const easeInOut = bezier(0.45, 0, 0.2, 1);

export const phaseP = (now, t0, ms) => (ms <= 0 ? 1 : Math.max(0, Math.min(1, (now - t0) / ms)));

/**
 * Look of a card in a phase at time `now`.  phase: 'in' | 'show' | 'out' | 'moveOut' | 'moveIn'.   M = { enterMs, exitMs, moveOutMs, moveInMs, rise, reduced }.
 * Returns { opacity, dy, scale, done } where `done` says the phase has run its course (the host then advances the state).
 */
export function look(phase, now, t0, M, from = 1) {
  const rm = !!M.reduced; const rise = rm ? 0 : M.rise;
  switch (phase) {
    case 'in': { const p = phaseP(now, t0, rm ? Math.min(120, M.enterMs) : M.enterMs); const e = easeOut(p); return { opacity: e, dy: (1 - e) * rise, scale: rm ? 1 : 0.985 + 0.015 * e, done: p >= 1 }; }
    case 'moveIn': { const p = phaseP(now, t0, rm ? Math.min(120, M.moveInMs) : M.moveInMs); const e = easeOut(p); return { opacity: e, dy: (1 - e) * rise * 0.6, scale: 1, done: p >= 1 }; }
    case 'out': { const p = phaseP(now, t0, rm ? Math.min(120, M.exitMs) : M.exitMs); const e = easeIn(p); return { opacity: from * (1 - e), dy: e * rise * 0.5, scale: 1, done: p >= 1 }; }
    case 'moveOut': { const p = phaseP(now, t0, rm ? Math.min(120, M.moveOutMs) : M.moveOutMs); const e = easeIn(p); return { opacity: from * (1 - e), dy: 0, scale: 1, done: p >= 1 }; }
    default: return { opacity: 1, dy: 0, scale: 1, done: false };
  }
}

/** the leader line's draw-on progress 0..1 (instant under reduced motion) */
export function leaderProgress(now, t0, ms, reduced) { return reduced || ms <= 0 ? 1 : easeOut(phaseP(now, t0, ms)); }

/** the subject ring pulse: { scale 1..1.35, alpha 1..0 } over `ms`, or null when finished or reduced */
export function pulse(now, t0, ms, reduced) { if (reduced || ms <= 0) return null; const p = (now - t0) / ms; if (p < 0 || p >= 1) return null; const e = easeOut(p); return { grow: 2 + 9 * e, alpha: 1 - e }; }
