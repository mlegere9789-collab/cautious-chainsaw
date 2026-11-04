# NY family: page-image check

Method: pages of the cached museum PDFs were drawn with `random.seed(n)` over the pages of a unit (seeds and units below), rendered at 110 dpi, and every parsed row on the page was compared with the printed page by eye (name, age, company, muster date, and the label the rules should give). This is not the independent sample of PLAN 4.4: the checker is the author, the sample is small, and rounds 1 and 2 drove fixes. Only round 3 was drawn after the last parser change that affected it, so only round 3 estimates the final error rate. Page index is 0-based in the cached PDF `tmp/library/rosters/NY/nysmm_<unit page>_UnitRoster_<id>.pdf` (file name and sha256 in `acquired.json`).

## Round 1 (parser as of the first full build; 5 pages, 36 rows)

| unit, pdf page (seed) | rows | label errors | name errors | other |
|---|---|---|---|---|
| U-104NY p82 (7) | 8 | 0 | 2 (Harvey F. read as Harveyp: F misread as P by the text layer; Dennis B. W. fused as Dennisb. W.) | 1 age missing; first entry of the page lost to a page-attribution drift |
| U-140NY p44 (21) | 9 | 0 | 3 (page-head words glued to a surname; Dailey read as Bailey; Asa N. fused as Asan) | |
| U-126NY p83 (11) | 4 of 6 entries | 1 hard error: Keith, Nelson B. was labelled Present-Documented because the next entry (Keligner, wounded at Gettysburg) was merged into his; 1 weaker than printed (Jones: "absent, sick in hospital, since April 1863" not read as absent) | 0 | 2 entries lost or merged (Judd; Keligner, header split at a hyphen) |
| U-97NY p6 (31) | 9 | 0 | 2 (Ira M. read as Iram; Avery read as Averyt) | 1 age missing |
| U-5NY-CAV p41 (32) | 6 | 1 weaker than printed (a discharge dated only "1862") | 3 (Buckman read as Buokman; Chauncy L. fused; H. P. printed with stray dots) | 1 company missing ("in:as private") |

Fixes made after round 1: entry splitting no longer requires a full stop before a header; the hyphen-broken header; page-head words stripped from surnames; rule 9 (absent since a date before the battle); a year-only separation dated 1861 or 1862; stray dots in initials; punctuation between "in" and "as private"; middle-initial dictionary rule.

## Round 2 (after those fixes; 4 pages, 27 rows)

| unit, pdf page (seed) | rows | label errors | name errors | other |
|---|---|---|---|---|
| U-44NY p126 (41) | 7 | 0 | 0 | 1 wrong basis code (Larkins: labelled SEP-BEFORE, should be ENL-AFTER; both are Absent-Documented) |
| U-ART-5NY p40 (42) | 6 | 0 | 0 | 1 entry dropped (Shaible: a stray mark before the given name) |
| U-157NY p10 (43) | 8 | 0 | 1 (Beattie printed "Beatt Ie" by the text layer) | |
| U-9NY-CAV p141 (45) | 6 | 0 | 1 (Chauncey read as Ohaunoey) | 1 age wrong (34 read as 31); 1 entry dropped (Grover: lower-case letters in the OCR surname) |

Fixes made after round 2: header tolerates a stray mark before the given name, two lower-case letters at the end of the surname, a digit inside the surname (KEL1GNER), "JR" after the given name; a separation dated earlier than the entry's muster-in is not used (Larkins).

## Round 3 (final parser; 3 fresh pages, 24 rows)

| unit, pdf page (seed) | rows | label errors | name errors | other |
|---|---|---|---|---|
| U-134NY p70 (51) | 8 | 0 | 0 (two correct names carry a `name-variant-suspect` flag: false alarms) | |
| U-73NY p68 (52) | 8 | 0 | 0 | |
| U-6NY-CAV p110 (53) | 8 | 0 | 1 (Chadius read as Ohadius) | |

Dropped entries re-checked after the final build: Judd, Keligner (as `KEL1GNER, HENRY`, Present-Documented, wounded 3 July 1863), Shaible and Grover (as `GROVEli, ORAN A`, surname as the text layer prints it) are present; Keith is Unknown.

## Re-check of the recovered entries (after round 3)

Shaible, Peter (U-ART-5NY p40), recovered by the header fix, was first labelled Absent-Documented `SEP-BEFORE` because "transferred to Fifth Battery, June 3, 1863" (a transfer INTO the 5th Battery, whose Register this is) was read as a transfer out: a hard error. Fixed by giving the parser the unit's own name (`ny_register.set_self_names`: `Fifth Battery`, `Ninth Cavalry`, ...) so a transfer to it counts as an entry; the clause also sets the entry date (up to the fifth clause of an entry). Re-built; Shaible and Sevitzer (attached to the 5th Battery in 1864 from the Tenth) are now Unknown `ONROLL-NO-STATUS`. Cavalry and battery Registers are exposed to this error type; infantry Registers say "this regiment". No other sampled page showed it.

## What the sample says (Measured on the pages above, not an estimate for the whole family)

* Rounds 2 and 3 together (51 rows, final-parser-relevant pages): label errors 0; hard errors (a label asserting the opposite) 0; name transcription errors 3 (5.9 percent, all OCR misreads of one or two letters, none corrected in the data); age errors 1; wrong basis code 1; entries dropped before the last fix 2 of 53 (3.8 percent).
* Round 1 found one hard error (a false Present-Documented caused by two merged entries); it was fixed and the page re-checked.
* Gate status against PLAN 4.3: R-G1 (names 99 percent) is NOT met (about 94 percent of sampled names exact); R-G3 (zero hard errors) was met in rounds 2 and 3 only; R-G9 (independent sample, about 628 rows per stratum) was NOT run. The name errors come from the text layer; they need a second OCR or a vision pass over the name column (G-NY4) before the roster can be published as complete. `name_as_printed` is the text layer, never corrected; `parse_flags` marks suspect names.
