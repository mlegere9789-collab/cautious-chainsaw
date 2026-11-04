// or27-rebuild.test.mjs - the classes of defect the verifier found in the Official Records corpus (verify-ingest-*.test.mjs) and how each is now held, as tests of the CLASS and not of the instance:
//   RB-PG   printed pages: an INDEPENDENT re-derivation of the page of every sentence start from the Archive's per-leaf OCR (tests/historian/lib/leaf-check.mjs), at most 0.1% disagreement, and proof that the
//           check can fail (a seeded fault is found)
//   RB-DS   dispatch segmentation: the grammar of 1863 headers on synthetic text, and the build scored against three hand-labelled samples (100 documents tuned on, 50 and 40 never tuned on)
//   RB-TX   text residue: running-head fragments, glued numbers, footnotes
//   RB-DY   the day register of the clock claims
//   RB-EN   the engine: what it says when it finds nothing (what was searched), a day asked is a day answered, a topic asked is a topic quoted, an author the registry does not hold
//   RB-H30  the 30 hand questions (or27-hand30.json)
// Tests that need the build (historian-src/raw/or27, git-ignored) or the Archive's per-leaf OCR (tmp/historian-cache) are SKIPPED LOUDLY without them, with the commands that make them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/data.mjs';
import { or27, available, SKIP as NEED } from './lib/or27-fixture.mjs';
import { haveLeafOcr, loadVolume, checkPages } from './lib/leaf-check.mjs';
import { loadDispatchDocs, scoreSample } from './lib/dispatch-sample.mjs';
import { loadHand30, runHand, claimsIndex } from './lib/or27-hand30.mjs';
import { pageSpan } from '../../historian-src/core/select.js';
import { segmentDispatches, readDateline, findSignatures, nameOf, isTitleLine } from '../../tools/historian/ingest/or27-dispatch.mjs';
import { stripEtcRun, isHeadFragment } from '../../tools/historian/ingest/notes.mjs';
import { dayTracker } from '../../tools/historian/ingest/times.mjs';

const RAW = path.join(ROOT, 'historian-src/raw/or27'), TABLES = path.join(ROOT, 'historian-src/corpus/or27');
const need = available() ? false : NEED;
const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
// A quote of a dispatch is a document of Part 3 or, since the engine reads the dispatches that Parts 1 and 2 print inside a report (historian-src/core/embedded.js), a quote whose attribution says it is a dispatch printed within a report. The
// first form of these tests held that every quote is of Part 3, when only Part 3 was indexed as dispatches; a dispatch of Halleck's to Hooker printed at pt. 1, p. 41 is a dispatch Halleck wrote to Hooker (changed 2026-10-22, R1e-ACC).
const isDispatchQuote = (b) => /^or27-3:/.test(b.passage) || (/^or27-[12]:/.test(b.passage) && /^dispatch dated /.test(String(b.attrib)));
const seg = (text) => segmentDispatches({ text, pages: [{ offset: 0, page: 1 }] }, { part: 3 }).docs;

