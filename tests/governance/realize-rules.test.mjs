// The rules of the realization harness, one WRONG record (or wrong input) per rule, each a mutation of something that passes: a failure names the rule that let a wrong record through. Node only.
//   node --test tests/governance/realize-rules.test.mjs
// tools/bt/realize/mutate.mjs removes or changes each rule in a scratch copy of the harness and runs these tests (and realize.test.mjs): a rule whose removal leaves every test green is not tested.
import test from 'node:test'; import assert from 'node:assert/strict';
import { P, TL, R, rec, addRow, run, ex, clone, codesOf, mustFail, mustPass } from './realize-lib.mjs';
import { validateRecord, KINDS, KIND_NEEDS, ASSERT, STAGE_ACTIVITIES } from '../../tools/bt/realize/schema.mjs';
import { hasQuote, fold, toMin, isoOf, designators, wordInfo } from '../../tools/bt/realize/lib.mjs';
import { coverageOf, summarize, q17Of, runAll, declaredDetail } from '../../tools/bt/realize/check.mjs';

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
  assert.equal(hasQuote('a march of men', 'of'), false, 'a whole word of two characters is still too short to be a quote'); assert.equal(hasQuote('a march of men', 'march'), true);
  assert.equal(fold('Early’s  Division |  (Ewell’s II Corps)'), 'earlys division (ewells ii corps)');
  assert.equal(hasQuote('Camp west of Cashtown to | Cashtown Pike', 'Cashtown to Cashtown Pike'), true, 'a quote may cross the cells the table wrapped');
});
test('rule: a record\'s quote must be found in the row, by words (schema.mjs quote_not_in_row)', async () => {
  A('Q-001', 'Meade holds a council on the Hanover Road', '1863-07-02T22:30', '1863-07-02T23:30', 'Jul 2 evening');
  const base = () => rec('Q-001', 'weather_sky', '1863-07-02T22:30', '1863-07-02T23:30', 'Meade holds a council', {}, [{ type: 'sky', t: { at: '1863-07-02T23:00' }, band_in: ['Night'], exposure_min: 0.3 }]);
  await mustPass(base());
  const q = base(); q.claim = { quote: 'over Road' }; await mustFail(q, 'quote_not_in_row', 'a quote that starts inside a word');
  const q2 = base(); q2.claim = { quote: 'council on the Hanover Roa' }; await mustFail(q2, 'quote_not_in_row', 'a quote that ends inside a word');
  const q3 = base(); q3.checks[0].quote = 'council of war'; await mustFail(q3, 'quote_not_in_row', 'a check\'s own quote');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('rule: a NIGHT row needs a sky assertion with exposure_min (gate Q10: night is night, never black; schema.mjs)', async () => {
  A('N-001', 'Early’s division bivouacs in the rain on the night of Jun 26', '1863-06-26T21:00', '1863-06-26T23:00', 'Jun 26 NIGHT');
  const sky = { type: 'sky', t: { at: '1863-06-26T22:00' }, band_in: ['Night'], exposure_min: 0.34 }, wx = { type: 'weather', t: { at: '1863-06-26T22:00' }, precip_kind_in: ['rain'], quote: 'in the rain' };
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
    const r = rec('K-001', k, '1863-07-01T12:00', '1863-07-01T12:30', 'Cutler’s brigade stands', ents, clone(irrelevant), { place_unspecified: 'the row names no place' });
    const res = await run(r); assert.equal(res.realized, false, k); assert.ok(codesOf(res).has('kind_needs'), `${k}: a record whose only assertion cannot prove the kind must say kind_needs (got ${[...codesOf(res)].join(', ')})`);
  }
  const mot = rec('K-001', 'unit_motion', '1863-07-01T12:00', '1863-07-01T12:30', 'Cutler’s brigade stands', { units: ['us-1c-1d-cutler'] }, [{ type: 'unit_moves', unit: 'us-1c-1d-cutler', min_minutes: 0 }]); await mustFail(mot, 'assert_field', 'unit_moves with no place relation');
  A('K-002', 'Iron Brigade 19th Indiana advances', '1863-07-01T10:20', '1863-07-01T10:50');
  const walk = () => rec('K-002', 'unit_motion', '1863-07-01T10:20', '1863-07-01T10:50', '19th Indiana advances', { units: ['us-1c-1d-meredith-19in'] }, [{ type: 'unit_moves', unit: 'us-1c-1d-meredith-19in' }]);
  await mustFail(walk(), 'assert_field', 'a motion that names no place must say so'); await mustFail(walk(), 'kind_needs', 'and a motion record needs a place relation or place_unspecified (kind_needs)');
  const walked = walk(); walked.place_unspecified = 'the row names no place'; await mustPass(walked, 'a motion row that names no place says why, and is checked for its marching and displacement only');
  walked.checks[0].min_displacement_m = 100000; await mustFail(walked, 'unit_not_moving', 'and still has to move');
  A('K-003', 'Cutler’s brigade stands in line', '1863-07-01T12:00', '1863-07-01T12:30');
  const act = rec('K-003', 'unit_activity', '1863-07-01T12:00', '1863-07-01T12:30', 'Cutler’s brigade stands', { units: ['us-1c-1d-cutler'] }, [{ type: 'unit_activity', unit: 'us-1c-1d-cutler', activities: ['stand'] }]); await mustFail(act, 'kind_needs', 'an activity with no place and no place_unspecified');
  act.place_unspecified = 'the row names no place'; await mustPass(act, 'an activity that says why it has no place');
});
test('rule: a theatre-clock window, a window inside the row, an assertion time inside the record window (schema.mjs)', async () => {
  A('W-001', 'Early’s division is encamped', '1863-06-24T00:00', '1863-06-24T12:00');
  const base = (from, to) => rec('W-001', 'unit_activity', from, to, 'Early’s division is encamped', { units: ['cs-2c-early'] }, [{ type: 'unit_present', unit: 'cs-2c-early' }], { place_unspecified: 'the row names no place' });
  await mustFail(base('1863-06-24T01:00', '1863-06-24T02:00'), 'time_outside_clock', 'a window before the theatre clock starts (26 Jun)');
  A('W-002', 'Cutler’s brigade stands', '1863-07-01T12:00', '1863-07-01T12:30');
  const b2 = () => rec('W-002', 'unit_activity', '1863-07-01T12:00', '1863-07-01T12:30', 'Cutler’s brigade stands', { units: ['us-1c-1d-cutler'] }, [{ type: 'unit_present', unit: 'us-1c-1d-cutler', t: { at: '1863-07-01T12:10' } }], { place_unspecified: 'the row names no place' });
  await mustPass(b2());
  const w1 = b2(); w1.window = { from: '1863-07-01T11:59', to: '1863-07-01T12:30' }; w1.checks[0].t = { at: '1863-07-01T12:10' }; await mustFail(w1, 'window_outside_row', 'one minute before the row\'s window');
  const w2 = b2(); w2.window = { from: '1863-07-01T12:00', to: '1863-07-01T12:31' }; await mustFail(w2, 'window_outside_row', 'one minute after the row\'s window');
  const w3 = b2(); w3.checks[0].t = { at: '1863-07-01T12:31' }; await mustFail(w3, 'assert_time_outside_window', 'an assertion after the record window');
  const w4 = b2(); delete w4.window; await mustFail(w4, 'window_missing');
  const w5 = b2(); w5.window = { from: '1863-13-40T25:00', to: '1863-07-01T12:30' }; await mustFail(w5, 'window_bad');
});
test('rule: the numbers of an assertion are the row\'s own (number_not_in_quote), and a record lists the entities it uses, no more and no less', async () => {
  A('F-001', 'Gordon’s brigade (about 1,900) on the field', '1863-07-01T16:00', '1863-07-01T22:00');
  const f = (approx, quote) => rec('F-001', 'unit_activity', '1863-07-01T16:00', '1863-07-01T22:00', 'Gordon’s brigade', { units: ['cs-2c-early-gordon'] }, [{ type: 'unit_figures', unit: 'cs-2c-early-gordon', approx, tol_pct: 10, ...(quote ? { quote } : {}) }], { place_unspecified: 'the row names no place' });
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
  A('P-001', 'McPherson Ridge Cutler’s brigade stands in line; Iron Brigade 19th IN arrives on the Emmitsburg Road', '1863-07-01T10:00', '1863-07-01T12:30');
  const C = 'us-1c-1d-cutler';
  const at = (t, extra = {}) => rec('P-001', 'unit_activity', '1863-07-01T10:00', '1863-07-01T12:30', 'Cutler’s brigade stands in line', { units: [C], places: ['McPherson Ridge'] }, [{ type: 'unit_present', unit: C }, { type: 'unit_at', unit: C, place: 'McPherson Ridge', t, ...extra }]);
  await mustPass(at(whole('1863-07-01T12:00', '1863-07-01T12:30')));
  await mustFail(at(whole('1863-07-01T11:00', '1863-07-01T12:30')), 'unit_wrong_place', 'mode all: the brigade is elsewhere in part of the window');
  await mustPass(at({ from: '1863-07-01T11:00', to: '1863-07-01T12:30' }), 'mode any: it is there at some minute');
  const road = (t) => rec('P-001', 'unit_activity', '1863-07-01T10:15', '1863-07-01T10:30', '19th IN arrives on the Emmitsburg Road', { units: ['us-1c-1d-meredith-19in'], places: ['Emmitsburg Road'] }, [{ type: 'unit_present', unit: 'us-1c-1d-meredith-19in' }, { type: 'unit_at', unit: 'us-1c-1d-meredith-19in', place: 'Emmitsburg Road', t }]);
  await mustPass(road(whole('1863-07-01T10:20', '1863-07-01T10:25')), 'on the road at every minute from its arrival');
  await mustFail(road(whole('1863-07-01T10:15', '1863-07-01T10:25')), 'unit_not_on_field', 'mode all: the brigade is not on the field before its arrival, which is not "at the road"');
  await mustPass(road({ from: '1863-07-01T10:15', to: '1863-07-01T10:25' }), 'mode any: at some minute');
  A('P-002', 'Cutler’s brigade stands in line', '1863-07-01T12:00', '1863-07-01T12:30');
  const act = (extra) => rec('P-002', 'unit_activity', '1863-07-01T12:00', '1863-07-01T12:30', 'Cutler’s brigade stands in line', { units: [C] }, [{ type: 'unit_activity', unit: C, activities: ['stand'], ...extra }], { place_unspecified: 'the row names no place' });
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
  await mustFail(wx({ temp_f: 70, tol_f: 9, quote: 'temperature 70 F at noon' }), 'tolerance_wider_than_stated', 'a record may tighten the temperature tolerance (1 F), never widen it: 9 F would let 62 F pass for 70 F');
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
  // a crew that does show build_works, but at another place than the work: the 1st Pennsylvania Reserves dig on the evening of 2 Jul near Little Round Top, not on Culp's Hill
  A('WK-002', '1st Pennsylvania Reserves builds the Culp’s Hill main line (breastworks) on the evening of Jul 2', '1863-07-02T20:10', '1863-07-02T20:40');
  const away = rec('WK-002', 'earthwork_build', '1863-07-02T20:10', '1863-07-02T20:40', '1st Pennsylvania Reserves builds the Culp’s Hill main line', { works: ['E-05'], units: [{ id: 'us-5c-3d-mccandless-1pareserves', via: '1st Pennsylvania Reserves' }] }, [{ type: 'work_stage', work: 'E-05', t: { at: '1863-07-02T20:20' }, stage_min: 3, crew: { units: ['us-5c-3d-mccandless-1pareserves'] } }]);
  await mustFail(away, 'work_crew_elsewhere', 'a crew that digs, but not at the work');
  const nowork = wk({}); nowork.entities.works = ['E-99']; nowork.checks[0].work = 'E-99'; await mustFail(nowork, 'structure_unknown', 'a work of the works lists that does not exist');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('rule: a place a record uses is named in the row, or declared with the row\'s own words (checks.mjs _bindings)', async () => {
  A('B-001', 'McPherson Ridge Cutler’s brigade stands in line', '1863-07-01T12:00', '1863-07-01T12:30');
  const at = place => rec('B-001', 'unit_activity', '1863-07-01T12:00', '1863-07-01T12:30', 'Cutler’s brigade stands in line', { units: ['us-1c-1d-cutler'], places: [place] }, [{ type: 'unit_present', unit: 'us-1c-1d-cutler' }, { type: 'unit_at', unit: 'us-1c-1d-cutler', place: typeof place === 'string' ? place : place.id }]);
  await mustPass(at('McPherson Ridge'));
  const r = await mustFail(at('Cemetery Hill'), 'place_not_in_row', 'a place the row does not name'); assert.match(r.problems.find(p => p.code === 'place_not_in_row').detail, /"id": "Cemetery Hill"/, 'the message names the form that works');
  const d = await mustFail(at({ id: 'Cemetery Hill', via: 'Cutler’s brigade stands in line' }), 'unit_wrong_place', 'a declared place is no proof of the position'); assert.ok(!codesOf(d).has('place_not_in_row') && d.bindings.declared === 1);
  await mustFail(at({ id: 'Cemetery Hill', via: 'Pickett charges' }), 'place_not_in_row', 'a declaration whose words are not the row\'s');
  await mustFail(at('Belmont Road'), 'place_unknown', 'a name no repository file carries'); await mustFail(at('Cashtown'), 'place_off_ground', 'a place off the loaded ground');
});
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
  assert.ok(!named('as hancock and pickett said').includes('us-2c') && !named('as hancock and pickett said').includes('cs-1c-pickett'), 'a name in lower case is not a name, whether or not the word is also an ordinary word of the timeline');
  assert.ok(named('as Pickett said').includes('cs-1c-pickett'));
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

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// an assertion that no product could fail confirms nothing: a record made of such assertions would "realize" a row by confirming nothing (the review that found it: casualty minimum 0, a battery with no count ...)
const vacuous = async (r, why) => { const res = await mustFail(r, 'assert_vacuous', why); assert.ok(res.problems.some(p => p.code === 'assert_vacuous'), `${why}: a problem of the record, found before any product is asked`); return res; };
test('rule: casualty, gun, figure and activity assertions that every product satisfies are refused (schema.mjs vacuityProblems: assert_vacuous)', async () => {
  A('V-001', 'Iron Brigade suffers heavy losses; 2nd Maine Battery six guns', '1863-07-01T10:30', '1863-07-01T12:00');
  const cas = extra => rec('V-001', 'casualty_flow', '1863-07-01T10:30', '1863-07-01T12:00', 'Iron Brigade suffers heavy losses', { units: ['us-1c-1d-meredith'] }, [{ type: 'casualty', units: ['us-1c-1d-meredith'], ...extra }]);
  await mustPass(cas({ killed_min: 1 }), 'the least a casualty check may ask is one man');
  for (const k of ['killed_min', 'wounded_min', 'missing_min', 'events_min']) await vacuous(cas({ [k]: 0 }), `${k} 0 is satisfied by a line that loses no man`);
  await vacuous(cas({ killed_min: 1, wounded_min: 0 }), 'one vacuous bound among real ones');
  const gun = extra => rec('V-001', 'artillery', '1863-07-01T10:30', '1863-07-01T12:00', '2nd Maine Battery six guns', { units: ['us-1c-art-2me'] }, [{ type: 'battery_guns', unit: 'us-1c-art-2me', ...extra }]);
  await mustPass(gun({ guns_min: 1 }), 'one gun is the least that proves a battery');
  await vacuous(gun({}), 'a battery check that names no count is satisfied by every battery on the field');
  for (const k of ['guns_min', 'limbers_min', 'caissons_min', 'horses_min']) await vacuous(gun({ [k]: 0 }), `${k} 0 is satisfied by a battery with none`);
  A('V-002', 'Gordon’s brigade (about 1,900) stands in line', '1863-07-01T16:00', '1863-07-01T22:00');
  const fig = extra => rec('V-002', 'unit_activity', '1863-07-01T16:00', '1863-07-01T22:00', 'Gordon’s brigade (about 1,900)', { units: ['cs-2c-early-gordon'] }, [{ type: 'unit_figures', unit: 'cs-2c-early-gordon', quote: 'about 1,900', ...extra }], { place_unspecified: 'the row names no place' });
  await mustPass(fig({ approx: 1900 }), 'the strength the row prints, within the stated 10 per cent');
  await vacuous(fig({ max: 100000 }), 'a bare maximum is satisfied by a unit that is drawn with no figures');
  await vacuous(fig({ min: 0 }), 'a minimum of 0');
  await vacuous(fig({ approx: 0 }), 'an approximate strength of 0'); await vacuous(fig({ approx: 1900, min: 0 }), 'a minimum of 0 beside a real strength is a bound that proves nothing');
  A('V-003', 'Cutler’s brigade stands in line', '1863-07-01T12:00', '1863-07-01T12:30');
  const act = extra => rec('V-003', 'unit_activity', '1863-07-01T12:00', '1863-07-01T12:30', 'Cutler’s brigade stands in line', { units: ['us-1c-1d-cutler'] }, [{ type: 'unit_activity', unit: 'us-1c-1d-cutler', ...extra }], { place_unspecified: 'the row names no place' });
  await mustPass(act({ activities: ['stand'], min_minutes: 30 }));
  await vacuous(act({ activities: STAGE_ACTIVITIES }), 'every activity the stage gives a unit: any unit on the field does one of them');
  await mustPass(act({ activities: [...STAGE_ACTIVITIES].reverse().slice(1) }), 'all but one activity can still fail (a unit that does the one left out), so it is not refused');
});
test('rule: structure, work, weather and sky assertions that every product satisfies are refused (schema.mjs vacuityProblems, checks.mjs _falsifiable)', async () => {
  const t = TL.byId.get('T3-049'), [a, b] = t.window.intervals[0], to = isoOf(b), from = isoOf(Math.max(a, b - 30));
  const wade = extra => rec('T3-049', 'structure_state', from, to, 'the house takes 150+ bullet strikes', { structures: ['bld-wade-house'] }, [{ type: 'structure_state', structure: 'bld-wade-house', t: { at: to }, ...extra }]);
  await mustPass(wade({ state: '/bullet strikes/' }));
  await vacuous(wade({}), 'a structure check that names no state, presence, schedule row, hospital or visual bound is satisfied by any drawn object');
  await vacuous(wade({ state: '/.*/' }), 'a pattern every state matches');
  await vacuous(wade({ state: ['Intact', '/(?:)/'] }), 'one pattern that matches every state, in a list that matches when any item does');
  await vacuous(wade({ visual: { dmg_min: 0 } }), 'a minimum of 0 of a drawn value that lies between 0 and 1');
  await vacuous(wade({ visual: { dmg_max: 1 } }), 'a maximum of 1');
  const present = await run(wade({ present: true })); assert.ok(!codesOf(present).has('assert_vacuous'), 'presence is a statement a product that draws nothing there fails');
  const anch = await run(wade({ state: '/^$/' })); assert.ok(!codesOf(anch).has('assert_vacuous'), 'an anchored pattern is a statement (no state is called the empty string, so it fails; it is not vacuous)');
  A('V-005', 'Greene’s brigade builds the Culp’s Hill main line (breastworks) on the morning of Jul 2', '1863-07-02T06:00', '1863-07-02T10:00');
  const wk = extra => rec('V-005', 'earthwork_build', '1863-07-02T06:00', '1863-07-02T10:00', 'Greene’s brigade builds the Culp’s Hill main line', { works: ['E-05'], units: ['us-12c-2d-greene'] }, [{ type: 'work_stage', work: 'E-05', t: { at: '1863-07-02T08:00' }, crew: { units: ['us-12c-2d-greene'] }, ...extra }]);
  await mustPass(wk({ stage_min: 3 }));
  await vacuous(wk({}), 'a crew alone says nothing about the work');
  await vacuous(wk({ stage_min: 0 }), 'stage 0 or more holds at every stage');
  await vacuous(wk({ stage_max: 6 }), 'stage 6 or less holds at every stage');
  A('V-006', 'Rain on Jun 26: cloudy, roads wet and muddy', '1863-06-26T06:00', '1863-06-26T23:00');
  const wx = extra => rec('V-006', 'weather_sky', '1863-06-26T06:00', '1863-06-26T23:00', 'roads wet and muddy', {}, [{ type: 'weather', t: { at: '1863-06-26T12:00' }, ...extra }]);
  const sky = extra => rec('V-006', 'weather_sky', '1863-06-26T06:00', '1863-06-26T23:00', 'cloudy', {}, [{ type: 'sky', t: { at: '1863-06-26T12:00' }, ...extra }]);
  await mustPass(wx({ record: true, precip_kind_in: ['rain'] }));
  await vacuous(wx({ record: true }), 'an environment record exists: that is not what the weather is');
  const kinds = new Set(), bands = new Set(); for (const m of R._control()) { const W = await P.weatherAt(m); kinds.add(W.drawn.precip.kind); bands.add(W.drawn.sky.band); }
  assert.ok(kinds.size >= 2 && bands.size >= 3, 'the control minutes of the theatre clock see rain and no rain, day and night');
  await vacuous(wx({ precip_kind_in: [...kinds] }), 'every kind of precipitation the product draws at any minute');
  await vacuous(wx({ cloud_min: 0 }), 'a cloud cover of 0 or more holds at every minute'); await vacuous(wx({ cloud_max: 1 }), 'and 1 or less');
  await vacuous(wx({ wetness_max: 1 }), 'ground wetness of 1 or less'); await vacuous(wx({ precip_intensity_min: 0 }), 'intensity of 0 or more');
  await mustPass(wx({ cloud_min: 0.5 }), 'a bound some minute violates is a statement');
  await vacuous(sky({ exposure_min: 0 }), 'an exposure floor of 0 is satisfied by black (the night floor of gate Q10 is above 0)');
  await mustPass(sky({ exposure_min: 0.3 }), 'the night floor alone holds at every minute by design (gate Q10), and is the one exempt assertion');
  await vacuous(sky({ sun_alt_min: -90 }), 'a sun above -90 degrees at every minute'); await vacuous(sky({ moon_illum_min: 0 }), 'a moon of 0 per cent or more');
  await vacuous(sky({ band_in: [...bands] }), 'every band of the sky the product draws at any minute');
  await mustPass(sky({ band_in: ['Day'], exposure_min: 0.5 }), 'a band some minute is not in');
});
test('rule: a record may ask for more than a floor of the harness, never for less (schema.mjs vacuityProblems, tolerances.json units: tolerance_wider_than_stated)', async () => {
  const F = P.tolerances.units; assert.deepEqual(F.moves_floor, { min_minutes: 1, min_displacement_m: 10, min_closing_m: 50 }); assert.equal(F.activity_floor.min_minutes, 1); assert.equal(F.figures.tol_pct, 10); assert.equal(P.tolerances.weather.temp_f_tolerance, 1);
  A('V-004', 'Iron Brigade 19th Indiana advances toward McPherson Ridge', '1863-07-01T10:20', '1863-07-01T10:50');
  const U = 'us-1c-1d-meredith-19in', mv = extra => rec('V-004', 'unit_motion', '1863-07-01T10:20', '1863-07-01T10:50', '19th Indiana advances toward McPherson Ridge', { units: [U], places: ['McPherson Ridge'] }, [{ type: 'unit_moves', unit: U, toward: 'McPherson Ridge', ...extra }]);
  await mustPass(mv({}), 'the baseline'); await mustPass(mv({ min_minutes: 2, min_displacement_m: 100, min_closing_m: 100 }), 'more than every floor');
  for (const [k, floor] of Object.entries(F.moves_floor)) { await mustFail(mv({ [k]: floor - 1 }), 'tolerance_wider_than_stated', `${k} ${floor - 1} is below the floor ${floor}`); await mustFail(mv({ [k]: 0 }), 'tolerance_wider_than_stated', `${k} 0`); await mustPass(mv({ [k]: floor }), `${k} at the floor is allowed`); }
  A('V-007', 'Cutler’s brigade stands in line', '1863-07-01T12:00', '1863-07-01T12:30');
  const act = extra => rec('V-007', 'unit_activity', '1863-07-01T12:00', '1863-07-01T12:30', 'Cutler’s brigade stands in line', { units: ['us-1c-1d-cutler'] }, [{ type: 'unit_activity', unit: 'us-1c-1d-cutler', activities: ['stand'], ...extra }], { place_unspecified: 'the row names no place' });
  await mustFail(act({ min_minutes: 0 }), 'tolerance_wider_than_stated', 'an activity for 0 minutes'); await mustPass(act({ min_minutes: 1 }), 'at the floor');
  A('V-008', 'Gordon’s brigade (about 1,900) stands in line', '1863-07-01T16:00', '1863-07-01T22:00');
  const fig = extra => rec('V-008', 'unit_activity', '1863-07-01T16:00', '1863-07-01T22:00', 'Gordon’s brigade (about 1,900)', { units: ['cs-2c-early-gordon'] }, [{ type: 'unit_figures', unit: 'cs-2c-early-gordon', approx: 1900, quote: 'about 1,900', ...extra }], { place_unspecified: 'the row names no place' });
  await mustFail(fig({ tol_pct: 11 }), 'tolerance_wider_than_stated', 'a share wider than the stated 10 per cent'); await mustFail(fig({ tol_pct: 1000 }), 'tolerance_wider_than_stated', 'a share of 1000 per cent is satisfied by a unit with one figure'); await mustPass(fig({ tol_pct: 10 })); await mustPass(fig({ tol_pct: 5 }), 'a smaller share is allowed if the picture draws it');
});
test('rule: "any" leaf of a formation needs the row\'s own words, and "place_unspecified" is a reason that is true (checks.mjs _bindings, schema.mjs; GATE-SPEC 6.4 V2, V7)', async () => {
  A('Q-101', 'Part of Early’s division is on the field', '1863-07-01T16:00', '1863-07-01T22:00');
  const part = extra => rec('Q-101', 'unit_activity', '1863-07-01T16:00', '1863-07-01T22:00', 'Part of Early’s division is on the field', { units: ['cs-2c-early'] }, [{ type: 'unit_present', unit: 'cs-2c-early', quantifier: 'any', ...extra }], { place_unspecified: 'the row names no place' });
  await mustFail(part({}), 'quantifier_any_unsupported', 'a formation taken as any one leaf with no words of the row that say only part of it is meant');
  const ok = await mustPass(part({ quantifier_quote: 'Part of Early’s division' }), 'with the row\'s own words'); assert.equal(ok.bindings.declared, 1, 'and the record is listed as declaring it'); assert.deepEqual(ok.bindings.quantifiers.map(q => q.units), [['cs-2c-early']]);
  const wrong = await mustFail(part({ quantifier_quote: 'the whole division' }), 'quote_not_in_row', 'words that are not the row\'s'); assert.ok(codesOf(wrong).has('quantifier_any_unsupported'), 'and the binding does not accept them either');
  const all = part({ quantifier_quote: 'Part of Early’s division' }); all.checks[0].quantifier = 'all'; await mustFail(all, 'assert_field', 'a quote for "any" belongs to a check that says any');
  A('Q-102', '19th Indiana is on the field', '1863-07-01T10:20', '1863-07-01T10:50');
  const one = rec('Q-102', 'unit_activity', '1863-07-01T10:20', '1863-07-01T10:50', '19th Indiana is on the field', { units: ['us-1c-1d-meredith-19in'] }, [{ type: 'unit_present', unit: 'us-1c-1d-meredith-19in', quantifier: 'any' }], { place_unspecified: 'the row names no place' });
  await mustPass(one, 'a regiment has one leaf: any and all are the same, so no words are needed');
  // place_unspecified
  const bad = part({ quantifier_quote: 'Part of Early’s division' }); bad.place_unspecified = 'x'; await mustFail(bad, 'place_unspecified_bad', 'a reason of one letter'); bad.place_unspecified = 5; await mustFail(bad, 'place_unspecified_bad', 'a reason that is not text');
  A('Q-103', 'Cutler’s brigade stands at McPherson Ridge', '1863-07-01T12:00', '1863-07-01T12:30');
  const named = rec('Q-103', 'unit_activity', '1863-07-01T12:00', '1863-07-01T12:30', 'Cutler’s brigade stands at McPherson Ridge', { units: ['us-1c-1d-cutler'] }, [{ type: 'unit_activity', unit: 'us-1c-1d-cutler', activities: ['stand'] }], { place_unspecified: 'the row names no place' });
  const r = await mustFail(named, 'place_unspecified_but_named', 'a row that names McPherson Ridge cannot say that it names no place'); assert.match(r.problems.find(p => p.code === 'place_unspecified_but_named').detail, /McPherson Ridge/, 'the message names the place');
  const related = rec('Q-103', 'unit_activity', '1863-07-01T12:00', '1863-07-01T12:30', 'Cutler’s brigade stands at McPherson Ridge', { units: ['us-1c-1d-cutler'], places: ['McPherson Ridge'] }, [{ type: 'unit_activity', unit: 'us-1c-1d-cutler', activities: ['stand'] }, { type: 'unit_at', unit: 'us-1c-1d-cutler', place: 'McPherson Ridge' }]);
  await mustPass(related, 'the same row, with the unit related to its place');
});
test('rule: what a record declared instead of letting the row bind it is listed for the reviewer (check.mjs declaredDetail; RESULTS declared_detail)', async () => {
  const B = { units: [{ id: 'u1', how: 'declared', via: 'w1' }, { id: 'u2', how: 'matched', by: 'x' }], places: [{ id: 'p1', how: 'declared', via: 'w2' }, { id: 'p2', how: 'matched' }], structures: [{ id: 's1', how: 'declared', via: 'w3' }], quantifiers: [{ i: 0, units: ['u3'], via: 'w4' }], declared: 4 };
  assert.deepEqual(declaredDetail(B), [{ kind: 'unit', id: 'u1', via: 'w1' }, { kind: 'place', id: 'p1', via: 'w2' }, { kind: 'structure', id: 's1', via: 'w3' }, { kind: 'quantifier_any', units: ['u3'], via: 'w4' }]);
  assert.deepEqual(declaredDetail({ units: [], places: [], structures: [] }), [], 'nothing declared, nothing listed');
  const run1 = await runAll({ rows: ['T1-009', 'T1-003'], product: P }); const d = run1.out['T1-009'].declared_detail;
  assert.deepEqual(d.map(x => `${x.kind}:${x.id}`), ['unit:cs-2c-early-35vacavalrybn']); assert.ok(d[0].via && /cavalry battalion/i.test(d[0].via), 'with the words of the row'); assert.equal(run1.out['T1-009'].declared_bindings, 1);
  assert.equal(run1.out['T1-003'].declared_detail, undefined, 'a record that declares nothing has no list');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// GATE-SPEC TL-8 and 6.4 V6: "every value of every conflict the row names and every conflict of the group reaching the row's units is a selectable scenario and the realization is valid under each, or the
// record states which values it excludes and why". The harness computes the group and says whether a record runs or excludes every scenario of it (RESULTS scenario_group.complete).
test('rule: a scenario names one conflict on one value ("C-004:v1"), and its identity is what it chooses (query.mjs scenarioSpec, scenarioKey)', () => {
  const sc = P.scenarioSpec('C-004:v1'), def = P.scenarioSpec('default'); assert.deepEqual(sc.choices, { ...def.choices, 'C-004': 'v1' }); assert.equal(sc.key, 'C-004:v1'); assert.deepEqual(sc.structure, {});
  assert.equal(P.scenarioSpec('CF-WIND-SPEED:opt0').choices['CF-WIND-SPEED'], 'opt0', 'an environment conflict too');
  assert.throws(() => P.scenarioSpec('C-004:v99'), /no value "v99"/, 'a value the conflict does not have'); assert.throws(() => P.scenarioSpec('C-099:v1'), /unknown conflict "C-099"/, 'a conflict the register does not have');
  assert.equal(P.scenarioKey('C-004:delegated'), P.scenarioKey('default'), 'the delegated value is the opening scenario itself');
  assert.notEqual(P.scenarioKey('C-004:v1'), P.scenarioKey('default'));
  assert.equal(P.scenarioKey({ id: 'a-name', structure: { X: 'r' } }), P.scenarioKey({ structure: { X: 'r' } }), 'what a scenario is called is not what it is');
  assert.equal(P.scenarioKey('C-004:v1'), P.scenarioKey({ id: 'mine', choices: { ...def.choices, 'C-004': 'v1' } }));
  assert.notEqual(P.scenarioKey({ structure: { X: 'r' } }), P.scenarioKey({ structure: { X: 's' } }));
});
test('rule: the conflicts that reach units, weather and structures (query.mjs unitConflicts, weatherConflicts, structureReadings, scenarioGroup)', async () => {
  const reach = P.unitConflicts(['us-2c', 'us-1c-1d-meredith-19in', 'cs-2c-early-gordon']);
  assert.deepEqual(Object.keys(reach), ['C-004', 'C-043'], 'the II Corps gate (C-004) and a path stop of the 19th Indiana (C-043); Gordon is reached by none');
  assert.deepEqual(reach['C-004'], [{ unit: 'us-2c', via: ['gate'] }]); assert.deepEqual(reach['C-043'], [{ unit: 'us-1c-1d-meredith-19in', via: ['path'] }]);
  assert.deepEqual(Object.keys(P.unitConflicts(['us-2c-1d'])), ['C-004'], 'a division inherits the gate of its corps'); assert.deepEqual(P.unitConflicts([]), {}); assert.deepEqual(P.unitConflicts(['no-such-unit']), {});
  assert.deepEqual(await P.weatherConflicts('1863-07-02T13:00', '1863-07-02T15:00'), ['CF-JUL2-CLOUD-2PM', 'CF-JUL2-SKY', 'CF-WIND-SPEED'], 'the conflicts the environment lists for the minutes of the span');
  assert.deepEqual(await P.weatherConflicts('1863-07-03T13:00', '1863-07-03T15:00'), ['CF-WIND-SPEED']); assert.ok((await P.weatherConflicts('1863-07-04T04:00', '1863-07-04T06:00')).includes('CF-JUL4-RAIN-TIMING'));
  const RB = 'bld-rock-creek-rr-bridge', r = await P.structureReadings([RB, 'bld-wade-house', 'E-05']);
  assert.deepEqual(r[RB], ['jun26', 'jun27'], 'the readings other than the default'); assert.equal(r['bld-wade-house'], undefined, 'a structure with one reading has none to add'); assert.ok(r['E-05'].length >= 1 && !r['E-05'].includes('default'), 'a work too');
  const g = await P.scenarioGroup({ text: 'see C-004 and C-099', units: ['us-1c-1d-meredith-19in'], structures: [RB], span: { from: '1863-07-02T13:00', to: '1863-07-02T15:00' } });
  assert.deepEqual(g.conflicts.map(c => c.id), ['C-004', 'C-043', 'CF-JUL2-CLOUD-2PM', 'CF-JUL2-SKY', 'CF-WIND-SPEED'], 'named (C-099 is no conflict), reaching a unit, reaching the weather');
  assert.deepEqual(g.conflicts.map(c => [!!c.named, c.units.length, !!c.weather]), [[true, 0, false], [false, 1, false], [false, 0, true], [false, 0, true], [false, 0, true]]);
  assert.equal(g.ids[0], 'default'); assert.equal(new Set(g.ids).size, g.ids.length, 'no scenario twice'); assert.equal(new Set(g.specs.map(x => P.scenarioKey(x))).size, g.specs.length, 'and none that is another under another name');
  assert.ok(!g.ids.includes('C-004:delegated'), 'the delegated value is the opening scenario'); assert.ok(!g.ids.some(id => /:range$/.test(id)), '"range" shows every value and is no scenario');
  for (const id of ['C-004:v1', 'C-043:v3', 'CF-WIND-SPEED:opt1', 'CF-JUL2-CLOUD-2PM:opt0', `structure:${RB}=jun26`, `structure:${RB}=jun27`]) assert.ok(g.ids.includes(id), id);
  const none = await P.scenarioGroup({ text: 'no conflict named', units: ['cs-2c-early-gordon'] }); assert.deepEqual(none.ids, ['default'], 'a row that no conflict reaches has the opening scenario only'); assert.deepEqual(none.conflicts, []);
});
test('rule: a record is valid under every scenario of its row\'s group, or says which it excludes and why (checks.mjs _group, _groupReport; RESULTS scenario_group)', async () => {
  A('G-101', 'Jul 2 afternoon: dry and the sky is cloudy', '1863-07-02T12:00', '1863-07-02T16:00');
  const wx = (scenario, extra = {}) => rec('G-101', 'weather_sky', '1863-07-02T12:00', '1863-07-02T16:00', 'dry and the sky is cloudy', {}, [{ type: 'weather', t: { at: '1863-07-02T14:00' }, precip_kind_in: ['none'], ...extra }], { scenario });
  const d = await mustPass(wx('default')); const gd = d.scenario_group;
  assert.deepEqual(gd.conflicts.map(c => c.id), ['CF-JUL2-CLOUD-2PM', 'CF-JUL2-SKY', 'CF-WIND-SPEED']); assert.equal(gd.complete, false, 'a record that holds in the opening scenario is not yet valid under the group'); assert.equal(gd.run.join(), 'default');
  assert.ok(gd.missing.includes('CF-JUL2-CLOUD-2PM:opt0') && gd.missing.includes('CF-WIND-SPEED:opt1') && !gd.missing.includes('default'), 'and the report names what is missing'); assert.equal(gd.excluded.length, 0); assert.deepEqual(gd.scenarios, [...gd.run, ...gd.excluded, ...gd.missing].sort((a, b) => gd.scenarios.indexOf(a) - gd.scenarios.indexOf(b)));
  const g = await mustPass(wx('group')); assert.equal(g.scenario_group.complete, true); assert.deepEqual(g.scenario_group.missing, []); assert.deepEqual(g.scenarios, g.scenario_group.scenarios, '"group" runs every scenario of the group'); assert.equal(g.assertions.length, g.scenarios.length, 'one result per scenario');
  const some = await mustPass(wx(['default', 'CF-WIND-SPEED:recommended', 'CF-WIND-SPEED:opt0'])); assert.equal(some.scenario_group.complete, false, 'some of the group is not all of it'); assert.ok(some.scenario_group.run.includes('CF-WIND-SPEED:opt0') && some.scenario_group.missing.includes('CF-WIND-SPEED:opt1'));
  const under = await mustPass(wx(['default', { id: 'my-own-name', choices: { 'CF-WIND-SPEED': 'opt1' }, from: 'default' }])); assert.ok(under.scenario_group.run.includes('CF-WIND-SPEED:opt1'), 'a scenario counts by what it chooses, not by its name');
  const inList = await mustPass(wx(['group'])); assert.equal(inList.scenario_group.complete, true, '"group" may stand in a list'); assert.deepEqual(inList.scenarios, g.scenarios);
  await mustFail(wx(['group', 'default']), 'scenario_duplicate', '"group" holds the opening scenario: listing it again is a scenario listed twice');
  // the exclusion with the reason: the values the record does not hold in
  const rest = gd.missing.map(id => ({ scenario: id, why: `the row says nothing that depends on ${id}; the check reads precipitation only (a reason of at least thirty characters)` })), ex1 = wx('default'); ex1.scenario_excludes = rest;
  const excl = await mustPass(ex1); assert.equal(excl.scenario_group.complete, true, 'every scenario of the group run or excluded with a reason'); assert.equal(excl.scenario_group.missing.length, 0); assert.deepEqual(excl.scenario_group.excluded.sort(), [...gd.missing].sort()); assert.equal(excl.excluded_scenarios.length, rest.length);
  // a check that depends on the conflict: the 2 pm cloud reading is 0.3, 0.5 or 0.7; the record that says cloud at most 0.6 is valid in two of them
  await mustPass(wx('default', { cloud_max: 0.6 }), 'in the opening scenario (0.5)'); const bad = await mustFail(wx('group', { cloud_max: 0.6 }), 'weather_mismatch', 'in the reading that puts the cloud at 0.7 (CF-JUL2-CLOUD-2PM = opt1)'); assert.ok(bad.assertions.some(a => !a.ok && a.scenario === 'CF-JUL2-CLOUD-2PM:opt1'), 'and the failure is tied to its scenario');
  assert.ok(bad.assertions.some(a => a.ok && a.scenario === 'default'));
  // a probe is not a claim: a not_realized record has no group to complete
  const probe = rec('G-101', 'not_realized', '1863-07-02T12:00', '1863-07-02T16:00', 'dry and the sky is cloudy', {}, [{ type: 'weather', t: { at: '1863-07-02T14:00' }, precip_kind_in: ['snow'] }], { intended_kind: 'weather_sky', missing: [{ code: 'weather_mismatch', detail: 'snow is not drawn' }] });
  const pr = await run(probe); assert.equal(pr.scenario_group, undefined);
  // units: the 19th Indiana's path stop is a conflict (C-043)
  A('G-102', '19th Indiana is on the field', '1863-07-01T10:20', '1863-07-01T10:50');
  const un = scenario => rec('G-102', 'unit_activity', '1863-07-01T10:20', '1863-07-01T10:50', '19th Indiana is on the field', { units: ['us-1c-1d-meredith-19in'] }, [{ type: 'unit_present', unit: 'us-1c-1d-meredith-19in' }], { scenario, place_unspecified: 'the row names no place' });
  const u1 = await mustPass(un('default')); assert.deepEqual(u1.scenario_group.conflicts.map(c => c.id), ['C-043']); assert.ok(u1.scenario_group.conflicts[0].units[0].startsWith('us-1c-1d-meredith-19in (path)')); assert.equal(u1.scenario_group.complete, false); assert.ok(u1.scenario_group.missing.includes('C-043:v0'));
  const u2 = await mustPass(un('group')); assert.equal(u2.scenario_group.complete, true);
  // structures: the readings of the structure are part of the group (the T1-015 exclusion is its reason)
  const t15 = await mustPass(ex('T1-015')); assert.equal(t15.scenario_group.complete, true); assert.deepEqual(t15.scenario_group.excluded, ['structure:bld-rock-creek-rr-bridge=jun27']); assert.deepEqual(t15.scenario_group.readings, { 'bld-rock-creek-rr-bridge': ['jun26', 'jun27'] });
  const no15 = ex('T1-015'); delete no15.scenario_excludes; const n15 = await mustPass(no15); assert.equal(n15.scenario_group.complete, false, 'without its exclusion the record leaves the reading jun27 open'); assert.deepEqual(n15.scenario_group.missing, ['structure:bld-rock-creek-rr-bridge=jun27']);
});
test('rule: the totals count the realized rows whose group is not complete (check.mjs summarize, q17Of)', () => {
  const row = (o = {}) => coverageOf({ realized: false, kind: 'weather_sky', codes: [], record: 'x:1', in_clock: true, ...o }, []);
  const rows = { a: row({ realized: true, scenario_group: { complete: true } }), b: row({ realized: true, scenario_group: { complete: false } }), c: row({ realized: true }), d: row({ scenario_group: { complete: false } }) };
  const S = summarize(rows, {}); assert.equal(S.timeline.realized_group_incomplete, 1, 'a realized row whose group is open; a row not realized is counted elsewhere'); assert.equal(q17Of(S, { timelineRows: 4, epilogueRows: 0 }).realized_group_incomplete, 1);
});
