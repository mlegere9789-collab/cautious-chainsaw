// The deterministic CPU spawn model: a shot, burst, impact or march tick becomes effect events (store.mjs records). A pure function of (params, weapon data, the cause, the air at the cause time):
// the same cause gives bit-identical records on every machine and every replay. Every event's T0 is >= the time of its cause.
import { F, T, rec } from './store.mjs';
import { u01, g3, clamp, lerp, strHash, FX_SEED } from './core.mjs';

export const PROJ_NAMES = ['ball', 'buck_and_ball', 'blank', 'solid', 'shell', 'case', 'canister', 'double_canister'];   // FIRE_EVENT proj codes 0..7
const cbrt = Math.cbrt;

export function resolveWeapon(data, kind) {
  const W = data.weapons.weapons, A = data.weapons.aliases;
  let id = null;
  if (typeof kind === 'number') id = A.audio_ids[kind] || null;
  else if (typeof kind === 'string') id = W[kind] ? kind : (A.classes[kind] || A.classes[kind.toLowerCase()] || null);
  if (id && W[id]) return { id, w: W[id], known: true };
  return { id: 'm1861_springfield', w: W.m1861_springfield, known: false, requested: kind };           // unknown weapon: the documented 60-grain rifle-musket, counted and flagged
}
export const isGunClass = c => c === 'field_gun' || c === 'howitzer';
export const ROUND_TO_PROJ = { ball: 'ball', buck_and_ball: 'buck_and_ball', blank: 'ball', shot: 'solid', shell: 'shell', case: 'case', canister: 'canister', double_canister: 'double_canister', unknown: 'solid' };   // BT-EVENTS info.round -> FX projectile
export const projCode = p => (typeof p === 'number' ? PROJ_NAMES[p] || 'ball' : (p || null));
const PROJ_ALIAS = { solid_shot: 'solid', common_shell: 'shell', spherical_case: 'case', double_canister: 'canister', ball_or_minie: 'ball' };

export function chargeKg(w, proj) { const p = PROJ_ALIAS[proj] || proj; return (w.charge_by_proj && w.charge_by_proj[p] && w.charge_by_proj[p].kg) || w.charge.kg; }

// diffusion, buoyancy and dissipation of smoke from the air at the cause time
export function airFor(P, env) {
  const damp = env ? env.damp.v : 0.25, ws = env ? env.windSpeed : P.smoke.dissipation_tau_s.ref_wind_ms, S = P.smoke;
  const calm = 1 - clamp(ws / S.dissipation_tau_s.ref_wind_ms, 0, 1);
  return {
    K: S.diffusion.K_h_m2s, beta: S.diffusion.beta_h_m2s3, vr: lerp(S.diffusion.vertical_ratio_open, S.diffusion.vertical_ratio_damp, damp),
    tauDis: lerp(S.dissipation_tau_s.breeze, S.dissipation_tau_s.calm, calm), buoy: lerp(S.buoyancy_scale.dry, S.buoyancy_scale.damp, damp),
  };
}

// smoke life: until the column optical depth through the centre falls below 1/10 of the visible threshold, or 300 s
function smokeLife(P, mass0, sigma0, K, beta, tauDis, kappa = P.smoke.kappa_m2_per_kg) {
  const thr = P.smoke.visible_od * 0.1; let lo = 0, hi = 300;
  const od = tt => kappa * mass0 * Math.exp(-tt / tauDis) / (2 * Math.PI * (sigma0 * sigma0 + 2 * K * tt + beta * tt * tt * tt));
  if (od(hi) >= thr) return hi; if (od(0) < thr) return 1;
  for (let i = 0; i < 40; i++) { const m = 0.5 * (lo + hi); if (od(m) >= thr) lo = m; else hi = m; } return Math.max(1, hi);
}

export class Emitter {
  constructor(data, sink, { seed = FX_SEED } = {}) { this.d = data; this.P = data.params; this.sink = sink; this.seed = seed; this.stats = { shots: 0, misfires: 0, unknownWeapon: 0, rejectedBursts: 0, orphanBursts: 0, byType: {} }; this.causes = new Map(); }
  _push(r) { this.sink(r); const n = r[F.TYPE]; this.stats.byType[n] = (this.stats.byType[n] || 0) + 1; }
  shotSeed(unitId, figureIdx, t, wid) { return (strHash(String(unitId)) ^ Math.imul(figureIdx + 1, 0x9e3779b1) ^ Math.imul(Math.floor(t * 100) + 1, 0x85ebca6b) ^ Math.imul(wid + 1, 0xc2b2ae35) ^ this.seed) >>> 0; }

