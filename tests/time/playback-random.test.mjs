// Randomized long-run playback tests (VERIFY-01): the crossing rule is exact, so every tick is reported exactly once, whatever the frame lengths,
// rates, gaps, seeks and clamped stalls. The oracle is a plain pointer walk over model.tickToMinutes (independent of floorTick's binary search).
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import m, { createPlayback } from '../../src/lib/time/index.js';
import { rng } from './helpers.mjs';

const T = m.tickMax;
const MIN = Array.from({ length: T + 2 }, (_, t) => (t >= 1 && t <= T ? m.tickToMinutes(t) : NaN));

/** Runs one playback for `frames` frames and checks every step against the oracle; returns the ticks crossed and the number of steps. */
function run(pb, r, frames, dtOf, opts = {}) {
  let last = m.floorTick(pb.minutes), crossedTotal = 0; const seen = new Uint8Array(T + 2), fromTick = last;
  for (let i = 0; i < frames; i++) {
    const before = pb.minutes, dt = dtOf(i), s = pb.advance(dt);
    // oracle: advance a pointer while the next tick's clock has been reached
    let want = last; while (want < T && MIN[want + 1] <= pb.minutes) want++;
    if (want === last) assert.equal(s.crossed, null, `frame ${i}: nothing crossed but ${JSON.stringify(s.crossed)} reported (clock ${before} -> ${pb.minutes})`);
    else assert.deepEqual(s.crossed, [last + 1, want], `frame ${i}: clock ${before} -> ${pb.minutes}`);
    if (s.crossed) for (let k = s.crossed[0]; k <= s.crossed[1]; k++) { assert.equal(seen[k], 0, `tick ${k} crossed twice (frame ${i})`); seen[k] = 1; crossedTotal++; }
    assert.equal(Math.floor(pb.tick), m.floorTick(pb.minutes), 'the frame shown and the crossing rule never disagree'); assert.equal(Math.floor(s.tick), want);
    assert.ok(s.tick >= s.prevTick, 'monotone'); assert.ok(pb.minutes >= before);
    last = want;
    if (opts.seek && r() < opts.seek) { const t = 1 + Math.floor(r() * T); pb.seek(t); last = t; seen.fill(0); if (r() < 0.5) assert.equal(pb.advance(0).crossed, null, 'a seek is not a crossing'); }
    if (s.done) { assert.equal(last, T); break; }
  }
  return { crossedTotal, seen, fromTick, last };
}

