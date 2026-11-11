// Weather timeline adapter: turns what the environment layer knows at time t (sun and moon table, Jacobs readings, wetness schedule, wind scenario) into the quantities the weather pass draws.
// Pure functions of (t, scenario choices): no clock, no Math.random, no GPU. A scrub to any t gives the same state as playing there.
//
// Evidence discipline (Law cl. 3, 4, 7): every field in the returned state carries a tier and a basis in `marks`; every place the record is silent is listed in `gaps` (EG-W3D-G01..G08) and the
// product shows it. Weather readings come from a secondary source (Jacobs 1885 via the PDF; original sheets not read), so they are marked `inferred`, with the file's own tier kept in `sourceTier`.
// SOUND: nothing here delays or alters sound. `temp` carries the Q13 input (temperature and the speed of sound at it) for AUDIO, which owns delay = distance / c.
import { PARAMS, val } from './params.mjs';
import { FxEnv } from '../fx3d/env.mjs';
import { windVector } from '../fx3d/wind.mjs';
import { minOf } from '../clock.mjs';

const R = Math.PI / 180, TWO_PI = 2 * Math.PI;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
export const speedOfSoundMs = tC => 331.3 * Math.sqrt(1 + tC / 273.15);        // same formula as audio/model/acoustics.mjs and audio3d/physics.mjs
export const LAT_DEG = 39.83;
// world axes: x east, z south, y up. Direction TO a body at azimuth az (0 = north, clockwise) and altitude alt (degrees)
export const dirOf = (azDeg, altDeg, out = [0, 0, 0]) => { const a = azDeg * R, h = altDeg * R; out[0] = Math.sin(a) * Math.cos(h); out[1] = Math.sin(h); out[2] = -Math.cos(a) * Math.cos(h); return out; };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const max3 = (a, b) => [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])];

// Sky and cloud colours (HDR radiance before the global exposure). Never below the sky floor (gate Q10), at any minute.
export function skyPalette(light, s, cover, nightFloorRadiance = val('sky.floor_radiance')) {
  const dayW = light.dayW, c = cover == null ? val('cloud.unrecorded_cover') : cover, moonLum = s.moonUp ? (s.moonIllum / 100) * smooth(0, 25, s.moonAlt) : 0;
  const dz = val('sky.day_zenith'), dh = val('sky.day_horizon'), nz = val('sky.night_zenith'), nh = val('sky.night_horizon'), fl = nightFloorRadiance;
  const mg = val('sky.moon_glow') * moonLum * (1 - dayW);
  let zen = lerp3(nz, dz, dayW), hor = lerp3(nh, dh, dayW); zen = zen.map(v => v + mg); hor = hor.map(v => v + mg * 1.4);
  zen = max3(zen, fl); hor = max3(hor, fl.map(v => v * 1.15));
  const warm = clamp(light.tint.warm / 0.16), tw = val('sky.twilight_warm');
  const sunVis = smooth(-6, 0, s.sunAlt) * (1 - 0.7 * c), sunCol = [1.0, 0.8, 0.55];
  let cLit = lerp3(hor.map(v => v * 1.6 + moonLum * 0.25), [1.05 * (1 - 0.25 * c), 1.0 * (1 - 0.25 * c), 0.95 * (1 - 0.25 * c)], dayW); cLit = cLit.map((v, i) => v + tw[i] * warm * 0.6);
  let cShade = lerp3(hor.map(v => v * 1.1), [0.50 * (1 - 0.35 * c), 0.55 * (1 - 0.35 * c), 0.62 * (1 - 0.35 * c)], dayW);
  cLit = max3(cLit, fl.map(v => v * 1.3)); cShade = max3(cShade, fl.map(v => v * 1.2));
  return { zenith: zen, horizon: hor, sunCol, sunVis, twilightWarm: tw.map(v => v * warm), cloudLit: cLit, cloudShade: cShade, floor: fl };
}

