// Node tests (no browser) for history layer v8 (DEC-023E, contract 1.8): ledger E (the state regimental volumes, history/positions/positions_E.jsonl) admitted exactly like ledgers A to D, the roads and stops
// it adds, the documented absence of the 84th Pennsylvania (an overlay), purity under shuffled evaluation, the Q04 invariants and the counts the notes state.
//   node --test docs/battle-theatre/app/tests/ledgerE.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { BT } from './node-world.mjs';
import { loadRawFromDisk, terrainMeta } from '../tools/history-report.mjs';
import { createRealHistory, SPEED } from '../src/history/real.mjs';
import { loadLedgers, unusable, digest, sourceOf, withoutV8, LEDGER_NAMES, POS_DIR } from '../tools/claim-ledger.mjs';
import { buildClaims } from '../tools/build-claim-placement.mjs';
import { ledgerEReport, DETACHED } from '../tools/ledgerE-report.mjs';
import { validateUnits, validateProvenance } from '../src/history/contract.mjs';
import { provenanceSection } from '../src/ui/card-sections.mjs';
import { norm, distM } from '../src/history/gazetteer.mjs';
import { rand } from '../../sim/rng.mjs';
import { isoToMin } from '../src/clock.mjs';

const J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8')), clone = o => JSON.parse(JSON.stringify(o));
const raw = loadRawFromDisk(), TM = terrainMeta(), helpers = { civilDawn: m => m + 4 * 60 + 3 }, doc = raw.placementClaims, disp = raw.claimDispositions;
const build = r => createRealHistory({ raw: r, T: TM, helpers });
const L = build(raw), L7 = build({ ...raw, placementClaims: withoutV8(doc) });                  // L7: the layer without ledger E (the sibling records are the same)
const led = loadLedgers(), E = led.claims.filter(c => c.ledger === 'E'), byClaim = new Map(led.claims.map(c => [c.claim_id, c])), by = new Map(L.units.map(u => [u.id, u])), by7 = new Map(L7.units.map(u => [u.id, u]));
const ABS = 'us-3c-2d-carr-84pa', eAp = doc.approach.filter(a => a.ledger === 'E'), ePo = doc.positions.filter(p => p.ledger === 'E');
const SCENARIOS = [
  {}, { choices: { 'C-004': 'v0' }, optionText: { 'C-004': '22:30 Jul 1' } }, { choices: { 'C-004': 'v3' }, optionText: { 'C-004': '07:00 Jul 2' } },
  { choices: { 'C-003': 'v1', 'C-005': 'v2' }, optionText: { 'C-003': '08:00 (head of column)', 'C-005': '07:30 (EPP, FREE, PADRE)' } }, { choices: { 'C-043': 'v3' }, optionText: { 'C-043': '17:00' } },
];
const field = (c, f) => (f === 'quote' ? c.source.quote : f === 'place.printed' ? c.place.printed : f === 'direction_or_road' ? c.place.direction_or_road : '') || '';
const refused = (mutate, re) => { const d = clone(doc); mutate(d); assert.throws(() => build({ ...raw, placementClaims: d }), re); };

