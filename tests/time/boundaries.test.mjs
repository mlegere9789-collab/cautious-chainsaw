// Boundary tests found by mutating the module itself (a scratch mutation run of ~50 one-line mutants against the unit tests): the comparisons at the
// edges of the day-part windows, the "about" threshold, the exact/clamped flag and the half-segment hour step were not pinned by any assertion.
import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import m, { makeTimeModel, makeCore, validateAnchors } from '../../src/lib/time/index.js';
// Evidence reason (docs/time/ANCHORS-FINAL.md): the numeric pins in this file describe the FROZEN 2026-09-30 proposal; the live adjudicated file moves anchors and widens windows.
import { proposal as doc, proposalModel } from './helpers.mjs';

const hm = (s) => +s.slice(0, 2) * 60 + +s.slice(3);
const iso = (min) => `1863-07-${String(1 + Math.floor(min / 1440)).padStart(2, '0')}T${String(Math.floor((min % 1440) / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

describe('day parts follow the solar table minute by minute (an independent oracle of chapter 04 section 4.7)', () => {
  // one anchor pair one minute per tick, so tick n is minute n-1 of July 1; solar days differ so the per-day lookup is exercised too
  const solar = (dawn, rise, set, dusk, naut) => ({ civil_dawn: dawn, sunrise: rise, noon: '12:03', sunset: set, civil_dusk: dusk, nautical_dusk: naut });
  const day = (min0, min1) => ({ schema: 1, version: '2026-01-01.1', dv: 2, tz: 'LMT', tick_max: min1 - min0 + 1, approx_sigma_min: 10, sigma_cap_min: 30, gaps: [], tab_days: [[1, min1 - min0 + 1]],
    solar: { '1863-07-01': solar('04:03', '04:35', '19:32', '20:04', '20:46'), '1863-07-02': solar('05:10', '05:58', '18:00', '18:30', '19:20') },
    anchors: [{ tick: 1, t: iso(min0), sigma_min: 10, status: 'S' }, { tick: min1 - min0 + 1, t: iso(min1), sigma_min: 10, status: 'S' }] });
  const oracle = (mod, s) => { const dawn = hm(s.civil_dawn), rise = hm(s.sunrise), set = hm(s.sunset), naut = hm(s.nautical_dusk); return mod < dawn ? 'night' : mod < rise + 60 ? 'dawn' : mod < 720 ? 'morning' : mod < set - 120 ? 'afternoon' : mod < set ? 'evening' : mod < naut ? 'dusk' : 'night'; };
  test('every minute of July 1 and July 2 (2880 ticks at 1 min/tick): the phase equals the oracle, including the minute before and after each window edge', () => {
    const d = day(0, 2879), mm = makeTimeModel(d), pieces = { 1: d.solar['1863-07-01'], 2: d.solar['1863-07-02'] };
    for (let t = 1; t <= d.tick_max; t++) { const min = t - 1, dayNo = min < 1440 ? 1 : 2, mod = min % 1440; assert.equal(mm.tickToMinutes(t), min); assert.equal(mm.dayPart(t), oracle(mod, pieces[dayNo]), `minute ${min} (day ${dayNo}, ${String(Math.floor(mod / 60)).padStart(2, '0')}:${String(mod % 60).padStart(2, '0')})`); }
  });
  test('the default solar table: dawn opens at 04:03, morning at 05:35 (sunrise + 60), afternoon at 12:00, evening at 17:32, dusk at 19:32, night at 20:46', () => {
    const edges = [[243, 'dawn'], [335, 'morning'], [720, 'afternoon'], [1052, 'evening'], [1172, 'dusk'], [1246, 'night']];
    const d = day(0, 1439), mm = makeTimeModel(d);
    for (const [min, phase] of edges) { assert.equal(mm.dayPart(min + 1), phase, `at ${min}`); assert.notEqual(mm.dayPart(min), phase, `the minute before ${min}`); }
    assert.equal(mm.dayPart(1), 'night'); assert.equal(mm.dayPart(243), 'night'); assert.equal(mm.dayPart(1440), 'night');
  });
  test('the lean core agrees minute by minute (what the inline bridge ships)', () => {
    const d = day(0, 2879), mm = makeTimeModel(d), core = makeCore(d); for (let t = 1; t <= d.tick_max; t += 3) assert.equal(core.dayPart(t), mm.dayPart(t));
  });
});

describe('"about": sigma >= approx_sigma_min, or any bounding anchor not signed', () => {
  const two = (s1, s2, state) => ({ schema: 1, approx_sigma_min: 10, tick_max: 3, anchors: [{ tick: 1, t: '1863-07-01T05:00', sigma_min: s1, status: 'S', state, decision: 'D-1' }, { tick: 3, t: '1863-07-01T05:10', sigma_min: s2, status: 'S', state, decision: 'D-1' }] });
  test('signed anchors: sigma 9 is exact, sigma 10 (equal to the threshold) is approximate, the midpoint of 9 and 9 is exact, of 9 and 11 is approximate (10.0)', () => {
    const a = makeTimeModel(two(9, 10, 'signed')); assert.equal(a.isApprox(1), false); assert.equal(a.isApprox(3), true, 'sigma == threshold prints "about"'); assert.equal(a.isApprox(2), false, 'interpolated 9.5');
    const b = makeTimeModel(two(9, 11, 'signed')); assert.equal(b.isApprox(2), true, 'interpolated 10.0 == threshold'); assert.equal(makeTimeModel(two(9, 9, 'signed')).isApprox(2), false);
    for (const t of [1, 2, 3]) assert.equal(makeTimeModel(two(5, 5, 'proposed')).isApprox(t), true, 'unsigned is always approximate');
    assert.equal(makeTimeModel(two(5, 5, 'confirmed')).isApprox(1), true, 'only "signed" clears it');
  });
  test('one unsigned bounding anchor makes the segment approximate; an exact anchor speaks for itself', () => {
    const d = two(5, 5, 'signed'); d.anchors[1].state = 'proposed'; const x = makeTimeModel(d);
    assert.equal(x.isApprox(1), false, 'the signed anchor at tick 1 speaks for itself'); assert.equal(x.isApprox(2), true); assert.equal(x.isApprox(3), true);
    assert.equal(x.tickToClock(1).signed, true); assert.equal(x.tickToClock(2).signed, false);
  });
});

describe('exact / clamped flags at the ends of the clock', () => {
  test('clockToTickInfo: the first and last anchor minutes are exact (inclusive), one minute outside is not', () => {
    const first = m.tickToMinutes(1), last = m.tickToMinutes(675);
    assert.deepEqual(m.clockToTickInfo(first), { tick: 1, exact: true }); assert.deepEqual(m.clockToTickInfo(last), { tick: 675, exact: true });
    assert.deepEqual(m.clockToTickInfo(first - 1), { tick: 1, exact: false }); assert.deepEqual(m.clockToTickInfo(last + 1), { tick: 675, exact: false });
    assert.equal(m.clockToTickInfo('1863-07-01T05:00').exact, true); assert.equal(m.clockToTickInfo('1863-07-01T04:59').exact, false); assert.equal(m.clockToTickInfo('1863-07-03T20:00').exact, true); assert.equal(m.clockToTickInfo('1863-07-03T20:01').exact, false);
  });
  test('tickToClock: exact/clamped at 0, 1, 675, 676 and fractions', () => {
    assert.deepEqual([0, 1, 675, 676, 1.5].map((t) => [m.tickToClock(t).clamped, m.tickToClock(t).exact]), [[true, false], [false, true], [false, true], [true, false], [false, true]]);
  });
});

describe('tickAfterMinutes at exactly half a segment (the nudge branch)', () => {
  test('on a dyadic segment (t240-248 is 18.75 min/tick, t248-256 is 11.25) a move of exactly half a tick is never a no-op, in either direction, at every tick', () => {
    for (const [a, b, mpt] of [[240, 248, 18.75], [248, 256, 11.25]]) {
      assert.equal((proposalModel.tickToMinutes(b) - proposalModel.tickToMinutes(a)) / (b - a), mpt);
      for (let t = a + 1; t < b; t++) { assert.equal(proposalModel.tickAfterMinutes(t, mpt / 2), t + 1, `+half at ${t}`); assert.equal(proposalModel.tickAfterMinutes(t, -mpt / 2), t - 1, `-half at ${t}`); }
    }
  });
  test('just under half a tick may round back to the same tick (only |dm| >= half a segment is guaranteed to move)', () => {
    assert.equal(proposalModel.tickAfterMinutes(244, 9.3), 244); assert.equal(proposalModel.tickAfterMinutes(244, -9.3), 244);
  });
});

describe('solar table lookup: a day without its own entry uses July 1, a document without a table uses the built-in July 1 values', () => {
  const base = (solar) => ({ schema: 1, tick_max: 2880, approx_sigma_min: 10, ...(solar ? { solar } : {}), anchors: [{ tick: 1, t: '1863-07-01T00:00', sigma_min: 10, status: 'S' }, { tick: 2880, t: '1863-07-02T23:59', sigma_min: 10, status: 'S' }] });
  const table = (rise) => ({ civil_dawn: '05:00', sunrise: rise, noon: '12:03', sunset: '19:32', civil_dusk: '20:04', nautical_dusk: '20:46' });
  test('July 2 with only a July 1 entry (sunrise 06:00, dawn 05:00) follows that entry, not the built-in 04:03/04:35', () => {
    const mm = makeTimeModel(base({ '1863-07-01': table('06:00') })); const min = (day, hhmm) => day * 1440 + hm(hhmm) + 1; // tick of a minute
    assert.equal(mm.dayPart(min(1, '04:30')), 'night'); assert.equal(mm.dayPart(min(1, '05:30')), 'dawn'); assert.equal(mm.dayPart(min(1, '06:59')), 'dawn'); assert.equal(mm.dayPart(min(1, '07:00')), 'morning');
    assert.equal(mm.dayPart(min(0, '04:30')), 'night'); assert.equal(mm.dayPart(min(0, '05:30')), 'dawn'); assert.equal(mm.dayPart(min(0, '06:59')), 'dawn'); assert.equal(mm.dayPart(min(0, '07:00')), 'morning');
    assert.equal(mm.format(min(1, '04:50'), 'day'), 'Night of July 1-2'); assert.equal(mm.format(min(1, '05:00'), 'day'), 'July 2');
  });
  test('a document with no solar table at all uses the built-in July 1 values (dawn 04:03, sunrise 04:35, sunset 19:32, nautical dusk 20:46)', () => {
    const mm = makeTimeModel(base(null)); const at = (hhmm) => hm(hhmm) + 1;
    assert.deepEqual(['04:02', '04:03', '05:34', '05:35', '11:59', '12:00', '17:31', '17:32', '19:31', '19:32', '20:45', '20:46'].map((s) => mm.dayPart(at(s))), ['night', 'dawn', 'dawn', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'dusk', 'dusk', 'night']);
  });
});

describe('the lull threshold is over 15 min/tick, exactly 15 is not a lull (the model flag and the validator agree)', () => {
  const two = (mins) => ({ schema: 1, version: '2026-01-01.1', dv: 2, tz: 'LMT', tick_max: 11, approx_sigma_min: 10, sigma_cap_min: 30, gaps: [], tab_days: [[1, 11]], solar: { '1863-07-01': { civil_dawn: '04:03', sunrise: '04:35', noon: '12:03', sunset: '19:32', civil_dusk: '20:04', nautical_dusk: '20:46' } },
    anchors: [{ tick: 1, t: '1863-07-01T05:00', sigma_min: 10, status: 'M', confidence: 'B', state: 'proposed' }, { tick: 11, t: `1863-07-01T${String(Math.floor((300 + mins) / 60)).padStart(2, '0')}:${String((300 + mins) % 60).padStart(2, '0')}`, sigma_min: 10, status: 'M', confidence: 'B', state: 'proposed' }] });
  test('150 minutes over 10 ticks (15.0) is not a lull; 155 (15.5) is; stalls are under 1.5', () => {
    assert.equal(makeTimeModel(two(150)).tickToClock(5).lull, false); assert.equal(makeTimeModel(two(155)).tickToClock(5).lull, true);
    assert.equal(validateAnchors(two(150)).warnings.some((w) => w.code === 'V1.lull'), false); assert.equal(validateAnchors(two(155)).warnings.some((w) => w.code === 'V1.lull'), true);
    assert.equal(validateAnchors(two(14)).info.stalls.length, 1); assert.equal(validateAnchors(two(15)).info.stalls.length, 0);
  });
});

describe('a contested anchor with a single-time range is still contested', () => {
  test('status R (or state contested) with range [t, t]: anchorRange says "about", contested true', () => {
    const d = { schema: 1, tick_max: 3, approx_sigma_min: 10, anchors: [{ tick: 1, t: '1863-07-01T05:00', sigma_min: 10, status: 'S', range: ['05:00', '05:00'] }, { tick: 3, t: '1863-07-01T05:10', sigma_min: 10, status: 'R', range: ['05:10', '05:10'] }] };
    const mm = makeTimeModel(d); assert.deepEqual(mm.anchorRange(3), { from: '05:10', to: '05:10', text: 'about 5:10 AM', contested: true }); assert.equal(mm.anchorRange(1).contested, false);
    d.anchors[0].state = 'contested'; assert.equal(makeTimeModel(d).anchorRange(1).contested, true);
  });
});

describe('the solar table must be strictly ordered: equal neighbouring times are an error', () => {
  test('civil_dawn < sunrise < noon < sunset < civil_dusk < nautical_dusk, each step at least one minute', () => {
    const d = JSON.parse(JSON.stringify(doc)); assert.equal(validateAnchors(d).ok, true);
    for (const [a, b] of [['civil_dawn', 'sunrise'], ['sunrise', 'noon'], ['noon', 'sunset'], ['sunset', 'civil_dusk'], ['civil_dusk', 'nautical_dusk']]) {
      const e = JSON.parse(JSON.stringify(doc)); e.solar['1863-07-01'][b] = e.solar['1863-07-01'][a]; const r = validateAnchors(e);
      assert.ok(r.errors.some((x) => x.code === 'V1.solar'), a + ' == ' + b + ' must be rejected');
    }
  });
});
