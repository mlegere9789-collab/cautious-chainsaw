// Procedural black-powder weapon sounds: small-arm reports, cannon discharge, shell flight, bursts and impacts.
// Method (PDF Section S.1 / C.10): a band-limited noise burst with fast attack and exponential decay, a low-frequency thump (pressure step), a directional crack and a diffuse tail.
// Every buffer is mono, deterministic from (sr, seed, kind) and normalized to peak 1.0 = "the peak at the 1 m reference distance"; the planner sets the real level from
// SOURCE_PEAK_DB_1M. Provenance of everything here is 'synthesized' (tier plausible-procedural): shape parameters are the builder's, not measurements of any gun.
import { makeRng, whiteNoise, filt, applyEnv, addInto, normalize, fadeOut, makeLoop, alloc, TAU, clamp, lerp } from './dsp.mjs';

const jitter = (rng, v, pct) => v * (1 + (rng() * 2 - 1) * pct);

/** Exponentially swept sine f0 -> f1 over the buffer with exponential amplitude decay. */
function sweepSine(n, sr, f0, f1, tau, attack = 0.0006, phase0 = 0) {
  const o = new Float32Array(n); let ph = phase0; const k = Math.exp(-1 / (tau * sr)), na = attack * sr;
  for (let i = 0; i < n; i++) { const t = i / sr, f = f1 + (f0 - f1) * Math.exp(-t / (tau * 0.6)); ph += TAU * f / sr; o[i] = Math.sin(ph) * (i < na ? i / na : Math.pow(k, i - na)); }
  return o;
}
const noiseBand = (n, rng, sr, type, fc, Q) => filt(whiteNoise(n, rng), type, fc, Q, sr);

export const SMALL_ARM_KINDS = Object.freeze({
  //                 thump f0 f1  tauT   body fc  tauB   crack hp tauC  tail fc tauTail  cap   hang
  rifle_musket:      { f0: 150, f1: 70, tauT: 0.040, bodyFc: 1000, tauB: 0.060, crackHp: 1600, tauC: 0.018, tailFc: 900,  tauTail: 0.30, cap: 0.20, hang: 0.006, dur: 1.1,  thumpG: 0.2, bodyG: 1.0, crackG: 0.1, tailG: 0.30 },
  smoothbore_musket: { f0: 120, f1: 60, tauT: 0.050, bodyFc: 850,  tauB: 0.080, crackHp: 1300, tauC: 0.020, tailFc: 800,  tauTail: 0.38, cap: 0.20, hang: 0.006, dur: 1.3,  thumpG: 0.26, bodyG: 1.0, crackG: 0.09, tailG: 0.32 },
  carbine:           { f0: 170, f1: 80, tauT: 0.030, bodyFc: 1400, tauB: 0.045, crackHp: 2000, tauC: 0.014, tailFc: 1100, tauTail: 0.20, cap: 0.18, hang: 0.004, dur: 0.8,  thumpG: 0.14, bodyG: 1.0, crackG: 0.14, tailG: 0.26 },
  breechloader:      { f0: 165, f1: 78, tauT: 0.032, bodyFc: 1350, tauB: 0.048, crackHp: 1900, tauC: 0.015, tailFc: 1050, tauTail: 0.22, cap: 0.15, hang: 0.003, dur: 0.85, thumpG: 0.15, bodyG: 1.0, crackG: 0.13, tailG: 0.26 },
  repeater:          { f0: 180, f1: 90, tauT: 0.025, bodyFc: 1600, tauB: 0.035, crackHp: 2200, tauC: 0.012, tailFc: 1200, tauTail: 0.16, cap: 0.0,  hang: 0.0,   dur: 0.7,  thumpG: 0.1, bodyG: 1.0, crackG: 0.16,  tailG: 0.24 },
  revolver:          { f0: 190, f1: 95, tauT: 0.020, bodyFc: 1800, tauB: 0.030, crackHp: 2600, tauC: 0.010, tailFc: 1300, tauTail: 0.12, cap: 0.28, hang: 0.003, dur: 0.5,  thumpG: 0.08, bodyG: 1.0, crackG: 0.18, tailG: 0.22 },
});

