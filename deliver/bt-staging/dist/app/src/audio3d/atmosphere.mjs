// From the environment layer (src/environment.mjs: weatherAt, sample; data environment/weather_timeline.json) to the sound engine's atmosphere and ambient state.
// Documented: temperature at the Jacobs readings (7:00, 14:00, 21:00 each day, interpolated by weatherAt), rain periods, the thunderstorm about 18:00 on 3 July, wind from S to SSW.
// Inferred: humidity (the weather file gives only a guess range), the exact wind bearing within S..SSW, the speed (the sources conflict: CF-WIND-SPEED, a scenario choice).
// Open gap: pressure, a measured profile of temperature and wind with height (so refraction and shadow zones are scenarios, never defaults).
import { makeAtmosphere, fToC, mphToMs, windFrom, pressureKpa } from './physics.mjs';
import { unit } from './rng.mjs';

export const GROUND_ELEVATION_M = 170;                      // Gettysburg, environment/ENV-NOTES.md (site 170 m)
export const DEFAULT_TEMP_C = 20;                           // used only where the weather record has no temperature (flagged 'default' in the atmosphere source)
export const WIND_FROM_DEG = { S: 180, SSW: 202.5 };        // documented range (Jacobs: S to SSW); the midpoint is the inferred default

/** Relative humidity guess by hour of day: 85 percent near dawn falling to 60 percent mid-afternoon (the PDF's guess ranges 75-90 at dawn and 55-70 in the afternoon on 2 July; inferred). */
export function humidityGuess(minuteOfDay) { const h = minuteOfDay / 60, x = Math.cos((h - 5) / 24 * 2 * Math.PI); return 72.5 + 12.5 * x; }

/**
 * Build the sound atmosphere for a battle minute. `wx` is the object from Environment.weatherAt(min, choices) (or null).
 * Returns the atmosphere (physics.makeAtmosphere) with `src` saying where each number came from.
 */
export function atmosphereFromWeather(wx, min, { timeWarp = 1, windChoice = null } = {}) {
  const src = {}, mod = ((min % 1440) + 1440) % 1440;
  let tC = DEFAULT_TEMP_C; src.temperature = 'default 20 C: no temperature in the weather record for this minute (open gap)';
  if (wx && wx.tempF != null) { tC = fToC(wx.tempF); src.temperature = 'documented (Jacobs readings, secondary), interpolated between the 07:00, 14:00 and 21:00 readings'; }
  const RH = humidityGuess(mod); src.humidity = 'inferred (no measured humidity; weather file guess range)';
  let wind = [0, 0]; src.wind = 'none (no wind record for this date)';
  if (wx && wx.wind && wx.wind.mph) {
    const mph = windChoice != null ? windChoice : (wx.wind.mph[0] + wx.wind.mph[1]) / 2, ms = mphToMs(mph), from = (WIND_FROM_DEG.S + WIND_FROM_DEG.SSW) / 2;
    wind = windFrom(from, ms); src.wind = `direction documented S to SSW (Jacobs, secondary), bearing inside that range inferred; speed ${mph} mph from the chosen scenario (sources conflict: CF-WIND-SPEED)`;
  }
  const atm = makeAtmosphere({ tC, RH, pKpa: pressureKpa(GROUND_ELEVATION_M), wind, timeWarp, src });
  atm.src.pressure = 'computed from elevation (ISA), not measured'; atm.src.profile = 'open gap: no vertical profile of wind or temperature (uniform atmosphere; refraction and acoustic shadow are scenarios only)';
  return atm;
}

/** Ambient beds (levels in dB SPL, positionless) from the sun band (environment sample .band 0 day .. 4 night), rain, wind and the weather record. Procedural and tagged. */
export function ambientState(wx, sunSample, atm) {
  const band = sunSample ? sunSample.band : 0, tF = wx && wx.tempF != null ? wx.tempF : 68, precip = wx && wx.precip ? wx.precip : { kind: 'none', intensity: 0 };
  const night = band >= 3 ? 1 : band === 2 ? 0.8 : band === 1 ? 0.5 : 0, dayish = band === 0 ? 1 : 0;
  const rain = precip.kind === 'rain' || precip.kind === 'storm' ? precip.intensity : 0;
  const warm = Math.max(0, Math.min(1, (tF - 52) / 12));                              // insects fall silent in cool air (inferred)
  const windMs = Math.hypot(atm.wind[0], atm.wind[1]);
  return {
    insects: { on: night > 0 && rain < 0.5, levelDb: 44 * night * warm || 0, tF, tier: 'plausible-procedural' },
    birds: { on: band <= 1 && rain < 0.6, levelDb: (band === 1 ? 46 : dayish ? 40 : 0), tier: 'plausible-procedural' },
    rain: { on: rain > 0, levelDb: 40 + 28 * rain, intensity: rain, tier: 'documented (secondary): rain periods; intensity inferred' },
    wind: { on: windMs > 0, levelDb: 30 + 6 * windMs, speedMs: windMs, tier: 'inferred' },
    ambientFloorDb: Math.max(30 + 5 * dayish, 30 + 6 * windMs * 0.5 + 25 * rain),
  };
}

/** Thunder claps for the documented storm (about 18:00 on 3 July, 30 min either side drawn, environment EV-JUL3-STORM) or any minute where precip.kind === 'storm'. Deterministic from the seed. */
export function thunderClaps(fromMin, toMin, wx, seed = 1863) {
  const out = []; if (!wx || wx.precip?.kind !== 'storm') return out;
  for (let m = Math.floor(fromMin); m < Math.ceil(toMin); m++) { const u = unit(seed, m, 11); if (u < 0.55) { const tt = m * 60 + unit(seed, m, 12) * 60, ang = unit(seed, m, 13) * 2 * Math.PI, dist = 800 + unit(seed, m, 14) * 6000; out.push({ t: tt, bearing: ang, distance: dist, near: Math.max(0, 1 - dist / 3000), tier: 'plausible-procedural (storm documented, claps procedural)' }); } }
  return out;
}
