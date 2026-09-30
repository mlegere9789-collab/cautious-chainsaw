# Copy, Voice and Documentation Plan (specialist: docs-copy)

Site: https://gettysburginteractivemap.com. Scope: every user-facing string in the deployed build, the user-guide PDF, the missing professional pages, the in-app Help/About copy, and a content style guide. NO BUILD was run and no site folder was modified. Everything below is read-only analysis plus a plan.

Conventions. `bundle.pretty.js:LINE` means `plan-work/bundle.pretty.js` (113,377 lines; app region L96207-113377). HTML/JS citations are `file:LINE` inside `DEPLOY_DIR` (`C:/Users/mlege/AppData/Local/Temp/claude/site/deploy`). The Help chunk is a single-line minified file, so it is cited by byte column: `helpmodal-cfv9t0zh.js:colN` (the SRC_DIR spelling is `HelpModal-CFV9T0zH.js`). `ug` = the deployed `user-guide.pdf` (6 pages, ReportLab, 14,321 B). Audit IDs (C1, H7, G1 ...) are from BRIEF.md; `app-bugs-NN`, `app-time §N`, `app-a11y-NN` refer to sibling specialist reports in `plan-work/`. Effort: S<0.5d, M 0.5-2d, L 2-5d, XL>5d.

---

## 0. Executive summary

1. **Leaks are systematic, not incidental.** A rule-based scan of every user-facing surface (script: `tmp-docs-copy/inventory.py`, output `inventory.csv`, 356 rows) finds hits on all 18 rules: 56 ASCII `--` dashes in HTML/JS/bundle strings, 69 uses of the developer word "tick", 104 product/feature naming variants, 17 emoji-as-label strings, 10 "real time" claims, 4 outright development-history sentences, 4 internal-identifier leaks. The **data JSON files add a second, larger layer** because their strings are rendered verbatim by the map, Regimental Biography, Battle Reports, Search and the Historian: 1,639 spaced `--` dashes, 69 ALL-CAPS phrases, 61 `KIA` abbreviations, 50 "tick" mentions, 20 clocks written `7:30am`, 14 internal IDs (`alias for U-84NY`, `Commander succession US-017 activates`).
2. **The five strings that most damage credibility** (fix first, all S effort): `viewshed.html:46` ("Earlier drafts of this tool tried..."), `ar.html:56` ("which we haven't been able to do from here"), `dashboard.html:261-263` (a developer data note) plus the stat card that prints `highest_single_regiment_rate` / `undefined` (`dashboard.html:244-248`, C7), `index.html:377` ("an AI-style historian"), and the Search row `14th Brooklyn (alias for U-84NY)` (data: `oob/union_regiments_i_ii_corps.json`, designation field).
3. **Twelve claims in the guide/Help/UI are false against the app** (section 3.2): `H` heatmap toggles a flag nothing renders; Order of Battle has no desktop button; `Esc` does not "close any panel"; "Find Unit / Location" is the same panel as Search; Monuments shows 20 story markers, not 512; the map's "NPS Auto Tour" is a different 16-stop list from the Walkthrough's official stops; unit "dots" are actually oriented rectangles filled with the side colour; timeline dots are not "red = critical, gold = significant"; Help says "445+ units" (data: 467 regiments plus 103 batteries = 570); Help lists nine "Primary Sources" of which six are secondary works; "PDF won't download: right-click ..." documents a workaround for a header the server no longer needs; Historian says "everything traces back to a source link" but chronology results carry none (`historian.html:119-125`).
4. **The PDF is a print-unfriendly, inaccessible artifact**, measured with `tmp-docs-copy/pdf_lint.py`: body fill 97.7 / 16.9 / 99.8 / 5.0 / 93.3 / 40.5 % per page; an orphaned heading at the foot of page 1; group-header text at **1.25:1** contrast (8.7 pt on gold); **95 % of characters set below 10 pt** (smallest 8 pt); **no embedded fonts** (Helvetica, Helvetica-Bold, Helvetica-Oblique, Symbol); **0 hyperlinks**; no `/Lang`, no `/MarkInfo`, no `/StructTreeRoot`, no outline, no `DisplayDocTitle`; metadata literally `(anonymous)` / `(unspecified)`; no version or date; a dark page background on every page. No generator script exists anywhere I searched (Downloads, depth-limited): the PDF cannot be reproduced.
5. **The site has none of the professional trust pages**: `about`, `sources`, `faq`, `accessibility`, `corrections`, `changelog`, `press`, `teachers`, `contact` and `.well-known/security.txt` all return the branded 404 (curl, Sep 30 2026). Yet the data files already contain a 29-entry bibliography (26 distinct works) that Help/About reduces to nine, mislabelled "Primary Sources".
6. **There is zero mention of slavery, emancipation, enslaved or free Black residents, or civilians** anywhere in the site's HTML, JS or data (grep, 0 hits each; the only related words are "a new birth of freedom" and the Jennie Wade memorial). For a museum-grade history product this is a content-completeness gap, treated in finding docs-copy-27.
7. **Root cause of nearly everything above: no single source of truth for text.** The same fact is typed in up to seven places. Keyboard shortcuts exist in five hand-typed copies (root handler `bundle.pretty.js:112960-113046`, Help array `helpmodal-cfv9t0zh.js:col72-1000`, onboarding Quick Reference `bundle.pretty.js:111984-111996`, timeline tooltips `bundle.pretty.js:112312-112336`, `index.html:406-407`) plus the PDF. The unit count is typed as 467 ten times in HTML/JSON (`index.html` 6, `find-ancestor.html` 2, `historian.html` 1, `manifest.json` 1), as "445+" in Help, and 675 is typed 30 times in 11 HTML/JSON files (plus the bundle). Disposition colours exist in **two disagreeing maps** (map dots `bundle.pretty.js:96306-96318` vs legend `:99385-99413`).
8. **The plan is five systems, not 300 edits**: (a) a build-time `facts.json` (counts computed from the data files), (b) a `features.json` manifest (tools, hotkeys, dispositions with colour and gloss, extras menu) that feeds Help, nav, the guide and the sitemap, (c) a copy catalogue with the standard disclaimers, (d) a committed style guide enforced by Vale + a `copy_lint` CI job (the prototype is `inventory.py`), (e) a reproducible guide generator that emits an accessible HTML twin and a tagged PDF/UA. Section 7 has 33 findings; section 8 sequences them; Phase 0 (an hour of string edits) removes every item in point 2.
9. **A fallback exists if the app is not rebuilt** (N1): `copy_patch_table.json` lists 64 exact find/replace rows for the minified bundle and Help chunk with occurrence counts verified against the deployed file (all found once except substring collisions noted in section 2.10). Caveat from `app-time §3.3`: any in-place bundle patch must also rename the file (the hash is not content-addressed).

What I did not do: run a browser (forbidden by BRIEF), run Chrome/WeasyPrint/veraPDF (Chrome headless exited with code 21 and produced no PDF in this environment; WeasyPrint, Playwright and veraPDF are not installed and installing was out of bounds), or verify any 1863 historical fact (owned by the time-facts specialist). Uncertainties are flagged inline and collected in section 9.

---

## 1. Method and evidence

| Step | Tool / script (all in `plan-work/tmp-docs-copy/`) | Output |
|---|---|---|
| Visible text of all 27 HTML files (text nodes, `title/alt/aria-label/placeholder`, selected `<meta>`), with source line | `extract_html.py` | `dump_*.html.txt`, `html_strings.json` |
| Inline `<script>` bodies (sub-page dynamic strings) | same, `script_*.js`; `scan_scripts.py` + `js_strings.py` | `script_strings.txt` (352 candidates) |
| Every string literal / template literal in the app region of the bundle (7,726 literals; 793 copy candidates after filtering CSS) | `extract_bundle.py` | `bundle_prose.txt`, `bundle_copy_candidates.txt` |
| Help and Bookmark chunks | `js_strings.py` | inline in section 5 |
| 18 regex rules across all surfaces + PDF text (pymupdf) + data-JSON rendered fields | `inventory.py` | `inventory.csv`, `inventory_summary.txt` |
| Titles/descriptions/H1/robots for every page | `seo_copy.py` | section 2.11 |
| Which data fields the UI renders verbatim | grep of `key_action`, `notes`, `event`, `fate`, `panel_summary`, `full_script` in bundle and sub-pages | section 2.12 |
| Data completeness / counts | inline python over `data/*.json` | sections 2.9, 5 |
| PDF measurement | `pdf_lint.py` (fill ratio, orphan heading, span contrast, fonts, links, metadata, tagging) | section 3.1 |
| Proposed replacements verified findable in the deployed bundle | `patch_table.py` | `copy_patch_table.json` |
| Titles/descriptions replacement lengths | inline script | `seo_replacements.json` |
| External verification | WebFetch of `nps.gov/gett/learn/photosmultimedia/virtualtour.htm` (official 16 auto-tour stop names) | section 3.2 |

Uncertainty conventions: **Verified** = read in code/data/measured; **Inferred** = follows from code but not observed running; **Unverified** = depends on a tool I could not run or a fact I could not check.

---

## 2. Inventory of leaking / unprofessional strings (task 1)

### 2.1 Headline numbers

Surfaces scanned: 27 HTML files, `site-nav.js`, `manifest.json`, `index-cg8famxn.js` (app region), `helpmodal-*.js`, `bookmarkpanel-*.js`, `user-guide.pdf`, and 71 JSON data files (fields rendered to users only).

| Rule | What it catches | Hits (HTML+JS+bundle+PDF) | Hits in rendered data fields |
|---|---|---|---|
| DEVLOG | development history / process voice | 4 | 0 |
| IDLEAK | internal IDs, variable names, `undefined` | 4 (+1 runtime card) | 14 |
| ABSENCE | "unrecorded / not recorded" phrasing | 4 | n/a |
| DASH | ASCII `--` used as a dash | 56 (HTML 36, scripts 18, bundle 1, manifest 1) | **1,639** (`key_action` 484, `notes` 858, `event` 94, `fate` 91, `title` 59, `full_script` 24, `panel_summary` 18, `description` 11) |
| ELLIPSIS | `...` instead of `…` | 7 | 2 |
| RANGE | `1-3` instead of `1–3` | 8 | n/a |
| TICKJARGON | developer word "tick" | 69 | 50 |
| REALTIME | "real time" claims | 10 | n/a |
| AIPERSONA | AI/assistant persona | 7 | n/a |
| TIMEFMT | `4:00pm`, `3:00pm`, `am (next day)` | 5 | 20 |
| ALLCAPS | shouting | 19 | 69 |
| APOSTROPHE | `Culps Hill`, `Devils Den`, `Barlows Knoll`, `Picketts Charge` | 4 (+1 in data: `Barlows Knoll`) | 1 |
| ABBREV | `KIA`, `WIA`, `Confed`, `Lt Col`, `Fwd 1hr` | 10 | 61 |
| NAMEDRIFT | product/feature name variants | 104 | n/a |
| EMOJI | emoji used as an icon inside a label | 17 | n/a |
| DEBUGUI | developer text visible in production | 7 (2 are on screen: the FPS counters; 5 are `console.log`/error strings) | n/a |
| WEVOICE | "we/our" from a one-person project | 9 | n/a |
| HEDGE | "genuine", "real, working", "a real" | 12 | n/a |

Also measured: **71** occurrences of "Animated Battlefield Map / Animated Map" across HTML/JS/JSON (vs one "interactive map" in `index.html`), and **21.6 KB of source comments** shipped to browsers (10.5 KB in `index.html` alone, 128 comment lines: 26 % of the 39.6 KB document) - finding docs-copy-28.

### 2.2 Rules (the vocabulary the remaining tables use)

| Rule | Why it matters | Preferred fix |
|---|---|---|
| R1 DEVLOG | Users are told about drafts, deployments, testing limits. Reads as an unfinished tool. | Say what the page does and what it does not do. Move history to the changelog and Known Issues. |
| R2 IDLEAK | `undefined`, `snake_case`, `U-84NY`, `US-017` are database words. | Resolve to a designation at build time; never print a key. |
| R3 ABSENCE | "Commander unrecorded" states a gap as a fact about the past. | Omit the field, or use the phrase library in section 6.9. |
| R4 DASH | `--` is a typewriter dash. | Spaced em dash ` — ` (site convention) for breaks, en dash `–` for ranges. Normalise in data at build time. |
| R5 ELLIPSIS | Three dots break screen-reader and typographic conventions. | `…` (U+2026). |
| R6 RANGE | `July 1-3` | `July 1–3`. |
| R7 TICK | "tick" is an implementation term; after the time model lands, five-minute steps are gone (`app-time §7.13`). | "moment" for a point in time, clock time for display, "frame N of 675" only in a tooltip. |
| R8 REALTIME | Playback is ~2 ticks/s = 10 simulated minutes/s, and the clock is non-uniform. | Never say real time for the map (true for Watch Together sync and Web Audio). |
| R9 AI | The Historian is keyword search over the site's records. | Never "AI", "assistant" or first person for it; say "answers come only from this site's records". |
| R10 TIMEFMT | Four clock formats in use. | `4:30 PM` everywhere; `about 4:30 PM` when approximate. |
| R11 CAPS | Screen readers spell some CAPS words; shouting on a battlefield topic. | Sentence case in source; CSS `text-transform` for eyebrows only. |
| R12 APOS | Same place, two spellings. | NPS spelling as authority (section 6.4). |
| R13 ABBREV | `KIA/WIA`, `Confed`, `Fwd 1hr`. | Spell out; rank abbreviations with periods. |
| R14 NAME | One thing, several names. | One canonical name per product/feature/term (section 2.8). |
| R15 EMOJI | Emoji render differently per OS, are read aloud as "globe showing Americas", and are not icons. | SVG icon set + accessible name. |
| R16 WE | There is no team. "We" and "of ours" invent one. | Neutral voice for UI/legal ("this site"); first person singular ("I") only on About, Corrections and FAQ where a person speaks. |
| R17 HEDGE | "genuine", "real, working implementation" apologise. | Delete the adjective. |

### 2.3 Category A - development history and process voice (R1, severity high)

| # | Location | Current text | Replacement copy | Rule |
|---|---|---|---|---|
| A1 | `viewshed.html:46` | "⚠ **This shows relative elevation, not a computed sightline.** A genuine viewshed analysis needs full terrain elevation data (a digital elevation raster) plus real obstruction modeling for hills, woods, buildings, and smoke -- this deployment doesn't have access to that. Earlier drafts of this tool tried a distance-to-horizon formula based on elevation alone, but that produced 30+ mile "visibility" circles ... So instead: below is each vantage point's real elevation, ranked against the other 29 mapped locations, so you can see genuine high-ground advantage without a fabricated distance claim." | **About this page.** "This page compares the height of 30 places on the field, ranked from highest to lowest. It is not a line-of-sight map. Trees, buildings, fences and gun smoke often decided what a soldier could see, and this page does not model them. Elevations are in feet above sea level." (no emoji; heading styled as a note, `role="note"`) | R1, R15, R17 |
| A2 | `ar.html:56` | "This needs a phone: its camera, GPS, and compass, all live, granted directly in your browser. Nothing is uploaded -- your camera feed and location never leave your device. This is a real, working implementation, but its on-the-ground accuracy can only be confirmed by testing it while actually standing at Gettysburg, which we haven't been able to do from here." | "Battlefield AR needs a phone with a camera, GPS, and compass, and works best outdoors on the field. Your camera view and location stay on your device; nothing is uploaded. Compass accuracy varies from phone to phone, so treat the markers as a guide to direction, not a survey." + a small **Beta** tag and a link "Report a marker that looks wrong" (prefilled, section 4.2). | R1, R16, R17 |
| A3 | `dashboard.html:261-263` (`footnote.innerHTML`) | "⚠ Data note: for U-I and C-CAV, this dashboard's casualty totals (derived from summing each corps' individual engagement periods) differ from the source file's separate summary total_casualties field. This chart uses the period-level sum ... the source data's summary field for these two corps should be reconciled against the underlying research." | **Preferred: delete the note by repairing the data** (verified: `casualty_apportionment.json` I Corps `total_casualties` 6,059 vs period sum 6,394 = +335, the July 3 Vermont Brigade period; Confederate cavalry 583 vs 483). **If a discrepancy must stay visible:** "Corps totals are the sum of each corps' engagement periods. For I Corps (6,394 against a published 6,059) and the Confederate cavalry (483 against 583), published tallies differ because sources count some July 3 actions differently. See Sources and Methods." | R1, R2 |
| A4 | `aftermath.html:44` | "Unlike the main animated map, this timeline is general narrative history, not built from the same tick-by-tick regimental placement data as the July 1-3 simulation -- it doesn't carry the same source-by-source precision. Treat it as an overview, not the same level of forensic detail as the battle itself." | "This timeline is an overview drawn from published histories. Unlike the battle map, it is not built from unit-by-unit records, so it is less detailed." (link: Sources and Methods) | R1, R4, R7 |
| A5 | `index.html:377` (onboarding banner) | "20 more tools live behind **Extra Features**, top right — search, an AI-style historian, live sound, AR, and more. Don't miss them." | "There is more to explore. Open **More to Explore** for search, the Ask the Historian research tool, live sound, augmented reality, and more." (No "top right": `index.html:521-606` (candidates at `:535`) moves the button to whichever corner is clear; no "Don't miss them".) | R9, R14 |
| A6 | `watch-together.html:64` | "... using a free public connection broker -- no account or server of ours involved. ... Because it depends on a third-party public broker rather than infrastructure we run, treat it as best-effort -- if it's ever down, **Export tour / Import tour** below is the reliable fallback ..." | "Live Sync connects two browsers directly (peer-to-peer over WebRTC) through a free public connection service. No account is needed and no server stores your session. Because the service is not run by this site, Live Sync can occasionally be unavailable. **Export tour** and **Import tour** always work." | R4, R16 |
| A7 | `watch-together.html:104` | "... via a free public broker with no sign-up -- nothing about your session is stored anywhere. As the host plays or jumps to a stop, everyone connected sees the same moment appear on their own map within about a second." | "Two browsers connect directly through a free public connection service. Nothing about your session is stored. When the host plays or jumps to a stop, everyone connected sees the same moment on their own map within about a second." | R4 |
| A8 | `watch-together.html:172` | `${s.note \|\| '(no note)'}` | "No note" (or render nothing) | R3 |
| A9 | `immersive.html:47` | "All audio here is synthesized in real time with the Web Audio API (no recorded sound files) so its intensity is directly tied to the real unit density at each tick -- more units in contact means more and louder cannon/musket cues." | "The sound is generated live in your browser, not played from recordings. It gets louder and denser as more units are engaged at the moment you are viewing." ("real time" is *true* here: keep the fact, drop "Web Audio API" and "tick".) | R4, R7 |
| A10 | `ground-remembers.html:43` | "Built from the same 694 recorded unit positions that drive the main map's playback (not the separate, more granular per-scene density files) -- so this shows where units were positioned most often across the battle, as a proxy for where the fighting concentrated." | "This map gathers every recorded unit position (694 in the main record) into one picture. Places that show up again and again are where units were positioned most often. That is a stand-in for where the fighting concentrated, not a count of casualties." (Do not print the number literally: `{{facts.placements}}`.) | R1, R4 |
| A11 | `regiment.html:102` | "This unit's individual movements aren't separately tracked in the placement data -- it's likely recorded at the brigade level instead of by regiment. Its order-of-battle record above is still complete." | "This regiment has no positions of its own in the record. On the map it moves with its brigade. Details above come from the order of battle." (drop "still complete": 222 of 467 records lack a casualty rate, section 2.9) | R1, R3 |
| A12 | `sandbox.html:54` | "... This is a local, in-memory copy only -- nothing is saved, uploaded, or written back to the real battle data. Reload the page to reset." | "Your changes stay in this browser tab. Nothing is saved or sent anywhere, and the real battle data is never touched. Reload the page to start over." | R4, R1 |
| A13 | `sandbox.html:195` (template) | "Changing disposition here is purely cosmetic in this simplified sandbox view." | "Changing a unit's disposition changes only how it is drawn here." | R1 |
| A14 | `search.html:163` | "Couldn't build the search index -- try reloading." | "The search couldn't start. Reload the page to try again." | R4 |
| A15 | `compare.html:58` | "Couldn't load placement data. This tool reads the same public /data/*.json files as the main app — try reloading." | "The battle data couldn't be loaded. Check your connection and reload the page." (never print file paths) | R1 |
| A16 | `dashboard.html:69` | "Couldn't load casualty data. This page reads `/data/casualty_apportionment.json` directly — try reloading." | "The casualty data couldn't be loaded. Check your connection and reload the page." | R1 |
| A17 | `index.html:620-628` (source comment, view-source only) | "Known, disclosed limitation: doesn't track the live map's real-time pan/zoom, so alignment is exact at the app's default view and can drift..." | Delete (comment). The behaviour is a bug (stars drift when panning), see finding docs-copy-28. | R1 |

### 2.4 Category B - internal identifiers, variable names, debug UI (R2, R7, severity high)

| # | Location | Current | Replacement | Rule |
|---|---|---|---|---|
| B1 | `dashboard.html:244-248` | builds cards from `notable_intensity_notes` with `num: n.unit \|\| key, lbl: key.replace(/_/g,' '), note: n.note`. `highest_single_regiment_rate` is `{union:{...}, confederate:{...}}` with no `unit`/`note`, so it renders **`highest_single_regiment_rate` / label "highest single regiment rate" / note `undefined`** (C7). The other three cards render lower-case raw keys as titles. | See table B1a below. | R2 |
| B2 | `data/oob/union_regiments_i_ii_corps.json` (regiment `U-14BK`) `designation` | "14th Brooklyn (alias for U-84NY)" (also surfaces in Search rows and the Historian). `key_action`: "Dual designation alias -- see U-84NY." | Remove the alias record (it is the 84th New York; keeping it makes "467" really 466). Designation of the real record: "84th New York Infantry (14th Brooklyn)". If the alias must stay for search: `designation: "14th Brooklyn"`, `see: "U-84NY"` rendered as "Also known as the 84th New York Infantry. See its record." | R2 |
| B3 | same file, `fate` on another record | "See U-11PA" | "See the 11th Pennsylvania record." (resolve the ID at build time) | R2 |
| B4 | `chronology_day1..3.json`: 17 of 137 events carry a `US-`/`CS-` reference (6 inside the rendered `event` text, the rest in `flag`); 10 more in placement/density `notes` | "Commander succession US-001 activates." / "Commander succession US-009." | These are engine annotations. Split the data model: `flag`/`engine_note` (never rendered, stripped from public JSON at build) vs `event`/`notes` (public). Add a build check: no string matching `\b(US\|CS)-\d{3}\b` in any rendered field. | R2 |
| B5 | `oob/union_cavalry_artillery.json` notes | "Separate detachment from U-2NY-CAV in Huey's brigade." | "Separate detachment of the 2nd New York Cavalry, in Huey's brigade." | R2 |
| B6 | `search.html:113`, `historian.html:87` (search corpus includes `${r.regiment_id}`) | IDs are searchable (a user can type `U-84NY`) but should not be displayed | keep as hidden search keywords, never render | R2 |
| B7 | `historian.html:93` | "`<b>${designation}</b> was a Union unit from Maine, part of U-V / U-3-1.`" (prints `parent_corps_id / parent_brigade_id`) | "The 20th Maine Infantry was a Union regiment from Maine, in Vincent's Brigade, Fifth Corps." (resolve names from the OOB brigade/corps files that the app already loads) | R2 |
| B8 | `bundle.pretty.js:97448` (HUD) and `:96687-96690` (canvas) | orange "`48 fps`" shown to every user whenever playback drops below 55 (HUD) or 45 (canvas) fps | Delete from production; keep behind `?debug=1` | R1 |
| B9 | `compare.html:164`, `search.html:144` | `console.log('Compare tool: loaded', ...)`, `console.log('Search index built:', ...)` | Remove; A+ requires a silent console. | R1 |
| B10 | `bundle.pretty.js:103266-103268` (mobile popup) | `Si.oob.designation \|\| Si.oob.name \|\| Si.unit_id` falls back to a raw ID | fall back to a resolved brigade name, then "Unnamed unit" | R2 |
| B11 | `bundle.pretty.js:97869`, `:97868-97894` default bookmark labels | "First shot -- Knoxlyn Ridge" | generate labels from the event registry: "First shot at Knoxlyn Ridge" (see docs-copy-04) | R4 |

**B1a. Dashboard highlight cards (replacement content, to be authored in `casualty_apportionment.json` as `display` fields so no code invents labels):**

| Key in data | Card title | Big value | Note |
|---|---|---|---|
| `most_compressed_union` | "Most compressed fight, Union" | "III Corps" | "Nearly 4,200 casualties in about two hours on the afternoon of July 2." |
| `most_compressed_confederate` | "Most intense half hour, Confederate" | "Pickett's Division" | "About 2,700 casualties in 30 minutes during Pickett's Charge." |
| `longest_sustained_action` | "Longest sustained fight" | "Culp's Hill" | "About seven hours of continuous fighting on the morning of July 3." |
| `highest_single_regiment_rate` | "Highest regimental loss rate" | two lines: "Union: 1st Minnesota, 85.5%" / "Confederate: 26th North Carolina, 69.7%" | "1st Minnesota: 224 of 262 men, mostly in about 15 minutes on July 2. 26th North Carolina: 588 of 843 men on July 1 and 3." |

