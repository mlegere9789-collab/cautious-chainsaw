// Verification pass 2 of 8 on the 1863 reconstruction: GEOREFERENCE ACCURACY.
// Data-only node test (no browser, no network).  Run from the repo root:  node tests/t0/verify-base1863-georeference.spec.mjs
// G2-01..03 are controls (pass).  G2-04..10 are defects found by docs/basemap1863/verification/check2-georeference.md and FAIL by design until fixed.
import fs from 'node:fs';
const R = JSON.parse(fs.readFileSync('docs/basemap1863/verification/check2-results.json', 'utf8'));
const S = JSON.parse(fs.readFileSync('docs/basemap1863/features/structures/structures.geojson', 'utf8')).features;
const A = JSON.parse(fs.readFileSync('docs/basemap1863/PROVENANCE-LAYER/added_features.geojson', 'utf8')).features;
const H = JSON.parse(fs.readFileSync('docs/basemap1863/maps/gcps/hopkins_inset.json', 'utf8')).gcps;
const tests = [];
const T = (id, title, fn) => tests.push({ id, title, fn });
const kx = Math.cos(39.8189 * Math.PI / 180);
const toM = ([lon, lat]) => [lon * Math.PI / 180 * 6378137 * kx, lat * Math.PI / 180 * 6378137];   // local metres, ~0.1 percent over 1 km
const cen = (g) => { const r = g.coordinates[0]; return [r.reduce((a, p) => a + p[0], 0) / r.length, r.reduce((a, p) => a + p[1], 0) / r.length]; };

T('G2-01', 'control: tile pyramid registered to the NAIP mosaic within 0.25 px (118 windows)', () => {
  const m = R.tile_registration.median_shift_px;
  if (Math.abs(m[0]) >= 0.25 || Math.abs(m[1]) >= 0.25) throw new Error('tiles shifted ' + m);
});
T('G2-02', 'control: drawn road ribbons centred on the catalogue line within 3 m (329 cross-sections)', () => {
  if (R.render_fidelity.road_centre_offset_m.max > 3) throw new Error('max ' + R.render_fidelity.road_centre_offset_m.max);
});
T('G2-03', 'control: drawn structures centred on their catalogue footprint within 3 m (433 of 433)', () => {
  const s = R.render_fidelity.structures;
  if (s.with_pixels !== s.n || s.centroid_offset_m.max > 3) throw new Error('structures');
});
T('G2-04', "defect: a road's stated positional_error_m covers the largest measured Warren-road offset (builder frame)", () => {
  const bad = R.roads.road_table.filter((r) => r.stated_error_m != null && r.max_abs_offset_m > r.stated_error_m);
  if (bad.length) throw new Error(bad.map((r) => `${r.catalogue_id} ${r.road}: measured ${r.max_abs_offset_m} m > stated ${r.stated_error_m} m`).join('; '));
});
T('G2-05', 'defect: a survivor marked Documented is not more than 25 m from its own Warren plate symbol', () => {
  const bad = [];
  for (const f of S) {
    const m = /symbol lies (\d+) m/i.exec(f.properties.method || '');
    if (m && +m[1] > 25 && f.properties.confidence === 'Documented') bad.push(`${f.id} ${m[1]} m (positional_error_m ${f.properties.positional_error_m})`);
  }
  if (bad.length) throw new Error(bad.join('; '));
});
T('G2-06', 'defect: at least 80 percent of drawn Hopkins roofs lie inside the control hull of the Hopkins georeference (all carry the same 4 m error)', () => {
  const hp = R.hopkins.control_hull_lonlat;   // convex hull of the 8 Hopkins control points, lon/lat, counter-clockwise (pyproj from the GCP E,N)
  const inside = (p) => hp.every((a, i) => { const b = hp[(i + 1) % hp.length]; return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0; });
  const roofs = A.filter((f) => f.properties.id.startsWith('HOP-B'));
  let n = 0; for (const f of roofs) { const c = cen(f.geometry); if (inside(c)) n++; }
  if (n / roofs.length < 0.8) throw new Error(`only ${n} of ${roofs.length} drawn Hopkins roofs (${(100 * n / roofs.length).toFixed(0)} percent) lie inside the control hull; all carry positional_error_m ${[...new Set(roofs.map((f) => f.properties.positional_error_m))]}`);
});
T('G2-07', 'defect: a Warren town mass is not drawn farther than its stated error from the surviving building it represents (Pennsylvania Hall)', () => {
  const ph = S.find((f) => f.id === 'STR-TOWN-PENN_HALL'), mass = A.find((f) => f.properties.id === 'STR-BORO-MASS-003');
  const a = toM(cen(ph.geometry)), b = toM(cen(mass.geometry)), d = Math.hypot(a[0] - b[0], a[1] - b[1]);
  if (d > mass.properties.positional_error_m) throw new Error(`mass ${d.toFixed(0)} m from Penn Hall (real roof also kept), stated error ${mass.properties.positional_error_m} m`);
});
T('G2-08', 'defect: drawn road width equals the stated class width within 1 m', () => {
  const bad = Object.entries(R.render_fidelity.road_width.stated_vs_drawn_median_m).filter(([w, d]) => Math.abs(d - +w) > 1);
  if (bad.length) throw new Error(bad.map(([w, d]) => `stated ${w} m drawn ${d} m`).join('; '));
});
T('G2-09', 'defect: land-cover frame error at independent control points stays inside the stated 30-40 m (maximum)', () => {
  const f = R.warren_frames.landcover_ffd_vs_25_gcps_m;
  if (f.max > 40) throw new Error(`max ${f.max} m, rms ${f.rms} m, mean bias (E,N) ${f.mean_bias_en} m`);
});
T('G2-10', 'defect: the two Warren georeferences used by the build (maps affine, land-cover FFD) agree within 40 m (rms) over the road network', () => {
  const d = R.warren_frames.affine_minus_ffd_at_45_road_runs_m;
  if (d.rms > 40 || d.median > 40) throw new Error(`rms ${d.rms} m, median ${d.median} m, max ${d.max} m, mean offset (E,N) ${d.mean_en} m`);
});

let fail = 0;
for (const t of tests) {
  try { t.fn(); console.log('PASS', t.id, t.title); } catch (e) { console.log('FAIL', t.id, t.title, '\n     ->', e.message); fail++; }
}
console.log(`${tests.length - fail} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
