// The musket drill as clips: Load in nine times, Ready - Aim - Fire, the manual of arms transitions, kneeling and lying fire, the bayonet exercise.
// Every motion is encoded as keys over the pose channels (figure-pose.mjs), from the printed motions (Hardee 1861 H.S.S. paras 128-186, Casey 1862 paras 135-186; drill_hardee.json / drill_infantry.json).
// Coordinates are an authored reading of the printed relations (tier inferred); durations: regulated motions 1/90 minute, exempt motions fitted to the cycle (drill-tables.mjs).
// Rifle-frame conventions: loading keys are written in the CHEST frame (rfr = 1, hfr = 1) so the same keys serve standing, kneeling and lying bodies; the ramrod (prop B = prop_pole) is in the RIFLE frame (bfr = 2).
import { Spec, PROPS } from './figure-pose.mjs';
import { Keyed, key } from './clipdef.mjs';
import * as POSE from './poses.mjs';
import { LOAD9, FIRE_TIMES, MOTION_S, LOAD9_EXEMPT } from './drill-tables.mjs';

const R = PROPS.rifle, ROD = PROPS.ramrod;
const CH0 = [0, 1.26, 0.006];                                   // chest origin at upright posture
const cx = (x, y, z) => [x - CH0[0], y - CH0[1], z - CH0[2]];   // root-frame point -> chest-frame point (upright)

// ---- segment durations of the firing cycle, fitted to a cycle length (seconds per round)
// Cycle order: AIM, PAUSE, FIRE, LOAD(1), handle(2), tear(3), charge(4), draw(5), ram(6), return(7), PRIME(8), READY. Regulated motions keep 1/90 minute; the exempt motions share the rest by their weights.
export const CYCLE_STEPS = ['aim', 'pause', 'fire', 'load', 'handle_cartridge', 'tear_cartridge', 'charge_cartridge', 'draw_rammer', 'ram_cartridge', 'return_rammer', 'prime', 'ready'];
export const MIN_EXEMPT_S_PER_UNIT = 0.5;                        // fastest plausible exempt motion (s per weight unit): sets the floor of the cycle length (plausible-procedural)
const EXEMPT_W = Object.fromEntries(LOAD9.filter(t => !t.regulated).map(t => [t.id, t.w.reduce((a, b) => a + b, 0)]));
const REG_S = { aim: FIRE_TIMES.aim.motions * MOTION_S, fire: FIRE_TIMES.fire.motions * MOTION_S, load: 1 * MOTION_S, prime: 2 * MOTION_S, ready: FIRE_TIMES.ready.motions * MOTION_S };
const EXEMPT_IDS = Object.keys(EXEMPT_W), WSUM = Object.values(EXEMPT_W).reduce((a, b) => a + b, 0), REG_TOTAL = REG_S.aim + REG_S.fire + REG_S.load + REG_S.prime + REG_S.ready;
export function cycleDurations(cycleS, pauseS = 0.6, out = {}) {            // allocation-free
  const floor = REG_TOTAL + pauseS + WSUM * MIN_EXEMPT_S_PER_UNIT, c = cycleS > floor ? cycleS : floor, unit = (c - REG_TOTAL - pauseS) / WSUM;
  out.aim = REG_S.aim; out.pause = pauseS; out.fire = REG_S.fire; out.load = REG_S.load; out.prime = REG_S.prime; out.ready = REG_S.ready;
  for (let i = 0; i < EXEMPT_IDS.length; i++) out[EXEMPT_IDS[i]] = EXEMPT_W[EXEMPT_IDS[i]] * unit;
  out.total = c; out.unit = unit; out.floor = floor; return out;
}
// the same durations into a Float64Array indexed like CYCLE_STEPS (out[12] = total, out[13] = the unit); the cycle length is read from cArr[ci] so that no double is passed as an argument
const EX_IDX = EXEMPT_IDS.map(id => CYCLE_STEPS.indexOf(id)), EX_WV = Float64Array.from(EXEMPT_IDS.map(id => EXEMPT_W[id]));
const I_AIM = CYCLE_STEPS.indexOf('aim'), I_PAUSE = CYCLE_STEPS.indexOf('pause'), I_FIRE = CYCLE_STEPS.indexOf('fire'), I_LOAD = CYCLE_STEPS.indexOf('load'), I_PRIME = CYCLE_STEPS.indexOf('prime'), I_READY = CYCLE_STEPS.indexOf('ready');
export function cycleDurationsArr(cArr, ci, pauseS, out) {
  const floor = REG_TOTAL + pauseS + WSUM * MIN_EXEMPT_S_PER_UNIT, c = cArr[ci] > floor ? cArr[ci] : floor, unit = (c - REG_TOTAL - pauseS) / WSUM;
  out[I_AIM] = REG_S.aim; out[I_PAUSE] = pauseS; out[I_FIRE] = REG_S.fire; out[I_LOAD] = REG_S.load; out[I_PRIME] = REG_S.prime; out[I_READY] = REG_S.ready;
  for (let i = 0; i < EX_IDX.length; i++) out[EX_IDX[i]] = EX_WV[i] * unit;
  out[12] = c; out[13] = unit; return out;
}
export const NOMINAL_CYCLE_S = 20;                              // 3 rounds a minute: the training standard (INF-RATE-01): the cycle clip is baked at this length

