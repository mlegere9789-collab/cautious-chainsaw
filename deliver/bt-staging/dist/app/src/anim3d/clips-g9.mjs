// G9 state coverage, second tranche (render/PLAN.md G9): taking cover (behind a wall, behind a tree, prone), forming and dressing a line, wheeling (pivot man, men between, wheeling flank), the skirmishers' rush,
// the four-man stretcher, loading a casualty into an ambulance wagon, helping a limping man, limbering and unlimbering, moving a piece by hand, the prolonge, horse artillery (mounted cannoneers, drivers, horse-holders,
// mounting and dismounting), and paired sabre fights. Each clip is authored from the drill tables where a table exists (the paragraph ids are in meta.src), the rest is plausible-procedural and tiered per clip; the new gaps
// are G-ANIM-14..23 (drill-tables.mjs). The tier of the DRILL LAYER (what order of actions, which step lengths) is documented where cited; the body mechanics (the coordinates) are always authored.
// Paired clips (stretcher bearers, helper and limping man, sabre fights, gun crew pushing) carry meta.pairedWith and meta.pairOffset (the other figure's placement in this figure's root frame, metres, and its relative yaw).
import { holdCh, holdify } from './authoring.mjs';
import { Spec, PROPS, CH } from './figure-pose.mjs';
import { keyFromSpec, keyedDef } from './clipdef.mjs';
import * as POSE from './poses.mjs';
import { MOTION_S } from './drill-tables.mjs';
import { gaitDef } from './locomotion.mjs';
import { POSTURES } from './musketry.mjs';
import { lyingSpec } from './clips-fall.mjs';
import { riderGaitDef } from './clips-cavalry.mjs';

const R = PROPS.rifle, M = MOTION_S;
const mod = (b, f) => { const s = new Spec(); s.v.set(b.v); f(s); return s; };
const mix = (a, b, w, f) => { const s = new Spec(); for (let i = 0; i < s.v.length; i++) s.v[i] = a.v[i] * (1 - w) + b.v[i] * w; if (f) f(s); return s; };
// steps: [[dt, spec, ease?], ...]; first dt is ignored (t = 0)
const seq = (id, label, steps, meta = {}) => {
  const hf = x => (meta.holdLong ? holdify(Object.assign(new Spec(), { v: Float64Array.from(x.v) })) : x);      // meta.holdLong: the rifle is hand-anchored (authoring.holdify)
  let t = 0; const keys = [keyFromSpec(0, hf(steps[0][1]))]; for (let i = 1; i < steps.length; i++) { t += steps[i][0]; keys.push(keyFromSpec(t, hf(steps[i][1]), steps[i][2] || 'smooth')); }
  return keyedDef({ id, dur: t, loop: !!meta.loop, base: steps[0][1], keys, propB: meta.propB || 'prop_sword', family: meta.family || 'g9', meta: { label, tier: 'plausible-procedural', src: [], ...meta } });
};
const SA = () => POSE.shoulderArms(new Spec()), RDY = () => POSE.ready(new Spec()), AIM = () => POSE.aim(new Spec()), A0 = () => POSE.attention(new Spec());
const withPosture = (b, post) => mod(b, s => { for (const [c, v] of Object.entries(POSTURES[post].half)) s.set(c, ...v); });
const sgn = side => (side === 'L' ? 1 : -1);
const cp = (dst, src, ...names) => { for (const n of names) { const [o, l] = CH[n]; for (let i = 0; i < l; i++) dst.v[o + i] = src.v[o + i]; } return dst; };

