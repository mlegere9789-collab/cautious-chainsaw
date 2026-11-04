# Acceptance pass 101: DEFECTS (incomplete)

Started 2026-10-20T11:56:39.534Z, finished 2026-10-20T11:57:55.658Z.

| | |
|---|---|
| Candidate | `tmp\r1\r1-cand.zip` (zip) |
| Candidate SHA-256 | `0cd817c1228606b8cbe9b6d7ef95b580f718d366a0e91be3712ada0cf1a38d35` |
| Tree digest (sha256 of path+hash list) | `e8da2c11ddf75d331c3fd37925087dbf1c7a5de6aa85843aefa03ddf7d4aadd9` |
| Files | 2013 |
| Baseline (published build) | `baseline\dist` |
| Harness digest | `2cf304aad7f05481d537b6e4a888656d615aff44b74bb25c3d35406277b6ddda` (30 files) |
| Node / Python | v24.19.0 / Python 3.11.9 |
| Chrome | Chrome/155.0.8059.82 |
| Playwright-core / axe-core | 1.63.0 / 4.13.0 |
| OS / CPU | Windows_NT 10.0.26200 x64; 16 x Intel(R) Core(TM) Ultra 7 265H; 34 GB |
| Repo HEAD | 17ba8ee789133164815e11c4f2e740de86524862 |
| Mapbox tile requests | 122 of cap 20000 (cap-blocked 0) |
| Soak | 20 s |

A pass is CLEAN only if all eight checks RAN and found zero defects. A check that did not run is never a pass.

## Summary

| # | Check | Status | Defects | Notes | Time |
|---|---|---|---|---|---|
| 1 | Deterministic zip (hash equals the previous pass) | RAN, DEFECTS | 1 | 2 | 0 s |
| 2 | Static hygiene | RAN, DEFECTS | 42 | 6 | 72 s |
| 8 | Copy audit | RAN, DEFECTS | 13 | 3 | 2 s |

## Check 1: Deterministic zip (hash equals the previous pass)

Status: **RAN**. Defects: 1. Notes: 2.

Metrics:

```json
{
 "candidateSha256": "0cd817c1228606b8cbe9b6d7ef95b580f718d366a0e91be3712ada0cf1a38d35",
 "bytes": 35837173,
 "entries": 2013,
 "comparedAgainst": [
  "r1-cand.zip.sha256"
 ]
}
```

Defects by code: no-previous-pass x1

| code | where | detail |
|---|---|---|
| no-previous-pass | C:\Users\mlege\gettysburg-map\docs\accept\r1\pass-100.json | pass 101 needs pass 100's hash (or --prev-sha) to prove determinism |

<details><summary>Notes (information, not defects)</summary>

- zip-hash-equal @ r1-cand.zip.sha256: equals r1-cand.zip.sha256
- repack-skipped @ -: no release/<train>/dist to repack (train unknown)

</details>

## Check 2: Static hygiene

Status: **RAN**. Defects: 42. Notes: 6.

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
   "scope": "http://127.0.0.1:8700/",
   "active": "http://127.0.0.1:8700/sw.js",
   "state": "activated"
  },
  "afterReload": {
   "controller": "http://127.0.0.1:8700/sw.js",
   "caches": [
    "gbg-r0-770d0df8",
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
    "gbg-r0-770d0df8-acceptance-update"
   ],
   "controller": true,
   "loads": 1
  }
 }
}
```

Defects by code: sw-console-error x42

| code | where | detail |
|---|---|---|
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |
| sw-console-error | / | Error @ http://127.0.0.1:8700/assets/index-770d0df8.js:227 |

<details><summary>Notes (information, not defects)</summary>

- crawl-ignored @ -: 5 string literals under /mapbox-gl-js/ ignored: prefix of the Mapbox CDN path (https://api.mapbox.com/mapbox-gl-js/...): Mapbox GL appends it to its own origin at runtime
- fragment-target-not-static @ index.html: #gt-map has no static id (may be created by script)
- fragment-target-not-static @ index.html: #gt-timeline has no static id (may be created by script)
- external-not-checked @ -: 31 references to 6 external hosts were NOT requested (the run is offline by design): catalog.archives.gov, api.mapbox.com, www.metmuseum.org, www.nps.gov, www.mapbox.com, policies.google.com
- unreferenced-files @ -: apple-touch-icon-precomposed.png, icons.svg, tiles1863/v1-65d491b8/11/583/776.webp, tiles1863/v1-65d491b8/11/583/777.webp, tiles1863/v1-65d491b8/11/584/776.webp, tiles1863/v1-65d491b8/11/584/777.webp, tiles1863/v1-65d491b8/11/585/776.webp, tiles1863/v1-65d491b8/11/585/777.webp, tiles1863/v1-65d491b8
- mapbox-cdn-runtime-dependency @ -: 8 pages load mapbox-gl.js/css from https://api.mapbox.com at runtime (SRI-pinned v3.24.1); the app bundles its own copy

</details>

## Check 8: Copy audit

Status: **RAN**. Defects: 13. Notes: 3.

Commands:

- `node tools/accept/copy_audit.mjs r1-cand.zip (in-process)` -> exit null in 0.0 s (whitelist: 0 entries)

Metrics:

```json
{
 "scanned": {
  "files": 2013,
  "bytes": 39620104
 },
 "zip": {
  "entries": 2013,
  "comment": ""
 },
 "blocking": 13,
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

Defects by code: copy:generated by x3, copy:DO NOT EDIT x3, copy:(anonymous) x2, copy:(unspecified) x2, copy:pdf producer/creator tool name x2, copy:AI (whole word, also AI-) x1

| code | where | detail |
|---|---|---|
| copy:generated by | _headers:1 [config-file] | "Generated by" ... # Generated by tools/t0/config/gen.mjs for release 770d0df8 (tra |
| copy:DO NOT EDIT | _headers:1 [config-file] | "DO NOT EDIT" ... elease 770d0df8 (train R1c, context production). DO NOT EDIT. # Invariant: for any URL each header NAME is pro |
| copy:generated by | _redirects:1 [config-file] | "Generated by" ... # Generated by tools/t0/config/gen.mjs. DO NOT EDIT. First mat |
| copy:DO NOT EDIT | _redirects:1 [config-file] | "DO NOT EDIT" ... # Generated by tools/t0/config/gen.mjs. DO NOT EDIT. First matching rule wins; `!` = force (applies |
| copy:generated by | netlify.toml:1 [toml] | "Generated by" ... # Generated by tools/t0/config/gen.mjs for release 770d0df8. DO |
| copy:DO NOT EDIT | netlify.toml:1 [toml] | "DO NOT EDIT" ... by tools/t0/config/gen.mjs for release 770d0df8. DO NOT EDIT. # All headers live in _headers and all redirects |
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

Raw outputs: the machine-readable `raw` sections of the JSON file of this pass, and the files in `pass-101-artifacts/` (screenshots, diffs, tool output).
