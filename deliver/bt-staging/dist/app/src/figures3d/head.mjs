// Head and face generator (film-grade round 2, 2026-10-31): 24 head shapes x 12 skin tones x 5 eye colours, eyes with an almond lid aperture (upper and lower lid shells, rolled margins, lashes, caruncle,
// a recessed socket under a brow ridge), lips as shaped vermilion ribbons around a real mouth slit and cavity (the jaw bone opens it for tearing the cartridge and for commands), brows as skin ribbons with
// individual hairs, ears as sculpted height fields (helix, concha, antihelix, lobe, tragus), 8 hair styles built as volumetric shells with a smooth buried-edge hairline and strand clumps that radiate
// from the crown, and 7 period facial-hair types (clean-shaven, moustache, goatee, full beard, mutton chops, chin curtain, Burnside whiskers) as coverage-field shells plus hanging beard masses.
// EVERY FACE IS PLAUSIBLE-PROCEDURAL: no record gives any enlisted man's face (EG-0001); the faces of named commanders are an open gap (EG-FIG-0004). Proportions: head height 0.224 m on a 1.73 m
// rig (1/7.7 of stature), neck girth 0.346 m (Gould 1869, mean girth of neck 13.638 in; ledger FIG-L-GOULD-1869 in FIGURES3D-NOTES section 9). Head morphs are bounded in hair-covered regions (tested).
import { v3, clamp, smooth } from './mathlib.mjs';
import { Mesh, ellipsoid, tube, loft } from './meshkit.mjs';
import { sphereCap, strands, pathTube } from './detail.mjs';
import { BI } from './body.mjs';
import { MAT } from './palette.mjs';
import { rand } from '../../../sim/rng.mjs';

export const N_HEADS = 24, HAIR_STYLES = ['cropped', 'short', 'side_part', 'over_ears', 'receding', 'balding_crown', 'long_neck', 'tousled'], FACIAL_HAIR = ['clean', 'moustache', 'goatee', 'full_beard', 'mutton_chops', 'chin_curtain', 'burnsides'];
export const HEAD_C = [0, 1.62, 0.012], HEAD_R = [0.0765, 0.112, 0.097];
const MOUTH_Y = -0.067, BONE_HEAD = BI.head, BONE_JAW = BI.jaw;
const sm = smooth, lerp = (a, b, t) => a + (b - a) * t;
const skHd = () => [[BONE_HEAD, 1]], thin = (mesh, v0) => { for (let i = v0; i < mesh.nv; i++) mesh.flags[i] = 255; };      // vertex flag 255 = thin skin (the shader boosts the scatter band: SKIN_SSS.thin_boost)