  // ---- a weapon fired. d = unit direction vector (x east, y up, z south). extra: { proj, misfire, shotId, elev, fuzeS, v0 }
  fire({ unitId, figureIdx = 0, t, weapon, pos, dir, extra = {}, env, ground = pos[1], mode = 'near' }) {
    const P = this.P, rw = resolveWeapon(this.d, weapon), w = rw.w; if (!rw.known) this.stats.unknownWeapon++;
    const cls = P.classes[w.class], gun = isGunClass(w.class); const proj0 = ROUND_TO_PROJ[extra.round] || projCode(extra.proj) || (gun ? 'solid' : 'ball'); let proj = PROJ_ALIAS[proj0] || proj0;
    const seed = this.shotSeed(unitId, figureIdx, t, strHash(rw.id) & 0xffff), u = k => u01(seed, k, 0, 5), air = airFor(P, env);
    const cause = extra.shotId != null ? extra.shotId >>> 0 : seed; this.stats.shots++; this.causes.set(cause, t); if (this.causes.size > 8192) this.causes.delete(this.causes.keys().next().value);
    const ck = chargeKg(w, proj), m = P.smoke.yield_frac * ck, [dx, dy, dz] = dir, L = Math.hypot(dx, dy, dz) || 1, ux = dx / L, uy = dy / L, uz = dz / L;
    const misfire = !!extra.misfire; if (misfire) this.stats.misfires++;
    const lead = (cls.flash.cap_flash_lead_ms[0] + (cls.flash.cap_flash_lead_ms[1] - cls.flash.cap_flash_lead_ms[0]) * u(1)) / 1000;
    const tm = t + lead;                                                    // charge ignition follows the cap by `lead`; the cap flash is at t, so nothing precedes the cause
    const mx = pos[0] + ux * 0.4, my = pos[1] + uy * 0.4, mz = pos[2] + uz * 0.4;
    const jet = cls.flash.jet_k_m_per_cbrt_kg * cbrt(ck) * (0.8 + 0.4 * u(2)), dur = (cls.flash.dur_ms[0] + (cls.flash.dur_ms[1] - cls.flash.dur_ms[0]) * u(3)) / 1000;
    const out = [];
    // cap flash (percussion arms): a tiny flash at the nipple at t; a misfire shows only this
    if (lead > 0 || misfire) out.push(rec({ X: pos[0], Y: pos[1], Z: pos[2], T0: t, TYPE: T.FLASH, SEED: seed, MASS: cls.flash.peak_radiance * 0.15, SIG: 0.6, VX: ux, VY: uy, VZ: uz, LIFE: 0.12, A1: 0.08, A2: 0.006, CAUSE: cause }));
    if (misfire) { for (const r of out) this._push(r); return out; }
    out.push(rec({ X: mx, Y: my, Z: mz, T0: tm, TYPE: T.FLASH, SEED: seed, MASS: cls.flash.peak_radiance, SIG: cls.flash.radius_light_m * (gun ? cbrt(ck / 1.134) : 1), VX: ux, VY: uy, VZ: uz, LIFE: dur + 0.09, A1: jet, A2: dur, CAUSE: cause }));
    const s0 = cls.smoke.sigma0_k_m_per_cbrt_kg * cbrt(ck), v0 = cls.smoke.v0_ms * (0.8 + 0.4 * u(4));
    const base = { X: mx, Y: my, Z: mz, T0: tm, SEED: seed, MASS: m, SIG: s0, VX: ux * v0, VY: uy * v0, VZ: uz * v0, TAUD: cls.smoke.tau_drag_s, VB: cls.smoke.vb0_ms * air.buoy, TAUB: cls.smoke.tau_b_s, TAUDIS: air.tauDis, K: air.K, BETA: air.beta, VR: air.vr, G: ground, CAUSE: cause };
    if (mode === 'fog') {                                                   // far small-arms shot: the flashes are kept (a distant volley is seen at night); the smoke mass goes to the aggregator
      for (const r of out) this._push(r);
      return { cause, tm, mass: m, sigma0: s0, pos: [mx, my, mz], base, seed, vb0: base.VB, tauDis: air.tauDis, K: air.K, beta: air.beta, vr: air.vr, ground };
    }
    const type = gun ? T.GUN : T.MUSKET;
    // the shot's total smoke stays charge * yield: a gun gives 12 percent of it to the muzzle blast ring, the rest to the cloud
    out.push(rec({ ...base, TYPE: type, MASS: gun ? m * 0.88 : m, LIFE: smokeLife(P, m, s0, air.K, air.beta, air.tauDis) }));
    if (gun) out.push(rec({ ...base, TYPE: T.RING, MASS: m * 0.12, SIG: 0.5, VX: base.VX * 0.5, VY: base.VY * 0.5, VZ: base.VZ * 0.5, A1: cls.smoke.ring_speed_ms, A2: cls.smoke.ring_tau_s, LIFE: 8, TAUDIS: air.tauDis * 0.5 }));   // vortex ring in the plane normal to the barrel
    // timed-fuze shell or spherical case: a burning fuze trail along the flight, drawn when dark enough (T2-203, plausible-procedural)
    const timed = proj === 'case' || (proj === 'shell' && (extra.fuze === 'time' || (!w.rifled && extra.fuze !== 'percussion')));   // rifled shell with no fuze stated: no trail (percussion fuzes burn nothing)
    if (timed && env && env.darkness >= P.projectile.fuze_trail_min_dark) {
      const fz = Math.min(extra.fuzeS != null ? extra.fuzeS : 3, P.projectile.fuze_max_s), v = (extra.v0 || (w.mv_ft_s > 0 ? w.mv_ft_s * 0.3048 : 300));
      out.push(rec({ X: mx, Y: my, Z: mz, T0: tm, TYPE: T.FUSE, SEED: seed, MASS: 0, SIG: 0.15, VX: ux * v, VY: uy * v, VZ: uz * v, LIFE: fz + 0.5, A1: fz, A2: P.projectile.fuze_sparks_trail_ms / 1000, CAUSE: cause }));
    }
    // canister: a fan of dust and debris downrange where the balls strike (arrival = range / ball speed after the shot)
    if (proj === 'canister' && !extra.impactsProvided) {
      const R = P.projectile.canister_dust_range_m, wet = env ? env.wetness.v : 0, rr = lerp(R[0], R[1], u(5)), vball = 400, ta = tm + rr / vball;
      const fx = mx + ux * rr, fz = mz + uz * rr;
      out.push(rec({ X: fx, Y: ground, Z: fz, T0: ta, TYPE: T.CANISTER, SEED: seed, MASS: 0.03 * (1 - 0.7 * wet) * (proj0 === 'double_canister' ? 2 : 1), SIG: 3 + rr * Math.tan(P.projectile.canister_cone_deg * Math.PI / 180) * 0.35, VX: ux * 4, VY: 1.5, VZ: uz * 4, TAUD: 0.6, VB: 0.4, TAUB: 1.5, TAUDIS: P.dust.dissipation_tau_s, K: P.smoke.diffusion.K_h_m2s, BETA: P.smoke.diffusion.beta_h_m2s3, VR: 0.4, G: ground, LIFE: 25, A1: rr, A2: P.projectile.canister_cone_deg, CAUSE: cause }));
    }
    for (const r of out) this._push(r);
    return out;
  }

