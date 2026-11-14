// Self-test of tools/bt/verify_staging.mjs: the checks that decide "the staging build is honest" are proved on made-up folders and made-up request logs, so that a failure of the real run
// means something. The walk of the real theatre needs a browser, the machine lock and minutes: it is not here. The walk of a static section (a small page set) is, when a browser starts.
//   node --test tests/bt-pack/verify.test.mjs            (the last test starts a browser for a few seconds: run it through tools/horde/bench.sh, or set BT_PACK_NO_BROWSER=1 to skip it)
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { pack, trace, BT } from '../../tools/bt/pack_theatre.mjs';
import { parseHeaders, headersFor, serveDir, logOf, checkManifest, checkZip, checkNoNotes, checkDataPipeline, recordVerdict, checkInternalLinks, readZipDirectory, compareRuns, snapshotTree, SNAPSHOT_EXCLUDE, walk, crawlSections, checkPortableNames, makeShooter } from '../../tools/bt/verify_staging.mjs';
import { makeFixture, FIXTURE_CFG } from './fixture.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'btverify-')); test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
const build = name => { const root = makeFixture(path.join(tmp, name + '-src')); return { root, ...pack({ root, cfg: FIXTURE_CFG, out: path.join(tmp, name, 'dist'), zipDir: path.join(tmp, name) }) }; };
const files = dist => new Set(walk(dist).map(f => '/' + path.relative(dist, f).split(path.sep).join('/')));