test('the adapter: a claim of ledger E names its source by volume and section, a claim of A to D by report id; the digests of A to D are unchanged and E digests carry the extra fields', () => {
  assert.equal(LEDGER_NAMES.E, 'positions_E.jsonl'); assert.ok(fs.existsSync(path.join(POS_DIR, LEDGER_NAMES.E)));
  assert.equal(E.length, 200); assert.ok(E.every(c => !c.source.report_id && c.source.volume && c.source.section && c.source.work));
  for (const c of E) { const s = sourceOf(c); assert.equal(s.kind, 'statevol'); assert.equal(s.id, c.source.section); }
  const a = led.claims.find(c => c.ledger === 'A'); assert.deepEqual(sourceOf(a), { kind: 'or27', id: a.source.report_id });
  for (const c of led.claims.filter(c => c.ledger !== 'E')) { const g = digest(c); assert.ok(!('source_kind' in g) && !('work' in g), `${c.claim_id}: an OR27 digest gets no state-volume field`); assert.equal(g.report, c.source.report_id || c.source.record_id || null); }
  for (const c of E) { const g = digest(c); assert.equal(g.source_kind, 'statevol'); assert.equal(g.report, c.source.section); assert.equal(g.work, c.source.work); assert.equal(g.volume, c.source.volume); assert.equal(g.quote, c.source.quote); assert.equal(g.page, c.source.printed_page); assert.ok(g.quote_words <= 14); }
  // the doc carries E digests only for claims an entry, a conflict, a peer or an absence uses; each equals the ledger line
  for (const [id, g] of Object.entries(doc.claims)) assert.deepEqual(g, digest(byClaim.get(id)), `${id}: the digest is the ledger line`);
  assert.ok(Object.values(doc.claims).some(g => g.source_kind === 'statevol'));
});

test('E claims are admitted by the rules of A to D: the same three conditions, documented and inferred kept, one disposition for each of the 200 claims, the file is the ledger as it is now', () => {
  assert.equal(doc.ledgers.E.included, true); assert.equal(doc.ledgers.E.claims, 200); assert.equal(doc.ledgers.E.sha256, led.meta.E.sha256, 'ledger E changed: run tools/build-claim-placement.mjs');
  assert.equal(E.filter(c => c.tier === 'documented').length, 61); assert.equal(E.filter(c => c.tier === 'inferred').length, 139); assert.ok(E.every(c => !unusable(c)), 'all 200 pass the use rule (verified, fidelity passed_full_read or corrected, tier documented or inferred)');
  const rows = disp.rows.filter(r => r[1] === 'E'); assert.equal(rows.length, 200); assert.equal(new Set(rows.map(r => r[0])).size, 200);
  const used = rows.filter(r => /^(used|transcribed)/.test(r[4])); assert.equal(used.length, 7);
  const tiers = { documented: 0, inferred: 0 }; for (const r of used) tiers[byClaim.get(r[0]).tier]++; assert.deepEqual(tiers, { documented: 3, inferred: 4 });
  for (const r of rows) if (r[4] === 'unresolved') { assert.ok(r[5] && r[6] && r[6].length >= 8, `${r[0]}: a reason`); }
  // an unusable E claim is refused like any other claim (the same function)
  const bad = clone(E[0]); bad.fidelity_check = 'downgraded'; assert.match(unusable(bad), /fidelity_check/); bad.fidelity_check = 'passed_full_read'; bad.tier = 'plausible-procedural'; assert.match(unusable(bad), /tier/); bad.tier = 'inferred'; bad.claim_support_verified = false; assert.match(unusable(bad), /claim_support_verified/);
  // the builder reproduces the files on disk, and every candidate is in the curation table
  const res = buildClaims({}); assert.deepEqual(res.errors, [], res.errors.join('\n')); assert.ok(!res.missing); assert.deepEqual(JSON.parse(JSON.stringify(res.doc)), doc); assert.deepEqual(JSON.parse(JSON.stringify(res.dispositions)), disp);
  // a 'record' phrase is checked against an OR27 record: refused for a state-volume claim
  const cur = J('app/data/claim-curation.json'); cur.approach = cur.approach.map(a => (a.claim === 'POS-E-US-11C-2D-004' ? { ...a, phrase_in: 'record' } : a));
  const r2 = buildClaims({ curation: cur }); assert.ok(r2.errors.some(e => /state regimental volume/.test(e)), r2.errors.join('\n'));
});

