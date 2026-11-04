// LOD hand-over measurement (render PLAN G4: silhouette change <= 0.5 px and <= 2 L* at the swap) with the software rasteriser. node docs/battle-theatre/app/tools/figures3d-handover.mjs [--quiet]
// Geometry: 1080p, 60 degree vertical field of view: one pixel is 1.069 mm per metre of distance (PLAN section 2), so the orthographic scale is ppm = 935 / d pixels per metre. Each pair of LODs of the same man is
// rendered at the same scale (2 x 2 supersampling), the silhouettes compared (mean boundary displacement = XOR area / perimeter, in target pixels) and the flat-shaded L* of the figure compared (difference of the
// means over the covered pixels = the brightness step the eye sees at a swap; and the mean per-pixel absolute difference). The impostor is compared with the LOD2 mesh through the baked atlas (48 x 64, 8 views).
// Writes data/figures3d/handover.json. Every number is MEASURED on the rasteriser (flat colours, one key light): it is not a measurement of the product shader.
import fs from 'node:fs'; import path from 'node:path';
import { rasterize, shadeOf, bakeImpostor } from '../src/figures3d/raster.mjs';
import { Lstar } from '../src/figures3d/sheet.mjs';
import { sys, lib, pickMan, plain, palOf, lodMeshes, SUBJ, APP, unpackInstance } from './fig-common.mjs';
import { silhouetteOf, silhouetteKey } from '../src/figures3d/library.mjs';

const quiet = process.argv.includes('--quiet'), DIST = [2, 3, 4, 5, 6, 8, 10, 13, 17, 22, 30, 40, 55, 75, 100], SS = 2;
const NAMES = ['union_private', 'iron_brigade', 'zouave_114pa', 'confederate_private', 'officer_sash_sword', 'drummer'];
const stats = (img, W, H, pal) => { let n = 0, per = 0, Ls = 0; const cov = new Uint8Array(W * H), L = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) if (img.mat[k]) { cov[k] = 1; n++; const p = pal[img.mat[k]] || [128, 128, 128], s = shadeOf(img.nx[k], img.ny[k], img.nz[k]); L[k] = Lstar(Math.min(255, p[0] * s * 1.15), Math.min(255, p[1] * s * 1.15), Math.min(255, p[2] * s * 1.15)); Ls += L[k]; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x; if (cov[k] && (x === 0 || y === 0 || x === W - 1 || y === H - 1 || !cov[k - 1] || !cov[k + 1] || !cov[k - W] || !cov[k + W])) per++; }
  return { cov, L, n, per, meanL: n ? Ls / n : 0 }; };
const cmp = (A, B, W, H) => { let xor = 0, abs = 0, both = 0; for (let k = 0; k < W * H; k++) { if (A.cov[k] !== B.cov[k]) xor++; else if (A.cov[k]) { both++; abs += Math.abs(A.L[k] - B.L[k]); } }
  return { err_px: Math.max(xor / Math.max(1, Math.max(A.per, B.per)) / SS, 0), dL_mean: Math.abs(A.meanL - B.meanL), dL_pixel: both ? abs / both : 0 }; };
