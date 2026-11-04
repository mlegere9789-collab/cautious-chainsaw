// Battle fog: (1) the aggregator that turns far small-arms smoke into one fog event per 32 m cell per second (mass, centroid and spread conserved; the event is stamped with the LAST shot of
// its bucket, so nothing exists before its cause), (2) the fog map (column optical depth, mean height and thickness per ground cell, for the terrain, soldier and billboard shaders), and
// (3) sight-line queries: optical depth along a ray and the distance at which a target drops to 2 percent contrast ("visibility inside batteries tens of metres", T2-122).
import { F, STRIDE, T, rec, SMOKE_TYPES } from './store.mjs';
import { puffState, rayOpticalDepth, TWO_PI_32 } from './core.mjs';

export const CELL = 32;
export class FogAggregator {
  constructor(sink) { this.sink = sink; this.b = new Map(); this.massIn = 0; this.events = 0; }
  clear() { this.b.clear(); }
  // info: the object Emitter.fire returns in mode 'fog'
  add(info) {
    const [x, y, z] = info.pos, key = Math.floor(x / CELL) + ',' + Math.floor(z / CELL) + ',' + Math.floor(info.tm);
    let c = this.b.get(key); if (!c) this.b.set(key, c = { sec: Math.floor(info.tm), m: 0, x: 0, y: 0, z: 0, xx: 0, zz: 0, s2: 0, tmax: -Infinity, seed: 0, n: 0, vb: 0, tauDis: 0, K: 0, beta: 0, vr: 0, g: 0, tauB: info.base.TAUB });
    const m = info.mass; c.m += m; c.x += m * x; c.y += m * y; c.z += m * z; c.xx += m * x * x; c.zz += m * z * z; c.s2 += m * info.sigma0 * info.sigma0; c.tmax = Math.max(c.tmax, info.tm); c.seed = (c.seed ^ info.seed) >>> 0; c.n++;
    c.vb += m * info.vb0; c.tauDis += m * info.tauDis; c.K += m * info.K; c.beta += m * info.beta; c.vr += m * info.vr; c.g += m * info.ground; this.massIn += m;
  }
  // emit the buckets that are complete at time t (their second is over); returns the number of fog events made
  flush(t, force = false) {
    let made = 0;
    for (const [k, c] of this.b) {
      if (!force && c.sec + 1 > t) continue; this.b.delete(k); if (c.m <= 0) continue;
      const mx = c.x / c.m, my = c.y / c.m, mz = c.z / c.m, spread = Math.max(0, (c.xx / c.m - mx * mx) + (c.zz / c.m - mz * mz)) / 2, sg = Math.sqrt(c.s2 / c.m + spread);
      this.sink(rec({ X: mx, Y: my, Z: mz, T0: c.tmax, TYPE: T.FOG, SEED: c.seed, MASS: c.m, SIG: sg, TAUD: 1, VB: c.vb / c.m, TAUB: c.tauB, TAUDIS: c.tauDis / c.m, K: c.K / c.m, BETA: c.beta / c.m, VR: c.vr / c.m, G: c.g / c.m, LIFE: 150, A1: c.n, CAUSE: c.seed }));
      made++;
    }
    this.events += made; return made;
  }
}

const kappaOf = (P, type) => (type === T.DUST || type === T.EARTH || type === T.RICOCHET || type === T.CANISTER ? P.dust.kappa_m2_per_kg : P.smoke.kappa_m2_per_kg);

