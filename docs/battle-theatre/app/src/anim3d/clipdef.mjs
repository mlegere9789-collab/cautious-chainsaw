// Clip definitions, baking and sampling.
//  * A ClipDef is authored in code: a function eval(t, spec) that fills a pose Spec for clip time t (gaits, loops, physics-like motions) or a list of keys over the Spec channels (drill motions).
//  * bakeClip() samples a def at a fixed rate through the HumanSolver and stores the frames (Float32, layout = rig.frameLen) in a Clip.
//  * sampleClip() / blendFrames() are the runtime kernels: allocation-free, deterministic, nlerp on quaternions.
// Time is in seconds of CLIP time (the animator maps world time to clip time with a rate).
import { Spec, CH, SPEC_LEN, HumanSolver } from './figure-pose.mjs';
import { qnlerp, clamp, smooth } from './qmath.mjs';

export const EASE = {
  smooth: u => u * u * (3 - 2 * u), linear: u => u, hold: () => 0, fast: u => 1 - (1 - u) * (1 - u), slow: u => u * u,
  snap: u => (u < 0.5 ? 0 : 1), smoother: u => u * u * u * (u * (u * 6 - 15) + 10),
};

// ---- keyed authoring. key(t, {channel: value | [values]}, ease?) ; times in seconds. Channels persist from the previous key (the first key starts from `base`).
export const key = (t, ch, ease = 'smooth') => ({ t, ch, ease });
export class Keyed {
  constructor(base, keys) {
    this.keys = []; const cur = new Float64Array(SPEC_LEN); cur.set(base.v);
    const sorted = keys.slice().sort((a, b) => a.t - b.t);
    for (const k of sorted) { for (const [name, val] of Object.entries(k.ch)) { const c = CH[name]; if (!c) throw new Error('unknown channel ' + name); const vs = Array.isArray(val) ? val : [val]; for (let i = 0; i < c[1]; i++) if (vs[i] !== undefined) cur[c[0] + i] = vs[i]; }
      this.keys.push({ t: k.t, v: Float64Array.from(cur), ease: k.ease || 'smooth' }); }
    this.dur = this.keys.length ? this.keys[this.keys.length - 1].t : 0;
  }
  eval(t, spec) {
    const K = this.keys, n = K.length, v = spec.v;
    if (t <= K[0].t) { v.set(K[0].v); return spec; } if (t >= K[n - 1].t) { v.set(K[n - 1].v); return spec; }
    let i = 0; while (i + 1 < n && K[i + 1].t <= t) i++;
    const a = K[i], b = K[i + 1], u = (t - a.t) / (b.t - a.t), e = EASE[a.ease](u);
    for (let c = 0; c < SPEC_LEN; c++) v[c] = a.v[c] + (b.v[c] - a.v[c]) * e;
    return spec;
  }
}

export class Clip {
  constructor(def, rig, fps, nFrames, data) { this.id = def.id; this.def = def; this.rig = rig; this.fps = fps; this.n = nFrames; this.data = data; this.loop = !!def.loop; this.dur = def.dur; this.frameLen = rig.frameLen; this.meta = def.meta || {}; }
  // stance flags (contact weights) at frame i
  contactAt(i, side) { return this.data[i * this.frameLen + this.rig.OFF_EXTRA + (side ? this.rig.X_CONTR : this.rig.X_CONTL)]; }
}

// bake a def into a Clip. def: { id, dur, loop, fps?, eval(t, spec, ctx) , propB?, meta? }
export function bakeClip(solver, def, fps = def.fps || 60) {
  const rig = solver.rig, spec = new Spec(), N = def.loop ? Math.round(def.dur * fps) : Math.round(def.dur * fps) + 1;
  const data = new Float32Array(N * rig.frameLen); rig.resetChains();
  if (def.loop) for (let rep = 0; rep < 2; rep++) for (let i = 0; i < N; i++) { spec.reset(); def.eval((i / N) * def.dur, spec); solver.solve(spec, def.propB || 'prop_sword'); }      // two warm-up passes: the solver state (swivel, limited-solve variables, prop pull) at the loop seam is the state at the end of the clip
  for (let i = 0; i < N; i++) {
    const t = def.loop ? (i / N) * def.dur : Math.min(def.dur, i / fps);
    spec.reset(); def.eval(t, spec); const f = solver.solve(spec, def.propB || 'prop_sword');
    data.set(f, i * rig.frameLen);
  }
  const clip = new Clip(def, rig, def.loop ? N / def.dur : fps, N, data);
  return clip;
}

