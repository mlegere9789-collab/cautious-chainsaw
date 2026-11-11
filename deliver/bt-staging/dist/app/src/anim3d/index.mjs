// ANIMATION façade (docs/battle-theatre/app/docs/BT-EVENTS.md, docs/ANIM3D-NOTES.md).
//   const anim = new AnimSystem({ skeleton, seed });            skeleton = data/figures3d/skeleton.json (parsed)
//   anim.addUnit({ unitId, n, arm, crewPerGun, variation: k => v })   v = the manifest's variation scalar (src/history/figures.mjs vari())
//   anim.setSegments(unitId, [{ t0, activity, speed, route, posture, plan, night }])   activity timeline from the history layer; plan = FirePlan for 'fire' / 'serve_guns'
//   anim.setFalls(unitId, fallT, fate)                           from the stage's 'state' events
//   anim.sampleFigure(unitId, k, t, outFrame, ground?, x, z, yaw) -> clip indices; outFrame is a rig frame (rig.frameLen floats); feed rig.expandFrame / rig.fk / rig.skin, or the baked textures of bake.mjs
//   anim.advance(t0, t1)                                         emits the events of [t0, t1) on anim.bus, sorted by t
// Everything is a pure function of (inputs, t): seeking never changes what an instant looks or sounds like.
import { ClipLibrary } from './library.mjs';
import { UnitAnimator, GAIT_SPEEDS, ClipSel, Seg, SEL_TA, SEL_TB, SEL_W } from './unit-anim.mjs';
import { AnimBus } from './events.mjs';
import { sampleClip, blendFrames, sampleClipAt, blendFramesAt } from './clipdef.mjs';
import { FootPlanter } from './terrain.mjs';
import { FirePlan } from './fire-plan.mjs';
import { cycleDurations, CYCLE_STEPS } from './musketry.mjs';
import { gunRecoil, GUN_CYCLE_NOMINAL_S } from './clips-artillery.mjs';
import { gunImpact } from './ballistics.mjs';
import { LOAD9, MARCH, stepsPerMin } from './drill-tables.mjs';
import { hash4, strId } from '../../../sim/rng.mjs';
import { hyp2 } from './qmath.mjs';
import { GAIT_NAMES, GAIT_BASES, GAIT_SOURCES, CHARGE_SCHEDULE, gaitBasis, gaitTable } from './gaits.mjs';
export { GAIT_NAMES, GAIT_BASES, GAIT_SOURCES, CHARGE_SCHEDULE, gaitBasis, gaitTable };
export { ClipLibrary, UnitAnimator, FirePlan, AnimBus, FootPlanter, GAIT_SPEEDS, ClipSel, Seg };
export * from './bake.mjs';
export { slopeAt, slopeAlong, slopeClass, slopeSpeedFactor, SLOPE } from './terrain.mjs';
export { gunRecoil } from './clips-artillery.mjs';
export { createAnimBus } from './events.mjs';
export { GearSprings, SpringChannel, bakeGearTrack, sampleGearTrack, GEAR_L } from './springs.mjs';

const STEP_NAME = { load: 'load', handle_cartridge: 'handle_cartridge', tear_cartridge: 'tear_cartridge', charge_cartridge: 'charge_cartridge', draw_rammer: 'draw_rammer', ram_cartridge: 'ram_cartridge', return_rammer: 'return_rammer', prime: 'prime', ready: 'ready', aim: 'aim' };
const STEP_INDEX = Object.fromEntries(LOAD9.map(t => [t.id, t.i])); STEP_INDEX.ready = 0; STEP_INDEX.aim = 0;
const EV = { FIRE: 1, RELOAD: 2, DRILL: 3, FOOT: 4, UMARCH: 5, CMD: 6, FALL: 7, LIE: 8, GUN: 9, HOOF: 10, ACT: 11, IMPACT: 12, MISFIRE: 13 };
const CMD_TEXT = { volley: ['Fire by company', 'Company', 'Ready', 'Aim', 'Fire', 'Load'], company: ['Fire by company', 'Company', 'Ready', 'Aim', 'Fire', 'Load'], battalion: ['Fire by battalion', 'Battalion', 'Ready', 'Aim', 'Fire', 'Load'],
  wing: ['Fire by wing', 'Right wing', 'Ready', 'Aim', 'Fire', 'Load'], file: ['Fire by file', 'Squad', 'Ready', 'Commence firing', '', ''], rank: ['Fire by rank', 'Squad', 'Ready', 'Rear rank', 'Aim', 'Fire'], squad: ['Fire by squad', 'Squad', 'Ready', 'Aim', 'Fire', 'Load'],
  at_will: ['Fire at will', '', '', 'Commence firing', '', ''], skirmish: ['Commence firing', '', '', '', '', ''], by_piece: ['Load', '', 'Commence firing', '', '', ''], battery_fire: ['Load', '', 'Commence firing', '', '', ''] };

