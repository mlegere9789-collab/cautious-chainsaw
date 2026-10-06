// interp/damp.mjs - critically damped smoothing, exact for any step length (closed form), so it is frame-rate independent.
//
// ODE:  x'' = w^2 (target - x) - 2 w x'      with w = 2 / smoothTime   (critical damping: no oscillation)
// Closed form over a step dt, with d0 = x0 - target and c = v0 + w d0:
//     x(dt) = target + (d0 + c dt) e^(-w dt)         v(dt) = (c - w (d0 + c dt)) e^(-w dt)
// Two refinements make it safe to use for display: an optional speed cap, and an overshoot guard (a critically damped approach with a large initial
// velocity can pass the target once; the guard lands on the target instead).  Both are no-ops for ordinary use.

/** One scalar step.  Returns [x, v].  smoothTime in seconds: the remaining distance after t seconds is (1 + 2t/smoothTime) e^(-2t/smoothTime) of the start, so about 3 * smoothTime
 *  covers 99 %.  maxSpeed (optional) is an EXACT cap on the speed: a step that would move farther than maxSpeed * dt is cut to it, so a far target is approached at the cap and the
 *  spring takes over for the last stretch (the speed falls continuously from the cap to zero). */
export function dampStep(x, v, target, smoothTime, dt, maxSpeed = Infinity) {
  if (dt <= 0) return [x, v];
  if (!(smoothTime > 1e-6)) return [target, 0];
  const w = 2 / smoothTime; const d0 = x - target; const c = v + w * d0; const e = Math.exp(-w * dt);
  let nx = target + (d0 + c * dt) * e; let nv = (c - w * (d0 + c * dt)) * e;
  if ((x - target > 0) !== (nx - target > 0) && x !== target) { nx = target; nv = 0; }    // overshoot guard: stop on the target instead of passing it
  if (Number.isFinite(maxSpeed)) {
    const step = nx - x; const maxStep = maxSpeed * dt;
    if (Math.abs(step) > maxStep) { nx = x + Math.sign(step) * maxStep; nv = Math.sign(step) * maxSpeed; } else if (Math.abs(nv) > maxSpeed) nv = Math.sign(nv) * maxSpeed;
  }
  return [nx, nv];
}

/** Two-dimensional step over p = {x,y} and vel = {x,y} (both updated in place).  The speed cap acts on the vector length. */
export function dampStep2(p, vel, tx, ty, smoothTime, dt, maxSpeed = Infinity) {
  if (dt <= 0) return p;
  if (!(smoothTime > 1e-6)) { p.x = tx; p.y = ty; vel.x = 0; vel.y = 0; return p; }
  const w = 2 / smoothTime; const dx = p.x - tx; const dy = p.y - ty;
  const cx = vel.x + w * dx; const cy = vel.y + w * dy; const e = Math.exp(-w * dt);
  let nx = tx + (dx + cx * dt) * e; let ny = ty + (dy + cy * dt) * e;
  let nvx = (cx - w * (dx + cx * dt)) * e; let nvy = (cy - w * (dy + cy * dt)) * e;
  if (dx * (nx - tx) + dy * (ny - ty) < 0 && (dx !== 0 || dy !== 0)) { nx = tx; ny = ty; nvx = 0; nvy = 0; }   // overshoot guard
  if (Number.isFinite(maxSpeed)) {
    const sx = nx - p.x; const sy = ny - p.y; const st = Math.hypot(sx, sy); const maxStep = maxSpeed * dt;
    if (st > maxStep) { nx = p.x + sx * maxStep / st; ny = p.y + sy * maxStep / st; nvx = sx / st * maxSpeed; nvy = sy / st * maxSpeed; }
    else { const sp = Math.hypot(nvx, nvy); if (sp > maxSpeed) { nvx *= maxSpeed / sp; nvy *= maxSpeed / sp; } }
  }
  p.x = nx; p.y = ny; vel.x = nvx; vel.y = nvy;
  return p;
}

/** a small stateful scalar smoother: const s = new Damper(0, 0.2); s.step(target, dt) -> value */
export class Damper {
  constructor(x = 0, smoothTime = 0.2, maxSpeed = Infinity) { this.x = x; this.v = 0; this.smoothTime = smoothTime; this.maxSpeed = maxSpeed; }
  step(target, dt) { const r = dampStep(this.x, this.v, target, this.smoothTime, dt, this.maxSpeed); this.x = r[0]; this.v = r[1]; return this.x; }
  snap(x) { this.x = x; this.v = 0; }
}
