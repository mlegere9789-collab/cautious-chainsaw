// Procedural placeholder characters: skeleton, skinned mesh, analytic clips, FK, vertex-animation-texture bake, software impostor bake.
// Nothing here is a historical asset: it exists to give the benchmark real skinned geometry with the right cost shape (bones, tris, clips).
import { qeuler, qmul, qmat, clamp, smooth, lerp } from './math.mjs';

export const MAT = { COAT: 0, TROUSERS: 1, HAT: 2, SKIN: 3, BOOT: 4, WOOD: 5, STEEL: 6, CANVAS: 7, LEATHER: 8, BRASS: 9, HORSE: 10, MANE: 11, SADDLE: 12, CARRIAGE: 13, BRONZE: 14, IRON: 15 };
// [team][mat] = r,g,b,rough,metal  (linear colours; placeholders, not uniform research)
export const PALETTE = [
  /* Union */ [[0.10, 0.13, 0.22, .9, 0], [0.30, 0.42, 0.58, .9, 0], [0.09, 0.11, 0.19, .85, 0], [0.62, 0.45, 0.36, .6, 0], [0.04, 0.04, 0.04, .5, 0], [0.28, 0.16, 0.08, .5, 0], [0.50, 0.52, 0.55, .3, 1], [0.45, 0.40, 0.28, .95, 0], [0.10, 0.07, 0.05, .55, 0], [0.75, 0.58, 0.2, .3, 1], [0.20, 0.10, 0.06, .7, 0], [0.04, 0.03, 0.03, .9, 0], [0.14, 0.07, 0.04, .5, 0], [0.16, 0.20, 0.10, .7, 0], [0.62, 0.42, 0.2, .35, 1], [0.12, 0.12, 0.13, .5, 1]],
  /* Confederate */ [[0.30, 0.26, 0.20, .95, 0], [0.34, 0.32, 0.26, .95, 0], [0.26, 0.22, 0.17, .9, 0], [0.62, 0.45, 0.36, .6, 0], [0.05, 0.04, 0.03, .5, 0], [0.28, 0.16, 0.08, .5, 0], [0.50, 0.52, 0.55, .3, 1], [0.45, 0.40, 0.28, .95, 0], [0.10, 0.07, 0.05, .55, 0], [0.75, 0.58, 0.2, .3, 1], [0.20, 0.10, 0.06, .7, 0], [0.04, 0.03, 0.03, .9, 0], [0.14, 0.07, 0.04, .5, 0], [0.16, 0.20, 0.10, .7, 0], [0.62, 0.42, 0.2, .35, 1], [0.12, 0.12, 0.13, .5, 1]],
];
export const VSTRIDE = 11; // pos3 nrm3 mat1 j0 j1 w0 w1