(Numbers are the dataset's own; the 26th North Carolina conflicts with the tour-monument text at `bundle.pretty.js:100756`, see 2.9.)

### 2.5 Category C - absence phrased as a data gap (R3)

Standard phrase library (also section 6.9). Use **omission first**: do not render a field with no value.

| # | Location | Current | Replacement |
|---|---|---|---|
| C1 | `search.html:112` | `${state} · ${commander?.name \|\| 'Commander unrecorded'} · ${pct}% casualties` | Build the meta line from present parts only, joined by " · ": "Maine · Col. Joshua L. Chamberlain · 27.6% casualties". If commander is missing, drop the segment (27 of 467 records). |
| C2 | `find-ancestor.html:121` | `${r.state \|\| 'State unrecorded'} · ${parent_corps_id} / ${parent_brigade_id}` (prints raw IDs) | "Maine · Vincent's Brigade, Fifth Corps" |
| C3 | `regiment.html:199` | "State and formation not recorded" | "Origin and formation are not listed for this unit." |
| C4 | `regiment.html:204` | "No specific key action recorded for this unit." | "The sources do not single out one action for this unit. See its brigade for context." |
| C5 | `regiment.html:208` | "Not recorded in the order of battle." (commander) | "Commander not named in the order of battle." |
| C6 | Regimental Biography / Battle Reports stat tiles | `—` for the 222 units with no casualty rate | "Not reported" with `title`/tooltip "The sources give no total for this unit." |

### 2.6 Category D - overpromising names, AI persona, feature claims (R9, severity high, H8)

| # | Location | Current | Replacement | Note |
|---|---|---|---|---|
| D1 | `historian.html:47-48` | "Ask about a regiment, a commander, a place, or a moment of the battle." + "This runs entirely in your browser and answers only from this site's own published data -- 467 regimental records, 24 narrative vignettes, 137 chronology events, and 30 mapped terrain features. It is a search-and-synthesis tool, not a live AI model, so it can only tell you what's already in those records -- but everything it tells you traces back to a real row of data, shown as a source link below each answer." | "Ask about a regiment, a commander, a place, or a moment. Answers come only from this site's records: {{facts.regiments}} regiments and batteries, {{facts.stories}} stories, {{facts.events}} events, and {{facts.places}} places. This is a search of those records, not an AI, so it can only tell you what they contain. Each answer shows its source." | The "traces back ... shown as a source link" claim is **false for chronology results**: `historian.html:119-125` returns `srcHref: null, srcLabel: null`. Either link chronology entries to their moment on the map (needs deep links, app-bugs-05) or drop "each". |
| D2 | `historian.html:204` | "I'm ready. Ask me about a regiment, a commander, a place on the battlefield, or a specific moment." | "Ask about a regiment, a commander, a place, or a moment." (no persona, no "I") | R9 |
| D3 | `historian.html:186` | "I couldn't find anything specific about that in the regimental records, narrative vignettes, chronology, or terrain data. Try a regiment name (e.g. "1st Minnesota"), a place ("Devil's Den"), or a moment ("Pickett's Charge")." | "Nothing in the records matches “{query}”. Try a regiment (1st Minnesota), a place (Devil's Den), or a moment (Pickett's Charge)." | Also fixes straight quotes and vocabulary ("vignettes") |
| D4 | `historian.html:135`, `:95`, `:109`, `:123` | "sits at roughly 645 ft elevation"; "entered the battle at roughly 308 effectives"; "(McPherson Ridge, tick 12). {full_script}"; "Day 1, 6:00am — ..." | "Little Round Top stands about 645 ft above sea level."; "It went into the battle with about 308 men and lost 210 killed, wounded, or captured (68.2%)."; "{title} · {time} · {place}" (no "tick"); "Day 1, 6:00 AM — ..." Wording is generated by the answer templates; "effectives" is a period-military term unexplained to visitors. | R7, R10 |
| D5 | `site-nav.js:26`, `ug p5` | "A search-and-answer assistant built from the map’s own records." | "Ask a question and get answers, with sources, from this site's records." | R9 |
| D6 | `index.html:720`, `:755` | "ask a data-grounded historian assistant about a commander or a moment" / 'an "Ask the Historian" data-grounded assistant' | "ask the historian a question about a commander or a moment" / 'the "Ask the Historian" research tool' | R9 |
| D7 | `site-nav.js:16-56` (all descriptions) | see section 2.8 table | | |
| D8 | `viewshed.html` title/h1/`site-nav.js:19`/meta | "What They Could See" / "Real elevation, ranked by vantage point." / "Explore approximate sightlines from key battlefield vantage points, based on real elevation data." (meta contradicts the page: it *says* it is not a sightline) | **Rename "Vantage Points"**; nav desc: "Compare the height of 30 places on the field."; meta per 2.11. Keep the URL. | H8 |
| D9 | `report.html` title/h1/`site-nav.js:39`/meta | "Battle Reports": in Civil War scholarship "battle reports" are the officers' after-action reports in the Official Records, which this page is not. Meta says "any regiment **or moment**"; the page only does regiments (`report.html:51`). | **Rename "Regiment Fact Sheets"**; nav desc "Print a one-page fact sheet for any regiment." | H8 |
| D10 | `cinematic-export.html:8,11` | "export a narrated flyover video" (`:49` says "record a real, downloadable video of the camera flying across it"); there is no narration, only optional captions (`:75-76`) | "Record a video of the map flying across any stretch of the battle, with optional captions. It is made in your browser; nothing is uploaded." | overpromise |
| D11 | `site-nav.js:27`, `documentary.html` | "All 24 key moments, narrated, in order." (text only, no audio) | "All 24 key stories in order, each with its full account." | "narrated" implies audio |
| D12 | `turning-points.html:8` vs `:46` | meta: "The nine moments historians **agree** could have changed the outcome"; page: decisions historians "have actually **argued about**" | meta: "Nine decisions that shaped the battle, and the debates historians still have about each." | contradicts page |
| D13 | `turning-points.html:46` | "... argued about for over 160 years." | "... argued about since 1863." (date-proof; today it is 163) | R6-ish, staleness |
| D14 | `documentary.html:49` | "Each moment links to its exact spot in the live animated map." | Keep only after app-bugs-05 lands (today the link opens the default view). Until then: "Each story links to the map." (still false today: fix the link or drop the sentence.) | false claim |
| D15 | `site-nav.js:20`, `sandbox.html:8,11,17` | "Drag units and explore hypotheticals, just for fun." / "for fun and imagination, not historical prediction" | "Move units and ask “what if?” A thought experiment, not history." "For fun" trivialises a battle with ~46,000 casualties. | tone |
| D16 | `bundle.pretty.js:101981` | "Stand where history happened — Street View panoramas from the battlefield" | "Stand where history happened. Eight viewpoints open in Google Street View." (the tool hands off to Google Maps in a new tab, `:102034`) | H13 |
| D17 | `bundle.pretty.js:101215` | "⭐ Gold trail active — their path glows on the map" | ship only if the trail renders (app-bugs-02); then "Trail on: this regiment's path is drawn in gold." | claim vs behaviour |

### 2.7 Category E - "real time", "tick", clocks (R7, R8, R10)

| # | Location | Current | Replacement |
|---|---|---|---|
| E1 | `index.html:15,18,24,32`, `manifest.json:description` | "Watch the Battle of Gettysburg unfold in real time -- 467 regiments and batteries across 675 five-minute snapshots of July 1-3, 1863." | "Follow the Battle of Gettysburg on an interactive map: {{facts.regiments_and_batteries}} regiments and batteries across three days, with the stories, commanders, and casualties behind them." (today 570, or 569 once the alias row is removed; 158 chars) |
| E2 | `index.html:745` | "Watch the battle unfold in real time across 675 five-minute snapshots." | "Watch three days of battle, moment by moment." |
| E3 | `index.html:719,754` | "An interactive, minute-by-minute reconstruction of the Battle of Gettysburg (July 1–3, 1863): 467 regiments and batteries tracked across 675 five-minute snapshots, built from primary-source unit records, chronology, and terrain data." | "A moment-by-moment reconstruction of the Battle of Gettysburg, July 1–3, 1863. {{facts.regiments}} regiments and batteries from the order of battle, with positions reconstructed from the Official Records and modern battle studies." (`app-time §7.13` owns the final wording of "moment-by-moment"; "built from primary-source unit records" overstates: the data files cite Busey and Martin and the Pfanz trilogy, which are secondary.) |
| E4 | `bundle.pretty.js:97429` | "1x (real time)" | "1x" and a tooltip "About 10 minutes of battle per second" (final wording after the time model; `app-time §7.2`) |
| E5 | `bundle.pretty.js:111893` | "July 1–3, 1863 · 675 five-minute snapshots" | "July 1–3, 1863 · {{facts.moments}} moments" |
| E6 | `bundle.pretty.js:101528` | "Animated Battlefield Map · July 1–3, 1863" | "Interactive Map · July 1–3, 1863" |
| E7 | `bundle.pretty.js:112312-112336` | "Back 1hr (Shift+Left)" / "Prev tick (Left)" / "Play/Pause (Space)" / "Next tick (Right)" / "Fwd 1hr (Shift+Right)" | "Back 1 hour (Shift+←)" / "Previous moment (←)" / "Play or pause (Space)" / "Next moment (→)" / "Forward 1 hour (Shift+→)" |
| E8 | `bundle.pretty.js:112357` | "Tick 538/675" | "4:12 PM" (clock is primary); tooltip "Frame 538 of 675" |
| E9 | `helpmodal-cfv9t0zh.js:col132-403` | "Advance one tick (5 minutes)", "Go back one tick", "Advance one hour (12 ticks)", "Jump to July 1, dawn (tick 1)" | "Next moment", "Previous moment", "Forward about one hour", "Jump to July 1, dawn" |
| E10 | `compare.html:55` | "Set each map to a different tick and compare unit positions side by side — e.g. the Union line at 4:00pm vs. 6:00pm on Day 2. Units snap to the nearest recorded position at or before the tick you choose." | "Set each map to a different moment and compare where the units stood, side by side. For example, compare the Union line at 4:00 PM and 6:00 PM on July 2. Units show their last recorded position at or before the moment you choose." |
| E11 | `compare.html:128` | `${h12}:${mm}${hour>=24 ? 'am (next day)' : hour>=12 ? 'pm' : 'am'}` | one shared formatter: "4:30 PM", overnight as "12:30 AM (July 3)" |
| E12 | `sandbox.html:104-106` | "Day 2, mid-afternoon (tick 260) -- before Longstreet's assault" / "Day 3, ~3:00pm (tick 553) -- moments before Pickett's Charge reaches the wall" / "Day 1, mid-morning (tick 62) -- I Corps holding McPherson's Ridge" | generate from the event registry, e.g. "July 2, about 4:00 PM — Just before Longstreet's assault" (times and phrasing owned by `app-time §7.10`; `app-time` shows these three labels contradict the site's own chronology) |
| E13 | `cinematic-export.html:59-64,175,226,240` | "Start tick" / "End tick" / "${location} — tick ${startTick}" / "Done — 14 chunks recorded." | "Start moment" / "End moment" (with clock preview) / "${location} — 4:12 PM" / "Done. Your video is ready to download." |
| E14 | `watch-together.html:79,172,192` | placeholder "Tick (1-675)", "Tick 275" stop labels | "Moment (1–{{facts.moments}})" plus a clock preview; stop label "4:12 PM" |
| E15 | `regiment.html:218-219` | "Day 1 · ticks 12–58" / "tick 12" | "July 1, 6:00–7:15 AM" |
| E16 | `documentary.html:89`, `search.html:125`, `living-ledger.html:160`, `historian.html:109` | "Day 1 · Tick 12 · McPherson Ridge" / "…, tick 12:" | "Wednesday, July 1 · about 7:30 AM · McPherson Ridge" (`app-time §7.9`) |
| E17 | `living-ledger.html:64` | "July 1, 5:00 AM" hard-coded | formatter output (`app-time §7.10`) |
| E18 | data `placement_schema.json`, `chronology_*.json` `metadata.tick_formula` | "Tick 1 = 5:00am July 1. Each tick = 5 minutes." | internal; fine, but not rendered. Keep out of public JSON or mark `internal`. |
| E19 | data `event`/`description`/`fate` (20 hits) | "at approximately 7:30am", "approximately 1:00-3:00pm" | "at about 7:30 AM", "about 1:00–3:00 PM" (build-time normaliser, section 2.12) |
| E20 | `turning-points.html:64,89` | "roughly 4:00pm", "Around 1:00pm" | "about 4:00 PM", "about 1:00 PM" |

### 2.8 Category F - name drift: product and feature naming (R14)

**Product name.** Live forms (counts across HTML/JS/JSON): "Gettysburg Animated Battlefield Map" (page titles, footer, manifest, JSON-LD, Help About, splash), "Animated Map", "← Animated Map" (`bundle.pretty.js:110867`), "← Back to Animated Map" (`:111000`), "ANIMATED BATTLEFIELD MAP" (`:111889`); 71 occurrences in all. The domain, the PDF title ("GETTYSBURG INTERACTIVE MAP"), the PDF filename and the Netlify slug all say **Interactive Map**. **Decision (owner to confirm): "Gettysburg Interactive Map".** "Animated" survives only as an adjective ("an animated reconstruction"). This also matches how people search (E2/T1).

**Feature names (canonical set).** Each row is the single name to use in nav, H1, `<title>`, guide, Help, onboarding, and tool tiles.

| Feature | Names in use today (file:line) | Canonical name | Note |
|---|---|---|---|
| Sub-page: search | "Search Everything" (nav, H1), `<title>` "Search" (`search.html:7`) | **Search Everything** | |
| Map panel: search | "Search Units" (`bundle.pretty.js:98814`), "Search" (toolbar `:113147`), "Find Unit / Location" (`:113214`) | **Search Units** (S). Remove the duplicate button or make it a place search (app-bugs-23). | the two buttons open the same panel (`:113213-113218`) |
| Compare | "Compare Moments" (nav), "Compare Two Moments" (`compare.html` H1/title, index SEO block) | **Compare Moments** | |
| Camera | "Camera Modes" | **Camera Modes** | |
| Elevation page | "What They Could See" | **Vantage Points** | D8 |
| Sandbox | "What-If Sandbox" | **What-If Sandbox** | |
| Historian | "Ask the Historian", "AI-style historian", "a data-grounded historian assistant", "A search-and-answer assistant" | **Ask the Historian** (never AI/assistant) | |
| Documentary | "Documentary Mode" | **Documentary Mode** | |
| Turning Points | "Turning Points" | **Turning Points** | |
| Students | "For Students", "Gettysburg for Students" | **For Students** | |
| Aftermath | "Aftermath", "Aftermath: July 4 – November 1863" | **Aftermath** (H1 subtitle carries the dates) | |
| Regiment page | "Regimental Biography" | **Regimental Biography** | |
| Ancestor page | "Find Your Ancestor" (nav), "Find Your Ancestor's Regiment" (H1), "Find an Ancestor" (`index.html:733`) | **Find Your Ancestor** (H1 subtitle: "Which regiment did your ancestor serve in?") | |
| Ancestor map panel | "Follow Your Ancestor" (desktop), "Follow Ancestor" (mobile `:103433`), "⭐ Follow Your Ancestor" (`:101148`) | **Follow a Regiment** (the panel tracks a regiment, not a person) | keep "Find Your Ancestor" for the genealogy entry point |
| Dashboard | "Casualty Dashboard" (nav), "Casualty & Strength Dashboard" (H1, index SEO) | **Casualty Dashboard** (subtitle: "Strength and losses, corps by corps") | |
| Reports | "Battle Reports" | **Regiment Fact Sheets** | D9 |
| Immersive | "Immersive Mode" | **Immersive Mode** | |
| Ledger | "The Living Ledger" (nav/H1), "Living Ledger" (`index.html:737`) | **The Living Ledger** | |
| Heatmap page | "The Ground Remembers" | **The Ground Remembers** | not "Heatmap" (that H key is dead) |
| AR | "Battlefield AR" | **Battlefield AR** | |
| Sync | "Watch Together" | **Watch Together** | |
| Video | "Cinematic Export" | **Export a Video** | "Cinematic" oversells a 30 s webm |
| Menu button | "Extra Features" (map, `index.html:310`), "Explore" (sub-pages, `site-nav.js:169`), a group also called "Explore" (`site-nav.js:14`) | **More to Explore** (button on both); group names: Explore the Map, Learn the Story, Records and Research, Experience It, Share and Export | "Extra" undervalues the tools; the sub-page button and group share a name today |
| Walkthrough | "Virtual Walkthrough", "🗺 Virtual Walkthrough" (`:113137`), "A Virtual Experience" (`:110993`), "Auto Tour Stops" (`:111061`), "Tour Stops" (`:110882`) | **Virtual Walkthrough** with tabs "Auto Tour Stops" and "Monuments" | |
| Floating tour | "🎖 NPS Auto Tour" (`:100360`) | **Guided Battle Tour** (its 16 stops are battle moments, not the NPS-numbered stops; only stop 1 has a video, `:100079` vs `:100096-100320`) | see 3.2 |
| Street View | "Soldier's Eye View (Street View)" (desktop `:113177`), "Soldier's View" (mobile `:103426`), "🔭 Soldier's Eye View" (`:101976`) | **Soldier's Eye View** | |
| Overview map | "Mini Map" (mobile `:103475`), "Minimap" (guide, Help) | **Minimap** | |
| Layout | "Desktop View" (`:103482`), "Desktop", "Mobile" | **Desktop layout / Mobile layout** | |
| Guide link | "Download Website Tutorial PDF" (`:113132`), "User Guide (PDF)" (`site-nav.js:196`), "User Guide" (PDF title) | **User Guide (PDF)** | |
| Unit toggle | "Toggle Units" (`:113112`) | stateful: **Hide units / Show units** | |
| Stories | "vignettes" (Help, Historian), "key moments" (Documentary), "narrative moments" (`regiment.html:106`), "stories" (`education.html:52`) | **stories** (24); "events" for the 137 chronology entries; "moments" only for a point in time | glossary in 6.5 |

### 2.9 Category G - counts and claims that disagree with each other or with the data

| # | Claim | Where | Reality (verified) | Fix |
|---|---|---|---|---|
| G1 | "445+ Union and Confederate units" | `helpmodal-cfv9t0zh.js:col2258` | The order of battle has **467 regiment records** (8 files: 52+62+57+77+72+88+37+22; 410 infantry, 56 cavalry, 1 battery-like id) **plus 103 batteries** in `union_artillery.json` (50), `confederate_artillery.json` (45) and the two horse-artillery lists (5+3): **570 regiments and batteries** (`app-bugs-15` probe, re-verified by me). "445" is the first six infantry files only (stale). | `{{facts.regiments}}` / `{{facts.batteries}}` |
| G2 | "467 regiments and batteries tracked across 675 snapshots" | `index.html:15,18,24,32,719,754`, splash, manifest, guide p1 | **467 is regiments only**: the phrase "and batteries" is wrong for that number, and 570 would be right for the order of battle. 467 also includes one alias duplicate (`U-14BK` = `U-84NY`). Position coverage of the 467 (my computation: union of `unit_id`s in `placements_*.json` and `density_*.json` against OOB ids and `parent_brigade_id`): **217 have their own position records, 231 appear only through a parent brigade, 19 have none**. How the app draws the 231 is not verified. | "{{facts.regiments_and_batteries}} regiments and batteries in the order of battle"; Sources page states the position coverage; drop "tracked" |
| G3 | "Dedicated to the 51,000 casualties of July 1–3, 1863." | `helpmodal-cfv9t0zh.js:col3686`; vignette V-024 "approximately 51,000" | The site's own Casualty Dashboard/Living Ledger total **45,928** (Union 22,803, Confederate 23,125; Busey and Martin figures in `casualty_apportionment.json`). Both figures are defensible (51,000 is the commonly cited estimate including captured/missing); the site shows both without saying so. | State the basis once: "About 51,000 casualties by the commonly cited estimate; the tables on this site (Busey and Martin, 1994) total 45,928." Put in Sources, link from Help. |
| G4 | 26th North Carolina casualties | `bundle.pretty.js:100756` "Lost 714 of 800 men on July 1 — highest regimental casualties in the battle on either side"; `:97755` "588 total" | data (`casualty_apportionment.json` notable notes): "588 of 843 casualties across July 1 and 3" (69.7%). 714/800 would be 89 % and would beat the 1st Minnesota's 85.5 %, contradicting `:100734` ("Greatest loss percentage of any regiment") | one number from data; historian sign-off |
| G5 | Iverson's brigade prisoners | `bundle.pretty.js:100091` "Nearly 500 Confederates surrendered in the wheat field", `:100778` "232 surrendered in the wheat field" (20th NC), `:100800` "Captured 232 men and the 2nd MS flag" | Different scopes (brigade vs one regiment vs 6th Wisconsin's capture) but stated as the same event | say who and how many each time |
| G6 | "roughly 165,000 individual soldiers" | `find-ancestor.html:52` | data initial strengths sum to 162,974 (90,164 + 72,810) | "about 163,000" or derive |
| G7 | "the 24 narrative vignettes", "137 chronology events", "30 mapped terrain features", "512 monuments", "16 stops" | Help, Historian, guide | counts verified: 24, 137, 30, 512 (bundle array), 16. `data/monuments.json` holds only **9** entries (an orphan dataset; the bundle's own 512-entry array is the real one) | `{{facts.*}}` from one place |
| G8 | Completeness | `regiment.html:102` "order-of-battle record above is still complete" | 222 of 467 records lack `casualty_percentage`, 27 lack a commander, 37 have empty `days_engaged` | remove claim; show "Not reported" (C6) |
| G9 | Unit-rate/casualty definitions | dashboard, ledger, Help | "casualties" is never defined; dataset counts killed + wounded + captured/missing (Busey and Martin) | D-CASUALTY disclaimer (6.10) |
| G10 | Bibliography years | `helpmodal-cfv9t0zh.js:col3332` "Gottfried, The Maps of Gettysburg (2007)" vs `terrain.json` metadata "(Savas Beatie, 2013)" | they cannot both be right | resolve from the catalogue record (LOC/WorldCat) when building `sources.json` |
| G11 | "Search every regiment, battery, vignette, and battlefield location"; "Pick any regiment or battery"; "the 467 Union and Confederate regiments and batteries"; "467 regimental records" | `search.html:8`, `regiment.html:66`, `find-ancestor.html:48`, `historian.html:48` | Search, Regimental Biography, Battle Reports, Find Your Ancestor and the Historian all load the same eight *regiment* files (`script_search` OOB_FILES, `script_regiment`, `script_report`, `script_find-ancestor`, `historian.html:7-11`) and **never load `union_artillery.json` or `confederate_artillery.json`**, so none of the 103 batteries (Cushing's, Bigelow's, Hazlett's ...) can be found, although "Cushing's Battery" is a headline Notable Unit in the app's own search (`bundle.pretty.js:98734`) | either add the artillery files to the shared loader (preferred; feeds the Historian expansion) or change the copy to "regiment" everywhere |

### 2.10 Category H - typography (R4, R5, R6, R12, R11, R13)

Rules and the counts they clear:

| Rule | Find (regex) | Replace | Rendered-data hits | UI/HTML/bundle hits |
|---|---|---|---|---|
| Dash | `(?<=\S) -- (?=\S)` | ` — ` (spaced em dash, site convention) | 1,639 | 56 (incl. manifest) |
| Range | `\b(\d{1,2})-(\d{1,2})\b` after month names; `ticks? (\d+)-(\d+)` | en dash | (part of the above) | 8 |
| Ellipsis | `(?<=\w)\.\.\.(?!\.)` in UI strings | `…` | 2 | 7 |
| Clock | `\b(\d{1,2})(:(\d{2}))?\s?(am\|pm)\b` | `H:MM AM/PM` | 20 | 5 |
| Straight quotes/apostrophes in prose | `'` between letters; `"…"` around speech | `’`, `“…”` | 2,085 data strings contain a straight apostrophe | most HTML prose |
| ALL CAPS phrase | `\b[A-Z]{3,}\b( [A-Z]{2,}\b)+` | sentence case (emphasis via markup only where needed) | 69 (`REYNOLDS KILLED.`, `FIRST SHOT`, `THE CLIMACTIC SEQUENCE:`) | 19 |
| KIA / WIA | `\bKIA\b`, `\bWIA\b` | "killed" / "wounded" (fate lines: "Killed July 2") | 61 (fate 29, event 15, notes 13, description 3, key_action 1) | 10 |
| Missing apostrophe | `Culps Hill`, `Devils Den`, `Barlows Knoll`, `Picketts Charge` | with apostrophe | 1 | 4 (`bundle.pretty.js:112625,112640,112645,100767`) |

Sample rows (bundle): `:100213` "The Overnight Fight — July 2-3" → "July 2–3"; `:100309` "The Retreat — July 4-5, 1863" → "July 4–5, 1863"; `:98822` "Name, state, commander, or unit ID..." → "Name, state, or commander…"; `:101167` "Type regiment name (e.g. 20th Maine, 26th NC...)" → "Type a regiment (for example, 20th Maine)"; `:110931` "Search monuments..." → "Search monuments…"; `:99418-99420` "Regiment (~400)", "Brigade (~2000)", "Division (~6000)" → "Regiment (about 400)", "Brigade (about 2,000)", "Division (about 6,000)".

Implementation (finding docs-copy-06): do **not** normalise at render time (no runtime cost, and Search must match what users type). Normalise **once at build time** in a `tools/normalise_data.mjs` step that walks the rendered fields (list in 2.12) and writes public JSON; keep a lossless `data-src/` copy. Add the same regexes as Vale `substitution`/`existence` rules so hand-typed HTML cannot regress.

### 2.11 Category I - emoji-as-label and abbreviations (R13, R15)

| # | Location | Current | Replacement (label; icon from the SVG set in `icons.svg`/`site-nav.js`) |
|---|---|---|---|
| I1 | `bundle.pretty.js:113137` | "🗺 Virtual Walkthrough" | "Virtual Walkthrough" + `map` icon |
| I2 | `:100360` / `:100430` | "🎖 NPS Auto Tour", "📹 Hide Video / 📹 Show Video" | "Guided Battle Tour"; "Hide video / Show video" + `video` icon |
| I3 | `:101148`, `:101215`, `:101225` | "⭐ Follow Your Ancestor", "⭐ Gold trail active …", "🔗 Copy Shareable Link" | "Follow a Regiment"; "Trail on …"; "Copy link" |
| I4 | `:101976`, `:102041` | "🔭 Soldier's Eye View", "📍 Open Street View at this location →" | "Soldier's Eye View"; "Open in Google Street View" + external-link icon |
| I5 | `:102400`, `:102420` | "⬛ UNION", "⬛ CONFEDERATE" | "Union", "Confederate" (colour swatch as a separate element with text) |
| I6 | `:103259-103260` | "🔵 Union", "🔴 Confederate" (colour is the only difference) | "Union", "Confederate" with a shape marker; never colour-only |
| I7 | `:97741` | "⚠ Virtually destroyed — 78% casualties" | "Nearly destroyed: 78% casualties" (warning icon; the strong claim needs a threshold defined, `l >= 75`) |
| I8 | `immersive.html:54` | "🔊 Enable Sound & Start" | "Turn on sound and start" + speaker icon |
| I9 | `sandbox.html:50`, `viewshed.html:46` | "⚠ HYPOTHETICAL — NOT HISTORICAL. ..." (all caps) | "Hypothetical. Not history." then the sentence, in a banner with `role="status"` |
| I10 | toolbar labels `bundle.pretty.js:113143-113226` | glyph labels "S", "F", "☰", "L", "🗿", "🔭", "⭐", "📏", "🗺", "📍", "🔍", "B", "?" | replace glyphs with SVG icons; visible tooltips and `aria-label` from `features.json` (H6). **Coupling: `index.html:406-407` labels buttons by glyph text; `index.html:696` finds the Monuments button by its title** (2.13). |
| I11 | ranks `:102540-102545` | "Gen", "Col", "Lt Col" | "Gen.", "Col.", "Lt. Col." (periods; full titles in prose) |
| I12 | `:103344-103348` | "Confed", "Charging", "Artillery", "Retreat" (mobile legend chips) | "Confederate" (allow wrap), other chips stay; consistent with disposition names |
| I13 | `:98081-98082` | "· 210 KIA · 88 WIA" | "· 210 killed · 88 wounded" |
| I14 | `:99998-100002` toasts | "${name} KIA" / "wounded" / "captured" | "${name} killed" / "wounded" / "captured" |

### 2.12 Category J - voice and person (R16)

| # | Location | Current | Replacement |
|---|---|---|---|
| J1 | `privacy.html:26,30,31,34`, `terms.html:36` | "Information we collect", "We don't see anything from that embed ourselves.", "we never see it", "What we don't do", "We work to keep it accurate" | Neutral: "Information this site collects", "This site does not see anything from that embed.", "This never leaves your device.", "What this site does not do", "This site is kept as accurate and available as one person can manage; no guarantee is made of uninterrupted access." (terms need a lawyer-checked warranty line; the voice is the point) |
| J2 | `terms.html:33` | "The site's design, the animation engine, and the written vignette scripts are the creator's own work." | "The site's design, code and written stories are © Mike Legere." (a named person, consistent with the footer once fixed) |
| J3 | `site-nav.js:191` | "© 2026 Gettysburg Animated Battlefield Map" | "© 2026 Mike Legere" + licence line (owner decides licence; `terms.html:33` already asks for credit) |
| J4 | `bundle.pretty.js:101585`, `:112361` | "Created by: Mike Legere" / "Created by: Mike Legere · gettysburginteractivemap@gmail.com" | "Created by Mike Legere" and a **Contact** link (do not print the address in the chrome; scraper exposure) |
| J5 | `historian.html:186,204` | "I couldn't find...", "I'm ready. Ask me..." | removed (D2, D3) |
| J6 | About / Corrections / FAQ (new pages) | n/a | first person singular allowed here: "I built this map to ..." (owner supplies content) |

### 2.13 Category K - SEO/meta copy (titles, descriptions)

Current problems (`seo_copy.py`): 5 titles exceed 60 characters (aftermath 71, dashboard 67, find-ancestor 67, unit-rendering 62, education 61); 10 pages have an `og:description` different from `description`; 8 descriptions contain `--`; 4 descriptions contradict the page (viewshed, cinematic-export, turning-points, report); every title ends "— Gettysburg Animated Battlefield Map" (E2); the home title (35 chars) omits the search phrase; `og:image` has no `og:image:alt`. Proposed replacements (all titles ≤ 60, descriptions 79–159 chars, checked by script; `seo_replacements.json`):

| Page | `<title>` (length) | `<meta name="description">` |
|---|---|---|
| `/` | Gettysburg Interactive Map: The Battle, July 1–3, 1863 (54) | Follow the Battle of Gettysburg on an interactive map: 570 regiments and batteries across three days, with the stories, commanders, and casualties behind them. (number from `facts.json`) |
| search | Search Everything — Gettysburg Interactive Map (46) | Search the regiments, batteries, stories, and places of the Battle of Gettysburg by name, state or commander. |
| compare | Compare Moments — Gettysburg Interactive Map (44) | Set two maps to two different times and compare where every unit stood, side by side. |
| camera | Camera Modes — Gettysburg Interactive Map (41) | Let the camera follow the fighting, or lock on to one regiment and follow it through the battle. |
| viewshed | Vantage Points — Gettysburg Interactive Map (43) | Compare the height of 30 places on the Gettysburg field, ranked from highest to lowest. |
| sandbox | What-If Sandbox — Gettysburg Interactive Map (44) | Move units on the map and ask “what if?” A thought experiment, kept apart from the historical record. |
| historian | Ask the Historian — Gettysburg Interactive Map (46) | Ask about a regiment, commander, place, or moment. Answers come only from this site’s records, with sources shown. |
| documentary | Documentary Mode — Gettysburg Interactive Map (45) | Read the battle’s 24 key stories in order, each with its full account and a link to the moment on the map. |
| turning-points | Turning Points — Gettysburg Interactive Map (43) | Nine decisions that shaped the Battle of Gettysburg, and the debates historians still have about each. |
| education | Gettysburg for Students — Gettysburg Interactive Map (52) | A clear, classroom-friendly guide to the Battle of Gettysburg, told through the people who were there. |
| aftermath | Aftermath, July–November 1863 — Gettysburg Interactive Map (58) | What followed the battle: the retreat, the wounded, the town, and the dedication of the Soldiers’ National Cemetery. |
| regiment | Regimental Biography — Gettysburg Interactive Map (49) | Follow one regiment through three days: its commander, its losses, and every recorded position. |
| find-ancestor | Find Your Ancestor — Gettysburg Interactive Map (47) | Search by state or commander to find the regiment your ancestor may have served in at Gettysburg. |
| dashboard | Casualty Dashboard — Gettysburg Interactive Map (47) | Strength and losses for every corps across the three days, drawn from Busey and Martin’s tables and the Official Records. |
| report | Regiment Fact Sheets — Gettysburg Interactive Map (49) | Print a one-page fact sheet for any regiment: strength, losses, commander, and key action. |
| immersive | Immersive Mode — Gettysburg Interactive Map (43) | Hear the battle: a live soundscape of cannon and musketry that rises and falls with the fighting on the map. |
| living-ledger | The Living Ledger — Gettysburg Interactive Map (46) | A running count of the battle’s casualties, moment by moment across three days. |
| ground-remembers | The Ground Remembers — Gettysburg Interactive Map (49) | See where the fighting concentrated: every recorded unit position, gathered into one map. |
| ar | Battlefield AR — Gettysburg Interactive Map (43) | On the field with a phone? See the direction and distance of historic vantage points through your camera. |
| watch-together | Watch Together — Gettysburg Interactive Map (43) | Build a guided tour of the battle, share it as a file, or watch the same moment together in real time. |
| cinematic-export | Export a Video — Gettysburg Interactive Map (43) | Record a video of the map flying across any stretch of the battle. It is made in your browser; nothing is uploaded. |

Also: `og:image:alt` for `screenshots/day3.png` ("The Confederate advance across the open fields toward Cemetery Ridge on July 3, shown on the interactive map"); `manifest.json` `screenshots[].label` ("Day 1 -- July 1, 1863: ...") to en/em dash; add `lang` and `id` to the manifest; JSON-LD `name`/`description` from the same catalogue entry. (SEO specialist owns canonical/sitemap; this table is the copy.)

### 2.14 Category L - data-JSON fields rendered verbatim (build-time transform)

Fields the UI prints without transformation (verified by grep): unit panel `Key Action` (`key_action`, `bundle.pretty.js:98014-98022`) and `notes` (`:97611`, `:98025-98033`, `:103277-103278`), event card text (`event`, `:98642`, `:99907`), toasts (`fate`/succession `event`), story panel (`panel_summary`, `full_script`, `:98393-98396`), Regimental Biography/Battle Reports/Historian/Search (`key_action`, `fate`, `designation`, `significance`, `title`). Transform pipeline (Node, no dependencies, runs in the data build):

```js
// tools/normalise_data.mjs (sketch)
const RENDERED = new Set(['key_action','notes','event','description','panel_summary','full_script','title','significance','fate','designation','name']);
const rules = [
  [/(?<=\S) -- (?=\S)/g, ' \u2014 '],                                  // spaced em dash
  [/\b(\d{1,2}):(\d{2})\s?(am|pm)\b/gi, (m,h,mm,ap)=>`${h}:${mm} ${ap.toUpperCase()}`],
  [/\b(\d{1,2})\s?(am|pm)\b/gi,          (m,h,ap)=>`${h}:00 ${ap.toUpperCase()}`],
  [/\bKIA\b/g, 'killed'], [/\bWIA\b/g, 'wounded'], [/\bapprox(?:imately)?\.? /gi, 'about '],
  [/(\d)-(\d)(?=\s?(?:PM|AM|pm|am))/g, '$1\u2013$2'],
  [/\b([A-Z]{3,})( [A-Z]{2,})+\b/g, (s)=>sentenceCase(s)],           // shouting -> sentence case
  [/(?<=\w)'(?=s\b|t\b|re\b|ve\b|ll\b|d\b)/g, '\u2019'], [/(^|[\s(\[])"/g, '$1\u201C'], [/"/g, '\u201D'],
];
// fail the build if any rendered string still matches: US-\d{3}|CS-\d{3}|\bU-[A-Z0-9]+\b|\btick\b|--
```

Keep `flag`, `units_involved`, `tick_formula`, `metadata.*` out of the public JSON (they are engine data) - this also removes the `US-017` leaks and trims payload (P3 dependency).

### 2.15 Category M - shipped source comments

`comment_bytes.py`: 21,647 B of comments ship to browsers; `index.html` carries 128 comment lines (10,497 B) written as a development diary ("Every attempt at inferring this from polling the DOM's current state afterward broke in a different way, each confirmed live before moving on ..." `index.html:446-465`; "Workaround for ..." `:356-360`, `:399-403`; "Icons (fixes 404s)" `:9`; "Preload critical assets (FCP fix)" `:54`). None is visible on screen but view-source shows a project that reads as improvised, and it is 26 % of the home document (perf target: HTML ≤ 14 KB, `bundle-anatomy §0`). Fix: strip comments in the HTML build (`html-minifier-terser --remove-comments`, `terser --comments false`), keep the rationale in `docs/adr/` (finding docs-copy-28).

### 2.16 Copy-coupled scripts: what breaks if the copy changes (must be handled together)

| Script | Coupled to this text | Effect of a rename |
|---|---|---|
| `index.html:369-372` (onboarding banner injector) | `/choose your experience/i` | banner stops appearing (harmless) |
| `index.html:406-407` (`LABELS`) | button glyph text `S F L B ?` | toolbar loses `title`/`aria-label` from this workaround (H6 icon swap must ship the labels natively first) |
| `index.html:467` (`EXIT_BUTTONS`) | `select desktop\|select mobile\|skip introduction\|skip tour\|skip intro` | Extra Features overlay never revealed until the 10 s safety net (`:517`) |
| `index.html:696` (Monuments star overlay) | button `title`/`aria-label` **=== "Monuments"** | monuments overlay silently stops working |
| `index.html:521-606` (collision mover) | any DOM change | n/a (retire with H1) |

Rule: copy changes to those five strings ship **with** the H1 fix (fold the overlay into the toolbar and delete these scripts), or in the same commit as an updated regex. `copy_patch_table.json` marks the affected rows (`b04`, `b08`, `b09`, `b39`).

### 2.17 Machine-readable artifacts

| File (in `plan-work/tmp-docs-copy/`) | Content |
|---|---|
| `inventory.csv` | 356 rows: surface, `file:line`, rule, text (regex hits over HTML, scripts, bundle, Help, manifest, PDF) |
| `inventory_summary.txt` | counts by rule and surface, plus data-field aggregate with samples |
| `bundle_copy_candidates.txt` | 793 copy-like literals of the app region with line numbers |
| `copy_patch_table.json` | 64 find/replace rows for `index-*.js` and the Help chunk with `occurrences_in_minified` (substring collisions: `Confed` 162 (use quote-delimited match: 1), `Tick ` 6 (3 quoted), `NPS Auto Tour` 2 (1 quoted), `Follow Your Ancestor` 2 (1 quoted), `Created by: Mike Legere` 2 (both intended)) |
| `seo_replacements.json` | 21 title/description pairs with lengths |
| `pdf_lint.py`, `comment_bytes.py`, `seo_copy.py`, `extract_*.py`, `scan_scripts.py`, `patch_table.py`, `inventory.py` | reproducible scripts (Python 3.11 + pymupdf + pypdf; no network) |


---

## 3. User-guide PDF: fix plan (task 2; audit G1)

### 3.1 What the PDF is today (measured, `pdf_lint.py` on `deploy/user-guide.pdf`)

| Property | Measured value | Requirement it fails |
|---|---|---|
| Pages / size | 6 pages, Letter, 14,321 B, PDF 1.4, producer "ReportLab PDF Library - (opensource)" | fine |
| Body fill per page (body area between header and footer bands) | p1 97.7 %, **p2 16.9 %**, p3 99.8 %, **p4 5.0 %**, p5 93.3 %, **p6 40.5 %** | no page below ~55 % except the last of a section |
| Orphaned heading | p1 ends with the heading "TOOLBAR TOOLS" and no body (p2 starts with the content) | heading must keep-with-next |
| Contrast, group headers p5 ("Drive the map yourself", ...) | **1.25:1** (light grey text on `#c9a24b` gold), 8.7 pt italic | WCAG 1.4.3: 4.5:1 |
| Contrast, other | "Blue = Union" 4.46:1, "Red = Confederate" 4.64:1 on near-black; 6 of 243 spans under 4.5:1 | 4.5:1 |
| Type size | 7,366 of 7,765 characters (**95 %**) below 10 pt; smallest 8.0 pt; body 9.0-9.3 pt | body ≥ 10.5 pt, table text ≥ 9.5 pt |
| Fonts | Helvetica, Helvetica-Bold, Helvetica-Oblique, Symbol: **none embedded** | PDF/UA-1 §7.21.4 and PDF/A need embedded fonts |
| Links | **0** link annotations (URL, email and site name are plain text) | usability, 2.4.4 |
| Metadata | Title `(anonymous)`, Author `(anonymous)`, Subject `(unspecified)`, Keywords empty, Creator `(unspecified)`; created `D:20260907225548-04'00'` | title, author, subject, language set |
| Tagging | no `/Lang`, no `/MarkInfo`, no `/StructTreeRoot`, no `/ViewerPreferences /DisplayDocTitle` | PDF/UA-1, WCAG 1.3.1, 3.1.1, 2.4.2 |
| Outline / bookmarks | 0 entries | 2.4.5 for a multi-page document |
| Version / date on the document | none (footer: "Created by Mike Legere \| gettysburginteractivemap@gmail.com  Page N") | version + date + "Page N of M" |
| Page background | full-bleed near-black on every page (`#0a0a14`-like), gold header/footer bars | print cost; low-vision preference for light-on-dark should be a user choice, not the only option |
| Delivery | `netlify.toml:201-204` sends `Content-Disposition: attachment; filename="Gettysburg-Interactive-Map-User-Guide.pdf"` and the toolbar link has `download` (`bundle.pretty.js:113116`), so it can never be opened in the browser tab | screen-reader and phone users cannot read it in place |
| Reproducibility | no generator in the repo, the Downloads tree (`*.py` search, depth ≤ 3) or the reconstructed source. Prior guides in Downloads (`Gettysburg_Complete_User_Guide.pdf` 46 pp, `Gettysburg_Interactive_Map_User_Guide.pdf` 43 pp, Jun 19 2026; `deploy-6a3a...user-guide.pdf` 2 pp; `gettysburg-src/public/user-guide.pdf` 3 pp) show the guide was regenerated ad hoc five times with no committed script | N1 |

Probable cause of the blank pages (inferred, no source): p3 is a single unsplittable block (a `KeepTogether` or non-splittable table) that is almost exactly one page tall (99.8 %), so it could not start on p2 (83 % free) and jumped to p3, then overflowed by one paragraph onto p4. The orphan heading is a `Paragraph` style without `keepWithNext`. Both are classic Platypus pitfalls.

### 3.2 Content accuracy audit: guide, Help and tour vs. the live app

`write when` tags: **NOW** = true today, only reword; **AFTER** = true only once the named sibling fix lands; **REMOVE** = delete the claim; **FIX-COPY** = wrong today and the copy can be made right without code.

| # | Guide statement (page) | Reality (evidence) | Corrected text | Write when |
|---|---|---|---|---|
| 1 | "467 regiments and batteries, 675 five-minute snapshots of the entire engagement" (p1) | 467 is regiments only (570 with the 103 batteries); one alias duplicate; positions recorded directly for 217 regiments, via a brigade for 231, none for 19 (2.9 G1, G2); the time model will make the steps non-uniform (`app-time §7.13`) | "The order of battle lists {{facts.regiments}} regiments and {{facts.batteries}} batteries. Their positions are reconstructed for {{facts.moments}} moments across July 1–3, 1863." | AFTER app-time Phase 2 and app-bugs-35 |
| 2 | "First launch: A short walkthrough, then choose Desktop or Mobile layout. Switch anytime from the Tools menu." (p1) | Code order: `tO` splash → `dO` layout chooser (`bundle.pretty.js:113061`) with the tour `bO` gated by `gtbg_onboarded` (`:113066-113068`); the order the two overlays are seen was not observed by me. Switching exists **only** mobile→desktop (`:103482`); the desktop toolbar has no layout switch (`:113070-113226`); the choice is not stored (only `gtbg_onboarded` and bookmarks are, `:97842-97850`, `:113068`) | "The first time you open the map you can skip a short introduction, pick a Desktop or Mobile layout, and take a one-minute tour. The map remembers your layout." | AFTER app-bugs-11 |
| 3 | Key table: "Esc: Close any panel" (p1); Troubleshooting "Panel won't close: Press Escape" (p6); Help "Dismiss panel / deselect unit" | Root handler `bundle.pretty.js:113033-113046` clears selection, filter, search, ancestor, Soldier's Eye, roster, order-of-battle, bookmarks, help and walkthrough, **but** is skipped when focus is in any `INPUT` (`:112967`), and does not touch the story panel, event card, legend, layers, distance tool or tours (app-bugs-09, app-bugs-23) | until fixed: "Esc: Close the open panel (not while typing in a box)". After: "Esc: Close the top panel or dialog." | FIX-COPY now; AFTER app-bugs-09 |
| 4 | "H: Heatmap" (p1 table), "H -- Heatmap: Toggle the casualty heatmap overlay" (p3) | `showCasualtyHeatmap`/`toggleHeatmap` are destructured (`bundle.pretty.js:112930,112938`) and flipped by `H` (`:113022-113025`) but nothing reads the flag; no toolbar button exists; the reconstructed source notes it "real in the original build, but nothing ever consumed the flag" (`gettysburg-src/PENDING.md`) | **REMOVE** the row (and the Help row `helpmodal-cfv9t0zh.js:col887`, and the onboarding Quick Reference `bundle.pretty.js:111995`). Point to **The Ground Remembers** (a real accumulated-position heatmap) instead. | REMOVE now (unless app-bugs-24 option B is built) |
| 5 | "Speed settings: ¼× ½× 1× 2× 4× 8×" (p1) | on-screen buttons match (`bundle.pretty.js:112185`); the `+` key reaches **16×** (`:112998`: `Math.min(16, speed*2)`), the on-screen label is "1x (real time)" (`:97429`) | "Speed: ¼×, ½×, 1×, 2×, 4× and 8× (the `+` key can go one step higher)" until app-bugs-33 aligns them; drop "real time" | FIX-COPY |
| 6 | "Timeline scrubber: ... Colored dots mark key events (red = critical, gold = significant)" (p1) | 8 hand-picked dots with five colours (`#ff6600`, `#cc0000`, `#0044cc`, `#888800`, `#ff0000`), no gold (`bundle.pretty.js:112192-112201`); tick-17 dot labelled "First shot" is Calef's opening fire (`app-time §7.11`) | "Dots on the timeline mark key moments. Hover or tap one for its name." | FIX-COPY; AFTER app-bugs-36 for derived colours |
| 7 | "Day tabs: July 1 = ticks 1–225 · July 2 = ticks 226–450 · July 3 = ticks 451–675" (p1) | matches `jumpToDay` (1/226/451) but exposes "ticks" and will change with the time model | "Day tabs jump to dawn on July 1, 2 or 3." | FIX-COPY |
| 8 | "Unit dots: Blue = Union, Red = Confederate. Dot size scales with unit strength. Fill color shows disposition." (p1) | Units are drawn as **oriented rectangles** (line glyphs) whose **fill is the side colour** and whose length scales with strength; a **small dot above** carries the disposition colour; skirmishers are dashed lines; artillery/cavalry get outlined boxes (`bundle.pretty.js:96593-96650`, `lS`; also `app-bugs-23`) | "Each unit is drawn as a short line that points the way it faces. Blue is Union and red is Confederate. Longer lines are stronger units. The small dot above a unit shows what it is doing (see the table)." | NOW |
| 9 | Disposition table, 10 rows, colour names (p1) | The app has **11** dispositions: "Line of March" (grey) is missing; and colours disagree: the **map draws 8 of 11 in different colours from the legend and unit panel** (table 3.2a) | generate the table from `features.json` (section 3.4); include Line of March; one colour set | AFTER colour unification (docs-copy-16) |
| 10 | "S — Search ... Sort results by relevance or casualty percentage. Quick links to notable units" (p2) | matches `bundle.pretty.js:98831-98853` ("Sort:", "Notable Units": 20th Maine, 1st Minnesota, Iron Brigade, 26th NC, Cushing's Battery, Armistead, 15th Alabama) | keep | NOW |
| 11 | "F — Filter ... filter by unit type (Infantry / Cavalry / Artillery), disposition, or minimum strength" (p2) | unit-type filter is never applied (app-bugs-26, per that report's store audit; not independently re-verified here) | keep only if fixed; else drop "unit type" | AFTER app-bugs-26 |
| 12 | "Find Unit / Location: A dedicated quick-jump search separate from the Filter panel — type a unit or place name to fly straight there." (p2) | the 🔍 button calls `toggleSearchPanel()` (`bundle.pretty.js:113213-113218`): the same panel as **S**; units only | **REMOVE** the entry (or implement place search from `terrain.json`, app-bugs-23) | REMOVE now |
| 13 | "Toggle Units: Shows or hides all unit dots" (p3) | desktop toolbar only, no pressed state (`:113092-113113`); absent from the mobile Tools sheet | "Hide units / Show units (desktop toolbar)" | NOW |
| 14 | "L — Legend: Three tabs: Disposition / Sides / Size" (p3) | matches `:99435-99437`; but the Legend text says "Dot outline = side color, Dot fill = disposition color" (`:99519-99521`), the opposite of what is drawn (app-bugs-23) | keep the guide line; fix the Legend copy (docs-copy-10) | NOW (guide) |
| 15 | "M — Minimap: Toggle the overview minimap ... Click the minimap to navigate" (p3) | keyboard only on desktop (no button); mobile has "Mini Map" tile; minimap footer prints "72 units · tick 1" (`:99821`, H11) | "Minimap: press M (desktop) or choose Minimap in Tools (mobile)." | NOW |
| 16 | "B — Bookmarks: Save the current tick, unit selection, and map position. Share a permalink." (p3) | saves tick, unit, centre and zoom (`bookmarkpanel-*.js:col843-1087`, `RO` at `bundle.pretty.js:97853-97863`) ✓; the copied link is `?t=..&u=..&z=..&ll=..` which **nothing reads** (`:97823-97829` writer; only `ancestor` is read, `:101019`; app-bugs-05) | "Bookmarks: save the moment, selected unit and map view in this browser." Add "Copy link" only AFTER app-bugs-05. | FIX-COPY; AFTER app-bugs-05 |
| 17 | "Virtual Walkthrough: 16 NPS Auto Tour stops with historical narration, Google Street View, and NPS video links. Monuments tab: search all 512 battlefield monuments." (p3) and "Each stop includes: narration · embedded Google Street View · NPS video link" (p4) | 16 stops named exactly as NPS "Tour Stop #1 ... #16" (verified against nps.gov `virtualtour.htm`: 1 McPherson Ridge ... 16 National Cemetery) ✓; **15 of 16 stops have an NPS video (stop 16 has none, `bundle.pretty.js:104419-104440`)**; 14 of 16 have a fixed Street View panorama id (Oak Ridge and Virginia Memorial fall back to lat/lng, `:104143-104195`); 512 monuments ✓ (bundle array `:104539-110610`) | "Sixteen stops, numbered as in the National Park Service auto tour. Each has a short account and a Street View of the spot; 15 also link to an NPS video." Generate the counts. | NOW |
| 18 | "Order of Battle: Full hierarchical order of battle ..." (p3) | modal exists (`bundle.pretty.js:102384-102440`) but **no desktop control opens it** (state `Br`/`lo` is set only by mobile tiles `:103405`, `:113257` renders it) (D4, app-bugs-13); "hierarchical" is not verified: the modal shows two columns "⬛ UNION / ⬛ CONFEDERATE" with unit counts | keep only after the desktop toolbar gets the button; verify "hierarchy" in the browser first | AFTER app-bugs-13 |
| 19 | "Unit Roster: Flat list of all units on the field at the current tick" (p3) | ☰ opens it ✓; app-bugs-07 says it looks back 100 ticks | "Unit Roster: the units on the field at this moment." | AFTER app-bugs-07 |
| 20 | "Monuments: Toggle 512 monument dots on the map. Click any monument to jump to its tick... Active units glow gold." (p3) | 🗿 toggles the **20 story markers** (`mA`, `:100615-100835`) and an `index.html` star overlay of **9** monuments from `data/monuments.json` that does not follow pan/zoom (`index.html:620-628,696`); the 512 exist only as the Walkthrough's Monuments tab/list (app-bugs-23, -30) | "Story markers: places where something famous happened. The full list of 512 battlefield monuments is in the Virtual Walkthrough." | FIX-COPY; rename control to "Story markers" |
| 21 | "Soldier's Eye View: Google Street View panoramas from 8 key battlefield positions" (p3) | 8 sites ✓ (`bundle.pretty.js:101879-101951`); opens **Google Maps in a new tab** (`:102034`, `:102041`, `:102062`), not an embedded panorama (H13) | "Soldier's Eye View: eight viewpoints (Little Round Top, The Angle, ...) that open in Google Street View in a new tab." | NOW |
| 22 | "Follow Ancestor: ... Gold trail glows on the map. Share a permalink with ?ancestor= parameter." (p3) | trail unverified/likely absent (app-bugs-02); the link is read at `bundle.pretty.js:101019` but does not open the panel (app-bugs-05); the panel tracks a regiment, not a person | "Follow a Regiment: choose a regiment and see its recorded positions across the battle." (add trail/share only when they work) | AFTER app-bugs-02, -05 |
| 23 | "Distance Tool: Click point A ... then B. Displays feet, yards, meters, and estimated infantry march time. Click again to reset." (p3) | math correct (audit); one marker and no line (H12); strings `:112879-112916` | keep; add "The line and time appear after the second click" only when H12 is fixed | NOW |
| 24 | "NPS Auto Tour: 16 official NPS Auto Tour stops with narration, Google Street View, and NPS video -- embedded in the Virtual Walkthrough panel." (p3) and "🎖 NPS Auto Tour" button | the map's floating "NPS Auto Tour" (`bundle.pretty.js:100066-100320`, `XF` `:100323+`) is a **different 16-stop list of battle moments** (McPherson Ridge, Oak Ridge, Barlow's Knoll, Seminary Ridge, Little Round Top, Devil's Den, The Wheatfield, Peach Orchard, Cemetery Hill, Culp's Hill, Cemetery Ridge, The Angle, East Cavalry Field, Pickett's Charge, The High Water Mark, Confederate Avenue) with **one** video (stop 1, `:100079`); it has no Street View | rename it **Guided Battle Tour** ("sixteen moments, each with its story") and delete the guide's separate "NPS Auto Tour" entry (the official stops are the Walkthrough) | FIX-COPY (rename in bundle) |
| 25 | "The Extra Features Menu: Twenty additional tools, top right on the map" (p5) | 20 ✓ (5+5+4+4+2, `site-nav.js:12-58`); "top right" is not reliable (the collision mover moves it, and a persisted eye toggle hides it, `index.html:322-346,521-606`) | "More to Explore: twenty more tools in the menu on the map, grouped by what you want to do." | NOW |
| 26 | Group headers on p5 ("Drive the map yourself", ...) vs Troubleshooting p6 "grouped by Explore / Learn / Data & Records / Experience It / Share" | the app shows both a group **name** and its **tagline** (`site-nav.js:14-52`); the PDF prints only the taglines on p5 and the names on p6, so the two pages appear to disagree | print "Name — tagline" once, from the manifest | NOW |
| 27 | Tool descriptions (p5) | eight descriptions overpromise or are dev-worded (`site-nav.js:19,26,27,39,55`) | new descriptions in 3.3 table | NOW |
| 28 | "* Ask the Historian answers only from this site's own published data ... every answer traces back to a real record on the site." (p5) | chronology answers carry no source (`historian.html:119-125`) | see D1 (2.6) | NOW |
| 29 | Troubleshooting "PDF won't download: Right-click 'Download Website Tutorial PDF' and choose Save link as." (p6) | the link has `download` and the server sends `attachment` (`netlify.toml:201-204`), so a plain click downloads; the label is now "User Guide (PDF)" in the footer and "Download Website Tutorial PDF" on the map (`:113132`) | **REMOVE** the row; after 3.7 the guide opens in the tab | REMOVE |
| 30 | Troubleshooting "Slow on mobile: Use the Mobile layout (select at startup or from Tools menu)" | Tools menu switches only to Desktop | "Use the Mobile layout (offered on first launch)." | FIX-COPY |
| 31 | Troubleshooting "Street View shows black: ... disable aggressive ad blockers" | plausible; Street View is a Google embed with an API key (`bundle.pretty.js:110610-110661`); if the key is referrer-restricted incorrectly the embed also fails (X2, unknown from outside) | keep; add "or Google may be blocked on your network" | NOW |
| 32 | Footer "Created by Mike Legere \| gettysburginteractivemap@gmail.com  Page N" | no version/date/total; address unlinked (0 link annotations) | "Gettysburg Interactive Map · User Guide v{{version}} · {{month year}} · Page N of M" with a **linked** contact URL | NOW |

**3.2a. Disposition colours: three definitions of one legend (verified)**

| Disposition | Map dots `Lp` (`bundle.pretty.js:96306-96318`) | Legend `NF` (`:99385-99413`) and unit panel `fA` (`:98090-98105`) | Agree? |
|---|---|---|---|
| Line of Battle | `null` (falls back to side colour: blue or **red**) | `#4488ff` (blue) | **no** (Confederate lines are red on the map, blue in the legend) |
| Charging Line | `#ff4422` | `#ff4422` | yes |
| Skirmish Line | `#66aaff` | `#44aaff` | no |
| Chaotic Retreat | `#ff8800` | `#ff8800` | yes |
| Line of March | `#aaaaaa` | `#aaaaaa` | yes (missing from the PDF) |
| Reserve | `#226622` | `#668844` | no |
| Bivouac | `#555555` | `#888866` | no |
| Deployed Artillery | `#f5c518` | `#ffdd00` | no |
| Limbered Artillery | `#c8a84a` | `#ccaa00` | no |
| Mounted Cavalry | `#44aa44` | `#44cc88` | no |
| Dismounted Cavalry | `#88cc88` (lighter) | `#228855` (darker) | no (lightness inverted) |

Eight of eleven legend swatches do not match the colour actually drawn on the map. Whatever the palette decision (design specialist), the guide table, Legend, unit panel and map must read one colour table from `features.json` (finding docs-copy-16), and the guide must show swatch + name + a non-colour cue (pattern or letter), never colour alone.

### 3.3 New guide structure (v2, target 12-14 pages, Letter and A4 builds)

| § | Section | Content | Source of content |
|---|---|---|---|
| Cover | Cover page | Title, subtitle "User Guide", version, month/year, URL (linked), one-line description, licence line | `version`, `date` from build |
| 1 | Welcome | what the map shows; what it is not (a reconstruction); "About the clock" box (time is local mean time, approximate, plays as a time-lapse; `app-time §7.13`) | style guide disclaimers D-RECON, D-CLOCK |
| 2 | Start here | first launch, layouts, skip/tour, install as an app (PWA `manifest.json`), supported browsers | AFTER app-bugs-11 |
| 3 | Play the battle | playback controls (on-screen and keys), speeds, day tabs, timeline, jump 1 hour | `features.json` hotkeys (single source) |
| 4 | Read the map | unit glyphs, side/disposition/size, legend, labels, trails, minimap, layers, locations | dispositions table from manifest (with swatches) |
| 5 | Map tools | Search Units, Filter, Unit panel, Roster, Order of Battle, Story markers, Bookmarks, Distance, Layers | tools table (desktop and mobile columns) |
| 6 | Virtual Walkthrough | 16 NPS-numbered stops (table), Street View, videos, Monuments tab, Guided Battle Tour | facts + stop list from data |
| 7 | Follow a Regiment / Find Your Ancestor | how to find a regiment; what the site can and cannot tell you (regiments, not individuals; NPS Soldiers and Sailors link) | D-DATA-LIMIT |
| 8 | More to Explore (20 tools) | grouped table Name — tagline — what it does — best for | site-nav GROUPS (same file) |
| 9 | Ask the Historian | what it searches, what it cannot do, example questions, how to read sources | disclaimers D-HISTORIAN |
| 10 | On a phone or tablet | Mobile layout, transport bar, Tools sheet, gestures, landscape, AR, install | `features.json` mobile scope |
| 11 | Keyboard, screen reader, motion | full shortcut table; focus order; reduced-motion; contrast; text size; link to Accessibility statement | manifest + accessibility page |
| 12 | Sources, accuracy, corrections | summary and links to Sources and Methods and Corrections; how to cite | short |
| 13 | Troubleshooting | table (rows below) | curated |
| 14 | Glossary | disposition, brigade, division, corps, battery, order of battle, casualty, moment, story, event | `glossary.json` |
| Back | Back matter | Credits, licence, version history (last 5 entries), contact | `CHANGELOG.md` |

Corrected troubleshooting rows (replace p6):

| Problem | What to do |
|---|---|
| The map stays blank or keeps loading | The map needs WebGL. Use a current Chrome, Edge, Firefox, or Safari, turn off battery-saver mode, and reload (Ctrl+Shift+R, or Cmd+Shift+R on a Mac). |
| Satellite tiles are missing | Tiles come from Mapbox. Allow `api.mapbox.com` and `*.tiles.mapbox.com`, or pause tracker blockers or a filtering VPN. |
| Street View is black or blank | Street View loads from Google. Allow third-party content, or check that Google is not blocked on your network. |
| No units are visible | Choose Show units in the toolbar, then check that Filter has both sides and every unit type selected. |
| A panel will not close | Press Esc or use its Close button. If it still stays open, use Report a problem. |
| Playback is slow | Lower the speed, close other tabs, or use the Mobile layout. |
| Immersive Mode is silent | Browsers keep sound off until you press Turn on sound. Check the device volume and the silent switch. |
| Battlefield AR will not start | It needs camera, location, and motion permission and a phone outdoors. On iPhone, allow motion when asked. |
| Watch Together cannot connect | Both people must enter the same five-letter code. Some school and office networks block peer-to-peer connections; use Export tour and Import tour instead. |
| Export a Video does nothing | Use Chrome, Edge, or Firefox, keep the tab in front while it records, and expect a `.webm` file. |
| My bookmarks disappeared | Bookmarks are stored in this browser only. Clearing site data or switching browsers removes them. |
| I cannot find a tool | Open **More to Explore** on the map. Every tool is listed there in five groups. |

New card descriptions for the 20 tools (also the nav `desc` strings; the guide and menu read the same file):

| Group (name — tagline) | Tool | Description (≤ 75 chars) |
|---|---|---|
| Explore the Map — Drive the map yourself | Search Everything | Find any regiment, story or place by name. |
| | Compare Moments | Two maps side by side, at two different times. |
| | Camera Modes | Follow the fighting, or follow one regiment. |
| | Vantage Points | Compare the height of 30 places on the field. |
| | What-If Sandbox | Move units and ask “what if?” A thought experiment, not history. |
| Learn the Story — Get the story explained | Ask the Historian ★ | Ask a question. Answers come from this site’s records, with sources. |
| | Documentary Mode | All 24 key stories in order, each in full. |
| | Turning Points | Nine decisions historians still debate. |
| | For Students | A clear, classroom-friendly walkthrough. |
| | Aftermath | What happened after July 3. |
| Records and Research — Research a unit or ancestor | Regimental Biography | One regiment’s whole battle as a single story. |
| | Find Your Ancestor | Search regiments by state or commander. |
| | Casualty Dashboard | Strength and losses, corps by corps. |
| | Regiment Fact Sheets | A printable one-page summary of any regiment. |
| Experience It — Feel the scale of it | Immersive Mode | A live soundscape of cannon and musketry that follows the fighting. |
| | The Living Ledger | A running count of the battle’s casualties. |
| | The Ground Remembers | Where the fighting concentrated, across all three days. |
| | Battlefield AR | On the field with a phone? See historic vantage points through your camera. |
| Share and Export — Bring others along | Watch Together | Build a guided tour and share it, or watch live with someone. |
| | Export a Video | Record a video of the map across any stretch of the battle. |

### 3.4 Reproducible generation (the architecture)

**Principle:** the guide is *built*, not drawn. Inputs are text (Markdown/Jinja), a JSON manifest and the data files; outputs are (a) `guide.html`, a first-class accessible page on the site, and (b) `user-guide.pdf`, a print rendition of the same HTML. The guide can then never disagree with the app because both read `features.json`, and it can never contain a stale count because counts come from `facts.json`.

Repository layout (assuming the source repo from the provenance/bundle plans; if the bundle is patched in place, the same folder still lives in a separate `docs-tools` repo and only `dist/` is copied into the deploy folder):

```
content/
  manifest/features.json        # tools, hotkeys, dispositions(+colour), extras menu, disclaimers keys
  manifest/glossary.json        # term, definition, see-also
  manifest/sources.json         # bibliography built from data metadata + verified catalogue fields
  manifest/disclaimers.json     # D-RECON, D-CLOCK ... (single wording)
  guide/guide.html.j2           # page skeleton (semantic HTML5, lang="en-US", <main>, headings)
  guide/sections/*.md.j2        # one file per section; only prose, no numbers
  guide/guide.css               # screen + @media print + @page
  guide/fonts/                  # Spectral, Inter (OFL, with LICENSE files), subset at build
tools/
  build_facts.mjs               # counts computed from public/data/*.json  -> dist/facts.json
  build_guide.py                # renders HTML, then PDF, then post-process + lint
  check_parity.mjs              # manifest vs app registry vs built HTML/PDF text
  pdf_lint.py                   # gates (prototype: plan-work/tmp-docs-copy/pdf_lint.py)
  copy_lint.py                  # copy rules (prototype: inventory.py)
.vale.ini, styles/Gettysburg/*.yml
dist/user-guide.pdf, dist/guide.html, dist/facts.json
```

`facts.json` (computed, never hand-edited):

```json
{ "regiments": 467, "batteries": 103, "regiments_and_batteries": 570, "regiments_distinct": 466, "moments": 675, "stories": 24, "events": 137,
  "places": 30, "monuments": 512, "walkthrough_stops": 16, "guided_tour_stops": 16,
  "extras": 20, "turning_points": 9, "casualties_table_total": 45928,
  "casualties_union": 22803, "casualties_confederate": 23125,
  "regiments_with_own_positions": 217, "regiments_via_brigade": 231, "regiments_without_positions": 19,
  "data_version": "2026.10", "built": "2026-10-04" }
```

`features.json` excerpt (the shape; every row consumed by Help, guide, onboarding Quick Reference, tooltips):

```json
{
 "hotkeys": [
  {"id":"play","keys":["Space"],"label":"Play or pause","section":"Playback","scope":"all","exists":true},
  {"id":"next","keys":["ArrowRight"],"display":["→"],"label":"Next moment","section":"Playback"},
  {"id":"hour","keys":["Shift+ArrowRight"],"display":["Shift","→"],"label":"Forward about one hour","section":"Playback"},
  {"id":"day1","keys":["1"],"label":"Jump to dawn, July 1","section":"Playback"},
  {"id":"faster","keys":["+","="],"label":"Faster","section":"Speed"},
  {"id":"search","keys":["S"],"label":"Search units","section":"Interface"},
  {"id":"help","keys":["?"],"label":"Help","section":"Interface"},
  {"id":"esc","keys":["Escape"],"label":"Close the top panel","section":"Interface"}
 ],
 "dispositions": [
  {"id":"line_of_battle","label":"Line of Battle","gloss":"Holding a position in formation","short":"Holding","color":"#4488ff","cue":"solid"},
  {"id":"charging_line","label":"Charging Line","gloss":"Advancing to attack","short":"Charging","color":"#ff4422","cue":"solid"}
 ],
 "tools": [
  {"id":"search_units","label":"Search Units","key":"S","desktop":true,"mobile":true,"icon":"search","desc":"Find a unit by name, state or commander."}
 ],
 "extras": { "groups": [ {"name":"Explore the Map","tagline":"Drive the map yourself","items":[ {"id":"search","href":"/search.html","label":"Search Everything","icon":"search","desc":"..."} ]} ] }
}
```

The current `GROUPS` array in `site-nav.js:12-58` is already a single source for the menus on 27 pages and the map overlay (`window.GTBG_MENU`, `index.html:304`). Extend, do not replace: move it into `features.json`, emit `site-nav.js`'s constant at build, and the guide gets the same rows.

Engine choice (**decide by a half-day spike; none of the three could be run here**):

| Engine | Tagged / PDF/UA | Bookmarks / metadata | Fit | Risk |
|---|---|---|---|---|
| **WeasyPrint** (Python, HTML+CSS, no browser) | documented `pdf_variant='pdf/ua-1'` and tagged output in recent versions (verify the installed version's docs; feature landed in the 2025 releases per my recollection, unverified) | CSS `bookmark-level`/`bookmark-label`; `<meta name="author\|description\|keywords\|dcterms.created">`; `@page` margin boxes with `counter(page)`/`counter(pages)` | best default: deterministic, runs in a Linux CI job, same CSS as the web twin | needs Pango/Cairo libs on Windows (use CI, not the laptop) |
| **Chromium via Playwright** `page.pdf({ tagged: true, outline: true, preferCSSPageSize: true, format:'Letter', printBackground:true })` | tagged PDF with structure from HTML semantics and an outline from headings (Playwright option names per its docs, unverified here); not certified PDF/UA | title from `<title>`; author needs a post-process | fallback if WeasyPrint output fails PAC/veraPDF | headless Chrome exited with code 21 and no file in this sandbox; the owner's machine/CI may differ |
| **Typst** | PDF/UA-1 support in recent releases (unverified) | built-in | strong typography, fast | new toolchain; content would live in Typst, not HTML (loses the web twin) |
| **ReportLab (keep)** | OSS 5.0.1 exposes `lang=`, `setTitle/Author/Subject/Keywords`, `addOutlineEntry`, `setViewerPreference('DisplayDocTitle', ...)`; the catalogue class has `StructTreeRoot`/`MarkInfo` slots (`reportlab/pdfbase/pdfdoc.py:1030-1031`) but **no API that emits structure elements**; I found none | yes, except tags | keeps today's look | hand-building the tag tree (or a pikepdf post-pass) is XL and error-prone; not recommended |

Decision rule: pick the first engine whose output passes **veraPDF `--flavour ua1` with zero failed rules** and the Adobe/PAC 2024 reading-order check, with the fills/contrast/size gates of 3.8 green. Both HTML-first engines reuse the same source, so the spike is a config change, not a rewrite.

`build_guide.py` sketch:

```python
#!/usr/bin/env python3
import json, os, sys, pathlib, datetime, subprocess
from jinja2 import Environment, FileSystemLoader, StrictUndefined   # StrictUndefined: a missing fact fails the build
ROOT = pathlib.Path(__file__).resolve().parents[1]
facts    = json.loads((ROOT/'dist/facts.json').read_text('utf-8'))
manifest = json.loads((ROOT/'content/manifest/features.json').read_text('utf-8'))
version  = os.environ.get('SITE_VERSION') or subprocess.check_output(['git','describe','--tags','--always'],text=True).strip()
built    = datetime.datetime.fromtimestamp(int(os.environ.get('SOURCE_DATE_EPOCH', datetime.datetime.now().timestamp())))
env = Environment(loader=FileSystemLoader(ROOT/'content/guide'), undefined=StrictUndefined, autoescape=True)
html = env.get_template('guide.html.j2').render(facts=facts, m=manifest, version=version, built=built)
(ROOT/'dist/guide.html').write_text(html, 'utf-8')
from weasyprint import HTML                                         # spike: swap for Playwright if needed
HTML(string=html, base_url=str(ROOT/'content/guide')).write_pdf(
    ROOT/'dist/user-guide.pdf', pdf_variant='pdf/ua-1', uncompressed_pdf=False)
subprocess.check_call([sys.executable, str(ROOT/'tools/pdf_lint.py'), str(ROOT/'dist/user-guide.pdf'), '--strict'])
```

Reproducibility: fixed `SOURCE_DATE_EPOCH` (release date) so `CreationDate` and the file `/ID` are stable; fonts vendored (no network); the PDF is byte-identical on rebuild (assert in CI with a hash of the text layer if bytes vary by engine version).

Versioning: `Gettysburg-Interactive-Map-User-Guide.pdf` stays the stable URL (redirect) and each release also publishes `...-v2.0.pdf`; the PDF footer, `guide.html`, Help→About and `/changelog` all print the same `version`.

CI (`.github/workflows/docs.yml`, or a local `npm run docs`): `build_facts` → `check_parity` → `build_guide` → `pdf_lint --strict` → `veraPDF --flavour ua1` → `lychee` link check on `guide.html` → upload artifacts. A failing gate blocks release.

### 3.5 Layout and pagination spec (fixes each measured defect)

| Defect | Spec |
|---|---|
| Orphaned "TOOLBAR TOOLS" heading | `h1,h2,h3 { break-after: avoid; }` (CSS) / `keepWithNext=1` (Platypus). Every heading must be followed by at least two lines on the same page (widows/orphans 2). |
| p2 83 % blank, p4 one sentence | No unsplittable block taller than 60 % of a page. Tables: `thead { display: table-header-group }`, `tr { break-inside: avoid }`, allow row splitting between rows only. Sections flow continuously; no manual page breaks except before the cover's contents. If a block does not fit, split the block, not the page. |
| Group headers 1.25:1 | Group header = 12 pt bold, `#1a1a1a` on `#f3e7c4` (≈ 12.6:1) or white on `#6b4f0e`; contrast computed in CI for every text/background pair |
| 95 % of text under 10 pt | body 10.5-11 pt, table text 10 pt, captions/footer ≥ 9 pt, nothing under 9 pt |
| Dark full-bleed pages | default **print theme** (white paper, dark ink, gold rules). Optional `dark` CSS class for a screen edition (`?theme=dark` build variant); both pass the same contrast gates |
| Two-column key table that the text layer reads as interleaved rows | one table with columns *Key · Action · Also on mobile*; semantic `<th scope>`; no side-by-side column pairs |
| Symbols: "×", "−", "→" from the Symbol font | use real Unicode glyphs from the embedded text font (Spectral has ×, −, →) so the text layer, search and screen readers work |
| No links | every URL/email/section reference is a link (`<a>`) and tagged as `Link` with a destination |
| Footer | left "Gettysburg Interactive Map · User Guide v2.0 · October 2026", right "Page N of M" (`counter(page)` / `counter(pages)`); header band removed (decoration = artifact) |
| Contents | a one-page table of contents with internal links and page numbers on page 2 (only for ≥ 8 pages) |
| Paper | US Letter default, A4 build variant (`--paper a4`), 0.75 in margins |

If the owner keeps ReportLab for now, the same fixes are: `ParagraphStyle(keepWithNext=1)` for headings, `CondPageBreak(2.2*inch)` before each H2, `Table(splitByRow=1, repeatRows=1)`, no `KeepTogether` over more than a third of a page, `pdfmetrics.registerFont(TTFont(...))` to embed Spectral/Inter, `canvas.setTitle/setAuthor/setSubject/setKeywords`, `canvas.bookmarkPage` + `addOutlineEntry`, `Canvas(..., lang='en-US')`, `setViewerPreference('DisplayDocTitle', 'true')`, `Paragraph` links via `<a href>` (creates link annotations). That gets bookmarks, metadata, links, fonts and pagination; it does **not** get tags, which is why the HTML-first path is recommended.

### 3.6 Accessibility (tagged PDF, PDF/UA-1) and metadata

Required properties (checked by `pdf_lint --strict`, 3.8):

| Item | Value |
|---|---|
| `/Lang` | `en-US`; a `lang` attribute on any passage in another language |
| `/MarkInfo` | `<< /Marked true >>` |
| `/StructTreeRoot` | `Document > H1/H2/H3, P, L/LI/Lbl/LBody, Table/TR/TH(Scope)/TD, Figure(Alt), Link` in reading order; header/footer, rules and backgrounds as `Artifact` |
| `/ViewerPreferences` | `<< /DisplayDocTitle true >>` |
| Title | "Gettysburg Interactive Map: User Guide" |
| Author | "Mike Legere" |
| Subject | "How to use the Gettysburg Interactive Map: playback, the map, the tools, the Virtual Walkthrough and Ask the Historian." |
| Keywords | Gettysburg; Battle of Gettysburg; Civil War; interactive map; user guide; order of battle |
| Creator / Producer | "Gettysburg Interactive Map build 2026.10.0" / engine name and version |
| XMP | `dc:title`, `dc:creator`, `dc:description`, `dc:language`, `xmp:CreateDate`, `pdfuaid:part=1`; `dc:rights` = licence line |
| Outline | one bookmark per H1 and H2, expanded to H2; also a clickable table of contents |
| Fonts | all embedded and subset (Spectral for text and headings, Inter or Source Sans 3 for tables; both SIL OFL) |
| Figures | each screenshot has alt text (rule 6.11), or is marked as an artifact if decorative; the disposition swatches are `Figure`s with the disposition name as text, not colour-only |
| Tables | one header row `TH scope="col"`, simple structure, no merged cells, `caption` tagged |
| Colour | text ≥ 4.5:1, large text ≥ 3:1; nothing conveyed by colour alone |
| Reading order | single column; matches visual order (verified by the veraPDF/PAC tag tree and a `pymupdf` text-order comparison) |
| Alternative format | `guide.html` (same content, native semantics, printable) linked from the PDF's first page and from the site footer |

### 3.7 Delivery

1. Publish the HTML twin at `/guide` (canonical, indexable, in the sitemap); the PDF is its download, linked as "Download the guide (PDF, 12 pages, 340 KB)" with size and page count computed at build.
2. Serve the PDF **inline** (`Content-Disposition: inline; filename="Gettysburg-Interactive-Map-User-Guide.pdf"`, edit `netlify.toml:201-204`) and drop the `download` attribute (`bundle.pretty.js:113116`); a real download attribute belongs on a separate "Save a copy" link. Add `Content-Language: en-US`.
3. Remove the toolbar link "Download Website Tutorial PDF" (`:113132`); the Help panel and the footer link to the guide page.
4. Update the site footer's "User Guide (PDF)" label (`site-nav.js:196`) to "User Guide".

### 3.8 Gates and acceptance tests for the guide

`pdf_lint.py --strict` (prototype already measures the first eight; the rest are additions):

| Gate | Threshold |
|---|---|
| Body fill per page | ≥ 55 % except the last page and the page before a forced section break |
| Orphan heading | none (a heading is never the last block on a page) |
| Contrast | 0 spans below 4.5:1 (3:1 for ≥ 14 pt bold) |
| Minimum type | no span under 9 pt; ≥ 90 % of characters ≥ 10 pt |
| Fonts | 100 % embedded |
| Metadata | Title/Author/Subject/Keywords present and not `(anonymous)`, `(unspecified)`, empty |
| Structure | `/Lang`, `/MarkInfo/Marked true`, `/StructTreeRoot`, `DisplayDocTitle true`, outline count ≥ H1+H2 count |
| Links | every URL in the text layer has a link annotation; 0 broken (lychee) |
| Parity | every `hotkeys[*].exists:true` id has a handler in the app registry and vice versa; every tool in `features.json` is reachable from the toolbar or Tools sheet (scripted against the built app or the source registry); no heading/label in the guide text that is absent from the manifest |
| Banned strings | `copy_lint` passes on `guide.html` and the PDF text layer |
| veraPDF | `--flavour ua1`: 0 failed rules |
| Manual | NVDA + Acrobat reading-order check, Acrobat "Accessibility Check", PAC 2024: recorded in the release checklist |

Acceptance test for finding docs-copy-14/15: run the gates on the built PDF and record: 0 pages < 55 % fill (except last), 0 orphan headings, 0 contrast fails, fonts 100 % embedded, metadata complete, tags valid, outline ≥ 30 entries, page count 12-14, file size < 500 KB.

---

## 4. Missing pages and content for a professional site (task 3)

Evidence that none exist: `curl` on 2026-09-30 returned the branded 404 (HTTP 404, 2,203 B) for `/about.html`, `/sources.html`, `/faq.html`, `/accessibility.html`, `/corrections.html`, `/changelog.html`, `/press.html`, `/teachers.html`, `/contact.html`, `/humans.txt`, `/security.txt` and `/.well-known/security.txt`. The footer today (`site-nav.js:190-197`) offers only Privacy, Terms, Contact (a `mailto:`) and the PDF. Sitemap: 20 URLs, no policy pages (E5).

### 4.0 Common contract for every new page

| Item | Requirement |
|---|---|
| Shell | same `site-nav.js` shell (nav + footer), `<main id="main">`, one `<h1>`, skip link, `lang="en-US"` |
| URL scheme | follow whatever clean-URL decision the SEO specialist makes (T3); examples below use `/sources` style |
| Head | unique `<title>` (≤ 60), description (70-160), canonical, OG/Twitter, `og:image:alt`, JSON-LD (type per page) |
| Content source | every number from `facts.json`; every citation from `sources.json`; every disclaimer from `disclaimers.json` (no re-typing) |
| Voice | style guide section 6; "I" allowed on About/Corrections/FAQ, neutral elsewhere |
| Nav | new footer link groups: **Learn** (Sources and Methods, FAQ, For Teachers, Glossary), **About** (About, Press and Embed, Changelog), **Legal** (Privacy, Terms, Accessibility), **Help** (User Guide, Corrections, Contact) |
| Sitemap / robots | add all to `sitemap.xml` (with `lastmod` from the build); also add `privacy` and `terms` (E5) |
| Accessibility | passes axe with zero violations, keyboard-only walkthrough, contrast ≥ 4.5:1 |
| Print | print stylesheet (no nav/footer, URLs expanded) for Sources, FAQ, Teachers, Guide |
| Size | static HTML, no framework, ≤ 30 KB each without images (keeps the perf budget) |

### 4.1 Sources and Methods (`/sources`), effort L, severity high

Purpose: make the site's authority checkable. It replaces the nine-item list in Help→About and the sentence in Terms ("compiled from published historical sources") with one authoritative page. Everything below already exists in the repo and only needs assembly (except the clock text, which comes from the time specialist).

Outline:

1. **What this is (and is not).** Two short paragraphs: an interpretive reconstruction, not a survey; D-RECON wording.
2. **The data layers** (table: layer, what it contains (counts from `facts.json`), how it was made, main sources, known limits). Verified starting values: order of battle 467 regiments + 103 batteries + 93 brigades + 31 divisions + 11 corps (`app-bugs-15` probe); strength and casualties per regiment (222 of 467 regiments have no casualty rate, 27 no commander, 37 no days-engaged list; my count over `data/oob/*.json`); positions: 1,804 keyframe records (694 in `placements_*`, 1,110 in `density_*`) populating 188 of 675 moments (`app-bugs-15`), regiment coverage 217 direct / 231 via brigade / 19 none (my computation); chronology 137 events; stories 24; terrain 30 key locations with elevation in feet; monuments 512 in the Walkthrough plus 20 story markers; Walkthrough stops 16 (NPS-numbered) plus 16 Guided Battle Tour stops.
3. **How the clock works** (About the clock): local mean time, approximate to ±15-30 minutes where sources disagree, plays as a time-lapse (`app-time §7.13`, §6.7); link to the anchor table and its status column.
4. **How positions are estimated:** keyframes, interpolation between them (easing depends on disposition: `z4` at `bundle.pretty.js:96225-96240`), brigade-level positions for regiments without their own, uncertainty statement.
5. **How to read casualty numbers:** the D-CASUALTY definition; the two totals (about 51,000 commonly cited; 45,928 in the tables here, Union 22,803 and Confederate 23,125) and why they differ.
6. **Where sources disagree** (a register, one row per dispute: what, range, choice made, why). Seed rows that already have evidence in the repo: time of Rodes's assault (2:00-3:00 PM, `time-facts.md` R025), Howard learns of Reynolds's death (10:30-11:30 AM, R015), Barksdale's assault (5:30-6:30 PM, R069), 26th North Carolina losses (site text says 714 of 800, data says 588 of 843, 2.9 G4), casualty totals (G3).
7. **Bibliography.** Built from `sources.json` (union of the 29 `metadata.sources` strings, 26 distinct works, in the data files) and grouped: *Primary sources* (Official Records vol. 27; Dawes 1890; Oates 1905; Alexander, edited memoir 1989), *Reference and secondary works* (Busey and Martin 1994; the Pfanz trilogy; Gottfried; Hessler and Motts; Wert; Coddington; Sears; Moe; Desjardin; Wittenberg; Longacre; Hartwig; Laino), *Maps and imagery* (USGS, Desjardin battlefield map, Mapbox imagery, Google Street View, NPS videos). Each entry: author, title, publisher, year, and a catalogue link (WorldCat/LOC/Google Books) after verification. **Verify every entry** (two known conflicts: Gottfried *Maps of Gettysburg* 2007 in Help vs 2013 in `terrain.json`; Busey and Martin's edition year).
8. **Third-party data, licences and credits.** Mapbox (attribution must be visible: `app-bugs-34` reports it was removed on two maps, restore it), USGS (public domain), NPS media (check per asset), Google Street View and Maps (terms), HMDB and Stone Sentinels (the monument records cite them, `bundle.pretty.js:110533,110569`: confirm permission or re-source), Wikipedia (CC BY-SA attribution/share-alike if any text was adapted, `monuments.json` `_note`). Fonts and libraries (React, Mapbox GL, PeerJS) with licences.
9. **Data licence and re-use.** One decision for the owner: state the licence of the compiled data and stories (Terms currently asks for credit and forbids scraping-for-republication); suggested options: CC BY-NC 4.0 for prose, CC BY 4.0 for factual tables, or "all rights reserved, contact for permission".
10. **How to cite** (APA, MLA, Chicago, BibTeX). Example (APA 7): Legere, M. (2026). *Gettysburg Interactive Map* [Interactive map]. https://gettysburginteractivemap.com/. MLA 9: Legere, Mike. *Gettysburg Interactive Map*. 2026, gettysburginteractivemap.com. Chicago: Legere, Mike. "Gettysburg Interactive Map." Accessed Month Day, Year. https://gettysburginteractivemap.com/.
11. **Versions.** Site version, data version, last reviewed date; links to Corrections and Changelog.

Schema.org: `WebPage` + `Dataset` (name, description, creator, license, temporalCoverage `1863-07-01/1863-07-03`, spatialCoverage Gettysburg, distribution if a download is offered) + `Citation` for the bibliography (optional).

Acceptance: all counts equal `facts.json`; `sources.json` validates (author, title, publisher, year present; no duplicates; `cited_by` layers non-empty); Help→About links to it; a "Sources" link appears on every story, unit panel and sub-page footer; axe clean; in sitemap.

### 4.2 Corrections and Feedback (`/corrections`), effort M

Outline: (1) **A promise** in plain words (owner sets the numbers; suggested: acknowledge within 7 days, fix or explain within 30). (2) **What counts as an error:** a wrong fact, date, number, name, position, or a broken link/feature. (3) **How to report:** a "Report a problem" link (mailto with a prefilled subject and body carrying page URL, moment/time, unit id, site version and browser; no form, so nothing is collected and the Privacy page stays true); optional issue tracker if the repo becomes public. (4) **How disagreements are handled:** if sources disagree the page will show the range and cite both (links to the disagreement register in Sources). (5) **The corrections log**: reverse-chronological table (date, where, what was wrong, what changed, source) from `corrections.json`, also as an Atom feed. (6) **Credits** for readers whose reports led to a fix (with consent).

In-app entry points: Help→"Report a problem" (registry item), a small "Report an error in this record" link in the unit panel, story panel, event card and every sub-page footer, each prefilled with context (uses the deep-link contract, `app-time §8`).

Acceptance: link opens a message whose body contains the URL and version; `corrections.json` schema test; first log entries are the fixes from this plan (C3 +2 days, C4 clock, G4 26th NC figure, ...), each dated and sourced. Metric: trust, docs A.

### 4.3 About the creator (`/about`), effort S-M (owner-authored)

The site has a `Person` author in JSON-LD (`index.html:35`) and a name in the footer credit, but no page. I will not invent biography; the outline marks owner input as **[OWNER]**.

Outline: (1) **What this is and why** ([OWNER] 3-5 sentences in first person: what drew you to Gettysburg, what you wanted to make). (2) **How it was made**: sources first, then data, then animation; link to Sources. (3) **About me** ([OWNER] 80-120 words, relevant background, a photo with alt text optional). (4) **Credits and thanks** (authors, NPS, monument photographers and databases, testers). (5) **Independence**: "This is an independent project. It is not affiliated with or endorsed by the National Park Service, the Gettysburg Foundation, Mapbox or Google." (6) **Contact** (Contact page). (7) **Support** (optional: how to help, corrections).
Schema: `AboutPage` + `Person` (`sameAs` links the owner chooses). Acceptance: page in nav/footer; JSON-LD validates; no unverified claims.

### 4.4 FAQ (`/faq`), effort M

14 questions; drafts below are complete answers grounded in the repository (facts marked `{{ }}` come from `facts.json`). Owner edits tone, not facts.

| # | Question | Draft answer |
|---|---|---|
| 1 | Is it free? Do I need an account? | It is free. There are no accounts, ads or payments. |
| 2 | How accurate is it? | Unit positions and times are reconstructions from the Official Records and modern battle studies. Where sources disagree the map uses the best-supported version and the Sources page says so. (D-RECON) |
| 3 | Why are times approximate? | Sources record times loosely, and clocks in 1863 were not synchronised. The map uses local mean time and plays as a time-lapse, faster through quiet hours than through the fighting. (D-CLOCK; after the time model) |
| 4 | Why do some regiments move together? | For {{regiments_via_brigade}} of {{regiments}} regiments the sources place only the brigade, so those regiments move with it. |
| 5 | What do "casualties" mean? | Killed, wounded, and captured or missing, added together. (D-CASUALTY) |
| 6 | Can I find my ancestor? | This site has regiments, not individual soldiers. Find the regiment here, then search the National Park Service's Soldiers and Sailors System for the name. (link from `find-ancestor.html:52`) |
| 7 | Is Ask the Historian an AI? | No. It searches this site's own records and shows the source of each answer. (D-HISTORIAN) |
| 8 | What devices and browsers work? | A current Chrome, Edge, Firefox, or Safari with WebGL; phones and tablets use the Mobile layout. Battlefield AR needs a phone with a camera, GPS, and compass. (list the tested versions after QA) |
| 9 | Does it work offline? | Parts of the site are cached, but the satellite map needs an internet connection. (verify `sw.js` cache list first; unverified) |
| 10 | Why does the sound need a click? | Browsers keep sound off until you ask for it. |
| 11 | Can I use it in class, embed it, or cite it? | Yes for classroom and personal use; see For Teachers, the Press and Embed page, and How to cite in Sources. |
| 12 | What does the site collect? | No accounts and no advertising. Anonymous performance data via Netlify; map tiles come from Mapbox. See Privacy for the full list. |
| 13 | I found a mistake. | Please report it: Corrections. |
| 14 | Can I download the data? | (owner decision, section 4.1 item 9). |

FAQPage JSON-LD is optional (Google restricted FAQ rich results in 2023; keep the page for users, treat markup as low value). Acceptance: every answer that contains a number reads it from `facts.json`; page in sitemap; linked from Help and Guide.

### 4.5 Accessibility statement (`/accessibility`), effort M (write) + ongoing

Follow the W3C WAI accessibility-statement structure: commitment; conformance status; feedback; technical specifications; limitations; assessment approach; date.

Rules that keep it honest: (1) until the a11y plan's automated suite and a manual screen-reader audit pass, the status line is **"Partially conforms to WCAG 2.2 Level AA"** and the limitations list is explicit; (2) each limitation names the accessible alternative (for example: the map canvas is not navigable with a screen reader; the Chronicle/Data View and Documentary Mode give the same content as text, `app-a11y` plan); (3) the page is dated and reviewed each release; (4) contact and response time (suggest 5 business days).

Outline: Commitment · Standards (WCAG 2.2 AA, Section 508, EN 301 549) · Status by area (site pages, map, Walkthrough, sub-pages, PDF guide) · Known limitations (from the a11y specialist's report) · Keyboard shortcuts (link to manifest table) · Display and motion options (reduced motion, text size, contrast) · Assessment method (axe, Lighthouse, keyboard walkthrough, NVDA/VoiceOver, dates and versions) · Feedback and formal-complaint contact · Date of statement.

Acceptance: statement matches the latest audit; no "fully conforms" until evidence; link in footer, Help, Guide.

### 4.6 Changelog and version (`/changelog`, `version.json`), effort S

Format: Keep a Changelog headings (Added, Changed, Fixed, Data, Known issues), CalVer `YYYY.M.patch` (for example `2026.10.0`). `version.json` (`{"site":"2026.10.0","data":"2026.10","built":"..."}`, `Cache-Control: no-cache`) read by Help→About, the Guide footer and the footer's small "v2026.10.0". Atom feed `changelog.xml`. A **Known issues** section is where honest limitations belong (so they never appear in page copy again). Entries are user-facing sentences ("Fixed the date shown on July 3."), not commit messages. Seed the first entry from Phase 0 of this plan. Acceptance: version in footer equals `version.json`; changelog lists each user-visible fix in the release; feed validates.

### 4.7 Press and Embed kit (`/press`), effort M

Outline: About the project in 50 and 150 words · Key facts (from `facts.json`) · Screenshots (three to five, 1920x1080 and 1280x720, each with alt text, caption, credit, download link; current `screenshots/day1.png`, `day3.png` are 1280x720 and unnamed in copy) · Logo/wordmark and colours (gold `#c9a24b`, ink `#0a0a14`, fonts) with usage rules · **Embed generator**: choose a story (24) or a moment; sizes; a copyable snippet:

```html
<iframe src="https://gettysburginteractivemap.com/embed?story=V-018"
        width="640" height="400" title="Gettysburg Interactive Map: The Cannonade"
        loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen"></iframe>
```
· Attribution line ("Gettysburg Interactive Map by Mike Legere") · Re-use terms (editorial use with credit, owner decision) · How to cite · Press contact.

Dependency: X4 (embed must be frameable: today `embed.html` is served with both `X-Frame-Options: DENY` and `frame-ancestors *`, and the Terms already invite embedding); the embed page needs its own heading, `title`, a working "Explore the full map" link and a text alternative. Acceptance: the snippet works from a third-party origin in Chrome, Firefox and Safari; Terms text matches.

### 4.8 Teacher resources (`/teachers`), effort L

Audience: grades 6-12 and introductory college courses; the Privacy page already says "This site is often used in classrooms" (`privacy.html:41`).

Outline: (1) **Start here**: 10-minute orientation, what the site is and is not (a reconstruction, not a primary source). (2) **Three ready lessons** (each: time, objectives, steps, tools used, handout, assessment, differentiation): *Reading a battle from maps* (45 min: Compare Moments, Camera Modes, evidence vs. inference), *Decisions and what-ifs* (50 min: Turning Points and the Sandbox, the difference between history and counterfactual), *Casualties as data* (45 min: Casualty Dashboard, Living Ledger, defining "casualty", why totals differ). (3) **Context every lesson includes**: why the war was fought, slavery and emancipation, the civilians of Gettysburg, the Gettysburg Address (see docs-copy-27). (4) **Handouts** (printable, generated by the same PDF pipeline, tagged). (5) **Standards** as candidate alignments to verify against current documents: C3 Framework D2.His.14 and D2.His.16 (grades 9-12), CCSS.ELA-LITERACY.RH.6-8.7 and RH.9-10.7 (integrate visual information such as maps with text). (6) **Classroom logistics**: browsers, school-network domains to allow (`api.mapbox.com`, `*.tiles.mapbox.com`, `events.mapbox.com`, `www.google.com` for Street View, `www.nps.gov` for video, and for Watch Together `cdn.jsdelivr.net`, `0.peerjs.com`), audio, projector use, printing Fact Sheets, low-bandwidth tips. (7) **Privacy for schools**: no accounts, no personal data collected, no ads (`privacy.html:24,41`). (8) **Accessibility accommodations** (keyboard, text alternatives, reduced motion). (9) **Feedback for teachers** (Corrections page).

Acceptance: each lesson has objectives, materials, timing and an assessment; handouts pass the PDF gates; the lesson steps use only features that exist (parity test against `features.json`); teacher review before launch.

### 4.9 Small additions (all S)

| Page | Purpose and content |
|---|---|
| `/glossary` | Terms used in the UI (disposition, brigade, division, corps, battery, order of battle, casualty, story, event, moment) with definitions from `glossary.json`; every term in the app can link to it; improves search and comprehension |
| `/contact` | scope of mail (corrections, press, education, technical), response expectation, prefilled `mailto` templates; stop printing the address in app chrome (J4) |
| `/.well-known/security.txt` and `/humans.txt` | `Contact:`, `Expires:`, `Policy:` for security reports (cheap trust signal); credits |
| `/site-map` (HTML) | flat list of every page grouped as in the footer; helps assistive-tech users and crawlers |
| Repository docs (not public) | `README.md`, `docs/ARCHITECTURE.md`, `docs/DATA-DICTIONARY.md`, `docs/STYLEGUIDE.md`, `docs/RELEASE.md` (checklist), `docs/adr/*.md` (why decisions were made, replacing the comments stripped from HTML), `CHANGELOG.md` |

### 4.10 Privacy and Terms: copy that no longer matches the site (X5, X4)

| # | Location | Current | Problem (verified) | Replacement |
|---|---|---|---|---|
| P1 | `privacy.html:21` | "Last updated: September 7, 2026" | site changed after that date (deploy Sep 29); page is hand-dated | `Last updated: {{date}}` from the build, with a link to the changelog |
| P2 | `privacy.html:30` | "Where a page embeds a Street View panel (documentary and report pages), that iframe is served directly by Google ..." | **no sub-page embeds Street View** (grep: only `index.html` references Google Maps; the embed is in the Virtual Walkthrough inside the app: `bundle.pretty.js:110661`) | "The Virtual Walkthrough on the map embeds Google Street View. That frame is served directly by Google under Google's privacy policy. This site does not see anything from it." |
| P3 | (missing) | | Watch Together loads PeerJS from `cdn.jsdelivr.net` (`watch-together.html:19`) and connects to the public broker `0.peerjs.com`; WebRTC can expose IP addresses to the other person | "Watch Together (live sync): connecting to another person uses WebRTC through a free public connection service (PeerJS, `0.peerjs.com`). Your IP address is visible to the person you connect to and to that service. Nothing else is shared, and Export/Import tour involves no connection." |
| P4 | (missing) | | Mapbox telemetry (`events.mapbox.com` is preconnected, `index.html:42`, and allowed in the CSP) | "Mapbox may receive anonymous usage events about the map (Mapbox privacy policy)." (verify what the deployed GL JS v3 sends) |
| P5 | (missing) | | Battlefield AR asks for camera, location, and motion/orientation (`ar.html:60`) | "Battlefield AR asks your browser for camera, location, and motion access. Nothing is uploaded; the camera view and location stay on your device." |
| P6 | (missing) | | jsDelivr serves PeerJS to Watch Together visitors | list as a third party on that page |
| P7 | `privacy.html:31` | "Your saved bookmarks, whether you've seen the intro screen, and display preferences are stored in your browser's `localStorage`." | complete after the layout choice and the menu-hide toggle are stored (`gtbg-ef-hidden`, `index.html:322-346`; layout key after app-bugs-11); list the keys in a table | table: key, purpose, kept until cleared |
| P8 | `privacy.html:28` | "Real User Monitoring (Netlify)... It cannot identify you." | fine; also state that the host logs IP addresses per Netlify's policy | add a one-line sentence |
| T1 | `terms.html:27` | "embedding its widget on your own page" | `X-Frame-Options: DENY` blocks all embedding except the misconfigured `embed.html` (X4); no widget is documented anywhere | keep the invitation only after the Press and Embed page exists and X4 is fixed |
| T2 | `terms.html:36` | "We work to keep it accurate and available" | voice (J1) | neutral wording; legal review |
| T3 | (missing) | | not-affiliated, third-party terms (Mapbox, Google, NPS), citation/attribution requirement | add three short sections |
| T4 | `terms.html:21` | "Effective date: September 7, 2026" | same as P1 | build-generated |

---

## 5. In-app Help and About: copy audit (task 4)

### 5.1 Inventory and findings (Help chunk `helpmodal-cfv9t0zh.js`, one line; columns are byte offsets)

| # | Element (col) | Current | Finding | Replacement |
|---|---|---|---|---|
| 1 | Tab labels (col1473, col1665) | "Keyboard Shortcuts", "About" | no Touch or Help-with-a-problem content though ≈half of visits are phones (H3); no link out | tabs **Shortcuts · Touch · About and sources · Report a problem** |
| 2 | Section "Playback" rows (col89-403) | "Advance one tick (5 minutes)", "Go back one tick", "Advance one hour (12 ticks)", "Go back one hour", "Jump to July 1, dawn (tick 1)" ... | developer words; "12 ticks" = 1 hour is false after the time model | "Next moment", "Previous moment", "Forward about one hour", "Back about one hour", "Jump to dawn on July 1/2/3" |
| 3 | "Speed" rows (col447-540) | "Decrease speed" / "Increase speed" (keys `-`, `+ / =`), "Reset to 1x speed" | keys can reach 16x, on-screen stops at 8x (`bundle.pretty.js:112998`, `:112185`); "1x" is not real time | "Slower", "Faster", "Reset speed"; state the range once both agree |
| 4 | "Map" rows (col570-704) | "Scroll: Zoom in / out", "Drag: Pan the map", "Click unit: Select and pin unit details", **"Esc: Dismiss panel / deselect unit"** | Esc listed under Map; behaviour partial (3.2 #3) | move Esc to Interface: "Esc: Close the top panel or dialog" (after app-bugs-09) |
| 5 | "Interface" rows (col757-982) | F, S, B, **H "Toggle heatmap"**, L, M, "? Show / hide this help panel" | **H does nothing** (3.2 #4); no rows for R/O/Y... if the registry adds keys (app-bugs-13) | delete H; generate rows from `features.json` |
| 6 | About title/sub (col2098, col2177) | "Gettysburg Animated Battlefield Map / July 1–3, 1863" | product name (2.8) | "Gettysburg Interactive Map / July 1–3, 1863" |
| 7 | About p1 (col2258) | "This application animates the Battle of Gettysburg across 675 five-minute ticks, tracking 445+ Union and Confederate units from Buford's first contact on the morning of July 1 to the end of fighting on July 3." | "application", "ticks", "445+" (stale: 467 regiments + 103 batteries), "tracking" overstates position coverage (2.9 G2) | see 5.2 |
| 8 | About p2 (col2492) | "Each unit position is derived from primary sources — the Official Records ..., Harry Pfanz's three-volume Gettysburg trilogy, Bradley Gottfried's Maps of Gettysburg, and Busey and Martin's Regimental Strengths and Losses at Gettysburg." | "primary sources" then names three secondary works | "Positions are reconstructed from the Official Records (a primary source) and from modern battle studies such as Pfanz, Gottfried, and Busey and Martin." |
| 9 | About p3 (col2776) | "The 24 narrative vignettes are drawn from the same primary sources, supplemented by regimental histories, memoirs, and modern scholarship." | "vignettes", "primary" | "The 24 stories draw on the same sources, plus regimental histories, memoirs and modern scholarship." |
| 10 | "Primary Sources" list (col3006-3533) | 9 entries, headed "Primary Sources" | mislabelled (Pfanz 2001/1987/1993, Busey and Martin 1994, Gottfried 2007, Hessler and Motts 2015, Wert 2001 are secondary; OR and Alexander's edited memoir are primary); data cite **26 distinct works** (2.9, 4.1); Gottfried year conflicts with `terrain.json` | heading "Main sources", nine titles grouped Primary / Secondary, then "See all {{facts.sources}} sources →" linking to Sources and Methods |
| 11 | Dedication (col3686) | "Dedicated to the 51,000 casualties of July 1–3, 1863." | figure vs the dashboard's 45,928 (2.9 G3) | "In memory of the roughly 51,000 soldiers killed, wounded, captured or missing at Gettysburg, July 1–3, 1863." (see the basis note in Sources) |
| 12 | Close button (col1721) | "✕" | unlabeled glyph | `aria-label="Close"`, visible text or icon with label |
| 13 | Modal behaviour | appears 1-2 s after click (D1, app-bugs-20) | no loading state | preload chunk on idle |
| 14 | Missing | | version and build; links to Guide, Sources, Corrections, Accessibility, Contact, Changelog | About footer row: "Version {{site}} · Data {{data}} · Guide · Sources · Corrections · Accessibility · Contact" |
| 15 | Type size (styles col ~1400-6900) | body 12-13 px, source list 11 px `#888`, key labels 11 px | contrast and size (A1/A4) | a11y specialist owns; copy stays short so 14-16 px fits |

### 5.2 About: proposed replacement copy (tokens from `facts.json`)

> **Gettysburg Interactive Map**
> July 1–3, 1863
>
> This map follows the Battle of Gettysburg across {{moments}} moments, from Buford's cavalry on the morning of July 1 to the last shots of July 3. It shows the order of battle, {{regiments}} regiments and {{batteries}} batteries, with the stories, commanders, and casualties behind them.
>
> Every position is a reconstruction. It draws on the Official Records and on modern battle studies, and where sources disagree, the map uses the best-supported version and the Sources page says so. Times are approximate.
>
> The {{stories}} stories draw on the same sources, plus regimental histories, memoirs and modern scholarship.
>
> **Main sources**: (grouped list) · **See all {{sources}} sources**
>
> In memory of the roughly 51,000 soldiers killed, wounded, captured or missing at Gettysburg.
>
> Version {{site}} · Data {{data}} · [User Guide] · [Sources and Methods] · [Corrections] · [Accessibility] · [Report a problem]

### 5.3 Onboarding, layout chooser, panels: string-level audit (`bundle.pretty.js`)

| # | Location | Current | Replacement |
|---|---|---|---|
| O1 | `:102759` `:102762` | "Choose Your Experience" / "Select the format that best fits your device" | "Choose your layout" / "Pick the one that fits your screen." |
| O2 | `:102774-102815` | Desktop: "Full-featured experience with side panels, detailed controls, and complete battlefield data. Best for mouse and keyboard." / Mobile: "Touch-optimized layout with large controls, full-screen map, and swipe-friendly panels. Best for phones and tablets." / "Select Desktop →" / "Select Mobile →" / "You can switch at any time from the settings menu" | Desktop: "Side panels, detailed controls, and the full toolbar. Best with a mouse and keyboard." Mobile: "Large touch controls, a full-screen map, and a Tools sheet. Best for phones and small tablets." Buttons: "Use the Desktop layout", "Use the Mobile layout". Footer: "You can change this later in Help." (there is no "settings menu"; today only Tools → Desktop View exists) plus a "Recommended for your device" tag once auto-detect exists (app-bugs-11) |
| O3 | `:111802-111816` | "New to Gettysburg" / "Guide me through the battle with context and explanation." / "History Buff" / "I know the battle. Start at July 1 and let me explore." / "Power User" / "Show me the keyboard shortcuts and let me go." | keep the first two; third: **"Just the map"** / "Skip the guidance and start exploring." Hide the shortcuts framing on touch (H3). |
| O4 | `:111825`, `:111852-111853` | "Press Space or click Play to begin." / "Press 3 to jump to July 3 at any time. Press ? for all shortcuts." / "Search (press S) for “20th Maine”..." / "Scroll the map to zoom in on McPherson's Ridge." | device-aware: touch "Tap Play to begin." / "Pinch to zoom in." ; keyboard hints only on devices with a hardware keyboard |
| O5 | `:111851` | "Twelve thousand five hundred Confederates step off Seminary Ridge ..." | "About 12,500 Confederates step off Seminary Ridge ..." (numerals; "about" because the figure is an estimate) |
| O6 | `:111984-111996` Quick Reference | "Step tick", "Heatmap" | "Step forward"; delete Heatmap; generate from `features.json` |
| O7 | `:101148-101242` Follow Your Ancestor | "Track your ancestor's regiment through 3 days of battle" / "Type regiment name (e.g. 20th Maine, 26th NC...)" / "Complete 3-Day Journey — " + " recorded positions" / "Change Regiment" / "No placement data found for this unit" | "See where one regiment went across the three days" / "Type a regiment (for example, 20th Maine)" / "{{name}}: {{n}} recorded positions" / "Choose another regiment" / "This regiment has no recorded positions. It moves with its brigade." |
| O8 | `:98947` | "No units found for \"" + q + "\"" | "No units match “{{q}}”. Try a regiment, a state, or a commander." |
| O9 | `:101067`, `:101073` (toasts) | "Formation changed to ${disposition}" / "${n} casualties — ${m} men remain" | "Formation changed: Chaotic Retreat" / "{{n}} lost so far ({{m}} still in the ranks)" |
| O10 | `:97741` | "⚠ Virtually destroyed — 78% casualties" | "Nearly destroyed: 78% casualties" |
| O11 | `:97616` | "Originally: " | "Previous commander: " |
| O12 | `:98031`, `:98042`, `:98071`, `:98080` | "At Tick ", "Recent Positions", "Battle Casualties", "% total losses" | "At {{time}}", "Recent positions", "Losses", "% of the unit lost" (sentence case; "casualties" defined once) |


---

## 6. Content style guide (task 5): ready to commit as `docs/STYLEGUIDE.md`

Status: proposal. Decisions that are the owner's to confirm are marked **[OWNER]**. Every rule below is derived from a defect found in sections 2-5, with the evidence count where one exists.

### 6.1 Purpose

One voice, one vocabulary and one typographic system for everything a visitor reads: the map, the 27 pages, Help, the guide, meta tags, emails, error messages and alt text. It exists so that text written next year sounds like text written today, and so a linter (6.16) can enforce the mechanical parts.

### 6.2 Voice: museum-grade, warm, plain

Four traits, in priority order.

| Trait | Means | Does not mean |
|---|---|---|
| **Accurate** | Say only what the sources support; give the number, the basis and the range; say "about" for estimates. | Hedging every sentence, or "genuine/real/actual" as intensifiers. |
| **Respectful** | Treat the dead as people. Plain verbs (killed, wounded, captured). No sport or game metaphors for casualties. | Solemn or stiff. |
| **Warm and curious** | Address the reader as "you", invite exploration ("Follow one regiment through three days"), use vivid, specific detail from the record. | Chatty, jokey, exclamation marks, "Don't miss them". |
| **Plain** | Short sentences, concrete nouns, active voice, no developer or engine words. | Dumbing down: keep proper names and technical terms, define them once. |

Voice by surface:

| Surface | Register | Example |
|---|---|---|
| Map UI (labels, buttons, tooltips) | terse, neutral, verb-first | "Copy link", "Hide units", "Previous moment" |
| Stories and Documentary | narrative, vivid, sourced; **past tense for history**; present tense only in live toasts and the onboarding scenes | "At 4:30 PM the 20th Maine held the extreme left of the Union line." |
| Data pages (Regimental Biography, Fact Sheets, Dashboard) | precise, complete sentences for notes, numbers with their basis | "It went into the battle with about 308 men and lost 210 killed, wounded, or captured (68.2%)." |
| Sources, Corrections, Accessibility | plain, checkable, dated | "Corps totals are the sum of each corps' engagement periods." |
| Privacy, Terms | neutral, short, no legalese where avoidable | "This site does not set its own cookies." |
| Errors and empty states | calm, specific, next step included | "The casualty data couldn't be loaded. Check your connection and reload the page." |
| About, FAQ, Corrections | first person singular allowed ("I built this map to ...") | the only place a person speaks |

**Person.** There is no team, so no "we/our/us" (9 hits today, `privacy.html:26,30,31,34`, `terms.html:36`, `ar.html:56`, `watch-together.html:64`). UI and legal copy are neutral ("this site"); a person speaks only where the page is about the person. **Address.** "You" for the reader, never "the user". **Never** write about the project's own history in product copy (drafts, deployments, testing, "we haven't been able to", "this deployment"); that belongs in the changelog and Known Issues.

Ten before/after pairs (all real):

| Before | After |
|---|---|
| "Earlier drafts of this tool tried a distance-to-horizon formula ..." (`viewshed.html:46`) | "This page compares the height of 30 places on the field. It is not a line-of-sight map." |
| "which we haven't been able to do from here" (`ar.html:56`) | "Compass accuracy varies from phone to phone." |
| "an AI-style historian" (`index.html:377`) | "the Ask the Historian research tool" |
| "Commander unrecorded" (`search.html:112`) | (omit the field) |
| "14th Brooklyn (alias for U-84NY)" | "84th New York Infantry (14th Brooklyn)" |
| "Watch the battle unfold in real time across 675 five-minute snapshots." (`index.html:745`) | "Watch three days of battle, moment by moment." |
| "Skip intro ›" | "Skip intro" |
| "Fast-forwarding 3 days of battle..." | "Loading the battlefield…" |
| "Drag units and explore hypotheticals, just for fun." (`site-nav.js:20`) | "Move units and ask “what if?” A thought experiment, not history." |
| "REYNOLDS KILLED. Shot through the head by a sharpshooter" (chronology `event`) | "Reynolds is killed. He is shot through the head by a sharpshooter" |

### 6.3 Names: one name per thing

The canonical product, feature, panel and tool names are the table in **section 2.8**; that table is normative. Additional naming rules:

- **Product:** "Gettysburg Interactive Map" **[OWNER]**. Short form on second reference: "the map". Never "Animated Battlefield Map", "Animated Map" (71 occurrences to replace).
- **Menu:** "More to Explore" (button and heading); groups "Explore the Map", "Learn the Story", "Records and Research", "Experience It", "Share and Export"; each has a tagline (from `features.json`).
- **Every name is stored once** in `features.json` and rendered from it (nav, menu, H1, `<title>`, guide, Help, tiles). A page's H1 equals its nav label; a subtitle carries the longer description.
- **Page titles:** `{Page} — Gettysburg Interactive Map`, ≤ 60 characters; home `Gettysburg Interactive Map: The Battle, July 1–3, 1863`.
- **Files and URLs** keep the existing paths (SEO), only labels change.

### 6.4 People, places, units

- **Place-name authority:** the National Park Service names for tour stops, monuments and signs; then Pfanz. Observed variants (counts across data, pages and bundle): "McPherson's Ridge" 51 vs "McPherson Ridge" 11 (NPS: **McPherson Ridge**); "Herbst Woods" 52 vs "McPherson's Woods" 2 (**Herbst Woods**); "the Wheatfield" 40 / "The Wheatfield" 5 (**the Wheatfield**, capital only at the start of a heading); "Peach Orchard" 80 / "the Peach Orchard" 32 / "The Peach Orchard" 2 (**the Peach Orchard**); "The Angle" 144 / "the Angle" 2 (**the Angle**, "The Angle" as a heading or label); "High Water Mark" 19 / "High-Water Mark" 1 / "high-water mark" 3 (**High Water Mark** as a place, "high-water mark" only figuratively); "Culps Hill" 4 / "Devils Den" 1 / "Barlows Knoll" (the data has 1) are errors (use **Culp's Hill**, **Devil's Den**, **Barlow's Knoll**).
- **Pickett's Charge** is the common name; on first mention in a story add "(the Pickett-Pettigrew-Trimble assault)". Do not shorten to "the Charge".
- **Armies:** "the Army of the Potomac" (Union), "the Army of Northern Virginia" (Confederate). **Sides:** "Union" and "Confederate" (capitalised). "Federal" and "Rebel" only inside quotations.
- **Corps:** Union with Roman numerals ("I Corps"), Confederate with ordinals ("First Corps"). Data designations that spell the Union corps out ("First Brigade, First Division, First Corps", `union_oob_brigades.json`, `union_artillery.json`) are normalised for display ("I Corps").
- **Units:** ordinal plus state plus branch on first mention ("20th Maine Infantry", "1st Minnesota Infantry"), short form afterwards ("the 20th Maine"). Brigades: possessive commander form ("Vincent's Brigade") or a proper name ("Iron Brigade"). Batteries: "Cushing's Battery (Battery A, 4th U.S. Artillery)".
- **Ranks:** full title on first mention in prose ("Brigadier General John Buford"), then surname only. In space-limited UI use the abbreviations **with periods**: Gen., Lt. Gen., Maj. Gen., Brig. Gen., Col., Lt. Col., Maj., Capt., Lt., Sgt., Pvt. (today "Gen", "Col", "Lt Col", `bundle.pretty.js:102540-102545`).
- **Possessives of names ending in s** take 's: "Sickles's", "Reynolds's", "Hays's", "Rodes's", "Ricketts's". Today both forms are used about equally (Sickles's 16 / Sickles' 20; Reynolds's 7 / Reynolds' 8; Hays's 14 / Hays' 15; Ricketts' 9 / Ricketts's 5), so a build-time normaliser with a named list is required.
- **Commander names:** first mention "Col. Joshua L. Chamberlain", afterwards "Chamberlain". Use the form in the source order of battle; nicknames in parentheses only when they aid recognition.

### 6.5 Glossary of site terms (definitions the UI, guide and Sources page share)

| Term | Definition (public wording) | Notes |
|---|---|---|
| moment | a point in the battle you can view on the map | replaces "tick", "snapshot", "frame" in public copy; the internal step is shown only as "Frame N of 675" in a tooltip |
| story | one of the 24 written accounts of a key event | replaces "vignette" and "key moment" |
| event | one of the 137 entries in the chronology shown on event cards | |
| turning point | one of nine decisions historians still debate | |
| regiment / battery | an infantry or cavalry regiment / an artillery battery in the order of battle | "unit" only when the category does not matter |
| order of battle | the list of every unit on the field and how it is organised | |
| disposition | what a unit is doing: the eleven states in the Legend (Line of Battle, Charging Line, ...) | glosses come from `features.json` |
| casualties | men killed, wounded, and captured or missing, added together | D-CASUALTY |
| casualty rate | casualties as a percentage of the men who went into the battle | one decimal |
| reconstruction | a position or time worked out from sources, not recorded directly | D-RECON |
| time-lapse | the map's playback: faster through quiet hours, slower during the fighting | replaces "real time" |

### 6.6 Capitalisation

- **Sentence case** for buttons, labels, tooltips, headings inside pages and table headers: "Copy link", "Recent positions", "Choose your layout".
- **Title Case** only for proper names: the product, feature names (2.8), stories' titles, place and unit names.
- **Never type ALL CAPS in source.** Eyebrows and logos may be capitalised with CSS `text-transform` (screen readers then read the real words). Today: `REYNOLDS KILLED.`, `FIRST SHOT`, `THE CLIMACTIC SEQUENCE:` (69 phrases in data), `⚠ HYPOTHETICAL — NOT HISTORICAL` (`sandbox.html:50`), `⬛ UNION` (`bundle.pretty.js:102400`).
- Emphasis: use `<strong>` sparingly (one per screen); never bold a whole sentence.
- "Civil War", "Union", "Confederate", "Battle of Gettysburg", "July 1" capitalised; "the battle" lower-case when generic.

### 6.7 Punctuation and typography

| Element | Rule | Bad → good |
|---|---|---|
| Dashes | **spaced em dash** ` — ` for a break in a sentence (matches existing titles); **en dash** `–` for ranges, no spaces; never `--`; a **minus sign** `−` (U+2212) for negative values and the speed control | "July 2-3", "1x -- fast" → "July 2–3", "1× — fast" |
| Ellipsis | one character `…` only for truncation and "loading"; never `...` | "Loading battle data..." → "Loading the battlefield…" |
| Quotation marks | curly `“ ”` and `’` in rendered text; straight only in code and attributes; quote marks only for real quotations (6.13) | `"1st Minnesota"` → “1st Minnesota” |
| Apostrophes | `’` (U+2019) in prose; possessives per 6.4 | `Culps Hill` → Culp’s Hill |
| Serial comma | yes: lists of three or more take the comma before "and"/"or" ("killed, wounded, or captured"), as the site's own copy already does | "killed, wounded or captured" → "killed, wounded, or captured" |
| Colons | avoid in titles; use in `Label: value` pairs | |
| Ampersand | only in fixed names; otherwise "and" ("Data & Records" → "Records and Research") | |
| Arrows and glyphs | no `→ ← ↗ ›` inside link/button text; add via CSS `::after` with `aria-hidden` | "Next →" → "Next" + icon |
| Emoji | none in copy or labels (2.11) | |
| Contractions | fine in UI ("can't"), avoided in Sources and legal | |
| Exclamation marks | none | |
| Full stops | on complete sentences; none on buttons, labels, tooltips, placeholders, table cells | |
| Abbreviations | spell out; "e.g." and "i.e." become "for example" and "that is"; `KIA/WIA` never (6.10) | |
| Non-breaking space | between a number and its unit or "AM/PM": `4:30&nbsp;PM`, `612&nbsp;ft` | |
| `lang` | `<html lang="en-US">`; mark other languages inline | |

### 6.8 Numbers, units, dates, times

**Times (normative).** Format `H:MM AM/PM`, uppercase, with a space: **`4:30 PM`**. Never `4:30pm`, `4:30 p.m.`, `16:30`, `4 PM` in data-driven text (in narrative prose "about 4 PM" is allowed). Noon `12:00 PM`, midnight `12:00 AM`. Approximate: `about 4:30 PM` (never `~4:30`, `c.`, `approximately`). Ranges: `4:00–5:30 PM`; across noon `11:30 AM–1:00 PM`. Overnight after midnight: `12:30 AM, July 3`. The clock is local mean time, explained once in About the clock, not repeated as a zone label. Machine form: `1863-07-02T16:30` in `<time datetime>`.

**Dates (normative).** In labels and UI: **`July 2, 4:30 PM`** (month name, day without ordinal suffix, comma, time); year appended when the context is not obviously 1863: `July 2, 1863, 4:30 PM`. Long form: `Thursday, July 2, 1863` (1 July 1863 was a Wednesday, so 2 was a Thursday, 3 a Friday). Ranges: `July 1–3, 1863`; across months `July 4–November 1863` (no spaces around the dash); "Day 2" only as `Day 2 · July 2`. Never `2nd of July`, `7/2`, `July 2nd`.

**Numerals.** Digits for every count of people, guns, units, casualties and every figure of 10 or more; words for one to nine in running prose except with units, times, dates, percentages and unit names ("3 regiments" in a table cell is fine; "three regiments" in a sentence); never start a sentence with a numeral. Thousands separator always (`12,500`, `2,000`), never `2000`. Ranges `1,400–1,470`. "Twelve thousand five hundred Confederates" (`bundle.pretty.js:111851`) becomes "About 12,500 Confederates". Ordinals: `20th`, `1st`, `2nd`, `3rd`. Percentages: `85.5%` (digits, no space; one decimal for computed rates, integers for round estimates). Estimates: "about 12,500" in UI; "roughly" and "approximately" not used.

**Units.** US customary first, metric in parentheses where the tool shows both (Distance tool): `9,311 ft (2,838 m)`. Symbols with a space: `ft`, `yd`, `mi`, `mph`; elevation `645 ft above sea level`; area `26 acres`. Coordinates `39.8112° N, 77.2260° W` (four decimals, hemisphere letters, not signed decimals) in visible text.

**Counts come from `facts.json`.** No literal count in any file except the manifest of facts (2.9, docs-copy-08).

### 6.9 Missing-data phrase library

Use **omission first**: do not render a label whose value is absent. When the absence is itself informative, use exactly these strings (in `disclaimers.json`):

| ID | Text |
|---|---|
| M-NONE | "Not reported" (table cell), tooltip "The sources give no figure for this." |
| M-COMMANDER | "Commander not named in the order of battle." |
| M-STATE | "State not listed." |
| M-ACTION | "The sources do not single out one action for this unit. See its brigade for context." |
| M-POSITIONS | "This regiment has no positions of its own in the record, so it is shown with its brigade." |
| M-RESULTS | "No results for “{query}”. Try a regiment, a state, or a commander." |

Never: "unrecorded", "not recorded", "N/A", "unknown" (as a bare label), "undefined", `—` alone.

### 6.10 Casualties and standard disclaimers

**Casualty phrasing.**

- Terms: **killed, wounded, captured or missing.** "Casualties" means all of these added together, defined once per page (D-CASUALTY). "Losses" is a synonym only after the definition. Never write "KIA", "WIA", "MIA" (61 uses in data today), "fell" for a statistic, or "dead" to mean casualties.
- Always give the base with the figure: "210 of 308 men (68.2%)". Rates to one decimal, "about" when estimated, ranges when sources disagree.
- Unit sentence template: "{Unit} went into the battle with about {N} men and lost {C} killed, wounded, or captured ({P}%)."
- Officers: "killed", "mortally wounded (died July 4)", "wounded and captured".
- Tone: no "slaughter", "butchered", "carnage", "wiped out" or "bloodiest patch" except inside a quotation; superlatives ("the largest battle in North America", "the greatest bombardment in the Western Hemisphere", `bundle.pretty.js:100283`) need a source or a softer form ("one of the largest").
- Headline figures come from one table (2.9 G3, G4, G5): the dashboard total is 45,928; the commonly cited estimate is about 51,000; always say which and why.

**Standard disclaimers (`disclaimers.json`, exact wording, reused everywhere).**

| ID | Where | Wording |
|---|---|---|
| D-RECON | Sources, Help, guide, FAQ, home | "Positions are reconstructed from published sources. Where a regiment's exact place at a given time is not recorded, the map shows the best-supported position." |
| D-CLOCK | clock tooltip, Sources, guide | "Times are approximate. Sources disagree by 15 to 30 minutes, and the map plays as a time-lapse." |
| D-HYPO | Sandbox banner | "Hypothetical. Not history. Nothing you change here is saved or affects the real map." |
| D-DATA-LIMIT | Find Your Ancestor, FAQ | "This site lists regiments, not individual soldiers. To find a soldier by name, search the National Park Service's Soldiers and Sailors System." |
| D-AR | Battlefield AR | "Beta. Compass accuracy varies by phone, so treat the markers as a guide to direction, not a survey." |
| D-HISTORIAN | Ask the Historian, guide, FAQ | "Answers come only from this site's records, not from an AI. Each answer shows its source." |
| D-SV | Soldier's Eye View, Walkthrough | "Street View opens in Google Maps in a new tab and is provided by Google." |
| D-VIDEO | Walkthrough, tour | "Videos are provided by the National Park Service and play in a frame from nps.gov." |
| D-AFFIL | About, Press, footer of Sources | "This is an independent project. It is not affiliated with or endorsed by the National Park Service, the Gettysburg Foundation, Mapbox or Google." |
| D-CASUALTY | Dashboard, Ledger, Fact Sheets, FAQ | "Casualties are men killed, wounded, and captured or missing, added together." |
| D-DISAGREE | Sources register, unit notes | "Sources disagree here: {a} to {b}. This site uses {c}." |
| D-BRIGADE | Regimental Biography | "This regiment has no positions of its own in the record, so it is shown with its brigade." |
| D-VANTAGE | Vantage Points | "This page compares the height of 30 places on the field. It is not a line-of-sight map: trees, buildings, fences and gun smoke often decided what a soldier could see." |
| D-OVERVIEW | Aftermath | "This timeline is an overview drawn from published histories. Unlike the battle map, it is not built from unit-by-unit records." |
| D-EDU | For Teachers | "A reconstruction is a teaching aid, not a primary source. Ask students to check claims against the Sources page." |

### 6.11 Alt text and non-visual text

| Case | Rule | Template |
|---|---|---|
| Informative image | say what it shows and why it is there, in one or two sentences, ≤ 125 characters, no "image of" | "Little Round Top at 4:30 PM on July 2: Union lines on the hill, Confederate lines in the valley below." |
| Map screenshot | place, time, what is visible | "Interactive map of Cemetery Ridge at 3:10 PM on July 3, showing the Confederate advance reaching the Union line." |
| Chart | the takeaway plus a data table on the page | "Line chart of I Corps strength across July 1: it falls from 12,222 to about 6,000." + `<figure><figcaption>` + `<table>` |
| Decorative | `alt=""` (or CSS background); icons in a sprite `aria-hidden="true"` next to visible text | |
| Icon-only control | `aria-label` = the command ("Close", "Search units"), never "✕" or a glyph; label matches the visible tooltip | |
| Emoji | not used (2.11) | |
| Social image | `og:image:alt` set | "The Confederate advance across open fields toward Cemetery Ridge on July 3, shown on the interactive map." |
| PDF figure | `Figure` tag with `Alt`; decorative bars tagged as artifacts | |
| Audio (Immersive) | announce state changes in a polite live region, throttled: "Cannonade: heavy." No auto-play | |
| Video | captions and a text transcript; NPS videos: link to the transcript page if available | |
| Map canvas | region label, not per-dot noise | `aria-label="Battle map, July 2, 4:30 PM. 84 units shown. Press Tab for the unit list."` (a11y specialist owns the mechanism) |
| Live region text | full sentence, the same clock string as the visible label | "4:30 PM on Thursday, July 2, 1863." |

### 6.12 Microcopy patterns

| Pattern | Template |
|---|---|
| Loading | "Loading the battlefield…" first; "Loading {thing}…" elsewhere (`role="status"`); after 5 s add "This can take a moment on a slow connection." |
| Empty | M-RESULTS |
| Network error | "{Thing} couldn't be loaded. Check your connection and reload the page." + a **Reload** button. Never print a file path or "try reloading" alone. |
| Unsupported | "This needs WebGL, which your browser has turned off or does not support. Try a current Chrome, Edge, Firefox, or Safari." |
| Permission | "Camera access is off. Allow the camera in your browser's site settings, then choose Start again." |
| Success | "Link copied." / "Saved." (`role="status"`, auto-dismiss 4 s) |
| Destructive | "Remove this bookmark?" **Remove** / **Keep** |
| Buttons | verb first, sentence case: "Copy link", "Start exploring" |
| Links | descriptive ("Read the Sources page"), never "here"; external: visible icon plus "(opens in a new tab)" as visually hidden text |
| Tooltips | sentence case, no full stop, ≤ 5 words, same wording as `aria-label` |
| Placeholders | an example, never the label ("for example, 20th Maine"); every field has a visible label |
| Toasts | one line; auto-dismiss ≥ 5 s and pauseable; never stack more than three (H4) |

### 6.13 Quotations and attribution

1. Every quotation carries a source in the data (`cite: {author, work, page/date}`) and a **status**: *recorded* (written or reported at the time), *recalled* (a later memory) or *attributed* (tradition). Copy uses "wrote", "recalled" or "is said to have said" accordingly.
2. Quote marks are for exact words only; paraphrase without quotation marks. Curly quotes (6.7). Block-quote anything over 40 words.
3. An unverified quotation is not published. Known items to resolve before the guide and Historian ship: Alexander's two messages to Pickett (`chronology_day3.json` ticks 525 and 530; `time-facts.md` marks both UNVERIFIED-QUOTE, and gives the real first note as "If you are coming at all, come at once ..."), Lincoln's "We had them within our grasp" (`bundle.pretty.js:100315`, "Lincoln wrote": confirm the source and whether it was written or spoken), and the note attributed to Avery ("His last note, written in blood: It was my fault.", `bundle.pretty.js:100811`; the phrase reads like Lee's "It is all my fault", time-facts R118; verify against Pfanz, *Culp's Hill and Cemetery Hill*, before keeping it). These three are flagged for the historian, not corrected here.
4. Validator: a story or event whose text contains a pair of quotation marks but no `cite` fails the data build.

### 6.14 Inclusive and historically responsible language

- **Context is content.** A history of a battle in 1863 must say what the war was about. The site currently contains no mention of slavery, enslaved people, emancipation, free Black residents of Gettysburg or civilians (0 hits in HTML, JS and data, verified by grep); see docs-copy-27 for the content plan. Use "enslaved people" (not "slaves") except in quotations; capitalise "Black".
- "Civil War" is the default name; "War Between the States", "War of Northern Aggression" and similar appear only as historical names inside quotations or explained terms. "Rebel" and "Yankee" only in quotations.
- Use the monument's own text when naming monuments ("High Water Mark of the Rebellion Monument", `bundle.pretty.js:110513`), and explain the phrase once in the glossary.
- Do not imply moral equivalence or valorise causes; describe what units did and what happened to them. Do not use the language of sport or spectacle ("epic", "thrilling", "just for fun").
- People are people: give full names and roles, note ages when known (Custer was 23), and treat civilians (Jennie Wade, the town's residents) as part of the story.
- Accessibility language: "screen reader users", "people who use a keyboard"; not "the disabled".

### 6.15 Reading level and length

UI text: grade 8 or lower (Flesch-Kincaid), sentences ≤ 20 words, paragraphs ≤ 4 sentences. For Students: grade 6-7. Stories and Sources may be grade 10-12. Card descriptions ≤ 75 characters; H1 ≤ 60; meta description 70-160; buttons ≤ 3 words. Measure with Vale's readability rules or `textstat` in the copy lint.

### 6.16 Enforcement

1. **String catalogue.** All UI strings live in `src/copy/en-US.json` (keys, ICU plural syntax, placeholders for facts). No literal user-facing English in components (an ESLint rule `no-literal-strings` on JSX text and `title`/`aria-label`/`placeholder`). Static pages get their strings from the same catalogue at build time. This also makes a later translation possible.
2. **Vale** (`.vale.ini` plus `styles/Gettysburg/`) on Markdown/HTML sources: examples below. Level `error` for mechanical rules, `warning` for readability.
3. **`copy_lint`** on the *built* output (HTML, the JS bundle's string literals, JSON data, PDF text layer): the rule table of 2.1 as code (prototype: `inventory.py`, 356 hits on today's build; target 0 with an allow-list for quotations). Runs in CI and on the deployed folder before publish.
4. **`facts` check**: numbers before nouns (`\d[\d,]*\s+(regiments|batteries|stories|events|stops|monuments|tools)`) must equal `facts.json` (`app-bugs-15`).
5. **PR checklist** (`docs/RELEASE.md`): new copy uses the glossary; no counts typed; alt text present; disclaimers by ID; changelog entry written.
6. **Owner review**: one 30-minute pass per release over the diff of `en-US.json`.

Vale rule examples:

```yaml
# styles/Gettysburg/Dashes.yml
extends: existence
message: "Use an em dash (—) for a break or an en dash (–) for a range, not '--'."
level: error
scope: text
nonword: true
tokens: ['--', '\s-\s']

# styles/Gettysburg/Times.yml
extends: existence
message: "Write times as '4:30 PM'. Found '%s'."
level: error
scope: text
nonword: true
tokens:
  - '\b\d{1,2}:\d{2}(am|pm)\b'
  - '\b\d{1,2}\s?(am|pm)\b'
  - '\b\d{1,2}(:\d{2})?\s?[ap]\.m\.'

# styles/Gettysburg/Terms.yml
extends: substitution
message: "Use '%s' instead of '%s'."
level: error
ignorecase: false
swap:
  Animated Battlefield Map: Interactive Map
  Animated Map: Interactive Map
  Battle Reports: Regiment Fact Sheets
  What They Could See: Vantage Points
  Find an Ancestor: Find Your Ancestor
  Follow Your Ancestor: Follow a Regiment
  Extra Features: More to Explore
  KIA: killed
  WIA: wounded
  vignettes?: stories
  ticks?: moments
  snapshots?: moments

# styles/Gettysburg/NoAI.yml
extends: existence
message: "The Historian is a search of the site's records. Do not describe it as AI, an assistant or a persona ('%s')."
level: error
ignorecase: true
tokens: ['AI-style', 'AI assistant', 'assistant', 'chatbot', "I'm ready"]

# styles/Gettysburg/DevSpeak.yml
extends: existence
message: "Development history does not belong in product copy ('%s'). Use the changelog."
level: error
ignorecase: true
tokens: ['earlier drafts?', 'this deployment', "haven't been able", 'for now', 'workaround', 'should be reconciled', 'undefined', 'placeholder']
```

### 6.17 Adoption checklist for the first release

1. Approve the product name, the five group names and the glossary (30 minutes, **[OWNER]**).
2. Land the Phase 0 string edits (section 8) and the `normalise_data` step.
3. Add Vale and `copy_lint` to CI in warning mode; fix to zero; switch to error.
4. Publish Sources and Corrections first (they make every other page safe to link).

---

## 7. Findings (fix specs)

Format per finding: severity, effort, audit refs, dependencies; then evidence, root cause, fix, acceptance test, metric moved. Tables in sections 2-6 hold the full string lists and replacement copy; the findings say what to do with them.

### docs-copy-01: Remove development-history and process voice from user-facing copy

- **Severity** high. **Effort** S. **Audit refs** H7, C7 (dashboard note). **Depends on** none.
- **Evidence.** `viewshed.html:46` ("Earlier drafts of this tool tried...", "this deployment doesn't have access"); `ar.html:56` ("which we haven't been able to do from here"); `dashboard.html:261-263` (developer data note); `aftermath.html:44` ("tick-by-tick ... simulation"); `index.html:377` ("Don't miss them"); `watch-together.html:64,104` ("server of ours", "best-effort"); `sandbox.html:54,195`; error strings `compare.html:58`, `dashboard.html:69`, `search.html:163` (print file paths or "try reloading"). Full table 2.3 (A1-A17).
- **Root cause.** Caveats were written as running commentary while features were built; there is no place for limitations (changelog/Known issues) and no copy review.
- **Fix.** Replace each string with the copy in 2.3. For the dashboard note, fix the two data totals instead (`casualty_apportionment.json`: I Corps `total_casualties` 6,059 → 6,394, or recompute periods; Confederate cavalry 583 vs 483; the historian confirms which) and delete the footnote code; keep the fallback wording only if a discrepancy is intentionally shown. Move the history of the Vantage Points decision to `docs/adr/`.
- **Acceptance test.** `copy_lint` rule DEVLOG returns 0 on the built site; the Vale `DevSpeak` rule passes; visual check of the six pages.
- **Metric moved.** Fit and finish C+ → B+ (desktop), professionalism perception, Documentation.

### docs-copy-02: Stop printing identifiers, variable names, `undefined` and debug text

- **Severity** high. **Effort** S (strings) + M (data model). **Audit refs** C7, H7. **Depends on** docs-copy-06 for the data split; app-bugs-35 for alias/phantom rows.
- **Evidence.** `dashboard.html:244-248` renders `highest_single_regiment_rate` / `undefined`; `oob/union_regiments_i_ii_corps.json` alias record `U-14BK` ("14th Brooklyn (alias for U-84NY)", key_action "Dual designation alias -- see U-84NY.", fate "See U-11PA"); 17 of 137 chronology events reference `US-/CS-` ids (6 inside rendered `event` text); `historian.html:93` prints `parent_corps_id / parent_brigade_id`; `find-ancestor.html:121`; HUD/canvas fps text `bundle.pretty.js:97448`, `:96687-96690`; `console.log` in `compare.html:164`, `search.html:144`. 2.4 (B1-B11).
- **Root cause.** UI code renders raw data keys and engine annotations; the public JSON is the working file.
- **Fix.** (1) Author a `display` block per highlight in `casualty_apportionment.json` (B1a table) and render it; delete `key.replace(/_/g,' ')`. (2) Data build splits `flag`/`engine_note`/`units_involved` (never public) from public fields; delete the alias record (or model `also_known_as`). (3) Resolve ids to designations at build time (`parent_brigade_id` → "Vincent's Brigade"). (4) Fps counters only when `?debug=1`. (5) Remove `console.log`. (6) Build check: no string matching `\b(US|CS)-\d{3}\b`, `\bU-[A-Z0-9]{2,}\b`, `undefined`, `null`, `[object` in any rendered field or built HTML.
- **Acceptance test.** Dashboard shows four titled cards with values and notes; Search for "Brooklyn" shows "84th New York Infantry (14th Brooklyn)"; `copy_lint` IDLEAK 0; no orange "fps" text at any playback speed on a throttled CPU.
- **Metric moved.** Reliability/polish, C7 closed (copy side), professionalism.

### docs-copy-03: Make names, descriptions and answers truthful (Historian, Vantage Points, Fact Sheets, Export, meta)

- **Severity** high. **Effort** S-M. **Audit refs** H8. **Depends on** app-bugs-05 (deep links) for the "links to the map" claims; docs-copy-05 for names.
- **Evidence.** `index.html:377` "AI-style historian"; `site-nav.js:26` "search-and-answer assistant"; `historian.html:48` ("everything it tells you traces back ... shown as a source link below each answer") vs `historian.html:119-125` (chronology answers have `srcHref: null`); `historian.html:186,204` ("I couldn't find", "I'm ready"); viewshed meta ("approximate sightlines") vs on-page "not a computed sightline"; `cinematic-export.html:8` "narrated flyover" (no narration); `site-nav.js:27` "narrated"; `turning-points.html:8` "historians agree" vs `:46` "argued about"; `report.html` name and "any regiment or moment" meta vs regiments-only; `documentary.html:49` "exact spot" (links open the default view today). 2.6 (D1-D17).
- **Root cause.** Names and blurbs were written for the feature as imagined, then not revisited when the implementation was scoped down.
- **Fix.** Apply 2.6; rename Battle Reports → Regiment Fact Sheets, What They Could See → Vantage Points, Cinematic Export → Export a Video (labels only, URLs unchanged); give chronology results a source line ("Chronology, July 2") or drop the "each answer" claim; delete the first-person persona; keep "Ask the Historian" as the name (owner may choose "Ask the Records") but never "AI/assistant". When the Historian is upgraded (databases expansion), reuse D-HISTORIAN wording and, if a language model is added, add a disclosure line ("Summary written by a language model from the sources shown; check the citations").
- **Acceptance test.** Vale `NoAI` and `Terms` pass; every claim in a meta description is true on the page (manual checklist of 21 pages); Historian answers for regiment, story, event and place each show a source line.
- **Metric moved.** H8 closed, trust, SEO snippet accuracy, Usability.

### docs-copy-04: Retire "real time", "minute-by-minute", "five-minute snapshots" and "tick"; adopt one clock format

- **Severity** high. **Effort** M. **Audit refs** H9, C4 (copy side). **Depends on** app-time (model, formatter), app-bugs-33.
- **Evidence.** 10 "real time" claims (2.7 E1-E4), 69 "tick" hits (E7-E16), 4 clock formats in use (`compare.html:128`, data `7:30am`, UI `7:20 AM`, `4:00pm`), `bundle.pretty.js:97429` "1x (real time)" (about 10 simulated minutes per second).
- **Root cause.** The engine's step (5 min per tick) leaked into copy; the time model is about to make steps non-uniform (`app-time §7.13`).
- **Fix.** Copy per 2.7; a single `formatMoment()` (owned by app-time) used by every string; "moment" for points in time, clock time as the primary label, "Frame N of 675" only in tooltips; the time-lapse sentence and D-CLOCK. Data strings normalised by docs-copy-06.
- **Acceptance test.** `copy_lint` REALTIME/TICKJARGON/TIMEFMT = 0; the same string appears for the same moment on the toolbar, event card, Ledger, guide example and Sources (the "one clock" e2e, `app-time §10`).
- **Metric moved.** Historical consistency C- → B+ (with app-time), H9.

### docs-copy-05: One canonical name for the product and for each feature

- **Severity** medium. **Effort** M. **Audit refs** E2, D4 (naming side), H6. **Depends on** owner decision (product name); docs-copy-16.
- **Evidence.** 71 occurrences of "Animated Battlefield Map/Animated Map" vs the domain, PDF title and file name ("Interactive Map"); 12 feature naming conflicts in 2.8 (for example "Find Your Ancestor / Find Your Ancestor's Regiment / Find an Ancestor / Follow Your Ancestor / Follow Ancestor"; "Soldier's Eye View / Soldier's View"; "NPS Auto Tour" for two different tours; "Explore" as both button and group).
- **Root cause.** Names typed independently in 7 places (nav array, page H1/titles, `index.html` SEO block, toolbar, mobile sheet, PDF, Help).
- **Fix.** Adopt the 2.8 table; store names once in `features.json`; generate nav, titles, H1s, the SEO nav block (which currently omits two pages: 18 links, `index.html:721-739`), tool tiles and the guide from it; run the substitution list in Vale `Terms.yml`. Keep URLs.
- **Acceptance test.** grep for every retired name returns 0 outside the changelog/redirect notes; a test asserts each page's H1 equals its nav label and `<title>` starts with it; the `index.html` SEO nav lists all 20 tools.
- **Metric moved.** Consistency, SEO E2, learnability.

### docs-copy-06: Normalise typography once, at build time (dashes, ellipses, clocks, caps, KIA, apostrophes, ranges)

- **Severity** medium. **Effort** M. **Audit refs** H7 (voice), polish. **Depends on** repo/data build (N1).
- **Evidence.** 1,639 ` -- ` in rendered data fields, 56 in HTML/JS/bundle; 69 ALL-CAPS phrases; 61 KIA/WIA; 20 `7:30am`; 2,085 data strings with straight apostrophes; possessive forms split (Sickles's 16 / Sickles' 20). 2.10, 2.14.
- **Root cause.** Data authored in a plain-text style and rendered verbatim.
- **Fix.** `tools/normalise_data.mjs` (2.14 sketch) writes public JSON; `data-src/` keeps the original; named-list possessive normaliser; the same rules as Vale substitution/existence for hand-typed HTML; run inside the data build (also strips `flag` etc., helping P3).
- **Acceptance test.** Zero matches for the 2.10 regexes in built HTML and public JSON; a snapshot test of 50 sample strings; Search still finds "Sickles" and "Culp's Hill" (normalise the query with the same function).
- **Metric moved.** Fit and finish, professionalism; small payload reduction.

### docs-copy-07: Replace emoji-as-label and unexplained abbreviations (copy side of H6)

- **Severity** medium. **Effort** S (copy) after icons exist. **Audit refs** H6, A5. **Depends on** the icon-set work (design specialist), docs-copy-16.
- **Evidence.** 17 emoji strings (2.11); glyph-text labels `S F ☰ L 🗿 🔭 ⭐ 📏 🗺 📍 🔍 B ?` (`bundle.pretty.js:113143-113226`); ranks without periods; `KIA/WIA` in the unit panel (`:98081-98082`) and toasts (`:99998-100002`); "Confed" chips (`:103345`). **Coupling:** `index.html:406-407` and `:696` depend on the glyph text and the title "Monuments".
- **Fix.** 2.11 table; every icon control gets `aria-label` and tooltip from the manifest; retire the `index.html` label workaround with the overlay (H1).
- **Acceptance test.** No emoji code point in any string; every icon button has a name equal to its tooltip; `copy_lint` EMOJI/ABBREV = 0.
- **Metric moved.** A11y (names), consistency.

### docs-copy-08: Derive every count from data; reconcile the numbers that disagree

- **Severity** high. **Effort** M. **Audit refs** H10. **Depends on** app-bugs-15 (`build-facts`), app-bugs-35.
- **Evidence.** 2.9 (G1-G11): "445+" vs 467; "467 regiments and batteries" is regiments only (batteries 103, total 570); coverage 217/231/19; 51,000 vs 45,928; 26th North Carolina 714 of 800 (`bundle.pretty.js:100756`) vs 588 of 843 (`casualty_apportionment.json`); Iverson prisoners nearly 500 vs 232; 165,000 vs 162,974; the artillery batteries are missing from Search, Regimental Biography, Fact Sheets, Find Your Ancestor and the Historian (8 regiment files only) although copy says "regiment or battery"; the completeness claim at `regiment.html:102`.
- **Root cause.** Counts typed in prose (467 ten times, 675 thirty times), no shared facts file, no cross-check between story text and data.
- **Fix.** `facts.json` per `app-bugs-15` extended with `batteries`, `regiments_and_batteries`, `regiments_with_own_positions`, `casualties_table_total`, `sources`; token syntax `{{facts.x}}` in templates and `<!--fact:x-->` markers in static HTML; CI check `check_facts`; historian adjudicates G3-G5 (one number each, stated basis); add the two artillery files to the shared loader, or remove "battery" from the copy.
- **Acceptance test.** Change one count in the data and every page/Help/guide/meta value changes at the next build; `check_facts` fails on a hand-typed number; G4/G5 have a single value with a citation.
- **Metric moved.** Consistency C- → B+, trust.

### docs-copy-09: Missing-data phrasing and honest completeness

- **Severity** medium. **Effort** S. **Audit refs** H7. **Depends on** none.
- **Evidence.** 2.5 (C1-C6); 222 of 467 records without a casualty rate, 27 without a commander, 37 with empty `days_engaged`; "still complete" claim (`regiment.html:102`).
- **Fix.** Omission-first rendering; the M-* phrase library (6.9); "Not reported" cells with tooltip; remove completeness claims.
- **Acceptance test.** No "unrecorded/not recorded/—" alone in any render of the 467 records (script renders all pages headlessly, or unit test on the render functions); `copy_lint` ABSENCE = 0.
- **Metric moved.** Polish, data-page usability.

### docs-copy-10: Rewrite Help and About (counts, sources, keys, links, version)

- **Severity** medium-high. **Effort** M. **Audit refs** H10, G1, D1. **Depends on** docs-copy-16 (rows generated), app-bugs-09/13/20.
- **Evidence.** 5.1 (15 rows): "445+", "Primary Sources" heading over secondary works (2 primary of 9), 26 works in the data, the dead H row, Esc semantics, developer words, no touch section, no links to sources/corrections/accessibility/version, dedication figure.
- **Fix.** Replace with 5.1/5.2 copy; four tabs (Shortcuts, Touch, About and sources, Report a problem); rows generated from `features.json`; sources grouped Primary/Secondary and linked to the Sources page; version line from `version.json`; preload the chunk (D1).
- **Acceptance test.** The parity test (3.8) passes for Help; About counts equal `facts.json`; screen-reader pass of the dialog (a11y specialist); the Help renders in < 300 ms after click (D1).
- **Metric moved.** Documentation, H10, D1, Usability.

### docs-copy-11: First-run, layout chooser and panel microcopy

- **Severity** high (mobile first-run). **Effort** M. **Audit refs** H3, D4. **Depends on** app-bugs-11 (boot machine, layout persistence), docs-copy-16.
- **Evidence.** 5.3 (O1-O12); three different loading texts in sequence (static `Loading the battlefield…` `index.html:747`, `Loading battle data...` `:101535`, `Fast-forwarding 3 days of battle...` `:101542`); "settings menu" does not exist (`:102815`); "Power User" and key instructions shown to touch users (`:111825`, `:111852`); three skip labels (`Skip intro ›` `:101581`, `Skip introduction` `:111929`, `Skip tour` `:111967`) that `index.html:467` matches by regex.
- **Fix.** Copy per 5.3; device-aware hints (touch vs keyboard); one loading text; sentence-case labels; ship the copy with the H1 fix so the regex coupling (2.16) is removed, or update `EXIT_BUTTONS` in the same commit.
- **Acceptance test.** On a phone emulation no string mentions Space, S, `?` or "keyboard"; the chooser footer names a control that exists; the overlay reveal still works (or is gone).
- **Metric moved.** Usability D+ → B (mobile), H3.

### docs-copy-12: Make every statement in the guide true (32-row audit)

- **Severity** high. **Effort** M. **Audit refs** G1, D4, H8, H13. **Depends on** the sibling fixes named per row in 3.2 (write-when tags).
- **Evidence.** Table 3.2 (32 rows): 3 to remove (H heatmap, Find Unit / Location, the PDF-download troubleshooting row), 8 wrong today and fixable by copy (three of them only become fully right when a later code fix lands), 7 true only after a named sibling fix lands (first-launch text, Order of Battle, roster, ancestor panel, filter, colour table, counts), 14 true today (several need rewording, none needs code). Disposition colours: 8 of 11 legend swatches differ from the map (3.2a).
- **Root cause.** The guide was written from the feature list, not from the code; no parity test.
- **Fix.** Apply the corrected text; generate tables from the manifest; keep a "guide claims" checklist in the release template; write the "AFTER" rows when the fix ships (each row lists its dependency).
- **Acceptance test.** A person follows the guide end to end on desktop and phone and every sentence is true; `check_parity` passes.
- **Metric moved.** Documentation B → A+, trust.

### docs-copy-13: Reproducible guide generator (HTML-first, committed, CI-built)

- **Severity** high. **Effort** L. **Audit refs** G1, N1. **Depends on** repo (N1) or a separate docs repo; docs-copy-16 for the manifest.
- **Evidence.** 3.1: no generator anywhere; six different guides in Downloads (46, 43, 44, 2, 3 and 6 pages, Jun-Sep 2026); ReportLab OSS 5.0.1 cannot emit tags.
- **Fix.** Architecture in 3.4: `content/` + `tools/` layout, `facts.json`, Jinja templates with `StrictUndefined`, engine spike (WeasyPrint default, Chromium fallback), `SOURCE_DATE_EPOCH` reproducibility, versioned file names, CI order (facts → parity → build → lint → veraPDF → link check).
- **Acceptance test.** From a clean clone `npm run docs` produces `dist/guide.html` and `dist/user-guide.pdf` and the second run is byte-identical (or text-layer identical); deleting a manifest tool breaks the build; the guide footer shows the release version and date.
- **Metric moved.** Documentation, maintainability, bus factor.

### docs-copy-14: Guide layout, pagination, type and contrast

- **Severity** high. **Effort** M. **Audit refs** G1. **Depends on** docs-copy-13.
- **Evidence.** 3.1 measurements: fill 97.7/16.9/99.8/5.0/93.3/40.5 %; orphan heading p1; contrast 1.25:1; 95 % of text < 10 pt; dark backgrounds.
- **Fix.** Spec 3.5 (keep-with-next, splittable tables, print theme, ≥ 10.5 pt body, contrast-checked palette, real glyphs, linked footer with version/date/Page N of M, contents page, Letter and A4).
- **Acceptance test.** `pdf_lint --strict` layout gates green (3.8); proof-read print on paper.
- **Metric moved.** Documentation polish, print/ink cost, readability.

### docs-copy-15: Accessible (tagged) PDF, metadata, bookmarks, links; open it in the browser

- **Severity** high. **Effort** L (mostly the spike). **Audit refs** G1, A-level accessibility. **Depends on** docs-copy-13.
- **Evidence.** 3.1: no `/Lang`, `/MarkInfo`, `/StructTreeRoot`, outline, `DisplayDocTitle`; 0 links; fonts not embedded; metadata "(anonymous)"; `netlify.toml:201-204` attachment; toolbar link has `download` (`bundle.pretty.js:113116`).
- **Fix.** 3.6 property table; PDF/UA-1 via WeasyPrint or Chromium tagged output; embed Spectral and Inter (OFL); XMP; outline; links; `guide.html` twin; serve inline (3.7).
- **Acceptance test.** veraPDF `--flavour ua1`: 0 failures; Acrobat Accessibility Check and PAC 2024 pass; NVDA reads headings, tables and links in order; Title bar shows the document title; PDF opens in the tab on iOS and Android.
- **Metric moved.** Accessibility (documents), G1 closed, WCAG 2.2 AA for the guide.

### docs-copy-16: One manifest for tools, hotkeys, dispositions, extras and facts (feeds Help, nav, guide, sitemap)

- **Severity** high. **Effort** L. **Audit refs** D4, G1, H6, H10. **Depends on** app-bugs-13 (`TOOLS` registry), app-bugs-09 (hotkeys), app-bugs-15 (facts).
- **Evidence.** Five hand-typed shortcut lists (root handler `bundle.pretty.js:112960-113046`; Help array `helpmodal-cfv9t0zh.js:col72-1000`; Quick Reference `:111984-111996`; tooltips `:112312-112336`; `index.html:406-407`) plus the PDF; tool names in 7 places; three disposition colour maps that disagree on 8 of 11 entries (3.2a); `site-nav.js:12-58` already proves the pattern works for the 20 extras (27 pages plus the overlay).
- **Fix.** `features.json` (3.4) as the source; `check_parity` (manifest vs registry vs built HTML/PDF text); the map's legend, unit panel, canvas, guide and Help all read `dispositions[*].color`; add a non-colour cue per disposition.
- **Acceptance test.** Adding a hotkey to the manifest and the registry updates Help, Quick Reference, tooltips and guide with no other edit; a hotkey in the manifest with no handler fails CI; all 11 legend swatches equal the drawn colours (pixel-sample test on the canvas).
- **Metric moved.** Consistency, documentation, fewer regressions.

### docs-copy-17: Sources and Methods page

- **Severity** high. **Effort** L. **Audit refs** new (credibility, G1, A-level). **Depends on** docs-copy-08 (facts), app-time (About the clock), the historian for the disagreement register.
- **Evidence.** 4.1: no page; Help lists 9 works; data files cite 26; two bibliographic conflicts; Mapbox attribution removed on two maps (`app-bugs-34`); monument records cite HMDB and Stone Sentinels; Terms claims "researched in good faith" with no way to check.
- **Fix.** Outline 4.1; `sources.json` generated from data metadata then verified and extended with catalogue links; register of disagreements; licence decision; how-to-cite.
- **Acceptance test.** 4.1 acceptance; every story/unit panel/sub-page links to it; each bibliography entry verified (title, publisher, year) against a catalogue record.
- **Metric moved.** Trust, SEO (E-E-A-T signals), Documentation, education adoption.

### docs-copy-18: Corrections and Feedback page plus in-app "Report a problem"

- **Severity** medium. **Effort** M. **Audit refs** new. **Depends on** docs-copy-17, deep-link contract (app-time §8).
- **Fix.** 4.2; prefilled mailto (no form, no new data collection); `corrections.json` + Atom feed; seed with the corrections made by this plan (C3, C4, G4, D-series).
- **Acceptance test.** 4.2 acceptance.
- **Metric moved.** Trust, Reliability perception.

### docs-copy-19: About the creator

- **Severity** medium. **Effort** S-M (owner-authored). **Audit refs** new. **Depends on** owner.
- **Fix.** 4.3; owner supplies the [OWNER] paragraphs; no invented biography.
- **Acceptance test.** 4.3 acceptance.
- **Metric moved.** Trust, E-E-A-T.

### docs-copy-20: FAQ

- **Severity** medium. **Effort** M. **Audit refs** new. **Depends on** docs-copy-08, -17, -18.
- **Fix.** 4.4 (14 answers drafted).
- **Acceptance test.** every number in an answer comes from `facts.json`; page linked from Help and guide.
- **Metric moved.** Support load, SEO long-tail (T1).

### docs-copy-21: Accessibility statement

- **Severity** medium. **Effort** M. **Audit refs** A-level. **Depends on** the a11y suite results.
- **Fix.** 4.5, honest status line until audited.
- **Acceptance test.** the statement lists the limitations found by the latest audit and a dated review; contact path works.
- **Metric moved.** Accessibility (documentation), legal posture.

### docs-copy-22: Changelog, version stamp, Known Issues

- **Severity** low-medium. **Effort** S. **Audit refs** new. **Depends on** repo/CI.
- **Fix.** 4.6 (`/changelog`, `version.json`, feed, footer stamp).
- **Acceptance test.** footer version equals `version.json`; each release has a user-facing entry.
- **Metric moved.** Trust, support, honesty channel for limitations.

### docs-copy-23: Press and Embed kit

- **Severity** medium. **Effort** M. **Audit refs** X4, T1. **Depends on** X4 fix (frame policy), embed page cleanup.
- **Fix.** 4.7; generator UI; snippet; attribution; assets.
- **Acceptance test.** snippet works cross-origin in three browsers; Terms wording matches.
- **Metric moved.** Distribution, backlinks, Terms consistency.

### docs-copy-24: Teacher resources

- **Severity** medium. **Effort** L. **Audit refs** new. **Depends on** docs-copy-15 (handouts), -27 (context), a teacher reviewer.
- **Fix.** 4.8.
- **Acceptance test.** lessons run using only existing features (parity test); handouts pass PDF gates; one educator review recorded.
- **Metric moved.** Audience growth (schools), Usability, SEO.

### docs-copy-25: Privacy and Terms copy accuracy; footer identity

- **Severity** medium-high. **Effort** S-M. **Audit refs** X5, X4. **Depends on** legal read.
- **Evidence.** 4.10 (P1-P8, T1-T4): the Street View statement names the wrong pages (`privacy.html:30`); PeerJS broker and jsDelivr script (`watch-together.html:19`), Mapbox telemetry (`index.html:42`) and AR permissions (`ar.html:60`) unmentioned; hand-typed dates; "embedding its widget" with `X-Frame-Options: DENY`; footer copyright names a product not a person (`site-nav.js:191`).
- **Fix.** 4.10 text; dates from the build; a localStorage key table; footer `© 2026 Mike Legere`; link to Accessibility and Sources.
- **Acceptance test.** every third-party host in the CSP `connect-src`/`frame-src` and every permission the app requests appears on the Privacy page (scripted diff of CSP hosts vs page text).
- **Metric moved.** Privacy/legal B+ → A, trust.

### docs-copy-26: Ratify the style guide; enforce it (Vale, `copy_lint`, string catalogue, ESLint rule)

- **Severity** medium-high. **Effort** M-L. **Audit refs** systemic. **Depends on** repo/CI.
- **Fix.** Commit section 6 as `docs/STYLEGUIDE.md`; add `.vale.ini` and rules; port `inventory.py` to `tools/copy_lint.py` with an allow-list; `src/copy/en-US.json` catalogue; PR checklist.
- **Acceptance test.** `copy_lint` on the built site: 356 hits today → 0; Vale on Markdown/HTML sources: 0 errors; a deliberately bad string in a PR fails CI.
- **Metric moved.** Prevents regression across every category above.

### docs-copy-27: Historical context and responsible-language gap (slavery, emancipation, civilians); quotation policy

- **Severity** medium-high (content completeness). **Effort** L (research-bound). **Audit refs** new. **Depends on** owner and a historian reviewer.
- **Evidence.** 0 occurrences of slavery, enslaved, emancipation, free Black, African American, abolition or civilians in HTML, JS and data; related content limited to "a new birth of freedom" (Walkthrough stop 16) and the Jennie Wade memorial; `education.html:59-61` and `aftermath.html:43-67` explain the battle without the cause of the war.
- **Fix.** Add a "Why they fought" section (For Students, Teachers, Aftermath and a short panel in the guide) and a "Gettysburg's civilians" story; adopt 6.14; add the quotation policy 6.13 and the `cite` field to story data.
- **Acceptance test.** the words and topics appear in Students, Aftermath and the Teachers lessons with sources; each quotation has a `cite`; a historian reviewer signs off.
- **Metric moved.** Content depth/credibility (A- → A), education trust.

### docs-copy-28: Strip shipped source comments and developer diaries

- **Severity** low. **Effort** S. **Audit refs** P4 (HTML size), N1. **Depends on** build step (or a one-off script for the static pages).
- **Evidence.** 21,647 B of comments in the deploy; `index.html` 128 comment lines (10,497 B, 26 % of 39.6 KB) including `:446-465`, `:356-360`, `:399-403`, `:620-628`.
- **Fix.** `html-minifier-terser --remove-comments` and `terser --comments false` in the build; move the rationale to `docs/adr/`.
- **Acceptance test.** `view-source` shows no comments except licence headers; HTML ≤ 14 KB after inline-script extraction (`bundle-anatomy` target).
- **Metric moved.** Perf (bytes), professionalism of view-source.

### docs-copy-29: Title, description and social copy that match the pages

- **Severity** medium. **Effort** S. **Audit refs** E2, T1, E3. **Depends on** docs-copy-05, SEO specialist's URL scheme.
- **Evidence.** 2.13: 5 titles > 60 chars; 10 `og:description` ≠ `description`; 8 descriptions with `--`; 4 descriptions contradict the page; home title lacks the search phrase; no `og:image:alt`.
- **Fix.** Apply the 21-row table (all ≤ 60 / 70-160, checked); add `og:image:alt`; generate JSON-LD name/description from the same table.
- **Acceptance test.** script asserts title ≤ 60, description 70-160, unique per page, `og:*` equal to `meta`, no `--`.
- **Metric moved.** SEO snippet quality, CTR.

### docs-copy-30: Microcopy patterns for loading, empty, error, success, permission states

- **Severity** medium. **Effort** M. **Audit refs** H7, A-level (status messages, 4.1.3). **Depends on** docs-copy-26.
- **Evidence.** raw-path error text (`compare.html:58`, `dashboard.html:69`), nine different loading strings across 15 files (two are a bare "Loading…", `documentary.html:52`, `embed.html:25`), `(no note)`, toasts that never dismiss (H4), unlabeled `✕`; patterns 6.12.
- **Fix.** Components/messages from the catalogue with `role="status"`/`alert` as specified; one loading text; retry button on errors.
- **Acceptance test.** offline mode shows the specified error with a Reload button on every data page; axe status-message checks pass.
- **Metric moved.** Reliability perception, accessibility, polish.

### docs-copy-31: Small trust and documentation additions (glossary, contact, security.txt, HTML site map, repo docs)

- **Severity** low. **Effort** S-M. **Audit refs** N1. **Depends on** none.
- **Fix.** 4.9 table.
- **Acceptance test.** pages/files exist and are linked; `security.txt` valid (RFC 9116 fields `Contact`, `Expires`).
- **Metric moved.** Trust, maintainability.

### docs-copy-32: Fallback copy patch if the app is not rebuilt (codemod with occurrence assertions)

- **Severity** medium. **Effort** S-M. **Audit refs** N1. **Depends on** app-bugs-01 (Tranche 0) so both patch sets are applied in one pass; `app-time §3.3` (rename the bundle).
- **Evidence.** `copy_patch_table.json`: 64 rows, every find string present in the deployed minified files (counts recorded; 5 rows need quote-delimited matching).
- **Fix.** `tools/copy_patch.mjs` applies the table to `index-*.js` and the Help chunk with exact-count assertions, then writes new hashed filenames and updates `index.html`, `sw.js` and the modulepreload; sequencing with the Tranche 0 patches; skip rows tagged `AFTER`.
- **Acceptance test.** patch script fails loudly if any anchor count differs; patched bundle parses; smoke test (app-bugs-01) passes; `copy_lint` bundle hits drop by the rows applied.
- **Metric moved.** Immediate polish without a rebuild; risk-contained.

### docs-copy-33: Adjudicate the headline statistics and quotations before they are repeated in new pages

- **Severity** medium. **Effort** S (historian's time). **Audit refs** C4 adjacent, H10. **Depends on** historian.
- **Evidence.** 26th North Carolina 714 of 800 vs 588 of 843 (`bundle.pretty.js:100756` vs data); "Greatest loss percentage of any regiment" (1st Minnesota, `:100734`) vs 714/800; Iverson prisoners nearly 500 vs 232; casualty totals 51,000 vs 45,928; quotations flagged in 6.13 item 3 (Alexander's messages, "We had them within our grasp", the Avery note); Gottfried year 2007 vs 2013.
- **Fix.** One decision per item recorded in the Sources disagreement register; edit the story/monument text and data to match; no new page repeats an unadjudicated figure.
- **Acceptance test.** each item has a decision, a citation and one value everywhere (grep).
- **Metric moved.** Historical consistency, credibility.

---

## 8. Sequencing, effort and dependencies

| Phase | Items | Effort | What ships |
|---|---|---|---|
| **0: copy only, no dependency (1 day)** | 01, 02 (dashboard cards, alias record, fps, console.log), 03 (D1-D6, D8-D12 wording), 09, 25 (P1, P2, footer), 28 (static pages), 29, 30 (error strings), 32 (patch table applied together with app-bugs-01) | ≈ 1 d | every item in the executive summary point 2; no more draft/AI/alias/undefined text; honest meta tags; correct privacy statement |
| **1: systems (about 2 weeks)** | 16 (manifest + facts), 08, 06 (normaliser), 26 (style guide + Vale + copy_lint), 13-15 (guide generator, layout, accessibility), 17 (Sources), 18 (Corrections), 10-11 (Help, onboarding), 22 (changelog), 31 | ≈ 12-14 d | one source of truth for text; a reproducible, tagged, print-ready guide; the trust pages that make later pages safe |
| **2: with dependencies** | 04 (after app-time Phase 2), 05 (product rename, with H1/H6), 07 (after icons), 12 AFTER rows (as each sibling fix lands), 23 (after X4), 19, 20, 21, 24, 27, 33 | ≈ 10-14 d incl. owner and historian time | truthful clock copy, canonical names, education and context content |

Rough totals (S 0.25 d, M 1 d, L 3.5 d): 01 S, 02 S+M, 03 M, 04 M, 05 M, 06 M, 07 S, 08 M, 09 S, 10 M, 11 M, 12 M, 13 L, 14 M, 15 L, 16 L, 17 L, 18 M, 19 S, 20 M, 21 M, 22 S, 23 M, 24 L, 25 M, 26 L, 27 L, 28 S, 29 S, 30 M, 31 M, 32 M, 33 S ≈ 42 person-days end to end; the 1-day Phase 0 removes the worst visible problems.

Grades this work moves (against the audit scorecard): Documentation B → A+ (12-15, 17, 21), Historical/data consistency C- → B+ (04, 08, 33 with app-time), Fit and finish desktop C+ → A- and mobile D+ → B (01-03, 09, 11, 30), Privacy/legal B+ → A (25), Usability (10, 11, 20), SEO A- → A (29), Accessibility (07, 15, 21, 30), Concept/content depth A → A+ (17, 24, 27).

---

## 9. Open questions, uncertainties, things I did not do

Owner decisions needed: (1) product name "Gettysburg Interactive Map" and the five group names; (2) keep "Ask the Historian" or rename; (3) content licence and whether the data is downloadable; (4) contact policy and stated response times for Corrections and Accessibility; (5) the About text and photo; (6) whether to keep a dark guide edition; (7) whether the Guided Battle Tour should keep 16 stops or be merged into the Walkthrough (`app-bugs-27`).

Not verified (labelled where used): the PDF engines (WeasyPrint, Chromium/Playwright option names, Typst) and veraPDF were not run: Chrome headless exited with code 21 and wrote no file in this sandbox; WeasyPrint, Playwright and veraPDF are not installed; I did not install anything. The order in which the layout chooser, intro and tour appear on first launch was not observed. Whether the Order of Battle modal is hierarchical (the `app-bugs-13` report says it is not). How the app draws the 231 brigade-only regiments. What `sw.js` caches (the FAQ "works offline?" answer depends on it). What Mapbox GL v3 telemetry sends. Bibliographic years and editions beyond the two conflicts noted. Educational standards codes (listed as candidates). The historical accuracy of the quotations and figures in 6.13 and 2.9 (owned by the historian and the time-facts specialist). The `unitTypes` filter claim (from `app-bugs-26`, not re-verified). That the guide's 46-, 43-, 44-page earlier versions contain accurate material worth reusing (not read).

Things I did not do: use a browser, run any build, modify any site or source folder, install software, contact any external service other than one read-only fetch of the NPS virtual-tour page and one search.

---

## Appendix A. Scripts and outputs (all in `plan-work/tmp-docs-copy/`)

| File | Purpose |
|---|---|
| `extract_html.py` → `dump_*.html.txt`, `html_strings.json`, `script_*.js` | visible text and inline scripts of all 27 HTML files with line numbers |
| `extract_bundle.py`, `js_strings.py`, `scan_scripts.py` → `bundle_prose.txt`, `bundle_copy_candidates.txt`, `script_strings.txt` | string literals of the bundle app region, Help/Bookmark chunks and sub-page scripts |
| `inventory.py` → `inventory.csv` (356 rows), `inventory_summary.txt` | 18-rule scan of every surface plus data-field aggregates |
| `comment_bytes.py` | shipped comment bytes per file |
| `seo_copy.py`, `seo_replacements.json` | current titles/descriptions and the 21 proposed pairs with lengths |
| `patch_table.py` → `copy_patch_table.json` | 64 exact find/replace rows verified against the deployed minified bundle and Help chunk |
| `pdf_lint.py` | fill ratio, orphan heading, span contrast, fonts, links, metadata and tagging checks; prototype of the CI gate |
| `ug_p1.png`-`ug_p6.png` | rasterised pages of the deployed guide (70 dpi) |

Reproduce: `cd plan-work/tmp-docs-copy; PYTHONUTF8=1 python extract_html.py; python extract_bundle.py; python scan_scripts.py; python inventory.py; python pdf_lint.py <deploy>/user-guide.pdf`.

## Appendix B. Key measurements quoted above (for quick re-checking)

| Claim | Command / source |
|---|---|
| 467 regiment records, 410 infantry / 56 cavalry / 1 battery-like; 103 batteries elsewhere | python over `data/oob/*.json` (regiments arrays, `union_artillery.json`, `confederate_artillery.json`, horse artillery lists) |
| 217 / 231 / 19 position coverage of the 467 | union of `unit_id` in `placements_*.json` and `density_*.json` vs OOB ids and `parent_brigade_id` |
| casualty totals 45,928 (22,803 / 23,125); mismatches U-I 6,059 vs 6,394 and C-CAV 583 vs 483 | sum of `total_casualties` and of `engagement_periods[*].casualties` in `casualty_apportionment.json` |
| 222 of 467 no casualty rate; 27 no commander; 37 empty `days_engaged` | python over the 8 regiment files |
| 1,639 ` -- ` in rendered data fields; 69 ALL-CAPS; 61 KIA; 20 clocks; 14 IDs; 50 "tick" | `inventory_summary.txt` |
| 71 "Animated Battlefield Map/Animated Map"; 13 "467"; 30 "675" | `grep -o -r` over deploy HTML/JS/JSON |
| 0 mentions of slavery, enslaved, emancipat, free Black, African American, abolition, civilians | `grep -o -i -r` over HTML/JS/data |
| PDF: fill, contrast 1.25:1, 95 % < 10 pt, fonts not embedded, 0 links, no tags | `pdf_lint.py` |
| official NPS stops 1-16 | nps.gov `virtualtour.htm` (fetched 2026-09-30) |


---

## Verification

Adversarial verifier pass, 2026-09-30. Method: re-opened every cited file/line in DEPLOY_DIR and `bundle.pretty.js`, re-ran the data probes in Python/Node, re-ran the specialist's `pdf_lint.py`, curl-checked the live site, and fetched external references (NPS virtual tour page, publisher listings for Gottfried, NC Archives note by Avery, WeasyPrint/Playwright docs). Nothing outside this section of this file was modified. Overall: the report's evidence is unusually accurate (line numbers, counts and PDF measurements reproduce almost exactly); the errors are in three factual claims, one blind spot (the Historian's chronology answers), and a handful of fix-design risks.

### Verdict table

| ID | Verdict | Notes (what was checked / correction) |
|---|---|---|
| docs-copy-01 | CORRECTED | All quoted strings and line numbers reproduce (viewshed.html:46, ar.html:56, dashboard.html:261 footnote, aftermath.html:44, index.html:377, watch-together.html:64, compare.html:58, dashboard.html:69, search.html:163). Data mismatch is real (U-I summary 6,059 vs period sum 6,394; C-CAV 583 vs 483). Correction to the fix: do NOT raise U-I `total_casualties` to 6,394. The Day-1 period alone already equals 6,059 (rate 49.6% = 6059/12222) and the extra 335 is a separate July 3 Vermont Brigade period, so the period list is the likelier double count. Decide direction with the historian; for C-CAV the single period (483) is the odd one out. Also the DEVLOG list omits the live page unit-rendering-reference.html (see Missed M3). |
| docs-copy-02 | CORRECTED | Verified: dashboard.html:244-248 (`highest_single_regiment_rate` has `union`/`confederate` sub-objects, no `unit`/`note`); U-14BK alias record; 137 events, 17 with US-/CS- ids, 6 in the `event` text; historian.html:93; find-ancestor.html:121; fps text 97448 and 96687; console.log compare.html:164, search.html:144. Corrections: (a) the other three cards also leak ids in the BIG value (`unit` is 'U-III (Third Corps)', 'C-I-3 (Pickett's Division)', 'U-XII and C-II-2 (Culp's Hill)'), not only in lower-case titles; (b) deleting the alias record leaves a dangling id: `data/oob/union_oob_brigades.json` line 14 (Cutler's brigade) lists "U-14BK" in `regiment_ids`, so remove it there too and add a build check that every `regiment_ids` entry resolves; (c) "See U-11PA" is `commander.fate` on U-11PA-B, not a record-level `fate`. |
| docs-copy-03 | CORRECTED | Claims verified (site-nav.js:26-27, index.html:377, historian.html:48/186/204, viewshed/cinematic/turning-points/report/documentary metas). Blind spot: the fix says "give chronology results a source line", but chronology answers are broken at a deeper level: historian.html:113-125 reads `e.title`/`e.description`, which do not exist in the chronology files (fields are `event`, `location`, `tick`, `time`, day 2 also `narrative`). All 137 chronology answers render `Day 1, 5:00am - ...: undefined` and are only searchable by location text (Node simulation). The D4 'Day 1, 6:00am - ...' baseline in 2.6 is therefore not what users see. See Missed M1. |
| docs-copy-04 | CONFIRMED | 10 'real time' claims reproduce (immersive.html:47, index.html:15/18/24/32/745, watch-together.html:64/102, manifest.json, bundle.pretty.js:97429; index.html:620 is an eleventh, in a comment). compare.html:128 'am (next day)' verified. inventory.csv counts (TICKJARGON 69 etc.) match inventory_summary.txt. Note 3 of the 10 (immersive, watch-together x2) are legitimately true statements; the report already says so (R8). |
| docs-copy-05 | CONFIRMED | 71 occurrences of 'Animated Battlefield Map/Animated Map' reproduce (66 in HTML/nav/manifest/data + 5 in bundle/Help); SEO nav block lists 18 of 20 tools (report.html and cinematic-export.html missing); bundle name strings at 101148, 103426, 103433, 103475, 113177 verified; index.html:310 'Extra Features', :733 'Find an Ancestor' verified. Trivia: sitemap has 21 URLs (home + 20), not 20. |
| docs-copy-06 | CORRECTED | Counts reproduce in magnitude (I get 1,758 ' -- ' occurrences vs 1,639 strings; KIA 61 and 20 clocks exact; 1,943 vs 2,085 apostrophe strings). The tools/normalise_data.mjs sketch is unsafe as written: (1) `sentenceCase()` would corrupt proper nouns. The all-caps regex hits 57 distinct phrases, including 'EAST CAVALRY FIELD', 'FIRST UNION ARTILLERY', 'CEMETERY HILL ASSAULT', 'LOUISIANA TIGERS CHARGING', 'EMPTY XII', 'ALL III'; use a hand-curated map for these 57 (the report's own example 'REYNOLDS KILLED.' to 'Reynolds is killed.' is a rewrite, not a case change). (2) Converting `'` to a curly apostrophe in `designation`/`name`/`title` (all in the RENDERED set) breaks typed-apostrophe queries in every matcher that does `includes()`: bundle.pretty.js:98768 and :98798 (in-app Search Units), search.html, historian.html `score()`, find-ancestor, regiment picker. 'Normalise the query too' has to be patched into the minified bundle as well, or keep an un-normalised `_q` search key. |
| docs-copy-07 | CORRECTED | Emoji-as-label lines verified. Rank abbreviations are misdescribed: `uO` (bundle.pretty.js:102536-102546) emits MG, BG, LG, Gen, Col, and the 'Lt Col' replace is dead code because 'Colonel' is replaced first (result 'Lieutenant Col'). See Missed M4. |
| docs-copy-08 | CORRECTED | Verified: 467 regiments (52+62+57+77+72+88+37+22), 103 batteries (50+45+5+3), 570, coverage 217/231/19 (re-derived), 222/27/37 gaps, 467 typed 10x, 26th NC 714/800 (bundle:100756) vs 588/843, Iverson 'nearly 500' (actual line 100093, not 100091) vs 232, Help '445+' (About p1). Three errors: (1) 45,928 is NOT the dashboard or Living Ledger total. Both sum `engagement_periods` (dashboard.html:238-239), giving Union 23,138 + Confederate 23,025 = 46,163. 45,928 (22,803 + 23,125) is only the sum of the `total_casualties` summary fields (Appendix B says so). Any copy that says 'the dashboard total is 45,928' (2.9 G3, 3.3, 6.10, Help dedication proposal, FAQ) must be rewritten. (2) G6 goes the wrong way: 'roughly 165,000' (find-ancestor.html:52) is correct (NPS: 93,921 Union + 71,699 Confederate = 165,620); 162,974 is the sum of corps `initial_strength`, which omits the artillery reserve and HQ units, so do not change the copy to 'about 163,000'. (3) The report misses a third casualty split: chronology_day3.json tick 650 says Union about 23,000 and Confederate about 28,000 (= 51,000), against dashboard 23,138 / 23,025; the 5,000 gap is entirely Confederate (NPS also cites 28,063). Register all three bases. |
| docs-copy-09 | CORRECTED | 222 records without casualty_percentage, 27 without commander, 37 with empty days_engaged reproduce; search.html:112, regiment.html:102/199/204/208 verified. But 0 of 467 records lack `state` and 0 lack `key_action`, so the 'State unrecorded', 'State and formation not recorded' and 'No specific key action recorded' fallbacks (C2-C4) never fire today; only 'Commander unrecorded' (27) and the missing casualty rate (222) are live defects. Fix remains harmless and correct. |
| docs-copy-10 | CONFIRMED | Help chunk strings verified at the cited columns (start-of-string offsets, within 10-20 chars; the '445+' sentence begins at col 2258, the digits sit at col 2349): 'Toggle heatmap', 'Dismiss panel / deselect unit', 'Primary Sources' over 9 entries, '51,000', unlabeled close glyph, 12 ticks. Minor inconsistency inside the report: Exec Summary point 3 says six of nine are secondary; the finding (and my count) is seven secondary, two primary (OR, Alexander edited memoir). |
| docs-copy-11 | CONFIRMED | Three loading texts (index.html:747, bundle:101535, :101542), 'settings menu' (:102815; no other 'settings' string exists in the app region), 'Power User' (:111814-111816), 'Press Space' (:111825), three skip labels (:101581, :111929, :111967) and EXIT_BUTTONS at index.html:467 all verified. |
| docs-copy-12 | CORRECTED | 32-row tally re-counted: 3 REMOVE, 7 AFTER, 8 FIX-COPY, 14 NOW (sums to 32). Verified: H flag never read (bundle:112930/112938 destructure, `l` unused; store def only), Find Unit button calls toggleSearchPanel (113213-113218), unit glyph is a rotated filled rectangle with a disposition dot (96593-96650), 8 timeline dots with 5 colours and no gold (112192-112201), `+` reaches 16 (112998), and the 11-row colour table in 3.2a matches the code exactly (Lp 96306 vs NF 99385 vs fA 98090; 8 of 11 differ). REFUTED sub-claim in row 17: all 16 Walkthrough stops HAVE an NPS video (scripted count over bundle.pretty.js:104100-104420: 16 `video:` fields, 14 `pano:` ids; the NPS page says 'All 16 stops feature accompanying videos'). The 'stop 16 has none' claim and the proposed text '...15 also link to an NPS video' are wrong; the guide's original 'NPS video link' statement is true. Also NPS names stop 16 'National Cemetery' and has 1a/1b for McPherson Ridge, so 'named exactly as NPS' is slightly loose. |
| docs-copy-13 | CORRECTED | No generator found (I re-searched all of Downloads at unlimited depth for reportlab/SimpleDocTemplate/pdfkit/jsPDF/fpdf/'user-guide.pdf' outside JSON/PDF/node_modules: no hits). ReportLab 5.0.1 installed; pdfdoc.py:1030-1031 lists StructTreeRoot/MarkInfo as empty catalogue slots; Canvas has `lang`. Corrections: Downloads holds 7 distinct guide page counts (46, 45, 44, 43, 6, 3, 2) across dozens of copies, not six; WeasyPrint PDF/UA-1 support landed in v57 (Sept 2022) and is documented as experimental / not guaranteed valid (the report guessed '2025 releases'); WeasyPrint no longer needs Cairo (Pango only); Playwright `tagged`/`outline`/`preferCSSPageSize` exist since v1.42. Keep the veraPDF gate; it is the only proof of validity. |
| docs-copy-14 | CONFIRMED | Re-ran pdf_lint.py: fills 97.7/16.9/99.8/5.0/93.3/40.5, orphan heading on p1, 1.25:1 (my calc 1.26:1) group headers 8.7 pt on #c8a14b, 7,366 of 7,765 chars (94.9%) under 10 pt, smallest 8.0 pt. Root cause is flagged as inferred (fair). |
| docs-copy-15 | CONFIRMED | Catalogue has only /PageMode and /Pages; no /Lang, /MarkInfo, /StructTreeRoot, outline; 0 links; 4 unembedded fonts; metadata '(anonymous)'/'(unspecified)'; live header `Content-Disposition: attachment` (netlify.toml:201-204 verified) and `download: !0` at bundle:113116. Note: removing `download` alone is not enough; the header edit in 3.7 is required and both are in the fix. |
| docs-copy-16 | CORRECTED | Evidence verified (Quick Reference 111984-111996, tooltips 112312-112336, index.html LABELS 404-410, Help array, root handler; colour maps). Effort is understated: with no real source (N1) the app-side half (map, legend, unit panel reading one colour table and one hotkey registry) is a bundle patch or a source recovery, i.e. XL, not L. The static-page half (site-nav GROUPS, guide, Help chunk) is L. |
| docs-copy-17 | CONFIRMED | /sources, /about, /faq, /guide etc. all 404 live (2,203 B). Help lists 9; data metadata has 29 strings = 26 distinct works (re-derived; 'Pfanz trilogy' is a duplicate label). Gottfried conflict resolved: The Maps of Gettysburg is Savas Beatie 2007 (publisher listings), so terrain.json '2013' is the error, not Help. HMDB/Stone Sentinels `src` strings at bundle:110533 and :110569; attributionControl false at 102988 and 110777. |
| docs-copy-18 | CONFIRMED | /corrections and /contact 404 live; footer only has bare mailto (site-nav.js:194). |
| docs-copy-19 | CONFIRMED | /about 404; JSON-LD `Person` author at index.html:35; footer year/name at site-nav.js:191. Note the footer uses `new Date().getFullYear()`, so the proposed hard-coded '2026' should stay dynamic. |
| docs-copy-20 | CORRECTED | FAQ draft #9 ('Parts of the site are cached') is misleading, and the report marked it unverified: sw.js (76 lines) precaches 7 assets, caches /assets/ and /data/ responses, but HTML is network-first and never `cache.put`, so offline navigation fails entirely. Suggested answer: 'The site needs a connection; repeat visits load faster from your browser cache.' FAQ #7 ('shows the source of each answer') is false for chronology answers until M1 is fixed. |
| docs-copy-21 | CONFIRMED | /accessibility 404; the WAI structure and 'Partially conforms' rule are sound. |
| docs-copy-22 | CONFIRMED | /changelog and /version.json 404; privacy.html:21 and terms.html:21 dates hand-typed ('September 7, 2026'). |
| docs-copy-23 | CORRECTED | embed.html live headers: `X-Frame-Options: DENY` plus `Content-Security-Policy: frame-ancestors *` (and the site-wide Report-Only CSP still present despite the toml override). The drafted snippet is wrong: `embed.html` reads the `vignette` parameter (embed.html:38-43), not `story`, so `/embed?story=V-018` would silently show the day-of-year pick; and V-018 is 'Cushing's Battery' (V-017 is 'The Cannonade'). The embed is a text card (headline, blurb, link), not a map widget; say so on the page. |
| docs-copy-24 | CORRECTED | /teachers 404; privacy.html:41 verified; education.html:59-61 verified. Standards note: CCSS RH.6-8.7 is about integrating visual information such as maps; RH.9-10.7 is about integrating quantitative or technical analysis (charts, data), so it fits the casualty-data lesson, not the maps lesson (from memory of the standard text; re-check against corestandards.org). C3 D2.His.14 and D2.His.16 (9-12) left UNVERIFIED here; the report already lists them as candidates to verify. |
| docs-copy-25 | CONFIRMED | privacy.html:30 names 'documentary and report pages' but no sub-page embeds Street View (only the bundle iframe at ~110660 and CSS in index.html); PeerJS from jsDelivr at watch-together.html:19; events.mapbox.com preconnect index.html:42; AR permissions ar.html:60; terms.html:27 'embedding its widget'; 'we' voice lines verified. Caveat for the scripted acceptance test: the Report-Only CSP still allows fonts.googleapis.com and fonts.gstatic.com, which no page uses, so a CSP-host-to-privacy-text diff will fail until the CSP is tightened. |
| docs-copy-26 | CORRECTED | 356 hits and the 18 rules reproduce (inventory.csv). ESLint rule name is wrong: `no-literal-strings` does not exist; use `i18next/no-literal-string` (eslint-plugin-i18next) or `react/jsx-no-literals`. A string catalogue and lint rule need real source (N1), so effort L holds only after source recovery. The scan has recall gaps (DEVLOG missed the dev-diary paragraph on unit-rendering-reference.html). The proposed Times.yml flags '4 PM' while 6.8 allows 'about 4 PM' in prose; reconcile. |
| docs-copy-27 | CONFIRMED | 0 hits for slave/slavery/enslaved/emancipat/abolition/African American/free Black/colored/USCT/contraband in HTML, data and all JS. 'civilians' has 0 hits but 'civilian' has 2 (bundle.pretty.js:105057 John L. Burns statue, :110600 Jennie Wade); the report cites only Wade. |
| docs-copy-28 | CONFIRMED | Magnitude reproduces (my regex: 24.1 KB total, index.html 13.3 KB of 39,638 B; the report's 21.6 KB / 10.5 KB counts fewer comment kinds). |
| docs-copy-29 | CONFIRMED | Exactly reproduced: 5 titles over 60 (aftermath 71, dashboard 67, find-ancestor 67, unit-rendering 62, education 61), 10 og:description mismatches, 8 descriptions with '--'; the 21 proposed pairs re-measured (titles at most 58, descriptions 79-159). |
| docs-copy-30 | CONFIRMED | Distinct loading strings verified across pages ('Loading battlefield data...', 'casualty data', 'stories', 'order of battle', 'placement data', 'the battle', 'the battlefield', bare 'Loading...'), plus bundle strings. |
| docs-copy-31 | CONFIRMED | /glossary.html, /contact.html, /humans.txt, /security.txt, /.well-known/security.txt all 404 live. |
| docs-copy-32 | CONFIRMED | copy_patch_table.json: 64 rows; recount of every `find` against the deployed bundle and Help chunk gives 0 mismatches with the recorded counts; non-unique rows are exactly the ones the report names (Created by 2, Follow Your Ancestor 2, NPS Auto Tour 2, Tick 6, Confed 162); b53 is a stub (0 hits, note says 'in helpmodal chunk'). |
| docs-copy-33 | CORRECTED | 714/800 vs 588/843 and 'Greatest loss percentage' reproduce (100734/100756); Iverson is at :100093 and Lincoln at :100317 (report cites :100091, :100315, the start of the template literal). The Avery item is stronger than 'unverified': the known note is 'Major, Tell my Father I died with my Face to the enemy' (NC State Archives), so 'It was my fault.' is simply wrong; Gottfried year is 2007 (Help correct). |

### Additional checks (no finding change)

- Help/About: nine 'Primary Sources' and the About p1 sentence ('675 five-minute ticks ... 445+') verified verbatim in helpmodal-cfv9t0zh.js.
- Effort realism: the per-finding S/M/L sizes sum to about 45 person-days by the report's own scale (S 0.25, M 1, L 3.5), not 42. Phase 0 ('1 day, no dependency') is optimistic: item 02 (alias removal needs the brigade-file edit and the 467-to-466 propagation), item 32 (codemod + new hashed filenames + sw.js PRECACHE names + CACHE_NAME bump, all case-sensitive) and item 03 (Historian rewrite needs M1) are 2-3 days together.
- The report never ran any PDF engine; WeasyPrint/Chromium/veraPDF claims remain a spike (correctly labelled).

### Missed issues (in docs-copy scope)

**M1 (high). Historian chronology answers print the word 'undefined' (all 137).** Evidence: `historian.html:113-125` builds text from `${e.title||''} ${e.description||''} ${e.location||''}` and renders `${e.description || e.title}`; chronology_day1-3.json events have keys `event`, `location`, `tick`, `time`, `units_involved`, `significance` (day 2 also `narrative`, day 3 `flag`). Node simulation: 137 of 137 rendered answers end in 'undefined', and the search text is only the location string. Fix: use `e.event` (plus `e.narrative` when present) for both search text and render; add the source line ('Chronology, Day 1, 6:00 AM'); add a test that no rendered answer contains 'undefined' or 'null'. This must land before any Historian expansion and before the docs-copy-03/D4 wording is applied.

**M2 (medium). Casualty totals have three bases, not two.** `chronology_day3.json` tick 650 (line 60) states Union about 23,000, Confederate about 28,000, total about 51,000, while the dashboard/ledger show 23,138 / 23,025 (46,163) and the summary fields sum to 45,928. Register all three in the Sources disagreement register and make one page-level statement of basis; do not repeat '45,928 is the dashboard total'.

**M3 (medium). unit-rendering-reference.html is a live development diary.** HTTP 200 (noindex, not linked, not in sitemap) with header copy 'A working, tested proof of concept for the four rendering upgrades from the build plan ... not wired into the live map (that map's own rendering code is inside a compiled bundle with no source project to edit) ... the moment that project is recovered or rebuilt'. The inventory's DEVLOG rule missed it. Fix: delete it from the deploy or add a `force = true` 404 rule like diagnostics.html; it also loads mapbox-gl 3.24.1 from the CDN for no user benefit.

**M4 (low-medium). Rank abbreviation function is wrong and partly dead.** `bundle.pretty.js:102536-102546` (`uO`) replaces 'Major General' with 'MG', 'Brigadier General' with 'BG', 'Lieutenant General' with 'LG', then 'General' with 'Gen' and 'Colonel' with 'Col' BEFORE 'Lieutenant Colonel', so lieutenant colonels render 'Lieutenant Col ...' and the 'Lt Col' branch never matches. The report's I11 lists only 'Gen/Col/Lt Col'. Fix: one ordered map with the style-guide forms (Maj. Gen., Brig. Gen., Lt. Gen., Lt. Col.) or full titles in the roster.

**M5 (low-medium). Guide/Help claim 'search all 512 battlefield monuments'.** PDF p4 says 'all'; `data/monuments.json` `_note` itself says the park has about 1,328 monuments and markers, so 512 is the site's subset. Say '512 of the park's monuments' or state the selection rule on Sources. (The count of 512 itself is verified at bundle.pretty.js:104420-110700.)

**M6 (low-medium). Offline behaviour is not what any doc implies.** sw.js caches only 7 precache assets plus /assets and /data responses; HTML is never cached, so offline navigation fails. Any 'works offline' wording in FAQ, Press or Help must be removed (see docs-copy-20).

**M7 (medium). Embed kit example is broken as drafted.** `?story=V-018` is ignored (the param is `vignette`, embed.html:38-43) and the example title names the wrong story (V-018 is Cushing's Battery). See docs-copy-23; add a test that the generated snippet renders the requested story.

**M8 (medium). Normaliser design hazards (data corruption, not only style).** (a) Algorithmic sentence-casing of the 57 all-caps phrases corrupts proper nouns and roman numerals ('East cavalry field', 'First union artillery', 'Empty xii', 'All iii', 'Louisiana tigers charging'); (b) curly-apostrophe conversion of `designation`/`name`/`title` breaks typed-apostrophe searches in the bundle and 4 sub-pages unless each matcher normalises; (c) alias deletion leaves 'U-14BK' in union_oob_brigades.json `regiment_ids`. Fix: curated phrase map + a `_q` search key, plus a build-time referential-integrity check on every id list.
