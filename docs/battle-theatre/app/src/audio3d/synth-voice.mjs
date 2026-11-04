// Procedural voices: documented command words (reconstruction), crowd shouts (cheer, rebel yell), horses, hooves and wheels.
// Command WORDS are only those printed in the drill manuals (data/audio3d/commands.json cites the drill item for each); no sentence is invented and no
// utterance is presented as a quote. How a 1863 officer sounded is not recorded: pitch, accent and timing here are the builder's (tier plausible-procedural), the words themselves documented.
import { makeRng, whiteNoise, filt, biquad, tunableBp, applyEnv, addInto, normalize, fadeOut, makeLoop, TAU, clamp, lerp } from './dsp.mjs';

// General acoustic-phonetics averages for adult male vowels (Peterson & Barney 1952 order of magnitude): the builder's constants, not read from a source in this session.
const V = { AH: [730, 1090, 2440], EH: [530, 1840, 2480], IH: [390, 1990, 2550], EE: [270, 2290, 3010], OH: [570, 840, 2410], OW: [450, 800, 2400], OO: [300, 870, 2240], AE: [660, 1720, 2410], ER: [490, 1350, 1690], UH: [640, 1190, 2390], AW: [590, 880, 2540], AY1: [730, 1090, 2440], AY2: [390, 1990, 2550] };
// token -> { kind: 'v'|'n'|'f'|'p'|'a', ... }
const PH = {
  AH: { k: 'v', f: V.AH, d: 0.13 }, EH: { k: 'v', f: V.EH, d: 0.11 }, IH: { k: 'v', f: V.IH, d: 0.09 }, EE: { k: 'v', f: V.EE, d: 0.14 }, OW: { k: 'v', f: V.OW, d: 0.16 }, OO: { k: 'v', f: V.OO, d: 0.12 },
  AE: { k: 'v', f: V.AE, d: 0.14 }, ER: { k: 'v', f: V.ER, d: 0.13 }, UH: { k: 'v', f: V.UH, d: 0.1 }, AW: { k: 'v', f: V.AW, d: 0.15 },
  AY: { k: 'd', f: V.AY1, f2: V.AY2, d: 0.2 }, EY: { k: 'd', f: V.EH, f2: V.IH, d: 0.18 },                       // diphthongs glide f -> f2
  M: { k: 'n', f: [250, 1100, 2200], d: 0.08 }, N: { k: 'n', f: [250, 1500, 2400], d: 0.07 }, NG: { k: 'n', f: [250, 1900, 2500], d: 0.09 },
  L: { k: 'a', f: [360, 1300, 2600], d: 0.07 }, R: { k: 'a', f: [350, 1250, 1550], d: 0.07 }, W: { k: 'a', f: [300, 700, 2300], d: 0.06 }, Y: { k: 'a', f: [260, 2200, 3000], d: 0.05 },
  S: { k: 'f', fc: 6500, q: 1.2, d: 0.11 }, SH: { k: 'f', fc: 3600, q: 1.0, d: 0.12 }, F: { k: 'f', fc: 5000, q: 0.5, d: 0.08, w: 0.4 }, H: { k: 'f', fc: 1800, q: 0.4, d: 0.06, w: 0.5 }, Z: { k: 'fv', fc: 6000, q: 1.2, d: 0.09 },
  DH: { k: 'fv', fc: 3000, q: 0.5, d: 0.04 },
  D: { k: 'pv', fc: 2800, d: 0.06 }, B: { k: 'pv', fc: 900, d: 0.06 }, J: { k: 'pv', fc: 3400, d: 0.08 },
  T: { k: 'p', fc: 3200, d: 0.06 }, K: { k: 'p', fc: 1800, d: 0.07 }, P: { k: 'p', fc: 1000, d: 0.06 }, CH: { k: 'p', fc: 3600, d: 0.1 },
  _: { k: 's', d: 0.05 },
};
/** Documented command words -> phoneme strings (modern American; the 1863 accent is not recorded, so this is a reconstruction of the WORDS only). */
export const WORD_PHONES = Object.freeze({
  load: 'L OW D', ready: 'R EH D EE', aim: 'EY M', fire: 'F AY ER', squad: 'S K W AH D', company: 'K UH M P UH N EE', battalion: 'B AE T AE L Y UH N', commence: 'K UH M EH N S',
  cease: 'S EE S', firing: 'F AY ER IH NG', shoulder: 'SH OW L D ER', arms: 'AH R M Z', fix: 'F IH K S', bayonet: 'B EY UH N EH T', charge: 'CH AH R J', rank: 'R AE NG K', rear: 'R EE R',
  front: 'F R UH N T', forward: 'F AW R W ER D', march: 'M AH R CH', halt: 'H AW L T', attention: 'UH T EH N SH UH N', by: 'B AY', file: 'F AY L', wing: 'W IH NG', right: 'R AY T', left: 'L EH F T',
  sponge: 'S P UH N J', ram: 'R AE M', limber: 'L IH M B ER', to: 'T OO', the: 'DH UH', action: 'AE K SH UH N', in: 'IH N', battery: 'B AE T ER EE', guide: 'G AY D', center: 'S EH N T ER',
  trail: 'T R EY L', bayonet2: 'B EY UH N EH T',
});
PH.G = { k: 'pv', fc: 1500, d: 0.06 };

