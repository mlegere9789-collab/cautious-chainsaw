# Acceptance pass 103: DEFECTS (incomplete)

Started 2026-10-20T12:17:14.729Z, finished 2026-10-20T12:21:20.861Z.

| | |
|---|---|
| Candidate | `tmp\r1\r1-766259b8.zip` (zip) |
| Candidate SHA-256 | `2df7560446a2533ff403ec37fb440c1cbbb50e90cbc5f4e6a6c00aae72114a92` |
| Tree digest (sha256 of path+hash list) | `afec83b2babd17002138fa6045e2967c12f6fa9b3d95f00d2ab2bbf6b94268a4` |
| Files | 2013 |
| Baseline (published build) | `baseline\dist` |
| Harness digest | `cd0c5dbcf775d7210283ca348cdc7a6fc5d825388527ebbf1e2881773ff4a76a` (31 files) |
| Node / Python | v24.19.0 / Python 3.11.9 |
| Chrome | Chrome/155.0.8059.82 |
| Playwright-core / axe-core | 1.63.0 / 4.13.0 |
| OS / CPU | Windows_NT 10.0.26200 x64; 16 x Intel(R) Core(TM) Ultra 7 265H; 34 GB |
| Repo HEAD | 17ba8ee789133164815e11c4f2e740de86524862 |
| Mapbox tile requests | 373 of cap 20000 (cap-blocked 0) |
| Soak | 60 s |

A pass is CLEAN only if all eight checks RAN and found zero defects. A check that did not run is never a pass.

## Summary

| # | Check | Status | Defects | Notes | Time |
|---|---|---|---|---|---|
| 3 | Regression against the published build | RAN, DEFECTS | 125 | 91 | 244 s |

## Check 3: Regression against the published build

Status: **RAN**. Defects: 125. Notes: 91.

Metrics:

