# copy_lint report: baseline/dist

Generated 2026-10-04 by `node tools/copy/copy_lint.mjs baseline/dist --report`. 103 files, 11,940 user-facing strings, facts from `data-src/build/facts.json` (facts.json).

| Rule | Sev | Findings | Files | What it catches |
|---|---|---:|---:|---|
| DASH | E | 1,792 | 87 | Typewriter dash ("--") |
| HYPHEN | W | 0 | 0 | Spaced hyphen used as a dash |
| TICK | E | 56 | 16 | Developer word "tick" |
| UNDEFINED | E | 0 | 0 | Programming value shown as text (undefined, NaN, [object Object]) |
| TODO | E | 0 | 0 | Work-in-progress marker (TODO, FIXME, TBD, HACK) |
| ALIAS | E | 1 | 1 | Database wording ("alias for") |
| IDLEAK | E | 24 | 10 | Internal identifier shown to the visitor |
| DEVLOG | E | 11 | 7 | Development history or process voice in product copy |
| AIPERSONA | E | 4 | 3 | AI or persona wording for Ask the Historian |
| COUNT | E | 9 | 4 | Typed count that disagrees with facts.json |
| QUOTES | W | 2,029 | 90 | Straight quote or apostrophe in prose |
| NAME | E | 171 | 49 | Retired or inconsistent name |
| TIMEFMT | E | 388 | 12 | Clock written in a non-standard format |
| REALTIME | E | 28 | 10 | "Real time", "minute by minute", "five-minute" claims |
| CASUALTY | E | 71 | 24 | Casualty abbreviation (KIA, WIA, MIA) |
| ABBREV | W | 2 | 1 | Unexplained abbreviation |
| EMOJI | E | 31 | 11 | Emoji or pictograph in copy or a label |
| WE | E | 9 | 4 | First person plural ("we", "our", "us") |
| HEDGE | W | 5 | 3 | Apologetic intensifier ("genuine", "real, working") |
| ELLIPSIS | W | 9 | 4 | Three dots instead of an ellipsis |
| RANGE | W | 26 | 10 | Date range with a hyphen |
| CAPS | W | 92 | 31 | ALL CAPS phrase typed in source |
| ABSENCE | W | 2 | 2 | A data gap phrased as a fact about the past |
| PERSONAL_EMAIL | E | 4 | 2 | Personal Gmail address in shipped text |
| CLAIM | E | 0 | 0 | Claim of accuracy, review or conformance without evidence |
| **Total** | | **4,764** | |  |

By string kind: html-attr 75, html-link 2, html-text 183, html-title 29, js-string 548, json 3,920, json-ld 7

## Examples

### DASH: Typewriter dash ("--")
- `aftermath.html:44`: ` -- `
- `aftermath.html:56`: ` -- `
- `aftermath.html:66`: ` -- `

### TICK: Developer word "tick"
- `aftermath.html:44`: `tick`
- `aftermath.html:44`: `tick`
- `assets/BookmarkPanel-C5YT4b5k.js:1`: `Tick`

### ALIAS: Database wording ("alias for")
- `data/oob/union_regiments_i_ii_corps.json /regiments/7/designation`: `alias for`

### IDLEAK: Internal identifier shown to the visitor
- `data/casualty_apportionment.json /notable_intensity_notes/most_compressed_confederate/unit`: `C-I-3`
- `data/casualty_apportionment.json /notable_intensity_notes/longest_sustained_action/unit`: `C-II-2`
- `data/chronology_day2.json /events/27/event`: `US-017`

### DEVLOG: Development history or process voice in product copy
- `ar.html:56`: `we haven't`
- `dashboard.html:263`: `should be reconciled`
- `data/oob/union_artillery.json /corps_artillery_brigades/0/batteries/0/key_action`: `YouTube vignette`

### AIPERSONA: AI or persona wording for Ask the Historian
- `historian.html:186`: `I couldn't find`
- `historian.html:204`: `I'm ready`
- `index.html:377`: `AI-style`

