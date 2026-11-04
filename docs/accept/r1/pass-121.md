# Acceptance pass 121: DEFECTS (incomplete)

Started 2026-10-20T13:33:31.841Z, finished 2026-10-20T13:39:13.022Z.

| | |
|---|---|
| Candidate | `tmp\r1\r1-4e21b82d.zip` (zip) |
| Candidate SHA-256 | `4878173db654bd0911f823fbaa28c0e0c48186547bb579c2384c6473adaea036` |
| Tree digest (sha256 of path+hash list) | `7fc59e1106e19dae69371fda897b045fba1fa0f492d713bd0d622b62d0450469` |
| Files | 2013 |
| Baseline (published build) | `baseline\dist` |
| Harness digest | `b7ed29aed65c46e0afd0bcd12a7e3b8e006987fd43f481551fb3400f73a26ad6` (31 files) |
| Node / Python | v24.19.0 / Python 3.11.9 |
| Chrome | Chrome/155.0.8059.82 |
| Playwright-core / axe-core | 1.63.0 / 4.13.0 |
| OS / CPU | Windows_NT 10.0.26200 x64; 16 x Intel(R) Core(TM) Ultra 7 265H; 34 GB |
| Repo HEAD | 17ba8ee789133164815e11c4f2e740de86524862 |
| Mapbox tile requests | 492 of cap 20000 (cap-blocked 0) |
| Soak | 60 s |

A pass is CLEAN only if all eight checks RAN and found zero defects. A check that did not run is never a pass.

## Summary

| # | Check | Status | Defects | Notes | Time |
|---|---|---|---|---|---|
| 2 | Static hygiene | RAN, clean | 0 | 6 | 75 s |
| 3 | Regression against the published build | RAN, DEFECTS | 35 | 181 | 258 s |
| 8 | Copy audit | RAN, DEFECTS | 5 | 3 | 4 s |

## Check 2: Static hygiene

Status: **RAN**. Defects: 0. Notes: 6.

Metrics:

```json
{
 "parsed": {
  "html": 25,
  "css": 2,
  "js": 5,
  "json": 78,
  "inlineScripts": 50,
  "inlineStyles": 25
 },
 "crawl": {
  "internalReferences": 229,
  "uniqueTargets": 47,
  "externalReferences": 31,
  "externalHosts": {
   "catalog.archives.gov": 2,
   "api.mapbox.com": 25,
   "www.metmuseum.org": 1,
   "www.nps.gov": 1,
   "www.mapbox.com": 1,
   "policies.google.com": 1
  },
  "dynamicTemplateReferencesNotResolvable": 0,
  "unreferencedFilesNote": 1887
 },
 "insecureUrls": 0,
 "chrome": "Chrome/155.0.8059.82",
 "mapLoads": {
  "routes": 9,
  "tileRequestsSeen": 122,
  "statuses": {
   "200": 122,
   "204": 31
  },
  "refererInjected": 122,
  "skus": 10
 },
 "routes": 25,
 "serviceWorker": {
  "install": {
   "scope": "http://127.0.0.1:10300/",
   "active": "http://127.0.0.1:10300/sw.js",
   "state": "activated"
  },
  "afterReload": {
   "controller": "http://127.0.0.1:10300/sw.js",
   "caches": [
    "gbg-r0-4e21b82d",
    "mapbox-tiles"
   ],
   "cachedAssets": 18
  },
  "update": {
   "waiting": true,
   "installing": false,
   "active": "activated"
  },
  "afterActivate": {
   "active": "activated",
   "waiting": false,
   "caches": [
    "mapbox-tiles",
    "gbg-r0-4e21b82d-acceptance-update"
   ],
   "controller": true,
   "loads": 1
  }
 }
}
```

<details><summary>Notes (information, not defects)</summary>

