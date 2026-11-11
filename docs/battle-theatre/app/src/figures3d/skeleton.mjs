// Skeleton definitions for the Battle Theatre figure models: human (foot soldier, officer, musician, cavalryman, gun crew), horse, and the gun/limber/caisson rig.
// This module GENERATES data/figures3d/skeleton.json (the contract with the animation module); nothing here is mocap or a historical measurement.
// Conventions (also written into the JSON):
//  * units metres; right-handed; +y up; +z = the direction the figure faces; +x = the figure's LEFT (glTF). Bone names ending _L are on +x, _R on -x.
//  * REST POSE: A-pose, arms hang 20 degrees out from the body, palms in, feet flat and parallel, knees straight. Every bone's rest rotation is IDENTITY: a bone's rest local
//    translation is (own head - parent head); poses are local quaternions (x,y,z,w) RELATIVE TO REST. The skinning palette is world(bone) * inverseBind(bone) with inverseBind = translate(-head).
//  * Euler convention for the limit table: intrinsic XYZ, degrees, relative to rest. Positive X rotation swings a downward-pointing limb BACKWARD (hip extension, knee flexion, elbow EXTENSION is positive);
//    so knee flexion is x in [0,150], elbow flexion x in [-145,0], hip flexion x in [-120,..]. Positive Z swings a downward limb toward +x (so left abduction is +z; the right bone mirrors: y,z signs flip).
//  * Stature at scale 1.0 = 1.73 m (PLAUSIBLE-PROCEDURAL tuning parameter: no anthropometric source was read for this task; see TIERS.json F-STATURE). Per-man scale 0.95-1.06 (gate G8) is applied to the instance, not the rig.
import { v3, r6 } from './mathlib.mjs';

export const SKELETON_VERSION = 'figures3d-skeleton-1';
const L = s => s + '_L', R = s => s + '_R';
const mirrorX = p => [-p[0], p[1], p[2]];

// ---------------------------------------------------------------- limit presets (degrees, relative to rest, for the LEFT bone; the right bone mirrors by negating the y and z ranges)
const LIM = {
  spine: { x: [-30, 25], y: [-25, 25], z: [-20, 20] }, neck: { x: [-40, 45], y: [-60, 60], z: [-30, 30] }, head: { x: [-30, 40], y: [-50, 50], z: [-25, 25] }, jaw: { x: [0, 28], y: [-5, 5], z: [-4, 4] }, eye: { x: [-30, 30], y: [-35, 35], z: [0, 0] },
  clavicle: { x: [-20, 30], y: [-15, 15], z: [-10, 25] }, upperarm: { x: [-180, 60], y: [-90, 90], z: [-20, 175] }, forearm: { x: [-145, 0], y: [-90, 90], z: [0, 0] }, hand: { x: [-70, 80], y: [-30, 30], z: [-30, 20] },
  finger: { x: [-100, 15], y: [-8, 8], z: [-15, 15] }, thumb: { x: [-60, 15], y: [-30, 30], z: [-40, 40] }, thigh: { x: [-120, 20], y: [-40, 40], z: [-45, 20] }, shin: { x: [0, 150], y: [0, 0], z: [0, 0] },
  foot: { x: [-30, 50], y: [-20, 20], z: [-25, 25] }, toe: { x: [-45, 60], y: [0, 0], z: [0, 0] }, root: null, pelvis: { x: [-25, 25], y: [-30, 30], z: [-20, 20] },
};
const mirrorLim = l => l && ({ x: l.x.slice(), y: [-l.y[1], -l.y[0]], z: [-l.z[1], -l.z[0]] });