### COUNT: Typed count that disagrees with facts.json
- `assets/HelpModal-CFV9T0zH.js:1`: `445+ Union and Confederate units` ("445+ Union and Confederate units": facts say 569 (units.total))
- `find-ancestor.html:48`: `467 Union and Confederate regiments` ("467 Union and Confederate regiments": facts say 465 (units.regiments))
- `index.html:15`: `467 regiments` ("467 regiments": facts say 465 (units.regiments))

### QUOTES: Straight quote or apostrophe in prose
- `404.html:25`: `'`
- `404.html:26`: `'`
- `404.html:26`: `'`

### NAME: Retired or inconsistent name
- `404.html:8`: `Gettysburg Animated Battlefield Map` ("Gettysburg Animated Battlefield Map" -> "Gettysburg Interactive Map")
- `aftermath.html:7`: `Gettysburg Animated Battlefield Map` ("Gettysburg Animated Battlefield Map" -> "Gettysburg Interactive Map")
- `aftermath.html:10`: `Gettysburg Animated Battlefield Map` ("Gettysburg Animated Battlefield Map" -> "Gettysburg Interactive Map")

### TIMEFMT: Clock written in a non-standard format
- `assets/index-Cg8FAMXN.js:3421`: `1 p.m.`
- `assets/index-Cg8FAMXN.js:3421`: `4 p.m.`
- `assets/index-Cg8FAMXN.js:3421`: `6:30 p.m`

### REALTIME: "Real time", "minute by minute", "five-minute" claims
- `assets/HelpModal-CFV9T0zH.js:1`: `five-minute`
- `assets/index-Cg8FAMXN.js:3355`: `real time`
- `assets/index-Cg8FAMXN.js:3421`: `five-minute`

### CASUALTY: Casualty abbreviation (KIA, WIA, MIA)
- `assets/index-Cg8FAMXN.js:3355`: `KIA`
- `assets/index-Cg8FAMXN.js:3421`: `KIA`
- `data/chronology_day3.json /events/27/event`: `KIA`

### ABBREV: Unexplained abbreviation
- `assets/index-Cg8FAMXN.js:3421`: `Lt Col`
- `assets/index-Cg8FAMXN.js:3421`: `Confed`

### EMOJI: Emoji or pictograph in copy or a label
- `assets/index-Cg8FAMXN.js:3355`: `〰`
- `assets/index-Cg8FAMXN.js:3355`: `〰`
- `assets/index-Cg8FAMXN.js:3355`: `⚠`

### WE: First person plural ("we", "our", "us")
- `ar.html:56`: `we`
- `privacy.html:26`: `we`
- `privacy.html:30`: `We`

### HEDGE: Apologetic intensifier ("genuine", "real, working")
- `ar.html:56`: `real, working`
- `turning-points.html:65`: `genuine`
- `turning-points.html:80`: `genuinely`

### ELLIPSIS: Three dots instead of an ellipsis
- `assets/index-Cg8FAMXN.js:3355`: `...`
- `assets/index-Cg8FAMXN.js:3421`: `...`
- `assets/index-Cg8FAMXN.js:3421`: `...`

### RANGE: Date range with a hyphen
- `assets/index-Cg8FAMXN.js:3391`: `July 2-3`
- `assets/index-Cg8FAMXN.js:3415`: `July 4-5`
- `assets/index-Cg8FAMXN.js:3415`: `July 4-5`

### CAPS: ALL CAPS phrase typed in source
- `assets/index-Cg8FAMXN.js:3421`: `ANIMATED BATTLEFIELD MAP`
- `data/chronology_day1.json /events/4/event`: `FIRST SHOT`
- `data/chronology_day1.json /events/6/event`: `FIRST UNION ARTILLERY`

### ABSENCE: A data gap phrased as a fact about the past
- `find-ancestor.html:121`: `unrecorded`
- `search.html:112`: `unrecorded`

### PERSONAL_EMAIL: Personal Gmail address in shipped text
- `privacy.html:47`: `gettysburginteractivemap@gmail.com`
- `privacy.html:47`: `gettysburginteractivemap@gmail.com`
- `terms.html:42`: `gettysburginteractivemap@gmail.com`


## Scope of this scan

