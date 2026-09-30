// Re-verification tests for workstream data-quality, written by the independent re-verifier AFTER the fixer's commits a8b958d / fca8a5a.
// Part A (RV-01..RV-06) documents defects that were reproduced against the fixed code and FAIL today: each one is the same class of
// defect as a fixed one (a rule or a gate that stops running still reads green; a derived number that is not derived from what it names).
// Part B (RV-10..RV-19) are NEW adversarial inputs for the fixes (they pass today); they exist so the fixes cannot regress unnoticed.
// Nothing here writes under the real legacy/ or edits a tracked file: every write goes to a throw-away copy under the OS temp dir.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { clone, baseline, NOW, rmrf, makeRepoCopy } from './helpers.mjs';
import { runValidation } from '../../tools/data/lib/validation.mjs';
import { evaluateRatchet } from '../../tools/data/lib/ratchet.mjs';
import { catalogueIds } from '../../tools/data/rules/index.mjs';
import { applyEditsToText } from '../../tools/data/emit_legacy.mjs';
import { buildContext } from '../../tools/data/lib/context.mjs';
import { generateFacts } from '../../tools/data/facts.mjs';
import { buildCrosswalk, buildRegistry } from '../../tools/data/lib/registry.mjs';
import { measureSection2 } from '../../tools/data/lib/measure.mjs';
import { placementCensus } from '../../tools/data/rules/coverage_rules.mjs';
import { buildAliasTable } from '../../tools/data/lib/candidates.mjs';
import { createHash } from 'node:crypto';
import { REPO_ROOT, DEFAULT_DATA_DIR } from '../../tools/data/lib/util.mjs';

const node = process.execPath;
const run = (args, opts = {}) => spawnSync(node, args, { encoding: 'utf8', ...opts });
const VALIDATE = path.join(REPO_ROOT, 'tools', 'data', 'validate.mjs');
const factsOf = (d) => JSON.parse(generateFacts(buildContext({ data: d, bundlePath: null, distDir: null })));

// ---------------------------------------------------------------------------------------------------------------------------------
// Part A: defects (expected to FAIL against the code as fixed)
// ---------------------------------------------------------------------------------------------------------------------------------

test('RV-01 a rule that is flipped to status "deferred" in the code must not silently stop judging the tree (same class as VQ-01/02)', () => {
  const { base, root } = makeRepoCopy('repo', { full: true });
  try {
    const file = path.join(root, 'tools', 'data', 'rules', 'schema_rules.mjs');
    const src = fs.readFileSync(file, 'utf8');
    const i = src.indexOf("id: 'S003'");
    assert.ok(i > 0, 'precondition: S003 is defined in schema_rules.mjs');
    const seg = src.slice(i, i + 400).replace(/status: '(?:implemented|partial)'/, "status: 'deferred', blocked_by: 'because'");
    assert.notEqual(seg, src.slice(i, i + 400), 'precondition: the status was flipped');
    fs.writeFileSync(file, src.slice(0, i) + seg + src.slice(i + 400));
    const r = run([path.join(root, 'tools', 'data', 'validate.mjs'), '--now', NOW, '--no-site']);
    assert.notEqual(r.status, 0, `S003 (no baseline entries, E rule) was disabled by one word and the validator says: ${r.stdout.trim().split('\n').slice(-1)[0]}; the baseline catalogue records ids but not whether a rule was runnable`);
  } finally { rmrf(base); }
});

test('RV-02 validate.mjs --rules <site rule> --no-site judges zero rules and must not print PASS / exit 0 (same class as VQ-09)', () => {
  const r = run([VALIDATE, '--rules', 'F001', '--no-site', '--now', NOW]);
  assert.notEqual(r.status, 0, `exit ${r.status}; last line: ${r.stdout.trim().split('\n').slice(-1)[0]} (the table above it is empty: no rule was judged)`);
});

test('RV-03 a baseline without a "catalogue" must not silently switch the unregistered-rule guard off', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gtbg-rv03-'));
  try {
    const b = JSON.parse(JSON.stringify(baseline));
    delete b.catalogue;
    const file = path.join(dir, 'baseline.json');
    fs.writeFileSync(file, JSON.stringify(b, null, 2));
    const r = run([VALIDATE, '--baseline', file, '--no-site', '--now', NOW]);
    assert.notEqual(r.status, 0, 'with the catalogue deleted a rule can vanish from the code unnoticed, and the validator exits ' + r.status);
  } finally { rmrf(dir); }
});

