// Independent, dependency-free sun and moon ephemeris for the cross-check of data-src/environment/astro_by_day.json.
//   Sun:  Meeus, Astronomical Algorithms 2nd ed., ch. 25 (low accuracy, about 0.01 deg) + ch. 22 nutation (4 terms) + ch. 12 sidereal time.
//   Moon: Meeus ch. 47 TRUNCATED to the largest terms (30 longitude/distance terms, 20 latitude terms, the A1-A3 and flattening terms): about 0.02 deg.
//   Rise/set/twilight are found by bisection on the topocentric altitude, so no rise/set approximation formula is involved.
// This is deliberately a different code path from astronomy-engine (the generator) and from tools/time/solar.mjs (NOAA formulae for the sun only).
// All instants are Julian days (UT); LMT = UT + longitude/15 h (longitude east-positive, so Gettysburg is -77.2311 deg and LMT = UT - 5.1487 h).
const RAD = Math.PI / 180;
export const SITE = { name: 'Gettysburg, Pa. (nominal point)', lat: 39.8309, lonEast: -77.2311, elevationM: 0 };
const AU_KM = 149597870.7;
const norm = (x) => ((x % 360) + 360) % 360;
const sin = (d) => Math.sin(d * RAD), cos = (d) => Math.cos(d * RAD);

/** Julian day (UT) of a proleptic Gregorian civil instant. */
export function julianDay(y, mo, d, h = 0, mi = 0, s = 0) {
  let Y = y, M = mo;
  if (M <= 2) { Y -= 1; M += 12; }
  const A = Math.floor(Y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + B - 1524.5 + (h + (mi + s / 60) / 60) / 24;
}
/** Delta T = TT - UT in seconds for 1860-1900 (Meeus ch. 10 polynomial; about 7 s in 1863). */
export function deltaT(year) {
  const t = year - 1860;
  return 7.62 + 0.5737 * t - 0.251754 * t ** 2 + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4 + t ** 5 / 233174;
}
const jdToYear = (jd) => 1863 + (jd - 2401000) / 365.25; // only used to pick DeltaT, so 1-year accuracy is plenty
const ttCenturies = (jdUT) => (jdUT + deltaT(jdToYear(jdUT)) / 86400 - 2451545) / 36525;

function nutationAndObliquity(T) {
  const Om = 125.04452 - 1934.136261 * T, Ls = 280.4665 + 36000.7698 * T, Lm = 218.3165 + 481267.8813 * T;
  const dpsi = (-17.2 * sin(Om) - 1.32 * sin(2 * Ls) - 0.23 * sin(2 * Lm) + 0.21 * sin(2 * Om)) / 3600;
  const deps = (9.2 * cos(Om) + 0.57 * cos(2 * Ls) + 0.1 * cos(2 * Lm) - 0.09 * cos(2 * Om)) / 3600;
  const eps0 = 23.439291111 - 0.013004167 * T - 1.638889e-7 * T ** 2 + 5.036111e-7 * T ** 3;
  return { dpsi, eps: eps0 + deps };
}
const toEquatorial = (lam, bet, eps) => ({
  ra: norm(Math.atan2(sin(lam) * cos(eps) - Math.tan(bet * RAD) * sin(eps), cos(lam)) / RAD),
  dec: Math.asin(sin(bet) * cos(eps) + cos(bet) * sin(eps) * sin(lam)) / RAD,
});

/** apparent geocentric sun: { lam, ra, dec, distKm } (degrees) */
export function sunApparent(jdUT) {
  const T = ttCenturies(jdUT), { eps } = nutationAndObliquity(T);
  const L0 = norm(280.46646 + 36000.76983 * T + 0.0003032 * T ** 2), M = norm(357.52911 + 35999.05029 * T - 0.0001537 * T ** 2);
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T ** 2;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T ** 2) * sin(M) + (0.019993 - 0.000101 * T) * sin(2 * M) + 0.000289 * sin(3 * M);
  const trueLon = L0 + C, nu = M + C, om = 125.04 - 1934.136 * T;
  const lam = trueLon - 0.00569 - 0.00478 * sin(om);
  const R = (1.000001018 * (1 - e * e)) / (1 + e * cos(nu));
  const eq = toEquatorial(lam, 0, eps + 0.00256 * cos(om));
  return { lam: norm(lam), ra: eq.ra, dec: eq.dec, distKm: R * AU_KM };
}

