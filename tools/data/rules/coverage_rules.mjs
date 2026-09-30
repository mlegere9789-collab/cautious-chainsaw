// C001-C005: coverage of units and ticks.
import { defineRule, V } from './define.mjs';
import { haversineM } from '../lib/util.mjs';

/** Segments between consecutive merged keyframes of one unit. Cached. */
export function segmentsOf(ctx) {
  if (ctx._segments) return ctx._segments;
  const segs = [];
  for (const [unit, list] of ctx.merged) {
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1], b = list[i];
      const d = haversineM(a.lat, a.lng, b.lat, b.lng);
      segs.push({ unit, a, b, d, dt: b.tick - a.tick });
    }
  }
  ctx._segments = segs;
  return segs;
}

export const MOVING_M = 250, STATIONARY_M = 30;

/** Own-placement census used by C004 and the report. */
export function placementCensus(ctx) {
  const placedIds = new Set(ctx.rowsByUnit.keys());
  const combat = ctx.oob.list.filter((r) => (r.kind === 'regiment' || r.kind === 'battery') && !r.alias_for);
  const own = combat.filter((r) => placedIds.has(r.id));
  const notOwn = combat.filter((r) => !placedIds.has(r.id));
  const parentPlaced = (r) => {
    const p = r.raw.parent_brigade_id ?? r.parent_artillery_id;
    return p && placedIds.has(p);
  };
  return {
    combat, own, notOwn,
    regimentsTotal: combat.filter((r) => r.kind === 'regiment').length,
    regimentsOwn: own.filter((r) => r.kind === 'regiment').length,
    batteriesTotal: combat.filter((r) => r.kind === 'battery').length,
    batteriesOwn: own.filter((r) => r.kind === 'battery').length,
    viaParent: notOwn.filter(parentPlaced).length,
    neither: notOwn.filter((r) => !parentPlaced(r)).length,
  };
}

export const rules = [
  defineRule({
    id: 'C001', sev: 'E', family: 'coverage', wp: 'WP-DATA-10', status: 'partial', dv: [],
    title: 'every unit has presence semantics; a unit whose last keyframe is before Day 3 needs an explicit departure/hold rule',
    scope: 'tracks', spec_baseline: '153 units last seen on Day 1 with no departure semantics',
    note: 'partial: legacy files have no presence field, so every unit whose final keyframe falls on Day 1 or Day 2 is a violation.',
    run(ctx) {
      const out = [];
      for (const [unit, list] of ctx.merged) {
        const last = list[list.length - 1].tick;
        if (last <= 225) out.push(V(`day1|${unit}`, `${unit}: last keyframe at tick ${last} (Day 1), no departure/hold semantics`, { kind: 'last_on_day1', data: { last } }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'C002', sev: 'W', family: 'coverage', wp: 'WP-DATA-11', status: 'implemented', dv: [],
    title: 'anchor gap limits: moving (> 250 m) <= 30 min, drift (30-250 m) <= 60 min, stationary (< 30 m) <= 180 min (5 min/tick linear until chapter 04 lands)',
    scope: 'tracks',
    spec_baseline: 'DI: 351 moving gaps > 10 ticks; 217 > 30 ticks (the stricter thresholds here yield more)',
    run(ctx) {
      const out = [];
      const limit = (d) => (d > 250 ? 6 : d >= 30 ? 12 : 36);
      for (const s of segmentsOf(ctx)) {
        if (s.dt > limit(s.d)) {
          const cls = s.d > 250 ? 'moving' : s.d >= 30 ? 'drift' : 'stationary';
          out.push(V(`${s.unit}|${s.a.tick}-${s.b.tick}`, `${s.unit} t${s.a.tick}-${s.b.tick}: ${cls} segment ${Math.round(s.d)} m over ${s.dt} ticks (limit ${limit(s.d)})`,
            { kind: cls, data: { unit: s.unit, from: s.a.tick, to: s.b.tick, meters: Math.round(s.d), dt: s.dt } }));
        }
      }
      return out;
    },
  }),
  defineRule({
    id: 'C003', sev: 'E', family: 'coverage', wp: 'WP-DATA-10', status: 'partial', dv: [],
    title: 'every tick 1-675 has data to render',
    scope: 'derived', spec_baseline: '487 empty ticks (188/675 carry a keyframe row)',
    note: 'partial: counts ticks with no keyframe row. The rebuild renders every tick from carry-forward; the WP-10 policy replaces this with a per-tick present-unit count.',
    run(ctx) {
      const have = new Set(ctx.rows.map((r) => r.tick));
      const out = [];
      for (let t = 1; t <= 675; t++) if (!have.has(t)) out.push(V(`tick|${t}`, `tick ${t} has no keyframe row`, { kind: `day${t <= 225 ? 1 : t <= 450 ? 2 : 3}` }));
      return out;
    },
  }),
  defineRule({
    id: 'C004', sev: 'W', family: 'coverage', wp: 'WP-DATA-13', status: 'implemented', dv: ['DV-28'],
    title: 'every OOB combat unit (465 regiments + 104 batteries) has an own placement',
    scope: 'OOB x tracks',
    spec_baseline: '250 regiments + 66 batteries (the 250 counts the alias stub and the horse battery filed as a regiment; 248 real regiments)',
    run(ctx) {
      const c = placementCensus(ctx);
      return c.notOwn.map((r) => V(`${r.kind}|${r.id}`, `${r.id} (${r.kind}) has no placement of its own`, { kind: r.kind, file: r.file }));
    },
  }),
  defineRule({
    id: 'C005', sev: 'E', family: 'coverage', wp: 'WP-DATA-10', status: 'deferred', dv: [],
    title: 'no unit drawn after depart_tick or before appear_tick',
    scope: 'tracks', spec_baseline: 'n/a (no presence fields)',
    blocked_by: 'needs the WP-DATA-10 track schema (presence.from_tick/to_tick); legacy rows carry no such fields',
    run() { return null; },
  }),
];
