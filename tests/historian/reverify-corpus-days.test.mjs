// reverify-corpus-days.test.mjs - second adversarial pass (re-verifier workstream) over the DAY given to the clock claims of the Official Records corpus (historian-src/corpus/or27/time_claims.json).
//
// The fixer fixed the day register for four classes the first verifier named (RB-DY, VI-CK) and said, among what it did not check: "Day assignment of the 1,939 'carried' clock claims was not hand-checked as a
// class". The re-verifier did that for a draw: 40 claims of day basis "carried" in the campaign window (June 25 to July 15; 918 of the 1,939), seed 5150, each read with the 320 characters before its sentence,
// in the passage text. Of the 40, 2 could not be judged from the passage alone (no earlier text, a mangled two-column table) and 14 are plausible but not certain; 24 are certain, and of those 21 carry the
// day the text gives and 3 do not (4 claims, Kershaw's passage has two clocks):
//   * or27-2:0537#d0b36d44 Wilcox: "With reference to the action of the 3d instant ... My men occupied this position till about 3.20 p. m." The register took the day from "the morning of the 2d" two sentences
//     earlier ("My men had had nothing to eat since the morning of the 2d") and gave the clock to July 2.
//   * or27-1:0029#0fb64c67 Doubleday: the passage opens "About 2 p. m. a terrific artillery fire opened on us from more than 100 guns" (the cannonade of July 3, before the charge Stannard repelled); the
//     passage before it ends on the evening of the 2d and the clock was carried across the passage boundary to July 2 (day age 9).
//   * or27-2:0432#2339dbb1 Kershaw: "July i. -Anderson's and Johnson's divisions ... until 4 p. m. ... camp at 12 p. m.": the OCR "i" for "1" was not read as a day, the claims stand on June 30. (3 passages of
//     the volume print "July i."; 10 print a month with a garbled day.)
// These are the day of the claims, so they decide which day a "what time" question may quote them for (ctx.windowOk): a July 3 cannonade clock offered as July 2, and refused for July 3. Red by design.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/data.mjs';

const TC = path.join(ROOT, 'historian-src/corpus/or27/time_claims.json');
let memo = null;
const claims = () => memo || (memo = (() => { const t = JSON.parse(fs.readFileSync(TC, 'utf8')); return t.rows.map((r) => Object.fromEntries(t.fields.map((f, i) => [f, r[i]]))); })());
const norm = (s) => String(s).replace(/[^a-z0-9]/gi, '').toLowerCase();
const of = (passage, text) => claims().filter((c) => c.passage.startsWith(passage) && norm(c.text) === norm(text));

test('RV-DY-1 Wilcox, "My men occupied this position till about 3.20 p. m." under "the action of the 3d instant" is a clock of July 3', () => {
  const c = of('or27-2:0537#d0b36d44', '3.20 p. m.'); assert.ok(c.length >= 1, 'the claim exists');
  assert.deepEqual([...new Set(c.map((x) => x.day))], ['1863-07-03'], `day basis ${c.map((x) => x.day_basis + ' age ' + x.day_age).join(', ')}`);
});
test('RV-DY-2 Doubleday, "About 2 p. m. a terrific artillery fire opened on us from more than 100 guns" is a clock of July 3', () => {
  const c = of('or27-1:0029#0fb64c67', '2 p. m.'); assert.ok(c.length >= 1, 'the claim exists');
  assert.deepEqual([...new Set(c.map((x) => x.day))], ['1863-07-03'], `day basis ${c.map((x) => x.day_basis + ' age ' + x.day_age).join(', ')}`);
});
test('RV-DY-3 Kershaw, "July i. - ... until 4 p. m. ... into camp at 12 p. m." (OCR "i" for "1") are clocks of July 1, not June 30', () => {
  const c = [...of('or27-2:0432#2339dbb1', '4 p. m.'), ...of('or27-2:0432#2339dbb1', '12 p. m.')]; assert.ok(c.length >= 2, 'both claims exist');
  assert.deepEqual([...new Set(c.map((x) => x.day))], ['1863-07-01'], `days ${c.map((x) => x.day).join(', ')}`);
});
// The 24 certain claims of the draw (+ Kershaw's second clock): [passage, clock text, the day the text gives]. 21 carry it, 4 do not (the three passages above; Kershaw has two clocks).
const LABELS = [
  ['or27-1:0187#7ebf814c', '7 p. m.', '1863-07-01'], ['or27-1:0082#beef0fca', '3 p. m.', '1863-07-02'], ['or27-3:p0464.2#ed23acdd', '1.30 p. m.', '1863-07-01'], ['or27-1:0265#c50b430b', '8 p. m.', '1863-07-02'],
  ['or27-3:p0603.1#8d328e5b', '2 a. m.', '1863-07-08'], ['or27-3:p0468.2#fb00e6f0', '4.45 p. m.', '1863-07-01'], ['or27-1:0304#bc90b00b', '10.30 a. m.', '1863-07-03'], ['or27-3:p0656.3#7700418a', '6.30 a. m.', '1863-07-12'],
  ['or27-1:0322#be09e135', '5.30 p. m', '1863-07-02'], ['or27-2:0508#d0e6a2e4', '2.30 p. m.', '1863-07-01'], ['or27-1:0183#e146ac6b', '11 a. m.', '1863-07-02'], ['or27-1:0172#7b0cbeb8', '4 p. m.', '1863-07-01'],
  ['or27-2:0436#dd8d2463', '1.30 p. m.', '1863-07-03'], ['or27-3:p0699.3#a6303de9', '1.30 p. m.', '1863-07-14'], ['or27-1:0269#1da80893', '2 p. m.', '1863-07-03'], ['or27-1:0201#9c9310c3', '10 a. m.', '1863-07-03'],
  ['or27-1:0276#2337786c', '1 p. m.', '1863-07-01'], ['or27-1:0243#828c6d83', '7 a. m.', '1863-07-14'], ['or27-1:0160#ae9015cd', '5 a. m.', '1863-07-09'], ['or27-3:p0375.1#acfcbeee', '8 a. m.', '1863-06-28'],
  ['or27-1:0133#de1379fa', '7 a. m.', '1863-07-02'],
  ['or27-2:0537#d0b36d44', '3.20 p. m.', '1863-07-03'], ['or27-1:0029#0fb64c67', '2 p. m.', '1863-07-03'], ['or27-2:0432#2339dbb1', '4 p. m.', '1863-07-01'], ['or27-2:0432#2339dbb1', '12 p. m.', '1863-07-01'],
];
test('RV-DY-4 the day of a carried clock claim is the day the text gives: at least 95% of the 25 claims the re-verifier read (21 right as built, 4 wrong: Wilcox, Doubleday, the two clocks of Kershaw)', () => {
  let ok = 0; const wrong = [];
  for (const [passage, text, day] of LABELS) { const c = of(passage, text); if (!c.length) { wrong.push(`${passage} ${text}: no claim`); continue; } if (c.every((x) => x.day === day)) ok++; else wrong.push(`${passage} "${text}" is ${[...new Set(c.map((x) => x.day))].join('/')}, the text gives ${day}`); }
  assert.ok(ok / LABELS.length >= 0.95, `${ok} of ${LABELS.length} (${(100 * ok / LABELS.length).toFixed(0)}%) carry the right day; wrong: ${wrong.join(' | ')}`);
});
