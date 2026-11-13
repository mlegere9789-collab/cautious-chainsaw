// Self-test of tools/bt/pack_theatre.mjs.   node --test tests/bt-pack/pack.test.mjs
// Part 1 packs the real tree (docs/battle-theatre). Part 2 packs small made-up trees (tests/bt-pack/fixture.mjs) that hold every kind of load the trace must follow, so the
// rules are proved before the real tree uses them: added modules loaded by computed path, a static section beside the shell, an import map, style-sheet addresses, withheld
// and reduced working files.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';
import { pack, trace, audit, auditReview, makeZip, URL_KEYS, BT, stampHTML, AUDIT_RE, AUDIT_CS_RE, WITHHELD, PROJECT } from '../../tools/bt/pack_theatre.mjs';
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
  for (const f of ['app/data/audio3d/sources.json', 'app/data/audio3d/commands.json', 'app/data/audio3d/calls.json', 'app/data/audio3d/woods-mask.json', 'app/data/anim3d/clips.json', 'app/data/anim3d/gait-sources.json', 'app/data/fx3d/params.json', 'app/data/figures3d/skeleton.json', 'app/data/figures3d/flag-mean-colours.json', 'app/data/conflict-defaults.json', 'app/src/scenario-defaults.mjs']) assert.ok(all.has(f), f);
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
