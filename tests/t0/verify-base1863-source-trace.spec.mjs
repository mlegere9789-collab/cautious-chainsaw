// Independent verification pass 1 of 8 of the 1863 reconstruction: SOURCE TRACE.
// Report: docs/basemap1863/verification/check1-source-trace.md.  Static, no browser, no network, no builds: it reads committed catalogue and provenance files only.
// RED BY DESIGN: every V1-xx test pins a defect found on 2026-10-19 and FAILS today; it should pass once the defect is fixed.  G1-xx are green controls (things that were attacked and held).
//
//   node tests/t0/verify-base1863-source-trace.spec.mjs                 run all
//   node tests/t0/verify-base1863-source-trace.spec.mjs --expect-red    exit 0 only while every V1 test is still red (use it to notice a fixed defect)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXPECT_RED = process.argv.includes('--expect-red');
const B = (...p) => path.join(REPO, 'docs', 'basemap1863', ...p);
const fc = (...p) => JSON.parse(fs.readFileSync(B(...p), 'utf8')).features;
const CAT_FILES = [
  'features/roads-rail-water/roads.geojson', 'features/roads-rail-water/lanes.geojson', 'features/roads-rail-water/railways.geojson',
  'features/roads-rail-water/bridges.geojson', 'features/roads-rail-water/fences.geojson', 'features/roads-rail-water/waterways.geojson',
  'features/roads-rail-water/water_features.geojson', 'features/landcover/woods_1863.geojson', 'features/landcover/orchards_1863.geojson',
  'features/landcover/scattered_trees_1863.geojson', 'features/structures/structures.geojson',
];
const cat = new Map();
for (const f of CAT_FILES) for (const x of fc(f)) cat.set(x.properties.id, x.properties);
const added = fc('PROVENANCE-LAYER/added_features.geojson');
const addedById = new Map(added.map((f) => [f.properties.id, f]));
const catUrls = (id) => new Set((cat.get(id)?.sources ?? []).map((s) => s.url));
const isA = (t) => t === 'A1' || t === 'A2';

const tests = [];
const T = (id, sev, title, fn) => tests.push({ id, sev, title, fn });
const must = (cond, msg) => { if (!cond) throw new Error(msg); };

// ---------- V1: defects (red) ----------
T('V1-01', 'high', 'drawn STRUCTURE_ADDED "buildings" that are not building symbols on the Warren plate (lettering, hatching, tree glyph): MAPSYM 0111, 0112, 0113 (lettering ADAM BUTT), 0195 (lettering GEORGE WEIKERT), 0129 (marsh hatching), 0058 (tree glyph)', () => {
  const bad = ['0058', '0111', '0112', '0113', '0129', '0195'].map((n) => `STR-MAPSYM-${n}`).filter((id) => addedById.has(id));
  must(bad.length === 0, `drawn although the plate shows no building there: ${bad.join(', ')} (plate cw0353500 at map_px_cw0325000a through the inverse of plate_cw0353500_to_cw0325000a_homography in structures/evidence/georef_comparison.json)`);
});
T('V1-02', 'medium', 'the modern Lincoln Square roundabout (HOP-S-024, -033, -034, -035 and the ring of RD-024) is drawn as 1858 streets over a plain crossing', () => {
  const bad = ['HOP-S-024', 'HOP-S-033', 'HOP-S-034', 'HOP-S-035'].filter((id) => addedById.has(id));
  must(bad.length === 0, `drawn: ${bad.join(', ')} (four 26-29 m arcs forming a 22 m circle on the Diamond; the Hopkins inset and maps/README.md show a plain crossing, a roundabout today; RD-024 notes say the modern ring is used only to join the radial roads)`);
});
T('V1-03', 'medium', 'HOP-S-029 "East Confederate Avenue" is drawn on the engraved Fahnestock building vignette of the Hopkins inset, not in a street gap (and the name is a park road of the 1890s-1900s)', () => {
  must(!addedById.has('HOP-S-029'), 'HOP-S-029 is drawn; 57 percent of its centreline samples are on dark ink (measured on the Hopkins inset raster, next worst street 23 percent)');
});
T('V1-04', 'medium', 'the provenance layer credits an A1 map sheet to features whose catalogue record does not cite it and for which no map reading exists: RD-023 (0 percent inside the Warren sheet), BR-005 (off-sheet), BR-010 (off-map), BR-011 (unclear)', () => {
  const bad = [];
  for (const id of ['RD-023', 'BR-005', 'BR-010', 'BR-011']) {
    const f = addedById.get(id); if (!f) continue;
    const c = catUrls(id);
    for (const s of f.properties.sources) if (isA(s.type) && !c.has(s.url)) bad.push(`${id}: ${s.url}`);
  }
  must(bad.length === 0, bad.join('; '));
});
T('V1-05', 'low', 'drawn source lists contain URLs that the catalogue record of the same id never cites (144 of 539 source entries; 107 structures, 33 roads, 3 bridges, 1 railway)', () => {
  let miss = 0, tot = 0;
  for (const f of added) { const id = f.properties.id; if (!cat.has(id)) continue; const c = catUrls(id); for (const s of f.properties.sources) { tot++; if (!c.has(s.url)) miss++; } }
  must(miss === 0, `${miss} of ${tot} source entries of drawn features are not in the catalogue record`);
});
T('V1-06', 'low', 'drawn features labelled Documented whose catalogue record lists no A1/A2 source (RL-002 grade; three Documented structures)', () => {
  const bad = [];
  for (const f of added) { const id = f.properties.id; const c = cat.get(id); if (!c || c.confidence !== 'Documented') continue; if (!(c.sources ?? []).some((s) => isA(s.type))) bad.push(id); }
  must(bad.length === 0, bad.join(', '));
});
T('V1-07', 'medium', 'drawn bridges that rest on a class rule only (BR-005 off-sheet, BR-010 off-map, BR-011 unclear) say nothing of it in the drawn record (method reads "bridge point of the catalogue snapped to the road centre line")', () => {
  const bad = [];
  for (const f of added) { const id = f.properties.id; if (f.properties.cls !== 'BRIDGE_ADDED') continue; const sym = cat.get(id)?.period_map_symbol; if (['seen', 'probable'].includes(sym)) continue; if (!/class rule|no map symbol|not read/i.test(f.properties.method)) bad.push(`${id} (${sym})`); }
  must(bad.length === 0, bad.join(', '));
});

