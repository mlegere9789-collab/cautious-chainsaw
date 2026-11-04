// Builds data/audio3d/woods-mask.json for the sound engine from the repository's 1863 woods layer (docs/basemap1863/features/landcover/woods_1863.geojson).
//   node docs/battle-theatre/app/tools/build-audio3d-woods.mjs
// The layer is a reconstruction from the Warren survey of 1868-69 (positional error 30 to 40 m, woodlot extents as of 1868-69, timber cut in July 1863 not modelled).
// Output: rings in lon/lat (EPSG:4326), simplified with a Douglas-Peucker tolerance far below the layer's own positional error (default 3 m), 5 decimals (about 1 m).
// The engine converts the rings to metres with the app's T.xz(lng, lat), so this file carries no coordinates of the app frame.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), BT = path.resolve(here, '../..'), REPO = path.resolve(BT, '..');
const SRC = path.join(REPO, 'basemap1863/features/landcover/woods_1863.geojson'), OUT = path.join(BT, 'app/data/audio3d/woods-mask.json');
const TOL_M = Number(process.argv[2] || 3);
const src = fs.readFileSync(SRC); const g = JSON.parse(src.toString('utf8'));
const R = 6378137, k = Math.PI / 180;
const toM = (p, lat0) => [R * p[0] * k * Math.cos(lat0 * k), R * p[1] * k];
function dp(pts, tol) {                                    // iterative Douglas-Peucker on a closed ring (first == last), distances in metres
  const lat0 = pts[0][1], m = pts.map((p) => toM(p, lat0)), keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let dmax = 0, im = -1;
    const ax = m[a][0], ay = m[a][1], bx = m[b][0], by = m[b][1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) { let t = L2 ? ((m[i][0] - ax) * dx + (m[i][1] - ay) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(m[i][0] - ax - t * dx, m[i][1] - ay - t * dy); if (d > dmax) { dmax = d; im = i; } }
    if (dmax > tol && im > 0) { keep[im] = 1; stack.push([a, im], [im, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const r5 = (v) => Math.round(v * 1e5) / 1e5;
let nIn = 0, nOut = 0; const polys = [];
for (const f of g.features) {
  const rings = f.geometry.coordinates.map((ring) => { nIn += ring.length; let s = dp(ring, TOL_M); if (s.length < 4) s = ring.length >= 4 ? ring : s; nOut += s.length; return s.map((p) => [r5(p[0]), r5(p[1])]); });
  polys.push({ id: f.properties.id, name: f.properties.name || null, subtype: f.properties.subtype, confidence: f.properties.confidence, rings });
}
const out = {
  _doc: 'Woods mask for the sound engine (woods reverb boost, AUD-G08). Derived from docs/basemap1863/features/landcover/woods_1863.geojson by app/tools/build-audio3d-woods.mjs. Rings are [lon, lat] (EPSG:4326); the first ring of a polygon is the outer boundary, the others are holes. TIER inferred: a reconstruction from the Warren survey of 1868-69 (LC cw0353500), positional error 30 to 40 m (SOURCES-landcover.md), timber cut in July 1863 and regrowth to 1869 are UNKNOWN; outside the Warren sheet nothing is known (treated as open).',
  tier: 'inferred', source: 'docs/basemap1863/features/landcover/woods_1863.geojson', sourceSha256: crypto.createHash('sha256').update(src).digest('hex'),
  simplifyToleranceM: TOL_M, decimals: 5, features: polys.length, verticesBefore: nIn, verticesAfter: nOut,
  polygons: polys,
};
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('woods polygons', polys.length, 'vertices', nIn, '->', nOut, 'bytes', fs.statSync(OUT).size);
