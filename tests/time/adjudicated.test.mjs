// The LIVE adjudicated anchor file (data-src/time/time_anchors.json, adjudication of 2026-10-18; docs/time/ANCHORS-FINAL.md).
// The numeric oracles of the 2026-09-30 proposal run on the frozen copy (helpers.mjs `proposal`); these tests pin the live file's own rules.
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { P, readJson } from '../../tools/time/lib.mjs';
import { validate as jsValidate } from '../../tools/time/jsonschema.mjs';
import { validateAnchors, deriveSigma } from '../../src/lib/time/index.js';
import { doc, model } from './helpers.mjs';

const schema = readJson(P('data-src', 'time', 'time_anchors.schema.json'));
const ev = readJson(P('docs', 'time', 'evidence', 'anchors-final.json'));
const unc = readJson(P('tools', 'time', 'build', 'uncertainty.json'));
const A = doc.anchors, byTick = Object.fromEntries(A.map((a) => [a.tick, a]));
const hm = (s) => +s.slice(0, 2) * 60 + +s.slice(3, 5);

describe('the adjudicated file is a valid, honest candidate', () => {
  test('validates against the schema and the validator (no errors; warnings are only the known lulls)', () => {
    assert.deepEqual(jsValidate(doc, schema), []);
    const r = validateAnchors(doc);
    assert.equal(r.ok, true, JSON.stringify(r.errors));
    assert.deepEqual(r.warnings.map((w) => w.code + ':' + w.tick).sort(), ['V1.lull:12', 'V1.lull:240', 'V1.lull:248', 'V1.lull:518']);
  });
  test('33 anchors, ticks permanent (same ticks as the proposal), strictly increasing minutes', () => {
    assert.equal(A.length, 33);
    assert.deepEqual(A.map((a) => a.tick), readJson(P('tests', 'time', 'fixtures', 'anchors-proposal-2026-09-30.json')).anchors.map((a) => a.tick));
    for (let i = 1; i < A.length; i++) assert.ok(model.tickToMinutes(A[i].tick) > model.tickToMinutes(A[i - 1].tick), `tick ${A[i].tick}`);
  });
  test('nothing is signed: states are reviewed, contested, or proposed (design and circular anchors the owner signs); the release stays a candidate', () => {
    for (const a of A) assert.ok(['reviewed', 'contested', 'proposed'].includes(a.state), `tick ${a.tick} ${a.state}`);
    assert.equal(doc.release, 'candidate'); assert.match(doc.notice, /none is 'signed'/);
    assert.deepEqual(A.filter((a) => a.state === 'proposed').map((a) => a.tick), [5, 100, 226, 675]);
    assert.deepEqual(A.filter((a) => a.state === 'contested').map((a) => a.tick), [90, 248, 275, 538]);
  });
});

describe('every anchor carries final time, uncertainty, status and evidence', () => {
  test('adj_status vocabulary; Contested is exactly the R anchors; design anchors are Estimated', () => {
    for (const a of A) assert.ok(['Documented', 'Estimated', 'Contested'].includes(a.adj_status), `tick ${a.tick}`);
    assert.deepEqual(A.filter((a) => a.adj_status === 'Contested').map((a) => a.tick), A.filter((a) => a.status === 'R').map((a) => a.tick));
    for (const a of A.filter((x) => x.status === 'D')) assert.equal(a.adj_status, 'Estimated');
  });
  test('time inside window; sigma_min is the half-width; uncertainty_min is the larger one-sided distance (a true bound); floor 25 for events', () => {
    for (const a of A) {
      const t = hm(a.t.slice(11)), lo = hm(a.range[0]), hi = hm(a.range[1]);
      assert.ok(lo <= t && t <= hi, `tick ${a.tick} time outside window`);
      assert.ok(a.uncertainty_min >= a.sigma_min, `tick ${a.tick}`);
      if (a.status === 'D' || a.circular) { assert.equal(a.sigma_min, 30); assert.equal(a.uncertainty_min, 30); continue; }
      assert.equal(a.sigma_min, deriveSigma(a.range, doc.sigma_cap_min), `tick ${a.tick}`);
      assert.equal(a.uncertainty_min, Math.min(doc.sigma_cap_min, Math.max(5, Math.ceil(Math.max(t - lo, hi - t) / 5) * 5)), `tick ${a.tick}`);
      assert.ok(a.uncertainty_min >= 25, `tick ${a.tick}: 1863 watches were not synchronised, no event claims better than 25 minutes`);
    }
  });
  test('evidence_refs resolve: every F id is a source in anchors-final.json that lists the tick; non-design anchors cite at least one source; open anchors cite both historians', () => {
    const src = Object.fromEntries(ev.sources.map((s) => [s.id, s]));
    for (const a of A) {
      for (const r of a.evidence_refs.filter((x) => /^F/.test(x))) { assert.ok(src[r], `${a.tick} ${r}`); assert.ok(src[r].ticks.includes(a.tick), `${a.tick} ${r}`); }
      if (a.status !== 'D' && a.tick !== 5) assert.ok(a.evidence_refs.some((x) => /^F/.test(x)), `tick ${a.tick} cites no source`);
    }
    for (const t of [28, 75, 90, 248, 275, 326, 518, 538]) { assert.ok(byTick[t].evidence_refs.some((x) => x.startsWith('A:S')), t); assert.ok(byTick[t].evidence_refs.includes('B:anchors-b.json#' + t), t); }
  });
  test('every quotation is under 15 words and every source has page, work and claim', () => {
    for (const s of ev.sources) { assert.ok(s.quote.split(/\s+/).length <= 15, s.id); assert.ok(s.page && s.work && s.claim && s.who, s.id); }
    for (const t of Object.keys(ev.anchors)) assert.ok(ev.anchors[t].resolution.length > 40, t);
  });
});

