// Shared detail primitives for the LOD0 (film-grade) figure parts: deterministic value noise, cloth-fold displacement fields, stitching dashes, seam ribbons, domed buttons, eyelets, rivets,
// rounded boxes and partial spheres. Everything is a pure function of its arguments (no clock, no Math.random): the noise lattice is the counter-based hash of sim/rng.mjs.
// Tier of every dimension in this file: PLAUSIBLE-PROCEDURAL (TIERS.json F-DETAIL-DIMS): no garment pattern, button drawing or lace spacing was measured for this task.
import { rand } from '../../../sim/rng.mjs';
import { v3, m4, clamp, smooth, qAxisAngle } from './mathlib.mjs';
import { Mesh, loft, tube, ellipsoid, box, lathe, strap } from './meshkit.mjs';
import { MAT } from './palette.mjs';

// ---- value noise (trilinear, smoothstep) on an integer lattice; seed picks the field
const lat = (x, y, z, s) => rand(0x5eed + s, x + 4096, y + 4096, z + 4096);
export function vnoise(x, y, z, s = 1) {
  const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z), fx = x - x0, fy = y - y0, fz = z - z0, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const a = lat(x0, y0, z0, s), b = lat(x0 + 1, y0, z0, s), c = lat(x0, y0 + 1, z0, s), d = lat(x0 + 1, y0 + 1, z0, s), e = lat(x0, y0, z0 + 1, s), f = lat(x0 + 1, y0, z0 + 1, s), g = lat(x0, y0 + 1, z0 + 1, s), h = lat(x0 + 1, y0 + 1, z0 + 1, s);
  return (a * (1 - u) + b * u) * (1 - v) * (1 - w) + (c * (1 - u) + d * u) * v * (1 - w) + (e * (1 - u) + f * u) * (1 - v) * w + (g * (1 - u) + h * u) * v * w;
}
export const fbm = (x, y, z, s = 1, oct = 3) => { let a = 0, k = 0.5, f = 1; for (let i = 0; i < oct; i++) { a += k * (vnoise(x * f, y * f, z * f, s + i) - 0.5); k *= 0.5; f *= 2; } return a * 2; };

// ---- cloth fold displacement (metres along the surface normal). Pure in (angle a, ring y, arc v): identical topology at every body shape key.
//  drape: vertical fold waves that grow from the waist to the hem (frock skirt, sack coat body); crease: horizontal creases (elbow, knee, waist); bag: slow bulge noise
export function drapeFold({ amp = 0.004, n = 11, y0 = 0.95, y1 = 0.62, seed = 1, twist = 2.2 } = {}) {
  return (a, y) => { const g = smooth(y0, y1, y); if (g <= 0) return amp * 0.25 * fbm(Math.cos(a) * 3, y * 6, Math.sin(a) * 3, seed); const w = Math.sin(a * n + y * twist + 6.28 * fbm(Math.cos(a) * 1.7, y * 2, Math.sin(a) * 1.7, seed)); return amp * g * (0.55 * w + 0.45 * Math.sin(a * (n * 0.5 + 1) - y * twist * 1.7)) + amp * 0.25 * fbm(Math.cos(a) * 3, y * 6, Math.sin(a) * 3, seed + 7); };
}
export function creaseFold({ amp = 0.0022, at = 0.5, width = 0.08, n = 5, side = 1, seed = 1 } = {}) {
  // along-axis position t (0..1 of the limb); creases concentrate on the inner side of the bend (side = +1: angle a near +pi/2) and fade away from `at`
  return (a, t) => { const g = Math.exp(-(((t - at) / width) ** 2)), inner = 0.5 + 0.5 * Math.sin(a * 1 + (side > 0 ? 0 : Math.PI)); return amp * g * (0.35 + 0.65 * inner) * Math.sin((t - at) / width * Math.PI * n * 0.5 + 1.1) + amp * 0.3 * g * fbm(Math.cos(a) * 2, t * 9, Math.sin(a) * 2, seed); };
}

