// Unit tests for the canonical time module (WP-TIME-02/20).  Run: node --test "tests/time/*.test.mjs"
// CANDIDATE: the anchors under test are proposed and unreviewed (D-TIME); these tests prove the machinery, not the history.
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { makeTimeModel, parseLocal } from '../../src/lib/time/index.js';
// The numeric pins in this file (tick positions of midnight, slopes, night-tick counts, labels at 5-minute rounding) describe the FROZEN 2026-09-30
// proposal (helpers.mjs). The live adjudicated file moves 12 anchors and widens most windows (docs/time/ANCHORS-FINAL.md); its own pins are in
// adjudicated.test.mjs. `m` and the bound functions below are the proposal's model, `doc` its document.
import { proposal as doc, proposalModel as m, rng, randomDoc, isoFromMinutes } from './helpers.mjs';
const { tickToClock, clockToTick, tickToLabel, resolveTickParam } = m;

const T = m.tickMax;
const A = doc.anchors;

describe('prototype parity: the 13 tests app-time reported (WP-TIME-02)', () => {
  test('1 anchors reproduce exactly', () => {
    for (const a of A) assert.equal(m.tickToMinutes(a.tick), parseLocal(a.t), `tick ${a.tick}`);
    for (const a of A) assert.equal(tickToClock(a.tick).iso, a.t, `tick ${a.tick}`);
  });
  test('2 monotone: strictly increasing over all 675 ticks', () => {
    for (let t = 2; t <= T; t++) assert.ok(m.tickToMinutes(t) > m.tickToMinutes(t - 1), `tick ${t}`);
  });
  test('3 inverse round-trips integer ticks and 1000 random fractional ticks', () => {
    for (let t = 1; t <= T; t++) assert.ok(Math.abs(clockToTick(m.tickToMinutes(t)) - t) < 1e-9, `tick ${t}`);
    const r = rng(42);
    for (let i = 0; i < 1000; i++) { const t = 1 + r() * (T - 1); assert.ok(Math.abs(m.minutesToTick(m.tickToMinutes(t)) - t) < 1e-9, `tick ${t}`); }
  });
  test('4 clamps outside 1..675 and marks it', () => {
    assert.equal(tickToClock(0).tick, 1); assert.equal(tickToClock(0).clamped, true); assert.equal(tickToClock(0).exact, false);
    assert.equal(tickToClock(676).tick, 675); assert.equal(tickToClock(676).clamped, true);
    assert.equal(tickToClock(-50).iso, tickToClock(1).iso);
    assert.equal(tickToClock(1e9).iso, tickToClock(675).iso);
    assert.equal(clockToTick('1863-06-30T00:00'), 1); assert.equal(clockToTick('1863-07-05T00:00'), 675);
    assert.equal(m.clockToTickInfo('1863-07-05T00:00').exact, false); assert.equal(m.clockToTickInfo('1863-07-02T12:00').exact, true);
  });
  test('5 date rolls over at midnight independently of the Day tab', () => {
    const c = (t) => tickToClock(t);
    assert.equal(c(159).date, 1); assert.equal(c(160).date, 2); assert.equal(c(160).tab, 1);   // Day-1 tab ticks after midnight are July 2
    assert.equal(c(367).date, 2); assert.equal(c(368).date, 3); assert.equal(c(368).tab, 2);
    assert.equal(c(225).tab, 1); assert.equal(c(226).tab, 2); assert.equal(c(450).tab, 2); assert.equal(c(451).tab, 3);
    const nightTicks = []; for (let t = 1; t <= T; t++) if (c(t).date !== [1, 2, 3][c(t).tab - 1]) nightTicks.push(t);
    assert.equal(nightTicks.length, 149, 'chapter 04: 149 ticks (t160-225, t368-450) have a date different from their Day tab');
  });
  test('6 formats', () => {
    assert.equal(m.format(12, 'time'), '7:30 AM');
    assert.equal(m.format(12, 'date'), 'July 1, 1863');
    assert.equal(m.format(12, 'short'), 'Jul 1, 7:30 AM');
    assert.equal(m.format(12, 'long'), 'Wed, July 1 · 7:30 AM');
    assert.equal(m.format(538, 'aria'), '3 PM on Friday, July 3, 1863');
    assert.equal(m.format(538, 'aria', { approx: true }), 'about 3 PM on Friday, July 3, 1863');
    assert.equal(m.format(538, 'frame'), 'Frame 538 of 675');
    assert.equal(m.format(538, 'long', { approx: true }), 'Fri, July 3 · about 3:00 PM');
  });
  test('7 iso and compat styles round-trip', () => {
    for (let t = 1; t <= T; t++) { const iso = m.format(t, 'iso'); assert.equal(parseLocal(iso), Math.round(m.tickToMinutes(t)), `tick ${t}`); }
    assert.match(m.format(12, 'compat'), /^July 1, 7:30 AM$/);
    assert.match(m.format(28, 'compat', { approx: 'auto' }), /^July 1, about 10:15 AM$/);
  });
  test('8 no "+2 days" regression: printed dates are July 1..3 only', () => {
    for (let t = 1; t <= T; t++) { const d = tickToClock(t).date; assert.ok(d >= 1 && d <= 3, `tick ${t} prints July ${d}`); assert.match(m.format(t, 'date'), /^(July [123]|Night of July [12]-[23]), 1863$/); }
    assert.equal(tickToClock(1).date, 1); assert.equal(tickToClock(226).date, 2); assert.equal(tickToClock(451).date, 3);
  });
  test('9 tickAfterMinutes(+-60) is a real hour, not 12 ticks', () => {
    assert.equal(m.tickAfterMinutes(538, 60), 556); assert.equal(m.tickAfterMinutes(226, 60), 228);
    assert.equal(m.tickAfterMinutes(515, 60), 516); assert.equal(m.tickAfterMinutes(302, 60), 327);
    assert.equal(m.tickAfterMinutes(1, -60), 1); assert.equal(m.tickAfterMinutes(675, 60), 675);
  });
  test('10 deep-link params are backward compatible (tick, t; hostile input is null)', () => {
    assert.equal(resolveTickParam(new URLSearchParams('tick=538')), 538);
    assert.equal(resolveTickParam(new URLSearchParams('t=28&u=U-I&z=15.0&ll=39.8278,-77.2528')), 28);
    assert.equal(resolveTickParam(new URLSearchParams('tick=538&t=12')), 538);
    assert.equal(resolveTickParam({ tick: '0' }), 1); assert.equal(resolveTickParam({ tick: '676' }), 675);
    for (const bad of ['abc', '-5', '1e9', '1.5', '', ' 5', '9999999', '0x10', '<script>']) assert.equal(resolveTickParam({ tick: bad }), null, JSON.stringify(bad));
    assert.equal(resolveTickParam(null), null); assert.equal(resolveTickParam(new URLSearchParams('at=1863-07-03T15:00')), null, 'D-URLSTATE gives "at" to the camera, not to time');
  });
  test('11 UI rounding never changes the underlying value; tickMax is data-driven', () => {
    const before = m.tickToMinutes(28);
    tickToLabel(28); m.format(28, 'time', { roundMin: 5 });
    assert.equal(m.tickToMinutes(28), before);
    assert.equal(m.format(3, 'time', { roundMin: 5 }), '5:10 AM');
    const small = makeTimeModel({ schema: 1, tick_max: 10, anchors: [{ tick: 1, t: '1863-07-01T05:00', sigma_min: 10, status: 'S' }, { tick: 10, t: '1863-07-01T06:30', sigma_min: 10, status: 'S' }] });
    assert.equal(small.tickMax, 10); assert.equal(small.tickToClock(99).tick, 10);
  });
  test('12 tickToClock / clockToTick are the public pair', () => {
    for (let t = 1; t <= T; t += 7) { const c = tickToClock(t); assert.equal(Math.round(clockToTick(c.iso)), Math.round(clockToTick(c.minutes))); assert.ok(Math.abs(clockToTick(c.iso) - t) <= 1 / m.minutesPerTick(t) + 1e-9, `tick ${t}`); }
    assert.ok(Math.abs(clockToTick('1863-07-02T15:00') - 250.6667) < 1e-3, 'chapter 04: 3:00 PM July 2 is tick 250.7');
  });
  test('13 rejects non-monotone anchors (tick or time), missing first tick, wrong tick_max', () => {
    const bad = (mut) => { const d = JSON.parse(JSON.stringify(doc)); mut(d); return d; };
    assert.throws(() => makeTimeModel(bad((d) => { d.anchors[5].t = d.anchors[4].t; })), /strictly increasing/);
    assert.throws(() => makeTimeModel(bad((d) => { d.anchors[5].t = '1863-07-01T03:00'; })), /strictly increasing/);
    assert.throws(() => makeTimeModel(bad((d) => { d.anchors[5].tick = d.anchors[4].tick; })), /strictly increasing/);
    assert.throws(() => makeTimeModel(bad((d) => { d.anchors[0].tick = 2; })), /first anchor must be tick 1/);
    assert.throws(() => makeTimeModel(bad((d) => { d.tick_max = 700; })), /tick_max/);
    assert.throws(() => makeTimeModel(bad((d) => { d.anchors[3].t = 'yesterday'; })), /bad local time/);
  });
});

