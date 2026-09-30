// Regression tests for the fixes made after the adversarial verification of the data-quality workstream (VQ-01..14 in
// verify-data-quality.test.mjs stay untouched). Each test names the defect it pins and fails against the pre-fix behaviour:
// a rule that stops running must fail the ratchet; the emitter cannot be aimed at legacy/ by case, `..`, junctions or hard links;
// every CLI works from a checkout whose path holds a space and a non-ASCII letter; G003 measures day seams and DV-07 caps;
// facts.json derives what it can; the byte-exact emitter patches numbers as stored; the rights audit decides every row;
// P001 measures instead of assuming; the crosswalk carries confidence per placement row; and no test reads the wall clock.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { clone, baseline, baselineFor, NOW, rmrf, row, placementFile, tmpCopyOfData, makeRepoCopy } from './helpers.mjs';
import { runValidation } from '../../tools/data/lib/validation.mjs';
import { runRules } from '../../tools/data/lib/runner.mjs';
import { evaluateRatchet, tightenBaseline, buildBaseline } from '../../tools/data/lib/ratchet.mjs';
import { FAMILY_MODULES, loadAllRules, catalogueIds } from '../../tools/data/rules/index.mjs';
import { defineRule, notApplicable } from '../../tools/data/rules/define.mjs';
import { hasRecordSource, provenanceCoverage } from '../../tools/data/rules/prov_rules.mjs';
import { speedsOf, linearClock, armOf, DV07_CAP_M_PER_MIN } from '../../tools/data/rules/geometry_rules.mjs';
import { applyEditsToText, assertNotLegacy } from '../../tools/data/emit_legacy.mjs';
import { buildContext } from '../../tools/data/lib/context.mjs';
import { dataFromObjects } from '../../tools/data/lib/load.mjs';
import { generateFacts } from '../../tools/data/facts.mjs';
import { tickModel } from '../../tools/data/lib/facts.mjs';
import { buildCrosswalk } from '../../tools/data/lib/registry.mjs';
import { buildAliasTable } from '../../tools/data/lib/candidates.mjs';
import { buildAudit, renderCsv, ACTIONS } from '../../tools/data/rights_audit.mjs';
import { hashTree, diffAgainstManifest, readTsv } from '../../tools/data/lib/manifest.mjs';
import { isMainModule, REPO_ROOT, DEFAULT_DATA_DIR, DEFAULT_BUNDLE } from '../../tools/data/lib/util.mjs';
import { extractEmbeddedDatasets, classifyFeatureCollection } from '../../tools/data/lib/bundle_extract.mjs';

const node = process.execPath;
const run = (args, opts = {}) => spawnSync(node, args, { encoding: 'utf8', ...opts });
const VALIDATE = path.join(REPO_ROOT, 'tools', 'data', 'validate.mjs');
const fakeRule = (over = {}) => defineRule({ id: 'S001', sev: 'E', family: 'schema', title: 't', status: 'implemented', wp: 'x', run: () => [], ...over });
const results = (rule, r) => new Map([[rule.id, { rule, violations: [], ...r }]]);
const baselineCopy = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gtbg-bl-'));
  const file = path.join(dir, 'baseline.json');
  fs.copyFileSync(path.join(REPO_ROOT, 'tools', 'data', 'baseline.json'), file);
  return { dir, file };
};

// ---------------------------------------------------------------------------------------------------------------------------------
// ratchet: a rule that did not run never counts as clean
// ---------------------------------------------------------------------------------------------------------------------------------

test('ratchet: a rule that returned "input not available" fails an E rule, only warns a W rule (--strict fails it), and never hides a baselined rule', () => {
  const e = fakeRule();
  const w = fakeRule({ id: 'G003', sev: 'W', family: 'geometry' });
  const gone = (rule) => results(rule, { ran: false, reason: 'input not available' });
  const ve = evaluateRatchet(gone(e), { rules: {} }, { now: NOW });
  assert.equal(ve.pass, false);
  assert.equal(ve.failures[0].type, 'not_run');
  const vw = evaluateRatchet(gone(w), { rules: {} }, { now: NOW });
  assert.equal(vw.pass, true);
  assert.equal(vw.warnings[0].type, 'not_run');
  assert.equal(evaluateRatchet(gone(w), { rules: {} }, { now: NOW, strict: true }).pass, false);
  // a baselined W rule that vanished is a FAILURE whatever its severity: known violations cannot be told from fixed ones
  const vb = evaluateRatchet(gone(w), { rules: { G003: { count: 3, keys: ['a', 'b', 'c'] } } }, { now: NOW });
  assert.equal(vb.pass, false);
  assert.equal(vb.failures[0].type, 'baselined_rule_not_run');
});

