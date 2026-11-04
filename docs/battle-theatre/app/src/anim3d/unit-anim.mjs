// The unit state machine: a unit's ACTIVITY timeline (marching, standing, firing, advancing, retreating, charging, resting, night camp, serving the guns, wounded, ...) and the fire plan decide, for every figure and every time,
// which clip plays at what clip time and with what blend. clipAt(k, t, out) is a PURE function of (segments, fire plan, falls, figure variation, k, t): no state advances, so a seek to any t gives the same pose as playing there
// from the start (gate G16 / Q12), and nothing here uses Math.random or a clock. The per-figure variation (phase offset, gait rate, fall style, camp role) comes from the manifest's variation scalar through an integer hash.
//
// Activity vocabulary. The history contract (src/history/contract.mjs ACTIVITIES) has: march, double_quick, halt, stand, rest, fire, serve_guns, gallop, build_works, camp. This module accepts those and
// the extra names ADVANCE, RETREAT, CHARGE, SKIRMISH, NIGHT_CAMP, PICKET, WOUNDED_WALK, CARRY_WOUNDED, SALUTE ... (EXTRA_ACTIVITIES below); the shell's contract stays unchanged, the stage may pass the extra names when the history layer has them.
import { hash4 } from '../../../sim/rng.mjs';
import { cycleDurations, cycleDurationsArr, CYCLE_STEPS, NOMINAL_CYCLE_S } from './musketry.mjs';
import { GAITS } from './locomotion.mjs';
import { MARCH, stepM, stepsPerMin, REACTION_S } from './drill-tables.mjs';
import { GUN_CYCLE_NOMINAL_S } from './clips-artillery.mjs';
import { smooth, clamp } from './qmath.mjs';
import { gaitId } from './library.mjs';
import { VARIANTS } from './variants.mjs';
import { gaitBasis, mountedGait, mountedRate, GAIT_NAMES } from './gaits.mjs';

export const CONTRACT_ACTIVITIES = ['march', 'double_quick', 'halt', 'stand', 'rest', 'fire', 'serve_guns', 'gallop', 'build_works', 'camp'];
export const EXTRA_ACTIVITIES = ['advance', 'retreat', 'charge', 'skirmish', 'night_camp', 'picket', 'wounded_walk', 'carry_wounded', 'walk', 'trot', 'canter', 'halt_mounted', 'cheer', 'bury'];
export const ALL_ACTIVITIES = [...CONTRACT_ACTIVITIES, ...EXTRA_ACTIVITIES];
export const GAIT_SPEEDS = ['common_time', 'quick_time', 'route_step', 'double_quick', 'double_quick_urgent', 'run'].map(g => ({ gait: g, v: stepM(MARCH[g]) * stepsPerMin(MARCH[g]) / 60 }));
const U = 4294967296;
const MOUNT_T = { walk: 1.10, trot: 0.66, canter: 0.56, gallop: 0.46 };
const FALL_END = { back: 'back', front: 'front', side_left: 'side_left', side_right: 'side_right', knee_first: 'front', spin: 'back', clutch_wound: 'side_left', drop_rifle: 'back' };
const FALL_STYLES = ['back', 'front', 'side_left', 'side_right', 'knee_first', 'spin', 'clutch_wound', 'drop_rifle'];
const ROLE_ORDER = ['gunner', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'chief'];
const BLEND_S = { march: 0.35, stand: 0.30, fire: 0.30, camp: 0.5, work: 0.4, default: 0.3 };
const RATE_CLAMP = [0.85, 1.15];

