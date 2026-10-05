# Facts: the sky, the weather and "Where the Sources Disagree"

Data layer only: verified datasets, JSON Schemas, validators and tests. No UI and no wiring. Built 2026-10-04 for pitch ideas 1 (The Sky Over the Field), 2 (data layer only) and 9 (The Number Is a Range), and for the Historian's wave-2 fact tables (`docs/plan/FINAL/14-ask-the-historian-expansion.md`, pitch 2.5b-2.5c).

Everything below is evidence, not assertion: each number is backed by a source that was fetched or computed here, and each limitation is stated. Where a human must supply a fact the placeholder is **[OWNER TO PROVIDE]**.

## 1. What is in the tree

| Path | What it is |
|---|---|
| `data-src/environment/astro_by_day.json` | Sunrise, sunset, civil and nautical twilight, solar noon, moonrise, moonset, moon transit, illumination and phase for Gettysburg (39.8309 N, 77.2311 W), June 25 to July 7, 1863, in local mean time (LMT) and an EST-equivalent column. Every value is **Computed** with method and citations and carries its cross-check numbers. |
| `data-src/environment/astro_by_tick.json` | The same sky for the 675 ticks (sun and moon altitude and azimuth, moon illumination, light class). Depends on the **unsigned** (candidate) tick clock only through `tools/environment/tickclock.mjs`; the anchors it used are embedded with a SHA-256 of `data-src/time/time_anchors.json`. |
| `data-src/environment/weather_by_day.json` | Michael Jacobs's daily observations, June 25 to July 8, with verbatim quotes, printed pages, IA leaves, units as printed, a badge per value and the verification level of every number. |
| `data-src/environment/visual_readings.json` | The page-image reading of the 1885 clipping (second extraction method). |
| `data-src/ledger/conflict_ledger.json` | The first **20 rows** of "Where the Sources Disagree": 92 values, 69 quotes, 141 numeric figures. |
| `data-src/ledger/visual_readings.json` | 28 page-image readings (tables read from the page images and re-added by the validator). |
| `data-src/*/source_windows.json` | Short text windows (with leaf and printed page) cut from the scans so quotes can be re-checked offline. Not full texts. |
| `tools/environment/`, `tools/ledger/` | Builders, validators, the independent Meeus ephemeris (`solar.mjs`), the polite fetcher, OCR parsers, JSON Schemas (`schemas/`), `make-visual-readings.mjs` (how the image readings were recorded) and `fetch-log.mjs`. |
| `tests/environment/`, `tests/ledger/` | `node:test` suites: 108 tests, 74 of them seeded-error tests that must make the validators fail. |

Large source texts live only in `tmp/env-cache/` (git-ignored) and are re-fetched by the builders. Nothing outside the owned paths was touched; `package.json` was not edited (astronomy-engine is installed in `tools/environment/package.json`, MIT).

## 2. How to run

```
node tools/environment/fetch-astro-sources.mjs        # USNO (13 requests) and NASA, cached
node tools/environment/build-astro.mjs [--check]      # astro_by_day.json + astro_by_tick.json (needs: cd tools/environment && npm install)
node tools/environment/build-weather.mjs [--check]    # weather_by_day.json (fetches/caches the sources politely)
node tools/ledger/build-ledger.mjs [--check]          # conflict_ledger.json (refuses to write a ledger that does not validate)
node tools/environment/validate.mjs [--require-cache] [--strict]
node tools/ledger/validate.mjs      [--require-cache] [--strict] [--fetch]
node --test "tests/environment/*.test.mjs" "tests/ledger/*.test.mjs"
```

The validators never touch the network (`--fetch` on the ledger validator allows polite fetches). With the cache present they re-check every quote against the cached scan; with an **empty** cache they fall back to the committed windows (and the two cache-only tests skip). `--require-cache` makes an uncached source an error. `GETTYSBURG_CACHE_DIR` overrides the cache folder.

## 3. Method: what "verified" means here

