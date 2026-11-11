// FX3D core: constants, deterministic hashing, and the analytic puff model. Pure functions of (event, time, wind history): no state, no Math.random, no DOM.
// The CPU functions here are the REFERENCE; the shader code in shaders.mjs is a port of puffState() and sprite sizing, and the browser list compares them.
// Frame: x east, z south, y up (src/geo.mjs, data-contract.md). Time is in seconds on the app clock (clock.mjs minutes * 60).
import { hash4, fmix32 } from '../../../sim/rng.mjs';

export const FX_SEED = 1863;                    // the project seed (src/history/figures.mjs FIGURE_SEED)
export const MIN = 60;
export const TWO_PI_32 = Math.pow(2 * Math.PI, 1.5);
export const MPH = 0.44704, YD = 0.9144, FT = 0.3048;

// ---- deterministic randomness: a draw is addressed by (seed, a, b, stream); identical on every machine (sim/rng.mjs)
export const u01 = (seed, a, b = 0, stream = 0) => hash4(seed >>> 0, a >>> 0, b >>> 0, stream >>> 0) / 4294967296;
export const strHash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return fmix32(h); };
// pseudo-gaussian from three uniforms (sum of 3, centred): bounded in +-3 sigma-ish, cheap enough to port to a shader line for line
export const g3 = (seed, i, k) => ((u01(seed, i, k, 1) + u01(seed, i, k, 2) + u01(seed, i, k, 3)) - 1.5) * 2;       // variance 4 * 3/12 = 1

// ---- erf (Abramowitz and Stegun 7.1.26, |error| < 1.5e-7)
export function erf(x) {
  const s = x < 0 ? -1 : 1, a = Math.abs(x), t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}

// ---- puff record. Fields (all SI): x,y,z centre of emission (y up); t0 emission time (s); mass0 (kg of smoke or dust); sigma0 (m);
//   vx,vy,vz blast velocity in the air frame; tauD its drag relaxation (s); vb0, tauB buoyant rise and its decay; tauDis mass e-folding (s);
//   K, beta diffusion (sigma^2 = s0^2 + 2 K t + beta t^3); vr vertical/horizontal diffusion ratio; settle (m/s); g ground height under the puff (y of the ground, for the reflection).
export const PUFF_DEFAULT = { x: 0, y: 0, z: 0, t0: 0, mass0: 0, sigma0: 1, vx: 0, vy: 0, vz: 0, tauD: 0.2, vb0: 0, tauB: 1, tauDis: 1e9, K: 0, beta: 0, vr: 1, settle: 0, g: 0 };

// Displacement of the air from t0 to t: provided by a Wind (wind.mjs) as wind.displacement(t0, t1) -> [dx, dz]. A constant wind w gives w * (t1 - t0).
export function puffState(p, t, wind, out = {}) {
  const tau = t - p.t0; if (tau < 0) return null;                           // no puff exists before its cause
  const f = 1 - Math.exp(-tau / p.tauD), fb = 1 - Math.exp(-tau / p.tauB);
  const w = wind ? wind.displacement(p.t0, t) : [0, 0];
  out.cx = p.x + w[0] + p.vx * p.tauD * f;
  out.cz = p.z + w[1] + p.vz * p.tauD * f;
  out.cy = p.y + p.vy * p.tauD * f + p.vb0 * p.tauB * fb - p.settle * tau;
  const sh2 = p.sigma0 * p.sigma0 + 2 * p.K * tau + p.beta * tau * tau * tau;
  const sv2 = p.sigma0 * p.sigma0 + p.vr * (2 * p.K * tau + p.beta * tau * tau * tau);
  out.sh = Math.sqrt(sh2); out.sv = Math.sqrt(sv2);
  out.mass = p.mass0 * Math.exp(-tau / p.tauDis);
  out.tau = tau; out.g = p.g;
  if (out.cy < p.g) out.cy = p.g;                                            // dust that has settled lies on the ground (its image term then carries the reflection)
  return out;
}

