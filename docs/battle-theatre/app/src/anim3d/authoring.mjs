// Authoring helpers that make a held prop follow from where the hands are, so that a clip never asks the solver to drag a prop to hands that cannot reach it (the "prop pull" of ANIM3D-NOTES 10.2 / 11.1).
// Before: a prop was keyed by the position of its ORIGIN and an orientation, and the grips were placed along the prop at distances measured from that origin; a staff keyed with its head 0.6 m ahead and its axis pointing forward put the grips
// 1.0-1.8 m from the shoulders, out of reach by up to 1.1 m, and the least-squares pull hid the error by moving the staff to the hands.
// Now: the author says where the hands are (palm-socket targets, which are within reach by construction: reachOK() checks them against the arm), and holdProp() derives the prop's reference point, direction and grip distances from them.
//   holdProp(spec, 'B', { R: [x, y, z], L: [x, y, z] | null, rg, dir?, frame: 0 | 1, roll })
//     R, L   right and left palm targets in the root frame (frame 0) or the chest frame (frame 1); L = null for a one-handed hold
//     rg     distance of the right grip from the prop's origin along the prop (+y of the prop)
//     dir    unit direction origin -> end of the prop (required for a one-handed hold; for a two-handed hold it is (R - L) / |R - L|, the left hand being nearer the origin by |R - L|)
// Positions in metres, angles in degrees, as everywhere in the pose language (figure-pose.mjs).
import { D2R } from './qmath.mjs';

export const SHOULDER = { x: 0.185, y: 1.395, z: 0.025 };          // clavicle head of skeleton.json (the shoulder joint is about 0.03 m further out and down): root frame, x mirrored for the right side
export const ARM_REACH = 0.52, ARM_MIN = 0.30;                       // the palm target lies 0.28 to 0.58 m from the shoulder joint (rig: wrist 0.253-0.560 m from the shoulder, palm socket 0.05 m beyond the wrist), less a margin
const CHEST_ORIGIN = [0, 1.26, 0.006];
const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
export const dirToAngles = d => { const [dx, dy, dz] = norm(d); return [Math.acos(Math.max(-1, Math.min(1, dy))) / D2R, Math.atan2(dx, dz) / D2R]; };   // propQuat: dir = (sin p sin yaw, cos p, sin p cos yaw)

// distance from a hand target to the shoulder of that side (root frame; a chest-frame point is converted for an upright chest)
export function reachOf(side, p, frame = 0) {
  const q = frame === 1 ? [p[0] + CHEST_ORIGIN[0], p[1] + CHEST_ORIGIN[1], p[2] + CHEST_ORIGIN[2]] : p;
  const sx = side === 'L' ? SHOULDER.x : -SHOULDER.x; return Math.hypot(q[0] - sx, q[1] - SHOULDER.y, q[2] - SHOULDER.z);
}
export const reachOK = (side, p, frame = 0) => { const r = reachOf(side, p, frame); return r <= ARM_REACH && r >= ARM_MIN; };

export function holdProp(spec, which, { R, L = null, rg, dir = null, frame = 0, roll = 0, lg = null, distal = which === 'A' }) {
  // distal: the left hand is further along the prop than the right (a rifle: wrist, then the lower band); otherwise it is nearer the origin (a staff, a tool: right hand at the end, left hand toward the head)
  let axis, lgrip = lg;
  if (L) { const d = [R[0] - L[0], R[1] - L[1], R[2] - L[2]], len = Math.hypot(d[0], d[1], d[2]); axis = norm(distal ? [-d[0], -d[1], -d[2]] : d); lgrip = distal ? rg + len : rg - len; if (lgrip < -1e-6) throw new Error('holdProp: left grip would be before the origin of the prop (' + lgrip.toFixed(3) + ')'); }
  else { if (!dir) throw new Error('holdProp: a one-handed hold needs dir'); axis = norm(dir); }
  const [pitch, yaw] = dirToAngles(axis), A = which === 'A';
  if (A) { spec.set('rp', ...R).set('ra', pitch, yaw, roll).set('rref', rg).set('rfr', frame).set('rhwa', 1).set('rhga', rg).set('rhp', ...R); if (L) spec.set('lhwa', 1).set('lhga', lgrip).set('lhp', ...L); else { spec.set('lhwa', 0); if (lg != null) spec.set('lhga', lg); } }
  else { spec.set('bp', ...R).set('ba', pitch, yaw, roll).set('bref', rg).set('bfr', frame).set('rhwb', 1).set('rhgb', rg).set('rhp', ...R); if (L) spec.set('lhwb', 1).set('lhgb', lgrip).set('lhp', ...L); else { spec.set('lhwb', 0); if (lg != null) spec.set('lhgb', lg); } }
  spec.set('hfr', frame === 1 ? 1 : 0).set('hold', A ? 2 : 1);
  return spec;
}
// a hand target kept inside the reach of its arm (pulled toward the shoulder along the line shoulder -> target)
export function withinReach(side, p, frame = 0, max = ARM_REACH) {
  const off = frame === 1 ? CHEST_ORIGIN : [0, 0, 0], q = [p[0] + off[0], p[1] + off[1], p[2] + off[2]], sx = side === 'L' ? SHOULDER.x : -SHOULDER.x, v = [q[0] - sx, q[1] - SHOULDER.y, q[2] - SHOULDER.z], l = Math.hypot(...v);
  if (l <= max) return p; const k = max / l; return [sx + v[0] * k - off[0], SHOULDER.y + v[1] * k - off[1], SHOULDER.z + v[2] * k - off[2]];
}

