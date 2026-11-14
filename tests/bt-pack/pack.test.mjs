// Self-test of tools/bt/pack_theatre.mjs.   node --test tests/bt-pack/pack.test.mjs
// Part 1 packs the real tree (docs/battle-theatre). Part 2 packs small made-up trees (tests/bt-pack/fixture.mjs) that hold every kind of load the trace must follow, so the
// rules are proved before the real tree uses them: added modules loaded by computed path, a static section beside the shell, an import map, style-sheet addresses, withheld
// and reduced working files.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';
import zlib from 'node:zlib';
import { pack, trace, audit, auditReview, makeZip, URL_KEYS, BT, stampHTML, AUDIT_RE, AUDIT_CS_RE, AUDIT_ALLOW, AUDIT_PRODUCTION, WITHHELD, PROJECT, EXCLUDE, scrubMakerMembers, jsonMembers, isMakerMember, sizeByFolder } from '../../tools/bt/pack_theatre.mjs';
import { makeFixture, FIXTURE_CFG } from './fixture.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'btpack-')); let A, B;
test.before(() => { A = pack({ out: path.join(tmp, 'a/dist'), zipDir: path.join(tmp, 'a') }); B = pack({ out: path.join(tmp, 'b/dist'), zipDir: path.join(tmp, 'b') }); });
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
const execHash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const distFiles = d => fs.readdirSync(d, { recursive: true }).map(f => String(f).split(path.sep).join('/')).filter(f => fs.statSync(path.join(d, f)).isFile()).sort();

