// Builds data-src/environment/astro_by_day.json and astro_by_tick.json.
//   node tools/environment/build-astro.mjs            (writes both; fetches the USNO/NASA cross-check sources politely if they are not cached)
//   node tools/environment/build-astro.mjs --check    (rebuilds in memory and fails if the files on disk differ: the data is reproducible)
// Primary values: Method A (astronomy-engine 2.1.19, MIT). Independent check: Method B (tools/environment/solar.mjs). Authorities: USNO AA API
// (rise/set/twilight/transit, illumination, phase) and NASA/Espenak (principal phases). Every discrepancy is stored with the data, in minutes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchCached, readCached } from './fetch.mjs';
import { htmlToText } from './htmltext.mjs';
import { pretty } from './json-out.mjs';
import * as K from './clock.mjs';
import * as C from './astro-core.mjs';
import { loadAnchors, tickToLmtMinutes, lmtMinutesToUtMs, lmtMinutesToTick, parseLmt } from './tickclock.mjs';
import { usnoUrl, usnoName, NASA_URL, NASA_NAME } from './fetch-astro-sources.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT_DIR = path.join(ROOT, 'data-src', 'environment');
const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
const isoZ = (ms) => new Date(Math.round(ms / 1000) * 1000).toISOString().replace('.000Z', 'Z');

// ---------------------------------------------------------------- sources registry
export const SOURCES = [
  { id: 'astronomy-engine', kind: 'software', tier: 'computed', title: 'Astronomy Engine 2.1.19 (Don Cross), MIT licence', url: 'https://github.com/cosinekitty/astronomy', note: 'Sun/Moon positions, SearchRiseSet (upper limb, standard refraction), SearchAltitude, SearchHourAngle, SearchMoonQuarter, Illumination, MoonPhase. Used as the primary generator.' },
  { id: 'own-meeus', kind: 'software', tier: 'computed', title: 'tools/environment/solar.mjs: dependency-free implementation of J. Meeus, Astronomical Algorithms (2nd ed., 1998) ch. 10, 12, 22, 25, 40, 47 (truncated), 48', url: null, note: 'Independent second implementation; shares no code or tables with astronomy-engine. Moon series truncated to the largest terms (about 0.02 degree).' },
  { id: 'usno-api', kind: 'authority', tier: 'A-authority', title: 'U.S. Naval Observatory, Astronomical Applications Department, Complete Sun and Moon Data for One Day (API v4.0.1, endpoint rstt/oneday)', url: 'https://aa.usno.navy.mil/data/api', note: 'US Government work (public domain). Returns whole minutes only; tz must be a multiple of 0.25 h, so tz=-5 (EST-equivalent) was requested and local mean time derived. One request per day, cached; never called from visitors\' browsers.' },
  { id: 'nasa-espenak', kind: 'authority', tier: 'A-authority', title: 'Fred Espenak, NASA/GSFC, Phases of the Moon: 1801 to 1900 (Universal Time)', url: NASA_URL, note: 'Principal phases to the minute in UT. NASA credit line: Fred Espenak, NASA/GSFC (eclipse.gsfc.nasa.gov).' },
  { id: 'wikipedia-time-us', kind: 'background', tier: 'B-background', title: 'Wikipedia, "Time in the United States" (CC BY-SA 4.0)', url: 'https://en.wikipedia.org/wiki/Time_in_the_United_States', note: 'Background only: before November 18, 1883 many towns set clocks to local mean solar time; four standard time zones were introduced by the railroads on that date.' },
];

// ---------------------------------------------------------------- parsers
export function parseUsno(json) {
  const d = json.properties.data;
  const events = [];
  for (const e of d.sundata) if (USNO_KEYS[e.phen]) events.push({ key: USNO_KEYS[e.phen], hhmm: e.time });
  for (const e of d.moondata) if (USNO_MOON_KEYS[e.phen]) events.push({ key: USNO_MOON_KEYS[e.phen], hhmm: e.time });
  return { year: d.year, month: d.month, day: d.day, fracillum: d.fracillum, curphase: d.curphase, closestphase: d.closestphase, events, tz: d.tz, apiversion: json.apiversion };
}
const USNO_KEYS = C.USNO_KEYS, USNO_MOON_KEYS = C.USNO_MOON_KEYS;