// ---- head shape parameters from the head index (deterministic; independent of the man's other attributes). Ranges are wide on purpose: 24 men, each different in age, brow, nose, jaw, chin, ear, eye set.
export function headParams(idx) {
  const r = k => rand(0x4eadf1, idx, 0, k), a = r(21), age = a * a * 0.8 + 0.2 * r(22) * a;                 // 0 = about 18, 1 = about 50; most men are young (the Union volunteers' modal age was early twenties)
  return { idx, age, faceLen: 0.95 + 0.11 * r(1), faceWid: 0.925 + 0.11 * r(2), jawTaper: 0.04 + 0.16 * r(3), chinProm: 0.002 + 0.014 * r(4), noseProj: 0.016 + 0.014 * r(5), noseWid: 0.008 + 0.009 * r(6), noseHump: -0.004 + 0.010 * r(7), noseLen: -0.006 + 0.012 * r(8),
    brow: 0.003 + 0.009 * r(9), cheek: 0.001 + 0.008 * r(10), eyeSpace: -0.004 + 0.008 * r(11), eyeSize: 0.95 + 0.10 * r(12), lip: 0.003 + 0.005 * r(13), mouthW: 0.0215 + 0.0075 * r(14), earSize: 0.88 + 0.28 * r(15), earOut: 0.001 + 0.009 * r(16), forehead: -0.004 + 0.008 * r(17), eyeColour: Math.floor(r(18) * 5),
    jawW: r(23), chinW: r(24), cleft: r(25) > 0.8 ? 0.0014 + 0.0016 * r(26) : 0, noseTip: r(27) * 2 - 1, eyeTilt: (r(28) - 0.5) * 0.16, lidHood: r(29), cheekFull: r(30), bridge: 0.5 + r(31), stache: 0.75 + 0.6 * r(32), earLobe: r(33), neck: 0.96 + 0.1 * r(34) };
}
const gauss = (p, f) => { const dx = (p[0] - f.c[0]) / f.s[0], dy = (p[1] - f.c[1]) / f.s[1], dz = (p[2] - f.c[2]) / f.s[2]; return f.a * Math.exp(-0.5 * (dx * dx + dy * dy + dz * dz)); };
function features(P, lod = 0) {
  const nz = [0, 0, 1], F = [], ag = P.age;
  const add = (c, s, a, dir = null, mirror = true) => { if (lod >= 1 && Math.min(...s) < 0.0075 && !(s[0] === 0.0075 && s[1] === 0.011)) return; if (lod >= 1) a *= 0.7; F.push({ c, s, a, dir }); if (mirror && Math.abs(c[0]) > 1e-6) F.push({ c: [-c[0], c[1], c[2]], s, a, dir }); };
  const tipDir = [0, 0.45 * P.noseTip, 1], ey = 0.0315 + P.eyeSpace;
  add([0, -0.034 + P.noseLen * 0.5 - 0.003 * P.noseTip, 0.093], [0.0072, 0.0095, 0.0105], P.noseProj, tipDir, false);                 // nose tip
  add([0, -0.040, 0.092], [0.0052, 0.0050, 0.007], 0.0022 * (1 - P.noseTip), nz, false);                                               // columella
  for (let k = 0; k < 4; k++) add([0, 0.002 - 0.0105 * k + P.noseLen * 0.2 * (k / 3), 0.1005 - 0.0006 * k], [0.0036 * P.bridge, 0.0075, 0.010], (0.0052 + P.noseHump * (k === 1 || k === 2 ? 1.1 : 0.3)) * (0.7 + 0.1 * k), nz, false);   // bridge, ridge-like
  add([0.0145, -0.039, 0.089], [0.0072, 0.0062, 0.0075], P.noseWid, nz);                                                               // alae
  add([0.0065, -0.046, 0.088], [0.0040, 0.0042, 0.005], -0.0045, nz);                                                                  // nostril hollows
  add([0, -0.049, 0.090], [0.009, 0.005, 0.007], 0.0030, nz, false);                                                                   // philtrum base
  add([0.0105, -0.052, 0.088], [0.003, 0.0085, 0.006], 0.0010, nz);                                                                    // philtrum columns (the two ridges)
  add([ey, 0.0, 0.085], [0.0132, 0.0102, 0.0135], -0.0100, nz);                                                                        // eye socket (the eyeball sits in it)
  add([ey + 0.004, 0.0185 + 0.003 * P.lidHood, 0.088], [0.0205, 0.0058, 0.012], P.brow + 0.003 * P.lidHood, [0, 0.35, 1]);              // brow ridge (the heavy brow hoods the lid)
  add([ey + 0.004, 0.0105, 0.086], [0.0165, 0.0048, 0.011], 0.0012 + 0.0024 * P.lidHood, nz);                                          // upper lid fold under the brow
  add([0, 0.019, 0.092], [0.008, 0.007, 0.010], 0.0028, nz, false);                                                                    // glabella
  add([0.063, 0.024, 0.060], [0.012, 0.018, 0.02], -0.0025 - 0.003 * ag, nz);                                                          // temple hollow (deeper with age)
  add([0.045 + 0.003 * P.cheekFull, -0.026, 0.068], [0.016, 0.014, 0.016], P.cheek + 0.002 * P.cheekFull, nz);                         // cheekbone
  add([0.040, -0.052, 0.060], [0.014, 0.020, 0.018], -0.0035 - 0.0045 * ag + 0.002 * P.cheekFull, nz);                                 // cheek hollow under the bone (the lean face of a campaigner)
  add([ey, -0.0155, 0.086], [0.0125, 0.0042, 0.010], 0.0010 + 0.0030 * ag, nz);                                                        // under-eye bag
  add([ey - 0.004, -0.0235, 0.084], [0.011, 0.0035, 0.010], -0.0008 - 0.0016 * ag, nz);                                                // tear trough
  for (let k = 0; k < 4; k++) { const t = k / 3; add([lerp(0.0185, 0.031, t), lerp(-0.044, -0.0715, t), lerp(0.087, 0.078, t)], [0.0042, 0.0048, 0.006], -(0.0011 + 0.0021 * ag), nz); }   // nasolabial fold
  add([0.036, -0.036, 0.078], [0.011, 0.009, 0.010], 0.0024 + 0.0016 * P.cheekFull, nz);                                               // cheek mass above the fold
  add([0, MOUTH_Y + 0.0078, 0.087], [P.mouthW * 0.72, 0.0040, 0.0085], P.lip, nz, false);                                              // upper lip pillow
  add([0, MOUTH_Y - 0.0080, 0.084], [P.mouthW * 0.62, 0.0048, 0.0085], P.lip * 1.2, nz, false);                                        // lower lip pillow
  add([P.mouthW + 0.003, MOUTH_Y, 0.082], [0.0035, 0.0045, 0.007], -0.0016, nz);                                                       // mouth corner dimples
  add([0, MOUTH_Y - 0.0185, 0.083], [0.012, 0.0036, 0.008], -0.0030, nz, false);                                                       // mentolabial groove
  add([0, -0.0925, 0.078], [0.011 + 0.006 * P.chinW, 0.010, 0.012], P.chinProm, [0, -0.2, 1], false);                                  // chin
  if (P.cleft) add([0, -0.087, 0.0845], [0.0022, 0.0100, 0.008], -P.cleft, nz, false);                                                 // chin cleft
  add([0, 0.050, 0.092], [0.030, 0.020, 0.015], P.forehead, nz, false);                                                                // forehead
  add([0.027, 0.064, 0.084], [0.014, 0.012, 0.012], 0.0016, nz);                                                                       // frontal eminences
  add([0.056 + 0.004 * P.jawW, -0.066, 0.004], [0.013, 0.016, 0.022], 0.0022 + 0.0075 * P.jawW, nz);                                   // gonial angle (square or soft jaw)
  add([0.052, -0.046, 0.028], [0.012, 0.018, 0.020], 0.0018 + 0.0020 * P.jawW, nz);                                                    // masseter
  if (lod === 0) {
    for (let k = 0; k < 3; k++) add([0, 0.040 + 0.011 * k, 0.092], [0.026, 0.0021, 0.010], -0.0010 * ag * (k === 1 ? 1.2 : 0.8), nz, false);   // forehead creases (age)
    for (let k = 0; k < 3; k++) add([ey + 0.026 + 0.004 * k, 0.004 - 0.0048 * (k - 1), 0.071], [0.0042, 0.0020, 0.008], -0.0009 * ag, nz);   // crow's feet
  }
  return F;
}
// the base surface at grid angles (th from the top pole, ph around, 0 = front). The cranium is rounder than the face: the head narrows toward the front (temples), the jaw is squared by `jawTaper` and the gonial feature.
function baseXYZ(P, th, ph, canonical) {
  const st = Math.sin(th), ct = Math.cos(th), sp = Math.sin(ph), cp = Math.cos(ph), fl = canonical ? 1 : P.faceLen, fw = canonical ? 1 : P.faceWid;
  let x = HEAD_R[0] * fw * st * sp, y = HEAD_R[1] * fl * ct, z = HEAD_R[2] * st * cp;
  x *= 1 - 0.10 * Math.max(0, cp) ** 1.4;                                                        // temples narrower than the parietal bulge
  const low = smooth(0.0, -0.11, y), jt = canonical ? 0.06 : 0.02 + P.jawTaper * 0.5, jw = canonical ? 0.14 : 0.07 + 0.14 * P.jawW;
  x *= 1 - jt * low; x *= 1 + jw * Math.exp(-(((y + 0.058) / 0.036) ** 2)) * Math.max(0, 1 - Math.max(0, cp) * 0.35) - 0.20 * smooth(-0.088, -0.114, y);   // squared jaw: wider at the gonial angle, narrower at the chin z *= 1 - 0.10 * low * (1 - Math.max(0, cp)); if (y < 0) z -= 0.012 * low * (1 - Math.max(0, cp)) * st;
  const cf = Math.max(0, cp) * smooth(-0.02, -0.095, y) * st; z += 0.004 * cf * (canonical ? 1 : 1);   // the chin carries a little forward
  return [x, y, z];
}
function surf(P, th, ph, canonical, F = null) {
  let [x, y, z] = baseXYZ(P, th, ph, canonical);
  const e = 1e-3, a = baseXYZ(P, th + e, ph, canonical), b = baseXYZ(P, th, ph + e, canonical);
  let n = v3.norm(v3.cross(v3.sub(b, [x, y, z]), v3.sub(a, [x, y, z]))); if (v3.dot(n, [x, y, z]) < 0) n = v3.mul(n, -1);
  if (Math.abs(x) + Math.abs(y) + Math.abs(z) < 1e-9) n = [0, 1, 0];
  if (!canonical && Math.cos(ph) > 0.05 && F) { const p = [x, y, z]; let d = [0, 0, 0]; for (const f of F) { const g = gauss(p, f); if (g === 0) continue; const dd = f.dir ? v3.norm(f.dir) : n; d = v3.add(d, v3.mul(dd, g)); } x += d[0]; y += d[1]; z += d[2]; }
  return { p: [HEAD_C[0] + x, HEAD_C[1] + y, HEAD_C[2] + z], n, local: [x, y, z] };
}
// the skin point (local x, y; the z is solved) on the face of the shaped head, and its normal: Newton iterations on the grid angles. Used by every overlay (lips, brows, moustache roots).
const _fcache = new Map();
function skinAt(P, x, y, F) {
  const key = P.idx + ':' + x.toFixed(5) + ':' + y.toFixed(5), hit = _fcache.get(key); if (hit) return hit;
  let th = Math.acos(clamp(y / (HEAD_R[1] * P.faceLen), -0.98, 0.98)), ph = Math.asin(clamp(x / (HEAD_R[0] * P.faceWid * Math.max(0.2, Math.sin(th))), -0.95, 0.95)), s;
  for (let it = 0; it < 6; it++) {
    s = surf(P, th, ph, false, F).local; const dx = x - s[0], dy = y - s[1]; if (Math.abs(dx) + Math.abs(dy) < 2e-6) break;
    const e = 2e-3, A = surf(P, th + e, ph, false, F).local, B = surf(P, th, ph + e, false, F).local, a11 = (A[0] - s[0]) / e, a21 = (A[1] - s[1]) / e, a12 = (B[0] - s[0]) / e, a22 = (B[1] - s[1]) / e, det = a11 * a22 - a12 * a21 || 1e-9;
    th += clamp((dx * a22 - a12 * dy) / det, -0.15, 0.15); ph += clamp((a11 * dy - a21 * dx) / det, -0.15, 0.15); th = clamp(th, 0.05, 3.05);
  }
  const S = surf(P, th, ph, false, F), out = { p: S.local, n: S.n }; if (_fcache.size > 20000) _fcache.clear(); _fcache.set(key, out); return out;
}
const _headFeat = new Map();
// the local position of the shaped head surface at grid angles (th from the top pole, ph around, 0 = front): used by the skin-map baker (skinmap.mjs)
export function headLocalAt(P, th, ph) { let F = _headFeat.get(P.idx); if (!F) { F = features(P, 0); _headFeat.set(P.idx, F); } return surf(P, th, ph, false, F).local; }
export const HEAD_EYE_X = P => 0.0315 + P.eyeSpace, HEAD_MOUTH_Y = MOUTH_Y;
const mapU = u => { const s = 2 * u - 1; return Math.PI * (0.45 * s + 0.55 * s * s * s); }, mapV = v => { const s = 2 * v - 1; return Math.PI / 2 + (Math.PI / 2) * (0.5 * s + 0.5 * s * s * s); };
export const MOUTH_TH = Math.acos(MOUTH_Y / HEAD_R[1]);
const L2W = p => [HEAD_C[0] + p[0], HEAD_C[1] + p[1], HEAD_C[2] + p[2]];

