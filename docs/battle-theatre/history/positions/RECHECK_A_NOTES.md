# Full-passage fidelity re-check, scope A (Union I Corps, XI Corps, Cavalry Corps)

Brief: `docs/battle-theatre/GOVERNANCE/briefs/positions-recheck.md`. All 682 claims were re-checked (none skipped by a rule). Method: `tools/bt/recheck_ctx.py` printed each cited report whole (reports up to 14,000 characters) or as windows of 1,800 characters before and 2,200 after each quote; nine readers (one per group of draft batches) read every claim against that text, using the checks in `GOVERNANCE/briefs/positions-recheck-A-reader.md` (unit, date, clock time in the same or an explicitly continuing sentence, place and road as printed, activity and numbers, later order, OCR digits). Decisions: `draft_A/recheck/<TAG>.json` (one per claim, with evidence line); agent notes `draft_A/recheck/*_agent_notes.txt`. `tools/bt/positions_A_build.py` applies the decisions, re-verifies every quote against the OR text and rewrites `positions_A.jsonl`, so a rebuild reproduces the file. Frozen pre-recheck copies: `_orig_A/`.

Lead checks after the readers: full rebuild with no error line; `verify_positions.py A` OK on seeds 7, 20261020 and 99 (40-60 quotes each, all found under their cited report; new hard checks: valid fidelity_check on every claim, claim_support_verified only for passed_full_read/corrected, no documented claim downgraded, "OCR glyph only" times carry no t_iso, "time in a different sentence" claims carry no t_iso); `check_governance.py` ok; spot reads of the eight audit-named claims, 12 time/place claims and a script check of every `t_iso` against the distance between its number and the quote in the report (only OCR-spacing false alarms).

## Counts

| fidelity_check | claims |
|---|---|
| passed_full_read | 359 |
| corrected | 307 (including 6 split-off claims and 6 inferred claims) |
| downgraded | 1 (POS-A-CV2-051, documented -> inferred) |
| not_rechecked | 21 (the open gaps: no cited passage; the readers re-ran the recorded searches and the note says what they found; EXT-029 and EXT-038 had wrong wording and were corrected in the note) |
| total | 688 (682 + 6 split claims) |

Tiers after: documented 660, inferred 7, open gap 21 (before: 655 / 6 / 21). `claim_support_verified` true for 666 claims (passed_full_read + corrected), false for the 22 others. Before the re-check the flag was true for all 661 non-gap claims.

By batch (passed / corrected / other): 11A 29/24, 11B 32/30, 11C 15/18, 1C0 44/24, 1CA 20/15, 1D1 20/14, 1D2 17/17, 1D3 60/31, 1D4 29/22, 1D5 27/39, CV1 24/19, CV2 24/29/1 downgraded, EXT 12/13/21 gaps, FIL 3/5, HNT 2/2, RG2 1/5.

Field-level effect on the 682 original claims: `when.printed` changed 127; parenthesised (editorial) `when.printed` 200 -> 120 (80 removed or replaced by the printed phrase; the 120 left carry a `when.description` "compiler reading from order of events" or "printed in the continuing sentence"); `t_iso` 232 -> 223 (10 removed: 1D3-090, 1D5-009, 11A-018, CV1-030, CV1-038, CV1-039, CV2-008, CV2-047, EXT-006, RG2-002; one more changed in the split); `when.description` set on 282 claims; `place.printed` changed 143; `direction_or_road` 21; activity text 127; unit_id 15; date 3; kind 1; ocr_uncertain flags 70 -> 84.

## Patterns and rates (share of the 682; a claim can show several)

