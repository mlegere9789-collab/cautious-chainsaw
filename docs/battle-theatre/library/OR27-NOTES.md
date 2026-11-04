# OR Ser. I vol. 27: index and claim-check notes

Scope: Phase 1 source audit of the Official Records, Series I, vol. 27, parts 1-3 (raw OCR from archive.org items cu31924077699761 / cu31924077728255 / cu31924077700262; SHA-256 values match `GOVERNANCE/library/acquired.json`). No network use. Nothing here decides a default; the PDF's recommended defaults stay PENDING OWNER.

## Files

| File | What it is |
|---|---|
| `tools/bt/or27_lib.py` | paths, raw-text loader, normalized view builder (offset map back to the ORIGINAL file) |
| `tools/bt/or27_pages.py` | running-head finder and printed-page solver (DP over heads) |
| `tools/bt/or27_index.py` | segmenter + driver. `python -I tools/bt/or27_index.py` rebuilds `or27_index.json`; `--spot N SEED` prints N offsets for the by-eye page check; `--pagecheck` runs the printed-index check |
| `tools/bt/or27_records.py` | record builders for Parts 1-2 (contents-list aligned) and Part 3 (dateline segmented) |
| `tools/bt/or27_find.py` | search CLI: regex, context window, report and printed-page citation, `--verify` for exact quotes, `--self-test` (9 checks, all pass) |
| `tools/bt/or27_claims.py` | builds `OR27-CLAIM-CHECKS.md` and `or27_claim_checks.json`; every cited passage is located by code, every quote (< 15 words) is re-verified, a bad pattern aborts the build |
| `docs/battle-theatre/library/or27_index.json` | the index (2,830 records) |

All offsets are character offsets into the original file decoded as UTF-8 with `newline=''`. Matching (in `or27_find.py`) runs on a normalized view: whitespace collapsed, line-end hyphenation joined, running-head lines removed so that a phrase may cross a page break; each normalized character maps back to its original offset.

## Counts

| Part | Records | How delimited | Undelimited |
|---|---|---|---|
| 1 | 378 reports | contents list parsed (378 entries, numbered 1-378) and aligned to the body headings by title similarity (Needleman-Wunsch) | none; report No. 277 (Col. Joseph M. Sudsburg, 3d Maryland) is present but its page was scanned upside down (see OCR problems), so it is delimited (offsets 2,787,912-2,791,489, printed p.795, matching the printed index entry) but unreadable |
| 2 | 294 records = 211 contents-list reports (Nos. 379-589) + 83 reports of "other events" in 18 series with no contents list (Dix, Keyes, Mosby, etc.) | contents list, as Part 1; the 18 series by body headings 'No. N' restarting at 1 | none; 1 body heading ignored on purpose (a Richmond letter of Aug 10, 1864 printed after the reports) |
| 3 | 2,158 documents (2,122 correspondence, 36 orders) | NO contents list exists: heuristic segmentation on datelines (month-day-1863 lines with a header or paragraph break above) | unknown; sample check below |

Record fields: part, id (`OR27-1-R006`, `OR27-2-S17-01`, `OR27-3-D0464`), report number (printed OCR string kept beside the repaired number), kind, rank, author, unit scope, contents-list text, body title, date line (raw OCR) plus `date_ocr_suspect`, start and end offsets, start and end printed page with a confidence class, and an OCR grade (`good` / `fair` / `poor` from the rate of words occurring only once in the whole corpus and from non-ASCII junk). Author, rank and unit strings are RAW OCR and sometimes garbled ("Maj. G«n. Winfield S. Hancock", "EUis", "Bimey"); only the leading rank word is repaired.

Page-confidence classes for record starts: Part 1: head 309, head-corrected 17, head-inferred 9, interp 43; Part 2: head 234, head-corrected 16, head-inferred 8, interp 36; Part 3: head 1,925, head-corrected 95, head-inferred 44, interp 91, front-inferred 3 (the first documents, before the first recoverable head).

## Contents-list cross-check

