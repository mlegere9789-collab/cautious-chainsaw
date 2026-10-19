// Verification pass 6 (anachronism hunt) on the 1863 reconstruction tiles (docs/basemap1863/tiles, z16).
// RED BY DESIGN: every site below is a place where a modern structure, pavement or yard was found still visible in the committed tile.
// Test: share of NEUTRAL-GREY pixels (max-min of R,G,B <= 11, |R-G| <= 7, luma 40..240) inside a disc of radius r px around the site, read from the committed WebP tiles
// only (no NAIP needed).  Natural open ground in the tile pyramid has p99 of this share = 0.018 (4,000 random 120x120 windows, tmp/b1863/check6); a site passes when its share is below that.
// Run: node tests/t0/verify-base1863-anachronism-hunt.spec.mjs      (needs python with numpy and pillow)
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const LIMIT = 0.0184;
const SITES = [
 [
  "H01",
  18712,
  24848,
  35,
  336,
  150,
  "Industrial plant / crushing yard with buildings, conveyors, stockpiles, adjacent US highway + railroad strip, unchanged"
 ],
 [
  "H02",
  18712,
  24857,
  8,
  420,
  260,
  "SE quarry rim and pit: grey rubble, haul-road rings, cut faces partly overpainted by soft green patches"
 ],
 [
  "H03",
  18711,
  24856,
  390,
  262,
  110,
  "Quarry spur: unpaved haul track and spoil in woods"
 ],
 [
  "H04",
  18702,
  24852,
  496,
  229,
  90,
  "Depot/commercial site removed but white-grey blotches and pale hard-edged patches remain on lawn"
 ],
 [
  "H08",
  18713,
  24845,
  127,
  401,
  60,
  "Paved asphalt loop road in hayfield retained"
 ],
 [
  "H09",
  18713,
  24845,
  200,
  359,
  70,
  "Paved asphalt Y-shaped path retained in hayfield"
 ],
 [
  "H10",
  18711,
  24845,
  293,
  263,
  50,
  "Small parking lot with parked cars (red vehicles) retained"
 ],
 [
  "H11",
  18711,
  24847,
  56,
  365,
  60,
  "Fenced gravel/asphalt pad (substation or tank pad) retained with fence outline"
 ],
 [
  "H12",
  18706,
  24843,
  332,
  121,
  60,
  "Fenced lumber/pallet yard with orange stacks, pad remains"
 ],
 [
  "H32",
  18705,
  24849,
  502,
  336,
  70,
  "Motel-type complex: red roof fragments, drive and pool surroundings partly remain"
 ]
];
const py = `
import sys, json, numpy as np
from PIL import Image
root, sites = sys.argv[1], json.loads(sys.argv[2])
out = {}
for sid, x, y, px, py_, r in sites:
    big = np.zeros((1536, 1536, 4), np.uint8)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            p = f'{root}/docs/basemap1863/tiles/16/{x+dx}/{y+dy}.webp'
            try: big[(dy+1)*512:(dy+2)*512, (dx+1)*512:(dx+2)*512] = np.asarray(Image.open(p).convert('RGBA'))
            except FileNotFoundError: pass
    cx, cy = 512 + px, 512 + py_
    a = big[max(cy-r,0):cy+r, max(cx-r,0):cx+r].astype(np.int32)
    R, G, B = a[...,0], a[...,1], a[...,2]
    L = (299*R + 587*G + 114*B) // 1000
    c = np.maximum(np.maximum(R, G), B) - np.minimum(np.minimum(R, G), B)
    n = (c <= 11) & (abs(R-G) <= 7) & (L >= 40) & (L <= 240) & (a[...,3] > 0)
    out[sid] = float(n.mean())
print(json.dumps(out))
`;
const args = SITES.map(([id, x, y, px, py_, r]) => [id, x, y, px, py_, r]);
const res = spawnSync('python', ['-I', '-c', py, ROOT, JSON.stringify(args)], { encoding: 'utf8', maxBuffer: 1 << 24 });
if (res.status !== 0) { console.error(res.stderr); process.exit(2); }
const share = JSON.parse(res.stdout);
let fail = 0;
for (const [id, x, y, px, py_, r, desc] of SITES) {
  const ok = share[id] < LIMIT;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  tile 16/${x}/${y} px(${px},${py_}) r=${r}  neutral share ${share[id].toFixed(4)} (limit ${LIMIT})  ${desc}`);
}
console.log(`${SITES.length - fail} of ${SITES.length} sites clean, ${fail} still show modern material`);
process.exit(fail ? 1 : 0);