// ------------------------------------------------------------------------------------------------ taking cover
// Documented: skirmishers may fire and load kneeling, lying or sitting with latitude, the piece upright before ramming (HAR-K05, INF-SKIRM-02), the bugle calls "lie down" and "rise up" (HAR-L02), the kneeling and lying
// positions themselves (HAR-S33, HAR-S34, INF-KNEEL-01, INF-LYING-01). NOT documented: the use of a wall or a tree (G-ANIM-14): crouching behind it, rising to fire over it, leaning round it.
const COVER_SRC = ['HAR-K05', 'INF-SKIRM-02', 'HAR-L02', 'HAR-S33', 'HAR-S34'];
function coverDefs() {
  const D = [], kn = withPosture(RDY(), 'kneel'), ly = withPosture(RDY(), 'lie');
  // crouch behind a wall (height about 1 m): knees bent, chest forward, piece across the chest
  const crouch = (side) => mod(RDY(), s => { const k = sgn(side); s.set('rep', -0.9, -0.15, -0.2).set('pel', 0, -0.46, 0.08).set('pelE', -8, -8 * k, 0).set('spE', 24, -6 * k, 0).set('fl', 0.15, 0.085, 0.16).set('fr', -0.17, 0.085, -0.14).set('fle', 0, 10, 0).set('fre', 0, -30, 0).set('hdE', -14, -10 * k, 0).set('lcont', 1).set('rcont', 1); });
  const rise = (side, h) => mod(crouch(side), s => { s.set('pel', 0, -0.46 + h, 0.06).set('spE', 10, 0, 0).set('hdE', 2, 0, 0); });
  for (const side of ['L', 'R']) {
    const k = sgn(side), c = crouch(side), pk = mod(c, s => s.set('hdE', -8, 28 * k, 0)), up = cp(mod(AIM(), s => s.set('rhga', 0.38).set('rep', -0.9, -0.15, -0.2).set('ra', 88, 26, 0).set('pel', 0, -0.30, 0.06).set('pelE', -8, -8 * k, 0).set('spE', 10, -6 * k, 0)), c, 'fl', 'fr', 'fle', 'fre', 'lcont', 'rcont');
    D.push(seq('cover_wall_crouch_' + side, 'Takes cover behind a wall: drops to a crouch, looks ' + (side === 'L' ? 'left' : 'right') + ' round the end, holds', [[0, SA()], [0.7, c], [0.8, pk], [1.2, pk], [0.7, c]], { family: 'cover', src: COVER_SRC, tier: 'inferred', gap: 'G-ANIM-14', cover: 'wall', variant: side }));
    D.push(seq('cover_wall_fire_' + side, 'Rises from behind a wall to aim over it, fires, drops to load (' + (side === 'L' ? 'left' : 'right') + ' stance)', [[0, c], [0.55, up], [0.45, up], [0.12, mod(up, s => s.set('hdE', 6, -34 * k, 8)), 'fast'], [0.5, c]], { family: 'cover', src: COVER_SRC, tier: 'inferred', gap: 'G-ANIM-14', cover: 'wall', variant: side, fireAtS: 1.1 }));
  }
  // behind a tree: standing, shoulder to the trunk, piece across the chest; leaning out to look and to fire
  for (const side of ['L', 'R']) {
    const k = sgn(side), lean = mod(RDY(), s => s.set('pelE', 0, 12 * k, -4 * k).set('spE', 4, 10 * k, -8 * k).set('pel', 0.05 * k, -0.02, 0.0).set('hdE', 0, 24 * k, 0).set('lcont', 1).set('rcont', 1));
    const out = mod(lean, s => s.set('pel', 0.12 * k, -0.03, 0.04).set('spE', 4, 16 * k, -14 * k).set('hdE', 2, 34 * k, 0)), aimOut = mix(out, AIM(), 0.8, s => s.set('rhga', 0.38).set('pel', 0.12 * k, -0.03, 0.04));
    D.push(seq('cover_tree_stand_' + side, 'Stands behind a tree, shoulder to the trunk, leans out to look (' + side + ')', [[0, SA()], [0.6, lean], [0.7, out], [1.0, out], [0.6, lean]], { family: 'cover', src: COVER_SRC, tier: 'plausible-procedural', gap: 'G-ANIM-14', cover: 'tree', variant: side }));
    D.push(seq('cover_tree_fire_' + side, 'Leans round a tree to aim and fire, steps back to load (' + side + ')', [[0, lean], [0.5, aimOut], [0.45, aimOut], [0.12, mod(aimOut, s => s.set('hdE', 6, -30 * k, 8)), 'fast'], [0.5, lean]], { family: 'cover', src: COVER_SRC, tier: 'plausible-procedural', gap: 'G-ANIM-14', cover: 'tree', variant: side, fireAtS: 0.95 }));
  }
  // kneeling behind cover loading (piece upright, HAR-K05) and prone behind cover
  const upr = mod(kn, s => s.set('rfr', 1).set('rp', -0.14, 0.05, 0.10).set('ra', 8, 0, 0).set('rref', R.wrist).set('rhga', R.wrist).set('lhwa', 1).set('lhga', 0.62).set('spE', 18, -8, 0).set('hdE', 6, 0, 0));
  D.push(seq('cover_kneel_load', 'Kneels behind cover and loads with the piece upright (the powder reaches the bottom: HAR-K05)', [[0, kn], [0.8, upr], [1.6, mod(upr, s => s.set('rhwa', 1).set('rhga', 0.55).set('spE', 24, -8, 0))], [0.8, kn]], { family: 'cover', src: COVER_SRC, tier: 'inferred', gap: 'G-ANIM-14', cover: 'wall', variant: 'kneel' }));
  const lyDown = mix(RDY(), ly, 1, null);
  D.push(seq('cover_prone_drop', 'Drops from the run or the stand to the prone position behind cover ("lie down")', [[0, SA()], [0.45, mix(SA(), withPosture(RDY(), 'kneel'), 0.7, s => s.set('pel', 0, -0.34, 0.06))], [0.55, lyDown]], { family: 'cover', src: COVER_SRC, tier: 'inferred', gap: 'G-ANIM-14', cover: 'open', variant: 'drop' }));
  D.push(seq('cover_prone_peek', 'Prone behind cover: raises the head to look, lowers it (the head only)', [[0, lyDown], [0.7, mod(lyDown, s => s.set('hdE', -24, 12, 0))], [1.2, mod(lyDown, s => s.set('hdE', -24, -14, 0))], [0.7, lyDown]], { family: 'cover', src: COVER_SRC, tier: 'inferred', gap: 'G-ANIM-14', cover: 'open', variant: 'peek' }));
  D.push(seq('cover_prone_rise', 'Rises from the prone position behind cover ("rise up") to the crouch', [[0, lyDown], [0.55, mix(lyDown, withPosture(RDY(), 'kneel'), 0.6, s => s.set('pel', 0, -0.36, 0.1))], [0.6, crouch('R')]], { family: 'cover', src: COVER_SRC, tier: 'inferred', gap: 'G-ANIM-14', cover: 'open', variant: 'rise' }));
  return D;
}

// ------------------------------------------------------------------------------------------------ forming and dressing a line (Hardee School of the Soldier, Part III, paras 310-317)
// Documented: heads and eyes turned toward the basis of alignment ("Right (or left) Dress"), the rank moves up in quick time; the last step shortened to stop about six inches behind the line, then steps of two or three inches
// (ANIM-H312, ANIM-H317), at "Front" the eyes turn to the front. The coordinates of the shuffle are authored.
function dressDefs() {
  const D = [], A = SA(), src = ['ANIM-H312', 'ANIM-H317'];
  for (const side of ['R', 'L']) {
    const k = sgn(side === 'R' ? 'R' : 'L') * -1; // dressing right: the head turns toward the figure's right (-yaw in this rig)
    const hd = mod(A, s => s.set('hdE', 0, 36 * k, 0).set('nkE', 0, 16 * k, 0));
    const shuffle = (dz) => mod(hd, s => s.set('fl', 0.092, 0.085, -0.012 + dz).set('fr', -0.092, 0.085, -0.012 + dz).set('pel', 0, 0, dz * 0.4));
    D.push(seq('dress_' + (side === 'R' ? 'right' : 'left'), 'Dressing ' + (side === 'R' ? 'right' : 'left') + ': heads and eyes turned toward the basis, holds, then "Front"', [[0, A], [0.45, hd], [1.4, hd], [0.4, A]], { family: 'dress', src, tier: 'documented', gap: null, variant: side }));
    D.push(seq('dress_step_up_' + (side === 'R' ? 'right' : 'left'), 'Moves up to the alignment by two steps of two or three inches (' + (side === 'R' ? 'right' : 'left') + ' dress)', [[0, hd], [M * 0.5, mod(shuffle(0.0), s => s.set('fl', 0.092, 0.115, 0.05).set('lcont', 0))], [M * 0.5, shuffle(0.06)], [M * 0.5, mod(shuffle(0.06), s => s.set('fr', -0.092, 0.115, 0.11).set('rcont', 0))], [M * 0.5, shuffle(0.12)]], { family: 'dress', src, tier: 'documented', gap: null, variant: side, stepIn: [2, 3] }));
    D.push(seq('dress_step_back_' + (side === 'R' ? 'right' : 'left'), 'Steps back to the alignment (a man who has overrun the line, ' + (side === 'R' ? 'right' : 'left') + ')', [[0, shuffle(0.12)], [M * 0.5, mod(shuffle(0.12), s => s.set('fl', 0.092, 0.115, 0.03).set('lcont', 0))], [M * 0.5, shuffle(0.06)], [M * 0.5, mod(shuffle(0.06), s => s.set('fr', -0.092, 0.115, 0.0).set('rcont', 0))], [M * 0.5, shuffle(0.0)]], { family: 'dress', src, tier: 'inferred', gap: null, variant: side }));
  }
  // arriving on the line: two paces at quick time, the last step shortened, a pause to find the elbow (touch of elbows)
  D.push(seq('dress_touch_elbows', 'Touches the elbow of the next man lightly without opening his own (Part III para 312)', [[0, A], [0.6, mod(A, s => s.set('rep', -0.9, -0.3, -0.3).set('lep', 0.9, -0.3, -0.3).set('hdE', 0, -45, 0))], [2.0, mod(A, s => s.set('rep', -0.9, -0.3, -0.3).set('lep', 0.9, -0.3, -0.3).set('hdE', 0, -45, 0).set('pel', 0.012, 0, 0))], [0.5, A]], { family: 'dress', src, tier: 'documented', gap: null, variant: 'elbow' }));
  return D;
}

