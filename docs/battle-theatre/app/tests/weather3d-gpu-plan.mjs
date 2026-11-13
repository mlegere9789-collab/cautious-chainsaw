// A stand-in anim plan for the weather and effects harnesses: deterministic events on a real anim3d bus that exercise every effect type the effects layer listens to (fire, impact, fall, unit_march).
// The real plan belongs to the crowd; this only drives the bus -> fx path, the same way for WebGL2 and WebGPU. The events are a pure function of (t0, t1) and of the anchor (camera position and yaw),
// so a replay after a seek gives the same smoke. Browser-side module (imported by the harness pages), no DOM.
import { createAnimBus } from '../src/anim3d/events.mjs';

export function makePlan(groundAt) {
  const bus = createAnimBus(), plan = { on: false, guns: false, volleys: false, falls: false, march: false, A: [0, 0, 0], f: [0, 0, 1], r: [1, 0, 0], yaw: 0 };
  const at = (u, v, h = 0) => { const x = plan.A[0] + plan.f[0] * u + plan.r[0] * v, z = plan.A[2] + plan.f[2] * u + plan.r[2] * v; return [x, groundAt(x, z) + h, z]; };
  function advance(t0, t1) {
    if (!plan.on) return 0; let n = 0; const d = plan.f;
    if (plan.guns) for (let t = Math.ceil(t0 / 10) * 10; t < t1; t += 10) for (let g = 0; g < 6; g++) {
      const tt = t + g * 0.7, id = 1000 + g + Math.floor(t), p = at(45, -25 + g * 10, 1.1);
      bus.emit('fire', 'US-ART', g, tt, 'cannon', p, d, { weaponId: 'napoleon_12pdr_m1857', round: 'shell', tier: 'inferred', cycleS: 40, ranksBack: 0, fuze: 'time', fuzeS: 2, gunIdx: g, shotId: id }); n++;
      const q = at(230 + g * 14, -60 + g * 24, 14); bus.emit('impact', 'US-ART', g, tt + 2.0, 'shell_burst', q, d, { fireT: tt, weaponId: 'napoleon_12pdr_m1857', speedMs: 300, balls: 0, shotId: id }); n++;
      if (g % 3 === 0) { const s = at(160 + g * 10, -40 + g * 20, 0.3); bus.emit('impact', 'US-ART', g, tt + 1.6, 'solid_strike', s, d, { fireT: tt, weaponId: 'napoleon_12pdr_m1857', speedMs: 380, balls: 0, shotId: id + 500 }); n++; }
    }
    if (plan.volleys) for (let t = Math.ceil(t0 / 6) * 6; t < t1; t += 6) for (let i = 0; i < 60; i++) {
      const p = at(30 + (i % 2) * 1.2, -30 + i, 1.4); bus.emit('fire', 'US-INF', i, t + (i % 7) * 0.3, 'long_arm', p, d, { weaponId: 'm1861_springfield', round: 'ball', tier: 'inferred', cycleS: 20, ranksBack: i % 2 }); n++;
    }
    if (plan.falls) for (let t = Math.ceil(t0 / 4) * 4; t < t1; t += 4) { const i = Math.floor(t / 4) % 40; bus.emit('fall', 'US-INF', i, t, i % 9 === 0 ? 'horse_fall' : 'fall_back', at(38, -20 + i, 0), { fate: 'killed' }); n++; }
    if (plan.march) for (let t = Math.ceil(t0); t < t1; t += 1) { bus.emit('unit_march', 'US-MARCH', t, 300, 110, 1.4, at(18, 0, 0), plan.yaw + Math.PI / 2, 'quick_time', { surface: 'road', lengthM: 90 }); n++; }
    return n;
  }
  // anchor the plan at a camera: guns 45 m in front of it, a volley 30 m in front, falls and a marching column ahead
  const anchor = (cam, flags) => { const fy = cam.yaw; Object.assign(plan, { on: !!flags, guns: false, volleys: false, falls: false, march: false }, flags || {}); plan.A = [cam.x, 0, cam.z]; plan.f = [Math.sin(fy), 0, Math.cos(fy)]; plan.r = [-Math.cos(fy), 0, Math.sin(fy)]; plan.yaw = fy; };
  // point(u, v, h): the world position of a point of the plan's frame (u metres ahead of the anchor, v to its right, h above the ground); aimCamera looks at it after the plan was anchored
  return { bus, plan, anim: { bus, advance }, anchor, point: at };
}
export function aimCamera(cam, P, aim) { const p = P.point(aim[0], aim[1], aim[2] ?? 0); cam.lookAtPoint(p[0], p[1], p[2]); return cam; }

// where a case puts the camera. spec.at: 'field' (700, 200) | 'line' (behind the prototype world's show line, looking along it) | 'lnglat' (+ dx, dz) | 'xz'; spec.h: height above the ground (m); spec.look: 'sun' | 'moon' |
// [yaw, pitch]; spec.target = [lng, lat] looks at that place. smp: the sun and moon sample of the case's time (environment.sample). Same arguments, same camera.
export function placeCamera(cam, spec, { T, geo, smp, line }) {
  let x, z, yaw = 0, pitch = 0; const hAbove = spec.h ?? 40;
  if (spec.at === 'line' && line) { const f = [Math.sin(line.heading), Math.cos(line.heading)]; x = line.x - f[0] * (spec.back ?? 90); z = line.z - f[1] * (spec.back ?? 90); yaw = line.heading; }
  else if (spec.at === 'lnglat') { [x, z] = geo.xz(spec.lng, spec.lat); x += spec.dx ?? 0; z += spec.dz ?? 0; }
  else if (spec.at === 'xz') { x = spec.x; z = spec.z; } else { x = 700; z = 200; }
  cam.set(x, T.h(x, z) + hAbove, z, 0, 0, spec.fov || 60);
  if (spec.look === 'sun') { yaw = Math.PI - smp.sunAz * Math.PI / 180; pitch = Math.max(0.02, smp.sunAlt * Math.PI / 180 * 0.9); }
  else if (spec.look === 'moon') { yaw = Math.PI - smp.moonAz * Math.PI / 180; pitch = smp.moonAlt * Math.PI / 180; }
  else if (Array.isArray(spec.look)) { [yaw, pitch] = spec.look; }
  cam.yaw = yaw; cam.pitch = pitch; if (spec.target) { const [tx, tz] = geo.xz(spec.target[0], spec.target[1]); cam.lookAtPoint(tx, T.h(tx, tz) + (spec.targetH ?? 4), tz); }
  return cam;
}