// ---------------------------------------------------------------- the human rig
function buildHuman() {
  const B = []; const add = (name, parent, head, group, o = {}) => { B.push({ name, parent, head, group, ...o }); return name; };
  const ARM = 20 * Math.PI / 180, ad = [Math.sin(ARM), -Math.cos(ARM), 0];       // A-pose arm direction (left side), unit
  add('root', null, [0, 0, 0], 'root', { limits: null });
  add('pelvis', 'root', [0, 0.92, 0], 'spine', { limits: LIM.pelvis });
  add('spine1', 'pelvis', [0, 0.98, 0], 'spine', { limits: LIM.spine });
  add('spine2', 'spine1', [0, 1.12, 0.002], 'spine', { limits: LIM.spine });
  add('spine3', 'spine2', [0, 1.26, 0.006], 'spine', { limits: LIM.spine });
  add('neck', 'spine3', [0, 1.43, 0.012], 'head', { limits: LIM.neck });
  add('head', 'neck', [0, 1.55, 0.018], 'head', { limits: LIM.head });
  add('jaw', 'head', [0, 1.585, 0.0], 'face', { limits: LIM.jaw });
  for (const s of ['L', 'R']) { const x = s === 'L' ? 1 : -1; add('eye_' + s, 'head', [x * 0.031, 1.622, 0.082], 'face', { limits: s === 'L' ? LIM.eye : mirrorLim(LIM.eye) }); }
  for (const s of ['L', 'R']) {
    const x = s === 'L' ? 1 : -1, mir = p => [p[0] * x, p[1], p[2]], lim = k => s === 'L' ? LIM[k] : mirrorLim(LIM[k]);
    const sh = [0.185, 1.395, 0.0], el = v3.add(sh, v3.mul(ad, 0.305)), wr = v3.add(el, v3.mul(ad, 0.255)), hd = v3.add(wr, v3.mul(ad, 0.0));
    add('clavicle_' + s, 'spine3', mir([0.02, 1.405, 0.025]), 'arm', { limits: lim('clavicle') });
    add('upperarm_' + s, 'clavicle_' + s, mir(sh), 'arm', { limits: lim('upperarm') });
    add('forearm_' + s, 'upperarm_' + s, mir(el), 'arm', { limits: lim('forearm') });
    add('hand_' + s, 'forearm_' + s, mir(wr), 'arm', { limits: lim('hand') });
    // fingers: 2 deformation bones each (proximal, distal); thumb has a metacarpal-less 2-bone chain; palm 0.095 m, finger lengths from a plausible adult hand (plausible-procedural proportions)
    const palm = v3.add(wr, v3.mul(ad, 0.095)), side = [Math.cos(ARM), Math.sin(ARM), 0];           // side: toward the palm's lateral axis in the arm's plane is not needed; fingers fan along z
    const fin = [['index', 0.030, [0, 0, 0.034], 0.040, 0.026], ['middle', 0.0, [0, 0, 0.011], 0.044, 0.028], ['ring', -0.026, [0, 0, -0.011], 0.040, 0.026], ['pinky', -0.050, [0, 0, -0.034], 0.031, 0.021]];
    // finger roots spread across the palm width along +z (palm faces -x*x for the left hand in the A-pose; the knuckle line is along z): index nearest the thumb (front, +z)
    for (const [nm, , off, l1, l2] of fin) {
      const r0 = v3.add(palm, off), r1 = v3.add(r0, v3.mul(ad, l1));
      add(nm + '1_' + s, 'hand_' + s, mir(r0), 'finger', { limits: lim('finger') }); add(nm + '2_' + s, nm + '1_' + s, mir(r1), 'finger', { limits: lim('finger') });
      B[B.length - 1].tail = mir(v3.add(r1, v3.mul(ad, l2)));
    }
    const t0 = v3.add(wr, [0.012 * ad[0] + 0.0, -0.02, 0.028]), t1 = v3.add(t0, [0.008, -0.030, 0.024]), t2 = v3.add(t1, [0.004, -0.024, 0.018]);
    add('thumb1_' + s, 'hand_' + s, mir(t0), 'finger', { limits: lim('thumb') }); add('thumb2_' + s, 'thumb1_' + s, mir(t1), 'finger', { limits: lim('thumb') }); B[B.length - 1].tail = mir(t2);
    void hd; void side;
  }
  for (const s of ['L', 'R']) {
    const x = s === 'L' ? 1 : -1, mir = p => [p[0] * x, p[1], p[2]], lim = k => s === 'L' ? LIM[k] : mirrorLim(LIM[k]);
    add('thigh_' + s, 'pelvis', mir([0.092, 0.915, 0.0]), 'leg', { limits: lim('thigh') });
    add('shin_' + s, 'thigh_' + s, mir([0.092, 0.495, 0.008]), 'leg', { limits: lim('shin') });
    add('foot_' + s, 'shin_' + s, mir([0.092, 0.085, -0.012]), 'leg', { limits: lim('foot') });
    add('toe_' + s, 'foot_' + s, mir([0.092, 0.040, 0.125]), 'leg', { limits: lim('toe') }); B[B.length - 1].tail = mir([0.092, 0.025, 0.185]);
  }
  // gear / secondary-motion bones (PDF render G7: spring bones on canteen, cartridge box, haversack, blanket roll, scabbards, coat skirts, sash, tassels, flag cloth). Natural frequency 3-8 Hz, damping 0.3-0.6 (gate G7 numbers).
  const sp = (f, d, m) => ({ freq_hz: f, damping: d, mass_rel: m });
  const G = (name, parent, head, spring, o = {}) => add(name, parent, head, 'gear', { limits: null, spring, ...o });
  G('gear_cartbox', 'pelvis', [-0.19, 0.93, 0.06], sp(5.5, 0.45, 1.0));        // right hip (kit catalogue: cartridge box right hip)
  G('gear_scabbard', 'pelvis', [0.17, 0.92, 0.02], sp(4.0, 0.40, 0.8));         // bayonet scabbard / sword scabbard, left hip
  G('gear_haversack', 'pelvis', [-0.20, 0.98, -0.07], sp(4.5, 0.50, 1.2));      // PLAUSIBLE-PROCEDURAL side (F-CARRY-SIDE)
  G('gear_canteen', 'pelvis', [0.21, 0.96, -0.08], sp(5.0, 0.50, 1.0));
  G('gear_pack', 'spine3', [0, 1.30, -0.10], sp(3.5, 0.55, 2.0));               // knapsack / blanket roll body
  G('gear_blanket', 'spine3', [0, 1.38, -0.085], sp(3.2, 0.5, 1.2));            // roll across the shoulder or atop the pack
  G('gear_skirt_L', 'pelvis', [0.11, 0.86, 0.0], sp(6.0, 0.35, 0.3)); G('gear_skirt_R', 'pelvis', [-0.11, 0.86, 0.0], sp(6.0, 0.35, 0.3)); G('gear_skirt_B', 'pelvis', [0, 0.86, -0.10], sp(6.0, 0.35, 0.3));
  G('gear_plume', 'head', [0.09, 1.76, -0.02], sp(7.5, 0.30, 0.1));             // hat feather / tassel / cord
  G('gear_sash_tail', 'pelvis', [0.13, 0.98, 0.07], sp(7.0, 0.30, 0.15));
  // prop bones: the weapon / pole / instrument, parented to root so ANIMATION can re-parent per frame (hand grip, shoulder, ground)
  const P = (name, head, o = {}) => add(name, 'root', head, 'prop', { limits: null, prop: true, ...o });
  P('prop_long', [-0.40, 0.0, 0.06], { note: 'rifle-musket / carbine / staff; origin at the butt-plate toe, +y = muzzle at rest (stood on the ground)' });
  P('prop_sword', [0.17, 0.92, 0.02], { note: 'sabre / officer sword / bayonet-scabbard hilt origin at the guard, blade along -y at rest' });
  P('prop_pole', [0.40, 0.0, 0.06], { note: 'flag staff; origin at the ferrule, +y up' });
  P('prop_instr', [0.0, 1.0, 0.2], { note: 'drum / fife / bugle / wigwag set' });
  const idx = Object.fromEntries(B.map((b, i) => [b.name, i]));
  return finish(B, idx, { stature_m: 1.73 });
}