const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
/** NASA table for 1863: the entries in document order, cycle Full, Last Quarter, New, First Quarter, ... starting with the first entry (Jan 5 = Full). */
export function parseNasa1863(text) {
  const start = text.indexOf('1863 Jan 5 03:32');
  const end = text.indexOf('1864 Jan 2');
  if (start < 0 || end < 0) throw new Error('NASA page layout changed: 1863 block not found');
  const block = text.slice(start, end);
  const out = [], cycle = ['Full Moon', 'Last Quarter', 'New Moon', 'First Quarter'];
  const re = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}) (\d{2}):(\d{2})\b/g;
  let m, i = 0;
  while ((m = re.exec(block))) {
    out.push({ phase: cycle[i % 4], utMs: Date.UTC(1863, MONTHS[m[1]], +m[2], +m[3], +m[4]), text: `${m[1]} ${m[2]} ${m[3]}:${m[4]}` });
    i++;
  }
  return out;
}

const PHASE_BY_OCTANT = ['Waxing Crescent', 'Waxing Gibbous', 'Waning Gibbous', 'Waning Crescent'];
export const phaseNameRule = 'Name of the principal phase (New Moon, First Quarter, Full Moon, Last Quarter) if that phase falls inside the local-mean-time calendar day; otherwise the octant of the moon\'s ecliptic elongation at 12:00 LMT (0-90 Waxing Crescent, 90-180 Waxing Gibbous, 180-270 Waning Gibbous, 270-360 Waning Crescent). USNO instead names the state at noon, so labels can differ on a quarter-phase day (the numbers do not).';

