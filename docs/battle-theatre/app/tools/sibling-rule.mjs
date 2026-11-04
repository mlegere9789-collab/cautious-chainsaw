// The sibling-road rule (history layer v6, DEC-015): which undrawn leaf units are drawn by a MODELLED road of approach, and why each of the others stays an open gap.
//   node docs/battle-theatre/app/tools/build-sibling-approach.mjs      writes data/sibling-approach.json (this module computes it; tests re-run it and compare)
//
// The rule (every clause is tested; nothing in it invents a road, a time or a coordinate):
//   1. A leaf unit that is an open gap in v5 (no road of approach anywhere on its line of command) takes the road documented for the OTHER formations of its corps ONLY IF
//        a. every documented sibling formation names the same gazetteer road. A sibling is an approach record of v5 (a PDF-ledger row or a re-read claim, never a modelled record) attached to
//           a formation that stands strictly under the unit's corps (the formation directly under the army for the cavalry division) and is not on the unit's own line of command;
//           at least one must exist; the road must cross the loaded ground;
//        b. no report for the unit or any formation above it names a road that the repository cannot place (the road from Scotland, the route by Horner's Mill, a railroad), another road of
//           approach, or a road that does not cross the loaded ground (Black Horse Tavern Road); and the reports of the chain do not disagree (approach_block). Every claim of the audit
//           (APPROACH-AUDIT.md) that names a road on the chain carries a class in data/sibling-review.json (read by hand; a claim without a class stops the build);
//        c. the unit has a gate and a single-label day position (a Bachelder sheet); a unit without one is not drawn (it would only stand in a column at the edge).
//   2. Stuart's cavalry (cs-cav-*): the sibling rule is not applied to it at all. It is drawn only by a road documented for its own brigade or division; none of the 16 units has a day position.
//   3. The record is attached at the highest formation below the corps all of whose leaf units are either drawn by it or already have a nearer road; the tier is plausible-procedural, the record is
//      marked modelled, and it names every sibling it rests on (report, page, printed words).
import { boxCrossings } from '../src/history/gazetteer.mjs';

export const RULE_ID = 'DEC-015', REGISTER = 'EG-0070', MODELLED_TIER = 'plausible-procedural';
export const BLOCKING_CLASSES = ['unplaceable', 'other_approach', 'outside_ground', 'disagree'];
// what the reasons are called in the audit (the old codes stay for the open gaps that keep them)
export const SIBLING_CODES = [
  ['siblings_disagree', 'the documented sibling formations of the corps name different roads (for example the Second Corps: Early the Harrisburg Road, Rodes the Carlisle Road): none is chosen'],
  ['no_sibling_road', 'no other formation of the corps has a documented road of approach, so there is nothing to take the road from'],
  ['sibling_road_no_day_position', 'the sibling road is available, but the unit has no single-label day position (a Bachelder sheet), so a drawn unit would only stand in a column at the edge of the ground: not drawn'],
  ['cavalry_own_road_only', 'Stuart’s cavalry: drawn only by a road documented for its own brigade or division, and only earlier marches are printed (no day position either)'],
];

export function chainOf(by, id) { const o = []; for (let u = by.get(id); u; u = u.parent ? by.get(u.parent) : null) o.push(u.id); return o; }

