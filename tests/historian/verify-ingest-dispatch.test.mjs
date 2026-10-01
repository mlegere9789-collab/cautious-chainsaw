// verify-ingest-dispatch.test.mjs - adversarial check of the Part 3 dispatch segmentation and of whom a dispatch is attributed to (verifier workstream; every test here fails today, by design).
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
    if (/^[A-Z][A-Za-z.’' -]+(?:,\s*[A-Za-z.’' -]+){0,3},$/.test(last) && last.length <= 50 && !/\d/.test(last) && !RANKISH.test(last)) bad.push(`${id}: ends "${last}"`);
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
  // or27-3:p0038.2 holds "JUL. STAHEL, Major-General." and then Pleasonton's own dispatch; or27-3:p0486.5 holds "O. O. HOWARD, Major-General." and then Slocum's, dated July 2, 10.30 a. m.
  // Each document carries one sender, one clock and one author line, so the first dispatch of each pair is quoted under the wrong name and with the wrong clock (6.30 p. m. is Howard's).
  const D = docs();
  for (const [id, who] of [['or27-3:p0038.2', 'STAHEL'], ['or27-3:p0486.5', 'HOWARD']]) {
    const text = D.get(id).map((p) => p.text).join('\n');
    const sigs = [...text.matchAll(/^([A-Z][A-Z. ]{4,30}),?(?:\s*(?:Brig|Maj|Col|Lieut|Capt|General|Commanding|Secretary|Governor|Assistant|Chief|Acting|Signal)[^\n]*)?\s*$/gm)].map((m) => m[1].trim());
    assert.ok(sigs.some((s) => s.includes(who)), `${id}: fixture changed (no ${who} signature found: ${JSON.stringify(sigs)})`);
    assert.ok(new Set(sigs.map((s) => s.split(' ').pop())).size <= 1, `${id} holds the signatures ${JSON.stringify(sigs)} and one author line, "${D.get(id)[0].cite.author_line}"`);
  }
});

test('VI-DS-6 every row of the dispatch table is a dispatch with text: the "2,945 dispatches" include 6 table headings with zero passages and a surname as place', { skip: SKIP }, () => {
  const empty = table().filter((r) => !r.passages).map((r) => `${r.id} place="${r.place}"`);
  assert.equal(empty.length, 0, `${empty.length} rows have no passages: ${empty.join('; ')}`);
});
