// The solar table in time_anchors.json is reproducible from the NOAA algorithm within 2 minutes (TX-10), and the model's phases follow it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { solarTable, jdn } from '../../tools/time/solar.mjs';
import { doc, model } from './helpers.mjs';

const mm = (s) => +s.slice(0, 2) * 60 + +s.slice(3);

test('Julian day sanity: 2000-01-01 is 2451545 (noon) and days step by one', () => {
  assert.equal(jdn(2000, 1, 1), 2451545);
  assert.equal(jdn(1863, 7, 2) - jdn(1863, 7, 1), 1);
});

test('the NOAA algorithm reproduces the table for July 1-3 1863 at Gettysburg within 2 minutes (local mean time)', () => {
  for (const d of [1, 2, 3]) {
    const t = solarTable(1863, 7, d), table = doc.solar[`1863-07-0${d}`];
    for (const k of ['civil_dawn', 'sunrise', 'noon', 'sunset', 'civil_dusk', 'nautical_dusk']) assert.ok(Math.abs(t.minutes[k] - mm(table[k])) <= 2, `July ${d} ${k}: computed ${t.hm[k]}, table ${table[k]}`);
  }
  const t = solarTable(1863, 7, 1); console.log(`# July 1 1863 LMT: dawn ${t.hm.civil_dawn} sunrise ${t.hm.sunrise} noon ${t.hm.noon} sunset ${t.hm.sunset} dusk ${t.hm.civil_dusk} nautical ${t.hm.nautical_dusk}; EoT ${t.eot.toFixed(1)} min`);
});

test('TX-10 targets: sunrise 04:35 and sunset 19:32 (+-2 min); the table is strictly ordered', () => {
  const s = doc.solar['1863-07-01']; assert.equal(s.sunrise, '04:35'); assert.equal(s.sunset, '19:32');
  assert.ok(mm(s.civil_dawn) < mm(s.sunrise) && mm(s.sunrise) < mm(s.noon) && mm(s.noon) < mm(s.sunset) && mm(s.sunset) < mm(s.civil_dusk) && mm(s.civil_dusk) < mm(s.nautical_dusk));
});

test('model phases follow the solar table: the first-light anchors (t226, t451) are at dawn, night ends before them', () => {
  assert.equal(model.dayPart(226), 'dawn'); assert.equal(model.dayPart(451), 'dawn'); assert.equal(model.dayPart(225), 'dawn', '04:26 is after civil dawn 04:03');
  assert.equal(model.dayPart(200), 'night'); assert.equal(model.dayPart(538), 'afternoon'); assert.equal(model.dayPart(568), 'afternoon'); assert.equal(model.dayPart(600), 'evening'); assert.equal(model.dayPart(675), 'dusk');
  const phases = new Set(); for (let t = 1; t <= 675; t++) phases.add(model.dayPart(t)); assert.deepEqual([...phases].sort(), ['afternoon', 'dawn', 'dusk', 'evening', 'morning', 'night']);
});