test('ratchet: deferred and notApplicable() rules are informational, but a deferred or n/a rule that has baseline entries still fails', () => {
  const deferred = fakeRule({ id: 'C005', family: 'coverage', status: 'deferred', blocked_by: 'x', run: () => null });
  const na = fakeRule({ id: 'D001', family: 'release' });
  assert.equal(evaluateRatchet(results(deferred, { ran: false, reason: 'blocked' }), { rules: {} }, { now: NOW }).pass, true);
  assert.equal(evaluateRatchet(results(na, { ran: false, notApplicable: true, reason: 'memory' }), { rules: {} }, { now: NOW }).pass, true);
  for (const [rule, extra] of [[deferred, {}], [na, { notApplicable: true }]]) {
    const v = evaluateRatchet(results(rule, { ran: false, reason: 'x', ...extra }), { rules: { [rule.id]: { count: 1, keys: ['k'] } } }, { now: NOW });
    assert.equal(v.pass, false, rule.id);
    assert.equal(v.failures[0].type, 'baselined_rule_not_run');
  }
});

test('runner: notApplicable() is reported as such, null is "input not available", and a bad return value is a rule error (never a pass)', async () => {
  const ctx = buildContext({ bundlePath: null, distDir: null });
  const d1 = (await loadAllRules()).find((r) => r.id === 'D001');
  const saved = d1.run;
  try {
    d1.run = () => notApplicable('because');
    let r = (await runRules(ctx, { only: ['D001'] })).results.get('D001');
    assert.deepEqual([r.ran, r.notApplicable, r.reason], [false, true, 'because']);
    d1.run = () => null;
    r = (await runRules(ctx, { only: ['D001'] })).results.get('D001');
    assert.deepEqual([r.ran, r.notApplicable ?? false, r.reason], [false, false, 'input not available']);
    d1.run = () => 'oops';
    r = (await runRules(ctx, { only: ['D001'] })).results.get('D001');
    assert.equal(r.ran, false);
    assert.match(r.error, /returned string/);
    assert.equal(evaluateRatchet(new Map([['D001', r]]), { rules: {} }, { now: NOW }).pass, false);
  } finally { d1.run = saved; }
});

test('D001/D002 over an in-memory data set are notApplicable (neither a silent pass nor a failure)', async () => {
  const mem = await runValidation({ only: ['D001', 'D002'], site: false, now: NOW, data: dataFromObjects({ 'x.json': {} }) });
  for (const id of ['D001', 'D002']) { assert.equal(mem.results.get(id).ran, false); assert.equal(mem.results.get(id).notApplicable, true, id); }
  assert.equal(evaluateRatchet(mem.results, { rules: {} }, { now: NOW }).pass, true);
});

test('site rules switched off on purpose (site:false) are notApplicable; the same rules with a missing deploy tree fail the ratchet', async () => {
  const off = await runValidation({ only: ['F001', 'K001', 'R008', 'M001'], site: false, now: NOW });
  for (const [id, r] of off.results) assert.equal(r.notApplicable, true, id);
  const ctx = buildContext({ distDir: path.join(os.tmpdir(), 'gtbg-no-such-dist'), bundlePath: null });
  const { results: missing } = await runRules(ctx, { only: ['F001', 'K001', 'R008'] });
  for (const [id, r] of missing) { assert.equal(r.ran, false, id); assert.ok(!r.notApplicable, id); }
  assert.equal(evaluateRatchet(missing, { rules: {} }, { now: NOW }).pass, false);
});

test('rule catalogue: registration is strict, and the baseline catalogue makes a vanished rule fail even without baseline entries', async () => {
  for (const [name, rs] of Object.entries(FAMILY_MODULES)) assert.ok(Array.isArray(rs) && rs.length > 0, name);
  const ids = await catalogueIds();
  assert.equal(ids.length, 68);
  assert.deepEqual([...baseline.catalogue].sort(), [...ids].sort(), 'baseline.json lists every registered rule (run validate.mjs --tighten after adding one)');
  const { results: res } = await runValidation({ only: ['S001'], site: false, now: NOW });
  const forged = { ...baseline, catalogue: [...baseline.catalogue, 'S099'], rules: {} };
  const v = evaluateRatchet(res, forged, { now: NOW, registered: ids });
  assert.ok(v.failures.some((f) => f.type === 'unregistered_rule' && f.rule === 'S099'));
  assert.equal(evaluateRatchet(res, { ...baseline, rules: {} }, { now: NOW, registered: ids }).pass, true);
  // --tighten only ever ADDS ids to the catalogue
  const t = tightenBaseline(res, { ...baseline, catalogue: ['S001'], rules: {} }, { registered: ids });
  assert.deepEqual([...t.baseline.catalogue].sort(), [...ids].sort());
  assert.deepEqual(buildBaseline(res, { generated: NOW, dataInfo: {}, catalogue: ids }).catalogue, ids);
});

// ---------------------------------------------------------------------------------------------------------------------------------
// validate.mjs
// ---------------------------------------------------------------------------------------------------------------------------------

test('validate.mjs: an unknown rule id and an empty --rules exit 2 with a message; a known subset still works', () => {
  let r = run([VALIDATE, '--rules', 'R001,NOPE99']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /unknown rule id: NOPE99/);
  r = run([VALIDATE, '--rules']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /needs at least one rule id/);
  r = run([VALIDATE, '--rules', 'S001,S002', '--now', NOW]);
  assert.equal(r.status, 0, r.stdout.slice(-300));
  assert.match(r.stdout, /PASS/);
});

