// Node tests (no browser) for the MODELLED roads of approach of history layer v6 (DEC-015): the sibling-road rule (tools/sibling-rule.mjs), the data it writes (data/sibling-approach.json),
// the hand-read classes (data/sibling-review.json), the loader's refusals, Q04, speeds, purity, the card, the contract, the register entry and the generated audit.
//   node --test docs/battle-theatre/app/tests/sibling.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { BT } from './node-world.mjs';
import { loadRawFromDisk, terrainMeta } from '../tools/history-report.mjs';
import { createRealHistory, SPEED } from '../src/history/real.mjs';
import { buildSibling, OUT } from '../tools/build-sibling-approach.mjs';
import { siblingRule, chainOf, SIBLING_CODES, BLOCKING_CLASSES } from '../tools/sibling-rule.mjs';
import { approachAudit, auditMarkdown, OUT_MD } from '../tools/approach-audit.mjs';
import { loadLedgers, unusable } from '../tools/claim-ledger.mjs';
import { boxCrossings, distM } from '../src/history/gazetteer.mjs';
import { validateUnits, validateProvenance } from '../src/history/contract.mjs';
import { provenanceSection } from '../src/ui/card-sections.mjs';
import { isoToMin } from '../src/clock.mjs';

const J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8')), clone = o => JSON.parse(JSON.stringify(o));
const raw = loadRawFromDisk(), TM = terrainMeta(), helpers = { civilDawn: m => m + 4 * 60 + 3 }, doc = raw.siblingApproach, review = J('app/data/sibling-review.json');
const raw5 = { ...raw, siblingApproach: null }, build = r => createRealHistory({ raw: r, T: TM, helpers }), L = build(raw), L5 = build(raw5);
const by = new Map(L.units.map(u => [u.id, u])), by5 = new Map(L5.units.map(u => [u.id, u]));
const newly = L.units.filter(u => u.drawn && !by5.get(u.id).drawn), newlyIds = new Set(newly.map(u => u.id));
const sibAps = L.placement.ap.filter(a => a.kind === 'sibling'), ownAps = L.placement.ap.filter(a => a.kind !== 'sibling');
const A5 = approachAudit({ raw: raw5, T: TM });
const refused = (mutate, re) => { const r = clone(doc); mutate(r); assert.throws(() => build({ ...raw, siblingApproach: r }), re); };

test('the data file is current: it equals what the rule writes from the v5 layer, the audit and the hand-read classes now, and the rule found no claim without a class', () => {
  assert.ok(doc && doc.version === 1 && doc.decision === 'DEC-015' && doc.register === 'EG-0070');
  const r = buildSibling({ raw, T: TM }); assert.deepEqual(r.errors, [], r.errors.join('\n'));
  assert.equal(fs.readFileSync(path.join(BT, OUT), 'utf8'), JSON.stringify(r.doc, null, 1) + '\n', 'data/sibling-approach.json is stale: run node docs/battle-theatre/app/tools/build-sibling-approach.mjs');
  assert.equal(doc.counts.open_leaves_v5, A5.openLeaves); assert.equal(Object.keys(doc.leaves).length, A5.openLeaves, 'a verdict for every leaf that was an open gap at v5');
  assert.equal(doc.counts.drawn, newly.length); assert.equal(sibAps.length, doc.approach.length);
});

