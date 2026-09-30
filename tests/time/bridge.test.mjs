// The bridge facade (the object the frozen bundle and the classic pages call): every numeric argument is coerced, nothing throws, nothing returns NaN,
// and it gives the same answers on the validating model and on the lean core the inline build ships (VERIFY-03, chapter 04 section 4.9).
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import m, { makeBridge, makeCore, makeTimeModel } from '../../src/lib/time/index.js';
import { doc } from './helpers.mjs';

const T = m.tickMax;
const HOSTILE = [NaN, undefined, null, 'x', '', ' ', '538', '5e2', {}, [], [538], { valueOf() { throw new Error('boom'); } }, Symbol('s'), 10n, true, false, Infinity, -Infinity, 1e9, -1e9, 1e300, -1e300, 0, -0, 0.5, 538.5, 676, -1];
const isTick = (x) => Number.isInteger(x) && x >= 1 && x <= T;

describe('makeBridge coerces every argument', () => {
  const b = makeBridge(m);
  test('f and x: a string for every hostile tick and every style, including an unknown style', () => {
    for (const bad of HOSTILE) for (const style of [undefined, 'compat', 'chip', 'time', 'day', 'date', 'long', 'short', 'aria', 'frame', 'iso', 'nonsense', null, 5]) {
      const s = b.f(bad, style), x = b.x(bad, style); assert.equal(typeof s, 'string', `f(${String(bad)}, ${style})`); assert.equal(typeof x, 'string'); assert.doesNotMatch(s + x, /NaN|undefined|Invalid/);
    }
  });
  test('after: an integer tick for every hostile tick and every hostile minutes value; NaN or undefined minutes means "do not move"', () => {
    for (const t of HOSTILE) for (const dm of HOSTILE) { const r = b.after(t, dm); assert.ok(isTick(r), `after(${String(t)}, ${String(dm)}) = ${r}`); }
    for (const dm of [NaN, undefined, null, 'x', {}, Symbol('s')]) assert.equal(b.after(538, dm), 538, `after(538, ${String(dm)})`);
    // in the 0.83 min/tick stall one minute WOULD move a tick: a bad minutes value must default to zero, not to one
    for (const dm of [NaN, undefined, 'x', {}, Symbol('s')]) assert.equal(b.after(305, dm), 305, `after(305, ${String(dm)})`); assert.equal(b.after(305, 1), 306);
    assert.equal(b.after(NaN, 60), b.after(1, 60)); assert.equal(b.after('538', '60'), 556); assert.equal(b.after(538, Infinity), T); assert.equal(b.after(538, -Infinity), 1);
  });
  test('hour, phase, tab, approx, minutes, tickAt, tabStart: right type for every hostile value', () => {
    for (const bad of HOSTILE) {
      const h = b.hour(bad); assert.ok(Number.isFinite(h) && h >= 0 && h < 24, `hour(${String(bad)}) = ${h}`);
      assert.ok(['night', 'dawn', 'morning', 'afternoon', 'evening', 'dusk'].includes(b.phase(bad))); assert.ok([1, 2, 3].includes(b.tab(bad))); assert.equal(typeof b.approx(bad), 'boolean');
      assert.ok(Number.isFinite(b.minutes(bad))); const t = b.tickAt(bad); assert.ok(Number.isFinite(t) && t >= 1 && t <= T, `tickAt(${String(bad)}) = ${t}`); assert.ok([1, 226, 451].includes(b.tabStart(bad)), `tabStart(${String(bad)})`);
    }
  });
  test('values stay what they were: constants, rounding policy, "about", tab ranges', () => {
    assert.deepEqual([b.version, b.dv, b.tickMax], [m.version, m.dv, T]); assert.equal(b.f(12), 'July 1, about 7:30 AM'); assert.equal(b.x(12), 'July 1, 7:30 AM'); assert.equal(b.f(226, 'day'), 'July 2');
    assert.equal(b.tabStart(2), 226); assert.equal(b.tabStart(3), 451); assert.equal(b.tab(450), 2); assert.equal(b.tab(451), 3); assert.equal(b.after(538, 60), 556); assert.equal(b.after(538, 0), 538);
  });
  test('the frame style is a tooltip string only: "Frame n of 675"', () => {
    assert.equal(b.f(538, 'frame'), 'Frame 538 of 675'); assert.equal(b.x(1, 'frame'), 'Frame 1 of 675'); assert.equal(b.f(NaN, 'frame'), 'Frame 1 of 675'); assert.equal(b.f(1e9, 'frame'), 'Frame 675 of 675');
    for (const style of ['compat', 'chip', 'time', 'day', 'date', 'long', 'short', 'aria']) for (let t = 1; t <= T; t++) assert.doesNotMatch(b.f(t, style), /Frame|tick/i, `${style} ${t}`);
  });
});

describe('the bridge on the lean core equals the bridge on the validating model (what the inline build relies on)', () => {
  const lean = makeBridge(makeCore(doc)), full = makeBridge(makeTimeModel(doc)), dflt = makeBridge(m);
  test('every method, every tick, every style, plus the hostile battery', () => {
    for (let t = 1; t <= T; t++) {
      for (const style of ['compat', 'chip', 'time', 'day', 'date', 'long', 'short', 'aria', 'frame', 'iso']) { assert.equal(lean.f(t, style), full.f(t, style), `${t} ${style}`); assert.equal(lean.x(t, style), full.x(t, style)); assert.equal(dflt.f(t, style), full.f(t, style)); }
      for (const dm of [60, -60, 5, -5, 240, 1, -1]) assert.equal(lean.after(t, dm), full.after(t, dm), `${t} ${dm}`);
      assert.equal(lean.hour(t), full.hour(t)); assert.equal(lean.phase(t), full.phase(t)); assert.equal(lean.tab(t), full.tab(t)); assert.equal(lean.approx(t), full.approx(t)); assert.equal(lean.minutes(t), full.minutes(t)); assert.equal(lean.tickAt(lean.minutes(t)), t);
    }
    for (const bad of HOSTILE) { assert.equal(lean.f(bad), full.f(bad)); assert.equal(lean.after(bad, bad), full.after(bad, bad)); assert.equal(lean.tickAt(bad), full.tickAt(bad)); assert.equal(lean.tabStart(bad), full.tabStart(bad)); }
  });
});
