// Options are arguments (RV-02) and the bridge's style argument is coerced like every other argument (RV-04; S3d/S3e of the re-verification).
//
// The defect class: the public API rejected a bad TICK but took `roundMin`, `approx`, `style` and `extrapolate` on trust, so `roundMin: 'abc'` printed
// "NaN:NaN AM" and `approx: 'no'` printed "about" in one function and not in another; the bridge passed a Symbol or a throwing object straight into a
// string concatenation. These tests are generators over (function x option x hostile value), so a NEW function that takes an option, or a new option
// on an old one, is covered the day it exists:
//   - every public function that takes an option: a bad value is a TypeError (wrong kind) or RangeError (wrong range) whose message names the option;
//     it never returns, and never prints NaN / undefined / null / Infinity / [object;
//   - every good value gives a correct, clean result (the rounding really rounds to that many minutes; 'about' follows `approx`);
//   - the bridge never throws and never prints garbage for any style, and a style it does not know is 'compat' (the same in the inline build).
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import m, { makeBridge, makeCore, makeTimeModel } from '../../src/lib/time/index.js';
import { STYLES } from '../../src/lib/time/core.js';
import { buildInline } from '../../tools/time/inline.mjs';
import { P, readText } from '../../tools/time/lib.mjs';
import { doc, rng } from './helpers.mjs';