- Part 1: 329 of 378 contents entries carry an OCR number equal to their position; the rest are OCR digit errors. Two defects of the contents parser were fixed during this pass: an entry whose "No." was OCR'd as "^o." (Gettysburg casualty return, No. 13) and continuation lines "Brigade, Horse Artillery." that had been counted as entries. After the fix the numbering is consecutive 1-378 and ends where Part 2 begins (379).
- Part 2: 166 of 211 contents entries carry an OCR number equal to their position.
- Three Part 1 records show a contents-list title different from the body title and take the body heading: No. 26 (a one-letter author difference, Edie E/R) and Nos. 269 / 270 (Bancroft and Merkle, printed in the opposite order in the contents list; the printed index agrees with the body order: Merkle p.757). Report 225 (Torbert) has a truncated body title; the contents text is used.

## Page recovery: method and accuracy

Method. Printed running heads (`NNN  N. C., VA., W. VA., MD., PA., ETC.  [Chap. XXXIX.` on even pages; `Chap. XXXIX.]  THE GETTYSBURG CAMPAIGN.  NNN` or `CORRESPONDENCE, ETC. - UNION/CONFEDERATE` on odd pages) are found by fuzzy match to the templates; the number is read with digit-confusion repair; a dynamic program over the sequence of heads (parity from head form, strictly increasing, gap penalty) assigns a page to every head, and a directed search recovers heads for pages the first pass missed. Heads recovered: 976 / 935 / 1,047 (Parts 1 / 2 / 3); of those 880 / 823 / 975 were read directly, 52 / 56 / 42 had the printed number corrected by the DP, 44 / 56 / 30 had no readable number. Gaps where the OCR lost the head of one or more pages remain: 65 / 58 / 35. An offset inside such a gap gets a LINEAR ESTIMATE (`interp`) and an explicit page range; the point value must not be cited as exact.

