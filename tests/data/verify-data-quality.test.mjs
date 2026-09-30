// Adversarial-verifier tests for workstream data-quality (added by the verifier, not by the builder).
// Every test here documents a defect that was reproduced against the committed tooling: each one FAILS today and should pass once the
// builder's code is fixed. Nothing here writes under legacy/ or edits a tracked file: all writes go to fresh temp directories.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { clone, baseline, NOW, rmrf, tmpCopyOfData } from './helpers.mjs';
import { runValidation } from '../../tools/data/lib/validation.mjs';
import { evaluateRatchet } from '../../tools/data/lib/ratchet.mjs';
import { PATHS } from '../../tools/data/lib/manifest.mjs';
import { applyEditsToText } from '../../tools/data/emit_legacy.mjs';
import { buildContext } from '../../tools/data/lib/context.mjs';
import { generateFacts } from '../../tools/data/facts.mjs';
import { DEFAULT_DATA_DIR, REPO_ROOT } from '../../tools/data/lib/util.mjs';

const cp = (from, to) => fs.cpSync(from, to, { recursive: true });

/** A throw-away copy of just enough of the repo to run the emitter CLI or the generators from a chosen root directory name. */
function makeRepoCopy(rootName, { full = false } = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'gtbg-vq-'));
  const root = path.join(base, rootName);
  fs.mkdirSync(path.join(root, 'tools'), { recursive: true });
  cp(path.join(REPO_ROOT, 'tools', 'data'), path.join(root, 'tools', 'data'));
  fs.mkdirSync(path.join(root, 'legacy', 'dist'), { recursive: true });
  cp(path.join(REPO_ROOT, 'legacy', 'dist', 'data'), path.join(root, 'legacy', 'dist', 'data'));
  fs.mkdirSync(path.join(root, 'data-src'), { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, 'data-src', 'legacy-manifest.tsv'), path.join(root, 'data-src', 'legacy-manifest.tsv'));
  if (full) {
    cp(path.join(REPO_ROOT, 'data-src'), path.join(root, 'data-src'));
    cp(path.join(REPO_ROOT, 'legacy', 'dist'), path.join(root, 'legacy', 'dist'));
    fs.mkdirSync(path.join(root, 'legacy', 'analysis'), { recursive: true });
    fs.copyFileSync(path.join(REPO_ROOT, 'legacy', 'analysis', 'bundle.pretty.js'), path.join(root, 'legacy', 'analysis', 'bundle.pretty.js'));
    fs.mkdirSync(path.join(root, 'docs', 'plan'), { recursive: true });
    cp(path.join(REPO_ROOT, 'docs', 'plan', 'data'), path.join(root, 'docs', 'plan', 'data'));
    fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(root, 'node_modules'), 'junction');
  }
  return { base, root };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// VQ-01 / VQ-02: the ratchet must fail loudly when a rule that has baseline entries stops running (silent skip => false green)
// ---------------------------------------------------------------------------------------------------------------------------------

test('VQ-01 a rule with baseline entries that returns "input not available" must fail the ratchet, not pass silently', () => {
  for (const id of ['F001', 'K001', 'R008', 'M001']) {
    assert.ok(baseline.rules[id]?.count > 0, `${id} has baseline entries`);
    const results = new Map([[id, { rule: { id, sev: 'E' }, ran: false, violations: [], reason: 'input not available' }]]);
    const verdict = evaluateRatchet(results, { ...baseline, rules: { [id]: baseline.rules[id] } }, { now: NOW });
    assert.equal(verdict.pass, false, `${id}: ${baseline.rules[id].count} known violations vanished because the rule did not run, yet the ratchet says PASS`);
  }
});

