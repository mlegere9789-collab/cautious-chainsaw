# 04 - Time model and historical accuracy: the clock and history programme

Status: PROPOSED 2026-09-30, no build or deploy. WP prefix `WP-TIME-NN` (23 WPs). Audit IDs owned: C3, C4, H9, H11 (clock/label part), the clock-driven parts of H4/D3, and the sandbox, documentary, education, turning-points and tour label defects. Tags follow the decision register: [V] re-verified by me on 2026-09-30 (grep of `plan-work/bundle.pretty.js`, `DEPLOY_DIR`, scripts re-run), [S id] specialist or verifier statement, [E] my estimate or derivation, [U] unverified. Line numbers are `bundle.pretty.js` unless a file is named. ADRs obeyed: D-TIME (B), D-HIST-REVIEW (B), D-URLSTATE, D-ORDER, D-SOURCE, D-SITEGEN, D-SW, D-SCOPE-TIERS, D-ENTRY, D-LANG, D-LICENSE, D-CONTACT, D-HIST-ARCH, D-EVIDENCE.

Tested scripts reused (all under `plan-work/`): `tmp-app-time/time-model.mjs` + `time-model.test.mjs` (13/13 pass, re-run [V]), `tf_crosscheck.mjs`, `tf_kin_segments.py`, `kin_fit.py`, `fit_anchors.py`, `err_table.py`, `scan_text_times.py`, `tick-clock.tf.csv` (675-row golden seed), `time_anchors.tf.json`; `tmp-time-facts/{analyze,anchors,site_map,solar}.py`; `tmp-app-bugs/tranche0-validate.js` (date-patch anchors [S app-bugs-01]).

---

## 1. A+ exit criteria (measured on desktop 1440x900 AND phone 375x812; 320 px where stated)

| ID | Criterion | Measurement | Threshold |
|---|---|---|---|
| TX-01 | One clock: same tick, same clock and date string everywhere | e2e at ticks {1,12,17,28,160,226,267,302,451,538,553,675} over every clock surface (HUD, toolbars, time bar, valuetext, cards, toasts, tooltips, ancestor rows, minimap, bookmarks, sub-pages, Historian); `data-historical-quote` excluded | 1 distinct string per tick, equal to `tests/golden/tick-clock.csv`; 0 mismatches on both device classes |
| TX-02 | No impossible date | ban regex ``July \$\{[^}]*[+-] ?\d`` over source and bundle; DOM scan of battle screens | 0 hits (3 today: 97428, 100842, 101006 [V]); no date after July 3 unless an owner-approved epilogue exists |
| TX-03 | Calendar date honest, Day tab is a tick range | 149 ticks (t160-225, t368-450) print the true next-day date and "Night of July N-M" [V computed] | 0 tab numbers printed as dates; jumpToDay(2/3) lands at 04:30 first light |
| TX-04 | Historical fit | each moment with `real.best`: abs(clock - best) <= 30 min, or clock inside `[start,end]` and the moment `approx`; core moments non-decreasing in real time within 1 tick | 0 events over 60 min unless `contested`; 0 MISORDERED, WRONG-DAY, COMPOSITE left; today 5/102 (label), 1/102 (map) within 30 min; proposal in-sample 86/102 [S] |
| TX-05 | No hand-typed clock, no dev vocabulary | TM-V9 and copy lint (section 8) | 0 typed clocks outside the module; 0 visible "tick N", "real time", "five-minute", "minute-by-minute" (allow-list: audio-synthesis and WebRTC statements) |
| TX-06 | Reviewed or labelled | decision record for every R anchor, low-confidence row and content defect; otherwise "Unreviewed reconstruction" plus "about" | 100% coverage; CI fails on "reviewed" or "accurate to the minute" copy without a signed record; data release signed by reviewer plus second reader |
| TX-07 | Honest speed and hour steps | measured battle-min/s at 10 ticks vs label; hour buttons; Battle-time at 60 min/s | label +-5%; hour buttons 60 min +-half a segment; 60 min/s advances 1 h +-1%; 0 "real time" |
| TX-08 | No skipped moment, no time travel | 8x and 16x runs with 50 ms frames; seek 500 to 20; boot then Skip | every HIGH/CRITICAL moment shown once; after seek only units with keyframe <= target; tick 1 shows exactly the 71 units with a tick-1 keyframe [S app-latent-08] |
| TX-09 | Links and bookmarks | the 9 legacy link builders plus `?t`, `?u`, `?ancestor`, `?ll`, `?lat&lng`; pre-change bookmarks | right frame with Day 2/3 data within 3 s; `dv` migration tests pass |
| TX-10 | Lighting matches the sun | solar table; label contrast at t100, t160, t340, t400, t538 | sunrise 04:35 and sunset 19:32 (+-2 min); alpha <= 0.25; units and labels above tint; contrast >= 4.5:1; Daylight toggle; no transition under reduced motion |
| TX-11 | Accessible time | native range 1-675 with valuetext; live region; `<time datetime>`; `translate="no"` | axe 0; <= 1 announcement/s; clock text >= 12 px |
| TX-12 | Clock costs nothing | bundle, network, commits, CLS | <= 2.5 KB brotli; 0 requests before first paint (anchors inlined); HUD commits <= 1 per integer tick; clock CLS <= 0.001; `tickToClock` <= 5 us |
| TX-13 | Mobile parity | 320/375/414 px | 1 date+time in the header, no "Tick n/675", targets >= 44 px, no overflow, no `split(", ")` parsing (102977) |
| TX-14 | Public transparency | pages live and linked | About the clock, Sources & Times, /corrections; every anchor shows range, evidence class, sources; corrections@ works (D-CONTACT) |
| TX-15 | Regression proof | CI | TM-V1..V21 `--strict` zero findings; golden diff reviewed; one-clock green on both classes; mutation test turns CI red |

---

## 2. Verified current state (facts only)

### 2.1 The clock today

- Nine independent tick-to-clock implementations [V]: store `getTickTime` 9371-9383 (Day 1 base 06:00, Days 2-3 base 04:00, correct date, no midnight rollover); HUD `_F` 97428 `July ${l + 2}, 1863`; `JF` 100836-100843 (05:00 base, `+ 2`, day from `monument.day`); `QF` 100998-101007 (05:00, `+ 2`); `M4/E4` 9856-9884 (05:00 tint); four static copies: compare.html:114-129, living-ledger.html:135-144 (`DAY_BOUNDS [1,226,451,676]`; dashboard.html:85 uses `[1,225,450,675]`), camera.html:175-179, immersive.html:169-173. Typed clocks beside ticks are listed in section 5.
- Same tick, different clocks [V, S app-time 2.4]: t28 (real 10:15 AM) is 8:15 AM toolbar, 7:20am event card, "7:15 AM July 3" tooltip, "July 3, 1863" HUD. t538 (real about 3:00 PM) is 11:15 AM toolbar, 11:05am card, "12:15 PM July 5" tooltip. t451 is 4:00 AM toolbar vs the data's 5:00am. t217-225 print "July 1, 12:xx AM".
- Error [S time-facts, recomputed]: over 102 single-event matches the label is off by mean 4.79 h (median 3.92, 5/102 within 30 min), the map clock 4.82 h (1/102), the 5-minute formula 4.52 h (7/102). The 33-anchor proposal: mean 21 min, median 10, 86/102 within 30 in-sample; off-anchor (72 events) mean 28.8, median 17.5, RMS 55, 56/72 within 30; 32 of 102 comparators are the specialist's own estimates; leave-one-out RMS 44 min [S verifier]. 94 of 137 labels differ from the file's own `tick_formula`, 46 by over 30 min [S DI-11].
- Chronology classes (137 events; counts re-derived [V] from `time-facts-discrepancy.csv`): RELABEL 60, RELABEL-CONTESTED 36, MISORDERED 12, COMPOSITE 9, CONTEXT 8, TEXT-VS-LABEL 6, WRONG-DAY 4, UNVERIFIED-QUOTE 2; day files 42/49/46 events.
- Anchor geometry [V computed from `time-facts-anchors.csv`]: 33 anchors strictly monotone, S 12, M 13, R 5 (t75, t90, t248, t275, t538), D 3 (t100, t226, t675); slope 0.83-42.33 min/tick, mean 5.61; span 63.0 h; calendar midnight at t160 and t368, so 149 ticks (22.1%) have a date different from their Day tab; 220 ticks (32.6%) are full night (before 04:03 or after 20:46). At 2 ticks/s, 1x is 1.7 to 84.7 battle-min/s (mean 11.2). Lulls over 15 min/tick: 5-12, 226-240, 240-248, 515-518; stalls under 1.5: 295-302, 302-314.
- Event density [V computed]: 0 chronology events in t101-225 (125 ticks; under the anchors 8:00 PM July 1 to 4:26 AM July 2, i.e. NIGHT, not "afternoon" as ux-flows-26 says under the map clock) and 6 in t341-450 (t360, 380, 400, 420, 440, 450; four move in triage). After triage 235 of 675 ticks (34.8%) are night with almost no chronology [E].
- Playback and engine: `cF = 500` (96948), 1x = 2 ticks/s, HUD "1x (real time)" (97429); buttons to 8x, key `+` to 16x (112998); unclamped dt (96977-96986); `const i2 = {}` never cleared (96265); boot splash sweeps the store 1 to 675 (`eO = 3500`, 101471) and resets to tick 1 (101500); event card exact-tick match (98607); "Tick N" in toasts, unit panel, jump button; minimap counts exact-tick rows (99821); Day 2/3 placements load only when playback crosses ticks 200/420 [S app-latent-05]. Data: 1,804 rows, 188 of 675 ticks populated, 478 units, 167 with one keyframe, median keyframe gap 17 ticks, 56.7% of gaps over 12 [S app-bugs-07].
- Links: the only query read is `ancestor` (101019) inside `Zk`, which mounts only after the panel toggles [S app-time-06]; share builder writes `?t=&u=&z=&ll=` (97822-97830); 9 builders in 7 pages write `?tick=&vignette=` etc. Bookmarks: `localStorage["gettysburg_bookmarks"]` (97821-97864) store `tick` and label; BookmarkPanel prints "Tick N".
- Copy [V]: "real time", "five-minute", "minute-by-minute" at index.html:15,18,24,32,719,745,754, manifest.json:4, terms.html:30, ground-remembers.html:42, living-ledger.html, site-nav.js:46, splash 111893; Help chunk "Advance one tick (5 minutes)", "Advance one hour (12 ticks)", "445+".

### 2.2 Specialist corrections applied

