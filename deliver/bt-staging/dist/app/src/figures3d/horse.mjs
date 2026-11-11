// Horse model with tack (cavalry McClellan saddle set from the kit catalogue: mcclellan_saddle_m1859, bridle_union_cav, horse_furniture_union_misc, holster/carbine items) and draught harness for the
// artillery teams. Proportions are PLAUSIBLE-PROCEDURAL (about 15 hands, withers 1.49 m, TIERS.json F-HORSE-SIZE); the kit data holds no horse measurement and no coat colour (PDF gap: the colours here are
// a tuning palette, F-GAP-HORSE-COLOUR). Built over horseRig (its own bone index space).
// Film-grade round 2 (2026-10-31): the old model was a tube barrel, a boxy neck and head and tube legs. Now: a trunk of egg-shaped sections (withers, back dip, loin, croup, barrel, girth, brisket), a neck and
// a head swept along curved paths with their own sections (crest, throatlatch, jowl, bridge of the nose, muzzle), shoulder, haunch and thigh muscle masses, legs lofted with true section taper (forearm
// muscle, flat knee, tendon behind the cannon bone, fetlock joint, pastern, hoof wall with a coronet band; the hock with its point), mane as a crest ribbon plus strands, forelock, tail, ears as leaf lofts,
// and tack re-laid on the real back line (the saddle seat is at the rider socket, the stirrup treads at the human foot socket).
import { v3 } from './mathlib.mjs';
import { Mesh, loft, tube, ellipsoid, box, limbProfile, chainSkin, strap } from './meshkit.mjs';
import { horseRig } from './skeleton.mjs';
import { MAT } from './palette.mjs';
import { strands, pathTube, sphereCap, stitches, rivet, roundBox, seam } from './detail.mjs';

const HI = horseRig.index, HB = n => horseRig.bones[HI[n]].head;
const skBody = chainSkin([{ bone: HI.pelvis, a: HB('pelvis') }, { bone: HI.spine1, a: HB('spine1') }, { bone: HI.spine2, a: HB('spine2') }, { bone: HI.withers, a: HB('withers') }, { bone: HI.withers, a: [0, 1.46, 0.7] }], 0.12);
const skNeck = chainSkin([{ bone: HI.withers, a: HB('withers') }, { bone: HI.neck1, a: HB('neck1') }, { bone: HI.neck2, a: HB('neck2') }, { bone: HI.head, a: HB('head') }, { bone: HI.head, a: [0, 1.6, 1.25] }], 0.08);
const legSkin = (s, front) => front ? chainSkin([{ bone: HI['scapula_' + s], a: HB('scapula_' + s) }, { bone: HI['humerus_' + s], a: HB('humerus_' + s) }, { bone: HI['radius_' + s], a: HB('radius_' + s) }, { bone: HI['fcannon_' + s], a: HB('fcannon_' + s) }, { bone: HI['fpastern_' + s], a: HB('fpastern_' + s) }, { bone: HI['fhoof_' + s], a: HB('fhoof_' + s) }, { bone: HI['fhoof_' + s], a: [HB('fhoof_' + s)[0], 0.0, HB('fhoof_' + s)[2]] }], 0.05)
  : chainSkin([{ bone: HI['femur_' + s], a: HB('femur_' + s) }, { bone: HI['tibia_' + s], a: HB('tibia_' + s) }, { bone: HI['hcannon_' + s], a: HB('hcannon_' + s) }, { bone: HI['hpastern_' + s], a: HB('hpastern_' + s) }, { bone: HI['hhoof_' + s], a: HB('hhoof_' + s) }, { bone: HI['hhoof_' + s], a: [HB('hhoof_' + s)[0], 0.0, HB('hhoof_' + s)[2]] }], 0.05);
