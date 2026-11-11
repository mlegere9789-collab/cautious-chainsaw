// Body proportions, region skinning and the naked parts (hands, feet) of the figure family. Garments (garments.mjs) are lofted over the same functions with an ease offset, so one set of body shapes
// (build x chest = 12 presets, shape keys on every body-conforming part) fits every coat, shirt and trouser. All numbers are PLAUSIBLE-PROCEDURAL proportions of an average adult male of 1.73 m
// (TIERS.json F-STATURE, F-BODY-PROPORTIONS): no anthropometric table was read for this task.
import { v3, clamp } from './mathlib.mjs';
import { Mesh, loft, tube, ellipsoid, limbProfile, chainSkin, rigid } from './meshkit.mjs';
import { humanRig } from './skeleton.mjs';
import { MAT } from './palette.mjs';

export const BI = humanRig.index;                                      // bone name -> index
export const H = n => humanRig.bones[BI[n]].head;                      // bone head (rest world position)
export const LODS = [0, 1, 2];
// resolution per LOD: sides around, rings along
export const RES = [{ torso: 40, tr: 16, limb: 18, lr: 7, small: 14 }, { torso: 14, tr: 6, limb: 9, lr: 3, small: 8 }, { torso: 7, tr: 3, limb: 5, lr: 1, small: 4 }];
// 12 body shapes = 4 builds x 3 chest/shoulder classes. build -1..1 (lean..stocky), chest -1..1 (narrow..broad). Presets are index = build*3 + chest.
export const BUILDS = [-1, -0.35, 0.35, 1], CHESTS = [-1, 0, 1];
export const BODY_SHAPES = Array.from({ length: 12 }, (_, i) => ({ id: i, g: BUILDS[Math.floor(i / 3)], c: CHESTS[i % 3] }));
export const SHAPE_KEYS = [{ name: 'lean', g: -1, c: 0 }, { name: 'stocky', g: 1, c: 0 }, { name: 'narrow', g: 0, c: -1 }, { name: 'broad', g: 0, c: 1 }];
export const NEUTRAL = { g: 0, c: 0 };

// torso key table: y, rx (half width), rz (half depth), cz (centre z). Interpolated linearly between rows.
const TORSO = [[0.50, 0.215, 0.130, -0.004], [0.70, 0.192, 0.122, -0.004], [0.84, 0.158, 0.112, -0.004], [0.92, 0.166, 0.118, -0.005], [1.00, 0.156, 0.112, 0.0], [1.06, 0.143, 0.104, 0.0], [1.16, 0.153, 0.110, 0.004], [1.26, 0.172, 0.120, 0.008], [1.34, 0.183, 0.113, 0.004], [1.40, 0.194, 0.100, 0.0], [1.44, 0.122, 0.078, 0.0], [1.47, 0.064, 0.064, 0.006]];
export function torsoAt(y, s = NEUTRAL) {
  let a = TORSO[0], b = TORSO[TORSO.length - 1]; if (y <= a[0]) { b = TORSO[1]; } else if (y >= b[0]) { a = TORSO[TORSO.length - 2]; } else for (let i = 0; i + 1 < TORSO.length; i++) if (y >= TORSO[i][0] && y <= TORSO[i + 1][0]) { a = TORSO[i]; b = TORSO[i + 1]; break; }
  const t = clamp((y - a[0]) / (b[0] - a[0]), 0, 1), L = k => a[k] + (b[k] - a[k]) * t, belly = Math.exp(-((y - 1.04) ** 2) / 0.012), chest = Math.exp(-((y - 1.30) ** 2) / 0.02);
  return { rx: L(1) * (1 + 0.075 * s.g + 0.055 * s.c * chest), rz: L(2) * (1 + 0.10 * s.g + 0.16 * s.g * belly + 0.05 * s.c * chest), cz: L(3) + 0.012 * s.g * belly };
}
export function torsoRings(y0, y1, n, ease, s = NEUTRAL, extra = null) {
  const rings = []; for (let i = 0; i < n; i++) { const y = y0 + (y1 - y0) * i / (n - 1), t = torsoAt(y, s), e = typeof ease === 'function' ? ease(y) : ease, x = extra ? extra(y) : { dx: 0, dz: 0 };
    rings.push({ c: [0, y, t.cz], u: [1, 0, 0], v: [0, 0, 1], ru: t.rx + e + x.dx, rv: t.rz + e + x.dz }); }
  return rings;
}
// limb radii (metres) with the build shape applied
export const ARM_DIR = [Math.sin(20 * Math.PI / 180), -Math.cos(20 * Math.PI / 180), 0];
export function armPts(side) { const x = side === 'L' ? 1 : -1, m = p => [p[0] * x, p[1], p[2]]; return { sh: m(H('upperarm_L')), el: m(H('forearm_L')), wr: m(H('hand_L')) }; }
export const limbScale = s => 1 + 0.10 * s.g;
export function legPts(side) { const x = side === 'L' ? 1 : -1, m = p => [p[0] * x, p[1], p[2]]; return { hip: m(H('thigh_L')), knee: m(H('shin_L')), ankle: m(H('foot_L')), toe: m(H('toe_L')) }; }

