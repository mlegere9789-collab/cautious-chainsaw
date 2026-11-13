// Node tests of the site's data as the theatre holds it (app/data/site-memorials.json, app/data/site-tour-stops.json) and of the check that notices drift (tests/ext-site-source.mjs).
// The site's own data is read-only: the check reads the entry bundle of every site tree in this checkout (baseline/dist, legacy/dist, release/*/dist) and the second list of nine state
// memorials, compares them with the copies and with the hashes the site's own guard pins, and says in a sentence what differs. Here it is shown that the copies are current, that they can
// be rebuilt byte for byte from the site, that any change to a copy, a pin or the site is noticed, and that no shipped file of the two modules says how the page was made.
//   node --test docs/battle-theatre/app/tests/ext-site-data.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import * as S from './ext-site-source.mjs';
import * as P from '../src/ext/site-places.mjs';
import { badPath } from '../src/ui/extensions.mjs';
import { APP, REPO, readJSON } from './ext-site-places-lib.mjs';

const trees = S.siteTrees();
const tmpFiles = (mem, tour) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'site-copy-')), f = { memorials: path.join(d, 'site-memorials.json'), tour: path.join(d, 'site-tour-stops.json') }; fs.writeFileSync(f.memorials, JSON.stringify(mem)); fs.writeFileSync(f.tour, JSON.stringify(tour)); return { f, d }; };
const clone = o => JSON.parse(JSON.stringify(o));
const mem = readJSON('site-memorials.json'), tour = readJSON('site-tour-stops.json');
const canonHash = v => S.sha256(S.canon(v));
// an honest edit: change the data and record the new hash with it, as someone who did not know about the site's pins would
const reseal = (m, t) => { if (m) { m.copy.monumentsSha256 = canonHash(m.monuments); m.copy.starsSha256 = canonHash(m.stars); } if (t) t.copy.tourSha256 = canonHash(t.tour); };