const T = m.tickMax;
const SAMPLE = [1, 2, 5, 12, 100, 160, 225, 226, 300, 451, 538, 675, 37.5, 0, 676, -4];
const GARBAGE = /NaN|undefined|null|Infinity|\[object|Invalid/;
const show = (v) => { try { return typeof v === 'symbol' ? 'Symbol()' : typeof v === 'function' ? 'function' : typeof v === 'bigint' ? v + 'n' : v === undefined ? 'undefined' : typeof v === 'number' && !Number.isFinite(v) ? String(v) : typeof v === 'string' && v.length > 40 ? JSON.stringify(v.slice(0, 40)) + '...' : JSON.stringify(v); } catch (e) { return typeof v; } };
/** no NaN / undefined / Infinity / [object ... anywhere in a result: numbers finite, strings clean, null allowed only where the API documents it (nightOf, gap) */
const clean = (v, where = '') => { if (typeof v === 'number') assert.ok(Number.isFinite(v), `${where} is ${v}`); else if (typeof v === 'string') assert.doesNotMatch(v, /NaN|undefined|Infinity|\[object|Invalid/, `${where} is ${JSON.stringify(v)}`); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) clean(x, where + '.' + k); else assert.ok(v === null || typeof v === 'boolean', `${where} is ${String(v)}`); };
const ROUND_BAD = [NaN, Infinity, -Infinity, -1, -5, 0.5, 2.5, 4.999, 1441, 1e9, 1e300, '5', 'abc', '', ' ', {}, [], [5], true, false, Symbol('s'), 10n, () => 5, new Number(5), { valueOf() { return 5; } }, { valueOf() { throw new Error('boom'); } }];
const ROUND_OK = [undefined, null, 0, 1, 2, 3, 5, 7, 10, 15, 30, 60, 90, 1440];
const APPROX_BAD = ['yes', 'no', 'true', 'false', 'Auto', 'AUTO', '', 1, 0, -1, NaN, {}, [], [true], Symbol('s'), 10n, () => true];
const APPROX_OK = [undefined, null, true, false, 'auto'];
const STYLE_BAD_KIND = [5, 0, NaN, {}, [], ['time'], true, false, Symbol('s'), 10n, () => 'time', new String('time'), { toString() { return 'time'; } }, { toString() { throw new Error('boom'); } }];
const STYLE_BAD_WORD = ['nonsense', '', ' ', 'Time', 'LONG', ' long', 'long ', 'time\n', 'compat,chip', 'hh:mm', '__proto__', 'constructor', 'toString'];
const OPTS_BAD = [5, 'x', true, false, [], [{}], () => ({}), Symbol('s'), 10n, NaN];

// every public function that takes the option, written once as (option value) -> result, with its own notion of "where the option goes"
const VIA = {
  roundMin: {
    'format(t, style, {roundMin})': (v, t) => m.format(t, 'time', { roundMin: v }), 'tickToLabel(t, {roundMin})': (v, t) => m.tickToLabel(t, { style: 'time', roundMin: v }),
    'tickToLabelParts(t, {roundMin})': (v, t) => m.tickToLabelParts(t, { style: 'time', roundMin: v }), 'parts(t, roundMin)': (v, t) => m.parts(t, v),
  },
  approx: { 'format(t, style, {approx})': (v, t) => m.format(t, 'time', { approx: v }), 'tickToLabel(t, {approx})': (v, t) => m.tickToLabel(t, { style: 'time', approx: v }), 'tickToLabelParts(t, {approx})': (v, t) => m.tickToLabelParts(t, { style: 'time', approx: v }) },
  style: { 'format(t, style)': (v, t) => m.format(t, v), 'format(t, style, {})': (v, t) => m.format(t, v, {}), 'tickToLabel(t, {style})': (v, t) => m.tickToLabel(t, { style: v }), 'tickToLabelParts(t, {style})': (v, t) => m.tickToLabelParts(t, { style: v }) },
  options: {
    'format(t, style, opts)': (v, t) => m.format(t, 'time', v), 'tickToLabel(t, opts)': (v, t) => m.tickToLabel(t, v), 'tickToLabelParts(t, opts)': (v, t) => m.tickToLabelParts(t, v),
    'minutesToTick(min, opts)': (v) => m.minutesToTick(400, v), 'clockToTick(x, opts)': (v) => m.clockToTick(400, v),
  },
  extrapolate: { 'minutesToTick(min, {extrapolate})': (v) => m.minutesToTick(400, { extrapolate: v }), 'clockToTick(x, {extrapolate})': (v) => m.clockToTick(400, { extrapolate: v }) },
};
const refused = (fn, name, what, re) => { let out; try { out = fn(); } catch (e) { assert.ok(e instanceof TypeError || e instanceof RangeError, `${name}: ${e.constructor.name}: ${e.message}`); assert.doesNotMatch(e.message, /Cannot read|undefined \(reading|is not a function/, `${name}: an engine error, not a validation message: ${e.message}`); if (re) assert.match(e.message, re, `${name}: the message must name the option: ${e.message}`); return true; } assert.fail(`${name} with ${what} returned ${JSON.stringify(out).slice(0, 80)} instead of throwing`); };

describe('every bad option value is refused by name, by every public function that takes the option', () => {
  for (const [opt, bad, re] of [['roundMin', ROUND_BAD, /roundMin/], ['approx', APPROX_BAD, /approx/], ['extrapolate', ['yes', 1, 0, {}, NaN, [], Symbol('s'), 'true'], /extrapolate/]]) {
    test(`${opt}: ${bad.length} wrong values x ${Object.keys(VIA[opt]).length} functions x several ticks`, () => {
      for (const [name, fn] of Object.entries(VIA[opt])) for (const v of bad) for (const t of [1, 100, 538]) refused(() => fn(v, t), name, show(v), re);
    });
  }
  test(`style: ${STYLE_BAD_KIND.length} values of the wrong kind are TypeErrors and ${STYLE_BAD_WORD.length} unknown words are RangeErrors that list the known ones`, () => {
    for (const [name, fn] of Object.entries(VIA.style)) {
      for (const v of STYLE_BAD_KIND) { let e; try { fn(v, 100); } catch (x) { e = x; } assert.ok(e instanceof TypeError && /style/.test(e.message), `${name} ${show(v)}: ${e && e.constructor.name} ${e && e.message}`); }
      for (const v of STYLE_BAD_WORD) { let e; try { fn(v, 100); } catch (x) { e = x; } assert.ok(e instanceof RangeError && /style/.test(e.message) && /compat/.test(e.message), `${name} ${show(v)}: ${e && e.constructor.name} ${e && e.message}`); }
    }
  });
  test('the options object itself: a number, string, boolean, array or function is a TypeError (null and undefined are "no options")', () => {
    for (const [name, fn] of Object.entries(VIA.options)) { for (const v of OPTS_BAD) refused(() => fn(v, 100), name, show(v), /object/); for (const v of [undefined, null, {}]) assert.doesNotThrow(() => fn(v, 100), `${name} ${show(v)}`); }
  });
  test('the tick is checked before the options (the error names the first thing that is wrong)', () => {
    assert.throws(() => m.format(NaN, 'time', { roundMin: 'abc' }), /tick/); assert.throws(() => m.tickToLabel(undefined, { roundMin: 'abc' }), /tick/); assert.throws(() => m.tickToLabelParts(NaN, { approx: 'x' }), /tick/); assert.throws(() => m.parts(NaN, 'abc'), /tick/);
  });
  test('a failed call leaves no poisoned state behind: the next good call returns the same string as before', () => {
    const before = m.format(100, 'time', { roundMin: 5 }); for (const v of ROUND_BAD) try { m.format(100, 'time', { roundMin: v }); } catch (e) { /* expected */ } assert.equal(m.format(100, 'time', { roundMin: 5 }), before);
  });
});

describe('every good option value gives a correct and clean result', () => {
  test('roundMin: the printed clock is a multiple of roundMin of the unrounded clock, for every good value, on the ticks that matter (and null / undefined mean the function default)', () => {
    for (const r of ROUND_OK) for (const t of SAMPLE) {
      const p = m.parts(t, r), exact = m.parts(t, 0), want = r ? Math.round(m.tickToMinutes(t) / r) * r : Math.round(m.tickToMinutes(t));
      assert.equal(p.minutes, want, `parts(${t}, ${show(r)})`); assert.equal(p.hour24 * 60 + p.minute, p.mod, 'hour and minute are the minute of the day'); assert.ok(Number.isInteger(p.minute) && p.minute >= 0 && p.minute < 60);
      if (r) assert.equal(p.minutes % r, 0, `parts(${t}, ${r}) is a multiple of ${r}`);
      for (const s of [m.format(t, 'time', { roundMin: r }), m.tickToLabel(t, { style: 'time', roundMin: r }), m.tickToLabelParts(t, { style: 'time', roundMin: r }).text]) assert.doesNotMatch(s, GARBAGE, `${t} ${show(r)}: ${s}`);
      clean(p, `parts(${t}, ${show(r)})`); clean(m.tickToLabelParts(t, { roundMin: r }), 'labelParts');
      assert.ok(exact.minutes === Math.round(m.tickToMinutes(t)));
    }
    assert.equal(m.tickToLabel(100, { style: 'time' }), m.tickToLabel(100, { style: 'time', roundMin: 5 }), 'the label default is 5'); assert.equal(m.format(100, 'time'), m.format(100, 'time', { roundMin: 0 }), 'the format default is exact');
    assert.equal(m.tickToLabel(100, { style: 'time', roundMin: null }), m.tickToLabel(100, { style: 'time', roundMin: 5 }));
  });
  test('approx: true always prefixes, false never does, auto follows the clock, and the three functions agree on every tick', () => {
    for (let t = 1; t <= T; t += 4) {
      const yes = m.format(t, 'time', { approx: true }), no = m.format(t, 'time', { approx: false }), auto = m.format(t, 'time', { approx: 'auto' });
      assert.match(yes, /^about /); assert.doesNotMatch(no, /about/); assert.equal(auto, m.isApprox(t) ? yes : no);
      for (const v of APPROX_OK) { const parts = m.tickToLabelParts(t, { style: 'time', approx: v }), label = m.tickToLabel(t, { style: 'time', approx: v }); assert.equal(parts.text, label, `${t} ${show(v)}`); assert.equal(parts.prefix === 'about ', /^about /.test(label)); assert.equal(parts.approx, /^about /.test(label)); }
    }
  });
  test('style: every known word, in every function, is clean text; null and undefined are the default (long)', () => {
    for (const s of STYLES) for (const t of SAMPLE) for (const s2 of [m.format(t, s), m.tickToLabel(t, { style: s }), m.tickToLabelParts(t, { style: s }).text]) assert.doesNotMatch(s2, GARBAGE, `${s} ${t}: ${s2}`);
    for (const t of SAMPLE) { assert.equal(m.format(t, undefined), m.format(t, 'long')); assert.equal(m.format(t, null), m.format(t, 'long')); assert.equal(m.tickToLabel(t, { style: null }), m.tickToLabel(t, { style: 'long' })); }
  });
  test('extrapolate: true / false / absent; true lets a clock outside the day run past the ends at 5 min/tick, the others clamp', () => {
    assert.equal(m.minutesToTick(m.tickToMinutes(T) + 50, { extrapolate: true }), T + 10); assert.equal(m.minutesToTick(m.tickToMinutes(T) + 50, { extrapolate: false }), T); assert.equal(m.minutesToTick(m.tickToMinutes(T) + 50, {}), T); assert.equal(m.minutesToTick(m.tickToMinutes(T) + 50), T);
    assert.equal(m.clockToTick(m.tickToMinutes(1) - 25, { extrapolate: true }), -4); assert.equal(m.clockToTick(m.tickToMinutes(1) - 25), 1);
  });
});

describe('resolveTickParam is a URL reader: a hostile query object is "no tick", never a crash', () => {
  test('throwing getters, Symbols, proxies, objects, arrays and non-strings are null; the real forms still resolve', () => {
    const boom = { get() { throw new Error('boom'); } };
    for (const q of [{ get() { throw new Error('boom'); } }, new Proxy({}, { get() { throw new Error('boom'); }, has() { throw new Error('boom'); } }), { tick: Symbol('s') }, { tick: { toString() { throw new Error('boom'); } } }, { t: Symbol('s') }, Object.defineProperty({}, 'tick', { get() { throw new Error('boom'); } }), { tick: [538] }, { tick: {} }, { tick: () => 5 }, { tick: 10n }]) { let r; assert.doesNotThrow(() => { r = m.resolveTickParam(q); }); assert.ok(r === null || Number.isInteger(r), String(r)); }
    assert.equal(m.resolveTickParam({ tick: Symbol('s') }), null); assert.equal(m.resolveTickParam(new Proxy({}, boom)), null); assert.equal(m.resolveTickParam(new URLSearchParams('tick=538')), 538); assert.equal(m.resolveTickParam({ t: '12' }), 12);
  });
});

describe('a random sweep over (function x option x value) never returns garbage and never throws an engine error', () => {
  test('3000 random calls with random option objects: either a TypeError/RangeError that names an option, or clean text', () => {
    const r = rng(2468), pick = (a) => a[Math.floor(r() * a.length)];
    const pools = { roundMin: [...ROUND_OK, ...ROUND_BAD], approx: [...APPROX_OK, ...APPROX_BAD], style: [undefined, null, ...STYLES, ...STYLE_BAD_WORD, ...STYLE_BAD_KIND] };
    const fns = [[(t, o) => m.format(t, o.style, o), ['roundMin', 'approx', 'style']], [(t, o) => m.tickToLabel(t, o), ['roundMin', 'approx', 'style']], [(t, o) => m.tickToLabelParts(t, o), ['roundMin', 'approx', 'style']], [(t, o) => m.parts(t, o.roundMin), ['roundMin']]];
    let threw = 0, returned = 0;
    for (let i = 0; i < 3000; i++) {
      const o = {}; for (const k of Object.keys(pools)) if (r() < 0.6) o[k] = pick(pools[k]); const t = pick([...SAMPLE, 1 + Math.floor(r() * T)]), [fn, used] = pick(fns);
      let out; try { out = fn(t, o); } catch (e) { threw++; assert.ok(e instanceof TypeError || e instanceof RangeError, `${e.constructor.name}: ${e.message}`); assert.match(e.message, /roundMin|approx|style|tick|object/, e.message); continue; }
      returned++; clean(out, JSON.stringify(Object.keys(o))); // a result is only ever returned for values the API accepts
      for (const k of used) { const v = o[k]; if (k === 'roundMin') assert.ok(v == null || (Number.isInteger(v) && v >= 0 && v <= 1440), `accepted roundMin ${show(v)}`); if (k === 'approx') assert.ok(v == null || v === true || v === false || v === 'auto', `accepted approx ${show(v)}`); if (k === 'style') assert.ok(v == null || STYLES.includes(v), `accepted style ${show(v)}`); }
    }
    assert.ok(threw > 500 && returned > 500, `the sweep must exercise both outcomes (threw ${threw}, returned ${returned})`);
  });
});

describe('the bridge style argument (RV-04): coerced like every other argument', () => {
  const STYLE_ALL = [undefined, null, ...STYLES, ...STYLE_BAD_WORD, ...STYLE_BAD_KIND, 'frame', new Proxy({}, { get() { throw new Error('boom'); }, has() { throw new Error('boom'); } }), Object.create(null), 'x'.repeat(10000), '\u0000', '<script>'];
  const bridges = { 'ES bridge on the validating model': makeBridge(m), 'ES bridge on the lean core': makeBridge(makeCore(doc)), 'ES bridge on a fresh model': makeBridge(makeTimeModel(doc)) };
  for (const [name, b] of Object.entries(bridges)) test(`${name}: f and x never throw and never print garbage for any style; an unknown style is 'compat'`, () => {
    for (const s of STYLE_ALL) for (const t of [...SAMPLE, NaN, 'x', {}, Symbol('t')]) {
      let f, x; assert.doesNotThrow(() => { f = b.f(t, s); x = b.x(t, s); }, `${name}: f(${show(t)}, ${show(s)})`);
      assert.equal(typeof f, 'string'); assert.equal(typeof x, 'string'); assert.doesNotMatch(f + x, /NaN|undefined|null|\[object|Invalid/, `${show(t)} ${show(s)}`);
      if (typeof s !== 'string' || !STYLES.includes(s)) { assert.equal(f, b.f(t, 'compat'), `f(${show(t)}, ${show(s)}) must be the default style`); assert.equal(x, b.x(t, 'compat')); } else { assert.equal(f, b.f(t, s)); }
    }
  });
  test('known words are unchanged (the ten styles on every tick equal the validating model)', () => {
    const b = makeBridge(m); for (const s of STYLES) for (let t = 1; t <= T; t += 9) { assert.equal(b.f(t, s), m.tickToLabel(t, { style: s })); assert.equal(b.x(t, s), m.format(t, s)); }
  });
  test('the inline build (what ships in the bundle) gives the same answers for the same hostile styles', async () => {
    const inline = readText(P('tools', 'time', 'build', 'gtbg-time.inline.js')).trim(), sb = {}; vm.createContext(sb); vm.runInContext('var G=' + inline + ';', sb);
    const G = sb.G, B = makeBridge(m), call = (o, k, ...a) => { try { return o[k](...a); } catch (e) { return 'THROW:' + e.constructor.name + ' ' + e.message; } };
    for (const s of STYLE_ALL) for (const t of [...SAMPLE, NaN, 'x', {}]) for (const k of ['f', 'x']) { const g = call(G, k, t, s); assert.ok(!/^THROW/.test(g), `inline ${k}(${show(t)}, ${show(s)}): ${g}`); assert.equal(g, call(B, k, t, s), `${k}(${show(t)}, ${show(s)})`); }
  });
  test('a bridge built from a document with a different threshold behaves the same in the inline build (the style list comes from the one module, not a copy)', async () => {
    const d = JSON.parse(JSON.stringify(doc)); d.approx_sigma_min = 0; const b = await buildInline(d), sb = {}; vm.createContext(sb); vm.runInContext('var G=' + b.inline + ';', sb); const ref = makeBridge(makeTimeModel(d));
    for (const s of [...STYLES, 'nonsense', 5, undefined]) for (let t = 1; t <= T; t += 11) assert.equal(sb.G.f(t, s), ref.f(t, s), `${t} ${show(s)}`);
  });
});
