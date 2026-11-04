# Acceptance pass 1: CLEAN

Started 2026-11-01T12:32:03.661Z, finished 2026-11-01T13:52:13.797Z.

| | |
|---|---|
| Candidate | `deliver\gettysburg-R1f-5f898a66-PRODUCTION.zip` (zip) |
| Candidate SHA-256 | `a36f288381bd8e40f328ab4a1d1787355f378cfa54c10897ba8f7a86606e368c` |
| Tree digest (sha256 of path+hash list) | `b7d36dd9fcdda347b874cf03e60db1e469145bc057d9f991e0ad446cb35468f5` |
| Files | 2013 |
| Baseline (published build) | `baseline\dist` |
| Harness digest | `15bdf47844bd33d842e890b12a0f93904226c60a560ef0a629a43ef9552f4d2a` (34 files) |
| Node / Python | v24.19.0 / Python 3.11.9 |
| Chrome | Chrome/156.0.8078.76 |
| Playwright-core / axe-core | 1.63.0 / 4.13.0 |
| OS / CPU | Windows_NT 10.0.26200 x64; 16 x Intel(R) Core(TM) Ultra 7 265H; 34 GB |
| Repo HEAD | 17ba8ee789133164815e11c4f2e740de86524862 |
| Mapbox tile requests | 3706 of cap 20000 (cap-blocked 0) |
| Soak | 600 s |

A pass is CLEAN only if all eight checks RAN and found zero defects. A check that did not run is never a pass.

## Summary

| # | Check | Status | Defects | Notes | Time |
|---|---|---|---|---|---|
| 1 | Deterministic zip (hash equals the previous pass) | RAN, clean | 0 | 2 | 2 s |
| 2 | Static hygiene | RAN, clean | 0 | 6 | 72 s |
| 3 | Regression against the published build | RAN, clean | 0 | 216 | 248 s |
| 4 | Input matrix (desktop + phone) | RAN, clean | 0 | 244 | 1762 s |
| 5 | Performance | RAN, clean | 0 | 0 | 919 s |
| 6 | Accuracy (verify_release + test subset) | RAN, clean | 0 | 2 | 1350 s |
| 7 | Visual QA at six widths | RAN, clean | 0 | 123 | 454 s |
| 8 | Copy audit | RAN, clean | 0 | 3 | 3 s |

## Check 1: Deterministic zip (hash equals the previous pass)

Status: **RAN**. Defects: 0. Notes: 2.

Commands:

- `python tools/ship/pack_zip.py --train R1f --out C:\Users\mlege\gettysburg-map\tmp\accept-scratch\accept-pass1-33760-mvxt7wb1-5b6b1f\repack.zip` -> exit 0 in 1.6 s

Metrics:

```json
{
 "candidateSha256": "a36f288381bd8e40f328ab4a1d1787355f378cfa54c10897ba8f7a86606e368c",
 "bytes": 40018590,
 "entries": 2013,
 "comparedAgainst": [
  "gettysburg-R1f-5f898a66-PRODUCTION.zip.sha256"
 ],
 "repackSha256": "a36f288381bd8e40f328ab4a1d1787355f378cfa54c10897ba8f7a86606e368c"
}
```

<details><summary>Notes (information, not defects)</summary>

- zip-hash-equal @ gettysburg-R1f-5f898a66-PRODUCTION.zip.sha256: equals gettysburg-R1f-5f898a66-PRODUCTION.zip.sha256
- repack-identical @ release/R1f/dist: a fresh pack of the built dist is byte-identical to the candidate

