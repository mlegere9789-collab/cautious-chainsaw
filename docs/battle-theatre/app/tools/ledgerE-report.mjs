// History layer v8 (DEC-023E): what ledger E (history/positions/positions_E.jsonl, the state regimental volumes) adds to the layer, computed from the layer and the data for HISTORY-LAYER-NOTES.md.
//   (called by tools/history-report.mjs, field `ledgerE`, and by tools/history-notes.mjs; `node tools/history-report.mjs` prints it with the rest)
// Everything is a count or a list read from the layer built with ledger E and from the layer built without it (claims-ledger.withoutV8); nothing is typed.
import { createRealHistory } from '../src/history/real.mjs';
import { loadLedgers, unusable, withoutV8 } from './claim-ledger.mjs';
import { fmtShort } from '../src/clock.mjs';
const nf = n => Number(n).toLocaleString('en-US'), esc = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
export const helpers = { civilDawn: m => m + 4 * 60 + 3 };
// the words that mark a claim as a candidate for "detached from the field": the scan is a regular-expression read of the printed quote, the compiler's summary, the printed place and the printed time of every
// usable claim of the five ledgers; it lists, it never excludes (only a unit with a documented basis for the whole battle is excluded, by data/claim-curation.json `documented_absent`)
export const DETACHED = /not engaged|did not participate|took no part|not present|guard(?:ing|ed)? (?:the |a |corps |ordnance |wagon |supply )?(?:wagon |supply |ordnance |baggage )?trains?|(?:detail|detach)ed (?:to|for) (?:guard|duty)|in charge of (?:the )?(?:wagon|supply|trains)|left (?:at|in) (?:Taneytown|Westminster|Emmitsburg|Frederick|Union Mills|Manchester|Chambersburg|Winchester)|(?:remained|stayed|was left|were left) (?:at|in|with) (?:the )?(?:train|Westminster|Taneytown|Frederick|Union Mills|Manchester|Winchester)|with the (?:wagon |supply |ammunition |reserve )?trains?|provost guard|never on the field|did not arrive|did not reach/i;
// phrases that say the absence lasted the whole battle (a unit with one of these is the strongest candidate)
const WHOLE = /never on the field|not engaged in the battle|guarding corps trains|took no part in the battle|remained (?:with|at)|until relieved|till July/i;

