// ILLUSTRATION, not the renderer: the real level-of-detail meshes of one man (a Union private), drawn by the figures3d software rasteriser (flat colours, one key light, no supersampling) at the pixel scale of 1080p at 60 degrees
// at the distance d (ppm = 935 / d), and the dither of lod.mjs applied to the two pictures pixel by pixel with the JavaScript port of the shader (ditherNumber): a pixel shows the finer level where n < share and the coarser one
// where n >= share, the two ranges partitioning [0, 1) as in the product. It shows what the cross-fade does to the real meshes at 10, 13 and 75 m (the silhouette that does not match, the brightness that does not match, the
// grain of the dither), in node, with no GPU. It does NOT run the WebGL2 or WebGPU shaders: tests/crowd-lod-lab.mjs and tests/crowd-lod-shots.mjs do that.
//   node docs/battle-theatre/app/tests/crowd-lod-sheet.mjs <outDir>
// Output: <outDir>/sheet-10m.png (level 0 -> level 1), sheet-13m.png (level 1 -> level 2), sheet-75m.png (level 2 -> baked impostor): the finer share 1, 3/4, 1/2, 1/4, 0 from left to right, enlarged by nearest neighbour.
import fs from 'node:fs'; import path from 'node:path';
import { rasterize, shadeOf } from '../src/figures3d/raster.mjs';
import { silhouetteOf } from '../src/figures3d/library.mjs';
import { sys, SUBJ, palOf, lodMeshes, unpackInstance } from '../tools/fig-common.mjs';
import { encodePng } from './weather3d-gpu-lib.mjs';
import { ditherNumber } from '../src/crowd/lod.mjs';

const out = path.resolve(process.argv[2] || '.'); fs.mkdirSync(out, { recursive: true });
const { r } = SUBJ.union_private(), pal = palOf(r, 0.3), st = unpackInstance(r.words).stature_scale, meshes = [0, 1, 2].map(l => lodMeshes(r, l)), FIG = 1234;
const s0 = silhouetteOf(r.variant, r.variant.mask), imp = sys.impostor(`${s0.coat}|${s0.hat}|${s0.load}|${s0.wclass}|${s0.flag}|${s0.trou}`);
const rgb = (img, k) => { const p = pal[img.mat[k]] || [128, 128, 128], s = shadeOf(img.nx[k], img.ny[k], img.nz[k]); return [Math.min(255, p[0] * s * 1.15), Math.min(255, p[1] * s * 1.15), Math.min(255, p[2] * s * 1.15)]; };
const BG = [150, 168, 196];
function impostorImage(W, H, ppm, yaw) {      // the baked view of the low mesh at this scale, nearest sampling of the 48 x 64 atlas (the way the handover tool compares it)
  const view = Math.round(yaw / (Math.PI / 4)) % 8, vw = imp.view_w, vh = imp.view_h, mat = new Uint8Array(W * H), nx = new Int8Array(W * H), ny = new Int8Array(W * H), nz = new Int8Array(W * H), tall = imp.height_m, pp = imp.ppm;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const wx = (x + 0.5 - W / 2) / ppm, wy = 0.97 * st - (y + 0.5 - H / 2) / ppm, ax = Math.floor(vw / 2 + wx * pp), ay = Math.floor(vh / 2 - (wy - tall / 2) * pp); if (ax < 0 || ax >= vw || ay < 0 || ay >= vh) continue;
    const o = (ay * imp.width + view * vw + ax) * 4, mm = imp.rgba[o]; if (!mm) continue; const k = y * W + x; mat[k] = mm; nx[k] = Math.round((imp.rgba[o + 1] / 255 - 0.5) * 2 * 127); ny[k] = Math.round((imp.rgba[o + 2] / 255 - 0.5) * 2 * 127); nz[k] = Math.round(Math.sqrt(Math.max(0, 1 - ((imp.rgba[o + 1] / 255 - 0.5) * 2) ** 2 - ((imp.rgba[o + 2] / 255 - 0.5) * 2) ** 2)) * 127); }
  return { mat, nx, ny, nz };
}
const SHARES = [1, 0.75, 0.5, 0.25, 0];
for (const [d, a, b, zoom, name] of [[10, 0, 1, 3, 'sheet-10m'], [13, 1, 2, 3, 'sheet-13m'], [75, 2, 'imp', 8, 'sheet-75m']]) {
  const ppm = 935 / d, W = Math.ceil(1.1 * ppm * 2) + 8, H = Math.ceil(2.1 * st * ppm) + 8, yaw = Math.PI / 4;       // a three-quarter view: the two silhouettes are least alike from the side
  const A = rasterize(meshes[a], { w: W, h: H, yaw, ppm, cy: 0.97 * st, centreXZ: [0, 0] }), B = b === 'imp' ? impostorImage(W, H, ppm, yaw) : rasterize(meshes[b], { w: W, h: H, yaw, ppm, cy: 0.97 * st, centreXZ: [0, 0] });
  const tw = W * zoom, th = H * zoom, tile = new Uint8Array(tw * SHARES.length * th * 4);
  SHARES.forEach((share, t) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x, n = ditherNumber(FIG, x + 0.5, y + 0.5); let c = BG; if (A.mat[k] && n < share) c = rgb(A, k); else if (B.mat[k] && n >= share) c = rgb(B, k);
    for (let zy = 0; zy < zoom; zy++) for (let zx = 0; zx < zoom; zx++) { const o = (((y * zoom + zy) * SHARES.length + t) * tw + x * zoom + zx) * 4; tile[o] = c[0]; tile[o + 1] = c[1]; tile[o + 2] = c[2]; tile[o + 3] = 255; } } });
  const cov = img => { let n = 0; for (let k = 0; k < W * H; k++) if (img.mat[k]) n++; return n; }, both = (() => { let n = 0, x = 0; for (let k = 0; k < W * H; k++) { if (A.mat[k] && B.mat[k]) n++; else if (A.mat[k] || B.mat[k]) x++; } return { n, x }; })();
  fs.writeFileSync(path.join(out, name + '.png'), encodePng(tw * SHARES.length, th, tile));
  console.log(`${name}: ${d} m, ${W} x ${H} px per tile (x${zoom}), man ${Math.round(2 * st * ppm)} px tall; covered by the finer level ${cov(A)} px, by the coarser ${cov(B)} px, by both ${both.n}, by one only ${both.x} (${(100 * both.x / Math.max(1, both.n + both.x)).toFixed(1)} percent of the union)`);
}