  // ---- shell burst (case or common shell, in the air) or ground impact (solid shot, grounded shell) or ricochet, caused by shot `fireId` (a cause time must exist and be <= t)
  burst({ t, kind, pos, dir = [0, 0, 1], fireId, weapon, env, ground = 0, extra = {} }) {
    const P = this.P; let orphan = false;
    if (fireId != null) { const tc = this.causes.get(fireId >>> 0); if (tc == null) orphan = true; else if (t < tc) { this.stats.rejectedBursts++; return null; } } else orphan = true;
    if (orphan) this.stats.orphanBursts++;
    const rw = resolveWeapon(this.d, weapon || 'napoleon_12pdr_m1857'), w = rw.w, seed = this.shotSeed('burst:' + kind, (fireId || 0) >>> 0, t, strHash(rw.id) & 0xffff), u = k => u01(seed, k, 0, 6), air = airFor(P, env), wet = env ? env.wetness.v : 0;
    const out = [], cause = fireId != null ? fireId >>> 0 : seed;
    const mk = o => rec({ SEED: seed, CAUSE: cause, G: ground, ...o });
    if (kind === 'case' || kind === 'shell') {
      const oz = kind === 'case' ? P.projectile.case_burst_charge_oz : P.projectile.shell_burst_charge_oz, m = oz * P.physical.oz_kg * P.smoke.yield_frac;
      const fl = P.projectile.burst_flash_ms;
      out.push(mk({ X: pos[0], Y: pos[1], Z: pos[2], T0: t, TYPE: kind === 'case' ? T.CASE : T.SHELL, MASS: m, SIG: P.projectile.burst_sigma0_m, VB: 0.6 * air.buoy, TAUB: 2, TAUD: 0.4, TAUDIS: air.tauDis, K: air.K, BETA: air.beta, VR: air.vr, LIFE: smokeLife(P, m, P.projectile.burst_sigma0_m, air.K, air.beta, air.tauDis), A1: kind === 'case' ? (extra.balls || 78) : 0, A2: 0 }));
      out.push(mk({ X: pos[0], Y: pos[1], Z: pos[2], T0: t, TYPE: T.FLASH, MASS: 40, SIG: 12, LIFE: 0.2, A1: 1.5, A2: (fl[0] + (fl[1] - fl[0]) * u(1)) / 1000 }));
    } else if (kind === 'solid' || kind === 'impact' || kind === 'ricochet') {
      const v = extra.speed || (w.mv_ft_s > 0 ? w.mv_ft_s * 0.3048 * 0.8 : 300), mass = (extra.projectile_lb || w.projectile_lb || 12) * P.physical.lb_kg, E = 0.5 * mass * v * v / 1000;     // kJ
      const dust = P.projectile.impact_dust_kg_per_kj * E * Math.max(0, 1 - wet), sg = 1.2 * cbrt(E / 100), th = P.projectile.impact_throw_speed_ms, vth = lerp(th[0], th[1], u(2));
      const stops = wet >= P.projectile.ricochet_wet_stop;
      out.push(mk({ X: pos[0], Y: ground, Z: pos[2], T0: t, TYPE: kind === 'ricochet' ? T.RICOCHET : T.EARTH, MASS: dust, SIG: kind === 'ricochet' ? sg * 0.5 : sg, VY: vth * (kind === 'ricochet' ? 0.3 : 0.6), TAUD: 0.5, VB: 0.5, TAUB: 2, TAUDIS: P.dust.dissipation_tau_s, K: P.smoke.diffusion.K_h_m2s * 2, BETA: P.smoke.diffusion.beta_h_m2s3, VR: 0.5, LIFE: 25, A1: vth, A2: wet, SETTLE: P.dust.settle_ms }));
      if (kind === 'solid' && !stops && extra.ricochet !== false) {                // hops along the line of flight; the host may instead send each bounce itself (then pass extra.ricochet = false)
        const hops = Math.max(0, Math.round(P.projectile.ricochet_hops_dry * (1 - wet))), [dx, , dz] = dir, L = Math.hypot(dx, dz) || 1; let d = 40 + 40 * u(3), x = pos[0], z = pos[2], tt = t;
        for (let h = 0; h < hops; h++) { x += dx / L * d; z += dz / L * d; tt += d / (v * 0.6); d *= P.projectile.ricochet_restitution; out.push(mk({ X: x, Y: ground, Z: z, T0: tt, TYPE: T.RICOCHET, MASS: dust * 0.25, SIG: Math.max(0.6, sg * 0.4), VY: vth * 0.3, TAUD: 0.5, VB: 0.4, TAUB: 1.5, TAUDIS: P.dust.dissipation_tau_s, K: P.smoke.diffusion.K_h_m2s * 2, BETA: P.smoke.diffusion.beta_h_m2s3, VR: 0.5, LIFE: 15, A1: vth * 0.3, A2: wet, SETTLE: P.dust.settle_ms, SEED: (seed + h + 1) >>> 0 })); }
      }
    } else throw new Error('unknown burst kind ' + kind);
    for (const r of out) this._push(r);
    return out;
  }
}
