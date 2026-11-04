# Acceptance pass 107: DEFECTS (incomplete)

Started 2026-10-20T12:02:21.826Z, finished 2026-10-20T12:09:47.482Z.

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
| Mapbox tile requests | 512 of cap 20000 (cap-blocked 0) |
| Soak | 60 s |

A pass is CLEAN only if all eight checks RAN and found zero defects. A check that did not run is never a pass.

## Summary

| # | Check | Status | Defects | Notes | Time |
|---|---|---|---|---|---|
| 7 | Visual QA at six widths | RAN, DEFECTS | 24 | 123 | 443 s |

## Check 7: Visual QA at six widths

Status: **RAN**. Defects: 24. Notes: 123.

Metrics:

```json
{
 "chrome": "Chrome/155.0.8059.82",
 "pagesAnalysed": 152,
 "widths": [
  360,
  390,
  768,
  1024,
  1440,
  1920
 ],
 "tilesSkipped": 0,
 "thresholdsUsed": {
  "tapTargetMinPx": 44,
  "appliesUpToWidth": 1024,
  "pointerTargetMinPx": 24,
  "minTextPx": 12,
  "layoutShiftMax": 0.1
 }
}
```

Defects by code: text-too-small x24

| code | where | detail |
|---|---|---|
| text-too-small | /cinematic-export @360px | small#start-time "July 3, about 3:05 PM" is 10.8333px (minimum 12) |
| text-too-small | /cinematic-export @360px | small#end-time "July 3, about 6:05 PM" is 10.8333px (minimum 12) |
| text-too-small | /cinematic-export @390px | small#start-time "July 3, about 3:05 PM" is 10.8333px (minimum 12) |
| text-too-small | /cinematic-export @390px | small#end-time "July 3, about 6:05 PM" is 10.8333px (minimum 12) |
| text-too-small | /cinematic-export @768px | small#start-time "July 3, about 3:05 PM" is 10.8333px (minimum 12) |
| text-too-small | /cinematic-export @768px | small#end-time "July 3, about 6:05 PM" is 10.8333px (minimum 12) |
| text-too-small | /cinematic-export @1024px | small#start-time "July 3, about 3:05 PM" is 10.8333px (minimum 12) |
| text-too-small | /cinematic-export @1024px | small#end-time "July 3, about 6:05 PM" is 10.8333px (minimum 12) |
| text-too-small | /cinematic-export @1440px | small#start-time "July 3, about 3:05 PM" is 10.8333px (minimum 12) |
| text-too-small | /cinematic-export @1440px | small#end-time "July 3, about 6:05 PM" is 10.8333px (minimum 12) |
| text-too-small | /cinematic-export @1920px | small#start-time "July 3, about 3:05 PM" is 10.8333px (minimum 12) |
| text-too-small | /cinematic-export @1920px | small#end-time "July 3, about 6:05 PM" is 10.8333px (minimum 12) |
| text-too-small | / @360px | p.gtb63-label "Reconstruction of July 1863 (USGS imager" is 11px (minimum 12) |
| text-too-small | / @360px | button.gtb63-btn "Show what was changed" is 11px (minimum 12) |
| text-too-small | / @360px | a.gtb63-link "Sources and licences" is 11px (minimum 12) |
| text-too-small | / @390px | p.gtb63-label "Reconstruction of July 1863 (USGS imager" is 11px (minimum 12) |
| text-too-small | / @390px | button.gtb63-btn "Show what was changed" is 11px (minimum 12) |
| text-too-small | / @390px | a.gtb63-link "Sources and licences" is 11px (minimum 12) |
| text-too-small | / @768px | p.gtb63-label "Reconstruction of July 1863 (USGS imager" is 11px (minimum 12) |
| text-too-small | / @768px | button.gtb63-btn "Show what was changed" is 11px (minimum 12) |
| text-too-small | / @768px | a.gtb63-link "Sources and licences" is 11px (minimum 12) |
| text-too-small | / (first visit, onboarding modal) @360px | p.gtb63-label "Reconstruction of July 1863 (USGS imager" is 11px (minimum 12) |
| text-too-small | / (first visit, onboarding modal) @360px | button.gtb63-btn "Show what was changed" is 11px (minimum 12) |
| text-too-small | / (first visit, onboarding modal) @360px | a.gtb63-link "Sources and licences" is 11px (minimum 12) |

<details><summary>Notes (information, not defects)</summary>

