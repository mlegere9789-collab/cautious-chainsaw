# Acceptance pass 1: DEFECTS

Started 2026-10-20T08:17:10.074Z, finished 2026-10-20T09:27:34.412Z.

| | |
|---|---|
| Candidate | `deliver\gettysburg-R1c-2531699e-PRODUCTION.zip` (zip) |
| Candidate SHA-256 | `4b6799863d7f242edc4a2bea98be0028c2dbab214e66c621eb971e8e876d9452` |
| Tree digest (sha256 of path+hash list) | `b279998713873674dcb921431aac69615063146736c6297bc8df758826204a3f` |
| Files | 127 |
| Baseline (published build) | `baseline\dist` |
| Harness digest | `30cce50bfbdf815a103231ea30e15341971b4a04de33749de9119e8096b77a4d` (29 files) |
| Node / Python | v24.19.0 / Python 3.11.9 |
| Chrome | Chrome/155.0.8059.82 |
| Playwright-core / axe-core | 1.63.0 / 4.13.0 |
| OS / CPU | Windows_NT 10.0.26200 x64; 16 x Intel(R) Core(TM) Ultra 7 265H; 34 GB |
| Repo HEAD | 17ba8ee789133164815e11c4f2e740de86524862 |
| Mapbox tile requests | 4490 of cap 20000 (cap-blocked 0) |
| Soak | 120 s |

A pass is CLEAN only if all eight checks RAN and found zero defects. A check that did not run is never a pass.

## Summary

| # | Check | Status | Defects | Notes | Time |
|---|---|---|---|---|---|
| 1 | Deterministic zip (hash equals the previous pass) | RAN, clean | 0 | 2 | 0 s |
| 2 | Static hygiene | RAN, clean | 0 | 6 | 71 s |
| 3 | Regression against the published build | RAN, DEFECTS | 53 | 15 | 238 s |
| 4 | Input matrix (desktop + phone) | RAN, DEFECTS | 13 | 227 | 1742 s |
| 5 | Performance | RAN, DEFECTS | 5 | 1 | 420 s |
| 6 | Accuracy (verify_release + test subset) | RAN, DEFECTS | 5 | 2 | 1304 s |
| 7 | Visual QA at six widths | RAN, DEFECTS | 20 | 124 | 448 s |
| 8 | Copy audit | RAN, DEFECTS | 16 | 3 | 1 s |

## Check 1: Deterministic zip (hash equals the previous pass)

Status: **RAN**. Defects: 0. Notes: 2.

Commands:

- `python tools/ship/pack_zip.py --train R1c --out C:\Users\mlege\AppData\Local\Temp\accept-pass1-40656-mvgetvp8-b32451\repack.zip` -> exit 0 in 0.3 s

Metrics:

```json
{
 "candidateSha256": "4b6799863d7f242edc4a2bea98be0028c2dbab214e66c621eb971e8e876d9452",
 "bytes": 1377930,
 "entries": 127,
 "comparedAgainst": [
  "gettysburg-R1c-2531699e-PRODUCTION.zip.sha256"
 ],
 "repackSha256": "4b6799863d7f242edc4a2bea98be0028c2dbab214e66c621eb971e8e876d9452"
}
```

<details><summary>Notes (information, not defects)</summary>

- zip-hash-equal @ gettysburg-R1c-2531699e-PRODUCTION.zip.sha256: equals gettysburg-R1c-2531699e-PRODUCTION.zip.sha256
- repack-identical @ release/R1c/dist: a fresh pack of the built dist is byte-identical to the candidate

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
  "json": 76,
  "inlineScripts": 30,
  "inlineStyles": 25
 },
 "crawl": {
  "internalReferences": 228,
  "uniqueTargets": 46,
  "externalReferences": 28,
  "externalHosts": {
   "api.mapbox.com": 25,
   "www.nps.gov": 1,
   "www.mapbox.com": 1,
   "policies.google.com": 1
  },
  "dynamicTemplateReferencesNotResolvable": 0,
  "unreferencedFilesNote": 2
 },
 "insecureUrls": 0,
 "chrome": "Chrome/155.0.8059.82",
 "mapLoads": {
  "routes": 9,
  "tileRequestsSeen": 163,
  "statuses": {
   "200": 163,
   "204": 31
  },
  "refererInjected": 163,
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
    "gbg-r0-2531699e"
   ],
   "cachedAssets": 2
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
    "gbg-r0-2531699e-acceptance-update"
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
- external-not-checked @ -: 28 references to 4 external hosts were NOT requested (the run is offline by design): api.mapbox.com, www.nps.gov, www.mapbox.com, policies.google.com
- unreferenced-files @ -: apple-touch-icon-precomposed.png, icons.svg
- mapbox-cdn-runtime-dependency @ -: 8 pages load mapbox-gl.js/css from https://api.mapbox.com at runtime (SRI-pinned v3.24.1); the app bundles its own copy

</details>

## Check 3: Regression against the published build

Status: **RAN**. Defects: 53. Notes: 15.

Metrics:

```json
{
 "waiversLoaded": 4,
 "files": {
  "baseline": 118,
  "candidate": 120,
  "identical": 79,
  "changed": 36,
  "missing": 3,
  "added": 5
 },
 "data": {
  "changed": 1,
  "regressed": 1
 },
 "routeStatusChecked": 50,
 "routesCompared": 24,
 "chrome": "Chrome/155.0.8059.82"
}
```

Defects by code: screenshot-differs x40, text-missing x9, control-missing x2, file-missing x1, data-regressed x1