/** One small-arm report. Returns { buf, t0 } where t0 is the sample index of the cap snap (0) and the main blast starts hang seconds later. */
export function smallArmShot(sr, seed, kind = 'rifle_musket') {
  const P = SMALL_ARM_KINDS[kind] || SMALL_ARM_KINDS.rifle_musket, rng = makeRng(seed ^ 0x51ed);
  const hang = jitter(rng, P.hang, 0.5), n = Math.round((hang + P.dur) * sr), o = new Float32Array(n), off = Math.round(hang * sr);
  const gT = jitter(rng, 1, 0.12), tauT = jitter(rng, P.tauT, 0.12), tauB = jitter(rng, P.tauB, 0.15), tauC = jitter(rng, P.tauC, 0.15), tauTail = jitter(rng, P.tauTail, 0.2);
  if (P.cap > 0) { // percussion cap snap: a click a few ms before the report
    const cap = applyEnv(noiseBand(Math.round(0.012 * sr), rng, sr, 'bp', 4200, 1.0), sr, 0.00008, 0.0014, P.cap * 1.6); addInto(o, cap, 0, 1);
  }
  const m = n - off;
  const body = applyEnv(noiseBand(m, rng, sr, 'bp', jitter(rng, P.bodyFc, 0.1), 0.8), sr, 0.0004, tauB, P.bodyG);
  const crack = applyEnv(filt(whiteNoise(m, rng), 'hp', P.crackHp, 0.8, sr), sr, 0.00015, tauC, P.crackG);
  const thump = applyEnv(sweepSine(m, sr, jitter(rng, P.f0, 0.08), P.f1, tauT), sr, 0.0, 1e9, P.thumpG * gT);   // sweepSine has its own decay
  const tail = applyEnv(noiseBand(m, rng, sr, 'lp', P.tailFc, 0.7), sr, 0.02, tauTail, P.tailG);
  addInto(o, body, off, 1); addInto(o, crack, off, 1); addInto(o, thump, off, 1); addInto(o, tail, off, 1);
  normalize(o, 1); fadeOut(o, sr, 40);
  return { buf: o, mainAtSamples: off };
}

export const CANNON_KINDS = Object.freeze({
  //                       sweep f0  f1  tauS    lowFc  tauLow  crack  tauCr  rumble tauRum  dur
  napoleon_12pdr:          { f0: 72,  f1: 26, tauS: 0.24, lowFc: 160, tauLow: 0.16, crack: 0.25, tauCr: 0.022, rumbleFc: 220, tauRum: 1.1,  dur: 3.4 },
  rifle_3in:               { f0: 90,  f1: 34, tauS: 0.17, lowFc: 240, tauLow: 0.11, crack: 0.30, tauCr: 0.016, rumbleFc: 260, tauRum: 0.8,  dur: 3.0 },
  parrott_10pdr:           { f0: 88,  f1: 33, tauS: 0.18, lowFc: 230, tauLow: 0.12, crack: 0.30, tauCr: 0.016, rumbleFc: 250, tauRum: 0.85, dur: 3.0 },
  parrott_20pdr:           { f0: 66,  f1: 24, tauS: 0.28, lowFc: 150, tauLow: 0.19, crack: 0.45, tauCr: 0.02,  rumbleFc: 200, tauRum: 1.2,  dur: 3.6 },
  howitzer_12pdr:          { f0: 64,  f1: 28, tauS: 0.2,  lowFc: 140, tauLow: 0.15, crack: 0.12, tauCr: 0.03,  rumbleFc: 190, tauRum: 0.9,  dur: 3.0 },
  howitzer_24pdr:          { f0: 56,  f1: 24, tauS: 0.3,  lowFc: 120, tauLow: 0.2,  crack: 0.1,  tauCr: 0.034, rumbleFc: 170, tauRum: 1.2,  dur: 3.6 },
});