/**
 * Render one word as a parade-ground shout. opts: { f0 (Hz base pitch), stress (0..1.2 duration/loudness), tract (formant scale 0.9..1.1), seed }.
 * Source: glottal pulse train (wide, with 1/f spectrum) -> three parallel formant band-pass filters; consonants are shaped noise and bursts.
 */
export function renderWord(sr, word, { f0 = 150, stress = 1, tract = 1, seed = 1, rise = 0.18 } = {}) {
  const phones = (WORD_PHONES[word] || word).split(/\s+/).filter(Boolean).map((t) => PH[t] || PH._);
  const rng = makeRng(seed ^ 0x70ce);
  const segs = phones.map((p) => ({ ...p, d: p.d * (p.k === 'v' || p.k === 'd' ? stress * 1.25 : 1) }));
  const total = segs.reduce((a, s) => a + s.d, 0), n = Math.round((total + 0.08) * sr), o = new Float32Array(n);
  // formant tracks per sample
  let t0 = 0; const fb = [tunableBp(sr), tunableBp(sr), tunableBp(sr)];
  let ph = 0, f1c = 500, f2c = 1400, f3c = 2400, voiceAmp = 0, lastNoise = 0;
  const tr = [];
  for (const s of segs) { tr.push({ s, a: Math.round(t0 * sr), b: Math.round((t0 + s.d) * sr) }); t0 += s.d; }
  for (let ti = 0; ti < tr.length; ti++) {
    const { s, a, b } = tr[ti], len = Math.max(1, b - a), nextS = tr[ti + 1]?.s;
    for (let i = a; i < b && i < n; i++) {
      const u = (i - a) / len, tAbs = i / sr, prog = i / n;
      const f0i = f0 * (1 + rise * Math.sin(Math.PI * prog) - 0.1 * prog) * (1 + 0.012 * Math.sin(TAU * 5.5 * tAbs));
      let tgt = s.f, voiced = 0, noiseAmp = 0, nfc = 0, nq = 1;
      if (s.k === 'v' || s.k === 'a' || s.k === 'n') { tgt = s.f; voiced = s.k === 'n' ? 0.55 : 1; }
      else if (s.k === 'd') { tgt = [lerp(s.f[0], s.f2[0], u), lerp(s.f[1], s.f2[1], u), lerp(s.f[2], s.f2[2], u)]; voiced = 1; }
      else if (s.k === 'f') { noiseAmp = (s.w || 1) * 0.9; nfc = s.fc; nq = s.q; tgt = [500, 1400, 2400]; }
      else if (s.k === 'fv') { voiced = 0.5; noiseAmp = 0.4; nfc = s.fc; nq = s.q; tgt = [400, 1400, 2400]; }
      else if (s.k === 'p' || s.k === 'pv') { const burstAt = 0.55; if (u < burstAt) { voiced = s.k === 'pv' ? 0.25 : 0; } else { noiseAmp = 1.1 * Math.exp(-(u - burstAt) * 9); nfc = s.fc; nq = 0.9; voiced = s.k === 'pv' ? 0.5 : 0; } tgt = nextS && nextS.f ? nextS.f : [500, 1400, 2400]; }
      else { voiced = 0; }
      // formant glide (one-pole)
      f1c += (tgt[0] * tract - f1c) * 0.004; f2c += (tgt[1] * tract - f2c) * 0.004; f3c += (tgt[2] * tract - f3c) * 0.004;
      if ((i & 15) === 0) { fb[0].tune(f1c, 7); fb[1].tune(f2c, 9); fb[2].tune(f3c, 10); }
      // glottal pulses: sawtooth-ish with a quick closing phase
      ph += f0i / sr; if (ph >= 1) ph -= 1;
      const pulse = ph < 0.62 ? (ph / 0.62) * (2 - ph / 0.62) - 0.2 : 1 - (ph - 0.62) / 0.38 * 1.2 - 0.2;
      const src = pulse * (voiced) * 0.9 + (rng() * 2 - 1) * (voiced ? 0.03 : 0);
      const env = Math.min(1, u * 12, (1 - u) * 14 + (s.k === 'v' || s.k === 'd' ? 0.3 : 0.1));
      voiceAmp += ((s.k === 's' ? 0 : 1) - voiceAmp) * 0.01;
      let y = (fb[0](src) * 1.0 + fb[1](src) * 0.8 + fb[2](src) * 0.5) * env;
      if (noiseAmp > 0) { lastNoise += ((rng() * 2 - 1) - lastNoise) * clamp(2 * Math.PI * nfc / sr, 0, 0.99); y += (rng() * 2 - 1) * noiseAmp * 0.22 * (1 - Math.min(1, nq * 0)) * Math.min(1, u * 8, (1 - u) * 8 + 0.2); }
      o[i] += y * stress;
    }
  }
  normalize(o, 1); fadeOut(o, sr, 15); return o;
}

