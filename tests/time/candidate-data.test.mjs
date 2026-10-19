// WP-TIME-06 candidate data regeneration (tools/time/relabel-data.mjs): edits are reviewable, structure-preserving, reversible, and turn TM-V4 and
// TM-V13 green on a candidate tree while the frozen legacy data is never touched. CANDIDATE: derived from the proposed anchors, unreviewed.
import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { P, LEGACY, readJson } from '../../tools/time/lib.mjs';
import { buildContext, runAll } from '../../tools/time/rules.mjs';
import { legacyLabel, calDate } from '../../tools/time/clocktext.mjs';
import { doc, model } from './helpers.mjs';

const DATA = path.join(LEGACY, 'data');
const digest = () => { const h = crypto.createHash('sha256'); const walk = (d) => { for (const f of fs.readdirSync(d).sort()) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else h.update(f).update(fs.readFileSync(p)); } }; walk(DATA); return h.digest('hex'); };
let tree, before0;
before(() => {
  before0 = digest(); tree = fs.mkdtempSync(path.join(os.tmpdir(), 'gtbg-cand-'));
  fs.cpSync(LEGACY, tree, { recursive: true, filter: (s) => !/[\\/](screenshots|icons)([\\/]|$)/.test(s) && !/\.(png|pdf|ico)$/.test(s) });
  const r = spawnSync(process.execPath, [P('tools', 'time', 'relabel-data.mjs'), '--write-tree', tree], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
after(() => fs.rmSync(tree, { recursive: true, force: true }));
const cand = (rel) => readJson(path.join(tree, 'data', rel)), legacy = (rel) => readJson(path.join(DATA, rel));

describe('the frozen legacy data is never touched', () => {
  test('legacy/dist/data has the same digest after generation, and no stray directory was created at the repo root', () => { assert.equal(digest(), before0); assert.ok(!fs.existsSync(P('true'))); });
});

describe('chronology', () => {
  test('every label equals the model at its tick (5-minute rounding); changed labels keep the old value as time_legacy; TM-V4 goes from 130 mismatches to 0', () => {
    for (const d of [1, 2, 3]) {
      const a = legacy(`chronology_day${d}.json`).events, b = cand(`chronology_day${d}.json`).events; assert.equal(a.length, b.length);
      a.forEach((e, i) => {
        assert.equal(b[i].time, legacyLabel(model, e.tick), `t${e.tick}`);
        if (e.time !== b[i].time) assert.equal(b[i].time_legacy, e.time, `t${e.tick}`); else assert.equal(b[i].time_legacy, undefined);
      });
    }
    const r = Object.fromEntries(runAll(buildContext(model, doc, { tree })).map((x) => [x.id, x])), l = Object.fromEntries(runAll(buildContext(model, doc)).map((x) => [x.id, x]));
    assert.equal(l['TM-V4'].data.modelBad, 130); assert.equal(r['TM-V4'].data.modelBad, 0); assert.equal(r['TM-V4'].status, 'pass');
  });
  test('structure is preserved: removing the added keys and restoring the old label gives back the legacy event exactly', () => {
    for (const d of [1, 2, 3]) { const a = legacy(`chronology_day${d}.json`).events, b = cand(`chronology_day${d}.json`).events;
      b.forEach((e, i) => { const o = { ...e }; if (o.time_legacy !== undefined) { o.time = o.time_legacy; delete o.time_legacy; } delete o.date; assert.deepEqual(o, a[i], `t${e.tick}`); }); }
  });
  test('the calendar date is added exactly where it differs from the Day tab (t380, t400, t420, t440, t450: after midnight on July 3)', () => {
    const dated = []; for (const d of [1, 2, 3]) for (const e of cand(`chronology_day${d}.json`).events) if (e.date) dated.push([e.tick, e.date, e.time]);
    assert.deepEqual(dated.map((x) => x[0]), [380, 400, 420, 440, 450]); for (const [t, date] of dated) assert.equal(date, calDate(model, t));
    assert.deepEqual(dated.map((x) => x[1]), ['July 3', 'July 3', 'July 3', 'July 3', 'July 3']);
  });
  test('tick_formula becomes a pointer to the anchors, not a five-minute claim', () => {
    for (const d of [1, 2, 3]) { const f = cand(`chronology_day${d}.json`).metadata.tick_formula; assert.match(f, /time_anchors\.json/); assert.match(f, /not fixed five-minute steps/); assert.doesNotMatch(f, /Each tick = 5 minutes/); assert.match(f, /unreviewed/); }
  });
  test('the rest of the metadata and every non-time field is byte-for-byte the legacy value', () => {
    for (const d of [1, 2, 3]) { const a = legacy(`chronology_day${d}.json`), b = cand(`chronology_day${d}.json`); const ma = { ...a.metadata }, mb = { ...b.metadata }; delete ma.tick_formula; delete mb.tick_formula; assert.deepEqual(mb, ma); }
  });
});

describe('metadata truth', () => {
  test('placement_schema: per-day real_time from the model, no 430,000 or 600-700, no 5-minute tick claim', () => {
    const s = cand('placement_schema.json'), md = s.metadata;
    assert.equal(md.ticks_per_day.day1.real_time, 'about 5:00 AM July 1 to about 4:25 AM July 2'); assert.equal(md.ticks_per_day.day3.real_time, 'about 4:15 AM July 3 to about 8:00 PM July 3'); // adjudication 2026-10-18: t451 moved 04:30 -> 04:15 (docs/time/ANCHORS-FINAL.md)
    assert.doesNotMatch(md.purpose, /430,000/); assert.match(md.purpose, /1,804 rows in 47 files, on 188 of 675 ticks/); assert.equal(md.total_placement_records, '1804'); assert.match(md.expected_units_per_tick, /^about 10 rows on a populated tick/);
    assert.doesNotMatch(JSON.stringify(s), /5-minute tick number/);
  });
  test('placements chunk descriptions carry the model span for their ticks; record_count is what the file holds', () => {
    const f = cand('placements_day1_ticks1_50.json'); assert.equal(f.metadata.record_count, f.placements.length); assert.equal(f.metadata.record_count, 100);
    assert.match(f.metadata.description, /about 5:00 AM to about 1:55 PM/); assert.match(cand('placements_day3_ticks521_600.json').metadata.description, /THE CLIMACTIC SEQUENCE/, 'the prose after the clock span is kept');
    for (const n of ['placements_day1_ticks1_50', 'placements_day2_ticks301_375']) { const a = legacy(n + '.json'), b = cand(n + '.json'); assert.deepEqual(b.placements, a.placements); }
  });
  test('TM-V13 goes from 18 findings to 0 on the candidate tree', () => {
    const r = Object.fromEntries(runAll(buildContext(model, doc, { tree })).map((x) => [x.id, x])); assert.equal(runAll(buildContext(model, doc)).find((x) => x.id === 'TM-V13').count, 18); assert.equal(r['TM-V13'].count, 0, r['TM-V13'].details.join('\n'));
  });
  test('casualty_apportionment gains claimed and model durations beside the explicit prose durations, nothing else changes', () => {
    const c = cand('casualty_apportionment.json'), l = legacy('casualty_apportionment.json'), n = c.notable_intensity_notes;
    assert.deepEqual([n.most_compressed_union.claimed_duration_min, n.most_compressed_confederate.claimed_duration_min, n.longest_sustained_action.claimed_duration_min], [120, 30, 420]);
    assert.equal(n.most_compressed_confederate.model_duration_min, Math.round(model.tickToMinutes(558) - model.tickToMinutes(538)));
    const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k === 'claimed_duration_min' || k === 'model_duration_min' ? undefined : v))); assert.deepEqual(strip(c), l);
  });
  test('successions: approx_time from the model, legacy kept; 0 of 37 typed clocks agreed with the file\'s own formula, 13 agree with the candidate', () => {
    const c = cand('oob/commander_successions.json'), l = legacy('oob/commander_successions.json');
    for (const [a, b] of [[l.union_successions, c.union_successions], [l.confederate_successions, c.confederate_successions]]) a.forEach((r, i) => { assert.equal(b[i].approx_time_legacy, r.approx_time); assert.equal(b[i].approx_time, `${calDate(model, r.approx_tick)} ~${legacyLabel(model, r.approx_tick)}`); });
    const stats = readJson(P('tools', 'time', 'build', 'candidate-data', 'stats.json')); assert.equal(stats.successions.parseable, 37); assert.equal(stats.successions.agreeWithLegacyFormula30, 0); assert.equal(stats.successions.agreeWithModel30, 13); assert.equal(stats.successions.byteExact2Space, true);
  });
});