/** Cannon discharge: pressure thump, low blast, crack, rumble tail. */
export function cannonBoom(sr, seed, kind = 'napoleon_12pdr') {
  const P = CANNON_KINDS[kind] || CANNON_KINDS.napoleon_12pdr, rng = makeRng(seed ^ 0xca77);
  const n = Math.round(P.dur * sr), o = new Float32Array(n);
  const sw = sweepSine(n, sr, jitter(rng, P.f0, 0.07), P.f1, jitter(rng, P.tauS, 0.1), 0.003);
  const low = applyEnv(noiseBand(n, rng, sr, 'bp', jitter(rng, P.lowFc * 1.6, 0.1), 0.35), sr, 0.002, jitter(rng, P.tauLow, 0.12), 0.9);
  const crack = applyEnv(filt(whiteNoise(n, rng), 'bp', 2400, 0.5, sr), sr, 0.0003, P.tauCr, P.crack);
  const rumble = applyEnv(noiseBand(n, rng, sr, 'lp', P.rumbleFc, 0.6), sr, 0.03, jitter(rng, P.tauRum, 0.15), 0.35);
  addInto(o, sw, 0, P.sweepG ?? 0.18); addInto(o, low, 0, 1.0); addInto(o, crack, 0, 1); addInto(o, rumble, Math.round(0.02 * sr), 0.6);
  normalize(o, 1); fadeOut(o, sr, 80);
  return { buf: o, mainAtSamples: 0 };
}

/**
 * Stationary texture of a shell in flight, seamless loop. The planner plays it on a moving source: gain follows 1/r, pitch follows Doppler.
 * smooth: round shot / smoothbore shell = rush (no spin tone). rifled: rush plus a spin whine. Spin fundamental is the builder's choice (plausible-procedural).
 */
export function shellFlightLoop(sr, seed, kind = 'smoothbore', seconds = 2.0) {
  const rng = makeRng(seed ^ 0x5e11), n = Math.round(seconds * sr);
  const rush = filt(filt(whiteNoise(n, rng), 'bp', 1100, 0.7, sr), 'peak', 2600, 1.2, sr, 5);
  const rush2 = filt(whiteNoise(n, rng), 'hp', 3200, 0.7, sr);
  const o = new Float32Array(n);
  const am = (t) => 1 + 0.22 * Math.sin(TAU * 4.3 * t) + 0.1 * Math.sin(TAU * 9.1 * t + 1.3);
  for (let i = 0; i < n; i++) o[i] = (rush[i] * 0.8 + rush2[i] * 0.12) * am(i / sr);
  if (kind === 'rifled') {
    const f0 = 190 + rng() * 25; let p1 = 0, p2 = 0;
    for (let i = 0; i < n; i++) { const t = i / sr, f = f0 * (1 + 0.012 * Math.sin(TAU * 0.9 * t)); p1 += TAU * f / sr;
      o[i] += 0.5 * (0.9 * Math.sin(p1 * 3) + 0.7 * Math.sin(p1 * 4 + 0.6) + 0.5 * Math.sin(p1 * 5 + 1.1) + 0.3 * Math.sin(p1 * 6)) * (0.9 + 0.1 * Math.sin(TAU * 2.1 * t));
      p2 += 0; }
  }
  const lp = makeLoop(o, sr, 0.3); normalize(lp, 1); return { buf: lp, loop: true, mainAtSamples: 0 };
}