// the channel values of a hold (for keyed clips whose keys are written as channel objects): holdCh({ which, R, L, rg, dir, frame, roll }) -> { bp, ba, bref, bfr, rhwb, rhgb, lhwb, lhgb, rhp, lhp, hfr, hold }
import { Spec, CH } from './figure-pose.mjs';
export function holdCh(o) {
  const sp = new Spec(), before = Float64Array.from(sp.v); holdProp(sp, o.which || 'B', o); const out = {};
  for (const [name, [off, len]] of Object.entries(CH)) { let ch = false; for (let i = 0; i < len; i++) if (sp.v[off + i] !== before[off + i]) ch = true; if (ch) out[name] = Array.from(sp.v.slice(off, off + len)); }
  // channels whose new value equals the Spec default must still be written (a hold after a non-hold key): write the ones holdProp always sets
  const always = o.which === 'A' ? ['rp', 'ra', 'rref', 'rfr', 'rhwa', 'rhga', 'lhwa', 'rhp', 'hfr', 'hold'] : ['bp', 'ba', 'bref', 'bfr', 'rhwb', 'rhgb', 'lhwb', 'rhp', 'hfr', 'hold']; if (o.L) always.push(o.which === 'A' ? 'lhga' : 'lhgb', 'lhp');
  for (const name of always) { const [off, len] = CH[name]; out[name] = Array.from(sp.v.slice(off, off + len)); }
  return out;
}

// holdify(spec): convert a long-arm pose written the old way (rp / ra / rref / rfr + the grip distances rhga, lhga) into the hand-anchored form: the hand targets are the grip points, the hold channel is set. For an authored pose whose hands are within reach nothing
// changes (the prop is re-derived from the same hands); a pose whose grips are out of reach is brought inside the arms' annulus by the solver and the distance is reported (out.holdClampL/R, propShiftA) instead of being dragged.
import { qrot as _qrot, qeuler as _qeuler } from './qmath.mjs';
export function holdify(spec) {
  if (spec.get('hold') > 0.5) return spec;                   // already written in the hand-anchored form
  const g = (n, i = 0) => spec.get(n, i); const P = g('ra', 0) * D2R, Y = g('ra', 1) * D2R, Rl = g('ra', 2) * D2R;
  const d = [Math.sin(P) * Math.sin(Y), Math.cos(P), Math.sin(P) * Math.cos(Y)], rp = [g('rp', 0), g('rp', 1), g('rp', 2)], ref = g('rref');
  const along = a => [rp[0] + (a - ref) * d[0], rp[1] + (a - ref) * d[1], rp[2] + (a - ref) * d[2]]; void Rl;
  const frame = g('rfr') > 0.5 ? 1 : 0;
  if (g('rhwa') > 0.05) { const R = along(g('rhga')); spec.set('rhp', ...R); }
  if (g('lhwa') > 0.05) { const L = along(g('lhga')); spec.set('lhp', ...L); }
  spec.set('hfr', frame).set('hold', 2); return spec;
}