class MB {
  constructor() { this.v = []; this.i = []; }
  vert(p, n, mat, b0, b1, w1) { this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], mat, b0, b1 < 0 ? b0 : b1, 1 - w1, w1); return this.v.length / VSTRIDE - 1; }
  lathe(a, b, pr, sides, mat, bone, o = {}) {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const L = Math.hypot(...d); d[0] /= L; d[1] /= L; d[2] /= L;
    let u = [1, 0, 0]; const dp = u[0] * d[0] + u[1] * d[1] + u[2] * d[2]; u = [u[0] - dp * d[0], u[1] - dp * d[1], u[2] - dp * d[2]]; let ul = Math.hypot(...u);
    if (ul < 1e-3) { const dp2 = d[2]; u = [-dp2 * d[0], -dp2 * d[1], 1 - dp2 * d[2]]; ul = Math.hypot(...u); } u = u.map(x => x / ul);
    const v = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
    const ex = o.ex ?? 1, ey = o.ey ?? 1, base = this.v.length / VSTRIDE; const rings = pr.length;
    for (let k = 0; k < rings; k++) {
      const [t, r] = pr[k]; const pk = pr[Math.min(rings - 1, k + 1)], pj = pr[Math.max(0, k - 1)]; const slope = (pk[1] - pj[1]) / (Math.max(1e-4, (pk[0] - pj[0]) * L));
      const w2 = o.bone2 !== undefined ? (o.w2 ? o.w2(t) : 0) : 0;
      for (let s = 0; s <= sides; s++) {
        const ph = s / sides * Math.PI * 2, c = Math.cos(ph), sn = Math.sin(ph);
        const px = a[0] + d[0] * t * L + (u[0] * c * ex + v[0] * sn * ey) * r, py = a[1] + d[1] * t * L + (u[1] * c * ex + v[1] * sn * ey) * r, pz = a[2] + d[2] * t * L + (u[2] * c * ex + v[2] * sn * ey) * r;
        const nx = u[0] * c / ex + v[0] * sn / ey - slope * d[0], ny = u[1] * c / ex + v[1] * sn / ey - slope * d[1], nz = u[2] * c / ex + v[2] * sn / ey - slope * d[2]; const nl = Math.hypot(nx, ny, nz) || 1;
        this.vert([px, py, pz], [nx / nl, ny / nl, nz / nl], mat, bone, o.bone2 ?? bone, w2);
      }
    }
    for (let k = 0; k < rings - 1; k++) for (let s = 0; s < sides; s++) { const i0 = base + k * (sides + 1) + s, i1 = i0 + 1, i2 = i0 + sides + 1, i3 = i2 + 1; this.i.push(i0, i2, i1, i1, i2, i3); }
  }
  box(c, h, mat, bone) {
    const faces = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]]];
    for (const [n, t1, t2] of faces) { const base = this.v.length / VSTRIDE; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.vert([c[0] + (n[0] + t1[0] * a + t2[0] * b) * h[0], c[1] + (n[1] + t1[1] * a + t2[1] * b) * h[1], c[2] + (n[2] + t1[2] * a + t2[2] * b) * h[2]], n, mat, bone, bone, 0);
      // winding: make outward-facing regardless of tangent handedness
      const p0 = this.v.slice(base * VSTRIDE, base * VSTRIDE + 3), p1 = this.v.slice((base + 1) * VSTRIDE, (base + 1) * VSTRIDE + 3), p2 = this.v.slice((base + 2) * VSTRIDE, (base + 2) * VSTRIDE + 3);
      const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]]; const cx = e1[1] * e2[2] - e1[2] * e2[1], cy = e1[2] * e2[0] - e1[0] * e2[2], cz = e1[0] * e2[1] - e1[1] * e2[0];
      if (cx * n[0] + cy * n[1] + cz * n[2] >= 0) this.i.push(base, base + 1, base + 2, base + 2, base + 1, base + 3); else this.i.push(base, base + 2, base + 1, base + 1, base + 2, base + 3); }
  }
  done() { return { verts: new Float32Array(this.v), idx: new Uint32Array(this.i), nv: this.v.length / VSTRIDE, ntri: this.i.length / 3 }; }
}
// tapered tube profile with rounded caps; t in 0..1 along the axis
function prof(r0, r1, rings, capF = 0.06, mid) { const p = []; const cr = Math.max(2, Math.round(rings / 3));
  for (let k = 0; k <= cr; k++) { const a = k / cr * Math.PI / 2; p.push([capF * (1 - Math.cos(a)), r0 * Math.sin(a)]); }
  for (let k = 1; k < rings; k++) { const t = capF + (1 - 2 * capF) * k / rings; p.push([t, mid ? mid(t, r0 + (r1 - r0) * t) : r0 + (r1 - r0) * t]); }
  for (let k = cr; k >= 0; k--) { const a = k / cr * Math.PI / 2; p.push([1 - capF * (1 - Math.cos(a)), r1 * Math.sin(a)]); }
  return p; }

// ------------------------------------------------------------------ skeletons
export function makeRig(bones) { return { bones, n: bones.length, parent: Int16Array.from(bones.map(b => b.p)), head: bones.map(b => b.h), idx: Object.fromEntries(bones.map((b, i) => [b.n, i])) }; }
const B = (n, p, h) => ({ n, p, h });
export const FOOT_RIG = makeRig([B('pelvis', -1, [0, .95, 0]), B('spine', 0, [0, 1.05, 0]), B('chest', 1, [0, 1.28, 0]), B('neck', 2, [0, 1.52, 0]), B('head', 3, [0, 1.60, 0]),
  B('uarmL', 2, [.19, 1.46, 0]), B('farmL', 5, [.21, 1.20, .02]), B('handL', 6, [.22, .95, .06]), B('uarmR', 2, [-.19, 1.46, 0]), B('farmR', 8, [-.21, 1.20, .02]), B('handR', 9, [-.22, .95, .06]),
  B('thighL', 0, [.09, .93, 0]), B('shinL', 11, [.09, .50, .01]), B('footL', 12, [.09, .08, 0]), B('thighR', 0, [-.09, .93, 0]), B('shinR', 14, [-.09, .50, .01]), B('footR', 15, [-.09, .08, 0]), B('rifle', 0, [-.26, .05, .12])]);
export const HORSE_RIG = makeRig([B('body', -1, [0, 1.45, 0]), B('chest', 0, [0, 1.50, .45]), B('neck', 1, [0, 1.65, .80]), B('head', 2, [0, 1.95, 1.05]), B('tail', 0, [0, 1.60, -.75]),
  B('flU', 0, [.17, 1.15, .62]), B('flL', 5, [.17, .65, .60]), B('flH', 6, [.17, .12, .60]), B('frU', 0, [-.17, 1.15, .62]), B('frL', 8, [-.17, .65, .60]), B('frH', 9, [-.17, .12, .60]),
  B('hlU', 0, [.17, 1.15, -.55]), B('hlL', 11, [.17, .60, -.62]), B('hlH', 12, [.17, .12, -.62]), B('hrU', 0, [-.17, 1.15, -.55]), B('hrL', 14, [-.17, .60, -.62]), B('hrH', 15, [-.17, .12, -.62]),
  B('rPelvis', 0, [0, 1.62, -.05]), B('rTorso', 17, [0, 1.75, -.03]), B('rHead', 18, [0, 2.33, 0]), B('rUarmL', 18, [.19, 2.22, 0]), B('rFarmL', 20, [.21, 1.97, .03]), B('rUarmR', 18, [-.19, 2.22, 0]), B('rFarmR', 22, [-.21, 1.97, .03]),
  B('rLegL', 17, [.12, 1.60, -.05]), B('rLegR', 17, [-.12, 1.60, -.05]), B('sabre', 23, [-.22, 1.75, .08])]);

