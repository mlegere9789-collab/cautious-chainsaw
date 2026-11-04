// Node tests (no browser) for the entries read from the OR27 position ledgers (data/placement-claims.json, data/claim-dispositions.json, data/claim-curation.json):
// the rule for using a claim, the phrase, time, place and road of every entry against its claim, the loader's refusals, the conflicts, Q04, purity, the card and the contract.
//   node --test docs/battle-theatre/app/tests/claims.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { BT } from './node-world.mjs';
import { loadLedgers, bStatus, unusable, digest, clockAgrees, printedClocks, printedPeriod, FIDELITY_OK, POS_DIR, withoutV8 } from '../tools/claim-ledger.mjs';
import { buildClaims, CONFLICT_MIN } from '../tools/build-claim-placement.mjs';
import { approachAudit, auditMarkdown, OUT_MD, CODES } from '../tools/approach-audit.mjs';
import { loadRawFromDisk, terrainMeta } from '../tools/history-report.mjs';
import { createRealHistory, SPEED } from '../src/history/real.mjs';
import { Placement, PERIODS } from '../src/history/placement.mjs';
import { norm, boxCrossings, insideBox, distM } from '../src/history/gazetteer.mjs';
import { validateUnits, validateProvenance } from '../src/history/contract.mjs';
import { provenanceSection } from '../src/ui/card-sections.mjs';
import { isoToMin } from '../src/clock.mjs';

const ROOT = path.resolve(BT, '../..'), rawFull = loadRawFromDisk(), docAll = rawFull.placementClaims, dispAll = rawFull.claimDispositions,
  raw = { ...rawFull, siblingApproach: null, placementClaims: withoutV8(docAll) }, TM = terrainMeta(),   // this file tests the claims pipeline in its state before the sibling records of v6 (tests/sibling.test.mjs tests those) and before ledger E (v8: tests/ledgerE.test.mjs tests that)
  doc = raw.placementClaims, disp = { ...dispAll, rows: dispAll.rows.filter(r => r[1] !== 'E' && r[4] !== 'used_absence') };
const helpers = { civilDawn: m => m + 4 * 60 + 3 };
const L = createRealHistory({ raw, T: TM, helpers }), L0 = createRealHistory({ raw: { ...raw, placementClaims: null }, T: TM, helpers });
const led = loadLedgers(), byClaim = new Map(led.claims.map(c => [c.claim_id, c])), ents = [...doc.approach, ...doc.positions, ...doc.departures];
const field = (c, f) => (f === 'quote' ? c.source.quote : f === 'place.printed' ? c.place.printed : f === 'direction_or_road' ? c.place.direction_or_road : '') || '';
const J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8'));

test('the file exists and is built from the ledgers as they are now: sha256 of each ledger read, claim counts, and B only after RECHECK B COMPLETE', () => {
  assert.ok(doc && disp, 'data/placement-claims.json and data/claim-dispositions.json exist');
  const b = bStatus(); assert.equal(doc.ledgers.B.included, b.complete);
  for (const l of ['A', 'C', 'D']) { assert.equal(doc.ledgers[l].included, true); assert.equal(doc.ledgers[l].sha256, led.meta[l].sha256, `ledger ${l} changed: run tools/build-claim-placement.mjs`); assert.equal(doc.ledgers[l].claims, led.meta[l].claims); }
  if (b.complete) { assert.equal(doc.ledgers.B.sha256, led.meta.B.sha256, 'ledger B changed: run tools/build-claim-placement.mjs'); assert.ok(led.claims.some(c => c.ledger === 'B')); }
  else { assert.ok(!led.claims.some(c => c.ledger === 'B'), 'B is not read'); assert.ok(!Object.keys(doc.claims).some(k => k.startsWith('POS-B-')), 'no B claim is used while B is being re-read'); assert.match(doc.ledgers.B.reason, /RECHECK B COMPLETE/); }
  assert.equal(dispAll.rows.length, led.claims.length, 'one row for every claim read'); assert.equal(docAll.ledgers.E.included, true); assert.equal(docAll.ledgers.E.sha256, led.meta.E.sha256, 'ledger E changed: run tools/build-claim-placement.mjs'); assert.equal(docAll.ledgers.E.claims, led.meta.E.claims);
});

