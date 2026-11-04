// Counts and tables for the position-ledger section of app/HISTORY-LAYER-NOTES.md, computed from data/placement-claims.json, data/claim-dispositions.json and the layer.
// Nothing is typed here: every number is a count and every list is a listing.
import { createRealHistory } from '../src/history/real.mjs';
import { fmtShort } from '../src/clock.mjs';
import { isoToMin } from '../src/clock.mjs';

export const CODE_TEXT = {
  not_usable: 'the claim may not be used: claim_support_verified is false, or its fidelity check is not passed_full_read or corrected, or its tier is an open gap',
  strength_note: 'a strength note: it carries no place or time to place a unit',
  no_printed_time: 'no clock and no named period is printed in the claim (a day or a day-part only), so no time can be given to a place',
  printed_clock_unconfirmed: 'the ledger gives a time that the claim\'s own printed words do not confirm (an hour borrowed from another sentence, a damaged digit)',
  no_gazetteer_place: 'the place is not one the gazetteer holds (a description such as “the ridge”, a town or village with no coordinates in the repository, or no place printed)',
  gazetteer_name_not_printed: 'the ledger references a gazetteer place but its name is not in the printed words of the claim (the reference is the compiler\'s inference)',
  place_is_a_road: 'the place is a road: a stop needs a place, and the position along a road is not printed',
  place_too_broad: 'the place is a stream or a feature too broad to stand a unit in (sigma over 1,500 m)',
  place_outside_loaded_ground: 'the place lies outside the loaded ground (Cashtown, Hunterstown, ...): a unit may only be there marching in',
  kind_not_a_stop: 'not a statement of position',
  departure_no_printed_time: 'a departure with no clock and no named period printed',
  departure_no_resolvable_road: 'a departure: no road that the gazetteer holds is printed in the claim',
  no_road: 'a march or arrival with no road printed',
  reviewed_not_used: 'passes the mechanical tests; reviewed by hand and not used (the reason is on the row of data/claim-curation.json)',
  conflict_stop: 'two claims of one unit at the same place at different hours within 90 minutes: neither is placed, both are listed',
  conflict_approach: 'two roads of approach for one unit (or a road that differs from the PDF ledger row of the unit): none is chosen, both are listed',
  differs_from_pdf_stop: 'the claim puts the unit at another place than a PDF-ledger entry set for a formation above it within 90 minutes: the PDF entry stays as it is, the claim is not applied, both are listed',
  corroborates_existing: 'agrees with a PDF-ledger entry that already places the unit: nothing is added',
  unreachable: 'the layer cannot bring the unit to its next stop at double-quick from this one',
  road_does_not_cross_ground: 'the road does not cross the loaded ground',
};
const tally = (rows, f) => { const m = {}; for (const r of rows) { const k = f(r); m[k] = (m[k] || 0) + 1; } return m; };

