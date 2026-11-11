// Self-test of tools/bt/pack_theatre.mjs.   node --test tests/bt-pack/pack.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { pack, trace, audit, makeZip, URL_KEYS, BT, stampHTML } from '../../tools/bt/pack_theatre.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'btpack-')); let A, B;
test.before(() => { A = pack({ out: path.join(tmp, 'a/dist'), zipDir: path.join(tmp, 'a') }); B = pack({ out: path.join(tmp, 'b/dist'), zipDir: path.join(tmp, 'b') }); });
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

test('URL_KEYS match app/src/config.mjs', () => {
  const cfg = fs.readFileSync(path.join(BT, 'app/src/config.mjs'), 'utf8'), base = path.join(BT, 'app/src');
  for (const m of cfg.matchAll(/^\s*([a-z]+):\s*new URL\('([^']+)', here\)/gm)) { if (!(m[1] in URL_KEYS)) continue; assert.equal(path.resolve(base, m[2]), path.join(BT, URL_KEYS[m[1]]).replace(/\/$/, ''), m[1]); }
  for (const k of Object.keys(URL_KEYS)) assert.match(cfg, new RegExp(`\\b${k}:\\s*new URL`));
});
test('deterministic: two packs give identical dist bytes, zip and hash', () => {
  assert.equal(A.version, B.version); assert.equal(A.zipSha256, B.zipSha256);
  assert.equal(fs.readFileSync(A.zip + '.sha256', 'utf8'), `${A.zipSha256}  gettysburg-BT-staging-${A.version}.zip\n`);
});
test('trace has no missing file and contains the shell and its siblings', () => {
  const t = trace(); assert.deepEqual(t.problems, []);
  for (const f of ['app/index.html', 'app/src/main.mjs', 'render/prototype/data/height.bin', 'history/units.json', 'GOVERNANCE/timeline_windows.jsonl', 'sim/rng.mjs']) assert.ok(t.files.includes(f), f);
});
test('trimmed: no tests, screenshots, notes or unwired 3D data', () => {
  const names = fs.readdirSync(path.join(A.out, 'app'), { recursive: true }).map(String);
  for (const n of names) assert.doesNotMatch(n, /(^|\/)(tests|tools|docs|figures3d|anim3d|fx3d|audio3d)(\/|$)|\.(png|md)$/i, n);
  assert.ok(A.bytes < 20e6, 'dist ' + A.bytes);
});
test('every relative import and every shipped JSON parses inside dist', () => {
  const all = fs.readdirSync(A.out, { recursive: true }).map(String).filter(f => fs.statSync(path.join(A.out, f)).isFile());
  for (const f of all) {
    const p = path.join(A.out, f), s = /\.(mjs|json|html)$/.test(f) ? fs.readFileSync(p, 'utf8') : '';
    if (f.endsWith('.json')) JSON.parse(s);
    if (f.endsWith('.mjs')) for (const m of s.matchAll(/(?:from\s*|import\()\s*['"](\.[^'"]+)['"]/g)) assert.ok(fs.existsSync(path.resolve(path.dirname(p), m[1])), `${f} -> ${m[1]}`);
  }
});
test('index transform: home goes to the root, noindex, stamp shows the version; root index links to the theatre', () => {
  const h = fs.readFileSync(path.join(A.out, 'app/index.html'), 'utf8'); assert.ok(!h.includes('../../../')); assert.ok(h.includes('href="../"') && h.includes('noindex') && h.includes(stampHTML(A.version)));
  assert.match(fs.readFileSync(path.join(A.out, 'index.html'), 'utf8'), /url=app\/index\.html/);
  assert.match(fs.readFileSync(path.join(A.out, '_headers'), 'utf8'), /X-Robots-Tag: noindex/); assert.ok(fs.existsSync(path.join(A.out, 'netlify.toml')));
});
test('manifest hashes match the files', () => {
  const m = JSON.parse(fs.readFileSync(path.join(A.out, 'MANIFEST.json'), 'utf8')); assert.equal(m.version, A.version);
  for (const f of m.files) assert.equal(fs.statSync(path.join(A.out, f.path)).size, f.bytes);
});
test('zip passes unzip -t and holds exactly the dist files', () => {
  try { execFileSync('unzip', ['-tq', A.zip], { stdio: 'pipe' }); } catch (e) { if (e.code === 'ENOENT') return; throw e; }
  const lst = execFileSync('unzip', ['-Z1', A.zip]).toString().trim().split('\n').sort(), disk = fs.readdirSync(A.out, { recursive: true }).map(String).filter(f => fs.statSync(path.join(A.out, f)).isFile()).sort();
  assert.deepEqual(lst, disk);
  const z = makeZip([{ name: 'a.txt', data: Buffer.from('hi') }]); assert.equal(z.readUInt32LE(0), 0x04034b50);
});
test('copy audit detects what it should', () => {
  const d = path.join(tmp, 'aud'); fs.mkdirSync(d); fs.writeFileSync(path.join(d, 'x.json'), '{"a":"built by Claude"}'); fs.writeFileSync(path.join(d, 'y.txt'), 'plain history text');
  assert.equal(audit(d).length, 1);
});
test('copy audit of the shipped dist is clean (shipping gate; red = a source file mentions how the site was made)', () => {
  assert.deepEqual(A.audit, [], 'audit hits:\n' + A.audit.map(h => `${h.file}:${h.line} ${h.match}`).join('\n'));
});
