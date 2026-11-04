// Cavalry: horse gaits on the horse rig (FK, hoof stance calibrated to the clip's ground speed), the rider's seat and sabre / carbine / pistol work on the human rig, a horse fall and idle, and the dismounted horse-holder.
// SOURCES: none of the acquired texts gives cavalry gait speeds or cavalry drill (Cooke 1862 not acquired): gaits are MODERN equestrian ranges, the rider actions are authored from the plan's description. All tier plausible-procedural,
// registered as G-ANIM-07 (gaits) and G-ANIM-08 (sabre / carbine / pistol, horse-holding).
// Frames: the rider's root is the horse's saddle_seat socket (skeleton.json horse.rider_mount); the rider's clips are authored relative to it and share the horse clip's cycle time so the pair stays in phase.
import { Rig } from './rig.mjs';
import { holdCh } from './authoring.mjs';
import { Spec } from './figure-pose.mjs';
import { keyFromSpec, keyedDef } from './clipdef.mjs';
import * as POSE from './poses.mjs';
import { qeuler, D2R, clamp, smooth } from './qmath.mjs';

export const HORSE_GAITS = {
  walk: { T: 1.10, speed: 1.55, duty: 0.70, order: { LH: 0.00, LF: 0.25, RH: 0.50, RF: 0.75 }, swingA: 18, flex: 55, bob: 0.015, pitch: 1.5, head: 6 },
  trot: { T: 0.66, speed: 3.60, duty: 0.46, order: { LF: 0.00, RH: 0.00, RF: 0.50, LH: 0.50 }, swingA: 24, flex: 80, bob: 0.045, pitch: 2.0, head: 4 },
  canter: { T: 0.56, speed: 5.60, duty: 0.40, order: { RH: 0.00, LH: 0.30, RF: 0.30, LF: 0.62 }, swingA: 28, flex: 90, bob: 0.07, pitch: 6.0, head: 8 },
  gallop: { T: 0.46, speed: 8.30, duty: 0.30, order: { RH: 0.00, LH: 0.10, RF: 0.50, LF: 0.60 }, swingA: 36, flex: 105, bob: 0.10, pitch: 8.0, head: 10 },
};
const LEG = { LF: ['scapula_L', 'humerus_L', 'radius_L', 'fcannon_L', 'fpastern_L', 'fhoof_L'], RF: ['scapula_R', 'humerus_R', 'radius_R', 'fcannon_R', 'fpastern_R', 'fhoof_R'], LH: [null, 'femur_L', 'tibia_L', 'hcannon_L', 'hpastern_L', 'hhoof_L'], RH: [null, 'femur_R', 'tibia_R', 'hcannon_R', 'hpastern_R', 'hhoof_R'] };

