// Event finders for the sun and moon by two independent methods, with identical conventions, used by build-astro.mjs and validate.mjs.
//   Method A: astronomy-engine (MIT, Don Cross), loaded lazily because it lives in tools/environment/node_modules (generation only).
//   Method B: tools/environment/solar.mjs (this repo, dependency-free, Meeus).
// Conventions (also written into the data file): sunrise/sunset and moonrise/moonset are the upper limb on the horizon with 34 arcmin of standard
// refraction at sea level (elevation 0 m: the USNO API default); civil twilight begins/ends when the centre of the sun is 6 degrees below the horizon,
// nautical 12 degrees. Transit = upper transit (hour angle 0). A "day" is a local-mean-time calendar day, [00:00, 24:00) LMT.
import * as B from './solar.mjs';
import { LAT, LON_EAST, lmtMidnightUtMs } from './clock.mjs';

let AE = null;
export async function loadAstronomyEngine() {
  if (AE) return AE;
  try { AE = await import('./node_modules/astronomy-engine/esm/astronomy.js'); }
  catch (e) { throw new Error('astronomy-engine is not installed: run `npm install` in tools/environment (it is only needed to GENERATE astro_by_day.json). ' + e.message); }
  return AE;
}
export const aeVersion = async () => JSON.parse((await import('node:fs')).readFileSync(new URL('./node_modules/astronomy-engine/package.json', import.meta.url), 'utf8')).version;

export const SUN_EVENTS = ['civil_dawn', 'sunrise', 'solar_transit', 'sunset', 'civil_dusk', 'nautical_dawn', 'nautical_dusk'];
export const MOON_EVENTS = ['moonrise', 'moon_transit', 'moonset'];
export const ALL_EVENTS = [...SUN_EVENTS, ...MOON_EVENTS];
export const USNO_KEYS = { 'Begin Civil Twilight': 'civil_dawn', Rise: 'sunrise', 'Upper Transit': 'solar_transit', Set: 'sunset', 'End Civil Twilight': 'civil_dusk' };
export const USNO_MOON_KEYS = { Rise: 'moonrise', 'Upper Transit': 'moon_transit', Set: 'moonset' };

const jdOfMs = (ms) => ms / 86400000 + 2440587.5;
export const msOfJd = (jd) => (jd - 2440587.5) * 86400000;

/** Method B events for one LMT day: { name: utMs | null } (first event in the day when two occur) */
export function eventsB(date) {
  const ms0 = lmtMidnightUtMs(date), jd0 = jdOfMs(ms0), jd1 = jd0 + 1;
  const site = { lat: LAT, lonEast: LON_EAST };
  const sunAlt = (jd) => B.sunTopo(jd, site).alt, moonAlt = (jd) => B.moonTopo(jd, site).alt;
  const first = (list, rising) => { const x = list.find((c) => c.rising === rising); return x ? msOfJd(x.jd) : null; };
  const sun = (th, rising) => first(B.crossings((jd) => sunAlt(jd) - (typeof th === 'function' ? th(jd) : th), jd0, jd1), rising);
  const hourAngle = (fn) => (jd) => { const h = B.topocentric(fn(jd), jd, site).H; return ((h + 180) % 360) - 180; };
  const transit = (fn) => {
    const cs = B.crossings(hourAngle(fn), jd0, jd1).filter((c) => c.rising && Math.abs(hourAngle(fn)(c.jd)) < 1);
    return cs.length ? msOfJd(cs[0].jd) : null;
  };
  return {
    civil_dawn: sun(-6, true), sunrise: sun(B.sunHorizonAlt, true), solar_transit: transit(B.sunApparent), sunset: sun(B.sunHorizonAlt, false),
    civil_dusk: sun(-6, false), nautical_dawn: sun(-12, true), nautical_dusk: sun(-12, false),
    moonrise: first(B.crossings((jd) => moonAlt(jd) - B.moonHorizonAlt(jd), jd0, jd1), true),
    moon_transit: transit(B.moonApparent),
    moonset: first(B.crossings((jd) => moonAlt(jd) - B.moonHorizonAlt(jd), jd0, jd1), false),
  };
}