// ---- fog map: res x res cells over the box [x0, x0+size] x [z0, z0+size]. Channels per cell: od (column optical depth), zc (mean height above ground), sz (thickness sigma).
export class FogMap {
  constructor(res = 128) { this.res = res; this.od = new Float32Array(res * res); this.zc = new Float32Array(res * res); this.sz = new Float32Array(res * res); this.x0 = 0; this.z0 = 0; this.size = 1; this.tmp = new Float64Array(res * res * 2); this.mass = 0; this.splats = 0; }
  rasterize(store, P, t, wind, x0, z0, size) {
    const R = this.res, cs = size / R, od = this.od, a = this.tmp; this.x0 = x0; this.z0 = z0; this.size = size; od.fill(0); this.zc.fill(0); this.sz.fill(0); a.fill(0); this.mass = 0; this.splats = 0;
    const st = {}, zw = new Float64Array(R * R), z2 = new Float64Array(R * R);
    for (let i = 0; i < store.n; i++) {
      const ty = store.a[i * STRIDE + F.TYPE]; if (!SMOKE_TYPES.has(ty)) continue; const s = puffState(store._puff(i), t, wind, st); if (!s || s.mass <= 0) continue;
      const kap = kappaOf(P, ty), reach = 3 * s.sh; if (s.cx + reach < x0 || s.cx - reach > x0 + size || s.cz + reach < z0 || s.cz - reach > z0 + size) continue;
      const i0 = Math.max(0, Math.floor((s.cx - reach - x0) / cs)), i1 = Math.min(R - 1, Math.floor((s.cx + reach - x0) / cs)), j0 = Math.max(0, Math.floor((s.cz - reach - z0) / cs)), j1 = Math.min(R - 1, Math.floor((s.cz + reach - z0) / cs));
      const h = s.cy - s.g, inv = 1 / (2 * s.sh * s.sh), nrm = s.mass / (2 * Math.PI * s.sh * s.sh);
      // exact cell integral of the horizontal Gaussian would need erf per cell; the centre value times the cell area is within 1 percent when sigma >= 2 cells (tested); for narrower puffs use the exact separable form
      const narrow = s.sh < 2 * cs;
      for (let j = j0; j <= j1; j++) for (let ii = i0; ii <= i1; ii++) {
        let col;
        if (narrow) { col = cellMass(ii * cs + x0, (ii + 1) * cs + x0, s.cx, s.sh) * cellMass(j * cs + z0, (j + 1) * cs + z0, s.cz, s.sh) * s.mass / (cs * cs); }
        else { const px = x0 + (ii + 0.5) * cs - s.cx, pz = z0 + (j + 0.5) * cs - s.cz; col = nrm * Math.exp(-(px * px + pz * pz) * inv); }
        const k = j * R + ii; od[k] += kap * col; zw[k] += kap * col * h; z2[k] += kap * col * (s.sv * s.sv + h * h); this.mass += col * cs * cs;
      }
      this.splats += (i1 - i0 + 1) * (j1 - j0 + 1);
    }
    for (let k = 0; k < R * R; k++) if (od[k] > 1e-9) { const zc = zw[k] / od[k]; this.zc[k] = zc; this.sz[k] = Math.sqrt(Math.max(0.25, z2[k] / od[k] - zc * zc)); }
    return this;
  }
  at(x, z) { const R = this.res, i = Math.floor((x - this.x0) / this.size * R), j = Math.floor((z - this.z0) / this.size * R); if (i < 0 || j < 0 || i >= R || j >= R) return 0; return this.od[j * R + i]; }
}
const cellMass = (a, b, c, s) => 0.5 * (erfc2((a - c) / (s * Math.SQRT2)) - erfc2((b - c) / (s * Math.SQRT2)));
function erfc2(x) { const s = x < 0 ? -1 : 1, a = Math.abs(x), t = 1 / (1 + 0.3275911 * a), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a); return 1 - s * y; }

// ---- sight-line queries (CPU; exact closed form per puff)
export function sightlineOD(store, P, t, wind, a, b, st = {}) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz); if (L < 1e-9) return 0; const ux = dx / L, uy = dy / L, uz = dz / L; let od = 0;
  for (let i = 0; i < store.n; i++) {
    const ty = store.a[i * STRIDE + F.TYPE]; if (!SMOKE_TYPES.has(ty)) continue; const s = puffState(store._puff(i), t, wind, st); if (!s || s.mass <= 0) continue;
    const px = s.cx - a[0], py = s.cy - a[1], pz = s.cz - a[2], proj = px * ux + py * uy + pz * uz; if (proj < -4 * s.sh || proj > L + 4 * s.sh) continue;
    const r2 = px * px + py * py + pz * pz - proj * proj; if (r2 > 16 * Math.max(s.sh, s.sv) ** 2) continue;
    od += rayOpticalDepth(s, kappaOf(P, ty), a[0], a[1], a[2], ux, uy, uz, L);
  }
  return od;
}
// distance along (a, unit u) at which a target has 2 percent contrast (optical depth ln 50), or maxM if the way is clear
export function visibilityM(store, P, t, wind, a, u, maxM = 600) {
  const target = Math.log(50), f = L => sightlineOD(store, P, t, wind, a, [a[0] + u[0] * L, a[1] + u[1] * L, a[2] + u[2] * L]);
  if (f(maxM) < target) return maxM; let lo = 0, hi = maxM;
  for (let i = 0; i < 30; i++) { const m = 0.5 * (lo + hi); if (f(m) < target) lo = m; else hi = m; } return 0.5 * (lo + hi);
}
export { TWO_PI_32 };