// L5: the layer built without the sibling records; rows: the claim rows of the audit of that layer; review: data/sibling-review.json; leafReason: the audit's reason for each open leaf of L5
export function siblingRule({ L5, rows, review, leafReason, gateOf, firstId = null }) {   // firstId: the number of the first record; null = the one after the highest approach record of the layer (v8: ledger E added AP-42 and AP-43)
  const by = new Map(L5.units.map(u => [u.id, u])), gaz = L5.gazetteer, PL = L5.placement, errors = [];
  const box = PL.box, crosses = road => boxCrossings(gaz.resolve(road).line, box).some(c => c.inward) || boxCrossings(gaz.resolve(road).line.slice().reverse(), box).some(c => c.inward);
  const roadId = road => gaz.resolve(road).id;
  const open = L5.units.filter(u => !u.children.length && u.render.status === 'not_drawn');
  const hasDay = u => !!(u.day_positions && u.day_positions.days.some(d => d.status === 'single'));
  const classOf = r => (review.claims[r.claim] && review.claims[r.claim].class) || review.by_code[r.code] || null;
  const rowsOf = id => { const ch = new Set(chainOf(by, id)); return rows.filter(r => ch.has(r.unit) && r.code !== 'used' && r.code !== 'record_text_only'); };
  const ownAps = PL.ap.filter(a => a.kind !== 'sibling');
  const reasonCode = new Map(leafReason.map(r => [r.id, r.code]));
  const verdict = new Map(), explicit = new Set();
  for (const u of open) {
    const ch = chainOf(by, u.id), plan = L5.plans.get(u.id), top = ch.length >= 2 ? ch[ch.length - 2] : ch[0], v5code = reasonCode.get(u.id);
    const say = (status, code, why, extra = {}) => verdict.set(u.id, { status, code, why, top, ...extra });
    if (!plan) { say('open', 'no_figure', 'a headquarters, staff or grouping entry: the record gives it no figure'); continue; }
    if (plan.blocked) { say('open', 'reports_disagree', plan.reason); continue; }
    if (plan.approach && /does not cross/.test(plan.reason)) { say('open', 'road_outside_ground', plan.reason); continue; }
    // (b) the reports of the line of command
    const mine = rowsOf(u.id), blockers = [];
    for (const r of mine) {
      const c = classOf(r);
      if (!c) { errors.push(`${r.claim} (${r.unit}, audit code ${r.code}) sits on the line of command of ${u.id} and has no class in sibling-review.json`); continue; }
      if (!(c in review.classes)) errors.push(`${r.claim}: class ${c} is not defined`);
      if (BLOCKING_CLASSES.includes(c)) blockers.push({ r, c });
    }
    if (blockers.length) {
      const pick = blockers.find(x => x.r.code === v5code) || blockers[0], code = (review.claims[pick.r.claim] || {}).code || pick.r.code;
      say('open', code, `${review.classes[pick.c]} (${pick.r.claim}: “${pick.r.printed}”)`, { blockers: blockers.map(x => x.r.claim) });
      continue;
    }
    // Stuart's cavalry: the sibling rule is not applied (clause 2)
    if (ch.includes('cs-cav-div')) { say('open', 'cavalry_own_road_only', SIBLING_CODES.find(c => c[0] === 'cavalry_own_road_only')[1]); continue; }
    // (a) the documented siblings of the corps
    const inChain = new Set(ch), sibs = ownAps.filter(a => { if (!by.has(a.unit)) return false; const ac = chainOf(by, a.unit); return a.unit !== top && ac.includes(top) && !inChain.has(a.unit) && !PL.entryOf(a).error; });
    if (!sibs.length) { say('open', 'no_sibling_road', SIBLING_CODES.find(c => c[0] === 'no_sibling_road')[1]); continue; }
    const roads = [...new Set(sibs.map(a => roadId(a.road)))];
    if (roads.length > 1) { say('open', 'siblings_disagree', `${SIBLING_CODES.find(c => c[0] === 'siblings_disagree')[1]} (${[...new Set(sibs.map(a => `${a.road} (${a.id}, ${a.unit})`))].join('; ')})`, { roads: [...new Set(sibs.map(a => a.road))] }); continue; }
    const road = gaz.resolve(sibs[0].road).name;
    if (!crosses(road)) { say('open', 'road_outside_ground', `the sibling road ${road} does not cross the loaded ground`); continue; }
    // (c) a gate and a day position
    const gate = gateOf(u.id);
    if (!Number.isFinite(gate) || !hasDay(u)) { say('open', 'sibling_road_no_day_position', SIBLING_CODES.find(c => c[0] === 'sibling_road_no_day_position')[1], { road, siblings: sibs.map(a => a.id) }); continue; }
    say('sibling', 'sibling', `drawn by the road of the sibling formations of ${top}: ${road}`, { road, siblings: sibs.map(a => a.id), reviewed: mine.map(r => r.claim) });
    for (const r of mine) explicit.add(r.claim);
  }
  // clause 3: attach at the highest formation below the corps all of whose leaves are drawn by the rule or already have a nearer road
  const leavesUnder = x => L5.units.filter(u => !u.children.length && chainOf(by, u.id).includes(x));
  const okLeaf = (u, x) => { if (u.render.status === 'not_on_field' || !L5.plans.get(u.id)) return true; const v = verdict.get(u.id); if (v) return v.status === 'sibling'; const info = PL.approachInfo(u.id); return !!info && chainOf(by, u.id).indexOf(info.owner) < chainOf(by, u.id).indexOf(x); };
  const allOk = x => leavesUnder(x).every(u => okLeaf(u, x)) && by.get(x).level !== 'corps' && by.get(x).level !== 'army';
  const nodeOf = new Map();
  for (const u of open) { const v = verdict.get(u.id); if (v.status !== 'sibling') continue; const ch = chainOf(by, u.id); let node = u.id; for (let i = 1; i < ch.length; i++) { if (allOk(ch[i])) node = ch[i]; else break; } nodeOf.set(u.id, node); }
  const rosterIdx = new Map(L5.units.map((u, i) => [u.id, i])), nodes = [...new Set(nodeOf.values())].sort((a, b) => rosterIdx.get(a) - rosterIdx.get(b));
  const approach = [];
  let n = firstId ?? (Math.max(0, ...PL.ap.filter(a => a.kind !== 'sibling').map(a => +/\d+/.exec(a.id)[0])) + 1);
  for (const node of nodes) {
    const leaves = open.filter(u => nodeOf.get(u.id) === node).map(u => u.id), v = verdict.get(leaves[0]), top = v.top;
    for (const l of leaves) { const w = verdict.get(l); if (w.road !== v.road || w.top !== top) errors.push(`${node}: leaves differ in road or corps`); }
    const sibs = ownAps.filter(a => by.has(a.unit) && chainOf(by, a.unit).includes(top) && a.unit !== top && !chainOf(by, node).includes(a.unit) && !PL.entryOf(a).error);
    const reviewed = [...new Set(leaves.flatMap(l => verdict.get(l).reviewed))].sort();
    const sibRow = a => {
      const c = a.claim ? (PL.claims[a.claim] || null) : null, u = by.get(a.unit);
      return { ap: a.id, unit: a.unit, unit_name: u.name, road: a.road, tier: a.tier, source: a.claim ? 'claim' : 'ledger_row', ...(a.claim ? { claim: a.claim, claims: a.claims, report: c.report, ...(c.source_kind ? { source_kind: c.source_kind, work: c.work } : {}), page: c.page, ledger: c.ledger, claim_tier: a.claim_tier } : { row: a.row, cell: a.cell }),
        phrase: a.phrase, phrase_in: a.phrase_in || 'ledger_cell', ...(a.concordance ? { concordance: a.concordance.id, printed_name: a.concordance.printed_name } : {}), ...(a.identification ? { identification: a.identification } : {}) };
    };
    approach.push({ id: `AP-${String(n++).padStart(2, '0')}`, kind: 'sibling', unit: node, formation: top, road: v.road, modelled: true, tier: MODELLED_TIER, decision: RULE_ID, register: REGISTER, added_in: 'v6',
      siblings: sibs.map(sibRow), claims: [...new Set(sibs.flatMap(a => a.claims || (a.claim ? [a.claim] : [])))], leaves, reviewed,
      note: `${node} has no road of approach on its line of command. Every documented formation of ${top} (${sibs.length}) names ${v.road}; no report on the line of command names another road, one the repository cannot place, or one outside the loaded ground (the claims read are in reviewed). The road is MODELLED from the siblings, not printed for this unit.` });
  }
  for (const [id, v] of verdict) if (v.status === 'sibling' && !nodeOf.has(id)) errors.push(`${id}: no node`);
  return { approach, verdict, nodeOf, errors, explicit: [...explicit].sort() };
}