// ------------------------------------------------------------------ meshes
export function buildFootMesh(q = 1) {
  const m = new MB(); const S = Math.max(4, Math.round(8 * q)), R = (n) => Math.max(1, Math.round(n * q)); const I = FOOT_RIG.idx; const W = (t) => clamp((t - .72) / .28, 0, 1) * .5;
  for (const sg of [1, -1]) { const L = sg > 0 ? 'L' : 'R';
    m.lathe([sg * .09, .93, 0], [sg * .09, .50, .01], prof(.098, .066, R(5), .02), S, MAT.TROUSERS, I['thigh' + L], { bone2: I['shin' + L], w2: W });
    m.lathe([sg * .09, .50, .01], [sg * .09, .10, 0], prof(.066, .052, R(5), .02), S, MAT.TROUSERS, I['shin' + L], { bone2: I['foot' + L], w2: W });
    m.lathe([sg * .09, .06, -.07], [sg * .09, .055, .21], prof(.048, .036, R(3), .1), S, MAT.BOOT, I['foot' + L]);
    m.lathe([sg * .19, 1.46, 0], [sg * .21, 1.20, .02], prof(.048, .041, R(4), .1), S, MAT.COAT, I['uarm' + L], { bone2: I['farm' + L], w2: W });
    m.lathe([sg * .21, 1.20, .02], [sg * .22, .95, .06], prof(.041, .032, R(4), .05), S, MAT.COAT, I['farm' + L], { bone2: I['hand' + L], w2: W });
    m.lathe([sg * .22, .95, .06], [sg * .225, .83, .08], prof(.03, .026, R(2), .2), S, MAT.SKIN, I['hand' + L]);
  }
  m.lathe([0, .80, 0], [0, 1.52, 0], prof(.16, .12, R(8), .04, (t, r) => r * (1 + .12 * Math.sin(t * Math.PI * 0.9))), S + 2, MAT.COAT, I.chest, { bone2: I.pelvis, w2: (t) => clamp(1 - t * 2.8, 0, 1), ex: 1.12, ey: .74 });
  m.lathe([0, .86, 0], [0, 1.0, 0], prof(.165, .165, R(2), .1), S + 2, MAT.LEATHER, I.pelvis, { ex: 1.12, ey: .76 });
  m.lathe([0, 1.5, 0], [0, 1.63, 0], prof(.05, .045, R(2), .1), S, MAT.SKIN, I.neck);
  m.lathe([0, 1.60, 0], [0, 1.82, 0], prof(.092, .088, R(5), .5), S, MAT.SKIN, I.head, { ex: .92, ey: 1.08 });
  m.lathe([0, 1.755, 0], [0, 1.86, 0], prof(.108, .092, R(3), .03), S, MAT.HAT, I.head); m.box([0, 1.775, .1], [.065, .006, .05], MAT.BOOT, I.head);
  m.box([-.12, .88, -.07], [.07, .05, .03], MAT.LEATHER, I.pelvis); m.box([.2, .88, -.14], [.11, .1, .035], MAT.CANVAS, I.pelvis);
  m.lathe([.21, .85, -.09], [.21, .89, -.09], prof(.075, .075, R(2), .2), S, MAT.CANVAS, I.pelvis);
  m.lathe([.17, 1.52, .09], [-.17, 1.08, .09], prof(.043, .043, R(3), .08), S, MAT.CANVAS, I.chest);
  m.box([0, 1.30, -.17], [.15, .16, .05], MAT.CANVAS, I.chest);
  m.lathe([-.26, .05, .12], [-.26, .50, .12], prof(.03, .026, R(3), .05), S, MAT.WOOD, I.rifle);
  m.lathe([-.26, .50, .12], [-.26, 1.45, .12], prof(.014, .012, R(3), .01), Math.max(4, S - 2), MAT.STEEL, I.rifle);
  m.lathe([-.26, 1.45, .12], [-.26, 1.82, .12], prof(.007, .004, R(1), .02), 4, MAT.STEEL, I.rifle);
  for (const t of [.62, .88, 1.2]) m.lathe([-.26, t, .12], [-.26, t + .03, .12], prof(.019, .019, 1, .2), Math.max(4, S - 2), MAT.BRASS, I.rifle);
  return m.done();
}
export function buildHorseMesh(q = 1) {
  const m = new MB(); const S = Math.max(4, Math.round(8 * q)), R = (n) => Math.max(1, Math.round(n * q)); const I = HORSE_RIG.idx; const W = (t) => clamp((t - .72) / .28, 0, 1) * .5;
  m.lathe([0, 1.45, -.75], [0, 1.50, .85], prof(.26, .25, R(8), .12, (t, r) => r * (0.9 + .22 * Math.sin(t * Math.PI))), S + 4, MAT.HORSE, I.body, { bone2: I.chest, w2: (t) => smooth(.4, .8, t) * 0.8, ex: .92, ey: 1 });
  m.lathe([0, 1.62, .8], [0, 1.95, 1.08], prof(.13, .10, R(4), .04), S, MAT.HORSE, I.neck, { bone2: I.head, w2: (t) => smooth(.7, 1, t) * .5 });
  m.lathe([0, 1.95, 1.08], [0, 1.40, 1.55], prof(.10, .045, R(5), .08), S, MAT.HORSE, I.head);
  m.lathe([0, 1.98, 1.00], [0, 1.72, .82], prof(.03, .02, R(2), .1), 4, MAT.MANE, I.neck);
  m.lathe([0, 1.62, -.78], [0, .75, -.92], prof(.035, .02, R(4), .05), 6, MAT.MANE, I.tail);
  for (const [nm, x, z0, zk, zh, top] of [['fl', .17, .62, .60, .60, 1.2], ['fr', -.17, .62, .60, .60, 1.2], ['hl', .17, -.55, -.62, -.62, 1.2], ['hr', -.17, -.55, -.62, -.62, 1.2]]) {
    m.lathe([x, top, z0], [x, nm[0] === 'f' ? .65 : .60, zk], prof(.085, .045, R(4), .05), S, MAT.HORSE, I[nm + 'U'], { bone2: I[nm + 'L'], w2: W });
    m.lathe([x, nm[0] === 'f' ? .65 : .60, zk], [x, .12, zh], prof(.042, .034, R(4), .03), S, MAT.HORSE, I[nm + 'L'], { bone2: I[nm + 'H'], w2: W });
    m.lathe([x, .14, zh], [x, .02, zh + .01], prof(.045, .05, R(2), .1), S, MAT.BOOT, I[nm + 'H']);
  }
  m.box([0, 1.58, -.05], [.2, .04, .24], MAT.SADDLE, I.rPelvis);
  for (const sg of [1, -1]) { const L = sg > 0 ? 'L' : 'R';
    m.lathe([sg * .12, 1.62, -.05], [sg * .26, 1.05, .05], prof(.09, .05, R(4), .05), S, MAT.TROUSERS, I['rLeg' + L]);
    m.lathe([sg * .26, 1.08, .05], [sg * .26, 1.0, .15], prof(.045, .04, R(2), .1), S, MAT.BOOT, I['rLeg' + L]);
    m.lathe([sg * .19, 2.22, 0], [sg * .21, 1.97, .03], prof(.047, .04, R(3), .1), S, MAT.COAT, I['rUarm' + L], { bone2: I['rFarm' + L], w2: W });
    m.lathe([sg * .21, 1.97, .03], [sg * .22, 1.72, .08], prof(.04, .03, R(3), .1), S, MAT.COAT, I['rFarm' + L]);
  }
  m.lathe([0, 1.62, -.03], [0, 2.28, -.03], prof(.15, .11, R(6), .05, (t, r) => r * (1 + .1 * Math.sin(t * 3))), S + 2, MAT.COAT, I.rTorso, { bone2: I.rPelvis, w2: (t) => clamp(1 - t * 3, 0, 1), ex: 1.1, ey: .75 });
  m.lathe([0, 2.28, 0], [0, 2.37, 0], prof(.045, .045, 2, .1), S, MAT.SKIN, I.rTorso); m.lathe([0, 2.31, 0], [0, 2.53, 0], prof(.09, .085, R(4), .5), S, MAT.SKIN, I.rHead, { ex: .92, ey: 1.08 });
  m.lathe([0, 2.47, 0], [0, 2.59, 0], prof(.11, .095, R(3), .03), S, MAT.HAT, I.rHead);
  m.lathe([-.22, 1.75, .08], [-.22, 2.60, .08], prof(.012, .008, R(2), .01), 4, MAT.STEEL, I.sabre);
  m.box([-.22, 1.72, .08], [.012, .03, .015], MAT.BRASS, I.sabre);
  return m.done();
}
export function buildGunMesh(q = 1) { // bone index = part: 0 carriage, 1 barrel (recoils), 2 wheels. Gun points to +z.
  const m = new MB(); const S = Math.max(5, Math.round(12 * q)), R = (n) => Math.max(1, Math.round(n * q));
  m.lathe([0, 1.0, -.5], [0, 1.0, 1.9], prof(.16, .11, R(8), .05, (t, r) => r * (1 + .25 * smooth(.0, .25, t) * (1 - smooth(.25, .4, t)))), S + 4, MAT.BRONZE, 1);
  m.lathe([0, 1.0, 1.9], [0, 1.0, 2.0], prof(.12, .125, 2, .2), S + 4, MAT.BRONZE, 1);
  m.box([0, .85, -1.2], [.05, .06, 1.9], MAT.CARRIAGE, 0); m.box([.22, .95, .1], [.05, .16, .85], MAT.CARRIAGE, 0); m.box([-.22, .95, .1], [.05, .16, .85], MAT.CARRIAGE, 0);
  m.box([0, .8, -3.0], [.14, .04, .1], MAT.IRON, 0);
  for (const sg of [1, -1]) { const x = sg * .78;
    m.lathe([x - .06, 1.0, .1], [x + .06, 1.0, .1], prof(.08, .08, 2, .1), S, MAT.CARRIAGE, 2);
    m.lathe([x - .04, 1.0, .1], [x + .04, 1.0, .1], [[0, .92], [.2, 1.0], [.8, 1.0], [1, .92]], S * 3, MAT.IRON, 2);
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; m.lathe([x, 1.0 + Math.cos(a) * .08, .1 + Math.sin(a) * .08], [x, 1.0 + Math.cos(a) * .92, .1 + Math.sin(a) * .92], prof(.03, .025, R(2), .05), 5, MAT.CARRIAGE, 2); }
  }
  return m.done();
}

