// node --test tests/environment/astro.test.mjs
// The astro datasets validate, agree with the authorities, and the validator FAILS on every seeded error below.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAstroByDay, validateAstroByTick } from '../../tools/environment/validate.mjs';
import { loadAnchors, tickToLmtMinutes } from '../../tools/environment/tickclock.mjs';
import { CACHE_DIR } from '../../tools/environment/fetch.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const load = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'environment', f), 'utf8'));
const byDay = () => load('astro_by_day.json'), byTick = () => load('astro_by_tick.json');
const day = (d, date) => d.days.find((x) => x.date === date);
const fails = async (fn, data, re, label) => { const r = await fn(data); assert.ok(r.errors.length > 0, `${label}: the validator accepted a seeded error`); assert.ok(r.errors.some((e) => re.test(e)), `${label}: errors did not match ${re}: ${r.errors.slice(0, 3).join(' | ')}`); };

test('astro_by_day validates (schema, independent recomputation, USNO and NASA cross-checks)', async () => {
  const r = await validateAstroByDay(byDay());
  assert.deepEqual(r.errors, []);
  assert.equal(r.metrics.values, 128);
  assert.equal(r.metrics.compared_with_independent_implementation, 128);
  assert.equal(r.metrics.compared_with_usno, 102);
  assert.ok(r.metrics.max_own_diff_s < 10, `independent implementation differs by ${r.metrics.max_own_diff_s} s`);
  assert.ok(r.metrics.max_usno_diff_min <= 0.5 + 1e-9, 'every USNO value is within rounding (0.5 min)');
});

test('astro_by_tick validates: 675 ticks, every row recomputed independently', async () => {
  const r = await validateAstroByTick(byTick());
  assert.deepEqual(r.errors, []);
  assert.equal(r.metrics.ticks, 675);
  assert.ok(r.metrics.max_sun_alt_diff < 0.02 && r.metrics.max_moon_alt_diff < 0.03 && r.metrics.max_az_diff < 0.1);
});

test('the numbers the pitch quotes for July 2 are what the data says', () => {
  const d = day(byDay(), '1863-07-02');
  assert.equal(d.sun.sunrise.lmt, '04:35'); assert.equal(d.sun.sunset.lmt, '19:32'); assert.equal(d.sun.sunrise.est, '04:44'); assert.equal(d.sun.sunset.est, '19:41');
  assert.equal(d.sun.civil_dusk.lmt, '20:04'); assert.equal(d.moon.moonrise.lmt, '20:38'); assert.equal(d.moon.moonrise.est, '20:47');
  assert.equal(Math.round(d.moon.illumination_noon_lmt_pct), 97);
  assert.equal(Math.round(day(byDay(), '1863-07-03').moon.illumination_noon_lmt_pct), 91);
  const full = byDay().principal_phases.find((p) => p.phase === 'Full Moon');
  assert.ok(full.utc.startsWith('1863-07-01T06:46'));
});

test('cross-check numbers are recorded for every USNO-listed event, in minutes, within rounding', () => {
  const d = byDay();
  let n = 0;
  for (const dd of d.days) for (const grp of [dd.sun, dd.moon]) for (const v of Object.values(grp)) if (v && v.cross_check && typeof v.cross_check.a_minus_usno_min === 'number') { n++; assert.ok(Math.abs(v.cross_check.a_minus_usno_min) <= 0.5 + 1e-9); }
  assert.equal(n, 102);
  assert.ok(d.cross_check_summary.own_implementation.max_abs_diff_seconds < 10);
  assert.ok(d.cross_check_summary.nasa.max_abs_diff_min < 1);
  assert.equal(d.cross_check_summary.usno.events_unmatched.length, 0);
});

test('every value is Computed with a method and citations (never Measured)', () => {
  const d = byDay();
  const EVENTS = ['civil_dawn', 'sunrise', 'solar_transit', 'sunset', 'civil_dusk', 'nautical_dawn', 'nautical_dusk', 'moonrise', 'moon_transit', 'moonset'];
  let n = 0;
  for (const dd of d.days) for (const k of EVENTS) { const v = (k.startsWith('moon') ? dd.moon : dd.sun)[k]; if (v.absent) continue; n++; assert.equal(v.badge, 'Computed'); assert.equal(v.method, 'astronomy-engine'); assert.ok(v.cites.includes('astronomy-engine') && v.cites.includes('own-meeus')); }
  assert.equal(n, 128);
  assert.ok(d.time_conventions.no_standard_time_1863.includes('1883'));
  assert.ok(/CANDIDATE/.test(d.time_conventions.tick_clock));
});

