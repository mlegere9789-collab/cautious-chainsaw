# Acceptance pass 703: DEFECTS (incomplete)

Started 2026-10-22T16:40:31.026Z, finished 2026-10-22T16:55:34.968Z.

| | |
|---|---|
| Candidate | `tmp\r1e\r1e\dist` (dir) |
| Candidate SHA-256 | `(directory)` |
| Tree digest (sha256 of path+hash list) | `33620b6d54120c2b3cb84c51c289ed4a3b738a9dcc9e108d087c5468ea3ce49d` |
| Files | 2013 |
| Baseline (published build) | `baseline\dist` |
| Harness digest | `5d6da30f5b20e721e8b525ebc4ccea2bfad0c48368b16e3df4738a34fbd81142` (34 files) |
| Node / Python | v24.19.0 / Python 3.11.9 |
| Chrome | Chrome/155.0.8059.82 |
| Playwright-core / axe-core | 1.63.0 / 4.13.0 |
| OS / CPU | Windows_NT 10.0.26200 x64; 16 x Intel(R) Core(TM) Ultra 7 265H; 34 GB |
| Repo HEAD | 17ba8ee789133164815e11c4f2e740de86524862 |
| Mapbox tile requests | 487 of cap 20000 (cap-blocked 0) |
| Soak | 600 s |

A pass is CLEAN only if all eight checks RAN and found zero defects. A check that did not run is never a pass.

## Summary

| # | Check | Status | Defects | Notes | Time |
|---|---|---|---|---|---|
| 5 | Performance | RAN, DEFECTS | 2 | 0 | 901 s |

## Check 5: Performance

Status: **RAN**. Defects: 2. Notes: 0.

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
   "max": 34.2,
   "over50": 0,
   "over100": 0,
   "fps": 59.9,
   "longTasks": 0,
   "longTaskMax": 0
  },
  {
   "shell": "desktop",
   "speed": "4x",
   "tick0": 29,
   "tick1": 135,
   "n": 845,
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
   "speed": "1x",
   "tick0": 1,
   "tick1": 27,
   "n": 847,
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
   "speed": "4x",
   "tick0": 29,
   "tick1": 135,
   "n": 843,
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
   "inp": 88
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
   "seconds": 600,
   "samples": 14,
   "startMB": 23.55,
   "endMB": 25.58,
   "growthPercent": 8.64,
   "maxHeartbeatMs": 10,
   "domNodes": [
    929,
    960
   ]
  }
 ]
}
```

Defects by code: tbt x2

| code | where | detail |
|---|---|---|
| tbt | phone /ground-remembers | TBT proxy 345 ms > 200 ms (9 long tasks; cpu 4x) |
| tbt | phone / | TBT proxy 364 ms > 200 ms (13 long tasks; cpu 4x) |

Raw outputs: the machine-readable `raw` sections of the JSON file of this pass, and the files in `pass-703-artifacts/` (screenshots, diffs, tool output).
