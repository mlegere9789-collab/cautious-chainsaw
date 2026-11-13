// Node tests of the site's data as the theatre holds it (app/data/site-memorials.json, app/data/site-tour-stops.json) and of the check that notices drift (tests/ext-site-source.mjs).
// The site's own data is read-only: the check reads the entry bundle of every site tree in this checkout (baseline/dist, legacy/dist, release/*/dist) and the second list of nine state
// memorials, compares them with the copies and with the hashes the site's own guard pins, and says in a sentence what differs. Here it is shown that the copies are current, that they can
// be rebuilt byte for byte from the site, that any change to a copy, a pin or the site is noticed, and that no shipped file of the two modules says how the page was made.
//   node --test docs/battle-theatre/app/tests/ext-site-data.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import * as S from './ext-site-source.mjs';
import * as Y from './ext-site-years.mjs';
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

// ---------------------------------------------------------------- the years some National Park Service reports print
const years = readJSON('site-memorial-years.json'), curation = JSON.parse(fs.readFileSync(Y.CURATION, 'utf8')), haveLib = Y.REPORTS.every(id => Y.readReport(id));
test('the years file is fit against the list and carries the hash of what it holds; the rule that fills it is in the file', () => {
  assert.deepEqual(Y.validateYearsFile(years, mem), []); assert.equal(years.copy.yearsSha256, canonHash(years.years)); assert.match(years.rule, /letter for letter/); assert.deepEqual(Object.keys(years.sources).sort(), ['NPS-CLI-ERR', 'NPS-CLI-LRT', 'NPS-CLI-PCB']);
  const t = clone(years); t.years[3].year += 1; assert.match(Y.validateYearsFile(t, mem).join(' | '), /do not match the hash the file records/); assert.ok(Y.validateYearsFile({}, mem).length);
});
test('the rule on a report text: a memorial is read where the report names it by the site\'s own name and says it was erected; what the rule leaves out is left out with its reason', () => {
  const near = { lat: 39.7910, lng: -77.2362 }, mk = (no, name, o = near) => ({ no, name, ...o });      // inside the area of the Little Round Top report
  const memX = { monuments: [mk(1, 'Alpha State Monument'), mk(2, 'Bravo Infantry Monument'), mk(3, 'Charlie Infantry Monument'), mk(4, 'Charlie Infantry Monument'), mk(5, 'Delta Infantry Monument'), mk(6, 'Echo Infantry Monument', { lat: 39.84, lng: -77.20 }),
    mk(7, 'Foxtrot Infantry Monument'), mk(8, 'Golf Infantry Monument'), mk(9, 'Hotel Infantry Monument'), mk(10, 'India Infantry Monument'), mk(11, 'Juliet Infantry Monument')] };
  const text = lines => `=== PAGE 7 ===\nChronology\n${lines.join('\n')}\nCultural Landscapes Inventory Page\n\n2\n\nof\n\n9\n=== PAGE 8 ===\nmore`;
  const rep = Y.reportFromText('NPS-CLI-LRT', text([
    'CE 1929 Memorialized Monument/marker is erected: Alpha State Monument.',
    'CE 1886 Memorialized Erection of three memorials: Bravo Infantry Monument and Fence; Charlie Infantry Monument; and Delta Infantry Monument Position Marker.',
    'CE 1890 Memorialized Erection of Echo Infantry Monument.',
    'CE 1895 Memorialized The Foxtrot Infantry Monument is relocated into the area.',
    'CE 1888 Memorialized Erection of Golf Infantry Monument (ca.1888-1900).',
    'CE 1888 Memorialized Erection of Hotel Infantry Monument.', 'CE 1891 Memorialized Erection of Hotel Infantry Monument.',
    'CE 1900 Built The Alpha State Monument is repaired.',
    'CE 1880 - 1890 Memorialized In 1880-1890, erection of the India Infantry Monument.',
    'CE 1892 Memorialized The Juliet Infantry Monument is placed within the thicket. The monument is moved ca. 1907.']));
  const { found, left } = Y.deriveYears(memX, [rep], { exclude: [] }), by = n => found.find(f => f.no === n), why = n => left.filter(l => [].concat(l.no).includes(n)).map(l => l.why).join(' | ');
  assert.deepEqual(found.map(f => f.no), [1, 2, 8, 10, 11], 'read: Alpha, Bravo, Golf, India and Juliet');
  assert.deepEqual([by(1).year, by(1).tier, by(1).pdfPage, by(1).printedPage, by(1).quote], [1929, 'documented', 7, 'Page 2 of 9', 'CE 1929 Memorialized Monument/marker is erected: Alpha State Monument']);
  assert.equal(by(2).quote, 'CE 1886 Memorialized Erection of three memorials: Bravo Infantry Monument and Fence', 'the fence is not a second memorial; the quotation stops after the words that belong to the name');
  assert.deepEqual([by(8).year, by(8).yearTo, by(8).approx, by(8).tier], [1888, 1900, true, 'inferred']); assert.match(by(8).quote, /Golf Infantry Monument \(ca\.1888-1900\)$/);
  assert.deepEqual([by(10).year, by(10).yearTo, by(10).tier], [1880, 1890, 'documented'], 'a range the report prints is kept as a range'); assert.deepEqual([by(11).year, by(11).tier], [1892, 'documented'], '"is placed" is an erection');
  assert.match(why(3), /two entries of the site share the name/); assert.match(why(5), /continues the name with words/); assert.match(why(6), /m from the area the report describes/); assert.match(why(9), /different years/);
  for (const n of [3, 4, 5, 6, 7, 9]) assert.ok(!by(n), `no year is read for ${n}`); assert.ok(!left.some(l => [].concat(l.no).includes(7)) && !by(7), 'a relocation is not an erection: the entry is not read at all');
  const withExcl = Y.deriveYears(memX, [rep], { exclude: [{ no: 1, why: 'looked at: a second memorial may share the name' }] }); assert.ok(!withExcl.found.some(f => f.no === 1)); assert.match(withExcl.left.find(l => [].concat(l.no).includes(1)).why, /second memorial may share the name/);
  const file = Y.buildFile(memX, [rep], { sources: [{ id: 'NPS-CLI-LRT', title: 'Report', author: 'National Park Service', date: '2024', url: 'https://example.test/r.pdf' }] }, { exclude: [] }).file; assert.equal(file.years.length, 5); assert.equal(file.sources['NPS-CLI-LRT'].url, 'https://example.test/r.pdf'); assert.deepEqual(Y.validateYearsFile(file, memX), []);
});
test('the years file equals what the saved report texts give, and the texts are the ones it was read from', { skip: !haveLib && 'NOT RUN: the saved report texts (tmp/library/web/nps, local scratch) are not in this checkout; the file was checked for fitness only' }, () => {
  const d = Y.driftYears(years, mem, curation); assert.equal(d.skipped, false); assert.deepEqual(d.problems, []); if (d.notes.length) console.log('# note: the description of a report differs from the web list it was copied from:', d.notes.join('; '));       // a note, not a failure: the web list is another workstream's and may be corrected
  const reports = Y.REPORTS.map(id => Y.readReport(id)), built = Y.buildFile(mem, reports, JSON.parse(fs.readFileSync(Y.SOURCES_META, 'utf8')), curation); assert.deepEqual(built.file.years, years.years, 'the rule makes the same years from the texts, field for field'); assert.equal(built.file.copy.yearsSha256, years.copy.yearsSha256);
  for (const id of Object.keys(years.sources)) { assert.equal(years.sources[id].url, built.file.sources[id].url); assert.equal(years.sources[id].textSha256, built.file.sources[id].textSha256); }
  for (const y of years.years) { const r = reports.find(x => x.id === y.source); assert.ok(r.norm.includes(y.quote), `${y.no} ${y.name}: the quotation is in the text of ${y.source}`); const pg = r.pages.find(p => p.n === y.pdfPage); assert.ok(pg, 'page'); }
  const t = clone(years); t.years[0].year = 1930; assert.match(Y.driftYears(t, mem, curation).problems.join(' | '), /differ from what the saved report texts give/);
  const u = clone(years); u.sources['NPS-CLI-PCB'].textSha256 = '0'.repeat(64); assert.match(Y.driftYears(u, mem, curation).problems.join(' | '), /not the one the file was read from/);
  assert.ok(built.left.every(l => l.why && l.name), 'every name left out has its reason'); assert.ok(built.left.some(l => [].concat(l.no).includes(327)), 'the memorial the curation leaves out is among them');
});
test('without the saved texts the reader says so instead of passing: driftYears reports skipped', () => { const d = Y.driftYears(years, mem, curation, '/nonexistent/library'); assert.equal(d.skipped, true); assert.deepEqual(d.problems, []); });

