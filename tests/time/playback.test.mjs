// Constant-clock ("Battle-time") playback and Story-pace helpers (chapter 04 section 4.6; WP-TIME-11 input).
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { P } from '../../tools/time/lib.mjs';
import m, { createPlayback, storyPace, makeBridge } from '../../src/lib/time/index.js';

describe('createPlayback (Battle-time pace)', () => {
  test('the clock advances at a constant rate in battle-minutes per second, independent of ticks', () => {
    for (const rate of [1, 5, 15, 30, 60]) {
      const pb = createPlayback(m, { rate, tick: 538 }); const m0 = pb.minutes;
      for (let i = 0; i < 10; i++) pb.advance(100); // 1 s of frames
      assert.ok(Math.abs(pb.minutes - m0 - rate) < 1e-9, `rate ${rate}: moved ${pb.minutes - m0}`);
    }
  });
  test('60 battle-min/s advances one hour in one second (+-1%) across the 0.83 min/tick stall where Story pace would run 72 ticks/s', () => {
    const pb = createPlayback(m, { rate: 60, tick: 302 }); const t0 = pb.tick; for (let i = 0; i < 10; i++) pb.advance(100);
    assert.ok(Math.abs(pb.minutes - m.tickToMinutes(302) - 60) < 0.6); assert.ok(pb.tick - t0 > 15, 'ticks advance fast in the stall but the clock does not');
    assert.equal(storyPace(m, 305, 1).label, 2, 'story pace in the stall is under 2 battle min/s at 1x'); assert.equal(storyPace(m, 545, 1).label, 5, 'and about 5 in the charge');
  });
  test('dt is clamped (a stalled tab cannot jump the clock) and negative dt is ignored', () => {
    const pb = createPlayback(m, { rate: 5, tick: 100 }); const a = pb.minutes; pb.advance(60000); assert.ok(Math.abs(pb.minutes - a - 0.5) < 1e-9, 'one clamped 100 ms frame at 5 min/s = 0.5 min');
    const b = pb.minutes; pb.advance(-500); assert.equal(pb.minutes, b);
    const c = createPlayback(m, { rate: 5, tick: 100, maxDtMs: 1000 }); const d = c.minutes; c.advance(60000); assert.ok(Math.abs(c.minutes - d - 5) < 1e-9);
  });
  test('inside a fast_forward gap the pace accelerates ("Quiet hours") and reports it; outside it does not', () => {
    const pb = createPlayback(m, { rate: 5, tick: 228 }); const s = pb.advance(100); assert.equal(s.gap, 'fast_forward'); assert.equal(s.rate, 60);
    const t = createPlayback(m, { rate: 5, tick: 300 }).advance(100); assert.equal(t.gap, null); assert.equal(t.rate, 5);
    assert.equal(createPlayback(m, { rate: 120, tick: 228 }).advance(100).rate, 120, 'never slower than the chosen rate');
  });
  test('crossed reports the integer ticks passed this step (prev < t <= cur), the input for crossing-based triggers', () => {
    const pb = createPlayback(m, { rate: 60, tick: 302 }); const s = pb.advance(100); // 6 minutes at 0.83 min/tick = about 7 ticks
    assert.ok(s.crossed && s.crossed[0] === 303 && s.crossed[1] >= 308, JSON.stringify(s));
    let prev = pb.tick; const seen = new Set(); for (let t = s.crossed[0]; t <= s.crossed[1]; t++) seen.add(t);
    for (let i = 0; i < 200; i++) { const r = pb.advance(16); if (r.crossed) for (let t = r.crossed[0]; t <= r.crossed[1]; t++) { assert.ok(!seen.has(t), `tick ${t} crossed twice`); seen.add(t); } assert.ok(r.tick >= prev); prev = r.tick; }
    for (let t = 303; t < Math.floor(prev); t++) assert.ok(seen.has(t), `tick ${t} skipped`);
  });
  test('it stops at the last tick (done) and the clock stays there; seek moves both directions; setRate validates', () => {
    const pb = createPlayback(m, { rate: 60, tick: 674 }); let last; for (let i = 0; i < 400; i++) last = pb.advance(100);
    assert.equal(last.done, true); assert.equal(pb.tick, 675); assert.equal(pb.minutes, m.tickToMinutes(675));
    assert.equal(pb.seek(20).tick, 20); assert.ok(Math.abs(pb.tick - 20) < 1e-9); pb.seekMinutes(-5); assert.equal(pb.tick, 1); pb.seekMinutes(1e9); assert.equal(pb.tick, 675);
    assert.throws(() => pb.setRate(0), RangeError); assert.throws(() => pb.setRate(-1), RangeError); assert.equal(pb.setRate(15).rate, 15);
  });
  test('a seek from 500 back to 20 leaves no state behind (pure function of the clock)', () => {
    const pb = createPlayback(m, { rate: 30, tick: 500 }); for (let i = 0; i < 50; i++) pb.advance(100); pb.seek(20); assert.equal(pb.tick, 20);
  });
});

describe('storyPace (legacy pace label input)', () => {
  test('1x is 1.7 to 84.7 battle-minutes per second at 2 ticks/s (chapter 04 section 2.1); the label rounds to 5', () => {
    let lo = Infinity, hi = 0; for (let t = 1; t < 675; t++) { const v = storyPace(m, t, 1).minPerSec; lo = Math.min(lo, v); hi = Math.max(hi, v); }
    assert.equal(lo.toFixed(1), '1.7'); assert.equal(hi.toFixed(1), '84.7');
    assert.equal(storyPace(m, 516, 1).label, 85); assert.equal(storyPace(m, 545, 1).label, 5); assert.equal(storyPace(m, 302, 1).label, 2, 'sub-2.5 values keep whole minutes');
    assert.equal(storyPace(m, 538, 4).label, 20);
  });
});

describe('bridge facade', () => {
  test('coerces bad input and returns strings with the UI policy (5-minute rounding, "about")', () => {
    const b = makeBridge(m);
    for (const bad of [NaN, undefined, null, 'x', {}, 0, 676, -1, 1e9]) assert.equal(typeof b.f(bad), 'string');
    assert.equal(b.f(12), 'July 1, about 7:30 AM'); assert.equal(b.x(12), 'July 1, 7:30 AM'); assert.equal(b.f(538, 'aria'), 'about 3 PM on Friday, July 3, 1863');
    assert.equal(b.after('538', 60), 556); assert.equal(b.tab(226), 2); assert.equal(b.approx(538), true);
    assert.equal(b.hour(538), 15); assert.equal(b.phase(150), 'night'); assert.ok(Math.abs(b.tickAt(b.minutes(300)) - 300) < 1e-9);
  });
});

describe('type declarations', () => {
  test('index.d.ts declares every runtime export of src/lib/time/index.js', async () => {
    const mod = await import('../../src/lib/time/index.js'); const dts = fs.readFileSync(P('src', 'lib', 'time', 'index.d.ts'), 'utf8');
    const declared = new Set([...dts.matchAll(/export (?:declare )?(?:const|function|class|default) (\w+)/g)].map((x) => x[1]));
    const missing = Object.keys(mod).filter((k) => k !== 'default' && !declared.has(k));
    assert.deepEqual(missing, []); assert.match(dts, /export default model/);
  });
});
