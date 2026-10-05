// ADVERSARIAL VERIFIER: PASSING tests that pin the verifier's OWN reading of the printed pages (2026-10-04).
// The verifier looked at the page images of the Internet Archive scans (not at their OCR text) and typed the figures below before comparing them with
// data-src/ledger/visual_readings.json and conflict_ledger.json. All of them agree; they guard against later corruption of the committed readings.
// node --test tests/ledger/verify-page-readings.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const L = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'ledger', f), 'utf8'));
const ledger = L('conflict_ledger.json'), vr = L('visual_readings.json').readings;
const reading = (id) => vr.find((r) => r.id === id);
const val = (r, v) => ledger.rows.find((x) => x.id === r).values.find((x) => x.id === v);
const z = (a) => a.map((x) => (x === null ? 0 : x));
const sumCols = (rows) => rows[0].map((_, c) => rows.reduce((s, r) => s + r[c], 0));

// OR vol. 27 pt. 1 p. 187, "RECAPITULATION": killed off/men, wounded off/men, captured-or-missing off/men, aggregate
const OR187 = { 'General headquarters': [0, 0, 2, 2, 0, 0, 4], 'First Army Corps': [42, 624, 262, 2969, 83, 2079, 6059], 'Second Army Corps': [66, 731, 270, 2924, 13, 365, 4369],
  'Third Army Corps': [50, 543, 251, 2778, 14, 575, 4211], 'Fifth Army Corps': [28, 337, 129, 1482, 1, 210, 2187], 'Sixth Army Corps': [2, 25, 14, 171, 0, 30, 242],
  'Eleventh Army Corps': [33, 336, 120, 1802, 62, 1448, 3801], 'Twelfth Army Corps': [18, 186, 43, 769, 2, 64, 1082], 'Cavalry Corps': [5, 86, 39, 315, 8, 399, 852],
  'Artillery Reserve': [2, 41, 15, 172, 0, 12, 242] };
const OR187_TOTAL = [246, 2909, 1145, 13384, 183, 5182, 23049];

test('OR vol. 27 pt. 1 p. 187: the verifier\'s own reading of the ten rows and the total equals the committed reading, and every row and column adds up (23,049)', () => {
  const t = reading('VR-or1-p187-recap').table;
  assert.equal(t.rows.length, 10);
  for (const row of t.rows) assert.deepEqual(z(row.slice(1)), OR187[row[0]], row[0]);
  assert.deepEqual(z(t.total_row.slice(1)), OR187_TOTAL);
  assert.deepEqual(sumCols(Object.values(OR187)), OR187_TOTAL);
  for (const r of Object.values(OR187)) assert.equal(r[0] + r[1] + r[2] + r[3] + r[4] + r[5], r[6]);
  const f = val('WSD-01', 'v4').figures;
  assert.deepEqual([f.killed, f.wounded, f.missing, f.total], [246 + 2909, 1145 + 13384, 183 + 5182, 23049]);
  assert.equal(23049 - 242 - 4, 22803); // the site's eight-corps sum
});

test('OR vol. 27 pt. 2 p. 346: the Confederate recapitulation (2,592 / 12,709 / 5,150 / 20,451) and the 12,227 and 6,802 of the note', () => {
  const rows = [[910, 4339, 2290, 7539], [809, 3823, 1305, 5937], [837, 4407, 1491, 6735], [36, 140, 64, 240]];
  assert.deepEqual(sumCols(rows), [2592, 12709, 5150, 20451]);
  for (const r of rows) assert.equal(r[0] + r[1] + r[2], r[3]);
  const t = reading('VR-or2-p346-recap').table;
  assert.deepEqual(t.rows.map((r) => r.slice(1)), rows);
  assert.deepEqual(t.total_row.slice(1), [2592, 12709, 5150, 20451]);
  assert.deepEqual(val('WSD-08', 'v3').figures, { captured: 12227, of_which_wounded: 6802 });
  assert.equal(12227 - (5150 + 275), 6802); // observation: the verifier found this identity; the ledger does not use it
});

test('Fox p. 25 (printed page 25 in the head, read from the image): 3,063 / 14,492 / 5,435 = 22,990 and 5,291 killed or died of wounds; every row and column adds up', () => {
  const FOX = { 'General Headquarters': [0, 4, 0, 4, 0], '1st Army Corps': [593, 3209, 2222, 6024, 1098], '2d Army Corps': [796, 3186, 368, 4350, 1238], '3d Army Corps': [578, 3026, 606, 4210, 1050],
    '5th Army Corps': [365, 1611, 211, 2187, 593], '6th Army Corps': [27, 185, 30, 242, 46], '11th Army Corps': [368, 1922, 1511, 3801, 724], '12th Army Corps': [204, 810, 67, 1081, 320],
    'Cavalry Corps': [90, 352, 407, 849, 152], 'Reserve Artillery': [42, 187, 13, 242, 70] };
  const t = reading('VR-fox-p25').table;
  for (const row of t.rows) assert.deepEqual(z(row.slice(1)), FOX[row[0]], row[0]);
  assert.deepEqual(z(t.total_row.slice(1)), [3063, 14492, 5435, 22990, 5291]);
  assert.deepEqual(sumCols(Object.values(FOX)), [3063, 14492, 5435, 22990, 5291]);
  for (const r of Object.values(FOX)) assert.equal(r[0] + r[1] + r[2], r[3]);
  assert.deepEqual(val('WSD-01', 'v5').figures, { killed: 3063, wounded: 14492, missing: 5435, total: 22990 });
});

