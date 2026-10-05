// Clock conventions shared by the environment tools (no ephemeris code here).
//
// 1863 had no standard time. Clocks were set locally (sun-dial or jeweller's noon), railways ran on their own times, and US standard time zones were
// introduced by the railways on 18 November 1883 (see docs/facts/README.md). This project therefore works in LOCAL MEAN TIME (LMT) at the site's
// longitude, which is exactly the convention of src/lib/time/core.js ("minutes since 1863-07-01T00:00 local mean time"), and offers an
// EST-EQUIVALENT view (UT - 5 h, what a modern almanac such as USNO's returns for tz = -5) because sources and visitors may expect it.
// Neither is a claim about what any 1863 clock in Gettysburg showed: the real clocks differed by minutes and nobody recorded how by how much.
export const LON_EAST = -77.2311;
export const LAT = 39.8309;
/** LMT = UT + lonEast / 15 hours (negative here: LMT is about 5 h 8.9 min behind UT). */
export const LMT_OFFSET_MS = (LON_EAST / 15) * 3600000;
export const EST_OFFSET_MS = -5 * 3600000;
/** minutes by which EST-equivalent clocks are ahead of LMT at this longitude (8.92 min) */
export const EST_MINUS_LMT_MIN = (EST_OFFSET_MS - LMT_OFFSET_MS) / 60000;

const two = (n) => String(n).padStart(2, '0');
/** UT milliseconds -> clock fields for a zone with the given offset: { date: 'YYYY-MM-DD', minutes: float minutes after midnight } */
export function clockFields(utMs, offsetMs) {
  const d = new Date(utMs + offsetMs); // the UTC fields of the shifted Date are the zone's clock fields
  const date = `${d.getUTCFullYear()}-${two(d.getUTCMonth() + 1)}-${two(d.getUTCDate())}`;
  const minutes = d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60 + d.getUTCMilliseconds() / 60000;
  return { date, minutes };
}
/** float minutes after midnight -> 'HH:MM' rounded to the nearest minute (half up), never '24:00' (clamped to 23:59 and flagged by the caller) */
export function hhmm(minutes) {
  let r = Math.floor(minutes + 0.5);
  if (r >= 1440) r = 1439;
  return `${two(Math.floor(r / 60))}:${two(r % 60)}`;
}
/** float minutes after midnight -> 'HH:MM:SS' rounded to the nearest second */
export function hhmmss(minutes) {
  let s = Math.floor(minutes * 60 + 0.5);
  if (s >= 86400) s = 86399;
  return `${two(Math.floor(s / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;
}
/** 'HH:MM' -> minutes */
export const parseHhmm = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
/** 12-hour label used by the pitch ("8:38 p.m.") */
export function label12(hhmmStr) {
  const h = Number(hhmmStr.slice(0, 2)), m = hhmmStr.slice(3, 5);
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h >= 12 ? 'p.m.' : 'a.m.'}`;
}
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const weekdayOf = (date) => { const [y, m, d] = date.split('-').map(Number); return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]; };
/** UT ms of 00:00 LMT on a civil date */
export const lmtMidnightUtMs = (date) => { const [y, m, d] = date.split('-').map(Number); return Date.UTC(y, m - 1, d) - LMT_OFFSET_MS; };
export const DAYS = [];
for (let d = 25; d <= 30; d++) DAYS.push(`1863-06-${d}`);
for (let d = 1; d <= 7; d++) DAYS.push(`1863-07-${two(d)}`);