/** A drill command phrase: words separated by gaps (seconds). Returns { buf, wordStarts:[seconds] }. */
export function commandPhrase(sr, words, { seed = 1, f0 = 150, gaps = null, tract = 1 } = {}) {
  const parts = [], starts = []; let t = 0;
  words.forEach((w, i) => { const b = renderWord(sr, w, { f0, seed: seed + i * 31, stress: i === words.length - 1 ? 1.15 : 1, tract, rise: i === words.length - 1 ? 0.25 : 0.14 }); starts.push(t); parts.push([b, Math.round(t * sr)]); t += b.length / sr + (gaps ? gaps[i] ?? 0.12 : 0.12); });
  const o = new Float32Array(Math.round(t * sr) + 1); for (const [b, off] of parts) addInto(o, b, off, 1); normalize(o, 1); return { buf: o, wordStarts: starts };
}

// ---------------------------------------------------------------- crowds

/**
 * Massed shouting of n men. kind: 'cheer' (a "hurrah"-like two-syllable shout, falling pitch), 'yell' (the Confederate rebel yell: high, shrill, rising, broken; the sources only
 * describe it, there is no recording of 1863, so this is a stylization: plausible-procedural), 'roar' (undifferentiated battle noise of voices).
 * Layers min(n, 28) voices with spread in onset (up to 0.35 s), pitch (+-18%) and vocal tract; more men raise level in the planner, not the layer count.
 */
export function crowdShout(sr, seed, { n = 12, kind = 'cheer', seconds = 3.2 } = {}) {
  const rng = makeRng(seed ^ 0xc20d), N = Math.min(n, 28), len = Math.round(seconds * sr), o = new Float32Array(len);
  for (let v = 0; v < N; v++) {
    const wts = kind === 'yell' ? [0.15, 0.8, 1.6] : [1, 0.8, 0.5];   // the yell is described as shrill: energy shifted to the upper formants
    const onset = rng() * 0.35, f0 = (kind === 'yell' ? 420 : kind === 'roar' ? 170 : 190) * (1 + (rng() * 2 - 1) * 0.18), tract = (0.92 + rng() * 0.18) * (kind === 'yell' ? 1.12 : 1), vib = 4.5 + rng() * 2;
    const dur = (kind === 'yell' ? 1.6 : kind === 'roar' ? 2.2 : 1.1) * (0.85 + rng() * 0.3), m = Math.round(dur * sr), b = new Float32Array(m);
    const fb = [tunableBp(sr), tunableBp(sr), tunableBp(sr)]; let ph = 0, c1 = 600, c2 = 1200, c3 = 2500;
    for (let i = 0; i < m; i++) {
      const u = i / m, t = i / sr;
      let f, vow, amp;
      if (kind === 'yell') { // rising yip with a break, falsetto: "wa - hoo - hoo - whoo" feel, f rises across the call and wobbles
        f = f0 * (0.9 + 0.9 * u) * (1 + 0.04 * Math.sin(TAU * vib * t)) * (u > 0.45 && u < 0.5 ? 1.35 : 1);
        vow = u < 0.25 ? V.OO : u < 0.55 ? V.OH : V.EE; amp = Math.min(1, u * 14) * Math.min(1, (1 - u) * 6) * (u > 0.45 && u < 0.5 ? 0.35 : 1);
      } else if (kind === 'roar') { f = f0 * (1 + 0.12 * Math.sin(TAU * (0.7 + 0.3 * rng()) * t) + 0.04 * Math.sin(TAU * vib * t)); vow = V.AH; amp = Math.min(1, u * 5) * Math.min(1, (1 - u) * 5); }
      else { // "hurrah": short HUH then long RAH, pitch falls
        f = f0 * (1.15 - 0.35 * u) * (1 + 0.025 * Math.sin(TAU * vib * t)); vow = u < 0.18 ? V.UH : V.AH; amp = (u < 0.18 ? 0.55 : 1) * Math.min(1, u * 18) * Math.min(1, (1 - u) * 5);
      }
      c1 += (vow[0] * tract - c1) * 0.004; c2 += (vow[1] * tract - c2) * 0.004; c3 += (vow[2] * tract - c3) * 0.004; if ((i & 31) === 0) { fb[0].tune(c1, 6); fb[1].tune(c2, 8); fb[2].tune(c3, 9); }
      ph += f / sr; if (ph >= 1) ph -= 1; const saw = 2 * ph - 1;
      b[i] = (fb[0](saw) * wts[0] + fb[1](saw) * wts[1] + fb[2](saw) * wts[2]) * amp * 0.5 + (rng() * 2 - 1) * 0.04 * amp;
    }
    addInto(o, b, Math.round(onset * sr), 1 / Math.sqrt(N));
  }
  normalize(o, 1); fadeOut(o, sr, 120); return { buf: o, mainAtSamples: 0 };
}

