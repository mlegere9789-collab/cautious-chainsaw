// Event-driven effects: gun fire (flash + smoke), shell impact (dirt column, dust/smoke, debris), musket puffs near the camera.
// Particles are stateless: the vertex shader evaluates position from (event, particle index, age) so there is no per-particle CPU or GPU simulation state.
import { mulberry32, hsh } from './math.mjs';
import { soldierPlace, UNIT_STRIDE, FIRE_PERIOD } from './world.mjs';
export const EV_LIFE = [14, 24, 14]; export const EV_PER = 64, MAXEV = 4096;
export class FX {
  constructor(world, { puffRadius = 110, gunScale = 1 } = {}) { this.w = world; this.rnd = mulberry32(99); this.ev = new Float32Array(MAXEV * 8); this.n = 0; this.pending = []; this.lastK = null; this.lastT = null; this.puffRadius = puffRadius; this.packed = new Float32Array(MAXEV * 8); this.live = 0; this.stats = { gunShots: 0, impacts: 0, puffs: 0 }; this.gunScale = gunScale; }
  push(x, y, z, t0, type, seed, dx, dz) { if (this.n >= MAXEV) { this.ev.copyWithin(0, 8 * (MAXEV >> 2), this.n * 8); this.n -= (MAXEV >> 2); } const o = this.n * 8; this.ev[o] = x; this.ev[o + 1] = y; this.ev[o + 2] = z; this.ev[o + 3] = t0; this.ev[o + 4] = type; this.ev[o + 5] = seed; this.ev[o + 6] = dx; this.ev[o + 7] = dz; this.n++; }
  update(t, cam) {
    const w = this.w, T = w.T, g = w.gunF, G = w.guns.length;
    if (!this.lastK) { this.lastK = new Int32Array(G); for (let i = 0; i < G; i++) this.lastK[i] = Math.floor((t + g[i * 8 + 5]) / g[i * 8 + 4]); this.lastT = t; }
    if (t < this.lastT - 1e-6) { for (let i = 0; i < G; i++) this.lastK[i] = Math.floor((t + g[i * 8 + 5]) / g[i * 8 + 4]); this.n = 0; this.pending.length = 0; }
    for (let i = 0; i < G; i++) { const o = i * 8, k = Math.floor((t + g[o + 5]) / g[o + 4]); if (k > this.lastK[i]) { this.lastK[i] = k; const x = g[o], z = g[o + 1], h = g[o + 2]; const fx = Math.sin(h), fz = Math.cos(h);
        const tf = t - (((t + g[o + 5]) % g[o + 4]) ) * 0; this.push(x + fx * 2.4, T.h(x, z) + 1.05, z + fz * 2.4, t, 1, this.rnd(), fx, fz); this.stats.gunShots++;
        const range = (i < 6 ? 60 + this.rnd() * 60 : g[o + 7]) * this.gunScale, lat = (this.rnd() - .5) * (i < 6 ? 50 : 120); const hx = x + fx * range + fz * lat, hz = z + fz * range - fx * lat;
        this.pending.push([t + (i < 6 ? 1.1 : g[o + 6]), hx, hz, this.rnd()]); } }
    for (let i = this.pending.length - 1; i >= 0; i--) { const p = this.pending[i]; if (t >= p[0]) { this.push(p[1], T.h(p[1], p[2]), p[2], p[0], 2, p[3], 0, 0); this.stats.impacts++; this.pending.splice(i, 1); } }
    // musket puffs from firing lines near the camera (individual shots)
    const f = w.unitF; const pr2 = (this.puffRadius + 40) ** 2;
    for (let ui = 0; ui < w.units.length; ui++) { const o = ui * UNIT_STRIDE, kind = f[o + 3] | 0; if (!(kind === 3 || kind === 4) || f[o + 7] !== 0) continue;
      const u = w.units[ui]; const dx = f[o] - cam.x, dz = f[o + 1] - cam.z; if (dx * dx + dz * dz > pr2 + u.radius * u.radius * 2) continue;
      for (let k = 0; k < u.count; k++) { const i = u.first + k; const seed = w.sold[i * 4 + 2], fo = w.sold1[i * 4 + 2], fall = w.sold1[i * 4]; if (t >= fall) continue; const P = FIRE_PERIOD + (seed - .5);
        const a = (t + fo * P) / P, b = (this.lastT + fo * P) / P; const sh = .78 + .22 * .45; if (Math.floor(a - sh) > Math.floor(b - sh)) { soldierPlace(w, i, t, [0, 0, 0]); const out = [0, 0, 0]; soldierPlace(w, i, t, out); const hd = out[2]; const fx = Math.sin(hd), fz = Math.cos(hd);
          if ((out[0] - cam.x) ** 2 + (out[1] - cam.z) ** 2 < this.puffRadius ** 2) { this.push(out[0] + fx * 1.3, T.h(out[0], out[1]) + 1.45, out[1] + fz * 1.3, t, 0, hsh(i + Math.floor(a) * 7919), fx, fz); this.stats.puffs++; } } } }
    this.lastT = t;
    // compact live events
    let m = 0; for (let e = 0; e < this.n; e++) { const o = e * 8; if (t - this.ev[o + 3] < EV_LIFE[this.ev[o + 4] | 0] + 0.001) { if (m !== e) this.ev.copyWithin(m * 8, o, o + 8); m++; } } this.n = m; this.live = m; return m;
  }
  data() { return this.ev.subarray(0, this.n * 8); }
}
