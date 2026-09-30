// Legacy bridge facade (WP-TIME-10 candidate): the small object the frozen bundle and the classic-script pages call.
// Zero dependencies. Every method coerces its tick argument (NaN -> 1) so a bad value cannot crash a render.
// Strings default to the UI policy of chapter 04 section 4.5: 5-minute rounding and an "about" prefix while a clock is approximate.

/** makeBridge(model) -> { f, x, after, hour, phase, tab, ... }; inlined into the bundle by tools/time/build.mjs as GTBGTime. */
export function makeBridge(model) {
  const n = (t) => { t = +t; return t === t ? t : 1; };
  return {
    version: model.version,
    dv: model.dv,
    tickMax: model.tickMax,
    /** UI string. styles: compat "July 1, about 7:30 AM" | chip | time | day | date | long | short | aria | frame */
    f: (t, style) => model.tickToLabel(n(t), { style: style || 'compat' }),
    /** exact string, minute precision, never prefixed (for data attributes and tests) */
    x: (t, style) => model.format(n(t), style || 'compat'),
    /** integer tick a real number of minutes away (hour buttons: +-60), clamped */
    after: (t, dm) => model.tickAfterMinutes(n(t), dm),
    /** decimal local hour of day for lighting/atmosphere helpers */
    hour: (t) => model.hour(n(t)),
    phase: (t) => model.dayPart(n(t)),
    tab: (t) => model.tabDay(n(t)),
    approx: (t) => model.isApprox(n(t)),
    /** "Tab N" tick range start: replaces the hard-coded 1/226/451 */
    tabStart: (d) => model.tabStart(d),
    /** ticks -> real minutes and back, for sub-pages that need to place a clock on a slider */
    minutes: (t) => model.tickToMinutes(n(t)),
    tickAt: (m) => model.minutesToTick(m),
  };
}