// a smooth tube of constant (or tapering) radius along a polyline, parallel-transport frames; closed = join the ends (no caps). r can be a number or t -> radius.
export function pathTube(mesh, pts, r, { sides = 6, mat = 0, skinFn = null, closed = false, caps = true } = {}) {
  const n = pts.length, rings = []; let u = null;
  for (let i = 0; i < n; i++) {
    const tg = v3.norm(v3.sub(pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)], pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)]));
    if (!u) { const f = Math.abs(tg[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]; u = v3.norm(v3.cross(tg, f)); } else { u = v3.sub(u, v3.mul(tg, v3.dot(u, tg))); u = v3.norm(u); }
    const v = v3.cross(tg, u), rr = typeof r === 'function' ? r(i / (n - 1)) : r; rings.push({ c: pts[i], u, v, ru: rr, rv: rr });
  }
  if (closed) rings.push({ ...rings[0] });
  return loft(mesh, rings, { sides, mat, skinFn, capStart: caps && !closed, capEnd: caps && !closed, smoothNormals: true });
}
// ---- orientation helper: a frame whose columns are (right = tangent t, up = normal n, fwd = t x n)
function frameTN(t, n) { const tt = v3.norm(t), nn = v3.norm(v3.sub(n, v3.mul(tt, v3.dot(n, tt)))); const b = v3.cross(tt, nn); return { t: tt, n: nn, b }; }
const mFrame = (c, F) => { const m = m4.ident(); m[0] = F.t[0]; m[1] = F.t[1]; m[2] = F.t[2]; m[4] = F.n[0]; m[5] = F.n[1]; m[6] = F.n[2]; m[8] = F.b[0]; m[9] = F.b[1]; m[10] = F.b[2]; m[12] = c[0]; m[13] = c[1]; m[14] = c[2]; return m; };