test('the rule: a record rests on every documented sibling formation of its corps, all name the same gazetteer road that crosses the loaded ground, nothing on the unit’s own line of command prints a road, the tier is plausible-procedural and the record is marked modelled', () => {
  assert.ok(sibAps.length >= 6);
  for (const a of sibAps) {
    assert.equal(a.kind, 'sibling'); assert.equal(a.modelled, true); assert.equal(a.tier, 'plausible-procedural'); assert.equal(a.decision, 'DEC-015'); assert.equal(a.register, 'EG-0070'); assert.equal(a.added_in, 'v6');
    const road = L.gazetteer.resolve(a.road); assert.ok(road && road.line && boxCrossings(road.line, TM.meta).length > 0, `${a.id}: ${a.road} crosses the loaded ground`);
    const ch = chainOf(by, a.unit), top = a.formation; assert.ok(ch.includes(top) && top !== a.unit && by.get(top).level === 'corps' || by.get(top).level === 'division', `${a.id}: the formation is the corps`);
    assert.ok(!['corps', 'army'].includes(by.get(a.unit).level), `${a.id}: never attached at corps or army level`);
    assert.ok(!ch.some(x => ownAps.some(o => o.unit === x)), `${a.id}: a road is printed on the line of command`); assert.ok(!L.placement.block.some(b => ch.includes(b.unit)), `${a.id}: the reports of the line disagree`);
    const docs = ownAps.filter(o => chainOf(by, o.unit).includes(top) && o.unit !== top && !ch.includes(o.unit) && !L.placement.entryOf(o).error);
    assert.deepEqual(a.siblings.map(s => s.ap).sort(), docs.map(o => o.id).sort(), `${a.id}: every documented sibling is listed`); assert.ok(docs.length >= 1);
    for (const o of docs) { assert.equal(L.gazetteer.resolve(o.road).id, road.id, `${a.id}: sibling ${o.id} names ${o.road}`); const s = a.siblings.find(x => x.ap === o.id); assert.equal(s.phrase, o.phrase); assert.equal(s.unit, o.unit); assert.ok(['claim', 'ledger_row'].includes(s.source)); if (s.source === 'claim') { const c = L.placement.claims[s.claim]; assert.ok(c && c.verified === true && ['passed_full_read', 'corrected'].includes(c.fidelity) && ['documented', 'inferred'].includes(c.tier), s.claim); assert.equal(s.report, c.report); assert.equal(s.page, c.page); } else assert.ok(s.row && s.cell); }
    assert.ok(a.leaves.length && a.leaves.every(l => newlyIds.has(l)), `${a.id}: its leaves are the units it draws`);
  }
  // every newly drawn unit is drawn by exactly one sibling record; no unit that was drawn at v5 changed its road or its tier
  assert.deepEqual([...newlyIds].sort(), sibAps.flatMap(a => a.leaves).sort()); assert.equal(newly.length, 56);
  for (const u of L5.units) { const w = by.get(u.id); if (u.drawn) { assert.ok(w.drawn && w.approach.id === u.approach.id && w.approach.tier === u.approach.tier, `${u.id}: its road changed`); } }
  for (const u of newly) { assert.equal(u.approach.modelled, true); assert.equal(u.approach.tier, 'plausible-procedural'); assert.equal(u.approach.register, 'EG-0070'); assert.ok(sibAps.some(a => a.id === u.approach.id && a.leaves.includes(u.id))); }
});

