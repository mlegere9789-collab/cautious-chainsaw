// Measurements on baked clips, shared by tests/anim3d.test.mjs and tools/measure-anim3d.mjs. Node only (no browser, no GPU). Distances in metres.
//  footSlip            stance-foot ground-point drift while a clip is moved at speed v (G5)
//  vertexStep          largest vertex displacement between two frames of a synthetic skinned mesh (G3/G4 stand-in for the FIGURES mesh)
//  loopSeam            displacement across the loop wrap against the clip's own largest step (G4)
//  bakeError           linear-interpolation error of a clip stored at a lower rate against the exact solve (G3)
//  attachment          hand-to-grip error and reach error over a clip (G6 hand attachment <= 1 cm)
//  limitStats          joint-limit violations over a clip (G6)
import { sampleClip } from './clipdef.mjs';
import { qrot } from './qmath.mjs';
import { syntheticMesh } from './bake.mjs';
import { Spec } from './figure-pose.mjs';

export class MeshProbe {
  constructor(rig, rings = 1, sides = 4) { this.rig = rig; this.mesh = syntheticMesh(rig, rings, sides); this.nv = this.mesh.positions.length / 3; this.pose = rig.newPose(); this.fk = rig.newFK(); this.M = new Float32Array(rig.n * 12); this.fr = rig.newFrame(); }
  verts(frame, out) {
    const { rig, mesh, pose, fk, M } = this; rig.expandFrame(frame, pose); rig.fk(pose, fk); rig.skin(fk, M, null);
    for (let v = 0; v < this.nv; v++) { const q = mesh.joints[v * 4] * 12, x = mesh.positions[v * 3], y = mesh.positions[v * 3 + 1], z = mesh.positions[v * 3 + 2];
      out[v * 3] = M[q] * x + M[q + 1] * y + M[q + 2] * z + M[q + 3]; out[v * 3 + 1] = M[q + 4] * x + M[q + 5] * y + M[q + 6] * z + M[q + 7]; out[v * 3 + 2] = M[q + 8] * x + M[q + 9] * y + M[q + 10] * z + M[q + 11]; }
    return out;
  }
  step(a, b) { let m = 0, s = 0; for (let v = 0; v < this.nv; v++) { const d = Math.hypot(a[v * 3] - b[v * 3], a[v * 3 + 1] - b[v * 3 + 1], a[v * 3 + 2] - b[v * 3 + 2]); s += d; if (d > m) m = d; } return { max: m, mean: s / this.nv }; }
  alloc() { return new Float32Array(this.nv * 3); }
}
// largest and median 60 Hz vertex step inside a clip (the wrap step is excluded for loops: see loopSeam)
export function clipSteps(probe, clip, hz = 60) {
  const a = probe.alloc(), b = probe.alloc(), fr = probe.fr, dt = 1 / hz, steps = []; const T = clip.loop ? clip.dur - dt : clip.dur - dt;
  for (let t = 0; t <= T + 1e-9; t += dt) { sampleClip(clip, t, fr); probe.verts(fr, a); sampleClip(clip, t + dt, fr); probe.verts(fr, b); steps.push(probe.step(a, b).max); }
  steps.sort((x, y) => x - y); return { max: steps[steps.length - 1] || 0, median: steps[Math.floor(steps.length / 2)] || 0, p95: steps[Math.floor(steps.length * 0.95)] || 0, n: steps.length };
}
export function loopSeam(probe, clip, hz = 60) { // step from the last sampled instant (T - dt) across the wrap to 0 and to dt, against the in-clip largest step
  const a = probe.alloc(), b = probe.alloc(), fr = probe.fr, dt = 1 / hz; sampleClip(clip, clip.dur - dt, fr); probe.verts(fr, a); sampleClip(clip, clip.dur, fr); probe.verts(fr, b); const wrap = probe.step(a, b).max; const s = clipSteps(probe, clip, hz); return { wrap, max: s.max, median: s.median, ratio: wrap / Math.max(s.max, 1e-4) };
}
// stance slip of a looped locomotion clip played at its own rootSpeed (or at playback rate r with the root moving at speed vRoot): heel and ball ground points that are within 4 mm of the ground and flagged as contact
export function footSlip(rig, clip, vRoot, rate = 1, eps = 0.004) {
  const pose = rig.newPose(), fk = rig.newFK(), fr = rig.newFrame(), V = new Float64Array(3), N = Math.round(clip.dur * 60), T = clip.dur / rate; let worstZ = 0, worstX = 0, runsN = 0, perStepWorst = 0;
  for (const side of [0, 1]) { const fb = rig.idx(side ? 'foot_R' : 'foot_L');
    for (const oz of [-0.05, 0.14]) { const pts = [];
      for (let i = 0; i < N; i++) { const tt = i / N * T; sampleClip(clip, tt * rate, fr); rig.expandFrame(fr, pose); rig.fk(pose, fk); qrot(V, 0, fk.wq, fb * 4, 0, -0.085, oz); pts.push({ x: fk.wp[fb * 3] + V[0], y: fk.wp[fb * 3 + 1] + V[1], z: fk.wp[fb * 3 + 2] + V[2], t: tt, c: fr[rig.OFF_EXTRA + (side ? rig.X_CONTR : rig.X_CONTL)] }); }
      const s0 = pts.findIndex(p => !(p.y < eps && p.c > 0.5)); if (s0 < 0) continue; let run = []; const runs = [];
      for (let k = 0; k <= N; k++) { const p = pts[(s0 + k) % N], tt = p.t + ((s0 + k) >= N ? T : 0); if (p.y < eps && p.c > 0.5) run.push({ ...p, t: tt }); else if (run.length) { runs.push(run); run = []; } }
      if (run.length) runs.push(run);
      for (const r of runs) { if (r.length < 2) continue; const z0 = r[0].z + vRoot * r[0].t, x0 = r[0].x; let mz = 0, mx = 0; for (const p of r) { mz = Math.max(mz, Math.abs(p.z + vRoot * p.t - z0)); mx = Math.max(mx, Math.abs(p.x - x0)); } worstZ = Math.max(worstZ, mz); worstX = Math.max(worstX, mx); perStepWorst = Math.max(perStepWorst, mz); runsN++; } } }
  return { worstZ, worstX, runs: runsN, perStepWorst };
}
// linear interpolation error (mm-scale) of a clip re-sampled at `hz` frames per second against the exact (60 Hz solved) clip: max / mean vertex error over the clip
export function bakeError(probe, clip, hz) {
  const fr = probe.fr, lowFr = clip.rig.newFrame(), a = probe.alloc(), b = probe.alloc(), exact = clip; let max = 0, sum = 0, n = 0;
  const N = Math.max(2, Math.round(clip.dur * hz)); const lows = []; for (let i = 0; i <= N; i++) { const t = Math.min(clip.dur, i / hz); const f = new Float32Array(clip.frameLen); sampleClip(exact, clip.loop ? i / hz % clip.dur : t, f); lows.push(f); }
  for (let t = 0; t < clip.dur; t += 1 / 240) { sampleClip(exact, t, fr); probe.verts(fr, a); const x = t * hz, i0 = Math.min(Math.floor(x), N - 1), fx = x - i0; blendLow(clip.rig, lowFr, lows[i0], lows[i0 + 1], fx); probe.verts(lowFr, b); const e = probe.step(a, b); if (e.max > max) max = e.max; sum += e.mean; n++; }
  return { max, mean: sum / n };
}
import { blendFrames } from './clipdef.mjs';
function blendLow(rig, out, A, B, w) { return blendFrames(rig, out, A, B, w); }
export function attachment(solver, def, step = 0.05) {
  const spec = new Spec(); let maxReach = 0, maxGrip = 0, maxFree = 0, maxShift = 0, n = 0, over1 = 0, over5 = 0; const rig = solver.rig; rig.resetChains();
  for (let t = 0; t <= def.dur + 1e-9; t += step) { spec.reset(); def.eval(Math.min(t, def.dur), spec); solver.solve(spec, def.propB || 'prop_sword'); const o = solver.out, r = Math.max(o.reachErrL, o.reachErrR), g = Math.max(o.gripErrL, o.gripErrR); maxReach = Math.max(maxReach, r); maxFree = Math.max(maxFree, o.freeErrL, o.freeErrR); maxShift = Math.max(maxShift, o.propShiftA, o.propShiftB); maxGrip = Math.max(maxGrip, g); n++; if (g > 0.01) over1++; if (g > 0.05) over5++; }
  return { maxReach, maxGrip, maxFree, maxShift, frames: n, over1cm: over1 / n, over5cm: over5 / n };
}
export function limitStats(rig, clip, every = 2, tol = 0.5) {
  const pose = rig.newPose(), fr = rig.newFrame(); let frames = 0, bad = 0, over10 = 0, worst = 0; const rep = [], per = [];
  for (let i = 0; i < clip.n; i += every) { sampleClip(clip, i / clip.fps, fr); rig.expandFrame(fr, pose); const r = []; const v = rig.limitViolations(pose, tol, r); frames++; per.push(v.worst); if (v.count) { bad++; if (v.worst > 10) over10++; if (v.worst > worst) worst = v.worst; for (const x of r) if (rep.length < 6) rep.push(x.bone + x.axis); } }
  per.sort((a, b) => a - b); return { frames, badFrames: bad, fraction: bad / Math.max(1, frames), fractionOver10deg: over10 / Math.max(1, frames), p95Deg: per[Math.floor(0.95 * (per.length - 1))] || 0, worstDeg: worst, bones: [...new Set(rep)] };
}
export function percentile(arr, q) { const a = Float64Array.from(arr).sort(); return a[Math.min(a.length - 1, Math.floor(q * (a.length - 1)))]; }

