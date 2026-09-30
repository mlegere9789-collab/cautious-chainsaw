# app-time — Time/Date Model: full trace, root causes, canonical design, migration, validator, patch map

Specialist: `app-time` · Date of analysis: 2026-09-29 · Mode: READ-ONLY (no site file modified; scripts and prototypes live in `plan-work/tmp-app-time/`)
Line numbers cite `bundle.pretty.js` (the prettier-formatted copy of the deployed `assets/index-Cg8FAMXN.js`) unless a file name is given. Sub-page and data citations are to `DEPLOY_DIR` (`C:/Users/mlege/AppData/Local/Temp/claude/site/deploy`).

---

## 0. Executive summary

1. **There is no single clock.** I found **at least 9 independent tick→clock/date implementations** and **a dozen further data/copy layers where a human typed a clock time or a duration beside tick numbers**. No two agree, and none matches history or the site's own prose. The same tick (e.g. 28, "Reynolds killed") is displayed as **8:15 AM** (map toolbar/mobile header), **7:20am** (event card), **7:15 AM July 3** (monument tooltip), **July 3, 7:15 AM** (ancestor timeline), **"July 3, 1863"** (map HUD badge) and **10:15 AM July 1** (monument text and vignette V-002 — the historically defensible one).
2. **Why the map is "+1 h" vs the data labels:** the store's `getTickTime` (9371–9383) starts Day 1 at **06:00** and Days 2–3 at **04:00** (`R = (P === 1 ? 6 * 60 : 4 * 60) + H`), while `chronology_day*.json` declares "Tick 1/226/451 = 5:00am" and every sub-page and `M4()` use 05:00. Day 1 is therefore +60 min, Days 2–3 are −60 min, and the hand-typed Day-1 chronology labels are a further +5 min ahead of their own formula from tick 12 on (→ tick 17: map 7:20 vs label 6:25 = +55 min; tick 451: map 4:00 vs label 5:00 = −60 min). Regression archaeology: the 06:00/04:00 constants are **absent from the Jun-13 build** (`index-dw1swkmu.js`: `k=5*60+H`) and **present in later builds** — a partial, undocumented patch that made the main map disagree with everything else.
3. **Why dates are +2 days (C3):** a literal `+ 2` in three formatters — HUD badge `` `July ${l + 2}, 1863` `` (97428), `JF` monument tooltip (100842) and `QF` ancestor timeline (101006). It is *original* (already in the Jun-13 build in all three places plus the store); the store copy was later fixed to `July ${P}` but the other three were never touched. Separately, the store prints **"July 1, 12:00–12:40 AM" for ticks 217–225** (Day-1 tab after midnight) because the calendar date never rolls over.
3b. **New (not in the audit): the deployed main map ignores every deep link except `?ancestor=`.** `bundle.pretty.js:101019` is the *only* `URLSearchParams`/`location.search` read in the app. The bookmark share URL builder emits `?t=&u=&z=&ll=` (97822–97830), nine sub-page/embed link builders (7 pages) emit `?tick=…&vignette=…`, `?unit=…&tick=…`, `?unit=…` and `?lat=…&lng=…`, the user guide promises "Share a permalink" — and **none of them is consumed** (also true of the Jun-13 build). "?tick= must stay backward compatible" therefore means: build the consumer once, accept `tick`, `t`, `at`, `vignette`, `unit`/`u`, `z`, `ll`, `ancestor`.
4. **The site's own data proves a single 5-minute formula cannot be right:** casualty_apportionment says Pickett's Charge = "approximately 30 minutes" over ticks 538–558 (**1.5 min/tick**), Third Corps' July-2 afternoon = "approximately 2 hours" over ticks 256–330 (**1.6 min/tick**), Culp's Hill = "seven hours" over ticks 451–534 (**5.1 min/tick**), the Day-1 approach march (C-7TN/C-13AL move ~3.6 km between ticks 9 and 14) requires **≥ 5 min/tick even at double-quick and ≈ 14 min/tick at march pace**, while the July-2 "long morning" is 226→255 (**~24 min/tick**). The ticks are a *narrative time-lapse* with adaptive rate.
4b. **Independent verification.** The `time-facts` specialist's sourced research (`plan-work/time-facts*.csv`, snapshot used here: 23:57 local, 2026-09-29) corroborates this with *sourced* times: across 134 chronology events, the typed label is off by a mean of 4.9 h (median 3.9 h, worst 19 h) and the map clock by a mean of 5.0 h. Of the 137 events, 102 (74 %) are pure relabel cases that an anchor table repairs mechanically, while 27 (19 %) are *content* defects no clock can fix — 12 MISORDERED, 4 WRONG-DAY, 9 COMPOSITE, 2 UNVERIFIED-QUOTE (§4.5). Its proposed anchor set (33 anchors) loads into the prototype module unchanged (strictly increasing, 1..675) and is used as the *provisional real input* in §6.6.
5. **Decision: (a) piecewise-linear time-warp through verified anchors — not (b) re-timing onto a true 5-minute grid.** Ticks stay the stable primary key of 1,804 placement keyframes, 137 chronology events, 24 vignettes, 42 succession records, 20 monuments, 16 auto-tour stops, saved bookmarks, watch-together stop lists and every existing link; only the *derived* clock changes. (b) is strictly harder (it *is* (a) plus re-keying everything) and impossible without inventing data (only **188 of 675 ticks carry any placement record; 1,804 records total vs the "430,000+" the schema promises**). A "true-time" playback mode is still delivered as a **runtime mode** using `minutesToTick()` (no data migration).
6. **Deliverables in this report:** the full formula inventory with example outputs (§2), root-cause proofs (§3), authored-claim and duration-claim evidence (§4), structural facts that constrain the design (§5), the canonical model + tested reference module + anchor JSON schema + fit algorithm (§6), consumer-by-consumer consequences (§7), URL spec (§8), migration + rollout hazards (§9), validator rules + tests (§10), exact patch locations for the bundle, the reconstructed source tree, sub-pages, data and copy (§11), and 20 structured findings (§12).
7. **Prototype evidence (all run, not hypothetical):** `tmp-app-time/time-model.mjs` + `time-model.test.mjs` — 13/13 tests pass (anchors exact, strictly monotone over all 675 ticks, exact inverse, date rollover independent of Day tab, formats incl. ISO/legacy-compat shape, "+1 hour" navigation, deep-link backward compatibility, rejects non-monotone anchors). `fit_anchors.py` / `kin_fit.py` implement the anchor fitter; `err_table.py` measures today's clocks against the site's own authored real-time claims.

