// host/clock.mjs - THE CLOCK: a continuous fractional tick, advanced by the real elapsed time of every animation frame; the app's integer tick (the store's currentTick, what every popup, the slider and the
// deep links read) is derived from it and written back only when it changes.
//
//   * playing: tau advances by speed * 2 ticks per second (the site's own rate: 500 ms per tick at 1x) times the eased speed, so a late frame is a longer step, never a stale or backward one;
//   * play, pause and speed changes are EASED (a critically damped speed, about 220 ms), so the clock leaves and reaches rest without a jerk; a pause keeps the sub-tick position (the marks stop where they are,
//     nothing slides back to the whole tick) and playing again continues from it;
//   * a JUMP (the app's tick changed by something other than this clock: the slider, a day button, Follow Your Ancestor, a deep link, a key press while paused) is a GLIDE of the displayed time to the new tick,
//     under clock.glideMaxMs (a critically damped glide with a speed cap), the marks travelling along their own paths; a jump of more than clock.crossfadeTicks is a CUT (the picture cross-fades);
//   * reduced motion: a jump lands at once, speed changes are immediate;
//   * the end of the battle stops the clock at the last tick.
// Pure state machine: no DOM, no store.  step() returns what the host must do (write a tick, stop playing, cut).
import { dampStep } from '../engine/interp/damp.mjs';

export const TICK_MAX = 675;
const clampT = (t) => (t < 1 ? 1 : t > TICK_MAX ? TICK_MAX : t);

export function createClock(tok) {
  const S = { tau: 1, vel: 0, target: null, glideMs: 0, speedEff: 0, sv: 0, seen: null, written: null, ended: false, moving: false, started: false };
  const api = {
    get tau() { return S.tau; }, get gliding() { return S.target !== null; }, get speedEff() { return S.speedEff; }, get moving() { return S.moving; }, get target() { return S.target; },
    state() { return { tau: S.tau, target: S.target, speedEff: S.speedEff, seen: S.seen, written: S.written }; },
    /** the first frame: start at the app's tick, nothing to glide from */
    init(tick) { S.tau = clampT(tick); S.seen = tick; S.written = tick; S.target = null; S.vel = 0; S.started = true; },
    /** force the displayed time (tests, deep links before the first frame) */
    set(tick) { S.tau = clampT(tick); S.target = null; S.vel = 0; },
    /**
     * @param {number} dtMs  real elapsed time of this frame (capped by the caller)
     * @param {{tick:number, playing:boolean, speed:number, reduced:boolean}} app  the app's own state, read fresh from the store
     * @returns {{tau:number, cut:boolean, write:number|null, stop:boolean, jumped:boolean}}
     */
    step(dtMs, app) {
      if (!S.started) api.init(app.tick);
      const dt = Math.max(0, dtMs) / 1000; const out = { tau: S.tau, cut: false, write: null, stop: false, jumped: false };
      // 1. did something else move the app's tick?
      if (app.tick !== S.seen) {
        const ours = app.tick === S.written; S.seen = app.tick;
        if (!ours) {
          out.jumped = true; const d = Math.abs(app.tick - S.tau);
          if (app.reduced || d < 1e-6) { S.tau = app.tick; S.target = null; S.vel = 0; if (!app.reduced && d > 0) out.cut = false; }
          else if (d > tok('clock.crossfadeTicks')) { S.tau = app.tick; S.target = null; S.vel = 0; out.cut = true; }
          else { S.target = app.tick; S.glideMs = Math.min(tok('clock.glideMaxMs'), d <= 1.5 ? 160 : tok('clock.glideMs')); }
          S.ended = false;
        }
      }
      // 2. the speed (eased)
      const want = app.playing && !S.ended ? app.speed * 2 : 0;
      if (app.reduced || tok('clock.glideMs') <= 0) { S.speedEff = want; S.sv = 0; }
      else {
        const r = dampStep(S.speedEff, S.sv, want, 0.11, dt); S.speedEff = r[0]; S.sv = r[1];
        if (Math.abs(S.speedEff - want) < 1e-3 && Math.abs(S.sv) < 1e-2) { S.speedEff = want; S.sv = 0; }
      }
      // 3. the time
      const adv = S.speedEff * dt;
      if (S.target !== null) {
        if (app.playing) S.target = clampT(S.target + adv);                      // a glide ahead of a playing clock keeps moving with it
        const gs = Math.max(0.04, S.glideMs / 1000 / 2.6);                        // time constant: the glide has covered about 99 % after the stated time
        const r = dampStep(S.tau, S.vel, S.target, gs, dt, 160);
        S.tau = r[0]; S.vel = r[1];
        if (Math.abs(S.tau - S.target) < 2e-3 && Math.abs(S.vel) < 0.05) { S.tau = S.target; S.vel = 0; S.target = null; }
      } else if (adv !== 0) { S.tau += adv; S.vel = 0; }
      if (S.tau >= TICK_MAX) { S.tau = TICK_MAX; if (app.playing && S.target === null) { out.stop = true; S.ended = true; S.speedEff = 0; S.sv = 0; } }
      else if (S.tau < 1) S.tau = 1;
      S.moving = S.target !== null || S.speedEff !== 0 || app.playing;
      // 4. the app's integer tick follows the clock (not while a glide is in flight: the app's tick already is the destination)
      if (S.target === null) {
        const w = Math.max(1, Math.min(TICK_MAX, Math.floor(S.tau + 1e-9)));
        if (w !== app.tick) { out.write = w; S.written = w; S.seen = w; }
      }
      out.tau = S.tau; return out;
    },
  };
  return api;
}