// ---------------------------------------------------------------- the horse rig (documented kit data gives no horse measurement; a mount of about 15 hands is a TUNING PARAMETER, F-HORSE-SIZE)
function buildHorse() {
  const B = []; const add = (name, parent, head, group, o = {}) => { B.push({ name, parent, head, group, limits: o.limits ?? null, ...o }); };
  const HL = { x: [-60, 60], y: [-30, 30], z: [-30, 30] };
  add('root', null, [0, 0, 0], 'root'); add('pelvis', 'root', [0, 1.36, -0.48], 'spine', { limits: HL }); add('spine1', 'pelvis', [0, 1.40, -0.20], 'spine', { limits: HL }); add('spine2', 'spine1', [0, 1.44, 0.10], 'spine', { limits: HL });
  add('withers', 'spine2', [0, 1.49, 0.40], 'spine', { limits: HL });
  add('neck1', 'withers', [0, 1.46, 0.58], 'neck', { limits: { x: [-40, 50], y: [-40, 40], z: [-30, 30] } }); add('neck2', 'neck1', [0, 1.57, 0.78], 'neck', { limits: { x: [-30, 40], y: [-30, 30], z: [-20, 20] } });
  add('head', 'neck2', [0, 1.69, 0.95], 'head', { limits: { x: [-40, 50], y: [-40, 40], z: [-25, 25] } }); add('jaw', 'head', [0, 1.62, 1.12], 'face', { limits: { x: [0, 25], y: [0, 0], z: [0, 0] } });
  add('ear_L', 'head', [0.05, 1.82, 1.00], 'face', { limits: HL }); add('ear_R', 'head', [-0.05, 1.82, 1.00], 'face', { limits: HL });
  add('tail1', 'pelvis', [0, 1.37, -0.80], 'tail', { limits: HL }); add('tail2', 'tail1', [0, 1.20, -0.88], 'tail', { limits: HL }); add('tail3', 'tail2', [0, 0.98, -0.93], 'tail', { limits: HL });
  for (const s of ['L', 'R']) {
    const x = s === 'L' ? 1 : -1, m = p => [p[0] * x, p[1], p[2]];
    add('scapula_' + s, 'withers', m([0.13, 1.42, 0.46]), 'leg', { limits: HL }); add('humerus_' + s, 'scapula_' + s, m([0.15, 1.20, 0.52]), 'leg', { limits: HL });
    add('radius_' + s, 'humerus_' + s, m([0.16, 0.98, 0.50]), 'leg', { limits: { x: [-10, 140], y: [0, 0], z: [0, 0] } });
    add('fcannon_' + s, 'radius_' + s, m([0.16, 0.55, 0.52]), 'leg', { limits: { x: [-5, 60], y: [0, 0], z: [0, 0] } });
    add('fpastern_' + s, 'fcannon_' + s, m([0.16, 0.14, 0.54]), 'leg', { limits: { x: [-40, 40], y: [0, 0], z: [0, 0] } }); add('fhoof_' + s, 'fpastern_' + s, m([0.16, 0.06, 0.60]), 'leg', { limits: { x: [-30, 30], y: [0, 0], z: [0, 0] } });
    add('femur_' + s, 'pelvis', m([0.16, 1.28, -0.52]), 'leg', { limits: HL }); add('tibia_' + s, 'femur_' + s, m([0.17, 0.92, -0.38]), 'leg', { limits: { x: [-10, 140], y: [0, 0], z: [0, 0] } });
    add('hcannon_' + s, 'tibia_' + s, m([0.15, 0.52, -0.62]), 'leg', { limits: { x: [-60, 5], y: [0, 0], z: [0, 0] } });
    add('hpastern_' + s, 'hcannon_' + s, m([0.15, 0.14, -0.58]), 'leg', { limits: { x: [-40, 40], y: [0, 0], z: [0, 0] } }); add('hhoof_' + s, 'hpastern_' + s, m([0.15, 0.06, -0.52]), 'leg', { limits: { x: [-30, 30], y: [0, 0], z: [0, 0] } });
  }
  add('tack_rein_L', 'head', [0.04, 1.66, 1.10], 'gear', { spring: { freq_hz: 4, damping: 0.5, mass_rel: 0.1 } }); add('tack_rein_R', 'head', [-0.04, 1.66, 1.10], 'gear', { spring: { freq_hz: 4, damping: 0.5, mass_rel: 0.1 } });
  add('tack_saddlebag', 'spine2', [0, 1.52, -0.18], 'gear', { spring: { freq_hz: 4.5, damping: 0.5, mass_rel: 0.8 } }); add('tack_stirrup_L', 'spine2', [0.30, 1.30, 0.04], 'gear', { spring: { freq_hz: 3.5, damping: 0.5, mass_rel: 0.4 } });
  add('tack_stirrup_R', 'spine2', [-0.30, 1.30, 0.04], 'gear', { spring: { freq_hz: 3.5, damping: 0.5, mass_rel: 0.4 } });
  const idx = Object.fromEntries(B.map((b, i) => [b.name, i]));
  return finish(B, idx, { withers_height_m: 1.52 });
}