describe('WP-TIME-02 additions', () => {
  test('safe at ticks 0, 676, fractions, negatives and huge values; NaN/undefined throw', () => {
    for (const t of [0, 0.5, 1, 1.0001, 674.9999, 675, 676, 1e6, -1, -1e6, 538.5]) { const c = tickToClock(t); assert.ok(c.tick >= 1 && c.tick <= 675 && /^1863-07-0[1-3]T/.test(c.iso), String(t)); assert.equal(typeof tickToLabel(t), 'string'); }
    for (const bad of [NaN, Infinity, undefined, null, '5']) assert.throws(() => tickToClock(bad), TypeError);
    assert.equal(tickToClock(538.5).exact, true); assert.equal(tickToClock(538.5).clamped, false);
  });
  test('mobile compat contract: getTickTime().split(", ")[1] is the time and never "1863"', () => {
    for (let t = 1; t <= T; t++) {
      for (const ap of [false, 'auto']) {
        const s = m.format(t, 'compat', { roundMin: 5, approx: ap }), p = s.split(', ');
        assert.equal(p.length, 2, `tick ${t}: ${s}`);
        assert.match(p[1], /^(about )?\d{1,2}:\d{2} [AP]M$/, `tick ${t}: ${s}`);
        assert.doesNotMatch(s, /1863/);
      }
    }
  });
  test('rollover ticks: calendar midnight is t160 and t368; Night-of label until civil dawn (04:03)', () => {
    assert.equal(m.format(159, 'day'), 'July 1'); assert.equal(m.format(160, 'day'), 'Night of July 1-2');
    assert.equal(m.format(367, 'day'), 'July 2'); assert.equal(m.format(368, 'day'), 'Night of July 2-3');
    let firstDawn = null; for (let t = 160; t <= 226; t++) if (!tickToClock(t).nightOf) { firstDawn = t; break; }
    assert.ok(tickToClock(firstDawn).hour24 * 60 + tickToClock(firstDawn).minute >= 243, 'first plain-date tick is at or after 04:03'); assert.equal(m.format(226, 'day'), 'July 2');
    assert.equal(m.format(160, 'chip', { approx: 'auto', roundMin: 5 }), 'Night of July 1-2, about 12:05 AM');
    assert.equal(m.format(160, 'short'), 'Night of Jul 1-2, 12:03 AM');
    assert.equal(m.format(160, 'aria'), '12:03 AM on the night of July 1-2, 1863');
    // month rollover generalises (proleptic calendar, no Date object)
    const far = makeTimeModel({ schema: 1, anchors: [{ tick: 1, t: '1863-07-31T22:00', sigma_min: 10, status: 'S' }, { tick: 100, t: '1863-08-01T03:00', sigma_min: 10, status: 'S' }] });
    assert.equal(far.format(100, 'day'), 'Night of July 31-August 1'); assert.equal(far.parts(100).weekday, 'Saturday');
  });
  test('weekday and calendar: July 1 1863 is a Wednesday (no Date used)', () => {
    assert.equal(m.parts(1).weekday, 'Wednesday'); assert.equal(m.parts(226).weekday, 'Thursday'); assert.equal(m.parts(451).weekday, 'Friday');
    assert.equal(m.parts(1).monthNum, 7); assert.equal(m.parts(1).year, 1863);
  });
  test('tickAfterMinutes: for every tick +-60 moves, is monotone, and never a no-op away from the ends', () => {
    let prevF = 0, prevB = 0;
    for (let t = 1; t <= T; t++) {
      const f = m.tickAfterMinutes(t, 60), b = m.tickAfterMinutes(t, -60);
      assert.ok(f >= t && b <= t && f <= T && b >= 1, `tick ${t}`);
      if (t < T) assert.ok(f > t || m.tickToMinutes(t) + 60 > m.tickToMinutes(T), `+60 no-op at ${t}`);
      if (t > 1) assert.ok(b < t || m.tickToMinutes(t) - 60 < m.tickToMinutes(1), `-60 no-op at ${t}`);
      assert.ok(f >= prevF && b >= prevB, `not monotone at ${t}`); prevF = f; prevB = b;
    }
    for (const dm of [1, 5, 15, 30, 45, 90, 240, -1, -5, -15, -30, -45, -90, -240]) for (let t = 1; t <= T; t++) { const r = m.tickAfterMinutes(t, dm); assert.ok(Number.isInteger(r) && r >= 1 && r <= T); if (dm > 0) assert.ok(r >= t); else assert.ok(r <= t); }
    // half-segment rule: at t515 (42.3 min/tick) +-21.2 min or more must move
    assert.equal(m.tickAfterMinutes(515, 22), 516); assert.equal(m.tickAfterMinutes(516, -22), 515); assert.equal(m.tickAfterMinutes(516, -60), 513);
    assert.equal(m.tickAfterMinutes(538, 0), 538);
  });
  test('property test: random valid anchor sets stay strictly monotone with exact inverse', () => {
    const r = rng(20260930);
    for (let k = 0; k < 60; k++) {
      const mm = makeTimeModel(randomDoc(r));
      for (let t = 1; t <= mm.tickMax; t++) { if (t > 1) assert.ok(mm.tickToMinutes(t) > mm.tickToMinutes(t - 1)); assert.ok(Math.abs(mm.minutesToTick(mm.tickToMinutes(t)) - t) < 1e-9); }
      for (let i = 0; i < 50; i++) { const t = 1 + r() * (mm.tickMax - 1); assert.ok(Math.abs(mm.minutesToTick(mm.tickToMinutes(t)) - t) < 1e-9); }
      for (const a of mm.anchors) assert.equal(mm.tickToMinutes(a.tick), a.minutes);
    }
  });
  test('the 33 anchors: slope 0.83-42.33 min/tick, lulls and stalls as reported, span 63.0 h', () => {
    const slopes = []; for (let i = 1; i < A.length; i++) slopes.push((parseLocal(A[i].t) - parseLocal(A[i - 1].t)) / (A[i].tick - A[i - 1].tick));
    assert.equal(A.length, 33); assert.equal(Math.min(...slopes).toFixed(2), '0.83'); assert.equal(Math.max(...slopes).toFixed(2), '42.33');
    assert.equal(((parseLocal(A[32].t) - parseLocal(A[0].t)) / 674).toFixed(2), '5.61', 'chapter 04 mean 5.61 min/tick is the tick-weighted mean (63.0 h / 674 steps)');
    assert.equal(((parseLocal(A[32].t) - parseLocal(A[0].t)) / 60).toFixed(1), '63.0');
    const lulls = []; slopes.forEach((s, i) => { if (s > 15) lulls.push(`${A[i].tick}-${A[i + 1].tick}`); });
    assert.deepEqual(lulls, ['5-12', '226-240', '240-248', '515-518']);
    const stalls = []; slopes.forEach((s, i) => { if (s < 1.5) stalls.push(`${A[i].tick}-${A[i + 1].tick}`); });
    assert.deepEqual(stalls, ['295-302', '302-314']);
    assert.equal(Math.round(m.minutesPerTick(5) * 10) / 10, 18.6);
  });
  test('night ticks: 220 of 675 (32.6%) are full night (before 04:03 or after 20:46) [chapter 04 section 2.1]', () => {
    let n = 0; for (let t = 1; t <= T; t++) if (tickToClock(t).night) n++;
    assert.equal(n, 220); assert.equal((n / T * 100).toFixed(1), '32.6');
  });
  test('honest approximate flags: every tick is approximate while nothing is signed; only signed anchors below sigma 10 could clear it', () => {
    for (let t = 1; t <= T; t++) { assert.equal(tickToClock(t).approx, true); assert.equal(tickToClock(t).signed, false); assert.match(tickToLabel(t), /about /); }
    assert.equal(tickToLabel(538, { approx: false }), 'Fri, July 3 · 3:00 PM');
    // sign t12 (sigma 5) and t518 (sigma 5): those two exact ticks drop the pill, neighbours keep it
    const d = JSON.parse(JSON.stringify(doc)); for (const a of d.anchors) if (a.tick === 12 || a.tick === 518) { a.state = 'signed'; a.decision = 'D-0001'; }
    const s = makeTimeModel(d);
    assert.equal(s.tickToClock(12).approx, false); assert.equal(s.tickToClock(518).approx, false); assert.equal(s.tickToClock(13).approx, true);
    assert.equal(s.tickToLabel(12), 'Wed, July 1 · 7:30 AM'); assert.equal(s.tickToLabel(28), 'Wed, July 1 · about 10:15 AM');
    // sigma >= approx_sigma_min keeps the pill even when signed
    const d2 = JSON.parse(JSON.stringify(doc)); for (const a of d2.anchors) if (a.tick === 28) { a.state = 'signed'; a.decision = 'D-0002'; }
    assert.equal(makeTimeModel(d2).tickToClock(28).approx, true);
  });
  test('per-anchor flags: R anchors need a historian, D anchors need the owner, t5 is circular', () => {
    const by = (s) => m.anchors.filter((a) => a.status === s).map((a) => a.tick);
    assert.deepEqual(by('R'), [75, 90, 248, 275, 538]); assert.deepEqual(by('D'), [100, 226, 675]);
    for (const a of m.anchors) { assert.equal(a.approx, true); if (a.status === 'R') assert.equal(a.review, 'needs-historian'); if (a.status === 'D') assert.equal(a.review, 'owner-sign'); }
    assert.equal(m.anchors.find((a) => a.tick === 5).circular, true);
    assert.equal(tickToClock(538).review, 'needs-historian'); assert.equal(tickToClock(540).review, 'needs-historian'); assert.equal(tickToClock(12).review, 'none');
    assert.equal(tickToClock(100).basis, 'D'); assert.equal(tickToClock(12).basis, 'A');
  });
  test('contested moments expose a range: R anchors are contested, anchorRange gives the "between about" text, band is +- sigma', () => {
    assert.equal(m.anchorRange(275).text, 'between about 5:10 and 7:00 PM'); assert.equal(m.anchorRange(538).text, 'between about 2:00 and 3:00 PM'); assert.equal(m.anchorRange(248).text, 'between about 12:00 and 3:30 PM');
    assert.equal(m.anchorRange(12).text, 'about 7:30 AM'); assert.equal(m.anchorRange(13), null); assert.equal(m.anchorRange(90).contested, true); assert.equal(m.anchorRange(28).contested, false);
    for (const t of [75, 90, 248, 275, 538]) assert.equal(tickToClock(t).contested, true, `t${t}`);
    assert.equal(tickToClock(540).contested, true, 'a tick beside an R anchor is in a contested segment'); assert.equal(tickToClock(300).contested, false);
    const c = tickToClock(538); assert.deepEqual(c.band, [m.tickToMinutes(538) - 30, m.tickToMinutes(538) + 30]);
    const d = JSON.parse(JSON.stringify(doc)); d.anchors.find((a) => a.tick === 28).state = 'contested'; assert.equal(makeTimeModel(d).tickToClock(28).contested, true);
  });
  test('gaps and lulls are exposed', () => {
    assert.equal(tickToClock(230).gap, 'fast_forward'); assert.equal(tickToClock(240).gap, null); assert.equal(m.isGap(516), true); assert.equal(m.isGap(518), false);
    assert.equal(tickToClock(230).lull, true); assert.equal(tickToClock(300).lull, false);
  });
  test('dayPart follows the solar table', () => {
    assert.equal(m.dayPart(1), 'dawn'); assert.equal(m.dayPart(12), 'morning'); assert.equal(m.dayPart(53), 'afternoon'); assert.equal(m.dayPart(90), 'evening'); assert.equal(m.dayPart(100), 'dusk');
    assert.equal(m.dayPart(150), 'night'); assert.equal(m.dayPart(326), 'dusk', 'Early attacks East Cemetery Hill at 8 PM: dusk, not night and not afternoon');
    assert.equal(m.dayPart(451), 'dawn');
  });
  test('tickToLabelParts', () => {
    const p = m.tickToLabelParts(160); assert.deepEqual([p.day, p.time, p.approx, p.night, p.prefix], ['Night of July 1-2', '12:05 AM', true, true, 'about ']);
    assert.equal(m.tickToLabelParts(538, { approx: false }).text, 'Fri, July 3 · 3:00 PM');
  });
  test('performance: tickToClock and tickToLabel stay far below 5 microseconds on average (TX-12 budget, generous CI margin)', () => {
    const N = 200000; let s = 0;
    for (let w = 0; w < 5000; w++) s += tickToClock(1 + (w % T)).minute;
    let t0 = process.hrtime.bigint(); for (let i = 0; i < N; i++) s += tickToClock(1 + (i % T)).hour24; const a = Number(process.hrtime.bigint() - t0) / N / 1000;
    t0 = process.hrtime.bigint(); for (let i = 0; i < N; i++) s += tickToLabel(1 + (i % T)).length; const b = Number(process.hrtime.bigint() - t0) / N / 1000;
    t0 = process.hrtime.bigint(); for (let i = 0; i < N; i++) s += m.tickToMinutes(1 + ((i * 7) % T) + 0.5); const c = Number(process.hrtime.bigint() - t0) / N / 1000;
    console.log(`# perf (us/call, memoised ints): tickToClock ${a.toFixed(3)}, tickToLabel ${b.toFixed(3)}, tickToMinutes(fraction) ${c.toFixed(3)}  [${s > 0 ? 'ok' : ''}]`);
    assert.ok(a <= 5 && b <= 5 && c <= 5, `avg us/call: ${a} ${b} ${c}`);
  });
  test('an off-anchor fractional tick is interpolated linearly inside its segment', () => {
    assert.equal(m.tickToMinutes(538.5), (m.tickToMinutes(538) + m.tickToMinutes(539)) / 2);
    assert.equal(isoFromMinutes(Math.round(m.tickToMinutes(20))), '1863-07-01T08:53');
  });
});
