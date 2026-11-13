// The realization record (gate Q17) and its static validation.
//
// WHAT THE GATE SAYS. PDF Part E, Section Q (plan-clean.txt, page 136): "Q17 Coverage: every timeline row has a visual realization or an open register entry."
// The same words are the test of requirement O7 in the requirement-by-requirement assessment (Part D.2, page 124): "Coverage matrix: every timeline row either has a visual realization or a register
// entry. The notes did not reach minute-level everywhere. Fine grain exists for some events; coarse grain elsewhere is labeled." And Part B.2 (page 9) says how the engine consumes a row: "Each event
// row is a node with a window [earliest, latest], a canonical time, a tier and a unit list ... a unit's own rows form a chain (a unit never appears before its first row, and never in two places at
// once ...); environment rows (weather, sun, moon) are a separate track keyed to the same clock. Nodes with tier open gap generate no behaviour and surface as map markers in the evidence layer;
// plausible-procedural nodes generate seeded fallback behaviour that is always visibly flagged."
//
// WHAT THE HARNESS MEANS BY IT. A row has a VISUAL REALIZATION when, at a minute inside the row's time window, what the Battle Theatre shows (what the stage, the structures, the weather and sky, the
// casualty events and the event cards of the product say at that minute) is what the row says: the units the row names are on the field (never before their arrival), at the place the row names (within
// the stated distance tolerance of that kind of place), doing what the row says; or the structure is in the state the row says, in the picture; or the weather and sky are as the row says; or the men
// leave the line; or a tier-marked card shows the row. A record states which entities realize the row and carries the CHECK that proves it; check.mjs runs the check against the product and writes the
// result. A row with no record, a record whose check fails, or a record of kind not_realized is NOT realized: its coverage then comes only from an open register entry (the other half of the gate).
//
// A record is one JSON object, one line per timeline row, in GOVERNANCE/realizations/<shard>.jsonl:
//   {
//     "id":        "T1-004",                     the timeline row (T1-001..T3-nnn; E-001..E-014 for the epilogue rows)
//     "harness":   "bt-realize-1",               the version of this format (lib.mjs HARNESS)
//     "kind":      "unit_motion",                one of KINDS
//     "scenario":  "default",                    'default' (the shell's opening scenario), 'pdf' (the plan's values), or { "choices": { "C-021": "v1" } }; a list means: must hold in every one
//     "window":    { "from": "1863-07-01T09:40", "to": "1863-07-01T10:20" },   the minutes the checks look at; inside the row's allowed window (q.mjs row <id> prints it)
//     "claim":     { "quote": "...", "quotes": ["..."] },   a verbatim piece of the row's text (printed cells, or the corrected claim) that this record realizes; found by word, apostrophes folded
//     "entities":  { "units": ["id" | { "id", "via" }], "structures": [...], "places": [...], "schedule": ["S-001"], "works": ["E-05"], "cards": ["row ids"] },   every entity the checks use, no more, no less
//     "checks":    [ { "type": "unit_moves", ... }, ... ],      the assertions (ASSERT below); every one must hold
//     "place_unspecified": "why",                (optional) a motion or activity row that names no place at all says so here
//     "not_shown": [ { "words": "...", "why": "..." } ],   (optional, realized kinds) the parts of the row the record does NOT realize, in the row's words; the row is then realized PARTIALLY (RESULTS: partial true) and those parts stay open
//     "missing":   [ { "code": "unit_not_drawn", "detail": "...", "builder": "units" } ],   kind not_realized only: what is missing; the checks are what WOULD realize it and must FAIL with these codes
//     "register":  ["EG-..."],                   (optional) open register entries that cover the row meanwhile
//     "result":    { "realized": true, "why": "...", "digest": "..." },   (optional) written by check.mjs --update; the harness recomputes it every run
//     "note":      "free text"
//   }
//
// A TIME in a check is { "at": "1863-07-01T10:00" } or { "from": "...", "to": "...", "mode": "any" | "all" }; "any" (the default) = at some whole minute of the span, "all" = at every whole minute.
// A UNIT is a layer unit id. A formation (corps, division, brigade, battalion) stands for its leaf units on the field; every one of them must satisfy the assertion (quantifier "all", the default) or
// one of them (quantifier "any", for rows that say "part of"); a leaf the picture does not draw fails and is named.
import { HARNESS, toMin, isoOf, hasQuote, fold } from './lib.mjs';
import { coversInterval, describeWindow } from './timeline.mjs';

