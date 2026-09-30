// NOAA / Meeus solar position, re-derived to check the solar table in time_anchors.json (TX-10: sunrise 04:35 and sunset 19:32 +-2 min).
// CANDIDATE tooling. Local MEAN time at the site's longitude (1863 had no standard time). Not compared with an almanac: the same algorithm the
// time-facts specialist used, so this shows the table is reproducible from the stated method, not that the method is right.
const rad = Math.PI / 180, deg = 180 / Math.PI;
export const LAT = 39.8309, LON = -77.2311; // Gettysburg, degrees (east positive)

/** Julian day number (noon) of a Gregorian calendar date. */
export function jdn(y, m, d) { const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3; return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045; }

/** {declination (deg), eot (minutes)} for a date at local mean noon. */
export function sunAt(y, m, d) {
  const jd = jdn(y, m, d) + (12 - LON / 15 - 12) / 24, T = (jd - 2451545) / 36525;
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360, M = 357.52911 + T * (35999.05029 - 0.0001537 * T), e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const Cc = Math.sin(M * rad) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * rad) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * rad) * 0.000289;
  const omega = 125.04 - 1934.136 * T, lambda = L0 + Cc - 0.00569 - 0.00478 * Math.sin(omega * rad);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60, eps = eps0 + 0.00256 * Math.cos(omega * rad);
  const decl = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad)) * deg, y2 = Math.tan(eps * rad / 2) ** 2;
  const eot = 4 * deg * (y2 * Math.sin(2 * L0 * rad) - 2 * e * Math.sin(M * rad) + 4 * e * y2 * Math.sin(M * rad) * Math.cos(2 * L0 * rad) - 0.5 * y2 * y2 * Math.sin(4 * L0 * rad) - 1.25 * e * e * Math.sin(2 * M * rad));
  return { decl, eot };
}
/** Hour angle (degrees) at which the sun is `zenith` degrees from the zenith. */
const hourAngle = (decl, zenith) => Math.acos(Math.cos(zenith * rad) / (Math.cos(LAT * rad) * Math.cos(decl * rad)) - Math.tan(LAT * rad) * Math.tan(decl * rad)) * deg;
const hhmm = (min) => { const r = Math.round(min); return `${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}`; };

/** Local-mean-time table for a date: minutes after midnight plus HH:MM strings. */
export function solarTable(y, m, d) {
  const { decl, eot } = sunAt(y, m, d), noon = 720 - eot;
  const at = (z, sign) => noon + sign * 4 * hourAngle(decl, z);
  const t = { civil_dawn: at(96, -1), sunrise: at(90.833, -1), noon, sunset: at(90.833, 1), civil_dusk: at(96, 1), nautical_dusk: at(102, 1) };
  return { minutes: t, hm: Object.fromEntries(Object.entries(t).map(([k, v]) => [k, hhmm(v)])), decl, eot };
}