test('every E entry is literal: the phrase is in the claim\'s quote or printed words, the road is a gazetteer line, a stop\'s place is the ledger\'s gazetteer place and is printed, its time is the printed clock or period; the placement tier is inferred and the claim tier is shown', () => {
  assert.equal(eAp.length, 2); assert.equal(ePo.length, 1);
  for (const e of [...eAp, ...ePo]) {
    const c = byClaim.get(e.claim); assert.equal(c.ledger, 'E'); assert.equal(unusable(c), null); assert.notEqual(e.phrase_in, 'record'); assert.ok(['quote', 'place.printed', 'direction_or_road'].includes(e.phrase_in), e.id);
    assert.ok(norm(field(c, e.phrase_in)).includes(norm(e.phrase)), `${e.id}: “${e.phrase}” in ${e.phrase_in}`); assert.ok(e.phrase.trim().split(/\s+/).length <= 15); assert.equal(e.tier, 'inferred'); assert.equal(e.claim_tier, c.tier);
    for (const id of e.claims) { const k = byClaim.get(id); assert.ok(k && !unusable(k), `${e.id}: support ${id} is usable`); }
  }
  for (const e of eAp) { const road = L.gazetteer.resolve(e.road); assert.ok(road && road.line, e.road); assert.equal(e.road, 'Emmitsburg Road'); assert.ok(e.id === 'AP-42' || e.id === 'AP-43'); assert.equal(e.added_in, 'v8'); }
  const po = ePo[0]; assert.equal(po.t_basis, 'convention'); assert.equal(po.period, 'night'); assert.equal(po.t, '1863-07-01T20:04'); assert.equal(po.place, 'The Peach Orchard'); assert.equal(po.claim_tier, 'documented');
  // the loader re-checks all of it
  refused(d => { d.approach.find(a => a.id === 'AP-42').phrase = 'the Black Horse Tavern road'; }, /is not in the direction_or_road/);
  refused(d => { d.approach.find(a => a.id === 'AP-42').road = 'Nowhere Road'; }, /is not a gazetteer line/);
  refused(d => { d.positions.find(p => p.ledger === 'E').t = '1863-07-01T19:00'; }, /is not the night convention|is not the .* convention/);
  refused(d => { d.claims['POS-E-US-11C-2D-004'].verified = false; }, /may not be used/);
  refused(d => { d.claims['POS-E-US-11C-2D-004'].fidelity = 'downgraded'; }, /may not be used/);
});