// ---------------------------------------------------------------- the gun, limber and caisson rig (dimensions from kit/weapons.json piece tables where they exist; carriage dimensions are PLAUSIBLE-PROCEDURAL, F-GUN-CARRIAGE)
function buildGun() {
  const B = []; const add = (name, parent, head, group, o = {}) => B.push({ name, parent, head, group, limits: o.limits ?? null, ...o });
  add('root', null, [0, 0, 0], 'root');
  add('carriage', 'root', [0, 0.0, 0], 'carriage', { note: 'translates back on recoil (run-out 0.5-0.6 m is a MODELLED figure, render PLAN G12), then is run up by the crew' });
  add('barrel', 'carriage', [0, 1.02, 0.0], 'tube', { limits: { x: [-10, 20], y: [0, 0], z: [0, 0] }, note: 'trunnion pivot; elevation about X; the bore points +z; positive X rotation depresses the muzzle' });
  add('elev_screw', 'carriage', [0, 0.70, -1.10], 'carriage', { limits: { x: [0, 0], y: [0, 0], z: [0, 0] } });
  add('wheel_L', 'carriage', [0.72, 0.60, 0.0], 'wheel', { limits: { x: [-360, 360], y: [0, 0], z: [0, 0] }, note: 'rolls about X; wheel diameter 1.45 m (Napoleon/3-inch wheels, PLAUSIBLE-PROCEDURAL)' });
  add('wheel_R', 'carriage', [-0.72, 0.60, 0.0], 'wheel', { limits: { x: [-360, 360], y: [0, 0], z: [0, 0] } });
  add('trail', 'carriage', [0, 0.40, -0.90], 'carriage', { limits: { x: [-5, 25], y: [-30, 30], z: [0, 0] }, note: 'trail end/handspike traversal; lunette at the tail end for the limber pintle' });
  add('limber_root', 'root', [0, 0, -2.85], 'limber', { note: 'limber (separate vehicle; hooks to the trail lunette when limbered: parent switch by ANIMATION)' });
  add('limber_wheel_L', 'limber_root', [0.72, 0.60, -2.85], 'wheel', { limits: { x: [-360, 360], y: [0, 0], z: [0, 0] } }); add('limber_wheel_R', 'limber_root', [-0.72, 0.60, -2.85], 'wheel', { limits: { x: [-360, 360], y: [0, 0], z: [0, 0] } });
  add('limber_pole', 'limber_root', [0, 0.65, -2.85], 'limber', { limits: { x: [-5, 5], y: [-35, 35], z: [-5, 5] }, note: 'draught pole toward the team (-z); swings with the team' });
  add('limber_chest_lid', 'limber_root', [0, 1.05, -2.99], 'limber', { limits: { x: [-100, 0], y: [0, 0], z: [0, 0] }, note: 'ammunition chest lid hinge, opens for the loader (crew No. 5-7)' });
  add('caisson_root', 'root', [0, 0, -6.50], 'caisson', { note: 'caisson body (two chests + spare wheel, kit weapons.json teams_and_vehicles) on its own two wheels, attached to a second limber' });
  add('caisson_wheel_L', 'caisson_root', [0.72, 0.60, -6.50], 'wheel', { limits: { x: [-360, 360], y: [0, 0], z: [0, 0] } }); add('caisson_wheel_R', 'caisson_root', [-0.72, 0.60, -6.50], 'wheel', { limits: { x: [-360, 360], y: [0, 0], z: [0, 0] } });
  add('caisson_lid', 'caisson_root', [0, 1.20, -6.30], 'caisson', { limits: { x: [-100, 0], y: [0, 0], z: [0, 0] } });
  add('spare_wheel', 'caisson_root', [0, 1.05, -7.10], 'caisson', { limits: null });
  add('rammer', 'root', [-0.55, 0.9, 0.2], 'prop', { prop: true, note: 'rammer/sponge staff for the crew (No. 1); origin at the head, +y along the staff' });
  add('handspike', 'root', [0.55, 0.9, -1.2], 'prop', { prop: true });
  const idx = Object.fromEntries(B.map((b, i) => [b.name, i]));
  return finish(B, idx, {});
}

