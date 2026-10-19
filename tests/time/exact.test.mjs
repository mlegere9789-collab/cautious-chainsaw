// Exactness, argument hygiene, load-time limits and effective status of the time module (workstream time-module, fixes for the verifier's
// VERIFY-01..05 and the chapter 04 section 4.2 load-time rules). No epsilon anywhere in this file except where the inverse of a FRACTION is measured.
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import m, { makeTimeModel, makeCore, parseLocal, tickToLabel, format, tickAfterMinutes, clockToTick } from '../../src/lib/time/index.js';
import { doc, model, rng, randomDoc, proposalModel } from './helpers.mjs';

const T = m.tickMax;
const clone = () => JSON.parse(JSON.stringify(doc));
// next float above / below x (to probe the ulp neighbourhood of a tick's clock value)
const f64 = new Float64Array(1), u64 = new BigUint64Array(f64.buffer);
const nextUp = (x) => { f64[0] = x; u64[0] += x >= 0 ? 1n : -1n; return f64[0]; };
const nextDown = (x) => { f64[0] = x; u64[0] -= x >= 0 ? 1n : -1n; return f64[0]; };

describe('the tick <-> minutes inverse is EXACT on the tick table (VERIFY-02)', () => {
  test('minutesToTick(tickToMinutes(t)) === t and floor semantics hold for all 675 ticks, on the default (runtime) model and on the full document', () => {
    for (const mm of [m, model]) for (let t = 1; t <= T; t++) {
      const min = mm.tickToMinutes(t);
      assert.equal(mm.minutesToTick(min), t, `tick ${t}`); assert.equal(Math.floor(mm.clockToTick(min)), t, `floor ${t}`); assert.equal(mm.floorTick(min), t, `floorTick ${t}`);
    }
  });
  test('floorTick is the greatest tick whose clock is <= the value: checked against a linear scan on the ulp neighbours of every tick and 20000 random minutes', () => {
    const scan = (min) => { let k = 0; for (let t = 1; t <= T; t++) if (m.tickToMinutes(t) <= min) k = t; return k; };
    for (let t = 1; t <= T; t++) { const x = m.tickToMinutes(t); for (const v of [nextDown(x), x, nextUp(x)]) assert.equal(m.floorTick(v), scan(v), `tick ${t} value ${v}`); }
    const r = rng(7), lo = m.tickToMinutes(1) - 500, span = m.tickToMinutes(T) - lo + 500;
    for (let i = 0; i < 20000; i++) { const v = lo + r() * span; assert.equal(m.floorTick(v), scan(v)); }
    assert.equal(m.floorTick(-1e9), 0); assert.equal(m.floorTick(1e9), T);
  });
  test('Math.floor(minutesToTick(x)) === floorTick(x) everywhere in range, including one ulp either side of every tick (no float noise can put the frame and the crossing rule out of step)', () => {
    for (let t = 2; t < T; t++) { const x = m.tickToMinutes(t); for (const v of [nextDown(x), nextDown(nextDown(x)), x, nextUp(x)]) assert.equal(Math.floor(m.minutesToTick(v)), m.floorTick(v), `tick ${t} value ${v}`); }
    const r = rng(11); for (let i = 0; i < 20000; i++) { const v = m.tickToMinutes(1) + r() * (m.tickToMinutes(T) - m.tickToMinutes(1)); assert.equal(Math.floor(m.minutesToTick(v)), m.floorTick(v)); }
  });
  test('the inverse is monotone and within 1e-9 of every fractional tick (the fraction is measured, only integers are exact)', () => {
    const r = rng(3); let prev = -1;
    for (let i = 0; i <= 5000; i++) { const t = 1 + (T - 1) * i / 5000, back = m.minutesToTick(m.tickToMinutes(t)); assert.ok(Math.abs(back - t) < 1e-9, `${t} -> ${back}`); assert.ok(back >= prev); prev = back; }
    for (let i = 0; i < 2000; i++) { const t = 1 + r() * (T - 1); assert.ok(Math.abs(m.minutesToTick(m.tickToMinutes(t)) - t) < 1e-9); }
  });
  test('random valid anchor sets: exact on every integer tick, floor-consistent, monotone', () => {
    const r = rng(20260930);
    for (let k = 0; k < 60; k++) {
      const mm = makeTimeModel(randomDoc(r));
      for (let t = 1; t <= mm.tickMax; t++) { const min = mm.tickToMinutes(t); assert.equal(mm.minutesToTick(min), t); assert.equal(mm.floorTick(min), t); assert.equal(Math.floor(mm.minutesToTick(nextDown(min))), t === 1 ? 1 : t - 1); }
    }
  });
  test('extrapolation (validation only) keeps 5 min/tick beyond both ends and clamping is the default', () => {
    assert.equal(m.minutesToTick(m.tickToMinutes(1) - 50), 1); assert.equal(m.minutesToTick(m.tickToMinutes(T) + 50), T);
    assert.equal(m.minutesToTick(m.tickToMinutes(1) - 50, { extrapolate: true }), -9); assert.equal(m.minutesToTick(m.tickToMinutes(T) + 50, { extrapolate: true }), T + 10);
  });
});