const rig = b => () => [[HI[b], 1]];
const ssm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// the egg-shaped cross-section: the top is narrower than the middle (the back and the withers are narrow above a deep rib barrel); pointed top shoulders
const EGG = k => a => { const s = Math.sin(a), c = Math.cos(a); return 1 - k * Math.max(0, s) ** 2 * Math.abs(c) ** 0.8 + 0.04 * Math.max(0, -s) * Math.abs(c); };
// rings along a curve in the sagittal plane: the frame is lateral (x) and the in-plane perpendicular to the path
function pathRings(path, rfn = null) {
  return path.map((p, i) => { const a = path[Math.max(0, i - 1)].c, b = path[Math.min(path.length - 1, i + 1)].c, t = v3.norm(v3.sub(b, a));      // v: the in-plane perpendicular (up for a forward path)
    return { c: p.c, u: [1, 0, 0], v: v3.norm([0, t[2], -t[1]]), ru: p.rx, rv: p.rv, rfn: p.rfn ?? rfn }; });
}

export function buildHorse(lod, kind = 'riding', opt = {}) {
  const mesh = new Mesh('horse:' + kind), sd = [28, 7, 5][lod], lsd = [14, 5, 4][lod], M = MAT.HORSE_COAT, F0 = lod === 0;
  // ---- trunk: sections from the dock to the brisket: [z, y_top, y_bottom, half width]. The back line dips to 1.40 at the saddle and rises to the withers at 1.49 (the rig's withers bone).
  const T = [[-0.86, 1.435, 1.18, 0.085], [-0.76, 1.460, 1.08, 0.150], [-0.60, 1.470, 0.98, 0.205], [-0.42, 1.460, 0.93, 0.215], [-0.22, 1.440, 0.88, 0.200], [-0.04, 1.430, 0.835, 0.215], [0.16, 1.440, 0.80, 0.230], [0.34, 1.505, 0.80, 0.222], [0.50, 1.530, 0.82, 0.205], [0.64, 1.495, 0.88, 0.170], [0.74, 1.415, 0.98, 0.120], [0.78, 1.315, 1.06, 0.060]];
  const dense = []; if (F0) for (let i = 0; i < 22; i++) { const f = i / 21 * (T.length - 1), j = Math.min(T.length - 2, Math.floor(f)), t = f - j, u = t * t * (3 - 2 * t); dense.push(T[j].map((v, c) => v + (T[j + 1][c] - v) * u)); }
  // round 3: LOD1/LOD2 take the same smoothstep-interpolated sections at 7 / 5 stations (the old 5 and 4 raw table rows gave long flat panels between rings: the polygonal LOD1/LOD2 horse)
  const sect = n => Array.from({ length: n }, (_, i) => { const f = i / (n - 1) * (T.length - 1), j = Math.min(T.length - 2, Math.floor(f)), t = f - j, u = t * t * (3 - 2 * t); return T[j].map((v, c) => v + (T[j + 1][c] - v) * u); });
  const use = F0 ? dense : lod === 1 ? sect(10) : sect(6);
  loft(mesh, use.map(([z, yt, yb, w]) => ({ c: [0, (yt + yb) / 2, z], u: [1, 0, 0], v: [0, 1, 0], ru: w, rv: (yt - yb) / 2, rfn: EGG(0.20) })), { sides: [32, 8, 6][lod], mat: M, skinFn: skBody, capStart: true, capEnd: true });
  // ---- neck (crest and throat), swept from inside the chest to the poll; then the head swept from the poll to the muzzle
  const neck = [{ c: [0, 1.185, 0.46], rx: 0.185, rv: 0.30 }, { c: [0, 1.275, 0.56], rx: 0.160, rv: 0.255 }, { c: [0, 1.40, 0.70], rx: 0.130, rv: 0.215 }, { c: [0, 1.53, 0.835], rx: 0.108, rv: 0.172 }, { c: [0, 1.645, 0.945], rx: 0.092, rv: 0.138 }];
  loft(mesh, pathRings(lod === 2 ? [neck[0], neck[2], neck[4]] : lod === 1 ? [neck[0], neck[1], neck[2], neck[3], neck[4]] : neck), { sides: sd, mat: M, skinFn: skNeck, capStart: false, capEnd: false });
  const head = [{ c: [0, 1.715, 0.955], rx: 0.080, rv: 0.120 }, { c: [0, 1.665, 1.025], rx: 0.088, rv: 0.108 }, { c: [0, 1.595, 1.105], rx: 0.068, rv: 0.082 }, { c: [0, 1.525, 1.185], rx: 0.058, rv: 0.062 }, { c: [0, 1.480, 1.228], rx: 0.054, rv: 0.050 }, { c: [0, 1.466, 1.243], rx: 0.044, rv: 0.036 }];
  loft(mesh, pathRings(lod === 2 ? [head[0], head[3], head[5]] : lod === 1 ? [head[0], head[1], head[3], head[5]] : head, a => 1 - 0.08 * Math.max(0, Math.sin(a)) ** 3), { sides: sd, mat: M, skinFn: skNeck, capStart: true, capEnd: true });
  // ears: leaf-shaped lofts (flat, pointed, curved inward); eyes with lids
  for (const s of [1, -1]) {
    if (lod <= 1) loft(mesh, [{ c: [s * 0.060, 1.800, 0.985], u: [1, 0, 0], v: [0, 0, 1], ru: 0.020, rv: 0.012 }, { c: [s * 0.066, 1.850, 0.972], u: [1, 0, 0], v: [0, 0, 1], ru: 0.022, rv: 0.014 }, { c: [s * 0.070, 1.905, 0.962], u: [1, 0, 0], v: [0, 0, 1], ru: 0.011, rv: 0.008 }, { c: [s * 0.070, 1.935, 0.960], u: [1, 0, 0], v: [0, 0, 1], ru: 0.0015, rv: 0.0015 }], { sides: F0 ? 8 : 4, mat: M, skinFn: () => [[HI['ear_' + (s > 0 ? 'L' : 'R')], 1]], capStart: true, capEnd: true });
    if (F0) ellipsoid(mesh, [s * 0.087, 1.672, 1.040], [0.013, 0.0125, 0.0105], 8, 6, { mat: MAT.EYE_DARK, skinFn: rig('head') });
  }
  // ---- legs: every leg is one loft along the bone chain with true section taper (rx lateral, rz fore-aft); rings at joints use the bisector direction so the bend does not pinch
  const legLoft = (pts, sec, sk, sides) => {
    const rings = pts.map((c, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], t = v3.norm(v3.sub(b, a)), fa = v3.norm(v3.cross([1, 0, 0], t)), uu = v3.norm(v3.cross(t, fa)); void uu; return { c, u: [1, 0, 0], v: fa[2] < 0 ? v3.mul(fa, -1) : fa, ru: sec[i][0] * 1.16, rv: sec[i][1] * 1.10 }; });
    return loft(mesh, rings, { sides, mat: M, skinFn: sk, capStart: true, capEnd: true });
  };
  const L = (lod === 0 ? 1 : 0);
  for (const s of ['L', 'R']) {
    const x = s === 'L' ? 1 : -1, hx = n => HB(n + '_' + s);
    // front leg: shoulder point, forearm (muscle on the outside), knee, cannon with the tendon behind it, fetlock, pastern, coronet
    const fl = [[x * 0.160, 1.100, 0.535], [x * 0.162, 1.000, 0.530], [x * 0.162, 0.880, 0.525], [x * 0.162, 0.740, 0.523], [x * 0.162, 0.620, 0.522], [x * 0.162, 0.550, 0.520], [x * 0.162, 0.500, 0.521], [x * 0.162, 0.360, 0.527], [x * 0.162, 0.230, 0.534], [x * 0.162, 0.150, 0.538], [x * 0.162, 0.105, 0.556], [x * 0.162, 0.075, 0.590]];
    const fs = [[0.050, 0.074], [0.056, 0.084], [0.058, 0.080], [0.052, 0.064], [0.046, 0.056], [0.046, 0.060], [0.033, 0.045], [0.027, 0.036], [0.026, 0.034], [0.031, 0.040], [0.028, 0.032], [0.032, 0.036]];
    const pick = lod === 0 ? fl.map((_, i) => i) : lod === 1 ? [0, 3, 5, 7, 11] : [0, 5, 11];
    legLoft(pick.map(i => fl[i]), pick.map(i => fs[i]), legSkin(s, true), lsd);
    // hind leg: thigh and stifle, gaskin, hock with its point, cannon, fetlock, pastern
    const hl = [[x * 0.168, 1.240, -0.520], [x * 0.172, 1.080, -0.460], [x * 0.168, 0.950, -0.420], [x * 0.162, 0.830, -0.490], [x * 0.158, 0.700, -0.570], [x * 0.155, 0.560, -0.620], [x * 0.153, 0.470, -0.615], [x * 0.153, 0.330, -0.600], [x * 0.153, 0.210, -0.588], [x * 0.153, 0.145, -0.582], [x * 0.153, 0.105, -0.562], [x * 0.153, 0.075, -0.535]];
    const hs = [[0.100, 0.150], [0.098, 0.140], [0.090, 0.120], [0.070, 0.095], [0.056, 0.074], [0.048, 0.078], [0.034, 0.046], [0.027, 0.036], [0.026, 0.034], [0.031, 0.040], [0.028, 0.032], [0.032, 0.036]];
    const ph = lod === 0 ? hl.map((_, i) => i) : lod === 1 ? [0, 3, 5, 8, 11] : [0, 5, 11];
    legLoft(ph.map(i => hl[i]), ph.map(i => hs[i]), legSkin(s, false), lsd);
    // hooves: a truncated cone with a sloping front wall and a coronet band, flat sole
    for (const f of ['f', 'h']) { const hf = hx(f + 'hoof'), sk = rig(f + 'hoof_' + s), sl = f === 'f' ? 0.032 : 0.026, sgn = f === 'f' ? 1 : 1;
      loft(mesh, [{ c: [hf[0], 0.083, hf[2] + 0.004], u: [1, 0, 0], v: [0, 0, 1], ru: 0.040, rv: 0.044 }, { c: [hf[0], 0.062, hf[2] + 0.010], u: [1, 0, 0], v: [0, 0, 1], ru: 0.047, rv: 0.054 }, { c: [hf[0], 0.030, hf[2] + 0.020 * sgn], u: [1, 0, 0], v: [0, 0, 1], ru: 0.058, rv: 0.070 }, { c: [hf[0], 0.0, hf[2] + sl], u: [1, 0, 0], v: [0, 0, 1], ru: 0.064, rv: 0.078 }], { sides: lod === 0 ? 14 : 4, mat: MAT.HORSE_HOOF, skinFn: sk, capStart: false, capEnd: true }); }
    if (F0) {
      // muscle masses: shoulder, forearm top, gaskin, haunch, stifle, croup, point of hock, fetlock feathers, knee pad
      const sH = chainSkin([{ bone: HI.pelvis, a: HB('pelvis') }, { bone: HI.spine1, a: HB('spine1') }, { bone: HI.spine2, a: HB('spine2') }, { bone: HI.withers, a: HB('withers') }], 0.1);
      ellipsoid(mesh, [x * 0.178, 1.285, 0.505], [0.040, 0.140, 0.112], 14, 10, { mat: M, skinFn: sH });                                      // shoulder (deltoid and triceps long head)
      ellipsoid(mesh, [x * 0.187, 1.085, 0.545], [0.042, 0.088, 0.075], 12, 8, { mat: M, skinFn: sH });                                       // point of the elbow / chest muscle
      ellipsoid(mesh, [x * 0.200, 1.265, -0.560], [0.075, 0.185, 0.205], 16, 10, { mat: M, skinFn: sH });                                     // haunch (gluteals and biceps femoris)
      ellipsoid(mesh, [x * 0.175, 0.985, -0.475], [0.050, 0.130, 0.080], 12, 8, { mat: M, skinFn: sH });                                      // thigh (semitendinosus)
      ellipsoid(mesh, [x * 0.150, 1.380, -0.680], [0.072, 0.052, 0.112], 12, 8, { mat: M, skinFn: sH });                                      // croup (rounded rump)
      ellipsoid(mesh, [x * 0.158, 0.490, -0.670], [0.020, 0.052, 0.032], 8, 6, { mat: M, skinFn: rig('hcannon_' + s) });                      // point of the hock
      ellipsoid(mesh, [x * 0.162, 0.535, 0.500], [0.040, 0.052, 0.035], 8, 6, { mat: M, skinFn: rig('radius_' + s) });                        // knee front
      for (const f of ['f', 'h']) { const fp = hx(f + 'pastern'), skf = rig(f + 'pastern_' + s); ellipsoid(mesh, [fp[0], fp[1] + 0.015, fp[2] - (f === 'f' ? 0.016 : -0.012)], [0.034, 0.030, 0.034], 10, 7, { mat: M, skinFn: skf });                   // fetlock joint
        strands(mesh, 10, i => ({ p: [fp[0] + ((i % 5) - 2) * 0.006, fp[1] + 0.000, fp[2] + (f === 'f' ? -0.034 : 0.030)], dir: [((i % 3) - 1) * 0.1, -0.9, f === 'f' ? -0.25 : 0.25] }), { len: 0.045, r: 0.0011, mat: MAT.HORSE_MANE, skinFn: skf, curl: 0.002, seed: 71 + i2(f, s), segs: 2 });   // feather
        const ring = []; for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, hf = hx(f + 'hoof'); ring.push([hf[0] + Math.sin(a) * 0.064, 0.006, hf[2] + 0.026 + Math.cos(a) * 0.077 * (Math.cos(a) < 0 ? 0.82 : 1)]); }
        pathTube(mesh, ring, 0.0048, { sides: 5, mat: MAT.IRON, skinFn: rig(f + 'hoof_' + s), closed: true });                                        // horseshoe
        for (let i = 0; i < 6; i++) { const a = (0.7 + i * 0.37) * (i % 2 ? 1 : -1) + Math.PI, hf = hx(f + 'hoof'); rivet(mesh, [hf[0] + Math.sin(a) * 0.064, 0.012, hf[2] + 0.026 + Math.cos(a) * 0.077], [Math.sin(a), 0.3, Math.cos(a)], 0.0040, { mat: MAT.IRON, skinFn: rig(f + 'hoof_' + s), sides: 6 }); } }
    }
  }
  if (F0) horseHead(mesh);
  // ---- mane (a crest ribbon plus strands), forelock, tail
  if (lod <= 1) {
    const crest = [[0, 1.775, 0.905], [0, 1.700, 0.835], [0, 1.620, 0.745], [0, 1.545, 0.650], [0, 1.495, 0.545]];
    loft(mesh, pathRings(crest.map((c, i) => ({ c: [0.012 * 0, c[1] + 0.012, c[2] - 0.004], rx: 0.016, rv: 0.050 - 0.004 * i }))), { sides: lod === 0 ? 6 : 4, mat: MAT.HORSE_MANE, skinFn: skNeck, capStart: true, capEnd: true });
    tube(mesh, HB('tail1'), [0, 0.80, -0.99], [[0, 0.045], [0.4, 0.062], [0.75, 0.05], [1, 0.012]], { sides: lod === 0 ? 8 : 4, mat: MAT.HORSE_MANE, skinFn: p => [[p[1] > 1.1 ? HI.tail1 : p[1] > 0.95 ? HI.tail2 : HI.tail3, 1]], capStart: true, capEnd: true });
  }
  tack(mesh, lod, kind, opt, sd);
  if (lod === 0) horseStrands(mesh);
  mesh.meta = { closed: false, openOk: true, rig: 'horse' };
  return mesh;
}
// the point the reins pass through, in the horse frame (rest pose, metres), measured on the posed hand mesh of the baked clip rider_walk
export const REIN_HAND = [0.122, 1.662, 0.473];      // the centre of the closed left fist (grip 0.92) over a rider_walk cycle; the clip's palm SOCKET is at (0.153, 1.665, 0.443), the fist centre of the hand mesh lies (-0.031, -0.003, +0.030) from it
function catmull(P, n) { const out = []; for (let i = 0; i < P.length - 1; i++) { const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)]; for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push([0, 1, 2].map(c => 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3))); } } out.push(P[P.length - 1]); return out; }
const i2 = (f, s) => (f === 'f' ? 0 : 20) + (s === 'L' ? 0 : 10);
// head features at LOD0: cheek, jaw, forehead, nostrils, muzzle lips, eyes with lids, inner ears
function horseHead(mesh) {
  const sH = rig('head'), M = MAT.HORSE_COAT;
  for (const x of [1, -1]) {
    ellipsoid(mesh, [x * 0.039, 1.490, 1.228], [0.016, 0.011, 0.018], 8, 6, { mat: MAT.EYE_DARK, skinFn: sH });                                  // nostril
    ellipsoid(mesh, [x * 0.037, 1.520, 1.206], [0.022, 0.016, 0.036], 10, 7, { mat: M, skinFn: sH });                                            // nostril wing
    ellipsoid(mesh, [x * 0.084, 1.668, 1.040], [0.014, 0.0135, 0.011], 12, 8, { mat: MAT.EYE_WHITE, skinFn: sH });                               // eyeball
    sphereCap(mesh, [x * 0.0955, 1.668, 1.040], 0.0105, { th0: 0, th1: 1.0, nu: 10, nv: 4, mat: MAT.EYE_DARK, skinFn: sH, rot: Float64Array.from([0, 0, x, 0, 0, 1, 0, 0, -x, 0, 0, 0, 0, 0, 0, 1]) });
    ellipsoid(mesh, [x * 0.090, 1.686, 1.040], [0.016, 0.006, 0.014], 10, 5, { mat: M, skinFn: sH });                                            // upper lid
    ellipsoid(mesh, [x * 0.090, 1.651, 1.040], [0.015, 0.004, 0.012], 10, 5, { mat: M, skinFn: sH });                                            // lower lid
    ellipsoid(mesh, [x * 0.074, 1.640, 1.085], [0.040, 0.055, 0.062], 14, 9, { mat: M, skinFn: sH });                                            // cheek and jowl (the masseter)
    ellipsoid(mesh, [x * 0.050, 1.735, 1.000], [0.034, 0.040, 0.050], 10, 7, { mat: M, skinFn: sH });                                            // forehead / brow bone over the eye
    ellipsoid(mesh, [x * 0.027, 1.455, 1.236], [0.018, 0.016, 0.014], 8, 6, { mat: M, skinFn: rig('jaw') });                                     // lip
    ellipsoid(mesh, [x * 0.060, 1.800, 0.985], [0.011, 0.027, 0.008], 8, 5, { mat: MAT.SADDLE_LEATHER, skinFn: sH });                           // inner ear (shadow tone)
  }
  ellipsoid(mesh, [0, 1.447, 1.240], [0.030, 0.014, 0.014], 10, 6, { mat: M, skinFn: rig('jaw') });                                              // chin groove
}
function horseStrands(mesh) {
  const sH = rig('head');
  strands(mesh, 70, i => { const t = i / 69; return { p: [0.010, 1.795 - 0.285 * t, 0.915 - 0.40 * t], dir: [0.55 + (i % 3) * 0.05, -0.55, -0.1] }; }, { len: 0.30, r: 0.0011, mat: MAT.HORSE_MANE, skinFn: p => (p[2] > 0.7 ? [[HI.neck2, 1]] : [[HI.neck1, 1]]), curl: 0.004, seed: 61, segs: 3 });
  strands(mesh, 12, i => ({ p: [(i % 4 - 1.5) * 0.008, 1.800, 1.015], dir: [0, -0.4, 0.8] }), { len: 0.18, r: 0.0013, mat: MAT.HORSE_MANE, skinFn: sH, curl: 0.004, seed: 62, segs: 3 });
  strands(mesh, 90, i => ({ p: [((i % 9) - 4) * 0.007, 1.36 - (i % 5) * 0.012, -0.88 - Math.floor(i / 30) * 0.02], dir: [((i % 7) - 3) * 0.03, -1, -0.25] }), { len: 0.70, r: 0.0013, mat: MAT.HORSE_MANE, skinFn: p => [[p[1] > 1.1 ? HI.tail1 : p[1] > 0.95 ? HI.tail2 : HI.tail3, 1]], curl: 0.003, seed: 63, segs: 4 });
}

