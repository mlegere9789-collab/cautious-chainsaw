// The detachment of a field piece serving the gun: gunner, Nos. 1-8 and the chief of the piece. Source of the duties and order: Instruction for Field Artillery (1860 Light Artillery Board, printed 1863), School of the Piece
// paras 93-131 (drill_artillery.json ART-FA-01..ART-FA-97): Load (sponge, load, ram, point) - Ready (prick, insert primer) - Fire - run up. Timing: the cycle length comes from the fire plan (Gibbon 30-40 s for a 6-pdr, 60 s for a
// 12-pdr, mean one a minute, 2-3 a minute when pressed; planning figure 2 shot or 3 canisters a minute); the relative lengths of the steps come from the printed motion counts where there are any (sponge 4, ram 3) and are
// plausible-procedural otherwise (drill-tables.mjs GUN_STEPS).
// Frames: each role's clip is authored AT HIS WORKING PLACE (the formation layer walks him there with the locomotion clips); the root is turned toward the piece (rootE yaw) and hands/staffs are written in the CHEST frame.
// Props (rig sockets): prop_pole = sponge-and-rammer staff (No. 1) or handspike (gunner); prop_instr = the round carried by Nos. 2, 5, 6, 7; prop_long = the priming wire / lanyard (No. 3, 4).
import { Spec } from './figure-pose.mjs';
import { keyFromSpec, keyedDef, Keyed } from './clipdef.mjs';
import * as POSE from './poses.mjs';
import { GUN_STEPS, crewPosts } from './drill-tables.mjs';
import { holdCh } from './authoring.mjs';

export const GUN_CYCLE_NOMINAL_S = 40;
export const GUN_STEP_IDS = GUN_STEPS.map(s => s.id);
export function gunStepDurations(cycleS, out = {}) { const wsum = GUN_STEPS.reduce((a, s) => a + s.w, 0); for (const s of GUN_STEPS) out[s.id] = cycleS * s.w / wsum; out.total = cycleS; return out; }
export function gunSegments(cycleS) { const D = gunStepDurations(cycleS); let t = 0; return GUN_STEPS.map(s => { const r = { id: s.id, t0: t, t1: t + D[s.id], dur: D[s.id], tier: s.tier, src: s.src }; t += D[s.id]; return r; }); }

// base standing pose of a crew member turned toward the piece by `yaw` degrees (the whole body through the root), arms free
function crewBase(yaw) { const s = POSE.attention(new Spec()); s.set('ffr', 1).set('rootE', 0, yaw, 0).set('hfr', 1).set('rfr', 1).set('bfr', 1).set('rep', -0.4, -1, -0.2).set('lep', 0.4, -1, -0.2)
  .set('rhp', -0.26, -0.42, 0.05).set('lhp', 0.26, -0.42, 0.05).set('rhwa', 0).set('lhwa', 0).set('rhwb', 0).set('lhwb', 0); return s; }
const put = (s, ch) => { for (const [k, v] of Object.entries(ch)) s.set(k, ...v); return s; };

