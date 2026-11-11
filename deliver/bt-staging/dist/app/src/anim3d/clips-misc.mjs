// Officers, colour-bearers, musicians, camp and work: the states the plan's Section M.2 lists beyond drill and combat (officers, flag bearers and drummers; digging, chopping, building breastworks, piling rails, laying stone;
// cooking, sitting at fires, sleeping, standing picket; surgeon and orderly work). NO acquired text gives the motion of any of these: every clip here is authored (tier plausible-procedural, G-ANIM-09), the tools follow the
// documented tools of the timeline where it names them (spades and shovels at Culp's Hill) and everything is labelled "modern reconstruction, unreviewed by a human reenactor or historian" (plan M.4 / DEC-006 keeps tier marking).
// Props: prop_pole = shovel / axe / rail / flag staff (the renderer picks the mesh by meta.props), prop_sword = officer's sword, prop_instr = bugle / drum / cup / mess tin / instrument.
import { Spec } from './figure-pose.mjs';
import { keyFromSpec, keyedDef } from './clipdef.mjs';
import * as POSE from './poses.mjs';
import { gaitDef } from './locomotion.mjs';
import { lyingSpec } from './clips-fall.mjs';
import { holdProp } from './authoring.mjs';

const mod = (b, f) => { const s = new Spec(); s.v.set(b.v); f(s); return s; };
const base0 = () => POSE.attention(new Spec());
const loop = (id, label, steps, meta = {}) => { let t = 0; const keys = [keyFromSpec(0, steps[0][1])]; for (let i = 1; i < steps.length; i++) { t += steps[i][0]; keys.push(keyFromSpec(t, steps[i][1], steps[i][2] || 'smooth')); }
  return keyedDef({ id, dur: t, loop: meta.loop !== false, base: steps[0][1], keys, propB: meta.propB || 'prop_pole', family: meta.family || 'activity', meta: { label, tier: 'plausible-procedural', gap: 'G-ANIM-09', src: [], ...meta } }); };
const swordCarry = s => holdProp(s, 'B', { R: [-0.22, 1.05, 0.22], rg: 0.08, dir: [0.0, -0.95, -0.30], frame: 0 }).set('rep', -0.7, -0.3, -0.4);
const sit = s => { s.set('pel', 0, -0.80, -0.10).set('pelE', -17, 0, 0).set('spE', 17, 0, 0).set('fl', 0.15, 0.085, 0.42).set('fr', -0.15, 0.085, 0.42).set('fle', 0, 12, 0).set('fre', 0, -12, 0).set('lcont', 1).set('rcont', 1); return s; };