// ---------------------------------------------------------------- animals and wheeled traffic

/** Whinny: gliding pitch with harmonics and breath (procedural fallback; a CC BY neigh recording is ledgered as FS-18229). */
export function horseWhinny(sr, seed, seconds = 1.8) {
  const rng = makeRng(seed ^ 0x40a5), n = Math.round(seconds * sr), o = new Float32Array(n); let ph = 0; const fb = [biquad('bp', 1400, 4, sr), biquad('bp', 3200, 5, sr)];
  for (let i = 0; i < n; i++) { const u = i / n, f = u < 0.2 ? lerp(700, 1500, u / 0.2) : lerp(1500, 520, (u - 0.2) / 0.8), jit = 1 + 0.05 * Math.sin(TAU * 38 * i / sr) * (u > 0.2 ? 1 : 0.2);
    ph += f * jit / sr; if (ph >= 1) ph -= 1; const s = 2 * ph - 1; const env = Math.min(1, u * 12) * Math.min(1, (1 - u) * 4);
    o[i] = (fb[0](s) * 0.8 + fb[1](s) * 0.4 + (rng() * 2 - 1) * 0.15) * env; }
  normalize(o, 1); fadeOut(o, sr, 80); return { buf: o, mainAtSamples: 0 };
}
export function horseSnort(sr, seed) { const rng = makeRng(seed ^ 0x5a07), n = Math.round(0.5 * sr); const o = applyEnv(filt(filt(whiteNoise(n, rng), 'bp', 900, 0.7, sr), 'lp', 2500, 0.7, sr), sr, 0.03, 0.12, 1); normalize(o, 1); fadeOut(o, sr, 30); return { buf: o, mainAtSamples: 0 }; }

