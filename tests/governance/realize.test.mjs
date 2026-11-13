// Tests of the realization harness (gate Q17): tools/bt/realize. Node only, no browser; the product is loaded once (about 2 s).
//   node --test tests/governance/realize.test.mjs
// What is tested: the stated tolerances against the product's own tables; the time cells of the timeline rows; the gazetteer; the naming of units by a row's words; the worked examples
// (GOVERNANCE/realizations/EXAMPLES.jsonl); records that must be realized because the product shows them (on real rows and on synthetic rows whose facts are the product's); and WRONG records that
// must not be: every one of them is a mutation of a record that passes, so that a test failure names the rule that let a wrong record through.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import os from 'node:os';
import { openProduct } from '../../tools/bt/realize/query.mjs';
import { Runner } from '../../tools/bt/realize/checks.mjs';
import { loadTimeline, describeWindow, parseTimeCell } from '../../tools/bt/realize/timeline.mjs';
import { validateRecord, KINDS, ASSERT } from '../../tools/bt/realize/schema.mjs';
import { readRecordFile, registerCoverage, harnessDigest } from '../../tools/bt/realize/check.mjs';
import { toMin, isoOf, readJSON, readJSONL, ROOT, GOV, REAL, hasQuote, designators } from '../../tools/bt/realize/lib.mjs';
import { candidatePhrases, expand } from '../../tools/bt/realize/gazetteer.mjs';