// ---- the head skin mesh. lod 0: 64 x 44 grid with a real mouth slit (upper lip on the head bone, lower lip and chin on the jaw bone, the slit rows coincide at rest); lod 1: 12 x 9; lod 2: 6 x 5.
// The lips are NOT coloured through vertex materials (that gave a stair-stepped boundary): the vermilion is a separate ribbon mesh (buildFaceDetail). LOD1 keeps the dark eye dots.
export function buildHeadSkin(P, lod, mesh = new Mesh('head' + P.idx)) {
  const FT = features(P, lod);
  const nu = [50, 12, 6][lod], nv = [34, 9, 5][lod], v0 = mesh.nv, slit = lod === 0, th = [];
  for (let j = 0; j <= nv; j++) th.push(mapV(j / nv));
  let jm = -1; if (slit) { let best = 9; for (let j = 1; j < nv; j++) { const d = Math.abs(th[j] - MOUTH_TH); if (d < best) { best = d; jm = j; } } th[jm] = MOUTH_TH; }
  const mouthHalf = P.mouthW * 1.05;
  const mk = (j, i, wJaw) => {
    const ph = mapU(i / nu), S = surf(P, th[j], ph, false, FT), local = S.local;
    let mat = MAT.SKIN;
    if (lod === 1 && local[2] > 0.07 && Math.abs(local[1]) < 0.009 && Math.abs(Math.abs(local[0]) - (0.0315 + P.eyeSpace)) < 0.011) mat = MAT.EYE_DARK;
    return mesh.vert(S.p, S.n, (ph - Math.PI) * 0.095, th[j] * 0.11, mat, wJaw > 0 ? [[BONE_JAW, wJaw], [BONE_HEAD, 1 - wJaw]] : [[BONE_HEAD, 1]], 64);   // flag 64 = the skin-map region (skinmap.mjs)
  };
  const V = [], U = [], L = [];
  for (let j = 0; j <= nv; j++) {
    V[j] = [];
    for (let i = 0; i <= nu; i++) {
      const ph = mapU(i / nu), cp = Math.cos(ph), lx = Math.abs(HEAD_R[0] * Math.sin(th[j]) * Math.sin(ph)), front = clamp((cp + 0.1) / 0.6, 0, 1);
      const span = slit && lx < mouthHalf && cp > 0.5, fall = 1 - clamp((lx - mouthHalf) / 0.03, 0, 1);
      if (slit && j === jm) { if (span) { U[i] = mk(j, i, 0); L[i] = mk(j, i, 1); } else { U[i] = L[i] = mk(j, i, 0.5 * fall * front); } }
      else { const wj = slit && j > jm ? front * Math.max(fall, j - jm > 3 ? 1 : 0) : 0; V[j][i] = mk(j, i, wj); }
    }
  }
  const top = (j, i) => (j === jm ? L[i] : V[j][i]), bot = (j, i) => (j === jm ? U[i] : V[j][i]);
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = top(j, i), c = top(j, i + 1), b = bot(j + 1, i), d = bot(j + 1, i + 1);
    if (j > 0) mesh.tri(a, b, c); if (j < nv - 1) mesh.tri(b, d, c);
  }
  mesh.smooth(v0);
  return mesh;
}