1. Time or day-part not in the claim's own sentence: about 105 claims (15%). Most are compiler-written parenthesised day-parts ("(afternoon, July 1)", "(late morning)") for regiment and battery reports that print no hour for the fact; 9 are explicit clock phrases from a different sentence ("time in a different sentence: ..."), 148 claims keep a day-part that the passage's sequence does support, now labelled "compiler reading" in `when.description`. Worst batches: 1D5 (about 16 of 66), 1D4 (about 17 of 84 with 1D2), 11B (13 of 62), EXT/1CA (19 of 81). Audit-named: 1D2-004 (10 a.m. is the whole brigade's), 11C-022 (10.30-noon window copied across four Eleventh Corps artillery claims 11C-016/-022/-028/-032; no report prints it), 11A-018 (3 a.m. is Meade's visit).
2. Place or road gloss (compass direction, modern road name, gazetteer reading, composite of two sentences): about 150 claims (22%): `place.printed` changed on 143. Audit-named 11A-028 ("north of the town"), 1D3-069 ("west of Gettysburg"), CV1-039 ("Emmitsburg Road", "First Corps"). Road field: normalised names ("Gettysburg-Hanover pike", "Emmitsburg road (from Fairfield via Emmitsburg)") replaced by the printed words in 21 claims.
3. Unit identity: 15 claims changed unit. Regiment commanders (Morrow, Robinson, Dawes, Mansfield) write "we" and the ledger had the brigade; 1C0-015 was Robinson's division, not Paul's brigade; CV1-039 names "one division", not a named division; 11A-033 is the Second Brigade, not the 75th Ohio; 1D3-028 "our brigade".
4. Activity overstated or hedge/condition/scope dropped: about 40 claims ("I believe" 1D5-020, "as I am told" 1D5-062, "supposed", a figure attached to the wrong unit, double-quick 1D5-008, 600 yards 1D5-048).
5. Merged second report or second entry: 4 claims were merged from a second report (CV2-023 Pleasonton's Heidlersburg clause, FIL-007 R355 vs R344; FIL-001, 1D5-016 (Dana's figure inside Wister's) and 11C-018 had a second-report clause removed or moved to the note); 1D3-067 mixed July 2 and July 3 strengths; 5 merged different sections of the same record (Gates R057 reports of July 2 and January 1864: 1D4-020, 1D4-025, -029, -034; 1D2-018); 3 diary entries of one report merged (CV2-017, -044, -045). Split into one claim per report/entry: six new claims (below).
6. Later order ignored: 11A-050, 11A-051, EXT-006, EXT-007 (the 1,000-step move back supersedes the half-mile-north position before the 6.30 p.m. attack), 1C0-026. Direction reversed: 1D2-022.
7. OCR-damaged digits read with confidence: about 30 claims touched (ocr_uncertain flags 70 -> 84). Hour glyphs "C a. m." (CV1-038/-039), "G a. m." (CV2-008), "13 m." (1D5-009, CV2-050 order hour), "about 12 m." (CV1-030: noon or 12 miles), distance fractions "1^" (1D4-009, 1D4-018, 1D5-031), "1.30 a. m." (11B-058, left unsettled), 2/3 date digits (Newton R030 first "July 3" heading, 1C0-033 to -040; 1D2-027 settled to July 2 on the report's own sequence, which removes a false conflict with 1D2-028 and was cleared on both claims). In every case t_iso is removed and `when.description` begins "OCR glyph only" or names the ambiguity; the position/activity fact stays documented.
8. Meridian not printed (a.m./p.m. read from sequence): 1D3-049, -054, -073, CV2-003 and others; kept documented with the reading stated in `when.description`.

## Claims split (new ids, one claim per report or entry)
POS-A-1D3-067-s2, POS-A-1D4-025-s2, POS-A-CV2-023-s2 (Pleasonton R336), POS-A-CV2-044-s2, POS-A-CV2-045-s2, POS-A-FIL-007-s2 (R355).

## Claims downgraded
POS-A-CV2-051 (Tidball's report is dated August 4 and prints no July 1-3 date; documented -> inferred). POS-A-1D4-014 stays inferred with its 2/3 date digit annotated. The other inferred claims (1D1-029, 1CA-027, 1CA-035, EXT-005, FIL-001) were re-read and kept inferred.

## Coverage verdict changes (rule: documented position-type claim on each of July 1, 2, 3 for the unit or its regiments, and a documented arrival/march/departure claim whose printed road string names a place)
- us-1c-2d (2nd Division Robinson): full -> partial. Its only road was "toward Gettysburg (road not named)", which is not a named road (1D3-001 road removed). Table row now says "Recheck: was full".
- No brigade lost its July 1-3 days; all other full ratings (Cutler, Biddle, Stone, Gamble, McIntosh and the divisions) rest on claims that were re-read and stayed documented; their road columns were recomputed from the repaired claims (tokens: "Cashtown road", "Emmitsburg pike", "the road running from Emmitsburg to Gettysburg", "Hagerstown road", "the pike leading toward Harrisburg" etc.). Two roads that are not names (CV: "the main road" 1C0-007, "the direct route" 11A-006) are listed but do not count for the verdict.
- Approach-road table (section 4) edited where claims changed: Wister's hour, the "C a. m." dispatch, Gates's distance, Merritt's "about 12 m.", Pleasonton's 10.40 meridian. Conflict groups (section 5) regenerated from the repaired claims: 33 groups, same count as before, each row now shows the fidelity_check and any `when.description`.
- Open: several conflict pairs were built on hours that are now `compiler reading` or null; the pair stays listed (both printed phrases remain visible) but the t_iso comparison is weaker. 11A-013 (the 12.30 hour is two sentences earlier, linked by "About this time") and 11B-033 (6-7 p.m. in the continuing sentences) are kept with that explanation.

## What the builders must stop doing
1. Never write a clock or day-part in parentheses into `when.printed` as if printed; put it in `when.description` as "compiler reading" and leave `t_iso` null unless the clock stands in the same or an explicitly continuing sentence.
2. Take place and time from the section of the record that carries the quote. Records that join several reports (Gates R057 July 2, July 4 and January 1864; Howard R243; Custer R361 diary; Biddle) must give one claim per section.
3. `place.printed` and `direction_or_road` carry only printed words; compass directions, modern road names ("Chambersburg Pike"), gazetteer readings and "from X" reference points belong in the gazetteer id and the note.
4. A "we" report is the regiment's (or, for a brigade commander, the brigade's): assign the unit from the report's own subject, not from the roster.
5. A superseding order in the same passage ("1,000 steps backward") ends the earlier position; do not attach a later time to the first position.
6. Do not read a damaged hour, fraction or 2/3 date digit as a number; mark ocr_uncertain, null t_iso, and say "OCR glyph only".
7. Keep hedges and conditions ("I believe", "supposed", "as I am told") in the claim.
8. Regiment-level notes: one claim must not carry a clause from a second report; cross-reference in `note`.
9. Earthwork note: Hunt (HNT-002) does not date the earthworks; do not use it as a construction-time anchor.

progress: scope A re-check DONE 2026-10-20 (688 claims: 359 passed_full_read, 307 corrected, 1 downgraded, 21 not_rechecked (open gaps); documented 660, inferred 7, open gap 21; verify_positions A OK on three seeds; summary regenerated by tools/bt/positions_A_summary.py; one verdict change, us-1c-2d full -> partial).
