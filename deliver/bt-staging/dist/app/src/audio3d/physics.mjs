// Battle Theatre spatial sound: the physics core. Pure functions, no browser API, deterministic, runs in node.
// Frame: x east, y up, z south (the renderer / app frame, see geo.mjs). Time in battle seconds. Distances in metres.
//
// What is here and where it comes from (nothing below is a measurement of 1863; every ASSUMED value is flagged and listed in AUDIO3D-NOTES.md):
//  - speed of sound  c = 331.3 sqrt(1 + T/273.15)   (ideal gas, dry air; same formula as audio/model/acoustics.mjs, tested for equality)
//  - ISO 9613-1 pure-tone air absorption, ISO 9613-2 Table 3 ground effect: the same code as audio/model/acoustics.mjs (a drift test compares the two)
//  - spreading 20 log10(d), exact moving-medium travel time for a uniform wind, Doppler, Woodworth interaural time difference
//  - propagation filter design: all per-band losses (air, ground, diffraction, rain) -> one broadband gain + one biquad low-pass
//
// The plan (audio/PLAN.md section 4) is the reference for every number; the model is checked against analytic values in tests/audio3d.test.mjs.

export const BANDS = Object.freeze([63, 125, 250, 500, 1000, 2000, 4000, 8000]);   // octave centres used for every band computation

/** Speed of sound in dry air, m/s, from deg C. */
export const speedOfSound = (tC) => 331.3 * Math.sqrt(1 + tC / 273.15);
export const fToC = (f) => (f - 32) * 5 / 9;
/** Static pressure in kPa at height h metres above sea level (ISA troposphere). Gettysburg's ground is about 170 m: 99.3 kPa. */
export const pressureKpa = (hM) => 101.325 * Math.pow(1 - 2.25577e-5 * hM, 5.25588);

/** Pure-tone atmospheric absorption, dB per metre (ISO 9613-1). f Hz, tC deg C, RH percent, pKpa kPa. */
export function absorption(f, tC = 25, RH = 60, pKpa = 101.325) {
  const T = tC + 273.15, T0 = 293.15, T01 = 273.16, pr = 101.325, pa = pKpa;
  const C = -6.8346 * Math.pow(T01 / T, 1.261) + 4.6151;
  const h = RH * Math.pow(10, C) / (pa / pr);
  const frO = (pa / pr) * (24 + 4.04e4 * h * (0.02 + h) / (0.391 + h));
  const frN = (pa / pr) * Math.pow(T / T0, -0.5) * (9 + 280 * h * Math.exp(-4.170 * (Math.pow(T / T0, -1 / 3) - 1)));
  return 8.686 * f * f * (1.84e-11 * (pr / pa) * Math.sqrt(T / T0) +
    Math.pow(T / T0, -2.5) * (0.01275 * Math.exp(-2239.1 / T) / (frO + f * f / frO) + 0.1068 * Math.exp(-3352 / T) / (frN + f * f / frN)));
}

/** Ground attenuation in dB for one octave band centre f (ISO 9613-2 Table 3). G 0 hard .. 1 porous; hs, hr heights above ground; d distance (m). */
export function groundAttenuation(f, hs, hr, d, G = 1, Gm = G) {
  const dp = Math.max(d, 1);
  const ap = (h) => 1.5 + 3.0 * Math.exp(-0.12 * (h - 5) ** 2) * (1 - Math.exp(-dp / 50)) + 5.7 * Math.exp(-0.09 * h * h) * (1 - Math.exp(-2.8e-6 * dp * dp));
  const bp = (h) => 1.5 + 8.6 * Math.exp(-0.09 * h * h) * (1 - Math.exp(-dp / 50));
  const cp = (h) => 1.5 + 14.0 * Math.exp(-0.46 * h * h) * (1 - Math.exp(-dp / 50));
  const dq = (h) => 1.5 + 5.0 * Math.exp(-0.9 * h * h) * (1 - Math.exp(-dp / 50));
  const region = (h) => f <= 63 ? -1.5 : f <= 125 ? -1.5 + G * ap(h) : f <= 250 ? -1.5 + G * bp(h) : f <= 500 ? -1.5 + G * cp(h) : f <= 1000 ? -1.5 + G * dq(h) : -1.5 * (1 - G);
  const q = dp > 30 * (hs + hr) ? 1 - 30 * (hs + hr) / dp : 0;
  return region(hs) + region(hr) - 3 * q * (1 - Gm);
}

export const spreadingDb = (d) => 20 * Math.log10(Math.max(d, 1));
export const dbToLin = (db) => Math.pow(10, db / 20);
export const linToDb = (g) => 20 * Math.log10(Math.max(g, 1e-12));
export const powToDb = (p) => 10 * Math.log10(Math.max(p, 1e-30));

