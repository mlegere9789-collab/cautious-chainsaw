// node --test tests/environment/weather.test.mjs
// weather_by_day.json validates against the cached sources (or the committed windows), and the validator FAILS on every seeded error below.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateWeather } from '../../tools/environment/validate.mjs';
import { extract, readCompatible, verify } from '../../tools/environment/build-weather.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const load = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'environment', f), 'utf8'));
const weather = () => load('weather_by_day.json');
const obs = (w, id) => w.observations.find((o) => o.id === id);
const quote = (w, id) => w.quotes.find((q) => q.id === id);
const fails = async (data, re, label, opts = {}) => { const r = await validateWeather(data, opts); assert.ok(r.errors.length > 0, `${label}: the validator accepted a seeded error`); assert.ok(r.errors.some((e) => re.test(e)), `${label}: errors did not match ${re}: ${r.errors.slice(0, 3).join(' | ')}`); };

test('weather_by_day validates against the cached sources', async () => {
  const r = await validateWeather(weather());
  assert.deepEqual(r.errors, []);
  assert.ok(r.metrics.quotes >= 36);
  assert.equal(r.metrics.two_path_values, 10);
});

test('real numbers: what was verified how', () => {
  const w = weather();
  const t = w.observations.filter((o) => o.element === 'temperature');
  assert.equal(t.length, 30);
  assert.equal(t.filter((o) => o.verification.level === 'two_independent_paths').length, 10);
  assert.equal(t.filter((o) => o.verification.level === 'rx_plus_compatible_damaged_image').length, 2);
  assert.equal(t.filter((o) => o.verification.level === 'single_transcription').length, 18);
  assert.equal(w.verification_summary.values_confirmed_by_two_independent_paths, 10);
  assert.equal(w.verification_summary.numbers_contested, 2);
});

test('the pitch warnings are reproduced: wet-from-the-rain is June 26; the wind conflict is July 1 (not July 3) and is Contested with both values', () => {
  const w = weather();
  const wet = quote(w, 'Q-N-wet-jul26') || quote(w, 'Q-N-wet-jun26');
  assert.equal(wet.date, '1863-06-26'); assert.equal(wet.printed_page, 16); assert.ok(wet.witnesses.length >= 2);
  assert.ok(/Friday night/.test(quote(w, 'Q-N-early-fri').text));
  const wind = obs(w, 'W-1863-07-01-wind-speed');
  assert.equal(wind.badge, 'Contested'); assert.equal(wind.value, null); assert.equal(wind.status, 'open');
  assert.deepEqual(wind.values.map((x) => x.value).sort((a, b) => a - b), [2, 12, 12]);
  assert.equal(w.observations.filter((o) => o.element === 'wind_speed' && o.date === '1863-07-03').length, 0);
  assert.equal(w.pitch_checks.find((p) => p.id === 'PC7').agrees, false);
  assert.equal(w.pitch_checks.find((p) => p.id === 'PC9').agrees, false);
});

test('Measured is only used for instrument readings', () => {
  const w = weather();
  for (const o of w.observations) { if (o.badge === 'Measured') assert.ok(['temperature', 'temperature_month_max', 'precipitation'].includes(o.element), o.id); }
  for (const o of w.observations.filter((x) => ['sky', 'thunder', 'wind', 'wind_direction'].includes(x.element) && x.verification.level !== 'two_independent_scans')) assert.notEqual(o.badge, 'Measured', o.id);
  assert.equal(w.observations.filter((o) => o.badge === 'Measured').length, 34);
});

test('every Notes quote is in at least two scans, with printed page and leaf', () => {
  const w = weather();
  for (const q of w.quotes.filter((x) => x.source === 'jacobs-notes-1864')) { assert.ok(q.witnesses.length >= 2, q.id); for (const k of q.witnesses) { assert.ok(Number.isInteger(k.leaf) && k.printed_page === q.printed_page, q.id); } }
});

test('extraction rules and the image-pattern comparison', () => {
  assert.equal(extract({ type: 'triple', index: 1 }, 'Thermometer: 7 A.M. 2 P.M. 9 P.M. 73 87 76'), 87);
  assert.equal(extract({ type: 'regex', pattern: '\\((\\d+) miles per hour\\)', group: 1 }, 'A very gentle southern breeze, (2 miles per hour).'), 2);
  assert.equal(extract({ type: 'regex-decimal', pattern: 'in inches (\\d), - (\\d{3})' }, 'the precipitation being in inches 1, - 280.'), 1.28);
  assert.equal(readCompatible('8?', 81), true); assert.equal(readCompatible('8?', 71), false); assert.equal(readCompatible('1.?90', '1.390'), true);
  assert.equal(verify([{ id: 'rx', value: 72, agrees: true }, { id: 'ecw', value: 72, agrees: true }]).verification.level, 'two_independent_paths');
  assert.equal(verify([{ id: 'rx', value: 72, agrees: true }, { id: 'ecw', value: 73, agrees: false }]).verification.level, 'conflict');
  assert.equal(verify([{ id: 'rx', value: 72, agrees: true }]).verification.level, 'single_transcription');
});

