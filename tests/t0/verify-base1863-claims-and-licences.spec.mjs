// Independent red-team verification (pass 8 of 8) of the 1863 reconstruction: CLAIMS, LICENCES AND SITE IMAGES.
// Report: docs/basemap1863/verification/check8-claims-and-licences.md.  Static, no browser, no network, no builds: it reads committed files and the scratch build
// tmp/b1863/group/R1c/dist (BASE1863 on R1c; tests that need it are skipped when it is absent).
// RED BY DESIGN: every V8-xx test pins a defect found on 2026-10-19 and FAILS today; it should pass once the defect is fixed.  G8-xx are green controls (things that were attacked and held).
//
//   node tests/t0/verify-base1863-claims-and-licences.spec.mjs                 run all
//   node tests/t0/verify-base1863-claims-and-licences.spec.mjs --expect-red    exit 0 only while every V8 test is still red (use it to notice a fixed defect)
//   node tests/t0/verify-base1863-claims-and-licences.spec.mjs --dist <tree>   another BASE1863 tree
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : d; };
const DIST = path.resolve(REPO, opt('dist', 'tmp/b1863/group/R1c/dist'));
const EXPECT_RED = !!opt('expect-red', false);
const R = (...p) => path.join(REPO, ...p);
const read = (...p) => fs.readFileSync(R(...p), 'utf8');
const readJ = (...p) => JSON.parse(read(...p));
const HAVE_DIST = fs.existsSync(path.join(DIST, 'index.html'));

const tests = [];
const T = (id, sev, title, fn, needDist = false) => tests.push({ id, sev, title, fn, needDist });
const must = (cond, msg) => { if (!cond) throw new Error(msg); };