test('validate.mjs is date-driven by design and --now pins it: the same tree passes on the pinned date and fails once the baselines expired', () => {
  assert.equal(run([VALIDATE, '--no-site', '--now', NOW]).status, 0);
  const late = run([VALIDATE, '--no-site', '--now', '2099-01-01']);
  assert.equal(late.status, 1);
  assert.match(late.stdout, /expired/);
});

test('--rebaseline refuses a rule that did not run and --retire-rule refuses a live rule (each would silently delete baseline entries)', () => {
  const { dir, file } = baselineCopy();
  try {
    let r = run([VALIDATE, '--baseline', file, '--rebaseline', 'C005', '--reason', 'x']);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /did not run/);
    r = run([VALIDATE, '--baseline', file, '--retire-rule', 'R001', '--reason', 'x']);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /still registered/);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), baseline, 'the baseline file was not touched');
  } finally { rmrf(dir); }
});

test('--retire-rule drops a rule that was removed from the code: catalogue and entries go, the history logs it', () => {
  const { dir, file } = baselineCopy();
  try {
    const b = JSON.parse(fs.readFileSync(file, 'utf8'));
    b.catalogue.push('S099');
    b.rules.S099 = { sev: 'E', wp: 'x', expires: '2099-01-01', count: 1, rows: 1, keys: ['a'] };
    fs.writeFileSync(file, JSON.stringify(b, null, 2));
    const r = run([VALIDATE, '--baseline', file, '--retire-rule', 'S099', '--reason', 'test', '--now', NOW]);
    assert.equal(r.status, 0, r.stderr);
    const after = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.ok(!after.catalogue.includes('S099') && !('S099' in after.rules));
    assert.deepEqual(after.history.at(-1), { date: NOW, action: 'retire-rule', rule: 'S099', before: 1, reason: 'test' });
  } finally { rmrf(dir); }
});

// ---------------------------------------------------------------------------------------------------------------------------------
// CLIs from a path with a space and a non-ASCII letter
// ---------------------------------------------------------------------------------------------------------------------------------

test('every data:* CLI does its job from a checkout whose path contains a space and a non-ASCII letter (no silent exit 0)', () => {
  const { base, root } = makeRepoCopy('my répo', { full: true });
  const cli = (name) => path.join(root, 'tools', 'data', name);
  try {
    let r = run([cli('validate.mjs'), '--now', NOW, '--no-site']);
    assert.equal(r.status, 0, r.stderr + r.stdout.slice(-300));
    assert.match(r.stdout, /PASS/);
    r = run([cli('manifest.mjs'), 'verify']);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /legacy-roundtrip: 71 files/);
    r = run([cli('emit_legacy.mjs'), '--verify', '--out', path.join(root, 'out')]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /emitted 71 files/);
    assert.match(r.stdout, /legacy-roundtrip: missing 0, extra 0, changed 0/);
    for (const [name, marker] of [['facts.mjs', /facts\.json and candidates up to date/], ['unit_registry.mjs', /registry artifacts up to date/], ['rights_audit.mjs', /rights audit up to date/]]) {
      r = run([cli(name), '--check']);
      assert.equal(r.status, 0, `${name}: ${r.stderr}`);
      assert.match(r.stdout, marker, `${name} printed nothing`);
    }
    // ... and each one still notices staleness from there
    for (const [name, file] of [['facts.mjs', 'data-src/build/facts.json'], ['unit_registry.mjs', 'data-src/build/unit_index.json'], ['rights_audit.mjs', 'data-src/build/legacy-rights-audit.csv']]) {
      const p = path.join(root, ...file.split('/'));
      const before = fs.readFileSync(p);
      fs.appendFileSync(p, ' ');
      r = run([cli(name), '--check']);
      assert.equal(r.status, 1, `${name} exit ${r.status}: ${r.stdout}`);
      assert.match(r.stderr, /STALE/);
      fs.writeFileSync(p, before);
    }
    // deleting the guard files must turn the validator RED (D001/D002 could not run), not green
    for (const f of ['version.json', 'data.lock.json']) fs.rmSync(path.join(root, 'data-src', f));
    r = run([cli('validate.mjs'), '--now', NOW, '--no-site']);
    assert.equal(r.status, 1, r.stdout.slice(-400));
    assert.match(r.stdout, /D001 .*SKIPPED/);
    assert.match(r.stdout, /\[not_run\] D001 could not run/);
    assert.match(r.stdout, /FAIL/);
  } finally { rmrf(base); }
});

