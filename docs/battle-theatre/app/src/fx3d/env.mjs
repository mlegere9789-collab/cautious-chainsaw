// Adapter from the app's environment layer (src/environment.mjs: sun, moon, light, weather timeline) to what the effects need at a time t (seconds):
//   wind (mean speed and direction, scenario note), ground wetness, air dampness, darkness (for fuse trails and flash light), light for smoke scattering with the Q10 luminance floor.
// Nothing here is chosen for the owner: the wind-speed scenario and the other conflict choices arrive in `choices` exactly as environment.weatherAt() takes them.
import { MPH, clamp, smooth } from './core.mjs';
import { Wind } from './wind.mjs';
import { minOf } from '../clock.mjs';

const S_SSW = [180, 202.5];
const DIR_RE = /\b(S|SSW|southern|south)\b/i;

export class FxEnv {
  // environment: an Environment (src/environment.mjs); params: data/fx3d/params.json; choices: scenario choices (e.g. { 'CF-WIND-SPEED': 'opt0' }); seed: wind gust seed
  constructor(environment, params, { choices = {}, seed = 1863, nightFloor } = {}) {
    this.env = environment; this.p = params; this.choices = choices; this.nightFloor = nightFloor; this._s = {}; this._o = {}; this._wxMin = NaN; this._wx = null;
    const origin = minOf(6, 25) * 60;
    this.wind = new Wind(t => this.meanWind(t), { seed, gustAmp: params.wind.gust_amp, corrS: params.wind.gust_corr_s, meanderDeg: params.wind.meander_deg, origin });
  }
  wx(min) { if (min !== this._wxMin) { this._wx = this.env.weatherAt(min, this.choices); this._wxMin = min; } return this._wx; }
  // ground wetness 0..1: the weather file's schedule where it has one, else the drying model after the documented rains (flag says which)
  wetness(tSec) {
    const min = tSec / 60, w = this.wx(min), v = w.wetness && w.wetness.v;
    if (typeof v === 'number') return { v, basis: 'weather timeline wetness schedule (PDF B.10.6, inferred)', known: true };
    const tau = this.p.dust.drying_tau_h * 60, ends = [minOf(6, 27, 7), minOf(7, 5, 12)], starts = [minOf(6, 25, 8), minOf(7, 5)];
    for (let i = 0; i < ends.length; i++) { if (min >= starts[i] && min < ends[i]) return { v: 1, basis: 'documented rain (weather file) with no wetness value', known: false }; if (min >= ends[i] && (i + 1 === ends.length || min < starts[i + 1])) return { v: Math.exp(-(min - ends[i]) / tau), basis: 'drying model after the documented rain (open gap: the weather file gives no decay)', known: false }; }
    return { v: 0, basis: 'no rain recorded before the documented rain; taken dry (open gap)', known: false };
  }
  // mean wind at t: speed from the (chosen) mph range, direction S..SSW, Jul 3 calm during the cannonade and Charge, gusts before the storm
  meanWind(tSec) {
    const min = tSec / 60, w = this.wx(min), mph = w.wind && w.wind.mph, p = this.p;
    let speed = mph ? 0.5 * (mph[0] + mph[1]) * MPH : 1.8, gustBoost = 1;
    const j3 = minOf(7, 3);
    const calm = smooth(j3 + 12 * 60 + 30, j3 + 13 * 60, min) * (1 - smooth(j3 + 16 * 60 + 30, j3 + 17 * 60, min));         // 13:00 .. 16:30 Jul 3, edges 30 min: "no breeze during the Charge", smoke hangs in the cannonade
    speed *= 1 + (p.wind.calm_charge_scale - 1) * calm;
    gustBoost += (p.wind.pre_storm_gust_boost - 1) * smooth(j3 + 16 * 60, j3 + 17 * 60, min) * (1 - smooth(j3 + 18 * 60, j3 + 19 * 60, min));
    return { speed, fromDeg: 0.5 * (S_SSW[0] + S_SSW[1]), fromLoDeg: S_SSW[0], fromHiDeg: S_SSW[1], gustBoost };
  }
  windInfo(tSec) {
    const w = this.wx(tSec / 60), text = (w.wind && w.wind.text) || 'not recorded';
    return { text, mph: w.wind && w.wind.mph, note: w.wind && w.wind.note, directionRecorded: w.record && DIR_RE.test(text) && !/not recorded/i.test(text), conflicts: w.conflicts || [], record: !!w.record };
  }
  // dampness of the air 0..1 (ground-hugging smoke, low buoyancy)
  damp(tSec) {
    const min = tSec / 60, w = this.wx(min), a = this.p.air, j = Math.floor(min / 1440), d = (m, dd) => Math.floor(minOf(7, dd) / 1440) === j;
    let v = a.damp_base, basis = 'base';
    if (w.precip && w.precip.intensity > 0) { v = a.damp_rain; basis = 'rain'; }
    else {
      const wet = this.wetness(tSec).v; if (wet >= 0.3) { v = Math.max(v, a.damp_wet_ground); basis = 'wet ground'; }
      if (d(min, 3) || d(min, 4)) { v = Math.max(v, a.damp_humid_day); if (basis === 'base') basis = 'very humid day (Jacobs summary)'; }
      if (d(min, 2)) { const s = this.env.sample(min, this._s); if (s.sunAlt < a.fog_dawn_end_sun_alt_deg && min < minOf(7, 2, 9)) { v = Math.max(v, a.damp_fog_dawn * (1 - smooth(0, a.fog_dawn_end_sun_alt_deg, Math.max(0, s.sunAlt)))); basis = 'foggy dawn (one source)'; } }
    }
    return { v, basis };
  }
  // one call for the frame: everything the spawn model and the lighting need
  at(tSec, out = {}) {
    const min = tSec / 60, w = this.wx(min), s = this.env.sample(min, this._s);
    const light = this.env.light(s, this.nightFloor != null ? { nightFloor: this.nightFloor } : {}, w, this._o);
    out.t = tSec; out.wetness = this.wetness(tSec); out.damp = this.damp(tSec); out.precip = w.precip; out.cloud = w.cloud;
    const mw = this.meanWind(tSec); out.windSpeed = mw.speed; out.wind = this.windInfo(tSec); out.windFromDeg = mw.fromDeg;
    out.dayW = light.dayW; out.darkness = 1 - light.dayW; out.exposure = light.exposure; out.sunDir = light.sunDir.slice(); out.sunAlt = s.sunAlt; out.moonAlt = s.moonAlt; out.moonUp = s.moonUp; out.moonIllum = s.moonIllum;
    out.lighting = fxLighting(light, s, w.cloud, this.p);
    return out;
  }
}