// ---- region skin functions
export const skinTorso = chainSkin([{ bone: BI.pelvis, a: H('pelvis') }, { bone: BI.spine1, a: H('spine1') }, { bone: BI.spine2, a: H('spine2') }, { bone: BI.spine3, a: H('spine3') }, { bone: BI.neck, a: H('neck') }, { bone: BI.neck, a: [0, 1.47, 0.01] }], 0.07);
export const skinArm = s => chainSkin([{ bone: BI['upperarm_' + s], a: H('upperarm_' + s) }, { bone: BI['forearm_' + s], a: H('forearm_' + s) }, { bone: BI['hand_' + s], a: H('hand_' + s) }, { bone: BI['hand_' + s], a: v3.add(H('hand_' + s), v3.mul(ARM_DIR, 0.2)) }], 0.04);
export const skinLeg = s => chainSkin([{ bone: BI['thigh_' + s], a: H('thigh_' + s) }, { bone: BI['shin_' + s], a: H('shin_' + s) }, { bone: BI['foot_' + s], a: H('foot_' + s) }, { bone: BI['toe_' + s], a: H('toe_' + s) }, { bone: BI['toe_' + s], a: [H('toe_' + s)[0], 0.02, 0.2] }], 0.045);
// the torso skin near the shoulders mixes in the clavicle/upper arm for the deltoid (a point beyond |x| 0.16 and above y 1.28 leans to the arm bone)
export function skinTorsoShoulder(s) {
  const base = skinTorso, side = s === 'L' ? 1 : -1;
  return p => { const w = base(p); const k = clamp((Math.abs(p[0]) - 0.15) / 0.05, 0, 1) * clamp((p[1] - 1.28) / 0.08, 0, 1) * (p[0] * side > 0 ? 1 : 0) * 0.5; if (k <= 0) return w; return [...w.map(([b, x]) => [b, x * (1 - k)]), [BI['upperarm_' + s], k]]; };
}
export function skinTorsoBoth() { const L = skinTorsoShoulder('L'), R = skinTorsoShoulder('R'); return p => (p[0] >= 0 ? L(p) : R(p)); }