test('isMainModule compares real paths: true for the running script, false for another module, and it survives %20 and non-ASCII', () => {
  const { base, root } = makeRepoCopy('a b é');
  try {
    const script = path.join(root, 'tools', 'data', 'lib', 'probe_main.mjs');
    fs.writeFileSync(script, "import { isMainModule } from './util.mjs';\nconsole.log(JSON.stringify({ self: isMainModule(import.meta.url), other: isMainModule(new URL('./load.mjs', import.meta.url).href) }));\n");
    const r = run([script]);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout), { self: true, other: false });
    assert.equal(isMainModule(import.meta.url, path.join(os.tmpdir(), 'nothing.mjs')), false);
    assert.equal(isMainModule(import.meta.url, null), false, 'no argv[1] (node -e, a REPL) is never the main module');
  } finally { rmrf(base); }
});

// ---------------------------------------------------------------------------------------------------------------------------------
// the emitter can not be aimed at legacy/
// ---------------------------------------------------------------------------------------------------------------------------------

const emitterIn = (root) => import(pathToFileURL(path.join(root, 'tools', 'data', 'emit_legacy.mjs')).href + `?t=${Math.random()}`);
const legacyHashes = (root) => hashTree(path.join(root, 'legacy', 'dist', 'data'));

test('emit(): `..` segments, mixed separators, a lower-case drive letter and a different letter case cannot reach legacy/', async () => {
  const { base, root } = makeRepoCopy('repo');
  try {
    const mod = await emitterIn(root);
    const before = legacyHashes(root);
    const tries = [
      [root, 'tmp', '..', 'legacy', 'dist', 'x'].join('/'),
      path.join(root, 'legacy', 'dist', '.', 'z'),
      path.join(root, 'legacy'),
      root.replace(/^[A-Za-z]:/, (d) => d.toLowerCase()) + path.sep + 'Legacy' + path.sep + 'dist' + path.sep + 'w',
    ];
    if (process.platform === 'win32') tries.push(path.join(root, 'legacy') + '\\..\\legacy\\dist\\y');
    for (const out of tries) assert.throws(() => mod.emit({ patches: [], out }), /refusing/, out);
    assert.deepEqual(legacyHashes(root), before);
    // a sibling that merely starts with "legacy" is NOT legacy/
    assert.doesNotThrow(() => mod.emit({ patches: [], out: path.join(root, 'legacy-copy') }));
  } finally { rmrf(base); }
});

test('emit(): a junction or symlink that points into legacy/ (inside the output directory or as the output directory) is refused; legacy/ keeps its bytes', async () => {
  const { base, root } = makeRepoCopy('repo');
  try {
    const mod = await emitterIn(root);
    const before = legacyHashes(root);
    const out = path.join(root, 'tmp', 'out');
    fs.mkdirSync(out, { recursive: true });
    fs.symlinkSync(path.join(root, 'legacy', 'dist', 'data', 'oob'), path.join(out, 'oob'), 'junction');
    assert.throws(() => mod.emit({ patches: [], out }), /refusing to write under legacy/);
    const alias = path.join(base, 'alias');
    fs.symlinkSync(path.join(root, 'legacy'), alias, 'junction');
    assert.throws(() => mod.emit({ patches: [], out: path.join(alias, 'dist', 'q') }), /refusing/);
    assert.deepEqual(legacyHashes(root), before, 'not one legacy byte changed');
  } finally { rmrf(base); }
});

test('emit(): a hard link at the destination is replaced, never written through (the legacy file the link shares keeps its bytes)', async (t) => {
  const { base, root } = makeRepoCopy('repo');
  try {
    const mod = await emitterIn(root);
    const before = legacyHashes(root);
    const out = path.join(root, 'tmp', 'out');
    fs.mkdirSync(out, { recursive: true });
    try { fs.linkSync(path.join(root, 'legacy', 'dist', 'data', 'terrain.json'), path.join(out, 'terrain.json')); } catch { t.skip('hard links are not available here'); return; }
    const terrain = JSON.parse(fs.readFileSync(path.join(out, 'terrain.json'), 'utf8'));
    const i = terrain.key_locations.findIndex((l) => /Gulp/.test(l.name));
    assert.ok(i >= 0);
    const name = terrain.key_locations[i].name;
    mod.emit({ patches: [{ id: 't', edits: [{ file: 'terrain.json', pointer: `/key_locations/${i}/name`, before: name, after: name.replace('Gulp', 'Culp') }] }], out });
    assert.match(fs.readFileSync(path.join(out, 'terrain.json'), 'utf8'), /Culp/);
    assert.deepEqual(legacyHashes(root), before, 'the patched value must not have been written through the hard link');
  } finally { rmrf(base); }
});

test('assertNotLegacy returns the canonical path of a safe target and refuses a path it cannot resolve (a dangling link)', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gtbg-safe-'));
  try {
    const safe = assertNotLegacy(path.join(dir, 'a', 'b'));
    assert.ok(safe.toLowerCase().endsWith(path.join('a', 'b').toLowerCase()));
    const dangling = path.join(dir, 'dangling');
    try { fs.symlinkSync(path.join(dir, 'nowhere'), dangling, 'junction'); } catch { t.skip('links are not available here'); return; }
    assert.throws(() => assertNotLegacy(path.join(dangling, 'x')), /refusing to write: cannot resolve/);
  } finally { rmrf(dir); }
});

