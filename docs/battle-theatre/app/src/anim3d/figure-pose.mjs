// The pose specification language and its solver for the human rig.
// A clip is authored as a function (t -> Spec) (gaits) or as keys over Spec channels (drill motions). The solver turns one Spec into one clip FRAME:
//  * the body (pelvis, spine, neck, head, jaw, clavicles) from Euler angles, the pelvis from an offset;
//  * the legs by hinge IK to ankle targets (planting is therefore exact), the feet by absolute orientation, toes by an angle;
//  * the props (the long arm = prop_long, a second prop = prop_sword / prop_pole / prop_instr) from a position and a pitch / yaw / roll;
//  * the arms by hinge IK to hand targets that blend between a free position and a grip point on prop A or prop B (the palm socket of the rig is put on the grip point: attachment error < 1 mm unless out of reach);
//  * the fingers by the grip scalars (closing), and the contact flags and root motion as extras.
// HAND-ANCHORED PROPS (channel `hold`, 1 = the second prop B, 2 = the long arm A): the prop's pose is DERIVED from the hand targets (rhp, lhp, in the root frame or, with hfr > 0, the chest frame) after the targets have been brought inside the
// reach annulus of their arms; the right grip is at distance rhgb (rhga) from the prop's origin, the left grip at that distance less the hand spacing; the axis runs from the left to the right hand (one-handed: the direction of `ba`).
// A hold clip therefore never asks the arms for a point they cannot reach, and the prop is never dragged: the distance by which a hand target had to be moved is recorded (out.holdClampL/R) and tested (authoring error, not hidden).
// GROUND-AWARE POSING (channel `gnd` = the clearance in metres, 0 = off): the long arm (and the ramrod when it is drawn) never goes below the ground plane of the character frame (y = 0, the plane the feet stand on), and a hand never goes below it
// either; a prop that would is lifted rigidly, after every pull pass, so the hands' pull cannot take it back into the ground; what the arms cannot then reach stays unreached (the grip error is reported).
// Angles are DEGREES in the specs. Positions are metres in the root (character) frame: +x left, +y up, +z forward.
import { Rig, solveHinge, solveArmLimited, setWorldRot, SOLVE_STATE } from './rig.mjs';
import { qeuler, qmul, qrot, qaxis, qident, qcopy, qtoEuler, D2R, clamp, lerp, hyp3, hyp4 } from './qmath.mjs';

export const CH = {}; // channel name -> [offset, length]
let _o = 0; const def = (name, len = 1) => { CH[name] = [_o, len]; _o += len; };
['pel:3', 'pelE:3', 'spE:3', 'nkE:3', 'hdE:3', 'jaw:1', 'lcl:3', 'rcl:3', 'fl:3', 'fr:3', 'fle:3', 'fre:3', 'tl:1', 'tr:1', 'rp:3', 'ra:3', 'bp:3', 'ba:3',
  'lhwa:1', 'lhwb:1', 'lhga:1', 'lhgb:1', 'lhp:3', 'lhe:3', 'rhwa:1', 'rhwb:1', 'rhga:1', 'rhgb:1', 'rhp:3', 'rhe:3', 'lep:3', 'rep:3', 'lcont:1', 'rcont:1', 'root:3', 'lfist:1', 'rfist:1', 'hold:1', 'gnd:1', 'lpole:3', 'rpole:3', 'rref:1', 'rfr:1', 'bref:1', 'bfr:1', 'hfr:1', 'rootE:3', 'rootT:3', 'ffr:1'].forEach(s => { const [n, l] = s.split(':'); def(n, +l); });
export const SPEC_LEN = _o;
export const CHANNEL_NAMES = Object.keys(CH);

// geometry of the props (metres, along the prop's +y axis from its origin). The long arm is the M1861 rifle-musket (weapons.json: overall 56 in = 1.42 m, barrel 40 in); the grip positions are an INFERRED layout of that arm
// (small of the stock about 0.30 m from the butt toe, lower band about 0.85 m): the rig file's long_arm_sockets disagree with these proportions (REQUEST to FIGURES in ANIM3D-NOTES).
export const PROPS = {
  rifle: { length: 1.42, wrist: 0.30, guard: 0.36, lower_band: 0.85, upper_band: 1.15, muzzle: 1.42, ramrod_head: 1.30, lock: 0.46, bayonet_tip: 1.80, tier: 'inferred', basis: 'kit/weapons.json m1861_springfield overall_in 56, barrel_in 40; positions along the stock are inferred, not measured' },
  staff: { length: 2.0, tier: 'plausible-procedural' },
  ramrod: { length: 0.96, stowedY: 1.36, stowedZ: 0.025, tier: 'inferred', basis: 'a rifle-musket ramrod is about as long as the barrel less the head; the exact length is not in the acquired texts' },
};

export class Spec {
  constructor() { this.v = new Float64Array(SPEC_LEN); this.reset(); }
  reset() { this.v.fill(0); this.set('lep', 0, -0.3, -1); this.set('rep', 0, -0.3, -1); this.set('lpole', 0, 0, 1); this.set('rpole', 0, 0, 1); this.set('fle', 0, 30, 0); this.set('fre', 0, -30, 0); return this; }
  set(name, ...vals) { const [o, l] = CH[name]; for (let i = 0; i < l; i++) this.v[o + i] = vals[i] ?? 0; return this; }
  get(name, i = 0) { return this.v[CH[name][0] + i]; }
  copyFrom(other) { this.v.set(other.v); return this; }
}

const CQ0 = new Float64Array(4), E = new Float64Array(4), E2 = new Float64Array(4), Q = new Float64Array(4), V = new Float64Array(3), PQ = new Float64Array(4);
const qE = (out, o, x, y, z) => qeuler(out, o, x * D2R, y * D2R, z * D2R);

