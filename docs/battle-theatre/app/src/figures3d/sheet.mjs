// Contact-sheet helpers for the figure family: a tiny CPU skinner (rigid FK from local rotations about each bone head; the rig has identity rest rotations), supersampled software-rasteriser tiles, and
// sheet composition. node-only inspection tooling (no GPU, no browser): it checks shape, proportion and detail, NOT the look in the product shader. Deterministic.
import { rasterize, shadeOf } from './raster.mjs';
import { renderShaded } from './shaded.mjs';
import { SKIN_SSS } from './palette.mjs';
import { qAxisAngle, qMul } from './mathlib.mjs';

// ---- pose: { boneName: [x, y, z, w] local rotation quaternion } ; root offset [x,y,z]. Returns a finalized mesh with skinned positions and normals.
export function poseMeshes(meshes, rig, pose = {}, offset = [0, 0, 0], mirrorFn = null) {
  const n = rig.bones.length, W = new Array(n);                     // world rotation (quaternion) and the position of each bone head after posing
  const rot = (q, v) => { const [x, y, z, w] = q, ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2]; return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x]; };
  for (let i = 0; i < n; i++) {
    const b = rig.bones[i], q = pose[b.name] ?? [0, 0, 0, 1];
    if (b.parent === null) { W[i] = { q, p: [b.head[0] + offset[0], b.head[1] + offset[1], b.head[2] + offset[2]] }; continue; }
    const P = W[b.parent], pb = rig.bones[b.parent], loc = [b.head[0] - pb.head[0], b.head[1] - pb.head[1], b.head[2] - pb.head[2]], r = rot(P.q, loc);
    W[i] = { q: qMul(P.q, q), p: [P.p[0] + r[0], P.p[1] + r[1], P.p[2] + r[2]] };
  }
  return meshes.map(m => {
    const pos = new Float32Array(m.pos.length), nrm = new Float32Array(m.nrm.length);
    for (let v = 0; v < m.nv; v++) {
      let px = 0, py = 0, pz = 0, nx = 0, ny = 0, nz = 0;
      for (let k = 0; k < 4; k++) {
        const w = m.weights[v * 4 + k]; if (w <= 0) continue; const j = m.joints[v * 4 + k], b = rig.bones[j], Wj = W[j];
        const d = [m.pos[v * 3] - b.head[0], m.pos[v * 3 + 1] - b.head[1], m.pos[v * 3 + 2] - b.head[2]], r = rot(Wj.q, d), rn = rot(Wj.q, [m.nrm[v * 3], m.nrm[v * 3 + 1], m.nrm[v * 3 + 2]]);
        px += w * (Wj.p[0] + r[0]); py += w * (Wj.p[1] + r[1]); pz += w * (Wj.p[2] + r[2]); nx += w * rn[0]; ny += w * rn[1]; nz += w * rn[2];
      }
      const l = Math.hypot(nx, ny, nz) || 1; pos[v * 3] = px; pos[v * 3 + 1] = py; pos[v * 3 + 2] = pz; nrm[v * 3] = nx / l; nrm[v * 3 + 1] = ny / l; nrm[v * 3 + 2] = nz / l;
    }
    return { ...m, pos, nrm, rpos: m.rpos ?? m.pos };
  });
}
export const quatX = deg => qAxisAngle([1, 0, 0], deg * Math.PI / 180), quatY = deg => qAxisAngle([0, 1, 0], deg * Math.PI / 180), quatZ = deg => qAxisAngle([0, 0, 1], deg * Math.PI / 180);
export const translateMeshes = (meshes, d) => meshes.map(m => { const pos = Float32Array.from(m.pos); for (let i = 0; i < m.nv; i++) { pos[i * 3] += d[0]; pos[i * 3 + 1] += d[1]; pos[i * 3 + 2] += d[2]; } return { ...m, pos }; });