// ---------------------------------------------------------------------------------------------------------------------------------
// byte-exact number patches
// ---------------------------------------------------------------------------------------------------------------------------------

test('applyEditsToText matches numbers by value and rewrites only that value (trailing zeros, exponent, negative), with honest errors', () => {
  const text = '{"a": 39.814100, "b": 2E1, "c": -0.50, "d": "x", "e": 7}';
  const out = applyEditsToText(text, [
    { file: 'f', pointer: '/a', before: 39.8141, after: 39.8142 },
    { file: 'f', pointer: '/b', before: 20, after: 21 },
    { file: 'f', pointer: '/c', before: -0.5, after: -0.25 },
  ]);
  assert.equal(out, '{"a": 39.8142, "b": 21, "c": -0.25, "d": "x", "e": 7}');
  assert.throws(() => applyEditsToText(text, [{ file: 'f', pointer: '/a', before: 39.81, after: 1 }]), /current value differs from "before" \(39\.8141\)/);
  assert.throws(() => applyEditsToText(text, [{ file: 'f', pointer: '/e', before: 7, after: { x: 1 } }]), /only scalar values .* shape change/);
  assert.throws(() => applyEditsToText(text, [{ file: 'f', pointer: '/e', before: 7, after: Number.NaN }]), /only scalar values/);
  // a string keeps its own message; the number path never talks about "escaped" encodings
  assert.throws(() => applyEditsToText('{"s":"t\\u00e9st"}', [{ file: 'f', pointer: '/s', before: 'tést', after: 'x' }]), /canonical encoding of "before" \(escaped differently\)/);
  try { applyEditsToText(text, [{ file: 'f', pointer: '/a', before: 39.81, after: 1 }]); assert.fail('must throw'); } catch (e) { assert.ok(!/escaped/.test(e.message), e.message); }
});

test('a coordinate the frozen placement files store with trailing zeros round-trips through the emitter, changing only that value\'s bytes', () => {
  const rel = 'placements_day1_ticks1_50.json';
  const text = fs.readFileSync(path.join(DEFAULT_DATA_DIR, rel), 'utf8');
  const m = /"lat":\s*(-?\d+\.\d*0)\s*[,}]/.exec(text);
  assert.ok(m, 'the frozen tree stores latitudes with trailing zeros');
  const stored = m[1];
  const n = Number(stored);
  assert.notEqual(JSON.stringify(n), stored, 'JSON.stringify cannot reproduce the stored spelling');
  const doc = JSON.parse(text);
  const i = doc.placements.findIndex((r) => r.lat === n);
  assert.ok(i >= 0);
  const after = Number((n + 0.0001).toFixed(4));
  const out = applyEditsToText(text, [{ file: rel, pointer: `/placements/${i}/lat`, before: n, after }]);
  assert.equal(JSON.parse(out).placements[i].lat, after);
  assert.equal(out.length - text.length, JSON.stringify(after).length - stored.length);
  const back = JSON.parse(out);
  back.placements[i].lat = n;
  assert.deepEqual(back, doc, 'nothing else changed');
});

// ---------------------------------------------------------------------------------------------------------------------------------
// G003
// ---------------------------------------------------------------------------------------------------------------------------------

const base0 = buildContext({ bundlePath: null, distDir: null });
const unplaced = (arm) => base0.oob.list.find((r) => (r.kind === 'regiment' || r.kind === 'battery') && !r.alias_for && !base0.rowsByUnit.has(r.id) && armOf(base0, r.id) === arm).id;
const UNIT = { infantry: unplaced('infantry'), artillery: unplaced('artillery'), cavalry: unplaced('cavalry') };

async function g003For(rowsToAdd) {
  const d = clone();
  placementFile(d, 'placements_day3_ticks601_675.json').push(...rowsToAdd);
  const { results: res } = await runValidation({ data: d, only: ['G003'], site: false, now: NOW });
  return res.get('G003').violations;
}
const pair = (unit, t1, t2, meters, extra = {}) => [row(unit, t1, 39.80, -77.24, extra), row(unit, t2, 39.80 + meters / 111195, -77.24, extra)];

test('G003 clock: the file formula puts 5 hours of night between ticks 225 and 226 and between 450 and 451; a same-day pair keeps 5 minutes', () => {
  assert.equal(linearClock(226) - linearClock(225), 320);
  assert.equal(linearClock(451) - linearClock(450), 320);
  assert.equal(linearClock(101) - linearClock(100), 5);
  assert.equal(linearClock(1), 300);
});

test('G003: 5 km in one tick is a violation on a day, but the same 5 km across a day seam (t225->226, t450->451) is a night march', async () => {
  const u = UNIT.infantry;
  assert.ok((await g003For(pair(u, 620, 621, 5000))).some((x) => x.key === `${u}|620-621`), 'same-day pair: 1000 m/min');
  for (const [a, b] of [[225, 226], [450, 451]]) assert.deepEqual((await g003For(pair(u, a, b, 5000))).filter((x) => x.data.unit === u).map((x) => x.key), [], `${a}->${b}`);
  // ... but a seam pair is still measured: 100 km overnight is over any cap
  assert.equal((await g003For(pair(u, 225, 226, 100000))).filter((x) => x.data.unit === u).length, 1);
});

