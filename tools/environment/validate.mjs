// Validates data-src/environment/*.json:
//   astro_by_day.json   schema; every value recomputed with the independent implementation (solar.mjs, Meeus) within tolerance; clock arithmetic (hh:mm vs the
//                       UTC instant, LMT vs EST-equivalent); the USNO and NASA cross-check numbers recomputed from the data and compared with the cached responses;
//                       Computed badge, method and citations on every value; day lengths; the pitch claims
//   astro_by_tick.json  schema; 675 consecutive ticks; every lmt_min recomputed from the embedded anchors; sun and moon altitude, azimuth and illumination
//                       recomputed with the independent implementation; light classes; staleness against the live time anchors (warning, error with --strict)
//   weather_by_day.json schema; every quote re-found on its leaf of the cached scan (or the committed window) with its printed page; every number re-extracted from its
//                       quote; witnesses re-compared (typed transcriptions and the image reading); badges (Measured only for instrument readings); contested values keep both
//                       readings; the absence claims; the pitch warnings
//   visual_readings.json schema; image hash against the cache
// Usage: node tools/environment/validate.mjs [--require-cache] [--fetch] [--strict] [--json]
import fs from 'node:fs';
import path from 'node:path';
import { loadJson, schemaErrors, isMain, ROOT } from './schema-util.mjs';
import * as K from './clock.mjs';
import * as C from './astro-core.mjs';
import { loadAnchors, tickToLmtMinutes, lmtMinutesToUtMs } from './tickclock.mjs';
import { fetchCached, readCached, CACHE_DIR } from './fetch.mjs';
import { htmlToText } from './htmltext.mjs';
import { alnumKey, loadIaLeaves } from './ia-pages.mjs';
import { locateQuote, pageOfLeaf, checkWitness } from './source-verify.mjs';
import { extract, readCompatible, ecwTemps, ecwWind, verify as classify } from './build-weather.mjs';

const TOL = { eventSeconds: 90, illumPct: 0.1, phaseMinutes: 2.5, sunAlt: 0.03, moonAlt: 0.06, az: 0.15, tickIllum: 0.06, usnoMin: 0.51, nasaLow: -0.1, nasaHigh: 1.05, lmtMin: 0.011 };
const keyOf = (s) => alnumKey(String(s));