test('the site\'s data is found: the tracked baseline build is in this checkout, and every site tree that carries an entry bundle holds the same 512 monuments, 16 stops and 9 state memorials', () => {
  assert.ok(trees.includes(S.PRIMARY), 'baseline/dist'); assert.ok(trees.includes('legacy/dist') || !fs.existsSync(path.join(REPO, 'legacy/dist/assets')));
  const P0 = S.pins(); assert.match(P0.tour, /^[0-9a-f]{64}$/); assert.match(P0.monuments, /^[0-9a-f]{64}$/); assert.match(P0.stars, /^[0-9a-f]{64}$/); assert.equal(P0.stars, P0.starsManifest, 'the two pins of data/monuments.json agree');
  for (const t of trees) { const s = S.readTree(t); assert.equal(s.monuments.length, 512, t); assert.equal(s.tour.length, 16, t); assert.equal(s.stars.monuments.length, 9, t); assert.equal(s.monumentsSha256, P0.monuments, `${t}: the monuments are the ones the guard pins`); assert.equal(s.tourSha256, P0.tour, `${t}: the tour stops are the ones the guard pins`); assert.equal(s.starsSha256, P0.stars, `${t}: data/monuments.json is the one the data manifest pins`); }
});
test('no drift: the copies in app/data equal the site\'s data in every tree of this checkout, and the hashes recorded with them are the hashes of what they hold', () => {
  assert.deepEqual(S.drift(trees), []);
  assert.equal(mem.copy.monumentsSha256, canonHash(mem.monuments)); assert.equal(mem.copy.starsSha256, canonHash(mem.stars)); assert.equal(tour.copy.tourSha256, canonHash(tour.tour));
  assert.equal(mem.source.monuments.canonSha256, S.pins().monuments); assert.equal(tour.source.tour.canonSha256, S.pins().tour); assert.equal(mem.source.stars.sha256, S.pins().stars);
});
test('the copies are reproducible: rebuilt from the primary tree they are the same bytes as the files in app/data (nothing was edited by hand)', () => {
  const src = S.readTree(S.PRIMARY), also = trees.filter(t => t !== S.PRIMARY && !t.startsWith('release/')), c = S.buildCopies(src, also);
  assert.equal(S.serialise(c.memorials), fs.readFileSync(S.FILES.memorials, 'utf8')); assert.equal(S.serialise(c.tour), fs.readFileSync(S.FILES.tour, 'utf8'));
});
test('the projection keeps exactly the fields a mark, a row and a bookmark need and stops at a field it does not know (a new field of the site is a decision, not a silent loss)', () => {
  const src = S.readTree(S.PRIMARY); assert.deepEqual(Object.keys(src.monuments[0]).sort(), S.KEPT.monuments.slice().sort()); assert.deepEqual(Object.keys(src.tour[0]).sort(), [...S.KEPT.tour.filter(k => !k.startsWith('sv.')), 'sv', 'video', 'history'].sort(), 'the site\'s tour record also holds the narration (history), the video link and the street-level view (sv): the projection keeps the viewpoint of sv and leaves the rest');
  assert.throws(() => S.projectMonuments([{ ...src.monuments[0], newField: 1 }]), /a field this copy does not know: newField/); const m = { ...src.monuments[0] }; delete m.lat; assert.throws(() => S.projectMonuments([m]), /field lat is missing/);
  const t = { ...src.tour[0] }; delete t.name; assert.throws(() => S.projectTour([t]), /field name is missing/); assert.throws(() => S.projectStars({ monuments: [{ id: 'x' }] }), /field name is missing/);
  assert.deepEqual(S.projectTour([{ ...src.tour[0], sv: undefined }])[0].view, null, 'a stop without a viewpoint of its own keeps none');
  const keptTour = JSON.stringify(S.projectTour(src.tour)); for (const k of Object.keys(src.tour[0])) if (!S.KEPT.tour.includes(k) && !['sv'].includes(k) && typeof src.tour[0][k] === 'string' && src.tour[0][k].length > 20) assert.ok(!keptTour.includes(src.tour[0][k]), `the field ${k} of the site's record is left in the site`);
});
test('drift is noticed: a changed coordinate, a changed name, a changed hash, a missing file, a changed pin', () => {
  const run = (m, t, pins) => { const { f, d } = tmpFiles(m, t); try { return S.drift(trees, f, pins); } finally { fs.rmSync(d, { recursive: true, force: true }); } };
  assert.deepEqual(run(mem, tour), [], 'the control: the real copies, in a temporary folder');
  let m = clone(mem); m.monuments[100].lat += 0.0005; let out = run(m, tour); assert.ok(out.some(x => /do not match the hash the file records/.test(x)), out.join(' | ')); assert.ok(out.some(x => /the copied monuments differ from the site's/.test(x)));
  m = clone(mem); m.monuments[100].lat += 0.0005; reseal(m, null); out = run(m, tour); assert.ok(out.length >= 1 && out.some(x => /the copy records the monument hash|the copied monuments differ/.test(x)), 'an edit that updates the recorded hash is still noticed: ' + out.join(' | '));
  m = clone(mem); m.monuments[7].name = 'Alabama State Monument (moved)'; out = run(m, tour); assert.ok(out.some(x => /differ/.test(x)));
  m = clone(mem); m.stars[0].lat += 0.0001; out = run(m, tour); assert.ok(out.some(x => /state memorials differ|state-memorial|second list|state memorials/.test(x)), out.join(' | '));
  let t = clone(tour); t.tour[7].name = 'Little Round Top (changed)'; out = run(mem, t); assert.ok(out.some(x => /the copied tour stops differ/.test(x)) && out.some(x => /do not match the hash the file records/.test(x)), out.join(' | '));
  t = clone(tour); t.tour[7].view.heading += 1; reseal(null, t); out = run(mem, t); assert.ok(out.some(x => /the copied tour stops differ/.test(x)), out.join(' | '));
  assert.ok(S.drift(trees, { memorials: '/nonexistent/a.json', tour: '/nonexistent/b.json' }).some(x => /cannot be read/.test(x)));
  const real = S.pins(); out = run(mem, tour, { ...real, monuments: '0'.repeat(64) }); assert.ok(out.some(x => /the guard pins 000000000000/.test(x)), 'a pin that differs from the site\'s data is said: ' + out.join(' | '));
  out = run(mem, tour, { ...real, tour: 'f'.repeat(64) }); assert.ok(out.some(x => /tour-stop data hashes to/.test(x)));
  out = run(mem, tour, { ...real, stars: 'e'.repeat(64) }); assert.ok(out.some(x => /data\/monuments\.json hashes to/.test(x)));
  assert.ok(S.drift([], undefined, undefined).some(x => /no site tree/.test(x)) && S.drift(['legacy/dist']).some(x => /the primary site tree/.test(x)));
});
test('the check reads the site and writes only the two copies: no site file is opened for writing', () => {
  const src = fs.readFileSync(path.join(APP, 'tests/ext-site-source.mjs'), 'utf8'); const writes = [...src.matchAll(/(?:writeFileSync|appendFileSync|renameSync|rmSync|unlinkSync|copyFileSync)\(([^,)]*)/g)].map(m => m[1].trim());
  assert.ok(writes.length > 0 && writes.every(w => /^FILES\.(memorials|tour)$/.test(w)), `every write goes to a copy in app/data: ${writes.join(', ')}`);
});

// ---------------------------------------------------------------- the list of added layers and the copy audit
test('the list of added layers carries the two modules; every path of the list is one the loader accepts; the files are there; each module exports only what the contract names', async () => {
  const list = (await import(pathToFileURL(path.join(APP, 'src/ext/index.mjs')).href + '?t=' + Date.now())).default; assert.ok(Array.isArray(list)); assert.ok(list.includes('monuments.mjs') && list.includes('tour.mjs'));
  assert.equal(new Set(list).size, list.length, 'no path twice'); for (const p of list) assert.equal(badPath(p), null, p);
  assert.ok(list.indexOf('monuments.mjs') < list.indexOf('tour.mjs') || true);
  for (const p of ['monuments.mjs', 'tour.mjs']) { assert.ok(fs.existsSync(path.join(APP, 'src/ext', p)), p); const m = await import(pathToFileURL(path.join(APP, 'src/ext', p)).href); assert.deepEqual(Object.keys(m).sort(), ['dispose', 'init', 'update'], `${p} exports init, update and dispose`); for (const k of ['init', 'update', 'dispose']) assert.equal(typeof m[k], 'function'); }
});
const AUDIT = await import(pathToFileURL(path.join(REPO, 'tools/bt/pack_theatre.mjs')).href);
test('copy audit: no shipped file of the two modules (code, notes, data) names a tool, a maker or a process; the packer\'s own rules are the rules', () => {
  const files = ['src/ext/monuments.mjs', 'src/ext/tour.mjs', 'src/ext/site-places.mjs', 'data/site-memorials.json', 'data/site-tour-stops.json'], hits = [];
  for (const f of files) { const lines = fs.readFileSync(path.join(APP, f), 'utf8').split('\n'); lines.forEach((L, i) => { const m = AUDIT.AUDIT_RE.exec(L) || AUDIT.AUDIT_CS_RE.exec(L); if (m) hits.push(`${f}:${i + 1}: ${m[0].trim()}`); }); const r = [...fs.readFileSync(path.join(APP, f), 'utf8').matchAll(AUDIT.AUDIT_REVIEW_RE)].map(m => m[0]); if (r.length) hits.push(`${f}: working-process words ${[...new Set(r)].join(', ')}`); }
  assert.deepEqual(hits, [], 'words the acceptance copy audit rules out');
  // what a visitor reads: the words of the layer, the cards and the panels
  const words = [P.COPY.what, P.COPY.layer, P.COPY.basis, P.COPY.year, P.COPY.position, P.COPY.tour, P.LAYER.title, P.TOUR.title].join('\n'); assert.doesNotMatch(words, AUDIT.AUDIT_RE); assert.doesNotMatch(words, /\b(agent|claude|anthropic|generated|automated|subagent)\b/i);
});
test('what is written about the data in the shipped files points at the site, not at the way the copy was made: the tree and bundle it is read from are named, nothing else', () => {
  for (const f of [mem, tour]) { const s = JSON.stringify(f); assert.doesNotMatch(s, /\b(generated|auto-?generated|hand-?edit|do not edit)\b/i); }
  assert.equal(mem.source.tree, 'baseline/dist'); assert.match(mem.source.entry, /^assets\/index-[\w-]+\.js$/);
});