// ---------------------------------------------------------------- common finishing: indices, local translations, tails, lengths
function finish(B, idx, extra) {
  const bones = B.map((b, i) => {
    const p = b.parent === null ? null : idx[b.parent], ph = p === null ? [0, 0, 0] : B[p].head, kids = B.filter(k => k.parent === b.name);
    const tail = b.tail ?? (kids.length ? kids[0].head : null);
    return { i, name: b.name, parent: p, group: b.group, head: b.head.map(r6), local: v3.sub(b.head, ph).map(r6), tail: tail ? tail.map(r6) : null, length: tail ? r6(v3.len(v3.sub(tail, b.head))) : 0, limits: b.limits ?? null, spring: b.spring ?? null, prop: !!b.prop, note: b.note ?? undefined };
  });
  return { bones, index: idx, ...extra };
}

// ---------------------------------------------------------------- level-of-detail bone sets: the mid LOD skins to a reduced set and bakes a small palette (render PLAN G15: bone-matrix textures, not VAT)
const MID_KEEP = ['root', 'pelvis', 'spine1', 'spine2', 'spine3', 'neck', 'head', 'clavicle_L', 'clavicle_R', 'upperarm_L', 'upperarm_R', 'forearm_L', 'forearm_R', 'hand_L', 'hand_R', 'thigh_L', 'thigh_R', 'shin_L', 'shin_R', 'foot_L', 'foot_R', 'toe_L', 'toe_R', 'gear_cartbox', 'gear_scabbard', 'gear_haversack', 'gear_canteen', 'gear_pack', 'gear_blanket', 'gear_skirt_L', 'gear_skirt_R', 'gear_skirt_B', 'prop_long', 'prop_sword', 'prop_pole', 'prop_instr'];
function midSet(rig) {
  const keep = new Set(MID_KEEP), map = new Int16Array(rig.bones.length).fill(-1), list = [];
  for (const b of rig.bones) if (keep.has(b.name)) { map[b.i] = list.length; list.push(b.i); }
  // every dropped bone maps to its nearest kept ancestor
  for (const b of rig.bones) if (map[b.i] < 0) { let p = b.parent; while (p !== null && map[p] < 0) p = rig.bones[p].parent; map[b.i] = map[p]; }
  return { bones: list, map: Array.from(map), count: list.length };
}