// ---- stitching: dashes along a polyline lying on a surface. pts: [[x,y,z],...], nrm(p) -> outward unit normal; one low box per dash (12 triangles)
// stitch dashes are the cheapest detail to thin (the dash length stays 4.2 mm, the pitch grows): 0.6 of the nominal count keeps the topology fixed per call and takes about 2,000 triangles off a man (budget, section 9.10)
export const STITCH_DENSITY = 0.6;
export function stitches(mesh, pts, nrm, { count = 8, len = 0.0042, w = 0.0011, h = 0.0007, mat = MAT.THREAD, skinFn = null, lift = 0.0004 } = {}) {
  // `count` dashes are placed at equal arc-length spacing; the COUNT is the caller's constant so the topology never depends on the body shape (shape keys need identical topology).
  // A dash is a six-triangle ridge (two slanted sides, two end triangles, no underside): 6 vertices.
  const L = []; for (let i = 1; i < pts.length; i++) L.push(v3.len(v3.sub(pts[i], pts[i - 1])));
  const total = L.reduce((a, b) => a + b, 0), n = Math.max(1, Math.round(count * STITCH_DENSITY)), dl = Math.min(len, 0.8 * total / n);
  for (let k = 0; k < n; k++) {
    let s = (k + 0.5) * total / n, i = 0; while (i < L.length - 1 && s > L[i]) { s -= L[i]; i++; }
    const t = L[i] > 0 ? s / L[i] : 0, p = v3.lerp(pts[i], pts[i + 1], t), tg = v3.sub(pts[i + 1], pts[i]), nn = nrm(p), F = frameTN(tg, nn), o = v3.add(p, v3.mul(F.n, lift));
    const at = (a, b2, c) => [o[0] + F.t[0] * a + F.b[0] * b2 + F.n[0] * c, o[1] + F.t[1] * a + F.b[1] * b2 + F.n[1] * c, o[2] + F.t[2] * a + F.b[2] * b2 + F.n[2] * c];
    const sk = skinFn ? skinFn(p) : null, hl = dl / 2, hw = w / 2, V = [at(-hl, -hw, 0), at(hl, -hw, 0), at(hl, hw, 0), at(-hl, hw, 0), at(-hl * 0.7, 0, h), at(hl * 0.7, 0, h)];
    const nr = [v3.norm(v3.add(v3.mul(F.b, -1), F.n)), v3.norm(v3.add(v3.mul(F.b, -1), F.n)), v3.norm(v3.add(F.b, F.n)), v3.norm(v3.add(F.b, F.n)), F.n, F.n];
    const ids = V.map((q, j) => mesh.vert(q, nr[j], 0, 0, mat, sk));
    mesh.tri(ids[0], ids[5], ids[1]); mesh.tri(ids[0], ids[4], ids[5]); mesh.tri(ids[2], ids[4], ids[3]); mesh.tri(ids[2], ids[5], ids[4]); mesh.tri(ids[3], ids[4], ids[0]); mesh.tri(ids[1], ids[5], ids[2]);
  }
  return n;
}
// a raised seam ribbon: a flat strap lying on the surface (width w, height h) with tapered rounded section
export function seam(mesh, pts, nrm, { w = 0.004, h = 0.0014, mat = null, skinFn = null, lift = 0.0, sides = 4, caps = true } = {}) {
  const closed = v3.len(v3.sub(pts[0], pts[pts.length - 1])) < 1e-5;
  const P = pts.map(p => v3.add(p, v3.mul(nrm(p), lift + h / 2)));
  const rings = P.map((p, i) => { const tg = v3.norm(v3.sub(P[Math.min(P.length - 1, i + 1)], P[Math.max(0, i - 1)])), n = nrm(p), F = frameTN(tg, n); return { c: p, u: F.b, v: F.n, ru: w / 2, rv: h / 2 }; });
  return loft(mesh, rings, { sides, capStart: caps && !closed, capEnd: caps && !closed, mat: mat ?? 0, skinFn, smoothNormals: true });
}
// append a locally built mesh under a frame and skin it by its final positions
const appendXf = (mesh, m, F, c, skinFn) => { const base = mesh.nv; mesh.append(m, mFrame(c, F)); if (skinFn) mesh.setSkin(skinFn, base, mesh.nv); return mesh; };
const frameAt = n => frameTN(Math.abs(n[0]) > 0.9 ? [0, 0, 1] : [1, 0, 0], n);
// ---- domed button with a raised rim, four thread holes and (optionally) a centre device; axis = outward normal n at centre c
export function button(mesh, c, n, r, { mat = MAT.BRASS, skinFn = null, holes = 0, device = true, sides = 14 } = {}) {
  const m = new Mesh('b'), prof = holes ? [[0, 0.0011], [r * 0.60, 0.0008], [r * 0.80, 0.0015], [r * 0.97, 0.0016], [r, 0], [0, 0]]
    : [[0, 0.0034], [r * 0.5, 0.0030], [r * 0.78, 0.0020], [r * 0.90, 0.0024], [r, 0.0006], [r, 0], [0, 0]];
  lathe(m, prof, sides, { closed: true, mat, smoothNormals: true });
  if (holes) for (let i = 0; i < holes; i++) { const a = i / holes * Math.PI * 2 + Math.PI / 4; ellipsoid(m, [Math.cos(a) * r * 0.2, 0.0014, Math.sin(a) * r * 0.2], [r * 0.08, r * 0.03, r * 0.08], 4, 2, { mat: MAT.THREAD }); }
  else if (device) ellipsoid(m, [0, 0.0031, 0], [r * 0.28, 0.0012, r * 0.28], 6, 2, { mat });
  return appendXf(mesh, m, frameAt(n), c, skinFn);
}
// a small round-headed rivet / screw head / eyelet ring (axis n)
export function rivet(mesh, c, n, r, { mat = MAT.BRASS, skinFn = null, sides = 8, slot = false, ring = false } = {}) {
  const m = new Mesh('r'); lathe(m, ring ? [[r * 0.45, 0], [r, 0], [r, r * 0.35], [r * 0.7, r * 0.5], [r * 0.45, r * 0.35]] : [[0, r * 0.6], [r * 0.5, r * 0.55], [r * 0.9, r * 0.3], [r, 0], [0, 0]], sides, { closed: !ring, mat });
  if (slot && !ring) box(m, [0, r * 0.58, 0], [r * 0.7, r * 0.06, r * 0.1], { mat: MAT.IRON });
  return appendXf(mesh, m, frameAt(n), c, skinFn);
}
// append any locally built mesh with a rigid frame (origin c, axis n = local +y) and skin it by position
export function place(mesh, local, c, n, skinFn = null) { return appendXf(mesh, local, frameAt(n), c, skinFn); }
// a rounded box (lofted superellipse section): half-extents h = [hx, hy, hz], local frame m (m4); the corners are rounded with radius rr
export function roundBox(mesh, c, h, rr, { mat = 0, skinFn = null, m = null, sides = 16 } = {}) {
  const rings = [], N = 5, ex = (a, p) => Math.sign(a) * Math.pow(Math.abs(a), p);
  for (let i = 0; i < N; i++) { const t = i / (N - 1) * 2 - 1, f = Math.pow(Math.abs(t), 8) > 0.0 ? 1 : 1; void f; const s = Math.sqrt(Math.max(0.0, 1 - Math.pow(Math.abs(t), 12))); rings.push({ c: [0, t * h[1], 0], u: [1, 0, 0], v: [0, 0, 1], ru: Math.max(h[0] * Math.max(s, 0.02), 1e-4), rv: Math.max(h[2] * Math.max(s, 0.02), 1e-4), rfn: a => { const ca = Math.cos(a), sa = Math.sin(a); return 1 / Math.pow(Math.pow(Math.abs(ca), 8) + Math.pow(Math.abs(sa), 8), 1 / 8); } }); }
  void ex; void rr;
  const tmp = new Mesh('rb'); loft(tmp, rings, { sides, mat, skinFn: null, capStart: true, capEnd: true, smoothNormals: true });
  const mm = m ? m4.mul(m4.translation(c), m) : m4.translation(c); const base = mesh.nv; mesh.append(tmp, mm); if (skinFn) mesh.setSkin(skinFn, base, mesh.nv); return mesh;
}
// partial sphere (a cap): spherical coordinates th in [th0, th1] from the +z axis of the frame, ph in [ph0, ph1] around it. Used for eyelids, ear shells, buttons.
export function sphereCap(mesh, c, r, { th0 = 0, th1 = Math.PI / 2, ph0 = 0, ph1 = Math.PI * 2, nu = 12, nv = 8, mat = 0, skinFn = null, rot = null, scale = [1, 1, 1], flip = false } = {}) {
  const base = mesh.nv;
  for (let j = 0; j <= nv; j++) { const th = th0 + (th1 - th0) * j / nv; for (let i = 0; i <= nu; i++) { const ph = ph0 + (ph1 - ph0) * i / nu; let q = [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)], p = [q[0] * r * scale[0], q[1] * r * scale[1], q[2] * r * scale[2]], n = v3.norm([q[0] / scale[0], q[1] / scale[1], q[2] / scale[2]]);
    if (rot) { p = m4.dir(rot, p); n = v3.norm(m4.dir(rot, n)); } p = v3.add(p, c); mesh.vert(p, flip ? v3.mul(n, -1) : n, i / nu * r * (ph1 - ph0), j / nv * r * (th1 - th0), mat, skinFn?.(p)); } }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = base + j * (nu + 1) + i, b = a + 1, c2 = a + nu + 1, d = c2 + 1; const z0 = th0 === 0 && j === 0, z1 = th1 === Math.PI && j === nv - 1; if (!z0) { if (flip) mesh.tri(a, b, c2); else mesh.tri(a, c2, b); } if (!z1) { if (flip) mesh.tri(b, d, c2); else mesh.tri(b, c2, d); } }
  return mesh;
}
// a bundle of hair strands (thin 3-sided tubes with a taper) from root points along a direction with a deterministic curl. rootFn(i) -> {p, dir}
export function strands(mesh, n, rootFn, { len = 0.03, r = 0.0006, mat = MAT.HAIR, skinFn = null, curl = 0.01, seed = 3, segs = 2 } = {}) {
  for (let i = 0; i < n; i++) {
    const R0 = rootFn(i); if (!R0) continue; const R = { p: v3.add(R0.p, [(rand(0x57a6 + seed, i, 0, 5) - 0.5) * 0.0008, (rand(0x57a6 + seed, i, 0, 6) - 0.5) * 0.0008, (rand(0x57a6 + seed, i, 0, 7) - 0.5) * 0.0008]), dir: R0.dir }; const pts = [R.p]; let d = v3.norm(R.dir), p = R.p; const l = len * (0.7 + 0.6 * rand(0x57a7 + seed, i, 0, 1));
    for (let s = 1; s <= segs; s++) { const jit = [rand(0x57a8 + seed, i, s, 2) - 0.5, rand(0x57a8 + seed, i, s, 3) - 0.5, rand(0x57a8 + seed, i, s, 4) - 0.5]; d = v3.norm(v3.add(d, v3.mul(jit, curl * 30))); p = v3.add(p, v3.mul(d, l / segs)); pts.push(p); }
    for (let s = 0; s < segs; s++) tube(mesh, pts[s], pts[s + 1], [[0, r * (1 - s / segs * 0.8)], [1, r * (1 - (s + 1) / segs * 0.9)]], { sides: 3, mat, skinFn: skinFn ? () => skinFn(pts[s]) : null, capStart: s === 0, capEnd: s === segs - 1, smoothNormals: false });
  }
  return mesh;
}
export { frameTN, mFrame, frameAt, qAxisAngle, clamp, strap };