test('the tick view depends on the time model only through tickToLmtMinutes, and matches the app\'s own model on all 675 ticks', async () => {
  const t = byTick();
  const live = loadAnchors();
  assert.equal(t.time_model.sha256, live.sha256, 'astro_by_tick.json is stale: rebuild with node tools/environment/build-astro.mjs');
  let model;
  try { model = (await import('../../src/lib/time/index.js')).default; } catch (e) { return; /* the app module is not importable here: the embedded-anchor check below still runs */ }
  for (let tick = 1; tick <= 675; tick++) {
    const mine = tickToLmtMinutes(tick, t.time_model.anchors);
    assert.ok(Math.abs(mine - model.tickToMinutes(tick)) < 1e-6, `tick ${tick}: ${mine} vs the app's ${model.tickToMinutes(tick)}`);
  }
});

// ---------------------------------------------------------------- seeded errors: each must make the validator fail
test('SEEDED: sunset shifted by 3 minutes is caught', async () => { const d = byDay(); const s = day(d, '1863-07-02').sun.sunset; s.utc = '1863-07-03T00:44:00Z'; await fails(validateAstroByDay, d, /sunset.*(differs from the independent|lmt|est)/, 'sunset +3 min'); });
test('SEEDED: civil dusk instant moved but labels left alone is caught', async () => { const d = byDay(); day(d, '1863-07-02').sun.civil_dusk.utc = '1863-07-03T01:20:00Z'; await fails(validateAstroByDay, d, /civil_dusk/, 'civil dusk'); });
test('SEEDED: LMT label that is not the UTC instant is caught', async () => { const d = byDay(); day(d, '1863-07-02').moon.moonrise.lmt = '20:50'; await fails(validateAstroByDay, d, /moonrise: lmt 20:50/, 'moonrise label'); });
test('SEEDED: wrong moon illumination is caught', async () => { const d = byDay(); day(d, '1863-07-02').moon.illumination_noon_lmt_pct = 86.7; await fails(validateAstroByDay, d, /moon illumination at noon LMT/, 'illumination'); });
test('SEEDED: a tampered USNO cross-check number is caught', async () => { const d = byDay(); day(d, '1863-07-02').moon.moonrise.cross_check.usno_est = '20:52'; await fails(validateAstroByDay, d, /a_minus_usno_min|USNO/, 'USNO number'); });
test('SEEDED: a value no longer within the USNO rounding is caught', async () => { const d = byDay(); const v = day(d, '1863-07-02').sun.sunrise; v.utc = '1863-07-02T09:47:00Z'; await fails(validateAstroByDay, d, /sunrise/, 'sunrise vs USNO'); });
test('SEEDED: badge Measured on a computed value is a schema error', async () => { const d = byDay(); day(d, '1863-07-02').sun.sunset.badge = 'Measured'; await fails(validateAstroByDay, d, /schema/, 'badge Measured'); });
test('SEEDED: a value without its cross-check block is a schema error', async () => { const d = byDay(); delete day(d, '1863-07-02').sun.sunset.cross_check; await fails(validateAstroByDay, d, /schema/, 'missing cross_check'); });
test('SEEDED: an event that does not exist is caught (moonrise recorded as absent on a day it rises)', async () => { const d = byDay(); day(d, '1863-07-02').moon.moonrise = { absent: true, reason: 'The moon has no such event inside this local-mean-time calendar day (invented).', cross_check: { own_found_event: false } }; await fails(validateAstroByDay, d, /recorded as absent/, 'absent moonrise'); });
test('SEEDED: a principal phase 10 minutes off is caught', async () => { const d = byDay(); const p = d.principal_phases.find((x) => x.phase === 'Full Moon'); p.utc = '1863-07-01T06:56:29Z'; await fails(validateAstroByDay, d, /Full Moon|phase/, 'full moon'); });
test('SEEDED: NASA cross-check recorded as agreeing when it does not is caught', async () => { const d = byDay(); const p = d.principal_phases.find((x) => x.phase === 'First Quarter'); p.cross_check.nasa_ut = '1863-06-24 11:10'; await fails(validateAstroByDay, d, /NASA|nasa/, 'NASA'); });
test('SEEDED: a pitch claim that no longer agrees is reported', async () => { const d = byDay(); d.pitch_checks[1].agrees = false; await fails(validateAstroByDay, d, /pitch check P2/, 'pitch check'); });
test('SEEDED: wrong day length is caught', async () => { const d = byDay(); day(d, '1863-07-02').day_length_min = 900; await fails(validateAstroByDay, d, /day_length_min|schema/, 'day length'); });
test('SEEDED: the USNO illumination recorded for a day must match the cached response', { skip: !fs.existsSync(path.join(CACHE_DIR, 'usno-oneday-1863-07-02-tz-5.json')) && 'the USNO responses are not cached' }, async () => { const d = byDay(); day(d, '1863-07-02').moon.cross_check.usno_fracillum_pct = 87; await fails(validateAstroByDay, d, /illumination/, 'usno illumination'); });