test('VQ-02 D001 and D002 must not be silently disabled when data-src/version.json and data.lock.json are missing', async () => {
  const dir = tmpCopyOfData();
  const saved = { version: PATHS.version, lock: PATHS.lock };
  try {
    fs.appendFileSync(path.join(dir, 'terrain.json'), ' '); // a silent one-byte change
    PATHS.version = path.join(dir, 'no-such-version.json');
    PATHS.lock = path.join(dir, 'no-such-lock.json');
    const { results } = await runValidation({ dataDir: dir, only: ['D001', 'D002'], site: false, now: NOW });
    assert.ok([...results.values()].some((r) => !r.ran), 'precondition: the guard rules did not run');
    const verdict = evaluateRatchet(results, { ...baseline, rules: {} }, { now: NOW }); // D001/D002 have no baseline entries
    assert.equal(verdict.pass, false, 'a changed data tree with the guard files deleted passes: D001/D002 are reported SKIPPED and the ratchet ignores skipped rules');
  } finally {
    PATHS.version = saved.version; PATHS.lock = saved.lock;
    rmrf(dir);
  }
});

// ---------------------------------------------------------------------------------------------------------------------------------
// VQ-03: "the emitter refuses to write under legacy/" must hold on a case-insensitive file system (Windows, default macOS)
// ---------------------------------------------------------------------------------------------------------------------------------

test('VQ-03 emit() refuses LEGACY/ (upper case) and a differently cased drive letter on a case-insensitive file system', async (t) => {
  const { base, root } = makeRepoCopy('repo');
  try {
    const upper = path.join(root, 'LEGACY');
    if (!fs.existsSync(upper)) { t.skip('case-sensitive file system: LEGACY is a different directory'); return; }
    const mod = await import(pathToFileURL(path.join(root, 'tools', 'data', 'emit_legacy.mjs')).href + '?vq03');
    const out = path.join(upper, 'dist', 'probe_upper');
    let threw = null;
    try { mod.emit({ patches: [], out }); } catch (e) { threw = e; }
    const leaked = fs.existsSync(path.join(root, 'legacy', 'dist', 'probe_upper'));
    assert.ok(threw && /refusing/.test(threw.message), `emit() wrote ${leaked ? '71 files' : 'files'} under legacy/ through the path ${out}`);
  } finally { rmrf(base); }
});

// ---------------------------------------------------------------------------------------------------------------------------------
// VQ-04 / VQ-05: CLIs that detect "am I the main module" through URL.pathname silently do nothing (exit 0) in a path with a space
// ---------------------------------------------------------------------------------------------------------------------------------

test('VQ-04 emit_legacy.mjs CLI must run (and say so) from a checkout whose path contains a space', () => {
  const { base, root } = makeRepoCopy('my repo');
  try {
    const out = path.join(root, 'out');
    const r = spawnSync(process.execPath, [path.join(root, 'tools', 'data', 'emit_legacy.mjs'), '--verify', '--out', out], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /emitted 71 files/, `the CLI printed nothing and wrote nothing (stdout: ${JSON.stringify(r.stdout)}); npm run data:emit is a false green`);
    assert.ok(fs.existsSync(path.join(out, 'terrain.json')));
  } finally { rmrf(base); }
});

test('VQ-05 facts.mjs --check must report a stale facts.json from a checkout whose path contains a space (data:check false green)', () => {
  const { base, root } = makeRepoCopy('my repo', { full: true });
  try {
    fs.appendFileSync(path.join(root, 'data-src', 'build', 'facts.json'), ' ');
    const r = spawnSync(process.execPath, [path.join(root, 'tools', 'data', 'facts.mjs'), '--check'], { encoding: 'utf8' });
    assert.equal(r.status, 1, `facts.mjs --check exited ${r.status} with stdout ${JSON.stringify(r.stdout)}: it did not check anything`);
    assert.match(r.stderr, /STALE/);
  } finally { rmrf(base); }
});

// ---------------------------------------------------------------------------------------------------------------------------------
// VQ-06: G003 measures day-seam pairs (tick 225->226, 450->451) as 5 minutes although the files' own formula puts a night between them
// ---------------------------------------------------------------------------------------------------------------------------------