test('roads of approach: the 2nd Division of the Eleventh Corps and Wiedrich\'s battery are drawn by the Emmitsburg Road, the units nothing prints a road for stay open, no claim names the Black Horse Tavern road for the Eleventh Corps, nothing is invented', () => {
  const drawn2d = L.units.filter(u => u.drawn && u.id.startsWith('us-11c-2d-')); assert.equal(drawn2d.length, 8); for (const u of drawn2d) { assert.equal(u.approach.id, 'AP-42'); assert.equal(u.approach.road, 'Emmitsburg Road'); assert.equal(u.approach.tier, 'inferred'); assert.equal(u.approach.inherited, true); assert.equal(u.approach.owner, 'us-11c-2d'); }
  const bat = by.get('us-11c-art-1nyi'); assert.ok(bat.drawn); assert.equal(bat.approach.id, 'AP-43');
  const newly = L.units.filter(u => u.drawn && !by7.get(u.id).drawn); assert.equal(newly.length, 9); assert.deepEqual(newly.map(u => u.approach.id).sort(), ['AP-42', 'AP-42', 'AP-42', 'AP-42', 'AP-42', 'AP-42', 'AP-42', 'AP-42', 'AP-43']);
  assert.ok(L.units.filter(u => u.drawn).every(u => by7.get(u.id).drawn || newly.includes(u)), 'no unit lost its picture'); for (const u of by7.values()) if (u.drawn) assert.equal(by.get(u.id).approach.id === u.approach.id || by.get(u.id).approach.modelled, true, `${u.id}: its road changed`);
  // the open lines: the Third Corps 2nd Division (Black Horse Tavern, AP-07 does not cross the ground) and the Eleventh Corps 3rd Division (Horner's Mills and a route through the town) stay open
  for (const u of L.units.filter(u => !u.children.length && (u.id.startsWith('us-3c-2d-') || u.id.startsWith('us-11c-3d-')))) assert.equal(u.drawn, by7.get(u.id).drawn, `${u.id}: ledger E changed nothing for it (no claim prints a road of approach for it)`);
  for (const u of L.units.filter(u => !u.children.length && (/^us-3c-2d-(carr|brewster)-/.test(u.id) || u.id.startsWith('us-11c-3d-')))) assert.equal(u.drawn, false, `${u.id} stays an open gap or is documented absent`);
  for (const e of [...eAp, ...doc.approach.filter(a => a.unit.startsWith('us-11c'))]) assert.ok(!/black horse/i.test(e.road + ' ' + e.phrase), `${e.id}: no claim names the Black Horse Tavern road for the Eleventh Corps`);
  assert.ok(!E.some(c => c.unit_id.startsWith('us-11c') && /black horse/i.test([c.source.quote, c.place.printed, c.place.direction_or_road].join(' '))), 'ledger E prints no Black Horse Tavern road for the Eleventh Corps');
  const bh = E.filter(c => /black horse/i.test([c.source.quote, c.place.printed, c.place.direction_or_road].join(' '))); assert.ok(bh.length >= 1 && bh.every(c => c.unit_id.startsWith('us-3c-2d')), 'the Black Horse Tavern is printed for the Third Corps 2nd Division (the 26th PA) only');
  for (const c of bh) assert.ok(!doc.approach.some(a => a.claims.includes(c.claim_id)), `${c.claim_id} drives no approach`);
  // the Horner's Mills claim of the 2nd Division is listed on the card of a unit drawn by AP-42 as a conflicting claim, none chosen
  const u = drawn2d[0], html = provenanceSection(u); assert.match(html, /state regimental volume New York at Gettysburg \(1902\) vol\. 3, section <code>NY3-S/); assert.doesNotMatch(html, /OR27 report <code>NY/); assert.match(html, /POS-E-US-11C-2D-004/); assert.match(html, /quoted words: “/); assert.match(html, /claim tier inferred/);
  assert.match(html, /POS-E-US-11C-2D-001/); assert.match(html, /none is chosen/); assert.match(u.approach.text, /state regimental volume New York at Gettysburg \(1902\) vol\. 3, section NY3-S/); assert.doesNotMatch(u.approach.text, /OR27 report NY/);
  assert.deepEqual(validateProvenance(u.provenance, u.id), []); assert.deepEqual(validateUnits(L.units), []);
});