Accuracy, by eye (the brief's check). 40 offsets were inspected: 20 drawn at random from all records (seed 27 of the first, unstratified version of the sampler: 19 fell in Part 3 and 1 in Part 1) and 20 stratified Parts 1-3 in the ratio 2:2:1 (seed 270). For each, the claimed page was compared with the page number printed on the nearest preceding and following head lines in the raw OCR.
- Seed 27: 20 of 20 correct (all `head`; every number readable).
- Seed 270: 15 `head` correct (one numeral read through digit repair, "SlT'" for 517); 1 `head-corrected` correct (head OCR'd "030", true 630); 4 `interp` (printed numbers on the neighbouring heads 929/931, 170/172, 548/550, 794/796): in each the claimed page lies inside the bracketing interval and the true page cannot be read from the heads. So: 36 of 36 exact where a head precedes the offset, 4 of 4 inside the stated range, 0 errors seen. The interp share in the sample (4 of 20) is higher than the share of interp record starts in Part 1 (43 of 378, 11%).

Independent check (`--pagecheck`). The printed alphabetical INDEX at the back of Parts 1 and 2 lists, under "Gettysburg Campaign ... Reports of", the page on which each author's report begins. For every main-series record whose author surname and first initial occur in that list:
- Part 1: 279 tested; 266 start pages identical to the index (95.3%); 5 off by one page; 6 differ because the INDEX numeral is itself OCR-damaged (lost leading digit, e.g. 63 for 663, or one wrong digit); 2 unexplained (Meade, No. 6: the composite record begins on p.61 with correspondence, which is where its printed heading stands, while the index entry points to p.114, where his narrative report of operations begins, so this is a definition difference, not a page error; Norton, No. 327: the index numerals parse as 15/199, our 893 stands).
- Part 2: 165 tested; 156 identical (94.5%); 2 off by one; 5 index-numeral OCR; 2 unexplained (Furlong, No. 438: ours 381 vs index 377; J. M. Jones, No. 495: ours 531 vs index 642). The index lists multiple pages for some authors, so a miss does not prove an error in either source; the 4 unexplained cases and the 7 off-by-one cases are listed in `or27_index.json` under `page_recovery_checks`.
- The 7 off-by-one cases (e.g. Cutler, No. 37: ours 280 `head-inferred`, index 281) are consistent with a heading at a page boundary where the new page's head was lost; not verified individually.

Conclusion: start pages are reliable for `head` / `head-corrected` records (about 95% exact against the printed index, the residue mostly index-side OCR or one-page edge cases); `interp` and `head-inferred` pages carry a range and must be cited with it. `or27_find.py` prints `~N (lo-hi)` for those.

Part 3 segmentation (no ground truth). 14 randomly chosen Part 3 documents (seed 5) were read: 14 of 14 begin at a real dateline and end at the signature or the next dateline. Known limits: a document without a dateline is absorbed into its predecessor; a dateline inside an enclosure starts a new record; `addressee` and `signer` are heuristics. 408 of 2,158 Part 3 date lines are flagged `date_ocr_suspect` (day above 31, year not 1863/1864, or no month word).

## OCR problems met

- Digit confusion everywhere: 2<->3 (the dominant error: "No. 13" for 12, "June 37"), 6<->G/C/5, 1<->l/I, 0<->O, 5<->S/3, 8<->3/B. Every figure quoted in `OR27-CLAIM-CHECKS.md` that depends on a single misread-prone digit is flagged "OCR".
- Running-head fragments inside sentences (Peyton, p.385: "... having to some extent abated, the 25 R R - vol XXVII, PT II order to advance ...") and heads with lost numerals.
- An UPSIDE-DOWN scanned page: report No. 277 (Col. Joseph M. Sudsburg, 3d Maryland Infantry; the printed index gives p.795) appears as reversed gibberish ("'6j,nqspng -jji t[d9S0f -pQ JJo ^odayr" is the upside-down title). It is recorded with `ocr_inverted_page: true`; its text is unrecoverable without the second witness. `or27_find.py` self-test asserts that a search for "Sudsburg" never lands inside it.
- Tables (casualty returns, abstracts of returns, organization columns) are numerically unreadable; only a few total cells survive. Strength and casualty totals were therefore NOT extracted wholesale (see claim s).
- Rank / name ligature errors ("EUis", "Bimey", "ArtiUery", "Generad Robert E. Lee", "TJ. S." for "U. S."); `Generad` was added to the rank patterns during this pass.
- Dates: month words OCR'd ("Novernber 15, 1863"), day digits ("June 37" for 27).
- Fixed in tools this pass: contents-parser rules ("^o." entry start; "Brigade ..." continuation), body-heading detector (ignore "(No. N.)" enclosure labels in parentheses; accept 'N"o.'), inverted-page recovery, `front-inferred` page for text before the first head (Part 3 documents on printed p.3).

## What remains (not done)

1. HathiTrust (or other) second-witness diff of the three OCR texts: NOT done. Until then every digit-level figure is single-witness OCR.
2. Sub-document indexing inside the large composite reports: Meade (No. 6, pp.61-140) holds some hundred dispatches, minutes and 1864 letters; Lee (No. 426) holds several reports; Hooker (No. 5), Slocum (271) and others hold enclosures. The claim checks cite the composite record plus a `doc` note; the index does not split them.
3. Part 3 has no document-level contents list and no accuracy audit beyond the 14-document sample.
4. The claim checks use targeted pattern searches over all three parts; they are not an exhaustive reading. A NOT-FOUND-IN-OR verdict means "no passage found by those searches (OCR variants not exhaustively tested)". The ones most worth a second look with the other witness: Hood/McLaws morning positions (h1), Stuart's hour (j1), the East Cavalry Field hour (l1), Vincent/Law minutes (m4).
5. No governance file was edited (outside this task's allowed paths). The OR values below should be offered to the owner as selectable-scenario values in the conflict register: Howard "killed at 11.15" and the 11.30 news (C-040); Hunt "about 2 a.m." for Meade (C-001); Hancock "about 3 p.m." for the III Corps advance (C-010); Peyton 14:30 and Hays about 16:30 for the step-off (C-030); Longstreet "about 2 p.m." for the opening of the cannonade; Lee "afternoon of the 2d" for Pickett (C-021); noon for East Cavalry Field (C-032).

## PDF claims the OR contradicts or does not support (details with citations in OR27-CLAIM-CHECKS.md)

Contradicted or not supported as the PDF default:
- C-040 Reynolds' death, default 10:30: no OR passage gives 10:30; OR has 10.15 (Doubleday) and 11.15 / 11.30 (Howard).
- C-027 Buford, default Westminster: the OR has Taneytown for the night of Jul 2 (Buford, Devin) and Westminster for Jul 3; Merritt's Reserve Brigade went to Emmitsburg on Jul 2.
- C-032 East Cavalry Field, default 13:00: Pleasonton says "About noon"; nothing in the OR for 15:00.
- C-001 Meade, alternative about 04:00: no OR support; the OR has 01:00 (Meade's own report) and 02:00 (Hunt).
- C-021 Pickett, default "morning of Jul 3": supported by Lee's July 1863 report and Peyton (9 a.m.), but Lee's January 1864 report says the three brigades arrived "during the afternoon of the 2d"; "night of Jul 2" is not in the OR.
- C-029 / C-030: Hays and Smyth put the cannonade from 2 p.m. to 4.30-5 p.m. and the column's advance after it; Longstreet puts the signal at about 2 p.m. (Lee, Pendleton, Cabell, Hunt, Hancock, Gibbon, Webb say about 1 p.m.); Peyton has the order to advance at 2.30 p.m.
- C-010 Sickles' advance, default 14:00: only Hunt gives about 2 p.m.; Hancock about 3 p.m., Birney's guns about 3.30, Gibbon and Humphreys about 4 p.m.

Not in the OR at all (PDF statements that cannot be sourced to this volume): C-005 / C-006 / C-007 morning clock times for Hood, Longstreet and McLaws; C-012 Vincent's 10 or 15 minute lead over Law; Stuart's clock time on Jul 2 (date only) and where Jenkins was wounded (PDF itself marks a gap); the name "Bliss" for the burned buildings (the OR describes an unnamed barn and house; Ellis, Smyth and Hays agree on Jul 3, the 14th Connecticut and the order to burn); the Sherfy barn fire; any uniform description of the 140th / 146th NY; Spencer carbines (the word never occurs as a weapon) and the PDF's list of Buford's carbines (Sharps, Burnside, Gallager, Smith).

Confirmed (no conflict with the PDF's printed default): Hancock's arrival band 15:00-16:00 (C-039); XI Corps head about 12:30 (T1-120); Meade about 01:00 (C-001); Hunt's 04:30 and 05:30 openings (C-028) and his 14:30 ceasefire; Culp's Hill hours (Jul 2 evening attack a few minutes before 7 p.m., Jul 3 fight ending 10-10.30 a.m.); Letterman's 14,193 / 6,802 / 20,995 wounded, 650 medical officers, 106 left, Ambulance Corps 1 officer + 4 men killed and 17 wounded; the 114th Pennsylvania named "Collis Zouaves"; no 5th NY infantry in the Gettysburg order of battle.

## Reproduce

```
PYTHONIOENCODING=utf-8 python -I tools/bt/or27_index.py            # rebuild or27_index.json (about 10 s)
PYTHONIOENCODING=utf-8 python -I tools/bt/or27_index.py --spot 20 270
PYTHONIOENCODING=utf-8 python -I tools/bt/or27_index.py --pagecheck
PYTHONIOENCODING=utf-8 python -I tools/bt/or27_find.py --self-test
PYTHONIOENCODING=utf-8 python -I tools/bt/or27_find.py "Reynolds.{0,80}(killed|fell)" --part 1 -C 200
PYTHONIOENCODING=utf-8 python -I tools/bt/or27_find.py --verify "exact phrase"
PYTHONIOENCODING=utf-8 python -I tools/bt/or27_claims.py           # rebuild the claim checks
```

The normalized-text cache is written to `tmp/library/or27/cache/` (gitignored), keyed by the file hash.
