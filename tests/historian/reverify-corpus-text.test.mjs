// reverify-corpus-text.test.mjs - second adversarial pass (re-verifier workstream) over the TEXT of the Official Records corpus after the second build (07c3b81).
//
// The fixer's tests (VI-TX-1..5, RB-TX-1..3) hold the classes the first verifier named: glued numbers, foot notes spliced into a sentence, compiler's notes quoted as the author's, running heads in the middle
// of a sentence, a passage opening with page number and head. They are green. The re-verifier found the same family one step to the side, by reading 100 dispatch documents against the Archive's raw OCR
// and by looking in the passages for what the take-out was meant to take out:
//   * the running head "[Chap. XXXIX." that the OCR printed as "[Chap, yyytt", "[Chap. YYYTY" and a dozen other garbles survives in 35 passages (22 of them between two sentences, 7 dispatch documents start or
//     end with one), and "TJNION." / "UNION." (the end of "CORRESPONDENCE, ETC. UNION.") in 5 more;
//   * a printer's signature mark ("30 R R - VOL XII.VII, PT III") is left at the end of a dispatch;
//   * foot-of-page notes still stand in the text: 11 of the 60 foot notes the Archive's per-leaf OCR shows (a line that opens with * or a dagger in the last lines of a leaf and is a note) are still in a
//     passage, among them cross-references of the compiler ("*See Meade to Halleck, February 25, 1864, p. 120.") and the notes under or27-3:p0032.3 and p1006.3, whose words end up after the signature of
//     the dispatch they stand under.
// Counts are in each title. Red by design.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { ROOT } from './lib/data.mjs';
import { SKIP as NEED } from './lib/or27-fixture.mjs';

const RAWP = path.join(ROOT, 'historian-src/raw/or27/passages.jsonl');
const need = fs.existsSync(RAWP) ? false : NEED;
let memo = null;
const passages = () => (memo ||= fs.readFileSync(RAWP, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)));
const paras = (t) => t.split(/\n\n+/).map((s) => s.trim());