// ---------------------------------------------------------------- sockets (attach points the animation module aims props at; offsets are in the PARENT BONE's rest frame, metres)
function humanSockets(rig) {
  const S = (name, bone, off, note, rotdeg = [0, 0, 0]) => ({ name, bone, offset: off, rot_euler_deg: rotdeg, note });
  return [
    S('grip_R', 'hand_R', [-0.01, -0.05, 0.0], 'right-hand palm centre; the lock-side grip of a long arm / the sword grip / flag staff'), S('grip_L', 'hand_L', [0.01, -0.05, 0.0], 'left-hand palm centre; fore-end / barrel grip'),
    S('mouth', 'jaw', [0, 0.01, 0.07], 'cartridge bitten here in the nine-motion loading drill (TEAR CARTRIDGE)'), S('shoulder_R', 'spine3', [-0.185, 1.43, 0.03], 'right-shoulder rest of a long arm at carry / shoulder arms'),
    S('hip_R_front', 'pelvis', [-0.13, 0.95, 0.12], 'right hip, cap pouch / cartridge box hand reach (belt front)'), S('cap_pouch', 'pelvis', [-0.04, 0.97, 0.13], 'cap pouch on the belt front: PLACING A PERCUSSION CAP'),
    S('cartbox_reach', 'gear_cartbox', [0, 0.02, 0.04], 'cartridge-box flap: reach for the next cartridge'), S('hat_top', 'head', [0, 1.77, 0.01], 'hat crown (saluting, doffing)'),
    S('sword_hang', 'pelvis', [0.17, 0.92, 0.02], 'scabbard mouth / sword hilt rest'), S('back', 'spine3', [0, 1.30, -0.12], 'pack mount'), S('ground_L', 'foot_L', [0, -0.085, 0.06], 'sole contact for IK (ball of the foot)'), S('ground_R', 'foot_R', [0, -0.085, 0.06], 'sole contact for IK'),
    S('heel_L', 'foot_L', [0, -0.085, -0.04], 'heel contact'), S('heel_R', 'foot_R', [0, -0.085, -0.04], 'heel contact'),
  ];
}
// rifle-musket sockets in the prop_long frame (butt toe at the origin, +y muzzle): used for the nine motions (butt on the ground, muzzle, lock/nipple, ramrod channel, bayonet)
export const LONG_ARM_SOCKETS = [
  { name: 'butt', offset: [0, 0, 0] }, { name: 'wrist', offset: [0, 0.30, 0.0], note: 'small of the stock: the right-hand grip (conformed to ANIM3D-NOTES section 8: M1861 wrist 0.30 m)' }, { name: 'lock_nipple', offset: [0, 0.46, 0.03], note: 'lock 0.46 m: where the percussion cap is placed and the hammer falls (conformed to ANIM3D-NOTES section 8)' },
  { name: 'small_of_stock', offset: [0, 0.30, 0.0], note: 'same as wrist' }, { name: 'lower_band', offset: [0, 0.85, 0.012], note: 'lower band 0.85 m: the left-hand grip at aim / carry (conformed to section 8)' }, { name: 'upper_band', offset: [0, 1.15, 0.012] }, { name: 'fore_end', offset: [0, 1.15, 0.0] },
  { name: 'muzzle', offset: [0, 1.4224, 0.02], note: 'bore axis end of the 56 in. M1861: muzzle flash/smoke emitter point for the effects module' }, { name: 'ramrod_head', offset: [0, 1.30, -0.004], note: 'the ramrod head stowed under the barrel (section 8: 1.30 m)' }, { name: 'bayonet_tip', offset: [0.026, 1.879, 0.012], note: 'fixed socket bayonet, 18 in. blade (0.457 m) beyond the muzzle: the animation notes use 1.80 m; the mesh blade is the 18 in. of the weapon record' },
];