test('Q04: no gate moves, no unit enters before its gate, a claim earlier than its unit\'s gate is kept and not applied, a unit drawn by E enters where its road crosses the edge at its gate and marches at most double-quick', () => {
  const a7 = new Map(L7.arrivals({}).map(a => [a.unit, a])), a8 = new Map(L.arrivals({}).map(a => [a.unit, a]));
  for (const [id, a] of a7) { if (id === ABS) continue; const b = a8.get(id); assert.ok(b, id); assert.equal(b.earliest, a.earliest, `${id}: earliest moved`); assert.equal(b.default, a.default, `${id}: default moved`); assert.equal(b.latest, a.latest, `${id}: latest moved`); }
  for (const sc of SCENARIOS) {
    const { events, arrivals } = L.both(sc), A = new Map(arrivals.map(a => [a.unit, a])), enter = new Map();
    for (const e of events) { assert.ok(e.t >= A.get(e.unit).earliest - 1e-9, `${e.unit}: ${e.type} before its earliest`); if (e.type === 'enter') enter.set(e.unit, e); }
    for (const e of events) if (e.type === 'path') for (let i = 1; i < e.wp.length; i++) assert.ok(distM(e.wp[i - 1], e.wp[i]) / ((e.wp[i].t - e.wp[i - 1].t) * 60) <= SPEED.double_quick * 1.0001 + 1e-9, `${e.unit}: faster than double-quick`);
    for (const u of L.units.filter(u => u.drawn && u.approach.id && /^AP-4[23]$/.test(u.approach.id))) { const en = enter.get(u.id); assert.ok(en && en.t >= A.get(u.id).earliest - 1e-9, `${u.id} enters at or after its gate`); }
  }
  const e = disp.earlier_than_gate.filter(x => x.ledger === 'E'); assert.ok(e.length >= 1); for (const x of e) { assert.ok(Number.isFinite(x.gate_min)); assert.ok(isoToMin(x.t) < x.gate_min, `${x.claim}: earlier than its gate`); assert.ok(!doc.positions.some(p => p.claim === x.claim && p.t_basis === 'printed' && L.plans.get(x.unit) && (L.plans.get(x.unit).stops || []).some(st => st.po === p.id))); }
  for (const x of disp.before_gate) { const u = L.units.find(y => y.drawn && (y.id === x.unit || y.id.startsWith(x.unit + '-'))); if (!u) continue; const pr = u.provenance.entries.find(en => en.entry === x.stop); assert.ok(pr && pr.applied === false && /gate/.test(pr.why_not)); }
  const rep = L.report({}); assert.equal(rep.defects.length, 0, 'no timed place is reached late'); assert.ok(rep.offsets.length > L7.report({}).offsets.length);
  for (const u of L.units.filter(u => u.drawn && !by7.get(u.id).drawn)) { const o = rep.offsets.find(x => x.unit === u.id); assert.ok(o && o.late_min === 0, `${u.id}: the offset is reported and reached on time`); assert.match(u.notes, /Enters the map where Emmitsburg Road leaves the loaded ground/); }
});

