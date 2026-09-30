// Playback helpers over a time model (chapter 04 section 4.6).  CANDIDATE (WP-TIME-02 / WP-TIME-11 input).
// Zero dependencies; operates on the object returned by makeTimeModel().
//
// Two paces:
//   Story pace (legacy default): ticks advance at a fixed rate (2 ticks/s at 1x), so battle-minutes per second vary from 1.7 to 84.7.
//   Battle-time pace (this helper): the CLOCK advances at a constant rate; the tick is derived, so speed is honest in battle-minutes.

/** Battle-minutes per real second at Story pace: ticksPerSecond * speed * minutes-per-tick(tick), plus a label value rounded to 5. */
export function storyPace(model, tick, speed, ticksPerSecond) {
  const v = (ticksPerSecond == null ? 2 : ticksPerSecond) * (speed == null ? 1 : speed) * model.minutesPerTick(tick);
  return { minPerSec: v, label: v < 2.5 ? Math.max(1, Math.round(v)) : Math.round(v / 5) * 5 };
}

/**
 * Constant-clock ("Battle-time") playback.
 *   const pb = createPlayback(model, { rate: 5, tick: 538 });   // rate: battle-minutes per real second (ladder 1, 5, 15, 30, 60)
 *   const step = pb.advance(dtMs);                               // { tick, prevTick, crossed: [a, b] | null, gap, done }
 * - dt is clamped to maxDtMs (default 100) so a stalled tab cannot jump the clock (T0 patch I).
 * - Inside a `fast_forward` gap the pace accelerates to at least gapRate (default 60 min/s: "Quiet hours") and step.gap names the policy.
 * - `crossed` is the inclusive range of integer ticks passed this step (prev < t <= cur), the input for crossing-based triggers.
 * - At the last tick playback stops: done:true and the clock stays at the end.
 */
export function createPlayback(model, opts) {
  const o = opts || {};
  const end = model.tickToMinutes(model.tickMax), start = model.tickToMinutes(1);
  const maxDt = o.maxDtMs == null ? 100 : o.maxDtMs, gapRate = o.gapRate == null ? 60 : o.gapRate;
  let rate = o.rate == null ? 5 : o.rate;
  let clock = model.tickToMinutes(o.tick == null ? 1 : o.tick);
  const api = {
    get rate() { return rate; },
    get minutes() { return clock; },
    get tick() { return model.minutesToTick(clock); },
    setRate(r) { if (!(r > 0)) throw new RangeError('rate must be > 0 battle-minutes per second'); rate = r; return api; },
    seek(tick) { clock = model.tickToMinutes(tick); return api; },
    seekMinutes(m) { clock = Math.min(end, Math.max(start, m)); return api; },
    advance(dtMs) {
      const prev = api.tick, dt = Math.min(Math.max(dtMs, 0), maxDt) / 1000;
      const g = model.gapAt(Math.floor(prev));
      const eff = g && g.policy === 'fast_forward' ? Math.max(rate, gapRate) : rate;
      clock = Math.min(end, clock + eff * dt);
      const cur = api.tick, a = Math.floor(prev) + 1, b = Math.floor(cur + 1e-9);
      return { tick: cur, prevTick: prev, crossed: b >= a ? [a, b] : null, gap: g ? g.policy : null, rate: eff, done: clock >= end };
    },
  };
  return api;
}
