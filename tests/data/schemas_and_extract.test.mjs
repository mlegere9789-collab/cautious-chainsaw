// JSON Schemas, the acorn-based bundle extraction (no eval), the manifest/version/lock trio and facts.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as acorn from 'acorn';
import { loadSchemas, validateFileAgainstSchema, schemaRefForFile, SCHEMA_DIR } from '../../tools/data/lib/schemas.mjs';
import { literalFromAst, NonLiteralError, findLiteralArrays, extractEmbeddedDatasets } from '../../tools/data/lib/bundle_extract.mjs';
import { hashTree, readTsv, diffAgainstManifest, contentHash, PATHS, readJsonIfExists } from '../../tools/data/lib/manifest.mjs';
import { generateFacts, FACTS_PATH } from '../../tools/data/facts.mjs';
import { legacy, clone } from './helpers.mjs';
import { DEFAULT_BUNDLE, DEFAULT_DATA_DIR, REPO_ROOT } from '../../tools/data/lib/util.mjs';
import { buildContext } from '../../tools/data/lib/context.mjs';

test('every data-src/schemas file compiles under JSON Schema 2020-12 (strict)', () => {
  const ajv = loadSchemas();
  const names = fs.readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.schema.json'));
  assert.ok(names.length >= 9);
  for (const n of names) {
    const id = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, n), 'utf8')).$id;
    assert.ok(ajv.getSchema(id), n);
  }
});

test('all 71 legacy files have a schema and validate with zero errors (closed shapes)', () => {
  let n = 0;
  for (const [rel, f] of legacy.files) {
    assert.ok(schemaRefForFile(rel), `${rel} has no schema`);
    assert.deepEqual(validateFileAgainstSchema(rel, f.json), [], rel);
    n++;
  }
  assert.equal(n, 71);
});

test('schemas are closed: an unknown key, a bad enum, a missing field and a wrong type are each reported by the right rule', () => {
  const d = clone();
  const rows = d.files.get('placements_day1_ticks1_50.json').json.placements;
  rows[0].oops = 1;
  rows[1].disposition = 'Sideways';
  delete rows[2].lat;
  rows[3].bearing = 'north';
  const errs = validateFileAgainstSchema('placements_day1_ticks1_50.json', d.files.get('placements_day1_ticks1_50.json').json);
  const rules = new Set(errs.map((e) => e.rule));
  assert.ok(rules.has('S006') && rules.has('S004') && rules.has('S002') && rules.has('S003'), [...rules].join());
});

test('extraction converts only literal AST nodes and NEVER evaluates code', () => {
  globalThis.__pwn = 0;
  const src = 'const _A = [{ no: 1, name: "a", v: -1.5, ok: !0, list: [1, "x"], t: `tpl` }]; const B = [{ no: 2, name: (globalThis.__pwn = 1, "b") }]; const C = [{ no: 3, name: ident }];';
  const ast = acorn.parse(src, { ecmaVersion: 'latest', locations: true });
  const found = findLiteralArrays(ast, { keys: ['no', 'name'], minLen: 1 });
  assert.equal(found.length, 1, 'arrays with call/identifier values are skipped, not evaluated');
  assert.deepEqual(found[0].value, [{ no: 1, name: 'a', v: -1.5, ok: true, list: [1, 'x'], t: 'tpl' }]);
  assert.equal(globalThis.__pwn, 0, 'the sequence expression must not have run');
  assert.throws(() => literalFromAst(acorn.parseExpressionAt('f(1)', 0, { ecmaVersion: 'latest' })), NonLiteralError);
  assert.throws(() => literalFromAst(acorn.parseExpressionAt('({ ...x })', 0, { ecmaVersion: 'latest' })), NonLiteralError);
  assert.throws(() => literalFromAst(acorn.parseExpressionAt('`a${b}`', 0, { ecmaVersion: 'latest' })), NonLiteralError);
});

test('the deployed bundle yields 512 monuments at the cited lines, 20 story markers, 16 tour stops, and no API key leaks into the extract', () => {
  const emb = extractEmbeddedDatasets(DEFAULT_BUNDLE);
  assert.equal(emb.monuments.length, 512);
  assert.deepEqual([emb.monumentsLoc.start, emb.monumentsLoc.end], [104440, 110609]);
  assert.equal(emb.story.length, 20);
  assert.equal(emb.tour.length, 16);
  assert.deepEqual(emb.warnings, []);
  const blob = JSON.stringify(emb);
  assert.ok(!/AIza[0-9A-Za-z_-]{20,}/.test(blob), 'the Google key constant that follows the array must not be extracted');
  assert.equal(new Set(emb.monuments.map((m) => m.no)).size, 512);
  assert.equal(emb.monuments.filter((m) => m.src).length, 9);
});