test('the 84th Pennsylvania: documented absent, not drawn, no arrival, no figure, not counted in the field totals; its card says where it was and shows every claim with source, page, tier and quoted words', () => {
  const u = by.get(ABS), u7 = by7.get(ABS), ab = doc.documented_absent;
  assert.equal(ab.length, 1); assert.equal(ab[0].unit, ABS); assert.equal(ab[0].tier, 'documented'); assert.equal(ab[0].register, 'EG-E-84PA'); assert.equal(ab[0].decision, 'DEC-023E'); assert.ok(ab[0].claims.length >= 9);
  for (const id of ['POS-E-US-3C-2D-CARR-84PA-001', 'POS-E-US-3C-2D-CARR-84PA-002']) { assert.ok(ab[0].claims.includes(id)); assert.equal(byClaim.get(id).tier, 'documented'); assert.equal(byClaim.get(id).source.section, 'PA1B-S027'); }
  assert.equal(u7.render.status, 'not_drawn'); assert.equal(u7.strength.share, 249, 'before: an open gap with a procedural share counted in its corps pool');
  assert.equal(u.drawn, false); assert.equal(u.render.status, 'not_on_field'); assert.equal(u.tier, 'documented'); assert.equal(u.register, 'EG-E-84PA'); assert.equal(u.strength.drawn, 0); assert.equal(u.strength.share, 0); assert.match(u.strength.basis, /documented absent from the field/);
  assert.match(u.render.reason, /^With the supply train at Taneytown \(documented, regimental account\), not engaged/); assert.equal(u.notes.startsWith('With the supply train at Taneytown (documented, regimental account), not engaged'), true);
  for (const id of ab[0].claims) assert.ok(u.render.reason.includes(id) && u.render.reason.includes(doc.claims[id].quote), `${id} on the card`);
  assert.match(u.render.reason, /state regimental volume Pennsylvania at Gettysburg \(1914\) vol\. 1, section PA1B-S027/); assert.match(u.render.reason, /OR27 report OR27-1-R168/); assert.match(u.render.reason, /OR27 report OR27-1-R009/);
  assert.ok(u.sources.includes('EG-E-84PA') && L.sources['EG-E-84PA'] && L.sources['EG-E-84PA'].kind === 'register' && u.sources.includes('STATEVOL-POS') && L.sources['STATEVOL-POS']);
  assert.equal(L.arrivals({}).some(a => a.unit === ABS), false, 'no arrival'); assert.equal(L.events({}).some(e => e.unit === ABS), false, 'no event'); assert.equal(L.report({}).casualties.some(c => c.unit === ABS), false, 'no casualty share'); assert.equal(u.casualties.kind, 'none');
  assert.ok(!L.placement.ap.concat(L.placement.po, L.placement.dep).some(e => (e.units || [e.unit]).includes(ABS)), 'no entry places it');
  const h = provenanceSection(u); assert.match(h, /Documented absence from the field/); assert.match(h, /EG-E-84PA/); assert.match(h, /DEC-023E/); for (const id of ab[0].claims) assert.ok(h.includes(id), id); assert.match(h, /quoted words: “/); assert.deepEqual(validateProvenance(u.provenance, u.id), []); assert.deepEqual(validateUnits(L.units), []);
  assert.match(h, /state regimental volume/); assert.match(h, /OR27 report <code>OR27-1-R168/);
  // the field totals: the figures of the drawn units, the pool of the corps (42 leaf units on the field instead of 43), the counts
  const pool = L.pools.find(p => p.owner === 'us-3c'), pool7 = L7.pools.find(p => p.owner === 'us-3c'); assert.equal(pool7.leaves_on_field, 43); assert.equal(pool.leaves_on_field, 42); assert.equal(pool.leaves_not_on_field, pool7.leaves_not_on_field + 1);
  const leaves = L.units.filter(x => !x.children.length && x.strength.kind === 'procedural' && x.strength.share > 0 && L.units.find(y => y.id === 'us-3c') && (x.id.startsWith('us-3c-') )); for (const x of leaves) assert.equal(x.strength.share, pool.share, x.id);
  assert.ok(leaves.length === 42 && !leaves.some(x => x.id === ABS));
  assert.equal(L.counts.documented_absent, 1); assert.equal(L.counts.not_on_field, L7.counts.not_on_field + 1); const c = L.counts; assert.equal(c.moving + c.edge_only + c.not_drawn + c.aggregate + c.not_on_field, 726);
  assert.equal(L.units.filter(x => x.drawn).reduce((a, x) => a + x.strength.drawn, 0), 127572);
  // the source files are not edited: the roster still lists it as on the field and the arrival checker's inputs are untouched
  assert.equal(raw.units.units.find(x => x.id === ABS).status, 'on_field'); assert.equal(u.status, 'documented_absent'); assert.match(u.notes, /Ledger status: documented absent\./);
  const ledgerRows = raw.arrivals.rows; assert.ok(ledgerRows.length > 40);
  // the day-position label of the brigade is shown as recorded and not drawn, with the reason
  const dp = u.day_positions; if (dp) for (const d of dp.days) for (const it of d.items || []) if (it.drawn_as === 'not_drawn') assert.match(it.why_not, /documented absent/);
});

