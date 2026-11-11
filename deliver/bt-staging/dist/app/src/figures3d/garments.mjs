// Garment generators: coats/jackets/shirts (torso + sleeves + collar + buttons), trousers, footwear, headgear, rank marks. Each takes a cut spec (garment specs are mapped from kit catalogue
// items in visuals.mjs), a LOD (0 close, 1 mid, 2 low) and a body shape {g, c}; the result is a skinned Mesh over the shared rig. Cut dimensions are PLAUSIBLE-PROCEDURAL (TIERS.json F-CUT-DIMS):
// only the cut NAMES (sack, frock, four brass buttons, nine front buttons, collarless, short jacket ...) and the colour/trim words come from the kit records.
import { v3, clamp, smooth, m4, qAxisAngle, frame } from './mathlib.mjs';
import { Mesh, loft, tube, ellipsoid, box, lathe, warp, limbProfile, strap } from './meshkit.mjs';
import { BI, H, RES, ARM_DIR, torsoAt, torsoRings, armPts, legPts, limbScale, skinTorsoBoth, skinArm, skinLeg, NEUTRAL } from './body.mjs';
import { MAT } from './palette.mjs';
import { drapeFold, creaseFold, stitches, seam, button, rivet, strands } from './detail.mjs';

const hemFlare = (y, hem, flare) => (y >= hem + 0.0 ? flare * smooth(0.95, hem, y) : flare);
// ---------------------------------------------------------------- coats
// cut: { hem, ease, flare, collar: 'fall'|'stand'|'none'|'open', rows: 1|2, buttons: n, trim: 'cuff'|'collar'|'piping'|null, sleeve: ease, sleeveLen: 1 (full), straps: bool, vest: bool }
export const COAT_CUTS = {
  sack: { hem: 0.74, ease: 0.034, flare: 0.012, collar: 'fall', rows: 1, buttons: 4, sleeve: 0.016, label: 'sack coat: loose, four brass buttons, fall collar (kit: sack_coat_union)' },
  frock: { hem: 0.60, ease: 0.014, flare: 0.050, collar: 'stand', rows: 1, buttons: 9, sleeve: 0.010, trim: 'piping', label: 'frock coat: nine front buttons, knee-length skirt' },
  frock_double: { hem: 0.60, ease: 0.016, flare: 0.052, collar: 'stand', rows: 2, buttons: 14, sleeve: 0.010, trim: 'piping', label: 'double-breasted frock coat' },
  short_jacket: { hem: 0.95, ease: 0.012, flare: 0.006, collar: 'stand', rows: 1, buttons: 9, sleeve: 0.009, trim: 'piping', label: 'short mounted-service / shell jacket' },
  shell_cs: { hem: 0.93, ease: 0.014, flare: 0.006, collar: 'stand', rows: 1, buttons: 9, sleeve: 0.010, straps: true, label: 'Confederate shell jacket: nine buttons, shoulder straps' },
  zouave: { hem: 1.02, ease: 0.016, flare: 0.0, collar: 'none', rows: 0, buttons: 0, sleeve: 0.014, trim: 'piping', vest: true, label: 'collarless short Zouave jacket (open front with vest)' },
  tunic6: { hem: 0.72, ease: 0.018, flare: 0.020, collar: 'stand', rows: 1, buttons: 6, sleeve: 0.012, trim: 'piping', label: 'six-button tunic' },
  civilian: { hem: 0.66, ease: 0.030, flare: 0.030, collar: 'fall', rows: 1, buttons: 5, sleeve: 0.016, label: 'civilian-style coat' },
  shirt: { hem: 0.90, ease: 0.020, flare: 0.006, collar: 'open', rows: 1, buttons: 3, sleeve: 0.014, label: 'shirt, coat off (shirt-sleeves)' },
};
export function buildCoat(cut, lod, shape = NEUTRAL, opt = {}) {
  const C = typeof cut === 'string' ? COAT_CUTS[cut] : cut, R = RES[lod], mesh = new Mesh('coat:' + (opt.name ?? cut)), sk = skinTorsoBoth(), matBody = opt.mat ?? MAT.COAT, matTrim = opt.trimMat ?? MAT.COAT_TRIM, F0 = lod === 0;
  const baseNvHolder = {}; const nR = [30, 12, 3][lod], top = 1.43, hem = C.hem, cutSeed = Object.keys(COAT_CUTS).indexOf(typeof cut === 'string' ? cut : 'sack') + 1;
  // LOD1/LOD2 carry the mean outward bias of the LOD0 folds (+2.5 mm) so the hand-over silhouette (G4) does not widen with the larger round 3 drape
  const ease = y => C.ease + (lod > 0 ? 0.0025 : 0) + (y < 0.9 ? hemFlare(y, hem, C.flare) : 0) + (y > 1.36 ? -0.004 * (y - 1.36) / 0.07 : 0);
  // cloth folds (LOD0 only; pure functions of angle and height, so every body shape key has the same topology): skirt drape, creasing above the belt, pull wrinkles beside the button stand
  // round 3: the folds are larger and outward-biased (a fold never cuts inward by more than 3 mm: the trousers are clamped inside the skirt envelope less 4 mm for folds), with the real causes of cloth folds:
  // vertical drape from the waist to the hem, the blouse bunching above the belt, diagonal pull wrinkles at the button stand, the shoulder pull from the armscye; the wrinkle byte (vertex flag) drives the fold normal map
  const ow = f => (f < 0 ? f * 0.30 : f);
  const skirt = drapeFold({ amp: C.flare > 0.03 ? 0.0100 : 0.0072, n: C.flare > 0.03 ? 13 : 9, y0: 0.99, y1: hem, seed: cutSeed });
  const ringY = i => hem + (top - hem) * i / (nR - 1);
  const torsoDisp = F0 ? (a, i) => { const y = ringY(i), belt = Math.exp(-(((y - 1.075) / 0.035) ** 2)), front = Math.max(0, Math.sin(a)), blouse = Math.exp(-(((y - 1.13) / 0.05) ** 2)) * (0.55 + 0.45 * Math.sin(a * 11 + 1.7)) * (C.ease > 0.025 ? 1 : 0.55);
    const pull = front * Math.exp(-(((y - 1.20) / 0.08) ** 2)) * Math.sin(a * 14 + y * 55), shoulder = Math.exp(-(((y - 1.33) / 0.07) ** 2)) * Math.sin(a * 6 + y * 30) * Math.abs(Math.cos(a));
    return ow(skirt(a, y)) + 0.0030 * belt * Math.sin(a * 7 + 1.3) * (0.4 + 0.6 * front) + 0.0072 * blouse + 0.0030 * pull + 0.0022 * shoulder; } : null;
  const wrinkleTorso = (a, i, acc, p) => { const y = p[1], vertical = y < 0.96, wr = vertical ? 0.95 * smooth(0.99, hem + 0.02, y) : Math.max(0.85 * Math.exp(-(((y - 1.10) / 0.07) ** 2)), 0.55 * Math.exp(-(((y - 1.22) / 0.07) ** 2)) * Math.max(0, Math.sin(a)), 0.5 * Math.exp(-(((y - 1.33) / 0.05) ** 2))); return (Math.round(clamp(wr, 0, 1) * 63) & 63) | (vertical ? 128 : 0); };
  // torso + skirt (open at the hem and at the neck)
  loft(mesh, torsoRings(hem, top, nR, ease, shape), { sides: R.torso, mat: matBody, skinFn: p => skinFnSkirt(sk, p, hem), flag: 0, disp: torsoDisp, flagFn: F0 ? wrinkleTorso : null });
  const torsoNv = mesh.nv;
  // sleeves: shoulder -> elbow -> wrist, one loft each (A-pose arms); elbow creases on the inside of the bend (LOD0)
  const sleeveInfo = [];
  for (const s of ['L', 'R']) {
    const { sh, el, wr } = armPts(s), k = limbScale(shape), skA = skinArm(s), e = C.sleeve, nrg = F0 ? 8 : Math.max(1, R.lr - 1), sd = F0 ? 20 : R.limb;
    const p0 = v3.add(sh, v3.mul(ARM_DIR, -0.02));
    const upper = F0 ? creaseFold({ amp: 0.0046, at: 1.0, width: 0.20, n: 6, seed: 31 }) : null, lower = F0 ? creaseFold({ amp: 0.0042, at: 0.0, width: 0.20, n: 6, seed: 37 }) : null, shoulder = F0 ? creaseFold({ amp: 0.0030, at: 0.0, width: 0.16, n: 5, seed: 41 }) : null;
    const lu = v3.len(v3.sub(el, p0)), ll = v3.len(v3.sub(wr, el));
    const elbowW = t => Math.exp(-(((t - 1.0) / 0.22) ** 2)), elbowW2 = t => Math.exp(-(((t - 0.0) / 0.22) ** 2));
    tube(mesh, p0, el, limbProfile(0.052 * k + e, 0.040 * k + e, nrg), { sides: sd, mat: matBody, skinFn: skA, disp: F0 ? (a, i, v) => ow(upper(a, v / lu)) + ow(shoulder(a, v / lu)) + 0.0024 * Math.exp(-(((v / lu - 0.0) / 0.2) ** 2)) * Math.sin(a * 3 + 1) : null, flagFn: F0 ? (a, i, v) => Math.round(63 * Math.min(1, 0.95 * elbowW(v / lu) + 0.45 * Math.exp(-((v / lu / 0.15) ** 2)))) & 63 : null });
    tube(mesh, el, wr, limbProfile(0.040 * k + e, 0.031 * k + e * 0.7, nrg), { sides: sd, mat: matBody, skinFn: skA, disp: F0 ? (a, i, v) => ow(lower(a, v / ll)) + 0.0026 * Math.exp(-(((1 - v / ll) / 0.15) ** 2)) * Math.sin(a * 6 + 2) : null, flagFn: F0 ? (a, i, v) => Math.round(63 * Math.min(1, 0.95 * elbowW2(v / ll) + 0.4 * Math.exp(-((((ll - v) / ll) / 0.10) ** 2)))) & 63 : null });
    if (F0 && C.trim) tube(mesh, v3.add(wr, v3.mul(ARM_DIR, -0.045)), v3.add(wr, v3.mul(ARM_DIR, 0.002)), [[0, 0.0345 * k + e], [1, 0.0335 * k + e]], { sides: sd, mat: matTrim, skinFn: skA, capStart: false });
    sleeveInfo.push({ s, sh: p0, el, wr, k, e, skA });
  }
  if (lod <= 1) addCollar(mesh, C, lod, matBody, matTrim);
  baseNvHolder.n = mesh.nv; if (F0) coatDetail(mesh, C, shape, ease, sk, hem, top, matBody, matTrim, sleeveInfo);
  mesh.meta = { closed: false, openOk: true, cut: opt.name ?? cut, baseNv: baseNvHolder.n, torsoNv };
  return mesh;
}
// ---- LOD0 coat detail: front facing (button stand), brass buttons with a raised rim and a device, seams (side, back, armscye, sleeve), hem/front/collar/cuff topstitching, shoulder straps, vest panel
function coatDetail(mesh, C, shape, ease, sk, hem, top, matBody, matTrim, sleeves) {
  const rows = C.rows, n = C.buttons;
  // a point and outward normal on the coat surface at height y and lateral position x (front, side = +1) or angle
  const surf = (xo, y, side = 1, off = 0) => { const t = torsoAt(y, shape), e = ease(y) + off, ru = t.rx + e, rv = t.rz + e, q = clamp(xo / ru, -0.985, 0.985), z = t.cz + side * rv * Math.sqrt(1 - q * q); return [xo, y, z]; };
  const nrmAt = p => { const t = torsoAt(clamp(p[1], 0.5, 1.47), shape), e = ease(clamp(p[1], 0.5, 1.43)), ru = t.rx + e, rv = t.rz + e; return v3.norm([p[0] / (ru * ru), 0, (p[2] - t.cz) / (rv * rv)]); };
  const polarPt = (a, y, off = 0) => { const t = torsoAt(y, shape), e = ease(y) + off; return [(t.rx + e) * Math.cos(a), y, t.cz + (t.rz + e) * Math.sin(a)]; };
  const yHi = top - 0.03, yLo = C.hem > 0.9 ? C.hem + 0.02 : Math.max(hem + 0.04, 0.84);
  const stand = (xo) => { const pts = []; for (let i = 0; i <= 18; i++) pts.push(surf(xo, yHi + (yLo - yHi) * i / 18, 1, 0)); return pts; };
  // button stand(s): the folded front facing, a raised ribbon either side of the button line, topstitched
  if (rows > 0) for (let r = 0; r < rows; r++) {
    const xo = rows === 2 ? (r === 0 ? -1 : 1) * 0.045 : 0, ctr = stand(xo);
    seam(mesh, ctr, nrmAt, { w: 0.034, h: 0.0016, mat: matBody, skinFn: sk, lift: 0.0002 });
    for (const dx of [-0.0185, 0.0185]) stitches(mesh, stand(xo + dx), nrmAt, { count: 43, skinFn: sk, lift: 0.0013 });
  }
  // buttons
  for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
    const y = top - 0.035 - i * ((top - 0.035 - Math.max(hem + 0.04, 0.84)) / Math.max(1, n - 1)) * (C.hem < 0.8 ? 0.8 : 1), xo = rows === 2 ? (r === 0 ? -1 : 1) * 0.045 : 0;
    if (C.hem > 0.9 && y < C.hem) continue; const p = surf(xo, y, 1, 0.0018); button(mesh, p, nrmAt(p), 0.0092, { mat: MAT.BRASS, skinFn: sk, sides: 14 });
  }
  // seams: side seams (armpit to hem), centre back, a tapered dart on each back panel; topstitched hem (a closed loop), vent at the back of a frock
  for (const a of [0, Math.PI]) { const pts = []; for (let i = 0; i <= 14; i++) pts.push(polarPt(a, 1.27 - (1.27 - hem - 0.01) * i / 14, 0.0004)); seam(mesh, pts, nrmAt, { w: 0.005, h: 0.0016, mat: matBody, skinFn: sk }); }
  { const pts = []; for (let i = 0; i <= 18; i++) pts.push(polarPt(-Math.PI / 2, top - 0.02 - (top - 0.02 - hem - 0.01) * i / 18, 0.0004)); seam(mesh, pts, nrmAt, { w: 0.005, h: 0.0016, mat: matBody, skinFn: sk }); }
  for (const a of [-Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5]) { const pts = []; for (let i = 0; i <= 10; i++) pts.push(polarPt(a + (a < -Math.PI / 2 ? 0.08 : -0.08) * i / 10, 1.30 - (1.30 - 0.98) * i / 10, 0.0004)); seam(mesh, pts, nrmAt, { w: 0.004, h: 0.0012, mat: matBody, skinFn: sk }); }
  { const loop = []; for (let i = 0; i <= 64; i++) loop.push(polarPt(i / 64 * Math.PI * 2, hem + 0.022, 0.0004)); stitches(mesh, loop, nrmAt, { count: 76, skinFn: sk, lift: 0.0006 }); const loop2 = []; for (let i = 0; i <= 64; i++) loop2.push(polarPt(i / 64 * Math.PI * 2, hem + 0.004, 0.0002)); seam(mesh, loop2, nrmAt, { w: 0.004, h: 0.0016, mat: matBody, skinFn: sk }); }
  // sleeves: back seam of each sleeve, armscye ring, cuff topstitching, cuff buttons (frock and officer cuts), shoulder straps
  for (const S of sleeves) {
    const x = S.s === 'L' ? 1 : -1, dirA = v3.norm(v3.sub(S.wr, S.sh)), rAt = t => (0.052 * S.k + S.e) + ((0.031 * S.k + S.e * 0.7) - (0.052 * S.k + S.e)) * t;
    const back = [], tl = 9; for (let i = 0; i <= tl; i++) { const t = i / tl, c = v3.lerp(S.sh, S.wr, t); back.push([c[0], c[1], c[2] - rAt(t) * 1.002]); }
    seam(mesh, back, () => [0, 0, -1], { w: 0.0045, h: 0.0015, mat: matBody, skinFn: S.skA });
    const ring = [], rc = v3.add(S.sh, v3.mul(dirA, 0.045)), [u1, v1] = frame(dirA); for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI * 2; ring.push(v3.add(rc, v3.add(v3.mul(u1, Math.cos(a) * (0.0525 * S.k + S.e)), v3.mul(v1, Math.sin(a) * (0.0525 * S.k + S.e))))); }
    stitches(mesh, ring, p => v3.norm(v3.sub(p, rc)), { count: 23, skinFn: S.skA, lift: 0.0005 });
    const cr = v3.add(S.wr, v3.mul(ARM_DIR, -0.012)), [u2, v2] = frame(ARM_DIR), cw = 0.0338 * S.k + S.e, cuffRing = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2; cuffRing.push(v3.add(cr, v3.add(v3.mul(u2, Math.cos(a) * cw), v3.mul(v2, Math.sin(a) * cw)))); }
    stitches(mesh, cuffRing, p => v3.norm(v3.sub(p, cr)), { count: 15, skinFn: S.skA, lift: 0.0006 });
    if (C.trim) for (let b = 0; b < 2; b++) { const c = v3.add(S.wr, v3.mul(ARM_DIR, -0.028 + b * 0.0)), a = (b ? -0.3 : 0.3) + Math.PI / 2, p = v3.add(c, v3.add(v3.mul(u2, Math.cos(a) * (cw + 0.001)), v3.mul(v2, Math.sin(a) * (cw + 0.001)))); button(mesh, p, v3.norm(v3.sub(p, c)), 0.0072, { mat: MAT.BRASS, skinFn: S.skA, sides: 12 }); }
    if (C.straps) { box(mesh, [x * 0.14, 1.435, 0.0], [0.028, 0.004, 0.045], { mat: matBody, skinFn: sk }); button(mesh, [x * 0.158, 1.4405, 0.0], [0, 1, 0], 0.0072, { mat: MAT.BRASS, skinFn: sk, sides: 12 }); stitches(mesh, [[x * 0.114, 1.4395, 0.044], [x * 0.166, 1.4395, 0.044]], () => [0, 1, 0], { count: 4, skinFn: sk }); stitches(mesh, [[x * 0.114, 1.4395, -0.044], [x * 0.166, 1.4395, -0.044]], () => [0, 1, 0], { count: 4, skinFn: sk }); }
  }
  // collar topstitching (a ring round the stand/fall collar) and the vest panel of the Zouave cut
  if (C.collar !== 'none') { const loop = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; loop.push([Math.cos(a) * 0.0675, 1.452, 0.01 + Math.sin(a) * 0.065]); } stitches(mesh, loop, p => v3.norm([p[0], 0, p[2] - 0.01]), { count: 30, skinFn: () => [[BI.neck, 0.7], [BI.spine3, 0.3]], lift: 0.0006 }); }
  if (C.vest) { const t = torsoAt(1.2, shape); box(mesh, [0, 1.2, t.cz + t.rz + 0.004], [0.05, 0.15, 0.004], { mat: matTrim, skinFn: sk }); for (let i = 0; i < 6; i++) button(mesh, [0, 1.3 - i * 0.045, t.cz + t.rz + 0.0093], [0, 0, 1], 0.0065, { mat: MAT.BRASS, skinFn: sk, sides: 10 }); }
}
// the skirt region (below the pelvis) follows the thighs: below y 0.84 the cloth hangs from the pelvis bone, easing into the thighs only below the crotch
function skinFnSkirt(sk, p, hem) { if (p[1] > 0.88) return sk(p); const k = clamp((0.88 - p[1]) / 0.30, 0, 1) * 0.35; return [[BI.pelvis, 1 - k * 0.6], [p[0] > 0 ? BI.thigh_L : BI.thigh_R, k * 0.6]]; }
function addCollar(mesh, C, lod, matBody, matTrim) {
  if (C.collar === 'none') return; const sk = () => [[BI.neck, 0.7], [BI.spine3, 0.3]], sides = lod === 0 ? 14 : 7;
  const mat = C.trim === 'piping' && C.collar === 'stand' ? matBody : matBody;
  if (C.collar === 'stand') loft(mesh, [{ c: [0, 1.445, 0.01], u: [1, 0, 0], v: [0, 0, 1], ru: 0.068, rv: 0.066 }, { c: [0, 1.495, 0.012], u: [1, 0, 0], v: [0, 0, 1], ru: 0.059, rv: 0.058 }], { sides, mat, skinFn: sk });
  else if (C.collar === 'fall') loft(mesh, [{ c: [0, 1.43, 0.008], u: [1, 0, 0], v: [0, 0, 1], ru: 0.072, rv: 0.070 }, { c: [0, 1.472, 0.01], u: [1, 0, 0], v: [0, 0, 1], ru: 0.080, rv: 0.077 }, { c: [0, 1.488, 0.012], u: [1, 0, 0], v: [0, 0, 1], ru: 0.072, rv: 0.070 }], { sides, mat, skinFn: sk });
  else if (C.collar === 'open') loft(mesh, [{ c: [0, 1.435, 0.01], u: [1, 0, 0], v: [0, 0, 1], ru: 0.070, rv: 0.068 }, { c: [0, 1.470, 0.012], u: [1, 0, 0], v: [0, 0, 1], ru: 0.064, rv: 0.062 }], { sides, mat, skinFn: sk });
}

