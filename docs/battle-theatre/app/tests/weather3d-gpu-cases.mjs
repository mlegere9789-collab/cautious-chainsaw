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
// Close views of the effect classes the wide cases show only in passing (shell burst, ground strike with clods, fresh musket volley, dust at falls, flames and fire light close and at night). Not part of the default
// run (the stored evidence is the 16 cases above): name them on the command line, or run them with --extra. `sec` = seconds after the minute (the stand-in plan fires on a 10 s beat, volleys on 6 s, falls on 4 s);
// `aim` = [u, v, h] a point of the stand-in plan's frame (u m ahead of the anchor, v to its right, h above the ground) that the camera looks at after the plan is anchored; `aimFall` aims at the latest fall of the plan.
export const EXTRA_CASES = [
  { name: 'strike-close-jul3-1400', m: [7, 3, 14, 0], sec: 12.3, h: 6, look: [Math.PI, 0], fov: 8, aim: [160, -40, 2], plan: { guns: true }, what: 'a solid shot strikes the ground: clods thrown up and the dust plume, close (stand-in plan, gun 0, 0.7 s after the strike)' },
  { name: 'burst-close-jul3-1400', m: [7, 3, 14, 0], sec: 12.6, h: 6, look: [Math.PI, 0], fov: 10, aim: [230, -60, 14], plan: { guns: true }, what: 'a shell burst in the air: flash, smoke ring and fragments, close (stand-in plan, gun 0, 0.6 s after the burst)' },
  { name: 'volley-close-jul3-1400', m: [7, 3, 14, 0], sec: 7, h: 1.8, look: [Math.PI, 0.02], fov: 40, plan: { volleys: true }, what: 'a fresh musket volley by day: flashes and the first smoke at 30 m (stand-in plan, 1 s after the volley)' },
  { name: 'falls-close-jul2-1100', m: [7, 2, 11, 0], sec: 4.6, h: 1.7, look: [Math.PI, 0.03], fov: 35, aimFall: true, plan: { falls: true }, what: 'dust at the places where men fell, close (stand-in plan, the latest fall and the ones before it)' },
  { name: 'fire-close-jul3-1500', m: [7, 3, 15, 0], at: 'lnglat', ...SHERFY, dx: 24, dz: 16, h: 3, target: [SHERFY.lng, SHERFY.lat], targetH: 6, fov: 50, what: 'the barn fire close: flames, sparks and smoke, half intensity (time uncertain)' },
  { name: 'fire-night-jul3-2200', m: [7, 3, 22, 0], at: 'lnglat', ...SHERFY, dx: 40, dz: 28, h: 4, target: [SHERFY.lng, SHERFY.lat], targetH: 6, fov: 55, what: 'the barn fire at night: the light of the fire on the ground, flames and smoke, half intensity (time uncertain)' },
];
export const ALL_CASES = [...CASES, ...EXTRA_CASES];
export const specOf = (c, minOf) => {
  const { m, what, sec, aimFall, ...rest } = c, tMin = minOf(m[0], m[1], m[2], m[3]) + (sec || 0) / 60, spec = { ...rest, tMin };
  if (aimFall) spec.aim = [38, -20 + (Math.floor(tMin * 60 / 4) % 40), 1];         // the stand-in plan's falls: one every 4 s at (38, -20 + i), i = (t / 4) mod 40
  return spec;
};