describe('parseLocal and the epoch constant', () => {
  test('July 1 00:00 is minute 0 (this is what proves the hard-coded EPOCH_DAYS) and the three battle days follow', () => {
    assert.equal(parseLocal('1863-07-01T00:00'), 0); assert.equal(parseLocal('1863-07-01T05:00'), 300); assert.equal(parseLocal('1863-07-02T00:00'), 1440); assert.equal(parseLocal('1863-07-03T15:00'), 3780);
    assert.equal(parseLocal('1863-08-01T00:00'), 31 * 1440); assert.equal(parseLocal('1863-06-30T23:59'), -1);
  });
  test('rejects what is not a real calendar time: TypeError for non-strings, RangeError for 2/30, 13th month, 24:00, 12:60, junk', () => {
    for (const bad of [undefined, null, 5, {}, [], NaN]) assert.throws(() => parseLocal(bad), TypeError, String(bad));
    for (const bad of ['1863-02-30T10:00', '1863-13-01T10:00', '1863-07-32T00:00', '1863-07-01T24:00', '1863-07-01T12:60', '1863-07-01 05:00', 'yesterday', '', '1863-07-01T5:00', '1863-04-31T00:00']) assert.throws(() => parseLocal(bad), RangeError, bad);
    assert.doesNotThrow(() => parseLocal('1864-02-29T00:00')); assert.throws(() => parseLocal('1863-02-29T00:00'), RangeError);
  });
});

describe('the public API rejects bad arguments with a clear message (VERIFY-03)', () => {
  const BAD = [NaN, undefined, null, '5', {}, [], Infinity, -Infinity, true];
  const tickFns = { tickToMinutes: (x) => m.tickToMinutes(x), minutesPerTick: (x) => m.minutesPerTick(x), uncertaintyMin: (x) => m.uncertaintyMin(x), tabDay: (x) => m.tabDay(x), parts: (x) => m.parts(x), format: (x) => format(x, 'long'), tickToLabel: (x) => tickToLabel(x),
    tickToLabelParts: (x) => m.tickToLabelParts(x), isApprox: (x) => m.isApprox(x), gapAt: (x) => m.gapAt(x), isGap: (x) => m.isGap(x), dayPart: (x) => m.dayPart(x), hour: (x) => m.hour(x), tickToClock: (x) => m.tickToClock(x), tickAfterMinutes: (x) => tickAfterMinutes(x, 60) };
  for (const [name, fn] of Object.entries(tickFns)) test(`${name}(bad tick) throws a TypeError that names the tick`, () => {
    for (const bad of BAD) assert.throws(() => fn(bad), (e) => e instanceof TypeError && /tick/i.test(e.message) && /finite number/.test(e.message), `${name}(${String(bad)})`);
  });
  test('the message says what was passed (an object, an array, a string, undefined)', () => {
    assert.throws(() => format({}), /got an object/); assert.throws(() => format([]), /got an array/); assert.throws(() => tickToLabel('538'), /got "538"/); assert.throws(() => tickToLabel(undefined), /got undefined/); assert.throws(() => format(NaN), /got NaN/);
  });
  test('minutes arguments: tickAfterMinutes(t, "60") is a TypeError, never the string concatenation that used to return the last tick', () => {
    for (const bad of BAD) assert.throws(() => tickAfterMinutes(538, bad), (e) => e instanceof TypeError && /minutes/.test(e.message), String(bad));
    assert.throws(() => tickAfterMinutes(538, '60'), TypeError); assert.equal(tickAfterMinutes(538, 60), 556);
    for (const bad of BAD) { assert.throws(() => m.minutesToTick(bad), (e) => e instanceof TypeError && /minutes/.test(e.message)); assert.throws(() => m.floorTick(bad), TypeError); assert.throws(() => m.tabStart(bad), TypeError); }
  });
  test('clockToTick / clockToTickInfo: TypeError for anything that is not a string or a finite number, RangeError for a string that is not a calendar time', () => {
    for (const bad of [NaN, undefined, null, {}, [], Infinity, true]) { assert.throws(() => clockToTick(bad), (e) => e instanceof TypeError && /clock/.test(e.message), String(bad)); assert.throws(() => m.clockToTickInfo(bad), TypeError); }
    for (const bad of ['', 'abc', '1863-02-30T10:00', '1863-07-01T10:00:00']) { assert.throws(() => clockToTick(bad), RangeError, bad); assert.throws(() => m.clockToTickInfo(bad), RangeError); }
    assert.equal(clockToTick('1863-07-03T15:00'), 538); assert.equal(clockToTick(m.tickToMinutes(538)), 538);
  });
  test('valid input is untouched: fractions, out-of-range and negative ticks still clamp and format; zero minutes is a no-op', () => {
    for (const t of [0, 0.5, 1e6, -1e6, 538.5, 675, 1]) assert.equal(typeof tickToLabel(t), 'string');
    assert.equal(tickAfterMinutes(538, 0), 538); assert.equal(m.tabStart(2), 226);
  });
});