1. app-time-01: renaming the entry chunk is not enough; `HelpModal-CFV9T0zH.js` and `BookmarkPanel-C5YT4b5k.js` import `./index-Cg8FAMXN.js` and are `immutable` [V]: rename both and rewrite the specifiers at 112469-112470 (WP-TIME-21). A date-only patch leaves tooltip contradictions and the toolbar's double date (113084-113088).
2. app-time-02: rejecting a re-keyed 5-minute grid stands, but "infeasible without inventing data" is overstated; what holds is tick permanence (links, bookmarks), about 757 ticks at 5 min (`tick_max` and tabs change) and the charge's 1.5 min/tick. `tickAfterMinutes` needs a no-op guard.
3. app-time-03: anchor t5 is circular (import as D sigma 30 or drop). app-time-04 and time-facts-04: effort L-XL; t420 is NOT established as WRONG-DAY; 16 events (12+4) plus t8.
4. time-facts-01: the 21-minute and "independent 30-claim" figures are in-sample or partly circular; the spec'd string "July 1, 1863, 7:30 AM" would render "1863" on mobile (`split(", ")[1]`, 102977), so the legacy `July N, h:mm AM` shape is kept.
5. time-facts-06: V-015 is correct, only chronology t525 is wrong; Farnsworth "nominated June 29, never confirmed"; V-022 range reaches about noon. time-facts-08: cap the tint, no hard-coded full moon. time-facts-09: `InterpolationWorker` is dead code. time-facts-15 REFUTED (430k records is false metadata), dropped; Battle-time mode replaces it.
6. app-bugs-07 verifier: a fixed 12-tick glide limit conflicts with the data; gliding is decided by displacement and speed in battle-minutes. Verifier-found gaps now in scope (WP-TIME-12, 17, 21): ensureDay before a deep-link tick, toast burst after a paused seek, minute-blind windows, splash priming `i2`.
7. app-time-13: `sha256(file)[:8] === name` can never pass; use a committed lockfile. app-time-14: the gate runs in GitHub Actions, not a Netlify `[build] command` on drag-and-drop deploys (D-CI-HOST). app-time-20: root cause confirmed (z 100 tie) but do not blanket-unmount (`LF`, `CF`, `qF`, `nO` have no mobile counterpart). data-integrity-01 verifier: speed caps must take dt from the clock (segments over 8 mph rise from 2 to 6).

---

## 3. Work-package table

Effort: S < 0.5 d, M 0.5-2, L 2-5, XL > 5; days are person-days [E] excluding reviewer hours. Tier per D-SCOPE-TIERS.

| WP | Title | Tier | Effort (days) | Depends on | Moves |
|---|---|---|---|---|---|
| WP-TIME-01 | Interim date fix, Tranche 0 patch D | 1 | S (0.3-0.5) | patch runner, 21 | C3 |
| WP-TIME-02 | Canonical time module, schemas, dual build, golden | 1 | M-L (1.5-3) | none | C3, C4, H9 |
| WP-TIME-03 | Anchor adoption, evidence classes, sigma, constrained fit | 1 | M (1-2) | 02 | C4 |
| WP-TIME-04 | Review programme: charter, queue, states, public surfaces | 1 | M (1.5-2.5) + 31-51 reviewer h | 03, WP-DEC-10/11 | C4, H10 |
| WP-TIME-05 | Moments registry, permanent ids, migrations | 1 | M-L (2-3.5) | 03 | C4, H7 |
| WP-TIME-06 | Data regeneration and metadata truth | 1 | M (1-1.5) | 02, 05 | C4 |
| WP-TIME-07 | Content triage: wrong-day, misordered, composite | 1 | L (3-5) + reviewer | 04, 05 | C4 |
| WP-TIME-08 | Text, quotation, vignette corrections | 1 | S-M (0.5-1) | 04 | C4, H7 |
| WP-TIME-09 | Placement arrival audit, kinematics (V7) | 1 | M-L (1.5-3) | 03, 04 | C4 |
| WP-TIME-10 | Core clock surfaces (legacy bridge or rebuild) | 1 | M-L (2-3.5); bridge +2-4 | 02, 05, 06 | C3, C4, H11 |
| WP-TIME-11 | Playback semantics, hour steps, Battle-time mode | 1 | M (1.5-3) | 02 | H9 |
| WP-TIME-12 | Seek-safe state, crossing triggers, ensureDay, windows | 1 | M (1.5-3) | 02, D-UNIT-RENDER | D3, H4, C4 |
| WP-TIME-13 | Solar-driven lighting | 2 | S-M (0.5-1.5) | 02 | C4 |
| WP-TIME-14 | Sub-pages and exports adopt the module | 2 (1 for Search, Report, Regiment, Embed) | M-L (2.5-4.5) | 02, 05, 06 | C4, S4 |
| WP-TIME-15 | Permalinks, bookmarks, `dv` migration | 1 | M (0.75-1.5) | 05, D-URLSTATE | C4 |
| WP-TIME-16 | Truthful copy, About the clock, guide | 1 | S-M (0.75-1.5) | 02; clock text waits for 04 | H9, H10, G1 |
| WP-TIME-17 | Display honesty and accessibility of time | 1 | M (1-2) | 02, 10 | A2, A6 |
| WP-TIME-18 | Intensity per battle-minute | 2 (audio 3) | M (1-2) | 02 | C4 |
| WP-TIME-19 | Historian time-facts tier and temporal index | 1 | M (1-2) | 04, 05, D-HIST-ARCH | H8, C4 |
| WP-TIME-20 | Validators, golden, e2e, CI gates | 1 | M-L (2.5-4) | 02 | all TX |
| WP-TIME-21 | Release and cache rules for time artefacts | 1 | S (0.25-0.5) | D-ORDER | N1, C6 |
| WP-TIME-22 | Event-less stretches, night moments | 2 | L (3-5) + 6-10 reviewer h | 04, 07 | C4 |
| WP-TIME-23 | July 4 epilogue, ticks 676+ (optional, deferred) | 3 | L (3-5) if scheduled | 04, owner | C4 |

Totals [E]: core path (WPs 01-08, 10-12, 15-17, 20, 21) 21-38.5 person-days; extended (09, 13, 14, 18, 19, 22) 9.5-18; gross 31-56 excluding WP-TIME-23 and reviewer hours. See section 12 for the conflict with the register envelope.

---

## 4. Design specifications

### 4.1 Invariants (README and CI)

1. Ticks 1..675 are permanent opaque frame IDs, append-only above 675, never renumbered; keyframes, links and bookmarks keep meaning "that frame".
2. The clock is a derived strictly monotone piecewise-linear function of the tick, defined only by `time_anchors.json`; nothing else converts tick to time (TM-V9).
3. The calendar date derives from absolute minutes and rolls at midnight. The Day tab is a tick range naming the first-light date; it is never printed as a date.
4. Every displayed time carries uncertainty; UI rounds to 5 minutes, internals stay exact.
5. Story beats are moments with permanent slug ids; tick is an attribute, real-time evidence and review state are properties.
6. A link carries `tick` (frame), a moment id (identity) and `dv` (calibration stamp).
7. Nothing prints a clock that is not module output; quotations with 1863 clocks sit in `data-historical-quote`.
8. Pace is a UI concern: Story (tick driven) or Battle-time (clock driven).

### 4.2 Module contract (`packages/time`, TypeScript, zero dependencies, no `Date`, no `Intl`)

One source, two builds: ESM (app, Astro build, Node validators, Historian index build) and an IIFE global `GTBGTime` for classic-script pages (compare, living-ledger, camera, immersive are classic IIFEs [S app-time-11]). Anchors are inlined at build (about 2 KB, no first-paint fetch [S time-facts MISSED-3]); `time_anchors.json` remains the source. Hashed filenames only (WP-TIME-21).

```ts
makeTimeModel(cfg): {
  version; dv; tickMax;
  tickToClock(t): { iso, minutes, date, weekday, hour24, minute, tab, mpt, sigmaMin, approx, night, signed };
  clockToTick(iso | minutes): number;              // fractional, clamps to 1..tickMax, exact:false when clamped
  tickToMinutes, minutesToTick, minutesPerTick, uncertaintyMin, tabDay, tabStart, parts(t, roundMin),
  format(t, style, {roundMin, approx}),            // time | date | long | short | iso | aria | compat
  dayPart(t), sun(t) -> { alpha, tint, phase },    // WP-TIME-13
  tickAfterMinutes(t, dm),                         // never a no-op for |dm| >= half a segment
  isGap(t), ticksJson(), goldenCsv() }
```
`compat` keeps the legacy `July N, h:mm AM` shape (comma-splittable, no year) for the frozen bundle only. `format` uses no locale or time zone. Load-time validation throws: first tick 1, last = `tick_max`, strictly increasing in tick AND minutes, slope 0.75-60 (warn over 15, flag `lull`). Minutes cached in `Float32Array(676)`, strings memoised per integer tick.

### 4.3 Data files (served under new hashed names; `/data/*` is `max-age=3600` [V netlify.toml:28-30])

```jsonc
// time_anchors.json (source of truth)
{ "schema": 1, "version": "2027-01-31.1", "dv": 2, "tz": "LMT", "tick_max": 675,
  "tab_days": [[1,225],[226,450],[451,675]], "approx_sigma_min": 10, "sigma_cap_min": 30,
  "gaps": [{"from":226,"to":240,"policy":"fast_forward"},{"from":515,"to":518,"policy":"fast_forward"}],
  "solar": {"1863-07-01": {"civil_dawn":"04:03","sunrise":"04:35","noon":"12:03","sunset":"19:32","civil_dusk":"20:04","nautical_dusk":"20:46"}},
  "anchors": [{"tick":12,"t":"1863-07-01T07:30","status":"S","sigma_min":5,"range":["07:30","07:30"],
               "facts":["R005"],"evidence":["ABT","HN","WP","PART"],"state":"proposed","decision":null}] }
// moments.json (one registry; the register's name, replaces app-time's events.json)
{ "id":"first-shot","tick":12,"kind":"event|vignette|context|epilogue|marker","significance":"critical",
  "legacy":{"chron":"D1T12","vignette":"V-001","marker":false,"tour":1},
  "real":{"date":"1863-07-01","best":"07:30","start":"07:30","end":"07:30","confidence":"H",
          "facts":["R005"],"evidence":["ABT","HN","WP"],"state":"signed","decision":"D-0003"},"anchor":true,"approx":false }
```
`dv` is 1 for today's legacy calibration (links without `dv` mean 1), 2 for the first calibrated set, and bumps on every anchor-set change [D-TIME]. Moment `id` is permanent and never derived from a tick (slug or sequence id; chapter 06 uses V-###/E-###) [S ux-flows-05 verifier]; retired ids keep a tombstone `{retired, redirect}`. Also: `tick-migrations.json` `[{"dv_from":1,"dv_to":2,"moves":[{"moment":"lee-longstreet-dawn","from":360,"to":451}]}]`; `time_evidence.json` (one row per `time-facts.csv` fact, id `TIME:R###` as in `hist-golden-set.json`: date, start, end, best, confidence, evidence_class, sources[], disagreements[], display, moments[], state); `decisions.jsonl` `{id, subject, decision, display, citations[{work,edition,page,kind}], reviewer, second_reader, at, state}`. Generated: `ticks.json` (675 rows, Node consumers only) and `tests/golden/tick-clock.csv`.

