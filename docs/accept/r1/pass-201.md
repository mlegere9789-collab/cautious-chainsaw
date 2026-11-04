# Acceptance pass 201: DEFECTS (incomplete)

Started 2026-10-20T15:21:43.714Z, finished 2026-10-20T15:26:53.841Z.

| | |
|---|---|
| Candidate | `tmp\r1\r1-4dcaf80f.zip` (zip) |
| Candidate SHA-256 | `aad41420f5ff3de200836e099f80d2adbeee968a501fc2c71a5d8ff842ad2fcd` |
| Tree digest (sha256 of path+hash list) | `a55f04f90836893c3f3dd8dc129e6eee9812ef336d8eca9a03621242498f1a5f` |
| Files | 2013 |
| Baseline (published build) | `baseline\dist` |
| Harness digest | `a7c9b9797aada217bf1589f1270635a7cebd309e4be728c94685af8172f020bb` (32 files) |
| Node / Python | v24.19.0 / Python 3.11.9 |
| Chrome | Chrome/155.0.8059.82 |
| Playwright-core / axe-core | 1.63.0 / 4.13.0 |
| OS / CPU | Windows_NT 10.0.26200 x64; 16 x Intel(R) Core(TM) Ultra 7 265H; 34 GB |
| Repo HEAD | 17ba8ee789133164815e11c4f2e740de86524862 |
| Mapbox tile requests | 490 of cap 20000 (cap-blocked 0) |
| Soak | 60 s |

A pass is CLEAN only if all eight checks RAN and found zero defects. A check that did not run is never a pass.

## Summary

| # | Check | Status | Defects | Notes | Time |
|---|---|---|---|---|---|
| 5 | Performance | PARTIAL (parts NOT RUN) | 8 | 1 | 308 s |

## Check 5: Performance

Status: **RAN**. Defects: 8. Notes: 1.

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
   "inp": 184
  }
 ],
 "soak": [
  {
   "shell": "desktop",
   "seconds": 60,
   "samples": 6,
   "startMB": 21.18,
   "endMB": 24.34,
   "growthPercent": 14.92,
   "maxHeartbeatMs": 8,
   "domNodes": [
    1424,
    2341
   ]
  }
 ]
}
```

Defects by code: tbt x6, heap-growth x1, dom-node-growth x1

| code | where | detail |
|---|---|---|
| tbt | phone /compare | TBT proxy 214 ms > 200 ms (6 long tasks; cpu 4x) |
| tbt | phone /ground-remembers | TBT proxy 695 ms > 200 ms (9 long tasks; cpu 4x) |
| tbt | phone /immersive | TBT proxy 372 ms > 200 ms (6 long tasks; cpu 4x) |
| tbt | phone / | TBT proxy 877 ms > 200 ms (15 long tasks; cpu 4x) |
| tbt | phone /viewshed | TBT proxy 543 ms > 200 ms (6 long tasks; cpu 4x) |
| tbt | phone /watch-together | TBT proxy 457 ms > 200 ms (6 long tasks; cpu 4x) |
| heap-growth | desktop soak 60s | JS heap grew 14.9% (21.18 MB -> 24.34 MB after forced GC) > 10% |
| dom-node-growth | desktop soak 60s | DOM nodes 1424 -> 2341 (+64.4%) |

<details><summary>Notes (information, not defects)</summary>

- short-soak @ desktop soak 60s: soak ran 60 s; the acceptance run needs --soak-seconds 600

</details>

Raw outputs: the machine-readable `raw` sections of the JSON file of this pass, and the files in `pass-201-artifacts/` (screenshots, diffs, tool output).