// per-figure variation from the manifest scalar v (and the figure index): all deterministic
export function figureVariation(v, k, seed, out = {}) {
  const vi = Math.floor((v ?? 0) * 1e6) >>> 0, h0 = hash4(seed >>> 0, k >>> 0, vi, 11) / U, h1 = hash4(seed >>> 0, k >>> 0, vi, 12) / U, h2 = hash4(seed >>> 0, k >>> 0, vi, 13) / U, h3 = hash4(seed >>> 0, k >>> 0, vi, 14) / U;
  out.phase = h0; out.rate = 0.92 + 0.16 * h1; out.scale = 0.95 + 0.11 * h2; out.style = Math.floor(h3 * 8) % 8; out.pick = h3; return out;           // plan G8: rate 0.92-1.08, scale 0.95-1.06
}

// the result of clipAt: a FIXED-shape record (a, b, h: clip indices; the times / weight / rate live in ONE Float64Array `d` [ta, tb, w, th, rate] so that no store of a double can allocate a heap number, whatever tier V8 has compiled
// the caller in: a double stored into an object field was measured to cost 16 bytes per store in optimised code, 11 stores = 177 B per clipAt, depending on the tier and on inlining (DEC-ANIM-03).
// a: clip index of the main clip, ta: its time; b, tb, w: the clip blended in and its weight (b = -1: none); h, th: the horse clip of a mounted figure; rate: playback rate. ta, tb, w, th, rate stay readable as properties. Callers must pass one of these.
export const SEL_TA = 0, SEL_TB = 1, SEL_W = 2, SEL_TH = 3, SEL_RATE = 4;
export class ClipSel {
  constructor() { this.a = 0; this.b = -1; this.h = -1; this.d = new Float64Array(5); this.d[SEL_RATE] = 1; }
  get ta() { return this.d[SEL_TA]; } set ta(v) { this.d[SEL_TA] = v; } get tb() { return this.d[SEL_TB]; } set tb(v) { this.d[SEL_TB] = v; } get w() { return this.d[SEL_W]; } set w(v) { this.d[SEL_W] = v; }
  get th() { return this.d[SEL_TH]; } set th(v) { this.d[SEL_TH] = v; } get rate() { return this.d[SEL_RATE]; } set rate(v) { this.d[SEL_RATE] = v; }
}
// a clip slot of the evaluator: clip index c and clip time d[0]
class Slot { constructor() { this.c = 0; this.d = new Float64Array(1); } get t() { return this.d[0]; } set t(v) { this.d[0] = v; } }
// a segment of a unit's activity timeline with a FIXED shape (monomorphic property access in the hot path)
export class Seg {
  constructor(s) {
    this.t0 = s.t0; this.activity = s.activity; this.speed = s.speed ?? 0; this.route = !!s.route; this.posture = s.posture || 'stand'; this.plan = s.plan || null; this.night = !!s.night; this.carry = s.carry || ''; this.dismounted = !!s.dismounted;
    this.surface = s.surface || ''; this.lengthM = s.lengthM || 0; this.mode = s.mode || ''; this.i = 0; this.prev = null; this.kind = ''; this.g = null; this.phi0 = 0; this.blend = 0.3; this.cid = null; this.cidx = null; this.gi = 0; this.mr = 1;
  }
}
export class UnitAnimator {
  constructor(lib, o) {
    this.lib = lib; this.gb = gaitBasis(o.gaitBasis || 'modern_range'); this.unitId = o.unitId; this.n = o.n; this.seed = o.seed ?? 1863; this.arm = o.arm || 'infantry'; this.cpg = o.crewPerGun || 8;
    this.varOf = o.variation || (() => 0.5); this.segs = []; this.fallT = null; this.fate = null; this.var = []; this.ids = {};
    this.vphase = new Float64Array(this.n); this.vrate = new Float64Array(this.n); this.vscale = new Float64Array(this.n); this.vstyle = new Uint8Array(this.n); this.vpick = new Float64Array(this.n);
    const tmp = {}; for (let k = 0; k < this.n; k++) { figureVariation(this.varOf(k), k, this.seed, tmp); this.vphase[k] = tmp.phase; this.vrate[k] = tmp.rate; this.vscale[k] = tmp.scale; this.vstyle[k] = tmp.style; this.vpick[k] = tmp.pick; }
    // variants (variants.mjs): vt[clipIndex * VARIANTS + v] = the clip index of variant v of that clip (-1: none); vk[k] = the variant this figure plays, drawn from the manifest scalar through an integer hash (stream 15)
    this.useVariants = o.variants !== false; this.vt = new Int32Array(lib.order.length * VARIANTS).fill(-1); this.vk = new Uint8Array(this.n);
    for (const [base, ids] of (lib.variantsOf || new Map())) { const bi = lib.order.indexOf(base); for (let v = 0; v < ids.length; v++) this.vt[bi * VARIANTS + v] = lib.order.indexOf(ids[v]); }
    { const tmp = {}; for (let k = 0; k < this.n; k++) { const vi = Math.floor((this.varOf(k) ?? 0) * 1e6) >>> 0; this.vk[k] = Math.floor(hash4(this.seed >>> 0, k >>> 0, vi, 15) / U * VARIANTS) % VARIANTS; void tmp; } }
    this.A = new Slot(); this.Bq = new Slot(); this.wv = new Float64Array(4); this.loc = new Float64Array(4); this._idx = new Map(); lib.order.forEach((id, i) => this._idx.set(id, i));
    this.cDur = lib.order.map(id => lib.def(id).dur);
    this.dMemo = {}; this.warp = { aim: 0, pause: 0, fire: 0 };
    this.nomD = cycleDurations(NOMINAL_CYCLE_S, 0.6);
    this.nomStart = {}; { let t = 0; for (const s of CYCLE_STEPS) { this.nomStart[s] = t; t += this.nomD[s]; } }
    this.actD = {}; this.actStart = {}; this.iFall = FALL_STYLES.map(st => this.idx('fall_' + st)); this.iLie = { dead: {}, wounded: {} }; for (const e of ['back', 'front', 'side_left', 'side_right']) { this.iLie.dead[e] = this.idx('lie_dead_' + e); this.iLie.wounded[e] = this.idx('lie_wounded_' + e); }
    this.iGun = ROLE_ORDER.map(r => this.idx('gun_crew_' + r)); this.iRider = {}; this.iHorse = {}; for (const g of ['walk', 'trot', 'canter', 'gallop']) { this.iRider[g] = this.idx('rider_' + g); this.iHorse[g] = this.idx('horse_' + g); }
    this.iRiderCarry = this.idx('rider_sabre_carry'); this.iRiderCarbine = this.idx('rider_carbine_fire'); this.iHorseIdle = this.idx('horse_idle'); this.iLitterF = this.idx('carry_litter_front'); this.iLitterR = this.idx('carry_litter_rear');
    this.iStandShoulder = this.idx('stand_shoulder'); this.iStandOrder = this.idx('stand_order'); this.iStandRss = this.idx('stand_rss'); this.iStandRest = this.idx('stand_rest'); this.iReady = this.idx('ready_from_shoulder'); this.iShoulderReady = this.idx('shoulder_from_ready');
    this.iFire = { fire_cycle_stand: this.idx('fire_cycle_stand'), fire_cycle_kneel: this.idx('fire_cycle_kneel'), fire_cycle_lie: this.idx('fire_cycle_lie') }; this.iWork = ['dig_shovel', 'dig_shovel', 'chop_axe', 'lay_stone', 'march_carry_rail'].map(id => this.idx(id));
    this.dArr = new Float64Array(14); this.nomDA = Float64Array.from(CYCLE_STEPS.map(id => this.nomD[id])); this.nomStartA = Float64Array.from(CYCLE_STEPS.map(id => this.nomStart[id]));
  }
  idx(id) { const i = this._idx.get(id); if (i === undefined) throw new Error('animator: no clip ' + id); return i; }
  // segments: [{ t0, activity, speed, route, posture, plan, night, carry, mode }] sorted by t0. The animator computes the cumulative gait phase of the unit across march segments.
  setSegments(segs) {
    this.segs = segs.map(s => new Seg(s)).sort((a, b) => a.t0 - b.t0); let phi = 0, prevMarch = false;
    this.segs.forEach((s, i) => {
      s.i = i; s.prev = i > 0 ? this.segs[i - 1] : null; s.kind = this._kind(s);
      if (s.kind === 'march') { const g = this.pickGait(s.speed, s.route, s.activity); s.g = g; s.phi0 = prevMarch ? phi : 0; const nxt = this.segs[i + 1]; if (nxt) { phi = s.phi0 + (nxt.t0 - s.t0) * g.freq; } prevMarch = true; }
      else prevMarch = false;
      if (s.kind === 'mounted') { s.gi = mountedGait(this.gb, s.speed); s.mr = mountedRate(this.gb, s.gi, s.speed); }   // gaits.mjs: the gait clip and its cadence for this ground speed
      s.blend = BLEND_S[s.kind] ?? BLEND_S.default;
      if (s.kind === 'march' || s.kind === 'mounted') s.blend = 0.35;
      if (s.kind === 'camp') { s.cid = this._campIds(s); s.cidx = s.cid.map(id => this.idx(id)); }
    });
    return this;
  }
  setFalls(fallT, fate) { this.fallT = fallT; this.fate = fate; return this; }                // fallT[k] in sim seconds (Infinity = never), fate[k]: 0 killed, 1 wounded
  _kind(s) {
    const a = s.activity;
    if (a === 'fire' || a === 'skirmish') return this.arm === 'cavalry' && s.dismounted !== true ? 'mounted_fire' : 'fire';
    if (a === 'serve_guns') return 'guns'; if (a === 'march' || a === 'double_quick' || a === 'advance' || a === 'retreat' || a === 'charge' || a === 'wounded_walk') return this.arm === 'cavalry' && !s.dismounted ? 'mounted' : 'march';
    if (a === 'gallop' || a === 'walk' || a === 'trot' || a === 'canter') return 'mounted'; if (a === 'build_works' || a === 'bury') return 'work'; if (a === 'camp' || a === 'night_camp' || a === 'picket') return 'camp';
    if (a === 'carry_wounded') return 'litter'; if (a === 'rest') return 'rest'; if (a === 'halt_mounted') return 'mounted_stand'; return 'stand';
  }
  // choose the gait clips for a ground speed: returns { a: gait name, carry, freq (cycles per second at rate 1 ... played at v/vclip), w (blend weight to b), b }
  pickGait(v, route, activity) {
    const sp = GAIT_SPEEDS; let lo = 0; for (let i = 0; i < sp.length; i++) if (sp[i].v <= v + 1e-9) lo = i;
    const carryFor = (g) => g === 'common_time' ? 'shoulder' : g === 'quick_time' ? (route ? 'rss' : 'shoulder') : g === 'route_step' ? 'atwill' : g === 'double_quick' ? (activity === 'charge' ? 'trail' : 'run') : 'run';
    const mk = (g) => { const id = this._gaitClip(g, carryFor(g), activity); return { name: g, id, v: sp.find(x => x.gait === g).v, T: 120 / stepsPerMin(MARCH[g]) }; };
    // quick time and route step have the same speed: route selects route_step
    const pick = (i) => { let g = sp[i].gait; if (g === 'quick_time' && route) g = 'route_step'; else if (g === 'route_step' && !route) g = 'quick_time'; return mk(g); };
    let A = pick(lo), B = null, w = 0;
    if (v < sp[0].v * RATE_CLAMP[0]) { A = pick(0); }                                                         // slower than 0.85 x common time: common time at a lower rate (down to the clamp in clipAt)
    else if (lo + 1 < sp.length) { const hi = pick(lo + 1), top = A.v * RATE_CLAMP[1], bot = hi.v * RATE_CLAMP[0]; if (v > top && v < bot) { B = hi; w = smooth(top, bot, v); } else if (v >= bot) A = hi; }
    const retreat = activity === 'retreat' && (A.name === 'double_quick' || A.name === 'run' || A.name === 'double_quick_urgent'); if (retreat) { A = { ...A, id: this._gaitClip('run', 'lookback', activity), name: 'run' }; }
    const rate = clamp(v / A.v, 0.35, RATE_CLAMP[1] * 1.0001); const rateA = (v / A.v >= RATE_CLAMP[0] && v / A.v <= RATE_CLAMP[1]) ? v / A.v : clamp(v / A.v, 0.35, RATE_CLAMP[1]);
    A.ci = this.idx(A.id); A.dur = this.cDur[A.ci]; if (B) { B.ci = this.idx(B.id); B.dur = this.cDur[B.ci]; }
    return { A, B, w, rateA, freq: rateA / A.T, T: A.T, drill: A.name === 'common_time' || A.name === 'quick_time' };
  }
  _gaitClip(g, carry, activity) {
    if (carry === 'lookback') return 'march_run_lookback';
    const id = gaitId(g, carry); if (this.lib.has(id)) return id;
    const alt = { shoulder: 'shoulder', rss: 'rss', atwill: 'atwill', run: 'run', trail: 'trail', order: 'order' }; void alt;
    for (const c of ['shoulder', 'rss', 'atwill', 'run', 'trail']) { const j = gaitId(g, c); if (this.lib.has(j)) return j; } throw new Error('no gait clip for ' + g);
  }
  _campIds(s) { return s.night ? ['sleep_side', 'sit_fire', 'sleep_side', 'stand_picket'] : ['sit_fire', 'cook_stir', 'eat_hardtack', 'stand_rest']; }
  segIndexAt(t) { const S = this.segs; let lo = 0, hi = S.length; while (lo < hi) { const m = (lo + hi) >> 1; if (S[m].t0 <= t) lo = m + 1; else hi = m; } return lo - 1; }