// ---------------------------------------------------------------- trousers
// cut: { kind: 'straight'|'baggy'|'chasseur', ease, stripe: 0|1, seat: bool, tuck: 'boots'|'gaiters' }
export const TROUSER_CUTS = {
  straight: { ease: 0.016, taper: 0.9, label: 'straight kersey / cloth trousers, high waist, no pleats' }, loose: { ease: 0.026, taper: 1.0, label: 'looser civilian / replacement trousers' },
  baggy: { ease: 0.060, taper: 0.8, bag: 1.9, label: 'baggy Zouave pantaloons (gathered at the knee)' }, chasseur: { ease: 0.030, taper: 0.85, bag: 1.35, label: 'chasseur trousers (gaiters over the lower leg)' },
};
export function buildTrousers(cut, lod, shape = NEUTRAL, opt = {}) {
  const C = typeof cut === 'string' ? TROUSER_CUTS[cut] : cut, R = RES[lod], mesh = new Mesh('trousers:' + (opt.name ?? cut)), k = limbScale(shape), mat = opt.mat ?? MAT.TROUSERS, e = C.ease, F0 = lod === 0;
  const tSeed = Object.keys(TROUSER_CUTS).indexOf(typeof cut === 'string' ? cut : 'straight') + 1;
  const seatN = [11, 3, 2][lod], seatRings = torsoRings(0.80, 1.07, seatN, e * 0.4, shape), seatY = i => 0.80 + 0.27 * i / (seatN - 1);
  loft(mesh, seatRings, { sides: R.torso, mat, skinFn: p => [[BI.pelvis, 1]], disp: F0 ? (a, i) => 0.0022 * Math.exp(-(((seatY(i) - 0.86) / 0.05) ** 2)) * Math.sin(a * 5 + 0.7) + 0.0016 * Math.exp(-(((seatY(i) - 1.04) / 0.03) ** 2)) * Math.sin(a * 9) : null });
  // waistband at the top
  if (lod === 0) loft(mesh, torsoRings(1.055, 1.08, 3, e * 0.4 + 0.002, shape), { sides: R.torso, mat: opt.bandMat ?? mat, skinFn: p => [[BI.pelvis, 1]] });
  const legInfo = [], legRanges = [], seatEnd = mesh.nv;
  for (const s of ['L', 'R']) {
    const lg = legPts(s), skL = skinLeg(s), x = s === 'L' ? 1 : -1, legV0 = mesh.nv;
    const bag = C.bag ?? 1;
    const thighR = 0.090 * k + e, kneeR = 0.058 * k + e * (bag > 1 ? 1.1 : 0.6), ankR = 0.042 * k + e * 0.4;
    const nr = F0 ? 9 : Math.max(1, R.lr - 2), sd = F0 ? 18 : R.limb;
    const hip = [lg.hip[0] * 0.92, 0.86, lg.hip[2]];
    // upper leg (hip->knee) and lower leg (knee->ankle) as lofts; baggy cuts swell between thigh and knee and gather at the knee
    const bulge = (t, r) => r * (bag > 1 ? 1 + (bag - 1) * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.8) : 1);
    const lenU = v3.len(v3.sub(lg.knee, hip)), lowEnd = [lg.ankle[0], 0.115, lg.ankle[2]], lenL = v3.len(v3.sub(lowEnd, lg.knee));
    // round 3: larger, outward-biased creases: the knee bag (cloth pulled forward by the bent knee), the groin and thigh pull, the TROUSER BREAK (cloth bunching in rings above the boot top), a slow bag over the thigh
    const own = f => (f < 0 ? f * 0.30 : f), kneeBag = F0 ? creaseFold({ amp: 0.0058, at: 1.0, width: 0.20, n: 6, seed: 51 + tSeed }) : null, kneeBagL = F0 ? creaseFold({ amp: 0.0052, at: 0.0, width: 0.17, n: 5, seed: 57 + tSeed }) : null, groin = F0 ? creaseFold({ amp: 0.0050, at: 0.02, width: 0.14, n: 5, seed: 61 + tSeed }) : null;
    const wU = (a, i, v) => Math.round(63 * Math.min(1, 0.95 * Math.exp(-(((v / lenU - 1.0) / 0.2) ** 2)) + 0.8 * Math.exp(-(((v / lenU - 0.02) / 0.14) ** 2)))) & 63, wL = (a, i, v) => Math.round(63 * Math.min(1, 0.95 * Math.exp(-(((v / lenL) / 0.2) ** 2)) + 0.9 * Math.exp(-((((lenL - v) / lenL) / 0.13) ** 2)))) & 63;
    tube(mesh, hip, lg.knee, limbProfile(thighR, kneeR, nr + 1, 0.0, bulge), { sides: sd, mat, skinFn: skL, disp: F0 ? (a, i, v) => own(kneeBag(a, v / lenU)) + own(groin(a, v / lenU)) + 0.0024 * Math.sin(a * 7 + v * 20) * (0.3 + 0.7 * (v / lenU)) + 0.0022 * Math.sin(a * 3 + 0.5) * Math.sin(v / lenU * 3.1) : null, flagFn: F0 ? wU : null });
    const lowBulge = (t, r) => (C.bag && C.bag > 1.5 ? r * (1 + 0.5 * (1 - t) * (1 - t)) : r);
    tube(mesh, lg.knee, lowEnd, limbProfile(kneeR, ankR, nr, 0.0, C.tuck === 'boots' ? (t, r) => r * (1 + 0.15 * t) : lowBulge), { sides: sd, mat, skinFn: skL, disp: F0 ? (a, i, v) => own(kneeBagL(a, v / lenL)) + 0.0070 * Math.exp(-((((lenL - v) / lenL) / 0.11) ** 2)) * (0.55 + 0.45 * Math.sin(a * 8 + 0.9)) * (0.6 + 0.4 * Math.sin(v * 160)) + 0.0018 * Math.sin(a * 5 + v * 30) : null, flagFn: F0 ? wL : null });
    if (lod === 0 && opt.stripe) {                                                                   // outseam stripe: a thin ribbon along the outside of the leg
      const pts = []; for (let i = 0; i <= 14; i++) { const t = i / 14, y = 1.05 - t * 0.93; const rr = y > lg.knee[1] ? (thighR + (kneeR - thighR) * ((0.86 - y) / (0.86 - lg.knee[1]))) : (kneeR + (ankR - kneeR) * ((lg.knee[1] - y) / (lg.knee[1] - 0.115))); pts.push([x * (lg.hip[0] + (rr + 0.002)), y, 0.0]); }
      strap(mesh, pts, opt.stripeW ?? 0.018, 0.003, { mat: opt.stripeMat ?? MAT.TROUSER_TRIM, skinFn: skL });
    }
    if (lod === 0 && opt.seat) ellipsoid(mesh, [x * 0.06, 0.93, -0.095], [0.085, 0.09, 0.030], 16, 8, { mat: MAT.LEATHER_TAN, skinFn: () => [[BI.pelvis, 1]] });
    legRanges.push([legV0, mesh.nv]); legInfo.push({ s, x, lg, skL, thighR, kneeR, ankR, hip, lowEnd });
  }
  if (F0) trouserDetail(mesh, C, shape, e, mat, opt, legInfo, 'legs');
  const inLeg = i => i >= seatEnd;
  clampToSkirt(mesh, shape, opt.env ?? '0', seatEnd);
  clampToFootwear(mesh, legInfo, k, inLeg);
  if (F0) trouserDetail(mesh, C, shape, e, mat, opt, legInfo, 'seat');
  mesh.meta = { closed: false, openOk: true };
  return mesh;
}
// Legs and seat are kept inside the TIGHTEST long-coat skirt envelope (the minimum over the coat cuts that reach that height, less 4 mm for folds) between y 0.74 and 1.0, so no coat cut is pierced by any
// trouser cut at any body shape (checked numerically by tests/figures3d.test.mjs through interpen.mjs). A pure function of position and shape: shape keys keep identical topology.
export const SKIRT_ENV = { L: ['frock', 'frock_double', 'civilian'], M: ['sack', 'tunic6'], S: ['short_jacket', 'shell_cs', 'zouave', 'shirt'] };
function skirtEase(y, env) { let m = 1e9; for (const k of SKIRT_ENV[env] ?? []) { const C = COAT_CUTS[k]; if (C.hem <= y + 0.02) m = Math.min(m, C.ease + (y < 0.9 ? hemFlare(y, C.hem, C.flare) : 0)); } return m; }
function clampToSkirt(mesh, shape, env = '0', seatEnd = 0) {
  if (!SKIRT_ENV[env]) return;
  for (let i = 0; i < mesh.nv; i++) { const y = mesh.P[i * 3 + 1]; if (y < 0.55 || y > 1.0) continue; const e0 = skirtEase(y, env); if (e0 === 1e9) continue; const t = torsoAt(y, shape), mg = i < seatEnd ? 0.004 : 0.0065, ru = t.rx + e0 - mg, rv = t.rz + e0 - mg, dx = mesh.P[i * 3], dz = mesh.P[i * 3 + 2] - t.cz, rho = Math.hypot(dx / ru, dz / rv);
    if (rho > 1) { mesh.P[i * 3] = dx / rho; mesh.P[i * 3 + 2] = t.cz + dz / rho; } }
  mesh.smooth(0);
}
// The lower leg is gathered inside the footwear opening for EVERY footwear kind (tucked/gathered trousers): below y 0.36 the leg is clamped to a radius under the narrowest shaft that reaches that height (brogan shaft to
// y 0.145, tall boot shaft to 0.36; gaiters and leggings are wider than both), measured around the shaft axis. Checked numerically (tests, interpen.mjs).
function clampToFootwear(mesh, legs, k, only = () => true) {
  for (const L of legs) { const ax = L.lg.ankle[0], az = L.lg.ankle[2] + 0.003;
    for (let i = 0; i < mesh.nv; i++) { if (!only(i)) continue; const y = mesh.P[i * 3 + 1], x = mesh.P[i * 3]; if (y >= 0.60 || y < 0.1 || Math.sign(x) !== L.x) continue; const R = (y <= 0.145 ? 0.0505 * k : y <= 0.36 ? 0.0505 * k + (0.067 - 0.0505) * k * (y - 0.145) / 0.215 : 0.067 * k), dx = x - ax, dz = mesh.P[i * 3 + 2] - az, d = Math.hypot(dx, dz), w = y <= 0.36 ? 1 : smooth(0.60, 0.36, y);
      if (d > R) { const d2 = d - (d - R) * w; mesh.P[i * 3] = ax + dx * d2 / d; mesh.P[i * 3 + 2] = az + dz * d2 / d; } } }   // below 0.36 a hard clamp; 0.36-0.60 a smooth funnel (the hard step made a sawtooth hem at the low-poly LODs)
  mesh.smooth(0);
}
// ---- LOD0 trouser detail: waistband buttons and suspender buttons, the fly (placket, five flat buttons), front pocket slits, outseam and inseam, cuff hems with topstitching
function trouserDetail(mesh, C, shape, e, mat, opt, legs, part) {
  const pel = () => [[BI.pelvis, 1]], seatEase = e * 0.4;
  const seatSurf = (xo, y, side = 1, off = 0) => { const t = torsoAt(y, shape), ee = seatEase + off, ru = t.rx + ee, rv = t.rz + ee, q = clamp(xo / ru, -0.985, 0.985); return [xo, y, t.cz + side * rv * Math.sqrt(1 - q * q)]; };
  const seatN = p => { const t = torsoAt(clamp(p[1], 0.5, 1.47), shape), ru = t.rx + seatEase, rv = t.rz + seatEase; return v3.norm([p[0] / (ru * ru), 0, (p[2] - t.cz) / (rv * rv)]); };
  // fly: a placket ribbon with five flat four-hole buttons, topstitched on both sides
  if (part === 'seat') { const pts = []; for (let i = 0; i <= 8; i++) pts.push(seatSurf(0, 1.06 - 0.14 * i / 8, 1, 0)); seam(mesh, pts, seatN, { w: 0.030, h: 0.0014, mat, skinFn: pel, lift: 0.0002 });
    for (const dx of [-0.0165, 0.0165]) { const q = []; for (let i = 0; i <= 8; i++) q.push(seatSurf(dx, 1.055 - 0.13 * i / 8, 1, 0)); stitches(mesh, q, seatN, { count: 10, skinFn: pel, lift: 0.0013 }); }
    for (let i = 0; i < 5; i++) { const p = seatSurf(0, 1.035 - i * 0.026, 1, 0.0018); button(mesh, p, seatN(p), 0.0068, { mat: MAT.BRASS, skinFn: pel, holes: 4, sides: 10 }); } }
  // waistband button, two front and two back suspender buttons
  if (part === 'seat') for (const [xo, y, side] of [[0.035, 1.07, 1], [-0.07, 1.07, 1], [0.07, 1.07, 1], [-0.07, 1.07, -1], [0.07, 1.07, -1]]) { const p = seatSurf(xo, y, side, 0.0036); button(mesh, p, v3.mul(seatN(p), 1), 0.0072, { mat: MAT.BRASS, skinFn: pel, holes: 4, sides: 10 }); }
  // front pocket slits (slanted), outseam and inseam seams, hem stitching
  for (const x of [1, -1]) {
    if (part === 'seat') { const pk = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pk.push(seatSurf(x * (0.085 + 0.095 * t), 1.045 - 0.12 * t, 1, 0.0003)); }
    seam(mesh, pk, seatN, { w: 0.0035, h: 0.0013, mat, skinFn: pel }); stitches(mesh, pk.map(p => v3.add(p, [x * 0.0, 0, 0])), seatN, { count: 10, skinFn: pel, lift: 0.0012 }); }
    if (part !== 'legs') continue;
    const L = legs.find(l => l.x === x), { lg, skL, thighR, kneeR, ankR, hip } = L;
    const radAt = y => (y > lg.knee[1] ? thighR + (kneeR - thighR) * ((0.86 - y) / (0.86 - lg.knee[1])) : kneeR + (ankR - kneeR) * ((lg.knee[1] - y) / (lg.knee[1] - 0.115)));
    const cAt = y => y > lg.knee[1] ? v3.lerp(hip, lg.knee, clamp((0.86 - y) / (0.86 - lg.knee[1]), 0, 1)) : v3.lerp(lg.knee, [lg.ankle[0], 0.115, lg.ankle[2]], clamp((lg.knee[1] - y) / (lg.knee[1] - 0.115), 0, 1));
    const side = (dir) => { const pts = []; for (let i = 0; i <= 16; i++) { const y = 0.84 - 0.72 * i / 16, c = cAt(y), r = radAt(y); pts.push([c[0] + dir * x * r * 1.003, y, c[2]]); } return pts; };
    seam(mesh, side(1), p => [x, 0, 0], { w: 0.0045, h: 0.0016, mat, skinFn: skL });           // outseam
    seam(mesh, side(-1), p => [-x, 0, 0], { w: 0.0045, h: 0.0016, mat, skinFn: skL });          // inseam
    const cuffC = [lg.ankle[0], 0.135, lg.ankle[2]], cr = radAt(0.135) + 0.0005, ring = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2; ring.push([cuffC[0] + Math.cos(a) * cr, 0.135, cuffC[2] + Math.sin(a) * cr]); }
    stitches(mesh, ring, p => v3.norm([p[0] - cuffC[0], 0, p[2] - cuffC[2]]), { count: 20, skinFn: skL, lift: 0.0006 });
  }
}