export function claimsReport(raw, L, T) {
  const cd = raw.placementClaims, dp = raw.claimDispositions; if (!cd || !dp) return null;
  const L0 = createRealHistory({ raw: { ...raw, placementClaims: null }, T }), figs = lay => lay.units.filter(u => u.drawn).reduce((a, u) => a + u.strength.drawn, 0);
  const rows = dp.rows.map(r => ({ claim: r[0], ledger: r[1], unit: r[2], kind: r[3], d: r[4], code: r[5], reason: r[6], entry: r[7] }));
  const isUsed = d => /^(used|transcribed)/.test(d);
  const byLedger = {};
  for (const [l, m] of Object.entries(cd.ledgers)) { const rs = rows.filter(r => r.ledger === l); byLedger[l] = { ...m, read: rs.length, not_usable: rs.filter(r => r.code === 'not_usable').length, used: rs.filter(r => isUsed(r.d)).length, drivers: rs.filter(r => r.d === 'used_approach' || r.d === 'used_stop' || r.d === 'used_departure').length, inert: rs.filter(r => /^transcribed_(inert|not_applied)/.test(r.d)).length, support: rs.filter(r => /support/.test(r.d)).length, absence: rs.filter(r => r.d === 'used_absence').length, unresolved: rs.filter(r => r.d === 'unresolved').length }; }
  const codes = tally(rows.filter(r => r.d === 'unresolved'), r => r.code), codesByLedger = {}; for (const r of rows.filter(r => r.d === 'unresolved')) { (codesByLedger[r.code] ||= {})[r.ledger] = (codesByLedger[r.code][r.ledger] || 0) + 1; }
  const drawnUnder = unit => L.units.filter(u => u.drawn && (u.id === unit || u.id.startsWith(unit + '-')));
  const approach = cd.approach.map(a => { const us = L.units.filter(u => u.drawn && u.approach && u.approach.id === a.id), c = cd.claims[a.claim]; return { id: a.id, unit: a.unit, road: a.road, claims: a.claims, claim: a.claim, ledger: a.ledger, report: c.report, page: c.page, author: c.author, phrase: a.phrase, phrase_in: a.phrase_in, claim_tier: a.claim_tier, identification: a.identification, drawn: us.length, by_tier: us.reduce((m, u) => { m[u.approach.tier] = (m[u.approach.tier] || 0) + 1; return m; }, {}) }; });
  const stops = cd.positions.map(p => { const c = cd.claims[p.claim], dr = drawnUnder(p.units[0]); const applied = dr.filter(u => { const pl = L.plans.get(u.id); return pl && pl.stops.some(s => s.po === p.id); }).length; return { id: p.id, unit: p.units[0], place: p.place, t: p.t, t_basis: p.t_basis, period: p.period || null, claim: p.claim, claims: p.claims, ledger: p.ledger, report: c.report, page: c.page, claim_tier: p.claim_tier, drawn_units: dr.length, applied_to: applied, disposition: (rows.find(r => r.claim === p.claim) || {}).d }; });
  const departures = cd.departures.map(p => { const c = cd.claims[p.claim], dr = drawnUnder(p.units[0]); return { id: p.id, unit: p.units[0], road: p.road, t: p.t, claim: p.claim, claims: p.claims, ledger: p.ledger, report: c.report, page: c.page, drawn_units: dr.length, leave_events: L.events({}).filter(e => e.type === 'leave' && dr.some(u => u.id === e.unit)).length }; });
  const conflicts = cd.conflicts;
  const peers = new Set(); for (const u of L.units) if (u.provenance) for (const x of u.provenance.peers) peers.add(x.of + '>' + x.peer.id);
  const unitsWithPeers = L.units.filter(u => u.provenance && u.provenance.peers.length).length, unitsWithConflicts = L.units.filter(u => u.provenance && u.provenance.conflicts.length).length;
  const compilerGlosses = raw.placement.approach.filter(a => a.inference).map(a => ({ id: a.id, unit: a.unit, road: a.road, inference: a.inference, claim_prints_road: cd.approach.some(c => c.unit === a.unit || c.unit.startsWith(a.unit + '-')), formation_above: cd.approach.filter(c => a.unit.startsWith(c.unit + '-') && c.road === a.road).map(c => c.id) }));
  return {
    ledgers: byLedger, b_status: cd.ledgers.B, read: rows.length, used: rows.filter(r => isUsed(r.d)).length, drivers: rows.filter(r => ['used_approach', 'used_stop', 'used_departure'].includes(r.d)).length, inert: rows.filter(r => /^transcribed_(inert|not_applied)/.test(r.d)).length, support: rows.filter(r => /support/.test(r.d)).length,
    unresolved: rows.filter(r => r.d === 'unresolved').length, codes, codes_by_ledger: codesByLedger,
    before: { counts: L0.counts, figures: figs(L0), approaches: raw.placement.approach.length, stops: raw.placement.positions.length, departures: (raw.placement.departures || []).length },
    after: { counts: L.counts, figures: figs(L), approaches: L.placement.ap.length, stops: L.placement.po.length, departures: L.placement.dep.length },
    approach, stops, departures, conflicts, corroborations: cd.corroborations || [], units_with_peers: unitsWithPeers, units_with_conflicts: unitsWithConflicts, conflict_pairs: peers.size,
    before_gate_stops: dp.before_gate, earlier_than_gate: dp.earlier_than_gate, pruned: dp.pruned, compiler_glosses: compilerGlosses,
    leaf_without_approach: L.units.filter(u => u.render.status === 'not_drawn').length,
  };
}