/** Method A events for one LMT day, same shape as eventsB */
export async function eventsA(date) {
  const A = await loadAstronomyEngine();
  const ms0 = lmtMidnightUtMs(date), ms1 = ms0 + 86400000;
  const obs = new A.Observer(LAT, LON_EAST, 0);
  const t0 = A.MakeTime(new Date(ms0));
  const inDay = (t) => (t && t.date.getTime() >= ms0 && t.date.getTime() < ms1 ? t.date.getTime() : null);
  const rs = (body, dir) => inDay(A.SearchRiseSet(body, obs, dir, t0, 1.0));
  const alt = (dir, deg) => inDay(A.SearchAltitude(A.Body.Sun, obs, dir, t0, 1.0, deg));
  const transit = (body) => { const r = A.SearchHourAngle(body, obs, 0, t0, +1); return inDay(r && r.time); };
  return {
    civil_dawn: alt(+1, -6), sunrise: rs(A.Body.Sun, +1), solar_transit: transit(A.Body.Sun), sunset: rs(A.Body.Sun, -1), civil_dusk: alt(-1, -6),
    nautical_dawn: alt(+1, -12), nautical_dusk: alt(-1, -12),
    moonrise: rs(A.Body.Moon, +1), moon_transit: transit(A.Body.Moon), moonset: rs(A.Body.Moon, -1),
  };
}

/** Illuminated fraction (0..1) at a UT instant by both methods */
export async function illumA(utMs) { const A = await loadAstronomyEngine(); return A.Illumination(A.Body.Moon, A.MakeTime(new Date(utMs))).phase_fraction; }
export const illumB = (utMs) => B.moonIllumination(jdOfMs(utMs)).fraction;

/** Moon's elongation from the sun along the ecliptic, degrees 0..360 (0 new, 90 first quarter, 180 full, 270 last quarter) */
export async function elongationA(utMs) { const A = await loadAstronomyEngine(); return A.MoonPhase(A.MakeTime(new Date(utMs))); }
export const elongationB = (utMs) => B.moonIllumination(jdOfMs(utMs)).eclipticElongation;

/** principal lunar phases by method A in [fromMs, toMs): [{ phase: 'New Moon'|'First Quarter'|'Full Moon'|'Last Quarter', utMs }] */
export async function principalPhasesA(fromMs, toMs) {
  const A = await loadAstronomyEngine();
  const names = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'], out = [];
  let q = A.SearchMoonQuarter(A.MakeTime(new Date(fromMs)));
  while (q.time.date.getTime() < toMs) { out.push({ phase: names[q.quarter], utMs: q.time.date.getTime() }); q = A.NextMoonQuarter(q); }
  return out;
}
/** principal phases by method B: bisection on the ecliptic elongation passing 0/90/180/270 */
export function principalPhasesB(fromMs, toMs) {
  const names = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'], out = [];
  const el = (ms) => B.moonIllumination(jdOfMs(ms)).eclipticElongation;
  const step = 3600000;
  for (let ms = fromMs; ms < toMs; ms += step) {
    const a = el(ms), b = el(ms + step);
    for (let k = 0; k < 4; k++) {
      const target = k * 90, da = ((a - target + 540) % 360) - 180, db = ((b - target + 540) % 360) - 180;
      if (da < 0 && db >= 0 && Math.abs(db - da) < 90) {
        let lo = ms, hi = ms + step;
        for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2, dm = ((el(mid) - target + 540) % 360) - 180; if (dm < 0) lo = mid; else hi = mid; }
        out.push({ phase: names[k], utMs: (lo + hi) / 2 });
      }
    }
  }
  return out.sort((x, y) => x.utMs - y.utMs);
}

/** geometric (airless) topocentric sun/moon altitude and azimuth at a UT instant by method A */
export async function skyA(utMs) {
  const A = await loadAstronomyEngine();
  const obs = new A.Observer(LAT, LON_EAST, 0), t = A.MakeTime(new Date(utMs));
  const out = {};
  for (const [name, body] of [['sun', A.Body.Sun], ['moon', A.Body.Moon]]) {
    const eq = A.Equator(body, t, obs, true, true), hor = A.Horizon(t, obs, eq.ra, eq.dec); // no refraction argument: geometric (airless) altitude of the centre
    out[name] = { alt: hor.altitude, az: hor.azimuth };
  }
  out.moon.illum = A.Illumination(A.Body.Moon, t).phase_fraction;
  return out;
}
/** geometric topocentric sun/moon altitude and azimuth by method B (no refraction) */
export function skyB(utMs) {
  const jd = jdOfMs(utMs), site = { lat: LAT, lonEast: LON_EAST };
  const s = B.sunTopo(jd, site), m = B.moonTopo(jd, site);
  return { sun: { alt: s.alt, az: s.az }, moon: { alt: m.alt, az: m.az, illum: B.moonIllumination(jd).fraction } };
}