### 4.4 The 33 anchors (`time-facts-anchors.csv`; status S/M/R/D = class A/B/C/D)

sigma [E] = `min(30, max(5, ceil(half-width of the widest linked fact range / 5) * 5))`, D anchors 30 (replaces the prototype S10/M15/R30/D30 mapping). Families [E] come from the fact rows' source keys (the column lists strong families, weak ones only where they explain a flag): OR (the Official Records reports actually read: DBL, HALL, WNW, LSTR, WORK, CAB), WP (Wikipedia), ABT, HN (HistoryNet), NPS, PART (participant); weak: SS (Stone Sentinels, self-described uncited compilation), THJ, CWC, SRCH, LIT (recall). Flags: H historian decides (R status); O owner signs (D anchor); C circular (t5); M S-status on an M-confidence fact row [S verifier]; E S-status failing "one OR primary or two independent strong families" [E]; W no strong family [E]. 18 of 33 carry a flag; 15 pass the mechanical checks (t12, 57, 64, 72, 240, 256, 267, 280, 295, 314, 340, 451, 518, 551, 568).

| Tick | LMT | St | sigma | Event (fact id) | Families | Flags |
|---|---|---|---|---|---|---|
| 1 | 7/1 05:00 | S | 15 | Heth column leaves Cashtown (R003) | LIT SS THJ | M E W |
| 5 | 7/1 05:20 | M | 30 | Archer/Davis out of Cashtown (R003) | LIT SS THJ | C W |
| 12 | 7/1 07:30 | S | 5 | First shot, Lt. M. Jones (R005) | ABT HN PART WP | - |
| 28 | 7/1 10:15 | S | 20 | Reynolds killed (R012; 10:15-10:50) | OR WP | M |
| 36 | 7/1 11:00 | S | 15 | Railroad Cut (R017) | WP SS | E |
| 53 | 7/1 14:30 | S | 30 | Iverson's Pits (R025; 2:00-3:00) | OR WP | M |
| 57 | 7/1 15:00 | M | 25 | Barlow's Knoll (R027) | ABT WP | - |
| 64 | 7/1 16:00 | S | 15 | Pender hits Seminary Ridge (R032) | OR ABT WP | - |
| 72 | 7/1 16:20 | M | 30 | Hancock on Cemetery Hill (R035) | WP SRCH | - |
| 75 | 7/1 17:00 | R | 30 | Lee's "if practicable" order (R037) | WP SRCH | H |
| 90 | 7/1 18:00 | R | 30 | XII Corps, Johnson arrive (R038/039) | SS SRCH LIT | H W |
| 100 | 7/1 20:00 | D | 30 | Nightfall (sunset 19:32, dusk 20:04) | sun | O |
| 226 | 7/2 04:30 | D | 30 | Day-2 start at first light | sun | O |
| 240 | 7/2 12:00 | M | 30 | Berdan's probe (R046) | WP SS | - |
| 248 | 7/2 14:30 | R | 30 | Sickles advances (R050; noon-3:30) | WP SRCH LIT | H |
| 256 | 7/2 16:00 | S | 25 | Longstreet's assault, Hood (R054/056) | OR ABT WP | - |
| 267 | 7/2 16:30 | M | 15 | Vincent on Little Round Top (R059) | HN WP | - |
| 275 | 7/2 18:00 | R | 30 | 20th Maine charge (R066; 5:10 to 7:00+) | HN THJ SRCH | H |
| 280 | 7/2 18:30 | M | 25 | Peach Orchard collapses (R071) | WP SS | - |
| 295 | 7/2 19:00 | M | 30 | Crawford counterattack (R076) | WP SS | - |
| 302 | 7/2 19:10 | M | 25 | 1st Minnesota charge (R077) | SS LIT | W |
| 314 | 7/2 19:20 | S | 30 | Johnson attacks Culp's Hill (R080) | ABT WP | - |
| 326 | 7/2 20:00 | S | 30 | Early attacks East Cemetery Hill (R082) | WP SS | E |
| 340 | 7/2 22:30 | M | 15 | Battlefield falls silent (R087) | WP | - |
| 451 | 7/3 04:30 | S | 25 | XII Corps guns open (R091) | ABT WP SS | - |
| 500 | 7/3 09:00 | M | 30 | Pickett's division arrives (R094) | SS | W |
| 515 | 7/3 11:00 | S | 30 | Culp's Hill fighting ends (R097; to noon) | WP SS | M E |
| 518 | 7/3 13:07 | S | 5 | Cannonade opens (R100) | OR HN NPS WP | - |
| 538 | 7/3 15:00 | R | 30 | Infantry step-off (R108; 2:00-3:00) | OR ABT WP | H |
| 551 | 7/3 15:35 | M | 20 | Armistead over the wall (R115) | ABT SS | - |
| 556 | 7/3 16:00 | M | 25 | Assault collapses (R118) | SS | W |
| 568 | 7/3 17:15 | M | 25 | Farnsworth's charge (R122) | ABT SRCH | - |
| 675 | 7/3 20:00 | D | 30 | Nominal end of battle | sun | O |

Review priority [S time-facts leave-one-out]: least predictable from neighbours are t518 (+96 min), t340 (+93), t515 (-86), t451 (-77), t240 (+68), t568 (+51), t90 (-48). D-ENTRY's hero moment (ticks 535-556) sits on R anchor t538 and M anchors t551/t556, so t538 is reviewer item 1. Nine RELABEL-CONTESTED rows stay over 45 min off after adoption (t230, 235, 324, 455, 480, 505, 532, 565, 650; worst t230 +321 min); WP-TIME-03 fixes each by a re-tick or an added anchor.

### 4.5 Display rules

- "about" when `sigmaMin >= 10` OR the item is not `signed` [D-TIME]. With the derived sigma this is nearly every tick (only t12 and t518 are 5): honest for 1863 sources but noisy, so the prefix appears in text contexts (cards, tooltips, aria, Historian, Sources & Times) and the compact chip uses the same word; owner decision 5 offers a threshold of 20.
- Contested moments show the range from `real.start/end` ("between about 10:15 and 10:50 AM") with a "Sources differ" link.
- 5-minute UI rounding; the 0.83 min/tick stall (t302-314) repeats a chip value for about 6 ticks, accepted.
- After midnight and before civil dawn (04:03) print "Night of July 1-2" plus the time; from 04:03 the plain date. t226/t451 land at 04:30.
- Local mean time at 39.83 N 77.23 W; no EST conversion (+9 min); stated once in About the clock.

### 4.6 Playback

- Story pace (default, 2 ticks/s x speed). Label "1x" plus "about N minutes of battle per second", N = round(2 x speed x mpt(tick)) to the nearest 5, refreshed at most 1/s. 1x is 1.7-84.7 min/s [V]: about 5 during Pickett's Charge (t538-551), about 85 across t515-518.
- Battle-time pace (runtime option, replaces the refuted resample): `clockMin += dt x rate`, `tickFloat = minutesToTick(clockMin)`, fraction to the renderer; rates 1, 5, 15, 30, 60 battle-min/s; events by crossing (WP-TIME-12); in a `fast_forward` gap the pace auto-accelerates with "Quiet hours" and a Skip control.
- Hour steps: `tickAfterMinutes(tick, +-60)` (t538 to 556, t226 to 228, t515 to 516, t302 to 327 [V run]); one `SPEEDS` ladder (cap 8x) for keys, buttons, mobile; dt clamp 100 ms (T0 patch I); pause on `visibilitychange`.
- Tour windows become `windowMin` (legacy `tickWindow: 8` spans about 11 min at The Angle, about 4 h in the July 2 morning [S app-time 7.2]).

### 4.7 Lighting

`sun(tick)` from the solar table: `alpha = 0.25 x smoothstep(altitude +6 deg to -12 deg)`, warm tint near the horizon, precomputed per tick, one composited layer or GPU raster property; no 8 s CSS transition (9894-9895), none under reduced motion; units and labels above it; a per-viewer Daylight toggle. Fixes t326 "near-darkness" drawn with zero tint [S app-time-10]. Sunrise/sunset within 1 min of NOAA [S verifier]; no moon effect until an almanac check [U].

### 4.8 Links, bookmarks, the data-version stamp

- `tick` = frame, moment id = identity, `dv` = calibration stamp [D-URLSTATE]; legacy links have no `dv` (=1).
- `migrateTick(tick, dv, momentId)`: only with a moment id present and a `tick-migrations.json` entry moving that moment from `tick` at `dv_from >= dv` is the registry tick used; a tick-only link keeps meaning the frame.
- Bookmarks v2 add `dv`, `ev` (moment id when the default label matched), `savedAt`. Read-migration: v1 gets `dv = 1`; only bookmarks whose label equals a legacy `IF` default and whose tick equals a moved moment's old tick are re-pointed; user-typed labels are never touched.
- Before applying a deep-link or bookmark tick, await `ensureDay(1..dayOf(tick))` (legacy loads Day 2/3 only on playback, 96990-96996); a deep link skips the boot splash.

### 4.9 Honest UI language (wording owned by docs-copy `disclaimers.json`; semantics fixed here)

| Where | String |
|---|---|
| Clock chip | "about 3:00 PM"; overnight "Night of July 1-2, about 1:20 AM"; tooltip and Help use the disclaimer key D-CLOCK (a copy string in chapter 11 `disclaimers.json`, not a register ADR): "Times are approximate. Sources disagree by 15 to 30 minutes, and the map plays as a time-lapse." |
| Speed | "1x" plus tooltip "About 10 minutes of battle per second" (docs-copy E4); mobile "10 min of battle per second" |
| Frame number | tooltip or `?debug=1` only: "Frame 538 of 675"; never "tick" in visible UI |
| Unsigned item | pill "Unreviewed reconstruction" (D-HIST-REVIEW wording) on the clock popover, event-card footer, Historian answer footer, Sources & Times rows |
| Gap | "Quiet hours. Playback skips ahead." (Story pace only) |
| Product copy | "moment by moment" approved for E2/E3; "minute-by-minute", "real time", "five-minute snapshots" banned; About/Help/Sources say "played as a time-lapse, faster through quiet hours and slower in the fighting" |

