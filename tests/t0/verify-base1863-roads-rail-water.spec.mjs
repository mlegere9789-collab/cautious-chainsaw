// Verification pass 4 (roads, railroad, bridges, water, fences) on the 1863 reconstruction.  Report: docs/basemap1863/verification/check4-roads-rail-water.md
// RED BY DESIGN: every F test below is a place where the drawn 1863 network or the water of the committed tiles contradicts a source read in pass 4.
// G tests are guards (they pass) so a reader can see the harness reads the data.
// Data read: docs/basemap1863/PROVENANCE-LAYER/added_features.geojson (the drawn roads), docs/basemap1863/features/roads-rail-water/waterways.geojson and the committed z16 tiles.
// Run: node tests/t0/verify-base1863-roads-rail-water.spec.mjs      (the tile test needs python with numpy and pillow)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FEATS = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/basemap1863/PROVENANCE-LAYER/added_features.geojson'), 'utf8')).features;

// local metric frame (equirectangular around the Diamond; error over 15 km is under 1 m, far below the distances tested)
const LAT0 = 39.8309, LON0 = -77.2311;
const KY = 111195, KX = 111195 * Math.cos(LAT0 * Math.PI / 180);
const xy = ([lon, lat]) => [(lon - LON0) * KX, (lat - LAT0) * KY];
const roads = [];   // {id, pts:[[x,y],...]}
for (const f of FEATS) {
  if (f.properties.cls !== 'ROAD_ADDED') continue;
  const g = f.geometry;
  const lines = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
  for (const l of lines) roads.push({ id: f.properties.id, pts: l.map(xy) });
}
function dPtSeg(p, a, b) {
  const vx = b[0] - a[0], vy = b[1] - a[1], wx = p[0] - a[0], wy = p[1] - a[1];
  const t = Math.max(0, Math.min(1, (vx * wx + vy * wy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy));
}
function dPtLine(p, pts) { let m = Infinity; for (let i = 1; i < pts.length; i++) m = Math.min(m, dPtSeg(p, pts[i - 1], pts[i])); return m; }
// distance from an endpoint to the nearest drawn road of a DIFFERENT id (a junction, not the road's own next piece)
function gapToOthers(road, p) {
  let best = Infinity, who = null;
  for (const r of roads) { if (r.id === road.id) continue; const d = dPtLine(p, r.pts); if (d < best) { best = d; who = r.id; } }
  return [best, who];
}
const ends = (r) => [r.pts[0], r.pts[r.pts.length - 1]];
const LAT_BOX_N = 39.8594;   // north edge of the Battle Studio data box: ends beyond it leave the box and are not judged
const results = [];
function test(id, kind, name, fn) {
  let ok = false, note = '';
  try { const r = fn(); ok = r[0]; note = r[1]; } catch (e) { note = 'ERROR ' + e.message; }
  results.push({ id, kind, name, ok, note });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id} ${kind}  ${name}\n        ${note}`);
}
const MAXGAP = 60;

test('T4-RW-01', 'F', 'Harrisburg Road (RD-007) runs into the borough: its south end is within 60 m of another drawn road (Early advanced on it: OR 27(2) Ewell and Early reports; the Warren sheet draws it on to the Carlisle Road)', () => {
  const pieces = roads.filter(r => r.id === 'RD-007');
  let south = null;
  for (const r of pieces) for (const p of ends(r)) if (!south || p[1] < south[1]) south = p;
  const owner = pieces.find(r => ends(r).includes(south));
  const [d, who] = gapToOthers(owner, south);
  return [d <= MAXGAP, `south end of RD-007 is ${d.toFixed(0)} m from the nearest other drawn road (${who})`];
});
test('T4-RW-02', 'F', 'Mummasburg Road (RD-009) is one connected road from the borough to the north edge (Schurz and Howard reports name the road leading to Mummasburg from Gettysburg)', () => {
  const pieces = roads.filter(r => r.id === 'RD-009');
  const gaps = [];
  for (const r of pieces) for (const p of ends(r)) {
    if (p[1] / KY + LAT0 > LAT_BOX_N) continue;
    const [d, who] = gapToOthers(r, p);
    gaps.push(d);
  }
  const worst = Math.max(...gaps);
  return [worst <= MAXGAP, `${pieces.length} separate RD-009 polylines; inside-box ends are ${gaps.map(g => g.toFixed(0)).join(', ')} m from the next drawn road`];
});
test('T4-RW-03', 'F', 'Granite Schoolhouse Lane (RD-016) links the Taneytown Road with the Baltimore Pike (NPS lane inventory): both ends within 60 m of another drawn road', () => {
  const r = roads.find(x => x.id === 'RD-016');
  const gaps = ends(r).map(p => gapToOthers(r, p)[0]);
  return [Math.max(...gaps) <= MAXGAP, `end gaps ${gaps.map(g => g.toFixed(0)).join(' and ')} m`];
});
test('T4-RW-04', 'F', 'The Diamond is a plain crossing in 1858 (Hopkins inset) and 1868 (Warren): no closed ring road is drawn (RD-024 is the 2013 traffic circle)', () => {
  const r = roads.find(x => x.id === 'RD-024');
  const [a, b] = ends(r);
  const closed = Math.hypot(a[0] - b[0], a[1] - b[1]) < 5;
  let len = 0; for (let i = 1; i < r.pts.length; i++) len += Math.hypot(r.pts[i][0] - r.pts[i - 1][0], r.pts[i][1] - r.pts[i - 1][1]);
  return [!closed, `RD-024 is ${closed ? 'a CLOSED ring' : 'open'}, ${len.toFixed(0)} m long`];
});
test('T4-RW-05', 'G', 'guard: the eight turnpikes and county roads that Official Records routes name all start at the borough centre (Baltimore, Chambersburg, Emmitsburg, Taneytown, Hanover, York, Carlisle, Hagerstown)', () => {
  const dia = xy([-77.2311, 39.8309]);
  const miss = [];
  for (const id of ['RD-001', 'RD-002', 'RD-003', 'RD-004', 'RD-005', 'RD-006', 'RD-008', 'RD-010']) {
    const rs = roads.filter(r => r.id === id);
    const d = Math.min(...rs.map(r => dPtLine(dia, r.pts)));
    if (d > 800) miss.push(`${id} ${d.toFixed(0)} m`);
  }
  return [miss.length === 0, miss.length ? 'not near the Diamond: ' + miss.join(', ') : 'all within 800 m of the Diamond centre (Emmitsburg Road starts at the Baltimore Street fork 740 m south)'];
});

// water: Stevens Run through the borough has no channel in the tiles, while every other named run shows one.
const PY = `
import json, sys, math, numpy as np
from PIL import Image
root = sys.argv[1]
W = 20037508.342789244
def merc(lon, lat):
    x = lon * W / 180.0
    y = math.log(math.tan((90 + lat) * math.pi / 360.0)) * W / math.pi
    return x, y
Z = 16; N = 2 ** Z; S = 2 * W / N
cache = {}
def tile(tx, ty):
    k = (tx, ty)
    if k not in cache:
        p = f'{root}/docs/basemap1863/tiles/{Z}/{tx}/{ty}.webp'
        try: cache[k] = np.asarray(Image.open(p).convert('RGB'), float).mean(2)
        except Exception: cache[k] = None
    return cache[k]
def lum(mx, my):
    px = (mx + W) / S * 512; py = (W - my) / S * 512
    t = tile(int(px // 512), int(py // 512))
    if t is None: return None
    return t[int(py) % 512, int(px) % 512]
d = json.load(open(f'{root}/docs/basemap1863/features/roads-rail-water/waterways.geojson'))
def samples(name, box=None, step=10.0):
    out = []
    for ft in d['features']:
        if ft['properties']['name'] != name: continue
        c = [merc(*p) for p in ft['geometry']['coordinates']]
        for (x0, y0), (x1, y1) in zip(c[:-1], c[1:]):
            L = math.hypot(x1 - x0, y1 - y0); n = max(1, int(L // step))
            for i in range(n):
                x = x0 + (x1 - x0) * i / n; y = y0 + (y1 - y0) * i / n
                lon = x / W * 180.0; lat = math.degrees(2 * math.atan(math.exp(y / W * math.pi)) - math.pi / 2)
                if box and not (box[0] <= lon <= box[2] and box[1] <= lat <= box[3]): continue
                out.append((x, y))
    return out
def frac(S_):
    ok = 0; n = 0
    for x, y in S_:
        c = lum(x, y)
        fl = [lum(x + dx, y + dy) for dx, dy in ((14, 0), (-14, 0), (0, 14), (0, -14))]
        if c is None or any(f is None for f in fl): continue
        cb = min(lum(x + dx, y + dy) for dx in (-4, -2, 0, 2, 4) for dy in (-4, -2, 0, 2, 4))
        n += 1; ok += (np.mean(fl) - cb) >= 10
    return (ok / n if n else float('nan')), n
box = (-77.2415, 39.8225, -77.2236, 39.8335)   # the borough reach of Stevens Run (UTM 308300-309800 E, 4410900-4412100 N)
out = {'Stevens Run (borough reach)': frac(samples('Stevens Run', box))}
for nm in ('Willoughby Run', 'Rock Creek', 'Plum Run', 'Marsh Creek'):
    out[nm] = frac(samples(nm))
print(json.dumps(out))
`;
test('T4-RW-06', 'F', 'Stevens Run is an open stream through and north of the borough on the Warren sheet; in the tiles the NHD line shows a channel for at least 50 percent of its samples, like the other named runs', () => {
  const r = spawnSync('python', ['-c', PY, ROOT], { encoding: 'utf8', timeout: 120000 });
  if (r.status !== 0) throw new Error((r.stderr || '').slice(-400));
  const o = JSON.parse(r.stdout);
  const s = o['Stevens Run (borough reach)'];
  const others = ['Willoughby Run', 'Rock Creek', 'Plum Run', 'Marsh Creek'].map(k => `${k} ${(100 * o[k][0]).toFixed(0)}%`).join(', ');
  return [s[0] >= 0.5, `Stevens Run in the borough: ${(100 * s[0]).toFixed(0)}% of ${s[1]} samples show a channel (darker than the flanks by 10 grey levels); other runs: ${others}`];
});

const failed = results.filter(r => !r.ok && r.kind === 'F').length;
const guardsBad = results.filter(r => !r.ok && r.kind === 'G').length;
console.log(`\n${results.length} tests: ${results.filter(r => r.ok).length} pass, ${failed} F tests fail (red by design), ${guardsBad} guard failures`);
process.exit(failed || guardsBad ? 1 : 0);
