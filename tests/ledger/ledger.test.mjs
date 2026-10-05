// node --test "tests/ledger/*.test.mjs"
// The conflict ledger validates against the cached sources (or the committed windows) and the page-image readings, and the validator FAILS on every seeded error below.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateAll } from '../../tools/ledger/validate.mjs';
import { CACHE_DIR } from '../../tools/environment/fetch.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const load = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'ledger', f), 'utf8'));
const ledger = () => load('conflict_ledger.json'), readings = () => load('visual_readings.json');
const row = (d, id) => d.rows.find((r) => r.id === id), val = (d, rid, vid) => row(d, rid).values.find((v) => v.id === vid), quote = (d, id) => d.quotes.find((q) => q.id === id), source = (d, id) => d.sources.find((s) => s.id === id);
const fails = async (opts, re, label) => { const r = await validateAll(opts); assert.ok(r.errors.length > 0, `${label}: the validator accepted a seeded error`); assert.ok(r.errors.some((e) => re.test(e)), `${label}: errors did not match ${re}: ${r.errors.slice(0, 4).join(' | ')}`); return r; };

test('the ledger validates: schema, quotes in their scans, readings, arithmetic, rules', async () => {
  const r = await validateAll({});
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.metrics.rows, 20);
});

test('real numbers: rows, values, quotes and how the figures were verified', async () => {
  const d = ledger(); const r = await validateAll({});
  assert.ok(d.rows.length >= 18 && d.rows.length <= 20, 'the first 18-20 rows');
  assert.equal(r.metrics.values, 92); assert.equal(r.metrics.quotes, 69); assert.equal(r.metrics.figures, 141);
  // the recorded verification of every figure (computed at build time with the cache present)
  let two = 0, checksum = 0, single = 0;
  for (const row of d.rows) for (const v of row.values) for (const f of Object.values(v.verification.figures)) { const m = f.methods; const t = (m.includes('image') && (m.includes('ocr_corroborates_image') || m.includes('ocr_or_text') || m.includes('text'))) || (m.includes('ocr_or_text') && m.includes('second_scan')); if (t) two++; else if (f.checksum) checksum++; else single++; }
  assert.equal(two + checksum + single, 141);
  assert.equal(d.summary.figures_two_extraction_methods, two); assert.equal(d.summary.figures_ocr_plus_checksum, checksum); assert.equal(d.summary.figures_single_method, single);
  assert.ok(two >= 100, 'at least 100 figures read by two independent extraction methods');
  if (r.metrics.quotes_checked_against_windows === 0) assert.equal(r.metrics.figures_two_extraction_methods, two, 'with the cache present the validator reproduces the recorded counts');
});

test('the casualty ladders are there, with edition and page, and the OCR-vs-image differences are recorded', () => {
  const d = ledger();
  const un = row(d, 'WSD-01');
  assert.deepEqual(un.values.filter((v) => v.tier === 'A1').map((v) => v.page), [113, 118, 17, 187, 25, 102, 46]);
  assert.deepEqual(val(d, 'WSD-01', 'v4').figures, { killed: 3155, wounded: 14529, missing: 5365, total: 23049 });
  assert.deepEqual(val(d, 'WSD-01', 'v5').figures, { killed: 3063, wounded: 14492, missing: 5435, total: 22990 });
  assert.deepEqual(val(d, 'WSD-02', 'v1').figures, { killed: 2592, wounded: 12709, missing: 5150, total: 20451 });
  assert.equal(val(d, 'WSD-02', 'v2').derived.total, 28063);
  const q = quote(d, 'Q-or1-p187'); assert.deepEqual(q.ocr_check.known_ocr_variants, [{ printed: '23,049', ocr: '23,019' }]);
  assert.ok(quote(d, 'Q-fox-p25-prose').ocr_check.known_ocr_variants.length === 1);
  for (const r of d.rows) for (const v of r.values) assert.ok(v.what_is_counted.length >= 15 && v.edition && v.tier, `${r.id}.${v.id}`);
});

