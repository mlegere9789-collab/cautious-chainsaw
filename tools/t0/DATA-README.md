# DATA - the verified-data layer (optional patch group)

Fixes the **displayed data** of the animated map and its 25 sub-pages: the order of battle (commanders, fates, casualties, brigades, batteries), the chronology and the event
cards, the vignettes, the terrain and structure descriptions, the story markers and the guided tour, the position notes and the unit positions, the successions of command, the
casualty dashboard and the figures printed on the pages. Owner decision of 2026-10-05, item 3: every displayed time, place, number and name is **verified against a cited source,
labelled as an estimate or as Contested, or removed**; nothing is invented. The audit that backs this is `docs/data-audit/AUDIT.md`.

Status: built and tested on a scratch tree of R1c (`tmp/data-audit/data-R1c`, and stacked with CLOCK and MON in `tmp/data-audit/stack`); **not registered** in `trains.json` and not in
`release/`. The group lives in `tools/t0/patches-next/DATA.json` until the integrator signs it into the build.

## In plain words (Barney style)

1. **What was wrong.** The map's data was written fast and never checked line by line. The audit drew random samples of what the app shows and checked each statement against the
   Official Records (the Army's own reports of 1863-64): in the first sample, **53 percent** of the statements were wrong or had no source. Typical faults: a number that disagrees with the
   Army's own table, a regiment under the wrong brigade or with the wrong colonel, a colonel shown killed who was not, a unit standing on the field hours before it arrived, a story told
   as fact that only appears in memoirs written decades later, a "famous" or "dramatic" word that no report uses.
2. **What this group does.** About 2,470 small, exact edits. Each one says **what it finds** (and the build refuses to run if the text is not exactly there), **what it puts instead**, **which
   source** it rests on, and **what was wrong before**. A wrong number is replaced by the printed one. A story is kept but labelled "a later account, not in the Official Records". A
   disputed figure is kept and labelled **Contested**, with both numbers. What nothing supports is taken out.
3. **What it does not do.** It does not touch the clock (group CLOCK owns every displayed time), the monument stars (MON), the motion (ANIM) or the Virtual Walkthrough (not one byte of it
   changes; a test compares it with the control tree). It does not claim the data is now error-free: see "What is still uncertain".
4. **Positions.** Units now stand where the sources and the Park's own monuments put them, to within the accuracy the Help already promises ("positions are approximations"): units no longer
   appear before they arrived or after they left, the north end of the field and East Cavalry Field were moved onto the ground the monuments mark (they were drawn 1 to 3.4 km off), regiments
   no longer stay frozen where they fought while their brigade marches away, and contradictory duplicate rows are gone.

## Files

| path | what |
|---|---|
| `tools/t0/patches-next/DATA.json` | the optional bundle group (generated; do not edit by hand): 2,473 asserted patches: 2,364 on 69 served `data/*` files, 86 on the entry bundle, 23 on the pages and the Help chunk |
| `tools/t0/data/gen.mjs` | the generator; reads `tools/t0/data/fixes/*.mjs` and writes `DATA.json` and `docs/data-audit/fixes.json` (every patch with class, source, what was before) |
| `tools/t0/data/fixes/*.mjs` | the fix modules, one per area (see below) |
| `tools/t0/data/data_build.py` | the only way to build with DATA: `python tools/t0/data/data_build.py --train R1c --out tmp/data-audit/data-R1c [--with CLOCK,DATA,MON] [--no-gate]` |
| `tools/t0/data/sample.mjs`, `sample-report.mjs` | the seeded audit samples and the Wilson intervals (`docs/data-audit/sample-*.json`, `sample-report.md`) |
| `tools/t0/data/positions-report.mjs`, `position-screens.mjs`, `posutil.mjs`, `rejoin.mjs`, `rejoin-plan.json` | the position check (82 units x 33 anchor ticks) and the position fix helpers |
| `tools/t0/data/sources.mjs`, `ortable.mjs`, `cmdcheck.mjs`, `sources/*.json` | reading the Official Records text, the casualty tables as transcribed from the page images, the roster check of commanders, the OpenStreetMap monument nodes |
| `tests/t0/data.spec.mjs` | 18 tests in real Chrome (`T0-DATA-01..17`, `T0-DATA-X`), red-first |
| `docs/data-audit/` | `AUDIT.md`, `fixes.json`, the samples A-G with verdicts, `positions.json`, `position-screens.json` |

Fix modules (`tools/t0/data/fixes/`): `chron1*`, `chron2*`, `chron3*` (event cards), `vignettes`, `terrain*`, `markers`, `texts` (pages, popups, tour), `notes` (position notes; rules in
`notes-rules*.mjs`), `zkey`, `zkeytxt` (key actions; rules in `okey-rules.mjs`), `ids` (wrong or duplicate ids), `oobcas`, `oobccas`, `oobcart`, `oobtotals`, `oobmeta`, `casualty`
(casualty figures against the printed return), `oobbrig`, `oobdiv`, `oobcorps`, `oobcmd`, `oobarty`, `oobartorg`, `oobartorg2`, `oobmore`, `oobtext`, `oobfate` (the order of battle),
`succ`, `succ2` (successions), `prearrival`, `zpos`, `zcav`, `cavday3`, `terrain3`, `zrejoin` (positions).

## How the patches work

* kind `text`: `{ id, target, find, repl, expect: 1, cls, before, src }`. The build counts `find` in the current text of `target` and stops unless the count is `expect`. Another group changing
  the same bytes therefore fails the build loudly instead of being reverted silently. `regex: true` patches use Python `re.sub` semantics (`\g<1>`).
* kind `events` (chronology files, one JSON object per line): replace fields of the row of a tick, insert after, remove.
* kind `rows` (order of battle): `{ id, set: { field | 'a.b': value | null }, edit: { field: [[old, new]] }, cls, before, src }`; rows of one id from several modules are merged into one patch.
  `set` then another module's `edit` of the same field fails (the edit looks for text the set replaced): use `edit`, or remove the other rule.
* Patch order is the module file name, alphabetical; rows modules are emitted last and anchor on the baseline text of the row.
* `node tools/t0/data/gen.mjs` writes; `node tools/t0/data/gen.mjs --check` regenerates in memory, requires equality with the files on disk and replays every data-file patch on `baseline/dist`.

## Engine facts the position fixes rely on

* A unit stays at its last row (function `y1`, sticky state): a row for tick T must be in a file of the **day** that owns T (`placementsByTick = {...old, ...P}` merged by day), and within a day
  the load order is placements files, then density files (the last row of a tick wins). `density_day3_cavalry.json` is pretty-printed over several lines and loads after
  `density_day3_morning.json`.
* Tick to clock: `data-src/time/time_anchors.json` (33 anchors, the CLOCK model). Speeds (8 km/h limit for infantry steps) are computed on that clock.
* Ground truth for places: the Park's monument nodes as mapped in OpenStreetMap (ODbL, fetched 2026-10-19, `tools/t0/data/sources/osm-monuments.json`), the Walkthrough tour stops,
  Willoughby Run and the roads. Distances of 0.35 km or less to the unit's own monument count as on the monument.

## Regenerating

```
node tools/t0/data/gen.mjs                       # DATA.json + docs/data-audit/fixes.json
node tools/t0/data/gen.mjs --check               # must print OK
python tools/t0/data/data_build.py --train R1c --out tmp/data-audit/data-R1c
node tests/t0/data.spec.mjs                      # 18/18, real Chrome (own profile under tmp/, port base 9300)
node tests/t0/data.spec.mjs --dist release/R1c/dist --expect-red   # red-first: 16 of 16 feature tests fail without DATA, the two guards stay green
node tools/t0/data/positions-report.mjs tmp/data-audit/data-R1c/dist/data
node tools/t0/data/position-screens.mjs tmp/data-audit/data-R1c/dist/data
node tools/t0/data/sample-report.mjs             # needs the verdict files of the samples
```

Rejoin rows (regiments that would stay frozen while their brigade moved on): `tools/t0/data/rejoin.mjs` plans one row per regiment from the brigade's later rows (plan in
`rejoin-plan.json`, idempotent through the note "Shown with its brigade: no later position of this regiment is recorded"; steps faster than 8 km/h are dropped).