- crawl-ignored @ -: 5 string literals under /mapbox-gl-js/ ignored: prefix of the Mapbox CDN path (https://api.mapbox.com/mapbox-gl-js/...): Mapbox GL appends it to its own origin at runtime
- fragment-target-not-static @ index.html: #gt-map has no static id (may be created by script)
- fragment-target-not-static @ index.html: #gt-timeline has no static id (may be created by script)
- external-not-checked @ -: 31 references to 6 external hosts were NOT requested (the run is offline by design): catalog.archives.gov, api.mapbox.com, www.metmuseum.org, www.nps.gov, www.mapbox.com, policies.google.com
- unreferenced-files @ -: apple-touch-icon-precomposed.png, icons.svg, tiles1863/v1-65d491b8/11/583/776.webp, tiles1863/v1-65d491b8/11/583/777.webp, tiles1863/v1-65d491b8/11/584/776.webp, tiles1863/v1-65d491b8/11/584/777.webp, tiles1863/v1-65d491b8/11/585/776.webp, tiles1863/v1-65d491b8/11/585/777.webp, tiles1863/v1-65d491b8
- mapbox-cdn-runtime-dependency @ -: 8 pages load mapbox-gl.js/css from https://api.mapbox.com at runtime (SRI-pinned v3.24.1); the app bundles its own copy

</details>

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

## Check 8: Copy audit

Status: **RAN**. Defects: 5. Notes: 3.

Commands:

- `node tools/accept/copy_audit.mjs r1-4e21b82d.zip (in-process)` -> exit null in 0.0 s (whitelist: 0 entries)

Metrics:

```json
{
 "scanned": {
  "files": 2013,
  "bytes": 44901685
 },
 "zip": {
  "entries": 2013,
  "comment": ""
 },
 "blocking": 5,
 "whitelisted": 0,
 "informational": 3,
 "whitelistEntries": 0,
 "rules": [
  "claude",
  "anthropic",
  "openai",
  "chatgpt",
  "gpt-",
  "copilot",
  "gemini",
  "llm",
  "language model",
  "artificial intelligence",
  "AI (whole word, also AI-)",
  "A.I.",
  "machine-generated",
  "generated by",
  "auto-generated",
  "subagent",
  "agent (as AI)",
  "prompt",
  "OWNER TO CONFIRM",
  "lorem ipsum",
  "TODO/FIXME/XXX",
  "DO NOT EDIT",
  "(anonymous)",
  "(unspecified)",
  "how-it-was-built label (DEC-006)"
 ],
 "pdfs": [
  {
   "file": "user-guide.pdf",
   "pdf": {
    "pages": 29,
    "info": {
     "/Title": "Gettysburg Interactive Map: User Guide",
     "/Author": "Gettysburg Interactive Map",
     "/Subject": "How to use the Gettysburg Interactive Map: the timeline, the map and its units, the toolbar, the Virtual Walkthrough, sharing links, the other pages, keyboard use and the phone layout.",
     "/Keywords": "Gettysburg, Battle of Gettysburg, interactive map, user guide, tutorial, July 1863, timeline, keyboard shortcuts, accessibility",
     "/Creator": "Gettysburg Interactive Map",
     "/Producer": "Gettysburg Interactive Map",
     "/CreationDate": "D:20261019000000+00'00'",
     "/ModDate": "D:20261019000000+00'00'"
    },
    "hasXmp": true,
    "fonts": [
     "/AAAAAA+SourceSerif4-SemiBold",
     "/BAAAAA+Inter-SemiBold",
     "/CAAAAA+SourceSerif4-Italic",
     "/DAAAAA+Inter-Medium",
     "/EAAAAA+Inter-Regular",
     "/FAAAAA+Inter-Bold",
     "/GAAAAA+SourceSerif4-Regular"
    ],
    "tagged": true,
    "lang": "en-US"
   }
  }
 ]
}
```

Defects by code: copy:AI (whole word, also AI-) x3, copy:pdf producer/creator tool name x2

| code | where | detail |
|---|---|---|
| copy:pdf producer/creator tool name | user-guide.pdf [pdf/Info/Creator] | "Gettysburg Interactive Map" ... /Creator = Gettysburg Interactive Map  (non-empty: name the site or leave it empty) |
| copy:pdf producer/creator tool name | user-guide.pdf [pdf/Info/Producer] | "Gettysburg Interactive Map" ... /Producer = Gettysburg Interactive Map  (non-empty: name the site or leave it empty) |
| copy:AI (whole word, also AI-) | user-guide.pdf [pdf/raw-strings] | "AI" ... E(Bpi !j!K q*H uj.z'Z o$EBV@B .DY/[\( H dg$y IJ^)AI % vk 'g7G4 PQN@m d m78o8# c<p Wuv Or" Sn QSQ@ E |
| copy:AI (whole word, also AI-) | user-guide.pdf [pdf/raw-strings] | "AI" ... 8RZC AIZIPQ CTQUuE4 -%*wI& -r\(H@ /E<T K f(Me+m AI zDg> xpaIaj p}k`8 P!;%2{ 'eQiBR $)JT R )T)JP)JP) |
| copy:AI (whole word, also AI-) | user-guide.pdf [pdf/raw-strings] | "AI" ... u $nEw9*y T+K\RR =i7^!%) C#(!J [9N-`Q J*gK9 t$ AI;aI L.h Im oQ2V^uk# Y<^W%EX u)tQE}0 }!%(sA HEI`Q& |

<details><summary>Notes (information, not defects)</summary>

- copy-info:ops file shipped (info) @ _ops/asset-manifest.json: _ops/asset-manifest.json is deployed to the public site
- copy-info:ops file shipped (info) @ _ops/config-manifest.json: _ops/config-manifest.json is deployed to the public site
- copy-info:ops file shipped (info) @ _ops/used-names.txt: _ops/used-names.txt is deployed to the public site

</details>

Raw outputs: the machine-readable `raw` sections of the JSON file of this pass, and the files in `pass-121-artifacts/` (screenshots, diffs, tool output).
