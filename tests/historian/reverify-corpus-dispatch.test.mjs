// reverify-corpus-dispatch.test.mjs - second adversarial pass (re-verifier workstream) over the DISPATCH TABLE and the dispatch documents of the Official Records corpus after the second build (07c3b81).
//
// What the re-verifier did before writing these tests: read the raw OCR (the Archive's djvu text) of a NEW random sample of 100 dispatch documents, drawn with seed 20261005 from the 3,178 rows after taking
// out every document that holds a body of the fixer's four labelled samples, and judged each row against what is printed. First-meeting result on that draw: 95 of 100 documents whole and right in
// signer, addressee, date and clock (5 not: or27-3:p0164.1, p0585.5, p0068.1, p0232.3, p0531.2); 85 of 100 when the place and addressee fields must also be clean (+10: place "Circular.] Headquarters ...",
// "_ „ Washington", "Providenqe, R. I", a place left empty although the header prints one, an addressee with a stray "1" or "'"); 81 of 100 when residue of the printed page must also be absent (+4). A
// 400-page recall screen (datelines on the Archive's page text against rows starting on that page) found a dispatch swallowed by the one before it on 5 of 400 pages.
//
// Each test below states a class and fails today for the reason given; instances are the documents the re-verifier read. They are red by design. The fixer's own samples (83.0 / 87.8 / 87.8 per cent at first
// meeting) and these figures agree within the width of a 100-document sample (Wilson 95% interval for 85/100: 76.7 to 90.9).
//
// Needs the corpus text (historian-src/raw/or27, git-ignored) and the dispatch table (tracked); skipped loudly without the text.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/data.mjs';
import { SKIP as NEED } from './lib/or27-fixture.mjs';

const RAWP = path.join(ROOT, 'historian-src/raw/or27/passages.jsonl');
const need = fs.existsSync(RAWP) ? false : NEED;
let memo = null;
function load() {
  if (memo) return memo;
  const by = new Map();
  for (const l of fs.readFileSync(RAWP, 'utf8').split('\n')) { if (!l) continue; const p = JSON.parse(l); if (p.part !== 3) continue; if (!by.has(p.doc)) by.set(p.doc, []); by.get(p.doc).push(p); }
  const docs = new Map([...by].map(([id, ps]) => [id, ps.sort((a, b) => a.seq - b.seq).map((p) => p.text).join('\n\n')]));
  const t = JSON.parse(fs.readFileSync(path.join(ROOT, 'historian-src/corpus/or27/dispatches.json'), 'utf8'));
  const rows = t.rows.map((r) => Object.fromEntries(t.fields.map((f, i) => [f, r[i]])));
  return (memo = { docs, rows, row: new Map(rows.map((r) => [r.id, r])) });
}
const paras = (t) => t.split(/\n\n+/).map((s) => s.trim()).filter(Boolean);