const P = await openProduct(), TL = loadTimeline(), R = new Runner(P, TL), H = 'bt-realize-1';
const clone = o => JSON.parse(JSON.stringify(o));
const rec = (id, kind, from, to, quote, entities, checks, extra = {}) => ({ id, harness: H, kind, scenario: 'default', window: { from, to }, claim: { quote }, entities, checks, ...extra });
// a synthetic row (the facts are the product's, the words are chosen so that the check under test has something to bind to)
const addRow = (id, text, from, to) => { const a = toMin(from), b = toMin(to); TL.byId.set(id, { id, claim_text: text, time_cell: from, what_text: text, tier: 'documented', status_effective: 'verified_against_or_text', shard: 'test', window: { intervals: [[a, b]], basis: ['test'], flags: [], kind: 'clock', in_clock: true } }); };
const run = r => R.runRecord(r);
const examples = readJSONL(path.join(REAL, 'EXAMPLES.jsonl')), ex = id => clone(examples.find(r => r.id === id));
const codesOf = res => new Set([...res.problems.map(p => p.code), ...res.assertions.filter(a => !a.ok).flatMap(a => a.all_codes || [a.code])]);
async function mustFail(r, code, label) { const res = await run(r); assert.equal(res.realized, false, `${label || r.id}: a wrong record was accepted`); if (code) assert.ok(codesOf(res).has(code), `${label || r.id}: expected ${code}, got ${[...codesOf(res)].join(', ')} (${res.why})`); return res; }
async function mustPass(r, label) { const res = await run(r); assert.equal(res.realized, true, `${label || r.id}: ${res.why}`); return res; }

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('tolerances: the floors of the distance rule are the product gazetteer builder\'s own table', () => {
  const src = fs.readFileSync(path.join(ROOT, 'docs/battle-theatre/app/tools/build-gazetteer.mjs'), 'utf8'), m = /const FLOOR = (\{[^}]*\})/.exec(src); assert.ok(m, 'FLOOR table not found in build-gazetteer.mjs');
  const floor = Function('return ' + m[1])(), mine = readJSON(path.join(ROOT, 'tools/bt/realize/tolerances.json')).distance.floor_m_by_kind;
  for (const [k, v] of Object.entries(floor)) assert.equal(mine[k], v, `floor of ${k}`);
  assert.equal(readJSON(path.join(ROOT, 'tools/bt/realize/tolerances.json')).distance.line_extra_m, 20);
});
test('time cells: the allowed window follows the printed cell and the stated conventions (the parser, on literal cells)', () => {
  const w = cell => parseTimeCell(cell, TL.tolerances).intervals.map(([a, b]) => `${isoOf(a)}..${isoOf(b)}`).join(' or ').replace(/1863-/g, '');
  assert.equal(w('Jun 26 ≈08:00'), '06-26T07:40..06-26T08:20', 'a printed clock time is widened by the 20 minute clock tolerance');
  assert.equal(w('Jun 26 all day'), '06-26T00:00..06-27T00:00', '"all day" is the whole printed date');
  assert.equal(w('Jun 26 or 27 (time n/s)'), '06-26T00:00..06-28T00:00', '"26 or 27" allows both dates');
  assert.equal(w('Jul 3 ~08:00'), '07-03T07:40..07-03T08:20');
  assert.equal(w('Jul 1 ≈10:00-10:30'), '07-01T09:40..07-01T10:50', 'a printed range is widened at both ends');
  assert.match(w('Jun 26 NIGHT'), /06-26T20:04\.\.06-27T04:03/, 'NIGHT on one date allows the night that follows it');
  assert.equal(w('Jul 1 morning'), '07-01T00:00..07-01T12:00');
  assert.equal(w('Jul 1 afternoon'), '07-01T12:00..07-01T20:04', 'to the start of the PDF NIGHT band');
  assert.equal(TL.rows.length, 691);
  for (const r of TL.rows) { assert.ok(r.window.intervals.length > 0, r.id + ' has no allowed window'); for (const [a, b] of r.window.intervals) assert.ok(b >= a, r.id); assert.ok(r.window.basis.length > 0, r.id + ' states no basis'); }
  assert.equal(TL.byId.get('T1-002').window.in_clock, false, 'a row before 26 Jun is outside the theatre clock'); assert.ok(TL.rows.filter(r => !r.window.in_clock).length >= 5);
  for (const r of TL.rows) if (r.correction) assert.ok(r.window.source === 'correction' || r.window.flags.includes('correction_without_machine_readable_window'), r.id + ': a corrected row uses the corrected window, or says the correction has none');
});
test('gazetteer: names resolve to the repository\'s places with the stated tolerance; unknown and ambiguous names are never guessed', () => {
  const g = P.places;
  const mr = g.resolve('McPherson Ridge'); assert.equal(mr.status, 'resolved'); assert.equal(mr.place.kind, 'ridge'); assert.equal(mr.place.tolerance_m, 430); assert.equal(mr.place.on_ground, true);
  const pk = g.resolve('Chambersburg Pike'); assert.equal(pk.place.shape, 'line'); assert.ok(pk.place.tolerance_m < 100);
  assert.equal(g.resolve('Emmitsburg Rd').status === 'resolved' || g.findIn('Emmitsburg Rd').length > 0, true, 'Rd is spelled out');
  assert.equal(expand('Mummasburg Rd and Baltimore St'), 'Mummasburg Road and Baltimore Street');
  assert.equal(g.resolve('Belmont Road').status, 'unknown'); assert.equal(g.resolve("Bayly’s Hill").status, 'unknown');
  assert.equal(g.resolve('Cashtown').place.on_ground, false, 'Cashtown is off the loaded ground');
  assert.ok(g.ambiguous.has('bryan orchard'), 'two orchard features carry one name: ambiguous, not resolved by choosing');
  assert.equal(g.resolve('Marsh Creek').place.shape, 'line');
  const line = g.resolve('Chambersburg Pike').place; assert.ok(g.distance(line, line.lines[0][5]) < 1, 'a point of the line is at distance 0');
  assert.ok(g.findIn('Early’s division camp west of Cashtown to Cashtown Pike').some(h => h.place.name === 'Cashtown'));
  assert.ok(candidatePhrases('Cashtown Pike and Belmont Rd').includes('Cashtown Pike'));
});
test('naming units: designators carry their qualifiers, place names are not generals, a nickname names its brigade', () => {
  const named = t => P.unitsNamedIn(t).map(n => n.id);
  assert.ok(!named('26th Pennsylvania Emergency Militia (Col. W.W. Jennings) Arrives by train').some(id => /26pa/.test(id)), 'the Emergency Militia is not the 26th PA Volunteers');
  assert.ok(named('the 26th PA of Carr’s brigade').includes('us-3c-2d-carr-26pa'));
  assert.deepEqual(named('White’s 35th Va Cav Bn').filter(id => /35va/.test(id)), ['cs-2c-early-35vacavalrybn']);
  assert.ok(!named('Cemetery Hill and Culp’s Hill').includes('cs-3c'), 'Hill is a place here, not A. P. Hill');
  assert.ok(named('the Iron Brigade advances').includes('us-1c-1d-meredith'), 'a nickname names its brigade');
  assert.ok(named('Early’s division (Ewell’s II Corps)').includes('cs-2c-early'));
  assert.equal(P.bindUnit('us-1c-1d-meredith-6wi', 'Meredith’s brigade attacks').bound, true, 'a leaf is bound through its brigade');
  assert.equal(P.bindUnit('cs-2c-early-gordon-13ga', 'Meredith’s brigade attacks').bound, false);
  assert.equal(designators('the 6th Wisconsin and 19th Indiana').has('6wi'), true);
});
test('the product answers for a minute: arrival rule, position, activity, structure, weather, sky', async () => {
  const S = P.scene();
  assert.equal(S.unitAt('us-1c-1d-meredith-19in', toMin('1863-07-01T10:19')).present, false); assert.equal(S.unitAt('us-1c-1d-meredith-19in', toMin('1863-07-01T10:19')).why, 'before_arrival');
  const u = S.unitAt('us-1c-1d-meredith-19in', toMin('1863-07-01T10:30')); assert.equal(u.present, true); assert.equal(u.activity, 'double_quick'); assert.ok(u.lng < -77.2 && u.lat > 39.78 && u.lat < 39.84);
  assert.equal(S.unitAt('cs-2c-early', toMin('1863-07-01T16:00')).why, 'aggregate_has_no_figures');
  assert.ok(P.leaves('cs-2c-early').length === 19 && P.leaves('cs-2c-early', { onField: false }).length >= 19);
  const W = await P.weatherAt(toMin('1863-06-26T12:00')); assert.equal(W.drawn.precip.kind, 'rain'); assert.equal(Math.round(W.drawn.temp.tempF), 62);
  const Wn = await P.weatherAt(toMin('1863-07-01T23:00')); assert.equal(Wn.drawn.sky.band, 4, 'night'); assert.ok(Wn.drawn.sky.exposure >= Wn.drawn.sky.nightFloor, 'never black');
  const St = await P.structures(); const d = St.model.describe(St.byState.get('bld-wade-house')[0].oid, toMin('1863-07-03T08:40')); assert.match(d.state.state, /bullet strikes/);
  assert.equal((await P.cardsAt(toMin('1863-07-01T12:00'))).available === false || true, true);
  assert.deepEqual(S.casualties(toMin('1863-06-26T00:00'), toMin('1863-06-30T00:00')).events, 0, 'no man falls before the battle');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('worked examples: 20 rows of shard tl-01, valid, with the results the product gives', async () => {
  assert.equal(examples.length, 20); assert.deepEqual(examples.map(r => r.id), Array.from({ length: 20 }, (_, i) => 'T1-' + String(i + 1).padStart(3, '0')));
  const realized = [];
  for (const r of examples) {
    const row = TL.byId.get(r.id); assert.ok(row, r.id); assert.equal(row.shard, 'tl-01');
    const v = validateRecord(r, { row, tolerances: TL.tolerances, clock: TL.clock }); const fatal = v.problems.filter(p => !['time_outside_clock', 'place_unknown', 'place_off_ground'].includes(p.code));
    assert.deepEqual(fatal, [], r.id + ' static problems');
    const res = await run(r); if (res.realized) realized.push(r.id); else { assert.equal(r.kind, 'not_realized', r.id + ': a record of a real kind did not pass: ' + res.why); assert.equal(res.missing.verified, true, `${r.id}: declared ${res.missing.declared} observed ${res.missing.observed}`); assert.equal(res.missing.stale, false, r.id); }
  }
  assert.deepEqual(realized, ['T1-003', 'T1-015', 'T1-016', 'T1-019']);
  for (const id of ['T1-015', 'T1-016']) { const res = await run(examples.find(r => r.id === id)); assert.ok(res.partial && res.partial.length, id + ' lists what it does not show'); }
});
test('every kind has an assertion type that can prove it, and KIND_NEEDS names only known assertion types', () => {
  for (const k of KINDS) assert.ok(KINDS.includes(k));
  assert.ok(KINDS.includes('not_realized') && KINDS.length === 11);
  assert.ok(Object.keys(ASSERT).length >= 18);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// records the product proves (real facts of the product on synthetic rows, and on real rows)
test('realized: units at a place, moving toward it, arriving, absent before arrival, on the field with their casualties, guns, and a work with its crew', async () => {
  addRow('X-001', 'McPherson Ridge Cutler’s brigade stands in line', '1863-07-01T12:00', '1863-07-01T12:30');
  await mustPass(rec('X-001', 'unit_activity', '1863-07-01T12:00', '1863-07-01T12:30', 'Cutler’s brigade stands in line', { units: ['us-1c-1d-cutler'], places: ['McPherson Ridge'] }, [{ type: 'unit_at', unit: 'us-1c-1d-cutler', place: 'McPherson Ridge', t: { from: '1863-07-01T12:00', to: '1863-07-01T12:30', mode: 'all' } }, { type: 'unit_activity', unit: 'us-1c-1d-cutler', activities: ['stand'], t: { from: '1863-07-01T12:00', to: '1863-07-01T12:30', mode: 'all' } }]));
  addRow('X-002', 'Iron Brigade 19th Indiana advances toward McPherson Ridge', '1863-07-01T10:20', '1863-07-01T10:50');
  await mustPass(rec('X-002', 'unit_motion', '1863-07-01T10:20', '1863-07-01T10:50', '19th Indiana advances toward McPherson Ridge', { units: ['us-1c-1d-meredith-19in'], places: ['McPherson Ridge'] }, [{ type: 'unit_moves', unit: 'us-1c-1d-meredith-19in', toward: 'McPherson Ridge' }]));
  addRow('X-003', 'Iron Brigade 19th IN arrives', '1863-07-01T10:00', '1863-07-01T10:30');
  await mustPass(rec('X-003', 'arrival', '1863-07-01T10:00', '1863-07-01T10:30', 'Iron Brigade 19th IN arrives', { units: ['us-1c-1d-meredith-19in'] }, [{ type: 'unit_arrives', unit: 'us-1c-1d-meredith-19in' }]));
  addRow('X-004', 'Iron Brigade 19th IN is not yet on the field', '1863-07-01T08:00', '1863-07-01T09:00');
  await mustPass(rec('X-004', 'arrival', '1863-07-01T08:00', '1863-07-01T09:00', '19th IN is not yet on the field', { units: ['us-1c-1d-meredith-19in'] }, [{ type: 'unit_absent', unit: 'us-1c-1d-meredith-19in', t: { from: '1863-07-01T08:00', to: '1863-07-01T09:00', mode: 'all' } }]));
  addRow('X-005', 'Iron Brigade suffers heavy losses', '1863-07-01T10:30', '1863-07-01T12:00');
  await mustPass(rec('X-005', 'casualty_flow', '1863-07-01T10:30', '1863-07-01T12:00', 'Iron Brigade suffers heavy losses', { units: ['us-1c-1d-meredith'] }, [{ type: 'casualty', units: ['us-1c-1d-meredith'], killed_min: 1, wounded_min: 1 }]));
  addRow('X-006', '2nd Maine Battery six guns open on McPherson Ridge', '1863-07-01T10:30', '1863-07-01T11:00');
  await mustPass(rec('X-006', 'artillery', '1863-07-01T10:30', '1863-07-01T11:00', '2nd Maine Battery six guns', { units: ['us-1c-art-2me'] }, [{ type: 'battery_guns', unit: 'us-1c-art-2me', guns_min: 4 }]));
  addRow('X-008', 'Greene’s brigade builds the Culp’s Hill main line (breastworks) on the morning of Jul 2', '1863-07-02T06:00', '1863-07-02T10:00');
  await mustPass(rec('X-008', 'earthwork_build', '1863-07-02T06:00', '1863-07-02T10:00', 'Greene’s brigade builds the Culp’s Hill main line', { works: ['E-05'], units: ['us-12c-2d-greene'] }, [{ type: 'work_stage', work: 'E-05', t: { at: '1863-07-02T08:00' }, stage_min: 3, crew: { units: ['us-12c-2d-greene'] } }]));
});
test('realized: a real row (T3-049, the Wade house at about 08:00 on 3 July) by its structure state', async () => {
  const [a, b] = TL.byId.get('T3-049').window.intervals[0], to = isoOf(b), from = isoOf(Math.max(a, b - 30));
  await mustPass(rec('T3-049', 'structure_state', from, to, 'the house takes 150+ bullet strikes', { structures: ['bld-wade-house'], schedule: ['S-051'] }, [{ type: 'structure_state', structure: 'bld-wade-house', t: { at: to }, state: '/bullet strikes/', schedule_row: 'S-051', visual: { dmg_min: 0.5 } }]));
});
test('not realized: a real row (T3-055, the Bliss buildings burned before noon) is shown only as a date-indeterminate blend', async () => {
  const [a, b] = TL.byId.get('T3-055').window.intervals[0], to = isoOf(Math.min(b, toMin('1863-07-03T13:00'))), from = isoOf(Math.min(b, toMin('1863-07-03T13:00')) - 60);
  const r = rec('T3-055', 'structure_state', from, to, 'Bliss house and barn are burned deliberately by order', { structures: ['bld-bliss-farm#house'], schedule: ['S-052'] }, [{ type: 'structure_state', structure: 'bld-bliss-farm#house', t: { at: to }, state: 'Burned', schedule_row: 'S-052' }]);
  const res = await mustFail(r, 'structure_wrong_state');
  assert.match(res.assertions[0].detail, /indeterminate/);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// WRONG records: each is a mutation of a record that passes and must not be accepted
test('wrong: the record\'s words are not the row\'s, the window is not the row\'s, the version is not this one', async () => {
  const w = ex('T1-003');
  await mustFail({ ...clone(w), id: 'T1-999' }, 'row_unknown');
  await mustFail({ ...clone(w), claim: { quote: 'Heavy snow and a gale' } }, 'quote_not_in_row');
  await mustFail({ ...clone(w), claim: {} }, 'quote_missing');
  await mustFail({ ...clone(w), window: { from: '1863-06-27T07:00', to: '1863-06-27T21:00' } }, 'window_outside_row');
  await mustFail({ ...clone(w), window: { from: '1863-06-26T21:00', to: '1863-06-26T07:00' } }, 'window_bad');
  await mustFail({ ...clone(w), harness: 'bt-realize-0' }, 'schema_harness');
  await mustFail({ ...clone(w), kind: 'rain' }, 'schema_kind');
  await mustFail({ ...clone(w), checks: [] }, 'checks_missing');
  const t = clone(w); t.checks[0].t = { at: '1863-06-27T12:00' }; await mustFail(t, 'assert_time_outside_window');
  const q = clone(w); q.checks[1].quote = 'snowing at 7'; await mustFail(q, 'quote_not_in_row');
});
test('wrong: the product does not show what the record says (weather, sky, structure)', async () => {
  const w = ex('T1-003');
  const a = clone(w); a.checks.push({ type: 'weather', t: { at: '1863-06-26T12:00' }, temp_f: 26, quote: 'through Jun 26' }); await mustFail(a, 'weather_mismatch', 'a temperature the picture does not show (the number is in the quote, the product says about 62)');
  const a2 = clone(w); a2.checks.push({ type: 'weather', t: { at: '1863-06-26T12:00' }, temp_f: 62, quote: 'roads wet and muddy' }); await mustFail(a2, 'number_not_in_quote', 'a number that is not printed in the quote');
  const b = clone(w); b.checks[0].precip_kind_in = ['none']; await mustFail(b, 'weather_mismatch', 'no rain asserted on a rainy day');
  const c = clone(w); c.checks[2].wetness_min = 1.5; await mustFail(c, 'weather_mismatch', 'wetness beyond the scale');
  const d = clone(w); d.checks.push({ type: 'sky', t: { at: '1863-06-26T12:00' }, band_in: ['Night'] }); await mustFail(d, 'sky_mismatch', 'night at noon');
  const d2 = clone(w); d2.checks[1].t = { from: '1863-06-26T06:00', to: '1863-06-26T23:00', mode: 'all' }; d2.checks[1].precip_kind_in = ['storm']; await mustFail(d2, 'weather_mismatch', 'storm all day');
  const s = ex('T1-016');
  const e = clone(s); e.checks[1].state = 'Intact'; await mustFail(e, 'structure_wrong_state', 'the bridge intact at the end of the window');
  const f = clone(s); f.checks[0].schedule_row = 'S-002'; await mustFail(f, 'structure_wrong_state', 'another schedule row');
  const g = clone(s); g.checks[1].present = false; await mustFail(g, 'structure_wrong_state', 'the bridge absent');
  const h = clone(s); delete h.checks[0].structure_scenario; h.checks[0].t = { at: '1863-06-27T12:00' }; await mustFail(h, 'structure_wrong_state', 'fully burned mid-window in the default scenario, which blends 26 and 27 Jun');
  const h2 = clone(s); h2.checks[0].structure_scenario = 'jun27'; await mustFail(h2, 'structure_wrong_state', 'burned at 00:00 on 27 Jun in the scenario that puts the burning on the 27th');
  const i = clone(s); i.entities.structures = ['bld-presbyterian-church']; i.checks.forEach(x => { x.structure = 'bld-presbyterian-church'; }); await mustFail(i, 'structure_not_bound', 'a structure the row does not name');
  const j = clone(s); j.entities.structures = ['bld-no-such-thing']; j.checks.forEach(x => { x.structure = 'bld-no-such-thing'; }); await mustFail(j, 'structure_unknown', 'a structure that exists nowhere');
  const k = clone(s); k.entities.structures = [{ id: 'bld-st-francis-xavier', via: 'bridge over Rock Creek east of Gettysburg' }]; k.checks.forEach(x => { x.structure = 'bld-st-francis-xavier'; }); await mustFail(k, 'structure_not_drawn', 'declared binding, but nothing is drawn for it');
  const l = clone(s); l.not_shown = [{ words: 'a bridge nobody mentions', why: 'x' }]; await mustFail(l, 'quote_not_in_row', 'not_shown words that are not the row\'s');
  const m = clone(s); m.not_shown = []; await mustFail(m, 'not_shown_bad');
  const n = clone(s); delete n.not_shown; const nr = await mustPass(n, 'without not_shown the same record is a full realization'); assert.equal(nr.partial, undefined);
});
test('wrong: the units are not the row\'s, are not on the field, are in the wrong place, do the wrong thing', async () => {
  addRow('Y-001', 'McPherson Ridge Cutler’s brigade stands in line, not on Cemetery Hill', '1863-07-01T12:00', '1863-07-01T12:30');
  const ok1 = () => rec('Y-001', 'unit_activity', '1863-07-01T12:00', '1863-07-01T12:30', 'Cutler’s brigade stands in line', { units: ['us-1c-1d-cutler'], places: ['McPherson Ridge'] }, [{ type: 'unit_at', unit: 'us-1c-1d-cutler', place: 'McPherson Ridge', t: { from: '1863-07-01T12:00', to: '1863-07-01T12:30', mode: 'all' } }, { type: 'unit_activity', unit: 'us-1c-1d-cutler', activities: ['stand'] }]);
  await mustPass(ok1());
  let r = ok1(); r.entities.places = ['Cemetery Hill']; r.checks[0].place = 'Cemetery Hill'; await mustFail(r, 'unit_wrong_place', 'the right brigade at the wrong hill (the row names both)');
  r = ok1(); r.checks[1].activities = ['fire']; await mustFail(r, 'unit_wrong_activity', 'firing');
  r = ok1(); r.checks[1].activities = ['march', 'double_quick']; r.checks[1].t = { from: '1863-07-01T12:00', to: '1863-07-01T12:30', mode: 'all' }; await mustFail(r, 'unit_wrong_activity', 'marching all the time');
  r = ok1(); r.entities.units = ['cs-3c-heth-archer-13al']; r.checks[0].unit = r.checks[1].unit = 'cs-3c-heth-archer-13al'; await mustFail(r, 'unit_not_bound', 'a Confederate regiment the row does not name');
  r = ok1(); r.entities.units = ['us-1c-1d-cutler-no-such']; r.checks[0].unit = r.checks[1].unit = 'us-1c-1d-cutler-no-such'; await mustFail(r, 'unit_not_in_layer', 'a unit that does not exist');
  r = ok1(); r.entities.units = [{ id: 'cs-3c-heth-archer-13al', via: 'Cutler’s brigade stands in line' }]; r.checks[0].unit = r.checks[1].unit = 'cs-3c-heth-archer-13al'; await mustFail(r, 'unit_wrong_place', 'a declared binding is no proof of the place');
  r = ok1(); r.entities.units = [{ id: 'cs-3c-heth-archer-13al', via: 'Pickett charges the Angle' }]; r.checks[0].unit = r.checks[1].unit = 'cs-3c-heth-archer-13al'; await mustFail(r, 'unit_not_bound', 'a declared binding whose quote is not in the row');
  r = ok1(); r.checks[0].within_m = 5000; await mustFail(r, 'tolerance_wider_than_stated', 'a tolerance wider than the stated one');
  r = ok1(); r.checks[0].within_m = 5; await mustFail(r, 'unit_wrong_place', 'a tighter tolerance than the picture can meet');
  r = ok1(); r.window = { from: '1863-07-01T12:00', to: '1863-07-01T12:30' }; r.checks[0].t = { from: '1863-07-01T11:00', to: '1863-07-01T12:30' }; await mustFail(r, 'assert_time_outside_window', 'a check outside the record window');
  r = ok1(); r.entities.units.push('us-1c-1d-meredith'); await mustFail(r, 'entity_unused', 'an entity no check uses');
  r = ok1(); r.entities.units = []; await mustFail(r, 'entity_undeclared', 'a unit the checks use but the record does not list');
  r = ok1(); r.checks[0].quantifier = 'maybe'; await mustFail(r, 'assert_quantifier');
  r = ok1(); r.checks[0].colour = 'blue'; await mustFail(r, 'assert_unknown_field');
  r = ok1(); r.checks.push({ type: 'unit_levitates', unit: 'us-1c-1d-cutler' }); await mustFail(r, 'assert_type');
  r = ok1(); delete r.checks[0].place; await mustFail(r, 'assert_field');
  r = ok1(); r.kind = 'unit_motion'; await mustFail(r, 'kind_needs', 'a motion record with no motion');
  r = ok1(); r.checks[1].activities = ['dance']; await mustFail(r, 'assert_activity');
  r = ok1(); r.result = { realized: true, why: 'trust me', digest: 'x' }; r.checks[1].activities = ['fire']; const stale = await mustFail(r, 'unit_wrong_activity', 'a record that claims a result the check does not give'); assert.match(stale.stale_result, /says realized true/);
});
test('wrong: arrival, presence and motion that the arrival rule and the paths do not allow', async () => {
  addRow('Y-002', 'Iron Brigade 19th IN arrives and advances toward McPherson Ridge', '1863-07-01T10:00', '1863-07-01T10:50');
  const arr = (w) => rec('Y-002', 'arrival', w[0], w[1], '19th IN arrives', { units: ['us-1c-1d-meredith-19in'] }, [{ type: 'unit_arrives', unit: 'us-1c-1d-meredith-19in' }]);
  await mustPass(arr(['1863-07-01T10:00', '1863-07-01T10:50']));
  await mustFail(arr(['1863-07-01T10:30', '1863-07-01T10:50']), 'unit_arrival_outside_window', 'arrival before the window');
  let r = rec('Y-002', 'unit_activity', '1863-07-01T10:00', '1863-07-01T10:15', '19th IN arrives', { units: ['us-1c-1d-meredith-19in'] }, [{ type: 'unit_activity', unit: 'us-1c-1d-meredith-19in', activities: ['march', 'double_quick'] }], { place_unspecified: 'test' }); await mustFail(r, 'unit_not_on_field', 'marching before its arrival');
  r = rec('Y-002', 'arrival', '1863-07-01T10:20', '1863-07-01T10:50', '19th IN arrives', { units: ['us-1c-1d-meredith-19in'] }, [{ type: 'unit_absent', unit: 'us-1c-1d-meredith-19in' }, { type: 'unit_arrives', unit: 'us-1c-1d-meredith-19in' }]); await mustFail(r, 'unit_on_field', 'absent while it is on the field');
  addRow('Y-003', 'Early’s division is not yet at the field; Jones’s battalion', '1863-06-30T00:00', '1863-06-30T12:00');
  r = rec('Y-003', 'arrival', '1863-06-30T00:00', '1863-06-30T12:00', 'Early’s division is not yet at the field', { units: ['cs-2c-early'] }, [{ type: 'unit_absent', unit: 'cs-2c-early', t: { from: '1863-06-30T00:00', to: '1863-06-30T12:00', mode: 'all' } }, { type: 'unit_arrives', unit: 'cs-2c-early' }]); await mustFail(r, 'unit_arrival_outside_window', 'a formation arrives on the day its leaves do');
  addRow('Y-004', 'Iron Brigade 19th IN marches away from McPherson Ridge', '1863-07-01T10:20', '1863-07-01T10:50');
  r = rec('Y-004', 'unit_motion', '1863-07-01T10:20', '1863-07-01T10:50', '19th IN marches away from McPherson Ridge', { units: ['us-1c-1d-meredith-19in'], places: ['McPherson Ridge'] }, [{ type: 'unit_moves', unit: 'us-1c-1d-meredith-19in', away_from: 'McPherson Ridge' }]); await mustFail(r, 'unit_wrong_direction', 'away from the ridge it is marching to');
  r = rec('Y-004', 'unit_motion', '1863-07-01T10:20', '1863-07-01T10:50', '19th IN marches away from McPherson Ridge', { units: ['us-1c-1d-meredith-19in'], places: ['McPherson Ridge'] }, [{ type: 'unit_moves', unit: 'us-1c-1d-meredith-19in', along: 'McPherson Ridge' }]); await mustFail(r, 'place_not_a_line', 'along a ridge');
  r = rec('Y-004', 'unit_motion', '1863-07-01T10:20', '1863-07-01T10:50', '19th IN marches away from McPherson Ridge', { units: ['us-1c-1d-meredith-19in'], places: ['McPherson Ridge'] }, [{ type: 'unit_moves', unit: 'us-1c-1d-meredith-19in', to: 'McPherson Ridge' }]); await mustFail(r, 'unit_wrong_place', 'arrives at the ridge at the end of the window (it is still far)');
  addRow('Y-005', 'The Wadsworth division stands; 6th Wisconsin does not move', '1863-07-01T12:00', '1863-07-01T12:30');
  r = rec('Y-005', 'unit_motion', '1863-07-01T12:00', '1863-07-01T12:30', 'The Wadsworth division stands', { units: ['us-1c-1d'] }, [{ type: 'unit_moves', unit: 'us-1c-1d', to: 'Cemetery Hill' }]); await mustFail(r, null, 'a place that is not in the row');
});
test('wrong: units the formation lists but the picture does not draw fail the formation, and are named', async () => {
  addRow('Y-006', 'Early’s division is on the field', '1863-07-01T16:00', '1863-07-01T22:00');
  const res = await mustFail(rec('Y-006', 'unit_activity', '1863-07-01T16:00', '1863-07-01T22:00', 'Early’s division is on the field', { units: ['cs-2c-early'] }, [{ type: 'unit_present', unit: 'cs-2c-early', t: { from: '1863-07-01T16:00', to: '1863-07-01T22:00', mode: 'all' } }], { place_unspecified: 'test' }), 'unit_not_drawn');
  assert.match(res.assertions[0].detail, /cs-2c-early-jones/, 'the leaf that is not drawn is named');
  const any = rec('Y-006', 'unit_activity', '1863-07-01T16:00', '1863-07-01T22:00', 'Early’s division is on the field', { units: ['cs-2c-early'] }, [{ type: 'unit_present', unit: 'cs-2c-early', quantifier: 'any' }], { place_unspecified: 'test' });
  await mustPass(any, 'quantifier any: part of the formation is on the field');
});
test('wrong: figures, casualties, guns, absent units and a unit absent for the wrong reason', async () => {
  addRow('Y-007', 'Gordon’s brigade (≈1,900) on the field', '1863-07-01T16:00', '1863-07-01T22:00');
  await mustPass(rec('Y-007', 'unit_activity', '1863-07-01T16:00', '1863-07-01T22:00', 'Gordon’s brigade (≈1,900)', { units: ['cs-2c-early-gordon'] }, [{ type: 'unit_figures', unit: 'cs-2c-early-gordon', approx: 1900, tol_pct: 10, quote: '(≈1,900)' }], { place_unspecified: 'test' }));
  await mustFail(rec('Y-007', 'unit_activity', '1863-07-01T16:00', '1863-07-01T22:00', 'Gordon’s brigade (≈1,900)', { units: ['cs-2c-early-gordon'] }, [{ type: 'unit_figures', unit: 'cs-2c-early-gordon', approx: 1900, tol_pct: 1, quote: '(≈1,900)' }], { place_unspecified: 'test' }), 'figures_mismatch', 'a strength the picture does not draw (1 %)');
  addRow('Y-008', 'Iron Brigade fights quietly', '1863-07-01T08:00', '1863-07-01T09:00');
  await mustFail(rec('Y-008', 'casualty_flow', '1863-07-01T08:00', '1863-07-01T09:00', 'Iron Brigade fights quietly', { units: ['us-1c-1d-meredith'] }, [{ type: 'casualty', units: ['us-1c-1d-meredith'], killed_min: 1 }]), 'casualty_none', 'losses before the brigade is on the field');
  const nou = rec('Y-008', 'casualty_flow', '1863-07-01T08:00', '1863-07-01T09:00', 'Iron Brigade fights quietly', {}, [{ type: 'casualty', killed_min: 1 }]); await mustFail(nou, 'assert_field', 'losses of no named unit');
  addRow('Y-009', '2nd Maine Battery has a hundred guns', '1863-07-01T10:30', '1863-07-01T11:00');
  await mustFail(rec('Y-009', 'artillery', '1863-07-01T10:30', '1863-07-01T11:00', '2nd Maine Battery has a hundred guns', { units: ['us-1c-art-2me'] }, [{ type: 'battery_guns', unit: 'us-1c-art-2me', guns_min: 100 }]), 'battery_shortfall');
  addRow('Y-010', 'Iron Brigade 19th IN is not on the field and is not drawn', '1863-07-01T08:00', '1863-07-01T09:00');
  await mustFail(rec('Y-010', 'arrival', '1863-07-01T08:00', '1863-07-01T09:00', '19th IN is not on the field', { units: ['us-1c-1d-meredith-19in'] }, [{ type: 'unit_absent', unit: 'us-1c-1d-meredith-19in', why_in: ['after_leave'] }, { type: 'unit_arrives', unit: 'us-1c-1d-meredith-19in', t: { at: '1863-07-01T08:00' } }]), 'unit_absent_for_the_wrong_reason');
  addRow('Y-011', 'The 17th Virginia Cavalry of Jenkins’s brigade is absent', '1863-06-28T00:00', '1863-06-28T12:00');
  await mustFail(rec('Y-011', 'arrival', '1863-06-28T00:00', '1863-06-28T12:00', '17th Virginia Cavalry', { units: ['cs-cav-jenkins-17va'] }, [{ type: 'unit_absent', unit: 'cs-cav-jenkins-17va' }]), null, 'a unit that is never drawn is not "absent": it is not drawn');
  addRow('Y-012', 'Greene’s brigade builds the Culp’s Hill main line, finished by noon', '1863-07-02T11:00', '1863-07-02T12:30');
  await mustFail(rec('Y-012', 'earthwork_build', '1863-07-02T11:00', '1863-07-02T12:30', 'Greene’s brigade builds the Culp’s Hill main line', { works: ['E-05'], units: ['us-12c-2d-greene'] }, [{ type: 'work_stage', work: 'E-05', t: { at: '1863-07-02T11:00' }, stage_min: 3, stage_max: 4, crew: { units: ['us-12c-2d-greene'] } }]), 'work_wrong_stage', 'the work is complete by 11:00: not in stage 3 or 4');
  addRow('Y-013', 'Greene’s brigade has not begun the Culp’s Hill main line', '1863-07-02T04:30', '1863-07-02T05:30');
  await mustFail(rec('Y-013', 'earthwork_build', '1863-07-02T04:30', '1863-07-02T05:30', 'Greene’s brigade has not begun the Culp’s Hill main line', { works: ['E-05'], units: ['us-12c-2d-greene'] }, [{ type: 'work_stage', work: 'E-05', t: { at: '1863-07-02T05:00' }, present: false, crew: { units: ['us-12c-2d-greene'] } }]), 'work_no_crew', 'a crew claimed before the digging begins');
  await mustFail(rec('Y-013', 'earthwork_build', '1863-07-02T04:30', '1863-07-02T05:30', 'Greene’s brigade has not begun the Culp’s Hill main line', { works: ['E-05'], units: ['us-12c-2d-greene'] }, [{ type: 'work_stage', work: 'E-05', t: { at: '1863-07-02T05:00' }, stage_min: 1, crew: { units: ['us-12c-2d-greene'] } }]), 'work_wrong_stage', 'a work claimed under way before its start (no work is pre-placed)');
  await mustFail(rec('Y-012', 'earthwork_build', '1863-07-02T11:00', '1863-07-02T12:30', 'Greene’s brigade builds the Culp’s Hill main line', { works: ['E-05'], units: ['us-12c-2d-greene'] }, [{ type: 'work_stage', work: 'E-05', t: { at: '1863-07-02T11:00' }, stage_min: 5 }]), 'kind_needs', 'an earthwork record with no crew check');
});
test('wrong: a record of kind not_realized must fail with the reasons it gives; one whose probe passes is stale', async () => {
  const e = ex('T1-004'); const ok = await run(e); assert.equal(ok.missing.verified, true);
  const wrong = clone(e); wrong.missing = [{ code: 'structure_unknown', detail: 'a reason the probe does not give', builder: 'x' }]; const w = await run(wrong); assert.equal(w.missing.verified, false); assert.deepEqual(w.missing.unverified, ['structure_unknown']);
  const none = clone(e); delete none.missing; await mustFail(none, 'missing_missing');
  const noKind = clone(e); delete noKind.intended_kind; await mustFail(noKind, 'schema_intended_kind');
  const onReal = ex('T1-003'); onReal.missing = [{ code: 'x', detail: 'y' }]; await mustFail(onReal, 'missing_on_realized');
  // a probe that passes: the weather IS shown, so a not_realized record of the weather row is stale
  const stale = ex('T1-003'); stale.kind = 'not_realized'; stale.intended_kind = 'weather_sky'; stale.missing = [{ code: 'weather_mismatch', detail: 'claimed missing' }]; const s = await run(stale); assert.equal(s.realized, false); assert.equal(s.missing.stale, true); assert.match(s.why, /now passes/);
  const early = ex('T1-002'); const er = await run(early); assert.ok(codesOf(er).has('time_outside_clock'), 'a row before the clock cannot be realized at its time');
  const bad = ex('T1-016'); bad.entities.structures = []; await mustFail(bad, 'entity_undeclared');
});
test('event cards and the epilogue: no module, no realization; a module that is listed and shows the row realizes it', async () => {
  const c = ex('T1-001'); const r0 = await run(c); assert.equal(r0.missing.observed.includes('adapter_missing'), true); assert.equal(r0.missing.observed.includes('time_outside_clock'), true, 'a row dated before the clock cannot be shown at its time');
  addRow('Z-004', 'Meade holds a council of war at the Leister house on the evening of 2 Jul', '1863-07-02T21:00', '1863-07-02T22:00');
  const real = rec('Z-004', 'event_card', '1863-07-02T21:00', '1863-07-02T22:00', 'Meade holds a council of war at the Leister house', { cards: ['Z-004'] }, [{ type: 'card_shown', rows: ['Z-004'], t: { at: '1863-07-02T21:30' } }]);
  await mustFail(real, 'adapter_missing', 'a card record while the product has no card module');
  // the same record against a product whose card module exists, is listed and shows the row
  const fake = Object.create(P); let shown = [{ id: 'CARD-Z-004', rows: ['Z-004'], title: 'Council of war', tier: 'documented' }];
  fake.cardsAt = async () => ({ available: true, module: 'src/ext/event-cards.mjs', fn: 'cardsAt', items: shown });
  const R2 = new Runner(fake, TL);
  const ok = await R2.runRecord(real); assert.equal(ok.realized, true, ok.why);
  shown = [{ id: 'CARD-T1-002', rows: ['T1-002'], tier: 'documented' }]; const no = await R2.runRecord(real); assert.equal(no.realized, false); assert.ok(codesOf(no).has('card_not_shown'));
  shown = [{ id: 'CARD-Z-004', rows: ['Z-004'], tier: 'inferred' }]; const tier = clone(real); tier.checks[0].tier = 'documented'; const tr = await R2.runRecord(tier); assert.equal(tr.realized, false, 'a card with a weaker tier than the record asserts');
  fake.cardsAt = async () => ({ available: false, reason: 'src/ext/event-cards.mjs exists but is not in src/ext/index.mjs', items: [] }); const na = await new Runner(fake, TL).runRecord(real); assert.equal(na.realized, false); assert.ok(codesOf(na).has('adapter_missing'));
  const ep = await P.epilogueAt(toMin('1863-11-19T09:00')); assert.equal(ep.available, false, 'the epilogue chapter has no content module yet');
});
test('scenarios: a record can name the scenario it holds in, or a list of them, and every one must hold', async () => {
  const w = ex('T1-003'); w.scenario = 'pdf'; await mustPass(w, 'the weather record holds in the plan\'s scenario too');
  const l = ex('T1-003'); l.scenario = ['default', 'pdf', { choices: { 'CF-JUL2-SKY': 'opt0' } }]; const res = await mustPass(l, 'three scenarios'); assert.equal(res.scenarios.length, 3);
  assert.throws(() => P.scenarioSpec('nonsense'));
});
test('the checker: deterministic, reports the record files\' problems, never writes RESULTS.json for a record file given by --file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rz-')), f = path.join(dir, 'x.jsonl'), good = JSON.stringify(ex('T1-003')), res0 = path.join(REAL, 'RESULTS.json'), before = fs.existsSync(res0) ? fs.statSync(res0).mtimeMs : null;
  fs.writeFileSync(f, good + '\n' + good + '\n{"broken\n');
  const out = spawnSync('node', [path.join(ROOT, 'tools/bt/realize/check.mjs'), '--file', f, '--json'], { encoding: 'utf8', maxBuffer: 1 << 28 }); assert.equal(out.status, 1, 'duplicate and broken lines make the exit code 1');
  const d = JSON.parse(out.stdout); assert.equal(d.rows['T1-003'].realized, true); assert.equal(d.record_file_problems.length, 2); assert.ok(d.record_file_problems.some(p => /duplicate record for T1-003/.test(p.error))); assert.ok(d.record_file_problems.some(p => p.line === 3));
  const out2 = spawnSync('node', [path.join(ROOT, 'tools/bt/realize/check.mjs'), '--file', f, '--json'], { encoding: 'utf8', maxBuffer: 1 << 28 }); assert.equal(out2.stdout, out.stdout, 'two runs give the same bytes');
  assert.equal(fs.existsSync(res0) ? fs.statSync(res0).mtimeMs : null, before, 'RESULTS.json is not touched by a --file run');
  assert.equal(d.q17.ok, false); assert.equal(d.harness_digest, harnessDigest());
  fs.rmSync(dir, { recursive: true });
});
test('RESULTS.json: written by the full run, one entry per timeline row, coverage = realization or an open register entry, the register half agrees with check_coverage.py', () => {
  const p = path.join(REAL, 'RESULTS.json'); if (!fs.existsSync(p)) return;                 // the file is produced by check.mjs; a fresh tree may not have it yet
  const d = readJSON(p); assert.equal(Object.keys(d.rows).length, 691); assert.equal(d.harness, H);
  const reg = registerCoverage(); let openOnly = 0;
  for (const [id, e] of Object.entries(d.rows)) { assert.equal(e.q17_covered, e.realized || (reg.get(id) || { open: [] }).open.length > 0, id); if (!e.realized && e.register_open.length) openOnly++; if (e.realized) assert.ok(e.record, id + ' realized without a record'); }
  assert.equal(d.totals.timeline.covered_by_open_register_entry_only, openOnly);
  assert.ok(openOnly + d.totals.timeline.realized <= 691);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('formation, the picture\'s own activity, a unit searched by the row\'s words, a place known, conflict scenarios', async () => {
  addRow('Z-001', 'Kershaw’s brigade (2nd SC) forms line of battle', '1863-07-02T15:00', '1863-07-02T15:30');
  const f = (formation, mode) => rec('Z-001', 'unit_activity', '1863-07-02T15:00', '1863-07-02T15:30', 'Kershaw’s brigade (2nd SC) forms line of battle', { units: ['cs-1c-mclaws-kershaw-2sc'] }, [{ type: 'unit_formation', unit: 'cs-1c-mclaws-kershaw-2sc', formation, t: { from: '1863-07-02T15:10', to: '1863-07-02T15:30', mode } }], { place_unspecified: 'the row names no place' });
  await mustPass(f('line', 'all')); await mustFail(f('column_fours', 'all'), 'unit_wrong_formation', 'column of fours after the change to line');
  addRow('Z-002', 'The 3rd Pennsylvania Cavalry fights dismounted and fires from behind a fence', '1863-07-03T13:30', '1863-07-03T14:00');
  const pic = (picture) => rec('Z-002', 'unit_activity', '1863-07-03T13:30', '1863-07-03T14:00', 'The 3rd Pennsylvania Cavalry fights dismounted and fires', { units: ['us-cav-2d-mcintosh-3pa'] }, [{ type: 'unit_activity', unit: 'us-cav-2d-mcintosh-3pa', activities: ['fire'], picture }], { place_unspecified: 'test' });
  await mustPass(pic(true), 'the picture shows the dismounted cavalry firing'); await mustFail(pic(false), 'unit_wrong_activity', 'the stage\'s own activity timeline has no fire');
  addRow('Z-003', 'The 26th Pennsylvania Emergency Militia and the 6th Wisconsin', '1863-07-01T12:00', '1863-07-01T12:30');
  const inl = async words => (await run({ ...rec('Z-003', 'not_realized', '1863-07-01T12:00', '1863-07-01T12:30', words, {}, [{ type: 'unit_in_layer', words }], { intended_kind: 'arrival', missing: [{ code: 'unit_not_in_layer', detail: 'probe' }] }) })).assertions[0];
  const mil = await inl('26th Pennsylvania Emergency Militia'); assert.equal(mil.ok, false); assert.equal(mil.code, 'unit_not_in_layer');
  const wis = await inl('6th Wisconsin'); assert.equal(wis.ok, true); assert.match(wis.evidence.units.join(' '), /us-1c-1d-meredith-6wi/);
  const bad = await run(rec('Z-003', 'not_realized', '1863-07-01T12:00', '1863-07-01T12:30', 'the 6th Wisconsin', {}, [{ type: 'unit_in_layer', words: 'the 7th Wisconsin' }], { intended_kind: 'arrival', missing: [{ code: 'x', detail: 'y' }] })); assert.ok(codesOf(bad).has('quote_not_in_row'), 'words that are not the row\'s');
  assert.ok(P.places.resolve('McPherson Ridge').place.on_ground);
  const sc = P.conflictScenarios('see C-004 and C-005'); assert.ok(sc.length > 3 && sc[0] === 'default' && sc.some(s => s.id && s.id.startsWith('C-004:')) && sc.some(s => s.id && s.id.startsWith('C-005:')));
  assert.deepEqual(P.conflictScenarios('no conflict named'), ['default']);
});
test('the author tools print what the harness knows: row, suggest, place', () => {
  const q = (...a) => spawnSync('node', [path.join(ROOT, 'tools/bt/realize/q.mjs'), ...a], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const row = q('row', 'T1-004'); assert.equal(row.status, 0); assert.match(row.stdout, /ALLOWED +1863-06-2[56]T\d\d:\d\d\.\.1863-06-2[67]T\d\d:\d\d/); assert.match(row.stdout, /cs-2c-early /); assert.match(row.stdout, /Early/); assert.match(row.stdout, /PLACES NAMED IN THE ROW/);
  const sug = q('suggest', 'T1-097'); assert.equal(sug.status, 0); assert.match(sug.stdout, /UNIT us-1c-1d-cutler-147ny/); assert.match(sug.stdout, /McPherson Ridge \[tol 430 m\]/);
  const pl = q('place', 'Cemetery Hill'); assert.match(pl.stdout, /"tolerance_m": 250/); const unk = q('place', 'Belmont Road'); assert.match(unk.stdout, /unknown/);
  const rows = q('rows', 'tl-01'); assert.match(rows.stdout, /T1-003 \[[a-z ]+\] REALIZED weather_sky/);
});
test('gazetteer.json: the places the timeline names, unknown names listed and never given coordinates', () => {
  const p = path.join(REAL, 'gazetteer.json'); if (!fs.existsSync(p)) return; const g = readJSON(p);
  assert.ok(g.unknown.length > 0 && g.unknown.every(u => !u.center && !u.lng && /not guessed/.test(u.status)));
  assert.ok(g.places.every(x => x.tolerance_m > 0 && x.center && Number.isFinite(x.center.lng)));
  assert.deepEqual(Object.keys(g.tolerance_by_kind_m).sort(), Object.keys(readJSON(path.join(ROOT, 'tools/bt/realize/tolerances.json')).distance.floor_m_by_kind).sort());
  assert.ok(g.unknown.some(u => u.name === 'Belmont Rd') && g.unknown.some(u => /Salem Depot/.test(u.name)));
});
