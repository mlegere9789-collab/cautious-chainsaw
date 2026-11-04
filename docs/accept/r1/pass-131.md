# Acceptance pass 131: DEFECTS (incomplete)

Started 2026-10-20T14:04:10.622Z, finished 2026-10-20T14:06:51.761Z.

| | |
|---|---|
| Candidate | `deliver\gettysburg-R1c-2531699e-PRODUCTION.zip` (zip) |
| Candidate SHA-256 | `4b6799863d7f242edc4a2bea98be0028c2dbab214e66c621eb971e8e876d9452` |
| Tree digest (sha256 of path+hash list) | `b279998713873674dcb921431aac69615063146736c6297bc8df758826204a3f` |
| Files | 127 |
| Baseline (published build) | `baseline\dist` |
| Harness digest | `a7c9b9797aada217bf1589f1270635a7cebd309e4be728c94685af8172f020bb` (32 files) |
| Node / Python | v24.19.0 / Python 3.11.9 |
| Chrome | Chrome/155.0.8059.82 |
| Playwright-core / axe-core | 1.63.0 / 4.13.0 |
| OS / CPU | Windows_NT 10.0.26200 x64; 16 x Intel(R) Core(TM) Ultra 7 265H; 34 GB |
| Repo HEAD | 17ba8ee789133164815e11c4f2e740de86524862 |
| Mapbox tile requests | 280 of cap 20000 (cap-blocked 0) |
| Soak | 20 s |

A pass is CLEAN only if all eight checks RAN and found zero defects. A check that did not run is never a pass.

## Summary

| # | Check | Status | Defects | Notes | Time |
|---|---|---|---|---|---|
| 4 | Input matrix (desktop + phone) | RAN, DEFECTS | 2 | 22 | 161 s |

## Check 4: Input matrix (desktop + phone)

Status: **RAN**. Defects: 2. Notes: 22.

Metrics:

```json
{
 "chrome": "Chrome/155.0.8059.82",
 "activations": {
  "desktop": {
   "/immersive": {
    "total": 11,
    "hidden": 0,
    "disabled": 1,
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
   "/immersive": {
    "total": 11,
    "hidden": 0,
    "disabled": 1,
    "unnamed": 0,
    "activations": 13
   },
   "/watch-together": {
    "total": 21,
    "hidden": 1,
    "disabled": 1,
    "unnamed": 0,
    "activations": 21
   }
  }
 },
 "activationRows": 75,
 "latency": {
  "n": 58,
  "p50": 26.7,
  "p95": 49.5,
  "max": 56,
  "unmeasuredFastUnder16ms": 17
 },
 "preferencePages": 6
}
```

Defects by code: input-console-warning x2

| code | where | detail |
|---|---|---|
| input-console-warning | desktop /watch-together | WebSocket connection to 'wss://0.peerjs.com/peerjs?key=peerjs&id=gtbg-wt-XHVVK&token=cdfocl6cjzv&version=1.5.4' failed: WebSocket is closed before the connection is established. @ https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js:6 |
| input-console-warning | phone /watch-together | WebSocket connection to 'wss://0.peerjs.com/peerjs?key=peerjs&id=gtbg-wt-AVNAA&token=dd68rjdftyk&version=1.5.4' failed: WebSocket is closed before the connection is established. @ https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js:6 |

<details><summary>Notes (information, not defects)</summary>

- disabled-control-skipped @ desktop /immersive: button "▶ Play"
- repeat-activation-no-change @ desktop /immersive :: slider "Volume": arrow: the control received the activation but nothing visible changed (an earlier mode did change something; repeated input is idempotent?)
- link-not-activated @ desktop /immersive :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /immersive :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- control-gone-after-activation @ desktop /immersive :: button "🔊 Enable Sound & Start": the control is no longer shown after click (a dismiss/close control or a state change); enter not applicable
- disabled-control-skipped @ desktop /watch-together: button "▶ Play tour"
- repeat-activation-no-change @ desktop /watch-together :: button "⇩ Export tour (.json)": enter: the control received the activation but nothing visible changed (an earlier mode did change something; repeated input is idempotent?)
- repeat-activation-no-change @ desktop /watch-together :: button "⇩ Export tour (.json)": space: the control received the activation but nothing visible changed (an earlier mode did change something; repeated input is idempotent?)
- link-not-activated @ desktop /watch-together :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ desktop /watch-together :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- external-link-not-activated @ desktop /watch-together :: link "© Mapbox": https://www.mapbox.com/about/maps (offline run)
- external-link-not-activated @ desktop /watch-together :: link "© OpenStreetMap": https://www.openstreetmap.org/copyright/ (offline run)
- external-link-not-activated @ desktop /watch-together :: link "Improve this map": https://apps.mapbox.com/feedback/?owner=mapbox&id=satellite-v9&access_token=pk.eyJ1IjoibWxlZ2VyZTk3ODkiLCJhIjoiY21xcHptODEyMGJydDJycWFhaWY0ZHVsMCJ9.aJvnELJlXEs3nYrWx4Eg5Q#/-77.235/39.81/13 (offline run)
- external-link-not-activated @ desktop /watch-together :: link "© Maxar": https://www.maxar.com/ (offline run)
- disabled-control-skipped @ phone /immersive: button "▶ Play"
- link-not-activated @ phone /immersive :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ phone /immersive :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)
- control-gone-after-activation @ phone /immersive :: button "🔊 Enable Sound & Start": the control is no longer shown after tap (a dismiss/close control or a state change); enter not applicable
- disabled-control-skipped @ phone /watch-together: button "▶ Play tour"
- repeat-activation-no-change @ phone /watch-together :: button "⇩ Export tour (.json)": enter: the control received the activation but nothing visible changed (an earlier mode did change something; repeated input is idempotent?)
- link-not-activated @ phone /watch-together :: link "Contact": mailto:gettysburginteractivemap@gmail.com (download/mailto/pdf: reachability is proven by the crawl in check 2)
- link-not-activated @ phone /watch-together :: link "User Guide (PDF)": /user-guide.pdf (download/mailto/pdf: reachability is proven by the crawl in check 2)

</details>

Raw outputs: the machine-readable `raw` sections of the JSON file of this pass, and the files in `pass-131-artifacts/` (screenshots, diffs, tool output).