// ------------------------------------------------------------------ clips (analytic placeholders)
export const FOOT_CLIPS = [
  { name: 'idle', loop: true, dur: 4.0, speed: 0 }, { name: 'march', loop: true, dur: 1.0, speed: 1.15 }, { name: 'run', loop: true, dur: 0.62, speed: 2.35 },
  { name: 'load', loop: true, dur: 4.2, speed: 0 }, { name: 'fire', loop: true, dur: 1.4, speed: 0 }, { name: 'fall', loop: false, dur: 1.6, speed: 0 }, { name: 'lie', loop: false, dur: 1, speed: 0 }];
export const HORSE_CLIPS = [{ name: 'idle', loop: true, dur: 4.0, speed: 0 }, { name: 'walk', loop: true, dur: 1.15, speed: 1.55 }, { name: 'gallop', loop: true, dur: 0.58, speed: 7.2 }];
const E = qeuler;
export function newPose(rig) { return { rot: Array.from({ length: rig.n }, () => [0, 0, 0, 1]), off: new Float32Array(rig.n * 3), root: [0, 0, 0] }; }
function resetPose(p) { for (const q of p.rot) { q[0] = q[1] = q[2] = 0; q[3] = 1; } p.off.fill(0); p.root[0] = p.root[1] = p.root[2] = 0; }
const TAU = Math.PI * 2;
export function poseFoot(p, clip, s, v = 0) { // v in [0,1] per-soldier variation
  resetPose(p); const R = p.rot, O = p.off, I = FOOT_RIG.idx; const set = (n, x, y, z) => { R[I[n]] = E(x, y, z); }; const off = (n, x, y, z) => { const k = I[n] * 3; O[k] = x; O[k + 1] = y; O[k + 2] = z; };
  const sw = Math.sin(TAU * s), cw = Math.cos(TAU * s);
  const gait = (A, K, lean, bob, armSw, elbow) => {
    const lt = -A * sw, rt = A * sw; // thigh X rotation (negative = forward)
    set('thighL', lt, 0, 0); set('thighR', rt, 0, 0);
    const fl = K * Math.max(0, Math.sin(TAU * s + 1.9)), fr = K * Math.max(0, Math.sin(TAU * s + 1.9 + Math.PI));
    set('shinL', fl + .06, 0, 0); set('shinR', fr + .06, 0, 0);
    set('footL', -(lt + fl) * .55, 0, 0); set('footR', -(rt + fr) * .55, 0, 0);
    p.root[1] = -bob * (0.5 - 0.5 * Math.cos(2 * TAU * s)); set('pelvis', lean * .3, 0.07 * sw, 0.03 * cw); set('spine', lean * .4, -0.1 * sw, -0.02 * cw); set('chest', lean * .3, -0.05 * sw, 0); set('head', -lean * .6, 0.04 * sw, 0);
    set('uarmL', armSw * sw + .1, 0, .06); set('farmL', -elbow, 0, 0);
  };
  const rifleShoulder = () => { set('uarmR', -.25, 0, -.1); set('farmR', -1.35, 0, 0); off('rifle', .04, .93, -.02); set('rifle', -.14, 0, .05); };
  if (clip === 0) {
    const b = Math.sin(TAU * s) * .012, sh = Math.sin(TAU * s + v * 6) * .04;
    set('chest', b, sh * .5, 0); set('pelvis', 0, 0, sh * .3); p.root[0] = sh * .04; set('head', .02, Math.sin(TAU * s + v * 9) * .25, 0); set('uarmL', .1, 0, .08); set('farmL', -.25, 0, 0);
    set('uarmR', -.08, 0, -.05); set('farmR', -.3, 0, 0); off('rifle', .1, .05, .1); set('thighL', 0, 0, .02); set('thighR', 0, 0, -.02); set('shinL', .03, 0, 0); set('shinR', .03, 0, 0);
  } else if (clip === 1) { gait(.42 * (1 + .1 * (v - .5)), .85, .05, .035, .3, .2); rifleShoulder(); }
  else if (clip === 2) { gait(.72 * (1 + .1 * (v - .5)), 1.35, .2, .08, .8, .9); rifleShoulder(); set('rifle', -.45, 0, .1); off('rifle', .04, .93, .02); }
  else if (clip === 3) {
    const m9 = Math.sin(TAU * s * 9) * .5 + .5, ramW = smooth(.5, .6, s) * (1 - smooth(.92, .99, s)), biteW = 1 - smooth(.25, .35, s); set('chest', .05, -.12, 0); set('pelvis', 0, .1, 0); set('head', .25 * biteW + .05, -.1, 0);
    set('thighL', .0, 0, .02); set('thighR', -.15, 0, -.02); set('shinR', .12, 0, 0);
    off('rifle', .31, 1.02, .2); set('rifle', -.1, 0, .0); set('uarmL', -1.15, 0, .1); set('farmL', -.6, 0, 0);
    set('uarmR', -.7 - .5 * ramW * m9, 0, -.1); set('farmR', -1.0 - .6 * (ramW * m9 + (1 - ramW) * .3 * Math.sin(TAU * s * 3)), 0, 0);
  } else if (clip === 4) {
    const up = smooth(0, .3, s) * (1 - smooth(.6, .95, s)), rec = smooth(.40, .43, s) * Math.exp(-Math.max(s - .43, 0) * 14) * (1 - smooth(.6, .72, s));
    set('chest', .02 - .05 * rec, -.12 * (1 - up), 0); set('pelvis', 0, .1, 0); set('thighL', -.1, 0, .03); set('thighR', .1, 0, -.03); set('shinL', .12, 0, 0); set('shinR', .06, 0, 0);
    set('head', .1 * up, 0, 0.05 * up);
    const rx = lerp(-.1, Math.PI / 2 - .04, up); off('rifle', lerp(.31, .1, up), lerp(1.02, 1.37, up), lerp(.2, .13, up) + .08 * up - rec * .05); set('rifle', rx - rec * .12, 0, 0);
    set('uarmL', lerp(-1.15, -1.45, up), 0, .1); set('farmL', lerp(-.6, -.3, up), 0, 0); set('uarmR', lerp(-.7, -1.35, up), 0, -.15); set('farmR', lerp(-1.0, -1.45, up), 0, 0);
  } else if (clip === 5 || clip === 6) {
    const f = clip === 6 ? 1 : s, g = smooth(0, 1, f), bk = smooth(.1, 1, f);
    set('pelvis', -1.5 * bk, 0.2 * g, 0); p.root[1] = -(.93 - .16) * smooth(.2, 1, f); p.root[2] = -.7 * bk; set('chest', .25 * (1 - g) - .25 * g, 0, 0); set('head', -.3 * g, .4 * g, 0);
    set('thighL', -.5 * g, 0, .25 * g); set('thighR', -.2 * g, 0, -.3 * g); set('shinL', .7 * g, 0, 0); set('shinR', .4 * g, 0, 0);
    set('uarmL', -.3 * g, 0, 1.2 * g); set('farmL', -.3 * g, 0, 0); set('uarmR', -.2 * g, 0, -1.3 * g); set('farmR', -.4 * g, 0, 0); off('rifle', -.35 * g, .2 * g + .93 * (1 - g), -.2 * g); set('rifle', 0, 0, 1.2 * g);
  }
  return p;
}
export function poseHorse(p, clip, s, v = 0) {
  resetPose(p); const I = HORSE_RIG.idx; const R = p.rot; const set = (n, x, y, z) => { R[I[n]] = E(x, y, z); };
  if (clip === 0) { const b = Math.sin(TAU * s) * .01; set('chest', b, 0, 0); set('neck', .15 + b * 2, Math.sin(TAU * s * .5 + v * 7) * .1, 0); set('head', .3, 0, 0); set('tail', .1, Math.sin(TAU * s + 1) * .15, 0);
    set('rFarmR', -1.2, 0, 0); set('rUarmR', -.4, 0, -.1); set('rUarmL', -.3, 0, .1); set('rFarmL', -.8, 0, 0); set('rLegL', .1, 0, -.15); set('rLegR', .1, 0, .15); set('sabre', 2.9, 0, 0); return p; }
  const gal = clip === 2; const sw = (ph) => Math.sin(TAU * (s + ph)), A = gal ? .7 : .38;
  const legs = gal ? { fl: .0, fr: .09, hl: .5, hr: .6 } : { hl: 0, fl: .25, hr: .5, fr: .75 };
  for (const n of ['fl', 'fr', 'hl', 'hr']) { const ph = legs[n], a = sw(ph), fw = n[0] === 'f';
    set(n + 'U', -A * a * (fw ? 1 : .85), 0, 0); const fl = Math.max(0, Math.sin(TAU * (s + ph) + 1.6)) * (gal ? 1.4 : .9) * (fw ? 1 : .6); set(n + 'L', fw ? fl : -fl * .8, 0, 0); set(n + 'H', fw ? -fl * .4 : fl * .5, 0, 0); }
  const pit = gal ? .09 * Math.sin(TAU * (s + .1)) : .02 * Math.sin(TAU * 2 * s); p.root[1] = gal ? .12 * Math.abs(Math.cos(TAU * (s + .05))) : .03 * Math.abs(Math.cos(TAU * s)); set('body', pit, 0, gal ? 0 : .02 * Math.sin(TAU * s));
  set('chest', -pit * .5, 0, 0); set('neck', (gal ? .25 : .12) + (gal ? .1 : .05) * Math.sin(TAU * (s + .2)), 0, 0); set('head', gal ? .2 : .25, 0, 0); set('tail', gal ? -.35 + .15 * Math.sin(TAU * s) : .05 * Math.sin(TAU * s), .1 * Math.sin(TAU * s * 2), 0);
  set('rTorso', gal ? .22 : .03, 0, 0); set('rHead', gal ? -.15 : 0, 0, 0); set('rLegL', .1, 0, -.1); set('rLegR', .1, 0, .1);
  set('rUarmL', -.5, 0, .1); set('rFarmL', -.9, 0, 0);
  if (gal) { set('rUarmR', -2.6, 0, -.2); set('rFarmR', -.2, 0, 0); set('sabre', -1.2, 0, 0); } else { set('rUarmR', -.5, 0, -.1); set('rFarmR', -1.1, 0, 0); set('sabre', 2.9, 0, 0); }
  return p;
}