/** ASSUMED reference peak levels at 1 m on the muzzle axis, dB re 20 uPa (order of magnitude; see PLAN.md 4.6). Same table as audio/model/acoustics.mjs. */
export const SOURCE_PEAK_DB_1M = Object.freeze({
  rifle_musket: 152, smoothbore_musket: 150, carbine: 148, revolver: 146, napoleon_12pdr: 176, rifle_3in: 176, parrott_10pdr: 174, parrott_20pdr: 180, howitzer_12pdr: 172, howitzer_24pdr: 178,
});
/** Digital full scale is calibrated to this peak SPL (ASSUMED, as in the mixer bench). */
export const FULL_SCALE_DB_SPL = 140;

/** ASSUMED relative octave-band spectra (dB re the loudest band) per source family; used to weight band losses into one broadband gain. */
export const SOURCE_SPECTRUM_DB = Object.freeze({
  //                      63    125   250   500   1k    2k    4k    8k
  small_arm:           [-14,  -8,   -4,   -1,    0,   -3,   -7,  -14],
  cannon:              [  0,  -1,   -4,   -8,  -13,  -19,  -26,  -35],
  howitzer:            [  0,  -1,   -5,   -9,  -14,  -20,  -27,  -36],
  shell_flight:        [-20, -14,  -8,   -3,    0,   -1,   -5,  -12],
  burst:               [ -2,   0,  -3,   -7,  -12,  -18,  -25,  -33],
  impact:              [ -3,   0,  -3,   -8,  -14,  -20,  -27,  -35],
  voice_crowd:         [-30, -20,  -9,   -1,    0,   -4,  -10,  -20],
  voice_single:        [-40, -25,  -9,   -2,    0,   -3,   -9,  -18],
  bugle:               [-60, -40, -20,   -6,    0,   -2,   -8,  -22],
  drum:                [ -4,   0,  -3,   -8,  -13,  -18,  -24,  -32],
  fife:                [-60, -50, -40,  -25,   -6,    0,   -6,  -20],
  hoof:                [ -6,   0,  -2,   -5,  -10,  -16,  -23,  -30],
  wagon:               [ -8,  -3,   0,   -2,   -6,  -10,  -16,  -24],
  ambient_broad:       [ -6,  -4,  -3,   -4,   -6,   -9,  -13,  -20],
  thunder:             [  0,   0,  -3,   -8,  -14,  -22,  -30,  -40],
  insects:             [-60, -50, -40,  -25,  -10,    0,   -4,  -12],
});
const specW = (name) => { const s = SOURCE_SPECTRUM_DB[name] || SOURCE_SPECTRUM_DB.small_arm; const p = s.map((x) => Math.pow(10, x / 10)); const t = p.reduce((a, b) => a + b, 0); return p.map((x) => x / t); };
const _wCache = new Map();
export const spectrumWeights = (name) => { let w = _wCache.get(name); if (!w) { w = specW(name); _wCache.set(name, w); } return w; };

// ------------------------------------------------------------------ atmosphere

/**
 * Build an atmosphere description once per environment state. `wind` is the velocity of the air in the app frame [vx, vz] (m/s, x east, z south).
 * `src` carries the tier/provenance of each parameter so the UI can list it (documented / inferred / default).
 */
export function makeAtmosphere({ tC = 25, RH = 60, pKpa = 99.3, wind = [0, 0], timeWarp = 1, src = {} } = {}) {
  const c = speedOfSound(tC);
  const alphaDbPerM = BANDS.map((f) => absorption(f, tC, RH, pKpa));
  return { tC, RH, pKpa, wind: [wind[0], wind[1]], c, cEff: c * timeWarp, timeWarp, alphaDbPerM, src };
}

/** Velocity (app frame x east, z south) of air that moves TOWARD compass bearing `towardDeg` (0 = north, clockwise) at speed ms. */
export function windToward(towardDeg, ms) { const b = towardDeg * Math.PI / 180; return [Math.sin(b) * ms, -Math.cos(b) * ms]; }
/** Meteorological wind: the compass bearing the wind blows FROM. */
export function windFrom(fromDeg, ms) { return windToward(fromDeg + 180, ms); }
export const mphToMs = (mph) => mph * 0.44704;

/**
 * Travel time of a sound from `src` to `lst` through still air moving with uniform velocity `wind` (exact, not first order):
 * solve |d - w t| = c t for t. For a still atmosphere this is d / c. Positions [x, y, z]; wind [vx, vz]. cEff = c * timeWarp if the clock is warped.
 */
