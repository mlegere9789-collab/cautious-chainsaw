// The validator (TM-V1, src/lib/time/anchors.js) and the model (core.js load-time checks) agree on every configuration value (RV-01, S4b/S4d).
//
// The defect class: `doc.approx_sigma_min || 10` replaced the legal value 0 by 10, so the report said "valid" and the model behaved as if another number
// had been written. Fixing the one field would not fix the class, so these tests sweep EVERY field the validator reads, against a value pool that
// contains every falsy value, the boundaries, wrong types and hostile objects, and assert the three properties that make "agree" precise:
//   (1) validator ok  =>  the model builds, and what it exposes / does is exactly the value in the document (never a default);
//   (2) the model builds (whatever the validator said)  =>  it still never shows a default where a value was given (null and undefined mean "absent");
//   (3) a present value of the wrong kind is refused by the model as well (it is not silently ignored), and the lean core / inline build honour 0 too.
// Generators, not examples: a new config field that is read with `||` fails the sweep the day it is added.
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { makeTimeModel, makeCore, validateAnchors, loadAnchors, AnchorError, parseLocal } from '../../src/lib/time/index.js';
import { buildInline } from '../../tools/time/inline.mjs';
import { doc, rng, randomDoc } from './helpers.mjs';

const clone = (x) => JSON.parse(JSON.stringify(x));
const POOL = [undefined, null, 0, -0, 0.5, 1, 2, 9.99, 10, 15, 30, 31, 60, 675, 1e6, 1e21, -1, NaN, Infinity, -Infinity, '', '0', '10', 'S', 'signed', 'none', true, false, [], {}, [1], 'x'];
const label = (v) => (v === undefined ? 'undefined' : typeof v === 'number' && !Number.isFinite(v) ? String(v) : Object.is(v, -0) ? '-0' : JSON.stringify(v));
const given = (x) => x !== undefined && x !== null;
const same = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Object.is(a, b) || a === b : JSON.stringify(a) === JSON.stringify(b));
const setTop = (k, v) => { const d = clone(doc); if (v === undefined) delete d[k]; else d[k] = v; return d; };
const setAnchor = (i, k, v) => { const d = clone(doc); if (v === undefined) delete d.anchors[i][k]; else d.anchors[i][k] = v; if (k === 'status' && typeof v === 'string' && CLASS_OF[v]) d.anchors[i].confidence = CLASS_OF[v]; return d; };
const CLASS_OF = { S: 'A', M: 'B', R: 'C', D: 'D' };
const VALID = { state: ['open', 'proposed', 'reviewed', 'confirmed', 'contested', 'deferred', 'withdrawn'], status: ['S', 'M', 'R', 'D'], effective_status: ['S', 'M', 'R', 'D'], review_flag: ['none', 'evidence-weak', 'owner-sign', 'owner-decision', 'needs-historian'], sigma_min: [1, 5, 7.5, 30] };
const build = (d) => { try { return { m: makeTimeModel(d) }; } catch (e) { return { err: e }; } };

// what the model must show for a value that was written (given) or left out (default)
const TOP = {
  approx_sigma_min: { default: 10, expose: (m) => m.approxSigmaMin },
  dv: { default: 2, expose: (m) => m.dv },
  version: { default: '', expose: (m) => m.version },
  release: { default: 'candidate', expose: (m) => m.release },
  tab_days: { default: null, expose: (m) => m.tabDays },
  gaps: { default: [], expose: (m) => m.gaps },
};
const PER_ANCHOR = {
  sigma_min: { default: 15, expose: (m, i) => m.anchors[i].sigmaMin },
  state: { default: 'proposed', expose: (m, i) => m.anchors[i].state },
  status: { default: 'M', expose: (m, i) => m.anchors[i].status },
  effective_status: { default: undefined, expose: (m, i) => m.anchors[i].effectiveStatus },
  review_flag: { default: 'none', expose: (m, i) => m.anchors[i].review },
};