// =================================================================== astro_by_day
export async function validateAstroByDay(data, opts = {}) {
  const errors = [], warnings = [], metrics = { values: 0, compared_with_independent_implementation: 0, compared_with_usno: 0, max_own_diff_s: 0, max_usno_diff_min: 0, phases: 0 };
  const err = (m) => errors.push(m);
  schemaErrors('tools/environment/schemas/astro_by_day.schema.json', data).forEach((e) => err('schema(astro_by_day): ' + e));
  const EVENTS = [...C.SUN_EVENTS, ...C.MOON_EVENTS];
  const usnoCache = async (date) => { try { const r = await fetchCached(`https://aa.usno.navy.mil/api/rstt/oneday?date=${date}&coords=39.8309,-77.2311&tz=-5`, { name: `usno-oneday-${date}-tz-5.json`, offline: true }); return JSON.parse(readCached(r.file)).properties.data; } catch (e) { if (e.name === 'NotCachedError') return null; throw e; } };
  for (const day of data.days || []) {
    const evB = C.eventsB(day.date);
    const usno = await usnoCache(day.date);
    for (const key of EVENTS) {
      const v = (key.startsWith('moon') ? day.moon : day.sun)[key];
      if (!v) { err(`${day.date} ${key}: missing`); continue; }
      const b = evB[key];
      if (v.absent) { if (b != null) err(`${day.date} ${key}: recorded as absent but the independent implementation finds an event at ${new Date(b).toISOString()}`); continue; }
      metrics.values++;
      if (b == null) { err(`${day.date} ${key}: the independent implementation finds no such event inside this LMT day`); continue; }
      const utMs = Date.parse(v.utc);
      const diffS = (b - utMs) / 1000;
      metrics.compared_with_independent_implementation++; metrics.max_own_diff_s = Math.max(metrics.max_own_diff_s, Math.abs(diffS));
      if (Math.abs(diffS) > TOL.eventSeconds) err(`${day.date} ${key}: ${v.utc} differs from the independent implementation by ${diffS.toFixed(1)} s (limit ${TOL.eventSeconds} s)`);
      if (!v.cross_check) err(`${day.date} ${key}: cross_check block missing`);
      else if (v.cross_check.own_minus_a_s != null && Math.abs(v.cross_check.own_minus_a_s - diffS) > 0.6) err(`${day.date} ${key}: recorded own-minus-A ${v.cross_check.own_minus_a_s} s but recomputed ${diffS.toFixed(1)} s`);
      // clock arithmetic
      const lmt = K.clockFields(utMs, K.LMT_OFFSET_MS), est = K.clockFields(utMs, K.EST_OFFSET_MS);
      if (K.hhmm(lmt.minutes) !== v.lmt) err(`${day.date} ${key}: lmt ${v.lmt} but the UTC instant gives ${K.hhmm(lmt.minutes)}`);
      const hmsSec = (x) => Number(x.slice(0, 2)) * 3600 + Number(x.slice(3, 5)) * 60 + Number(x.slice(6, 8));
      if (Math.abs(hmsSec(K.hhmmss(lmt.minutes)) - hmsSec(v.lmt_hms)) > 1) err(`${day.date} ${key}: lmt_hms ${v.lmt_hms} but the UTC instant gives ${K.hhmmss(lmt.minutes)} (more than the 1 s allowed for rounding the UTC instant to a whole second)`);
      if (K.hhmm(est.minutes) !== v.est) err(`${day.date} ${key}: est ${v.est} but the UTC instant gives ${K.hhmm(est.minutes)}`);
      if (est.date !== v.est_date) err(`${day.date} ${key}: est_date ${v.est_date} but the UTC instant gives ${est.date}`);
      if (lmt.date !== day.date) err(`${day.date} ${key}: the instant falls on LMT date ${lmt.date}`);
      if (Math.abs((est.minutes - lmt.minutes + (est.date !== lmt.date ? 1440 * (est.date > lmt.date ? 1 : -1) : 0)) - K.EST_MINUS_LMT_MIN) > 1e-6) err(`${day.date} ${key}: EST minus LMT is not ${K.EST_MINUS_LMT_MIN.toFixed(2)} min`);
      // USNO
      const cc = v.cross_check || {};
      if (cc.usno_est != null && cc.usno_est !== undefined) {
        metrics.compared_with_usno++;
        const usnoMs = Date.parse(`${cc.usno_est_date}T${cc.usno_est}:00Z`) - K.EST_OFFSET_MS;
        const d = (utMs - usnoMs) / 60000;
        metrics.max_usno_diff_min = Math.max(metrics.max_usno_diff_min, Math.abs(d));
        if (Math.abs(d - cc.a_minus_usno_min) > 0.02) err(`${day.date} ${key}: recorded a_minus_usno_min ${cc.a_minus_usno_min} but the values give ${d.toFixed(2)}`);
        if (Math.abs(d) > TOL.usnoMin) err(`${day.date} ${key}: differs from the USNO value ${cc.usno_est} by ${d.toFixed(2)} min (limit ${TOL.usnoMin})`);
      }
      if (v.badge !== 'Computed' || v.method !== 'astronomy-engine' || !(v.cites || []).includes('astronomy-engine')) err(`${day.date} ${key}: badge, method or citation missing`);
    }
    // the USNO cache itself
    if (usno) {
      const map = { 'Begin Civil Twilight': ['sun', 'civil_dawn'], Rise: ['sun', 'sunrise'], 'Upper Transit': ['sun', 'solar_transit'], Set: ['sun', 'sunset'], 'End Civil Twilight': ['sun', 'civil_dusk'] };
      for (const e of usno.sundata) { const m = map[e.phen]; if (!m) continue; const v = day.sun[m[1]]; const rec = [...(day.sun[m[1]] ? [day.sun[m[1]]] : [])].find((x) => x.cross_check && x.cross_check.usno_est === e.time) || null; if (!rec && !data.days.some((d2) => d2.sun[m[1]] && d2.sun[m[1]].cross_check && d2.sun[m[1]].cross_check.usno_est === e.time && d2.sun[m[1]].cross_check.usno_est_date === `${usno.year}-${String(usno.month).padStart(2, '0')}-${String(usno.day).padStart(2, '0')}`)) err(`${day.date} ${m[1]}: the cached USNO response lists ${e.time} for that EST day, which is recorded nowhere in the data`); }
      if (Number(String(usno.fracillum).replace('%', '')) !== day.moon.cross_check.usno_fracillum_pct) err(`${day.date}: recorded USNO illumination ${day.moon.cross_check.usno_fracillum_pct} but the cached response says ${usno.fracillum}`);
    }
    // moon state
    const noonLmt = K.lmtMidnightUtMs(day.date) + 12 * 3600000, noonEst = Date.UTC(+day.date.slice(0, 4), +day.date.slice(5, 7) - 1, +day.date.slice(8, 10), 12) - K.EST_OFFSET_MS;
    const ib = C.illumB(noonLmt) * 100, ibEst = C.illumB(noonEst) * 100;
    if (Math.abs(ib - day.moon.illumination_noon_lmt_pct) > TOL.illumPct) err(`${day.date}: moon illumination at noon LMT ${day.moon.illumination_noon_lmt_pct}% but the independent implementation gives ${ib.toFixed(2)}%`);
    if (Math.abs(ibEst - day.moon.illumination_noon_est_pct) > TOL.illumPct) err(`${day.date}: moon illumination at noon EST ${day.moon.illumination_noon_est_pct}% but the independent implementation gives ${ibEst.toFixed(2)}%`);
    if (Math.abs(day.moon.illumination_noon_est_pct - day.moon.cross_check.usno_fracillum_pct) > 0.51) err(`${day.date}: illumination ${day.moon.illumination_noon_est_pct}% differs from USNO's ${day.moon.cross_check.usno_fracillum_pct}% by more than rounding`);
    const el = C.elongationB(noonLmt);
    if (Math.abs(((el - day.moon.ecliptic_elongation_noon_lmt_deg + 540) % 360) - 180) > 0.3) err(`${day.date}: moon elongation ${day.moon.ecliptic_elongation_noon_lmt_deg} but the independent implementation gives ${el.toFixed(2)}`);
    // day length
    const sr = Date.parse(day.sun.sunrise.utc), ss = Date.parse(day.sun.sunset.utc);
    if (Math.abs((ss - sr) / 60000 - day.day_length_min) > 0.1) err(`${day.date}: day_length_min ${day.day_length_min} but sunset minus sunrise is ${((ss - sr) / 60000).toFixed(1)}`);
  }
  // principal phases
  const phB = C.principalPhasesB(Date.UTC(1863, 5, 10), Date.UTC(1863, 6, 20));
  for (const p of data.principal_phases || []) {
    metrics.phases++;
    const b = phB.find((x) => x.phase === p.phase && Math.abs(x.utMs - Date.parse(p.utc)) < 86400000);
    if (!b) { err(`phase ${p.phase} ${p.utc}: not found by the independent implementation`); continue; }
    if (Math.abs((b.utMs - Date.parse(p.utc)) / 60000) > TOL.phaseMinutes) err(`phase ${p.phase}: ${p.utc} differs from the independent implementation by ${((b.utMs - Date.parse(p.utc)) / 60000).toFixed(2)} min`);
    const cc = p.cross_check;
    if (cc.nasa_ut) {
      const nasaMs = Date.parse(cc.nasa_ut.replace(' ', 'T') + ':00Z');
      const d = (Date.parse(p.utc) - nasaMs) / 60000;
      if (Math.abs(d - cc.a_minus_nasa_min) > 0.02) err(`phase ${p.phase}: recorded a_minus_nasa_min ${cc.a_minus_nasa_min} but the values give ${d.toFixed(2)}`);
      if (d < TOL.nasaLow || d > TOL.nasaHigh) err(`phase ${p.phase}: differs from NASA's ${cc.nasa_ut} UT by ${d.toFixed(2)} min (NASA truncates to the minute, so [0,1) is expected)`);
    }
    const lmt = K.clockFields(Date.parse(p.utc), K.LMT_OFFSET_MS), est = K.clockFields(Date.parse(p.utc), K.EST_OFFSET_MS);
    if (K.hhmm(lmt.minutes) !== p.lmt || lmt.date !== p.lmt_date || K.hhmm(est.minutes) !== p.est || est.date !== p.est_date) err(`phase ${p.phase}: lmt/est labels do not match the UTC instant`);
  }
  // the NASA cache itself
  try {
    const r = await fetchCached('https://eclipse.gsfc.nasa.gov/phase/phases1801.html', { name: 'nasa-espenak-phases1801.html', offline: true });
    const { parseNasa1863 } = await import('./build-astro.mjs');
    const all = parseNasa1863(htmlToText(readCached(r.file)));
    for (const p of data.principal_phases) { const n = all.find((x) => x.phase === p.phase && Math.abs(x.utMs - Date.parse(p.utc)) < 86400000); if (!n || n.text !== p.cross_check.nasa_text) err(`phase ${p.phase}: the cached NASA table says ${n ? n.text : 'nothing'} but the data records ${p.cross_check.nasa_text}`); }
  } catch (e) { if (e.name !== 'NotCachedError') throw e; if (opts.requireCache) err('NASA phases page not cached and --require-cache is set'); }
  for (const p of data.pitch_checks || []) if (!p.agrees) err(`pitch check ${p.id} ("${p.claim}") is recorded as disagreeing with the computed values`);
  // summary
  const s = data.cross_check_summary;
  if (s && Math.abs(s.usno.max_abs_diff_min - metrics.max_usno_diff_min) > 0.02) err(`cross_check_summary.usno.max_abs_diff_min ${s.usno.max_abs_diff_min} but the values give ${metrics.max_usno_diff_min.toFixed(2)}`);
  if (s && s.usno.events_compared !== metrics.compared_with_usno) err(`cross_check_summary.usno.events_compared ${s.usno.events_compared} but ${metrics.compared_with_usno} values carry a USNO comparison`);
  return { errors, warnings, metrics };
}