// Radiance terms for lit smoke. ambient never falls below the environment's own lowest luminance term times the smoke's albedo, so smoke is never black at night (gate Q10);
// the global exposure floor of the environment layer then lifts it exactly as it lifts the terrain.
export function fxLighting(light, s, cloud, p) {
  const c = cloud == null ? 0.3 : cloud, moonLum = s.moonUp ? (s.moonIllum / 100) * smooth(0, 25, s.moonAlt) : 0;
  const sun = light.dayW * (1 - 0.7 * c), moon = (1 - light.dayW) * 0.16 * moonLum;
  const ambient = Math.max(p.light.smoke_ambient_floor, 0.55 * light.dayW * (1 - 0.3 * c) + 0.06 + 0.1 * moonLum);
  return { direct: sun + moon, directDir: light.sunDir, ambient, floor: p.light.smoke_ambient_floor, exposure: light.exposure, albedo: p.smoke.albedo, g: p.smoke.hg_g };
}

// Henyey-Greenstein phase function (normalised so the integral over the sphere is 1); cosTheta = dot(light direction, view direction toward the viewer)
export const hg = (cosT, g) => (1 - g * g) / (4 * Math.PI * Math.pow(1 + g * g - 2 * g * cosT, 1.5));
// radiance of a smoke surface seen with the light behind (forward scattering) or in front: JS twin of the shader's smoke shade; always >= albedo * floor
export function smokeRadiance(L, cosT, od) { const phase = hg(cosT, L.g) * 4 * Math.PI * 0.25 + 0.75; const shadow = Math.exp(-0.5 * od); return L.albedo * (L.ambient + L.direct * phase * shadow); }
export { clamp };
