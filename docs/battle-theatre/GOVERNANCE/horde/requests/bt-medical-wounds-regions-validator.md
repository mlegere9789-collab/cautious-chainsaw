# Request from bt-medical (group wounds-regions) to the owner of `tools/bt/medical/validate_evidence.py`: four rules that cost rows or mislead, with the lines they come from

Written 2026-11-16 by workstream bt-medical, group wounds-regions. Not done by the group because the validator is outside its ownership list. Nothing is blocked: all 399 rows of `wounds-regions.jsonl` validate (0 failed) with the rules as they are; each item below says what the group did instead.

## What

1. **E013 says more than the code does.** The message reads "state only the source's numbers, or use value_basis computed and tier inferred". In the block headed "numbers: the claim and the value may state only numbers of the quote" (about lines 1160 to 1176) the claim check runs for every documented and every inferred row; only the `value` of a row with value_basis computed is exempt. The group's eight computed share rows (`med.wounds-regions.279` to `286`) therefore keep the computed number in `value` and out of `claim`.
   *Asked:* either exempt from the claim check the numbers that the row's own `value` states when value_basis is computed (which is what the message promises), or change the message to say that a computed number goes in `value` only.

2. **Spaced thousands are read only with a comma.** `parse_numbers(..., spaced=True)` (about lines 507 to 516) reads the OCR form `4, 865` as 4865 but not `4 865` or `12 089` (a space, no comma), which the second scans of the surgical volumes print. A row quoting such a line needs an `ocr.corrections` entry (basis other-copy or internal-consistency, which raises W008). The group has one such row (`med.wounds-regions.032`, `1 826` for 1,826); its other four W008 rows are OCR slips in an ordinal (`llth` for 11th) and a year (`1885` for 1865).
   *Asked:* decide whether a space-separated group of three digits after one to three digits should count as a thousands group in a quote; if not, say so in PLAN.md section 5 so that writers expect it.

3. **Two quote pieces across a page break fail on the running head's digits.** Pieces joined by " ... " that stand directly on either side of a running head that carries the page number (for example `CHAP. XII.] SHOT WOUNDS. 693`) were refused with "the digits of the quote [...] differ from the text [... '1', '693' ...]" (seen on `MSHWR-P3V2-1883-2NDISSUE`, pages 692 and 693, on 2026-11-16). The group split that quote into two rows. A gap of a footnote block between the pieces does not trigger it.
   *Asked:* compare the digits piece by piece, or state the limit in PLAN.md section 5.

4. **W002 is coarse for some sources.** 149 of the 399 rows raise "page differs from the running heads before the offset". For the second issue of Part III, Volume II the hint is off by about five pages on printed pages 687 to 693 (the OCR has no running heads on many pages), while the pages given in the rows are those of the printed running heads and of the page images (PDF page = printed page + 86, read from the local PDF). An audit of the 1870 and 1876 rows against their running heads found no wrong page after correction.
   *Asked:* make W002 informational for sources whose page hints are known to be coarse, or let a row carry a field that says the page was read from a page image.

## Why it matters

Items 1 and 3 made the group rewrite claims and split quotes; item 2 forces a correction entry on lines that read correctly to the eye; item 4 hides the few real page errors among warnings that are not. None of them changes what a row says.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
