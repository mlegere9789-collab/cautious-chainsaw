// Rig adapter: reads one section (human | horse | gun) of data/figures3d/skeleton.json (written by the figures module, schema figures3d-skeleton-1) and gives the animation system
//  * topology, rest offsets, joint limits, IK chains, sockets;
//  * the "core" (animated) joint set and the clip FRAME layout (what a clip stores per sample);
//  * forward kinematics (allocation-free), skin-matrix output (3 x vec4 per bone), and a hinge two-bone IK that keeps the middle joint a pure X hinge (knee / elbow limits z = 0).
// Pose = local quaternion relative to the rest pose (rest rotations are identity: A-pose), plus translations for the few translatable bones (pelvis and the prop bones).
import { qmul, qident, qcopy, qrot, qaxis, qfromTo, qconj, qeuler, qtoEuler, qnorm, D2R, R2D, clamp, hyp2, hyp3 } from './qmath.mjs';

const FINGER = /^(index|middle|ring|pinky|thumb)/;
export class Rig {
  constructor(section, kind = 'human') {
    const B = section.bones; this.kind = kind; this.n = B.length; this.names = B.map(b => b.name); this.index = Object.assign({}, section.index);
    this.parent = Int16Array.from(B.map(b => (b.parent == null ? -1 : b.parent)));
    for (let i = 0; i < this.n; i++) if (this.parent[i] >= i) throw new Error('rig: bones must be topologically ordered (parent before child): ' + this.names[i]);
    this.local = new Float64Array(this.n * 3); this.head = new Float64Array(this.n * 3);
    B.forEach((b, i) => { this.local.set(b.local, i * 3); this.head.set(b.head, i * 3); });
    this.group = B.map(b => b.group); this.isProp = B.map(b => !!b.prop);
    this.limits = new Float64Array(this.n * 6).fill(NaN); // degrees: xmin xmax ymin ymax zmin zmax (NaN = unlimited / fixed rig bone)
    B.forEach((b, i) => { if (b.limits) { const l = b.limits; this.limits.set([l.x[0], l.x[1], l.y[0], l.y[1], l.z[0], l.z[1]], i * 6); } });
    this.spring = B.map(b => b.spring || null);
    this.sockets = section.sockets || []; this.socket = Object.fromEntries(this.sockets.map(s => [s.name, s]));
    this.longArmSockets = section.long_arm_sockets || []; this.footGeometry = section.foot_geometry || null; this.stature = section.stature_m || section.withers_height_m || 0;
    this.lod = section.lod || null; this.ikChains = section.ik_chains || [];
    // core = joints a clip may rotate. Fingers (driven by the grip scalars), eyes and the gear/spring bones (secondary motion, simulated) are not stored in clips.
    this.core = []; this.coreSlot = new Int16Array(this.n).fill(-1);
    for (let i = 0; i < this.n; i++) { const nm = this.names[i], g = this.group[i]; if (FINGER.test(nm) || g === 'gear' || /^eye_/.test(nm)) continue; this.coreSlot[i] = this.core.length; this.core.push(i); }
    this.nCore = this.core.length;
    // translatable bones: the pelvis (bob / sway) and the props; each has 3 floats in a frame
    this.transBones = []; this.transSlot = new Int16Array(this.n).fill(-1);
    for (let i = 0; i < this.n; i++) if (i === 0 || this.names[i] === 'pelvis' || this.names[i] === 'carriage' || this.isProp[i]) { this.transSlot[i] = this.transBones.length; this.transBones.push(i); }
    this.nTrans = this.transBones.length;
    // frame layout: [core quats | trans | gripL, gripR, contactL, contactR, rootX, rootZ, rootYaw]
    this.OFF_TRANS = this.nCore * 4; this.OFF_EXTRA = this.OFF_TRANS + this.nTrans * 3; this.NEXTRA = 7; this.frameLen = this.OFF_EXTRA + this.NEXTRA;
    this.X_GRIPL = 0; this.X_GRIPR = 1; this.X_CONTL = 2; this.X_CONTR = 3; this.X_ROOTX = 4; this.X_ROOTZ = 5; this.X_ROOTYAW = 6;
    this.fingers = []; // [bone, curl scale x-degrees, side 'L'|'R']
    for (let i = 0; i < this.n; i++) { const nm = this.names[i]; if (FINGER.test(nm)) { const side = nm.endsWith('_L') ? 0 : 1, thumb = nm.startsWith('thumb'), second = /2_/.test(nm); this.fingers.push([i, thumb ? (second ? -35 : -22) : (second ? -80 : -70), side]); } }
    // chain tables for the hinge IK, built from the rig's own ik_chains
    this.chains = {};
    for (const c of this.ikChains) {
      const a = this.index[c.root], b = this.index[c.mid], e = this.index[c.end];
      const av = [this.local[b * 3], this.local[b * 3 + 1], this.local[b * 3 + 2]], vv = [this.local[e * 3], this.local[e * 3 + 1], this.local[e * 3 + 2]];
      this.chains[c.name] = { lastAbs: null, lastDev: null, name: c.name, a, b, e, pole: c.pole.slice(), av, vv, l1: hyp3(av[0], av[1], av[2]), l2: hyp3(vv[0], vv[1], vv[2]), sign: /^arm/.test(c.name) ? -1 : 1 };
      const ch = this.chains[c.name]; const [ax, ay, az] = av, [vx, vy, vz] = vv;
      ch.K0 = ax * vx; ch.Kc = ay * vy + az * vz; ch.Ks = az * vy - ay * vz; ch.ab2 = ax * ax + ay * ay + az * az + vx * vx + vy * vy + vz * vz;
      ch.dmax = Math.sqrt(ch.ab2 + 2 * (ch.K0 + ch.Kc)); // reach at the hinge's extension limit (theta = 0)
    }
    this.restPelvis = this.pelvis >= 0 ? this.pelvis : -1; this.shiftMem = new Float64Array(6);
  }
  get pelvis() { return this.index.pelvis ?? -1; }
  resetChains() { this.shiftMem.fill(0); for (const c of Object.values(this.chains)) { c.lastAbs = null; c.v = null; c.mode = 0; c.lastCl = null; c.lastClDir = null; c.lastProj = null; } }
  idx(name) { const i = this.index[name]; if (i === undefined) throw new Error('rig ' + this.kind + ': no bone ' + name); return i; }
  headOf(i) { return [this.head[i * 3], this.head[i * 3 + 1], this.head[i * 3 + 2]]; }
  newPose() { const rot = new Float32Array(this.n * 4); for (let i = 0; i < this.n; i++) rot[i * 4 + 3] = 1; return { rot, trans: new Float32Array(this.nTrans * 3) }; }
  newFrame() { const f = new Float32Array(this.frameLen); for (let s = 0; s < this.nCore; s++) f[s * 4 + 3] = 1; return f; }
  newFK() { return { wq: new Float64Array(this.n * 4), wp: new Float64Array(this.n * 3) }; }
  // expand a clip frame to a full pose (identity for non-core bones, finger curl from the grips)
  expandFrame(frame, pose) {
    const rot = pose.rot; for (let s = 0; s < this.nCore; s++) { const b = this.core[s] * 4, o = s * 4; rot[b] = frame[o]; rot[b + 1] = frame[o + 1]; rot[b + 2] = frame[o + 2]; rot[b + 3] = frame[o + 3]; }
    const t = pose.trans; for (let k = 0; k < this.nTrans * 3; k++) t[k] = frame[this.OFF_TRANS + k];
    const gl = frame[this.OFF_EXTRA + this.X_GRIPL], gr = frame[this.OFF_EXTRA + this.X_GRIPR];
    for (let k = 0; k < this.fingers.length; k++) { const [b, deg, side] = this.fingers[k], g = side === 0 ? gl : gr, a = deg * g * D2R * 0.5, o = b * 4; rot[o] = Math.sin(a); rot[o + 1] = 0; rot[o + 2] = 0; rot[o + 3] = Math.cos(a); }
    return pose;
  }
  // forward kinematics: wq (world quats), wp (world joint positions) for the whole rig. Root sits at the origin (the instance transform is the renderer's).
  fk(pose, fk) {
    const { wq, wp } = fk, n = this.n, rot = pose.rot, tr = pose.trans, par = this.parent, loc = this.local, ts = this.transSlot;
    for (let b = 0; b < n; b++) {
      const p = par[b], q = b * 4, k = b * 3; let lx = loc[k], ly = loc[k + 1], lz = loc[k + 2];
      const s = ts[b]; if (s >= 0) { lx += tr[s * 3]; ly += tr[s * 3 + 1]; lz += tr[s * 3 + 2]; }
      if (p < 0) { wq[q] = rot[q]; wq[q + 1] = rot[q + 1]; wq[q + 2] = rot[q + 2]; wq[q + 3] = rot[q + 3]; wp[k] = lx; wp[k + 1] = ly; wp[k + 2] = lz; }
      else { qmul(wq, q, wq, p * 4, rot, q); qrot(wp, k, wq, p * 4, lx, ly, lz); wp[k] += wp[p * 3]; wp[k + 1] += wp[p * 3 + 1]; wp[k + 2] += wp[p * 3 + 2]; }
    }
    return fk;
  }
  // skin matrices for a bone list (null = all): 3 rows x 4 floats per bone (row-major [R | t]) with t = p - R * restHead (inverse bind = translate(-head))
  skin(fk, out, list = null, o = 0) {
    const { wq, wp } = fk, m = list ? list.length : this.n;
    for (let i = 0; i < m; i++) {
      const b = list ? list[i] : i, q = b * 4, x = wq[q], y = wq[q + 1], z = wq[q + 2], w = wq[q + 3], hx = this.head[b * 3], hy = this.head[b * 3 + 1], hz = this.head[b * 3 + 2];
      const r00 = 1 - 2 * (y * y + z * z), r01 = 2 * (x * y - z * w), r02 = 2 * (x * z + y * w), r10 = 2 * (x * y + z * w), r11 = 1 - 2 * (x * x + z * z), r12 = 2 * (y * z - x * w), r20 = 2 * (x * z - y * w), r21 = 2 * (y * z + x * w), r22 = 1 - 2 * (x * x + y * y);
      const k = o + i * 12;
      out[k] = r00; out[k + 1] = r01; out[k + 2] = r02; out[k + 3] = wp[b * 3] - (r00 * hx + r01 * hy + r02 * hz);
      out[k + 4] = r10; out[k + 5] = r11; out[k + 6] = r12; out[k + 7] = wp[b * 3 + 1] - (r10 * hx + r11 * hy + r12 * hz);
      out[k + 8] = r20; out[k + 9] = r21; out[k + 10] = r22; out[k + 11] = wp[b * 3 + 2] - (r20 * hx + r21 * hy + r22 * hz);
    }
    return out;
  }
  // joint-limit check of a pose (G6): returns the number of violations and the worst excess in degrees; tolEps in degrees
  limitViolations(pose, tolEps = 0.5, report = null) {
    const e = new Float64Array(3); let count = 0, worst = 0;
    for (const b of this.core) {
      const l = b * 6; if (Number.isNaN(this.limits[l])) continue;
      qtoEuler(e, pose.rot, b * 4);
      for (let a = 0; a < 3; a++) { const d = e[a] * R2D, lo = this.limits[l + a * 2], hi = this.limits[l + a * 2 + 1], ex = d < lo ? lo - d : d > hi ? d - hi : 0; if (ex > tolEps) { count++; if (ex > worst) worst = ex; if (report) report.push({ bone: this.names[b], axis: 'xyz'[a], deg: d, lo, hi }); } }
    }
    return { count, worst };
  }
}

