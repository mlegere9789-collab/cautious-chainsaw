// Golden table, inverse checks against the specialist CSVs, and generated-file freshness (TM-V11, TM-V12; WP-TIME-02/20).
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { P, parseHm, parseJulyDay, julyMinutes, parseJulyClock } from '../../tools/time/lib.mjs';
import m, { makeTimeModel, anchorsDoc, ticksJson, goldenCsv } from '../../src/lib/time/index.js';
import FULL from '../../src/lib/time/anchors.generated.js';
import { runtimeDoc } from '../../tools/time/slim.mjs';
import { doc, model, csv, proposalModel } from './helpers.mjs';

const norm = (s) => s.replace(/(\d)a$/, '$1am').replace(/(\d)p$/, '$1pm');

describe('golden tick-clock table (TM-V11)', () => {
  test('tests/time/golden/tick-clock.csv is byte-identical to the model output', () => {
    const file = fs.readFileSync(P('tests', 'time', 'golden', 'tick-clock.csv'), 'utf8');
    assert.equal(file, model.goldenCsv(), 'regenerate with node tools/time/build.mjs and review the diff together with a time_anchors version bump');
    const rows = file.trim().split('\n'); assert.equal(rows.length, 676); assert.equal(rows[0], 'tick,iso,tab,mpt,sigma,approx,night,label');
  });
  test('generated modules (full document and runtime subset), ticks.json and IIFE are current with time_anchors.json', () => {
    assert.deepEqual(JSON.parse(JSON.stringify(FULL)), doc, 'anchors.generated.js (tooling) is the full document');
    assert.deepEqual(JSON.parse(JSON.stringify(anchorsDoc)), runtimeDoc(doc), 'anchors.runtime.generated.js (the ES route) is exactly the runtime subset of it');
    const ticks = JSON.parse(fs.readFileSync(P('tools', 'time', 'build', 'ticks.json'), 'utf8'));
    assert.equal(ticks.rows.length, 675); assert.deepEqual(ticks.rows, ticksJson()); assert.equal(ticks.version, doc.version);
    assert.equal(goldenCsv(), model.goldenCsv());
  });
  test('independent oracle: the clocks app-time listed for the proposed anchors', () => {
    const want = { 1: '5:00 AM', 12: '7:30 AM', 17: '8:22 AM', 28: '10:15 AM', 100: '8:00 PM', 150: '11:22 PM', 225: '4:26 AM', 226: '4:30 AM', 240: '12:00 PM', 256: '4:00 PM', 264: '4:22 PM', 267: '4:30 PM',
      275: '6:00 PM', 280: '6:30 PM', 302: '7:10 PM', 376: '12:27 AM', 440: '3:54 AM', 450: '4:27 AM', 451: '4:30 AM', 460: '5:20 AM', 518: '1:07 PM', 538: '3:00 PM', 551: '3:35 PM', 553: '3:45 PM', 556: '4:00 PM', 600: '6:04 PM', 675: '8:00 PM' };
    for (const [t, s] of Object.entries(want)) assert.equal(proposalModel.format(+t, 'time'), s, `tick ${t}`);
  });
  test('TX-01 ticks {1,12,17,28,160,226,267,302,451,538,553,675}: one string per tick from one function', () => {
    for (const t of [1, 12, 17, 28, 160, 226, 267, 302, 451, 538, 553, 675]) {
      const s = new Set([m.tickToLabel(t), model.tickToLabel(t), makeTimeModel(doc).tickToLabel(t), m.tickToLabelParts(t).text]); assert.equal(s.size, 1, `tick ${t}`);
    }
  });
});

// These oracles describe the FROZEN 2026-09-30 proposal (helpers.mjs `proposalModel`): the specialist CSVs were computed from it.
describe('inverse consistency against the time-facts specialist (WP-TIME-02 acceptance)', () => {
  test('129/129: minutesToTick(real_best) reproduces tick_under_proposed_anchors within 0.1 tick (worst 0.05)', () => {
    const facts = csv('time-facts.csv'); let worst = 0, inRange = 0;
    for (const f of facts) {
      const min = julyMinutes(parseJulyDay(f.date_1863), parseHm(f.real_best)), want = +f.tick_under_proposed_anchors;
      const got = proposalModel.clockToTick(min, { extrapolate: true }); worst = Math.max(worst, Math.abs(got - want));
      assert.ok(Math.abs(got - want) <= 0.1, `${f.id}: got ${got}, specialist ${want}`);
      if (min >= proposalModel.tickToMinutes(1) && min <= proposalModel.tickToMinutes(675)) { inRange++; assert.ok(Math.abs(proposalModel.clockToTick(min) - want) <= 0.1, f.id); }
    }
    assert.equal(facts.length, 129); assert.ok(worst <= 0.05 + 1e-9, `worst ${worst}`); assert.equal(inRange, 123, '6 facts sit before 5:00 AM July 1 or after 8:00 PM July 3 and are extrapolated at 5 min/tick');
  });
  test('137/137: the proposed clock at each site tick equals proposed_clock_from_anchors (+-1 min)', () => {
    const disc = csv('time-facts-discrepancy.csv'); assert.equal(disc.length, 137);
    for (const r of disc) assert.ok(Math.abs(Math.round(proposalModel.tickToMinutes(+r.site_tick)) - parseJulyClock(norm(r.proposed_clock_from_anchors))) <= 1, `tick ${r.site_tick}`);
  });
  test('62/62: the proposed clock at each other-claim tick equals proposed_clock_at_tick (+-1 min)', () => {
    const oc = csv('time-facts-otherclaims.csv');
    for (const r of oc) assert.ok(Math.abs(Math.round(proposalModel.tickToMinutes(+r.site_tick)) - parseJulyClock(norm(r.proposed_clock_at_tick))) <= 1, `${r.kind} ${r.id} tick ${r.site_tick}`);
    assert.equal(oc.length, 62);
  });
  test('residuals over the 102 matched events reproduce the specialist: mean abs 21 min, median 10, 86/102 within 30 (in-sample)', () => {
    const rows = csv('time-facts-discrepancy.csv').filter((r) => ['RELABEL', 'RELABEL-CONTESTED', 'TEXT-VS-LABEL'].includes(r.class));
    assert.equal(rows.length, 102);
    const res = rows.map((r) => Math.abs(parseJulyClock(norm(r.real_best)) - Math.round(proposalModel.tickToMinutes(+r.site_tick))));
    const mean = res.reduce((a, b) => a + b, 0) / res.length, sorted = [...res].sort((a, b) => a - b);
    assert.ok(Math.abs(mean - 21.3) < 0.2, `mean abs ${mean}`); assert.equal((sorted[50] + sorted[51]) / 2, 10); assert.equal(res.filter((x) => x <= 30).length, 86);
  });
  test('leave-one-out anchor prediction (29 interior non-design anchors): RMS 43.8 min, worst t518 +96, t340 +93, t515 -86', () => {
    const A = proposalModel.anchors, e = [];
    for (let i = 1; i < A.length - 1; i++) { if (A[i].status === 'D') continue; const p = A[i - 1], n = A[i + 1]; e.push([A[i].tick, A[i].minutes - (p.minutes + (n.minutes - p.minutes) * (A[i].tick - p.tick) / (n.tick - p.tick))]); }
    assert.equal(e.length, 29);
    assert.ok(Math.abs(Math.sqrt(e.reduce((a, [, x]) => a + x * x, 0) / e.length) - 43.8) < 0.2);
    const top = [...e].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3).map(([t, x]) => `${t}:${Math.round(x)}`);
    assert.deepEqual(top, ['518:96', '340:93', '515:-86']);
  });
});