test('_headers: rules are read the way Netlify reads them and applied to a path', () => {
  const r = parseHeaders(`# a comment\n/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: public, max-age=0, must-revalidate\n\n/*.mjs\n  Content-Type: text/javascript; charset=utf-8\n/docs/:page\n  X-Page: yes\n`);
  assert.equal(r.length, 3); assert.deepEqual(headersFor(r, '/app/src/main.mjs'), { 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'public, max-age=0, must-revalidate', 'content-type': 'text/javascript; charset=utf-8' });
  assert.deepEqual(Object.keys(headersFor(r, '/app/data/a.json')).sort(), ['cache-control', 'x-robots-tag']); assert.equal(headersFor(r, '/docs/intro')['x-page'], 'yes'); assert.equal(headersFor(r, '/docs/a/b')['x-page'], undefined);
  const packed = build('hdr'); const rules = parseHeaders(fs.readFileSync(path.join(packed.out, '_headers'), 'utf8')); assert.ok(rules.length >= 3, 'the packer\'s own _headers parses'); assert.match(headersFor(rules, '/app/src/main.mjs')['content-type'], /javascript/);
});
test('the server answers 404 for a missing file, records every request (HEAD too) and applies _headers', async () => {
  const packed = build('srv'), s = await serveDir(packed.out);
  try {
    const base = `http://127.0.0.1:${s.port}`, ok = await fetch(base + '/app/src/main.mjs'), gone = await fetch(base + '/app/src/nothing.mjs'), head = await fetch(base + '/app/src/ext/index.mjs', { method: 'HEAD' }), root = await fetch(base + '/');
    assert.equal(ok.status, 200); assert.match(ok.headers.get('content-type'), /javascript/); assert.equal(ok.headers.get('x-robots-tag'), 'noindex, nofollow'); assert.equal(gone.status, 404); assert.equal(head.status, 200); assert.equal(await head.text(), ''); assert.equal(root.status, 200); assert.match(await root.text(), /url=app\/index\.html/);
    const esc = await fetch(base + '/..%2f..%2fetc/passwd'); assert.equal(esc.status, 404, 'no way out of the folder');
    const log = logOf(s.events); assert.equal(log['/app/src/main.mjs'], 200); assert.equal(log['/app/src/nothing.mjs'], 404); assert.equal(log['/app/src/ext/index.mjs'], 200); assert.ok(s.events.some(e => e.m === 'HEAD'));
  } finally { await s.close(); }
});
test('manifest check: a clean dist passes; a changed byte, a missing file and a stray file each fail it', () => {
  const p = build('mf'); assert.deepEqual(checkManifest(p.out).problems, []); assert.equal(checkManifest(p.out).version, p.version);
  const f = path.join(p.out, 'app/data/monuments.json'), keep = fs.readFileSync(f); fs.writeFileSync(f, keep.toString().replace('1', '9')); assert.ok(checkManifest(p.out).problems.some(x => /monuments\.json/.test(x))); fs.writeFileSync(f, keep);
  fs.rmSync(f); assert.ok(checkManifest(p.out).problems.some(x => /listed but missing: app\/data\/monuments\.json/.test(x))); fs.writeFileSync(f, keep);
  fs.writeFileSync(path.join(p.out, 'stray.txt'), 'x'); assert.ok(checkManifest(p.out).problems.some(x => /not in the manifest: stray\.txt/.test(x))); fs.rmSync(path.join(p.out, 'stray.txt')); assert.equal(checkManifest(p.out).ok, true);
});
test('zip check: the zip of a pack matches its dist; a different dist, a damaged .sha256 file and a wrong name each fail it', () => {
  const p = build('zp'), z = checkZip(p.zip, p.out); assert.deepEqual(z.problems, []); assert.equal(z.entries, checkManifest(p.out).files + 1); assert.equal(z.sha256, p.zipSha256);
  assert.equal(readZipDirectory(fs.readFileSync(p.zip)).length, z.entries);
  const f = path.join(p.out, 'app/data/doc-relative.json'), keep = fs.readFileSync(f); fs.writeFileSync(f, '{"a":2}\n'); assert.ok(checkZip(p.zip, p.out).problems.some(x => /doc-relative\.json/.test(x))); fs.writeFileSync(f, keep);
  fs.writeFileSync(path.join(p.out, 'extra.txt'), 'x'); assert.ok(checkZip(p.zip, p.out).problems.some(x => /in the dist, not in the zip: extra\.txt/.test(x))); fs.rmSync(path.join(p.out, 'extra.txt'));
  const side = p.zip + '.sha256', sv = fs.readFileSync(side, 'utf8'); fs.writeFileSync(side, '0'.repeat(64) + '  ' + path.basename(p.zip) + '\n'); assert.ok(checkZip(p.zip, p.out).problems.some(x => /\.sha256 file says/.test(x))); fs.writeFileSync(side, sv);
  const wrong = path.join(path.dirname(p.zip), 'gettysburg-BT-staging-deadbeef.zip'); fs.copyFileSync(p.zip, wrong); fs.copyFileSync(side, wrong + '.sha256'); assert.ok(checkZip(wrong, p.out).problems.some(x => /does not carry the build version/.test(x)));
  const bad = Buffer.from(fs.readFileSync(p.zip)); bad.fill(0, bad.length - 30); fs.writeFileSync(path.join(tmp, 'broken.zip'), bad); assert.ok(checkZip(path.join(tmp, 'broken.zip'), p.out).problems.length > 0);
  assert.equal(checkZip(path.join(tmp, 'absent.zip'), p.out).ok, false);
});
test('link check of the finished folder: every relative import, style-sheet address and link exists; a deleted module and a link out of the folder are found', () => {
  const p = build('lk'); const c = checkInternalLinks(p.out); assert.deepEqual(c.problems, []); assert.ok(c.checked > 10, 'it looked at something: ' + c.checked); assert.deepEqual(c.notes, ['app/src/theatre.mjs: import() of ./missing-optional.mjs (a guarded optional load)'], 'a missing import() target is a note, as in the trace');
  const f = path.join(p.out, 'app/src/shim.mjs'), keep = fs.readFileSync(f); fs.rmSync(f); assert.ok(checkInternalLinks(p.out).problems.some(x => /import map target .*shim\.mjs/.test(x)), 'an import map target'); fs.writeFileSync(f, keep);
  fs.rmSync(path.join(p.out, 'app/img/bg.png')); assert.ok(checkInternalLinks(p.out).problems.some(x => /bg\.png/.test(x)), 'a style-sheet address'); fs.writeFileSync(path.join(p.out, 'app/img/bg.png'), 'x');
  fs.rmSync(path.join(p.out, 'app/src/ext/a.mjs')); fs.writeFileSync(path.join(p.out, 'app/src/x2.mjs'), "import './gone.mjs';\nexport {};\n"); assert.ok(checkInternalLinks(p.out).problems.some(x => /x2\.mjs: import \.\/gone\.mjs/.test(x)));
  fs.writeFileSync(path.join(p.out, 'app/roster/index.html'), '<html><body><a href="../../../">main site</a></body></html>'); assert.ok(checkInternalLinks(p.out).problems.some(x => /leaves the dist/.test(x)));
});