// ---- the keys. A "builder" appends keys of one time at the running clock t.
function bodyKeys(kind) {
  const f = POSE.attention(new Spec()), h = POSE.ready(new Spec()), take = (s, names) => Object.fromEntries(names.map(n => [n, Array.from({ length: 3 }, (_, i) => s.get(n, i))]));
  return kind === 'half' ? take(h, ['pelE', 'spE', 'fl', 'fr', 'fle', 'fre']) : take(f, ['pelE', 'spE', 'fl', 'fr', 'fle', 'fre']);
}
const FRONT = bodyKeys('front'), HALF = bodyKeys('half');
const stowed = (slide = 0) => ({ bfr: 2, bp: [0, ROD.stowedY + slide, ROD.stowedZ], ba: [180, 0, 0], bref: 0 });
// ramrod key from the right-hand position H (rifle-local metres) holding the rod at distance g from its head, rod axis from the Euler (pitch, yaw): the head follows from the hand, so the hand is where it was put
const rodAxis = (p, y) => { const P = p * Math.PI / 180, Y = y * Math.PI / 180; return [Math.sin(P) * Math.sin(Y), Math.cos(P), Math.sin(P) * Math.cos(Y)]; };
const rod = (H, ba, g) => { const a = rodAxis(ba[0], ba[1]); return { bfr: 2, bp: [H[0] - g * a[0], H[1] - g * a[1], H[2] - g * a[2]], ba: [ba[0], ba[1], 0], bref: 0, rhwb: 1, rhgb: g }; };
const LOADPOS = { rp: cx(0, 0, 0.07), ra: [1.2, 0, 0], rref: 0, rfr: 1, hfr: 1 };