| code | where | detail |
|---|---|---|
| file-missing | assets/InterpolationWorker-ufiwa2-e.js | assets/InterpolationWorker-ufiwa2-e.js is on the published build and not in the candidate |
| data-regressed | manifest.json | 1 regression(s): /orientation: key removed |
| screenshot-differs | aftermath@1440 | 2.758% of pixels differ (limit 0.20%); page size 1425x1265 -> 1425x1266; bbox [72,5,1366,1235]; worst regions [[534,843,713,1054],[534,422,713,633],[534,633,713,843]]; images: docs\accept\dryrun\pass-1-artifacts\regression\aftermath@1440.{baseline,candidate,diff}.png |
| screenshot-differs | aftermath@390 | 7.902% of pixels differ (limit 0.20%); page size 390x1646 -> 390x1703; bbox [13,5,370,1618]; worst regions [[49,1097,98,1372],[98,1097,146,1372],[49,823,98,1097]]; images: docs\accept\dryrun\pass-1-artifacts\regression\aftermath@390.{baseline,candidate,diff}.png |
| text-missing | ar@1440 | 1 visible text line(s) of the published build are not in the candidate: "This needs a phone: its camera, GPS, and compass, all live, granted directly in " |
| screenshot-differs | ar@1440 | 1.801% of pixels differ (limit 0.20%); bbox [72,5,1367,788]; worst regions [[540,450,720,600],[720,450,900,600],[180,150,360,300]]; images: docs\accept\dryrun\pass-1-artifacts\regression\ar@1440.{baseline,candidate,diff}.png |
| text-missing | ar@390 | 1 visible text line(s) of the published build are not in the candidate: "This needs a phone: its camera, GPS, and compass, all live, granted directly in " |
| screenshot-differs | ar@390 | 8.095% of pixels differ (limit 0.20%); page size 390x944 -> 390x999; bbox [13,5,370,914]; worst regions [[195,472,244,629],[146,472,195,629],[98,472,146,629]]; images: docs\accept\dryrun\pass-1-artifacts\regression\ar@390.{baseline,candidate,diff}.png |
| text-missing | dashboard@1440 | 15 visible text line(s) of the published build are not in the candidate: "(52.3% casualties ⚠)", "(5.1% casualties ⚠)", "U-III (Third Corps)", "MOST COMPRESSED UNION", "Nearly 4,200 casualties in approximately 2 hours on July 2 afternoon -- the most", "C-I-3 (Pickett's Division)" |
| screenshot-differs | dashboard@1440 | 3.334% of pixels differ (limit 0.20%); page size 1425x1713 -> 1425x1561; bbox [72,5,1366,1530]; worst regions [[534,520,713,781],[713,1041,891,1301],[356,520,534,781]]; images: docs\accept\dryrun\pass-1-artifacts\regression\dashboard@1440.{baseline,candidate,diff}.png |
| text-missing | dashboard@390 | 15 visible text line(s) of the published build are not in the candidate: "(52.3% casualties ⚠)", "(5.1% casualties ⚠)", "U-III (Third Corps)", "MOST COMPRESSED UNION", "Nearly 4,200 casualties in approximately 2 hours on July 2 afternoon -- the most", "C-I-3 (Pickett's Division)" |
| screenshot-differs | dashboard@390 | 5.898% of pixels differ (limit 0.20%); page size 448x2454 -> 390x2688; bbox [13,5,389,2416]; worst regions [[49,1636,98,2045],[98,1636,146,2045],[146,1636,195,2045]]; images: docs\accept\dryrun\pass-1-artifacts\regression\dashboard@390.{baseline,candidate,diff}.png |
| screenshot-differs | documentary@1440 | 2.284% of pixels differ (limit 0.20%); page size 1425x1238 -> 1425x1230; bbox [72,5,1367,1199]; worst regions [[713,410,891,615],[534,410,713,615],[713,615,891,820]]; images: docs\accept\dryrun\pass-1-artifacts\regression\documentary@1440.{baseline,candidate,diff}.png |
| screenshot-differs | documentary@390 | 7.324% of pixels differ (limit 0.20%); page size 390x1838 -> 390x1883; bbox [13,5,369,1837]; worst regions [[49,613,98,919],[195,919,244,1225],[244,919,293,1225]]; images: docs\accept\dryrun\pass-1-artifacts\regression\documentary@390.{baseline,candidate,diff}.png |
| screenshot-differs | education@1440 | 3.205% of pixels differ (limit 0.20%); page size 1425x2546 -> 1425x2530; bbox [0,5,1424,2505]; worst regions [[534,843,713,1265],[534,1265,713,1687],[534,1687,713,2108]]; images: docs\accept\dryrun\pass-1-artifacts\regression\education@1440.{baseline,candidate,diff}.png |
| screenshot-differs | education@390 | 12.135% of pixels differ (limit 0.20%); page size 390x3373 -> 390x3418; bbox [0,5,389,3372]; worst regions [[49,1687,98,2249],[195,1687,244,2249],[98,1687,146,2249]]; images: docs\accept\dryrun\pass-1-artifacts\regression\education@390.{baseline,candidate,diff}.png |
| screenshot-differs | embed@1440 | 1.304% of pixels differ (limit 0.20%); bbox [21,21,451,306]; worst regions [[0,150,180,300],[180,150,360,300],[0,0,180,150]]; images: docs\accept\dryrun\pass-1-artifacts\regression\embed@1440.{baseline,candidate,diff}.png |
| screenshot-differs | embed@390 | 7.149% of pixels differ (limit 0.20%); bbox [21,21,367,351]; worst regions [[195,141,244,281],[49,141,98,281],[98,141,146,281]]; images: docs\accept\dryrun\pass-1-artifacts\regression\embed@390.{baseline,candidate,diff}.png |
| screenshot-differs | find-ancestor@1440 | 1.379% of pixels differ (limit 0.20%); bbox [72,5,1366,605]; worst regions [[360,150,540,300],[540,150,720,300],[720,150,900,300]]; images: docs\accept\dryrun\pass-1-artifacts\regression\find-ancestor@1440.{baseline,candidate,diff}.png |
| screenshot-differs | find-ancestor@390 | 5.333% of pixels differ (limit 0.20%); page size 390x844 -> 390x885; bbox [13,5,370,842]; worst regions [[146,281,195,422],[195,281,244,422],[244,281,293,422]]; images: docs\accept\dryrun\pass-1-artifacts\regression\find-ancestor@390.{baseline,candidate,diff}.png |
| text-missing | historian@1440 | 1 visible text line(s) of the published build are not in the candidate: "This runs entirely in your browser and answers only from this site's own publish" |
| screenshot-differs | historian@1440 | 1.499% of pixels differ (limit 0.20%); page size 1440x900 -> 1425x1194; bbox [72,5,1366,794]; worst regions [[178,150,356,300],[891,600,1069,750],[356,150,534,300]]; images: docs\accept\dryrun\pass-1-artifacts\regression\historian@1440.{baseline,candidate,diff}.png |
| text-missing | historian@390 | 1 visible text line(s) of the published build are not in the candidate: "This runs entirely in your browser and answers only from this site's own publish" |
| screenshot-differs | historian@390 | 4.001% of pixels differ (limit 0.20%); page size 390x966 -> 390x1247; bbox [13,5,370,924]; worst regions [[293,644,341,805],[98,161,146,322],[49,161,98,322]]; images: docs\accept\dryrun\pass-1-artifacts\regression\historian@390.{baseline,candidate,diff}.png |
| screenshot-differs | living-ledger@1440 | 0.991% of pixels differ (limit 0.20%); page size 1440x900 -> 1425x1124; bbox [72,5,1366,836]; worst regions [[713,300,891,450],[178,150,356,300],[713,600,891,750]]; images: docs\accept\dryrun\pass-1-artifacts\regression\living-ledger@1440.{baseline,candidate,diff}.png |
| screenshot-differs | living-ledger@390 | 4.312% of pixels differ (limit 0.20%); page size 390x844 -> 390x1157; bbox [13,5,369,801]; worst regions [[195,563,244,703],[146,563,195,703],[195,281,244,422]]; images: docs\accept\dryrun\pass-1-artifacts\regression\living-ledger@390.{baseline,candidate,diff}.png |
| screenshot-differs | privacy@1440 | 0.138% of pixels differ (limit 0.20%); page size 1425x1518 -> 1425x1539; bbox [360,1314,830,1408]; worst regions [[356,1265,534,1518],[534,1265,713,1518],[713,1265,891,1518]]; images: docs\accept\dryrun\pass-1-artifacts\regression\privacy@1440.{baseline,candidate,diff}.png |
| screenshot-differs | privacy@390 | 0.247% of pixels differ (limit 0.20%); page size 390x1966 -> 390x2007; bbox [20,1763,288,1877]; worst regions [[98,1638,146,1966],[49,1638,98,1966],[0,1638,49,1966]]; images: docs\accept\dryrun\pass-1-artifacts\regression\privacy@390.{baseline,candidate,diff}.png |
| screenshot-differs | regiment@1440 | 0.771% of pixels differ (limit 0.20%); bbox [72,5,1367,432]; worst regions [[180,150,360,300],[540,150,720,300],[0,0,180,150]]; images: docs\accept\dryrun\pass-1-artifacts\regression\regiment@1440.{baseline,candidate,diff}.png |
| screenshot-differs | regiment@390 | 2.599% of pixels differ (limit 0.20%); bbox [13,5,369,508]; worst regions [[195,141,244,281],[146,141,195,281],[49,141,98,281]]; images: docs\accept\dryrun\pass-1-artifacts\regression\regiment@390.{baseline,candidate,diff}.png |
| screenshot-differs | report@1440 | 0.596% of pixels differ (limit 0.20%); bbox [72,5,1367,408]; worst regions [[540,150,720,300],[0,0,180,150],[360,150,540,300]]; images: docs\accept\dryrun\pass-1-artifacts\regression\report@1440.{baseline,candidate,diff}.png |
| screenshot-differs | report@390 | 2.042% of pixels differ (limit 0.20%); bbox [13,5,369,480]; worst regions [[49,141,98,281],[49,0,98,141],[98,141,146,281]]; images: docs\accept\dryrun\pass-1-artifacts\regression\report@390.{baseline,candidate,diff}.png |
| screenshot-differs | search@1440 | 2.085% of pixels differ (limit 0.20%); page size 1425x3273 -> 1425x3306; bbox [73,5,1366,3272]; worst regions [[356,546,534,1091],[356,1091,534,1637],[356,0,534,546]]; images: docs\accept\dryrun\pass-1-artifacts\regression\search@1440.{baseline,candidate,diff}.png |
| screenshot-differs | search@390 | 7.480% of pixels differ (limit 0.20%); page size 390x3498 -> 390x3740; bbox [13,5,370,3494]; worst regions [[49,2915,98,3498],[49,2332,98,2915],[49,1166,98,1749]]; images: docs\accept\dryrun\pass-1-artifacts\regression\search@390.{baseline,candidate,diff}.png |
| screenshot-differs | terms@1440 | 0.109% of pixels differ (limit 0.20%); page size 1425x1388 -> 1425x1410; bbox [360,1189,686,1280]; worst regions [[356,1157,534,1388],[534,1157,713,1388]]; images: docs\accept\dryrun\pass-1-artifacts\regression\terms@1440.{baseline,candidate,diff}.png |
| screenshot-differs | terms@390 | 0.252% of pixels differ (limit 0.20%); page size 390x1872 -> 390x1915; bbox [20,1673,344,1785]; worst regions [[98,1560,146,1872],[49,1560,98,1872],[293,1560,341,1872]]; images: docs\accept\dryrun\pass-1-artifacts\regression\terms@390.{baseline,candidate,diff}.png |
| screenshot-differs | turning-points@1440 | 1.909% of pixels differ (limit 0.20%); page size 1425x1608 -> 1425x1629; bbox [72,5,1366,1598]; worst regions [[534,268,713,536],[534,804,713,1072],[534,536,713,804]]; images: docs\accept\dryrun\pass-1-artifacts\regression\turning-points@1440.{baseline,candidate,diff}.png |
| screenshot-differs | turning-points@390 | 5.501% of pixels differ (limit 0.20%); page size 390x2134 -> 390x2251; bbox [13,5,369,2092]; worst regions [[49,356,98,711],[98,356,146,711],[146,356,195,711]]; images: docs\accept\dryrun\pass-1-artifacts\regression\turning-points@390.{baseline,candidate,diff}.png |
| screenshot-differs | camera@1440 | 59.156% of pixels differ (limit 0.20%); page size 1425x948 -> 1425x937; bbox [0,5,1424,907]; worst regions [[0,312,178,469],[0,469,178,625],[0,625,178,781]]; images: docs\accept\dryrun\pass-1-artifacts\regression\camera@1440.{baseline,candidate,diff}.png |
| screenshot-differs | cinematic-export@1440 | 0.934% of pixels differ (limit 0.20%); page size 1425x980 -> 1425x971; bbox [0,5,1424,940]; worst regions [[534,647,713,809],[0,0,178,162],[178,0,356,162]]; images: docs\accept\dryrun\pass-1-artifacts\regression\cinematic-export@1440.{baseline,candidate,diff}.png |
| screenshot-differs | compare@1440 | 2.422% of pixels differ (limit 0.20%); page size 1425x956 -> 1425x962; bbox [27,5,1424,931]; worst regions [[178,159,356,319],[356,159,534,319],[0,159,178,319]]; images: docs\accept\dryrun\pass-1-artifacts\regression\compare@1440.{baseline,candidate,diff}.png |
| screenshot-differs | ground-remembers@1440 | 1.573% of pixels differ (limit 0.20%); page size 1425x1026 -> 1425x1019; bbox [72,5,1424,988]; worst regions [[0,170,178,340],[178,170,356,340],[356,170,534,340]]; images: docs\accept\dryrun\pass-1-artifacts\regression\ground-remembers@1440.{baseline,candidate,diff}.png |
| screenshot-differs | immersive@1440 | 1.651% of pixels differ (limit 0.20%); page size 1425x990 -> 1425x983; bbox [72,5,1424,952]; worst regions [[713,492,891,655],[534,492,713,655],[0,819,178,983]]; images: docs\accept\dryrun\pass-1-artifacts\regression\immersive@1440.{baseline,candidate,diff}.png |
| text-missing | index@1440 | 16 visible text line(s) of the published build are not in the candidate: "Choose Your Experience", "SELECT THE FORMAT THAT BEST FITS YOUR DEVICE", "🖥", "Desktop", "Full-featured experience with side panels, detailed controls, and complete battl", "Select Desktop →" |
| control-missing | index@1440 | 3 control(s) of the published build have no counterpart in the candidate: "a\|\|Download Website Tutorial PDF", "input\|\|0", "button\|\|🔇" |
| screenshot-differs | index@1440 | 5.894% of pixels differ (limit 0.20%); bbox [13,11,1429,893]; worst regions [[1260,600,1440,750],[540,750,720,900],[360,750,540,900]]; images: docs\accept\dryrun\pass-1-artifacts\regression\index@1440.{baseline,candidate,diff}.png |
| text-missing | index@390 | 62 visible text line(s) of the published build are not in the candidate: "Extra Features", "Choose Your Experience", "SELECT THE FORMAT THAT BEST FITS YOUR DEVICE", "🖥", "Desktop", "Full-featured experience with side panels, detailed controls, and complete battl" |
| control-missing | index@390 | 42 control(s) of the published build have no counterpart in the candidate: "button\|\|Hide Extra Features menu", "a\|\|Ask the Historian", "button\|\|Extra Features ▾", "button\|\|Toggle Units", "a\|\|Download Website Tutorial PDF", "button\|\|🗺 Virtual Walkthrough" |
| screenshot-differs | index@390 | 6.523% of pixels differ (limit 0.20%); bbox [0,4,389,822]; worst regions [[98,703,146,844],[0,0,49,141],[49,0,98,141]]; images: docs\accept\dryrun\pass-1-artifacts\regression\index@390.{baseline,candidate,diff}.png |
| screenshot-differs | sandbox@1440 | 2.945% of pixels differ (limit 0.20%); page size 1425x1093 -> 1425x1107; bbox [0,5,1424,1076]; worst regions [[0,0,178,182],[178,0,356,182],[1069,0,1247,182]]; images: docs\accept\dryrun\pass-1-artifacts\regression\sandbox@1440.{baseline,candidate,diff}.png |
| text-missing | viewshed@1440 | 1 visible text line(s) of the published build are not in the candidate: "⚠ This shows relative elevation, not a computed sightline. A genuine viewshed an" |
| screenshot-differs | viewshed@1440 | 1.700% of pixels differ (limit 0.20%); page size 1425x2005 -> 1425x1882; bbox [72,5,1424,1851]; worst regions [[534,1255,713,1568],[178,0,356,314],[1247,627,1425,941]]; images: docs\accept\dryrun\pass-1-artifacts\regression\viewshed@1440.{baseline,candidate,diff}.png |
| screenshot-differs | watch-together@1440 | 1.571% of pixels differ (limit 0.20%); page size 1425x1467 -> 1425x1497; bbox [72,5,1424,1466]; worst regions [[0,734,178,978],[178,0,356,245],[0,0,178,245]]; images: docs\accept\dryrun\pass-1-artifacts\regression\watch-together@1440.{baseline,candidate,diff}.png |

