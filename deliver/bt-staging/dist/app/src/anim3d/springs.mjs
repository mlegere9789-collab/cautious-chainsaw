// G7 gear secondary motion (render/PLAN.md G7): a deterministic damped spring pass for the gear bones of the human rig (skeleton.json `spring` = { freq_hz, damping, mass_rel }): cartridge box, scabbard (sword), haversack, canteen,
// pack, blanket roll, the three coat skirts, hat plume, sash tail (11 bones in the file).
// Model: each gear item hangs from its parent bone like a short pendulum on a strap. Its deflection is two small angles (theta_x about the parent's X axis: forward / back swing, theta_z about Z: sideways swing), each a damped
// harmonic oscillator   theta'' + 2 zeta w theta' + w^2 theta = u,   with the natural frequency w = 2 pi f and the damping ratio zeta from the rig file, driven by the apparent acceleration of the attachment point in the
// parent's frame:  w_loc = R_parent^T (a_world + g up),   u_x = + w_loc.z / L,   u_z = - w_loc.x / L   (at rest w_loc = (0, g, 0): no force; a parent that accelerates forward makes the item lag backward; a parent that tilts
// forward makes the item hang back toward the vertical). L is the pendulum length of the item (authored per bone, below; tier plausible-procedural, G-ANIM-21).
// Integration is the EXACT solution of the linear oscillator over a step with the forcing held constant, so it is unconditionally stable for any step (|eigenvalue| = exp(-zeta w dt) < 1) and the result does not depend on
// how the time axis is cut into frames beyond the forcing samples. No random numbers, no clock: a pure function of the parent motion. Used at bake time (bakeGearTrack: a per-clip track of gear quaternions at the clip rate,
// warm-started on the periodic steady state for loops) and at run time for the near set (GearSprings.step).
import { qeuler, qrot, D2R } from './qmath.mjs';

export const G = 9.80665;
// pendulum length of each item in metres (distance from the strap attachment to the centre of the swinging mass); authored, G-ANIM-21
export const GEAR_L = { gear_cartbox: 0.12, gear_scabbard: 0.45, gear_haversack: 0.22, gear_canteen: 0.20, gear_pack: 0.28, gear_blanket: 0.20, gear_skirt_L: 0.22, gear_skirt_R: 0.22, gear_skirt_B: 0.24, gear_plume: 0.14, gear_sash_tail: 0.30 };
export const MAX_THETA = 0.6;   // rad: the strap or the cloth stops the item (about 34 degrees)

// one damped oscillator with its exact step map for a given dt: state (x, v); returns the new state for forcing u
export class SpringChannel {
  constructor(freqHz, zeta) { this.w = 2 * Math.PI * freqHz; this.z = Math.min(0.999, Math.max(0, zeta)); this.dtCache = -1; this.x = 0; this.v = 0; }
  _map(dt) {
    if (dt === this.dtCache) return; const w = this.w, z = this.z, wd = w * Math.sqrt(1 - z * z), s = Math.exp(-z * w * dt), c = Math.cos(wd * dt), sn = Math.sin(wd * dt), k = z * w / wd;
    this.a = s * (c + k * sn); this.b = s * sn / wd; this.c = -s * (w * w / wd) * sn; this.d = s * (c - k * sn); this.dtCache = dt;
  }
  step(u, dt) {   // x_{n+1} = Phi (x_n - xp) + xp with xp = u / w^2 (the particular solution for constant forcing)
    this._map(dt); const xp = u / (this.w * this.w), dx = this.x - xp, dv = this.v; let x = this.a * dx + this.b * dv + xp, v = this.c * dx + this.d * dv;
    if (x > MAX_THETA) { x = MAX_THETA; if (v > 0) v = 0; } else if (x < -MAX_THETA) { x = -MAX_THETA; if (v < 0) v = 0; }
    this.x = x; this.v = v; return x;
  }
}

