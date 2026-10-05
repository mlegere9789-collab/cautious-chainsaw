// Fetches (politely, cached under tmp/env-cache/) the authoritative values the astronomy cross-check compares against:
//   - USNO Astronomical Applications API rstt/oneday for every day 1863-06-25 .. 1863-07-07 at 39.8309 N, 77.2311 W, tz=-5 (EST-equivalent; the API
//     only accepts tz in multiples of 0.25 h, so local MEAN time at 77.2311 W cannot be requested directly and is derived below),
//   - NASA/GSFC Fred Espenak, "Moon Phases 1801 to 1900" (phases1801.html).
// Usage: node tools/environment/fetch-astro-sources.mjs
import { fetchCached } from './fetch.mjs';
export const DAYS = [];
for (let d = 25; d <= 30; d++) DAYS.push(`1863-06-${d}`);
for (let d = 1; d <= 7; d++) DAYS.push(`1863-07-0${d}`);
export const LAT = 39.8309, LON_W = 77.2311;
export const usnoUrl = (date, tz = -5) => `https://aa.usno.navy.mil/api/rstt/oneday?date=${date}&coords=${LAT},-${LON_W}&tz=${tz}`;
export const usnoName = (date, tz = -5) => `usno-oneday-${date}-tz${tz}.json`;
export const NASA_URL = 'https://eclipse.gsfc.nasa.gov/phase/phases1801.html';
export const NASA_NAME = 'nasa-espenak-phases1801.html';
export async function fetchAll() {
  const out = [];
  for (const d of DAYS) out.push((await fetchCached(usnoUrl(d), { name: usnoName(d) })).meta);
  out.push((await fetchCached(NASA_URL, { name: NASA_NAME })).meta);
  return out;
}
if (process.argv[1] && process.argv[1].endsWith('fetch-astro-sources.mjs')) {
  fetchAll().then((m) => { for (const x of m) console.log(x.status, x.bytes, x.sha256.slice(0, 12), x.url); }).catch((e) => { console.error(e.message); process.exit(1); });
}
