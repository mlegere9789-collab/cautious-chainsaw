// Deferred, supersampled, orthographic software rasteriser with alpha-tested / alpha-to-coverage cutouts, a key-light shadow map and a per-fragment shading environment (node only: inspection tooling,
// NOT the product renderer; it exists so texture maps, strand cards and cloth detail can be LOOKED AT without a GPU). Extends raster.mjs (which only writes material id + normal for the impostor bakes).
//   pass 1  visibility: for each sample the nearest triangle id and two barycentrics; a triangle whose dominant material has an alpha mode calls env.alpha(...) per sample and is discarded below the
//           threshold (alpha-test: 0.5; alpha-to-coverage: an R2 low-discrepancy threshold per sample, so the supersampled resolve gives soft strand edges)
//   pass 2  shading: each visible sample is rebuilt (position, normal, uv, tangent frame, flags, uv-per-pixel footprint) and shaded by env.shade(frag, out) into linear HDR; the resolve averages the
//           samples and applies the tone curve and the sRGB transfer.
//   shadow  the same visibility pass from the key light (alpha-tested cards cast fibre-wise shadows), PCF 3 x 3.
import { viewBasis } from './raster.mjs';

// camera basis: yaw as raster.mjs (the viewer in front of the figure at yaw 0), optional pitch (looking down for positive)
export function camBasis(yaw, pitch = 0) {
  const s = Math.sin(yaw), c = Math.cos(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), r = [c, 0, -s], d = [-s * cp, -sp, -c * cp];
  const u = [r[1] * d[2] - r[2] * d[1], r[2] * d[0] - r[0] * d[2], r[0] * d[1] - r[1] * d[0]]; return { r, u, d };
}
void viewBasis;
const norm3 = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// orthonormal basis looking along d (away from the light's position), for the shadow map
export function dirBasis(d) { d = norm3(d); const up = Math.abs(d[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0], r = norm3(cross3(up, d)), u = cross3(d, r); return { r, u, d }; }

// ---- pass 1: visibility. meshes: [{ pos, uv, mat, flags, idx, nv, alphaMode: Map(mat -> 'test'|'a2c') }]
function visibility(meshes, B, W, H, ppm, cen, env, forShadow = false) {
  const N = W * H, depth = new Float32Array(N).fill(1e9), tri = new Int32Array(N).fill(-1), bb1 = new Float32Array(N), bb2 = new Float32Array(N);
  let triBase = 0; const offs = [];
  for (const m of meshes) {
    offs.push(triBase); const n = m.nv, sx = new Float32Array(n), sy = new Float32Array(n), sd = new Float32Array(n), P = m.pos;
    for (let i = 0; i < n; i++) { const x = P[i * 3] - cen[0], y = P[i * 3 + 1] - cen[1], z = P[i * 3 + 2] - cen[2]; sx[i] = W / 2 + (x * B.r[0] + y * B.r[1] + z * B.r[2]) * ppm; sy[i] = H / 2 - (x * B.u[0] + y * B.u[1] + z * B.u[2]) * ppm; sd[i] = x * B.d[0] + y * B.d[1] + z * B.d[2]; }
    const am = m.alphaMode;
    for (let t = 0; t < m.idx.length; t += 3) {
      const a = m.idx[t], b = m.idx[t + 1], c = m.idx[t + 2], x0 = sx[a], y0 = sy[a], x1 = sx[b], y1 = sy[b], x2 = sx[c], y2 = sy[c], area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0), gid = triBase + t / 3;
      if (Math.abs(area) < 1e-9) continue;
      const minx = Math.max(0, Math.floor(Math.min(x0, x1, x2))), maxx = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2))), miny = Math.max(0, Math.floor(Math.min(y0, y1, y2))), maxy = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
      if (minx > maxx || miny > maxy) continue;
      let mode = null, mat = 0, fp = 0, a0 = 0, a1 = 0;
      if (am && am.size) { mat = m.mat[a]; mode = am.get(mat) ?? null; if (mode) { const du1 = m.uv[b * 2] - m.uv[a * 2], dv1 = m.uv[b * 2 + 1] - m.uv[a * 2 + 1], du2 = m.uv[c * 2] - m.uv[a * 2], dv2 = m.uv[c * 2 + 1] - m.uv[a * 2 + 1]; fp = Math.sqrt(Math.abs(du1 * dv2 - du2 * dv1) / Math.abs(area)); a0 = 1; a1 = 1; } }
      const inv = 1 / area;
      for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
        const px = x + 0.5, py = y + 0.5, w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) * inv, w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) * inv, w2 = 1 - w0 - w1;
        if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
        const d = w0 * sd[a] + w1 * sd[b] + w2 * sd[c], k = y * W + x; if (d >= depth[k]) continue;
        if (mode) {
          const u = w0 * m.uv[a * 2] + w1 * m.uv[b * 2] + w2 * m.uv[c * 2], v = w0 * m.uv[a * 2 + 1] + w1 * m.uv[b * 2 + 1] + w2 * m.uv[c * 2 + 1], cov = (w0 * (m.flags[a] & 31) + w1 * (m.flags[b] & 31) + w2 * (m.flags[c] & 31)) / 31, vr = m.flags[a] >> 5;
          const al = env.alpha(mat, vr, u, v, cov, fp), thr = mode === 'a2c' ? ((0.7548776662 * x + 0.5698402909 * y + 0.5) % 1) * 0.9 + 0.05 : 0.5; if (al < thr) continue;
        }
        depth[k] = d; tri[k] = gid; bb1[k] = w1; bb2[k] = w2;
      }
      void a0; void a1; void forShadow;
    }
    triBase += m.idx.length / 3;
  }
  return { depth, tri, bb1, bb2, offs, total: triBase };
}
const srgb = x => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);