- third-party-small-target @ /camera @360px: 1 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24
- third-party-small-target @ /camera @390px: 1 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24
- third-party-small-target @ /camera @768px: 4 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- axe-contrast-incomplete @ /camera @768px: 4 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /camera @1024px: 4 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- axe-contrast-incomplete @ /camera @1024px: 4 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /camera @1440px: 4 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- layout-shift-below-limit @ /camera @1440px: CLS 0.0061
- axe-contrast-incomplete @ /camera @1440px: 4 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /camera @1920px: 4 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- layout-shift-below-limit @ /camera @1920px: CLS 0.0028
- axe-contrast-incomplete @ /camera @1920px: 4 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /cinematic-export @360px: 1 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24
- third-party-small-target @ /cinematic-export @390px: 1 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24
- third-party-small-target @ /cinematic-export @768px: 4 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- axe-contrast-incomplete @ /cinematic-export @768px: 4 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /cinematic-export @1024px: 4 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- axe-contrast-incomplete @ /cinematic-export @1024px: 4 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /cinematic-export @1440px: 4 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- layout-shift-below-limit @ /cinematic-export @1440px: CLS 0.0065
- axe-contrast-incomplete @ /cinematic-export @1440px: 4 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /cinematic-export @1920px: 4 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- layout-shift-below-limit @ /cinematic-export @1920px: CLS 0.0041
- axe-contrast-incomplete @ /cinematic-export @1920px: 4 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /compare @360px: 2 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, button.mapboxgl-ctrl-attrib-button 24x24
- third-party-small-target @ /compare @390px: 2 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, button.mapboxgl-ctrl-attrib-button 24x24
- third-party-small-target @ /compare @768px: 2 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, button.mapboxgl-ctrl-attrib-button 24x24
- axe-contrast-incomplete @ /compare @768px: 16 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /compare @1024px: 2 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, button.mapboxgl-ctrl-attrib-button 24x24
- axe-contrast-incomplete @ /compare @1024px: 16 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /compare @1440px: 8 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- layout-shift-below-limit @ /compare @1440px: CLS 0.0123
- axe-contrast-incomplete @ /compare @1440px: 24 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /compare @1920px: 8 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- layout-shift-below-limit @ /compare @1920px: CLS 0.0056
- axe-contrast-incomplete @ /compare @1920px: 24 node(s) axe could not decide (background image/gradient/overlap)
- axe-contrast-incomplete @ /dashboard @360px: 12 node(s) axe could not decide (background image/gradient/overlap)
- axe-contrast-incomplete @ /dashboard @390px: 12 node(s) axe could not decide (background image/gradient/overlap)
- axe-contrast-incomplete @ /dashboard @768px: 12 node(s) axe could not decide (background image/gradient/overlap)
- axe-contrast-incomplete @ /dashboard @1024px: 12 node(s) axe could not decide (background image/gradient/overlap)
- axe-contrast-incomplete @ /dashboard @1440px: 12 node(s) axe could not decide (background image/gradient/overlap)
- axe-contrast-incomplete @ /dashboard @1920px: 12 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /ground-remembers @360px: 2 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, a.mapboxgl-ctrl-logo 88x23
- third-party-small-target @ /ground-remembers @390px: 2 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, a.mapboxgl-ctrl-logo 88x23
- third-party-small-target @ /ground-remembers @768px: 4 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- axe-contrast-incomplete @ /ground-remembers @768px: 3 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /ground-remembers @1024px: 4 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- axe-contrast-incomplete @ /ground-remembers @1024px: 3 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /ground-remembers @1440px: 4 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- layout-shift-below-limit @ /ground-remembers @1440px: CLS 0.0038
- axe-contrast-incomplete @ /ground-remembers @1440px: 3 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /ground-remembers @1920px: 4 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- layout-shift-below-limit @ /ground-remembers @1920px: CLS 0.0025
- axe-contrast-incomplete @ /ground-remembers @1920px: 3 node(s) axe could not decide (background image/gradient/overlap)
- layout-shift-below-limit @ /historian @1440px: CLS 0.0052
- layout-shift-below-limit @ /historian @1920px: CLS 0.0031
- third-party-small-target @ /immersive @360px: 1 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24
- third-party-small-target @ /immersive @390px: 1 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24
- third-party-small-target @ /immersive @768px: 4 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- third-party-small-target @ /immersive @1024px: 4 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14

</details>

Raw outputs: the machine-readable `raw` sections of the JSON file of this pass, and the files in `pass-107-artifacts/` (screenshots, diffs, tool output).
