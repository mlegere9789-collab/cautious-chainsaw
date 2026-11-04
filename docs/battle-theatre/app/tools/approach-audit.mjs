// The audit of the roads of approach (history layer v5): why a leaf unit still has no road, claim by claim, formation by formation, and what drawing changed against v4 (the position statements admitted by DEC-013 a and the period road names resolved by the concordance, DEC-014).
//   node docs/battle-theatre/app/tools/approach-audit.mjs            writes docs/battle-theatre/app/APPROACH-AUDIT.md (history-notes.mjs also writes the summary into HISTORY-LAYER-NOTES.md)
// Everything in the output is computed from the layer, the ledgers (history/positions/positions_{A,B,C,D}.jsonl), the dispositions of the builder, the curation table (data/claim-curation.json),
// the hand-reviewed verdicts (data/approach-review.json) and the record scan (data/approach-record-scan.json). Nothing here decides a road: the roads adopted are in the curation table.
//
// What is examined: every usable claim (claim_support_verified true, fidelity_check passed_full_read or corrected, tier documented or inferred) of kind arrival_road, march or movement, dated 3 July 1863
// or earlier, that belongs to an open-gap leaf unit or to a formation above one, and whose printed words (quote, printed place, road field, the compiler's summary) name a road. Those that name a
// road only in the report text around the quote come from the record scan. The reason a claim is not used is one of CODES below.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { createRealHistory } from '../src/history/real.mjs';
import { Gazetteer, norm, boxCrossings } from '../src/history/gazetteer.mjs';
import { loadLedgers, unusable } from './claim-ledger.mjs';
import { loadRawFromDisk, terrainMeta } from './history-report.mjs';
import { isApproachCandidate, isPositionRoadCandidate } from './build-claim-placement.mjs';
import { SIBLING_CODES, chainOf } from './sibling-rule.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), BT = path.resolve(here, '../..');
const J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8'));
export const OUT_MD = 'app/APPROACH-AUDIT.md', REVIEW = 'app/data/approach-review.json', SCAN = 'app/data/approach-record-scan.json', CURATION = 'app/data/claim-curation.json';
export const LAST_DATE = '1863-07-03';
const ROAD_WORD = /\b(road|roads|pike|turnpike|railroad|lane|street|route)\b/i;
const bracketed = s => /\[/.test(s || '');

// the reason codes, in the order of specificity used to give a leaf its reason (the first code found on its line of command)
export const CODES = [
  ['road_outside_ground', 'a road is printed for the line of command but it does not cross the loaded ground (Black Horse Tavern Road, AP-07): no other road is chosen for the unit'],
  ['road_not_resolvable', 'a report of the line names a road, and the repository holds no such road (Heidlersburg, Middletown, the Gettysburg road, the road from Scotland, the Waynesborough pike, a railroad), or two roads of the road layer could carry the name; none is guessed'],
  ['road_name_ambiguous', 'the name printed is not the gazetteer\'s and two roads could carry it'],
  ['reports_disagree', 'the reports of the same formation print different roads; none is chosen (the disagreement is listed)'],
  ['earlier_march', 'a march before the battle, not the approach to the field'],
  ['earlier_leg', 'an earlier leg of the march outside the loaded ground; another claim prints the leg that enters the field'],
  ['position_not_approach', 'the road is where the unit stood, formed, camped or crossed inside the field: no approach is stated'],
  ['no_quote', 'an inferred claim with no verbatim quote: the road cannot be checked against printed words'],
  ['no_road_named', 'the passage names no road (a direction, a town, “the road”)'],
  ['route_not_a_road', null], ['movement_black_horse', null], ['movement_road_not_resolvable', null], ['movement_order', null], ['movement_in_field', null], ['movement_road_unnamed', null], ['movement_wagon_train', null],
  ['road_of_another_place', 'the road named is a road of another place (the Taneytown to Emmitsburg road, the Chambersburg to Carlisle road), not the gazetteer road of the same name'],
  ['position_in_field', 'a position statement that prints a road says where a line, a battery, a camp or a headquarters stood inside the field (the road is a reference for the place): no approach is stated'],
  ['road_not_printed', 'the road stands only in the compiler\'s bracketed gloss or summary, not in the claim\'s printed words (a bracketed gloss is never evidence)'],
  ['record_text_only', null],
  ['none', 'no usable arrival_road, march or movement claim of the line of command names a road'],
];
const CODE_ORDER = CODES.map(c => c[0]);
const FROM_CURATION = [[/road of another place/, 'road_of_another_place'], [/move or a retirement made after the unit stood on the field/, 'movement_in_field'],[/stood, formed or struck|stood, camped or crossed|named only as the line/, 'position_not_approach'], [/names no road \(a direction/, 'no_road_named'], [/not in the gazetteer or the roads layer/, 'road_not_resolvable'],
  [/names no road the gazetteer holds/, 'road_not_resolvable'], [/name is not the gazetteer.s and two roads/, 'road_name_ambiguous'], [/march before the battle/, 'earlier_march'], [/earlier leg of the march/, 'earlier_leg'],
  [/no verbatim quote/, 'no_quote'], [/reports of the same formation print different roads/, 'reports_disagree']];
export const LEVEL_DEPTH_GROUP = 2;

const tally = (xs, f) => { const m = {}; for (const x of xs) { const k = f(x); m[k] = (m[k] || 0) + 1; } return m; };
const figures = L => L.units.filter(u => u.drawn).reduce((a, u) => a + u.strength.drawn, 0);
const hasDayPos = u => !!(u.day_positions && u.day_positions.days.some(d => d.status === 'single'));
function snapshot(L) {
  const drawn = L.units.filter(u => u.drawn), rep = L.report({}), ap = tier => drawn.filter(u => u.approach.tier === tier).length, gap = L.units.filter(u => !u.children.length && u.render.status === 'not_drawn');
  return { open_with_day: gap.filter(hasDayPos).length, drawn: drawn.length, moving: L.counts.moving, edge_only: L.counts.edge_only, open_gap: L.counts.not_drawn, figures: figures(L), approach_records: L.placement.ap.length, inferred: ap('inferred'), plausible_procedural: ap('plausible-procedural'),
    offsets: rep.offsets.length, defects: rep.defects.length, day_stops_applied: rep.day_stops.filter(d => d.applied).length, day_stops: rep.day_stops.length };
}

export function approachAudit({ raw: rawIn = loadRawFromDisk(), T = terrainMeta() } = {}) {
  const raw = { ...rawIn, siblingApproach: null };                                                                // this audit is of the v5 state (roads printed in the record); the v6 sibling records are audited by siblingAudit()
  const L = createRealHistory({ raw, T }), cd = raw.placementClaims || { approach: [], claims: {} };
  const baseRaw = { ...raw, placementClaims: { ...cd, approach: cd.approach.filter(a => a.added_in !== 'v5' && a.added_in !== 'v8'), documented_absent: [] } };            // the v4 state of the layer: everything but the v5 records (and the v8 records of ledger E)
  const L3 = createRealHistory({ raw: baseRaw, T });
  const cur = J(CURATION), review = J(REVIEW), scan = J(SCAN), led = loadLedgers(), disp = new Map(raw.claimDispositions.rows.map(r => [r[0], r]));
  const gaz = new Gazetteer(raw.gazetteer), by = new Map(L.units.map(u => [u.id, u])), box = { lng0: T.meta.lng0, lng1: T.meta.lng1, lat0: T.meta.lat0, lat1: T.meta.lat1 };
  const chain = id => { const o = []; for (let u = by.get(id); u; u = u.parent ? by.get(u.parent) : null) o.push(u.id); return o; };
  const open = L.units.filter(u => !u.children.length && u.render.status === 'not_drawn'), openIds = new Set(open.map(u => u.id));
  const roadLines = raw.gazetteer.places.filter(p => p.kind === 'line' && p.line);
  const roadNames = roadLines.flatMap(p => [p.name, ...(p.aliases || [])]).map(norm).filter(n => n.length > 4);
  const namesRoad = text => ROAD_WORD.test(text) || roadNames.some(n => (' ' + norm(text) + ' ').includes(' ' + n + ' '));
  // the open-gap leaves under each unit (a claim for a unit covers them)
  const under = new Map(); for (const u of open) for (const x of chain(u.id)) { if (!under.has(x)) under.set(x, []); under.get(x).push(u.id); }
  const scanBy = new Map(scan.rows.map(r => [r.claim, r]));
  // ---- the claims examined
  const rows = [], afterBattle = { count: 0 }, silent = { count: 0 }, errors = [];
  const useOf = new Map(); for (const u of L.units) if (u.drawn && u.approach) useOf.set(u.approach.id, (useOf.get(u.approach.id) || 0) + 1);
  const byGz = new Map(raw.gazetteer.places.map(p => [p.id, p])), curated = new Set([...cur.approach.map(e => e.claim), ...Object.keys(cur.approach_exclude)]);
  for (const c of led.claims) {
    const isPos = isPositionRoadCandidate(c, gaz, byGz) && curated.has(c.claim_id);
    if (unusable(c) || !(['arrival_road', 'march', 'movement'].includes(c.kind) || isPos) || !under.has(c.unit_id)) continue;
    if ((c.when.date || '') > LAST_DATE) { afterBattle.count++; continue; }
    const s = c.source || {}, p = c.place || {}, fields = [['quote', s.quote], ['place', p.printed], ['road field', bracketed(p.direction_or_road) ? null : p.direction_or_road]], gloss = bracketed(p.direction_or_road) ? p.direction_or_road : null;
    const hit = fields.find(([, t]) => t && namesRoad(t)), inSummary = c.activity && namesRoad(c.activity) ? c.activity : null, inRecord = scanBy.get(c.claim_id);
    if (!hit && !gloss && !inSummary && !inRecord) { silent.count++; continue; }
    const d = disp.get(c.claim_id) || [], row = { claim: c.claim_id, ledger: c.ledger, unit: c.unit_id, kind: c.kind, date: c.when.date, report: s.report_id || s.record_id, page: s.printed_page, tier: c.tier, leaves: under.get(c.unit_id).length,
      where: hit ? hit[0] : gloss ? 'compiler gloss (bracketed)' : inSummary ? 'compiler summary' : 'report text around the quote', printed: hit ? hit[1] : gloss ? gloss : inSummary ? inSummary : inRecord.snippets[0], code: null, reason: '' };
    row.printed = String(row.printed).replace(/\s+/g, ' ').slice(0, 150);
    if (/^used_approach/.test(d[4])) { const ap = d[7] || (cd.approach.find(a => a.claims.includes(c.claim_id)) || {}).id; row.code = 'used'; row.entry = ap; row.reason = `used: ${ap}`; }
    else if (cur.approach_exclude[c.claim_id]) { const why = cur.approach_exclude[c.claim_id], f = FROM_CURATION.find(([re]) => re.test(why)); row.code = f ? f[1] : 'other_reviewed'; if (row.code === 'position_not_approach' && ['position', 'night_position'].includes(c.kind)) row.code = 'position_in_field'; row.reason = why; }
    else if (review.verdicts[c.claim_id]) { const v = review.verdicts[c.claim_id]; row.code = v; row.reason = (review.notes || {})[c.claim_id] || review.codes[v] || ''; }
    else if (hit) { errors.push(`${c.claim_id} (${c.kind}): names a road in its printed ${hit[0]} and is in no list of the curation table and has no verdict in data/approach-review.json`); row.code = 'unreviewed'; }
    else if (gloss || inSummary) { row.code = 'road_not_printed'; row.reason = CODES.find(x => x[0] === 'road_not_printed')[1]; }
    else { row.code = 'record_text_only'; row.reason = review.codes.record_text_only; }
    rows.push(row);
  }
  rows.sort((a, b) => a.unit.localeCompare(b.unit) || a.date.localeCompare(b.date) || a.claim.localeCompare(b.claim));
  // ---- the reason of each open-gap leaf: the first code (in the order of specificity) found on its line of command
  const rank = code => { const i = CODE_ORDER.indexOf(code); return i < 0 ? 99 : i; };
  const reasonOf = u => {
    const plan = L.plans.get(u.id), ch = chain(u.id);
    if (!plan) return { code: 'no_figure', why: 'a headquarters, staff or grouping entry: the record gives it no figure' };
    if (plan.approach && /does not cross/.test(plan.reason)) return { code: 'road_outside_ground', why: plan.reason };
    const mine = rows.filter(r => ch.includes(r.unit) && r.code !== 'used').sort((a, b) => rank(a.code) - rank(b.code));
    return mine.length ? { code: mine[0].code, why: mine[0].code } : { code: 'none', why: '' };
  };
  const leafReason = new Map(open.map(u => [u.id, reasonOf(u)]));
  const hasDay = hasDayPos;
  const reasonCounts = tally(open, u => leafReason.get(u.id).code), leafReasonDay = tally(open.filter(hasDay), u => leafReason.get(u.id).code);
  // ---- the formations (depth 2 of the line of command: a division, a brigade, an artillery brigade or a group)
  const groupOf = u => { const ch = chain(u.id).reverse(); return ch[Math.min(LEVEL_DEPTH_GROUP, ch.length - 1)]; };
  const groups = new Map(); for (const u of open) { const g = groupOf(u); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(u); }
  const formations = [...groups].map(([g, us]) => ({ id: g, name: by.get(g).name, level: by.get(g).level, army: by.get(g).army, corps: chain(g).reverse()[1] || g, leaves: us.length, day: us.filter(hasDay).length, reasons: tally(us, u => leafReason.get(u.id).code),
    claims: rows.filter(r => under.get(r.unit) && under.get(r.unit).some(x => us.some(u => u.id === x))).length })).sort((a, b) => a.corps.localeCompare(b.corps) || a.id.localeCompare(b.id));
  // ---- the roads of the gazetteer
  const roads = roadLines.map(p => { const cs = boxCrossings(p.line, box).length > 0; const aps = (cd.approach || []).concat(raw.placement.approach).filter(a => gaz.resolve(a.road) && gaz.resolve(a.road).id === p.id);
    const drawnBy = L.units.filter(u => u.drawn && u.approach && aps.some(a => a.id === u.approach.id)).length; return { id: p.id, name: p.name, crosses_ground: cs, approaches: aps.map(a => a.id), drawn_units: drawnBy }; });
  const before = snapshot(L3), after = snapshot(L);
  const v8ids = new Set((cd.approach || []).filter(a => a.added_in === 'v8').map(a => a.id)), newlyDrawn = L.units.filter(u => u.drawn && !L3.units.find(x => x.id === u.id).drawn).map(u => ({ id: u.id, v8: v8ids.has(u.approach.id), approach: u.approach.id, tier: u.approach.tier, status: L.plans.get(u.id).status, stops: L.plans.get(u.id).stops.length, days: (L.plans.get(u.id).days || []).filter(d => d.feasible).length }));
  const added = (cd.approach || []).filter(a => a.added_in === 'v5').map(a => ({ id: a.id, unit: a.unit, road: a.road, claim: a.claim, kind: cd.claims[a.claim].kind, concordance: a.concordance ? a.concordance.id + ' (' + a.concordance.tier + ')' : '-', phrase: a.phrase, report: cd.claims[a.claim].report, page: cd.claims[a.claim].page, drawn: useOf.get(a.id) || 0, added_in: a.added_in }));
  const addedV8 = (cd.approach || []).filter(a => a.added_in === 'v8').map(a => ({ id: a.id, unit: a.unit, road: a.road, claim: a.claim, kind: cd.claims[a.claim].kind, phrase: a.phrase, report: cd.claims[a.claim].report, volume: cd.claims[a.claim].work || null, page: cd.claims[a.claim].page, drawn: useOf.get(a.id) || 0 }));
  const forOwner = review.for_owner.map(o => { const c = led.claims.find(x => x.claim_id === o.claim); return { ...o, unit: c ? c.unit_id : null, kind: c ? c.kind : null, quote: c ? (c.source.quote || '') : '', leaves: c && under.get(c.unit_id) ? under.get(c.unit_id).length : 0 }; });
  const candidates = led.claims.filter(c => !unusable(c) && isApproachCandidate(c)).length, noClock = raw.claimDispositions.rows.filter(r => r[5] === 'no_printed_time').length;
  const v6 = rawIn.siblingApproach ? siblingAudit({ raw: rawIn, T, L5: L, A5: { rows, leafReason: [...leafReason].map(([id, r]) => ({ id, ...r })), openWithDay: open.filter(hasDay).length } }) : null;
  return { v6, candidates, noClock, before, after, added, addedV8, newlyDrawn, rows, afterBattle: afterBattle.count, silent: silent.count, scanned: scan.rows.length, formations, reasonCounts, leafReasonDay, leafReason: [...leafReason].map(([id, r]) => ({ id, ...r })), roads, forOwner, errors, openLeaves: open.length, openWithDay: open.filter(hasDay).length, codes: CODES, reviewCodes: review.codes };
}


// ---- v6 (DEC-015): the modelled roads of approach taken from the sibling formations of the corps (data/sibling-approach.json, rule tools/sibling-rule.mjs)
const BASIS = [['own', 'a road printed for the unit itself or for a formation below the corps (a PDF ledger row or a re-read claim)'], ['corps', 'a road printed only for the corps, inherited down the line of command'], ['modelled', 'a MODELLED road taken from the sibling formations of the corps (DEC-015)']];
export function siblingAudit({ raw, T, L5, A5 }) {
  const doc = raw.siblingApproach; if (!doc) return null;
  const L6 = createRealHistory({ raw, T }), by = new Map(L6.units.map(u => [u.id, u])), by5 = new Map(L5.units.map(u => [u.id, u]));
  const basisOf = u => { if (!u.drawn) return null; if (u.approach.modelled) return 'modelled'; return u.approach.owner_level === 'corps' || u.approach.owner_level === 'army' ? 'corps' : 'own'; };
  const tierRows = L => { const drawn = L.units.filter(u => u.drawn), o = { total: L.units.length, drawn: drawn.length, figures: drawn.reduce((a, u) => a + u.strength.drawn, 0), tier: { documented: 0, inferred: 0, 'plausible-procedural': 0 }, basis: { own: 0, corps: 0, modelled: 0 }, basisFigures: { own: 0, corps: 0, modelled: 0 }, basisTier: {} };
    for (const u of drawn) { o.tier[u.approach.tier]++; const b = basisOf(u); o.basis[b]++; o.basisFigures[b] += u.strength.drawn; const k = b + '|' + u.approach.tier; o.basisTier[k] = (o.basisTier[k] || 0) + 1; } return o; };
  const b5 = tierRows(L5), b6 = tierRows(L6);
  const gate = (L, id) => { const e = L.model.effective(id, {}, { civilDawn: m => m + 4 * 60 + 3 }); return e ? e.earliest : null; };
  const gatesMoved = L6.units.filter(u => u.drawn && by5.get(u.id).drawn && gate(L6, u.id) !== gate(L5, u.id)).length + L6.units.filter(u => !u.children.length && gate(L6, u.id) !== gate(L5, u.id)).length;
  const events = L6.both({}).events, arrivals = new Map(L6.both({}).arrivals.map(a => [a.unit, a]));
  const newly = L6.units.filter(u => u.drawn && !by5.get(u.id).drawn), newlyIds = new Set(newly.map(u => u.id));
  const early = events.filter(e => e.type === 'enter' && newlyIds.has(e.unit) && e.t < arrivals.get(e.unit).earliest - 1e-9).length;
  const rep5 = L5.report({}), rep6 = L6.report({});
  const records = doc.approach.map(a => { const us = L6.units.filter(u => u.drawn && u.approach.id === a.id), plans = us.map(u => L6.plans.get(u.id));
    return { id: a.id, unit: a.unit, name: by.get(a.unit).name, formation: a.formation, formation_name: by.get(a.formation).name, road: a.road, siblings: a.siblings.map(x => ({ ap: x.ap, unit: x.unit, unit_name: x.unit_name, source: x.source, claim: x.claim || null, report: x.report || null, page: x.page ?? null, row: x.row || null, phrase: x.phrase, tier: x.tier })), leaves: us.length, figures: us.reduce((n, u) => n + u.strength.drawn, 0),
      placed: plans.filter(p => p.status === 'moving').length, edge_only: plans.filter(p => p.status === 'edge_only').length, day_stops: rep6.day_stops.filter(d => d.applied && us.some(u => u.id === d.unit)).length, reviewed: a.reviewed.length }; });
  // the reason of every leaf that was an open gap in v5, and what became of it
  const open5 = L5.units.filter(u => !u.children.length && u.render.status === 'not_drawn'), hasDay = u => !!(u.day_positions && u.day_positions.days.some(d => d.status === 'single'));
  const finalOf = u => { const v = doc.leaves[u.id]; return v.status === 'drawn' ? 'drawn' : v.code; };
  const reasons = {}; for (const u of open5) { const k = finalOf(u); (reasons[k] ||= { leaves: 0, day: 0 }); reasons[k].leaves++; if (hasDay(by5.get(u.id))) reasons[k].day++; }
  const groupOf = u => { const ch = chainOf(by5, u.id).reverse(); return ch[Math.min(LEVEL_DEPTH_GROUP, ch.length - 1)]; };
  const groups = new Map(); for (const u of open5) { const g = groupOf(u); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(u); }
  const formations = [...groups].map(([g, us]) => ({ id: g, name: by5.get(g).name, corps: chainOf(by5, g).reverse()[1] || g, leaves: us.length, drawn: us.filter(u => finalOf(u) === 'drawn').length, day: us.filter(u => hasDay(u)).length, reasons: tally(us.filter(u => finalOf(u) !== 'drawn'), finalOf) })).sort((a, b) => a.corps.localeCompare(b.corps) || a.id.localeCompare(b.id));
  const left = L6.units.filter(u => !u.children.length && u.render.status === 'not_drawn');
  const shares = { total: L6.units.length, aggregate: L6.counts.aggregate, not_on_field: L6.counts.not_on_field, open_gap: L6.counts.not_drawn, no_figure: left.filter(u => doc.leaves[u.id] && doc.leaves[u.id].code === 'no_figure').length };
  return { doc, before: { ...snapshot(L5), ...b5 }, after: { ...snapshot(L6), ...b6 }, records, reasons, formations, gatesMoved, early, shares, newly: newly.map(u => ({ id: u.id, approach: u.approach.id, status: L6.plans.get(u.id).status, stops: L6.plans.get(u.id).stops.length, days: (L6.plans.get(u.id).days || []).filter(d => d.feasible).length })),
    open_leaves: left.length, leaf_rows: open5.map(u => ({ id: u.id, v5: (A5.leafReason.find(r => r.id === u.id) || {}).code, ...doc.leaves[u.id], day: hasDay(by5.get(u.id)) })), offsets: { before: rep5.offsets.length, after: rep6.offsets.length }, defects: rep6.defects.length };
}

const nf = n => Number(n).toLocaleString('en-US'), esc = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const codeText = (A, code) => (A.codes.find(c => c[0] === code) || [])[1] || A.reviewCodes[code] || ({ no_figure: 'a headquarters, staff or grouping entry: the record gives it no figure', used: 'used', unreviewed: 'not reviewed' })[code] || code;

// the summary that goes into HISTORY-LAYER-NOTES.md
function approachNotesV5(A) {
  const P = [], b = A.before, a = A.after, d = (x, y) => (y - x >= 0 ? '+' : '') + nf(y - x);
  P.push('## Roads of approach (history layer v5: position statements and the road-name concordance; the state before the sibling records of v6)', '');
  P.push(`An approach needs a road, not a clock: its time is the unit's arrival gate (never moved, Q04). v4 (DEC-012) read the roads that arrival_road and march claims print, with or without a clock. v5 (DEC-013, DEC-014) adds two things: (1) position and night_position claims whose printed words say that a corps or formation was ON a road before it reached the field are admitted as road evidence (approach tier inferred; ${nf(A.added.filter(x => x.kind !== 'arrival_road' && x.kind !== 'march').length)} records), and (2) period road names that the gazetteer does not hold (the Heidlersburg road, the Middletown road, the Gettysburg road of Kershaw's march) are resolved by the road-name concordance (\`library/ROAD-CONCORDANCE.md\`, \`data/road-concordance.json\`) from Warren 1868-69, Bachelder 1876, Hopkins 1858 and the Official Records, only to a road the gazetteer already holds and with a stated tier (${nf(A.added.filter(x => x.concordance !== '-').length)} records); names the sources do not settle stay open. Method, tables and the claims that came closest: \`APPROACH-AUDIT.md\` (generated by \`tools/approach-audit.mjs\`); the choices: DEC-012, DEC-013, DEC-014.`, '');
  P.push('| | v4 | v5 with the claims of ledger E (v8) | change |', '|---|---|---|---|');
  for (const [k, t] of [['drawn', 'units drawn'], ['moving', 'placed (a road and a place)'], ['edge_only', 'at the arrival edge only'], ['open_gap', 'open gap (leaf units, not drawn)'], ['figures', 'figures drawn (one soldier per figure)'], ['approach_records', 'approach records'], ['inferred', 'drawn units, approach tier inferred'], ['plausible_procedural', 'drawn units, approach tier plausible-procedural'], ['offsets', 'ledger-vs-edge offsets (card note, gate not moved)'], ['defects', 'defects (a timed place reached late)'], ['day_stops_applied', 'troop-map day stops applied']])
    P.push(`| ${t} | ${nf(b[k])} | ${nf(a[k])} | ${d(b[k], a[k])} |`);
  P.push('', `Approach records added in v5: ${A.added.length ? A.added.map(x => `${x.id} (${x.road} for \`${x.unit}\`, claim \`${x.claim}\` of kind ${x.kind}, ${x.report} p. ${x.page}, “${esc(x.phrase)}”${x.concordance !== '-' ? ', concordance ' + x.concordance : ''}, ${x.drawn} unit${x.drawn === 1 ? '' : 's'} drawn)`).join('; ') : 'none'}. Units drawn by them: ${nf(A.newlyDrawn.filter(x => !x.v8).length)}. Approach records added in v8 (ledger E, the state regimental volumes; DEC-023E): ${A.addedV8.length ? A.addedV8.map(x => `${x.id} (${x.road} for \`${x.unit}\`, claim \`${x.claim}\` of kind ${x.kind}, ${x.volume || x.report} section ${x.report}, p. ${x.page}, “${esc(x.phrase)}”, ${x.drawn} unit${x.drawn === 1 ? '' : 's'} drawn)`).join('; ') : 'none'}. Units drawn by them: ${nf(A.newlyDrawn.filter(x => x.v8).length)}. Together: ${A.newlyDrawn.length} units drawn that v4 did not draw (${nf(A.newlyDrawn.filter(x => x.status === 'moving').length)} placed, ${A.newlyDrawn.filter(x => x.status === 'edge_only').length} at the edge only).`, '');
  P.push('Still undrawn, by the most specific reason found on the line of command of each open-gap leaf unit (the table by formation, the claims and the roads are in `APPROACH-AUDIT.md`):', '', '| reason | leaf units | of them with a single-label day position |', '|---|---|---|');
  for (const [code, n] of Object.entries(A.reasonCounts).sort((x, y) => y[1] - x[1])) P.push(`| ${esc(codeText(A, code))} | ${n} | ${A.leafReasonDay[code] || 0} |`);
  P.push('');
  return P;
}

function auditMarkdownV5(A) {
  const P = [], b = A.before, a = A.after;
  P.push('# Roads of approach: audit (history layer v4 to v5)', '');
  P.push('Written by `node docs/battle-theatre/app/tools/approach-audit.mjs`; `tests/claims.test.mjs` fails if this file is stale. Every number and row below is computed from the layer, the ledgers (`history/positions/`), the builder\'s dispositions, the curation table (`data/claim-curation.json`), the hand-reviewed verdicts (`data/approach-review.json`) and the record scan (`data/approach-record-scan.json`).', '');
  P.push('## What was asked and what was found', '');
  P.push(`The question (brief road-concordance): 108 of the ${nf(b.open_gap)} open-gap leaf units of v4 were open because their reports name a road that the repository does not hold (the Heidlersburg, Middletown and Fairfield roads, “the Gettysburg road”, the road from Scotland, the route by Horner's Mill, railroads), and 37 Second Corps leaves would be drawn by admitting position claims that print a road (DEC-013 a). v5 answers both, with the evidence in \`library/ROAD-CONCORDANCE.md\`: ${nf(A.after.drawn - A.before.drawn)} units are drawn that were not (v4: ${nf(A.before.drawn)} drawn, ${nf(A.before.open_gap)} open; v5: ${nf(A.after.drawn)} drawn, ${nf(A.openLeaves)} open). **Position statements.** A position or night_position claim whose printed words put a corps or formation ON a road before it came to the field is a road of approach of tier inferred (the Second Corps on the road between Taneytown and Gettysburg, the Artillery Reserve on the Taneytown road, the Second Cavalry Division on the Hanover road 3 miles out). Every other position claim that prints a road (${nf(A.rows.filter(r => !['arrival_road', 'march', 'movement'].includes(r.kind)).length)} on open lines) says where a line, a battery, a camp or a headquarters stood inside the field, or is the road of another place, and is not used; each has its reason below. **Period names.** Three names are resolved to a road the gazetteer holds, each with an argument and rejected alternatives and none with a period map that prints the name (tier inferred): the Heidlersburg road is the Harrisburg Road, the Middletown road is the Carlisle Road, and Kershaw's “Gettysburg road” from Fayetteville is the Chambersburg Pike for that passage only. The road from Scotland, the route by Horner's Mill, the Fairfield road and the Gettysburg road of other passages stay unresolved, with the reason in the concordance. No road was traced and no road was aliased by guess.`, '');
  P.push('The rule used for a road of approach (DEC-009, DEC-012, extended by DEC-013 a and DEC-014): the road is printed in the claim\'s verified quote, in its printed place or road words, or in the cited OR record as confirmed by `tools/verify_claim_phrases.py` (a compiler\'s bracketed gloss is never evidence); it is a line of the gazetteer that crosses the loaded ground, or a period name that a RESOLVED entry of the concordance covering this claim identifies with one; the claim says the unit marched, moved, arrived or (kind position) stood ON the road before it came to the field (not where it stood, formed, camped or crossed inside the field, and not the road of another place); no other report of the same formation prints another road (the reports of a unit that disagree with the formation above are listed in `approach_block` and the unit takes no road). A road named only for a corps applies to the formations under it by inheritance and a nearer printed road overrides it. The time is the unit\'s gate; the entry is where the road crosses the edge of the loaded ground; the order in the column is the roster order (plausible-procedural, EG-0005).', '');
  P.push('## Before and after', '');
  P.push('| | v4 | v5 with the claims of ledger E (v8) | change |', '|---|---|---|---|');
  for (const [k, t] of [['drawn', 'units drawn'], ['moving', 'placed'], ['edge_only', 'at the arrival edge only'], ['open_gap', 'open gap (leaf units)'], ['figures', 'figures drawn'], ['approach_records', 'approach records'], ['inferred', 'drawn units, approach tier inferred'], ['plausible_procedural', 'drawn units, approach tier plausible-procedural'], ['offsets', 'ledger-vs-edge offsets'], ['defects', 'defects'], ['day_stops_applied', 'troop-map day stops applied']])
    P.push(`| ${t} | ${nf(b[k])} | ${nf(a[k])} | ${(a[k] - b[k] >= 0 ? '+' : '') + nf(a[k] - b[k])} |`);
  P.push('', 'Approach records added in v5:', '', '| approach | road | printed for | claim (kind) | report, page | printed words | concordance | units drawn |', '|---|---|---|---|---|---|---|---|');
  for (const x of A.added) P.push(`| ${x.id} | ${x.road} | \`${x.unit}\` | \`${x.claim}\` (${x.kind}) | ${x.report}, p. ${x.page} | “${esc(x.phrase)}” | ${x.concordance} | ${x.drawn} |`);
  P.push('', 'Approach records added in v8 (ledger E, the state regimental volumes; DEC-023E):', '', '| approach | road | printed for | claim (kind) | volume, section, page | printed words | units drawn |', '|---|---|---|---|---|---|---|');
  for (const x of A.addedV8) P.push(`| ${x.id} | ${x.road} | \`${x.unit}\` | \`${x.claim}\` (${x.kind}) | ${esc(x.volume || '')}, ${x.report}, p. ${x.page} | “${esc(x.phrase)}” | ${x.drawn} |`);
  P.push('', `Units drawn for the first time (${A.newlyDrawn.length}; ${A.newlyDrawn.filter(x => x.v8).length} of them by the v8 records): ${A.newlyDrawn.map(x => `\`${x.id}\` (${x.approach}, ${x.tier})`).join(', ')}.`, '');
  P.push('## Still undrawn: by reason', '');
  P.push('The reason of a leaf unit is the most specific reason found on its line of command (the order of the table is the order of specificity).', '', '| reason | leaf units | with a single-label day position |', '|---|---|---|');
  const order = [...CODE_ORDER, 'no_figure']; for (const code of order) if (A.reasonCounts[code]) P.push(`| ${esc(codeText(A, code))} | ${A.reasonCounts[code]} | ${A.leafReasonDay[code] || 0} |`);
  P.push('', '## Still undrawn: by formation', '', '| formation | name | open-gap leaf units | with a day position | reasons (leaf units) | claims examined |', '|---|---|---|---|---|---|');
  for (const f of A.formations) P.push(`| \`${f.id}\` | ${esc(f.name)} | ${f.leaves} | ${f.day} | ${Object.entries(f.reasons).sort((x, y) => rank2(x[0]) - rank2(y[0])).map(([k, v]) => `${k} ${v}`).join(', ')} | ${f.claims} |`);
  P.push('', '## The reasons, in words', '', ...[...CODE_ORDER, 'no_figure', 'used'].map(c => `* \`${c}\`: ${codeText(A, c)}`), '');
  P.push('## The claims examined', '', `${nf(A.rows.length)} usable claims dated 3 July 1863 or earlier belong to an open-gap leaf unit or a formation above one and name a road (in their printed words, the compiler’s summary, or the record around the quote): claims of kind arrival_road, march or movement, and, since v5, the position and night_position claims that print a road and were reviewed for DEC-013 a. ${nf(A.silent)} more name no road anywhere; ${nf(A.afterBattle)} are dated 4 July or later (departures, not approaches). Columns: the unit the claim names, how many open-gap leaf units are under it, the kind, the date, the report and printed page, where the road words stand, the words, the reason.`);
  const rowsPrinted = A.rows.filter(r => r.code !== 'record_text_only'), recordOnly = A.rows.filter(r => r.code === 'record_text_only');
  P.push('| claim | unit | open leaves | kind | date | report, page | road words in | words | reason |', '|---|---|---|---|---|---|---|---|---|');
  for (const r of rowsPrinted) P.push(`| \`${r.claim}\` | \`${r.unit}\` | ${r.leaves} | ${r.kind} | ${r.date.slice(5)} | ${r.report}, p. ${r.page} | ${r.where} | “${esc(r.printed)}” | **${r.code}**${r.code === 'used' ? ' ' + r.entry : ''}: ${esc(r.reason).slice(0, 240)} |`);
  P.push('', `Claims whose road word stands only in the report text around the quote (${recordOnly.length}; code \`record_text_only\`: ${esc(A.reviewCodes.record_text_only)}). The sentences are in \`data/approach-record-scan.json\`. By unit:`, '');
  const ro = {}; for (const r of recordOnly) (ro[r.unit] ||= []).push(r.claim); P.push(Object.entries(ro).map(([u, cs]) => `\`${u}\` (${cs.map(c => '`' + c + '`').join(', ')})`).join('; '), '');
  P.push('## Roads of the gazetteer', '', 'Every line of the gazetteer, whether it crosses the loaded ground (an entry exists only where it does) and which approaches use it.', '', '| road | crosses the loaded ground | approaches | units drawn by them |', '|---|---|---|---|');
  for (const r of A.roads) P.push(`| ${r.name} (${r.id}) | ${r.crosses_ground ? 'yes' : 'no'} | ${r.approaches.join(', ') || '-'} | ${r.drawn_units} |`);
  P.push('', '## The Confederate corps (ledger D)', '');
  for (const corps of ['cs-1c', 'cs-2c', 'cs-3c', 'cs-cav-div']) {
    const fs_ = A.formations.filter(f => f.corps === corps || f.id === corps), rs = A.rows.filter(r => r.ledger === 'D' && (r.unit === corps || r.unit.startsWith(corps + '-')) && r.code !== 'record_text_only');
    P.push(`* \`${corps}\`: ${fs_.reduce((a2, f) => a2 + f.leaves, 0)} open-gap leaf units in ${fs_.length} formations; ledger D claims examined for it: ${rs.length}` + (rs.length ? ` (${Object.entries(tally(rs, r => r.code)).map(([k, v]) => `${k} ${v}`).join(', ')}).` : '.'));
  }
  P.push('', `Reading of the table (written by hand from the rows above; \`tests/claims.test.mjs\` checks that the approach records it names exist). **Second Corps.** Early’s division is drawn by the Heidlersburg road (AP-36 to AP-38, the concordance RC-01: the Harrisburg Road, tier inferred): all of it but Jones’ battalion, whose own report (Brown, the York road) disagrees with Early’s and which therefore takes no road from the division (\`approach_block\`, reason reports_disagree). Rodes’ division and Carter’s battalion are drawn by the Middletown road (AP-39, AP-40, RC-02: the Carlisle Road, tier inferred). Johnson’s division stays open: the road from Scotland is not settled by any period map in the repository (RC-05) and the Gettysburg and York railroad is a move inside the field (RC-06). **First Corps.** Kershaw’s brigade is drawn by its own march from Fayetteville (AP-41, RC-03: the Chambersburg Pike for that passage only); the other brigades of McLaws’ division, Hood’s and Pickett’s divisions and the reserve artillery print no road (a direction, a town, “the road” or the road of another place: the Carlisle road of Chambersburg). **Union.** The Second Corps (AP-33), the Artillery Reserve (AP-34) and the Second Cavalry Division (AP-35) are drawn by the position statements that put them on the Taneytown and Hanover roads before the field; the Eleventh Corps (the route by Horner’s Mill, RC-07), the Fifth Corps and the First and Third Cavalry Divisions print no approach, and the Third Corps’ Second Division keeps AP-07 (the Black Horse Tavern road, which does not cross the loaded ground). The Third Corps (Confederate) is unchanged from v4: AP-31 and AP-32 and the divisions’ own records (AP-14 to AP-18) leave no open leaf. Cashtown, Heidlersburg, Hunterstown, Fayetteville, Scotland and the other towns are places, not roads; no road was traced from a map and none was aliased by guess.`, '');
  P.push('## Claims that came closest and were not used (for the Decision Log)', '', '| claim | unit | kind | open-gap leaf units under it | why not used |', '|---|---|---|---|---|');
  for (const o of A.forOwner) P.push(`| \`${o.claim}\` | \`${o.unit}\` | ${o.kind} | ${o.leaves} | ${esc(o.why)} |`);
  P.push('');
  if (A.errors.length) P.push('## Unreviewed (the build fails while this list is not empty)', '', ...A.errors.map(e => '* ' + e), '');
  return P.join('\n') + '\n';
}

const pct = (a, b) => (b ? (100 * a / b).toFixed(1) : '0.0') + '%';
const sibText = (A, code) => (SIBLING_CODES.find(c => c[0] === code) || [])[1] || codeText(A, code);
const BASIS_TEXT = { own: 'a road printed for the unit itself or for a formation below the corps (a PDF ledger row or a re-read claim of the Official Records)', corps: 'a road printed only for the corps, inherited down the line of command', modelled: 'a MODELLED road taken from the sibling formations of the corps (DEC-015)' };
const REASON_ORDER = ['road_outside_ground', 'road_not_resolvable', 'route_not_a_road', 'reports_disagree', 'siblings_disagree', 'no_sibling_road', 'sibling_road_no_day_position', 'cavalry_own_road_only', 'no_figure'];
// the tables shared by the audit and the notes
function v6Tables(A, P) {
  const v = A.v6, b = v.before, a = v.after, d = (x, y) => (y - x >= 0 ? '+' : '') + nf(y - x);
  P.push('| | v5 | v6 | change |', '|---|---|---|---|');
  for (const [k, t] of [['drawn', 'units drawn'], ['moving', 'placed (a road and a place)'], ['edge_only', 'at the arrival edge only'], ['open_gap', 'open gap (leaf units, not drawn)'], ['figures', 'figures drawn (one soldier per figure)'], ['approach_records', 'approach records'], ['inferred', 'drawn units, approach tier inferred'], ['plausible_procedural', 'drawn units, approach tier plausible-procedural'], ['offsets', 'ledger-vs-edge offsets (card note, gate not moved)'], ['defects', 'defects (a timed place reached late)'], ['day_stops_applied', 'troop-map day stops applied']])
    P.push(`| ${t} | ${nf(b[k])} | ${nf(a[k])} | ${d(b[k], a[k])} |`);
  P.push(`| gates moved (Q04) | | ${v.gatesMoved} | |`, `| new units entering before their gate | | ${v.early} | |`, '');
  P.push(`**How much of the picture rests on which approach.** Of the ${nf(a.total)} units of the roster, ${nf(a.drawn)} are drawn (${pct(a.drawn, a.total)}); the other ${nf(a.total - a.drawn)} are ${nf(v.shares.aggregate)} formations above the regiments (they carry the printed figures), ${nf(v.shares.not_on_field)} listed as never or only partly on the field, and ${nf(v.shares.open_gap)} leaf units that are open gaps (${nf(v.shares.no_figure)} of them headquarters or grouping entries with no figure). No approach is tier documented: the road of every approach is a gazetteer entry, which is inferred, so the best tier is inferred.`, '');
  P.push('| basis of the approach | tier | units | share of the 726 | share of the units drawn | figures | share of the figures drawn |', '|---|---|---|---|---|---|---|');
  P.push(`| documented | documented | 0 | 0.0% | 0.0% | 0 | 0.0% |`);
  for (const [k] of BASIS) { const tier = k === 'own' ? 'inferred' : 'plausible-procedural'; P.push(`| ${BASIS_TEXT[k]} | ${tier} | ${nf(a.basis[k])} | ${pct(a.basis[k], a.total)} | ${pct(a.basis[k], a.drawn)} | ${nf(a.basisFigures[k])} | ${pct(a.basisFigures[k], a.figures)} |`); }
  P.push(`| **all drawn units** | | ${nf(a.drawn)} | ${pct(a.drawn, a.total)} | 100.0% | ${nf(a.figures)} | 100.0% |`, '');
  P.push(`By tier of the approach: documented ${nf(a.tier.documented)} (${pct(a.tier.documented, a.total)} of the 726), inferred ${nf(a.tier.inferred)} (${pct(a.tier.inferred, a.total)}), plausible-procedural ${nf(a.tier['plausible-procedural'])} (${pct(a.tier['plausible-procedural'], a.total)}; ${nf(a.basis.corps)} of them inherit a corps-level road and ${nf(a.basis.modelled)} rest on a modelled road). At v5: inferred ${nf(b.tier.inferred)} (${pct(b.tier.inferred, b.total)}), plausible-procedural ${nf(b.tier['plausible-procedural'])} (${pct(b.tier['plausible-procedural'], b.total)}). Every drawn unit is plausible-procedural as a unit (its slot, formation and strength share are modelled); the tiers here are those of its road of approach. The position on each day is the troop-map position, documented for the day (DEC-010), for modelled units as for the others.`, '');
}
function v6Records(A, P) {
  const v = A.v6;
  P.push('| record | attached to | corps | road | documented siblings it rests on | leaf units drawn | figures | placed | day stops applied | claims read |', '|---|---|---|---|---|---|---|---|---|---|');
  for (const r of v.records) P.push(`| ${r.id} | \`${r.unit}\` | \`${r.formation}\` | ${r.road} | ${r.siblings.map(s => `${s.ap} (\`${s.unit}\`, ${s.source === 'claim' ? `${s.report} p. ${s.page}, \`${s.claim}\`` : `PDF row \`${s.row}\``}: “${esc(s.phrase)}”)`).join('; ')} | ${r.leaves} | ${nf(r.figures)} | ${r.placed} | ${r.day_stops} | ${r.reviewed} |`);
  P.push('');
}
function v6Reasons(A, P) {
  const v = A.v6;
  P.push('| what became of it | leaf units (open gaps at v5) | with a single-label day position | reason |', '|---|---|---|---|');
  P.push(`| drawn by a modelled road | ${v.reasons.drawn.leaves} | ${v.reasons.drawn.day} | the sibling-road rule (DEC-015) |`);
  for (const code of REASON_ORDER) if (v.reasons[code]) P.push(`| stays open | ${v.reasons[code].leaves} | ${v.reasons[code].day} | \`${code}\`: ${esc(sibText(A, code))} |`);
  P.push('');
}
export function approachNotes(A) {
  if (!A.v6) return approachNotesV5(A);
  const P = [], v = A.v6;
  P.push('## Roads of approach (history layer v6: modelled roads taken from the sibling formations of the corps)', '');
  P.push(`At v5, ${nf(v.before.open_gap)} leaf units had no road of approach anywhere on their line of command and were not drawn. The plan (Law clause 3, gating rule 3) asks for the strongest evidence-based reconstruction, registered, marked in the product and escalated, not for a hole. **DEC-015** draws the units that have a gate and a Bachelder day position by a MODELLED road (tier plausible-procedural, evidence gap EG-0070): the road that every documented sibling formation of the unit's corps names, taken only if no report on the unit's line of command names another road, a road the repository cannot place or a road outside the loaded ground. The rule is \`tools/sibling-rule.mjs\`; the data is \`data/sibling-approach.json\` (built by \`tools/build-sibling-approach.mjs\`, every record recomputed and refused at load unless complete and unanimous); the claim-by-claim reading is \`data/sibling-review.json\`; the audit of every number below is \`APPROACH-AUDIT.md\`.`, '');
  v6Tables(A, P);
  P.push('The records (each unit card lists the siblings with report, page and printed words, says MODELLED, and links the register entry):', '');
  v6Records(A, P);
  P.push('What became of the leaf units that were open gaps at v5:', '');
  v6Reasons(A, P);
  P.push('Earlier state, kept because the stages are described in the state they were built in:', '');
  for (const l of approachNotesV5(A)) P.push(l);
  return P;
}

