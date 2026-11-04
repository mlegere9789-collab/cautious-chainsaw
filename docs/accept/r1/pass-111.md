# Acceptance pass 111: DEFECTS (incomplete)

Started 2026-10-20T12:41:00.580Z, finished 2026-10-20T12:45:25.664Z.

| | |
|---|---|
| Candidate | `tmp\r1\r1-57caf9a3.zip` (zip) |
| Candidate SHA-256 | `88dd97d55d760eb1c466d3d978282ab7715a9b95f30360b471b6ba612d50a520` |
| Tree digest (sha256 of path+hash list) | `be55cd86d23a8a39207e4ec27990c6466e4e13f670e1990c059692f6710432f3` |
| Files | 2013 |
| Baseline (published build) | `baseline\dist` |
| Harness digest | `21167cbfe020b09c776cca57b2bf7eeb52c95b28c892c833224294f670dab259` (31 files) |
| Node / Python | v24.19.0 / Python 3.11.9 |
| Chrome | Chrome/155.0.8059.82 |
| Playwright-core / axe-core | 1.63.0 / 4.13.0 |
| OS / CPU | Windows_NT 10.0.26200 x64; 16 x Intel(R) Core(TM) Ultra 7 265H; 34 GB |
| Repo HEAD | 17ba8ee789133164815e11c4f2e740de86524862 |
| Mapbox tile requests | 394 of cap 20000 (cap-blocked 0) |
| Soak | 60 s |

A pass is CLEAN only if all eight checks RAN and found zero defects. A check that did not run is never a pass.

## Summary

| # | Check | Status | Defects | Notes | Time |
|---|---|---|---|---|---|
| 3 | Regression against the published build | RAN, DEFECTS | 35 | 181 | 262 s |

## Check 3: Regression against the published build

Status: **RAN**. Defects: 35. Notes: 181.

Metrics:

```json
{
 "waiversLoaded": 43,
 "files": {
  "baseline": 118,
  "candidate": 2006,
  "identical": 4,
  "changed": 107,
  "missing": 7,
  "added": 1895
 },
 "data": {
  "changed": 70,
  "regressed": 34
 },
 "routeStatusChecked": 50,
 "routesCompared": 24,
 "chrome": "Chrome/155.0.8059.82"
}
```

Defects by code: text-missing x29, control-missing x6

