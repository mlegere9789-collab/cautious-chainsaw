// Hair and facial hair as STRAND CARDS (film-grade round 3, 2026-10-31). The round-2 shells were solid, hard-edged and read as helmets; here every layer is an alpha-tested / alpha-to-coverage card whose
// texture (hairtex.mjs) carries individual fibres with clump gaps and tapered tips, and whose per-vertex coverage thins the fibres out one by one toward the hairline, jaw line and moustache edge:
//   * scalp / jaw: three stacked shell layers on the canonical head (dense base that hides the skin, a mid layer and an outer layer, each at its own offset, uv offsets and fibre variant), the layers follow the
//     skull and jaw because they are built on the same parametric surface as the skin; the visible edge is a field of fibres, not a contour;
//   * flyaway ribbons (about 70 on the scalp, 24 on a beard): thin tapered strips lifting a few millimetres off the surface along the flow;
//   * hanging locks at the lower hairline of the long styles (over the ears, nape, tousled) and at the tip of beards and goatees;
//   * the hanging beard mass is a lofted dense core with a coarse card skin over it.
// The flow follows a crown swirl for hair (uv: u = angle about the crown x radius 0.0993 m, v = surface distance from the crown) and runs down the face for beards. All uv are metres; the shader tiles
// the strand texture at HAIR_TEX.tile_u_m / tile_v_m. Vertex flag = coverage (bits 0..4) | variant (bits 5..7). Everything is deterministic (counter-based hash), tier PLAUSIBLE-PROCEDURAL (F-HAIR-CARDS).
import { v3, clamp, smooth } from './mathlib.mjs';
import { Mesh, loft } from './meshkit.mjs';
import { BI } from './body.mjs';
import { MAT } from './palette.mjs';
import { HAIR_TEX } from './hairtex.mjs';
import { hairField, beardField, baseSurf, headNoise as vn, HEAD_C, MOUTH_Y, headParams, buildHair, buildFacialHair, HAIR_STYLES, FACIAL_HAIR } from './head.mjs';
import { rand } from '../../../sim/rng.mjs';

const sm = smooth, BONE_HEAD = BI.head, BONE_JAW = BI.jaw, TU = HAIR_TEX.tile_u_m, TV = HAIR_TEX.tile_v_m, CROWN = [0.006, 0.112, -0.040], R0 = 24 * TU / (2 * Math.PI);
const FLAG = (cov, variant) => (Math.round(clamp(cov, 0, 1) * 31) & 31) | (variant << 5);
// style -> [mid variant, outer variant]: 1 straight, 2 wavy, 3 curly
const STYLE_VAR = [[1, 1], [1, 1], [1, 2], [2, 2], [1, 1], [1, 1], [2, 2], [2, 3]];
const covOf = c => Math.pow(clamp(c * 1.35, 0, 1), 1.25);