// =================================================================== astro_by_tick
export async function validateAstroByTick(data, opts = {}) {
  const errors = [], warnings = [], metrics = { ticks: 0, max_sun_alt_diff: 0, max_moon_alt_diff: 0, max_az_diff: 0, max_illum_diff: 0 };
  const err = (m) => errors.push(m);
  schemaErrors('tools/environment/schemas/astro_by_tick.schema.json', data).forEach((e) => err('schema(astro_by_tick): ' + e));
  const anchors = (data.time_model && data.time_model.anchors) || [];
  if (anchors.length) {
    if (anchors[0].tick !== 1 || anchors[anchors.length - 1].tick !== 675) err('anchors must run from tick 1 to tick 675');
    anchors.forEach((a, i) => { if (i && !(a.tick > anchors[i - 1].tick && a.min > anchors[i - 1].min)) err(`anchors are not strictly increasing at tick ${a.tick}`); });
  }
  const light = (alt) => (alt >= -0.8333 ? 'day' : alt >= -6 ? 'civil_twilight' : alt >= -12 ? 'nautical_twilight' : alt >= -18 ? 'astronomical_twilight' : 'night');
  (data.rows || []).forEach((row, i) => {
    const [tick, lmtMin, label, sunAlt, sunAz, moonAlt, moonAz, illum, lt, up] = row;
    metrics.ticks++;
    if (tick !== i + 1) err(`row ${i}: tick ${tick}, expected ${i + 1}`);
    let want;
    try { want = tickToLmtMinutes(tick, anchors); } catch (e) { err(`tick ${tick}: ${e.message}`); return; }
    if (Math.abs(want - lmtMin) > TOL.lmtMin) err(`tick ${tick}: lmt_min ${lmtMin} but the embedded anchors give ${want.toFixed(2)}`);
    const day = 1 + Math.floor(lmtMin / 1440), m = lmtMin - Math.floor(lmtMin / 1440) * 1440;
    const okLabels = new Set([K.hhmm(m), K.hhmm(m - 0.005), K.hhmm(m + 0.005)].map((x) => `07-${String(day).padStart(2, '0')} ${x}`)); // lmt_min is stored rounded to 0.01 min
    if (!okLabels.has(label)) err(`tick ${tick}: label ${label} but lmt_min gives ${[...okLabels][0]}`);
    const utMs = lmtMinutesToUtMs(lmtMin, K.LMT_OFFSET_MS), b = C.skyB(utMs);
    const dS = Math.abs(b.sun.alt - sunAlt), dM = Math.abs(b.moon.alt - moonAlt), dI = Math.abs(b.moon.illum * 100 - illum);
    const dAz = Math.max(Math.abs(((b.sun.az - sunAz + 540) % 360) - 180), Math.abs(((b.moon.az - moonAz + 540) % 360) - 180));
    metrics.max_sun_alt_diff = Math.max(metrics.max_sun_alt_diff, dS); metrics.max_moon_alt_diff = Math.max(metrics.max_moon_alt_diff, dM); metrics.max_az_diff = Math.max(metrics.max_az_diff, dAz); metrics.max_illum_diff = Math.max(metrics.max_illum_diff, dI);
    if (dS > TOL.sunAlt) err(`tick ${tick}: sun altitude ${sunAlt} differs from the independent implementation by ${dS.toFixed(3)} deg`);
    if (dM > TOL.moonAlt) err(`tick ${tick}: moon altitude ${moonAlt} differs from the independent implementation by ${dM.toFixed(3)} deg`);
    if (dAz > TOL.az) err(`tick ${tick}: azimuth differs from the independent implementation by ${dAz.toFixed(3)} deg`);
    if (dI > TOL.tickIllum) err(`tick ${tick}: moon illumination ${illum}% differs from the independent implementation by ${dI.toFixed(3)} points`);
    if (lt !== light(sunAlt)) err(`tick ${tick}: light class ${lt} but sun altitude ${sunAlt} gives ${light(sunAlt)}`);
    if (up !== (moonAlt >= -0.8333 ? 1 : 0)) err(`tick ${tick}: moon_up ${up} but moon altitude ${moonAlt}`);
  });
  if ((data.rows || []).length !== 675) err(`expected 675 rows, found ${(data.rows || []).length}`);
  // staleness against the live anchors
  try {
    const live = loadAnchors();
    if (live.sha256 !== data.time_model.sha256) warnings.push(`STALE: data-src/time/time_anchors.json changed since astro_by_tick.json was built (embedded ${data.time_model.sha256.slice(0, 12)}, live ${live.sha256.slice(0, 12)}); rebuild with node tools/environment/build-astro.mjs`);
  } catch (e) { warnings.push('could not read data-src/time/time_anchors.json: ' + e.message); }
  if (data.time_model && data.time_model.release !== 'candidate') warnings.push(`the time model release is "${data.time_model.release}", not "candidate": re-read the status text of astro_by_tick.json`);
  return { errors, warnings, metrics };
}