- Tree: `baseline/dist` (the site as served on 2026-09-30, locked by `tools/t0/baseline.lock.json`; read-only). 103 of its files are text files the linter reads: 27 HTML pages, `site-nav.js`, `manifest.json`, the four JavaScript assets and the data files under `data/`. Not read: `sw.js`, `robots.txt`, `data/placement_schema.json` (schema documentation, 7 of the raw ` -- ` occurrences), images.
- The entry bundle `assets/index-Cg8FAMXN.js` is read only outside two library regions (React and zustand up to the app's first store function; the Mapbox GL 3.24.1 wrapper), so library messages are not counted as site copy. The regions are markers in `tools/copy/scan-config.json`; if a marker is missing the linter says so and scans the whole file.
- Data JSON: every string value except identifier, URL, coordinate and `metadata` fields; straight quotes are judged only in prose fields (identity fields such as designations stay ASCII on purpose).
- Counts follow the rules in `docs/content/STYLEGUIDE.md` section 16. They are not the counts of the planning inventory (`inventory.py` of the plan is not in the repository, and its scope differed). One cross-check holds: the plan counts 1,799 raw ` -- ` outside metadata, and this scan counts 1,792 plus the 7 in the excluded schema file.
- Ratchet: `tools/copy/baseline.json` records these findings as known (4,764 fingerprints, 21 rules with entries) with expiry dates between 2026-12-31 and 2027-03-31; a new finding, a stale entry or an expired rule fails `node tools/copy/copy_lint.mjs`.

## Companion measurements (2026-10-04)

The candidate pages are held to a stricter standard than the production tree: every rule, warnings included, no baseline.

| Target | Command | Findings |
|---|---|---:|
| Eight trust pages, `changelog.json`, `corrections.json` | `node tools/copy/copy_lint.mjs candidates/trust-pages/*.html candidates/trust-pages/*.json --root candidates/trust-pages --no-baseline --strict` (the manifest file is machine data, not visitor text) | 0 |
| Guide `index.html` and `print.html` (Letter and A4) | run by `tools/guide/build-guide.mjs` before anything is written | 0 |
| Text layer of both guide PDFs | `tools/guide/lib/textlayer.mjs`: occurrences beyond what the HTML exempts (code, key names, former names inside `data-lint-allow`) | 0 (15 exempt occurrences counted in each) |

The deployed `user-guide.pdf` and the candidate guide, measured by the same tool (`python tools/guide/pdf_tools.py lint FILE`):

| Measure | Deployed `baseline/dist/user-guide.pdf` | Candidate Letter | Candidate A4 |
|---|---:|---:|---:|
| Pages | 6 | 13 | 12 |
| Size | 14.3 KB | 400.5 KB | 399.5 KB |
| Tagged (structure tree) | no | yes, 1,293 elements | yes, 1,293 elements |
| Language | none | en-US | en-US |
| Title / author | "(anonymous)" / "(anonymous)" | real title / Mike Legere | same |
| Bookmarks | 0 | 26 | 26 |
| Fonts embedded | 0 of 4 | 6 of 6 | 6 of 6 |
| Page fill, lowest page (last page) | 2.8% (40.1%) | 87.8% (31.0%) | 81.7% (74.4%) |
| Characters at 10 pt or more | 5.3% | 95.7% | 96.0% |
| Text below 4.5:1 contrast | 6 spans | 0 | 0 |
| Orphan headings | 1 | 0 | 0 |
| Links | 0 | 13 internal, 3 external | 13 internal, 3 external |

These are the tool's own measurements, not a PDF/UA validation: veraPDF and a screen-reader read have not been run (see `docs/content/OWNER-INPUTS.md`, section 7).

## What this linter cannot see

- A value that is `undefined` only at run time (the Historian printing the word for every chronology answer was such a case; page patch PGC-hist-chron fixes it in release R1c). Static scans read literals; such defects need a browser test.
- Text assembled from several literals, and text drawn on a canvas.
- Meaning: it can flag "real time" but not a sentence that is false in another way. Every statement on the candidate pages is traced to a file by a separate test instead.
