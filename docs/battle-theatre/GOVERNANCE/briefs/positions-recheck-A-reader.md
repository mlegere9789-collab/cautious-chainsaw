# Reader instructions: full-passage fidelity re-check of OR position ledger SCOPE A (batch of claims)

Repo C:\Users\mlege\gettysburg-map (Windows, Git Bash/PowerShell, Python 3.11, set PYTHONIOENCODING=utf-8). Obey CLAUDE.md: never fabricate; each quote under 15 words and exact OCR text; no deploys; do not edit anything outside the files named below. Read docs/battle-theatre/GOVERNANCE/briefs/positions-recheck.md (the lead's brief) and docs/battle-theatre/history/positions/FIDELITY_AUDIT_SUMMARY.md (the pattern list) first.

## Why
An independent audit found only 22 of 30 sampled scope-A claims fully supported by their passage. The flag claim_support_verified was true for all of them and cannot be trusted. You re-read EVERY claim of your assigned tag(s) against the raw report text and record a decision for each.

## Tools
- Show passages: `python -I tools/bt/recheck_ctx.py A --tag <TAG> [--report OR27-1-R037]`  (claims grouped by report: compact claim records, then the normalised report text with `<<id quote>>` markers around each claim's quote/anchor; reports up to 14,000 chars are printed whole, longer ones as windows of 1,800 chars before and 2,200 after each quote). Work one report at a time (`--report`) to keep output small. If a window is not enough (a later order, the date, another sentence about the same unit) widen it: `--before 6000 --after 6000` or `--whole 60000`, or search the whole report: `python -I tools/bt/or27_find.py "regex" -C 300 --part 1`.
- Claim source files (read-only for you): docs/battle-theatre/history/positions/draft_A/b*.py (one `c(...)` call per claim; claim id = POS-A-<TAG>-<n> where n is the 1-based position in CLAIMS of the file whose TAG matches). Current ledger: docs/battle-theatre/history/positions/_orig_A/positions_A.before_recheck.jsonl (frozen copy; do not use positions_A.jsonl, the lead rebuilds it).
- Validate your decisions without touching the ledger: `python -I tools/bt/positions_A_build.py --out %TEMP%/chk_<TAG>.jsonl --tag <TAG>`  (prints only errors for your tag; "NO recheck decision" lines list claims you have not yet decided; a quote that does not verify drops the claim and prints an error. NEVER run it without --out; never write positions_A.jsonl).

## What to check for every claim (read the claim, then the passage around it, at least 1,200 chars each side, in the report named in source.report_id)
1. Unit identity: does the passage say this unit (or its commander's own report for it)? A unit the compiler resolved from "the brigade", "the regiment", "applies equally to..." is a gloss.
2. Date and clock time: the clock phrase must be in the SAME sentence as the fact, or in an explicitly continuing sentence ("then", "soon after", "at that time"). A time from a different sentence, an earlier or later paragraph, a different unit's movement, or another report is NOT a time for this fact. Check the `when.printed` phrase is really printed (in the passage), not a window the compiler built (parenthesised `(...)` phrases are editorial by ledger convention: check them).
3. Place and road: `place.printed` may only contain words the passage prints (no compass direction, road name, or modern name added). Compass directions and road names that are not printed are glosses: remove them from place.printed / direction_or_road (the gazetteer id may stay if note says it is by inference).
4. Activity and numbers: every clause of `activity` and every number must be in the cited report's passage. A clause from a second report, a compiler's purpose label, a dropped hedge ("supposed", "I think") or dropped condition makes the claim overstated.
5. Later or earlier contradiction: later in the passage the unit may be ordered to move, withdrawn, or the position superseded (e.g. "ordered half a mile north ... then 1,000 steps back"). The claim must not place the unit at the first position at the later time.
6. OCR-damaged digits: a time, date, distance or count whose digit is a letter/symbol/2-3 confusion must not be read with confidence. (Report headings print "1st, 3d, and 3d" style 2/3 confusions: if the report's own internal evidence cannot settle the digit, mark it.)
7. Day-part: a claim `when.printed` of "(afternoon)", "(late morning)" etc. is the compiler's reading of the order of events: acceptable only if the passage's sequence supports it; record it in `wd`.

## Decision per claim (write ALL, in file docs/battle-theatre/history/positions/draft_A/recheck/<TAG>.json = JSON list; if you take several tags use one file per tag; rewrite the whole file after every report/batch of ~15 claims so a cut-off loses nothing; resume from the file if it exists)
```
{"id": "POS-A-1D2-004",
 "fidelity": "passed_full_read" | "corrected" | "downgraded",
 "why": "<= 40 words: for passed_full_read a short evidence line (e.g. 'hour in same sentence; unit named'); for corrected/downgraded exactly what changed and why",
 "patch": { ...only the fields that change, using the SHORT keys below... },
 "add": [ {...full claim dict, only when splitting off a claim from a SECOND report...} ] }
```
Short keys (same as the `c(...)` call in draft files): u unit id, k kind (arrival_road|march|position|engagement|movement|night_position|departure|strength_note), act (claim text), q (verbatim quote, exact OCR text, < 15 words, must occur in the cited report), anchor (+ cr=true for a close-reading claim with no quote), w (when.printed: words printed in the passage, or null), t (t_iso "1863-07-01T10:30" or null), d (date), ap (approx bool), wd (when.description: free text; use 'time in a different sentence: "<phrase>" (<where>)' or 'OCR glyph only: ...' or 'compiler reading from order of events: ...' or 'printed in the continuing sentence: ...'), pp (place.printed), gz (gazetteer id or null), rd (road as printed or null), tier ('documented'|'inferred'), why (the reasoning for an inferred claim; NOT the same as the decision's "why" above, so for a patch to tier inferred put it in patch key "why" too), ocr (bool), note_add (text appended to the claim note), cf (conflict labels/ids; only touch if needed). Setting a key to null removes it. Do not change keys you do not need to.

Outcomes:
- passed_full_read: the full passage supports unit, date/time, place, activity, numbers; no later contradiction. Patch only to annotate (wd for a parenthesised phrase; note_add). No change of facts.
- corrected: narrow the claim to what the passage supports (change act/w/t/pp/rd/d/q); remove a t_iso that is from another sentence (set t null, w to the phrase from the SAME sentence or null, wd = 'time in a different sentence: "..."'); remove an invented compass direction/road from pp/rd; restore a dropped hedge; fix a later-order problem; OCR digit: t null, ocr true, wd 'OCR glyph only: ...'. The position/activity fact may stay documented if its own quote supports it. If you change the quote to a better one, give patch q (verify it).
- split: a claim whose activity merges text from a second report: narrow the original (patch) to its own report and put the other report's part in `add` (fields u,k,act,r,q,w,t,d,pp,gz,rd,ap,note,ocr; r is the report code such as "R336" or the full id "OR27-1-R336"; each added claim needs its OWN verbatim quote from ITS report; read that report's passage the same way). Decision fidelity corrected.
- downgraded: the passage does not support the central fact (unit/place/time/activity): patch {"tier":"inferred","why":"<reasoning and what the passage does say>"} (keep q if it still shows the nearest text). Never leave a documented claim that its passage does not support.
Doubt = do not pass. Do not widen a claim; do not add facts that are not printed. Do not use Wikipedia/memory to decide what the passage says: the passage is the only evidence here.

## Claims already named in the audit summary (handle them for sure if in your tags)
A-11A-028 (north of the town not printed), A-11A-051 and A-EXT-006 (1,000 steps backward supersedes the half-mile-north position before the 6.30 p.m. attack), A-11C-022 (10.30-noon window not printed), A-1D2-004 (10 a.m. belongs to the whole brigade), A-1D3-069 (west of Gettysburg not printed), A-CV1-039 (hour digit OCR-damaged, road name Emmitsburg Road and First Corps not printed), A-CV2-023 (Heidlersburg direction is Pleasonton's report, not Kilpatrick's).

## Finish
1. Every claim of your tag(s) has a decision (the validator shows no "NO recheck decision" and no other error for your tag). 2. Write docs/battle-theatre/history/positions/draft_A/recheck/<TAG>_agent_notes.txt: counts per fidelity value; per pattern (time from another sentence, merged second report, later order ignored, compass/road gloss, hedge/condition dropped, unit identity gloss, OCR digit, other) how many claims; ids of split and downgraded claims; anything systematic. 3. Final answer (under 200 words): counts, patterns, ids split/downgraded, validator output last line. Do not ask questions. Do not run the full-ledger build.

## Addendum
- Every quote/anchor in the whole ledger must be unique (the builder reports "quote reused" if two claims share one): choose a different verbatim phrase for a split claim.
- The validator output "wrote N claims" is expected; read only the error lines for your tag.
- Do not edit draft_A/b*.py, tools, or other tags' recheck files.
