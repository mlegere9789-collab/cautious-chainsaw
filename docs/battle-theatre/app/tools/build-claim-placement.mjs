// Builds app/data/placement-claims.json and app/data/claim-dispositions.json from the position ledgers (history/positions/positions_{A,C,D,E}.jsonl: A, C, D OR27 reports, E state regimental volumes; B only after
// 'RECHECK B COMPLETE' is the last line of RECHECK_B_NOTES.md) and the reviewed table data/claim-curation.json.
//   node docs/battle-theatre/app/tools/build-claim-placement.mjs              writes both files
//   node docs/battle-theatre/app/tools/build-claim-placement.mjs --candidates prints every claim that passes the mechanical tests and is not yet in the curation table
//
// The method, in order (nothing in it invents a coordinate, a time, a road or a quotation):
//   1. a claim is USED only if claim_support_verified is true, fidelity_check is passed_full_read or corrected, and its tier is documented or inferred (claim-ledger.mjs);
//   2. the curation table (written by hand, one reason per row) names the claims that become an approach road (AP), a stop (PO) or a departure (DP) and the claims that pass the
//      mechanical tests and are NOT used (with the reason). A claim that passes the tests and is in neither list stops the build;
//   3. every phrase of a row is checked: it must be literally in the claim's verified quote, in its printed place or road words, or (phrase_in 'record') in the cited OR record as
//      confirmed by tools/verify_claim_phrases.py (data/claim-phrase-verification.json); every time is checked against the claim's printed clock (or a printed named period, which
//      takes the labelled convention of placement.mjs); every place is the gazetteer place the ledger references and must be in the printed words; every road must be a gazetteer line;
//   4. two claims for the same unit at the same place at different hours within 90 minutes are a CONFLICT (so are two roads of approach): neither is placed, both are listed;
//   5. a stop that the layer cannot reach at double-quick from the unit's previous stop is dropped and recorded (the reports disagree, or the place is too coarse), until none is left;
//   6. a claim before the unit's own ledger gate is kept in the data, is not applied (Q04: the gate is never moved), and is listed in the notes.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
import { loadLedgers, unusable, digest, clockAgrees, printedPeriod, PERIOD_CLOCK, sourceOf } from './claim-ledger.mjs';
import { loadRawFromDisk, terrainMeta } from './history-report.mjs';
import { createRealHistory } from '../src/history/real.mjs';
import { Gazetteer, norm, boxCrossings } from '../src/history/gazetteer.mjs';
import { PERIODS } from '../src/history/placement.mjs';
import { isoToMin } from '../src/clock.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), BT = path.resolve(here, '../..');
const J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8'));
export const OUT_CLAIMS = 'app/data/placement-claims.json', OUT_DISP = 'app/data/claim-dispositions.json', CURATION = 'app/data/claim-curation.json', VERIFY = 'app/data/claim-phrase-verification.json';
export const STOP_KINDS = new Set(['position', 'night_position', 'engagement', 'movement', 'arrival_road', 'march']);
export const CONFLICT_MIN = 90;
const ROAD_WORD = /\b(road|pike|turnpike|railroad|lane|street)\b/i;
const words = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const printedRoad = c => { const r = c.place && c.place.direction_or_road; return r && !/\[/.test(r) ? r : null; };     // a ledger road field that is not the compiler's bracketed gloss
const fieldText = (c, f) => (f === 'quote' ? (c.source || {}).quote : f === 'place.printed' ? (c.place || {}).printed : f === 'direction_or_road' ? printedRoad(c) : null) || '';
export const PHRASE_FIELDS = ['quote', 'place.printed', 'direction_or_road', 'record'];

function timeOf(c) {
  const w = c.when || {};
  if (w.t_iso) {
    const a = clockAgrees(w.printed, w.t_iso); if (!a.ok) return { err: 'printed_clock_unconfirmed', why: a.why };
    if (w.t_iso.slice(0, 10) !== w.date) return { err: 'printed_clock_unconfirmed', why: 'the date of t_iso is not the claim date' };
    return { t: w.t_iso, t_basis: 'printed', approx: !!w.approx };
  }
  const per = printedPeriod(w.printed);
  if (per && w.date) return { t: `${w.date}T${PERIODS[per]}`, t_basis: 'convention', period: per, approx: false };
  return { err: 'no_printed_time', why: w.printed ? `“${w.printed}” is no clock and no printed period` : 'no time is printed' };
}
const gzById = gaz => new Map(gaz.data.places.map(p => [p.id, p]));

// ---- the mechanical test of a stop candidate. -> { ok, reason (code), why, place, time }
export function stopTest(c, gaz, byId, box) {
  if (!STOP_KINDS.has(c.kind)) return { ok: false, reason: 'kind_not_a_stop', why: `kind ${c.kind}` };
  const tm = timeOf(c); if (tm.err) return { ok: false, reason: tm.err, why: tm.why };
  const ref = c.place && c.place.gazetteer_ref; if (!ref) return { ok: false, reason: 'no_gazetteer_place', why: c.place && c.place.printed ? `“${c.place.printed}” has no gazetteer reference` : 'no place is printed' };
  const pl = byId.get(ref); if (!pl) return { ok: false, reason: 'no_gazetteer_place', why: `${ref} is not in the gazetteer` };
  if (pl.kind === 'line') return { ok: false, reason: 'place_is_a_road', why: `${pl.name} is a road: a stop needs a place, and the position along a road is not printed` };
  if (pl.stream || (!pl.line && pl.sigma_m > 1500)) return { ok: false, reason: 'place_too_broad', why: `${pl.name} (sigma ${pl.sigma_m} m) is too broad to stand a unit in` };
  if (box && !(pl.center.lng >= box.lng0 && pl.center.lng <= box.lng1 && pl.center.lat >= box.lat0 && pl.center.lat <= box.lat1)) return { ok: false, reason: 'place_outside_loaded_ground', why: pl.name + ' lies outside the loaded ground (6.2 x 6.1 km): a unit may only be there marching in' };
  const names = [pl.name, ...(pl.aliases || [])].map(norm), inQ = names.some(n => (' ' + norm((c.source || {}).quote) + ' ').includes(' ' + n + ' ')), inP = names.some(n => (' ' + norm((c.place || {}).printed) + ' ').includes(' ' + n + ' '));
  if (!inQ && !inP) return { ok: false, reason: 'gazetteer_name_not_printed', why: `“${pl.name}” is the ledger's gazetteer reference but its name is not in the printed words of the claim` };
  return { ok: true, place: pl, time: tm, phrase_in: inQ ? 'quote' : 'place.printed' };
}
export const isApproachCandidate = c => ['arrival_road', 'march'].includes(c.kind) && ROAD_WORD.test([(c.source || {}).quote, (c.place || {}).printed, printedRoad(c)].filter(Boolean).join(' | '));
// DEC-013 (a), DEC-014: a position or night_position claim whose printed words (verified quote, printed place, printed road field) name a gazetteer road, or whose ledger gazetteer reference is a road line and whose
// printed words carry a road word. It is a CANDIDATE for a road of approach for a unit whose line of command has none yet (no PDF-ledger approach, no approach read from an arrival_road or march claim); each
// one is admitted (curation `approach`, with admitted_by) or excluded with its reason (`approach_exclude`). The date is that of the claim (3 July 1863 or earlier: a later one is a departure, not an approach).
export const POSITION_KINDS = ['position', 'night_position'], LAST_APPROACH_DATE = '1863-07-03';
export function isPositionRoadCandidate(c, gaz, byId) {
  if (!POSITION_KINDS.includes(c.kind) || ((c.when || {}).date || '') > LAST_APPROACH_DATE) return false;
  const txt = [(c.source || {}).quote, (c.place || {}).printed, printedRoad(c)].filter(Boolean).join(' | '), nt = ' ' + norm(txt) + ' ';
  const named = gaz.data.places.some(p => p.kind === 'line' && p.line && [p.name, ...(p.aliases || [])].some(n => norm(n).length > 5 && nt.includes(' ' + norm(n) + ' ')));
  const ref = c.place && c.place.gazetteer_ref && byId.get(c.place.gazetteer_ref);
  return named || !!(ref && ref.kind === 'line' && ROAD_WORD.test(txt));
}
export const isDepartureCandidate = c => c.kind === 'departure' && ROAD_WORD.test([(c.source || {}).quote, (c.place || {}).printed, printedRoad(c)].filter(Boolean).join(' | '));

const road0 = n => n;
export const CONCORDANCE = 'app/data/road-concordance.json';
export function buildClaims({ raw = { ...loadRawFromDisk(), siblingApproach: null }, ledgers = loadLedgers(), curation = J(CURATION), concordance = (() => { try { return J(CONCORDANCE); } catch { return { names: [] }; } })(), verification = (() => { try { return J(VERIFY); } catch { return { results: [] }; } })(), prune = true, log = () => {} } = {}) {
  const gaz = new Gazetteer(raw.gazetteer), byId = gzById(gaz), units = raw.units.units, unitBy = new Map(units.map(u => [u.id, u]));
  const claims = new Map(ledgers.claims.map(c => [c.claim_id, c])), dig = new Map();
  const D = id => { if (!dig.has(id)) dig.set(id, digest(claims.get(id))); return dig.get(id); };
  const verified = new Map((verification.results || []).map(r => [r.claim + '|' + r.phrase, r]));
  const box = { lng0: terrainMeta().meta.lng0, lng1: terrainMeta().meta.lng1, lat0: terrainMeta().meta.lat0, lat1: terrainMeta().meta.lat1 };
  const disp = new Map();                                                                  // claim id -> { d: code, reason, entry? }
  const set = (id, d, reason, entry) => { if (!disp.has(id) || disp.get(id).d === 'candidate') disp.set(id, { d, reason, ...(entry ? { entry } : {}) }); };
  const errors = [];
  const ap0 = raw.placement.approach;
  const chain = id => { const o = []; let u = unitBy.get(id); while (u) { o.push(u.id); u = u.parent ? unitBy.get(u.parent) : null; } return o; };
  const wantEntry = (e, what) => {
    const c = claims.get(e.claim); if (!c) { errors.push(`${what} ${e.claim}: no such claim in the ledgers read`); return null; }
    const u = unusable(c); if (u) { errors.push(`${what} ${e.claim}: the claim may not be used (${u})`); return null; }
    if (!unitBy.has(c.unit_id)) { errors.push(`${what} ${e.claim}: unit ${c.unit_id} is not in the roster`); return null; }
    return c;
  };
  const phraseOk = (e, c, what) => {
    if (!e.phrase || words(e.phrase) > 15) { errors.push(`${what} ${e.claim}: phrase missing or over 15 words`); return false; }
    if (!PHRASE_FIELDS.includes(e.phrase_in)) { errors.push(`${what} ${e.claim}: phrase_in must be one of ${PHRASE_FIELDS.join(', ')}`); return false; }
    if (e.phrase_in === 'record') {
      const v = verified.get(e.claim + '|' + e.phrase), src = sourceOf(c), rid = src.kind === 'or27' ? src.id : null;
      if (src.kind !== 'or27') { errors.push(`${what} ${e.claim}: a 'record' phrase is checked against an OR27 record; this claim cites ${src.kind === 'statevol' ? 'a state regimental volume (' + src.id + ')' : 'no record'}: use quote, place.printed or direction_or_road`); return false; }
      if (!v || !v.found || v.record !== rid) { errors.push(`${what} ${e.claim}: the phrase “${e.phrase}” is not confirmed in record ${rid} (run tools/verify_claim_phrases.py)`); return false; }
      return true;
    }
    if (!norm(fieldText(c, e.phrase_in)).includes(norm(e.phrase))) { errors.push(`${what} ${e.claim}: the phrase “${e.phrase}” is not in the claim's ${e.phrase_in}: “${fieldText(c, e.phrase_in)}”`); return false; }
    return true;
  };

  // ---- classify every claim of the ledgers read: unusable, or a candidate of some kind
  const cand = { approach: [], stop: [], departure: [], positionRoad: [] }, mech = new Map();
  const ap0Units = new Set(ap0.map(a => a.unit)), arrivalApUnits = new Set((curation.approach || []).filter(e => claims.get(e.claim) && !POSITION_KINDS.includes(claims.get(e.claim).kind)).map(e => e.unit));
  const lineHasApproach = id => chain(id).some(u => ap0Units.has(u) || arrivalApUnits.has(u));
  for (const c of ledgers.claims) {
    const bad = unusable(c); if (bad) { set(c.claim_id, 'unresolved', `not used: ${bad}`); disp.get(c.claim_id).code = 'not_usable'; continue; }
    if (c.kind === 'strength_note') { set(c.claim_id, 'unresolved', 'a strength note carries no place or time to place a unit'); disp.get(c.claim_id).code = 'strength_note'; continue; }
    let any = false;
    if (isApproachCandidate(c)) { cand.approach.push(c.claim_id); any = true; }
    if (isDepartureCandidate(c)) { cand.departure.push(c.claim_id); any = true; }
    if (isPositionRoadCandidate(c, gaz, byId) && unitBy.has(c.unit_id) && !lineHasApproach(c.unit_id)) { cand.positionRoad.push(c.claim_id); any = true; }
    const st = stopTest(c, gaz, byId, box); mech.set(c.claim_id, st);
    if (st.ok) { cand.stop.push(c.claim_id); any = true; }
    if (!any) {
      let code, why;
      if (c.kind === 'departure') { code = st.reason === 'no_printed_time' ? 'departure_no_printed_time' : 'departure_no_resolvable_road'; why = code === 'departure_no_printed_time' ? `departure with no printed time or period (${st.why})` : 'departure: no road that the gazetteer holds is printed in the claim'; }
      else if (['arrival_road', 'march'].includes(c.kind) && !STOP_KINDS.has(c.kind)) { code = 'no_road'; why = 'no road is printed'; }
      else { code = st.reason; why = st.why; if (c.kind === 'arrival_road' || c.kind === 'march') why = `${why}; and no road of approach is printed in the claim`; }
      set(c.claim_id, 'unresolved', why); disp.get(c.claim_id).code = code;
    } else if (!disp.has(c.claim_id)) disp.set(c.claim_id, { d: 'candidate' });
  }

  // ---- curation coverage: every candidate is included or excluded, with a reason
  const incA = new Map((curation.approach || []).map(e => [e.claim, e])), incS = new Map((curation.stops || []).map(e => [e.claim, e])), incD = new Map((curation.departures || []).map(e => [e.claim, e]));
  const exA = curation.approach_exclude || {}, exS = curation.stops_exclude || {}, exD = curation.departures_exclude || {};
  const supportSet = new Set([...(curation.approach || []), ...(curation.departures || []), ...(curation.stops || [])].flatMap(e => e.support || []));
  const missing = [];
  for (const id of cand.approach) if (!supportSet.has(id) && !incA.has(id) && !exA[id] && !(incS.has(id) || exS[id]) ) missing.push(['approach', id]);
  for (const id of cand.stop) if (!supportSet.has(id) && !incS.has(id) && !exS[id] && !incA.has(id) && !exA[id]) missing.push(['stop', id]);
  for (const id of cand.departure) if (!supportSet.has(id) && !incD.has(id) && !exD[id]) missing.push(['departure', id]);
  for (const id of cand.positionRoad) if (!supportSet.has(id) && !incA.has(id) && !exA[id]) missing.push(['position_road', id]);
  for (const [k, v] of [['approach', incA], ['stops', incS], ['departures', incD]]) for (const id of v.keys()) if (!claims.has(id)) errors.push(`curation ${k}: claim ${id} is not in the ledgers read`);
  for (const [k, v] of [['approach_exclude', exA], ['stops_exclude', exS], ['departures_exclude', exD]]) for (const [id, why] of Object.entries(v)) { if (!claims.has(id)) errors.push(`curation ${k}: claim ${id} is not in the ledgers read`); if (!why || why.length < 8) errors.push(`curation ${k} ${id}: a reason is required`); }
  if (missing.length) return { candidates: missing.map(([k, id]) => ({ kind: k, id, c: claims.get(id), mech: mech.get(id) })), errors, missing };

  // ---- approaches
  const apGroups = new Map();                                                                  // unit -> [{ e, c }]
  for (const e of curation.approach || []) {
    const c = wantEntry(e, 'approach'); if (!c) continue;
    if (!['arrival_road', 'march'].includes(c.kind)) {
      if (!POSITION_KINDS.includes(c.kind) || e.admitted_by !== 'DEC-013a') { errors.push(`approach ${e.claim}: kind ${c.kind} (a position or night_position claim is admitted only with admitted_by DEC-013a)`); continue; }
      if (!e.identification || e.identification.length < 40) { errors.push(`approach ${e.claim}: a position claim read as a road of approach needs its identification (what the printed words say about the road)`); continue; }
      if (c.when.date > LAST_APPROACH_DATE) { errors.push(`approach ${e.claim}: dated after 3 July`); continue; }
    }
    if (e.unit !== c.unit_id) { errors.push(`approach ${e.claim}: unit ${e.unit} is not the claim's unit ${c.unit_id}`); continue; }
    if (!phraseOk(e, c, 'approach')) continue;
    const road = gaz.resolve(e.road); if (!road || !road.line) { errors.push(`approach ${e.claim}: road “${e.road}” is not a gazetteer line`); continue; }
    if (e.concordance) {                                                                       // a period name the gazetteer does not hold: allowed only through a RESOLVED concordance entry that covers this claim and names this very road
      const rc = (concordance.names || []).find(n => n.id === e.concordance);
      if (!rc || rc.status !== 'resolved' || !rc.resolves_to) { errors.push(`approach ${e.claim}: concordance ${e.concordance} is not a resolved entry of ${CONCORDANCE}`); continue; }
      if (!(rc.claims || []).includes(e.claim)) { errors.push(`approach ${e.claim}: concordance ${e.concordance} does not cover this claim`); continue; }
      if (rc.resolves_to.road !== road.name) { errors.push(`approach ${e.claim}: concordance ${e.concordance} resolves to ${rc.resolves_to.road}, not ${road.name}`); continue; }
      if (!e.printed_name || !rc.variants.some(v => norm(v) === norm(e.printed_name)) || !norm(e.phrase).includes(norm(e.printed_name))) { errors.push(`approach ${e.claim}: printed_name “${e.printed_name}” is not a variant of ${e.concordance} inside the phrase`); continue; }
    }
    if (!boxCrossings(road.line, box).length) { set(e.claim, 'unresolved', `the road “${e.road}” does not cross the loaded ground`); disp.get(e.claim).code = 'road_does_not_cross_ground'; continue; }
    for (const s of e.support || []) { if (!claims.has(s)) errors.push(`approach ${e.claim}: support ${s} is not a claim`); else if (unusable(claims.get(s))) errors.push(`approach ${e.claim}: support ${s} may not be used`); }
    if (!apGroups.has(e.unit)) apGroups.set(e.unit, []); apGroups.get(e.unit).push({ e, c });
  }
  const approach = [], apConflicts = [];
  let nAP = Math.max(0, ...ap0.map(a => +/\d+/.exec(a.id)[0]));
  for (const [unit, list] of apGroups) {
    const roads = [...new Set(list.map(x => gaz.resolve(x.e.road).id))];
    if (roads.length > 1) {                                                                    // two reports, two roads: neither is chosen
      apConflicts.push({ kind: 'approach_roads_differ', unit, claims: list.map(x => x.e.claim), values: list.map(x => x.e.road) });
      for (const x of list) { set(x.e.claim, 'unresolved', `conflict: other reports of the same unit print another road (${list.filter(y => y !== x).map(y => y.e.road).join('; ')}); none is chosen`); disp.get(x.e.claim).code = 'conflict_approach'; }
      continue;
    }
    const pdf = ap0.find(q => q.unit === unit);                    // the PDF ledger row prints a road for this very unit: another road is a conflict; for a formation above it is a refinement (below)
    if (pdf && gaz.resolve(pdf.road).id !== roads[0]) {
      apConflicts.push({ kind: 'approach_differs_from_ledger_row', unit, claims: list.map(x => x.e.claim), values: [list[0].e.road, `${pdf.road} (${pdf.id}, PDF ledger row ${pdf.row})`] });
      for (const x of list) { set(x.e.claim, 'unresolved', `conflict: the PDF ledger prints ${pdf.road} (${pdf.id}) for ${pdf.unit}, this report prints ${x.e.road}; none is chosen`); disp.get(x.e.claim).code = 'conflict_approach'; }
      continue;
    }
    const first = list[0], id = `AP-${String(++nAP).padStart(2, '0')}`, tierOf = x => x.c.tier;
    const primary = first.c, all = [...new Set(list.flatMap(x => [x.e.claim, ...(x.e.support || [])]))];
    approach.push({ id, unit, claim: first.e.claim, claims: all, ledger: primary.ledger, road: first.e.road, phrase: first.e.phrase, phrase_in: first.e.phrase_in, identification: first.e.identification || null,
      tier: 'inferred', claim_tier: list.some(x => tierOf(x) === 'inferred') ? 'inferred' : 'documented', note: first.e.why || '', ...(first.e.added_in ? { added_in: first.e.added_in } : {}), ...(first.e.phrase_in === 'record' ? { record: verified.get(first.e.claim + '|' + first.e.phrase).record } : {}),
      ...(POSITION_KINDS.includes(primary.kind) ? { claim_kind: primary.kind, admitted_by: first.e.admitted_by } : {}),
      ...(first.e.concordance ? (() => { const rc = concordance.names.find(n => n.id === first.e.concordance); return { concordance: { id: rc.id, period_name: rc.period_name, printed_name: first.e.printed_name, tier: rc.tier, summary: rc.summary, labels: rc.period_map_labels || [], file: 'library/ROAD-CONCORDANCE.md' } }; })() : {}),
      ...(() => { const parts = []; if (POSITION_KINDS.includes(primary.kind)) parts.push(`the claim is a ${primary.kind.replace('_', ' ')} statement: its printed words put the formation on the road before it reached the field, and it is read as the road of its approach (DEC-013 a; DEC-014; approach tier inferred)`);
        if (first.e.concordance) { const rc = concordance.names.find(n => n.id === first.e.concordance); parts.push(`the period name “${first.e.printed_name}” is not a name of the gazetteer: the road-name concordance ${rc.id} (tier ${rc.tier}) identifies it with the gazetteer’s ${road0(first.e.road)} (${rc.summary})`); }
        return parts.length ? { inference: parts.join('; ') } : {}; })() });
    for (const x of list) { set(x.e.claim, 'used_approach', `approach ${id}: ${x.e.road} for ${unit}`, id); for (const s of x.e.support || []) if (!disp.has(s) || ['unresolved', 'candidate'].includes(disp.get(s).d)) { disp.set(s, { d: 'used_approach_support', reason: `supports ${id}`, entry: id }); } }
  }

  // units that take no road from a formation above because reports of the unit print another road and disagree (DEC-014): neither is chosen; the claims are digested so the card lists both
  const approachBlock = [];
  for (const b of curation.approach_block || []) {
    if (!unitBy.has(b.unit)) { errors.push(`approach_block ${b.unit}: unknown unit`); continue; }
    for (const id of b.claims || []) { const c = claims.get(id); if (!c) errors.push(`approach_block ${b.unit}: claim ${id} is not in the ledgers read`); else if (unusable(c)) errors.push(`approach_block ${b.unit}: claim ${id} may not be used`); }
    if (!b.reason || b.reason.length < 20 || !(b.values || []).length) { errors.push(`approach_block ${b.unit}: reason and values are required`); continue; }
    approachBlock.push({ unit: b.unit, claims: b.claims, values: b.values, reason: b.reason, ...(b.added_in ? { added_in: b.added_in } : {}) });
    for (const id of b.claims || []) set(id, 'unresolved', `conflict: ${b.values.join(' against ')}; ${b.unit} takes no road from the formation above, none is chosen`), disp.get(id) && (disp.get(id).code = 'conflict_approach');
  }
  // a formation above the unit prints another road (PDF row or another claim): the unit's own report is the nearer printed road and is used (placement.mjs); both are listed on the card
  for (const a of approach) for (const y of chain(a.unit).slice(1)) {
    const above = approach.find(q => q.unit === y) || ap0.find(q => q.unit === y); if (!above) continue;
    if (gaz.resolve(above.road).id !== gaz.resolve(a.road).id) apConflicts.push({ kind: 'approach_refines_formation_above', unit: a.unit, claims: [a.claim, above.claim || above.id], values: [`${a.road} (own report, claim ${a.claim})`, `${above.road} (${above.claim ? 'claim ' + above.claim : 'PDF ledger row ' + above.row + ', ' + above.id}, for ${above.unit})`] });
    break;
  }
  // ---- stops
  const stopList = [];
  for (const e of curation.stops || []) {
    const c = wantEntry(e, 'stop'); if (!c) continue;
    if (e.unit && e.unit !== c.unit_id) { errors.push(`stop ${e.claim}: unit ${e.unit} is not the claim's unit ${c.unit_id}`); continue; }
    const st = mech.get(e.claim) || stopTest(c, gaz, byId, box);
    if (!st.ok) { errors.push(`stop ${e.claim}: fails the mechanical test (${st.reason}: ${st.why})`); continue; }
    const pl = gaz.resolve(e.place); if (!pl || pl.id !== st.place.id) { errors.push(`stop ${e.claim}: place “${e.place}” is not the gazetteer place the ledger references (${st.place.name})`); continue; }
    if (!phraseOk(e, c, 'stop')) continue;
    stopList.push({ e, c, tm: st.time, pl });
  }
  // a PDF-ledger entry for a formation above the unit: the same place within 90 minutes is a corroboration (nothing is added); another place within 90 minutes is a disagreement between the two sources
  // (a nearer entry would replace a farther one, placement.mjs): the PDF entry stays as it is, the claim is not applied, both are listed on the card
  const pdfConflicts = [], corroborations = [];
  for (const s of stopList.slice()) {
    const up = chain(s.c.unit_id).slice(1), t = isoToMin(s.tm.t);
    const hit = raw.placement.positions.find(p => p.units.some(u => up.includes(u)) && Math.abs(isoToMin(p.t) - t) < CONFLICT_MIN && gaz.resolve(p.place).id !== s.pl.id);
    if (hit) {
      stopList.splice(stopList.indexOf(s), 1); pdfConflicts.push({ kind: 'claim_differs_from_ledger_row', unit: s.c.unit_id, claims: [s.e.claim, hit.id], values: [`${s.pl.name} ${s.tm.t.replace('T', ' ')} (OR27 claim ${s.e.claim})`, `${hit.place} ${hit.t.replace('T', ' ')} (PDF ledger clause ${hit.id}, row ${hit.row}, for ${hit.units.join(', ')})`] });
      set(s.e.claim, 'unresolved', `disagrees with ${hit.id} (${hit.place}, ${hit.t.replace('T', ' ')}, PDF ledger, set for a formation above the unit) within ${CONFLICT_MIN} minutes: the PDF entry stays as it is, this claim is not applied, both are listed`); disp.get(s.e.claim).code = 'differs_from_pdf_stop';
    } else {
      const same = raw.placement.positions.find(p => p.units.some(u => up.includes(u) || u === s.c.unit_id) && Math.abs(isoToMin(p.t) - t) < CONFLICT_MIN && gaz.resolve(p.place).id === s.pl.id);
      if (same) { stopList.splice(stopList.indexOf(s), 1); corroborations.push({ claim: s.e.claim, unit: s.c.unit_id, entry: same.id, place: s.pl.name, t: s.tm.t }); set(s.e.claim, 'unresolved', `corroborates ${same.id} (same place, ${same.t.replace('T', ' ')}, PDF ledger clause): the existing entry already places the unit, so nothing is added`); disp.get(s.e.claim).code = 'corroborates_existing'; }
    }
  }
  // same-unit conflicts and duplicates
  const stopConflicts = [], dropped = new Map();
  const byUnit = new Map(); for (const s of stopList) { if (!byUnit.has(s.c.unit_id)) byUnit.set(s.c.unit_id, []); byUnit.get(s.c.unit_id).push(s); }
  const merged = [];
  for (const [unit, list] of byUnit) {
    list.sort((a, b) => isoToMin(a.tm.t) - isoToMin(b.tm.t));
    const dead = new Set();
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j], dt = Math.abs(isoToMin(a.tm.t) - isoToMin(b.tm.t));
      if (dt >= CONFLICT_MIN) continue;
      if (a.pl.id !== b.pl.id) continue;                       // two places within 90 minutes are a march, not a conflict: the reachability check below judges it
      if (dt === 0) { (a.same ||= []).push(b); dead.add(b); continue; }
      stopConflicts.push({ kind: 'stop_hour_differs', unit, claims: [a.e.claim, b.e.claim], values: [`${a.pl.name} ${a.tm.t.replace('T', ' ')}`, `${b.pl.name} ${b.tm.t.replace('T', ' ')}`] });
      dead.add(a); dead.add(b); a.conflict = b.conflict = true;
    }
    for (const s of list) {
      if (s.conflict) { const o = stopConflicts.filter(x => x.claims.includes(s.e.claim)).flatMap(x => x.claims).filter(x => x !== s.e.claim); set(s.e.claim, 'unresolved', `conflict: ${o.join(', ')} put the same unit at the same place at another hour within ${CONFLICT_MIN} minutes; none is chosen`); disp.get(s.e.claim).code = 'conflict_stop'; }
      else if (!dead.has(s)) merged.push(s);
    }
  }
  merged.sort((a, b) => curationOrder(curation.stops, a.e.claim) - curationOrder(curation.stops, b.e.claim));
  function curationOrder(list, id) { return list.findIndex(x => x.claim === id); }
  const po0 = raw.placement.positions; let nPO = Math.max(0, ...po0.map(a => +/\d+/.exec(a.id)[0]));
  const mkStop = (s, id) => ({ id, units: [s.c.unit_id], claim: s.e.claim, claims: [s.e.claim, ...(s.same || []).map(x => x.e.claim), ...(s.e.support || [])], ledger: s.c.ledger, place: s.pl.name, sigma_m: s.pl.sigma_m, t: s.tm.t, mode: 'arrive', requires_positioned: false, t_basis: s.tm.t_basis,
    ...(s.tm.period ? { period: s.tm.period } : {}), ...(s.tm.approx ? { approx: true } : {}), tier: 'inferred', claim_tier: s.c.tier, phrase: s.e.phrase, phrase_in: s.e.phrase_in, note: s.e.why || '' });
  let positions = merged.map(s => mkStop(s, `PO-${String(++nPO).padStart(2, '0')}`));
  // ---- departures
  const departures = []; let nDP = 0;
  for (const e of curation.departures || []) {
    const c = wantEntry(e, 'departure'); if (!c) continue;
    if (c.kind !== 'departure') { errors.push(`departure ${e.claim}: kind ${c.kind}`); continue; }
    const tm = timeOf(c); if (tm.err) { errors.push(`departure ${e.claim}: ${tm.err} ${tm.why}`); continue; }
    if (!phraseOk(e, c, 'departure')) continue;
    const road = gaz.resolve(e.road); if (!road || !road.line) { errors.push(`departure ${e.claim}: road “${e.road}” is not a gazetteer line`); continue; }
    if (e.unit !== c.unit_id) { errors.push(`departure ${e.claim}: unit ${e.unit} is not the claim's unit ${c.unit_id}`); continue; }
    departures.push({ id: `DP-${String(++nDP).padStart(2, '0')}`, units: [c.unit_id], claim: e.claim, claims: [e.claim, ...(e.support || [])], ledger: c.ledger, road: e.road, t: tm.t, t_basis: tm.t_basis, ...(tm.period ? { period: tm.period } : {}), ...(tm.approx ? { approx: true } : {}),
      tier: 'inferred', claim_tier: c.tier, phrase: e.phrase, phrase_in: e.phrase_in, identification: e.identification || null, note: e.why || '' });
  }
  // ---- documented absences (history layer v8, DEC-023E): a leaf unit that the record places AWAY from the field for the whole battle is not drawn and its strength is not counted in the field totals. Each row
  // names its claims (all usable, all the unit's own) and a summary written from them; no approach, stop or departure may exist for the unit; the loader re-checks all of it (placement.mjs).
  const documentedAbsent = [];
  for (const a of curation.documented_absent || []) {
    const u = unitBy.get(a.unit);
    if (!u || u.children.length) { errors.push(`documented_absent ${a.unit}: not a leaf unit of the roster`); continue; }
    if (!a.summary || a.summary.length < 60 || !a.register || !a.decision || a.tier !== 'documented') { errors.push(`documented_absent ${a.unit}: summary (60 characters or more), register, decision and tier documented are required`); continue; }
    let ok = (a.claims || []).length >= 2; if (!ok) errors.push(`documented_absent ${a.unit}: at least two claims are required`);
    for (const id of a.claims || []) { const c = claims.get(id); if (!c) { errors.push(`documented_absent ${a.unit}: claim ${id} is not in the ledgers read`); ok = false; } else if (unusable(c)) { errors.push(`documented_absent ${a.unit}: claim ${id} may not be used (${unusable(c)})`); ok = false; } else if (c.unit_id !== a.unit) { errors.push(`documented_absent ${a.unit}: claim ${id} is the claim of ${c.unit_id}`); ok = false; } }
    if (!ok) continue;
    if (!(a.claims || []).some(id => claims.get(id).tier === 'documented')) { errors.push(`documented_absent ${a.unit}: at least one documented claim is required`); continue; }
    for (const kind of [['approach', approach], ['stop', positions], ['departure', departures]]) for (const e of kind[1]) if ((e.units || [e.unit]).some(x => x === a.unit)) errors.push(`documented_absent ${a.unit}: ${kind[0]} ${e.id} also places the unit`);
    documentedAbsent.push({ id: `ABS-${String(documentedAbsent.length + 1).padStart(2, '0')}`, unit: a.unit, claims: a.claims, tier: a.tier, register: a.register, decision: a.decision, summary: a.summary, ...(a.added_in ? { added_in: a.added_in } : {}) });
  }
  if (errors.length) return { errors, candidates: [] };

  // ---- document + the layer, to prune what cannot be reached
  const claimRefs = new Set();
  const finish = (pos, dep, ap) => {
    const used = new Set([...pos, ...dep, ...ap].flatMap(e => e.claims)), peers = new Set();
    for (const x of [...pdfConflicts, ...apConflicts, ...stopConflicts]) for (const id of x.claims) if (claims.has(id)) used.add(id);
    for (const b of approachBlock) for (const id of b.claims || []) if (claims.has(id)) used.add(id);
    for (const x of corroborations) used.add(x.claim);
    for (const a of documentedAbsent) for (const id of a.claims) used.add(id);
    for (const id of used) for (const p of claims.get(id).conflicts_with || []) if (claims.has(p) && !unusable(claims.get(p))) peers.add(p);
    const digs = {}; for (const id of [...used, ...peers].sort()) digs[id] = D(id);
    return digs;
  };
  const baseDefects = (() => { const L0 = createRealHistory({ raw, T: terrainMeta(), helpers: { civilDawn: m => m + 4 * 60 + 3 } }); const r = L0.report({}); return new Set(r.defects.map(d => d.unit + '|' + d.stop)); })();
  const rawWith = (pos, dep, ap) => ({ ...raw, placementClaims: { version: 1, approach: ap, approach_block: approachBlock, positions: pos, departures: dep, activities: [], documented_absent: documentedAbsent, claims: finish(pos, dep, ap) } });
  const pruned = [];
  let layer = null;
  for (let round = 0; round < 8; round++) {
    layer = createRealHistory({ raw: rawWith(positions, departures, approach), T: terrainMeta(), helpers: { civilDawn: m => m + 4 * 60 + 3 } });
    if (!prune) break;
    const rep = layer.report({}), bad = rep.defects.filter(d => !baseDefects.has(d.unit + '|' + d.stop));
    if (!bad.length) break;
    const drop = new Set();
    for (const d of bad) {
      const plan = layer.plans.get(d.unit), mine = positions.filter(p => p.units.some(u => layer.placement.chain(d.unit).includes(u))).map(p => p.id);
      const stopIds = plan ? plan.stops.map(s => s.po) : [], k = stopIds.indexOf(d.stop), upTo = stopIds.slice(0, k + 1).filter(x => mine.includes(x));
      for (const x of (upTo.length ? upTo : [])) drop.add(x);
      pruned.push({ unit: d.unit, stop: d.stop, late_min: d.late_min, dropped: [...upTo] });
    }
    if (!drop.size) break;
    for (const p of positions) if (drop.has(p.id)) { set(p.claim, 'unresolved', `not reachable: the layer cannot bring a unit to the later stop in time at double-quick from this one (the reports disagree, or the place is too coarse)`); disp.get(p.claim).code = 'unreachable'; }
    positions = positions.filter(p => !drop.has(p.id));
    layer = null;
  }
  // what finally drives a drawn unit
  const drawn = new Set(layer.units.filter(u => u.drawn).map(u => u.id));
  
  const gate = id => { const e = layer.model.effective(id, {}, { civilDawn: m => m + 4 * 60 + 3 }); return e ? e.earliest : -Infinity; };
  const beforeGate = [];
  for (const p of positions) {
    const us = p.units, tm = isoToMin(p.t), gt = Math.max(...us.map(gate)), dr = layer.units.filter(u => u.drawn && (u.id === us[0] || u.id.startsWith(us[0] + '-')));
    const applied = dr.filter(u => (layer.plans.get(u.id).stops || []).some(x => x.po === p.id)), early = us.some(u => tm + 1e-6 < gate(u));
    const d = applied.length ? 'used_stop' : dr.length ? 'transcribed_not_applied' : 'transcribed_inert';
    const why = applied.length ? `stop ${p.id}: ${p.place}, placed for ${applied.length} drawn unit${applied.length === 1 ? '' : 's'}` : dr.length ? `stop ${p.id}: ${p.place}; not applied to the ${dr.length} drawn unit${dr.length === 1 ? '' : 's'} under ${us[0]}: ${early ? 'it falls before the unit’s own ledger gate (Q04, the gate is not moved)' : 'a nearer entry within 90 minutes replaces it, or the unit already stands at the place'}` : `stop ${p.id}: ${p.place}; no unit under ${us[0]} has a road of approach, so none is drawn`;
    set(p.claim, d, why, p.id);
    for (const s of p.claims.slice(1)) if (!disp.has(s) || ['unresolved', 'candidate'].includes(disp.get(s).d)) disp.set(s, { d: 'used_stop_support', reason: `merged into ${p.id} (same unit, place and time)`, entry: p.id });
    if (early) beforeGate.push({ stop: p.id, claim: p.claim, unit: us[0], t: p.t, place: p.place, gate_min: gt });
  }
  for (const a of approach) set(a.claim, 'used_approach', `approach ${a.id}: ${a.road} for ${a.unit}`, a.id);
  for (const d of departures) set(d.claim, 'used_departure', `departure ${d.id}: ${d.road}`, d.id);
  // candidates neither used nor unresolved by an earlier step: excluded by review (the reason is the curation's)
  for (const id of [...cand.approach, ...cand.stop, ...cand.departure]) {
    const cur = disp.get(id); if (cur && cur.d !== 'candidate') continue;
    const why = exA[id] || exS[id] || exD[id]; if (why) { disp.set(id, { d: 'unresolved', code: 'reviewed_not_used', reason: why }); continue; }
  }
  for (const [id, v] of disp) if (v.d === 'candidate') { v.d = 'unresolved'; v.code = 'reviewed_not_used'; v.reason = exA[id] || exS[id] || exD[id] || 'reviewed and not used'; }

  for (const a of documentedAbsent) for (const id of a.claims) disp.set(id, { d: 'used_absence', code: 'documented_absence', reason: `documented absence ${a.id}: ${a.unit} is not on the field (${a.register}, ${a.decision})`, entry: a.id });
  const doc = {
    _doc: 'Placement entries read from the position ledgers (history/positions/positions_{A,B,C,D,E}.jsonl: A to D the OR27 reports, E the state regimental volumes, history layer v8). Every entry names the ledger claim that supports it; `claims` holds a digest of each claim used (id, report, printed page, verified quote, tier, fidelity check, printed time and place) and of the claims it conflicts with. A phrase is in the claim\'s verified quote, in its printed place or road words, or in the cited OR record as confirmed by tools/verify_claim_phrases.py. Nothing here is a coordinate: places and roads are gazetteer entries.',
    version: 1,
    rule: { used_if: 'claim_support_verified true, fidelity_check passed_full_read or corrected, tier documented or inferred', ledger_B: ledgers.meta.B, time: 'a printed clock (t_iso confirmed by the words of the claim) or a printed named period (night, evening, dusk) with the labelled convention of placement.mjs', conflict: `two claims of one unit at the same place at different hours within ${CONFLICT_MIN} minutes, or two roads of approach for one unit (or a road that differs from the PDF ledger row): neither is placed, both are listed; two different places are a march, judged by the reachability check`, tier: 'inferred for every entry (the claim is the OR27 report; the place or road is a repository gazetteer entry, which is inferred); the claim\'s own tier is claim_tier' },
    ledgers: ledgers.meta,
    approach, approach_block: approachBlock, positions, departures, activities: [], documented_absent: documentedAbsent,
    conflicts: [...apConflicts, ...pdfConflicts, ...stopConflicts],
    corroborations,
    claims: finish(positions, departures, approach),
  };
  // the dispositions file: one row per claim read
  const rows = ledgers.claims.map(c => { const v = disp.get(c.claim_id) || { d: 'unresolved', code: 'unclassified', reason: '' }; return [c.claim_id, c.ledger, c.unit_id, c.kind, v.d, v.code || '', v.reason || '', v.entry || '']; });
  const summary = {}; for (const r of rows) { const u = (summary[r[2]] ||= { read: 0, used: 0, codes: {} }); u.read++; if (/^(used|transcribed)/.test(r[4])) u.used++; else u.codes[r[5]] = (u.codes[r[5]] || 0) + 1; }
  doc.units = summary;
  // every usable claim that puts a unit on or at the field (a place the gazetteer holds inside the loaded ground, or a road of approach) EARLIER than the unit's ledger gate: reported, never acted on (Q04: the gate is not moved)
  const earlier = [];
  for (const c of ledgers.claims) {
    if (unusable(c) || !unitBy.has(c.unit_id)) continue;
    const tm = timeOf(c); if (tm.err) continue; const st = mech.get(c.claim_id), road = isApproachCandidate(c);
    if (!(st && st.ok) && !road) continue; const g = gate(c.unit_id); if (!Number.isFinite(g)) continue; const t = isoToMin(tm.t);
    if (t + 1e-6 < g) earlier.push({ claim: c.claim_id, ledger: c.ledger, unit: c.unit_id, kind: c.kind, t: tm.t, t_basis: tm.t_basis, gate_min: g, place: st && st.ok ? st.place.name : ((c.place || {}).printed || null), used: /^(used|transcribed)/.test((disp.get(c.claim_id) || {}).d || '') });
  }
  earlier.sort((x, y) => x.unit.localeCompare(y.unit) || x.t.localeCompare(y.t) || x.claim.localeCompare(y.claim));
  const dispositions = { _doc: 'One row per claim read: [claim id, ledger, unit, kind, disposition, reason code, reason, entry]. Written by tools/build-claim-placement.mjs.', columns: ['claim', 'ledger', 'unit', 'kind', 'disposition', 'code', 'reason', 'entry'], ledgers: ledgers.meta, rows, pruned, before_gate: beforeGate, earlier_than_gate: earlier };
  return { doc, dispositions, layer, errors: [], pruned, beforeGate };
}