// ---- tack on the real back line. McClellan saddle seat top at 1.48 (the rider socket is spine2 + 0.10 = 1.54 for the pelvis); stirrup treads at 0.96 (the human foot socket: stirrup bone 1.30 - 0.35).
function tack(mesh, lod, kind, opt, sd) {
  if (kind === 'riding' && !opt.tackless) {
    const sk = rig('spine2');
    if (lod <= 1) {
      box(mesh, [0, 1.443, 0.06], [0.215, 0.012, 0.32], { mat: MAT.SADDLE_BLANKET, skinFn: sk });                                               // saddle blanket
      loft(mesh, [{ c: [0, 1.510, -0.20], u: [1, 0, 0], v: [0, 1, 0], ru: 0.100, rv: 0.050 }, { c: [0, 1.505, 0.04], u: [1, 0, 0], v: [0, 1, 0], ru: 0.082, rv: 0.045 }, { c: [0, 1.530, 0.28], u: [1, 0, 0], v: [0, 1, 0], ru: 0.070, rv: 0.050 }], { sides: lod === 0 ? 8 : 6, mat: MAT.SADDLE_LEATHER, skinFn: sk, capStart: true, capEnd: true });
    }
    if (lod === 0) {
      box(mesh, [0, 1.4545, 0.06], [0.040, 0.003, 0.32], { mat: MAT.PIPING_YELLOW, skinFn: sk });
      for (const s of [1, -1]) {
        const sks = rig('tack_stirrup_' + (s > 0 ? 'L' : 'R'));
        strap(mesh, [[s * 0.150, 1.480, 0.040], [s * 0.232, 1.32, 0.040], [s * 0.272, 1.14, 0.040], [s * 0.285, 0.99, 0.040]], 0.024, 0.0055, { mat: MAT.SADDLE_LEATHER, skinFn: sks });     // stirrup leather from the saddle bar to the tread
        const iron = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI * 2; iron.push([s * (0.285 + Math.cos(a) * 0.048), 0.955 + Math.sin(a) * 0.036 + 0.036, 0.040]); }
        pathTube(mesh, iron, 0.0058, { sides: 5, mat: MAT.IRON, skinFn: sks, closed: true });                                                       // stirrup iron
        roundBox(mesh, [s * 0.285, 0.961, 0.040], [0.044, 0.0035, 0.040], 0.002, { mat: MAT.IRON, skinFn: sks, sides: 10 });                          // tread
        rivet(mesh, [s * 0.238, 1.30, 0.0435], [0, 0, 1], 0.0045, { mat: MAT.BRASS, skinFn: sks, sides: 8 });
        const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([s * (0.19 - 0.02 * t), 1.481 - 0.004 * Math.sin(t * 3.14), -0.20 + 0.50 * t]); } stitches(mesh, pts, () => [0, 1, 0], { count: 14, skinFn: sk, lift: 0.0006 }); }
      box(mesh, [0, 1.525, -0.28], [0.10, 0.05, 0.05], { mat: MAT.SADDLE_LEATHER, skinFn: rig('tack_saddlebag') });                              // saddlebags behind the cantle
      tube(mesh, [-0.22, 1.545, 0.30], [0.22, 1.545, 0.30], limbProfile(0.045, 0.045, 2, 0.1), { sides: 8, mat: MAT.ROPE, skinFn: sk, capStart: false });   // hemp lariat roll over the pommel
      // bridle: cheek straps, browband, noseband, throatlatch; reins from the bit to the rider's hands (rein bones)
      const sH = rig('head'), cs = (a, b) => tube(mesh, a, b, [[0, 0.0045], [1, 0.0045]], { sides: 5, mat: MAT.SADDLE_LEATHER, skinFn: sH, capStart: true, capEnd: true });
      for (const s of [1, -1]) { cs([s * 0.060, 1.775, 0.985], [s * 0.094, 1.690, 1.050]); cs([s * 0.094, 1.690, 1.050], [s * 0.074, 1.560, 1.150]); cs([s * 0.060, 1.775, 0.985], [s * 0.088, 1.640, 0.960]); }
      cs([-0.075, 1.760, 1.005], [0.075, 1.760, 1.005]);
      cs([-0.060, 1.545, 1.172], [0.060, 1.545, 1.172]); cs([-0.056, 1.475, 1.200], [0.056, 1.475, 1.200]);                          // noseband and chin strap
      // reins (round 3): from the bit rings to the bridle hand, then a tail. Both reins are held in the LEFT hand (the right hand is free for the sabre: inferred, plausible-procedural, gap G-FIG-REIN-HAND);
      // the hand grip point is REIN_HAND (socket-spec.json -> reins): the palm of the rider's left hand sits there, the reins pass through the closed fist and the tails hang beyond it. The head end is skinned to the head
      // bone, the hand end to the rein spring bone, blended along z.
      for (const s of [1, -1]) {
        const ctl = s > 0 ? [[0.055, 1.50, 1.205], [0.115, 1.585, 1.00], [0.146, 1.650, 0.76], [0.135, 1.668, 0.58], REIN_HAND, [0.145, 1.635, 0.40], [0.175, 1.545, 0.330]]
          : [[-0.055, 1.50, 1.205], [-0.115, 1.585, 1.00], [-0.130, 1.665, 0.80], [-0.050, 1.725, 0.64], [0.070, 1.700, 0.54], [REIN_HAND[0] - 0.007, REIN_HAND[1] - 0.002, REIN_HAND[2] + 0.002], [0.135, 1.630, 0.40], [0.165, 1.540, 0.335]];
        const pts = catmull(ctl, 5); pathTube(mesh, pts, 0.0032, { sides: 6, mat: MAT.SADDLE_LEATHER, skinFn: p => { const h = ssm(0.60, 1.10, p[2]); return [[HI.head, h], [HI.tack_rein_L, 1 - h]]; } });
      }
      // girth and breast strap, crupper, saddle seams and buckles
      const pl = (pts, r, mat, s2 = sk, closed = false) => pathTube(mesh, pts, r, { sides: 5, mat, skinFn: s2, closed });
      pl([[-0.225, 1.45, 0.12], [-0.262, 1.20, 0.12], [-0.215, 1.00, 0.12], [0, 0.82, 0.12], [0.215, 1.00, 0.12], [0.262, 1.20, 0.12], [0.225, 1.45, 0.12]], 0.016, MAT.SADDLE_LEATHER);
      pl([[0.0, 1.14, 0.76], [0.14, 1.20, 0.66], [0.20, 1.34, 0.50], [0.17, 1.47, 0.34]], 0.011, MAT.SADDLE_LEATHER); pl([[0.0, 1.14, 0.76], [-0.14, 1.20, 0.66], [-0.20, 1.34, 0.50], [-0.17, 1.47, 0.34]], 0.011, MAT.SADDLE_LEATHER);
      pl([[0, 1.50, -0.31], [0, 1.47, -0.62], [0, 1.40, -0.86]], 0.010, MAT.SADDLE_LEATHER);
      seam(mesh, Array.from({ length: 9 }, (_, i) => [0, 1.540 + 0.012 * Math.sin(i / 8 * 3.14), -0.20 + 0.5 * i / 8]), () => [0, 1, 0], { w: 0.006, h: 0.002, mat: MAT.SADDLE_LEATHER, skinFn: sk, lift: 0.0 });
      for (const z of [-0.26, 0.28]) for (const s of [-0.07, 0.07]) rivet(mesh, [s, 1.560, z], [0, 1, 0], 0.0055, { mat: MAT.BRASS, skinFn: sk, sides: 8 });
    }
  } else if (kind === 'draught' && lod <= 1) {
    const sk = rig('withers');                                                                              // collar and hame, traces, saddle pad
    tube(mesh, [0, 1.30, 0.62], [0, 1.32, 0.68], [[0, 0.20], [1, 0.20]], { sides: sd, mat: MAT.SADDLE_LEATHER, skinFn: sk, capStart: false, ex: 0.7, ey: 1.0 });
    for (const s of [1, -1]) strap(mesh, [[s * 0.20, 1.22, 0.64], [s * 0.26, 1.18, 0.1], [s * 0.26, 1.18, -0.5]], 0.025, 0.006, { mat: MAT.SADDLE_LEATHER, skinFn: sk });
    box(mesh, [0, 1.445, 0.04], [0.16, 0.012, 0.20], { mat: MAT.SADDLE_BLANKET, skinFn: rig('spine2') });
  }
}