// ------------------------------------------------------------------------------------------------ wheeling (paras 380-384): the gait at the documented step lengths, head toward the wheel
function wheelDefs() {
  const D = [], set = [['mark_time', 'pivot man at a wheel from a halt: marks time, turning in place', ['ANIM-H380', 'ANIM-H384'], 'documented'],
    ['wheel_pivot_quick', 'pivot man in a wheel in marching (9 inch steps, quick time)', ['ANIM-H381'], 'documented'], ['wheel_pivot_dq', 'pivot man in a wheel in marching (11 inch steps, double quick)', ['ANIM-H381'], 'documented'],
    ['wheel_mid25_quick', 'man a quarter of the way from the pivot to the wheeling flank (step 13.75 in.)', ['ANIM-H381', 'ANIM-H382'], 'inferred'], ['wheel_mid50_quick', 'man half way from the pivot (step 18.5 in.)', ['ANIM-H381', 'ANIM-H382'], 'inferred'],
    ['wheel_mid75_quick', 'man three quarters of the way from the pivot (step 23.25 in.)', ['ANIM-H381', 'ANIM-H382'], 'inferred'], ['wheel_flank_quick', 'man on the wheeling flank, full 28 inch step', ['ANIM-H382'], 'documented'],
    ['wheel_flank_dq', 'man on the wheeling flank, full 33 inch step, double quick', ['ANIM-H382'], 'documented']];
  for (const [gait, label, src, tier] of set) for (const dir of ['right', 'left']) {
    const k = dir === 'right' ? 1 : -1; // a right wheel: the rank looks toward the left (the marching flank), "turning the head a little to the left, the eyes fixed on the line of the eyes of the men to their left"
    const carry = gait.endsWith('_dq') ? 'trail' : 'shoulder';
    const g = gaitDef({ id: gait.replace(/^mark_time$/, 'wheel_marktime') + '_' + dir, gait, carry, label: 'Wheel ' + dir + ': ' + label, tier, propB: 'prop_sword', after: (spec, ph) => { spec.set('hdE', spec.get('hdE', 0), spec.get('hdE', 1) + 22 * k, 0); } });
    g.family = 'wheel'; g.meta.src = [...src, ...(g.meta.src || [])]; g.meta.wheelDir = dir; if (tier === 'inferred') g.meta.gap = 'G-ANIM-15'; D.push(g);
  }
  return D;
}

// ------------------------------------------------------------------------------------------------ the skirmishers' rush (Instruction for Skirmishers: HAR-K04, HAR-K05, HAR-L02 bugle calls "double quick", "lie down", "rise up")
// Documented: the rear-rank man of a file advances 10-12 paces past the front-rank man, halts, fires and reloads in turn; skirmishers load marching but halt an instant to charge the cartridge and prime. The rush itself (a crouched
// run between cover) is authored on the run gait; the dash length 10-12 paces is documented.
function skirmishDefs() {
  const D = [];
  const crouchRun = (spec) => { POSE.runCarry(spec); spec.set('rp', -0.20, 0.92, 0.12).set('ra', 70, 0, 0).set('rref', 0.70).set('rhga', 0.70); return spec; };
  for (const [suffix, lean, label] of [['low', 26, 'crouched'], ['upright', 12, 'half-upright'], ['zigzag', 18, 'zigzagging']]) {
    const g = gaitDef({ id: 'skirmish_rush_' + suffix, gait: 'run', carry: crouchRun, label: 'Skirmisher\'s rush, ' + label + ' (the run, piece trailed)', tier: 'plausible-procedural', after: (spec, ph, sx) => {
      spec.set('spE', spec.get('spE', 0) + lean, spec.get('spE', 1) + (suffix === 'zigzag' ? 10 * Math.sin(2 * Math.PI * ph) : 0), spec.get('spE', 2)).set('hdE', spec.get('hdE', 0) - lean * 0.5, spec.get('hdE', 1), 0); } });
    g.family = 'skirmish'; g.meta.src = ['HAR-K04', 'HAR-L02', 'ANIM-H116']; g.meta.gap = 'G-ANIM-20'; g.meta.dashPaces = [10, 12]; D.push(g);
  }
  const kn = withPosture(RDY(), 'kneel'), ly = withPosture(RDY(), 'lie'), run0 = mod(SA(), s => s.set('spE', 22, 0, 0).set('pel', 0, -0.08, 0.06).set('hdE', -10, 0, 0));
  D.push(seq('skirmish_rush_start', 'Springs up from the kneel or the prone and starts the rush ("rise up", "double quick")', [[0, kn], [0.35, mix(kn, run0, 0.6, s => s.set('pel', 0, -0.25, 0.1))], [0.4, run0]], { family: 'skirmish', src: ['HAR-L02', 'HAR-K04'], tier: 'plausible-procedural', gap: 'G-ANIM-20', variant: 'kneel' }));
  D.push(seq('skirmish_rush_stop_kneel', 'Ends the rush: halts and drops to the kneel to fire (the 10-12 pace dash is over)', [[0, run0], [0.3, mix(run0, kn, 0.6, s => s.set('pel', 0, -0.25, 0.1))], [0.45, kn]], { family: 'skirmish', src: ['HAR-K04', 'HAR-K05'], tier: 'plausible-procedural', gap: 'G-ANIM-20', variant: 'kneel' }));
  D.push(seq('skirmish_rush_drop_prone', 'Ends the rush: throws himself prone ("lie down")', [[0, run0], [0.3, mix(run0, kn, 0.8, s => s.set('pel', 0, -0.4, 0.12))], [0.55, ly]], { family: 'skirmish', src: ['HAR-L02', 'HAR-K05'], tier: 'plausible-procedural', gap: 'G-ANIM-20', variant: 'prone' }));
  D.push(seq('skirmish_load_halt', 'Halts an instant while marching to charge the cartridge and prime (the one thing a skirmisher may not do on the move)', [[0, run0], [0.25, mod(SA(), s => s.set('spE', 6, 0, 0))], [1.2, mod(SA(), s => s.set('spE', 14, 0, 0).set('hdE', 6, 0, 0))], [0.3, run0]], { family: 'skirmish', src: ['HAR-K05', 'INF-SKIRM-01'], tier: 'inferred', gap: 'G-ANIM-20', variant: 'load' }));
  return D;
}


