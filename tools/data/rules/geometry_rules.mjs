// G001-G008: geometry and motion. Speeds use the linear 5 min/tick clock (the files' own tick_formula) unless stated.
import { defineRule, V, rowKey, rowLabel } from './define.mjs';
import { haversineM, MPH_PER_MS } from '../lib/util.mjs';
import { segmentsOf, MOVING_M } from './coverage_rules.mjs';

export function decimals(x) {
  const s = String(x);
  if (/e/i.test(s)) return 0;
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

export function armOf(ctx, id) {
  const rec = ctx.oob.records.get(id);
  if (rec) {
    if (rec.kind === 'battery' || rec.kind === 'battalion' || rec.kind === 'artillery_brigade') return 'artillery';
    if (/-CAV\b|^[UC]-CAV/.test(id) || /^[UC]-CAV/.test(rec.raw.parent_brigade_id || '') || /^[UC]-CAV/.test(rec.raw.parent_corps_id || '')) return 'cavalry';
    return 'infantry';
  }
  if (/CAV/.test(id)) return 'cavalry';
  if (/ART|HAB/.test(id)) return 'artillery';
  return 'infantry';
}

/** DI-01 lenient caps (mph). Documented in docs/data/CONTRIBUTING-DATA.md. */
export function capMph(arm, dispA, dispB, dtTicks) {
  const both = [dispA, dispB];
  if (arm === 'artillery') return 4; // limbered
  if (arm === 'cavalry') return both.includes('Mounted Cavalry') || both.includes('Charging Line') ? 12 : 5;
  let cap = 3; // march
  if (both.includes('Chaotic Retreat')) cap = Math.max(cap, 6);
  if (both.includes('Charging Line')) cap = Math.max(cap, dtTicks <= 2 ? 8 : 4.5);
  if (both.includes('Line of March') && dtTicks <= 4) cap = Math.max(cap, 4.5);
  return cap;
}

export function speedsOf(ctx, clockFn) {
  const out = [];
  for (const s of segmentsOf(ctx)) {
    if (s.d < 50) continue; // ignore jitter
    const minutes = clockFn(s.b.tick) - clockFn(s.a.tick);
    if (minutes <= 0) continue;
    const mph = (s.d / (minutes * 60)) * MPH_PER_MS;
    const arm = armOf(ctx, s.unit);
    const cap = capMph(arm, s.a.disposition, s.b.disposition, s.dt);
    out.push({ ...s, arm, minutes, mph, cap, over: mph > cap });
  }
  return out;
}

export const bearingTo = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

export const rules = [
  defineRule({
    id: 'G001', sev: 'E', family: 'geometry', wp: 'WP-DATA-14', status: 'deferred', dv: [],
    title: 'positions are on land (not in water)', scope: 'tracks', spec_baseline: 'not measured',
    blocked_by: 'needs a land/water mask (WP-DATA-14: 3DEP/NHD); none exists in the repository',
    run() { return null; },
  }),
  defineRule({
    id: 'G002', sev: 'E', family: 'geometry', wp: 'WP-DATA-14', status: 'partial', dv: [],
    title: 'coordinate precision: >= 4 decimals in lat and lng (v2: >= 5 decimals or unc_m >= 50)', scope: 'tracks',
    spec_baseline: '379 rows (181 lat, 210 lng) under 4 decimals',
    note: 'partial: the legacy schema text says "4 decimal places minimum"; the v2 test needs unc_m, which legacy rows lack.',
    run(ctx) {
      const out = [];
      for (const r of ctx.rows) {
        const dl = decimals(r.lat), dg = decimals(r.lng);
        if (dl < 4 || dg < 4) out.push(V(`${rowKey(r)}|${rowLabel(r)}`, `${rowLabel(r)}: lat ${r.lat} (${dl} dp), lng ${r.lng} (${dg} dp)`, { file: r.file, kind: dl < 4 && dg < 4 ? 'both' : dl < 4 ? 'lat' : 'lng' }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'G003', sev: 'W', family: 'geometry', wp: 'WP-DATA-11', status: 'partial', dv: ['DV-07'],
    title: 'implied speed between consecutive keyframes <= cap by arm and disposition (DI-01 lenient caps)', scope: 'tracks',
    spec_baseline: '20 on the warped clock, 6 on the 5-minute clock (DI); the caps are implemented here from the DI-01 list, so counts can differ',
    note: 'partial: linear 5 min/tick clock as W (chapter 13 WP-03 point 4); the warped-clock count is reported as an informational metric only.',
    run(ctx) {
      const out = [];
      for (const s of speedsOf(ctx, (t) => t * 5)) {
        if (s.over) out.push(V(`${s.unit}|${s.a.tick}-${s.b.tick}`, `${s.unit} t${s.a.tick}-${s.b.tick}: ${Math.round(s.d)} m in ${s.minutes} min = ${s.mph.toFixed(1)} mph (cap ${s.cap}, ${s.arm})`,
          { kind: s.arm, data: { unit: s.unit, from: s.a.tick, to: s.b.tick, meters: Math.round(s.d), mph: Number(s.mph.toFixed(1)), cap: s.cap } }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'G004', sev: 'W', family: 'geometry', wp: 'WP-DATA-14', status: 'implemented', dv: [],
    title: 'distinct units at the same tick are not stacked on identical coordinates (v2 target: >= 15 m apart)', scope: 'tracks',
    spec_baseline: '48 groups / 96 units on raw rows (39 / 78 after last-writer-wins)',
    run(ctx) {
      const groups = new Map();
      for (const [key, list] of ctx.perKey) {
        const r = list[list.length - 1];
        const k = `${r.tick}|${r.lat},${r.lng}`;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(r.unit_id);
      }
      // raw-row variant (what the specialist counted) is also exposed via ctx for the report
      const out = [];
      for (const [k, units] of groups) if (units.length > 1) out.push(V(k, `tick ${k.split('|')[0]}: ${units.join(', ')} share ${k.split('|')[1]}`, { rows: units.length, kind: 'identical', data: { units } }));
      return out;
    },
  }),
  defineRule({
    id: 'G005', sev: 'W', family: 'geometry', wp: 'WP-DATA-13', status: 'implemented', dv: [],
    title: 'a regiment is within 600 m of its parent brigade at the same tick (skirmish lines exempt)', scope: 'tracks',
    spec_baseline: '17 same-tick pairs > 1 km (mostly marching, tick 1)',
    run(ctx) {
      const out = [];
      for (const [unit, list] of ctx.merged) {
        const rec = ctx.oob.records.get(unit);
        if (!rec || rec.kind !== 'regiment') continue;
        const parent = ctx.merged.get(rec.raw.parent_brigade_id);
        if (!parent) continue;
        const pByTick = new Map(parent.map((r) => [r.tick, r]));
        for (const r of list) {
          const p = pByTick.get(r.tick);
          if (!p || r.disposition === 'Skirmish Line') continue;
          const d = haversineM(r.lat, r.lng, p.lat, p.lng);
          if (d > 600) out.push(V(`${unit}@${r.tick}`, `${unit}@${r.tick} is ${Math.round(d)} m from ${rec.raw.parent_brigade_id}`, { kind: d > 1000 ? 'over_1km' : 'over_600m', data: { meters: Math.round(d) } }));
        }
      }
      return out;
    },
  }),
  defineRule({
    id: 'G006', sev: 'W', family: 'geometry', wp: 'WP-DATA-10', status: 'implemented', dv: [],
    title: 'bearing within 45 degrees of the movement vector for a Line of March that moves >= 100 m', scope: 'tracks',
    spec_baseline: 'not measured',
    run(ctx) {
      const out = [];
      for (const s of segmentsOf(ctx)) {
        if (s.a.disposition !== 'Line of March' || s.d < 100) continue;
        const az = bearingTo(s.a, s.b);
        let diff = Math.abs(az - s.a.bearing) % 360;
        if (diff > 180) diff = 360 - diff;
        if (diff > 45) out.push(V(`${s.unit}|${s.a.tick}-${s.b.tick}`, `${s.unit} t${s.a.tick}: bearing ${s.a.bearing} but moves toward ${Math.round(az)} (${Math.round(diff)} deg off)`, { kind: 'bearing', data: { diff: Math.round(diff) } }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'G007', sev: 'W', family: 'v2', tier: 'v2', wp: 'WP-DATA-14', status: 'implemented', dv: [],
    title: 'a row note that names a gazetteer place is not > 500 m from that place',
    scope: 'placement notes x terrain key_locations', spec_baseline: 'catches East Cavalry Field and Little Round Top offsets (not counted by the specialist)',
    run(ctx) {
      const locs = ctx.terrain?.key_locations;
      if (!locs) return null;
      const places = locs.map((l) => ({ id: l.location_id, name: l.name.replace(/\s*\(.*?\)\s*/g, '').trim(), lat: l.lat, lng: l.lng })).filter((p) => p.name.length >= 8);
      const out = [];
      for (const r of ctx.rows) {
        if (!r.notes) continue;
        const named = places.filter((p) => r.notes.includes(p.name));
        if (!named.length) continue;
        const nearest = Math.min(...named.map((p) => haversineM(r.lat, r.lng, p.lat, p.lng)));
        if (nearest > 500) out.push(V(`${rowKey(r)}|${rowLabel(r)}`, `${rowLabel(r)} names ${named.map((p) => p.name).join(' / ')} but is ${Math.round(nearest)} m away`, { file: r.file, kind: 'note_vs_position', data: { meters: Math.round(nearest) } }));
      }
      return out;
    },
  }),
  defineRule({
    id: 'G008', sev: 'W', family: 'v2', tier: 'v2', wp: 'WP-DATA-10', status: 'partial', dv: ['DV-27'],
    title: 'disposition state machine: no direct Bivouac -> Charging Line / Chaotic Retreat without an intermediate posture', scope: 'tracks',
    spec_baseline: 'designed, not run (qa-ci DV-27)',
    note: 'partial: only the transition named in qa-ci DV-27 is encoded; consecutive keyframes may be many ticks apart, so this is a warning.',
    run(ctx) {
      const out = [];
      const illegal = new Set(['Bivouac>Charging Line']);
      for (const s of segmentsOf(ctx)) {
        if (illegal.has(`${s.a.disposition}>${s.b.disposition}`)) out.push(V(`${s.unit}|${s.a.tick}-${s.b.tick}`, `${s.unit} t${s.a.tick}-${s.b.tick}: ${s.a.disposition} -> ${s.b.disposition}`, { kind: 'transition' }));
      }
      return out;
    },
  }),
];
export { MOVING_M };