export function auditMarkdown(A) {
  const old = auditMarkdownV5(A); if (!A.v6) return old;
  const v = A.v6, P = [], cnt = f => v.leaf_rows.filter(f).length;
  P.push('# Roads of approach: audit (history layer v5 to v6)', '');
  P.push('Written by `node docs/battle-theatre/app/tools/approach-audit.mjs`; `tests/claims.test.mjs` and `tests/sibling.test.mjs` fail if this file is stale. Every number and row below is computed from the layer, `data/sibling-approach.json` (built by `tools/build-sibling-approach.mjs` from the rule `tools/sibling-rule.mjs`), the hand-read classes of `data/sibling-review.json`, the ledgers (`history/positions/`) and the audit of the state before v6 (the second half of this file).', '');
  P.push('## What was asked and what was found (v6)', '');
  P.push(`The question (brief sibling-roads): ${nf(v.before.open_gap)} leaf units were open gaps at v5 because no report names a road of approach for them or any formation above them (or the road named is one the repository cannot place). Plan rule (PDF Law clause 3, gating rule 3): where the record cannot supply a datum, build the strongest evidence-based reconstruction, register it, mark it in the product and escalate it; a concealed gap is a violation, a visible modelled reconstruction is not. **The rule (DEC-015).** A unit takes the road documented for the OTHER formations of its corps only if (a) every documented sibling formation names the same gazetteer road, that road crosses the loaded ground and at least one sibling exists; (b) no report for the unit or any formation above it names a road the repository cannot place (the road from Scotland, the route by Horner's Mill, a railroad), another road of approach, or a road outside the loaded ground (Black Horse Tavern Road), and the reports do not disagree; (c) the unit has a gate and a single-label day position. Stuart's cavalry is not covered by the sibling rule at all. **The result.** ${nf(v.reasons.drawn.leaves)} units in ${nf(v.records.length)} records are drawn: ${nf(v.records.filter(r => r.formation === 'cs-1c').reduce((n, r) => n + r.leaves, 0))} of the First Corps of the Army of Northern Virginia (Chambersburg Pike, from Kershaw's report) and ${nf(v.records.filter(r => r.formation === 'us-5c').reduce((n, r) => n + r.leaves, 0))} of the Fifth Corps (Hanover Road, from the 20th Maine row and Day's division report). ${nf(v.open_leaves)} leaf units stay open, each with its reason on its card. Every drawn unit comes from its arrival gate (no gate moved), stands at its Bachelder day position as any other unit does, and its card says what is documented (the gate, the day position: sheet, label, error) and what is modelled (the road, the minute at the edge, the place in the column).`, '');
  P.push('## Before and after (v5 to v6)', '');
  v6Tables(A, P);
  P.push('## The modelled records', '');
  P.push('One record is attached at the highest formation below the corps all of whose leaf units are drawn by it or already have a nearer road. `claims read` is the number of audit claims on the lines of command of its units, each of which has a class in `data/sibling-review.json`.', '');
  v6Records(A, P);
  P.push('## Still undrawn (after v6): by reason', '');
  v6Reasons(A, P);
  P.push('## Still undrawn (after v6): by formation', '', '| formation | name | leaf units (open at v5) | drawn by a modelled road | with a day position | reasons it stays open (leaf units) |', '|---|---|---|---|---|---|');
  for (const f of v.formations) P.push(`| \`${f.id}\` | ${esc(f.name)} | ${f.leaves} | ${f.drawn} | ${f.day} | ${Object.entries(f.reasons).sort((x, y) => REASON_ORDER.indexOf(x[0]) - REASON_ORDER.indexOf(y[0])).map(([k, n]) => `${k} ${n}`).join(', ') || '-'} |`);
  P.push('', '## The reasons, in words', '', ...REASON_ORDER.map(c => `* \`${c}\`: ${sibText(A, c)}`), '');
  P.push('## Reading of the table', '');
  P.push(`Written by hand from the rows above (\`tests/sibling.test.mjs\` checks that every record it names exists). **Drawn.** The First Corps units (Hood's division, McLaws' Barksdale and Cabell, the reserve artillery, Dearing's battalion) take the Chambersburg Pike because Kershaw's report prints "a point on the Gettysburg road, some 2 miles from that place" from Fayetteville (AP-41, concordance RC-03, for that passage only); Kershaw is the one documented sibling in the corps, which is a thin basis and is said on every card (DEC-015, EG-0070). The Fifth Corps units (Barnes' division, Crawford's Pennsylvania Reserves, Martin's artillery) take the Hanover Road because the two documented siblings, the 20th Maine (AP-04, a road read from "night march from Hanover") and Day's division (AP-11, "Gettysburg and Hanover road"), agree and nothing on the line of command names another approach: the claims that name the Taneytown road or the Baltimore pike say where the divisions moved or stood on the field. **Stays open.** The Eleventh Corps (${cnt(r => r.code === 'route_not_a_road')} leaf units): Howard's own orders send the balance of the corps by "the road past Horner's Mills", which the repository cannot place (RC-07), so the sibling road of the First Division (AP-10) is not extended. The Third Corps' Second Division keeps AP-07, the Black Horse Tavern Road, which does not cross the loaded ground (${cnt(r => r.code === 'road_outside_ground')} leaf units). Johnson's division (Second Corps, ${cnt(r => r.code === 'road_not_resolvable')} leaf units): its reports name the road from Scotland and a railroad. Jones' battalion (Second Corps): the reports disagree. The Second Corps' reserve artillery, the Union cavalry's First and Third Divisions and the cavalry artillery (${cnt(r => r.code === 'siblings_disagree')} leaf units): the documented siblings of the corps name different roads (Early the Harrisburg Road, Rodes the Carlisle Road, Johnson's brigades the Chambersburg Pike; Merritt the Emmitsburg Road, Gregg the Hanover Road), so none is chosen. Semmes', Wofford's and Pickett's brigades (${cnt(r => r.code === 'sibling_road_no_day_position')} leaf units) have no single-label day position: they would only stand in a column at the edge of the ground, so they are not drawn. Stuart's cavalry (${cnt(r => r.code === 'cavalry_own_road_only')} leaf units): only earlier marches are printed and no unit has a day position. Four entries have no figure.`, '');
  { // brief rule 3: the moves after arrival, the orders and the positions inside the field were re-read; where the claims identify the arrival day and the unit has a gate and a day position, the sibling rule applies
    const R3 = [['movement_in_field', 'a move made after the unit stood on the field'], ['movement_order', 'an order printed as a movement'], ['position_not_approach', 'a position inside the field']], rows3 = v.leaf_rows.filter(r => R3.some(x => x[0] === r.v5));
    P.push('## Rule 3: moves after arrival, orders and positions inside the field', '', `At v5, ${rows3.length} leaf units were open because the only roads their reports name are where a unit moved or stood after it was on the field, or an order: ${R3.map(([c, t]) => `${rows3.filter(r => r.v5 === c).length} for ${t} (\`${c}\`)`).join(', ')}. Each claim was re-read (\`data/sibling-review.json\`, class \`in_field\` or \`order\`): the road is a place or a movement inside the field, not an approach, so it does not name another road of approach. ${nf(rows3.filter(r => r.status === 'drawn').length)} of them are drawn by the sibling rule (${Object.entries(tally(rows3.filter(r => r.status === 'drawn'), r => r.approach)).map(([ap, n]) => `${ap} \`${(v.records.find(x => x.id === ap) || {}).unit}\` ${n}`).join(', ')}); ${nf(rows3.filter(r => r.status !== 'drawn').length)} stay open: ${Object.entries(tally(rows3.filter(r => r.status !== 'drawn'), r => r.code)).map(([k, n]) => `${n} \`${k}\``).join(', ')}.`, '');
  }
  P.push('## Every leaf unit that was an open gap at v5', '');
  P.push('Grouped by what became of it.', '');
  const groups = new Map(); for (const r of v.leaf_rows) { const k = r.status === 'drawn' ? `drawn by ${r.approach}` : r.code; (groups.get(k) || groups.set(k, []).get(k)).push(r); }
  for (const [k, rs] of [...groups].sort((x, y) => (x[0].startsWith('drawn') ? 0 : 1) - (y[0].startsWith('drawn') ? 0 : 1) || x[0].localeCompare(y[0]))) P.push(`* ${k.startsWith('drawn') ? '**' + k + '**' : '`' + k + '`'} (${rs.length}): ${rs.map(r => '`' + r.id + '`').join(', ')}`);
  P.push('', '---', '', '# Earlier audit: history layer v4 to v5', '', 'Computed from the state of the layer before the sibling records (the layer built without `data/sibling-approach.json`), so its open-gap counts are those of v5.', '');
  P.push(old.split('\n').slice(1).join('\n').replace(/^## /gm, '### ').replace(/^# /gm, '## '));
  return P.join('\n') + '\n';
}
const rank2 = k => { const i = CODE_ORDER.indexOf(k); return i < 0 ? 98 : i; };

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const A = approachAudit();
  if (A.errors.length) { console.error(A.errors.join('\n')); process.exit(1); }
  fs.writeFileSync(path.join(BT, OUT_MD), auditMarkdown(A));
  console.log('APPROACH-AUDIT.md written:', A.rows.length, 'claims examined,', A.openLeaves, 'open-gap leaf units at v5,', A.newlyDrawn.length, 'drawn for the first time at v5 and v8' + (A.v6 ? `; v6: ${A.v6.reasons.drawn.leaves} drawn by a modelled road, ${A.v6.open_leaves} leaf units still open, ${A.v6.after.drawn} of ${A.v6.after.total} units drawn` : ''));
}