// Meeus table 47.A (D, M, M', F, sum_l [1e-6 deg], sum_r [1e-3 km]) and 47.B (D, M, M', F, sum_b [1e-6 deg]), largest terms only.
const TAB_LR = [
  [0, 0, 1, 0, 6288774, -20905355], [2, 0, -1, 0, 1274027, -3699111], [2, 0, 0, 0, 658314, -2955968], [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888], [0, 0, 0, 2, -114332, -3149], [2, 0, -2, 0, 58793, 246158], [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733], [2, -1, 0, 0, 45758, -204586], [0, 1, -1, 0, -40923, -129620], [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755], [2, 0, 0, -2, 15327, 10321], [0, 0, 1, 2, -12528, 0], [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782], [0, 0, 3, 0, 10034, -23210], [4, 0, -2, 0, 8548, -21636], [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824], [1, 0, -1, 0, -5163, -8379], [1, 1, 0, 0, 4987, -16675], [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445], [4, 0, 0, 0, 3861, -11650], [2, 0, -3, 0, 3665, 14403], [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0], [2, -1, -2, 0, 2390, 10056],
];
const TAB_B = [
  [0, 0, 0, 1, 5128122], [0, 0, 1, 1, 280602], [0, 0, 1, -1, 277693], [2, 0, 0, -1, 173237], [2, 0, -1, 1, 55413], [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573], [0, 0, 2, 1, 17198], [2, 0, 1, -1, 9266], [0, 0, 2, -1, 8822], [2, -1, 0, -1, 8216], [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200], [2, 1, 0, -1, -3359], [2, -1, -1, 1, 2463], [2, -1, 0, 1, 2211], [2, -1, -1, -1, 2065], [0, 1, -1, -1, -1870],
  [4, 0, -1, -1, 1828], [0, 1, 0, 1, -1794],
];

/** apparent geocentric moon: { lam, bet, ra, dec, distKm } (degrees) */
export function moonApparent(jdUT) {
  const T = ttCenturies(jdUT), { dpsi, eps } = nutationAndObliquity(T);
  const Lp = norm(218.3164477 + 481267.88123421 * T - 0.0015786 * T ** 2 + T ** 3 / 538841 - T ** 4 / 65194000);
  const D = norm(297.8501921 + 445267.1114034 * T - 0.0018819 * T ** 2 + T ** 3 / 545868 - T ** 4 / 113065000);
  const M = norm(357.5291092 + 35999.0502909 * T - 0.0001536 * T ** 2 + T ** 3 / 24490000);
  const Mp = norm(134.9633964 + 477198.8675055 * T + 0.0087414 * T ** 2 + T ** 3 / 69699 - T ** 4 / 14712000);
  const F = norm(93.272095 + 483202.0175233 * T - 0.0036539 * T ** 2 - T ** 3 / 3526000 + T ** 4 / 863310000);
  const A1 = norm(119.75 + 131.849 * T), A2 = norm(53.09 + 479264.29 * T), A3 = norm(313.45 + 481266.484 * T);
  const E = 1 - 0.002516 * T - 0.0000074 * T ** 2;
  const eFac = (m) => (m === 0 ? 1 : Math.abs(m) === 1 ? E : E * E);
  let sl = 0, sr = 0, sb = 0;
  for (const [d, m, mp, f, l, r] of TAB_LR) { const a = d * D + m * M + mp * Mp + f * F; sl += l * eFac(m) * sin(a); sr += r * eFac(m) * cos(a); }
  for (const [d, m, mp, f, b] of TAB_B) sb += b * eFac(m) * sin(d * D + m * M + mp * Mp + f * F);
  sl += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
  sb += -2235 * sin(Lp) + 382 * sin(A3) + 175 * sin(A1 - F) + 175 * sin(A1 + F) + 127 * sin(Lp - Mp) - 115 * sin(Lp + Mp);
  const lam = norm(Lp + sl / 1e6 + dpsi), bet = sb / 1e6, distKm = 385000.56 + sr / 1000;
  const eq = toEquatorial(lam, bet, eps);
  return { lam, bet, ra: eq.ra, dec: eq.dec, distKm };
}

