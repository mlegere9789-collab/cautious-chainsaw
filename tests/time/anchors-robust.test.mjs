// validateAnchors "never throws" (its own contract) and rejects malformed ranges: targeted cases, a seeded fuzz over the real document, and the
// consistency property "ok:true implies the model builds" (VERIFY-04). loadAnchors reports bad JSON as an AnchorError.
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateAnchors, loadAnchors, AnchorError, makeTimeModel, deriveSigma, mechanicalFlags } from '../../src/lib/time/index.js';
import { doc, rng } from './helpers.mjs';

const clone = () => JSON.parse(JSON.stringify(doc));
const codes = (r) => r.errors.map((e) => e.code);
const run = (d, o) => { let r; try { r = validateAnchors(d, o); } catch (e) { assert.fail(`validateAnchors threw ${e && e.constructor && e.constructor.name}: ${e && e.message}`); } return r; };
const shape = (r) => { assert.equal(typeof r.ok, 'boolean'); assert.ok(Array.isArray(r.errors) && Array.isArray(r.warnings)); assert.equal(typeof r.info, 'object'); assert.equal(r.ok, r.errors.length === 0); for (const e of r.errors) assert.ok(typeof e.code === 'string' && typeof e.msg === 'string'); return r; };

describe('validateAnchors: garbage in, errors out, never a throw', () => {
  test('not-a-document values', () => {
    for (const bad of [undefined, null, 0, 1, '', 'x', true, [], [1, 2], () => 1, Symbol('s'), 10n, new Date(0), /re/, NaN]) { const r = shape(run(bad)); assert.equal(r.ok, false, String(typeof bad)); assert.ok(codes(r).includes('V1.doc') || codes(r).includes('V1.anchors')); }
  });
  test('wrong-typed members of an otherwise valid document', () => {
    const cases = {
      'anchors is an object': (d) => { d.anchors = { 0: d.anchors[0] }; }, 'anchors is a string': (d) => { d.anchors = 'abc'; },
      'a number as an anchor': (d) => { d.anchors[4] = 5; }, 'a string as an anchor': (d) => { d.anchors[4] = 'x'; }, 'an array as an anchor': (d) => { d.anchors[4] = [1, 2]; }, 'undefined anchor': (d) => { d.anchors[4] = undefined; },
      'tick is a string': (d) => { d.anchors[4].tick = '28'; }, 'tick is NaN-ish': (d) => { d.anchors[4].tick = null; }, 't is a number': (d) => { d.anchors[4].t = 5; }, 't is null': (d) => { d.anchors[4].t = null; }, 't is an object': (d) => { d.anchors[4].t = {}; },
      'status is an array': (d) => { d.anchors[4].status = ['S']; }, 'status is inherited "constructor"': (d) => { d.anchors[4].status = 'constructor'; }, 'status is __proto__': (d) => { d.anchors[4].status = '__proto__'; },
      'effective_status invalid': (d) => { d.anchors[1].effective_status = 'X'; }, 'effective_status is a number': (d) => { d.anchors[1].effective_status = 3; },
      'families is a string': (d) => { d.anchors[4].families = 'OR'; }, 'flags is a string': (d) => { d.anchors[4].flags = 'M'; }, 'fact_confidences is null': (d) => { d.anchors[4].fact_confidences = null; }, 'fact_confidences is a string': (d) => { d.anchors[4].fact_confidences = 'H'; },
      'sigma is a string': (d) => { d.anchors[4].sigma_min = '20'; }, 'state is an object': (d) => { d.anchors[4].state = {}; },
      'tab_days is a string': (d) => { d.tab_days = 'abc'; }, 'tab_days entry is a number': (d) => { d.tab_days[1] = 226; }, 'tab_days entry has strings': (d) => { d.tab_days[1] = ['226', '450']; }, 'tab_days entry is an object': (d) => { d.tab_days[0] = {}; },
      'gaps is an object': (d) => { d.gaps = {}; }, 'gaps entry is a string': (d) => { d.gaps = ['x']; }, 'gaps policy invalid': (d) => { d.gaps[0].policy = 'teleport'; }, 'gaps entry has string bounds': (d) => { d.gaps[0].from = '226'; },
      'solar is a string': (d) => { d.solar = 'noon'; }, 'solar day is null': (d) => { d.solar['1863-07-02'] = null; }, 'solar field is a number': (d) => { d.solar['1863-07-01'].sunrise = 435; }, 'solar field is not HH:MM': (d) => { d.solar['1863-07-01'].sunrise = '4:35'; },
      'slope is a string': (d) => { d.slope = 'steep'; }, 'slope numbers are strings': (d) => { d.slope = { error_over: 'sixty' }; }, 'evidence_families is null': (d) => { d.evidence_families = null; }, 'strong is a string': (d) => { d.evidence_families = { strong: 'OR' }; },
      'sigma_cap_min is a string': (d) => { d.sigma_cap_min = 'thirty'; }, 'approx_sigma_min is a string': (d) => { d.approx_sigma_min = '10'; }, 'dv is a float': (d) => { d.dv = 1.5; }, 'version is a number': (d) => { d.version = 2; },
    };
    for (const [name, f] of Object.entries(cases)) { const d = clone(); f(d); const r = shape(run(d)); assert.equal(r.ok, false, `${name} must not validate`); }
  });
  test('the named cases of the verifier: null entries, a one-element range, an unparseable range time', () => {
    for (const f of [(d) => { d.anchors[3] = null; }, (d) => { d.tab_days[1] = null; }, (d) => { d.gaps = [null]; }, (d) => { d.anchors[3].range = ['10:15']; }]) { const d = clone(); f(d); assert.equal(shape(run(d)).ok, false); }
    const d = clone(); d.anchors[3].range = ['10:15', 'abc']; assert.ok(codes(run(d)).includes('V1.range-format'));
  });
  test('range: exactly two HH:MM strings with from <= to (00:00..23:59); a missing or null range is fine', () => {
    const bad = [['10:15'], ['10:15', '10:50', '11:00'], ['10:15', 'abc'], ['24:00', '24:30'], ['10:60', '11:00'], ['1015', '1050'], ['10:50', '10:15'], [1015, 1050], 'a-b', '10:15-10:50', {}, 0, false, ['10:15', null]];
    for (const r of bad) { const d = clone(); d.anchors[3].range = r; const v = run(d); assert.ok(codes(v).includes('V1.range-format'), `range ${JSON.stringify(r)}: ${codes(v)}`); assert.equal(v.ok, false); }
    for (const r of [undefined, null]) { const d = clone(); if (r === undefined) delete d.anchors[3].range; else d.anchors[3].range = null; assert.equal(run(d).ok, true); }
    const eq = clone(); eq.anchors[3].range = ['10:15', '10:15']; assert.equal(run(eq).ok, true, 'from == to is a valid single-time range');
  });
  test('an effective_status that is not S/M/R/D is an error; the real one (t5: D) is accepted', () => {
    const d = clone(); d.anchors[1].effective_status = 'Z'; assert.ok(codes(run(d)).includes('V1.effective')); assert.equal(run(doc).ok, true);
  });
  test('gap policy must be fast_forward or time_lapse; a gap must sit inside 1..tick_max', () => {
    for (const g of [{ from: 5, to: 5, policy: 'fast_forward' }, { from: 0, to: 5, policy: 'fast_forward' }, { from: 600, to: 700, policy: 'fast_forward' }, { from: 5, to: 9, policy: 'x' }, { from: 5, to: 9 }]) { const d = clone(); d.gaps = [g]; assert.ok(codes(run(d)).includes('V1.gaps'), JSON.stringify(g)); }
    const d = clone(); d.gaps = [{ from: 5, to: 9, policy: 'time_lapse' }]; assert.equal(run(d).ok, true);
  });
  test('hostile getters and cyclic structures are turned into a V1.internal error by the safety net, or reported, never thrown', () => {
    const d = clone(); Object.defineProperty(d, 'tz', { get() { throw new Error('boom'); }, enumerable: true }); const r = shape(run(d)); assert.equal(r.ok, false); assert.ok(codes(r).includes('V1.internal')); assert.match(r.errors[0].msg, /boom/);
    const c = clone(); c.anchors[2].note = c; c.anchors[3].t = c; assert.equal(shape(run(c)).ok, false);
    const p = clone(); p.anchors[2] = new Proxy({}, { get() { throw new RangeError('trap'); } }); assert.equal(shape(run(p)).ok, false);
  });
  test('deriveSigma and mechanicalFlags are safe on junk too', () => {
    for (const bad of [undefined, null, 5, 'ab', ['10:15'], ['x', 'y'], [1, 2]]) assert.throws(() => deriveSigma(bad), TypeError);
    assert.equal(deriveSigma(['10:15', '10:50']), 20); assert.equal(deriveSigma(['05:00', '05:00']), 5); assert.equal(deriveSigma(['00:00', '23:59']), 30); assert.equal(deriveSigma(['00:00', '23:59'], 45), 45);
    for (const a of [{}, { status: 'S' }, { status: 'S', families: 'OR', fact_confidences: null }, { status: 'S', families: [1, 2], fact_confidences: 5 }]) for (const strong of [undefined, null, 'OR', ['OR']]) assert.ok(Array.isArray(mechanicalFlags(a, strong)));
  });
});