test('what stays open and why: the disagreement block, claims that name a road the repository cannot place, the road outside the ground, the reports that disagree, Stuart’s cavalry, and a unit with no day position', () => {
  const code = id => doc.leaves[id].code, open = Object.entries(doc.leaves).filter(([, v]) => v.status === 'open');
  assert.equal(open.length + newly.length, A5.openLeaves);
  // siblings that disagree: the Second Corps (Early the Harrisburg Road, Rodes the Carlisle Road, Johnson’s brigades the Chambersburg Pike) and the Union cavalry corps
  for (const id of ['cs-2c-res-art-nelson', 'cs-2c-res-art-1vaartbn', 'us-cav-3d-custer-1mi', 'us-cav-3d-farnsworth-5ny', 'us-cav-art']) { assert.equal(code(id), 'siblings_disagree', id); assert.equal(by.get(id).drawn, false); assert.match(by.get(id).render.reason, /Sibling-road rule \(DEC-015.*not applied/); }
  assert.match(doc.leaves['cs-2c-res-art-nelson'].why, /Harrisburg Road/); assert.match(doc.leaves['cs-2c-res-art-nelson'].why, /Carlisle Road/); assert.match(doc.leaves['us-cav-art'].why, /Emmitsburg Road/);
  // Johnson’s road from Scotland, XI Corps’ Horner’s Mill route, Black Horse Tavern Road, Jones: never chosen
  assert.equal(code('cs-2c-johnson-jones-42va'), 'road_not_resolvable'); assert.equal(code('cs-2c-johnson-steuart-1nc'), 'road_not_resolvable'); assert.equal(code('us-11c-art-1ohi'), 'route_not_a_road'); assert.equal(code('us-11c-3d-krzyzanowski-58ny'), 'route_not_a_road'); assert.equal(code('us-cav-1d-gamble-8il'), 'road_not_resolvable', 'the Fairfield road of Hunt (RC-08, ledger E) cannot be placed');   // v8: the 2nd Division of the Eleventh Corps and Wiedrich's battery are drawn by ledger E (tests/ledgerE.test.mjs)
  assert.equal(code('us-3c-2d-carr-1ma'), 'road_outside_ground'); assert.equal(code('us-3c-2d-brewster-70ny'), 'road_outside_ground'); assert.equal(code('cs-2c-early-jones'), 'reports_disagree');
  assert.equal(open.filter(([, v]) => v.code === 'road_outside_ground').length, 12); assert.equal(open.filter(([, v]) => v.code === 'route_not_a_road').length, 14); assert.equal(open.filter(([, v]) => v.code === 'road_not_resolvable').length, 25);
  // a sibling road exists for Semmes, Wofford and Pickett, but no single-label day position: not drawn
  for (const id of ['cs-1c-mclaws-semmes-10ga', 'cs-1c-mclaws-wofford-16ga', 'cs-1c-pickett-kemper-1va']) { assert.equal(code(id), 'sibling_road_no_day_position', id); assert.equal(by.get(id).drawn, false); assert.ok(!by5.get(id).day_positions || !by5.get(id).day_positions.days.some(d => d.status === 'single')); }
  // Stuart’s cavalry: the sibling rule is not applied; none has a day position
  const cav = open.filter(([id]) => id.startsWith('cs-cav-')); assert.equal(cav.length, 16); for (const [id, v] of cav) { assert.equal(v.code, 'cavalry_own_road_only', id); assert.equal(v.day_position, false, id); assert.equal(by.get(id).drawn, false); }
  // no open unit with a single-label day position and a road-free line of command is left without a reason; every open code is a known one
  const known = new Set([...SIBLING_CODES.map(c => c[0]), 'road_outside_ground', 'road_not_resolvable', 'route_not_a_road', 'reports_disagree', 'no_figure']); for (const [id, v] of open) { assert.ok(known.has(v.code), `${id}: ${v.code}`); assert.ok(v.why && v.why.length > 20, id); }
  for (const id of ['us-aop-hq', 'us-hancock-acting', 'cs-anv-hq', 'cs-1c-art']) assert.equal(code(id), 'no_figure');
  assert.equal(L.counts.not_drawn, A5.openLeaves - 56); assert.equal(L.counts.drawn, L5.counts.drawn + 56); assert.equal(L.counts.total, 726);
});

test('the rule is mechanical: changing a class, a sibling or a road changes the outcome as the rule says (the engine re-run on altered inputs)', () => {
  const g = id => (id in review.claims ? review.claims[id] : null);
  const run = rv => siblingRule({ L5, rows: A5.rows, review: rv, leafReason: A5.leafReason, gateOf: id => { const e = L5.model.effective(id, {}, helpers); return e ? e.earliest : -Infinity; } });
  const base = run(review); assert.deepEqual(base.errors, []); assert.equal([...base.verdict.values()].filter(v => v.status === 'sibling').length, 56);
  // the Horner’s Mill claim read as an in-field claim: the Eleventh Corps would take the First Division’s road (AP-10)
  const rv = clone(review); rv.claims['POS-A-CV1-038'] = { class: 'in_field' }; const r2 = run(rv);
  assert.ok(![...r2.verdict.entries()].some(([id, v]) => id.startsWith('us-11c-2d') && v.code === 'route_not_a_road'), 'the Horner’s Mill claim is what keeps the 2nd Division open'); assert.ok([...r2.verdict.entries()].filter(([id, v]) => id.startsWith('us-11c-3d') && v.code === 'route_not_a_road').length === 10, 'the 3rd Division’s own claim (taking the route by Horner’s Mill) still blocks it');
  // a claim of the First Corps’ line of command read as naming another road: the units below it drop out
  const rv2 = clone(review); rv2.claims['PD-1c-hood-01'] = { class: 'other_approach' }; const r3 = run(rv2);
  assert.ok([...r3.verdict.entries()].filter(([id]) => id.startsWith('cs-1c-hood-')).every(([, v]) => v.status === 'open'), 'a blocking class on the Hood claim stops all of Hood’s division'); assert.ok([...r3.verdict.entries()].some(([id, v]) => id.startsWith('cs-1c-mclaws-barksdale') && v.status === 'sibling'), 'McLaws’ Barksdale is untouched');
  // a claim without a class stops the build
  const rv3 = clone(review); delete rv3.claims['PD-1c-hood-01']; rv3.by_code = { ...rv3.by_code }; delete rv3.by_code.road_not_printed; const r4 = run(rv3); assert.ok(r4.errors.some(e => /PD-1c-hood-01.*no class/.test(e)), 'every claim on the line of command needs a class');
  // the classes that block
  assert.deepEqual(BLOCKING_CLASSES.slice().sort(), review.blocks.slice().sort()); for (const c of BLOCKING_CLASSES) assert.ok(review.classes[c]);
  assert.ok(g('POS-A-CV1-038').class === 'unplaceable' && g('POS-A-CV1-038').code === 'route_not_a_road');
});

test('the hand-read classes: every class is defined, every claim exists and is usable, every claim on the line of command of a drawn unit has an explicit class and a note', () => {
  const led = new Map(loadLedgers().claims.map(c => [c.claim_id, c]));
  for (const [id, v] of Object.entries(review.claims)) { const c = led.get(id); assert.ok(c && !unusable(c), `${id}: a usable claim`); assert.ok(v.class in review.classes, `${id}: class ${v.class}`); assert.ok(v.note && v.note.length > 30, `${id}: a note`); }
  for (const [code, cls] of Object.entries(review.by_code)) assert.ok(cls in review.classes, `${code} -> ${cls}`);
  for (const id of doc.reviewed_claims) { assert.ok(review.claims[id], `${id}: explicit class`); assert.ok(!BLOCKING_CLASSES.includes(review.claims[id].class), `${id}: a claim on a drawn unit's line cannot block`); }
  for (const a of doc.approach) assert.ok(a.reviewed.every(id => doc.reviewed_claims.includes(id)));
  // every claim of the audit on the line of command of a drawn unit
  for (const u of newly) { const ch = new Set(chainOf(by, u.id)); for (const r of A5.rows) if (ch.has(r.unit) && r.code !== 'used' && r.code !== 'record_text_only') assert.ok(review.claims[r.claim], `${r.claim} (${r.unit}) is on the line of ${u.id} and has no explicit class`); }
  // the one claim that holds the Eleventh Corps open is not an approach road of the repository
  assert.ok(!L.placement.ap.some(a => (a.claims || []).includes('POS-A-CV1-038')));
});

test('the loader refuses a modelled record that is not complete, not unanimous, not below the corps, on a line that prints a road, or not marked', () => {
  const a0 = doc.approach.find(a => a.formation === 'cs-1c'), b0 = doc.approach.find(a => a.formation === 'us-5c');
  refused(r => { r.approach[0].siblings.pop(); }, /documented siblings under us-5c are AP-04,AP-11, the record lists AP-04/);
  refused(r => { r.approach[0].road = 'Baltimore Pike'; }, /names Hanover Road, not Baltimore Pike/);
  refused(r => { r.approach.find(a => a.formation === 'cs-1c').road = 'Emmitsburg Road'; }, /names Chambersburg Pike, not Emmitsburg Road/);
  refused(r => { r.approach[0].formation = r.approach[0].unit; }, /not a formation above/);
  refused(r => { r.approach[0].unit = 'us-5c'; }, /never attached at corps or army level/);
  refused(r => { r.approach[0].unit = 'us-5c-2d'; r.approach[0].formation = 'us-5c'; }, /a road is printed for a formation on the line of command|do not exist|not under/);
  refused(r => { r.approach[0].modelled = false; }, /modelled and plausible-procedural/); refused(r => { r.approach[0].tier = 'inferred'; }, /modelled and plausible-procedural/);
  refused(r => { r.approach[0].siblings[0].phrase = 'invented words'; }, /not copied from its approach record/);
  refused(r => { r.approach[0].register = ''; }, /the decision and the register entry are named/); refused(r => { r.approach[0].leaves = []; }, /no leaf unit/);
  refused(r => { r.approach[0].leaves.push('cs-1c-hood-law-4al'); }, /not under/);
  refused(r => { r.approach.push({ ...clone(r.approach[0]), id: 'AP-99', unit: 'cs-1c-mclaws-kershaw-2sc', formation: 'cs-1c' }); }, /a road is printed for a formation on the line of command|names|lists/);
  // a block row on the line of command (the reports disagree) forbids a modelled road
  { const r = clone(raw); r.siblingApproach = clone(doc); r.placementClaims = clone(raw.placementClaims); r.placementClaims.approach_block = [...r.placementClaims.approach_block, { unit: 'us-5c-1d', claims: [], values: ['a', 'b'], reason: 'a test block row long enough to count as a reason' }]; assert.throws(() => build(r), /disagree \(approach_block\)/); }
  // the file without the claims it refers to: refused, not ignored
  assert.throws(() => build({ ...raw, placementClaims: null }), /placement.json does not hold/);
  assert.ok(a0 && b0);
});

test('Q04 and the minute at the edge: no gate moves, no new unit exists before its gate, in several scenarios; speeds never exceed double-quick and a leg to a day position is a march', () => {
  const SC = [{}, { choices: { 'C-004': 'v0' }, optionText: { 'C-004': '22:30 Jul 1' } }, { choices: { 'C-004': 'v3' }, optionText: { 'C-004': '07:00 Jul 2' } }];
  for (const sc of SC) {
    const a6 = new Map(L.arrivals(sc).map(a => [a.unit, a])), a5 = new Map(L5.arrivals(sc).map(a => [a.unit, a])), ev = L.events(sc), enter = new Map(ev.filter(e => e.type === 'enter').map(e => [e.unit, e.t]));
    for (const [id, a] of a5) { assert.equal(a6.get(id).earliest, a.earliest, `${id}: a gate moved`); assert.equal(a6.get(id).default, a.default); assert.equal(a6.get(id).latest, a.latest); }
    for (const u of newly) { const a = a6.get(u.id); assert.ok(a.entry && a.tier === 'plausible-procedural', u.id); assert.ok(enter.has(u.id) && enter.get(u.id) >= a.earliest - 1e-9, `${u.id}: enters at ${enter.get(u.id)} before its gate ${a.earliest}`); assert.ok(enter.get(u.id) <= a.latest + 1e-9); assert.match(a.entry_status, /plausible-procedural/); }
    for (const e of ev) if (e.type === 'path' && newlyIds.has(e.unit)) for (let i = 1; i < e.wp.length; i++) { const v = distM(e.wp[i - 1], e.wp[i]) / ((e.wp[i].t - e.wp[i - 1].t) * 60); assert.ok(v <= SPEED.double_quick * 1.0001 + 1e-9, `${e.unit}: ${v.toFixed(2)} m/s`); }
    for (const e of ev) if (newlyIds.has(e.unit) && e.type !== 'enter') assert.ok(e.t >= a6.get(e.unit).earliest - 1e-9, `${e.unit}: ${e.type} at ${e.t} before the gate`);
  }
  const rep = L.report({}); assert.equal(rep.defects.length, 0, 'no timed place is reached late'); assert.ok(rep.offsets.length >= L5.report({}).offsets.length);
  for (const u of newly) assert.ok(['moving', 'edge_only'].includes(L.plans.get(u.id).status));
  assert.equal(newly.filter(u => L.plans.get(u.id).status === 'moving').length, 56, 'every modelled unit stands at its day position'); assert.equal(L.counts.edge_only, L5.counts.edge_only);
});

test('every modelled unit has a gate and a single-label day position that is drawn, documented for the day; the card says so', () => {
  for (const u of newly) {
    const d = u.day_positions; assert.ok(d && d.days.some(x => x.status === 'single' && x.drawn_as === 'placed'), `${u.id}: a drawn single-label day position`);
    const plan = L.plans.get(u.id); assert.ok(plan.days && plan.days.some(x => x.feasible && x.tier === 'documented'), u.id); assert.ok(Number.isFinite(L.model.effective(u.id, {}, helpers).earliest));
  }
  assert.ok(newly.some(u => L.plans.get(u.id).days.length >= 2), 'a unit with positions on two days keeps both');
});

test('purity: a fresh layer gives the same arrivals, events and report for the modelled units whatever the order of evaluation', () => {
  const key = Ly => { const be = Ly.both({}), sc = { choices: { 'C-004': 'v0' }, optionText: { 'C-004': '22:30 Jul 1' } }; const e = Ly.events(sc); return JSON.stringify([be.arrivals.filter(a => newlyIds.has(a.unit)), be.events.filter(x => newlyIds.has(x.unit)), e.filter(x => newlyIds.has(x.unit)), Ly.report({}).day_stops.filter(d => newlyIds.has(d.unit))]); };
  const a = build(raw), b = build(raw); const ka = key(a); b.events({ choices: { 'C-004': 'v3' }, optionText: { 'C-004': '07:00 Jul 2' } }); b.report({}); assert.equal(key(b), ka); assert.equal(key(L), ka);
  assert.equal(JSON.stringify(build({ ...raw, siblingApproach: null }).units.map(u => [u.id, u.drawn])), JSON.stringify(L5.units.map(u => [u.id, u.drawn])));
});

test('the card: a modelled unit says MODELLED, names the register entry and the decision, lists every sibling with its report, page and printed words, says what is documented and what is modelled, and lists the claims; the contract validates', () => {
  assert.deepEqual(validateUnits(L.units), []);
  for (const u of newly) {
    const t = u.approach.text, a = sibAps.find(x => x.id === u.approach.id);
    assert.match(t, /^MODELLED APPROACH \(plausible-procedural; evidence gap EG-0070, decision DEC-015\)/); assert.match(t, new RegExp(`Approach ${a.id}: ${a.road}`)); assert.match(t, /may in fact have come by another road/); assert.match(t, /Documented: the unit.s arrival gate \([^)]+; it is never moved\) and its position on each day it has one: Bachelder 1876 sheet \d/); for (const d of u.day_positions.days.filter(x => x.status === 'single')) { const c = L.dayClaims[d.used]; assert.ok(t.includes(`“${c.printed}” (${c.id}), ± ${Math.round(c.sigma_m)} m`), `${u.id}: the day position ${c.id} is on the card`); } assert.match(t, /Modelled: the road, when the unit reaches the edge of the ground/);
    assert.match(t, /Place in the column: \d+ of \d+, in roster order/); assert.match(t, /order of march within a column is an open gap \(evidence gap EG-0005/);
    for (const s of a.siblings) { assert.ok(t.includes(s.ap) && t.includes(`“${s.phrase}”`), `${u.id}: sibling ${s.ap}`); if (s.source === 'claim') { assert.ok(t.includes(s.report) && t.includes(`page ${s.page}`) && t.includes(s.claim), `${u.id}: ${s.claim}`); } else assert.ok(t.includes(s.row), s.row); }
    assert.ok(u.notes.includes('MODELLED APPROACH')); assert.ok(u.sources.includes('EG-0070') && L.sources['EG-0070'] && L.sources['EG-0070'].kind === 'register'); assert.equal(u.tier, 'plausible-procedural');
    assert.ok(u.provenance && u.provenance.entries.some(e => e.modelled && e.entry === a.id && e.applied && e.kind === 'approach' && e.tier === 'plausible-procedural' && e.siblings.length === a.siblings.length), u.id);
    assert.deepEqual(validateProvenance(u.provenance, u.id), []); const h = provenanceSection(u); assert.match(h, /Approach road <b>\(modelled\)<\/b>/); assert.match(h, /Not printed for this unit or for any formation above it/); assert.match(h, /EG-0070/); assert.match(h, /DEC-015/); assert.doesNotMatch(h, /Claude|Anthropic|\bAI\b|generated|subagent/i);
    for (const s of a.siblings) if (s.claim) assert.ok(h.includes(s.claim) && h.includes(s.report), `${u.id}: the claim ${s.claim} is listed`);
    assert.doesNotMatch(t, /Claude|Anthropic|\bAI\b|subagent/i);
  }
  // a unit that was drawn at v5 does not say modelled, and an open unit says why the rule did not apply
  const kersh = L.units.find(u => u.id.startsWith('cs-1c-mclaws-kershaw-') && u.drawn); assert.equal(kersh.approach.modelled, false); assert.doesNotMatch(kersh.approach.text, /MODELLED/);
  const open = by.get('us-11c-3d-krzyzanowski-58ny'); assert.equal(open.drawn, false); assert.match(open.render.reason, /Open gap: /); assert.match(open.render.reason, /Sibling-road rule \(DEC-015, a modelled road taken from the other formations of the corps\): not applied, because/); assert.match(open.render.reason, /Horner/);
  // the contract refuses a modelled entry that does not name its siblings
  const u = newly[0], bad = clone(u.provenance); bad.entries.find(e => e.modelled).siblings = []; assert.ok(validateProvenance(bad, u.id).length > 0);
  const bad2 = clone(u.provenance); bad2.entries.find(e => e.modelled).tier = 'inferred'; assert.ok(validateProvenance(bad2, u.id).length > 0);
});

test('the register entry and the decision: EG-0070 exists with a file, tier plausible-procedural, a product marking and an owner question; DEC-015 is in the Decision Log as a provisional builder choice', () => {
  const reg = JSON.parse(fs.readFileSync(path.join(BT, 'GOVERNANCE/register_index.json'), 'utf8')), e = reg.find(x => x.id === 'EG-0070'); assert.ok(e, 'EG-0070 in register_index.json');
  assert.equal(e.tier, 'plausible-procedural'); for (const k of ['title', 'rids', 'cat', 'desc', 'why', 'searched', 'subst', 'recon', 'marking', 'status', 'owner_q']) assert.ok(e[k] && e[k].length, `EG-0070.${k}`);
  assert.match(e.marking, /Modelled approach/); const md = fs.readFileSync(path.join(BT, 'GOVERNANCE/register/EG-0070.md'), 'utf8'); assert.match(md, /^# EG-0070:/); assert.match(md, /plausible-procedural/);
  const dl = fs.readFileSync(path.join(BT, 'GOVERNANCE/decision_log.md'), 'utf8'); const i = dl.indexOf('## DEC-015'); assert.ok(i > 0, 'DEC-015'); const sec = dl.slice(i);
  for (const re of [/provisional builder choice/i, /NOT owner decisions?/, /EG-0070/, /sibling/i, /Kershaw/, /Horner/, /Scotland/, /Black Horse Tavern/, /Jones/, /Stuart/, /Semmes/]) assert.match(sec, re);
  assert.ok(!/DECIDED/.test(sec.split('\n').slice(0, 3).join(' ')));
});

test('the generated audit and notes are current and say the counts: APPROACH-AUDIT.md equals what the tool writes, the notes carry the v6 section and the share of the 726 by approach', () => {
  const A = approachAudit({ raw, T: TM }); assert.ok(A.v6); assert.deepEqual(A.errors, []);
  assert.equal(fs.readFileSync(path.join(BT, OUT_MD), 'utf8'), auditMarkdown(A), 'APPROACH-AUDIT.md is stale: run node docs/battle-theatre/app/tools/approach-audit.mjs');
  const v = A.v6; assert.equal(v.before.drawn, L5.counts.drawn); assert.equal(v.after.drawn, L.counts.drawn); assert.equal(v.gatesMoved, 0); assert.equal(v.early, 0); assert.equal(v.defects, 0);
  assert.equal(v.after.basis.own + v.after.basis.corps + v.after.basis.modelled, L.counts.drawn); assert.equal(v.after.basis.modelled, 56); assert.equal(v.after.tier.documented, 0); assert.equal(v.after.tier.inferred, v.after.basis.own); assert.equal(v.after.tier['plausible-procedural'], v.after.basis.corps + v.after.basis.modelled);
  assert.equal(v.after.basisFigures.modelled, newly.reduce((n, u) => n + u.strength.drawn, 0));
  assert.equal(Object.values(v.reasons).reduce((a, b) => a + b.leaves, 0), A.openLeaves); assert.equal(v.open_leaves, L.units.filter(u => !u.children.length && u.render.status === 'not_drawn').length);
  const md = fs.readFileSync(path.join(BT, OUT_MD), 'utf8'); for (const id of md.match(/AP-\d\d/g)) assert.ok(L.placement.ap.some(a => a.id === id), `${id} exists`);
  for (const re of [/\| units drawn \| 374 \| 430 \| \+56 \|/, /430 are drawn \(59\.2%\)/, /a MODELLED road taken from the sibling formations of the corps \(DEC-015\)\| plausible-procedural \| 56 \| 7\.7%/.source.replace('\\|', '|')]) { /* the exact wording is checked below */ }
  assert.ok(md.includes('| units drawn | 383 | 439 | +56 |')); assert.ok(md.includes('439 are drawn (60.5%)')); assert.ok(md.includes('| plausible-procedural | 56 | 7.7% | 12.8% |'));
  const notes = fs.readFileSync(path.join(BT, 'app/HISTORY-LAYER-NOTES.md'), 'utf8'); assert.ok(notes.includes('## Roads of approach (history layer v6: modelled roads taken from the sibling formations of the corps)')); assert.ok(notes.includes('| units drawn | 383 | 439 | +56 |')); assert.ok(notes.includes('8. **Modelled roads of approach** (DEC-015'));
  assert.ok(notes.includes(`Units with a resolved entry: ${L.counts.drawn} (${L.counts.moving} placed, ${L.counts.edge_only} edge only).`));
});

test('the page loads the file: data.mjs asks for it, and the layer is the v5 layer when the file is absent', () => {
  const src = fs.readFileSync(path.join(BT, 'app/src/data.mjs'), 'utf8'); assert.match(src, /sibling-approach\.json/); assert.match(src, /return \{ placementClaims, siblingApproach,/);
  assert.equal(build({ ...raw, siblingApproach: null }).counts.drawn, L5.counts.drawn); assert.equal(build({ ...raw, siblingApproach: undefined }).counts.drawn, L5.counts.drawn);
  assert.ok(isoToMin('1863-07-02T12:00') > 0);
});