/** Greenwich apparent sidereal time in degrees. */
export function gast(jdUT) {
  const T = (jdUT - 2451545) / 36525, Tt = ttCenturies(jdUT), { dpsi, eps } = nutationAndObliquity(Tt);
  const gmst = norm(280.46061837 + 360.98564736629 * (jdUT - 2451545) + 0.000387933 * T ** 2 - T ** 3 / 38710000);
  return norm(gmst + dpsi * cos(eps));
}

/** topocentric { alt, az } (degrees, geometric: no refraction) of a body with equatorial {ra, dec, distKm}. az measured from north through east. */
export function topocentric(body, jdUT, site = SITE) {
  const phi = site.lat, H = norm(gast(jdUT) + site.lonEast - body.ra);
  // parallax (Meeus ch. 40), observer at sea level on a spheroid
  const u = Math.atan(0.99664719 * Math.tan(phi * RAD)), rs = 0.99664719 * Math.sin(u), rc = Math.cos(u);
  const sinPi = 6378.14 / body.distKm;
  const dRa = Math.atan2(-rc * sinPi * sin(H), cos(body.dec) - rc * sinPi * cos(H)) / RAD;
  const ra2 = body.ra + dRa;
  const dec2 = Math.atan2((sin(body.dec) - rs * sinPi) * cos(dRa), cos(body.dec) - rc * sinPi * cos(H)) / RAD;
  const H2 = norm(gast(jdUT) + site.lonEast - ra2);
  const alt = Math.asin(sin(phi) * sin(dec2) + cos(phi) * cos(dec2) * cos(H2)) / RAD;
  const az = norm(Math.atan2(sin(H2), cos(H2) * sin(phi) - Math.tan(dec2 * RAD) * cos(phi)) / RAD + 180);
  return { alt, az, H: H2, dec: dec2 };
}
export const sunTopo = (jd, site) => topocentric(sunApparent(jd), jd, site);
export const moonTopo = (jd, site) => topocentric(moonApparent(jd), jd, site);

const SUN_SEMIDIAM_DEG_1AU = 959.63 / 3600;
/** threshold altitude (deg, topocentric centre) for the upper limb on the horizon with 34 arcmin standard refraction */
export const sunHorizonAlt = (jd) => -(34 / 60 + (SUN_SEMIDIAM_DEG_1AU * AU_KM) / sunApparent(jd).distKm);
export const moonHorizonAlt = (jd) => -(34 / 60 + Math.asin(1737.4 / moonApparent(jd).distKm) / RAD);

/** all instants in [jd0, jd1) where f(jd) crosses zero, as { jd, rising }; 6-minute scan, then bisection to well under a second. */
export function crossings(f, jd0, jd1) {
  const out = [], step = 6 / 1440, n = Math.ceil((jd1 - jd0) / step - 1e-9);
  let a = jd0, fa = f(a);
  for (let i = 1; i <= n; i++) {
    const t = Math.min(jd0 + i * step, jd1), fb = f(t); // index stepping: no accumulated floating-point drift at JD magnitudes
    if ((fa < 0) !== (fb < 0) && fa !== fb) {
      let lo = a, hi = t, flo = fa;
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2, fm = f(mid); if ((flo < 0) === (fm < 0)) { lo = mid; flo = fm; } else hi = mid; }
      const jd = (lo + hi) / 2;
      if (jd >= jd0 && jd < jd1) out.push({ jd, rising: fb > fa });
    }
    a = t; fa = fb;
  }
  return out;
}

/** illuminated fraction of the moon (0..1) and phase angle (deg) by Meeus ch. 48 */
export function moonIllumination(jdUT) {
  const s = sunApparent(jdUT), m = moonApparent(jdUT);
  const cosPsi = sin(s.dec) * sin(m.dec) + cos(s.dec) * cos(m.dec) * cos(s.ra - m.ra);
  const psi = Math.acos(Math.max(-1, Math.min(1, cosPsi))) / RAD;
  const i = Math.atan2(s.distKm * sin(psi), m.distKm - s.distKm * cos(psi)) / RAD;
  return { fraction: (1 + cos(i)) / 2, phaseAngle: i, elongation: psi, eclipticElongation: norm(m.lam - s.lam) };
}