</details>

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
  "inlineScripts": 59,
  "inlineStyles": 41
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
 "chrome": "Chrome/156.0.8078.76",
 "mapLoads": {
  "routes": 9,
  "tileRequestsSeen": 122,
  "statuses": {
   "200": 122,
   "204": 30
  },
  "refererInjected": 122,
  "skus": 10
 },
 "routes": 25,
 "serviceWorker": {
  "install": {
   "scope": "http://127.0.0.1:8700/",
   "active": "http://127.0.0.1:8700/sw.js",
   "state": "activated"
  },
  "afterReload": {
   "controller": "http://127.0.0.1:8700/sw.js",
   "caches": [
    "gbg-r0-5f898a66",
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
    "gbg-r0-5f898a66-acceptance-update"
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

Status: **RAN**. Defects: 0. Notes: 216.

Metrics:

```json
{
 "waiversLoaded": 65,
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
 "chrome": "Chrome/156.0.8078.76"
}
```

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

## Check 4: Input matrix (desktop + phone)

Status: **RAN**. Defects: 0. Notes: 244.

Metrics:

```json
{
 "chrome": "Chrome/156.0.8078.76",
 "activations": {
  "desktop": {
   "app first-visit (onboarding)": {
    "total": 50,
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
    "total": 19,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 21
   },
   "/cinematic-export": {
    "total": 26,
    "hidden": 5,
    "disabled": 0,
    "unnamed": 0,
    "activations": 23
   },
   "/compare": {
    "total": 34,
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
    "total": 49,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 115
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
    "total": 22,
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
    "total": 47,
    "hidden": 30,
    "disabled": 0,
    "unnamed": 0,
    "activations": 14
   },
   "/watch-together": {
    "total": 25,
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
    "total": 16,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 16
   },
   "/cinematic-export": {
    "total": 23,
    "hidden": 5,
    "disabled": 0,
    "unnamed": 0,
    "activations": 16
   },
   "/compare": {
    "total": 28,
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
    "total": 19,
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

<details><summary>Notes (information, not defects)</summary>

- first-visit-modal-controls @ desktop app first-visit (onboarding): 4 controls are on top (the onboarding card); the other 46 are behind it and are exercised in the main state
- skip-link-keyboard-only @ desktop app first-visit (onboarding) :: link "Skip to the map": skip links are off-screen until focused; activated with Enter only
- skip-link-keyboard-only @ desktop app first-visit (onboarding) :: link "Skip to the timeline controls": skip links are off-screen until focused; activated with Enter only
- link-not-activated @ desktop /aftermath :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /aftermath :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- external-link-not-activated @ desktop /aftermath :: link "U.S. National Archives, ARC 533316": https://catalog.archives.gov/id/533316 (offline run)
- link-not-activated @ desktop /ar :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /ar :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /camera :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /camera :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- external-link-not-activated @ desktop /camera :: link "Mapbox homepage": https://www.mapbox.com/ (offline run)
- external-link-not-activated @ desktop /camera :: link "© Mapbox": https://www.mapbox.com/about/maps (offline run)
- external-link-not-activated @ desktop /camera :: link "© OpenStreetMap": https://www.openstreetmap.org/copyright/ (offline run)
- external-link-not-activated @ desktop /camera :: link "Improve this map": https://apps.mapbox.com/feedback/?owner=mapbox&id=satellite-v9&access_token=pk.eyJ1IjoibWxlZ2VyZTk3ODkiLCJhIjoiY21xcHptODEyMGJydDJycWFhaWY0ZHVsMCJ9.aJvnELJlXEs3nYrWx4Eg5Q#/-77.3089/39.82055/13.55 (offline run)
- external-link-not-activated @ desktop /camera :: link "© Maxar": https://www.maxar.com/ (offline run)
- repeat-activation-no-change @ desktop /cinematic-export :: combobox "DURATION": arrow: the control received the activation but nothing visible changed (an earlier mode did change something; repeated input is idempotent?)
- repeat-activation-no-change @ desktop /cinematic-export :: combobox "CAPTIONS": arrow: the control received the activation but nothing visible changed (an earlier mode did change something; repeated input is idempotent?)
- link-not-activated @ desktop /cinematic-export :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /cinematic-export :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- external-link-not-activated @ desktop /cinematic-export :: link "Mapbox homepage": https://www.mapbox.com/ (offline run)
- external-link-not-activated @ desktop /cinematic-export :: link "© Mapbox": https://www.mapbox.com/about/maps (offline run)
- external-link-not-activated @ desktop /cinematic-export :: link "© OpenStreetMap": https://www.openstreetmap.org/copyright/ (offline run)
- external-link-not-activated @ desktop /cinematic-export :: link "Improve this map": https://apps.mapbox.com/feedback/?owner=mapbox&id=satellite-v9&access_token=pk.eyJ1IjoibWxlZ2VyZTk3ODkiLCJhIjoiY21xcHptODEyMGJydDJycWFhaWY0ZHVsMCJ9.aJvnELJlXEs3nYrWx4Eg5Q#/-77.235/39.81/13 (offline run)
- external-link-not-activated @ desktop /cinematic-export :: link "© Maxar": https://www.maxar.com/ (offline run)
- link-not-activated @ desktop /compare :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /compare :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- external-link-not-activated @ desktop /compare :: link "Mapbox homepage": https://www.mapbox.com/ (offline run)
- external-link-not-activated @ desktop /compare :: link "Mapbox homepage": https://www.mapbox.com/ (offline run)
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
- external-link-not-activated @ desktop /embed :: link "Explore the full animated map →": https://gettysburginteractivemap.com/index.html?tick=553&vignette=V-018 (offline run)
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

</details>

## Check 5: Performance

Status: **RAN**. Defects: 0. Notes: 0.

Metrics:

```json
{
 "setup": {
  "phoneCpuThrottle": 4,
  "desktopCpuThrottle": 1,
  "networkThrottle": "none (local server)",
  "frameSeconds": 12,
  "soakSeconds": 600
 },
 "chrome": "Chrome/156.0.8078.76",
 "vitalsPages": 50,
 "webglRenderer": "ANGLE (Intel, Intel(R) Arc(TM) Pro 140T GPU (16GB) (0x00007D51) Direct3D11 vs_5_0 ps_5_0, D3D11)",
 "frames": [
  {
   "shell": "desktop",
   "speed": "1x",
   "tick0": 1,
   "tick1": 27,
   "n": 845,
   "p50": 16.7,
   "p95": 16.8,
   "p99": 16.9,
   "max": 16.9,
   "over50": 0,
   "over100": 0,
   "fps": 60,
   "longTasks": 0,
   "longTaskMax": 0
  },
  {
   "shell": "desktop",
   "speed": "4x",
   "tick0": 29,
   "tick1": 135,
   "n": 846,
   "p50": 16.7,
   "p95": 16.8,
   "p99": 16.8,
   "max": 17,
   "over50": 0,
   "over100": 0,
   "fps": 60,
   "longTasks": 0,
   "longTaskMax": 0
  },
  {
   "shell": "phone",
   "speed": "1x",
   "tick0": 1,
   "tick1": 27,
   "n": 846,
   "p50": 16.7,
   "p95": 16.8,
   "p99": 16.8,
   "max": 17,
   "over50": 0,
   "over100": 0,
   "fps": 60,
   "longTasks": 0,
   "longTaskMax": 0
  },
  {
   "shell": "phone",
   "speed": "4x",
   "tick0": 29,
   "tick1": 135,
   "n": 844,
   "p50": 16.7,
   "p95": 16.8,
   "p99": 16.8,
   "max": 16.9,
   "over50": 0,
   "over100": 0,
   "fps": 60,
   "longTasks": 0,
   "longTaskMax": 0
  }
 ],
 "inp": [
  {
   "shell": "desktop",
   "interactions": 30,
   "inp": 104
  },
  {
   "shell": "phone",
   "interactions": 10,
   "inp": 96
  }
 ],
 "soak": [
  {
   "shell": "desktop",
   "seconds": 600,
   "samples": 14,
   "startMB": 23.33,
   "endMB": 24.09,
   "growthPercent": 3.24,
   "maxHeartbeatMs": 20,
   "domNodes": [
    930,
    960
   ]
  }
 ]
}
```

## Check 6: Accuracy (verify_release + test subset)

Status: **RAN**. Defects: 0. Notes: 2.

Commands:

- `C:\Program Files\nodejs\node.exe tools/t0/verify_release.mjs --train R1f --release-dir <scratch>/release-dir --port 8800 --json C:\Users\mlege\gettysburg-map\docs\accept\passes\pass-1-artifacts\verify_release.json` -> exit 0 in 1.3 s (candidate bytes substituted for release/R1f/dist)
- `node tests/t0/r0.mjs --dist <candidate>` -> exit 0 in 41.1 s (r0-acceptance: 12/13 passed, 1 skipped|r0-acceptance|12|13|1|)
- `node tests/t0/journeys-desktop.spec.mjs --dist <candidate>` -> exit 0 in 202.3 s (journeys-desktop: 41/41 passed|journeys-desktop|41|41||)
- `node tests/t0/deeplinks.spec.mjs --dist <candidate>` -> exit 0 in 154.5 s (deeplinks: 12/12 passed|deeplinks|12|12||)
- `node tests/t0/desktop-fixes.spec.mjs --dist <candidate>` -> exit 0 in 97.0 s (desktop-fixes: 10/10 passed|desktop-fixes|10|10||)
- `node tests/t0/walkthrough-guard.spec.mjs --dist <candidate>` -> exit 0 in 110.8 s (walkthrough-guard: 17/18 passed, 1 skipped|walkthrough-guard|17|18|1|)
- `node tests/t0/copy.spec.mjs --dist <candidate>` -> exit 0 in 61.9 s (copy-truthful-subset: 4/4 passed|copy-truthful-subset|4|4||)
- `node tests/t0/acc.spec.mjs --dist <candidate>` -> exit 0 in 7.1 s (acc: 6/6 passed|acc|6|6||)
- `node tests/t0/headers.spec.mjs --dist <candidate> --no-browser` -> exit 0 in 20.4 s (headers: 14/18 passed, 4 skipped|headers|14|18|4|)
- `node tests/t0/pages-maps.spec.mjs --dist <candidate>` -> exit 0 in 74.3 s (T0-PG (map pages, og/manifest): 34/34 passed|T0-PG (map pages, og/manifest)|34|34||)
- `node tests/t0/perf-fixes.spec.mjs --dist <candidate>` -> exit 0 in 39.0 s (perf-fixes: 10/10 passed|perf-fixes|10|10||)
- `node tests/t0/pages-core.spec.mjs --dist <candidate>` -> exit 0 in 313.4 s (pages-core: 28/28 passed|pages-core|28|28||)
- `node tools/data/manifest.mjs verify` -> exit 0 in 0.1 s
- `node tools/data/validate.mjs` -> exit 0 in 1.7 s
- `node tools/data/unit_registry.mjs --check` -> exit 0 in 0.2 s
- `node tools/data/facts.mjs --check` -> exit 0 in 1.2 s
- `node tools/data/rights_audit.mjs --check` -> exit 0 in 1.1 s
- `node --test tests/data/*.test.mjs` -> exit 0 in 77.7 s
- `node tools/time/build.mjs --check` -> exit 0 in 0.3 s
- `node tools/time/validate.mjs --check` -> exit 0 in 1.0 s
- `node tools/time/surfaces.mjs --check` -> exit 0 in 2.6 s
- `node --test tests/time/*.test.mjs` -> exit 0 in 79.0 s
- `node --test tests/historian/*.test.mjs` -> exit 0 in 56.8 s

Metrics:

```json
{
 "train": "R1f",
 "candidateEqualsBuiltDist": true,
 "subsetNote": "fast subset only; use --full for tools/t0/run_suites.mjs"
}
```

<details><summary>Notes (information, not defects)</summary>

- subset @ -: ran 16 suites; NOT in the subset: a11y.spec; pages-fixes.spec; mobile-matrix.spec / mobile-fixes.spec; red-first proofs and build self-tests (see accuracy_subset.json for why)
- claims @ -: Passing these suites shows the machinery is consistent with its own expectations; it does not prove the historical anchors are correct (that needs the named reviewer).

</details>

## Check 7: Visual QA at six widths

Status: **RAN**. Defects: 0. Notes: 123.

Metrics:

```json
{
 "chrome": "Chrome/156.0.8078.76",
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

<details><summary>Notes (information, not defects)</summary>

- third-party-small-target @ /camera @360px: 2 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, a.mapboxgl-ctrl-logo 88x23
- third-party-small-target @ /camera @390px: 2 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, a.mapboxgl-ctrl-logo 88x23
- third-party-small-target @ /camera @768px: 5 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- axe-contrast-incomplete @ /camera @768px: 4 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /camera @1024px: 5 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- axe-contrast-incomplete @ /camera @1024px: 4 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /camera @1440px: 5 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- layout-shift-below-limit @ /camera @1440px: CLS 0.0061
- axe-contrast-incomplete @ /camera @1440px: 4 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /camera @1920px: 5 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- layout-shift-below-limit @ /camera @1920px: CLS 0.0028
- axe-contrast-incomplete @ /camera @1920px: 4 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /cinematic-export @360px: 2 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, a.mapboxgl-ctrl-logo 88x23
- third-party-small-target @ /cinematic-export @390px: 2 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, a.mapboxgl-ctrl-logo 88x23
- third-party-small-target @ /cinematic-export @768px: 5 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- axe-contrast-incomplete @ /cinematic-export @768px: 4 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /cinematic-export @1024px: 5 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- axe-contrast-incomplete @ /cinematic-export @1024px: 4 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /cinematic-export @1440px: 5 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- layout-shift-below-limit @ /cinematic-export @1440px: CLS 0.0069
- axe-contrast-incomplete @ /cinematic-export @1440px: 4 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /cinematic-export @1920px: 5 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- layout-shift-below-limit @ /cinematic-export @1920px: CLS 0.0048
- axe-contrast-incomplete @ /cinematic-export @1920px: 4 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /compare @360px: 4 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, a.mapboxgl-ctrl-logo.mapboxgl-compact 23x2
- third-party-small-target @ /compare @390px: 4 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, a.mapboxgl-ctrl-logo.mapboxgl-compact 23x2
- third-party-small-target @ /compare @768px: 4 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, a.mapboxgl-ctrl-logo 88x23, button.mapboxg
- axe-contrast-incomplete @ /compare @768px: 16 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /compare @1024px: 4 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, a.mapboxgl-ctrl-logo 88x23, button.mapboxg
- axe-contrast-incomplete @ /compare @1024px: 16 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /compare @1440px: 10 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- layout-shift-below-limit @ /compare @1440px: CLS 0.0122
- axe-contrast-incomplete @ /compare @1440px: 24 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /compare @1920px: 10 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
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
- third-party-small-target @ /immersive @360px: 2 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, a.mapboxgl-ctrl-logo 88x23
- third-party-small-target @ /immersive @390px: 2 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, a.mapboxgl-ctrl-logo 88x23
- third-party-small-target @ /immersive @768px: 5 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- third-party-small-target @ /immersive @1024px: 5 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14

</details>

## Check 8: Copy audit

Status: **RAN**. Defects: 0. Notes: 3.

Commands:

- `node tools/accept/copy_audit.mjs gettysburg-R1f-5f898a66-PRODUCTION.zip (in-process)` -> exit null in 0.0 s (whitelist: 0 entries)

Metrics:

```json
{
 "scanned": {
  "files": 2013,
  "bytes": 44788967
 },
 "zip": {
  "entries": 2013,
  "comment": ""
 },
 "blocking": 0,
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
    "pages": 31,
    "info": {
     "/Title": "Gettysburg Interactive Map: User Guide",
     "/Author": "Gettysburg Interactive Map",
     "/Subject": "How to use the Gettysburg Interactive Map: the timeline, the map and its units, the toolbar, the Virtual Walkthrough, sharing links, the other pages, keyboard use and the phone layout.",
     "/Keywords": "Gettysburg, Battle of Gettysburg, interactive map, user guide, tutorial, July 1863, timeline, keyboard shortcuts, accessibility",
     "/Creator": "Gettysburg Interactive Map",
     "/Producer": "Gettysburg Interactive Map",
     "/CreationDate": "D:20261021000000+00'00'",
     "/ModDate": "D:20261021000000+00'00'"
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

<details><summary>Notes (information, not defects)</summary>

- copy-info:ops file shipped (info) @ _ops/asset-manifest.json: _ops/asset-manifest.json is deployed to the public site
- copy-info:ops file shipped (info) @ _ops/config-manifest.json: _ops/config-manifest.json is deployed to the public site
- copy-info:ops file shipped (info) @ _ops/used-names.txt: _ops/used-names.txt is deployed to the public site

</details>

Raw outputs: the machine-readable `raw` sections of the JSON file of this pass, and the files in `pass-1-artifacts/` (screenshots, diffs, tool output).
