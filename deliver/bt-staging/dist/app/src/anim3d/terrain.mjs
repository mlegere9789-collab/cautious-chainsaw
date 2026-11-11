// Terrain conformance hooks: slope from the terrain heightfield, and a runtime foot-planting pass that re-solves the legs of a sampled clip frame so the contact feet touch the ground under them (gate G5: foot-to-ground
// <= 2 cm p95 on slopes up to 30 degrees; this module also holds contact to <= 5 cm on the steepest ground of the battlefield DEM, 80.2 degrees, by the step-up behaviour below). The pass is allocation-free after construction.
// The ground is any function ground(x, z) -> height in metres (the renderer passes its heightfield sampler, render/prototype world.mjs T.h(x, z), already in the renderer's height frame); the figure's root stands at
// ground(x, z) and its heading is `yaw` (forward = (sin yaw, cos yaw), left = (cos yaw, -sin yaw)).
import { solveHinge, setWorldRot, reachRange } from './rig.mjs';
import { qrot, qmul, qfromTo, qnlerp, qaxis, D2R, clamp, hyp2, hyp3 } from './qmath.mjs';

// slope of a heightfield at (x, z): central differences over `eps` metres. Returns degrees, the gradient and the unit normal.
export function slopeAt(ground, x, z, eps = 1.0, out = {}) {
  const dx = (ground(x + eps, z) - ground(x - eps, z)) / (2 * eps), dz = (ground(x, z + eps) - ground(x, z - eps)) / (2 * eps);
  const nl = hyp3(dx, 1, dz); out.deg = Math.atan(hyp2(dx, dz)) / D2R; out.dhdx = dx; out.dhdz = dz; out.nx = -dx / nl; out.ny = 1 / nl; out.nz = -dz / nl; return out;
}
// the slope along a heading (positive = uphill ahead)
export function slopeAlong(ground, x, z, yaw, eps = 1.0) { const fx = Math.sin(yaw), fz = Math.cos(yaw); return Math.atan((ground(x + fx * eps, z + fz * eps) - ground(x - fx * eps, z - fz * eps)) / (2 * eps)) / D2R; }

// ---- the slope cap and the step-up behaviour (G-ANIM-24, plausible-procedural: no acquired text gives a marching or scrambling limit on a slope)
//   walking (the drill gaits and every clip as authored) up to WALK_DEG; the planter is exactly the first round's below it.
//   Above it the figure climbs by STEPS: the vertical stagger between the two feet is soft-limited to STEP_H (0.30 m, a tall stair): each foot's along-slope offset from the hip is at most STEP_H / 2 / tan(slope); the body leans into the
//   hill about the hip (up to LEAN_MAX_DEG) and the clip's gait is kept for the arms, the head and the timing. The unit's speed is capped by slopeSpeedFactor() (the formation layer applies it; a figure that is not moved still stands).
//   Steep ground is classed: walk | steep_walk | scramble | climb (a face the DEM resolves as 60 degrees or more, the quarry and railway cuts of the modern DEM) so the stage can pick a behaviour.
export const SLOPE = { WALK_DEG: 28, FULL_DEG: 45, SCRAMBLE_DEG: 50, CLIMB_DEG: 60, STEP_H: 0.30, LEAN_MAX_DEG: 30, LEAN_PER_DEG: 0.5, tier: 'plausible-procedural', gap: 'G-ANIM-24' };
export function slopeClass(deg) { return deg <= SLOPE.WALK_DEG ? 'walk' : deg <= SLOPE.SCRAMBLE_DEG ? 'steep_walk' : deg <= SLOPE.CLIMB_DEG ? 'scramble' : 'climb'; }
// the fraction of the drill speed a unit may keep on a slope (plausible-procedural: 1 up to the walking limit, falling to 0.5 at the scramble limit and to 0.15 at 80 degrees; a stage that wants the exact figure can replace it)
export function slopeSpeedFactor(deg) { if (deg <= SLOPE.WALK_DEG) return 1; if (deg <= SLOPE.SCRAMBLE_DEG) return 1 - 0.5 * (deg - SLOPE.WALK_DEG) / (SLOPE.SCRAMBLE_DEG - SLOPE.WALK_DEG); return Math.max(0.15, 0.5 - 0.35 * (deg - SLOPE.SCRAMBLE_DEG) / 30); }
const smoothstep01 = x => { const u = x < 0 ? 0 : x > 1 ? 1 : x; return u * u * (3 - 2 * u); };

