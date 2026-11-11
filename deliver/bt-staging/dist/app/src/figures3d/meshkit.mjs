// Procedural mesh toolkit for the figure generators: indexed triangle meshes with a material slot and up to 4 bone weights per vertex, lofts/tubes/lathes/boxes/ellipsoids, smooth normals,
// packing to the 32-byte vertex, and the sanity checks the tests use (NaN, manifold/watertight by welded position, bone weights, signed volume). Everything is deterministic; no clock, no Math.random.
import { v3, frame, m4, r6 } from './mathlib.mjs';

export const VERTEX_BYTES = 32;      // pos f32x3 (12) | normal snorm8x4 (4) | uv unorm16x2 (4) | joints u8x4 (4) | weights unorm8x4 (4) | material u8 + 3 flags/pad bytes (4)
const norm4 = list => {            // [[bone,w],...] -> exactly 4 (bone,w) with sum 1, largest first
  const a = list.filter(x => x[1] > 1e-5).sort((p, q) => q[1] - p[1] || p[0] - q[0]).slice(0, 4); const s = a.reduce((t, x) => t + x[1], 0) || 1;
  const out = []; for (let i = 0; i < 4; i++) out.push(a[i] ? [a[i][0], a[i][1] / s] : [0, 0]); if (!a.length) out[0] = [0, 1]; return out;
};
export class Mesh {
  constructor(name = '') { this.name = name; this.P = []; this.N = []; this.U = []; this.M = []; this.J = []; this.W = []; this.I = []; this.flags = []; this.meta = {}; }
  get nv() { return this.P.length / 3; } get nt() { return this.I.length / 3; }
  vert(p, n, u, v, mat, skin, flag = 0) {
    this.P.push(p[0], p[1], p[2]); this.N.push(n[0], n[1], n[2]); this.U.push(u, v); this.M.push(mat); this.flags.push(flag);
    const s = norm4(skin || [[0, 1]]); for (const [b, w] of s) { this.J.push(b); this.W.push(w); } return this.nv - 1;
  }
  tri(a, b, c) { this.I.push(a, b, c); }
  quad(a, b, c, d) { this.I.push(a, b, c, a, c, d); }
  pos(i) { return [this.P[i * 3], this.P[i * 3 + 1], this.P[i * 3 + 2]]; }
  // append another mesh (optionally transformed by a m4 and re-skinned by a bone remap function)
  append(o, m = null, boneMap = null, matMap = null) {
    const base = this.nv;
    for (let i = 0; i < o.nv; i++) {
      let p = o.pos(i), n = [o.N[i * 3], o.N[i * 3 + 1], o.N[i * 3 + 2]]; if (m) { p = m4.point(m, p); n = v3.norm(m4.dir(m, n)); }
      this.P.push(p[0], p[1], p[2]); this.N.push(n[0], n[1], n[2]); this.U.push(o.U[i * 2], o.U[i * 2 + 1]); this.M.push(matMap ? matMap(o.M[i]) : o.M[i]); this.flags.push(o.flags[i]);
      if (boneMap) { const l = []; for (let k = 0; k < 4; k++) if (o.W[i * 4 + k] > 0) l.push([boneMap(o.J[i * 4 + k]), o.W[i * 4 + k]]); const merged = new Map(); for (const [b, w] of l) merged.set(b, (merged.get(b) || 0) + w); const s = norm4([...merged.entries()]); for (const [b, w] of s) { this.J.push(b); this.W.push(w); } }
      else for (let k = 0; k < 4; k++) { this.J.push(o.J[i * 4 + k]); this.W.push(o.W[i * 4 + k]); }
    }
    for (const i of o.I) this.I.push(i + base); return this;
  }
  // recompute normals as the area-weighted average of face normals over vertices that share a position (welded by 1e-5), for the vertex range [v0, v1)
  smooth(v0 = 0, v1 = this.nv) {
    // weld key: the position quantised to 0.1 mm packed into one number (3 x 17 bits), so the map is numeric and fast
    const P = this.P, key = i => ((Math.round(P[i * 3] * 1e4) + 65536) * 131072 + (Math.round(P[i * 3 + 1] * 1e4) + 65536)) * 131072 + (Math.round(P[i * 3 + 2] * 1e4) + 65536), acc = new Map();
    for (let t = 0; t < this.I.length; t += 3) {
      const a = this.I[t], b = this.I[t + 1], c = this.I[t + 2]; if (a < v0 || a >= v1) continue;
      const fn = v3.cross(v3.sub(this.pos(b), this.pos(a)), v3.sub(this.pos(c), this.pos(a)));
      for (const i of [a, b, c]) { const k = key(i), s = acc.get(k); if (s) { s[0] += fn[0]; s[1] += fn[1]; s[2] += fn[2]; } else acc.set(k, [fn[0], fn[1], fn[2]]); }
    }
    for (let i = v0; i < v1; i++) { const s = acc.get(key(i)); if (!s) continue; const n = v3.norm(s); this.N[i * 3] = n[0]; this.N[i * 3 + 1] = n[1]; this.N[i * 3 + 2] = n[2]; }
    return this;
  }
  transform(m, v0 = 0, v1 = this.nv) { for (let i = v0; i < v1; i++) { const p = m4.point(m, this.pos(i)), n = v3.norm(m4.dir(m, [this.N[i * 3], this.N[i * 3 + 1], this.N[i * 3 + 2]])); this.P[i * 3] = p[0]; this.P[i * 3 + 1] = p[1]; this.P[i * 3 + 2] = p[2]; this.N[i * 3] = n[0]; this.N[i * 3 + 1] = n[1]; this.N[i * 3 + 2] = n[2]; } return this; }
  setSkin(fn, v0 = 0, v1 = this.nv) { for (let i = v0; i < v1; i++) { const s = norm4(fn(this.pos(i))); for (let k = 0; k < 4; k++) { this.J[i * 4 + k] = s[k][0]; this.W[i * 4 + k] = s[k][1]; } } return this; }
  setMaterial(mat, v0 = 0, v1 = this.nv) { for (let i = v0; i < v1; i++) this.M[i] = mat; return this; }
  bounds() { const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (let i = 0; i < this.nv; i++) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], this.P[i * 3 + k]); hi[k] = Math.max(hi[k], this.P[i * 3 + k]); } return { lo, hi }; }
  finalize() {
    const n = this.nv;
    return { name: this.name, nv: n, nt: this.nt, pos: Float32Array.from(this.P), nrm: Float32Array.from(this.N), uv: Float32Array.from(this.U), mat: Uint8Array.from(this.M), joints: Uint8Array.from(this.J), weights: Float32Array.from(this.W), flags: Uint8Array.from(this.flags), idx: Uint32Array.from(this.I), meta: this.meta };
  }
}