export class GearSprings {
  constructor(rig) {
    this.rig = rig; this.items = [];
    for (let b = 0; b < rig.n; b++) { const sp = rig.spring[b]; if (!sp) continue; const name = rig.names[b];
      this.items.push({ bone: b, parent: rig.parent[b], name, local: [rig.local[b * 3], rig.local[b * 3 + 1], rig.local[b * 3 + 2]], L: GEAR_L[name] ?? 0.2, fx: new SpringChannel(sp.freq_hz, sp.damping), fz: new SpringChannel(sp.freq_hz, sp.damping), freq: sp.freq_hz, zeta: sp.damping, mass: sp.mass_rel,
        p1: new Float64Array(3), p2: new Float64Array(3), n: 0 }); }
    this.n = this.items.length; this.V = new Float64Array(3); this.W = new Float64Array(3); this.Q = new Float64Array(4);
  }
  names() { return this.items.map(i => i.name); }
  reset() { for (const it of this.items) { it.fx.x = it.fx.v = it.fz.x = it.fz.v = 0; it.n = 0; } }
  // attachment point of an item in world space from the FK of the pose (fk.wq, fk.wp) -> out[0..2]
  _attach(it, fk, out) { qrot(this.V, 0, fk.wq, it.parent * 4, it.local[0], it.local[1], it.local[2]); out[0] = fk.wp[it.parent * 3] + this.V[0]; out[1] = fk.wp[it.parent * 3 + 1] + this.V[1]; out[2] = fk.wp[it.parent * 3 + 2] + this.V[2]; }
  // advance one step of dt seconds to the pose whose forward kinematics is fk; extraAccel = [ax, ay, az] world acceleration of the whole figure (its root motion), default none
  step(fk, dt, extraAccel = null) {
    const P = this.W;
    for (const it of this.items) {
      this._attach(it, fk, P); const x = P[0], y = P[1], z = P[2];
      if (it.n >= 2) {
        let ax = (x - 2 * it.p1[0] + it.p2[0]) / (dt * dt), ay = (y - 2 * it.p1[1] + it.p2[1]) / (dt * dt), az = (z - 2 * it.p1[2] + it.p2[2]) / (dt * dt);
        if (extraAccel) { ax += extraAccel[0]; ay += extraAccel[1]; az += extraAccel[2]; }
        // apparent acceleration in the parent's frame: R^T (a + g up)
        const q = it.parent * 4, qx = -fk.wq[q], qy = -fk.wq[q + 1], qz = -fk.wq[q + 2], qw = fk.wq[q + 3]; this.Q[0] = qx; this.Q[1] = qy; this.Q[2] = qz; this.Q[3] = qw;
        qrot(this.V, 0, this.Q, 0, ax, ay + G, az);
        it.fx.step(this.V[2] / it.L, dt); it.fz.step(-this.V[0] / it.L, dt);
      } else if (it.n === 1) { // second sample: no acceleration yet; settle to the static (gravity-tilt) equilibrium of this orientation
        const q = it.parent * 4; this.Q[0] = -fk.wq[q]; this.Q[1] = -fk.wq[q + 1]; this.Q[2] = -fk.wq[q + 2]; this.Q[3] = fk.wq[q + 3]; qrot(this.V, 0, this.Q, 0, 0, G, 0); it.fx.step(this.V[2] / it.L, dt); it.fz.step(-this.V[0] / it.L, dt);
      }
      it.p2[0] = it.p1[0]; it.p2[1] = it.p1[1]; it.p2[2] = it.p1[2]; it.p1[0] = x; it.p1[1] = y; it.p1[2] = z; it.n++;
    }
  }
  // write the deflection of every item as a local quaternion (x, y, z, w) into out[o + 4 i]; Rx(theta_x) * Rz(theta_z)
  quats(out, o = 0) { for (let i = 0; i < this.n; i++) { qeuler(this.Q, 0, this.items[i].fx.x, 0, this.items[i].fz.x); out[o + i * 4] = this.Q[0]; out[o + i * 4 + 1] = this.Q[1]; out[o + i * 4 + 2] = this.Q[2]; out[o + i * 4 + 3] = this.Q[3]; } return out; }
  // write the gear rotations into a pose (pose.rot), after the clip frame has been expanded
  applyTo(pose) { for (const it of this.items) { qeuler(this.Q, 0, it.fx.x, 0, it.fz.x); const o = it.bone * 4; pose.rot[o] = this.Q[0]; pose.rot[o + 1] = this.Q[1]; pose.rot[o + 2] = this.Q[2]; pose.rot[o + 3] = this.Q[3]; } }
}

// the gear track of a clip: Float32Array(frames x items x 4). Loops are warm-started: the clip is run 5 times round and the last pass is stored (the periodic steady state); one-shot clips start from the static equilibrium of
// their first frame. Root motion enters as the constant forward acceleration 0 (constant velocity): a figure walking at constant speed adds no force.
export function bakeGearTrack(lib, clipId, { cycles = 5 } = {}) {
  const clip = lib.get(clipId), rig = lib.rig, gs = new GearSprings(rig), pose = rig.newPose(), fk = rig.newFK(), n = clip.n, dt = 1 / clip.fps, fr = rig.newFrame(), out = new Float32Array(n * gs.n * 4);
  if (clip.def.rig === 'horse' || clip.def.rig === 'gun') return { items: gs.names(), n, track: out, maxDeg: 0 };
  let maxTh = 0; const L = clip.frameLen; const run = (store) => { for (let i = 0; i < n; i++) { fr.set(clip.data.subarray(i * L, (i + 1) * L)); rig.expandFrame(fr, pose); rig.fk(pose, fk); gs.step(fk, dt); if (store) { gs.quats(out, i * gs.n * 4); for (const it of gs.items) maxTh = Math.max(maxTh, Math.abs(it.fx.x), Math.abs(it.fz.x)); } } };
  gs.reset(); if (clip.loop) { for (let c = 0; c < cycles - 1; c++) run(false); } run(true);
  return { items: gs.names(), n, fps: clip.fps, loop: clip.loop, track: out, maxDeg: maxTh / D2R };
}
// sample a gear track at clip time t into out (nlerp of the two neighbouring frames)
export function sampleGearTrack(g, t, out) {
  const m = g.items.length, n = g.n; let x = t * g.fps; if (g.loop) { x = x % n; if (x < 0) x += n; } else x = Math.min(Math.max(x, 0), n - 1);
  const i0 = Math.floor(x), f = x - i0, i1 = g.loop ? (i0 + 1) % n : Math.min(n - 1, i0 + 1), a = i0 * m * 4, b = i1 * m * 4;
  for (let k = 0; k < m * 4; k++) out[k] = g.track[a + k] * (1 - f) + g.track[b + k] * f;
  for (let j = 0; j < m; j++) { const o = j * 4, l = Math.hypot(out[o], out[o + 1], out[o + 2], out[o + 3]) || 1; out[o] /= l; out[o + 1] /= l; out[o + 2] /= l; out[o + 3] /= l; }
  return out;
}