// ------------------------------------------------------------------------------------------------ carrying the wounded: four-man stretcher, ambulance loading, helping a limping man (G-ANIM-16; no source acquired)
// The stretcher is prop_long (the renderer picks the mesh from meta.props). In the stretcher frame x is the width (left +), z the length (forward +); the four bearers stand at the corners, all facing forward, each holding the
// handle at his corner with the hand nearer the stretcher (left hand for the left-hand men, right hand for the right-hand men); handle height 0.80 m carried, 0.10 m at the ground.
const STRETCHER = { length: 2.1, width: 0.62, handleCarryY: 0.80, handleGroundY: 0.24, tier: 'plausible-procedural', note: 'dimensions authored (a field stretcher about 2 m by 0.6 m); the handles are at the four corners' };
function stretcherDefs() {
  const D = [], roles = { FL: { k: 1, front: true }, FR: { k: -1, front: true }, RL: { k: 1, front: false }, RR: { k: -1, front: false } };
  const pose = (role, y, lean) => { const { k, front } = roles[role], s = A0(); const gz = front ? 1.95 : 0.15;           // the grip is at 1.95 m along the 2.1 m prop at the front, 0.15 m at the rear
    s.set('rp', k * 0.30, y, front ? 0.28 : -0.05).set('rref', gz).set('rfr', 0).set('ra', 90, 0, 0).set('spE', lean, 0, 0).set('pelE', lean * 0.4, 0, 0).set('pel', 0, -lean * 0.006, lean * 0.004);
    s.set('hfr', 1); if (k > 0) s.set('lhwa', 1).set('lhga', gz).set('lep', 0.35, -1, -0.2).set('rhp', -0.26, -0.42, 0.05); else s.set('rhwa', 1).set('rhga', gz).set('rep', -0.35, -1, -0.2).set('lhp', 0.26, -0.42, 0.05); return s; };
  for (const role of Object.keys(roles)) {
    const k = roles[role].k, meta = { family: 'stretcher', src: [], tier: 'plausible-procedural', gap: 'G-ANIM-16', role: 'stretcher_' + role, stretcherRole: role, props: { prop_long: 'stretcher' }, pairOffsetM: [-k * 0.62, 0, roles[role].front ? 0 : 2.1], note: 'four bearers; pairOffsetM = the next bearer across the stretcher width (m) in this figure frame' };
    const low = mod(pose(role, STRETCHER.handleGroundY, 38), s => s.set('pel', 0, -0.42, 0.10).set('pelE', -8, 0, 0).set('spE', 40, 0, 0).set('fl', 0.15, 0.085, 0.14).set('fr', -0.15, 0.085, 0.00).set('fle', 0, 12, 0).set('fre', 0, -12, 0).set('lcont', 1).set('rcont', 1).set('hdE', -10, 0, 0));
    const mid = mix(low, pose(role, STRETCHER.handleCarryY, 0), 0.5, s => s.set('pel', 0, -0.14, 0.04));
    D.push(seq('stretcher4_lift_' + role, 'Four-man stretcher, ' + role + ': stoops, grasps the handle, lifts together with the others', [[0, low], [0.5, low], [1.0, mid], [0.9, pose(role, STRETCHER.handleCarryY, 0)]], { ...meta, propB: 'prop_sword' }));
    D.push(seq('stretcher4_lower_' + role, 'Four-man stretcher, ' + role + ': lowers the stretcher to the ground together and lets go', [[0, pose(role, STRETCHER.handleCarryY, 0)], [0.9, mid], [1.0, low], [0.5, low]], { ...meta, propB: 'prop_sword' }));
    const g = gaitDef({ id: 'stretcher4_carry_' + role, gait: 'common_time', carry: s => { s.v.set(pose(role, STRETCHER.handleCarryY, 0).v); return s; }, speedScale: 0.62, label: 'Four-man stretcher, ' + role + ': carries (reduced common time, handle held at the hip)', tier: 'plausible-procedural', propB: 'prop_sword' });
    g.family = 'stretcher'; Object.assign(g.meta, meta); D.push(g);
  }
  // loading into an ambulance wagon: the rear pair pushes the stretcher forward along the wagon floor, the man inside draws it in
  const push0 = mod(A0(), s => s.set('rp', 0.30, 0.95, 0.20).set('rref', 0.15).set('rfr', 0).set('ra', 90, 0, 0).set('lhwa', 1).set('lhga', 0.15).set('rhwa', 1).set('rhga', 0.15).set('lep', 0.35, -1, -0.2).set('rep', -0.35, -1, -0.2).set('spE', 10, 0, 0));
  D.push(seq('ambulance_load_push', 'Loading an ambulance wagon: pushes the stretcher in by its rear handles (two steps)', [[0, push0], [0.9, mod(push0, s => s.set('rp', 0.30, 0.95, 0.60).set('spE', 22, 0, 0).set('pel', 0, -0.06, 0.16).set('fl', 0.092, 0.085, 0.26).set('lcont', 1).set('rcont', 1))], [0.9, mod(push0, s => s.set('rp', 0.30, 0.95, 0.95).set('spE', 28, 0, 0).set('pel', 0, -0.08, 0.30).set('fr', -0.092, 0.085, 0.30))]], { family: 'stretcher', src: [], tier: 'plausible-procedural', gap: 'G-ANIM-16', role: 'ambulance_loader', props: { prop_long: 'stretcher' } }));
  const pull0 = mod(A0(), s => s.set('pel', 0, -0.32, 0.0).set('pelE', -6, 0, 0).set('spE', 28, 0, 0).set('rp', 0.10, 0.45, 0.45).set('rref', 1.5).set('rfr', 0).set('ra', 90, 0, 0).set('lhwa', 1).set('lhga', 1.5).set('rhwa', 1).set('rhga', 1.5).set('fl', 0.15, 0.085, 0.12).set('fr', -0.15, 0.085, -0.10).set('fle', 0, 10, 0).set('fre', 0, -10, 0).set('lcont', 1).set('rcont', 1).set('lep', 0.5, -1, -0.2).set('rep', -0.5, -1, -0.2));
  D.push(seq('ambulance_load_receive', 'Loading an ambulance wagon: kneels inside, takes the stretcher by its front handles and draws it in', [[0, pull0], [0.9, mod(pull0, s => s.set('rp', 0.10, 0.45, 0.20).set('spE', 36, 0, 0))], [0.9, mod(pull0, s => s.set('rp', 0.10, 0.45, -0.10).set('spE', 20, 0, 0).set('pel', 0, -0.32, -0.12))]], { family: 'stretcher', src: [], tier: 'plausible-procedural', gap: 'G-ANIM-16', role: 'ambulance_receiver', props: { prop_long: 'stretcher' } }));
  // helping a limping man (paired): the helper stands on the wounded man's right; the wounded man's right arm is over the helper's shoulders, the helper's left arm round his waist
  const help = (who) => (spec) => { POSE.shoulderArms(spec); spec.set('rhwa', 0).set('lhwa', 0).set('rfr', 0).set('rp', -0.4, 0.0, 0.2).set('ra', 80, 0, 0);
    if (who === 'helper') spec.set('lhp', 0.36, 1.00, -0.02).set('lep', 0.6, -0.8, -0.3).set('rhp', -0.245, 0.83, 0.02).set('hdE', 0, 12, 0).set('spE', 3, 0, 0);
    else spec.set('rhp', -0.42, 1.40, -0.03).set('rep', -1, 0.1, -0.2).set('lhp', 0.245, 0.83, 0.02).set('hdE', 14, -10, 0).set('spE', 6, -4, -6).set('pelE', 0, 0, 4); return spec; };
  for (const who of ['helper', 'wounded']) {
    const g = gaitDef({ id: 'limp_help_' + who, gait: 'common_time', carry: help(who), speedScale: 0.55, label: 'Helping a limping man: ' + who + ' (reduced common time)', tier: 'plausible-procedural' });
    g.family = 'stretcher'; g.meta.gap = 'G-ANIM-16'; g.meta.src = []; g.meta.pairedWith = 'limp_help_' + (who === 'helper' ? 'wounded' : 'helper'); g.meta.pairOffsetM = who === 'helper' ? [0.52, 0, 0] : [-0.52, 0, 0]; g.meta.role = 'limp_' + who; D.push(g);
    D.push(seq('limp_help_stand_' + who, 'Helping a limping man at a halt: ' + who + ' (supports, weight on the helper)', [[0, help(who)(new Spec())], [2.0, mod(help(who)(new Spec()), s => s.set('hdE', 6, who === 'helper' ? 20 : -24, 0))], [2.0, help(who)(new Spec())]], { family: 'stretcher', loop: true, src: [], tier: 'plausible-procedural', gap: 'G-ANIM-16', pairedWith: 'limp_help_stand_' + (who === 'helper' ? 'wounded' : 'helper'), pairOffsetM: who === 'helper' ? [0.52, 0, 0] : [-0.52, 0, 0], role: 'limp_' + who }));
  }
  return D;
}

