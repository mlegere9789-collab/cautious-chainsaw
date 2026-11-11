// THE REAL HISTORY LAYER (v1). Replaces the placeholder layer (stub.mjs) behind the same contract (contract.mjs, ../../data-contract.md).
// Fed by: history/units.json + arrivals.json + not_on_field.json (PDF B.2.4 ledger and B.3 order of battle), GOVERNANCE/conflicts_structured.json,
// structures/*.json, kit/kit_specs.json, data/gazetteer.json (named places, repository files only) and data/placement.json v2 (the reading of every position clause of the 44 ledger rows, validated).
//
// What this layer says and what it does not (details: app/HISTORY-LAYER-NOTES.md):
//  * which units exist and their ledger arrival windows (earliest = the hard gate, Q04), with the source conflicts as selectable scenarios;
//  * a unit is DRAWN only if the ledger gives it, or a formation above it, a road of approach that crosses the loaded ground (inheritance down the line of command: tier inferred below the corps,
//    plausible-procedural under a corps-level road); its places after arrival only where a clause prints a dated place the gazetteer can resolve. Everything else is an open gap, shown as such, never guessed;
//  * strengths: printed single figures for 13 corps rows and 8 brigades; everything below them is a procedural share, labelled so;
//  * movement is a march along the named road at drill speed. A unit enters at its gate; where the ledger time of its first place refers to a place farther from the edge of the loaded ground than the time allows, the
//    unit arrives later and the difference is a reported data property (report().offsets, the card), never hidden and never closed by moving the gate;
//  * a departure, an activity or a formation exists only where a clause prints it.
import { ArrivalModel } from './arrivals.mjs';
import { allocateStrengths, isLeafLevel, onField } from './strength.mjs';
import { Gazetteer, bearingDegLL, polylineLength, distM, nearestOnLine, simplify } from './gazetteer.mjs';
import { Placement, planTracks, legRoute, PLAN } from './placement.mjs';
import { DayPositions, itemsOf, STATE_RULE, EVENING_BASIS, eveningOf } from './daypos.mjs';
import { depthOf, slotKind } from '../layout.mjs';
import { isoToMin, fmtShort } from '../clock.mjs';
import { buildKit } from './kit.mjs';
import { buildObjects } from './objects.mjs';
import { fateModel, describeLoss, lossPools, windowIndex, windowsOf, solvePlan, runningState, CAS_TIER, BASIS_LOSS_PRINTED, BASIS_LOSS_PROCEDURAL, FATE_BASIS } from './casualties.mjs';
import { FORMATION_SECONDS } from './contract.mjs';
import { createFigures, RENDERER_SUPPORT } from './figures.mjs';
import { SEED } from '../config.mjs';