// one layer of a card shell on the canonical head: grid (nu x nv over the parametric sphere), thickness field f(th, ph, local) -> { c, t }
function cardShell(mesh, { nu, nv, field, variant, tf, add, uvFn, uo = 0, vo = 0, rangeV = [0, 1], jaw = false }) {
  const id = [], cov = [];
  for (let j = 0; j <= nv; j++) { id[j] = []; cov[j] = []; for (let i = 0; i <= nu; i++) {
    const vv = rangeV[0] + (rangeV[1] - rangeV[0]) * j / nv, th = Math.PI * vv, ph = Math.PI * (2 * i / nu - 1), S = baseSurf(th, ph), f = field(th, ph, S.local, S), c = variant === 0 ? sm(0.30, 0.75, covOf(f.c)) : covOf(f.c), h = f.c <= 0 ? 0.0006 + add : (f.t * tf + add) * (0.10 + 0.90 * sm(0, 0.55, f.c)) + 0.0006;      // never closer than 0.6 mm + the layer offset to the skin: no z-fighting veil
    const uv = uvFn(S.local, th, ph); cov[j][i] = c;
    id[j][i] = mesh.vert(v3.add(S.p, v3.mul(S.n, h)), S.n, uv[0] + uo, uv[1] + vo, MAT.HAIR_CARD, jaw && S.local[1] < MOUTH_Y + 0.012 ? [[BONE_JAW, 0.8], [BONE_HEAD, 0.2]] : [[BONE_HEAD, 1]], FLAG(c, variant)); } }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    if (!(cov[j][i] > 0.14 || cov[j + 1][i] > 0.14 || cov[j][i + 1] > 0.14 || cov[j + 1][i + 1] > 0.14)) continue;      // no veil of sparse fibres below 14 percent coverage
    const a = id[j][i], b = id[j + 1][i], c = id[j][i + 1], d = id[j + 1][i + 1]; mesh.tri(a, b, c); mesh.tri(b, d, c);
  }
}
// a ribbon along a polyline: width taper w0 -> w1, uv across = u0 + (0..TU), along = metres from the root, vertex flag f. Single-sided: the normal is the surface normal of its frame.
function ribbon(mesh, pts, widths, nrm, flag, skinFn, { uMode = 'tile', mat = MAT.HAIR_CARD } = {}) {
  const ids = []; let acc = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) acc += v3.len(v3.sub(pts[i], pts[i - 1]));
    const tg = v3.norm(v3.sub(pts[Math.min(pts.length - 1, i + 1)], pts[Math.max(0, i - 1)])), side = v3.norm(v3.cross(tg, nrm[i])), w = widths[i] / 2, sk = skinFn(pts[i]);
    const t = acc / Math.max(1e-6, v3.len(v3.sub(pts[pts.length - 1], pts[0])) * 1.0), vv = uMode === 'tile' ? acc : t * TV;
    ids.push([mesh.vert(v3.add(pts[i], v3.mul(side, -w)), nrm[i], 0, vv, mat, sk, flag), mesh.vert(v3.add(pts[i], v3.mul(side, w)), nrm[i], TU, vv, mat, sk, flag)]);
  }
  for (let i = 0; i < pts.length - 1; i++) { const [a, b] = ids[i], [c, d] = ids[i + 1]; mesh.tri(a, b, c); mesh.tri(b, d, c); }
}
const R = (s, i, k) => rand(0x7a11 + s, i, 0, k);
const surfPt = (th, ph) => baseSurf(th, ph);
// the flow direction at a surface point: away from the crown, projected on the tangent plane
function flowDir(S) { const p = v3.sub(S.local, CROWN), n = S.n, d = v3.sub(p, v3.mul(n, v3.dot(p, n))); return v3.len(d) < 1e-6 ? [0, 0, -1] : v3.norm(d); }