// ---------------------------------------------------------------- build
export async function build() {
  const A = await C.loadAstronomyEngine();
  const aeVer = await C.aeVersion();
  // fetch / read the cross-check sources
  const usno = {}, usnoMeta = {};
  for (const d of K.DAYS) {
    const r = await fetchCached(usnoUrl(d), { name: usnoName(d) });
    usno[d] = parseUsno(JSON.parse(readCached(r.file)));
    usnoMeta[d] = { url: r.meta.url, sha256: r.meta.sha256, bytes: r.meta.bytes, retrieved: r.meta.retrieved.slice(0, 10) };
  }
  const nasaFetch = await fetchCached(NASA_URL, { name: NASA_NAME });
  const nasaText = htmlToText(readCached(nasaFetch.file));
  const nasaAll = parseNasa1863(nasaText);

  // events by both methods for a window one day wider on each side, so USNO's EST-day events can be matched across the LMT midnight
  const winDays = ['1863-06-24', ...K.DAYS, '1863-07-08'];
  const evA = {}, evB = {};
  for (const d of winDays) { evA[d] = await C.eventsA(d); evB[d] = C.eventsB(d); }
  const listFor = (ev, key) => winDays.map((d) => ev[d][key]).filter((x) => x != null);

  // principal phases
  const winFrom = Date.UTC(1863, 5, 10), winTo = Date.UTC(1863, 6, 20);
  const phA = await C.principalPhasesA(winFrom, winTo), phB = C.principalPhasesB(winFrom, winTo);
  const nasaWin = nasaAll.filter((n) => n.utMs >= winFrom && n.utMs < winTo);
  const principal = phA.map((p) => {
    const b = phB.find((x) => x.phase === p.phase && Math.abs(x.utMs - p.utMs) < 86400000);
    const n = nasaWin.find((x) => x.phase === p.phase && Math.abs(x.utMs - p.utMs) < 86400000);
    const lmt = K.clockFields(p.utMs, K.LMT_OFFSET_MS), est = K.clockFields(p.utMs, K.EST_OFFSET_MS);
    return {
      phase: p.phase, utc: isoZ(p.utMs), lmt_date: lmt.date, lmt: K.hhmm(lmt.minutes), est_date: est.date, est: K.hhmm(est.minutes),
      badge: 'Computed', method: 'astronomy-engine', cites: ['astronomy-engine', 'nasa-espenak'],
      cross_check: {
        nasa_ut: n ? new Date(n.utMs).toISOString().slice(0, 16).replace('T', ' ') : null, nasa_text: n ? n.text : null,
        a_minus_nasa_min: n ? round((p.utMs - n.utMs) / 60000, 2) : null,
        own_minus_a_min: b ? round((b.utMs - p.utMs) / 60000, 2) : null,
      },
    };
  });

  const days = [];
  const usnoStats = { sun_moon_events: 0, matched: 0, unmatched: [], diffs: [] };
  for (const date of K.DAYS) {
    const a = evA[date], b = evB[date];
    const u = usno[date];
    const usnoUtMs = (key) => { const e = u.events.find((x) => x.key === key); return e ? Date.UTC(u.year, u.month - 1, u.day, +e.hhmm.slice(0, 2), +e.hhmm.slice(3, 5)) - K.EST_OFFSET_MS : null; };
    const usnoHhmm = (key) => { const e = u.events.find((x) => x.key === key); return e ? e.hhmm : null; };
    const val = (key) => {
      const ms = a[key];
      if (ms == null) return { absent: true, reason: key.startsWith('moon') ? 'The moon has no such event inside this local-mean-time calendar day (it rises and sets about 50 minutes later each day).' : 'No such event inside this local-mean-time calendar day.', cross_check: { own_found_event: b[key] != null } };
      const lmt = K.clockFields(ms, K.LMT_OFFSET_MS), est = K.clockFields(ms, K.EST_OFFSET_MS);
      const out = {
        lmt: K.hhmm(lmt.minutes), lmt_hms: K.hhmmss(lmt.minutes), est: K.hhmm(est.minutes), est_date: est.date, utc: isoZ(ms),
        badge: 'Computed', method: 'astronomy-engine', cites: ['astronomy-engine', 'own-meeus', ...(Object.values(USNO_KEYS).includes(key) || Object.values(USNO_MOON_KEYS).includes(key) ? ['usno-api'] : [])],
        cross_check: { own_minus_a_s: b[key] == null ? null : round((b[key] - ms) / 1000, 1) },
      };
      if (lmt.date !== date) throw new Error(`event ${key} for ${date} falls on LMT date ${lmt.date}`);
      return out;
    };
    // USNO cross-check is attached by matching USNO's EST-day events to the nearest computed event of the same kind (any LMT day in the window)
    const attachUsno = (key, v) => {
      const uh = usnoHhmm(key);
      if (!(Object.values(USNO_KEYS).includes(key) || Object.values(USNO_MOON_KEYS).includes(key))) { if (!v.absent) v.cross_check.usno_est = null; return; }
      if (uh == null) return; // USNO lists no such event on its EST day; handled in the unmatched report below
      usnoStats.sun_moon_events++;
      const ums = usnoUtMs(key);
      const near = listFor(evA, key).reduce((best, x) => (best == null || Math.abs(x - ums) < Math.abs(best - ums) ? x : best), null);
      if (near == null || Math.abs(near - ums) > 30 * 60000) { usnoStats.unmatched.push(`${date} ${key} USNO ${uh}`); return; }
      const diff = round((near - ums) / 60000, 2);
      // attach to the LMT-day record that owns the matched instant; an event that belongs to an LMT day outside the 13 (the first EST morning minutes) is counted apart
      const owner = days.find((r) => r.date === K.clockFields(near, K.LMT_OFFSET_MS).date);
      const rec = owner && (key.startsWith('moon') ? owner.moon : owner.sun);
      if (!owner) { usnoStats.outside = (usnoStats.outside || 0) + 1; return; }
      usnoStats.matched++; usnoStats.diffs.push({ date, key, diff });
      if (rec && rec[key] && !rec[key].absent) { rec[key].cross_check.usno_est = uh; rec[key].cross_check.usno_est_date = u.year + '-' + String(u.month).padStart(2, '0') + '-' + String(u.day).padStart(2, '0'); rec[key].cross_check.a_minus_usno_min = diff; }
    };
    const sunRec = {}, moonRec = {};
    for (const k of C.SUN_EVENTS) sunRec[k] = val(k);
    for (const k of C.MOON_EVENTS) moonRec[k] = val(k);
    // moon state at local noon (12:00 LMT) and at 12:00 EST (the instant USNO's integer illumination matches)
    const noonLmtMs = K.lmtMidnightUtMs(date) + 12 * 3600000, noonEstMs = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), 12) - K.EST_OFFSET_MS;
    const illA = await C.illumA(noonLmtMs), illB = C.illumB(noonLmtMs), illEstA = await C.illumA(noonEstMs), illEstB = C.illumB(noonEstMs);
    const elong = await C.elongationA(noonLmtMs);
    const pToday = principal.find((p) => p.lmt_date === date);
    moonRec.illumination_noon_lmt_pct = round(illA * 100, 1);
    moonRec.illumination_noon_est_pct = round(illEstA * 100, 2);
    moonRec.ecliptic_elongation_noon_lmt_deg = round(elong, 2);
    moonRec.phase_name = pToday ? pToday.phase : PHASE_BY_OCTANT[Math.floor(elong / 90) % 4];
    moonRec.principal_phase_today = pToday ? { phase: pToday.phase, lmt: pToday.lmt, est: pToday.est, est_date: pToday.est_date, utc: pToday.utc } : null;
    moonRec.badge = 'Computed'; moonRec.method = 'astronomy-engine'; moonRec.cites = ['astronomy-engine', 'own-meeus', 'usno-api'];
    moonRec.cross_check = {
      own_minus_a_noon_lmt_pct: round((illB - illA) * 100, 3), own_minus_a_noon_est_pct: round((illEstB - illEstA) * 100, 3),
      usno_fracillum_pct: Number(String(u.fracillum).replace('%', '')), a_noon_est_minus_usno_pct: round(illEstA * 100 - Number(String(u.fracillum).replace('%', '')), 2),
      usno_curphase: u.curphase, usno_closest_phase: u.closestphase ? `${u.closestphase.phase} ${u.closestphase.year}-${String(u.closestphase.month).padStart(2, '0')}-${String(u.closestphase.day).padStart(2, '0')} ${u.closestphase.time} EST` : null,
      label_agrees_with_usno: moonRec.phase_name === u.curphase,
    };
    const dayLen = a.sunrise != null && a.sunset != null ? round((a.sunset - a.sunrise) / 60000, 1) : null;
    days.push({ date, weekday: K.weekdayOf(date), sun: sunRec, moon: moonRec, day_length_min: dayLen, _u: u });
    for (const k of [...C.SUN_EVENTS, ...C.MOON_EVENTS]) attachUsno(k, (k.startsWith('moon') ? moonRec : sunRec)[k]);
  }
  // USNO events that matched nothing in the data (should be none) and computed events USNO did not list on its EST day are reported, not hidden
  const usnoExtra = [];
  for (const d of K.DAYS) {
    for (const [key] of Object.entries({ ...Object.fromEntries(Object.values(USNO_KEYS).map((k) => [k, 1])), ...Object.fromEntries(Object.values(USNO_MOON_KEYS).map((k) => [k, 1])) })) {
      const listed = usno[d].events.some((e) => e.key === key);
      const ev = evA[d][key]; // LMT-day event; EST-day listing can differ by 8.9 minutes of boundary, so only report a computed event whose EST date is d and which USNO omits
      if (ev != null && K.clockFields(ev, K.EST_OFFSET_MS).date === d && !listed) usnoExtra.push(`${d} ${key} (computed ${K.hhmm(K.clockFields(ev, K.EST_OFFSET_MS).minutes)} EST, absent from USNO's list for that day)`);
    }
  }
  for (const day of days) delete day._u;

  // summaries
  const absDiffs = usnoStats.diffs.map((x) => Math.abs(x.diff));
  const ownDiffs = []; // seconds
  for (const day of days) for (const grp of [day.sun, day.moon]) for (const [k, v] of Object.entries(grp)) if (v && v.cross_check && typeof v.cross_check.own_minus_a_s === 'number') ownDiffs.push({ date: day.date, key: k, s: v.cross_check.own_minus_a_s });
  const byKey = {};
  for (const x of usnoStats.diffs) { (byKey[x.key] ||= []).push(Math.abs(x.diff)); }
  const summary = {
    usno: {
      events_compared: usnoStats.matched, events_matched_but_outside_the_13_lmt_days: usnoStats.outside || 0, events_unmatched: usnoStats.unmatched, computed_events_missing_from_usno_list: usnoExtra,
      max_abs_diff_min: round(Math.max(...absDiffs), 2), mean_abs_diff_min: round(absDiffs.reduce((s, x) => s + x, 0) / absDiffs.length, 3),
      within_0_5_min: absDiffs.filter((x) => x <= 0.5).length, within_1_min: absDiffs.filter((x) => x <= 1).length,
      max_abs_diff_min_by_event: Object.fromEntries(Object.entries(byKey).map(([k, v]) => [k, round(Math.max(...v), 2)])),
      note: 'diff = astronomy-engine minus USNO, in minutes, where USNO lists whole minutes (so a diff up to +-0.5 is rounding).',
      illumination_integer_agrees_at_est_noon: days.filter((d) => Math.round(d.moon.illumination_noon_est_pct) === d.moon.cross_check.usno_fracillum_pct).length + ' of ' + days.length,
      illumination_note: 'USNO lists an integer percentage; ours at 12:00 EST-equivalent (2 decimals) is compared after rounding to an integer, and the largest unrounded difference is given in max_abs_illumination_diff_pct.',
      max_abs_illumination_diff_pct: round(Math.max(...days.map((d) => Math.abs(d.moon.cross_check.a_noon_est_minus_usno_pct))), 2),
      phase_label_disagreements: days.filter((d) => !d.moon.cross_check.label_agrees_with_usno).map((d) => `${d.date}: ours ${d.moon.phase_name}, USNO ${d.moon.cross_check.usno_curphase}`),
    },
    own_implementation: {
      events_compared: ownDiffs.length, max_abs_diff_seconds: round(Math.max(...ownDiffs.map((x) => Math.abs(x.s))), 1),
      worst: ownDiffs.reduce((w, x) => (Math.abs(x.s) > Math.abs(w.s) ? x : w), ownDiffs[0]),
      max_abs_illumination_diff_pct: round(Math.max(...days.map((d) => Math.abs(d.moon.cross_check.own_minus_a_noon_lmt_pct))), 3),
      events_found_by_one_method_only: days.flatMap((d) => [...Object.entries(d.sun), ...Object.entries(d.moon)].filter(([, v]) => v && v.cross_check && ((v.absent && v.cross_check.own_found_event) || (!v.absent && v.cross_check.own_minus_a_s === null))).map(([k]) => `${d.date} ${k}`)),
    },
    nasa: {
      principal_phases_compared: principal.filter((p) => p.cross_check.nasa_ut).length,
      max_abs_diff_min: round(Math.max(...principal.filter((p) => p.cross_check.nasa_ut).map((p) => Math.abs(p.cross_check.a_minus_nasa_min))), 2),
      note: 'NASA lists UT to the minute and appears to truncate seconds (every astronomy-engine minus NASA difference falls in [0, 1) minute), so a difference under one minute is rounding, not disagreement.',
      own_vs_a_max_abs_min: round(Math.max(...principal.map((p) => Math.abs(p.cross_check.own_minus_a_min))), 2),
    },
  };

  // pitch claims, re-checked against the numbers
  const dd = Object.fromEntries(days.map((d) => [d.date, d]));
  const j2 = dd['1863-07-02'], j3 = dd['1863-07-03'];
  const mins = (hm) => K.parseHhmm(hm);
  const pitch = [
    { id: 'P1', claim: 'July 2, 1863: sunrise 04:35 and sunset 19:32 local mean time (04:44 and 19:41 EST), civil dusk 20:04 LMT', where: 'PITCH.md idea 1 (USNO)', computed: `sunrise ${j2.sun.sunrise.lmt} LMT / ${j2.sun.sunrise.est} EST; sunset ${j2.sun.sunset.lmt} LMT / ${j2.sun.sunset.est} EST; civil dusk ${j2.sun.civil_dusk.lmt} LMT`, agrees: j2.sun.sunrise.lmt === '04:35' && j2.sun.sunset.lmt === '19:32' && j2.sun.sunrise.est === '04:44' && j2.sun.sunset.est === '19:41' && j2.sun.civil_dusk.lmt === '20:04' },
    { id: 'P2', claim: 'Moonrise on July 2, 1863 about 20:38 local mean time (20:47 EST), 97% lit', where: 'PITCH.md idea 1 (NASA/USNO)', computed: `moonrise ${j2.moon.moonrise.lmt} LMT / ${j2.moon.moonrise.est} EST; illumination at noon ${j2.moon.illumination_noon_lmt_pct}%`, agrees: j2.moon.moonrise.lmt === '20:38' && Math.round(j2.moon.illumination_noon_lmt_pct) === 97 },
    { id: 'P3', claim: 'Moon rises about 66 minutes after sunset on July 2', where: 'PITCH.md idea 1', computed: `${mins(j2.moon.moonrise.lmt) - mins(j2.sun.sunset.lmt)} min (rounded clock times)`, agrees: mins(j2.moon.moonrise.lmt) - mins(j2.sun.sunset.lmt) === 66 },
    { id: 'P4', claim: '91% lit on July 3', where: 'PITCH.md idea 1', computed: `${j3.moon.illumination_noon_lmt_pct}% at noon LMT`, agrees: Math.round(j3.moon.illumination_noon_lmt_pct) === 91 },
    { id: 'P5', claim: 'Full moon July 1 at 06:46 UT (01:46 EST)', where: 'PITCH.md idea 1 (NASA)', computed: principal.filter((p) => p.phase === 'Full Moon').map((p) => `${p.utc} (${p.est} EST, ${p.lmt} LMT)`).join('; '), agrees: principal.some((p) => p.phase === 'Full Moon' && p.utc.startsWith('1863-07-01T06:46')) },
    { id: 'P6', claim: 'The EST-to-local-mean-time shift is 8.9 minutes', where: 'PITCH.md idea 1', computed: `${round(K.EST_MINUS_LMT_MIN, 2)} min (77.2311 W / 15 = 5.14874 h; 5.14874 h - 5 h = 8.92 min)`, agrees: Math.abs(K.EST_MINUS_LMT_MIN - 8.9) < 0.05 },
  ];

  return { days, principal, summary, pitch, usnoMeta, nasaMeta: { url: NASA_URL, sha256: nasaFetch.meta.sha256, bytes: nasaFetch.meta.bytes, retrieved: nasaFetch.meta.retrieved.slice(0, 10) }, aeVer, A, nasaParsedWindow: nasaWin.map((n) => ({ phase: n.phase, text: n.text })) };
}

