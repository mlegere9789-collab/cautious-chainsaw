# Acceptance pass 301: DEFECTS (incomplete)

Started 2026-10-20T15:49:11.429Z, finished 2026-10-20T15:54:21.509Z.

| | |
|---|---|
| Candidate | `tmp\r1\r1-56beea36.zip` (zip) |
| Candidate SHA-256 | `24aaf4e6dd1258f7562c13b8f36de47dd997b19b99558bc388facd7f22c59f23` |
| Tree digest (sha256 of path+hash list) | `47d3f80993228c1fdbd4802e529c6dac50ae4bbdc66f7708b6e03836e9c67246` |
| Files | 2013 |
| Baseline (published build) | `baseline\dist` |
| Harness digest | `e7ef98150dcb918a4bc8905b9081d934f446a61d6daf5ea457aaf9ddd4e28ef3` (32 files) |
| Node / Python | v24.19.0 / Python 3.11.9 |
| Chrome | Chrome/155.0.8059.82 |
| Playwright-core / axe-core | 1.63.0 / 4.13.0 |
| OS / CPU | Windows_NT 10.0.26200 x64; 16 x Intel(R) Core(TM) Ultra 7 265H; 34 GB |
| Repo HEAD | 17ba8ee789133164815e11c4f2e740de86524862 |
| Mapbox tile requests | 482 of cap 20000 (cap-blocked 0) |
| Soak | 60 s |

A pass is CLEAN only if all eight checks RAN and found zero defects. A check that did not run is never a pass.

## Summary

| # | Check | Status | Defects | Notes | Time |
|---|---|---|---|---|---|
| 5 | Performance | PARTIAL (parts NOT RUN) | 6 | 1 | 308 s |

## Check 5: Performance

Status: **RAN**. Defects: 6. Notes: 1.

**Parts of this check that did NOT run (a pass cannot be clean with these):**

- desktop animation 1x: could not press Play
- desktop animation 4x: could not press Play
- phone animation 1x: could not press Play
- phone animation 4x: could not press Play

Metrics:

```json
{
 "setup": {
  "phoneCpuThrottle": 4,
  "desktopCpuThrottle": 1,
  "networkThrottle": "none (local server)",
  "frameSeconds": 12,
  "soakSeconds": 60
 },
 "chrome": "Chrome/155.0.8059.82",
 "vitalsPages": 50,
 "webglRenderer": "ANGLE (Intel, Intel(R) Arc(TM) Pro 140T GPU (16GB) (0x00007D51) Direct3D11 vs_5_0 ps_5_0, D3D11)",
 "frames": [],
 "inp": [
  {
   "shell": "desktop",
   "interactions": 30,
   "inp": 72
  },
  {
   "shell": "phone",
   "interactions": 10,
   "inp": 176
  }
 ],
 "soak": [
  {
   "shell": "desktop",
   "seconds": 60,
   "samples": 6,
   "startMB": 21.2,
   "endMB": 23.5,
   "growthPercent": 10.82,
   "maxHeartbeatMs": 5,
   "domNodes": [
    930,
    1000
   ]
  }
 ]
}
```

Defects by code: tbt x5, heap-growth x1

| code | where | detail |
|---|---|---|
| tbt | phone /ground-remembers | TBT proxy 511 ms > 200 ms (8 long tasks; cpu 4x) |
| tbt | phone / | TBT proxy 751 ms > 200 ms (16 long tasks; cpu 4x) |
| tbt | phone /sandbox | TBT proxy 369 ms > 200 ms (4 long tasks; cpu 4x) |
| tbt | phone /viewshed | TBT proxy 418 ms > 200 ms (7 long tasks; cpu 4x) |
| tbt | phone /watch-together | TBT proxy 404 ms > 200 ms (5 long tasks; cpu 4x) |
| heap-growth | desktop soak 60s | JS heap grew 10.8% (21.2 MB -> 23.5 MB after forced GC) > 10% |

<details><summary>Notes (information, not defects)</summary>

- short-soak @ desktop soak 60s: soak ran 60 s; the acceptance run needs --soak-seconds 600

</details>

Raw outputs: the machine-readable `raw` sections of the JSON file of this pass, and the files in `pass-301-artifacts/` (screenshots, diffs, tool output).
