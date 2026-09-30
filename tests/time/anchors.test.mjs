// Anchor data tests: schema, the 33 proposed anchors vs the specialist CSV, sigma/flag derivation, validator behaviour (WP-TIME-02/03, TM-V1).
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { P, readJson, parseHm, parseJulyDay, julyMinutes, isoOf } from '../../tools/time/lib.mjs';
import { validate as jsValidate, unsupported } from '../../tools/time/jsonschema.mjs';
import { validateAnchors, loadAnchors, AnchorError, deriveSigma, mechanicalFlags, makeTimeModel } from '../../src/lib/time/index.js';
import { doc, csv } from './helpers.mjs';

const schema = readJson(P('data-src', 'time', 'time_anchors.schema.json'));
const A = doc.anchors;
const clone = () => JSON.parse(JSON.stringify(doc));

describe('time_anchors.json against its schema', () => {
  test('schema uses only keywords the checker enforces', () => assert.deepEqual([...unsupported(schema)], []));
  test('document validates with 0 errors', () => assert.deepEqual(jsValidate(doc, schema), []));
  test('the schema rejects the obvious mutations', () => {
    const bad = (mut) => { const d = clone(); mut(d); return jsValidate(d, schema); };
    assert.ok(bad((d) => { d.anchors[0].status = 'X'; }).length);
    assert.ok(bad((d) => { d.anchors[0].t = '1863-07-01 05:00'; }).length);
    assert.ok(bad((d) => { d.anchors[0].sigma_min = 99; }).length);
    assert.ok(bad((d) => { delete d.anchors[0].label; }).length);
    assert.ok(bad((d) => { d.anchors[0].surprise = 1; }).length);
    assert.ok(bad((d) => { d.anchors[0].state = 'approved'; }).length);
    assert.ok(bad((d) => { d.schema = 2; }).length);
    assert.ok(bad((d) => { d.solar['1863-07-01'].sunrise = '4:35'; }).length);
    assert.ok(bad((d) => { d.anchors[0].flags = ['H', 'H']; }).length);
    assert.equal(bad((d) => { d.anchors[0].note = 'reviewer note'; }).length, 0);
  });
});

describe('the 33 proposed anchors equal docs/plan/data/time-facts-anchors.csv', () => {
  const rows = csv('time-facts-anchors.csv');
  test('tick, local time, status and event agree row by row', () => {
    assert.equal(rows.length, 33); assert.equal(A.length, 33);
    rows.forEach((r, i) => {
      const day = parseJulyDay(r.local_time_1863), hm = /(\d{1,2}:\d{2}\s*[ap]m)/i.exec(r.local_time_1863)[1];
      assert.equal(A[i].tick, +r.tick); assert.equal(A[i].t, isoOf(julyMinutes(day, parseHm(hm)))); assert.equal(A[i].status, r.status);
      assert.equal(A[i].evidence, r.evidence);
      for (const id of r.event.match(/R\d{3}/g) || []) assert.ok(A[i].facts.includes(id), `tick ${A[i].tick} fact ${id}`);
    });
  });
  test('status counts S 12, M 13, R 5, D 3; effective status differs only for the circular t5', () => {
    const c = {}; for (const a of A) c[a.status] = (c[a.status] || 0) + 1;
    assert.deepEqual(c, { S: 12, M: 13, R: 5, D: 3 });
    assert.deepEqual(A.filter((a) => a.status === 'R').map((a) => a.tick), [75, 90, 248, 275, 538]);
    assert.deepEqual(A.filter((a) => a.status === 'D').map((a) => a.tick), [100, 226, 675]);
    assert.deepEqual(A.filter((a) => a.effective_status && a.effective_status !== a.status).map((a) => [a.tick, a.effective_status]), [[5, 'D']]);
  });
  test('R anchors are needs-historian, D anchors are owner-sign, t5 is an owner decision; every row starts proposed', () => {
    for (const a of A) {
      assert.equal(a.state, 'proposed'); assert.equal(a.decision, null);
      if (a.status === 'R') assert.equal(a.review_flag, 'needs-historian');
      else if (a.status === 'D') assert.equal(a.review_flag, 'owner-sign');
    }
    assert.equal(A.find((a) => a.tick === 5).review_flag, 'owner-decision');
    assert.equal(doc.release, 'candidate'); assert.match(doc.notice, /CANDIDATE/);
  });
  test('confidence class maps S->A, M->B, R->C, D->D', () => { for (const a of A) assert.equal(a.confidence, { S: 'A', M: 'B', R: 'C', D: 'D' }[a.status]); });
});