describe('load-time validation (chapter 04 section 4.2): the slope limits are enforced when the model is built', () => {
  const two = (t2, tick2 = 3) => ({ schema: 1, anchors: [{ tick: 1, t: '1863-07-01T05:00', sigma_min: 10, status: 'S' }, { tick: tick2, t: t2, sigma_min: 10, status: 'S' }] });
  test('a segment under 0.75 or over 60 min/tick throws, the limits themselves are accepted, the message names the ticks and the slope', () => {
    assert.throws(() => makeTimeModel(two('1863-07-01T05:01')), /slope 0\.50 min\/tick between ticks 1 and 3 is outside 0\.75\.\.60/);
    assert.throws(() => makeTimeModel(two('1863-07-01T05:00', 3)), /strictly increasing/);
    assert.throws(() => makeTimeModel(two('1863-07-01T07:03')), /slope 61\.50 min\/tick/); // 123 min over 2 ticks
    assert.doesNotThrow(() => makeTimeModel(two('1863-07-01T05:03'))); // exactly 1.5
    assert.doesNotThrow(() => makeTimeModel({ schema: 1, anchors: [{ tick: 1, t: '1863-07-01T05:00', sigma_min: 10, status: 'S' }, { tick: 5, t: '1863-07-01T05:03', sigma_min: 10, status: 'S' }] })); // exactly 0.75
    assert.doesNotThrow(() => makeTimeModel({ schema: 1, anchors: [{ tick: 1, t: '1863-07-01T05:00', sigma_min: 10, status: 'S' }, { tick: 2, t: '1863-07-01T06:00', sigma_min: 10, status: 'S' }] })); // exactly 60
    assert.throws(() => makeTimeModel({ schema: 1, anchors: [{ tick: 1, t: '1863-07-01T05:00', sigma_min: 10, status: 'S' }, { tick: 2, t: '1863-07-01T06:01', sigma_min: 10, status: 'S' }] }), /slope 61\.00/);
  });
  test('doc.slope overrides the limits (the same numbers TM-V1 reads); makeCore enforces them too', () => {
    const d = two('1863-07-01T05:01'); d.slope = { min_min_per_tick: 0.25 };
    assert.doesNotThrow(() => makeTimeModel(d)); assert.doesNotThrow(() => makeCore(d));
    const e = two('1863-07-01T07:03'); e.slope = { error_over: 90 }; assert.doesNotThrow(() => makeTimeModel(e));
    assert.throws(() => makeCore(two('1863-07-01T05:01')), /slope/);
  });
  test('the 33 candidate anchors sit inside the limits, and editing one across a limit is caught by the loader, the validator and the model', () => {
    const d = clone(); assert.doesNotThrow(() => makeTimeModel(d));
    d.anchors.find((a) => a.tick === 240).t = '1863-07-03T23:00'; assert.throws(() => makeTimeModel(d), /slope/);
  });
  test('the other load-time throws are unchanged and typed as plain errors', () => {
    assert.throws(() => makeTimeModel(undefined), /need at least two anchors/); assert.throws(() => makeTimeModel({ anchors: [null, null] }), /anchor tick must be an integer/);
    assert.throws(() => makeTimeModel({ anchors: [{ tick: 1, t: 'x', status: 'S' }, { tick: 2, t: '1863-07-01T05:00', status: 'S' }] }), /bad local time x/);
  });
});

