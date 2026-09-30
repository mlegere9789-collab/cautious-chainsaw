// Legacy bridge facade (WP-TIME-10 candidate): the small object the frozen bundle and the classic-script pages call.
// Zero dependencies. Every method coerces EVERY numeric argument (ticks: NaN -> 1, minutes: NaN -> 0, +-Infinity and huge values clamp) so a
// bad value cannot crash a render, feed setTick(NaN) or reach a validating model as anything but a finite number.
// Strings default to the UI policy of chapter 04 section 4.5: 5-minute rounding and an "about" prefix while a clock is approximate.
// The 'frame' style ("Frame 538 of 675") is for tooltips and ?debug=1 only (chapter 04 section 4.9): the bridge patches never print it as text.
// A style that is not one of the known words (undefined, a number, a Symbol, an object with a throwing toString, an unknown string) is 'compat'.
import { STYLES } from './core.js';

/** makeBridge(model) -> { f, x, after, hour, phase, tab, ... }; inlined into the bundle by tools/time/build.mjs as GTBGTime. */
export function makeBridge(model) {
  const n = (t, d) => { try { t = +t; } catch (e) { return d; } return t !== t ? d : Math.max(-1e9, Math.min(1e9, t)); }; // a Symbol, a BigInt or a throwing valueOf is just a bad value
  const st = (s) => (STYLES.indexOf(s) < 0 ? 'compat' : s); // strict equality only: nothing is converted to a string, so nothing can throw
  return {
    version: model.version,
    dv: model.dv,
    tickMax: model.tickMax,
    /** UI string. styles: compat "July 1, about 7:30 AM" | chip | time | day | date | long | short | aria | frame (tooltip only) */
    f: (t, style) => model.tickToLabel(n(t, 1), { style: st(style) }),
    /** exact string, minute precision, never prefixed (for data attributes and tests) */
    x: (t, style) => model.format(n(t, 1), st(style)),
    /** integer tick a real number of minutes away (hour buttons: +-60), clamped; a bad tick counts as 1, bad minutes as 0 (no move) */
    after: (t, dm) => model.tickAfterMinutes(n(t, 1), n(dm, 0)),
    /** decimal local hour of day for lighting/atmosphere helpers */
    hour: (t) => model.hour(n(t, 1)),
    phase: (t) => model.dayPart(n(t, 1)),
    tab: (t) => model.tabDay(n(t, 1)),
    approx: (t) => model.isApprox(n(t, 1)),
    /** "Tab N" tick range start: replaces the hard-coded 1/226/451 */
    tabStart: (d) => model.tabStart(n(d, 1)),
    /** ticks -> real minutes and back, for sub-pages that need to place a clock on a slider */
    minutes: (t) => model.tickToMinutes(n(t, 1)),
    tickAt: (m) => model.minutesToTick(n(m, 0)),
  };
}
