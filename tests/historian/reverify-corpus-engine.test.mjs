// reverify-corpus-engine.test.mjs - second adversarial pass (re-verifier workstream) over what the engine SAYS from the Official Records corpus after the second build (07c3b81).
//
// The fixer's rule (CORPUS.md section 7): an answer never denies without saying what was searched, a day with no dispatch is said and not answered with another day's. The re-verifier put these to the engine:
//   * 30 dispatches it had read in the raw OCR (a hand sample) in the forms the fixer's golden and hand sets use, "what did S telegraph to A on D" and "... write to ...": 30 of 30 and 30 of 30 answered
//     with the dispatch (green: RV-EN-G1 below). In "tell" / "say" / "ask" / "send" / "order" / "report to" / "message" / "dispatch" forms the same 30: 1, 1, 0, 0, 0, 0, 0, 0 answered, the rest are
//     "The site's chronology covers July 1 to 3, 1863 ... so it has no entry for July 5" or "I could not find a record on this site that answers that" (RV-EN-5);
//   * 60 "what time did S telegraph to A on D" over dispatches that print the clock in the header (unique sender, addressee and day): 41 answered with the clock, 19 not; 16 of the 19 are "S gives no clock
//     time for D in the volume that I could find" and 3 are answers from the site's own timeline about an unrelated unit (RV-EN-6);
//   * 30 dispatches printed INSIDE Part 1 and Part 2 documents (Meade's own correspondence with Halleck, Hooker's with the President, Tyler's with Piatt ...; about 176 passages in 68 documents hold one, 100
//     carry a "(Received ...)" header): 0 of 30 found, 28 denied, 2 off topic (RV-EN-1..4). The denial opens "I did not find a dispatch or letter ... in the Official Records (series I, volume 27) as held
//     here" and only its second paragraph says that the search was of the dispatches of Part 3; Meade's dispatch to Halleck of July 2, 8 p. m. ("The enemy attacked me about 4 p. m. this day"), the best
//     known of the volume, is passage or27-1:0006#3b63cfd5 of the corpus.
// What holds (green): 8 of 8 wrong-day traps and 6 of 6 direction traps whose premise the re-verifier checked in all three parts, the four footnote traps, 7 of 7 what-time questions it hand-picked, the
// verbatim and page invariants (reverify-corpus-pages.test.mjs). Red by design where stated.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/data.mjs';
import { or27, available, SKIP as NEED } from './lib/or27-fixture.mjs';

const need = available() ? false : NEED;
const quotes = (a) => (a.blocks || []).filter((b) => b.t === 'quote' && /^or27-/.test(String(b.passage)));
const docOf = (b) => String(b.passage).split('#')[0];
const say = (a) => String(a.text || '').replace(/\n+/g, ' / ').slice(0, 220);
const ask = async (q) => { const k = await or27(); return k.fresh().ask(q); };

// ---- dispatches printed inside Part 1 / Part 2 documents ----------------------------------------------------------------------------------------------------------------------------------------
test('RV-EN-1 "What did Meade telegraph to Halleck on July 2?" quotes the dispatch the corpus holds (or27-1:0006#3b63cfd5, "Headquarters Army of the Potomac, July 2, 1863 - 8 p. m. (Received July 3, 5.15 p. m.) Maj. Gen. H. W. Halleck ... The enemy attacked me about 4 p. m. this day")', { skip: need, timeout: 600000 }, async () => {
  const a = await ask('What did Meade telegraph to Halleck on July 2?');
  assert.ok(quotes(a).some((b) => /enemy attacked me about 4 p\. ?m\. this day/.test(b.text)), `answer: ${say(a)}`);
});
test('RV-EN-2 "what did Meade telegraph on July 2" does not say it found no dispatch of Meade’s dated July 2 in the volume (the same passage is in the corpus)', { skip: need, timeout: 600000 }, async () => {
  const a = await ask('what did Meade telegraph on July 2');
  assert.ok(!/did not find a dispatch or letter from .*Meade.* dated July 2/.test(a.text) || quotes(a).some((b) => /enemy attacked me about 4 p\. ?m\./.test(b.text)), `answer: ${say(a)}`);
});
test('RV-EN-3 "What did Meade telegraph to Halleck on July 3?" does not say "None of Meade’s dispatches of July 3 is addressed to Halleck" and quotes the dispatch the corpus holds (or27-1:0006#ecc118be, "Near Gettysburg, July 3, 1863 - 8.35 p. m. (Received July 4, 6.10 a. m.) Major-General Halleck ... The enemy opened at 1 p. m. from about 150 guns")', { skip: need, timeout: 600000 }, async () => {
  const a = await ask('What did Meade telegraph to Halleck on July 3?');
  assert.ok(!/None of .*Meade.* dispatches of July 3 is addressed to .Halleck/.test(a.text), `answer: ${say(a)}`);
  assert.ok(quotes(a).some((b) => /The enemy opened at 1 p\. ?m\./.test(b.text)), 'the dispatch of 8.35 p. m. to Halleck is not quoted');
});
for (const [q, re, why] of [
  ['what did Howard telegraph on July 3', /The fire has been concentrated upon this point/, 'or27-1:0243#9b377e30, "Headquarters Eleventh Corps, July 3, 1863 - 2.15 p. m." to Butterfield'],
  ['what did Slocum write to Williams on July 4', /two flags captured by the Sixtieth New York/, 'or27-1:0271#e1c5b337, "Hdqrs. Twelfth Corps, July 4, 1863. General: I have the honor to forward herewith two flags"'],
  ['what did Hooker telegraph to Eckert on June 26', /compliments to the President/, 'or27-1:0005#98453f19, "Poolesville, June 26, 1863 - 6 p. m. Maj. T. T. Eckert: Dispatch received. My compliments to the President"'],
]) test(`RV-EN-4 ${JSON.stringify(q)} is answered from the dispatch the corpus holds in Part 1 (${why})`, { skip: need, timeout: 600000 }, async () => {
  const a = await ask(q);
  assert.ok(quotes(a).some((b) => re.test(b.text)) && !/did not find a dispatch or letter/.test(a.text), `answer: ${say(a)}`);
});

