// GPU packing. One effect event = 24 float32 (96 bytes), the layout both shader paths read:
//   0 x  1 y  2 z  3 t0 (seconds since tBase)  4 type  5 seed (low 24 bits, exact in float32)  6 mass  7 sigma0  8 vx  9 vy  10 vz  11 tauD  12 vb0  13 tauB  14 tauDis  15 K  16 beta  17 vr
//   18 settle  19 ground y  20 sprite count (decided by LOD and budget)  21 A1  22 A2  23 flags (bit 0: time uncertain)
// Absolute time (about 1.4e6 s over the 14 days) does not fit float32 to the millisecond, so t0 is stored relative to tBase (a multiple of 3600 s) and the shader gets uNow - tBase.
import { F, STRIDE } from './store.mjs';

export const GSTRIDE = 24, GPU_TYPE_FLAME = 20;
export const GF = { X: 0, Y: 1, Z: 2, T0: 3, TYPE: 4, SEED: 5, MASS: 6, SIG: 7, VX: 8, VY: 9, VZ: 10, TAUD: 11, VB: 12, TAUB: 13, TAUDIS: 14, K: 15, BETA: 16, VR: 17, SETTLE: 18, G: 19, N: 20, A1: 21, A2: 22, FLAGS: 23 };
export const tBaseOf = t => Math.floor(t / 3600) * 3600;

// write store event i into the GPU array at slot `slot` with `n` sprites
export function packEvent(store, i, out, slot, tBase, n, flags = 0) {
  const a = store.a, o = i * STRIDE, g = slot * GSTRIDE;
  out[g + GF.X] = a[o + F.X]; out[g + GF.Y] = a[o + F.Y]; out[g + GF.Z] = a[o + F.Z]; out[g + GF.T0] = a[o + F.T0] - tBase; out[g + GF.TYPE] = a[o + F.TYPE]; out[g + GF.SEED] = (a[o + F.SEED] >>> 0) & 0xffffff;
  out[g + GF.MASS] = a[o + F.MASS]; out[g + GF.SIG] = a[o + F.SIG]; out[g + GF.VX] = a[o + F.VX]; out[g + GF.VY] = a[o + F.VY]; out[g + GF.VZ] = a[o + F.VZ];
  out[g + GF.TAUD] = a[o + F.TAUD]; out[g + GF.VB] = a[o + F.VB]; out[g + GF.TAUB] = a[o + F.TAUB]; out[g + GF.TAUDIS] = Math.min(a[o + F.TAUDIS], 1e7); out[g + GF.K] = a[o + F.K]; out[g + GF.BETA] = a[o + F.BETA]; out[g + GF.VR] = a[o + F.VR];
  out[g + GF.SETTLE] = a[o + F.SETTLE]; out[g + GF.G] = a[o + F.G]; out[g + GF.N] = n; out[g + GF.A1] = a[o + F.A1]; out[g + GF.A2] = a[o + F.A2]; out[g + GF.FLAGS] = flags;
}
export function packFlame(f, out, slot, tBase, n, t) {
  const g = slot * GSTRIDE; out.fill(0, g, g + GSTRIDE);
  out[g + GF.X] = f.x; out[g + GF.Y] = f.y; out[g + GF.Z] = f.z; out[g + GF.T0] = 0; out[g + GF.TYPE] = GPU_TYPE_FLAME; out[g + GF.SEED] = (f.seed >>> 0) & 0xffffff; out[g + GF.MASS] = f.flame; out[g + GF.SIG] = f.radius;
  out[g + GF.A1] = f.height; out[g + GF.A2] = f.smoke; out[g + GF.N] = n; out[g + GF.G] = f.y; out[g + GF.FLAGS] = f.uncertain ? 1 : 0; out[g + GF.TAUDIS] = 1e7; out[g + GF.TAUD] = 1; out[g + GF.TAUB] = 1; out[g + GF.VR] = 1;
}
// cumulative sprite counts (prefix sums) so the vertex shader finds the event of sprite s by binary search; cum[k] = sprites of events 0..k-1
export function cumulative(out, nEvents, cum) { let s = 0; cum[0] = 0; for (let k = 0; k < nEvents; k++) { s += out[k * GSTRIDE + GF.N]; cum[k + 1] = s; } return s; }
// the CPU twin of that binary search (tested against a linear scan)
export function eventOfSprite(cum, nEvents, s) { let lo = 0, hi = nEvents - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (cum[m] <= s) lo = m; else hi = m - 1; } return lo; }

// Uniform block of WGSL_COMPUTE `Cam` (224 bytes): 6 vec4 (pos, fwd, tanHW, bands, factors0, factors1), then pxScale f32, minPx f32, cap u32, nev u32, split u32, 3 pad u32, classScale 2 vec4, nfull 4 vec4.
// Class order = params.budget.class_priority = [flash, burst, gun, fire, musket, dust, fog]; nfull is indexed by event type id (0..15).
export function gpuCamBuffer(P, cam, cap, nev, split, classScale) {
  const buf = new ArrayBuffer(224), f = new Float32Array(buf), u = new Uint32Array(buf), tanH = Math.tan(cam.fovY / 2), b = P.lod.bands_m, bf = P.lod.band_factor;
  f.set([cam.pos[0], cam.pos[1], cam.pos[2], 0, cam.fwd[0], cam.fwd[1], cam.fwd[2], 0, tanH, tanH * (cam.aspect || 1), 0, 0, b[0], b[1], b[2], b[3], bf[0], bf[1], bf[2], bf[3], bf[4], 0, 0, 0], 0);
  f[24] = cam.heightPx / (2 * tanH); f[25] = P.lod.min_pixels; u[26] = cap; u[27] = nev; u[28] = split;
  for (let k = 0; k < 8; k++) f[32 + k] = classScale[k] ?? 1;
  const nf = P.lod.n_full, tab = [0, nf.musket, nf.gun, nf.ring, nf.fog, nf.burst, nf.burst, nf.canister, nf.earth, nf.dust, nf.dust, 1, nf.fuse, nf.plume, nf.ember, nf.flame];
  for (let k = 0; k < 16; k++) f[40 + k] = tab[k];
  return buf;
}
