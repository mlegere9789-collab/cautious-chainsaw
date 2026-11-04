# Scope C: full-passage fidelity re-check of the OR position ledger (2026-10-20)

Ledger: `positions_C.jsonl`, now 538 records (537 before the re-check, plus one claim made by splitting). Brief: `GOVERNANCE/briefs/positions-recheck.md`. Audit that triggered it: `FIDELITY_AUDIT_SUMMARY.md` (scope C: 26/30 faithful, 87%).

## Rule used and what was skipped

Rule: **every claim was re-read**. The brief allowed C to be restricted (OCR-uncertain, two-report, time-digit, conflict claims plus the audit's named claims); that restriction was not used. 524 non-gap claims (523 before the split) were read against the cited report; skipped: 0. The 14 `open gap` records have no cited passage; they carry `fidelity_check = not_rechecked` with the reason in `fidelity_note` ("open gap: no cited passage to re-read").

Method (all in code, reproducible):
- `tools/bt/recheck_C_view.py <report>` prints every claim of a report (activity, when, place, quote, note) and the merged raw-text windows around the quotes (normalised text of `tmp/library/or27`, running heads removed, hyphenation joined, quotes marked). Main reading windows were 700 to 1,300 characters on each side (1,200 or more for Meade R006, Sykes R187, Barnes R189 and every Part 3 letter); records shorter than the window were read whole.
- `tools/bt/recheck_C_extra.py <report>` then printed, for every claim, the rest of the 1,200-character window on each side that the first view had not shown; all of it was read. So every claim has at least 1,200 characters read before and after the cited passage (or the whole record when shorter).
- Two automatic cross-checks after the reading: (a) every number in `activity`, `place.printed` and `when.printed` was searched in the cited record (misses were only numerals written as words in the OR, and the readings I had already flagged); (b) every capitalised name in `activity` and `place.printed` was searched in the cited record (this found the 15 further compiler glosses patched in `fid_98_gloss_patches.py`).
- Judged against the passage only, not against history. Digits are single-witness OCR: a clean-looking digit was accepted, a damaged or implausible one was not read with confidence.

## Repair mechanism (a rebuild reproduces the file)

`python -I tools/bt/positions_C_build.py` now also reads `tools/bt/pos_C/fid/fid_*.py`: `OK` (ids read and faithful), `FIX` (per-claim `check`, `note`, field `set`), `PATCH` (second-pass edits that turn a passed claim into `corrected`), `STRIP_TISO`, `EXTRA` (new claims, appended after all specs so existing ids stay stable). Output fields: `fidelity_check`, `fidelity_note` (what changed), `when.description` (new, for time caveats), `claim_support_verified` (true exactly for passed_full_read / corrected, as the shared verifier requires). Specs `specs_*.py` were not touched, so the original claim text is still there to diff against.

## Counts

| fidelity_check | claims |
|---|---|
| passed_full_read | 364 (69.5% of the 524 non-gap) |
| corrected | 156 (29.8%) |
| downgraded | 4 (0.8%) |
| not_rechecked (14 open gaps only) | 14 |
| total | 538 |

Tiers: documented 515 (361 + 154 passed/corrected; was 518), inferred 9 (was 5; the 4 downgraded), open gap 14 (unchanged). `claim_support_verified` true for 520.

The re-check rate of "not faithful as written" in C is 30%, against 13% (4 of 30) in the audit sample. The difference is stricter handling, not new facts: 22 road fields made verbatim, 15 compiler glosses removed, 33 editorial day-parts moved out of `when.printed`. Claims with a wrong fact, time or attribution: 11 (list below).

Field changes against the pre-check ledger (a claim can change several): `t_iso` 19, `date` 3, `when.printed` 50, `place.printed` 27, `place.direction_or_road` 22, `activity` 44, `ocr_uncertain` 11, `tier` 4; 15 more got only a `when.description` caveat (meridian or date inference). 81 claims carry a `when.description` now.

## Patterns found and their rates (of 524 non-gap claims)

1. **Time or date taken from another sentence, or invented day-part** (audit pattern 1, the most frequent): 50 claims had `when.printed` replaced because it was the compiler's ("late afternoon", "evening of July 2", "forenoon", "before dawn", "4.30" borrowed from another report): 33 are marked `editorial`, 8 `time in a different sentence`. About 9.5% of C. Worst cases: POS-C-0141 (5.30 p.m. from Hancock, Burbank prints 5 p.m.), POS-C-0159 (4-4.30 not printed), POS-C-0028 (4.30 from another report), POS-C-0306 (t_iso was the time of the letter, not of the order inside it), POS-C-0453 (5.30 from the previous sentence).
2. **Meridian not printed, supplied** (audit pattern 6): 9 claims now say so in `when.description` (4 o'clock, 3.30, 11.15, 12, 8.45, quarter to 6 ...). Kept with t_iso; they are inferences from the sequence and are marked.
3. **One claim merges text from a second report** (audit pattern 2): 16 claims (3%). Narrowed: POS-C-0016 (itinerary clause), 0028 (Tilton's Rose house, other report), 0103 (Sykes' Union Mills), 0141, 0308 (first report of McCartney), 0347 (separate July 4 note), 0358/0359/0360 (Tyler's losses, Hunt's), 0389 (Irish and consolidation, the audit finding), 0431, 0447, 0472, 0522, 0523. One split into its own claim: the July 4, 2 p.m. casualty/ammunition note of Tyler, now **POS-C-0538** (split from 0347).
4. **Glosses presented as printed text** (audit pattern 4): 22 road fields (the compiler's "Baltimore Pike", "Emmitsburg road", "Hanover road" ... now the printed words or null), 27 `place.printed` edits (identifications such as "Little Round Top", "Peach Orchard line", "Culp's Hill front", "(Ayres)", "(Eustis)", "(Weed)", "Provost-Marshal-General"), hedges dropped (POS-C-0048 "what I supposed to be the right"), conditions dropped (POS-C-0500), purpose added (POS-C-0450 "council"). About 10%.
5. **OCR-damaged digits read with confidence** (audit pattern 5): 19 claims lost their `t_iso` (`when.description` begins "OCR glyph only", `ocr_uncertain` true, the hour stays in `when.printed`): the damaged glyph is the day of the month ("Jidy 3", "the 3d", "8d instant", "Both") or the whole date line; 11 claims newly `ocr_uncertain`. Further: fractions read as 1 1/2 (POS-C-0127, 0157, 0260, 0328), "7.80" read as 7.30 (0419), "13.30" read as 12.30 (0481, 0482), 1.3( (0356, audit finding), a stray point in "2. .30" (0095, kept, marked approximate), the C&F officer count "i" (0385).
6. **A later order in the passage ignored** (audit pattern 3): not found in C (0 claims). The scope is dispatches and itineraries with few multi-order passages.

### Claims with a wrong fact (ledger error, not only wording)

- POS-C-0286 (Birney): dated July 2; the dispatch is headed "In the Field, July 4, 1863". Date corrected.
- POS-C-0264 (Neill): "At midnight" after the evening of July 2 is 1863-07-03T00:00, not 07-02T00:00 (24 hours early). Corrected; this took Neill's brigade from full to partial (no readable July 2 hour).
- POS-C-0306 (Butterfield to Sedgwick): t_iso was the letter's time; the fact is the order of 4.30 p.m. July 1.
- POS-C-0099 (83rd Pa): "[noon]" was the compiler's bracket; the page prints "13 m."; t_iso removed.
- POS-C-0253 (Howe): printed "July 3" re-dated to July 2 with an hour that four other brigade reports contradict; t_iso removed.
- POS-C-0511 and 0512 (1st Conn. Heavy B and M): the footnote text "At Westminster, etc., and not engaged" is printed on p.166 under Huey's cavalry brigade; the asterisk footnote of p.168 is not in the OCR. Downgraded to inferred (Pratt's own report, POS-C-0393, documents Westminster for Battery M).
- POS-C-0389 (Battery F): Irish and the consolidation are not in Thompson's report (audit finding). Narrowed to the report heading.
- POS-C-0347: the casualty and ammunition figures belong to a separate dated note (now POS-C-0538); "officers wounded 14" had been read as killed/wounded/missing.
- POS-C-0393: "4 1/2-inch guns" is not in Pratt's report. Removed.
- POS-C-0030/0055/0058: "relieved", "all day", "killed" went beyond the passage ("directed to relieve", detailed in the morning, "thrust through with a bayonet"). Narrowed.

### Claims downgraded (tier inferred, with reasoning)

POS-C-0511, 0512 (footnote not in the OCR of p.168), POS-C-0518, 0519 (the line diagram of Tilton's brigade is garbled, "220. Mass. IstM-ich. izeth. Penn."; regiment numbers and left-to-right order are the compiler's reading; the text itself names only the 118th as right battalion).

### Claims split

One: POS-C-0347 into 0347 and POS-C-0538. The other merged claims were narrowed because the second report's text is already its own claim (0017, 0036, 0393 ...) or is not a position fact.

## Audit findings for C, resolved

C-0048 (hedge) corrected; C-0072 (road field) corrected; C-0356 (OCR minute digit) corrected; C-0389 (second report) narrowed; C-0450 (council) corrected; C-0439 "12" = midnight kept as an inference, marked approximate, with the 11 p.m. report time of the same letter as the basis; C-0122, C-0105 and the other Hanover road fields made verbatim.

## Coverage verdicts (POSITIONS_C_SUMMARY.md, regenerated)

- us-6c-2d-neill: **full -> partial** (the arrival hour on July 2 is OCR-lost; the one clock phrase, "At midnight", belongs to the night of July 2-3).
- No other brigade rating rested on a claim whose clock time or date was removed (checked by code: brigades' July 2 position claims with t_iso, before against after). Brigade verdicts now: full 11, partial 12, n/a 1 (was 12 / 11 / 1).
- us-6c-2d (Howe) earliest/latest changed (t_iso removed), still partial. us-6c-3d-eustis latest is now 1863-07-04 (POS-C-0286). The approach-road table and the conflict groups are generated from the repaired claims; the road column now shows printed words only. The VI Corps road paragraph says that "Baltimore pike" for Wright's "broad and excellent pike" is the compiler's identification. Section 8 counts nine inferred claims; section 9 is new.

## What the builders must stop doing

1. Put identifications (Little Round Top, Peach Orchard, Culp's Hill, commanders' names, "Provost-Marshal-General") in `gazetteer_ref` or `note`, never in `place.printed`, `direction_or_road` or `activity`. `direction_or_road` is the printed road phrase or null.
2. `when.printed` is a phrase of the same sentence (or an explicitly continuing one). Day-parts the page does not print go to `when.description` as `editorial`.
3. `t_iso` is the time of the fact, not the time of the letter that reports it; "midnight" after an evening is the next calendar date; no `t_iso` when the day or hour glyph is damaged.
4. One claim, one report. A clause from another report (or another report in the same record) is a separate claim with its own quote.
5. A footnote text belongs to the line whose mark it carries; check the mark and the page before attaching it.
6. Write the OCR reading in the field ("'7.80' [OCR; read as 7.30]"), not the reading alone.
7. `claim_support_verified` must follow the full-passage check; it was true for every claim before and could not be trusted.

Not done: no second-witness OCR (HathiTrust) was available, so digits that look clean were accepted from the single OCR text; the check covers what the passage supports, not whether the OR itself is right.

progress: scope C complete 2026-10-20: 524/524 non-gap claims re-read (0 skipped), 364 passed_full_read, 156 corrected, 4 downgraded, 14 open gaps not_rechecked; verify_positions C OK (seeds 1-3, 5, 7, 11, 20261020).
