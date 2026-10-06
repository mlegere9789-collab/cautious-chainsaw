// time/transport.mjs - the playback clock: a CONTINUOUS FRACTIONAL TICK driven by a FIXED-TIMESTEP simulation that the renderer samples with interpolation.
//
// Why: the site's own loop advances the tick from the frame time of whatever frame happened to run, so a late frame is a visible hitch and the draw uses a stale
// tick (01-current-tiles-jitter.md root cause 3).  Here
//   * the simulation advances in exact steps of 1/fixedHz seconds, however long or irregular the rendered frames are (accumulated in integer microseconds, so the number
//     of steps for a given elapsed time does not depend on how that time was cut into frames: test/time.test.mjs);
//   * the renderer asks for tauAt(alpha): the simulated tick interpolated between the last two steps, so motion is correct at the TRUE frame time at any refresh rate;
//   * play / pause / speed changes are eased (a critically damped speed), and a seek or a scrub is a GLIDE (critically damped, speed capped), never a teleport:
//     one day forward is a short fast fly-through of the interpolated paths instead of 65 tiles jumping (01: measured teleport on a scrub).
//   * prefers-reduced-motion (reduced() true): seeks land instantly and speed changes are immediate.
// 1x = base ticks per second (2 = the site's 500 ms per tick, documented in the bundle as cF = 500).
import { dampStep } from '../interp/damp.mjs';

export function createTransport(tok, { tickMax = 675, tick0 = 1, reduced = () => false } = {}) {
  const S = { tau: tick0, prev: tick0, vel: 0, target: null, playing: false, speed: 1, speedEff: 0, sv: 0, acc: 0 /* microseconds */, steps: 0, glideMs: 0, ended: false };
  const listeners = [];
  const emit = (type) => { for (const f of listeners.slice()) f(type, api); };
  const clamp = (t) => (t < 1 ? 1 : t > tickMax ? tickMax : t);
  const hUs = () => Math.max(1, Math.round(1e6 / tok('time.fixedHz')));

  function simStep(h) {                                        // h in seconds
    const rm = reduced();
    const base = tok('time.baseTps'); const want = S.playing ? S.speed : 0;
    if (rm || tok('time.speedRampMs') <= 0) { S.speedEff = want; S.sv = 0; }
    else { const r = dampStep(S.speedEff, S.sv, want, tok('time.speedRampMs') / 1000, h); S.speedEff = r[0]; S.sv = r[1]; if (Math.abs(S.speedEff - want) < 1e-3 && Math.abs(S.sv) < 1e-2) { S.speedEff = want; S.sv = 0; } }
    const adv = S.speedEff * base * h;
    S.prev = S.tau;
    if (S.target !== null) {
      if (S.playing) S.target = clamp(S.target + adv);          // a glide ahead of a playing clock keeps moving with it
      const r = dampStep(S.tau, S.vel, S.target, (S.glideMs || tok('time.glideMs')) / 1000, h, tok('time.glideMaxTps'));
      S.tau = r[0]; S.vel = r[1];
      if (Math.abs(S.tau - S.target) < 5e-4 && Math.abs(S.vel) < 0.05) { S.tau = S.target; S.vel = 0; S.target = null; S.glideMs = 0; }
    } else if (adv !== 0) {
      S.tau += adv; S.vel = 0;
    }
    if (S.tau >= tickMax) {
      S.tau = tickMax;
      if (S.playing && S.target === null) {
        if (tok('time.endBehavior') === 'loop') { S.tau = 1; S.prev = 1; S.speedEff = want; emit('loop'); }
        else { S.playing = false; S.speedEff = 0; S.sv = 0; S.ended = true; emit('end'); }
      }
    } else if (S.tau < 1) S.tau = 1;
  }

  const api = {
    /** advance by a real elapsed time in seconds (one rendered frame).  Long stalls are capped (time.maxFrameMs) so a background tab cannot fast-forward the battle. */
    advance(dtSec) {
      const dt = Math.min(Math.max(0, dtSec), tok('time.maxFrameMs') / 1000);
      S.acc += Math.round(dt * 1e6);
      const step = hUs(); let n = 0;
      while (S.acc >= step && n < 64) { simStep(step / 1e6); S.acc -= step; S.steps++; n++; }
      return api.tauAt();
    },
    /** the tick to DRAW: the simulation interpolated by the unconsumed fraction of the current step */
    tauAt() { const a = S.acc / hUs(); return S.prev + (S.tau - S.prev) * (a < 0 ? 0 : a > 1 ? 1 : a); },
    get tau() { return api.tauAt(); },
    get simTau() { return S.tau; },
    get steps() { return S.steps; },
    get playing() { return S.playing; },
    get speed() { return S.speed; },
    get speedEff() { return S.speedEff; },
    get gliding() { return S.target !== null; },
    get target() { return S.target; },
    get ended() { return S.ended; },
    play() { if (S.tau >= tickMax && tok('time.endBehavior') === 'stop') { api.seek(1, { glide: false }); } S.playing = true; S.ended = false; emit('play'); },
    pause() { S.playing = false; emit('pause'); },
    toggle() { if (S.playing) api.pause(); else api.play(); },
    /** speed multiplier (1 = the site's 1x); eased */
    setSpeed(x) { S.speed = Math.max(0.0625, Math.min(64, x)); emit('speed'); },
    /** go to a tick: a glide by default; {glide:false} lands there at once; {ms} sets the glide time constant (scrubbing uses a short one) */
    seek(tick, { glide = true, ms = 0 } = {}) {
      const t = clamp(tick);
      if (!glide || reduced()) { S.tau = t; S.prev = t; S.vel = 0; S.target = null; S.acc = 0; S.glideMs = 0; emit('seek'); return; }
      S.target = t; S.glideMs = ms; emit('seek');
    },
    on(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    /** the whole state, for tests and the metrics overlay */
    snapshot() { return { tau: api.tauAt(), simTau: S.tau, target: S.target, playing: S.playing, speed: S.speed, speedEff: S.speedEff, vel: S.vel, steps: S.steps, accUs: S.acc }; },
  };
  return api;
}