const S0 = { deg: 0, dhdx: 0, dhdz: 0, nx: 0, ny: 1, nz: 0 }, SLOPE_F = { deg: 0, dhdx: 0, dhdz: 0, nx: 0, ny: 1, nz: 0 }, TILT = new Float64Array(4), TILT2 = new Float64Array(4), IDENT = new Float64Array([0, 0, 0, 1]), LEANQ = new Float64Array(4), RQ = new Float64Array(4), VV = new Float64Array(3);
export class FootPlanter {
  constructor(rig) {
    this.rig = rig; this.pose = rig.newPose(); this.fk = rig.newFK(); const I = rig.index;
    this.legs = [{ ch: rig.chains.leg_L, foot: I.foot_L, cont: rig.X_CONTL }, { ch: rig.chains.leg_R, foot: I.foot_R, cont: rig.X_CONTR }];
    this.pelSlot = rig.transSlot[I.pelvis]; this.q = new Float64Array(4); this.v = new Float64Array(3);
    this.ax = new Float64Array(2); this.ay = new Float64Array(2); this.az = new Float64Array(2); this.off = new Float64Array(2); this.fq = new Float64Array(8); this.maxErr = 0;
    this.legNames = ['thigh_L', 'shin_L', 'foot_L', 'thigh_R', 'shin_R', 'foot_R'].map(n => I[n]);
    this.reach = this.legs.map(L => reachRange(rig, L.ch)); this.comfort = this.legs.map(L => reachRange(rig, L.ch, 110)); this.tYs = new Float64Array(2);
    this.mode = 0; this.leanDeg = 0; this.slopeDeg = 0;                                // results of the last conform: 0 walk, 1 steep_walk, 2 scramble, 3 climb; the lean applied; the slope under the root
  }
  // frame: a sampled clip frame, modified in place. Returns the largest vertical error of a contact ankle against its target; this.mode / this.leanDeg / this.slopeDeg describe what was done.
  conform(frame, ground, x, z, yaw) {
    const rig = this.rig, pose = this.pose, fk = this.fk, sy = Math.sin(yaw), cy = Math.cos(yaw), g0 = ground(x, z), I = rig.index;
    rig.expandFrame(frame, pose); rig.fk(pose, fk);
    const s0 = slopeAt(ground, x, z, 1.0, S0), deg0 = s0.deg, m = smoothstep01((deg0 - SLOPE.WALK_DEG) / (SLOPE.FULL_DEG - SLOPE.WALK_DEG)); this.slopeDeg = deg0; this.mode = deg0 <= SLOPE.WALK_DEG ? 0 : deg0 <= SLOPE.SCRAMBLE_DEG ? 1 : deg0 <= SLOPE.CLIMB_DEG ? 2 : 3;
    // uphill direction in the character frame (x left, z forward): the world offset of (ax, az) is ax * (cy, -sy) + az * (sy, cy), so a world vector (wx, wz) is (wx cy - wz sy, wx sy + wz cy) in the character frame
    let ux = 0, uz = 0, dMax = 1e9; if (m > 0) { const gl = hyp2(s0.dhdx, s0.dhdz) || 1; const gx = s0.dhdx / gl, gz = s0.dhdz / gl; ux = gx * cy - gz * sy; uz = gx * sy + gz * cy; dMax = 0.5 * SLOPE.STEP_H / Math.tan(deg0 * D2R); }
    let nContact = 0, dyMin = 1e9, dySum = 0;
    for (let i = 0; i < 2; i++) {
      const L = this.legs[i], fb = L.foot; let fx = fk.wp[fb * 3], fy = fk.wp[fb * 3 + 1], fz = fk.wp[fb * 3 + 2];
      if (m > 0) { const p = fx * ux + fz * uz, l = -fx * uz + fz * ux, np = p + m * (dMax * Math.tanh(p / dMax) - p); fx = np * ux - l * uz; fz = np * uz + l * ux; }   // step-up: the foot's along-slope offset is soft-limited to one step height
      this.ax[i] = fx; this.ay[i] = fy; this.az[i] = fz;
      for (let k = 0; k < 4; k++) this.fq[i * 4 + k] = fk.wq[fb * 4 + k];
      const wx = x + this.ax[i] * cy + this.az[i] * sy, wz = z - this.ax[i] * sy + this.az[i] * cy; this.off[i] = ground(wx, wz) - g0; dySum += this.off[i];
      if (frame[rig.OFF_EXTRA + L.cont] > 0.5) { nContact++; if (this.off[i] < dyMin) dyMin = this.off[i]; }
    }
    // lean into the hill about the hip: the root is turned about the pelvis joint (the pelvis keeps its place, the body above and the feet's FK follow; the feet are re-solved to the planted positions below)
    let leaned = false; this.leanDeg = 0;
    if (m > 0) { const lean = Math.min(SLOPE.LEAN_MAX_DEG, SLOPE.LEAN_PER_DEG * (deg0 - SLOPE.WALK_DEG)) * smoothstep01((deg0 - SLOPE.WALK_DEG) / 8); this.leanDeg = lean;
      if (lean > 1e-3) { const pb = I.pelvis, pk = rig.transSlot[pb] * 3, ox = rig.local[pb * 3] + pose.trans[pk], oy = rig.local[pb * 3 + 1] + pose.trans[pk + 1], oz = rig.local[pb * 3 + 2] + pose.trans[pk + 2];
        const px = fk.wp[pb * 3], py = fk.wp[pb * 3 + 1], pz = fk.wp[pb * 3 + 2];                                            // pelvis joint in the character frame
        qaxis(LEANQ, 0, uz, 0, -ux, lean * D2R); RQ[0] = pose.rot[0]; RQ[1] = pose.rot[1]; RQ[2] = pose.rot[2]; RQ[3] = pose.rot[3]; qmul(TILT, 0, LEANQ, 0, RQ, 0);      // lean * root rotation
        pose.rot[0] = TILT[0]; pose.rot[1] = TILT[1]; pose.rot[2] = TILT[2]; pose.rot[3] = TILT[3]; qrot(VV, 0, TILT, 0, ox, oy, oz); pose.trans[0] = px - VV[0]; pose.trans[1] = py - VV[1]; pose.trans[2] = pz - VV[2]; leaned = true; } }
    const dy0 = nContact > 0 ? dyMin : dySum / 2; let drop = 0, maxErr = 0;
    // the ankle target of each foot (it does not depend on the pelvis): the foot tilted onto the slope, its lowest sole point (heel or ball) on the ground under it
    for (let i = 0; i < 2; i++) {
      const L = this.legs[i], c = clamp(frame[rig.OFF_EXTRA + L.cont], 0, 1), ty = this.ay[i] + this.off[i];
      for (let k = 0; k < 4; k++) this.q[k] = this.fq[i * 4 + k];
      const s = slopeAt(ground, x + this.ax[i] * cy + this.az[i] * sy, z - this.ax[i] * sy + this.az[i] * cy, 0.25, SLOPE_F);       // tilt the planted foot onto the slope
      const nx = s.nx * cy - s.nz * sy, nz = s.nx * sy + s.nz * cy; qfromTo(TILT, 0, 0, 1, 0, nx, s.ny, nz); qnlerp(TILT2, 0, IDENT, 0, TILT, 0, c); qmul(this.q, 0, TILT2, 0, this.q, 0);
      let tY = ty;
      if (c > 0.01) {                                                                    // planted: put the lowest sole point (heel or ball of the TILTED foot) on the ground under it
        const wax = x + this.ax[i] * cy + this.az[i] * sy, waz = z - this.ax[i] * sy + this.az[i] * cy; let need = -1e9;
        for (let h = 0; h < 2; h++) { qrot(this.v, 0, this.q, 0, 0, -0.085, h === 0 ? -0.05 : 0.14); const px = wax + this.v[0] * cy + this.v[2] * sy, pz = waz - this.v[0] * sy + this.v[2] * cy, gy = ground(px, pz) - g0; const a2 = gy - this.v[1]; if (a2 > need) need = a2; }
        tY = ty * (1 - c) + need * c;
      }
      this.tYs[i] = tY; for (let k = 0; k < 4; k++) this.fq[i * 4 + k] = this.q[k];     // fq now holds the TILTED foot orientation
    }
    for (let iter = 0; iter < 5; iter++) {                                                // set the pelvis height, then solve both legs: the pelvis follows the lowest planted foot (a figure shortens its stance on a slope) and is moved up or down until both planted legs are inside the reach of the knee (not beyond full extension, not past the flexion limit)
      pose.trans[this.pelSlot * 3 + 1] = frame[rig.OFF_TRANS + this.pelSlot * 3 + 1] + dy0 + drop; rig.fk(pose, fk); let excess = 0; maxErr = 0; let need = 0, nNeed = 0, lo = -1e9, hi = 1e9;
      for (let i = 0; i < 2; i++) {
        const L = this.legs[i], fb = L.foot, c = clamp(frame[rig.OFF_EXTRA + L.cont], 0, 1), tY = this.tYs[i];
        for (let k = 0; k < 4; k++) this.q[k] = this.fq[i * 4 + k];
        const err = solveHinge(this.rig, L.ch, pose, fk, this.ax[i], tY, this.az[i], 0, 0, 1);
        setWorldRot(this.rig, pose, fk, fb, this.q[0], this.q[1], this.q[2], this.q[3]);
        if (c > 0.5) { if (err > excess) excess = err; const e = Math.abs(fk.wp[L.ch.e * 3 + 1] - tY); if (e > maxErr) maxErr = e;
          // the hip height range in which this leg can reach its ankle target: d = hip - ankle must lie between the vertical parts of the flexion-limit reach and the full-extension reach
          const a = L.ch.a, hx = fk.wp[a * 3] - this.ax[i], hz = fk.wp[a * 3 + 2] - this.az[i], h2 = hx * hx + hz * hz;
          const dlo = Math.sqrt(Math.max(0, this.comfort[i][0] * this.comfort[i][0] - h2)), dhi = Math.sqrt(Math.max(0, this.reach[i][1] * this.reach[i][1] - h2));
          lo = Math.max(lo, tY + dlo); hi = Math.min(hi, tY + dhi); nNeed++; }
      }
      if (excess < 0.0005 && maxErr < 0.0005) break;
      // move the pelvis (along its own up axis, approximately vertical) by the smallest amount that puts the hips inside [lo, hi]; if the two feet ask for incompatible heights take the middle
      const hipY = fk.wp[this.legs[0].ch.a * 3 + 1] * 0.5 + fk.wp[this.legs[1].ch.a * 3 + 1] * 0.5; let shift = 0;
      if (lo > hi) shift = 0.5 * (lo + hi) - hipY; else if (hipY < lo) shift = lo - hipY; else if (hipY > hi) shift = hi - hipY; else shift = 0;
      if (nNeed === 0 || Math.abs(shift) < 1e-5) break; drop += shift * 1.02;
    }
    for (let j = 0; j < 6; j++) { const b = this.legNames[j], sl = rig.coreSlot[b]; for (let k = 0; k < 4; k++) frame[sl * 4 + k] = pose.rot[b * 4 + k]; }
    frame[rig.OFF_TRANS + this.pelSlot * 3 + 1] = pose.trans[this.pelSlot * 3 + 1];
    if (leaned) { const rs = rig.coreSlot[0]; for (let k = 0; k < 4; k++) frame[rs * 4 + k] = pose.rot[k]; const ts = rig.transSlot[0] * 3; for (let k = 0; k < 3; k++) frame[rig.OFF_TRANS + ts + k] = pose.trans[k]; }
    this.maxErr = maxErr; return maxErr;
  }
  // the G5 measure: for each contact foot the smallest clearance of the sole points (heel, ball) above the ground under each, in metres (0 = touching; negative = penetration)
  contactError(frame, ground, x, z, yaw, out) {
    const rig = this.rig, pose = this.pose, fk = this.fk; rig.expandFrame(frame, pose); rig.fk(pose, fk); const sy = Math.sin(yaw), cy = Math.cos(yaw), g0 = ground(x, z); let worst = 0, any = 0;
    for (let i = 0; i < 2; i++) {
      const L = this.legs[i]; if (frame[rig.OFF_EXTRA + L.cont] <= 0.5) continue; const fb = L.foot; let minClear = 1e9;
      for (let h = 0; h < 2; h++) { qrot(this.v, 0, fk.wq, fb * 4, 0, -0.085, h === 0 ? -0.05 : 0.14); const px = fk.wp[fb * 3] + this.v[0], py = fk.wp[fb * 3 + 1] + this.v[1], pz = fk.wp[fb * 3 + 2] + this.v[2];
        const wx = x + px * cy + pz * sy, wz = z - px * sy + pz * cy, clear = py + g0 - ground(wx, wz); if (clear < minClear) minClear = clear; }       // clearance of the sole point that is closest to the ground (0 = touching, negative = penetration)
      const e = Math.abs(minClear); if (e > worst) worst = e; any++;
    }
    if (out) { out.worst = worst; out.contacts = any; } return worst;
  }
}
