// Lights of the effect layer: muzzle flashes, burst flashes and fires, handed to the shaders (soldiers, terrain, smoke) as a short list of the nearest, brightest. Flash light does not cast
// shadows. At night a flash lights the ground and the men within its radius; during the day it is negligible against the sun. The luminance floor of the environment layer (Q10) is
// untouched: lights only add to it.
import { F, STRIDE, T } from './store.mjs';
import { flicker } from './fire.mjs';

export const FLASH_COLOR = [1.0, 0.62, 0.26], FIRE_COLOR = [1.0, 0.42, 0.12], LIGHT_STRIDE = 8;   // x, y, z, radius, intensity, r, g, b

// flash envelope 0..1 at age: full until `dur`, then exponential decay with tau (ms in params.light.flash_decay_tau_ms)
export const flashEnvelope = (P, age, dur) => (age < 0 ? 0 : age <= dur ? 1 : Math.exp(-(age - dur) / (P.light.flash_decay_tau_ms / 1000)));

// pick the K strongest lights at camera `cam` ({pos}) at time t. out: Float32Array(K * LIGHT_STRIDE). Returns the count.
export function collectLights(store, fires, P, t, camPos, K, out) {
  const best = []; // [score, x, y, z, r, I, color]
  const push = (score, x, y, z, r, I, col) => {
    if (best.length < K) { best.push([score, x, y, z, r, I, col]); if (best.length === K) best.sort((a, b) => a[0] - b[0]); return; }
    if (score <= best[0][0]) return; best[0] = [score, x, y, z, r, I, col]; best.sort((a, b) => a[0] - b[0]);
  };
  for (let i = 0; i < store.n; i++) {
    const o = i * STRIDE, a = store.a;
    if (a[o + F.TYPE] !== T.FLASH) continue; const age = t - a[o + F.T0]; if (age < 0) continue;
    const e = flashEnvelope(P, age, a[o + F.A2]); if (e < 0.02) continue;
    const r = a[o + F.SIG], I = e * P.light.flash_light_peak * a[o + F.MASS] / 60, d2 = (a[o + F.X] - camPos[0]) ** 2 + (a[o + F.Y] - camPos[1]) ** 2 + (a[o + F.Z] - camPos[2]) ** 2;
    push(I * r * r / (d2 + r * r), a[o + F.X], a[o + F.Y], a[o + F.Z], r, I, FLASH_COLOR);
  }
  for (const f of fires) {
    if (f.flame <= 0) continue; const r = P.fire.light_radius_m * (f.kind === 'camp' ? 0.1 : f.kind === 'small' || f.kind === 'carcass' ? 0.3 : 1), I = f.flame * flicker(P, f.seed, t), d2 = (f.x - camPos[0]) ** 2 + (f.y - camPos[1]) ** 2 + (f.z - camPos[2]) ** 2;
    push(I * r * r / (d2 + r * r), f.x, f.y + f.height * 0.5, f.z, r, I, FIRE_COLOR);
  }
  best.sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < best.length; k++) { const b = best[k], o = k * LIGHT_STRIDE; out[o] = b[1]; out[o + 1] = b[2]; out[o + 2] = b[3]; out[o + 3] = b[4]; out[o + 4] = b[5]; out[o + 5] = b[6][0]; out[o + 6] = b[6][1]; out[o + 7] = b[6][2]; }
  return best.length;
}
