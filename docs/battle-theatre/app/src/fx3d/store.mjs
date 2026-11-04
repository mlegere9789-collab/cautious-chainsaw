// The live effect events: a struct-of-arrays store (Float64, no per-event objects, no garbage in the frame loop).
// An event is a CAUSED thing: T0 is the time of its cause (a shot, a burst, an impact, a footfall tick, an ignition) and nothing about it exists before T0.
// When the store is full the oldest smoke is MERGED (mass and centroid kept), never dropped: "no event is ever dropped" (render/PLAN.md G1 path 5).
import { puffState } from './core.mjs';

export const F = { X: 0, Y: 1, Z: 2, T0: 3, TYPE: 4, SEED: 5, MASS: 6, SIG: 7, VX: 8, VY: 9, VZ: 10, TAUD: 11, VB: 12, TAUB: 13, TAUDIS: 14, K: 15, BETA: 16, VR: 17, SETTLE: 18, G: 19, LIFE: 20, A1: 21, A2: 22, CAUSE: 23 };
export const STRIDE = 24;
export const T = { MUSKET: 1, GUN: 2, RING: 3, FOG: 4, CASE: 5, SHELL: 6, CANISTER: 7, EARTH: 8, RICOCHET: 9, DUST: 10, FLASH: 11, FUSE: 12, PLUME: 13, EMBER: 14 };
export const TYPE_NAME = Object.fromEntries(Object.entries(T).map(([k, v]) => [v, k.toLowerCase()]));
// effect class of a type (the budget works on classes)
export const CLASS_OF = { [T.MUSKET]: 'musket', [T.GUN]: 'gun', [T.RING]: 'gun', [T.FOG]: 'fog', [T.CASE]: 'burst', [T.SHELL]: 'burst', [T.CANISTER]: 'burst', [T.EARTH]: 'burst', [T.RICOCHET]: 'burst', [T.DUST]: 'dust', [T.FLASH]: 'flash', [T.FUSE]: 'flash', [T.PLUME]: 'fire', [T.EMBER]: 'fire' };
export const SMOKE_TYPES = new Set([T.MUSKET, T.GUN, T.RING, T.FOG, T.CASE, T.SHELL, T.CANISTER, T.EARTH, T.RICOCHET, T.DUST, T.PLUME]);   // events that carry mass
export const rec = (o = {}) => { const r = new Float64Array(STRIDE); r[F.TAUD] = 0.2; r[F.TAUB] = 1; r[F.TAUDIS] = 1e9; r[F.VR] = 1; r[F.LIFE] = 30; for (const [k, v] of Object.entries(o)) r[F[k]] = v; return r; };

