// The validator must reproduce the chapter-13 section 2 numbers on the frozen legacy tree, and the committed baseline must be
// exactly today's violations (a pure run of the CLI logic, not a copy).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runValidation } from '../../tools/data/lib/validation.mjs';
import { rowsOf } from '../../tools/data/lib/runner.mjs';
import { evaluateRatchet } from '../../tools/data/lib/ratchet.mjs';
import { buildCrosswalk, buildRegistry } from '../../tools/data/lib/registry.mjs';
import { measureSection2 } from '../../tools/data/lib/measure.mjs';
import { baseline, NOW } from './helpers.mjs';
import { REPO_ROOT } from '../../tools/data/lib/util.mjs';

const full = await runValidation({ now: NOW });
const { ctx, results } = full;
const rule = (id) => results.get(id);

test('the committed baseline equals today\'s run: the ratchet passes with zero failures and zero warnings', () => {
  const v = evaluateRatchet(results, baseline, { now: NOW });
  assert.deepEqual(v.failures, []);
  assert.deepEqual(v.warnings, []);
});

test('acceptance numbers of WP-DATA-03: 95 IDs / 216 rows, 103 keys / 68 conflicts, 188 ticks, 121 increases / 82 units', () => {
  const r1 = rule('R001').violations.filter((v) => v.kind === 'placement');
  assert.equal(r1.length, 95);
  assert.equal(rowsOf(r1), 216);
  assert.equal(rule('S007').violations.length, 103);
  assert.equal(rule('S007').violations.filter((v) => v.kind === 'conflicting').length, 68);
  assert.equal(675 - rule('C003').violations.length, 188);
  const inc = rule('N002').violations;
  assert.equal(inc.length, 121);
  assert.equal(new Set(inc.map((v) => v.data.unit)).size, 82);
});

test('identity rules: 10 wrong-side ids, 36 VI Corps regiments + 8 division links, 36 unlisted regiments, 1 visible alias', () => {
  assert.equal(rule('R002').violations.length, 10);
  assert.equal(rule('R003').violations.filter((v) => v.kind === 'regiment->brigade').length, 36);
  assert.equal(rule('R003').violations.filter((v) => v.kind === 'division->brigade').length, 8);
  assert.equal(rule('R004').violations.length, 36);
  assert.equal(rule('R006').violations.length, 1);
  assert.equal(rule('R009').violations[0].data.tick, 556);
});

test('geometry and text baselines quoted in the chapter', () => {
  assert.equal(rule('S005').violations.length, 49);
  assert.equal(rule('G002').violations.length, 379);
  assert.equal(rule('G005').violations.filter((v) => v.kind === 'over_1km').length, 17);
  assert.equal(rule('X007').violations.length, 24);
  assert.equal(rule('X006').violations.filter((v) => v.kind === 'short_key_action:regiment').length, 169);
  assert.equal(rule('P002').violations.length, 29);
  assert.equal(rule('T001').violations.length, 46);
  assert.equal(rule('T002').violations.filter((v) => v.kind === 'drift').length, 37);
});

test('L001 lists exactly the 18 legacy coordinates (8 Stone Sentinels, 4 HMDB, 6 Wikipedia)', () => {
  const l = rule('L001').violations;
  assert.equal(l.length, 18);
  const by = {};
  for (const v of l) by[v.kind] = (by[v.kind] || 0) + 1;
  assert.deepEqual(by, { 'stone-sentinels': 8, hmdb: 4, wikipedia: 6 });
});

test('F001 counts the literals the audit named: 467 x10, 445+ x1, 51,000 x6', () => {
  const by = {};
  for (const v of rule('F001').violations) by[v.kind] = (by[v.kind] || 0) + 1;
  assert.equal(by['count-467'], 10);
  assert.equal(by['count-445plus'], 1);
  assert.equal(by['casualties-51000'], 6);
});

test('M001 on the extracted 512-monument array: 503 without source, 51 blank mn, 28 outside the extent, MN 96 duplicated', () => {
  const by = {};
  for (const v of rule('M001').violations) by[v.kind] = (by[v.kind] || 0) + 1;
  assert.equal(by.no_id_src, 503);
  assert.equal(by.blank_mn, 51);
  assert.equal(by.outside_extent, 28);
  assert.equal(by.duplicate_mn, 1);
  assert.equal(by.corrupt_text, 1);
});

test('K001 and U001 (static scans of the deploy tree)', () => {
  assert.equal(rule('K001').violations.length, 1);
  assert.deepEqual(rule('K001').violations[0].data.fields.sort(), ['description', 'title']);
  assert.equal(rule('U001').violations.length, 5);
});

test('49 of the 51 section-2 measurements match the chapter exactly; the two that differ are the documented ones', () => {
  const crosswalk = buildCrosswalk(ctx);
  const registry = buildRegistry(ctx, new Map());
  const m = measureSection2(ctx, { crosswalk, registry });
  const bad = m.filter((x) => !x.ok).map((x) => x.fact);
  assert.deepEqual(bad.sort(), ['median rows per populated tick', ' " -- " in the DI 3.8 field groups'].sort());
  assert.equal(m.length, 51);
  assert.equal(m.length - bad.length, 49);
});

test('skipped rules are reported as skipped, never as clean', () => {
  for (const id of ['C005', 'G001', 'N008', 'E001', 'H001', 'P004']) {
    assert.equal(rule(id).ran, false, id);
    assert.ok(rule(id).reason, id);
  }
});

test('the baseline report on disk was generated from this baseline (dates agree)', () => {
  const md = fs.readFileSync(path.join(REPO_ROOT, 'docs', 'data', 'baseline-report.md'), 'utf8');
  assert.ok(md.includes(`dated ${baseline.generated}`));
  assert.ok(md.includes('ratchet verdict **PASS**'));
});
