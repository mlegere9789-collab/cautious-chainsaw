// Boundary guards found by an independent mutation run of the time module (96 one-line mutants, 28 survived the fixer's suite).
// Every test here PASSES on the current code (it pins behaviour that is correct today and that no test pinned); each one names the survivor
// it kills. They fail if a later change moves the boundary. Written by the re-verifier (no code was changed).
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import m, { makeTimeModel, createPlayback, storyPace, makeBridge, validateAnchors } from '../../src/lib/time/index.js';
import { doc } from './helpers.mjs';

const clone = (x) => JSON.parse(JSON.stringify(x));
// a tiny document: ticks 1..10, every anchor spelled out
const tiny = (over = {}) => Object.assign({ version: 'x', dv: 2, tick_max: 10, tab_days: [[1, 4], [5, 10]], approx_sigma_min: 10, anchors: [
  { tick: 1, min: 300, sigma_min: 5, status: 'M', state: 'signed' }, { tick: 5, min: 340, sigma_min: 5, status: 'D', state: 'proposed' }, { tick: 10, min: 400, sigma_min: 5, status: 'S', state: 'signed' }] }, over);

describe('gaps: [from, to) is inclusive at the start and exclusive at the end (mutant "gapAt from >=" -> ">")', () => {
  test('the real document: 225 is outside, 226..239 inside, 240 outside; 514 outside, 515..517 inside, 518 outside', () => {
    for (const [t, inside] of [[225, false], [226, true], [227, true], [239, true], [240, false], [514, false], [515, true], [517, true], [518, false]]) { assert.equal(m.gapAt(t) !== null, inside, `gapAt(${t})`); assert.equal(m.isGap(t), inside, `isGap(${t})`); assert.equal(m.tickToClock(t).gap !== null, inside, `tickToClock(${t}).gap`); }
  });
});

describe('the last anchor speaks for the last tick alone (mutant "basis exact-b branch": ends [a, b])', () => {
  test('tick 10 is exactly the signed, sigma-5 anchor: signed, exact, class A even though the anchor before it is an unsigned D', () => {
    const x = makeTimeModel(tiny()), c = x.tickToClock(10);
    assert.equal(c.basis, 'A'); assert.equal(c.signed, true); assert.equal(c.approx, false); assert.equal(c.sigmaMin, 5);
    const mid = x.tickToClock(7); assert.equal(mid.basis, 'D'); assert.equal(mid.signed, false); assert.equal(mid.approx, true);
    const first = x.tickToClock(5); assert.equal(first.basis, 'D'); assert.equal(first.signed, false); // an interior anchor also speaks alone
  });
});

describe('review flags rank none < evidence-weak < owner-sign < owner-decision < needs-historian (mutant "review rank")', () => {
  const RANKS = ['none', 'evidence-weak', 'owner-sign', 'owner-decision', 'needs-historian'];
  test('the tick between two anchors carries the higher-ranked flag, for all 25 ordered pairs', () => {
    for (const [i, x] of RANKS.entries()) for (const [j, y] of RANKS.entries()) {
      const d = tiny(); d.anchors[0].review_flag = x; d.anchors[1].review_flag = y;
      assert.equal(makeTimeModel(d).tickToClock(3).review, RANKS[Math.max(i, j)], `${x} vs ${y}`);
    }
  });
});

describe('URL parameter resolution (mutant "resolveTickParam digits" {1,6} -> {1,3})', () => {
  test('up to 6 digits are read and clamped; 7 digits, signs, fractions and words are not ticks; tick wins over t', () => {
    assert.equal(m.resolveTickParam({ tick: '1234' }), 675); assert.equal(m.resolveTickParam({ t: '0' }), 1); assert.equal(m.resolveTickParam({ tick: '538' }), 538); assert.equal(m.resolveTickParam({ tick: '999999' }), 675);
    for (const bad of ['1234567', '-5', '5.5', 'abc', '', ' 5', '5 ']) assert.equal(m.resolveTickParam({ tick: bad }), null, JSON.stringify(bad));
    assert.equal(m.resolveTickParam(new URLSearchParams('t=12')), 12); assert.equal(m.resolveTickParam(new URLSearchParams('tick=7&t=12')), 7); assert.equal(m.resolveTickParam(null), null); assert.equal(m.resolveTickParam({}), null);
  });
});