describe('sigma and flags are reproducible from the fact rows (chapter 04 section 4.4)', () => {
  const facts = Object.fromEntries(csv('time-facts.csv').map((r) => [r.id, r]));
  test('sigma = min(30, max(5, ceil(half-width of the widest linked range / 5) * 5)); D anchors and circular t5 are 30', () => {
    for (const a of A) {
      if (a.status === 'D' || a.circular) { assert.equal(a.sigma_min, 30, `tick ${a.tick}`); continue; }
      const w = Math.max(...a.facts.map((id) => julyMinutes(1, parseHm(facts[id].real_end)) - julyMinutes(1, parseHm(facts[id].real_start))));
      assert.equal(a.sigma_min, Math.min(30, Math.max(5, Math.ceil(w / 2 / 5) * 5)), `tick ${a.tick}`);
      assert.equal(deriveSigma(a.range), a.sigma_min, `tick ${a.tick} (range union)`);
    }
  });
  test('the anchor time lies inside the union of its fact ranges; fact rows exist; sources are the rows own keys', () => {
    for (const a of A.filter((x) => x.status !== 'D')) {
      const [lo, hi] = a.range.map((s) => +s.slice(0, 2) * 60 + +s.slice(3)); const mod = +a.t.slice(11, 13) * 60 + +a.t.slice(14);
      assert.ok(mod >= lo && mod <= hi, `tick ${a.tick}`);
      for (const id of a.facts) { assert.ok(facts[id], id); for (const s of facts[id].sources.split(',')) assert.ok(a.sources.includes(s.trim()), `${a.tick} ${s}`); }
    }
  });
  test('flags: 18 of 33 carry one, 15 pass; M/E/W come from the mechanical rules, H/O/C from status and circularity', () => {
    const flagged = A.filter((a) => a.flags.length).map((a) => a.tick);
    assert.equal(flagged.length, 18);
    assert.deepEqual(A.filter((a) => !a.flags.length).map((a) => a.tick), [12, 57, 64, 72, 240, 256, 267, 280, 295, 314, 340, 451, 518, 551, 568]);
    const strong = doc.evidence_families.strong;
    for (const a of A) {
      const want = [...(a.status === 'R' ? ['H'] : []), ...(a.status === 'D' ? ['O'] : []), ...(a.circular ? ['C'] : []), ...mechanicalFlags(a, strong)];
      assert.deepEqual([...a.flags].sort(), want.sort(), `tick ${a.tick}`);
    }
  });
  test('S-status anchors failing the evidence rule (one OR report or two strong families): t1, t36, t326, t515', () => {
    const strong = doc.evidence_families.strong;
    const fails = A.filter((a) => a.status === 'S' && mechanicalFlags(a, strong).includes('E')).map((a) => a.tick);
    assert.deepEqual(fails, [1, 36, 326, 515]);
  });
  test('families are the specialist known keys', () => {
    const known = new Set([...doc.evidence_families.strong, ...doc.evidence_families.weak, 'sun']);
    for (const a of A) for (const f of a.families) assert.ok(known.has(f), `${a.tick} ${f}`);
  });
});

