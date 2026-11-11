// Field music: bugle / trumpet calls rendered from a note table, snare drum strokes and rolls, a fife tone.
// A call is a list of notes { n: partial number of the natural harmonic series, d: duration in beats, tongued?: bool } (rests: n = 0). The partial numbers are the bugle's natural notes
// (3 4 5 6 8 over the fundamental C2 = 65.406 Hz give G3 C4 E4 G4 C5, the pitches of the modern bugle in G). The 1863 pitch standard is NOT documented (open gap): the fundamental
// is a parameter. The note TABLES come from data/audio3d/calls.json, which separates what is read from the manuals (names and order of the calls) from what is not (the notation).
import { makeRng, whiteNoise, filt, applyEnv, addInto, normalize, fadeOut, TAU, clamp, lerp } from './dsp.mjs';

export const BUGLE_FUNDAMENTAL_HZ = 65.406;   // C2; partials 3,4,5,6,8 = G3 C4 E4 G4 C5

/** Render a bugle call. tempo in beats per minute. Brass timbre: harmonic stack with a 1.2 kHz formant, 18 ms attack, 3 percent breath noise. */
export function bugleCall(sr, notes, { tempo = 90, fundamental = BUGLE_FUNDAMENTAL_HZ, seed = 1, vibrato = 0.003 } = {}) {
  const rng = makeRng(seed ^ 0xb06e), beat = 60 / tempo, total = notes.reduce((a, x) => a + x.d * beat, 0) + 0.25, n = Math.round(total * sr), o = new Float32Array(n);
  let t = 0;
  for (const nt of notes) {
    const dur = nt.d * beat; if (nt.n > 0) {
      const f0 = fundamental * nt.n, m = Math.round((dur + 0.06) * sr), at = Math.round(t * sr), atk = nt.tongued === false ? 0.04 : 0.018, rel = 0.05; let ph = 0;
      const harm = [1.0, 0.85, 0.7, 0.5, 0.38, 0.25, 0.15, 0.1];
      for (let i = 0; i < m && at + i < n; i++) {
        const u = i / sr, f = f0 * (1 + vibrato * Math.sin(TAU * 5.2 * u) * Math.min(1, u * 4)); ph += TAU * f / sr;
        let s = 0; for (let h = 0; h < harm.length; h++) { const hf = f * (h + 1); if (hf < sr * 0.45) s += harm[h] * Math.sin(ph * (h + 1) + h * 0.3) / (1 + Math.pow(hf / 3500, 2)); }
        const env = Math.min(1, u / atk) * (u < dur ? 1 : Math.max(0, 1 - (u - dur) / rel)) * (0.92 + 0.08 * Math.sin(TAU * 3.1 * u));
        o[at + i] += (s * 0.35 + (rng() * 2 - 1) * 0.03) * env;
      }
    }
    t += dur;
  }
  normalize(o, 1); fadeOut(o, sr, 30); return { buf: o, mainAtSamples: 0, seconds: total };
}

/** One snare stroke: head body + wire rattle. accent 0..1. */
export function snareStroke(sr, seed, accent = 0.7) {
  const rng = makeRng(seed ^ 0xd3a1), n = Math.round(0.28 * sr), o = new Float32Array(n);
  let ph = 0; for (let i = 0; i < n; i++) { ph += TAU * (190 + 40 * Math.exp(-i / sr / 0.01)) / sr; o[i] += Math.sin(ph) * Math.exp(-i / sr / 0.04) * 0.6; }
  addInto(o, applyEnv(filt(whiteNoise(n, rng), 'bp', 2400, 0.5, sr), sr, 0.0002, 0.07, 0.9), 0, 1);
  addInto(o, applyEnv(filt(whiteNoise(n, rng), 'hp', 5000, 0.7, sr), sr, 0.0002, 0.05, 0.35), 0, 1);
  for (let i = 0; i < n; i++) o[i] *= 0.35 + 0.65 * accent;
  fadeOut(o, sr, 10); return o;
}
/** A drum roll of `seconds`: strokes alternate at `rate` per second with jitter; open roll at 10 to 14, closed (buzz) at 24 to 30. Used for the long roll (a sustained roll). */
export function drumRoll(sr, seed, seconds = 2, { rate = 16, crescendo = 0 } = {}) {
  const rng = makeRng(seed ^ 0xd0a1), n = Math.round(seconds * sr), o = new Float32Array(n), strokes = [snareStroke(sr, seed + 1, 0.8), snareStroke(sr, seed + 2, 0.6), snareStroke(sr, seed + 3, 0.7)];
  for (let t = 0; t < seconds; t += (1 / rate) * (0.88 + 0.24 * rng())) addInto(o, strokes[Math.floor(rng() * 3)], Math.round(t * sr), (0.55 + 0.35 * rng()) * (1 + crescendo * (t / seconds - 0.5)));
  normalize(o, 1); fadeOut(o, sr, 60); return { buf: o, mainAtSamples: 0, seconds };
}
/** A pattern of strokes: [{ t: seconds, accent }] (a drum beat as the manuals name them; the rhythm tables are not in the downloaded text, see calls.json). */
export function drumPattern(sr, seed, strokes, tail = 0.3) {
  const last = strokes.reduce((m, s) => Math.max(m, s.t), 0), n = Math.round((last + tail) * sr), o = new Float32Array(n);
  strokes.forEach((s, i) => addInto(o, snareStroke(sr, seed + i * 7, s.accent ?? 0.7), Math.round(s.t * sr), 1));
  normalize(o, 1); return { buf: o, mainAtSamples: 0, seconds: last + tail };
}
/** A fife note: nearly pure tone with a weak octave, breath noise, small vibrato. */
export function fifeNote(sr, freq, dur, seed = 1) {
  const rng = makeRng(seed ^ 0xf1fe), n = Math.round(dur * sr), o = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const u = i / sr; ph += TAU * freq * (1 + 0.004 * Math.sin(TAU * 5.5 * u)) / sr; o[i] = (Math.sin(ph) + 0.2 * Math.sin(2 * ph) + 0.05 * Math.sin(3 * ph) + (rng() * 2 - 1) * 0.04) * Math.min(1, u / 0.02) * Math.min(1, (dur - u) / 0.03); }
  normalize(o, 1); return o;
}
