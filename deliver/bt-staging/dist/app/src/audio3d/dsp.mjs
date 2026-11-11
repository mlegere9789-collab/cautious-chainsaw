// Small deterministic DSP toolkit used by the procedural synthesis (synth-*.mjs) and by the offline mixer. Plain Float32Array code, no browser API.
import { makeRng } from './rng.mjs';

export const TAU = 2 * Math.PI;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const db2lin = (db) => Math.pow(10, db / 20);
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export const alloc = (sr, seconds) => new Float32Array(Math.max(1, Math.round(seconds * sr)));

/** RBJ biquad as a closure-per-sample processor. type: 'lp' | 'hp' | 'bp' (constant 0 dB peak gain) | 'peak' | 'lowshelf'. */
export function biquad(type, fc, Q, sr, gainDb = 0) {
  const w0 = TAU * clamp(fc, 10, sr * 0.49) / sr, cw = Math.cos(w0), sw = Math.sin(w0), al = sw / (2 * Q), A = Math.pow(10, gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
  else if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
  else if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
  else if (type === 'peak') { b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A; }
  else if (type === 'lowshelf') { const sa = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) - (A - 1) * cw + sa); b1 = 2 * A * ((A - 1) - (A + 1) * cw); b2 = A * ((A + 1) - (A - 1) * cw - sa); a0 = (A + 1) + (A - 1) * cw + sa; a1 = -2 * ((A - 1) + (A + 1) * cw); a2 = (A + 1) + (A - 1) * cw - sa; }
  else throw new Error('biquad type ' + type);
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const f = (x) => { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  f.reset = () => { x1 = x2 = y1 = y2 = 0; };
  return f;
}
/** Band-pass biquad whose centre can be re-tuned while running without losing its state (for formant glides). */
export function tunableBp(sr) {
  let b0 = 0, b2 = 0, a1 = 0, a2 = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const f = (x) => { const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  f.tune = (fc, Q) => { const w0 = TAU * clamp(fc, 20, sr * 0.45) / sr, al = Math.sin(w0) / (2 * Q), a0 = 1 + al; b0 = al / a0; b2 = -al / a0; a1 = -2 * Math.cos(w0) / a0; a2 = (1 - al) / a0; };
  f.tune(1000, 5); return f;
}
/** Apply a processor to a buffer, returning a new buffer. */
export function run(buf, proc) { const o = new Float32Array(buf.length); for (let i = 0; i < buf.length; i++) o[i] = proc(buf[i]); return o; }
export const filt = (buf, type, fc, Q, sr, gainDb) => run(buf, biquad(type, fc, Q, sr, gainDb));
export function onePoleLp(buf, fc, sr) { const a = 1 - Math.exp(-TAU * fc / sr); const o = new Float32Array(buf.length); let y = 0; for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); o[i] = y; } return o; }

