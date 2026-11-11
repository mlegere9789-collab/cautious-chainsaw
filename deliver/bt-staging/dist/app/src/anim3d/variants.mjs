// Variants of the crowd states (plan G-ANIM-23 / G9: about six variants per state, seeded by the manifest scalar, so that a line of men does not move in unison).
// A variant is the SAME clip (same duration, same loop, same foot plan, same shot instant, so the state machine, the blends, the fire plan and the foot planting need no change) with a small, deterministic modulation of the parts of the body that
// no drill rule fixes: the lean and twist of the trunk, the head (turn, nod, and a slow scan), the free arm's swing, the cant and height of a carried piece. The stride, the cadence, the manual-of-arms positions and the times are NOT touched:
// they are the documented values (drill-tables.mjs). Variant 0 is the clip as authored.
// Ranges (VARIANT_RANGES) are plausible-procedural (G-ANIM-23): the manuals print no tolerance on how upright, how still or how steadily a man carries the piece; the only documented limit is the one the code keeps, the step in a
// drilled march (all men in step, left foot first), so the legs of common time and quick time are never varied. Every number comes from the integer hash of (clip id, variant) - no Math.random, no clock.
import { hash4, strId } from '../../../sim/rng.mjs';
export const VARIANTS = 6;
export const VARIANT_RANGES = {
  lean: [-1.6, 1.6],          // degrees, trunk pitch added to the clip's (spE x)
  twist: [-3.0, 3.0],         // degrees, trunk yaw (spE y)
  headYaw: [-7.0, 7.0],       // degrees, head turned to one side (hdE y)
  headPitch: [-3.0, 3.0],     // degrees, head up / down (hdE x)
  headScanAmp: [1.5, 7.0],    // degrees, amplitude of the slow scan of the head
  headScanCycles: [1, 3],     // whole scan cycles per clip duration (so a loop closes)
  armAmp: [0.0, 0.03],       // metres, extra swing of the free left hand along the walking direction (gaits not in drill step: arms at will, route step, double quick, run)
  armBias: [-0.03, 0.03],     // metres, free left hand forward / back
  rifleCant: [-2.5, 2.5],     // degrees, carried piece tilted sideways (ra z)
  rifleDx: [-0.012, 0.012], rifleDy: [-0.015, 0.015],   // metres, carried piece moved
  twistScale: [0.0, 0.6],   // factor on the clip's own trunk twist at the step frequency (the shoulders of a marching man turn less or more than the model's)
  armScale: [0.0, 0.7],       // factor on the clip's own swing of the free hand
  twistAmp: [2.0, 5.0],       // degrees, extra trunk twist at the step frequency with a phase of its own (the shoulders do not all turn with the same foot)
  rifleSway: [0.4, 1.4],      // degrees, the carried piece sways at the step frequency with a phase of its own
  limbBias: [-0.04, 0.04],    // metres, free hands moved sideways (activities, lying)
};
const U = 4294967296;
const pick = (seed, a, b, s, r) => r[0] + (r[1] - r[0]) * (hash4(seed, a, b, s) / U);
// the parameter set of variant `idx` of clip `baseId` (idx 0: none)
export function variantParams(baseId, idx) {
  if (!idx) return null; const sid = strId(baseId) >>> 0, R = VARIANT_RANGES, P = { idx };
  P.lean = pick(sid, idx, 1, 31, R.lean); P.twist = pick(sid, idx, 2, 31, R.twist); P.headYaw = pick(sid, idx, 3, 31, R.headYaw); P.headPitch = pick(sid, idx, 4, 31, R.headPitch);
  P.headAmp = pick(sid, idx, 5, 31, R.headScanAmp); P.headCycles = Math.round(pick(sid, idx, 6, 31, R.headScanCycles)); P.headPh = hash4(sid, idx, 7, 31) / U; P.headPh2 = hash4(sid, idx, 8, 31) / U;
  P.armAmp = pick(sid, idx, 9, 31, R.armAmp); P.armPh = hash4(sid, idx, 10, 31) / U; P.armBias = pick(sid, idx, 11, 31, R.armBias);
  P.cant = pick(sid, idx, 12, 31, R.rifleCant); P.dx = pick(sid, idx, 13, 31, R.rifleDx); P.dy = pick(sid, idx, 14, 31, R.rifleDy); P.limb = pick(sid, idx, 15, 31, R.limbBias); P.twistAmp = pick(sid, idx, 16, 31, R.twistAmp); P.twistScale = pick(sid, idx, 20, 31, R.twistScale); P.armScale = pick(sid, idx, 21, 31, R.armScale); P.twistPh = hash4(sid, idx, 17, 31) / U; P.sway = pick(sid, idx, 18, 31, R.rifleSway); P.swayPh = hash4(sid, idx, 19, 31) / U;
  return P;
}
// which clips have variants, and of what kind: the states a crowd is in for many minutes
const GAIT_FREE_ARM = /^march_(route_step|double_quick|double_quick_urgent|run|quick_time_(atwill|trail|rss))/;
export function variantKind(id, def) {
  const f = def.family; if (def.rig === 'horse' || def.rig === 'gun') return null;
  if (f === 'stand') return 'stand';
  if (f === 'locomotion') { if (/^march_(color|carry|run_lookback)/.test(id) || /backward/.test(id) || def.meta.litterRole || !def.loop) return null; return /^march_(common_time|quick_time)_(shoulder|order)$/.test(id) ? 'drill_gait' : 'gait'; }
  if (f === 'musketry') return 'fire';
  if (f === 'activity' && ['sit_fire', 'stand_picket', 'cook_stir', 'eat_hardtack', 'sleep_side', 'dig_shovel', 'chop_axe', 'lay_stone'].includes(id)) return 'activity';
  if (f === 'lie') return 'lie';
  return null;
}
// apply the variant to a Spec at clip time t of a clip of duration dur (spec is the base clip's output; channels read/written through Spec.get/set)
export function applyVariant(spec, t, dur, P, kind) {
  const TWO_PI = 2 * Math.PI, g = (n, i) => spec.get(n, i), k = kind === 'fire' ? 0.4 : 1;      // the firing cycle keeps the sight line: a third of the modulation
  if (kind !== 'lie') {      // a lying man's head and trunk are at the limits of the rig already: only his hands vary
  spec.set('spE', g('spE', 0) + k * P.lean, g('spE', 1) + k * P.twist, g('spE', 2));
  const w = TWO_PI * (P.headCycles * t / dur + P.headPh), w2 = TWO_PI * (P.headCycles * t / dur * 2 + P.headPh2);   // integer multiples of 1 / dur: the loop closes
  if (kind !== 'activity') spec.set('hdE', g('hdE', 0) + k * (P.headPitch + 0.4 * P.headAmp * Math.sin(w2)), g('hdE', 1) + k * (P.headYaw + P.headAmp * Math.sin(w)), g('hdE', 2)); }
  if (kind === 'gait' || kind === 'drill_gait') { const z0 = 0.02;      // the left hand hangs at z = 0.02 (poses.attention); its swing and the trunk's twist are scaled, then a component with a phase of its own is added
    spec.set('spE', g('spE', 0), P.twistScale * (g('spE', 1) - 0) + P.twistAmp * Math.sin(TWO_PI * (t / dur + P.twistPh)), g('spE', 2)); spec.set('lhp', g('lhp', 0), g('lhp', 1), z0 + P.armScale * (g('lhp', 2) - z0) + P.armBias * (kind === 'gait' ? 1 : 0.5) + P.armAmp * Math.sin(TWO_PI * (t / dur + P.armPh))); }
  if (kind === 'stand' || kind === 'drill_gait' || kind === 'gait') { if (g('rhwa', 0) > 0.5 && g('rfr', 0) < 0.5) { spec.set('rp', g('rp', 0) + P.dx, g('rp', 1) + P.dy, g('rp', 2)); spec.set('ra', g('ra', 0) + (kind === 'stand' ? 0 : P.sway * Math.sin(TWO_PI * (t / dur + P.swayPh))), g('ra', 1), g('ra', 2) + P.cant); } }
  if (kind === 'lie' || kind === 'activity') { spec.set('lhp', g('lhp', 0) + P.limb, g('lhp', 1), g('lhp', 2)); spec.set('rhp', g('rhp', 0) - P.limb, g('rhp', 1), g('rhp', 2)); }
  return spec;
}
export function variantDef(base, idx, kind) {
  const P = variantParams(base.id, idx), ev = base.eval;
  return { ...base, id: base.id + '~v' + idx, eval: (t, spec) => { ev(t, spec); return applyVariant(spec, t, base.dur, P, kind); }, meta: { ...base.meta, variantOf: base.id, variant: idx, variantKind: kind, variantParams: P, label: (base.meta.label || base.id) + ' (variant ' + idx + ' of ' + VARIANTS + ')' } };
}