test('G003 caps are the qa-ci DV-07 caps by arm: infantry 150, artillery 250, cavalry 400 m per model-minute; only segments over 300 m; snap:true exempt', async () => {
  assert.deepEqual(DV07_CAP_M_PER_MIN, { infantry: 150, artillery: 250, cavalry: 400 });
  const cases = [['infantry', 700, false], ['infantry', 800, true], ['artillery', 1200, false], ['artillery', 1300, true], ['cavalry', 1900, false], ['cavalry', 2100, true]]; // 5 minutes apart
  for (const [arm, meters, over] of cases) {
    const u = UNIT[arm];
    const v = await g003For(pair(u, 620, 621, meters));
    assert.equal(v.some((x) => x.data.unit === u), over, `${arm} ${meters} m in 5 min`);
    if (over) assert.equal(v.find((x) => x.data.unit === u).kind, arm);
  }
  const u = UNIT.infantry;
  assert.ok(!(await g003For([row(u, 620, 39.80, -77.24), row(u, 621, 39.85, -77.24, { snap: true })])).some((x) => x.data.unit === u), 'snap:true is a declared discontinuity');
  assert.ok(!(await g003For(pair(u, 620, 622, 311))).some((x) => x.data.unit === u), '311 m in 10 min is slow');
  assert.ok(!(await g003For(pair(u, 620, 621, 290))).some((x) => x.data.unit === u), 'under 300 m is never a teleport');
});

test('G003 on the frozen tree = the six DV-07 candidates of qa-ci and chapter 13; the arm comes from the OOB record; every measured seam pair spans the night', async () => {
  const { results: res } = await runValidation({ only: ['G003'], site: false, now: NOW });
  assert.deepEqual(res.get('G003').violations.map((v) => v.key).sort(), ['C-7TN|9-14', 'C-I-3-1|548-549', 'C-I-3-3|550-551', 'U-20ME|264-265', 'U-8NY-CAV|3-4', 'U-I-2-2|52-53']);
  assert.equal(res.get('G003').violations.find((v) => v.key === 'U-8NY-CAV|3-4').kind, 'cavalry');
  const seam = speedsOf(base0).filter((s) => (s.a.tick <= 225 && s.b.tick > 225) || (s.a.tick <= 450 && s.b.tick > 450));
  assert.ok(seam.length > 0 && seam.every((s) => s.minutes >= 300));
});

// ---------------------------------------------------------------------------------------------------------------------------------
// facts
// ---------------------------------------------------------------------------------------------------------------------------------

const factsOf = (d) => JSON.parse(generateFacts(buildContext({ data: d, bundlePath: null, distDir: null })));

test('facts: tick counts come from the chronology files and follow them; ticks_without_rows follows; broken ranges throw', () => {
  const f0 = factsOf(clone());
  assert.deepEqual(f0.ticks.day_ranges, [[1, 225], [226, 450], [451, 675]]);
  assert.deepEqual(f0.ticks.day_start, [1, 226, 451]);
  assert.equal(f0.ticks.total, 675);
  assert.equal(f0.placements.ticks_without_rows, 675 - f0.placements.ticks_with_rows);
  const d = clone();
  d.files.get('chronology_day3.json').json.metadata.day3_tick_range = [451, 700];
  const f = factsOf(d);
  assert.equal(f.ticks.total, 700);
  assert.equal(f.placements.ticks_without_rows, 700 - f.placements.ticks_with_rows);
  const bad = clone();
  bad.files.get('chronology_day2.json').json.metadata.day2_tick_range = [230, 450];
  assert.throws(() => tickModel(buildContext({ data: bad, bundlePath: null, distDir: null })), /not contiguous/);
  const gone = clone();
  gone.files.delete('chronology_day1.json');
  assert.equal(tickModel(buildContext({ data: gone, bundlePath: null, distDir: null })).total, null);
});

test('facts: record partitions, basis strings and the retired-literal list are derived, and every example token resolves', () => {
  const f = JSON.parse(generateFacts()); // the real context, with the bundle
  assert.equal(f.units.regiment_records + f.units.battery_records, f.units.records);
  assert.equal(f.units.basis['units.records'], `oob records: ${f.units.regiment_records} regiment records + ${f.units.battery_records} batteries (includes the alias stub and the misfiled battery)`);
  assert.equal(f.content.monuments_without_source, 503);
  assert.ok(f.units.basis['content.monuments'].includes(`${f.content.monuments_without_source} have no source`));
  const policy = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data-src', 'policy', 'retired_literals.json'), 'utf8'));
  assert.deepEqual(f.retired_literals.map((l) => l.id), policy.literals.map((l) => l.id));
  for (const tok of f.token_examples) assert.notEqual(/^\{\{facts\.(.+)\}\}$/.exec(tok)[1].split('.').reduce((o, k) => o?.[k], f), undefined, tok);
  // one more battery: batteries and records follow, regiments do not
  const d = clone();
  const b0 = d.files.get('oob/union_artillery.json').json.artillery_reserve.brigades[0].batteries;
  b0.push({ ...structuredClone(b0[0]), battery_id: 'U-ART-ZZ' });
  const f2 = factsOf(d);
  const f1 = factsOf(clone());
  assert.equal(f2.units.battery_records, f1.units.battery_records + 1);
  assert.equal(f2.units.regiment_records, f1.units.regiment_records);
  assert.equal(f2.units.records, f1.units.records + 1);
});