export function fireCycleKeys({ posture = 'stand', cycleS = NOMINAL_CYCLE_S, pauseS = 0.6, withShoulder = false } = {}) {
  const D = cycleDurations(cycleS, pauseS), K = []; let t = 0; const add = (dt, ch, ease) => { t += dt; K.push(key(t, ch, ease)); return t; };
  const body = posture === 'kneel' ? KNEEL : posture === 'lie' ? LIE : null;
  const drop = posture === 'kneel' ? KNEEL_DROP : 0, rodD = (H, ba, g) => rod([H[0], H[1] - drop, H[2]], ba, g);      // a kneeling man's chest is 0.40 m lower: the butt stays on the ground (LOADPOS + drop in the chest frame) and the hands keep their height on the body, so every rammer position along the piece is 0.40 m nearer the butt
  const po = posture === 'lie' ? LIE_PITCH : 0, por = posture === 'lie' ? LIE_PITCH_READY : 0;      // the chest of a man lying on his belly is pitched about 50 degrees forward (pelvis 78, back arched 28): the piece is carried that much less pitched in the chest frame so that the muzzle points along the ground, not into it
  const bodyOf = (b, extra = {}) => ({ ...(b === 'half' ? HALF : FRONT), ...(body ? body[b] : {}), ...extra });
  // start: the Ready position (end of the cycle) = the pose of poses.ready / aim
  const ready = POSE.ready(new Spec());
  const rdy = { rp: [ready.get('rp', 0), ready.get('rp', 1), ready.get('rp', 2)], ra: [ready.get('ra', 0) + por, ready.get('ra', 1), ready.get('ra', 2)], rref: R.wrist, rfr: 1, rhwa: 1, rhga: R.wrist, lhwa: 1, lhga: 0.72, rhwb: 0, hfr: 1, rep: [-0.6, -0.5, -1], lep: [0.25, -0.6, -1] };
  K.push(key(0, { ...bodyOf('half'), ...rdy, ...stowed(), jaw: 0, hdE: [0, 0, 0], nkE: [0, 0, 0] }));
  // AIM (1 motion)
  add(D.aim, { ...bodyOf('half'), rp: [0.046, 0.18, 0.187], ra: [88 + po, 41, 0], rref: R.wrist, rhga: R.wrist, lhga: 0.72, rep: [-1, 0.2, -0.2], lep: [0.15, -1, -0.4], hdE: [5, -34, 8], nkE: [4, -10, 3], spE: [3, -22 + (HALF.spE[1] + 18), 0] });
  add(D.pause, {});                                                   // the pause between Aim and Fire
  // FIRE: the piece kicks back and the muzzle rises; the shot is at 0.12 s into this segment (see FIRE_AT)
  add(0.12, {}); add(0.10, { rp: [0.036, 0.18, 0.137], ra: [92 + po, 41, 0], hdE: [3, -34, 8], spE: [1, -23, 0] }, 'fast');
  add(D.fire - 0.22, { rp: [0.046, 0.18, 0.18], ra: [89 + po, 41, 0], hdE: [5, -34, 8] }, 'smooth');
  // LOAD (time 1): the man faces the front, the piece comes to the middle of the body, butt between the feet, the right hand goes to the cartridge box
  add(D.load, { ...bodyOf('front'), ...LOADPOS, rp: [LOADPOS.rp[0], LOADPOS.rp[1] + drop, LOADPOS.rp[2]], rhwa: 0, rhp: cx(-0.19, 0.96, 0.115), lhwa: 1, lhga: 1.16, ...stowed(), hdE: [0, 0, 0], nkE: [0, 0, 0], spE: [0, 0, 0], rep: [0, -0.3, -1], lep: [0.2, -0.4, -1] });
  // HANDLE CARTRIDGE (2): the cartridge to the teeth
  add(D.handle_cartridge * 0.5, { rhp: cx(-0.13, 1.22, 0.22), rep: [-0.7, -1, 0.1], lep: [0.3, -1, -0.3] }); add(D.handle_cartridge * 0.5, { rhp: cx(0.0, 1.57, 0.12), hdE: [8, 0, 0] });
  // TEAR CARTRIDGE (3): the paper torn with the teeth, the cartridge then held upright in front of the muzzle
  add(D.tear_cartridge * 0.5, { jaw: 14, rhp: cx(0.0, 1.55, 0.085), hdE: [10, 0, 0] });
  add(D.tear_cartridge * 0.5, { jaw: 0, rhp: cx(0.0, 1.50, 0.17), hdE: [4, 0, 0] });
  // CHARGE CARTRIDGE (4): powder emptied into the barrel, ball inserted and pressed with the thumb, the right hand then seizes the head of the rammer
  const w4 = D.charge_cartridge; add(w4 * 0.35, { rep: [-0.8, -0.8, 0.2], rhp: cx(0, 1.55, 0.11), rhe: [-60, 0, 0], hdE: [10, 0, 0] }); add(w4 * 0.30, { rhp: cx(0, 1.46, 0.10), rhe: [0, 0, 0], hdE: [10, 0, 0] });
  add(w4 * 0.35, { rhwb: 1, rhgb: 0.02, rhp: cx(0, 1.34, 0.12), hdE: [4, 0, 0], ...stowed() });
  // DRAW RAMMER (5), three motions: half drawn by extending the right arm; regrasped near the muzzle; cleared from the pipes; turned (small end near the left shoulder)
  const w5 = D.draw_rammer / 3;
  add(w5, { ...rodD([0, 1.84, 0.03], [180, 0], 0.02), rep: [-1, -0.3, 0.3] });
  add(w5 * 0.5, rodD([0, 1.40, 0.03], [180, 0], 0.50)); add(w5 * 0.5, rodD([0, 1.82, 0.03], [180, 0], 0.50));
  add(w5 * 0.5, rodD([0.06, 1.74, 0.10], [135, 50], 0.45)); add(w5 * 0.5, rodD([0, 1.55, 0.04], [20, 0], 0.10));
  // RAM CARTRIDGE (6): the rammer in as far as the right hand, the hand to the small end, the ball pressed home with the elbows near the body
  const w6 = D.ram_cartridge; add(w6 * 0.25, { ...rodD([0, 1.52, 0.04], [0, 0], 0.10), rep: [-1, -0.3, 0.3] }); add(w6 * 0.25, rodD([0, 1.92, 0.04], [0, 0], 0.50)); add(w6 * 0.5, rodD([0, 1.30, 0.04], [0, 0], 0.50));
  // RETURN RAMMER (7), three motions: drawn half out and cleared; turned (head near the left shoulder) and the small end entered in the pipes; forced home with the little finger on the head
  const w7 = D.return_rammer / 3;
  add(w7, rodD([0, 1.80, 0.04], [0, 0], 0.30));
  add(w7 * 0.5, rodD([0.07, 1.76, 0.10], [75, 50], 0.35)); add(w7 * 0.5, rodD([0, 1.85, 0.03], [180, 0], 0.30));
  add(w7, rodD([0, ROD.stowedY + 0.04, 0.03], [180, 0], 0.02));
  // PRIME (8), two motions: the piece raised to eye height, half face right, brought to the right side (small of the stock two inches below the right breast); the cap taken and placed on the nipple
  add(D.prime * 0.5, { ...bodyOf('half'), rep: [-0.6, -0.9, -0.3], rhwb: 0, rhwa: 0, rp: cx(-0.10, 1.20, 0.12), rref: R.wrist, ra: [25, 25, 0], lhga: 0.80, rhp: cx(-0.04, 0.97, 0.13), ...stowed(), rep: [-0.6, -0.3, -1] });
  add(D.prime * 0.5, { rhwa: 1, rhga: R.lock, rp: cx(-0.10, 1.20, 0.12), rhe: [0, 0, 0] });
  // READY (3 motions): the piece down with both hands, butt below the right forearm, muzzle at eye height, thumb on the cock
  const wR = D.ready / 3;
  add(wR, { ...rdy, rp: [rdy.rp[0], rdy.rp[1] + 0.08, rdy.rp[2]], ra: [rdy.ra[0] + 12, rdy.ra[1], 0], lhga: 0.80 });
  add(wR, { ...rdy });
  add(wR, { ...rdy, rhe: [-8, 0, 0] });
  K.push(key(t + 1e-4, { ...rdy, rhe: [0, 0, 0] })); // closes the loop on the Ready position
  return { keys: K, D, total: t, fireAt: D.aim + D.pause + 0.12 };
}