export class Store {
  constructor(cap = 16384) { this.cap = cap; this.a = new Float64Array(cap * STRIDE); this.n = 0; this.merged = 0; this.pushed = 0; this.expired = 0; this.massIn = 0; this.massMergeLoss = 0; this.wind = null; this.now = null; }   // wind and now are set by createFx so a merge moves the old puffs with the real wind at the real time
  clear() { this.n = 0; }
  push(r) {
    if (this.n >= this.cap) this.compact(this.now != null ? this.now : r[F.T0], this.wind);
    if (this.n >= this.cap) { this._evictOldestFlashless(); }
    this.a.set(r, this.n * STRIDE); this.n++; this.pushed++; if (SMOKE_TYPES.has(r[F.TYPE])) this.massIn += r[F.MASS]; return this.n - 1;
  }
  get(i, k) { return this.a[i * STRIDE + k]; }
  remove(i) { const last = this.n - 1; if (i !== last) this.a.copyWithin(i * STRIDE, last * STRIDE, last * STRIDE + STRIDE); this.n--; }
  // remove events whose life has run out at time t; returns how many
  expire(t) {
    let k = 0;
    for (let i = this.n - 1; i >= 0; i--) { const o = i * STRIDE; if (t - this.a[o + F.T0] > this.a[o + F.LIFE]) { this.remove(i); k++; } }
    this.expired += k; return k;
  }
  // drop everything caused after t (a seek backwards: the host re-sends the events of the window); events caused before t are kept
  rewindTo(t) { for (let i = this.n - 1; i >= 0; i--) if (this.a[i * STRIDE + F.T0] > t) this.remove(i); }
  // total smoke mass still in the air at t (sum of mass0 * exp(-age/tauDis)), optionally restricted to a type set
  massAt(t, types = SMOKE_TYPES) { let m = 0; for (let i = 0; i < this.n; i++) { const o = i * STRIDE; if (!types.has(this.a[o + F.TYPE])) continue; const tau = t - this.a[o + F.T0]; if (tau >= 0) m += this.a[o + F.MASS] * Math.exp(-tau / this.a[o + F.TAUDIS]); } return m; }
  // Merge the oldest smoke puffs of the same 48 m cell into one fog event (mass-weighted centre, combined variance, age reset to t): the mass at t is unchanged.
  compact(t, wind = null, share = 0.25) {
    const idx = []; for (let i = 0; i < this.n; i++) { const ty = this.a[i * STRIDE + F.TYPE]; if (ty === T.MUSKET || ty === T.FOG || ty === T.DUST) idx.push(i); }
    if (!idx.length) return 0;
    idx.sort((p, q) => this.a[p * STRIDE + F.T0] - this.a[q * STRIDE + F.T0]);
    const take = idx.slice(0, Math.max(2, Math.ceil(idx.length * share))), cells = new Map(), st = {};
    for (const i of take) {
      const s = puffState(this._puff(i), t, wind, st); if (!s) continue; const key = Math.floor(s.cx / 48) + ',' + Math.floor(s.cz / 48) + ',' + this.a[i * STRIDE + F.TYPE];
      let c = cells.get(key); if (!c) cells.set(key, c = { m: 0, x: 0, y: 0, z: 0, v: 0, ids: [], tauDis: 0, type: this.a[i * STRIDE + F.TYPE], g: 0, K: 0, beta: 0, vr: 0, settle: 0 });
      const m = s.mass; c.m += m; c.x += m * s.cx; c.y += m * s.cy; c.z += m * s.cz; c.v += m * (s.sh * s.sh); c.ids.push(i); c.tauDis += m * this.a[i * STRIDE + F.TAUDIS]; c.g += m * s.g; c.K += m * this.a[i * STRIDE + F.K]; c.beta += m * this.a[i * STRIDE + F.BETA]; c.vr += m * this.a[i * STRIDE + F.VR]; c.settle += m * this.a[i * STRIDE + F.SETTLE];
    }
    const kill = []; let made = 0;
    for (const c of cells.values()) {
      if (c.ids.length < 2 || c.m <= 0) continue;
      const cx = c.x / c.m, cy = c.y / c.m, cz = c.z / c.m; let spread = 0; for (const i of c.ids) { const s = puffState(this._puff(i), t, wind, st); spread += s.mass * ((s.cx - cx) ** 2 + (s.cz - cz) ** 2); }
      const sg = Math.sqrt(c.v / c.m + spread / c.m / 2);
      for (const i of c.ids) kill.push(i);
      const r = rec({ X: cx, Y: cy, Z: cz, T0: t, TYPE: c.type === T.DUST ? T.DUST : T.FOG, SEED: Math.floor(cx * 31 + cz * 17) >>> 0, MASS: c.m, SIG: sg, TAUD: 1, TAUDIS: c.tauDis / c.m, K: c.K / c.m, BETA: c.beta / c.m, VR: c.vr / c.m, SETTLE: c.settle / c.m, G: c.g / c.m, LIFE: 120, CAUSE: 0 });
      this._pending = this._pending || []; this._pending.push(r); made++;
    }
    kill.sort((p, q) => q - p); for (const i of kill) this.remove(i);
    for (const r of this._pending || []) { this.a.set(r, this.n * STRIDE); this.n++; }
    this._pending = []; this.merged += kill.length; return kill.length - made;
  }
  _evictOldestFlashless() { // last resort when nothing could be merged: remove the single oldest event that carries no mass (flash, fuse, ember); counted
    let best = -1, bt = Infinity; for (let i = 0; i < this.n; i++) { const o = i * STRIDE, ty = this.a[o + F.TYPE]; if (!SMOKE_TYPES.has(ty) && this.a[o + F.T0] < bt) { bt = this.a[o + F.T0]; best = i; } }
    if (best < 0) { best = 0; this.droppedMass = (this.droppedMass || 0) + this.a[F.MASS]; }
    this.remove(best); this.evicted = (this.evicted || 0) + 1;
  }
  _puff(i) {
    const o = i * STRIDE, a = this.a;
    return { x: a[o + F.X], y: a[o + F.Y], z: a[o + F.Z], t0: a[o + F.T0], mass0: a[o + F.MASS], sigma0: a[o + F.SIG], vx: a[o + F.VX], vy: a[o + F.VY], vz: a[o + F.VZ], tauD: a[o + F.TAUD], vb0: a[o + F.VB], tauB: a[o + F.TAUB], tauDis: a[o + F.TAUDIS], K: a[o + F.K], beta: a[o + F.BETA], vr: a[o + F.VR], settle: a[o + F.SETTLE], g: a[o + F.G] };
  }
}