// ---- RB-PG ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const NOLEAF = haveLeafOcr() ? false : 'SKIPPED LOUDLY: the Archive\'s per-leaf OCR is not in tmp/historian-cache: run  node tools/historian/ingest/corpus.mjs build  (it fetches the three hocr_searchtext / hocr_pageindex files politely)';
const pagesOf = (P, shift = 0) => (p, s) => { const sp = pageSpan(p.pg, s, s + 1, null); return sp ? +String(sp.pages).split(/[–-]/)[0] + shift : null; };
test('RB-PG-1 the page of every sentence start, re-derived from the Archive\'s per-leaf OCR by looking its letters up, disagrees with the corpus on at most 0.1% of the sentence starts it can check', { skip: NOLEAF || need, timeout: 600000 }, () => {
  const P = fs.readFileSync(path.join(RAW, 'passages.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const vols = { 1: loadVolume(1), 2: loadVolume(2), 3: loadVolume(3) };
  const r = checkPages(P, vols, pagesOf(P));
  const rate = r.wrong.length / r.located;
  console.log(`   ${r.located} of ${r.sentences} sentence starts located and checked (${r.unlocated} not found in the Archive's text, ${r.set_aside} set aside as printed twice, ${r.folio_unchecked} on a leaf whose folio could not be read twice); ${r.wrong.length} wrong (${(100 * rate).toFixed(3)}%) in ${r.passages_wrong.size} of ${r.passages.size} passages; the first build: 1.97%`);
  assert.ok(r.located >= 0.9 * (r.sentences - r.set_aside), `only ${r.located} of ${r.sentences} located: the check would say little`);
  assert.ok(rate <= 0.001, `${r.wrong.length} of ${r.located} sentence starts (${(100 * rate).toFixed(3)}%) are cited on another page than the Archive's own text shows: ${JSON.stringify(r.wrong.slice(0, 3))}`);
  assert.ok(r.wrong.every((w) => Math.abs(w.got - w.want) <= 5), 'a wrong page is at most a few pages off (the worst of the build is four)');
});
test('RB-PG-2 the page check can fail: the same corpus with every page one too high, or a tenth of the passages one too low, is found wrong', { skip: NOLEAF || need, timeout: 600000 }, () => {
  const P = fs.readFileSync(path.join(RAW, 'passages.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const vols = { 1: loadVolume(1), 2: loadVolume(2), 3: loadVolume(3) };
  const high = checkPages(P, vols, pagesOf(P, +1)); assert.ok(high.wrong.length / high.located > 0.9, `${high.wrong.length} of ${high.located}`);
  const some = checkPages(P, vols, (p, s) => { const sp = pageSpan(p.pg, s, s + 1, null); const g = sp ? +String(sp.pages).split(/[–-]/)[0] : null; return p.n % 10 === 3 || (p.seq % 10 === 3) ? g - 1 : g; });
  assert.ok(some.wrong.length / some.located > 0.03, `a seeded one-in-ten fault is found: ${some.wrong.length} of ${some.located}`);
});

// ---- RB-DS ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('RB-DS-1 a dateline is read in the spellings of 1863 and of the OCR: place above the date, a clock whose "m." the OCR lost, a place in brackets with its opening bracket read as a backslash, a stray letter after the day, a received time', () => {
  assert.equal(readDateline('July 13, 1863.', { prevOk: true }).day, 13);
  const a = readDateline('Harrisburg, July 5, 1863—5 p. np', { prevOk: true }); assert.deepEqual([a.month, a.day, a.place], [7, 5, 'Harrisburg']); assert.equal(a.clock.min, 17 * 60, 'the clock survives a garbled "m."');
  const b = readDateline('July 9, 1863 — 9 a. . m.', { prevOk: true }); assert.equal(b.clock.min, 9 * 60);
  const c = readDateline('\\Taney town], July 2, 1863 — 2.40 a. m.', { prevOk: true }); assert.deepEqual([c.month, c.day, c.place], [7, 2, 'Taney town']);
  const d = readDateline('Warrenton Junction , Va., June 13,t 1863.', { prevOk: true }); assert.deepEqual([d.month, d.day], [6, 13]);
  const e = readDateline('Fairfax Court-House, June 7, 1863 — 8.30 p. m. Lieut. Col. J. H. Taylor,', { prevOk: true }); assert.match(e.tail, /Taylor/);
  const f = readDateline('TJpperville, Va., July 22, 1863 — 10 a. m. Major-General Pleasonton,', { prevOk: true }); assert.match(f.place, /^Upperville/);
  assert.equal(readDateline('ordered for to-morrow, July 11, 1863', { prevOk: false }), null, 'a date inside a sentence is no dateline');
});
test('RB-DS-2 a signature is a name and its title, never a list of addressees or a running head: "0. 0. HOWARD." (zero for O), "w. g. McCreary," (lower case) with a title under it, "AND OTHERS," is not one, "Adjutant- General ," stays with its signature', () => {
  assert.equal(nameOf('0. 0. HOWARD.').name, 'O. O. HOWARD');
  const lower = findSignatures(['I respectfully request an answer.', '', 'w. g. McCreary,', '', 'Captain , and Signal Officer.']); assert.equal(lower.length, 1); assert.match(lower[0].name, /McCreary/);
  assert.equal(nameOf('AND OTHERS,'), null); assert.ok(nameOf('AND’W T. McREYNOLDS, Colonel First New York Cavalry, Commanding .'));
  assert.ok(isTitleLine('Brigadier- General, Commanding Maryland Heights.'));
  const docs = seg(['Headquarters,', '', 'Richmond, Va., July 10, 1863.', '', 'General Jones:', '', 'Something here to say about the matters of the day and of the enemy in front of us today.', '', 'L. THOMAS,', '', 'Adjutant- General ,', '', '', 'Confidential.] War Department,', '', 'Washington, July 4, 1863 — 4.40 p. m.', 'General Lorenzo Thomas, Harrisburg:', '', 'We have sure information that the enemy must fight his way through alone, and everything here will be employed to push him hard.', '', 'EDWIN M. STANTON,', '', 'Secretary of War.', ''].join('\n'));
  assert.equal(docs.length, 2); assert.match(docs[0].text, /Adjutant- General ,$/, 'the title line belongs to the signature above it'); assert.doesNotMatch(docs[1].text, /^Adjutant/);
});
test('RB-DS-3 two dispatches printed one after the other are two documents (same sender twice, the second with a garbled clock; the second addressed above its own dateline after a signature the OCR spelled with a zero), and a forwarded message with no signature of its own stays in its cover', () => {
  const two = seg(['Harrisburg, Pa.,', '', 'July 5, 1863 — 3 p. m.', '', 'General Meade :', '', 'Dispatch from Loudon says Potomac rising rapidly; six feet of water at Williamsport; I am afraid this latter is not true at all.', '', 'D. N. COUCH,', '', 'Major- General.', '', 'Harrisburg, July 5, 1863—5 p. np', '', 'General Meade,', '', 'Army of the Potomac :', '', 'Scouts from Chambersburg report large wagon trains moving from Waynesborough toward Hagerstown and the river.', '', 'D. N. COUCH,', '', 'Major - General.', ''].join('\n'));
  assert.equal(two.length, 2); assert.deepEqual(two.map((d) => d.clock && d.clock.min), [15 * 60, 17 * 60]); assert.ok(two.every((d) => /COUCH/.test(d.signer)));
  const zero = seg(['Headquarters Sixth Corps,', '', 'July 12, 1863 — 10 a. m.', '', 'Major-General Humphreys :', '', 'My chief of staff reports that our cavalry has possession of Hagerstown and the roads beyond it, and that the enemy is falling back.', '', '0. 0. HOWARD.', '', 'General Meade :', '', 'Hagerstown, July 12, 1863 — 9.15 a. m.', '', 'Have full possession of the town. Cavalry on the other side of it, and the enemy has thrown up works about a mile and a half to the southwest.', '', 'O. O. HOWARD,', '', 'Major- General.', ''].join('\n'));
  assert.equal(zero.length, 2, 'a zero for the O of the initials does not hide the first signature');
  assert.match(zero[1].addressee || '', /Meade/); assert.equal(zero[1].place, 'Hagerstown');
  const fwd = seg(['General Haupt :', '', 'Hanover Junction,', '', 'July 7, 1863.', '', 'Please note the following dispatch from the president of our road :', '', 'J. N. Du Barry :', '', 'Harrisburg, Pa., July 7, 1863.', '', 'Smeed has telegraphed General Haupt that we refused to furnish any materials, or render him any assistance in the repairs of our road.', '', 'J. N. DU BARRY,', '', 'Vice-President.', ''].join('\n'));
  assert.equal(fwd.length, 1, 'a forwarded message without a signature of its own is part of the message that forwards it');
});
test('RB-DS-4 the place line, the tags and the office a dateline stands under belong to the dispatch that follows, not to the one above ("Three miles from Rockville," / "U. S. Military Telegraph, War Department," / "Army of the Potomac," under a signature)', () => {
  for (const hdr of ['Three miles from Rockville,', 'U. S. Military Telegraph, War Department,', 'Army of the Potomac,']) {
    const docs = seg(['War Department,', '', 'Washington, June 28, 1863 — 7.30 p. m.', '', 'Major-General Schenck, Baltimore:', '', 'It is probable that the rebel cavalry will first strike at the bridges near Annapolis Junction and then at Elysville.', '', 'H. W. HALLECK,', '', 'General-in- Chief.', '', hdr, '', 'June 28, 1863. (Received 7.20 p. m.)', '', 'Major Eckert :', '', 'The wagon train is still here, burning. The rebel pickets are two miles from here, and a force of cavalry is reported near.', '', 'COWAN.', ''].join('\n'));
    assert.equal(docs.length, 2, hdr);
    const foot = docs[0].text.trim().split('\n').pop().trim(); assert.doesNotMatch(foot, /(?:Rockville|Telegraph|Department|Potomac),$/, `${hdr}: the line is left at the foot of the dispatch above`);
    assert.ok(docs[1].text.includes(hdr), `${hdr}: the second dispatch holds its own header`);
  }
});
const SAMPLES = [['or27-dispatch-sample.json', 0.97, 'the 100 documents of the first build the segmenter was tuned on'], ['or27-dispatch-heldout.json', 0.95, 'the 50 documents drawn after tuning and read before being scored'], ['or27-dispatch-fresh.json', 0.93, 'the 40 documents drawn after the first round of fixes'], ['or27-dispatch-final.json', 0.93, 'the 40 documents of the last draw (first score 36 of 41, 87.8%; two classes and two label slips fixed since)']];
for (const [file, floor, what] of SAMPLES) {
  test(`RB-DS-5 ${file}: ${what}: every check of at least ${100 * floor}% of the hand-labelled dispatches`, { skip: need }, () => {
    const fx = J('tests/historian/fixtures/' + file); const r = scoreSample(fx, loadDispatchDocs(RAW, TABLES));
    console.log(`   ${file}: ${r.dispatches} true dispatches: found ${r.found}, isolated ${r.isolated}, clean edges ${r.clean_end}, date ${r.date}, clock ${r.clock}, place ${r.place}/${r.place_asked}, addressee ${r.to}/${r.to_asked}, signer ${r.signer}; every check ${r.all} (${(100 * r.all / r.dispatches).toFixed(1)}%)${r.fails.length ? '; failing: ' + r.fails.map((f) => f.n + '.' + f.k + ' ' + f.why.join(' | ')).join('; ') : ''}`);
    assert.ok(r.dispatches >= (file.includes('sample') ? 110 : 40), 'the sample keeps its size');
    assert.ok(r.found >= 0.97 * r.dispatches, `${r.found} of ${r.dispatches} dispatches found`);
    assert.ok(r.all / r.dispatches >= floor, `${r.all} of ${r.dispatches}: ${r.fails.map((f) => f.n + '.' + f.k + ' ' + f.why.join(' | ')).join('; ')}`);
  });
}

// ---- RB-TX ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('RB-TX-1 the left-hand head of Parts 1 and 2 ("N. C., VA., W. VA., MD., PA., ETC.") is taken out in every OCR spelling that runs into a body line, and a sentence that ends in "etc." is left alone', () => {
  for (const [t, left] of [['the artillery fire upon  V PA., ETC.', 'the artillery fire upon'], ['to  JID., PA., ETC.  mv support, if required.', 'to  mv support, if required.'], ['one that  626 ? AID., PA., ETC.  case of a battle', 'one that  case of a battle'], ['to the right  W. VA., MD., PA., ETC.  of the road', 'to the right of the road'], ['upon  N. 0., VA., AV. VA.? MD.j PA.,  ETC.  of the enemy', 'upon  of the enemy']]) {
    const r = stripEtcRun(t); assert.ok(r.hit, t); assert.equal(r.text.replace(/\s+/g, ' ').trim(), left.replace(/\s+/g, ' ').trim());
  }
  for (const keep of ['He drew rations, shoes, blankets, etc. for the men.', 'supplies of cattle, sheep, hogs, ETC. were taken', 'the division of Gen. J. E. B. Stuart, ETC.']) assert.equal(stripEtcRun(keep).hit, false, keep);
});
test('RB-TX-2 the pieces of a head on a line of their own are recognised by what they say, and a line of text is not: " — CONFEDERATE.", "N. C.,", "Chap. XXXIX.]"; a page number is a fragment only next to the leaf\'s own folio', () => {
  for (const t of ['" — CONFEDERATE.', '— UNION.', 'N. C.,', 'Chap. XXXIX.]', 'VA.j W. VA.,']) assert.equal(isHeadFragment(t, 939), true, t);
  assert.equal(isHeadFragment('939', 939), true); assert.equal(isHeadFragment('939', 700), false, 'a number far from the folio is a number');
  for (const t of ['The enemy attacked at dawn.', 'Pa.,', 'Respectfully,']) assert.equal(isHeadFragment(t, 939), false, t);
});
test('RB-TX-3 the build holds none of the residue classes the verifier counted: glued compound numbers, footnotes spliced into a sentence, the compilers\' notes quoted as the author\'s, a running head inside a passage, a passage opening with a page number and a head', { skip: need }, () => {
  const P = fs.readFileSync(path.join(RAW, 'passages.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const T = { 'glued number': /\b(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth)\b/i, 'footnote splice': /\*\s*(?:Embodied in revised statement|But see revised statement)/, 'compiler': /[—-]\s*Compiler\b/, 'running head': /Chap\.\s*[IXLV]+\.\]\s*CORRESPONDENCE|N\. C\., VA\., W\. VA\./, 'opens with number and head': /^\d{2,4}\s+N\. C\./ };
  const hits = Object.fromEntries(Object.entries(T).map(([k, re]) => [k, P.filter((p) => re.test(p.text)).length]));
  console.log('   residue (the first build: glued 126, footnote splice 118, compiler 4, running head 14, opens with number and head 2): ' + JSON.stringify(hits));
  assert.deepEqual(hits, Object.fromEntries(Object.keys(T).map((k) => [k, 0])));
  // what was taken out is listed, never silent: kinds and counts of notes-removed.jsonl
  const removed = fs.readFileSync(path.join(RAW, 'notes-removed.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); const by = {};
  for (const x of removed) by[x.kind] = (by[x.kind] || 0) + 1;
  assert.ok(by.footnote >= 400 && by['head-line'] >= 3000 && by['inline-head'] >= 100, JSON.stringify(by));
  // the independent audit of the footnotes taken out: every one stands at the foot of a leaf (a note starting with a mark, "Embodied", "See", "Not", "For"...); the atypical ones are listed in the build, not judged here
});

// ---- RB-DY ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('RB-DY the day register of the clock claims: "the 1st" after "June 30" is July 1, "the 28th" in a narrative at the start of July is June 28, "the 1st instant" follows the narrative\'s month, a clock followed by "on the following morning" is of the next day', () => {
  const day = (t, sentences) => { let last; for (const s of sentences) last = t.at(s, [s.length])[0]; return last.day; };
  assert.deepEqual(day(dayTracker({ month: 7 }), ['On the night of June 30, the command lay near Emmitsburg.', 'About 8 o’clock on the morning of the 1st, we marched.']), { m: 7, d: 1 });
  assert.deepEqual(day(dayTracker({ month: 7 }), ['On the 2d the enemy attacked.', 'Recalling that on the 28th we had left Frederick.']), { m: 6, d: 28 });
  assert.deepEqual(day(dayTracker({ month: 6 }), ['Hdqrs. First Cavalry Brigade, July 31, 1863.', 'About 8 o’clock on the morning of the 1st instant, we were in camp.']), { m: 7, d: 1 }, 'a document of two reports: the second is of July');
  assert.deepEqual(day(dayTracker({ month: 7 }), ['On the 2d the enemy attacked and the fight lasted until it was nearly midnight.', 'The batteries opened the battle at 4 a. m. on the following morning.']), { m: 7, d: 3 });
});

// ---- RB-EN ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const quotesOf = (a) => (a.blocks || []).filter((b) => b.t === 'quote' && /^or27-/.test(String(b.passage)));
test('RB-EN-1 (c) the engine never claims there is no dispatch without saying what it searched, and falls back to the dispatches of that day: by one sender, to one addressee, on one day', { skip: need, timeout: 600000 }, async () => {
  const k = await or27(); const eng = k.fresh(); const ask = (q) => eng.ask(q);
  let a = await ask('what did Pleasonton write on June 4');
  assert.equal(a.mode, 'partial'); assert.match(a.text, /did not find a dispatch or letter from .*Pleasonton dated June 4, 1863/); assert.match(a.text, /What I searched: the \d+ passages of dispatches, letters and orders in Part 3 whose printed signature reads “Pleasonton”/);
  assert.match(a.text, /The volume prints \d+ passages of dispatches dated June 4/, 'and what exists that day'); assert.match(a.text, /A signature the scan garbled is not among those, so this does not show that none was written/, 'and why the answer is not "none exists"');
  a = await ask('what did Pleasonton write to Meade on June 9');
  assert.equal(a.mode, 'answer'); assert.match(a.text, /None of .*Pleasonton.* dispatches of June 9 is addressed to “Meade”; the \d+ he wrote that day went to .*Stahel.*Hooker/s); assert.ok(quotesOf(a).length >= 1 && quotesOf(a).every((b) => isDispatchQuote(b)));
  a = await ask('what did Slocum telegraph on July 2'); assert.ok(quotesOf(a).length >= 1 && !/print no dispatch/.test(a.text));
  a = await ask('what did Pleasonton write on June 20'); assert.ok(quotesOf(a).length >= 1 && quotesOf(a).every((b) => /dated June 20, 1863/.test(a.text) && isDispatchQuote(b)), 'a dated "write" is a question of the dispatches of that day');
  a = await ask('what did Kelley write to Averell'); assert.ok(quotesOf(a).length >= 1 && quotesOf(a).every((b) => /Averell/.test(b.text.slice(0, 80))), 'a name the typo repair would turn into a registry name ("Kelly") is asked of the corpus as written first');
});
test('RB-EN-2 (d) a time asked of a day is answered with that day\'s clocks or the answer says the author gives none for it and which days he does give', { skip: need, timeout: 600000 }, async () => {
  const k = await or27(); const eng = k.fresh(); const claims = claimsIndex();
  let a = await eng.ask('what time did Buford say the fighting began on July 1'); const qs = quotesOf(a); assert.ok(qs.length >= 1);
  const days = new Set(qs.flatMap((b) => claims(b).map((c) => c.day))); assert.deepEqual([...days], ['1863-07-01']);
  a = await eng.ask('what time did Longstreet report the assault began on July 3');
  assert.equal(a.mode, 'partial'); assert.equal(quotesOf(a).length, 0); assert.match(a.text, /gives no clock time for July 3 in the volume that I could find\. The times he does give are for [A-Z][a-z]+ \d+/); assert.match(a.text, /times of other days are not given in their place/);
  a = await eng.ask('what time did Geary say the enemy opened the fierce attack on July 2'); assert.ok(quotesOf(a).some((b) => /At 4 p\. m\. the enemy opened/.test(b.text)) && quotesOf(a).every((b) => claims(b).every((c) => c.day === '1863-07-02')));
});
test('RB-EN-3 (f) a report asked about with a day or a topic is quoted for that day and that topic or not at all: no passage of another day in its place, the word asked for preferred to its synonym, three topic words need two in the window', { skip: need, timeout: 600000 }, async () => {
  const k = await or27(); const eng = k.fresh();
  let a = await eng.ask('what did Gregg report about the cavalry fight on July 3'); assert.ok(quotesOf(a).every((b) => !/engagement of the 9th instant|June 12, 1863/.test(b.text)), 'Brandy Station is not July 3');
  a = await eng.ask('what did Pleasonton write on June 4'); assert.equal(quotesOf(a).length, 0);
  a = await eng.ask('what did Gibbon report about the assault'); assert.ok(quotesOf(a).some((b) => /\bassault\b/i.test(b.text)), 'the word asked for, not only its synonym "attack"');
  a = await eng.ask('what did Rodes report about the cannonade and Cemetery Hill'); assert.ok(quotesOf(a).length >= 1 && quotesOf(a).every((b) => /Cemetery Hill|cannonade/i.test(b.text)));
  a = await eng.ask('what did the reports say about the Wheatfield'); assert.ok(quotesOf(a).length >= 2 && quotesOf(a).every((b) => /wheat-field/i.test(b.text)), 'the print spells it with a hyphen; the question does not');
  a = await eng.ask('what did Meade report about the Gettysburg campaign'); assert.ok(quotesOf(a).every((b) => !/[—-]\s*Compiler\b/.test(b.text)));
});
test('RB-EN-4 an author the site\'s registry does not hold is answered from the corpus\'s own senders (F:<surname> marks a report\'s author as it marks a dispatch\'s signer), never from an unrelated site entry; one the volume does not hold is declined', { skip: need, timeout: 600000 }, async () => {
  const k = await or27(); const eng = k.fresh();
  let a = await eng.ask('what time did Ruger say fire was opened on the enemy’s position on the morning of July 3'); assert.equal(a.intent, 'reported-time'); assert.ok(quotesOf(a).some((b) => /4\.30 o/.test(b.text))); assert.match(a.text, /Thomas H\. Ruger/);
  a = await eng.ask('what time did Dobke say the enemy’s batteries opened on July 2'); assert.ok(quotesOf(a).some((b) => /4 p\. m\. of July 2/.test(b.text)));
  a = await eng.ask('what did Halleck write to Hooker'); assert.ok(quotesOf(a).length >= 1 && quotesOf(a).every((b) => isDispatchQuote(b) && /Hooker/.test(b.text.slice(0, 120))));
  a = await eng.ask('what did Smithwick report about Gettysburg'); assert.equal(quotesOf(a).length, 0); assert.doesNotMatch(a.text, /Smithwick wrote/);
});

// ---- RB-H30 ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test('RB-H30 the 30 hand questions: every one owes the behaviour its file says (10 of the classes the verifier found wrong, 14 answered well or declined honestly, 6 outside the registry)', { skip: need, timeout: 900000 }, async () => {
  const k = await or27(); const eng = k.fresh(); const H = loadHand30(); assert.equal(H.items.length, 30);
  const rows = await runHand((q) => eng.ask(q), H.items, claimsIndex()); const by = {}; for (const r of rows) { const c = (by[r.class] ||= { n: 0, pass: 0 }); c.n++; if (r.pass) c.pass++; }
  console.log(`   hand30: ${rows.filter((r) => r.pass).length}/30 (${Object.entries(by).map(([c, v]) => `${c} ${v.pass}/${v.n}`).join(', ')}); the first build's engine on its own KB: 14/30 (wrong 1/10, answered 12/14, outside 1/6)`);
  for (const r of rows.filter((x) => !x.pass)) console.log(`   FAIL ${r.id} ${r.q}: ${r.reasons.join(' | ')}`);
  assert.deepEqual(rows.filter((r) => !r.pass).map((r) => r.id), []);
});