/** One hoof strike on a surface ('earth' | 'road' | 'stone'). */
export function hoofStrike(sr, seed, surface = 'earth') {
  const rng = makeRng(seed ^ 0x40ff), n = Math.round(0.25 * sr), o = new Float32Array(n);
  const f = surface === 'earth' ? 85 : 130; let ph = 0; for (let i = 0; i < n; i++) { ph += TAU * (f * (1 + 0.5 * Math.exp(-i / sr / 0.02))) / sr; o[i] += Math.sin(ph) * Math.exp(-i / sr / (surface === 'earth' ? 0.045 : 0.03)) * 0.9; }
  addInto(o, applyEnv(filt(whiteNoise(n, rng), 'bp', surface === 'earth' ? 700 : 2200, 0.8, sr), sr, 0.0003, surface === 'earth' ? 0.02 : 0.008, surface === 'earth' ? 0.5 : 0.9), 0, 1);
  if (surface !== 'earth') addInto(o, applyEnv(filt(whiteNoise(n, rng), 'hp', 3500, 0.8, sr), sr, 0.0001, 0.004, 0.5), 0, 1);   // shoe on stone
  normalize(o, 1); fadeOut(o, sr, 15); return o;
}
/** Gait timing: strikes per second for the whole animal and the strike offsets inside one stride (fractions). Standard equestrian gaits (inferred; not read from a source here). */
export const GAITS = Object.freeze({
  walk:   { stridePerS: 0.9, beats: [0, 0.25, 0.5, 0.75] },
  trot:   { stridePerS: 1.4, beats: [0, 0.5] },
  canter: { stridePerS: 1.7, beats: [0, 0.33, 0.66] },
  gallop: { stridePerS: 2.2, beats: [0, 0.2, 0.5, 0.7] },
});
/** Texture of n horses at a gait for `seconds`, with per-horse phase and stride jitter (so a squadron is not in lock-step). Returns the mono buffer. */
export function hoofTexture(sr, seed, { gait = 'trot', horses = 6, seconds = 4, surface = 'earth' } = {}) {
  const G = GAITS[gait] || GAITS.trot, rng = makeRng(seed ^ 0x40aa), n = Math.round(seconds * sr), o = new Float32Array(n);
  const strikes = [hoofStrike(sr, seed + 1, surface), hoofStrike(sr, seed + 2, surface), hoofStrike(sr, seed + 3, surface)];
  for (let h = 0; h < Math.min(horses, 40); h++) { const sp = G.stridePerS * (0.92 + rng() * 0.16), ph0 = rng();
    for (let s = -1; s * (1 / sp) < seconds; s++) for (const b of G.beats) { const t = (s + ph0 + b) / sp; if (t < 0 || t >= seconds) continue; addInto(o, strikes[Math.floor(rng() * 3)], Math.round(t * sr), (0.6 + 0.4 * rng()) / Math.sqrt(Math.min(horses, 40))); } }
  normalize(o, 1); return { buf: o, mainAtSamples: 0 };
}
/** Iron-tyred wheels, chains and harness of a limber / caisson / wagon moving on a stony road: loopable rumble, clanks and jingle. */
export function wheelRumble(sr, seed, seconds = 6, { teams = 1 } = {}) {
  const rng = makeRng(seed ^ 0x7e11), n = Math.round(seconds * sr), o = new Float32Array(n);
  const rum = filt(whiteNoise(n, rng), 'lp', 180, 0.7, sr); for (let i = 0; i < n; i++) o[i] = rum[i] * (0.7 + 0.3 * Math.sin(TAU * (2.2 + teams * 0.3) * i / sr));
  const clanks = Math.round(seconds * 3 * (0.6 + teams * 0.4));
  for (let k = 0; k < clanks; k++) { const f = 500 + rng() * 1300; addInto(o, applyEnv(filt(whiteNoise(Math.round(0.12 * sr), rng), 'bp', f, 6, sr), sr, 0.0003, 0.03 + rng() * 0.04, 0.5 + rng() * 0.6), Math.floor(rng() * (n - 0.12 * sr)), 0.35); }
  for (let k = 0; k < Math.round(seconds * 14); k++) addInto(o, applyEnv(filt(whiteNoise(Math.round(0.05 * sr), rng), 'hp', 3200 + rng() * 2500, 2, sr), sr, 0.0001, 0.006, 0.25), Math.floor(rng() * (n - 0.05 * sr)), 0.25);
  const lp = makeLoop(o, sr, 0.4); normalize(lp, 1); return { buf: lp, loop: true, mainAtSamples: 0 };
}
/** Marching feet of a column: dull thuds at the step rate (quick time 110 steps/min, double quick 165: Hardee/Casey, see drill data) with per-man jitter. */
export function marchingFeet(sr, seed, { men = 40, stepsPerMin = 110, seconds = 5 } = {}) {
  const rng = makeRng(seed ^ 0x3a2c), n = Math.round(seconds * sr), o = new Float32Array(n), step = new Float32Array(Math.round(0.12 * sr));
  { const r2 = makeRng(seed + 9); const b = applyEnv(filt(whiteNoise(step.length, r2), 'lp', 450, 0.7, sr), sr, 0.001, 0.025, 1); for (let i = 0; i < step.length; i++) step[i] = b[i]; }
  const per = 60 / stepsPerMin; for (let m = 0; m < Math.min(men, 120); m++) { const j = (rng() - 0.5) * 0.06, ph0 = rng() * per; for (let t = ph0; t < seconds; t += per * (1 + (rng() - 0.5) * 0.04)) addInto(o, step, Math.round((t + j) * sr), (0.5 + 0.5 * rng()) / Math.sqrt(Math.min(men, 120))); }
  normalize(o, 1); return { buf: o, mainAtSamples: 0 };
}