export function ledgerEReport(raw, T) {
  const cd = raw.placementClaims, dp = raw.claimDispositions; if (!cd || !(cd.ledgers || {}).E) return null;
  const L = createRealHistory({ raw, T, helpers }), Lv7 = createRealHistory({ raw: { ...raw, placementClaims: withoutV8(cd) }, T, helpers });
  const led = loadLedgers(), E = led.claims.filter(c => c.ledger === 'E'), byTier = a => { const m = { documented: 0, inferred: 0, 'plausible-procedural': 0, other: 0 }; for (const c of a) m[c.tier in m ? c.tier : 'other']++; return m; };
  const rows = dp.rows.filter(r => r[1] === 'E'), claimById = new Map(led.claims.map(c => [c.claim_id, c])), eIds = new Set(E.map(c => c.claim_id));
  const dispOf = id => (rows.find(r => r[0] === id) || [])[4];
  const admitted = E.filter(c => /^(used|transcribed)/.test(dispOf(c.claim_id) || ''));
  const disp = {}; for (const r of rows) disp[r[4]] = (disp[r[4]] || 0) + 1;
  const codes = {}; for (const r of rows.filter(r => r[4] === 'unresolved')) codes[r[5]] = (codes[r[5]] || 0) + 1;
  const figs = lay => lay.units.filter(u => u.drawn).reduce((a, u) => a + u.strength.drawn, 0);
  const rep = L.report({}), rep7 = Lv7.report({});
  const snap = (lay, r) => ({ drawn: lay.counts.drawn, moving: lay.counts.moving, edge_only: lay.counts.edge_only, open_gap: lay.counts.not_drawn, not_on_field: lay.counts.not_on_field, documented_absent: lay.counts.documented_absent || 0, figures: figs(lay), approach_records: lay.placement.ap.length, stops: lay.placement.po.length, offsets: r.offsets.length, defects: r.defects.length, day_stops_applied: r.day_stops.filter(d => d.applied).length });
  const before = snap(Lv7, rep7), after = snap(L, rep);
  const by7 = new Map(Lv7.units.map(u => [u.id, u]));
  const newly = L.units.filter(u => u.drawn && !by7.get(u.id).drawn).map(u => ({ id: u.id, name: u.name, approach: u.approach.id, tier: u.approach.tier, status: u.render.status, figures: u.strength.drawn, offset: rep.offsets.find(o => o.unit === u.id) || null }));
  const changed = L.units.filter(u => u.strength.share !== by7.get(u.id).strength.share && !u.children.length && !(cd.documented_absent || []).some(a => a.unit === u.id)).map(u => ({ id: u.id, from: by7.get(u.id).strength.share, to: u.strength.share }));
  const approach = (cd.approach || []).filter(a => a.added_in === 'v8').map(a => ({ id: a.id, unit: a.unit, road: a.road, claim: a.claim, claims: a.claims, claim_tier: a.claim_tier, phrase: a.phrase, phrase_in: a.phrase_in, volume: cd.claims[a.claim].work, section: cd.claims[a.claim].report, page: cd.claims[a.claim].page, drawn: L.units.filter(u => u.drawn && u.approach && u.approach.id === a.id).length }));
  const stops = (cd.positions || []).filter(p => p.ledger === 'E').map(p => { const dr = L.units.filter(u => u.drawn && (u.id === p.units[0] || u.id.startsWith(p.units[0] + '-'))); return { id: p.id, unit: p.units[0], place: p.place, t: p.t, t_basis: p.t_basis, claim: p.claim, claim_tier: p.claim_tier, drawn_units: dr.length, disposition: dispOf(p.claim) }; });
  const absent = (cd.documented_absent || []).map(a => { const u = L.units.find(x => x.id === a.unit); return { ...a, render: u.render.status, tier: u.tier, drawn: u.drawn, strength: u.strength.drawn, figures_share_before: by7.get(a.unit).strength.share, claim_tiers: a.claims.map(id => `${id}:${(cd.claims[id] || {}).tier}`) }; });
  const earlier = (dp.earlier_than_gate || []).filter(x => x.ledger === 'E');
  // the gates: no gate of any unit moves (Q04), compared with the layer without ledger E
  const gate = (lay, id) => { const e = lay.model.effective(id, {}, helpers); return e ? e.earliest : null; };
  const gatesMoved = L.units.filter(u => !u.children.length && by7.get(u.id) && gate(L, u.id) !== gate(Lv7, u.id) && !(cd.documented_absent || []).some(a => a.unit === u.id)).length;
  // units that ledger E has claims for: drawn or not
  const unitsWithE = [...new Set(E.map(c => c.unit_id))], uBy = new Map(L.units.map(u => [u.id, u]));
  const eUnits = { with_claims: unitsWithE.length, in_roster: unitsWithE.filter(id => uBy.has(id)).length, drawn: unitsWithE.filter(id => uBy.has(id) && uBy.get(id).drawn).length };
  // candidates for "detached from the field": every usable claim of the five ledgers whose printed words match; the roster status and whether the unit is drawn are read from the layer
  const cands = new Map();
  for (const c of led.claims) {
    if (unusable(c)) continue; const s = c.source || {}, txt = [s.quote, c.activity, (c.place || {}).printed, (c.when || {}).printed].filter(Boolean).join(' | '), m = DETACHED.exec(txt); if (!m) continue;
    const u = uBy.get(c.unit_id); if (!u) continue; const e = cands.get(c.unit_id) || { unit: c.unit_id, name: u.name, status: u.status, render: u.render.status, drawn: u.drawn, leaf: !u.children.length, claims: [], whole: false };
    e.claims.push({ id: c.claim_id, tier: c.tier, ledger: c.ledger, hit: m[0] }); if (WHOLE.test(txt)) e.whole = true; cands.set(c.unit_id, e);
  }
  const candList = [...cands.values()].sort((a, b) => a.unit.localeCompare(b.unit));
  for (const e of candList) {
    const abs = (cd.documented_absent || []).some(a => a.unit === e.unit);
    e.verdict = abs ? 'excluded by this overlay (documented absence)' : e.status === 'never_on_field' || e.status === 'never_main_field' ? 'already not drawn: the roster lists it as never on the field' : !e.leaf ? 'a formation: its claims concern part of it or a time; not excluded' : e.whole && !e.drawn ? 'not drawn (open gap or edge); whole-battle wording present; owner to confirm' : e.whole ? 'DRAWN and whole-battle wording present: needs a decision' : 'a partial detail, a duty on one day, or a later arrival: not excluded (no documented basis for the whole battle)';
  }
  const sibCheck = L.units.filter(u => u.drawn && u.approach && u.approach.modelled).length;
  return { ledger: cd.ledgers.E, claims: { total: E.length, by_tier: byTier(E), usable: E.filter(c => !unusable(c)).length, admitted: admitted.length, admitted_by_tier: byTier(admitted), by_disposition: disp, unresolved_codes: codes, weak_source: E.filter(c => c.weak_source).length, ocr_uncertain: E.filter(c => c.ocr_uncertain).length, with_conflicts: E.filter(c => (c.conflicts_with || []).length).length, volumes: E.reduce((m, c) => { const k = c.source.volume; m[k] = (m[k] || 0) + 1; return m; }, {}) },
    before, after, newly, strength_shares_changed: changed, approach, stops, absent, earlier_than_gate: earlier, gates_moved: gatesMoved, e_units: eUnits, candidates: candList, modelled_units: sibCheck, offsets_new: newly.filter(n => n.offset).length, e_ids: eIds.size };
}