test('no notes in the dist: a README, a source map, a log, a backup or a dot file fails; the dist of a pack passes; a zip comment fails the zip check', () => {
  const p = build('nn'); assert.deepEqual(checkNoNotes(p.out).problems, []);
  for (const f of ['README.md', 'app/src/main.mjs.map', 'app/notes.txt', 'app/data/old.json.bak', '.hidden', 'app/debug.log']) { fs.writeFileSync(path.join(p.out, f), 'x'); assert.ok(checkNoNotes(p.out).problems.some(x => x.endsWith(f)), f); fs.rmSync(path.join(p.out, f)); }
  assert.equal(checkNoNotes(p.out).ok, true);
  const buf = Buffer.from(fs.readFileSync(p.zip)), withComment = Buffer.concat([buf.subarray(0, buf.length - 2), Buffer.from([4, 0]), Buffer.from('note')]); fs.writeFileSync(path.join(tmp, 'commented.zip'), withComment); fs.copyFileSync(p.zip + '.sha256', path.join(tmp, 'commented.zip.sha256'));
  assert.ok(checkZip(path.join(tmp, 'commented.zip'), p.out).problems.some(x => /carries a comment/.test(x)));
});
test('data pipeline in node: the loaders of the real shell run from the packed dist alone; a missing data file is found and named', () => {
  const real = pack({ out: path.join(tmp, 'real-pipe/dist'), zipDir: path.join(tmp, 'real-pipe'), zip: false }), ok = checkDataPipeline(real.out);
  assert.deepEqual(ok.problems, [], ok.problems.join('; ')); assert.ok(ok.requests > 20, 'it read the data: ' + ok.requests); assert.ok(ok.steps.some(x => /real history layer.*"units":\d+/.test(x)), ok.steps.join(' | '));
  fs.rmSync(path.join(real.out, 'history/units.json')); fs.rmSync(path.join(real.out, 'app/data/site-bookmarks.json'), { force: true });
  const bad = checkDataPipeline(real.out); assert.equal(bad.ok, false); assert.ok(bad.problems.some(x => /history\/units\.json/.test(x)), bad.problems.join('; '));
});
test('what a run leaves in deliver/bt-staging: a failed run touches nothing but LAST-VERIFY.txt; a passing run replaces dist (copy, swap) and copies the trace report', () => {
  const a = build('rv-a'), home = path.join(tmp, 'rv-home'); fs.mkdirSync(path.join(home, 'dist'), { recursive: true }); fs.writeFileSync(path.join(home, 'dist/OLD.txt'), 'older build');
  const rep = { when: '2026-11-13T00:00:00Z', static: { manifest: { version: a.version } }, ok: false, walkOk: true, official: true, auditHits: 3 };
  let r = recordVerdict({ home, dist: a.out, zip: a.zip, rep, failures: ['copy audit: 3 hit(s)'] }); assert.equal(r.published, false); assert.ok(fs.existsSync(path.join(home, 'dist/OLD.txt')), 'the older dist is untouched');
  let note = fs.readFileSync(path.join(home, 'LAST-VERIFY.txt'), 'utf8'); assert.match(note, /NOT ACCEPTABLE/); assert.match(note, /walk and comparison: passed; copy audit hits: 3/); assert.match(note, /was NOT touched/); assert.match(note, /copy audit: 3 hit/);
  rep.ok = true; rep.auditHits = 0; r = recordVerdict({ home, dist: a.out, zip: a.zip, rep }); assert.equal(r.published, true);
  assert.ok(!fs.existsSync(path.join(home, 'dist/OLD.txt')), 'the older dist is gone'); assert.deepEqual(checkManifest(path.join(home, 'dist')).problems, []); assert.equal(checkManifest(path.join(home, 'dist')).version, a.version); assert.ok(!fs.existsSync(path.join(home, 'dist.new')), 'no half-written folder is left');
  assert.ok(fs.existsSync(path.join(home, 'trace-report.json')), 'the trace report is copied beside it'); note = fs.readFileSync(path.join(home, 'LAST-VERIFY.txt'), 'utf8'); assert.match(note, /STAGING VERIFIED/); assert.match(note, /was refreshed/);
  rep.ok = true; r = recordVerdict({ home, dist: a.out, zip: a.zip, rep, publish: false }); assert.equal(r.published, false, 'publish can be switched off');
});
// ---- the comparison of the two runs
const base = () => ({ log: { '/app/index.html': 200, '/app/src/main.mjs': 200, '/app/data/a.json': 200 }, errors: [], failed: [], entered: true, info: { sound: true }, steps: [{ name: 'sound starts', ok: true }, { name: 'play at 2x', ok: true }], ext: { index: 'read', modules: [{ path: 'monuments.mjs', state: 'running' }] }, crawl: { pages: [] } });
const D = new Set(['/app/index.html', '/app/src/main.mjs', '/app/data/a.json', '/app/data/b.json', '/index.html']);
test('compare: the same walk at both ends is verified', () => { const r = compareRuns(base(), base(), D); assert.equal(r.ok, true, r.failures.join('; ')); assert.deepEqual(r.failures, []); });
test('compare: a 404 in the packed site fails; so does a request the browser could not make (an aborted one does not)', () => {
  const A = base(); A.log['/app/data/c.json'] = 404; let r = compareRuns(A, base(), D); assert.equal(r.ok, false); assert.match(r.failures[0], /404 \/app\/data\/c\.json/);
  const A2 = base(); A2.failed = [{ url: '/app/data/a.json', failure: 'net::ERR_CONNECTION_RESET' }]; assert.equal(compareRuns(A2, base(), D).ok, false);
  const A3 = base(); A3.failed = [{ url: '/app/data/a.json', failure: 'net::ERR_ABORTED' }]; assert.equal(compareRuns(A3, base(), D).ok, true);
});
test('compare: a URL the source run loaded that the dist does not hold fails, a directory address is answered by its index page, a 404 at the source is not required in the dist', () => {
  const B = base(); B.log['/app/data/never-shipped.json'] = 200; let r = compareRuns(base(), B, D); assert.equal(r.ok, false); assert.deepEqual(r.missingInDist, ['/app/data/never-shipped.json']);
  const B2 = base(); B2.log['/app/roster/'] = 200; assert.deepEqual(compareRuns(base(), B2, new Set([...D, '/app/roster/index.html'])).missingInDist, []); assert.deepEqual(compareRuns(base(), B2, D).missingInDist, ['/app/roster/']);
  const B3 = base(); B3.log['/withheld/entry.md'] = 404; assert.equal(compareRuns(base(), B3, D).ok, true);
});
test('compare: an error only in the packed site fails; one at both ends is a note about the product', () => {
  const A = base(), B = base(); A.errors = [{ kind: 'console', text: 'Failed to load resource: the server responded with a status of 404 (http://127.0.0.1:1234/x.json)' }]; let r = compareRuns(A, B, D); assert.equal(r.ok, false); assert.equal(r.errorsOnlyInDist.length, 1);
  B.errors = [{ kind: 'console', text: 'Failed to load resource: the server responded with a status of 404 (http://127.0.0.1:9999/x.json)' }]; r = compareRuns(A, B, D); assert.equal(r.ok, true); assert.equal(r.errorsInBoth.length, 1); assert.ok(r.notes.some(n => /source run too/.test(n)));
});
test('compare: steps, sound and the added layers must agree between the two runs', () => {
  let A = base(), B = base(); A.steps[1] = { name: 'play at 2x', ok: false, error: 'boom' }; let r = compareRuns(A, B, D); assert.equal(r.ok, false); assert.match(r.failures[0], /play at 2x/);
  B.steps[1] = { name: 'play at 2x', ok: false, error: 'boom' }; r = compareRuns(A, B, D); assert.equal(r.ok, true); assert.ok(r.notes.some(n => /failed in both runs/.test(n)));
  A = base(); B = base(); A.info.sound = false; r = compareRuns(A, B, D); assert.equal(r.ok, false); B.info.sound = false; assert.equal(compareRuns(A, B, D).ok, true);
  A = base(); B = base(); A.ext.modules[0].state = 'failed'; r = compareRuns(A, B, D); assert.equal(r.ok, false); assert.match(r.failures[0], /monuments\.mjs: failed in the packed site, running at the source/);
  A = base(); A.entered = false; assert.equal(compareRuns(A, base(), D).ok, false);
});
test('compare: every page of a static section must load, and a page the source walk reached must be reached in the packed site', () => {
  const A = base(), B = base(); A.crawl.pages = [{ url: '/app/roster/index.html', status: 200 }, { url: '/app/roster/units.html', status: 404 }]; B.crawl.pages = [{ url: '/app/roster/index.html', status: 200 }, { url: '/app/roster/units.html', status: 200 }, { url: '/app/roster/more.html', status: 200 }];
  const r = compareRuns(A, B, D); assert.equal(r.ok, false); assert.ok(r.failures.some(f => /did not load in the packed site \(404\).*units\.html/.test(f))); assert.ok(r.failures.some(f => /visited at the source and not in the packed site.*more\.html/.test(f)));
});