// horse pose by FK. out = Float32Array(rig.frameLen) frame. Angles in degrees; positive x swings a hanging limb backward.
export function horseFrame(rig, gait, t, out, calib = 1) {
  const G = HORSE_GAITS[gait], phi = t / G.T, eu = new Float64Array(4); out.fill(0); for (let s = 0; s < rig.nCore; s++) out[s * 4 + 3] = 1;
  const setE = (name, x, y = 0, z = 0) => { const b = rig.index[name]; if (b === undefined) return; const s = rig.coreSlot[b]; if (s < 0) return; qeuler(eu, 0, x * D2R, y * D2R, z * D2R); out[s * 4] = eu[0]; out[s * 4 + 1] = eu[1]; out[s * 4 + 2] = eu[2]; out[s * 4 + 3] = eu[3]; };
  const A = G.swingA * calib;
  for (const leg of ['LF', 'RF', 'LH', 'RH']) {
    const ph = ((phi - G.order[leg]) % 1 + 1) % 1, fore = leg[1] === 'F', names = LEG[leg]; let a, f1, f2, f3;
    if (ph < G.duty) { const u = ph / G.duty; a = -A + 2 * A * u; f1 = 6 + 8 * Math.sin(Math.PI * u) * 0.0; f2 = 0; f3 = 0; }                 // stance: the limb sweeps back, hoof flat
    else { const u = (ph - G.duty) / (1 - G.duty); a = A - 2 * A * smooth(0, 1, u); f1 = G.flex * Math.sin(Math.PI * u) ** 1.2; f2 = 0.5 * f1; f3 = 0.3 * f1; }
    if (fore) { setE(names[0], a * 0.35); setE(names[1], a * 0.65); setE(names[2], 6 + f1 * 1.0); setE(names[3], f2 * 0.45); setE(names[4], -f3 * 0.2); setE(names[5], -a * 0.15 + f3 * 0.1); }
    else { setE(names[1], a * 0.8); setE(names[2], clamp(8 + f1 * 0.9 + a * 0.2, 0, 135)); setE(names[3], -clamp(f2 * 0.8 + a * 0.15, 0, 55)); setE(names[4], f3 * 0.2); setE(names[5], a * 0.1); }
  }
  const bob = G.bob * Math.sin(4 * Math.PI * phi + 0.5), pitch = G.pitch * Math.sin(2 * Math.PI * phi + 1.0);
  setE('pelvis', pitch * 0.4, 0, 1.2 * Math.sin(2 * Math.PI * phi)); setE('spine1', pitch * 0.3); setE('spine2', pitch * 0.2); setE('withers', -pitch * 0.2);
  setE('neck1', -G.head * Math.sin(2 * Math.PI * phi + 2) * 0.5 + 5); setE('neck2', G.head * Math.sin(2 * Math.PI * phi + 2.3) * 0.5); setE('head', -4 + 3 * Math.sin(2 * Math.PI * phi + 2.6));
  setE('tail1', 10 + 6 * Math.sin(2 * Math.PI * phi + 3)); setE('tail2', 8 * Math.sin(2 * Math.PI * phi + 3.4)); setE('tail3', 8 * Math.sin(2 * Math.PI * phi + 3.8));
  // the pelvis translation slot (bob): trans[pelvis]
  const ts = rig.transSlot[rig.index.pelvis]; if (ts >= 0) out[rig.OFF_TRANS + ts * 3 + 1] = bob;
  return out;
}