// ---------- V8: defects (red) ----------
T('V8-01', 'medium', 'on-map label names the wrong imagery source (USGS, but the picture is USDA NAIP) and omits the 2013 date', () => {
  const js = read('tools', 't0', 'base1863', 'gtb63.js');
  const label = /const LABEL = "([^"]+)"/.exec(js)?.[1] ?? '';
  must(!/USGS imagery/.test(label), `label says: ${label}`);
  must(/NAIP|USDA/.test(label) && /2013/.test(label), `label does not name the 2013 USDA NAIP photograph: ${label}`);
});
T('V8-02', 'medium', 'the main page still tells visitors the map is "a real satellite map" while the base is a reconstruction', () => {
  const t = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  must(!/real satellite map/i.test(t), 'index.html #seo-content: "...unfold on a real satellite map..."');
}, true);
T('V8-03', 'medium', 'ABOUT.txt and BUILD.md say the Adams County building outlines are "not redistributed" but 16,182 of them are committed with geometry', () => {
  const lic = read('docs', 'basemap1863', 'modern', 'LICENCES.md');
  const buf = zlib.gunzipSync(fs.readFileSync(R('docs', 'basemap1863', 'modern', 'data', 'inventory_features.geojson.gz')));
  const fc = JSON.parse(buf.toString('utf8'));
  const n = fc.features.filter((f) => f.properties.src === 'ADAMS' && f.properties.cls === 'BUILDING' && f.geometry && f.geometry.coordinates).length;
  const claim = /Adams County GIS[^|\n]*not redistributed/i.test(read('docs', 'basemap1863', 'BUILD.md'));
  must(!(claim && n > 0), `BUILD.md section 10 says "not redistributed"; ${n} Adams County building polygons are in modern/data/inventory_features.geojson.gz (LICENCES.md: "ask the county before any wider reuse"); lic mentions it: ${/redistributed/.test(lic)}`);
});
T('V8-04', 'medium', '"Show what was changed" legend does not say what the untinted ground is (PHOTO_KEPT 22 and 0: 2013 photograph, 1863 not verified), the largest classes', () => {
  const js = read('tools', 't0', 'base1863', 'gtb63.js') + read('tools', 't0', 'patches-next', 'BASE1863.json');
  const codes = [...js.matchAll(/\{\\?"code\\?":(\d+),\\?"rgb/g)].map((m) => +m[1]);
  must(codes.includes(22) || /untinted|not tinted|unchanged photograph/i.test(read('tools', 't0', 'patches-next', 'BASE1863.json')), `legend classes: ${[...new Set(codes)].join(',')}; no entry or note for 0/22 (about 14,551 ha outside the Warren sheet + 3,741 ha inside)`);
});
T('V8-05', 'medium', 'SURVIVOR_KEPT (class 21, "real roof pixels kept"): a quarter of its pixels differ from the photograph by more than 6 grey levels, hidden by the pooled 3.6e-05 headline of pass 1', () => {
  const p = readJ('docs', 'basemap1863', 'PROVENANCE-LAYER', 'checks', 'pass1.json').per_class['21'];
  must(p.px_changed_gt6 / p.px <= 0.05, `class 21: ${p.px_changed_gt6} of ${p.px} px changed (${(100 * p.px_changed_gt6 / p.px).toFixed(1)} %), mean abs change ${p.mean_abs_change}`);
});
T('V8-06', 'low', 'BUILD.md contradicts itself on the canopy-removal margin (section 4 and README: 150 m; section 5 CANOPY_REMOVED row: 100 m)', () => {
  const b = read('docs', 'basemap1863', 'BUILD.md');
  const row = /\| CANOPY_REMOVED[^\n]*/.exec(b)?.[0] ?? '';
  must(!/100 m registration margin/.test(row), row);
});
T('V8-07', 'medium', 'every one of 921 source entries of the 790 drawn features is typed A1 (primary), although Bachelder 1876 is typed B in maps/sources.json and Warren 1868-69 is a post-battle survey (A2 at best)', () => {
  const fc = readJ('docs', 'basemap1863', 'PROVENANCE-LAYER', 'added_features.geojson');
  const types = new Set(); let bach = 0;
  for (const f of fc.features) for (const s of f.properties.sources ?? []) { types.add(s.type); if (/Bachelder/.test(s.title)) bach++; }
  const ms = readJ('docs', 'basemap1863', 'maps', 'sources.json');
  const bType = ms.find((m) => /bachelder/.test(m.id)).type;
  must(!(types.size === 1 && types.has('A1') && /^B/.test(bType)), `provenance types used: ${[...types]}; ${bach} Bachelder entries typed A1; maps/sources.json types Bachelder "${bType}"`);
});
T('V8-08', 'medium', 'the 334 Hopkins 1858 building symbols carry a 4 m positional error, below the NAIP absolute spec (6 m CE95) and ignoring the plate\'s nominal symbol size', () => {
  const fc = readJ('docs', 'basemap1863', 'PROVENANCE-LAYER', 'added_features.geojson');
  const hop = fc.features.filter((f) => /^HOP-B-/.test(f.properties.id));
  const e = Math.min(...hop.map((f) => f.properties.positional_error_m));
  must(hop.length > 0 && e >= 6, `${hop.length} Hopkins buildings, positional_error_m = ${e}`);
});
T('V8-09', 'high', 'owner requirement "the site uses only actual images of Gettysburg / no modern imagery": the BASE1863 build still ships the Mapbox satellite style (Walkthrough + 7 sub-pages) and the Google Street View embed', () => {
  const entry = fs.readdirSync(path.join(DIST, 'assets')).filter((f) => /^index-.*\.js$/.test(f)).map((f) => fs.readFileSync(path.join(DIST, 'assets', f), 'utf8')).join('\n');
  const pages = fs.readdirSync(DIST).filter((f) => f.endsWith('.html')).filter((f) => /satellite-v9/.test(fs.readFileSync(path.join(DIST, f), 'utf8')));
  const sat = /satellite-v9/.test(entry), sv = /google\.com\/maps\/embed\/v1\/streetview|streetview\?key=/.test(entry);
  must(!sat && !sv && pages.length === 0, `entry bundle satellite-v9: ${sat}; Street View embed: ${sv}; pages with satellite-v9: ${pages.join(', ')}`);
}, true);
T('V8-10', 'low', 'BUILD.md calls the pyramid "photoreal" although its own section 9 says it is not photoreal at the closest zoom', () => {
  const b = read('docs', 'basemap1863', 'BUILD.md');
  must(!/photoreal tile pyramid/i.test(b), 'BUILD.md section 1: "the photoreal tile pyramid"');
});
T('V8-11', 'low', 'HMDB is listed as "not used" (modern/LICENCES.md, SOURCES-structures.md) but is the only cited basis of the Wheatfield ripe-wheat recolouring (SOURCES-landcover.md S-HMDB-WHEATFIELD)', () => {
  const notUsed = /HMDB[^\n]*(all rights reserved|text)/i.test(read('docs', 'basemap1863', 'modern', 'LICENCES.md'));
  const used = /S-HMDB-WHEATFIELD/.test(read('docs', 'basemap1863', 'SOURCES-landcover.md'));
  must(!(notUsed && used), 'HMDB both "not used" and cited');
});
T('V8-12', 'low', 'SOURCES-structures.md names the Warren sheet cw0353500 a "1:1000 plate" while maps/sources.json and SOURCES-landcover.md give 1:12,000 (1 inch = 1000 ft)', () => {
  must(!/1:1000 Warren plate/.test(read('docs', 'basemap1863', 'SOURCES-structures.md')), '"1:1000 Warren plate"');
});
T('V8-13', 'low', 'IMG ledger says "Nothing is generated, painted or retouched" while the social card has a drawn gradient and title text and the icons a drawn keyline and rounded corners', () => {
  const l = read('docs', 'basemap1863', 'site-images', 'LEDGER.md');
  must(!/Nothing is generated, painted or retouched/.test(l), 'LEDGER.md intro sentence');
});
T('V8-14', 'low', 'credit line shipped in ABOUT.txt says OpenStreetMap is used for "modern-feature lists only" but OSM/TIGER centre lines are the drawn geometry of 1863 roads and the 1858 streets; Wikipedia (CC BY-SA, listed in the table) is missing from the credit line and the map attribution', () => {
  const s = read('docs', 'basemap1863', 'BUILD.md');
  const roads = /1863 roads[^\n]*OSM/i.test(s);
  const about = fs.existsSync(path.join(DIST, 'tiles1863')) ? fs.readdirSync(path.join(DIST, 'tiles1863')).map((v) => fs.readFileSync(path.join(DIST, 'tiles1863', v, 'ABOUT.txt'), 'utf8')).join('\n') : read('tools', 't0', 'base1863', 'stage_assets.py');
  must(!(roads && /modern-feature lists only/.test(about)), 'OSM described as lists only; roads geometry cites OSM');
});

// ---------- G8: green controls ----------
T('G8-01', 'control', 'every IMG file under tools/t0/images/overlay/common has the sha256 of its LEDGER.md row (11 of 11)', () => {
  const l = read('docs', 'basemap1863', 'site-images', 'LEDGER.md');
  let n = 0;
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const base = R('tools', 't0', 'images', 'overlay', 'common');
  for (const f of walk(base)) {
    const h = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
    must(l.includes(h), `${path.relative(base, f)} sha256 ${h} not in LEDGER.md`); n++;
  }
  must(n === 11, `files: ${n}`);
});
T('G8-02', 'control', 'all 932 tiles match their manifest sha256 and the pyramid is under 40 MB', () => {
  const m = readJ('docs', 'basemap1863', 'tiles', 'manifest.json');
  let n = 0, bytes = 0;
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  for (const f of walk(R('docs', 'basemap1863', 'tiles')).filter((x) => x.endsWith('.webp'))) { n++; bytes += fs.statSync(f).size; }
  must(n === m.total_tiles && bytes === m.total_bytes && bytes < 40e6, `${n} tiles ${bytes} bytes`);
});
T('G8-03', 'control', 'no Google/Bing/Maxar/Mapbox host is fetched by the pipeline or the source fetch scripts (urls in code, not prose)', () => {
  const bad = /https?:\/\/[^\s'")]*(google|bing|maxar|digitalglobe|virtualearth|mapbox)[^\s'")]*/i;
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const files = [...walk(R('tools', 'b1863')), ...walk(R('docs', 'basemap1863', 'modern', 'scripts')), ...walk(R('docs', 'basemap1863', 'maps', 'tools'))].filter((f) => f.endsWith('.py'));
  const hits = [];
  for (const f of files) for (const [i, line] of fs.readFileSync(f, 'utf8').split('\n').entries()) if (bad.test(line) && !/^\s*#/.test(line)) hits.push(`${path.relative(REPO, f)}:${i + 1}`);
  must(hits.length === 0, hits.join(', '));
});

// ---------- run ----------
let red = 0, green = 0, skipped = 0, unexpected = 0;
for (const t of tests) {
  if (t.needDist && !HAVE_DIST) { console.log(`SKIP ${t.id} (no tree at ${DIST})`); skipped++; continue; }
  try { t.fn(); console.log(`PASS ${t.id} [${t.sev}] ${t.title}`); green++; if (t.id.startsWith('V8')) unexpected++; }
  catch (e) { console.log(`FAIL ${t.id} [${t.sev}] ${t.title}\n       ${String(e.message).split('\n')[0].slice(0, 400)}`); red++; if (t.id.startsWith('G8')) unexpected++; }
}
console.log(`\n${green} passed, ${red} failed, ${skipped} skipped`);
if (EXPECT_RED) process.exit(unexpected === 0 ? 0 : 1);
process.exit(red === 0 ? 0 : 1);
