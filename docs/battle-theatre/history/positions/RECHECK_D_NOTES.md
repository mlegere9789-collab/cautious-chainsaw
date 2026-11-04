# Scope D (Confederate positions): full-passage fidelity re-check, notes

Brief: `docs/battle-theatre/GOVERNANCE/briefs/positions-recheck.md`. Audit that triggered it: `FIDELITY_AUDIT_SUMMARY.md` (scope D 17 of 30 faithful, 57%).

## What was done

Every one of the 405 claims of `positions_D.jsonl` was re-read by me (not by code) against at least 1,200 characters of the normalised raw OR text on each side of its anchor (`tools/bt/recheck_D_view.py`, windows merged per record, anchor marked; where a claim reached past the window, the rest of the report was read or searched with `tools/bt/recheck_D_grep.py`). Order of work (`tools/bt/recheck_D_order.txt`): the 62 claims that carried `when.printed_basis` (the brief says 60; the file had 62), then the claims whose activity cites another report, then all the rest. Nothing was skipped. For each claim I checked unit identity, date and clock time (time must come from the same sentence as the fact or an explicitly continuing sentence), place and road, activity, numbers, and whether a later or earlier statement of the passage contradicts the claim.

Repairs go through the build, so a rebuild reproduces the file: `python -I tools/bt/positions_build.py D` applies, after extraction, the per-claim decisions in `tools/bt/positions_D_recheck.json` (fields: `fc`, `act`, `wp`, `wdesc`, `date_basis`, `wextra`, `t`, `pl`, `pld`, `rd`, `ocr`, `tier`/`inf`, `q`/`q2`, `note`). The build re-verifies by code every printed phrase (it must lie inside one of the claim's own verified extracts), every extract (under 15 words, present under the cited report, `or27_find` verify) and every place phrase. New claims split out of merged ones live in `tools/bt/positions_D/95_recheck_splits.py` (they carry `fidelity_check` corrected and a "Split at the re-check from ..." note). `tools/bt/recheck_D_autoq2.py` added a short verified extract carrying the printed time phrase for 69 claims whose phrase was in the passage but outside their quote. `tools/bt/verify_positions.py D` also checks that every claim has a valid fidelity_check and that `claim_support_verified` is true only for passed_full_read and corrected.

## Result

| fidelity_check | claims |
|---|---|
| passed_full_read | 188 |
| corrected | 224 (216 of the original 405 + the 8 new split claims) |
| downgraded | 1 (PD-44nc-hanover-junction-01: documented to inferred) |
| not_rechecked | 0 |

Claims: 405 before, 413 after (8 new claims from 6 split claims). Tiers before: documented 389, inferred 13, open gap 3. After: documented 396, inferred 14, open gap 3. All 3 open gaps were re-checked by re-running their searches (PD-1c-res-art-01 was corrected: Pendleton R428 does not name Walton).

The 179 claims left as passed_full_read have unchanged activity, place and printed time; of the 405 originals, 216 needed a repair of at least one field. `claim_support_verified` is now true for the 412 passed/corrected claims and false for the downgraded one.

## Patterns found (approximate counts, from the repair notes; one claim can carry several)

1. **Time or date taken from another sentence** (audit pattern 1): of the 62 `printed_basis` claims, 35 now have `when.printed` null (the phrase moved to `when.description` as "time in a different sentence: ...", or the date is only a report-context reading, flagged in `when.date_basis`), 27 kept a phrase after it was found to sit in the fact's own sentence or the sentence it explicitly continues. Beyond them roughly 20 other claims carried a phrase from the wrong sentence (for example PD-anv-hq-03 took "7 a. m." from the letter Lee was answering; PD-2c-09 took "after 12 o'clock at night" from July 1; PD-1c-hood-benning-20ga-01 took the next sentence's "About 5 p. m."). 67 claims now carry `when.date_basis` (date by report context or sequence). 5 `t_iso` were removed where the hour belonged to another report or another event or was a damaged glyph (PD-2c-rodes-iverson-03, -doles-4ga-01, PD-3c-anderson-wilcox-03, PD-cav-div-01, PD-cav-hampton-03).
2. **One claim merging two reports** (audit pattern 2): about 40 claims named or used a clause from a second report. Clauses were removed (the other report has or needs its own claim) in most cases; six claims were split into one claim per report with its own verified quote: PD-1c-mclaws-semmes-03 (White + Gee), -semmes-04 (Kershaw + Motes), PD-cav-jenkins-02 (Lee + Rodes), PD-cav-robertson-01 (Lee + Stuart), PD-cav-flee-01 (Hampton + Stuart), PD-cav-chambliss-01 (Hampton + three clauses from Stuart). New claims: PD-1c-mclaws-semmes-06, -semmes-07, PD-cav-jenkins-03, PD-cav-robertson-02, PD-cav-flee-04, PD-cav-chambliss-03, -04, -05.
3. **A later order or event in the passage ignored or misplaced** (audit pattern 3): rarer in D than in A (about 4): PD-1c-hood-benning-15ga-01 (the four evening fights belong to July 3), PD-1c-mclaws-kershaw-3scbn-01 (Barksdale cleared the orchard with the fire of the 8th SC and James' battalion, not the reverse), PD-cav-horse-art-01 (artillery found gone from the crest after the enemy advanced), PD-cav-chambliss-02 (the brigade did not lead the column after Hanover).
4. **Glosses presented as printed text** (audit pattern 4): the most frequent defect (roughly 80 claims): road names the passage does not give ("Chambersburg Pike", "Chambersburg-Gettysburg turnpike", "Fairfield road", "Emmitsburg pike" where only "the road"/"the pike" is printed; 21 `direction_or_road` values are now bracketed "[compiler gloss, not printed]" or cleared), modern place names ("Culp's Hill", "Oak Ridge", "Wheatfield", "Peach Orchard" where the passage says "the hill", "the mountain"), "evening"/"morning"/"afternoon" added to a time, numbers the passage does not give (PD-2c-rodes-carter-01 "16 guns"), regiment numbers resolved by the compiler (the 26th Pennsylvania Militia in Gordon's report), a hedge or condition dropped (PD-corse-hanover-junction-01 and -02, PD-anv-hq-01 "reported to have crossed"), and place.printed strings that were truncated or wrong extractions ("to the assault", "from the l)rigade", "upon the enemy's position by some troops of the right wing", about 14 claims). The audit's PD-cav-hampton-04 (the Cashtown brigades) is in fact supported: an OR editors' footnote printed inside the passage (split from the sentence by a page break) reads "Reference is to Fitz. Lee's and Hampton's brigades, the latter commanded by Col. L. S. Baker"; the claim now cites that footnote as the source of the identification.
5. **OCR-damaged digits read with confidence** (audit pattern 5): about 45 claims read a damaged hour, date, distance fraction or figure as a clean number ("S o'clock" as 8, "13 o'clock" as 13:00, "-1" as 4, "G77" as 677, "2^ miles" as 2 1/2, "June 39" as 29, ...). 7 `ocr_uncertain` flags were added; the damaged reading is now written as an OCR glyph in `when.description` / the activity, and `t_iso` is not set where the glyph is the hour.
6. **Hour printed without a.m./p.m.** (audit note 6): 13 claims keep a `t_iso` whose meridian is the compiler's reading; they carry `when.meridian_inferred: true`.
7. Dates the source itself gets wrong: PD-2c-rodes-daniel-45nc-01 (the report prints "July 1, 3, and 3" and puts the seminary grove on "July 3" before a second "July 3"), PD-3c-anderson-wright-48ga-01 (Hall prints July 3 for Wright's July 2 advance). Both printed and read dates are carried in `when` (`printed_date`, `date_reading`, `date_basis`).

## Systematic things the builders must stop doing

1. Never take `when.printed` from "the nearest clock or date phrase in the report"; the build now refuses a `printed_basis` claim marked passed or corrected unless the phrase was decided (kept only if in the fact's sentence or an explicitly continuing one).
2. Never fill `place.direction_or_road` with a name that the cited passage does not print; write the printed words and put the name, if wanted, in a bracketed gloss. The summary's coverage verdict now counts a road only where it is printed.
3. Never put a clause from a second report in an activity (use one claim per report); a note "Lee also prints ..." is enough.
4. Never convert a damaged glyph into a digit in `t_iso`, or in the activity text without saying it is a reading.
5. Never add "morning/afternoon/evening" or a modern place name that is not in the passage.
6. Do not take a quote's first 14 words as the support for a time phrase located elsewhere in the sentence group; carry a second extract (`additional_quotes`) containing the phrase.
7. Name the source for an identification that is not in the author's own sentence (editorial footnotes, other reports) in the claim.

## Coverage verdict changes (`POSITIONS_D_SUMMARY.md`, re-generated)

Rule unchanged (documented printed road claim plus documented position claim plus enough own claims) but a road now counts only where printed. Six units fall from full to partial because the only "road" in their approach claim was the compiler's gloss: cs-anv-hq, cs-1c-hood-law, cs-1c-hood-benning, cs-3c-heth-davis, cs-1c-res-art-alexander, cs-1c-res-art-washington. Brigade-level units: full 19, partial 25 before; full 16, partial 28 after. Brigades, battalions, commands and headquarters together: full 27 / partial 37 before; full 21 / partial 43 after. The approach-road table (section 3), the OCR section (5) and the why column were corrected to the repaired claims; conflict groups (section 4) are generated from the repaired claims and still list every pair.

## Verifier

`python -I tools/bt/verify_positions.py D 60 11` prints `verify_positions D: OK` (413 claims, 399 quotes, 60 sampled quotes all found under their cited reports, every claim has fidelity_check, claim_support_verified agrees).

PROGRESS: 405 of 405 claims re-checked and repaired; 8 split claims added; summary regenerated; verifier OK.
