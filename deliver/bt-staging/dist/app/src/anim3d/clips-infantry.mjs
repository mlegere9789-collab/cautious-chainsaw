// Infantry clips beyond the firing cycle: manual-of-arms changes, bayonet exercise, facings, kneeling and lying transitions, surrender, the wounded walk, and the standing/resting loops.
// Positions: poses.mjs. The order of motions is documented where a drill paragraph is cited (src); the coordinates and the time between motions are inferred / plausible-procedural.
import { Spec, PROPS } from './figure-pose.mjs';
import { keyFromSpec, keyedDef } from './clipdef.mjs';
import * as POSE from './poses.mjs';
import { MOTION_S } from './drill-tables.mjs';
import { standDef, gaitDef } from './locomotion.mjs';
import { POSTURES } from './musketry.mjs';

const R = PROPS.rifle, M = MOTION_S;
const S = f => f(new Spec());
// steps: [[dt, spec, ease?]] ; the first step's dt is 0
const tr = (id, label, steps, meta = {}) => {
  const first = steps[0][1]; let t = 0; const keys = [keyFromSpec(0, first)];
  for (let i = 1; i < steps.length; i++) { t += steps[i][0]; keys.push(keyFromSpec(t, steps[i][1], steps[i][2] || 'smooth')); }
  return keyedDef({ id, dur: t, loop: false, base: first, keys, propB: 'prop_sword', family: meta.family || 'drill', meta: { label, tier: 'inferred', ...meta } });
};
const mid = (a, b, w, mod) => { const s = new Spec(); for (let i = 0; i < s.v.length; i++) s.v[i] = a.v[i] * (1 - w) + b.v[i] * w; if (mod) mod(s); return s; };

