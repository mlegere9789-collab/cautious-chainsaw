// ADVERSARIAL VERIFIER (conflict ledger). node --test tests/ledger/verify-ledger.test.mjs
// Every test here FAILS on the committed state of data-src/ledger/conflict_ledger.json and tools/ledger (validateAll).
// (a) seeded errors that the validator accepts although it should not, (b) statements in the committed ledger that the printed pages contradict or do not support.
// Evidence is in the titles/messages (page images of OR vol. 27 pts 1-2, Fox, Livermore and Jacobs were read by the verifier on 2026-10-04).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAll } from '../../tools/ledger/validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ledger = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'data-src', 'ledger', 'conflict_ledger.json'), 'utf8'));
const row = (d, id) => d.rows.find((r) => r.id === id);
const val = (d, r, v) => row(d, r).values.find((x) => x.id === v);
const accepted = async (d, label) => { const r = await validateAll({ ledger: d }); assert.ok(r.errors.length > 0, `${label}: validateAll accepted a seeded error (0 errors)`); };

// ---------------------------------------------------------------- the committed data against its own README ("every value cites ... printed page")
test('VERIFY-L1: every A1 value that comes from a printed work has an integer page. WSD-15 v4 (Peyton) has page null, although its own quote is on printed page 385 of OR vol. 27 pt. 2 (page image read: head "THE GETTYSBURG CAMPAIGN. 385", "which opened at 1.30 p. m.")', () => {
  const d = ledger();
  const printed = new Set(d.sources.filter((s) => s.tier === 'A1').map((s) => s.id));
  const missing = [];
  for (const r of d.rows) for (const v of r.values) if (v.tier === 'A1' && printed.has(v.source) && !Number.isInteger(v.page)) missing.push(`${r.id}.${v.id}`);
  assert.deepEqual(missing, [], `A1 values without a printed page: ${missing.join(', ')}`);
});
test('VERIFY-L2: a printed A1 value whose page was removed (WSD-01 v7, Jacobs p. 46) must be rejected by the validator', async () => {
  const d = ledger();
  val(d, 'WSD-01', 'v7').page = null;
  await accepted(d, 'page removed');
});

// ---------------------------------------------------------------- the summary block is not recomputed by the validator
test('VERIFY-L3: a summary block that overstates the verification (figures_two_extraction_methods 104 -> 140) must be rejected by the validator', async () => {
  const d = ledger();
  d.summary.figures_two_extraction_methods = 140;
  await accepted(d, 'summary inflated');
});
test('VERIFY-L4: a summary block whose row count is wrong (rows 20 -> 21) must be rejected by the validator', async () => {
  const d = ledger();
  d.summary.rows = 21;
  await accepted(d, 'summary rows');
});

// ---------------------------------------------------------------- statements the sources do not support
test('VERIFY-L5: WSD-01 v7 says Jacobs\'s estimate was "written before any return was compiled". Contradicted by the sources in the same ledger: Meade sent the tabular casualty statement to the Adjutant-General on August 3, 1863 (OR vol. 27 pt. 1, p. 112 inclosure, p. 111 letter), and the Notes carry Charles P. Krauth\'s introduction dated "Philadelphia, September 23d, 1863" (page image read). Say what is known (finished by September 1863; no evidence of access to the return) instead.', () => {
  const v = val(ledger(), 'WSD-01', 'v7');
  assert.ok(!/before any return was compiled/i.test(v.what_is_counted), v.what_is_counted);
});
test('VERIFY-L6: WSD-07 explains Livermore\'s 6,026 as "of those [6,802 captured wounded], 6,026 are not in the Confederate returns (the returns reported only 770 left behind)". Livermore prints only "captured in excess of 770 reported" (p. 103); the explanation is the builder\'s inference and the arithmetic does not reproduce it (6,802 - 770 = 6,032, not 6,026). Remove or label it as an inference.', () => {
  const r = row(ledger(), 'WSD-07');
  assert.ok(!/returns reported only 770 left behind/.test(r.reason_for_difference), r.reason_for_difference);
  assert.notEqual(6802 - 770, 6026, 'the stated arithmetic would have to reproduce 6,026');
});
test('VERIFY-L7 (low, imprecise label): the p. 112-113 list is the inclosure to the transmittal LETTER of August 3, 1863 from Meade to the Adjutant-General (OR vol. 27 pt. 1 p. 111-112); the REPORT is dated October 1, 1863 (p. 114 ff.) and only points back to the table (editors footnote p. 118: Reference is to table on p. 112). The authority label list printed with Meade report (August 1863) fuses the two; name the inclosure and its date.', () => {
  const d = ledger();
  const bad = [];
  for (const r of d.rows) for (const v of r.values) if (/printed with Meade's report \(August 1863\)|list printed with Meade's report/.test(v.authority)) bad.push(`${r.id}.${v.id}: ${v.authority}`);
  assert.deepEqual(bad, [], bad.join(' | '));
});

// ---------------------------------------------------------------- a secondary source labelled primary
test('VERIFY-L8: the ledger rules say tier A1 = a public-domain PUBLISHED work quoted verbatim, and S = the project\'s own data. WSD-17 v1 and v2 (the wind speed) rest on blog transcriptions (Civil War Rx, Emerging Civil War) of an 1885 newspaper page that nobody here saw, via the project\'s own file weather_by_day.json, yet carry tier A1 (source "weather-by-day" is declared A1). A transcription of an unseen page is not A1.', () => {
  const d = ledger();
  const src = d.sources.find((s) => s.id === 'weather-by-day');
  assert.notEqual(src.tier, 'A1', 'the project\'s own derived dataset must not be tier A1');
  for (const v of ['v1', 'v2']) assert.notEqual(val(d, 'WSD-17', v).tier, 'A1', `WSD-17.${v} is a typed transcription of an unseen page`);
});
