// Deterministic synthetic shot streams for the bench. Event row = [tFire, x, y, z, dirX, dirZ, sampleIndex, gain] (Float64, stride 8), aux = [pitch, 0] (Float32, stride 2).
// Local frame: metres, x east, y up, z north, listener at the origin. Shots are placed by the geometry documented in PLAN.md section 6.
import { WEAPONS, FS_DB } from './engine.mjs'; import { dbToGain } from '../model/acoustics.mjs';
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
class Out { constructor() { this.e = []; this.a = []; } push(t, x, y, z, dx, dz, sm, g, pitch) { this.e.push(t, x, y, z, dx, dz, sm, g); this.a.push(pitch, 0); } finish() { const n = this.e.length / 8, idx = Array.from({ length: n }, (_, i) => i).sort((p, q) => this.e[p * 8] - this.e[q * 8]); const E = new Float64Array(n * 8), A = new Float32Array(n * 2); idx.forEach((s, d) => { E.set(this.e.slice(s * 8, s * 8 + 8), d * 8); A.set(this.a.slice(s * 2, s * 2 + 2), d * 2); }); return { events: E, aux: A, count: n }; } }
const pick = (r, a) => a[Math.floor(r() * a.length)];
function shot(out, r, banks, w, t, x, y, z, toward) {
  const W = WEAPONS[w], sm = pick(r, banks[W.bank]), jit = (r() - 0.5) * 0.06, gj = Math.pow(10, (r() - 0.5) * 3 / 20);
  const ang = toward ? Math.atan2(-x, -z) + (r() - 0.5) * 1.2 : Math.atan2(x, z) + (r() - 0.5) * 1.2;       // muzzle roughly toward / away from the listener
  out.push(t, x, y, z, Math.sin(ang), Math.cos(ang), sm, dbToGain(W.peakDb, FS_DB) * gj, W.pitch * (1 + jit));
}
/** Constant-rate musket stream (capacity sweep): `rate` shots/s for `dur` s, each man firing on his own ~24 s cycle with jitter; distances 10..1500 m (25% < 100 m, 50% 100..400 m, 25% > 400 m). */
export function musketStream({ rate, dur, banks, seed = 1, cannonRate = 0, weapons = [0, 0, 0, 1, 2] }) {
  const r = rng(seed), out = new Out(), n = Math.round(rate * dur);
  for (let i = 0; i < n; i++) {
    const t = (i + r()) / rate, u = r(), d = u < 0.25 ? 10 + r() * 90 : u < 0.75 ? 100 + r() * 300 : 400 + r() * 1100, th = (r() - 0.5) * Math.PI * 1.6 + (r() < 0.5 ? 0 : Math.PI);
    shot(out, r, banks, pick(r, weapons), t, Math.sin(th) * d, 1.5, Math.cos(th) * d, r() < 0.5);
  }
  for (let i = 0, m = Math.round(cannonRate * dur); i < m; i++) { const t = r() * dur, d = 150 + r() * 2200, th = r() * Math.PI * 2; shot(out, r, banks, pick(r, [4, 4, 5, 6]), t, Math.sin(th) * d, 1.5, Math.cos(th) * d, r() < 0.5); }
  return out.finish();
}
/** The Pickett's Charge cannonade, geometry after the standard accounts: ~150 Confederate guns on Seminary Ridge (listener on Cemetery Ridge near the Copse of Trees, ridge ~1.2-1.6 km west), ~80 Union guns along Cemetery Ridge. Per-gun interval `confInt`/`unionInt` s (mean, +-30 percent jitter). */
export function cannonade({ dur, banks, seed = 2, confGuns = 150, unionGuns = 80, confInt = 90, unionInt = 120 }) {
  const r = rng(seed), out = new Out();
  const gun = (x, z, int, face, kinds) => { const ph = r() * int; for (let t = ph; t < dur; t += int * (0.7 + 0.6 * r())) shot(out, r, banks, pick(r, kinds), t, x, 1.5, z, false), out.e[out.e.length - 4] = Math.sin(face), out.e[out.e.length - 3] = Math.cos(face); };
  for (let g = 0; g < confGuns; g++) gun(-1200 - r() * 400, -1300 + 2600 * (g + r() * 0.8) / confGuns, confInt, Math.PI / 2, [4, 4, 5, 6]);       // face east
  for (let g = 0; g < unionGuns; g++) gun(-120 + r() * 200, -1100 + 2000 * (g + r() * 0.8) / unionGuns, unionInt, -Math.PI / 2, [4, 5, 5]);         // face west
  return out.finish();
}
/** Day-3 infantry assault at the Angle: `defenders` Union men on Cemetery Ridge firing every 60/rD s, `attackers` men between 150 and 1300 m west firing every 60/rA s; every man fires on his own jittered cycle. */
export function assault({ dur, banks, seed = 3, defenders = 6500, attackers = 3000, rD = 2.5, rA = 2.0 }) {
  const r = rng(seed), out = new Out();
  const man = (x, z, per, kinds, toward) => { const ph = r() * per; for (let t = ph; t < dur; t += per * (0.8 + 0.4 * r())) shot(out, r, banks, pick(r, kinds), t, x, 1.5, z, toward); };
  for (let m = 0; m < defenders; m++) man(-20 + r() * 40, (r() < 0.5 ? -1 : 1) * 900 * r() * r() + 5, 60 / rD, [0, 0, 0, 1, 2], false);
  for (let m = 0; m < attackers; m++) man(-150 - r() * 1150 * r(), (r() - 0.5) * 1000, 60 / rA, [0, 0, 1, 2], true);
  return out.finish();
}
export function merge(...streams) { const n = streams.reduce((a, s) => a + s.count, 0), E = new Float64Array(n * 8), A = new Float32Array(n * 2); let i = 0; const idx = []; for (const s of streams) for (let k = 0; k < s.count; k++) idx.push([s, k]); idx.sort((p, q) => p[0].events[p[1] * 8] - q[0].events[q[1] * 8]); for (const [s, k] of idx) { E.set(s.events.subarray(k * 8, k * 8 + 8), i * 8); A.set(s.aux.subarray(k * 2, k * 2 + 2), i * 2); i++; } return { events: E, aux: A, count: n }; }