// ---- a ribbon lying on the face skin (brows, lips): points are local (x, y) on the face; halfW(t) and h(t) give the half width and the raised height; ends taper to zero.
function faceRibbon(mesh, P, F, pts, halfW, h, { mat, skinFn, lift = -0.0004, sides = 8, nrmTilt = null } = {}) {
  const rings = pts.map((q, i) => {
    const t = i / (pts.length - 1), S = skinAt(P, q[0], q[1], F), n = nrmTilt ? v3.norm(v3.add(S.n, nrmTilt)) : S.n, c = L2W(v3.add(S.p, v3.mul(n, lift + h(t) * 0.5)));
    const q1 = pts[Math.min(pts.length - 1, i + 1)], q0 = pts[Math.max(0, i - 1)], tg = v3.norm([q1[0] - q0[0], q1[1] - q0[1], 0]), tg3 = v3.norm(v3.sub(v3.add(skinAt(P, q1[0], q1[1], F).p, [0, 0, 0]), skinAt(P, q0[0], q0[1], F).p)), side = v3.norm(v3.cross(tg3, n));
    void tg; return { c, u: side, v: n, ru: halfW(t), rv: h(t) * 0.5 };
  });
  return loft(mesh, rings, { sides, mat, skinFn, capStart: true, capEnd: true, smoothNormals: true });
}
// the lid aperture of one eye in angular coordinates (a = lateral angle, b = vertical angle on the eyeball): the upper curve, the lower curve, with an eye tilt (the outer corner higher or lower)
const AP_H = 1.12, AP_UP = 0.385, AP_LO = 0.43;
const apUpper = (a, tilt) => AP_UP * Math.pow(Math.max(0, 1 - (a / AP_H) ** 2), 0.62) + tilt * a, apLower = (a, tilt) => -AP_LO * Math.pow(Math.max(0, 1 - (a / AP_H) ** 2), 0.8) + tilt * a * 0.6;