// prop transform: R = Ry(yaw) * Rx(pitch) * Ry(roll): barrel direction = Ry(yaw) Rx(pitch) (0,1,0); pitch 0 = vertical, 90 = pointing forward (+z); yaw + turns the muzzle toward +x (the figure's left); roll about the barrel
function propQuat(out, o, pitch, yaw, roll) {
  qaxis(E, 0, 0, 1, 0, yaw * D2R); qaxis(E2, 0, 1, 0, 0, pitch * D2R); qmul(Q, 0, E, 0, E2, 0); qaxis(E, 0, 0, 1, 0, roll * D2R); qmul(out, o, Q, 0, E, 0);
}

// clamp a bone's local Euler angles to the rig's limits (used for the feet, whose world orientation is authored) and refresh its world quaternion
const CE = new Float64Array(3), CQ = new Float64Array(4);
function clampLocal(rig, pose, fk, b) {
  const l = b * 6; if (Number.isNaN(rig.limits[l])) return; qtoEuler(CE, pose.rot, b * 4); let ch = false;
  for (let a = 0; a < 3; a++) { const d = CE[a] / D2R, lo = rig.limits[l + a * 2], hi = rig.limits[l + a * 2 + 1]; const c = Math.min(hi, Math.max(lo, d)); if (c !== d) { CE[a] = c * D2R; ch = true; } }
  if (!ch) return; qeuler(CQ, 0, CE[0], CE[1], CE[2]); const o = b * 4; pose.rot[o] = CQ[0]; pose.rot[o + 1] = CQ[1]; pose.rot[o + 2] = CQ[2]; pose.rot[o + 3] = CQ[3]; qmul(fk.wq, o, fk.wq, rig.parent[b] * 4, pose.rot, o);
}
// clavicle assist candidates (degrees added to the authored clavicle Euler angles), nearest to the authored pose first
const CL_CANDS = []; for (const dx of [0, 12, -12]) for (const dz of [0, 15, -8]) for (const dy of [0, 10, -10]) if (dx || dy || dz) CL_CANDS.push([dx, dy, dz]);
CL_CANDS.sort((a, b) => Math.abs(a[0]) + Math.abs(a[1]) + Math.abs(a[2]) - Math.abs(b[0]) - Math.abs(b[1]) - Math.abs(b[2]));
export class HumanSolver {
  constructor(rig) {
    this.rig = rig; this.pose = rig.newPose(); this.fk = rig.newFK(); this.frame = rig.newFrame();
    const I = rig.index; this.I = I;
    this.spineW = [I.spine1, I.spine2, I.spine3]; this.propA = I.prop_long; this.propBs = { prop_sword: I.prop_sword, prop_pole: I.prop_pole, prop_instr: I.prop_instr };
    this.restHead = b => [rig.head[b * 3], rig.head[b * 3 + 1], rig.head[b * 3 + 2]];
    this.sockR = rig.socket.grip_R, this.sockL = rig.socket.grip_L;
    this.qa = new Float64Array(4); this.qb = new Float64Array(4); this.handQ = new Float64Array(4); this.out = { reachErrL: 0, reachErrR: 0, gripErrL: 0, gripErrR: 0, excessL: 0, excessR: 0, freeErrL: 0, freeErrR: 0, propShiftA: 0, propShiftB: 0 };
    this.sc = { Ra: new Float64Array(4), Rb: new Float64Array(4) }; this.E3 = new Float64Array(3); this.noPull = false; this.holdTgt = [new Float64Array(3), new Float64Array(3)]; this.holdAuth = [new Float64Array(3), new Float64Array(3)]; this.holdTr = new Float64Array(6); this.palm = [new Float64Array(3), new Float64Array(3)]; this.holdLg = 0; this.holdOn = false; this.holdArm = [Math.hypot(0.305, 0.255), 0]; this.out.holdClampL = 0; this.out.holdClampR = 0;   // noPull: diagnostic mode, the hands never move the prop (the authored prop path is kept; the grip error is then the authored path's reach shortfall)
  }
  // One arm, limit-aware (G6) and continuous from frame to frame. 1) the closed-form swivel solve of solveHinge, restricted to a swivel within 12 degrees of the previous frame's; if its shoulder Euler angles are inside the rig's limits
  // it is exact and is used (the elbow follows the authored pole). 2) otherwise solveArmLimited: a projected damped-least-squares solve in the limit variables (upper-arm Euler angles inside their box, elbow inside its range),
  // warm-started from the previous frame, which keeps every limit and lands on the closest reachable hand position (the shortfall is returned as the reach error, and the caller pulls the gripped prop to the hand: a hand never
  // leaves the piece, the piece goes where the hands can hold it). This.out.excessL/R = remaining limit excess (always 0 on return from the limited path).
  solveArm(ch, side, hx, hy, hz, T, pose, fk, g) {
    const rig = this.rig, TOL = 0.02; SOLVE_STATE.jump = false; SOLVE_STATE.win = 12; const laIn = ch.lastAbs, vIn = ch.v ? Float64Array.from(ch.v) : null;
    let err = solveHinge(rig, ch, pose, fk, hx, hy, hz, T[0], T[1], T[2]); let ex = SOLVE_STATE.excess;
    let accept = ex <= TOL, dist = 0;
    if (accept && vIn) { const a = ch.a, b = ch.b, E3 = this.E3; qtoEuler(E3, pose.rot, a * 4); const th = 2 * Math.atan2(pose.rot[b * 4], pose.rot[b * 4 + 3]); // a closed-form answer that is far from the previous frame's joint angles would be a pop: the continuous limited solve takes over
      dist = Math.max(Math.abs(E3[0] - vIn[0]), Math.abs(E3[1] - vIn[1]), Math.abs(E3[2] - vIn[2]), Math.abs(th - vIn[3])); if (dist > (ch.mode === 1 ? 0.03 : 0.4)) accept = false; }   // sticky: once the limited solve has taken over (the arm is at a limit) the closed form only retakes it when it agrees to within 2 degrees
    const cfFeasible = ex <= TOL;
    if (accept) { // exact and inside the limits: remember the Euler variables for the limited path
      ch.mode = 0;
      const a = ch.a, b = ch.b, E3 = this.E3; qtoEuler(E3, pose.rot, a * 4); if (!ch.v) ch.v = new Float64Array(4); ch.v[0] = E3[0]; ch.v[1] = E3[1]; ch.v[2] = E3[2]; ch.v[3] = 2 * Math.atan2(pose.rot[b * 4], pose.rot[b * 4 + 3]);
    } else {
      ch.lastAbs = laIn; if (vIn) ch.v = vIn; else if (ch.v == null) { const a = ch.a, b = ch.b, E3 = this.E3; qtoEuler(E3, pose.rot, a * 4); ch.v = Float64Array.of(E3[0], E3[1], E3[2], 2 * Math.atan2(pose.rot[b * 4], pose.rot[b * 4 + 3])); }
      ch.mode = 1; err = solveArmLimited(rig, ch, pose, fk, hx, hy, hz); ex = 0;
      if (err > 0.003 && cfFeasible && dist < 0.3) { // the limited solve is stuck on a bound short of a target that the closed form reaches exactly, and the closed form is near: take it
        ch.lastAbs = laIn; SOLVE_STATE.win = 12; err = solveHinge(rig, ch, pose, fk, hx, hy, hz, T[0], T[1], T[2]); const a = ch.a, b = ch.b, E3 = this.E3; qtoEuler(E3, pose.rot, a * 4); ch.v[0] = E3[0]; ch.v[1] = E3[1]; ch.v[2] = E3[2]; ch.v[3] = 2 * Math.atan2(pose.rot[b * 4], pose.rot[b * 4 + 3]); ch.mode = 0; }
    }
    if (side === 'L') this.out.excessL = ex; else this.out.excessR = ex; return err;
  }
  // solve one Spec into this.frame (also leaves this.pose / this.fk valid). propB: name of the second prop bone for this clip.
  solve(spec, propB = 'prop_sword') {
    const rig = this.rig, I = this.I, pose = this.pose, fk = this.fk, v = spec.v, c = CH, rot = pose.rot, tr = pose.trans, out = this.out;
    // reset
    for (let i = 0; i < rig.n; i++) { const o = i * 4; rot[o] = rot[o + 1] = rot[o + 2] = 0; rot[o + 3] = 1; } tr.fill(0);
    const g = (name, i = 0) => v[c[name][0] + i];
    const wRot = (bone, x, y, z) => { qE(E, 0, x, y, z); const o = bone * 4; rot[o] = E[0]; rot[o + 1] = E[1]; rot[o + 2] = E[2]; rot[o + 3] = E[3]; };
    // root (whole-body rotation for lying down) and body
    wRot(0, g('rootE', 0), g('rootE', 1), g('rootE', 2)); tr[0] = g('rootT', 0); tr[1] = g('rootT', 1); tr[2] = g('rootT', 2);
    tr[rig.transSlot[I.pelvis] * 3] = g('pel', 0); tr[rig.transSlot[I.pelvis] * 3 + 1] = g('pel', 1); tr[rig.transSlot[I.pelvis] * 3 + 2] = g('pel', 2);
    wRot(I.pelvis, g('pelE', 0), g('pelE', 1), g('pelE', 2));
    // pelvis spill (G6): a pelvis pitch / yaw / roll beyond the pelvis joint's limits (prone fire, lying down) is split: the pelvis keeps the limit, the remainder turns the whole body about the pelvis joint through the root bone,
    // so the world pose is exactly the authored one but every limited joint stays inside its range
    { const lp = I.pelvis * 6, lim = rig.limits; if (!Number.isNaN(lim[lp])) { const pe0 = g('pelE', 0), pe1 = g('pelE', 1), pe2 = g('pelE', 2), c0 = clamp(pe0, lim[lp], lim[lp + 1]), c1 = clamp(pe1, lim[lp + 2], lim[lp + 3]), c2 = clamp(pe2, lim[lp + 4], lim[lp + 5]);
      if (c0 !== pe0 || c1 !== pe1 || c2 !== pe2) { const pk = rig.transSlot[I.pelvis] * 3, L = rig.local, ox = L[I.pelvis * 3] + tr[pk], oy = L[I.pelvis * 3 + 1] + tr[pk + 1], oz = L[I.pelvis * 3 + 2] + tr[pk + 2];
        qrot(V, 0, rot, 0, ox, oy, oz); const Px = tr[0] + V[0], Py = tr[1] + V[1], Pz = tr[2] + V[2];     // world position of the pelvis joint with the authored root
        qE(E, 0, pe0, pe1, pe2); qE(E2, 0, c0, c1, c2); E2[0] = -E2[0]; E2[1] = -E2[1]; E2[2] = -E2[2]; qmul(Q, 0, E, 0, E2, 0);       // extra = authored pelvis * clamped pelvis^-1
        qmul(PQ, 0, rot, 0, Q, 0); rot[0] = PQ[0]; rot[1] = PQ[1]; rot[2] = PQ[2]; rot[3] = PQ[3]; qE(E, 0, c0, c1, c2); const po = I.pelvis * 4; rot[po] = E[0]; rot[po + 1] = E[1]; rot[po + 2] = E[2]; rot[po + 3] = E[3];
        qrot(V, 0, rot, 0, ox, oy, oz); tr[0] = Px - V[0]; tr[1] = Py - V[1]; tr[2] = Pz - V[2]; } } }
    const sw = [0.30, 0.35, 0.35]; for (let k = 0; k < 3; k++) wRot(this.spineW[k], g('spE', 0) * sw[k], g('spE', 1) * sw[k], g('spE', 2) * sw[k]);
    wRot(I.neck, g('nkE', 0) * 0.5, g('nkE', 1) * 0.5, g('nkE', 2) * 0.5); wRot(I.head, g('hdE', 0) + g('nkE', 0) * 0.5, g('hdE', 1) + g('nkE', 1) * 0.5, g('hdE', 2) + g('nkE', 2) * 0.5);
    wRot(I.jaw, g('jaw'), 0, 0); wRot(I.clavicle_L, g('lcl', 0), g('lcl', 1), g('lcl', 2)); wRot(I.clavicle_R, g('rcl', 0), g('rcl', 1), g('rcl', 2));
    // props: position and orientation, in the root frame (frame weight 0) or in the chest (spine3) frame (weight 1); the position given is that of the point at distance `ref` along the prop from its origin
    rig.fk(pose, fk);
    const AO = new Float64Array(3), AQ = new Float64Array(4); // prop A world origin and rotation (used by prop B in rifle-frame mode)
    const setProp = (bone, p0, a0, refName, frName, isB, ov = null) => {
      const k = rig.transSlot[bone] * 3, h = this.restHead(bone), fr = ov ? ov.fr : g(frName), ref = ov ? ov.ref : g(refName); if (ov) propQuat(E2, 0, ov.a[0], ov.a[1], ov.a[2]); else propQuat(E2, 0, g(a0, 0), g(a0, 1), g(a0, 2));
      let px = ov ? ov.p[0] : g(p0, 0), py = ov ? ov.p[1] : g(p0, 1), pz = ov ? ov.p[2] : g(p0, 2); const cq = I.spine3 * 4, cp = I.spine3 * 3;
      if (isB && fr > 1.5) { // rifle frame: position and orientation relative to prop A
        qrot(V, 0, AQ, 0, px, py, pz); px = AO[0] + V[0]; py = AO[1] + V[1]; pz = AO[2] + V[2]; qmul(Q, 0, AQ, 0, E2, 0); E2[0] = Q[0]; E2[1] = Q[1]; E2[2] = Q[2]; E2[3] = Q[3];
      } else if (fr > 0) { qrot(V, 0, fk.wq, cq, px, py, pz); const wx = fk.wp[cp] + V[0], wy = fk.wp[cp + 1] + V[1], wz = fk.wp[cp + 2] + V[2]; px = px * (1 - fr) + wx * fr; py = py * (1 - fr) + wy * fr; pz = pz * (1 - fr) + wz * fr;
        qmul(Q, 0, fk.wq, cq, E2, 0); const dot = Q[0] * E2[0] + Q[1] * E2[1] + Q[2] * E2[2] + Q[3] * E2[3], sg = dot < 0 ? -1 : 1, s0 = 1 - fr; for (let i = 0; i < 4; i++) E2[i] = E2[i] * s0 + Q[i] * fr * sg; const l = hyp4(E2[0], E2[1], E2[2], E2[3]); for (let i = 0; i < 4; i++) E2[i] /= l; }
      qrot(V, 0, E2, 0, 0, ref, 0); px -= V[0]; py -= V[1]; pz -= V[2]; // origin = reference point - ref along the prop axis
      if (!isB) { AO[0] = px; AO[1] = py; AO[2] = pz; AQ[0] = E2[0]; AQ[1] = E2[1]; AQ[2] = E2[2]; AQ[3] = E2[3]; }
      // props hang under the root bone: convert the world position and rotation to the root's local frame (the root is rotated for lying and facing)
      let lx = px, ly = py, lz = pz; const RQ = fk.wq; if (RQ[0] !== 0 || RQ[1] !== 0 || RQ[2] !== 0) { CQ0[0] = -RQ[0]; CQ0[1] = -RQ[1]; CQ0[2] = -RQ[2]; CQ0[3] = RQ[3]; qrot(V, 0, CQ0, 0, px - fk.wp[0], py - fk.wp[1], pz - fk.wp[2]); lx = V[0]; ly = V[1]; lz = V[2]; qmul(Q, 0, CQ0, 0, E2, 0); E2[0] = Q[0]; E2[1] = Q[1]; E2[2] = Q[2]; E2[3] = Q[3]; }
      else { lx = px - fk.wp[0]; ly = py - fk.wp[1]; lz = pz - fk.wp[2]; }
      tr[k] = lx - h[0]; tr[k + 1] = ly - h[1]; tr[k + 2] = lz - h[2]; const o = bone * 4; rot[o] = E2[0]; rot[o + 1] = E2[1]; rot[o + 2] = E2[2]; rot[o + 3] = E2[3];
    };
    const pb = this.propBs[propB]; this.holdOn = false; out.holdClampL = 0; out.holdClampR = 0;
    const H = { on: g('hold') > 0.5, A: g('hold') > 1.5, rg: 0, wl: 0, lgAuth: 0 }; H.rg = H.A ? g('rhga') : g('rhgb'); H.wl = H.A ? g('lhwa') : g('lhwb'); H.lgAuth = H.A ? g('lhga') : g('lhgb');
    const gnd = g('gnd'), GP_A = [0, 0.35, 0.7, 1.05, 1.42], GP_B = [0, 0.48, 0.96], GV = new Float64Array(3);
    const enforceGround = () => { // lift the long arm / the ramrod rigidly until none of its sample points is below `gnd`
      if (!(gnd > 0)) return false; let moved = false;
      for (const [bone, pts, slot] of [[this.propA, GP_A, rig.transSlot[this.propA] * 3], [pb === this.propBs.prop_pole ? pb : -1, GP_B, pb === this.propBs.prop_pole ? rig.transSlot[pb] * 3 : 0]]) {
        if (bone < 0) continue; let miny = 1e9; for (let i = 0; i < pts.length; i++) { qrot(GV, 0, fk.wq, bone * 4, 0, pts[i], 0); const y = fk.wp[bone * 3 + 1] + GV[1]; if (y < miny) miny = y; }
        if (miny < gnd) { let dx = 0, dy = gnd - miny, dz = 0; const R0 = fk.wq; if (R0[0] !== 0 || R0[1] !== 0 || R0[2] !== 0) { CQ0[0] = -R0[0]; CQ0[1] = -R0[1]; CQ0[2] = -R0[2]; CQ0[3] = R0[3]; qrot(GV, 0, CQ0, 0, 0, dy, 0); dx = GV[0]; dy = GV[1]; dz = GV[2]; }
          tr[slot] += dx; tr[slot + 1] += dy; tr[slot + 2] += dz; if (bone === this.propA && pb !== this.propBs.prop_pole) { const sp = rig.transSlot[this.propBs.prop_pole] * 3; tr[sp] += dx; tr[sp + 1] += dy; tr[sp + 2] += dz; } moved = true; rig.fk(pose, fk); } }
      return moved; };
    const holdProps = () => { // derive the pose of the held prop from the hand targets T and place it: the axis is the direction of ba / ra blended by the left hand's weight with the direction from one hand to the other (two hands: left -> right, or right -> left when the left grip is further along the prop, as on a rifle)
      const T = this.holdTgt, TL = T[0], TR = T[1], bpa = H.A ? 'ra' : 'ba', P = g(bpa, 0) * D2R, Y = g(bpa, 1) * D2R; let ax = Math.sin(P) * Math.sin(Y), ay = Math.cos(P), az = Math.sin(P) * Math.cos(Y), lg = H.lgAuth;
      let hx = TR[0] - TL[0], hy = TR[1] - TL[1], hz = TR[2] - TL[2]; const sp = Math.hypot(hx, hy, hz), wl = H.wl > 1 ? 1 : H.wl < 0 ? 0 : H.wl;
      if (wl > 0.001 && sp > 0.04) { const dist = H.lgAuth > H.rg, k = dist ? -1 / sp : 1 / sp; hx *= k; hy *= k; hz *= k; const sw = wl * wl * (3 - 2 * wl);
        ax += (hx - ax) * sw; ay += (hy - ay) * sw; az += (hz - az) * sw; const al = Math.hypot(ax, ay, az) || 1; ax /= al; ay /= al; az /= al; lg = H.lgAuth + ((dist ? H.rg + sp : Math.max(0, H.rg - sp)) - H.lgAuth) * sw; }
      const pitch = Math.acos(Math.max(-1, Math.min(1, ay))) / D2R, yaw = Math.atan2(ax, az) / D2R; this.holdLg = lg;
      const ov = { fr: 0, ref: H.rg, p: [TR[0], TR[1], TR[2]], a: [pitch, yaw, H.A ? g('ra', 2) : g('ba', 2)] };
      if (H.A) { setProp(this.propA, 'rp', 'ra', 'rref', 'rfr', false, ov); setProp(pb, 'bp', 'ba', 'bref', 'bfr', true); } else { setProp(this.propA, 'rp', 'ra', 'rref', 'rfr', false); setProp(pb, 'bp', 'ba', 'bref', 'bfr', true, ov); }
      const kA = rig.transSlot[this.propA] * 3, kB = rig.transSlot[pb] * 3; for (let q = 0; q < 3; q++) { this.holdTr[q] = tr[kA + q]; this.holdTr[3 + q] = tr[kB + q]; }
    };
    if (H.on) { // the prop follows the hands (see the header)
      const hf = g('hfr'), ARM_MIN = 0.30, ARM_MAX = 0.52, T = this.holdTgt, T0 = this.holdAuth; this.holdOn = true;
      for (let sd = 0; sd < 2; sd++) { const nm = sd ? 'rhp' : 'lhp', ch = rig.chains[sd ? 'arm_R' : 'arm_L'], t = T[sd];
        let hx = g(nm, 0), hy = g(nm, 1), hz = g(nm, 2); if (hf > 0) { qrot(V, 0, fk.wq, I.spine3 * 4, hx, hy, hz); hx = hx * (1 - hf) + (fk.wp[I.spine3 * 3] + V[0]) * hf; hy = hy * (1 - hf) + (fk.wp[I.spine3 * 3 + 1] + V[1]) * hf; hz = hz * (1 - hf) + (fk.wp[I.spine3 * 3 + 2] + V[2]) * hf; }
        T0[sd][0] = hx; T0[sd][1] = hy; T0[sd][2] = hz;
        const sx = fk.wp[ch.a * 3], sy_ = fk.wp[ch.a * 3 + 1], sz = fk.wp[ch.a * 3 + 2]; let dx = hx - sx, dy = hy - sy_, dz = hz - sz; const gw = sd ? (H.A ? g('rhwa') : g('rhwb')) : H.wl, d = Math.hypot(dx, dy, dz) || 1e-9, dc = gw <= 0.05 ? d : d < ARM_MIN ? ARM_MIN : d > ARM_MAX ? ARM_MAX : d, k = dc / d;       // only a hand that grips is brought inside the annulus
        t[0] = sx + dx * k; t[1] = sy_ + dy * k; t[2] = sz + dz * k; if (sd) out.holdClampR = Math.abs(dc - d); else out.holdClampL = Math.abs(dc - d); }
      holdProps();
    } else { setProp(this.propA, 'rp', 'ra', 'rref', 'rfr', false); setProp(pb, 'bp', 'ba', 'bref', 'bfr', true); }
    if (pb !== this.propBs.prop_pole) setProp(this.propBs.prop_pole, null, null, null, null, true, { fr: 2, ref: 0, p: [0, PROPS.ramrod.stowedY, PROPS.ramrod.stowedZ], a: [180, 0, 0] });   // the ramrod is stowed under the barrel whenever a clip does not use it (continuity across clips; pinned to the rifle)
    rig.fk(pose, fk);
    enforceGround();
    const wq = fk.wq, wp = fk.wp;
    // legs
    const Lb = [['leg_L', 'fl', 'fle', 'tl', I.foot_L, I.toe_L], ['leg_R', 'fr', 'fre', 'tr', I.foot_R, I.toe_R]];
    for (const [cn, fp, fe, tn, fb, tb] of Lb) {
      const ch = rig.chains[cn]; const fy = g(fe, 1) * D2R, pn = cn === 'leg_L' ? 'lpole' : 'rpole';
      // knee pole: perpendicular to the hip->ankle axis in the plane normal to the (yawed) pelvis side axis, so the knee leads forward and goes up when the thigh is raised; an explicit pole channel overrides
      const hxw = wp[ch.a * 3], hyw = wp[ch.a * 3 + 1], hzw = wp[ch.a * 3 + 2]; let Tx = g(fp, 0) - hxw, Ty = g(fp, 1) - hyw, Tz = g(fp, 2) - hzw; const Tl = hyp3(Tx, Ty, Tz) || 1; Tx /= Tl; Ty /= Tl; Tz /= Tl;
      qrot(V, 0, wq, I.pelvis * 4, Math.cos(fy), 0, -Math.sin(fy)); const sx = V[0], sy = V[1], sz = V[2];
      let pxx = Ty * sz - Tz * sy, pyy = Tz * sx - Tx * sz, pzz = Tx * sy - Ty * sx;
      if (Math.abs(g(pn, 0)) + Math.abs(g(pn, 1)) + Math.abs(g(pn, 2)) > 1e-6) { pxx = g(pn, 0); pyy = g(pn, 1); pzz = g(pn, 2); }
      // the foot: authored world orientation; if its local pitch would break the rig's limit, the foot is pitched less and the ankle target is recomputed so the contact point (heel when the toe is up, ball when it is down) stays where the plan put it
      let ax = g(fp, 0), ay = g(fp, 1), az = g(fp, 2), pw = g(fe, 0), cleaned = false;
      const ffr = g('ffr'); if (ffr > 0) { qrot(V, 0, wq, 0, ax, ay, az); ax = ax * (1 - ffr) + (wp[0] + V[0]) * ffr; ay = ay * (1 - ffr) + (wp[1] + V[1]) * ffr; az = az * (1 - ffr) + (wp[2] + V[2]) * ffr; }
      const off0 = pw < 0 ? -0.05 : 0.14; qE(E, 0, pw, g(fe, 1), g(fe, 2)); qrot(V, 0, E, 0, 0, -0.085, off0); const Px = ax + V[0], Py = ay + V[1], Pz = az + V[2];
      let bias = 0;
      for (let it = 0; it < 6; it++) {
        solveHinge(rig, ch, pose, fk, ax, ay, az, pxx, pyy, pzz, bias);
        qE(E, 0, pw, g(fe, 1), g(fe, 2)); if (ffr > 0) { qmul(Q, 0, wq, 0, E, 0); const dd = Q[0] * E[0] + Q[1] * E[1] + Q[2] * E[2] + Q[3] * E[3], sg = dd < 0 ? -1 : 1; for (let q = 0; q < 4; q++) E[q] = E[q] * (1 - ffr) + Q[q] * sg * ffr; const ll = hyp4(E[0], E[1], E[2], E[3]); for (let q = 0; q < 4; q++) E[q] /= ll; } setWorldRot(rig, pose, fk, fb, E[0], E[1], E[2], E[3]);
        qtoEuler(CE, pose.rot, fb * 4); const lx = CE[0] / D2R, ly = CE[1] / D2R, lo = rig.limits[fb * 6], hi = rig.limits[fb * 6 + 1], ylo = rig.limits[fb * 6 + 2], yhi = rig.limits[fb * 6 + 3];
        const yex = ly > yhi + 0.2 ? ly - yhi : ly < ylo - 0.2 ? ly - ylo : 0; if (yex !== 0) bias -= yex * 1.05 * D2R;           // twist the leg so the foot's own yaw is within its limit
        if (lx >= lo - 0.2 && lx <= hi + 0.2) { if (yex === 0) break; continue; }
        pw -= (lx > hi ? lx - hi : lx - lo) * 1.02; qE(E, 0, pw, g(fe, 1), g(fe, 2)); qrot(V, 0, E, 0, 0, -0.085, off0); ax = Px - V[0]; ay = Py - V[1]; az = Pz - V[2]; cleaned = true;
      }
      void cleaned; clampLocal(rig, pose, fk, fb);
      // toe: local x flexion; world transforms for the toe
      wRot(tb, g(tn), 0, 0); qmul(wq, tb * 4, wq, fb * 4, rot, tb * 4);
      const nbk = rig.local; wp[fb * 3] = wp[ch.e * 3]; // foot joint = chain end
      qrot(V, 0, wq, fb * 4, nbk[tb * 3], nbk[tb * 3 + 1], nbk[tb * 3 + 2]); wp[tb * 3] = wp[fb * 3] + V[0]; wp[tb * 3 + 1] = wp[fb * 3 + 1] + V[1]; wp[tb * 3 + 2] = wp[fb * 3 + 2] + V[2];
    }
    // arms: need the world data of the (possibly rotated) torso, the clavicles and the props. Recompute FK now that the torso is final (legs do not affect it).
    rig.fk(pose, fk);
    // re-apply the leg solution (fk recomputed from local rotations already written by solveHinge / setWorldRot, so nothing to redo)
    const A = this.sc.Ra, B = this.sc.Rb; // prop world quats
    const gripPoint = (bone, along, o) => { const k = bone * 3; qrot(V, 0, wq, bone * 4, 0, along, 0); o[0] = wp[k] + V[0]; o[1] = wp[k + 1] + V[1]; o[2] = wp[k + 2] + V[2]; };
    const T = new Float64Array(3), shA = [0, 0, 0, 0], shB = [0, 0, 0, 0], slA = rig.transSlot[this.propA] * 3, slB = rig.transSlot[pb] * 3, gp = [0, 0, 0];
    const tA0 = [tr[slA], tr[slA + 1], tr[slA + 2]], tB0 = [tr[slB], tr[slB + 1], tr[slB + 2]];
    if (!this.noPull) { const sh0 = rig.shiftMem; for (let k = 0; k < 3; k++) { tr[slA + k] += 0.7 * sh0[k]; tr[slB + k] += 0.7 * sh0[3 + k]; } rig.fk(pose, fk); }   // warm start: the previous frame's hand-pulled prop offset (decays 30 percent a frame unless still needed) keeps the solution continuous
    let bestGrip = 1e9, finalPass = false; const bestTr = new Float64Array(6);
    for (let pass = 0; pass < 18; pass++) {
    qcopy(A, 0, wq, this.propA * 4); qcopy(B, 0, wq, pb * 4); shA.fill(0); shB.fill(0); let worstGrip = 0;
    for (const side of ['L', 'R']) {
      const ch = rig.chains['arm_' + side], s = side.toLowerCase(), sock = side === 'L' ? this.sockL : this.sockR, hb = side === 'L' ? I.hand_L : I.hand_R, fb = side === 'L' ? I.forearm_L : I.forearm_R;
      const hA = this.holdOn && g('hold') > 1.5, hB = this.holdOn && !hA, wa = g(s + 'hwa'), wb = g(s + 'hwb'), gA = (hA && side === 'L') ? this.holdLg : g(s + 'hga'), gB = (hB && side === 'L') ? this.holdLg : g(s + 'hgb'), free = [g(s + 'hp', 0), g(s + 'hp', 1), g(s + 'hp', 2)], wrist = [g(s + 'he', 0), g(s + 'he', 1), g(s + 'he', 2)];
      const pl = g(s + 'ep', 0), p1 = g(s + 'ep', 1), p2 = g(s + 'ep', 2);
      // target for the palm socket
      const tgt = [0, 0, 0]; const wf = Math.max(0, 1 - wa - wb);
      const gA3 = [0, 0, 0], gB3 = [0, 0, 0]; if (wa > 0) gripPoint(this.propA, gA, gA3); if (wb > 0) gripPoint(pb, gB, gB3);
      if (g('hfr') > 0) { const hf = g('hfr'); qrot(V, 0, wq, I.spine3 * 4, free[0], free[1], free[2]); for (let k = 0; k < 3; k++) free[k] = free[k] * (1 - hf) + (wp[I.spine3 * 3 + k] + V[k]) * hf; }
      { // the hand moves between its free position and the grip on an ARC about the shoulder (direction slerped, distance lerped), so a hand going to the piece swings round the body instead of cutting through the chest or leaving the reach sphere
        const wg = wa + wb; const gm = [0, 0, 0]; if (wg > 1e-6) for (let k = 0; k < 3; k++) gm[k] = (gA3[k] * wa + gB3[k] * wb) / wg;
        const sx = wp[ch.a * 3], sy = wp[ch.a * 3 + 1], sz = wp[ch.a * 3 + 2], f0 = [free[0] - sx, free[1] - sy, free[2] - sz], g0 = [gm[0] - sx, gm[1] - sy, gm[2] - sz], fl = hyp3(f0[0], f0[1], f0[2]), gl = hyp3(g0[0], g0[1], g0[2]), u = clamp(wg, 0, 1);
        if (wg <= 1e-6) { for (let k = 0; k < 3; k++) tgt[k] = free[k]; } else if (u >= 1 - 1e-9 || fl < 1e-6 || gl < 1e-6) { for (let k = 0; k < 3; k++) tgt[k] = free[k] * (1 - u) + gm[k] * u; }
        else { const cs = clamp((f0[0] * g0[0] + f0[1] * g0[1] + f0[2] * g0[2]) / (fl * gl), -1, 1), om = Math.acos(cs), so = Math.sin(om), d = fl + (gl - fl) * u;
          if (so < 1e-4) { for (let k = 0; k < 3; k++) tgt[k] = free[k] * (1 - u) + gm[k] * u; } else { const c1 = Math.sin((1 - u) * om) / so, c2 = Math.sin(u * om) / so; tgt[0] = sx + (f0[0] / fl * c1 + g0[0] / gl * c2) * d; tgt[1] = sy + (f0[1] / fl * c1 + g0[1] / gl * c2) * d; tgt[2] = sz + (f0[2] / fl * c1 + g0[2] / gl * c2) * d; } } }
      if (gnd > 0 && tgt[1] < gnd) tgt[1] = gnd;      // a hand does not go below the ground either
      // palm socket offset in the hand frame; iterate twice because the hand orientation follows the forearm
      let handRot = null; const so = sock.offset;
      let err = 0;
      for (let it = 0; it < 3; it++) {
        // hand rotation estimate: forearm world rotation * wrist euler (it 0: the forearm of the pose so far)
        qE(E, 0, wrist[0], wrist[1], wrist[2]); qmul(this.handQ, 0, wq, fb * 4, E, 0);
        qrot(V, 0, this.handQ, 0, so[0], so[1], so[2]);
        const hx = tgt[0] - V[0], hy = tgt[1] - V[1], hz = tgt[2] - V[2];
        // pole in world: rotated by the spine3 world rotation so elbows follow the torso
        qrot(T, 0, wq, I.spine3 * 4, pl, p1, p2);
        err = this.solveArm(ch, side, hx, hy, hz, T, pose, fk, g); if (SOLVE_STATE.near && wf > 0.5) err = 0;          // a free hand held at the closest reach is not an error
        // hand bone: local wrist rotation relative to forearm, then update world transforms of forearm/hand
        const o = hb * 4; qE(E, 0, wrist[0], wrist[1], wrist[2]); rot[o] = E[0]; rot[o + 1] = E[1]; rot[o + 2] = E[2]; rot[o + 3] = E[3];
        qmul(wq, o, wq, fb * 4, rot, o);
      }
      if (side === 'L') out.reachErrL = err; else out.reachErrR = err;
      { const sdx = side === 'L' ? 0 : 1; qrot(V, 0, wq, hb * 4, so[0], so[1], so[2]); this.palm[sdx][0] = wp[hb * 3] + V[0]; this.palm[sdx][1] = wp[hb * 3 + 1] + V[1]; this.palm[sdx][2] = wp[hb * 3 + 2] + V[2]; }
      // grip attachment error: palm socket vs the target after solving
      qrot(V, 0, wq, hb * 4, so[0], so[1], so[2]); const px = wp[hb * 3] + V[0], py = wp[hb * 3 + 1] + V[1], pz = wp[hb * 3 + 2] + V[2];
      let ge = hyp3(px - tgt[0], py - tgt[1], pz - tgt[2]); if (wf > 0.5 && SOLVE_STATE.near) ge = 0; const gripping = wa + wb > 0.05; if (side === 'L') { out.gripErrL = gripping ? ge : 0; out.freeErrL = gripping ? 0 : ge; } else { out.gripErrR = gripping ? ge : 0; out.freeErrR = gripping ? 0 : ge; } if (gripping && ge > worstGrip) worstGrip = ge;
      // a hand that cannot reach its grip pulls the prop to it (the hand never lets go of the piece; the authored prop path is bent instead)
      const wgt = Math.max(wa, wb); if (ge > 0.0015 && wgt > 0.05) { const tgtS = wa >= wb ? shA : shB, ww = wa >= wb ? wa : wb; tgtS[0] += ww * (px - tgt[0]); tgtS[1] += ww * (py - tgt[1]); tgtS[2] += ww * (pz - tgt[2]); tgtS[3] += ww * ww; }   // least squares over the hands of one prop: the target of a hand moves with weight w when the prop moves by delta, so delta = sum(w r) / sum(w^2)
    }
    if (this.holdOn) { // hold clip: a hand that could not reach its target takes the palm position it reached, the prop is re-derived from the hands and the arms are solved again (the prop stays rigid between the hands; nothing is dragged along an authored path).
      // Only hands that grip fully take part (a hand that is still arriving, weight < 0.9, is blended with its free position: its target is not the grip); if the hands still miss after six rounds the ordinary least-squares pull below finishes the job.
      const wR = Math.max(g('rhwa'), g('rhwb')), wL = Math.max(g('lhwa'), g('lhwb')), full = (wR < 0.05 || wR >= 0.9) && (wL < 0.05 || wL >= 0.9);
      if (worstGrip < 0.0015) { bestGrip = worstGrip; break; }
      if (full && pass < 6) { for (let sd = 0; sd < 2; sd++) { const w = sd ? wR : wL; if (w > 0.05) { const t = this.holdTgt[sd], pm = this.palm[sd]; t[0] = pm[0]; t[1] = pm[1]; t[2] = pm[2]; } } holdProps(); rig.fk(pose, fk); continue; }
    }
    if (worstGrip < bestGrip - 1e-9) { bestGrip = worstGrip; for (let k = 0; k < 3; k++) { bestTr[k] = tr[slA + k]; bestTr[3 + k] = tr[slB + k]; } }
    if (finalPass) break;
    if (this.noPull || worstGrip < 0.002 || pass === 15 || (shA[3] === 0 && shB[3] === 0) || worstGrip > bestGrip * 1.5 + 0.004) {     // converged, out of passes, nothing to pull, or diverging: finish on the best state seen
      if (worstGrip > bestGrip + 1e-9) { for (let k = 0; k < 3; k++) { tr[slA + k] = bestTr[k]; tr[slB + k] = bestTr[3 + k]; } rig.fk(pose, fk); enforceGround(); finalPass = true; continue; } break; }
    const addShift = (sh, slot, also) => { if (sh[3] === 0) return; let dx = sh[0] / sh[3], dy = sh[1] / sh[3], dz = sh[2] / sh[3]; { const dl = hyp3(dx, dy, dz); if (dl > 0.12) { dx *= 0.12 / dl; dy *= 0.12 / dl; dz *= 0.12 / dl; } } const R0 = fk.wq; if (R0[0] !== 0 || R0[1] !== 0 || R0[2] !== 0) { CQ0[0] = -R0[0]; CQ0[1] = -R0[1]; CQ0[2] = -R0[2]; CQ0[3] = R0[3]; qrot(V, 0, CQ0, 0, dx, dy, dz); dx = V[0]; dy = V[1]; dz = V[2]; }
      tr[slot] += dx; tr[slot + 1] += dy; tr[slot + 2] += dz; if (also) { tr[slB] += dx; tr[slB + 1] += dy; tr[slB + 2] += dz; } };
    addShift(shA, slA, g('bfr') > 1.5); addShift(shB, slB, false);
    rig.fk(pose, fk); enforceGround();
    }
    { const sh0 = rig.shiftMem; for (let k = 0; k < 3; k++) { sh0[k] = this.holdOn ? 0 : tr[slA + k] - tA0[k]; sh0[3 + k] = this.holdOn ? 0 : tr[slB + k] - tB0[k]; } }
    out.propShiftA = hyp3(tr[slA] - tA0[0], tr[slA + 1] - tA0[1], tr[slA + 2] - tA0[2]); out.propShiftB = hyp3(tr[slB] - tB0[0], tr[slB + 1] - tB0[1], tr[slB + 2] - tB0[2]); // total distance the hands pulled each prop from its authored path (m)
    if (this.holdOn) { const mv = sd => hyp3(this.holdTgt[sd][0] - this.holdAuth[sd][0], this.holdTgt[sd][1] - this.holdAuth[sd][1], this.holdTgt[sd][2] - this.holdAuth[sd][2]), w = Math.max(H.wl > 0.5 ? mv(0) : 0, mv(1)); const ht = this.holdTr, pa = hyp3(tr[slA] - ht[0], tr[slA + 1] - ht[1], tr[slA + 2] - ht[2]), pbb = hyp3(tr[slB] - ht[3], tr[slB + 1] - ht[4], tr[slB + 2] - ht[5]); out.propShiftA = H.A ? w + pa : 0; out.propShiftB = H.A ? 0 : w + pbb; }       // the hands moved from the authored targets (w) plus whatever the ordinary pull then dragged the piece

    rig.fk(pose, fk); // final consistent world transforms
    // write the frame
    const f = this.frame; for (let s = 0; s < rig.nCore; s++) { const b = rig.core[s] * 4, o = s * 4; f[o] = rot[b]; f[o + 1] = rot[b + 1]; f[o + 2] = rot[b + 2]; f[o + 3] = rot[b + 3]; }
    for (let k = 0; k < rig.nTrans * 3; k++) f[rig.OFF_TRANS + k] = tr[k];
    const X = rig.OFF_EXTRA; const cl = (wa, wb, gv) => clamp(0.22 + 0.62 * Math.max(wa, wb) + 0.15 * gv, 0, 1);
    f[X + rig.X_GRIPL] = cl(g('lhwa'), g('lhwb'), g('lfist')); f[X + rig.X_GRIPR] = cl(g('rhwa'), g('rhwb'), g('rfist'));
    f[X + rig.X_CONTL] = g('lcont'); f[X + rig.X_CONTR] = g('rcont'); f[X + rig.X_ROOTX] = g('root', 0); f[X + rig.X_ROOTZ] = g('root', 1); f[X + rig.X_ROOTYAW] = g('root', 2);
    return f;
  }
}
export { lerp };