test('RV-04 facts.placements.ticks_without_rows counts only ticks inside the declared tick model', () => {
  const f0 = factsOf(clone());
  const d = clone();
  d.files.get('placements_day3_ticks601_675.json').json.placements.push({ unit_id: 'U-I-1-1', tick: 9999, lat: 39.8, lng: -77.2, bearing: 0, disposition: 'Line of Battle', strength: 100 });
  const f = factsOf(d);
  assert.equal(f.ticks.total, 675);
  assert.equal(f.placements.ticks_without_rows, f0.placements.ticks_without_rows, 'a row at tick 9999 is outside 1..675: it cannot fill one of the 675 ticks');
});

test('RV-05 the baseline report measures "regiment records with no own placement" from the data (measure.mjs types 467 inside a measurement, the class of VQ-07)', () => {
  const d = clone();
  const regs = d.files.get('oob/union_regiments_i_ii_corps.json').json.regiments;
  regs.push({ ...structuredClone(regs[0]), regiment_id: 'U-999NY', designation: '999th New York Volunteer Infantry' });
  const ctx = buildContext({ data: d, bundlePath: null, distDir: null });
  const crosswalk = buildCrosswalk(ctx);
  const byTarget = new Map();
  for (const e of crosswalk.entries) if (e.proposed && !e.new_record) { if (!byTarget.has(e.proposed)) byTarget.set(e.proposed, []); byTarget.get(e.proposed).push(e); }
  const rows = measureSection2(ctx, { crosswalk, registry: buildRegistry(ctx, byTarget) });
  const recs = rows.find((r) => /^regiment records \(regiment \+ the horse battery/.test(r.fact));
  const noOwn = rows.find((r) => /^regiment records with no own placement/.test(r.fact));
  assert.equal(recs.measured, 468, 'precondition: the extra regiment is counted');
  assert.equal(noOwn.measured, recs.measured - placementCensus(ctx).regimentsOwn, 'the new regiment has no own track, so one more regiment record is unplaced');
});

test('RV-06 U001 must not report "ok" when data-src/build/unit_index.json or unit_registry.json is missing (the index-coverage half silently does not run)', () => {
  const { base, root } = makeRepoCopy('repo', { full: true });
  try {
    const validate = () => run([path.join(root, 'tools', 'data', 'validate.mjs'), '--now', NOW]);
    assert.equal(validate().status, 0, 'precondition: the intact copy passes');
    for (const rel of ['data-src/build/unit_index.json', 'data-src/build/unit_registry.json']) {
      const p = path.join(root, ...rel.split('/'));
      const bytes = fs.readFileSync(p);
      fs.rmSync(p);
      try {
        const r = validate();
        assert.notEqual(r.status, 0, `${rel} is gone and validate.mjs says: ${(r.stdout.split('\n').find((l) => /^U001/.test(l)) || '').trim()}`);
      } finally { fs.writeFileSync(p, bytes); }
    }
  } finally { rmrf(base); }
});

// ---------------------------------------------------------------------------------------------------------------------------------
// Part B: new adversarial inputs (expected to PASS)
// ---------------------------------------------------------------------------------------------------------------------------------

/** Every file under the copy's legacy/ (not only the data tree): path -> size:sha256, so a stray NEW file anywhere under legacy/ is noticed too. */
function legacyHashes(root) {
  const out = {};
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else out[path.relative(root, p)] = createHash('sha256').update(fs.readFileSync(p)).digest('hex'); } };
  walk(path.join(root, 'legacy'));
  return out;
}
const emitterIn = (root) => import(pathToFileURL(path.join(root, 'tools', 'data', 'emit_legacy.mjs')).href + `?rv=${Math.random()}`);

