# Acceptance pass 104: DEFECTS (incomplete)

Started 2026-10-20T12:02:21.796Z, finished 2026-10-20T12:31:44.523Z.

| | |
|---|---|
| Candidate | `tmp\r1\r1-cand.zip` (zip) |
| Candidate SHA-256 | `1af54cb0586a60dddf0072d601c10d5ff51b21b154a736ae05dadcb4e63877d3` |
| Tree digest (sha256 of path+hash list) | `9f2bfc51298d35c0132c13d1cbe828106e4b4c7d064c7c1bb590d4670c0d2061` |
| Files | 2013 |
| Baseline (published build) | `baseline\dist` |
| Harness digest | `cd0c5dbcf775d7210283ca348cdc7a6fc5d825388527ebbf1e2881773ff4a76a` (31 files) |
| Node / Python | v24.19.0 / Python 3.11.9 |
| Chrome | Chrome/155.0.8059.82 |
| Playwright-core / axe-core | 1.63.0 / 4.13.0 |
| OS / CPU | Windows_NT 10.0.26200 x64; 16 x Intel(R) Core(TM) Ultra 7 265H; 34 GB |
| Repo HEAD | 17ba8ee789133164815e11c4f2e740de86524862 |
| Mapbox tile requests | 2229 of cap 20000 (cap-blocked 0) |
| Soak | 60 s |

A pass is CLEAN only if all eight checks RAN and found zero defects. A check that did not run is never a pass.

## Summary

| # | Check | Status | Defects | Notes | Time |
|---|---|---|---|---|---|
| 4 | Input matrix (desktop + phone) | RAN, DEFECTS | 14 | 231 | 1760 s |

## Check 4: Input matrix (desktop + phone)

Status: **RAN**. Defects: 14. Notes: 231.

Metrics:

```json
{
 "chrome": "Chrome/155.0.8059.82",
 "activations": {
  "desktop": {
   "app first-visit (onboarding)": {
    "total": 48,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 8
   },
   "/404": {
    "total": 1,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 2
   },
   "/aftermath": {
    "total": 9,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 11
   },
   "/ar": {
    "total": 9,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 6
   },
   "/camera": {
    "total": 18,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 21
   },
   "/cinematic-export": {
    "total": 25,
    "hidden": 5,
    "disabled": 0,
    "unnamed": 0,
    "activations": 23
   },
   "/compare": {
    "total": 32,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 49
   },
   "/dashboard": {
    "total": 22,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 43
   },
   "/documentary": {
    "total": 11,
    "hidden": 0,
    "disabled": 1,
    "unnamed": 0,
    "activations": 8
   },
   "/education": {
    "total": 18,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 24
   },
   "/embed": {
    "total": 2,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 0
   },
   "/find-ancestor": {
    "total": 43,
    "hidden": 32,
    "disabled": 0,
    "unnamed": 0,
    "activations": 6
   },
   "/ground-remembers": {
    "total": 17,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 17
   },
   "/historian": {
    "total": 15,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 22
   },
   "/immersive": {
    "total": 11,
    "hidden": 0,
    "disabled": 1,
    "unnamed": 0,
    "activations": 6
   },
   "app main": {
    "total": 47,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 116
   },
   "/living-ledger": {
    "total": 14,
    "hidden": 3,
    "disabled": 0,
    "unnamed": 0,
    "activations": 11
   },
   "/privacy": {
    "total": 4,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 0
   },
   "/regiment": {
    "total": 9,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 4
   },
   "/report": {
    "total": 9,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 4
   },
   "/sandbox": {
    "total": 21,
    "hidden": 3,
    "disabled": 0,
    "unnamed": 0,
    "activations": 20
   },
   "/search": {
    "total": 43,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 76
   },
   "/terms": {
    "total": 2,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 0
   },
   "/turning-points": {
    "total": 19,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 32
   },
   "/viewshed": {
    "total": 46,
    "hidden": 30,
    "disabled": 0,
    "unnamed": 0,
    "activations": 14
   },
   "/watch-together": {
    "total": 24,
    "hidden": 1,
    "disabled": 1,
    "unnamed": 0,
    "activations": 27
   }
  },
  "phone": {
   "app first-visit (onboarding)": {
    "total": 17,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 8
   },
   "/404": {
    "total": 1,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 2
   },
   "/aftermath": {
    "total": 9,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 10
   },
   "/ar": {
    "total": 9,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 4
   },
   "/camera": {
    "total": 15,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 16
   },
   "/cinematic-export": {
    "total": 22,
    "hidden": 5,
    "disabled": 0,
    "unnamed": 0,
    "activations": 16
   },
   "/compare": {
    "total": 26,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 38
   },
   "/dashboard": {
    "total": 22,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 28
   },
   "/documentary": {
    "total": 11,
    "hidden": 0,
    "disabled": 1,
    "unnamed": 0,
    "activations": 6
   },
   "/education": {
    "total": 18,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 28
   },
   "/embed": {
    "total": 2,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 0
   },
   "/find-ancestor": {
    "total": 43,
    "hidden": 32,
    "disabled": 0,
    "unnamed": 0,
    "activations": 4
   },
   "/ground-remembers": {
    "total": 15,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 14
   },
   "/historian": {
    "total": 15,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 15
   },
   "/immersive": {
    "total": 11,
    "hidden": 0,
    "disabled": 1,
    "unnamed": 0,
    "activations": 5
   },
   "app main": {
    "total": 14,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 24
   },
   "/living-ledger": {
    "total": 14,
    "hidden": 3,
    "disabled": 0,
    "unnamed": 0,
    "activations": 7
   },
   "/privacy": {
    "total": 4,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 0
   },
   "/regiment": {
    "total": 9,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 3
   },
   "/report": {
    "total": 9,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 3
   },
   "/sandbox": {
    "total": 18,
    "hidden": 3,
    "disabled": 0,
    "unnamed": 0,
    "activations": 15
   },
   "/search": {
    "total": 43,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 11
   },
   "/terms": {
    "total": 2,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 0
   },
   "/turning-points": {
    "total": 19,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 11
   },
   "/viewshed": {
    "total
```

Defects by code: long-task-during-interaction x8, slow-response x5, map-gesture-slow-start x1

| code | where | detail |
|---|---|---|
| long-task-during-interaction | desktop /immersive :: button "🔊 Enable Sound & Start" | click: long task(s) [51] ms (limit 50 ms) |
| long-task-during-interaction | desktop app main :: button "⊞" | click: long task(s) [80] ms (limit 50 ms) |
| slow-response | desktop app main :: button "July 2" | click: 106.6 ms from input to visible change (limit 100 ms; dom 3.3, paint 106.6, event timing 128) |
| long-task-during-interaction | desktop app main :: button "July 2" | click: long task(s) [88] ms (limit 50 ms) |
| slow-response | desktop app main :: button "July 3" | click: 183.5 ms from input to visible change (limit 100 ms; dom 2.6, paint 183.5, event timing 200) |
| long-task-during-interaction | desktop app main :: button "July 3" | click: long task(s) [173,125] ms (limit 50 ms) |
| slow-response | desktop app main :: slider "Battle time" | click: 156.9 ms from input to visible change (limit 100 ms; dom 2.2, paint 156.9, event timing 168) |
| long-task-during-interaction | desktop app main :: slider "Battle time" | click: long task(s) [147,99] ms (limit 50 ms) |
| long-task-during-interaction | phone /immersive :: button "🔊 Enable Sound & Start" | tap: long task(s) [54] ms (limit 50 ms) |
| slow-response | phone app main :: button "July 2" | tap: 189.9 ms from input to visible change (limit 100 ms; dom 4.3, paint 189.9, event timing 208) |
| long-task-during-interaction | phone app main :: button "July 2" | tap: long task(s) [164,110] ms (limit 50 ms) |
| slow-response | phone app main :: button "July 3" | tap: 171.7 ms from input to visible change (limit 100 ms; dom 6.6, paint 171.7, event timing 184) |
| long-task-during-interaction | phone app main :: button "July 3" | tap: long task(s) [147,133] ms (limit 50 ms) |
| map-gesture-slow-start | phone map one-finger swipe pan | 113 ms from input to the map starting to move (limit 100 ms) |