// ------------------------------------------------------------------------------------------------ limbering, unlimbering, moving the piece by hand, the prolonge (Instruction for Field Artillery paras 111-112, 115, 126-127, 476-477; G-ANIM-17)
// Documented ORDER: unlimbering - the gunner takes out the key and with No. 5 raises the trail off the pintle (ART-FA-71); limbering - "Halt, limber up", the lunette is run onto the pintle and keyed (ART-FA-70); by hand: the gunner
// raises the trail on the handspike, Nos. 1-4 on the spokes of the wheels (ART-FA-74); the prolonge: No. 5 uncoils it, the gunner fixes the toggle through the lunette (ART-FA-90, ART-FA-93).
function limberDefs() {
  const D = [], src = { trail: ['ART-FA-70', 'ART-FA-71'], hand: ['ART-FA-74'], prolonge: ['ART-FA-90', 'ART-FA-93'] }, meta = (k, extra = {}) => ({ family: 'limber', src: src[k], tier: 'plausible-procedural', gap: 'G-ANIM-17', ...extra });
  // raising the trail on the handspike (prop_long): hands on the handspike, knees bent, lift with the legs and back
  const hs = (y, lean, side) => { const s = A0(), k = side === 'L' ? 1 : -1; s.set('rp', -0.10 * k, y, 0.55).set('rref', 1.00).set('rfr', 0).set('ra', 62, 0, 0).set('rhwa', 1).set('rhga', 1.00).set('lhwa', 1).set('lhga', 1.40).set('spE', lean, 0, 0).set('pelE', -6, 0, 0).set('pel', 0, -lean * 0.012, 0.10).set('fl', 0.15, 0.085, 0.06).set('fr', -0.15, 0.085, -0.12).set('fle', 0, 8, 0).set('fre', 0, -8, 0).set('lcont', 1).set('rcont', 1).set('rep', -0.5, -1, -0.2).set('lep', 0.5, -1, -0.2); return s; };
  for (const [role, side] of [['gunner', 'R'], ['no5', 'L']]) {
    const lo = hs(0.55, 30, side), hi = hs(1.05, 8, side);
    D.push(seq('unlimber_trail_raise_' + role, (role === 'gunner' ? 'Gunner' : 'No. 5') + ' raises the trail off the pintle on the handspike (Action front)', [[0, lo], [0.7, lo], [1.1, hi]], meta('trail', { role, props: { prop_long: 'handspike' }, propB: 'prop_sword' })));
    D.push(seq('limber_trail_lower_' + role, (role === 'gunner' ? 'Gunner' : 'No. 5') + ' lowers the trail onto the limber pintle (Limber up)', [[0, hi], [1.1, lo], [0.6, lo]], meta('trail', { role, props: { prop_long: 'handspike' }, propB: 'prop_sword' })));
  }
  const key0 = mod(A0(), s => s.set('spE', 44, 0, 0).set('pelE', -8, 0, 0).set('pel', 0, -0.36, 0.12).set('fl', 0.15, 0.085, 0.06).set('fr', -0.15, 0.085, -0.14).set('fle', 0, 8, 0).set('fre', 0, -8, 0).set('lcont', 1).set('rcont', 1).set('rhp', -0.12, 0.22, 0.46).set('lhp', 0.16, 0.20, 0.46).set('rep', -0.5, -1, 0).set('lep', 0.5, -1, 0).set('hdE', -16, 0, 0).set('hfr', 0).set('rfr', 0).set('rp', -0.35, 0.0, 0.2).set('ra', 80, 0, 0));
  D.push(seq('limber_key_pintle', 'Keys the lunette on the limber pintle (stoops, drives the key home, takes it out again to unlimber)', [[0, key0], [0.6, mod(key0, s => s.set('rhp', -0.10, 0.18, 0.52).set('lhp', 0.14, 0.18, 0.44))], [0.5, mod(key0, s => s.set('rhp', -0.12, 0.26, 0.44))], [0.6, key0]], meta('trail', { role: 'gunner' })));
  for (const side of ['L', 'R']) { const k = side === 'L' ? 1 : -1;
    const spoke = s => { POSE.shoulderArms(s); s.set('rhwa', 0).set('lhwa', 0).set('rfr', 0).set('rp', -0.4, 0.0, 0.2).set('ra', 80, 0, 0).set('lhp', 0.30 * k + 0.0, 0.92, 0.50).set('rhp', 0.04 * k, 0.88, 0.50).set('lep', 0.5 * k, -0.9, -0.2).set('rep', -0.5 * k, -0.9, -0.2).set('spE', 16, 0, 0); if (k < 0) s.set('lhp', -0.04, 0.88, 0.50).set('rhp', -0.30, 0.92, 0.50); return s; };
    const g = gaitDef({ id: 'gun_by_hand_spoke_' + side, gait: 'common_time', carry: spoke, speedScale: 0.5, label: 'Moving the piece by hand: on the spokes of the ' + (side === 'L' ? 'left' : 'right') + ' wheel (pushing, leaning into it)', tier: 'plausible-procedural' });
    g.family = 'limber'; Object.assign(g.meta, meta('hand', { role: 'spoke_' + side })); D.push(g); }
  const mz = s => { POSE.shoulderArms(s); s.set('rhwa', 0).set('lhwa', 0).set('rfr', 0).set('rp', -0.4, 0.0, 0.2).set('ra', 80, 0, 0).set('rhp', -0.22, 0.95, 0.50).set('lhp', 0.22, 0.95, 0.50).set('lep', 0.5, -0.9, -0.2).set('rep', -0.5, -0.9, -0.2).set('spE', 14, 0, 0); return s; };
  { const g = gaitDef({ id: 'gun_by_hand_muzzle', gait: 'common_time', carry: mz, speedScale: 0.5, label: 'Moving the piece by hand: pushing at the muzzle end of the carriage', tier: 'plausible-procedural' }); g.family = 'limber'; Object.assign(g.meta, meta('hand', { role: 'muzzle' })); D.push(g); }
  const pr0 = mod(A0(), s => s.set('spE', 30, 0, 0).set('pelE', -6, 0, 0).set('pel', 0, -0.20, 0.06).set('rhp', -0.14, 0.50, 0.46).set('lhp', 0.14, 0.52, 0.30).set('hfr', 0).set('rep', -0.4, -1, 0).set('lep', 0.4, -1, 0));
  D.push(seq('prolonge_uncoil_no5', 'No. 5 uncoils the prolonge and carries the toggle to the gunner (Fix prolonge)', [[0, pr0], [0.8, mod(pr0, s => s.set('rhp', -0.30, 0.45, 0.56).set('lhp', 0.20, 0.40, 0.42).set('spE', 40, 0, 0))], [0.9, mod(pr0, s => s.set('rhp', -0.20, 0.95, 0.40).set('lhp', 0.10, 0.80, 0.36).set('spE', 12, 0, 0))], [0.7, A0()]], meta('prolonge', { role: 'no5' })));
  const pt0 = mod(key0, s => s.set('rhp', -0.16, 0.45, 0.50).set('lhp', 0.12, 0.40, 0.46).set('spE', 36, 0, 0));
  D.push(seq('prolonge_toggle_gunner', 'The gunner fixes the toggle of the prolonge through the trail lunette', [[0, A0()], [0.7, pt0], [1.0, mod(pt0, s => s.set('rhp', -0.12, 0.42, 0.56).set('lhp', 0.14, 0.36, 0.50))], [0.7, A0()]], meta('prolonge', { role: 'gunner' })));
  return D;
}