// ---- bone skinning along a chain of joints: fn(p) -> [[bone, w], ...] (two bones blended over +-blend metres of arc length around each joint)
export function chainSkin(chain, blend = 0.05) {
  const pts = chain.map(c => c.a), S = [0]; for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + v3.len(v3.sub(pts[i], pts[i - 1])));
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  return p => {
    let best = 1e9, s = 0;
    for (let i = 0; i + 1 < pts.length; i++) { const ab = v3.sub(pts[i + 1], pts[i]), l2 = v3.dot(ab, ab) || 1e-9, t = Math.min(1, Math.max(0, v3.dot(v3.sub(p, pts[i]), ab) / l2)), q = v3.add(pts[i], v3.mul(ab, t)), d = v3.len(v3.sub(p, q)); if (d < best - 1e-9) { best = d; s = S[i] + t * Math.sqrt(l2); } }
    const w = []; for (let i = 0; i < chain.length; i++) { const a = i === 0 ? 1 : sm(S[i] - blend, S[i] + blend, s), b = i === chain.length - 1 ? 0 : sm(S[i + 1] - blend, S[i + 1] + blend, s); w.push([chain[i].bone, a - b]); }
    return w;
  };
}
export const rigid = bone => () => [[bone, 1]];

// ---- parametric surfaces ------------------------------------------------------------------------------------------------------------------------------------------------------------
// loft: rings = [{c, u, v, ru, rv, mat?, skin?}] each an ellipse c + u cos a ru + v sin a rv; sides around. opts: close caps, uvs, skinFn (p -> weights), mat
export function loft(mesh, rings, { sides = 12, mat = 0, skinFn = null, capStart = false, capEnd = false, uTile = 1, vTile = 1, flip = false, smoothNormals = true, flag = 0, phase = 0, disp = null, flagFn = null } = {}) {
  // UV are SURFACE METRES (u around the ring, v along the axis); packMesh stores them at 0.25 mm (the material maps tile per metre in the shader). disp(a, i, v) = extra offset along the normal (cloth folds, seams)
  const v0 = mesh.nv, nr = rings.length; if (nr < 2) throw new Error('loft needs 2 rings');
  const d = v3.sub(rings[nr - 1].c, rings[0].c), c0 = v3.cross(rings[0].u, rings[0].v), orient = (v3.dot(c0, d) >= 0) !== flip;   // orient: ring order u->v is counter-clockwise seen from the start side?
  let acc = 0;
  for (let i = 0; i < nr; i++) {
    const R = rings[i]; if (i > 0) acc += v3.len(v3.sub(R.c, rings[i - 1].c));
    const ra = Math.max(R.ru, 1e-4), rb = Math.max(R.rv, 1e-4), perim = Math.PI * (3 * (ra + rb) - Math.sqrt((3 * ra + rb) * (ra + 3 * rb)));
    for (let k = 0; k <= sides; k++) {
      const a = phase + k / sides * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), sh = R.rfn ? R.rfn(a) : 1;
      let p = [R.c[0] + (R.u[0] * ca * R.ru + R.v[0] * sa * R.rv) * sh, R.c[1] + (R.u[1] * ca * R.ru + R.v[1] * sa * R.rv) * sh, R.c[2] + (R.u[2] * ca * R.ru + R.v[2] * sa * R.rv) * sh];
      const nu_ = Math.max(R.ru, 1e-4), nv_ = Math.max(R.rv, 1e-4), n = v3.norm([R.u[0] * ca / nu_ + R.v[0] * sa / nv_, R.u[1] * ca / nu_ + R.v[1] * sa / nv_, R.u[2] * ca / nu_ + R.v[2] * sa / nv_]);
      if (disp) { const o = disp(a, i, acc); if (o) p = [p[0] + n[0] * o, p[1] + n[1] * o, p[2] + n[2] * o]; }
      mesh.vert(p, n, k / sides * perim * uTile, acc * vTile, R.mat ?? mat, (R.skin ?? skinFn)?.(p), flagFn ? flagFn(a, i, acc, p) : flag);      // flagFn: a per-vertex byte (wrinkle intensity on cloth, coverage|variant on strand cards)
    }
  }
  const s1 = sides + 1;
  for (let i = 0; i < nr - 1; i++) for (let k = 0; k < sides; k++) {
    const a = v0 + i * s1 + k, b = a + 1, c = a + s1, e = c + 1;
    const z0 = rings[i].ru === 0 || rings[i].rv === 0, z1 = rings[i + 1].ru === 0 || rings[i + 1].rv === 0;       // a zero-radius ring is a pole: its triangle with two coincident corners is not emitted
    if (z0 && z1) continue;
    if (orient) { if (!z0) mesh.tri(a, b, c); if (!z1) mesh.tri(b, e, c); } else { if (!z0) mesh.tri(a, c, b); if (!z1) mesh.tri(b, c, e); }
  }
  const cap = (R, end) => {
    const ci = mesh.vert(R.c, end ? v3.norm(v3.sub(rings[nr - 1].c, rings[nr - 2].c)) : v3.norm(v3.sub(rings[0].c, rings[1].c)), 0.5, 0.5, R.mat ?? mat, (R.skin ?? skinFn)?.(R.c), flag), base = v0 + (end ? (nr - 1) * s1 : 0);
    const nrm = end ? v3.norm(v3.sub(rings[nr - 1].c, rings[nr - 2].c)) : v3.norm(v3.sub(rings[0].c, rings[1].c)), ring = [];
    for (let k = 0; k <= sides; k++) { const q = mesh.pos(base + k); ring.push(mesh.vert(q, nrm, 0.5, 0.5, R.mat ?? mat, (R.skin ?? skinFn)?.(q), flag)); }
    for (let k = 0; k < sides; k++) { const front = (orient === end); if (front) mesh.tri(ci, ring[k], ring[k + 1]); else mesh.tri(ci, ring[k + 1], ring[k]); }
  };
  if (capStart) cap(rings[0], false); if (capEnd) cap(rings[nr - 1], true);
  if (smoothNormals) mesh.smooth(v0);
  return mesh;
}
// a tube between two points with a radius profile [[t, r], ...] (t in 0..1), elliptical via ex/ey scaling, optional rounded ends
export function tube(mesh, a, b, profile, o = {}) {
  const dvec = v3.sub(b, a), L = v3.len(dvec), d = v3.mul(dvec, 1 / (L || 1)), [u0, v0] = o.frame ?? frame(d), ex = o.ex ?? 1, ey = o.ey ?? 1;
  const rings = profile.map(([t, r]) => ({ c: v3.add(a, v3.mul(d, t * L)), u: u0, v: v0, ru: Math.max(r * ex, 0), rv: Math.max(r * ey, 0) }));
  return loft(mesh, rings, o);
}
// rounded-capped profile: n rings of a tapered limb from r0 to r1 with a hemispherical-ish cap at each end (capF = fraction of length)
export function limbProfile(r0, r1, rings, capF = 0.0, bulge = null) {
  const p = []; const cr = capF > 0 ? Math.max(2, Math.round(rings / 3)) : 0;
  for (let k = 0; k < cr; k++) { const t = k / cr * Math.PI / 2; p.push([capF * (1 - Math.cos(t)), k === 0 ? 0 : r0 * Math.sin(t)]); }
  for (let k = 0; k <= rings; k++) { const t = k / rings, tt = capF + (1 - 2 * capF) * t, r = r0 + (r1 - r0) * t; p.push([tt, bulge ? bulge(t, r) : r]); }
  for (let k = cr - 1; k >= 0; k--) { const t = k / cr * Math.PI / 2; p.push([1 - capF * (1 - Math.cos(t)), k === 0 ? 0 : r1 * Math.sin(t)]); }
  return p;
}
export function ellipsoid(mesh, c, rad, nu = 12, nv = 8, o = {}) {
  const v0 = mesh.nv, { mat = 0, skinFn = null, rot = null, flag = 0 } = o;
  for (let j = 0; j <= nv; j++) { const th = j / nv * Math.PI, st = Math.sin(th), ct = Math.cos(th);
    for (let i = 0; i <= nu; i++) { const ph = i / nu * Math.PI * 2; let q = [Math.cos(ph) * st, ct, Math.sin(ph) * st], p = [c[0] + q[0] * rad[0], c[1] + q[1] * rad[1], c[2] + q[2] * rad[2]];
      let n = v3.norm([q[0] / rad[0], q[1] / rad[1], q[2] / rad[2]]); if (rot) { p = v3.add(c, m4.dir(rot, v3.sub(p, c))); n = v3.norm(m4.dir(rot, n)); } mesh.vert(p, n, i / nu * Math.PI * (rad[0] + rad[2]), j / nv * Math.PI * rad[1], mat, skinFn?.(p), flag); } }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = v0 + j * (nu + 1) + i, b = a + 1, c2 = a + nu + 1, d = c2 + 1; if (j > 0) mesh.tri(a, b, c2); if (j < nv - 1) mesh.tri(b, d, c2); }
  return mesh;
}
// axis-aligned box in its own frame (optionally rotated by m, a m4), flat shaded, 24 vertices, 12 triangles
export function box(mesh, c, h, o = {}) {
  const { mat = 0, skinFn = null, m = null, flag = 0 } = o;
  const F = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]]];
  for (const [n, t1, t2] of F) {
    const base = mesh.nv, corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (const [a, b] of corners) { let p = [c[0] + (n[0] + t1[0] * a + t2[0] * b) * h[0], c[1] + (n[1] + t1[1] * a + t2[1] * b) * h[1], c[2] + (n[2] + t1[2] * a + t2[2] * b) * h[2]], nn = n; if (m) { p = v3.add(c, m4.dir(m, v3.sub(p, c))); nn = v3.norm(m4.dir(m, n)); } mesh.vert(p, nn, (a + 1) * Math.abs(t1[0] * h[0] + t1[1] * h[1] + t1[2] * h[2]), (b + 1) * Math.abs(t2[0] * h[0] + t2[1] * h[1] + t2[2] * h[2]), mat, skinFn?.(p), flag); }
    const p0 = mesh.pos(base), p1 = mesh.pos(base + 1), p2 = mesh.pos(base + 2), fn = v3.cross(v3.sub(p1, p0), v3.sub(p2, p0)), nn = v3.norm(m ? m4.dir(m, n) : n);
    if (v3.dot(fn, nn) >= 0) { mesh.tri(base, base + 1, base + 2); mesh.tri(base + 2, base + 1, base + 3); } else { mesh.tri(base, base + 2, base + 1); mesh.tri(base + 1, base + 2, base + 3); }
  }
  return mesh;
}
// a flat double-sided strip/quad (cloth, straps): corners a b c d counter-clockwise from the front; double = also emit the back face
export function quad4(mesh, a, b, c, d, o = {}) {
  const { mat = 0, skinFn = null, double = false, uv = [[0, 0], [1, 0], [1, 1], [0, 1]], flag = 0 } = o, n = v3.norm(v3.cross(v3.sub(b, a), v3.sub(d, a)));
  const eu = v3.len(v3.sub(b, a)), ev = v3.len(v3.sub(d, a)), ids = [a, b, c, d].map((p, i) => mesh.vert(p, n, uv[i][0] * eu, uv[i][1] * ev, mat, skinFn?.(p), flag)); mesh.quad(ids[0], ids[1], ids[2], ids[3]);
  if (double) { const nb = v3.mul(n, -1), jd = [a, b, c, d].map((p, i) => mesh.vert(p, nb, uv[i][0] * eu, uv[i][1] * ev, mat, skinFn?.(p), flag)); mesh.quad(jd[0], jd[3], jd[2], jd[1]); }
  return mesh;
}
// a thin strap/band following a polyline (width w along the binormal, thickness t as a closed box section)
export function strap(mesh, pts, w, t, o = {}) {
  const rings = pts.map((p, i) => { const tg = v3.norm(v3.sub(pts[Math.min(pts.length - 1, i + 1)], pts[Math.max(0, i - 1)])); if (o.nrm) { const n0 = o.nrm(p), n1 = v3.norm(v3.sub(n0, v3.mul(tg, v3.dot(n0, tg)))), side = v3.norm(v3.cross(tg, n1)); return { c: p, u: side, v: n1, ru: w / 2, rv: t / 2 }; } const up = Math.abs(tg[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]; const side = v3.norm(v3.cross(tg, up)); const nrm = v3.cross(side, tg); return { c: p, u: side, v: nrm, ru: w / 2, rv: t / 2 }; });
  return loft(mesh, rings, { sides: o.sides ?? 4, capStart: true, capEnd: true, mat: o.mat ?? 0, skinFn: o.skinFn, phase: Math.PI / 4, smoothNormals: o.smoothNormals ?? false, flag: o.flag ?? 0 });
}

// ---- pack for upload: the 32-byte vertex (VERTEX_BYTES) and a u32 index buffer (u16 when nv < 65536)
export const UV_RANGE_M = 16.384;            // metre-UV parts store uv / 16.384 as unorm16 (0.25 mm); parts with meta.uvUnit === 'unit' (flag cloth) store 0..1 directly
const packUv = (x, unit) => (unit ? Math.max(0, Math.min(65535, Math.round(x * 65535))) : Math.round((((x % UV_RANGE_M) + UV_RANGE_M) % UV_RANGE_M) / UV_RANGE_M * 65535));
export function packMesh(m) {
  const unit = !!(m.meta && m.meta.uvUnit === 'unit'), n = m.nv, buf = new ArrayBuffer(n * VERTEX_BYTES), dv = new DataView(buf), u8 = new Uint8Array(buf);
  for (let i = 0; i < n; i++) {
    const o = i * VERTEX_BYTES; dv.setFloat32(o, m.pos[i * 3], true); dv.setFloat32(o + 4, m.pos[i * 3 + 1], true); dv.setFloat32(o + 8, m.pos[i * 3 + 2], true);
    for (let k = 0; k < 3; k++) dv.setInt8(o + 12 + k, Math.max(-127, Math.min(127, Math.round(m.nrm[i * 3 + k] * 127)))); dv.setInt8(o + 15, 0);
    dv.setUint16(o + 16, packUv(m.uv[i * 2], unit), true); dv.setUint16(o + 18, packUv(m.uv[i * 2 + 1], unit), true);
    for (let k = 0; k < 4; k++) u8[o + 20 + k] = m.joints[i * 4 + k];
    const w = []; let s = 0; for (let k = 0; k < 4; k++) { const q = Math.round(m.weights[i * 4 + k] * 255); w.push(q); s += q; } w[0] += 255 - s;       // the quantised weights sum to exactly 255
    for (let k = 0; k < 4; k++) u8[o + 24 + k] = w[k];
    u8[o + 28] = m.mat[i]; u8[o + 29] = m.flags[i]; u8[o + 30] = 0; u8[o + 31] = 0;
  }
  const idx = n < 65536 ? Uint16Array.from(m.idx) : Uint32Array.from(m.idx);
  return { vertices: new Uint8Array(buf), indices: new Uint8Array(idx.buffer), index_bytes: n < 65536 ? 2 : 4, nv: n, nt: m.nt };
}

// ---- sanity checks (tests)
export function checkMesh(m, { closed = false, maxOpenEdges = Infinity } = {}) {
  const out = { ok: true, problems: [], nv: m.nv, nt: m.nt, openEdges: 0, nonManifoldEdges: 0, signedVolume: 0 };
  const bad = (s) => { out.ok = false; out.problems.push(s); };
  for (const arr of [m.pos, m.nrm, m.uv, m.weights]) for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) { bad('NaN/Inf in an attribute'); break; }
  for (let i = 0; i < m.nv; i++) { const s = m.weights[i * 4] + m.weights[i * 4 + 1] + m.weights[i * 4 + 2] + m.weights[i * 4 + 3]; if (Math.abs(s - 1) > 1e-5) { bad(`bone weights of vertex ${i} sum to ${s}`); break; } }
  for (let i = 0; i < m.idx.length; i++) if (m.idx[i] >= m.nv) { bad('index out of range'); break; }
  // welded edge map: key of quantised positions; direction +1/-1 counts
  const key = i => `${Math.round(m.pos[i * 3] * 2e4)},${Math.round(m.pos[i * 3 + 1] * 2e4)},${Math.round(m.pos[i * 3 + 2] * 2e4)}`, E = new Map(); let vol = 0, degenerate = 0;
  for (let t = 0; t < m.idx.length; t += 3) {
    const a = m.idx[t], b = m.idx[t + 1], c = m.idx[t + 2], ka = key(a), kb = key(b), kc = key(c);
    if (ka === kb || kb === kc || ka === kc) { degenerate++; continue; }
    for (const [p, q] of [[ka, kb], [kb, kc], [kc, ka]]) { const k = p < q ? p + '|' + q : q + '|' + p, e = E.get(k) || [0, 0]; e[p < q ? 0 : 1]++; E.set(k, e); }
    const pa = [m.pos[a * 3], m.pos[a * 3 + 1], m.pos[a * 3 + 2]], pb = [m.pos[b * 3], m.pos[b * 3 + 1], m.pos[b * 3 + 2]], pc = [m.pos[c * 3], m.pos[c * 3 + 1], m.pos[c * 3 + 2]];
    vol += v3.dot(pa, v3.cross(pb, pc)) / 6;
  }
  for (const e of E.values()) { if (e[0] + e[1] > 2 || (e[0] + e[1] === 2 && e[0] !== 1)) out.nonManifoldEdges++; else if (e[0] + e[1] === 1) out.openEdges++; }
  out.signedVolume = r6(vol); out.degenerate = degenerate;
  if (closed && (out.openEdges || out.nonManifoldEdges)) bad(`not watertight: ${out.openEdges} open and ${out.nonManifoldEdges} non-manifold edges`);
  if (!closed && out.nonManifoldEdges) bad(`${out.nonManifoldEdges} non-manifold edges`);
  if (!closed && out.openEdges > maxOpenEdges) bad(`${out.openEdges} open edges (limit ${maxOpenEdges})`);
  if (closed && out.signedVolume <= 0) bad('closed part has non-positive signed volume (inside-out)');
  return out;
}