/** Burst sounds: kind 'common_shell' | 'spherical_case' | 'canister' (the hail of a canister strike, 27 balls) | 'caisson' (explosion). */
export function burstSound(sr, seed, kind = 'common_shell') {
  const rng = makeRng(seed ^ 0xb057);
  if (kind === 'caisson') {
    const n = Math.round(3.2 * sr), o = new Float32Array(n);
    addInto(o, sweepSine(n, sr, 54, 20, 0.35, 0.004), 0, 1);
    addInto(o, applyEnv(noiseBand(n, rng, sr, 'bp', 280, 0.5), sr, 0.004, 0.45, 0.9), 0, 1);
    for (let k = 0; k < 40; k++) addInto(o, applyEnv(noiseBand(Math.round(0.08 * sr), rng, sr, 'hp', 1500 + rng() * 2500, 0.8), sr, 0.0005, 0.012 + rng() * 0.02, 0.18 * rng()), Math.round((0.1 + rng() * 1.8) * sr), 1);
    normalize(o, 1); fadeOut(o, sr, 80); return { buf: o, mainAtSamples: 0 };
  }
  if (kind === 'canister') { // strike on a wall / ground: a hail of 27 separate ticks
    const n = Math.round(0.9 * sr), o = new Float32Array(n);
    for (let k = 0; k < 27; k++) { const f = 900 + rng() * 3200; addInto(o, applyEnv(filt(whiteNoise(Math.round(0.06 * sr), rng, ), 'bp', f, 3, sr), sr, 0.0002, 0.006 + rng() * 0.008, 0.3 + 0.7 * rng()), Math.round(Math.pow(rng(), 1.6) * 0.45 * sr), 1); }
    addInto(o, applyEnv(noiseBand(n, rng, sr, 'lp', 700, 0.7), sr, 0.002, 0.08, 0.5), 0, 1);
    normalize(o, 1); fadeOut(o, sr, 30); return { buf: o, mainAtSamples: 0 };
  }
  if (kind === 'spherical_case') {
    const n = Math.round(2.0 * sr), o = new Float32Array(n);
    addInto(o, applyEnv(filt(whiteNoise(n, rng), 'hp', 1500, 0.7, sr), sr, 0.0002, 0.012, 1.0), 0, 1);
    addInto(o, sweepSine(n, sr, 110, 55, 0.09), 0, 0.8);
    // rush of balls: falling-pitch noise
    const rush = new Float32Array(n); let y1 = 0, y2 = 0; for (let i = 0; i < n; i++) { const t = i / sr, fc = lerp(3200, 700, clamp(t / 0.7, 0, 1)), a = 1 - Math.exp(-TAU * fc / sr); y1 += a * ((rng() * 2 - 1) - y1); y2 += a * (y1 - y2); rush[i] = y2 * Math.exp(-t / 0.35) * clamp(t / 0.03, 0, 1) * 4; }
    addInto(o, rush, Math.round(0.02 * sr), 0.6);
    normalize(o, 1); fadeOut(o, sr, 60); return { buf: o, mainAtSamples: 0 };
  }
  // common shell: dull crump plus a short hum of fragments
  const n = Math.round(1.8 * sr), o = new Float32Array(n);
  addInto(o, sweepSine(n, sr, 82, 36, 0.12, 0.002), 0, 1);
  addInto(o, applyEnv(noiseBand(n, rng, sr, 'bp', 520, 0.6), sr, 0.002, 0.07, 0.9), 0, 1);
  addInto(o, applyEnv(filt(whiteNoise(n, rng), 'bp', 2100, 1.4, sr), sr, 0.001, 0.25, 0.22), Math.round(0.03 * sr), 1);
  normalize(o, 1); fadeOut(o, sr, 60); return { buf: o, mainAtSamples: 0 };
}