// ------------------------------------------------------------------------------------------------ horse artillery (G-ANIM-18): mounted cannoneers, drivers, mounting and dismounting, horse-holders
// Documented: in horse artillery there are 11 cannoneers to each piece, all mounted, and two extra men hold the horses of the others while they work the piece (ART-GB-30). The seat is the rider seat of clips-cavalry.mjs.
const SEAT = { pel: [0, -0.80, 0], fl: [0.30, -0.50, -0.06], fr: [-0.30, -0.50, -0.06] };
function seatBase() { const s = A0(); s.set('pel', ...SEAT.pel).set('pelE', 0, 0, 0).set('fl', ...SEAT.fl).set('fr', ...SEAT.fr).set('fle', -10, 12, 0).set('fre', -10, -12, 0).set('lcont', 0).set('rcont', 0).set('rhwa', 0).set('lhwa', 0).set('spE', 6, 0, 0).set('lep', 0.5, -1, -0.2).set('rep', -0.5, -1, -0.2).set('rp', -0.25, 0.1, 0.1).set('ra', 0, 0, 0).set('rfr', 0); return s; }
function horseArtilleryDefs() {
  const D = [];
  for (const gait of ['walk', 'trot', 'canter', 'gallop']) {
    const base = riderGaitDef(gait), ev = base.eval, lean = { walk: 3, trot: 7, canter: 12, gallop: 22 }[gait];
    D.push({ ...base, id: 'hart_cannoneer_' + gait, family: 'hart', eval(t, spec) { ev(t, spec); spec.set('rhp', -0.14, 0.12, 0.36).set('lhp', 0.14, 0.12, 0.38).set('rep', -0.6, -0.9, -0.2).set('lep', 0.6, -0.9, -0.2).set('spE', lean + 2, 0, 0); },
      meta: { label: 'Horse artillery cannoneer riding at the ' + gait + ' (both hands on the reins, carbine slung)', pairedWith: 'horse_' + gait, cycleS: base.meta.cycleS, tier: 'plausible-procedural', gap: 'G-ANIM-18', src: ['ART-GB-30'], rootSpeed: 0 } });
  }
  for (const gait of ['trot', 'gallop']) {
    const base = riderGaitDef(gait), ev = base.eval, lean = { trot: 8, gallop: 24 }[gait];
    D.push({ ...base, id: 'hart_driver_' + gait, family: 'hart', eval(t, spec) { ev(t, spec); const w = 2 * Math.PI * t / base.dur; spec.set('lhp', 0.14, 0.14, 0.40).set('rhp', -0.30, 0.55 + 0.35 * Math.max(0, Math.sin(w)) * (gait === 'gallop' ? 1 : 0.4), 0.30).set('rep', -1, -0.2, 0).set('lep', 0.6, -0.9, -0.2).set('spE', lean, 0, 0); },
      meta: { label: 'Driver on the near horse at the ' + gait + ': reins in the left hand, whip arm working', pairedWith: 'horse_' + gait, cycleS: base.meta.cycleS, tier: 'plausible-procedural', gap: 'G-ANIM-18', src: ['ART-GB-30'], rootSpeed: 0 } });
  }
  const seat = mod(seatBase(), s => s.set('hfr', 1).set('rhp', -0.14, -0.42, 0.35).set('lhp', 0.14, -0.42, 0.35)), grd = mod(A0(), s => s.set('rootT', 0, -0.80, 0).set('ffr', 1).set('fl', 0.092, 0.085, -0.012).set('fr', -0.092, 0.085, -0.012).set('lcont', 1).set('rcont', 1).set('hfr', 1).set('rhp', -0.26, -0.42, 0.05).set('lhp', 0.26, -0.42, 0.05));
  const swing = mod(seat, s => s.set('pel', 0.0, -0.74, 0.0).set('pelE', 0, 0, 6).set('ffr', 1).set('fr', -0.16, 0.10, -0.40).set('fre', 30, -15, 0).set('rhp', -0.18, -0.50, 0.25).set('lhp', 0.14, -0.42, 0.35).set('spE', 10, 6, 0));
  const slide = mod(grd, s => s.set('rootT', 0, -0.40, 0).set('pel', 0, -0.20, 0).set('fl', 0.14, 0.30, 0.10).set('fr', -0.14, 0.50, -0.05).set('spE', 20, 0, 0).set('rhp', -0.25, -0.50, 0.15).set('lhp', 0.25, -0.50, 0.15));
  D.push(seq('hart_dismount', 'Horse artillery cannoneer dismounts (swings the right leg over, slides down by the saddle, lands)', [[0, mod(seat, s => s.set('ffr', 1))], [0.75, swing], [0.7, slide], [0.6, grd]], { family: 'hart', src: ['ART-GB-30'], tier: 'plausible-procedural', gap: 'G-ANIM-18', dismountDropM: 0.80, rootDropAssumption: 'SEAT.pel of clips-cavalry.mjs (pelvis 0.80 m below standing height)' }));
  D.push(seq('hart_mount', 'Horse artillery cannoneer mounts (left foot to the stirrup, swings the right leg over, settles in the seat)', [[0, grd], [0.6, slide], [0.7, swing], [0.75, mod(seat, s => s.set('ffr', 1))]], { family: 'hart', src: ['ART-GB-30'], tier: 'plausible-procedural', gap: 'G-ANIM-18', dismountDropM: 0.80 }));
  const hold = (dy) => mod(POSE.shoulderArms(new Spec()), s => s.set('rhwa', 0).set('lhwa', 0).set('rhp', -0.22, 0.95 + dy, 0.34).set('lhp', 0.20, 1.0 + dy, 0.30).set('rep', -0.4, -0.6, -0.2).set('lep', 0.4, -0.6, -0.2).set('rp', -0.4, 0.0, 0.2).set('rfr', 0));
  D.push(seq('hart_horse_holder_stand', 'Horse artillery horse-holder (one of the two extra men): holds several horses at a halt, a horse tugging', [[0, hold(0)], [1.5, hold(0.03)], [0.4, mod(hold(0.08), s => s.set('spE', -4, 0, 0).set('pelE', 0, 0, 3))], [1.5, hold(0)]], { family: 'hart', loop: true, src: ['ART-GB-30'], tier: 'plausible-procedural', gap: 'G-ANIM-18' }));
  const hw = gaitDef({ id: 'hart_horse_holder_walk', gait: 'common_time', carry: s => { s.v.set(hold(0).v); return s; }, speedScale: 1, label: 'Horse artillery horse-holder leading the horses at the walk', tier: 'plausible-procedural' });
  hw.family = 'hart'; hw.meta.gap = 'G-ANIM-18'; hw.meta.src = ['ART-GB-30']; D.push(hw);
  return D;
}