export function infantryDefs() {
  const SA = S(POSE.shoulderArms), OA = S(POSE.orderArms), RSS = S(POSE.rightShoulderShift), TR = S(POSE.trailArms), CB = S(POSE.chargeBayonet), RDY = S(POSE.ready), AIM = S(POSE.aim), AW = S(POSE.armsAtWill);
  const D = [];
  D.push(standDef({ id: 'stand_shoulder', kind: 'shoulder' }), standDef({ id: 'stand_order', kind: 'order' }), standDef({ id: 'stand_rss', kind: 'rss' }), standDef({ id: 'stand_trail', kind: 'trail' }), standDef({ id: 'stand_rest', kind: 'rest', dur: 8 }));
  // Order arms <-> shoulder arms (paras 145-149 / 154-155): two motions each
  const passOrder = s => { s.set('rp', -0.19, 0.95, 0.12).set('rref', 0.86); };
  D.push(tr('arms_order_from_shoulder', 'Order arms (from shoulder arms), two motions', [[0, SA], [M, mid(SA, OA, 0.5, passOrder)], [M, OA]], { src: ['H.S.S. 147-148', 'HAR-S23'], tier: 'documented', motions: 2, regulated: true }));
  D.push(tr('arms_shoulder_from_order', 'Shoulder arms (from order arms), two motions', [[0, OA], [M, mid(OA, SA, 0.5, passOrder)], [M, SA]], { src: ['H.S.S. 154-155', 'HAR-S23'], tier: 'documented', motions: 2, regulated: true }));
  const passRss = s => { s.set('rp', -0.12, 1.12, 0.28).set('rref', R.guard).set('ra', 28, 0, 0).set('lhwa', 1).set('lhga', 0.75); };
  D.push(tr('arms_rss_from_shoulder', 'Right shoulder shift arms (from shoulder arms), two motions', [[0, SA], [M, mid(SA, RSS, 0.5, passRss)], [M, RSS]], { src: ['H.S.S. 210-211'], tier: 'documented', motions: 2, regulated: true }));
  D.push(tr('arms_shoulder_from_rss', 'Shoulder arms (from right shoulder shift), two motions', [[0, RSS], [M, mid(RSS, SA, 0.5, passRss)], [M, SA]], { src: ['H.S.S. 212-213'], tier: 'documented', motions: 2, regulated: true }));
  D.push(tr('arms_trail_from_order', 'Trail arms (from order arms), two motions', [[0, OA], [M, mid(OA, TR, 0.5)], [M, TR]], { src: ['H.S.S. 197-198'], tier: 'documented', motions: 2, regulated: true }));
  D.push(tr('arms_atwill_from_shoulder', 'Arms at will (from shoulder arms)', [[0, SA], [1.0, AW]], { src: ['H.S.S. route step; arms at will'], tier: 'inferred' }));
  // Ready (3 motions) from shoulder arms, shoulder arms from ready, aim, recover
  const r1 = mid(SA, RDY, 0.4, s => { s.set('rp', -0.20, 1.05, 0.1).set('rfr', 0).set('ra', 8, 0, 0).set('rref', R.wrist).set('rhga', R.wrist).set('lhwa', 1).set('lhga', 0.8); });
  const r2 = mid(SA, RDY, 0.8, s => { s.set('lhwa', 1).set('lhga', 0.75); });
  D.push(tr('ready_from_shoulder', 'Ready (three motions) from shoulder arms: half face right, right foot back, piece down, thumb on the cock', [[0, SA], [M, r1], [M, r2], [M, RDY]], { src: ['H.S.S. 171-173', 'INF-FIRE-01', 'HAR-S12'], tier: 'documented', motions: 3, regulated: true }));
  D.push(tr('shoulder_from_ready', 'Shoulder arms from Ready (half-cock, piece to the right shoulder)', [[0, RDY], [M, r2], [M, r1], [M, SA]], { src: ['H.S.S. 185-186', 'HAR-S19'], tier: 'documented', regulated: true }));
  D.push(tr('aim_from_ready', 'Aim', [[0, RDY], [M, AIM]], { src: ['H.S.S. 174-176', 'INF-FIRE-02'], tier: 'documented', regulated: true }));
  D.push(tr('recover_arms', 'Recover arms (from Aim to Ready)', [[0, AIM], [M, RDY]], { src: ['HAR-S18'], tier: 'documented', regulated: true }));
  // Bayonet: fix (3 motions), charge bayonet (2 motions) and back, guard, thrust, parry, clubbed musket
  const f1 = mid(SA, OA, 0.8, s => { s.set('rp', -0.02, 0.0, 0.07).set('ra', 1.2, 0, 0).set('rref', 0).set('rfr', 0).set('rhwa', 0).set('rhp', -0.19, 0.96, 0.115).set('lhwa', 1).set('lhga', 1.16); });
  const f2 = mid(SA, CB, 0.35, s => { s.set('rhwa', 1).set('lhwa', 1).set('lhga', 0.95); });
  const f1b = mid(f1, f1, 0, s => { s.set('lhwa', 0).set('lhp', 0.12, 1.02, 0.30); });
  const f1c = mid(f1, f1, 0, s => { s.set('lhwa', 1).set('lhga', 0.85); });
  D.push(tr('bayonet_fix', 'Fix bayonet (three motions: piece to the front, left hand to the bayonet, bayonet fixed)', [[0, SA], [M * 1.2, f1], [M * 2.0, f1b], [M * 2.0, f1c], [M, SA]], { src: ['H.S.S. 187-190', 'HAR-S20'], tier: 'documented', motions: 3, exempt: true }));
  D.push(tr('bayonet_charge', 'Charge bayonet (two motions)', [[0, SA], [M, f2], [M, CB]], { src: ['H.S.S. 191-195', 'HAR-S21'], tier: 'documented', motions: 2, regulated: true }));
  D.push(tr('bayonet_charge_end', 'Shoulder arms from charge bayonet', [[0, CB], [M, f2], [M, SA]], { src: ['H.S.S. 195-196'], tier: 'documented', regulated: true }));
  const GI = mid(CB, CB, 0, s => { s.set('rp', -0.14, -0.10, 0.18).set('ra', 62, 30, 0).set('lhga', 0.72); });
  const GC = mid(CB, CB, 0, s => { s.set('rp', -0.12, 0.08, 0.14).set('ra', 100, 38, 0).set('lhga', 0.72); });
  D.push(tr('bayonet_guard_infantry', 'Guard against infantry (two motions)', [[0, SA], [M, f2], [M, GI]], { src: ['H.S.S. 304-309', 'HAR-S35'], tier: 'documented', motions: 2 }));
  D.push(tr('bayonet_guard_cavalry', 'Guard against cavalry (point up and out)', [[0, SA], [M, f2], [M, GC]], { src: ['H.S.S. 304-309', 'HAR-S35'], tier: 'documented', motions: 2 }));
  const TH = mid(GI, GI, 0, s => { s.set('rp', -0.14, -0.10, 0.38).set('ra', 78, 30, 0).set('lhga', 0.55); });
  D.push(tr('bayonet_thrust', 'Bayonet thrust and recover (authored; no thrust is printed in the acquired texts)', [[0, GI], [0.18, TH, 'fast'], [0.10, TH], [0.30, GI]], { src: [], tier: 'plausible-procedural', gap: 'G-ANIM-08' }));
  const PA = mid(GI, GI, 0, s => { s.set('rp', -0.14, -0.05, 0.25).set('ra', 62, 55, 0); });
  D.push(tr('bayonet_parry', 'Parry right and recover', [[0, GI], [0.15, PA, 'fast'], [0.35, GI]], { src: [], tier: 'plausible-procedural', gap: 'G-ANIM-08' }));
  const CL0 = mid(SA, SA, 0, s => { s.set('rp', -0.15, 1.25, -0.10).set('ra', 130, 0, 0).set('rref', 0.80).set('rhga', 0.80).set('lhwa', 1).set('lhga', 0.5); });
  const CL1 = mid(SA, SA, 0, s => { s.set('rp', 0.20, 1.15, 0.40).set('ra', 55, 40, 0).set('rref', 0.80).set('rhga', 0.80).set('lhwa', 1).set('lhga', 0.45).set('spE', 6, 38, 0).set('pelE', 0, 12, 0); });
  D.push(tr('clubbed_musket', 'Clubbed musket swing (melee at the Angle / Railroad Cut)', [[0, SA], [0.35, CL0], [0.22, CL1, 'fast'], [0.40, SA]], { src: [], tier: 'plausible-procedural', gap: 'G-ANIM-08' }));
  // facings (stationary): the turn is carried as rootYaw in the frame extras
  const face = (id, label, yaw) => { const a = S(POSE.shoulderArms); const b = S(POSE.shoulderArms); b.set('root', 0, 0, yaw);
    return tr(id, label, [[0, a], [M, mid(a, b, 0.55, s => { s.set('pel', 0, -0.01, 0).set('spE', 0, -yaw * 0.12, 0).set('fl', 0.12, 0.10, 0.02).set('root', 0, 0, yaw * 0.55); })], [M, b]], { src: ['H.S.S. facing'], tier: 'inferred', rootYawDeg: yaw }); };
  D.push(face('face_right', 'Face to the right (quarter turn, two motions)', -90), face('face_left', 'Face to the left', 90), face('face_about', 'About face (half turn)', 180));
  // kneel and lie down / rise (transitions between the standing Ready and the posture Ready)
  for (const [post, label, dur] of [['kneel', 'Kneel (right knee down, sit on the right heel)', 1.0], ['lie', 'Lie down (drop to both knees, then flat on the belly)', 1.8]]) {
    const ov = POSTURES[post].half; const lo = new Spec(); POSE.ready(lo); for (const [c, v] of Object.entries(ov)) lo.set(c, ...v);
    const m1 = mid(RDY, lo, 0.55, s => { s.set('pel', 0, post === 'kneel' ? -0.22 : -0.30, 0.06); });
    D.push(tr(post + '_down', label, [[0, RDY], [dur * 0.55, m1], [dur * 0.45, lo]], { src: post === 'kneel' ? ['H.S.S. 290-297', 'HAR-S33', 'INF-KNEEL-01'] : ['H.S.S. 299-303', 'HAR-S34', 'INF-LYING-01'], tier: 'documented' }));
    D.push(tr(post + '_up', 'Rise from ' + post + 'ing', [[0, lo], [dur * 0.45, m1], [dur * 0.55, RDY]], { src: ['HAR-S33', 'HAR-S34'], tier: 'documented' }));
  }
  // surrender: rifle dropped, hands up
  const SU = mid(SA, SA, 0, s => { s.set('rhwa', 0).set('lhwa', 0).set('rhp', -0.30, 1.85, 0.12).set('lhp', 0.30, 1.85, 0.12).set('rp', -0.4, 0.0, 0.3).set('rfr', 0).set('ra', 90, 30, 0).set('rref', 0).set('rep', -1, 0, 0).set('lep', 1, 0, 0).set('hdE', -8, 0, 0); });
  const drop = mid(SA, SU, 0.5, s => { s.set('rhwa', 0).set('rp', -0.25, 0.3, 0.12).set('rfr', 0); });
  D.push(tr('surrender', 'Surrender: the rifle dropped, both hands raised (authored)', [[0, SA], [0.4, drop, 'fast'], [0.5, SU]], { src: [], tier: 'plausible-procedural', gap: 'G-ANIM-09' }));
  // wounded walk (limp) as a gait at reduced speed
  D.push(gaitDef({ id: 'walk_wounded', gait: 'common_time', carry: 'shoulder', speedScale: 0.62, label: 'wounded walk (limp), reduced common time', tier: 'plausible-procedural' }));
  return D;
}