// HAND-ANCHORED PROPS. Every prop the crew holds is keyed by where the HANDS are (chest frame, metres, within the reach of the arms: ANIM3D-NOTES 11.1), and the prop follows (figure-pose.mjs `hold`).
// The first round keyed the prop by its origin and put the grips 0.8 to 1.6 m along it from there: the sponge-and-rammer staff was keyed with its head 0.6 m ahead of the chest and its axis pointing forward, so the hands were
// asked for points up to 1.8 m from the shoulders and the solver dragged the staff to the hands (111 cm for No. 1, 82 cm for the gunner, 38 cm for No. 2, 24 cm for No. 3, 18 cm for No. 6).
const HB = o => holdCh({ which: 'B', frame: 1, ...o }), HA = o => holdCh({ which: 'A', frame: 1, ...o });
// No. 1: the sponge-and-rammer staff (head = origin, right grip 1.0 m from the head, left grip 0.27 m nearer the head)
const SG = 1.0, SG_L = SG - 0.27;
const STAFF_REST = HB({ R: [-0.25, -0.26, 0.18], rg: SG, dir: [0, 1, 0.03], lg: SG_L });                                       // upright at the side, the head on the ground (hand 1.0 m above it)
const STAFF_UP = HB({ R: [-0.20, -0.23, 0.20], L: [0.04, -0.15, 0.27], rg: SG });                                              // coming up to the horizontal
const STAFF_P1 = HB({ R: [-0.14, -0.20, 0.22], L: [0.12, -0.18, 0.30], rg: SG });                                              // horizontal across the front, head to the left
const STAFF_P2 = HB({ R: [-0.08, -0.17, 0.30], L: [0.17, -0.15, 0.38], rg: SG });                                              // thrust: the arms a hand further, the body lunges (pel z)
const STAFF_LOW = HB({ R: [-0.14, -0.26, 0.18], L: [0.10, -0.24, 0.24], rg: SG });                                             // lowered while No. 2 loads
// No. 2, 5, 6, 7, 8: a round in both hands (right grip 0.30 m from its base, hands 0.24 apart)
const RG = 0.30;
const ROUND = (x = 0.12, y = -0.20, z = 0.30) => HB({ R: [-x, y, z], L: [x, y, z], rg: RG });
const ROUND_OUT = ROUND(0.10, -0.12, 0.45);
// the right hand holding a wire (No. 3) or a spike (gunner): prop A
const WIRE = (R, dir) => HA({ R, rg: 0.05, dir, lg: 0.0 });
const SPIKE = (R, dir, rg) => HA({ R, rg, dir, lg: 0.0 });

