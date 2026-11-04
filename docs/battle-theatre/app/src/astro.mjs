// Low-precision sun and moon for the days that the project's per-minute table (environment/ephemeris_1863.json) does not cover (7-14 Jul 1863).
// Meeus, Astronomical Algorithms 2nd ed., ch.25 (sun, low accuracy) and an abbreviated ch.47 (moon: 16 longitude, 10 latitude, 4 distance terms).
// Expected accuracy: sun about 0.02 deg, moon a few tenths of a degree: enough for light level and the day/night bar, NOT a replacement for the table.
// Where the table exists the table is always used; tests/astro.spec.mjs reports this module's measured error against the table.
import { parts } from './clock.mjs';
const R = Math.PI / 180, LAT = 39.83, LON = -77.23, LMT_OFFSET_H = -LON / 15;      // LMT + 5.1487 h = UT
const jdOfMin = min => { const p = parts(Math.floor(min)); const y = 1863, m = p.month, d = p.dom + (p.hh + (p.mm + (min % 1)) / 60) / 24 + LMT_OFFSET_H / 24;
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4); return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5; };
const mod360 = x => ((x % 360) + 360) % 360;
function equToHoriz(raDeg, decDeg, jd, T) {
  const gmst = mod360(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T), H = (gmst + LON - raDeg) * R, dec = decDeg * R, lat = LAT * R;
  const alt = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H));
  const azS = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat));
  return [alt / R, mod360(azS / R + 180)];
}
const eclToEqu = (lamDeg, betaDeg, eps) => { const l = lamDeg * R, b = betaDeg * R; return [mod360(Math.atan2(Math.sin(l) * Math.cos(eps) - Math.tan(b) * Math.sin(eps), Math.cos(l)) / R), Math.asin(Math.sin(b) * Math.cos(eps) + Math.cos(b) * Math.sin(eps) * Math.sin(l)) / R]; };
const MOON_L = [[0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618], [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332], [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066], [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720], [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528], [0, 0, 1, -2, 10980]];
const MOON_B = [[0, 0, 0, 1, 5128122], [0, 0, 1, 1, 280602], [0, 0, 1, -1, 277693], [2, 0, 0, -1, 173237], [2, 0, -1, 1, 55413], [2, 0, -1, -1, 46271], [2, 0, 0, 1, 32573], [0, 0, 2, 1, 17198], [2, 0, 1, -1, 9266], [0, 0, 2, -1, 8822]];
const MOON_R = [[0, 0, 1, 0, -20905355], [2, 0, -1, 0, -3699111], [2, 0, 0, 0, -2955968], [0, 0, 2, 0, -569925]];
export function sunMoon(min) {
  const jd = jdOfMin(min), T = (jd - 2451545) / 36525;
  const L0 = mod360(280.46646 + 36000.76983 * T), M = mod360(357.52911 + 35999.05029 * T) * R;
  const C = (1.914602 - 0.004817 * T) * Math.sin(M) + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  const om = (125.04 - 1934.136 * T) * R, lam = L0 + C - 0.00569 - 0.00478 * Math.sin(om), eps = (23.439291 - 0.0130042 * T + 0.00256 * Math.cos(om)) * R;
  const [raS, decS] = eclToEqu(lam, 0, eps), sun = equToHoriz(raS, decS, jd, T);
  const Lm = mod360(218.3164477 + 481267.88123421 * T), D = mod360(297.8501921 + 445267.1114034 * T) * R, Ms = M, Mm = mod360(134.9633964 + 477198.8675055 * T) * R, F = mod360(93.272095 + 483202.0175233 * T) * R;
  const E = 1 - 0.002516 * T; let sl = 0, sb = 0, sr = 0;
  for (const [d, m, mp, f, c] of MOON_L) sl += c * Math.sin(d * D + m * Ms + mp * Mm + f * F) * (m ? E ** Math.abs(m) : 1);
  for (const [d, m, mp, f, c] of MOON_B) sb += c * Math.sin(d * D + m * Ms + mp * Mm + f * F) * (m ? E ** Math.abs(m) : 1);
  for (const [d, m, mp, f, c] of MOON_R) sr += c * Math.cos(d * D + m * Ms + mp * Mm + f * F);
  const lamM = Lm + sl / 1e6, betaM = sb / 1e6, dist = 385000.56 + sr / 1000;
  const [raM, decM] = eclToEqu(lamM, betaM, eps); const mh = equToHoriz(raM, decM, jd, T);
  const par = Math.asin(6378.14 / dist) / R; const altTopo = mh[0] - par * Math.cos(mh[0] * R);        // topocentric parallax in altitude
  const elong = Math.acos(Math.cos(betaM * R) * Math.cos((lamM - lam) * R)) / R, illum = (1 + Math.cos((180 - elong) * R)) / 2 * 100;
  return { sunAlt: sun[0], sunAz: sun[1], moonAlt: altTopo, moonAz: mh[1], moonIllum: illum };
}