// ---------------------------------------------------------------- footwear
// kind: 'brogan' | 'worn' | 'boot_tall' | 'barefoot' | 'gaiter' (white gaiters over a brogan) | 'legging' (leggings over the brogan)
export function buildFootwear(kind, lod, shape = NEUTRAL, opt = {}) {
  const mesh = new Mesh('foot:' + kind), R = RES[lod], mat = opt.mat ?? MAT.BOOT, gmat = opt.gaiterMat ?? MAT.GAITER, F0 = lod === 0, baseRanges = [];
  for (const s of ['L', 'R']) {
    let rs = mesh.nv;
    const lg = legPts(s), skL = skinLeg(s), x = s === 'L' ? 1 : -1, sk = p => [[BI['foot_' + s], p[2] > 0.1 ? 0.35 : 1], [BI['toe_' + s], p[2] > 0.1 ? 0.65 : 0]];
    if (kind === 'barefoot') continue;
    const ankleY = 0.085, k = limbScale(shape); void ankleY;
    // shoe body: a loft along z from the heel to the toe: elliptical sections that taper (at LOD0 interpolated to 13 sections), with a sole slab
    const secs = [[-0.060, 0.034, 0.040, 0.075], [-0.020, 0.040, 0.046, 0.085], [0.030, 0.042, 0.040, 0.060], [0.100, 0.041, 0.030, 0.040], [0.150, 0.036, 0.024, 0.030], [0.185, 0.022, 0.016, 0.025]];
    const dense = []; if (F0) { for (let i = 0; i < 13; i++) { const f = i / 12 * (secs.length - 1), j = Math.min(secs.length - 2, Math.floor(f)), t = f - j, u = t * t * (3 - 2 * t); dense.push(secs[j].map((v, c) => v + (secs[j + 1][c] - v) * u)); } }
    const rings = (F0 ? dense : secs).map(([z, rx, ry, cy]) => ({ c: [lg.ankle[0], cy, lg.ankle[2] + z + 0.035], u: [1, 0, 0], v: [0, 1, 0], ru: rx, rv: ry }));
    loft(mesh, lod === 2 ? [rings[0], rings[3], rings[5]] : rings, { sides: [30, 6, 4][lod], mat, skinFn: sk, capStart: true, capEnd: true });
    // ankle boot shaft
    const shaftTop = kind === 'boot_tall' ? 0.36 : 0.145;
    tube(mesh, [lg.ankle[0], 0.07, lg.ankle[2] + 0.002], [lg.ankle[0], shaftTop, lg.ankle[2] + 0.004], limbProfile(0.054 * k, kind === 'boot_tall' ? 0.072 * k : 0.054 * k, F0 ? (kind === 'boot_tall' ? 9 : 5) : Math.max(1, R.lr - 3)), { sides: F0 ? 26 : R.small + 2, mat, skinFn: skL, capStart: true, capEnd: false, disp: F0 ? (a, i, v) => 0.0018 * Math.sin(a * 6 + v * 40) * Math.exp(-((v / (shaftTop - 0.07)) ** 2) * 3) : null });
    baseRanges.push([rs, mesh.nv]); if (F0) footDetail(mesh, kind, lg, k, s, sk, skL, shaftTop, mat);
    if (kind === 'gaiter' || kind === 'legging') { rs = mesh.nv;
      const top = kind === 'legging' ? 0.30 : 0.27; tube(mesh, [lg.ankle[0], 0.07, lg.ankle[2]], [lg.ankle[0], top, lg.ankle[2] + 0.004], limbProfile(0.064 * k, 0.068 * k, F0 ? 6 : Math.max(1, R.lr - 2)), { sides: F0 ? 26 : R.small + 3, mat: gmat, skinFn: skL, capStart: false }); baseRanges.push([rs, mesh.nv]);
      if (F0) {
        tube(mesh, [lg.ankle[0], 0.10, lg.ankle[2] + 0.04], [lg.ankle[0], 0.10, lg.ankle[2] + 0.075], [[0, 0.020], [1, 0.020]], { sides: 10, mat: MAT.LEATHER_BLACK, skinFn: sk, capStart: true, capEnd: true });
        const nb = kind === 'legging' ? 7 : 6; for (let b = 0; b < nb; b++) { const y = 0.10 + (top - 0.13) * b / (nb - 1), r = (0.064 + (0.068 - 0.064) * (y - 0.07) / (top - 0.07)) * k, c = [lg.ankle[0], y, lg.ankle[2] + 0.0016 + 0.004 * (y - 0.07) / (top - 0.07)], p = [c[0] + x * r * 0.9997, y, c[2] + r * 0.02];
          button(mesh, [c[0] + x * r * 0.99, y, c[2] + 0.0], [x, 0, 0], 0.0058, { mat: kind === 'legging' ? MAT.LEATHER_BLACK : MAT.CANVAS, skinFn: skL, holes: 2, sides: 10 }); void p; }
        const ring = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2; ring.push([lg.ankle[0] + Math.cos(a) * 0.0685 * k, top - 0.008, lg.ankle[2] + 0.004 + Math.sin(a) * 0.0685 * k]); }
        stitches(mesh, ring, p => v3.norm([p[0] - lg.ankle[0], 0, p[2] - lg.ankle[2] - 0.004]), { count: 22, skinFn: skL, lift: 0.0005 });
      }
    }
  }
  mesh.meta = { closed: false, openOk: true, baseRanges };
  return mesh;
}
// ---- LOD0 shoe detail: a lofted sole with welt, three stacked heel layers, toe-cap seam, welt and counter stitching, four pairs of eyelets, criss-cross laces and a bow, a padded top edge
function footDetail(mesh, kind, lg, k, s, sk, skL, shaftTop, mat) {
  const ax = lg.ankle[0], az = lg.ankle[2], x = s === 'L' ? 1 : -1, super4 = a => 1 / Math.pow(Math.pow(Math.abs(Math.cos(a)), 3.2) + Math.pow(Math.abs(Math.sin(a)), 3.2), 1 / 3.2);
  // sole: three thin layers (outsole, midsole welt, insole) of a plan-view superellipse, heel narrower than the toe
  const soleRing = (y, sc, zs = 0) => ({ c: [ax, y, az + 0.070 + zs], u: [1, 0, 0], v: [0, 0, 1], ru: 0.0455 * sc, rv: 0.130 * sc, rfn: a => super4(a) * (1 - 0.12 * Math.max(0, -Math.sin(a)) * 0.0) });
  loft(mesh, [soleRing(0.0, 0.97), soleRing(0.007, 1.005), soleRing(0.015, 1.0), soleRing(0.020, 0.965)], { sides: 28, mat: MAT.SOLE, skinFn: sk, capStart: true, capEnd: true });
  for (let h = 0; h < 3; h++) loft(mesh, [{ c: [ax, 0.020 + h * 0.0105, az - 0.028], u: [1, 0, 0], v: [0, 0, 1], ru: 0.0345 - h * 0.0015, rv: 0.0305 - h * 0.0012, rfn: super4 }, { c: [ax, 0.0295 + h * 0.0105, az - 0.028], u: [1, 0, 0], v: [0, 0, 1], ru: 0.0345 - h * 0.0015, rv: 0.0305 - h * 0.0012, rfn: super4 }], { sides: 22, mat: h === 0 ? MAT.SOLE : MAT.LEATHER_BLACK, skinFn: sk, capStart: true, capEnd: true });
  const welt = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; welt.push([ax + Math.cos(a) * 0.0455 * super4(a) * 1.0, 0.0185, az + 0.070 + Math.sin(a) * 0.130 * super4(a) * 1.0]); }
  stitches(mesh, welt, p => v3.norm([(p[0] - ax) / 0.0455 ** 2, 0.2, (p[2] - az - 0.07) / 0.13 ** 2]), { count: 34, skinFn: sk, lift: 0.0004 });
  // toe-cap seam across the vamp and the vamp/quarter seams along both sides
  { const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10, a = -1.1 + 2.2 * t; pts.push([ax + Math.sin(a) * 0.0285, 0.0305 + 0.011 * Math.cos(a), az + 0.135 + 0.01 * (1 - Math.cos(a))]); } seam(mesh, pts, () => [0, 1, 0], { w: 0.0035, h: 0.0013, mat, skinFn: sk }); }
  for (const sd of [-1, 1]) { const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([ax + sd * (0.0425 - 0.012 * t), 0.060 + 0.012 * Math.sin(t * Math.PI) - 0.02 * t, az + 0.0 + 0.140 * t - 0.03]); } seam(mesh, pts, p => [sd, 0, 0], { w: 0.0035, h: 0.0013, mat, skinFn: sk }); }
  // eyelets (four pairs on the front of the shaft), criss-cross laces, bow
  const zf = az + 0.002 + 0.054 * k, lace = [];
  const eyY = [0.078, 0.098, 0.118, 0.137];
  for (let i = 0; i < eyY.length; i++) for (const sd of [-1, 1]) { const xx = ax + sd * 0.0125, zz = az + 0.002 + Math.sqrt(Math.max(0, (0.054 * k) ** 2 - 0.0125 ** 2)); rivet(mesh, [xx, eyY[i], zz + 0.0005], v3.norm([sd * 0.0125, 0, zz - az - 0.002]), 0.0042, { mat: MAT.IRON, skinFn: skL, sides: 6, ring: true }); lace.push([xx, eyY[i], zz + 0.0035]); }
  for (let i = 0; i < eyY.length - 1; i++) for (const sd of [-1, 1]) { const a = lace[i * 2 + (sd < 0 ? 0 : 1)], b = lace[(i + 1) * 2 + (sd < 0 ? 1 : 0)]; tube(mesh, a, b, [[0, 0.0016], [1, 0.0016]], { sides: 5, mat: MAT.LEATHER_TAN, skinFn: skL, capStart: true, capEnd: true, smoothNormals: true }); }
  { const top = lace[lace.length - 1], top2 = lace[lace.length - 2], mid = [(top[0] + top2[0]) / 2, top[1] + 0.003, top[2] + 0.003];
    for (const sd of [-1, 1]) { const pts = []; for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI; pts.push([mid[0] + sd * Math.sin(a) * 0.012, mid[1] + (1 - Math.cos(a)) * 0.008, mid[2] + 0.004 + Math.sin(a) * 0.003]); }
      for (let i = 0; i < 8; i++) tube(mesh, pts[i], pts[i + 1], [[0, 0.0016], [1, 0.0016]], { sides: 5, mat: MAT.LEATHER_TAN, skinFn: skL, smoothNormals: false }); tube(mesh, mid, [mid[0] + sd * 0.006, mid[1] - 0.026, mid[2] + 0.002], [[0, 0.0014], [1, 0.0012]], { sides: 5, mat: MAT.LEATHER_TAN, skinFn: skL, capStart: true, capEnd: true }); } }
  // padded top edge of the shaft and the back strap
  { const top = shaftTop, rr = (kind === 'boot_tall' ? 0.072 : 0.054) * k; loft(mesh, [{ c: [ax, top - 0.004, az + 0.004], u: [1, 0, 0], v: [0, 0, 1], ru: rr + 0.0015, rv: rr + 0.0015 }, { c: [ax, top + 0.003, az + 0.004], u: [1, 0, 0], v: [0, 0, 1], ru: rr + 0.0010, rv: rr + 0.0010 }], { sides: 26, mat, skinFn: skL, capStart: false, capEnd: false }); }
  void x;
}