// each role: { yaw, post, workPos (gun frame), props, steps: { stepId: [ [frac, channels], ... ] } }; channels are written over the previous key (Keyed semantics)
const ROLES = {
  n1: { yaw: 90, label: 'No. 1: sponges and rams', prop: 'prop_pole', propKind: 'sponge_rammer', work: [-0.45, 1.45], base: s => put(s, STAFF_REST),
    steps: {
      sponge: [[0.0, { ...STAFF_UP, spE: [6, 0, 0] }], [0.35, STAFF_P1], [0.55, { ...STAFF_P2, pel: [0, -0.10, 0.34], spE: [26, 0, 0] }], [0.75, { ...STAFF_P2, pel: [0, -0.10, 0.34] }], [1.0, { ...STAFF_P1, pel: [0, 0, 0], spE: [6, 0, 0] }]],
      load: [[0.5, STAFF_LOW], [1.0, { ...STAFF_REST, lhwb: [0] }]],
      ram: [[0.25, STAFF_P1], [0.65, { ...STAFF_P2, spE: [30, 0, 0], pelE: [10, 0, 0], pel: [0, -0.14, 0.42] }], [1.0, { ...STAFF_P1, spE: [8, 0, 0], pelE: [0, 0, 0], pel: [0, 0, 0] }]],
      point: [[1.0, { ...STAFF_REST, lhwb: [0], spE: [0, 0, 0] }]],
      ready: [[0.5, { ...STAFF_REST, rootE: [0, 70, 0], pel: [0, -0.12, 0] }], [1.0, {}]],
      fire: [[1.0, {}]],
      run_up: [[0.4, { pel: [0, -0.30, 0], rootE: [0, 90, 0] }], [0.7, { pel: [0, 0, 0], ...STAFF_REST }], [1.0, { ...STAFF_REST }]],
    } },
  n2: { yaw: -90, label: 'No. 2: loads', prop: 'prop_instr', propKind: 'round', work: [0.45, 1.45], base: s => put(s, ROUND()),
    steps: {
      sponge: [[0.5, { spE: [4, 0, 0] }], [1.0, {}]],
      load: [[0.0, ROUND()], [0.5, { ...ROUND_OUT, spE: [14, 0, 0] }], [0.75, ROUND_OUT], [1.0, { ...ROUND(), spE: [4, 0, 0] }]],
      ram: [[1.0, { spE: [0, 0, 0] }]], point: [[1.0, {}]], ready: [[1.0, { pel: [0, -0.05, 0] }]], fire: [[1.0, {}]], run_up: [[0.5, { pel: [0, -0.2, 0], spE: [20, 0, 0] }], [1.0, { pel: [0, 0, 0], spE: [0, 0, 0] }]],
    } },
  n3: { yaw: 90, label: 'No. 3: serves the vent, shifts the trail, pricks the cartridge', prop: 'prop_long', propKind: 'priming_wire', work: [-0.45, -0.45], base: s => put(s, WIRE([-0.22, -0.28, 0.24], [0.1, -0.6, 0.8])),
    steps: {
      sponge: [[0.3, { lhp: [0.25, 0.0, 0.40], lep: [0.5, -1, 0], spE: [8, 0, 0] }], [1.0, { lhp: [0.25, 0.0, 0.40] }]],
      load: [[0.9, { lhp: [0.25, 0.0, 0.40] }], [1.0, { lhp: [0.26, -0.42, 0.05], spE: [0, 0, 0] }]],
      ram: [[1.0, {}]],
      point: [[0.3, { ...WIRE([-0.20, -0.22, 0.34], [0.1, -0.6, 0.8]), lhp: [0.10, -0.40, 0.40], spE: [28, 0, 0], pel: [0, -0.10, 0.1], pelE: [10, 0, 0] }], [0.7, {}], [1.0, { ...WIRE([-0.22, -0.28, 0.24], [0.1, -0.6, 0.8]), lhp: [0.26, -0.42, 0.05], spE: [0, 0, 0], pel: [0, 0, 0], pelE: [0, 0, 0] }]],
      ready: [[0.4, { ...WIRE([-0.10, 0.0, 0.42], [0.0, -0.5, 0.85]), spE: [8, 0, 0] }], [1.0, { lhp: [0.25, 0.0, 0.40] }]],
      fire: [[0.2, { ...WIRE([-0.22, -0.28, 0.24], [0.1, -0.6, 0.8]), lhp: [0.26, -0.42, 0.05], rootE: [0, 40, 0] }], [1.0, { rootE: [0, 40, 0] }]],
      run_up: [[0.4, { rootE: [0, 90, 0], lhp: [-0.1, -0.45, 0.35], spE: [20, 0, 0] }], [1.0, { lhp: [0.26, -0.42, 0.05], spE: [0, 0, 0] }]],
    } },
  n4: { yaw: -90, label: 'No. 4: primes and fires (lanyard)', prop: 'prop_long', propKind: 'lanyard', work: [0.45, -0.45], base: s => s.set('bfr', 1).set('rp', 0.3, -0.7, 0.2).set('ra', 0, 0, 0).set('rfr', 1),
    steps: {
      sponge: [[1.0, {}]], load: [[1.0, { rhp: [0.0, -0.3, 0.1], rep: [-0.5, -1, 0], spE: [6, 0, 0] }]], ram: [[1.0, {}]], point: [[1.0, { rhp: [-0.26, -0.42, 0.05] }]],
      ready: [[0.4, { rhp: [-0.12, 0.0, 0.42], spE: [10, 0, 0] }], [1.0, { rhp: [-0.30, -0.35, 0.25], spE: [0, 0, 0] }]],
      fire: [[0.05, { rhp: [-0.30, -0.35, 0.25] }], [0.5, { rhp: [-0.40, -0.30, -0.05], spE: [-6, 0, 0], rootE: [0, -110, 0] }], [1.0, { rhp: [-0.30, -0.42, 0.05], rootE: [0, -90, 0], spE: [0, 0, 0] }]],
      run_up: [[0.5, { rootE: [0, -90, 0], rhp: [0.4, -0.45, 0.35], lhp: [0.1, -0.45, 0.35], spE: [20, 0, 0] }], [1.0, { rhp: [-0.26, -0.42, 0.05], lhp: [0.26, -0.42, 0.05], spE: [0, 0, 0] }]],
    } },
  gunner: { yaw: 0, label: 'Gunner: points, gives the commands', prop: 'prop_long', propKind: 'handspike', work: [0, -2.6], base: s => put(s, SPIKE([-0.28, -0.30, 0.12], [0.05, 1.0, 0.0], 0.9)),
    steps: {
      sponge: [[1.0, {}]], load: [[1.0, {}]], ram: [[1.0, {}]],
      point: [[0.2, { ...SPIKE([-0.25, -0.10, 0.35], [0, 0.75, -0.66], 1.55), lhp: [0.2, -0.1, 0.45], spE: [12, 0, 0] }], [0.55, { ...SPIKE([-0.22, -0.08, 0.40], [0.18, 0.74, -0.65], 1.55), hdE: [10, 0, 0] }], [0.8, { ...SPIKE([-0.22, -0.08, 0.40], [-0.12, 0.75, -0.65], 1.55), hdE: [8, 0, 0] }], [0.88, SPIKE([-0.25, -0.10, 0.35], [0, 0.75, -0.66], 1.55)], [1.0, { ...SPIKE([-0.28, -0.30, 0.12], [0.05, 1.0, 0.0], 0.9), lhp: [0.26, -0.42, 0.05], hdE: [0, 0, 0], spE: [0, 0, 0] }]],
      ready: [[0.5, { lhp: [0.30, 0.3, 0.30], lep: [1, 0, 0] }], [1.0, { lhp: [0.26, -0.42, 0.05] }]],
      fire: [[0.3, { lhp: [0.30, 0.2, 0.25] }], [1.0, { lhp: [0.26, -0.42, 0.05] }]], run_up: [[1.0, {}]],
    } },
  n5: { yaw: 0, label: 'No. 5: carries the round from the limber to No. 2', prop: 'prop_instr', propKind: 'round', work: [1.4, -4.6], base: s => put(s, ROUND(0.12, -0.22, 0.28)),
    steps: { sponge: [[1.0, {}]], load: [[0.5, { ...ROUND(0.10, -0.18, 0.40), rootE: [0, 90, 0] }], [1.0, { ...ROUND(0.12, -0.22, 0.28), rootE: [0, 90, 0] }]], ram: [[1.0, {}]], point: [[1.0, { rootE: [0, 0, 0] }]], ready: [[0.5, ROUND(0.10, -0.18, 0.36)], [1.0, ROUND(0.12, -0.22, 0.28)]], fire: [[1.0, {}]], run_up: [[1.0, {}]] } },
  n6: { yaw: 0, label: 'No. 6: at the limber chest, cuts fuzes and issues rounds', prop: 'prop_instr', propKind: 'round', work: [0.0, -5.1], base: s => put(s.set('spE', 20, 0, 0).set('hdE', 15, 0, 0).set('pel', 0, -0.05, 0.05), ROUND(0.12, -0.22, 0.30)),
    steps: { sponge: [[0.5, ROUND(0.12, -0.25, 0.30)], [1.0, ROUND(0.12, -0.22, 0.30)]], load: [[0.5, { spE: [30, 0, 0], ...ROUND(0.12, -0.26, 0.30) }], [1.0, { spE: [8, 0, 0], ...ROUND(0.12, -0.20, 0.38) }]], ram: [[1.0, { spE: [20, 0, 0], ...ROUND(0.12, -0.22, 0.30) }]], point: [[1.0, {}]], ready: [[1.0, { spE: [24, 0, 0] }]], fire: [[1.0, {}]], run_up: [[1.0, { spE: [20, 0, 0] }]] } },
  n7: { yaw: 0, label: 'No. 7: assists No. 6', prop: 'prop_instr', propKind: 'round', work: [0.9, -5.1], base: s => put(s.set('spE', 18, 0, 0).set('hdE', 12, 0, 0), ROUND(0.12, -0.22, 0.30)),
    steps: { sponge: [[1.0, {}]], load: [[1.0, { spE: [10, 0, 0] }]], ram: [[1.0, { spE: [22, 0, 0] }]], point: [[1.0, {}]], ready: [[1.0, {}]], fire: [[1.0, {}]], run_up: [[1.0, {}]] } },
  n8: { yaw: 0, label: 'No. 8: chief of the caisson', prop: 'prop_instr', propKind: 'round', work: [0.9, -9.1], base: s => put(s.set('spE', 14, 0, 0), ROUND(0.12, -0.22, 0.30)),
    steps: { sponge: [[1.0, {}]], load: [[1.0, {}]], ram: [[1.0, { spE: [20, 0, 0] }]], point: [[1.0, {}]], ready: [[1.0, {}]], fire: [[1.0, {}]], run_up: [[1.0, {}]] } },
  chief: { yaw: 0, label: 'Chief of the piece: observes the fall of shot, repeats the commands', prop: 'prop_sword', propKind: 'sword', work: [1.9, -2.0], base: s => s.set('bfr', 1).set('hfr', 1),
    steps: { sponge: [[1.0, {}]], load: [[1.0, {}]], ram: [[1.0, {}]], point: [[1.0, {}]], ready: [[0.5, { rhp: [-0.20, 0.35, 0.35], rhwa: 0, rep: [-1, 0, 0], hdE: [0, 20, 0] }], [1.0, {}]], fire: [[0.3, { rhp: [-0.20, 0.35, 0.35], hdE: [0, -20, 0] }], [1.0, { rhp: [-0.26, -0.42, 0.05], hdE: [0, 0, 0] }]], run_up: [[1.0, {}]] } },
};
export const GUN_ROLES = Object.keys(ROLES);

