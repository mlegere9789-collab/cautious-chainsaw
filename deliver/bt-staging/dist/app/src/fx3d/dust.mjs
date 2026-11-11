// Road dust from marching columns, horses and wagon trains. Dust exists only on dry ground: the rate is the footfall rate times a yield per footfall, times the surface factor, times the
// dustiness of the ground (1 when dry, 0 once the wetness reaches params.dust.wetness_dust_free or while it rains). The PDF has no dust accounts ("dust inferred"): tier inferred / plausible-procedural.
// Spawn is on a fixed tick grid (multiples of puff_interval_s) so the same time range always gives the same puffs, whatever the frame rate; mass is independent of the segmentation (LOD).
import { F, T, rec } from './store.mjs';
import { u01, clamp, strHash } from './core.mjs';

export function dustiness(P, wetnessV, precip) { if (precip && precip.intensity > 0) return 0; return clamp(1 - wetnessV / P.dust.wetness_dust_free, 0, 1); }
export const surfaceFactor = (P, s) => (s === 'macadam' || s === 'macadamized' ? P.dust.surface_factor.macadam : s === 'dirt' || s === 'earth' || s === 'unpaved' ? P.dust.surface_factor.dirt : P.dust.surface_factor.unknown);

// kg of visible dust per second per metre of column
export function dustRatePerMetre(P, col) {
  if (col.kind === 'horse') return col.count / col.length * (col.stepsPerMin || P.dust.horse_strikes_per_min) / 60 * P.dust.kg_per_hoof_strike;
  if (col.kind === 'wagon') return col.count * P.dust.wheels_per_vehicle * (col.speedMs || P.dust.wagon_speed_ms_default) * P.dust.kg_per_wheel_m / col.length;     // vehicles x wheels x speed x kg per wheel-metre / column length
  return col.men / col.length * (col.stepsPerMin || P.dust.steps_per_min_default) / 60 * P.dust.kg_per_man_step;
}

// Emit the dust puffs of a column for the ticks in (t0, t1]. col: { id, kind: 'foot'|'horse'|'wagon', head: [x, y, z] (y = ground), dir: [dx, dz] unit horizontal march direction, length, men|count, stepsPerMin?, speedMs?, surface }
// Returns the emitted mass (kg). camDist sets the segment length (LOD): the same mass leaves in fewer, wider puffs when the column is far.
export function marchDust({ P, env, t0, t1, col, camDist = 0, sink, seed = 1863, ground }) {
  const D = dustiness(P, env.wetness.v, env.precip) * surfaceFactor(P, col.surface); if (D <= 0) return 0;
  const dt = P.dust.puff_interval_s, k0 = Math.floor(t0 / dt) + 1, k1 = Math.floor(t1 / dt); let total = 0;
  const seg = clamp(camDist / 40, P.dust.puff_spacing_m, 64), n = Math.max(1, Math.min(64, Math.ceil(col.length / seg))), L = col.length / n, rate = dustRatePerMetre(P, col) * D;
  const idh = strHash(String(col.id)), damp = env.damp.v;
  for (let k = k0; k <= k1; k++) {
    const tk = k * dt;
    for (let s = 0; s < n; s++) {
      const m = rate * L * dt; if (m <= 0) continue;
      const u = a => u01(seed ^ idh, k, s, a), along = (s + 0.5) * L + (u(1) - 0.5) * L, lat = (u(2) - 0.5) * 3, ux = col.dir[0], uz = col.dir[1];
      const x = col.head[0] - ux * along - uz * lat, z = col.head[2] - uz * along + ux * lat, g = ground ? ground(x, z) : col.head[1];
      sink(rec({ X: x, Y: g + 0.3, Z: z, T0: tk, TYPE: T.DUST, SEED: (seed ^ idh ^ Math.imul(k, 2654435761) ^ s) >>> 0, MASS: m, SIG: Math.max(P.dust.sigma0_m, L * 0.25), VY: P.dust.kick_up_ms * (0.7 + 0.6 * u(3)), TAUD: 0.8, VB: 0, TAUB: 1, TAUDIS: P.dust.dissipation_tau_s * (1 - 0.4 * damp), K: P.smoke.diffusion.K_h_m2s * 3, BETA: P.smoke.diffusion.beta_h_m2s3, VR: 0.4, SETTLE: P.dust.settle_ms, G: g, LIFE: 90, A1: col.kind === 'horse' ? 1 : col.kind === 'wagon' ? 2 : 0, CAUSE: (idh ^ k) >>> 0 }));
      total += m;
    }
  }
  return total;
}