test('RV-10 emit(): \\\\?\\ prefix, chained junctions, trailing dot/space spellings and a nested hard link never change a byte under legacy/', async () => {
  const { base, root } = makeRepoCopy('repo');
  try {
    const mod = await emitterIn(root);
    const before = legacyHashes(root);
    const dist = path.join(root, 'legacy', 'dist');
    const mustRefuse = [path.join(dist, 'x')];
    if (process.platform === 'win32') mustRefuse.push('\\\\?\\' + path.join(dist, 'x'), '\\\\?\\' + path.join(dist, 'x').replace(/^C:/, 'c:'), path.join(root, 'LEGACY', 'DIST', 'x'));
    const j1 = path.join(base, 'outdir', 'j1');
    fs.mkdirSync(path.dirname(j1));
    fs.symlinkSync(dist, j1, 'junction');
    const j2 = path.join(base, 'j2');
    fs.symlinkSync(j1, j2, 'junction');
    mustRefuse.push(path.join(j1, 'x'), path.join(j2, 'x'));
    if (process.platform === 'win32') mustRefuse.push(path.join(j2.toUpperCase(), 'x')); // a case-insensitive file system
    for (const out of mustRefuse) assert.throws(() => mod.emit({ patches: [], out }), /refusing/, out);
    // a spelling the OS treats as a DIFFERENT directory (trailing dot or space) may be written, but never into legacy/
    for (const name of ['legacy.', 'legacy ']) { try { mod.emit({ patches: [], out: root + path.sep + name + path.sep + 'dist' + path.sep + 'x' }); } catch (e) { assert.match(e.message, /refusing|ENOENT|EINVAL/, name); } }
    assert.deepEqual(legacyHashes(root), before);
    // nested hard link at a destination, no patch: the link is replaced, the legacy file keeps its single name and its bytes
    const out = path.join(base, 'out3');
    fs.mkdirSync(path.join(out, 'oob'), { recursive: true });
    const victim = path.join(dist, 'data', 'oob', 'union_artillery.json');
    try { fs.linkSync(victim, path.join(out, 'oob', 'union_artillery.json')); } catch { return; /* no hard links here */ }
    mod.emit({ patches: [], out });
    assert.equal(fs.statSync(victim).nlink, 1, 'the destination name was replaced, not written through');
    assert.deepEqual(legacyHashes(root), before);
  } finally { rmrf(base); }
});

test('RV-11 every CLI still runs from a directory whose name holds %20, #, an apostrophe, &, % or an emoji', () => {
  for (const name of ['a%20b', 'r#1', "it's", 'a&b', '100%', 'café ☕', 'q%3Fmark']) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'gtbg-rv11-'));
    const root = path.join(base, name);
    try {
      fs.mkdirSync(path.join(root, 'tools'), { recursive: true });
      fs.cpSync(path.join(REPO_ROOT, 'tools', 'data'), path.join(root, 'tools', 'data'), { recursive: true });
      fs.mkdirSync(path.join(root, 'legacy', 'dist'), { recursive: true });
      fs.cpSync(DEFAULT_DATA_DIR, path.join(root, 'legacy', 'dist', 'data'), { recursive: true });
      fs.mkdirSync(path.join(root, 'data-src'), { recursive: true });
      fs.copyFileSync(path.join(REPO_ROOT, 'data-src', 'legacy-manifest.tsv'), path.join(root, 'data-src', 'legacy-manifest.tsv'));
      fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(root, 'node_modules'), 'junction');
      const list = run([path.join(root, 'tools', 'data', 'validate.mjs'), '--list']);
      assert.match(list.stdout, /68 rules/, `${name}: validate --list printed ${JSON.stringify(list.stdout.slice(0, 40))}`);
      const emit = run([path.join(root, 'tools', 'data', 'emit_legacy.mjs'), '--verify', '--out', path.join(root, 'out')]);
      assert.match(emit.stdout, /emitted 71 files/, `${name}: emit printed ${JSON.stringify(emit.stdout.slice(0, 40))}`);
      const man = run([path.join(root, 'tools', 'data', 'manifest.mjs'), 'verify']);
      assert.match(man.stdout, /71 files/, name);
    } finally { rmrf(base); }
  }
});