// ---- runtime kernels (no allocation). The *At variants read the time / weight from a Float64Array slot so that the hot path never passes a freshly computed double as an argument (a call that V8 does not inline boxes it: 16 bytes).
export function sampleClipAt(clip, ts, ti, out) {
  const rig = clip.rig, L = clip.frameLen, fps = clip.fps, n = clip.n, d = clip.data;
  let x = ts[ti] * fps, i0, i1, f;
  if (clip.loop) { x = x % n; if (x < 0) x += n; i0 = Math.floor(x); f = x - i0; i1 = i0 + 1 >= n ? 0 : i0 + 1; }
  else { if (x <= 0) { i0 = i1 = 0; f = 0; } else if (x >= n - 1) { i0 = i1 = n - 1; f = 0; } else { i0 = Math.floor(x); f = x - i0; i1 = i0 + 1; } }
  const a = i0 * L, b = i1 * L, nc = rig.nCore;
  for (let s = 0; s < nc; s++) { // quaternion nlerp with hemisphere alignment, inlined (no call: nothing to box whatever V8 inlines)
    const o = s * 4, ao = a + o, bo = b + o; let bx = d[bo], by = d[bo + 1], bz = d[bo + 2], bw = d[bo + 3]; const ax = d[ao], ay = d[ao + 1], az = d[ao + 2], aw = d[ao + 3];
    if (ax * bx + ay * by + az * bz + aw * bw < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; } const g = 1 - f; const x = ax * g + bx * f, y = ay * g + by * f, z = az * g + bz * f, w = aw * g + bw * f; const l = Math.sqrt(x * x + y * y + z * z + w * w) || 1;
    out[o] = x / l; out[o + 1] = y / l; out[o + 2] = z / l; out[o + 3] = w / l; }
  for (let k = nc * 4; k < L; k++) out[k] = d[a + k] + (d[b + k] - d[a + k]) * f;
  return out;
}
const _TS = new Float64Array(1);
export function sampleClip(clip, t, out) { _TS[0] = t; return sampleClipAt(clip, _TS, 0, out); }
// out = blend(A, B, w): quaternion nlerp for the core joints, lerp for the rest; out may alias A. blendFramesAt reads w from ws[wi].
export function blendFramesAt(rig, out, A, B, ws, wi) {
  const nc = rig.nCore, L = rig.frameLen, w = ws[wi];
  for (let s = 0; s < nc; s++) {
    const o = s * 4; let bx = B[o], by = B[o + 1], bz = B[o + 2], bw = B[o + 3]; const ax = A[o], ay = A[o + 1], az = A[o + 2], aw = A[o + 3];
    if (ax * bx + ay * by + az * bz + aw * bw < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; } const g = 1 - w; const x = ax * g + bx * w, y = ay * g + by * w, z = az * g + bz * w, ww = aw * g + bw * w; const l = Math.sqrt(x * x + y * y + z * z + ww * ww) || 1;
    out[o] = x / l; out[o + 1] = y / l; out[o + 2] = z / l; out[o + 3] = ww / l; }
  for (let k = nc * 4; k < L; k++) out[k] = A[k] + (B[k] - A[k]) * w;
  return out;
}
export function blendFrames(rig, out, A, B, w) { _TS[0] = w; return blendFramesAt(rig, out, A, B, _TS, 0); }
export const clamp01 = x => clamp(x, 0, 1);
export { smooth };

// a key that sets EVERY channel from a Spec (used for transitions between named poses)
import { CHANNEL_NAMES } from './figure-pose.mjs';
export function keyFromSpec(t, spec, ease = 'smooth') {
  const ch = {}; for (const n of CHANNEL_NAMES) { const [o, l] = CH[n]; ch[n] = Array.from(spec.v.slice(o, o + l)); } return { t, ch, ease };
}
// a def from keys: base spec + keys (+ optional post function adding procedural motion)
export function keyedDef({ id, dur, loop = false, base, keys, propB = 'prop_sword', family, meta = {}, fps = 60, post = null }) {
  const kd = new Keyed(base, keys);
  return { id, dur: dur ?? kd.dur, loop, fps, propB, family, meta, eval: (t, spec) => { kd.eval(t, spec); if (post) post(t, spec); return spec; } };
}
