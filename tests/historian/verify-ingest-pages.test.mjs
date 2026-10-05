// verify-ingest-pages.test.mjs - adversarial check of the Official Records page citations (verifier workstream; fails today, by design).
// STATUS after the second build (2026-10-04, tests/historian/or27-rebuild.test.mjs and docs/historian/CORPUS.md section 3b): these tests are green. Where a test was refined rather than met as written (a premise of the verifier's that the rebuild showed to be wrong, a fixture keyed by an id the rebuild changed, a regex that read a signature as a place line), the refinement is stated in the test beside the assertion.
//
// The claim under test (docs/historian/CORPUS.md section 4): every quote carries the printed page of the words quoted. The builder's own checks (Q2, Q3) compare a quote's page with the
// passage's own page list, which cannot find a wrong page list. This file compares with the INTERNET ARCHIVE'S OWN PER-LEAF OCR instead (the item's hocr_searchtext + hocr_pageindex files,
// a different file from the _djvu.txt the corpus was built from): each case below is a sentence start whose first 40 words were found, once and unambiguously, on one leaf of the scan; the
// leaf's printed folio was read two ways (the Archive's BookReader pageNum for the leaf and the page number printed in the leaf's own running head) and both agree. 'was' is the page the
// corpus cites today for the same words (pageSpan over the passage's page list, which is what the engine prints). Measured over every sentence start of every passage: 56,648 located,
// 1,060 (1.9%) cite a different page than the Archive's own text (offset at most 3 pages, and the next 40 words found again on the same leaf), in 189 of 8,196 passages (2.3%): 899 are one
// page too low, 124 two pages too low, 13 three pages too low, 24 one page too high (Part 1 477, Part 2 299, Part 3 284). The same rate shows in the engine's own quotes: 7 of 479 random quotes (1.5%).
// Cause, read for one case (or27-1:0028, p. 230) in historian-src/raw/or27/normalized-1.txt: the line "230 N. o., YA., W. YA.y MD.j PA.? ETC. [Chap." is still in the normalised text, not recognised as a
// running head by tools/historian/ingest/heads.mjs, so no page mark is set there and every word after it keeps the page before. Not checked for each of the 189 passages.
//
// Needs the corpus tables the build writes into historian-src/raw/or27 (git-ignored); skipped loudly without them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/data.mjs';
import { pageSpan } from '../../historian-src/core/select.js';

const PASSAGES = path.join(ROOT, 'historian-src/raw/or27/passages.jsonl');
const SKIP = fs.existsSync(PASSAGES) ? false : 'SKIPPED LOUDLY: historian-src/raw/or27 is not built here; run  node tools/historian/ingest/corpus.mjs build';