// ------------------------------------------------------------------ forward kinematics -> skin matrices (3 rows x vec4 per bone: out[o + b*12 ..])
const WR = [], WP = [], WQ = [];
export function fk(rig, pose, out, o = 0) {
  const n = rig.n; while (WR.length < n) { WR.push(new Float32Array(9)); WP.push([0, 0, 0]); WQ.push([0, 0, 0, 1]); }
  for (let b = 0; b < n; b++) {
    const par = rig.parent[b]; const h = rig.head[b]; const k = b * 3; let lx, ly, lz;
    if (par < 0) { lx = h[0] + pose.root[0] + pose.off[k]; ly = h[1] + pose.root[1] + pose.off[k + 1]; lz = h[2] + pose.root[2] + pose.off[k + 2]; WQ[b] = pose.rot[b].slice(); WP[b][0] = lx; WP[b][1] = ly; WP[b][2] = lz; }
    else { const ph = rig.head[par]; lx = h[0] - ph[0] + pose.off[k]; ly = h[1] - ph[1] + pose.off[k + 1]; lz = h[2] - ph[2] + pose.off[k + 2]; const Rp = WR[par];
      WP[b][0] = WP[par][0] + Rp[0] * lx + Rp[3] * ly + Rp[6] * lz; WP[b][1] = WP[par][1] + Rp[1] * lx + Rp[4] * ly + Rp[7] * lz; WP[b][2] = WP[par][2] + Rp[2] * lx + Rp[5] * ly + Rp[8] * lz; WQ[b] = qmul(WQ[par], pose.rot[b]); }
    qmat(WQ[b], WR[b]); const Rm = WR[b]; // column-major
    const tx = WP[b][0] - (Rm[0] * h[0] + Rm[3] * h[1] + Rm[6] * h[2]), ty = WP[b][1] - (Rm[1] * h[0] + Rm[4] * h[1] + Rm[7] * h[2]), tz = WP[b][2] - (Rm[2] * h[0] + Rm[5] * h[1] + Rm[8] * h[2]);
    const q = o + b * 12; out[q] = Rm[0]; out[q + 1] = Rm[3]; out[q + 2] = Rm[6]; out[q + 3] = tx; out[q + 4] = Rm[1]; out[q + 5] = Rm[4]; out[q + 6] = Rm[7]; out[q + 7] = ty; out[q + 8] = Rm[2]; out[q + 9] = Rm[5]; out[q + 10] = Rm[8]; out[q + 11] = tz;
  }
  return out;
}
export function skinVerts(mesh, M, out) {
  const v = mesh.verts, n = mesh.nv;
  for (let i = 0; i < n; i++) { const o = i * VSTRIDE; const x = v[o], y = v[o + 1], z = v[o + 2]; let px = 0, py = 0, pz = 0;
    for (let k = 0; k < 2; k++) { const b = v[o + 7 + k] | 0, w = v[o + 9 + k]; if (w === 0) continue; const q = b * 12; px += w * (M[q] * x + M[q + 1] * y + M[q + 2] * z + M[q + 3]); py += w * (M[q + 4] * x + M[q + 5] * y + M[q + 6] * z + M[q + 7]); pz += w * (M[q + 8] * x + M[q + 9] * y + M[q + 10] * z + M[q + 11]); }
    out[i * 4] = px; out[i * 4 + 1] = py; out[i * 4 + 2] = pz; out[i * 4 + 3] = 1; }
  return out;
}
// ------------------------------------------------------------------ VAT bake: rows = clip frames, cols = vertices (RGBA32F)
export function bakeVAT(kind, mesh, frames = 32) {
  const rig = kind === 'foot' ? FOOT_RIG : HORSE_RIG, clips = kind === 'foot' ? FOOT_CLIPS : HORSE_CLIPS, pose = newPose(rig), pf = kind === 'foot' ? poseFoot : poseHorse;
  const w = mesh.nv, h = clips.length * frames, tex = new Float32Array(w * h * 4), M = new Float32Array(rig.n * 12), rows = [];
  clips.forEach((c, ci) => { rows.push(ci * frames); for (let f = 0; f < frames; f++) { const s = c.loop ? f / frames : f / (frames - 1); pf(pose, ci, s, .5); fk(rig, pose, M); skinVerts(mesh, M, tex.subarray((ci * frames + f) * w * 4, (ci * frames + f + 1) * w * 4)); } });
  return { tex, w, h, frames, rows };
}
// ------------------------------------------------------------------ software-rasterised impostor atlas (views x frames x clips) for one team
export function bakeImpostor(kind, mesh, vat, team, { views = 8, frames = 8, cw = 32, ch = 48 } = {}) {
  const clips = kind === 'foot' ? FOOT_CLIPS : HORSE_CLIPS, nc = clips.length, W = views * cw, H = nc * frames * ch; const img = new Uint8ClampedArray(W * H * 4), zb = new Float32Array(cw * ch);
  const pal = PALETTE[team]; const height = kind === 'foot' ? 1.95 : 2.7; const sc = ch / height * 0.96; const idx = mesh.idx, nt = idx.length / 3, v = mesh.verts;
  const sx = new Float32Array(mesh.nv), sy = new Float32Array(mesh.nv), sz = new Float32Array(mesh.nv);
  for (let ci = 0; ci < nc; ci++) for (let f = 0; f < frames; f++) { const srcF = Math.min(vat.frames - 1, Math.round(f / frames * (vat.frames - (clips[ci].loop ? 0 : 1)))); const row = (ci * vat.frames + srcF) * vat.w * 4;
    for (let vi = 0; vi < views; vi++) { const az = vi / views * Math.PI * 2, ca = Math.cos(az), sa = Math.sin(az); zb.fill(-1e9); const ox = vi * cw, oy = (ci * frames + f) * ch;
      for (let k = 0; k < mesh.nv; k++) { const X = vat.tex[row + k * 4], Y = vat.tex[row + k * 4 + 1], Z = vat.tex[row + k * 4 + 2]; const rx = X * ca + Z * sa, rz = -X * sa + Z * ca; sx[k] = cw / 2 + rx * sc; sy[k] = ch - 1 - Y * sc; sz[k] = rz; }
      for (let t = 0; t < nt; t++) { const i0 = idx[t * 3], i1 = idx[t * 3 + 1], i2 = idx[t * 3 + 2];
        const ax = sx[i0], ay = sy[i0], bx = sx[i1], by = sy[i1], cx = sx[i2], cy = sy[i2]; const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); if (Math.abs(area) < 1e-6) continue;
        const ny = v[i0 * VSTRIDE + 4]; const mat = v[i0 * VSTRIDE + 6] | 0, c = pal[mat]; const lum = .6 + .4 * clamp(ny * .5 + .5, 0, 1);
        const rr = clamp(c[0] ** (1 / 2.2) * 255 * lum, 0, 255), gg = clamp(c[1] ** (1 / 2.2) * 255 * lum, 0, 255), bb = clamp(c[2] ** (1 / 2.2) * 255 * lum, 0, 255);
        const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(cw - 1, Math.ceil(Math.max(ax, bx, cx))), y0 = Math.max(0, Math.floor(Math.min(ay, by, cy))), y1 = Math.min(ch - 1, Math.ceil(Math.max(ay, by, cy)));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const px = x + .5, py = y + .5; const w0 = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / area, w1 = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / area, w2 = 1 - w0 - w1; if (w0 < -.02 || w1 < -.02 || w2 < -.02) continue;
          const zz = w0 * sz[i0] + w1 * sz[i1] + w2 * sz[i2]; if (zz <= zb[y * cw + x]) continue; zb[y * cw + x] = zz; const o = ((oy + y) * W + ox + x) * 4; img[o] = rr; img[o + 1] = gg; img[o + 2] = bb; img[o + 3] = 255; } }
    } }
  return { img, W, H, views, frames, cw, ch, nc };
}

// ------------------------------------------------------------------ bone-matrix bake (alternative to VAT for the mid LOD): rows = clip frames, columns = 3 texels (matrix rows) per bone, RGBA32F
export function bakeBones(kind, frames = 32) {
  const rig = kind === 'foot' ? FOOT_RIG : HORSE_RIG, clips = kind === 'foot' ? FOOT_CLIPS : HORSE_CLIPS, pose = newPose(rig), pf = kind === 'foot' ? poseFoot : poseHorse;
  const w = rig.n * 3, h = clips.length * frames, tex = new Float32Array(w * h * 4), rows = [];
  clips.forEach((c, ci) => { rows.push(ci * frames); for (let f = 0; f < frames; f++) { const s = c.loop ? f / frames : f / (frames - 1); pf(pose, ci, s, .5); fk(rig, pose, tex, (ci * frames + f) * w * 4); } });
  return { tex, w, h, frames, rows };
}