// Smoke density (kg/m3) at world point (X, Y, Z): Gaussian with the ground as a reflecting plane at y = g (method of images; the integral over the half-space is the mass, exactly).
export function density(s, X, Y, Z) {
  if (Y < s.g) return 0;
  const dx = X - s.cx, dz = Z - s.cz, hz = s.cy - s.g, hy = Y - s.g;
  const nrm = s.mass / (TWO_PI_32 * s.sh * s.sh * s.sv);
  return nrm * Math.exp(-(dx * dx + dz * dz) / (2 * s.sh * s.sh)) * (Math.exp(-((hy - hz) ** 2) / (2 * s.sv * s.sv)) + Math.exp(-((hy + hz) ** 2) / (2 * s.sv * s.sv)));
}

// Optical depth kappa * integral of density along the ray a + s u, s in [0, L], u a unit vector (the ray is taken to stay above the ground). Closed form with erf, image term included.
export function rayOpticalDepth(s, kappa, ax, ay, az, ux, uy, uz, L) {
  const nrm = kappa * s.mass / (TWO_PI_32 * s.sh * s.sh * s.sv);
  let tot = 0;
  for (let im = 0; im < 2; im++) {
    const cy = im === 0 ? s.cy : 2 * s.g - s.cy;
    const dx = ax - s.cx, dy = ay - cy, dz = az - s.cz, ih = 1 / (s.sh * s.sh), iv = 1 / (s.sv * s.sv);
    const A = 0.5 * ((ux * ux + uz * uz) * ih + uy * uy * iv), B = (dx * ux + dz * uz) * ih + dy * uy * iv, C = 0.5 * ((dx * dx + dz * dz) * ih + dy * dy * iv);
    if (A < 1e-30) { tot += Math.exp(-C) * L; continue; }
    const sA = Math.sqrt(A), m = B / (2 * A), E = -(C - B * B / (4 * A));
    tot += Math.exp(E) * Math.sqrt(Math.PI) / (2 * sA) * (erf(sA * (L + m)) - erf(sA * m));
  }
  return nrm * tot;
}

// ---- sprite sizing shared by CPU and shader: a puff of mass m drawn as N sprites. Each sprite carries m/N of the mass spread over a disc of radius rs = SPRITE_K * sigma_h,
// so the sum of the sprites' optical depths (the extinction in the picture) is kappa*m/(pi rs^2) * (1/ N) * N regardless of N: LOD changes the count, never the total opacity.
export const SPRITE_K = 1.25;
export function spriteOpacity(kappa, mass, n, sh) { const rs = SPRITE_K * sh; const od = kappa * (mass / n) / (Math.PI * rs * rs); return { rs, od, alpha: 1 - Math.exp(-od) }; }

// ---- visible lifetime: time until the column optical depth through the puff centre falls below the threshold (bisection; used by the calibration test and the notes)
export function columnOD(p, kappa, t, wind) { const s = puffState(p, t, wind, {}); return s ? kappa * s.mass / (2 * Math.PI * s.sh * s.sh) : Infinity; }
export function visibleLifetime(p, kappa, threshold, wind, tMax = 1200) {
  if (columnOD(p, kappa, p.t0, wind) < threshold) return 0;
  let lo = p.t0, hi = p.t0 + tMax; if (columnOD(p, kappa, hi, wind) >= threshold) return Infinity;
  for (let i = 0; i < 60; i++) { const mid = 0.5 * (lo + hi); if (columnOD(p, kappa, mid, wind) >= threshold) lo = mid; else hi = mid; }
  return lo - p.t0;
}

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---- per-sprite offsets inside an event: the CPU reference of what the shaders compute. seed24 is the event seed masked to 24 bits (exact in float32). Port: shaders.mjs (hash4, g3, u01).
export const seed24 = seed => (seed >>> 0) & 0xffffff;
export function spriteOffsets(seed, i, out = {}) {
  const s = seed24(seed);
  out.gx = g3(s, i, 0); out.gy = g3(s, i, 1); out.gz = g3(s, i, 2); out.size = u01(s, i, 3, 4); out.phase = u01(s, i, 4, 4); return out;
}
