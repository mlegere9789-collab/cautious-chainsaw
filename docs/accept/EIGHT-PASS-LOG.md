# Eight-pass log: end-of-mission acceptance

Rule (owner, FINAL-ACCEPTANCE.md): eight CONSECUTIVE fresh clean passes; any defect resets the count to 0; no code or candidate change in between. This file is written by `tools/accept/run_eight.mjs` only; it reports success only if the latest run below says ACCEPTED.

## Status: DEFECT FOUND (counter reset to 0)

Consecutive clean passes in the latest run: **0 of 8**.

### Run started 2026-11-01T12:32:03.231Z

- Candidate: `deliver\gettysburg-R1f-5f898a66-PRODUCTION.zip`, SHA-256 `a36f288381bd8e40f328ab4a1d1787355f378cfa54c10897ba8f7a86606e368c`
- Harness digest `15bdf47844bd33d842e890b12a0f93904226c60a560ef0a629a43ef9552f4d2a`; baseline tree `72b47b7abe633c0180431a837d42c4c45e08ce491c1d45efb599f085780024df`; built dist of R1f `b7d36dd9fcdda347b874cf03e60db1e469145bc057d9f991e0ad446cb35468f5`
- Soak 600 s; accuracy fast subset (accuracy_subset.json)
- Result: **DEFECT FOUND (counter reset to 0)** (finished 2026-11-01T15:12:54.989Z)

| pass | verdict | defects | checks not (fully) run | seconds | detail |
|---|---|---|---|---|---|
| 1 | CLEAN | 0 | none | 4821 | `docs\accept\passes\pass-1.json` |
| 2 | DEFECTS | 1 | none | 4828 | `docs\accept\passes\pass-2.json` |

First defects of pass 2:

- [4] long-task-during-interaction @ desktop /compare :: button "3D Terrain": enter: long task(s) [51] ms (limit 50 ms) ; animation frames: [{"at":16,"d":63,"blocking":2,"beforeRender":12,"scripts":["FrameRequestCallback 51ms mapbox-gl.js

### Run started 2026-11-01T09:41:35.246Z

- Candidate: `deliver\gettysburg-R1f-5f898a66-PRODUCTION.zip`, SHA-256 `8836ae36d09a95442c884621cbce2c638b49a4300ed87a90472bd5d21c75a682`
- Harness digest `15bdf47844bd33d842e890b12a0f93904226c60a560ef0a629a43ef9552f4d2a`; baseline tree `72b47b7abe633c0180431a837d42c4c45e08ce491c1d45efb599f085780024df`; built dist of R1f `2ed934dd44e52b6c9783e0be571b889462ce3a8061651e5c014288ac196d30fc`
- Soak 600 s; accuracy fast subset (accuracy_subset.json)
- Result: **DEFECT FOUND (counter reset to 0)** (finished 2026-11-01T11:01:51.260Z)

| pass | verdict | defects | checks not (fully) run | seconds | detail |
|---|---|---|---|---|---|
| 1 | DEFECTS | 1 | none | 4815 | `docs\accept\passes\pass-1.json` |

First defects of pass 1:

- [4] long-task-during-interaction @ desktop app main :: button "Unit Roster": space: long task(s) [52] ms (limit 50 ms) ; animation frames: [{"at":161,"d":50,"blocking":0,"beforeRender":9,"scripts":["TimerHandler:setTimeout 5ms :repositio

### Run started 2026-11-01T07:18:42.924Z

- Candidate: `deliver\gettysburg-R1f-5f898a66-PRODUCTION.zip`, SHA-256 `212027899f1638fb1c8d54ccf1cf82cdc26fe9855ead2fe9b1850705fbc34de8`
- Harness digest `15bdf47844bd33d842e890b12a0f93904226c60a560ef0a629a43ef9552f4d2a`; baseline tree `72b47b7abe633c0180431a837d42c4c45e08ce491c1d45efb599f085780024df`; built dist of R1f `d3d8c887a5d69a15729835fc6a6c662f0c6bd6c9c378f1f6f63a69c2da9710d6`
- Soak 600 s; accuracy fast subset (accuracy_subset.json)
- Result: **DEFECT FOUND (counter reset to 0)** (finished 2026-11-01T08:39:02.739Z)

| pass | verdict | defects | checks not (fully) run | seconds | detail |
|---|---|---|---|---|---|
| 1 | DEFECTS | 1 | none | 4818 | `docs\accept\passes\pass-1.json` |

First defects of pass 1:

- [4] input-console-warning @ phone /watch-together: WebSocket connection to 'wss://0.peerjs.com/peerjs?key=peerjs&id=gtbg-wt-RCLVB&token=qpj28jsajg&version=1.5.4' failed: WebSocket is closed before the connection

### Run started 2026-11-01T05:32:26.902Z

- Candidate: `deliver\gettysburg-R1f-5f898a66-PRODUCTION.zip`, SHA-256 `212027899f1638fb1c8d54ccf1cf82cdc26fe9855ead2fe9b1850705fbc34de8`
- Harness digest `15bdf47844bd33d842e890b12a0f93904226c60a560ef0a629a43ef9552f4d2a`; baseline tree `72b47b7abe633c0180431a837d42c4c45e08ce491c1d45efb599f085780024df`; built dist of R1f `d3d8c887a5d69a15729835fc6a6c662f0c6bd6c9c378f1f6f63a69c2da9710d6`
- Soak 600 s; accuracy fast subset (accuracy_subset.json)
- Result: **DEFECT FOUND (counter reset to 0)** (finished 2026-11-01T06:52:29.742Z)

| pass | verdict | defects | checks not (fully) run | seconds | detail |
|---|---|---|---|---|---|
| 1 | DEFECTS | 1 | none | 4802 | `docs\accept\passes\pass-1.json` |

First defects of pass 1:

- [5] tbt @ phone /viewshed: TBT proxy 307 ms > 200 ms (6 long tasks; cpu 4x)

### Run started 2026-10-31T00:21:06.886Z

- Candidate: `deliver\gettysburg-R1e-c2afeeda-PRODUCTION.zip`, SHA-256 `8b5503b82494cbe46dd0d18600d35ad8ea148a0e43737e43822d0f7227aea075`
- Harness digest `ecd5d32ad66797525991ab42059beb9d62a91bca857d2265a73b61753ef438cd`; baseline tree `72b47b7abe633c0180431a837d42c4c45e08ce491c1d45efb599f085780024df`; built dist of R1e `e10da39692a0df1d31d9528f4ce5dae2e97097f620abc5b37129151557d30457`
- Soak 600 s; accuracy fast subset (accuracy_subset.json)
- Result: **DEFECT FOUND (counter reset to 0)** (finished 2026-10-31T01:41:23.246Z)

| pass | verdict | defects | checks not (fully) run | seconds | detail |
|---|---|---|---|---|---|
| 1 | DEFECTS | 2 | none | 4816 | `docs\accept\passes\pass-1.json` |

First defects of pass 1:

- [4] long-task-during-interaction @ desktop app main :: button "🗺 Virtual Walkthrough": click: long task(s) [70] ms (limit 50 ms) ; animation frames: [{"at":99,"d":84,"blocking":21,"beforeRender":14,"scripts":["FrameRequestCallback 70ms :@1059"]}]
- [4] long-task-during-interaction @ desktop app main :: button "Monuments": click: long task(s) [58] ms (limit 50 ms) ; animation frames: [{"at":34,"d":72,"blocking":8,"beforeRender":14,"scripts":["FrameRequestCallback 57ms :@1059"]}]

## What this acceptance does NOT cover

- Real devices (iOS/WebKit, Android Chrome, Samsung Internet), real touch hardware, dvh/safe-area insets, notches, keyboards.
- Safari and Firefox (only Chrome, the system build recorded in each pass, headless, with software or whatever GPU the host has).
- Lighthouse CI proper (scores, throttled network, mobile emulation profile); the vitals here are measured with the Performance API on a local server.
- Netlify edge behaviour: only the generated `_headers`/`_redirects` are emulated; compression, CDN caching and header merging are not.
- A screen reader, real users, or anything after publication.
- External links and third-party services (Google, NPS, Mapbox outside the capped side channel) are not exercised for correctness.
- The accuracy check runs the fast subset unless `--full`: see `tools/accept/accuracy_subset.json` for what was left out and why.