// ------------------------------------------------------------------ hinge two-bone IK
// The middle joint is a pure X hinge (knee: theta in [0,150]; elbow: theta in [-145,0], z fixed 0, as the rig's limits say). Given the root joint world position A, the parent's world rotation P and a target T for the end joint:
//  1. the hinge angle theta follows from the distance |T - A| (closed form: a . Rx(theta) v = K0 + Kc cos + Ks sin);
//  2. the root bone's world rotation turns the bent shape onto T and swivels the elbow/knee to the pole direction;
// The solved quats are written into pose.rot (root joint local, mid joint local) and into fk (world) for those bones. Returns the reach error in metres (clamped targets) via the scratch result.
// the distances from the chain root to its end that the hinge can produce: [at the flexion limit, at full extension] (what solveHinge clamps to); flexDeg (optional) replaces the limit by a more comfortable flexion
export function reachRange(rig, ch, flexDeg = null) {
  const lim = rig.limits[ch.b * 6], lo = Number.isNaN(lim) ? 0 : lim, hi = Number.isNaN(lim) ? 150 : rig.limits[ch.b * 6 + 1], th = flexDeg != null ? flexDeg * D2R : (ch.sign > 0 ? hi : lo) * D2R;
  return [Math.sqrt(Math.max(0, ch.ab2 + 2 * (ch.K0 + ch.Kc * Math.cos(th) + ch.Ks * Math.sin(th)))) * 1.0005, ch.dmax * 0.9995];
}
export const SOLVE_STATE = { near: false, far: false, excess: 0, fine: false, jump: false, win: 12 };
const normAng = x => { while (x > Math.PI) x -= 2 * Math.PI; while (x < -Math.PI) x += 2 * Math.PI; return x; };
const S = { h: new Float64Array(3), q1: new Float64Array(4), q2: new Float64Array(4), qa: new Float64Array(4), qp: new Float64Array(4), t: new Float64Array(3), e: new Float64Array(3), tmp: new Float64Array(4) };
export function solveHinge(rig, ch, pose, fk, tx, ty, tz, px, py, pz, bias = 0) {
  const { wq, wp } = fk, a = ch.a, b = ch.b, e = ch.e, par = rig.parent[a];
  const Ax = wp[a * 3], Ay = wp[a * 3 + 1], Az = wp[a * 3 + 2];
  let dx = tx - Ax, dy = ty - Ay, dz = tz - Az, d = hyp3(dx, dz, dy) || 1e-9;
  // clamp the reach to [distance at the flexion limit, distance at theta = 0]
  const dmaxC = ch.dmax * 0.9995;
  const lim = rig.limits[b * 6]; const lo = Number.isNaN(lim) ? 0 : lim, hi = Number.isNaN(lim) ? 150 : rig.limits[b * 6 + 1];
  const thMax = ch.sign > 0 ? hi * D2R : lo * D2R; // the extreme flexion (positive for the knee, negative for the elbow)
  const dminC = Math.sqrt(Math.max(0, ch.ab2 + 2 * (ch.K0 + ch.Kc * Math.cos(thMax) + ch.Ks * Math.sin(thMax)))) * 1.0005;
  SOLVE_STATE.near = d < dminC; SOLVE_STATE.far = d > dmaxC; const dc = clamp(d, dminC, dmaxC); const sc = dc / d; dx *= sc; dy *= sc; dz *= sc; d = dc;
  // theta: Kc cos + Ks sin = (d^2 - ab2)/2 - K0 ; R cos(theta - delta) = rhs
  const rhs = (d * d - ch.ab2) / 2 - ch.K0, R = hyp2(ch.Kc, ch.Ks) || 1e-12, delta = Math.atan2(ch.Ks, ch.Kc), acs = Math.acos(clamp(rhs / R, -1, 1));
  const th1 = normAng(delta + acs), th2 = normAng(delta - acs);
  const th = ch.sign > 0 ? Math.max(th1, th2, 0) : Math.min(th1, th2, 0);
  const c = Math.cos(th), s = Math.sin(th), [ax, ay, az] = ch.av, [vx, vy, vz] = ch.vv;
  // h = a + Rx(theta) v in the root bone's rest frame
  const hx = ax + vx, hy = ay + vy * c - vz * s, hz = az + vy * s + vz * c; const hl = hyp3(hx, hy, hz);
  const Tx = dx / d, Ty = dy / d, Tz = dz / d;
  qfromTo(S.q1, 0, hx / hl, hy / hl, hz / hl, Tx, Ty, Tz);
  qrot(S.e, 0, S.q1, 0, ax, ay, az); // elbow after q1
  let eperp0 = S.e[0] - (S.e[0] * Tx + S.e[1] * Ty + S.e[2] * Tz) * Tx, eperp1 = S.e[1] - (S.e[0] * Tx + S.e[1] * Ty + S.e[2] * Tz) * Ty, eperp2 = S.e[2] - (S.e[0] * Tx + S.e[1] * Ty + S.e[2] * Tz) * Tz;
  const pd = px * Tx + py * Ty + pz * Tz; const pp0 = px - pd * Tx, pp1 = py - pd * Ty, pp2 = pz - pd * Tz;
  const el = hyp3(eperp0, eperp1, eperp2), pl = hyp3(pp0, pp1, pp2);
  // swivel: aim the middle joint at the pole, then search nearby swivel angles for the one whose root-joint Euler angles best respect the rig's limits (G6), preferring the pole direction
  qident(S.qa, 0); let psi0 = bias;
  if (el > 1e-6 && pl > 1e-6) {
    const cr0 = eperp1 * pp2 - eperp2 * pp1, cr1 = eperp2 * pp0 - eperp0 * pp2, cr2 = eperp0 * pp1 - eperp1 * pp0;
    psi0 = bias + Math.atan2(cr0 * Tx + cr1 * Ty + cr2 * Tz, eperp0 * pp0 + eperp1 * pp1 + eperp2 * pp2);
  }
  // Swivel selection (G6). The root joint's local Euler angles must lie inside the rig's limits. The swivel angle psi is tracked ABSOLUTELY from frame to frame (continuity: the arm never snaps): the previous frame's psi, relaxed 10 percent
  // toward the pole, is tried first; if it is outside the limits the nearest feasible psi within 30 degrees of it is found by a 1-degree scan and refined by bisection. A far jump (another feasible interval) is only taken at
  // the start of a clip or when SOLVE_STATE.jump is set by the caller after the continuous remedies (clavicle, hand target) failed. If nothing is feasible the smallest-excess psi is used and SOLVE_STATE.excess reports it.
  const lo6 = a * 6; let bestPsi = psi0; SOLVE_STATE.excess = 0;
  if (!Number.isNaN(rig.limits[lo6])) {
    const TOL = 0.02;
    const pen = psi => { qaxis(S.qa, 0, Tx, Ty, Tz, psi); qmul(S.q2, 0, S.qa, 0, S.q1, 0); if (par >= 0) { qconj(S.qp, 0, wq, par * 4); qmul(S.tmp, 0, S.qp, 0, S.q2, 0); } else qcopy(S.tmp, 0, S.q2, 0);
      qtoEuler(S.e, S.tmp, 0); let p = 0; for (let k = 0; k < 3; k++) { const dd = S.e[k] * R2D, l0 = rig.limits[lo6 + k * 2], h0 = rig.limits[lo6 + k * 2 + 1]; if (dd < l0) p += l0 - dd; else if (dd > h0) p += dd - h0; } const ay = Math.abs(S.e[1]) * R2D; if (ay > 88.5) p += ay - 88.5; return p; };   // keep clear of the Euler singularity (|y| = 90), where the other two angles are arbitrary
    const full = ch.lastAbs == null || SOLVE_STATE.jump;
    let bp = 1e18;
    if (!full) {
      const la = ch.lastAbs, rel = la + 0.1 * normAng(psi0 - la);
      let p0 = pen(rel); if (p0 <= TOL) { bestPsi = rel; bp = p0; } else { p0 = pen(la); if (p0 <= TOL) { bestPsi = la; bp = p0; } else {
        bp = p0; bestPsi = la; let found = false;
        for (let k = 1; k <= SOLVE_STATE.win && !found; k++) for (let sg = 1; sg >= -1 && !found; sg -= 2) { const ps = la + sg * k * D2R, pp = pen(ps);
          if (pp < bp - 1e-9) { bp = pp; bestPsi = ps; }
          if (pp <= TOL) { let inf = la + sg * (k - 1) * D2R, fe = ps; for (let it = 0; it < 7; it++) { const m = 0.5 * (inf + fe); if (pen(m) <= TOL) fe = m; else inf = m; } bestPsi = fe; bp = pen(fe); found = true; } } } }
    } else {
      let bc = 1e18, bd = 0; const NG = SOLVE_STATE.fine ? 360 : 72; const ref = ch.lastAbs == null ? psi0 : ch.lastAbs;
      for (let k = 0; k < NG; k++) { const dev = normAng(k * (2 * Math.PI / NG)); const pp = pen(ref + dev); const cost = Math.abs(dev) * R2D;
        if (pp <= TOL) { if (bp > TOL || cost < bc) { bp = pp; bc = cost; bd = dev; } } else if (bp > TOL && pp < bp - 1e-9) { bp = pp; bc = cost; bd = dev; } }
      if (bp > TOL) { let bdev = bd; for (let k = -6; k <= 6; k++) { const dev = bd + k * (SOLVE_STATE.fine ? 0.25 : 0.8) * D2R; const pp = pen(ref + dev); if (pp < bp - 1e-9) { bp = pp; bdev = dev; } } bd = bdev; }
      else if (bd !== 0) { let inf = ref, fe = ref + bd, k0 = normAng(bd) > 0 ? -1 : 1; void k0; inf = ref + bd - Math.sign(bd) * (2 * Math.PI / NG); if (pen(inf) > TOL) for (let it = 0; it < 7; it++) { const m = 0.5 * (inf + fe); if (pen(m) <= TOL) fe = m; else inf = m; } bd = fe - ref; }
      bestPsi = ref + bd;
    }
    SOLVE_STATE.excess = bp > TOL ? bp : 0;
  }
  ch.lastAbs = bestPsi; qaxis(S.qa, 0, Tx, Ty, Tz, bestPsi);
  qmul(S.q2, 0, S.qa, 0, S.q1, 0); // world rotation of the root bone (rest frame -> world)
  // local rotation of the root joint
  if (par >= 0) { qconj(S.qp, 0, wq, par * 4); qmul(S.tmp, 0, S.qp, 0, S.q2, 0); } else qcopy(S.tmp, 0, S.q2, 0);
  qnorm(S.tmp, 0); const ra = a * 4; pose.rot[ra] = S.tmp[0]; pose.rot[ra + 1] = S.tmp[1]; pose.rot[ra + 2] = S.tmp[2]; pose.rot[ra + 3] = S.tmp[3];
  qcopy(wq, ra, S.q2, 0);
  // mid joint: pure X rotation
  qaxis(S.qp, 0, 1, 0, 0, th); const rb = b * 4; pose.rot[rb] = S.qp[0]; pose.rot[rb + 1] = S.qp[1]; pose.rot[rb + 2] = S.qp[2]; pose.rot[rb + 3] = S.qp[3];
  qmul(wq, rb, wq, ra, S.qp, 0);
  // positions of mid and end
  qrot(S.t, 0, wq, ra, ch.av[0], ch.av[1], ch.av[2]); wp[b * 3] = Ax + S.t[0]; wp[b * 3 + 1] = Ay + S.t[1]; wp[b * 3 + 2] = Az + S.t[2];
  qrot(S.t, 0, wq, rb, ch.vv[0], ch.vv[1], ch.vv[2]); wp[e * 3] = wp[b * 3] + S.t[0]; wp[e * 3 + 1] = wp[b * 3 + 1] + S.t[1]; wp[e * 3 + 2] = wp[b * 3 + 2] + S.t[2];
  const rex = wp[e * 3] - tx, rey = wp[e * 3 + 1] - ty, rez = wp[e * 3 + 2] - tz;
  return hyp3(rex, rey, rez); // reach error (0 unless the target was out of reach)
}