// ---- render: returns { w, h, rgba } (downsampled by ss). env: { alpha(mat, variant, u, v, cov, fp), shade(frag, out), alphaModes: Map, keyDir (unit, toward the light), exposure }
export function renderShaded(meshes, o) {
  const { w, h, yaw = 0, pitch = 0, ppm, cy = 1, cx = 0, cz = 0, ss = 2, env, bg = [58, 62, 70] } = o, W = w * ss, H = h * ss, B = camBasis(yaw, pitch), cen = [cx, cy, cz];
  const ms = meshes.map(m => ({ ...m, alphaMode: m.alphaMode ?? env.alphaModes }));
  const vis = visibility(ms, B, W, H, ppm * ss, cen, env);
  // shadow map from the key light, covering the bounds of all meshes
  let shadow = null;
  if (env.keyDir && env.shadows !== false) {
    const L = dirBasis([-env.keyDir[0], -env.keyDir[1], -env.keyDir[2]]); let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (const m of ms) for (let i = 0; i < m.nv; i++) { const x = m.pos[i * 3], y = m.pos[i * 3 + 1], z = m.pos[i * 3 + 2], p = [x * L.r[0] + y * L.r[1] + z * L.r[2], x * L.u[0] + y * L.u[1] + z * L.u[2], x * L.d[0] + y * L.d[1] + z * L.d[2]]; for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); } }
    const sppm = Math.min(ppm * ss * 1.0, Math.sqrt(5e6 / Math.max(1e-6, (hi[0] - lo[0]) * (hi[1] - lo[1])))), SW = Math.max(8, Math.ceil((hi[0] - lo[0]) * sppm) + 4), SH = Math.max(8, Math.ceil((hi[1] - lo[1]) * sppm) + 4);
    const sc = [0, 0, 0]; // centre in world: light-basis centre mapped back
    const mid = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2]; for (let k = 0; k < 3; k++) sc[k] = L.r[k] * mid[0] + L.u[k] * mid[1] + L.d[k] * mid[2];
    const sv = visibility(ms, L, SW, SH, sppm, sc, env, true); shadow = { L, SW, SH, sppm, sc, depth: sv.depth };
  }
  const acc = new Float32Array(W * H * 3), out = new Uint8Array(w * h * 4), frag = { mat: 0, pos: [0, 0, 0], n: [0, 0, 1], t: [1, 0, 0], b: [0, 1, 0], u: 0, v: 0, flags: 0, cov: 0, fp: 0, view: [-B.d[0], -B.d[1], -B.d[2]], vr: 0, shadow: 1, lod: 0 }, rgb = [0, 0, 0];
  const ofs = vis.offs; const findMesh = g => { let lo = 0, hi = ofs.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ofs[mid] <= g) lo = mid; else hi = mid - 1; } return lo; };
  const bgL = bg.map(c => Math.pow(c / 255, 2.2));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, g = vis.tri[k]; if (g < 0) { acc[k * 3] = bgL[0]; acc[k * 3 + 1] = bgL[1]; acc[k * 3 + 2] = bgL[2]; continue; }
    const mi = findMesh(g), m = ms[mi], t = (g - ofs[mi]) * 3, ia = m.idx[t], ib = m.idx[t + 1], ic = m.idx[t + 2], w1 = vis.bb1[k], w2 = vis.bb2[k], w0 = 1 - w1 - w2;
    const P = m.pos, N = m.nrm, UV = m.uv, F = frag;
    F.pos[0] = w0 * P[ia * 3] + w1 * P[ib * 3] + w2 * P[ic * 3]; F.pos[1] = w0 * P[ia * 3 + 1] + w1 * P[ib * 3 + 1] + w2 * P[ic * 3 + 1]; F.pos[2] = w0 * P[ia * 3 + 2] + w1 * P[ib * 3 + 2] + w2 * P[ic * 3 + 2];
    let nx = w0 * N[ia * 3] + w1 * N[ib * 3] + w2 * N[ic * 3], ny = w0 * N[ia * 3 + 1] + w1 * N[ib * 3 + 1] + w2 * N[ic * 3 + 1], nz = w0 * N[ia * 3 + 2] + w1 * N[ib * 3 + 2] + w2 * N[ic * 3 + 2]; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    // two-sided: flip toward the viewer
    if (nx * F.view[0] + ny * F.view[1] + nz * F.view[2] < 0) { nx = -nx; ny = -ny; nz = -nz; F.back = true; } else F.back = false;
    F.n[0] = nx; F.n[1] = ny; F.n[2] = nz;
    F.u = w0 * UV[ia * 2] + w1 * UV[ib * 2] + w2 * UV[ic * 2]; F.v = w0 * UV[ia * 2 + 1] + w1 * UV[ib * 2 + 1] + w2 * UV[ic * 2 + 1];
    const vi = w0 >= w1 && w0 >= w2 ? ia : w1 >= w2 ? ib : ic; F.mat = m.mat[vi]; F.flags = m.flags[vi]; F.vr = m.flags[vi] >> 5; F.cov = (w0 * (m.flags[ia] & 31) + w1 * (m.flags[ib] & 31) + w2 * (m.flags[ic] & 31)) / 31; F.rest = m.rpos ? [w0 * m.rpos[ia * 3] + w1 * m.rpos[ib * 3] + w2 * m.rpos[ic * 3], w0 * m.rpos[ia * 3 + 1] + w1 * m.rpos[ib * 3 + 1] + w2 * m.rpos[ic * 3 + 1], w0 * m.rpos[ia * 3 + 2] + w1 * m.rpos[ib * 3 + 2] + w2 * m.rpos[ic * 3 + 2]] : F.pos;
    // tangent frame from the triangle's uv gradient
    const e1x = P[ib * 3] - P[ia * 3], e1y = P[ib * 3 + 1] - P[ia * 3 + 1], e1z = P[ib * 3 + 2] - P[ia * 3 + 2], e2x = P[ic * 3] - P[ia * 3], e2y = P[ic * 3 + 1] - P[ia * 3 + 1], e2z = P[ic * 3 + 2] - P[ia * 3 + 2];
    const du1 = UV[ib * 2] - UV[ia * 2], dv1 = UV[ib * 2 + 1] - UV[ia * 2 + 1], du2 = UV[ic * 2] - UV[ia * 2], dv2 = UV[ic * 2 + 1] - UV[ia * 2 + 1], det = du1 * dv2 - du2 * dv1;
    if (Math.abs(det) > 1e-14) { const r = 1 / det; let tx = (e1x * dv2 - e2x * dv1) * r, ty = (e1y * dv2 - e2y * dv1) * r, tz = (e1z * dv2 - e2z * dv1) * r, bx = (e2x * du1 - e1x * du2) * r, by = (e2y * du1 - e1y * du2) * r, bz = (e2z * du1 - e1z * du2) * r;
      const dt = tx * nx + ty * ny + tz * nz; tx -= nx * dt; ty -= ny * dt; tz -= nz * dt; const tl = Math.hypot(tx, ty, tz) || 1; F.t[0] = tx / tl; F.t[1] = ty / tl; F.t[2] = tz / tl;
      const db = bx * nx + by * ny + bz * nz; bx -= nx * db; by -= ny * db; bz -= nz * db; const bl = Math.hypot(bx, by, bz) || 1; F.b[0] = bx / bl; F.b[1] = by / bl; F.b[2] = bz / bl; F.tOK = true;
    } else { F.tOK = false; F.t[0] = 1; F.t[1] = 0; F.t[2] = 0; F.b[0] = 0; F.b[1] = 1; F.b[2] = 0; }
    // uv per screen sample (metres per sample): sqrt of the uv area over the screen area of the triangle
    { const sxa = (e1x * B.r[0] + e1y * B.r[1] + e1z * B.r[2]), sya = (e1x * B.u[0] + e1y * B.u[1] + e1z * B.u[2]), sxb = (e2x * B.r[0] + e2y * B.r[1] + e2z * B.r[2]), syb = (e2x * B.u[0] + e2y * B.u[1] + e2z * B.u[2]), sa = Math.abs(sxa * syb - sxb * sya) * (ppm * ss) * (ppm * ss);
      F.fp = sa > 1e-9 ? Math.sqrt(Math.abs(det) / sa) : 0; }
    // shadow
    F.shadow = 1;
    if (shadow) {
      const S = shadow, ox = F.pos[0] + nx * 0.0012 - S.sc[0], oy = F.pos[1] + ny * 0.0012 - S.sc[1], oz = F.pos[2] + nz * 0.0012 - S.sc[2];
      const lx = ox * S.L.r[0] + oy * S.L.r[1] + oz * S.L.r[2], ly = ox * S.L.u[0] + oy * S.L.u[1] + oz * S.L.u[2], ld = ox * S.L.d[0] + oy * S.L.d[1] + oz * S.L.d[2], px = S.SW / 2 + lx * S.sppm, py = S.SH / 2 - ly * S.sppm;
      let lit = 0, cnt = 0; const bias = 0.0016;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const sx2 = Math.floor(px) + i, sy2 = Math.floor(py) + j; if (sx2 < 0 || sy2 < 0 || sx2 >= S.SW || sy2 >= S.SH) { lit++; cnt++; continue; } cnt++; if (ld - bias <= S.depth[sy2 * S.SW + sx2]) lit++; }
      F.shadow = lit / cnt;
    }
    env.shade(F, rgb); acc[k * 3] = rgb[0]; acc[k * 3 + 1] = rgb[1]; acc[k * 3 + 2] = rgb[2];
  }
  const nn = ss * ss, ex = env.exposure ?? 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0; for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) { const k = (y * ss + sy) * W + x * ss + sx; r += acc[k * 3]; g += acc[k * 3 + 1]; b += acc[k * 3 + 2]; }
    r = r / nn * ex; g = g / nn * ex; b = b / nn * ex;
    // filmic-ish shoulder
    const tm = c => c * (1 + c / 6.0) / (1 + c); const o2 = (y * w + x) * 4; out[o2] = Math.round(255 * Math.min(1, srgb(tm(r)))); out[o2 + 1] = Math.round(255 * Math.min(1, srgb(tm(g)))); out[o2 + 2] = Math.round(255 * Math.min(1, srgb(tm(b)))); out[o2 + 3] = 255;
  }
  return { w, h, rgba: out };
}