// ---- hands (naked, with fingers at LOD0): left/right. LOD0: palm, thenar and hypothenar pads, four knuckle bumps, wrist, four fingers of three visible phalanges (the rig has two finger bones: the middle and
// distal phalanges share bone 2) with joint bulges and nails, thumb with its pad. Dimensions are plausible-procedural (F-BODY-PROPORTIONS).
export function buildHand(side, lod, mesh = new Mesh('hand_' + side)) {
  const x = side === 'L' ? 1 : -1, wr = H('hand_' + side), d = ARM_DIR, palmC = v3.add(wr, v3.mul(d, 0.048)), bh = BI['hand_' + side];
  if (lod >= 2) return mesh;                                                // the far mesh has no hand (the weapon grip hides it)
  if (lod === 1) { ellipsoid(mesh, palmC, [0.022, 0.07, 0.04], 8, 5, { mat: MAT.SKIN, skinFn: p => [[bh, 1]], rot: null }); return mesh; }
  const dors = [x, 0, 0], skH = () => [[bh, 1]];
  ellipsoid(mesh, palmC, [0.0185, 0.050, 0.039], 16, 10, { mat: MAT.SKIN, skinFn: skH });                                                       // palm
  ellipsoid(mesh, v3.add(wr, [x * -0.006, -0.012, 0.024]), [0.014, 0.030, 0.020], 10, 6, { mat: MAT.SKIN, skinFn: skH });                          // thenar pad
  ellipsoid(mesh, v3.add(wr, [x * -0.004, -0.020, -0.026]), [0.012, 0.026, 0.016], 8, 5, { mat: MAT.SKIN, skinFn: skH });                         // hypothenar pad
  tube(mesh, v3.add(wr, v3.mul(d, -0.014)), v3.add(wr, v3.mul(d, 0.016)), [[0, 0.0235], [1, 0.0265]], { sides: 14, mat: MAT.SKIN, skinFn: skH, ey: 1.25, smoothNormals: true });           // wrist
  for (const f of ['index', 'middle', 'ring', 'pinky', 'thumb']) {
    const B1 = BI[f + '1_' + side], B2 = BI[f + '2_' + side], b1 = humanRig.bones[B1], b2 = humanRig.bones[B2], a = b1.head, m = b2.head, e = b2.tail, mm = v3.lerp(m, e, 0.5), thumb = f === 'thumb';
    const r0 = thumb ? 0.0108 : f === 'pinky' ? 0.0078 : 0.0090, r1 = r0 * 0.93, r2 = r0 * 0.85, r3 = r0 * 0.74, sk1 = () => [[B1, 1]], sk2 = () => [[B2, 1]], skJ = () => [[B1, 0.5], [B2, 0.5]];
    const seg = (p, q, ra, rb, sk, cap) => tube(mesh, p, q, limbProfile(ra, rb, 2, cap), { sides: 7, mat: MAT.SKIN, skinFn: sk, ey: 0.92, smoothNormals: true });
    seg(a, m, r0, r1, sk1, 0); seg(m, mm, r1, r2, sk2, 0); seg(mm, e, r2, r3, sk2, 0.30);
    ellipsoid(mesh, a, [r0 * 1.12, r0 * 1.0, r0 * 1.12], 6, 4, { mat: MAT.SKIN, skinFn: sk1 });                                                    // knuckle (metacarpophalangeal)
    ellipsoid(mesh, m, [r1 * 1.1, r1 * 0.9, r1 * 1.08], 6, 4, { mat: MAT.SKIN, skinFn: skJ });                                                    // proximal interphalangeal joint
    ellipsoid(mesh, mm, [r2 * 1.06, r2 * 0.8, r2 * 1.04], 6, 4, { mat: MAT.SKIN, skinFn: sk2 });                                                   // distal joint
    const nailC = v3.add(v3.lerp(mm, e, thumb ? 0.62 : 0.55), v3.mul(thumb ? [0, 0, 1] : dors, r3 * 0.88));
    ellipsoid(mesh, nailC, thumb ? [0.0035, 0.0062, 0.0014] : [0.0012, 0.0065, 0.0040], 6, 4, { mat: MAT.NAIL, skinFn: sk2 });                         // nail
  }
  return mesh;
}
// a bare foot (barefoot / torn-shoe variants), closed volume; LOD0 adds heel, arch, ankle bones and five toes with nails
export function buildFoot(side, lod, mesh = new Mesh('foot_' + side)) {
  const x = side === 'L' ? 1 : -1; if (lod >= 2) { return mesh; }
  const sk = p => [[BI['foot_' + side], p[2] > 0.06 ? 0.4 : 1], [BI['toe_' + side], p[2] > 0.06 ? 0.6 : 0]];
  const s = lod === 0 ? 20 : 8; ellipsoid(mesh, [x * 0.092, 0.05, 0.06], [0.04, 0.045, 0.12], s, Math.round(s * 0.7), { mat: MAT.SKIN, skinFn: sk });
  if (lod === 0) {
    ellipsoid(mesh, [x * 0.092, 0.036, -0.045], [0.032, 0.036, 0.034], 12, 8, { mat: MAT.SKIN, skinFn: sk });                                       // heel
    for (const sgn of [1, -1]) ellipsoid(mesh, [x * 0.092 + sgn * 0.034, 0.085, -0.004], [0.010, 0.011, 0.012], 8, 5, { mat: MAT.SKIN, skinFn: sk });  // ankle bones
    for (let t = 0; t < 5; t++) { const tx = x * (0.092 + (2 - t) * 0.0105 * 1.0), len = t === 2 ? 0.026 : t === 0 ? 0.034 : 0.022; const ang = (t - 2) * 0.05; const a = [tx, 0.020, 0.150], b = [tx + Math.sin(ang) * len, 0.016, 0.150 + len];
      tube(mesh, a, b, limbProfile(t === 2 ? 0.0105 : 0.0082, 0.0075, 2, 0.28), { sides: 10, mat: MAT.SKIN, skinFn: p => [[BI['toe_' + side], 1]], smoothNormals: true });
      ellipsoid(mesh, [b[0], b[1] + 0.006, b[2] - 0.004], [0.0045, 0.0012, 0.004], 6, 4, { mat: MAT.NAIL, skinFn: p => [[BI['toe_' + side], 1]] }); }
  }
  return mesh;
}
