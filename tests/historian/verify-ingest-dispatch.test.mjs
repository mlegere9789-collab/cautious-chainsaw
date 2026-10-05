// verify-ingest-dispatch.test.mjs - adversarial check of the Part 3 dispatch segmentation and of whom a dispatch is attributed to (verifier workstream; every test here fails today, by design).
// STATUS after the second build (2026-10-04, tests/historian/or27-rebuild.test.mjs and docs/historian/CORPUS.md section 3b): these tests are green. Where a test was refined rather than met as written (a premise of the verifier's that the rebuild showed to be wrong, a fixture keyed by an id the rebuild changed, a regex that read a signature as a place line), the refinement is stated in the test beside the assertion.
//
// The claim under test (docs/historian/CORPUS.md sections 2 and 5): Part 3 is "cut at its datelines" into 2,945 dispatches, each with its place, clock, addressee and sender, and an answer prints
// "<sender> to <addressee>; dispatch dated ..." under every quote. Read by hand (40 random documents) and then counted over the whole tables:
//   * the dateline of a Union dispatch is printed on two lines ("Baltimore, Md.," / "June 7, 1863."); the cut falls between them, so the PLACE line ends the PREVIOUS document and the next
//     dispatch has no place (324 of 2,939 documents, 11%, end with a bare place line; 1,176 have no place);
//   * a date inside a sentence ("ordered for to-morrow, July 11, 1863") is taken for a dateline: the circular of July 10 is two documents, the second dated July 11 and holding its body;
//   * two dispatches printed one after the other (or one forwarded inside another) stay in ONE document whose sender is the last signature: "Jul. Stahel's" dispatch is attributed to
//     "A. Pleasonton to Brig. Gen. A. Pleasonton" (54 documents are attributed to their own addressee, 18 to a sentence, about 160 hold two signatures);
//   * 6 of the 2,945 "dispatches" are table headings with no text (zero passages) and a surname as their place.
//
// Needs the tables and passages the build writes (historian-src/corpus/or27 is committed; historian-src/raw/or27 is git-ignored); skipped loudly without the passages.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/data.mjs';

const PASSAGES = path.join(ROOT, 'historian-src/raw/or27/passages.jsonl');
const SKIP = fs.existsSync(PASSAGES) ? false : 'SKIPPED LOUDLY: historian-src/raw/or27 is not built here; run  node tools/historian/ingest/corpus.mjs build';
const table = () => { const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'historian-src/corpus/or27/dispatches.json'), 'utf8')); return d.rows.map((r) => Object.fromEntries(d.fields.map((f, i) => [f, r[i]]))); };
let memo = null;
const docs = () => {
  if (memo) return memo; const by = new Map();
  for (const line of fs.readFileSync(PASSAGES, 'utf8').split('\n')) { if (!line) continue; const p = JSON.parse(line); if (p.part !== 3) continue; if (!by.has(p.doc)) by.set(p.doc, []); by.get(p.doc).push(p); }
  for (const v of by.values()) v.sort((a, b) => a.seq - b.seq);
  return (memo = by);
};
const surname = (s) => String(s).replace(/[,.:;]+$/, '').trim().split(/\s+/).pop().toLowerCase().replace(/[^a-z]/g, '');
const RANKISH = /General|Colonel|Major|Captain|Lieutenant|Commanding|Chief|Secretary|Governor|Adjutant|Staff|Aide|Sergeant|Operator|President|Surgeon|Quartermaster|Engineers?\b/;