// =================================================================== weather_by_day
const MEASURED_ELEMENTS = new Set(['temperature', 'temperature_month_max', 'precipitation']);
export async function validateWeather(data, opts = {}) {
  const errors = [], warnings = [], metrics = { quotes: 0, quotes_checked_against_cache: 0, quotes_checked_against_windows: 0, numbers_reextracted: 0, two_path_values: 0 };
  const err = (m) => errors.push(m);
  const windows = opts.windows || (fs.existsSync(path.join(ROOT, 'data-src/environment/source_windows.json')) ? loadJson('data-src/environment/source_windows.json').windows : {});
  const visual = opts.visual || loadJson('data-src/environment/visual_readings.json');
  schemaErrors('tools/environment/schemas/weather_by_day.schema.json', data).forEach((e) => err('schema(weather_by_day): ' + e));
  schemaErrors('tools/ledger/schemas/visual_readings.schema.json', visual).forEach((e) => err('schema(environment visual_readings): ' + e));
  const quotes = Object.fromEntries((data.quotes || []).map((q) => [q.id, q]));
  if (Object.keys(quotes).length !== (data.quotes || []).length) err('duplicate quote ids');
  const vr = visual.readings.find((r) => r.id === 'VR-ecw-clipping-1885');
  if (!vr) err('visual reading VR-ecw-clipping-1885 missing');
  else { const mf = path.join(CACHE_DIR, vr.image.cache + '.meta.json'); if (fs.existsSync(mf) && JSON.parse(fs.readFileSync(mf, 'utf8')).sha256 !== vr.image.sha256) err('the cached clipping image differs from the one the reading was made on'); }

  // ---- cached text of the 1885 witnesses
  let rxText = null, ecwText = null;
  const art = (data.sources || []).find((s) => s.id === 'jacobs-meteorology-1885');
  const rxUrl = art && art.witnesses.find((w) => w.id === 'rx').url, ecwUrl = art && art.witnesses.find((w) => w.id === 'ecw').url;
  try { rxText = htmlToText(readCached((await fetchCached(rxUrl, { name: 'civilwarrx-gettysburg-meteorology.html', offline: true })).file)); } catch (e) { if (e.name !== 'NotCachedError') throw e; }
  try { ecwText = htmlToText(readCached((await fetchCached(ecwUrl, { name: 'ecw-thunder-seemed-tame.html', offline: true })).file)); } catch (e) { if (e.name !== 'NotCachedError') throw e; }
  if ((!rxText || !ecwText) && opts.requireCache) err('the Civil War Rx or Emerging Civil War page is not cached and --require-cache is set');

  // ---- quotes
  for (const q of data.quotes || []) {
    metrics.quotes++;
    if (q.source === 'jacobs-notes-1864' || q.source === 'haskell-1908') {
      let usedCache = false;
      for (const w of q.witnesses) {
        try {
          const problems = await checkWitness({ ia: w.ia, kind: w.kind, leaf: w.leaf, printed_page: w.printed_page }, q.text, true);
          problems.forEach((p) => err(`quote ${q.id} (witness ${w.witness}): ${p}`));
          usedCache = true;
        } catch (e) {
          if (e.name !== 'NotCachedError') throw e;
          const win = windows[`${q.id}|${w.witness}`];
          if (opts.requireCache) err(`quote ${q.id}: ${w.ia} not cached and --require-cache is set`);
          else if (!win) warnings.push(`quote ${q.id}: ${w.ia} not cached and no committed window`);
          else {
            metrics.quotes_checked_against_windows++;
            if (win.leaf !== w.leaf || win.printed_page !== w.printed_page) err(`quote ${q.id} (witness ${w.witness}): leaf/page ${w.leaf}/${w.printed_page} differ from the committed window's ${win.leaf}/${win.printed_page}`);
            if (!keyOf(win.text).includes(keyOf(q.text))) err(`quote ${q.id} (witness ${w.witness}): the quote is not in the committed window`);
          }
        }
      }
      if (usedCache) metrics.quotes_checked_against_cache++;
      if (q.printed_page !== q.witnesses[0].printed_page) err(`quote ${q.id}: printed_page ${q.printed_page} differs from its witness`);
    } else if (q.source === 'jacobs-meteorology-1885') {
      if (rxText) { metrics.quotes_checked_against_cache++; if (!keyOf(rxText).includes(keyOf(q.text))) err(`quote ${q.id}: not found in the cached Civil War Rx transcription`); }
      else { const win = windows[`${q.id}|rx`]; if (win && win.text !== undefined) { metrics.quotes_checked_against_windows++; if (!keyOf(win.text || win).includes(keyOf(q.text))) err(`quote ${q.id}: not in the committed window`); } else if (!opts.requireCache) warnings.push(`quote ${q.id}: transcription not cached and no window`); }
    }
  }
  // 1864 page-level absence claims
  const src = (data.sources || []).find((s) => s.id === 'jacobs-notes-1864');
  if (src && src.contains_weather_table !== false) err('jacobs-notes-1864.contains_weather_table must be false: no thermometer table was found in the three scans');
  for (const c of (src && src.copies) || []) {
    try {
      const leaves = (await loadIaLeaves(c.ia, { kind: c.kind, offline: true })).leaves;
      for (const needle of ['seemed tame', 'Thermometer', 'thermometer', 'barometer', 'miles per hour']) if (locateQuote(leaves, needle).length) err(`"${needle}" IS in copy ${c.id} (${c.ia}): the claim that the 1864 Notes contain no thermometer table or wind speed is false`);
    } catch (e) { if (e.name !== 'NotCachedError') throw e; if (opts.requireCache) err(`${c.ia} not cached and --require-cache is set`); }
  }
  // external statements (NCEI, MRCC)
  for (const x of data.external_statements || []) {
    try {
      const r = await fetchCached(x.url, { name: x.cache, offline: true });
      const text = htmlToText(readCached(r.file));
      if (!keyOf(text).includes(keyOf(x.text))) err(`external statement ${x.id}: "${x.text.slice(0, 50)}" not found in the cached page`);
      if (x.absent_text && keyOf(text).includes(keyOf(x.absent_text)) && x.absent_text === 'Gettysburg') err(`external statement ${x.id}: the cached MRCC station list now contains "Gettysburg": the claim that no Gettysburg station was keyed is out of date`);
      if (r.meta.sha256 !== x.sha256) warnings.push(`external statement ${x.id}: the cached page differs from the one the data was built on`);
    } catch (e) { if (e.name !== 'NotCachedError') throw e; if (opts.requireCache) err(`${x.cache} not cached and --require-cache is set`); }
  }

  // ---- observations
  const obsById = Object.fromEntries((data.observations || []).map((o) => [o.id, o]));
  if (Object.keys(obsById).length !== (data.observations || []).length) err('duplicate observation ids');
  const cell = (id) => vr && vr.cells.find((c) => c.id === id);
  const dayIdx = { '1863-07-01': 'd1', '1863-07-02': 'd2', '1863-07-03': 'd3', '1863-07-04': 'd4' };
  for (const o of data.observations || []) {
    const q = quotes[o.quote];
    if (!q) { err(`${o.id}: unknown quote ${o.quote}`); continue; }
    if (o.element === 'wind_speed' && o.date === '1863-07-03') err(`${o.id}: there is no wind-speed figure for July 3 in the article`);
    if (o.badge === 'Measured' && !MEASURED_ELEMENTS.has(o.element)) err(`${o.id}: badge Measured is only for instrument readings (temperature, rain gauge), not ${o.element}`);
    if (o.badge === 'Contested') {
      if (o.value !== null) err(`${o.id}: a Contested observation must not choose a value`);
      if (o.element === 'wind_speed' && o.values) {
        const distinct = new Set(o.values.map((x) => x.value));
        if (distinct.size < 2) err(`${o.id}: Contested but the readings do not differ`);
        for (const x of o.values) if (!x.source_witness) err(`${o.id}: each reading needs its source witness`);
        if (ecwText) { const e = ecwWind(ecwText); const entry = o.values.find((x) => x.source_witness === 'ecw'); if (!entry || entry.value !== e) err(`${o.id}: the ECW reading is ${entry && entry.value} but the cached ECW text says ${e}`); }
        if (rxText) { const entry = o.values.find((x) => x.source_witness === 'rx'); const v = extract({ type: 'regex', pattern: '\\((\\d+) miles per hour\\)', group: 1 }, q.text); if (!entry || entry.value !== v) err(`${o.id}: the Rx reading is ${entry && entry.value} but its quote gives ${v}`); }
      }
      if (o.status !== 'open') err(`${o.id}: Contested observations stay open`);
      continue;
    }
    // re-extract numbers from the quote
    if (o.extract) {
      const v = extract(o.extract, q.text);
      metrics.numbers_reextracted++;
      if (v !== o.value) err(`${o.id}: value ${o.value} but its quote "${q.text.slice(0, 50)}..." gives ${v} by the rule ${JSON.stringify(o.extract)}`);
    }
    // witnesses re-compared
    if (o.element === 'temperature' && o.extract) {
      const wit = [];
      const rxv = extract(o.extract, q.text);
      if (o.verification.level !== 'garbled_single_transcription') wit.push({ id: 'rx', value: rxv, agrees: true });
      if (o.element === 'temperature') {
        const slotIx = { '7am': 0, '2pm': 1, '9pm': 2 }[o.slot];
        const ecw = ecwText ? ecwTemps(ecwText, o.date) : (o.witnesses.find((w) => w.id === 'ecw') ? [null, null, null].map((_, i) => (i === slotIx ? o.witnesses.find((w) => w.id === 'ecw').value : null)) : null);
        if (ecw && ecw[slotIx] != null) wit.push({ id: 'ecw', value: ecw[slotIx], agrees: ecw[slotIx] === o.value });
        const c = dayIdx[o.date] && cell(`${dayIdx[o.date]}-${o.slot}`);
        if (c) wit.push({ id: 'ecw-image', read: c.read, legibility: c.legibility, agrees: c.legibility === 'clear' ? c.read === String(o.value) : readCompatible(c.read, o.value), exact: c.legibility === 'clear' });
        const got = classify(wit).verification;
        if (got.level !== o.verification.level) err(`${o.id}: verification level ${o.verification.level} but the witnesses give ${got.level}`);
        if (got.independent_paths_agreeing !== o.verification.independent_paths_agreeing) err(`${o.id}: independent paths ${o.verification.independent_paths_agreeing} but the witnesses give ${got.independent_paths_agreeing}`);
        if (got.level === 'two_independent_paths') metrics.two_path_values++;
        if (got.level === 'conflict') err(`${o.id}: the witnesses disagree`);
      }
    }
    if (o.badge === 'Measured' && !o.badge_basis) err(`${o.id}: Measured needs its basis`);
  }
  // the day view
  for (const d of data.days || []) {
    for (const [slot, t] of Object.entries(d.temperature_F || {})) { const o = obsById[`W-${d.date}-temp-${slot}`]; if (!o || o.value !== t.value) err(`day ${d.date} ${slot}: ${t.value} does not match the observation`); }
  }
  // pitch checks and warnings
  const pc = Object.fromEntries((data.pitch_checks || []).map((p) => [p.id, p]));
  for (const id of ['PC1', 'PC2', 'PC3', 'PC4', 'PC5', 'PC6', 'PC7', 'PC8', 'PC9']) if (!pc[id]) err(`pitch check ${id} is missing`);
  if (pc.PC7 && (pc.PC7.agrees !== false || !pc.PC7.correction)) err('PC7 (wind on July 3) must be recorded as NOT agreeing, with the correction');
  if (pc.PC9 && pc.PC9.agrees !== false) err('PC9 (source of the numbers) must be recorded as NOT agreeing');
  const t = (data.observations || []).filter((o) => o.element === 'temperature');
  const max = t.reduce((m, o) => (o.value > m.value ? o : m), t[0]);
  if (!(max && max.value === 87 && max.id === 'W-1863-07-03-temp-2pm')) err(`PC2: the maximum tabulated reading is ${max && max.value} at ${max && max.id}, not 87 at July 3 2 p.m.`);
  if (!(data.warnings || []).some((w) => /scan/.test(w) && /not located|were not seen|No scan/i.test(w))) err('a warning that the printed 1885 page and the original forms were not seen is required');
  // summary
  const vs = data.verification_summary;
  if (vs.values_confirmed_by_two_independent_paths !== (data.observations || []).filter((o) => o.verification && o.verification.level === 'two_independent_paths' && typeof o.value === 'number').length) err('verification_summary.values_confirmed_by_two_independent_paths does not match the observations');
  if (vs.observations !== (data.observations || []).length) err('verification_summary.observations does not match');
  // the Haskell quote page is bracketed in the print
  return { errors, warnings, metrics };
}