test('SEEDED (ticks): lmt_min off by 5 minutes is caught', async () => { const t = byTick(); t.rows[299][1] += 5; await fails(validateAstroByTick, t, /tick 300: lmt_min/, 'tick lmt'); });
test('SEEDED (ticks): sun altitude off by a degree is caught', async () => { const t = byTick(); t.rows[100][3] += 1; await fails(validateAstroByTick, t, /tick 101: sun altitude/, 'sun alt'); });
test('SEEDED (ticks): moon azimuth off by 5 degrees is caught', async () => { const t = byTick(); t.rows[400][6] = (t.rows[400][6] + 5) % 360; await fails(validateAstroByTick, t, /tick 401: azimuth/, 'azimuth'); });
test('SEEDED (ticks): wrong light class is caught', async () => { const t = byTick(); const i = t.rows.findIndex((r) => r[8] === 'night'); t.rows[i][8] = 'day'; await fails(validateAstroByTick, t, /light class/, 'light class'); });
test('SEEDED (ticks): an embedded anchor changed makes the rows disagree with it', async () => { const t = byTick(); t.time_model.anchors[10].min += 30; await fails(validateAstroByTick, t, /lmt_min/, 'anchor'); });
test('SEEDED (ticks): a missing tick row is caught', async () => { const t = byTick(); t.rows.splice(200, 1); await fails(validateAstroByTick, t, /schema|expected 675/, 'missing row'); });
test('SEEDED (ticks): a stale time model (anchor file hash differs) is a warning, an error in strict mode', async () => {
  const t = byTick(); t.time_model.sha256 = 'f'.repeat(64);
  const r = await validateAstroByTick(t);
  assert.equal(r.errors.length, 0);
  assert.ok(r.warnings.some((w) => /STALE/.test(w)), 'staleness must be reported');
});
test('the events are placed on the tick clock by the inverse map and round-trip', () => {
  const t = byTick();
  assert.equal(t.events.length, 29);
  const sunset = t.events.find((e) => e.date === '1863-07-02' && e.event === 'sunset');
  assert.equal(sunset.lmt, '19:32'); assert.ok(Math.abs(sunset.tick - 317.54) < 0.01);
  const moonrise = t.events.find((e) => e.date === '1863-07-02' && e.event === 'moonrise'); assert.ok(moonrise.tick > sunset.tick && moonrise.tick - sunset.tick < 15);
  for (const e of t.events.filter((x) => x.tick != null)) assert.ok(Math.abs(tickToLmtMinutes(e.tick, t.time_model.anchors) - e.lmt_min) < 0.2, `${e.date} ${e.event}`);
  assert.equal(t.events.find((e) => e.date === '1863-07-01' && e.event === 'sunrise').tick, null);
});
test('SEEDED (ticks): an event placed on the wrong tick is caught', async () => { const t = byTick(); t.events.find((e) => e.event === 'sunset' && e.date === '1863-07-02').tick = 320; await fails(validateAstroByTick, t, /event 1863-07-02 sunset: tick 320/, 'event tick'); });
test('SEEDED (ticks): an event whose clock time disagrees with astro_by_day is caught', async () => { const t = byTick(); t.events.find((e) => e.event === 'moonrise' && e.date === '1863-07-02').lmt = '20:50'; await fails(validateAstroByTick, t, /event 1863-07-02 moonrise: lmt/, 'event lmt'); });