export function buildHairCards(style, lod) {
  if (lod >= 1) return buildHair(style, lod);
  const mesh = new Mesh('hair_' + HAIR_STYLES[style]), F = hairField(style), [vMid, vOut] = STYLE_VAR[style];
  const uvFn = (loc) => { const dx = loc[0] - CROWN[0], dz = loc[2] - CROWN[2], dy = CROWN[1] - loc[1], alpha = Math.atan2(dx, dz) + (style === 7 ? 0.9 * (vn(loc[0] * 38, loc[1] * 38, loc[2] * 38, 31) - 0.5) : 0) + (style === 2 ? 0.55 * Math.sign(loc[0] - 0.018) * sm(0.0, 0.05, Math.abs(loc[0] - 0.018)) : 0); return [alpha * R0, Math.hypot(Math.hypot(dx, dz), dy)]; };
  cardShell(mesh, { nu: 56, nv: 20, field: F, variant: 0, tf: 0.50, add: 0.0010, uvFn, uo: 0, vo: 0 });
  cardShell(mesh, { nu: 64, nv: 22, field: F, variant: vMid, tf: 0.80, add: 0.0016, uvFn, uo: 0.37 * TU, vo: 0.31 * TV });
  cardShell(mesh, { nu: 64, nv: 22, field: F, variant: vOut, tf: 1.00, add: 0.0030, uvFn, uo: 0.71 * TU, vo: 0.64 * TV });
  // flyaway ribbons: rooted on the outer layer where the coverage is high, lying along the flow, lifting off the surface
  const skH = () => [[BONE_HEAD, 1]]; let made = 0;
  for (let k = 0; k < 400 && made < 70; k++) {
    const th = Math.PI * (0.06 + 0.72 * R(style, k, 1)), ph = Math.PI * (2 * R(style, k, 2) - 1), S = surfPt(th, ph), f = F(th, ph, S.local, S); if (f.c < 0.55) continue;
    const dir = flowDir(S), n = S.n, len = 0.012 + 0.030 * R(style, k, 3), lift = 0.003 + 0.007 * R(style, k, 4), side = v3.norm(v3.cross(dir, n)), curl = (R(style, k, 5) - 0.5) * 0.012, h0 = f.t * 1.0 + 0.003 - 0.001, pts = [], nrm = [];
    for (let s = 0; s <= 3; s++) { const t = s / 3; pts.push(v3.add(v3.add(S.p, v3.mul(n, h0 + lift * t * t)), v3.add(v3.mul(dir, len * t), v3.mul(side, curl * Math.sin(t * 3.0))))); nrm.push(n); }
    ribbon(mesh, pts, [0.0011, 0.0010, 0.0007, 0.0003], nrm, FLAG(1, 6), skH, { uMode: 'norm' }); made++;
  }
  // hanging locks at the lower hairline of the long styles
  if ([3, 6, 7].includes(style)) {
    const N = style === 6 ? 30 : 24;
    for (let k = 0; k < N; k++) {
      const az = (k + 0.5 + 0.4 * (R(style, k, 6) - 0.5)) / N * 2 * Math.PI - Math.PI, th = Math.PI * 0.62 + 0.10 * R(style, k, 7), ph = az; const S = surfPt(th, ph); if (Math.cos(az) > 0.15) continue;      // locks hang at the sides and back only, never in front of the face
      const down = [0, -1, 0], n = S.n, len = (style === 6 ? 0.05 : 0.030) + 0.022 * R(style, k, 8), pts = [], nr = []; const w = 0.011 + 0.005 * R(style, k, 9);
      for (let s = 0; s <= 4; s++) { const t = s / 4, hh = 0.0105 + 0.012 * t + 0.008 * t * t; pts.push(v3.add(S.p, v3.add(v3.mul(n, hh), v3.mul(down, len * t)))); nr.push(v3.norm(v3.add(n, [0, 0.0, 0]))); }
      ribbon(mesh, pts, [w, w * 1.05, w * 0.95, w * 0.7, w * 0.35], nr, FLAG(1.0, 2), p => (p[1] < HEAD_C[1] - 0.06 ? [[BI.neck, 0.4], [BONE_HEAD, 0.6]] : [[BONE_HEAD, 1]]), { uMode: 'norm' });
    }
  }
  mesh.meta = { closed: false, openOk: true, cards: true };
  return mesh;
}