export function travelTime(src, lst, c, wind = [0, 0]) {
  const dx = lst[0] - src[0], dy = lst[1] - src[1], dz = lst[2] - src[2];
  const d2 = dx * dx + dy * dy + dz * dz, wx = wind[0], wz = wind[1], w2 = wx * wx + wz * wz;
  if (w2 < 1e-12) return Math.sqrt(d2) / c;
  const dw = dx * wx + dz * wz, den = c * c - w2;
  return (-dw + Math.sqrt(dw * dw + den * d2)) / den;
}
export const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Retarded arrival time at a listener who moves along `listenerAt(t) -> [x, y, z]`: solve t_a = t_fire + travelTime(src, listenerAt(t_a)).
 * Fixed-point iteration; converges because the listener speed is far below c (contraction factor |v|/c).
 */
export function arrivalTime(tFire, src, listenerAt, c, wind = [0, 0]) {
  let ta = tFire + travelTime(src, listenerAt(tFire), c, wind);
  for (let i = 0; i < 6; i++) { const nx = tFire + travelTime(src, listenerAt(ta), c, wind); if (Math.abs(nx - ta) < 1e-6) { ta = nx; break; } ta = nx; }
  return ta;
}

/** Doppler playback-rate factor: source approaching at vs (m/s, positive toward the listener), listener approaching at vl (positive toward the source). */
export const dopplerFactor = (vs, vl, c) => (c + vl) / (c - vs);
/** Radial speed of a point moving with velocity v toward point b, from point a (positive = a moves toward b). */
export function radialToward(a, v, b) { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], d = Math.hypot(dx, dy, dz) || 1; return (v[0] * dx + v[1] * dy + v[2] * dz) / d; }

// ------------------------------------------------------------------ binaural

/** Woodworth interaural time difference in seconds for a source at azimuth az (rad, 0 front, +pi/2 right), head radius a (m). */
export function itdSeconds(az, c = 343, a = 0.0875) { const th = Math.asin(Math.max(-1, Math.min(1, Math.sin(az)))); return (a / c) * (Math.abs(th) + Math.sin(Math.abs(th))) * Math.sign(th); }
/** Equal-power level split (kept for comparison): [left, right] linear gains for azimuth az. Total silence in the far ear at 90 degrees: not used for rendering. */
export function equalPowerPan(az) { const p = (Math.max(-1, Math.min(1, Math.sin(az))) + 1) * Math.PI / 4; return [Math.cos(p), Math.sin(p)]; }
/** Interaural level difference for the non-HRTF path: near ear 1, far ear down by up to 8 dB at 90 degrees (ASSUMED broadband head shadow; the HRTF path has the measured frequency dependence). Returns [left, right]. */
export function ildGains(az) { const s = Math.sin(az), far = Math.pow(10, -8 * Math.abs(s) / 20); return s >= 0 ? [far, 1] : [1, far]; }
/** Azimuth (rad, + right) and elevation (rad) of a source seen from a listener at lst with yaw (rad, 0 = looking north, clockwise), app frame. */
export function directionFromListener(src, lst, yaw = 0) {
  const dx = src[0] - lst[0], dy = src[1] - lst[1], dz = src[2] - lst[2], horiz = Math.hypot(dx, dz);
  const bearing = Math.atan2(dx, -dz);                                   // compass bearing of the source
  let az = bearing - yaw; az = Math.atan2(Math.sin(az), Math.cos(az));
  return { az, el: Math.atan2(dy, horiz), dist: Math.hypot(dx, dy, dz), bearing };
}
/** Listener-frame unit vector (x right, y up, z back, the Web Audio PannerNode frame where the listener looks down -z). */
export function pannerVector(az, el, r = 1) { return [Math.sin(az) * Math.cos(el) * r, Math.sin(el) * r, -Math.cos(az) * Math.cos(el) * r]; }

// ------------------------------------------------------------------ band losses and the propagation filter

const FIT_FREQS = (() => { const a = []; for (let f = 63; f <= 8000 * 1.01; f *= 2 ** (1 / 3)) a.push(f); return a; })();
const logInterp = (xs, ys, x) => { if (x <= xs[0]) return ys[0]; for (let i = 1; i < xs.length; i++) if (x <= xs[i]) { const t = (Math.log(x) - Math.log(xs[i - 1])) / (Math.log(xs[i]) - Math.log(xs[i - 1])); return ys[i - 1] + (ys[i] - ys[i - 1]) * t; } return ys[ys.length - 1]; };

