// Level of detail, particle budget and cost model for the effect layer. The soldiers are NEVER touched by any of this: only the number of sprites drawn per effect event scales,
// every event keeps its mass (it stays in the fog map and the sight-line queries), and the UI is told the share drawn (uiStatement). Rules from render/PLAN.md G1 path 5 and G12.
import { F, STRIDE, T, CLASS_OF } from './store.mjs';
import { SPRITE_K, clamp } from './core.mjs';

export const SOLDIERS_SCALED = false;      // constant by design; the test asserts no budget path mentions soldiers

// ---- cost model: milliseconds of GPU time for n sprites. ns per sprite from the measured prototype (13 ns pass time, 22 ns by ablation, Intel Arc, 1080p, 55 percent opacity), x tier cost factor.
export function costMs(P, nSprites, tierName = 'desktop', worstCase = true) {
  const t = P.budget.tiers[tierName], ns = worstCase ? P.budget.ns_per_particle_arc_ablation : P.budget.ns_per_particle_arc;
  return nSprites * ns * t.cost_factor / 1e6;
}
export function tierBudget(P, tierName = 'desktop') {
  const t = P.budget.tiers[tierName]; if (!t) throw new Error('unknown tier ' + tierName);
  const cap = Math.floor(t.ms * 1e6 / (P.budget.ns_per_particle_arc_ablation * t.cost_factor));
  return { tier: tierName, ms: t.ms, cap, maxEvents: t.max_events, lights: t.lights, costFactor: t.cost_factor };
}

// ---- LOD: sprites an event gets from its distance. dist in metres from the camera; px is the projected radius in pixels.
const NKEY = { [T.MUSKET]: 'musket', [T.GUN]: 'gun', [T.RING]: 'ring', [T.FOG]: 'fog', [T.CASE]: 'burst', [T.SHELL]: 'burst', [T.CANISTER]: 'canister', [T.EARTH]: 'earth', [T.RICOCHET]: 'dust', [T.DUST]: 'dust', [T.PLUME]: 'plume', [T.FLASH]: null, [T.FUSE]: 'fuse', [T.EMBER]: 'ember' };
export function bandOf(P, dist) { const b = P.lod.bands_m; let i = 0; while (i < b.length && dist >= b[i]) i++; return i; }
export function spritesFor(P, type, dist, radiusM, cam) {
  if (type === T.FLASH) return 1;
  const key = NKEY[type]; const nFull = P.lod.n_full[key]; if (!nFull) return 0;
  const n = Math.max(1, Math.round(nFull * P.lod.band_factor[bandOf(P, dist)]));
  const px = cam && cam.heightPx ? radiusM / Math.max(dist, 0.5) * cam.heightPx / (2 * Math.tan(cam.fovY / 2)) : 1e9;
  if (px < P.lod.min_pixels && type !== T.FOG) return 0;
  return n;
}

// ---- allocation under a cap. demand: { class: sprites wanted }. Returns { granted, scale, total, share }. Priority order and floors from params (class_priority, class_floor).
export function allocate(P, cap, demand) {
  const order = P.budget.class_priority, floor = P.budget.class_floor, granted = {}, scale = {}; let tot = 0, want = 0, R = cap;
  for (const c of order) want += demand[c] || 0;
  if (want <= cap) { for (const c of order) { granted[c] = demand[c] || 0; scale[c] = 1; } return { granted, scale, total: want, want, share: want ? 1 : 1, capped: false, cap }; }
  for (const c of order) { const d = demand[c] || 0, f = Math.min(d, Math.floor(floor * cap)); granted[c] = f; R -= f; }
  for (const c of order) { const d = demand[c] || 0, ex = Math.min(d - granted[c], R); granted[c] += ex; R -= ex; }
  for (const c of order) { const d = demand[c] || 0; scale[c] = d ? granted[c] / d : 1; tot += granted[c]; }
  return { granted, scale, total: tot, want, share: tot / want, capped: true, cap };
}

// Frame-time governor (AIMD on the effect scale): moves the share of sprites, never the content. Input: measured GPU or frame cost of the effect pass in ms (or the model's), output scale in [floor, 1].
export class Governor {
  constructor(P, targetMs) { this.g = P.budget.governor; this.target = targetMs; this.scale = 1; }
  update(effectMs) { const g = this.g; if (effectMs > this.target) this.scale = Math.max(g.floor, this.scale * g.down); else if (effectMs < this.target * g.target_ratio) this.scale = Math.min(1, this.scale + g.up); return this.scale; }
}

// The sentence the UI shows when effects are scaled. Soldiers are always stated as unreduced.
export function uiStatement(r, tierName, soldiers) {
  if (!r.capped) return `Smoke, flash and dust effects: full detail (${r.total.toLocaleString('en-US')} sprites, tier ${tierName}). ${soldiers != null ? `Soldiers: all ${soldiers.toLocaleString('en-US')} drawn.` : 'Soldiers are not reduced.'}`;
  const pct = Math.round(100 * r.share);
  return `Smoke, flash and dust effects are drawn at ${pct} percent of full density on this device (${r.total.toLocaleString('en-US')} of ${r.want.toLocaleString('en-US')} sprites, tier ${tierName}). Every shot still counts: the battle fog and sight lines keep the full smoke. Soldiers are not reduced.`;
}
export { SPRITE_K, clamp, STRIDE, F, CLASS_OF };