// ---------------------------------------------------------------- the list of added layers and the copy audit
test('the list of added layers carries the two modules; every path of the list is one the loader accepts; the files are there; each module exports only what the contract names', async () => {
  const list = (await import(pathToFileURL(path.join(APP, 'src/ext/index.mjs')).href + '?t=' + Date.now())).default; assert.ok(Array.isArray(list)); assert.ok(list.includes('monuments.mjs') && list.includes('tour.mjs'));
  assert.equal(new Set(list).size, list.length, 'no path twice'); for (const p of list) assert.equal(badPath(p), null, p);
  for (const p of ['monuments.mjs', 'tour.mjs']) { assert.ok(fs.existsSync(path.join(APP, 'src/ext', p)), p); const m = await import(pathToFileURL(path.join(APP, 'src/ext', p)).href); assert.deepEqual(Object.keys(m).sort(), ['dispose', 'init', 'update'], `${p} exports init, update and dispose`); for (const k of ['init', 'update', 'dispose']) assert.equal(typeof m[k], 'function'); }
});
const AUDIT = await import(pathToFileURL(path.join(REPO, 'tools/bt/pack_theatre.mjs')).href);
test('copy audit: no shipped file of the two modules (code, notes, data) names a tool, a maker or a process; the packer\'s own rules are the rules', () => {
  const files = ['src/ext/monuments.mjs', 'src/ext/tour.mjs', 'src/ext/site-places.mjs', 'data/site-memorials.json', 'data/site-tour-stops.json', 'data/site-memorial-years.json'], hits = [];
  for (const f of files) { const lines = fs.readFileSync(path.join(APP, f), 'utf8').split('\n'); lines.forEach((L, i) => { const m = AUDIT.AUDIT_RE.exec(L) || AUDIT.AUDIT_CS_RE.exec(L); if (m) hits.push(`${f}:${i + 1}: ${m[0].trim()}`); }); const r = [...fs.readFileSync(path.join(APP, f), 'utf8').matchAll(AUDIT.AUDIT_REVIEW_RE)].map(m => m[0]); if (r.length) hits.push(`${f}: working-process words ${[...new Set(r)].join(', ')}`); }
  assert.deepEqual(hits, [], 'words the acceptance copy audit rules out');
  // what a visitor reads: the words of the layer, the cards and the panels
  const words = [P.COPY.what, P.COPY.layer, P.COPY.basis, P.COPY.year, P.COPY.position, P.COPY.tour, P.LAYER.title, P.TOUR.title].join('\n'); assert.doesNotMatch(words, AUDIT.AUDIT_RE); assert.doesNotMatch(words, /\b(agent|claude|anthropic|generated|automated|subagent)\b/i);
});
test('what is written about the data in the shipped files points at the site, not at the way the copy was made: the tree and bundle it is read from are named, nothing else', () => {
  for (const f of [mem, tour, years]) { const s = JSON.stringify(f); assert.doesNotMatch(s, /\b(generated|auto-?generated|hand-?edit|do not edit)\b/i); }
  assert.equal(mem.source.tree, 'baseline/dist'); assert.match(mem.source.entry, /^assets\/index-[\w-]+\.js$/);
});