// G5 on real terrain: for every (place, heading, clip frame) the planter conforms the frame to ground(x, z) and the clearance of the contact soles is read back; results are binned by the slope of the ground under the figure.
// points: [[x, z], ...]; ground: (x, z) -> height; slopeFn: (ground, x, z, eps, out) -> { deg }; bins: upper edges in degrees
export function demContactStats(planter, clips, ground, points, slopeFn, { headings = 4, frames = 6, bins = [5, 10, 15, 20, 25, 30, 40, 90] } = {}) {
  const rig = planter.rig, fr = rig.newFrame(), f2 = rig.newFrame(), sl = {}, out = bins.map(b => ({ upToDeg: b, n: 0, err: [], before: [] }));
  for (const [x, z] of points) { const deg = slopeFn(ground, x, z, 2, sl).deg; let bi = bins.findIndex(b => deg <= b); if (bi < 0) bi = bins.length - 1;
    for (let h = 0; h < headings; h++) { const yaw = h * 2 * Math.PI / headings + 0.3;
      for (const c of clips) for (let i = 0; i < c.n; i += Math.max(1, Math.floor(c.n / frames))) { sampleClip(c, i / c.fps, fr); const e0 = planter.contactError(fr, ground, x, z, yaw); f2.set(fr); planter.conform(f2, ground, x, z, yaw); const o = {}; planter.contactError(f2, ground, x, z, yaw, o);
        if (o.contacts) { out[bi].n++; out[bi].err.push(o.worst); out[bi].before.push(e0); } } } }
  return out.map(b => ({ upToDeg: b.upToDeg, samples: b.n, beforeP95cm: b.n ? +(percentile(b.before, 0.95) * 100).toFixed(2) : null, afterP50cm: b.n ? +(percentile(b.err, 0.5) * 100).toFixed(3) : null, afterP95cm: b.n ? +(percentile(b.err, 0.95) * 100).toFixed(3) : null, afterMaxcm: b.n ? +(b.err.reduce((m, v) => (v > m ? v : m), 0) * 100).toFixed(3) : null }));
}
// the blade point (bref along the sword prop) of a paired sabre clip at clip time t, in the figure's root frame
export function bladePoint(lib, clipId, t, along = -0.55) {      // the blade is along the sabre prop's -y: the point 0.55 m up the blade from the guard (the hand grips 0.10 m above the guard, so it is 0.65 m from the hand)
  const rig = lib.rig, c = lib.get(clipId), fr = rig.newFrame(), pose = rig.newPose(), fk = rig.newFK(), V = new Float64Array(3), b = rig.idx('prop_sword');
  sampleClip(c, t, fr); rig.expandFrame(fr, pose); rig.fk(pose, fk); qrot(V, 0, fk.wq, b * 4, 0, along, 0); return [fk.wp[b * 3] + V[0], fk.wp[b * 3 + 1] + V[1], fk.wp[b * 3 + 2] + V[2]];
}