test('VQ-06 G003 must not report a speed violation for a keyframe pair that straddles a day seam', async () => {
  const { results } = await runValidation({ only: ['G003'], site: false, now: NOW });
  const seam = results.get('G003').violations.filter((v) => (v.data.from <= 225 && v.data.to > 225) || (v.data.from <= 450 && v.data.to > 450));
  assert.deepEqual(seam.map((v) => v.key), [], 'Day 1 tick 225 is 23:40 and Day 2 tick 226 is 05:00 next morning under the file formula (linearAbsMinutes = 320 min), not 5 min');
});

// ---------------------------------------------------------------------------------------------------------------------------------
// VQ-07: the facts registry must not type counts that it can derive
// ---------------------------------------------------------------------------------------------------------------------------------

test('VQ-07 facts.units.regiment_records and battery_records follow the data (they are hard-coded 467 / 103)', () => {
  const d = clone();
  const f = d.files.get('oob/union_regiments_i_ii_corps.json').json;
  const extra = structuredClone(f.regiments[0]);
  extra.regiment_id = 'U-999NY';
  extra.designation = '999th New York Volunteer Infantry';
  f.regiments.push(extra);
  const facts = JSON.parse(generateFacts(buildContext({ data: d, bundlePath: null, distDir: null })));
  assert.equal(facts.units.records, 571, 'records is derived and moves with the data');
  assert.equal(facts.units.regiment_records + facts.units.battery_records, facts.units.records, 'regiment_records + battery_records must equal records');
});

// ---------------------------------------------------------------------------------------------------------------------------------
// VQ-08: the byte-exact emitter must be able to patch numbers as they are stored (187 of 1,860 "lat" values and the monuments.json
// coordinates carry trailing zeros, which JSON.stringify never reproduces)
// ---------------------------------------------------------------------------------------------------------------------------------

test('VQ-08 applyEditsToText can patch a coordinate stored with trailing zeros (monuments.json: 39.814100)', () => {
  const text = fs.readFileSync(path.join(DEFAULT_DATA_DIR, 'monuments.json'), 'utf8');
  const i = JSON.parse(text).monuments.findIndex((m) => m.id === 'in-state');
  assert.ok(text.includes('39.814100'), 'the frozen file stores the latitude as 39.814100');
  const out = applyEditsToText(text, [{ file: 'monuments.json', pointer: `/monuments/${i}/lat`, before: 39.8141, after: 39.8142 }]);
  assert.equal(JSON.parse(out).monuments[i].lat, 39.8142);
  assert.equal(out.length, text.length - 2, 'only the bytes of that number change (39.814100 -> 39.8142 is two characters shorter)');
});

// ---------------------------------------------------------------------------------------------------------------------------------
// VQ-09: a mistyped rule id must not produce a green run
// ---------------------------------------------------------------------------------------------------------------------------------

test('VQ-09 validate.mjs --rules <unknown id> must exit non-zero instead of judging zero rules and printing PASS', () => {
  const r = spawnSync(process.execPath, [path.join(REPO_ROOT, 'tools', 'data', 'validate.mjs'), '--rules', 'NOPE99'], { encoding: 'utf8' });
  assert.notEqual(r.status, 0, `exit ${r.status}; stdout tail: ${r.stdout.trim().split('\n').slice(-1)[0]}`);
});

// ---------------------------------------------------------------------------------------------------------------------------------
// VQ-10 / VQ-11: rights audit conforms to WP-DATA-04 (action in a closed set; every named bundle dataset has a row)
// ---------------------------------------------------------------------------------------------------------------------------------