export const KINDS = ['unit_motion', 'unit_activity', 'arrival', 'structure_state', 'earthwork_build', 'artillery', 'weather_sky', 'casualty_flow', 'event_card', 'epilogue', 'not_realized'];
// what each kind needs at least: one assertion from each inner list (and the extra rules in validateRecord)
export const KIND_NEEDS = {
  unit_motion: [['unit_moves']], unit_activity: [['unit_activity', 'unit_formation', 'unit_present', 'unit_figures']], arrival: [['unit_arrives', 'unit_absent']], structure_state: [['structure_state']], earthwork_build: [['work_stage']],
  artillery: [['battery_guns']], weather_sky: [['weather', 'sky']], casualty_flow: [['casualty']], event_card: [['card_shown']], epilogue: [['epilogue_shown', 'card_shown']], not_realized: [],
};
// the assertion types: units = takes unit(s); time = takes a time; need = required fields; one = at least one of these; opt = optional fields
export const ASSERT = {
  unit_in_layer:  { units: false, time: false, need: ['words'], opt: ['arm', 'side'] },
  unit_present:   { units: true, time: true, need: [], opt: [] },
  unit_absent:    { units: true, time: true, need: [], opt: ['why_in'] },
  unit_at:        { units: true, time: true, need: ['place'], opt: ['within_m'] },
  unit_moves:     { units: true, time: true, need: [], one: ['from', 'to', 'toward', 'along', 'away_from'], opt: ['min_minutes', 'min_displacement_m', 'min_closing_m', 'within_m'] },
  unit_activity:  { units: true, time: true, need: ['activities'], opt: ['min_minutes', 'picture'] },
  unit_arrives:   { units: true, time: true, need: [], opt: ['at_place', 'within_m'] },
  unit_formation: { units: true, time: true, need: ['formation'], opt: [] },
  unit_figures:   { units: true, time: false, need: [], one: ['approx', 'min', 'max'], opt: ['tol_pct'] },
  structure_exists: { time: false, need: ['words'], opt: [] },
  structure_state: { time: true, need: ['structure'], opt: ['state', 'present', 'visual', 'schedule_row', 'hospital', 'drawn', 'structure_scenario'] },
  work_stage:     { time: true, need: ['work'], opt: ['stage_min', 'stage_max', 'present', 'crew', 'structure_scenario'] },
  battery_guns:   { units: true, time: true, need: [], opt: ['guns_min', 'limbers_min', 'caissons_min', 'horses_min'] },
  weather:        { time: true, need: [], one: ['precip_kind_in', 'precip_intensity_min', 'precip_intensity_max', 'cloud_min', 'cloud_max', 'temp_f', 'wetness_min', 'wetness_max', 'wind_mph_min', 'wind_mph_max', 'visibility_m_max', 'record'], opt: ['tol_f', 'value_quote'] },
  sky:            { time: true, need: [], one: ['sun_alt_min', 'sun_alt_max', 'moon_up', 'moon_illum_min', 'moon_illum_max', 'band_in', 'exposure_min'], opt: [] },
  casualty:       { time: true, need: [], one: ['killed_min', 'wounded_min', 'missing_min', 'events_min'], opt: ['units'] },
  card_shown:     { time: true, need: ['rows'], opt: ['tier'] },
  epilogue_shown: { time: true, need: ['rows'], opt: ['tier'] },
  place_known:    { time: false, need: ['place'], opt: ['on_ground'] },
};
export const UNIT_TYPES = Object.entries(ASSERT).filter(([, v]) => v.units).map(([k]) => k);
export const MODES = ['any', 'all'];
export const ACTIVITY_NAMES = ['march', 'double_quick', 'halt', 'stand', 'rest', 'fire', 'serve_guns', 'gallop', 'build_works', 'camp', 'halt_mounted', 'skirmish'];     // the stage's activities (history/contract.mjs ACTIVITIES) and the picture's two more (crowd/anim.mjs)