// ---------------------------------------------------------------- seeded errors
test('SEEDED: a temperature changed from 87 to 88 is caught (number vs its quote)', async () => { const w = weather(); obs(w, 'W-1863-07-03-temp-2pm').value = 88; await fails(w, /value 88 but its quote/, '87->88'); });
test('SEEDED: the transcribed table row altered (74 81 76 -> 74 18 76) is caught (quote not in the source)', async () => { const w = weather(); quote(w, 'Q-H-t-jul2').text = 'Thermometer: 7 A.M. 2 P.M. 9 P.M. 74 18 76'; await fails(w, /Q-H-t-jul2: not found|not in the committed window|not found in the cached/, 'row altered'); });
test('SEEDED: a verbatim Notes quote altered is caught', async () => { const w = weather(); quote(w, 'Q-N-morning-jul2').text = quote(w, 'Q-N-morning-jul2').text.replace('pleasant', 'unpleasant'); await fails(w, /quote Q-N-morning-jul2/, 'pleasant->unpleasant'); });
test('SEEDED: a wrong printed page for a Notes quote is caught', async () => { const w = weather(); const q = quote(w, 'Q-N-morning-jul2'); q.printed_page = 33; q.witnesses.forEach((k) => { k.printed_page = 33; }); await fails(w, /printed page 33|running head/, 'page 33'); });
test('SEEDED: a wrong IA leaf is caught', async () => { const w = weather(); quote(w, 'Q-N-morning-jul2').witnesses[0].leaf = 43; await fails(w, /not found on leaf 43/, 'leaf'); });
test('SEEDED: the Contested wind made single-valued is caught', async () => { const w = weather(); const o = obs(w, 'W-1863-07-01-wind-speed'); o.values = [o.values[0], { ...o.values[0], source_witness: 'ecw-image' }]; await fails(w, /Contested but the readings do not differ|ECW reading/, 'wind single'); });
test('SEEDED: the Contested wind with a chosen value is caught', async () => { const w = weather(); obs(w, 'W-1863-07-01-wind-speed').value = 12; await fails(w, /Contested|schema/, 'wind chosen'); });
test('SEEDED: the wind figure moved to July 3 (the pitch\'s mistake) is caught', async () => { const w = weather(); const o = JSON.parse(JSON.stringify(obs(w, 'W-1863-07-01-wind-speed'))); o.id = 'W-1863-07-03-wind-speed'; o.date = '1863-07-03'; w.observations.push(o); await fails(w, /no wind-speed figure for July 3|duplicate/, 'wind on July 3'); });
test('SEEDED: badge Measured on a sky observation is caught', async () => { const w = weather(); const o = obs(w, 'W-1863-07-03-sky'); o.badge = 'Measured'; await fails(w, /Measured/, 'Measured sky'); });
test('SEEDED: a lowered verification level that the witnesses contradict is caught', async () => { const w = weather(); obs(w, 'W-1863-07-02-temp-2pm').verification.level = 'single_transcription'; await fails(w, /verification level single_transcription but the witnesses give/, 'level'); });
test('SEEDED: an image reading changed so that it contradicts the transcriptions is caught', async () => {
  const w = weather(); const visual = load('visual_readings.json'); visual.readings[0].cells.find((c) => c.id === 'd1-7am').read = '73';
  await fails(w, /the witnesses disagree|verification level/, 'image reading', { visual });
});
test('SEEDED: "no thermometer table in the Notes" turned into true is caught', async () => { const w = weather(); w.sources.find((s) => s.id === 'jacobs-notes-1864').contains_weather_table = true; await fails(w, /contains_weather_table|schema/, 'table claim'); });
test('SEEDED: the pitch correction PC7 removed is caught', async () => { const w = weather(); w.pitch_checks.find((p) => p.id === 'PC7').agrees = true; await fails(w, /PC7/, 'PC7'); });
test('SEEDED: the maximum reading changed so 87 is no longer the maximum is caught', async () => { const w = weather(); const o = obs(w, 'W-1863-06-30-temp-2pm'); o.value = 91; quote(w, 'Q-H-t-jun30').text = '30 68 91 71'; await fails(w, /PC2|Q-H-t-jun30|87/, 'max'); });
test('SEEDED: warnings removed is a schema error', async () => { const w = weather(); w.warnings = []; await fails(w, /schema/, 'warnings'); });
test('SEEDED: an unknown badge is a schema error', async () => { const w = weather(); obs(w, 'W-1863-07-03-thunder').badge = 'Verified'; await fails(w, /schema/, 'badge'); });
test('SEEDED: a Measured value without its basis is a schema error', async () => { const w = weather(); delete obs(w, 'W-1863-07-03-temp-2pm').badge_basis; await fails(w, /schema/, 'basis'); });
test('SEEDED: the external statement about NCEI altered is caught', async () => { const w = weather(); w.external_statements[0].text = 'Open access to the NERMS system'; await fails(w, /external statement/, 'ncei'); });

test('offline: with an EMPTY cache the committed windows still catch an altered quote (and the data validates)', () => {
  const tmp = fs.mkdtempSync(path.join(ROOT, 'tmp', 'empty-cache-'));
  try {
    const run = (extra) => spawnSync(process.execPath, ['tools/environment/validate.mjs', ...extra], { cwd: ROOT, env: { ...process.env, GETTYSBURG_CACHE_DIR: tmp }, encoding: 'utf8' });
    const ok = run([]);
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    const strict = run(['--require-cache']);
    assert.notEqual(strict.status, 0, '--require-cache must fail when the sources are not cached');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