<details><summary>Notes (information, not defects)</summary>

- waived:file-missing @ diagnostics.html: diagnostics.html is on the published build and not in the candidate -- WAIVED: Developer page removed on purpose (see the route waiver above). (design of the R1a+ trains (verify_release V3), 2026-09-30)
- waived:file-missing @ unit-rendering-reference.html: unit-rendering-reference.html is on the published build and not in the candidate -- WAIVED: Developer page removed on purpose (see the route waiver above). (design of the R1a+ trains (verify_release V3), 2026-09-30)
- files-added @ -: data/moments.json, google0dca4879c9657741.html, icons/icon-maskable-192.png, icons/icon-maskable-512.png, og/card-r1.png
- waived:route-missing @ /diagnostics: route /diagnostics exists on the published build and not in the candidate -- WAIVED: Developer page removed on purpose: _redirects force-404s /diagnostics and /diagnostics.html (see the generated _redirects of every train; tools/t0/verify_release.mjs check V3 asserts it). (design of the R1a+ trains 
- waived:route-missing @ /unit-rendering-reference: route /unit-rendering-reference exists on the published build and not in the candidate -- WAIVED: Developer page removed on purpose: _redirects force-404s it (verify_release V3). (design of the R1a+ trains (verify_release V3), 2026-09-30)
- text-added @ ar@1440: 1 new line(s): "Beta. Battlefield AR needs a phone with a camera, GPS and co"
- text-added @ ar@390: 1 new line(s): "Beta. Battlefield AR needs a phone with a camera, GPS and co"
- text-added @ dashboard@1440: 18 new line(s): "These curves are modeled from each corps' recorded engagemen", "(52.3% casualties)", "(5.1% casualties)", "Third Corps"
- text-added @ dashboard@390: 18 new line(s): "These curves are modeled from each corps' recorded engagemen", "(52.3% casualties)", "(5.1% casualties)", "Third Corps"
- text-added @ historian@1440: 1 new line(s): "Answers come only from this site's own records (466 regiment"
- text-added @ historian@390: 1 new line(s): "Answers come only from this site's own records (466 regiment"
- text-added @ index@1440: 7 new line(s): "Skip to the map", "Skip to the timeline controls", "Gettysburg Animated Battlefield Map", "User Guide (PDF)"
- text-added @ index@390: 12 new line(s): "Skip to the map", "Skip to the timeline controls", "Gettysburg Animated Battlefield Map", "JULY 1"
- text-added @ viewshed@1440: 1 new line(s): "⚠ Elevation only. This page ranks the height of 30 places on"
- screenshot-method @ -: viewport 1440x900, 390x844 (map pages: first only); Mapbox canvases are hidden before the shot (tile paint time is not deterministic), animations disabled; pixel threshold 0.1, max differing ratio 0.002

</details>

## Check 4: Input matrix (desktop + phone)

Status: **RAN**. Defects: 13. Notes: 227.

Metrics:

```json
{
 "chrome": "Chrome/155.0.8059.82",
 "activations": {
  "desktop": {
   "app first-visit (onboarding)": {
    "total": 52,
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
    "total": 8,
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
    "total": 17,
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
    "total": 51,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 110
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
    "total": 18,
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
    "total": 14,
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
    "total": 8,
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
    "total": 17,
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
    "total": 11,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 20
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
    "total": 18,
    "hidden": 0,
    "disabled": 0,
    "unnamed": 0,
    "activations": 11
   },
   "/viewshed": {
    "total
```

Defects by code: long-task-during-interaction x8, slow-response x3, input-console-warning x2

| code | where | detail |
|---|---|---|
| long-task-during-interaction | desktop /compare :: button "Dark" | click: long task(s) [64] ms (limit 50 ms) |
| slow-response | desktop /compare :: button "3D Terrain" | click: 178.2 ms from input to visible change (limit 100 ms; dom 3.3, paint 178.2, event timing 192) |
| long-task-during-interaction | desktop /compare :: button "3D Terrain" | click: long task(s) [164] ms (limit 50 ms) |
| input-console-warning | desktop /compare | Unable to perform style diff: Unimplemented: setSprite.. Rebuilding the style from scratch. @ https://api.mapbox.com/mapbox-gl-js/v3.24.1/mapbox-gl.js:10 |
| long-task-during-interaction | desktop app main :: button "Unit Roster" | click: long task(s) [62] ms (limit 50 ms) |
| long-task-during-interaction | desktop app main :: button "Unit Roster" | enter: long task(s) [107] ms (limit 50 ms) |
| slow-response | desktop app main :: button "Unit Roster" | space: 104.4 ms from input to visible change (limit 100 ms; dom 84.4, paint 104.4, event timing 112) |
| long-task-during-interaction | desktop app main :: button "Unit Roster" | space: long task(s) [84] ms (limit 50 ms) |
| long-task-during-interaction | phone /compare :: button "Dark" | tap: long task(s) [80] ms (limit 50 ms) |
| slow-response | phone /compare :: button "3D Terrain" | tap: 137.2 ms from input to visible change (limit 100 ms; dom 4.5, paint 137.2, event timing 136) |
| long-task-during-interaction | phone /compare :: button "3D Terrain" | tap: long task(s) [129] ms (limit 50 ms) |
| input-console-warning | phone /compare | Unable to perform style diff: Unimplemented: setSprite.. Rebuilding the style from scratch. @ https://api.mapbox.com/mapbox-gl-js/v3.24.1/mapbox-gl.js:10 |
| long-task-during-interaction | phone app main :: button "⋯ Tools" | tap: long task(s) [51] ms (limit 50 ms) |

<details><summary>Notes (information, not defects)</summary>

- first-visit-modal-controls @ desktop app first-visit (onboarding): 4 controls are on top (the onboarding card); the other 48 are behind it and are exercised in the main state
- skip-link-keyboard-only @ desktop app first-visit (onboarding) :: link "Skip to the map": skip links are off-screen until focused; activated with Enter only
- skip-link-keyboard-only @ desktop app first-visit (onboarding) :: link "Skip to the timeline controls": skip links are off-screen until focused; activated with Enter only
- link-not-activated @ desktop /aftermath :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /aftermath :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /ar :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /ar :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /camera :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /camera :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- external-link-not-activated @ desktop /camera :: link "© Mapbox": https://www.mapbox.com/about/maps (offline run)
- external-link-not-activated @ desktop /camera :: link "© OpenStreetMap": https://www.openstreetmap.org/copyright/ (offline run)
- external-link-not-activated @ desktop /camera :: link "Improve this map": https://apps.mapbox.com/feedback/?owner=mapbox&id=satellite-v9&access_token=pk.eyJ1IjoibWxlZ2VyZTk3ODkiLCJhIjoiY21xcHptODEyMGJydDJycWFhaWY0ZHVsMCJ9.aJvnELJlXEs3nYrWx4Eg5Q#/-77.2356/39.7803/13.43 (offline run)
- external-link-not-activated @ desktop /camera :: link "© Maxar": https://www.maxar.com/ (offline run)
- repeat-activation-no-change @ desktop /cinematic-export :: spinbutton "END TICK": arrow: the control received the activation but nothing visible changed (an earlier mode did change something; repeated input is idempotent?)
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
- repeat-activation-no-change @ desktop /historian :: button "Ask": space: the control received the activation but nothing visible changed (an earlier mode did change something; repeated input is idempotent?)
- disabled-control-skipped @ desktop /immersive: button "▶ Play"
- repeat-activation-no-change @ desktop /immersive :: slider "Volume": arrow: the control received the activation but nothing visible changed (an earlier mode did change something; repeated input is idempotent?)
- link-not-activated @ desktop /immersive :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /immersive :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- control-gone-after-activation @ desktop /immersive :: button "🔊 Enable Sound & Start": the control is no longer shown after click (a dismiss/close control or a state change); enter not applicable
- skip-link-keyboard-only @ desktop app main :: link "Skip to the map": skip links are off-screen until focused; activated with Enter only
- skip-link-keyboard-only @ desktop app main :: link "Skip to the timeline controls": skip links are off-screen until focused; activated with Enter only

</details>

## Check 5: Performance

Status: **RAN**. Defects: 5. Notes: 1.

Metrics:

```json
{
 "setup": {
  "phoneCpuThrottle": 4,
  "desktopCpuThrottle": 1,
  "networkThrottle": "none (local server)",
  "frameSeconds": 12,
  "soakSeconds": 120
 },
 "chrome": "Chrome/155.0.8059.82",
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
   "p99": 16.8,
   "max": 16.8,
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
   "n": 844,
   "p50": 16.7,
   "p95": 16.8,
   "p99": 16.8,
   "max": 16.8,
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
   "max": 16.9,
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
   "n": 846,
   "p50": 16.7,
   "p95": 16.8,
   "p99": 16.8,
   "max": 16.8,
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
   "inp": 136
  },
  {
   "shell": "phone",
   "interactions": 9,
   "inp": 104
  }
 ],
 "soak": [
  {
   "shell": "desktop",
   "seconds": 120,
   "samples": 9,
   "startMB": 14.22,
   "endMB": 15.68,
   "growthPercent": 10.25,
   "maxHeartbeatMs": 13,
   "domNodes": [
    792,
    794
   ]
  }
 ]
}
```

Defects by code: tbt x4, heap-growth x1

| code | where | detail |
|---|---|---|
| tbt | phone /compare | TBT proxy 211 ms > 200 ms (7 long tasks; cpu 4x) |
| tbt | phone /ground-remembers | TBT proxy 615 ms > 200 ms (9 long tasks; cpu 4x) |
| tbt | phone /immersive | TBT proxy 232 ms > 200 ms (7 long tasks; cpu 4x) |
| tbt | phone / | TBT proxy 304 ms > 200 ms (8 long tasks; cpu 4x) |
| heap-growth | desktop soak 120s | JS heap grew 10.2% (14.22 MB -> 15.68 MB after forced GC) > 10% |

<details><summary>Notes (information, not defects)</summary>

- short-soak @ desktop soak 120s: soak ran 120 s; the acceptance run needs --soak-seconds 600

</details>

## Check 6: Accuracy (verify_release + test subset)

Status: **RAN**. Defects: 5. Notes: 2.

Commands:

- `C:\Program Files\nodejs\node.exe tools/t0/verify_release.mjs --train R1c --release-dir <scratch>/release-dir --port 8800 --json C:\Users\mlege\gettysburg-map\docs\accept\dryrun\pass-1-artifacts\verify_release.json` -> exit 0 in 0.8 s (candidate bytes substituted for release/R1c/dist)
- `node tests/t0/r0.mjs --dist <candidate>` -> exit 0 in 42.2 s (r0-acceptance: 12/13 passed, 1 skipped|r0-acceptance|12|13|1|)
- `node tests/t0/journeys-desktop.spec.mjs --dist <candidate>` -> exit 0 in 248.8 s (journeys-desktop: 41/41 passed|journeys-desktop|41|41||)
- `node tests/t0/deeplinks.spec.mjs --dist <candidate>` -> exit 0 in 152.8 s (deeplinks: 12/12 passed|deeplinks|12|12||)
- `node tests/t0/desktop-fixes.spec.mjs --dist <candidate>` -> exit 0 in 82.3 s (desktop-fixes: 10/10 passed|desktop-fixes|10|10||)
- `node tests/t0/walkthrough-guard.spec.mjs --dist <candidate>` -> exit 0 in 95.7 s (walkthrough-guard: 14/18 passed, 4 skipped|walkthrough-guard|14|18|4|)
- `node tests/t0/copy.spec.mjs --dist <candidate>` -> exit 1 in 26.7 s (copy-truthful-subset: 2/4 passed, 2 FAILED|copy-truthful-subset|2|4||2)
- `node tests/t0/headers.spec.mjs --dist <candidate> --no-browser` -> exit 1 in 3.0 s (headers: 13/18 passed, 4 skipped, 1 FAILED|headers|13|18|4|1)
- `node tests/t0/pages-maps.spec.mjs --dist <candidate>` -> exit 0 in 73.7 s (T0-PG (map pages, og/manifest): 34/34 passed|T0-PG (map pages, og/manifest)|34|34||)
- `node tests/t0/perf-fixes.spec.mjs --dist <candidate>` -> exit 0 in 39.6 s (perf-fixes: 10/10 passed|perf-fixes|10|10||)
- `node tests/t0/pages-core.spec.mjs --dist <candidate>` -> exit 0 in 311.9 s (pages-core: 27/27 passed|pages-core|27|27||)
- `node tools/data/manifest.mjs verify` -> exit 0 in 0.1 s
- `node tools/data/validate.mjs` -> exit 0 in 1.9 s
- `node tools/data/unit_registry.mjs --check` -> exit 0 in 0.2 s
- `node tools/data/facts.mjs --check` -> exit 0 in 1.4 s
- `node tools/data/rights_audit.mjs --check` -> exit 0 in 1.2 s
- `node --test tests/data/*.test.mjs` -> exit 1 in 73.0 s
- `node tools/time/build.mjs --check` -> exit 0 in 0.3 s
- `node tools/time/validate.mjs --check` -> exit 0 in 0.9 s
- `node tools/time/surfaces.mjs --check` -> exit 0 in 2.7 s
- `node --test tests/time/*.test.mjs` -> exit 1 in 84.2 s
- `node --test tests/historian/*.test.mjs` -> exit 1 in 60.3 s

Metrics:

```json
{
 "train": "R1c",
 "candidateEqualsBuiltDist": true,
 "subsetNote": "fast subset only; use --full for tools/t0/run_suites.mjs"
}
```

Defects by code: suite-failed x5

| code | where | detail |
|---|---|---|
| suite-failed | copy-spec | exit 1; copy-truthful-subset: 2/4 passed, 2 FAILED\|copy-truthful-subset\|2\|4\|\|2; FAIL  T0-CP-01     string level: each shipped row present once before / gone after, CP == exactly those replacements, held rows unchanged, no 445+, no heatmap row, no new "undefined" \| FAIL  T0-CP-02     rendered d |
| suite-failed | headers | exit 1; headers: 13/18 passed, 4 skipped, 1 FAILED\|headers\|13\|18\|4\|1; FAIL  HDR-24       the DEFAULT R1c build (the opt-in legal group is NOT included): privacy/terms carry no draft text, and the Street View sensor delegation is ON (the Walkthrough logs no Google accelerometer error) with the g |
| suite-failed | data-test: --test tests/data/*.test.mjs | exit 1: ...ew-norm.json', 'data-src/sources-v2/qc/review-pass1-r2.json', 'data-src/sources-v2/qc/review-pass1.json', 'data-src/sources-v2/qc/review-pass2-r2.json', 'data-src/sources-v2/qc/review-pass2.json', 'data-src/sources-v2/qc/review-queue-next.json', 'data-src/sources-v2/qc/reviewer-attested.j |
| suite-failed | time-test: --test tests/time/*.test.mjs | exit 1: ...c_hooks:227:14)       at Test.run (node:internal/test_runner/test:1382:25)       at Suite.processPendingSubtests (node:internal/test_runner/test:960:18)       at Test.postRun (node:internal/test_runner/test:1522:19)       at Test.run (node:internal/test_runner/test:1447:12)       at async |
| suite-failed | historian-test: --test tests/historian/*.test.mjs | exit 1: ...async_hooks:227:14)       at Test.run (node:internal/test_runner/test:1382:25)       at Test.processPendingSubtests (node:internal/test_runner/test:960:18)       at Test.postRun (node:internal/test_runner/test:1522:19)       at Test.run (node:internal/test_runner/test:1447:12)       at as |

<details><summary>Notes (information, not defects)</summary>

- subset @ -: ran 15 suites; NOT in the subset: a11y.spec; pages-fixes.spec; mobile-matrix.spec / mobile-fixes.spec; red-first proofs and build self-tests (see accuracy_subset.json for why)
- claims @ -: Passing these suites shows the machinery is consistent with its own expectations; it does not prove the historical anchors are correct (that needs the named reviewer).

</details>

## Check 7: Visual QA at six widths

Status: **RAN**. Defects: 20. Notes: 124.

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

Defects by code: small-tap-target x16, missing-or-poor-alt-text x4

| code | where | detail |
|---|---|---|
| small-tap-target | / @1024px | button "S" is 24x44px (minimum 44) |
| small-tap-target | / @1024px | button "F" is 24x44px (minimum 44) |
| small-tap-target | / @1024px | button "☰" is 25x44px (minimum 44) |
| small-tap-target | / @1024px | button "L" is 24x44px (minimum 44) |
| small-tap-target | / @1024px | button "🗿" is 30x44px (minimum 44) |
| small-tap-target | / @1024px | button "🔭" is 30x44px (minimum 44) |
| small-tap-target | / @1024px | button "⭐" is 30x44px (minimum 44) |
| small-tap-target | / @1024px | button "📏" is 30x44px (minimum 44) |
| small-tap-target | / @1024px | button "🗺" is 30x44px (minimum 44) |
| small-tap-target | / @1024px | button "📍" is 30x44px (minimum 44) |
| small-tap-target | / @1024px | button "🔍" is 30x44px (minimum 44) |
| small-tap-target | / @1024px | button "B" is 24x44px (minimum 44) |
| small-tap-target | / @1024px | ... and 2 more targets under 44 px |
| missing-or-poor-alt-text | / @1024px | svg : inline svg that is not hidden from assistive tech and has no name or role |
| small-tap-target | / @1440px | input "Battle time" is 1408x4px (minimum 24) |
| missing-or-poor-alt-text | / @1440px | svg : inline svg that is not hidden from assistive tech and has no name or role |
| small-tap-target | / @1920px | input "Battle time" is 1888x4px (minimum 24) |
| missing-or-poor-alt-text | / @1920px | svg : inline svg that is not hidden from assistive tech and has no name or role |
| small-tap-target | / (first visit, onboarding modal) @1440px | input "Battle time" is 1408x4px (minimum 24) |
| missing-or-poor-alt-text | / (first visit, onboarding modal) @1440px | svg : inline svg that is not hidden from assistive tech and has no name or role |

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
- layout-shift-below-limit @ /cinematic-export @1440px: CLS 0.0061
- axe-contrast-incomplete @ /cinematic-export @1440px: 4 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /cinematic-export @1920px: 4 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- layout-shift-below-limit @ /cinematic-export @1920px: CLS 0.0028
- axe-contrast-incomplete @ /cinematic-export @1920px: 4 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /compare @360px: 2 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, button.mapboxgl-ctrl-attrib-button 24x24
- third-party-small-target @ /compare @390px: 2 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, button.mapboxgl-ctrl-attrib-button 24x24
- third-party-small-target @ /compare @768px: 2 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, button.mapboxgl-ctrl-attrib-button 24x24
- axe-contrast-incomplete @ /compare @768px: 18 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /compare @1024px: 2 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): button.mapboxgl-ctrl-attrib-button 24x24, button.mapboxgl-ctrl-attrib-button 24x24
- axe-contrast-incomplete @ /compare @1024px: 18 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /compare @1440px: 8 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- layout-shift-below-limit @ /compare @1440px: CLS 0.0123
- axe-contrast-incomplete @ /compare @1440px: 26 node(s) axe could not decide (background image/gradient/overlap)
- third-party-small-target @ /compare @1920px: 8 Mapbox attribution/logo target(s) under the minimum (Mapbox attribution/logo markup: required by Mapbox's terms but styled by the site CSS; reported as a note, NOT counted. Owner decision: enlarge them or accept): a 55x14, a 97x14, a.mapbox-improve-map 99x14
- layout-shift-below-limit @ /compare @1920px: CLS 0.0056
- axe-contrast-incomplete @ /compare @1920px: 26 node(s) axe could not decide (background image/gradient/overlap)
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

## Check 8: Copy audit

Status: **RAN**. Defects: 16. Notes: 3.

Commands:

- `node tools/accept/copy_audit.mjs gettysburg-R1c-2531699e-PRODUCTION.zip (in-process)` -> exit null in 0.0 s (whitelist: 0 entries)

Metrics:

```json
{
 "scanned": {
  "files": 127,
  "bytes": 4010198
 },
 "zip": {
  "entries": 127,
  "comment": ""
 },
 "blocking": 16,
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
    "pages": 6,
    "info": {
     "/Author": "(anonymous)",
     "/CreationDate": "D:20260907225548-04'00'",
     "/Creator": "(unspecified)",
     "/Keywords": "",
     "/ModDate": "D:20260907225548-04'00'",
     "/Producer": "ReportLab PDF Library - (opensource)",
     "/Subject": "(unspecified)",
     "/Title": "(anonymous)",
     "/Trapped": "/False"
    },
    "hasXmp": false,
    "fonts": [
     "/Helvetica",
     "/Helvetica-Bold",
     "/Helvetica-Oblique",
     "/Symbol"
    ],
    "tagged": false,
    "lang": null
   }
  }
 ]
}
```

Defects by code: copy:generated by x3, copy:DO NOT EDIT x3, copy:AI (whole word, also AI-) x3, copy:(anonymous) x2, copy:(unspecified) x2, copy:pdf producer/creator tool name x2, copy:prompt x1

| code | where | detail |
|---|---|---|
| copy:generated by | _headers:1 [config-file] | "Generated by" ... # Generated by tools/t0/config/gen.mjs for release 2531699e (tra |
| copy:DO NOT EDIT | _headers:1 [config-file] | "DO NOT EDIT" ... elease 2531699e (train R1c, context production). DO NOT EDIT. # Invariant: for any URL each header NAME is pro |
| copy:generated by | _redirects:1 [config-file] | "Generated by" ... # Generated by tools/t0/config/gen.mjs. DO NOT EDIT. First mat |
| copy:DO NOT EDIT | _redirects:1 [config-file] | "DO NOT EDIT" ... # Generated by tools/t0/config/gen.mjs. DO NOT EDIT. First matching rule wins; `!` = force (applies |
| copy:prompt | ar.html:132 [html/inline-script/js-comment] | "prompt" ... entation (iOS 13+ requires an explicit permission prompt from a user gesture) |
| copy:AI (whole word, also AI-) | historian.html:150 [html/inline-script/js-template] | "AI" ... laces). This is a search of those records, not an AI. |
| copy:AI (whole word, also AI-) | historian.html:54 [html/visible-text-or-style] | "AI" ... ecords. This is a search of those records, not an AI.</div> </header> <main class="gtbg-fill"> <div |
| copy:generated by | netlify.toml:1 [toml] | "Generated by" ... # Generated by tools/t0/config/gen.mjs for release 2531699e. DO |
| copy:DO NOT EDIT | netlify.toml:1 [toml] | "DO NOT EDIT" ... by tools/t0/config/gen.mjs for release 2531699e. DO NOT EDIT. # All headers live in _headers and all redirects |
| copy:(anonymous) | user-guide.pdf [pdf/Info/Author] | "(anonymous)" ... (anonymous) |
| copy:(unspecified) | user-guide.pdf [pdf/Info/Creator] | "(unspecified)" ... (unspecified) |
| copy:pdf producer/creator tool name | user-guide.pdf [pdf/Info/Creator] | "(unspecified)" ... /Creator = (unspecified)  (non-empty: name the site or leave it empty) |
| copy:pdf producer/creator tool name | user-guide.pdf [pdf/Info/Producer] | "ReportLab PDF Library - (opensource)" ... /Producer = ReportLab PDF Library - (opensource) |
| copy:(unspecified) | user-guide.pdf [pdf/Info/Subject] | "(unspecified)" ... (unspecified) |
| copy:(anonymous) | user-guide.pdf [pdf/Info/Title] | "(anonymous)" ... (anonymous) |
| copy:AI (whole word, also AI-) | user-guide.pdf [pdf/text/p5] | "AI" ... errain) — a search-and-synthesis tool, not a live AI model, so every answer traces back to a real reco |

<details><summary>Notes (information, not defects)</summary>

- copy-info:ops file shipped (info) @ _ops/asset-manifest.json: _ops/asset-manifest.json is deployed to the public site
- copy-info:ops file shipped (info) @ _ops/config-manifest.json: _ops/config-manifest.json is deployed to the public site
- copy-info:ops file shipped (info) @ _ops/used-names.txt: _ops/used-names.txt is deployed to the public site

</details>

Raw outputs: the machine-readable `raw` sections of the JSON file of this pass, and the files in `pass-1-artifacts/` (screenshots, diffs, tool output).
