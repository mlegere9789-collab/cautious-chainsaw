// CROWD ANIMATION DRIVER: the anim3d state machine (UnitAnimator.clipAt: unit activity + drill clocks + per-figure phase / rate / fall style from the manifest's variation scalar), one animator per world unit,
// built lazily the first time a unit is drawn and rebuilt when the scenario changes (the stage's admitted events are the source of every activity timeline and every fall).
// Everything evaluated here is a PURE function of (unit timeline, fire plan, falls, figure variation, k, t): a seek shows the pose that playing there would show (gate G16 / Q12). t is SIMULATION SECONDS since 1863-06-01 00:00.
// Choices that are ours, not the record's (every one plausible-procedural, listed in docs/CROWD-NOTES.md):
//   * a unit that fires uses mode 'at_will' with a per-man cycle of 20 to 30 s (ANIM3D-NOTES 2.3: battle rate of a rifle-musket 2-3 rounds a minute; the real tempo of any unit at any minute is not documented, G-ANIM-01);
//   * a battery's own gun detachments ('serve_guns') fire by piece, one round in 30 to 60 s (ANIM3D-NOTES 2.3: Gibbon, Light Artillery Board);
//   * a mounted unit that does not move stands at 'halt_mounted'; a unit that is not on the move and has no named activity stands at shoulder arms.
import { LED, dismountRecord, dismountShare, dismountWindows } from '../history/cavalry.mjs';
import { AnimSystem, FirePlan, ClipSel } from '../anim3d/index.mjs';

const FIRE_CYCLE = { min: 20, max: 30, basis: 'ANIM3D-NOTES 2.3: battle rate of a rifle-musket (kit/weapons.json rate_rounds_per_min; PDF 2-3 a minute), weak sources; the tempo of a real unit at a real minute is an open gap (G-ANIM-01)' };
const GUN_CYCLE = { min: 30, max: 60, basis: 'ANIM3D-NOTES 2.3: Gibbon 30-40 s (6-pdr), 60 s (12-pdr); Light Artillery Board 2 solid shot a minute (ART-GB-20, ART-GB-21)' };
export const CREW_PER_GUN = 9;