```json
{
 "waiversLoaded": 4,
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

Defects by code: screenshot-differs x40, text-missing x38, data-regressed x34, control-missing x8, file-missing x5

| code | where | detail |
|---|---|---|
| file-missing | assets/InterpolationWorker-ufiwa2-e.js | assets/InterpolationWorker-ufiwa2-e.js is on the published build and not in the candidate |
| file-missing | icons/icon-192.png | icons/icon-192.png is on the published build and not in the candidate |
| file-missing | icons/icon-512.png | icons/icon-512.png is on the published build and not in the candidate |
| file-missing | screenshots/day1.png | screenshots/day1.png is on the published build and not in the candidate |
| file-missing | screenshots/day3.png | screenshots/day3.png is on the published build and not in the candidate |
| data-regressed | data/casualty_apportionment.json | 1 regression(s): /notable_intensity_notes/highest_single_regiment_rate: key removed |
| data-regressed | data/chronology_day1.json | 20 regression(s): /events[4]/flag: key removed; /events[5]/flag: key removed; /events[6]/flag: key removed; /events[11]/flag: key removed; /events[12]/flag: key removed |
| data-regressed | data/chronology_day2.json | 27 regression(s): /events: array shrank 49 -> 46; /events[3]/flag: key removed; /events[5]/flag: key removed; /events[7]/flag: key removed; /events[8]/flag: key removed |
| data-regressed | data/chronology_day3.json | 23 regression(s): /events[0]/flag: key removed; /events[2]/units_involved: array shrank 2 -> 1; /events[2]/flag: key removed; /events[5]/units_involved: array shrank 4 -> 2; /events[7]/flag: key removed |
| data-regressed | data/density_artillery_positions.json | 3 regression(s): /placements: array shrank 36 -> 35; /placements[9]/notes: key removed; /placements[14]/notes: key removed |
| data-regressed | data/density_day1_ironbrigade.json | 1 regression(s): /placements: array shrank 16 -> 1 |
| data-regressed | data/density_day1_iverson.json | 1 regression(s): /placements: array shrank 17 -> 11 |
| data-regressed | data/density_day1_lateafternoon.json | 2 regression(s): /placements: array shrank 27 -> 24; /placements[8]/notes: key removed |
| data-regressed | data/density_day1_opening.json | 1 regression(s): /placements: array shrank 22 -> 19 |
| data-regressed | data/density_day1_railroadcut.json | 1 regression(s): /placements: array shrank 16 -> 15 |
| data-regressed | data/density_day1_ticks1_50.json | 3 regression(s): /placements: array shrank 75 -> 65; /placements[21]/notes: key removed; /placements[46]/notes: key removed |
| data-regressed | data/density_day3_cavalry.json | 1 regression(s): /placements: array shrank 21 -> 18 |
| data-regressed | data/density_day3_hancock.json | 1 regression(s): /placements: array shrank 15 -> 14 |
| data-regressed | data/density_day3_retreat.json | 1 regression(s): /placements: array shrank 24 -> 21 |
| data-regressed | data/density_reserves.json | 1 regression(s): /placements: array shrank 26 -> 24 |
| data-regressed | data/density_skirmishers.json | 2 regression(s): /placements: array shrank 31 -> 25; /placements[17]/notes: key removed |
| data-regressed | data/oob/confederate_artillery.json | 5 regression(s): /metadata/total_guns_approximately: key removed; /metadata/alexander_cannonade_notes/total_confederate_guns_engaged: key removed; /second_corps_artillery/battalions[1]/batteries[2]/commander/fate: key removed; /second_corps_artillery/battalions[1]/batteries[3]/commander/fate: key re |
| data-regressed | data/oob/confederate_regiments_first_corps.json | 5 regression(s): /regiments[4]/commander/fate: key removed; /regiments[13]/commander/fate: key removed; /regiments[19]/commander/fate: key removed; /regiments[22]/commander/fate: key removed; /regiments[48]/commander/fate: key removed |
| data-regressed | data/oob/confederate_regiments_second_corps.json | 10 regression(s): /regiments[11]/commander/fate: key removed; /regiments[21]/commander/fate: key removed; /regiments[27]/commander/fate: key removed; /regiments[28]/commander/fate: key removed; /regiments[29]/commander/fate: key removed |
| data-regressed | data/oob/confederate_regiments_third_corps.json | 10 regression(s): /regiments[10]/commander/fate: key removed; /regiments[19]/commander/fate: key removed; /regiments[20]/commander/fate: key removed; /regiments[28]/commander/fate: key removed; /regiments[32]/commander/fate: key removed |
| data-regressed | data/oob/union_artillery.json | 1 regression(s): /corps_artillery_brigades[5]/batteries[3]/commander/fate: key removed |
| data-regressed | data/oob/union_cavalry_artillery.json | 7 regression(s): /regiments[7]/commander/fate: key removed; /regiments[15]/commander/fate: key removed; /regiments[17]/commander/fate: key removed; /regiments[19]/commander/fate: key removed; /regiments[22]/commander/fate: key removed |
| data-regressed | data/oob/union_oob_brigades.json | 1 regression(s): /brigades[4]/commander/successor: key removed |
| data-regressed | data/oob/union_regiments_i_ii_corps.json | 4 regression(s): /regiments[10]/commander/fate: key removed; /regiments[15]/commander/fate: key removed; /regiments[15]/casualty_percentage: key removed; /regiments[42]/commander/fate: key removed |
| data-regressed | data/oob/union_regiments_iii_v_corps.json | 6 regression(s): /regiments[7]/commander/fate: key removed; /regiments[22]/commander/fate: key removed; /regiments[27]/commander/fate: key removed; /regiments[34]/commander/fate: key removed; /regiments[47]/commander/fate: key removed |
| data-regressed | data/oob/union_regiments_vi_xi_xii_corps.json | 9 regression(s): /regiments[2]/commander/fate: key removed; /regiments[3]/commander/fate: key removed; /regiments[7]/commander/fate: key removed; /regiments[8]/commander/fate: key removed; /regiments[14]/commander/fate: key removed |
| data-regressed | data/placements_day1_ticks101_225.json | 7 regression(s): /placements: array shrank 107 -> 83; /placements[23]/notes: key removed; /placements[29]/notes: key removed; /placements[30]/notes: key removed; /placements[31]/notes: key removed |
| data-regressed | data/placements_day1_ticks1_50.json | 1 regression(s): /placements: array shrank 100 -> 66 |
| data-regressed | data/placements_day1_ticks51_100.json | 1 regression(s): /placements[31]/notes: key removed |
| data-regressed | data/placements_day2_ticks226_300.json | 7 regression(s): /placements[18]/notes: key removed; /placements[20]/notes: key removed; /placements[21]/notes: key removed; /placements[22]/notes: key removed; /placements[39]/notes: key removed |
| data-regressed | data/placements_day2_ticks301_375.json | 4 regression(s): /placements[44]/notes: key removed; /placements[45]/notes: key removed; /placements[46]/notes: key removed; /placements[47]/notes: key removed |
| data-regressed | data/placements_day2_ticks376_450.json | 5 regression(s): /placements[9]/notes: key removed; /placements[14]/notes: key removed; /placements[30]/notes: key removed; /placements[34]/notes: key removed; /placements[38]/notes: key removed |
| data-regressed | data/placements_day3_ticks601_675.json | 7 regression(s): /placements[9]/notes: key removed; /placements[15]/notes: key removed; /placements[16]/notes: key removed; /placements[17]/notes: key removed; /placements[18]/notes: key removed |
| data-regressed | manifest.json | 2 regression(s): /orientation: key removed; /screenshots: key removed |
| text-missing | aftermath@1440 | 1 visible text line(s) of the published build are not in the candidate: "Unlike the main animated map, this timeline is general narrative history, not bu" |
| screenshot-differs | aftermath@1440 | 6.219% of pixels differ (limit 0.20%); page size 1425x1265 -> 1425x1776; bbox [72,5,1366,1255]; worst regions [[534,422,713,633],[713,422,891,633],[534,633,713,843]]; images: docs\accept\r1\pass-103-artifacts\regression\aftermath@1440.{baseline,candidate,diff}.png |
| text-missing | aftermath@390 | 1 visible text line(s) of the published build are not in the candidate: "Unlike the main animated map, this timeline is general narrative history, not bu" |
| screenshot-differs | aftermath@390 | 11.776% of pixels differ (limit 0.20%); page size 390x1646 -> 390x2081; bbox [13,5,370,1635]; worst regions [[98,549,146,823],[49,549,98,823],[195,549,244,823]]; images: docs\accept\r1\pass-103-artifacts\regression\aftermath@390.{baseline,candidate,diff}.png |
| text-missing | ar@1440 | 1 visible text line(s) of the published build are not in the candidate: "This needs a phone: its camera, GPS, and compass, all live, granted directly in " |
| screenshot-differs | ar@1440 | 1.801% of pixels differ (limit 0.20%); bbox [72,5,1367,788]; worst regions [[540,450,720,600],[720,450,900,600],[180,150,360,300]]; images: docs\accept\r1\pass-103-artifacts\regression\ar@1440.{baseline,candidate,diff}.png |
| text-missing | ar@390 | 1 visible text line(s) of the published build are not in the candidate: "This needs a phone: its camera, GPS, and compass, all live, granted directly in " |
| screenshot-differs | ar@390 | 8.095% of pixels differ (limit 0.20%); page size 390x944 -> 390x999; bbox [13,5,370,914]; worst regions [[195,472,244,629],[146,472,195,629],[98,472,146,629]]; images: docs\accept\r1\pass-103-artifacts\regression\ar@390.{baseline,candidate,diff}.png |
| text-missing | dashboard@1440 | 19 visible text line(s) of the published build are not in the candidate: "Corps-by-corps effective strength over the course of the battle, built directly ", "(52.3% casualties ⚠)", "(5.1% casualties ⚠)", "23,138", "Across 8 corps, 25.7% overall rate", "Across 4 corps, 31.6% overall rate" |
| screenshot-differs | dashboard@1440 | 3.473% of pixels differ (limit 0.20%); page size 1425x1713 -> 1425x1655; bbox [72,5,1366,1654]; worst regions [[713,828,891,1103],[891,828,1069,1103],[356,552,534,828]]; images: docs\accept\r1\pass-103-artifacts\regression\dashboard@1440.{baseline,candidate,diff}.png |
| text-missing | dashboard@390 | 19 visible text line(s) of the published build are not in the candidate: "Corps-by-corps effective strength over the course of the battle, built directly ", "(52.3% casualties ⚠)", "(5.1% casualties ⚠)", "23,138", "Across 8 corps, 25.7% overall rate", "Across 4 corps, 31.6% overall rate" |
| screenshot-differs | dashboard@390 | 6.278% of pixels differ (limit 0.20%); page size 448x2454 -> 390x2886; bbox [13,5,389,2424]; worst regions [[49,1636,98,2045],[98,1636,146,2045],[146,1636,195,2045]]; images: docs\accept\r1\pass-103-artifacts\regression\dashboard@390.{baseline,candidate,diff}.png |
| text-missing | documentary@1440 | 2 visible text line(s) of the published build are not in the candidate: "DAY 1 · TICK 12 · KNOXLYN RIDGE, WEST OF GETTYSBURG", "The morning of July 1 was warm and hazy when Corporal Alphonso Hodges spotted mo" |
| screenshot-differs | documentary@1440 | 2.242% of pixels differ (limit 0.20%); page size 1425x1238 -> 1425x1142; bbox [72,5,1366,1111]; worst regions [[713,571,891,761],[534,571,713,761],[534,381,713,571]]; images: docs\accept\r1\pass-103-artifacts\regression\documentary@1440.{baseline,candidate,diff}.png |
| text-missing | documentary@390 | 2 visible text line(s) of the published build are not in the candidate: "DAY 1 · TICK 12 · KNOXLYN RIDGE, WEST OF GETTYSBURG", "The morning of July 1 was warm and hazy when Corporal Alphonso Hodges spotted mo" |
| screenshot-differs | documentary@390 | 7.447% of pixels differ (limit 0.20%); page size 390x1838 -> 390x1663; bbox [13,5,369,1620]; worst regions [[98,832,146,1109],[244,832,293,1109],[195,832,244,1109]]; images: docs\accept\r1\pass-103-artifacts\regression\documentary@390.{baseline,candidate,diff}.png |
| text-missing | education@1440 | 6 visible text line(s) of the published build are not in the candidate: "At approximately 7:30am on July 1, 1863, Lieutenant Marcellus Jones of the 8th I", "Major General John Reynolds, the finest corps commander in the Army of the Potom", "Within minutes of Reynolds's death, the Iron Brigade's char |
| screenshot-differs | education@1440 | 6.461% of pixels differ (limit 0.20%); page size 1425x2546 -> 1425x3087; bbox [0,5,1424,2545]; worst regions [[534,424,713,849],[534,0,713,424],[713,0,891,424]]; images: docs\accept\r1\pass-103-artifacts\regression\education@1440.{baseline,candidate,diff}.png |
| text-missing | education@390 | 6 visible text line(s) of the published build are not in the candidate: "At approximately 7:30am on July 1, 1863, Lieutenant Marcellus Jones of the 8th I", "Major General John Reynolds, the finest corps commander in the Army of the Potom", "Within minutes of Reynolds's death, the Iron Brigade's char |
| screenshot-differs | education@390 | 14.645% of pixels differ (limit 0.20%); page size 390x3373 -> 390x3812; bbox [0,5,389,3372]; worst regions [[49,0,98,562],[98,0,146,562],[146,0,195,562]]; images: docs\accept\r1\pass-103-artifacts\regression\education@390.{baseline,candidate,diff}.png |
| text-missing | embed@1440 | 1 visible text line(s) of the published build are not in the candidate: "When Gordon's Confederate brigade swept over Barlow's Knoll, General Francis Bar" |
| screenshot-differs | embed@1440 | 0.949% of pixels differ (limit 0.20%); bbox [21,21,449,283]; worst regions [[0,150,180,300],[0,0,180,150],[180,0,360,150]]; images: docs\accept\r1\pass-103-artifacts\regression\embed@1440.{baseline,candidate,diff}.png |
| text-missing | embed@390 | 1 visible text line(s) of the published build are not in the candidate: "When Gordon's Confederate brigade swept over Barlow's Knoll, General Francis Bar" |
| screenshot-differs | embed@390 | 5.002% of pixels differ (limit 0.20%); bbox [21,21,367,328]; worst regions [[195,141,244,281],[98,141,146,281],[49,141,98,281]]; images: docs\accept\r1\pass-103-artifacts\regression\embed@390.{baseline,candidate,diff}.png |
| text-missing | find-ancestor@1440 | 1 visible text line(s) of the published build are not in the candidate: "Search by state, or by a commander's surname, to narrow down which of the 467 Un" |
| screenshot-differs | find-ancestor@1440 | 1.487% of pixels differ (limit 0.20%); bbox [72,5,1366,621]; worst regions [[540,150,720,300],[360,150,540,300],[540,300,720,450]]; images: docs\accept\r1\pass-103-artifacts\regression\find-ancestor@1440.{baseline,candidate,diff}.png |
| text-missing | find-ancestor@390 | 1 visible text line(s) of the published build are not in the candidate: "Search by state, or by a commander's surname, to narrow down which of the 467 Un" |
| screenshot-differs | find-ancestor@390 | 5.116% of pixels differ (limit 0.20%); page size 390x844 -> 390x901; bbox [13,5,370,816]; worst regions [[49,141,98,281],[98,141,146,281],[146,281,195,422]]; images: docs\accept\r1\pass-103-artifacts\regression\find-ancestor@390.{baseline,candidate,diff}.png |
| text-missing | historian@1440 | 1 visible text line(s) of the published build are not in the candidate: "This runs entirely in your browser and answers only from this site's own publish" |
| screenshot-differs | historian@1440 | 1.493% of pixels differ (limit 0.20%); page size 1440x900 -> 1425x1194; bbox [72,5,1366,794]; worst regions [[178,150,356,300],[891,600,1069,750],[356,150,534,300]]; images: docs\accept\r1\pass-103-artifacts\regression\historian@1440.{baseline,candidate,diff}.png |
| text-missing | historian@390 | 1 visible text line(s) of the published build are not in the candidate: "This runs entirely in your browser and answers only from this site's own publish" |
| screenshot-differs | historian@390 | 3.974% of pixels differ (limit 0.20%); page size 390x966 -> 390x1247; bbox [13,5,370,924]; worst regions [[293,644,341,805],[98,161,146,322],[49,161,98,322]]; images: docs\accept\r1\pass-103-artifacts\regression\historian@390.{baseline,candidate,diff}.png |
| text-missing | living-ledger@1440 | 2 visible text line(s) of the published build are not in the candidate: "JULY 1, 5:00 AM", "TOTAL CASUALTIES, BOTH ARMIES" |
| screenshot-differs | living-ledger@1440 | 1.409% of pixels differ (limit 0.20%); page size 1440x900 -> 1425x1124; bbox [72,5,1366,836]; worst regions [[713,600,891,750],[534,600,713,750],[713,300,891,450]]; images: docs\accept\r1\pass-103-artifacts\regression\living-ledger@1440.{baseline,candidate,diff}.png |
| text-missing | living-ledger@390 | 2 visible text line(s) of the published build are not in the candidate: "JULY 1, 5:00 AM", "TOTAL CASUALTIES, BOTH ARMIES" |
| screenshot-differs | living-ledger@390 | 5.135% of pixels differ (limit 0.20%); page size 390x844 -> 390x1157; bbox [13,5,369,801]; worst regions [[195,563,244,703],[146,563,195,703],[195,281,244,422]]; images: docs\accept\r1\pass-103-artifacts\regression\living-ledger@390.{baseline,candidate,diff}.png |
| screenshot-differs | privacy@1440 | 0.138% of pixels differ (limit 0.20%); page size 1425x1518 -> 1425x1539; bbox [360,1314,830,1408]; worst regions [[356,1265,534,1518],[534,1265,713,1518],[713,1265,891,1518]]; images: docs\accept\r1\pass-103-artifacts\regression\privacy@1440.{baseline,candidate,diff}.png |
| screenshot-differs | privacy@390 | 0.247% of pixels differ (limit 0.20%); page size 390x1966 -> 390x2007; bbox [20,1763,288,1877]; worst regions [[98,1638,146,1966],[49,1638,98,1966],[0,1638,49,1966]]; images: docs\accept\r1\pass-103-artifacts\regression\privacy@390.{baseline,candidate,diff}.png |
| text-missing | regiment@1440 | 1 visible text line(s) of the published build are not in the candidate: "Pick any regiment or battery and follow its whole three-day battle as one story " |
| screenshot-differs | regiment@1440 | 0.768% of pixels differ (limit 0.20%); bbox [72,5,1367,432]; worst regions [[180,150,360,300],[540,150,720,300],[0,0,180,150]]; images: docs\accept\r1\pass-103-artifacts\regression\regiment@1440.{baseline,candidate,diff}.png |
| text-missing | regiment@390 | 1 visible text line(s) of the published build are not in the candidate: "Pick any regiment or battery and follow its whole three-day battle as one story " |
| screenshot-differs | regiment@390 | 2.587% of pixels differ (limit 0.20%); bbox [13,5,369,508]; worst regions [[195,141,244,281],[146,141,195,281],[49,141,98,281]]; images: docs\accept\r1\pass-103-artifacts\regression\regiment@390.{baseline,candidate,diff}.png |
| text-missing | report@1440 | 1 visible text line(s) of the published build are not in the candidate: "Battle Reports" |
| screenshot-differs | report@1440 | 0.687% of pixels differ (limit 0.20%); bbox [72,5,1367,408]; worst regions [[0,0,180,150],[180,0,360,150],[540,150,720,300]]; images: docs\accept\r1\pass-103-artifacts\regression\report@1440.{baseline,candidate,diff}.png |
| text-missing | report@390 | 1 visible text line(s) of the published build are not in the candidate: "Battle Reports" |
| screenshot-differs | report@390 | 2.122% of pixels differ (limit 0.20%); bbox [13,5,369,480]; worst regions [[49,141,98,281],[195,141,244,281],[98,141,146,281]]; images: docs\accept\r1\pass-103-artifacts\regression\report@390.{baseline,candidate,diff}.png |
| text-missing | search@1440 | 19 visible text line(s) of the published build are not in the candidate: "Vignettes", "Michigan · Colonel Henry Morrow · 73% casualties", "New York · Colonel Edward Fowler · 42.5% casualties", "New York · Colonel George Biddle · 41.1% casualties", "New York · Lieutenant Colonel Francis Miller · 55.5 |
| control-missing | search@1440 | 3 control(s) of the published build have no counterpart in the candidate: "input\|\|Search regiments, vignettes, locations… (e.g. '20th Maine', 'Wheatfield', 'Cushi", "button\|\|Vignettes", "a\|\|REGIMENT · UNION 107th New York Volunteer Infantry New York · Colonel Nixon Van " |
| screenshot-differs | search@1440 | 2.087% of pixels differ (limit 0.20%); page size 1425x3273 -> 1425x3306; bbox [73,5,1366,3272]; worst regions [[356,546,534,1091],[356,1091,534,1637],[356,0,534,546]]; images: docs\accept\r1\pass-103-artifacts\regression\search@1440.{baseline,candidate,diff}.png |
| text-missing | search@390 | 19 visible text line(s) of the published build are not in the candidate: "Vignettes", "Michigan · Colonel Henry Morrow · 73% casualties", "New York · Colonel Edward Fowler · 42.5% casualties", "New York · Colonel George Biddle · 41.1% casualties", "New York · Lieutenant Colonel Francis Miller · 55.5 |
| control-missing | search@390 | 3 control(s) of the published build have no counterpart in the candidate: "input\|\|Search regiments, vignettes, locations… (e.g. '20th Maine', 'Wheatfield', 'Cushi", "button\|\|Vignettes", "a\|\|REGIMENT · UNION 107th New York Volunteer Infantry New York · Colonel Nixon Van " |
| screenshot-differs | search@390 | 7.471% of pixels differ (limit 0.20%); page size 390x3498 -> 390x3740; bbox [13,5,370,3494]; worst regions [[49,2915,98,3498],[49,2332,98,2915],[49,1166,98,1749]]; images: docs\accept\r1\pass-103-artifacts\regression\search@390.{baseline,candidate,diff}.png |
| text-missing | terms@1440 | 2 visible text line(s) of the published build are not in the candidate: "Unit positions, casualty figures, and troop strengths are compiled from publishe", "The site's design, the animation engine, and the written vignette scripts are th" |
| screenshot-differs | terms@1440 | 1.261% of pixels differ (limit 0.20%); page size 1425x1388 -> 1425x1436; bbox [360,674,1078,1306]; worst regions [[356,694,534,925],[356,925,534,1157],[534,694,713,925]]; images: docs\accept\r1\pass-103-artifacts\regression\terms@1440.{baseline,candidate,diff}.png |
| text-missing | terms@390 | 2 visible text line(s) of the published build are not in the candidate: "Unit positions, casualty figures, and troop strengths are compiled from publishe", "The site's design, the animation engine, and the written vignette scripts are th" |
| screenshot-differs | terms@390 | 1.172% of pixels differ (limit 0.20%); page size 390x1872 -> 390x1915; bbox [20,929,364,1785]; worst regions [[244,936,293,1248],[98,936,146,1248],[49,936,98,1248]]; images: docs\accept\r1\pass-103-artifacts\regression\terms@390.{baseline,candidate,diff}.png |
| text-missing | turning-points@1440 | 11 visible text line(s) of the published build are not in the candidate: "DAY 1 · MORNING · MCPHERSON'S RIDGE", "Brigadier General John Buford chose to dismount his two cavalry brigades and fig", "Historians broadly agree this was the single most consequential tactical choice ", "DAY 1 · LATE AFTERN |
| control-missing | turning-points@1440 | 9 control(s) of the published build have no counterpart in the candidate: "summary\|\|1 DAY 1 · MORNING · MCPHERSON'S RIDGE Buford's Decision to Stand ▾", "summary\|\|2 DAY 1 · LATE AFTERNOON · CEMETERY HILL Ewell's Discretion on Cemetery Hill ▾", "summary\|\|3 DAY 2 · AFTERNOON · SEMINARY RIDGE / E |
| screenshot-differs | turning-points@1440 | 4.510% of pixels differ (limit 0.20%); page size 1425x1608 -> 1425x2168; bbox [72,5,1366,1578]; worst regions [[534,268,713,536],[713,268,891,536],[534,536,713,804]]; images: docs\accept\r1\pass-103-artifacts\regression\turning-points@1440.{baseline,candidate,diff}.png |
| text-missing | turning-points@390 | 11 visible text line(s) of the published build are not in the candidate: "DAY 1 · MORNING · MCPHERSON'S RIDGE", "Brigadier General John Buford chose to dismount his two cavalry brigades and fig", "Historians broadly agree this was the single most consequential tactical choice ", "DAY 1 · LATE AFTERN |
| control-missing | turning-points@390 | 9 control(s) of the published build have no counterpart in the candidate: "summary\|\|1 DAY 1 · MORNING · MCPHERSON'S RIDGE Buford's Decision to Stand ▾", "summary\|\|2 DAY 1 · LATE AFTERNOON · CEMETERY HILL Ewell's Discretion on Cemetery Hill ▾", "summary\|\|3 DAY 2 · AFTERNOON · SEMINARY RIDGE / E |
| screenshot-differs | turning-points@390 | 8.290% of pixels differ (limit 0.20%); page size 390x2134 -> 390x2678; bbox [13,5,369,2116]; worst regions [[49,356,98,711],[98,356,146,711],[146,356,195,711]]; images: docs\accept\r1\pass-103-artifacts\regression\turning-points@390.{baseline,candidate,diff}.png |
| text-missing | camera@1440 | 2 visible text line(s) of the published build are not in the candidate: "Director Mode auto-flies to wherever the most units are engaged, each tick. Foll", "Tick 1 / 675" |
| screenshot-differs | camera@1440 | 59.170% of pixels differ (limit 0.20%); page size 1425x948 -> 1425x937; bbox [0,5,1424,907]; worst regions [[0,312,178,469],[0,469,178,625],[0,625,178,781]]; images: docs\accept\r1\pass-103-artifacts\regression\camera@1440.{baseline,candidate,diff}.png |
| text-missing | cinematic-export@1440 | 3 visible text line(s) of the published build are not in the candidate: "Cinematic Export", "START TICK", "END TICK" |
| screenshot-differs | cinematic-export@1440 | 1.107% of pixels differ (limit 0.20%); page size 1425x980 -> 1425x985; bbox [0,5,1424,954]; worst regions [[534,653,713,817],[178,0,356,163],[0,0,178,163]]; images: docs\accept\r1\pass-103-artifacts\regression\cinematic-export@1440.{baseline,candidate,diff}.png |
| text-missing | compare@1440 | 5 visible text line(s) of the published build are not in the candidate: "Set each map to a different tick and compare unit positions side by side — e.g. ", "Tick 60", "9:55am", "Tick 300", "11:10am" |
| screenshot-differs | compare@1440 | 2.433% of pixels differ (limit 0.20%); page size 1425x956 -> 1425x962; bbox [27,5,1424,931]; worst regions [[178,159,356,319],[356,159,534,319],[0,159,178,319]]; images: docs\accept\r1\pass-103-artifacts\regression\compare@1440.{baseline,candidate,diff}.png |
| text-missing | ground-remembers@1440 | 4 visible text line(s) of the published build are not in the candidate: "Every recorded unit position across all 675 five-minute snapshots, accumulated i", "Built from the same 694 recorded unit positions that drive the main map's playba", "Reveal through tick", "675" |
| screenshot-differs | ground-remembers@1440 | 1.577% of pixels differ (limit 0.20%); page size 1425x1026 -> 1425x1019; bbox [72,5,1424,988]; worst regions [[0,170,178,340],[178,170,356,340],[356,170,534,340]]; images: docs\accept\r1\pass-103-artifacts\regression\ground-remembers@1440.{baseline,candidate,diff}.png |
| text-missing | immersive@1440 | 2 visible text line(s) of the published build are not in the candidate: "All audio here is synthesized in real time with the Web Audio API (no recorded s", "Tick 1 / 675" |
| screenshot-differs | immersive@1440 | 1.665% of pixels differ (limit 0.20%); page size 1425x990 -> 1425x983; bbox [72,5,1424,952]; worst regions [[713,492,891,655],[534,492,713,655],[0,819,178,983]]; images: docs\accept\r1\pass-103-artifacts\regression\immersive@1440.{baseline,candidate,diff}.png |
| text-missing | index@1440 | 34 visible text line(s) of the published build are not in the candidate: "Extra Features", "July 1, 6:00 AM", "Download Website Tutorial PDF", "Disposition", "Sides", "Size" |
| control-missing | index@1440 | 8 control(s) of the published build have no counterpart in the candidate: "button\|\|Hide Extra Features menu", "button\|\|Extra Features ▾", "a\|\|Download Website Tutorial PDF", "button\|\|Disposition", "button\|\|Sides", "button\|\|Size" |
| screenshot-differs | index@1440 | 7.766% of pixels differ (limit 0.20%); bbox [0,8,1425,893]; worst regions [[540,750,720,900],[360,750,540,900],[1260,750,1440,900]]; images: docs\accept\r1\pass-103-artifacts\regression\index@1440.{baseline,candidate,diff}.png |
| text-missing | index@390 | 33 visible text line(s) of the published build are not in the candidate: "Extra Features", "6:00 AM", "Tick 1/675", "Disposition", "Sides", "Size" |
| control-missing | index@390 | 12 control(s) of the published build have no counterpart in the candidate: "button\|\|Hide Extra Features menu", "a\|\|Ask the Historian", "button\|\|Extra Features ▾", "button\|\|◀", "button\|\|▶", "button\|\|Disposition" |
| screenshot-differs | index@390 | 9.166% of pixels differ (limit 0.20%); bbox [0,10,389,822]; worst regions [[98,141,146,281],[49,141,98,281],[244,703,293,844]]; images: docs\accept\r1\pass-103-artifacts\regression\index@390.{baseline,candidate,diff}.png |
| text-missing | sandbox@1440 | 3 visible text line(s) of the published build are not in the candidate: "Day 2, mid-afternoon (tick 260) -- before Longstreet's assault", "Day 3, ~3:00pm (tick 553) -- moments before Pickett's Charge reaches the wall", "Day 1, mid-morning (tick 62) -- I Corps holding McPherson's Ridge" |
| control-missing | sandbox@1440 | 1 control(s) of the published build have no counterpart in the candidate: "select\|\|Day 2, mid-afternoon (tick 260) -- before Longstreet's assault Day 3, ~3:00pm (t" |
| screenshot-differs | sandbox@1440 | 2.947% of pixels differ (limit 0.20%); page size 1425x1093 -> 1425x1107; bbox [0,5,1424,1076]; worst regions [[0,0,178,182],[178,0,356,182],[1069,0,1247,182]]; images: docs\accept\r1\pass-103-artifacts\regression\sandbox@1440.{baseline,candidate,diff}.png |
| ... | | 5 more in pass-103.json |

<details><summary>Notes (information, not defects)</summary>

- waived:file-missing @ diagnostics.html: diagnostics.html is on the published build and not in the candidate -- WAIVED: Developer page removed on purpose (see the route waiver above). (design of the R1a+ trains (verify_release V3), 2026-09-30)
- waived:file-missing @ unit-rendering-reference.html: unit-rendering-reference.html is on the published build and not in the candidate -- WAIVED: Developer page removed on purpose (see the route waiver above). (design of the R1a+ trains (verify_release V3), 2026-09-30)
- files-added @ -: data/moments.json, google0dca4879c9657741.html, icons/gettysburg-192.png, icons/gettysburg-512.png, icons/gettysburg-maskable-192.png, icons/gettysburg-maskable-512.png, img/gettysburg-from-the-west-1863.jpg, img/round-top-breastworks-july-1863.jpg, img/trostle-farm-july-1863.jpg, og/gettysburg-card
- data-changed-not-worse @ data/density_cavalry_detail.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day1_afternoon.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day1_barlowsknoll.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day1_seminary.json: content differs, nothing removed or shrunk
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
- data-changed-not-worse @ data/density_day3_culpshill.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day3_morning.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day3_pettigrew.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day3_picketts_charge.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/density_day3_vermont.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/oob/commander_successions.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/oob/confederate_cavalry.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/oob/confederate_oob_corps_div_bde.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/oob/union_oob_corps_division.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/placements_day3_ticks451_520.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/placements_day3_ticks521_600.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/terrain.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/vignettes_part1.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/vignettes_part2.json: content differs, nothing removed or shrunk
- data-changed-not-worse @ data/vignettes_part3.json: content differs, nothing removed or shrunk
- waived:route-missing @ /diagnostics: route /diagnostics exists on the published build and not in the candidate -- WAIVED: Developer page removed on purpose: _redirects force-404s /diagnostics and /diagnostics.html (see the generated _redirects of every train; tools/t0/verify_release.mjs check V3 asserts it). (design of the R1a+ trains 
- waived:route-missing @ /unit-rendering-reference: route /unit-rendering-reference exists on the published build and not in the candidate -- WAIVED: Developer page removed on purpose: _redirects force-404s it (verify_release V3). (design of the R1a+ trains (verify_release V3), 2026-09-30)
- text-added @ aftermath@1440: 2 new line(s): "Unlike the main animated map, this timeline is general narra", "The Trostle farmhouse (catalogued as “Trossel’s (Trostle’s) "
- text-added @ aftermath@390: 2 new line(s): "Unlike the main animated map, this timeline is general narra", "The Trostle farmhouse (catalogued as “Trossel’s (Trostle’s) "
- text-added @ ar@1440: 1 new line(s): "Beta. Battlefield AR needs a phone with a camera, GPS and co"
- text-added @ ar@390: 1 new line(s): "Beta. Battlefield AR needs a phone with a camera, GPS and co"
- text-added @ dashboard@1440: 22 new line(s): "Corps-by-corps effective strength over the course of the bat", "These curves are modeled from each corps' recorded engagemen", "(49.6% casualties)", "(5.1% casualties)"
- text-added @ dashboard@390: 22 new line(s): "Corps-by-corps effective strength over the course of the bat", "These curves are modeled from each corps' recorded engagemen", "(49.6% casualties)", "(5.1% casualties)"
- text-added @ documentary@1440: 2 new line(s): "WED, JULY 1 · ABOUT 7:30 AM · KNOXLYN RIDGE, WEST OF GETTYSB", "Buford's pickets west of Gettysburg watched Heth's division "
- text-added @ documentary@390: 2 new line(s): "WED, JULY 1 · ABOUT 7:30 AM · KNOXLYN RIDGE, WEST OF GETTYSB", "Buford's pickets west of Gettysburg watched Heth's division "
- text-added @ education@1440: 13 new line(s): "Gettysburg from the west, photographed in 1863 by Timothy H.", "Wed, July 1 · about 7:30 AM", "About 7:30 a.m. on July 1, 1863, Lieutenant Marcellus Jones ", "Wed, July 1 · about 10:15 AM"
- text-added @ education@390: 13 new line(s): "Gettysburg from the west, photographed in 1863 by Timothy H.", "Wed, July 1 · about 7:30 AM", "About 7:30 a.m. on July 1, 1863, Lieutenant Marcellus Jones ", "Wed, July 1 · about 10:15 AM"
- text-added @ embed@1440: 1 new line(s): "Gordon's brigade broke Barlow's division on the knoll north "
- text-added @ embed@390: 1 new line(s): "Gordon's brigade broke Barlow's division on the knoll north "
- text-added @ find-ancestor@1440: 1 new line(s): "Search by state, or by a commander's surname, to narrow down"
- text-added @ find-ancestor@390: 1 new line(s): "Search by state, or by a commander's surname, to narrow down"
- text-added @ historian@1440: 1 new line(s): "Answers come only from this site's own records (466 regiment"
- text-added @ historian@390: 1 new line(s): "Answers come only from this site's own records (466 regiment"
- text-added @ living-ledger@1440: 2 new line(s): "JULY 1, ABOUT 5:00 AM", "MODELLED RUNNING TOTAL OF CASUALTIES, BOTH ARMIES (OFFICIAL "
- text-added @ living-ledger@390: 2 new line(s): "JULY 1, ABOUT 5:00 AM", "MODELLED RUNNING TOTAL OF CASUALTIES, BOTH ARMIES (OFFICIAL "
- text-added @ regiment@1440: 1 new line(s): "Pick any regiment or battery and follow its whole three-day "

</details>

Raw outputs: the machine-readable `raw` sections of the JSON file of this pass, and the files in `pass-103-artifacts/` (screenshots, diffs, tool output).