// horse def: calibrate the swing amplitude so that the mean stance hoof speed relative to the body equals the gait speed (the hoof does not slide on the ground)
export function horseDef(rig, gait) {
  const G = HORSE_GAITS[gait]; let calib = 1; const probe = new Float32Array(rig.frameLen);
  const fk = rig.newFK(), pose = rig.newPose();
  const hoofZ = (t, leg) => { horseFrame(rig, gait, t, probe, calib); rig.expandFrame(probe, pose); rig.fk(pose, fk); const b = rig.index[LEG[leg][5]]; return fk.wp[b * 3 + 2]; };
  for (let it = 0; it < 6; it++) { // secant on calib: stance travel of one hoof per cycle must be speed * T * duty ... measured mid-stance
    const leg = 'LF', t0 = G.order[leg] * G.T + 0.15 * G.duty * G.T, t1 = G.order[leg] * G.T + 0.85 * G.duty * G.T; const dz = hoofZ(t0, leg) - hoofZ(t1, leg), want = G.speed * (t1 - t0);
    if (Math.abs(dz) < 1e-6) break; calib = clamp(calib * want / dz, 0.3, 2.2);
  }
  return { id: 'horse_' + gait, loop: true, dur: G.T, fps: 60, family: 'horse', rig: 'horse', propB: null, eval: null, bakeFrame: (t, out) => horseFrame(rig, gait, t, out, calib),
    meta: { label: 'Horse ' + gait, gait, rootSpeed: G.speed, cycleS: G.T, duty: G.duty, calib, tier: 'plausible-procedural', gap: 'G-ANIM-07', src: [], note: 'modern equestrian gait ranges; stance hoof speed calibrated to the gait speed (the slip test measures the residual)' } };
}
export function horseIdleDef(rig) {
  return { id: 'horse_idle', loop: true, dur: 6, fps: 30, family: 'horse', rig: 'horse', bakeFrame: (t, out) => { horseFrame(rig, 'walk', 0, out, 0.0001); const w = 2 * Math.PI * t / 6; const eu = new Float64Array(4); const set = (n, x, y = 0, z = 0) => { const b = rig.index[n], s = rig.coreSlot[b]; qeuler(eu, 0, x * D2R, y * D2R, z * D2R); out[s * 4] = eu[0]; out[s * 4 + 1] = eu[1]; out[s * 4 + 2] = eu[2]; out[s * 4 + 3] = eu[3]; };
    set('neck1', 8 + 3 * Math.sin(w)); set('head', -6 + 4 * Math.sin(w)); set('tail1', 12 + 5 * Math.sin(w * 2)); set('ear_L', 10 * Math.sin(w * 3)); set('ear_R', -8 * Math.sin(w * 2)); set('spine2', 0.6 * Math.sin(w * 2)); return out; },
    meta: { label: 'Horse standing (breathing, head and tail movement)', tier: 'plausible-procedural', rootSpeed: 0, gap: 'G-ANIM-07', src: [] } };
}
export function horseFallDef(rig) {
  const dur = 1.4; return { id: 'horse_fall', loop: false, dur, fps: 60, family: 'horse', rig: 'horse', bakeFrame: (t, out) => { horseFrame(rig, 'gallop', 0.0, out, 0.0001); const u = clamp(t / dur, 0, 1), s = smooth(0.1, 0.8, u), eu = new Float64Array(4);
    const set = (n, x, y = 0, z = 0) => { const b = rig.index[n]; const sl = rig.coreSlot[b]; qeuler(eu, 0, x * D2R, y * D2R, z * D2R); out[sl * 4] = eu[0]; out[sl * 4 + 1] = eu[1]; out[sl * 4 + 2] = eu[2]; out[sl * 4 + 3] = eu[3]; };
    set('root', 0, 0, -88 * s); const ts = rig.transSlot[0]; out[rig.OFF_TRANS + ts * 3] = -0.55 * s; out[rig.OFF_TRANS + ts * 3 + 1] = 0.5 * s;
    for (const n of ['humerus_L', 'humerus_R']) set(n, -30 * s); for (const n of ['radius_L', 'radius_R']) set(n, 60 * s); for (const n of ['femur_L', 'femur_R']) set(n, 25 * s); set('neck1', -20 * s); set('head', -25 * s); return out; },
    meta: { label: 'Horse falls onto its side (authored)', tier: 'plausible-procedural', gap: 'G-ANIM-10', src: [], rootSpeed: 0 } };
}

// ---- riders (human rig). Seated: pelvis at the saddle, thighs flexed, feet in the stirrups; the clips share the horse clip's cycle time
const SEAT = { pel: [0, -0.80, 0], fl: [0.30, -0.50, -0.06], fr: [-0.30, -0.50, -0.06] };
function riderBase(spec = new Spec()) { POSE.attention(spec); spec.set('pel', ...SEAT.pel).set('pelE', 0, 0, 0).set('fl', ...SEAT.fl).set('fr', ...SEAT.fr).set('fle', -10, 12, 0).set('fre', -10, -12, 0).set('lcont', 0).set('rcont', 0).set('rhwa', 0).set('lhwa', 0);
  spec.set('lhp', 0.15, 0.10, 0.42).set('rhp', -0.12, 0.10, 0.34).set('spE', 6, 0, 0).set('lep', 0.5, -1, -0.2).set('rep', -0.5, -1, -0.2).set('rp', -0.25, 0.1, 0.1).set('ra', 0, 0, 0).set('rfr', 0); return spec; }