export class CrowdAnim {
  constructor({ skeleton, world, layer, stage, seed = 1863 }) {
    this.world = world; this.layer = layer; this.stage = stage; this.seed = seed; this.nL = layer.units.length;
    this.anim = new AnimSystem({ skeleton, seed }); this.byId = new Map(); world.units.forEach((_, ui) => this.byId.set(this.unitId(ui), ui)); this.lib = this.anim.lib; this.ua = new Array(world.units.length).fill(null); this.version = -1; this.sel = new ClipSel(); this.built = 0;
  }
  unitId(ui) { const u = this.world.units[ui]; return ui < this.nL ? this.layer.units[ui].id : `${this.layer.units[u.parent].id}#gun${u.gun}`; }
  // forget every animator (a scenario change moves arrivals, activities and losses)
  reset() { for (const ua of this.ua) if (ua) this.anim.units.delete(ua.unitId); this.anim.unitList.length = 0; this.ua.fill(null); this.built = 0; this.version = this.stage.segsVersion; }
  _segsOf(ui) {
    const w = this.world.units[ui], st = this.stage, crew = ui >= this.nL, li = crew ? w.parent : ui, base = st.unitSegments(li), lu = this.layer.units[li], hasGuns = !!(this.world.units[li].guns);
    const cav = lu.arm === 'cavalry', segs = [];
    for (let s = 0; s < base.length; s++) {
      const b = base[s]; let a = b.activity;
      if (!crew && hasGuns && (a === 'serve_guns' || a === 'fire')) a = 'stand';          // the battery's own men are not the detachments: the crews (world units after the layer's) serve the pieces
      else if (crew && a === 'fire') a = 'serve_guns';
      if (cav && (a === 'stand' || a === 'halt' || a === 'rest')) a = 'halt_mounted';
      const o = { t0: b.t0, activity: a, speed: b.speed, night: b.night };
      if (a === 'fire') o.mode = 'at_will'; segs.push(o);
    }
    if (cav && !crew) { const dm = this._dismounts(lu, segs); if (dm) { segs.length = 0; segs.push(...dm); } }
    for (let s = 0; s < segs.length; s++) {
      const g = segs[s], end = s + 1 < segs.length ? segs[s + 1].t0 : Infinity;
      if (g.activity === 'fire') g.plan = FirePlan.create({ unitId: this.unitId(ui), n: w.count, seed: this.seed, mode: 'at_will', startS: g.t0 + (g.dm ? LED.led_s : 0), endS: end, cycleS: FIRE_CYCLE, files: Math.max(1, Math.ceil(w.count / 2)), ranks: 2, weapon: 'long_arm', tier: 'plausible-procedural' });
      else if (g.activity === 'serve_guns') g.plan = FirePlan.create({ unitId: this.unitId(ui), n: crew ? 1 : Math.max(1, Math.floor(w.count / CREW_PER_GUN)), seed: this.seed, mode: 'by_piece', startS: g.t0, endS: end, cycleS: GUN_CYCLE, weapon: 'cannon', fireAtFrac: 0.72, tier: 'inferred' });
    }
    return segs;
  }
  // ws10: where the record prints that part of a cavalry regiment fought afoot (history/cavalry.mjs DISMOUNTS), and the unit's engagement windows lie inside the record's range and the unit stands, the standing segment
  // becomes one dismounted segment (activity fire, dm = the printed share); the horses are led back over LED.led_s. No window = no hour printed = no dismounting (EG-CAV-04). Returns the new segment list or null.
  _dismounts(lu, segs) {
    const rec = dismountRecord(lu.id), share = rec && dismountShare(rec); if (!share) return null;
    const wins = dismountWindows(rec, lu.casualties && lu.casualties.windows).map(w => [w.from * 60, w.to * 60]); if (!wins.length) return null;
    const standing = a => a === 'stand' || a === 'halt' || a === 'rest' || a === 'halt_mounted' || a === 'fire' || a === 'skirmish', inWin = t => wins.some(([a, b]) => t >= a && t < b), out = []; let any = false;
    for (let s = 0; s < segs.length; s++) {
      const g = segs[s], end = s + 1 < segs.length ? segs[s + 1].t0 : Infinity;
      if (!standing(g.activity)) { out.push(g); continue; }
      const cuts = [g.t0]; for (const [a, b] of wins) for (const c of [a, b]) if (c > g.t0 && c < end) cuts.push(c); cuts.sort((x, y) => x - y); cuts.push(end);
      for (let q = 0; q + 1 < cuts.length; q++) {
        const p0 = cuts[q], p1 = cuts[q + 1], mid = Number.isFinite(p1) ? (p0 + p1) / 2 : p0 + 1, last = out[out.length - 1];
        if (inWin(mid)) { any = true; if (last && last.dm === share && last.activity === 'fire') continue; out.push({ ...g, t0: p0, activity: 'fire', mode: 'at_will', dm: share }); }
        else if (!(last && last.activity === g.activity && !last.dm && q > 0)) out.push({ ...g, t0: p0, dm: 0 });
      }
    }
    return any ? out : null;
  }
  get(ui) {
    if (this.version !== this.stage.segsVersion) this.reset();
    let ua = this.ua[ui]; if (ua) return ua; const w = this.world.units[ui], lu = this.layer.units[ui < this.nL ? ui : w.parent], s1 = this.world.sold1, first = w.first;
    ua = this.anim.addUnit({ unitId: this.unitId(ui), n: w.count, arm: lu.arm === 'cavalry' ? 'cavalry' : 'infantry', crewPerGun: CREW_PER_GUN, gaitBasis: lu.arm === 'cavalry' ? 'wheeler_1863' : lu.arm === 'artillery' ? 'fa_1863' : undefined, variation: k => s1[(first + k) * 4 + 3] });      // DD-10: Wheeler 1863 for cavalry, the 1863 field artillery manual for horse artillery; modern_range stays selectable
    ua.setSegments(this._segsOf(ui));
    if (ui < this.nL) { const fi = this.stage.fallInfo(ui); if (fi) { const fallT = new Float64Array(w.count).fill(Infinity), fate = new Uint8Array(w.count); for (let j = 0; j < fi.t.length; j++) if (fi.anim[j] && fi.agent[j] < w.count) { fallT[fi.agent[j]] = fi.t[j]; fate[fi.agent[j]] = fi.fate[j]; } ua.setFalls(fallT, fate); } }
    this.ua[ui] = ua; this.built++; return ua;
  }
  // the clip selection of figure k of world unit ui at t (a ClipSel: a, b, h = clip INDICES, times and weight in .d)
  clipAt(ui, k, t) { return this.get(ui).clipAt(k, t, this.sel); }
  // the full 61-bone skin palette of one figure (LOD0) with the foot-planting pass on the ground; writes 12 floats per bone into out at o
  pose(ui, k, t, x, z, yaw, ground, out, o) {
    const A = this.anim, rig = A.lib.rig, ua = this.get(ui); A.sampleFigure(ua.unitId, k, t, this.frame || (this.frame = rig.newFrame()), ground, x, z, yaw);
    rig.expandFrame(this.frame, this.poseTmp || (this.poseTmp = rig.newPose())); rig.fk(this.poseTmp, this.fkTmp || (this.fkTmp = rig.newFK())); rig.skin(this.fkTmp, out, null, o); return A.out;
  }
}