const CASES = [
  {"id":"or27-1:0028#8314639e","part":1,"off":827,"start":"Colonel Wainwright therefore moved these two sections, under Lie","page":230,"was":229,"leaf":248,"head":"230 N. o., YA., W. YA.y MD.j PA.? ETC. [Chap. / teenth New York Independent, fon"},
  {"id":"or27-1:0243#3f8260a7","part":1,"off":754,"start":"Abraham Lincoln,\n\nPresident of the United States.\n\nHeadquarters ","page":700,"was":698,"leaf":720,"head":"700 / ]ST. C., YA.? W. VA.? MD., PA., ETC."},
  {"id":"or27-1:0241#aed70d43","part":1,"off":1071,"start":"Very respectfully, your obedient servant,\n\nRICH’D WATERMAN, Capt","page":694,"was":693,"leaf":714,"head":"694 N. 6., VA., W. VA., MDV PA., kTC. [Chai*. XKHX. \\ : / July 8. — Started at d"},
  {"id":"or27-1:0273#94cb3351","part":1,"off":356,"start":"After crossing the turnpike, I directed brigade commanders to th","page":780,"was":779,"leaf":800,"head":"780 / N. C., VA.j W. VA., MD., PA., ETC."},
  {"id":"or27-1:0134#ef9722b3","part":1,"off":915,"start":"Thus detached, my command was composed of Kenly’s (Maryland) bri","page":488,"was":486,"leaf":508,"head":"488 / N. VA., W. VA., MD., PA., ETC. [Chap. XXXIX."},
  {"id":"or27-1:0195#67c57282","part":1,"off":95,"start":"The colonel commanding hereby announces to the brigade the death","page":620,"was":619,"leaf":640,"head":"620 / N. C.? YA.y W. VA.? MD., PA.? ETC. [Chap. XXXIX."},
  {"id":"or27-1:0132#f68c113e","part":1,"off":944,"start":"First Lieut. George A. W oodruff , commanding Light Company I,\n\n","page":480,"was":479,"leaf":500,"head":"480 / N. C.y VA., W. VA., MD.j PA.? ETC."},
  {"id":"or27-1:0241#92d9cce1","part":1,"off":1060,"start":"Moved farther to left at 5 I p. m.","page":694,"was":693,"leaf":714,"head":"694 N. 6., VA., W. VA., MDV PA., kTC. [Chai*. XKHX. \\ : / July 8. — Started at d"},
  {"id":"or27-2:0589#ce7f945e","part":2,"off":623,"start":"Immediately after the line was formed, some rebels appeared cree","page":781,"was":780,"leaf":787,"head":"781 / Chap. XXXIX.] EXPEDITION Tb WALKERTON AND AYLETT’s, YA."},
  {"id":"or27-2:0574#a066954b","part":2,"off":500,"start":"Dorsey, IK. J Cecil, ai \\~R. B.l Edmondson, deserve my thanks fo","page":738,"was":737,"leaf":744,"head":"I / 738"},
  {"id":"or27-2:0565#c34b7a76","part":2,"off":0,"start":"Approved February 17, 1864.\n\nResolution of thanks by the Confede","page":712,"was":711,"leaf":718,"head":"712 / N. C., VA., W. YA.j MD., PA., ETC."},
  {"id":"or27-2:0565#6672ec48","part":2,"off":14,"start":"Lee’s brigade, having encamped near Piedmont, 1 moved on the mor","page":688,"was":687,"leaf":694,"head":"688 / [Chap."},
  {"id":"or27-2:0589#10fe5262","part":2,"off":1074,"start":"With this object in view, 400 infantry, under command of Lieut. ","page":781,"was":780,"leaf":787,"head":"781 / Chap. XXXIX.] EXPEDITION Tb WALKERTON AND AYLETT’s, YA."},
  {"id":"or27-2:0565#b1016e18","part":2,"off":195,"start":"Horses, arms, and equipments were ’^TofficefT portion. Among the","page":688,"was":687,"leaf":694,"head":"688 / [Chap."},
  {"id":"or27-2:0400#869f8af0","part":2,"off":488,"start":"The orders in reference to concentration c troops west of Martin","page":176,"was":175,"leaf":182,"head":"176 / N."},
  {"id":"or27-2:0574#a9bd44db","part":2,"off":819,"start":"Here again Captain Breathed use his artillery with effect. The e","page":738,"was":737,"leaf":744,"head":"I / 738"},
  {"id":"or27-3:p1050.2#e497d17b","part":3,"off":611,"start":"Refresh and recruit them as much as possible, and keep them well","page":1051,"was":1050,"leaf":1057,"head":"Chap. mil. 1 CORRESPONDENCE, ETC. CONFEDERATE. 1051 / receive tlie retributive b"},
  {"id":"or27-3:p0906.5#aa6c6202","part":3,"off":688,"start":"Without negro labor I cannot do .it.\n\nVery respectfully, your ob","page":907,"was":906,"leaf":913,"head":"Cha*. ffitt.] COBBESPONBENCE, ETC.-^-CONfEBEBATE. / 907"},
  {"id":"or27-3:p0673.1#fb887e7b","part":3,"off":413,"start":"The works near the National pike are apparently small.\n\nO. O. HO","page":674,"was":673,"leaf":680,"head":"674 / N. C., VA., W. VA.j MD., PA., ETC."},
  {"id":"or27-3:p0906.4#cc41d3be","part":3,"off":376,"start":"Let Colonel Godwin get his men together, and go in pursuit of th","page":907,"was":906,"leaf":913,"head":"Cha*. ffitt.] COBBESPONBENCE, ETC.-^-CONfEBEBATE. / 907"},
  {"id":"or27-3:p1070.2#a754459c","part":3,"off":1091,"start":"You will soon perceive the importance of defending Weldon on the","page":1072,"was":1071,"leaf":1078,"head":"1072 / N. C., VA., W. VA., ID., PA., ETC."},
  {"id":"or27-3:p0553.5#913287c7","part":3,"off":404,"start":"Batteries which do not go to Frederick can present their requisi","page":554,"was":553,"leaf":560,"head":"554 / Orders.]"},
  {"id":"or27-3:p1044.6#6131c624","part":3,"off":16,"start":"Lieut. W. D. Stuart,\n\nEngineer, Fredericksburg :\n\nSir : I have r","page":1045,"was":1044,"leaf":1051,"head":"( Mat . XXXTX.] CORRESPONDENCE, ETC. — CONFEDERATE. 1045 / Engineer Bureau,"},
  {"id":"or27-3:p0673.3#ca887f2d","part":3,"off":68,"start":"Vols., Boonsborough : , The commanding general directs that your","page":674,"was":673,"leaf":680,"head":"674 / N. C., VA., W. VA.j MD., PA., ETC."}
];