describe('playback defaults and policies (mutants "default rate", "default tick", "gap policy", "seekMinutes lower clamp")', () => {
  test('defaults: rate 5 battle-minutes per second, starts on tick 1, dt clamp 100 ms, gap pace 60', () => {
    const pb = createPlayback(m); assert.equal(pb.rate, 5); assert.equal(pb.tick, 1); assert.equal(pb.minutes, m.tickToMinutes(1));
    const a = createPlayback(m).advance(5000), b = createPlayback(m).advance(100); assert.equal(a.tick, b.tick); assert.equal(a.prevTick, 1);
    const g = createPlayback(m, { tick: 226 }).advance(16); assert.equal(g.gap, 'fast_forward'); assert.equal(g.rate, 60); assert.equal(createPlayback(m, { tick: 100 }).advance(16).gap, null);
  });
  test('only a fast_forward gap accelerates: time_lapse keeps the pace, a pace above the gap pace is kept, and step.gap names the policy', () => {
    const tl = makeTimeModel(tiny({ gaps: [{ from: 3, to: 6, policy: 'time_lapse' }] })), ff = makeTimeModel(tiny({ gaps: [{ from: 3, to: 6, policy: 'fast_forward' }] }));
    const a = createPlayback(tl, { tick: 3, rate: 5 }).advance(16); assert.equal(a.gap, 'time_lapse'); assert.equal(a.rate, 5);
    const b = createPlayback(ff, { tick: 3, rate: 5 }).advance(16); assert.equal(b.gap, 'fast_forward'); assert.equal(b.rate, 60);
    const c = createPlayback(ff, { tick: 3, rate: 120, gapRate: 30 }).advance(16); assert.equal(c.rate, 120);
  });
  test('seekMinutes clamps to the first and last clock value', () => {
    const pb = createPlayback(m); pb.seekMinutes(-1e9); assert.equal(pb.minutes, m.tickToMinutes(1)); assert.equal(pb.tick, 1);
    assert.deepEqual(pb.advance(1e9).crossed, m.floorTick(pb.minutes) > 1 ? [2, m.floorTick(pb.minutes)] : null); // a step starts from tick 1, never from "tick 0"
    pb.seekMinutes(1e9); assert.equal(pb.minutes, m.tickToMinutes(675)); assert.equal(pb.advance(16).done, true);
  });
});

describe('Story-pace label rounding (mutant "storyPace threshold" 2.5 -> 3)', () => {
  test('below 2.5 battle-min/s the label is the rounded value (at least 1), from 2.5 it is the nearest 5', () => {
    const at = (v) => storyPace({ minutesPerTick: () => v }, 10, 1, 1).label;
    for (const [v, want] of [[0.4, 1], [1.6, 2], [2.4, 2], [2.5, 5], [2.75, 5], [7.4, 5], [7.5, 10], [12.4, 10], [84.7, 85]]) assert.equal(at(v), want, `v=${v}`);
  });
});

describe('small fixes in the lean core (mutants "format frame round", "tabStart fallback", "sigma default", "approx_sigma default")', () => {
  test('the frame string rounds a fractional tick to the nearest frame', () => { assert.equal(m.format(538.5, 'frame'), 'Frame 539 of 675'); assert.equal(m.format(538.4, 'frame'), 'Frame 538 of 675'); assert.equal(m.format(0, 'frame'), 'Frame 1 of 675'); assert.equal(m.format(9999, 'frame'), 'Frame 675 of 675'); });
  test('tabStart of a day that does not exist is the first tab', () => { for (const d of [0, -1, 4, 99, 1.5]) assert.equal(m.tabStart(d), 1, String(d)); assert.equal(m.tabStart(2), 226); assert.equal(m.tabStart(3), 451); });
  test('a document without sigma_min and approx_sigma_min gets 15 minutes per anchor and the 10-minute threshold', () => {
    const x = makeTimeModel({ version: 'x', anchors: [{ tick: 1, min: 300 }, { tick: 3, min: 310 }] });
    assert.equal(x.uncertaintyMin(1), 15); assert.equal(x.uncertaintyMin(3), 15); assert.equal(x.approxSigmaMin, 10); assert.equal(x.isApprox(1), true);
  });
  test('the bridge: a bad tick is tick 1 for EVERY method (minutes, tickAt of a bad minutes value is the first tick)', () => {
    const b = makeBridge(m); for (const bad of [NaN, undefined, 'x', {}]) { assert.equal(b.minutes(bad), m.tickToMinutes(1)); assert.equal(b.tickAt(bad), m.minutesToTick(0)); assert.equal(b.tabStart(bad), 1); assert.equal(b.tab(bad), 1); assert.equal(b.hour(bad), m.hour(1)); assert.equal(b.phase(bad), m.dayPart(1)); assert.equal(b.approx(bad), m.isApprox(1)); }
  });
});

