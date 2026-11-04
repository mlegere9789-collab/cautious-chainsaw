// Wind for smoke, dust and fire plumes. velocity(t) is a pure function of time (mean wind from the environment layer + deterministic gusts); displacement(t0, t1) is the EXACT integral
// of the piecewise-linear wind sampled every DT seconds, so a puff's advection is a difference of two lookups and needs no simulation state (scrub-safe).
// Frame: x east, z south (src/geo.mjs). A wind FROM bearing b (0 = north, clockwise) blows toward b + 180: v = speed * (-sin b, +cos b) in (x, z).
import { u01, smooth, clamp } from './core.mjs';

const DT = 10;                       // seconds between wind samples
export const windVector = (speed, fromDeg) => { const b = fromDeg * Math.PI / 180; return [-speed * Math.sin(b), speed * Math.cos(b)]; };
export const windFromDeg = (vx, vz) => (Math.atan2(vx, -vz) * 180 / Math.PI + 360) % 360;   // inverse: bearing the wind comes from

// smooth value noise in [-1, 1] with correlation time `corr` seconds
function vnoise(seed, stream, t, corr) {
  const x = t / corr, i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f);
  const a = u01(seed, i, stream, 7) * 2 - 1, b = u01(seed, i + 1, stream, 7) * 2 - 1;
  return a + (b - a) * s;
}

export class Wind {
  // mean(t) -> { speed (m/s), fromDeg, fromLoDeg?, fromHiDeg?, gustBoost? }.  opts: seed, gustAmp, corrS, meanderDeg, origin (s)
  constructor(mean, opts = {}) {
    this.mean = mean; this.seed = opts.seed >>> 0; this.gustAmp = opts.gustAmp ?? 0; this.corr = opts.corrS ?? 25; this.meander = opts.meanderDeg ?? 0; this.origin = opts.origin ?? 0;
    // cum[2k], cum[2k+1] = integral from origin to node k of the piecewise-linear velocity (x and z)
    this.cum = new Float64Array(2 << 14); this.vx = new Float64Array(1 << 14); this.vz = new Float64Array(1 << 14); this.have = -1; this._sa = [0, 0]; this._sb = [0, 0];
  }
  static constant(vx, vz) { const w = new Wind(() => ({ speed: 0, fromDeg: 0 }), { seed: 0 }); w.velocity = () => [vx, vz]; w.constant = [vx, vz]; return w; }
  velocity(t, out = [0, 0]) {
    const m = this.mean(t); let sp = m.speed, from = m.fromDeg;
    if (this.gustAmp > 0 && sp > 0) sp *= Math.max(0, 1 + this.gustAmp * (m.gustBoost || 1) * vnoise(this.seed, 1, t, this.corr));
    if (m.fromLoDeg != null && m.fromHiDeg != null) from = m.fromLoDeg + (m.fromHiDeg - m.fromLoDeg) * (0.5 + 0.5 * vnoise(this.seed, 2, t, this.corr * 12));
    if (this.meander) from += this.meander * vnoise(this.seed, 3, t, this.corr * 3);
    const v = windVector(sp, from); out[0] = v[0]; out[1] = v[1]; return out;
  }
  _grow(k) {
    if (k + 2 >= this.vx.length) { const n = Math.max(k + 2, this.vx.length * 2); const vx = new Float64Array(n), vz = new Float64Array(n), cum = new Float64Array(2 * n); vx.set(this.vx); vz.set(this.vz); cum.set(this.cum); this.vx = vx; this.vz = vz; this.cum = cum; }
    const tmp = [0, 0];
    while (this.have < k + 1) {
      const j = this.have + 1; this.velocity(this.origin + j * DT, tmp); this.vx[j] = tmp[0]; this.vz[j] = tmp[1];
      if (j === 0) { this.cum[0] = 0; this.cum[1] = 0; } else { this.cum[2 * j] = this.cum[2 * (j - 1)] + 0.5 * (this.vx[j - 1] + this.vx[j]) * DT; this.cum[2 * j + 1] = this.cum[2 * (j - 1) + 1] + 0.5 * (this.vz[j - 1] + this.vz[j]) * DT; }
      this.have = j;
    }
  }
  // integral of the wind velocity from origin to t
  _D(t, out) {
    if (this.constant) { out[0] = this.constant[0] * (t - this.origin); out[1] = this.constant[1] * (t - this.origin); return out; }
    const x = (t - this.origin) / DT, k = Math.max(0, Math.floor(x)); this._grow(k + 1);
    const tau = (t - this.origin) - k * DT, ax = (this.vx[k + 1] - this.vx[k]) / DT, az = (this.vz[k + 1] - this.vz[k]) / DT;
    out[0] = this.cum[2 * k] + this.vx[k] * tau + 0.5 * ax * tau * tau; out[1] = this.cum[2 * k + 1] + this.vz[k] * tau + 0.5 * az * tau * tau; return out;
  }
  displacement(t0, t1, out = [0, 0]) { const a = this._D(t0, this._sa), b = this._D(t1, this._sb); out[0] = b[0] - a[0]; out[1] = b[1] - a[1]; return out; }
  // Table for the shader: the wind travel over the last ages[k] seconds, ending at tNow (geometric age spacing so a lookup is one log). Float32 pairs (dx, dz).
  history(tNow, out = new Float32Array(2 * WIND_HIST_N)) {
    const e = this._D(tNow, [0, 0]), a = [0, 0];
    for (let k = 0; k < WIND_HIST_N; k++) { this._D(tNow - windAge(k), a); out[2 * k] = e[0] - a[0]; out[2 * k + 1] = e[1] - a[1]; }
    return out;
  }
}
export const WIND_HIST_N = 256, WIND_AGE0 = 0.5, WIND_AGE_R = 1.03;
export const windAge = k => (k === 0 ? 0 : WIND_AGE0 * Math.pow(WIND_AGE_R, k - 1));          // age 0, then 0.5 s growing 3 percent per step: the last is about 1,100 s
// what the shader does with the table: displacement for a given age by log-index and linear interpolation (the CPU twin, tested against displacement())
export function windFromHistory(h, age, out = [0, 0]) {
  if (age <= 0) { out[0] = 0; out[1] = 0; return out; }
  let f = age <= WIND_AGE0 ? age / WIND_AGE0 : 1 + Math.log(age / WIND_AGE0) / Math.log(WIND_AGE_R);
  f = Math.min(f, WIND_HIST_N - 1.0001); const k = Math.floor(f), s = f - k;
  out[0] = h[2 * k] + (h[2 * k + 2] - h[2 * k]) * s; out[1] = h[2 * k + 1] + (h[2 * k + 3] - h[2 * k + 1]) * s; return out;
}
export { smooth, clamp };