test('snapshot: the copy leaves out the folders no page can load and keeps the rest', () => {
  const src = path.join(tmp, 'snap-src'), put = (r, t) => { const p = path.join(src, r); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t); };
  put('app/index.html', 'x'); put('app/src/a.mjs', 'x'); put('app/tests/big.png', 'x'); put('rosters/data/huge.json', 'x'); put('rosters/data2/small.json', 'x'); put('terrain/h.bin', 'x'); put('GOVERNANCE/a.json', 'x');
  const dst = snapshotTree(src, path.join(tmp, 'snap-dst')), got = walk(dst).map(f => path.relative(dst, f).split(path.sep).join('/')).sort();
  assert.deepEqual(got, ['GOVERNANCE/a.json', 'app/index.html', 'app/src/a.mjs', 'rosters/data2/small.json']); assert.ok(SNAPSHOT_EXCLUDE.includes('rosters/data') && !SNAPSHOT_EXCLUDE.includes('rosters/data2'), 'the new roster data (rosters/data2) is kept');
});

test('snapshot of the real tree: leaving out the folders of SNAPSHOT_EXCLUDE loses no file the packer ships (same file list as the tree itself), and the trace of the copy has no problem', () => {
  const snap = snapshotTree(BT, path.join(tmp, 'real-snap/bt')), a = trace({ root: snap }), b = trace({ root: BT });
  assert.deepEqual(a.problems, []); assert.deepEqual(a.files, b.files, 'the same files are traced in the copy and in the tree: ' + JSON.stringify({ onlyCopy: a.files.filter(f => !b.files.includes(f)), onlyTree: b.files.filter(f => !a.files.includes(f)) }));
  fs.rmSync(snap, { recursive: true, force: true });
});
// ---- names the owner's machine can unpack
test('portable names: the dist of a pack passes (the made-up site and the real tree); a device name, a trailing dot or space, a character a URL cannot carry, two paths that differ only by letter case and a very long path each fail', () => {
  const p = build('pn'); assert.deepEqual(checkPortableNames(p.out).problems, []); assert.ok(checkPortableNames(p.out).checked > 10);
  const real = pack({ out: path.join(tmp, 'pn-real/dist'), zipDir: path.join(tmp, 'pn-real'), zip: false }); assert.deepEqual(checkPortableNames(real.out).problems, [], 'every name of the real build is portable'); assert.equal(checkPortableNames(real.out).checked, real.files);
  const bad = (rel, re, o) => { const d = fs.mkdtempSync(path.join(tmp, 'pn-')); for (const r of [].concat(rel)) { const f = path.join(d, r); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, 'x'); } const r = checkPortableNames(d, o); assert.equal(r.ok, false, String(rel)); assert.ok(r.problems.some(x => re.test(x)), `${rel}: ${r.problems.join(' | ')}`); };
  bad('app/data/CON.json', /device name/); bad('app/data/aux', /device name/); bad('app/data/nul.tar.gz', /device name/); bad('app/data/COM3.txt', /device name/); bad('app/data/trail.', /ends in a dot or a space/); bad('app/data/gap ', /ends in a dot or a space/);
  for (const c of ['what?.json', 'a#b.json', '50%.json', 'q"x.json', 'a<b.json', 'p|q.json', 'a:b.json', 'st*r.json']) bad('app/data/' + c, /cannot carry/);
  bad(['app/data/Case.json', 'app/data/case.json'], /differ only by letter case/); bad('app/' + 'x'.repeat(160) + '.json', /longer than 150/); bad('app/data/ab.json', /longer than 8/, { maxPath: 8 });
  const ok = fs.mkdtempSync(path.join(tmp, 'pn-')); for (const r of ['app/data/figures3d/flag-mean-colours.json', 'rosters/data2/union/ma/1st-massachusetts-infantry.flags.json.gz', 'app/src/ext/vegetation/index.mjs', 'a.b-c_d/e+f.json']) { const f = path.join(ok, r); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, 'x'); } assert.deepEqual(checkPortableNames(ok).problems, [], 'plain names, dots inside a name, a plus sign and the long roster names pass');
});

