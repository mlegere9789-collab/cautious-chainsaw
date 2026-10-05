// ADVERSARIAL VERIFIER (sky/weather/ledger datasets). node --test tests/environment/verify-weather.test.mjs
// Every test here FAILS on the committed state of data-src/environment/weather_by_day.json and tools/environment/validate.mjs.
// Each one is either (a) a seeded error that validateWeather() accepts although it should not, or (b) a wrong statement found in the committed data.
// Evidence for each is in the test title and message. A test turns green when the validator or the data is fixed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateWeather } from '../../tools/environment/validate.mjs';
import { CACHE_DIR } from '../../tools/environment/fetch.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const weather = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'environment', 'weather_by_day.json'), 'utf8'));
const obs = (w, id) => w.observations.find((o) => o.id === id);
const quote = (w, id) => w.quotes.find((q) => q.id === id);
const source = (w, id) => w.sources.find((s) => s.id === id);
const accepted = async (w, label) => { const r = await validateWeather(w); assert.ok(r.errors.length > 0, `${label}: validateWeather accepted a seeded error (0 errors)`); };

// ---------------------------------------------------------------- the pitch trap: June 26 versus July 1
test('VERIFY-W1: the "wet from the rain" quote re-dated to July 1 (the pitch\'s mistake) must be rejected; the page heading says Friday, June 26 (Notes p. 14, line "Friday, June 26." precedes p. 16 and "Saturday, June 27." is on p. 18)', async () => {
  const w = weather();
  quote(w, 'Q-N-wet-jun26').date = '1863-07-01';
  await accepted(w, 'quote date');
});
test('VERIFY-W2: the observation W-1863-06-26-wet-brigade dated July 1 must be rejected (same trap, observation level)', async () => {
  const w = weather();
  obs(w, 'W-1863-06-26-wet-brigade').date = '1863-07-01';
  await accepted(w, 'observation date');
});

// ---------------------------------------------------------------- values that are not tied to their quote or to each other
test('VERIFY-W3: a wind direction that the quote does not contain (S.S.W. -> N.N.W., quote says "Wind S. S. W., very gentle") must be rejected', async () => {
  const w = weather();
  obs(w, 'W-1863-07-03-wind-direction').value = 'N.N.W.';
  await accepted(w, 'wind direction');
});
test('VERIFY-W4: the contested block must agree with the observation it describes (ECW value 12 -> 21 in contested[C-wind-jul1]; the observation and the ledger still say 12)', async () => {
  const w = weather();
  w.contested.find((c) => c.id === 'C-wind-jul1').values[1].value = 21;
  await accepted(w, 'contested block');
});
test('VERIFY-W5: a temperature reading given in degrees Celsius must be rejected (the table has no unit; the file infers Fahrenheit for all 30 readings, and 87 C is impossible)', async () => {
  const w = weather();
  obs(w, 'W-1863-07-03-temp-2pm').unit_inferred = 'degrees Celsius';
  await accepted(w, 'unit');
});
test('VERIFY-W6: a wrong weekday must be rejected (1863-07-03 was a Friday)', async () => {
  const w = weather();
  w.days.find((d) => d.date === '1863-07-03').weekday = 'Saturday';
  await accepted(w, 'weekday');
});

// ---------------------------------------------------------------- rights: the ledger validator checks "A1 = imprint year before 1931"; the weather validator does not
test('VERIFY-W7: an A1 source with imprint_year 1935 and rights "public domain by date" must be rejected (Jacobs 1885 article)', async () => {
  const w = weather();
  source(w, 'jacobs-meteorology-1885').imprint_year = 1935;
  await accepted(w, 'imprint year 1935');
});
test('VERIFY-W8: an A1 source (Haskell reprint) whose imprint_year is set to 1948 must be rejected', async () => {
  const w = weather();
  source(w, 'haskell-1908').imprint_year = 1948;
  await accepted(w, 'imprint year 1948');
});
test('VERIFY-W9: a rights statement that says the work is in copyright, on an A1 source, must be rejected', async () => {
  const w = weather();
  source(w, 'jacobs-notes-1864').rights = 'in copyright until 2030';
  await accepted(w, 'rights text');
});

// ---------------------------------------------------------------- provenance fields invented or altered
test('VERIFY-W10: an invented page for the 1885 article (the file says UNKNOWN, no scan was seen) must be rejected', async () => {
  const w = weather();
  source(w, 'jacobs-meteorology-1885').page = 'p. 2, col. 3';
  await accepted(w, 'invented page');
});
test('VERIFY-W11: a pitch check flipped without evidence (PC1: "July 2: 74, 81 and 76" agrees=true) must be rejected; pitch_checks are not recomputed from the observations', async () => {
  const w = weather();
  w.pitch_checks.find((p) => p.id === 'PC1').agrees = false;
  await accepted(w, 'pitch check');
});

// ---------------------------------------------------------------- a wrong statement in the committed data
test('VERIFY-W12: the MRCC "keyed stations" note must list the Pennsylvania stations that the page lists. The MRCC page (in the builder\'s own cache) names TWELVE Pennsylvania stations (it adds Quakertown and West_Chester); the note and docs/facts/README.md say ten.', {
  skip: !fs.existsSync(path.join(CACHE_DIR, 'mrcc-forts-stations.html')) && 'the MRCC page is not cached',
}, () => {
  const html = fs.readFileSync(path.join(CACHE_DIR, 'mrcc-forts-stations.html'), 'utf8');
  const pa = [];
  for (const row of html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || []) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
    if (cells[0] === 'PA') pa.push(cells[1].replace(/_/g, ' '));
  }
  assert.ok(pa.length >= 10, 'parsed the Pennsylvania rows of the MRCC page');
  const note = weather().external_statements.find((x) => x.id === 'X-mrcc-keyed').note;
  const missing = pa.filter((name) => !note.includes(name));
  assert.deepEqual(missing, [], `the note omits Pennsylvania stations that the page lists: ${missing.join(', ')} (the page has ${pa.length} rows; the note says "ten")`);
  assert.ok(!/these Pennsylvania stations:/.test(note) || /twelve|12/.test(note), 'the count in the note must match the page');
});

// ---------------------------------------------------------------- provenance label
test('VERIFY-W13: the 1885 article is labelled tier "A1" (primary: a public-domain published work quoted verbatim) while its page is UNKNOWN, no scan or print was seen, and every number and quote comes from two blog transcriptions (Civil War Rx, Emerging Civil War) and a 291-pixel image. A1 overstates what was verified; the tier must say it is a transcription (or B) until the printed page is read.', () => {
  const s = source(weather(), 'jacobs-meteorology-1885');
  assert.ok(/UNKNOWN/.test(s.page), 'precondition: the printed page is unknown');
  assert.notEqual(s.tier, 'A1');
});

test('VERIFY-W14: a figure that the transcription prints as garbage ("1, - 280") must not be stored as a numeric Measured value. W-1863-06-25-precip-total carries value 1.28 and badge "Measured" although its own note says UNVERIFIED (1.280 is a reading by analogy). Use value null (as the Contested wind does) until the printed page is read.', () => {
  const o = obs(weather(), 'W-1863-06-25-precip-total');
  assert.equal(o.verification.level, 'garbled_single_transcription', 'precondition');
  assert.ok(o.value === null || o.badge !== 'Measured', `value ${o.value} with badge ${o.badge}`);
});