// ---- RV-DS-1: one document, one dispatch ------------------------------------------------------------------------------------------------------------------------------------------------------
const MONTH = '(?:June|July|August|Jidy|Jnne|Jane|Ju1y|Aug\\.?)';
const dateRe = new RegExp(MONTH + '\\s+\\S{1,3}[,.]?\\s*(?:18[6G]3|I860|\\S{4})');
const sigRe = /^[A-Z0-9*][A-Za-z0-9.’' *()[\]-]{3,48}[.,]?$/;
const rankRe = /^(?:\[?\(?)(?:Major|Maj\.|Brig|Lieut|Colonel|Col\.|Captain|Capt\.|General|Gen\.|Chief|Assistant|Commanding|Acting|Surgeon|Secretary|President|Adjutant|Aide|Governor|Commander|Provost|Signal|Medical|Inspector)/;
const adrRe = /^(?:Hon\.|His Excellency|Maj\.?|Major|Brig|Lieut|Colonel|Col\.|Captain|Capt\.|General|Gen\.|Governor|Commanding|Mr\.|Admiral|Brigadier|Commodore|Surgeon|Dr\.|President|Secretary)[^\n]{2,90}:\s*[’']?$|^(?:[A-Z][a-z]+\.? ){1,3}[A-Z][a-z]+,?\s*$/;
/** the paragraph index of a second dispatch header that follows a signature block inside one document, or -1 */
export function secondHeader(text) {
  const P = paras(text); let sigAt = -1;
  for (let i = 1; i < P.length - 1; i++) if (sigRe.test(P[i]) && /[A-Z]{2,}/.test(P[i]) && rankRe.test(P[i + 1]) && P[i].length < 45) { sigAt = i + 1; break; }
  if (sigAt < 0) return -1;
  for (let j = sigAt + 1; j < P.length - 1; j++) {
    if (P[j].length < 80 && dateRe.test(P[j]) && !/^\[?(?:Indorsement|Inclosure|Sub-Inclosure)/i.test(P[j - 1] || '')) {
      let adr = false; for (let k = Math.max(sigAt, j - 2); k <= Math.min(j + 3, P.length - 1); k++) if (k !== j && adrRe.test(P[k])) adr = true;
      if (adr && P.slice(j + 1).join(' ').length > 80) return j;
    }
  }
  return -1;
}
test('RV-DS-1 no dispatch document holds a second dispatch after its signature (re-verifier: 10 found by a conservative detector, 15 read by hand; or27-3:p0531.2 is Williams to the Twelfth Corps followed by Butterfield to General William F. Smith, 5.30 a. m., filed as one row signed Butterfield)', { skip: need }, () => {
  const { docs } = load();
  const bad = [...docs].filter(([, t]) => secondHeader(t) >= 0).map(([id]) => id);
  assert.deepEqual(bad, [], `${bad.length} documents hold two dispatches: ${bad.join(' ')}`);
});
test('RV-DS-1b the fifteen documents the re-verifier read are each one dispatch (or27-3:p0172.1 p0173.3 p0202.2 p0206.3 p0284.2 p0462.1 p0517.4 p0531.2 p0548.5 p0558.2 p0690.4 p0766.1 p0794.1 p0918.3 p0929.2)', { skip: need }, () => {
  const { docs } = load();
  const hold = (id, re) => re.test(docs.get(id) || '');
  const second = {
    'or27-3:p0172.1': /Near Aldie\s*,? June 17, 1863/, 'or27-3:p0173.3': /Headquarters Fifth Corps,\s*\n\nGum Springs/, 'or27-3:p0202.2': /Harrisburg, June 18, 1863\.\s*\n\n\(Received 9\.15/, 'or27-3:p0206.3': /Suffolk, June 18, 1863/,
    'or27-3:p0284.2': /Leesburg, June 24, 1863 — l\.lOp\. m\./, 'or27-3:p0462.1': /Commanding Officer Twelfth Corps/, 'or27-3:p0517.4': /Major-General French, Frederick:/, 'or27-3:p0531.2': /General William F\. Smith :/,
    'or27-3:p0548.5': /Carlisle, July 5, 1863\./, 'or27-3:p0558.2': /Gettysburg , July 6, 1863 — 9\.50 a\. m\./, 'or27-3:p0690.4': /Harper\* s Ferry , July 14, 1863 — 2\.15 p\. m\./, 'or27-3:p0766.1': /Warrenton, July 25, 1863 — o p\. m\./,
    'or27-3:p0794.1': /Point of Rocks, July 31, 1863/, 'or27-3:p0918.3': /June 23, 1863\^-5 p\. m\./, 'or27-3:p0929.2': /Richmond , Va\., June z4, 1863\./,
  };
  // p0462.1: the re-verifier's note says it holds "Commanding Officer Sixth Corps" and then "Commanding Officer Twelfth Corps", both addressees in one row. In the committed build the Sixth Corps dispatch (S. Williams) is
  // its own row (p0461.3, 224 words) and p0462.1 is the Twelfth Corps dispatch ALONE (147 words, one signature, Butterfield; the same since 07c3b81), so the Twelfth Corps header is that row's own and not a second dispatch:
  // the row is judged by the two addressees together (R1e: a test that matched the one legitimate header of a single dispatch could not be satisfied by any segmentation)
  const bothWith = { 'or27-3:p0462.1': /Commanding Officer Sixth Corps/ };
  const still = Object.entries(second).filter(([id, re]) => hold(id, re) && (!bothWith[id] || hold(id, bothWith[id]))).map(([id]) => id);
  // p0462.1 holds "Commanding Officer Sixth Corps" and then "Commanding Officer Twelfth Corps": both addressees in one row
  assert.deepEqual(still, [], `still one document with a second header: ${still.join(' ')}`);
});
test('RV-DS-2 no dispatch row without a signer is longer than 1,000 words (seven rows are 1,091 to 4,892 words: orders of battle and several messages filed under one date: or27-3:p0799.1 p0439.1 p1058.1 p0635.3 p0918.3 p0794.1 p0843.2)', { skip: need }, () => {
  const { rows } = load();
  // R1e: a return (an organization of the army, a list of units and their commanders: kind 'return', set by the segmenter from the table heading "Troops in ...", "Organization of ...", "Abstract from ...", "List of ...")
  // has no signer by nature and may be long (5 rows of 1,091 to 2,923 words are left, each one printed table). What the check is for - orders of battle and several messages glued under one date - is judged on the rows that are not returns.
  const long = rows.filter((r) => !r.signer && r.words > 1000 && r.kind !== 'return').map((r) => `${r.id}:${r.words}`);
  assert.deepEqual(long, [], `rows with no signer and over 1,000 words: ${long.join(' ')}`);
});
test('RV-DS-3 no dispatch document ends with the addressee line of the next one (or27-3:p0585.4 ends "General Benham", or27-3:p0418.2 "Commanding Eleventh Corps:", or27-3:p0685.4 "Colonel Spaulding", or27-3:p0982.1 "Col. W. L. Jackson")', { skip: need }, () => {
  const { docs } = load();
  const TITLE = /^(Hon\.|Honorable|His Excellency|General|Major|Maj\.|Brig|Brigadier|Colonel|Col\.|Lieut|Lieutenant|Captain|Capt\.|Governor|Commanding|Mr\.|Admiral|Commodore|Surgeon|Dr\.|Assistant|Adjutant|Chief|President|Secretary|Medical)/;
  const bad = [];
  for (const [id, t] of docs) {
    const P = paras(t); const last = P[P.length - 1] || '', prev = P[P.length - 2] || '';
    const lastIsAddr = last.length < 70 && TITLE.test(last) && /(:|[A-Za-z])\s*$/.test(last) && !/[.]\s*$/.test(last.replace(/\s*[,;]?$/, ''));
    const prevIsSig = /(General|Staff|Colonel|Captain|Secretary|Adjutant|Commanding|Volunteers|Engineer|Officer|Director|Surgeon|Lieutenant|Major|Governor|President)[^\n]{0,40}[.,]?$/.test(prev) && prev.length < 90;
    if (lastIsAddr && prevIsSig) bad.push(`${id} ends ${JSON.stringify(last)}`);
  }
  assert.deepEqual(bad, [], bad.join(' | '));
});
test('RV-DS-4 an addressee the document prints is in the row (or27-3:p0164.1 "Governor Curtin, ... Harrisburg:" above and below the date line; or27-3:p0585.5 to General Benham, whose line is the last line of the document before; or27-3:p0232.3 to Halleck and Couch, signed by Donn Piatt, row says signer Kelley and addressee none)', { skip: need }, () => {
  const { row } = load();
  const miss = [];
  if (!/Curtin/.test(row.get('or27-3:p0164.1').addressee || '')) miss.push(`p0164.1 addressee ${JSON.stringify(row.get('or27-3:p0164.1').addressee)}`);
  if (!/Benham/.test(row.get('or27-3:p0585.5').addressee || '')) miss.push(`p0585.5 addressee ${JSON.stringify(row.get('or27-3:p0585.5').addressee)}`);
  if (!/Halleck/.test(row.get('or27-3:p0232.3').addressee || '')) miss.push(`p0232.3 addressee ${JSON.stringify(row.get('or27-3:p0232.3').addressee)}`);
  // the Baltimore message is signed by Donn Piatt; B. F. Kelley signed the message it forwards (the same layout, Schenck forwarding Kelley at p0183.5, is read as Schenck's)
  if (!/PIATT/i.test(row.get('or27-3:p0232.3').signer || '')) miss.push(`p0232.3 signer ${JSON.stringify(row.get('or27-3:p0232.3').signer)}`);
  assert.deepEqual(miss, [], miss.join(' | '));
});
test('RV-DS-5 the place field is a place: none starts with the order tag "Circular.]" (42 rows of 3,178 carry it as the start of the place; 45 start with "Circular") and none holds scan debris ("_ „ Washington", "T ., ^, Middletown", "Within* Two Miles of Carlisle", "Harper’s Ferry, W. V*a")', { skip: need }, () => {
  const { rows } = load();
  const circ = rows.filter((r) => /^\s*Circular/i.test(r.place || '')).map((r) => r.id);
  const junk = rows.filter((r) => r.place && /[_„~•|^*]|^\W/.test(r.place)).map((r) => `${r.id} ${JSON.stringify(r.place)}`);
  assert.deepEqual([circ.length, junk.length], [0, 0], `${circ.length} places start with "Circular.]" (${circ.slice(0, 4).join(' ')}); ${junk.length} places hold debris: ${junk.join(' | ')}`);
});
test('RV-DS-6 the received time is read when the header prints it (480 documents print "(Received ...)" in their first 400 characters, 39 rows have a received time)', { skip: need }, () => {
  const { rows, docs } = load();
  const printed = rows.filter((r) => /\(\s*(?:Received|Copy received|Sent)/i.test((docs.get(r.id) || '').slice(0, 400)));
  const got = printed.filter((r) => r.received).length;
  assert.ok(got / printed.length >= 0.9, `${got} of ${printed.length} (${(100 * got / printed.length).toFixed(1)}%) rows that print a received time have one`);
});
test('RV-DS-7 a signer is a name: none carries a digit or an OCR "IST" for "N." (18 rows: "D 1ST COUCH" for D. N. Couch, "DA1STL BUTTERFIELD" for Danl. Butterfield, "GEO SYKE8"); or27-3:p0068.1 is signed by Couch', { skip: need }, () => {
  const { rows, row } = load();
  const bad = rows.filter((r) => r.signer && (/\d/.test(r.signer) || /\bIST\b/.test(r.signer))).map((r) => `${r.id} ${JSON.stringify(r.signer)}`);
  assert.deepEqual(bad, [], `${bad.length} garbled signers: ${bad.slice(0, 8).join(' | ')}`);
  assert.match(row.get('or27-3:p0068.1').signer, /^D\. N\. COUCH/i);
});
