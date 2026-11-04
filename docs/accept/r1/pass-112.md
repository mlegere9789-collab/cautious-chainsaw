# Acceptance pass 112: INCOMPLETE

Started 2026-10-20T12:41:00.613Z, finished 2026-10-20T12:42:19.899Z.

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
| Mapbox tile requests | 123 of cap 20000 (cap-blocked 0) |
| Soak | 60 s |

A pass is CLEAN only if all eight checks RAN and found zero defects. A check that did not run is never a pass.

## Summary

| # | Check | Status | Defects | Notes | Time |
|---|---|---|---|---|---|
| 2 | Static hygiene | RAN, clean | 0 | 6 | 76 s |

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
  "tileRequestsSeen": 123,
  "statuses": {
   "200": 123,
   "204": 31
  },
  "refererInjected": 123,
  "skus": 10
 },
 "routes": 25,
 "serviceWorker": {
  "install": {
   "scope": "http://127.0.0.1:9500/",
   "active": "http://127.0.0.1:9500/sw.js",
   "state": "activated"
  },
  "afterReload": {
   "controller": "http://127.0.0.1:9500/sw.js",
   "caches": [
    "gbg-r0-57caf9a3",
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
    "gbg-r0-57caf9a3-acceptance-update"
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

Raw outputs: the machine-readable `raw` sections of the JSON file of this pass, and the files in `pass-112-artifacts/` (screenshots, diffs, tool output).