// ---- facial hair
export function buildBeardCards(type, lod) {
  if (type === 0) return new Mesh('beard_clean');
  if (lod >= 1) return buildFacialHair(type, lod);
  const mesh = new Mesh('beard_' + FACIAL_HAIR[type]), P = { ...headParams(0), stache: 1.0 }, field = (th, ph, loc) => beardField(type, P, th, ph, loc);
  const uvFn = loc => [Math.atan2(loc[0], loc[2]) * 0.08, 0.02 - loc[1] + 0.012 * loc[0] * loc[0] / 0.003];
  const rv = [0.44, 0.93], jawSk = (p) => [[BONE_JAW, p[1] - HEAD_C[1] < MOUTH_Y + 0.012 ? 0.8 : 0.0], [BONE_HEAD, p[1] - HEAD_C[1] < MOUTH_Y + 0.012 ? 0.2 : 1]];
  void jawSk;
  cardShell(mesh, { nu: 56, nv: 16, field, variant: 0, tf: 0.50, add: 0.0008, uvFn, uo: 0, vo: 0, rangeV: rv, jaw: true });
  cardShell(mesh, { nu: 64, nv: 18, field, variant: 4, tf: 1.0, add: 0.0016, uvFn, uo: 0.43 * TU, vo: 0.52 * TV, rangeV: rv, jaw: true });
  // flyaway ribbons along the edge of the beard (outer layer)
  const skB = p => [[BONE_JAW, p[1] - HEAD_C[1] < MOUTH_Y + 0.012 ? 0.8 : 0.1], [BONE_HEAD, p[1] - HEAD_C[1] < MOUTH_Y + 0.012 ? 0.2 : 0.9]]; let made = 0;
  for (let k = 0; k < 500 && made < 26; k++) {
    const th = Math.PI * (rv[0] + (rv[1] - rv[0]) * R(40 + type, k, 1)), ph = Math.PI * (2 * R(40 + type, k, 2) - 1), S = surfPt(th, ph), f = field(th, ph, S.local); if (f.c < 0.4) continue;
    const n = S.n, dir = v3.norm(v3.add([0, -1, 0], v3.mul(n, 0.15))), len = 0.012 + 0.02 * R(40 + type, k, 3), side = v3.norm(v3.cross(dir, n)), pts = [], nrm = [];
    for (let s = 0; s <= 3; s++) { const t = s / 3; pts.push(v3.add(v3.add(S.p, v3.mul(n, f.t + 0.002 + 0.006 * t * t)), v3.add(v3.mul(dir, len * t), v3.mul(side, (R(40 + type, k, 5) - 0.5) * 0.008 * Math.sin(t * 3))))); nrm.push(n); }
    ribbon(mesh, pts, [0.0012, 0.0011, 0.0008, 0.0003], nrm, FLAG(1, 6), skB, { uMode: 'norm' }); made++;
  }
  // the hanging mass of a full beard, goatee and chin curtain: a dense core and a coarse card skin over it, with locks at the tip
  if (type === 2 || type === 3 || type === 5) {
    const TAB = [[0, -0.086, 0.050, 0.030, 0.024], [0.15, -0.101, 0.060, 0.034, 0.028], [0.4, -0.122, 0.069, 0.033, 0.029], [0.7, -0.143, 0.073, 0.026, 0.024], [1, -0.160, 0.074, 0.006, 0.006]], kw = type === 3 ? 1 : type === 2 ? 0.42 : 0.80, kd = type === 3 ? 1 : type === 2 ? 0.45 : 0.55, kl = type === 3 ? 1 : type === 2 ? 0.45 : 0.5;
    const mk = (scale, variant, mat, flagCov) => loft(mesh, TAB.map(([t, y, z, ru, rv2], k) => ({ c: v3.add([0, -0.086 + (y + 0.086) * kl, z], HEAD_C), u: [1, 0, 0], v: [0, 0, 1], ru: Math.max(0.0008, ru * kw * scale), rv: Math.max(0.0008, rv2 * kd * scale), rfn: a => 1 + 0.05 * Math.sin(a * 9 + k * 1.3) })), { sides: 24, mat, skinFn: () => [[BONE_JAW, 0.85], [BONE_HEAD, 0.15]], capStart: false, capEnd: true, smoothNormals: true, flagFn: () => FLAG(flagCov, variant), uTile: 1, vTile: 1 });
    mk(0.88, 0, MAT.BEARD_CARD, 1); mk(1.0, 4, MAT.BEARD_CARD, 1);
    const nl = type === 3 ? 16 : 8, tipY = -0.086 + (-0.160 + 0.086) * kl;
    for (let k = 0; k < nl; k++) { const a = (k / nl) * 2 * Math.PI + 0.3, rx = 0.030 * kw * 0.85, rz = 0.024 * kd * 0.85, p0 = v3.add([Math.cos(a) * rx, tipY + 0.03 * kl, 0.074 + Math.sin(a) * rz], HEAD_C), len = 0.014 + 0.022 * R(60 + type, k, 1), pts = [], nr = [];
      for (let s = 0; s <= 3; s++) { const t = s / 3; pts.push(v3.add(p0, [Math.cos(a) * 0.004 * t, -len * t, 0.002 * Math.sin(a) * t])); nr.push([Math.cos(a), 0, Math.sin(a)]); }
      ribbon(mesh, pts, [0.0075, 0.0070, 0.0050, 0.0020], nr, FLAG(1, 4), () => [[BONE_JAW, 0.9], [BONE_HEAD, 0.1]], { uMode: 'norm', mat: MAT.BEARD_CARD }); }
  }
  mesh.meta = { closed: false, openOk: true, cards: true };
  return mesh;
}