export class WeatherTimeline {
  // environment: Environment; opts: { choices (scenario choices as environment.weatherAt takes them), fxenv (an FxEnv to share), fxParams (data/fx3d/params.json, needed when fxenv is not given), nightFloor, seed }
  constructor(environment, opts = {}) {
    this.env = environment; this.choices = opts.choices || {}; this.nightFloor = opts.nightFloor;
    this.fxenv = opts.fxenv || new FxEnv(environment, opts.fxParams, { choices: this.choices, seed: opts.seed ?? 1863, nightFloor: opts.nightFloor });
    this._s = {}; this._l = {}; this._cum = null; this._cumStep = 900; this._o0 = minOf(6, 25) * 60;
  }
  setChoices(ch) { this.choices = ch || {}; this.fxenv.choices = this.choices; this.fxenv._wxMin = NaN; this._cum = null; }
  // cumulative path (metres) of the cloud-level wind from the clock origin, piecewise linear on a 15 minute grid, grown on demand. Direction is the centre of the recorded S-SSW range.
  _travel(t) {
    const step = this._cumStep, k = Math.max(0, Math.floor((t - this._o0) / step)); const c = this._cum || (this._cum = [0]); const f = val('cloud.wind_aloft_factor');
    while (c.length < k + 3) { const j = c.length, tt = this._o0 + j * step; c.push(c[j - 1] + 0.5 * (this.fxenv.meanWind(tt - step).speed + this.fxenv.meanWind(tt).speed) * f * step); }
    const u = (t - this._o0 - k * step) / step; return c[k] + (c[k + 1] - c[k]) * u;
  }
  // state at time t (seconds on the app clock). `out` is reused when given.
  at(tSec, out = {}) {
    const min = tSec / 60, wx = this.fxenv.wx(min), s = this.env.sample(min, this._s), L = this.env.light(s, this.nightFloor != null ? { nightFloor: this.nightFloor } : {}, wx, this._l);
    const marks = [], gaps = [], mark = (field, tier, basis, gap) => { marks.push({ field, tier, basis, gap: gap || null }); if (gap && !gaps.includes(gap)) gaps.push(gap); };
    const srcTier = wx.tier || 'open gap', record = !!wx.record;
    out.t = tSec; out.min = min; out.record = record; out.sourceTier = srcTier;
    // ---- precipitation
    const pr = wx.precip || { kind: 'none', intensity: 0, text: 'not recorded' }; out.precip = { kind: pr.kind, intensity: pr.intensity, text: pr.text };
    if (record) mark('precip', 'inferred', 'weather timeline (' + srcTier + '); intensity is a render parameter of the environment layer'); else mark('precip', 'plausible-procedural', 'no weather record for this date: none drawn', 'W3D-G01');
    // ---- cloud cover
    let cover = wx.cloud, known = cover != null; if (!known) { cover = val('cloud.unrecorded_cover'); mark('cloud', 'plausible-procedural', 'no cloud reading for this minute: cover ' + cover + ' assumed (the value the light model uses)', 'W3D-G01'); }
    else mark('cloud', 'inferred', 'Jacobs readings (08:00, 14:00, 21:00) interpolated; ' + srcTier + (wx.flags && wx.flags.length ? '; ' + wx.flags.join('; ') : ''), null);
    if (pr.intensity > 0) cover = Math.max(cover, val('cloud.precip_min_cover') * Math.min(1, 0.5 + pr.intensity));
    const tr = this._travel(tSec), sc = val('cloud.scale_m'), dir = windVector(1, 0.5 * (180 + 202.5)), cells = tr / sc;
    out.cloud = { cover: clamp(cover), known, tier: known ? 'inferred' : 'plausible-procedural', altitude: val('cloud.altitude_m'), scale: sc, softness: val('cloud.softness'), driftCellsX: ((dir[0] * cells) % 256 + 256) % 256, driftCellsZ: ((dir[1] * cells) % 256 + 256) % 256 };
    mark('cloud shape', 'plausible-procedural', 'one procedural layer; only the cover fraction is recorded', 'W3D-G06');
    // ---- wetness and the ground
    const w = this.fxenv.wetness(tSec), v = w.v; out.wetness = { v, known: w.known, basis: w.basis };
    mark('wetness', w.known ? 'inferred' : 'plausible-procedural', w.basis, w.known ? null : 'W3D-G04');
    const wad = val('wet.albedo_drop'), pf = val('wet.puddle_from'); out.ground = { albedoMul: 1 - wad * v, puddle: clamp((v - pf) / (1 - pf)), puddleDarken: val('wet.puddle_darken'), puddleScale: val('wet.puddle_scale_m'), tolerance: val('wet.ground_tolerance_m') };
    if (v >= pf) mark('puddles', 'plausible-procedural', 'puddles on Jul 4 are documented as occurring; where they stood is not (noise mask)', 'W3D-G05');
    // ---- fog and haze (extinction added on top of the prototype renderer\'s baked 0.00006)
    const damp = this.fxenv.damp(tSec), mr = val('fog.mist_from_damp'), mist = smooth(mr[0], mr[1], damp.v), rain = clamp(pr.intensity);
    const ext = mist * val('fog.mist_extinction_per_m') + rain * val('fog.rain_extinction_per_m'); const beta = val('fog.haze_extinction_per_m') + ext;
    out.fog = { extra: ext, mist, damp: damp.v, dampBasis: damp.basis, scaleHeight: val('fog.scale_height_m'), visibilityM: 3.912 / beta, tier: ext > 0 ? 'plausible-procedural' : 'inferred' };
    if (ext > 0) mark('fog', 'plausible-procedural', 'mist from air dampness (' + damp.basis + '), rain ' + rain.toFixed(2) + '; extinction is a look parameter', 'W3D-G02');
    // ---- wind (the fx3d wind: nothing chosen here)
    const mw = this.fxenv.meanWind(tSec), wi = this.fxenv.windInfo(tSec), tv = windVector(mw.speed, mw.fromDeg);
    out.wind = { speed: mw.speed, fromDeg: mw.fromDeg, toX: tv[0], toZ: tv[1], gustBoost: mw.gustBoost, mph: wi.mph, text: wi.text, note: wi.note, directionRecorded: wi.directionRecorded, record: wi.record };
    mark('wind', 'inferred', 'speed from the chosen mph range (' + (wi.note || 'not recorded') + '); direction S to SSW', wi.directionRecorded ? null : 'W3D-G07');
    // ---- Q13 input for AUDIO: temperature and the speed of sound at it (nothing is delayed here)
    const tF = wx.tempF; out.temp = { tempF: tF, tempC: tF == null ? null : (tF - 32) * 5 / 9, speedOfSoundMs: tF == null ? null : speedOfSoundMs((tF - 32) * 5 / 9), tier: tF == null ? 'open gap' : 'inferred', basis: tF == null ? 'no thermometer reading within 14 h of this minute' : 'Jacobs readings (secondary), linear between readings' };
    mark('temperature (sound speed input)', out.temp.tier, out.temp.basis, null);
    // ---- the sky: sun, moon, stars, palette, the floor
    const pal = skyPalette(L, s, out.cloud.cover);
    const sunTrue = dirOf(s.sunAz, s.sunAlt), moonTrue = dirOf(s.moonAz, s.moonAlt);
    const sv = val('stars.visible_sun_alt_deg'), moonLum = s.moonUp ? (s.moonIllum / 100) * smooth(0, 25, s.moonAlt) : 0;
    const starVis = smooth(sv[0], sv[1], s.sunAlt) * (1 - val('stars.moon_washout') * moonLum) * Math.pow(1 - clamp(out.cloud.cover), val('stars.cloud_exponent')) * (1 - 0.8 * smooth(0, 1, out.fog.mist));
    const siderealDays = (min / 1440) * val('clock.sidereal_ratio');
    out.sky = { sunAlt: s.sunAlt, sunAz: s.sunAz, moonAlt: s.moonAlt, moonAz: s.moonAz, moonUp: s.moonUp, moonIllum: s.moonIllum, src: s.src, band: s.band, dayW: L.dayW, exposure: L.exposure, nightFloor: this.nightFloor ?? 0.34, lightSunDir: L.sunDir.slice(), sunDir: sunTrue, moonDir: moonTrue,
      palette: pal, stars: { visibility: clamp(starVis), rotation: ((siderealDays % 1) + 1) % 1 * TWO_PI, poleAltDeg: LAT_DEG, density: val('stars.cells_per_radian'), fraction: val('stars.star_fraction'), gain: val('stars.gain'), tier: 'plausible-procedural' } };
    mark('stars', 'plausible-procedural', 'procedural field, no catalogue; rotation follows the clock about the pole; visibility from the sun band, moon, cloud and mist', 'W3D-G03');
    mark('sun and moon', 'documented', 'computed ephemeris (' + s.src + '; Q11 passes for the per-minute table; 7-14 Jul and 1863 formula flagged)', null);
    out.marks = marks; out.gaps = gaps; return out;
  }
}
// One sentence for the effects panel: which parts of the weather are not documented at this minute
export function weatherStatement(st) {
  const bits = st.marks.filter(m => m.tier !== 'documented').map(m => m.field + ' (' + m.tier + ')');
  return 'Sky, cloud, mist, wet ground and wind are drawn from the weather record where it has one and marked otherwise: ' + [...new Set(bits)].join(', ') + (st.gaps.length ? '. Open gaps here: ' + st.gaps.join(', ') + '.' : '.');
}
export { PARAMS };