test('no row averages, merges or silently chooses: every row keeps all values and writes its display rule', () => {
  const d = ledger();
  for (const r of d.rows) {
    assert.ok(r.values.length >= 2, r.id);
    assert.ok(['adopted with reason', 'open', 'unresolvable'].includes(r.status), r.id);
    assert.ok(r.shown_first.rule.length >= 20, r.id);
    assert.ok(/not a claim|never which value is true|No value is shown first/.test(r.shown_first.rule), `${r.id}: the rule must say it is a display order`);
    for (const k of ['mean', 'average', 'median', 'consensus', 'best_estimate']) assert.ok(!(k in r), `${r.id}.${k}`);
  }
});

test('the pitch rows 1-4, 6, 12-15 and 18 are covered; unverified secondary figures are held back, not shown', () => {
  const d = ledger();
  const covered = new Set(d.rows.map((r) => r.pitch_row).filter(Boolean));
  for (const n of [1, 2, 3, 4, 6, 12, 13, 14, 15, 18]) assert.ok(covered.has(n), `pitch row ${n}`);
  const nums = new Set(d.rows.flatMap((r) => r.values.flatMap((v) => [...Object.values(v.figures), ...Object.values(v.derived || {})])));
  for (const n of [23231, 22587, 22709, 27823, 23055, 22822, 3354, 160311, 4708, 5830]) assert.ok(!nums.has(n), `the unverified figure ${n} must not appear among the values`);
  const held = d.rows.flatMap((r) => r.held_back || []).map((h) => h.claim).join(' | ');
  assert.ok(/Busey and Martin/.test(held) && /Krick/.test(held) && /American Battlefield Trust/.test(held), 'B&M, Krick and the Trust are listed as held back');
  for (const r of d.rows) for (const v of r.values) assert.ok(!/battlefields?\.org|American Battlefield Trust|Stone Sentinels/i.test(v.authority + JSON.stringify(v.figures)), `${r.id}.${v.id}`);
});

test('prose facts the explanations lean on: the candidate time anchors and the site corps sum', () => {
  const a = JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'time', 'time_anchors.json'), 'utf8'));
  assert.equal(a.anchors.find((x) => x.tick === 518).t, '1863-07-03T13:07');
  const t28 = a.anchors.find((x) => x.tick === 28); assert.equal(t28.t, '1863-07-01T10:15'); assert.equal(t28.review_flag, 'evidence-weak'); assert.equal(t28.state, 'proposed');
  assert.equal(23049 - 242 - 4, 22803);
  assert.equal(23138 - 23049, 89);
  assert.equal(6643 - 5365, 1278);
});