describe('TM-V1 validator boundaries (mutants "anchors dv / sigma lower / tabs contiguous / slope under / slope over / gaps to / approx")', () => {
  const ok = (d) => validateAnchors(d);
  const codes = (d) => ok(d).errors.map((e) => e.code);
  const at = (path, v) => { const d = clone(doc); let o = d; for (const k of path.slice(0, -1)) o = o[k]; o[path[path.length - 1]] = v; return d; };
  test('dv: 1 is valid, 0 and 1.5 are not', () => { assert.equal(ok(at(['dv'], 1)).ok, true); assert.ok(codes(at(['dv'], 0)).includes('V1.dv')); assert.ok(codes(at(['dv'], 1.5)).includes('V1.dv')); });
  test('sigma_min: 1 is valid, 0.99 and 0 are not (and the cap is inclusive)', () => { assert.ok(!codes(at(['anchors', 3, 'sigma_min'], 1)).includes('V1.sigma')); for (const bad of [0.99, 0, -1]) assert.ok(codes(at(['anchors', 3, 'sigma_min'], bad)).includes('V1.sigma'), String(bad)); assert.ok(!codes(at(['anchors', 3, 'sigma_min'], 30)).includes('V1.sigma')); assert.ok(codes(at(['anchors', 3, 'sigma_min'], 30.5)).includes('V1.sigma')); });
  test('tab_days: overlapping ranges, gaps and a range that does not start at an anchor are all errors', () => {
    assert.ok(codes(at(['tab_days'], [[1, 225], [200, 450], [451, 675]])).includes('V1.tabs'), 'overlap'); assert.ok(codes(at(['tab_days'], [[1, 225], [227, 450], [451, 675]])).includes('V1.tabs'), 'gap');
    assert.ok(codes(at(['tab_days'], [[1, 225], [226, 450], [451, 674]])).includes('V1.tabs'), 'short'); assert.equal(ok(at(['tab_days'], [[1, 225], [226, 450], [451, 675]])).ok, true);
  });
  test('slope limits are inclusive in the validator too: exactly 0.75 and 60 min/tick are accepted, 0.7499 and 60.01 are errors (same numbers as the model)', () => {
    const d = (min2, tick2, min3, tick3) => ({ schema: 1, version: '2026-01-01.1', dv: 2, tz: 'LMT', tick_max: tick3, tab_days: [[1, tick3]], approx_sigma_min: 10, anchors: [
      { tick: 1, t: '1863-07-01T05:00', status: 'M', confidence: 'B', sigma_min: 10, state: 'proposed' }, { tick: tick2, t: min2, status: 'M', confidence: 'B', sigma_min: 10, state: 'proposed' }, { tick: tick3, t: min3, status: 'M', confidence: 'B', sigma_min: 10, state: 'proposed' }] });
    // 0.75: 4 ticks = 3 minutes; 60: 1 tick = 60 minutes
    assert.ok(!codes(d('1863-07-01T05:03', 5, '1863-07-01T05:06', 9)).includes('V1.slope'), '0.75 accepted'); assert.ok(!codes(d('1863-07-01T06:00', 2, '1863-07-01T07:00', 3)).includes('V1.slope'), '60 accepted');
    assert.ok(codes(d('1863-07-01T05:03', 5, '1863-07-01T05:05', 9)).includes('V1.slope'), 'under 0.75 (0.5)'); assert.ok(codes(d('1863-07-01T06:01', 2, '1863-07-01T07:01', 3)).includes('V1.slope'), 'over 60');
  });
  test('gaps: to may equal tick_max, not exceed it; from must be >= 1 and < to; policy is one of two', () => {
    assert.ok(!codes(at(['gaps'], [{ from: 100, to: 675, policy: 'fast_forward' }])).includes('V1.gaps')); assert.ok(codes(at(['gaps'], [{ from: 100, to: 676, policy: 'fast_forward' }])).includes('V1.gaps'));
    assert.ok(codes(at(['gaps'], [{ from: 0, to: 5, policy: 'fast_forward' }])).includes('V1.gaps')); assert.ok(codes(at(['gaps'], [{ from: 5, to: 5, policy: 'fast_forward' }])).includes('V1.gaps')); assert.ok(codes(at(['gaps'], [{ from: 5, to: 9, policy: 'warp' }])).includes('V1.gaps'));
  });
  test('approx_sigma_min: 0 is valid, -1 and "10" are not', () => { assert.equal(ok(at(['approx_sigma_min'], 0)).ok, true); for (const bad of [-1, '10', null]) assert.ok(codes(at(['approx_sigma_min'], bad)).includes('V1.approx'), String(bad)); });
  test('status R without the needs-historian flag is a warning, and R / needs-historian anchors are listed for the historian', () => {
    const d = clone(doc); const r = d.anchors.find((a) => a.status === 'R'); assert.ok(r, 'the candidate set has an R anchor'); const before = ok(d).info.needsHistorian;
    assert.ok(before.includes(r.tick)); assert.ok(!ok(d).warnings.some((w) => w.code === 'V1.review' && w.tick === r.tick), 'R with needs-historian is the expected pair');
    for (const flag of ['none', 'owner-sign', 'evidence-weak']) { r.review_flag = flag; const v = ok(d); assert.ok(v.warnings.some((w) => w.code === 'V1.review' && w.tick === r.tick), 'warning for R with ' + flag); assert.ok(v.info.needsHistorian.includes(r.tick), 'status R is listed even without the flag'); }
    const o = d.anchors.find((a) => a.status !== 'R' && a.tick !== r.tick); o.review_flag = 'needs-historian'; assert.ok(ok(d).info.needsHistorian.includes(o.tick), 'the flag alone lists a non-R anchor');
  });
});