test('RV-12 applyEditsToText: exponents, -0, NaN/Infinity, type mismatches, duplicate keys and escaped pointers behave (fail closed, change only the value bytes)', () => {
  const ok = (text, edit, expected) => assert.equal(applyEditsToText(text, [{ file: 'f', ...edit }]), expected, JSON.stringify(edit));
  const no = (text, edit, rx) => assert.throws(() => applyEditsToText(text, [{ file: 'f', ...edit }]), rx, JSON.stringify(edit));
  ok('{"a":1.5e+3,"b":1}', { pointer: '/a', before: 1500, after: 0 }, '{"a":0,"b":1}');
  ok('{"a":-39.8141000}', { pointer: '/a', before: -39.8141, after: -39.8142 }, '{"a":-39.8142}');
  ok('{"a":-0}', { pointer: '/a', before: 0, after: 1 }, '{"a":1}');
  ok('{"a":1}', { pointer: '/a', before: 1, after: -0 }, '{"a":0}');
  ok('{ "a" : [ 1 , 2.50 , 3 ] }', { pointer: '/a/1', before: 2.5, after: 7 }, '{ "a" : [ 1 , 7 , 3 ] }');
  ok('{"a/b":1,"a":{"b":2}}', { pointer: '/a~1b', before: 1, after: 9 }, '{"a/b":9,"a":{"b":2}}');
  ok('{"a~b":1}', { pointer: '/a~0b', before: 1, after: 9 }, '{"a~b":9}');
  ok('{\r\n\t"a": 1.10,\r\n\t"b": 2\r\n}\r\n', { pointer: '/a', before: 1.1, after: 1.2 }, '{\r\n\t"a": 1.2,\r\n\t"b": 2\r\n}\r\n');
  for (const after of [NaN, Infinity, -Infinity, undefined, { x: 1 }, [1]]) no('{"a":1}', { pointer: '/a', before: 1, after }, /only scalar values/);
  no('{"a":1}', { pointer: '/a', before: '1', after: 2 }, /differs from "before"/);
  no('{"a":"1"}', { pointer: '/a', before: 1, after: 2 }, /differs from "before"/);
  no('{"a":1}', { pointer: '/missing', before: 1, after: 2 }, /differs from "before"/);
  no('{"a":1}', { pointer: '/a/x', before: 1, after: 2 }, /differs from "before"/);
  no('[1]', { pointer: '/5', before: 1, after: 2 }, /differs from "before"/);
  no('{"a":1,"a":2}', { pointer: '/a', before: 2, after: 3 }, /do not denote the number/);
  no('{"a":1,"a":1}', { pointer: '/a', before: 1, after: 3 }, /post-edit document differs/);
  no('{"a":"caf\\u00e9"}', { pointer: '/a', before: 'café', after: 'cafe' }, /canonical encoding/);
});

test('RV-13 G003 recomputed from the raw placement files by an independent implementation gives the validator\'s six keys', async () => {
  const dir = DEFAULT_DATA_DIR;
  const files = fs.readdirSync(dir).filter((f) => /^placements_|^density_/.test(f)).sort();
  const order = [...files.filter((f) => f.startsWith('placements_')), ...files.filter((f) => f.startsWith('density_'))];
  const R = 6371008.8;
  const hav = (a, b, c, d) => { const r = Math.PI / 180; const h = Math.sin(((c - a) * r) / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  const tracks = new Map();
  for (const f of order) for (const r of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).placements ?? []) { if (!tracks.has(r.unit_id)) tracks.set(r.unit_id, new Map()); tracks.get(r.unit_id).set(r.tick, r); }
  const start = [1, 226, 451];
  const abs = (t) => { const d = t <= 225 ? 0 : t <= 450 ? 1 : 2; return d * 1440 + 300 + (t - start[d]) * 5; };
  const batteries = new Set();
  const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { for (const k of ['battery_id', 'battalion_id']) if (o[k]) batteries.add(o[k]); Object.values(o).forEach(walk); } };
  for (const f of fs.readdirSync(path.join(dir, 'oob'))) walk(JSON.parse(fs.readFileSync(path.join(dir, 'oob', f), 'utf8')));
  const arm = (id) => (/CAV/.test(id) ? 'cavalry' : batteries.has(id) || /ART|HAB/.test(id) ? 'artillery' : 'infantry');
  const cap = { infantry: 150, artillery: 250, cavalry: 400 };
  const mine = [];
  for (const [u, m] of tracks) {
    const l = [...m.values()].sort((a, b) => a.tick - b.tick);
    for (let i = 1; i < l.length; i++) {
      const d = hav(l[i - 1].lat, l[i - 1].lng, l[i].lat, l[i].lng);
      if (d > 300 && d / (abs(l[i].tick) - abs(l[i - 1].tick)) > cap[arm(u)] && l[i].snap !== true) mine.push(`${u}|${l[i - 1].tick}-${l[i].tick}`);
    }
  }
  const { results } = await runValidation({ only: ['G003'], site: false, now: NOW });
  assert.deepEqual(results.get('G003').violations.map((v) => v.key).sort(), mine.sort());
  assert.equal(mine.length, 6);
});

const getCw = (d) => buildCrosswalk(buildContext({ data: d, bundlePath: null, distDir: null }));
const rowsOfUnit = (d, id) => { for (const [, f] of d.files) for (const r of f.json?.placements ?? []) if (r.unit_id === id) return f.json.placements; return null; };