## Stack order and the gate

* Order with the other optional groups: any order builds; the usual stack is `--with CLOCK,DATA,MON`. DATA does not edit a time label (CLOCK owns them), a tick (except where text cannot be made
  true at the model tick), or a monument coordinate (MON patches `mA` `unit_id`/`lat`/`lng` only; DATA's `mA` patches touch the label text only).
* Gate row `data-untouched` (T0 rule 5: no served `data/*` file of the baseline may change) **fails on a DATA build by design**: 69 data files are patched, which is the owner decision of
  2026-10-05, item 3. The wrapper reports that row as expected and requires every other row to pass.

## Tests (`tests/t0/data.spec.mjs`)

01 build proof; 02 nobody before arrival; 03 pinned commanders and casualties of 14 regiments; 04 totals, successions, Biddle, 1st Minnesota ticks; 05 position notes free of leaked ids and of the
phrases the audit found; 06 pages (dashboard, index, find-ancestor, living ledger, turning points); 07 and 08 the app in Chrome (Find Unit, event cards); 10 to 15 positions (arrival,
departure, key units, no frozen regiments, brigade names in notes, the app's own data at tick 300 and tick 12, the north sector and East Cavalry Field on the Park's monuments); 16 the Confederate
artillery organisation; 17 commanders' fates and CS-005; 09 the Walkthrough is byte-identical (guard); X no first-party console error (guard).

## What is still uncertain (details in AUDIT.md sections 6 and 8)

* The error rate is not zero. Seven seeded samples of 150 claims each were drawn; the last two found 8 of 148 (sample F) and 2 of 150 (sample G) claims wrong before the fixes they triggered. Every
  sample found at least one class that the earlier sweeps had not reached, so the data is **not** claimed to be error-free.
* Strengths of regiments and batteries (the denominators of the percentages), the day split of the corps casualties, and the "Survived" fate of Confederate commanders are not verified one by
  one; the Confederate return counts missing men at brigade level only. These are labelled where the file itself shows them.
* Positions are approximate. Pickett's approach line (about 0.8 km north of the Virginia Monument), Alexander's cannonade line (1.7 to 2 km north of the guns' places in the reports), the
  Herbst and McPherson ground (0.8 to 0.9 km) and the Day-2 Little Round Top rows (about 0.4 km north-north-west of the monuments) were **not** moved.