/** Impact of a projectile (ball, shot, fragment) on a surface: earth | wood | stone | iron | man | horse | water | air. */
export function impactSound(sr, seed, surface = 'earth') {
  const rng = makeRng(seed ^ 0x1a9c7), n = Math.round(0.9 * sr), o = new Float32Array(n);
  const modes = (freqs, taus, gains, off = 0) => { for (let k = 0; k < freqs.length; k++) { const m = new Float32Array(n); let ph = rng() * TAU; for (let i = 0; i < n; i++) { ph += TAU * freqs[k] / sr; m[i] = Math.sin(ph) * Math.exp(-i / sr / taus[k]); } addInto(o, m, off, gains[k]); } };
  switch (surface) {
    case 'wood': { const fs = [], ts = [], gs = []; for (let k = 0; k < 8; k++) { fs.push(300 + rng() * 2200); ts.push(0.015 + rng() * 0.05); gs.push(0.3 + 0.7 * rng()); } modes(fs, ts, gs); addInto(o, applyEnv(filt(whiteNoise(n, rng), 'bp', 1800, 0.8, sr), sr, 0.0002, 0.01, 0.8), 0, 1); break; }
    case 'stone': { addInto(o, applyEnv(filt(whiteNoise(n, rng), 'hp', 2000, 0.8, sr), sr, 0.00008, 0.004, 1.0), 0, 1); modes([1180 + rng() * 80, 2600 + rng() * 150, 4100 + rng() * 200], [0.09, 0.06, 0.04], [0.5, 0.35, 0.25]); break; }
    case 'iron': { modes([690 + rng() * 40, 1930 + rng() * 60, 3310 + rng() * 80, 4800 + rng() * 120], [0.3, 0.22, 0.15, 0.1], [0.7, 0.5, 0.4, 0.25]); addInto(o, applyEnv(filt(whiteNoise(n, rng), 'hp', 2500, 0.8, sr), sr, 0.0001, 0.004, 0.7), 0, 1); break; }
    case 'man': case 'horse': { const low = surface === 'horse' ? 70 : 110; addInto(o, applyEnv(sweepSine(n, sr, low * 1.4, low * 0.7, 0.04), sr, 0, 1e9, 0.9), 0, 1); addInto(o, applyEnv(noiseBand(n, rng, sr, 'lp', 900, 0.7), sr, 0.001, 0.045, 0.8), 0, 1); break; }
    case 'water': addInto(o, applyEnv(noiseBand(n, rng, sr, 'bp', 1400, 0.5), sr, 0.004, 0.2, 1.0), 0, 1); break;
    case 'air': addInto(o, applyEnv(filt(whiteNoise(n, rng), 'bp', 3000, 1.0, sr), sr, 0.0005, 0.02, 0.4), 0, 1); break;
    case 'earth': default: addInto(o, sweepSine(n, sr, 85, 45, 0.06), 0, 1); addInto(o, applyEnv(noiseBand(n, rng, sr, 'lp', 520, 0.7), sr, 0.001, 0.08, 0.8), 0, 1); addInto(o, applyEnv(filt(whiteNoise(n, rng), 'hp', 2000, 0.8, sr), sr, 0.002, 0.15, 0.12), Math.round(0.01 * sr), 1);
  }
  normalize(o, 1); fadeOut(o, sr, 40); return { buf: o, mainAtSamples: 0 };
}

/** Handling sounds of the loading drill (audio/PLAN.md 3.1 'handling'): tear (paper cartridge torn with the teeth), rammer (the rod drawn or returned in the barrel: a steel ring), ram (rod on the charge), cap (cap pressed on the nipple). Audible only within tens of metres. */
export function handlingSound(sr, seed, kind = 'rammer') {
  const rng = makeRng(seed ^ 0x4a9d), n = Math.round((kind === 'rammer' ? 0.5 : 0.25) * sr), o = new Float32Array(n);
  if (kind === 'tear') { addInto(o, applyEnv(filt(whiteNoise(n, rng), 'bp', 4200, 0.8, sr), sr, 0.002, 0.045, 0.9), 0, 1); for (let k = 0; k < 5; k++) addInto(o, applyEnv(filt(whiteNoise(Math.round(0.02 * sr), rng), 'hp', 3000, 0.8, sr), sr, 0.0002, 0.004, 0.5), Math.round(rng() * 0.08 * sr), 1); }
  else if (kind === 'ram') { addInto(o, sweepSine(n, sr, 150, 80, 0.03), 0, 0.9); addInto(o, applyEnv(filt(whiteNoise(n, rng), 'lp', 1200, 0.7, sr), sr, 0.0005, 0.02, 0.7), 0, 1); }
  else if (kind === 'cap') { addInto(o, applyEnv(filt(whiteNoise(n, rng), 'bp', 4500, 1.2, sr), sr, 0.00005, 0.0016, 1), 0, 1); }
  else { for (const [f, tau, g] of [[1850, 0.09, 0.8], [3150, 0.07, 0.6], [4700, 0.05, 0.4]]) { const m = new Float32Array(n); let ph = rng() * TAU; for (let i = 0; i < n; i++) { ph += TAU * f * (1 + 0.004 * (rng() - 0.5)) / sr; m[i] = Math.sin(ph) * Math.exp(-i / sr / tau); } addInto(o, m, 0, g); } addInto(o, applyEnv(filt(whiteNoise(n, rng), 'hp', 2000, 0.8, sr), sr, 0.0001, 0.006, 0.6), 0, 1); }
  normalize(o, 1); fadeOut(o, sr, 20); return { buf: o, mainAtSamples: 0 };
}