// ---- eyes, brows, lids, lashes, nostrils, lips, mouth interior (cavity, tongue, gums, teeth), ears at LOD0. LOD1/LOD2 have none (the skin mesh carries dark eye dots at LOD1).
export function buildFaceDetail(P, lod, mesh = new Mesh('face' + P.idx)) {
  if (lod >= 1) return mesh;
  const F = features(P, 0), ey = 0.0315 + P.eyeSpace, r = 0.0120 * P.eyeSize;
  for (const s of [1, -1]) {
    const eyeBone = s > 0 ? BI.eye_L : BI.eye_R, skE = () => [[eyeBone, 1]], zc = HEAD_C[2] + 0.0706, c = [HEAD_C[0] + s * ey, HEAD_C[1] + 0.0, zc];
    // eyeball (white), iris with a slight dome, pupil: caps of one sphere; the rest of the ball is inside the skull
    sphereCap(mesh, c, r, { th0: 0, th1: 1.5, nu: 20, nv: 9, mat: MAT.EYE_WHITE, skinFn: skE });
    sphereCap(mesh, [c[0], c[1], c[2] + r * 0.014], r * 1.004, { th0: 0, th1: 0.50, nu: 20, nv: 4, mat: MAT.IRIS, skinFn: skE });
    sphereCap(mesh, [c[0], c[1], c[2] + r * 0.024], r * 1.006, { th0: 0, th1: 0.20, nu: 10, nv: 2, mat: MAT.EYE_DARK, skinFn: skE });
    // lid shells over the ball: grids in the angular plane (a lateral, b vertical) from the aperture curve outward; thickness 1.3 mm at the margin growing to 2 mm
    const lid = (upper) => {
      const NA = 16, NB = 3, base = mesh.nv, id = [];
      for (let ia = 0; ia <= NA; ia++) { const a = -AP_H + 2 * AP_H * ia / NA, b0 = upper ? apUpper(a, P.eyeTilt * s) : apLower(a, P.eyeTilt * s), bmax = Math.sqrt(Math.max(0, 1.5 * 1.5 - a * a)) * (upper ? 1 : -1); id[ia] = [];
        for (let ib = 0; ib <= NB; ib++) { const t = ib / NB, b = b0 + (bmax - b0) * t * (0.8 + 0.2 * t), th = Math.hypot(a, b), ph = Math.atan2(b, a), q = [s * Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)], rr = r + 0.0011 + 0.0011 * Math.sqrt(t);
          id[ia][ib] = mesh.vert([c[0] + q[0] * rr, c[1] + q[1] * rr, c[2] + q[2] * rr], q, ia / NA * 0.03, t * 0.02, MAT.SKIN, [[BONE_HEAD, 1]]); } }
      for (let ia = 0; ia < NA; ia++) for (let ib = 0; ib < NB; ib++) { const a1 = id[ia][ib], b1 = id[ia + 1][ib], c1 = id[ia][ib + 1], d1 = id[ia + 1][ib + 1]; if ((s > 0) === upper) { mesh.tri(a1, b1, c1); mesh.tri(b1, d1, c1); } else { mesh.tri(a1, c1, b1); mesh.tri(b1, c1, d1); } }
      mesh.smooth(base); thin(mesh, base);
    };
    lid(true); lid(false);
    // lid margins: a rolled rim along the aperture (upper curve then lower curve), upper and lower lashes, the caruncle at the inner corner
    const rim = [], NR = 14, tl = P.eyeTilt * s;
    for (let k = 0; k <= NR; k++) { const a = -AP_H + 2 * AP_H * k / NR, b = apUpper(a, tl), th = Math.hypot(a, b), ph = Math.atan2(b, a), q = [s * Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)]; rim.push([c[0] + q[0] * (r + 0.0014), c[1] + q[1] * (r + 0.0014), c[2] + q[2] * (r + 0.0014)]); }
    for (let k = NR - 1; k >= 1; k--) { const a = -AP_H + 2 * AP_H * k / NR, b = apLower(a, tl), th = Math.hypot(a, b), ph = Math.atan2(b, a), q = [s * Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)]; rim.push([c[0] + q[0] * (r + 0.0013), c[1] + q[1] * (r + 0.0013), c[2] + q[2] * (r + 0.0013)]); }
    pathTube(mesh, rim, 0.0014, { sides: 5, mat: MAT.SKIN, skinFn: skHd, closed: true });
    for (let k = 0; k < 11; k++) { const a = -AP_H * 0.86 + 1.72 * AP_H * (k + 0.5) / 11, b = apUpper(a, tl), th = Math.hypot(a, b), ph = Math.atan2(b, a), q = [s * Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)], root = [c[0] + q[0] * (r + 0.0016), c[1] + q[1] * (r + 0.0016), c[2] + q[2] * (r + 0.0016)];
      tube(mesh, root, [root[0] + s * (a > 0 ? 0.0006 : -0.0006), root[1] + 0.0028, root[2] + 0.0030], [[0, 0.00045], [1, 0.00012]], { sides: 3, mat: MAT.HAIR, skinFn: skHd, capStart: true, capEnd: true, smoothNormals: false }); }
    for (let k = 0; k < 7; k++) { const a = -AP_H * 0.7 + 1.4 * AP_H * (k + 0.5) / 7, b = apLower(a, tl), th = Math.hypot(a, b), ph = Math.atan2(b, a), q = [s * Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)], root = [c[0] + q[0] * (r + 0.0014), c[1] + q[1] * (r + 0.0014), c[2] + q[2] * (r + 0.0014)];
      tube(mesh, root, [root[0], root[1] - 0.0016, root[2] + 0.0022], [[0, 0.0004], [1, 0.0001]], { sides: 3, mat: MAT.HAIR, skinFn: skHd, capStart: true, capEnd: true, smoothNormals: false }); }
    ellipsoid(mesh, [c[0] - s * r * 0.98, c[1] - r * 0.04, c[2] + r * 0.58], [0.0026, 0.0030, 0.0022], 7, 4, { mat: MAT.TONGUE, skinFn: skHd });          // caruncle
    // eyebrow: a ribbon of hair-colour skin along the brow arc, plus individual hairs rooted on it (two rows, lying in the growth direction: up and out at the head, flat at the tail)
    const browPts = []; for (let k = 0; k <= 10; k++) { const t = k / 10; browPts.push([s * (ey - 0.0185 + 0.040 * t + 0.002), 0.0188 + 0.0062 * Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.62) - 0.0060 * Math.max(0, t - 0.55) + 0.003 * P.lidHood]); }
    faceRibbon(mesh, P, F, browPts, t => 0.0030 * (1 - 0.55 * t) * Math.pow(Math.sin(Math.PI * (0.06 + 0.88 * t)), 0.5), t => 0.0012 + 0.0004 * (1 - t), { mat: MAT.HAIR, skinFn: skHd, lift: -0.0002, sides: 6 });
    strands(mesh, 20, i => { const t = (i % 10) / 9, row = i < 10 ? 0 : 1, q = browPts[Math.min(10, Math.round(t * 10))], S = skinAt(P, q[0], q[1] + (row ? -0.0016 : 0.0014), F);
      return { p: L2W(v3.add(S.p, v3.mul(S.n, 0.0004))), dir: [s * (0.55 + 0.45 * t), 0.35 - 0.55 * t, 0.2] }; }, { len: 0.0075, r: 0.00042, mat: MAT.HAIR, skinFn: skHd, curl: 0.003, seed: 11 + (s > 0 ? 1 : 2), segs: 2 });
    { const e0 = mesh.nv; earMesh(mesh, P, s); thin(mesh, e0); }
    ellipsoid(mesh, L2W(v3.add(skinAt(P, s * 0.0078, -0.0455, F).p, [0, 0, -0.002])), [0.0042, 0.0026, 0.0034], 7, 4, { mat: MAT.EYE_DARK, skinFn: skHd });   // nostril opening, set into the ala
  }
  // lips: two vermilion ribbons following the mouth slit: the upper on the head bone with a cupid's bow, the lower on the jaw bone; each tapers to the corners
  const mw = P.mouthW * 0.93, lipPts = (up) => Array.from({ length: 15 }, (_, k) => { const t = k / 14, x = (t * 2 - 1) * mw, bow = up ? 0.0011 * Math.cos(x / mw * Math.PI * 2.0) - 0.0006 * Math.exp(-((x / 0.004) ** 2)) : 0; return [x, MOUTH_Y + (up ? 0.0036 + bow : -0.0042)]; });
  const l0 = mesh.nv; faceRibbon(mesh, P, F, lipPts(true), t => 0.0036 * Math.pow(Math.sin(Math.PI * (0.03 + 0.94 * t)), 0.55), t => 0.0030 * Math.pow(Math.sin(Math.PI * (0.05 + 0.9 * t)), 0.5) + 0.0006, { mat: MAT.LIP, skinFn: skHd, lift: -0.0004, sides: 8 });
  faceRibbon(mesh, P, F, lipPts(false), t => 0.0044 * Math.pow(Math.sin(Math.PI * (0.03 + 0.94 * t)), 0.55), t => 0.0036 * Math.pow(Math.sin(Math.PI * (0.05 + 0.9 * t)), 0.5) + 0.0006, { mat: MAT.LIP, skinFn: () => [[BONE_JAW, 0.9], [BONE_HEAD, 0.1]], lift: -0.0004, sides: 8 }); thin(mesh, l0);
  // mouth interior: a dark cavity behind the slit, tongue, gum arches, and individual teeth (8 upper on the head bone, 8 lower on the jaw bone), all set well behind the lips
  const my = HEAD_C[1] + MOUTH_Y, mz = HEAD_C[2] + 0.034, mww = P.mouthW;
  ellipsoid(mesh, [HEAD_C[0], my, mz], [mww * 0.85, 0.014, 0.02], 14, 7, { mat: MAT.EYE_DARK, skinFn: skHd });
  ellipsoid(mesh, [HEAD_C[0], my - 0.0065, mz - 0.003], [mww * 0.62, 0.0040, 0.0150], 12, 6, { mat: MAT.TONGUE, skinFn: () => [[BONE_JAW, 1]] });
  for (const [dy, bone, sg] of [[0.0034, BONE_HEAD, 1], [-0.0034, BONE_JAW, -1]]) {
    const sk = () => [[bone, 1]], arc = []; for (let k = 0; k <= 12; k++) { const a = (k / 12 - 0.5) * 1.5; arc.push([HEAD_C[0] + Math.sin(a) * mww * 0.8, my + dy * 1.7, HEAD_C[2] + 0.030 + Math.cos(a) * 0.026]); }
    for (let k = 0; k < 12; k++) tube(mesh, arc[k], arc[k + 1], [[0, 0.0026], [1, 0.0026]], { sides: 3, mat: MAT.GUM, skinFn: sk, smoothNormals: false, phase: Math.PI / 4 });
    for (let k = 0; k < 8; k++) { const a = (k / 7 - 0.5) * 1.3, w = k === 0 || k === 7 ? 0.0044 : k === 3 || k === 4 ? 0.0036 : 0.0034, h = (k === 3 || k === 4 ? 0.0052 : k === 2 || k === 5 ? 0.0046 : 0.0040) * sg, canine = k === 1 || k === 6;
      ellipsoid(mesh, [HEAD_C[0] + Math.sin(a) * mww * 0.8, my + dy * 0.2 - sg * 0.0004 + (canine ? -0.0006 * sg : 0), HEAD_C[2] + 0.0335 + Math.cos(a) * 0.026 + 0.002], [w, Math.abs(h), 0.0021], 5, 3, { mat: MAT.TEETH, skinFn: sk }); }
  }
  return mesh;
}
// the ear: a sculpted height field on an ellipse (outline tilted back at the top), helix rim, concha bowl, antihelix ridge, lobe, with a tragus and a short stalk to the skull. s = side.
function earMesh(mesh, P, s) {
  const e = P.earSize, eh = 0.0290 * e, ew = 0.0175 * e, cy = -0.006, cz = -0.004, tilt = 0.22, base0 = HEAD_R[0] * 0.995;
  const NA = 18, NR = 6, id = [], field = (r, a, lobe) => { const x = Math.cos(a) * r, y = Math.sin(a) * r;      // x: toward the back (negative z), y: up; r in 0..1
    const helix = 0.0042 * Math.exp(-(((r - 0.90) / 0.11) ** 2)), concha = -0.0030 * Math.exp(-(((x + 0.15) ** 2 + (y + 0.05) ** 2) / 0.17)), anti = 0.0024 * Math.exp(-((Math.hypot(x * 0.8 - 0.1, y - 0.25) - 0.42) ** 2) / 0.012) * (y > -0.1 ? 1 : 0), lb = (0.0020 + 0.0030 * P.earLobe) * sm(-0.2, -0.85, y) * (1 - r * 0.4);
    return 0.0050 + helix + concha + anti + lb + P.earOut * 0.9 * (y + 1) * 0.5 - 0.0055 * Math.pow(r, 6) * 0; };
  for (let ir = 0; ir <= NR; ir++) { id[ir] = []; for (let ia = 0; ia <= NA; ia++) { const rr = ir / NR, a = ia / NA * Math.PI * 2, x = Math.cos(a) * rr, y = Math.sin(a) * rr, exx = x * ew, eyy = y * eh * (y < 0 ? 0.92 : 1);   // x toward the back, y up
      const back = exx * Math.cos(tilt) + eyy * Math.sin(tilt), up = eyy * Math.cos(tilt) - exx * Math.sin(tilt), yy = cy + up, zz = cz - back, off = field(rr, a, 0), px = s * (sideSkin(P, yy, zz) + off - 0.0012);
      id[ir][ia] = mesh.vert(L2W([px, yy, zz]), [s, 0.15 * y, -0.1 * x], x * 0.02, y * 0.02, MAT.SKIN, [[BONE_HEAD, 1]]); } }
  for (let ir = 0; ir < NR; ir++) for (let ia = 0; ia < NA; ia++) { const a1 = id[ir][ia], b1 = id[ir][ia + 1], c1 = id[ir + 1][ia], d1 = id[ir + 1][ia + 1]; if (s > 0) { mesh.tri(a1, c1, b1); mesh.tri(b1, c1, d1); } else { mesh.tri(a1, b1, c1); mesh.tri(b1, d1, c1); } }
  mesh.smooth(mesh.nv - (NR + 1) * (NA + 1));
  const ec = [s * (base0 + 0.0042), cy, cz + 0.0125 * e];
  ellipsoid(mesh, L2W([ec[0] + s * 0.0010, ec[1] - 0.0015, ec[2] + 0.001]), [0.0034, 0.0050, 0.0036], 7, 5, { mat: MAT.SKIN, skinFn: skHd });                  // tragus
  void base0;
}
// the lateral skull surface x at local height y and depth z (canonical shape; the ear sits on it)
function sideSkin(P, y, z) { const th = Math.acos(clamp(y / (HEAD_R[1] * P.faceLen), -0.98, 0.98)), ph = Math.acos(clamp(z / (HEAD_R[2] * Math.sin(th)), -0.99, 0.99)); return Math.abs(surf(P, th, ph, false, null).local[0]); }

