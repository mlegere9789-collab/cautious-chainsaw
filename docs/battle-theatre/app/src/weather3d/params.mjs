// Look parameters of the weather layer, each with its evidence tier and basis (PDF: documented / inferred / plausible-procedural). Nothing here is a measurement of 1863 unless the tier says so.
// The environment layer (src/environment.mjs, environment/weather_timeline.json) is the data; these numbers only turn that data into pixels. Gaps: GAPS below, register files EG-W3D-G01..G08.
const P = (v, tier, basis) => ({ v, tier, basis });
export const PARAMS = {
  cloud: {
    unrecorded_cover: P(0.3, 'plausible-procedural', 'No cloud record for the date: the same 0.3 that environment.light() assumes when the weather file has none, so sky and light agree. Marked as an open gap (EG-W3D-G01).'),
    precip_min_cover: P(0.92, 'plausible-procedural', 'Rain and the Jul 3 storm fall from a covered sky; the file gives intensity, not cloud cover for those minutes.'),
    altitude_m: P(2600, 'plausible-procedural', 'Cloud layer height above the datum. Not recorded; a single layer is a look choice.'),
    scale_m: P(2200, 'plausible-procedural', 'Horizontal size of the largest cloud feature.'),
    wind_aloft_factor: P(2.5, 'plausible-procedural', 'Clouds move faster than the surface wind (wind increases with height); the factor is a look parameter, the direction is the recorded S-SSW.'),
    softness: P(0.16, 'plausible-procedural', 'Edge softness of the cover threshold.'),
  },
  fog: {
    haze_extinction_per_m: P(0.00006, 'inferred', 'The prototype renderer already fogs the terrain with exp(-d * 0.00006); this layer adds only the excess above it, so clear days are unchanged.'),
    mist_extinction_per_m: P(0.0035, 'plausible-procedural', 'Extra extinction at full mist (about 1.1 km meteorological visibility). Jul 2 "foggy dawn" is one source (Strategypage), no visibility figure is recorded.'),
    rain_extinction_per_m: P(0.0011, 'plausible-procedural', 'Extra extinction at rain intensity 1 (about 3.5 km visibility). Rain intensity values are render parameters of the environment layer (inferred).'),
    mist_from_damp: P([0.4, 0.95], 'inferred', 'Mist amount is smoothstep of the air dampness of fx3d/env.mjs between these values; dampness is itself inferred (0.85 at the Jul 2 foggy dawn).'),
    scale_height_m: P(160, 'plausible-procedural', 'Fog thins with height; the e-folding height of the extra extinction.'),
  },
  wet: {
    albedo_drop: P(0.38, 'plausible-procedural', 'Ground albedo multiplier is 1 - drop * wetness. PDF B.10.6 gives the wetness (0 / about 0.3 / 1.0, inferred) and "darker albedo, lower roughness, puddle masks"; the amount of darkening is a look parameter.'),
    puddle_from: P(0.6, 'plausible-procedural', 'Wetness above which puddles may form (puddles on Jul 4 are documented as occurring; where they stood is not).'),
    puddle_darken: P(0.72, 'plausible-procedural', 'Extra albedo multiplier inside a puddle.'),
    puddle_scale_m: P(9, 'plausible-procedural', 'Horizontal size of the puddle noise cells.'),
    ground_tolerance_m: P(0.35, 'plausible-procedural', 'A pixel counts as ground when its height is within this (plus 0.012 per metre of distance) of the terrain model; men and structures are left dry.'),
  },
  sky: {
    day_zenith: P([0.242, 0.418, 0.792], 'plausible-procedural', 'The prototype renderer\'s own day gradient (0.22, 0.38, 0.72) x 1.1, kept so the day sky does not change.'),
    day_horizon: P([0.858, 0.924, 1.012], 'plausible-procedural', 'The prototype renderer\'s own horizon colour (0.78, 0.84, 0.92) x 1.1.'),
    night_zenith: P([0.030, 0.046, 0.100], 'plausible-procedural', 'Night sky colour before the floor. No sky-brightness measurement is carried.'),
    night_horizon: P([0.060, 0.075, 0.130], 'plausible-procedural', 'Night horizon colour before the floor.'),
    floor_radiance: P([0.040, 0.048, 0.075], 'plausible-procedural', 'Luminance floor of the sky (gate Q10: night is never black). Radiance before the global exposure; the environment exposure floor (0.34 default) multiplies it. The PDF gives no numeric Q10 threshold, none is invented as a claim: this is a look floor, owner-adjustable.'),
    twilight_warm: P([1.0, 0.52, 0.28], 'plausible-procedural', 'Colour of the twilight glow on the horizon toward the sun.'),
    moon_glow: P(0.05, 'plausible-procedural', 'Sky radiance added at full moon high in the sky.'),
  },
  stars: {
    cells_per_radian: P(115, 'plausible-procedural', 'Procedural star lattice density. THERE IS NO STAR CATALOGUE in the repository: the positions are not the 1863 sky (EG-W3D-G03). Only their rotation about the celestial pole (latitude 39.83 N) follows the clock.'),
    star_fraction: P(0.045, 'plausible-procedural', 'Share of lattice cells that hold a star.'),
    gain: P(2.4, 'plausible-procedural', 'HDR radiance of the brightest star.'),
    visible_sun_alt_deg: P([-6, -15], 'inferred', 'Stars fade in between civil twilight end (sun -6) and -15 degrees (astronomical twilight ends at -18); standard twilight bands, the same ones environment.mjs uses.'),
    moon_washout: P(0.75, 'plausible-procedural', 'Share of star brightness lost at a full moon high in the sky.'),
    cloud_exponent: P(1.6, 'plausible-procedural', 'Stars are hidden by cover^1.6 (a sheet of cloud hides them).'),
  },
  moon: {
    disc_scale: P(1.0, 'documented', 'Angular radius 0.0045 rad (0.26 degrees), the real value; the position and illuminated fraction are the project\'s computed ephemeris (environment/ephemeris_1863.json, Q11 passes).'),
    radiance: P(2.2, 'plausible-procedural', 'HDR radiance of the lit disc.'),
  },
  sun: { glow_gain: P(1.0, 'plausible-procedural', 'Scales the prototype renderer\'s sun glow terms.') },
  light: { flash_gain: P(0.16, 'plausible-procedural', 'Brightening of ground and men near a flash light: multiplier 1 + gain * intensity * falloff. Lights only add to the floor.'), max_lights: P(16, 'plausible-procedural', 'Lights sent to the weather pass (fx3d keeps up to 48; the nearest brightest 16 are used here).') },
  clock: { sidereal_ratio: P(1.0027379, 'documented', 'Sidereal day / solar day (astronomical constant).') },
};
export const flat = (o = PARAMS, p = '', out = {}) => { for (const [k, v] of Object.entries(o)) { if (v && typeof v === 'object' && 'tier' in v && 'basis' in v) out[p + k] = v; else flat(v, p + k + '.', out); } return out; };
export const val = path => path.split('.').reduce((o, k) => o[k], PARAMS).v;
// Gaps that this layer creates or inherits; each has a register file docs/battle-theatre/GOVERNANCE/register/EG-<id>.md
export const GAPS = [
  { id: 'W3D-G01', title: 'Sky with no cloud record', text: 'Outside 26 Jun - 5 Jul and at times the weather file has no cloud reading, the sky uses cover 0.3 (plausible-procedural) and the product marks it.' },
  { id: 'W3D-G02', title: 'Visibility and fog density', text: 'No visibility figure is recorded for the Jul 2 foggy dawn, humid Jul 3-4 or the rain; extinction values are look parameters.' },
  { id: 'W3D-G03', title: 'Star positions', text: 'No star catalogue is in the repository; stars are a procedural field that rotates with the clock about the celestial pole. Not the 1863 sky.' },
  { id: 'W3D-G04', title: 'Wetness before Jul 1, after Jul 4, and its drying', text: 'The weather file gives no wetness there and no decay; the drying model of fx3d/env.mjs (21 h) is inferred.' },
  { id: 'W3D-G05', title: 'Puddle and mud places', text: 'Puddles (Jul 4) and mud (from the evening of Jul 3) are documented to have occurred; where they stood is not. Puddles are a noise mask.' },
  { id: 'W3D-G06', title: 'Cloud shape, height and cloud shadows', text: 'Only the cover fraction is recorded. One procedural layer; cloud shadows on the ground are not drawn.' },
  { id: 'W3D-G07', title: 'Wind direction on days with no record', text: 'Jun 26-30 and Jul 4: S-SSW is carried from the other days (flagged by fx3d windInfo.directionRecorded).' },
  { id: 'W3D-G08', title: 'WebGPU draw path and real-GPU cost', text: 'The weather and effect passes are implemented for WebGL2; the WebGPU port and every real-GPU timing are on the BROWSER-VERIFICATION-LIST.' },
];