**Headline numbers** (27 authored real-time claims vs today's clocks, `err_table.py`): mean absolute error **4.9 h** (store), **4.7 h** (5:00-base formulas), **4.6 h** (chronology labels); max error **10.3 h**; sign is *always* "clock too early".

> Historical *truth* of the anchors is owned by the `time-facts` specialist (`plan-work/time-facts*.csv`, still being refined while this report was written — every derived number below is regenerated by `tmp-app-time/tf_summary.py`). This report designs the machinery and the process; clock values shown for anchors are **the specialist's proposal (status S/M/R/D per anchor), the site's own authored claims, or explicitly labelled DEMO/PROVISIONAL** — I did not independently verify any 1863 time; I checked the proposal for internal consistency (monotone, slopes, kinematics) only. §6.6 applies it.

---

## 1. Method and evidence conventions

* Read `BRIEF.md` and the audit; traced every tick↔time conversion in `bundle.pretty.js` (app region: lines 9300–10010 and 92000–113377; the rest is inlined mapbox-gl), the two lazy chunks (`assets/HelpModal-*.js`, `assets/BookmarkPanel-*.js`), `index.html`, `sw.js`, `netlify.toml`, all 20 sub-pages, and all `data/*.json` (scripted text mining: `scan_text_times.py` → `text_times.json`, 355 hits).
* Regression archaeology on 15 older `index-*.js` builds in `Downloads/deploy-6a2da5d2…` (Jun 13) and `deploy-6a3a0355…` (Jul 20 folder) to date when each constant appeared.
* Kinematic analysis of all 1,804 placement keyframes (`kin.py`, `kin2.py`, `kin3.py`, `kin_demo.py`, `kin_fit.py`).
* Uncertainty is stated inline. Where I say "intent unknown" I could find no comment, README or commit text.

---

## 2. Trace: every place that converts tick → clock/date (or types one beside a tick)

### 2.1 Runtime formulas in the main bundle (`bundle.pretty.js`)

| ID | Where | Rule | Offset / date | Surfaces it feeds |
|---|---|---|---|---|
| **A** | 9371–9383 `getTickTime` in the zustand store (`yn`) | `M=(x-1)*5`; `z` = 0/1125/2250 (day offset in minutes); `R=(P===1?6*60:4*60)+(M-z)`; `hour=floor(R/60)%24`; date printed `July ${P}` | Day 1 base **06:00**, Days 2/3 base **04:00**; correct date but **no midnight rollover** (ticks 217–225 print "July 1, 12:xx AM") | desktop toolbar label `xi` (113054, drawn 113088); desktop time bar `R()` (112226, via 112212); mobile header clock `Xa` (102976–102977, drawn 103145) |
| **B** | 97427–97428 `_F` (map HUD, top-left) | `l = day; R = \`July ${l + 2}, 1863\`` | **date +2** (July 3/4/5) | HUD badge (97444) |
| **C** | 100836–100843 `JF(c,f)` | `M=(c-dayOff(f)-1)*5; P=5*60+M` → `H:MM AM July ${f + 2}`; `f` = **monument.day** (not derived from tick) | base **05:00**, **date +2** | monument hover "Click to jump to …" (100889 `JF(kt.tick, kt.day)` → 100956) |
| **D** | 100998–101007 `QF(c)` | day from tick; `P=5*60+M`; `` `July ${f + 2}, ${R}:${mm} ${ampm}` `` | base **05:00**, **date +2** | Follow-Your-Ancestor timeline rows (101078 → 101257) |
| **E** | 9856–9860 `M4`, 9861–9884 `E4`, 9885–9907 `A4/C4` (called 97310 on every tick change) | `hour = (5*60 + M)/60`; tint table keyed on `hour % 24` (night <5 or ≥21; dawn 5–8; dusk 16–21) | base **05:00**; thresholds ≈1 h earlier than real sunset (computed local sunset ≈19:32, civil dusk ≈20:05) | day/night multiply overlay on the desktop map |
| **F** | 97481–97483 `yF(c,f)` | `(c - dayStartTick) / 224` | linear 224-tick fraction | day-progress ring in HUD (97472) |
| **G** | 97865–97896 `IF(c)` | 26-entry `{tick: "name"}` table, fallback `` `Tick ${c}` `` | tick-keyed event names | bookmark default label; BookmarkPanel imports it as `m` (`assets/BookmarkPanel-C5YT4b5k.js`, `"Share Current View"` label and placeholder) |
| **H** | 98595–98662 `LF` chronology **event card** | matches `f.byTick[c]` (98607, **exact tick only**), `significance !== "low"`, shows `l.time` (98630) = the hand-typed JSON label | data label (see §4.1) | HIGH/CRITICAL cards. `LF` is mounted at 113247 as a **root-level sibling of the `Zn !== "mobile"` fragment**, so it (and `_F` 113248, `IO` 113249, minimap 113245) renders in the Mobile layout too; the mobile scrubber dots (103191–103215) read the same JSON |
| **I** | 112187–112201 `f2`/`TO`; 112202–112360 `IO` | scrubber day segments (ticks 1/226/451), 8 named markers (17 "First shot", 28, 52, 267, 302, 518, 538, 551); `Shift+←/→` and the "Back/Fwd 1hr" buttons do `c ± 12` (112218–112219, 112310, 112334, 112979, 112984); footer `Tick c/675` (112357) | "1 hour = 12 ticks" is baked in | bottom bar + keyboard. Mounted unconditionally at 113249 → also drawn over the Mobile layout (very likely the 572 px transport row of C1 and the second clock on phones — inference, not measured here) |
| **J** | 96948 `cF=500` / 96982 `Pe = cF / R` / 97013 | playback = `500/speed` ms per tick → **2 ticks/s at 1×** | HUD label 97429 says `"1x (real time)"` (H9) | HUD; help "Reset to 1× speed" |
| **K** | 101471–101545 `tO` boot splash (`eO=3500`) | sets `currentTick` 1→675 over 3.5 s ("Fast-forwarding 3 days of battle…" 101542) then resets to tick 1 | fake fast-forward through the **real** store (so every clock consumer runs during boot) | splash |
| **L** | 100063–100320 `th` (16 NPS auto-tour stops), 100323–100345 `XF` | each stop = `{tick, tickWindow, subtitle:"… — July 2, 4:00 PM"}`; auto-pause `setTimeout(tickWindow*500/2)` at speed 2 (100336–100338) | **typed real clock** beside a tick (§4.2) | tour panel |
| **M** | 100615–100835 `mA` (20 story-marker monuments) | `{tick, day, label:"… 10:15 AM July 1 …"}` | **typed real clock** beside a tick | monument pins + tooltip |
| **N** | 98729–98737 `zF`; 111819–111855 `Gc` onboarding tour | quick-pick ticks (20th Maine 267, Iron Brigade 27, 26th NC 28, Cushing 549, Armistead 551, 15th AL 268); onboarding stops at ticks 1, 17, 28, 267, 538 whose prose says "Dawn", "July 2 afternoon", "July 3" beside a clock reading 6:00 AM/7:25 AM/11:15 AM | tick-keyed prose | search panel; onboarding |
| **O** | 97540–97570 `vF/xF/bF`; 99888–99960 toasts `qF`; 101679–101740 `nO` | commander successions keyed by `approx_tick`; toast footer `"Tick " + l.tick` (99949–99951); toast lifetime is wall-clock 4.5 s (99909/99915) | tick text, no clock | toasts, unit panel "(tick N)" (97566) |
| **P** | 98010–98060 unit panel; 98255–98345 vignette panel; 99711–99822 minimap | `"At Tick "` (98031); vignette shown when `byTick[c-Xe]`, `Xe=0..2` (98268); jump button `⏩ {tick}` (98340–98343); minimap footer `"{n} units · tick {z}"` with `n = (x[z]\|\|[]).length` = records **at exactly that tick** (99821 → H11) | tick text | panels |
| **Q** | 102914–103400 mobile `pO` | `di = f<=225?1:…` (102975); header `"July " + di` (103144) + `Xa` (A); day tabs (103159–103173); transport row shows `"Tick f/P"` (103240) | date correct, clock = A | mobile |
| **R** | 112921–113110 `AO` desktop shell | `va` (113055) → `"July " + va` (113086); keyboard `1/2/3` → ticks 1/226/451 (112991–112996); `+ - 0` speed (112998–113005, cap 16× vs buttons' 8×) | day tab = ticks 1–225/226–450/451–675 | toolbar |
| **S** | 97822–97833 `$k`/`TF`; 97853–97864 `RO` | share URL `?t=<tick>&u=&z=&ll=`; bookmark record `{tick,label,unitId,center,zoom,created,url}` in `localStorage["gettysburg_bookmarks"]` (97821 `Wk`) | tick is the persisted key | bookmarks |
| **T** | 101019 | `new URLSearchParams(window.location.search).get("ancestor")` — **the only URL-state read in the app** | — | ancestor deep-link |

No `toLocaleTimeString`, `getHours`, `Intl.DateTimeFormat` or `Date` arithmetic exists in the app region of the bundle (only inside mapbox-gl); every conversion is hand-rolled integer arithmetic on `(tick-1)*5`. The only `toLocaleTimeString` in the whole product is `sandbox.html:211` (the visitor's wall clock for a change log).

Lazy chunks: `assets/HelpModal-CFV9T0zH.js` (character offsets from file start): `→ "Advance one tick (5 minutes)"` @118, `Shift+→ "Advance one hour (12 ticks)"` @198, `1/2/3 "Jump to July N, dawn (tick 1/226/451)"` @293/340/389, `0 "Reset to 1x speed"` @526; About text "…across **675 five-minute ticks**, tracking **445+** … units" (count conflict = H10). `BookmarkPanel` is described in row G/S.

### 2.2 Sub-pages (each re-implements the mapping, copy/paste style)

| Page | file:line | Rule | Example (tick 226 / 538) |
|---|---|---|---|
| compare.html | 114–118 `dayForTick`; 120–129 `approxTimeForTick`; 245–246 write; hint text line 55 ("e.g. the Union line at 4:00pm vs. 6:00pm on Day 2"); default sliders 60 & 300 (lines 65, 79) | base 05:00 per day, 5 min/tick, lower-case `am/pm`; dead branch `hour>=24 → "am (next day)"` (max hour is 23:40 so never fires); no date shown ("Day N") | `5:00am` / `12:15pm` |
| living-ledger.html | 64 (static "July 1, 5:00 AM"), 90 `DAY_BOUNDS=[1,226,451,676]`, 135–144 `timeForTick`, 151 | 05:00 base; **correct** date `dayIdx+1` | `July 2, 5:00 AM` / `July 3, 12:15 PM` |
| camera.html | 175–179 `hourForTick` (integer hour), 181–187 `atmosphereForHour`, 202 | `(floor(min/60)+5)%24`; dawn 5–7, day 7–17, dusk 17–20, else night | hour 5 / 12 |
| immersive.html | 163–173 (same code), 200 | same; audio cadence is **tick-driven** (`setInterval 350 ms` per tick, 217; cannon `Math.random()<0.5` every ≥2 ticks, 206; musket every tick, 207) | same |
| dashboard.html | 85 `DAY_BOUNDS=[1,225,450,675]`, 163–166 day labels; chart x = tick | labels only | — |
| documentary.html | 84 `dayForTick`; 89 eyebrow `"Day N · Tick T · location"`; 92 link `/index.html?tick=…&vignette=…` | raw tick shown to reader | — |
| education.html | 63 `DAY_TICK_RANGES`; 72–73 filter; 81 link `?tick=&vignette=` | tab ranges | — |
| turning-points.html | 51–100 `POINTS[]` with **typed day-part strings** ("Day 1 · Late afternoon") beside ticks (1, **175**, 240, 267, 300, 340, 460, 540, 560); 118 link `/?tick=` | hand-typed; tick 175 for Ewell's discretionary order contradicts chronology tick **75** | — |
| sandbox.html | 103–107 `startingPoints` labels ("mid-afternoon (tick 260)", "~3:00pm (tick 553)", "mid-morning (tick 62) — I Corps holding McPherson's Ridge"); 223/227 loads; 211 uses the **visitor's wall clock** (`new Date().toLocaleTimeString()`) for the change log | typed labels | — |
| cinematic-export.html | 60/64 defaults 540→600; 99–101 vignettes; 118–121 `nearestVignette` (nearest by absolute tick distance even if 50 ticks away); 213–214 linear tick sweep `Math.round(startTick + progress*tickSpan)`; 175/226 caption `"{location} — tick N"`; 246 file name `gettysburg-tick540-600.webm` | tick-linear; captions show tick | — |
| watch-together.html | 79 placeholder "Tick (1-675)"; 172 stop rows `Tick N`; 192 caption; 201–202 `{type:'goto', tick, note}` broadcast; 281 clamp 1..675 | integer tick is the sync key | — |
| regiment.html | 189 `dayForTick`; 218–219 timeline "Day N · ticks a–b"; 246–247 link `/?unit=…&tick=…` | raw ticks | — |
| search.html 125–127, historian.html 109–110, embed.html 60 | print `tick N`; emit `?tick=…&vignette=…` | raw ticks | — |
| ground-remembers.html | 42 ("675 five-minute snapshots"), 47 "Reveal through tick", 75–79 filter `p.tick <= maxTick` | raw ticks | — |
| index.html | 15, 18, 24, 32 (meta/OG/Twitter/JSON-LD), 719, 754 (SEO/boot block): "**unfold in real time** … **675 five-minute snapshots**", "minute-by-minute" | copy claims | — |
| manifest.json:4, terms.html:30, user-guide.pdf p1 (`ug.txt` lines 9–10, 20–21, 32–33, 93) | same claims; guide says "Shift+→ Jump 1 hour", "Save the current tick … Share a permalink" | copy claims | — |

Pages with **no** tick↔time code (checked): `report.html` (strength/casualty figures only), `find-ancestor.html`, `viewshed.html`, `ar.html`, `aftermath.html` (static dates July 4 – November 1863; its own caveat says it is not tick-based), `404.html`, `privacy.html`, `terms.html` (copy only: line 30).

### 2.3 Data files

| File | Field | Rule / claim |
|---|---|---|
| `chronology_day1/2/3.json` | `metadata.tick_formula` ("Tick 1 = 5:00am July 1. Each tick = 5 minutes. Day 1 = ticks 1-225", likewise 226/451) and per-event `time` | formula says 5-min; the `time` strings follow it only for Day-1 ticks 1–8 (0 drift), then **+5 min** (t12–90), **+15 min** (t95–100), Day 2: **0 drift to t310, then −10…−230 min**, Day 3: **0 to t465, then −20…−215 min** (§4.1) |
| `chronology_*` `event`/`narrative` text | embeds real clock times that disagree with the label on the same record: t12 label "6:00am" / text "7:30am"; t38 label "8:10am" / narrative "noon lull lasted roughly 10:30am-1:00pm"; t100 label "1:30pm" / text "By nightfall … Meade arrives in person at ~11pm"; t515 label "9:15am" / text "ends at approximately 11:00am"; t518 label "9:30am" / text "At approximately 1:00pm … 170 Confederate guns" | prose was written on the real clock, labels were generated |
| `placement_schema.json` | `metadata.ticks_per_day.day1/2/3.real_time` = "5:00am July 1 to 12:40am July 2", "5:00am July 2 to 7:50pm July 2", "5:00am July 3 to 8:05pm July 3"; `tick.description` "The 5-minute tick number. Tick 1 = 5:00am July 1." | 225 ticks × 5 min = 18.75 h, but Day 2 claims 14 h 50 min and Day 3 15 h 5 min; Day 1's "12:40am" is what a **06:00** base would print (6:00 + 224×5 min) — the schema itself mixes 05:00 and 06:00 |
| `placements_*.json` `metadata.description` | e.g. "5:00am to approximately 9:10am" (ticks 1–50) | implied minutes/tick per chunk: **5.1, 5.3, 5.4** (Day 1), **5.0, 2.8, 4.3** (Day 2), **3.8, 4.4, 3.9** (Day 3) (`chunkdesc.py`) |
| `casualty_apportionment.json` | `engagement_periods[].tick_range` + free-text durations | see §4.3 |
| `vignettes_part1-3.json` | `trigger_tick` only (no time field); `panel_summary`/`full_script` prose carries real clock times ("At approximately 7:30am… first shot" V-001 tick 12; "10:15am" V-002 tick 28; "1:00pm" V-017 tick 518; "7:30 in the morning" V-022 tick 460) | the vignette layer is on the **real** clock |
| `oob/commander_successions.json` | `approx_tick` (42 records), `metadata.tick_duration_minutes: 5` | tick-only; cross-source disagreements (§4.4) |
| `density_*.json` `notes` | typed times at ticks: t255 "the assault begins at 4 PM"; t440 "Steuart's brigade at 4 AM"; t518 "CANNONADE BEGINS at 1 PM"; t460/t495 "Culp's Hill … by 11 AM"; t500 "One hour to the cannonade"; t516 "approximately one hour until the charge" and "approximately 45 minutes until the cannonade" | mixed real-clock and duration claims |

### 2.4 Master table — the same ticks through every formula (`formulas.py`)

| tick | **A** store (toolbar/mobile/time bar) | chronology label (event card) | **C** `JF` monument tooltip | **D** `QF` ancestor timeline | **B** HUD badge | ledger / compare / camera / immersive (05:00 base) | `M4` overlay hour |
|---|---|---|---|---|---|---|---|
| 1 | July 1, 6:00 AM | 5:00am | 5:00 AM July 3 | July 3, 5:00 AM | July 3, 1863 | July 1, 5:00 AM | 5.00 |
| 12 | July 1, 6:55 AM | 6:00am | 5:55 AM July 3 | July 3, 5:55 AM | July 3, 1863 | July 1, 5:55 AM | 5.92 |
| 17 | July 1, **7:20 AM** | **6:25am** | 6:20 AM July 3 | July 3, 6:20 AM | July 3, 1863 | July 1, 6:20 AM | 6.33 |
| 28 | July 1, 8:15 AM | 7:20am | 7:15 AM July 3 | July 3, 7:15 AM | July 3, 1863 | July 1, 7:15 AM | 7.25 |
| 100 | July 1, 2:15 PM | 1:30pm | 1:15 PM July 3 | July 3, 1:15 PM | July 3, 1863 | July 1, 1:15 PM | 13.25 |
| 201 | July 1, 10:40 PM | — | 9:40 PM July 3 | July 3, 9:40 PM | July 3, 1863 | July 1, 9:40 PM | 21.67 |
| 225 | **July 1, 12:40 AM** | — | 11:40 PM July 3 | July 3, 11:40 PM | July 3, 1863 | July 1, 11:40 PM | 23.67 |
| 226 | July 2, **4:00 AM** | 5:00am July 2 | 5:00 AM July 4 | July 4, 5:00 AM | July 4, 1863 | July 2, 5:00 AM | 5.00 |
| 267 | July 2, 7:25 AM | 8:25am | 8:25 AM July 4 | July 4, 8:25 AM | July 4, 1863 | July 2, 8:25 AM | 8.42 |
| 300 | July 2, 10:10 AM | 11:10am | 11:10 AM July 4 | July 4, 11:10 AM | July 4, 1863 | July 2, 11:10 AM | 11.17 |
| 451 | July 3, **4:00 AM** | **5:00am July 3** | 5:00 AM July 5 | July 5, 5:00 AM | **July 5, 1863** | July 3, 5:00 AM | 5.00 |
| 518 | July 3, 9:35 AM | 9:30am | 10:35 AM July 5 | July 5, 10:35 AM | July 5, 1863 | July 3, 10:35 AM | 10.58 |
| 538 | July 3, 11:15 AM | 11:05am | 12:15 PM July 5 | July 5, 12:15 PM | July 5, 1863 | July 3, 12:15 PM | 12.25 |
| 551 | July 3, 12:20 PM | 12:10pm | 1:20 PM July 5 | July 5, 1:20 PM | July 5, 1863 | July 3, 1:20 PM | 13.33 |
| 675 | July 3, 10:40 PM | 8:05pm | 11:40 PM July 5 | July 5, 11:40 PM | July 5, 1863 | July 3, 11:40 PM | 23.67 |

(`JF` was evaluated with `day` = the tick's day. For real monuments `JF` uses `monument.day`; e.g. `mon_hood` tick 262 day 2 prints **"8:00 AM July 4"** in the tooltip while the tooltip body right above it says **"…wounded in the arm at 4:00 PM July 2"** — a self-contradicting tooltip.)

The Compare page's example prose ("the Union line at 4:00pm vs 6:00pm on Day 2") points at ticks 358 and 382 under its own formula — i.e. Culp's Hill night ground, not the afternoon fighting the sentence implies.

---

## 3. Root causes (proofs)

### 3.1 Why the main map is ≈ +1 h against the data labels (tick 17 → 7:20 vs 6:25am; tick 451 → 4:00 AM vs 5:00am)

Store `getTickTime` (9371–9383), verbatim:

```js
const { currentTick: x } = f(),
  M = (x - 1) * 5,                                   // minutes since tick 1
  P = x <= 225 ? 1 : x <= 450 ? 2 : 3,               // Day tab
  z = P === 1 ? 0 : P === 2 ? 225 * 5 : 450 * 5,     // minutes at the start of that tab (1125 / 2250)
  H = M - z,                                         // minutes since the tab's first tick
  R = (P === 1 ? 6 * 60 : 4 * 60) + H,               // <-- Day 1 starts 06:00, Days 2 and 3 start 04:00
  ...
return `July ${P}, ${Ie}:${String(Ee).padStart(2, "0")} ${Se}`;
```

Data contract: `chronology_day1.json` `metadata.tick_formula` = "Tick 1 = 5:00am July 1", day 2 "Tick 226 = 5:00am July 2", day 3 "Tick 451 = 5:00am July 3". So relative to the *declared* formula the map is **+60 min on Day 1** and **−60 min on Days 2–3**. The hand-typed Day-1 labels are a further **+5 min** ahead of their own formula from tick 12 on (label = 5:00 + tick×5 min instead of + (tick−1)×5). Therefore:

* tick 17: map 06:00+80 = **7:20** · formula 5:00+80 = 6:20 · typed label **6:25** → map − label = **+55 min** (the "≈ +1 h").
* tick 451: map 04:00 · formula/label **5:00** → **−60 min** (audit: "shows 4:00 AM vs 5:00am").
* tick 226: map 4:00 AM vs label "5:00am July 2" (−60).
* Consequence on late Day 1: 06:00 + 224×5 min = 24:40 → the store prints **"July 1, 12:00 AM"…"12:40 AM"** for ticks 217–225 (calendar date never rolls over). `placement_schema.json`'s "5:00am July 1 to **12:40am July 2**" is exactly what a 06:00 base yields, so the schema text was written against the 06:00 convention while its own `tick.description` says "Tick 1 = 5:00am".

Why 06:00/04:00 exists (regression archaeology, `Downloads/deploy-6a2da5d2…` and `deploy-6a3a0355…`, extracted with `python` from each `index-*.js`):

| build (file) | store base | store date | HUD / JF / QF date |
|---|---|---|---|
| Jun-13 `index-dw1swkmu.js` | `5*60+H` | `July ${p+2}` | `+2` in all three |
| Jul-20 folder `index-dxl2qzdp.js`, `index-u9eqo3j0.js` | `5*60+…` | `+2` | `+2` |
| `index-8l17s2xs`, `-bq9ored4`, `-bwvnl5jq`, `-c6d6zto2`, `-chklt4bw`, `-dpys44uw`, `-ds4kxwjj`, `-dxa92azh`, `-qmdzsehw` | **`(R===1?6*60:4*60)+…`** | `+2` | `+2` |
| `index-aneysg9a`, `index-cg8famxn` (Jul-20 copy) and the **Sep-29 deploy** | 6/4 | **fixed: `July ${P}`** | **still `+2`** |

So: the 06:00/04:00 bases were introduced in a **later patch of the store only**, and the store's date was fixed **later still**, without touching the other three copies. No README/PENDING/comment explains the intent (RECON_SRC's `PENDING.md`/`README.md` contain no mention). The reconstructed source (`src/store/store.js:51–61`) still has the *original* 05:00/`+2` version, i.e. RECON_SRC predates both patches.

### 3.2 Why the date is +2 days (C3)

Three literal `+ 2` offsets, all present since the Jun-13 build:

| Site | Code | Effect |
|---|---|---|
| HUD badge `_F` | 97428 `` `July ${l + 2}, 1863` `` (l = 1..3) | "July 3/4/5, 1863" |
| `JF` | 100842 `… July ${f + 2}` | monument tooltip "…jump to 5:55 AM July 3" on Day 1 |
| `QF` | 101006 `` `July ${f + 2}, …` `` | ancestor timeline "July 4" for the 20th Maine at Little Round Top |

Root cause (inferred; no comment exists): an off-by-two constant copied into every formatter when the first author generated the store; the day variable is 1-based (`x <= 225 ? 1 : …`), so `+ 2` is simply wrong. Only the store copy was ever repaired. Because there are four independent copies and no test, the defect survived three rounds of "fixes".

Additional date defects found while tracing:

* **No midnight rollover** in A (ticks 217–225 print July 1, 12:xx AM).
* **`JF` takes the *monument's* `day`**, not the tick's; a day-tab mismatch would print a wrong date even after removing `+2`.
* **The Day tab ≠ the calendar date.** By any honest clock, the Day-1 tab's last ~30 ticks are after midnight (July 2) and Day-2's last ticks are July 3; the UI has no vocabulary for that (`"July " + va` at 113086 and the mobile day tabs at 103159–103173 print the tab number as if it were the date).

### 3.3 In-place patching of a "hashed" bundle defeats cache-busting (rollout hazard, relevant to every patch in this plan)

`assets/index-Cg8FAMXN.js` in the Sep-29 deploy is **2,280,438 bytes**; the file with the *same name* in `Downloads/deploy-6a3a0355…` (Jul-20) is **2,280,095 bytes** and differs from byte offset **151,648** (the Sep-29 copy adds `showUnits`/`toggleUnits` to the store and rewires the toolbar button from `window.__gtbgApp.__gbToggleUnits` (Jul-20) to `yn.getState().toggleUnits()`). Same content-hash name, different content ⇒ someone patched the minified bundle in place. `netlify.toml` serves `/assets/*` with `Cache-Control: public, max-age=31536000, immutable`, and `sw.js` (lines 41–50) is *cache-first* for `/assets/`; `PRECACHE_ASSETS` names `/assets/index-Cg8FAMXN.js` explicitly (sw.js:5–6). A returning visitor can therefore keep the Jul-20 bundle for a year. **Any time-model patch must ship under a new file name** (content hash) with `index.html`, `sw.js` `PRECACHE_ASSETS` and `CACHE_NAME` (currently `'gbg-v5'`, sw.js:3) updated together. (Owner of the general fix: bundle/deploy specialists; listed here because the time fix silently fails without it.)

---

## 4. What the authored data actually says about time

### 4.1 Chronology labels drift through many pace regimes (`chronology_day*.json`)

Implied minutes/tick between consecutive event labels (script output):

| Day | ticks | label pace | vs declared formula |
|---|---|---|---|
| 1 | 1–8 | 5.0 | 0 |
| 1 | 12–90 | 5.0 | **+5 min** (offset appears at tick 12) |
| 1 | 95–100 | 5.0 (after a 7.0 hop) | **+15 min** |
| 1 | 101–225 | **no events** (0 of 125 ticks) | — |
| 2 | 226–310 | 5.0 | 0 |
| 2 | 310–314 | 2.5 | −10 |
| 2 | 314–340 | 5.0 | −10 |
| 2 | 340–450 | **3.0** | −10 … −230 (tick 450 is labelled "7:50pm"; the declared formula gives 11:40 pm) |
| 3 | 451–465 | 5.0 | 0 |
| 3 | 465–480 / 480–500 | 3.7 / 3.0 | 0 … −20 / −20 … −60 |
| 3 | 500–620 | alternates 5.0 / 4.0 / 3.3 / 3.1 | −60 … −115 |
| 3 | 620–675 | 3.2 | −115 … −215 (tick 675 = "8:05pm") |

So the label sequence has **21 pace segments (18 pace changes)** inside three days; the labels cannot be reproduced by any function of tick. There are 137 events on 137 distinct ticks (16 medium, 73 high, 45 critical, 3 low). **Most important:** the labels are what the desktop event card prints (98630), while the toolbar prints formula A — two different clocks in adjacent UI at the same tick.

### 4.2 Authored real-time claims (stops, monuments, notes, vignettes) vs every clock in the product

27 claims where the site's own text states a real clock time for a specific tick (`err_table.py`, `stop*` = `th` in bundle 100063–100320, `mon_*` = `mA` 100615–100835, `density_*` = data notes, `V-nnn` = vignettes, `chron` = chronology prose):

| tick | source of claim | claimed | A store | err | chronology label | err |
|---|---|---|---|---|---|---|
| 12 | stop 1 + V-001 "first shot" | Jul 1 7:30a | 6:55a | −0.6 h | 6:00a | −1.5 h |
| 20 | mon_iron_brig | 10:00a | 7:35a | −2.4 h | 6:40a | −3.3 h |
| 22 | stop 2 Oak Ridge | 10:00a | 7:45a | −2.2 h | 6:50a | −3.2 h |
| 28 | mon_reynolds + V-002 | 10:15a | 8:15a | −2.0 h | 7:20a | −2.9 h |
| 29 | mon_6wis | 10:30a | 8:20a | −2.2 h | 7:25a | −3.1 h |
| 38 | chron narrative "noon lull … 10:30am–1:00pm" | 10:30a | 9:05a | −1.4 h | 8:10a | −2.3 h |
| 62 | stop 3 Barlow's Knoll | 2:30p | 11:05a | −3.4 h | 10:10a | −4.3 h |
| 63 | mon_barlow | 2:30p | 11:10a | −3.3 h | — | — |
| 75 | stop 4 retreat | 4:00p | 12:10p | −3.8 h | 11:15a | −4.8 h |
| 100 | chron text "Meade arrives ~11pm" | 11:00p | 2:15p | −8.8 h | 1:30p | −9.5 h |
| 255 | density_day2_morning "assault begins at 4 PM" | Jul 2 4:00p | 6:25a | −9.6 h | — | — |
| 262 | mon_hood | Jul 2 4:00p | 7:00a | −9.0 h | — | — |
| 264 | stop 5 Little Round Top | 4:00p | 7:10a | −8.8 h | — | — |
| 268 | stop 6 / mon_20me | 4:30p | 7:30a | −9.0 h | 8:30a | −8.0 h |
| 275 | stop 7 Wheatfield | 5:00p | 8:05a | −8.9 h | 9:05a | −7.9 h |
| 270 | stop 8 Peach Orchard | 6:00p | 7:40a | −10.3 h | 8:40a | −9.3 h |
| 315 | stop 11 Wright | 7:30p | 11:25a | −8.1 h | 12:15p | −7.2 h |
| 322 | stop 9 Louisiana Tigers | 8:00p | 12:00p | −8.0 h | — | — |
| 440 | density "Steuart at 4 AM" | Jul 3 4:00a | Jul 2 9:50p | −6.2 h | 7:20p (Jul 2) | −8.7 h |
| 460 | V-022 Colgrove "7:30 in the morning" | 7:30a | 4:45a | −2.8 h | 5:45a | −1.8 h |
| 515 | chron "ends at approximately 11:00am" | 11:00a | 9:20a | −1.7 h | 9:15a | −1.8 h |
| 518 | chron + density + V-017 "cannonade 1:00pm" | 1:00p | 9:35a | −3.4 h | 9:30a | −3.5 h |
| 522 | stop 13 East Cavalry Field | 3:00p | 9:55a | −5.1 h | 9:50a | −5.2 h |
| 540 | stop 14 Pickett's Charge | 3:00p | 11:25a | −3.6 h | 11:15a | −3.8 h |
| 548 | stop 12 The Angle + mon_cushing | 3:00p | 12:05p | −2.9 h | 11:55a | −3.1 h |
| 551 | mon_armistead | 3:15p | 12:20p | −2.9 h | 12:10p | −3.1 h |
| 554 | mon_hancock | 3:20p | 12:35p | −2.8 h | 12:25p | −2.9 h |

Mean absolute error vs these claims (labels: n = 22 because five claim ticks carry no chronology event): **A 4.93 h**, **05:00-base 4.67 h**, **labels 4.59 h**; median 3.4 / 4.1 / 3.4 h; max 10.3 / 9.75 / 9.5 h. Every error is negative. On Day 1 the authored story advances ~1.6× faster than the 5-minute tick clock (ticks 12→75: 510 authored minutes vs 315 on the clock); on Day 2 the gap opens during the compressed "long morning" (226→255) and then stays ~8–9 h; on Day 3 it is ~2–3.5 h. This is not a rounding problem; it is a structural time-lapse.

Caveats on the claims themselves (important for the fitter): they are **not** all historically right, and they conflict with each other — stop 8 (Peach Orchard, tick 270) says 6:00 PM but stop 7 (Wheatfield, tick 275) says 5:00 PM (order inversion); stops 13/14/12 (ticks 522/540/548) all say 3:00 PM, and the monuments compress Cushing → Armistead → Hancock into 3:00–3:20 PM (a 20-minute climax; the time-facts specialist should confirm the real span); tick 100's prose blends "nightfall" and "~11pm". Authored claims are therefore **evidence to be adjudicated against `time-facts.csv`, never anchors by themselves**.

### 4.3 Duration claims embedded in the data give independent slope constraints (minutes per tick)

| Source | Ticks | Claimed duration | Implied min/tick |
|---|---|---|---|
| casualty_apportionment `notable_intensity_notes.most_compressed_confederate` (Pickett) | 538–558 (20) | "approximately 30 minutes" | **1.5** |
| same file, `most_compressed_union` (III Corps) | 256–330 (74) | "approximately 2 hours" | **1.6** |
| same file, `longest_sustained_action` (Culp's Hill) | 451–534 (83) | "Seven hours" | **5.1** |
| same file, U-I period | 18–75 (57) | "3-hour window" | 3.2 |
| `density_day1_iverson` note @ tick 60 | ~8 ticks (t52→t60) | "900 of 1400 men in 20 minutes" | ~2.5 |
| `density_day3_vermont` note @ 554 | 546–554 | "Two charges in 8 minutes" | ~1.0 |
| `chronology_day2` t302 flag + placements t303 | 302→303 (1) | "224 of 262 men fall in approximately 15 minutes" / "buys 5 minutes" | 5–15 (inconsistent with itself) |
| `density_day3_morning` note @ 500 | 500→518 (18) | "One hour to the cannonade" | 3.3 |
| `placements_day3_ticks451_520` notes @ 516 | 516→518 (2) / 516→538 (22) | "approximately 45 minutes until the cannonade" / "approximately one hour until the charge" | **22** / **2.7** (mutually inconsistent) |
| kinematics of C-7TN (3,762 m) and C-13AL (3,512 m), ticks 9→14 | 5 | double-quick 150 m/min ⇒ ≥25 min; quick-time 84 m/min ⇒ ≥45 min; 2-mph march ⇒ ≥70 min | **≥ 5.0 (hard floor), ≈ 9–14 (plausible)** |

Take-aways: (1) implied pace spans **1.0 to 22 min/tick**; (2) the site is already authored as a variable-rate time-lapse; (3) the kinematic floor on the Day-1 approach march *independently* corroborates the authored "tick 1 ≈ 5:00, tick 12 ≈ 7:30" (11 ticks ≈ 150 min ≈ 13.6 min/tick); (4) several embedded durations contradict each other, so a validator must treat prose durations as *warnings with tolerances*, not hard constraints.

### 4.4 Cross-source disagreements on the tick of the *same* event (need an event registry)

| Event | Ticks used (source) |
|---|---|
| "First shot" | 12 (stop 1, V-001, chronology, `IF`) **vs 17** (desktop scrubber marker `TO`, 112193 — but 17 is "Calef opens fire" in chronology, `IF` and onboarding `Gc`) |
| Ewell's discretionary order | 75 (chronology; stop 4 = 4:00 PM) **vs 175** (`turning-points.html` line 58, "Late afternoon") |
| Hancock wounded | 550 (succession `U-II`), 554 (`mon_hancock`), 552–570 (density pass title) |
| Cushing killed | 548 (`mon_cushing` "last rounds"), 549 (search quick-pick `zF`), 552 (succession), 553 (chronology + V-018) |
| Armistead | 551 (chronology "over the wall", `mon_armistead`, V-016, `zF`), 552 (chronology "mortally wounded", succession) |
| Hood wounded | 258 (chronology, label 7:40am), 262 (`mon_hood` "4:00 PM"), **278** (succession `C-I-2`) |
| Vincent mortally wounded | 270 (chronology) vs **290** (succession) |
| Weed / Hazlett killed | 272 (chronology) vs 293 / 295 (successions) |
| 1st Minnesota's charge | 302 (chronology, V-012, `zF`) vs 295 (`mon_1mn`) |
| Iron Brigade in Herbst Woods ("10:00 AM") | 20 (`mon_iron_brig`) vs 27 (`zF`) vs 27–29 (chronology "double-quicks", "crashes into Archer"); stop 2 places the same 10:00 AM at tick 22 (captioned Oak Ridge) |
| 26th NC | 16 (`mon_26nc`) vs 28 (`zF`) |
| Order of Day-2 evening events | Chamberlain's charge **275** < Barksdale 278 < Peach-Orchard collapse 280 < Sickles wounded 298 in the sim; stop 8 (Peach Orchard, 270 = "6:00 PM") sits before stop 7 (Wheatfield, 275 = "5:00 PM"). Whether this order is historically right must be checked against `time-facts.csv`; the *disagreement itself* is a defect either way |

Spreads of up to 20 ticks (≈ 45–90 clock minutes at the demo slopes) for one event mean a clock model alone cannot make the site consistent; the **event registry** (§6.3) is a required companion.

### 4.5 Independent verification: what a *sourced* clock says about the 137 chronology events (time-facts discrepancy table)

Source: `plan-work/time-facts-discrepancy.csv` (one row per chronology event: typed label, map clock, 5-minute formula, real best time with range, residual under the proposed anchors, and a **class**), `time-facts-otherclaims.csv` (62 typed claims elsewhere) and `time-facts.csv` (129 sourced facts: 98 core / 31 supplementary; confidence H 18 / M 66 / L 45). Regenerated by `tf_summary.py`.

n = 134 chronology events with a sourced real time. |real − typed label|: mean **4.95 h**, median 3.92 h, max 19.2 h. |real − map clock (formula A)|: mean **4.98 h**, median 3.58 h, max 18.7 h. Under the proposed anchors the residual |real − proposed clock| is: mean 51 min, median 18 min, max 650 min; 94 events within 30 min, 40 beyond 30 min (RELABEL-CONTESTED 13, MISORDERED 10, COMPOSITE 5, CONTEXT 5, RELABEL 3, WRONG-DAY 3, UNVERIFIED-QUOTE 1).

Classes (ticks are the site's chronology ticks):

| class | n | ticks |
|---|---|---|
| RELABEL | 60 | 1, 5, 22, 25, 26, 27, 28, 29, 30, 31, 33, 35, 36, 37, 48, 49, 52, 53, 56, 57, 58, 64, 72, 240, 252, 256, 260, 267, 268, 280, 285, 293, 295, 299, 300, 302, 303, 315, 328, 340, 451, 452, 500, 510, 522, 540, 542, 544, 546, 547, 548, 549, 550, 551, 552, 554, 555, 556, 568, 569 |
| RELABEL-CONTESTED | 36 | 14, 17, 20, 42, 54, 60, 62, 68, 75, 80, 90, 230, 235, 248, 258, 263, 265, 271, 272, 275, 287, 290, 320, 324, 330, 455, 480, 505, 520, 532, 538, 553, 558, 565, 572, 650 |
| TEXT-VS-LABEL | 6 | 12, 38, 314, 326, 515, 518 |
| COMPOSITE | 9 | 50, 95, 100, 226, 270, 278, 440, 516, 620 |
| MISORDERED | 12 | 243, 273, 283, 298, 304, 310, 335, 400, 460, 490, 560, 563 |
| WRONG-DAY | 4 | 8, 360, 380, 420 |
| UNVERIFIED-QUOTE | 2 | 525, 530 |
| CONTEXT | 8 | 3, 66, 450, 465, 535, 580, 590, 675 |

Reading: the **RELABEL / RELABEL-CONTESTED / TEXT-VS-LABEL** rows are exactly what an anchor table repairs mechanically (the event sits at a defensible tick; only the label was wrong). The **MISORDERED, WRONG-DAY, COMPOSITE and UNVERIFIED-QUOTE** rows are *content* defects that **no clock model can fix** — the event is on the wrong side of a neighbour, on the wrong day (ticks 360/380/420 are July 3 events sitting in the Day-2 tab; tick 8 is a June-30/pre-dawn conversation), merges several real moments into one tick, or quotes an unverified message (525/530). They are the Phase-3 worklist and the reason the event registry and inversion triage exist. Other typed claims: 62 typed claims (walkthrough stop 16, monument tooltip 9, timeline marker 8, turning point 9, sandbox start 3, vignette 17); of the 59 that carry a clock time: |claim − map clock| mean 320 min (median 215, max 1040); |claim − proposed clock| mean 89 min (median 27); 27 of 59 differ by more than 30 min from the proposed clock (claims that are themselves wrong or contested).

The specialist's own headline numbers and validation (copied from the current `time-facts.md` at assembly time; note it uses the stricter subset of events that map to a single real event, hence slightly different figures from the table above):

> 2. **Size of the error.** Over the 102 site chronology events that map to a single real event, the JSON `time` label is off by a mean of **4.8 h** (median 3.9 h, max 9.5 h; only **5/102** within 30 min). The main-map clock (`getTickTime`) is off by a mean 4.8 h (median 3.6 h; **1/102** within 30 min). The 5-minute formula used by Compare/Living Ledger/Camera/lighting is off by a mean 4.5 h (**7/102** within 30 min).
>
> 4. **A 33-anchor piecewise-linear map (section 7) fixes the clock without touching placements.** In-sample: mean absolute error **21 min** (median 10 min, 86/102 within 30 min, 96/102 within 60 min); leave-one-out anchor prediction RMS 44 min. **Independent check:** the bundle already contains 30 hand-typed real clock times (walkthrough subtitles, monument tooltips, timeline markers). Against the proposed clock at the *same ticks* their median gap is **14 min (21/30 within 30 min)**; against today's map clock it is **214 min (1/30 within 30 min)**. The content authors knew the real times; the clock function is what is wrong.
>
> - In-sample (all 102 matched events): mean abs 21 min, median 10 min, RMS 47 min; within 15/30/45/60 min: 61/86/93/96 of 102.
>
> - Leave-one-out anchor prediction (non-design anchors): RMS 43.9 min; the least predictable anchors are t518 (+96 min), t340 (+93 min), t515 (-86 min), t451 (-77 min), t240 (+68 min), t568 (+51 min), t90 (-48 min) - mostly the ones next to gaps.

Anchors that still need a historian's decision (status R): t75, t90, t248, t275, t538; the time of Colgrove's charge is contested (`time-facts.md` §9).

---

## 5. Structural facts that constrain the design

1. **Placements are sparse keyframes, not a 5-minute grid.** Across `placements_day*.json` + `density_*.json`: **1,804 records, 478 units, 188 of 675 ticks populated** (487 ticks — including 2, 5–7, 10, 13, 15, 18–19, 21, 23–24 — have no record at all), mean 3.8 keyframes/unit, **167 units have exactly one keyframe**. `placement_schema.json` promises "600-700 units per tick … approximately 430000" records and `placements_day1_ticks1_50.json` claims `record_count: 4890` — the array holds **100**. Consequence: a "true 5-minute grid" (option b) would require *generating* ~10^5 positions that do not exist.
2. **Interpolation only exists between records on adjacent ticks.** `y1` (96266–96310) takes `c[f]` and `c[f+1]`; a unit is interpolated only if it has a record at *both* `f` and `f+1` (`F4` 96238–96262). Only **93 of 1,209** consecutive-keyframe pairs are 1 tick apart (gap histogram: 1→93, 2→79, 3→62, 4→75, 5→62, … up to 20+), so most units hold and then jump. The unused `assets/InterpolationWorker-*.js` (672 bytes, not referenced anywhere in the bundle) would linearly interpolate between *two given ticks* but is dead code.
3. **Forward-fill cache is never reset.** `const i2 = {}` (96265) is written at 96271 and never cleared: after a backward seek (tick 500 → tick 20) any unit lacking an exact record at the target tick is still drawn at its **future** (tick-500) position. This is a real time-travel bug (H4/D3 flavour) and must be fixed with the model (`stateAt`, §7.1).
4. **Event/vignette triggers are exact-tick.** `LF` matches `f.byTick[c]` (98607); vignettes match `c`, `c−1`, `c−2` (98268–98272). At ≥ 8× playback, or on a janky frame (`Math.floor(Hc / Pe)` can advance several ticks at 96984), cards are skipped. Toasts (`bF`, 97568–97570) already use the correct *crossing* rule `(prev, cur]`.
5. **Deep links are unimplemented** (only `ancestor`, 101019). Emitters: `$k` (`?t=&u=&z=&ll=`), documentary/education/search/historian/embed (`?tick=&vignette=`), turning-points (`/?tick=`), regiment (`/?unit=&tick=`), RECON_SRC `BookmarkPanel.jsx:32–33` (`?tick=&unit=`). Three different key spellings for the same thing.
6. **Desktop overlays are mounted in the mobile layout** (113242–113283 are root siblings of the `Zn !== "mobile"` fragment): mobile shows both the mobile header clock (A) and the desktop HUD badge (+2) and time bar.
7. **The chronology has no events for ticks 101–225** (the whole Day-1 night). Any event-driven UI is silent for 125 ticks (18.5 % of the timeline).
8. **The desktop and mobile scrubbers use different tick→x maps** (`((tick−1)/(M−1))*100` at 112252–112253 and 112271 vs `tick/P*100` at 103197): with a warp the scrubber x-scale should be a *design* decision (linear in tick = "story time", or linear in clock), not an accident.
9. **`/data/*` is `max-age=3600` and the SW is network-first for data but cache-first for `/assets/`** (sw.js:41–70): a JS/data pair deployed together can be mixed for up to an hour or a year. The plan versions the anchors file and keeps legacy fields for one release (§9).
10. **The RECON_SRC tree lacks the components that carry most of the time logic** (chronology event card, NPS Auto Tour `th`/`XF`, HUD `_F` with the speed label, day/night `C4/M4/E4/A4`, ancestor timeline `QF`, toasts `qF`); it retains only the original `store.getTickTime` (05:00, `+2`), `MonumentsLayer.tickTimeLabel` (05:00, `+2`), `TimelineScrubber` and `App.jsx` label. A proper source tree must port those first (bundle line ranges in §11).

---

## 6. The canonical time model

### 6.1 Decision: (a) piecewise-linear time-warp through verified anchors vs (b) re-timing onto a true 5-minute grid

| Criterion | **(a) time-warp (chosen)** | (b) true 5-minute grid |
|---|---|---|
| What changes | one new derived function `tick → clock`; **no tick is renumbered** | every event, keyframe and reference is re-keyed to `tick = (t_real − T0)/5 min` |
| Data touched | `time_anchors.json` (+ generated labels). 0 of 1,804 placement records move | 1,804 placement records + 137 chronology + 24 vignettes + 42 successions + 20 monuments + 16 tour stops + 23 casualty periods + 9 turning points + 26 bookmark names + 8 scrubber markers + 7 quick picks + 5 onboarding stops + every note that quotes a tick |
| Feasibility with today's data | fully feasible | **infeasible without inventing data**: only 188/675 ticks carry a record; 167 units have one keyframe; a real-time grid of ~63 h at 5 min = ~757 ticks would be *sparser* than today |
| Temporal resolution where it matters | keeps ~1–2 min/tick in the climax windows the authors compressed (charge: 20 ticks ≈ 30 min per the casualty file) | at 5 min the Pickett's Charge window shrinks to ~6–10 ticks; keeping 1–2 min resolution needs 1-minute ticks ≈ 3,800 ticks |
| Kinematics | validated per segment (§10, V7): implied speeds plausible where anchors are right | inherits the data's own impossible 1-tick jumps at a *shorter* dt |
| Deep links / bookmarks / watch-together stop lists / guide text | **remain valid** (tick is the stable key) | all break unless a `old_tick → new_tick` map (= the warp of (a)) is shipped forever |
| Prior art in the repo | the data already *is* a variable-rate time-lapse (§4.3) and `prov-recon.md` P-31 independently proposes a tick→timestamp table | contradicts the casualty file's own "30 minutes = 20 ticks" |
| Reversibility | anchors can be refit any time; ticks never change | irreversible renumbering |
| Effort | L (module + anchors + ~40 call sites) | XL (>5 d) + content re-authoring |
| Verdict | **Adopt** | Reject; but (b)'s one real benefit (constant sim speed) is delivered as a **runtime playback mode** (§7.2) using `minutesToTick()` |

Rule of the model (make it a written invariant in the repo README): **Ticks are permanent, opaque frame IDs (1..675). Clock time is a derived, monotone, piecewise-linear function of the tick defined only by `time_anchors.json`. Nothing else in the codebase may convert a tick to a time.**

### 6.2 Semantics

* **Time base:** local mean time at Gettysburg (39.83 N, 77.23 W). 1863 had no standard time zones; the armies kept sun time. Stored as zone-less local ISO strings (`1863-07-03T15:00`) → minutes since `1863-07-01T00:00`; no `Date`/UTC/DST arithmetic touches it (`parseLocal` in the module).
* **Day tab vs calendar date:** `tabDay(tick)` keeps today's ranges (1–225, 226–450, 451–675 — unchanged so keys `1/2/3`, `jumpToDay`, day tabs, `education.html`'s `DAY_TICK_RANGES`, ground-remembers etc. keep working). `parts(tick).date` is the honest date; ticks after midnight print July 2 / July 3 while their tab still says Day 1 / Day 2. UI copy: tab label "Day 1", tooltip "Wed July 1, from first light (continues to early Thu July 2)".
* **First light, not a blanket 05:00:** the Day-2 and Day-3 tab starts (ticks 226, 451) are anchored to first light (the proposal uses 04:30; computed local sunrise ≈ 04:35 LMT, civil twilight begins ≈ 04:02; `tmp-time-facts/solar.py` NOAA algorithm), and tick 1 to the sourced 05:00 departure of Heth's column from Cashtown. The old "5:00am on every day" convention is a display artefact, not a fact.
* **Uncertainty is first-class:** every anchor has `sigma_min` (±). `uncertaintyMin(tick)` interpolates it. UI prints "about 4:30 PM" when σ ≥ 10 min (long form) and never prints seconds. The 1863 record itself is ±15–30 min for most events.
* **No extrapolation, append-only ticks:** ticks are clamped to `1..tickMax`; the first anchor must be tick 1 and the last defines `tickMax` (675 today). New ticks may only be *appended* (the time-facts specialist proposes an optional July-4 retreat stub at 676+; tested in the prototype) — never renumbered.
* **Monotone, strictly increasing:** enforced at load (throws) and in CI (V1). Ties would make two ticks show the same clock and make `minutesToTick` ambiguous.
* **Slope policy:** `min_mpt = 0.75` min/tick; validator warns above 15 ("lull", flagged `lull:true` so the UI can show a time-lapse cue) and errors above 60. The time-facts proposal itself ranges 0.83–42.3 min/tick (§6.6): the Day-2 morning (226→240, 32 min/tick) and the Day-3 late-morning gap (515→518, 42 min/tick) are real lulls, so a cap of 30 would wrongly reject correct data.
* **Sun/moon:** per-date table `solar[date] = {civil_dawn, sunrise, noon, sunset, civil_dusk}` generated by the build script. Computed (NOAA) values for July 1–4 at Gettysburg, local mean time: sunrise 04:35–04:36, sunset 19:32, civil twilight 04:02–04:04 / 20:04–20:05, nautical twilight 03:21–03:23 / 20:45–20:46, solar noon 12:03–12:04. Moon: mean-synodic estimate gives age 14.9–16.9 d on July 1–3 (≈ full, ±0.5 d) — nights were moonlit, so the overlay's night alpha should be capped lower than a moonless night (optional polish). *(Computed by the time-facts specialist's script; I re-ran it; not independently verified against an almanac.)*

### 6.3 Data files

**`/data/time_anchors.json`** (source of truth, ≈ 3–5 KB, ~35–60 anchors):

```jsonc
{
  "schema": 1,
  "version": "2026-10-xx.1",              // bump on every edit; copied into bookmarks/watch-together messages as `av`
  "tz": "LMT",
  "tick_max": 675,                        // ticks are append-only: a July-4 stub could add 676+ without invalidating any key
  "tab_days": [[1,225],[226,450],[451,675]],
  "gaps": [ { "from": 226, "to": 240, "policy": "fast_forward" }, { "from": 515, "to": 518, "policy": "fast_forward" } ],   // real lulls: UI accelerates and captions "quiet hours"
  "solar": { "1863-07-01": { "civil_dawn":"04:02", "sunrise":"04:35", "noon":"12:03", "sunset":"19:32", "civil_dusk":"20:05" }, "...": {} },
  "anchors": [
    // ILLUSTRATIVE ROWS — real values come from fit(time-facts.csv); see §6.6
    { "tick": 1,   "t": "1863-07-01T04:35", "sigma_min": 30, "fact": "F-000", "conf": "C", "note": "first light; Tab start" },
    { "tick": 12,  "t": "1863-07-01T07:30", "sigma_min": 10, "fact": "F-0xx", "conf": "B", "event": "first-shot" },
    { "tick": 538, "t": "1863-07-03T15:00", "sigma_min": 10, "fact": "F-0yy", "conf": "A", "event": "pickett-step-off" },
    { "tick": 675, "t": "1863-07-03T20:05", "sigma_min": 30, "fact": "F-0zz", "conf": "C", "note": "end of battle" }
  ]
}
```

**`/data/events.json`** — the **event registry** that removes the tick disagreements of §4.4. One row per *historical moment*; every other file references `event` ids instead of retyping ticks (chronology, vignettes, monuments, auto-tour stops, turning points, quick picks, scrubber markers, onboarding stops, sandbox presets, successions):

```jsonc
{ "id": "armistead-over-wall", "title": "Armistead leads his men over the wall", "aliases": ["V-016","mon_armistead"],
  "tick": 551, "tick_end": 552, "significance": "critical",
  "real": { "best": "1863-07-03T15:25", "start": "1863-07-03T15:20", "end": "1863-07-03T15:30", "sigma_min": 10, "fact": "F-0nn" },
  "anchor": true,                          // only anchor:true rows feed the fitter (fact confidence A/B)
  "location": "The Angle" }
```

**`/data/ticks.json`** — *generated*, never hand-edited: `[[tick, "1863-07-03T15:25", tab, dateNumber, minutesPerTick], …]` for all 675 ticks (≈ 20 KB, 6 KB gz). Consumers that cannot run the module (Historian index build, static exports, golden tests, `prov-recon`'s proposed `ticks.json`) use it.

**`/data/time_exceptions.json`** — validator whitelist (`{file, path, reason, expires}`) for prose that intentionally quotes a different time (quotations, "at dusk" idioms).

### 6.4 Reference module (prototype in `tmp-app-time/time-model.mjs`; 13/13 tests pass)

```js
// time-model.mjs  -- canonical tick <-> clock model for the Gettysburg map (PROTOTYPE, verified by time-model.test.mjs)
// Design: piecewise-linear time-warp through verified anchors. Ticks stay the stable primary key of all data;
// the clock is a *derived, monotone* function of the tick. Zero dependencies, ~75 lines of logic, works in the bundle, sub-pages and Node CI.

export const TICK_MIN = 1;   // the maximum tick comes from the last anchor (675 today; ticks may only ever be APPENDED, e.g. a July-4 stub at 676+)
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// "1863-07-01T05:00" -> minutes since 1863-07-01T00:00 (local mean time, no zone math => no DST/UTC bugs)
export function parseLocal(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s);
  if (!m) throw new Error('bad local time ' + s);
  const days = Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 - Date.UTC(1863, 6, 1) / 86400000;
  return days * 1440 + (+m[4]) * 60 + (+m[5]);
}

export function makeTimeModel(cfg) {
  const A = cfg.anchors.map(a => ({ tick: a.tick, min: parseLocal(a.t), sigma: a.sigma_min ?? 15, conf: a.conf, fact: a.fact }));
  for (let i = 1; i < A.length; i++) {
    if (!(A[i].tick > A[i - 1].tick) || !(A[i].min > A[i - 1].min))
      throw new Error(`anchors must be strictly increasing in tick AND time (index ${i}, tick ${A[i].tick})`);
  }
  if (A[0].tick !== TICK_MIN) throw new Error('first anchor must be tick 1');
  const TICK_MAX = A[A.length - 1].tick;
  if (cfg.tick_max && cfg.tick_max !== TICK_MAX) throw new Error('last anchor must be tick_max');
  const clampTick = t => Math.min(TICK_MAX, Math.max(TICK_MIN, t));
  const seg = t => { // index i such that A[i].tick <= t <= A[i+1].tick   (binary search)
    let lo = 0, hi = A.length - 2;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (A[mid].tick <= t) lo = mid; else hi = mid - 1; }
    return lo;
  };
  const tickToMinutes = tick => {           // minutes since 1863-07-01T00:00 LMT; accepts fractional ticks
    const t = clampTick(tick), i = seg(t), a = A[i], b = A[i + 1];
    return a.min + (b.min - a.min) * (t - a.tick) / (b.tick - a.tick);
  };
  const minutesToTick = min => {            // exact inverse (monotone => unique)
    if (min <= A[0].min) return TICK_MIN;
    if (min >= A[A.length - 1].min) return TICK_MAX;
    let lo = 0, hi = A.length - 2;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (A[mid].min <= min) lo = mid; else hi = mid - 1; }
    const a = A[lo], b = A[lo + 1];
    return a.tick + (b.tick - a.tick) * (min - a.min) / (b.min - a.min);
  };
  const minutesPerTick = tick => { const i = seg(clampTick(tick)); return (A[i + 1].min - A[i].min) / (A[i + 1].tick - A[i].tick); };
  const tabDay = tick => { const t = clampTick(Math.floor(tick)); for (let d = 0; d < cfg.tab_days.length; d++) if (t <= cfg.tab_days[d][1]) return d + 1; return cfg.tab_days.length; };
  const parts = (tick, roundMin = 0) => {   // calendar breakdown (date rolls over at midnight, independent of the Day tab); roundMin=5 for UI
    let m = tickToMinutes(tick); m = roundMin ? Math.round(m / roundMin) * roundMin : Math.round(m);
    const dayIdx = Math.floor(m / 1440), mod = ((m % 1440) + 1440) % 1440;
    const d = new Date(Date.UTC(1863, 6, 1 + dayIdx));
    return { date: d.getUTCDate(), month: MONTHS[d.getUTCMonth()], weekday: DAY_NAMES[d.getUTCDay()], hour24: Math.floor(mod / 60), minute: mod % 60, dayIdx };
  };
  const hm12 = p => `${p.hour24 % 12 === 0 ? 12 : p.hour24 % 12}:${String(p.minute).padStart(2, '0')} ${p.hour24 >= 12 ? 'PM' : 'AM'}`;
  const dayPartOf = h => h < 5 ? 'night' : h < 7 ? 'dawn' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 20 ? 'evening' : 'night'; // coarse; solar-aware version in validator
  const format = (tick, style = 'long', opts = {}) => {
    const p = parts(tick, opts.roundMin || 0);
    switch (style) {
      case 'time': return hm12(p);                                                    // "7:30 AM"
      case 'date': return `${p.month} ${p.date}, 1863`;                               // "July 1, 1863"
      case 'short': return `${p.month.slice(0, 3)} ${p.date}, ${hm12(p)}`;            // "Jul 1, 7:30 AM"
      case 'iso': return `1863-07-${String(p.date).padStart(2, '0')}T${String(p.hour24).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`; // deep links / <time datetime>
      case 'compat': return `${p.month} ${p.date}, ${hm12(p)}`;                       // "July 1, 7:30 AM" == legacy getTickTime() shape (", "-splittable)
      case 'aria': return `${hm12(p).replace(':00 ', ' ')} on ${p.weekday}, ${p.month} ${p.date}, 1863`;
      default: return `${p.weekday.slice(0, 3)}, ${p.month} ${p.date} · ${hm12(p)}`; // "Wed, July 1 · 7:30 AM"
    }
  };
  const uncertaintyMin = tick => { const t = clampTick(tick), i = seg(t), a = A[i], b = A[i + 1]; const w = (t - a.tick) / (b.tick - a.tick); return a.sigma * (1 - w) + b.sigma * w; };
  // the two names the rest of the codebase should use
  const tickToClock = tick => { const p = parts(tick); return { iso: format(tick, 'iso'), text: format(tick, 'long'), time: hm12(p), date: p.date, weekday: p.weekday, hour24: p.hour24, minute: p.minute, tab: tabDay(tick), minutesPerTick: minutesPerTick(tick), sigmaMin: uncertaintyMin(tick) }; };
  const clockToTick = x => minutesToTick(typeof x === 'string' ? parseLocal(x) : x);   // 'YYYY-MM-DDTHH:MM' or minutes-since-1863-07-01T00:00
  return { version: cfg.version, tickMax: TICK_MAX, gaps: cfg.gaps || [], anchors: A, tickToClock, clockToTick, tickToMinutes, minutesToTick, minutesPerTick, tabDay, parts, format, dayPart: t => dayPartOf(parts(t).hour24), uncertaintyMin,
    // convenience: "+1 hour" style navigation that stays correct under a non-uniform warp
    tickAfterMinutes: (tick, dm) => Math.round(minutesToTick(tickToMinutes(tick) + dm)),
    // parse deep-link values:  ?tick=538 | ?t=538 | ?at=1863-07-03T15:00
    resolveTickParam: qs => { const g = k => qs.get(k); const raw = g('tick') ?? g('t'); if (raw != null && /^\d{1,6}$/.test(raw)) return clampTick(+raw);
      const at = g('at'); if (at && /^1863-07-0[1-4]T\d{2}:\d{2}$/.test(at)) return Math.round(minutesToTick(parseLocal(at))); return null; } };
}
```

Prototype test results (`node --test time-model.test.mjs`):

```
✔ anchors reproduce exactly (0.768ms)
✔ monotone strictly increasing over all 675 ticks (0.8508ms)
✔ inverse round-trips (integer ticks) and fractional ticks (2.5481ms)
✔ clamps outside 1..675 (0.1461ms)
✔ date rolls over at midnight independently of the Day tab (0.2695ms)
✔ formats (0.1338ms)
✔ iso + compat styles round-trip (0.927ms)
✔ no "+2 days" regression: every tick prints July 1..3 or 4 only when after midnight of Jul 3 (0.3486ms)
✔ tickAfterMinutes(+60) is a real hour (not 12 ticks) (0.1674ms)
✔ deep-link params are backward compatible (0.3459ms)
✔ UI rounding (5 min) never changes the underlying value; tickMax is data-driven (0.2876ms)
✔ tickToClock / clockToTick (the public pair) (0.258ms)
✔ rejects non-monotone anchors (0.3749ms)
ℹ tests 13
ℹ pass 13
ℹ fail 0
```

Mechanism demonstration with the **time-facts proposed anchors** (`time_anchors.tf.json`, produced by `tf_summary.py` from `time-facts-anchors.csv`; **not verified by me** beyond loading cleanly). Ticks that are *not* anchors (17, 264, 376, 440, 460, 553, 600) land between their neighbours as expected, and the raw tick→clock relationship is visibly non-uniform (`mpt` = minutes per tick in that segment):

```
tick  clock (proposed anchors)     tab  min/tick
  1 Wed, July 1 · 5:00 AM   1  5.0
 12 Wed, July 1 · 7:30 AM   1  10.3
 17 Wed, July 1 · 8:22 AM   1  10.3
 28 Wed, July 1 · 10:15 AM   1  5.6
100 Wed, July 1 · 8:00 PM   1  4.0
150 Wed, July 1 · 11:22 PM   1  4.0
225 Thu, July 2 · 4:26 AM   1  4.0
226 Thu, July 2 · 4:30 AM   2  32.1
240 Thu, July 2 · 12:00 PM   2  18.8
256 Thu, July 2 · 4:00 PM   2  2.7
264 Thu, July 2 · 4:22 PM   2  2.7
267 Thu, July 2 · 4:30 PM   2  11.3
275 Thu, July 2 · 6:00 PM   2  6.0
280 Thu, July 2 · 6:30 PM   2  2.0
302 Thu, July 2 · 7:10 PM   2  0.8
326 Thu, July 2 · 8:00 PM   2  10.7
340 Thu, July 2 · 10:30 PM   2  3.2
376 Fri, July 3 · 12:27 AM   2  3.2
440 Fri, July 3 · 3:54 AM   2  3.2
450 Fri, July 3 · 4:27 AM   2  3.2
451 Fri, July 3 · 4:30 AM   3  5.5
460 Fri, July 3 · 5:20 AM   3  5.5
518 Fri, July 3 · 1:07 PM   3  5.7
538 Fri, July 3 · 3:00 PM   3  2.7
551 Fri, July 3 · 3:35 PM   3  5.0
553 Fri, July 3 · 3:45 PM   3  5.0
556 Fri, July 3 · 4:00 PM   3  6.3
600 Fri, July 3 · 6:04 PM   3  1.5
675 Fri, July 3 · 8:00 PM   3  1.5
```

(An earlier throw-away set built only from the site's own authored claims, `time_anchors.demo.json`, is kept in the scratch folder as a fixture for the tests; it is superseded by the proposal above.)

### 6.5 Anchor derivation pipeline (`tools/fit-anchors.mjs`; Python prototypes `fit_anchors.py`, `kin_fit.py`)

Input: `time-facts.csv` (`real_time_best`, `sigma`, `confidence`, `site_tick` after registry mapping). Steps:

1. **Adjudicate inversions with a longest-non-decreasing-subsequence.** Sort facts by real time; take the LNDS of their `site_tick`s (weights A=3, B=2, C=1). Facts outside the LNDS are *inversions*: the sim's tick order contradicts the historical order (§4.4 suspects: Chamberlain 275 vs Barksdale 278 / Peach-Orchard 280 / Sickles 298; stop 8 vs stop 7; stops 13/14/12 all "3:00 PM"). They go to a **worklist** with a suggested new tick (from the provisional warp), *not* into the fit. Resolution per event: (i) **re-tick** (move the event and its keyframes — small, local edits), or (ii) mark `approx:true` and widen `sigma_min`.
2. **Detrended isotonic regression (exact, PAVA).** Minimise Σ wᵢ (f(tᵢ) − mᵢ)² subject to f(t_{k+1}) − f(t_k) ≥ L_k, where L_k = Σ_{t∈[t_k,t_{k+1})} max(L(t), 0.75) and `L(t)` is the *kinematic lower bound* on minutes for tick t→t+1 (3rd-largest `dist/(cap·dt)` among keyframe pairs covering t; caps: infantry 150 m/min double-quick, artillery 250, cavalry 400). Substituting gₖ = f(tₖ) − Σ_{j<k} L_j turns this into plain isotonic regression on g (PAVA, O(n)), then f = g + Σ L. Prototype: `kin_fit.py`. On the authored-claims set the segment-level bounds were not binding (min bounds 0.5–2.7 min/tick vs claimed 1.4–40) — the *pair-level* violations are data defects, reported by V7, not fixable by any smooth warp.
3. **Simplify** with Douglas–Peucker in (tick, minute) space, ε = 8 min, **always keeping** confidence-A facts and ticks 1/226/451/675.
4. **Emit** `time_anchors.json`, a per-fact residual report (`fitted − fact`, flag > 2σ), the slope table, warnings for slopes > 30 or < 0.75 min/tick, and the regenerated `ticks.json` + golden `tests/golden/tick-clock.csv`.

Prototype run on the *authored claims only* (`run_authored.py`; demonstrates the residual/slope report — several slopes are pathological *because the claims conflict*, which is exactly what the tool must surface):

```
tick raw_min fitted  raw_clock -> fitted_clock  residual_min
12 Jul 1 7:30 AM -> Jul 1 7:30 AM 0
20 Jul 1 10:00 AM -> Jul 1 10:00 AM 0
22 Jul 1 10:00 AM -> Jul 1 10:02 AM 2
28 Jul 1 10:15 AM -> Jul 1 10:15 AM 0
29 Jul 1 10:30 AM -> Jul 1 10:30 AM 0
38 Jul 1 10:30 AM -> Jul 1 10:37 AM 7
62 Jul 1 2:30 PM -> Jul 1 2:30 PM 0
63 Jul 1 2:30 PM -> Jul 1 2:31 PM 1
75 Jul 1 4:00 PM -> Jul 1 4:00 PM 0
100 Jul 1 11:00 PM -> Jul 1 11:00 PM 0
255 Jul 2 4:00 PM -> Jul 2 4:00 PM 0
262 Jul 2 4:00 PM -> Jul 2 4:05 PM 5
264 Jul 2 4:00 PM -> Jul 2 4:07 PM 7
268 Jul 2 4:30 PM -> Jul 2 4:30 PM 0
270 Jul 2 6:00 PM -> Jul 2 5:30 PM -30
275 Jul 2 5:00 PM -> Jul 2 5:34 PM 34
315 Jul 2 7:30 PM -> Jul 2 7:30 PM 0
322 Jul 2 8:00 PM -> Jul 2 8:00 PM 0
440 Jul 3 4:00 AM -> Jul 3 4:00 AM 0
460 Jul 3 7:30 AM -> Jul 3 7:30 AM 0
515 Jul 3 11:00 AM -> Jul 3 11:00 AM 0
518 Jul 3 1:00 PM -> Jul 3 1:00 PM 0
522 Jul 3 3:00 PM -> Jul 3 3:00 PM 0
540 Jul 3 3:00 PM -> Jul 3 3:14 PM 14
548 Jul 3 3:00 PM -> Jul 3 3:20 PM 20
551 Jul 3 3:15 PM -> Jul 3 3:22 PM 7
554 Jul 3 3:20 PM -> Jul 3 3:24 PM 4

anchors (RDP eps=8):
tick  12 Jul 1 7:30 AM  -> tick  20 Jul 1 10:00 AM  slope  18.75 min/tick  (8 ticks, 150 min)
tick  20 Jul 1 10:00 AM -> tick  28 Jul 1 10:15 AM  slope   1.88 min/tick  (8 ticks, 15 min)
tick  28 Jul 1 10:15 AM -> tick  29 Jul 1 10:30 AM  slope  15.00 min/tick  (1 ticks, 15 min)
tick  29 Jul 1 10:30 AM -> tick  38 Jul 1 10:37 AM  slope   0.75 min/tick  (9 ticks, 7 min)
tick  38 Jul 1 10:37 AM -> tick  62 Jul 1 2:30 PM   slope   9.72 min/tick  (24 ticks, 233 min)
tick  62 Jul 1 2:30 PM  -> tick  75 Jul 1 4:00 PM   slope   6.92 min/tick  (13 ticks, 90 min)
tick  75 Jul 1 4:00 PM  -> tick 100 Jul 1 11:00 PM  slope  16.80 min/tick  (25 ticks, 420 min)
tick 100 Jul 1 11:00 PM -> tick 255 Jul 2 4:00 PM   slope   6.58 min/tick  (155 ticks, 1020 min)
tick 255 Jul 2 4:00 PM  -> tick 264 Jul 2 4:07 PM   slope   0.75 min/tick  (9 ticks, 7 min)
tick 264 Jul 2 4:07 PM  -> tick 268 Jul 2 4:30 PM   slope   5.81 min/tick  (4 ticks, 23 min)
tick 268 Jul 2 4:30 PM  -> tick 270 Jul 2 5:30 PM   slope  30.00 min/tick  (2 ticks, 60 min)
tick 270 Jul 2 5:30 PM  -> tick 275 Jul 2 5:34 PM   slope   0.75 min/tick  (5 ticks, 4 min)
tick 275 Jul 2 5:34 PM  -> tick 315 Jul 2 7:30 PM   slope   2.91 min/tick  (40 ticks, 116 min)
tick 315 Jul 2 7:30 PM  -> tick 440 Jul 3 4:00 AM   slope   4.08 min/tick  (125 ticks, 510 min)
tick 440 Jul 3 4:00 AM  -> tick 460 Jul 3 7:30 AM   slope  10.50 min/tick  (20 ticks, 210 min)
tick 460 Jul 3 7:30 AM  -> tick 515 Jul 3 11:00 AM  slope   3.82 min/tick  (55 ticks, 210 min)
tick 515 Jul 3 11:00 AM -> tick 518 Jul 3 1:00 PM   slope  40.00 min/tick  (3 ticks, 120 min)
tick 518 Jul 3 1:00 PM  -> tick 522 Jul 3 3:00 PM   slope  30.00 min/tick  (4 ticks, 120 min)
tick 522 Jul 3 3:00 PM  -> tick 554 Jul 3 3:24 PM   slope   0.75 min/tick  (32 ticks, 24 min)
```

### 6.6 Applying the time-facts proposal (input exists; the fitter's job is review, not research)

Files (all in `plan-work/`): `time-facts-anchors.csv` (33 proposed anchors with status **S**ourced / **M**ulti-source range / **R**ange-contested / **D**erived-from-sun, and the proposal's own `minutes_per_tick_to_next_anchor`), `time-facts.csv` (per-fact ranges, confidence, sources, disagreements, and `tick_under_proposed_anchors`), `time-facts-discrepancy.csv`, `time-facts-otherclaims.csv`. Mapping into `time_anchors.json`: `tick → tick`, `local_time_1863 → t (ISO)`, `status → conf` (S→A, M→B, R→C, D→D) and `sigma_min` (10/15/30/30), `event → fact`. `tf_summary.py` performs this mapping and re-runs every check below whenever the CSVs change.

**The proposed anchor set** (33 rows; the Day-2/Day-3 starts at 226 and 451 are first-light anchors, 100 and 675 are sun-derived, status D):

| tick | local time (LMT) | status | event (fact id) | min/tick → next |
|---|---|---|---|---|
| 1 | July 1 5:00am | S | Heth's column leaves Cashtown (R003) | 5.0 |
| 5 | July 1 5:20am | M | Archer/Davis lead Heth's column out of Cashtown (R003; site t5 label 5:20am) | 18.6 |
| 12 | July 1 7:30am | S | First shot, Lt. Marcellus Jones (R005) | 10.3 |
| 28 | July 1 10:15am | S | Reynolds killed (R012) | 5.6 |
| 36 | July 1 11:00am | S | Railroad Cut charge (R017) | 12.4 |
| 53 | July 1 2:30pm | S | Iverson's Pits (R025) | 7.5 |
| 57 | July 1 3:00pm | M | Barlow's Knoll overwhelmed (R027) | 8.6 |
| 64 | July 1 4:00pm | S | Pender/Perrin hit Seminary Ridge (R032) | 2.5 |
| 72 | July 1 4:20pm | M | Hancock reaches Cemetery Hill (R035) | 13.3 |
| 75 | July 1 5:00pm | R | Lee's 'if practicable' order (R037) | 4.0 |
| 90 | July 1 6:00pm | R | XII Corps/Johnson arrive (R038/R039) | 12.0 |
| 100 | July 1 8:00pm | D | Nightfall (sunset 7:32pm, civil twilight ends 8:04pm) | 4.0 |
| 226 | July 2 4:30am | D | Day-2 start (first light) | 32.1 |
| 240 | July 2 12:00pm | M | Berdan's probe / Pitzer's Woods (R046) | 18.8 |
| 248 | July 2 2:30pm | R | Sickles's advance to Peach Orchard (R050) | 11.2 |
| 256 | July 2 4:00pm | S | Longstreet's assault: guns + Hood step off (R054/R056) | 2.7 |
| 267 | July 2 4:30pm | M | Vincent reaches Little Round Top (R059) | 11.2 |
| 275 | July 2 6:00pm | R | 20th Maine bayonet charge (R066) | 6.0 |
| 280 | July 2 6:30pm | M | Peach Orchard salient collapses (R071) | 2.0 |
| 295 | July 2 7:00pm | M | Crawford counterattack (R076) | 1.4 |
| 302 | July 2 7:10pm | M | 1st Minnesota's charge (R077) | 0.8 |
| 314 | July 2 7:20pm | S | Johnson attacks Culp's Hill (R080) | 3.3 |
| 326 | July 2 8:00pm | S | Early attacks East Cemetery Hill (R082) | 10.7 |
| 340 | July 2 10:30pm | M | Battlefield falls silent (R087) | 3.2 |
| 451 | July 3 4:30am | S | XII Corps guns open on Culp's Hill (R091) | 5.5 |
| 500 | July 3 9:00am | M | Pickett's division arrives (R094) | 8.0 |
| 515 | July 3 11:00am | S | Culp's Hill fighting ends (R097) | 42.3 |
| 518 | July 3 1:07pm | S | Cannonade opens (R100) | 5.7 |
| 538 | July 3 3:00pm | R | Infantry step-off (R108) | 2.7 |
| 551 | July 3 3:35pm | M | Armistead over the wall (R115) | 5.0 |
| 556 | July 3 4:00pm | M | Assault collapses / Lee meets survivors (R118) | 6.2 |
| 568 | July 3 5:15pm | M | Farnsworth's charge (R122) | 1.5 |
| 675 | July 3 8:00pm | D | Nominal end of battle (sunset 7:32pm; twilight ends 8:04pm) | — |

**Checks I ran on it (`tf_check.mjs`, `tf_kin_segments.py`):**

```
model OK: strictly increasing, spans 1..675
segments 32  min slope 0.83  max slope 42.33
segments with slope > 15 (lull): 5-12:18.6  226-240:32.1  240-248:18.8  515-518:42.3
segments with slope < 1.5: 295-302:1.43  302-314:0.83

pairs >=100 m: 803  flagged under TF anchors: 19  of which day-boundary seam pairs (225->226, 450->451): 1
day-seam pairs total (moves >=100 m across the day boundary): 5 [('U-XII-2-3', 450, 451, 476), ('C-I-3-3', 225, 226, 262), ('C-I-3-3', 450, 451, 340), ('U-1MN', 450, 451, 380), ('U-20ME', 225, 226, 748)]
non-seam flagged:
   ('U-8NY-CAV', 3, 4, 2374, 5.0, 475)
   ('C-I-3-3', 550, 551, 929, 2.7, 345)
   ('U-ART-9MA', 302, 305, 825, 2.5, 330)
   ('C-I-3-1', 548, 549, 867, 2.7, 322)
   ('U-20ME', 264, 265, 814, 2.7, 299)
   ('C-I-3-2', 544, 546, 1301, 5.4, 242)
   ('U-XI-2', 65, 68, 1601, 7.5, 213)
   ('C-III-1-1', 302, 303, 160, 0.8, 192)
   ('C-48AL', 256, 260, 2085, 10.9, 191)
   ('C-44AL', 256, 260, 2051, 10.9, 188)
   ('U-II-2-1', 304, 308, 623, 3.3, 187)
   ('U-1MN', 302, 303, 154, 0.8, 185)
   ('C-15AL', 256, 260, 2013, 10.9, 185)
   ('C-4TX', 256, 260, 1845, 10.9, 169)
   ('C-5TX', 256, 260, 1803, 10.9, 165)
   ('C-1TX', 256, 260, 1751, 10.9, 161)
   ('C-3AR', 256, 260, 1709, 10.9, 157)
   ('C-I-3-1', 544, 546, 833, 5.4, 155)
```

* **Independent cross-check of the module:** cross-check of my minutesToTick() vs the specialist's tick_under_proposed_anchors: 129/129 facts agree within 0.1 tick; worst |Δ| = 0.05 tick — i.e. `minutesToTick()` reproduces the specialist's separately computed `tick_under_proposed_anchors` for every fact.
* It loads: strictly increasing in tick *and* time, spans 1..675; slope range 0.83–42.3 min/tick. The three-to-four lull segments (>15 min/tick) are all real gaps in the record (morning of July 2, the July-3 mid-morning), which is why the slope policy in §6.2 was widened.
* **Day-boundary seams:** 5 keyframe pairs straddle a day boundary (`U-XII-2-3` 450→451: 476 m, `C-I-3-3` 225→226: 262 m, `C-I-3-3` 450→451: 340 m, `U-1MN` 450→451: 380 m, `U-20ME` 225→226: 748 m); under the current anchors 1 of them exceed a speed cap. They are not movement — they are **scene cuts between the Day-N file and the Day-(N+1) file** (positions authored independently), so all of them should carry `snap:true` (§7.1) or the day-end/day-start keyframes should be reconciled. (An earlier revision of the proposal anchored 225→226 and 450→451 one minute apart, which turned all five into 260–750 m/min "sprints"; the current revision removed those two rows — a good example of why V7 exists.)
* **Remaining keyframe conflicts under the proposed clock** (the *non-seam* rows of the list above): Hood's division regiments 256→260 (≈1.7–2.1 km in ~11 min — the placements say more time passed than the proposal allows), the 302–308 cluster (1st Minnesota and Wilcox's brigade 302→303, Bigelow's battery 302→305, `U-II-2-1` 304→308 — the proposal packs ticks 302→314 into 10 minutes at 0.83 min/tick), Pickett's Charge pairs (544–551), the XI Corps retreat 65→68 (1.6 km in 7.5 min), the 20th Maine 264→265, and `U-8NY-CAV` 3→4 (2.4 km in 5 min). Each is either a data defect (add intermediate keyframes) or evidence that the adjacent anchors should sit further apart; they are the **first review items for the Phase-3 fit** and the acceptance target for V7.
* No *segment-level* kinematic lower bound exceeds the proposed slope (the robust per-segment test printed nothing), i.e. the proposal as a whole is compatible with the placement geometry.

**Suggested re-ticks from the specialist** (`time-facts.md` §7.4; new tick = inverse of the anchor map at the event's real best time; caution from the specialist: only safe where the visual state at the new tick matches the story — spot-check on the map):

| Old tick | Site label | Class | Real best | Suggested tick | Action |
|---|---|---|---|---|---|
| 243 | 6:25am | MISORDERED | Jul 2 3:45pm | ~255 | Move after t252 (Meade confrontation) or keep at t255 (Hood deployed just before step-off) |
| 273 | 8:55am | MISORDERED | Jul 2 5:20pm | ~271 | Swap with t270-t272 ordering (16th Michigan wavers before O'Rorke) |
| 283 | 9:45am | MISORDERED | Jul 2 5:30pm | ~272 | Move before t278 (Kershaw precedes Barksdale) |
| 298 | 11:00am | MISORDERED | Jul 2 6:15pm | ~278 | Move before t293 |
| 304 | 11:30am | MISORDERED | Jul 2 6:50pm | ~290 | Move before t302 |
| 310 | 12:00pm | MISORDERED | Jul 2 12:30pm | ~242 | Move to ~t242 (Stuart arrives ~12:30 pm) |
| 335 | 1:55pm | MISORDERED | Jul 2 7:10pm | ~302 | Move to ~t302 (Willard/Barksdale ~7:10 pm) |
| 360 | 3:20pm | WRONG-DAY | Jul 3 4:30am | ~451 | Move to Day 3 ~t451 (Lee/Longstreet at dawn); keep a short evening note "Lee decides to renew the attack" ~t345 |
| 380 | 4:20pm | WRONG-DAY | Jul 3 11:30am | ~516 | Move to Day 3 ~t516 (Alexander positions guns late morning) |
| 400 | 5:20pm | MISORDERED | Jul 2 9:30pm | ~334 | Move to ~t334 (council of war ~9:30 pm) |
| 420 | 6:20pm | WRONG-DAY | Jul 3 9:00am | ~500 | Move to Day 3 ~t500 (Pickett arrives ~9 am); delete the July-2-evening "moves into position" placement |
| 460 | 5:45am | MISORDERED | Jul 3 10:30am | ~511 | Move to ~t511 (Colgrove ~10:30 am) after historian check |
| 490 | 7:35am | MISORDERED | Jul 3 11:00am | ~515 | Move to ~t515 |
| 560 | 12:55pm | MISORDERED | Jul 3 1:30pm | ~522 | Move to ~t522 (East Cav opens ~1:30 pm) or split into "opens" (t522) and "Hampton/Custer climax" (t538) |
| 563 | 1:10pm | MISORDERED | Jul 3 3:00pm | ~538 | Move to ~t538 (climax ~3:00 pm) |

Plus tick 8 (a June-30 evening conversation), the 9 composites (split each into one card per real event), and a **placement** issue that is not a label issue: Pickett's three brigades are `Line of March` at tick 180 and `Bivouac` on Seminary Ridge from tick 400 although the sources read say the division arrived ~9 am on July 3 (`time-facts.md` §5.5 → its item 10, a placement audit).

**What remains after the proposal is adopted** — the content worklist of §4.5: 12 MISORDERED, 4 WRONG-DAY, 9 COMPOSITE, 2 UNVERIFIED-QUOTE (27 of 137 events; ticks MISORDERED: 243, 273, 283, 298, 304, 310, 335, 400, 460, 490, 560, 563; WRONG-DAY: 8, 360, 380, 420; COMPOSITE: 50, 95, 100, 226, 270, 278, 440, 516, 620; UNVERIFIED-QUOTE: 525, 530). Phase-3 therefore splits into (i) *mechanical*: adopt anchors, regenerate labels/captions/copy; (ii) *editorial*: re-tick or split the MISORDERED / WRONG-DAY / COMPOSITE events and remove or verify the two unverified quotations; (iii) *data*: intermediate keyframes and `snap` flags from V7.

### 6.7 Display policy (single formatter, everywhere)

| Style | Example | Used by |
|---|---|---|
| `long` | `Wed, July 1 · 7:30 AM` | toolbar label, HUD badge, mobile header (two lines: date / time) |
| `time` | `7:30 AM` | event cards, toasts, minimap footer, ancestor rows, scrubber tooltips |
| `date` | `July 1, 1863` | HUD sub-line, print/export |
| `short` | `Jul 1, 7:30 AM` | bookmark rows, cinematic captions |
| `aria` | `7:30 AM on Wednesday, July 1, 1863` | `aria-valuetext` of the scrubber, live-region announcements (throttled ≤ 1/s), `<time datetime="1863-07-01T07:30">` |
| rounding | `format(tick, style, {roundMin: 5})` | **UI default is 5-minute rounding** (the specialist's display rule: never show finer than 5 min; the underlying value stays exact); internal/tests use exact minutes |
| approx flag | `about 4:30 PM` / `c. 4:30 PM` | when the nearest anchor is status **R** (σ ≥ 30) or the event's confidence is **L**; hover/tap on the clock explains "Times are approximate; sources disagree by 15–30 minutes. See Sources & Times." |

The raw tick becomes a *secondary* affordance ("Frame 538 / 675" in a tooltip or the debug HUD), never the primary label. Overnight ticks get a suffix ("overnight") when the computed sun state is night. The same string must appear in every surface at the same tick — enforced by the "one clock" e2e test (§10).

---

## 7. Consequences for every consumer (and the change each needs)

### 7.1 Placements, interpolation and seeking

* Placements stay keyed by tick → **zero data migration**. Interpolation stays in **tick space** (identical visuals to today; the warp only relabels time). Clock-space interpolation is unnecessary because both keyframes normally sit in one anchor segment and the authors tuned motion in ticks.
* **Fix the seek bug and the keyframe gap in one change:** replace the module-global forward-fill `i2` (96265/96271) and adjacent-tick interpolation (`y1` 96266–96310, `F4` 96238–96262) with a pure function `stateAt(tickFloat)`:

```js
// build once after load: tracks = Map<unitId, keyframe[]> sorted by tick  (≈478 units × 3.8 keyframes)
function stateAt(tracks, tick) {                    // tick may be fractional
  const out = [];
  for (const [id, kf] of tracks) {
    if (tick < kf[0].tick) continue;                // not yet on the field (or draw at first keyframe: product decision)
    let lo = 0, hi = kf.length - 1;                 // last keyframe with .tick <= tick   (binary search)
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (kf[m].tick <= tick) lo = m; else hi = m - 1; }
    const a = kf[lo], b = kf[lo + 1];
    if (!b || b.snap || b.tick - a.tick > MAX_GLIDE_TICKS) { out.push(a); continue; }   // hold (or snap)
    const f = (tick - a.tick) / (b.tick - a.tick);                                     // tick-space fraction
    out.push(F4(a, b, f));                          // existing easing by disposition, reused
  }
  return out;
}
```
  Pure, seek-safe (no cache), O(units·log k) per frame (≈ 478 × 2 comparisons). `MAX_GLIDE_TICKS` (e.g. 40) and per-keyframe `snap:true` cover true teleports (reinforcements arriving off-map). This makes motion continuous between the sparse keyframes (today it is hold-then-jump: only 93/1,209 consecutive-keyframe pairs are 1 tick apart).
* **Minimap/H11:** count = `stateAt(...).length` (units *on the field*), not `x[z].length` (99821), and show the clock, not the tick: `"{n} units · {time}"`.
* **Kinematic guard-rail (V7):** speeds are checked in *clock* space (`dist / Δclock`) so a warp that makes units sprint is caught in CI. Prototype numbers (`kin3.py`): at a uniform 5 min/tick only 1 % of infantry keyframe moves exceed double-quick and 7 % quick-time; at 2.5 min/tick 9 % / 21 %; at 1.5 min/tick 19 % / 35 %. So the placements comfortably support ≥ 5 min/tick and become implausible below ~2.5 min/tick — anchors must respect that, and the offending keyframe pairs need intermediate keyframes or a `snap` flag regardless of the warp: **6 pairs exceed the speed caps even at a uniform 5 min/tick** (`U-8NY-CAV` 3→4, 2,374 m in one tick; `U-I-2-2` 52→53, 1,467 m; `C-I-3-3` 550→551, 929 m; `C-I-3-1` 548→549, 867 m; `U-20ME` 264→265, 814 m; `C-7TN` 9→14, 3,762 m in 5 ticks) and **19 under the time-facts proposed anchors** (`tf_kin_segments.py`; 5 of them are day-boundary scene cuts, the rest are e.g. `C-I-3-2` 544→546, 1,301 m in ~5.4 min and Hood's/Law's regiments 256→260, ~2 km in ~11 min — i.e. the placements need more time between those keyframes than the proposal allows). *(An earlier demo warp built from the site's own claims produced 16 such pairs; the proposal is better but not perfect — which is precisely what the validator is for.)*

### 7.2 Playback engine, speed labels (H9), ±1 hour

* Today: `Pe = 500 / speed` ms per tick (96982) → **2 ticks/s at 1×**, i.e. 10 *nominal* battle-minutes/s; HUD prints `"1x (real time)"` (97429). Under the warp the honest figure varies with position: with the time-facts anchors `minutesPerTick` ranges 0.83–42.3, so **1× is 1.7 to 85 battle-minutes per second** (0.83 min/tick at the 1st-Minnesota/Culp's Hill stall, 42.3 min/tick across the July-3 late-morning gap).
* **Label:** HUD shows `1×` plus a live secondary `≈ N min of battle per second` computed as `speed × 2 × minutesPerTick(tick)`; tooltip: "Playback follows the story's own pace: it moves fast through quiet hours and slows for the action." Rename the buttons' `title`s (112312/112336) and Help ("Advance one tick (5 minutes)" → "Step forward one moment"; "Advance one hour (12 ticks)" → "Skip forward one hour of battle time"). Fix Help "Reset to 1x speed" wording only if the label changes.
* **Gaps:** honour `gaps` (226→240, 515→518): auto-accelerate through them and show a quiet-hours caption ("Late morning, July 2 — the armies wait") instead of letting the clock leap 30–40 minutes per half-second frame.
* **Two pacing modes** (new, small): `story` (default, exactly today's behaviour) and `clock` ("Battle time": 1, 5, 15, 30, 60 min/s). In `clock` mode the loop advances `clockMin += dt·rate` and derives `tickFloat = minutesToTick(clockMin)`; `currentTick = floor(tickFloat)` and the existing fractional `ut` (97013 `y1(he, st, ut)`) receives `tickFloat − floor`. This is option (b)'s benefit with zero data change.
* **±1 hour:** replace `c ± 12` (112218–112219, 112310, 112334, 112979, 112984, help chunk) with `tm.tickAfterMinutes(c, ±60)`. Under the warp "12 ticks" is not an hour (with the demo anchors it ranges from 17 min at The Angle to 4.8 h in the Day-2 morning).
* **Auto-tour windows:** `th[].tickWindow` (auto-pause after `tickWindow*500/2` ms at speed 2, 100336–100338) becomes `windowMin` (battle minutes, e.g. 20) → `Math.round(minutesToTick(t0 + windowMin) − t0)`, otherwise the same `tickWindow: 8` spans ~11 minutes at The Angle (tick 548) but ~3 hours in the Day-2 morning lull (demo anchors).
* **Keyboard cap mismatch:** buttons offer ≤ 8× (`wO`, 112185) but `+` allows 16× (112998). Pick one (recommend 8×) and share the constant.

### 7.3 Event cards, vignettes, toasts, successions, ancestor timeline

* **Trigger by crossing, not equality.** `LF` (98607) and the vignette panel (98268–98272) should fire when `prevTick < event.tick ≤ curTick` (as `bF` 97569 already does), with a *minutes* look-back for "still relevant" (`≤ 15 battle-min` or 2 ticks, whichever is larger) so 22-min ticks and 16×/janky frames never skip an event. On seek, show the most recent event within the look-back rather than nothing.
* **Show the clock, secondary tick:** event card header `l.time` (98630) → `tm.format(l.tick,'time')` (keep the data's `location` and text); toast footer `"Tick N"` (99949–99951) → `time`; unit panel `"At Tick N"` (98031) → `"At 4:28 PM"`; succession `(tick N)` (97566) → `(4:28 PM)`; vignette jump `⏩ N` (98340–98343) → `⏩ 4:28 PM`; ancestor rows `QF` (101078/101257) → `tm.format(t,'short')`; bookmark meta `"Tick N"` (BookmarkPanel chunk) → time + tick in `title`.
* **Toast lifetime** is wall-clock (`Date.now()+4500`, 99909/99915) — fine, but at 8×/16× cap concurrent toasts (already `slice(-4)`) and batch "3 commanders changed" (H4 clutter).

### 7.4 Audio

* Main app: the cannon `jk()` fires when `X4()` (96480–96502) finds a Union and a Confederate unit **within 40 screen pixels** of each other — so it depends on the *zoom level* — and at most once per 4 s of wall-clock (96555–96557). It is independent of both tick speed and battle time, so a 2-hour cannonade and a 30-minute charge sound the same and zooming out makes "combat" louder.
* Immersive page: cannon `Math.random()<0.5` every ≥ 2 ticks if *any* unit's forward-filled disposition is "Deployed Artillery" (immersive.html:206) — artillery deployed at dusk stays "deployed" until its next keyframe, so **cannon fire continues through the night ticks 101–225**; musket every tick when > 3 units are "Charging/Line of Battle" (207).
* With the model: define **battle intensity per battle-minute**, not per tick: `I(t) = Σ casualties_per_min(t) (from casualty_apportionment bell curves divided by minutesPerTick) + k·chargingCount`, normalised 0–1 with a square-root curve. Then cadence = base × I. Prototype fact (Confederate side, from `casualty_apportionment.json`): the charge is 2,700 casualties in ~30 min over 20 ticks = **135 per tick, 90 per minute**; the Culp's Hill morning is 1,514 casualties over ~80 ticks / ~7 h = **19 per tick, 3.6 per minute** — a 7× difference per tick but **25× per minute**; today's audio treats them alike. This same per-minute rate is the right quantity for Living-Ledger call-outs and the Dashboard.

### 7.5 Day/night lighting (main map, Camera, Immersive)

* Replace `M4/E4` (9856–9884) and the pages' integer-hour tables (camera.html:175–187, immersive.html:163–173) with `sunState(tick)` from the solar table: `alpha = smoothstep(sunAltitude ∈ [+6°, −12°]) × 0.55` (cap ≈ 0.35 for a full-moon night); tint colour warm near horizon, blue at night.
* Concrete defects this fixes: (i) the Louisiana Tigers assault (V-014 tick 326 "in near-darkness") currently renders under `M4 hour = 13.3` with **zero tint** and the toolbar reading 12:20 PM; (ii) the Day-1 night (ticks ~100–225) renders as `M4` hours 13.3 → 23.7, i.e. bright daylight until ~tick 145, although the authored clock puts tick 100 at nightfall/11 PM; (iii) E4's dusk band starts at hour 17 while computed local sunset is 19:32.
* Overlay CSS `transition: background 8s ease` (inside `A4`, 9885–9900) is wall-clock; at 8× a full dusk passes in < 1 s. Drive the overlay directly from `sunState` per frame (no CSS transition), or scale the transition by speed.

### 7.6 Cinematic export

* Sweep stays linear in **tick** (`Math.round(startTick + progress*tickSpan)`, cinematic-export.html:213–214) so the video keeps story pacing; add an inline note "≈ N minutes of battle" computed from the anchors. Add **clock inputs** ("From 3:00 PM to 3:45 PM") converted with `minutesToTick`; keep tick fields as an "advanced" disclosure (defaults 540→600 remain valid).
* Captions (`{location} — tick N`, 175/226) → `{time} · {event title}`; replace `nearestVignette` (nearest by |Δtick| even when 50 ticks away) with "the event whose window contains the tick, else none". File name `gettysburg-tick540-600.webm` → `gettysburg-1863-07-03-1500-1545.webm` (also better for users).
* Render with `Math.round` → use `tickFloat` so motion is smooth (needs §7.1's interpolation).

### 7.7 Watch Together

* The sync key remains the **integer tick** (`{type:'goto', tick, note}` broadcast at 201–202) → unaffected by the warp, which is a decisive argument for (a). Add `av` (anchors version) to messages; if two peers' anchor versions differ, each still moves to the same tick and only the *displayed* clock may differ — show a one-line notice. Stop rows (172) and caption (192) show `time` + tick. Saved stop lists remain valid forever.

### 7.8 Bookmarks, permalinks, embeds

See §8. Persisted bookmarks (`localStorage["gettysburg_bookmarks"]`, 97821) store `{tick, label, unitId, center, zoom}`; all remain valid. New bookmarks also store `at` (ISO local time) and `av`; on load, if `av` differs and `at` exists, `tick = round(minutesToTick(parseLocal(at)))` so a saved *historical moment* survives re-anchoring, while old tick-only bookmarks keep meaning "that frame".

### 7.9 Documentary, Education, Turning Points, Search, Historian, Regiment, Embed

* `d-eyebrow` (documentary.html:89) `"Day 1 · Tick 12 · location"` → `"Wed, July 1 · about 7:30 AM · McPherson's Ridge"`; education cards (line 81 area) add the same eyebrow; search rows (search.html:125) and Historian citations (historian.html:109) print the time, not "tick N"; regiment timeline `"Day N · ticks a–b"` (218–219) → `"July 1, 7:30–8:15 AM"`.
* Turning Points: replace the typed `day:` strings (`'Day 1 · Late afternoon'` …) with `dayPart(tick)` computed from the model + solar table, and fix **tick 175 → the registry tick of "Ewell's discretionary order" (75)** (line 58). With warp, `dayPart(175)` is "night", which the validator would have caught.
* All emitted links use `?tick=` (backward compatible) and add `&at=`; see §8.

### 7.10 Sandbox, Compare, Living Ledger, Dashboard

* **Sandbox starting points** are wrong against the site's own chronology: tick 260 "mid-afternoon … *before* Longstreet's assault" but chronology t256 = "LONGSTREET'S ASSAULT BEGINS" and t260 = "Law's brigade reaches Big Round Top"; tick 553 "~3:00pm … moments *before* Pickett's Charge reaches the wall" but t551 = Armistead over the wall and t553 = "CUSHING KIA"; tick 62 "mid-morning … I Corps holding McPherson's Ridge" but t62 = "I Corps right flank crumbling" and stop 3 says tick 62 = 2:30 PM. Generate presets from the registry: `label = "{time} — {event.title}"`; validator V3 rejects a label whose day-part/clock disagrees with the model.
* **Compare:** replace `approxTimeForTick` (compare.html:120–129) with `tm.format`; replace the hint text (line 55) with a live example from the registry; default ticks 60/300 → registry moments; add a *clock* slider mode ("3:00 PM Friday") using `minutesToTick`.
* **Living Ledger:** static "July 1, 5:00 AM" (64) and `timeForTick` (135–144) → `tm.format`; `DAY_BOUNDS` (90) → `tm.tabDay`; casualty curves already exist per tick; add **casualties per battle-minute** (÷ `minutesPerTick`) as the "intensity" read-out and use it for call-out ordering.
* **Dashboard:** x-axis is linear in tick (`xScale`, dashboard.html:141) with day labels at `DAY_BOUNDS` midpoints (163–166). Keep linear-in-tick (story time) but add hour gridlines at `minutesToTick(hour)` and label the axis "Story time (frames)" with a hover clock; otherwise the 40 min/tick lulls read as flat lines lasting minutes.

### 7.11 HUD, toolbar, mobile header, scrubber labels

* `_F` HUD (97415–97480): `R` (97428) → `tm.format(x,'date')`; `he` (97429) → new speed label (§7.2); ring `yF` (97481–97483) → fraction of the **Day tab** in clock minutes or in ticks (choose; ticks preserves today's look).
* Toolbar `tickLabel` (113088) ← `getTickTime()` (A, 113054) → `tm.format(c,'long')`; `dayLabel` (113086) → `"Day " + tab`; mobile header (103144–103145 via `Es.split(", ")[1]`) → `getClock()` returning `{date,time}` (do **not** parse strings).
* Scrubber: day segments/labels `f2` (112187–112191) → "Day 1 · Wed July 1" etc.; markers `TO` (112192–112201) → generated from the registry (`marker:true` events) and **fix the mislabel (tick 17 "First shot" is Calef's opening fire; the first shot is tick 12)**; add `aria-label="Battle time"`, `aria-valuemin/now/max`, `aria-valuetext={format(tick,'aria')}` to the range input (also closes A2).

### 7.12 Tour stops, monuments, quick picks, onboarding

* `th[]` (100063–100320): drop typed `subtitle` clock strings; store `event: "<registry id>"` and render `"{title} — {format(long)}"`. `mA[]` (100615–100835): same for the times embedded in `label` (keep the prose, generate the time). `zF[]` (98729–98737), `IF` (97865–97896), `Gc` (111819–111855): reference registry ids. `JF` tooltip (100889/100956) → `tm.format(mon.tick,'long')` — which also fixes the self-contradicting tooltip (`mon_hood` prints "8:00 AM July 4" above "…wounded … at 4:00 PM July 2").
* Onboarding copy that names a time of day must match the clock shown beside it (e.g. tick 267 body "July 2 afternoon" beside a 7:25 AM clock today).

### 7.13 Copy and documents

Change "unfold in **real time**", "**minute-by-minute**", "**675 five-minute snapshots/ticks**" (index.html:15/18/24/32/719/754, manifest.json:4, ground-remembers.html:42, terms.html:30, splash 111893, onboarding 111893, HelpModal About, user-guide.pdf p1 + shortcuts) to truthful wording, e.g. "675 moments across July 1–3, 1863, played as a time-lapse (fast through quiet hours, slower during the fighting)". Add a short **About the clock** panel (LMT, ±15–30 min, time-lapse, how anchors were chosen, link to sources).

---

## 8. URL / permalink contract (`?tick=` stays backward compatible)

**Facts:** the deployed app reads only `?ancestor=` (101019). Emitters today: bundle `$k` → `?t=<tick>&u=<unit>&z=<zoom>&ll=<lat,lng>` (97822–97830); `documentary.html:92`, `education.html:81`, `search.html:127`, `historian.html:110`, `embed.html:60` → `?tick=<n>&vignette=<V-nnn>` (`/index.html?…` or `/?…`); `turning-points.html:118` → `/?tick=<n>`; `regiment.html:247` → `/?unit=<id>&tick=<n>`; `search.html:114` → `/index.html?unit=<id>`; `search.html:139` → `/index.html?lat=<>&lng=<>`; RECON_SRC `BookmarkPanel.jsx:32–33` → `?tick=&unit=`; the guide promises "Share a permalink". Result: every "See it on the map →" link lands on tick 1 with the splash.

**Contract (one parser/builder module `urlState.js`, used by desktop, mobile, embed):**

| Param | Meaning | Parse rule | Emit |
|---|---|---|---|
| `tick` | frame 1..675 (canonical) | `^\d{1,6}$` → clamp 1..675 | yes |
| `t` | legacy alias of `tick` (deployed share builder) | same | no (accept forever) |
| `at` | ISO local time `1863-07-0[1-4]THH:MM` | resolved via `minutesToTick`; used **only if** no `tick`/`t` | yes (with `av`) |
| `av` | anchors version at link creation | informational; if ≠ current and `at` present → prefer `at` | yes |
| `unit`, `u` | unit id (must exist in OOB) | `^[A-Za-z0-9-]{2,24}$` and known | `unit` |
| `vignette` | `V-001`…`V-024` | known id → also sets tick if absent, opens panel | yes |
| `z`, `ll` (alias: `lat` + `lng`, emitted by `search.html:139`) | zoom (`^\d{1,2}(\.\d)?$`, 11..18) / `lat,lng` inside the map's `maxBounds` (−77.36..−77.12, 39.72..39.91, 97244) | validate + clamp | `z`, `ll` |
| `ancestor` | existing | unchanged | unchanged |
| `day` | 1..3 → jump to that tab's first tick | optional | no |

Behaviour: if any of `tick/t/at/vignette/unit/ancestor` is present → **skip the 3.5 s fast-forward splash and the onboarding chooser** (H3 dovetail), set the tick, pause, fly to `ll/z` or the unit; then `history.replaceState` to the canonical form so Back does not replay it. Unknown or malformed params are ignored (never reflected into the DOM unescaped; no personal data in URLs). All emitters switch to the canonical names but the parser keeps every alias, so **every link ever printed or shared keeps working**.

```js
// urlState.js (sketch)
export function parseUrlState(search, tm, knownUnits, vignettes) {
  const q = new URLSearchParams(search), num = k => (/^\d{1,6}$/.test(q.get(k) ?? '') ? +q.get(k) : null);
  let tick = num('tick') ?? num('t');
  const vid = q.get('vignette'), v = vid && vignettes.get(vid);
  if (tick == null && v) tick = v.trigger_tick;
  if (tick == null) { const at = q.get('at'); if (/^1863-07-0[1-4]T\d{2}:\d{2}$/.test(at ?? '')) tick = Math.round(tm.minutesToTick(parseLocal(at))); }
  const unit = q.get('unit') ?? q.get('u'), ll = /^(-?\d{1,2}\.\d{1,6}),(-?\d{1,3}\.\d{1,6})$/.exec(q.get('ll') ?? '');
  return { tick: tick == null ? null : Math.min(675, Math.max(1, tick)), vignette: v ? vid : null,
           unit: unit && knownUnits.has(unit) ? unit : null, zoom: clampZoom(q.get('z')), center: ll && inBounds(+ll[1], +ll[2]) ? { lat: +ll[1], lng: +ll[2] } : null,
           ancestor: q.get('ancestor') };
}
export function buildUrlState(s, tm) {
  const q = new URLSearchParams(); if (s.tick && s.tick !== 1) { q.set('tick', s.tick); q.set('at', tm.format(s.tick, 'iso')); q.set('av', tm.version); }
  if (s.unit) q.set('unit', s.unit); if (s.vignette) q.set('vignette', s.vignette);
  if (s.zoom) q.set('z', s.zoom.toFixed(1)); if (s.center) q.set('ll', `${s.center.lat.toFixed(4)},${s.center.lng.toFixed(4)}`);
  const qs = q.toString(); return qs ? `/?${qs}` : '/';
}
```

Tests: `?tick=538&vignette=V-016`, `/?unit=U-20ME&tick=267`, `?t=28&u=U-I&z=15.0&ll=39.8278,-77.2528`, `?ancestor=U-20ME`, `?at=1863-07-03T15:00`, hostile/junk (`tick=abc`, `tick=-5`, `tick=1e9`, `unit=<script>`, `ll=1,2`) → parsed to safe values or ignored (the 10-test prototype already covers the tick/t/at/clamp cases).

---

## 9. Migration and rollout

### Phase 0 — stop the bleeding (S, ~2–4 h; can ship before anything else; **no design decisions needed**)

Goal: one date and one clock *agreeing with each other* everywhere, even though not yet historically right (this alone removes the visible July-5 badge, the 3-clock-on-one-screen effect and the contradictory tooltips). Bundle edits (`bundle.pretty.js` line numbers; apply the same edits to the minified file by the identical string replacements, exactly as prior sessions did — then **rename the output file** (§3.3)):

```diff
@@ 9377  (store.getTickTime)     one base for all days, matches chronology metadata, M4, JF, QF, sub-pages
-        R = (P === 1 ? 6 * 60 : 4 * 60) + H,
+        R = 5 * 60 + H,
@@ 97428 (_F HUD badge)
-    R = `July ${l + 2}, 1863`,
+    R = `July ${l}, 1863`,
@@ 97429 (speed label, H9)
-    he = f < 1 ? `${f}x (slow)` : f === 1 ? "1x (real time)" : `${f}x (fast)`,
+    he = `${f}x`,
@@ 100836-100843 (JF)  date from the TICK, not the monument's day, no +2
-function JF(c, f) {
-  const M = (c - (f === 1 ? 0 : f === 2 ? 225 : 450) - 1) * 5, ...
-  return `${...} ${l} July ${f + 2}`;
+function JF(c) { const f = c <= 225 ? 1 : c <= 450 ? 2 : 3, M = (c - (f===1?0:f===2?225:450) - 1) * 5, ...
+  return `${...} ${l} July ${f}`;
@@ 100889:  const xe = JF(kt.tick, kt.day);   →   const xe = JF(kt.tick);
@@ 101006 (QF)
-  return `July ${f + 2}, ${R}:${...} ${l}`;
+  return `July ${f}, ${R}:${...} ${l}`;
@@ 98630 (event card) show the SAME formula as the toolbar instead of the hand-typed label
-  V.jsx("div", { style: Vc.time, children: l.time }),
+  V.jsx("div", { style: Vc.time, children: `July ${l.tick<=225?1:l.tick<=450?2:3}, ` + QF(l.tick).split(", ")[1] }),
```
Also fix the three Help strings only if the label changes; do **not** touch data. Result: every runtime surface (toolbar, mobile header, time bar, HUD, tooltip, ancestor rows, event card, day/night, compare/ledger/camera/immersive) now reads 05:00-base and correct dates; the residual error vs history remains (~4.7 h mean) until Phase 1–3. Acceptance: for ticks {1,12,17,28,226,451,538,675}, `grep`-able strings in DOM are identical across surfaces.

### Phase 1 — model + tests, no UI change (M, 1–2 d)

1. Create `time-model` (ESM, §6.4) and `/data/time_anchors.json` from **`time-facts-anchors.csv`** (mapping in §6.6; mark `"status":"provisional"` until the editorial review of §4.5 is done), `tools/fit-anchors.mjs`, generated `/data/ticks.json`, golden `tests/golden/tick-clock.csv`.
2. Add `scripts/validate-time.mjs` (rules in §10) and run it **report-only** to get today's baseline (expected counts in §10).
3. Add unit tests (`node --test`) — the prototype's 13 tests are the seed.

### Phase 2 — wire consumers behind a flag (L, 3–5 d)

`localStorage.gtbg_tm` / `?tm=1` selects the new model (default off), so you can A/B in production with a dev overlay printing old vs new clocks side by side for the same tick. Order: store (`getTickTime`, new `getClock`, `stepMinutes`) → HUD/toolbar/mobile header/time bar → event card/toasts/panels → ancestor/monument/bookmark labels → `stateAt` renderer (seek fix) → day/night → sub-pages (shared `/js/time-model.js`, one `<script type="module">` + fetch of `time_anchors.json`; do **not** add it to render-blocking `site-nav.js`, P4) → flip default → remove flag after one release.

### Phase 3 — content and history (L, 2–5 d, research-bound; dependency: `time-facts.csv`)

Build the event registry; map facts → ticks; run the LNDS inversion triage (§6.5); re-tick or `approx`-flag inverted events (expected suspects listed in §4.4); refit anchors; regenerate typed strings (tour subtitles, monument times, turning-point day-parts, sandbox/compare labels, onboarding/Help copy, user-guide PDF); regenerate chronology `time`/`time_display` and `metadata.tick_formula`; regenerate `placement_schema.json` `ticks_per_day.real_time`.

### Phase 4 — links, bookmarks, sync (M, 1 d): `urlState.js`, `at`/`av` in bookmarks and watch-together messages, canonical emitters in the 7 pages (9 link builders).

### Phase 5 — polish (M, 1–2 d): `clock` pacing mode; intensity-per-minute audio and ledger; solar overlay (with moon cap); cinematic clock inputs and captions; `<time datetime>`/aria; "About the clock" panel.

### Rollout hazards and mitigations

| Hazard | Evidence | Mitigation |
|---|---|---|
| Same-name patched bundle + `immutable` + SW cache-first | §3.3; `prov-recon.md` T-02 found four byte-streams under one name | new content-hash filename per patch; update `index.html`, `sw.js` `PRECACHE_ASSETS`, bump `CACHE_NAME` (sw.js:3); add a build-time assertion `sha256(file)[:8] === name` |
| First-visit SW `controllerchange → location.reload()` (C6) double-loads and would replay the fast-forward splash (which drives the tick clock through all 675 ticks, 101471–101505) | `index.html:258–270`, audit C6 | fix C6 first or ship together; boot splash must not `setState` the real store (use a local animation) |
| Data/JS skew for up to 1 h (`/data/*` `max-age=3600`) | `netlify.toml` | serve `time_anchors.json`, `events.json`, `ticks.json` with `max-age=0, must-revalidate` (or fingerprint them); keep legacy chronology `time` (regenerated from anchors) for ≥ 30 days |
| Old bookmarks/links | `localStorage["gettysburg_bookmarks"]`, shared URLs | tick stays the key (§7.8, §8) |
| Watch Together peers on different deploys | `watch-together.html:201–202` | `av` in `goto`; notice if different |
| Users' muscle memory for `Shift+→` = 12 ticks | Help chunk @198 | keep the shortcut, change semantics to "1 hour" and update Help/guide together |
| RUM/CLS: a wider clock string reflowing the toolbar | `tickLabel` 11 px monospace at 113088 | reserve width (`min-width: 22ch`, `font-variant-numeric: tabular-nums`) |

Rollback: anchors and the flag are data/config; reverting `time_anchors.json` or flipping the flag restores previous labels without touching ticks or placements.

---

## 10. Validator specification and tests

### 10.1 `scripts/validate-time.mjs` (Node ≥ 18, zero site dependencies; `acorn` as a dev-only dependency to read JS literals in HTML pages; **no build of the site involved**)

Run locally before every drop (`node scripts/validate-time.mjs --strict`) and in Netlify as `[build] command` (publish stays `.`). Exit codes: 0 ok, 1 warnings only with `--strict`, 2 errors.

| ID | Check | Severity | Expected on today's site (from this analysis) |
|---|---|---|---|
| V1 | `time_anchors.json` schema; ticks strictly increasing and include 1, 226, 451, 675; times strictly increasing; `sigma_min` present; `conf ∈ A/B/C/D`; slopes ≥ 0.75 and ≤ 60 (warn above 15 = "lull") | error | the proposal passes (slopes 0.83–42.3 min/tick) |
| V2 | Tab ranges unchanged (1–225, 226–450, 451–675) and every consumer's constants equal `tab_days` (regex-scan `225`/`226`/`450`/`451` literals in pages/bundle) | error | 8 pages + ~13 bundle sites hard-code them → replace by `tm.tabDay` |
| V3 | **Text-time consistency.** For every string with an associated tick (JSON siblings `tick`/`trigger_tick`/`approx_tick`; JS literal objects in `th`, `mA`, `POINTS`, `startingPoints`, `Gc`; HTML `data-tick`): extract clock times (`/\b(1[0-2]\|0?[1-9])(?::([0-5]\d))?\s?(a\.?m\.?\|p\.?m\.?)\b/`) and day-part words; compare with `tm` (explicit clock ±max(20 min, 2σ); "approximately/about" ±45 min; day-part words against the solar table: dawn ∈ [civil_dawn−30, sunrise+60], morning ∈ [sunrise+60, 12:00], afternoon ∈ [12:00, sunset−90], evening ∈ [sunset−150, civil_dusk+30], dusk ∈ [sunset−60, civil_dusk+30], night ∈ [civil_dusk+30, civil_dawn−30]) | error (warn for prose "night/morning" idioms) | 355 strings in `data/` contain 391 time expressions (223 explicit clocks, of which 137 are the chronology labels; 168 day-part words); 151 strings pair a tick with an explicit clock; today's mean error of 4.6–4.9 h means nearly all of those fail until anchors land |
| V3b | **Duration claims** ("in N minutes", "N hours") inside records that carry a `tick_range`/tick pair: `\|Δclock − claimed\| ≤ 35 %` | warn | e.g. casualty [538,558] "30 minutes", [256,330] "2 hours", [451,534] "Seven hours" |
| V4 | Chronology/typed-label drift: any remaining hand-typed `time` string must equal `tm.format(tick,'time')` rounded to 5 min | error | 137 events, drift −230…+15 min |
| V5 | **Event registry consistency.** Same `event` id or alias referenced from ≥ 2 files must sit within ±2 ticks | error | 10 groups fail at ±2 ticks (Hancock 550/554, Cushing 548/549/552/553, Hood 258/262/278, Vincent 270/290, Weed 272/293, Ewell 75/175, First shot 12/17, 1st Minnesota 295/302, 26th NC 16/28, Iron Brigade 20/27); Armistead 551/552 passes |
| V6 | **Order.** Registry events with `real.best` must be non-decreasing in tick within ±1 tick (LNDS complement = inversion list) | error | time-facts classifies 12 chronology events as MISORDERED and 4 as WRONG-DAY (§4.5), plus the stop-7/8 and stop-12/13/14 clusters |
| V7 | **Kinematics.** For each unit, consecutive keyframes: `dist / Δclock ≤ cap` (inf 150, art 250, cav 400 m/min) unless `snap:true`; also `Δtick=1` moves > 600 m; day-boundary pairs (225→226, 450→451) must be `snap` | warn/error | 6 pairs at uniform 5 min/tick; 19 under the time-facts proposal (1 day-boundary seams + the rest, list in §6.6) |
| V8 | Links: every `?tick=`/`?t=`/`?at=` in HTML/JSON/JS resolves inside range; `vignette=` ids exist; emitted param names ∈ canonical set | error | `turning-points.html:118` etc. OK today; bundle emits `t` (alias) |
| V9 | **Lint bans** (regex over bundle/source/pages, allow-list = the module): ``/July \$\{[^}]*[+-] ?\d/``, `/(?:tick\|Tick)[^;\n]{0,60}\* ?5\b/`, `/\b(?:5\|6\|4) ?\* ?60\b/`, `/toLocale(?:Time\|Date)String/`, `/getHours\(/`, `/\b(?:AM\|PM)\b/` outside the module, `/real time\|five-minute\|minute-by-minute/i` in user-facing copy | error | **3** `+ 2` date hits (97428, 100842, 101006), `5*60`/`6*60`/`4*60` hits at 9377 (`6 * 60 : 4 * 60`), 9859 (`M4`), 100838 (`JF`), 101001 (`QF`), 1 `toLocaleTimeString` (sandbox.html:211 — legitimate wall-clock, allow-listed), copy hits at index.html:15/18/24/32/719/754, manifest.json:4, ground-remembers.html:42, splash 111893 |
| V10 | Day/night: every day-part word claim, and the overlay function, agree with `solar` for the tick | warn | Tigers assault t326 "dusk/near-darkness" vs today's overlay 0 |
| V11 | Golden: regenerated `ticks.csv` (675 rows) equals committed golden byte-for-byte unless the PR also updates golden + `version` | error | — |
| V12 | Monotone inverse: `minutesToTick(tickToMinutes(t)) == t` ∀ t ∈ 1..675 and at 1000 random fractional ticks | error | passes in prototype |
| V13 | Placement/metadata claims: `record_count` equals `placements.length`; `metadata.tick_range` matches contained ticks; `placement_schema.metadata` wording equals generated text | error | `placements_day1_ticks1_50.json`: claimed 4,890 vs 100 |
| V14 | Coverage: report ticks with no records and Day-1 ticks 101–225 with no chronology events | info | 487 ticks empty; 125 event-less ticks |
| V15 | Bookmark/permalink fixtures parse (`tests/fixtures/urls.txt`) | error | — |

Output: human table + `time-report.json`; `--fix-labels` regenerates typed labels from the model where a `// gen:time` marker or a registry reference exists.

### 10.2 Tests

* **Unit** (`node --test`): model (anchors exact, strictly monotone, inverse, clamp, rollover independent of tab, formats, `tickAfterMinutes(±60)`, param parsing, anchors validation throws) — *implemented as the 10-test prototype, all passing*; `urlState` fixtures; `stateAt` (seek from 500 → 20 returns keyframe-correct positions; forward-fill absent; `snap`, `MAX_GLIDE_TICKS`); crossing logic (`(prev, cur]` with skip-ahead of 40 ticks fires each event once); intensity function (charge ≫ Culp's Hill per minute).
* **Golden**: `tests/golden/tick-clock.csv` (675 lines `tick,iso,tab,date,mpt`) — any anchor edit shows up as a reviewable diff.
* **Property tests** (optional `fast-check`): strict monotonicity for random valid anchor sets; `parseLocal ∘ format` round-trip.
* **Playwright e2e (desktop 1440×900 and phone 375×812):**
  1. *One clock*: for ticks {1, 12, 28, 226, 267, 451, 538, 553, 675}, load `/?tick=T&tm=1`, collect all DOM text matching `\d{1,2}:\d{2}\s?[AP]M` (excluding elements marked `data-historical-quote`) and all `July \d+` strings → sets have size 1 and equal `tm.format(T,'time'/'date')`. Fails today on every tick.
  2. *Deep link*: the URLs produced by all 9 link builders (documentary, education, embed, historian, regiment, search ×3, turning-points) open at the right tick / unit / vignette / location with the splash skipped.
  3. *Seek safety*: play to 500, seek to 20, assert no unit is rendered at a position from a keyframe with `tick > 20`.
  4. *No skipped events*: run at 16× for 200 ticks with an artificially slow frame (throttle) — every HIGH/CRITICAL event card is shown at least once.
  5. *A11y*: scrubber `role=slider` with `aria-valuetext`; live-region announcements ≤ 1/s; no unlabeled ✕ in event/toast panels.
  6. *Sub-pages*: compare/living-ledger/camera/immersive/documentary/education/turning-points/sandbox show the same clock at tick 538 (`3:00 PM`-style equality with the module).
  7. *Copy*: HTML/JSON grep for the banned phrases (V9).
  8. *Visual*: overlay snapshots at ticks 100 (dusk), 150 (night), 326 (dusk), 451 (first light), 538 (day).
* **Data-quality gate** (CI): V1–V15 with `--strict`.

---

## 11. Exact patch locations

### 11.1 Deployed bundle (`bundle.pretty.js` line numbers; the minified file needs the same edits by string replacement, and must be **renamed** on output — §3.3)

| Lines | Symbol | Change |
|---|---|---|
| before 9327 (`function v4()`), export list at 113369–113377 | new `TM` block | Insert the time module (§6.4) + anchors literal; export `TM as z` (lazy chunks `HelpModal`/`BookmarkPanel` import from the entry chunk, like `IF as t` today) or attach `window.__gtbgTime` |
| 9326 | `nA = 675` | keep; derive from `TM.TICK_MAX` |
| 9369–9370 | `jumpToDay` | tick constants from `TM.tabStart(day)` (unchanged values 1/226/451) |
| 9371–9383 | `getTickTime` | `getTickTime: () => TM.format(f().currentTick, 'compat')` (keeps the `"July 1, 7:30 AM"` shape the mobile header splits on, 102977); add `getClock()`, `stepMinutes(dm)` |
| 9384–9388 | `getCurrentDay` | `TM.tabDay` |
| 9856–9884, 9885–9907 | `M4`, `E4`, `A4`, `C4` | `TM.sun(tick)` → alpha/colour; remove CSS `transition: background 8s` (9894) or scale by speed |
| 96238–96310 | `F4`, `i2`, `y1` | replace with `stateAt` (§7.1); delete module-global `i2` |
| 96948–97013 | `cF`, `s2`, `Ed` loop | pacing modes (§7.2); event crossing hook; `Pe = cF / R` (96982) |
| 97415–97483 | `_F`, `yF` | HUD: `R` (97428) = `TM.format(x,'date')`; `he` (97429) = live speed label; ring fraction |
| 97540–97570 | `vF`, `xF`, `bF` | succession text `(tick N)` (97566) → time; keep crossing rule |
| 97822–97833, 97853–97864 | `$k`, `TF`, `RO` | `buildUrlState` (canonical names + `at`/`av`); bookmark record adds `at`, `av` |
| 97865–97896 | `IF` | label from registry (`TM.label(tick)`), fallback `TM.format(tick,'short')` (never bare `Tick N`) |
| 98010–98060 | unit panel | `"At Tick "` (98031) → `"At " + time`; history rows `histTick` (98052) → time |
| 98255–98345 | vignette panel | crossing + minutes look-back (98266–98272); jump label (98340–98343) |
| 98543–98662 | chronology loader, `LF` | load registry; crossing trigger (98607); header time (98630) → `TM.format(l.tick,'time')` |
| 98729–98737 | `zF` | registry ids |
| 99711–99822 | minimap | footer (99821) → `{n on field} units · {time}`; n from `stateAt` |
| 99888–99960 | toasts `qF` | footer (99949–99951) `Tick` → time; cap/batch |
| 100063–100345 | `th`, `XF` | `event` ids + `windowMin`; subtitle generated; timeout (100337) from minutes |
| 100615–100835 | `mA` | ticks from registry; strip typed clock words from `label` prose or generate them |
| 100836–100843, 100889, 100956 | `JF`, use, tooltip | `TM.format(mon.tick,'long')`; remove `JF` |
| 100998–101007, 101078, 101257 | `QF`, use, row | `TM.format(t,'short')`; remove `QF` |
| 101019 (+ boot state at 112943–112951) | `?ancestor=` read | replace with `parseUrlState` at boot; skip splash/onboarding when a deep link is present |
| 101471–101545 | `tO` splash | animate a *local* progress bar, not `yn.setState({currentTick})` (101491–101505) |
| 101679–101740 | `nO` | keep crossing; add clock |
| 102975–102977, 103144–103145, 103159–103173, 103191–103215, 103239–103240 | mobile `pO` | use `getClock()` (do not `split(", ")`); day tab labels; scrubber dots from registry; `Tick f/P` → time |
| 111819–111855, 111893 | onboarding `Gc`, copy | registry ids; copy (§7.13) |
| 112187–112201 | `f2`, `TO` | generated markers; fix tick-17 "First shot" |
| 112202–112360 | `IO` | 112212–112226 clock; **112218–112219, 112310, 112334** `±12` → `TM.tickAfterMinutes(c, ±60)`; 112312/112336 titles; 112357 `Tick c/675` → secondary; slider aria (A2) |
| 112921–113110 | `AO` | keyboard 112979/112984 (`±12`) and 112991–112996 (`1/2/3`), 112998–113005 (`+ - 0`, share the 8× cap); 113054–113055, 113086, 113088 labels |
| 113242–113283 | root siblings `FF/OF/VF/WF/CF/LF/_F/IO/KF/…` | mount per layout (`Zn`) so only one clock surface exists per layout |
| `assets/HelpModal-CFV9T0zH.js` @118, @198, @293–@526, About text | Help copy | "step one moment", "skip one hour of battle time", speed wording, "445+" (H10) |
| `assets/BookmarkPanel-C5YT4b5k.js` (`m(l)`, `"Tick "`) | bookmarks | label from registry; meta shows time + tick in `title` |

### 11.2 Proper source tree (start from `Downloads/gettysburg-source-reconstructed/gettysburg-src`, mapbox pinned to the deployed 3.24.1 by the provenance specialist)

* **New:** `src/lib/timeModel.js` (§6.4), `src/lib/urlState.js` (§8), `src/lib/stateAt.js` (§7.1), `src/lib/registry.js`; `public/data/{time_anchors,events,ticks}.json`; `scripts/{fit-anchors,validate-time,build-time-artifacts}.mjs`; `tests/{time-model,urlState,stateAt,crossing,golden}.test.mjs`, `tests/e2e/*.spec.ts`.
* **Modify (exists in RECON_SRC):** `src/store/store.js:44–49` (`jumpToDay`), `:51–61` (`getTickTime` → model; add `getClock`, `stepMinutes`); `src/App.jsx:90` (`+12`), `:96–97` (`226/451`), `:130–131` (`tickTimeLabel`, `day`), `:158–159` (labels); `src/components/MonumentsLayer.jsx:14–22` (delete `tickTimeLabel`), `:99`; `TimelineScrubber.jsx:10–17, 23`; `BookmarkPanel.jsx:32–33` (`tick`, `unit` → `buildUrlState`), `:47, 105, 120, 136`; `HelpModal.jsx:94–96`; `BootSplash.jsx:5, 74–76` (must not drive the real store); `OnboardingModal.jsx:11`; `VirtualWalkthrough.jsx:65`; `SearchPanel.jsx:31`; `dataLoader.js:13–19` (also load `time_anchors.json`, `events.json`).
* **Port first (missing in RECON_SRC, source = bundle lines):** chronology event card `LF` 98595–98662; NPS Auto Tour `th`/`XF` 100063–100345; HUD `_F` 97415–97480; day/night `M4/E4/A4/C4` 9856–9907; ancestor timeline `Zk`/`QF` 100998–101471; toasts `qF` 99888–99960 and `nO` 101679–101740; commander panel `vF/xF/bF/wF` 97540–97640 — each written against `timeModel.js` from day one so the legacy formulas never exist in the new tree.
* Repo hygiene: `npm run check` = `node scripts/validate-time.mjs --strict && node --test tests/`; add it to `netlify.toml` `[build] command` and to a git pre-push hook (the project has no git history today — initialise one so `time_anchors.json` edits are reviewable diffs).

### 11.3 Sub-pages (`DEPLOY_DIR/*.html`; load one shared `/js/time-model.js` as `<script type="module">`, fetch `/data/time_anchors.json` (already fetching ≥ 4 JSON files per page); **not** via render-blocking `site-nav.js`)

| File | Lines | Action |
|---|---|---|
| compare.html | 55, 65, 79, 114–129, 245–246 | hint text → live registry example; default ticks → registry moments; delete `dayForTick`/`approxTimeForTick`; add clock-slider mode |
| living-ledger.html | 64, 90, 135–144, 151, 160 | static initial clock from model; `DAY_BOUNDS` → `tabDay`; call-out `tick N` → time; per-minute intensity |
| camera.html | 55, 175–187, 201–202 | delete `hourForTick`/`atmosphereForHour`; `sunState`; tick display shows clock |
| immersive.html | 59, 163–173, 200, 206–207, 217 | same + intensity-based audio cadence; stop night artillery |
| dashboard.html | 85, 141, 163–166 | hour gridlines via `minutesToTick`; axis label; per-minute tooltips |
| documentary.html | 84, 89, 92 | eyebrow text; canonical link |
| education.html | 63, 72–73, 81 | `tabDay`; eyebrow; canonical link |
| turning-points.html | 51–100, 118 | day-part generated; tick 175 → registry; canonical link |
| sandbox.html | 103–107, 129, 223, 227 | presets from registry; note change-log `toLocaleTimeString` (211) is the visitor's wall clock (label it "your time" or drop) |
| cinematic-export.html | 60–64, 99–101, 118–121, 174–175, 213–214, 225–226, 246 | clock inputs; captions; `nearestVignette` window; file name |
| watch-together.html | 79, 172, 192, 201–202, 234, 281 | add `av`; show time; keep integer tick key |
| regiment.html | 189, 218–219, 247 | `tabDay`; time spans; canonical link |
| search.html | 114, 125–127, 139 | time in meta; canonical links (`unit`, `tick`, `ll`) |
| historian.html | 109–110 | time in citation; canonical link |
| embed.html | 60 | canonical link (keep absolute origin) |
| ground-remembers.html | 42, 47, 75–79 | copy; reveal label shows clock |
| index.html | 15, 18, 24, 32, 719, 754 | copy (meta/OG/Twitter/JSON-LD/SEO block) |
| manifest.json | 4 | copy |
| terms.html | 30 | "five-minute resolution" → "the map's time resolution" |

### 11.4 Data and config

| File | Change |
|---|---|
| `data/chronology_day1-3.json` | `metadata.tick_formula` → pointer to anchors; `time` regenerated from the model (keep ≥ 30 days for old bundles); add `event` id; fix embedded prose times flagged by V3 |
| `data/placement_schema.json` | regenerate `metadata.ticks_per_day.*.real_time`; `tick.description` "The 5-minute tick number. Tick 1 = 5:00am July 1." → "Frame number 1..675; clock from time_anchors.json"; correct "430,000" and "600-700 units per tick" to measured 1,804 / ~10 |
| `data/placements_*.json` | `metadata.description` time strings → generated; `record_count` (4,890 vs 100) fixed or removed |
| `data/casualty_apportionment.json` | add structured `duration_min` per engagement period (so V3b can compare without prose parsing) |
| `data/vignettes_part*.json`, `data/oob/commander_successions.json` | add `event` id; `approx_tick` follows the registry |
| `netlify.toml` | headers for `/data/time_anchors.json`, `/data/events.json`, `/data/ticks.json` (`max-age=0, must-revalidate`); `[build] command`; keep `/assets/*` immutable but only with content-hashed names |
| `sw.js` | `CACHE_NAME` bump (line 3); `PRECACHE_ASSETS` (lines 5–13) updated to the new hashed name |
| `user-guide.pdf` | source doc: "Shift+→ Jump 1 hour" wording, "675 five-minute snapshots", "Share a permalink", tick-based text (`ug.txt` 9–10, 20–21, 32–33, 93) |

---

## 12. Findings (fix specs)

Effort: S < 0.5 d, M 0.5–2 d, L 2–5 d, XL > 5 d. "Refs" are BRIEF audit IDs; `[]` = new.

**Cross-reference to the time-facts plan items** (same defects seen from the research side; implement once): app-time-01 ↔ time-facts-02; app-time-02 ↔ 01; app-time-03/05/12 ↔ 03, 07; app-time-04 ↔ 04, 06; app-time-09 ↔ 09; app-time-10 ↔ 08; app-time-11 ↔ 11; app-time-13/14 ↔ 12; app-time-17 ↔ 10; app-time-18 ↔ 13; app-time-19 ↔ 14; time-facts-15 (resample to uniform ticks) is option (b) of §6.1 — rejected here for the reasons given, and the specialist likewise ranks it "only if uniform ticks are required (XL)".

**app-time-01 — Phase-0 hotfix: one date, one clock (agreeing with each other)** · critical · S · refs C3, C4 · depends: app-time-13 (rename the bundle)
Evidence: 97428, 100842, 101006 (`+ 2`); 9377 (`6*60 : 4*60`) vs 9859/100838/101001 (`5*60`); 98630 (`l.time` label). Root cause: four unrelated copies of a formatter, one patched. Fix: the 6-edit diff in §9 Phase 0. Acceptance: for ticks {1,12,17,28,226,451,538,675} every DOM string that is a date shows July 1–3 and every clock string is identical across toolbar/mobile header/time bar/HUD/tooltip/ancestor row/event card; `grep -c "+ 2"` on date templates = 0. Moves: C3 closed; C4 "clock disagrees with itself" closed (history still off until 02–05).

**app-time-02 — Canonical time module + `time_anchors.json` (piecewise-linear warp)** · critical · M–L · refs C4, H9, H11 · depends: — (starts with the proposed anchors; 03 refines them)
Evidence: 9 independent formulas (§2); data proves variable rate (§4.3). Fix: §6 (module, schema, formats, tab/date semantics, uncertainty, sun table, no extrapolation, strictly monotone). Acceptance: the 13-test prototype suite passes against the real anchors; golden `tick-clock.csv` committed; no other file contains a tick→time conversion (V9). Moves: Historical consistency C-→B+ (with 03–05), UX/learnability.

**app-time-03 — Adopt and review the proposed anchors (`time-facts-anchors.csv`), then refit with kinematic constraints** · critical · M (research already done) · refs C4 · depends: 02
Evidence: today's labels/clock are off by a mean ~5 h against sourced times (§4.5); the proposal loads cleanly and is monotone (§6.6); 19 keyframe pairs still violate speed caps under it. Fix: import per §6.6 → editorial review of S/M/R/D statuses → run the constrained fit (LNDS inversion triage → detrended isotonic fit with kinematic lower bounds → RDP simplification keeping conf-A anchors and ticks 1/226/451/675) → residual report. Acceptance: every conf-A/B fact within 2σ of its fitted time; slopes within [0.75, 60]; V6/V7 findings triaged; sign-off. Moves: C4 closed.

**app-time-04 — Event registry; resolve cross-source tick disagreements and order inversions** · high · L · refs C4, H7 · depends: 02
Evidence: §4.4 (10 groups > 2 ticks apart; stop 7/8 inversion; stops 12/13/14 all "3:00 PM"; tick 175 vs 75; scrubber tick-17 mislabel). Fix: `events.json`; all files reference ids; re-tick or `approx` per triage. Acceptance: V5/V6 clean. Moves: consistency, credibility.

**app-time-05 — Regenerate data-level time strings and metadata** · high · M · refs C4 · depends: 02, 04
Evidence: §2.3, §4.1 (21 pace segments; labels drift −230…+15 min), `placement_schema.json` and chunk descriptions (5.0/2.8/4.3/3.8… min/tick), `record_count` 4,890 vs 100. Fix: §11.4. Acceptance: V3/V4/V13 clean; old bundles still render (legacy `time` retained). Moves: Historical/data consistency; documentation accuracy.

**app-time-06 — Deep-link consumer with backward compatibility** · high · M · refs [] (adjacent H3) · depends: 02
Evidence: only `?ancestor=` is read (101019); 9 link builders and the guide promise more (§8). Fix: `urlState.js`; splash/onboarding skip; canonical emitters; keep aliases `t`, `u`, `lat/lng`. Acceptance: fixtures in §8 pass; e2e opens each emitter's URL at the correct state. Moves: Core function (every "See it on the map" link, bookmark and embed works), Usability; referral funnel from the 9 link builders.

**app-time-07 — Seek-safe, gap-tolerant renderer state (`stateAt`)** · high · M–L · refs [] (adjacent H4, D3, H11) · depends: 02
Evidence: `i2` never cleared (96265/96271) → stale future positions after backward seeks; adjacent-tick-only interpolation (96266–96310; 93/1,209 pairs); minimap count uses exact-tick records (99821). Fix: §7.1. Acceptance: seek 500→20 e2e; keyframe glide visible; minimap shows units on field. Moves: Core function and Reliability (no stale positions after seek, continuous motion), Fit & finish.

**app-time-08 — Crossing-based triggers with minute look-back; clock in cards/toasts/panels** · high · M · refs C4, H4 · depends: 02
Evidence: 98607 exact-tick; 98268–98272 window; 99949 `Tick N`; 98031; 97566. Fix: §7.3. Acceptance: no event skipped at 16× / throttled frames; all panels show clock. Moves: Usability (no missed HIGH/CRITICAL events), Reliability; H4 clutter.

**app-time-09 — Playback semantics and labels** · medium · M · refs H9 · depends: 02
Evidence: 96982 (2 ticks/s), 97429 ("1x (real time)"), ±12 sites, 8×/16× cap mismatch (112185 vs 112998), tour `tickWindow` (100337). Fix: §7.2 incl. optional `clock` pacing. Acceptance: label equals measured battle-min/s ±5 %; ±1 h buttons move exactly 60 battle-min ± half a tick. Moves: Usability/learnability (H9 closed), Accessibility (labelled controls).

**app-time-10 — Solar-driven day/night lighting (+ moon cap)** · medium · M · refs C4 · depends: 02
Evidence: `E4` thresholds (9861–9884) ≈ 1 h early vs computed sunset 19:32; Tigers assault at "dusk" (tick 326) rendered at map-clock 12:20 PM with zero tint; night ticks drawn as daylight. Fix: §7.5. Acceptance: visual snapshots at ticks 100/150/326/451/538. Moves: Visual design fidelity and Historical consistency (day/night matches the story).

**app-time-11 — Sub-pages adopt the shared module** · medium · M–L · refs C4 · depends: 02
Evidence: §2.2 table; three different `dayForTick` copies; two date conventions. Fix: §11.3. Acceptance: same clock string at tick 538 on all pages (e2e 6). Moves: Fit & finish; consistency across the 20 sub-pages.

**app-time-12 — Generated captions; fix known wrong labels** · medium · M · refs C4, H7 · depends: 02, 04
Evidence: sandbox presets (3 wrong vs the site's own chronology), turning-points tick 175, compare hint (ticks 358/382), self-contradicting monument tooltips, onboarding "afternoon" beside 7:25 AM. Fix: §7.9, §7.10, §7.12. Acceptance: V3 clean on these files. Moves: Historical/data consistency; copy voice (H7).

**app-time-13 — Rollout hygiene for any time-model patch** · high · S–M · refs N1, C6 · depends: —
Evidence: §3.3 (same-name patched bundle; `immutable`; SW cache-first; `prov-recon.md` T-02 counts four byte-streams under one name); `/data/*` `max-age=3600`. Fix: content-hash rename + `index.html` + `sw.js` (`CACHE_NAME`, `PRECACHE_ASSETS`) + header policy + `av`. Acceptance: a browser holding the Sep-29 bundle receives the new one on next load; `sha256(file)[:8] === name` assertion in CI. Moves: Reliability and Performance (stale-bundle cache), release hygiene (N1).

**app-time-14 — Validator, tests, golden and e2e "one clock"** · medium · L · refs [] · depends: 02
Fix: §10 (V1–V15, unit, property, golden, 8 Playwright specs). Acceptance: CI red on every current defect listed in the "expected today" column; green after 01–12. Moves: engineering quality across all categories (prevents regressions).

**app-time-15 — Truthful copy and documentation** · medium · S–M · refs H9, H10, G1 · depends: 02
Evidence: §7.13 list (index.html 15/18/24/32/719/754, manifest.json:4, ground-remembers.html:42, terms.html:30, splash 111893, Help About "445+"). Fix: replace claims; add "About the clock"; regenerate guide PDF. Acceptance: V9 copy lint clean. Moves: Documentation/legal accuracy, SEO (truthful meta description), H10.

**app-time-16 — Intensity per battle-minute (audio, Ledger, Dashboard) and immersive night artillery fix** · medium · M · refs [] · depends: 02
Evidence: main cannon `jk()` throttled by wall-clock 4 s (96555–96557); immersive 206–207 (forward-filled "Deployed Artillery" keeps firing overnight); charge 90 casualties/min vs Culp's Hill 3.6/min (25×) but 7× per tick. Fix: §7.4, §7.10. Acceptance: unit test `intensity(charge) / intensity(Culp's Hill) ≥ 10`; no cannon audio in ticks whose sun state is night and casualty rate ≈ 0. Moves: Core function/immersion; Living Ledger and Dashboard accuracy.

**app-time-17 — Data repairs the warp exposes; disclose sparsity** · low · M · refs [] · depends: 02
Evidence: 6 pairs exceed speed caps at 5 min/tick, 19 under the proposed anchors (1 are day-boundary seams that need `snap:true`); 167 single-keyframe units; 487 empty ticks; `record_count` 4,890 vs 100; schema "430,000+". Fix: add intermediate keyframes or `snap:true`; correct claims; add a sparse-data note to About. Acceptance: V7 clean; V13 clean. Moves: Data quality; Core function (smoother, plausible motion).

**app-time-18 — Accessible, honest time display** · low · S–M · refs A2, A6 · depends: 02
Fix: scrubber `role=slider` + `aria-valuetext`; `<time datetime>`; throttled live region; "about" wording from `uncertaintyMin`; LMT disclosure; `font-variant-numeric: tabular-nums` and reserved width to avoid label-driven CLS. Acceptance: axe clean on toolbar/time bar; no layout shift when the clock string changes width. Moves: Accessibility (WCAG 2.2 AA: 1.3.1, 4.1.2), CLS.

**app-time-19 — Temporal index for Ask the Historian** · low · M · refs H8 (dovetail) · depends: 02, 04
Fix: every knowledge-base chunk gets `event`, `tick_range`, `time_iso`; the retriever resolves "at 3 pm on July 3" / "before Pickett's Charge" through `minutesToTick` and the registry; answers cite the clock, not the tick. Acceptance: 20-question eval set with time-anchored questions ≥ 90 % correct-window retrieval. Moves: Ask the Historian quality (temporal retrieval, H8).

**app-time-20 — One clock surface per layout** · medium · S · refs C1, C2 · depends: —
Evidence: 113242–113283 mounts `_F`, `IO`, `LF`, minimap and search as root siblings of the `Zn !== "mobile"` fragment, so the Mobile layout also shows the +2 badge and the desktop time bar next to its own header clock. Fix: mount per layout. Acceptance: at 375 px exactly one element matches the clock pattern (e2e 1). Moves: Fit & finish (mobile), unblocks C1/C2 verification; Accessibility.

---

## 13. Open questions, uncertainties, and things I did not do

1. **Historical truth of the anchors** is owned by the time-facts specialist, whose CSVs were still being refined while I wrote this (the anchor list gained tick 5 between two of my reads; `time-facts.md` was still v0.1). All derived numbers in §0, §4.5, §6.4, §6.6 and V-table are regenerated by `tmp-app-time/tf_summary.py`; I checked the proposal for consistency only, not against sources. Nothing else in the design depends on the values.
2. **Intent of the 06:00/04:00 store constants is unrecorded** (no README/PENDING/comment mentions them). I inferred nothing beyond "a later, store-only patch".
3. **Product decisions needed (see also `time-facts.md` §9):** (a) Day tabs anchored to first light (recommended) vs midnight; (b) whether to show "about" for uncertain times; (c) `story` (default) vs `clock` playback modes exposed in the UI or only via keyboard; (d) whether the 125 event-less Day-1 night ticks (18.5 % of the timeline) keep their ~2.6 min/tick density or become a flagged time-lapse segment (`lull:true`).
4. **Sunrise/sunset/twilight/moon values** come from the time-facts specialist's NOAA-algorithm script (which I re-ran); moon phase is a mean-synodic estimate (±0.5 d). I did not cross-check against an almanac.
5. **Mobile double-clock claim** (overlays mounted in both layouts) is from static reading of the render tree (113242–113283), not a measured pixel layout; the identification of the 572 px transport row with `IO` is an inference.
6. **No browser was used** (shared-pane rule); all behaviour was derived from source, data and scripts. Anything about runtime feel (e.g. how 24 min/tick reads at 1×) should be judged in the Phase-2 A/B overlay.
7. I did not read the NPS Auto Tour source PDFs in `Downloads` (`Gettysburg_Auto_Tour_Stops*.pdf`); the tour-stop clock times may derive from them and could be checked there.
8. The prototype kinematic analysis treats every pair of consecutive keyframes as a straight-line move; roads, fences and terrain are ignored, so V7 findings are *lower bounds* on required time.
9. Numbers from other specialists (`prov-recon.md` four byte-streams under one bundle name; `time-facts.md` "six implementations") corroborate but were not used as sole evidence for any claim.

### Artefacts (all under `plan-work/tmp-app-time/`)
`time-model.mjs` + `time-model.test.mjs` (13 passing tests), `time_anchors.tf.json` (time-facts proposal in module format), `time_anchors.demo.json` (early fixture built from the site's own claims), `tf_summary.py` / `tf_derived.py` (regenerate every time-facts-dependent number), `tf_check.mjs`, `tf_crosscheck.mjs`, `tf_kin_segments.py`, `tick-clock.tf.csv` (golden-style 675-row output for the proposal), `assemble.py` (rebuilds this report from `part1–5.md`), `fit_anchors.py`, `run_authored.py`, `kin_fit.py`, `kin.py`, `kin2.py`, `kin3.py`, `kin_demo.py`, `kin_tf.py`, `err_table.py`, `formulas.py`, `chunkdesc.py`, `scan_text_times.py`, `text_times.json`, `app_numbered.txt` (numbered copy of the app region used for greps).


---

## Verification

Adversarial verifier pass, 2026-09-30. Read-only: nothing under DEPLOY_DIR/SRC_DIR/bundle files changed; scripts were run inline (no files written). Method: re-opened every cited `bundle.pretty.js` line, the minified bundle, `sw.js`, `netlify.toml`, `index.html`, sub-pages, `data/*.json`, the Jun-13 and Jul-20 builds in `Downloads`; ran `node --test tmp-app-time/time-model.test.mjs` and `tf_crosscheck.mjs`; re-derived the kinematics, drift, sun and hash numbers independently; and curled the live site.

### Reproduced (evidence is real)

* **Line cites are exact** for 9377, 9859, 97428-97429, 100838/100842, 101001/101006, 98607, 98630, 98268-98272, 96238/96265/96266/96271, 96982/96984, 99821, 99949-99951, 101019, 101494/101500, 112185, 112218/112310/112334, 112357, 113242-113283, 113354. The minified bundle contains the same strings (`July ${l+2}, 1863`, `July ${f+2}` twice, `(P===1?6*60:4*60)+H`).
* **Regression archaeology holds**: Jun-13 `index-dw1swkmu.js` has store `k=5*60+H`, `July ${R+2}` in the store and `+2` in HUD/JF/QF; 11 of 13 Jul-20 builds carry `6*60:4*60`; only `index-aneysg9a` and `index-cg8famxn` have the store date fixed.
* **Bundle bytes**: live `/assets/index-Cg8FAMXN.js` = 2,280,438 B (`public,max-age=31536000,immutable`); Jul-20 copy = 2,280,095 B; `cmp` first difference at byte 151,648. Live `/data/*` = `max-age=3600`; live `sw.js` = `no-cache,no-store`.
* **Data**: 1,804 records / 188 ticks / 478 units / 1,209 consecutive pairs / 93 one-tick pairs / 167 units with exactly one record; the six speed-cap pairs (2,374 / 1,467 / 929 / 867 / 814 / 3,762 m) and the 19 pairs under the proposed anchors (identical list, 1 of the 19 is a day seam) reproduce; 33 anchors with slopes 0.83-42.33; 4.95 h / 4.98 h mean errors (n=134); class counts 60/36/12/9/8/6/4/2; 21 drift segments; 355 strings / 391 expressions (223 explicit, 168 day-part) / 151 tick+clock pairs; casualty durations (538-558 = 30 min, 256-330 = 2 h, 451-534 = 7 h); `record_count` 4,890 vs 100; 42 successions; 13/13 module tests and the 129/129 inverse cross-check.
* **Sun**: an independent NOAA-equation run gives sunrise 04:35, sunset 19:31, civil twilight 04:03 / 20:04 (LMT) for July 2; mean-synodic moon age 14.4-16.4 d at 00:00 UT on July 1-3 (full, as claimed).

### Verdict table

| id | verdict | notes |
|---|---|---|
| app-time-01 | CORRECTED | Evidence exact. (1) Renaming the entry chunk is not enough: `HelpModal-CFV9T0zH.js` and `BookmarkPanel-C5YT4b5k.js` both start `import{...}from"./index-Cg8FAMXN.js"` and are served `immutable` (checked locally and live). Their bytes must be rewritten (new names) and the two `import("./HelpModal-...")` / `import("./BookmarkPanel-...")` strings at 112469-112470 updated, otherwise opening Help/Bookmarks loads a second copy of the old entry (duplicate React and zustand store). (2) Section 9 claims Phase 0 removes the "contradictory tooltips": false. `mon_hood` (tick 262) would print "8:00 AM July 2" above typed text "wounded ... at 4:00 PM July 2"; only the date is repaired. (3) Phase 0 leaves the desktop toolbar printing the date twice (missed item 7). |
| app-time-02 | CORRECTED | Decision (a) is right; the justification for rejecting (b) is overstated. "Infeasible without inventing data" is not true: the renderer already holds/forward-fills, so re-timing would resample, not invent. The decisive reasons are: 63 h at 5 min = about 757 ticks (> 675, so tab ranges, `tickMax` and every key change), tick permanence for links/bookmarks/Watch Together, and the 1.5 min/tick resolution the charge needs. Also give `tickAfterMinutes` a guard so that |dm| below half a segment slope cannot return the same tick (no-op button). |
| app-time-03 | CORRECTED | Numbers reproduce. Anchor t5 (5:20 AM, status M) is circular: its evidence cell is "site t5 label 5:20am ... keeps the pre-7:30 slope realistic" and it reuses fact R003 already used by t1; mapping M to conf B / sigma 15 overstates it. Import it as derived (D, sigma 30) or drop it and let the kinematic floor shape ticks 1-12. Also record which authored claim loses where an anchor contradicts a data-file description (`placements_day1_ticks101_225.json` says ticks 101-225 span "1:30pm to 12:40am"; anchor t100 = 8:00 PM). |
| app-time-04 | CORRECTED | Evidence confirmed (10 disagreement groups: 12/17, 75/175, 258/262/278, 270/290, 272/293/295, 548/549/552/553, 550/554; succession ticks verified in `commander_successions.json`). Effort L is optimistic: 27 content defects (12 MISORDERED, 4 WRONG-DAY, 9 COMPOSITE, 2 UNVERIFIED-QUOTE) each need sourced re-ticking, a map spot-check and, for the 9 composites, new copy plus the Pickett placement audit (ticks 180/400): L-XL. |
| app-time-05 | CONFIRMED | Drift table, chunk description pace (5.1-5.4 / 5.0, 2.7, 4.2 / 3.7, 4.4, 3.8 within rounding), `record_count`, schema "430000" and "600-700" all verified. Only the first placements file carries `record_count`. |
| app-time-06 | CORRECTED | Emitters and the single reader (101019) verified; no `?tick=` reader in `index.html` or `site-nav.js`. (1) The lone reader lives inside `Zk`, which mounts only after the user toggles `Yn` (initial `false` at 112952, mounted at 113251), so `?ancestor=` has never worked on a cold load either, although the bundle emits it (101117) and the guide promises it (`ug.txt:124`). Section 8's "ancestor - existing, unchanged" is wrong: the parser must also open the panel. (2) The consumer must load data first: boot loads only Day 1 (`sF`, 96940); Day 2/3 placements load only during playback at ticks >= 200 / >= 420 (96991-96992) or on mobile at map load (103040-103042); `jumpToDay` (9369) loads nothing. `?tick=538` on desktop would paint forward-filled Day-1 positions. Add an `ensureDay(1..day)` await before applying the tick. (3) The splash resets `currentTick: 1` on completion (101500), so it must be skipped, not merely raced. |
| app-time-07 | CORRECTED | Evidence exact. (1) The routine trigger is the boot splash, not only backward seeks: `tO` sweeps the store 1 to 675 (101494) and the effects at 97312-97325 call `y1` on every tick change, priming `i2`. Simulation on the Day-1 files (the only ones loaded during the splash): 186 units drawn at tick 1 vs 70 with a tick-1 row at 60 fps (120 at 30 fps, 97 at 20 fps); `app-bugs.md` says 261, the real number depends on frame rate. Add the acceptance test "after boot, tick 1 shows exactly the units with a keyframe <= 1". (2) "Build tracks once after load" is wrong under lazy per-day loading (`addPlacementsForDay`, 9397-9406): rebuild per day or preload all days. (3) Section 7.1 says "identical visuals to today" and, two bullets later, that motion becomes continuous: gliding changes the look of most of the 1,116 non-adjacent pairs; ship behind the flag with baseline screenshots and design `MAX_GLIDE_TICKS` per disposition (a Bivouac unit should not drift 40 ticks). (4) The OOB (50-tick, 102325) and roster (100-tick, 102664/103124) "on the field" windows should use the same definition. |
| app-time-08 | CORRECTED | Exact-tick triggers and window sizes verified. "Toasts already use the correct rule" is only half true: `qF` updates `H.current` only while playing (99897-99903: `if (!P or !f) return;` precedes `H.current = c`), so after a paused seek (say 50 to 500) the first tick after Play evaluates `bF(50, 500)` and queues up to 4 arbitrary old succession toasts. Runtime effect inferred from code, not run. |
| app-time-09 | CONFIRMED | 96948/96982 (2 ticks/s), 97429, +/-12 sites, 8x (112185) vs 16x cap, tour `tickWindow*500/2` (100337) verified; 1.7-85 battle-min/s follows from slopes 0.83-42.3. |
| app-time-10 | CONFIRMED | Tick 326: M4 hour 13.33, `E4` alpha 0, toolbar 12:20 PM (verified by hand); V-014 text contains "near-darkness"; sun values reproduced. Nit: the `E4` dusk ramp starts at hour 16 (band `f < 18`), not 17, and the dawn side lags the other way (alpha 0.25 at 05:00-06:00 vs civil dawn 04:03); the solar function fixes both. |
| app-time-11 | CONFIRMED | Formulas at compare 120-129, ledger 135-144, camera 175-179, immersive 169-173 verified. Add to effort: the pages' inline scripts are classic IIFEs (compare.html:95, living-ledger.html:87, camera.html:62), so adopting an ES module means converting each to `type=module` (deferred, strict) or dynamic `import()`. |
| app-time-12 | CONFIRMED | Sandbox presets (103-107), chronology t62/t256/t260/t551/t553 texts, turning-points tick 175 vs chronology 75, compare hint (line 55) all verified. |
| app-time-13 | CORRECTED | Bytes, headers, sw.js lines, `controllerchange` reload verified; prov-recon T-02 corroborates (4 variants plus a hand-renamed fifth). (1) Rename cascade to the two lazy chunks (see 01). (2) The proposed CI assertion `sha256(file)[:8] === name` can never pass: none of the five shipped assets matches its name in hex or base64url (e.g. `HelpModal-CFV9T0zH.js` gives b64 `JsM1FpO3`, hex `26c33516`; `index-B4G7Z_2G.css` gives `kKClz9Og`), because Rollup hashes pre-render, not final bytes. Use a committed lockfile (name to sha256; fail if a shipped name's bytes change) or rename every patched file with `base64url(sha256(bytes))[:8]`. prov-recon T-02 repeats the flawed assertion. (3) Effort S becomes S-M with the cascade. |
| app-time-14 | CORRECTED | Expected-today counts reproduce (355 / 391 / 223 / 168 / 151; the 3 `+ 2` hits; the `5*60`/`6*60`/`4*60` hits). Sections 10.1 and 11.2 gate on Netlify `[build] command`, but the site is deployed by drag-and-drop/manual upload (`infra-netlify.md:68, 539-541`; `netlify.toml` has `publish = "."` and no command; "Download source" returns the deploy), and manual deploys run no build. Wire `npm run check` into a local pre-deploy script (or move to git-connected deploys first). |
| app-time-15 | CORRECTED | Cites at index.html 15/18/24/32/719/754, manifest 4, ground-remembers 42, terms 30, splash 111893, Help @118/@198 (entry-start offsets), `ug.txt` 9-10/20-21/32-33/93 verified. Omitted: `index.html:745` (`boot-sub`: "Watch the battle unfold in real time across 675 five-minute snapshots"). |
| app-time-16 | CONFIRMED | X4 < 40 px (96480-96502), 4 s throttle (96555-96557), immersive pure forward-fill keeps cannon firing at night, and the 1,514/80 ticks and 2,700/20 ticks arithmetic all verified. |
| app-time-17 | CORRECTED | All six and all 19 pairs reproduce. Internal inconsistencies: section 7.1 says "5 of them are day-boundary scene cuts" (of the 19) but sections 6.6 and 12 correctly say 1 (5 seam pairs exist in total; only `U-20ME` 225-226 is among the 19). 167 = units with exactly one record; 173 units have a single distinct keyframe tick. Section 13.3(d) says the 125 event-less night ticks keep "~2.6 min/tick"; the proposal gives 4.05 (510 min over 126 ticks). |
| app-time-18 | CONFIRMED | Slider unlabeled, clock 11 px monospace (113354). Gap: the brief's A+ bar is text >= 12 px; the fix keeps 11 px (`dayLabel` at 113348 too). |
| app-time-19 | CONFIRMED | `historian.html:109-110` prints the tick and cannot resolve clock questions; 129 facts in `time-facts.csv` verified. The 90 % eval target is an unmeasured proposal. |
| app-time-20 | CORRECTED | Root cause is confirmed, not just inferred: `Po.wrap` is `position:absolute; bottom:0; z-index:100` (112374-112387) and ties with `tn.root` (`position:fixed; z-index:100`, 103698-103704), so DOM order puts `IO` on top of the whole mobile UI; the +/-1hr buttons exist only in `IO` (112312/112336) and match C1's control list; `app-mobile.md` (lines 10, 53, 59-62, 77) measured the rects. Severity should be HIGH and it belongs in Phase 0: one change closes critical C1 and C2. Do not blanket-unmount: `pO` mounts only `Jk/Xk/Yk/Zk` (103363-103366), so the event card `LF`, story panel `CF` and toasts `qF/nO` have no mobile counterpart; decide replace-or-keep first, and relax the e2e "exactly one clock element" to "all clock strings equal" (the card shows a clock). |

### Missed issues (in scope, not in the report)

1. **high - Rename cascade for lazy chunks** (detail under 01/13). Fix: rewrite the import specifier in both lazy chunks, rename them, update bundle lines 112469-112470 and PRECACHE if listed. Acceptance: a browser holding the Sep-29 bundle opens Help and Bookmarks after the deploy with a single React instance.
2. **medium - `?ancestor=` permalink is dead on cold load** (101117 emits, 101019 reads inside `Zk`, which mounts only when `Yn` is toggled; guide `ug.txt:124` promises it). Fix: parse at boot and set `Yn` true.
3. **medium - Toast burst after a paused seek** (99897-99903). Fix: update `H.current` before the `isPlaying` guard, or reset it on seek.
4. **medium - Boot splash primes `i2` on every page load** (detail under 07; 186 vs 70 units at 60 fps). Fix: `stateAt`; short-term, clear `i2` when the tick moves backward or by more than 1, and stop the splash writing to the real store.
5. **medium - Tick-count windows are minute-blind**: 10 ticks (97584 succession highlight), 50 (102325 OOB), 100 (102664 roster, 103124 mobile roster), `Math.abs(c - P) > 1` (98602). Under the warp these span 40 min to about 35 h. Fix: express in battle minutes via `tickAfterMinutes`.
6. **medium - Deep links (and day tabs/`jumpToDay`) need `ensureDay`** (detail under 06). Day 2/3 data loads only when playback crosses ticks 200/420.
7. **low - Desktop toolbar prints the date twice** (113084-113088: `dayLabel` "July 1", then `tickLabel` = full `getTickTime()` "July 1, 8:15 AM"). Phase 0 should render time only in `tickLabel`.
8. **low - Two small omissions**: `index.html:745` copy ("unfold in real time"), and the 11 px clock/day labels (113348-113354) kept by app-time-18 against the >= 12 px bar.
