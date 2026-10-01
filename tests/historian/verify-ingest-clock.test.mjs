// verify-ingest-clock.test.mjs - adversarial check of the clock-time claims of the Official Records corpus (verifier workstream; every test here fails today, by design).
//
// The claim under test (docs/historian/CORPUS.md section 5): 5,382 clock claims, each with the minute it names and the DAY it is said about. Read by hand (100 seeded claims, then counted over the
// tables): the expressions are right in 97 of 100 (a false "1 a. m." from the OCR's "1 am" for "I am"; a rule's "between sunrise and sunset" taken for an event time; "after 1 o'clock" resolved to
// 1 a. m. against the sentence), but the DAY goes wrong where a sentence names it as "of the 3d, in compliance..." (dayRefs reads "the 3d" followed by a comma and the word "in" as the 3d
// INDIANA, and followed by a capitalised name as a unit): 10 of the 255 claims whose clock is followed by "of/on the Nd" carry another day, e.g. "At 1 a. m. of the 3d, Muhlenberg's battery" -> July 2.
//
// The two unit tests need only tools/historian/ingest/times.mjs; the corpus test also needs the passages of historian-src/raw/or27 (git-ignored; skipped loudly without them).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/data.mjs';
import { parseClock, dayRefs } from '../../tools/historian/ingest/times.mjs';

test('VI-CK-1 "1 am informed" is not a clock: the OCR prints the letter I as the digit 1, and a bare "am" is documented as never read', () => {
  // times.mjs says (line 16) "a bare 'am' or 'pm' is not read (it is 'I am')", but its MER pattern is compiled with the i flag, so [AP]\.?\s?M matches "am". 5 false claims in the corpus
  // (or27-1:0159 "1 am informed by him", or27-1:0212 "1 am, sir, very respectfully" -> 1:00 a. m. on a September day, or27-2:0380, 0460, 0496).
  for (const s of ['as 1 am informed by him, made by Maj. Gen. A. A. Humphreys', '1 am, sir, very respectfully, your obedient servant', 'and 1 am glad to report that no individual cases']) {
    assert.deepEqual(parseClock(s).map((c) => c.text), [], `"${s}" holds no clock`);
  }
  // a real one still reads
  assert.deepEqual(parseClock('left camp at 1 a. m. and crossed').map((c) => c.min), [60]);
});

test('VI-CK-2 "the 3d" is a day when a comma and a word follow it: "on the morning of the 3d, in compliance with your order", "of the 2d, in the woods", "of the 3d, Muhlenberg\'s battery"', () => {
  const cases = [
    ['Soon after daylight on the morning of the 3d, in compliance with your order, I drew in my skirmishers.', 3],
    ['On the morning of the 2d, in the woods, the enemy attacked.', 2],
    ['At 1 a. m. of the 3d, Muhlenberg’s battery was posted opposite the town.', 3],
    ['At 7 a. m. on the 2d, in compliance with orders, the brigade moved.', 2],
  ];
  const bad = cases.filter(([s, d]) => !dayRefs(s).some((r) => r.kind === 'ord' && r.d === d)).map(([s]) => s);
  assert.deepEqual(bad, [], `dayRefs finds no day in: ${JSON.stringify(bad)}`);
  // "the 3d Indiana" is still a unit, not a day
  assert.ok(!dayRefs('the 3d Indiana, Colonel Smith, moved out').some((r) => r.kind === 'ord'));
});

const PASSAGES = path.join(ROOT, 'historian-src/raw/or27/passages.jsonl');
const SKIP = fs.existsSync(PASSAGES) ? false : 'SKIPPED LOUDLY: historian-src/raw/or27 is not built here; run  node tools/historian/ingest/corpus.mjs build';
test('VI-CK-3 over the corpus: a clock followed by "of/on the Nd" is said about day N (10 of 255 claims carry another day today)', { skip: SKIP }, () => {
  const t = JSON.parse(fs.readFileSync(path.join(ROOT, 'historian-src/corpus/or27/time_claims.json'), 'utf8'));
  const claims = t.rows.map((r) => Object.fromEntries(t.fields.map((f, i) => [f, r[i]])));
  const P = new Map(fs.readFileSync(PASSAGES, 'utf8').split('\n').filter(Boolean).map((l) => { const p = JSON.parse(l); return [p.id, p]; }));
  const UNIT = /^\s*(?:Brigade|Division|Corps|Regiment|Battery|New|Maine|Mass|Penn|Ohio|Indiana|Michigan|Wisconsin|Minnesota|Alabama|Georgia|Virginia|Carolina|Louisiana|Texas|Mississippi|Maryland|Delaware|U\.|United|Cavalry|Infantry|Artillery|Vermont|Connecticut|Illinois|Tennessee|Kentucky|Arkansas|Florida|Jersey|York)/;
  const ORD = /^[\s,;.()\-—]*(?:(?:on|of|in|the|morning|afternoon|evening|night|day|and|following)[\s,]+){0,4}(\d{1,2})(?:st|d|nd|rd|th)\b/;
  let n = 0; const bad = [];
  for (const c of claims) {
    if (!c.day) continue; const p = P.get(c.passage); if (!p) continue;
    const after = p.text.slice(c.e, c.e + 60); const m = after.match(ORD); if (!m || UNIT.test(after.slice(m[0].length))) continue;
    n++; const d = +m[1]; if (d >= 1 && d <= 31 && +c.day.slice(8, 10) !== d) bad.push(`${c.doc} "${c.text}" is followed by "${m[0].trim()}" but is dated ${c.day} (${c.day_basis})`);
  }
  assert.ok(n > 200, `${n} claims examined`);
  assert.equal(bad.length, 0, `${bad.length} of ${n} claims are dated to another day than the sentence names:\n  ${bad.slice(0, 8).join('\n  ')}`);
});