// the neck (skin) joins the head to the chest: elliptical, girth 0.346 m at mid height (Gould 1869: 13.638 in), wider at the trapezius, closed tube
export function buildNeck(lod, mesh = new Mesh('neck'), P = null) {
  const sides = [28, 6, 4][lod], k = P ? P.neck : 1, sk = p => (p[1] < 1.46 ? [[BI.spine3, 0.5], [BI.neck, 0.5]] : p[1] < 1.52 ? [[BI.neck, 1]] : [[BI.neck, 0.5], [BI.head, 0.5]]);
  const rings = [[1.425, 0.012, 0.067, 0.058], [1.455, 0.014, 0.060, 0.054], [1.505, 0.016, 0.054, 0.050], [1.565, 0.022, 0.052, 0.049]].map(([y, z, rx, rz]) => ({ c: [0, y, z], u: [1, 0, 0], v: [0, 0, 1], ru: rx * k, rv: rz * k }));
  loft(mesh, lod === 0 ? rings : lod === 1 ? [rings[0], rings[2], rings[3]] : [rings[0], rings[3]], { sides, mat: MAT.SKIN, skinFn: sk, capStart: true, capEnd: true }); return mesh;
}

// ---- hair and facial hair: shells on the canonical head with a smooth, buried edge. A shell vertex outside the coverage sits 5 mm INSIDE the skin, so the visible boundary is the intersection curve of
// the shell and the skin (a smooth contour inside the grid cell, not a stair-step); triangles wholly outside the coverage are dropped. thickness: 8 to 17 mm with strand ridges (1 mm) and clumps (2 mm).
const BURY = 0.006, baseSurf = (th, ph) => surf({}, th, ph, true);
const noise = (a, b, k) => rand(0x2b1d, Math.round(a * 1000), a < 0.02 ? 0 : Math.round(b * 1000), k);
const vn = (x, y, z, k) => { const f = v => Math.floor(v), x0 = f(x), y0 = f(y), z0 = f(z), fx = x - x0, fy = y - y0, fz = z - z0, S = t => t * t * (3 - 2 * t), h = (i, j, l) => rand(0x6a1, i + 512, j + 512, (l + 512) * 7 + k); let a = 0;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let l = 0; l < 2; l++) a += h(x0 + i, y0 + j, z0 + l) * (i ? S(fx) : 1 - S(fx)) * (j ? S(fy) : 1 - S(fy)) * (l ? S(fz) : 1 - S(fz)); return a; };
// field(th, ph, local) -> { c: coverage 0..1, t: thickness (m) }
function shell(mesh, nu, nv, field, mat, bone = BONE_HEAD, jawBone = null, rangeV = [0, 1]) {
  const v0 = mesh.nv, id = [], cov = [];
  for (let j = 0; j <= nv; j++) { id[j] = []; cov[j] = []; for (let i = 0; i <= nu; i++) {
    const vv = rangeV[0] + (rangeV[1] - rangeV[0]) * j / nv, th = Math.PI * vv, ph = Math.PI * (2 * i / nu - 1), S = baseSurf(th, ph), f = field(th, ph, S.local, S), c = f.c, h = c <= 0 ? -BURY : -BURY + (f.t + BURY) * Math.pow(c, 0.85);
    cov[j][i] = c > 0; id[j][i] = mesh.vert(v3.add(S.p, v3.mul(S.n, h)), S.n, (ph - Math.PI) * 0.095, th * 0.11, mat, jawBone && S.local[1] < MOUTH_Y + 0.012 ? [[jawBone, 0.8], [bone, 0.2]] : [[bone, 1]]); } }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    if (!(cov[j][i] || cov[j + 1][i] || cov[j][i + 1] || cov[j + 1][i + 1])) continue; const a = id[j][i], b = id[j + 1][i], c = id[j][i + 1], d = id[j + 1][i + 1]; mesh.tri(a, b, c); mesh.tri(b, d, c);
  }
  mesh.smooth(v0); return mesh;
}
// hairline height (local y) around the head by azimuth anchors 0, 35, 70, 100, 140, 180 degrees (front to back) per style
const HAIRLINE = [[0.080, 0.071, 0.050, 0.030, 0.004, -0.030], [0.075, 0.064, 0.040, 0.026, -0.016, -0.052], [0.074, 0.060, 0.036, 0.024, -0.020, -0.056], [0.072, 0.060, 0.026, -0.030, -0.052, -0.062], [0.104, 0.088, 0.052, 0.030, -0.012, -0.048], [0.075, 0.064, 0.040, 0.026, -0.016, -0.050], [0.074, 0.046, 0.006, -0.022, -0.060, -0.088], [0.078, 0.064, 0.044, 0.030, -0.002, -0.036]];
const HAIR_T = [0.0085, 0.0105, 0.0120, 0.0150, 0.0095, 0.0105, 0.0135, 0.0155];
function hairlineAt(S, az) { const A = HAIRLINE[S], t = clamp(az / Math.PI, 0, 1) * 5, i = Math.min(4, Math.floor(t)), f = t - i, u = f * f * (3 - 2 * f); return A[i] + (A[i + 1] - A[i]) * u; }
function hairField(S) {
  const parts = S === 2;
  return (th, ph, loc) => {
    const x = loc[0], y = loc[1], z = loc[2], az = Math.abs(Math.atan2(x, z)), hl = hairlineAt(S, az) + 0.004 * (vn(x * 45, y * 45, z * 45, 1) - 0.5);
    let c = sm(-0.010, 0.026, y - hl); if (c <= 0) return { c: 0, t: 0 };
    if (S === 5) c *= 1 - sm(0.052, 0.040, Math.hypot(x * 1.2, (z + 0.015) * 0.7));                      // balding crown: a bare patch
    if (S === 4) c *= sm(0.020, 0.040, Math.abs(x) + 0.02 * sm(0.03, 0.05, z));
    // clumps (low frequency) and strand ridges radiating from the crown swirl (high frequency)
    const crown = Math.atan2(x - 0.006, z + 0.040), clump = vn(x * 160, y * 160, z * 160, 3) - 0.5, ridge = Math.sin(crown * 36 + 7 * clump) * (0.0006 + 0.0004 * vn(x * 90, y * 90, z * 90, 5));
    const top = sm(0.0, 0.09, y), puff = 1 + 0.35 * top + (S === 7 ? 0.35 * (vn(x * 70, y * 70, z * 70, 9)) : 0), partOff = parts ? 0.0022 * clamp((x - 0.018) / 0.03, -1, 1) : 0;
    const earCover = S === 3 ? 0.0095 * Math.exp(-((((Math.abs(x) - 0.072) / 0.022) ** 2) + (((y + 0.006) / 0.034) ** 2) + (((z + 0.004) / 0.032) ** 2))) : 0;      // the over-the-ears style swells over the ear (the ear no longer pokes through the shell)
    return { c, t: HAIR_T[S] * puff + 0.0025 * clump + ridge + partOff + earCover };
  };
}
export { hairField, beardField, baseSurf, vn as headNoise, BURY, MOUTH_Y };
export function buildHair(style, lod, mesh = new Mesh('hair_' + HAIR_STYLES[style])) {
  if (lod >= 2) { ellipsoid(mesh, [0, 1.655, 0.0], [0.081, 0.085, 0.100], 6, 3, { mat: MAT.HAIR, skinFn: skHd }); return mesh; }
  const nu = [96, 14][lod], nv = [32, 8][lod], F = hairField(style);
  shell(mesh, nu, nv, (th, ph, loc) => { const f = F(th, ph, loc); return lod ? { c: f.c, t: f.t + 0.0036 } : f; }, MAT.HAIR);      // LOD1 matches the outer strand-card layer of LOD0 (offset +3.6 mm: hand-over silhouette, G4)
  return mesh;
}
// facial hair coverage per type. Returns { c, t }; types: 1 moustache, 2 goatee (+ moustache), 3 full beard, 4 mutton chops (no moustache), 5 chin curtain, 6 Burnside whiskers (sideburns joined to a moustache, bare chin)
const yb = ax => (ax < 0.028 ? MOUTH_Y - 0.0095 : ax < 0.046 ? lerp(MOUTH_Y - 0.0095, -0.034, (ax - 0.028) / 0.018) : ax < 0.064 ? lerp(-0.034, -0.012, (ax - 0.046) / 0.018) : -0.004);
function beardField(T, P, th, ph, loc) {
  const x = loc[0], y = loc[1], z = loc[2], ax = Math.abs(x), az = Math.abs(Math.atan2(x, z)), k = vn(x * 140, y * 140, z * 140, 21), groove = Math.sin(x * 520 + 5 * (vn(x * 60, y * 60, z * 60, 4) - 0.5)) * 0.0007;
  let c = 0, t = 0.0085;
  const stache = () => { const sx = 0.034 * P.stache, ym = MOUTH_Y + 0.0165, w = ((x / sx) ** 2 + ((y - ym) / 0.0140) ** 2); let q = 1 - w; q = clamp(q * 1.7, 0, 1) * sm(0.040, 0.060, z) * (1 - 0.8 * Math.exp(-((ax / 0.0032) ** 2)) * sm(ym + 0.002, ym - 0.012, y)) * sm(MOUTH_Y + 0.0025, MOUTH_Y + 0.0125, y); return q; };
  // side whiskers: a WEDGE on the cheek (round 3): narrow sideburn in front of the ear at y 0.04 (about 15 mm), flaring forward along the jaw to a broad chop under the cheekbone, ending in a rounded, tapering lower edge
  const side = (lo, hi) => { const s = sm(0.035, -0.075, y), azF = 1.50 - 0.55 * s, azB = 1.68 + 0.14 * s, w = 0.07; return sm(0.048, 0.060, ax) * sm(hi, hi - 0.012, y) * sm(lo, lo + 0.030, y) * sm(azF - w, azF + w, az) * sm(azB + w, azB - w, az) * (1 - 0.45 * sm(-0.06, -0.098, y) * (az > azF + 0.25 ? 0 : 1)); };
  if (T === 1) { c = stache(); t = 0.0092 * P.stache; }
  else if (T === 2) { const ch = clamp(1.2 - Math.hypot(x / 0.021, (y + 0.086) / 0.026), 0, 1); c = Math.max(stache(), ch * sm(MOUTH_Y - 0.006, MOUTH_Y - 0.016, y)); t = 0.0105; }
  else if (T === 3) { const jawReg = sm(yb(ax) + 0.002, yb(ax) - 0.011, y) * sm(Math.PI * 0.66, Math.PI * 0.5, az) * (1 - sm(0.052, 0.064, ax) + sm(0.052, 0.064, ax) * Math.min(1, sm(0.0, 0.040, z) + sm(-0.02, -0.06, y))); c = Math.max(jawReg, stache() * 0.95); t = 0.0125 * (0.85 + 0.3 * k); }
  else if (T === 4) { c = side(-0.086, 0.046); t = 0.0115; }
  else if (T === 5) { c = sm(-0.058, -0.074, y) * sm(Math.PI * 0.62, Math.PI * 0.45, az) * (1 - 0.9 * sm(0.020, 0.012, ax) * sm(-0.07, -0.086, y) * 0); t = 0.0115; }
  else if (T === 6) { c = Math.max(side(-0.066, 0.046), stache()); t = 0.0095; }
  return { c: clamp(c, 0, 1), t: t + groove };
}
export function buildFacialHair(type, lod, mesh = new Mesh('beard_' + FACIAL_HAIR[type])) {
  if (type === 0) return mesh;
  const P = headParams(0), T = type;
  if (lod >= 2) { if (T !== 1 && T !== 4) ellipsoid(mesh, [0, 1.545, 0.075], [0.05, 0.04, 0.035], 5, 3, { mat: MAT.HAIR, skinFn: () => [[BONE_JAW, 0.6], [BONE_HEAD, 0.4]] }); return mesh; }
  const nu = [88, 14][lod], nv = [24, 8][lod], PP = { ...P, stache: 1.0 };
  shell(mesh, nu, nv, (th, ph, loc) => { const f = beardField(T, PP, th, ph, loc); return lod ? { c: f.c, t: f.t + 0.0022 } : f; }, MAT.HAIR, BONE_HEAD, BONE_JAW, [0.44, 0.93]);
  // the hanging mass of a full beard, goatee and chin curtain: a lofted tapered volume with vertical grooves, hung from the chin on the jaw bone
  if (lod === 0 && (T === 2 || T === 3 || T === 5)) {
    const TAB = [[0, -0.086, 0.050, 0.030, 0.024], [0.15, -0.101, 0.060, 0.034, 0.028], [0.4, -0.122, 0.069, 0.033, 0.029], [0.7, -0.143, 0.073, 0.026, 0.024], [1, -0.160, 0.074, 0.006, 0.006]], kw = T === 3 ? 1 : T === 2 ? 0.42 : 0.80, kd = T === 3 ? 1 : T === 2 ? 0.45 : 0.55, kl = T === 3 ? 1 : T === 2 ? 0.45 : 0.5;
    const rings = TAB.map(([t, y, z, ru, rv], k) => ({ c: v3.add([0, -0.086 + (y + 0.086) * kl, z], HEAD_C), u: [1, 0, 0], v: [0, 0, 1], ru: Math.max(0.0008, ru * kw), rv: Math.max(0.0008, rv * kd), rfn: a => 1 + 0.06 * Math.sin(a * 9 + k * 1.3) }));
    loft(mesh, rings, { sides: 24, mat: MAT.HAIR, skinFn: () => [[BONE_JAW, 0.85], [BONE_HEAD, 0.15]], capStart: false, capEnd: true, smoothNormals: true });
  }
  return mesh;
}
// ---- the whole head part (skin + detail + neck) for a head index at a LOD
export function buildHead(idx, lod) { const P = headParams(idx), m = new Mesh('head' + idx); buildHeadSkin(P, lod, m); buildFaceDetail(P, lod, m); buildNeck(lod, m, P); m.meta = { params: P, closed: false }; return m; }
// bound on the morph displacement in hair-covered regions (tests): max |shaped - canonical| over the scalp (local y > 0.05, above the brow ridge and the forehead eminences)
export function scalpMorphMax(P) { const FT = features(P, 0); let mx = 0; for (let j = 2; j < 14; j++) for (let i = 0; i <= 30; i++) { const th = mapV(j / 28 * 0.5), ph = mapU(i / 30), a = surf(P, th, ph, false, FT), b = surf({}, th, ph, true); if (b.local[1] > 0.05) mx = Math.max(mx, v3.len(v3.sub(a.p, b.p))); } return mx; }

