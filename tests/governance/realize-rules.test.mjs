// The rules of the realization harness, one WRONG record (or wrong input) per rule, each a mutation of something that passes: a failure names the rule that let a wrong record through. Node only.
//   node --test tests/governance/realize-rules.test.mjs
// tools/bt/realize/mutate.mjs removes or changes each rule in a scratch copy of the harness and runs these tests (and realize.test.mjs): a rule whose removal leaves every test green is not tested.
import test from 'node:test'; import assert from 'node:assert/strict';
import { P, TL, R, rec, addRow, run, ex, clone, codesOf, mustFail, mustPass } from './realize-lib.mjs';
import { validateRecord, KINDS, KIND_NEEDS, ASSERT } from '../../tools/bt/realize/schema.mjs';
import { hasQuote, fold, toMin, isoOf, designators, wordInfo } from '../../tools/bt/realize/lib.mjs';
import { coverageOf, summarize, q17Of } from '../../tools/bt/realize/check.mjs';

const A = (id, text, from, to, timeCell) => addRow(id, text, from, to, timeCell);
const whole = (from, to) => ({ from, to, mode: 'all' });

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('rule: a quote is found only by whole words, apostrophes and quotation marks folded (lib.mjs hasQuote)', () => {
  assert.equal(hasQuote('Meade’s HQ on the Hanover Road', 'over Road'), false, '"over" is the end of "Hanover", not a word');
  assert.equal(hasQuote('Meade’s HQ on the Hanover Road', 'Hanover Road'), true);
  assert.equal(hasQuote('Meade’s HQ on the Hanover Road', 'Hanover Roa'), false, 'a quote ends on a word boundary');
  assert.equal(hasQuote('Meade’s HQ on the Hanover Road', 'anover Road'), false, 'and starts on one');
  assert.equal(hasQuote('Cutler’s brigade stands in line', "Cutler's brigade"), true, 'any apostrophe form folds');
  assert.equal(hasQuote('Cutler’s brigade stands in line', 'Cutlers brigade'), true, 'a lost apostrophe folds');
  assert.equal(hasQuote('rain "most of the day"', 'rain most of the day'), true, 'quotation marks fold');
  assert.equal(hasQuote('rain most of the day', ''), false, 'an empty quote is not found');
  assert.equal(hasQuote('rain most of the day', 'ra'), false, 'a quote shorter than 3 characters is not found');
  assert.equal(fold('Early’s  Division |  (Ewell’s II Corps)'), 'earlys division (ewells ii corps)');
  assert.equal(hasQuote('Camp west of Cashtown to | Cashtown Pike', 'Cashtown to Cashtown Pike'), true, 'a quote may cross the cells the table wrapped');
});
test('rule: a record\'s quote must be found in the row, by words (schema.mjs quote_not_in_row)', async () => {
  A('Q-001', 'Meade holds a council on the Hanover Road', '1863-07-02T22:30', '1863-07-02T23:30', 'Jul 2 evening');
  const base = () => rec('Q-001', 'weather_sky', '1863-07-02T22:30', '1863-07-02T23:30', 'Meade holds a council', {}, [{ type: 'sky', t: { at: '1863-07-02T23:00' }, band_in: ['Night'], exposure_min: 0.3 }], { place_unspecified: 'x' });
  await mustPass(base());
  const q = base(); q.claim = { quote: 'over Road' }; await mustFail(q, 'quote_not_in_row', 'a quote that starts inside a word');
  const q2 = base(); q2.claim = { quote: 'council on the Hanover Roa' }; await mustFail(q2, 'quote_not_in_row', 'a quote that ends inside a word');
  const q3 = base(); q3.checks[0].quote = 'council of war'; await mustFail(q3, 'quote_not_in_row', 'a check\'s own quote');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('rule: a NIGHT row needs a sky assertion with exposure_min (gate Q10: night is night, never black; schema.mjs)', async () => {
  A('N-001', 'Early’s division bivouacs in the rain on the night of Jun 26', '1863-06-26T21:00', '1863-06-26T23:00', 'Jun 26 NIGHT');
  const sky = { type: 'sky', t: { at: '1863-06-26T22:00' }, band_in: ['Night'], exposure_min: 0.34 }, wx = { type: 'weather', t: { at: '1863-06-26T22:00' }, record: true, quote: 'in the rain' };
  const night = checks => rec('N-001', 'weather_sky', '1863-06-26T21:00', '1863-06-26T23:00', 'bivouacs in the rain on the night of Jun 26', {}, checks);
  await mustPass(night([wx, sky]), 'a NIGHT row with its exposure assertion');
  await mustFail(night([wx]), 'kind_needs', 'a NIGHT row with a weather assertion and no sky assertion');
  await mustFail(night([wx, { type: 'sky', t: { at: '1863-06-26T22:00' }, band_in: ['Night'] }]), 'kind_needs', 'a sky assertion without exposure_min is not the night floor');
  await mustFail(night([wx, { ...sky, exposure_min: 0.99 }]), 'sky_mismatch', 'a night brighter than the sky draws it');
  A('N-002', 'Early’s division bivouacs in the rain on the evening of Jun 26', '1863-06-26T21:00', '1863-06-26T23:00', 'Jun 26 evening');
  const day = rec('N-002', 'weather_sky', '1863-06-26T21:00', '1863-06-26T23:00', 'bivouacs in the rain', {}, [wx]); await mustPass(day, 'a row that is not NIGHT needs no exposure assertion');
});
test('rule: every kind needs the assertion that can prove it (schema.mjs KIND_NEEDS), and every needed type is a known assertion type', async () => {
  for (const k of KINDS) if (k !== 'not_realized') assert.ok(KIND_NEEDS[k] && KIND_NEEDS[k].length, `${k} has no KIND_NEEDS`);
  assert.deepEqual(Object.keys(KIND_NEEDS).sort(), [...KINDS].sort(), 'KIND_NEEDS has exactly the kinds');
  for (const [k, groups] of Object.entries(KIND_NEEDS)) for (const g of groups) for (const t of g) assert.ok(ASSERT[t], `KIND_NEEDS of ${k} names the unknown assertion type ${t}`);
  A('K-001', 'Cutler’s brigade stands at McPherson Ridge; Greene’s brigade builds the Culp’s Hill main line; 2nd Maine Battery fires; Iron Brigade 19th IN arrives; the Wade house is struck; the cards show it', '1863-07-01T12:00', '1863-07-01T12:30');
  const irrelevant = [{ type: 'place_known', place: 'McPherson Ridge' }], ents = { places: ['McPherson Ridge'] };
  for (const k of KINDS.filter(k => k !== 'not_realized')) {
    const r = rec('K-001', k, '1863-07-01T12:00', '1863-07-01T12:30', 'Cutler’s brigade stands', ents, clone(irrelevant), { place_unspecified: 'x' });
    const res = await run(r); assert.equal(res.realized, false, k); assert.ok(codesOf(res).has('kind_needs'), `${k}: a record whose only assertion cannot prove the kind must say kind_needs (got ${[...codesOf(res)].join(', ')})`);
  }
  const mot = rec('K-001', 'unit_motion', '1863-07-01T12:00', '1863-07-01T12:30', 'Cutler’s brigade stands', { units: ['us-1c-1d-cutler'] }, [{ type: 'unit_moves', unit: 'us-1c-1d-cutler', min_minutes: 0 }]); await mustFail(mot, 'assert_field', 'unit_moves with no place relation');
  const act = rec('K-001', 'unit_activity', '1863-07-01T12:00', '1863-07-01T12:30', 'Cutler’s brigade stands', { units: ['us-1c-1d-cutler'] }, [{ type: 'unit_activity', unit: 'us-1c-1d-cutler', activities: ['stand'] }]); await mustFail(act, 'kind_needs', 'an activity with no place and no place_unspecified');
  act.place_unspecified = 'the row names no place'; await mustPass(act, 'an activity that says why it has no place');
});
test('rule: a theatre-clock window, a window inside the row, an assertion time inside the record window (schema.mjs)', async () => {
  A('W-001', 'Early’s division is encamped', '1863-06-24T00:00', '1863-06-24T12:00');
  const base = (from, to) => rec('W-001', 'unit_activity', from, to, 'Early’s division is encamped', { units: ['cs-2c-early'] }, [{ type: 'unit_present', unit: 'cs-2c-early' }], { place_unspecified: 'x' });
  await mustFail(base('1863-06-24T01:00', '1863-06-24T02:00'), 'time_outside_clock', 'a window before the theatre clock starts (26 Jun)');
  A('W-002', 'Cutler’s brigade stands', '1863-07-01T12:00', '1863-07-01T12:30');
  const b2 = () => rec('W-002', 'unit_activity', '1863-07-01T12:00', '1863-07-01T12:30', 'Cutler’s brigade stands', { units: ['us-1c-1d-cutler'] }, [{ type: 'unit_present', unit: 'us-1c-1d-cutler', t: { at: '1863-07-01T12:10' } }], { place_unspecified: 'x' });
  await mustPass(b2());
  const w1 = b2(); w1.window = { from: '1863-07-01T11:59', to: '1863-07-01T12:30' }; w1.checks[0].t = { at: '1863-07-01T12:10' }; await mustFail(w1, 'window_outside_row', 'one minute before the row\'s window');
  const w2 = b2(); w2.window = { from: '1863-07-01T12:00', to: '1863-07-01T12:31' }; await mustFail(w2, 'window_outside_row', 'one minute after the row\'s window');
  const w3 = b2(); w3.checks[0].t = { at: '1863-07-01T12:31' }; await mustFail(w3, 'assert_time_outside_window', 'an assertion after the record window');
  const w4 = b2(); delete w4.window; await mustFail(w4, 'window_missing');
  const w5 = b2(); w5.window = { from: '1863-13-40T25:00', to: '1863-07-01T12:30' }; await mustFail(w5, 'window_bad');
});
test('rule: the numbers of an assertion are the row\'s own (number_not_in_quote), and a record lists the entities it uses, no more and no less', async () => {
  A('F-001', 'Gordon’s brigade (about 1,900) on the field', '1863-07-01T16:00', '1863-07-01T22:00');
  const f = (approx, quote) => rec('F-001', 'unit_activity', '1863-07-01T16:00', '1863-07-01T22:00', 'Gordon’s brigade', { units: ['cs-2c-early-gordon'] }, [{ type: 'unit_figures', unit: 'cs-2c-early-gordon', approx, tol_pct: 10, ...(quote ? { quote } : {}) }], { place_unspecified: 'x' });
  await mustPass(f(1900, 'about 1,900'));
  await mustFail(f(1900, 'Gordon’s brigade'), 'number_not_in_quote', 'a strength that is not in the quote');
  await mustFail(f(1900), 'number_not_in_quote', 'a strength with no quote at all');
  const e = f(1900, 'about 1,900'); e.entities.foo = []; await mustFail(e, 'entities_unknown', 'an entity list nobody knows');
  const m = f(1900, 'about 1,900'); delete m.entities; await mustFail(m, 'entities_missing');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('rule: motion (unit_moves): displacement, minutes, closing, start, line (checks.mjs _moves)', async () => {
  A('M-001', 'Iron Brigade 19th Indiana advances toward McPherson Ridge along the Emmitsburg Road', '1863-07-01T10:20', '1863-07-01T10:50');
  const U = 'us-1c-1d-meredith-19in', mv = extra => rec('M-001', 'unit_motion', '1863-07-01T10:20', '1863-07-01T10:50', '19th Indiana advances toward McPherson Ridge', { units: [U], places: ['McPherson Ridge'] }, [{ type: 'unit_moves', unit: U, toward: 'McPherson Ridge', ...extra }]);
  await mustPass(mv({}), 'the baseline: marching toward the ridge');
  await mustPass(mv({ min_displacement_m: 1000, min_minutes: 20, min_closing_m: 1000 }), 'a real march covers a kilometre in 30 minutes');
  await mustFail(mv({ min_displacement_m: 100000 }), 'unit_not_moving', 'a displacement no march reaches');
  await mustFail(mv({ min_minutes: 99 }), 'unit_not_moving', 'more marching minutes than the window has');
  await mustFail(mv({ min_closing_m: 100000 }), 'unit_wrong_direction', 'closing on the place by more than the march covers');
  const one = mv({}); one.checks[0].t = { at: '1863-07-01T10:30' }; await mustFail(one, 'unit_not_moving', 'one minute is no displacement: the default minimum is 10 m');
  const two = mv({}); two.checks[0].t = { from: '1863-07-01T10:30', to: '1863-07-01T10:31' }; await mustPass(two, 'two minutes are about 60 m, over the default minimum of 10 m');
  const far = mv({}); far.entities.places = ['McPherson Ridge', 'Cemetery Hill']; far.checks[0].from = 'Cemetery Hill'; await mustFail(far, 'unit_wrong_place', 'a march that starts at a place it does not start at (and a place the row does not name)');
  const frm = mv({}); frm.checks[0].from = 'McPherson Ridge'; await mustFail(frm, 'unit_wrong_place', 'starting at the ridge it is marching to');
  const road = mv({}); road.entities.places = ['McPherson Ridge', 'Chambersburg Pike']; road.checks[0].along = 'Chambersburg Pike'; A('M-001', 'Iron Brigade 19th Indiana advances toward McPherson Ridge along the Chambersburg Pike', '1863-07-01T10:20', '1863-07-01T10:50'); await mustFail(road, 'unit_off_road', 'marching along a road it is not on');
  const away = mv({}); delete away.checks[0].toward; away.checks[0].away_from = 'McPherson Ridge'; await mustFail(away, 'unit_wrong_direction', 'away from the ridge it closes on');
  const mode = mv({}); mode.checks[0].t = { from: '1863-07-01T10:00', to: '1863-07-01T10:50', mode: 'all' }; A('M-002', 'Iron Brigade 19th Indiana advances toward McPherson Ridge', '1863-07-01T10:00', '1863-07-01T10:50'); mode.id = 'M-002'; mode.window = { from: '1863-07-01T10:00', to: '1863-07-01T10:50' }; await mustFail(mode, 'unit_not_on_field', 'mode all: not on the field before its arrival');
});
test('rule: position (unit_at), activity minutes, arrival place, absence (checks.mjs)', async () => {
  A('P-001', 'McPherson Ridge Cutler’s brigade stands in line; Iron Brigade 19th IN arrives', '1863-07-01T10:00', '1863-07-01T12:30');
  const C = 'us-1c-1d-cutler';
  const at = (t, extra = {}) => rec('P-001', 'unit_activity', '1863-07-01T10:00', '1863-07-01T12:30', 'Cutler’s brigade stands in line', { units: [C], places: ['McPherson Ridge'] }, [{ type: 'unit_present', unit: C }, { type: 'unit_at', unit: C, place: 'McPherson Ridge', t, ...extra }]);
  await mustPass(at(whole('1863-07-01T12:00', '1863-07-01T12:30')));
  await mustFail(at(whole('1863-07-01T11:00', '1863-07-01T12:30')), 'unit_wrong_place', 'mode all: the brigade is elsewhere in part of the window');
  await mustPass(at({ from: '1863-07-01T11:00', to: '1863-07-01T12:30' }), 'mode any: it is there at some minute');
  const act = (extra) => rec('P-001', 'unit_activity', '1863-07-01T12:00', '1863-07-01T12:30', 'Cutler’s brigade stands in line', { units: [C] }, [{ type: 'unit_activity', unit: C, activities: ['stand'], ...extra }], { place_unspecified: 'x' });
  await mustPass(act({ min_minutes: 30 }));
  await mustFail(act({ min_minutes: 400 }), 'unit_wrong_activity', 'more minutes of an activity than the window has');
  const arr = (extra) => rec('P-001', 'arrival', '1863-07-01T10:00', '1863-07-01T10:50', '19th IN arrives', { units: ['us-1c-1d-meredith-19in'], ...(extra.at_place ? { places: [extra.at_place] } : {}) }, [{ type: 'unit_arrives', unit: 'us-1c-1d-meredith-19in', ...extra }]);
  await mustPass(arr({}));
  await mustFail(arr({ at_place: 'McPherson Ridge' }), 'unit_wrong_place', 'a unit that enters 6 km from the ridge');
  const absent = (t, extra = {}) => rec('P-001', 'arrival', '1863-07-01T10:00', '1863-07-01T10:50', '19th IN arrives', { units: ['us-1c-1d-meredith-19in'] }, [{ type: 'unit_absent', unit: 'us-1c-1d-meredith-19in', t, ...extra }]);
  await mustPass(absent(whole('1863-07-01T10:00', '1863-07-01T10:19')), 'absent before its arrival (10:20)');
  await mustFail(absent(whole('1863-07-01T10:00', '1863-07-01T10:20')), 'unit_on_field', 'present at the minute of its arrival');
  await mustFail(absent(whole('1863-07-01T10:00', '1863-07-01T10:19'), { why_in: ['after_leave'] }), 'unit_absent_for_the_wrong_reason');
});
test('rule: guns, formation, losses (checks.mjs)', async () => {
  A('G-001', '2nd Maine Battery six guns open on McPherson Ridge; Iron Brigade suffers heavy losses', '1863-07-01T10:30', '1863-07-01T12:00');
  const g = extra => rec('G-001', 'artillery', '1863-07-01T10:30', '1863-07-01T12:00', '2nd Maine Battery six guns', { units: ['us-1c-art-2me'] }, [{ type: 'battery_guns', unit: 'us-1c-art-2me', ...extra }]);
  await mustPass(g({ guns_min: 4, limbers_min: 4, caissons_min: 4 }));
  await mustFail(g({ limbers_min: 1000 }), 'battery_shortfall', 'more limbers than the battery draws');
  await mustFail(g({ caissons_min: 1000 }), 'battery_shortfall', 'more caissons than the battery draws');
  await mustFail(g({ horses_min: 100000 }), 'battery_shortfall', 'more horses than the battery draws');
  const notBattery = g({ guns_min: 1 }); notBattery.entities.units = ['us-1c-1d-cutler']; notBattery.checks[0].unit = 'us-1c-1d-cutler'; await mustFail(notBattery, null, 'a brigade is not a battery');
  const c = extra => rec('G-001', 'casualty_flow', '1863-07-01T10:30', '1863-07-01T12:00', 'Iron Brigade suffers heavy losses', { units: ['us-1c-1d-meredith'] }, [{ type: 'casualty', units: ['us-1c-1d-meredith'], ...extra }]);
  await mustPass(c({ killed_min: 1, wounded_min: 1, missing_min: 1, events_min: 10 }));
  await mustFail(c({ wounded_min: 100000 }), 'casualty_none', 'more wounded than the picture draws');
  await mustFail(c({ missing_min: 100000 }), 'casualty_none', 'more missing than the picture draws');
  await mustFail(c({ events_min: 100000 }), 'casualty_none', 'more events than the picture draws');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('rule: the weather and the sky are what the weather pass draws (checks.mjs _weatherProblem, _skyProblem)', async () => {
  A('E-001', 'Rain on Jun 26: cloudy, roads wet and muddy, temperature 62 F at noon', '1863-06-26T06:00', '1863-06-26T23:00');
  const wx = extra => rec('E-001', 'weather_sky', '1863-06-26T06:00', '1863-06-26T23:00', 'roads wet and muddy', {}, [{ type: 'weather', t: { at: '1863-06-26T12:00' }, ...extra }]);
  await mustPass(wx({ precip_kind_in: ['rain'], precip_intensity_min: 0.1, precip_intensity_max: 1, cloud_min: 0.5, cloud_max: 1, wetness_min: 0.9, wetness_max: 1, visibility_m_max: 5000, wind_mph_min: 1, wind_mph_max: 10, record: true }));
  await mustPass(wx({ temp_f: 62, quote: 'temperature 62 F at noon' }), 'the temperature the row prints, within the 1 F tolerance');
  await mustFail(wx({ temp_f: 64, quote: 'temperature 64 F' }), 'quote_not_in_row', 'a number not in the row');
  A('E-001', 'Rain on Jun 26: cloudy, roads wet and muddy, temperature 70 F at noon', '1863-06-26T06:00', '1863-06-26T23:00');
  await mustFail(wx({ temp_f: 70, quote: 'temperature 70 F at noon' }), 'weather_mismatch', 'a temperature 8 F off');
  await mustPass(wx({ temp_f: 70, tol_f: 9, quote: 'temperature 70 F at noon' }), 'a tolerance given by the record');
  await mustFail(wx({ precip_intensity_min: 5 }), 'weather_mismatch', 'heavier rain than drawn');
  await mustFail(wx({ precip_intensity_max: 0.01 }), 'weather_mismatch', 'lighter rain than drawn');
  await mustFail(wx({ cloud_max: 0.1 }), 'weather_mismatch', 'a clear sky on a cloudy day');
  await mustFail(wx({ cloud_min: 0.99 }), 'weather_mismatch', 'a full overcast');
  await mustFail(wx({ wetness_max: 0.1 }), 'weather_mismatch', 'dry ground');
  await mustFail(wx({ visibility_m_max: 10 }), 'weather_mismatch', 'fog');
  await mustFail(wx({ wind_mph_min: 80 }), 'weather_mismatch', 'a gale');
  await mustFail(wx({ wind_mph_max: 0.1 }), 'weather_mismatch', 'a calm');
  await mustFail(wx({ record: false }), 'weather_mismatch', 'no weather record on a day that has one');
  const sky = extra => rec('E-001', 'weather_sky', '1863-06-26T06:00', '1863-06-26T23:00', 'cloudy', {}, [{ type: 'sky', t: { at: '1863-06-26T12:00' }, ...extra }]);
  await mustPass(sky({ sun_alt_min: 60, sun_alt_max: 90, band_in: ['Day'], exposure_min: 0.5 }));
  await mustFail(sky({ sun_alt_max: 10 }), 'sky_mismatch', 'a low sun at noon');
  await mustFail(sky({ sun_alt_min: 89 }), 'sky_mismatch', 'a sun at the zenith');
  await mustFail(sky({ band_in: ['Civil twilight', 'Night'] }), 'sky_mismatch', 'twilight at noon');
  await mustFail(sky({ moon_up: true }), 'sky_mismatch', 'a moon that is down');
  await mustFail(sky({ moon_illum_max: 1 }), 'sky_mismatch', 'a moon of less than 1 %');
  await mustFail(sky({ moon_illum_min: 99.9 }), 'sky_mismatch', 'a full moon that is not');
  const allDay = wx({ precip_kind_in: ['rain'] }); allDay.checks[0].t = { from: '1863-06-26T06:00', to: '1863-06-26T23:00', mode: 'all' }; await mustPass(allDay, 'rain at every minute of 26 Jun');
  allDay.checks[0].t = { from: '1863-06-26T06:00', to: '1863-06-27T12:00', mode: 'all' }; A('E-001', 'Rain on Jun 26 and 27: cloudy, roads wet and muddy', '1863-06-26T06:00', '1863-06-27T12:00'); await mustFail(allDay, 'weather_mismatch', 'mode all: the rain ends at 07:00 on 27 Jun');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('rule: structures and works (checks.mjs _structure, _structureProblem, _work)', async () => {
  const t = TL.byId.get('T3-049'), [a, b] = t.window.intervals[0], to = isoOf(b), from = isoOf(Math.max(a, b - 30));
  const wade = extra => rec('T3-049', 'structure_state', from, to, 'the house takes 150+ bullet strikes', { structures: ['bld-wade-house'], schedule: ['S-051'] }, [{ type: 'structure_state', structure: 'bld-wade-house', t: { at: to }, state: '/bullet strikes/', schedule_row: 'S-051', visual: { dmg_min: 0.5 }, ...extra }]);
  await mustPass(wade({}));
  await mustPass(wade({ present: true, visual: { dmg_min: 0.5, dmg_max: 1, vis_min: 0 } }));
  await mustFail(wade({ visual: { dmg_max: 0.1 } }), 'structure_wrong_state', 'less damage than the house shows');
  await mustFail(wade({ visual: { dmg_min: 2 } }), 'structure_wrong_state', 'more damage than any state draws');
  await mustFail(wade({ visual: { colour_min: 1 } }), 'assert_field', 'a visual key nobody knows');
  await mustFail(wade({ state: 'Intact' }), 'structure_wrong_state', 'the wrong state');
  await mustFail(wade({ state: ['Burned', '/^Intact$/'] }), 'structure_wrong_state', 'none of several states');
  await mustFail(wade({ schedule_row: 'S-001' }), 'structure_wrong_state', 'a schedule row not in force');
  await mustFail(wade({ hospital: { id: 'WH-nothing' } }), 'structure_wrong_state', 'a hospital the building does not carry');
  await mustFail(wade({ structure: 'bld-nowhere' }), 'structure_unknown', 'a structure no file names');
  const w1 = wade({}); w1.checks[0].t = { from: isoOf(b - 10), to, mode: 'all' }; await mustPass(w1, 'every minute of the last ten minutes of the window (the house is struck at 08:00)');
  const w2 = wade({}); w2.checks[0].t = { from: isoOf(a), to, mode: 'all' }; w2.window = { from: isoOf(a), to }; await mustFail(w2, 'structure_wrong_state', 'mode all over a window that begins before the house is struck');
  const w3 = wade({}); w3.checks[0].t = { from: isoOf(a), to, mode: 'any' }; w3.window = { from: isoOf(a), to }; await mustPass(w3, 'mode any over the same window: at some minute it is');
  // a work: its stage, its crew and where the crew is
  A('WK-001', 'Greene’s brigade builds the Culp’s Hill main line (breastworks) on the morning of Jul 2', '1863-07-02T06:00', '1863-07-02T10:00');
  const wk = extra => rec('WK-001', 'earthwork_build', '1863-07-02T06:00', '1863-07-02T10:00', 'Greene’s brigade builds the Culp’s Hill main line', { works: ['E-05'], units: ['us-12c-2d-greene'] }, [{ type: 'work_stage', work: 'E-05', t: { at: '1863-07-02T08:00' }, stage_min: 3, crew: { units: ['us-12c-2d-greene'] }, ...extra }]);
  await mustPass(wk({}));
  await mustFail(wk({ stage_max: 1 }), 'work_wrong_stage', 'a work further along than the row allows');
  await mustFail(wk({ stage_min: 6 }), 'work_wrong_stage', 'a work not yet at stage 6');
  const far = wk({}); far.entities.units = ['us-1c-1d-cutler']; far.checks[0].crew = { units: ['us-1c-1d-cutler'] }; A('WK-001', 'Cutler’s brigade builds the Culp’s Hill main line (breastworks) on the morning of Jul 2', '1863-07-02T06:00', '1863-07-02T10:00'); await mustFail(far, null, 'a crew that is not the one on the hill');
  const nowork = wk({}); nowork.entities.works = ['E-99']; nowork.checks[0].work = 'E-99'; await mustFail(nowork, 'structure_unknown', 'a work of the works lists that does not exist');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('rule: the scenarios of a record are the record\'s own, and RESULTS says which were run (checks.mjs _scenarioPlan; the T1-015 defect)', async () => {
  const RB = 'bld-rock-creek-rr-bridge', burned = scenario => ({ type: 'structure_state', structure: RB, ...(scenario ? { scenario } : {}), t: { at: '1863-06-27T00:00' }, state: 'Burned', schedule_row: 'S-001', visual: { burn_min: 1 }, quote: 'the Rock Creek railroad bridge are burned on the evening of Jun 26' });
  const base = () => { const r = ex('T1-015'); return r; };
  const ok = await mustPass(base()); assert.deepEqual(ok.scenarios, ['default', 'rr-bridge-jun26']); assert.deepEqual(ok.assertions.map(a => a.scenario), ['default', 'rr-bridge-jun26'], 'each result is tied to its scenario');
  assert.deepEqual(ok.excluded_scenarios.map(x => x.id), ['rr-bridge-jun27'], 'the excluded reading is reported');
  // the defect: a record that names the opening scenario but asserts a burned bridge at 27 Jun 00:00 passes only if the picture draws it there; in the opening scenario it draws a half-burned blend
  const forced = base(); forced.scenario = 'default'; delete forced.scenario_excludes; forced.checks = [burned()]; await mustFail(forced, 'structure_wrong_state', 'burned at 27 Jun 00:00 in the scenario that carries both printed dates');
  const only26 = base(); only26.scenario = [{ id: 'rr-bridge-jun26', structure: { [RB]: 'jun26' } }]; delete only26.scenario_excludes; only26.checks = [burned()]; only26.not_shown = only26.not_shown.slice(0, 1); await mustPass(only26, 'the same assertion in the scenario that dates the burning to the 26th');
  const jun27 = base(); jun27.scenario = [{ id: 'rr-bridge-jun27', structure: { [RB]: 'jun27' } }]; delete jun27.scenario_excludes; jun27.checks = [burned()]; await mustFail(jun27, 'structure_wrong_state', 'burned on the 26th in the scenario that puts the burning on the 27th');
  const unlisted = base(); unlisted.checks[0].scenario = 'rr-bridge-jun28'; await mustFail(unlisted, 'check_scenario_unlisted', 'a check restricted to a scenario the record does not run');
  const dup = base(); dup.scenario = ['default', 'default']; await mustFail(dup, 'scenario_duplicate');
  const exRun = base(); exRun.scenario_excludes = [{ scenario: 'default', why: 'x'.repeat(40) }]; await mustFail(exRun, 'scenario_excluded_is_run', 'a scenario both run and excluded');
  const shortWhy = base(); shortWhy.scenario_excludes[0].why = 'because'; await mustFail(shortWhy, 'scenario_excludes_bad', 'an exclusion without a real reason');
  const bad = base(); bad.scenario = 5; await mustFail(bad, 'scenario_bad');
  const old = base(); old.checks[1].structure_scenario = 'jun26'; await mustFail(old, 'assert_removed_field', 'the removed per-check structure scenario');
  const noRestrict = base(); delete noRestrict.checks[0].scenario; await mustFail(noRestrict, 'structure_wrong_state', 'a check that holds in every scenario of the record fails in the one it does not hold in');
  assert.equal(P.scenarioId('default'), 'default'); assert.equal(P.scenarioId('pdf'), 'pdf');
  assert.equal(P.scenarioId({ structure: { [RB]: 'jun26' } }), `structure:${RB}=jun26`, 'a computed id');
  assert.deepEqual(P.scenarioSpec({ structure: { [RB]: 'jun26' } }).choices, P.scenarioSpec('default').choices, 'a structure-only scenario is the opening scenario plus the reading');
  assert.notDeepEqual(P.scenarioSpec({ choices: {} }).choices, P.scenarioSpec('default').choices, 'a choices-only scenario starts from the plan\'s values, as the shell stores it');
  assert.throws(() => P.scenarioSpec({ structure: { [RB]: 5 } }));
  assert.throws(() => P.scenarioSpec({ from: 'sideways' }));
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('rule: the two halves of the gate for one row (check.mjs coverageOf): a card is a class of its own, a partial realization is covered strictly only by a register entry', () => {
  const E = (o) => coverageOf({ realized: false, kind: 'unit_motion', ...o }, o.reg || []);
  const scene = E({ realized: true }), partial = E({ realized: true, partial: [{ words: 'x', why: 'y' }] }), card = E({ realized: true, kind: 'event_card' }), epi = E({ realized: true, kind: 'epilogue' });
  assert.equal(scene.realization_class, 'scene'); assert.equal(scene.q17_covered, true); assert.equal(scene.q17_covered_strict, true); assert.equal(scene.coverage, 'realization');
  assert.equal(partial.realization_class, 'scene'); assert.equal(partial.q17_covered, true); assert.equal(partial.q17_covered_strict, false, 'a partial realization with no open entry is not covered strictly'); assert.equal(partial.coverage, 'realization');
  assert.equal(card.realization_class, 'card', 'an event card is the class card'); assert.equal(card.q17_covered, true); assert.equal(card.q17_covered_strict, false, 'a card alone is no visual realization (GATE-SPEC TL-4, TL-11)'); assert.equal(card.coverage, 'card');
  assert.equal(epi.realization_class, 'card', 'the epilogue chapter as a card is the class card'); assert.equal(epi.q17_covered_strict, false);
  for (const [name, e] of [['partial', partial], ['card', card]]) { const withReg = coverageOf({ ...e }, ['EG-0001']); assert.equal(withReg.q17_covered_strict, true, `${name} with an open register entry is covered strictly`); }
  const none = E({}), reg = E({ reg: ['EG-0001'] }), regRealizedCard = E({ realized: true, kind: 'event_card', reg: ['EG-0001'] });
  assert.equal(none.realization_class, null); assert.equal(none.q17_covered, false); assert.equal(none.q17_covered_strict, false); assert.equal(none.coverage, 'none');
  assert.equal(reg.q17_covered, true); assert.equal(reg.q17_covered_strict, true); assert.equal(reg.coverage, 'open_register_entry'); assert.deepEqual(reg.register_open, ['EG-0001']);
  assert.equal(regRealizedCard.coverage, 'card', 'realized wins the label');
});
test('rule: the totals and the Q17 verdict are computed from the rows, and are false unless every expected row is there (check.mjs summarize, q17Of)', () => {
  const row = (o = {}) => coverageOf({ realized: false, kind: 'unit_motion', codes: ['no_record'], record: null, in_clock: true, ...o }, o.reg || []);
  const mk = (n, make) => Object.fromEntries(Array.from({ length: n }, (_, i) => ['R-' + i, make(i)]));
  const allScene = mk(3, () => row({ realized: true, record: 'x:1' })), ep = mk(2, () => row({ realized: true, record: 'y:1', kind: 'epilogue' }));
  let S = summarize(allScene, ep), q = q17Of(S, { timelineRows: 3, epilogueRows: 2 });
  assert.equal(q.complete, true); assert.equal(q.ok, true); assert.equal(q.ok_strict, false, 'the epilogue rows are cards: covered, not strictly'); assert.equal(q.realized, 3); assert.equal(q.realized_by_scene, 3); assert.equal(q.epilogue_uncovered_strict, 2);
  S = summarize(allScene, mk(2, () => row({ realized: true, record: 'y:1' }))); q = q17Of(S, { timelineRows: 3, epilogueRows: 2 }); assert.equal(q.ok, true); assert.equal(q.ok_strict, true, 'scene realizations of every row');
  q = q17Of(S, { timelineRows: 4, epilogueRows: 2 }); assert.equal(q.complete, false); assert.equal(q.ok, false, 'a document that lacks an expected row is not a verdict'); assert.equal(q.ok_strict, false);
  q = q17Of(S, { timelineRows: 3, epilogueRows: 2, problems: [{ file: 'x', line: 1, error: 'duplicate' }] }); assert.equal(q.ok, false, 'a problem in a record file voids the verdict'); assert.equal(q.ok_strict, false);
  const mixed = { ...allScene, 'R-9': row({ reg: ['EG-1'] }), 'R-10': row({}) }; S = summarize(mixed, {}); q = q17Of(S, { timelineRows: 5, epilogueRows: 0 });
  assert.equal(S.timeline.uncovered, 1); assert.equal(S.timeline.covered_by_open_register_entry_only, 1); assert.equal(S.timeline.no_record, 2); assert.equal(q.ok, false, 'one row neither realized nor on the register');
  delete mixed['R-10']; S = summarize(mixed, {}); q = q17Of(S, { timelineRows: 4, epilogueRows: 0 }); assert.equal(q.ok, true); assert.equal(q.ok_strict, true); assert.equal(q.covered_by_open_register_entry_only, 1);
  const outside = { ...allScene, 'R-8': row({ in_clock: false }) }; assert.deepEqual(summarize(outside, {}).outside_clock, ['R-8']);
  const partialRows = { ...allScene, 'R-7': row({ realized: true, partial: [{ words: 'a', why: 'b' }], kind: 'structure_state', record: 'x:2' }) }; S = summarize(partialRows, {}); q = q17Of(S, { timelineRows: 4, epilogueRows: 0 });
  assert.equal(S.timeline.realized_partial, 1); assert.equal(q.ok, true); assert.equal(q.ok_strict, false, 'a partial realization with no open entry'); assert.equal(S.timeline.uncovered_strict, 1);
  assert.equal(S.realized_by_kind.structure_state, 1); assert.equal(S.not_realized_by_code.no_record, undefined, 'realized rows have no codes counted');
  S = summarize({ 'R-0': row({ codes: ['place_unknown', 'unit_not_drawn'] }), 'R-1': row({ codes: ['place_unknown'] }) }, {}); assert.deepEqual(S.not_realized_by_code, { place_unknown: 2, unit_not_drawn: 1 });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('rule: the allowed time of a row is its whole printed cell, and the realized interval must lie inside it (timeline.mjs)', () => {
  const T1 = TL.byId.get('T1-003'); assert.equal(T1.window.source, 'correction', 'a corrected row uses the corrected window');
  const seed = TL.rows.find(r => !r.correction); assert.ok(seed.window.intervals.length > 0 && seed.window.basis.length > 0 && seed.window.source === 'seed time cell');
  assert.ok(TL.rows.filter(r => r.correction).length >= 100, 'the corrections of tl-01 and tl-02 are read');
});
test('rule: the claim words of a row are the printed cells and the claim fields of its correction, never the basis, the marking or the sources (timeline.mjs claimFields; the T1-003 defect)', () => {
  const t = TL.byId.get('T1-003'), c = t.correction.line.corrected_claim;
  assert.ok(!hasQuote(t.claim_text, c.time_window.basis.slice(0, 60).replace(/\s\S*$/, '')), 'the basis of the time window is evidence about the claim, not the claim');
  assert.ok(!hasQuote(t.claim_text, 'Early, OR27-2-R470 p.465'), 'a source citation is not the claim');
  assert.ok(!hasQuote(t.claim_text, c.marking.slice(0, 40).replace(/\s\S*$/, '')), 'the marking is not the claim');
  assert.ok(!/tolerances\.json/.test(t.claim_text), 'the boilerplate of the window basis is not the claim');
  for (const k of ['event', 'unit', 'place', 'text']) assert.ok(hasQuote(t.claim_text, c[k].slice(0, 50).replace(/\s\S*$/, '')), `the ${k} of the corrected claim is the claim`);
  assert.ok(hasQuote(t.claim_text, c.time_window.text), 'and so is the printed time text');
  assert.deepEqual(Object.keys(t.correction.fields), ['event', 'unit', 'place', 'time_text', 'text']);
  assert.equal(P.unitsNamedIn(t.claim_text).length, 0, 'T1-003 is a weather row: it names no unit (a report author, "all day" and "stone wall" are not units)');
});
test('rule: a name is a unit\'s only as a proper noun, and an ordinary word names it only in a naming context (query.mjs unitsNamedIn, lib.mjs wordInfo; the Day and Stone defects)', () => {
  const named = t => P.unitsNamedIn(t).map(n => n.id);
  assert.ok(!named('Jun 26 all day, rain').includes('us-5c-2d-day'), '"all day" is not Day\'s brigade');
  assert.ok(!named('a stone wall on the ridge').includes('us-1c-3d-stone'), '"stone wall" is not Stone\'s brigade');
  assert.ok(named('Day’s brigade holds the wall').includes('us-5c-2d-day'), 'a possessive names the brigade');
  assert.ok(named('Stone’s brigade holds the wall').includes('us-1c-3d-stone'));
  assert.ok(named('Gen. Early arrives').includes('cs-2c-early'), 'a title before the name');
  assert.ok(!named('Early reports 10 cars').includes('cs-2c-early'), 'a capital at the start of a sentence is no proof when the word is also "early"');
  assert.ok(!named('early in the morning').includes('cs-2c-early'));
  assert.ok(named('The Iron Brigade advances').includes('us-1c-1d-meredith'), 'a nickname with its unit noun');
  assert.ok(!named('an iron works burned').includes('us-1c-1d-meredith'));
  assert.ok(named('Hancock takes command').includes('us-2c'), 'a surname that is no ordinary word names its corps bare');
  assert.ok(named('Fitz Lee’s brigade').includes('cs-cav-flee'), 'F. Lee needs his initial: Fitz Lee names him');
  assert.ok(!named('Lee’s army marches').includes('cs-cav-flee'), 'a bare Lee is the army commander, not Fitzhugh Lee');
  assert.ok(named('Lee’s army marches').includes('cs-anv'));
  assert.ok(!named('the Potomac is in flood').includes('us-aop'), 'a river is not the Army of the Potomac');
  assert.ok(named('the Army of the Potomac marches').includes('us-aop'), 'the whole name is');
  const wi = wordInfo('Early’s division; all day; Stone Sentinels; early in the morning'); assert.equal(wi.get('early').ctx, true); assert.equal(wi.get('day').cap, false); assert.equal(wi.get('stone').ctx, false);
  assert.equal([...designators('the 6th Wisconsin and 19th Indiana')].sort().join(), '19in,6wi');
});
test('rule: dates and minutes are strict (lib.mjs toMin, isoOf)', () => {
  assert.equal(isoOf(toMin('1863-07-01T10:30')), '1863-07-01T10:30'); assert.equal(toMin('1863-06-26T00:00'), 25 * 1440);
  for (const bad of ['1863-05-31T00:00', '1863-12-01T00:00', '1863-06-31T00:00', '1863-07-01T25:00', '1863-07-01T10:61', 'yesterday', '', null]) assert.throws(() => toMin(bad), /bad time/, String(bad));
  assert.equal(toMin('1863-07-01'), toMin('1863-07-01T00:00')); assert.equal(isoOf(null), null);
});
test('rule: the schema is static: a record that is not an object, an unknown row (validateRecord)', () => {
  assert.deepEqual(validateRecord([], { row: null }).problems.map(p => p.code), ['schema_not_object']);
  assert.ok(validateRecord({ id: 'T9-999', harness: 'bt-realize-1', kind: 'event_card' }, { row: null }).problems.some(p => p.code === 'row_unknown'));
});