// ---- the verb of the question -----------------------------------------------------------------------------------------------------------------------------------------------------------------
const KNOWN = [['Halleck', 'Heintzelman', 'July 5', 'or27-3:p0545.1'], ['Butterfield', 'Schenck', 'June 27', 'or27-3:p0361.2'], ['Halleck', 'Dix', 'July 14', 'or27-3:p0700.2']];
const FORMS = {
  report: (s, a, d) => `What did ${s} report to ${a} on ${d}?`, tell: (s, a, d) => `What did ${s} tell ${a} on ${d}?`, ask: (s, a, d) => `What did ${s} ask ${a} on ${d}?`,
  order: (s, a, d) => `What did ${s} order ${a} to do on ${d}?`, send: (s, a, d) => `What did ${s} send to ${a} on ${d}?`,
};
for (const [verb, form] of Object.entries(FORMS)) {
  test(`RV-EN-5 "${form('S', 'A', 'D')}" finds a dispatch of S to A on D that is in the table (3 dispatches the re-verifier read: Halleck to Heintzelman July 5, Butterfield to Schenck June 27, Halleck to Dix July 14); today the answer is "The site's chronology covers July 1 to 3, 1863 ... no entry for <date>" or a unit card`, { skip: need, timeout: 600000 }, async () => {
    const bad = [];
    for (const [s, a, d, id] of KNOWN) { const ans = await ask(form(s, a, d)); if (!quotes(ans).some((b) => docOf(b) === id)) bad.push(`${form(s, a, d)} => ${ans.mode}: ${say(ans)}`); }
    assert.deepEqual(bad, [], bad.join('\n'));
  });
}

// ---- what time ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const TIMES = [
  ['what time did Couch telegraph to Halleck on June 21', 'or27-3:p0253.3', '9.45'], ['what time did Schenck telegraph to Briggs on June 22', 'or27-3:p0261.5', '4 p'],
  ['what time did Kelley telegraph to Townsend on July 2', 'or27-3:p0496.2', '11 p'], ['what time did Reynolds telegraph to Hooker on June 25', 'or27-3:p0313.4', '11.30'],
  ['what time did Couch telegraph to Halleck on July 14', 'or27-3:p0697.3', '9.30'], ['what time did Williams telegraph to Crawford on June 23', 'or27-3:p0273.2', '11.30'],
];
for (const [q, id, clock] of TIMES) test(`RV-EN-6 ${JSON.stringify(q)} quotes the dispatch whose header gives the time (${id}, ${clock}); today: "S gives no clock time for D in the volume that I could find" or the site's timeline of an unrelated unit`, { skip: need, timeout: 600000 }, async () => {
  const a = await ask(q); const qs = quotes(a).filter((b) => docOf(b) === id);
  assert.ok(qs.length >= 1 && new RegExp(clock.replace(/\./g, '\\.').replace(' ', '\\s*')).test(qs.map((b) => b.text).join(' ') + ' ' + a.text), `answer: ${say(a)}`);
});

