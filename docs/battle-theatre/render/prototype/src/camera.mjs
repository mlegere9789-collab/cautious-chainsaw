import { perspective, lookAt, mul, frustumPlanes, invert, D2R, clamp } from './math.mjs';
export class Camera {
  constructor() { this.x = 0; this.y = 100; this.z = 0; this.yaw = 0; this.pitch = -.3; this.fov = 60 * D2R; this.near = .25; this.far = 14000; this.vp = new Float32Array(16); this.prevVp = new Float32Array(16); this.invVp = new Float32Array(16); this.view = new Float32Array(16); this.proj = new Float32Array(16); this.planes = new Float32Array(24); this.first = true; }
  // yaw 0 looks toward +z (south), yaw +pi/2 looks toward +x? keep: forward = (sin yaw cos pitch, sin pitch, cos yaw cos pitch)
  get fwd() { const cp = Math.cos(this.pitch); return [Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp]; }
  set(x, y, z, yaw, pitch, fov) { this.x = x; this.y = y; this.z = z; this.yaw = yaw; this.pitch = pitch; if (fov) this.fov = fov * D2R; }
  lookAtPoint(px, py, pz) { const dx = px - this.x, dy = py - this.y, dz = pz - this.z; this.yaw = Math.atan2(dx, dz); this.pitch = Math.atan2(dy, Math.hypot(dx, dz)); }
  update(aspect) {
    this.prevVp.set(this.vp); const f = this.fwd; lookAt([this.x, this.y, this.z], [this.x + f[0], this.y + f[1], this.z + f[2]], [0, 1, 0], this.view);
    perspective(this.fov, aspect, this.near, this.far, this.proj); mul(this.proj, this.view, this.vp); invert(this.vp, this.invVp); frustumPlanes(this.vp, this.planes); if (this.first) { this.prevVp.set(this.vp); this.first = false; }
    return this;
  }
  right() { return [-Math.cos(this.yaw), 0, Math.sin(this.yaw)]; }
  up() { const f = this.fwd, r = this.right(); return [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]]; }
}
// free-fly controller: WASD move, QE down/up, shift fast, drag look, wheel speed
export class FlyControls {
  constructor(cam, el, T) { this.cam = cam; this.keys = new Set(); this.speed = 40; this.T = T; this.drag = false;
    addEventListener('keydown', e => { this.keys.add(e.code); }); addEventListener('keyup', e => this.keys.delete(e.code));
    let lx = 0, ly = 0; el.addEventListener('mousedown', e => { this.drag = true; lx = e.clientX; ly = e.clientY; }); addEventListener('mouseup', () => { this.drag = false; });
    addEventListener('mousemove', e => { if (this.drag) { cam.yaw -= (e.clientX - lx) * .0035; cam.pitch = clamp(cam.pitch - (e.clientY - ly) * .0035, -1.55, 1.55); lx = e.clientX; ly = e.clientY; } });
    el.addEventListener('wheel', e => { this.speed *= e.deltaY < 0 ? 1.25 : .8; this.speed = clamp(this.speed, 2, 1500); e.preventDefault(); }, { passive: false }); }
  update(dt) { const c = this.cam, k = this.keys; const f = c.fwd, r = c.right(); const sp = this.speed * (k.has('ShiftLeft') ? 4 : 1) * dt; let mx = 0, my = 0, mz = 0;
    if (k.has('KeyW')) { mx += f[0]; my += f[1]; mz += f[2]; } if (k.has('KeyS')) { mx -= f[0]; my -= f[1]; mz -= f[2]; } if (k.has('KeyD')) { mx += r[0]; mz += r[2]; } if (k.has('KeyA')) { mx -= r[0]; mz -= r[2]; }
    if (k.has('KeyE')) my += 1; if (k.has('KeyQ')) my -= 1; c.x += mx * sp; c.y += my * sp; c.z += mz * sp; const g = this.T.h(c.x, c.z) + 1.7; if (c.y < g) c.y = g; }
}