// ---------------------------------------------------------------------------------------------------------------------------------
// P001
// ---------------------------------------------------------------------------------------------------------------------------------

test('P001 measures per-record sources: giving 10 regiments a source moves the metric and the ratchet asks for a tighten', async () => {
  assert.equal(hasRecordSource({ source: 'OR27' }), true);
  assert.equal(hasRecordSource({ sources: ['a'] }), true);
  assert.equal(hasRecordSource({ prov: { src: [{ id: 'OR27' }] } }), true);
  for (const empty of [{}, { source: '' }, { source: '   ' }, { sources: [] }, { prov: { src: [] } }, null, 5]) assert.equal(hasRecordSource(empty), false, JSON.stringify(empty));
  const d = clone();
  d.files.get('oob/union_regiments_i_ii_corps.json').json.regiments.slice(0, 10).forEach((r, i) => { if (i < 5) r.source = 'OR Vol. 27 Pt. 1, p. 155'; else r.prov = { src: [{ id: 'OR27-1', loc: 'p. 156' }] }; });
  const ctx = buildContext({ data: d, bundlePath: null, distDir: null });
  assert.equal(provenanceCoverage(ctx).find((c) => c.name === 'regiments').sourced, 10);
  const { results: res } = await runValidation({ data: d, only: ['P001'], site: false, now: NOW });
  const v = evaluateRatchet(res, baselineFor('P001'), { now: NOW });
  assert.equal(v.pass, false);
  assert.ok(v.failures.some((f) => f.type === 'stale' && /class\|regiments/.test(f.message)), 'the improved metric must be tightened');
});

// ---------------------------------------------------------------------------------------------------------------------------------
// rights audit
// ---------------------------------------------------------------------------------------------------------------------------------

test('rights audit: every row of every table and of the CSV carries a closed-set action, and the bundle rows cover the six WP-DATA-04 datasets', () => {
  const a = buildAudit();
  const all = [...a.coordRows, ...a.sourceStrings.map((s) => s.work), ...a.yt, ...a.dataFiles, ...a.bundleSets, ...a.mandatory];
  assert.ok(all.length > 130);
  for (const r of all) assert.ok(ACTIONS.includes(r.action), JSON.stringify(r).slice(0, 120));
  const names = a.bundleSets.map((b) => b.dataset).join(' | ');
  for (const need of ['monuments', 'story markers', 'tour stops', 'tutorial steps', 'timeline markers', 'road GeoJSON']) assert.match(names, new RegExp(need), need);
  assert.ok(a.bundleSets.every((b) => b.records > 0 && /^\d+-\d+$/.test(b.lines)), 'every bundle dataset was found (records and a line range)');
  assert.equal(a.bundleSets.find((b) => /tutorial/.test(b.dataset)).records, 5);
  assert.equal(a.bundleSets.find((b) => /timeline/.test(b.dataset)).records, 8);
  assert.equal(a.bundleSets.find((b) => /road GeoJSON/.test(b.dataset)).records, 8);
  assert.match(renderCsv(a).split('\n')[0], /,action,action_detail,/);
});

test('rights audit: an undecided data file makes the generator throw instead of writing a blank or a "review" row', () => {
  const dir = tmpCopyOfData();
  try {
    fs.writeFileSync(path.join(dir, 'zz_new_dataset.json'), '{"metadata":{},"items":[]}');
    assert.throws(() => buildAudit(buildContext({ dataDir: dir })), /no decided disposition for zz_new_dataset\.json/);
  } finally { rmrf(dir); }
});

test('bundle extraction: tutorial, timeline markers and GeoJSON are found structurally with no warnings, and the classifier judges content, not names', () => {
  const emb = extractEmbeddedDatasets(DEFAULT_BUNDLE);
  assert.deepEqual(emb.warnings, []);
  assert.equal(emb.tutorial.length, 5);
  assert.equal(emb.timeline.length, 8);
  assert.equal(emb.narrated.length, 16);
  assert.deepEqual(emb.geojson.map((g) => [g.kind, g.features]), [['roads', 8], ['streams', 4], ['works', 4], ['farm_polygons', 4]]);
  const f = (name, type) => ({ features: [{ properties: { name }, geometry: { type } }] });
  assert.equal(classifyFeatureCollection(f('Baltimore Pike', 'LineString')), 'roads');
  assert.equal(classifyFeatureCollection(f('Rock Creek', 'LineString')), 'streams');
  assert.equal(classifyFeatureCollection(f('Rose Farm', 'Polygon')), 'farm_polygons');
  assert.equal(classifyFeatureCollection(f('Something', 'Point')), 'other');
});

