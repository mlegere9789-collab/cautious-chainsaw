// verify-ingest-links.test.mjs - adversarial check of the entity links of the Official Records passages (verifier workstream; every test here fails today, by design).
//
// The claim under test (docs/historian/CORPUS.md section 5): only tier A and B links reach the knowledge base, "96.0% (92.3 to 98.0) right" on the builder's 200-link hand sample. The verifier drew
// its own 100 emitted (tier A/B) passage links with a seeded generator (seed 5150 over mentions.jsonl) and read each in its sentence: 96 right, 1 uncertain, 3 wrong - the same figure, so the rate is
// not what fails here. These are the three wrong links, each a rule that is wrong in kind and so recurs; each asserts that the link is not made.
//   1. "the first United States quartermaster's post" is read by the unit grammar as the 1st United States Sharpshooters (U-1US-SS).
//   2. "the One hundred and and forty-ninth Pennsylvania Volunteers" (the OCR doubled "and") is read as the 49th Pennsylvania (U-49PA), not the 149th.
//   3. A dispatch of August 1, 1863 signed "H. K. BURGWYN" (the father, writing to Maj. Gen. Whiting about the defence of Weldon) is linked, tier A by surname alone, to Col. Henry Burgwyn of the
//      26th North Carolina, whom the site's own register records as "KIA July 1".
//
// Needs the mention log the build writes into historian-src/raw/or27 (git-ignored); skipped loudly without it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/data.mjs';

const MENTIONS = path.join(ROOT, 'historian-src/raw/or27/mentions.jsonl');
const SKIP = fs.existsSync(MENTIONS) ? false : 'SKIPPED LOUDLY: historian-src/raw/or27 is not built here; run  node tools/historian/ingest/corpus.mjs build';
const emitted = (pid, id) => fs.readFileSync(MENTIONS, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((m) => m.pid === pid && m.id === id && (m.tier === 'A' || m.tier === 'B'));

test('VI-LK-1 "the first United States quartermaster\'s post" is not the 1st United States Sharpshooters', { skip: SKIP }, () => {
  const hits = emitted('or27-2:0417#757d3021', 'U-1US-SS');
  assert.deepEqual(hits.map((m) => `${m.tier} ${m.via} "${m.phrase}"`), [], 'a unit link made from an ordinal and "United States" that names a quartermaster\'s post');
});

test('VI-LK-2 "One hundred and and forty-ninth Pennsylvania" (OCR doubled the "and") is not the 49th Pennsylvania', { skip: SKIP }, () => {
  const hits = emitted('or27-1:0029#8ec402c3', 'U-49PA');
  assert.deepEqual(hits.map((m) => `${m.tier} ${m.via} "${m.phrase}"`), [], 'a number the grammar reads without the hundreds that precede it');
});

test('VI-LK-3 a signature "H. K. BURGWYN" on a letter of August 1, 1863 is not Col. Henry Burgwyn, who the register says was killed on July 1', { skip: SKIP }, () => {
  const hits = emitted('or27-3:p1070.2#d2132db5', 'P:henry-burgwyn');
  assert.deepEqual(hits.map((m) => `${m.tier} ${m.via} "${m.phrase}"`), [], 'a surname-only link (tier A) on the signature of a dispatch written a month after the register\'s own date of death');
});