// =================================================================== all
export async function validateAll(opts = {}) {
  const errors = [], warnings = [], metrics = {};
  const byDay = opts.astroByDay || loadJson('data-src/environment/astro_by_day.json'), byTick = opts.astroByTick || loadJson('data-src/environment/astro_by_tick.json'), weather = opts.weather || loadJson('data-src/environment/weather_by_day.json');
  for (const [name, fn, data] of [['astro_by_day', validateAstroByDay, byDay], ['astro_by_tick', validateAstroByTick, byTick], ['weather_by_day', validateWeather, weather]]) {
    const r = await fn(data, opts);
    r.errors.forEach((e) => errors.push(`${name}: ${e}`)); r.warnings.forEach((w) => warnings.push(`${name}: ${w}`)); metrics[name] = r.metrics;
  }
  return { errors, warnings, metrics };
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  const res = await validateAll({ requireCache: args.includes('--require-cache') });
  if (args.includes('--strict')) { res.errors.push(...res.warnings); res.warnings = []; }
  if (args.includes('--json')) console.log(JSON.stringify(res, null, 1));
  else {
    for (const w of res.warnings) console.warn('warning: ' + w);
    for (const e of res.errors) console.error('ERROR: ' + e);
    console.log(`environment: ${res.errors.length} error(s), ${res.warnings.length} warning(s); ` + JSON.stringify(res.metrics));
  }
  process.exit(res.errors.length ? 1 : 0);
}