// ------------------------------------------------------------------------------------------------ paired sabre fights (G-ANIM-19)
// Two matched clips A and B on the same timeline. The figures face each other at pairDistanceM; the blade point of one that meets the blade point of the other is written in each figure's own frame as the mirror image of the
// other (x flips because the figures face each other): contact point C = (xc, yc, zc) in A's frame is (-xc, yc, D - zc) in B's frame, D the distance. meta.contacts lists the instants.
function sabreDefs() {
  const D = [], src = [];
  // HAND-ANCHORED BLADES (ANIM3D-NOTES 11.1). The sabre prop's blade is along -y and the right hand grips 0.10 m above the guard, so with the unit vector b along the blade (toward the opponent) the point 0.55 m up the blade is
  // P = R + 0.65 b, R the right hand. A contact is therefore authored by the contact point P and the blade direction b and the hand follows: R = P - 0.65 b (no hand can be asked for a point out of reach: R is checked against the arm).
  // The first round keyed the sabre by a point on the +y side and a pitch, the hands could not reach and the blades were pulled by 11 and 21 cm at the second and third contacts.
  const BLADE = 0.65, G = 0.10;
  const putH = (s, ch) => { for (const [k, v] of Object.entries(ch)) s.set(k, ...v); return s; };
  const sw = (R, b) => holdCh({ which: 'B', frame: 0, R, rg: G, dir: [-b[0], -b[1], -b[2]] });
  const atP = (P, b) => sw([P[0] - BLADE * b[0], P[1] - BLADE * b[1], P[2] - BLADE * b[2]], b);
  const bodyG = s => s.set('rep', -0.8, -0.4, -0.3).set('lhwb', 0).set('lhp', 0.245, 0.9, -0.1).set('spE', 6, -14, 0).set('pelE', 0, -14, 0).set('hdE', 0, 8, 0);
  const base = () => bodyG(putH(mod(POSE.shoulderArms(new Spec()), s => s.set('rhwa', 0).set('lhwa', 0).set('rp', -0.3, 0.0, 0.2).set('rfr', 0).set('ra', 80, 0, 0).set('fl', 0.14, 0.085, 0.16).set('fr', -0.19, 0.085, -0.20).set('fle', 0, 20, 0).set('fre', 0, -70, 0).set('lcont', 1).set('rcont', 1)), sw([-0.20, 1.15, 0.30], [0.15, 0.25, 0.96])));
  const D0 = 1.6, mir = (c) => [-c[0], c[1], D0 - c[2]];
  const C = [[-0.02, 1.45, 0.80], [0.0, 1.10, 0.80], [-0.02, 0.75, 0.80]];     // contact points in A's frame: high, middle, low
  const g0 = base(), at = (P, b, extra) => mod(g0, s => { putH(s, atP(P, b)); s.set('rep', -1, 0, -0.1).set('spE', 10, -24, 0); if (extra) extra(s); });
  const raised = mod(g0, s => { putH(s, sw([-0.20, 1.35, 0.30], [0.10, 0.45, 0.89])); });
  // timeline (s): 0 guard | 0.55 A starts the high cut | 0.85 contact 1 (A cuts, B parries) | 1.40 | 1.70 contact 2 (B point, A parries) | 2.30 | 2.60 contact 3 (A low cut, B parries) | 3.40 disengage | 4.00 guard
  const aSteps = [[0, g0], [0.55, g0], [0.30, at(C[0], [0.15, -0.28, 0.95]), 'fast'], [0.55, raised], [0.30, at(C[1], [0.50, 0.10, 0.86], s => s.set('rep', -0.6, -0.4, -0.3).set('spE', 6, -14, 0))], [0.60, g0], [0.30, at(C[2], [0.10, -0.50, 0.86]), 'fast'], [0.80, g0], [0.60, g0]];
  const bAt = (P, b, extra) => mod(g0, s => { putH(s, atP(P, b)); if (extra) extra(s); });
  const bSteps = [[0, g0], [0.55, g0], [0.30, bAt(mir(C[0]), [0.30, 0.55, 0.78]), 'fast'], [0.55, bAt(mir(C[0]), [0.30, 0.55, 0.78])], [0.30, bAt(mir(C[1]), [0.0, 0.0, 1.0], s => s.set('rep', -1, 0, -0.1).set('spE', 12, -26, 0)), 'fast'], [0.60, g0], [0.30, bAt(mir(C[2]), [0.25, -0.35, 0.90]), 'fast'], [0.80, g0], [0.60, g0]];
  const contacts = [{ tS: 0.85, pointA: C[0], pointB: mir(C[0]) }, { tS: 1.70, pointA: C[1], pointB: mir(C[1]) }, { tS: 2.60, pointA: C[2], pointB: mir(C[2]) }];
  const pm = { family: 'melee', src, tier: 'plausible-procedural', gap: 'G-ANIM-19', pairDistanceM: D0, contacts, props: { prop_sword: 'sabre' } };
  D.push(seq('sabre_duel_a', 'Dismounted sabre duel, fencer A (high cut, parries the riposte, low cut)', aSteps, { ...pm, role: 'duelist_a', pairedWith: 'sabre_duel_b', pairOffsetM: [0, 0, D0] }));
  D.push(seq('sabre_duel_b', 'Dismounted sabre duel, fencer B (parries the high cut, riposte point, parries the low cut)', bSteps, { ...pm, role: 'duelist_b', pairedWith: 'sabre_duel_a', pairOffsetM: [0, 0, D0] }));
  // mounted passing fight: the riders pass right side to right side, each cuts as the other passes (the horses pair with horse_canter)
  const rA = mod(seatBase(), s => s.set('rhwb', 1).set('rhgb', 0.12).set('bfr', 0).set('bref', 0.55).set('bp', -0.20, 0.45, 0.30).set('ba', 30, 0, 0).set('rep', -0.8, -0.5, -0.3));
  const cutA = mod(rA, s => s.set('bp', -0.45, 0.65, 0.10).set('ba', 12, -30, 0).set('rep', -1, 0, 0).set('spE', 6, -20, 0)), hitA = mod(rA, s => s.set('bp', 0.20, 0.25, 0.60).set('ba', 100, 20, 0).set('spE', 14, 26, 0).set('rep', -0.4, -0.8, -0.2));
  const pcB = mod(rA, s => s.set('bp', -0.05, 0.55, 0.50).set('ba', 64, 30, 0).set('rep', -0.9, -0.3, -0.3).set('spE', 8, 12, 0));
  D.push(seq('rider_sabre_fight_a', 'Mounted sabre fight, rider A passing: raises the sabre, cuts to the right as the other rider passes, recovers', [[0, rA], [0.7, cutA], [0.25, hitA, 'fast'], [0.8, rA]], { family: 'melee', src, tier: 'plausible-procedural', gap: 'G-ANIM-19', role: 'rider_a', pairedWith: 'rider_sabre_fight_b', pairOffsetM: [-1.3, 0, 0.0], contacts: [{ tS: 0.95, note: 'A cut meets B parry' }], props: { prop_sword: 'sabre' } }));
  D.push(seq('rider_sabre_fight_b', 'Mounted sabre fight, rider B passing: guard, parries the cut high, returns a point', [[0, rA], [0.7, pcB], [0.25, mod(pcB, s => s.set('bp', -0.10, 0.58, 0.46).set('ba', 52, 24, 0)), 'fast'], [0.8, rA]], { family: 'melee', src, tier: 'plausible-procedural', gap: 'G-ANIM-19', role: 'rider_b', pairedWith: 'rider_sabre_fight_a', pairOffsetM: [1.3, 0, 0.0], contacts: [{ tS: 0.95, note: 'A cut meets B parry' }], props: { prop_sword: 'sabre' } }));
  // cavalryman against infantry on the guard against cavalry (the infantry side is bayonet_guard_cavalry)
  D.push(seq('melee_cav_cut_at_infantry', 'Mounted trooper cuts down at an infantryman on guard against cavalry (the infantry side is bayonet_guard_cavalry)', [[0, rA], [0.6, cutA], [0.25, mod(rA, s => s.set('bp', -0.10, 0.2, 0.55).set('ba', 120, 10, 0).set('spE', 18, -10, 0).set('rep', -0.8, -0.6, -0.2)), 'fast'], [0.8, rA]], { family: 'melee', src: ['HAR-S35'], tier: 'plausible-procedural', gap: 'G-ANIM-19', role: 'trooper', pairedWith: 'bayonet_guard_cavalry', pairOffsetM: [0, 0, 1.8], props: { prop_sword: 'sabre' } }));
  return D;
}

export function g9ServiceDefs() { return [...stretcherDefs(), ...limberDefs(), ...horseArtilleryDefs(), ...sabreDefs()]; }
export { STRETCHER };

export function g9InfantryDefs() { return [...coverDefs(), ...dressDefs(), ...wheelDefs(), ...skirmishDefs()]; }
export function g9Defs() { return [...g9InfantryDefs(), ...g9ServiceDefs()]; }