describe('what the adjudication decided', () => {
  test('the eight open anchors', () => {
    const f = (t) => [byTick[t].t.slice(11), byTick[t].adj_status];
    assert.deepEqual(f(28), ['10:15', 'Documented']); assert.deepEqual(f(75), ['16:55', 'Estimated']); assert.deepEqual(f(90), ['17:30', 'Contested']);
    assert.deepEqual(f(248), ['15:00', 'Contested']); assert.deepEqual(f(275), ['18:00', 'Contested']); assert.deepEqual(f(326), ['20:00', 'Documented']);
    assert.deepEqual(f(518), ['13:00', 'Documented']); assert.deepEqual(f(538), ['15:00', 'Contested']);
  });
  test('the unsupported minute 13:07 is gone; Lee\'s order has no source clock and says so', () => {
    assert.notEqual(byTick[518].t.slice(11), '13:07'); assert.match(byTick[75].adj_note, /NO source gives a clock time/);
  });
  test('contested anchors show a range', () => {
    assert.equal(model.anchorRange(90).text, 'between about 4:00 and 7:00 PM'); assert.equal(model.anchorRange(90).contested, true);
    assert.equal(model.anchorRange(538).text, 'between about 2:00 and 3:15 PM'); assert.equal(model.anchorRange(538).contested, true);
    assert.equal(model.anchorRange(518).contested, false);
  });
});

describe('the about policy and the per-tick uncertainty bound', () => {
  test('approx_sigma_min is 20 and every tick prints "about" because the smallest bound anywhere is 25 minutes', () => {
    assert.equal(doc.approx_sigma_min, 20);
    for (let t = 1; t <= 675; t++) { assert.ok(model.uncertaintyMin(t) >= 25, `tick ${t}`); assert.match(model.tickToLabel(t), /about /, `tick ${t}`); }
  });
  test('uncertainty.json: 675 rows, bound >= the model half-width sigma, interpolated between anchors, window brackets the clock', () => {
    assert.equal(unc.rows.length, 675); assert.equal(unc.version, doc.version); assert.equal(unc.approx_sigma_min, 20);
    for (const [tick, iso, u, about, contested, status, lo, hi] of unc.rows) {
      const c = model.tickToClock(tick); assert.equal(iso, c.iso);
      assert.ok(u + 0.01 >= c.sigmaMin, `tick ${tick}`); assert.equal(about, 1); assert.ok(lo <= c.minutes && c.minutes <= hi, `tick ${tick}`);
      assert.equal(contested, c.contested ? 1 : 0); assert.ok(['Documented', 'Estimated', 'Contested'].includes(status));
    }
    for (const a of A) { const r = unc.rows[a.tick - 1]; assert.equal(r[2], a.uncertainty_min); assert.equal(r[5], a.adj_status); }
    const mid = unc.rows[82][2], lo = byTick[75].uncertainty_min, hi = byTick[90].uncertainty_min, w = (83 - 75) / (90 - 75);
    assert.ok(Math.abs(mid - (lo * (1 - w) + hi * w)) < 0.01, 'tick 83 interpolates t75 and t90');
  });
  test('uncertainty.json is current (node tools/time/build.mjs --check covers it)', () => {
    assert.ok(fs.existsSync(P('tools', 'time', 'build', 'uncertainty.json')));
  });
});