export function ledgerENotes(R) {
  if (!R) return [];
  const L = [], P = s => L.push(s), c = R.claims, b = R.before, a = R.after, d = (x, y) => (y - x >= 0 ? '+' : '') + nf(y - x);
  P('## History layer v8: ledger E, the state regimental volumes (contract 1.8, DEC-023E)'); P('');
  P(`Ledger E (\`history/positions/positions_E.jsonl\`, ${nf(c.total)} claims: ${c.by_tier.documented} documented, ${c.by_tier.inferred} inferred, ${c.by_tier['plausible-procedural']} plausible-procedural; after the independent audit and repair of 2026-10-30) cites a state regimental volume and a section of it (\`source.volume\`, \`source.section\`, \`source.work\`), not an OR27 \`report_id\`. The adapter (\`sourceOf\` and \`digest\` in \`tools/claim-ledger.mjs\`, the card words in \`real.mjs\` and \`card-sections.mjs\`) names the source of a claim whatever the ledger; **E claims are admitted by exactly the rules of A to D** (\`claim_support_verified\` true, \`fidelity_check\` passed_full_read or corrected, tier documented or inferred; every phrase literally in the claim's quote or printed words; a printed clock or period; a gazetteer place or road; the Q04 gates never moved; the curation table reviews every claim that passes the mechanical tests). A \`record\` phrase (checked against an OR27 record by \`tools/verify_claim_phrases.py\`) is refused for an E claim. The volumes: ${Object.entries(c.volumes).map(([k, v]) => `${k} ${v}`).join(', ')}.`); P('');
  P('| | |'); P('|---|---|');
  P(`| claims read | ${nf(c.total)} (usable ${nf(c.usable)}; weak-source flagged ${c.weak_source}; OCR-uncertain ${c.ocr_uncertain}; linked to a conflicting claim ${c.with_conflicts}) |`);
  P(`| **claims admitted** (drive an entry, support one, are recorded, or establish a documented absence) | ${c.admitted}: ${c.admitted_by_tier.documented} documented, ${c.admitted_by_tier.inferred} inferred |`);
  P(`| dispositions | ${Object.entries(c.by_disposition).sort().map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`).join(', ')} |`);
  P(`| left out, by reason | ${Object.entries(c.unresolved_codes).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`).join(', ')} |`);
  P(`| units with a claim of their own / in the roster / drawn now | ${R.e_units.with_claims} / ${R.e_units.in_roster} / ${R.e_units.drawn} |`);
  P(''); P('| | v7 (without ledger E) | v8 (with ledger E) | change |'); P('|---|---|---|---|');
  for (const [k, t] of [['drawn', 'units drawn'], ['moving', 'placed (a road and a place)'], ['edge_only', 'at the arrival edge only'], ['open_gap', 'open gap (leaf units, not drawn)'], ['not_on_field', 'not on the field (13 listed by the PDF ledger + documented absences)'], ['documented_absent', 'of them documented absent from the field (overlay)'], ['figures', 'figures drawn (one soldier per figure, no cap)'], ['approach_records', 'approach records'], ['stops', 'stop entries (PO)'], ['offsets', 'ledger-vs-edge offsets (card note, gate not moved)'], ['defects', 'defects (a timed place reached late)'], ['day_stops_applied', 'troop-map day stops applied']]) P(`| ${t} | ${nf(b[k])} | ${nf(a[k])} | ${d(b[k], a[k])} |`);
  P('');
  P(`**Previously undrawn units now drawn: ${R.newly.length}** (${R.newly.map(n => `\`${n.id}\` (${n.approach}, ${n.status}, ${nf(n.figures)} figures)`).join(', ') || 'none'}). Gates moved: ${R.gates_moved} (Q04: a gate is never moved by a claim). Offsets reported for the new units (the ledger time of the first place refers to a place farther along the road than the edge of the loaded ground; the card says so): ${R.offsets_new} of ${R.newly.length}${R.newly.filter(n => n.offset).length ? ': ' + R.newly.filter(n => n.offset).map(n => `\`${n.id}\` (${n.offset.stop}, ${n.offset.place}: ${(n.offset.distance_m / 1000).toFixed(1)} km farther along ${n.offset.road} than the edge; ${n.offset.late_min > 0 ? 'reached ' + Math.round(n.offset.late_min) + ' min late' : 'reached on time'})`).join('; ') : ''}.`); P('');
  P('Approach records added (tier inferred; the claim tier is shown on the card, with the volume, section, printed page, quoted words and the claims that conflict):'); P('');
  P('| approach | road | printed for | claim | volume, section, page | printed words | units drawn |'); P('|---|---|---|---|---|---|---|');
  for (const x of R.approach) P(`| ${x.id} | ${esc(x.road)} | \`${x.unit}\` | \`${x.claim}\` (${x.claim_tier}${x.claims.length > 1 ? '; supported by ' + x.claims.slice(1).map(k => '`' + k + '`').join(', ') : ''}) | ${esc(x.volume)}, ${x.section}, p. ${esc(x.page)} | “${esc(x.phrase)}” (${x.phrase_in}) | ${x.drawn} |`);
  P(''); P(`Stop entries read from ledger E: ${R.stops.length}${R.stops.length ? ' (' + R.stops.map(s => `${s.id} \`${s.unit}\` ${esc(s.place)} ${s.t.replace('T', ' ')}${s.t_basis === 'convention' ? ' (convention)' : ''}, claim tier ${s.claim_tier}, ${s.drawn_units} drawn unit${s.drawn_units === 1 ? '' : 's'}, ${s.disposition.replace(/_/g, ' ')}` ).join('; ') + ')' : ''}. Claims of ledger E dated before the gate of their own unit: ${R.earlier_than_gate.length} (kept in the data, listed in \`claim-dispositions.json\` \`earlier_than_gate\`, never applied: the gate is not moved).`); P('');
  P('Roads of ledger E that are **not** admitted, and why (the full reason of each claim is in `data/claim-curation.json`): positions inside the field are not roads of approach (DEC-012); the 3rd Division of the Cavalry Corps came from the east by Hunterstown and Two Taverns and its brigades print different continuations (none chosen); the 1st Division\'s Boonsboro-Fairfield route cannot be placed (RC-08); the Eleventh Corps 3rd Division prints only the circuitous route by Horner\'s Mills (RC-07) and a route through the town (no road); no claim names the Black Horse Tavern road for the Eleventh Corps, and the 26th Pennsylvania passes through Black Horse Tavern and takes "the right road to Gettysburg" (not named): the Third Corps\' 2nd Division stays an open gap (AP-07 does not cross the ground). For the 2nd Division of the Eleventh Corps the Emmitsburg Pike (154th NY sketch, inferred) is admitted; its Horner\'s Mills claim is listed on the card as a conflicting claim, neither resolved.'); P('');
  P('### The 84th Pennsylvania: documented absence (an overlay, not an edit of the PDF-derived files)'); P('');
  for (const x of R.absent) {
    P(`\`${x.unit}\` (roster status on_field, an open gap before v8 with a procedural share of ${nf(x.figures_share_before)} figures counted in its corps pool) is **documented absent from the field**: ${x.claims.length} claims (${x.claim_tiers.join(', ')}), decision ${x.decision}, evidence-gap entry \`${x.register}\` (tier ${x.tier}). Its card reads "With the supply train at Taneytown (documented, regimental account), not engaged" followed by the summary and every claim with its source, page, tier and quoted words; render status \`not_on_field\`, drawn ${x.drawn}, figures ${x.strength}; its strength is not counted in the field totals, so the procedural shares of the other leaf units of its corps pool rise (${R.strength_shares_changed.length} leaf units, from ${R.strength_shares_changed.length ? nf(R.strength_shares_changed[0].from) + ' to ' + nf(R.strength_shares_changed[0].to) : 'none'} each: the printed corps figure is shared by the leaf units on the field, as for the 13 units the PDF lists as never on the field). The source files \`history/units.json\` and \`not_on_field.json\` are not edited (the layer reads the status over the unit; \`tools/bt/check_arrivals.py\` still reads the PDF-derived file).`);
    P('');
  }
  P('Candidates for "detached from the field" in the five ledgers (a regular-expression read of the printed quote, summary, place and time of every usable claim; it **lists, it does not exclude**; only a unit with a documented basis for the whole battle is excluded):'); P('');
  P('| unit | roster status | drawn | claims (ledger, tier, words matched) | whole-battle wording | verdict |'); P('|---|---|---|---|---|---|');
  for (const e of R.candidates) P(`| \`${e.unit}\` | ${e.status.replace(/_/g, ' ')} | ${e.drawn ? 'yes' : 'no'} | ${e.claims.slice(0, 4).map(x => `\`${x.id}\` (${x.ledger}, ${x.tier}, “${esc(x.hit)}”)`).join('; ')}${e.claims.length > 4 ? ` and ${e.claims.length - 4} more` : ''} | ${e.whole ? 'yes' : 'no'} | ${esc(e.verdict)} |`);
  P('');
  P('Playwright specs to run once the Release 1 acceptance run has finished (not run here: no browser, no build, no long process while the machine is being measured): `tests/real.spec.mjs` (cards: the E source words, the absent card), `tests/arrival.spec.mjs` (counts, arrivals), `tests/scrub.spec.mjs` (no pop, units enter at their gates), `tests/leak.spec.mjs`, `tests/casualties.spec.mjs`, `tests/ui.spec.mjs` (about panel, card sections), `tests/perf.spec.mjs` (figures drawn rose from ' + nf(b.figures) + ' to ' + nf(a.figures) + '). `python tools/bt/check_figures.py --write` was run (short Python) and `data/figures-validation.json` rewritten for the new drawn set.');
  P('');
  return L;
}