export class AnimSystem {
  constructor({ skeleton, seed = 1863, gaitBasis: gb = 'modern_range' } = {}) {
    this.gaitBasis = gb; gaitBasis(gb); this.seed = seed >>> 0; this.lib = new ClipLibrary(skeleton); this.bus = new AnimBus(); this.units = new Map(); this.unitList = []; this.placement = null; this.nearSet = new Map();
    this.unitMarchPeriodS = 1.0; this.misfireRate = 0; this.planter = new FootPlanter(this.lib.rig); this.fa = this.lib.rig.newFrame(); this.fb = this.lib.rig.newFrame();
    this.q = { t: new Float64Array(1024), type: new Uint8Array(1024), unit: new Int32Array(1024), fig: new Int32Array(1024), aux: new Float64Array(1024), aux2: new Int32Array(1024), n: 0, order: new Uint32Array(1024) };
    this.cmp = (a, b) => (this.q.t[a] - this.q.t[b]) || (this.q.unit[a] - this.q.unit[b]) || (this.q.fig[a] - this.q.fig[b]) || (a - b);
    this.muzzle = {}; this._buildMuzzle(); this.out = new ClipSel(); this.stats = { eventsLastAdvance: 0, advances: 0 };
  }
  // muzzle position and bore direction in the character frame at the instant of the shot, per posture (read once from the fire cycle clip: prop_long origin + R * (0, 1.42, 0))
  _buildMuzzle() {
    const lib = this.lib, rig = lib.rig, pose = rig.newPose(), fk = rig.newFK(), fr = rig.newFrame(), I = rig.index;
    for (const p of ['stand', 'kneel', 'lie']) { const c = lib.get('fire_cycle_' + p), seg = c.meta.fireAt; sampleClip(c, seg + 0.05, fr); rig.expandFrame(fr, pose); rig.fk(pose, fk); const b = I.prop_long, q = fk.wq.subarray(b * 4, b * 4 + 4);
      const x = q[0], y = q[1], z = q[2], w = q[3], vy = 1.42; const dx = 2 * (x * y - z * w), dy = 1 - 2 * (x * x + z * z), dz = 2 * (y * z + x * w); // rotation of (0,1,0)
      this.muzzle[p] = { px: fk.wp[b * 3] + dx * vy, py: fk.wp[b * 3 + 1] + dy * vy, pz: fk.wp[b * 3 + 2] + dz * vy, dx, dy, dz }; }
  }
  setPlacement(fn) { this.placement = fn; return this; }                           // fn(unitId, k, t, out{x, y, z, yaw}) -> boolean (k = -1: the unit's centroid)
  addUnit(o) { const ua = new UnitAnimator(this.lib, { ...o, seed: o.seed ?? this.seed, gaitBasis: o.gaitBasis ?? this.gaitBasis }); ua.uidx = this.unitList.length; ua.uid = strId(o.unitId); this.units.set(o.unitId, ua); this.unitList.push(ua); ua.opts = o; return ua; }
  setSegments(unitId, segs) { this.units.get(unitId).setSegments(segs); return this; }
  setFalls(unitId, fallT, fate) { this.units.get(unitId).setFalls(fallT, fate); return this; }
  setNearSet(unitId, indices) { this.nearSet.set(unitId, indices); return this; }
  // ---- sampling: the frame of figure k at time t (blended). ground/x/z/yaw: optional terrain conformance.
  sampleFigure(unitId, k, t, outFrame, ground = null, x = 0, z = 0, yaw = 0) {
    const ua = this.units.get(unitId), o = this.out, rig = this.lib.rig, od = o.d, lib = this.lib; ua.clipAt(k, t, o);
    sampleClipAt(lib.clipAt(o.a), od, SEL_TA, outFrame);
    if (o.b >= 0 && od[SEL_W] > 0) { sampleClipAt(lib.clipAt(o.b), od, SEL_TB, this.fb); blendFramesAt(rig, outFrame, outFrame, this.fb, od, SEL_W); }
    if (ground) this.planter.conform(outFrame, ground, x, z, yaw);
    return o;
  }
  gunRecoil(tSinceShot, recoilM, out) { return gunRecoil(tSinceShot, recoilM, out); }

