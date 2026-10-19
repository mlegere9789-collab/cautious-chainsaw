// Battle Theatre outdoor sound-propagation model. Pure functions, no dependencies; the mixer bench imports the tables from here.
// Formulas: ISO 9613-1:1993 (pure-tone atmospheric absorption) and ISO 9613-2:1996 (ground effect, general method, Table 3),
// both written from the published equations; the standards are paywalled, so the check values in model/check.mjs are the
// only verification done (see PLAN.md section 4). Everything with "ASSUMED" is a model parameter, not a measurement.

/** Speed of sound in dry air, m/s, from temperature in deg C (ideal-gas formula; humidity adds about +0.1 percent at 30 C, 70 percent RH). */
export const speedOfSound = (tC) => 331.3 * Math.sqrt(1 + tC / 273.15);

/** Pure-tone atmospheric absorption, dB per metre (ISO 9613-1). f Hz, T deg C, RH percent, p kPa. */
export function absorption(f, tC = 25, RH = 60, pKpa = 101.325) {
  const T = tC + 273.15, T0 = 293.15, T01 = 273.16, pr = 101.325, pa = pKpa;
  const C = -6.8346 * Math.pow(T01 / T, 1.261) + 4.6151;
  const h = RH * Math.pow(10, C) / (pa / pr);                       // molar concentration of water vapour, percent
  const frO = (pa / pr) * (24 + 4.04e4 * h * (0.02 + h) / (0.391 + h));
  const frN = (pa / pr) * Math.pow(T / T0, -0.5) * (9 + 280 * h * Math.exp(-4.170 * (Math.pow(T / T0, -1 / 3) - 1)));
  const a = 8.686 * f * f * (1.84e-11 * (pr / pa) * Math.sqrt(T / T0) +
    Math.pow(T / T0, -2.5) * (0.01275 * Math.exp(-2239.1 / T) / (frO + f * f / frO) + 0.1068 * Math.exp(-3352 / T) / (frN + f * f / frN)));
  return a;
}

/** Ground attenuation A_gr in dB for one octave band centre f (ISO 9613-2 Table 3), grass-like ground G (0 hard .. 1 porous), source height hs, receiver height hr, distance d (m). */
export function groundAttenuation(f, hs, hr, d, G = 1, Gm = G) {
  const dp = Math.max(d, 1);
  const ap = (h) => 1.5 + 3.0 * Math.exp(-0.12 * (h - 5) ** 2) * (1 - Math.exp(-dp / 50)) + 5.7 * Math.exp(-0.09 * h * h) * (1 - Math.exp(-2.8e-6 * dp * dp));
  const bp = (h) => 1.5 + 8.6 * Math.exp(-0.09 * h * h) * (1 - Math.exp(-dp / 50));
  const cp = (h) => 1.5 + 14.0 * Math.exp(-0.46 * h * h) * (1 - Math.exp(-dp / 50));
  const dq = (h) => 1.5 + 5.0 * Math.exp(-0.9 * h * h) * (1 - Math.exp(-dp / 50));
  const region = (h) => f <= 63 ? -1.5 : f <= 125 ? -1.5 + G * ap(h) : f <= 250 ? -1.5 + G * bp(h) : f <= 500 ? -1.5 + G * cp(h) : f <= 1000 ? -1.5 + G * dq(h) : -1.5 * (1 - G);
  const q = dp > 30 * (hs + hr) ? 1 - 30 * (hs + hr) / dp : 0;
  return region(hs) + region(hr) - 3 * q * (1 - Gm);                  // A_s + A_r + A_m
}

/** Geometric spreading, dB: 20 log10(d / 1 m). */
export const spreadingDb = (d) => 20 * Math.log10(Math.max(d, 1));

/** One-pole low-pass |H(f)| in dB for the digital form y += a (x - y), at sample rate sr. */
export function onePoleDb(a, f, sr) { const w = 2 * Math.PI * f / sr, b = 1 - a; return 10 * Math.log10(a * a / (1 - 2 * b * Math.cos(w) + b * b)); }

/** Two cascaded identical one-poles, fitted by least squares in dB (250 Hz to 8 kHz, weight 1/f^0.5) to the air absorption at distance d. Returns coefficient a. */
export function fitAirLowpass(d, { tC = 25, RH = 60, sr = 48000 } = {}) {
  const fs = []; for (let f = 250; f <= 8000; f *= 2 ** (1 / 3)) fs.push(f);
  const target = fs.map(f => Math.max(-absorption(f, tC, RH) * d, -50));
  let best = 1, be = 1e18;
  for (let a = 1; a > 0.004; a *= 0.97) { let e = 0; for (let i = 0; i < fs.length; i++) { const m = Math.max(2 * onePoleDb(a, fs[i], sr), -50); e += (m - target[i]) ** 2 / Math.sqrt(fs[i]); } if (e < be) { be = e; best = a; } }
  return { a: best, rms: Math.sqrt(be / fs.length) };
}

/** Build the distance tables the worklet uses: step metres, n entries. lpTab[i] = per-pole coefficient, gndLin[i] = linear gain of the ground effect (mean of octave bands 125..1000 Hz weighted by a musket-like spectrum). */
export function buildTables({ step = 10, n = 800, tC = 25, RH = 60, sr = 48000, hs = 1.5, hr = 1.6, G = 1 } = {}) {
  const lpTab = new Float32Array(n), gndLin = new Float32Array(n);
  const bands = [125, 250, 500, 1000], w = [0.1, 0.2, 0.4, 0.3];       // ASSUMED spectral weights of a musket report in the ground-effect bands
  for (let i = 0; i < n; i++) { const d = (i + 0.5) * step; lpTab[i] = fitAirLowpass(d, { tC, RH, sr }).a;
    let e = 0; for (let k = 0; k < 4; k++) e += w[k] * Math.pow(10, -groundAttenuation(bands[k], hs, hr, d, G) / 10); gndLin[i] = Math.min(1.4, Math.sqrt(e)); }
  return { lpTab, gndLin, step, n };
}

/** Extra wind effect on the travel time: seconds for a path of length d with along-path wind component w (m/s, positive = with the sound). */
export const travelTime = (d, c, w = 0) => d / (c + w);

/** Retarded-time check: does the wavefront of a shot fired at tFire reach a listener at distance d by time t? */
export const arrivesBy = (tFire, d, c, t) => t >= tFire + d / c;

/** ASSUMED reference peak levels at 1 m on the muzzle axis, dB re 20 uPa (order-of-magnitude; replace with measurements from the reenactor session). */
export const SOURCE_PEAK_DB_1M = {
  rifle_musket: 152, smoothbore_musket: 150, carbine: 148, revolver: 146, napoleon_12pdr: 176, rifle_3in: 176, parrott_10pdr: 174, parrott_20pdr: 180, howitzer_12pdr: 172, howitzer_24pdr: 178,
};

/** Convert a 1 m peak level to a linear gain relative to a digital full scale that is `fsDb` dB SPL peak (default 140). */
export const dbToGain = (peakDb, fsDb = 140) => Math.pow(10, (peakDb - fsDb) / 20);

/** Doppler factor for a source moving at speed vs (m/s, positive toward the listener) heard by a listener moving at vl (positive toward the source). */
export const dopplerFactor = (vs, vl, c) => (c + vl) / (c - vs);
