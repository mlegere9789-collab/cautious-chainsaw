// The picture cases of the weather and effects harness (tests/weather3d-gpu.mjs, weather3d-gpu-compare.mjs): the same list for WebGL2 and WebGPU, so the two paths draw the same simulation time from the same camera.
// m = [month, day, hour, minute] of 1863; h = camera height above the ground (m); look = 'sun' | 'moon' | [yaw, pitch]; at = 'field' | 'line' | 'lnglat'; plan = the stand-in event plan of the page
// (guns: six Napoleons, a shell burst and a solid strike each; volleys: 60 men; falls: dust at a fall; march: road dust of a column).
export const SHERFY = { lng: -77.249193, lat: 39.803134 };       // app/data/fx3d/fires.json fx-fire-sherfy-barn (documented position, 10 m error)
export const CASES = [
  { name: 'stars-jun28-0200', m: [6, 28, 2, 0], h: 40, look: [Math.PI, 0.55], what: 'stars and the night floor over the field' },
  { name: 'moon-jul3-2330', m: [7, 3, 23, 30], h: 40, look: 'moon', what: 'moon with phase, stars, floor' },
  { name: 'moon-zoom-jul3-2330', m: [7, 3, 23, 30], h: 40, look: 'moon', fov: 7, what: 'moon disc and phase' },
  { name: 'moon-zoom-jul2-2200', m: [7, 2, 22, 0], h: 40, look: 'moon', fov: 7, what: 'moon disc, second night' },
  { name: 'dusk-jul2-2000', m: [7, 2, 20, 0], h: 40, look: 'sun', what: 'twilight glow toward the sun' },
  { name: 'dawn-fog-jul2-0430', m: [7, 2, 4, 30], h: 60, look: [Math.PI * 0.9, 0.03], what: 'mist at the horizon, fog colour' },
  { name: 'day-clouds-jul3-1400', m: [7, 3, 14, 0], h: 40, look: [Math.PI, 0.35], what: 'daytime clouds' },
  { name: 'wet-ground-jul4-1400', m: [7, 4, 14, 0], h: 25, look: [Math.PI, -0.18], what: 'wet ground and puddles' },
  { name: 'dry-ground-jul2-1400', m: [7, 2, 14, 0], h: 25, look: [Math.PI, -0.18], what: 'dry ground (reference)' },
  { name: 'smoke-jul3-1400', m: [7, 3, 14, 0], h: 14, look: [Math.PI, 0.02], plan: { guns: true, volleys: true }, what: 'musketry and cannon smoke, flashes, bursts, by day' },
  { name: 'smoke-night-jul2-2200', m: [7, 2, 22, 0], h: 14, look: [Math.PI, 0.02], plan: { guns: true, volleys: true }, what: 'smoke and flash light at night' },
  { name: 'line-wet-jul4-1400', m: [7, 4, 14, 0], at: 'line', h: 3, back: 70, what: 'men on wet ground stay dry' },
  { name: 'flash-night-jul2-2330', m: [7, 2, 23, 30], at: 'line', h: 2.5, back: 40, plan: { volleys: true }, what: 'muzzle flashes light the ground and men at night' },
  { name: 'fire-sherfy-jul3-1500', m: [7, 3, 15, 0], at: 'lnglat', ...SHERFY, dx: 55, dz: 40, h: 5, target: [SHERFY.lng, SHERFY.lat], targetH: 5, what: 'barn fire inside its window, half intensity (time uncertain)' },
  { name: 'dust-march-jul2-1100', m: [7, 2, 11, 0], h: 3, look: [Math.PI, 0.03], plan: { march: true, falls: true }, what: 'road dust of a marching column and dust at falls' },
  { name: 'night-floor-jul2-0100', m: [7, 2, 1, 0], at: 'line', h: 6, back: 60, what: 'night is never black: ground, men and sky' },
];
export const specOf = (c, minOf) => { const { m, what, ...rest } = c; return { ...rest, tMin: minOf(m[0], m[1], m[2], m[3]) }; };