// shell statistics for the tests: the largest offset step between two neighbouring grid vertices (a cliff would show as a stair-stepped edge) and the covered fraction of the grid
export function shellStats(kind, which) {
  const nu = kind === 'hair' ? 96 : 88, nv = kind === 'hair' ? 32 : 24, rv = kind === 'hair' ? [0, 1] : [0.44, 0.93], F = kind === 'hair' ? hairField(which) : (th, ph, loc) => beardField(which, { stache: 1 }, th, ph, loc), H = [], Pp = [];
  for (let j = 0; j <= nv; j++) { H[j] = []; Pp[j] = []; for (let i = 0; i <= nu; i++) { const th = Math.PI * (rv[0] + (rv[1] - rv[0]) * j / nv), ph = Math.PI * (2 * i / nu - 1), S = baseSurf(th, ph), f = F(th, ph, S.local, S); Pp[j][i] = S.local; H[j][i] = f.c <= 0 ? -BURY : -BURY + (f.t + BURY) * Math.pow(f.c, 0.85); } }
  let slope = 0, cov = 0, step = 0; const slopeOf = (a, b, ha, hb) => { const d = v3.len(v3.sub(a, b)); return d > 1e-4 ? Math.abs(ha - hb) / d : 0; };
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { if (H[j][i] > 0) cov++; if (i < nu) { slope = Math.max(slope, slopeOf(Pp[j][i], Pp[j][i + 1], H[j][i], H[j][i + 1])); step = Math.max(step, Math.abs(H[j][i + 1] - H[j][i])); } if (j < nv) { slope = Math.max(slope, slopeOf(Pp[j][i], Pp[j + 1][i], H[j][i], H[j + 1][i])); step = Math.max(step, Math.abs(H[j + 1][i] - H[j][i])); } }
  return { maxSlope: slope, maxStep: step, covered: cov / ((nu + 1) * (nv + 1)) };
}