export function write(res) {
  fs.writeFileSync(path.join(BT, OUT_CLAIMS), JSON.stringify(res.doc, null, 1) + '\n');
  fs.writeFileSync(path.join(BT, OUT_DISP), JSON.stringify(res.dispositions) + '\n');
}
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const res = buildClaims(process.argv.includes('--candidates') ? { curation: { approach: [], stops: [], departures: [], approach_exclude: {}, stops_exclude: {}, departures_exclude: {} } } : {});
  if (res.errors && res.errors.length) { console.error(res.errors.join('\n')); process.exit(1); }
  if (res.missing) {
    console.error(`${res.missing.length} claims pass the mechanical tests and are in neither the include nor the exclude list of ${CURATION}:`);
    for (const m of res.candidates) { const c = m.c; console.error(`${m.kind} ${c.claim_id} ${c.unit_id} ${c.kind} ${c.tier} | W: ${(c.when || {}).printed} ${(c.when || {}).t_iso || ''} | PL: ${(c.place || {}).printed} [${(c.place || {}).gazetteer_ref || ''}] | DR: ${printedRoad(c) || ''} | Q: ${(c.source || {}).quote}`); }
    process.exit(2);
  }
  write(res);
  const by = {}; for (const r of res.dispositions.rows) by[r[4]] = (by[r[4]] || 0) + 1;
  console.log('claim placement written:', JSON.stringify(by), '| approaches', res.doc.approach.length, 'stops', res.doc.positions.length, 'departures', res.doc.departures.length, 'conflicts', res.doc.conflicts.length, 'pruned', res.pruned.length);
}