// ---- lathe: revolve a 2D profile [[r, y], ...] around the vertical axis at `center` (elliptical via ax/az). closed profiles become solids and are auto-oriented outward (signed volume > 0);
//      open profiles keep the traversal's natural orientation (flip to reverse).
export function lathe(mesh, profile, sides, o = {}) {
  const { center = [0, 0, 0], ax = 1, az = 1, mat = 0, skinFn = null, closed = false, flip = false, flag = 0, smoothNormals = true, phase = 0 } = o;
  const v0 = mesh.nv, n = profile.length, mats = o.mats ?? null, rmax = Math.max(...profile.map(q => q[0])) * Math.max(ax, az); let arc = 0;
  for (let k = 0; k < n; k++) {
    if (k > 0) arc += Math.hypot(profile[k][0] - profile[k - 1][0], profile[k][1] - profile[k - 1][1]);
    const [r, y] = profile[k], pr = profile[Math.max(0, k - 1)], nx = profile[Math.min(n - 1, k + 1)], tx = nx[0] - pr[0], ty = nx[1] - pr[1], tl = Math.hypot(tx, ty) || 1;
    for (let s = 0; s <= sides; s++) {
      const a = phase + s / sides * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), p = [center[0] + r * ca * ax, center[1] + y, center[2] + r * sa * az];
      const nr = ty / tl, ny = -tx / tl, nn = v3.norm([nr * ca / ax, ny, nr * sa / az]);
      mesh.vert(p, nn, s / sides * 2 * Math.PI * rmax, arc, mats ? mats[k] : mat, skinFn?.(p), flag);
    }
  }
  const tris = [], s1 = sides + 1;
  for (let k = 0; k < n - 1; k++) for (let s = 0; s < sides; s++) {
    const a = v0 + k * s1 + s, b = a + 1, c = a + s1, d = c + 1; const z0 = profile[k][0] === 0, z1 = profile[k + 1][0] === 0;
    if (!z0) tris.push([a, c, b]); if (!z1) tris.push([b, c, d]);
  }
  let vol = 0; for (const [a, b, c] of tris) vol += v3.dot(mesh.pos(a), v3.cross(mesh.pos(b), mesh.pos(c))) / 6;
  const rev = closed ? vol < 0 : flip; for (const [a, b, c] of tris) { if (rev) mesh.tri(a, c, b); else mesh.tri(a, b, c); }
  if (rev) for (let i = v0; i < mesh.nv; i++) { mesh.N[i * 3] *= -1; mesh.N[i * 3 + 1] *= -1; mesh.N[i * 3 + 2] *= -1; }
  if (smoothNormals) mesh.smooth(v0);
  return mesh;
}
// apply a point warp to vertices [v0, nv) then recompute smooth normals over the range
export function warp(mesh, v0, fn) { for (let i = v0; i < mesh.nv; i++) { const p = fn(mesh.pos(i)); mesh.P[i * 3] = p[0]; mesh.P[i * 3 + 1] = p[1]; mesh.P[i * 3 + 2] = p[2]; } return mesh.smooth(v0); }