test('RV-14 crosswalk: a note-less row added to a fully corroborated id demotes it to medium and out of proposed_auto; a lone weak row keeps its own verdict', () => {
  const e0 = getCw(clone()).entries.find((e) => e.alias_id === 'C-38GA');
  assert.deepEqual([e0.confidence, e0.rows_by_confidence.high, e0.rows], ['high', 3, 3]);
  const d = clone();
  const arr = rowsOfUnit(d, 'C-38GA');
  const tmpl = arr.find((r) => r.unit_id === 'C-38GA');
  arr.push({ unit_id: 'C-38GA', tick: 400, lat: tmpl.lat, lng: tmpl.lng, bearing: tmpl.bearing, disposition: tmpl.disposition, strength: tmpl.strength });
  arr.push({ unit_id: 'C-38GA-X1', tick: 400, lat: tmpl.lat, lng: tmpl.lng, bearing: tmpl.bearing, disposition: tmpl.disposition, strength: tmpl.strength });
  const cw = getCw(d);
  const e = cw.entries.find((x) => x.alias_id === 'C-38GA');
  assert.equal(e.confidence, 'medium');
  assert.deepEqual(e.rows_by_confidence, { high: 3, medium: 1, low: 0, none: 0 });
  assert.equal(e.needs_historian, true);
  const a = buildAliasTable(cw).aliases.find((x) => x.alias === 'C-38GA');
  assert.deepEqual([a.resolves, a.status], [false, 'needs_historian']);
  assert.equal(cw.entries.find((x) => x.alias_id === 'C-38GA-X1').confidence, 'low');
});

test('RV-15 facts: day ranges, day starts and the total follow the chronology metadata (all three move together)', () => {
  const d = clone();
  d.files.get('chronology_day1.json').json.metadata.day1_tick_range = [1, 100];
  d.files.get('chronology_day2.json').json.metadata.day2_tick_range = [101, 300];
  d.files.get('chronology_day3.json').json.metadata.day3_tick_range = [301, 700];
  const f = factsOf(d);
  assert.deepEqual(f.ticks.day_ranges, [[1, 100], [101, 300], [301, 700]]);
  assert.deepEqual(f.ticks.day_start, [1, 101, 301]);
  assert.equal(f.ticks.total, 700);
});

test('RV-18 facts basis strings name the alias stub and the battery filed among the regiments from the data, not from a constant', () => {
  const f0 = factsOf(clone());
  assert.match(f0.units.basis['units.total'], /alias stub U-14BK excluded; the horse battery C-McClanahan-ART filed among the regiments counted as a battery/);
  const d = clone();
  for (const [rel, f] of d.files) {
    if (!rel.startsWith('oob/')) continue;
    for (const r of f.json.regiments ?? []) { delete r.alias_for; if (r.regiment_id === 'C-McClanahan-ART') r.unit_type = 'regiment'; }
  }
  const f = factsOf(d);
  assert.doesNotMatch(f.units.basis['units.total'], /U-14BK|McClanahan/, 'neither the stub nor the misfiled battery exists in this data, so neither may be named');
  assert.match(f.units.basis['units.total'], /no battery filed among the regiments/);
  assert.equal(f.units.regiments, f0.units.regiments + 2, 'the stub and the former battery are ordinary regiments now');
});

// Inputs the validator reads: removing any one of them must turn the run RED, never green.
test('RV-16 a missing bundle, authority table, policy file or guard file turns the validator RED from a full repo copy', () => {
  const { base, root } = makeRepoCopy('repo', { full: true });
  try {
    const validate = () => run([path.join(root, 'tools', 'data', 'validate.mjs'), '--now', NOW]);
    assert.equal(validate().status, 0, 'precondition: the intact copy passes');
    for (const rel of ['legacy/analysis/bundle.pretty.js', 'data-src/authorities/authorities.json', 'data-src/policy/retired_literals.json', 'data-src/policy/source_tiers.json', 'data-src/version.json', 'data-src/data.lock.json']) {
      const p = path.join(root, ...rel.split('/'));
      const bytes = fs.readFileSync(p);
      fs.rmSync(p);
      try { assert.notEqual(validate().status, 0, `${rel} is gone and the validator still passes`); } finally { fs.writeFileSync(p, bytes); }
    }
    assert.equal(validate().status, 0, 'restored: passes again');
  } finally { rmrf(base); }
});

test('RV-17 the baseline in the tree lists every registered rule and every baselined rule is registered (no stray ids either way)', async () => {
  const ids = await catalogueIds();
  assert.deepEqual([...baseline.catalogue].sort(), [...ids].sort());
  for (const id of Object.keys(baseline.rules)) assert.ok(ids.includes(id), id);
  const { results } = await runValidation({ only: ['S001'], site: false, now: NOW });
  assert.equal(evaluateRatchet(results, { ...baseline, catalogue: [...ids, 'Z999'], rules: {} }, { now: NOW, registered: ids }).pass, false);
});