// ---------------------------------------------------------------- headgear
// profile helpers are in head space: the head top is at y 1.732; hats sit around centre (0, 1.62, 0.012)
const HC = [0, 1.62, 0.012], skH = () => [[BI.head, 1]];
// ---- LOD0 headgear detail (called at the end of buildHat when lod === 0): seams, stitching rows, buttons, eyelets, cord, feather barbs, tassel strands, sweatband
function hatDetail(mesh, kind, o) {
  const { cx, cz, baseY, band, mat } = o, skH2 = () => [[BI.head, 1]], up = () => [0, 1, 0], radial = p => v3.norm([p[0] - cx, 0.15, p[2] - cz]);
  const ringPts = (r, y, n, dz = 0) => { const q = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; q.push([cx + Math.sin(a) * r, y, cz + Math.cos(a) * r + dz]); } return q; };
  // sweatband (inside lining): a thin open ring visible from below
  lathe(mesh, [[0.0815, baseY + 0.001], [0.0815, baseY - 0.013], [0.0805, baseY - 0.013], [0.0805, baseY + 0.001]], 56, { center: [cx, 0, cz], mat: MAT.LEATHER_TAN, skinFn: skH2, closed: false, flip: true });
  if (kind === 'kepi' || kind === 'forage' || kind === 'sprig' || kind === 'deertail_kepi') {
    const h = kind === 'forage' ? 0.085 : 0.095, ty = baseY + h, lean = (t) => 0.028 * t * t;
    for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2 + Math.PI / 4, pts = []; for (let i = 0; i <= 8; i++) { const r = 0.005 + 0.087 * i / 8; pts.push([cx + Math.sin(a) * r, ty + 0.0008, cz + Math.cos(a) * r + lean(1)]); } seam(mesh, pts, up, { w: 0.0035, h: 0.0012, mat, skinFn: skH2 }); }                       // four crown quarter seams
    stitches(mesh, ringPts(0.087, ty + 0.0011, 28, lean(1)), up, { count: 30, skinFn: skH2, lift: 0.0003 });
    stitches(mesh, ringPts(0.0915, baseY + 0.016, 34), radial, { count: 36, skinFn: skH2, lift: 0.0003 });
    for (const sd of [-1, 1]) { rivet(mesh, [cx + sd * 0.0885, baseY + 0.052, cz + 0.012], [sd, 0, 0], 0.0036, { mat: MAT.BRASS, skinFn: skH2, ring: true });                                                 // ventilation eyelets
      button(mesh, [cx + sd * 0.0872, baseY + 0.0185, cz + 0.071], v3.norm([sd * 0.9, 0, 0.4]), 0.0058, { mat: MAT.BRASS, skinFn: skH2, sides: 12 }); }                                        // chin-strap buttons
    { const pts = []; for (let i = 0; i <= 14; i++) { const a = -1.15 + 2.3 * i / 14; pts.push([cx + Math.sin(a) * 0.140, baseY - 0.0005, cz + Math.cos(a) * 0.140 * 0.9 + 0.008]); } stitches(mesh, pts, up, { count: 16, skinFn: skH2, lift: 0.0002 }); }
    { const pts = []; for (let i = 0; i <= 14; i++) { const a = -1.15 + 2.3 * i / 14; pts.push([cx + Math.sin(a) * 0.118, baseY - 0.0005, cz + Math.cos(a) * 0.118 * 0.9 + 0.008]); } stitches(mesh, pts, up, { count: 14, skinFn: skH2, lift: 0.0002 }); }
  } else if (kind === 'hardee' || kind === 'slouch' || kind === 'straw' || kind === 'garibaldi') {
    const crown = kind === 'hardee' ? 0.115 : kind === 'garibaldi' ? 0.10 : 0.105;
    stitches(mesh, ringPts(0.150, baseY + 0.0075, 48), up, { count: 52, skinFn: skH2, lift: 0.0003 });                                              // brim stitching
    // band: a ribbon (a flat loop) with a knot or buckle at the left side; slouch hats get a creased crown ridge
    if (kind !== 'straw') {
      const pts = ringPts(0.0905, baseY + 0.022, 40); seam(mesh, pts, radial, { w: 0.020, h: 0.0016, mat: band, skinFn: skH2, sides: 4 });
      ellipsoid(mesh, [cx + 0.0915, baseY + 0.022, cz + 0.02], [0.0045, 0.0090, 0.0075], 10, 6, { mat: band, skinFn: skH2 });
      tube(mesh, [cx + 0.0915, baseY + 0.022, cz + 0.02], [cx + 0.0925, baseY + 0.004, cz + 0.045], [[0, 0.0045], [1, 0.0028]], { sides: 6, mat: band, skinFn: skH2, ey: 0.4, capStart: false, capEnd: true });
    }
    for (let r = 0; r < 6; r++) { const a = r / 6 * Math.PI * 2, pts = []; for (let i = 0; i <= 5; i++) { const t = i / 5; pts.push([cx + Math.sin(a) * (0.076 - 0.004 * t * 0), baseY + 0.03 + (crown - 0.04) * t, cz + Math.cos(a) * 0.076]); } if (kind === 'slouch' && r % 3 === 0) seam(mesh, pts, radial, { w: 0.003, h: 0.0012, mat, skinFn: skH2 }); }
    if (kind === 'hardee') {                                                                                                                              // hat cord with two tasselled ends, and a feather with a quill and 22 barbs
      const cord = ringPts(0.0935, baseY + 0.046, 40); for (let i = 0; i < 40; i++) tube(mesh, cord[i], cord[i + 1], [[0, 0.0022], [1, 0.0022]], { sides: 5, mat: band, skinFn: skH2, smoothNormals: false });
      const tc = cord[10]; tube(mesh, tc, [tc[0] + 0.01, tc[1] - 0.06, tc[2] + 0.01], [[0, 0.0018], [1, 0.0042]], { sides: 6, mat: band, skinFn: skH2, capStart: true, capEnd: true });
      strands(mesh, 10, i => ({ p: [tc[0] + 0.01, tc[1] - 0.06, tc[2] + 0.01], dir: [(i % 5 - 2) * 0.12, -1, (i % 3 - 1) * 0.1] }), { len: 0.03, r: 0.0009, mat: band, skinFn: skH2, curl: 0.002, seed: 21, segs: 2 });
      const q0 = [cx - 0.07, baseY + 0.09, cz - 0.02], q1 = [cx - 0.115, baseY + 0.135, cz - 0.075], q2 = [cx - 0.136, baseY + 0.08, cz - 0.13];
      strands(mesh, 22, i => { const t = (i + 0.5) / 22, p = i < 0 ? q0 : v3.lerp(v3.lerp(q0, q1, t), v3.lerp(q1, q2, t), t); const b = v3.sub(v3.lerp(q1, q2, t), v3.lerp(q0, q1, t)); return { p, dir: v3.norm([b[0] * 0.2 + (i % 2 ? 1 : -1) * 0.8, b[1] * 0.1 - 0.2, 0.2 + b[2] * 0.1]) }; }, { len: 0.034, r: 0.0010, mat: MAT.FEATHER, skinFn: () => [[BI.gear_plume, 0.8], [BI.head, 0.2]], curl: 0.003, seed: 31, segs: 2 });
    }
  } else if (kind === 'fez' || kind === 'turban') {
    for (let r = 0; r < 6; r++) { const a = r / 6 * Math.PI * 2, pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6; const rad = 0.060 + (0.086 - 0.060) * (1 - t) ** 1.0 * 0 + 0.0; pts.push([cx + Math.sin(a) * (0.086 - 0.026 * t), baseY + 0.012 + 0.1 * t, cz + Math.cos(a) * (0.086 - 0.026 * t)]); void rad; } seam(mesh, pts, radial, { w: 0.003, h: 0.001, mat, skinFn: skH2 }); }
    const tp = [cx - 0.02, baseY + 0.112, cz]; ellipsoid(mesh, tp, [0.008, 0.005, 0.008], 8, 4, { mat: MAT.GOLD, skinFn: () => [[BI.gear_plume, 0.8], [BI.head, 0.2]] });
    strands(mesh, 18, i => ({ p: [cx - 0.115, baseY + 0.045, cz - 0.02], dir: [-0.3 + (i % 6 - 2.5) * 0.08, -1, ((i % 3) - 1) * 0.12] }), { len: 0.075, r: 0.0011, mat: MAT.GOLD, skinFn: () => [[BI.gear_plume, 0.8], [BI.head, 0.2]], curl: 0.002, seed: 41, segs: 3 });
  } else {                                                                                                                                                // plain cap
    for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2, pts = []; for (let i = 0; i <= 6; i++) { const r = 0.005 + 0.080 * i / 6; pts.push([cx + Math.sin(a) * r, baseY + 0.0705, cz + Math.cos(a) * r]); } seam(mesh, pts, up, { w: 0.003, h: 0.0011, mat, skinFn: skH2 }); }
    stitches(mesh, ringPts(0.0905, baseY + 0.012, 34), radial, { count: 34, skinFn: skH2, lift: 0.0003 });
    button(mesh, [cx, baseY + 0.0715, cz], [0, 1, 0], 0.0070, { mat: MAT.BRASS, skinFn: skH2, sides: 12 });
  }
}

