# CLOCK - the corrected historical clock (optional patch group)

Owner decision of 2026-10-05, item 2 (`docs/decisions/OWNER-DECISIONS-2026-10-05.md`): the wrong clock is corrected. The clock of the app was nine independent formulas
(a base of 06:00 or 04:00, five minutes a tick, a date that ran two days ahead, hand-typed labels), 4.8 hours off the sources on average and 5 of 102 event labels within half an hour.
CLOCK routes **every place the app prints a time, a date or a time-derived string** through **one** module, built from the adjudicated anchors
(`data-src/time/time_anchors.json`: 33 anchors, each Documented, Estimated or Contested, with an uncertainty bound and evidence references, `docs/time/ANCHORS-FINAL.md`; **none is signed** by a
human historian or the owner). Ticks stay the permanent frame ids; only the clock derived from them changes.

Status: built and proven on scratch trees of R1c (`tmp/clock-integrate/`), stacked with MON and DATA, in real Chrome on the desktop and the phone shell. **Not registered** in `trains.json`,
not in `release/`. Nothing was deployed.

## Plain words

1. **What was wrong.** Ask the old map "what time is it?" and different corners answered differently, and none matched history. Tick 538 (Pickett's Charge steps off) said 11:15 AM on one
   screen and "July 5" on another; the sources say about 3 PM on July 3. The date badge ran two days ahead.
2. **What CLOCK does.** One small calculator (2.5 KB compressed) knows 33 times that history pins down (Reynolds killed about 10:15, the cannonade about 1 PM, the step-off about 3 PM ...) and draws
   straight lines between them. Every clock, date, tooltip and caption asks that calculator. Where the sources do not pin the minute, the screen says **"about"**, and a tooltip says how many
   minutes it could be out and whether the sources agree (Documented), only imply it (Estimated) or disagree (Contested).
3. **What it does not do.** It does not move an event to another frame, rewrite a story, or sign anything off. A sentence that says "at 1:07 PM" stays the sentence's claim; the inventories below list every one.
4. **Frames stay.** "Tick 538" is still frame 538: deep links, bookmarks, playback and the placement files are untouched. The number is no longer shown as text (`data-gt-frame` and a tooltip keep it).

## Build and prove (one command each)

```
node tools/t0/clock/build-clock.mjs              regenerate everything from the anchors and prove every anchor on the real R1c tree (about 25 s)
node tools/t0/clock/build-clock.mjs --check      exit 1 when patches-next/CLOCK.json or a derived time module is stale
node tools/t0/clock/build-clock.mjs --stack MON,DATA     also prove it on a tree that carries those groups
python tools/t0/clock/clock_build.py --train R1c --out tmp/clock-integrate/clock-R1c [--no-gate] [--also MON --also DATA]    the tree itself (trains.json untouched, CLOCK added in memory)
node tests/t0/clock.spec.mjs [--dist <dist>] [--filter 'T0-CLK-0[23]'] [--expect-red --dist release/R1c/dist]     the browser acceptance
node tools/t0/clock/prose-inventory.mjs --dist <dist> --out <md>      every clock typed inside a sentence, against the clock of its frame
node tools/t0/clock/defect-audit.mjs                                   the 27 content defects of the time plan against built trees
```

`build-clock.mjs` = `tools/time/build.mjs` (anchors -> modules, golden table, `uncertainty.json`, the inline module) + a build of R1c without CLOCK (only to keep the texts the patches must match) +
`tools/time/build-clock-patches.mjs` (writes `tools/t0/patches-next/CLOCK.json`, 113 patches, each asserted) + a build WITH the group, whose `anchors.json` must show every CLOCK patch ok.
The gate (`node tools/t0/gate.mjs`, run by `clock_build.py` without `--no-gate`) is green on all ten rows, `data-untouched` included: CLOCK writes no `data/*` file.

## Registering it (integrator)

Either copy `tools/t0/patches-next/CLOCK.json` to `tools/t0/patches/CLOCK.json` and add to `trains.json`: `"optional_groups": ["CLOCK"]` (built with `--with CLOCK`) or, to ship it in R1c, a `groups.CLOCK`
entry (`"first": "R1c"`) and `"CLOCK"` at the END of `group_order` (after `PERF`: it anchors on the finished text of A..PERF; three patches (`CLK-55`, `CLK-56`, `CLK-62`) cannot match the
pristine bundle at all). It was built before and after DATA and MON in both orders: identical entry bundle (release id `51d5fdf6` for CLOCK+DATA+MON either way), 0 anchor failures.
After registering, regenerate with `node tools/t0/clock/build-clock.mjs` whenever `time_anchors.json` changes; `tools/time/build-clock-patches.mjs` embeds the module, so `CLOCK.json` is a derived file.

## What is routed (all from the one module; `about` per the written policy)

| surface | how it reads now |
|---|---|
| HUD date badge | true date; "Night of July 1-2" between midnight and first light (was tab + 2: July 3-5) |
| toolbar clock (desktop), store clock, time bar big clock, slider text (`aria-valuetext`) | "July 3, about 3:00 PM" |
| time bar footer, phone transport row | the clock; tooltip "Frame 538 of 675 - give or take 60 minutes. Contested: first-hand accounts disagree." |
| phone header date, July tabs | date from the clock; tabs say where they land (tooltip) |
| scrubber markers | tooltip with the marker's clock; the "First shot" marker sits on frame 12 (it sat on 17) |
| hour buttons, Shift+Arrow (time bar, global, Help chunk) | 60 battle minutes (they were 12 frames: 12 minutes to 42 hours) |
| event cards and toasts, vignette jump, unit panel ("At ..." and Recent Positions), successions, minimap footer, monument tooltips, Follow Your Ancestor rows | the clock of the frame (Recent Positions listed bare frame numbers) |
| Story cards (16) | a typed clock at the end of a subtitle becomes the clock of the frame the card flies to; other subtitles stay |
| bookmarks | list shows the clock; the stored label "Tick n" of earlier releases shows as "Saved moment"; the default label is no longer "Tick n" |
| Help | the 1/2/3 keys show the clocks of the tabs, steps and hours say what they do |
| day and night tint of the main map | the hour comes from the clock (frame 326, the Tigers' assault at dusk, was tinted for 12:20 PM); set on the first paint (it was only set on the next change) |
| pages | Compare, Camera, Immersive, Living Ledger, Documentary, Education, Turning Points (uncertainty tooltip; the Night Assault reads "evening, about 7:00 to 8:30 PM" as the adjudication asks), Sandbox (three presets moved onto frames their descriptions fit: 252, 548, 30), Regiment, Search, Ask the Historian (chronology and vignette answers), Cinematic export, Ground Remembers, Watch Together |

Policy printed by the oracle and the module: a clock is prefixed "about" when its uncertainty is at least `approx_sigma_min` (20) minutes or an anchor that speaks for it is not signed. The smallest `sigma_min`
is 25 and nothing is signed, so **every tick prints "about"** today. When a historian signs anchors and an anchor's sigma is under 20, those ticks print without "about" with no code change.

## Tests (`tests/t0/clock.spec.mjs`, 18 ids)

The expected strings come from `tools/t0/clock/oracle.mjs`, which reads the anchors file and imports nothing from `src/lib/time`: a straight line between the anchors, 5-minute rounding, midnight roll-over, civil dawn
from the file's solar table, "about" from the file's own sigma and state. A clock string on the screen that the oracle does not list for that tick is a failure ("stray clock").
T0-CLK-01 oracle self-check; -02 desktop, **all 675 ticks** through the scrubber (HUD date, toolbar clock and tab, time bar, footer, slider text, minimap, tooltips); -03 phone, **all 675 ticks** through the step button;
-04 hour buttons and keys from 13 start ticks; -05 `?tick=` and `?t=` at every anchor and day boundary (35 desktop loads, 14 phone); -06 the July tabs; -07 event cards at all 134 chronology ticks above "low";
-08 unit panel and Follow Your Ancestor; -09 bookmarks (including the old "Tick 538" label); -10 Help; -11 the 16 Story cards; -12 thirteen sub-pages; -13 Ask the Historian (13 chronology events asked by their words);
-14 every page: no July 4-9 date label, no "Tick n" caption; -15 frames are permanent ids (same frame and same number of units on the field as the R1c tree for 16 frames, playback speed unchanged);
-16 `build-clock.mjs --check`; -17 the map tint at 79 ticks including every tick where it changes; -18 scrubber and tab tooltips.
Red-first: `node tests/t0/clock.spec.mjs --dist release/R1c/dist --expect-red` fails every clock test on R1c without the group.

## Evidence (commands run, 2026-10-19)

See the end of this file ("Results") for the numbers of the last run.

## Interplay with the other groups

* **DATA** (verified displayed data): CLOCK patches no data file. DATA's chronology/vignette re-ticks and rewrites are what close most of the 27 content defects (`DEFECTS-27.md`: 18 closed, 5 open, 4 need a person on the stacked tree; with CLOCK alone 7 closed, 11 open, 9 review: a clock cannot move an event). DATA's story-subtitle edits and CLOCK's `CLK-54` compose: a subtitle that DATA made qualitative ("July 1, early afternoon") is left alone, a typed clock is swapped for the clock of the frame.
* **MON** (Monuments): `gtmon.js` recognises the corrected clock (`clockIsLegacy()` is false) and then jumps to the marker's own frame. Two markers whose frame disagrees with their own text: `mon_iron_brig` (frame 20 = 8:55 AM, text "about 10:15 AM": anchor 28 is Documented at 10:15, so frame 28-29) and `mon_barlow` (frame 63 = 3:50 PM, text "2:30 PM"/"about 3 PM": anchor 57 is 15:00). Owner: MON/DATA.
* **ANIM**: no file of CLOCK touches the unit layer, `Zn`, canvas drawing or the playback loop; it changes the text of the transport buttons and the time bar only.
* **Virtual Walkthrough**: untouched; `tests/t0/walkthrough-guard.spec.mjs --dist <CLOCK tree>` 13 passed, 5 skipped (the skips are the guard's own intended ones), 0 failed.

## Existing suites that read the old strings (not changed here: not CLOCK's files)

`Tick n/675` is gone from the page by design (chapter 04 section 4.9). These suites parse it and need `document.querySelector('[data-gt-frame]').getAttribute('data-gt-frame')` (the desktop footer and the phone
transport row carry it) or the "Frame n of 675" tooltip instead; and `n units · tick m` is now `n units · about 3:00 PM`:
`tests/t0/deeplinks.spec.mjs` (readState, DL-10), `desktop-fixes.spec.mjs` (line 80), `journeys-desktop.spec.mjs` (83, 699), `mobile-fixes.spec.mjs` (92, 567), `mobile-matrix.spec.mjs` (105),
`monuments.spec.mjs` (158), `verify-monuments.spec.mjs` (131). `tests/time/patches.test.mjs` pins "57 patches" (now 113) and asserts every anchor against the pristine bundle (three patches follow groups A..PERF);
its `--after-t0` case already failed at HEAD for another reason; `tests/time/surfaces.test.mjs:48` fails for the same pristine-anchor reason. The generator asserts those three against the staged text itself.

## Prose that quotes a clock (listed, not rewritten)

`PROSE-INVENTORY.md` (R1c + CLOCK: 66 typed times found in the story cards, monument markers, tour stops, Soldier's Eye, onboarding, 12 data file groups and the pages) and
`PROSE-INVENTORY-STACKED.md` (with MON and DATA). A typed time inside a sentence is a claim of the text; CLOCK rewrites only strings that are a function of a frame. Findings, each against the adjudicated anchors:

* Story 14 "At 1:07 PM ... artillery opened": the minute appears in no primary text (it traces to one magazine article, ANCHORS-FINAL); anchor 518 is Documented at 13:00, window 12:40-13:30. Supported wording: "about 1 PM" (DATA already has it).
* Marker `mon_iron_brig` "10:00 AM" and `mon_barlow` "2:30 PM": see MON above. Supported wording: "about 10:15 AM" (anchor 28) and "about 3 PM" (anchor 57) - DATA already has both.
* Chronology 100 "Meade arrives in person at ~11pm": Meade reached the field about 1 AM on July 2; DATA has it.
* Chronology/vignette sentences that name a time of an EARLIER or LATER moment than the frame they hang on (Heth ordered to move at 5 a.m., Law's brigade rejoining about noon, "until about 10:30 a.m." for the end of Culp's Hill) are correct claims about other moments: the verdict "differs" in the inventory only says the sentence is not about its own frame.
* No frame attached (37 of 66 in R1c + CLOCK): the NPS tour stops ("around 1 p.m.", "4 p.m.", "6:30 p.m.", "7 p.m."), Soldier's Eye ("10:00 AM"), data-file metadata. Each needs a source cited or the time labelled as an estimate: data owners.

## The 27 content defects

`DEFECTS-27.md` (generated). Summary on the stacked tree: 18 closed, 5 open, 4 need a person; the open ones are named with the frame, the clock and the distance. Open (stacked): Stuart's arrival (frame 310 = 7:15 PM, the plan's source says
12:30 PM July 2), Colgrove's charge (frame 483 = 7:20 AM, the plan's source says 10:00-11:30 and one source 6:00), and the composites t50, t95, t270 (one card still tells several events). Quote items t525/t530 are re-worded with clocks
and need the historian. These are the data owner's: CLOCK cannot move an event.

## What is verified, what is not

Verified by running (not by reading): the 18 tests above against the CLOCK tree and against CLOCK+MON+DATA; red on R1c without the group; the gate (all rows green); anchors (113 of 113 applied, in both group orders);
the Walkthrough guard; byte-identical regeneration (`--check`); the oracle equals `src/lib/time` for 675 ticks x 6 styles (a separate check, `tmp/clock-integrate/oraclecheck.mjs`).
Not verified: any real device or other browser (Chrome headless only), a screen reader, the live Netlify deploy; the historical anchors themselves (the adjudicator's own limits stand: OCR not page images, several secondary works not read,
no anchor signed); that no ANIM change (a group not yet present) touches the same lines; the Mapbox-dependent behaviour with tiles beyond the ~250 requests a full run uses.
**No claim of zero errors is made.** Remaining uncertainty is the anchors': every displayed time carries "about" and a tooltip with its bound and status, and four anchors (t90, t248, t275, t538) are Contested.