describe('top-level configuration: a value the validator accepts is the value the model uses', () => {
  for (const [field, spec] of Object.entries(TOP)) {
    const values = field === 'tab_days' ? [...POOL, [[1, 675]], [[1, 225], [226, 450], [451, 675]], [[1, 225], [226, 450], [451, 674]], [[0, 675]], [[1, 2, 3]], [[1.5, 675]]]
      : field === 'gaps' ? [...POOL, [], [{ from: 100, to: 130, policy: 'fast_forward' }], [{ from: 100, to: 130 }], [{ from: 1, to: 675, policy: 'time_lapse' }], [{ from: 0, to: 5, policy: 'fast_forward' }], [null]]
        : field === 'version' ? [...POOL, '2026-01-01.1', '2026-01-01', 'v1'] : POOL;
    test(`${field}: ${values.length} values, (1) ok => used as written, (2) built => never a default where a value was given`, () => {
      let ok = 0, built = 0;
      for (const v of values) {
        const d = setTop(field, v), r = validateAnchors(d), b = build(d), want = given(v) ? v : (field === 'tab_days' ? d.tab_days : spec.default);
        if (r.ok) { ok++; assert.ok(!b.err, `${field}=${label(v)}: the validator says ok but the model threw ${b.err && b.err.message}`); }
        if (b.m) {
          built++;
          if (field === 'tab_days' && !given(v)) continue; // absent tab_days: the model derives [[1, tickMax]] (asserted in model.test.mjs)
          assert.ok(same(spec.expose(b.m), want), `${field}=${label(v)}: the model shows ${label(spec.expose(b.m))}, the document says ${label(want)}${r.ok ? ' (validator: ok)' : ''}`);
        }
      }
      assert.ok(ok >= 1 && built >= ok, `${field}: the pool must contain accepted values (ok ${ok}, built ${built})`);
    });
  }
  test('approx_sigma_min 0 is accepted by the validator, used by the model, the lean core and the inline build (the reported defect)', async () => {
    const d = setTop('approx_sigma_min', 0); for (const a of d.anchors) { a.state = 'signed'; a.decision = 'D-0001'; }
    assert.equal(validateAnchors(d).ok, true); assert.equal(loadAnchors(d).approxSigmaMin, 0); assert.equal(makeCore(d).approxSigmaMin, 0);
    const m = makeTimeModel(d), G = (() => { const sb = {}; return buildInline(d).then((b) => { vm.createContext(sb); vm.runInContext('var G=' + b.inline + ';', sb); return sb.G; }); })();
    const g = await G;
    for (let t = 1; t <= m.tickMax; t++) { assert.equal(m.isApprox(t), true, `model ${t}`); assert.equal(g.approx(t), true, `inline ${t}`); assert.match(g.f(t, 'time'), /^about /, `inline label ${t}`); }
  });
});

describe('per-anchor configuration: a value the validator accepts is the value the model uses', () => {
  for (const [field, spec] of Object.entries(PER_ANCHOR)) {
    test(`${field} on the first, an interior and the last anchor`, () => {
      let ok = 0;
      for (const i of [0, 3, doc.anchors.length - 1]) for (const v of [...POOL, ...(VALID[field] || [])]) {
        const d = setAnchor(i, field, v), r = validateAnchors(d), b = build(d);
        if (r.ok) { ok++; assert.ok(!b.err, `anchors[${i}].${field}=${label(v)}: validator ok but the model threw ${b.err && b.err.message}`); }
        if (b.m) {
          const want = given(v) ? v : (field === 'effective_status' ? d.anchors[i].status : spec.default);
          assert.ok(same(spec.expose(b.m, i), want), `anchors[${i}].${field}=${label(v)}: the model shows ${label(spec.expose(b.m, i))}, the document says ${label(want)}`);
        }
      }
      assert.ok(ok >= 3, `${field}: accepted values in the pool: ${ok}`);
    });
  }
  test('sigma_min 0 (below the validator range) is still used as written by the lean model, never replaced by 15', () => {
    const b = build(setAnchor(3, 'sigma_min', 0)); assert.ok(b.m); assert.equal(b.m.uncertaintyMin(doc.anchors[3].tick), 0); assert.equal(b.m.anchors[3].sigmaMin, 0);
  });
});

describe('a present value of the wrong kind is refused by the model as well (nothing is silently ignored)', () => {
  const REFUSED = {
    approx_sigma_min: ['10', -1, NaN, Infinity, -Infinity, {}, [], true, false],
    dv: [0, 1.5, '2', NaN, -1, {}, true], release: [0, 1, {}, [], true], version: [0, {}, [], true],
    slope: ['x', [], 5, true, { min_min_per_tick: 0 }, { min_min_per_tick: -1 }, { error_over: '60' }, { error_over: NaN }, { error_over: 0 }],
    tab_days: [[], 'x', 5, [null], [[1]], [['1', 2]], [[1.5, 675]], {}], gaps: ['x', 5, {}, [null], [{ from: '1', to: 5 }], [{ from: 1.5, to: 5 }]],
    tick_max: [0, '675', 674, 676, NaN, {}],
  };
  for (const [field, bad] of Object.entries(REFUSED)) test(`${field}: ${bad.length} wrong values throw (an Error that names the field), the validator reports them too`, () => {
    for (const v of bad) {
      const d = setTop(field, v); assert.equal(validateAnchors(d).ok, false, `${field}=${label(v)} must be a validator error`);
      let msg = null; try { makeTimeModel(d); } catch (e) { msg = e.message; } assert.ok(msg, `${field}=${label(v)}: the model built silently`);
      assert.match(msg, new RegExp(field.replace('_', '[_ ]?') + '|tab_days|last anchor', 'i'), `${field}=${label(v)}: the message should name the field: ${msg}`);
    }
  });
  test('per-anchor: a wrong status / effective_status / state / review_flag / sigma_min throws in the model too', () => {
    for (const [k, vals] of Object.entries({ status: ['X', 's', '', 5, {}], effective_status: ['X', 5, {}], state: ['Signed', 'x', '', 5], review_flag: ['x', 'None', 5, {}], sigma_min: ['x', -1, NaN, Infinity, {}] })) for (const v of vals) {
      const d = setAnchor(3, k, v), r = validateAnchors(d);
      assert.equal(r.ok, false, `anchors[3].${k}=${label(v)} must be a validator error`);
      assert.throws(() => makeTimeModel(d), /anchor 3|tick/, `anchors[3].${k}=${label(v)}`);
    }
  });
});