export const parseSpan = (obj, base) => {          // { at } or { from, to, mode } -> { from, to, mode } in minutes
  const o = obj || base; if (!o) return null;
  if (o.at != null) { const t = toMin(o.at); return { from: t, to: t, mode: 'any', at: true }; }
  const a = toMin(o.from), b = toMin(o.to ?? o.from); if (b < a) throw new Error(`time span ends before it starts (${o.from} .. ${o.to})`);
  const mode = o.mode || 'any'; if (!MODES.includes(mode)) throw new Error(`bad mode "${mode}"`);
  return { from: a, to: b, mode };
};
export const entityId = e => (typeof e === 'string' ? e : e && e.id);
export const entityVia = e => (e && typeof e === 'object' ? e.via : null);
// the units an assertion names (before leaf expansion), as ids
export function assertionUnits(a) { const u = [...(a.unit ? [a.unit] : []), ...(a.units || [])]; if (a.type === 'casualty') return (a.units || []); return u; }

// ---- static validation: everything that needs no product. Returns { problems: [{ code, detail }], span }.
// ctx: { row (from timeline.mjs), tolerances }
export function validateRecord(rec, ctx) {
  const P = [], add = (code, detail) => P.push({ code, detail }), row = ctx.row;
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return { problems: [{ code: 'schema_not_object', detail: 'a record is one JSON object' }], span: null };
  if (rec.harness !== HARNESS) add('schema_harness', `"harness" must be "${HARNESS}" (found ${JSON.stringify(rec.harness)})`);
  if (rec.intended_kind != null && (!KINDS.includes(rec.intended_kind) || rec.intended_kind === 'not_realized')) add('schema_intended_kind', `intended_kind must be a kind other than not_realized (found ${JSON.stringify(rec.intended_kind)})`);
  if (rec.kind === 'not_realized' && rec.intended_kind == null) add('schema_intended_kind', 'a not_realized record names the kind it would have when realized: "intended_kind"');
  if (!KINDS.includes(rec.kind)) add('schema_kind', `kind must be one of ${KINDS.join(', ')} (found ${JSON.stringify(rec.kind)})`);
  if (!row) { add('row_unknown', `no timeline row ${rec.id}`); return { problems: P, span: null }; }
  // ---- the window
  let span = null;
  try { span = parseSpan(rec.window); } catch (e) { add('window_bad', String(e.message || e)); }
  if (!span) add('window_missing', 'a record needs "window": { "from", "to" } in 1863-MM-DDTHH:MM');
  else if (ctx.clock && !coversInterval(ctx.clock, span.from, span.to)) add('time_outside_clock', `the window ${isoOf(span.from)}..${isoOf(span.to)} is outside the minutes the theatre can show (${ctx.clock.map(([a, b]) => isoOf(a) + '..' + isoOf(b)).join(' and ')}: app/src/clock.mjs BATTLE and EPILOGUE)`);
  if (span && !coversInterval(row.window.intervals, span.from, span.to)) add('window_outside_row', `the window ${isoOf(span.from)}..${isoOf(span.to)} is not inside the time the row allows (${describeWindow(row.window)}; basis: ${row.window.basis.join('; ')})`);
  // ---- the claim: a piece of the row's own words
  const quotes = [...(rec.claim && rec.claim.quote ? [rec.claim.quote] : []), ...((rec.claim && rec.claim.quotes) || [])];
  if (!quotes.length) add('quote_missing', 'claim.quote: a verbatim piece of the row\'s text this record realizes');
  for (const q of quotes) if (!hasQuote(row.claim_text, q)) add('quote_not_in_row', `"${String(q).slice(0, 80)}" is not in the printed cells of ${row.id} or its corrected claim (apostrophes and quotation marks are folded, words must match)`);
  // ---- assertions
  const checks = Array.isArray(rec.checks) ? rec.checks : null;
  if (!checks || !checks.length) add('checks_missing', 'a record needs "checks": [ ... ] (the assertions that prove it)');
  const used = { units: new Set(), structures: new Set(), places: new Set(), works: new Set(), cards: new Set() };
  for (const [i, a] of (checks || []).entries()) {
    const at = `checks[${i}]`;
    if (!a || typeof a !== 'object') { add('assert_bad', `${at} is not an object`); continue; }
    const spec = ASSERT[a.type]; if (!spec) { add('assert_type', `${at}: unknown type "${a.type}" (use ${Object.keys(ASSERT).join(', ')})`); continue; }
    for (const f of spec.need) if (a[f] == null || (Array.isArray(a[f]) && !a[f].length)) add('assert_field', `${at} (${a.type}): "${f}" is required`);
    if (spec.one && !spec.one.some(f => a[f] != null)) add('assert_field', `${at} (${a.type}): at least one of ${spec.one.join(', ')} is required`);
    const known = new Set(['type', 'unit', 'units', 'quantifier', 'at', 'from_t', 'to_t', 't', 'quote', 'note', 'scenario', ...spec.need, ...(spec.one || []), ...spec.opt]);
    for (const k of Object.keys(a)) if (!known.has(k)) add('assert_unknown_field', `${at} (${a.type}): unknown field "${k}"`);
    if (spec.units && !assertionUnits(a).length && a.type !== 'casualty') add('assert_field', `${at} (${a.type}): "unit" or "units" is required`);
    if (a.type === 'battery_guns' && !assertionUnits(a).length) add('assert_field', `${at}: "unit" or "units" is required`);
    if (a.type === 'casualty' && !(a.units || []).length) add('assert_field', `${at} (casualty): "units" is required: the units whose losses the row names (an army-wide row names the army: us-aop, cs-anv)`);
    if (a.quantifier != null && !['all', 'any'].includes(a.quantifier)) add('assert_quantifier', `${at}: quantifier is "all" or "any"`);
    if (spec.time) {
      let s = null; try { s = parseSpan(a.t, null); } catch (e) { add('assert_time', `${at}: ${e.message}`); }
      if (s && span && (s.from < span.from || s.to > span.to)) add('assert_time_outside_window', `${at} (${a.type}): its time ${isoOf(s.from)}..${isoOf(s.to)} is outside the record window`);
      if (!a.t && span) { /* the record window is the default */ }
    }
    if (a.type === 'unit_activity') for (const x of [].concat(a.activities || [])) if (!ACTIVITY_NAMES.includes(x)) add('assert_activity', `${at}: unknown activity "${x}" (${ACTIVITY_NAMES.join(', ')})`);
    if (a.quote != null && !hasQuote(row.claim_text, a.quote)) add('quote_not_in_row', `${at}: "${String(a.quote).slice(0, 80)}" is not in the row text`);
    const numIn = (q, n) => q != null && (String(q).replace(/(\d),(\d)/g, '$1$2').match(/\d+(?:\.\d+)?/g) || []).some(x => +x === +n);
    if (a.type === 'weather' && a.temp_f != null && !numIn(a.quote, a.temp_f)) add('number_not_in_quote', `${at}: temp_f ${a.temp_f} must come from a printed number: give "quote" with the row's words containing ${a.temp_f}`);
    if (a.type === 'unit_figures' && a.approx != null && !numIn(a.quote, a.approx)) add('number_not_in_quote', `${at}: approx ${a.approx} must come from a printed number: give "quote" with the row's words containing it`);
    for (const u of assertionUnits(a)) used.units.add(entityId(u));
    if (a.structure) used.structures.add(a.structure); if (a.work) used.works.add(a.work); if (a.crew && a.crew.units) for (const u of a.crew.units) used.units.add(entityId(u));
    for (const k of ['place', 'from', 'to', 'toward', 'along', 'away_from', 'at_place']) if (a[k] != null && typeof a[k] === 'string') used.places.add(a[k]);
    if ((a.type === 'card_shown' || a.type === 'epilogue_shown') && a.rows) for (const r of a.rows) used.cards.add(r);
  }
  // ---- kind needs
  if (KINDS.includes(rec.kind) && checks) {
    for (const group of KIND_NEEDS[rec.kind] || []) if (!checks.some(a => group.includes(a.type))) add('kind_needs', `kind ${rec.kind} needs at least one ${group.join(' or ')} assertion`);
    const types = checks.map(a => a.type);
    if (rec.kind === 'unit_motion' && !checks.some(a => a.type === 'unit_moves' && ['from', 'to', 'toward', 'along', 'away_from'].some(k => a[k] != null)) && !rec.place_unspecified) add('kind_needs', 'unit_motion needs a unit_moves assertion that relates the motion to a place (from, to, toward, along or away_from), or "place_unspecified": "why" when the row names no place');
    if (rec.kind === 'unit_activity' && !types.includes('unit_at') && !rec.place_unspecified) add('kind_needs', 'unit_activity needs a unit_at assertion (where the unit does it), or "place_unspecified": "why" when the row names no place');
    if (rec.kind === 'earthwork_build' && !checks.some(a => a.type === 'work_stage' && a.crew)) add('kind_needs', 'earthwork_build needs a work_stage assertion with "crew": { "units": [...] } (PDF Q08: a work crew in the construction interval)');
  }
  if (rec.kind !== 'not_realized' && KINDS.includes(rec.kind) && checks && /\bNIGHT\b/.test(row.time_cell || '') && !checks.some(a => a.type === 'sky' && a.exposure_min != null)) add('kind_needs', 'a NIGHT row needs a sky assertion with exposure_min (gate Q10: night is night, never black; GATE-SPEC-A K6)');
  if (rec.not_shown != null) {
    if (!Array.isArray(rec.not_shown) || !rec.not_shown.length) add('not_shown_bad', '"not_shown" is a non-empty list of { words, why }');
    else for (const n of rec.not_shown) { if (!n || !n.words || !n.why) add('not_shown_bad', 'each "not_shown" entry needs words (the row\'s own) and why'); else if (!hasQuote(row.claim_text, n.words)) add('quote_not_in_row', `not_shown words "${String(n.words).slice(0, 80)}" are not in the row text`); }
    if (rec.kind === 'not_realized') add('not_shown_on_not_realized', '"not_shown" belongs on a realized record; a not_realized record uses "missing"');
  }
  if (rec.kind === 'not_realized') {
    if (!Array.isArray(rec.missing) || !rec.missing.length) add('missing_missing', 'kind not_realized needs "missing": [ { "code", "detail" } ] (what the product lacks)');
    for (const m of rec.missing || []) { if (!m || !m.code || !m.detail) add('missing_bad', 'each "missing" entry needs code and detail'); }
  } else if (rec.missing) add('missing_on_realized', '"missing" belongs on a not_realized record only');
  // ---- entities: what the checks use, no more, no less
  const E = rec.entities && typeof rec.entities === 'object' ? rec.entities : null;
  if (!E) add('entities_missing', 'a record needs "entities": { units, structures, places, ... }');
  else {
    const ids = k => new Set((E[k] || []).map(entityId));
    const same = (k, usedSet, label) => { const have = ids(k); for (const x of usedSet) if (!have.has(x)) add('entity_undeclared', `${label} ${x} is used by a check but not listed in entities.${k}`); for (const x of have) if (!usedSet.has(x)) add('entity_unused', `${label} ${x} is listed in entities.${k} but no check uses it`); };
    same('units', used.units, 'unit'); same('structures', used.structures, 'structure'); same('works', used.works, 'work'); same('places', used.places, 'place'); same('cards', used.cards, 'card row');
    for (const k of Object.keys(E)) if (!['units', 'structures', 'places', 'schedule', 'works', 'cards'].includes(k)) add('entities_unknown', `entities.${k} is not a known entity list`);
  }
  if (rec.result != null && typeof rec.result !== 'object') add('result_bad', '"result" is an object { realized, why, digest }');
  return { problems: P, span, used };
}
export { fold };