// ---- the visor (bill) of a kepi / forage / plain cap: a dished, rounded D-shaped leather piece 5.8 cm long on the centre line, sloping down about 18 degrees and curling at the sides, 2.4 mm thick with a rolled edge
// (before: a flat 4 mm plank with a straight edge). Built as a top and a bottom height-field joined by an edge strip, on the head bone.
function visorMesh(mesh, { cx, cz, baseY, r0 = 0.083, len = 0.058, drop = 0.030, half = 1.12, lod = 0, mat = MAT.LEATHER_BLACK, sk = skH }) {
  const NA = [26, 10, 6][lod], NR = [6, 3, 1][lod], th = 0.0024, v0 = mesh.nv, top = [], bot = [];
  const P = (a, t) => { const u = a / half, w = Math.max(0.12, Math.pow(Math.max(0, Math.cos(u * Math.PI / 2)), 0.62)), rb = r0 + len * w, r = r0 + (rb - r0) * t, curl = 0.0113 * Math.pow(Math.abs(u), 2) * t, y = baseY + 0.004 - drop * Math.pow(t, 1.35) * (0.55 + 0.45 * Math.cos(u * Math.PI / 2)) + curl;
    return [cx + Math.sin(a) * r, y, cz + Math.cos(a) * r + 0.0]; };
  for (let ia = 0; ia <= NA; ia++) { top[ia] = []; bot[ia] = []; const a = -half + 2 * half * ia / NA;
    for (let ir = 0; ir <= NR; ir++) { const t = ir / NR, p = P(a, t), pe = P(a, Math.min(1, t + 0.02)), pa = P(Math.max(-half, a - 0.02), t), pb = P(Math.min(half, a + 0.02), t), n = v3.norm(v3.cross(v3.sub(pe, p), v3.sub(pb, pa)));
      const nn = n[1] < 0 ? v3.mul(n, -1) : n, edge = ir === NR || ia === 0 || ia === NA ? 0.5 : 1;
      top[ia][ir] = mesh.vert(p, nn, ia * 0.01, ir * 0.01, mat, sk(p)); bot[ia][ir] = mesh.vert([p[0], p[1] - th * edge, p[2]], v3.mul(nn, -1), ia * 0.01, ir * 0.01, mat, sk(p)); } }
  for (let ia = 0; ia < NA; ia++) for (let ir = 0; ir < NR; ir++) { const a1 = top[ia][ir], b1 = top[ia + 1][ir], c1 = top[ia][ir + 1], d1 = top[ia + 1][ir + 1]; mesh.tri(a1, c1, b1); mesh.tri(b1, c1, d1); const a2 = bot[ia][ir], b2 = bot[ia + 1][ir], c2 = bot[ia][ir + 1], d2 = bot[ia + 1][ir + 1]; mesh.tri(a2, b2, c2); mesh.tri(b2, d2, c2); }
  const rim1 = list => { for (let k = 0; k < list.length - 1; k++) { const [t0, b0] = list[k], [t1, b1] = list[k + 1]; mesh.tri(t1, t0, b0); mesh.tri(b0, b1, t1); } }, rim2 = list => { for (let k = 0; k < list.length - 1; k++) { const [t0, b0] = list[k], [t1, b1] = list[k + 1]; mesh.tri(t0, t1, b1); mesh.tri(b1, b0, t0); } };
  rim1(Array.from({ length: NA + 1 }, (_, ia) => [top[ia][NR], bot[ia][NR]])); rim1(Array.from({ length: NR + 1 }, (_, ir) => [top[0][ir], bot[0][ir]])); rim2(Array.from({ length: NR + 1 }, (_, ir) => [top[NA][ir], bot[NA][ir]]));
  mesh.smooth(v0); return mesh;
}
export const HAT_KINDS = ['kepi', 'hardee', 'slouch', 'fez', 'turban', 'forage', 'garibaldi', 'straw', 'cap', 'sprig', 'deertail_kepi'];
export function buildHat(kind, lod, opt = {}) {
  const mesh = new Mesh('hat:' + kind), sides = [56, 12, 7][lod], mat = opt.mat ?? MAT.HEADGEAR, trim = opt.trimMat ?? MAT.HEAD_TRIM, band = opt.bandMat ?? MAT.HEAD_TRIM;
  const baseY = 1.663, cx = HC[0], cz = HC[2];
  const solid = (prof, o = {}) => lathe(mesh, prof, sides, { center: [cx, 0, cz], mat: o.mat ?? mat, skinFn: skH, closed: o.closed ?? true, ax: o.ax ?? 1, az: o.az ?? 1, flip: o.flip });
  if (kind === 'kepi' || kind === 'forage' || kind === 'sprig' || kind === 'deertail_kepi') {
    // M1858 forage cap: tall crown that slopes forward, flat top, leather visor, chin strap; the crown is a truncated cone leaning forward
    const v0 = mesh.nv, h = kind === 'forage' ? 0.085 : 0.095;
    solid([[0, baseY + h], [0.094, baseY + h], [0.096, baseY + h - 0.008], [0.088, baseY], [0.085, baseY - 0.003], [0.083, baseY + 0.001], [0, baseY + 0.001]].map(([r, y]) => [r, y]), { closed: true });
    warp(mesh, v0, p => { const t = clamp((p[1] - baseY) / h, 0, 1); return [p[0], p[1], p[2] + 0.028 * t * t + (p[1] > baseY + h - 0.004 ? 0 : 0)]; });
    visorMesh(mesh, { cx, cz, baseY, lod, len: kind === 'forage' ? 0.052 : 0.058 });                    // visor (bill)
    if (lod === 0) {                                                                                // band, chin strap, badge
      tube(mesh, [cx, baseY + 0.001, cz], [cx, baseY + 0.016, cz], [[0, 0.0905], [1, 0.0905]], { sides, mat: band === MAT.HEAD_TRIM ? mat : band, skinFn: skH, capStart: false });
      ellipsoid(mesh, [cx, baseY + 0.07, cz + 0.098], [0.011, 0.011, 0.0035], 8, 4, { mat: MAT.BRASS, skinFn: skH });
      { const pts = []; for (let i = 0; i <= 16; i++) { const a = -1.22 + 2.44 * i / 16, r = 0.0905; pts.push([cx + Math.sin(a) * r, baseY + 0.014 - 0.002 * Math.cos(a), cz + Math.cos(a) * r + 0.028 * 0.0]); }            // the chin strap worn up: a leather strap round the front of the crown above the visor, buttoned at both sides
        strap(mesh, pts, 0.011, 0.0026, { mat: MAT.LEATHER_BLACK, skinFn: skH, sides: 4, smoothNormals: false, nrm: p => v3.norm([p[0] - cx, 0, p[2] - cz]) }); }
    }
    if (kind === 'sprig' && lod === 0) tube(mesh, [cx + 0.02, baseY + 0.075, cz + 0.098], [cx + 0.045, baseY + 0.115, cz + 0.098], [[0, 0.004], [1, 0.0015]], { sides: 4, mat: MAT.FLAG_GREEN, skinFn: skH, capStart: true, capEnd: true });
    if (kind === 'deertail_kepi' && lod <= 1) ellipsoid(mesh, [cx - 0.085, baseY + 0.08, cz - 0.01], [0.012, 0.05, 0.03], 6, 4, { mat: MAT.BLANKET, skinFn: () => [[BI.gear_plume, 0.7], [BI.head, 0.3]] });
  } else if (kind === 'hardee' || kind === 'slouch' || kind === 'straw' || kind === 'garibaldi') {
    const v0 = mesh.nv, crown = kind === 'hardee' ? 0.115 : kind === 'garibaldi' ? 0.10 : 0.105, brimR = kind === 'straw' ? 0.185 : kind === 'garibaldi' ? 0.175 : 0.165, topR = kind === 'hardee' ? 0.074 : kind === 'garibaldi' ? 0.082 : 0.078;
    solid([[0, baseY + crown], [topR - 0.006, baseY + crown], [topR, baseY + crown - 0.008], [0.088, baseY + 0.02], [brimR * 0.55 + 0.088 * 0.45, baseY + 0.011], [brimR - 0.004, baseY + 0.0075], [brimR - 0.0008, baseY + 0.0072], [brimR + 0.0012, baseY + 0.0052], [brimR + 0.0014, baseY + 0.0030], [brimR + 0.0008, baseY + 0.0012], [brimR - 0.001, baseY + 0.0], [brimR * 0.55 + 0.086 * 0.45, baseY - 0.0016], [0.086, baseY - 0.003], [0.082, baseY + 0.002], [0, baseY + 0.002]]);
    warp(mesh, v0, p => {
      const dx = p[0] - cx, dz = p[2] - cz, r = Math.hypot(dx, dz); let y = p[1], x = p[0], z = p[2];
      const a = Math.atan2(dx, dz);                                                                   // 0 = front, +pi/2 = left (+x)
      if (kind === 'hardee' && r > 0.09) { const pin = Math.exp(-((a - Math.PI / 2) ** 2) / 0.35); y += 0.065 * pin * (r - 0.09) / (brimR - 0.09); x -= dx * 0.28 * pin * 0.0; }      // brim pinned up on the left
      else if (kind === 'slouch' || kind === 'straw') { if (r > 0.09) y -= 0.026 * ((r - 0.09) / (brimR - 0.09)) * (0.5 + 0.5 * Math.cos(a * 2 + 1.1)); if (p[1] > baseY + crown - 0.02 && r < 0.05) y -= 0.016 * Math.max(0, 1 - Math.abs(dx) / 0.05); }  // soft crown dent, drooping brim
      else if (kind === 'garibaldi' && r > 0.09) y += 0.045 * Math.max(0, Math.cos(a - Math.PI / 2)) * (r - 0.09) / 0.085;
      return [x, y, z];
    });
    if (lod === 0) {
      tube(mesh, [cx, baseY + 0.008, cz], [cx, baseY + 0.032, cz], [[0, kind === 'hardee' ? 0.0885 : 0.0895], [1, 0.0885]], { sides, mat: band, skinFn: skH, capStart: false });          // hat band / cord ring
      if (kind === 'hardee') { ellipsoid(mesh, [cx + 0.1, baseY + 0.045, cz + 0.02], [0.013, 0.013, 0.004], 8, 4, { mat: MAT.BRASS, skinFn: skH, rot: m4.trs([0, 0, 0], qAxisAngle([0, 1, 0], Math.PI / 2)) }); }
      if (kind === 'hardee' || kind === 'garibaldi') { const f = [[cx - 0.07, baseY + 0.09, cz - 0.02], [cx - 0.11, baseY + 0.13, cz - 0.07], [cx - 0.13, baseY + 0.08, cz - 0.12], [cx - 0.115, baseY + 0.03, cz - 0.14]];
        for (let i = 0; i < 3; i++) tube(mesh, f[i], f[i + 1], [[0, 0.007], [1, i === 2 ? 0.002 : 0.007]], { sides: 5, mat: MAT.FEATHER, skinFn: () => [[BI.gear_plume, 0.8], [BI.head, 0.2]], capStart: i === 0, capEnd: i === 2 }); }
    }
  } else if (kind === 'fez' || kind === 'turban') {
    solid([[0, baseY + 0.115], [0.060, baseY + 0.115], [0.069, baseY + 0.104], [0.086, baseY + 0.01], [0.080, baseY], [0.080, baseY + 0.003], [0, baseY + 0.003]], { closed: true, mat });
    if (lod <= 1 && kind === 'turban') { const vv = mesh.nv; lathe(mesh, [[0.085, baseY - 0.006], [0.104, baseY + 0.01], [0.100, baseY + 0.05], [0.082, baseY + 0.062], [0.075, baseY + 0.03]], sides, { center: [cx, 0, cz], mat: MAT.GAITER, skinFn: skH, closed: true }); void vv; }
    if (lod <= 1) tube(mesh, [cx - 0.02, baseY + 0.112, cz], [cx - 0.115, baseY + 0.045, cz - 0.02], [[0, 0.004], [0.3, 0.008], [1, 0.008]], { sides: 5, mat: MAT.GOLD, skinFn: () => [[BI.gear_plume, 0.8], [BI.head, 0.2]], capStart: true, capEnd: true });
  } else {                                                                                            // plain cap (CS)
    solid([[0, baseY + 0.07], [0.086, baseY + 0.07], [0.092, baseY + 0.055], [0.088, baseY], [0.083, baseY + 0.002], [0, baseY + 0.002]], { closed: true });
    visorMesh(mesh, { cx, cz, baseY, lod, r0: 0.0862, len: 0.044, drop: 0.016 });
  }
  if (lod === 0) hatDetail(mesh, kind, { cx, cz, baseY, band, mat });
  mesh.meta = { closed: false, openOk: true };
  return mesh;
}