export function buildSkeletonJson() {
  const human = buildHuman(), horse = buildHorse(), gun = buildGun();
  human.sockets = humanSockets(human); human.long_arm_sockets = LONG_ARM_SOCKETS;
  human.lod = { mid: midSet(human), far: { bones: [], note: 'impostors carry no bones; their views are baked from the animation clips (ANIMATION)' } };
  human.mirror = { suffixes: ['_L', '_R'], rule: 'mirror across x=0: negate x of translations; negate the y and z Euler ranges of limits and the y,z quaternion components of poses' };
  human.ik_chains = [{ name: 'leg_L', root: 'thigh_L', mid: 'shin_L', end: 'foot_L', pole: [0, 0, 1] }, { name: 'leg_R', root: 'thigh_R', mid: 'shin_R', end: 'foot_R', pole: [0, 0, 1] },
    { name: 'arm_L', root: 'upperarm_L', mid: 'forearm_L', end: 'hand_L', pole: [0, -0.3, -1] }, { name: 'arm_R', root: 'upperarm_R', mid: 'forearm_R', end: 'hand_R', pole: [0, -0.3, -1] }];
  human.foot_geometry = { sole_below_ankle_m: 0.085, ball_forward_m: 0.14, heel_back_m: 0.05, note: 'foot-to-ground contacts for the G5 planting gate; sole offset measured from the rest pose of this rig' };
  human.root_motion = { bone: 'root', note: 'root carries the ground position/heading; pelvis carries the bob. Stance foot pinned by IK in the pose pass.' };
  horse.sockets = [{ name: 'saddle_seat', bone: 'spine2', offset: [0, 0.10, -0.06], note: 'rider pelvis socket (rider root = this socket; rider pelvis sits at rest +0.0)' }, { name: 'stirrup_L', bone: 'tack_stirrup_L', offset: [0, -0.35, 0], note: 'rider left foot' },
    { name: 'stirrup_R', bone: 'tack_stirrup_R', offset: [0, -0.35, 0], note: 'rider right foot' }, { name: 'rein_hand_L', bone: 'tack_rein_L', offset: [0.113, 0.005, -0.657], note: 'bridle hand grip: world (0.153, 1.665, 0.443) at rest = the left palm socket of rider_walk; both reins pass through this fist (socket-spec.json reins)' }, { name: 'rein_hand_R', bone: 'tack_rein_R', offset: [-0.113, 0.005, -0.657], note: 'mirror of rein_hand_L for a two-handed rider (world (-0.153, 1.665, 0.443) at rest); the cavalry rein mesh ends at the LEFT socket only' },
    { name: 'muzzle', bone: 'jaw', offset: [0, 0, 0.1], note: 'breath/dust emitter' }, { name: 'hoof_FL', bone: 'fhoof_L', offset: [0, -0.06, 0], note: 'dust emitter / ground contact' }, { name: 'hoof_FR', bone: 'fhoof_R', offset: [0, -0.06, 0] }, { name: 'hoof_HL', bone: 'hhoof_L', offset: [0, -0.06, 0] }, { name: 'hoof_HR', bone: 'hhoof_R', offset: [0, -0.06, 0] }];
  horse.rider_mount = { rider_rig: 'human', attach: 'saddle_seat', rider_pose_base: 'seated: thighs flexed about 70 degrees (hip x = -70), knees x = 80, feet to the stirrup sockets', note: 'the rider is a human rig instance whose root is parented to the horse socket; its legs are posed by ANIMATION' };
  gun.sockets = [{ name: 'muzzle', bone: 'barrel', offset: 'see gun.pieces[kind].muzzle_z_m (barrel local +z)', note: 'muzzle flash/smoke emitter' }, { name: 'vent', bone: 'barrel', offset: 'see gun.pieces[kind].vent_z_m', note: 'vent: pricking the cartridge, friction primer / lanyard' },
    { name: 'lunette', bone: 'trail', offset: [0, 0.10, -1.30], note: 'limber pintle hook; world rest position (0, 0.50, -2.20)' }, { name: 'pintle', bone: 'limber_root', offset: [0, 0.80, 0.62], note: 'receives the lunette; world rest position (0, 0.80, -2.23)' }, { name: 'handspike_socket', bone: 'trail', offset: [0, 0.2, -0.3], note: 'traverse' }];
  return {
    schema: SKELETON_VERSION, generated_by: 'docs/battle-theatre/app/src/figures3d/skeleton.mjs (node docs/battle-theatre/app/tools/figures3d-build.mjs writes this file)',
    conventions: { units: 'metres', handedness: 'right', up: '+y', forward: '+z', left: '+x', rest_pose: 'A-pose (arms 20 deg out), identity rest rotations; pose = local quaternion (x,y,z,w) relative to rest', skin_palette: 'world(bone) * inverseBind(bone); inverseBind = translate(-head)',
      euler: 'intrinsic XYZ degrees; positive X swings a downward-pointing limb backward (knee flexion x in [0,150], elbow flexion x in [-145,0], hip flexion negative); positive Z swings a downward limb toward +x (left abduction +z)',
      limits: 'per-bone ranges relative to rest for the G6 joint-limit gate; null = fixed or not limited; the _R bone has the y/z ranges mirrored', tier: 'plausible-procedural (rig layout and limit ranges are authored for this project; the limit magnitudes are common anatomical ranges quoted from memory, not from a source read in this task: TIERS.json F-RIG-LIMITS)' },
    human, horse, gun,
  };
}
export const humanRig = buildHuman(), horseRig = buildHorse(), gunRig = buildGun();
export const humanIndex = humanRig.index;