// ---- a name the typo repair turns into another, a "who", a name that is not in the volume ----------------------------------------------------------------------------------------------
test('RV-EN-7 "what did Kelley telegraph on July 1" is asked of the corpus as written (B. F. Kelley to Col. E. D. Townsend, July 1, or27-3:p0481.2); today: "Kelley wrote a passage in the volume that speaks of July 1, but none speaks of “kelly”"', { skip: need, timeout: 600000 }, async () => {
  const a = await ask('what did Kelley telegraph on July 1');
  assert.ok(quotes(a).some((b) => docOf(b) === 'or27-3:p0481.2'), `answer: ${say(a)}`);
});
test('RV-EN-8 "who wrote to Doubleday or Howard at 12.10 p. m. on July 1" names Wadsworth from the dispatch (or27-3:p0463.1); today the answer is the site’s chronology of the Eleventh Corps arriving', { skip: need, timeout: 600000 }, async () => {
  const a = await ask('who wrote to Doubleday or Howard at 12.10 p. m. on July 1');
  assert.ok(quotes(a).some((b) => docOf(b) === 'or27-3:p0463.1') || /Wadsworth/.test(a.text), `answer: ${say(a)}`);
});
test('RV-EN-9 "what did Sherman telegraph to Meade on July 5" is declined (no dispatch of Sherman is in the volume); today the answer is the card of the Army of the Potomac', { skip: need, timeout: 600000 }, async () => {
  const a = await ask('what did Sherman telegraph to Meade on July 5');
  assert.ok(/(did not find|do not find|could not find|no dispatch|none of|not in the Official Records)/i.test(a.text) && !/Army of the Potomac \(Union\) was a/.test(a.text), `answer: ${say(a)}`);
});

// ---- what holds ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('RV-EN-G1 (green) the Part 3 dispatches the re-verifier read are found in the forms the fixer’s sets use, "what did S telegraph to A on D" and "write to" (8 of the 30 here; 30 of 30 and 30 of 30 in the re-verifier’s scratch run)', { skip: need, timeout: 600000 }, async () => {
  const t = JSON.parse(fs.readFileSync(path.join(ROOT, 'historian-src/corpus/or27/dispatches.json'), 'utf8')); const rows = t.rows.map((r) => Object.fromEntries(t.fields.map((f, i) => [f, r[i]])));
  const MON = { June: '06', July: '07', August: '08' };
  const set = [['Halleck', 'Heintzelman', 'July 5'], ['Butterfield', 'Schenck', 'June 27'], ['Hooker', 'Sedgwick', 'June 15'], ['Lee', 'Davis', 'June 23'], ['Thomas', 'Butterfield', 'July 6'], ['Stanton', 'Hooker', 'June 6'], ['Couch', 'Meade', 'July 6'], ['Seddon', 'Hill', 'June 27']];
  const bad = [];
  for (const [s, a, d] of set) {
    const [mo, day] = d.split(' '); const iso = `1863-${MON[mo]}-${String(day).padStart(2, '0')}`;
    const exp = new Set(rows.filter((r) => r.written === iso && String(r.signer || '').toUpperCase().includes(s.toUpperCase()) && String(r.addressee || '').toUpperCase().includes(a.toUpperCase())).map((r) => r.id));
    assert.ok(exp.size >= 1, `the table has no ${s} to ${a} on ${d}`);
    for (const v of ['telegraph', 'write']) { const ans = await ask(`What did ${s} ${v} to ${a} on ${d}?`); if (!quotes(ans).some((b) => exp.has(docOf(b)))) bad.push(`${v} ${s} ${a} ${d}: ${say(ans)}`); }
  }
  assert.deepEqual(bad, [], bad.join(' | '));
});
test('RV-EN-G2 (green) wrong-day and direction traps whose premise was checked in all three parts decline in so many words and quote nothing as the answer', { skip: need, timeout: 600000 }, async () => {
  const bad = [];
  for (const q of ['what did Sedgwick telegraph on July 5', 'what did Hancock telegraph on June 26', 'what did Reynolds telegraph on June 22', 'what did Warren telegraph on July 11', 'what did Sickles telegraph on July 2', 'what did Heintzelman telegraph to Hooker on June 22', 'what did Howard telegraph to Meade on June 21', 'what did Milroy telegraph to Couch on June 23']) {
    const a = await ask(q); if (quotes(a).length || !/(did not find|none of|no dispatch)/i.test(a.text)) bad.push(`${q}: ${a.mode} ${say(a)}`);
  }
  assert.deepEqual(bad, [], bad.join('\n'));
});