/** Magnitude in dB of an RBJ biquad low-pass (the Web Audio 'lowpass' BiquadFilter) at frequency f, sample rate sr. */
export function biquadLowpassDb(fc, Q, f, sr = 48000) {
  const w0 = 2 * Math.PI * Math.min(fc, sr * 0.49) / sr, cw = Math.cos(w0), al = Math.sin(w0) / (2 * Q), a0 = 1 + al;
  const b0 = (1 - cw) / 2 / a0, b1 = (1 - cw) / a0, b2 = b0, a1 = -2 * cw / a0, a2 = (1 - al) / a0;
  const w = 2 * Math.PI * f / sr, c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
  const nr = b0 + b1 * c1 + b2 * c2, ni = -(b1 * s1 + b2 * s2), dr = 1 + a1 * c1 + a2 * c2, di = -(a1 * s1 + a2 * s2);
  return 10 * Math.log10((nr * nr + ni * ni) / (dr * dr + di * di));
}
const FC_GRID = (() => { const a = []; for (let f = 180; f <= 16000; f *= 2 ** (1 / 4)) a.push(f); return a; })();
const Q_GRID = [0.5, 0.707, 1.0];
let _lpTable = null;
const lpTable = () => _lpTable || (_lpTable = FC_GRID.flatMap((fc) => Q_GRID.map((Q) => ({ fc, Q, resp: FIT_FREQS.map((f) => biquadLowpassDb(fc, Q, f)) }))));

/**
 * Turn per-band propagation losses (positive dB, one per BANDS entry; air + ground + diffraction + weather, WITHOUT the 1/r spreading)
 * into one broadband gain and a biquad low-pass (one or two stages). `weights` are the source's relative band powers (spectrumWeights).
 *   gainDb : the weighted-power loss, negative number to add to the voice level
 *   fc, Q  : biquad low-pass fitted to the remaining spectral tilt (least squares in dB over 1/3-octave points, power-weighted)
 *   rmsDb  : fit error, reported so a test can bound it
 */
export function designPropagationFilter(lossDb, weights) {
  let p = 0; for (let i = 0; i < lossDb.length; i++) p += weights[i] * Math.pow(10, -lossDb[i] / 10);
  const gainDb = 10 * Math.log10(Math.max(p, 1e-30));
  const wf = FIT_FREQS.map((f) => { let k = 0; for (let i = 1; i < BANDS.length; i++) if (f >= BANDS[i - 1] * 0.99 && f <= BANDS[i] * 1.01) { k = i; break; } return weights[k] + 0.02; });
  const FLOOR = -40;                                  // below 40 dB under the passband nothing is audible next to the passband: errors there are ignored
  const target = FIT_FREQS.map((f) => Math.max(-logInterp(BANDS, lossDb, f) - gainDb, FLOOR));
  let best = null, be = Infinity, ws = 0; for (const w of wf) ws += w;
  for (const stages of [1, 2]) for (const c of lpTable()) { let e = 0; for (let i = 0; i < FIT_FREQS.length; i++) { const m = Math.max(stages * c.resp[i], FLOOR); e += wf[i] * (m - target[i]) ** 2; } e += stages === 2 ? 0.5 * ws : 0; if (e < be) { be = e; best = { ...c, stages }; } }
  const rms = Math.sqrt(Math.max(0, be - (best.stages === 2 ? 0.5 * ws : 0)) / ws);
  return { gainDb, fc: best.fc, Q: best.Q, stages: best.stages, rmsDb: rms, gainLin: dbToLin(gainDb) };
}

/** Air-absorption loss per band at distance d (dB, positive). */
export const airLossDb = (atm, d) => atm.alphaDbPerM.map((a) => a * d);
/** Ground-effect loss per band (dB; ISO 9613-2 Table 3 returns attenuation, can be slightly negative), faded out as the listener rises above the ground (0 at 40 m). */
export function groundLossDb(hs, hr, d, G = 1) {
  const fade = Math.max(0, 1 - Math.max(0, hr - 1.6) / 38.4);
  return BANDS.map((f) => (fade > 0 ? groundAttenuation(f, Math.max(hs, 0.05), Math.max(Math.min(hr, 1.6), 0.05), d, G) * fade : 0));
}

/** Level of a source at the listener, dB peak SPL, for a broadband peak level at 1 m and per-band losses (no filter fit; the analytic reference used by the tests). */
export function peakLevelDb(db1m, d, lossDb, weights) {
  let p = 0; for (let i = 0; i < lossDb.length; i++) p += weights[i] * Math.pow(10, -lossDb[i] / 10);
  return db1m - spreadingDb(d) + 10 * Math.log10(Math.max(p, 1e-30));
}

/** Reference ambient (noise floor) in dB SPL for a quiet rural field at night/day. ASSUMED (typical rural A-weighted 30 to 40 dB); not measured at Gettysburg. */
export const RURAL_NOISE_FLOOR_DB = Object.freeze({ night: 30, day: 38 });

/** The mixer's own estimate of whether a sound is audible at all: peak level against ambient with a masking margin. Returns margin in dB (positive = audible). */
export function audibilityMarginDb(levelDb, ambientDb = RURAL_NOISE_FLOOR_DB.day, detectabilityDb = 0) { return levelDb - (ambientDb + detectabilityDb); }
