// Procedural ambience: night insects, dawn birds, rain, thunder, wind. All tier plausible-procedural unless a line says otherwise; they are the "woods without events are
// silent except documented ambient sound (weather, insects, birds ...), otherwise procedural and tagged" rule of PDF Section S.4.
// What is documented about the weather on 1-4 July is in environment/weather_timeline.json (Jacobs readings, secondary): thunderstorm about 18:00 on 3 July, showers on 4 July.
import { makeRng, whiteNoise, pinkNoise, filt, applyEnv, addInto, normalize, fadeOut, makeLoop, TAU, clamp, lerp } from './dsp.mjs';

/** Snowy-tree-cricket chirp rate from temperature, Dolbear's law as usually quoted: T_F = 50 + (N14 - 40)/4, N14 = chirps in 14 s. Inferred (recalled, not sourced here); used only to make the texture faster in warm air. */
export const chirpsPerSecond = (tF) => Math.max(0.5, (4 * (tF - 50) + 40) / 14);

/** Night insect chorus (crickets / katydid-like pulse trains): n insects, carrier 3.6 to 5.4 kHz, chirp rate from the temperature. Loopable. */
export function insectNight(sr, seed, seconds = 12, { tF = 68, n = 9 } = {}) {
  const rng = makeRng(seed ^ 0x1c8e), len = Math.round(seconds * sr), o = new Float32Array(len), rate = chirpsPerSecond(tF);
  for (let k = 0; k < n; k++) {
    const fc = 3600 + rng() * 1800, ph0 = rng(), period = (1 / rate) * (0.85 + rng() * 0.3), chirpLen = 0.10 + rng() * 0.05, pulseHz = 38 + rng() * 14, amp = 0.4 + 0.6 * rng(); let ph = 0;
    for (let i = 0; i < len; i++) { const t = i / sr, c = ((t / period + ph0) % 1) * period; if (c < chirpLen) { const pulse = Math.max(0, Math.sin(TAU * pulseHz * c)); ph += TAU * fc / sr; o[i] += Math.sin(ph) * pulse * amp * Math.min(1, c / 0.01, (chirpLen - c) / 0.01) / Math.sqrt(n); } }
  }
  const lp = makeLoop(o, sr, 0.5); normalize(lp, 1); return { buf: lp, loop: true, mainAtSamples: 0 };
}

/** Dawn / day birdsong: sparse phrases of 3 to 8 short frequency-swept notes between 2 and 6.5 kHz. Procedural; no species claimed. */
export function birdsong(sr, seed, seconds = 14, { density = 0.5 } = {}) {
  const rng = makeRng(seed ^ 0xb12d), len = Math.round(seconds * sr), o = new Float32Array(len);
  const phrases = Math.round(seconds * (0.25 + 0.6 * density));
  for (let p = 0; p < phrases; p++) {
    let t = rng() * (seconds - 2); const notes = 3 + Math.floor(rng() * 6), base = 2200 + rng() * 3200, swing = 0.7 + rng() * 1.2;
    for (let k = 0; k < notes; k++) {
      const dur = 0.05 + rng() * 0.12, f0 = base * (1 + (rng() - 0.5) * 0.5), f1 = f0 * (rng() < 0.5 ? swing : 1 / swing), m = Math.round(dur * sr), at = Math.round(t * sr); let ph = 0;
      for (let i = 0; i < m && at + i < len; i++) { const u = i / m, f = lerp(f0, f1, u); ph += TAU * f / sr; const env = Math.sin(Math.PI * u) ** 1.5; o[at + i] += (Math.sin(ph) + 0.25 * Math.sin(2 * ph)) * env * 0.5; }
      t += dur + 0.03 + rng() * 0.07;
    }
  }
  const lp = makeLoop(o, sr, 0.4); normalize(lp, 1); return { buf: lp, loop: true, mainAtSamples: 0 };
}

/** Rain on open ground: pink noise high-passed, plus random drop ticks; `intensity` 0..1 sets density and level. Loopable. */
export function rainBed(sr, seed, seconds = 10, intensity = 0.5) {
  const rng = makeRng(seed ^ 0x2a11), n = Math.round(seconds * sr);
  const hiss = filt(filt(pinkNoise(n, rng), 'hp', 500, 0.7, sr), 'lp', 7000, 0.7, sr), o = new Float32Array(n);
  for (let i = 0; i < n; i++) o[i] = hiss[i] * (0.25 + 0.75 * intensity);
  const drops = Math.round(seconds * (60 + 700 * intensity));
  for (let k = 0; k < drops; k++) addInto(o, applyEnv(filt(whiteNoise(Math.round(0.02 * sr), rng), 'bp', 2500 + rng() * 3500, 2, sr), sr, 0.0001, 0.003, 0.4 * rng()), Math.floor(rng() * (n - 0.02 * sr)), 1);
  const lp = makeLoop(o, sr, 0.4); normalize(lp, 1); return { buf: lp, loop: true, mainAtSamples: 0 };
}

/** One thunder clap: crackle, then low rumble with reflections, decaying over several seconds. `near` 0..1 sets how sharp the onset is. */
export function thunderRoll(sr, seed, seconds = 9, near = 0.5) {
  const rng = makeRng(seed ^ 0x7d00), n = Math.round(seconds * sr), o = new Float32Array(n);
  for (let k = 0; k < 40; k++) addInto(o, applyEnv(filt(whiteNoise(Math.round(0.05 * sr), rng), 'bp', 700 + rng() * 2600, 1.2, sr), sr, 0.0002, 0.004 + rng() * 0.01, (0.2 + 0.8 * rng()) * (0.3 + near)), Math.floor(rng() * 0.45 * sr), 1);
  const rum = filt(whiteNoise(n, rng), 'lp', 140 + 60 * near, 0.7, sr);
  for (let i = 0; i < n; i++) { const t = i / sr; o[i] += rum[i] * Math.exp(-t / 2.6) * clamp(t / 0.15, 0, 1) * (1.2 + 0.5 * Math.sin(TAU * 0.9 * t + 1) + 0.3 * Math.sin(TAU * 2.1 * t)); }
  normalize(o, 1); fadeOut(o, sr, 200); return { buf: o, mainAtSamples: 0 };
}

/** Wind in open country: pink noise, low-passed higher in stronger wind, with slow gusts. ms = mean wind speed in m/s. Loopable. */
export function windBed(sr, seed, seconds = 12, ms = 2) {
  const rng = makeRng(seed ^ 0x11d5), n = Math.round(seconds * sr), x = filt(pinkNoise(n, rng), 'lp', 200 + 140 * ms, 0.7, sr), o = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / sr; o[i] = x[i] * (0.6 + 0.4 * Math.sin(TAU * 0.13 * t + 0.7) * Math.sin(TAU * 0.07 * t + 2)); }
  const lp = makeLoop(o, sr, 0.5); normalize(lp, 1); return { buf: lp, loop: true, mainAtSamples: 0 };
}
