// suggest: for a timeline row, what the product shows for the units and places the row's own words name, inside the time the row allows. It is a search aid for the author of a record, never a
// record: it proposes nothing the checks have not seen, and the record must still quote the row and name the entities. For every unit the row names (with its leaves) and every place it names:
// the minutes at which every drawn leaf is on the field, the minutes at which every one / some of them are within the tolerance of the place, and the activities shown there.
import { isoOf, round } from './lib.mjs';
import { measure } from './gazetteer.mjs';

const MOVING = new Set(['march', 'double_quick', 'gallop']);
// consecutive whole minutes -> [[from, to], ...]
export function runs(mins) { const out = []; for (const t of mins) { const l = out[out.length - 1]; if (l && t - l[1] <= 1.5) l[1] = t; else out.push([t, t]); } return out; }
const fmt = rs => rs.slice(0, 4).map(([a, b]) => (a === b ? isoOf(a) : `${isoOf(a)}..${isoOf(b).slice(11)}`)).join('; ') + (rs.length > 4 ? ` (+${rs.length - 4} more)` : '') || '(never)';

export function suggest(P, scene, row, { step = 1, cap = 2500 } = {}) {
  const text = row.claim_text, named = P.unitsNamedIn(text).slice(0, 14), seen = new Set(), places = [];
  for (const h of P.places.findIn(text)) if (!seen.has(h.place.id)) { seen.add(h.place.id); places.push(h.place); }
  const mins = []; for (const [a, b] of row.window.intervals) for (let t = Math.ceil(a); t <= Math.floor(b) && mins.length < cap; t += step) mins.push(t);
  const out = { row: row.id, window_minutes: mins.length, truncated: mins.length >= cap, units: [] };
  for (const n of named) {
    const leaves = P.leaves(n.id).filter(l => P.unit(l).drawn), all = P.leaves(n.id), u = { id: n.id, name: n.name, why: n.why, leaves: all.length, drawn: leaves.length, undrawn: all.filter(l => !P.unit(l).drawn).length };
    if (!leaves.length || !mins.length) { out.units.push({ ...u, present: '(no drawn leaf)', places: [] }); continue; }
    const pres = [], full = [], states = new Map(); for (const t of mins) { const ss = leaves.map(l => scene.unitAt(l, t)); states.set(t, ss); const k = ss.filter(s => s.present).length; if (k) pres.push(t); if (k === leaves.length) full.push(t); }
    u.present = `some leaf: ${fmt(runs(pres))}; every drawn leaf: ${fmt(runs(full))}`;
    u.places = [];
    for (const p of places) {
      const all_in = [], any_in = [], acts = new Set();
      for (const t of mins) { const ss = states.get(t), pr = ss.filter(s => s.present); if (!pr.length) continue; const inn = pr.filter(s => measure(p, s) <= p.tolerance_m); if (inn.length) any_in.push(t); if (inn.length === leaves.length) { all_in.push(t); for (const s of inn) acts.add(s.activity); } }
      u.places.push({ place: `${p.id} ${p.name}`, tolerance_m: p.tolerance_m, on_ground: p.on_ground, every_drawn_leaf_within: fmt(runs(all_in)), some_leaf_within: fmt(runs(any_in)), activities_there: [...acts] });
    }
    // motion: minutes in which some leaf is marching
    const mv = mins.filter(t => states.get(t).some(s => s.present && MOVING.has(s.activity))); u.marching = fmt(runs(mv));
    out.units.push(u);
  }
  out.places = places.map(p => ({ id: p.id, name: p.name, kind: p.kind, tolerance_m: p.tolerance_m, on_ground: p.on_ground }));
  return out;
}
export function printSuggestion(s, line) {
  line(`${s.row}: ${s.window_minutes} minute(s) of the allowed window${s.truncated ? ' (cut at the cap)' : ''}`);
  for (const u of s.units) {
    line(`  UNIT ${u.id} (${u.name}; ${u.why}) leaves ${u.leaves}, drawn ${u.drawn}${u.undrawn ? ', NOT DRAWN ' + u.undrawn : ''}`);
    line(`       on the field: ${u.present}`); if (u.marching) line(`       marching: ${u.marching}`);
    for (const p of u.places) line(`       at ${p.place} [tol ${p.tolerance_m} m${p.on_ground ? '' : ', OFF GROUND'}]: all drawn leaves within ${p.every_drawn_leaf_within}; some within ${p.some_leaf_within}${p.activities_there.length ? '; shown doing ' + p.activities_there.join(', ') : ''}`);
  }
  if (!s.units.length) line('  (no unit of the layer is named by the row)');
}