// =============================================================== part 1: the real tree
test('URL_KEYS match app/src/config.mjs', () => {
  const cfg = fs.readFileSync(path.join(BT, 'app/src/config.mjs'), 'utf8'), base = path.join(BT, 'app/src');
  for (const m of cfg.matchAll(/^\s*([a-z]+):\s*new URL\('([^']+)', here\)/gm)) { if (!(m[1] in URL_KEYS)) continue; assert.equal(path.resolve(base, m[2]), path.join(BT, URL_KEYS[m[1]]).replace(/\/$/, ''), m[1]); }
  for (const k of Object.keys(URL_KEYS)) assert.match(cfg, new RegExp(`\\b${k}:\\s*new URL`));
  const t = trace(); for (const k of Object.keys(URL_KEYS)) assert.equal(t.urlKeys[k], URL_KEYS[k], 'the trace reads the same folder for ' + k);
  for (const m of cfg.matchAll(/^\s*([a-z]+):\s*new URL\('([^']+)', here\)/gm)) assert.ok(m[1] in t.urlKeys, 'a key of config.mjs the trace does not know: ' + m[1]);
});
test('deterministic: two packs give identical dist bytes, zip and hash', () => {
  assert.equal(A.version, B.version); assert.equal(A.zipSha256, B.zipSha256);
  assert.equal(fs.readFileSync(A.zip + '.sha256', 'utf8'), `${A.zipSha256}  ${path.basename(A.zip)}\n`);
  assert.equal(path.basename(A.zip), `gettysburg-BT-staging-${A.version}${A.audit.length ? '-AUDIT-HITS-' + A.audit.length : ''}.zip`, 'a clean build has the plain name; one with audit hits says so in its name');
  for (const f of distFiles(A.out)) assert.ok(fs.readFileSync(path.join(A.out, f)).equals(fs.readFileSync(path.join(B.out, f))), f);
});
test('trace has no missing file and contains the shell and its siblings', () => {
  const t = trace(); assert.deepEqual(t.problems, []);
  for (const f of ['app/index.html', 'app/styles.css', 'app/src/main.mjs', 'app/src/crowd/node-crypto-shim.mjs', 'render/prototype/data/height.bin', 'render/prototype/src/webgl2.mjs', 'render/prototype/src/webgpu.mjs', 'history/units.json', 'GOVERNANCE/timeline_windows.jsonl', 'sim/rng.mjs']) assert.ok(t.files.includes(f), f);
  for (const f of t.files) assert.ok(t.why[f] && t.why[f].length, 'every shipped file has a recorded reason: ' + f);
});
test('trimmed: no tests, screenshots, notes or tools; the dynamic data of the wired features is in', () => {
  const names = fs.readdirSync(path.join(A.out, 'app'), { recursive: true }).map(String);
  for (const n of names) assert.doesNotMatch(n, /(^|\/)(tests|tools|docs)(\/|$)|\.(md)$/i, n);
  const all = new Set(distFiles(A.out));
  for (const f of ['app/data/audio3d/sources.json', 'app/data/audio3d/commands.json', 'app/data/audio3d/calls.json', 'app/data/audio3d/woods-mask.json', 'app/data/fx3d/params.json', 'app/data/fx3d/weapons.json', 'app/data/fx3d/fires.json', 'app/data/figures3d/skeleton.json', 'app/data/figures3d/flag-mean-colours.json', 'app/data/conflict-defaults.json', 'app/src/scenario-defaults.mjs']) assert.ok(all.has(f), f);
  assert.ok(!all.has('GOVERNANCE/decisions/conflict_defaults.json'), 'the working decisions file is not shipped, the cleaned copy is');
  assert.ok(A.bytes < 40e6, 'dist ' + A.bytes);
});
test('dynamic loads are traced: new URL(.., import.meta.url), URLS template prefixes, fetch literals, the import map', () => {
  const t = trace(); assert.ok(t.files.some(f => f.startsWith('app/data/audio3d/')), 'audio3d folder via new URL(import.meta.url)');
  for (const f of ['app/data/fx3d/params.json', 'app/data/figures3d/skeleton.json', 'app/data/figures3d/flag-mean-colours.json']) assert.ok(t.files.includes(f), f);
  assert.ok(t.why['app/src/crowd/node-crypto-shim.mjs'].some(w => /import map/.test(w)), 'the shim is followed through the import map, not only because its folder ships');
  assert.ok(t.modules.loaded.includes('app/src/crowd/node-crypto-shim.mjs') && t.modules.loaded.includes('render/prototype/src/webgpu.mjs'));
});
test('the whole module folder ships, and every module in it is scanned', () => {
  const t = trace(), src = fs.readdirSync(path.join(BT, 'app/src'), { recursive: true }).map(f => 'app/src/' + String(f).split(path.sep).join('/')).filter(f => /\.mjs$/.test(f) && !/\.(test|spec)\.mjs$/.test(f));
  for (const f of src) assert.ok(t.files.includes(f), f);
  const known = new Set([...t.modules.loaded, ...t.modules.shippedOnly]); for (const f of src) assert.ok(known.has(f), 'not scanned: ' + f);
});
test('the added layers (app/src/ext) are followed through the computed import of the shell', () => {
  const t = trace(), th = fs.readFileSync(path.join(BT, 'app/src/theatre.mjs'), 'utf8');
  if (!/import\(\s*'\.\/ext\/'\s*\+/.test(th)) return;                                   // a shell without the loader has nothing to follow
  const c = t.computedImports.find(x => x.file === 'app/src/theatre.mjs' && (x.status === 'folder' || x.status === 'folder-missing')); assert.ok(c, 'the computed import of theatre.mjs is recognised');
  const dir = path.join(BT, 'app/src/ext'); if (!fs.existsSync(dir)) return;
  const mods = fs.readdirSync(dir, { recursive: true }).map(f => 'app/src/ext/' + String(f).split(path.sep).join('/')).filter(f => /\.mjs$/.test(f) && !/\.(test|spec)\.mjs$/.test(f));
  for (const f of mods) assert.ok(t.files.includes(f), 'shipped: ' + f);
  if (fs.existsSync(path.join(dir, 'index.mjs')) && c.index) for (const f of c.modules) assert.ok(t.modules.loaded.includes(f), 'listed by the index and scanned as loaded: ' + f);
});
// A load whose address comes from DATA, not from code: the recorded sounds. app/data/audio3d/sources.json lists 40 recordings as shippable with a `file` path (audio/pilot/...), and
// src/audio3d/loader.mjs `loadRecordings` would fetch them with new URL(s.file, baseUrl). The shell does not call it today (it plays modern synthesis only), so the files are not in the build.
// The day a module calls it, the trace cannot know the paths: this test then fails and says what the packer needs.
test('tripwire: recorded sounds. Nothing in the shell loads them today; when a module calls loadRecordings, the files of the shippable entries must be in the build', () => {
  const callers = A.traced.filter(f => /^app\/src\/.*\.mjs$/.test(f) && !/^app\/src\/audio3d\/(loader|index)\.mjs$/.test(f) && /\bloadRecordings\s*\(/.test(fs.readFileSync(path.join(BT, f), 'utf8')));
  if (!callers.length) return;
  const wanted = (JSON.parse(fs.readFileSync(path.join(BT, 'app/data/audio3d/sources.json'), 'utf8')).sources || []).filter(s => s.shippable && s.file).map(s => s.file), have = new Set(distFiles(A.out));
  assert.deepEqual(wanted.filter(f => !have.has(f)), [], `${callers.join(', ')} loads recordings, but the build lacks their files: add the folder to INCLUDE in tools/bt/pack_theatre.mjs (the zip grows by their size) and say so in NETLIFY-STAGING.md`);
});
// Files of a shipped folder that no page loads are left out (EXCLUDE: audio3d and fx3d hold files that only tools read; app/data/anim3d is not named by any module at all, so nothing ships it).
// The evidence is twofold: the real run (tools/bt/verify_staging.mjs) never asked for them, and this test: no shipped module names one outside a comment. The day a module does,
// this fails and says which: take the entry out of EXCLUDE (the file then ships again) and run the real run.
const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.replace(/(^|[^:'"`\w])\/\/.*$/, '$1')).join('\n');
test('left out: no page loads the files of EXCLUDE; no shipped module names one outside a comment; MANIFEST.json lists them; nothing of anim3d data ships', () => {
  const names = EXCLUDE.map(e => (typeof e === 'string' ? e : e.path)), all = new Set(distFiles(A.out)), m = JSON.parse(fs.readFileSync(path.join(A.out, 'MANIFEST.json'), 'utf8'));
  for (const f of all) assert.ok(!names.some(n => f === n || f.startsWith(n + '/')), 'a left-out file is in the build: ' + f);
  assert.ok(![...all].some(f => f.startsWith('app/data/anim3d/')), 'no animation catalogue file ships: no module names one');
  const codeFiles = [...all].filter(f => /\.(mjs|js|html)$/.test(f)), code = codeFiles.map(f => [f, stripComments(fs.readFileSync(path.join(A.out, f), 'utf8'))]);
  const candidates = [...names.flatMap(n => { const abs = path.join(BT, n); return fs.existsSync(abs) && fs.statSync(abs).isDirectory() ? fs.readdirSync(abs).map(x => path.join(n, x)) : [n]; }), ...fs.readdirSync(path.join(BT, 'app/data/anim3d')).map(x => 'app/data/anim3d/' + x)];
  // a loader passes the whole name as a string ('params.json', URLS.data + 'fx3d/GAPS.json'); prose that mentions a file of the same name (figures3d/TIERS.json in a tier table) is not a load
  for (const n of candidates) { const b = path.basename(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), re = new RegExp('([\'"`])(?:[\\w./-]*/)?' + b + '\\1'), hit = code.filter(([, s]) => re.test(s)).map(([f]) => f); assert.deepEqual(hit, [], `${n} is left out of the build but ${hit.join(', ')} names it as a string outside a comment: take it out of EXCLUDE and run the real run`); }
  assert.deepEqual(m.leftOut.map(l => l.path).sort(), names.filter(n => fs.existsSync(path.join(BT, n))).sort(), 'MANIFEST.json lists every left-out entry that exists');
});
test('computed imports: every one in the tree is of a form the trace follows (or is on the reviewed list)', () => {
  const bad = trace().computedImports.filter(c => c.status === 'unresolved');
  assert.deepEqual(bad, [], 'a computed import the trace cannot follow: ship its target another way and add it to KNOWN_COMPUTED, or make the path literal');
});
// file-like literals of loaded modules that are not in the build. Each one here was looked at: it is text shown to the reader (a citation), not a file the page requests.
const REVIEWED_LITERALS = [
  { literal: 'GOVERNANCE/register/EG-0001.md', file: /^app\/src\/history\/(real|stub)\.mjs$/, why: 'citation text of a source entry (the register entries are withheld, see WITHHELD)' },
  { literal: 'GOVERNANCE/register/EG-0005.md', file: /^app\/src\/history\/real\.mjs$/, why: 'citation text of a source entry' },
];
test('file-like literals of loaded modules are in the build, withheld, or reviewed', () => {
  const open = trace().unshippedLiterals.filter(l => !l.comment && !REVIEWED_LITERALS.some(r => r.literal === l.literal && r.file.test(l.file)));
  assert.deepEqual(open, [], 'a loaded module names a file that is not in the build: if the page requests it the packer must ship it (INCLUDE or a rule); if it is only text, add it to REVIEWED_LITERALS with the reason');
});
test('withheld and reduced working files: the register entries never ship, the register index ships as ids only', () => {
  const t = trace(), all = distFiles(A.out);
  assert.ok(!all.some(f => WITHHELD.some(w => w.match.test(f))), 'no withheld file in the dist');
  const w = t.withheld.find(x => x.id === 'register-entries'); assert.ok(w && w.files > 0 && w.referencedBy.some(r => /app\/src\/data\.mjs/.test(r)), 'the register link of data.mjs is traced and withheld');
  const m = JSON.parse(fs.readFileSync(path.join(A.out, 'MANIFEST.json'), 'utf8')); assert.equal(m.withheld[0].pattern, 'GOVERNANCE/register/**/*.md'); assert.equal(m.withheld[0].files, w.files);
  const src = JSON.parse(fs.readFileSync(path.join(BT, PROJECT[0].path), 'utf8')), out = JSON.parse(fs.readFileSync(path.join(A.out, PROJECT[0].path), 'utf8'));
  assert.equal(out.length, src.length); assert.deepEqual(out.map(e => e.id), src.map(e => e.id)); for (const e of out) assert.deepEqual(Object.keys(e), ['id']);
  assert.deepEqual(m.reduced.map(r => r.path), ['GOVERNANCE/register_index.json']);
  // what the shell does with the file gives the same answer on the reduced copy
  assert.deepEqual([...new Set(out.map(r => r.id))].sort(), [...new Set(src.map(r => r.id))].sort());
});
test('copy audit: production notes are caught, plain citations are not', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'btaud-'));
  for (const [t, hit] of [['generated by tools/bt/x.py from y; do not edit by hand', true], ['Written by tools/build-x.mjs', true], ['do not edit by hand', true], ['the checker tools/bt/check_arrivals.py compares', false], ['Basis declared with each figure.', false],
    ['Generated by app/tools/build-audio3d-data.mjs.', true], ['built by app/tools/build-guns.mjs', true], ['"generated": "2026-11-04",', true], ['"generated_by": "x"', true], ['auto-generated from catalog.mjs', true],
    ['"built_by": "tools/build-daypositions.mjs",', true], ['"built_by":"docs/battle-theatre/app/tools/build-gazetteer.mjs","sources":{}', true], ['"generator": "tools/bt/build_structures.py",', true], ['"builder": "tools/bt/build_arrivals.py"', true], ['"made_with": "scripts/x.py"', true],
    ['"built_by": "the Park Service"', false], ['"builder": "Harper"', false], ['A "builder" appends keys of one time at the running clock t.', false], ['"generator": "battle-theatre figures3d (procedural)"', false], ['"built_by": "Bachelder 1876"', false],
    ['every face is generated from the seed', false], ['generated in code: no image asset is read', false], ['impostor bakes are code-generated', false], ['no soldier may be generated', false]]) {
    fs.writeFileSync(path.join(d, 'a.json'), t); assert.equal(audit(d).length > 0, hit, t);
  }
  fs.rmSync(d, { recursive: true, force: true });
});
test('copy audit: the makers of the site are caught, the figures of the simulation and the people of 1863 are not', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'btaud-'));
  const HIT = ["an earlier agent's read of the 146th NY history", 'An earlier agent read the history', 'agent read of 146th NY history', 'Agent recommendation: yes', '(agent proposes none)', 'Agent trace of Warren 4-ft contours', 'checked by a review agent', 'written by an agent',
    'a large language model', 'the language model said', 'an LLM', 'reviewed by automated subagents', 'sub-agents', 'made with AI tools', 'AI-generated', 'built by Claude', 'Anthropic', 'ChatGPT', 'refuse automated reads (403)', 'owner to confirm whether', '[OWNER TO CONFIRM]', 'artificial intelligence'];
  const MISS = ['if (!(e.agent < (w ? w.count : 0)))', 'push({ agent: e.agent, t: ev.t })', "so any agent's state at any time is computable", "(agent = the figure's index inside the unit)", 'Confederate agent Huse about 100,000', '160k agents)', 'agents of the Sanitary Commission',
    'gain automated per 100 ms', 'J’ai vu', 'the AIM point', 'MAIN', 'Hai', 'said', 'the plan is the reference', 'Round 3: the 38 crowd states', 'a model of the gun', 'plausible-procedural'];
  for (const t of HIT) { fs.writeFileSync(path.join(d, 'a.txt'), 'x ' + t + ' y'); assert.equal(audit(d).length, 1, 'should be a hit: ' + t); }
  for (const t of MISS) { fs.writeFileSync(path.join(d, 'a.txt'), 'x ' + t + ' y'); assert.equal(audit(d).length, 0, 'should not be a hit: ' + t); }
  assert.match('x AI y', AUDIT_CS_RE); assert.doesNotMatch('x ai y', AUDIT_CS_RE); assert.doesNotMatch('base64+AI/abc', AUDIT_CS_RE); assert.match('language model', AUDIT_RE);
  fs.writeFileSync(path.join(d, 'a.txt'), 'plain'); fs.writeFileSync(path.join(d, 'p.png'), Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from('tEXtSoftware\0made with ChatGPT image tool')]));
  const h = audit(d); assert.equal(h.length, 1); assert.equal(h[0].where, 'binary'); fs.rmSync(path.join(d, 'p.png'));
  fs.writeFileSync(path.join(d, 'claude-notes.txt'), 'plain'); assert.equal(audit(d).filter(x => x.where === 'name').length, 1);
  fs.rmSync(d, { recursive: true, force: true });
});
// The wordings of the real shipped files that the first rules missed (2026-11-14: the 9 lines found in the dist of build 9a2eb789) are planted here, with the sentences next to them that must pass.
test('copy audit: a statement that names the program that made a file is caught in every wording the real files use', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'btaud-')); fs.writeFileSync(path.join(d, 'real.mjs'), '// a program of the product\n');
  const HIT = [
    ['Written to data/figures3d/evidence.json by tools/figures3d-build.mjs. Rules (the project Law)', 'written to X by tools/Y'],
    ['Derived from docs/basemap1863/features/landcover/woods_1863.geojson by app/tools/build-audio3d-woods.mjs. Rings are', 'derived from X by app/tools/Y'],
    ['geometry comes only from data/structures3d.json (built from the basemap1863 layers by tools/build-structures3d.mjs); dimensions', 'built from X by tools/Y in brackets'],
    ['both the rows and the totals are kept as printed; recomputed by build_kit_data.py', 'recomputed by a script of the repository'],
    ['Built from the unit files under data2/ by pipeline2/build_index.py. A unit entry says which segments', 'the roster index sentence: a script outside tools/'],
    ['Named places with coordinates from repository files only (tools/build-gazetteer.mjs). resolution: exact', 'a builder named by itself in brackets'],
    ['// the table written to data/anim3d/gait-sources.json (build-anim3d.mjs)', 'written to X (builder)'],
    ["schema: V, generated_by: 'docs/x/skeleton.mjs (node docs/x/tools/figures3d-build.mjs writes this file)',", 'a maker key in code, and "node X writes this file"'],
    ["const o = { built_by: 'tools/build-x.mjs' };", 'an unquoted maker key in code'],
    ['(node tools/bt/build_x.mjs writes this file)', 'node X writes this file'],
    ['made with three.js', 'made with a script file'],
    ['regenerated by build_index.py', 'regenerated'],
    ['Extracted using pipeline/ocr.py from the page images', 'extracted using a script'],
  ];
  for (const [t, what] of HIT) { fs.writeFileSync(path.join(d, 'a.txt'), 'x ' + t + ' y'); const h = audit(d); assert.equal(h.length, 1, `should be a hit (${what}): ${t}`); }
  const MISS = [
    ['the checker tools/bt/check_arrivals.py compares', 'a checker cited by its path'],
    ['checked numerically by tests/figures3d.test.mjs through interpen.mjs', 'a test cited as the method of a check'],
    ['shared by tests/anim3d.test.mjs and tools/measure-anim3d.mjs', 'shared by (not a verb of making)'],
    ['Measurements on baked clips, shared by tests/anim3d.test.mjs', 'baked clips'],
    ['Command WORDS rendered by synth-voice.mjs. Every word is printed', 'rendered at run time by a module (the word is not a verb of the rules)'],
    ['read from the OCR of the two manuals by tools/bt/drill_*.py and checked by drill_check.py', 'the method of a reading'],
    ['a port of tools/bt/check_structures.py state_at, tested against it in tests/history.test.mjs', 'a port and its test'],
    ['Built from the unit files. Used by main.mjs to draw them', 'a sentence ends before the next one names a file'],
    ['Written by J. Smith in 1863. The map is drawn by the Park Service', 'a person and a date'],
    ['the times are made per scenario by real.mjs', 'a program that ships in this build is the product, not its maker'],
    ['the manifest is made by real.mjs (a port of the same rule)', 'the same, other wording'],
  ];
  for (const [t, what] of MISS) { fs.writeFileSync(path.join(d, 'a.txt'), 'x ' + t + ' y'); const h = audit(d); assert.equal(h.length, 0, `should not be a hit (${what}): ${t} -> ${JSON.stringify(h)}`); }
  // the same sentence about a program that does NOT ship is a hit, and a maker key is never excused by a shipped program
  fs.writeFileSync(path.join(d, 'a.txt'), 'the times are made per scenario by other.mjs'); assert.equal(audit(d).length, 1);
  fs.writeFileSync(path.join(d, 'a.json'), '{"built_by": "real.mjs"}'); fs.writeFileSync(path.join(d, 'a.txt'), 'plain'); assert.equal(audit(d).length, 1, 'a maker key names who made the data, shipped or not');
  fs.writeFileSync(path.join(d, 'a.json'), '{}'); fs.writeFileSync(path.join(d, 'a.txt'), 'made per scenario by tools/real.mjs'); assert.equal(audit(d).length, 1, 'a path under tools/ is never the product');
  assert.ok(AUDIT_PRODUCTION.length >= 5 && AUDIT_PRODUCTION.every(s => typeof s === 'string'), 'the rules are plain patterns inside AUDIT_RE (tools/bt/kit_evidence_lib.py reads that one)');
  for (const s of AUDIT_PRODUCTION) assert.ok(AUDIT_RE.source.includes(s), 'every production rule is part of AUDIT_RE');
  fs.rmSync(d, { recursive: true, force: true });
});
test('copy audit: a production statement that wraps onto the next line of a comment is caught, and only when it crosses the line end', () => {
  const body = lines => lines.join('\n') + '\n', d = fs.mkdtempSync(path.join(os.tmpdir(), 'btaud-')); fs.writeFileSync(path.join(d, 'real.mjs'), '// a program of the product\n');
  const f = rel => path.join(d, rel);
  fs.writeFileSync(f('g.mjs'), body(['// named places taken only from files of this repository (data/gazetteer.json, built by', '// tools/build-gazetteer.mjs from the layers).', 'export const A = 1;']));
  let h = audit(d); assert.equal(h.length, 1); assert.equal(h[0].file, 'g.mjs'); assert.equal(h[0].line, 1); assert.equal(h[0].wrapped, true);
  fs.writeFileSync(f('g.mjs'), body(['/* the table written to data/x.json', ' * by tools/y.mjs */', 'export const A = 1;'])); h = audit(d); assert.equal(h.length, 1, 'comment marks at the start of the next line are cut'); assert.equal(h[0].line, 1);
  fs.writeFileSync(f('g.mjs'), body(['// the times are made per scenario by', '// real.mjs (a module of this build)', 'export const A = 1;'])); assert.equal(audit(d).length, 0, 'a shipped program, wrapped');
  fs.writeFileSync(f('g.mjs'), body(['// Built from the unit files.', '// Used by main.mjs to draw them', 'export const A = 1;'])); assert.equal(audit(d).length, 0, 'the end of a sentence stops the reading');
  fs.writeFileSync(f('g.mjs'), body(['// first line says nothing', '// second line says (tools/build-x.mjs) and that is one hit, on line 2', 'export const A = 1;'])); h = audit(d); assert.equal(h.length, 1); assert.equal(h[0].line, 2); assert.ok(!h[0].wrapped, 'a statement inside one line is the line rule, not the wrapped one');
  fs.rmSync(d, { recursive: true, force: true });
});
test('copy audit: words of the working process are counted for review', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'btaud-')); fs.writeFileSync(path.join(d, 'a.json'), '"no source was opened by this workstream", "horde/tl-12/results.jsonl", "two shards", "this pass"');
  fs.writeFileSync(path.join(d, 'b.json'), '"checked with tools/bt/check_x.py and app/tools/build-y.mjs"'); const r = auditReview(d); assert.equal(r['tool path'].count, 2); assert.equal(audit(d).length, 0, 'tool paths are counted for review, not failed'); assert.equal(r.workstream.count, 1); assert.equal(r.horde.count, 1); assert.equal(r.shard.count, 1); assert.equal(r['this pass'].count, 1); assert.equal(audit(d).length, 0);
  fs.rmSync(d, { recursive: true, force: true });
});
test('the shipped kit and data files carry no production note', () => {
  for (const f of ['kit/kit_specs.json', 'kit/weapons.json', 'kit/cavalry_units.json']) { const s = fs.readFileSync(path.join(A.out, f), 'utf8'); assert.doesNotMatch(s, /generated by|do not edit by hand|tools\/bt\/build_kit_data/i, f); }
  assert.deepEqual(A.audit, []);
});
test('every relative import and every shipped JSON parses inside dist', () => {
  for (const f of distFiles(A.out)) {
    const p = path.join(A.out, f), s = /\.(mjs|json|html)$/.test(f) ? fs.readFileSync(p, 'utf8') : '';
    if (f.endsWith('.json')) JSON.parse(s);
    if (f.endsWith('.mjs')) for (const m of s.matchAll(/(?:\bfrom\s*|\bimport\s+|\bimport\(\s*)['"](\.[^'"\n]+)['"]\s*(?:[),;\n]|$)/g)) assert.ok(fs.existsSync(path.resolve(path.dirname(p), m[1])), `${f} -> ${m[1]}`);
  }
});
test('index transform: home goes to the root, noindex, stamp shows the version; root index links to the theatre', () => {
  const h = fs.readFileSync(path.join(A.out, 'app/index.html'), 'utf8'); assert.ok(!h.includes('../../../')); assert.ok(h.includes('href="../"') && h.includes('noindex') && h.includes(stampHTML(A.version)));
  assert.equal(h.match(/name="robots"/g).length, 1);
  assert.match(fs.readFileSync(path.join(A.out, 'index.html'), 'utf8'), /url=app\/index\.html/);
  assert.match(fs.readFileSync(path.join(A.out, '_headers'), 'utf8'), /X-Robots-Tag: noindex/); assert.ok(fs.existsSync(path.join(A.out, 'netlify.toml')));
});
test('manifest hashes match the files', () => {
  const m = JSON.parse(fs.readFileSync(path.join(A.out, 'MANIFEST.json'), 'utf8')); assert.equal(m.version, A.version);
  for (const f of m.files) { assert.equal(fs.statSync(path.join(A.out, f.path)).size, f.bytes); assert.equal(execHash(path.join(A.out, f.path)), f.sha256, f.path); }
  assert.deepEqual(m.files.map(f => f.path).sort(), distFiles(A.out).filter(f => f !== 'MANIFEST.json'));
});
test('zip passes unzip -t and holds exactly the dist files', () => {
  try { execFileSync('unzip', ['-tq', A.zip], { stdio: 'pipe' }); } catch (e) { if (e.code === 'ENOENT') return; throw e; }
  const lst = execFileSync('unzip', ['-Z1', A.zip]).toString().trim().split('\n').sort();
  assert.deepEqual(lst, distFiles(A.out));
  const z = makeZip([{ name: 'a.txt', data: Buffer.from('hi') }]); assert.equal(z.readUInt32LE(0), 0x04034b50);
});
test('the trace report is written beside the dist, never inside it', () => {
  const rep = JSON.parse(fs.readFileSync(path.join(tmp, 'a/trace-report.json'), 'utf8')); assert.equal(rep.version, A.version); assert.ok(rep.why['app/src/main.mjs']);
  assert.ok(!distFiles(A.out).includes('trace-report.json'));
});
test('copy audit detects what it should', () => {
  const d = path.join(tmp, 'aud'); fs.mkdirSync(d); fs.writeFileSync(path.join(d, 'x.json'), '{"a":"built by Claude"}'); fs.writeFileSync(path.join(d, 'y.txt'), 'plain history text');
  assert.equal(audit(d).length, 1);
});
test('copy audit of the shipped dist is clean (shipping gate; red = a source file mentions how the site was made)', () => {
  assert.deepEqual(A.audit, [], 'audit hits:\n' + A.audit.map(h => `${h.file}:${h.line} ${h.match}`).join('\n'));
});