describe('validateAnchors (TM-V1)', () => {
  test('the shipped candidate is ok; warnings are exactly the four lulls and the evidence-rule list', () => {
    const r = validateAnchors(doc);
    assert.equal(r.ok, true, JSON.stringify(r.errors));
    assert.deepEqual(r.warnings.map((w) => w.code + (w.tick ? ':' + w.tick : '')).sort(), ['V1.evidence', 'V1.lull:12', 'V1.lull:240', 'V1.lull:248', 'V1.lull:518']);
    assert.deepEqual(r.info.needsHistorian, [75, 90, 248, 275, 538]); assert.deepEqual(r.info.design, [100, 226, 675]); assert.deepEqual(r.info.evidenceFailures, [1, 36, 326, 515]);
    assert.equal(validateAnchors(doc, { evidenceAsError: true }).ok, false);
  });
  const mut = (f) => { const d = clone(); f(d); return validateAnchors(d); };
  const codes = (r) => r.errors.map((e) => e.code);
  test('rejects non-monotone ticks and minutes', () => {
    assert.ok(codes(mut((d) => { d.anchors[6].t = d.anchors[5].t; })).includes('V1.order'));
    assert.ok(codes(mut((d) => { d.anchors[6].tick = d.anchors[5].tick; })).includes('V1.order'));
    assert.ok(codes(mut((d) => { d.anchors.reverse(); })).includes('V1.order'));
  });
  test('rejects a missing tick 1, tab start or tick_max mismatch', () => {
    assert.ok(codes(mut((d) => { d.anchors.shift(); })).includes('V1.first'));
    assert.ok(codes(mut((d) => { d.anchors = d.anchors.filter((a) => a.tick !== 226); })).includes('V1.tab-anchor'));
    assert.ok(codes(mut((d) => { d.anchors = d.anchors.filter((a) => a.tick !== 451); })).includes('V1.tab-anchor'));
    assert.ok(codes(mut((d) => { d.tick_max = 674; })).includes('V1.tick_max'));
    assert.ok(codes(mut((d) => { d.tab_days = [[1, 225], [227, 450], [451, 675]]; })).includes('V1.tabs'));
  });
  test('rejects slopes over 60 or under 0.75 min/tick; warns over 15', () => {
    assert.ok(codes(mut((d) => { const a = d.anchors.find((x) => x.tick === 240); a.t = '1863-07-03T23:00'; })).includes('V1.slope'));
    assert.ok(codes(mut((d) => { d.anchors.find((x) => x.tick === 302).t = '1863-07-02T19:00'; d.anchors.find((x) => x.tick === 295).t = '1863-07-02T18:59'; })).includes('V1.slope'));
    const r = mut((d) => { d.anchors.find((x) => x.tick === 275).t = '1863-07-02T19:00'; });
    assert.ok(r.warnings.some((w) => w.code === 'V1.lull' || w.code === 'V1.slope'));
  });
  test('rejects a bad status/class pairing, an unknown state, a signed anchor without a decision id', () => {
    assert.ok(codes(mut((d) => { d.anchors[3].confidence = 'D'; })).includes('V1.class'));
    assert.ok(codes(mut((d) => { d.anchors[3].state = 'approved'; })).includes('V1.state'));
    assert.ok(codes(mut((d) => { d.anchors[3].state = 'signed'; })).includes('V18.signed'));
    assert.equal(mut((d) => { d.anchors[3].state = 'signed'; d.anchors[3].decision = 'D-0001'; }).ok, true);
  });
  test('rejects a broken solar table and garbage', () => {
    assert.ok(codes(mut((d) => { d.solar['1863-07-01'].sunrise = '03:00'; })).includes('V1.solar'));
    assert.equal(validateAnchors(null).ok, false); assert.equal(validateAnchors({ anchors: [] }).ok, false);
  });
  test('warns when declared flags or sigma drift from the derivation', () => {
    assert.ok(mut((d) => { d.anchors[2].flags = ['E']; }).warnings.some((w) => w.code === 'V1.flags'));
    assert.ok(mut((d) => { d.anchors[2].sigma_min = 25; }).warnings.some((w) => w.code === 'V1.sigma-derivation'));
    assert.ok(mut((d) => { d.anchors[2].t = '1863-07-01T09:00'; }).warnings.some((w) => w.code === 'V1.range'));
  });
  test('loadAnchors builds a model from an object or JSON text, and throws AnchorError listing every error', () => {
    assert.equal(loadAnchors(doc).tickMax, 675); assert.equal(loadAnchors(JSON.stringify(doc)).tickToClock(538).iso, '1863-07-03T15:00');
    const d = clone(); d.anchors[6].t = d.anchors[5].t; d.tz = 'EST';
    assert.throws(() => loadAnchors(d), (e) => e instanceof AnchorError && e.errors.length >= 2);
  });
  test('a doc without optional fields still builds a model', () => {
    const t = makeTimeModel({ anchors: [{ tick: 1, t: '1863-07-01T05:00', sigma_min: 10, status: 'S' }, { tick: 3, t: '1863-07-01T05:10', sigma_min: 10, status: 'S' }] });
    assert.equal(t.tickToClock(2).iso, '1863-07-01T05:05'); assert.equal(t.tabDay(2), 1);
  });
});