test('the overlay is refused unless it holds: a leaf of the roster, usable claims that are the unit\'s own with a documented one, no entry that also places the unit, a summary, the register entry and the decision', () => {
  refused(d => { d.documented_absent[0].unit = 'us-3c-2d-carr'; }, /not a leaf unit/);
  refused(d => { d.documented_absent[0].unit = 'us-nope'; }, /not a leaf unit/);
  refused(d => { d.documented_absent[0].claims.push('POS-E-US-11C-2D-004'); }, /is the claim of us-11c-2d/);
  refused(d => { d.documented_absent[0].claims.push('POS-X-nope'); }, /not in placement-claims/);
  refused(d => { d.documented_absent[0].claims = d.documented_absent[0].claims.slice(0, 1); }, /at least two claims/);
  refused(d => { d.documented_absent[0].claims = ['POS-E-US-3C-2D-CARR-84PA-003', 'POS-E-US-3C-2D-CARR-84PA-003']; }, /a documented claim is required/);
  refused(d => { d.documented_absent[0].tier = 'inferred'; }, /tier documented/);
  refused(d => { d.documented_absent[0].summary = 'short'; }, /summary/);
  refused(d => { d.documented_absent[0].register = ''; }, /register/);
  refused(d => { d.claims['POS-E-US-3C-2D-CARR-84PA-001'].verified = false; }, /may not be used/);
  refused(d => { d.approach.push({ ...d.approach.find(a => a.id === 'AP-42'), id: 'AP-99', unit: ABS }); }, /is not the unit of claim|also places the unit/);
  // the builder refuses the same things
  const cur = J('app/data/claim-curation.json'); const c1 = clone(cur); c1.documented_absent[0].claims.push('POS-E-US-11C-2D-004'); assert.ok(buildClaims({ curation: c1 }).errors.some(e => /is the claim of us-11c-2d/.test(e)));
  const c2 = clone(cur); c2.documented_absent[0].unit = 'us-3c-2d-carr'; assert.ok(buildClaims({ curation: c2 }).errors.some(e => /not a leaf unit/.test(e)));
  const c3 = clone(cur); c3.documented_absent[0].claims = c3.documented_absent[0].claims.filter(id => byClaim.get(id).tier !== 'documented'); assert.ok(buildClaims({ curation: c3 }).errors.length > 0);
});

test('detached units: every usable claim of the five ledgers is scanned; the only unit documented absent for the whole battle that the roster draws as present is the 84th (excluded); the others are already outside the roster\'s drawn set or are partial details, and are listed, not excluded', () => {
  const R = ledgerEReport(raw, TM); assert.ok(R.candidates.length >= 20, `${R.candidates.length} candidates`);
  const abs = R.candidates.find(c => c.unit === ABS); assert.ok(abs && /excluded by this overlay/.test(abs.verdict) && abs.whole);
  assert.ok(!R.candidates.some(c => /^DRAWN and whole-battle/.test(c.verdict)), 'no drawn unit has whole-battle absence wording: ' + R.candidates.filter(c => /^DRAWN/.test(c.verdict)).map(c => c.unit));
  for (const id of ['cs-13va-winchester', 'us-art-reserve-taft-1ctheavy-b']) { const c = R.candidates.find(x => x.unit === id); assert.ok(c, id); assert.equal(c.drawn, false); assert.match(c.verdict, /already not drawn/); }
  for (const id of ['us-6c-3d-wheaton-102pa', 'us-1c-3d-stannard-12vt', 'us-1c-3d-stannard-15vt']) assert.equal(by.has(id), false, `${id} is not in the roster`);
  for (const c of R.candidates) { assert.ok(by.has(c.unit)); for (const k of c.claims) assert.ok(byClaim.get(k.id) && !unusable(byClaim.get(k.id))); }
  assert.ok(DETACHED.test('Battery B, ordered to Westminster to remain with the supply train; never on the field'));
  // the ones the notes call partial are not excluded: they are drawn or open as before
  for (const id of ['cs-1c-hood-law-47al', 'us-12c-1d-lockwood-150ny']) assert.equal(by.get(id).drawn, by7.get(id).drawn);
});