// ---------------------------------------------------------------- rank marks (LOD 0 and 1): chevrons on both upper sleeves, shoulder straps for officers
export function buildRankMarks(rankClass, lod, opt = {}) {
  const mesh = new Mesh('rank:' + rankClass), mat = opt.mat ?? MAT.COAT_TRIM;
  if (lod >= 2) return mesh;
  const chev = { corporal: 2, sergeant: 3, 'first sergeant': 3 }[rankClass] ?? 0;
  for (const s of ['L', 'R']) {
    const { sh, el } = armPts(s), x = s === 'L' ? 1 : -1, skA = skinArm(s);
    for (let c = 0; c < chev; c++) {                                                                // chevron pairs on the upper sleeve, points up
      const t = 0.40 + c * 0.075, p = v3.lerp(sh, el, t); const r = 0.058;
      for (const hs of [-1, 1]) { const a = [p[0], p[1] + 0.012, p[2] + r], b = [p[0], p[1] - 0.012, p[2] + r * 0.98]; void a; void b;
        const a2 = [p[0] + 0.0, p[1] + 0.014, p[2] + 0.056], b2 = [p[0] + hs * 0.032, p[1] - 0.016, p[2] + 0.036]; strap(mesh, [a2, b2], 0.011, 0.003, { mat, skinFn: skA }); }
    }
  }
  if (['lieutenant', 'captain', 'field officer', 'general'].includes(rankClass) && lod === 0) {
    for (const s of [1, -1]) { box(mesh, [s * 0.145, 1.44, 0.0], [0.022, 0.0035, 0.045], { mat: MAT.GOLD, skinFn: () => [[BI.spine3, 1]] });
      const nbars = { lieutenant: 1, captain: 2, 'field officer': 1, general: 1 }[rankClass]; for (let i = 0; i < nbars; i++) box(mesh, [s * 0.145, 1.4455, -0.022 + i * 0.03], [0.012, 0.0015, 0.008], { mat: rankClass === 'field officer' ? MAT.SILVER : MAT.BRASS, skinFn: () => [[BI.spine3, 1]] }); }
  }
  mesh.meta = { closed: false, openOk: true };
  return mesh;
}
