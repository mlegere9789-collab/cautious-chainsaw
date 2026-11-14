// The wind the foliage and the crops sway in (the plan's engine spec of a vegetation record: wind_response, "foliage and crop sway from the global wind vector", tier inferred). Pure: no DOM,
// no GPU, no clock. The wind is the theatre's own: the weather timeline's wind state when the effects layer runs (the same mean speed and direction that blow the smoke), else the speed range
// of the environment layer's weather for the minute with the direction the plan gives (from S to SSW). Nothing is invented here: a minute with no wind figure sways nothing.
//
// The sway itself is drawn in the shaders (gl.mjs, shell.mjs) as a function of the minute of the clock and these numbers only, so the same minute and the same camera give the same picture
// (a scrub and a screenshot are exact). It is reduced to nothing while the clock runs fast (a gust that moves 50 times a second is flicker, not wind) and when the viewer's system asks for
// reduced motion.

export const FROM_DEG = 191.25;                  // the middle of "S to SSW" (180 to 202.5 degrees): the direction the plan gives (PDF B.10.1), used when the weather timeline is not running
const MPH = 0.44704;                             // metres per second in a mile per hour

/**
 * windOf(theatre) -> { x, z, speed (m/s), src } or null: the unit vector the wind blows toward (x east, z south) and its mean speed.
 *   th.fxInfo.wind   { speed, toX, toZ }   the weather timeline's wind (the effects layer's own), when it runs
 *   th.wx.wind       { mph: [lo, hi] }     the environment layer's wind range for the minute
 */
export function windOf(th) {
  const w = th && th.fxInfo && th.fxInfo.wind;
  if (w && Number.isFinite(w.toX) && Number.isFinite(w.toZ)) { const sp = Math.hypot(w.toX, w.toZ); if (sp > 1e-6) return { x: w.toX / sp, z: w.toZ / sp, speed: sp, src: 'weather timeline' }; return null; }
  const e = th && th.wx && th.wx.wind, mph = e && e.mph;
  if (Array.isArray(mph) && mph.length === 2 && Number.isFinite(mph[0]) && Number.isFinite(mph[1])) {
    const sp = (mph[0] + mph[1]) / 2 * MPH, b = FROM_DEG * Math.PI / 180;
    if (sp > 1e-6) return { x: -Math.sin(b), z: Math.cos(b), speed: sp, src: 'environment, direction from S to SSW' };
  }
  return null;
}

/** how much of the sway is drawn: all of it at the pace of the weather, less as the clock runs faster, none when paused clocks are asked not to move or the viewer wants reduced motion */
export function swayShare(speed, reducedMotion) {
  if (reducedMotion) return 0;
  const k = Number.isFinite(speed) && speed > 1 ? speed : 1;
  return 1 / (1 + (k - 1) / 4);
}

/** the numbers the shaders read: { dirX, dirZ, speed, t (seconds of the clock), share } (zeros when there is no wind) */
export function swayUniforms(th, tMin, speed, reducedMotion) {
  const w = windOf(th), share = swayShare(speed, reducedMotion);
  if (!w || share <= 0) return { dirX: 0, dirZ: 0, speed: 0, t: tMin * 60, share: 0, src: w ? w.src : null };
  return { dirX: w.x, dirZ: w.z, speed: w.speed, t: tMin * 60, share, src: w.src };
}