function parseCsv(text) {
  const rows = []; let row = []; let cur = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

test('VQ-10 legacy-rights-audit.csv: every action is one of replace | credit | keep facts-only | remove (chapter 13 WP-DATA-04)', () => {
  const rows = parseCsv(fs.readFileSync(path.join(REPO_ROOT, 'data-src', 'build', 'legacy-rights-audit.csv'), 'utf8'));
  const head = rows[0]; const ai = head.indexOf('action');
  const allowed = new Set(['replace', 'credit', 'keep facts-only', 'remove']);
  const bad = rows.slice(1).filter((r) => !allowed.has(r[ai]));
  assert.equal(bad.length, 0, `${bad.length} of ${rows.length - 1} rows carry free text or a cross-reference instead of a decision, e.g. ${JSON.stringify(bad.slice(0, 3).map((r) => r[ai].slice(0, 50)))}`);
});

test('VQ-11 legacy-rights-audit.csv has a bundle_dataset row for each dataset WP-DATA-04 names (monuments, story markers, tour stops, tutorial, timeline markers, roads)', () => {
  const rows = parseCsv(fs.readFileSync(path.join(REPO_ROOT, 'data-src', 'build', 'legacy-rights-audit.csv'), 'utf8'));
  const n = rows.slice(1).filter((r) => r[0] === 'bundle_dataset').length;
  assert.ok(n >= 6, `only ${n} bundle_dataset rows`);
});

// ---------------------------------------------------------------------------------------------------------------------------------
// Coverage-gap guards. These PASS on the current code; they exist because the verifier's mutation runs showed the builder's suite
// does not notice when the behaviour below is broken (mutants M12, M16, M20 survived all 123 tests).
// ---------------------------------------------------------------------------------------------------------------------------------

import { tightenBaseline } from '../../tools/data/lib/ratchet.mjs';
import { loadDataDir } from '../../tools/data/lib/load.mjs';

test('VQ-12 (guard) --tighten never absorbs a NEW violation into the baseline', async () => {
  const d = clone();
  d.files.get('placements_day3_ticks601_675.json').json.placements.push({ unit_id: 'U-NOSUCH-9', tick: 630, lat: 39.815, lng: -77.235, bearing: 90, disposition: 'Line of Battle', strength: 300 });
  const { results } = await runValidation({ data: d, only: ['R001'], site: false, now: NOW });
  const before = { ...baseline, rules: { R001: baseline.rules.R001 } };
  const { baseline: after } = tightenBaseline(results, before);
  assert.ok(!after.rules.R001.keys.includes('placement|U-NOSUCH-9'), 'tighten blessed a violation that was not in the baseline');
  assert.equal(after.rules.R001.count, before.rules.R001.count);
  const v = evaluateRatchet(results, after, { now: NOW });
  assert.equal(v.pass, false, 'the new violation must still fail after --tighten');
});

test('VQ-13 (guard) a truncated JSON file on disk is reported by S001 through the real loader (the seeded S001 test injects .error by hand)', async () => {
  const dir = tmpCopyOfData();
  try {
    const f = path.join(dir, 'placements_day2_ticks226_300.json');
    const s = fs.readFileSync(f, 'utf8');
    fs.writeFileSync(f, s.slice(0, Math.floor(s.length / 2)));
    assert.ok(loadDataDir(dir).files.get('placements_day2_ticks226_300.json').error, 'loader records the parse error');
    const { results } = await runValidation({ dataDir: dir, only: ['S001'], site: false, now: NOW });
    const v = results.get('S001').violations;
    assert.ok(v.some((x) => /placements_day2_ticks226_300/.test(x.message)), 'S001 must name the broken file');
  } finally { rmrf(dir); }
});

test('VQ-14 (guard) two edits to the same value are refused as overlapping', () => {
  const text = '{"a":"one","b":"two"}';
  assert.throws(() => applyEditsToText(text, [{ file: 'x', pointer: '/a', before: 'one', after: '1' }, { file: 'x', pointer: '/a', before: 'one', after: '2' }]), /overlapping/);
});