**Two independent extraction methods** for a number means two of: (1) the text layer of the scan (IA's ABBYY/DjVu OCR) or a typed transcription; (2) a reading of the page **image** (by the Claude model, from cropped, upscaled images; recorded in `visual_readings.json` with the image hash; not a human reading); (3) a second scan or transcription of the same book; and, separately, an **arithmetic checksum** (rows and columns of every table re-added, derived figures reproduced). A damaged image cell that is only *compatible* with a value is never counted as confirmation. Where the two methods disagree the disagreement is **recorded** (ledger `ocr_check.known_ocr_variants`, `ocr_note`) instead of being corrected silently.

Badges (weather): **Measured** only for an instrument reading (thermometer, rain gauge; here relayed second-hand); **Observed** for a trained observer's eye estimate (cloud, wind direction, thunder); **Reported** for a narrative statement; **Contested** when sources disagree and none is chosen; astro values are **Computed**. Ledger: nothing is averaged; each row writes why one value is *shown first* (a display rule, never a claim of truth); statuses are *adopted with reason*, *open*, *unresolvable*.

## 4. Results (real numbers)

### 4.1 Sun and moon (astro_by_day, astro_by_tick)

- 13 days, 130 event slots, 128 values (two events do not occur inside their local-mean-time day, recorded as absent with the reason).
- **Independent implementation** (`solar.mjs`, Meeus, shares no code with astronomy-engine): all 128 events agree within **4.3 s** (the validator's recomputation against the rounded UTC instants: 4.7 s); principal phases within 0.96 min.
- **USNO** (API v4.0.1, tz=-5, one request per day, whole minutes): **102 events** compared, all within **0.5 min** (mean 0.24 min), which is USNO's own rounding; one more matched event falls on the LMT day before June 25. The integer illumination agrees on **13 of 13** days (largest unrounded gap 0.48 points). The only label difference is July 7, where USNO names the state at noon (Waning Gibbous) and this file names the last quarter, which falls that afternoon.
- **NASA/Espenak** phases (UT): 5 phases compared; every difference falls in [0, 1) min (NASA appears to truncate seconds), max 0.93 min. Full Moon 1863-07-01 06:46:29 UT = 01:46 EST = 01:38 LMT.
- **Tick view**: 675 rows recomputed independently: sun altitude within 0.007 deg, moon altitude 0.016 deg, azimuth 0.07 deg, illumination 0.05 point (the stored resolution is 0.1).
- The pitch's sky numbers all hold (checked in `pitch_checks`): July 2 sunrise 04:35 and sunset 19:32 LMT (04:44 and 19:41 EST), civil dusk 20:04, moonrise 20:38 LMT (20:47 EST), 66 min after sunset, 97% lit; July 3 91%; the EST-to-LMT shift is 8.92 min. The candidate solar table in `data-src/time/time_anchors.json` (one value for all three days) agrees with the per-day computed values to within 1 minute.
- **Clock**: 1863 had no standard time (US standard zones came with the railroads on 18 November 1883; source: Wikipedia, "Time in the United States", background only). LMT is therefore a *convention* of this project, the EST-equivalent column is offered because USNO and the pitch quote it, and neither says what any 1863 clock in Gettysburg showed. The 675-tick clock is a **candidate**: five anchors flagged `needs-historian` (ticks 75, 90, 248, 275, 538) and 13 more flagged `evidence-weak` (9), `owner-sign` (3) or `owner-decision` (1). `astro_by_tick.json` also places the 29 sun and moon events of July 1-3 on the candidate clock (fractional ticks via the inverse map, `null` when outside ticks 1-675): with the candidate anchors the July 2 sunset (19:32 LMT) is tick 317.5, civil dusk tick 326.4, moonrise (20:38) tick 329.5, and the July 3 sunrise tick 452.1. These ticks move when an anchor moves; the view is rebuilt by `build-astro.mjs`, and the validator warns (error with `--strict`) when `time_anchors.json` has changed.

### 4.2 Weather (weather_by_day)

**The finding that changes the brief:** Jacobs's *Notes* (1864) contains **no weather table**. None of the three 1864 scans (Lincoln Financial Foundation/Indiana State Library, Gettysburg College, University of Michigan) contains "Thermometer", "barometer", a wind speed or the sentence "The thunder seemed tame" (searched by the validator). The numbers come from **Henry Eyster Jacobs's article "Meteorology of the Battle" in the Gettysburg *Star and Sentinel*, 1885** (letter dated July 30, 1885, reporting his father's observations; public domain by date). No scan of that page was located (the Library of Congress lists the title as not digitised); the issue date August 11, 1885 comes only from a blog caption.

- **56 observations**; 12 verbatim quotes from the *Notes* with printed page, IA leaf and BookReader index, each found in at least two scans (copy C ends at p. 43; one heading is garbled in its OCR and recorded as such); 24 quotes from the 1885 article.
- **30 tabulated temperature readings** (7 a.m., 2 p.m., 9 p.m., June 25 to July 4): **10 confirmed by two independent paths** (the Civil War Rx typed text against Emerging Civil War's typed numbers and my reading of the clipping image: all nine readings of July 1-3 and the 2 p.m. reading of July 4), 2 supported by the typed text plus a damaged but compatible image cell, **18 single-transcription** (June 25-30 and none of them checkable against a second path).
- **Wind**: the 2-or-12-miles-per-hour disagreement is in the paragraph for the **first day (July 1)**, July 2 says "wind as on preceding day", July 3 gives "Wind S. S. W., very gentle" with **no speed**. The pitch (conflict row 14) misdates it to July 3. Recorded as **Contested** with both values and their sources; the image reads 12 (low resolution, ECW most probably typed from the same image), the Rx text says 2 and shows other character-recognition style slips ("1, - 280", "87("), so a dropped digit is plausible, but nothing here chooses.
- The "wet from the rain" line is **June 26** (p. 16, after the heading "Friday, June 26." on p. 14) and describes a marching Confederate brigade and the smell of its men, not the battlefield. The "thunder-storm" on p. 41 is a **simile for the guns**; the observer's own thunderstorm note (6 p.m., July 3) is in the 1885 article. Jacobs's clock time for the cannonade ("seven minutes past 1 p. m.", p. 41) is verified in three scans and by the page image.
- The July 3 reading of 87 at 2 p.m. is the maximum of all tabulated readings (June 25 to July 4); no tabulated readings exist for July 5-8 in the article. The first rainfall figure is garbled in the transcription ("1, - 280") and is **UNVERIFIED** (read as 1.280 inches by analogy only).
- **NCEI**: the catalogue record (gov.noaa.ncdc:C01085) says "Controlled user access to the NERMS system"; the images were never fetched. The MRCC list of digitised ("keyed") FORTS stations names ten Pennsylvania stations and **not Gettysburg**, so there is no keyed copy of Jacobs's forms to cross-check against. Per the Gettysburg Experience article and the HistoryNet interview (both read), the original forms are said to be at the American Philosophical Society and as NARA/NCEI microfilm; none was seen.

### 4.3 The conflict ledger (20 rows)

Rows: 01 Union casualties (total ladder), 02 Confederate casualties, 03 Union killed, 04 Union wounded, 05 Union missing, 06 Confederate killed, 07 Confederate wounded, 08 Confederates captured, 09 Union strength, 10 Confederate strength, 11 burials in the Soldiers' National Cemetery, 12 the 1st Minnesota, 13 the 26th North Carolina, 14 the time Reynolds was killed, 15 the opening of the July 3 cannonade, 16 the guns in it, 17 wind speed July 1-2, 18 the morning of July 2, 19 Union casualties by corps (OR against Fox), 20 wounded thrown on the Union medical department. Every value cites authority, edition, printed page, tier and what it counts.

- **141 numeric figures**: **104 read by two independent extraction methods**, 17 by one method plus an arithmetic checksum, 20 by one method (six NPS web figures, five site-data figures, two figures read only from the page image because the OCR lost them, the three cemetery totals found only in the OCR text where words and digits agree, the two wind readings, and two descriptive texts).
- **Tables read from page images and re-added**: OR vol. 27 pt. 1 p. 187 (ten rows and total: every row and column adds up, 23,049), OR vol. 27 pt. 2 p. 346 (2,592 / 12,709 / 5,150 / 20,451), Fox p. 25 (22,990), Livermore pp. 102-103.
- Highlights (all with page numbers in the data): the Official Records print the Union total as **23,190** (August 1863 list, p. 113), **23,186** (Meade's report p. 118 and Halleck's p. 17, with the editors' note "But see revised statement, p. 187") and **23,049** (p. 187); Fox prints **22,990**; the site's 22,803 is p. 187 less headquarters (4) and the Artillery Reserve (242). Livermore's printed Confederate components give **28,063** (the figure the pitch lists for the Trust), while his own footnote 1 on the same page prints **28,070** (7 more, unexplained); his 1,311 killed, 6,026 wounded and 275 missing are his own additions to the returns. The NPS "83,289 US, 75,054 CS" are **Livermore's estimates**, not independent counts. The 1865 cemetery report prints 3,512 in its text and **3,555** in its own table (which adds up); 1867 prints 3,564. The 1st Minnesota's "215 of 262" is July 2 only; 224 is the battle. The Official Records give three times for Reynolds's death (10.15, 11.15, 11.30 a.m., the last two being the times Howard and Schurz learned of it) and cannonade witnesses split 7 at about 1 p.m., 1 at 1.07, 2 at about 1.30.
- 10 of the pitch's 18 seed rows are covered with verified values (row 6, Camp Letterman, only for the 20,995 and "over 20,000" figures, not the closing dates); the other eight are listed in section 6 and held back in section 7.

### 4.4 Discrepancies and corrections found

| # | What | Where |
|---|---|---|
| 1 | The weather table is in H. E. Jacobs's 1885 article, not in Jacobs's *Notes* (1864); the pitch cites the *Notes* for the "thunder seemed tame" sentence | `weather_by_day.json` PC3, PC9 |
| 2 | The wind conflict is July 1 (inherited by July 2), not July 3 | PC7, ledger WSD-17 |
| 3 | The OCR of OR vol. 27 pt. 1 p. 187 prints the Army of the Potomac total as 23,019; the page says **23,049** | `Q-or1-p187` |
| 4 | The OCR of Fox p. 25 prints 3,003 killed, 14,402 wounded and a total of 22,000 (and 5,201); the page says **3,063, 14,492, 22,990 (and 5,291)**; p. 26 "202" is **262**; p. 402 "5 i" is **51** | `Q-fox-p25-*`, `Q-fox-p26-262`, `Q-fox-p402` |
| 5 | IA's OCR text loses the 12,227 prisoner line (OR pt. 2 p. 346) and Livermore's 75,054; the page images show them | `Q-or2-p346-note`, `Q-liv-p103-strength` |
| 6 | IA's `page_numbers.json` is off by one on the Official Records leaves checked (it says 186 for p. 187, 345 for p. 346); the printed running head is the authority | `source-verify.mjs pageOfLeaf` |
| 7 | BookReader index N equals the position in `_djvu.xml` (not `leafNum` minus a constant); for the Jacobs scans N = scandata leaf minus the non-reader leaves | `ia-pages.mjs readerIndex` |
| 8 | OCR reads the 1865 cemetery report's title-page year as 1866; the image says 1865 | `pa-cemetery-1865` |
| 9 | Livermore does not print 27,823 (the pitch's figure); his components sum to 28,063 and his footnote 1 prints 28,070 | WSD-02 |
| 10 | The 1888 IA item `notesonrebelinva00jaco_0` is the **fifth, revised edition**; the three 1864 first-edition scans were used | `sources.jacobs-notes-1864.not_used` |

## 5. Rights

| Material | Tier | Rights basis |
|---|---|---|
| Official Records vol. 27 (1889), Fox (1889), Livermore (1900), Jacobs *Notes* (1864), Haskell (1908 reprint), Pennsylvania cemetery reports (1864, 1865, 1867), H. E. Jacobs's 1885 article | A1 | public domain in the United States by imprint year (before 1931); the Official Records are also a US Government publication. Only short verbatim spans are quoted; no source text is committed except small windows. |
| NPS web pages (battle detail, overview, cemetery) | B (facts only) | US Government works, but secondary compilations: numbers attributed, no prose copied. |
| The site's own data | S | shown only to show where its numbers come from. |
| astronomy-engine 2.1.19 | tool | MIT licence (Don Cross), installed in `tools/environment/package.json`; not needed by the validators. |
| USNO API, NASA/Espenak phases | authority | US Government / NASA; credit Fred Espenak, NASA/GSFC; fetched once, stored as static values with the citation, never called from visitors' browsers. |
| Wikipedia "Time in the United States" | background | CC BY-SA 4.0; used for the 1883 standard-time sentence only, no value comes from it. |
| NCEI/NARA images, American Battlefield Trust, Stone Sentinels, Busey and Martin, Krick, Nese and Harding (2025) | not used | controlled access, link-out only, or copyrighted. Facts from the books are **not** in the data (see section 7). The pitch asks to write ncei.info@noaa.gov before showing any NCEI image. |

## 6. Limitations

- The weather numbers are **second-hand**: Michael Jacobs's forms were not seen; the 1885 article is known through two typed web transcriptions and one 291-pixel image. Eighteen of the thirty temperature readings have a single typed source.
- Image readings are by a language model looking at images; every table in them is re-added, but a misread digit in a non-table sentence is only caught when OCR or arithmetic disagrees. They are a second *extraction*, not a human proof.
- The ledger is 20 rows, not the pitch's 18 seed rows verbatim: 10 of the pitch's rows are covered; the rest (Medal of Honor, Pennsylvanians seized, enslaved people with the army, Thorn's burials, Confederate dead sent to Richmond, Weaver's effects, Gardner's dates, the Black population) need sources that were not accessible or not verifiable here, and are not shown.
- The sky has no horizon model (sea-level observer, USNO's default; the ridges and Round Tops would change rise and set by minutes) and no cloud model; "the moon if the sky allowed" waits for Jacobs's 9 p.m. cloud column, which is read (July 2: cirrus clouds at 9 p.m.) but is a log entry, not a per-minute sky.
- Heat index, acoustic reports and sensory quotes (the other environment tables) were out of scope and are not started.
- The time model is a candidate; everything keyed to ticks is provisional until it is signed.

## 7. Review queue: every value that needs a human

| # | Who | Item | Where |
|---|---|---|---|
| 1 | **Owner** | Obtain or commission a read of the printed *Star and Sentinel* page (August 1885) or Jacobs's original form (American Philosophical Society, NARA/NCEI microfilm) to settle wind 2 or 12 mph, to confirm the June 25-30 readings and the rainfall figures, and to give the issue, page and column: **[OWNER TO PROVIDE]**. A web search shows the *Star and Sentinel* on Newspapers.com (a commercial site whose terms restrict automated access: not fetched); the Adams County Historical Society or Gettysburg College Special Collections can supply the page. Until then show "Contested: 2 or 12 miles per hour". | `weather_by_day.json` `sources.jacobs-meteorology-1885.page`, WSD-17 |
| 2 | Owner | Written permission from NCEI (ncei.info@noaa.gov) before any image of Jacobs's forms is shown; do not scrape NERMS. | pitch 1 rights notes |
| 3 | Owner | Decide whether to display Contested values and the "shown first" rules as written. | ledger `shown_first` |
| 4 | Historian | Two compilations of the Union total: is Fox's 1886 "Kirkley" statement (22,990) a revision of the nominal lists and which does the Park use (p. 187's 23,049)? | WSD-01, 19 |
| 5 | Historian | Union strength 93,921 and Confederate 71,699 in the site data are attributed to Busey and Martin as cited by Wikipedia and are **unverified**; check pp. 125 and 260 before display. | WSD-09, 10 |
| 6 | Historian | The pitch's 3,354 (cemetery), 843 and "714 of 800" (26th North Carolina), 179 by name (1st Minnesota), the 8th Virginia's 92.2% against 76.7%: no source found. | WSD-11, 12, 13 held back |
| 7 | Historian | First Minnesota: the split 50/174 (p. 26) or 51/173 (p. 402); Lochren not opened. | WSD-12 |
| 8 | Historian | Time anchors: tick 28 (Reynolds, 10:15, evidence-weak) against 10.15 / 11.15 / 11.30; tick 518 (13:07) rests on Jacobs alone; the five `needs-historian` anchors (75, 90, 248, 275, 538) move every tick-keyed sky value. | WSD-14, 15; `astro_by_tick.json` |
| 9 | Historian | Whether to show Livermore's printed Confederate components with his additions labelled as estimates. | WSD-02 |
| 10 | **Counsel** | Facts-only attribution of Busey and Martin and Krick figures (not in the data until a page is verified); the pre-1931 arithmetic (every A1 work here is 1908 or earlier); the short verbatim quotations. | pitch part 5 |
| 11 | Owner | Whether to cite NPS figures that are Livermore's own estimates as "NPS" or as "Livermore, repeated by NPS". | WSD-09, 10 |

Held back, not verified (and therefore not in the ledger): Busey and Martin (23,231; 23,055; the two strengths), Krick (22,587), Stone Sentinels (22,709; 160,311), the American Battlefield Trust (28,063, which equals Livermore's sum), "more than 165,000", Medal of Honor counts, Camp Letterman closing dates, Pennsylvanians seized, enslaved people with the army, Thorn's 91-105 burials, Richmond-bound Confederate dead, Weaver's effects, Gardner's dates, the Black population of Gettysburg.

## 8. Notes for the Historian ingest (other workstream)

The page images show real OCR digit errors in the very passages the Historian will index (section 4.4, items 3-8): a figure matched only against the OCR text can be wrong by a digit. Printed pages should come from the leaf's own running head with neighbour voting (as in `source-verify.mjs`), not from `_page_numbers.json`. `tools/environment/ia-pages.mjs` and `source-verify.mjs` are small, dependency-free and may be reused read-only.

The complete list of network reads, with hashes, is in [`FETCH-LOG.md`](FETCH-LOG.md).