export function miscDefs() {
  const D = [], A = base0();
  // ---- officers (sword) and gestures
  const off = mod(A, s => { swordCarry(s); s.set('lhp', 0.245, 0.83, 0.02); });
  D.push(loop('officer_stand', 'Officer standing, sword at the carry', [[0, off], [3, mod(off, s => s.set('hdE', 0, 18, 0))], [3, off]], { propB: 'prop_sword', props: { prop_sword: 'sword' }, role: 'officer' }));
  const point = mod(off, s => { s.set('lhp', 0.30, 1.40, 0.55).set('lep', 1, 0, 0).set('hdE', 0, 10, 0).set('spE', 4, 12, 0); });
  D.push(loop('officer_point', 'Officer points (left arm extended, the sword stays in the right hand)', [[0, off], [0.5, point], [1.5, point], [0.5, off]], { loop: false, propB: 'prop_sword', role: 'officer', props: { prop_sword: 'sword' } }));
  const raise = mod(off, s => { holdProp(s, 'B', { R: [-0.20, 1.72, 0.15], rg: 0.08, dir: [0.0, -1.0, 0.05], frame: 0 }).set('rep', -1, 0, 0).set('spE', -4, 0, 0); });
  D.push(loop('officer_sword_raise', 'Officer raises the sword overhead ("Forward!")', [[0, off], [0.25, mod(off, s => { holdProp(s, 'B', { R: [-0.24, 1.40, 0.40], rg: 0.08, dir: [0.0, -0.9, -0.4], frame: 0 }); })], [0.4, raise], [1.2, raise], [0.3, mod(off, s => { holdProp(s, 'B', { R: [-0.24, 1.40, 0.40], rg: 0.08, dir: [0.0, -0.9, -0.4], frame: 0 }); })], [0.3, off]], { loop: false, propB: 'prop_sword', role: 'officer', props: { prop_sword: 'sword' } }));
  const fwd = mod(off, s => { holdProp(s, 'B', { R: [-0.22, 1.38, 0.40], rg: 0.08, dir: [0.0, -0.10, -1.0], frame: 0 }).set('rep', -0.8, -0.2, -0.3).set('spE', 6, 0, 0); });
  D.push(loop('officer_sword_point', 'Officer points the sword to the front', [[0, off], [0.45, fwd], [1.5, fwd], [0.5, off]], { loop: false, propB: 'prop_sword', role: 'officer', props: { prop_sword: 'sword' } }));
  const talk = mod(off, s => s.set('lhp', 0.30, 1.15, 0.30).set('hdE', 0, -15, 0).set('spE', 3, -8, 0));
  D.push(loop('officer_speak', 'Officer speaks to the men (head turns, left hand gestures)', [[0, off], [1.2, talk], [1.0, mod(talk, s => s.set('lhp', 0.25, 1.25, 0.38).set('hdE', 3, -22, 0))], [1.2, off]], { propB: 'prop_sword', role: 'officer', props: { prop_sword: 'sword' } }));
  const hatOn = mod(A, s => s.set('rhwb', 0).set('rhp', -0.10, 1.80, 0.10).set('rep', -1, 0, 0));
  D.push(loop('wave_hat', 'Waves the hat overhead (cheer)', [[0, A], [0.4, hatOn], [0.35, mod(hatOn, s => s.set('rhp', -0.30, 1.95, 0.10))], [0.35, hatOn], [0.35, mod(hatOn, s => s.set('rhp', -0.30, 1.95, 0.10))], [0.5, A]], { loop: false, propB: 'prop_sword' }));
  D.push(loop('salute', 'Salutes (right hand to the brim)', [[0, A], [0.45, mod(A, s => s.set('rhp', -0.12, 1.66, 0.12).set('rep', -1, -0.1, -0.2))], [1.0, mod(A, s => s.set('rhp', -0.12, 1.66, 0.12).set('rep', -1, -0.1, -0.2))], [0.45, A]], { loop: false, propB: 'prop_sword' }));
  // ---- colour-bearer (flag staff = prop_pole, butt in the belt socket) and musicians
  const colorCarry = spec => { POSE.attention(spec); holdProp(spec, 'B', { R: [-0.22, 1.18, 0.30], rg: 0.35, dir: [0.0, 0.99, 0.10], frame: 0, lg: 0.20 }).set('rep', -0.4, -0.3, -1).set('lhp', 0.245, 0.83, 0.02); return spec; };
  D.push(gaitDef({ id: 'march_color_quick', gait: 'quick_time', carry: colorCarry, propB: 'prop_pole', label: 'colour-bearer marching at quick time', tier: 'documented' }));
  const cc = colorCarry(new Spec());
  D.push(loop('color_stand', 'Colour-bearer standing with the colours (breeze: small sway)', [[0, cc], [2, mod(cc, s => holdProp(s, 'B', { R: [-0.22, 1.18, 0.30], rg: 0.35, dir: [0.07, 0.99, 0.13], frame: 0 }))], [2, cc]], { propB: 'prop_pole', props: { prop_pole: 'colours' }, role: 'colour_bearer' }));
  const plant = mod(cc, s => { holdProp(s, 'B', { R: [-0.12, 1.20, 0.32], L: [-0.09, 1.07, 0.30], rg: 1.20, frame: 0 }).set('spE', 6, 0, 0).set('lep', 0.5, -0.4, -0.5); });
  D.push(loop('color_plant', 'Colour-bearer plants the colours and holds them with both hands', [[0, cc], [0.8, plant], [3, mod(plant, s => holdProp(s, 'B', { R: [-0.12, 1.20, 0.32], L: [-0.09, 1.07, 0.30], rg: 1.20, dir: [0.05, 1, 0.02], frame: 0 }))], [0.8, cc]], { loop: false, propB: 'prop_pole', props: { prop_pole: 'colours' }, role: 'colour_bearer' }));
  const grounded = mod(A, s => { s.set('spE', 40, 0, 0).set('pel', 0, -0.20, -0.05).set('pelE', 20, 0, 0).set('rep', -1, -0.5, 0); holdProp(s, 'B', { R: [-0.28, 0.74, 0.24], rg: 0.9, dir: [0.0, 0.82, -0.57], frame: 0 }); });
  D.push(loop('color_pickup', 'The colours taken up by another man (stoop, grasp the staff, rise)', [[0, grounded], [0.7, mod(grounded, s => { s.set('spE', 20, 0, 0).set('pel', 0, -0.10, -0.03).set('pelE', 10, 0, 0); holdProp(s, 'B', { R: [-0.25, 0.95, 0.22], rg: 0.9, dir: [0.0, 0.97, -0.26], frame: 0 }); })], [0.8, cc]], { loop: false, propB: 'prop_pole', props: { prop_pole: 'colours' }, role: 'colour_bearer' }));
  const bug = mod(A, s => s.set('rhwb', 1).set('rhgb', 0.12).set('bfr', 0).set('bp', -0.06, 1.62, 0.12).set('ba', 70, 0, 0).set('rep', -1, -0.2, 0).set('hdE', -6, 0, 0).set('jaw', 4));
  D.push(loop('bugler_call', 'Bugler sounds a call (bugle to the lips)', [[0, A], [0.6, bug], [3, mod(bug, s => s.set('bp', -0.06, 1.63, 0.13))], [0.6, A]], { loop: false, propB: 'prop_instr', props: { prop_instr: 'bugle' }, role: 'musician' }));
  const dr = mod(A, s => s.set('rhp', -0.16, 0.95, 0.30).set('lhp', 0.16, 0.95, 0.30).set('rep', -0.5, -1, 0).set('lep', 0.5, -1, 0).set('spE', 6, 0, 0));
  D.push(loop('drummer_beat', 'Drummer beating (alternate sticks; the beat names are Casey HCS-L04)', [[0, dr], [0.25, mod(dr, s => s.set('rhp', -0.16, 1.05, 0.32).set('lhp', 0.16, 0.92, 0.30))], [0.25, mod(dr, s => s.set('rhp', -0.16, 0.92, 0.30).set('lhp', 0.16, 1.05, 0.32))], [0.25, dr]], { propB: 'prop_instr', props: { prop_instr: 'drum' }, role: 'musician', src: ['HCS-L04'] }));
  // ---- works: digging, chopping, carrying rails, laying stone
  const dg = mod(A, s => { s.set('spE', 28, 8, 0).set('pelE', 12, 0, 0).set('pel', 0, -0.08, 0.05).set('rep', -0.8, -0.5, -0.3).set('lep', 0.8, -0.5, -0.3); holdProp(s, 'B', { R: [-0.06, 0.95, 0.45], L: [0.09, 0.83, 0.51], rg: 1.05, frame: 0 }); });
  const dgDown = mod(dg, s => { s.set('spE', 36, 8, 0).set('pel', 0, -0.14, 0.08); holdProp(s, 'B', { R: [-0.06, 0.85, 0.50], L: [0.08, 0.73, 0.53], rg: 1.05, frame: 0 }); });
  const dgLift = mod(dg, s => { s.set('spE', 24, 26, 0); holdProp(s, 'B', { R: [0.0, 1.02, 0.55], L: [0.18, 0.92, 0.53], rg: 1.05, frame: 0 }); });
  const dgThrow = mod(dg, s => { s.set('spE', 20, 44, 0).set('pelE', 12, 20, 0); holdProp(s, 'B', { R: [0.10, 1.00, 0.50], L: [0.22, 1.01, 0.33], rg: 1.05, frame: 0 }); });
  D.push(loop('dig_shovel', 'Digging with a spade / shovel (earthworks are built on screen, plan B.7)', [[0, dg], [0.7, dgDown], [0.6, dgLift], [0.6, dgThrow], [0.7, dg]], { propB: 'prop_pole', props: { prop_pole: 'shovel' }, role: 'worker', src: ['PDF B.7 (6th Wisconsin about a dozen spades and shovels)'] }));
  const ch0 = mod(A, s => { s.set('spE', -8, 0, 0).set('rep', -1, 0, 0).set('lep', 1, 0, 0); holdProp(s, 'B', { R: [-0.16, 1.30, 0.35], L: [-0.08, 1.55, 0.20], rg: 0.8, frame: 0 }); });
  const ch1 = mod(ch0, s => { s.set('spE', 32, 12, 0).set('pel', 0, -0.10, 0.10); holdProp(s, 'B', { R: [-0.09, 1.07, 0.50], L: [0.01, 1.07, 0.56], rg: 0.8, frame: 0 }); });
  D.push(loop('chop_axe', 'Chopping with an axe (felling timber for log works)', [[0, ch0], [0.7, ch0], [0.18, ch1, 'fast'], [0.5, ch0]], { propB: 'prop_pole', props: { prop_pole: 'axe' }, role: 'worker' }));
  const railHold = s => holdProp(s, 'B', { R: [-0.22, 1.62, 0.25], rg: 1.0, dir: [0.0, 0.12, 1.0], frame: 0 }).set('rep', -0.6, -0.6, -0.4);
  D.push(gaitDef({ id: 'march_carry_rail', gait: 'common_time', carry: s => { POSE.attention(s); railHold(s); return s; }, speedScale: 0.8, propB: 'prop_pole', label: 'carrying a rail on the shoulder', tier: 'plausible-procedural' }));
  const st0 = mod(A, s => s.set('rhwb', 0).set('rhp', -0.16, 0.45, 0.35).set('lhp', 0.16, 0.45, 0.35).set('spE', 55, 0, 0).set('pelE', 25, 0, 0).set('pel', 0, -0.22, -0.05).set('rep', -0.4, -1, 0).set('lep', 0.4, -1, 0).set('hfr', 0));
  const st1 = mod(st0, s => s.set('rhp', -0.16, 1.15, 0.35).set('lhp', 0.16, 1.15, 0.35).set('spE', 12, 0, 0).set('pelE', 5, 0, 0).set('pel', 0, -0.05, 0));
  D.push(loop('lay_stone', 'Lifting a stone and setting it in a wall (lay stone breastworks)', [[0, st0], [0.9, st1], [0.6, mod(st1, s => s.set('rhp', -0.16, 1.00, 0.52).set('lhp', 0.16, 1.00, 0.52).set('spE', 28, 0, 0))], [0.7, st0]], { role: 'worker' }));
  // ---- camp: sit at a fire, cook, drink, eat, sleep, stand picket
  const sf = sit(mod(A, s => s.set('rhp', -0.25, 0.55, 0.45).set('lhp', 0.25, 0.55, 0.45).set('rep', -0.4, -1, 0).set('lep', 0.4, -1, 0).set('hdE', 10, 0, 0)));
  D.push(loop('sit_fire', 'Sitting on the ground at a fire (hands to the warmth, head turning)', [[0, sf], [3, mod(sf, s => s.set('hdE', 6, 28, 0).set('spE', 14, 0, 0))], [3, mod(sf, s => s.set('hdE', 8, -22, 0))], [3, sf]], { role: 'camp' }));
  const ck = mod(A, s => { s.set('lhp', 0.20, 0.80, 0.45).set('spE', 30, 0, 0).set('pelE', 12, 0, 0).set('pel', 0, -0.10, 0.04).set('rep', -0.7, -0.8, -0.2); holdProp(s, 'B', { R: [-0.25, 0.95, 0.55], rg: 0.9, dir: [0.0, 0.68, -0.73], frame: 0 }); });
  D.push(loop('cook_stir', 'Cooking: stirring a pot over a fire', [[0, ck], [0.8, mod(ck, s => { holdProp(s, 'B', { R: [-0.25, 0.95, 0.55], rg: 0.9, dir: [0.20, 0.66, -0.72], frame: 0 }); })], [0.8, mod(ck, s => { holdProp(s, 'B', { R: [-0.25, 0.95, 0.55], rg: 0.9, dir: [-0.18, 0.66, -0.73], frame: 0 }); })], [0.8, ck]], { propB: 'prop_pole', props: { prop_pole: 'ladle' }, role: 'camp' }));
  const dk = mod(A, s => { s.set('hdE', -14, 0, 0).set('rep', -1, -0.2, 0); holdProp(s, 'B', { R: [-0.04, 1.52, 0.26], rg: 0.06, dir: [0.0, 0.57, 0.82], frame: 0 }); });
  const dkSide = mod(A, s => { holdProp(s, 'B', { R: [-0.26, 0.92, 0.08], rg: 0.06, dir: [0.0, -1.0, 0.0], frame: 0 }); }), dkMid = mod(A, s => { holdProp(s, 'B', { R: [-0.18, 1.15, 0.45], rg: 0.06, dir: [0.0, 0.2, 0.98], frame: 0 }); });
  D.push(loop('drink_cup', 'Drinking (cup / canteen to the mouth)', [[0, dkSide], [0.4, dkMid], [0.4, dk], [2.0, dk], [0.4, dkMid], [0.4, dkSide]], { loop: false, propB: 'prop_instr', props: { prop_instr: 'cup' }, role: 'camp' }));
  D.push(loop('eat_hardtack', 'Eating (right hand to the mouth, chewing)', [[0, sf], [0.8, mod(sf, s => s.set('rhp', -0.06, 0.20, 0.30).set('jaw', 8))], [0.5, mod(sf, s => s.set('rhp', -0.06, 0.20, 0.30).set('jaw', 0))], [0.8, sf]], { role: 'camp' }));
  const sl = lyingSpec(POSE.shoulderArms(new Spec()), 'side_left');
  D.push(loop('sleep_side', 'Sleeping on the side (breathing)', [[0, sl], [2.5, mod(sl, s => s.set('spE', 20, 10, 0))], [2.5, sl]], { role: 'camp', family: 'activity' }));
  const pk = mod(POSE.orderArms(new Spec()), s => s.set('hdE', 0, 0, 0));
  D.push(loop('stand_picket', 'Standing picket (alert, head scanning, rifle at order arms)', [[0, pk], [2.5, mod(pk, s => s.set('hdE', 3, 50, 0).set('spE', 0, 12, 0))], [2.5, mod(pk, s => s.set('hdE', 2, -45, 0).set('spE', 0, -10, 0))], [2.5, pk]], { role: 'sentinel' }));
  // ---- medical: surgeon, orderly, litter
  const sg = mod(A, s => s.set('spE', 40, 0, 0).set('pelE', 18, 0, 0).set('pel', 0, -0.12, 0.05).set('rhp', -0.12, 0.40, 0.55).set('lhp', 0.16, 0.45, 0.55).set('hdE', 25, 0, 0).set('rep', -0.4, -1, 0).set('lep', 0.4, -1, 0).set('hfr', 0));
  D.push(loop('surgeon_operate', 'Surgeon operating (stooped over the table, both hands working)', [[0, sg], [0.6, mod(sg, s => s.set('rhp', -0.14, 0.42, 0.62).set('lhp', 0.18, 0.40, 0.50))], [0.6, mod(sg, s => s.set('rhp', -0.10, 0.38, 0.52).set('lhp', 0.16, 0.46, 0.60))], [0.6, sg]], { role: 'surgeon', src: [] }));
  const orderlyKey = (sx, dx) => mod(A, s => { s.set('pelE', 0, 0, sx).set('rep', -0.4, -1, 0); holdProp(s, 'B', { R: [-0.26, 0.92, 0.08], rg: 0.05, dir: [dx, -1.0, 0.0], frame: 0 }); });
  D.push(loop('orderly_water', 'Orderly carrying a bucket (loop)', [[0, orderlyKey(3, 0.04)], [1.5, orderlyKey(-3, -0.04)], [1.5, orderlyKey(3, 0.04)]], { propB: 'prop_instr', props: { prop_instr: 'bucket' }, role: 'orderly' }));
  return D;
}