test('Fox p. 26 and p. 402 (First Minnesota), p. 555-556 (26th North Carolina): 262 engaged, 215 on July 2, 224 for the battle; 50/174 on p. 26 against 51/173 on p. 402; 820 present, 86 + 502 = 588 = 71.7%', () => {
  assert.equal(50 + 174, 224); assert.equal(51 + 173, 224);
  assert.deepEqual(val('WSD-12', 'v2').figures, { killed: 50, wounded: 174, total: 224 });
  assert.deepEqual(val('WSD-12', 'v3').figures, { engaged: 262, killed_and_wounded: 215, killed: 51, wounded: 173, total: 224 });
  assert.equal(Math.round(((86 + 502) / 820) * 1000) / 10, 71.7);
  assert.deepEqual(val('WSD-13', 'v2').figures, { present: 820, killed: 86, wounded: 502, per_cent: 71.7 });
  assert.deepEqual(val('WSD-13', 'v1').figures, { engaged_over: 800, killed: 86, wounded: 502, killed_and_wounded: 588, missing_about: 120 });
});

test('Livermore pp. 102-103 (page numbers read from the heads): Union 83,289 / 3,155 + 14,529 = 17,684 / 5,365; Confederate components 22,638 + 5,425 = 28,063 and the footnote total 28,070 (7 more)', () => {
  assert.equal(3155 + 14529, 17684); assert.equal(87312 - 9058, 78254);
  assert.equal(2592 + 1311, 3903); assert.equal(12709 + 6026, 18735); assert.equal(3903 + 18735, 22638); assert.equal(5150 + 275, 5425);
  assert.equal(22638 + 5425, 28063); assert.equal(50306 - 669, 49637); assert.equal(49637 + 28070, 77707); assert.equal(75992 - 938, 75054);
  const f = val('WSD-02', 'v2');
  assert.equal(f.figures.footnote_total, 28070); assert.equal(f.derived.total, 28063);
  assert.equal(val('WSD-09', 'v1').figures.engaged, 83289); assert.equal(val('WSD-10', 'v1').figures.engaged, 75054);
});

test('OR vol. 27 pt. 1 p. 113 (list inclosed with Meade\'s letter of August 3, 1863), pp. 17 and 118, p. 198 (Letterman)', () => {
  assert.equal(243 + 2591, 2834); assert.equal(1076 + 12637, 13713); assert.equal(215 + 6428, 6643); assert.equal(2834 + 13713 + 6643, 23190);
  assert.equal(2834 + 13709 + 6643, 23186); assert.equal(14193 + 6802, 20995); assert.equal(14529 + 6802, 21331);
  assert.deepEqual(val('WSD-01', 'v1').figures, { killed: 2834, wounded: 13713, missing: 6643, total: 23190 });
  assert.deepEqual(val('WSD-01', 'v2').figures, { killed: 2834, wounded: 13709, missing: 6643, total: 23186 });
  assert.equal(val('WSD-04', 'v3').figures.wounded, 14193);
  assert.equal(val('WSD-20', 'v1').figures.wounded_total, 20995);
});

test('the three cemetery reports (page images read): 1864 text 3,512 (Pennsylvania 501); 1865 text 3,512 but its synopsis table adds up to 3,555; 1867 text and table 3,564 (Pennsylvania 534, New York 867)', () => {
  const S65 = [104, 49, 61, 159, 12, 22, 866, 78, 526, 15, 22, 11, 131, 80, 6, 171, 73, 52, 138, 411, 425, 143];
  const S67 = S65.map((n, i) => (i === 6 ? 867 : i === 8 ? 534 : n));
  const add = (a) => a.reduce((s, n) => s + n, 0);
  assert.equal(add(S65), 3555); assert.equal(add(S67), 3564);
  assert.deepEqual(ledger.quotes.find((q) => q.id === 'Q-cem65-table').sum_check.numbers, S65);
  assert.deepEqual([1, 2, 3, 4].map((i) => val('WSD-11', 'v' + i).figures.burials), [3512, 3512, 3555, 3564]);
});

test('time and gun statements (page images read): Doubleday 10.15; Howard despatch 11.15 and report 11.30; Schurz 11.30; cannonade 1 p.m. (Lee, Pendleton, Cabell, Hunt, Newton, Hancock, Harrow), 1.07 (Jacobs), 1.30 (Peyton, Taft); guns 100-120 / 120 / 100+ / nearly 150 / 150', () => {
  const t = (r, v) => val(r, v).figures.time;
  assert.deepEqual(['v1', 'v2', 'v3', 'v4'].map((v) => t('WSD-14', v)), ['10:15 a.m.', '11:15 a.m.', '11:30 a.m.', '11:30 a.m.']);
  assert.deepEqual(['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'].map((v) => t('WSD-15', v)),
    ['1:00 p.m.', '1:00 p.m.', '1:00 p.m.', '1:30 p.m.', '1:00 p.m.', '1:00 p.m.', '1:00 p.m.', '1:00 p.m.', '1:07 p.m.', '1:30 p.m.']);
  assert.deepEqual(val('WSD-16', 'v1').figures, { guns_low: 100, guns_high: 120 });
  assert.equal(val('WSD-16', 'v2').figures.guns, 120); assert.equal(val('WSD-16', 'v3').figures.guns_at_least, 100);
  assert.equal(val('WSD-16', 'v4').figures.guns, 150); assert.equal(val('WSD-16', 'v5').figures.guns_each_side, 150);
});