test('VI-DS-1 a dispatch does not end with the place line of the next dispatch ("... ROBT. C. SCHENCK, Major-General. Baltimore, Md.,")', { skip: SKIP }, () => {
  const bad = [];
  for (const [id, v] of docs()) {
    const last = v[v.length - 1].text.split('\n').map((s) => s.trim()).filter(Boolean).pop() || '';
    // refinement after the rebuild: a last line set wholly in capitals is a signature whose title the scan lost ("EDWIN M. STANTON,"), and a closing ("Very respectfully, your obedient servant,") is the sender's own;
    // neither is the place line of the next dispatch. A mixed-case line of capitalised words ending in a comma still is.
    if (/^[A-Z][A-Za-z.’' -]+(?:,\s*[A-Za-z.’' -]+){0,3},$/.test(last) && last.length <= 50 && !/\d/.test(last) && !RANKISH.test(last) && /[a-z]/.test(last) && !/respectfully|obedient|servant/i.test(last)) bad.push(`${id}: ends "${last}"`);
  }
  assert.equal(bad.length, 0, `${bad.length} dispatches end with a dangling place line, e.g.\n  ${bad.slice(0, 8).join('\n  ')}`);
});

test('VI-DS-2 the circular of July 10, 1863 ("The following movements of troops are ordered for to-morrow, July 11") is one dispatch dated July 10, with its body', { skip: SKIP }, () => {
  const rows = new Map(table().map((r) => [r.id, r]));
  const holders = [...docs()].filter(([, v]) => v.some((p) => /1\.\s+The Fifth Corps will move forward, and take post with its right resting on the Antietam/.test(p.text)));
  assert.equal(holders.length, 1, 'the body of the circular is in exactly one document');
  const [id, v] = holders[0];
  assert.match(v[0].text, /Circular|Headquarters Army of the Potomac/, `${id} (written ${rows.get(id).written}) starts with "${v[0].text.slice(0, 40).replace(/\n/g, ' ')}": the circular's header is in another document`);
  assert.equal(rows.get(id).written, '1863-07-10', `${id} is dated ${rows.get(id).written}: July 11 is the day the circular orders, in its first sentence, not the day it was written`);
});

test('VI-DS-3 no dispatch is attributed to its own addressee ("A. Pleasonton to Brig. Gen. A. Pleasonton"; "Joseph Hooker to Major-General Hooker")', { skip: SKIP }, () => {
  const bad = [];
  for (const [id, v] of docs()) {
    const line = v[0].cite && v[0].cite.author_line; if (!line) continue;
    const m = line.match(/^(.+?) to (.+)$/); if (!m) continue;
    const a = surname(m[1]), b = m[2].toLowerCase();
    // refinements after the rebuild, each a fact of the volume and not a loosening: (1) an office is not a person ("Headquarters Army of the Potomac to Maj. Gen. Joseph Hooker, Commanding Army of the Potomac");
    // (2) a sender and an addressee who share a surname but print different first initials are two men ("J. Irvin Gregg to General D. McM. Gregg": cousins; "C. H. Howard to General O. O. Howard": brothers);
    // (3) the one namesake pair the print gives no initials for: M. W. Ransom, a Confederate brigadier, writes to Maj. Gen. Robert Ransom, Jr.
    if (/^(?:Headquarters|Hdqrs|Office|Signal|War Department|Department)\b/i.test(m[1])) continue;
    // the first initial of a name that prints one ("General D. McM. Gregg" -> D; "Major-General Butterfield" -> none: only a surname)
    const initial = (s) => { const t = s.replace(/,.*$/, '').replace(/^(?:(?:Brig(?:adier)?|Maj(?:or)?|Lieut(?:enant)?|Col(?:onel)?|Capt(?:ain)?|Gen(?:eral)?|Hon)[\w.-]*\s+)+/i, '').split(/\s+/).filter(Boolean); return t.length >= 2 ? t[0][0].toUpperCase() : null; };
    const ia = initial(m[1]), ib = initial(m[2]);
    if (ia && ib && ia !== ib) continue;
    if (/^M\. W\. Ransom to (?:Maj(?:or)?|General)[\w.-]* ?(?:General )?Ransom/.test(line)) continue;
    if (a.length > 2 && new RegExp(`\\b${a}\\b`).test(b)) bad.push(`${id}: ${line}`);
  }
  assert.equal(bad.length, 0, `${bad.length} dispatches are shown as written by their addressee, e.g.\n  ${bad.slice(0, 8).join('\n  ')}`);
});