const res = {};
for (const name of NAMES) {
  const { r } = SUBJ[name](), pal = palOf(r, 0.3), st = unpackInstance(r.words).stature_scale, m = [0, 1, 2].map(l => lodMeshes(r, l));
  const key = silhouetteKey(silhouetteOf(r.variant, r.variant.mask)), imp = sys.impostor(Object.keys ? (() => { const s = silhouetteOf(r.variant, r.variant.mask); return `${s.coat}|${s.hat}|${s.load}|${s.wclass}|${s.flag}|${s.trou}`; })() : ''); void key;
  const rows = [];
  for (const d of DIST) {
    const ppm = 935 / d, W = Math.ceil(1.1 * ppm * 2) + 8, H = Math.ceil(2.1 * st * ppm) + 8, row = { d_m: d, pairs: {} };
    for (const [pairName, yaw] of [['0-1', 0], ['0-1', Math.PI / 2], ['1-2', 0], ['1-2', Math.PI / 2], ['2-imp', 0], ['2-imp', Math.PI / 2]]) {
      const [a, b] = pairName.split('-'), ia = rasterize(m[+a], { w: W * SS, h: H * SS, yaw, ppm: ppm * SS, cy: 0.97 * st, centreXZ: [0, 0] });
      let ib; if (b === 'imp') { // impostor: nearest sampling of the baked atlas view of the LOD2 mesh at this scale
        const view = Math.round(yaw / (Math.PI / 4)) % 8, vw = imp.view_w, vh = imp.view_h, mat = new Uint8Array(W * SS * H * SS), nx = new Int8Array(mat.length), ny = new Int8Array(mat.length), nz = new Int8Array(mat.length);
        const tall = imp.height_m, pp = imp.ppm;
        for (let y = 0; y < H * SS; y++) for (let x = 0; x < W * SS; x++) { const wx = (x + 0.5 - W * SS / 2) / (ppm * SS), wy = 0.97 * st - (y + 0.5 - H * SS / 2) / (ppm * SS), ax = Math.floor(vw / 2 + wx * pp), ay = Math.floor(vh / 2 - (wy - tall / 2) * pp); if (ax < 0 || ay < 0 || ax >= vw || ay >= vh) continue;
          const o = (ay * imp.width + view * vw + ax) * 4, mm = imp.rgba[o]; if (!mm) continue; const k = y * W * SS + x; mat[k] = mm; nx[k] = Math.round((imp.rgba[o + 1] / 255 - 0.5) * 2 * 127); ny[k] = Math.round((imp.rgba[o + 2] / 255 - 0.5) * 2 * 127); nz[k] = Math.round(Math.sqrt(Math.max(0, 1 - (nx[k] / 127) ** 2 - (ny[k] / 127) ** 2)) * 127); }
        ib = { mat, nx, ny, nz }; void tall;
      } else ib = rasterize(m[+b], { w: W * SS, h: H * SS, yaw, ppm: ppm * SS, cy: 0.97 * st, centreXZ: [0, 0] });
      const A = stats(ia, W * SS, H * SS, pal), B = stats(ib, W * SS, H * SS, pal), c = cmp(A, B, W * SS, H * SS), prev = row.pairs[pairName];
      row.pairs[pairName] = prev ? { err_px: Math.max(prev.err_px, c.err_px), dL_mean: Math.max(prev.dL_mean, c.dL_mean), dL_pixel: Math.max(prev.dL_pixel, c.dL_pixel) } : c;
    }
    rows.push(row);
  }
  res[name] = rows; if (!quiet) console.log(name, rows.map(r => r.d_m + 'm:' + ['0-1', '1-2', '2-imp'].map(p => r.pairs[p].err_px.toFixed(2) + '/' + r.pairs[p].dL_mean.toFixed(1)).join(',')).join(' | '));
}
// the hand-over distance of each pair: the smallest distance from which every farther sample of every man and view is within both gates
const GATE = { err_px: 0.5, dL: 2 }, out = { schema: 'figures3d-handover-1', method: 'software rasteriser, flat colour, key light; 1080p 60 degree vertical FOV; ppm = 935 / d; supersample 2; gates err_px <= 0.5 and |mean L* step| <= 2 (PLAN G4); the hand-over distance is the smallest sampled distance at which the gates hold at it and at the next two sampled distances (the hysteresis band)', gate: GATE, distances_m: DIST, subjects: NAMES, handover_m: {}, per_pair_worst_by_distance: {}, per_subject: res };
for (const p of ['0-1', '1-2', '2-imp']) {
  const worst = DIST.map((d, i) => ({ d, err_px: Math.max(...NAMES.map(n => res[n][i].pairs[p].err_px)), dL_mean: Math.max(...NAMES.map(n => res[n][i].pairs[p].dL_mean)), dL_pixel: Math.max(...NAMES.map(n => res[n][i].pairs[p].dL_pixel)) }));
  const ok = w => w.err_px <= GATE.err_px && w.dL_mean <= GATE.dL; let h = null; for (let i = 0; i < DIST.length; i++) { if (ok(worst[i]) && ok(worst[Math.min(i + 1, DIST.length - 1)]) && ok(worst[Math.min(i + 2, DIST.length - 1)])) { h = DIST[i]; break; } }
  out.handover_m[p] = h; out.per_pair_worst_by_distance[p] = worst.map(w => ({ d_m: w.d, err_px: +w.err_px.toFixed(3), dL_mean: +w.dL_mean.toFixed(2), dL_pixel: +w.dL_pixel.toFixed(2) }));
}
fs.writeFileSync(path.join(APP, 'data/figures3d/handover.json'), JSON.stringify(out, null, 1) + '\n');
console.log('hand-over distances (m):', JSON.stringify(out.handover_m));
for (const p of ['0-1', '1-2', '2-imp']) console.log(p, out.per_pair_worst_by_distance[p].map(w => `${w.d_m}m ${w.err_px}px ${w.dL_mean}L*`).join(' | '));