  // ---- the pure evaluation. out: ClipSel { a, b, h, d[ta, tb, w, th, rate] } (clip indices into lib.order, clip times in seconds; b = -1 when no blend; h = horse clip for mounted figures, -1 otherwise)
  // Allocation: every double is written into a Float64Array (out.d, A.d, wv, loc) and never passed as an argument to a non-inlined call or stored in an object field, so the update allocates (almost) nothing in any V8 tier.
  clipAt(k, t, out) {
    const od = out.d, Ad = this.A.d; out.b = -1; od[SEL_W] = 0; out.h = -1; od[SEL_TH] = 0; od[SEL_TB] = 0; od[SEL_RATE] = 1;
    const ft = this.fallT ? this.fallT[k] : Infinity;
    const si = this.segIndexAt(t), seg = si >= 0 ? this.segs[si] : null;
    if (ft <= t) { this._fall(k, t, ft, seg, out); this._variant(k, out); return out; }
    if (!seg) { this.A.c = this.iStandShoulder; Ad[0] = t + this.vphase[k] * 6; out.a = this.A.c; od[SEL_TA] = Ad[0]; return out; }
    this._eval(seg, k, t, this.A, out); out.a = this.A.c; od[SEL_TA] = Ad[0];
    if (seg.prev && t - seg.t0 < seg.blend) { this._eval(seg.prev, k, t, this.Bq, null); out.b = this.Bq.c; od[SEL_TB] = this.Bq.d[0]; od[SEL_W] = 1 - smooth(0, seg.blend, t - seg.t0); }       // weight of the OLD clip B: 1 at the change, 0 when the blend ends
    this._variant(k, out); return out;
  }
  // the figure's variant of the clips it plays (same durations and times: only the index changes)
  _variant(k, out) { if (!this.useVariants) return; const v = this.vk[k]; if (v === 0) return; let m = this.vt[out.a * VARIANTS + v]; if (m >= 0) out.a = m; if (out.b >= 0) { m = this.vt[out.b * VARIANTS + v]; if (m >= 0) out.b = m; } }
  _fall(k, t, ft, seg, out) {
    const fc = this.iFall[this.vstyle[k]], fd = this.cDur[fc], od = out.d;
    if (t - ft < fd) { out.a = fc; od[SEL_TA] = t - ft; if (seg && t - ft < 0.12) { this._eval(seg, k, t, this.Bq, null); out.b = this.Bq.c; od[SEL_TB] = this.Bq.d[0]; od[SEL_W] = 1 - smooth(0, 0.12, t - ft); } return; }
    const wounded = this.fate && this.fate[k] === 1, end = FALL_END[FALL_STYLES[this.vstyle[k]]];
    out.a = (wounded ? this.iLie.wounded : this.iLie.dead)[end]; od[SEL_TA] = (t - ft - fd) + this.vphase[k] * 5;
    if (t - ft - fd < 0.2) { out.b = fc; od[SEL_TB] = fd; od[SEL_W] = 1 - smooth(0, 0.2, t - ft - fd); }                     // settle from the last frame of the fall into the lying loop
  }
  _eval(seg, k, t, A, out) {
    const Ad = A.d;
    switch (seg.kind) {
      case 'march': return this._march(seg, k, t, A, out);
      case 'fire': return this._fire(seg, k, t, A);
      case 'guns': return this._guns(seg, k, t, A);
      case 'mounted': return this._mounted(seg, k, t, A, out);
      case 'mounted_stand': { A.c = this.iRiderCarry; Ad[0] = t + this.vphase[k] * 3; if (out) { out.h = this.iHorseIdle; out.d[SEL_TH] = t + this.vphase[k] * 6; } return; }
      case 'mounted_fire': { A.c = this.iRiderCarbine; Ad[0] = (t - seg.t0 + this.vphase[k] * 2) % 1.6; if (out) { out.h = this.iHorseIdle; out.d[SEL_TH] = t; } return; }
      case 'work': { const ids = this.iWork, ci = ids[Math.floor(this.vpick[k] * ids.length) % ids.length]; A.c = ci; Ad[0] = (t - seg.t0) * this.vrate[k] + this.vphase[k] * this.cDur[ci]; return; }
      case 'camp': { const ids = seg.cidx, ci = ids[Math.floor(this.vpick[k] * ids.length) % ids.length]; A.c = ci; Ad[0] = (t - seg.t0) * this.vrate[k] + this.vphase[k] * this.cDur[ci]; return; }
      case 'litter': { A.c = k % 2 === 0 ? this.iLitterF : this.iLitterR; Ad[0] = (t - seg.t0) * this.vrate[k]; return; }
      case 'rest': A.c = this.iStandRest; Ad[0] = (t - seg.t0) * this.vrate[k] + this.vphase[k] * 8; return;
      default: { const prevMarch = seg.prev && seg.prev.kind === 'march' && seg.prev.route; A.c = prevMarch ? this.iStandRss : seg.carry === 'order' ? this.iStandOrder : this.iStandShoulder; Ad[0] = (t - seg.t0) * this.vrate[k] + this.vphase[k] * 6; }
    }
  }
  _march(seg, k, t, A, out) {
    const g = seg.g, ph0 = g.drill ? (this.vphase[k] - 0.5) * 0.12 : this.vphase[k], w = this.vrate[k];
    const phi = seg.phi0 + (t - seg.t0) * g.freq * (g.drill ? 1 : w) + ph0;                    // cycles; coherent in drill time, loose on the route step and double quick
    const f = phi - Math.floor(phi); A.c = g.A.ci; A.d[0] = f * g.A.dur;
    if (out && g.B) { this.Bq.c = g.B.ci; this.Bq.d[0] = f * g.B.dur; out.b = this.Bq.c; out.d[SEL_TB] = this.Bq.d[0]; out.d[SEL_W] = g.w; }
    if (out) out.d[SEL_RATE] = g.rateA;
  }
  _mounted(seg, k, t, A, out) {
    const gait = GAIT_NAMES[seg.gi], T = MOUNT_T[gait];
    const f = (((t - seg.t0) / T) * seg.mr * (0.97 + 0.06 * this.vphase[k]) + this.vphase[k]) % 1;
    A.c = this.iRider[gait]; A.d[0] = f * T; if (out) { out.h = this.iHorse[gait]; out.d[SEL_TH] = f * T; out.d[SEL_RATE] = 1; }
  }
  _guns(seg, k, t, A) {
    const plan = seg.plan, g = Math.floor(k / this.cpg), ri = Math.min(ROLE_ORDER.length - 1, k % this.cpg), Ad = A.d;
    if (!plan || g >= plan.n || t < plan.startS - 4) { A.c = this.iStandOrder; Ad[0] = (t - seg.t0) * this.vrate[k] + this.vphase[k] * 6; return; }
    plan.locate(g, t, this.loc);
    if (this.loc[0] < 0) { A.c = this.iStandOrder; Ad[0] = (t - seg.t0) * this.vrate[k] + this.vphase[k] * 6; return; }
    A.c = this.iGun[ri]; Ad[0] = ((t - this.loc[1]) / this.loc[2]) * GUN_CYCLE_NOMINAL_S;
  }
  // fire: the Ready-Aim-Fire-Load cycle time-warped to the plan's cycle; before the first cycle the Ready motion, after the last the return to shoulder arms
  _fire(seg, k, t, A) {
    const plan = seg.plan, Ad = A.d; if (!plan) { A.c = this.iStandShoulder; Ad[0] = t * this.vrate[k]; return; }
    const post = seg.posture === 'kneel' ? this.iFire.fire_cycle_kneel : seg.posture === 'lie' ? this.iFire.fire_cycle_lie : this.iFire.fire_cycle_stand, loc = this.loc;
    plan.locate(k, t, loc); const READY_S = 2.0, SHOULDER_S = 2.0;
    if (loc[0] < 0) { if (t >= loc[1] - READY_S) { A.c = this.iReady; Ad[0] = t - (loc[1] - READY_S); } else { A.c = this.iStandShoulder; Ad[0] = (t - seg.t0) * this.vrate[k] + this.vphase[k] * 6; } return; }
    if (loc[0] === loc[3] && plan.endS !== Infinity && t >= loc[1] + loc[2]) { const te = t - (loc[1] + loc[2]); if (te < SHOULDER_S) { A.c = this.iShoulderReady; Ad[0] = te; } else { A.c = this.iStandShoulder; Ad[0] = te - SHOULDER_S + this.vphase[k] * 6; } return; }
    this.wv[1] = t - loc[1]; this._warp(); A.c = post; Ad[0] = this.wv[0];
  }
  // cycle time -> clip time (the clip is baked at the nominal cycle): regulated steps keep their length, the exempt steps stretch by the same factor. Reads tau = this.wv[1] and the cycle length this.loc[2]; writes this.wv[0]; warpCycle() is the public form.
  _warp() {
    const D = this.dArr, wv = this.wv, tau = wv[1], N = this.nomDA, NS = this.nomStartA, n = CYCLE_STEPS.length; cycleDurationsArr(this.loc, 2, 0.6, D); let ta = 0;
    for (let i = 0; i < n; i++) { const d = D[i]; if (tau < ta + d || i === n - 1) { let u = d > 0 ? (tau - ta) / d : 0; if (u < 0) u = 0; else if (u > 1) u = 1; wv[0] = NS[i] + u * N[i]; return; } ta += d; }
    wv[0] = NOMINAL_CYCLE_S;
  }
  warpCycle(tau, C) { this.wv[1] = tau; this.loc[2] = C; this._warp(); return this.wv[0]; }
}
export { FALL_END, FALL_STYLES, ROLE_ORDER };