function methods(aeVer, usnoMeta, nasaMeta) {
  return [
    { id: 'A', name: 'astronomy-engine', version: aeVer, role: 'primary generator', licence: 'MIT', note: 'Sun and Moon topocentric positions with aberration and nutation, observer at sea level (0 m), rise/set of the upper limb with 34 arcmin standard refraction.' },
    { id: 'B', name: 'tools/environment/solar.mjs', version: 'in-repo', role: 'independent deterministic re-computation (Meeus), compared on every value', licence: 'project' },
    { id: 'C', name: 'USNO AA API rstt/oneday v4.0.1, tz=-5', role: 'authority cross-check (whole minutes)', retrieval: 'one request per day, 2026-10-04', hashes: Object.fromEntries(Object.entries(usnoMeta).map(([d, m]) => [d, m.sha256])) },
    { id: 'D', name: 'NASA/GSFC Espenak phases1801.html', role: 'authority cross-check of principal phases (UT, whole minutes)', sha256: nasaMeta.sha256, retrieved: nasaMeta.retrieved },
  ];
}

export async function buildFiles() {
  const r = await build();
  const L = K.LMT_OFFSET_MS / 3600000;
  const byDay = {
    schema_version: 1, dataset: 'astro_by_day',
    title: 'Sun and moon at Gettysburg, June 25 to July 7, 1863',
    status: 'Computed (not measured). The clock this is tied to (local mean time) is a convention of this project, not a record of any 1863 clock.',
    site: { name: 'Gettysburg, Pennsylvania (nominal point)', lat_north: K.LAT, lon_east: K.LON_EAST, elevation_m_assumed: 0, note: 'Sea-level observer, the USNO default. The town is about 150 m above sea level; a real horizon (the ridges, Seminary Ridge and the Round Tops) would change rise and set times by minutes and is not modelled.' },
    time_conventions: {
      primary: 'LMT',
      lmt_definition: 'Local mean time at the site longitude: LMT = UT + longitude_east / 15 h. At 77.2311 W that is UT - 5 h 8.92 min.',
      lmt_offset_hours: round(L, 5), est_equivalent_offset_hours: -5, est_minus_lmt_min: round(K.EST_MINUS_LMT_MIN, 2),
      no_standard_time_1863: 'There was no standard time in 1863. Towns set clocks to local mean solar time or to a railway\'s own time; US standard time zones came with the railroads on 18 November 1883 (source wikipedia-time-us). LMT is therefore a convention, and the EST-equivalent column is offered because modern almanacs (USNO tz=-5) and the pitch quote it.',
      day_boundaries: 'A day is a local-mean-time calendar day [00:00, 24:00) LMT. An event can fall on a different EST-equivalent date (field est_date).',
      rounding: 'hh:mm values are rounded to the nearest minute (half up); lmt_hms shows seconds as computed. Real accuracy is about +-1 minute (ephemeris and refraction model), so no claim finer than one minute is made.',
      tick_clock: 'The 675-tick clock is a CANDIDATE (data-src/time/time_anchors.json, version 2026-09-30.1, release "candidate"; five anchors await a historian). astro_by_day.json does not depend on it. astro_by_tick.json depends on it only through tools/environment/tickclock.mjs tickToLmtMinutes() and embeds the anchors it used.',
    },
    definitions: {
      sunrise_sunset: 'Upper limb of the sun on the horizon, with 34 arcmin of standard atmospheric refraction, observer at sea level.',
      civil_twilight: 'Centre of the sun 6 degrees below the horizon (civil_dawn, civil_dusk). Nautical: 12 degrees. (USNO\'s one-day API lists civil twilight only, so nautical times are cross-checked by methods A and B only.)',
      moonrise_moonset: 'Upper limb of the moon on the horizon, topocentric, 34 arcmin standard refraction.',
      transit: 'Upper transit: the body crosses the local meridian.',
      illumination: 'Illuminated fraction of the lunar disc, in percent, at 12:00 LMT (illumination_noon_lmt_pct) and at 12:00 EST-equivalent (illumination_noon_est_pct, the instant at which USNO\'s integer percentage was found to agree).',
      phase_name: phaseNameRule,
    },
    sources: SOURCES,
    methods: methods(r.aeVer, r.usnoMeta, r.nasaMeta),
    badge_legend: { Computed: 'derived from an ephemeris, not observed', Measured: 'an instrument reading (none in this file)', Modelled: 'an estimate from a model (none in this file)' },
    cross_check_summary: r.summary,
    principal_phases: r.principal,
    nasa_parsed_window: r.nasaParsedWindow,
    pitch_checks: r.pitch,
    days: r.days,
  };

  // ---------------- tick view
  const anchorsDoc = loadAnchors();
  const anchors = anchorsDoc.anchors;
  const columns = ['tick', 'lmt_min', 'lmt', 'sun_alt_deg', 'sun_az_deg', 'moon_alt_deg', 'moon_az_deg', 'moon_illum_pct', 'light', 'moon_up'];
  const light = (alt) => (alt >= -0.8333 ? 'day' : alt >= -6 ? 'civil_twilight' : alt >= -12 ? 'nautical_twilight' : alt >= -18 ? 'astronomical_twilight' : 'night');
  const rows = [];
  let maxSun = 0, maxMoon = 0, maxIllum = 0, maxAz = 0;
  for (let tick = 1; tick <= anchorsDoc.tick_max; tick++) {
    const min = tickToLmtMinutes(tick, anchors), utMs = lmtMinutesToUtMs(min, K.LMT_OFFSET_MS);
    const sa = await C.skyA(utMs), sb = C.skyB(utMs);
    maxSun = Math.max(maxSun, Math.abs(sa.sun.alt - sb.sun.alt)); maxMoon = Math.max(maxMoon, Math.abs(sa.moon.alt - sb.moon.alt)); maxIllum = Math.max(maxIllum, Math.abs(sa.moon.illum - sb.moon.illum) * 100);
    const dAz = (x, y) => Math.abs(((x - y + 540) % 360) - 180); maxAz = Math.max(maxAz, dAz(sa.sun.az, sb.sun.az), dAz(sa.moon.az, sb.moon.az));
    const day = 1 + Math.floor(min / 1440), m = min - Math.floor(min / 1440) * 1440;
    const lmtLabel = `07-${String(day).padStart(2, '0')} ${K.hhmm(m)}`;
    rows.push([tick, round(min, 2), lmtLabel, round(sa.sun.alt, 2), round(sa.sun.az, 1), round(sa.moon.alt, 2), round(sa.moon.az, 1), round(sa.moon.illum * 100, 1), light(sa.sun.alt), sa.moon.alt >= -0.8333 ? 1 : 0]);
  }
  // the sun and moon events of July 1-3 placed on the candidate tick clock (the inverse of tickToLmtMinutes; null where the event is outside ticks 1..675)
  const events = [];
  for (const d of byDay.days.filter((x) => ['1863-07-01', '1863-07-02', '1863-07-03'].includes(x.date))) {
    for (const key of [...C.SUN_EVENTS, ...C.MOON_EVENTS]) {
      const v = (key.startsWith('moon') ? d.moon : d.sun)[key];
      if (v.absent) continue;
      const min = parseLmt(`${d.date}T${v.lmt_hms.slice(0, 5)}`) + Number(v.lmt_hms.slice(6, 8)) / 60;
      const tk = lmtMinutesToTick(min, anchors);
      events.push({ date: d.date, event: key, lmt: v.lmt, lmt_hms: v.lmt_hms, lmt_min: round(min, 2), tick: tk == null ? null : round(tk, 2), ...(tk == null ? { outside_tick_range: min < anchors[0].min ? 'before tick 1 (July 1 05:00 LMT)' : 'after tick 675 (July 3 20:00 LMT)' } : {}) });
    }
  }
  const byTick = {
    schema_version: 1, dataset: 'astro_by_tick',
    title: 'Sun and moon at each of the 675 ticks (candidate clock)',
    status: 'Computed. DEPENDS ON AN UNSIGNED TIME MODEL: the tick-to-clock map is the candidate in data-src/time/time_anchors.json. Rebuild with `node tools/environment/build-astro.mjs` after any anchor changes; validate.mjs warns (error with --strict) when this view is stale.',
    badge: 'Computed', method: 'astronomy-engine', cites: ['astronomy-engine', 'own-meeus'],
    time_model: {
      source: 'data-src/time/time_anchors.json', version: anchorsDoc.version, release: anchorsDoc.release, sha256: anchorsDoc.sha256, tick_max: anchorsDoc.tick_max,
      function: 'tools/environment/tickclock.mjs tickToLmtMinutes(tick, anchors): piecewise-linear in the anchors, minutes since 1863-07-01T00:00 LMT',
      anchors: anchors.map((a) => ({ tick: a.tick, t: a.t, min: a.min, status: a.status, review_flag: a.review_flag })),
      anchors_needing_historian: anchors.filter((a) => a.review_flag === 'needs-historian').map((a) => a.tick),
      anchors_by_review_flag: Object.fromEntries(['evidence-weak', 'owner-decision', 'owner-sign', 'needs-historian', 'none'].map((f) => [f, anchors.filter((a) => (a.review_flag || 'none') === f).map((a) => a.tick)])),
      note: 'CANDIDATE. Nothing here approves it. The anchors flagged needs-historian in the document are ticks 75, 90, 248, 275 and 538, the five the plan lists (docs/plan/FINAL/00-README.md section 6).',
    },
    conventions: {
      clock: 'LMT, minutes since 1863-07-01T00:00 local mean time (lmt_min) and a label "MM-DD HH:MM" (July).',
      altitude: 'Geometric (airless) topocentric altitude of the centre of the body, degrees; azimuth degrees clockwise from north. Refraction would lift a body at the horizon by about 0.6 degree.',
      light: 'day: sun altitude >= -0.8333; civil_twilight >= -6; nautical_twilight >= -12; astronomical_twilight >= -18; night otherwise. Within about a minute of the event times in astro_by_day.',
      moon_up: '1 when the moon\'s altitude >= -0.8333 (same convention; within a minute of the moonrise/moonset times).',
      moon_illum_pct: 'Illuminated fraction of the disc at that instant, percent.',
      precision: 'altitudes 0.01 degree, azimuths 0.1 degree, illumination 0.1 percent; the values are only as good as +-1 minute of clock.',
    },
    cross_check_summary: { ticks: rows.length, method_b_vs_a_max_abs_sun_alt_deg: round(maxSun, 3), method_b_vs_a_max_abs_moon_alt_deg: round(maxMoon, 3), method_b_vs_a_max_abs_az_deg: round(maxAz, 3), method_b_vs_a_max_abs_illum_pct: round(maxIllum, 3) },
    events_note: 'Each event of astro_by_day (July 1-3) placed on the candidate tick clock: tick is fractional (2 decimals) and null when the event is before tick 1 or after tick 675. These numbers move with the anchors; rebuild after any anchor change.',
    events,
    columns, rows,
  };
  return { byDay, byTick };
}

if (process.argv[1] && path.basename(process.argv[1]) === 'build-astro.mjs') {
  const check = process.argv.includes('--check');
  const { byDay, byTick } = await buildFiles();
  const out = { 'astro_by_day.json': pretty(byDay) + '\n', 'astro_by_tick.json': pretty(byTick) + '\n' };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let bad = 0;
  for (const [name, text] of Object.entries(out)) {
    const file = path.join(OUT_DIR, name);
    if (check) { const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null; if (cur !== text) { console.error('STALE: ' + name); bad++; } else console.log('ok ' + name); }
    else { fs.writeFileSync(file, text); console.log('wrote ' + path.relative(ROOT, file) + ' (' + text.length + ' bytes)'); }
  }
  console.log(JSON.stringify(byDay.cross_check_summary, null, 1));
  console.log(JSON.stringify(byTick.cross_check_summary));
  process.exit(bad ? 1 : 0);
}