<details><summary>Notes (information, not defects)</summary>

- first-visit-modal-controls @ desktop app first-visit (onboarding): 4 controls are on top (the onboarding card); the other 44 are behind it and are exercised in the main state
- skip-link-keyboard-only @ desktop app first-visit (onboarding) :: link "Skip to the map": skip links are off-screen until focused; activated with Enter only
- skip-link-keyboard-only @ desktop app first-visit (onboarding) :: link "Skip to the timeline controls": skip links are off-screen until focused; activated with Enter only
- link-not-activated @ desktop /aftermath :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /aftermath :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- external-link-not-activated @ desktop /aftermath :: link "U.S. National Archives, ARC 533316": https://catalog.archives.gov/id/533316 (offline run)
- link-not-activated @ desktop /ar :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /ar :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /camera :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /camera :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- external-link-not-activated @ desktop /camera :: link "© Mapbox": https://www.mapbox.com/about/maps (offline run)
- external-link-not-activated @ desktop /camera :: link "© OpenStreetMap": https://www.openstreetmap.org/copyright/ (offline run)
- external-link-not-activated @ desktop /camera :: link "Improve this map": https://apps.mapbox.com/feedback/?owner=mapbox&id=satellite-v9&access_token=pk.eyJ1IjoibWxlZ2VyZTk3ODkiLCJhIjoiY21xcHptODEyMGJydDJycWFhaWY0ZHVsMCJ9.aJvnELJlXEs3nYrWx4Eg5Q#/-77.3089/39.82055/13.55 (offline run)
- external-link-not-activated @ desktop /camera :: link "© Maxar": https://www.maxar.com/ (offline run)
- repeat-activation-no-change @ desktop /cinematic-export :: combobox "DURATION": arrow: the control received the activation but nothing visible changed (an earlier mode did change something; repeated input is idempotent?)
- repeat-activation-no-change @ desktop /cinematic-export :: combobox "CAPTIONS": arrow: the control received the activation but nothing visible changed (an earlier mode did change something; repeated input is idempotent?)
- link-not-activated @ desktop /cinematic-export :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /cinematic-export :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- external-link-not-activated @ desktop /cinematic-export :: link "© Mapbox": https://www.mapbox.com/about/maps (offline run)
- external-link-not-activated @ desktop /cinematic-export :: link "© OpenStreetMap": https://www.openstreetmap.org/copyright/ (offline run)
- external-link-not-activated @ desktop /cinematic-export :: link "Improve this map": https://apps.mapbox.com/feedback/?owner=mapbox&id=satellite-v9&access_token=pk.eyJ1IjoibWxlZ2VyZTk3ODkiLCJhIjoiY21xcHptODEyMGJydDJycWFhaWY0ZHVsMCJ9.aJvnELJlXEs3nYrWx4Eg5Q#/-77.235/39.81/13 (offline run)
- external-link-not-activated @ desktop /cinematic-export :: link "© Maxar": https://www.maxar.com/ (offline run)
- link-not-activated @ desktop /compare :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /compare :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- external-link-not-activated @ desktop /compare :: link "© Mapbox": https://www.mapbox.com/about/maps (offline run)
- external-link-not-activated @ desktop /compare :: link "© OpenStreetMap": https://www.openstreetmap.org/copyright/ (offline run)
- external-link-not-activated @ desktop /compare :: link "Improve this map": https://apps.mapbox.com/feedback/?owner=mapbox&id=satellite-v9&access_token=pk.eyJ1IjoibWxlZ2VyZTk3ODkiLCJhIjoiY21xcHptODEyMGJydDJycWFhaWY0ZHVsMCJ9.aJvnELJlXEs3nYrWx4Eg5Q#/-77.235/39.81/13 (offline run)
- external-link-not-activated @ desktop /compare :: link "© Maxar": https://www.maxar.com/ (offline run)
- external-link-not-activated @ desktop /compare :: link "© Mapbox": https://www.mapbox.com/about/maps (offline run)
- external-link-not-activated @ desktop /compare :: link "© OpenStreetMap": https://www.openstreetmap.org/copyright/ (offline run)
- external-link-not-activated @ desktop /compare :: link "Improve this map": https://apps.mapbox.com/feedback/?owner=mapbox&id=satellite-v9&access_token=pk.eyJ1IjoibWxlZ2VyZTk3ODkiLCJhIjoiY21xcHptODEyMGJydDJycWFhaWY0ZHVsMCJ9.aJvnELJlXEs3nYrWx4Eg5Q#/-77.235/39.81/13 (offline run)
- external-link-not-activated @ desktop /compare :: link "© Maxar": https://www.maxar.com/ (offline run)
- link-not-activated @ desktop /dashboard :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /dashboard :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /documentary :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /documentary :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- disabled-control-skipped @ desktop /documentary: button "← Previous"
- link-not-activated @ desktop /education :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /education :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- external-link-not-activated @ desktop /education :: link "The Metropolitan Museum of Art, 33.65.394": https://www.metmuseum.org/art/collection/search/268205 (offline run)
- external-link-not-activated @ desktop /embed :: link "Explore the full animated map →": https://gettysburginteractivemap.com/index.html?tick=57&vignette=V-006 (offline run)
- external-link-not-activated @ desktop /embed :: link "gettysburginteractivemap.com": https://gettysburginteractivemap.com/ (offline run)
- link-not-activated @ desktop /find-ancestor :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /find-ancestor :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- external-link-not-activated @ desktop /find-ancestor :: link "Civil War Soldiers and Sailors System": https://www.nps.gov/civilwar/soldiers-and-sailors-database.htm (offline run)
- link-not-activated @ desktop /ground-remembers :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /ground-remembers :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- external-link-not-activated @ desktop /ground-remembers :: link "Mapbox homepage": https://www.mapbox.com/ (offline run)
- external-link-not-activated @ desktop /ground-remembers :: link "© Mapbox": https://www.mapbox.com/about/maps (offline run)
- external-link-not-activated @ desktop /ground-remembers :: link "© OpenStreetMap": https://www.openstreetmap.org/copyright/ (offline run)
- external-link-not-activated @ desktop /ground-remembers :: link "Improve this map": https://apps.mapbox.com/feedback/?owner=mapbox&id=dark-v11&access_token=pk.eyJ1IjoibWxlZ2VyZTk3ODkiLCJhIjoiY21xcHptODEyMGJydDJycWFhaWY0ZHVsMCJ9.aJvnELJlXEs3nYrWx4Eg5Q#/-77.235/39.81/13 (offline run)
- link-not-activated @ desktop /historian :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /historian :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- disabled-control-skipped @ desktop /immersive: button "▶ Play"
- repeat-activation-no-change @ desktop /immersive :: slider "Volume": arrow: the control received the activation but nothing visible changed (an earlier mode did change something; repeated input is idempotent?)
- link-not-activated @ desktop /immersive :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /immersive :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- control-gone-after-activation @ desktop /immersive :: button "🔊 Enable Sound & Start": the control is no longer shown after click (a dismiss/close control or a state change); enter not applicable
- skip-link-keyboard-only @ desktop app main :: link "Skip to the map": skip links are off-screen until focused; activated with Enter only
- skip-link-keyboard-only @ desktop app main :: link "Skip to the timeline controls": skip links are off-screen until focused; activated with Enter only

</details>

Raw outputs: the machine-readable `raw` sections of the JSON file of this pass, and the files in `pass-104-artifacts/` (screenshots, diffs, tool output).