---

## 5. Consumer change list ("legacy" = frozen bundle via the patch runner; "rebuild" = new app)

| Consumer | Today | Change | WP |
|---|---|---|---|
| Store | `getTickTime` 9371-9383, `getCurrentDay` 9384, `jumpToDay` 9369 | legacy: `getTickTime = () => TM.format(tick,'compat')`, add `getClock()`, `stepMinutes`; rebuild: selector on `currentTick` | 10 |
| HUD `_F` | 97415-97483 (`+ 2` 97428, label 97429, own rAF 97419-97426, fps text 97446-97448) | date from `parts().date`; label per 4.6; delete the 60 Hz loop and fps text | 01, 10, 11 |
| Toolbar `AO` | 113052-113090 (`xi` 113054, `July va` 113086, tick label 113088) | tab label "July N" (first-light date); clock label time only; `min-width:22ch`, `tabular-nums`, 12 px | 10, 17 |
| Mobile header `pO` | 102974-102977, 103144-103145, tabs 103159-103173, dots 103191-103215, "Tick f/P" 103240 | `getClock()` `{date,time}`; dots from moments; clock replaces "Tick"; 44 px | 10 |
| Time bar `IO` | 112202-112360: clock 112212-112226; +-12 at 112218, 112310, 112334, 112979, 112984; "Tick c/675" 112357; chips `f2` 112187; markers `TO` 112192 | clock; `tickAfterMinutes(+-60)`; "Back 1 hour"; frame number to tooltip; native range; markers generated (t17 is Calef, "First shot" is t12) | 10, 11, 17 |
| Event card, vignette panel | `LF` 98595-98662 (exact tick 98607, `l.time` 98630); 98255-98345 (window 98266-98272, jump label 98340-98343) | crossing trigger with minute look-back; `format(l.tick,'time')`, range and pill; reserved height; jump label shows time | 10, 12 |
| Unit panel, successions, toasts | "At Tick" 98031, `histTick` 98052, `(tick N)` 97566; `qF` 99888-99960 (footer 99949, `H.current` 99897-99903) | "At 4:28 PM", "(4:28 PM)", time footers; `H.current` on every tick change; batch commanders | 10, 12 |
| Minimap `WF/GF` | 99644-99830 (footer 99821) | "{n on field} units, {time}" from `stateAt`; subscription and `y1(x,z,0)` at 99763/99821 are Tranche 0 patch C | 10 |
| Monuments, tooltips | `mA` 100615+, `JF` 100836-100843 (used 100889, 100956) | delete `JF`; `format(mon.tick,'long')`; typed clocks in prose generated or validated; Cushing, Armistead, Hancock "3:00/3:15/3:20 PM" are 15-35 min early | 05, 10 |
| Tours | `th`/`XF` 100063-100345; walkthrough `d2` 104096-104420 | moment ids, generated subtitles, `windowMin`, cancel timers; stop 8 (t270 "6:00 PM") precedes stop 7 (t275 "5:00 PM"); stop 2 narrates Iverson (about t53); stop 13 (t522) belongs near t538; stop 16 "July 4-5" needs an epilogue | 05, 10, 22 |
| Ancestor, quick picks, bookmark names, onboarding | `QF` 100998-101007 (rows 101078, 101257); `zF` 98729-98737; `IF` 97865-97896; `Gc` 111819-111855 | delete `QF`, `format(t,'short')`; moment ids; onboarding day-part words match the clock (t267 "July 2 afternoon" beside 7:25 AM today) | 05, 10 |
| Lighting | `M4/E4/A4/C4` 9856-9907 | `sun(tick)` | 13 |
| Engine | `y1/i2/F4` 96238-96310; loop 96948-97013 | `stateAt`; dt clamp; modes; crossing hooks; `s2` from `tick_max` | 11, 12 |
| Bookmarks, permalinks | `$k/TF/RO` 97821-97864; BookmarkPanel chunk | schema v2 with `dv`, `ev`; "Tick N" becomes time | 15, 21 |
| Boot, Help, copy | `tO` 101471-101545, 111893; HelpModal @118, @198, @293-@526; index.html, manifest, terms | local progress animation, skipped on deep link; copy per 4.9 | 15, 16 |
| Compare | compare.html:55, 65, 79, 114-129, 245-246 | delete local clock; hint from moments (today's "4:00pm vs 6:00pm on Day 2" lands on t358/t382, night ground); optional clock slider via `clockToTick` | 14 |
| Ledger, Dashboard | living-ledger.html:64, 90, 106-113, 135-144, 151, 160; dashboard.html:85, 141, 163-166 | shared formatter and `tabDay`; casualties per battle-minute; divide by `end-start+1` (fixes +412 Union, +426 Confederate over-count [S DI MISSED-05]); hour gridlines | 14, 18 |
| Camera, Immersive (Tier 3) | camera.html:175-187, 226-236; immersive.html:163-173, 200, 206-207, 217 | `sun(tick)`; Battle-time speeds instead of fixed 1 tick/s; immersive cadence from intensity, no night artillery, only if the Lab survives | 13, 14, 18 |
| Documentary, Education, Turning Points | documentary.html:84, 89, 92; education.html:63, 72-73, 81; turning-points.html:51-100, 118 | eyebrow "Wed, July 1, about 7:30 AM, McPherson Ridge"; `tabDay`; points keyed by moment id (t175 has no event; Ewell's order is t75); day parts generated | 05, 14 |
| Labs: Sandbox, Cinematic Export, Watch Together | sandbox.html:103-107, 211, 223-227; cinematic-export.html:60-64, 118-121, 175, 213-214, 246; watch-together.html:79, 172, 192, 201-202 | presets from moments (t260 is 4:11 PM, after the assault began; honest pick t250-254; t553 is at the wall; t62 is the I Corps collapse); clock inputs and captions, file name `gettysburg-1863-07-03-1500-1545.webm`; sync key stays the integer tick; only if the Lab survives | 14 |
| Regiment, Search, Report, Historian, Embed, Chronicle | regiment.html:189, 218-219, 247; search.html:114, 125-127, 139; historian.html:109-110, 121-123; embed.html:60; rebuild Text route (app-a11y-12) | clock instead of "ticks a-b"/"tick N"; links per D-URLSTATE; Report has no clock code [S app-time 2.2]; Historian per WP-TIME-19; h3 hour blocks and `<time>` generated | 14, 19 |
| Data, metadata, copy | chronology_day1-3, `placement_schema.json`, chunk descriptions, `casualty_apportionment.json`, successions, vignettes, density notes; OG/JSON-LD/manifest/guide | regenerate or validate; copy per 4.9, clock text held until sign-off | 06, 16 |

---

## 6. Content defects no clock can fix: triage and who decides

Deciders: R = named historical reviewer (D-HIST-REVIEW), O = owner (scope, wording), D = developer; the second reader confirms 30% of items. Suggested ticks are computed from the proposed anchors with `minutesToTick` [E, re-run]; a re-tick is safe only if the frame's placements match the story, so each needs a map spot-check. Every row starts `proposed`.

| Tick(s) | Class | Today | Evidence | Proposed action | Decides |
|---|---|---|---|---|---|
| 8 | WRONG-DAY | "5:35am" Hill lets Heth advance | exchange is June 30 evening (LIT, unverified) | "night before" context card (date 1863-06-30) or delete | R, O |
| 360 | WRONG-DAY | "3:20pm" Lee-Longstreet meeting | R090 July 3 about 04:30 | move to t451; short July 2 evening note "Lee decides to renew the attack" at about t337 (R086, 22:00) | R |
| 380 | WRONG-DAY | "4:20pm" Alexander positions guns | R099 July 3 10:00-12:30 | move to about t516 | R |
| 420 | WRONG-DAY | "6:20pm" Pickett behind Seminary Ridge | R094; night-of-July-2 sources conflict | do not delete; decide with WP-TIME-09, likely t500 | R |
| 243, 273, 283, 298, 304 | MISORDERED | 6:25am, 8:55am, 9:45am, 11:00am, 11:30am | R052-R077 | about t255, t271, t272, t278, t290 | R |
| 310, 335, 400 | MISORDERED | Stuart "12:00pm"; Willard "1:55pm"; council "5:20pm" | R047 12:30; R078 7:10 pm; R084 9:30 pm | about t242, t302, t334 | R |
| 460, 490 | MISORDERED | Colgrove/Mudge "5:45am" (V-022 "7:30"); Johnson exhausted "7:35am" | R096 10:00-11:30 (SS3 says 6:00); R097 10:30-noon | about t511 (with V-022 and `IF` key 460), about t515; needs Pfanz pp.310-25 | R |
| 560, 563 | MISORDERED | East Cavalry "12:55pm", Custer "1:10pm" after the Angle | R119 1:30 pm, R120 3:00 pm | about t522, t538, or split | R |
| 50 | COMPOSITE | Howard, XI Corps, Barlow in one card | R015, R020, R023 | cards at about t36, t43, t50 | R, D |
| 95, 100 | COMPOSITE | Birney/II Corps/Newton; nightfall + Meade "~11pm" + council | R040 20:00, R042 about 1:00 AM, R043 | Birney t100, Meade about t174 (fills the night), dawn about t229; council moves with t400 | R |
| 226, 270, 278 | COMPOSITE | dawn+recon+orders; Vincent+Weed+O'Rorke; Kershaw+Barksdale | R044, R045; R061-065; R062, R069, R071 | one card per event: about t226/t230/t238; t270-273; t271 and t276-280 | R |
| 440, 516, 620 | COMPOSITE | Culp's lines + Hunt order; guns + two notes; Lee council + Imboden + wagons | R099, R103, R105; R127, R128-R130 | split; notes about t521 and t523; council about t655; July 4 items epilogue | R, O |
| 12, 38, 314, 326, 515, 518 | TEXT-VS-LABEL | label contradicts own text | R005, R019, R080, R082, R097, R100 | self-heal when labelled from the clock (7:30, 11:25, 7:20, 8:00, 11:00, 1:07); proven by TM-V3; more label/text conflicts exist (t75, t340, t420) | D |
| 525 | UNVERIFIED-QUOTE | "first message ... For God's sake come quick" | R103 1:25 PM first note, R105 1:35 PM second; V-015 quotes the first correctly | one cited primary wording shared with V-015; Longstreet's nod is a separate uncertain moment (R106) | R |
| 530 | UNVERIFIED-QUOTE | "I would not make the charge now ..." plus step-off | no source found; may garble a Longstreet-to-Alexander note [U] | remove or cite; step-off is t538 | R |
| V-020, V-021 | text | "exactly eight days"; "four days" vs "eight days" | commission and nomination June 29 | "four days"; Farnsworth "nominated June 29, never confirmed" | R |
| V-022 | text | "7:30 in the morning"; typo "Colonize Silas Colgrove" [V] | R096 | "late in the morning" (or reviewer's time); "Colonel" | R |
| V-019/V-023, V-024 | structure | both trigger t556 and share a quotation; V-024 prose is July 3 afternoon | R128 July 4 1:00 AM | merge or make V-023 an epilogue; V-024 epilogue | O, R |
| Pickett C-I-3-1/2/3 | placement | Line of March t180, Bivouac t200, t400-451 | Longstreet OR and monument: Chambersburg July 1; arrival about 9 AM July 3 | definite error t180-200 (1:24-2:45 AM July 2 under anchors); night-of-July-2 location undecided (SS2 vs WP, monument, marker) | R (WP-TIME-09) |
| t324, t100 text | text | "Night attack repossesses most of the upper works"; "Meade ~11pm" | R085, R042 | rewrite; Meade "after midnight, about 1 AM" | R |
| Markers, stops, points | tick placement | TO t17; stops 2, 4, 7/8, 13, 16; Iron Brigade t20 vs t27-29; Barlow t63; Turning Points t175/240/267/340/540/560 | time-facts 5.4 | re-point to moment ids; 6 of 9 Turning Points anchors miss, 4 unambiguous [S ux-flows-05]; against the site's own chronology [V, `chronology_day*.json`]: Ewell's "if practicable" order is t75 (`critical`; t175 has no event), Longstreet 240 to 256, Chamberlain 267 to 275, Night Assault 340 to 326 (`critical` "Cemetery Hill assault"; t314 is the Culp's Hill alternate), Cannonade 540 to 518, Pickett 560 to 538 (chapter 02 WP-T0-09 applies these in R1c as `provisional`) | R, D |
| Attribution slips | quotations | Avery note "It was my fault." (Lee's remark; Avery's known note differs); Lincoln "wrote" line | docs-copy-33 | one decision and citation each | R |

Reviewer order [E]: (1) t538 and the 20th Maine t275 (hero moment, tour, Turning Points, onboarding); (2) t248, t75/t90; (3) Colgrove and V-022; (4) Pickett; (5) the M-row S anchors t28, t1, t53, t515; (6) the rest.

---

## 7. Work-package specifications

### WP-TIME-01 - Interim date fix (Tranche 0 patch D)
Covers: app-time-01 (date), time-facts-02, deploy-history-04, app-bugs-08 (patch D), app-bugs-01 (D). Audit C3. S 0.3-0.5 d. Depends: patch runner, new hashed names (D-SOURCE, D-ORDER, 21). The same three edits are patches D1-D3 of chapter 02 WP-T0-07 (group B, R1c; they may ride R1a since they need no owner decision): implement and schedule ONCE there, this WP owns the residue list and acceptance.
Fix: three exact-string edits in the minified bundle, each asserted once (`tmp-app-bugs/tranche0-validate.js`): `` R=`July ${l+2}, 1863` `` to `` ${l} `` (97428); `` ${l} July ${f+2}` `` to `${f}` (100842); `` return`July ${f+2}, ${R}: `` to `${f}` (101006). `JF` takes its day from the tick, call `JF(kt.tick)` at 100889. Post-scan scoped to `July ${` (`+2}` also occurs in Mapbox code at char offset 659987 [S deploy-history-04]). Per the register base clocks are untouched (date alone). Release note lists the residue: 06:00/04:00 vs 05:00, tooltip contradictions, double date, no rollover, clock wrong vs history (closed in 10).
Acceptance: HUD (97444) reads July 1/2/3, 1863 at t1/226/451; tooltips and ancestor rows show July 1-3; scoped grep of the built bundle returns 0. Moves C3. Risk: retired at cutover.

### WP-TIME-02 - Canonical time module, schemas, dual build, golden
Covers: app-time-02, time-facts-01, bundle-anatomy-23, pagesA-36 and pagesB-05 (module), prov-recon-13, app-latent-30, data-integrity-11 (module), deploy-history-05 (module), hist-current-12 (module name), qa-ci-06 (fallback). Audit C3, C4, H9. M-L 1.5-3 d.
Fix: promote `tmp-app-time/time-model.mjs` to `packages/time`; add the 4.2 additions (`sun`, `approx`, `signed`, `exact`, `tickAfterMinutes` guard, `compat` without year); dual build with inlined anchors; `scripts/build-time-artifacts.mjs` emits `ticks.json` and `tick-clock.csv`; seed `time_anchors.json` from `time-facts-anchors.csv`, all rows `proposed`, `dv: 2`, t5 as D sigma 30; tests = the 13 prototype tests plus mobile `compat` split, rollover at t160/t368, `tickAfterMinutes` for every tick, property test on random valid anchor sets.
Acceptance: `node --test` green; non-monotone set throws; `tickToClock` <= 5 us. Moves C3, C4, H9.

### WP-TIME-03 - Anchor adoption, evidence classes, sigma, constrained fit
Covers: app-time-03, time-facts-01 (values), hist-sources-1-06 and hist-sources-2-05/06 (OR testimony as evidence, never ground truth). Audit C4. M 1-2 d. Depends: 02.
Fix: port `fit_anchors.py`/`kin_fit.py` to `tools/fit-anchors.mjs`: map facts to ticks via `moments.json`; adjudicate inversions with a longest-non-decreasing-subsequence weighted A3/B2/C1 (inversions go to WP-TIME-07, not the fit); detrended isotonic fit with kinematic lower bounds (infantry 150, artillery 250, cavalry 400 m/min); Douglas-Peucker (epsilon 8 min) keeping class A anchors and ticks 1/226/451/675; emit residual report (flag over 2 sigma), slope table (warn > 15, error > 60) and golden. Compute sigma and flags by the 4.4 rules; demote S to M when the evidence rule fails. Report the nine over-45-minute rows and the 19 kinematic pairs.
Acceptance: class A/B anchors within 2 sigma of their fitted time; slopes 0.75-60; `tf_crosscheck.mjs` still reproduces every `tick_under_proposed_anchors`. Moves C4. Risk: leave-one-out RMS 44 min.

### WP-TIME-04 - Review programme: charter, queue, states, public surfaces
Covers: time-facts-05, time-facts-13 (Sources & Times), data-integrity-29 (time items), docs-copy-33, hist-sources-2-06; critics 0.12, 1.13. Audit C4, H10. M 1.5-2.5 d + reviewer 31-51 h [E]. Depends: 03; WP-DEC-10 (reviewer, charter) and WP-DEC-11 (packet) own the human side.
Fix: (a) `tools/time/build-review-packet.mjs` builds `queue.jsonl` from `time-facts.csv`: confidence L, tags S/L, flags H/O/M/E/W (5 R, 3 D, 45 low-confidence rows, 33 disagreements, 27 defects, 62 other claims). (b) States `open -> proposed -> reviewed (reviewer) -> confirmed (second reader, 30% sample, kappa >= 0.6 as hist-final-plan) -> signed`; side states `contested` (range shown), `deferred`, `withdrawn`. Only `signed` clears the pill and allows an exact time, and only if sigma < 10. (c) `decisions.jsonl` committed; CI (TM-V18) fails on "reviewed by" or "accurate to the minute" without a signed record. (d) Public surfaces: About the clock; Sources & Times (range, evidence class, source keys as printed, reviewer credit; facts and ranges only, no multi-sentence quotations or Wikipedia paragraphs [S time-facts-14 verifier], SS/THJ/CWC labelled low-authority); /corrections (date, item, old to new, source); corrections@ (D-CONTACT). (e) Fallback with no reviewer by DG-3: rows stay `proposed`, pill and "about" everywhere, hour pages and dated OG eyebrow held.
Reviewer hours [E]: 5 R anchors 4-8; 45 low-confidence rows 8-11; 27 defects 9-14; text and quotes 3-5; Pickett 3-6; other claims 2-4; read-through 2-3 = 31-51 h, on top of hist-final-plan's 59-95 h (which budgets only 4-6 h for time anchors).
Acceptance: 100% of queue rows decided or `deferred` with the pill; TM-V18 red on an injected "Reviewed". Moves C4, H10. Risks: reviewer capacity; unread sources (Pfanz, Coddington, Sears, Hessler, Wert, Gottfried, most OR reports [S]).

### WP-TIME-05 - Moments registry, permanent ids, migrations
Covers: app-time-04, ux-flows-05 (time fields), app-bugs-36, data-integrity-16 (events), prov-recon-27, seo-growth-22, pages-C-58 and -60, time-facts-07 (registry). Audit C4, H7. M-L 2-3.5 d. Depends: 03.
Fix: v0 ships with the Tranche 0 deep-link parser (D-URLSTATE, R1): permanent ids plus corrected ticks for the 8 scrubber markers, 9 Turning Points, 5 onboarding stops and 24 vignettes, no `real` block yet. v1 (after DG-3) builds from chronology (137), vignettes (24), successions (42), markers (20), tour stops (16 plus walkthrough), Turning Points (9), quick picks (7), scrubber markers (8), bookmark names (26), onboarding stops (5); slug ids; `legacy` cross-links; `real` from `time-facts.csv`; resolve the 10 cross-source tick disagreements (first shot 12/17; Ewell 75/175; Hancock 550/554; Cushing 548/549/552/553; Hood 258/262/278; Vincent 270/290; Weed 272/293/295; 1st Minnesota 295/302; 26th NC 16/28; Iron Brigade 20/27 [S app-time 4.4]); emit `tick-migrations.json` from WP-TIME-07.
Acceptance: TM-V5, V19, V20; deleting a hand-kept list breaks the build. Moves C4, H7. Risk: ids are irreversible; review once.

### WP-TIME-06 - Data regeneration and metadata truth
Covers: app-time-05, time-facts-03, data-integrity-11 (data), data-integrity-22 (structure), docs-copy-06 (clock normalisation). Audit C4. M 1-1.5 d. Depends: 02, 05.
Fix (`scripts/relabel-chronology.mjs`, dry run, owner reviews the diff): chronology `time` derived, old value kept as `time_legacy` for 30 days; add `date` for t160-225 and t368-450 (`historian.html:123` prints `Day ${c.day}, ${e.time}`); `metadata.tick_formula` becomes a pointer to `time_anchors.json`; `placement_schema.json` `real_time` regenerated, "430,000+" and "600-700 per tick" corrected to 1,804 rows, `record_count` 4,890 vs 100 fixed; chunk descriptions generated; `casualty_apportionment.json` gains `duration_min`; successions `approx_time` validated (0 of 37 parseable rows agree with the tick formula [S DI-11]).
Acceptance: TM-V3, V4, V13 clean; legacy bundle still renders; DI T001-T004 zero. Moves C4. Risk: up to 1 h data/code skew, so hashed names.

### WP-TIME-07 - Content triage: wrong-day, misordered, composite
Covers: time-facts-04, app-time-04 (triage), hist-sources-2-06. Audit C4. L 3-5 d (verifiers: L-XL) + reviewer. Depends: 04, 05.
Fix: execute section 6 row by row after each decision: re-tick (metadata only; `PF()` supports several events per tick [S]), split composites, t8 to a context card, update vignette triggers (V-022 460 to about 511) and every dependent list through `moments.json`, write `tick-migrations.json`, spot-check each target frame, then re-run WP-TIME-03 and the nine over-45-minute rows.
Acceptance: TM-V5, V6 clean; zero MISORDERED, WRONG-DAY, COMPOSITE in a re-run of `tmp-time-facts/analyze.py`; TX-04. Moves C4. Risk: users see different content at a tick; `dv` and release notes.

### WP-TIME-08 - Text, quotation, vignette corrections
Covers: time-facts-06, data-integrity-22 (V-020/21/22), docs-copy-33 (quotes), app-time-12 (captions). Audit C4, H7. S-M 0.5-1 d. Depends: 04.
Fix: V-020/V-021 "four days" plus Farnsworth wording; V-022 time and "Colonize" [V]; t525/t530 per section 6, `source` on every quotation; t324, t100 text; V-015 and t525 share one primary wording; onboarding and walkthrough day-part words match the clock.
Acceptance: grep-removal tests; TM-V3, V21 clean. Moves C4, H7.

### WP-TIME-09 - Placement arrival audit, kinematics (V7)
Covers: time-facts-10, app-time-17, data-integrity-01 (clock dependency), DI verifier MISSED-01; time-facts-15 folded and refuted. Audit C4. M-L 1.5-3 d (script trivial, arrival research is the cost). Depends: 03, 04.
Fix: `audit_placements.py`: for each corps/division/brigade with a documented arrival (Heth 5 AM, I Corps 10-noon, XI Corps noon-1 PM, XII Corps 5 PM on, III/II/V/VI, Pickett, Stuart) convert the first placement tick to a clock and list gaps over 90 min; Pickett first; patch or delete pre-arrival rows. V7: `dist / (tickToMinutes(t2) - tickToMinutes(t1))` against caps (6 pairs exceed at 5 min/tick, 19 under the proposal, 1 a day seam [S app-time 6.6]); fix by intermediate keyframes, `snap:true` (5 seam pairs: U-XII-2-3 and U-1MN 450-451, C-I-3-3 225-226 and 450-451, U-20ME 225-226) or by moving an anchor.
Acceptance: audit 0 gaps over 90 min for tabulated arrivals; V7 0 unreviewed pairs; the dense-movement model (data-integrity-01, other chapter) takes dt from the clock. Moves C4. Risk: research load.

### WP-TIME-10 - Core clock surfaces (legacy bridge or rebuild)
Covers: app-time-01 (surfaces), app-time-08 (clock in cards, toasts, panels), app-time-20 (test), mobile-09, perf-runtime-13, perf-cwv-15 (clock CLS), app-bugs-27, app-bugs-16, app-latent-19, time-facts-07 (walkthrough, monuments), app-a11y-07 (formatter). Audit C3, C4, H11 (label), C1/C2 test. M-L 2-3.5 d rebuild-native; bridge +2-4 d. Depends: 02, 05, 06.
Fix: apply the section 5 rows for store, HUD, toolbar, mobile header, time bar, cards, panels, toasts, minimap, monuments, tours, ancestor. Bridge rule (D-SOURCE item 4): build the bridge only after D-TIME sign-off and only if sign-off is more than 90 days before cutover; DG-3 (2027-01-31) to cutover (2027-05-15) is 104 days and the capacity table (75-110 weeks at 15 h/week) makes a slip likely [E], so plan the bridge. Bridge edits are exact-string, assert-once patches (anchors in app-time 11.1), e.g.
```
9371-9383   getTickTime: () => TM.format(f().currentTick, 'compat')      // keeps "July N, h:mm AM" for the 102977 split
98630       children: l.time            ->  children: TM.format(l.tick, 'time', {approx: true})
112218, 112310, 112334, 112979, 112984   c +- 12  ->  TM.tickAfterMinutes(c, +-60)
97429       "1x (real time)" branch     ->  `${f}x` (label text from 4.6)
```
One clock surface per layout comes from the T0 overlay gating (bugs patch F, superseded by app-mobile HF-1a in chapter 02 WP-T0-08, group C) and D-SHELL; this WP supplies the test. The toolbar drops its second date.
Acceptance: TX-01, TX-13; one-clock spec at 12 ticks x 2 classes; `mon_hood` header and body agree; mobile header at t12/t538 never shows "1863". Moves C3, C4, H11. Risks: bridge is throwaway; mobile `split(", ")` contract.

### WP-TIME-11 - Playback semantics, hour steps, Battle-time mode
Covers: app-time-09, time-facts-09, app-bugs-33, perf-runtime-15, ux-flows-24 (pace), app-design-15 (speed group), mobile-26, pagesA-32, pages-C-78, docs-copy-04 (label). Audit H9. M 1.5-3 d. Depends: 02.
Fix: 4.6. One `SPEEDS` constant (buttons 8x vs key 16x today); dt clamp; pause when hidden; label per 4.9 (the interim "1x" ships earlier via docs-copy E4); `tickAfterMinutes` for Shift+arrows, hour buttons and Help ("Forward about one hour"); gaps honoured; Battle-time with rates 1/5/15/30/60; tour `windowMin`; previous/next moment and quiet-run skip belong to ux-flows-24 and consume `moments.json`.
Acceptance: TX-07 at 10 ticks; hour button within half a segment (t515 one tick is 42 min, tolerance 21). Moves H9. Risk: at 60 min/s the 0.83 min/tick stall runs 72 ticks/s, so triggers must be crossing-based (12).

### WP-TIME-12 - Seek-safe state, crossing triggers, ensureDay, minute windows
Covers: app-time-07, app-time-08 (crossing), app-bugs-07, app-latent-08, app-latent-05, data-integrity-01 (dependency), verifier missed items. Audit D3, H4, C4. M 1.5-3 d (time-specific part; the renderer is D-UNIT-RENDER's). Depends: 02.
Fix (contract): `stateAt(tickFloat)` pure and history-free; tracks rebuilt per loaded day; gliding by displacement and speed in battle-minutes with `snap:true`; visibility before the first and after the last keyframe is the D-UNIT-RENDER owner decision; triggers fire when `prev < moment.tick <= cur`, look-back `max(2 ticks, 15 battle-min)` on seek; `H.current` updated on every tick change; minute windows replace the tick counts: succession highlight 30 min (97584), OOB and roster "on the field" from `stateAt` (102325, 102664, 103124), `Math.abs(c - P) > 1` (98602); `ensureDay(1..d)` awaited in setTick, jumpToDay, scrub, keys, bookmarks, deep links (Day 2/3 data is about 348 KB raw in 47 files [S app-latent-05]); boot splash animates local state.
Acceptance: TX-08; seek 500 to 20 golden; no HIGH/CRITICAL skipped at 16x. Moves D3, H4. Risk: changes visible unit behaviour; ship behind a flag with baseline screenshots.

### WP-TIME-13 - Solar-driven lighting
Covers: app-time-10, time-facts-08, app-design-23, pages-C-31. Audit C4. Tier 2, S-M 0.5-1.5 d. Depends: 02.
Fix: 4.7; replace `M4/E4/A4/C4` (9856-9907), camera.html:175-187, immersive.html:169-173. Acceptance: TX-10; snapshots at t100, t150, t326, t451, t538. Risk: a third of playback is dark; measure legibility.

### WP-TIME-14 - Sub-pages and exports adopt the module
Covers: app-time-11, time-facts-11, pagesA-27, pagesA-32, pagesA-36, pagesB-05, pagesB-15, pagesB-28, pages-C-77, pages-C-58, pages-C-53, app-latent-23, app-a11y-12 (hour blocks). Audit C4, S4. Tier 2 (1 for Search, Report, Regiment, Embed); M-L 2.5-4.5 d; Lab work only if the Lab survives. Depends: 02, 05, 06.
Fix: section 5 rows; classic pages load the IIFE global (no conversion of inline IIFEs), Astro pages import the ESM at build so clocks are pre-rendered; Sandbox presets from moments (`time + title`); Cinematic Export clock inputs and file names; Watch Together sync stays the integer tick. Nine pages read only `placements_*` (694 rows) [S DI MISSED-02]: never rename those files without updating them in the same deploy.
Acceptance: subpage-clocks (same string at t538), sandbox-labels, TM-V9 clean. Moves C4, S4. Risk: same files as SEO trains S1-S3; do it inside the Astro migration where possible, 48 h clear of an S-train.

### WP-TIME-15 - Permalinks, bookmarks, `dv` migration
Covers: app-time-06, app-time-13 (`av` becomes `dv`), ux-flows-05 (`dv`), data-integrity-06 (shared), pages-C-58. Audit C4 (adjacent H3/H4). M 0.75-1.5 d. Depends: 05, D-URLSTATE (owns the parameter table).
Fix: 4.8 on the canonical parser; `?ancestor=` opens its panel at boot (dead on a cold load today, reader lives inside `Zk`). Fixtures: `?tick=538&vignette=V-016`, `/?unit=U-20ME&tick=267`, `?t=28&u=U-I&z=15.0&ll=39.8278,-77.2528`, `?ancestor=U-20ME`, hostile inputs (`tick=abc`, `-5`, `1e9`, `unit=<script>`).
Acceptance: TX-09; a legacy-default bookmark at t460 re-points after WP-TIME-07. Moves usability, C4. Risk: a tick-only link keeps meaning the frame (documented).

### WP-TIME-16 - Truthful copy, About the clock, guide
Covers: app-time-15, docs-copy-04, time-facts-13 (copy), mobile-26 (time strings), seo-growth-16 (hold). Audit H9, H10, G1. S-M 0.75-1.5 d. Depends: 02; clock text waits for 04.
Fix: docs-copy 2.7 rows E1-E20 at every location in section 5 (also index.html:745); About the clock in Help and the Welcome card (LMT, +-15-30 min, time-lapse, how anchors were chosen, link to Sources & Times); regenerate the guide PDF text ("Jump 1 hour", "675 five-minute snapshots", "Share a permalink"); HelpModal chunk strings @118, @198, @293-@526 and "445+".
Acceptance: copy lint REALTIME, TICKJARGON, TIMEFMT return 0; the same clock string in toolbar, event card, Ledger and the guide. Moves H9, H10, G1. Risk: meta-description edits belong to SEO trains S1/S2, not R1.

### WP-TIME-17 - Display honesty and accessibility of time
Covers: app-time-18, time-facts-13, app-a11y-07, perf-cwv-15. Audit A2, A6. M 1-2 d. Depends: 02, 10.
Fix: native `<input type=range min=1 max=675 step=1>` labelled "Battle time", `aria-valuetext` = aria style ("3:00 PM on Friday, July 3, 1863, about"), Page Up/Down +-12; throttled live region; `<time datetime="1863-07-03T15:00">`; `translate="no"` on clocks and unit names (D-LANG); clock text 12 px (113348-113354 are 11 px), `tabular-nums`, `min-width`; pill and popover keyboard reachable.
Acceptance: TX-11, axe 0, clock CLS <= 0.001. Moves A2, WCAG 1.3.1 and 4.1.2.

### WP-TIME-18 - Intensity per battle-minute
Covers: app-time-16, pages-C-27, app-latent-26, pages-C-76, DI-21 (dependency). Audit C4. Tier 2 (audio 3), M 1-2 d. Depends: 02.
Fix: `intensity(t)` = casualties per battle-minute from period `duration_min` (charge 2,700 in about 30 min is 90/min; Culp's Hill 1,514 over about 7 h is 3.6/min: 25x per minute, 7x per tick [S app-time 7.4]) plus a contact term; Ledger and Dashboard show the rate; audio (only if Immersive survives) cadence from intensity, silence at night, limiter; the main-app cannon logic is removed by D-SOUND.
Acceptance: intensity(charge) / intensity(Culp's) >= 10; Ledger totals equal Dashboard totals. Moves C4.

### WP-TIME-19 - Historian time-facts tier and temporal index
Covers: time-facts-14, app-time-19, hist-current-12, hist-current-01 (interplay), data-integrity-05, pages-C-16, ux-flows-19. Audit H8, C4. M 1-2 d. Depends: 04, 05, D-HIST-ARCH.
Fix: `time_evidence.json` (`TIME:R###`) enters the Historian facts tier at build; "when" answers quote the range and cite sources, never the chronology label (omitted until the model lands); the query parser resolves "3 pm on July 2" through `clockToTick` (3:00 PM July 2 is tick 250.7 [V run], golden tolerance 2); clock strings stored only after D-TIME sign-off (register hold); the "undefined" fix (`e.event`/`e.narrative`, never `flag`) ships with or before the clock.
Acceptance: golden GQ-042..050 (9 timing_sequence) and GQ-118..125 (8 temporal_at_time) pass with range-aware answers; a 40-question "when" set >= 95% [proposal, unmeasured]; no answer prints a clock that is not module output. Moves H8, C4. Risk: rights, facts and ranges only.

### WP-TIME-20 - Validators, golden, e2e, CI gates
Covers: app-time-14, time-facts-12, qa-ci-06, qa-ci-07 (TM), qa-ci-18, qa-ci-30, data-integrity-11 (T001-T004), deploy-history-16. Audit C3, C4, H9. M-L 2.5-4 d (qa-ci owns the runner). Depends: 02.
Fix: section 8 rules as TM-V1..V21 in `pipeline/validate` and tests TT-01..TT-14, report-only first to record the baseline, then gate in GitHub Actions T1. Acceptance: CI red on every "today" count, green after the WPs; mutation tests. Moves all TX.

### WP-TIME-21 - Release and cache rules for time artefacts
Covers: app-time-13, time-facts MISSED-3, D-ORDER hazards. Audit N1, C6. S 0.25-0.5 d (mostly R0's). Depends: D-ORDER.
Fix: `time-model.<hash>.js`, anchors, `moments.json`, `tick-migrations.json` under new hashed names via a manifest; never reuse a name for other bytes (CI compares with the last production `asset-manifest.json`; a committed lockfile replaces the impossible `sha256[:8]` rule); rename both lazy chunks and their import specifiers (112469-112470); the R0 service worker must not `skipWaiting` on a cache bump [S app-bugs M7]; unhashed data `max-age=0, must-revalidate`.
Acceptance: a browser holding the Sep-29 bundle gets the new bytes on the next navigation; Help and Bookmarks open without a second React or store instance. Risk: freeze windows 2026-11-15..20 and 2027-06-25..07-05.

### WP-TIME-22 - Event-less stretches, night moments
Covers: ux-flows-26, app-time 13.3(d), time-facts open question 4. Audit C4. Tier 2, L 3-5 d + 6-10 reviewer h. Depends: 04, 07.
Fix: default keeps tick density (no data change) for the 125 ticks t101-225 and the 110 ticks t341-450; Story mode skips runs of at least 20 event-free ticks at 8x with "Overnight, July 1-2" (ux-flows-24) and the Chronicle says "No recorded events in this stretch". Fill with moments the triage already yields: Birney about t100 (R040), Meade about t174 (R042), council about t334 (R084), Lee's decision about t337 (R086), dawn consolidation about t229 (R043); more need research. A time-lapse instead adds a `gaps` entry 100-226 with policy `time_lapse`.
Acceptance: no run of >= 20 event-free ticks unless captioned; each new moment sourced with a decision record. Moves C4, content depth. Risk: authoring above L (ux-flows-26 verifier).

### WP-TIME-23 - July 4 epilogue, ticks 676+ (optional, deferred)
Covers: time-facts-09 (d), walkthrough stop 16 "July 4-5", V-024, t620. Audit C4. Tier 3, unscheduled until the owner decides; L 3-5 d if scheduled. Depends: 04.
Default: no ticks above 675; July 4 items become `kind: epilogue` cards with a date and no tick. Ticks are append-only if wanted (July 1 05:00 to July 4 00:00 is 67 h, 804 ticks at 5 min).
Acceptance (only if scheduled): TX-02 stays at 0 hits; every epilogue card shows a real date and no tick number; no battle screen (HUD, toolbar, tooltip) prints a date after July 3 unless the owner approves an epilogue view; walkthrough stop 16 and V-024 render from `kind: epilogue` moments; the Historian golden set has no July 4 answer that cites a tick. Moves C4 (completeness). Risk: content authoring and reviewer time (WP-TIME-04).

---

## 8. Validators, CI gates, acceptance tests

Runner `pipeline/validate` (qa-ci-07 DV-30 is the TM gate); tiers per qa-ci: T1 every push, T2 Deploy Preview, T3 nightly. All rules are errors unless noted; "today" is what the first report-only run must record [S app-time 10.1, V where marked].

| ID | Rule | Today |
|---|---|---|
| TM-V1 | anchors schema; strictly increasing ticks and minutes; includes 1, 226, 451, 675; slope 0.75-60 (warn > 15); status S needs the evidence rule | proposal passes |
| TM-V2 | tab ranges equal `tab_days` in every consumer | 8 pages, about 13 bundle sites |
| TM-V3 (+V3b warn) | clocks and day-part words next to a tick agree with the model (explicit +-max(20 min, 2 sigma); "about" +-45; day parts vs solar); duration claims within 35% of the clock span | 355 strings, 151 tick+clock pairs; 538-558 "30 min", 256-330 "2 h", 451-534 "seven hours" |
| TM-V4, V5, V6 | no typed chronology `time` (equals model to 5 min); same moment id within 2 ticks across files; signed real times non-decreasing | 94/137 labels; 10 groups; 12 MISORDERED + 4 WRONG-DAY |
| TM-V7 | keyframe speeds in battle-minutes; day seams `snap` | 6 pairs at 5 min/tick, 19 under the proposal |
| TM-V8, V15 | link parameters canonical and in range; permalink and bookmark fixtures | app emits `t` alias |
| TM-V9 | lint bans: ``July \$\{[^}]*[+-] ?\d``; tick-times-5; `5 ?\* ?60`, `6 ?\* ?60`, `4 ?\* ?60`; `toLocale*String`; `getHours\(`; `AM\|PM` outside the module; banned copy phrases | 3 date hits; constants at 9377, 9859, 100838, 101001 [V]; `sandbox.html:211` allow-listed (visitor's own clock) |
| TM-V10 (warn) | day-part and lighting agree with the solar table | t326 "near-darkness" with tint 0 |
| TM-V11, V12 | golden byte-identical unless `version` and golden change together; inverse round trip for all ticks and 1,000 random fractions | prototype passes |
| TM-V13, V14 (info) | `record_count`, `tick_range`, schema prose equal generated text; report empty ticks and event-free runs | 4,890 vs 100; 487 empty ticks, 125 event-free |
| TM-V16, V17 | every printed date derives from `parts().date`, never a tab number; every printed time carries `approx` when sigma >= 10 or unsigned | mobile header 103144, toolbar 113086; none |
| TM-V18 | "reviewed"/"accurate to the minute" copy requires a signed decision | none |
| TM-V19, V20 | moment ids permanent, not tick-derived, tombstoned; every moved moment has a migration | none |
| TM-V21 | every quotation has `source`; quotations with clocks carry `data-historical-quote` | 2 unverified |

| ID | Test | Tier | Pass |
|---|---|---|---|
| TT-01 | one-clock at 12 ticks, desktop and phone (TX-01); no "July 4/5" on any battle screen | T2 | 0 mismatches vs golden and `__gtbg.state()` |
| TT-02 | every moment with `real.best`: abs(clock - best) <= 30 min or in range; signed order non-decreasing | T1 | 100% of signed; report for the rest |
| TT-03 | jumpToDay(2/3) and keys 2/3 land at 04:30 with Day 2/3 data; seek 500 to 20 shows only units with keyframe <= 20; boot then Skip shows 71 units | T2 | data within 2 s; exact |
| TT-04 | 16x with 50 ms frames: every HIGH/CRITICAL moment shown once; paused seek then Play shows at most 1 stale toast | T2 | 0 skipped |
| TT-05 | speed label vs measured min/s at 10 ticks; hour buttons; Battle-time 60 min/s over 60 s | T2 | +-5%; half a segment; 1 h +-1% |
| TT-06 | the 9 legacy link builders open the right frame; legacy default bookmark at t460 re-points | T2, T1 | 100% |
| TT-07 | mobile header at t12/t538 never shows "1863", one date+time; `mon_hood` header and body agree | T2 (phone), T1 | pass |
| TT-08 | sub-pages show the same clock at t538 (Compare, Ledger, Camera, Documentary, Education, Turning Points, Sandbox if alive); sandbox labels equal the model | T3, T1 | equal |
| TT-09 | Turning Points 9/9 anchors match an event within +-3 ticks and label time within 20 min | T1 | 9/9 (6 miss today) |
| TT-10 | label contrast under tint at t100, t160, t340, t400, t538; solar sunrise 04:34-04:36, sunset 19:31-19:33 | T2, T1 | >= 4.5:1; pass |
| TT-11 | axe on toolbar, time bar, popover; live region; reduced motion; clock CLS; HUD commits per tick | T2 | 0; <= 1/s; <= 0.001; <= 1 per tick |
| TT-12 | copy lint REALTIME, TICKJARGON, TIMEFMT; mutation test injecting `+ 2`, a typed clock, an unsigned "Reviewed"; golden diff required with any anchor change | T1 | 0; CI red each; pass |
| TT-13 | V7 with dt from the clock; arrival audit | T1 | 0 unreviewed pairs; 0 gaps over 90 min |
| TT-14 | Historian golden GQ-042..050 and GQ-118..125; 3 PM July 2 resolves to tick 250.7 +-2; Sources & Times lists every shown anchor with range, evidence class, sources | T3, T1 | pass |

---

## 9. Sequencing inside this domain

Gates and windows are the register's (DG-0 2026-10-07, DG-1 2026-10-21, DG-2 2026-11-30, DG-3 2027-01-31, DG-4 2027-04-30; freezes 2026-11-15..20 and 2027-06-25..07-05; trains R0, R1, S1-S4, C).

1. Now to 2026-10-07 (nothing ships): owner action 8 (name reviewer and second reader, send the three permission emails), WP-DEC-10/11. Pull the owner-signable D-TIME items (3 D anchors, LMT, first-light tabs, "about" wording, night policy) forward to DG-2 (the register gives latest dates only).
2. R0 (by 2026-10-21): no time change ships; WP-TIME-21 becomes R0 acceptance. R1 (by 2026-11-05, outside the 11-15..20 freeze): WP-TIME-01 in the Tranche 0 runner, the interim "1x" label (docs-copy E4) and `moments.json` v0 with the T0 deep-link parser.
3. 2026-10 to 2026-12: WP-TIME-02, 03, 20 (report-only baseline), 04 set-up, 05 draft ids (all need the D-CI-HOST repo).
4. Reviewer sprint 2026-12 to 2027-01-31 at 5-6 h/week for 8-10 weeks [E, owner decision 1]; WP-TIME-06, 07, 08, 09 execute as decisions arrive.
5. DG-3 (2027-01-31): D-TIME sign-off, or the fallback (all rows `proposed`, pill, "about").
6. Wiring: bridge iff sign-off is over 90 days before cutover (WP-TIME-10, 11, 12, 15, 16, 17), else rebuild-native. WP-TIME-14 folds into the Astro migration; time edits keep 48 h clear of S1-S3.
7. After sign-off: WP-TIME-13, 18, 19, 22; hour pages (S4), Historian clock strings, the dated OG eyebrow and guide clock text release only when their anchors are signed.
8. Target: reviewed clock live by 2027-06-01, three weeks before the anniversary freeze (July 1-3 is peak interest [E]).


---

## 10. Verification debt (verify before the dependent WP is scheduled)

1. Every historical time is unreviewed (45 low-confidence rows, 5 L-tagged rows, 62 other typed claims); Pfanz, Coddington, Sears, Hessler, Wert, Gottfried, Busey/Hartwig and most OR reports were not read [S]; the Black Horse Tavern marker text is from a search summary [U].
2. 32 of 102 comparators are the specialist's own estimates; the E and W flags in 4.4 are my heuristic over source keys [E].
3. Open history: Pickett's night of July 2; t8 date; Colgrove (SS3 6:00 vs about 10:30); 20th Maine (5:10 to after 7 PM); step-off 2:00 vs 3:00.
4. Moon and moonrise at July 2 dusk [U]. Kinematic pairs under the final anchors (19 today); Hood/Law t256-260 (about 2 km in about 11 min).
5. Real-device checks: Story vs Battle-time comprehension, night-tint legibility on a phone, hour-button feel across the 42 min/tick gap.
6. `dv` migration against real shared links (none are known). OR testimony extraction may not yield per-event medians (about 8% of the 5,400 clock expressions fall on July 1-3 [S verifier]).
7. Legacy bridge: only the three date strings are validated as unique matches [S]; other edits need the runner's assert-once run on the frozen bundle.
8. Rights: publishing ranges and source keys; Wikipedia CC BY-SA text not copied; counsel view under D-LEGAL before any dataset release (D-LICENSE).
9. `translate="no"` protecting clocks from Chrome auto-translate is an inference [E].
10. Capacity: 31-51 reviewer hours here plus 59-95 in the Historian plan against a 3-4 h/week charter.

---

## 11. Owner decisions (defaults stay in force unless overridden in writing)

1. Name the reviewer and second reader; hours: default 5-6 h/week for 8-10 weeks, then 3-4 (D-HIST-REVIEW, DG-2).
2. Sign the 3 D anchors (t100 20:00, t226 04:30, t675 20:00) and conventions: local mean time only, tabs at first light 04:30, "about" wording (D-TIME, DG-3, earlier allowed).
3. t5 anchor: drop, or import as D sigma 30 (default).
4. Provisional launch when no reviewer by DG-3: ship `proposed` rows with the pill and "about" (default yes).
5. "About" threshold: sigma >= 10 (register default) or 20 to cut noise.
6. Night stretches: keep tick density with Story-mode skip (default) or flag as time-lapse.
7. Triage scope: t8 as a context card (default) or delete; July 4 items as epilogue cards (default) or ticks 676+.
8. Playback: Story default; Battle-time as a visible control (default, ladder 1/5/15/30/60) or keyboard only.
9. Night tint default on with alpha <= 0.25 and a Daylight toggle (default) or off.
10. Bridge or wait (rule: over 90 days between sign-off and cutover; default plan the bridge).
11. Wording: approve "moment by moment", the ban list, D-CLOCK.
12. Publishing evidence: Sources & Times credit line; low-authority labels for SS/THJ/CWC. Labs dispositions (Sandbox, Cinematic Export, Watch Together, Immersive) drop or keep time work.

Top risks: no reviewer means C4 and H10 cannot be certified A+ (D-EVIDENCE needs a non-author artefact); reviewer load is 90-146 h against 3-4 h/week (23-49 weeks); 18 of 33 anchors rest on secondary or compilation sources and a wrong anchor shifts every tick in its segment; re-ticking changes what a tick shows; 34.8% of the timeline is night with sparse events; the bridge is throwaway; near-universal "about" can read as evasive.

---

## 12. Decision conflicts (deviations from the register or specialists, all explicit)

1. URL parameters: app-time 8 proposes `at=<ISO time>` and `av`; D-URLSTATE gives `at` to the camera centre and `dv` to the stamp. Register obeyed: no time-address parameter is written, `dv` replaces `av`, `t` stays a read-only alias.
2. Registry file: app-time `events.json` vs the register's `moments.json`. Register obeyed; this chapter defines the time fields.
3. T0 scope: app-time Phase 0 also unified the 05:00 base and the event-card label; the register says T0 ships the date fix alone. Obeyed; residue in WP-TIME-01.
4. Effort: the register's D-TIME line is model 1-2 d, wiring 3-5, content 2-5 (6-12 d) and its Tier-1 envelope has time+data at 9-16 d. This chapter's bottom-up is 21-38.5 d for the core path and 31-56 d gross: verifier-added scope (lazy-chunk rename cascade, ensureDay, toast burst, minute windows, calendar vs tab, mobile clock contract), triage raised to L-XL, validators, permalink migration. The master schedule should re-total; about 7-12 d (WPs 14, 18, 19, 20) overlap other chapters.
5. Reviewer hours: D-HIST-REVIEW cites 3-4 h/week and 59-95 h; the time programme adds 31-51 h (hist-final-plan 8.4 allots 4-6 h). Flagged, not overridden (owner decision 1).
6. D-TIME's "about when sigma >= 10" marks nearly every tick; obeyed, alternative offered (owner decision 5).
7. D-LANG's "one Intl formatter": the module is the single formatter and uses no `Intl` (same intent, fewer call sites).
8. D-ENTRY item 4 (no clock text in the 20-second moment until D-TIME) is obeyed; the moment spans R anchor t538, so that decision is scheduled first.
9. **D-NAME's "Five-Minute Steps" vs this chapter.** The register's home title ("Gettysburg Interactive Map: The Battle in Five-Minute Steps", S2, latest 2026-12-15) uses a phrase that TX-05 and section 4.9 ban, because under the time-warp a moment is 0.83-42.3 minutes (mean 5.6) and D-TIME sign-off (DG-3, 2027-01-31) comes after S2. Chapter 11 DC-1 and chapter 15 section 13 item 7 already propose the neutral title "The Battle, July 1-3, 1863" for S2. This chapter adopts that: no clock-implying wording ("minute-by-minute", "real time", "five-minute") ships before D-TIME is signed; the owner must amend D-NAME (register section 10) or accept a second title change after DG-3.
10. **T0 date interim.** The T0 date patch prints the Day-tab number as the calendar date, so 149 ticks (t160-225, t368-450) read one day early until WP-TIME-10; the register accepts this ("date fix ships in T0 with no decision") and TX-03 is the gate that closes it.
11. **Effort netting.** The 31-56 d gross here overlaps chapter 02 (WP-TIME-01 = WP-T0-07 date patches), chapter 03 (WP-ARCH-13, 22), chapter 06/07 (accessibility of time) and chapter 13/14 (data, Historian); chapter 15 section 2 nets the "one clock" cluster (27-47.5 d gross to 24.8-44.5).