// ---------------------------------------------------------------------------------------------------------------------------------
// crosswalk confidence per row
// ---------------------------------------------------------------------------------------------------------------------------------

const RANK = { none: 0, low: 1, medium: 2, high: 3 };
const cw = buildCrosswalk(base0);

test('crosswalk: every placement row of every unresolved id carries its own confidence, and the id is only as strong as its weakest row', () => {
  assert.equal(cw.entries.length, 95);
  let rows = 0;
  for (const e of cw.entries) {
    assert.equal(e.row_confidence.length, e.rows, e.alias_id);
    rows += e.row_confidence.length;
    assert.equal(Object.values(e.rows_by_confidence).reduce((a, b) => a + b, 0), e.rows, e.alias_id);
    const weakest = Math.min(...e.row_confidence.map((r) => RANK[r.confidence]));
    assert.ok(RANK[e.confidence] <= Math.max(weakest, e.proposed ? 1 : 0), `${e.alias_id}: id-level ${e.confidence} above its weakest row`);
    assert.ok(RANK[e.confidence] <= RANK[e.combined_notes_confidence], e.alias_id);
    if (e.confidence === 'high') assert.ok(e.row_confidence.every((r) => r.confidence === 'high'), e.alias_id);
    if (e.proposed) assert.notEqual(e.confidence, 'none', `${e.alias_id}: "none" means "no proposal"`);
    for (const r of e.row_confidence) assert.ok(Number.isInteger(r.tick) && r.file && Number.isInteger(r.idx));
  }
  assert.equal(rows, 216);
  assert.equal(Object.values(cw.counts.rows_by_confidence).reduce((a, b) => a + b, 0), 216);
});

test('crosswalk: evidence in a sibling row does not vouch for a row (U-8IL: 10 rows corroborate the cavalry regiment, one does not)', () => {
  const e = cw.entries.find((x) => x.alias_id === 'U-8IL');
  assert.equal(e.proposed, 'U-8IL-CAV');
  assert.equal(e.combined_notes_confidence, 'high', 'the concatenated notes do corroborate it');
  assert.deepEqual(e.rows_by_confidence, { high: 10, medium: 1, low: 0, none: 0 });
  assert.equal(e.confidence, 'medium');
  assert.equal(e.needs_historian, true);
  assert.ok(e.row_confidence.find((r) => r.confidence === 'medium').evidence.length > 0);
});

test('crosswalk: formation rows that do not name the formation do not resolve (C-II-4), and a row that names a different one is flagged', () => {
  const e = cw.entries.find((x) => x.alias_id === 'C-II-4');
  assert.equal(e.proposed, 'C-II-2');
  assert.ok(e.rows_by_confidence.none >= 1);
  assert.notEqual(e.confidence, 'high');
  const flagged = cw.entries.filter((x) => x.evidence?.some((s) => /^WARNING: the row at /.test(String(s))));
  assert.ok(flagged.length >= 1);
  for (const x of flagged) assert.equal(x.needs_historian, true);
});

test('unit_aliases: an id resolves only when EVERY one of its rows is high on its own evidence', () => {
  const table = buildAliasTable(cw);
  for (const a of table.aliases) {
    const e = cw.entries.find((x) => x.alias_id === a.alias);
    assert.equal(a.resolves, e.row_confidence.every((r) => r.confidence === 'high'), a.alias);
    assert.deepEqual(a.rows_by_confidence, e.rows_by_confidence);
  }
  assert.equal(table.aliases.find((a) => a.alias === 'U-8IL').resolves, false, 'a blanket U-8IL -> U-8IL-CAV would re-key a row nothing supports');
  assert.equal(table.aliases.filter((a) => a.rule === 'wrong_side_prefix' && a.resolves).length, 10);
});

// ---------------------------------------------------------------------------------------------------------------------------------
// the suite reads no wall clock
// ---------------------------------------------------------------------------------------------------------------------------------

test('no builder test reads the wall clock or hard-codes a baseline expiry date', () => {
  const dir = path.join(REPO_ROOT, 'tests', 'data');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.test.mjs') && x !== 'quality_fixes.test.mjs')) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    assert.ok(!/\bDate\.now\(|new Date\(|isoDate\(/.test(src), `${f} reads the clock`);
  }
  assert.ok(!/'2027-\d\d-\d\d'/.test(fs.readFileSync(path.join(dir, 'seeded_defects.test.mjs'), 'utf8')), 'hard-coded expiry dates break the day a baseline is renewed');
});

test('legacy/dist/data is byte-identical to the frozen manifest after all of the above', () => {
  assert.deepEqual(diffAgainstManifest(hashTree(DEFAULT_DATA_DIR), readTsv()), { missing: [], extra: [], changed: [] });
});