| code | where | detail |
|---|---|---|
| text-missing | aftermath@1440 | 1 visible text line(s) of the published build are not in the candidate: "Unlike the main animated map, this timeline is general narrative history, not bu" |
| text-missing | aftermath@390 | 1 visible text line(s) of the published build are not in the candidate: "Unlike the main animated map, this timeline is general narrative history, not bu" |
| text-missing | documentary@1440 | 2 visible text line(s) of the published build are not in the candidate: "DAY 1 · TICK 12 · KNOXLYN RIDGE, WEST OF GETTYSBURG", "The morning of July 1 was warm and hazy when Corporal Alphonso Hodges spotted mo" |
| text-missing | documentary@390 | 2 visible text line(s) of the published build are not in the candidate: "DAY 1 · TICK 12 · KNOXLYN RIDGE, WEST OF GETTYSBURG", "The morning of July 1 was warm and hazy when Corporal Alphonso Hodges spotted mo" |
| text-missing | education@1440 | 6 visible text line(s) of the published build are not in the candidate: "At approximately 7:30am on July 1, 1863, Lieutenant Marcellus Jones of the 8th I", "Major General John Reynolds, the finest corps commander in the Army of the Potom", "Within minutes of Reynolds's death, the Iron Brigade's char |
| text-missing | education@390 | 6 visible text line(s) of the published build are not in the candidate: "At approximately 7:30am on July 1, 1863, Lieutenant Marcellus Jones of the 8th I", "Major General John Reynolds, the finest corps commander in the Army of the Potom", "Within minutes of Reynolds's death, the Iron Brigade's char |
| text-missing | embed@1440 | 1 visible text line(s) of the published build are not in the candidate: "When Gordon's Confederate brigade swept over Barlow's Knoll, General Francis Bar" |
| text-missing | embed@390 | 1 visible text line(s) of the published build are not in the candidate: "When Gordon's Confederate brigade swept over Barlow's Knoll, General Francis Bar" |
| text-missing | find-ancestor@1440 | 1 visible text line(s) of the published build are not in the candidate: "Search by state, or by a commander's surname, to narrow down which of the 467 Un" |
| text-missing | find-ancestor@390 | 1 visible text line(s) of the published build are not in the candidate: "Search by state, or by a commander's surname, to narrow down which of the 467 Un" |
| text-missing | living-ledger@1440 | 2 visible text line(s) of the published build are not in the candidate: "JULY 1, 5:00 AM", "TOTAL CASUALTIES, BOTH ARMIES" |
| text-missing | living-ledger@390 | 2 visible text line(s) of the published build are not in the candidate: "JULY 1, 5:00 AM", "TOTAL CASUALTIES, BOTH ARMIES" |
| text-missing | regiment@1440 | 1 visible text line(s) of the published build are not in the candidate: "Pick any regiment or battery and follow its whole three-day battle as one story " |
| text-missing | regiment@390 | 1 visible text line(s) of the published build are not in the candidate: "Pick any regiment or battery and follow its whole three-day battle as one story " |
| text-missing | report@1440 | 1 visible text line(s) of the published build are not in the candidate: "Battle Reports" |
| text-missing | report@390 | 1 visible text line(s) of the published build are not in the candidate: "Battle Reports" |
| text-missing | search@1440 | 19 visible text line(s) of the published build are not in the candidate: "Vignettes", "Michigan · Colonel Henry Morrow · 73% casualties", "New York · Colonel Edward Fowler · 42.5% casualties", "New York · Colonel George Biddle · 41.1% casualties", "New York · Lieutenant Colonel Francis Miller · 55.5 |
| control-missing | search@1440 | 3 control(s) of the published build have no counterpart in the candidate: "input\|\|Search regiments, vignettes, locations… (e.g. '20th Maine', 'Wheatfield', 'Cushi", "button\|\|Vignettes", "a\|\|REGIMENT · UNION 107th New York Volunteer Infantry New York · Colonel Nixon Van " |
| text-missing | search@390 | 19 visible text line(s) of the published build are not in the candidate: "Vignettes", "Michigan · Colonel Henry Morrow · 73% casualties", "New York · Colonel Edward Fowler · 42.5% casualties", "New York · Colonel George Biddle · 41.1% casualties", "New York · Lieutenant Colonel Francis Miller · 55.5 |
| control-missing | search@390 | 3 control(s) of the published build have no counterpart in the candidate: "input\|\|Search regiments, vignettes, locations… (e.g. '20th Maine', 'Wheatfield', 'Cushi", "button\|\|Vignettes", "a\|\|REGIMENT · UNION 107th New York Volunteer Infantry New York · Colonel Nixon Van " |
| text-missing | terms@1440 | 2 visible text line(s) of the published build are not in the candidate: "Unit positions, casualty figures, and troop strengths are compiled from publishe", "The site's design, the animation engine, and the written vignette scripts are th" |
| text-missing | terms@390 | 2 visible text line(s) of the published build are not in the candidate: "Unit positions, casualty figures, and troop strengths are compiled from publishe", "The site's design, the animation engine, and the written vignette scripts are th" |
| text-missing | turning-points@1440 | 11 visible text line(s) of the published build are not in the candidate: "DAY 1 · MORNING · MCPHERSON'S RIDGE", "Brigadier General John Buford chose to dismount his two cavalry brigades and fig", "Historians broadly agree this was the single most consequential tactical choice ", "DAY 1 · LATE AFTERN |
| control-missing | turning-points@1440 | 9 control(s) of the published build have no counterpart in the candidate: "summary\|\|1 DAY 1 · MORNING · MCPHERSON'S RIDGE Buford's Decision to Stand ▾", "summary\|\|2 DAY 1 · LATE AFTERNOON · CEMETERY HILL Ewell's Discretion on Cemetery Hill ▾", "summary\|\|3 DAY 2 · AFTERNOON · SEMINARY RIDGE / E |
| text-missing | turning-points@390 | 11 visible text line(s) of the published build are not in the candidate: "DAY 1 · MORNING · MCPHERSON'S RIDGE", "Brigadier General John Buford chose to dismount his two cavalry brigades and fig", "Historians broadly agree this was the single most consequential tactical choice ", "DAY 1 · LATE AFTERN |
| control-missing | turning-points@390 | 9 control(s) of the published build have no counterpart in the candidate: "summary\|\|1 DAY 1 · MORNING · MCPHERSON'S RIDGE Buford's Decision to Stand ▾", "summary\|\|2 DAY 1 · LATE AFTERNOON · CEMETERY HILL Ewell's Discretion on Cemetery Hill ▾", "summary\|\|3 DAY 2 · AFTERNOON · SEMINARY RIDGE / E |
| text-missing | camera@1440 | 2 visible text line(s) of the published build are not in the candidate: "Director Mode auto-flies to wherever the most units are engaged, each tick. Foll", "Tick 1 / 675" |
| text-missing | cinematic-export@1440 | 3 visible text line(s) of the published build are not in the candidate: "Cinematic Export", "START TICK", "END TICK" |
| text-missing | compare@1440 | 5 visible text line(s) of the published build are not in the candidate: "Set each map to a different tick and compare unit positions side by side — e.g. ", "Tick 60", "9:55am", "Tick 300", "11:10am" |
| text-missing | ground-remembers@1440 | 4 visible text line(s) of the published build are not in the candidate: "Every recorded unit position across all 675 five-minute snapshots, accumulated i", "Built from the same 694 recorded unit positions that drive the main map's playba", "Reveal through tick", "675" |
| text-missing | immersive@1440 | 2 visible text line(s) of the published build are not in the candidate: "All audio here is synthesized in real time with the Web Audio API (no recorded s", "Tick 1 / 675" |
| text-missing | sandbox@1440 | 3 visible text line(s) of the published build are not in the candidate: "Day 2, mid-afternoon (tick 260) -- before Longstreet's assault", "Day 3, ~3:00pm (tick 553) -- moments before Pickett's Charge reaches the wall", "Day 1, mid-morning (tick 62) -- I Corps holding McPherson's Ridge" |
| control-missing | sandbox@1440 | 1 control(s) of the published build have no counterpart in the candidate: "select\|\|Day 2, mid-afternoon (tick 260) -- before Longstreet's assault Day 3, ~3:00pm (t" |
| text-missing | watch-together@1440 | 1 visible text line(s) of the published build are not in the candidate: "✓ Live Sync below connects two browsers directly to each other (peer-to-peer, ov" |
| control-missing | watch-together@1440 | 1 control(s) of the published build have no counterpart in the candidate: "input\|\|Tick (1-675)" |