// =============================================================== part 2: made-up trees
const fx = (name, edit) => { const root = makeFixture(path.join(tmp, 'fx-' + name)); if (edit) edit(root); return root; };
const put = (root, rel, text) => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); };
const patch = (root, rel, a, b) => { const p = path.join(root, rel), s = fs.readFileSync(p, 'utf8'); assert.ok(s.includes(a), 'fixture text to replace: ' + a); fs.writeFileSync(p, s.replace(a, b)); };
test('fixture: the whole made-up site is traced without a problem', () => {
  const root = fx('base'), t = trace({ root, cfg: FIXTURE_CFG }); assert.deepEqual(t.problems, []);
  const must = ['app/index.html', 'app/styles.css', 'app/extra.css', 'app/img/logo.png', 'app/img/bg.png', 'app/fonts/a.woff2',
    'app/src/main.mjs', 'app/src/theatre.mjs', 'app/src/config.mjs', 'app/src/shim.mjs', 'app/src/worker.mjs', 'app/src/unloaded.mjs',
    'app/src/ext/index.mjs', 'app/src/ext/a.mjs', 'app/src/ext/sub/b.mjs', 'app/src/ext/unlisted.mjs',
    'app/data/monuments.json', 'app/data/veg/1.bin', 'app/data/veg/2.bin', 'app/data/tiles/1.json', 'app/data/tiles/2.json', 'app/data/doc-relative.json', 'app/data/only-unloaded.json', 'app/data/unlisted.json', 'app/data/prefix-a.json', 'app/data/prefix-b.json', 'app/data/audio/x.json',
    'app/roster/index.html', 'app/roster/units.html', 'app/roster/roster.js', 'app/roster/roster.css', 'app/roster/img/flag.png', 'app/roster/data/index.json', 'app/roster/data/units/u1.json', 'app/roster/data/units/u2.json', 'rosters/data2/x.jsonl',
    'extra/mod.mjs', 'extra/mod-data.json', 'GOVERNANCE/register_index.json', 'render/prototype/data/terrain.json'];
  for (const f of must) assert.ok(t.files.includes(f), 'traced: ' + f);
  const never = ['app/src/notes.md', 'app/src/x.test.mjs', 'app/data/not-referenced.json', 'app/data/tiles/readme.txt', 'app/roster/README.md', 'GOVERNANCE/register/EG-1.md', 'GOVERNANCE/register/EG-2.md', 'GOVERNANCE/private.json', 'app/tools/build.mjs'];
  for (const f of never) assert.ok(!t.files.includes(f), 'not traced: ' + f);
  assert.deepEqual(t.files, [...must].sort(), 'exactly these files and no other');
});
test('fixture: added modules. The index says which are loaded; the others of the folder ship and are scanned too', () => {
  const root = fx('ext'), t = trace({ root, cfg: FIXTURE_CFG });
  const c = t.computedImports.find(x => x.file === 'app/src/theatre.mjs' && x.status === 'folder'); assert.ok(c); assert.equal(c.folder, 'app/src/ext/'); assert.equal(c.index, 'app/src/ext/index.mjs');
  assert.deepEqual(c.modules, ['app/src/ext/a.mjs', 'app/src/ext/sub/b.mjs']);
  for (const f of ['app/src/ext/a.mjs', 'app/src/ext/sub/b.mjs', 'app/src/ext/index.mjs', 'app/src/worker.mjs', 'app/src/shim.mjs', 'extra/mod.mjs']) assert.ok(t.modules.loaded.includes(f), 'loaded: ' + f);
  for (const f of ['app/src/ext/unlisted.mjs', 'app/src/unloaded.mjs']) assert.ok(t.modules.shippedOnly.includes(f), 'shipped, not known to be loaded: ' + f);
  assert.ok(t.why['app/data/monuments.json'].some(w => /urls\.data in app\/src\/ext\/a\.mjs/.test(w)), 'ctx.urls.data + file of an added module');
  assert.ok(t.why['app/data/veg/1.bin'].some(w => /app\/src\/ext\/sub\/b\.mjs/.test(w)), 'urls.data + template of an added module');
  assert.ok(t.why['app/data/unlisted.json'].some(w => /unlisted\.mjs/.test(w)), 'data of a module that is shipped but not listed');
  assert.ok(t.notes.some(n => /node:fs/.test(n) && /unloaded\.mjs/.test(n)), 'a node-only import of a module the page does not load is a note, not a problem');
});
test('fixture: added modules without an index: every module of the folder counts as loaded', () => {
  const root = fx('ext-noindex', r => fs.rmSync(path.join(r, 'app/src/ext/index.mjs'))), t = trace({ root, cfg: FIXTURE_CFG }); assert.deepEqual(t.problems, []);
  const c = t.computedImports.find(x => x.status === 'folder'); assert.equal(c.index, null); assert.deepEqual(c.modules, ['app/src/ext/a.mjs', 'app/src/ext/sub/b.mjs', 'app/src/ext/unlisted.mjs']);
  assert.ok(t.notes.some(n => /app\/src\/ext\/index\.mjs/.test(n)), 'the missing list is noted (the shell asks for it)');
});
test('fixture: an index that lists a module that is not there fails the trace', () => {
  const root = fx('ext-gone', r => put(r, 'app/src/ext/index.mjs', "export default ['a.mjs', 'gone.mjs'];\n")), t = trace({ root, cfg: FIXTURE_CFG });
  assert.ok(t.problems.some(p => /app\/src\/ext\/gone\.mjs/.test(p)), t.problems.join('\n')); assert.throws(() => pack({ root, cfg: FIXTURE_CFG, out: path.join(tmp, 'gone/dist'), zip: false }), /trace problems/);
});
test('fixture: an empty folder of added modules is not a problem', () => {
  const root = fx('ext-empty', r => { fs.rmSync(path.join(r, 'app/src/ext'), { recursive: true }); fs.mkdirSync(path.join(r, 'app/src/ext')); }), t = trace({ root, cfg: FIXTURE_CFG });
  assert.deepEqual(t.problems, []); assert.ok(!t.files.some(f => f.startsWith('app/src/ext/')));
});
test('fixture: a static section ships whole; its pages, scripts, style sheets and index files are followed', () => {
  const root = fx('roster'), t = trace({ root, cfg: FIXTURE_CFG });
  assert.deepEqual(t.sections.map(s => s.path), ['app/roster']); assert.deepEqual(t.sections[0].pages, ['app/roster/index.html', 'app/roster/units.html']);
  assert.ok(t.pages.includes('app/roster/index.html') && t.pages.includes('app/roster/units.html') && t.pages.includes('app/index.html'));
  assert.ok(t.why['rosters/data2/x.jsonl'].some(w => /listed in app\/roster\/data\/index\.json/.test(w)), 'a file outside the section that its index lists');
  assert.ok(t.why['app/roster/img/flag.png'].some(w => /roster\.css/.test(w)));
  assert.ok(t.modules.loaded.includes('app/roster/roster.js'));
});
test('fixture: an index file OUTSIDE the section that a page of the section loads is followed: the unit files it names ship, the ones it does not name do not', () => {
  const root = fx('roster-out', r => {
    put(r, 'app/roster/roster.js', "export const load = () => fetch('../../rosters/data2/INDEX.json').then(r => r.json());\n");
    put(r, 'rosters/data2/INDEX.json', JSON.stringify({ title: 'Index', units: { u1: 'pa/u1.json', u2: 'pa/u2.json', side: 'more/INDEX2.json' }, missing: 'pa/not-there.json' }));
    put(r, 'rosters/data2/pa/u1.json', '{"id":"u1"}\n'); put(r, 'rosters/data2/pa/u2.json', '{"id":"u2"}\n'); put(r, 'rosters/data2/pa/unlisted.json', '{"id":"nobody names me"}\n');
    put(r, 'rosters/data2/more/INDEX2.json', JSON.stringify({ units: ['deeper/u3.json'] })); put(r, 'rosters/data2/more/deeper/u3.json', '{"id":"u3"}\n');
  }), t = trace({ root, cfg: FIXTURE_CFG }); assert.deepEqual(t.problems, []);
  for (const f of ['rosters/data2/INDEX.json', 'rosters/data2/pa/u1.json', 'rosters/data2/pa/u2.json', 'rosters/data2/more/INDEX2.json', 'rosters/data2/more/deeper/u3.json']) assert.ok(t.files.includes(f), 'traced: ' + f);
  assert.ok(!t.files.includes('rosters/data2/pa/unlisted.json'), 'a file no index names is not shipped');
  assert.ok(t.why['rosters/data2/pa/u1.json'].some(w => /listed in rosters\/data2\/INDEX\.json/.test(w)), JSON.stringify(t.why['rosters/data2/pa/u1.json']));
  assert.ok(t.notes.some(n => /do not resolve/.test(n) && /pa\/not-there\.json/.test(n)), 'a name that does not resolve is noted: ' + t.notes.join(' | '));
});
test('fixture: no section folder, no section (the shell alone still packs)', () => {
  const root = fx('noroster', r => { fs.rmSync(path.join(r, 'app/roster'), { recursive: true }); fs.rmSync(path.join(r, 'rosters'), { recursive: true }); }), t = trace({ root, cfg: FIXTURE_CFG });
  assert.deepEqual(t.problems, []); assert.deepEqual(t.sections, []); assert.ok(!t.files.some(f => f.startsWith('app/roster/') || f.startsWith('rosters/')));
});
test('fixture: a broken link or a missing style-sheet address in a page is a problem', () => {
  let root = fx('badlink', r => patch(r, 'app/roster/index.html', 'href="units.html"', 'href="nowhere.html"')); assert.ok(trace({ root, cfg: FIXTURE_CFG }).problems.some(p => /app\/roster\/nowhere\.html/.test(p)));
  root = fx('badcss', r => patch(r, 'app/styles.css', 'url(./img/bg.png)', 'url(./img/none.png)')); assert.ok(trace({ root, cfg: FIXTURE_CFG }).problems.some(p => /app\/img\/none\.png/.test(p)));
});
test('fixture: imports. A missing static import and an unmapped bare name of a loaded module are problems; a missing import() target is a note', () => {
  let root = fx('badimport', r => patch(r, 'app/src/main.mjs', "import './theatre.mjs';", "import './theatre.mjs'; import './absent.mjs';")); assert.ok(trace({ root, cfg: FIXTURE_CFG }).problems.some(p => /missing: app\/src\/absent\.mjs/.test(p)));
  root = fx('badbare', r => patch(r, 'app/src/main.mjs', "import './theatre.mjs';", "import './theatre.mjs'; import fs from 'node:fs';")); assert.ok(trace({ root, cfg: FIXTURE_CFG }).problems.some(p => /node:fs/.test(p)));
  root = fx('optimport'); const t = trace({ root, cfg: FIXTURE_CFG }); assert.deepEqual(t.problems, []); assert.ok(t.notes.some(n => /app\/src\/missing-optional\.mjs/.test(n)));
  // words that look like an import inside a string are not imports
  root = fx('strimport', r => patch(r, 'app/src/main.mjs', "import './theatre.mjs';", "import './theatre.mjs'; const rec = { state: 'import', error: null }; rec.state = 'refused';")); assert.deepEqual(trace({ root, cfg: FIXTURE_CFG }).problems, []);
});
test('fixture: a computed import of an unknown form is listed as unresolved', () => {
  const root = fx('computed', r => patch(r, 'app/src/theatre.mjs', '// MARK', 'export const late = name => import(name);')), t = trace({ root, cfg: FIXTURE_CFG });
  assert.deepEqual(t.computedImports.filter(c => c.status === 'unresolved').map(c => [c.file, c.arg]), [['app/src/theatre.mjs', 'name']]);
  const t2 = trace({ root, cfg: { ...FIXTURE_CFG, knownComputed: [{ file: /theatre\.mjs$/, arg: /^name$/, covered: 'test' }] } }); assert.equal(t2.computedImports.filter(c => c.status === 'unresolved').length, 0);
});
test('fixture: a file-like literal of a loaded module that is not in the build is listed', () => {
  const root = fx('literal', r => patch(r, 'app/src/theatre.mjs', '// MARK', "export const TEX = base => base + 'ghost/thing.bin'; const g = 'ghost/thing.bin';")), t = trace({ root, cfg: FIXTURE_CFG });
  assert.deepEqual(t.unshippedLiterals.map(l => [l.literal, l.file]), [['ghost/thing.bin', 'app/src/theatre.mjs']]);
});
test('fixture: withheld files never ship and are listed; a reduced file keeps the listed fields; a second reader fails the trace', () => {
  const root = fx('withheld'), out = path.join(tmp, 'wh/dist'), r = pack({ root, cfg: FIXTURE_CFG, out, zipDir: path.join(tmp, 'wh') });
  assert.ok(!distFiles(out).some(f => /GOVERNANCE\/register\//.test(f)));
  const m = JSON.parse(fs.readFileSync(path.join(out, 'MANIFEST.json'), 'utf8')); assert.deepEqual(m.withheld.map(w => [w.pattern, w.files]), [['GOVERNANCE/register/**/*.md', 2]]);
  assert.equal(fs.readFileSync(path.join(out, 'GOVERNANCE/register_index.json'), 'utf8'), '[{"id":"EG-1"},{"id":"EG-2"}]\n'); assert.deepEqual(m.reduced.map(x => x.keeps), [['id']]);
  assert.equal(r.audit.length, 0, JSON.stringify(r.audit));
  const root2 = fx('reader2', rr => put(rr, 'app/src/ext/a.mjs', "export async function init(ctx) { const j = await (await fetch(ctx.urls.gov + 'register_index.json')).json(); return j[0].title; }\n"));
  assert.ok(trace({ root: root2, cfg: FIXTURE_CFG }).problems.some(p => /register_index\.json is shipped reduced/.test(p) && /app\/src\/ext\/a\.mjs/.test(p)));
  const root3 = fx('reader3', rr => patch(rr, 'app/src/theatre.mjs', '.map(r => r.id)', '.map(r => r.title)'));
  assert.ok(trace({ root: root3, cfg: FIXTURE_CFG }).problems.some(p => /no longer reads it the listed way/.test(p)));
});
test('fixture: pack is deterministic, the index page is transformed, and the version names the emitted bytes', () => {
  const root = fx('pack'), a = pack({ root, cfg: FIXTURE_CFG, out: path.join(tmp, 'pk-a/dist'), zipDir: path.join(tmp, 'pk-a') }), b = pack({ root, cfg: FIXTURE_CFG, out: path.join(tmp, 'pk-b/dist'), zipDir: path.join(tmp, 'pk-b') });
  assert.equal(a.version, b.version); assert.equal(a.zipSha256, b.zipSha256);
  const h = fs.readFileSync(path.join(a.out, 'app/index.html'), 'utf8'); assert.ok(h.includes('<meta name="bt-home" content="../">') && h.includes('id="home-link" href="../"') && h.includes('noindex') && h.includes(stampHTML(a.version)));
  put(root, 'app/data/monuments.json', '{"changed":true}\n'); const c = pack({ root, cfg: FIXTURE_CFG, out: path.join(tmp, 'pk-c/dist'), zipDir: path.join(tmp, 'pk-c') }); assert.notEqual(c.version, a.version, 'a changed data file changes the version');
  put(root, 'app/data/monuments.json', fs.readFileSync(path.join(makeFixture(path.join(tmp, 'fx-pack-ref')), 'app/data/monuments.json')));
  put(root, 'GOVERNANCE/register_index.json', '[{"id":"EG-1","title":"t","rec":"changed internal note"},{"id":"EG-2","title":"u"}]\n');
  const d = pack({ root, cfg: FIXTURE_CFG, out: path.join(tmp, 'pk-d/dist'), zipDir: path.join(tmp, 'pk-d') }); assert.equal(d.version, a.version, 'a change in a field that is not shipped does not change the build');
  assert.equal(d.zipSha256, a.zipSha256);
});
test('fixture: a build with a copy audit hit never gets the clean zip name; a clean one does', () => {
  const clean = pack({ root: fx('zipname-clean'), cfg: FIXTURE_CFG, out: path.join(tmp, 'zn-a/dist'), zipDir: path.join(tmp, 'zn-a') });
  assert.equal(clean.clean, true); assert.equal(path.basename(clean.zip), `gettysburg-BT-staging-${clean.version}.zip`); assert.equal(fs.readFileSync(clean.zip + '.sha256', 'utf8'), `${clean.zipSha256}  gettysburg-BT-staging-${clean.version}.zip\n`);
  const root = fx('zipname-hit', r => put(r, 'app/data/monuments.json', '{"note":"built by Claude"}\n')), hit = pack({ root, cfg: FIXTURE_CFG, out: path.join(tmp, 'zn-b/dist'), zipDir: path.join(tmp, 'zn-b') });
  assert.equal(hit.clean, false); assert.equal(hit.audit.length, 1); assert.equal(path.basename(hit.zip), `gettysburg-BT-staging-${hit.version}-AUDIT-HITS-1.zip`);
  assert.equal(fs.readFileSync(hit.zip + '.sha256', 'utf8'), `${hit.zipSha256}  ${path.basename(hit.zip)}\n`); assert.ok(!fs.existsSync(path.join(tmp, 'zn-b', `gettysburg-BT-staging-${hit.version}.zip`)), 'no zip with the plain name');
  assert.ok(fs.existsSync(path.join(tmp, 'zn-b/dist/app/data/monuments.json')), 'the dist is still written, so that the hit can be inspected and the real run can use it');
});
test('fixture: a new pack removes the zips of earlier builds that failed the audit and keeps every clean one', () => {
  const dir = path.join(tmp, 'zn-clean-up'); fs.mkdirSync(dir, { recursive: true });
  const hit1 = pack({ root: fx('cu-1', r => put(r, 'app/data/monuments.json', '{"note":"built by Claude"}\n')), cfg: FIXTURE_CFG, out: path.join(tmp, 'cu-1/dist'), zipDir: dir });
  const clean = pack({ root: fx('cu-2'), cfg: FIXTURE_CFG, out: path.join(tmp, 'cu-2/dist'), zipDir: dir });
  assert.ok(!fs.existsSync(hit1.zip) && !fs.existsSync(hit1.zip + '.sha256'), 'the flagged zip of the earlier build is gone'); assert.ok(fs.existsSync(clean.zip));
  const hit2 = pack({ root: fx('cu-3', r => put(r, 'app/data/monuments.json', '{"note":"written by an agent"}\n')), cfg: FIXTURE_CFG, out: path.join(tmp, 'cu-3/dist'), zipDir: dir });
  assert.ok(fs.existsSync(clean.zip) && fs.existsSync(clean.zip + '.sha256'), 'a clean zip is never removed'); assert.ok(fs.existsSync(hit2.zip));
});
test('fixture: the index page transform refuses a page it does not recognise', () => {
  const root = fx('badindex', r => patch(r, 'app/index.html', 'id="home-link" href="../../../"', 'id="other" href="../../../"'));
  assert.throws(() => pack({ root, cfg: FIXTURE_CFG, out: path.join(tmp, 'bi/dist'), zip: false }), /no longer contains the home link/);
});

// =============================================================== part 3: the copy audit opens gzip files; the publication filter for the maker members of data files
const gz = text => zlib.gzipSync(Buffer.from(text));
const auditOf = files => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'btaud-')); try { for (const [rel, body] of Object.entries(files)) { const p = path.join(d, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, body); } return audit(d); } finally { fs.rmSync(d, { recursive: true, force: true }); } };
test('copy audit: a gzip file is opened and its text audited like any other file', () => {
  const h = auditOf({ 'notes/a.txt.gz': gz('plain history\nbuilt by Claude\nmore plain text\n') }); assert.equal(h.length, 1); assert.equal(h[0].line, 2); assert.equal(h[0].gzip, true); assert.match(h[0].match, /claude/i);
  assert.equal(auditOf({ 'notes/a.txt.gz': gz('the 20th Maine held the left of the line\n') }).length, 0);
  const u = auditOf({ 'notes/broken.json.gz': Buffer.from('this is not gzip data') }); assert.equal(u.length, 1); assert.equal(u[0].where, 'unreadable', 'a file the audit cannot read is a hit, never a pass');
  const bin = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]), Buffer.from('tEXtSoftware\0made with ChatGPT image tool')]); const b = auditOf({ 'img/x.png.gz': zlib.gzipSync(bin) }); assert.equal(b.length, 1); assert.equal(b[0].where, 'binary'); assert.equal(b[0].gzip, true);
  assert.equal(auditOf({ 'img/clean.png.gz': zlib.gzipSync(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0]), Buffer.from('plain pixels')])) }).length, 0);
});
test('copy audit: a printed given name in the name field of a roster row is data; the same word anywhere else is still a hit', () => {
  const R = 'rosters/data2/union/nh/5th-new-hampshire-infantry.jsonl.gz', header = '{"f":"roster2/2","u":"u-nh-5th","army":"union","st":"nh","name":"5th New Hampshire Infantry","n":3}';
  const ok = ['[218,"Mansfield, Claude.","","Co. I ; b. New York ; age 27 ; disch. disa",12]', '[33,"Claude H. Clarke,","","St. Albans, Aug. 15, \'62",1185]', '[17,"Somers, Claude","","Brighton, Sept. 15/62",261]', '[5,"van Claude, Jr.","","Co. A",9]'];
  assert.deepEqual(auditOf({ [R]: gz([header, ...ok, ''].join('\n')) }), [], 'the three printed names of the real files and a particle name');
  const bad = { 'in the remarks': '[218,"Mansfield, John","","Co. I ; brother of Claude ; disch.",12]', 'with a note in the name field': '[218,"Smith, built by Claude","","Co. I",12]', 'a lower-case word in the name field': '[218,"Smith, wrote Claude","","Co. I",12]', 'in the rank field': '[218,"Smith, John","Claude","Co. I",12]', 'a second hit in the remarks of the same row': '[218,"Mansfield, Claude","","written by Claude",12]' };
  for (const [what, row] of Object.entries(bad)) { const h = auditOf({ [R]: gz([header, row, ''].join('\n')) }); assert.equal(h.length, 1, what + ': ' + JSON.stringify(h)); assert.equal(h[0].line, 2); }
  assert.equal(auditOf({ [R]: gz('{"f":"roster2/2","name":"Claude unit","n":3}\n' + ok[0] + '\n') }).length, 1, 'the header line of a file is not a name field');
  assert.equal(auditOf({ 'rosters/data2/units.json': '[218,"Mansfield, Claude.","","Co. I",12]' }).length, 1, 'a plain (not gzip) index file is not a roster file');
  assert.equal(auditOf({ 'app/data/other.jsonl.gz': gz('[218,"Mansfield, Claude.","","Co. I",12]\n') }).length, 1, 'only rosters/data2 has the allowance');
  assert.equal(auditOf({ [R.replace('.jsonl.gz', '.notes.gz')]: gz('[218,"Mansfield, Claude.","","Co. I",12]\n') }).length, 1, 'only the unit files and their flag files');
  // the flag files: the normalised names of the unit, one list; a name with an escaped quote in the list (an OCR mark) does not break the reading
  const F = 'rosters/data2/union/nh/5th-new-hampshire-infantry.flags.json.gz', flags = names => JSON.stringify({ f: 'roster2-flags/1', u: 'u-nh-5th', n: 3, normalised_names: names, head_kinds: {} });
  assert.deepEqual(auditOf({ [F]: gz(flags(['Albion P. Abbott', 'Bd"ward Avery', '', 'Claude Mansfield', 'Nathan Mansur'])) }), []);
  assert.equal(auditOf({ [F]: gz(flags(['Albion P. Abbott', 'built by Claude'])) }).length, 1, 'a statement in the list is a hit');
  assert.equal(auditOf({ [F]: gz(JSON.stringify({ f: 'roster2-flags/1', about: 'this file was written by Claude', normalised_names: ['A B'] })) }).length, 1, 'the other fields of a flag file are in scope');
  assert.ok(AUDIT_ALLOW.every(a => a.file instanceof RegExp && a.why && a.match && a.before), 'every allowance names its file, the word, the text in front of it and why');
  assert.ok(AUDIT_ALLOW.every(a => /rosters/.test(a.file.source)), 'no allowance outside the roster data');
});
test('real roster data: the printed names pass, nothing else in the 118 files is a hit (a second look at the files the roster section will ship)', () => {
  const dir = path.join(BT, 'rosters/data2'); if (!fs.existsSync(dir)) return;
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'btros-')); try { fs.mkdirSync(path.join(d, 'rosters'), { recursive: true }); fs.cpSync(dir, path.join(d, 'rosters/data2'), { recursive: true });
    const hits = audit(d).filter(h => !/^rosters\/data2\/(units\.json|sources\/[\w.-]+\.json)$/.test(h.file) || !/"generated"/.test(h.text || ''));      // the "generated" date keys of the index files are the publication filter's (next tests)
    assert.deepEqual(hits, [], 'hits in the roster data:\n' + hits.map(h => `${h.file}:${h.line} ${h.match}`).join('\n')); } finally { fs.rmSync(d, { recursive: true, force: true }); }
});