// ---- unison (G8 / G-ANIM-23): how alike neighbouring men of a line move. For a line of n men (indices 0..n-1, neighbours k and k+1) playing the same activity, sample six limb angles at `hz` for `seconds`
// (left thigh pitch, right thigh pitch, left upper arm pitch, head yaw, trunk twist (spine1 yaw), the carried piece's pitch) and return the Pearson correlation of each signal between every pair of neighbours, averaged over the pairs.
// A signal that does not move (standard deviation below 0.05 degrees in either man) carries no information about timing and is left out of the mean. `index` is the mean over the signals that move: 1 = every man moves exactly alike, 0 = unrelated.
import { qtoEuler } from './qmath.mjs';
export function unisonIndex(system, unitId, n, { seconds = 20, hz = 30, t0 = 100 } = {}) {
  const rig = system.lib.rig, I = rig.index, names = [['thigh_L', 0], ['thigh_R', 0], ['upperarm_L', 0], ['head', 1], ['spine1', 1], ['prop_long', 0]], slots = names.map(([b]) => rig.coreSlot[I[b]]), N = Math.round(seconds * hz);
  const series = names.map(() => Array.from({ length: n }, () => new Float64Array(N))), fr = rig.newFrame(), e = new Float64Array(3);
  for (let k = 0; k < n; k++) for (let i = 0; i < N; i++) { system.sampleFigure(unitId, k, t0 + i / hz, fr); for (let s = 0; s < names.length; s++) { qtoEuler(e, fr, slots[s] * 4); series[s][k][i] = e[names[s][1]] * 180 / Math.PI; } }
  const corr = (a, b) => { let ma = 0, mb = 0; for (let i = 0; i < N; i++) { ma += a[i]; mb += b[i]; } ma /= N; mb /= N; let sa = 0, sb = 0, sab = 0; for (let i = 0; i < N; i++) { const x = a[i] - ma, y = b[i] - mb; sa += x * x; sb += y * y; sab += x * y; } const da = Math.sqrt(sa / N), db = Math.sqrt(sb / N); if (da < 0.05 || db < 0.05) return null; return sab / N / (da * db); };
  const per = names.map(([b], s) => { let sum = 0, cnt = 0; for (let k = 0; k + 1 < n; k++) { const c = corr(series[s][k], series[s][k + 1]); if (c !== null) { sum += c; cnt++; } } return { signal: b + (names[s][1] ? '.y' : '.x'), pairs: cnt, corr: cnt ? sum / cnt : null }; });
  const moving = per.filter(p => p.corr !== null && p.pairs >= (n - 1) * 0.5), free = moving.filter(p => !/^thigh/.test(p.signal)), mean = l => (l.length ? l.reduce((a, p) => a + p.corr, 0) / l.length : 0);
  // indexFree leaves out the two thighs: in a drilled march the legs are in step by the drill's own rule (all men step off with the left foot, "keep the step"), so their correlation is the documented unison and stays high
  return { index: mean(moving), indexFree: mean(free), signals: per, moving: moving.length };
}