// posture overrides for the body channels (applied on top of the front/half body): kneeling and lying (H.S.S. paras 290-311)
const KNEEL = {
  front: { pel: [0, -0.40, 0.12], pelE: [8, -10, 0], spE: [8, -12, 0], fl: [0.10, 0.085, 0.40], fr: [-0.14, 0.11, -0.42], fle: [0, 8, 0], fre: [-70, -10, 0], tr: [-5], lcont: [1], rcont: [1] },
  half: { pel: [0, -0.40, 0.12], pelE: [8, -30, 0], spE: [6, -30, 0], fl: [0.12, 0.085, 0.40], fr: [-0.16, 0.11, -0.45], fle: [0, 14, 0], fre: [-70, -50, 0], tr: [-5], lcont: [1], rcont: [1] },
};
const LIE_PITCH = -75, LIE_PITCH_READY = -50, KNEEL_DROP = 0.40;
const LIE = {
  front: { pel: [0, -0.74, 0.30], pelE: [78, 0, 0], spE: [-30, 0, 0], fl: [0.10, 0.12, -0.55], fr: [-0.10, 0.12, -0.60], fle: [60, 0, 0], fre: [60, 0, 0], lcont: [1], rcont: [1] },
  half: { pel: [0, -0.74, 0.30], pelE: [78, -8, 0], spE: [-28, -6, 0], fl: [0.12, 0.12, -0.55], fr: [-0.14, 0.12, -0.60], fle: [60, 0, 0], fre: [60, 0, 0], lcont: [1], rcont: [1] },
};
export const POSTURES = { stand: null, kneel: KNEEL, lie: LIE };
export { cx, FRONT, HALF, stowed };

// the Ready/Aim/Fire/Load cycle as a clip definition (looping on the Ready position)
export function fireCycleDef({ id, posture = 'stand', cycleS = NOMINAL_CYCLE_S }) {
  const { keys, D, total, fireAt } = fireCycleKeys({ posture, cycleS });
  const base = POSE.ready(new Spec()); const ov = POSTURES[posture]; if (ov) for (const [c, v] of Object.entries(ov.half)) base.set(c, ...v);
  if (posture === 'kneel') base.set('gnd', 0.02);                                // ground-aware (figure-pose.mjs): the piece, the ramrod and the hands stay above the ground plane
  const kd = new Keyed(base, keys);
  return { id, loop: true, dur: total, fps: 60, propB: 'prop_pole', family: 'musketry', eval: (t, spec) => kd.eval(t, spec),
    meta: { posture, kind: 'fire_cycle', cycleS: total, segments: segmentTable(D), fireAt, tier: 'inferred', src: ['HAR-S12', 'HAR-S13', 'HAR-S14', 'HAR-S29', 'INF-L9-01..09', 'INF-RATE-01'], gap: 'G-ANIM-01',
      note: 'Aim, pause, Fire, Load (times 1-8 of the nine), Ready; the cycle is baked at ' + total.toFixed(1) + ' s (' + (60 / total).toFixed(2) + ' rounds a minute) and time-warped per segment to the fire plan seconds per round' } };
}
export function segmentTable(D) {
  const order = CYCLE_STEPS; let t = 0; const out = [];
  for (const id of order) { const d = D[id]; const rec = { id, t0: t, t1: t + d, dur: d }; t += d; out.push(rec); }
  return out;
}