export function riderGaitDef(gait) {
  const G = HORSE_GAITS[gait], lean = { walk: 3, trot: 7, canter: 12, gallop: 22 }[gait], absorb = { walk: 0.006, trot: 0.04, canter: 0.05, gallop: 0.035 }[gait];
  return { id: 'rider_' + gait, loop: true, dur: G.T, fps: 60, family: 'rider', propB: 'prop_sword', rig: 'human',
    eval(t, spec) { riderBase(spec); const w = 2 * Math.PI * t / G.T, up = absorb * Math.sin(2 * w + 0.4), sw = gait === 'trot' ? 0.045 * Math.sin(w) : 0.01 * Math.sin(w);
      spec.set('pel', 0, SEAT.pel[1] + up, 0).set('spE', lean - 4 * up * 20, 0, 0).set('pelE', 0, 0, 1.5 * Math.sin(w)).set('hdE', -lean * 0.6 + 2 * Math.sin(2 * w), 0, 0)
        .set('lhp', 0.15, 0.10 + 0.6 * up, 0.42 + 0.02 * Math.sin(w)).set('rp', -0.25, 0.1 + sw, 0.1); },
    meta: { label: 'Rider seat at the ' + gait, pairedWith: 'horse_' + gait, cycleS: G.T, tier: 'plausible-procedural', gap: 'G-ANIM-07', src: [], rootSpeed: 0 } };
}
const SW = (s) => s; // marker for readability
export function riderActionDefs() {
  const D = [], base = riderBase(new Spec()), tr = (id, label, steps, meta = {}) => { let t = 0; const keys = [keyFromSpec(0, steps[0][1])]; for (let i = 1; i < steps.length; i++) { t += steps[i][0]; keys.push(keyFromSpec(t, steps[i][1], steps[i][2] || 'smooth')); } return keyedDef({ id, dur: t, loop: !!meta.loop, base: steps[0][1], keys, propB: 'prop_sword', family: 'rider', meta: { label, tier: 'plausible-procedural', gap: 'G-ANIM-08', src: [], ...meta } }); };
  const mod = (b, f) => { const s = new Spec(); s.v.set(b.v); f(s); return s; };
  // HAND-ANCHORED SABRE: the right hand grips the hilt 0.12 m from the guard; the keys give the hand and the direction of the BLADE (the sabre prop's +y runs from the guard to the pommel, the blade is along -y). The first round keyed the guard
  // 0.2-0.6 m from the saddle with the hand at the same place, the scabbard at -0.55 m (below the saddle) and the point 0.75 m from the shoulder: the draw was dragged 61 cm, the cut 24 cm, the point 21 cm (ANIM3D-NOTES 11.1).
  const SAB = (R, blade, extra = {}) => holdCh({ which: 'B', frame: 0, R, rg: 0.12, dir: [-blade[0], -blade[1], -blade[2]], ...extra });
  const put = (spec, ch) => { for (const [k, v] of Object.entries(ch)) spec.set(k, ...v); return spec; };
  const HILT = [0.02, 0.18, 0.22], SHEATH_BLADE = [0.0, -0.9, -0.4];
  const sheathed = mod(base, s => { put(s, SAB(HILT, SHEATH_BLADE)); s.set('hold', 0).set('rhwb', 0).set('lhwb', 0); });                // the sabre in the scabbard at the left hip, nobody holds it
  const gripHilt = mod(sheathed, s => s.set('rhwb', 1).set('rhp', ...HILT).set('rep', -0.9, -0.2, 0));                              // the right hand arrives on the hilt (hold still off: the sabre has not moved)
  const gripHeld = mod(gripHilt, s => put(s, SAB(HILT, SHEATH_BLADE)));                                                                // the same instant, hand-anchored
  const carry = mod(base, s => { put(s, SAB([-0.18, 0.15, 0.20], [0.0, 0.95, 0.30])); s.set('rep', -0.8, -0.5, -0.3); });
  const carryUp = mod(carry, s => put(s, SAB([-0.18, 0.20, 0.24], [0.0, 0.98, 0.15])));
  const drawn = mod(carry, s => { put(s, SAB([-0.06, 0.42, 0.30], [0.05, 0.85, 0.5])); s.set('rep', -1, -0.3, 0); });
  const rightCut0 = mod(carry, s => { put(s, SAB([-0.30, 0.50, 0.22], [-0.40, 0.90, 0.20])); s.set('rep', -1, 0, 0).set('spE', 6, -20, 0); });
  const rightCut1 = mod(carry, s => { put(s, SAB([-0.42, 0.28, 0.30], [-0.30, -0.20, 0.93])); s.set('spE', 12, 24, 0).set('rep', -0.4, -0.8, -0.2); });
  const point = mod(carry, s => { put(s, SAB([-0.18, 0.38, 0.44], [0.0, -0.10, 1.0])); s.set('spE', 20, 0, 0).set('rep', -0.4, -0.7, -0.3); });
  D.push(tr('rider_sabre_draw', 'Draw sabre from the scabbard and bring it to the carry', [[0, sheathed], [0.22, gripHilt, 'snap'], [0.02, gripHeld], [0.30, drawn], [0.46, carry]], { rider: 'sabre' }));
  D.push(tr('rider_sabre_carry', 'Sabre at the carry (loop)', [[0, carry], [1.5, carryUp], [1.5, carry]], { loop: true, rider: 'sabre' }));
  D.push(tr('rider_sabre_cut_right', 'Sabre cut to the right', [[0, carry], [0.30, rightCut0], [0.16, rightCut1, 'fast'], [0.34, carry]], { rider: 'sabre' }));
  D.push(tr('rider_sabre_point', 'Charge: sabre at the point', [[0, carry], [0.35, point], [0.8, mod(point, s => put(s, SAB([-0.18, 0.38, 0.46], [0.0, -0.10, 1.0])))], [0.4, carry]], { rider: 'sabre' }));
  const carb = mod(base, s => s.set('rp', 0.0, 0.05, 0.35).set('ra', 80, 10, 0).set('rref', 0.35).set('rhwa', 1).set('rhga', 0.35).set('lhwa', 1).set('lhga', 0.62).set('rfr', 0).set('spE', 8, -10, 0));
  const carbAim = mod(carb, s => s.set('rp', -0.1, 0.62, 0.40).set('ra', 86, 8, 0).set('rref', 0.30).set('rhga', 0.30).set('hdE', 4, -20, 6));
  D.push(tr('rider_carbine_fire', 'Carbine fired from the saddle (aim, fire, recover)', [[0, carb], [0.5, carbAim], [0.5, carbAim], [0.1, mod(carbAim, s => s.set('rp', -0.1, 0.62, 0.34).set('ra', 91, 8, 0)), 'fast'], [0.5, carb]], { rider: 'carbine', fire: true, fireAtS: 1.1 }));
  const pist = mod(base, s => s.set('rhwb', 1).set('rhgb', 0.05).set('bp', -0.1, 0.55, 0.45).set('ba', 90, 5, 0).set('rep', -0.6, -0.7, -0.2));
  D.push(tr('rider_pistol_fire', 'Revolver fired from the saddle', [[0, base], [0.4, pist], [0.2, mod(pist, s => s.set('ba', 95, 5, 0)), 'fast'], [0.4, base]], { rider: 'handgun', fire: true, fireAtS: 0.5 }));
  const cmdPose = mod(carry, s => { put(s, SAB([-0.22, 0.40, 0.42], [0.2, 0.10, 0.97])); s.set('hdE', 0, -25, 0); });
  D.push(tr('rider_command', 'Mounted officer points with the sabre', [[0, carry], [0.45, cmdPose], [0.9, cmdPose], [0.4, carry]], { rider: 'sabre' }));
  // dismounted horse-holder: one man holds the horses of four (every fourth man holds horses: plan B.2 July 1)
  const hold = mod(POSE.shoulderArms(new Spec()), s => s.set('rhwa', 0).set('lhwa', 0).set('rhp', -0.22, 0.95, 0.34).set('lhp', 0.20, 1.0, 0.30).set('rep', -0.4, -0.6, -0.2).set('lep', 0.4, -0.6, -0.2).set('rp', -0.4, 0.0, 0.2).set('rfr', 0));
  D.push(keyedDef({ id: 'horse_holder', dur: 6, loop: true, base: hold, keys: [keyFromSpec(0, hold), keyFromSpec(3, mod(hold, s => s.set('rhp', -0.22, 0.97, 0.40).set('lhp', 0.20, 1.03, 0.34).set('hdE', 0, 18, 0))), keyFromSpec(6, hold)], propB: 'prop_sword', family: 'cavalry',
    meta: { label: 'Horse-holder (dismounted, holds the reins of the horses)', tier: 'plausible-procedural', gap: 'G-ANIM-08', src: ['PDF July 1: every fourth man holds horses'] } }));
  return D;
}
export const CAVALRY_NOTE = 'Gait speeds are modern equestrian ranges; see G-ANIM-07.';
export { Rig, SW };