test('RV-TX-1 no paragraph of a passage is only the running head "[Chap. XXXIX." in any OCR garble (35 passages: "[Chap, yyytt" ends or27-3:p0193.3, "[Chap, yyyty" opens or27-3:p0058.1, "[Chap. TYYTV" splits a sentence of or27-1:0028#3a3caea7)', { skip: need }, () => {
  const hit = [];
  for (const p of passages()) paras(p.text).forEach((q, i) => { if (/^\[?\s*Chap\b/i.test(q) && q.length < 40) hit.push(`${p.id}#${i} ${JSON.stringify(q)}`); });
  assert.deepEqual(hit, [], `${hit.length} head fragments: ${hit.slice(0, 6).join(' | ')}`);
});
test('RV-TX-2 no paragraph is only the tail of the running head "CORRESPONDENCE, ETC. UNION." / "CONFEDERATE." (5 passages: "TJNION." closes or27-3:p0026.4, "tTNION." or27-3:p0554.3, ", UNION." or27-3:p0602.4)', { skip: need }, () => {
  const hit = [];
  for (const p of passages()) paras(p.text).forEach((q, i) => { if (q.length <= 22 && /^[^a-z]*([TUVYI]{0,2}J?NION|C[O0]NFEDERATE)\W*$/i.test(q) && /[A-Z]{4}/.test(q)) hit.push(`${p.id}#${i} ${JSON.stringify(q)}`); });
  assert.deepEqual(hit, [], hit.join(' | '));
});
test('RV-TX-3 the printer’s signature mark ("30 R R - VOL XII.VII, PT III", the sheet mark at the foot of the first page of a sheet) is not in a passage (or27-3:p0465.4 ends with it, after "S. WILLIAMS.")', { skip: need }, () => {
  const hit = passages().filter((p) => /\b\d{1,2}\s*R\s*R\s*[-—–]\s*VOL/.test(p.text)).map((p) => p.id);
  assert.deepEqual(hit, []);
});
test('RV-TX-4 a foot note of the compiler is not a paragraph of the text: none begins with an asterisk or dagger and "See ... p. N" / "But see revised statement" (7 notes: "*See Meade to Halleck, February 25, 1864, p. 120.", "*Of March 15, 1864, p. 127." ...)', { skip: need }, () => {
  const hit = [];
  for (const p of passages()) paras(p.text).forEach((q) => {
    if (/^[*†‡§]\s?(See|Compare|Cf\.|Of [A-Z][a-z]+ \d|For |But see)/.test(q) && /\b(pp?\.|Series|Part|statement)\s?[IVX\d]/.test(q)) hit.push(`${p.id} ${JSON.stringify(q.slice(0, 70))}`);
  });
  assert.deepEqual(hit, [], `${hit.length} cross-reference / revised-statement notes: ${hit.join(' | ')}`);
});
test('RV-TX-5 the notes under two dispatches are not words of the dispatch (or27-3:p0032.3: "* See Halleck to Barnard. June 8, 1863, p. 36." and "f Consisting of the First Maine and Second and Tenth New York Cavalry"; or27-3:p1006.3: "*The Departments of North Carolina (Maj. Gen. D. H. Hill), of Richmond ... See Series I, Vol. XVIII, pp. 953, 1077.")', { skip: need }, () => {
  const by = (id) => passages().filter((p) => p.doc === id).sort((a, b) => a.seq - b.seq).map((p) => p.text).join('\n\n');
  const a = by('or27-3:p0032.3'), b = by('or27-3:p1006.3');
  const found = [];
  if (/Consisting of the First Maine/.test(a)) found.push('p0032.3 "Consisting of the First Maine..."');
  if (/See Halleck to Barnard/.test(a)) found.push('p0032.3 "See Halleck to Barnard"');
  if (/The Departments of North Carolina \(Maj\. Gen\. D\. H\. Hill\)/.test(b)) found.push('p1006.3 "The Departments of North Carolina ..."');
  assert.deepEqual(found, [], found.join(' | '));
});

// ---- RV-TX-6: the class, read from the Archive. Needs the Archive's per-leaf OCR (tmp/historian-cache, git-ignored); skipped without it.
const CACHE = path.join(ROOT, 'tmp/historian-cache');
const haveCache = () => fs.existsSync(path.join(CACHE, 'sources.lock.json'));
function archiveFile(part, kind) {
  const lock = JSON.parse(fs.readFileSync(path.join(CACHE, 'sources.lock.json'), 'utf8'));
  for (const [k, v] of Object.entries(lock)) if (v.url.endsWith(`warofrebellion27${part}unit_${kind}`) && !v.range) return fs.readFileSync(path.join(CACHE, k + '.body'));
  throw new Error('not in the cache: ' + part + ' ' + kind);
}
const alnum = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
test('RV-TX-6 at most 2% of the foot notes the Archive’s per-leaf OCR shows are still in the passages (60 foot-note lines found by an opening * / dagger in the last 14 lines of a leaf; 11 = 18% remain in the text)', { skip: need || (haveCache() ? false : 'the Archive cache (tmp/historian-cache) is not here') }, () => {
  const corp = {}; for (const p of passages()) corp[p.part] = (corp[p.part] || '') + alnum(p.text) + '|';
  let tot = 0; const surv = [];
  for (const part of [1, 2, 3]) {
    const st = zlib.gunzipSync(archiveFile(part, 'hocr_searchtext.txt.gz')).toString('utf8');
    const pi = JSON.parse(zlib.gunzipSync(archiveFile(part, 'hocr_pageindex.json.gz')).toString('utf8'));
    const cps = /[\ud800-\udfff]/.test(st) ? Array.from(st) : null;
    pi.forEach((e, li) => {
      const t = cps ? cps.slice(e[0], e[1]).join('') : st.slice(e[0], e[1]);
      const lines = t.split('\n').map((l) => l.trim()).filter(Boolean).slice(-14);
      for (const l of lines) if (/^[*†‡§]\s?[A-Z][a-z]{2,}/.test(l) && l.length > 25 && !/^\*\s?\*/.test(l)) { const key = alnum(l).slice(0, 36); if (key.length < 24) continue; tot++; if (corp[part].includes(key)) surv.push(`p${part} leaf ${li}: ${l.slice(0, 60)}`); }
    });
  }
  assert.ok(tot >= 40, `the Archive text shows ${tot} foot-note lines (the re-verifier counted 60)`);
  assert.ok(surv.length / tot <= 0.02, `${surv.length} of ${tot} (${(100 * surv.length / tot).toFixed(0)}%) foot notes are still in the passages: ${surv.slice(0, 5).join(' | ')}`);
});
