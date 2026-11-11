// Free-fly camera controls: keyboard, mouse, touch (virtual stick), wheel dolly, eased flights between bookmarks, and follow. Every listener belongs to the
// session Scope, so leaving the theatre removes them all. The camera object is the prototype's Camera (imported); its own FlyControls adds window
// listeners that cannot be removed, so it is not used.
import { clamp } from '../../render/prototype/src/math.mjs';

const EDITABLE = /^(INPUT|TEXTAREA|SELECT)$/;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const wrapAngle = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

export class Controls {
  constructor({ cam, canvas, T, scope, reduceMotion = () => false, onTap = () => {}, onMove = () => {}, onHover = () => {} }) {
    this.cam = cam; this.canvas = canvas; this.T = T; this.scope = scope; this.reduce = reduceMotion; this.onTap = onTap; this.onMove = onMove; this.onHover = onHover;
    this.keys = new Set(); this.stick = { x: 0, y: 0 }; this.rise = 0; this.vel = [0, 0, 0]; this.dolly = 0; this.flight = null; this.follow = null; this.speedMul = 1; this.moved = false;
    this.pointers = new Map(); this.drag = null; this.pinch = null;
    const s = scope;
    s.on(document, 'keydown', e => this.keydown(e)); s.on(document, 'keyup', e => this.keys.delete(e.code)); s.on(window, 'blur', () => this.keys.clear());
    s.on(canvas, 'pointerdown', e => this.pdown(e)); s.on(canvas, 'pointermove', e => this.pmove(e)); s.on(canvas, 'pointerup', e => this.pup(e)); s.on(canvas, 'pointercancel', e => this.pup(e, true));
    s.on(canvas, 'wheel', e => { e.preventDefault(); this.cancelAuto(); this.dolly += -e.deltaY * (e.deltaMode ? 30 : 1) * .0016; }, { passive: false });
    s.on(canvas, 'contextmenu', e => e.preventDefault());
  }
  get active() { return !!this.flight; }
  cancelAuto() { this.flight = null; this.follow = null; }
  keydown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return; const t = e.target;
    if (t && EDITABLE.test(t.tagName)) return;
    const k = e.code;
    if (/^(KeyW|KeyA|KeyS|KeyD|KeyQ|KeyE|ShiftLeft|ShiftRight)$/.test(k) || (/^Arrow/.test(k) && !(t && t.matches && t.matches('[role=slider],input,[role=listbox],select')))) {
      if (/^Arrow/.test(k) || /^Key/.test(k)) this.cancelAuto();
      this.keys.add(k); if (/^Arrow/.test(k) && t === this.canvas) e.preventDefault();
    }
  }
  pdown(e) {
    this.canvas.focus({ preventScroll: true }); this.canvas.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: 0, btn: e.button, type: e.pointerType });
    if (this.pointers.size === 2) { const [a, b] = [...this.pointers.values()]; this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; }
    this.cancelAuto();
  }
  pmove(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) { if (e.pointerType === 'mouse') this.onHover(e.clientX, e.clientY); return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; p.moved += Math.abs(dx) + Math.abs(dy);
    if (this.pointers.size >= 2 && this.pinch) { const [a, b] = [...this.pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); this.dolly += (d - this.pinch.d) * .02; this.pinch.d = d; return; }
    if (p.moved > 4) { this.cam.yaw -= dx * .0035; this.cam.pitch = clamp(this.cam.pitch - dy * .0035, -1.52, 1.52); this.moved = true; }
  }
  pup(e, cancelled) {
    const p = this.pointers.get(e.pointerId); this.pointers.delete(e.pointerId); if (this.pointers.size < 2) this.pinch = null;
    if (p && !cancelled && p.moved < 6 && performance.now() - p.t0 < 600 && this.pointers.size === 0) this.onTap(e.clientX, e.clientY, p.type);
  }
  flyTo(g, dur) {   // g = {x,y,z,yaw,pitch,fov}
    const c = this.cam; this.follow = null;
    if (this.reduce() || dur <= 0) { c.set(g.x, g.y, g.z, g.yaw, g.pitch, g.fov); this.flight = null; return; }
    const from = { x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch, fov: c.fov }, dist = Math.hypot(g.x - c.x, g.y - c.y, g.z - c.z);
    this.flight = { from, to: { ...g, fov: (g.fov ?? c.fov * 180 / Math.PI) * Math.PI / 180, dyaw: wrapAngle(g.yaw - c.yaw) }, t: 0, dur: dur ?? clamp(.9 + dist / 1600, .9, 2.8), arc: Math.min(220, dist * .12) };
  }
  followUnit(getPos) { this.flight = null; const p = getPos(); if (p) this.follow = { get: getPos, last: [p[0], p[1]] }; }
  update(dt) {
    const c = this.cam, T = this.T, k = this.keys; let acted = false;
    if (this.flight) {
      const f = this.flight; f.t += dt / f.dur; const u = ease(clamp(f.t, 0, 1)), a = f.from, b = f.to;
      c.x = a.x + (b.x - a.x) * u; c.z = a.z + (b.z - a.z) * u; c.y = a.y + (b.y - a.y) * u + Math.sin(Math.PI * u) * f.arc; c.yaw = a.yaw + b.dyaw * u; c.pitch = a.pitch + (b.pitch - a.pitch) * u; c.fov = a.fov + (b.fov - a.fov) * u;
      if (f.t >= 1) { this.flight = null; this.onMove(true); } acted = true;
    } else {
      const gh = T.h(c.x, c.z), alt = Math.max(c.y - gh, 1.7), fwd = c.fwd, rgt = c.right();
      const base = clamp(7 + alt * .55, 7, 420) * this.speedMul * ((k.has('ShiftLeft') || k.has('ShiftRight')) ? 4 : 1);
      let tx = 0, ty = 0, tz = 0;
      const mf = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0) - this.stick.y, ms = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0) + this.stick.x, mu = (k.has('KeyE') ? 1 : 0) - (k.has('KeyQ') ? 1 : 0) + this.rise;
      tx = (fwd[0] * mf + rgt[0] * ms) * base; ty = (fwd[1] * mf + mu) * base; tz = (fwd[2] * mf + rgt[2] * ms) * base;
      const a = 1 - Math.exp(-dt / .14); this.vel[0] += (tx - this.vel[0]) * a; this.vel[1] += (ty - this.vel[1]) * a; this.vel[2] += (tz - this.vel[2]) * a;
      if (Math.abs(this.vel[0]) + Math.abs(this.vel[1]) + Math.abs(this.vel[2]) > .02) { c.x += this.vel[0] * dt; c.y += this.vel[1] * dt; c.z += this.vel[2] * dt; acted = true; } else this.vel[0] = this.vel[1] = this.vel[2] = 0;
      if (Math.abs(this.dolly) > 1e-3) { const step = this.dolly * (1 - Math.exp(-dt / .09)); this.dolly -= step; const d = step * clamp(alt * .9 + 20, 25, 900); c.x += fwd[0] * d; c.y += fwd[1] * d; c.z += fwd[2] * d; acted = true; }
      const yr = ((k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0)) * 1.3 * dt, pr = ((k.has('ArrowUp') ? 1 : 0) - (k.has('ArrowDown') ? 1 : 0)) * 1.0 * dt;
      if (yr || pr) { c.yaw += yr; c.pitch = clamp(c.pitch + pr, -1.52, 1.52); acted = true; }
      if (this.follow) { const p = this.follow.get(); if (p) { c.x += p[0] - this.follow.last[0]; c.z += p[1] - this.follow.last[1]; this.follow.last = [p[0], p[1]]; acted = true; } }
      if (this.moved) { acted = true; this.moved = false; }
    }
    const half = T.W / 2 + 600, halfZ = T.H / 2 + 600; c.x = clamp(c.x, -half, half); c.z = clamp(c.z, -halfZ, halfZ);
    const g = T.h(c.x, c.z) + 1.7; if (c.y < g) c.y = g; if (c.y > 7000) c.y = 7000; c.far = c.y > 900 ? 14000 : 6000;
    if (acted) this.onMove(false);
    return acted;
  }
}