// ---- the pictures of a walk (mock page: no browser)
const mockPage = (o = {}) => { const bound = {}; return { bound, async exposeFunction(name, fn) { if (o.noExpose) throw new Error('bindings are not available'); bound[name] = fn; }, async screenshot({ path: p }) { if (o.fail) throw new Error('boom'); if (o.slow) await new Promise(r => setTimeout(r, 400)); fs.writeFileSync(p, Buffer.from('89504e470d0a1a0a', 'hex')); } }; };
test('pictures: one numbered PNG per request (from the page and from outside), a failing or slow screenshot is listed and never throws, no folder means no pictures', async () => {
  const said = [], sink = { print: s => said.push(s) }, dir = path.join(tmp, 'shots'), sh = makeShooter(dir, 'dist', sink), page = mockPage();
  assert.equal(await sh.install(page), true); assert.equal(typeof page.bound.__verifyShot, 'function', 'the page calls window.__verifyShot(name)');
  await page.bound.__verifyShot('3 July 13:30 overview'); await sh.take(page, 'landing page'); await page.bound.__verifyShot('Fly to a unit, the soldiers close up!');
  assert.deepEqual(fs.readdirSync(dir).sort(), ['dist-01-3-july-13-30-overview.png', 'dist-02-landing-page.png', 'dist-03-fly-to-a-unit-the-soldiers-close-up.png']);
  assert.equal(sh.list.length, 3); assert.ok(sh.list.every(x => x.file && x.bytes === 8)); assert.ok(said.some(s => /picture dist-01-/.test(s)));
  const bad = makeShooter(path.join(tmp, 'shots2'), 'source', sink, { limitMs: 60 }); assert.equal(await bad.take(mockPage({ fail: true }), 'x'), null); assert.equal(await bad.take(mockPage({ slow: true }), 'y'), null);
  assert.equal(bad.list.length, 2); assert.ok(bad.list.every(x => x.file === null && x.error)); assert.match(bad.list[0].error, /boom/); assert.match(bad.list[1].error, /no picture within/);
  const none = makeShooter(null, 'dist', sink); assert.equal(await none.install(mockPage()), false); assert.equal(await none.take(mockPage(), 'z'), null); assert.deepEqual(none.list, []);
  const off = makeShooter(path.join(tmp, 'shots3'), 'dist', sink); assert.equal(await off.install(mockPage({ noExpose: true })), false); assert.ok(said.some(s => /pictures of the walk are off/.test(s)));
});
test('the walk keeps its pictures and its sound: a picture at each step that shows something, and the sound started with the button of Settings before the call of the audio host', () => {
  const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../tools/bt/verify_staging.mjs'), 'utf8');
  assert.deepEqual([...src.matchAll(/await shot\('([^']+)'\)/g)].map(m => m[1]), ['3 July 13:30 overview', 'fly to a unit, the soldiers close up', '3 July 04:30 dawn', '3 July 19:30 dusk', '3 July 23:00 night', '4 July 15:00 rain', 'a unit selected', 'every added layer on']);
  const i = src.indexOf("step('sound starts'"), j = src.indexOf("step('3 July 13:30'"); const body = src.slice(i, j); assert.ok(i > 0 && j > i);
  assert.ok(body.indexOf('#sd-start') > 0 && body.indexOf('#sd-start') < body.indexOf('th.audio.start()'), 'the button first, then the call that joins the start'); assert.match(body, /data-panel="settings"/);
});

// ---- the walk of a static section, in a real browser (skipped when no browser starts)
test('section walk: every page is visited, links inside the section are followed, a dead link is reported, other sites are left alone', async t => {
  if (process.env.BT_PACK_NO_BROWSER) return t.skip('BT_PACK_NO_BROWSER is set: no browser is started (run it through tools/horde/bench.sh to include this test)');
  let br; try { const { chromium } = await import('../../node_modules/playwright-core/index.mjs'); try { br = await chromium.launch({ channel: 'chrome', headless: true }); } catch { br = await chromium.launch({ headless: true }); } } catch (e) { return t.skip('no browser starts here: ' + e.message.split('\n')[0]); }
  const root = makeFixture(path.join(tmp, 'walk-src')); fs.writeFileSync(path.join(root, 'app/roster/units.html'), '<!doctype html><html><head><meta charset="utf-8"><title>U</title></head><body><a href="index.html">Back</a> <a href="gone.html">dead</a> <a href="https://example.invalid/x.html">other site</a> <a href="../index.html">the shell</a> <button type="button" id="b">press</button></body></html>');
  const s = await serveDir(root); try {
    const ctx = await br.newContext(), sink = { errors: [], failed: [], origin: `http://127.0.0.1:${s.port}`, print: () => { } };
    const c = await crawlSections(ctx, sink.origin, [{ path: 'app/roster', pages: ['app/roster/index.html'] }], sink, { max: 10 }), by = Object.fromEntries(c.pages.map(p => [p.url, p.status]));
    assert.equal(by['/app/roster/index.html'], 200); assert.equal(by['/app/roster/units.html'], 200, 'found by following the link of the first page'); assert.equal(by['/app/roster/gone.html'], 404, 'the dead link is visited and reported'); assert.ok(!('/app/index.html' in by), 'a link out of the section is not followed');
    assert.ok(c.interactions.some(x => /units\.html: pressed control 1/.test(x)), 'the control was pressed'); const log = logOf(s.events); assert.equal(log['/app/roster/roster.js'], 200); assert.equal(log['/app/roster/gone.html'], 404);
  } finally { await s.close(); await br.close(); }
});
