// verify-ingest-engine.test.mjs - adversarial check of what the engine SAYS from the Official Records corpus (verifier workstream; every test here fails today, by design).
//
// The claims under test (docs/historian/CORPUS.md sections 6 and 7, golden sets A 71/73 and H 31/33): an answer quotes the report or dispatch asked for, "a day with no dispatch is said, not answered
// with another day's", and times are "as he wrote them". The verifier put 30 hand-written questions to the engine (not the golden set's phrasings): 14 answered well or declined honestly, 6 fell back
// silently to the site's own records for an author outside the 706-person register (a documented limit), and 10 were wrong in one of the ways below. Each test is one of those answers, asserted the other
// way round. Quotes themselves are verbatim (500 of 500 random quotes equal passage.slice(s, e) and sit in the Archive's own OCR); what fails is which words are chosen and what is said around them.
//
// Needs the corpus KB (built into a temporary directory from historian-src/raw/or27, as or27.test.mjs does); skipped loudly without it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/data.mjs';
import { or27, available, SKIP as NEED } from './lib/or27-fixture.mjs';

const need = available() ? false : NEED;
const quotes = (a) => (a.blocks || []).filter((b) => b.t === 'quote' && /^or27-/.test(String(b.passage)));
let claims = null;
const claimsOf = (q) => {
  if (!claims) { const t = JSON.parse(fs.readFileSync(path.join(ROOT, 'historian-src/corpus/or27/time_claims.json'), 'utf8')); claims = t.rows.map((r) => Object.fromEntries(t.fields.map((f, i) => [f, r[i]]))); }
  return claims.filter((c) => c.passage === q.passage && c.s >= q.s && c.e <= q.e);
};

test('VI-EN-1 "what did Slocum telegraph on July 2" does not deny a July 2 dispatch the volume prints (or27-3:p0486.5, headed "July 2, 1863 - 10.30 a. m.", to Meade)', { skip: need, timeout: 600000 }, async () => {
  const k = await or27(); const a = await k.fresh().ask('what did Slocum telegraph on July 2');
  assert.ok(!/print no dispatch/.test(a.text), `the answer says: ${a.text.replace(/\n/g, ' ')}`);
});

test('VI-EN-2 "what did Pleasonton write to Williams on June 9": the answer keeps the addressee (he wrote three dispatches that day, to Hooker twice and to Stahel, none to Williams)', { skip: need, timeout: 600000 }, async () => {
  const k = await or27(); const a = await k.fresh().ask('what did Pleasonton write to Williams on June 9');
  assert.ok(/Williams/.test(a.text) || !/print no dispatch from .*dated June 9/.test(a.text), `the answer drops "to Williams" and says there is no dispatch dated June 9: ${a.text.replace(/\n/g, ' ')}`);
});

for (const [q, day] of [['what time did Longstreet report the assault began on July 3', '1863-07-03'], ['what time did Buford say the fighting began on July 1', '1863-07-01']]) {
  test(`VI-EN-3 "${q}": the times quoted are times of ${day}, the day asked about`, { skip: need, timeout: 600000 }, async () => {
    const k = await or27(); const a = await k.fresh().ask(q);
    const qs = quotes(a); assert.ok(qs.length, 'a quote');
    const days = new Map();
    for (const b of qs) for (const c of claimsOf(b)) days.set(c.day, (days.get(c.day) || []).concat(c.text));
    const other = [...days].filter(([d]) => d !== day);
    assert.ok(days.has(day), `no quoted clock is of ${day}; the quotes carry ${JSON.stringify([...days])}`);
    assert.deepEqual(other.map(([d, t]) => `${d}: ${t.join(', ')}`), [], 'clocks of other days are quoted as the answer');
  });
}

test('VI-EN-4 "what did Meade report about the Gettysburg campaign" does not print the compiler\'s footnote as Meade\'s words ("... see pp. 180-182. - Compiler.")', { skip: need, timeout: 600000 }, async () => {
  const k = await or27(); const a = await k.fresh().ask('what did Meade report about the Gettysburg campaign');
  const bad = quotes(a).filter((b) => /[—-]\s*Compiler\b/.test(b.text)).map((b) => b.text.slice(0, 120));
  assert.deepEqual(bad, [], 'a quote under Meade\'s name that the compilers wrote');
});

test('VI-EN-5 "what did Gregg report about the cavalry fight on July 3" does not answer with his report of the action of June 9 (Brandy Station)', { skip: need, timeout: 600000 }, async () => {
  const k = await or27(); const a = await k.fresh().ask('what did Gregg report about the cavalry fight on July 3');
  const bad = quotes(a).filter((b) => /engagement of the 9th instant|June 12, 1863/.test(b.text)).map((b) => b.text.slice(0, 120));
  assert.deepEqual(bad, [], 'the first "closest passage" is the opening of the report of the June 9 engagement');
});