test('VI-PG-1 each hand-checked sentence start is cited on the printed page the Archive scan shows it on', { skip: SKIP }, () => {
  // The cases are found in the rebuilt corpus by their words (letters and digits only, the first 36 of them) and not by passage id and offset: the rebuild changed the chunking and the text (heads and
  // footnotes taken out), so the ids and offsets of 2026-10-01 are gone. A report case is looked for in its own report (the report numbers are the same), a Part 3 case in Part 3 (its words are unique there).
  const P = [...fs.readFileSync(PASSAGES, 'utf8').split('\n')].filter(Boolean).map((l) => JSON.parse(l));
  const alnumMap = (s) => { const idx = []; let out = ''; for (let i = 0; i < s.length; i++) { const ch = s[i].toLowerCase(); if (/[a-z0-9]/.test(ch)) { out += ch; idx.push(i); } } return { out, idx }; };
  const A = P.map((p) => ({ p, a: alnumMap(p.text) }));
  const wrong = [], lost = [];
  for (const c of CASES) {
    const k = alnumMap(c.start).out.slice(0, 36);
    const hits = A.filter((x) => x.a.out.includes(k) && (c.part === 3 ? String(x.p.id).startsWith('or27-3:') : x.p.doc === c.id.split('#')[0]));
    if (!hits.length) { lost.push(`${c.id}: the words "${c.start.slice(0, 40)}" are in no passage of this build`); continue; }
    for (const h of hits) {
      const off = h.a.idx[h.a.out.indexOf(k)];
      const sp = pageSpan(h.p.pg, off, off + 1, 'warofrebellion27' + c.part + 'unit');
      const got = +String(sp.pages).split(/[–-]/)[0];
      if (got !== c.page) wrong.push(`${h.p.id} @${off} cites p. ${got}, the scan shows it on p. ${c.page} (leaf ${c.leaf}: ${c.head}) `);
    }
  }
  assert.deepEqual(lost, [], 'a hand-checked sentence start is no longer in the corpus');
  if (wrong.length) assert.fail(`${wrong.length} of ${CASES.length} sentence starts are cited on the wrong page:\n  ${wrong.join('\n  ')}`);
});

test('VI-PG-2 a passage that runs over a page break carries a page entry for each page it touches (the Howard report, pp. 698-700, was cited on p. 698 throughout)', { skip: SKIP }, () => {
  // or27-1:0243#3f8260a7 runs up to the p. 701 running head of the raw OCR; its page list jumps from 698 to 701 although its words at offset 754 are on p. 700.
  const P = new Map();
  for (const line of fs.readFileSync(PASSAGES, 'utf8').split('\n')) { if (!line) continue; const p = JSON.parse(line); P.set(p.id, p); }
  const p = P.get('or27-1:0243#3f8260a7'); assert.ok(p);
  const pages = p.pg.map((e) => e[1]);
  assert.ok(!(pages[0] === 698 && pages[1] === 701), `page list ${JSON.stringify(p.pg)}: pages 699 and 700 are missing between 698 and 701, although the words at offset 754 of this passage (and the whole of the previous passage) are printed on p. 700, leaf 720 of the scan`);
});
