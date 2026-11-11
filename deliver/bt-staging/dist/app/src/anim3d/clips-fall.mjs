// Being hit, falling (eight seeded styles), lying dead or wounded, crawling, and the two-bearer litter carry.
// The history layer decides WHO falls and WHEN (state events, fate killed / wounded); HOW is a deterministic draw from the figure's variation scalar: plausible-procedural (G-ANIM-10).
// Falls rotate the whole body about the feet through the root bone (rootE / rootT) with the legs following the root (ffr = 1); the end pose of each fall is the first frame of its lying loops, so fall -> lie has no pop.
import { Spec, PROPS } from './figure-pose.mjs';
import { keyFromSpec, keyedDef } from './clipdef.mjs';
import * as POSE from './poses.mjs';
import { gaitDef } from './locomotion.mjs';
import { holdProp } from './authoring.mjs';

const S = f => f(new Spec());
const R = PROPS.rifle;
export const FALL_STYLES = ['back', 'front', 'side_left', 'side_right', 'knee_first', 'spin', 'clutch_wound', 'drop_rifle'];

const withSpec = (base, mod) => { const s = new Spec(); s.v.set(base.v); mod(s); return s; };
// the body lying: root rotation + translation, legs following (ffr = 1)
const lying = (base, kind) => withSpec(base, s => {
  s.set('ffr', 1).set('lcont', 1).set('rcont', 1);
  if (kind === 'back') s.set('rootE', -88, 0, 0).set('rootT', 0, 0.10, 0.80).set('spE', -6, 0, 0).set('hdE', -15, 25, 0).set('fl', 0.13, 0.13, -0.10).set('fr', -0.16, 0.18, -0.02).set('fle', 25, 20, 0).set('fre', 30, -35, 0);
  else if (kind === 'front') s.set('rootE', 88, 0, 0).set('rootT', 0, 0.12, -0.88).set('spE', 6, 0, 0).set('hdE', -17, 22, 0).set('fl', 0.12, 0.09, 0.0).set('fr', -0.14, 0.12, -0.05).set('fle', 40, 15, 0).set('fre', 30, -20, 0);
  else if (kind === 'side_left') s.set('rootE', 15, 0, -88).set('rootT', 0.10, 0.10, 0.0).set('spE', 18, 10, 0).set('hdE', 0, 0, 12).set('fl', 0.10, 0.12, -0.08).set('fr', -0.10, 0.32, 0.18).set('fle', 25, 8, 0).set('fre', 60, -20, 0);
  else if (kind === 'side_right') s.set('rootE', 15, 0, 88).set('rootT', -0.10, 0.10, 0.0).set('spE', 18, -10, 0).set('hdE', 0, 0, -12).set('fl', 0.10, 0.32, 0.18).set('fr', -0.10, 0.12, -0.08).set('fle', 60, 20, 0).set('fre', 25, -8, 0);
  s.set('rhwa', 0).set('lhwa', 0).set('rfr', 0).set('hfr', 1).set('hold', 0);
  const hands = { back: [[-0.50, -0.10, 0.0], [0.40, -0.45, 0.0]], front: [[-0.40, 0.35, 0.10], [0.30, -0.40, 0.05]], side_left: [[-0.15, -0.30, 0.25], [0.25, -0.35, 0.0]], side_right: [[-0.25, -0.35, 0.0], [0.15, -0.30, 0.25]] }[kind];
  s.set('rhp', ...hands[0]).set('lhp', ...hands[1]).set('hfr', 1).set('rp', -0.8, 0.05, 0.4).set('ra', 80, 20, 0).set('rref', 0).set('rfr', 0).set('rep', -1, 0, 0).set('lep', 1, 0, 0);
});
export const lyingSpec = lying;
const mkFall = (id, style, steps, meta = {}) => {
  // The rifle is HELD (hand-anchored, hold = 2) until the man lets go of it; the release is a snap key 16 ms after the last held key, with the rifle where the hand had it, and from there it falls on the authored path (no hand grips it,
  // so nothing is dragged: before, the weight of the hand faded over 0.2-0.4 s while the rifle flew a metre away, and the least-squares pull dragged the rifle behind the hand: 19 to 103 cm).
  let t = 0; const keys = []; let prev = null;
  for (const [dt, spec, ease] of steps) { t += dt;
    if (prev && prev.spec.get('hold') > 0.5 && spec.get('hold') < 0.5 && t - prev.t > 0.04) { keys[keys.length - 1].ease = 'snap'; const rel = withSpec(prev.spec, x => x.set('hold', 0).set('rhwa', 0).set('lhwa', 0)); keys.push(keyFromSpec(prev.t + 0.016, rel, 'smooth')); }
    keys.push(keyFromSpec(t, spec, ease || 'smooth')); prev = { t, spec }; }
  return keyedDef({ id, dur: t, loop: false, base: steps[0][1], keys, propB: 'prop_sword', family: 'fall', meta: { label: 'Fall: ' + style, fallStyle: style, tier: 'plausible-procedural', gap: 'G-ANIM-10', src: [], endsLying: meta.ends || style, ...meta } });
};