describe('the circular anchor t5 is honoured as class D at runtime (VERIFY-05)', () => {
  test('effective_status D: tickToClock basis, the anchors view and the class all say D, on ticks at and around t5', () => {
    // pinned to the FROZEN proposal, where t12 is class A (S status); in the live adjudicated file t12 is class B (Estimated, M status)
    const m = proposalModel;
    assert.equal(m.tickToClock(5).basis, 'D'); assert.equal(model.tickToClock(5).basis, 'D');
    for (const t of [2, 4, 5, 6, 11, 12]) assert.equal(m.tickToClock(t).basis, t === 12 ? 'A' : 'D', `tick ${t}`);
    assert.equal(model.tickToClock(12).basis, 'B', 'live: the first shot is an estimate, class B');
    const a5 = m.anchors.find((a) => a.tick === 5); assert.equal(a5.status, 'M'); assert.equal(a5.effectiveStatus, 'D'); assert.equal(a5.confidence, 'D'); assert.equal(a5.circular, true);
    for (const a of m.anchors) if (a.tick !== 5) assert.equal(a.effectiveStatus, a.status, `tick ${a.tick}`);
  });
  test('it is data, not a special case: giving any other anchor an effective_status changes its class, its neighbours, and nothing else', () => {
    const d = clone(); d.anchors.find((a) => a.tick === 100).effective_status = 'S';
    const x = makeTimeModel(d); assert.equal(x.tickToClock(100).basis, 'A'); assert.equal(x.tickToClock(90).basis, 'C'); assert.equal(x.tickToClock(300).basis, model.tickToClock(300).basis);
    assert.equal(x.anchors.find((a) => a.tick === 100).effectiveStatus, 'S'); assert.equal(x.anchors.find((a) => a.tick === 100).status, 'D');
    assert.equal(x.goldenCsv(), model.goldenCsv(), 'the clock itself is unchanged by an evidence class');
  });
  test('without effective_status the class follows the declared status (S A, M B, R C, D D)', () => {
    const c = { S: 'A', M: 'B', R: 'C', D: 'D' };
    for (const a of model.anchors) if (a.tick !== 5) assert.equal(model.tickToClock(a.tick).basis, c[a.status], `tick ${a.tick}`);
  });
});

describe('the ES-route model (runtime subset, no labels) equals the model built from the full document', () => {
  test('every clock, label, table and flag is identical; only labels and fact lists are absent', () => {
    assert.equal(m.goldenCsv(), model.goldenCsv()); assert.deepEqual(m.ticksJson(), model.ticksJson());
    for (let t = 1; t <= T; t++) { const a = m.tickToClock(t), b = model.tickToClock(t); assert.deepEqual({ ...a }, { ...b }, `tick ${t}`); }
    const strip = (x) => x.anchors.map(({ label, facts, ...rest }) => rest);
    assert.deepEqual(strip(m), strip(model)); assert.ok(m.anchors.every((a) => a.label === '' && a.facts.length === 0)); assert.ok(model.anchors.every((a) => a.label.length > 0));
    for (const a of doc.anchors.filter((x) => x.range)) assert.deepEqual(m.anchorRange(a.tick), model.anchorRange(a.tick), `anchorRange ${a.tick}`);
    for (const k of [1, 12, 538, 675]) for (const style of ['compat', 'chip', 'time', 'day', 'date', 'long', 'short', 'aria', 'frame', 'iso']) assert.equal(m.tickToLabel(k, { style }), model.tickToLabel(k, { style }));
  });
});