describe('createPlayback crossings are exact (randomized, long)', () => {
  test('an unmoved playback never reports a crossing, at any tick, at any rate, however many times it is asked', () => {
    for (let t = 1; t <= T; t++) for (const rate of [1, 5, 60]) { const pb = createPlayback(m, { tick: t, rate }); for (let i = 0; i < 3; i++) assert.equal(pb.advance(0).crossed, null, `t${t}`); assert.equal(pb.tick, t); }
  });
  test('no epsilon: a clock one ulp (or 1e-10 minute) BELOW a tick has not crossed it, and the first step that reaches it crosses it once', () => {
    const f64 = new Float64Array(1), u64 = new BigUint64Array(f64.buffer);
    const below = (x) => { f64[0] = x; u64[0] -= 1n; return f64[0]; };
    for (let k = 2; k <= T; k++) for (const startMin of [below(MIN[k]), MIN[k] - 1e-10]) {
      const pb = createPlayback(m, { rate: 1 }); pb.seekMinutes(startMin);
      assert.equal(m.floorTick(pb.minutes), k - 1); assert.equal(pb.advance(0).crossed, null, `t${k}: phantom crossing of a tick the clock has not reached`); assert.equal(Math.floor(pb.tick), k - 1);
      const s = pb.advance(0.001); assert.deepEqual(s.crossed, [k, k], `t${k}`); assert.equal(pb.advance(0).crossed, null); // 1e-6 minute later it is across, once
    }
  });
  test('full battle at every rate of the ladder and awkward ones, frames of 1-100 ms: each tick 2..675 is crossed exactly once and in order', () => {
    const r = rng(1863);
    for (const rate of [1, 5, 15, 30, 60, 7.3, 0.9, 120, 250]) {
      const pb = createPlayback(m, { tick: 1, rate, maxDtMs: 100 });
      const frames = rate < 5 ? 80000 : 250000, { crossedTotal, seen, last } = run(pb, r, frames, () => 1 + r() * 99);
      if (rate >= 5) { assert.equal(last, T, `rate ${rate} reached the end`); assert.equal(crossedTotal, T - 1); for (let k = 2; k <= T; k++) assert.equal(seen[k], 1, `rate ${rate}: tick ${k} never crossed`); }
      else for (let k = 2; k <= last; k++) assert.equal(seen[k], 1, `rate ${rate}: tick ${k} skipped`);
    }
  });
  test('the verifier frame: 16 ms at 1, 5 and 15 battle-min/s, and 60 fps jitter around it', () => {
    const r = rng(16);
    for (const [rate, jitter] of [[5, 0], [15, 0], [5, 1], [15, 1], [60, 1]]) { const pb = createPlayback(m, { tick: 1, rate }); const { crossedTotal, last } = run(pb, r, rate === 5 ? 60000 : 30000, () => (jitter ? 8 + r() * 17 : 16)); assert.ok(crossedTotal > 0 && last > 1, `rate ${rate}`); }
  });
  test('random starts, random seeks in the middle, zero-length frames, clamped stalls (a 60 s frame is 100 ms) and gaps: the oracle agrees at every step', () => {
    const r = rng(20260930);
    for (let k = 0; k < 40; k++) {
      const rate = [1, 5, 15, 30, 60][Math.floor(r() * 5)] * (0.5 + r()), pb = createPlayback(m, { tick: 1 + Math.floor(r() * T), rate, maxDtMs: r() < 0.3 ? 1000 : 100, gapRate: r() < 0.5 ? 60 : 200 });
      run(pb, r, 20000, () => { const x = r(); return x < 0.1 ? 0 : x < 0.15 ? 60000 : x < 0.2 ? -50 : 1 + r() * 60; }, { seek: 0.0005 });
    }
  });
  test('across the two fast_forward gaps (t226-240, t515-518) every tick is still crossed once and the step reports the gap policy', () => {
    for (const [from, to] of [[224, 244], [512, 522]]) {
      const pb = createPlayback(m, { tick: from, rate: 5 }); const policies = new Set(); let n = 0, prev = null;
      for (let i = 0; i < 20000 && pb.tick < to; i++) { const s = pb.advance(16); policies.add(s.gap); if (s.crossed) { for (let k = s.crossed[0]; k <= s.crossed[1]; k++) { assert.ok(prev === null || k === prev + 1, `tick ${k} after ${prev}`); prev = k; n++; } } }
      assert.ok(policies.has('fast_forward') && policies.has(null), `${from}: ${[...policies]}`); assert.ok(n >= to - from - 2, `${from}-${to}: ${n} crossings`);
    }
  });
  test('at the end: done, the clock stays, nothing more is crossed; a seek back and a re-run cross the same ticks again once each', () => {
    const pb = createPlayback(m, { tick: 670, rate: 60 }); let s; for (let i = 0; i < 400; i++) s = pb.advance(100);
    assert.equal(s.done, true); assert.equal(s.crossed, null); assert.equal(pb.minutes, m.tickToMinutes(T)); assert.equal(pb.tick, T);
    pb.seek(670); let n = 0; for (let i = 0; i < 400; i++) { const x = pb.advance(100); if (x.crossed) n += x.crossed[1] - x.crossed[0] + 1; } assert.equal(n, T - 670);
  });
  test('dtMs must be a finite number (a NaN would poison the clock for the rest of the session); negative is ignored; creation arguments are validated', () => {
    const pb = createPlayback(m, { tick: 100, rate: 5 }); const before = pb.minutes;
    for (const bad of [NaN, undefined, null, '16', {}, Infinity]) assert.throws(() => pb.advance(bad), (e) => e instanceof TypeError && /dtMs/.test(e.message), String(bad));
    assert.equal(pb.minutes, before, 'a rejected frame does not move the clock'); assert.equal(pb.advance(-1).crossed, null); assert.equal(pb.minutes, before);
    for (const bad of [NaN, '5', {}, 0, -3]) assert.throws(() => createPlayback(m, { rate: bad }), (e) => e instanceof TypeError || e instanceof RangeError);
    assert.throws(() => createPlayback(m, { tick: NaN }), TypeError); assert.throws(() => createPlayback(m, { maxDtMs: 0 }), RangeError); assert.throws(() => pb.seek(undefined), TypeError); assert.throws(() => pb.seekMinutes(NaN), TypeError);
    assert.throws(() => pb.setRate(NaN), RangeError); assert.throws(() => pb.setRate('7'), TypeError); assert.equal(pb.setRate(15).rate, 15);
  });
});