// ---- rendering: a supersampled tile (ss x ss) of the meshes, flat-coloured with the baked-shade key light. palette: 64 x [r,g,b]; materials with an entry in `override` are replaced (e.g. flag white)
const SSS_SET = new Set(SKIN_SSS.materials), KL = (() => { const L = [-0.45, 0.65, 0.62], l = Math.hypot(...L); return L.map(x => x / l); })();
export function renderTile(meshes, { w, h, yaw = 0, ppm, cy = 0.9, cx = 0, cz = 0, ss = 2, palette, bg = [58, 62, 70], spec = null, sss = true }) {
  const img = rasterize(meshes, { w: w * ss, h: h * ss, yaw, ppm: ppm * ss, cy, centreXZ: [cx, cz] }), out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, cov = 0;
    for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
      const k = (y * ss + sy) * w * ss + x * ss + sx, m = img.mat[k]; if (m === 0) { r += bg[0]; g += bg[1]; b += bg[2]; continue; }
      cov++; const s = shadeOf(img.nx[k], img.ny[k], img.nz[k]), p = palette[m] || [128, 128, 128], sp = spec && spec[m] ? spec[m] : 0, hl = sp * Math.pow(Math.max(0, img.nz[k] / 127), 12) * 90;
      if (sss !== false && SSS_SET.has(m)) {                                          // skin: wrapped diffuse and a scatter band at the terminator (SKIN_SSS)
        const ndl = (img.nx[k] * KL[0] + img.ny[k] * KL[1] + img.nz[k] * KL[2]) / 127, w = SKIN_SSS.wrap, wrapped = Math.max(0, (ndl + w) / (1 + w)), band = Math.exp(-(((ndl - 0.05) / SKIN_SSS.scatter_width) ** 2)) * SKIN_SSS.scatter_strength, sh = Math.min(1, 0.30 + 0.70 * wrapped + 0.12 * Math.max(0, img.ny[k] / 127));
        r += Math.min(255, p[0] * (sh + band * SKIN_SSS.scatter_rgb[0]) * 1.12 + hl); g += Math.min(255, p[1] * (sh + band * SKIN_SSS.scatter_rgb[1]) * 1.12 + hl); b += Math.min(255, p[2] * (sh + band * SKIN_SSS.scatter_rgb[2]) * 1.12 + hl); continue;
      }
      r += Math.min(255, p[0] * s * 1.15 + hl); g += Math.min(255, p[1] * s * 1.15 + hl); b += Math.min(255, p[2] * s * 1.15 + hl);
    }
    const o = (y * w + x) * 4, n = ss * ss; out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255; void cov;
  }
  return { w, h, rgba: out };
}
// compose tiles in a row/grid with a 4 px gutter; tiles: [{w,h,rgba}] ; cols: tiles per row
export function composeSheet(tiles, cols, gutter = 4, bg = [30, 32, 38]) {
  const rows = Math.ceil(tiles.length / cols), cw = Math.max(...tiles.map(t => t.w)), ch = Math.max(...tiles.map(t => t.h)), W = cols * cw + (cols + 1) * gutter, H = rows * ch + (rows + 1) * gutter, out = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) { out[i * 4] = bg[0]; out[i * 4 + 1] = bg[1]; out[i * 4 + 2] = bg[2]; out[i * 4 + 3] = 255; }
  tiles.forEach((t, i) => { const c = i % cols, r = Math.floor(i / cols), x0 = gutter + c * (cw + gutter), y0 = gutter + r * (ch + gutter); for (let y = 0; y < t.h; y++) out.set(t.rgba.subarray(y * t.w * 4, (y + 1) * t.w * 4), ((y0 + y) * W + x0) * 4); });
  return { w: W, h: H, rgba: out };
}
// the mean silhouette boundary displacement (px) and the mean L* difference between two renders of the same figure at the same scale: used for the LOD hand-over checks (G4)
export function silhouetteDiff(a, b, W, H) {
  let xor = 0, perim = 0, cnt = 0;
  const inA = k => a.mat[k] !== 0, inB = k => b.mat[k] !== 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x, A = inA(k), B = inB(k); if (A !== B) xor++; if (A) { cnt++; const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1 || !inA(k - 1) || !inA(k + 1) || !inA(k - W) || !inA(k + W); if (edge) perim++; } }
  return { xor_px: xor, perimeter_px: perim, boundary_error_px: perim ? xor / perim : 0, area_px: cnt };
}
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
export function Lstar(r, g, b) { const Y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y; }

// the shaded variant of renderTile (shaded.mjs + shader.mjs): textures, strand cards, cloth maps, shadows. env = createEnv({ palette, headMaps, stubble, ... })
export function renderTileShaded(meshes, { w, h, yaw = 0, pitch = 0, ppm, cy = 0.9, cx = 0, cz = 0, ss = 2, env, bg = [58, 62, 70] }) { return renderShaded(meshes, { w, h, yaw, pitch, ppm, cy, cx, cz, ss, env, bg }); }