test('purity: arrivals, events and the report are the same whatever the order of evaluation (shuffled scenarios, fresh layers, repeated calls), with the overlay and ledger E in the layer', () => {
  const hash = o => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex'), key = sc => JSON.stringify(sc), ref = new Map(SCENARIOS.map(sc => [key(sc), hash(L.both(sc))]));
  for (let round = 0; round < 3; round++) {
    const layer = build(raw), order = SCENARIOS.map((s, i) => [rand(23, round, i), s]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    for (const sc of order) { assert.equal(hash(layer.both(sc)), ref.get(key(sc)), `scenario ${key(sc)} differs (round ${round})`); layer.report(sc); layer.arrivals(sc); layer.events(sc); }
  }
  assert.equal(hash(L.report({})), hash(L.report({ choices: {} }))); assert.equal(hash(L.both({})), hash(L.both({})));
  // the layer built from a deep copy of the data is the same layer
  assert.equal(hash(build(clone(raw)).both({})), ref.get(key({}))); assert.equal(hash(build(clone(raw)).units.map(u => [u.id, u.drawn, u.strength.drawn, u.render.status])), hash(L.units.map(u => [u.id, u.drawn, u.strength.drawn, u.render.status])));
});

test('counts: the notes say what the layer is, and every number of the v8 section is computed', () => {
  const R = ledgerEReport(raw, TM), notes = fs.readFileSync(path.join(BT, 'app/HISTORY-LAYER-NOTES.md'), 'utf8');
  assert.equal(R.before.drawn, 430); assert.equal(R.after.drawn, 439); assert.equal(R.after.drawn, L.counts.drawn); assert.equal(R.after.open_gap, 108); assert.equal(R.before.open_gap, 118); assert.equal(R.after.figures, 127572); assert.equal(R.before.figures, 124728);
  assert.equal(R.claims.total, 200); assert.deepEqual([R.claims.by_tier.documented, R.claims.by_tier.inferred], [61, 139]); assert.equal(R.claims.admitted, 7); assert.deepEqual([R.claims.admitted_by_tier.documented, R.claims.admitted_by_tier.inferred], [3, 4]);
  assert.equal(R.newly.length, 9); assert.equal(R.gates_moved, 0); assert.equal(R.after.defects, 0); assert.equal(R.strength_shares_changed.length, 42); assert.ok(R.strength_shares_changed.every(c => c.from === 249 && c.to === 255));
  assert.ok(notes.includes('## History layer v8: ledger E, the state regimental volumes (contract 1.8, DEC-023E)')); assert.ok(notes.includes('| units drawn | 430 | 439 | +9 |')); assert.ok(notes.includes('**Previously undrawn units now drawn: 9**')); assert.ok(notes.includes('| **claims admitted** (drive an entry, support one, are recorded, or establish a documented absence) | 7: 3 documented, 4 inferred |'));
  for (const spec of ['real', 'arrival', 'scrub', 'leak', 'casualties', 'ui', 'perf']) assert.ok(notes.includes(spec), `the notes list the ${spec} Playwright spec`);
  assert.ok(notes.includes('The 84th Pennsylvania: documented absence')); assert.ok(notes.includes('With the supply train at Taneytown (documented, regimental account), not engaged'));
  assert.equal(Object.values(doc.ledgers).filter(l => l.included).length, 5); assert.equal(disp.rows.length, 3703);
  const gov = path.join(BT, 'GOVERNANCE'); assert.ok(fs.existsSync(path.join(gov, 'register/EG-E-84PA.md'))); const dl = fs.readFileSync(path.join(gov, 'decision_log.md'), 'utf8'); assert.ok(dl.includes('## DEC-023E')); const eg = fs.readFileSync(path.join(gov, 'register/EG-E-84PA.md'), 'utf8'); assert.match(eg, /\| Confidence tier \| documented/); assert.match(eg, /OR27-1-R168/);
});

test('the placement files stay a pure function of the ledgers and the curation table: ledger E in the five names, B read after its re-read, the shipped files carry no word about how they were made', () => {
  assert.deepEqual(Object.keys(LEDGER_NAMES), ['A', 'B', 'C', 'D', 'E']);
  for (const f of ['app/data/placement-claims.json', 'app/data/claim-dispositions.json']) assert.doesNotMatch(fs.readFileSync(path.join(BT, f), 'utf8'), /Claude|Anthropic|\bAI-generated|subagent/i, f);
  const html = [by.get('us-11c-2d-coster-134ny'), by.get(ABS)].map(u => provenanceSection(u) + u.notes).join(' '); assert.doesNotMatch(html, /Claude|Anthropic|\bAI\b|generated|subagent/i);
});