export function gunRoleDef(role, cycleS = GUN_CYCLE_NOMINAL_S) {
  const R = ROLES[role], seg = gunSegments(cycleS), base = crewBase(R.yaw); R.base(base);
  const keys = [keyFromSpec(0, base)]; const posts = crewPosts();
  for (const sg of seg) {
    const list = R.steps[sg.id] || [[1.0, {}]];
    for (const [frac, ch] of list) keys.push({ t: sg.t0 + frac * sg.dur, ch, ease: 'smooth' });
  }
  keys.push(keyFromSpec(cycleS + 1e-3, base)); // the loop closes on the first pose
  const kd = new Keyed(base, keys);
  const props = {}; props[R.prop] = R.propKind;
  return { id: 'gun_crew_' + role, dur: cycleS, loop: true, fps: 30, propB: R.prop === 'prop_long' ? 'prop_sword' : R.prop, family: 'artillery', eval: (t, spec) => kd.eval(t, spec),
    meta: { label: R.label, role, cycleS, segments: seg, props, tier: 'plausible-procedural', src: ['ART-FA-01', 'ART-FA-12', 'ART-FA-15', 'ART-FA-20..46', 'ART-FA-50..55'], gap: 'G-ANIM-01', workPos: R.work, post: posts[role] || null,
      note: 'duties and order documented (ART-FA); the coordinates and the time between motions are authored; the clip is at the working place, the formation layer walks the man there' } };
}
export function artilleryDefs() { return GUN_ROLES.map(r => gunRoleDef(r)); }

// the carriage recoil and run-up as a pure function of the time since the shot (the gun renderer applies it to the carriage bone); the distance range is plausible-procedural (G-ANIM-04)
export function gunRecoil(tSinceShot, recoilM = 1.2, out = [0, 0]) {
  const back = 0.28, hold = 0.15, up = 1.8; let z = 0, elev = 0;
  if (tSinceShot < 0) z = 0; else if (tSinceShot < back) { const u = tSinceShot / back; z = recoilM * (1 - (1 - u) * (1 - u)); elev = 1.4 * Math.sin(Math.PI * u); }
  else if (tSinceShot < back + hold) z = recoilM; else if (tSinceShot < back + hold + up) { const u = (tSinceShot - back - hold) / up; z = recoilM * (1 - u * u * (3 - 2 * u)); } else z = 0;
  out[0] = -z; out[1] = elev; return out; // [carriage offset along the bore axis (negative = back), muzzle lift in degrees]
}