test('ledger B is read only when the LAST line of RECHECK_B_NOTES.md is RECHECK B COMPLETE (tested on copies of the ledgers)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-ledger-')); try {
    for (const f of ['positions_A.jsonl', 'positions_B.jsonl', 'positions_C.jsonl', 'positions_D.jsonl', 'positions_E.jsonl']) fs.copyFileSync(path.join(POS_DIR, f), path.join(dir, f));
    assert.equal(bStatus(dir).complete, false, 'no notes file: not complete'); assert.ok(!loadLedgers(dir).claims.some(c => c.ledger === 'B')); assert.equal(loadLedgers(dir).meta.B.included, false);
    fs.writeFileSync(path.join(dir, 'RECHECK_B_NOTES.md'), 'notes\n\nRECHECK B COMPLETE\n\nmore notes after it\n'); assert.equal(bStatus(dir).complete, false, 'the line must be the LAST line'); assert.ok(!loadLedgers(dir).claims.some(c => c.ledger === 'B'));
    fs.writeFileSync(path.join(dir, 'RECHECK_B_NOTES.md'), 'notes\n\nRECHECK B COMPLETE\n'); assert.equal(bStatus(dir).complete, true); assert.ok(loadLedgers(dir).claims.some(c => c.ledger === 'B'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('only claims with claim_support_verified true and fidelity_check passed_full_read or corrected are used: every claim an entry, a conflict, a card or a disposition uses satisfies the rule and equals its ledger line', () => {
  assert.deepEqual(FIDELITY_OK, ['passed_full_read', 'corrected']);
  const used = new Set([...ents.flatMap(e => e.claims), ...Object.keys(doc.claims)]);
  for (const u of L.units) if (u.provenance) for (const id of Object.keys(u.provenance.claims)) used.add(id);
  assert.ok(used.size >= 30, `${used.size} claims used`);
  for (const id of used) { const c = byClaim.get(id); assert.ok(c, `${id} is in the ledgers read`); assert.equal(unusable(c), null, `${id}: ${unusable(c)}`); assert.equal(c.claim_support_verified, true); assert.ok(FIDELITY_OK.includes(c.fidelity_check)); assert.ok(['documented', 'inferred'].includes(c.tier)); assert.deepEqual(doc.claims[id], digest(c), `${id}: the digest is the ledger line`); }
  for (const r of disp.rows) { const c = byClaim.get(r[0]); assert.ok(c, r[0]); if (/^(used|transcribed)/.test(r[4])) assert.equal(unusable(c), null, `${r[0]} is ${r[4]} but may not be used`); if (unusable(c)) assert.equal(r[5], 'not_usable', `${r[0]}`); }
  // no claim marked an open gap, downgraded, not rechecked or unverified is anywhere in the entries
  for (const c of led.claims) if (unusable(c)) { assert.ok(!used.has(c.claim_id), `${c.claim_id} must not be used`); }
});

test('an inferred claim never drives a documented placement: every entry is inferred (the place or road is a gazetteer entry) and says the tier of its claim; a quote is under 15 words', () => {
  for (const e of ents) { assert.notEqual(e.tier, 'documented', e.id); assert.ok(['inferred', 'plausible-procedural'].includes(e.tier), e.id); assert.ok(['documented', 'inferred'].includes(e.claim_tier), e.id); assert.equal(doc.claims[e.claim].tier, e.claim === e.claims[0] ? e.claim_tier || doc.claims[e.claim].tier : doc.claims[e.claim].tier); }
  for (const c of Object.values(doc.claims)) assert.ok(c.quote_words <= 14 && c.quote.trim().split(/\s+/).length < 15, `${c.id}: quote of ${c.quote_words} words`);
  for (const u of L.units) if (u.approach && u.approach.claim) { assert.ok(['inferred', 'plausible-procedural'].includes(u.approach.tier)); assert.match(u.approach.text, /position-ledger claim/); assert.match(u.notes, /fidelity check/); }
});

test('every phrase is literally in its claim: the verified quote, the printed place or road words, or the OR record as confirmed by tools/verify_claim_phrases.py (re-run when the OR text is present)', () => {
  const ver = J('app/data/claim-phrase-verification.json'), seen = new Map(ver.results.map(r => [r.claim + '|' + r.phrase, r]));
  for (const e of ents) {
    const c = byClaim.get(e.claim); assert.ok(e.phrase && e.phrase.trim().split(/\s+/).length <= 15, e.id);
    if (e.phrase_in === 'record') { const v = seen.get(e.claim + '|' + e.phrase); assert.ok(v && v.found, `${e.id}: “${e.phrase}” confirmed in the record`); assert.equal(v.record, c.source.report_id); assert.equal(e.record, c.source.report_id); }
    else { assert.ok(['quote', 'place.printed', 'direction_or_road'].includes(e.phrase_in), e.id); if (e.phrase_in === 'direction_or_road') assert.ok(!/\[/.test(field(c, e.phrase_in)), `${e.id}: a bracketed compiler gloss is not printed`); assert.ok(norm(field(c, e.phrase_in)).includes(norm(e.phrase)), `${e.id}: “${e.phrase}” in ${e.phrase_in}: “${field(c, e.phrase_in)}”`); }
  }
  for (const r of ver.results) assert.ok(r.found, `${r.claim}: ${r.phrase}`);
  const orText = path.join(ROOT, 'tmp/library/or27');
  if (fs.existsSync(orText) && ver.results.length) {
    const out = path.join(os.tmpdir(), 'bt-phrase-check-' + process.pid + '.json'), r = spawnSync('python', ['-I', path.join(BT, 'app/tools/verify_claim_phrases.py'), '--out', out], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' }, timeout: 100000 });
    if (r.status === null || r.error) console.log('# python not available: the record phrases were not re-confirmed'); else { assert.equal(r.status, 0, r.stdout + r.stderr); assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')), ver, 'the confirmed phrases are those of the OR text now'); } try { fs.unlinkSync(out); } catch { /* */ }
  } else console.log('# the OR text (tmp/library/or27) is absent: the record phrases were not re-confirmed');
});

test('every time is printed: a stop or departure at a clock equals the claim\'s t_iso and its printed words give that clock; a named period is printed in the claim\'s own words and takes the labelled convention', () => {
  for (const e of [...doc.positions, ...doc.departures]) {
    const c = byClaim.get(e.claim), w = c.when;
    if (e.t_basis === 'printed') { assert.equal(e.t, w.t_iso, e.id); assert.ok(clockAgrees(w.printed, e.t).ok, `${e.id}: “${w.printed}” does not give ${e.t}`); }
    else { assert.equal(e.t_basis, 'convention'); const per = printedPeriod(w.printed); assert.ok(per, `${e.id}: no period printed in “${w.printed}”`); assert.equal(per, e.period); assert.equal(e.t, `${w.date}T${PERIODS[per]}`); assert.ok(!w.t_iso, `${e.id}: a printed clock outranks a convention`); }
    assert.equal(e.t.slice(0, 10), w.date);
  }
  // the clock reader itself
  assert.equal(clockAgrees('8 a. m.', '1863-07-01T08:00').ok, true); assert.equal(clockAgrees('4.30 p. m.', '1863-07-02T16:30').ok, true); assert.equal(clockAgrees('12 m.', '1863-07-01T12:00').ok, true); assert.equal(clockAgrees('between 1 and 2 p. m.', '1863-07-01T13:00').ok, true);
  assert.equal(clockAgrees('8 a. m.', '1863-07-01T20:00').ok, false); assert.equal(clockAgrees('about 10 o\'clock', '1863-07-01T22:00').ok, true, 'o\'clock is read by the ledger from context'); assert.equal(clockAgrees('July 1', '1863-07-01T06:00').ok, false);
  assert.equal(printedPeriod('(night of July 1)'), null, 'a compiler\'s parenthesis is not printed'); assert.equal(printedPeriod('At dusk'), 'dusk'); assert.equal(printedPeriod('the next day'), null); assert.ok(printedClocks('between 5 and 6 p. m.').some(x => x.h12 === 5 && x.min === 0 && x.mer === 'p'));
});

test('places and roads are gazetteer entries: a stop is at the place the ledger references, named in the claim\'s words, inside the loaded ground; a road is a line that crosses the ground; the file holds no coordinate of its own', () => {
  const walk = (o, f) => { if (Array.isArray(o)) o.forEach(x => walk(x, f)); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { f(k); walk(v, f); } }; let coords = 0; walk({ a: doc.approach, p: doc.positions, d: doc.departures }, k => { if (k === 'lng' || k === 'lat') coords++; }); assert.equal(coords, 0, 'entries carry no coordinate');
  const gaz = L.gazetteer, byId = new Map(raw.gazetteer.places.map(p => [p.id, p]));
  for (const e of doc.positions) { const c = byClaim.get(e.claim), pl = gaz.resolve(e.place); assert.ok(pl, e.id); assert.equal(e.sigma_m, pl.sigma_m); assert.equal(c.place.gazetteer_ref, pl.id, `${e.id}: the ledger references ${c.place.gazetteer_ref}`); assert.ok(!pl.stream && (pl.line || pl.sigma_m <= 1500), e.id); assert.ok(insideBox(pl.center, TM.meta), `${e.id}: ${e.place} lies inside the loaded ground`); const names = [pl.name, ...(pl.aliases || [])].map(norm); assert.ok(names.some(n => (' ' + norm(c.source.quote) + ' ').includes(' ' + n + ' ') || (' ' + norm(c.place.printed) + ' ').includes(' ' + n + ' ')), `${e.id}: the name is printed`); assert.ok(byId.get(pl.id)); }
  for (const e of [...doc.approach, ...doc.departures]) { const r = gaz.resolve(e.road); assert.ok(r && r.line, `${e.id}: ${e.road} is a gazetteer line`); }
  for (const e of doc.approach) assert.ok(boxCrossings(gaz.resolve(e.road).line, TM.meta).some(x => x.inward) || boxCrossings(gaz.resolve(e.road).line.slice().reverse(), TM.meta).some(x => x.inward), `${e.id}: ${e.road} enters the loaded ground`);
  // the kind of claim: an approach is an arrival or a march (or a position statement admitted by DEC-013 a); a stop is not a strength note; a departure is a departure
  for (const e of doc.approach) assert.ok(['arrival_road', 'march'].includes(byClaim.get(e.claim).kind) || (['position', 'night_position'].includes(byClaim.get(e.claim).kind) && e.admitted_by === 'DEC-013a' && e.claim_kind === byClaim.get(e.claim).kind), e.id); for (const e of doc.departures) assert.equal(byClaim.get(e.claim).kind, 'departure'); for (const e of doc.positions) assert.notEqual(byClaim.get(e.claim).kind, 'strength_note');
  assert.deepEqual(doc.activities, [], 'no activity is read from a claim');
});

test('the loader refuses a doctored entry: an unknown claim, another unit, a phrase not in the claim, a time the claim does not print, a changed fidelity check, a place the ledger does not reference, a sigma, a road that is not a line', () => {
  const mk = d => new Placement({ doc: raw.placement, claimsDoc: d, gaz: L.gazetteer, units: raw.units.units, rows: raw.arrivals.rows, box: TM.meta, gateOf: () => -Infinity });
  assert.deepEqual(mk(structuredClone(doc)).validate(), [], 'the file as it is holds');
  const bad = (f, re) => { const d = structuredClone(doc); f(d); const p = mk(d).validate(); assert.ok(p.some(x => re.test(x)), `${re}: ${p.slice(0, 3).join(' | ')}`); };
  bad(d => { d.approach[0].claim = 'POS-X-nope'; d.approach[0].claims = ['POS-X-nope']; }, /not in placement-claims/);
  bad(d => { d.approach[0].unit = 'us-1c-1d'; }, /not the unit of claim/);
  bad(d => { d.approach[0].phrase = 'the Zeppelin road'; d.approach[0].phrase_in = 'quote'; }, /is not in the quote/);
  bad(d => { const e = d.approach.find(x => x.phrase_in === 'record'); e.record = 'OR27-9-R999'; }, /names the record of its claim/);
  bad(d => { d.positions[0].t = '1863-07-01T03:07'; }, /t_iso|do not give/);
  bad(d => { d.positions.find(p => p.t_basis === 'printed').t = d.positions.find(p => p.t_basis === 'printed').t.replace('T', 'T0').replace('T00', 'T0'); }, /bad time|t_iso/);
  bad(d => { const id = d.positions[0].claim; d.claims[id].fidelity = 'downgraded'; }, /may not be used/);
  bad(d => { const id = d.positions[0].claim; d.claims[id].verified = false; }, /may not be used/);
  bad(d => { const e = d.positions[0]; e.place = 'Culp’s Hill'; e.sigma_m = 490; }, /ledger references/);
  bad(d => { d.positions[0].sigma_m = 9; }, /sigma_m/);
  bad(d => { d.approach[0].road = 'Plum Run'; }, /not a gazetteer line/);
  bad(d => { d.positions[0].tier = 'documented'; }, /tier/);
  bad(d => { d.positions[1].id = d.positions[0].id; }, /duplicate entry id/);
  bad(d => { const e = d.positions.find(p => p.t_basis === 'printed'); e.t_basis = 'convention'; e.period = 'night'; e.t = e.t.slice(0, 11) + '20:04'; }, /period .* is not printed/);
});

test('the data is reproducible: rebuilding from the ledgers and the curation table gives the files on disk, and every candidate is included or excluded with a reason', () => {
  const res = buildClaims({}); assert.deepEqual(res.errors, [], res.errors.join('\n')); assert.ok(!res.missing, 'no candidate is left unreviewed');
  assert.deepEqual(JSON.parse(JSON.stringify(res.doc)), docAll); assert.deepEqual(JSON.parse(JSON.stringify(res.dispositions)), dispAll);
  const cur = J('app/data/claim-curation.json'); for (const k of ['approach_exclude', 'stops_exclude', 'departures_exclude']) for (const [id, why] of Object.entries(cur[k])) { assert.ok(byClaim.has(id), id); assert.ok(why.length >= 8, `${k} ${id}: a reason`); }
  for (const k of ['approach', 'stops', 'departures']) for (const e of cur[k]) assert.ok(e.why && e.phrase && e.phrase_in, `${k} ${e.claim}`);
});

test('every claim read has exactly one disposition and a reason; the counts add up; the used, inert and unresolved claims partition the ledgers', () => {
  const ids = new Set(); for (const r of disp.rows) { assert.ok(!ids.has(r[0]), r[0]); ids.add(r[0]); }
  const D = ['unresolved', 'used_approach', 'used_approach_support', 'used_stop', 'used_stop_support', 'used_departure', 'transcribed_inert', 'transcribed_not_applied'];
  let used = 0; for (const r of disp.rows) {
    assert.ok(D.includes(r[4]), `${r[0]}: ${r[4]}`);
    if (r[4] === 'unresolved') { assert.ok(r[5], `${r[0]}: a reason code`); assert.ok(r[6] && r[6].length >= 8, `${r[0]}: a reason`); } else { used++; assert.ok(r[7], `${r[0]}: names its entry`); assert.ok(ents.some(e => e.id === r[7]) || r[4].endsWith('support'), `${r[0]} → ${r[7]}`); }
  }
  assert.equal(used + disp.rows.filter(r => r[4] === 'unresolved').length, disp.rows.length);
  for (const e of ents) assert.ok(disp.rows.some(r => r[0] === e.claim && /^(used|transcribed)/.test(r[4])), `${e.id}: its claim is marked used`);
  for (const l of ['A', 'C', 'D']) assert.equal(disp.rows.filter(r => r[1] === l).length, led.meta[l].claims);
  assert.ok(disp.rows.filter(r => r[4] === 'unresolved').length > 2000, 'most claims cannot place a unit; they are listed, not guessed');
});

test('conflicts between reports are listed with both values and neither side is placed: the claims of a conflict drive nothing, and the PDF entry they differ from is unchanged', () => {
  assert.ok(doc.conflicts.length >= 1);
  const driving = new Set(ents.map(e => e.claim));
  for (const x of doc.conflicts) {
    assert.ok(x.claims.length >= 2 && x.values.length >= 2, x.kind); assert.ok(L.units.some(u => u.id === x.unit), x.unit);
    if (['stop_hour_differs', 'approach_roads_differ', 'claim_differs_from_ledger_row'].includes(x.kind)) for (const id of x.claims) if (byClaim.has(id)) assert.ok(!driving.has(id), `${x.kind}: ${id} is placed although it is in a conflict`);
    if (x.kind === 'claim_differs_from_ledger_row') { const pdf = x.claims.find(i => !byClaim.has(i)); assert.ok(raw.placement.positions.some(p => p.id === pdf), pdf); }
    if (x.kind === 'approach_refines_formation_above') assert.ok(x.claims.every(i => byClaim.has(i) || raw.placement.approach.some(a => a.id === i)));
  }
  // the conflict reaches the card of the unit and of every unit under it
  const sample = doc.conflicts.find(x => L.units.some(u => u.drawn && (u.id === x.unit || u.id.startsWith(x.unit + '-'))) && x.kind !== 'claim_differs_from_ledger_row');
  if (sample) { const u = L.units.find(y => y.drawn && (y.id === sample.unit || y.id.startsWith(sample.unit + '-'))); assert.ok(u.provenance.conflicts.some(c => c.kind === sample.kind), `${u.id} shows ${sample.kind}`); assert.match(provenanceSection(u), /Reports disagree/); }
  // the ledger's own conflict lists: a claim used shows the claims it conflicts with (usable ones), both values, on the card
  const withPeers = L.units.find(u => u.provenance && u.provenance.peers.length); assert.ok(withPeers); const html = provenanceSection(withPeers); assert.match(html, /conflicting/); assert.match(html, /none is chosen/); const pr = withPeers.provenance.peers[0]; assert.ok(html.includes(pr.peer.id) && html.includes(pr.of));
  assert.ok(CONFLICT_MIN === 90);
});

test('Q04: no gate is moved by a claim, and a claim earlier than its unit\'s gate is reported and not applied', () => {
  const a1 = new Map(L.arrivals({}).map(a => [a.unit, a])), a0 = new Map(L0.arrivals({}).map(a => [a.unit, a]));
  for (const [id, a] of a0) { const b = a1.get(id); assert.ok(b, id); assert.equal(b.earliest, a.earliest, `${id}: earliest moved`); assert.equal(b.default, a.default, `${id}: default moved`); assert.equal(b.latest, a.latest); }
  for (const sc of [{}, { choices: { 'C-004': 'v0' }, optionText: { 'C-004': '22:30 Jul 1' } }, { choices: { 'C-003': 'v1', 'C-005': 'v2' }, optionText: { 'C-003': '08:00 (head of column)', 'C-005': '07:30 (EPP, FREE, PADRE)' } }]) {
    const { events, arrivals } = L.both(sc), A = new Map(arrivals.map(a => [a.unit, a])), P0 = new Map(); for (const e of events) { assert.ok(e.t >= A.get(e.unit).earliest - 1e-9, `${e.unit}: ${e.type} before its earliest`); if (e.type === 'enter') P0.set(e.unit, e); }
    for (const e of events) if (e.type === 'path') for (let i = 1; i < e.wp.length; i++) assert.ok(distM(e.wp[i - 1], e.wp[i]) / ((e.wp[i].t - e.wp[i - 1].t) * 60) <= SPEED.double_quick * 1.0001 + 1e-9, `${e.unit}: faster than double-quick`);
    for (const e of events) if (e.type === 'leave') assert.ok(P0.has(e.unit) && e.t >= P0.get(e.unit).t);
  }
  assert.ok(disp.earlier_than_gate.length > 0 && disp.earlier_than_gate.every(x => x.claim && Number.isFinite(x.gate_min) && isoToMin(x.t) < x.gate_min));
  for (const x of disp.before_gate) { const u = L.units.find(y => y.drawn && (y.id === x.unit || y.id.startsWith(x.unit + '-'))); if (!u) continue; const pr = u.provenance.entries.find(e => e.entry === x.stop); assert.ok(pr && pr.applied === false && /gate/.test(pr.why_not), `${x.stop} is not applied to ${u.id}`); }
});

test('what the claims add: approach records for brigades, divisions and corps, units inherit as before, the units drawn only grow, and no unit is drawn without a road of its line of command', () => {
  assert.ok(doc.approach.length >= 20, `${doc.approach.length} approach records`); assert.ok(L.counts.drawn > L0.counts.drawn);
  const U = new Map(raw.units.units.map(u => [u.id, u])), chain = id => { const o = []; for (let u = U.get(id); u; u = U.get(u.parent)) o.push(u.id); return o; };
  for (const u of L.units) { const was = L0.units.find(x => x.id === u.id); if (was.drawn) assert.ok(u.drawn, `${u.id} was drawn and is no longer`); if (u.drawn) { const own = chain(u.id).map(x => L.placement.ap.find(a => a.unit === x)).find(Boolean); assert.ok(own, `${u.id} is drawn without a road in its chain`); assert.equal(u.approach.id, own.id); } }
  // units that already had a PDF-ledger road keep it (a claim cannot overrule the owner's default): AP-01..AP-07 are unchanged
  for (const a of raw.placement.approach) assert.ok(L.placement.ap.find(x => x.id === a.id) === a || JSON.stringify(L.placement.ap.find(x => x.id === a.id)) === JSON.stringify(a));
  for (const a of doc.approach) { assert.ok(+a.id.slice(3) > Math.max(...raw.placement.approach.map(x => +x.id.slice(3))), a.id); assert.ok(!raw.placement.approach.some(p => p.unit === a.unit && p.road !== a.road), `${a.id} differs from the PDF road of its own unit`); }
  const d1 = L.units.find(u => u.id === 'us-5c-2d-day-3us'); assert.ok(d1 && d1.drawn && d1.provenance.entries.some(e => e.kind === 'departure' && e.applied)); assert.ok(L.events({}).some(e => e.type === 'leave' && e.unit === 'us-5c-2d-day-3us'));
  const wp = L.events({}).filter(e => e.unit === 'us-5c-2d-day-3us' && e.type === 'path').at(-1); assert.ok(!insideBox(wp.wp.at(-1), TM.meta), 'the departing unit ends outside the loaded ground'); assert.ok(wp.wp[0].t >= isoToMin('1863-07-05T17:00') - 1e-9, 'not before the printed 17:00');
});

test('purity: the layer with the claims gives the same arrivals, events and provenance whatever the order of evaluation', () => {
  const SC = [{}, { choices: { 'C-004': 'v0' }, optionText: { 'C-004': '22:30 Jul 1' } }, { choices: { 'C-043': 'v3' }, optionText: { 'C-043': '17:00' } }];
  const ref = SC.map(s => JSON.stringify(L.both(s))), P0 = JSON.stringify(L.units.map(u => u.provenance));
  const A = createRealHistory({ raw, T: TM, helpers }); for (const i of [2, 0, 1, 0, 2]) assert.equal(JSON.stringify(A.both(SC[i])), ref[i], `scenario ${i}`);
  assert.equal(JSON.stringify(A.units.map(u => u.provenance)), P0);
});

test('contract 1.4: every unit validates with its provenance; the validator refuses a downgraded claim, a long quote, an entry without a claim, a conflict with one value, an unapplied entry with no reason', () => {
  assert.deepEqual(validateUnits(L.units), []); assert.equal(L.meta.contract, '1.5', 'contract 1.5 adds the troop-map day positions; the 1.4 shapes are unchanged');
  const u = L.units.find(x => x.drawn && x.provenance && x.provenance.entries.length), p = structuredClone(u.provenance), id = Object.keys(p.claims)[0];
  assert.deepEqual(validateProvenance(p), []);
  const t = (f, re) => { const q = structuredClone(p); f(q); assert.match(validateProvenance(q).join(' | '), re); };
  t(q => { q.claims[id].fidelity = 'downgraded'; }, /fidelity downgraded/); t(q => { q.claims[id].quote = 'a b c d e f g h i j k l m n o p'; }, /over 15 words/); t(q => { q.entries[0].claims = []; }, /name its claim/);
  t(q => { q.entries[0].applied = false; q.entries[0].why_not = null; }, /says whether it is applied/); t(q => { q.entries[0].tier = 'documented'; }, /tier/); t(q => { q.conflicts = [{ kind: 'x', claims: ['a'], values: ['v'] }]; }, /both values/); t(q => { delete q.claims[id]; }, /not carried/);
});

test('the card lists, for a unit placed by a claim: the claim id, the OR27 report, the printed page, the verified quote, the tier, the fidelity check, what was applied and what was not; a unit without a claim shows nothing', () => {
  const u = L.units.find(x => x.id === 'us-11c-1d-ames-107oh'), h = provenanceSection(u);
  for (const re of [/POS-A-11B-024/, /POS-A-11A-045/, /OR27 report <code>OR27-1-R249/, /printed page 720/, /quoted words: “The regiment arrived at Gettysburg, Pa\., at about 1 p\. m\. July 1”/, /claim tier documented/, /fidelity check passed full read/, /Placement tier inferred/, /Approach road/]) assert.match(h, re);
  const ap = L.units.find(x => x.drawn && x.approach && x.approach.claim), t0 = ap.approach.text; assert.match(t0, /OR27 report OR27-/); assert.match(t0, /page \d+/); assert.match(t0, /position-ledger claim /);
  const n = L.units.find(x => !x.provenance); assert.equal(n ? provenanceSection(n) : '', ''); assert.doesNotMatch(h, /Claude|Anthropic|\bAI\b|generated|subagent/i);
  const notApplied = L.units.find(x => x.provenance && x.provenance.entries.some(e => !e.applied)); if (notApplied) assert.match(provenanceSection(notApplied), /Not applied/);
});

// ---- history layer v4: roads of approach that need no clock (APPROACH-AUDIT.md, DEC-012)
const V4 = doc.approach.filter(a => a.added_in === 'v4'), V5 = doc.approach.filter(a => a.added_in === 'v5'), L3 = createRealHistory({ raw: { ...raw, placementClaims: { ...doc, approach: doc.approach.filter(a => !a.added_in) } }, T: TM, helpers }), L4 = createRealHistory({ raw: { ...raw, placementClaims: { ...doc, approach: doc.approach.filter(a => a.added_in !== 'v5') } }, T: TM, helpers });
const Lall = createRealHistory({ raw: { ...rawFull, siblingApproach: null }, T: TM, helpers }), newlyDrawnAll = Lall.units.filter(u => u.drawn && !L4.units.find(x => x.id === u.id).drawn);   // Lall: with ledger E (v8)
const newlyDrawn4 = L4.units.filter(u => u.drawn && !L3.units.find(x => x.id === u.id).drawn), newlyDrawn = L.units.filter(u => u.drawn && !L4.units.find(x => x.id === u.id).drawn);

test('v4 approach records: the road is printed in the report, the claim prints no clock (the time is the unit\'s gate), the kind is an arrival or a march, and the claim left the exclusion list', () => {
  assert.deepEqual(V4.map(a => a.id), ['AP-31', 'AP-32']); const cur = J('app/data/claim-curation.json'), ver = J('app/data/claim-phrase-verification.json');
  for (const a of V4) {
    const c = byClaim.get(a.claim); assert.ok(['arrival_road', 'march'].includes(c.kind), a.id); assert.equal(c.when.t_iso, null, `${a.id}: the claim prints no clock; an approach takes its time from the gate`); assert.equal(a.added_in, 'v4');
    assert.equal(unusable(c), null); assert.equal(a.road, 'Chambersburg Pike'); assert.equal(a.phrase_in, 'record'); assert.ok(!cur.approach_exclude[a.claim], `${a.claim} is still in approach_exclude`);
    const v = ver.results.find(r => r.claim === a.claim && r.phrase === a.phrase); assert.ok(v && v.found && v.record === c.source.report_id, `${a.id}: “${a.phrase}” confirmed in ${c.source.report_id}`);
    assert.ok(a.identification || cur.approach.find(e => e.claim === a.claim).identification, `${a.id}: the identification of the road is said`);
  }
  const wider = ver.results.find(r => r.claim === 'PD-3c-anderson-wright-01'); assert.equal(wider.window_chars, 1500); assert.ok(wider.distance_from_quote > 600 && wider.distance_from_quote <= 1500, 'the sentence is further than the usual window and the wider window is recorded');
  assert.equal(ver.results.find(r => r.claim === 'PD-3c-01').window_chars, undefined, 'the usual window of 600 characters');
  const ap31 = L.units.filter(u => u.drawn && u.approach.id === 'AP-31'), ap32 = L.units.filter(u => u.drawn && u.approach.id === 'AP-32');
  assert.ok(ap31.length >= 15 && ap32.length >= 4 && ap31.every(u => u.approach.tier === 'plausible-procedural' && u.approach.inherited && u.approach.owner === 'cs-3c'), 'a corps-level road gives its descendants plausible-procedural');
  assert.ok(ap32.every(u => u.approach.tier === 'inferred' && u.approach.owner === 'cs-3c-anderson-wright'));
  for (const u of [...ap31, ...ap32]) { assert.match(u.approach.text, /Documented: the road of approach/); assert.match(u.approach.text, /Modelled: when the unit reaches the edge of the ground/); assert.match(u.approach.text, /Place in the column/); }
});

test('v4: what drawing the roads changes: the units drawn only grow, each new one is a Third Corps unit on the Chambersburg Pike entered at or after its gate, no unit is drawn without a road of its line of command, no gate moves, the Third Corps has no open leaf', () => {
  const L = L4, newlyDrawn = newlyDrawn4;                                                                 // the v4 state of the layer (the v5 records of the road-name concordance are tested below)
  assert.ok(newlyDrawn.length >= 20, `${newlyDrawn.length} newly drawn`); assert.equal(L.counts.drawn - L3.counts.drawn, newlyDrawn.length);
  for (const u of L3.units) { const w = L.units.find(x => x.id === u.id); if (u.drawn) { assert.ok(w.drawn, `${u.id} was drawn and is no longer`); assert.equal(w.approach.id, u.approach.id, `${u.id}: its road changed`); assert.equal(w.approach.tier, u.approach.tier); } }
  const { events, arrivals } = L.both({}), A = new Map(arrivals.map(a => [a.unit, a])), a3 = new Map(L3.arrivals({}).map(a => [a.unit, a]));
  for (const u of newlyDrawn) {
    assert.ok(u.id.startsWith('cs-3c-'), u.id); assert.ok(['AP-31', 'AP-32'].includes(u.approach.id)); const plan = L.plans.get(u.id); assert.equal(plan.road, 'Chambersburg Pike'); assert.ok(['moving', 'edge_only'].includes(plan.status));
    const en = events.find(e => e.type === 'enter' && e.unit === u.id); assert.ok(en && en.t >= A.get(u.id).earliest - 1e-9, `${u.id}: enters at or after its gate`);
    assert.equal(A.get(u.id).earliest, a3.get(u.id).earliest, `${u.id}: its gate moved`); assert.equal(A.get(u.id).default, a3.get(u.id).default);
    assert.ok(u.strength.drawn > 0 && /Chambersburg Pike/.test(u.render.reason), u.id);
  }
  const open = L.units.filter(u => !u.children.length && u.render.status === 'not_drawn'); assert.equal(open.length, L.counts.not_drawn);
  assert.ok(!open.some(u => u.id.startsWith('cs-3c-')), 'every Third Corps leaf unit is drawn');
  const bh = open.filter(u => L.plans.get(u.id) && /does not cross into the loaded ground/.test(L.plans.get(u.id).reason)); assert.ok(bh.length >= 13 && bh.every(u => u.id.startsWith('us-3c-2d-')), 'the Black Horse Tavern Road units stay open with that reason; no other road is chosen for them');
  const U = new Map(raw.units.units.map(u => [u.id, u]));
  for (const u of L.units) if (u.drawn) { const ch = []; for (let x = U.get(u.id); x; x = U.get(x.parent)) ch.push(x.id); assert.ok(ch.some(id => L.placement.ap.some(a => a.unit === id)), `${u.id}: drawn without a road in its line of command`); }
});

test('the approach audit is current, complete and consistent: APPROACH-AUDIT.md equals what the tool writes now, every open-gap leaf has a reason, every claim that names a road in its printed words and sits on an open line is a row with a reason, the verdicts are about real usable claims', () => {
  const A = approachAudit({ raw: rawFull, T: TM }); assert.deepEqual(A.errors, [], A.errors.join('\n'));
  assert.equal(fs.readFileSync(path.join(BT, OUT_MD), 'utf8'), auditMarkdown(A), 'APPROACH-AUDIT.md is stale: run node docs/battle-theatre/app/tools/approach-audit.mjs');
  const open = Lall.units.filter(u => !u.children.length && u.render.status === 'not_drawn'), valid = new Set([...CODES.map(c => c[0]), 'no_figure']);
  assert.equal(A.openLeaves, open.length); assert.equal(Object.values(A.reasonCounts).reduce((a, b) => a + b, 0), open.length); assert.equal(A.leafReason.length, open.length);
  for (const l of A.leafReason) assert.ok(valid.has(l.code), `${l.id}: ${l.code}`);
  assert.equal(A.after.drawn - A.before.drawn, newlyDrawnAll.length); assert.equal(A.before.drawn, L4.counts.drawn); assert.equal(A.after.drawn, Lall.counts.drawn);   // the audit is of the claims state with ledger E (v8)
  assert.equal(A.after.offsets - A.before.offsets, Lall.report({}).offsets.length - L4.report({}).offsets.length); assert.equal(A.after.defects, 0, 'no timed place is reached late');
  const openIds = new Set(open.map(u => u.id)), U = new Map(raw.units.units.map(u => [u.id, u])), under = new Set(); for (const id of openIds) for (let u = U.get(id); u; u = U.get(u.parent)) under.add(u.id);
  const printedRoad = c => [c.source.quote, c.place.printed, /\[/.test(c.place.direction_or_road || '') ? null : c.place.direction_or_road].filter(Boolean).some(t => /\b(road|pike|turnpike|railroad|lane|street)\b/i.test(t));
  const rows = new Map(A.rows.map(r => [r.claim, r])), cur = J('app/data/claim-curation.json'); assert.equal(rows.size, A.rows.length, 'one row for each claim');
  for (const c of led.claims) if (!unusable(c) && ['arrival_road', 'march', 'movement'].includes(c.kind) && (c.when.date || '') <= '1863-07-03' && under.has(c.unit_id) && printedRoad(c)) assert.ok(rows.has(c.claim_id) && rows.get(c.claim_id).code !== 'unreviewed', `${c.claim_id} names a road and has no reason in the audit`);
  for (const r of A.rows) {
    const c = byClaim.get(r.claim); assert.ok(c && !unusable(c), r.claim); assert.ok(['arrival_road', 'march', 'movement', 'position', 'night_position'].includes(c.kind)); assert.ok(r.date <= '1863-07-03'); assert.ok(r.code && r.code !== 'unreviewed'); assert.ok(r.reason && r.reason.length > 8, `${r.claim}: a reason`);
    if (r.code === 'used') assert.ok(docAll.approach.some(a => a.id === r.entry && a.claims.includes(r.claim)), r.claim); else assert.ok(!docAll.approach.some(a => a.claim === r.claim), `${r.claim} is an approach record and is also listed as not used`);
  }
  for (const id of Object.keys(cur.approach_exclude)) assert.ok(!docAll.approach.some(a => a.claims.includes(id)), `${id} is excluded and used`);
  const review = J('app/data/approach-review.json'); for (const [id, code] of Object.entries(review.verdicts)) { const c = byClaim.get(id); assert.ok(c && !unusable(c), `${id}: a usable claim`); assert.ok(review.codes[code], `${id}: ${code} is a code`); } for (const o of review.for_owner) assert.ok(byClaim.has(o.claim), o.claim);
  assert.ok(A.forOwner.length === review.for_owner.length && A.forOwner.every(o => o.unit && o.leaves > 0), 'each claim that came closest names a unit with open leaves under it');
  // the hand-written reading of the table names records that exist
  const md = fs.readFileSync(path.join(BT, OUT_MD), 'utf8'); const L6 = createRealHistory({ raw: rawFull, T: TM, helpers }); for (const id of md.match(/AP-\d\d/g)) assert.ok(L6.placement.ap.some(a => a.id === id), `${id} exists`);
  // a road that does not cross the loaded ground is listed as such
  assert.equal(A.roads.find(r => r.name === 'Black Horse Tavern Road').crosses_ground, false); assert.equal(A.roads.find(r => r.name === 'Chambersburg Pike').crosses_ground, true);
});

test('the record scan is what the OR text gives (re-run when the OR text is present); every sentence is in the claim\'s own record', () => {
  const scan = J('app/data/approach-record-scan.json'); assert.ok(scan.rows.length > 300);
  for (const r of scan.rows) { const c = byClaim.get(r.claim); assert.ok(c && !unusable(c) && ['arrival_road', 'march', 'movement'].includes(c.kind), r.claim); assert.equal(r.record, c.source.report_id || c.source.record_id); assert.ok(r.snippets.length >= 1 && r.snippets.every(s => /\b(road|roads|pike|turnpike|route)\b/i.test(s))); }
  const orText = path.join(ROOT, 'tmp/library/or27');
  if (fs.existsSync(orText)) {
    const out = path.join(os.tmpdir(), 'bt-roadscan-' + process.pid + '.json'), r = spawnSync('python', ['-I', path.join(BT, 'app/tools/scan_record_roads.py'), '--out', out], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' }, timeout: 100000 });
    if (r.status === null || r.error) console.log('# python not available: the record scan was not re-run'); else { assert.equal(r.status, 0, r.stdout + r.stderr); assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')), scan, 'the scan is the OR text now'); } try { fs.unlinkSync(out); } catch {}
  } else console.log('# the OR text (tmp/library/or27) is absent: the record scan was not re-run');
});

// ---- history layer v5 (DEC-013 a, DEC-014): position statements read as roads of approach, the road-name concordance, the approach block
const RC = J('app/data/road-concordance.json'), V5ents = doc.approach.filter(a => a.added_in === 'v5');
test('v5 approach records: a position claim is admitted only as DEC-013 a says (kind, identification, claim left the exclusion list); a period name only through a resolved concordance entry that covers the claim, names the same road and carries its tier', () => {
  assert.deepEqual(V5ents.map(a => a.id), ['AP-33', 'AP-34', 'AP-35', 'AP-36', 'AP-37', 'AP-38', 'AP-39', 'AP-40', 'AP-41']); const cur = J('app/data/claim-curation.json');
  for (const a of V5ents) {
    const c = byClaim.get(a.claim); assert.equal(unusable(c), null, a.id); assert.equal(a.tier, 'inferred'); assert.ok(!cur.approach_exclude[a.claim], `${a.claim} is still in approach_exclude`); assert.ok(a.identification && a.identification.length > 40, a.id);
    assert.ok(boxCrossings(L.gazetteer.resolve(a.road).line, TM.meta).length > 0, `${a.id}: ${a.road} crosses the loaded ground`);
    if (['position', 'night_position'].includes(c.kind)) { assert.equal(a.admitted_by, 'DEC-013a'); assert.equal(a.claim_kind, c.kind); assert.match(a.inference, /position statement|night position statement/); assert.ok(c.when.date <= '1863-07-03'); }
    else assert.ok(['arrival_road', 'march'].includes(c.kind), a.id);
    if (a.concordance) {
      const rc = RC.names.find(n => n.id === a.concordance.id); assert.ok(rc && rc.status === 'resolved', `${a.id}: ${a.concordance.id} is resolved`); assert.ok(rc.claims.includes(a.claim), `${a.id}: the concordance covers the claim`); assert.equal(rc.resolves_to.road, a.road); assert.equal(rc.tier, a.concordance.tier); assert.ok(['documented', 'inferred'].includes(rc.tier));
      assert.ok(rc.variants.some(v => norm(v) === norm(a.concordance.printed_name)) && norm(a.phrase).includes(norm(a.concordance.printed_name)), `${a.id}: the printed name is a variant of ${rc.id} inside the phrase`); assert.match(a.inference, new RegExp(rc.id));
    } else assert.ok(!/concordance/.test(a.inference || ''), a.id);
  }
  // the concordance never changes Gazetteer.resolve: the period names are still not gazetteer names
  assert.equal(L.gazetteer.resolve('Heidlersburg road'), null); assert.equal(L.gazetteer.resolve('Middletown road'), null);
});

test('the road-name concordance: every quotation was verified in the OR text, every resolved name is a gazetteer line that crosses the ground with the crossing the gazetteer gives, every unresolved name says why, nothing was traced or aliased by guess, every source and error is recorded', () => {
  assert.equal(RC.counts.names, RC.names.length); const byGz = new Map(raw.gazetteer.places.map(p => [p.id, p]));
  for (const n of RC.names) {
    assert.ok(['resolved', 'resolved_name_no_approach', 'unresolved'].includes(n.status), n.id); assert.ok(['inferred', 'documented', 'unresolved'].includes(n.tier)); assert.ok(n.variants.length >= 1 && n.claims.length >= 1, n.id);
    for (const c of n.claims) assert.ok(byClaim.has(c), `${n.id}: claim ${c} exists`);
    for (const ev of n.evidence || []) if (ev.kind === 'or_text') { assert.equal(ev.verified_in_or_text, true, `${n.id}: ${ev.quote}`); assert.ok(ev.quote.split(/\s+/).length < 15, `${n.id}: a quotation under 15 words`); }
    if (n.status === 'unresolved') { assert.equal(n.resolves_to, null); assert.ok(n.reason && n.reason.length > 80, `${n.id}: the reason is said`); assert.ok(!V5ents.some(a => a.concordance && a.concordance.id === n.id), `${n.id}: an unresolved name drives no approach`); }
    if (n.status === 'resolved') {
      const g = byGz.get(n.resolves_to.gazetteer_id); assert.ok(g && g.line && g.name === n.resolves_to.road, n.id); const cr = boxCrossings(g.line, TM.meta); assert.ok(cr.length >= 1 && n.resolves_to.crossings_of_the_loaded_ground.length === cr.length, `${n.id}: ${g.name} crosses the ground`);
      cr.forEach((x, i) => { assert.ok(Math.abs(x.point.lng - n.resolves_to.crossings_of_the_loaded_ground[i].lng) < 2e-5 && Math.abs(x.point.lat - n.resolves_to.crossings_of_the_loaded_ground[i].lat) < 2e-5, `${n.id}: the crossing is the gazetteer line's`); });
      assert.equal(n.resolves_to.sigma_m, g.sigma_m, `${n.id}: the error of the road is the gazetteer's`); assert.ok(n.evidence.some(e => e.kind === 'or_text') && n.evidence.some(e => e.kind === 'period_map'), `${n.id}: OR text and a period map`); assert.ok(n.argument.length > 300 && n.alternatives_rejected.length >= 1, `${n.id}: argument and rejected alternatives`);
      assert.notEqual(n.tier, 'documented', `${n.id}: no period map prints the name on the road, so the tier is not documented`);
    }
  }
  assert.deepEqual(RC.traced_roads, [], 'no road was traced: every resolved name is a gazetteer line'); for (const k of Object.keys(RC.sources_read)) assert.match(RC.sources_read[k].sha256 || '', /^[0-9a-f]{64}$/, k);
  for (const g of Object.values(RC.georeference)) assert.ok(g.source && g.transform);
  for (const c of RC.crossing_checks) { assert.ok(byGz.get(c.gazetteer).line); assert.ok(c.crop && fs.existsSync(path.join(ROOT, c.crop)), c.crop); assert.ok(c.drawn_road_offset_m === null || c.drawn_road_offset_m <= 20, `${c.road}: the drawn road is within the sheet's error of the crossing`); }
  assert.ok(fs.existsSync(path.join(BT, 'library/ROAD-CONCORDANCE.md')));
  const gh = JSON.parse(fs.readFileSync(path.join(BT, 'GOVERNANCE/library/acquired.json'), 'utf8')).items; for (const k of ['cw0353500.jp2', 'cw0325000a.jp2', 'la000697.jp2']) assert.ok(gh.some(i => (i.local_path || '').includes(k) && /^[0-9a-f]{64}$/.test(i.sha256)), `${k} is recorded with its hash in GOVERNANCE/library/acquired.json`);
  for (const [k, s] of Object.entries(RC.sources_read)) assert.ok(gh.some(i => i.sha256 === s.sha256), `${k}: the hash matches the library entry`);
});

test('v5 in the layer: every approach has a source and an error, the new units enter at or after their gate, the block unit takes no road, a unit keeps the nearer printed road, the card says what is documented and what is modelled and lists the conflicting claim, Q04 for every unit', () => {
  const { events, arrivals } = L.both({}), A = new Map(arrivals.map(a => [a.unit, a])), A4 = new Map(L4.arrivals({}).map(a => [a.unit, a]));
  for (const a of L.placement.ap) { const g = L.gazetteer.resolve(a.road); assert.ok(g && g.line && g.sigma_m > 0, `${a.id}: the road has an error (sigma_m)`); assert.ok(g.members && g.members.length, `${a.id}: ${a.road} has its source features`); }
  for (const u of L.units) { const w = L4.units.find(x => x.id === u.id); if (w.drawn) assert.ok(u.drawn && u.approach.id === w.approach.id, `${u.id}: a v4 unit keeps its road`); if (u.drawn) assert.equal(A.get(u.id).earliest, A4.get(u.id).earliest, `${u.id}: no gate moves (Q04)`); }
  assert.ok(newlyDrawn.length >= 90); for (const u of newlyDrawn) {
    const en = events.find(e => e.type === 'enter' && e.unit === u.id); assert.ok(en && en.t >= A.get(u.id).earliest - 1e-9, `${u.id}: enters at or after its gate`); assert.equal(u.tier, 'plausible-procedural');
    assert.match(u.approach.text, /Documented: the (road of approach|position statement|road name as the report prints it)/); assert.match(u.approach.text, /Modelled: .*when the unit reaches the edge/); assert.match(u.approach.text, /Place in the column: \d+ of \d+, in roster order/);
    const ap = L.placement.ap.find(a => a.id === u.approach.id); if (ap.claim_kind) assert.match(u.approach.text, /Documented: the position statement/); if (ap.concordance) { assert.match(u.approach.text, new RegExp('concordance ' + ap.concordance.id)); assert.match(u.approach.text, /period-map labels of the road: /); }
  }
  // the block: Jones' battalion takes no road from Early's division, says why, and lists both claims
  const j = L.units.find(u => u.id === 'cs-2c-early-jones'); assert.equal(j.drawn, false); assert.match(j.render.reason, /reports of this unit print another/); assert.match(j.render.reason, /PD-2c-early-jones-05/); assert.ok(L.placement.blockOf('cs-2c-early-jones') && !L.placement.approachInfo('cs-2c-early-jones'));
  const early = L.units.filter(u => u.id.startsWith('cs-2c-early-') && !u.children.length && u.id !== 'cs-2c-early-jones'); assert.ok(early.length >= 15 && early.every(u => u.drawn), 'the rest of Early’s division is drawn');
  // the II Corps card lists the conflicting dispatch of the same day (a place, not a road) and says it is a position statement
  const k = L.units.find(u => u.id === 'us-2c-1d-kelly-28ma'); assert.equal(k.approach.id, 'AP-33'); assert.equal(k.approach.tier, 'plausible-procedural'); assert.ok(JSON.stringify(k.provenance).includes('POS-B-us-2c-19'), 'the circular that puts the corps at Taneytown is listed'); assert.match(provenanceSection(k), /conflicting/);
  // a nearer printed road overrides a road of the formation above (Hays and Hoke print the Heidlersburg road themselves)
  const hays = L.units.find(u => u.id.startsWith('cs-2c-early-hays-') && !u.children.length); assert.equal(hays.approach.id, 'AP-37'); assert.equal(hays.approach.owner, 'cs-2c-early-hays');
  assert.deepEqual(validateUnits(L.units), []);
});
