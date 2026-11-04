// Offline stereo renderer: mixes voice plans into a stereo buffer in plain JavaScript with the same parameters the Web Audio graph uses (gain, biquad low-pass, interaural
// delay and level, Doppler resampling, echo taps). It exists for node tests and for the objective measurements that stand in for listening (arrival time, level, spectrum).
// It is a measurement tool, not the shipped audio path.
import { biquad, TAU } from './dsp.mjs';
import { createBank } from './bank.mjs';

/** Render `voices` (plans from planner.allocate) between t0 and t1 (battle seconds) to { L, R, sr }. */
export function renderOffline(voices, { sr = 44100, t0 = null, t1 = null, bank = null, bedGain = 0, soft = false, trailS = 3 } = {}) {
  const vs = voices.filter((v) => v && !v.culled); if (!vs.length) return { L: new Float32Array(1), R: new Float32Array(1), sr, t0: t0 ?? 0 };
  const start = t0 ?? Math.min(...vs.map((v) => v.tArrive)) - 0.1, end = t1 ?? Math.max(...vs.map((v) => v.tArrive)) + trailS;
  const n = Math.max(1, Math.round((end - start) * sr)), L = new Float32Array(n), R = new Float32Array(n), bk = bank || createBank({ sr });
  for (const v of vs) {
    const s = bk.get(v.soundId, v.variant, { words: v.voiceWords, call: v.call }); if (!s) continue;
    const mkLp = (fc) => { const a = biquad('lp', fc, v.filter.Q, sr), b = v.filter.stages === 2 ? biquad('lp', fc, v.filter.Q, sr) : null; return b ? (x) => b(a(x)) : a; }, rate = Math.max(0.5, Math.min(2, v.doppler?.rate ?? 1));
    const itdS = Math.round(Math.abs(v.pan.itd) * sr), farL = v.pan.itd > 0 ? 1 : 0;     // source on the right (+itd) -> left ear is the far ear
    const at = Math.round((v.tArrive - start) * sr) - (s.mainAtSamples || 0) / rate, g = v.gainLin, buf = s.buf;
    const addTap = (delayS, gain, fcScale = 1) => {
      const lp2 = mkLp(Math.max(200, v.filter.fc * fcScale));
      const m = Math.floor(buf.length / rate);
      for (let k = 0; k < m; k++) {
        const p = k * rate, i0 = Math.floor(p), f = p - i0, x0 = buf[i0] || 0, x1 = buf[i0 + 1] || 0, x = lp2((x0 + (x1 - x0) * f));
        const idx = Math.round(at + delayS * sr) + k; if (idx < 0) continue;
        const iL = idx + (farL ? itdS : 0), iR = idx + (farL ? 0 : itdS);
        if (iL < n) L[iL] += x * g * gain * v.pan.lr[0]; if (iR < n) R[iR] += x * g * gain * v.pan.lr[1];
        if (idx >= n && iL >= n && iR >= n) break;
      }
    };
    addTap(0, 1, 1);
    for (const e of v.echoes || []) addTap(e.delay, e.gainLin, 0.6);
  }
  if (soft) for (let i = 0; i < n; i++) { L[i] = Math.tanh(L[i]); R[i] = Math.tanh(R[i]); }
  return { L, R, sr, t0: start };
}

/** First time (battle seconds) at which |x| exceeds `thr` in a rendered channel. */
export function firstOnset(r, thr = 1e-6, ch = 'L') { const x = r[ch]; for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > thr) return r.t0 + i / r.sr; return null; }
export function peakAbs(x, a = 0, b = x.length) { let m = 0; for (let i = a; i < b && i < x.length; i++) { const v = Math.abs(x[i]); if (v > m) m = v; } return m; }