// ------------------------------------------------------------------ limit-respecting arm solve (damped least squares in the joint-limit variables)
// Variables v = [a, b, c, theta]: the upper arm's intrinsic XYZ Euler angles (radians, boxed by the rig's limits) and the elbow hinge angle (boxed by the forearm's x limits). The hand joint position is
//   H(v) = A + P * R(a,b,c) * (av + Rx(theta) * vv)   (A = shoulder joint, P = the clavicle's world rotation, av / vv the rest offsets of the elbow and the hand)
// Minimising |H - target| under the box is a projected damped-least-squares loop warm-started from the previous call (ch.v), so the solution is continuous in time, honours every limit by construction and, if the
// target is outside the reachable set, lands on the closest reachable point (the reach error returned). The swivel angle of the solution is written back to ch.lastAbs so that the closed-form path can take over again.
const DV = new Float64Array(4), DJ = new Float64Array(12), DE = new Float64Array(3), DH = new Float64Array(3), DQ = new Float64Array(4), DQ2 = new Float64Array(4), DQ3 = new Float64Array(4), DV3 = new Float64Array(3), DLO = new Float64Array(4), DHI = new Float64Array(4), DV2 = new Float64Array(4), DV3x = new Float64Array(3), DP = new Float64Array(4);
function armHand(ch, P, a0, a1, a2, th, out, A) {
  qeuler(DQ, 0, a0, a1, a2); qaxis(DQ2, 0, 1, 0, 0, th); qmul(DQ3, 0, DQ, 0, DQ2, 0);
  qrot(DV3, 0, DQ, 0, ch.av[0], ch.av[1], ch.av[2]); qrot(out, 0, DQ3, 0, ch.vv[0], ch.vv[1], ch.vv[2]); out[0] += DV3[0]; out[1] += DV3[1]; out[2] += DV3[2];
  qrot(DV3, 0, P, 0, out[0], out[1], out[2]); out[0] = A[0] + DV3[0]; out[1] = A[1] + DV3[1]; out[2] = A[2] + DV3[2];
}
export function solveArmLimited(rig, ch, pose, fk, tx, ty, tz, maxIter = 40) {
  const { wq, wp } = fk, a = ch.a, b = ch.b, e = ch.e, par = rig.parent[a], lim = rig.limits; const P = DP; P[0] = wq[par * 4]; P[1] = wq[par * 4 + 1]; P[2] = wq[par * 4 + 2]; P[3] = wq[par * 4 + 3];
  const A = [wp[a * 3], wp[a * 3 + 1], wp[a * 3 + 2]];
  for (let k = 0; k < 3; k++) { DLO[k] = lim[a * 6 + k * 2] * D2R; DHI[k] = lim[a * 6 + k * 2 + 1] * D2R; } DLO[3] = lim[b * 6] * D2R; DHI[3] = lim[b * 6 + 1] * D2R;
  DLO[0] = Math.max(DLO[0], -179.5 * D2R); DHI[0] = Math.min(DHI[0], 179.5 * D2R); DLO[2] = Math.max(DLO[2], -179.5 * D2R); DHI[2] = Math.min(DHI[2], 179.5 * D2R);
  DLO[1] = Math.max(DLO[1], -88.5 * D2R); DHI[1] = Math.min(DHI[1], 88.5 * D2R);   // keep clear of the Euler singularity at +-90 degrees (the decomposition would reassign the other two angles)
  const v = DV; if (ch.v) { for (let k = 0; k < 4; k++) v[k] = ch.v[k]; } else { qtoEuler(DE, pose.rot, a * 4); v[0] = DE[0]; v[1] = DE[1]; v[2] = DE[2]; v[3] = 2 * Math.atan2(pose.rot[b * 4], pose.rot[b * 4 + 3]); }
  for (let k = 0; k < 4; k++) v[k] = clamp(v[k], DLO[k], DHI[k]);
  const H = DH; let err = 1e9; const eps = 1e-4; const fr = [1, 1, 1, 1];
  for (let it = 0; it < maxIter; it++) {
    armHand(ch, P, v[0], v[1], v[2], v[3], H, A); DE[0] = tx - H[0]; DE[1] = ty - H[1]; DE[2] = tz - H[2]; err = hyp3(DE[0], DE[1], DE[2]); if (err < 0.0004) break;
    for (let k = 0; k < 4; k++) { DV2[0] = v[0]; DV2[1] = v[1]; DV2[2] = v[2]; DV2[3] = v[3]; DV2[k] += eps; armHand(ch, P, DV2[0], DV2[1], DV2[2], DV2[3], DV3x, A); DJ[k] = (DV3x[0] - H[0]) / eps; DJ[4 + k] = (DV3x[1] - H[1]) / eps; DJ[8 + k] = (DV3x[2] - H[2]) / eps; }
    fr[0] = fr[1] = fr[2] = fr[3] = 1;
    for (let pass = 0; pass < 3; pass++) { // variables pinned on a bound whose step would push them outside are frozen and the step is solved again with the remaining ones
      const lam2 = 0.0004 + 0.02 * Math.min(1, err * err * 25);
      let m00 = lam2, m01 = 0, m02 = 0, m11 = lam2, m12 = 0, m22 = lam2;
      for (let k = 0; k < 4; k++) { if (!fr[k]) continue; const j0 = DJ[k], j1 = DJ[4 + k], j2 = DJ[8 + k]; m00 += j0 * j0; m01 += j0 * j1; m02 += j0 * j2; m11 += j1 * j1; m12 += j1 * j2; m22 += j2 * j2; }
      const c00 = m11 * m22 - m12 * m12, c01 = m02 * m12 - m01 * m22, c02 = m01 * m12 - m02 * m11, det = m00 * c00 + m01 * c01 + m02 * c02; if (Math.abs(det) < 1e-18) break;
      const c11 = m00 * m22 - m02 * m02, c12 = m01 * m02 - m00 * m12, c22 = m00 * m11 - m01 * m01;                    // adjugate of the symmetric matrix
      const y0 = (c00 * DE[0] + c01 * DE[1] + c02 * DE[2]) / det, y1 = (c01 * DE[0] + c11 * DE[1] + c12 * DE[2]) / det, y2 = (c02 * DE[0] + c12 * DE[1] + c22 * DE[2]) / det;
      let again = false; for (let k = 0; k < 4; k++) { if (!fr[k]) { DV2[k] = 0; continue; } let d = DJ[k] * y0 + DJ[4 + k] * y1 + DJ[8 + k] * y2; if (d > 0.3) d = 0.3; else if (d < -0.3) d = -0.3; DV2[k] = d; if ((v[k] <= DLO[k] + 1e-9 && d < 0) || (v[k] >= DHI[k] - 1e-9 && d > 0)) { fr[k] = 0; again = true; } }
      if (!again) break;
    }
    let moved = 0; for (let k = 0; k < 4; k++) { const nv = clamp(v[k] + DV2[k], DLO[k], DHI[k]); moved += Math.abs(nv - v[k]); v[k] = nv; } if (moved < 1e-7) break;
  }
  armHand(ch, P, v[0], v[1], v[2], v[3], H, A); err = hyp3(tx - H[0], ty - H[1], tz - H[2]);
  // write the solution: local rotations and world transforms of the two bones
  qeuler(DQ, 0, v[0], v[1], v[2]); const ra = a * 4, rb = b * 4; pose.rot[ra] = DQ[0]; pose.rot[ra + 1] = DQ[1]; pose.rot[ra + 2] = DQ[2]; pose.rot[ra + 3] = DQ[3]; qmul(wq, ra, P, 0, DQ, 0);
  qaxis(DQ2, 0, 1, 0, 0, v[3]); pose.rot[rb] = DQ2[0]; pose.rot[rb + 1] = DQ2[1]; pose.rot[rb + 2] = DQ2[2]; pose.rot[rb + 3] = DQ2[3]; qmul(wq, rb, wq, ra, DQ2, 0);
  qrot(DV3, 0, wq, ra, ch.av[0], ch.av[1], ch.av[2]); wp[b * 3] = A[0] + DV3[0]; wp[b * 3 + 1] = A[1] + DV3[1]; wp[b * 3 + 2] = A[2] + DV3[2];
  qrot(DV3, 0, wq, rb, ch.vv[0], ch.vv[1], ch.vv[2]); wp[e * 3] = wp[b * 3] + DV3[0]; wp[e * 3 + 1] = wp[b * 3 + 1] + DV3[1]; wp[e * 3 + 2] = wp[b * 3 + 2] + DV3[2];
  if (!ch.v) ch.v = new Float64Array(4); for (let k = 0; k < 4; k++) ch.v[k] = v[k];
  // swivel angle of the solution about the shoulder-to-hand axis (for the closed-form tracker): the twist of q_ua * q1^-1, q1 aiming the bent rest shape at the achieved hand direction
  { const dx = wp[e * 3] - A[0], dy = wp[e * 3 + 1] - A[1], dz = wp[e * 3 + 2] - A[2], dl = hyp3(dx, dy, dz) || 1e-9, Tx = dx / dl, Ty = dy / dl, Tz = dz / dl;
    qaxis(DQ2, 0, 1, 0, 0, v[3]); qrot(DV3, 0, DQ2, 0, ch.vv[0], ch.vv[1], ch.vv[2]); const hx = ch.av[0] + DV3[0], hy = ch.av[1] + DV3[1], hz = ch.av[2] + DV3[2], hl = hyp3(hx, hy, hz) || 1e-9;
    qfromTo(DQ3, 0, hx / hl, hy / hl, hz / hl, Tx, Ty, Tz); qconj(DQ2, 0, DQ3, 0); qmul(DQ, 0, wq, ra, DQ2, 0);
    ch.lastAbs = 2 * Math.atan2(DQ[0] * Tx + DQ[1] * Ty + DQ[2] * Tz, DQ[3]); }
  return err;
}
// set a bone's world rotation (e.g. a foot or a hand) given the desired world quaternion: writes the local rotation and the world quat
export function setWorldRot(rig, pose, fk, bone, qx, qy, qz, qw) {
  const par = rig.parent[bone]; S.tmp[0] = qx; S.tmp[1] = qy; S.tmp[2] = qz; S.tmp[3] = qw;
  qconj(S.qp, 0, fk.wq, par * 4); qmul(S.q1, 0, S.qp, 0, S.tmp, 0); qnorm(S.q1, 0);
  const o = bone * 4; pose.rot[o] = S.q1[0]; pose.rot[o + 1] = S.q1[1]; pose.rot[o + 2] = S.q1[2]; pose.rot[o + 3] = S.q1[3];
  fk.wq[o] = S.tmp[0]; fk.wq[o + 1] = S.tmp[1]; fk.wq[o + 2] = S.tmp[2]; fk.wq[o + 3] = S.tmp[3];
}
export { qeuler };