describe('the change list', () => {
  test('changes.json and the generated diff document are current, and the diff says at the top that nothing ships', () => {
    const before = fs.readFileSync(P('tools', 'time', 'build', 'candidate-data', 'changes.json'), 'utf8'); const r = spawnSync(process.execPath, [P('tools', 'time', 'relabel-data.mjs')], { encoding: 'utf8' }); assert.equal(r.status, 0);
    assert.equal(fs.readFileSync(P('tools', 'time', 'build', 'candidate-data', 'changes.json'), 'utf8'), before);
    assert.match(fs.readFileSync(P('docs', 'editorial', 'candidate-data-diff.md'), 'utf8').split('\n').slice(0, 4).join('\n'), /nothing here ships until they approve it/);
    const c = JSON.parse(before); assert.equal(c.stats.chronology.relabeled, 133); assert.equal(c.stats.chronology.dated, 5); assert.equal(c.stats.chronology.unchanged, 4); // was 134/5/3 before the 2026-10-18 adjudication moved anchors
  });
  test('a write-tree without a directory is an error, not a stray folder named "true"', () => {
    const r = spawnSync(process.execPath, [P('tools', 'time', 'relabel-data.mjs'), '--write-tree'], { encoding: 'utf8' }); assert.equal(r.status, 2); assert.ok(!fs.existsSync(P('true')));
  });
});
