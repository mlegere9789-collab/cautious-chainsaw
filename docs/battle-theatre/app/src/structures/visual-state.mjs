// From a state string of the state schedule (PDF B.8) to the drawn change. Only physical states the schedule prints are drawn; role, occupancy and use states (a hospital, a
// headquarters, a school) change no pixel of the structure and are shown on its card. A physical-sounding state that no rule here names is reported by `unmapped`
// (tests/structures3d.test.mjs fails if a drawn object has one), so nothing is silently left undrawn.
// Buildings and markers: (burn, dmg) in 0..1.  Fences and walls: (down, gone): the share of panels fallen / removed.
const B = [
  [/^burned$/i, { burn: 1, dmg: 0.3 }],
  [/^burned \d{4}|torn down/i, { burn: 0, dmg: 0, later: true }],             // 1895, 1910, 1882: after the battle window, never scheduled inside it
  [/ruins/i, { burn: 0, dmg: 1 }],
  [/shell hits|shell hole|bullet strikes|shot holes|bullet holes|scarred|punctured/i, { burn: 0, dmg: 0.55 }],
  [/^moderate damage$/i, { burn: 0, dmg: 0.4 }],
  [/loopholes/i, { burn: 0, dmg: 0.15 }],
];
const F = [
  [/^(intact|standing|fenced|orderly)\b|^used as cover|^\(not printed/i, { down: 0, gone: 0 }],
  [/heavily hit/i, { down: 0.12, gone: 0 }],
  [/splintered|breached/i, { down: 0.5, gone: 0.05 }],
  [/nearly destroyed/i, { down: 0.3, gone: 0.6 }],
  [/partly dismantled/i, { down: 0.2, gone: 0.2 }],
  [/dismantled|felled|knocked down/i, { down: 0.3, gone: 0.65 }],
  [/^destroyed|all fences missing|missing|all rails burned|burned/i, { down: 0, gone: 1 }],
];
const PHYSICAL = /burn|destroy|damage|hit|hole|shell|ruin|knocked|felled|dismantl|missing|splinter|breach|strike|scar|punctur|loophole|toppled|trampl/i;
export function classify(kind, text) {
  const list = kind === 'fence' ? F : B, zero = kind === 'fence' ? { down: 0, gone: 0 } : { burn: 0, dmg: 0 };
  if (text == null) return { ...zero, rule: 'none' };
  for (const [rx, v] of list) if (rx.test(text)) return { ...zero, ...v, rule: String(rx) };
  return { ...zero, rule: PHYSICAL.test(text) ? 'unmapped' : 'role', unmapped: PHYSICAL.test(text) };
}
export const unmapped = (kind, text) => classify(kind, text).unmapped === true;
// the A / B / mix triple the shader reads, from a state_at result: A = the state before, B = the state after, mix = how much of the picture shows B.
//   after / before / no rows -> A = B, mix 0;  transitioning (a clock window) -> mix = progress;  indeterminate within a date window -> mix 0.5 and `uncertain` (a screen-door of the two)
export function visualOf(kind, res) {
  const a = (s) => classify(kind, s), pair = (v) => (kind === 'fence' ? [v.down, v.gone] : [v.burn, v.dmg]);
  if (!res || res.present === false) return { vis: 0, A: [0, 0], B: [0, 0], mix: 0, uncertain: false, text: res ? res.state : null, from: null, to: null };
  if (res.status === 'transitioning') { const A = a(res.from_state), Bv = a(res.to_state); return { vis: 1, A: pair(A), B: pair(Bv), mix: Math.max(0, Math.min(1, res.progress)), uncertain: false, text: res.state, from: res.from_state, to: res.to_state }; }
  if (res.status === 'indeterminate_date_only') { const A = a(res.from_state), Bv = a(res.to_state); return { vis: 1, A: pair(A), B: pair(Bv), mix: 0.5, uncertain: true, text: res.state, from: res.from_state, to: res.to_state }; }
  const v = a(res.state); return { vis: 1, A: pair(v), B: pair(v), mix: 0, uncertain: false, text: res.state, from: null, to: null };
}