  // ---- events
  _push(t, type, unit, fig, aux = 0, aux2 = 0) { const q = this.q; if (q.n >= q.t.length) this._grow(); const i = q.n++; q.t[i] = t; q.type[i] = type; q.unit[i] = unit; q.fig[i] = fig; q.aux[i] = aux; q.aux2[i] = aux2; }
  _grow() { const q = this.q, m = q.t.length * 2; const g = (A, T) => { const B = new T(m); B.set(A); return B; }; q.t = g(q.t, Float64Array); q.type = g(q.type, Uint8Array); q.unit = g(q.unit, Int32Array); q.fig = g(q.fig, Int32Array); q.aux = g(q.aux, Float64Array); q.aux2 = g(q.aux2, Int32Array); q.order = new Uint32Array(m); }
  advance(t0, t1) {
    const q = this.q; q.n = 0;
    for (const ua of this.unitList) { const S = ua.segs; if (!S.length) continue; const nearList = this.nearSet.get(ua.unitId) || null;
      for (let si = 0; si < S.length; si++) { const s = S[si], sEnd = si + 1 < S.length ? S[si + 1].t0 : Infinity; if (sEnd <= t0 || s.t0 >= t1 + 30) continue;
        if (s.t0 >= t0 && s.t0 < t1) this._push(s.t0, EV.ACT, ua.uidx, -1, si, si > 0 ? si - 1 : -1);
        if ((s.kind === 'fire' || s.kind === 'guns') && s.plan) this._planEvents(ua, s, sEnd, t0, t1, nearList);
        if (s.kind === 'march' || s.kind === 'mounted') this._marchEvents(ua, s, sEnd, t0, t1, nearList);
      }
      if (ua.fallT) for (let k = 0; k < ua.n; k++) { const ft = ua.fallT[k]; if (ft >= t0 && ft < t1) this._push(ft, EV.FALL, ua.uidx, k, ua.vstyle[k]); const ld = ft + 1.05; if (isFinite(ft) && ld >= t0 && ld < t1) this._push(ld, EV.LIE, ua.uidx, k, ua.vstyle[k]); }
    }
    return this._flush();
  }
  _planEvents(ua, s, sEnd, t0, t1, near) {
    const p = s.plan, hi = Math.min(t1, sEnd), lo = Math.max(t0, s.t0);
    // commands: the spoken sequence before the first shot
    if (p.startS - 8 < hi && p.startS + 5 > lo) { const text = CMD_TEXT[p.mode] || CMD_TEXT.at_will, tt = [p.startS - 6, p.startS - 5, p.startS - 0.4, p.startS + 1.6, p.startS + 2.9, p.startS + 6]; for (let i = 0; i < 6; i++) if (text[i] && tt[i] >= t0 && tt[i] < t1) this._push(tt[i], EV.CMD, ua.uidx, -1, i, s.i); }
    if (p.endS !== Infinity && p.endS >= lo && p.endS < hi) this._push(p.endS, EV.CMD, ua.uidx, -1, 7, s.i);
    // shots (every figure present, whatever its LOD), clipped to the segment and to the figure's life
    const fa = ua.fallT;
    p.shotsBetween(lo, hi, (i, ts, k, rb) => { const fig = s.kind === 'guns' ? ua.gunFigure(i) : i; if (fa && fa[fig] <= ts) return; this._push(ts, (this.misfireRate > 0 && (hash4(ua.uid, i, k, 99) / 4294967296) < this.misfireRate) ? EV.MISFIRE : EV.FIRE, ua.uidx, fig, rb, (i << 12) ^ (k & 4095)); });
    // impacts of gun rounds when the plan has a target
    if (p.target && s.kind === 'guns') { const imp = this._impactOf(p); if (imp) p.shotsBetween(lo - imp.burstAtS - 1, hi - imp.burstAtS + 1, (i, ts) => { const ti = ts + imp.burstAtS; if (ti >= t0 && ti < t1) this._push(ti, EV.IMPACT, ua.uidx, ua.gunFigure(i), ts, i); }); }
    if (s.kind === 'guns') p.shotsBetween(lo, hi, (i, ts) => { this._push(ts, EV.GUN, ua.uidx, ua.gunFigure(i), 0, i); this._push(ts + 0.43, EV.GUN, ua.uidx, ua.gunFigure(i), 1, i); this._push(ts + 2.3, EV.GUN, ua.uidx, ua.gunFigure(i), 2, i); });
    // reload and drill steps for the near set only
    if (near && s.kind === 'fire') for (let m = 0; m < near.length; m++) { const i = near[m]; if (i < 0 || i >= p.n) continue; let kc = p.cycleIndexAt(i, lo - 1); if (kc < 0) kc = 0; const last = p.lastCycle(i);
      for (let k = Math.max(0, kc - 1); k <= last && k <= kc + 2; k++) { const b = p.boundary(i, k); if (b > hi) break; const C = p.cycleLength(i, k), D = cycleDurations(C, 0.6, this.tmpD || (this.tmpD = {})); let ta = b;
        for (let c = 0; c < CYCLE_STEPS.length; c++) { const id = CYCLE_STEPS[c]; if (ta >= lo && ta < hi && id !== 'pause' && id !== 'fire') this._push(ta, id === 'aim' || id === 'ready' ? EV.DRILL : EV.RELOAD, ua.uidx, i, c, STEP_INDEX[id] ?? 0); ta += D[id]; } } }
  }
  _impactOf(p) { if (!p._imp) { const tg = p.target; p._imp = gunImpact(p.weaponId || 'napoleon_12pdr_m1857', p.round || 'shot', hyp2(tg.x - p.origin.x, tg.z - p.origin.z), p.fuzeErrorS || 0, {}) || false; } return p._imp || null; }
  _marchEvents(ua, s, sEnd, t0, t1, near) {
    const lo = Math.max(t0, s.t0), hi = Math.min(t1, sEnd), P = this.unitMarchPeriodS;
    if (s.kind === 'march' && hi > lo) { let n = Math.ceil((lo - s.t0) / P); for (let tt = s.t0 + n * P; tt < hi; tt += P) this._push(tt, EV.UMARCH, ua.uidx, -1, s.i, 0);
      if (near) { const g = s.g; for (let m = 0; m < near.length; m++) { const k = near[m]; const w = g.drill ? 1 : ua.vrate[k], f = g.freq * w, ph0 = g.drill ? (ua.vphase[k] - 0.5) * 0.12 : ua.vphase[k];
        // left heel strike at phase integer, right at integer + 0.5: t = t0 + (n - phi0 - ph0) / f
        for (let side = 0; side < 2; side++) { const base = s.phi0 + ph0 + (side ? 0.5 : 0); let nn = Math.ceil(base + (lo - s.t0) * f); for (; ; nn++) { const tt = s.t0 + (nn - base) / f; if (tt >= hi) break; if (tt >= lo) this._push(tt, EV.FOOT, ua.uidx, k, side, 0); } } } } }
    if (s.kind === 'mounted' && near) { const gait = GAIT_NAMES[s.gi], T = { walk: 1.10, trot: 0.66, canter: 0.56, gallop: 0.46 }[gait], beats = { walk: 4, trot: 2, canter: 3, gallop: 4 }[gait];
      for (let m = 0; m < near.length; m++) { const k = near[m], per = T / (s.mr * (0.97 + 0.06 * ua.vphase[k])); for (let nn = Math.ceil((lo - s.t0) / (per / beats)); ; nn++) { const tt = s.t0 + nn * per / beats; if (tt >= hi) break; this._push(tt, EV.HOOF, ua.uidx, k, beats, 0); } } }
  }
  _flush() {
    const q = this.q, n = q.n, bus = this.bus; for (let i = 0; i < n; i++) q.order[i] = i; const view = q.order.subarray(0, n); view.sort(this.cmp);
    const pl = { x: 0, y: 0, z: 0, yaw: 0 }, P = this.pl || (this.pl = pl);
    for (let r = 0; r < n; r++) { const i = view[r], ua = this.unitList[q.unit[i]], t = q.t[i], fig = q.fig[i], id = ua.unitId; const has = this.placement ? this.placement(id, fig, t, P) : false;
      switch (q.type[i]) {
        case EV.FIRE: case EV.MISFIRE: { const s = ua.segs[ua.segIndexAt(t)] || {}, p = s.plan, M = this.muzzle[s.posture === 'kneel' ? 'kneel' : s.posture === 'lie' ? 'lie' : 'stand'], sy = Math.sin(P.yaw), cy = Math.cos(P.yaw), info = bus.fireInfo, cannon = s.kind === 'guns';
          const lx = cannon ? 0 : M.px, ly = cannon ? 1.12 : M.py, lz = cannon ? 1.55 : M.pz, dx = cannon ? 0 : M.dx, dy = cannon ? 0.05 : M.dy, dz = cannon ? 1 : M.dz;
          bus.pos[0] = P.x + lx * cy + lz * sy; bus.pos[1] = P.y + ly; bus.pos[2] = P.z - lx * sy + lz * cy; bus.dir[0] = dx * cy + dz * sy; bus.dir[1] = dy; bus.dir[2] = -dx * sy + dz * cy;
          info.weaponId = p?.weaponId ?? null; info.gunIdx = cannon ? q.aux2[i] >> 12 : -1; info.round = p?.round || (cannon ? 'shot' : 'ball'); info.mode = p?.mode || 'at_will'; info.cycleIndex = q.aux2[i] & 4095; info.cycleS = p ? p.cycleBase[cannon ? 0 : Math.min(fig, p.n - 1)] : 0;
          info.tier = p?.tier || 'inferred'; info.ranksBack = q.aux[i]; info.kneeling = s.posture === 'kneel' ? 1 : 0; info.lying = s.posture === 'lie' ? 1 : 0; info.recoilM = cannon ? 1.2 : 0; { const imp = p && p.target && cannon ? this._impactOf(p) : null; info.fuze = p?.fuze || (imp ? imp.fuze : (info.round === 'shell' || info.round === 'case') ? 'time' : cannon ? 'none' : null); info.fuzeS = p?.fuzeS ?? (imp ? imp.fuzeS : 0); info.shotId = q.aux2[i]; }
          bus.emit(q.type[i] === EV.FIRE ? 'fire' : 'misfire', id, fig, t, p?.weaponKind || (cannon ? 'cannon' : 'long_arm'), bus.pos, bus.dir, info); break; }
        case EV.RELOAD: case EV.DRILL: { const info = bus.reloadInfo; info.drill = 'load_at_will'; info.number = -1; const stepId = CYCLE_STEPS[q.aux[i]], D = cycleDurations(25, 0.6, this.tmpD || (this.tmpD = {}));
          bus.pos[0] = P.x; bus.pos[1] = P.y + 1.3; bus.pos[2] = P.z;
          if (q.type[i] === EV.RELOAD) bus.emit('reload', id, fig, t, STEP_NAME[stepId], q.aux2[i], D[stepId] ?? 0, bus.pos, info); else bus.emit('drill_step', id, fig, t, stepId === 'aim' ? 'INF-FIRE-02' : 'INF-FIRE-01', stepId, 0, bus.pos); break; }
        case EV.FOOT: { bus.pos[0] = P.x; bus.pos[1] = P.y; bus.pos[2] = P.z; const s = ua.segs[ua.segIndexAt(t)]; bus.emit('footfall', id, fig, t, q.aux[i], bus.pos, s ? s.speed : 0, bus.footInfo); break; }
        case EV.HOOF: { const s = ua.segs[ua.segIndexAt(t)]; bus.pos[0] = P.x; bus.pos[1] = P.y; bus.pos[2] = P.z; bus.emit('hoofbeat', id, fig, t, s ? GAIT_NAMES[s.gi] : 'gallop', bus.pos, s ? s.speed : 0); break; }
        case EV.UMARCH: { const s = ua.segs[q.aux[i]]; bus.cen[0] = P.x; bus.cen[1] = P.y; bus.cen[2] = P.z; const g = s.g; const spm = g ? stepsPerMin(MARCH[g.A.name]) * g.rateA : 0; let alive = ua.n; if (ua.fallT) { alive = 0; for (let k = 0; k < ua.n; k++) if (ua.fallT[k] > t) alive++; }
          bus.marchInfo.surface = s.surface || 'unknown'; bus.marchInfo.lengthM = s.lengthM || 0; bus.emit('unit_march', id, t, alive, spm, s.speed, bus.cen, P.yaw, g ? g.A.name : s.activity, bus.marchInfo); break; }
        case EV.CMD: { const s = ua.segs[q.aux2[i]], p = s && s.plan, text = q.aux[i] === 7 ? 'Cease firing' : (CMD_TEXT[p ? p.mode : 'at_will'] || CMD_TEXT.at_will)[q.aux[i]]; const kind = q.aux[i] === 0 ? 'caution' : q.aux[i] === 1 ? 'preparatory' : q.aux[i] === 7 ? 'execution' : 'execution'; bus.pos[0] = P.x; bus.pos[1] = P.y + 1.6; bus.pos[2] = P.z;
          bus.cmdInfo.reactionS = 0.2 + 0.6 * (hash4(ua.uid, q.aux[i], 5, 5) / 4294967296); bus.emit('command', id, -1, t, kind, text, bus.pos, bus.cmdInfo); break; }
        case EV.FALL: { bus.pos[0] = P.x; bus.pos[1] = P.y; bus.pos[2] = P.z; bus.fallInfo.fate = ua.fate && ua.fate[fig] === 1 ? 'wounded' : 'killed'; bus.emit('fall', id, fig, t, ['back', 'front', 'side_left', 'side_right', 'knee_first', 'spin', 'clutch_wound', 'drop_rifle'][q.aux[i]], bus.pos, bus.fallInfo); break; }
        case EV.LIE: { bus.pos[0] = P.x; bus.pos[1] = P.y; bus.pos[2] = P.z; bus.emit('lie', id, fig, t, ['back', 'front', 'side_left', 'side_right', 'knee_first', 'spin', 'clutch_wound', 'drop_rifle'][q.aux[i]], bus.pos, bus.fallInfo); break; }
        case EV.GUN: { const info = bus.gunInfo; info.recoilM = 1.2; info.recoilS = 2.3; bus.emit('gun', id, q.aux2[i], t, ['recoil_start', 'recoil_end', 'run_up_end'][q.aux[i]], info); break; }
        case EV.ACT: { const S = ua.segs; bus.actInfo.clipset = S[q.aux[i]].kind; bus.emit('activity', id, t, q.aux2[i] >= 0 ? S[q.aux2[i]].activity : '', S[q.aux[i]].activity, bus.actInfo); break; }
        case EV.IMPACT: { const s = ua.segs[ua.segIndexAt(q.aux[i])], p = s && s.plan, imp = p && p._imp, info = bus.impactInfo; if (!imp) break; const tg = p.target; bus.pos[0] = tg.x; bus.pos[1] = tg.y ?? 0; bus.pos[2] = tg.z; bus.dir[0] = tg.x - p.origin.x; bus.dir[1] = 0; bus.dir[2] = tg.z - p.origin.z; const dl = hyp2(bus.dir[0], bus.dir[2]) || 1; bus.dir[0] /= dl; bus.dir[2] /= dl;
          info.fireT = q.aux[i]; info.weaponId = p.weaponId || null; info.surface = 'earth'; info.shotId = q.aux2[i]; bus.emit('impact', id, fig, t, imp.kind, bus.pos, bus.dir, info); break; }
      } }
    this.stats.eventsLastAdvance = n; this.stats.advances++; return n;
  }
}
// gun figure index of gun g (No. 4 with the lanyard is crew slot 4 of the roles list)
UnitAnimator.prototype.gunFigure = function (g) { return g * this.cpg + Math.min(4, this.cpg - 1); };
export const ANIM3D_VERSION = '1.0.0';
void GUN_CYCLE_NOMINAL_S;
