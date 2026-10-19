// interp/paths.mjs - how a unit moves BETWEEN its authored keyframes.  Every keyframe is a hand-authored Modelled position (no basis field in the
// data); anything between two keyframes is a Modelled interpolation and the Studio labels it so.  Models (registered in builtins.mjs):
//
//   pchip         monotone cubic Hermite (Fritsch-Carlson), per axis: EXACT at every keyframe, never overshoots the box of two consecutive keyframes,
//                 C1 (velocity continuous through a keyframe), so a unit does not stop at every keyframe.  The path may cut a corner (it stays inside
//                 the keyframes' bounding box); the deviation from the straight chord is measured in test/interp.test.mjs.
//   chord-smooth  geography is the straight chord (the polyline through the keyframes, exactly), only the SPEED along it is a monotone cubic of the
//                 cumulative distance ("smooth the clock, never the geography", 04-benchmarks.md principle 3).  Corners stay corners.
//   linear        straight chords at constant speed: the baseline for comparison (velocity jumps at every keyframe).
//
// After the last keyframe a unit holds its position (carry-forward, as the site does); before the first keyframe it does not exist.
// All models share one track interface:   track.at(tau, out) -> out   with out = { present, lat, lng, vLat, vLng, seg, s, moving }
//   seg = index of the keyframe at or before tau (the "current keyframe": strength, disposition and the note belong to it), s = progress inside the segment.

const M_PER_DEG = 111195;

/** Fritsch-Carlson monotone slopes for the data (t[i], y[i]).  endSlopes 'rest' = zero velocity at both ends (a track starts and ends at rest),
 *  'edge' = shape-preserving three-point ends (scipy's PchipInterpolator rule). */
export function pchipSlopes(t, y, endSlopes = 'rest') {
  const n = t.length; const m = new Float64Array(n);
  if (n < 2) return m;
  const h = new Float64Array(n - 1); const d = new Float64Array(n - 1);
  for (let i = 0; i < n - 1; i++) { h[i] = t[i + 1] - t[i]; d[i] = (y[i + 1] - y[i]) / h[i]; }
  if (n === 2) { if (endSlopes === 'edge') { m[0] = d[0]; m[1] = d[0]; } return m; }
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else { const w1 = 2 * h[i] + h[i - 1]; const w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
  }
  if (endSlopes === 'edge') {
    const edge = (h0, h1, d0, d1) => { let s = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1); if (Math.sign(s) !== Math.sign(d0)) s = 0; else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(s) > 3 * Math.abs(d0)) s = 3 * d0; return s; };
    m[0] = edge(h[0], h[1], d[0], d[1]); m[n - 1] = edge(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
  }
  return m;
}

/** cubic Hermite on [t0,t1] at fraction s: returns [value, derivative per unit of t] */
function hermite(y0, y1, m0, m1, h, s) {
  const s2 = s * s; const s3 = s2 * s;
  const v = (2 * s3 - 3 * s2 + 1) * y0 + (s3 - 2 * s2 + s) * h * m0 + (-2 * s3 + 3 * s2) * y1 + (s3 - s2) * h * m1;
  const dv = ((6 * s2 - 6 * s) * y0 + (3 * s2 - 4 * s + 1) * h * m0 + (-6 * s2 + 6 * s) * y1 + (3 * s2 - 2 * s) * h * m1) / h;
  return [v, dv];
}

function segmentOf(T, tau) {
  const n = T.length; if (tau >= T[n - 1]) return n - 1;
  let lo = 0; let hi = n - 1;
  while (lo + 1 < hi) { const mid = (lo + hi) >> 1; if (T[mid] <= tau) lo = mid; else hi = mid; }
  return lo;
}

class BaseTrack {
  /** kfs: [[tick, lat, lng, ...], ...] strictly increasing in tick */
  constructor(kfs) {
    this.n = kfs.length; this.T = new Float64Array(this.n); this.LAT = new Float64Array(this.n); this.LNG = new Float64Array(this.n);
    kfs.forEach((k, i) => { this.T[i] = k[0]; this.LAT[i] = k[1]; this.LNG[i] = k[2]; });
    for (let i = 1; i < this.n; i++) if (!(this.T[i] > this.T[i - 1])) throw new Error('keyframe ticks must be strictly increasing (unit track)');
  }
  get firstTick() { return this.T[0]; }
  get lastTick() { return this.T[this.n - 1]; }
  _rest(out, seg, present) { out.present = present; out.lat = this.LAT[seg]; out.lng = this.LNG[seg]; out.vLat = 0; out.vLng = 0; out.seg = seg; out.s = 0; out.moving = false; return out; }
}