export function fallDefs() {
  const SA = S(POSE.shoulderArms), D = [], ends = {};
  const SAH = withSpec(SA, s => holdProp(s, 'A', { R: [-0.215, 0.88 - 1.26, 0.07 - 0.006], rg: R.guard, dir: [0.02, 1, 0.0], frame: 1 }).set('lhp', 0.245, 0.83 - 1.26, 0.02 - 0.006));      // shoulder arms with the rifle held by the hand-anchored prop; frame 1 puts the free hand's target in the chest frame too (hfr = 1)
  const hit = (extra) => withSpec(SAH, s => { s.set('spE', -10, 0, 0).set('hdE', -10, 0, 0).set('ffr', 1); if (extra) extra(s); });
  const flail = withSpec(SA, s => { s.set('ffr', 1).set('rhwa', 0).set('lhwa', 0).set('rhp', -0.5, 1.5, 0.2).set('lhp', 0.5, 1.4, 0.1).set('rp', -0.5, 1.0, 0.1).set('rfr', 0).set('ra', 120, 30, 0).set('rref', 0).set('spE', -14, 0, 0).set('hdE', -12, 0, 0); });
  const base = withSpec(SAH, s => s.set('ffr', 1));
  // back / front / side falls
  for (const k of ['back', 'front', 'side_left', 'side_right']) {
    const end = lying(SA, k); ends[k] = end;
    const midRot = k === 'back' ? withSpec(end, s => { s.set('rootE', -40, 0, 0).set('rootT', 0, 0.05, 0.25); }) : k === 'front' ? withSpec(end, s => { s.set('rootE', 40, 0, 0).set('rootT', 0, 0.05, -0.25); }) : withSpec(end, s => { s.set('rootE', 8, 0, k === 'side_left' ? -40 : 40).set('rootT', k === 'side_left' ? 0.04 : -0.04, 0.05, 0); });
    D.push(mkFall('fall_' + k, k, [[0, base], [0.18, hit(), 'fast'], [0.42, withSpec(midRot, s => s.set('rhwa', 0).set('lhwa', 0)), 'slow'], [0.45, end, 'fast']], { src: [] }));
  }
  // drop the rifle, then collapse backward
  D.push(mkFall('fall_drop_rifle', 'drop_rifle', [[0, base], [0.20, flail, 'fast'], [0.45, withSpec(lying(SA, 'back'), s => s.set('rootE', -45, 0, 0).set('rootT', 0, 0.05, 0.3)), 'slow'], [0.45, lying(SA, 'back'), 'fast']], { ends: 'back' }));
  // clutch wound: hand to the belly, bending, buckling, then toppling onto the side
  const clutch = withSpec(SA, s => { s.set('ffr', 0).set('rhwa', 0).set('rfr', 1).set('rp', -0.3, -0.2, 0.2).set('ra', 100, 10, 0).set('rref', 0).set('lhwa', 0).set('hfr', 1).set('rhp', -0.05, -0.28, 0.14).set('lhp', 0.08, -0.28, 0.14).set('spE', 28, 0, 0).set('hdE', 15, 0, 0).set('pel', 0, -0.10, 0).set('pelE', 12, 0, 0).set('rep', -0.5, -1, 0).set('lep', 0.5, -1, 0); });
  const buckle = withSpec(clutch, s => { s.set('pel', 0, -0.38, 0.05).set('spE', 40, 0, 0).set('fl', 0.10, 0.085, 0.05).set('fr', -0.10, 0.085, 0.0); });
  const endSide = lying(clutch, 'side_left'); ends.clutch_wound = endSide;
  D.push(mkFall('fall_clutch_wound', 'clutch_wound', [[0, base], [0.25, clutch], [0.45, buckle], [0.15, withSpec(buckle, s => s.set('ffr', 1)), 'hold'], [0.5, withSpec(endSide, s => s.set('rootE', 18, 0, -50).set('rootT', 0.05, 0.05, 0)), 'slow'], [0.4, endSide, 'fast']], { ends: 'side_left' }));
  // knee first: the legs fold, then the body topples forward
  const kneeP = withSpec(SAH, s => { s.set('ffr', 0).set('pel', 0, -0.42, 0.10).set('pelE', 10, 0, 0).set('spE', 10, 0, 0).set('fl', 0.10, 0.085, 0.10).set('fr', -0.12, 0.10, -0.30).set('fre', -60, -10, 0); });
  const endFront = lying(kneeP, 'front'); ends.knee_first = endFront;
  D.push(mkFall('fall_knee_first', 'knee_first', [[0, base], [0.15, withSpec(SAH, s => s.set('spE', -6, 0, 0).set('ffr', 0))], [0.45, kneeP, 'fast'], [0.1, withSpec(kneeP, s => s.set('ffr', 1)), 'hold'], [0.55, withSpec(endFront, s => s.set('rootE', 40, 0, 0).set('rootT', 0, 0.06, -0.25)), 'slow'], [0.30, endFront, 'fast']], { ends: 'front' }));
  // spin: twisting as he is hit, falling onto the back with the shoulder turned
  const spun = withSpec(SA, s => { s.set('ffr', 1).set('spE', -6, 70, 0).set('pelE', 0, 30, 0).set('hdE', -6, -40, 0).set('rhwa', 0).set('rp', -0.4, 1.2, 0.2).set('rfr', 0).set('ra', 100, 40, 0).set('rref', 0).set('rhp', -0.6, 1.4, 0.1).set('hfr', 0); });
  D.push(mkFall('fall_spin', 'spin', [[0, base], [0.30, spun, 'fast'], [0.40, withSpec(lying(spun, 'back'), s => s.set('rootE', -40, 0, 0).set('rootT', 0, 0.05, 0.25)), 'slow'], [0.45, withSpec(lying(spun, 'back'), s => s.set('spE', -6, 20, 0)), 'fast']], { ends: 'back' }));
  // lying loops from the end poses (dead: slight settling only; wounded: breathing, head turns, a hand to the wound)
  const loops = [['back', ends.back], ['front', ends.front], ['side_left', ends.side_left], ['side_right', ends.side_right]];
  for (const [k, end] of loops) {
    const e = end; const deadLoop = keyedDef({ id: 'lie_dead_' + k, dur: 4, loop: true, base: e, keys: [keyFromSpec(0, e), keyFromSpec(4, e)], propB: 'prop_sword', family: 'lie',
      meta: { label: 'Lying dead (' + k + ')', tier: 'plausible-procedural', gap: 'G-ANIM-10', src: [], fallEndsWith: k }, post: (t, sp) => { const w = Math.PI * 2 * t / 4; sp.set('spE', sp.get('spE', 0) + 0.25 * Math.sin(w), sp.get('spE', 1), sp.get('spE', 2)); } });
    D.push(deadLoop);
    const wounded = keyedDef({ id: 'lie_wounded_' + k, dur: 5, loop: true, base: e, keys: [keyFromSpec(0, e), keyFromSpec(5, e)], propB: 'prop_sword', family: 'lie',
      meta: { label: 'Lying wounded (' + k + '): breathing, head turning, a hand moving to the wound', tier: 'plausible-procedural', gap: 'G-ANIM-10', src: [] },
      post: (t, sp) => { const w = Math.PI * 2 * t / 5, b = Math.sin(w * 2); sp.set('spE', sp.get('spE', 0) + 2.2 * b, sp.get('spE', 1) + 3 * Math.sin(w), sp.get('spE', 2));
        sp.set('hdE', sp.get('hdE', 0) + 10 * Math.sin(w), sp.get('hdE', 1) + 25 * Math.sin(w * 1), sp.get('hdE', 2)); sp.set('rhp', sp.get('rhp', 0) + 0.12 * Math.sin(w), sp.get('rhp', 1) + 0.05 * (1 + Math.sin(w)), sp.get('rhp', 2) + 0.10 * Math.sin(w)); } });
    D.push(wounded);
  }
  // crawl (wounded): prone locomotion, arms pulling, legs trailing; root speed 0.25 m/s (plausible-procedural)
  const prone = lying(SA, 'front'); const cT = 3.2, crawlSpeed = 0.25;
  D.push({ id: 'crawl_wounded', loop: true, dur: cT, fps: 30, propB: 'prop_sword', family: 'lie',
    meta: { label: 'Wounded crawl (prone, alternate arm pulls)', tier: 'plausible-procedural', gap: 'G-ANIM-10', src: [], rootSpeed: crawlSpeed, planted: false },
    eval(t, sp) { sp.v.set(prone.v); const w = Math.PI * 2 * t / cT, c = Math.cos(w), sn = Math.sin(w);
      sp.set('hfr', 1).set('rhp', -0.30, 0.38 + 0.20 * c, 0.08).set('lhp', 0.30, 0.38 - 0.20 * c, 0.08).set('hdE', -25, 8 * sn, 0).set('spE', 6, 6 * sn, 0).set('pelE', 78 - 78, 6 * sn, 0);
      sp.set('fl', 0.12, 0.09, 0.0 - 0.12 * Math.max(0, sn)).set('fr', -0.14, 0.12, -0.05 - 0.12 * Math.max(0, -sn)); } });
  // the two-bearer litter carry (front and rear bearer), gait-derived at 0.62 x common time; hands at the poles
  for (const [role, z] of [['front', 0.30], ['rear', -0.30]]) {
    const g = gaitDef({ id: 'carry_litter_' + role, gait: 'common_time', carry: 'order', speedScale: 0.62, label: 'litter bearer (' + role + ')', tier: 'plausible-procedural' });
    const ev = g.eval; g.eval = (t, sp) => { ev(t, sp); sp.set('rhwa', 0).set('rp', -0.3, 0.1, 0.1).set('rhp', -0.26, 0.82, z).set('lhp', 0.26, 0.82, z).set('lep', 0.3, -1, 0).set('rep', -0.3, -1, 0).set('rhwa', 0).set('lhwa', 0); };
    g.meta.litterRole = role; g.meta.gap = 'G-ANIM-11'; D.push(g);
  }
  return D;
}
