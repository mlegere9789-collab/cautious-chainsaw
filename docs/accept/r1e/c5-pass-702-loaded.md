# Acceptance pass 702: DEFECTS (incomplete)

Started 2026-10-22T14:24:29.235Z, finished 2026-10-22T14:31:35.944Z.

| | |
|---|---|
| Candidate | `tmp\r1e\r1e\dist` (dir) |
| Candidate SHA-256 | `(directory)` |
| Tree digest (sha256 of path+hash list) | `4aeaeea509ce3691eff8da027d685d0e119cfb6f0c7c5ffce33312e884b9fe06` |
| Files | 2013 |
| Baseline (published build) | `baseline\dist` |
| Harness digest | `5d6da30f5b20e721e8b525ebc4ccea2bfad0c48368b16e3df4738a34fbd81142` (34 files) |
| Node / Python | v24.19.0 / Python 3.11.9 |
| Chrome | Chrome/155.0.8059.82 |
| Playwright-core / axe-core | 1.63.0 / 4.13.0 |
| OS / CPU | Windows_NT 10.0.26200 x64; 16 x Intel(R) Core(TM) Ultra 7 265H; 34 GB |
| Repo HEAD | 17ba8ee789133164815e11c4f2e740de86524862 |
| Mapbox tile requests | 476 of cap 20000 (cap-blocked 0) |
| Soak | 120 s |

A pass is CLEAN only if all eight checks RAN and found zero defects. A check that did not run is never a pass.

## Summary

| # | Check | Status | Defects | Notes | Time |
|---|---|---|---|---|---|
| 5 | Performance | RAN, DEFECTS | 4 | 1 | 424 s |

## Check 5: Performance

Status: **RAN**. Defects: 4. Notes: 1.

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
  },
  {
   "shell": "desktop",
   "speed": "4x",
   "tick0": 29,
   "tick1": 135,
   "n": 843,
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
   "n": 848,
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
   "inp": 80
  },
  {
   "shell": "phone",
   "interactions": 10,
   "inp": 192
  }
 ],
 "soak": [
  {
   "shell": "desktop",
   "seconds": 120,
   "samples": 9,
   "startMB": 22.24,
   "endMB": 23.9,
   "growthPercent": 7.47,
   "maxHeartbeatMs": 11,
   "domNodes": [
    956,
    932
   ]
  }
 ]
}
```

Defects by code: tbt x4

| code | where | detail |
|---|---|---|
| tbt | phone /compare | TBT proxy 245 ms > 200 ms (5 long tasks; cpu 4x) |
| tbt | phone /ground-remembers | TBT proxy 287 ms > 200 ms (8 long tasks; cpu 4x) |
| tbt | phone / | TBT proxy 282 ms > 200 ms (14 long tasks; cpu 4x) |
| tbt | phone /watch-together | TBT proxy 295 ms > 200 ms (8 long tasks; cpu 4x) |

<details><summary>Notes (information, not defects)</summary>

- short-soak @ desktop soak 120s: soak ran 120 s; the acceptance run needs --soak-seconds 600

</details>

Raw outputs: the machine-readable `raw` sections of the JSON file of this pass, and the files in `pass-702-artifacts/` (screenshots, diffs, tool output).