export function whiteNoise(n, rng) { const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = rng() * 2 - 1; return o; }
/** Pink noise (Paul Kellet's economy filter), roughly -3 dB per octave. */
export function pinkNoise(n, rng) { const o = new Float32Array(n); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0; for (let i = 0; i < n; i++) { const w = rng() * 2 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.96900 * b2 + w * 0.1538520; b3 = 0.86650 * b3 + w * 0.3104856; b4 = 0.55000 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.0168980; o[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; } return o; }

/** Envelope: linear attack then exponential decay (tau seconds). Returns a function of sample index. */
export const envAD = (sr, attack, tau) => { const na = Math.max(1, attack * sr), k = Math.exp(-1 / (tau * sr)); return (i) => (i < na ? i / na : Math.pow(k, i - na)); };
export function applyEnv(buf, sr, attack, tau, gain = 1) { const e = envAD(sr, attack, tau); for (let i = 0; i < buf.length; i++) buf[i] *= gain * e(i); return buf; }
/** Add `src` into `dst` starting at sample `off` with gain g (clipped to dst length). */
export function addInto(dst, src, off = 0, g = 1) { const o = Math.max(0, Math.round(off)); for (let i = 0; i < src.length && o + i < dst.length; i++) dst[o + i] += src[i] * g; return dst; }
export function peakOf(buf) { let m = 0; for (let i = 0; i < buf.length; i++) { const a = Math.abs(buf[i]); if (a > m) m = a; } return m; }
export function rmsOf(buf, a = 0, b = buf.length) { let s = 0; for (let i = a; i < b; i++) s += buf[i] * buf[i]; return Math.sqrt(s / Math.max(1, b - a)); }
/** Normalize so the peak is `target` (default 1.0 = "peak at the reference distance"). */
export function normalize(buf, target = 1) { const p = peakOf(buf); if (p > 0) { const g = target / p; for (let i = 0; i < buf.length; i++) buf[i] *= g; } return buf; }
/** Fade the last `ms` milliseconds to zero so a finished buffer never ends in a click. */
export function fadeOut(buf, sr, ms = 20) { const n = Math.min(buf.length, Math.round(ms * sr / 1000)); for (let i = 0; i < n; i++) buf[buf.length - 1 - i] *= i / n; return buf; }
/** Make a loop seamless by cross-fading the last `xf` seconds into the first `xf` seconds. Returns a buffer shortened by xf. */
export function makeLoop(buf, sr, xf = 0.25) {
  const n = Math.round(xf * sr), L = buf.length - n, o = buf.slice(0, L);
  for (let i = 0; i < n; i++) { const t = i / n; o[i] = o[i] * t + buf[L + i] * (1 - t); }
  return o;
}
/** Sum a list of [buffer, offsetSamples, gain]. */
export function mixDown(parts, length) { const o = new Float32Array(length); for (const [b, off, g] of parts) addInto(o, b, off, g ?? 1); return o; }

// ---- spectrum (for the objective measurements that stand in for listening) -----------------------------------------------------------------
/** Magnitude spectrum by a radix-2 FFT of a Hann-windowed block. Returns { freqs, mag } (linear amplitude). */
export function spectrum(buf, sr, start = 0, n = 4096) {
  let N = 1; while (N < n) N <<= 1;
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) { const x = start + i < buf.length ? buf[start + i] : 0; re[i] = x * (0.5 - 0.5 * Math.cos(TAU * i / (N - 1))); }
  for (let i = 1, j = 0; i < N; i++) { let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { const t = re[i]; re[i] = re[j]; re[j] = t; } }
  for (let len = 2; len <= N; len <<= 1) { const ang = -TAU / len, wr = Math.cos(ang), wi = Math.sin(ang); for (let i = 0; i < N; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr; re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } }
  const half = N / 2, mag = new Float64Array(half), freqs = new Float64Array(half);
  for (let k = 0; k < half; k++) { mag[k] = Math.hypot(re[k], im[k]) / N * 4; freqs[k] = k * sr / N; }
  return { freqs, mag, N };
}
/** Octave-band levels (dB re 1.0 full scale amplitude, power sum inside each band) of a buffer segment, for the bands in `bands`. */
export function octaveBandsDb(buf, sr, bands = [63, 125, 250, 500, 1000, 2000, 4000, 8000], start = 0, n = 8192) {
  const { freqs, mag } = spectrum(buf, sr, start, n);
  return bands.map((fc) => { let p = 0; for (let k = 1; k < freqs.length; k++) if (freqs[k] >= fc / Math.SQRT2 && freqs[k] < fc * Math.SQRT2) p += mag[k] * mag[k]; return 10 * Math.log10(p + 1e-20); });
}
export function spectralCentroid(buf, sr, start = 0, n = 8192) { const { freqs, mag } = spectrum(buf, sr, start, n); let a = 0, b = 0; for (let k = 1; k < freqs.length; k++) { a += freqs[k] * mag[k]; b += mag[k]; } return b > 0 ? a / b : 0; }
export { makeRng };

/**
 * Same measurement as audio/mixer-bench/tools/analyze-pilot.mjs (so synthesized and recorded sounds can be compared on one scale): Hann 4096 frames, hop 2048, averaged power spectrum of the
 * loudest `win` seconds. Returns { centroidHz (power weighted), rolloff95Hz, bandsDb (octave bands), startSample }.
 */
export function measureSpectrum(buf, sr, win = 0.4) {
  const w = Math.min(buf.length, Math.round(win * sr)), hop = Math.max(256, w >> 4); let best = -1, bs = 0;
  for (let s = 0; s + w <= buf.length; s += hop) { const r = rmsOf(buf, s, s + w); if (r > best) { best = r; bs = s; } }
  const N = 4096, P = new Float64Array(N / 2); let cnt = 0;
  for (let o = bs; o + N <= Math.min(buf.length, bs + w) || cnt === 0; o += N / 2) { const sp = spectrum(buf, sr, o, N); for (let k = 0; k < N / 2; k++) P[k] += sp.mag[k] * sp.mag[k]; cnt++; if (o + N > buf.length) break; }
  let tot = 0, cen = 0; for (let k = 1; k < N / 2; k++) { tot += P[k]; cen += P[k] * k * sr / N; }
  let acc = 0, r95 = 0; for (let k = 1; k < N / 2; k++) { acc += P[k]; if (acc >= 0.95 * tot) { r95 = k * sr / N; break; } }
  const bands = [63, 125, 250, 500, 1000, 2000, 4000, 8000].map((fc) => { let p = 0; for (let k = 1; k < N / 2; k++) { const f = k * sr / N; if (f >= fc / Math.SQRT2 && f < fc * Math.SQRT2) p += P[k]; } return 10 * Math.log10(p / cnt + 1e-20); });
  return { centroidHz: tot > 0 ? cen / tot : 0, rolloff95Hz: r95, bandsDb: bands, startSample: bs };
}
