// k001.test.mjs - K001 checks EVERY field the loader emits, not a hand-picked eleven (verifier defect V-04).
// The mutation is applied to every (collection, field) of the loaded site data in memory (fast): the field is removed from every record, and the check must name exactly that field.
// The end-to-end version (rename strength and casualties in six data files, run the whole build) is the verifier's V-04.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadSite } from '../../tools/historian/lib/load.mjs';
import { fieldCoverage, checkCoverage, populated } from '../../tools/historian/lib/coverage.mjs';
import { ROOT } from './lib/data.mjs';

const site = loadSite(path.join(ROOT, 'legacy/dist/data'));
const baseline = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/historian/data/field-coverage.v1.json'), 'utf8'));
const actual = fieldCoverage(site);

test('control: the real data matches the recorded baseline exactly (no finding)', () => {
  assert.deepEqual(checkCoverage(actual, baseline), []);
  assert.ok(Object.keys(baseline.collections).length >= 15);
});

test('populated(): zero, false and non-empty values are populated; null, undefined, empty strings, arrays, objects and NaN are not', () => {
  for (const v of [0, false, 'x', [1], { a: 1 }, 1863]) assert.equal(populated(v), true, JSON.stringify(v));
  for (const v of [null, undefined, '', '   ', [], {}, NaN]) assert.equal(populated(v), false, String(v));
});

test('every field of every collection that the loader emits is covered: removing it from all records is reported by name', () => {
  let n = 0; const missed = [];
  for (const [name, b] of Object.entries(baseline.collections)) {
    for (const [field, have] of Object.entries(b.fields)) {
      if (have === 0) continue;                                            // a field the data never populates cannot go missing
      const clone = { ...site, [name]: structuredClone(site[name]) };
      for (const rec of clone[name]) { if (field.includes('.')) { const [a, c] = field.split('.'); if (rec[a] && typeof rec[a] === 'object') delete rec[a][c]; } else delete rec[field]; }
      const found = checkCoverage(fieldCoverage(clone), baseline);
      if (!found.some((f) => f.msg.startsWith(`${name}.${field} `))) missed.push(`${name}.${field}`);
      n++;
    }
  }
  assert.ok(n >= 100, `only ${n} fields exercised`);
  assert.deepEqual(missed, [], 'fields whose disappearance the build would not notice');
});

test('renaming a field (the strength -> men drift) is reported both as a missing field and as a new one', () => {
  const clone = { ...site, regiments: structuredClone(site.regiments) };
  for (const r of clone.regiments) { r.men = r.strength; delete r.strength; }
  const msgs = checkCoverage(fieldCoverage(clone), baseline).map((f) => f.msg);
  assert.ok(msgs.some((m) => m.startsWith('regiments.strength is no longer loaded')), msgs.join(' | '));
  assert.ok(msgs.some((m) => m.startsWith('regiments.men is a new whitelisted field')), msgs.join(' | '));
});

test('emptying a field in most records (a source that keeps the key but lost the values) is reported with the percentages', () => {
  const clone = { ...site, chronology: structuredClone(site.chronology) };
  clone.chronology.forEach((e, i) => { if (i % 5) e.event = ''; });
  const msgs = checkCoverage(fieldCoverage(clone), baseline).map((f) => f.msg);
  assert.ok(msgs.some((m) => /^chronology\.event is populated in \d+\/\d+ records \(2\d%\), recorded \d+\/\d+ \(100%\)/.test(m)), msgs.join(' | '));
});

test('a sparse field may not lose half of its records or vanish; a small collection may not lose a value', () => {
  const clone = { ...site, regiments: structuredClone(site.regiments) };
  for (const r of clone.regiments) if (r.notes) r.notes = null;             // 4 of 467 populate it
  assert.ok(checkCoverage(fieldCoverage(clone), baseline).some((f) => f.msg.startsWith('regiments.notes ')));
  const small = { ...site, armies: structuredClone(site.armies) }; small.armies[0].commander = null;
  assert.ok(checkCoverage(fieldCoverage(small), baseline).some((f) => f.msg.startsWith('armies.commander')));
});

test('a collection that shrinks by a fifth or disappears, a new collection, and a missing baseline are all reported', () => {
  const shrunk = { ...site, vignettes: site.vignettes.slice(0, Math.floor(site.vignettes.length * 0.5)) };
  assert.ok(checkCoverage(fieldCoverage(shrunk), baseline).some((f) => /^collection vignettes has \d+ records, recorded \d+/.test(f.msg)));
  const gone = { ...site }; delete gone.monuments;
  assert.ok(checkCoverage(fieldCoverage(gone), baseline).some((f) => /^collection monuments is no longer loaded/.test(f.msg)));
  assert.ok(checkCoverage(actual, { collections: { ...baseline.collections, ghost: { n: 3, fields: { a: 3 } } } }).some((f) => /^collection ghost is no longer loaded/.test(f.msg)));
  assert.ok(checkCoverage({ ...actual, extra: { n: 1, fields: { x: 1 } } }, baseline).some((f) => /^collection extra is new/.test(f.msg)));
  assert.match(checkCoverage(actual, null)[0].msg, /baseline .* is missing/);
});

test('improving coverage (a field that used to be sparse is filled in) is not an error', () => {
  const clone = { ...site, regiments: structuredClone(site.regiments) };
  for (const r of clone.regiments) if (!r.notes) r.notes = 'a note';
  assert.deepEqual(checkCoverage(fieldCoverage(clone), baseline), []);
});