// speeds (m/s). march: the shell's own marching speed (config of the prototype world, 1.25 m/s = 4.5 km/h). double-quick: Hardee 1861 prints 4,000 yards in about 25 minutes
// (drill/drill_hardee.json, claim check on the Hardee text) = 2.44 m/s. Cavalry has no rate in the repository: it uses the march rate here (a model parameter, not a claim).
export const SPEED = { march: 1.25, double_quick: 4000 * 0.9144 / (25 * 60) };
export const DAY_SOURCE = { J1: 'BACH-1876-S1', J2: 'BACH-1876-S2', J3: 'BACH-1876-S3', H: 'LOC-99447494' };
const WEAK = [/^W-/, /^OOB-/, /^EPP$/, /^CWT/, /^PADRE$/, /^WHB/, /^SS/, /^STONE-RES$/, /^SStone/];
const LEAD = [/^EPP$/, /^CWT/, /^PADRE$/, /^WHB/];
const tidyName = s => String(s ?? '').replace(/(\w)�(\w)/g, '$1’$2').replace(/(^|[\s(])�/g, '$1“').replace(/�/g, '”').replace(/\s+/g, ' ').trim();
const kindOfSource = k => (/^OR/.test(k) ? 'primary' : LEAD.some(r => r.test(k)) ? 'lead' : 'secondary');
const weakKey = k => WEAK.some(r => r.test(k));
const bearingToUnit = deg => (deg + 360) % 360;
const SIDE = { US: 'union', CS: 'confederate' };

export function createRealHistory({ raw, T, helpers = {} }) {          // T: anything with .meta {lng0,lng1,lat0,lat1}, the box of the loaded ground
  // documented absences (history layer v8, DEC-023E; data/placement-claims.json `documented_absent`, checked by placement.validate): a leaf unit that claims of the record place away from the field for the whole battle is
  // not drawn and its strength is not counted in the field totals. The source files (history/units.json, not_on_field.json) are not edited: the unit is read here with the status 'documented_absent' (the ledger status is kept).
  const absentBy = new Map((((raw.placementClaims || {}).documented_absent) || []).map(a => [a.unit, a]));
  const U = raw.units.units.map(u => (absentBy.has(u.id) ? { ...u, status: 'documented_absent', status_ledger: u.status } : u)), by = new Map(U.map(u => [u.id, u]));
  const box = { lng0: T.meta.lng0, lng1: T.meta.lng1, lat0: T.meta.lat0, lat1: T.meta.lat1 };
  const am = new ArrivalModel({ units: U, arrivals: raw.arrivals, notOnField: raw.notOnField });
  const gaz = new Gazetteer(raw.gazetteer);
  const { strengths, pools, claimed } = allocateStrengths(U);
  const gateOf = id => { const e = am.effective(id, {}, helpers); return e ? e.earliest : -Infinity; };      // the default-scenario hard gate (Q04): a clause that falls before it does not apply to the unit
  const placement = new Placement({ doc: raw.placement, claimsDoc: raw.placementClaims || null, siblingDoc: raw.siblingApproach || null, gaz, units: U, rows: raw.arrivals.rows, box, gateOf });
  const problems = placement.validate(); if (problems.length) throw new Error('placement.json does not hold: ' + problems.join('; '));

  // ---- formation defaults (plausible-procedural: the ledger prints no formation) and what is drawn
  const arm = u => u.arm || (u.level === 'person' ? 'staff' : 'headquarters');
  const formationOf = u => (u.children.length ? { kind: 'column_mass', ranks: 1, facing_default_deg: null, tier: 'plausible-procedural', note: 'aggregate; not drawn' }
    : arm(u) === 'cavalry' ? { kind: 'mounted_column', ranks: 1, facing_default_deg: null, tier: 'plausible-procedural', note: 'a column of eights; the ledger prints no formation' }
    : arm(u) === 'artillery' ? { kind: 'battery', ranks: 1, facing_default_deg: null, tier: 'plausible-procedural', note: 'drawn as a block of crew figures; gun counts are an open gap (kit/artillery_batteries.json) and no guns are drawn' }
    : { kind: 'column_fours', ranks: 1, facing_default_deg: null, tier: 'plausible-procedural', note: 'a column of fours; the ledger prints no formation (a printed “deploys” gives a second layout, drawn as a change of formation: formation.changes)' });
  // where a ledger claim comes from, in words: an OR27 report (ledgers A to D) or a section of a state regimental volume (ledger E, history layer v8)
  const srcWords = c => (c.source_kind === 'statevol' ? `state regimental volume ${c.work || c.volume}, section ${c.report}` : `OR27 report ${c.report}`);
  const index = new Map(U.map((u, i) => [u.id, i]));
  const cand = U.filter(u => isLeafLevel(u) && onField(u) && !am.notOnField(u.id) && strengths.get(u.id).drawn > 0);
  const stub = u => ({ arm: arm(u), formation: formationOf(u) });
  const leaves = cand.map(u => { const kind = slotKind(stub(u)), n = strengths.get(u.id).drawn; return { id: u.id, index: index.get(u.id), kind, count: n, depth: depthOf(kind, n) }; });
  // day-level positions of the troop maps (contract 1.5): the digest data/daypositions.json, absent in a layer built without it (then nothing below changes)
  const dayPos = raw.dayPositions ? new DayPositions({ doc: raw.dayPositions, units: U }) : null;
  if (dayPos) { const dp = dayPos.validate(); if (dp.length) throw new Error('daypositions.json does not hold: ' + dp.slice(0, 6).join('; ')); }
  const plans = planTracks({ leaves, placement, gaz, box, unitById: by, dayPos, startOf: id => { const e = am.effective(id, {}, helpers); return e ? e.default : null; }, marchMps: SPEED.march });
  const drawnIds = new Set([...plans].filter(([, p]) => p.status === 'moving' || p.status === 'edge_only').map(([id]) => id));

  // ---- casualties (contract 1.3): shares of the printed losses, their fate ranges, the printed engagement windows (casualties.mjs). Everything is plausible-procedural and weak-sourced; no regimental figure is read.
  const fmtN = n => Number(n).toLocaleString('en-US'), armyKey = u => (u.army === 'US' ? 'union' : 'confederate');
  const fm = raw.casualtySources ? fateModel(raw.casualtySources) : null;
  const widx = raw.engagements ? windowIndex(raw.engagements) : new Map();
  const lp = fm ? lossPools({ pools, claimed, strengths, byId: by, isOnField: onField }) : { shares: new Map(), pools: [] };
  const poolOf = new Map(lp.pools.map(p => [p.owner, p]));
  function casualtiesOf(u) {
    const none = (why, tier = 'inferred') => ({ kind: 'none', total: null, fates: null, basis: why, fate_basis: null, tier, weak_source: false, sources: [], windows: [], engagement_clauses: [], engaged: false });
    if (!fm) return none('casualty data is not available to this layer', 'open gap');
    const printedLost = u.strength && Number.isFinite(u.strength.lost) ? u.strength.lost : null, share = lp.shares.get(u.id);
    let L, kind, basis, owner = null;
    if (printedLost != null) { L = printedLost; kind = 'printed'; basis = `${BASIS_LOSS_PRINTED}; "${u.strength.label}", lost ${fmtN(L)}`; }
    else if (share != null) {
      const own = strengths.get(u.id).pool_owner, pl = poolOf.get(own); kind = 'procedural'; L = share; owner = own;
      basis = `${BASIS_LOSS_PROCEDURAL}. Share ${fmtN(L)} = ${fmtN(pl.pool_lost)} (${tidyName(by.get(own).name_printed || by.get(own).name)} printed loss${pl.sub_lost ? ` less ${fmtN(pl.sub_lost)} printed for its sub-units` : ''}) / ${pl.leaves_on_field} leaf units on the field.`;
    } else return none(u.children.length ? 'aggregate: its leaf units carry the shares; no loss is printed for this unit' : (!onField(u) || am.notOnField(u.id)) ? 'not on the field (PDF B.2.4 gating rule 2): no loss is assigned' : 'no printed loss figure for this unit or any formation above it', u.children.length || !onField(u) ? 'inferred' : 'open gap');
    const d = describeLoss(L, fm[armyKey(u)]), w = windowsOf(u.id, by, widx);
    return { kind, ...d, basis, fate_basis: FATE_BASIS, tier: CAS_TIER, printed_tier: kind === 'printed' ? 'inferred' : null, weak_source: true, sources: ['PDF-B3', 'SS-B3', 'PDF-B1', 'OR27-CAS', ...(w.windows.length ? ['PDF-TL'] : [])], pool_owner: owner, windows: w.windows, engagement_clauses: w.clauses, engaged: w.windows.length > 0 };
  }
  // guns (contract 1.3): drawn only where the kit data STATES a count for the battery and the battery is drawn; no default count is ever applied
  const bg = raw.batteryGuns || { matched: [], combined: [], unmatched: [], detachment: null };
  const gunsMatched = new Map(bg.matched.map(m => [m.history, m])), gunsCombined = new Map(bg.combined.flatMap(c => c.history.map(h => [h, c])));
  const kitSrc = k => { const all = (raw.kit && raw.kit.sources) || {}; return all[k]; };
  function gunsOf(u, drawn) {
    if (u.children.length || arm(u) !== 'artillery') return { status: 'not_applicable', count: null, reason: u.children.length ? 'a formation above the batteries: its batteries carry the guns' : 'not an artillery unit', tier: 'inferred', sources: [] };
    const m = gunsMatched.get(u.id), c = gunsCombined.get(u.id), det = bg.detachment;
    if (m && m.total) {
      const piece = ((raw.kitWeapons && raw.kitWeapons.artillery && raw.kitWeapons.artillery.pieces) || {})[(m.guns[0] || {}).type_id], r5 = piece && piece.table && piece.table.range_5deg_yd ? Math.round(piece.table.range_5deg_yd * 0.9144) : null;
      const base = { count: m.total, range_5deg_m: r5, types: m.guns, printed: m.guns_printed, kit_battery: m.kit, tier: m.tier, weak_source: m.weak_source, sources: ['KIT-GUNS', ...m.source_keys], conflicts: m.conflicts, crew_per_gun: det ? det.crew_per_piece : null, crew_basis: det ? det.basis : null };
      if (drawn) return { status: 'drawn', ...base, reason: null, limbers: 'not drawn: the renderer has no limber, caisson or team model; the kit data gives two six-horse teams per gun and the limber about 10-15 yd behind the piece (inferred)' };
      return { status: 'not_drawn', ...base, reason: `a gun count is stated (${m.guns_printed}) but this battery is not drawn: ${onField(u) ? 'no place' : 'not on the field'}` };
    }
    if (m) return { status: 'not_drawn', count: null, types: m.guns, printed: m.guns_printed, kit_battery: m.kit, tier: m.tier, weak_source: m.weak_source, sources: ['KIT-GUNS', ...m.source_keys], reason: `the gun type is stated (${m.guns_printed}) but no count: not drawn` };
    if (c) return { status: 'not_drawn', count: null, printed: c.guns_printed, kit_battery: c.kit, tier: 'open gap', sources: ['KIT-GUNS'], reason: c.reason };
    return { status: 'not_drawn', count: null, tier: 'open gap', sources: ['KIT-GUNS'], reason: 'no stated gun count (PDF B.6.14 gap: gun types are stated for 29 of 125 batteries); no default count is applied' };
  }

  // ---- sources
  const sources = {
    'PDF-B1': { key: 'PDF-B1', label: 'Plan v2 Part B.1: headline strengths and casualties', kind: 'secondary', weak: true, citation: 'Gettysburg Total War animation plan, version 2, B.1 (the table of Wikipedia, Stone Sentinels, Busey and Martin as quoted, and Civil War Medicine museum figures). The PDF says the Confederate record is structurally weak and that no count may be a single number. docs/battle-theatre/app/data/casualty-sources.json.' },
    'OR27-CAS': { key: 'OR27-CAS', label: 'OR vol. 27 casualty figures (Return of Casualties, Letterman), confirmed by the claim check', kind: 'primary', weak: false, citation: 'library/or27_claim_checks.json items n and s: Union total 23,049 (one OCR-read cell) and Letterman’s wounded 14,193; Guild’s Confederate columns are partly garbled and are not used for fractions. A second witness has not been compared.' },
    'PDF-TL': { key: 'PDF-TL', label: 'Plan v2 Part B.2 master timeline rows (seeded_unverified)', kind: 'secondary', weak: false, citation: 'GOVERNANCE/timeline_seed.jsonl and timeline_windows.jsonl: rows stay unverified until checked against a primary source; library/timeline_audit_T*.jsonl holds the OR27 verdict of each row. docs/battle-theatre/app/data/engagements.json.' },
    'KIT-GUNS': { key: 'KIT-GUNS', label: 'Kit data: gun counts stated for batteries (PDF B.6.14)', kind: 'secondary', weak: false, citation: 'docs/battle-theatre/kit/artillery_batteries.json; docs/battle-theatre/app/data/battery-guns.json (built by tools/build-guns.mjs). Gun types are stated for 29 of 125 batteries; the rest are a PDF gap and are drawn without guns.' },

    'PDF-B3': { key: 'PDF-B3', label: 'Plan v2 Part B.3: order of battle', kind: 'secondary', weak: true, citation: 'Gettysburg Total War animation plan, version 2, B.3 (pp. 64-65). The PDF itself calls the unit counts "not sourced" and takes the lists from a fetched order of battle; regimental commanders were stripped. docs/battle-theatre/history/units.json.' },
    'PDF-B24': { key: 'PDF-B24', label: 'Plan v2 Part B.2.4: unit arrival and departure ledger', kind: 'secondary', weak: false, citation: 'Gettysburg Total War animation plan, version 2, B.2.4 (pp. 59-63). Row-level source keys are carried; claim_support_verified is false for every row. docs/battle-theatre/history/arrivals.json.' },
    'SS-B3': { key: 'SS-B3', label: 'Stone Sentinels corps strengths as printed in the B.3 table', kind: 'secondary', weak: true, citation: 'Stone Sentinels figures (caveats in PDF B.1) as printed in the B.3 table heading: 13 corps rows and 8 brigades. A weak source in the project rules.' },
    'GAZETTEER': { key: 'GAZETTEER', label: 'Gazetteer of named places', kind: 'secondary', weak: false, citation: 'docs/battle-theatre/app/data/gazetteer.json, built by tools/build-gazetteer.mjs from the basemap1863 roads, water, landcover and structures layers and the site tour stops and monuments. Where a name sits on the map; not a position of any unit.' },
    'PLACEMENT': { key: 'PLACEMENT', label: 'Curated reading of printed ledger cells (approach roads, dated places)', kind: 'secondary', weak: false, citation: 'docs/battle-theatre/app/data/placement.json: each entry quotes the printed phrase and is refused at load if the phrase is not in the cell.' },
    'HARDEE-1861': { key: 'HARDEE-1861', label: 'Hardee 1861, double-quick rate', kind: 'primary', weak: false, citation: 'Hardee, Rifle and Light Infantry Tactics (1861): 4,000 yards in about 25 minutes at double quick (docs/battle-theatre/drill/DRILL-HARDEE-NOTES.md, claim-checked against the text).' },
    'OR27-POS': { key: 'OR27-POS', label: 'OR vol. 27: the position ledgers (claims read for approach roads, stops and departures)', kind: 'primary', weak: false, citation: 'docs/battle-theatre/history/positions/positions_{A,B,C,D}.jsonl (ledger B is read only once its re-read is complete): one claim per statement of an Official Records report, with the report id, the printed page and a quote checked against the report text. Only claims with claim_support_verified true and fidelity_check passed_full_read or corrected are read. Each entry in app/data/placement-claims.json names its claim; the placement tier stays inferred because the place or road is a repository gazetteer entry (the gazetteer is inferred). Conflicting reports are listed, never resolved.' },
    ...(dayPos ? {
      'BACH-1876-S1': { key: 'BACH-1876-S1', label: 'Bachelder 1876, Gettysburg battle map, sheet 1: First day’s battle (LOC 99447491)', kind: 'secondary', weak: false, citation: 'J. B. Bachelder, positions compiled for the War Department from official reports, private letters and consultations, Boston 1876 (Library of Congress 99447491, public domain). Compiled 13 years after the battle from the Official Records and testimony, so not independent of them (tier 2 contemporary map, PDF E.1). A day-level position: it says where the unit’s line stood on the day, never at what time (DEC-010). history/positions/troopmap_jul1_b1876.jsonl; georeference and its error: terrain/troopmaps/ACCURACY.md.' },
      'BACH-1876-S2': { key: 'BACH-1876-S2', label: 'Bachelder 1876, Gettysburg battle map, sheet 2: Second day’s battle (LOC 99447491)', kind: 'secondary', weak: false, citation: 'J. B. Bachelder, Boston 1876 (Library of Congress 99447491, public domain); the same compilation and the same limits as sheet 1. history/positions/troopmap_jul2_b1876.jsonl; terrain/troopmaps/ACCURACY.md.' },
      'BACH-1876-S3': { key: 'BACH-1876-S3', label: 'Bachelder 1876, Gettysburg battle map, sheet 3: Third day’s battle (LOC 99447491)', kind: 'secondary', weak: false, citation: 'J. B. Bachelder, Boston 1876 (Library of Congress 99447491, public domain); the same compilation and the same limits as sheet 1. history/positions/troopmap_jul3_b1876.jsonl; terrain/troopmaps/ACCURACY.md.' },
      'LOC-99447494': { key: 'LOC-99447494', label: 'LOC 99447494: Battle of Gettysburg, July 1, 1863, first day, general position of troops, 2 to 3.30 P.M.', kind: 'secondary', weak: true, citation: 'Library of Congress 99447494 (plate II, topography after the Warren survey). The Library gives the author as unknown and the date as 19??: the sheet’s author, compiler and date of publication are not established, so every claim read from it is tier inferred and a weak source. history/positions/troopmap_jul1_hour_loc99447494.jsonl.' },
    } : {}),
    ...(((raw.placementClaims || {}).ledgers || {}).E ? { 'STATEVOL-POS': { key: 'STATEVOL-POS', label: 'State regimental volumes (New York, Pennsylvania, Michigan at Gettysburg, and others): the position ledger E', kind: 'secondary', weak: false, citation: 'docs/battle-theatre/history/positions/positions_E.jsonl: one claim per statement of a state commission’s volume of dedication addresses, regimental sketches and monument inscriptions (published 1889 to 1914), each with the volume, the section, the printed page (a range where the running heads were lost), a verbatim quote of under 15 words checked inside the cited section, and its tier: documented only where the unit’s own officer (or its own monument inscription) states the fact, inferred otherwise. Retrospective accounts, weaker than the reports of the day; a conflict with an OR27 claim is linked, never resolved. Only claims with claim_support_verified true and fidelity_check passed_full_read or corrected are read.' } } : {}),
    ...Object.fromEntries([...absentBy.values()].map(a => [a.register, { key: a.register, label: `Documented absence from the field (${a.decision}): ${a.unit}`, kind: 'register', weak: false, citation: `GOVERNANCE/register/${a.register}.md; docs/battle-theatre/app/data/placement-claims.json (documented_absent). The record places the unit away from the field for the whole battle; it is not drawn and its strength is not counted in the field totals.` }])),
    'EG-0001': { key: 'EG-0001', label: 'Evidence gap: individual soldier face, position and action', kind: 'register', weak: false, citation: 'GOVERNANCE/register/EG-0001.md' },
    ...(raw.siblingApproach ? { 'EG-0070': { key: 'EG-0070', label: 'Evidence gap: road of approach modelled from the sibling formations of the corps (DEC-015)', kind: 'register', weak: false, citation: 'GOVERNANCE/register/EG-0070.md; docs/battle-theatre/app/data/sibling-approach.json. No report names a road of approach for the unit or any formation above it; the road is the one every documented sibling formation of its corps names. A modelled reconstruction (plausible-procedural), not a record.' } } : {}),
    'EG-0005': { key: 'EG-0005', label: 'Evidence gap: primary sources unread (OR 27, Busey and Martin, regimental histories)', kind: 'register', weak: false, citation: 'GOVERNANCE/register/EG-0005.md' },
  };
  for (const r of raw.arrivals.rows) for (const k of r.source_keys.all) if (!sources[k]) sources[k] = { key: k, label: k, kind: kindOfSource(k), weak: weakKey(k), citation: 'Source key as printed in the PDF B.2.4 ledger row ' + r.id + '. The key legend is in the PDF source list; whether it supports a particular time is not verified (claim_support_verified false).' };
  const kitAll = (raw.kit && raw.kit.sources) || {};
  const addKitSource = k => { if (sources[k] || !kitAll[k]) return; const c = kitAll[k]; sources[k] = { key: k, label: c.label, kind: /^primary/.test(c.class || '') ? 'primary' : c.class === 'lead' ? 'lead' : 'secondary', weak: !!c.weak || weakKey(k), citation: `${c.origin || 'kit source'}${c.url ? ' ' + c.url : ''}; claim_support_verified ${!!c.claim_support_verified}. From docs/battle-theatre/kit.` }; };
  for (const m of bg.matched) for (const k of m.source_keys) addKitSource(k);

  // ---- the units, in the order of units.json (index i is also the renderer's index)
  const rowSources = u => { const r = am.row(u.id); return r ? r.source_keys.all : []; };
  // ---- how a drawn unit comes to have a road: the printed road of the nearest formation on its own line of command (inheritance). Tier: 'inferred' where that formation is below the corps (division, brigade, the unit itself),
  //      'plausible-procedural' where only the corps-level road is printed. The place in the column is the ledger's order (roster order) and is plausible-procedural: the order of march within a column is an open gap.
  const TIER_RANK = { documented: 3, inferred: 2, 'plausible-procedural': 1, 'open gap': 0 }, weaker = (a, b) => (TIER_RANK[a] <= TIER_RANK[b] ? a : b);
  const claimRef = id => placement.claims[id] || null;
  const hhmm = m => fmtShort(m).slice(-5), kmText = m => (m / 1000).toFixed(1);
  // what is documented and what is modelled for an approach read from a claim: the road as printed (a position statement, or a period name identified by the road-name concordance, DEC-014) and the minute at the edge and the place in the column
  const modelled = ' Modelled: when the unit reaches the edge of the ground (the date of the claim is not used: the unit comes from its arrival gate, never earlier, and the minute inside its arrival window is a scenario choice) and its place in the column.';
  const docModel = (entry, plan) => entry.concordance
    ? ` Documented: the road name as the report prints it (report and page above)${(entry.concordance.labels || []).length ? '; period-map labels of the road: ' + entry.concordance.labels.join('; ') + ' (no sheet prints the name the report uses)' : ''}. Modelled: the identification of that name with the gazetteer\u2019s ${plan.road} (concordance ${entry.concordance.id}, tier ${entry.concordance.tier}, evidence in ${entry.concordance.file}), when the unit reaches the edge of the ground (the date of the claim is not used: the unit comes from its arrival gate, never earlier, and the minute inside its arrival window is a scenario choice) and its place in the column.`
    : entry.claim_kind ? ` Documented: the position statement (report and page above): the formation stood on the road before it reached the field. Modelled: reading it as the road of approach, when the unit reaches the edge of the ground (the date of the claim is not used: the unit comes from its arrival gate, never earlier, and the minute inside its arrival window is a scenario choice) and its place in the column.`
    : ' Documented: the road of approach (report and page above).' + modelled;
  // a MODELLED road (v6, DEC-015): nothing is printed for the unit or any formation above it; the road is the one every documented sibling formation of the corps names
  function siblingCard(u, plan, owner, entry, inherited, tier, lvl) {
    const sibText = s => `${tidyName(s.unit_name)} (${s.ap}: ${s.road}; ${s.source === 'claim' ? `${srcWords(s)}, page ${s.page}, position-ledger claim ${s.claim}, claim tier ${s.claim_tier}` : `PDF ledger row ${s.row}, ${String(s.cell).replace(/_/g, ' ')} cell`}; “${s.phrase}”${s.concordance ? `; the printed name “${s.printed_name}” is identified with this road by concordance ${s.concordance}` : ''}; approach tier ${s.tier})`;
    const n = entry.siblings.length, corps = tidyName(by.get(entry.formation).name);
    const dd = x => `${+x.slice(8)} ${x.slice(5, 7) === '06' ? 'Jun' : 'Jul'}`, days = dayPos ? dayPos.forUnit(u.id).days.filter(d => d.status === 'single' || d.status === 'sequence').flatMap(d => itemsOf(d).map(it => ({ sheet: d.sheet, c: it.claim, state: it.state }))) : [];
    const dayTxt = days.length ? days.map(d => `Bachelder 1876 sheet ${d.sheet.slice(1)} (${dd(d.c.date)}), label “${d.c.printed}” (${d.c.id}), ± ${Math.round(d.c.sigma_m)} m${d.state ? ', line state ' + d.state.replace(/_/g, ' ') : ''}`).join('; ') : 'none on a day sheet';
    const text = `MODELLED APPROACH (plausible-procedural; evidence gap ${entry.register}, decision ${entry.decision}). Approach ${entry.id}: ${plan.road} for ${tidyName(owner.name)}${inherited ? `; this ${lvl(u)} marches in the column of its ${lvl(owner)} (inherited)` : ''}. No report of this unit or of any formation above it prints a road of approach for it, so none is documented. The road is taken from the other formations of ${corps}: ${n === 1 ? 'the one documented sibling names' : `all ${n} documented siblings name`} ${plan.road}, and no report on this unit’s line of command names another road, a road the repository cannot place or a road outside the loaded ground. Siblings: ${entry.siblings.map(sibText).join('; ')}. The unit may in fact have come by another road. Approach tier ${tier}. Documented: the unit’s arrival gate (${fmtShort(gateOf(u.id))}; it is never moved) and its position on each day it has one: ${dayTxt} (day level; the troop-map section below has the rest). Modelled: the road, when the unit reaches the edge of the ground (from its gate, never earlier; the minute inside its arrival window is a scenario choice) and its place in the column. Place in the column: ${plan.columnIndex} of ${plan.columnSize}, in roster order (the ledger's order; plausible-procedural). The order of march within a column is an open gap (evidence gap EG-0005: primary sources unread).`;
    return { id: entry.id, road: plan.road, phrase: entry.siblings[0].phrase, row: null, cell: null, kind: 'sibling', modelled: true, formation: entry.formation, siblings: entry.siblings, claims: entry.claims, register: entry.register, decision: entry.decision, owner: owner.id, owner_level: owner.level, inherited, tier, column: { index: plan.columnIndex, size: plan.columnSize, basis: 'roster order = ledger order; plausible-procedural' }, text };
  }
  function approachCard(u, plan) {
    const owner = by.get(plan.approachOwner), entry = placement.ap.find(a => a.id === plan.approach), inherited = plan.approachDepth > 0, corpsLevel = owner.level === 'corps' || owner.level === 'army';
    const tier = corpsLevel ? 'plausible-procedural' : (entry.tier || 'inferred'), lvl = x => x.level.replace(/_/g, ' ');
    if (entry.kind === 'sibling') return siblingCard(u, plan, owner, entry, inherited, tier, lvl);
    const cl = entry.claim ? claimRef(entry.claim) : null;
    const where = cl ? `printed in ${srcWords(cl)}${cl.author ? ' (' + cl.author + ')' : ''}, page ${cl.page}${cl.interpolated ? ' (page interpolated)' : ''}, position-ledger claim ${cl.id} (ledger ${cl.ledger}, fidelity check ${cl.fidelity.replace(/_/g, ' ')}, claim tier ${cl.tier}; the road is the gazetteer's ${entry.road})` : `printed in the ${entry.cell.replace(/_/g, ' ')} cell of ledger row ${entry.row}`;
    const text = `Approach ${entry.id}: ${plan.road}, ${where} (“${entry.phrase}”) for ${tidyName(owner.name)}${inherited ? `; this ${lvl(u)} marches in the column of its ${lvl(owner)} (inherited)` : ''}. Approach tier ${tier}${corpsLevel ? ' (only the corps-level road is printed)' : inherited ? ' (the road is printed for a formation of its own line of command)' : ' (the road is printed for the unit itself)'}.${entry.inference ? ` Inference: ${entry.inference}.` : ''}${entry.claim ? docModel(entry, plan) : ''} Place in the column: ${plan.columnIndex} of ${plan.columnSize}, in roster order (the ledger's order; plausible-procedural). The order of march within a column is an open gap (evidence gap EG-0005: primary sources unread).`;
    return { id: entry.id, road: plan.road, phrase: entry.phrase, row: entry.row || null, cell: entry.cell || null, ...(cl ? { claim: cl.id, claims: entry.claims, ledger: cl.ledger, report: cl.report, page: cl.page, claim_tier: entry.claim_tier, phrase_in: entry.phrase_in } : {}), owner: owner.id, owner_level: owner.level, inherited, tier, modelled: false, column: { index: plan.columnIndex, size: plan.columnSize, basis: 'roster order = ledger order; plausible-procedural' }, register: 'EG-0005', text };
  }
  const offsetNote = plan => { const s = plan.stops[0]; if (!s) return ''; const D = polylineLength(s.route); return `Enters the map where ${plan.road} leaves the loaded ground; the ledger time (${hhmm(s.t_doc)} at ${s.place}) refers to a place ${kmText(D)} km farther on.`; };
  // a sentence on the troop-map day positions of a drawn unit that cannot be drawn (outside the loaded ground, or unreachable from the unit's start before the day ends)
  const dayWhy = plan => { const bad = ((plan && plan.days) || []).filter(d => !d.feasible || d.reachable_default === false); return bad.length ? ' Troop-map day position(s) not drawn: ' + bad.map(d => `${d.claim} (${d.date.slice(5)}): ${!d.feasible ? d.why_not : 'the unit cannot reach it from its start before the window closes'}`).join('; ') + '.' : ''; };
  // the card text of a documented absence: what the claims say, with the source, page, tier and quoted words of each (no word of it is mine but the summary the curation table wrote from those claims)
  const absenceText = a => {
    const cl = a.claims.map(id => (raw.placementClaims.claims || {})[id]).filter(Boolean);
    return `With the supply train at Taneytown (documented, regimental account), not engaged: the record places this unit away from the field, so it is not drawn and its strength is not counted. ${a.summary} Documented by ${cl.length} claim${cl.length === 1 ? '' : 's'} (decision ${a.decision}, evidence gap ${a.register}): ${cl.map(c => `${c.id} (${srcWords(c)}, page ${c.page}${c.interpolated ? ', page interpolated' : ''}, claim tier ${c.tier}): “${c.quote}”`).join('; ')}.`;
  };
  const units = U.map((u, i) => {
    const s = strengths.get(u.id), plan = plans.get(u.id), drawn = drawnIds.has(u.id), leaf = cand.includes(u) || isLeafLevel(u);
    const nm = tidyName(u.name), parent = u.parent ? tidyName(by.get(u.parent).name) : null;
    const strength = { min: s.min, max: s.max, drawn: drawn ? s.drawn : 0, share: s.drawn, basis: absentBy.has(u.id) ? `documented absent from the field (${absentBy.get(u.id).register}, ${absentBy.get(u.id).decision}): no figure is drawn and none is counted in the field totals` : s.basis, tier: s.tier, sources: s.sources, weak_source: s.weak_source, kind: s.kind };
    let render, tier, why, approach = null;
    if (drawn) { approach = approachCard(u, plan); render = plan.status; tier = 'plausible-procedural'; why = plan.status === 'moving' ? (plan.stops.length ? `Placed by a printed approach road and dated place(s); slot inside the place, strength share and formation are plausible-procedural. ${approach.text} ${offsetNote(plan)}` : `Placed by a printed approach road and a day-level position of the troop maps (documented for the day; the time it got there is modelled, the card says between when and when); slot inside the position, strength share and formation are plausible-procedural. ${approach.text}`) + dayWhy(plan) : `Shown only where its approach road leaves the loaded ground: ${plan.reason}. ${approach.text}${dayWhy(plan)}`; }
    else if (absentBy.has(u.id)) { render = 'not_on_field'; tier = 'documented'; why = absenceText(absentBy.get(u.id)); }
    else if (u.children.length) { render = 'aggregate'; tier = 'inferred'; why = 'A formation above the regiments; its leaf units carry the figures and are drawn when they have a place.'; }
    else if (!onField(u) || am.notOnField(u.id)) { render = 'not_on_field'; tier = 'inferred'; why = 'Listed as never or only partly on the field (PDF B.2.4 gating rule 2): not drawn.'; }
    else { render = 'not_drawn'; tier = 'open gap'; const sv = raw.siblingApproach && raw.siblingApproach.leaves && raw.siblingApproach.leaves[u.id]; why = plan ? `Open gap: ${plan.reason}.${sv && sv.status === 'open' && sv.code !== 'no_figure' ? ` Sibling-road rule (DEC-015, a modelled road taken from the other formations of the corps): not applied, because ${sv.why}.` : ''}` : `Open gap: the record gives no figure for this ${u.level.replace(/_/g, ' ')}, so none is drawn.`; }
    const cas = casualtiesOf(u), guns = gunsOf(u, drawn);
    return {
      id: u.id, name: u.children.length || !parent ? nm : `${nm} (${parent})`, short: nm.replace(/(\d+)(?:st|nd|rd|th)\b/, '$1').slice(0, 14), side: SIDE[u.army], arm: arm(u), parent: u.parent, level: u.level,
      strength, formation: { ...formationOf(u), changes: drawn ? placement.formationsOf(u.id).map(f => ({ id: f.id, to: f.formation, t: f.t, phrase: f.phrase, stop: f.stop })) : [] }, casualties: cas, guns, kit: 'KIT-' + u.id, tier, sources: ['PDF-B3', 'PDF-B24', ...(drawn ? ['PLACEMENT', 'GAZETTEER'] : []), ...(s.kind === 'printed' || s.kind === 'procedural' ? ['SS-B3'] : []), ...cas.sources, ...(guns.sources || []), ...rowSources(u).slice(0, 12), ...(absentBy.has(u.id) ? ['OR27-POS', 'STATEVOL-POS', absentBy.get(u.id).register] : tier === 'plausible-procedural' ? ['EG-0001'] : ['EG-0005'])].filter((k, j, a) => a.indexOf(k) === j && sources[k]),
      register: absentBy.has(u.id) ? absentBy.get(u.id).register : tier === 'plausible-procedural' ? 'EG-0001' : 'EG-0005', drawn, approach, render: { status: render, reason: why }, status: u.status, children: u.children.slice(), commanders: u.commanders_printed || [],
      notes: `${why}${(u.commanders_printed || []).length ? ' Commander(s) as printed: ' + u.commanders_printed.map(tidyName).join('; ') + '.' : ''}${u.status !== 'on_field' ? ` Ledger status: ${u.status.replace(/_/g, ' ')}.` : ''}`,
    };
  });
  const uById = new Map(units.map(u => [u.id, u]));
  // ---- provenance (contract 1.4): the position-ledger claims behind a unit's approach, stops and departures, what was applied and what was not, and the reports that disagree (listed, never resolved)
  const cdoc = raw.placementClaims || null;
  const claimRows = (cdoc || raw.siblingApproach) ? [...placement.ap.map(e => ['approach', e]), ...placement.po.map(e => ['stop', e]), ...placement.dep.map(e => ['departure', e])].filter(([, e]) => e.claim || e.kind === 'sibling') : [];
  const briefClaim = c => ({ id: c.id, ledger: c.ledger, unit: c.unit, kind: c.kind, tier: c.tier, fidelity: c.fidelity, report: c.report, ...(c.source_kind ? { source_kind: c.source_kind, volume: c.volume, work: c.work, cite: c.cite } : {}), author: c.author, page: c.page, interpolated: c.interpolated, quote: c.quote, when: c.when, place: c.place, ocr_uncertain: c.ocr_uncertain });
  function provenanceOf(u) {
    if (!cdoc && !raw.siblingApproach) return null;
    const plan = plans.get(u.id), inChain = new Set(placement.chain(u.id)), applied = new Map(((plan && plan.stops) || []).map(x => [x.po, x])), skipped = new Map(((plan && plan.skipped) || []).map(x => [x.entry, x.reason])), deps = new Set(((plan && plan.departures) || []).map(x => x.id));
    const keptByRules = new Set(placement.positionsOf(u.id).map(e => e.id)), entries = [];
    for (const [kind, e] of claimRows) {
      const us = e.units || [e.unit], hit = us.find(x => inChain.has(x)); if (!hit) continue;
      let ok, why = null;
      if (!u.drawn) { ok = false; why = u.children.length ? 'a formation above the regiments: its leaf units carry the entries' : 'the unit has no road of approach, so it is not drawn and no entry applies to it'; }
      else if (kind === 'approach') { ok = !!u.approach && u.approach.id === e.id; if (!ok) why = u.approach ? 'a nearer road on the unit’s line of command (' + u.approach.id + ') is the one used' : 'not used'; }
      else if (kind === 'stop') { ok = applied.has(e.id); if (!ok) why = skipped.get(e.id) ? skipped.get(e.id) : !keptByRules.has(e.id) ? (isoToMin(e.t) + 1e-6 < gateOf(u.id) ? 'the claim falls before the unit’s own ledger gate (Q04): kept in the data, not applied' : 'a nearer entry within 90 minutes replaces it') : 'not applied'; }
      else { ok = deps.has(e.id); if (!ok) why = 'not applied'; }
      if (e.kind === 'sibling') { entries.push({ kind, entry: e.id, via: hit === u.id ? null : hit, claim: e.claims[0] || null, claims: e.claims, phrase: e.siblings[0].phrase, phrase_in: e.siblings[0].phrase_in, road: e.road, tier: e.tier, claim_tier: null, identification: null, modelled: true, formation: e.formation, siblings: e.siblings, register: e.register, decision: e.decision, applied: ok, why_not: why }); continue; }
      entries.push({ kind, entry: e.id, via: hit === u.id ? null : hit, claim: e.claim, claims: e.claims, phrase: e.phrase, phrase_in: e.phrase_in, ...(e.road ? { road: e.road } : {}), ...(e.place ? { place: e.place } : {}), ...(e.t ? { t: e.t, t_basis: e.t_basis, ...(e.period ? { period: e.period } : {}), ...(e.approx ? { approx: true } : {}) } : {}), tier: e.tier, claim_tier: e.claim_tier, identification: e.identification || null, applied: ok, why_not: why });
    }
    const seen = new Set(), peers = [];
    for (const r of entries) for (const cid of r.claims) for (const pid of (placement.claims[cid] || {}).conflicts_with || []) { const pc = placement.claims[pid]; if (pc && !seen.has(cid + '|' + pid)) { seen.add(cid + '|' + pid); peers.push({ of: cid, peer: briefClaim(pc) }); } }
    const conflicts = ((cdoc || {}).conflicts || []).filter(x => inChain.has(x.unit)).map(x => ({ ...x, own: x.unit === u.id }));
    const summary = ((cdoc || {}).units || {})[u.id] || null;
    const ab = absentBy.get(u.id), absence = ab ? { id: ab.id, tier: ab.tier, register: ab.register, decision: ab.decision, summary: ab.summary, claims: ab.claims.slice() } : null;
    if (!entries.length && !conflicts.length && !(summary && summary.read) && !absence) return null;
    return { entries, claims: Object.fromEntries([...new Set([...entries.flatMap(r => r.claims), ...(absence ? absence.claims : [])])].map(id => [id, briefClaim(placement.claims[id])])), peers, conflicts, summary, ...(absence ? { absence } : {}) };
  }
  // ---- day positions of the troop maps (contract 1.5): what each sheet says for the unit, whether it is drawn, and how it compares with the ledgers' timed places (both shown, never resolved)
  const ledgerCompare = (id, c) => {
    const w = { from: isoToMin(c.date), to: isoToMin(c.date) + 1440 }, out = [];
    for (const { e, tm } of placement.entriesOf(placement.po, id, { gate: false })) {
      if (!(tm >= w.from && tm < w.to)) continue; const pr = gaz.resolve(e.place); if (!pr) continue;
      const tgt = pr.line ? nearestOnLine(pr.line, c).point : pr.center, d = distM(tgt, c);
      out.push({ entry: e.id, source: e.claim ? `OR27 position-ledger claim ${e.claim}` : `PDF ledger row ${e.row}`, place: e.place, t: e.t, tier: e.tier, distance_m: Math.round(d), sigma_place_m: pr.sigma_m, sigma_day_m: c.sigma_m, agree: d <= pr.sigma_m + c.sigma_m });
    }
    return out;
  };
  // contract 1.7 (DEC-018): each sheet entry carries `items`, one per claim and line state in the order of the day (a single label: one item, state null when no state could be read); each item says what is documented
  // (the position that day; the state for unit, place and state; the state at a time when a complete clock is printed beside the line) and how its window is modelled (STATE_RULE)
  function dayPositionsOf(u) {
    if (!dayPos) return null;
    const plan = plans.get(u.id), r = dayPos.forUnit(u.id), pd = new Map(((plan && plan.days) || []).map(d => [d.id, d]));
    const drawnAs = (c, d, hour, res) => {
      let drawn_as = null, why_not = null;
      if (c && (!hour || res.eligible)) {
        if (u.children.length) { drawn_as = 'aggregate'; why_not = 'a formation above the regiments or batteries: they are laid out inside this position where they are drawn (their cards say when and how)'; }
        else if (absentBy.has(u.id)) { drawn_as = 'not_drawn'; why_not = `this unit is documented absent from the field (${absentBy.get(u.id).register}, ${absentBy.get(u.id).decision}); the label belongs to a formation above it and says nothing of this regiment, so the position is recorded here and nowhere in the picture`; }
        else if (!u.drawn) { drawn_as = 'not_drawn'; why_not = 'this unit has no road of approach (an open gap), so it is not drawn: the position is recorded here and nowhere in the picture'; }
        else if (!d) { drawn_as = 'not_applied'; why_not = (plan.day_notes.find(x => x.claim === c.id) || {}).why || 'not applied'; }
        else if (!d.feasible) { drawn_as = 'not_applied'; why_not = d.why_not; }
        else if (d.reachable_default === false) { drawn_as = 'not_applied'; why_not = 'the unit cannot reach the position from its start (its gate in the default scenario) before the window closes'; }
        else drawn_as = 'placed';
      } else if (hour && c) { drawn_as = 'not_used'; why_not = res.why; }
      return { drawn_as, why_not };
    };
    const entry = (res, hour) => {
      if (res.status === 'none') return null;
      const S = dayPos.sheets[res.sheet], its = hour ? (res.used ? [{ claim: res.used, eid: 'DAY-' + res.used.id, state: null, states: [], clock: null, index: 0, of: 1, prev: null, next: null }] : []) : itemsOf(res);
      const items = its.map(it => {
        const c = it.claim, d = pd.get(it.eid), da = drawnAs(c, d, hour, res), lc = c.line_clock || null;
        return { entry: it.eid, claim: c.id, state: it.state, states: it.states, index: it.index, of: it.of, prev: it.prev, next: it.next, state_basis: c.line_state_basis ?? null, state_crop: c.line_state_crop ?? null, state_read: c.line_state_read ?? null,
          clock_text: c.printed_clock_near_line ?? null, line_clock: lc, state_clock_used: !!(lc && lc.usable && it.state), rule: it.state ? STATE_RULE[it.state] : hour ? null : STATE_RULE.unreadable,
          state_tier: it.state ? 'documented' : null, state_time_tier: it.state ? (lc && lc.usable ? 'documented' : 'modelled') : null, arr_rule: d ? d.arr_rule : null,
          ...da, refined_stops: d ? d.refined_stops : [], ledger_compare: ledgerCompare(u.id, c) };
      });
      const c = res.status === 'single' || hour ? res.used : null, first = items[0] || null, placed = items.some(x => x.drawn_as === 'placed');
      const drawn_as = items.length ? (placed ? 'placed' : first.drawn_as) : null, why_not = items.length ? (placed ? (items.filter(x => x.drawn_as !== 'placed').map(x => `${x.claim}: ${x.why_not}`).join('; ') || null) : first.why_not) : null;
      const role = hour ? 'an inferred timed stop (14:00 to 15:30) where nothing else on the troop maps places the unit' : null;
      return { sheet: res.sheet, date: S.date, source: S.source, sheet_label: S.label, status: res.status, why: res.why, order_why: res.order_why || null, owner: res.owner, owner_level: res.level, via: res.via, labels: res.labels, claims: res.claims.map(x => x.id), used: c ? c.id : null,
        drawn_as, why_not, role, entry: first ? first.entry : null, refined_stops: [...new Set(items.flatMap(x => x.refined_stops))], ledger_compare: c ? ledgerCompare(u.id, c) : [], items, evening: hour ? null : eveningOf(S.date) };
    };
    const days = r.days.map(x => entry(x, false)).filter(Boolean), hour = entry({ ...r.hour }, true);
    if (!days.length && !hour) return null;
    return { days, hour, rules: 'one label = the day position (its line state, where readable, gives the window of the day); several labels whose line states put them in order = each drawn in its window; several labels the states do not order = none drawn as one place; brigade and artillery labels lay out their regiments or batteries, division and corps labels place nothing', evening_basis: EVENING_BASIS, decision: 'DEC-018' };
  }
  for (const u of units) { u.day_positions = dayPositionsOf(u); if (u.day_positions) for (const e of [...u.day_positions.days, u.day_positions.hour]) if (e && !u.sources.includes(DAY_SOURCE[e.sheet])) u.sources.push(DAY_SOURCE[e.sheet]); }
  for (const u of units) { u.provenance = provenanceOf(u); if (u.provenance && u.provenance.entries.length && !u.sources.includes('OR27-POS')) u.sources.push('OR27-POS'); if (u.provenance && u.provenance.entries.length && sources['STATEVOL-POS'] && !u.sources.includes('STATEVOL-POS') && u.provenance.entries.some(e => e.claims.some(id => (u.provenance.claims[id] || {}).source_kind === 'statevol'))) u.sources.push('STATEVOL-POS'); if (u.drawn && u.approach && u.approach.modelled && sources['EG-0070'] && !u.sources.includes('EG-0070')) u.sources.push('EG-0070'); }
  // per-figure kit manifests (contract 1.3): made by the port of check_kit.manifest_for; a manifest exists only from the unit's arrival in the default scenario unless a scenario is asked for
  const enterCache = new Map(), enterOf = (id, scenario = {}) => { const k = JSON.stringify([scenario && scenario.choices || {}, scenario && scenario.optionText || {}]); if (!enterCache.has(k)) { if (enterCache.size > 8) enterCache.clear(); enterCache.set(k, new Map(arrivalsFor(scenario || {}).map(a => [a.unit, a.default]))); } const v = enterCache.get(k).get(id); return v == null ? null : v; };
  const figures = createFigures({ raw, units, enterOf });

  // ---- arrivals ---------------------------------------------------------------------------------------------------------------------------
  const linked = new Set(); for (const r of raw.arrivals.rows) for (const c of r.conflicts) if (c.link !== 'topic_other_cell') linked.add(c.id); linked.add('C-043');
  const gateTier = (eff, u) => (eff.tier === 'open gap' ? 'open gap' : eff.inherited && eff.tier === 'documented' ? 'inferred' : eff.tier);
  function arrivalsFor(scenario) {
    const out = [];
    for (const u of U) {
      if (am.notOnField(u.id)) continue; const eff = am.effective(u.id, scenario, helpers); if (!eff) continue; const plan = plans.get(u.id), unit = uById.get(u.id);
      const entry = plan && plan.start ? { lng: plan.start.lng, lat: plan.start.lat, sigma_m: plan.startSigma } : null;
      const own = eff.owner === u.id ? 'its own ledger gate' : `inherited from ${tidyName(by.get(eff.owner).name)} (${eff.owner})`;
      out.push({ unit: u.id, earliest: eff.earliest, default: eff.default, latest: eff.latest, entry,
        entry_status: entry ? `resolved: where ${plan.road} leaves the loaded ground, queue position ${plan.queueOffsetM} m behind the head${plan.clamped ? ' (the mapped road is too short for the whole column; the tail is stacked at its start)' : ''}; approach ${unit.approach.id} (${unit.approach.inherited ? 'inherited from ' + unit.approach.owner : 'its own'}, tier ${unit.approach.tier})${plan.stops[0] ? '; ' + offsetNote(plan) : ''}` : (plan ? plan.reason : unit.render.reason),
        tier: entry ? weaker(gateTier(eff, u), unit.approach.tier) : (eff.tier === 'open gap' ? 'open gap' : gateTier(eff, u)), sources: [...new Set(['PDF-B24', ...rowSources(u).slice(0, 12), ...(entry ? ['PLACEMENT'] : [])].filter(k => sources[k]))],
        conflict: (eff.conflicts && eff.conflicts[0]) || null, note: `Gate (${eff.kind}) ${own}. ${eff.basis ? eff.basis + '. ' : ''}${eff.notes.join(' ')}`.trim() });
    }
    return out;
  }

  // ---- events (scenario dependent times over scenario independent geometry) ---------------------------------------------------------------------
  // Two kinds of lateness are kept apart. OFFSET (a data property): the unit enters the map at the gate where its road leaves the loaded ground; the ledger time of its FIRST place refers to a place that is
  // kilometres farther on, so at drill speed it reaches the place later than the ledger time. The gate is NOT moved (Q04: nothing earlier than the earliest), the march is not shortened, and the difference is
  // reported in report.offsets and printed on the card. DEFECT: a later leg that is late for another reason (a chosen step-off clock leaves too little time). A leg late only because the leg before it was an offset is a 'cascade' offset.
  // the solver’s plan of a drawn unit (scenario independent: times from the printed windows and the counter-based RNG): [{agent, fate, t}] in minutes, or [] where there is no window
  const planCache = new Map();
  function planOf(id) {
    if (planCache.has(id)) return planCache.get(id);
    const u = uById.get(id), c = u.casualties; let out = [];
    if (c.kind !== 'none' && c.windows.length && u.strength.drawn > 0) {
      if (c.total.printed > u.strength.drawn) throw new Error(`${id}: the loss share ${c.total.printed} exceeds the drawn figures ${u.strength.drawn}`);
      out = solvePlan({ unitId: id, strength: u.strength.drawn, point: { killed: c.fates.killed.point, wounded: c.fates.wounded.point, missing: c.fates.missing.point }, windows: c.windows, seed: SEED });
    }
    planCache.set(id, out); return out;
  }
  const wpOf = (t, p, sigma) => ({ t, lng: p.lng, lat: p.lat, sigma_m: Math.round(sigma) });
  const ACT_TAG = { tier: 'plausible-procedural', sources: ['PLACEMENT', 'GAZETTEER'] };
  // ---- the stops of a unit in one scenario: the timed stops of the ledgers (plan.stops) and the day stops of the troop maps (plan.days; contract 1.5).
  // A day stop has no clock. Its time is MODELLED inside the window the record leaves open: the unit leaves for it as soon as it may (not before the gate of the unit, not before the stop's day begins at
  // local midnight, not before the end of an engagement window that is still running at that midnight) and marches at the documented march rate; it arrives no earlier than the march allows and
  // (the sheet gives the day) no later than the end of the day, the printed clock beside the label if one is printed in the label's own run, and the departure that the next timed stop needs.
  // A day stop never moves a timed stop: it is put in the first gap of its day in which every timed stop is reached no later than it is without the day stop, at no faster a gait; if no gap on its day fits, it is
  // not applied in this scenario and the report says why. The hour-sheet stop (kind 'hour') is a timed stop with a printed window: it is reached just in time for the start of the window and must be reached by its end.
  const DAY_TAG = e => ({ tier: 'plausible-procedural', sources: [DAY_SOURCE[e.sheet]] });
  function composeStops(id, plan, unit, t0, scenario) {
    const ledger = plan.stops.map((s, k) => ({ kind: 'ledger', id: s.po, stop: s, slot: s.slot, placeObj: s.placeObj, via: s.via, placeSigma: s.placeSigma, headingDeg: s.headingDeg, origPrev: k ? plan.stops[k - 1].po : null, anchor: s.t_doc, ledgerK: k }));
    const wins = (unit.casualties && unit.casualties.windows) || [];
    const days = plan.days.filter(d => d.feasible).map(d => {
      const hold = wins.filter(w => w.from < d.window.from && w.to > d.window.from).reduce((a, w) => Math.max(a, w.to), -Infinity);
      return { kind: d.kind, id: d.id, stop: d, slot: d.slot, placeObj: d.place, via: [], placeSigma: d.placeSigma, headingDeg: d.headingDeg, depNb: Math.max(d.dep_not_before, hold), hold: hold > -Infinity ? hold : null, anchor: d.kind === 'hour' ? d.arr_not_before : d.window.from + (d.seq ? d.seq.index * 1e-3 : 0) };   // state items of one day keep the order of their states (first, intermediate, evening)
    }).sort((a, b) => a.anchor - b.anchor);
    const routeOf = (prev, it) => (it.kind === 'ledger' && it.origPrev === (prev ? prev.id : null) ? it.stop.route : legRoute(plan, prev ? prev.slot : null, { slot: it.slot, place: it.placeObj, via: it.via }, gaz));
    function schedule(items) {
      const out = []; let t = t0, prev = null;
      for (const it of items) {
        const route = routeOf(prev, it), D = polylineLength(route); let depart, speed, act, late = 0, arrive, ok = true, target = null, known = null, stateLate = 0;
        if (it.kind === 'ledger') {
          const stop = it.stop; let depDoc = stop.depart_doc;
          if (stop.conflict) { const ch = scenario.choices && scenario.choices[stop.conflict]; if (ch && ch !== 'recommended' && ch !== 'range') { const r = am.parseOption(scenario.optionText && scenario.optionText[stop.conflict], stop.t_doc, helpers); if (r) depDoc = r.t; } }
          const earliestDepart = Math.max(t, depDoc ?? t), avail = stop.t_doc - earliestDepart;
          if (avail > 0 && D / (avail * 60) <= SPEED.march) { speed = SPEED.march; depart = stop.t_doc - D / speed / 60; act = 'march'; }
          else if (avail > 0 && D / (avail * 60) <= SPEED.double_quick) { speed = D / (avail * 60); depart = earliestDepart; act = 'double_quick'; }
          else { speed = SPEED.double_quick; depart = earliestDepart; act = 'double_quick'; late = depart + D / speed / 60 - stop.t_doc; }
          depart = Math.max(depart, earliestDepart); arrive = depart + D / speed / 60;
        } else {
          // a day stop (contract 1.5 / 1.7): a march at the march rate, leaving as soon as it may ('asap'), or so as to arrive at the usable printed clock ('clock'), at the middle of the open window ('midpoint': an intermediate
          // line whose order and time are not printed), or at the evening convention ('evening': only when the unit has a known place of the same day to stand at before; with none it goes there as soon as it may and the card
          // says the daytime place is unknown). `arr_by` (the clock, or the evening convention for first, intermediate and evening lines) is soft: a later arrival is reported as a state offset, no gate moves (Q04).
          const d = it.stop; speed = SPEED.march; act = 'march';
          const earliest = Math.max(t, it.depNb) + D / speed / 60;
          known = prev != null && t >= d.window.from - 1e-9;                     // the unit stands at a known place of this day before leaving for this one (the item before it arrived on this day)
          if (d.arr_rule === 'clock') target = d.arr_target;
          else if (d.arr_rule === 'midpoint') target = d.arr_by != null && d.arr_by > earliest ? (earliest + d.arr_by) / 2 : null;
          else if (d.arr_rule === 'evening') target = known ? d.arr_target : null;
          depart = Math.max(t, it.depNb, (target ?? -Infinity) - D / speed / 60, d.arr_not_before - D / speed / 60); arrive = depart + D / speed / 60; ok = arrive <= d.arr_not_after + 1e-9;
          stateLate = d.arr_by != null ? Math.max(0, arrive - d.arr_by) : 0;
        }
        out.push({ it, route, D, depart, speed, act, late, arrive, ok, target, known, stateLate }); t = arrive; prev = it;
      }
      return out;
    }
    let items = ledger.slice(), sched = schedule(items); const notes = new Map();
    for (const day of days) {
      const w = day.stop, a = w.kind === 'hour' ? w.arr_not_before : w.window.from, b = w.kind === 'hour' ? w.arr_not_after : w.window.to;
      let jmin = 0, jmax = items.length; items.forEach((x, i) => { if (x.anchor < a) jmin = i + 1; });
      if (w.seq && w.seq.prev) { const pi = items.findIndex(x => x.id === w.seq.prev); if (pi >= 0) jmin = Math.max(jmin, pi + 1); }     // a state item goes after the item before it in the order of its states
      for (let i = items.length - 1; i >= 0; i--) if (items[i].anchor >= b) jmax = i;
      let placed = false, bestWhy = 'no gap on its day fits';
      for (let j = jmin; j <= Math.max(jmin, jmax) && !placed; j++) {
        const cand = [...items.slice(0, j), day, ...items.slice(j)], cs = schedule(cand), me = cs.find(x => x.it === day);
        if (!me.ok) { bestWhy = `it cannot be reached on its day: the march from the previous position arrives ${fmtShort(me.arrive)}, after ${fmtShort(w.arr_not_after)}`; continue; }
        const before = new Map(sched.map(x => [x.it.id, x])); let fine = true;
        for (const x of cs) { if (x.it === day) continue; const b0 = before.get(x.it.id); if (x.it.kind === 'ledger') { if (x.arrive > b0.arrive + 1e-6 || (b0.act === 'march' && x.act !== 'march')) { fine = false; bestWhy = `every gap of its day is needed by a timed stop (${x.it.id} would be reached later, or faster, than the record allows)`; break; } } else if (!x.ok) { fine = false; bestWhy = 'it would push an earlier day stop out of its window'; break; } }
        if (fine) { items = cand; sched = cs; placed = true; }
      }
      if (!placed) {
        const merged = day.kind === 'day' ? sched.find(x => x.it.kind === 'ledger' && x.it.stop.refined_by === w.claim && x.arrive < w.window.to) : null;       // a ledger stop that lies inside the position: the position is reached by that stop
        if (merged) notes.set(day.id, { applied: true, merged_into: merged.it.id, arrive: merged.arrive, depart: merged.depart });
        else notes.set(day.id, { applied: false, why_not: bestWhy });
      }
    }
    return { items, sched, notes, days };
  }
  function eventsFor(scenario, report) {
    const ev = [], defects = [], offsets = [], stateOffsets = [], actNotes = [], casReport = [], dayReport = [], ledgerArr = [], finalSlots = {}; let seq = 0; const push = e => { e._o = seq++; ev.push(e); };
    for (const [id, plan] of plans) {
      if (plan.status !== 'moving' && plan.status !== 'edge_only') continue;
      const eff = am.effective(id, scenario, helpers), unit = uById.get(id), t0 = eff.default, tag = { tier: 'plausible-procedural', sources: ['PLACEMENT', 'GAZETTEER'] };
      push({ t: t0, unit: id, type: 'enter', at: { lng: plan.start.lng, lat: plan.start.lat }, tier: gateTier(eff, unit) === 'documented' ? 'inferred' : gateTier(eff, unit), sources: ['PDF-B24', 'PLACEMENT'] });
      push({ t: t0, unit: id, type: 'activity', activity: 'halt', heading_deg: bearingToUnit(headingAlong(plan)), ...tag });
      let t = t0, sigma = plan.startSigma, positioned = false, prevOffset = false;
      const legs = [], arrived = new Map(), stood = [];                           // legs: [depart, arrive] intervals in which the unit is marching; arrived: stop id -> time it stands at the place; stood: where and from when it stood
      const comp = composeStops(id, plan, unit, t0, scenario), plannedDays = new Map(plan.days.map(d => [d.id, d]));
      let lastSlot = null, lastHeading = null;
      for (const s of comp.sched) {
        const it = s.it, stop = it.stop, route = s.route, D = s.D, speed = s.speed, act = s.act, late = s.late, depart = s.depart, isLedger = it.kind === 'ledger', tg = isLedger ? tag : DAY_TAG(stop);
        // path: waypoints at constant speed; the heading follows each segment (the stage turns the formation smoothly)
        let cum = 0; const wp = [wpOf(depart, route[0], sigma)];
        for (let i = 1; i < route.length; i++) { cum += distM(route[i - 1], route[i]); wp.push(wpOf(depart + cum / speed / 60, route[i], sigma + (it.placeSigma - sigma) * (D ? cum / D : 1))); }
        const arrive = wp[wp.length - 1].t;
        let lastHead = null;
        for (let i = 0; i + 1 < route.length; i++) { const h = bearingDegLL(route[i], route[i + 1]); if (lastHead == null || Math.abs(((h - lastHead + 540) % 360) - 180) > 8) { push({ t: wp[i].t, unit: id, type: 'activity', activity: act, heading_deg: h, ...tg }); lastHead = h; } }
        if (D > 0) { push({ t: depart, unit: id, type: 'path', wp, ...tg }); legs.push([depart, arrive]); }
        push({ t: arrive, unit: id, type: 'activity', activity: 'stand', heading_deg: lastHead ?? it.headingDeg, ...tg });
        if (isLedger) {
          const k = it.ledgerK, rec = { unit: id, stop: stop.po, place: stop.place, documented: stop.t_doc, arrives: arrive, distance_m: Math.round(k === 0 ? polylineLength(stop.route) : D) };   // the first ledger stop's distance is the way from the edge, whatever day stop lies between
          if (late > 0.5) {
            if (k === 0) offsets.push({ kind: 'ledger_vs_edge', ...rec, late_min: Math.round(late), road: plan.road });
            else if (prevOffset) offsets.push({ kind: 'cascade', ...rec, late_min: Math.round(late) });
            else defects.push({ kind: 'late', ...rec, late_min: Math.round(late) });
          } else if (k === 0) offsets.push({ kind: 'ledger_vs_edge', ...rec, late_min: 0, road: plan.road });
          prevOffset = late > 0.5 && (k === 0 || prevOffset); ledgerArr.push({ unit: id, stop: stop.po, arrive, documented: stop.t_doc });
        }
        stood.push({ pid: isLedger ? gaz.resolve(stop.place).id : stop.id, from: arrive, to: Infinity }); if (stood.length > 1) stood[stood.length - 2].to = depart;
        arrived.set(isLedger ? stop.po : stop.id, arrive); t = arrive; sigma = it.placeSigma; positioned = true; lastSlot = it.slot; lastHeading = it.headingDeg;
      }
      finalSlots[id] = lastSlot ? { lng: lastSlot.lng, lat: lastSlot.lat, heading_deg: lastHeading } : null;
      if (!positioned && plan.status === 'edge_only') { /* stays in its column outside the ground: arrival edge only */ }
      // the day stops, applied or not, with their window (a record of what is documented and what is modelled)
      for (const d of plan.days) {
        const sc = comp.sched.findIndex(x => x.it.id === d.id), note = comp.notes.get(d.id) || null, row = sc >= 0 ? comp.sched[sc] : null, next = sc >= 0 ? comp.sched[sc + 1] : null;
        const at = row ? row.arrive : note && note.applied ? note.arrive : null, latest = row ? Math.max(at, Math.min(d.arr_not_after, d.required_by ?? Infinity, next ? next.depart : Infinity)) : note && note.applied ? at : null;   // a unit late against a printed clock has no room: latest = arrive (the offset says so)
        // contract 1.7: the state window as modelled in this scenario. `stands_until`: when the unit leaves for its next stop (null: it is kept here to the end of the record); `state_from`/`state_to`: the window the state is said to
        // hold (first: arrival to the next state-ordered position or the evening convention; evening: the convention or the clock to midnight; all day: arrival to midnight; intermediate: arrival to the next or the convention)
        const stLate = row ? row.stateLate : 0, EV = d.evening, st = d.state, standsUntil = next ? next.depart : null;
        const stateFrom = at == null ? null : st === 'evening' ? Math.max(at, Math.min(d.arr_target ?? EV, EV)) : at;
        const stateTo = at == null || !st ? null : st === 'evening' || st === 'all_day' || st === 'mixed' ? d.window.to : Math.min(standsUntil ?? Infinity, Math.max(EV, at));
        if (row && stLate > 0.5) stateOffsets.push({ kind: 'state_vs_window', unit: id, stop: d.id, claim: d.claim, state: st, by: d.arr_by, arrives: at, late_min: Math.round(stLate), distance_m: Math.round(row.D), why: d.arr_rule === 'clock' ? 'the complete clock printed beside the line' : 'the evening convention' });
        dayReport.push({ unit: id, id: d.id, kind: d.kind, claim: d.claim, sheet: d.sheet, date: d.date, feasible: d.feasible, applied: !!(row || (note && note.applied)), merged_into: note && note.merged_into || null,
          why_not: !d.feasible ? d.why_not : (row || (note && note.applied)) ? null : (note ? note.why_not : 'not applied'), arrive: at, depart: row ? row.depart : null, distance_m: row ? Math.round(row.D) : null,
          latest_arrival: latest, window: { from: d.kind === 'hour' ? d.arr_not_before : d.window.from, to: d.arr_not_after }, required_by: d.required_by, required_by_met: d.required_by == null || at == null ? null : at <= d.required_by + 1e-6, hold_until: (comp.days.find(x => x.id === d.id) || {}).hold ?? null,
          state: st, states: d.states, arr_rule: d.arr_rule, arr_by: d.arr_by, target: row ? row.target : null, daytime_known: row ? row.known : null, state_late_min: row && stLate > 0.5 ? Math.round(stLate) : 0, stands_until: standsUntil, state_from: stateFrom, state_to: stateTo, evening: EV,
          state_tier: d.state_tier, state_time_tier: d.state_time_tier, seq: d.seq || null });
      }
      // departures: only through a printed clause that names the road (placement.departures); the way out starts where the unit last stood
      let leaveAt = null;
      for (const d of plan.departures || []) {
        let route = d.route;
        if (lastSlot) { const planned = plan.stops.length ? plan.stops[plan.stops.length - 1].slot : null; if (!planned || planned.lng !== lastSlot.lng || planned.lat !== lastSlot.lat) { const x = placement.exitRoute(d.road, lastSlot, PLAN.outsideM + (plan.depth || 0)); route = x ? simplify(x.route, PLAN.simplifyM) : null; } }
        if (!route) { if (d.t_doc >= t0) { leaveAt = Math.max(d.t_doc, t); push({ t: leaveAt, unit: id, type: 'leave', ...tag }); } continue; }
        const D = polylineLength(route), depart = Math.max(t, d.t_doc), speed = SPEED.march; let cum = 0; const wp = [wpOf(depart, route[0], sigma)];
        for (let i = 1; i < route.length; i++) { cum += distM(route[i - 1], route[i]); wp.push(wpOf(depart + cum / speed / 60, route[i], sigma)); }
        push({ t: depart, unit: id, type: 'activity', activity: 'march', heading_deg: bearingDegLL(route[0], route[Math.min(1, route.length - 1)]), ...tag });
        if (D > 0) { push({ t: depart, unit: id, type: 'path', wp, ...tag }); legs.push([depart, wp.at(-1).t]); }
        if (stood.length) stood[stood.length - 1].to = depart; leaveAt = wp.at(-1).t; push({ t: leaveAt, unit: id, type: 'leave', ...tag }); break;
      }
      // activities: only where a clause names one; applied when the unit stands still (a clause that falls inside a march waits for its end), after it is on the field and before it leaves
      const stopIds = new Set([...plan.stops.map(x => x.po), ...(plan.skipped || []).filter(x => x.reason === 'already at this place').map(x => x.entry)]);
      for (const a of placement.activitiesOf(id)) {
        if (a.stop && !stopIds.has(a.stop)) { actNotes.push({ unit: id, activity: a.id, skipped: 'the unit does not carry the stop this activity belongs to' }); continue; }
        let ta = isoToMin(a.t); const atStop = a.stop && arrived.has(a.stop) ? arrived.get(a.stop) : null; if (atStop != null) ta = Math.max(ta, atStop);
        if (a.place && !a.stop) {                                                    // an activity at a place happens when the unit is at the place, never before the clause's time
          const pid = gaz.resolve(a.place).id, hit = stood.find(x => x.pid === pid && ta < x.to); if (!hit) { actNotes.push({ unit: id, activity: a.id, skipped: 'the unit is not at ' + a.place + ' at or after the clause time' }); continue; } ta = Math.max(ta, hit.from);
        }
        if (ta < t0) { actNotes.push({ unit: id, activity: a.id, skipped: 'before the unit enters the map' }); continue; }
        const leg = legs.find(([f, to]) => ta > f && ta < to); if (leg) ta = leg[1];
        if (leaveAt != null && ta >= leaveAt) { actNotes.push({ unit: id, activity: a.id, skipped: 'after the unit has left' }); continue; }
        push({ t: ta, unit: id, type: 'activity', activity: a.activity, heading_deg: headingAt(id, ta, ev, plan), ...ACT_TAG });
      }
      // changes of formation (contract 1.3): only where a clause prints one (“deploys”); at the clause time, or when the unit has arrived at the place the clause drives, or when its march ends
      for (const f of placement.formationsOf(id)) {
        let tf = f.tm; if (f.stop && arrived.has(f.stop)) tf = Math.max(tf, arrived.get(f.stop));
        if (tf < t0) { actNotes.push({ unit: id, formation: f.id, skipped: 'before the unit enters the map' }); continue; }
        const leg = legs.find(([a, b]) => tf > a && tf < b); if (leg) tf = leg[1];
        if (leaveAt != null && tf >= leaveAt) { actNotes.push({ unit: id, formation: f.id, skipped: 'after the unit has left' }); continue; }
        push({ t: tf, unit: id, type: 'formation', formation: f.formation, duration_s: FORMATION_SECONDS, clause: f.id, tier: f.tier, sources: ['PLACEMENT', ...f.sources.filter(k => sources[k])] });
      }
      // casualties (contract 1.3): the solver’s men who fall while the unit stands on the map. Falls outside that time (marching in, not arrived, gone) are NOT drawn and stay in the unit's total.
      const planEv = planOf(id);
      if (planEv.length) {
        const placed = planEv.filter(e => e.t >= t0 && (leaveAt == null || e.t < leaveAt) && stood.some(x => e.t >= x.from && e.t < x.to)), counts = { killed: 0, wounded: 0, missing: 0 }, cas = unit.casualties; let n = 0;
        for (const e of placed) { counts[e.fate]++; n++; push({ t: e.t, unit: id, type: 'state', agent: e.agent, fate: e.fate, ...runningState({ strength: unit.strength.drawn, loss: cas, done: n, counts }), tier: CAS_TIER, weak_source: true, sources: ['PDF-B3', 'SS-B3', 'PDF-B1', 'OR27-CAS', 'PDF-TL'].filter(k => sources[k]) }); }
        casReport.push({ unit: id, total: cas.total.printed, plan_events: planEv.length, shown: placed.length, not_shown: planEv.length - placed.length, killed: counts.killed, wounded: counts.wounded, missing: counts.missing });
      }
    }
    ev.sort((a, b) => a.t - b.t || a._o - b._o); for (const e of ev) delete e._o;
    if (report) { report.defects = defects; report.offsets = offsets; report.state_offsets = stateOffsets; report.activity_notes = actNotes; report.casualties = casReport; report.day_stops = dayReport; report.ledger_arrivals = ledgerArr; report.final_slots = finalSlots; }
    return ev;
  }
  // the last heading a unit was given at or before t (an activity keeps the unit's heading)
  const headingAt = (id, t, ev, plan) => { let h = null, ht = -Infinity; for (const e of ev) if (e.unit === id && e.type === 'activity' && e.heading_deg != null && e.t <= t && e.t >= ht) { h = e.heading_deg; ht = e.t; } return h ?? bearingToUnit(headingAlong(plan)); };
  const headingAlong = plan => { if (!plan.line) return 0; const n = nearestOnLine(plan.line, plan.start), nx = plan.line[Math.min(plan.line.length - 1, n.index + 1)]; return bearingDegLL(plan.start, nx); };

  const scKey = s => JSON.stringify([s && s.choices || {}, s && s.optionText || {}]);
  const cacheBoth = new Map();
  function both(scenario = {}) {
    const k = scKey(scenario); if (cacheBoth.has(k)) return cacheBoth.get(k);
    const rep = {}, events = eventsFor(scenario, rep), res = { arrivals: arrivalsFor(scenario), events, report: rep }; if (cacheBoth.size > 8) cacheBoth.clear(); cacheBoth.set(k, res); return res;
  }
  const slotOf = id => {
    const p = plans.get(id); if (!p || (p.status !== 'moving' && p.status !== 'edge_only')) return null;
    if (p.days && p.days.some(d => d.feasible)) { const f = both({}).report.final_slots[id]; if (f) return f; }
    if (p.stops.length) { const s = p.stops[p.stops.length - 1]; return { lng: s.slot.lng, lat: s.slot.lat, heading_deg: s.headingDeg }; }
    return { lng: p.start.lng, lat: p.start.lat, heading_deg: headingAlong(p) };
  };

  const ob = buildObjects({ raw, gaz });
  const kit = buildKit({ raw, units: U });
  const layer = {
    meta: { id: 'real-1', contract: '1.5', stub: false, label: 'Ledger-derived history layer, v1', scenarioAware: true, linkedConflicts: [...linked].sort(),
      note: 'Units, arrival windows and conflict scenarios come from the PDF ledger; positions only where a road of approach and a dated place are printed and resolve in the gazetteer. Everything else is an open gap, marked as such.' },
    units, sources, objects: ob.list, arrivals: s => both(s).arrivals, events: s => both(s).events, both,
    kit: id => kit(id), objectProgress: ob.progress, objectsSkipped: ob.skipped, slotOf, dayPositions: dayPos, dayClaims: dayPos ? dayPos.claims : null,
    engagements: new Map(((raw.engagements || {}).clauses || []).map(c => [c.id, c])), figureValidation: id => ((raw.figuresValidation || {}).units || {})[id] || null,
    figures, rendererSupport: RENDERER_SUPPORT, figureVari: figures ? (id, k) => figures.vari(id, k) : undefined,
    figureManifest: (id, k, t, scenario) => (figures ? figures.manifest(id, k, t, scenario) : null), figureSummary: (id, t, scenario) => (figures ? figures.summary(id, t, scenario) : null), enterOf,
    // introspection for tests and the notes
    focus: Math.max(0, units.findIndex(u => u.drawn && u.render.status === 'moving')),
    counts: ((c) => { for (const u of units) c[u.render.status] = (c[u.render.status] || 0) + 1; c.total = units.length; c.drawn = (c.moving || 0) + (c.edge_only || 0); c.not_drawn = c.not_drawn || 0; c.documented_absent = absentBy.size; return c; })({}),
    plans, pools, lossPools: lp.pools, fateModel: fm, planOf, gunData: bg, gazetteer: gaz, placement, model: am, strengths, speed: SPEED, plan: PLAN, drawnIds,
    report: (scenario = {}) => both(scenario).report,
  };
  return layer;
}