describe('validateAnchors: seeded fuzz over the real document', () => {
  const JUNK = [null, undefined, 0, -1, 1e400, NaN, 675, 1.5, '', 'x', '1863-07-03T15:00', '10:15', [], [1], ['10:15', 'abc'], {}, { a: 1 }, true, false, ['a', 'b'], [[1, 2]], 'S', 'proposed', '__proto__', 'constructor', -0, 2 ** 53];
  // every path of the document, so mutations reach anchors, tab_days, gaps, solar, slope ...
  const paths = []; (function walk(o, p) { if (o && typeof o === 'object') for (const k of Object.keys(o)) { paths.push([...p, k]); walk(o[k], [...p, k]); } })(doc, []);
  const apply = (d, path, v) => { let o = d; for (let i = 0; i < path.length - 1; i++) { if (o == null || typeof o !== 'object') return; o = o[path[i]]; } if (o != null && typeof o === 'object') { if (v === undefined) delete o[path[path.length - 1]]; else o[path[path.length - 1]] = v; } };
  test('4000 documents with 1-4 random mutations each: never a throw, a well-formed report, and ok:true always builds a model', () => {
    const r = rng(4242); let ok = 0, notOk = 0, built = 0;
    for (let i = 0; i < 4000; i++) {
      const d = clone(); const n = 1 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) apply(d, paths[Math.floor(r() * paths.length)], JUNK[Math.floor(r() * JUNK.length)]);
      const v = shape(run(d)); if (v.ok) { ok++; try { makeTimeModel(d); built++; } catch (e) { assert.fail(`validateAnchors said ok but makeTimeModel threw: ${e.message}\n${JSON.stringify(d).slice(0, 300)}`); } } else notOk++;
    }
    assert.ok(notOk > 2500, `the fuzz must actually break documents (${notOk} of 4000 did)`); assert.equal(ok, built);
  });
  test('deleting or nulling every single member of the document, one at a time (exhaustive over all paths)', () => {
    for (const p of paths) for (const v of [undefined, null, 'x', 0]) { const d = clone(); apply(d, p, v); shape(run(d)); }
  });
  test('the safety net does not hide real errors: a document with a structural error is never ok', () => {
    const d = clone(); d.anchors.reverse(); assert.equal(run(d).ok, false);
  });
});

describe('loadAnchors', () => {
  test('invalid JSON text is an AnchorError with a V1.json code, not a bare SyntaxError', () => {
    for (const bad of ['{', '', 'nope', '{"anchors": [}', 'undefined']) assert.throws(() => loadAnchors(bad), (e) => e instanceof AnchorError && e.errors[0].code === 'V1.json' && /not valid JSON/.test(e.message), JSON.stringify(bad));
  });
  test('objects, JSON text and rejected documents behave as before; a slope violation is reported by TM-V1 and thrown by the loader', () => {
    assert.equal(loadAnchors(JSON.stringify(doc)).tickMax, 675); assert.throws(() => loadAnchors(null), AnchorError); assert.throws(() => loadAnchors(5), AnchorError);
    const d = clone(); d.anchors.find((a) => a.tick === 240).t = '1863-07-03T23:00'; assert.ok(codes(run(d)).includes('V1.slope')); assert.throws(() => loadAnchors(d), (e) => e instanceof AnchorError && e.errors.some((x) => x.code === 'V1.slope'));
  });
});