export class PchipTrack extends BaseTrack {
  constructor(kfs, endSlopes = 'rest') { super(kfs); this.mLat = pchipSlopes(this.T, this.LAT, endSlopes); this.mLng = pchipSlopes(this.T, this.LNG, endSlopes); }
  at(tau, out) {
    const { T, n } = this;
    if (tau < T[0]) return this._rest(out, 0, false);
    if (tau >= T[n - 1]) return this._rest(out, n - 1, true);
    const k = segmentOf(T, tau); const h = T[k + 1] - T[k]; const s = (tau - T[k]) / h;
    const a = hermite(this.LAT[k], this.LAT[k + 1], this.mLat[k], this.mLat[k + 1], h, s);
    const b = hermite(this.LNG[k], this.LNG[k + 1], this.mLng[k], this.mLng[k + 1], h, s);
    out.present = true; out.lat = a[0]; out.lng = b[0]; out.vLat = a[1]; out.vLng = b[1]; out.seg = k; out.s = s;
    out.moving = this.LAT[k] !== this.LAT[k + 1] || this.LNG[k] !== this.LNG[k + 1];
    return out;
  }
}

export class LinearTrack extends BaseTrack {
  at(tau, out) {
    const { T, n } = this;
    if (tau < T[0]) return this._rest(out, 0, false);
    if (tau >= T[n - 1]) return this._rest(out, n - 1, true);
    const k = segmentOf(T, tau); const h = T[k + 1] - T[k]; const s = (tau - T[k]) / h;
    out.present = true; out.lat = this.LAT[k] + (this.LAT[k + 1] - this.LAT[k]) * s; out.lng = this.LNG[k] + (this.LNG[k + 1] - this.LNG[k]) * s;
    out.vLat = (this.LAT[k + 1] - this.LAT[k]) / h; out.vLng = (this.LNG[k + 1] - this.LNG[k]) / h; out.seg = k; out.s = s;
    out.moving = out.vLat !== 0 || out.vLng !== 0;
    return out;
  }
}

export class ChordTrack extends BaseTrack {
  constructor(kfs, endSlopes = 'rest') {
    super(kfs);
    const cos = Math.cos(this.LAT[0] * Math.PI / 180);
    this.D = new Float64Array(this.n);
    for (let i = 1; i < this.n; i++) this.D[i] = this.D[i - 1] + Math.hypot((this.LAT[i] - this.LAT[i - 1]) * M_PER_DEG, (this.LNG[i] - this.LNG[i - 1]) * M_PER_DEG * cos);
    this.mD = pchipSlopes(this.T, this.D, endSlopes);
  }
  at(tau, out) {
    const { T, n } = this;
    if (tau < T[0]) return this._rest(out, 0, false);
    if (tau >= T[n - 1]) return this._rest(out, n - 1, true);
    const k = segmentOf(T, tau); const h = T[k + 1] - T[k]; const s = (tau - T[k]) / h;
    const span = this.D[k + 1] - this.D[k];
    let u = 0; let du = 0;
    if (span > 0) { const r = hermite(this.D[k], this.D[k + 1], this.mD[k], this.mD[k + 1], h, s); u = (r[0] - this.D[k]) / span; du = r[1] / span; if (u < 0) u = 0; else if (u > 1) u = 1; }
    const dLat = this.LAT[k + 1] - this.LAT[k]; const dLng = this.LNG[k + 1] - this.LNG[k];
    out.present = true; out.lat = this.LAT[k] + dLat * u; out.lng = this.LNG[k] + dLng * u; out.vLat = dLat * du; out.vLng = dLng * du; out.seg = k; out.s = s; out.moving = span > 0;
    return out;
  }
}

export const newSample = () => ({ present: false, lat: 0, lng: 0, vLat: 0, vLng: 0, seg: 0, s: 0, moving: false });