<details><summary>Notes (information, not defects)</summary>

- waived:file-missing @ assets/InterpolationWorker-ufiwa2-e.js: assets/InterpolationWorker-ufiwa2-e.js is on the published build and not in the candidate -- WAIVED: Orphan build artefact deleted on purpose by the R0 mechanism: the 672-byte script (a main-thread-free lerp of lat/lng/bearing/strength between two ticks) is named by no file of the published build (n
- waived:file-missing @ diagnostics.html: diagnostics.html is on the published build and not in the candidate -- WAIVED: Developer page removed on purpose (see the route waiver above). (design of the R1a+ trains (verify_release V3), 2026-09-30)
- waived:file-missing @ icons/icon-192.png: icons/icon-192.png is on the published build and not in the candidate -- WAIVED: the generic star icon, replaced by the real-photograph icon set (IMG, tools/t0/images/IMG-overlay.json remove_from_overlay + manifest rows; owner decision 2026-10-19 item 2: the site uses only actual images of Gettysbur
- waived:file-missing @ icons/icon-512.png: icons/icon-512.png is on the published build and not in the candidate -- WAIVED: same: generic star icon replaced (IMG) (applied 2026-10-20 by the Release 1 integration: every assertion of this waiver passed on candidate 766259b8 (docs/accept/r1/assert-766259b8*.json); basis as stated per entry; own
- waived:file-missing @ screenshots/day1.png: screenshots/day1.png is on the published build and not in the candidate -- WAIVED: a corrupt "screenshot" that production named in og:image and the PWA manifest; replaced by og/gettysburg-card.jpg (IMG, owner decision 2026-10-19 item 2) (applied 2026-10-20 by the Release 1 integration: every asserti
- waived:file-missing @ screenshots/day3.png: screenshots/day3.png is on the published build and not in the candidate -- WAIVED: same as screenshots/day1.png (IMG) (applied 2026-10-20 by the Release 1 integration: every assertion of this waiver passed on candidate 766259b8 (docs/accept/r1/assert-766259b8*.json); basis as stated per entry; owner
- waived:file-missing @ unit-rendering-reference.html: unit-rendering-reference.html is on the published build and not in the candidate -- WAIVED: Developer page removed on purpose (see the route waiver above). (design of the R1a+ trains (verify_release V3), 2026-09-30)
- files-added @ -: data/moments.json, google0dca4879c9657741.html, icons/gettysburg-192.png, icons/gettysburg-512.png, icons/gettysburg-maskable-192.png, icons/gettysburg-maskable-512.png, img/gettysburg-from-the-west-1863.jpg, img/round-top-breastworks-july-1863.jpg, img/trostle-farm-july-1863.jpg, og/gettysburg-card
- waived:data-regressed @ data/casualty_apportionment.json: 1 regression(s): /notable_intensity_notes/highest_single_regiment_rate: key removed -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edits no /data file). Check 3 flags a data file when a key disappears or an array shrinks. The DATA group does both on purpose (about 33 files: unsupported
- waived:data-regressed @ data/chronology_day1.json: 20 regression(s): /events[4]/flag: key removed; /events[5]/flag: key removed; /events[6]/flag: key removed; /events[11]/flag: key removed; /events[12]/flag: key removed -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edits no /data file). Check 3 flags a data file when a key disappears 
- waived:data-regressed @ data/chronology_day2.json: 27 regression(s): /events: array shrank 49 -> 46; /events[3]/flag: key removed; /events[5]/flag: key removed; /events[7]/flag: key removed; /events[8]/flag: key removed -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edits no /data file). Check 3 flags a data file when a key disappears 
- waived:data-regressed @ data/chronology_day3.json: 23 regression(s): /events[0]/flag: key removed; /events[2]/units_involved: array shrank 2 -> 1; /events[2]/flag: key removed; /events[5]/units_involved: array shrank 4 -> 2; /events[7]/flag: key removed -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edits no /data file). Check 3 flags 
- waived:data-regressed @ data/density_artillery_positions.json: 3 regression(s): /placements: array shrank 36 -> 35; /placements[9]/notes: key removed; /placements[14]/notes: key removed -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edits no /data file). Check 3 flags a data file when a key disappears or an array shrinks. The DATA group does both 
- data-changed-not-worse @ data/density_cavalry_detail.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day1_afternoon.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day1_barlowsknoll.json: content differs, nothing removed or shrunk
- waived:data-regressed @ data/density_day1_ironbrigade.json: 1 regression(s): /placements: array shrank 16 -> 1 -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edits no /data file). Check 3 flags a data file when a key disappears or an array shrinks. The DATA group does both on purpose (about 33 files: unsupported commander fates and position not
- waived:data-regressed @ data/density_day1_iverson.json: 1 regression(s): /placements: array shrank 17 -> 11 -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edits no /data file). Check 3 flags a data file when a key disappears or an array shrinks. The DATA group does both on purpose (about 33 files: unsupported commander fates and position no
- waived:data-regressed @ data/density_day1_lateafternoon.json: 2 regression(s): /placements: array shrank 27 -> 24; /placements[8]/notes: key removed -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edits no /data file). Check 3 flags a data file when a key disappears or an array shrinks. The DATA group does both on purpose (about 33 files: unsuppor
- waived:data-regressed @ data/density_day1_opening.json: 1 regression(s): /placements: array shrank 22 -> 19 -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edits no /data file). Check 3 flags a data file when a key disappears or an array shrinks. The DATA group does both on purpose (about 33 files: unsupported commander fates and position no
- waived:data-regressed @ data/density_day1_railroadcut.json: 1 regression(s): /placements: array shrank 16 -> 15 -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edits no /data file). Check 3 flags a data file when a key disappears or an array shrinks. The DATA group does both on purpose (about 33 files: unsupported commander fates and position no
- data-changed-not-worse @ data/density_day1_seminary.json: content differs, nothing removed or shrunk
- waived:data-regressed @ data/density_day1_ticks1_50.json: 3 regression(s): /placements: array shrank 75 -> 65; /placements[21]/notes: key removed; /placements[46]/notes: key removed -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edits no /data file). Check 3 flags a data file when a key disappears or an array shrinks. The DATA group does both
- data-changed-not-worse @ data/density_day1_ticks51_100.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day2_15alabama.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day2_afternoon.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day2_bigelow.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day2_cemhill.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day2_culpshill.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day2_culpshill_overnight.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day2_devilsden.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day2_kershaw.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day2_lrt.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day2_morning.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day2_overnight.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day2_wheatfield.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day2_wright.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day3_aftermath.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day3_angle.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day3_cannonade.json: content differs, nothing removed or shrunk
- waived:data-regressed @ data/density_day3_cavalry.json: 1 regression(s): /placements: array shrank 21 -> 18 -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edits no /data file). Check 3 flags a data file when a key disappears or an array shrinks. The DATA group does both on purpose (about 33 files: unsupported commander fates and position no
- data-changed-not-worse @ data/density_day3_culpshill.json: content differs, nothing removed or shrunk
- waived:data-regressed @ data/density_day3_hancock.json: 1 regression(s): /placements: array shrank 15 -> 14 -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edits no /data file). Check 3 flags a data file when a key disappears or an array shrinks. The DATA group does both on purpose (about 33 files: unsupported commander fates and position no
- data-changed-not-worse @ data/density_day3_morning.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day3_pettigrew.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day3_picketts_charge.json: content differs, nothing removed or shrunk
- waived:data-regressed @ data/density_day3_retreat.json: 1 regression(s): /placements: array shrank 24 -> 21 -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edits no /data file). Check 3 flags a data file when a key disappears or an array shrinks. The DATA group does both on purpose (about 33 files: unsupported commander fates and position no
- data-changed-not-worse @ data/density_day3_vermont.json: content differs, nothing removed or shrunk
- waived:data-regressed @ data/density_reserves.json: 1 regression(s): /placements: array shrank 26 -> 24 -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edits no /data file). Check 3 flags a data file when a key disappears or an array shrinks. The DATA group does both on purpose (about 33 files: unsupported commander fates and position no
- waived:data-regressed @ data/density_skirmishers.json: 2 regression(s): /placements: array shrank 31 -> 25; /placements[17]/notes: key removed -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edits no /data file). Check 3 flags a data file when a key disappears or an array shrinks. The DATA group does both on purpose (about 33 files: unsuppo
- data-changed-not-worse @ data/oob/commander_successions.json: content differs, nothing removed or shrunk
- waived:data-regressed @ data/oob/confederate_artillery.json: 5 regression(s): /metadata/total_guns_approximately: key removed; /metadata/alexander_cannonade_notes/total_confederate_guns_engaged: key removed; /second_corps_artillery/battalions[1]/batteries[2]/commander/fate: key removed; /second_corps_artillery/battalions[1]/batteries[3]/commander/fate: key re
- data-changed-not-worse @ data/oob/confederate_cavalry.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/oob/confederate_oob_corps_div_bde.json: content differs, nothing removed or shrunk
- waived:data-regressed @ data/oob/confederate_regiments_first_corps.json: 5 regression(s): /regiments[4]/commander/fate: key removed; /regiments[13]/commander/fate: key removed; /regiments[19]/commander/fate: key removed; /regiments[22]/commander/fate: key removed; /regiments[48]/commander/fate: key removed -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edit
- waived:data-regressed @ data/oob/confederate_regiments_second_corps.json: 10 regression(s): /regiments[11]/commander/fate: key removed; /regiments[21]/commander/fate: key removed; /regiments[27]/commander/fate: key removed; /regiments[28]/commander/fate: key removed; /regiments[29]/commander/fate: key removed -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c ed
- waived:data-regressed @ data/oob/confederate_regiments_third_corps.json: 10 regression(s): /regiments[10]/commander/fate: key removed; /regiments[19]/commander/fate: key removed; /regiments[20]/commander/fate: key removed; /regiments[28]/commander/fate: key removed; /regiments[32]/commander/fate: key removed -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c ed
- waived:data-regressed @ data/oob/union_artillery.json: 1 regression(s): /corps_artillery_brigades[5]/batteries[3]/commander/fate: key removed -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edits no /data file). Check 3 flags a data file when a key disappears or an array shrinks. The DATA group does both on purpose (about 33 files: unsuppor
- waived:data-regressed @ data/oob/union_cavalry_artillery.json: 7 regression(s): /regiments[7]/commander/fate: key removed; /regiments[15]/commander/fate: key removed; /regiments[17]/commander/fate: key removed; /regiments[19]/commander/fate: key removed; /regiments[22]/commander/fate: key removed -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edit
- waived:data-regressed @ data/oob/union_oob_brigades.json: 1 regression(s): /brigades[4]/commander/successor: key removed -- WAIVED: NOT one of the 53 defects of the R1c dry run (R1c edits no /data file). Check 3 flags a data file when a key disappears or an array shrinks. The DATA group does both on purpose (about 33 files: unsupported commander fates and 

</details>

Raw outputs: the machine-readable `raw` sections of the JSON file of this pass, and the files in `pass-111-artifacts/` (screenshots, diffs, tool output).