test('legacy-roundtrip: the tree equals data-src/legacy-manifest.tsv byte for byte (71 files)', () => {
  const man = readTsv();
  assert.equal(man.length, 71);
  const d = diffAgainstManifest(hashTree(DEFAULT_DATA_DIR), man);
  assert.deepEqual(d, { missing: [], extra: [], changed: [] });
});

test('version.json, data.lock.json and CHANGELOG agree', () => {
  const v = readJsonIfExists(PATHS.version);
  const lock = readJsonIfExists(PATHS.lock);
  assert.equal(v.data_version, '0.9.0');
  assert.equal(v.history.at(-1).content_sha256, contentHash(hashTree(DEFAULT_DATA_DIR)));
  assert.equal(Object.keys(lock.names).length, 71);
  assert.ok(Object.values(lock.names).every((h) => h.length === 1 && /^[0-9a-f]{64}$/.test(h[0])));
  assert.ok(fs.readFileSync(PATHS.changelog, 'utf8').includes('## [0.9.0]'));
});

test('the frozen manifest is never rewritten by freeze', () => {
  const r = spawnSync(process.execPath, [path.join(REPO_ROOT, 'tools', 'data', 'manifest.mjs'), 'freeze'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /already exists/);
});

test('facts.json: counts come from data, casualty authorities are listed with their status, and no clock is asserted', () => {
  const text = fs.readFileSync(FACTS_PATH, 'utf8');
  assert.equal(text, generateFacts(), 'facts.json is stale: run node tools/data/facts.mjs');
  const f = JSON.parse(text);
  assert.equal(f.units.total, 569);
  assert.equal(f.units.regiments, 465);
  assert.equal(f.units.batteries, 104);
  assert.equal(f.units.records, 570);
  assert.equal(f.content.vignettes, 24);
  assert.equal(f.content.chronology_events, 137);
  assert.equal(f.content.monuments, 512);
  assert.equal(f.content.tour_stops, 16);
  assert.equal(f.units.unresolved_placed_ids, 95);
  assert.equal(f.ticks.total, 675);
  assert.ok(!('minutes_per_tick' in f.ticks), 'the clock is chapter 04 / D-TIME');
  assert.equal(f.casualties.authorities.union.find((a) => a.id === 'OR27-1-NO15').total, 23049);
  const guild = f.casualties.authorities.confederate.find((a) => a.id === 'OR27-2-GUILD');
  assert.equal(guild.total, 20451);
  assert.equal(guild.status, 'verified_ocr_scrambled');
  assert.equal(f.casualties.authorities.confederate.filter((a) => a.status === 'secondary_unverified').length, 2);
  assert.equal(f.casualties.site_figures_measured.dashboard_combined_period_sum, 46163);
});

test('authorities: every number that is not verified says so, and the OR arithmetic checks out', () => {
  const a = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data-src', 'authorities', 'authorities.json'), 'utf8'));
  for (const side of ['union', 'confederate']) for (const v of a.casualties[side].values) {
    assert.ok(['verified_ocr', 'verified_ocr_scrambled', 'secondary_unverified', 'chapter_verified_not_rechecked'].includes(v.status), v.id);
    if (v.K != null) assert.equal(v.K + v.W + v.M, v.total, `${v.id}: K+W+M`);
  }
  assert.equal(3155 + 14529 + 5365, 23049);
  assert.equal(246 + 2909, 3155);
  assert.equal(2592 + 12709 + 5150, 20451);
});

test('D001-style guard: the same tree with one changed byte is detected by hash', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gtbg-m-'));
  try {
    fs.cpSync(DEFAULT_DATA_DIR, dir, { recursive: true });
    fs.appendFileSync(path.join(dir, 'terrain.json'), ' ');
    const d = diffAgainstManifest(hashTree(dir), readTsv());
    assert.deepEqual(d.changed, ['terrain.json']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

import { spawnSync } from 'node:child_process';
void buildContext;