test('VI-DS-4 an addressee is a name, not a sentence ("Meade. to General Meade will withdraw, under the orders of General Reynolds. The point")', { skip: SKIP }, () => {
  const bad = [];
  for (const [id, v] of docs()) {
    const line = v[0].cite && v[0].cite.author_line; if (!line) continue;
    const to = (line.split(' to ')[1] || '');
    if (to.split(/\s+/).length > 12 || /\b(?:will|shall|should|would)\b/.test(to)) bad.push(`${id}: ${line}`);
  }
  assert.equal(bad.length, 0, `${bad.length} attribution lines name a sentence as the addressee, e.g.\n  ${bad.slice(0, 6).join('\n  ')}`);
});

test('VI-DS-5 a dispatch holds the text of ONE dispatch: Stahel\'s dispatch of June 9 (10.54 a. m.) is not filed under Pleasonton, and Howard\'s of July 2 (6.30 p. m.) is not filed under Slocum', { skip: SKIP }, () => {
  // The verifier's two cases, located by their words and not by document id (the rebuild cut the volume again, so the ids of 2026-10-01 name other documents now): the first build held "JUL. STAHEL, Major-General."
  // and then Pleasonton's own dispatch in one document, and "O. O. HOWARD, Major-General." and then Slocum's, dated July 2, 10.30 a. m.; one sender, one clock and one author line then quoted the first dispatch of each
  // pair under the wrong name and with the wrong clock. Now: each of the four dispatches is in a document of its own, signed by one man, and the author line names him.
  const D = docs(); const alnum = (t) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
  const holder = (words) => { const k = alnum(words); const hit = [...D].filter(([, v]) => alnum(v.map((p) => p.text).join(' ')).includes(k)); assert.equal(hit.length, 1, `${hit.length} documents hold "${words}"`); return hit[0]; };
  const pairs = [
    ['Train with four cars just left here', 'STAHEL', 'Stahel', 'The enemy is in strong cavalry force here. We have had a severe fight', 'PLEASONTON', 'Pleasonton'],
    ['The batteries in front of my right flank seem to have been silenced or withdrawn', 'HOWARD', 'Howard', 'If it is true that the enemy are massing troops on our right', 'SLOCUM', 'Slocum'],
  ];
  for (const [w1, sig1, name1, w2, sig2, name2] of pairs) {
    const [id1, v1] = holder(w1), [id2, v2] = holder(w2);
    assert.notEqual(id1, id2, `the dispatches "${w1}" and "${w2}" are in one document, ${id1}`);
    for (const [id, v, who, name] of [[id1, v1, sig1, name1], [id2, v2, sig2, name2]]) {
      const text = v.map((p) => p.text).join('\n');
      const sigs = [...text.matchAll(/^([A-Z][A-Z. ]{4,30}),?(?:\s*(?:Brig|Maj|Col|Lieut|Capt|General|Commanding|Secretary|Governor|Assistant|Chief|Acting|Signal)[^\n]*)?\s*$/gm)].map((m) => m[1].trim());
      assert.ok(sigs.some((x) => x.includes(who)), `${id}: no ${who} signature found: ${JSON.stringify(sigs)}`);
      assert.ok(new Set(sigs.map((x) => x.split(' ').pop())).size <= 1, `${id} holds the signatures ${JSON.stringify(sigs)} and one author line, "${v[0].cite.author_line}"`);
      assert.ok(v[0].cite.author_line.includes(name), `${id}: the author line "${v[0].cite.author_line}" does not name ${name}`);
    }
  }
});

test('VI-DS-6 every row of the dispatch table is a dispatch with text: the "2,945 dispatches" include 6 table headings with zero passages and a surname as place', { skip: SKIP }, () => {
  const empty = table().filter((r) => !r.passages).map((r) => `${r.id} place="${r.place}"`);
  assert.equal(empty.length, 0, `${empty.length} rows have no passages: ${empty.join('; ')}`);
});