test('publication filter: jsonMembers finds scalar members and skips what is inside strings', () => {
  const t = '{"a":1,"built_by":"tools/x.mjs","n":{"generator":"scripts/y.py","k":["x",{"builder":"tools/bt/z.py"}]},"note":"he wrote \\"built_by\\": \\"a/b\\" here","generated":"2026-11-04"}';
  assert.deepEqual(jsonMembers(t, isMakerMember).map(m => [m.key, m.value]), [['built_by', '"tools/x.mjs"'], ['generator', '"scripts/y.py"'], ['builder', '"tools/bt/z.py"'], ['generated', '"2026-11-04"']]);
  assert.deepEqual(jsonMembers('{"a":{"b":1},"c":[1,2],"d":true,"e":null,"f":-1.5e3}', () => true).map(m => m.key), ['b', 'd', 'e', 'f'], 'scalar members only, in the order of the text');
});
test('publication filter: only what the copy audit reports is a maker member', () => {
  for (const [k, v, want] of [['generated', '"2026-11-04"', true], ['generated_by', '"x"', true], ['generated_at', '1700000000', true], ['Generated', 'null', true], ['generated', '{"a":1}', false], ['generated', '[1]', false],
    ['built_by', '"tools/build-x.mjs"', true], ['made_with', '"scripts/x.py"', true], ['generator', '"tools/bt/build_structures.py"', true], ['builder', '"build.mjs run.sh"', true], ['builder', '"x.mjs"', true], ['build_script', '"a/b.sh"', true],
    ['built_by', '"the Park Service"', false], ['builder', '"Harper"', false], ['built_by', '"Bachelder 1876"', false], ['generator', '"battle-theatre figures3d (procedural)"', false], ['built_by', '42', false], ['source', '"tools/x.mjs"', false], ['generates', '"a/b"', false]])
    assert.equal(isMakerMember(k, v), want, `${k}: ${v}`);
  // the filter and the audit agree: every member the filter takes is one the audit reports, and every maker-key line the audit reports on a scalar member is taken
  for (const [k, v] of [['generated', '"2026-11-04"'], ['built_by', '"tools/build-x.mjs"'], ['generator', '"tools/bt/x.py"'], ['builder', '"tools/bt/x.py"'], ['generated_by', '"docs/x.mjs (node y writes this file)"']]) { assert.ok(isMakerMember(k, v)); assert.equal(auditOf({ 'a.json': `{"${k}": ${v}}` }).length, 1, k); }
});
test('publication filter: a member is cut with the right comma in every position, in minified, indented and CRLF text, and the rest is byte for byte the same', () => {
  const cases = [
    ['{"built_by":"tools/x.mjs","a":1}', '{"a":1}'], ['{"a":1,"built_by":"tools/x.mjs"}', '{"a":1}'], ['{"a":1,"built_by":"tools/x.mjs","b":2}', '{"a":1,"b":2}'], ['{"built_by":"tools/x.mjs"}', '{}'],
    ['{"generated":"2026-11-04","built_by":"tools/x.mjs","a":1}', '{"a":1}'], ['{"a":1,"generated":"2026-11-04","built_by":"tools/x.mjs"}', '{"a":1}'], ['{"a":1,"b":{"generator":"scripts/y.py"},"c":[{"builder":"tools/b.py","d":2}]}', '{"a":1,"b":{},"c":[{"d":2}]}'],
    ['{\n "a": 1,\n "built_by": "tools/x.mjs",\n "b": 2\n}\n', '{\n "a": 1,\n "b": 2\n}\n'], ['{\n "a": 1,\n "built_by": "tools/x.mjs"\n}\n', '{\n "a": 1\n}\n'], ['{\n "built_by": "tools/x.mjs",\n "a": 1\n}\n', '{\n "a": 1\n}\n'],
    ['{\r\n  "a": 1,\r\n  "generator": "tools/bt/build_structures.py",\r\n  "b": 2\r\n}\r\n', '{\r\n  "a": 1,\r\n  "b": 2\r\n}\r\n'], ['{"a":"built_by tools/x.mjs","note":"\\"built_by\\": \\"a/b\\""}', '{"a":"built_by tools/x.mjs","note":"\\"built_by\\": \\"a/b\\""}'],
    ['[{"generated":"d","a":1},{"a":2,"generated":"d"}]', '[{"a":1},{"a":2}]'], ['{"x":{"built_by":"tools/x.mjs"},"y":{"built_by":"the Park Service"}}', '{"x":{},"y":{"built_by":"the Park Service"}}']];
  for (const [a, b] of cases) { const r = scrubMakerMembers(a, 'a.json'); assert.equal(r.text, b, JSON.stringify(a)); assert.doesNotThrow(() => JSON.parse(r.text)); }
  const l = scrubMakerMembers('{"a":1,"generated":"d"}\n\n{"built_by":"tools/x.mjs","b":2}\n', 'x.jsonl'); assert.equal(l.text, '{"a":1}\n\n{"b":2}\n'); assert.equal(l.removed.length, 2);
  assert.deepEqual(scrubMakerMembers('{"a":1}', 'a.json'), { text: '{"a":1}', removed: [] }); assert.deepEqual(scrubMakerMembers('{"builder":"Harper","a":1}', 'a.json').removed, []);
  assert.throws(() => scrubMakerMembers('{"a":1,"built_by":"tools/x.mjs",}', 'bad.json'), /does not parse/, 'a file that does not parse is never "fixed"');
  assert.equal(scrubMakerMembers('{"generated":{"a":1}}', 'a.json').removed.length, 0, 'an object value is not taken: the audit still reports it');
});
test('publication filter, real tree: the shipped copy is the working file minus the maker members and nothing else', () => {
  const strip = v => Array.isArray(v) ? v.map(strip) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k, x]) => !(x === null || typeof x !== 'object') || !isMakerMember(k, JSON.stringify(x))).map(([k, x]) => [k, strip(x)])) : v;
  const skip = new Set(['app/index.html', ...PROJECT.map(p => p.path)]); let P, same = 0, bad;
  // other workstreams edit the tree while this runs: a file that changed between the pack and the comparison is not a defect of the packer, so a mismatch is checked again on a fresh pack (three tries)
  for (let k = 0; k < 3; k++) {
    P = pack({ out: path.join(tmp, `pf${k}/dist`), zipDir: path.join(tmp, `pf${k}`), zip: false }); const taken = new Map(P.scrubbed.map(x => [x.path, x])); bad = []; same = 0;
    for (const f of P.traced) { if (skip.has(f)) continue; const a = fs.readFileSync(path.join(BT, f)), b = fs.readFileSync(path.join(P.out, f));
      if (taken.has(f)) { if (a.equals(b) || !taken.get(f).removed.length || JSON.stringify(JSON.parse(b.toString('utf8'))) !== JSON.stringify(strip(JSON.parse(a.toString('utf8'))))) bad.push('scrubbed file: ' + f); }
      else if (!a.equals(b)) bad.push('a shipped file differs from its working file and the packer does not list it: ' + f); else same++; }
    if (!bad.length) break;
  }
  assert.deepEqual(bad, []); assert.ok(same > 100, 'files compared: ' + same);
  const m = JSON.parse(fs.readFileSync(path.join(P.out, 'MANIFEST.json'), 'utf8')); assert.deepEqual(m.scrubbed, P.scrubbed.map(x => ({ path: x.path, members: x.removed.length })), 'the manifest counts every file the filter touched');
  assert.doesNotMatch(JSON.stringify(m.scrubbed), /tools\/|\.mjs|\.py/, 'the manifest names no script');
  const rep = JSON.parse(fs.readFileSync(path.join(tmp, 'pf0/trace-report.json'), 'utf8')); assert.ok(Array.isArray(rep.scrubbed), 'the trace report (beside the dist) holds the keys and values that were taken');
  assert.ok(P.scrubbed.length > 0 && P.scrubbed.every(x => x.removed.every(y => isMakerMember(y.key, y.value))));
  assert.ok(!P.audit.some(h => /\.jsonl?$/i.test(h.file) && /^"?(generated|built_by|made_by|generator|builder|generated_by)/i.test(h.match)), 'no maker key is left in the shipped copy of a data file (a maker key written in a MODULE is the audit rule for code and is a hit of its own)');
});
test('fixture: maker members are cut from the shipped copy only, listed in the manifest, and the audit of the finished dist stays on', () => {
  const root = fx('scrub', r => { put(r, 'app/data/monuments.json', '{\n "built_by": "app/tools/build-x.mjs",\n "rows": [1, 2, 3],\n "generated": "2026-11-04"\n}\n'); put(r, 'app/roster/data/units/u1.json', '{"id":"u1","note":"built by Claude"}\n'); });
  const out = path.join(tmp, 'scrub/dist'), r = pack({ root, cfg: FIXTURE_CFG, out, zipDir: path.join(tmp, 'scrub') });
  assert.equal(fs.readFileSync(path.join(out, 'app/data/monuments.json'), 'utf8'), '{\n "rows": [1, 2, 3]\n}\n'); assert.match(fs.readFileSync(path.join(root, 'app/data/monuments.json'), 'utf8'), /built_by/, 'the working file is not touched');
  assert.deepEqual(r.scrubbed.map(x => [x.path, x.removed.map(y => y.key)]), [['app/data/monuments.json', ['built_by', 'generated']]]);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, 'MANIFEST.json'), 'utf8')).scrubbed, [{ path: 'app/data/monuments.json', members: 2 }]);
  assert.equal(r.audit.length, 1, 'a statement in prose is not a maker member: the audit still reports it'); assert.equal(r.audit[0].file, 'app/roster/data/units/u1.json'); assert.equal(r.clean, false);
  const again = pack({ root, cfg: FIXTURE_CFG, out: path.join(tmp, 'scrub2/dist'), zipDir: path.join(tmp, 'scrub2') }); assert.equal(again.zipSha256, r.zipSha256, 'deterministic');
  const quiet = pack({ root: fx('scrub-none'), cfg: FIXTURE_CFG, out: path.join(tmp, 'scrub3/dist'), zip: false }); assert.deepEqual(quiet.scrubbed, []);
  const reads = fx('scrub-reads', rr => { put(rr, 'app/data/monuments.json', '{"built_by":"app/tools/build-x.mjs","rows":[1]}\n'); put(rr, 'app/src/ext/a.mjs', "export async function init(ctx) { const j = await (await fetch(ctx.urls.data + 'monuments.json')).json(); return j.built_by; }\n"); });
  assert.throws(() => pack({ root: reads, cfg: FIXTURE_CFG, out: path.join(tmp, 'scrub4/dist'), zip: false }), /maker key "built_by".*app\/src\/ext\/a\.mjs/, 'a module that reads a removed key stops the pack');
  const comment = fx('scrub-comment', rr => { put(rr, 'app/data/monuments.json', '{"built_by":"app/tools/build-x.mjs","rows":[1]}\n'); put(rr, 'app/src/ext/a.mjs', "// the old files had a .built_by field\nexport async function init(ctx) { return (await fetch(ctx.urls.data + 'monuments.json')).json(); }\n"); });
  assert.doesNotThrow(() => pack({ root: comment, cfg: FIXTURE_CFG, out: path.join(tmp, 'scrub5/dist'), zip: false }), 'a comment that names the key is not a reader');
});
test('fixture: a roster index that names gzip unit files and their flag files ships them; the generated date of the index is cut from the shipped copy; the audit reads inside the gzip files', () => {
  const rows = ['{"f":"roster2/2","u":"u-pa-1st","name":"1st Fixture Infantry","n":2}', '[1,"Mansfield, Claude.","","Co. I ; age 27",12]', '[2,"Smith, John","","Co. A",12]', ''].join('\n');
  const root = fx('roster-gz', r => {
    put(r, 'app/roster/roster.js', "export const load = () => fetch('../../rosters/data2/units.json').then(r => r.json());\n");
    put(r, 'rosters/data2/units.json', JSON.stringify({ format: 'roster2-units/1', generated: '2026-11-13', or_text: { part1: { file: 'tmp/library/or27/x_djvu.txt' } }, units: [{ key: 'u-pa-1st', path: 'union/pa/1st.jsonl.gz', flags: 'union/pa/1st.flags.json.gz', existing: [{ file: 'data/PA/1st.csv' }] }] }, null, 1) + '\n');
    put(r, 'rosters/data2/union/pa/1st.jsonl.gz', gz(rows)); put(r, 'rosters/data2/union/pa/1st.flags.json.gz', gz(JSON.stringify({ f: 'roster2-flags/1', normalised_names: ['Claude Mansfield', 'John Smith'] })));
    put(r, 'rosters/data2/union/pa/2nd.jsonl.gz', gz(rows)); put(r, 'rosters/data/PA/1st.csv', 'a,b\n');
  }), t = trace({ root, cfg: FIXTURE_CFG }); assert.deepEqual(t.problems, []);
  for (const f of ['rosters/data2/units.json', 'rosters/data2/union/pa/1st.jsonl.gz', 'rosters/data2/union/pa/1st.flags.json.gz']) assert.ok(t.files.includes(f), 'traced: ' + f);
  assert.ok(!t.files.includes('rosters/data2/union/pa/2nd.jsonl.gz'), 'a unit file the index does not name is not shipped'); assert.ok(!t.files.some(f => /\.csv$|_djvu/.test(f)), 'a raw file named by a path that does not resolve beside the index is not shipped');
  const out = path.join(tmp, 'roster-gz/dist'), r = pack({ root, cfg: FIXTURE_CFG, out, zipDir: path.join(tmp, 'roster-gz') });
  assert.deepEqual(r.audit, [], JSON.stringify(r.audit)); assert.ok(!/"generated"/.test(fs.readFileSync(path.join(out, 'rosters/data2/units.json'), 'utf8')), 'the date key is cut from the shipped index'); assert.deepEqual(r.scrubbed.map(x => x.path), ['rosters/data2/units.json']);
  assert.ok(fs.readFileSync(path.join(out, 'rosters/data2/union/pa/1st.jsonl.gz')).equals(gz(rows)) || zlib.gunzipSync(fs.readFileSync(path.join(out, 'rosters/data2/union/pa/1st.jsonl.gz'))).toString() === rows, 'the unit file ships unchanged');
  const bad = fx('roster-gz-bad', rr => { put(rr, 'app/roster/roster.js', "export const load = () => fetch('../../rosters/data2/units.json').then(x => x.json());\n"); put(rr, 'rosters/data2/units.json', '{"units":[{"path":"union/pa/1st.jsonl.gz"}]}\n'); put(rr, 'rosters/data2/union/pa/1st.jsonl.gz', gz(rows.replace('Co. A', 'Co. A ; the list was built by Claude'))); });
  const rb = pack({ root: bad, cfg: FIXTURE_CFG, out: path.join(tmp, 'roster-gz-bad/dist'), zipDir: path.join(tmp, 'roster-gz-bad') }); assert.equal(rb.audit.length, 1); assert.equal(rb.audit[0].gzip, true); assert.match(path.basename(rb.zip), /-AUDIT-HITS-1\.zip$/);
});
test('size table: the bytes of every build are listed by folder (the weight of a section shows at once), they add up to the build, and app, render and rosters are split one level further', () => {
  const t = sizeByFolder(new Map([['index.html', Buffer.alloc(10)], ['_headers', Buffer.alloc(5)], ['app/index.html', Buffer.alloc(7)], ['app/src/a.mjs', Buffer.alloc(100)], ['app/src/ui/b.mjs', Buffer.alloc(50)], ['app/data/x.json', Buffer.alloc(30)], ['app/roster/p.html', Buffer.alloc(3)],
    ['rosters/data2/union/ma/u.jsonl.gz', Buffer.alloc(400)], ['rosters/data2/units.json', Buffer.alloc(20)], ['render/prototype/src/w.mjs', Buffer.alloc(60)], ['GOVERNANCE/a.json', Buffer.alloc(9)], ['GOVERNANCE/b/c.json', Buffer.alloc(1)]]));
  assert.deepEqual(t, { 'rosters/data2': 420, 'app/src': 150, 'render/prototype': 60, 'app/data': 30, '(root files)': 15, GOVERNANCE: 10, app: 7, 'app/roster': 3 }); assert.deepEqual(Object.keys(t), Object.keys(t).slice().sort((a, b) => t[b] - t[a] || (a < b ? -1 : 1)), 'largest first');
  assert.equal(Object.values(A.bytesByFolder).reduce((a, b) => a + b, 0), A.bytes, 'the folders of the real build add up to its bytes'); assert.ok(A.bytesByFolder['app/src'] > 0 && A.bytesByFolder['render/prototype'] > 0);
});