describe('the behaviour, not just the exposed number: "about" follows the document\'s own threshold', () => {
  // an independent model of sigma(t): interpolate the anchors' sigma_min (an anchor tick speaks for itself), approximate when sigma >= threshold or an end is unsigned
  const sigmaAt = (d, t) => { const A = d.anchors; let i = 0; while (i < A.length - 2 && A[i + 1].tick <= t) i++; const a = A[i], b = A[i + 1]; if (t === a.tick) return [a.sigma_min, [a]]; if (t === b.tick) return [b.sigma_min, [b]]; const w = (t - a.tick) / (b.tick - a.tick); return [a.sigma_min * (1 - w) + b.sigma_min * w, [a, b]]; };
  const expected = (d, t) => { const [s, ends] = sigmaAt(d, t); return s >= d.approx_sigma_min || ends.some((e) => e.state !== 'signed'); };
  test('thresholds 0, 0.5, 5, 10, 17.5, 30, 1e6 on a fully signed and on a half signed document: every tick of the model equals the independent expectation', () => {
    for (const thr of [0, 0.5, 5, 10, 17.5, 30, 1e6]) for (const signedEvery of [1, 2]) {
      const d = clone(doc); d.approx_sigma_min = thr; d.anchors.forEach((a, i) => { if (i % signedEvery === 0) { a.state = 'signed'; a.decision = 'D-0001'; } });
      assert.equal(validateAnchors(d).ok, true); const m = makeTimeModel(d);
      for (let t = 1; t <= m.tickMax; t++) { const want = expected(d, t); assert.equal(m.isApprox(t), want, `thr ${thr} every ${signedEvery} t${t}`); assert.equal(m.tickToClock(t).approx, want); assert.equal(/^about /.test(m.tickToLabel(t, { style: 'time' })), want, `label t${t}`); }
      for (const a of m.anchors) assert.equal(a.approx, a.sigmaMin >= thr || a.state !== 'signed');
    }
  });
  test('random documents with random thresholds (including 0) agree with the expectation, and validator ok always builds', () => {
    const r = rng(7001);
    for (let i = 0; i < 40; i++) {
      const d = randomDoc(rng(100 + i)); for (const a of d.anchors) a.confidence = 'B'; d.approx_sigma_min = [0, 1, 5, 10, 17.5, 30, 1000, 0][Math.floor(r() * 8)]; for (const a of d.anchors) if (r() < 0.7) { a.state = 'signed'; a.decision = 'D-1'; } else a.state = 'proposed';
      assert.equal(validateAnchors(d).ok, true, JSON.stringify(validateAnchors(d).errors[0])); const m = makeTimeModel(d);
      for (let t = 1; t <= m.tickMax; t += 3) assert.equal(m.isApprox(t), expected(d, t), `doc ${i} thr ${d.approx_sigma_min} t${t}`);
    }
  });
});

describe('the validator is never more lenient than the model about what it lets through (the gate loadAnchors uses)', () => {
  test('loadAnchors: every accepted pool document builds and every refused one is an AnchorError, never a bare Error from the model', () => {
    for (const [field] of Object.entries(TOP)) for (const v of POOL) {
      const d = setTop(field, v); let outcome;
      try { loadAnchors(d); outcome = 'ok'; } catch (e) { outcome = e instanceof AnchorError ? 'refused' : 'CRASH ' + e.constructor.name + ': ' + e.message; }
      assert.ok(outcome === 'ok' || outcome === 'refused', `${field}=${label(v)}: ${outcome}`);
      assert.equal(outcome === 'ok', validateAnchors(d).ok);
    }
  });
  test('parseLocal stays the single calendar reader: the validator and the model read the same minutes for every anchor', () => {
    const m = makeTimeModel(doc); for (const a of doc.anchors) assert.equal(m.tickToMinutes(a.tick), parseLocal(a.t));
  });
});
