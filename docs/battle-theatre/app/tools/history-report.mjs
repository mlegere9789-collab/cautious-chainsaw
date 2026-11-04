// Counts and lists for app/HISTORY-LAYER-NOTES.md, computed from the layer and the data, so the notes never drift from the code.
//   node docs/battle-theatre/app/tools/history-report.mjs            (prints a JSON report; --md prints the markdown tables used in the notes)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { createRealHistory } from '../src/history/real.mjs';
import { Gazetteer, norm, insideBox } from '../src/history/gazetteer.mjs';
import { fmtShort } from '../src/clock.mjs';
import { claimsReport } from './claims-report.mjs';
import { daposReport } from './daypos-report.mjs';
import { ledgerEReport } from './ledgerE-report.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), BT = path.resolve(here, '../..');
const J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8'));
export function loadRawFromDisk() {
  const opt = f => { try { return J(f); } catch { return null; } };
  return { units: J('history/units.json'), arrivals: J('history/arrivals.json'), notOnField: J('history/not_on_field.json'), conflicts: J('GOVERNANCE/conflicts_structured.json'), gazetteer: J('app/data/gazetteer.json'), placementClaims: opt('app/data/placement-claims.json'), siblingApproach: opt('app/data/sibling-approach.json'), dayPositions: opt('app/data/daypositions.json'), claimDispositions: opt('app/data/claim-dispositions.json'), placement: J('app/data/placement.json'),
    structures: opt('structures/structures.json'), works: opt('structures/works_stages.json'), kit: opt('kit/kit_specs.json'),
    engagements: opt('app/data/engagements.json'), casualtySources: opt('app/data/casualty-sources.json'), batteryGuns: opt('app/data/battery-guns.json'),
    kitWeapons: opt('kit/weapons.json'), kitArtillery: opt('kit/artillery_batteries.json'), kitCavalry: opt('kit/cavalry_units.json'), kitCrosswalk: opt('app/data/kit-crosswalk.json'), figuresValidation: opt('app/data/figures-validation.json') };
}
export const terrainMeta = () => ({ meta: J('render/prototype/data/terrain.json') });