// ---------- G1: green controls ----------
T('G1-01', 'control', 'no drawn feature is Unknown confidence, or has present_1863 other than true (the honesty rule holds on the draw list)', () => {
  const bad = added.filter((f) => { const c = cat.get(f.properties.id); return c ? (c.confidence === 'Unknown' || c.present_1863 !== true) : f.properties.confidence === 'Unknown'; }).map((f) => f.properties.id);
  must(bad.length === 0, bad.join(', '));
});
T('G1-02', 'control', 'every non-Hopkins drawn id exists in a catalogue (408) and the 382 Hopkins ids are 334 HOP-B and 48 HOP-S', () => {
  const nonHop = added.filter((f) => !f.properties.id.startsWith('HOP-'));
  const miss = nonHop.filter((f) => !cat.has(f.properties.id)).map((f) => f.properties.id);
  const hopB = added.filter((f) => f.properties.id.startsWith('HOP-B')).length, hopS = added.filter((f) => f.properties.id.startsWith('HOP-S')).length;
  must(miss.length === 0 && nonHop.length === 408 && hopB === 334 && hopS === 48, `missing ${miss.join(',')}; nonHop ${nonHop.length}; HOP-B ${hopB}; HOP-S ${hopS}`);
});
T('G1-03', 'control', 'the 36 drawn fences are exactly the fences with draw:true (the 356 unconfirmed are not drawn)', () => {
  const a = new Set(added.filter((f) => f.properties.cls === 'FENCE_ADDED').map((f) => f.properties.id));
  const d = new Set(fc('features/roads-rail-water/fences.geojson').filter((f) => f.properties.draw).map((f) => f.properties.id));
  must(a.size === 36 && d.size === 36 && [...a].every((i) => d.has(i)), `${a.size} drawn, ${d.size} draw:true`);
});
T('G1-04', 'control', 'every drawn feature carries at least one source with a url and a type A1, A2 or B; every catalogue record has sources', () => {
  const bad = added.filter((f) => !f.properties.sources?.length || f.properties.sources.some((s) => !s.url || !['A1', 'A2', 'B'].includes(s.type))).map((f) => f.properties.id);
  const nosrc = [...cat.entries()].filter(([, p]) => !p.sources?.length).map(([i]) => i);
  must(bad.length === 0 && nosrc.length === 0, `${bad.slice(0, 5)} ${nosrc.slice(0, 5)}`);
});
T('G1-05', 'control', 'no source URL in the catalogues or the provenance layer points to Google, Bing, Maxar or Mapbox', () => {
  const urls = [...[...cat.values()].flatMap((p) => p.sources ?? []).map((s) => s.url), ...added.flatMap((f) => f.properties.sources.map((s) => s.url))];
  const bad = urls.filter((u) => /google|bing|maxar|digitalglobe|mapbox|virtualearth/i.test(u));
  must(bad.length === 0, bad.slice(0, 3).join(', '));
});
T('G1-06', 'control', 'every source host is on the list of public-domain or openly licensed (or fact-only secondary) hosts of the licence table', () => {
  const ok = /^(www\.)?(loc\.gov|tile\.loc\.gov|nps\.gov|irma\.nps\.gov|npshistory\.com|openstreetmap\.org|hydro\.nationalmap\.gov|s3-us-west-2\.amazonaws\.com|hmdb\.org|en\.wikipedia\.org|asylumprojects\.org|gettysburgdaily\.com)$/;
  const hosts = new Set([...[...cat.values()].flatMap((p) => p.sources ?? []).map((s) => s.url), ...added.flatMap((f) => f.properties.sources.map((s) => s.url))].map((u) => new URL(u).hostname));
  const bad = [...hosts].filter((h) => !ok.test(h));
  must(bad.length === 0, bad.join(', '));
});

// ---------- run ----------
let red = 0, green = 0, unexpected = 0;
for (const t of tests) {
  try { t.fn(); console.log(`PASS ${t.id} [${t.sev}] ${t.title}`); green++; if (t.id.startsWith('V1')) unexpected++; }
  catch (e) { console.log(`FAIL ${t.id} [${t.sev}] ${t.title}\n       ${String(e.message).split('\n')[0].slice(0, 400)}`); red++; if (t.id.startsWith('G1')) unexpected++; }
}
console.log(`\n${green} passed, ${red} failed`);
if (EXPECT_RED) process.exit(unexpected === 0 ? 0 : 1);
process.exit(red === 0 ? 0 : 1);