// ---- markdown lines for HISTORY-LAYER-NOTES.md
export function claimsNotes(c, nf = n => Number(n).toLocaleString('en-US')) {
  const L = [], P = s => L.push(s), esc = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const hhmm = t => fmtShort(isoToMin(t));
  P('## Position ledgers of the Official Records: what was read, used and left out');
  P('');
  P('The five ledgers `history/positions/positions_{A,B,C,D,E}.jsonl` hold one claim per statement of an OR vol. 27 report (ledgers A to D: report id, printed page, verified quote, tier, `fidelity_check`, `claim_support_verified`) or of a state regimental volume (ledger E, history layer v8: volume, section, printed page, verified quote, the same tier and checks; the adapter in `tools/claim-ledger.mjs` names the source of a claim whatever the ledger, so E claims are admitted by exactly the same rules). **A claim is used only if `claim_support_verified` is true and `fidelity_check` is `passed_full_read` or `corrected`** (an open gap, a downgraded claim and a not-rechecked claim are never used; an `inferred` claim may drive only an `inferred` placement, and the card says so). Ledger B is read only after the line `RECHECK B COMPLETE` is the last line of `positions/RECHECK_B_NOTES.md`. The ledgers are not edited. The reviewed table is `data/claim-curation.json`; `tools/build-claim-placement.mjs` writes `data/placement-claims.json` (the entries the layer loads, with a digest of every claim they cite) and `data/claim-dispositions.json` (one row for every claim read: used, or left out and why). Every phrase of an entry is checked at load against the claim\'s own verified quote or printed place or road words (or, where marked `record`, against the OR record by `tools/verify_claim_phrases.py`); every time against the claim\'s printed clock (or a printed named period, which takes the labelled convention of the PDF); every place is the gazetteer place the ledger references and must be in the printed words; no coordinate, time, road or quotation is invented.');
  P('');
  P('| ledger | claims | not usable | used (drives a unit, support, or recorded and inert) | left out |'); P('|---|---|---|---|---|');
  for (const [l, m] of Object.entries(c.ledgers)) P(m.included === false ? `| ${l} | ${nf(m.claims)} | not read: ${esc(m.reason)} | | |` : `| ${l} | ${nf(m.read)} | ${nf(m.not_usable)} | ${nf(m.used)} (${m.drivers} drive an entry, ${m.support} support one, ${m.inert} are recorded and not applied${m.absence ? `, ${m.absence} establish a documented absence` : ''}) | ${nf(m.unresolved)} |`);
  P(`| **all** | ${nf(c.read)} | ${nf(c.codes.not_usable || 0)} | ${nf(c.used)} | ${nf(c.unresolved)} |`);
  P('');
  P(`**Not applied** means an entry that is valid and recorded but draws nothing: it belongs to a unit, or a formation, none of whose leaf units has a road of approach (inert; it applies the moment a road is printed for the unit), or it falls before the unit’s own ledger gate or is replaced by a nearer entry.`);
  P('');
  const a = c.after, b = c.before, d = (x, y) => (y - x >= 0 ? '+' : '') + nf(y - x);
  P('### Before and after'); P('');
  P('| | PDF ledger rows only | with the position ledgers | change |'); P('|---|---|---|---|');
  for (const [k, lab] of [['moving', 'units placed (a road of approach and a dated place)'], ['edge_only', 'units at the arrival edge only'], ['not_drawn', 'open gap (no road of approach)'], ['drawn', 'units drawn']]) P(`| ${lab} | ${b.counts[k]} | ${a.counts[k]} | ${d(b.counts[k], a.counts[k])} |`);
  P(`| figures drawn (one soldier per figure, no cap) | ${nf(b.figures)} | ${nf(a.figures)} | ${d(b.figures, a.figures)} |`);
  P(`| approach records | ${b.approaches} | ${a.approaches} | ${d(b.approaches, a.approaches)} |`);
  P(`| stops (positions) | ${b.stops} | ${a.stops} | ${d(b.stops, a.stops)} |`);
  P(`| departures | ${b.departures} | ${a.departures} | ${d(b.departures, a.departures)} |`);
  P('');
  P('### Why claims are not used'); P('');
  P('| reason | claims | A | B | C | D |'); P('|---|---|---|---|---|---|');
  for (const [k, n] of Object.entries(c.codes).sort((x, y) => y[1] - x[1])) { const l = c.codes_by_ledger[k] || {}; P(`| ${esc(CODE_TEXT[k] || k)} | ${nf(n)} | ${l.A || 0} | ${l.B || 0} | ${l.C || 0} | ${l.D || 0} |`); }
  P('');
  P(`The reason of every one of the ${nf(c.unresolved)} claims left out is a row of \`data/claim-dispositions.json\` (claim, ledger, unit, kind, disposition, reason code, reason in words). The ${nf(c.leaf_without_approach)} leaf units with no road of approach are listed in the section “Units with no place” below.`);
  P('');
  P('### Approach roads added (AP-08 onward)'); P('');
  P('Each is the road a report prints for the unit\'s own march or arrival, resolved to a gazetteer road that crosses the loaded ground. Units inherit it down their line of command as before (tier `inferred` where the road is printed for a formation below the corps or for the unit itself, `plausible-procedural` under a corps-level road); the gate of no unit is changed (Q04).'); P('');
  P('| approach | road | printed for | claim(s) | report, page | printed words (where found) | claim tier | units drawn by it |'); P('|---|---|---|---|---|---|---|---|');
  for (const x of c.approach) P(`| ${x.id} | ${esc(x.road)} | \`${x.unit}\` | ${x.claims.map(k => '`' + k + '`').join(', ')} | ${esc(x.report)}, p. ${esc(x.page)} | “${esc(x.phrase)}” (${x.phrase_in === 'record' ? 'in the OR record' : x.phrase_in}) | ${x.claim_tier} | ${x.drawn ? Object.entries(x.by_tier).map(([k, v]) => `${v} ${k}`).join(', ') : '0'} |`);
  P('');
  const id = c.approach.filter(x => x.identification); if (id.length) { P('Where the printed name is not the gazetteer\'s, the identification is said on the card:'); P(''); for (const x of id) P(`- ${x.id}: ${esc(x.identification)}.`); P(''); }
  P(`**Roads read by the compiler (AP-03, AP-04, AP-06: “from Baltimore”, “from Hanover”, “after Hunterstown”).** ${c.compiler_glosses.every(g => !g.claim_prints_road) ? 'No approach claim of the curation table prints a road for any of these units or for a unit under them (the 20th Maine’s claims name Hanover only as a place, and the Emmitsburg road only for the march away on 5 July; Hampton’s claim prints “the road to Gettysburg”, not named), so none is replaced: they stay roads named for the place they lead to, tier inferred.' : 'Claims print a road for: ' + c.compiler_glosses.filter(g => g.claim_prints_road).map(g => g.id).join(', ') + '.'}${c.compiler_glosses.filter(g => g.formation_above.length).map(g => ` ${g.id} (${g.road}) agrees with ${g.formation_above.join(', ')}, which prints the same road for a formation above the unit.`).join('')}`);
  P('');
  P('### Stops added (PO-62 onward)'); P('');
  P('A stop says the unit stands at the place by the printed time (a march ends there at that time; before it the unit waits in its column at the edge, plausible-procedural). A name that stands for the whole field (“Gettysburg”) is placed at the borough\'s centre only where the report says the unit arrived at or entered the town. A claim before the unit\'s own ledger gate is kept in the data and not applied.'); P('');
  P('| stop | unit | place | time | claim | report, page | claim tier | leaf units drawn under the unit | placed by it |'); P('|---|---|---|---|---|---|---|---|---|');
  for (const x of c.stops) P(`| ${x.id} | \`${x.unit}\` | ${esc(x.place)} | ${hhmm(x.t)}${x.t_basis === 'convention' ? ` (${x.period}, convention)` : ''} | ${x.claims.map(k => '`' + k + '`').join(', ')} | ${esc(x.report)}, p. ${esc(x.page)} | ${x.claim_tier} | ${x.drawn_units} | ${x.applied_to}${x.drawn_units ? '' : ' (inert)'} |`);
  P('');
  P('### Departures added'); P('');
  if (c.departures.length) { P('| departure | unit | road | time | claim | report, page | leaf units drawn under the unit | leave events |'); P('|---|---|---|---|---|---|---|---|'); for (const x of c.departures) P(`| ${x.id} | \`${x.unit}\` | ${esc(x.road)} | ${hhmm(x.t)} | ${x.claims.map(k => '`' + k + '`').join(', ')} | ${esc(x.report)}, p. ${esc(x.page)} | ${x.drawn_units} | ${x.leave_events} |`); }
  else P('none');
  P('');
  P('Almost every other departure claim names a town (Emmitsburg, Fairfield, Littlestown, Hagerstown, Monterey) or the “Fairfield road”, which two roads of the road layer could carry, or prints no hour: all are unresolved with the reason on their row.');
  P('');
  P('### Reports that disagree (listed, never resolved)'); P('');
  P(`${c.conflicts.length} disagreements between sources are carried as data and shown on the cards of the units they touch (${c.units_with_conflicts} cards); ${nf(c.conflict_pairs)} pairs of claims that the ledger lists as conflicting with a claim used are shown on ${c.units_with_peers} cards, each with both values. Neither side of a disagreement is placed.`); P('');
  P('| kind | unit | the values | claims or entries |'); P('|---|---|---|---|');
  for (const x of c.conflicts) P(`| ${esc(x.kind.replace(/_/g, ' '))} | \`${x.unit}\` | ${x.values.map(esc).join(' **|** ')} | ${x.claims.map(k => '`' + k + '`').join(', ')} |`);
  P('');
  if (c.corroborations.length) { P('Claims that agree with an entry already in use (nothing is added; the card of the unit lists the agreement): ' + c.corroborations.map(x => `\`${x.claim}\` (${x.unit}) agrees with ${x.entry} at ${esc(x.place)}`).join('; ') + '.'); P(''); }
  P('### Claims earlier than the unit\'s own gate (Q04)'); P('');
  P(`${c.earlier_than_gate.length} usable claims put a unit on a gazetteer place inside the loaded ground, or on a road of approach, EARLIER than the unit\'s ledger gate (the earliest time the ledger allows, tested against \`tools/bt/check_arrivals.py\`). **No gate is moved**; a stop of such a claim is not applied (the unit is not on the field yet), and an approach is applied from the gate. The ledger and the report disagree about when the unit was nearer; the owner decides which to follow (this is a conflict of sources).`); P('');
  P('| claim | unit | printed time | ledger gate | place | used |'); P('|---|---|---|---|---|---|');
  for (const x of c.earlier_than_gate) P(`| \`${x.claim}\` | \`${x.unit}\` | ${hhmm(x.t)}${x.t_basis === 'convention' ? ' (convention)' : ''} | ${fmtShort(x.gate_min)} | ${esc(x.place)} | ${x.used ? 'yes' : 'no'} |`);
  P('');
  if (c.pruned.length) { P('### Stops dropped because the layer cannot reach them'); P(''); P(c.pruned.map(x => `\`${x.unit}\` at ${x.stop} (late by ${x.late_min} min): dropped ${x.dropped.join(', ')}`).join('; ') + '.'); P(''); }
  return L;
}