// place names PRINTED in the ledger cells, found by pattern (a capitalised phrase ending in a place word, or a capitalised word after a place preposition). This is a candidate list:
// the pattern can miss a name; it never invents one. Each candidate is looked up in the gazetteer.
const PLACE_WORDS = '(?:Ridge|Hill|Hills|Road|road|Pike|pike|Turnpike|Run|Creek|Woods|Wood|Farm|Field|House|house|Tavern|tavern|Knoll|Top|Den|Orchard|Cemetery|Spring|Station|Lane|Church|Barn|Gap|Bridge|Mill|Ford|Junction|Camp|Pass|Heights|Cuts|Valley|Grove|Seminary|Springs|Depot|Square|Embankment|embankment|Gatehouse|gatehouse)';
const CAP = "[A-Z][A-Za-z\\u2019'\\ufffd]+";
const RE_PHRASE = new RegExp(String.raw`\b(${CAP}(?:\s+(?:of|de)?\s*${CAP})*\s+${PLACE_WORDS})\b`, 'g');
const RE_PREP = new RegExp(String.raw`\b(?:at|from|to|near|via|in|toward|through|reaches|enters|beyond|behind|north of|south of|east of|west of)\s+(${CAP}(?:\s+${CAP}){0,2})`, 'g');
const MONTHS = /\s+(?:Jul|Jun|Aug)\b.*$/;
const clean = n => n.replace(MONTHS, '').replace(/’s$/, '').trim();
const STOP = new Set(['Corps', 'Division', 'Brigade', 'Div', 'Evergreen', 'Maine', 'Reserve']);     // not places
export function candidatePlaces(raw) {
  const reliable = new Map(), loose = new Map(); const add = (m, k, w) => { if (!k || k.length < 4) return; if (!m.has(k)) m.set(k, []); m.get(k).push(w); };
  for (const r of raw.arrivals.rows) for (const cell of ['first_on_field', 'night_positions', 'key_positions', 'left_or_moved']) {
    let t = String(r.raw[cell] ?? '').replace(/�/g, '’'); const where = `${r.id}/${cell}`;
    t = t.replace(RE_PHRASE, (m0, g) => { for (const part of g.split(/\s+and\s+/)) add(reliable, clean(part), where); return ' '.repeat(m0.length); });   // mask what the place-word pattern took
    t = t.replace(/(Cemetery Hill) and (Cemetery Ridge)/g, '$1 $2');
    let m; RE_PREP.lastIndex = 0; while ((m = RE_PREP.exec(t))) { const nm = clean(m[1]); if (STOP.has(nm) || /^(Jul|Jun)/.test(nm)) continue; add(loose, nm, where); }
  }
  return { reliable, loose };
}
// counts and lists for the contract 1.3 sections of the notes: casualties, guns, per-figure kit, formation changes
function contract13(L, raw, rep) {
  const units = L.units, drawn = units.filter(u => u.drawn), cas = rep.casualties || [];
  const withShare = units.filter(u => u.casualties.kind !== 'none'), printed = units.filter(u => u.casualties.kind === 'printed'), proc = units.filter(u => u.casualties.kind === 'procedural');
  const engaged = proc.filter(u => u.casualties.engaged), drawnEngaged = drawn.filter(u => u.casualties.kind !== 'none' && u.casualties.engaged);
  const shown = cas.reduce((a, c) => a + c.shown, 0), planEv = cas.reduce((a, c) => a + c.plan_events, 0), byFate = { killed: 0, wounded: 0, missing: 0 }; for (const c of cas) for (const f of Object.keys(byFate)) byFate[f] += c[f];
  const cl = raw.engagements ? raw.engagements.clauses : [], verdicts = {}; for (const c of cl) { const v = c.or27_audit ? c.or27_audit.verdict : 'NO_AUDIT'; verdicts[v] = (verdicts[v] || 0) + 1; }
  const fm = L.fateModel;
  const batteries = units.filter(u => u.arm === 'artillery' && !u.children.length), g = L.gunData || { matched: [], combined: [], unmatched: [] };
  const gunsDrawn = units.filter(u => u.guns.status === 'drawn'), stated = batteries.filter(u => u.guns.count != null);
  const fig = L.figures, how = {}; if (fig) for (const u of drawn) { const k = fig.kitUnitOf(u.id).how; how[k] = (how[k] || 0) + 1; }
  const fv = raw.figuresValidation || null;
  const formations = (raw.placement.clauses || []).filter(c => c.status === 'transcribed' && c.formation).map(c => ({ id: c.id, row: c.row, phrase: c.phrase, units: c.units, t: c.t, formation: c.formation, drawn_under: drawn.filter(u => c.units.some(x => u.id === x || u.id.startsWith(x + '-'))).length, events: 0 }));
  const evs = L.both({}).events.filter(e => e.type === 'formation'); for (const f of formations) f.events = evs.filter(e => e.clause === f.id).length;
  return {
    casualties: { units_with_a_number: withShare.length, printed: printed.length, procedural: proc.length, engaged_leaf_units: engaged.length, drawn_with_window: drawnEngaged.length, drawn_with_plan: cas.length, plan_events: planEv, shown, not_shown: planEv - shown, shown_by_fate: byFate,
      pools: L.lossPools, clauses: cl.length, clause_units: new Set(cl.flatMap(c => c.units)).size, verdicts, fate_model: fm, per_unit: cas },
    guns: { batteries_in_roster: batteries.length, stated_in_kit: (L.gunData && L.gunData.kit_counts ? L.gunData.kit_counts.with_stated_guns : 0), matched: g.matched.length, combined: g.combined.length, unmatched: g.unmatched.length, batteries_with_stated_count: stated.length, drawn_batteries: drawn.filter(u => u.arm === 'artillery').length, batteries_with_guns_drawn: gunsDrawn.length, guns_drawn: gunsDrawn.reduce((a, u) => a + u.guns.count, 0),
      drawn_battery_ids: drawn.filter(u => u.arm === 'artillery').map(u => u.id), combined_list: g.combined.map(c => ({ kit: c.kit, history: c.history })), unmatched_list: g.unmatched.map(c => c.kit) },
    figures: { drawn_units: drawn.length, figures: drawn.reduce((a, u) => a + u.strength.drawn, 0), by_how: how, crosswalk_counts: raw.kitCrosswalk ? raw.kitCrosswalk.counts : null, validation: fv ? { figures: fv.totals.figures, fail: fv.totals.fail, flag: fv.totals.flag, flag_codes: fv.totals.flag_codes, units: fv.totals.units, export_digest: fv.export_digest } : null },
    formations,
  };
}
export function report(raw = loadRawFromDisk()) {
  const L = createRealHistory({ raw, T: terrainMeta() }), gz = new Gazetteer(raw.gazetteer), raw5 = { ...raw, siblingApproach: null }, L5 = raw.siblingApproach ? createRealHistory({ raw: raw5, T: terrainMeta() }) : L;
  const cand = candidatePlaces(raw), resolved = [], unresolved = [], looseResolved = [], looseUnresolved = [];
  for (const [map, ok, no] of [[cand.reliable, resolved, unresolved], [cand.loose, looseResolved, looseUnresolved]]) for (const [name, where] of [...map].sort((a, b) => a[0].localeCompare(b[0]))) { const p = gz.resolve(name); (p ? ok : no).push({ name, where: [...new Set(where)], resolves_to: p ? p.name : null, ambiguous: gz.isAmbiguous(name) }); }
  const rep = L.report({});
  const byStatus = L.counts, plans = [...L.plans.values()];
  const reasons = {}; for (const p of plans) if (p.status === 'unresolved') reasons[p.reason] = (reasons[p.reason] || 0) + 1;
  const withoutPosition = L.units.filter(u => u.render.status === 'not_drawn').map(u => u.id);
  const edgeOnly = plans.filter(p => p.status === 'edge_only').map(p => p.unit), moving = plans.filter(p => p.status === 'moving').map(p => p.unit);
  const figures = L.units.filter(u => u.drawn).reduce((a, u) => a + u.strength.drawn, 0);
  // ---- the clause table (data/placement.json v2): counts by cell and kind, the unresolved clauses with their reasons, the names with no coordinate
  const CL = raw.placement.clauses || [], cellKey = c => c.cell, tally = {}; for (const c of CL) { const t = (tally[cellKey(c)] ||= { transcribed: 0, unresolved: 0 }); t[c.status]++; }
  const kinds = {}; for (const c of CL) if (c.status === 'transcribed') kinds[c.kind] = (kinds[c.kind] || 0) + 1;
  const offNames = [...new Set(CL.filter(c => c.status === 'unresolved').flatMap(c => [...c.reason.matchAll(/“([^”]+)” has no coordinate/g)].map(m => m[1])))].sort();
  const rowOfEntry = id => (raw.placement.positions.concat(raw.placement.approach, raw.placement.activities, raw.placement.departures || []).find(e => e.id === id) || {});
  const clauseEffect = c => { if (c.status !== 'transcribed') return null; const ds = c.drives || []; if (!ds.length) return 'recorded'; const ent = rowOfEntry(ds[0]); const us = (ent.units || [ent.unit]).filter(Boolean); const any = us.some(u => L.units.some(x => x.drawn && (x.id === u || x.id.startsWith(u + '-')))); return any ? 'drives a drawn unit' : 'drives no drawn unit'; };
  const approachTable = raw.placement.approach.map(a => { const us = L.units.filter(u => u.drawn && u.approach && u.approach.id === a.id); return { id: a.id, unit: a.unit, road: a.road, phrase: a.phrase, tier: a.tier, drawn: us.length, plan_error: !us.length ? ((L.plans.get(L.units.find(u => u.render.status === 'not_drawn' && u.id.startsWith(a.unit))?.id) || {}).reason || null) : null, by_tier: us.reduce((m, u) => { m[u.approach.tier] = (m[u.approach.tier] || 0) + 1; return m; }, {}) }; });
  const inferredUnits = L.units.filter(u => u.drawn && u.approach.tier === 'inferred'), procUnits = L.units.filter(u => u.drawn && u.approach.tier === 'plausible-procedural');
  return { clauses: { total: CL.length, by_cell: tally, by_kind: kinds, unresolved: CL.filter(c => c.status === 'unresolved').map(c => ({ id: c.id, row: c.row, cell: c.cell, phrase: c.phrase, reason: c.reason })), transcribed: CL.filter(c => c.status === 'transcribed').map(c => ({ id: c.id, row: c.row, cell: c.cell, kind: c.kind, phrase: c.phrase, place: c.place || (c.places ? c.places.map(p => p.place).join(' | ') : c.road || null), sigma_m: c.sigma_m ?? null, t: c.t || c.d || null, tier: c.tier, effect: clauseEffect(c), drives: c.drives || [], not_driving: c.not_driving || null })), off_names: offNames },
    approaches: approachTable, approach_roads: [...new Set(L.units.filter(u => u.drawn).map(u => u.approach.road))].sort(), approach_units: { inferred: inferredUnits.map(u => u.id), plausible_procedural: procUnits.map(u => u.id) }, offsets: rep.offsets, activity_notes: rep.activity_notes, skipped_stops: [...L.plans.values()].flatMap(p => (p.skipped || []).map(x => ({ unit: p.unit, ...x }))),
    counts: byStatus, figures_drawn: figures, leaf_units_on_field: L.units.filter(u => u.render.status === 'not_drawn' || u.drawn).length, unresolved_reasons: reasons, moving, edge_only: edgeOnly, units_without_position: withoutPosition, place_candidates: { total: cand.reliable.size + cand.loose.size, resolved, unresolved, loose_resolved: looseResolved, loose_unresolved: looseUnresolved },
    gazetteer: { places: raw.gazetteer.places.length, proxies: raw.gazetteer.places.filter(p => p.resolution === 'proxy').map(p => p.name), no_coordinates_in_repository: raw.gazetteer.no_coordinates_in_repository },
    pools: L.pools, late_arrivals: rep.offsets.filter(d => d.late_min > 0), defects: rep.defects, objects: { drawn_pre_existing: L.objects.filter(o => o.pre_existing).length, drawn_works: L.objects.filter(o => !o.pre_existing).length, with_place: L.objects.filter(o => o.at).length, skipped_works: L.objectsSkipped },
    floor_lifts: L.units.filter(u => { const e = L.model.effective(u.id, {}); return e && e.notes.some(n => /drawn no earlier than its parent/.test(n)) && e.owner === u.id; }).length,
    places_outside_loaded_ground: raw.gazetteer.places.filter(p => !p.line && !p.stream && !insideBox(p.center, terrainMeta().meta)).map(p => p.name),
    contract13: contract13(L, raw, rep),
    claims: claimsReport(raw5, L5, terrainMeta()),                       // the stages of the layer before v6 are described in the state they were built in (the sibling records of v6 have their own section)
    daypos: daposReport(raw5, L5, terrainMeta()),
    ledgerE: ledgerEReport(raw, terrainMeta()),                            // history layer v8 (DEC-023E): what the state regimental volumes add, against the layer without them
    key_position_clauses: raw.arrivals.rows.reduce((a, row) => a + String(row.raw.key_positions || '').split(';').filter(x => x.trim()).length, 0), kit_matched: raw.kit ? (() => { let n = 0; for (const u of L.units) { const k = L.kit(u.id); if (k.validator.note.includes('the unit record ')) n++; } return n; })() : 0 };
}
if (import.meta.url === new URL(process.argv[1], 'file://').href || process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const r = report();
  if (process.argv.includes('--md')) {
    console.log(`units ${r.counts.total}: ${r.counts.moving} placed (road and dated place), ${r.counts.edge_only} at the arrival edge only, ${r.counts.not_drawn} open gap (no road of approach), ${r.counts.aggregate} formations, ${r.counts.not_on_field} not on the field`);
    console.log('unresolved place names (phrase ending in a place word):', r.place_candidates.unresolved.map(u => u.name).join('; '));
    console.log('unresolved capitalised names after a place preposition (towns, people or units may be among them):', r.place_candidates.loose_unresolved.map(u => u.name).join('; '));
  } else console.log(JSON.stringify(r, null, 1));
}