// ---------------------------------------------------------------- seeded errors
test('SEEDED: a figure changed (killed 3,155 -> 3,156)', async () => { const d = ledger(); val(d, 'WSD-01', 'v4').figures.killed = 3156; await fails({ ledger: d }, /3156|killed=3156|the table in VR/, 'killed'); });
test('SEEDED: a total changed (23,049 -> 23,040)', async () => { const d = ledger(); val(d, 'WSD-01', 'v4').figures.total = 23040; await fails({ ledger: d }, /23040/, 'total'); });
test('SEEDED: an OCR quote altered (2,834 -> 2,843)', async () => { const d = ledger(); quote(d, 'Q-or1-p17').text = quote(d, 'Q-or1-p17').text.replace('2,834', '2,843'); await fails({ ledger: d }, /quote Q-or1-p17: fragment .* (not found|not in the committed window)/, 'quote text'); });
test('SEEDED: a wrong printed page for a text quote', async () => { const d = ledger(); const q = quote(d, 'Q-doubleday-1015'); q.printed_page = 246; q.witnesses[0].printed_page = 246; val(d, 'WSD-14', 'v1').page = 246; await fails({ ledger: d }, /printed page 246 recorded|running head|committed window/, 'page 246'); });
test('SEEDED: a wrong printed page for an image quote', async () => { const d = ledger(); const q = quote(d, 'Q-or1-p187'); q.printed_page = 188; await fails({ ledger: d }, /printed page 188|differs from the reading/, 'page 188'); });
test('SEEDED: a wrong leaf for a witness', async () => { const d = ledger(); quote(d, 'Q-lee-cannonade').witnesses[0].leaf = 330; await fails({ ledger: d }, /not found on leaf 330|committed window/, 'leaf'); });
test('SEEDED: a table cell in a reading changed (First Corps killed officers 42 -> 43)', async () => { const r = readings(); r.readings.find((x) => x.id === 'VR-or1-p187-recap').table.rows[1][1] = 43; await fails({ readings: r }, /column "killed_officers"|row "First Army Corps"/, 'cell'); });
test('SEEDED: a reading\'s total row changed', async () => { const r = readings(); r.readings.find((x) => x.id === 'VR-fox-p25').table.total_row[4] = 22900; await fails({ readings: r }, /column "total"|row "Total"/, 'total row'); });
test('SEEDED: a number in an image quote that is not in the reading', async () => { const d = ledger(); quote(d, 'Q-or2-p346').text = 'Grand total 2,592 12,709 5,150 20,461'; await fails({ ledger: d }, /20461|not among the numbers read/, 'image number'); });
test('SEEDED: the image hash recorded differs from the cached image', { skip: !fs.existsSync(path.join(CACHE_DIR, 'or27-1-n204.jpg.meta.json')) && 'the page images are not cached' }, async () => { const r = readings(); r.readings.find((x) => x.id === 'VR-or1-p187-recap').image.sha256 = 'a'.repeat(64); await fails({ readings: r }, /different hash/, 'hash'); });
test('SEEDED: an averaging key in a row', async () => { const d = ledger(); row(d, 'WSD-02').average = 24000; await fails({ ledger: d }, /forbidden key "average"|schema/, 'average'); });
test('SEEDED: an averaging key in a value', async () => { const d = ledger(); val(d, 'WSD-02', 'v1').midpoint = 24000; await fails({ ledger: d }, /forbidden key midpoint/, 'midpoint'); });
test('SEEDED: a row with a single value', async () => { const d = ledger(); row(d, 'WSD-03').values = row(d, 'WSD-03').values.slice(0, 1); await fails({ ledger: d }, /schema|at least two values/, 'single value'); });
test('SEEDED: a status that is not on the ladder', async () => { const d = ledger(); row(d, 'WSD-03').status = 'settled'; await fails({ ledger: d }, /status|schema/, 'status'); });
test('SEEDED: a missing display rule', async () => { const d = ledger(); row(d, 'WSD-03').shown_first.rule = ''; await fails({ ledger: d }, /shown_first|schema/, 'rule'); });
test('SEEDED: shown_first pointing at a value that does not exist', async () => { const d = ledger(); row(d, 'WSD-03').shown_first.value = 'v99'; await fails({ ledger: d }, /shown_first points to a missing value/, 'shown_first'); });
test('SEEDED: tier A1 on a source published after 1930', async () => { const d = ledger(); source(d, 'livermore-1900').imprint_year = 1960; await fails({ ledger: d }, /tier A1 needs an imprint year before 1931/, 'A1 1960'); });
test('SEEDED: a value from a link-out-only source (American Battlefield Trust)', async () => { const d = ledger(); const v = val(d, 'WSD-02', 'v4'); v.authority = 'American Battlefield Trust, Gettysburg facts'; await fails({ ledger: d }, /link-out-only/, 'ABT'); });
test('SEEDED: a derived total that does not reproduce', async () => { const d = ledger(); val(d, 'WSD-02', 'v2').derived.total = 28000; await fails({ ledger: d }, /derived total 28000/, 'derived'); });
test('SEEDED: a broken addition check', async () => { const d = ledger(); val(d, 'WSD-02', 'v2').checks[0].total = 3904; await fails({ ledger: d }, /= 3903, not 3904|2592 \+ 1311/, 'sum check'); });
test('SEEDED: a copy flag on a value whose figures differ', async () => { const d = ledger(); val(d, 'WSD-09', 'v3').figures.engaged = 83000; await fails({ ledger: d }, /marked as a copy|not in any of its quotes/, 'copy'); });
test('SEEDED: an OCR variant identical to the printed reading', async () => { const d = ledger(); quote(d, 'Q-or1-p187').ocr_check.known_ocr_variants = [{ printed: '23,049', ocr: '23,049' }]; await fails({ ledger: d }, /must differ from the printed reading/, 'variant'); });
test('SEEDED: a clock time not in its quote (10:15 -> 10:45)', async () => { const d = ledger(); val(d, 'WSD-14', 'v1').figures.time = '10:45 a.m.'; await fails({ ledger: d }, /time 10:45 a\.m\. is not in its quote/, 'time'); });
test('SEEDED: a value whose page is not its quote\'s page', async () => { const d = ledger(); val(d, 'WSD-14', 'v1').page = 250; await fails({ ledger: d }, /page 250 is not the page of its quotes/, 'value page'); });
test('SEEDED: a missing reason for the difference', async () => { const d = ledger(); delete row(d, 'WSD-03').reason_for_difference; await fails({ ledger: d }, /schema|reason_for_difference/, 'reason'); });
test('SEEDED: a held-back claim with no reason', async () => { const d = ledger(); row(d, 'WSD-02').held_back[0].reason = ''; await fails({ ledger: d }, /held_back/, 'held_back'); });
test('SEEDED: a web quote altered (NPS 23000 -> 23500)', async () => { const d = ledger(); quote(d, 'Q-nps-casualties').text = 'Estimated Casualties:51000 total (US 23500; CS 28000;)'; await fails({ ledger: d }, /Q-nps-casualties/, 'web quote'); });
test('SEEDED: a figure from the wrong quote (cemetery 3,564 attributed to the 1864 report)', async () => { const d = ledger(); val(d, 'WSD-11', 'v1').figures.burials = 3564; await fails({ ledger: d }, /3564.*not in any of its quotes/, 'wrong quote'); });
test('SEEDED: a quote attached to a value of another source', async () => { const d = ledger(); val(d, 'WSD-11', 'v1').quote = ['Q-cem67-text']; await fails({ ledger: d }, /belongs to source/, 'cross-source quote'); });
test('SEEDED: fewer than 18 rows is a schema error', async () => { const d = ledger(); d.rows = d.rows.slice(0, 17); d.summary.rows = 17; await fails({ ledger: d }, /schema/, '17 rows'); });
test('SEEDED: the 1865 synopsis table that no longer adds up', async () => { const d = ledger(); quote(d, 'Q-cem65-table').sum_check.numbers[0] = 105; await fails({ ledger: d }, /add up to 3556, not the printed total 3555/, 'synopsis'); });
test('SEEDED: a wind reading that disagrees with weather_by_day.json', async () => { const d = ledger(); const q = quote(d, 'Q-ref-wind-ecw'); q.value = 11; val(d, 'WSD-17', 'v2').figures.wind_mph = 11; await fails({ ledger: d }, /weather_by_day says 12/, 'ref'); });
test('SEEDED: the site data drifted (a warning; an error with strictSite)', async () => {
  const d = ledger(); quote(d, 'S-union-corps-sum').value = 22000;
  const r = await validateAll({ ledger: d });
  assert.ok(r.warnings.some((w) => /site data now says/.test(w)), 'drift must be reported');
  await fails({ ledger: d, strictSite: true }, /site data now says/, 'strict site');
});

test('offline: with an EMPTY cache the committed windows catch an altered quote; --require-cache fails', () => {
  const tmp = fs.mkdtempSync(path.join(ROOT, 'tmp', 'empty-cache-'));
  try {
    const run = (extra) => spawnSync(process.execPath, ['tools/ledger/validate.mjs', ...extra], { cwd: ROOT, env: { ...process.env, GETTYSBURG_CACHE_DIR: tmp }, encoding: 'utf8' });
    const ok = run([]);
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    assert.notEqual(run(['--require-cache']).status, 0);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
