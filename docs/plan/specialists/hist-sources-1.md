# hist-sources-1 - Ask the Historian: Source Catalog, Part 1 (public-domain / reusable primary and secondary sources)

Specialist: hist-sources-1 | Date of research: 2026-09-30 | Mode: read-only, no build, nothing deployed
Long-form deliverables: this report and the machine-readable catalog `hist-sources-1.catalog.json` (same folder; 39 catalog entries (38 ranked sources + the Internet Archive API layer), 7 excluded/permission-required items, 4 documented gaps; every URL carries a `verified` block).
Scratch data (raw OCR samples, parsers, measurement scripts): `plan-work/tmp-hist-sources-1/`.

---

## 1. Executive summary

**What the owner asked for (Historian part 1):** catalog the public-domain or clearly reusable sources that could greatly expand the Ask-the-Historian databases: Official Records (Series I, Vol. 27, Parts 1-3), Battles and Leaders v3, Southern Historical Society Papers, the Bachelder material, state monument-commission reports, regimental histories, Fox, Phisterer, Livermore, Confederate Military History, Gettysburg Address versions, Gettysburg/Adams County newspapers, Library of Congress photographs and maps, David Rumsey, Hathi/Internet Archive APIs and Project Gutenberg - with URLs, formats, sizes, OCR quality, exact rights statements, extraction methods, record counts, data types, bias notes, priority and effort.

**What the site has today (measured):** `historian.html:48` says it answers only from "467 regimental records, 24 narrative vignettes, 137 chronology events, and 30 mapped terrain features"; `historian.html:76-79` fetches only `/data/oob/*`, `/data/vignettes*`, `/data/chronology*`, `/data/terrain.json` (about 0.8 MB of hand-written JSON: 0.51 MB in top-level `data/*.json` plus 0.31 MB in `data/oob/`). No primary report is ingested, so no answer can quote or page-cite a source.

**Bottom line.** Almost everything needed is public domain and available as high-quality OCR text on the Internet Archive; the expensive parts are (a) the unit-alias crosswalk, (b) validating tables (Fox), (c) maps (georeferencing/digitising), and (d) the one local newspaper that is free (The Compiler) whose OCR is unusable without re-OCR. Five surprises the plan must respect:

1. **The OR is easy but the "obvious" hosts are not.** Cornell's Making of America OR page now just links to HathiTrust; HathiTrust's babel pages are blocked to scripted clients (Cloudflare 403) and robots.txt disallows `/cgi/` for generic agents; eHistory (OSU) returned 403 to both curl and WebFetch. The Internet Archive holds three clean UIUC scans of Vol. 27 Parts 1-3 (text 3.97 / 3.88 / 3.41 MB, OCR proxy 0.98) - use those, and use Hathi only as a rights oracle (Bib API works: `rightsCode: pd`).
2. **The free Gettysburg newspaper OCR is garbage.** `The Compiler` (Gettysburg, 1857-66) is at the Pennsylvania Newspaper Archive (51 issues in 1863; no July 6 issue) but the sampled pages score 0.43-0.48 on the OCR proxy vs 0.93-0.98 for Internet Archive books. The Adams Sentinel is not freely available anywhere I could read (subscription via Gettysburg College; LoC record is title-only).
3. **Bachelder is not "free".** The Ladd edition of *The Bachelder Papers* (Morningside 1994-95) is copyrighted (IA lending copy only); the original papers are at the New Hampshire Historical Society with a paid image-request process ($25/$50 per item). Only Bachelder's *published* maps/guides (LoC, IA) are freely reusable. Dealer pages describe 28 time-stamped "hourly" Bachelder maps - the single best minute-level cartographic source - but I could not find them in any repository (see gap G-03).
4. **The site's existing OOB data already cites copyrighted compilations** (Busey & Martin 1994, Pfanz, Hessler & Motts, Moe, Desjardin listed in `data/oob/union_regiments_i_ii_corps.json` metadata). Facts are not copyrightable, but the plan should give every number a PD-derived source (OR returns, Fox, Phisterer, Dyer) and a reconciliation policy (finding 04).
5. **The site's unit count is 570, not 467:** deployed `data/oob/*.json` contain 467 `regiment_id` records plus 103 `battery_id` records (measured). New York (75) + Pennsylvania (74) alone are 26% of them - so two state books (NY Final Report, Pennsylvania at Gettysburg) give the biggest single jump in per-unit depth.

**Recommended order (P0 first):** OR27 Pt1 -> OR27 Pt2 -> NY Final Report -> Pennsylvania at Gettysburg -> Fox -> OR27 Pt3 -> Battles & Leaders v3 -> SHSP -> LoC maps -> LoC photographs (details in section 4 and the phasing in section 8).

**Yield if P0+P1 are ingested (basis in each card; MEASURED unless labelled ESTIMATE):**

| Data type | Expected volume |
|---|---|
| Numbered OR report entries | 589 (Nos. 1-589), of which ~371 Union Gettysburg items and 166 Confederate ANV items |
| Regiment/battery-level reports | ~296 (208 Union + 88 Confederate; heuristic classification, +/-10%) |
| Time expressions in OR text | ~5,420 (regex heuristic; includes false positives) |
| NY unit narratives | 68 infantry regiments/battalions + 19 batteries (verified in Fox text) |
| Participant-narrative articles | ~25 (Battles & Leaders) + ~150 shortlisted from SHSP (ESTIMATE) + Joint Committee witnesses |
| Photographs | 185 LoC records for query 'gettysburg', 75 dated July 1863 |
| Maps | 8 LoC items (Bachelder 1863/1876/1883, Warren, Woeltje & Cutting 1888) + 5 NARA RG 77 items |
| Newspapers | 1,425 Chronicling America pages (July 4-31, 1863) for curation; 1863 Compiler issues need re-OCR |
| Raw text volume | P0 ~75 MB (OR 11.3 + B&L 3.3 + SHSP 49.0 + NY ~4.6 + PA ~2-5 + Fox 2.3); after Gettysburg filtering ~30 MB (ESTIMATE) |

---

## 2. Method, verification and limits

**Protocol.** Every URL cited in the catalog was fetched on 2026-09-30 either with `curl` (HTTP status, content type and byte range recorded in the JSON `verified` block) or through the WebFetch tool (page content read). Where a host blocked scripted access I say so; those items are labelled "search-result only" or "NOT VERIFIED". Numbers labelled MEASURED were computed by me on downloaded OCR text or API responses (the scripts are in the scratch folder); anything else is labelled ESTIMATE.

**Downloads.** To measure OCR quality and record counts I downloaded only public-domain OCR text into the scratch folder: OR27 Parts 1-3 (~11.3 MB), Battles & Leaders v3 (3.3 MB), Fox (2.3 MB), NY Final Report v1 (1.4 MB), OR Atlas text (0.4 MB), Joint Committee v1 (3.4 MB), SHSP vols 1-43 (49 MB, counted then not kept as a corpus), plus ~150-KB range samples of ~30 other items, one 2 MB NPS PDF, and a handful of small Pennsylvania Newspaper Archive pages. No zips, no large PDFs, nothing was written outside the scratch folders.

**OCR-quality proxy.** Share of >=3-letter tokens found in an 8,049-word vocabulary built from tokens seen >=8 times in OR27 Pt1+2, Battles & Leaders v3 and Fox. It is biased toward military vocabulary but comparisons between sources are meaningful (Appendix A). A sample "human" check: Chamberlain's OR report (No. 196, p.622) contains only stray errors ('repori', 'ir', 'm^').

**Rate-limit facts found (they constrain the ingest design):**
- loc.gov JSON/YAML API: 20 requests/minute, 1-hour block; text services and image services 150/min; paging limited to 100,000 items (LoC "working within limits" page, read via WebFetch). Some loc.gov HTML pages and `/manifest.json` returned HTTP 403 to my script while `?fo=json` and `tile.loc.gov` worked.
- HathiTrust babel: `robots.txt` for generic agents is `Disallow: /cgi/` with `Crawl-delay: 1`; Cloudflare 403 on scripts. The Bibliographic API (`catalog.hathitrust.org/api/volumes/brief/...`) worked.
- Project Gutenberg: site "intended for human users only"; bulk via `robot/harvest` with `wget -w 2` or a mirror; returned 503/504 intermittently (so I could not enumerate its catalog via the Gutendex API).
- Internet Archive: no published numeric limit; I used 1-3 req/s with a descriptive User-Agent.
- Pennsylvania Newspaper Archive: intermittent timeouts.

**Could not verify (stated plainly):** eHistory (403); HathiTrust babel pages and Data API terms (403); NARA Catalog record content (JS shell only); the existence of Bachelder's 28 hourly maps in any repository; Rumsey record content beyond what WebFetch summarised (Luna site showed an access-verification interstitial); GDG's TLS certificate is expired (WebFetch refused, curl -k returned 200).

**Public-domain rule used.** US works published before 1931 are treated as public domain in 2026 (95-year term; the Chronicling America guide and HathiTrust both state the 95-year rule; the arithmetic to "before 1931" is mine - confirm with counsel). All ingest targets except the NPS 1932/1993 monument lists (federal works, 17 U.S.C. 105) were published 1863-1917. **Reprints and derivatives (Dyer 1959, OR 1971, Ladd 1994) are not public domain.**

---

## 3. Site-side context (measured from the deployed `data/oob/*.json`)

Records with `regiment_id` or `battery_id`: 570 unique (467 + 103); 329 Union / 241 Confederate. By state (Union unless marked C): NY 75, PA 74, VA(C) 59, GA(C) 38, NC(C) 33, MA 18, AL(C) 17, OH 14, SC(C) 13, NJ 13, MS(C) 12, MI 11, LA(C) 10, ME 10, VT 9, WI 6, IN 5, CT 5, MD 4, WV 4, IL 3, NH 3, DE 2, MN 1, RI 1; state unknown: 55 Union + 48 Confederate. One alias row exists (`U-14BK`, alias_for `U-84NY`, the origin of audit H7).

**Which source families cover which units**

| Units on site | Best PD sources (catalog ids) |
|---|---|
| NY 75 | SRC-03 (NY Final Report), SRC-19 (Phisterer), SRC-01, SRC-05 |
| PA 74 | SRC-04 (PA at Gettysburg), SRC-18 (Bates), SRC-01, SRC-05 |
| Confederate 241 (VA 59, GA 38, NC 33, AL 17, SC 13, MS 12, LA 10...) | SRC-02 (~88 regiment/battery reports only), SRC-12 (Clark NC: 33 units), SRC-25 (CMH), SRC-24 (Oates AL, Polley TX), SRC-08 (SHSP) |
| MA 18, OH 14, NJ 13, MI 11, ME 10, VT 9, WI 6, IN 5, CT 5 ... | SRC-01 plus SRC-14/15/16/17/26 (state books; gaps for WI/MA/DE/NH/WV, section 6) |

**Existing provenance in the data:** `data/oob/union_regiments_i_ii_corps.json` `metadata.sources` cites Busey & Martin (1994), OR Vol. 27 Parts I-II, Pfanz (1987, 2001), Hessler & Motts (2015), Moe (1993), Desjardin (1995), Dawes (1890). Numeric fields (`strength`, `casualties`, `casualty_percentage`) therefore descend largely from copyrighted compilations (finding hist-sources-1-04).


## 4. Ranked source catalog

### 4.1 Summary table

| Rank | ID | Tier | Source | Rights | Effort | Key yield |
|---|---|---|---|---|---|---|
| 1 | SRC-01 | P0 | Official Records (War of the Rebellion), Series I, Vol. 27, Part 1 - Reports (Union) and Gettysburg Campaign s | public domain | L | ~371 Union Gettysburg items; ~208 regiment/battery reports; 2,269 time expressions |
| 2 | SRC-02 | P0 | Official Records, Series I, Vol. 27, Part 2 - Reports: Middle Dept./Dept. of the Susquehanna/W.Va. (Union) and | public domain | L | 166 Confederate ANV items; ~88 regiment/battery reports |
| 3 | SRC-03 | P0 | New York Monuments Commission - Final Report on the Battlefield of Gettysburg (3 vols., incl. Fox, 'New York a | public domain | M | 68 NY infantry + 19 batteries; 75 NY unit records |
| 4 | SRC-04 | P0 | Pennsylvania at Gettysburg: Ceremonies at the dedication of the monuments erected by the Commonwealth of Penns | public domain | M | 74 PA unit records; veteran histories |
| 5 | SRC-05 | P0 | Fox, William F. - Regimental Losses in the American Civil War, 1861-1865 (1889) | public domain | L | Union losses by regiment/battle (needs validation) |
| 6 | SRC-06 | P0 | Official Records, Series I, Vol. 27, Part 3 - Correspondence, orders, returns (Union June 3-Aug 3 1863; Confed | public domain | L | 2,204 clock times; timestamped dispatches |
| 7 | SRC-07 | P0 | Battles and Leaders of the Civil War, Vol. 3 (Gettysburg section pp. ~244-440 + Doubleday maps) | public domain | M | ~25 Gettysburg participant articles |
| 8 | SRC-08 | P0 | Southern Historical Society Papers (SHSP), vols. 1-43 (1876-1920; later volumes exist, not measured) | public domain | L | 2,949 Gettysburg mentions in 43 vols; ~150-article shortlist (ESTIMATE) |
| 9 | SRC-09 | P0 | Library of Congress - Bachelder maps (1863 isometric; 1876/1883 three-sheet troop-position maps) and G.K. Warr | public domain (age) / free to use per LoC G&M statement | XL | 8 LoC map items; Bachelder + Warren georef |
| 10 | SRC-10 | P0 | Library of Congress - Civil War Glass Negatives and Related Prints (Brady/Gardner/O'Sullivan/Gibson/Smith), Ge | no known restrictions on publication (LoC statement); PD by  | M | 185 records; 75 dated July 1863 |
| 11 | SRC-11 | P1 | Itinerary of the Army of the Potomac and co-operating forces in the Gettysburg campaign, June 5 to July 31, 18 | public domain | M | unit-day itinerary + atlas plates 43/95 |
| 12 | SRC-12 | P1 | Clark, Walter (ed.) - Histories of the several regiments and battalions from North Carolina, in the great war  | public domain | M | up to 33 NC regiments |
| 13 | SRC-13 | P1 | Report of the Joint Committee on the Conduct of the War (1865) - Army of the Potomac vol. incl. Gettysburg tes | public domain | M | 33 witness headings; 345 Gettysburg / 212 Sickles hits |
| 14 | SRC-14 | P1 | Maine at Gettysburg (Report of Maine Commissioners, 1898) + 20th Maine set (Gerrish 'Army Life' 1882; Reunions | public domain | M | 10 ME units; 20th Maine triangulation |
| 15 | SRC-15 | P1 | New Jersey: Final Report of the Gettysburg Battle-field Commission of New Jersey (1891) + Toombs, New Jersey T | public domain | S | 13 NJ units |
| 16 | SRC-16 | P1 | Michigan at Gettysburg (1889 dedication proceedings) + Curtis, History of the Twenty-fourth Michigan of the Ir | public domain | S | 11 MI units; 24th Michigan (549 hits) |
| 17 | SRC-17 | P1 | Minnesota in the Civil and Indian Wars 1861-1865 (2 vols., 1890-93) + Holcombe, History of the First Regiment  | public domain | S | 1st Minnesota July 2 narrative |
| 18 | SRC-18 | P1 | Bates, Samuel P. - History of Pennsylvania Volunteers, 1861-5 (5 vols., 1869-71) | public domain | M | 74 PA regimental sketches |
| 19 | SRC-19 | P1 | Phisterer, Frederick - New York in the War of the Rebellion, 1861 to 1865 (3rd ed., 1912, 6 vols.) | public domain | M | 75+ NY unit service records; NY alias table |
| 20 | SRC-20 | P1 | Dyer, Frederick H. - A Compendium of the War of the Rebellion (1908) | public domain (1908 original only) | M | ~330 Union unit service summaries |
| 21 | SRC-22 | P1 | GNMP Commission monument-location lists (1903, 1912, 1916, 1921 on IA; 1932 and 1993 on npshistory.com) + annu | public domain | M | monument/marker register by unit (1903-1993 editions) |
| 22 | SRC-23 | P1 | Period battlefield guides by Bachelder (1864-1904), Vanderslice (1897/1899), Wert (1886), Hammond (1899) | public domain | M | 100-200 tour stops/places (ESTIMATE) |
| 23 | SRC-24 | P1 | Confederate regimental memoirs: Oates, The War Between the Union and the Confederacy (1905; 15th Alabama); Pol | public domain | S | Oates (15th AL) + Polley (Texas Brigade) chapters |
| 24 | SRC-27 | P1 | The Compiler (Gettysburg, Pa.) 1857-1866 - Pennsylvania Newspaper Archive (Penn State / NDNP) | public domain (NDNP position: pre-1931 newspapers) | XL | 51 issues in 1863; 300-600 articles after re-OCR (ESTIMATE) |
| 25 | SRC-28 | P1 | Chronicling America (LoC / NDNP) - July 1863 national coverage of the battle via loc.gov JSON API | public domain (NDNP position) | M | 1,425 pages (July 4-31, 1863); curate 50-150 articles |
| 26 | SRC-30 | P1 | NARA Record Group 77 (Civil Works Map File) Gettysburg maps + NPS Gettysburg museum collection drawings (GNPC  | public domain (US Government records) | M | 5 NARA maps + possible 28 hourly maps (unverified) |
| 27 | SRC-21 | P2 | Livermore, Thomas L. - Numbers and Losses in the Civil War in America, 1861-65 (1900/1901) | public domain | S | aggregate strength/loss tables (cross-check) |
| 28 | SRC-25 | P2 | Evans, Clement A. (ed.) - Confederate Military History (12 vols., 1899) | public domain | M | 100-300 Confederate state passages (ESTIMATE) |
| 29 | SRC-26 | P2 | Smaller state/regiment commemorative reports: Vermont (1890), Maryland (1891), Illinois (1892), Indiana (1913) | public domain | M | ~40 units via small state books |
| 30 | SRC-29 | P2 | Gettysburg Address - five manuscript versions (Nicolay, Hay, Everett, Bancroft, Bliss) + Everett oration + con | public domain | S | 5 versions of the Address |
| 31 | SRC-31 | P2 | Project Gutenberg - Gettysburg-related e-texts (Haskell #33121; Drake #49530; Storrick #50504; H.D. Longstreet | public domain in the U.S. (Gutenberg) | S | 8 clean-text books |
| 32 | SRC-32 | P2 | Wikimedia Commons - Gettysburg categories (secondary image source / cross-check) | varies per file (mostly PD-US) | S | 296 files in main category (per-file licences) |
| 33 | SRC-33 | P2 | NPS History e-Library (npshistory.com) - Gettysburg administrative histories, Cultural Landscape Reports, Gett | mixed: federal works are public domain; contractor/outside-a | M | 10-30 usable NPS documents (ESTIMATE) |
| 34 | SRC-36 | P2 | HathiTrust Digital Library - use for metadata and rights verification only (not bulk text) | rights codes per volume (pd = public domain worldwide/US) | S | rights snapshots for every ingested IA item |
| 35 | SRC-34 | P3 | Confederate Veteran (serial, 1893-1932) - adjacent source (candidate for hist-sources part 2) | public domain for issues published <= 1930 | L | hundreds of anecdotes (ESTIMATE); 40 volumes |
| 36 | SRC-35 | P3 | Gardner's Photographic Sketch Book of the War (1866) - original captions | public domain | S | ~12 caption plates |
| 37 | SRC-37 | P3 | David Rumsey Map Collection (Stanford) - Gettysburg maps (Warren, Hotchkiss) - DISPLAY-ONLY, non-commercial li | NON-COMMERCIAL license on scans (CC BY-NC-SA 3.0 per about p | S | link-out only (non-commercial licence) |
| 38 | SRC-38 | P3 | eHistory (Ohio State) - Official Records transcriptions - NOT VERIFIED | UNVERIFIED | S | none (unverified host) |
| 39 | SRC-39 | INFRA | Internet Archive access APIs (advancedsearch, metadata, download, OCR derivatives) - the fetch layer for ~80%  | per-item (see each source card) | S | fetch layer for ~110 IA items (no records of its own) |


### 4.2 Source cards (P0 first)

### SRC-01  [P0 | rank 1]  Official Records (War of the Rebellion), Series I, Vol. 27, Part 1 - Reports (Union) and Gettysburg Campaign summary, orders of battle, casualty returns
*Category:* official_records  |  *Publisher/year:* U.S. War Department / GPO, 1889 (Chap. XXXIX 'The Gettysburg Campaign')

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/warofrebellion271unit  [HTTP 200] - UIUC copy; ABBYY FineReader 11; 500 ppi; 1,190 images; 2.64 GB item
- [ocr-text] https://archive.org/download/warofrebellion271unit/warofrebellion271unit_djvu.txt  [HTTP 206 (redirects)] - 3,970,479 bytes (measured/metadata)
- [ocr-xml] https://archive.org/download/warofrebellion271unit/warofrebellion271unit_djvu.xml  [HTTP 206 (redirects)] - 46,609,771 bytes per IA metadata; one <OBJECT> per leaf; <WORD coords x-confidence>
- [page-map] https://archive.org/download/warofrebellion271unit/warofrebellion271unit_page_numbers.json  [HTTP 206 (redirects)] - 200,256 bytes; 1,188 leaves; e.g. leaf 401 -> printed p. 383
- [metadata-api] https://archive.org/metadata/warofrebellion271unit  [HTTP 200]
- [alt-copy] https://archive.org/details/warofrebellion012701rootrich  [HTTP 200] - UC copy 'Ser. 1 vol. 27:1'; possible-copyright-status NOT_IN_COPYRIGHT; 1,202 images; djvu.txt 4,036,379 bytes
- [rights-statement] https://catalog.hathitrust.org/api/volumes/brief/htid/coo.31924077699761.json  [HTTP 206] - returns rightsCode 'pd' / usRightsString 'Full view' for coo.31924077699761 (ser.1:v.27:pt.1:Reports); other holders: uc1.31210001841947, mdp.49015002000488, uga1.32108018932833
- [portal] https://collections.library.cornell.edu/moa_new/waro.html  [read via WebFetch] - lists Part I -> https://babel.hathitrust.org/cgi/pt?id=coo.31924077699761 (babel HTML blocked to scripted clients: HTTP 403 Cloudflare)

**Format:** OCR plain text (djvu.txt), word-coordinate XML, hOCR, PDF (105 MB), JP2 zip (1.05 GB). Text file has NO page/form-feed markers (0 x 0x0C measured) - page segmentation must use djvu.xml <OBJECT> leaves + page_numbers.json, or running-head regex ('Chap. XXXIX.] THE GETTYSBURG CAMPAIGN. 623').
**Size:** 1,190 leaves; 3,970,479 bytes OCR text (measured); item 2.64 GB with images
**OCR quality:** excellent (proxy 0.984) - Chamberlain report (OR27-1 No.196, p.622): only stray errors ('repori', 'ir', 'm^', "enemys") - fully machine-readable
**Rights:** public domain - basis: US Government publication (17 U.S.C. 105) published 1889; HathiTrust rightsCode 'pd' (Full view); UC copy IA possible-copyright-status NOT_IN_COPYRIGHT
- Rights statement URL: https://catalog.hathitrust.org/api/volumes/brief/htid/coo.31924077699761.json
- Statement text: rightsCode: pd; usRightsString: Full view (HathiTrust API, fetched 2026-09-30). IA terms: https://archive.org/about/terms
- Caveat: Use 1880-1901 GPO scans only. IA also hosts a 1971 National Historical Society reprint (warrebellionaco00cowlgoog, publisher '[Gettysburg, National Historical Society') that is NOT public domain - do not ingest reprints.
**Extraction (difficulty 2/5):** Download djvu.txt + djvu.xml + page_numbers.json; strip running heads; split on numbered report headers ('No. 196.' then 'Report of Col. ...'); repair OCR variants ('N0.', 'No 62', 'Reports of'); parse header line into {author, rank, unit, role, dates}; link unit via alias table to site regiment_id; keep leaf+printed page for citations; paragraph-chunk with report id.
- Tools: python 3.11, lxml/iterparse for 46 MB djvu.xml, regex, rapidfuzz for unit-name matching
- Step: Parse ToC (first occurrence of each 'No. N.' between 'REPORTS.' and first body header) -> report index (measured: 376 of 378 numbers parse; Nos. 81 and 142 missed)
- Step: Body headers: naive regex recovers ~302 of 378 Pt1 headers; remaining need fuzzy match on ToC author string
- Step: Emit JSONL {report_no, page_start, page_end, author, unit, text}
- Step: Time-anchor pass (see SRC-06 note): 2,269 clock-time expressions in Pt1 (regex heuristic, includes false positives)
**Expected records** (basis: MEASURED from OCR ToC (last entry No. 378) + heuristic classification of parsed ToC entries (+/-10%)):
- numbered_report_entries: Nos. 1-378 in Pt1; Gettysburg-battle Union items Nos. 5-375 (about 371)
- by_level_approx: {"regiment_or_battery": 208, "brigade": 69, "division": 23, "corps_or_army": 6, "other_returns_orders": "about 40"}
- time_expressions: 2269
- note: Chamberlain (20th Maine) is No. 196 at OR p.622; OR Pt1 No. 13 = Return of Casualties at Gettysburg; No. 9 = Organization of the Army of the Potomac at Gettysburg; No. 6 = Meade; No. 7 = Itinerary
**Data types added:** unit_reports (regiment/brigade/division/corps/army), clock times & durations, commander names + succession, casualty returns by unit, orders of battle (No. 9), place/landmark names (farms, roads), direct quotations of orders, regiment strength as reported
**Quality / bias notes:**
- Reports were written days to months after the fight (Chamberlain July 6; some 1864); times are approximate ('somewhere near 4 p. m.').
- Self-serving/defensive bias; commanders sometimes contradict each other by 1-2 h; treat as testimony, not ground truth.
- Multiple reports per unit (regiment + brigade + division) - keep hierarchy for cross-checks.
- Pt1 contains non-Gettysburg items (Brandy Station, Aldie, Upperville, Wapping Heights) - filter by date/place.
**Effort:** L (3-5 (pipeline + unit linking + QA); ~1 d for raw fetch+segmentation)  |  **Depends on:** unit alias table (site regiment_id <-> OR naming), raw-source cache + manifest  |  **Audit refs:** C4, H8, H10, H7

### SRC-02  [P0 | rank 2]  Official Records, Series I, Vol. 27, Part 2 - Reports: Middle Dept./Dept. of the Susquehanna/W.Va. (Union) and ARMY OF NORTHERN VIRGINIA (Confederate)
*Category:* official_records  |  *Publisher/year:* War Department / GPO, 1889

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/warofrebellion272unit  [HTTP 200] - UIUC copy; 1,132 images; ABBYY 11; 2.28 GB item
- [ocr-text] https://archive.org/download/warofrebellion272unit/warofrebellion272unit_djvu.txt  [HTTP 206 (redirects)] - 3,880,513 bytes (measured/metadata)
- [metadata-api] https://archive.org/metadata/warofrebellion272unit  [HTTP 200]
- [rights-statement] https://catalog.hathitrust.org/api/volumes/brief/htid/coo.31924077728255.json  [HTTP 206] - pd / Full view; holders also uc1.31210008422345, mdp.49015002000496, uga1.32108007765061

**Format:** same as SRC-01
**Size:** 1,132 leaves; 3,880,513 bytes OCR text (measured)
**OCR quality:** excellent (proxy 0.98) - Part 2 ToC and body parse cleanly; 'Chiet'/'sJALALYFY' occur on title/summary pages only
**Rights:** public domain - basis: US Government publication 1889; Hathi rightsCode pd
- Rights statement URL: https://catalog.hathitrust.org/api/volumes/brief/htid/coo.31924077728255.json
- Statement text: rightsCode pd / Full view
- Caveat: avoid reprints (see SRC-01)
**Extraction (difficulty 2/5):** as SRC-01; ANV items are Nos. 424-589 (166 entries). Header text uses 'Reports of' + rank abbreviations (C. S. Army); normalise Confederate unit naming ('Thirty-fourth North Carolina Infantry, commanding Scales' brigade').
- Tools: python, regex, rapidfuzz
- Step: ToC parse recovers 211 of 211 numbers in 379-589 (numbers outside that range are page furniture - restrict to 379-589)
- Step: Body-header regex recovers 160 of 211 numbers in Pt2; rest via fuzzy match
- Step: Map Confederate reports to site oob/confederate_*.json regiment_id via state+number+branch
**Expected records** (basis: MEASURED from OCR ToC; classification heuristic):
- numbered_report_entries: Nos. 379-589 (211). Union Middle Dept/Susquehanna/W.Va Nos. 379-423; Confederate ANV Nos. 424-589 (166)
- by_level_approx_confederate: {"regiment_or_battery": 88, "brigade": 37, "artillery_battalion": 14, "division": 5, "corps": 4, "staff": 6, "returns_orders": 5}
- highlights: No. 424 Organization of ANV at Gettysburg; No. 426 Lee's report; No. 427 Surg. Guild casualty returns; No. 589 Confederate Roll of Honor; ToC also lists 'Medals of Honor for battle of Gettysburg' (OCR reads No. 428 - evidently No. 423)
- time_expressions: 947
**Data types added:** Confederate unit reports, Lee/Longstreet/Ewell/Hill/Stuart reports, casualty returns (Guild), ANV order of battle, Medal of Honor citations (Union, Gettysburg), time expressions
**Quality / bias notes:**
- Confederate coverage is uneven: the parsed ToC shows no report by Pickett himself (Garnett's brigade appears via Maj. Peyton, No. 441); extract each report's date line to measure the lag between battle and writing rather than assuming it.
- Lost-Cause framing begins in report language; compare with SHSP (SRC-08).
- Only ~88 regiment/battery-level Confederate reports vs 241 Confederate unit records in site data (measured) - regiment-level Confederate coverage must come from SRC-12, SRC-24, SRC-25.
**Effort:** L (2-4 (shares pipeline with SRC-01))  |  **Depends on:** SRC-01 pipeline  |  **Audit refs:** C4, H8

### SRC-03  [P0 | rank 3]  New York Monuments Commission - Final Report on the Battlefield of Gettysburg (3 vols., incl. Fox, 'New York at Gettysburg')
*Category:* state_monument_commission  |  *Publisher/year:* New York Monuments Commission for the Battlefields of Gettysburg and Chattanooga; J.B. Lyon Co., 1900 (vol.1) / 1902 printing

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/finalreportongettys01burgrich  [HTTP 200] - vol.1, UC copy, 548 images, NOT_IN_COPYRIGHT
- [ocr-text] https://archive.org/download/finalreportongettys01burgrich/finalreportongettys01burgrich_djvu.txt  [HTTP 206 (redirects)] - 1,435,851 bytes (measured/metadata)
- [alt-copy] https://archive.org/details/cu31924092924970  [HTTP 200] - Cornell 1902, 542 images - volume number not stated in metadata; verify at ingest
- [alt-copy] https://archive.org/details/cu31924092924996  [HTTP 200] - Cornell 1902, 634 images - volume number not stated in metadata; verify at ingest
- [alt-copy] https://archive.org/details/cu31924024857280  [HTTP 200] - Cornell 1902 'Final report of the battlefield of Gettysburg', 544 images (title variant)
- [alt-copy] https://archive.org/details/cu31924071238673  [HTTP 200] - Cornell 1902, 636 images (title variant)
- [cross-check-only] https://museum.dmna.ny.gov/unit-history/conflict/us-civil-war-1861-1865  [read via WebFetch] - footer '(c)2026 New York State Military Museum and Veterans Research Center. All rights reserved.' ~400 unit pages; do not scrape
- [portal] https://nysl.nysed.gov/scandocs/civilwar  [HTTP 200, TLS certificate problem (fetched with curl -k; see card note)] - WebFetch failed with 'unable to verify the first certificate' (TLS chain problem on nysl.nysed.gov); curl -k returned the page. Page text: 'three-volume set contains New York at Gettysburg by William F. Fox and includes regimental histories'; also lists 'Letters describing the Battles of Gettysburg and Vicksburg' (digitised July 2013). Rights not stated on the page.

**Format:** OCR text (djvu.txt), PDF, hOCR
**Size:** vol.1 1,435,851 bytes (measured); vols 2-3 ~1.45-1.73 MB each (IA metadata)
**OCR quality:** excellent (proxy 0.968)
**Rights:** public domain - basis: published 1900/1902 (pre-1931); NY State publication
- Rights statement URL: https://archive.org/details/finalreportongettys01burgrich
- Statement text: IA metadata possible-copyright-status: NOT_IN_COPYRIGHT (UC copy). IA terms: https://archive.org/about/terms
- Caveat: The NYSMM web transcriptions carry an all-rights-reserved footer - ingest from IA scans, not from museum.dmna.ny.gov.
**Extraction (difficulty 3/5):** Chapter split on regiment headings (19 upper-case '... REGIMENT' headings detected in vol.1 by naive regex - use ToC instead); each NY unit: Fox narrative + regimental sketch + monument text + casualty line.
- Tools: python, regex, manual alias table for NY numbering (e.g. 14th Brooklyn = 84th NY, 'Fourteenth Militia')
- Step: Segment 'New York at Gettysburg' narrative (Fox) by corps/day
- Step: Segment per-regiment sketches & inscription blocks
- Step: Link to site regiment_id (75 New York unit records in deployed data/oob)
- Step: Extract monument dimensions/cost from vol.3
**Expected records** (basis: MEASURED in vol.1 text: 'sixty-eight New York regiments or battalions of infantry present' and 'nineteen New York batteries'; site has 75 NY-state unit records (measured)):
- units: 68 infantry regiments/battalions + 19 batteries (+ NY cavalry) - one narrative + sketch each
**Data types added:** regimental narratives, monument inscriptions, casualty lines, Fox's synthesis of NY movements by day/hour, dedication speeches (quotes), monument locations/costs
**Quality / bias notes:**
- Written 1890s by W.F. Fox from veteran accounts + OR; more accurate on NY than other states but state-centric.
- Contains post-war controversies (e.g. Sickles/Slocum claims) - tag as advocacy.
**Effort:** M (2-3)  |  **Depends on:** unit alias table  |  **Audit refs:** H8, H10

### SRC-04  [P0 | rank 4]  Pennsylvania at Gettysburg: Ceremonies at the dedication of the monuments erected by the Commonwealth of Pennsylvania (1893 1st ed., 2 vols; 1914 2nd ed.)
*Category:* state_monument_commission  |  *Publisher/year:* Commonwealth of Pennsylvania: 1893 (2 vols); IA also lists a 1904 vol.2 (pennsylvaniaatge02lcpenn); 2nd ed. 1914

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/pennsylvaniaatge05penn  [HTTP 200] - 1893 vol.1; LoC copy; 638 images; 1,978 KB text; NOT_IN_COPYRIGHT
- [primary-text] https://archive.org/details/pennsylvaniaatge03penn  [HTTP 200] - 1893 vol.2; 666 images
- [primary-text] https://archive.org/details/pennsgettysburg01reynrich  [HTTP 200] - 1914 vol.1; UC copy; 742 images; 2,144 KB
- [primary-text] https://archive.org/details/pennsgettysburg02reynrich  [HTTP 200] - 1914 vol.2; 816 images; 1,987 KB
- [primary-text] https://archive.org/details/pennsylvaniaatg03penn  [HTTP 200] - 1914 vol.3; Toronto copy; 520 images; ABBYY
- [alt-copy] https://archive.org/details/pennsylvania03penn  [HTTP 200] - 1914 vol.3; LoC copy; 510 images; 853 KB
- [ocr-text] https://archive.org/download/pennsylvaniaatge05penn/pennsylvaniaatge05penn_djvu.txt  [HTTP 206 (redirects)] - 1,978,000 bytes (measured/metadata)

**Format:** OCR text; PDF; hOCR
**Size:** ~2 MB text per volume (IA metadata); 3 volumes in 1914 ed.
**OCR quality:** good (proxy 0.935) - 1914 vol.2 0.949
**Rights:** public domain - basis: Pennsylvania state publication 1893/1914 (pre-1931)
- Rights statement URL: https://archive.org/details/pennsylvaniaatge05penn
- Statement text: possible-copyright-status NOT_IN_COPYRIGHT (LoC scan). Terms https://archive.org/about/terms
**Extraction (difficulty 3/5):** Regiment-by-regiment sections (dedication ceremony; address; regimental history by veterans). Detect 'ROSTER'/'DEDICATION' headings; per-regiment text blocks; link to site PA unit records (74 measured).
- Tools: python, regex, alias table (PA numbering: 'One Hundred and Fiftieth Pennsylvania' -> U-150PA)
- Step: Choose one edition as canonical (1914 = superset) and store 1893 as variant
- Step: Segment by regiment + speech
- Step: Attach monument text and location
**Expected records** (basis: MEASURED: 74 PA unit records in deployed oob data; 'Gettysburg' appears 586x in 1893 vol.1 text):
- units: roughly one section per PA regiment/battery (Pennsylvania had the largest contingent)
**Data types added:** regimental histories (veteran-written), dedication addresses (quotes), personal reminiscences with clock times, monument inscriptions
**Quality / bias notes:**
- Veteran memory 25-50 years after the battle; contains errors and boosterism; keep provenance tag 'veteran_address_18xx'.
- Editions overlap: dedupe by regiment section hash.
**Effort:** M (2-3)  |  **Depends on:** unit alias table  |  **Audit refs:** H8

### SRC-05  [P0 | rank 5]  Fox, William F. - Regimental Losses in the American Civil War, 1861-1865 (1889)
*Category:* reference_statistics  |  *Publisher/year:* Albany Publishing Co., 1889

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/reglossescivilwar00foxwrich  [HTTP 200] - UC copy; 620 images; NOT_IN_COPYRIGHT; 2,255,231 bytes text
- [ocr-text] https://archive.org/download/reglossescivilwar00foxwrich/reglossescivilwar00foxwrich_djvu.txt  [HTTP 206 (redirects)] - 2,255,231 bytes (measured/metadata)
- [alt-copy] https://archive.org/details/regimentallosses00infoxw  [HTTP 200] - 618 images
- [alt-copy] https://archive.org/details/regimentallosses00foxwuoft  [HTTP 200] - 620 images

**Format:** OCR text; tables in the OCR are column-flattened (one cell per line)
**Size:** 2,255,231 bytes text (measured)
**OCR quality:** excellent for prose; MEDIOCRE for numbers (proxy 0.977) - Gettysburg corps loss table OCR shows digit errors: '(5,024', '30S', '000', '4,2 lo', 'Sth Maine' -> requires arithmetic validation against OR27-1 No.13/15 returns
**Rights:** public domain - basis: published 1889 (pre-1931)
- Rights statement URL: https://archive.org/details/reglossescivilwar00foxwrich
- Statement text: possible-copyright-status NOT_IN_COPYRIGHT
- Caveat: Modern derivative datasets (e.g. Busey & Martin 1982/1994 'Regimental Strengths and Losses at Gettysburg') are copyrighted compilations - the site's own oob files already cite it (see report section 3).
**Extraction (difficulty 4/5):** Two parsers: (a) prose 'Notes' per regiment (regex on 'NOTES.' blocks) ; (b) loss tables: rebuild rows from flattened columns (regiment, brigade, corps, K, W, M/C, total) and validate row sums; (c) 'Present also at' battle lists.
- Tools: python, regex, checksum validation, optional hOCR word boxes to rebuild columns
- Step: Parse chapter 'Number killed at Gettysburg' (p.24-25) and corps tables
- Step: For each regiment page parse killed-by-battle rows incl. 'Gettysburg, Pa.'
- Step: Cross-validate against OR Pt1 No.13 and site casualty_apportionment.json
**Expected records** (basis: ESTIMATE (not measured): per-regiment loss rows for all Union regiments with >= ~130 killed ('fighting regiments', ~300) plus corps/brigade tables; Gettysburg row appears for a subset. Measure in pilot.):
- sample_measured: Fox Gettysburg summary rows by corps present (e.g. 1st Corps 3,? killed/wounded/missing; Cavalry Corps; Reserve Artillery)
**Data types added:** casualties by unit and battle, regiment notes/anecdotes, engagement lists, corps histories, killed-and-mortally-wounded percentages
**Quality / bias notes:**
- Union only. Fox counts killed+mortally wounded (may differ from OR returns and from modern Busey/Martin).
- 'Missing' includes captured and deserters.
**Effort:** L (3-4 (table reconstruction + validation))  |  **Depends on:** SRC-01 returns (No.13, No.15), unit alias table  |  **Audit refs:** C4, H10

### SRC-06  [P0 | rank 6]  Official Records, Series I, Vol. 27, Part 3 - Correspondence, orders, returns (Union June 3-Aug 3 1863; Confederate correspondence)
*Category:* official_records  |  *Publisher/year:* War Department / GPO, 1889

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/warofrebellion273unit  [HTTP 200] - UIUC copy; 1,256 images; 2.54 GB item
- [ocr-text] https://archive.org/download/warofrebellion273unit/warofrebellion273unit_djvu.txt  [HTTP 206 (redirects)] - 3,406,041 bytes (measured/metadata)
- [metadata-api] https://archive.org/metadata/warofrebellion273unit  [HTTP 200]
- [alt-copy] https://archive.org/details/warofrebellion012703rootrich  [HTTP 200] - UC copy 'Ser. 1 vol. 27:3'; NOT_IN_COPYRIGHT; 1,262 images
- [rights-statement] https://catalog.hathitrust.org/api/volumes/brief/htid/coo.31924077700262.json  [HTTP 206] - pd / Full view; also uc1.31210008422352, mdp.49015002000504, uga1.32108013210375

**Format:** OCR text; no 'No. N.' report headers - items are dated dispatches/orders ('HDQRS ... July 2, 1863-4.45 p. m.')
**Size:** 1,256 leaves; 3,406,041 bytes text (measured)
**OCR quality:** excellent (proxy 0.967)
**Rights:** public domain - basis: US Government publication 1889
- Rights statement URL: https://catalog.hathitrust.org/api/volumes/brief/htid/coo.31924077700262.json
- Statement text: rightsCode pd / Full view
**Extraction (difficulty 3/5):** Split on dispatch headers (place/time/author/addressee lines); capture date-time stamps; keep chronological order; parse 'a. m./p. m.' and 'o'clock'; NER for units and places.
- Tools: python, regex time grammar, dateparser optional
- Step: Segment by page and by dispatch heading
- Step: Parse 2,204 clock-time expressions (heuristic count) and 225 'July 1-3, 1863' date strings
- Step: Store {ts_text, ts_norm(local), author, recipient, place, text}
- Step: Build per-unit dispatch timeline (Meade, Buford, Reynolds, Howard, Sickles, Hancock, Warren, Lee/Davis)
**Expected records** (basis: MEASURED counts via regex (heuristic; includes false positives)):
- clock_times: 2204
- july_1_3_date_strings: 225
- dispatches: ESTIMATE ~1,000-1,500 dated items across Union+Confederate correspondence for Jun 3-Aug 3 (not measured)
**Data types added:** timestamped dispatches (best available time anchors), orders and order changes, commander-to-commander messages (quotes), logistics/rail movements, Lee-Davis correspondence
**Quality / bias notes:**
- Telegraph times are the most reliable clock evidence in the corpus but different HQs used local sun-time; document the +/- 5-10 min uncertainty.
- Correspondence continues through Aug 3 - crop by date for the 'battle window' (June 28-July 4) vs campaign.
**Effort:** L (3-4)  |  **Depends on:** SRC-01 pipeline  |  **Audit refs:** C4

### SRC-07  [P0 | rank 7]  Battles and Leaders of the Civil War, Vol. 3 (Gettysburg section pp. ~244-440 + Doubleday maps)
*Category:* participant_narratives  |  *Publisher/year:* Century Co., 1887-88 (vol.3)

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/battlesleadersof03cent  [HTTP 200] - Boston Public Library copy; 782 images; 3,272,331 bytes text
- [ocr-text] https://archive.org/download/battlesleadersof03cent/battlesleadersof03cent_djvu.txt  [HTTP 206 (redirects)] - 3,272,331 bytes (measured/metadata)
- [alt-copy] https://archive.org/details/battlesleadersof03john  [HTTP 200] - Lincoln Financial Foundation copy; 786 images; ABBYY 8; 3,251,232 bytes

**Format:** OCR text; PDF; hOCR; contents list is machine-readable in the text
**Size:** 3.27 MB text (whole vol.3); Gettysburg articles ~ 25-30 items
**OCR quality:** excellent (proxy 0.966) - cent copy 0.949; john copy 0.966 - prefer battlesleadersof03john
**Rights:** public domain - basis: published 1887-88
- Rights statement URL: https://archive.org/details/battlesleadersof03cent
- Statement text: IA terms https://archive.org/about/terms; no possible-copyright-status field on item
- Caveat: illustrations by W. Taber, A.R. Waud, E. Forbes etc. are also pre-1931 (PD) - verify per image if reused.
**Extraction (difficulty 2/5):** Use the OCR 'CONTENTS OF VOLUME THREE' to get article titles/authors/pages, then split body by article headings (uppercase title + byline). 'Opposing forces' tables are semi-structured.
- Tools: python, regex
- Step: Extract Gettysburg subsection titles (verified list below)
- Step: Tag author + affiliation + side
- Step: Chunk by paragraph; store printed page
**Expected records** (basis: MEASURED from OCR contents):
- articles: about 25-30 Gettysburg items: Longstreet 'Lee's Invasion of Pennsylvania' p.244; Mosby p.251; B.H. Robertson p.253; Hunt 'The First Day' p.255; Halstead p.284; H.M.M. Richards p.289; Hunt 'The Second Day' p.290; Gibbon 'Council of War' p.313; Melcher '20th Maine at Little Round Top' p.314; Grindlay '146th NY' p.315; Greene 'Breastworks at Culp's Hill' p.317; E.M. Law 'Struggle for Round Top' p.318; Kershaw p.331; Longstreet 'Lee's Right Wing' p.339; Smith p.354; Allan 'Reply to General Longstreet' p.355; Alexander p.357; Hunt 'Third Day' p.369; F.A. Walker p.385; Rice p.387; Parsons 'Farnsworth's Charge' p.393; W.E. Miller 'Cavalry Battle' p.397; 'Meade at Gettysburg' follows
**Data types added:** first-person narratives, quotes with attribution, clock references, maps list (Doubleday maps Nos.1-29), post-war controversy (Longstreet vs Allan/Early)
**Quality / bias notes:**
- Written 1880s under editor Robert U. Johnson; cf. Lost-Cause debate: Longstreet, Alexander, Allan, Law, Kershaw are advocates in a live controversy - tag 'controversy'.
- Unit-level facts (e.g. Melcher on 20th Maine) are memory-based.
**Effort:** M (1-2)  |  **Depends on:** none  |  **Audit refs:** H8, C4

### SRC-08  [P0 | rank 8]  Southern Historical Society Papers (SHSP), vols. 1-43 (1876-1920; later volumes exist, not measured)
*Category:* participant_narratives  |  *Publisher/year:* Richmond, 1876-1920 for vols 1-43 (IA dates: v.42 = new ser.4 1917; v.43 = new ser.5 1920)

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/southernhistoric4187sout  [HTTP 200] - vol.4 (1877) - most Gettysburg-dense (312 'Gettysburg' hits, 240 'Longstreet'); 865 KB; 'Copyright status reviewed by UF staff - Out of copyright'
- [primary-text] https://archive.org/details/southernhistoric3719sout  [HTTP 200] - vol.37 (1909) - 253 hits
- [primary-text] https://archive.org/details/southernhistoric5187sout  [HTTP 200] - vol.5 (1878) - 204 hits
- [primary-text] https://archive.org/details/southernhistoric3319sout  [HTTP 200] - vol.33 (1905) - 137 hits
- [primary-text] https://archive.org/details/southernhistoric6187sout  [HTTP 200] - vol.6 (1878) - 134 hits
- [primary-text] https://archive.org/details/southernhistoric1018sout  [HTTP 200] - vol.10 (1882) - 133 hits
- [primary-text] https://archive.org/details/southernhistoric2318sout  [HTTP 200] - vol.23 (1895) - 129 hits
- [search-api] https://archive.org/advancedsearch.php?q=southernhistoric*sout+AND+mediatype%3Atexts&fl%5B%5D=identifier&fl%5B%5D=volume&rows=200&output=json  [HTTP 200] - 135 items (duplicate scans per volume). Chosen ids per volume in report appendix.

**Format:** OCR text per volume (djvu.txt); one item per volume; several duplicate scans exist (pick one, e.g. southernhistoricNNNNsout series for vols 1-43)
**Size:** vols 1-43 total 49.0 MB text (measured); per volume 0.5-1.8 MB
**OCR quality:** good (proxy 0.93) - vol.4 0.95; vol.37 0.913
**Rights:** public domain - basis: published 1876-1920 (pre-1931)
- Rights statement URL: https://archive.org/details/southernhistoric4187sout
- Statement text: possible-copyright-status: 'Copyright status reviewed by UF staff - Out of copyright' (vol.4)
- Caveat: Vols after 43 not measured - only material published <= 1930 is safely PD; do not ingest later volumes without checking.
**Extraction (difficulty 3/5):** Per volume: split into articles via running heads + all-caps titles; detect Gettysburg-relevant articles by keyword density (Gettysburg/Pickett/Longstreet/Little Round Top/Seminary Ridge) then human-review a shortlist; tag author, date, side, bias.
- Tools: python, regex, keyword scoring, human review queue
- Step: Download 43 volumes (49 MB)
- Step: Article segmentation
- Step: Score by Gettysburg density; keep top ~150 articles
- Step: Tag 'lost_cause' / 'controversy:Longstreet-Early'
**Expected records** (basis: MEASURED keyword counts (43 vols): 2,949 'Gettysburg' mentions total; top vols 4 (312), 37 (253), 5 (204), 33 (137), 6 (134), 10 (133), 23 (129), 8 (119), 40 (119), 24 (117)):
- articles: ESTIMATE 100-200 Gettysburg-relevant articles (not measured)
**Data types added:** Confederate personal narratives, letters/reports not in OR, controversy pieces (Longstreet/Early), unit histories, casualty/roll lists
**Quality / bias notes:**
- SHSP is the institutional publication of the postwar Lost Cause movement (Southern Historical Society, Richmond). Good for Confederate perspective/testimony; poor as neutral fact.
- Sensitive content - add editorial framing/labels in the UI (bias badge).
**Effort:** L (3-5 incl. review)  |  **Depends on:** review UI or spreadsheet  |  **Audit refs:** H8

### SRC-09  [P0 | rank 9]  Library of Congress - Bachelder maps (1863 isometric; 1876/1883 three-sheet troop-position maps) and G.K. Warren survey map (Gettysburg)
*Category:* historic_maps  |  *Publisher/year:* 1863-1888

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-json] https://www.loc.gov/item/99447491/?fo=json  [HTTP 206] - LoC item 99447491; 'First day's battle / Second day's battle / Third day's battle'; topography engraved by Julia Bien; positions by Louis E. Neuman; each 74 x 71 cm
- [primary-json] https://www.loc.gov/item/99447492/?fo=json  [HTTP 206] - 3 maps, each 74 x 71 cm, scale 1:12,000; positions compiled 1876
- [primary-json] https://www.loc.gov/item/99448794/?fo=json  [HTTP 206] - From Jubal Early Collection; 'detailed topographic map subsequently used as the base for Bachelder'; 'reduced from one on a scale of 2[00 ft/in]'; no troop positions
- [primary-json] https://www.loc.gov/item/93517377/?fo=json  [HTTP 206] - LoC rights note: generic P&P statement; 1863 => PD by age
- [primary-json] https://www.loc.gov/item/2007630423/?fo=json  [HTTP 206] - also 2007630421, 2007630422, 99447490, gm70005048
- [primary-json] https://www.loc.gov/item/99448798/?fo=json  [HTTP 206] - based on Warren's map; copyright no. 18291 (Aug 3 1888) - PD by age; cavalry-field variant 99448799
- [iiif-image] https://tile.loc.gov/image-services/iiif/service:gmd:gmd382:g3824:g3824g:cw0325000a/info.json  [HTTP 206] - 200 OK; example: .../full/pct:25/0/default.jpg
- [docs] https://www.loc.gov/apis/json-and-yaml/working-within-limits/  [read via WebFetch] - JSON/YAML API 20 req/min (1 h block); text and image services 150 req/min; /storage-services/ 150/min; paging max 100,000 items; recommend <=1,000 per page
- [rights-statement] https://www.loc.gov/legal/  [HTTP 206] - G&M statement text captured from item JSON: 'The content of the Library of Congress Geography and Map Division digitized collections is free to use and reuse unless a Rights Advisory statement is present that indicates otherwise.'
- [tooling] https://allmaps.org/  [HTTP 200] - editor https://editor.allmaps.org/ reachable (200); capabilities not deep-verified
- [tooling] https://mapwarper.net/  [HTTP 200] - reachable (200)
- [primary-record] https://collections.leventhalmap.org/search/commonwealth:q524n5909  [read via WebFetch] - 72 x 69 cm on 95 x 80 cm sheet, 1:12,000; downloads: primary TIF 208 MB, large JPEG 17.4 MB, medium JPEG 286 KB; IIIF manifest offered; rights text: 'No known copyright restrictions. No known restrictions on use.' (not rate-limited like loc.gov - good mirror for georeferencing)
- [primary-record] https://collections.leventhalmap.org/search/commonwealth:pg15gs980  [search-result only (direct fetch blocked)] - from web search: 3 maps in color, 72 x 69 cm each; Bien/Neumann engravers; Endicott & Co.

**Format:** Scanned maps: GIF/JPEG/TIFF via loc.gov/tile.loc.gov; IIIF Image API; item metadata JSON (fo=json). loc.gov HTML pages and /item/{id}/manifest.json returned HTTP 403 to my scripted client (Cloudflare) while ?fo=json and tile.loc.gov worked.
**Size:** 1876 first-day sheet: IIIF listing gives a 12.5% rendering of 1,036 x 1,344 px, i.e. full size about 8,288 x 10,752 px (LoC item JSON); sheets are 74 x 71 cm
**OCR quality:** n/a - unit labels/positions require manual or vision-model transcription
**Rights:** public domain (age) / free to use per LoC G&M statement - basis: Bachelder 1863/1876/1883 and Warren 187-? pre-1931; LoC does not hold rights but item JSON 'rights_advisory' absent for the G&M items
- Rights statement URL: https://www.loc.gov/legal/
- Statement text: The content of the Library of Congress Geography and Map Division digitized collections is free to use and reuse unless a Rights Advisory statement is present that indicates otherwise. Credit Line: Library of Congress, Geography and Map Division.
- Caveat: 93517377 (P&P lithograph) carries LoC generic rights note ('does not own rights ... see https://www.loc.gov/rr/print/res/rights.html')
- Caveat: Respect 20 req/min JSON API limit; a 1-hour block is documented; my rapid probing coincided with 403s on HTML pages.
**Extraction (difficulty 5/5):** Georeference 5-8 sheets (Warren base first, then Bachelder day sheets) with Allmaps/QGIS using 25-40 ground control points (road intersections, named buildings such as Codori, Trostle, Seminary; use modern GNMP/USGS layers), thin-plate-spline; export WebMercator tiles/PMTiles; then transcribe unit symbols+labels (manual/vision assisted) into GeoJSON with day/period attributes.
- Tools: Allmaps or QGIS georeferencer, GDAL, PMTiles, vision-LLM assisted label transcription with human QA
- Step: Fetch item JSON + IIIF info.json (respect 20/min)
- Step: GCP set + RMS error target < 15 m
- Step: Publish raster tiles
- Step: Digitise Bachelder symbols (first/intermediate/evening positions) - XL if done for all ~570 units
**Expected records** (basis: MEASURED: LoC items verified above):
- sheets: 1876: 3 sheets; 1883: 3; 1863 isometric: 1 (+variants); Warren: 1; Woeltje & Cutting 1888: 2
- symbols: ESTIMATE hundreds of unit symbols per day-sheet (not counted)
**Data types added:** georeferenced basemap (1863-69 terrain, roads, farms, woods), Bachelder troop positions by day (first/intermediate/evening), landowner names, monument-era vs battle-era feature validation
**Quality / bias notes:**
- Bachelder positions come from veteran testimony collected 1863-1886 and are not minute-accurate; use as spatial priors for placements, not timing.
- Dealers report a 28-map 'hourly' Bachelder set (1880s, time-stamped) - existence and digital availability NOT verified in LoC; see SRC-30 (NARA).
**Effort:** XL (6-12 (georef 2-3 d; symbol digitisation dominates))  |  **Depends on:** SRC-30 (NARA) for hourly maps if found  |  **Audit refs:** C4, D3

### SRC-10  [P0 | rank 10]  Library of Congress - Civil War Glass Negatives and Related Prints (Brady/Gardner/O'Sullivan/Gibson/Smith), Gettysburg July 1863 and aftermath
*Category:* photographs  |  *Publisher/year:* 1863 (negatives); prints 1880s-1917

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [search-api] https://www.loc.gov/collections/civil-war-glass-negatives/?fo=json&c=50&q=gettysburg  [HTTP 206] - 185 results (measured); pages: &sp=2..4
- [rights-statement] https://www.loc.gov/rr/print/res/120_cwar.html  [HTTP 200 (redirects)] - redirects to https://guides.loc.gov/p-and-p-rights-and-restrictions/rights#120_cwar.html
- [rights-statement] https://www.loc.gov/rr/print/res/rights.html  [HTTP 200 (redirects)] - redirects to guides.loc.gov/p-and-p-rights-and-restrictions/introduction
- [docs] https://www.loc.gov/apis/json-and-yaml/working-within-limits/  [read via WebFetch] - 20 req/min JSON; 150/min image/text

**Format:** JSON metadata (fo=json) + JPG/GIF/TIF derivatives; digital ids LC-DIG-cwpb-#####; caption in 'title' + 'notes' (Milhollen & Mugridge 1977 numbering)
**Size:** 185 records in the 'gettysburg' query (measured); 75 have 'created_published' containing '1863 July.'; contributors (items): O'Sullivan 34, Gardner 31, J.F. Gibson 15, W.M. Smith 15, Brady studio 4
**OCR quality:** n/a
**Rights:** no known restrictions on publication (LoC statement); PD by age - basis: photographed 1863; LoC statement per item
- Rights statement URL: https://www.loc.gov/rr/print/res/120_cwar.html
- Statement text: No known restrictions on publication. For information, see "Civil war photographs, 1861-1865," https://www.loc.gov/rr/print/res/120_cwar.html (118 of 185 records); 55 records: 'No known restrictions on publication.'; 12 records: no advisory field
- Caveat: 3 of 185 records carry a 'Copyright J224990 Aug. 16, 1917' style note (copy prints by a studio) - gate on rights_advisory + notes before display.
- Caveat: 12 records have no rights_advisory - exclude until checked.
**Extraction (difficulty 2/5):** Paginate collection JSON; keep id, title, date, contributor, notes, rights_advisory, image_url; filter rights; download service_medium derivative only for shortlisted images (self-host as WebP/AVIF with srcset).
- Tools: python requests with 3-s spacing, sharp/ImageMagick
- Step: 4 API calls for the query
- Step: Curate 40-75 images to unit/location/time (post-battle dates July 5-7+)
- Step: Store credit line: Library of Congress, Prints and Photographs Division, LC-DIG id
**Expected records** (basis: MEASURED):
- records: 185
- july_1863_records: 75
- curated_target: ESTIMATE 40-75 images with location keys (Devil's Den, Little Round Top, Cemetery gatehouse, Culp's Hill, Trostle farm, Peach Orchard)
**Data types added:** historic photographs, photographer/date/caption, place tags (pub. captions)
**Quality / bias notes:**
- Photos date from ~July 5 onward (aftermath); they must NOT be attached to battle ticks; label as 'aftermath, July 5-7'.
- Caption errors are known (LoC title itself flags '[i.e., Devil's Den]' correction for a 'Little Round Top' sharpshooter photo).
**Effort:** M (1-2 (fetch) + 1-2 (curation))  |  **Depends on:** image pipeline on Netlify (AVIF/WebP)  |  **Audit refs:** P2, S1

### SRC-11  [P1 | rank 11]  Itinerary of the Army of the Potomac and co-operating forces in the Gettysburg campaign, June 5 to July 31, 1863 (Adjutant-General, 1888) + Official Records ATLAS (Gettysburg plates)
*Category:* official_records  |  *Publisher/year:* 1888 (Itinerary); 1891 (Atlas)

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/itineraryofarmy00united  [HTTP 200] - LoC copy; 80 images; 155 KB text; NOT_IN_COPYRIGHT
- [ocr-text] https://archive.org/download/itineraryofarmy00united/itineraryofarmy00united_djvu.txt  [HTTP 206 (redirects)] - 155,000 bytes (measured/metadata)
- [primary-text] https://archive.org/details/atlastoaccompany00unit  [HTTP 200] - Atlas; 226 images; 398 KB OCR text

**Format:** OCR text (itinerary ~155 KB); atlas = plate images with poor OCR
**Size:** Itinerary 80 leaves; Atlas 226 leaves
**OCR quality:** good (itinerary) (proxy 0.895) - Atlas 0.685 - image/plate captions, unusable for text; rely on images
**Rights:** public domain - basis: US Government publications 1888/1891
- Rights statement URL: https://archive.org/details/itineraryofarmy00united
- Statement text: NOT_IN_COPYRIGHT (itinerary)
**Extraction (difficulty 3/5):** Itinerary: parse per-unit dated entries ('June 30. Marched to ...'); the same text is OR27-1 No.7. Atlas: plate index from OCR (clear plates: 43 and 95; index also cites sheets 43.1-43.7 and 95.1; other plate numbers ambiguous in OCR); use images for georeferencing (see SRC-09).
- Tools: python, regex
- Step: Parse itinerary into unit-day rows
- Step: Join to site oob ids
- Step: Add atlas plate images to georef queue
**Expected records** (basis: ESTIMATE (not measured): several hundred unit-day rows for corps/division/brigade/regiment entries; verify how deep the itinerary goes (regiment vs brigade)):
- atlas_plates: Plates 43 and 95 carry Gettysburg sheets (clear in OCR index: 'PLATE 43. Gettysburg Campaign, June 4-August 1, 1863'; 'PLATE 95. Gettysburg Campaign'); other plates list 'Gettysburg Campaign' among several campaigns - OCR index ambiguous, confirm from images
**Data types added:** daily unit locations June 5-July 31 (approach/retreat marches), march distances/dates, atlas plate images
**Quality / bias notes:**
- Itinerary is by day, not hour - supports day-level 'where were they on June 30/July 1 morning' not minute ticks.
**Effort:** M (1-2)  |  **Depends on:** unit alias table  |  **Audit refs:** C4

### SRC-12  [P1 | rank 12]  Clark, Walter (ed.) - Histories of the several regiments and battalions from North Carolina, in the great war 1861-'65 (5 vols., 1901)
*Category:* regimental_histories  |  *Publisher/year:* Raleigh, 1901

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/01300611.3314.emory.edu  [HTTP 200] - V.1; 876 images; file name 01300611_3314_djvu.txt
- [primary-text] https://archive.org/details/01300611.3315.emory.edu  [HTTP 200] - V.2; 934 images; 1,971,929 bytes (file 01300611_3315_djvu.txt)
- [primary-text] https://archive.org/details/01300611.3316.emory.edu  [HTTP 200] - V.3; 890 images
- [primary-text] https://archive.org/details/01300611.3317.emory.edu  [HTTP 200] - V.4; 876 images
- [primary-text] https://archive.org/details/01300611.3318.emory.edu  [HTTP 200] - V.5; 944 images; 2,248,607 bytes
- [alt-copy] https://archive.org/details/cu31924092908536  [HTTP 200] - Cornell copy (volume unspecified)

**Format:** OCR text; NOTE Emory-sourced items use underscores in file names (01300611_3315_djvu.txt) - always read the file list from /metadata, never derive names from the identifier
**Size:** ~1.8-2.2 MB text per volume (IA metadata)
**OCR quality:** good (proxy 0.933)
**Rights:** public domain - basis: published 1901
- Rights statement URL: https://archive.org/details/01300611.3315.emory.edu
- Statement text: IA terms https://archive.org/about/terms (Emory scan; no status field)
**Extraction (difficulty 3/5):** Split by regiment (heading e.g. 'TWENTY-SIXTH REGIMENT'); keep only regiments that appear in the site's 33 NC unit records; keep author/year; tag veteran memoir.
- Tools: python, alias table 'Twenty-sixth' -> C-26NC
- Step: Map 33 NC unit records
- Step: Extract Gettysburg passages by keyword window
- Step: Cite volume/page
**Expected records** (basis: MEASURED: 33 NC unit records in deployed oob data; Clark has one chapter per NC regiment/battalion (all vols)):
- units: up to 33 Gettysburg regiments
**Data types added:** Confederate regimental narratives, casualty lists by name, quotes
**Quality / bias notes:**
- Author-contributed veteran chapters of uneven quality; hometown-pride; numbers unreliable.
**Effort:** M (2)  |  **Depends on:** unit alias table  |  **Audit refs:** H8

### SRC-13  [P1 | rank 13]  Report of the Joint Committee on the Conduct of the War (1865) - Army of the Potomac vol. incl. Gettysburg testimony (witness headings verified in OCR: Meade, Warren, Sickles, Howe, Birney, Doubleday, Pleasonton, Hancock, Butterfield, Gibbon, Hunt, Humphreys, Patrick and others)
*Category:* government_testimony  |  *Publisher/year:* U.S. Congress, 1865

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/reportofjointcomm01unit  [HTTP 200] - vol.1; 874 images; ABBYY 8; 3,401 KB; 345 'Gettysburg' and 212 'Sickles' hits (measured)
- [ocr-text] https://archive.org/download/reportofjointcomm01unit/reportofjointcomm01unit_djvu.txt  [HTTP 206 (redirects)] - 3,401,000 bytes (measured/metadata)
- [alt-copy] https://archive.org/details/reportofjointcom01unit  [HTTP 200] - 862 images

**Format:** OCR text Q&A testimony
**Size:** 3.4 MB text
**OCR quality:** excellent (proxy 0.96)
**Rights:** public domain - basis: US Government publication 1865
- Rights statement URL: https://archive.org/details/reportofjointcomm01unit
- Statement text: IA terms; U.S. Government work
**Extraction (difficulty 2/5):** Segment by witness ('TESTIMONY OF MAJOR GENERAL ...'); keep Q/A; tag date of testimony (Feb-Apr 1864).
- Tools: python, regex
- Step: Segment witnesses
- Step: Index Gettysburg passages
- Step: Tag partisan context (Radical Republican committee vs Meade)
**Expected records** (basis: MEASURED keyword counts):
- gettysburg_mentions: 345
- sickles_mentions: 212
- witnesses: MEASURED: 33 distinct witness headings in vol.1 (OCR-noisy); Gettysburg-relevant subset to be selected
**Data types added:** sworn-style testimony on Sickles's advance, Meade's intent, council of war, quotes
**Quality / bias notes:**
- Highly partisan 1864 committee (Sickles/Butterfield vs Meade); the most contested account on the site (Sickles at the Peach Orchard) - must be labelled 'testimony, partisan context'.
**Effort:** M (1-2)  |  **Depends on:** none  |  **Audit refs:** H8

### SRC-14  [P1 | rank 14]  Maine at Gettysburg (Report of Maine Commissioners, 1898) + 20th Maine set (Gerrish 'Army Life' 1882; Reunions of the 20th Maine 1881)
*Category:* state_monument_commission  |  *Publisher/year:* Portland, 1898; 1882; 1881

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/maineatgettysbu01commgoog  [HTTP 200] - UC copy; 701 images; 1,627 KB; NOT_IN_COPYRIGHT; 240 'Gettysburg' + 57 'Sickles' hits (measured)
- [alt-copy] https://archive.org/details/06079300.3221.emory.edu  [HTTP 200] - Emory copy; 694 images; file 06079300_3221_djvu.txt
- [primary-text] https://archive.org/details/armylifeprivates00gerr  [HTTP 200] - Gerrish 'Army Life: a private's reminiscences of the Civil War' (1882; 20th Maine private); 436 images; 708 KB; 41 Gettysburg hits - modest
- [primary-text] https://archive.org/details/reunionsoftwenti00unit  [HTTP 200] - 'Reunions of the Twentieth Maine regiment association at Portland' (1881); 40 images
- [context-only] https://archive.org/details/passingofarmiesa00cham  [HTTP 200] - Chamberlain 'The Passing of the Armies' (1915) is about the 1865 Appomattox campaign; only 35 'Gettysburg' hits - NOT a primary Gettysburg source (measured)

**Format:** OCR text
**Size:** Maine at Gettysburg 1.6 MB text
**OCR quality:** good (lowest of the big state books) (proxy 0.892) - Gerrish 0.926; Passing of the Armies 0.914
**Rights:** public domain - basis: published 1881-1915
- Rights statement URL: https://archive.org/details/maineatgettysbu01commgoog
- Statement text: possible-copyright-status NOT_IN_COPYRIGHT (UC copy)
- Caveat: Later Chamberlain/Desjardin/Pullen (1957) material is copyrighted - not in scope.
**Extraction (difficulty 3/5):** Regiment sections for the 10 Maine unit records in site data (measured: 3rd, 4th, 5th, 6th, 7th, 16th, 17th, 19th, 20th Infantry + 1st Cavalry); Chamberlain's OR report is SRC-01 No.196.
- Tools: python, regex
- Step: Segment by regiment + speeches
- Step: Link to U-20ME etc.
- Step: Cross-check Melcher (B&L p.314) vs Chamberlain OR report vs Gerrish
**Expected records** (basis: MEASURED: 10 Maine unit records in deployed oob data):
- units: ~10-15
**Data types added:** regimental narratives, monument inscriptions, quotes, 20th Maine multi-source triangulation
**Quality / bias notes:**
- 20th Maine is the site's most-visited narrative; sources conflict on details of the bayonet charge timing - triangulate and store each as separate claim with source.
**Effort:** M (1-2)  |  **Depends on:** unit alias table  |  **Audit refs:** C3, H8

### SRC-15  [P1 | rank 15]  New Jersey: Final Report of the Gettysburg Battle-field Commission of New Jersey (1891) + Toombs, New Jersey Troops in the Gettysburg Campaign (1888)
*Category:* state_monument_commission  |  *Publisher/year:* 1888; 1891

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/finalreportofget00newj  [HTTP 200] - LoC copy; 214 images; 391 KB; 'unaware of any copyright restrictions'
- [primary-text] https://archive.org/details/newjerseytroopsi00intoom  [HTTP 200] - Toombs 1888; 460 images; 619 KB; NOT_IN_COPYRIGHT
- [alt-copy] https://archive.org/details/reportofgettysbu01newj  [HTTP 200] - 1887 preliminary report; 30 images

**Format:** OCR text
**Size:** 0.4 + 0.6 MB
**OCR quality:** good (proxy 0.906) - Toombs 0.939
**Rights:** public domain - basis: published 1888/1891
- Rights statement URL: https://archive.org/details/finalreportofget00newj
- Statement text: 'The Library of Congress is unaware of any copyright restrictions for this item.'
**Extraction (difficulty 2/5):** Regiment/battery sections; Toombs is a day-by-day campaign narrative for NJ units.
- Tools: python
- Step: Segment
- Step: Link to 13 NJ unit records
**Expected records** (basis: MEASURED: 13 NJ unit records in deployed data):
- units: 13
**Data types added:** regimental narratives, campaign narrative June 5-July 31, monument inscriptions
**Quality / bias notes:**
- Toombs compiled NJ accounts in 1888; still veteran-sourced.
**Effort:** S (0.5-1)  |  **Depends on:** unit alias table  |  **Audit refs:** H8

### SRC-16  [P1 | rank 16]  Michigan at Gettysburg (1889 dedication proceedings) + Curtis, History of the Twenty-fourth Michigan of the Iron Brigade (1891)
*Category:* state_monument_commission  |  *Publisher/year:* Detroit, 1889; 1891

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/cu31924030924736  [HTTP 200] - Michigan at Gettysburg, July 1st, 2d and 3rd, 1863, June 12th, 1889: proceedings...; Cornell; 268 images; 352 KB
- [primary-text] https://archive.org/details/historyoftwentyf00curti  [HTTP 200] - Curtis 1891; LoC copy; 504 images; 1,211 KB; NOT_IN_COPYRIGHT; 549 'Gettysburg' hits (measured)
- [alt-copy] https://archive.org/details/24thmichiganiron00curtrich  [HTTP 200] - UC copy; 498 images

**Format:** OCR text
**Size:** Curtis ~1.2 MB; Michigan report ~0.35 MB
**OCR quality:** good (proxy 0.93) - Michigan report 0.905
**Rights:** public domain - basis: published 1889/1891
- Rights statement URL: https://archive.org/details/historyoftwentyf00curti
- Statement text: possible-copyright-status NOT_IN_COPYRIGHT (LoC copy)
**Extraction (difficulty 2/5):** Curtis: chapter split; Gettysburg chapters (549 hits) give 24th Michigan July 1 in McPherson Woods with clock references; Michigan report: per-regiment speeches.
- Tools: python
- Step: Chapter segmentation
- Step: Extract July 1 timeline passages with times
- Step: Link to 11 MI unit records (measured: 1st, 3rd, 4th, 5th, 7th, 16th, 24th Infantry + 1st, 5th, 6th, 7th Cavalry)
**Expected records** (basis: MEASURED: 11 Michigan unit records in deployed oob data):
- units: 11
**Data types added:** regimental history (Iron Brigade), speeches, casualty lists by name, quotes
**Quality / bias notes:**
- Curtis was a 24th Michigan veteran; strong on July 1 detail; lists names.
**Effort:** S (0.5-1)  |  **Depends on:** unit alias table  |  **Audit refs:** H8

### SRC-17  [P1 | rank 17]  Minnesota in the Civil and Indian Wars 1861-1865 (2 vols., 1890-93) + Holcombe, History of the First Regiment Minnesota Volunteer Infantry (1916)
*Category:* state_monument_commission  |  *Publisher/year:* 1890-93; 1916

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/minnesotacivil01minnrich  [HTTP 200] - vol.1; UC copy; 876 images; 4,160 KB; NOT_IN_COPYRIGHT; 283 Gettysburg hits
- [primary-text] https://archive.org/details/minnesotacivil02minnrich  [HTTP 200] - vol.2; 686 images; 2,310 KB
- [primary-text] https://archive.org/details/historyoffirstre00minn  [HTTP 200] - Holcombe 1916; 582 images; 1,016 KB; 93 Gettysburg + 35 Sickles hits
- [alt-copy] https://archive.org/details/04090632.3107.emory.edu  [HTTP 200] - Holcombe, Emory copy; 562 images

**Format:** OCR text
**Size:** 4.2 + 2.3 + 1.0 MB
**OCR quality:** good (proxy 0.895) - Holcombe 0.925
**Rights:** public domain - basis: published 1890-93 / 1916
- Rights statement URL: https://archive.org/details/historyoffirstre00minn
- Statement text: IA terms
**Extraction (difficulty 3/5):** Extract the 1st Minnesota chapters (July 2 charge); only 1 MN unit is on site (1st MN).
- Tools: python
- Step: Segment Gettysburg chapter
- Step: Time/place claims table
**Expected records** (basis: MEASURED: 1 Minnesota unit record in deployed data):
- units: 1 (but a marquee July 2 narrative)
**Data types added:** regimental narrative, widely repeated Hancock quote (verify against OR and Holcombe before use), casualty roll
**Quality / bias notes:**
- Regimental-association narrative; celebratory; verify the widely repeated casualty figures and quotes against the OR reports (e.g. Hancock) before publishing.
**Effort:** S (0.5-1)  |  **Depends on:** none  |  **Audit refs:** H8

### SRC-18  [P1 | rank 18]  Bates, Samuel P. - History of Pennsylvania Volunteers, 1861-5 (5 vols., 1869-71)
*Category:* regimental_histories  |  *Publisher/year:* Harrisburg, 1869-71

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/historyofpennsyl01bate  [HTTP 200] - vol.1; Pitt copy; 1,372 images; 6,608 KB; ABBYY 8; 392 Gettysburg hits in vol.1
- [primary-text] https://archive.org/details/historyofpennsyl02bate  [HTTP 200] - vol.2
- [primary-text] https://archive.org/details/historyofpennsyl03bate  [HTTP 200] - vol.3
- [primary-text] https://archive.org/details/historyofpennsyl04bate  [HTTP 200] - vol.4
- [primary-text] https://archive.org/details/histpennavol05baterich  [HTTP 200] - vol.5; UC copy; 1,460 images; 9,135 KB

**Format:** OCR text; large volumes
**Size:** vol.1 6.6 MB; vol.5 9.1 MB (metadata)
**OCR quality:** fair-good (lowest of P1 set) (proxy 0.878) - vol.1 sample
**Rights:** public domain - basis: published 1869-71
- Rights statement URL: https://archive.org/details/historyofpennsyl01bate
- Statement text: possible-copyright-status NOT_IN_COPYRIGHT
**Extraction (difficulty 3/5):** Per-regiment historical sketch + roster; only sketches for the 74 PA units at Gettysburg are needed.
- Tools: python, alias table
- Step: Locate regiment sketch headings
- Step: Extract Gettysburg paragraph window
- Step: Skip rosters unless name-level features planned (see SRC-Plan open questions)
**Expected records** (basis: MEASURED: 74 PA unit records on site):
- units: 74 sketches
**Data types added:** regimental sketches (contemporary, 1869), commanders, rosters (name-level)
**Quality / bias notes:**
- 1869 state-commissioned histories are closer in time than 1890s commission books; sketches are short and formulaic.
**Effort:** M (2)  |  **Depends on:** unit alias table  |  **Audit refs:** H8

### SRC-19  [P1 | rank 19]  Phisterer, Frederick - New York in the War of the Rebellion, 1861 to 1865 (3rd ed., 1912, 6 vols.)
*Category:* reference_statistics  |  *Publisher/year:* Albany, 1912 (3rd ed.)

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/newyorkinwarofre01phisrich  [HTTP 200] - vol.1; UC copy; 926 images; 3,638 KB; NOT_IN_COPYRIGHT
- [primary-text] https://archive.org/details/newyorkinwarofre02phisrich  [HTTP 200] - vol.2
- [primary-text] https://archive.org/details/newyorkinwarofre03phisrich  [HTTP 200] - vol.3; 922 images; 3,871 KB
- [primary-text] https://archive.org/details/newyorkinwarofre04phisrich  [HTTP 200] - vol.4
- [primary-text] https://archive.org/details/newyorkinwarofre05phisrich  [HTTP 200] - vol.5
- [primary-text] https://archive.org/details/newyorkinwarofre06phisrich  [HTTP 200] - vol.6; 388 images (index)

**Format:** OCR text
**Size:** ~3.6-3.9 MB per main volume
**OCR quality:** good (proxy 0.943)
**Rights:** public domain - basis: published 1912 (pre-1931)
- Rights statement URL: https://archive.org/details/newyorkinwarofre01phisrich
- Statement text: NOT_IN_COPYRIGHT
- Caveat: Use 1912 3rd ed.; later reprints are copyrighted.
**Extraction (difficulty 3/5):** Per-unit entries: organisation dates, commanders, battles list, losses; key by NY numbering; feed alias table (militia numbers, e.g. 84th NY = 14th Brooklyn).
- Tools: python, regex
- Step: Parse entries
- Step: Build NY alias map
- Step: Fix site alias row 'U-14BK (alias for U-84NY)' at data level
**Expected records** (basis: MEASURED: 75 NY-state unit records on site; Phisterer covers ~all NY units (300+)):
- units: 75+
**Data types added:** unit organisation/service dates, battles list, loss totals, commander succession, NY alias table
**Quality / bias notes:**
- Compilation from state records; statistical tone, few narratives.
**Effort:** M (2)  |  **Depends on:** SRC-03  |  **Audit refs:** H7, H10

### SRC-20  [P1 | rank 20]  Dyer, Frederick H. - A Compendium of the War of the Rebellion (1908)
*Category:* reference_statistics  |  *Publisher/year:* Des Moines: Dyer Publishing Co., 1908

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/08697590.3359.emory.edu  [HTTP 200] - 1908 original; Emory copy; 1,810 images; 14,698,452 bytes text; file 08697590_3359_djvu.txt
- [alt-copy] https://archive.org/details/bub_gb_OBkNAQAAMAAJ  [HTTP 200] - Google-scan copy; 1,803 images

**Format:** OCR text (14.7 MB)
**Size:** 14.7 MB
**OCR quality:** good (proxy 0.921)
**Rights:** public domain (1908 original only) - basis: published 1908
- Rights statement URL: https://archive.org/details/08697590.3359.emory.edu
- Statement text: IA terms
- Caveat: Do NOT ingest the 1959 Yoseloff reprint items (compendiumofwaro0001dyer etc.) - copyrighted.
**Extraction (difficulty 3/5):** Union regiments by state: organisation + service list + casualty line; use for Union unit validation and 'Present also at' lists.
- Tools: python, regex
- Step: Parse per-regiment entries for site states
- Step: Join to regiment_id
**Expected records** (basis: ESTIMATE: the book covers all Union regiments; only the ~329 Union site unit records matter (measured: U- prefixed regiment/battery records in data/oob)):
- units: ~330
**Data types added:** regiment service summaries, casualty totals, battle participation
**Quality / bias notes:**
- Union only; concise; occasional discrepancies vs Fox.
**Effort:** M (2)  |  **Depends on:** unit alias table  |  **Audit refs:** H10

### SRC-22  [P1 | rank 21]  GNMP Commission monument-location lists (1903, 1912, 1916, 1921 on IA; 1932 and 1993 on npshistory.com) + annual Reports of the Gettysburg National Military Park Commission 1893-1933
*Category:* monuments  |  *Publisher/year:* U.S. War Department / NPS

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/locationofmonume00unit  [HTTP 200] - 1903; 38 images
- [primary-text] https://archive.org/details/locationofmonume02unit  [HTTP 200] - 1912; 48 images
- [primary-text] https://archive.org/details/locationofmonume03unit  [HTTP 200] - 1916; 58 images
- [primary-text] https://archive.org/details/locationofmonume01unit  [HTTP 200] - 1921; 56 images; OCR proxy 0.829 (fair)
- [primary-text] https://npshistory.com/publications/gett/mon-locations-1932.pdf  [HTTP 206] - 2,095,190 bytes; pdftotext -layout => 139,713 chars (measured); table columns Regiment/Brigade/Corps/Location by state and arm
- [primary-text] https://npshistory.com/publications/gett/mon-locations-1993.pdf  [HTTP 206] - 7,014,723 bytes; not analysed
- [portal] https://npshistory.com/publications/gett/index.htm  [HTTP 206] - administrative histories, CLRs, boundary study, books
- [primary-text] https://gdg.org/Research/Authored%20Items/BCRReports/  [HTTP 206, TLS certificate problem (fetched with curl -k; see card note)] - TLS certificate EXPIRED at check time (WebFetch error 'certificate has expired'; curl -k returned 200); index lists 1893.html ... 1933.html; 1913.html = 28,308 chars 'REPORT OF THE GETTYSBURG NATIONAL MILITARY PARK COMMISSION'. Prefer to source the same reports from HathiTrust/IA to avoid a lapsed-cert host.

**Format:** IA OCR text; NPS PDFs with text layer; GDG static HTML
**Size:** small (tens to hundreds of KB) except 1993 PDF 7 MB
**OCR quality:** fair - table OCR (proxy 0.829) - 1932 PDF text is layout-flattened (e.g. '14 Smyth ... North Hancock Avenue')
**Rights:** public domain - basis: US Government publications (War Department 1903-1921; NPS 1932/1993) - 17 U.S.C. 105
- Rights statement URL: https://www.copyright.gov/title17/92chap1.html
- Statement text: 17 U.S.C. 105: copyright protection under this title is not available for any work of the United States Government (statute; NPS disclaimer page https://www.nps.gov/aboutus/disclaimer.htm)
- Caveat: GDG transcriptions are a third-party web edition; the original reports are federal works but confirm GDG's compilation terms or re-source.
**Extraction (difficulty 4/5):** Parse the 1932/1993 tables into (state, arm, unit, brigade, corps, location) rows; compare editions (1903 -> 1993) to date monuments and fix 'tablet' vs 'monument'; use the annual reports for dates of avenue construction, land purchases, marker placement (land/terrain changes since 1863).
- Tools: python, pdftotext -layout, rapidfuzz
- Step: Table parse with column heuristics
- Step: Manual QA for ~10% rows
- Step: Join to site data/monuments.json
**Expected records** (basis: ESTIMATE (total monument/marker count not verified in this session)):
- rows: ESTIMATE hundreds of unit rows in 1932 list; measure in pilot
**Data types added:** monument/marker/tablet inventory and locations by unit, avenue names and places, land/terrain change history, dates of dedication
**Quality / bias notes:**
- Monument locations are post-1880 memorial positions and may differ from 1863 battle positions (many regimental tablets mark positions per Bachelder's research) - do not equate with battle-time locations.
- Monuments can carry commemorative inaccuracies - use as 'memorial record', not battle truth.
**Effort:** M (2-3)  |  **Depends on:** site data/monuments.json schema  |  **Audit refs:** new

### SRC-23  [P1 | rank 22]  Period battlefield guides by Bachelder (1864-1904), Vanderslice (1897/1899), Wert (1886), Hammond (1899)
*Category:* guides_secondary_period  |  *Publisher/year:* 1864-1904

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/gettysburgwhatto00bach  [HTTP 200] - Bachelder 'Gettysburg: what to see' 1873; LoC; 192 images; 268 KB
- [primary-text] https://archive.org/details/gettysburgwhatt00bach  [HTTP 200] - 1889 ed.; 166 images; 255 KB
- [primary-text] https://archive.org/details/keytobacheldersi00bach  [HTTP 200] - 'Key to Bachelder's isometrical drawing' 1864; 20 images; 19 KB; LoC 'unaware of any copyright restrictions'
- [primary-text] https://archive.org/details/paintingoftherepulse00bachrich  [HTTP 200] - 'Descriptive key to the painting of the repulse of Longstreet's assault' 1870; 122 images
- [primary-text] https://archive.org/details/storybattlegett00bachgoog  [HTTP 200] - 'The story of the battle of Gettysburg' 1904; 101 images
- [primary-text] https://archive.org/details/gettysburgwhereh00vand  [HTTP 200] - Vanderslice 'Gettysburg; where and how the regiments fought' 1897; 266 images; 359 KB; 88 Gettysburg hits
- [primary-text] https://archive.org/details/thenandnowgetty00vandrich  [HTTP 200] - 'Gettysburg, then and now' 1899; 508 images
- [primary-text] https://archive.org/details/acompletehandbo00wertgoog  [HTTP 200] - Wert 'A complete hand-book of the monuments and indications' 1886; 237 images; 568 KB; OCR proxy 0.867
- [primary-text] https://archive.org/details/monumentalguidet00hamm  [HTTP 200] - Hammond 'Monumental guide to the Gettysburg battlefield' 1899; 24 images

**Format:** OCR text
**Size:** each 20-570 KB
**OCR quality:** good (proxy 0.89) - Bachelder 1873 0.894; Vanderslice 0.916; Wert 0.867
**Rights:** public domain - basis: published 1864-1904
- Rights statement URL: https://archive.org/details/gettysburgwhatto00bach
- Statement text: LoC copy: 'The Library of Congress is unaware of any copyright restrictions for this item.'
**Extraction (difficulty 2/5):** Guide entries = tour-stop descriptions with directions & landmarks (place names, avenues, monument indications); parse stops.
- Tools: python
- Step: Segment tour stops
- Step: Extract place-name gazetteer (farms, roads, rocks)
- Step: Cross-link with terrain features (30 mapped in site data)
**Expected records** (basis: ESTIMATE):
- records: 100-200 tour stops/places across guides
**Data types added:** place-name gazetteer, descriptive geography as seen 1873-1899, unit-position indications (Bachelder-derived)
**Quality / bias notes:**
- Bachelder was the government-appointed battlefield historian (1880-86) and a promoter; his own maps/guides encode the 'Bachelder consensus' that later scholarship revised.
**Effort:** M (1-2)  |  **Depends on:** none  |  **Audit refs:** H13, D3

### SRC-24  [P1 | rank 23]  Confederate regimental memoirs: Oates, The War Between the Union and the Confederacy (1905; 15th Alabama); Polley, Hood's Texas Brigade (1910)
*Category:* participant_narratives  |  *Publisher/year:* 1905; 1910

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/01897724.3053.emory.edu  [HTTP 200] - Oates; Emory copy; 838 images; 2,258,811 bytes; file 01897724_3053_djvu.txt
- [primary-text] https://archive.org/details/hoodstexasbriga00poll  [HTTP 200] - Polley 1910; 416 images; 902 KB; 170 Gettysburg hits

**Format:** OCR text
**Size:** 2.3 MB + 0.9 MB
**OCR quality:** good (proxy 0.948) - Polley 0.943
**Rights:** public domain - basis: published 1905/1910
- Rights statement URL: https://archive.org/details/hoodstexasbriga00poll
- Statement text: IA terms
**Extraction (difficulty 2/5):** Chapter extraction of Gettysburg (Oates: Little Round Top assault on 20th Maine); pair with Melcher/Chamberlain/Gerrish.
- Tools: python
- Step: Extract chapters
- Step: Time/place claims
**Expected records** (basis: ESTIMATE):
- passages: a few dozen
**Data types added:** Confederate first-person narrative, opposing account of Little Round Top, Texas Brigade July 2
**Quality / bias notes:**
- Oates wrote in 1905 as postwar Alabama politician; strong bias; conflicts with Chamberlain on numbers/time - present as paired claims.
**Effort:** S (0.5)  |  **Depends on:** none  |  **Audit refs:** H8

### SRC-27  [P1 | rank 24]  The Compiler (Gettysburg, Pa.) 1857-1866 - Pennsylvania Newspaper Archive (Penn State / NDNP)
*Category:* newspapers  |  *Publisher/year:* weekly, Henry J. Stahle; 1863 = 51 issues (no July 6 issue)

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [index] https://panewsarchive.psu.edu/lccn/sn85055100/issues/1863/  [HTTP 200] - 51 weekly issues in 1863: Jan 5 ... Jun 29, then Jul 13, 20, 27 ... Dec 28 (no Jul 6)
- [ocr-text] https://panewsarchive.psu.edu/lccn/sn85055100/1863-07-13/ed-1/seq-2/ocr.txt  [HTTP 200] - 51,094 chars; also /ocr.xml (ALTO-like, ~1.9 MB per page) and /ocr/ HTML
- [search-api] https://panewsarchive.psu.edu/search/pages/results/?lccn=sn85055100&dateFilterType=yearRange&date1=1863&date2=1863&format=json  [HTTP 200] - returned 1,880 total items for the title but did NOT honour the year filter in my test (results began 1861) - filter client-side by 'date'
- [docs] https://panewsarchive.psu.edu/about/  [read via WebFetch] - ~366,000 pages; Open ONI; JSON/Atom search, stable URLs, IIIF, Linked Data, bulk data and OCR archives, CORS/JSONP; funded by NDNP. (curl timed out on this URL on a later check; server is intermittently slow.)

**Format:** page-level OCR text + ALTO XML + page images (IIIF); JSON search
**Size:** ~4 pages/issue; 1863 ~200 pages; 51-KB text/page
**OCR quality:** POOR (proxy 0.45) - 1863-07-13 seq-2 begins 'BATTLES 0F GETTYSBURG. "Our uguallyquict null unpretnullmg lit tle town of Gettysburg has become hiutnric."' - about half of tokens unrecognisable; requires re-OCR from page images + LLM/human cleanup
**Rights:** public domain (NDNP position: pre-1931 newspapers) - basis: NDNP/Chronicling America statement
- Rights statement URL: https://guides.loc.gov/chronicling-america/about-the-collection
- Statement text: "Newspapers published in the United States more than 95 years ago are in the public domain in entirety." (guide, fetched 2026-09-30). PNA 'About' page has no explicit reuse statement.
- Caveat: No explicit PNA reuse text found; rely on NDNP PD position and keep attribution to PNA.
**Extraction (difficulty 5/5):** 1) Pull July 13/20/27 + Aug-Nov 1863 pages (page images via IIIF) ; 2) re-OCR with Tesseract 5 / Kraken + column detection; 3) LLM-assisted correction with human spot-check; 4) segment articles; 5) tag as 'local newspaper, contemporaneous'.
- Tools: Tesseract or Kraken, IIIF image fetch, LLM post-correction, human review
- Step: Define target window (July 13-Nov 30 1863, ~20 issues x 4 pp = ~80 pages)
- Step: Re-OCR + gold-set of 10 pages for CER estimate
- Step: Article segmentation
- Step: Index: Gettysburg civilians, damage claims, hospital notices, Lincoln address coverage (Nov 23/30 issues)
**Expected records** (basis: MEASURED issue counts; article counts ESTIMATE):
- issues_1863: 51
- pages_target: ~80
- articles: ESTIMATE 300-600 usable after cleanup
**Data types added:** contemporary local coverage (Adams County civilians), battle-week accounts written days after, Lincoln address coverage (Nov 1863), notices/advertisements
**Quality / bias notes:**
- Democratic paper (per catalog note) - partisan tone; issue of July 6 absent (battle week).
- Adams Sentinel (Republican) not freely available (see X-05).
**Effort:** XL (6-10 (re-OCR + cleanup) - candidate for a later phase)  |  **Depends on:** OCR pipeline + review capacity  |  **Audit refs:** new

### SRC-28  [P1 | rank 25]  Chronicling America (LoC / NDNP) - July 1863 national coverage of the battle via loc.gov JSON API
*Category:* newspapers  |  *Publisher/year:* 1863 dailies and weeklies

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [search-api] https://www.loc.gov/collections/chronicling-america/?q=gettysburg&dates=1863-07-04/1863-07-31&dl=page&fo=json&c=5  [HTTP 206] - 1,425 full-text page results (measured); top titles: New-York Daily Tribune 76, New York Herald 69, Chicago Daily Tribune 48, Cleveland Morning Leader 48, Worcester Daily Spy 41, Portland Daily Press 36
- [legacy-redirect] https://chroniclingamerica.loc.gov/search/pages/results/?andtext=gettysburg&format=json  [HTTP 404 (redirects)] - redirects to https://www.loc.gov/chroniclingamerica/search/pages/results/... (HTML 404 for JSON format in my test) - use the loc.gov collection API instead
- [docs] https://www.loc.gov/apis/json-and-yaml/working-within-limits/  [read via WebFetch] - 20 req/min JSON; 150/min text services
- [rights-statement] https://guides.loc.gov/chronicling-america/about-the-collection  [read via WebFetch] - see SRC-27 statement

**Format:** JSON search results; per-page OCR text/ALTO via loc.gov resource URLs; page images IIIF
**Size:** 1,425 pages for the query (July 4-31); more with 'battle of gettysburg', 'Pickett', 'Meade' etc.
**OCR quality:** unknown (varies by paper; measure with the in-vocab proxy in the pilot)
**Rights:** public domain (NDNP position) - basis: pre-1931 newspapers
- Rights statement URL: https://guides.loc.gov/chronicling-america/about-the-collection
- Statement text: "Newspapers published in the United States more than 95 years ago are in the public domain in entirety."
- Caveat: Respect 20/min API limit; cache results.
**Extraction (difficulty 3/5):** Curated harvest: fixed list of ~15 titles x July 4-15 1863; store page OCR; extract battle-report articles (casualty telegrams, 'Bulletin from Gettysburg') with timestamped telegram headers.
- Tools: python requests with 3-s spacing, article segmentation heuristics
- Step: Facet by title
- Step: Download top ~200 pages
- Step: Article-level clean-up on shortlisted ~50 articles
**Expected records** (basis: MEASURED page count):
- pages_available: 1425
- curated_target: ESTIMATE 50-150 articles
**Data types added:** how the battle was reported in the North in real time (telegram dispatches with times), public reaction/timing of news (Lincoln July 4 announcement), Southern papers (Richmond) for Confederate framing if included
**Quality / bias notes:**
- Second-hand, telegraph-based, often wrong on numbers - use for 'what the public believed when'.
- No Gettysburg-published 1863 title turned up in my Chronicling America title queries; the Adams Sentinel LoC record (sn83032079) is title-level only (digitized False; measured).
**Effort:** M (2-3)  |  **Depends on:** none  |  **Audit refs:** new

### SRC-30  [P1 | rank 26]  NARA Record Group 77 (Civil Works Map File) Gettysburg maps + NPS Gettysburg museum collection drawings (GNPC numbered maps 1893-1922; Commission general maps)
*Category:* historic_maps  |  *Publisher/year:* 1863-1922

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [portal] https://unwritten-record.blogs.archives.gov/2018/07/03/mapping-the-battle-of-gettysburg/  [read via WebFetch] - Elliot's map (Parts 1 & 2), oval 'Battlefield of Gettysburg, Pa.', Warren 1868-69 rev. 1873, Bachelder's published map, E.B. Cope topography; all RG 77 Civil Works Map File
- [catalog-record] https://catalog.archives.gov/id/305570  [HTTP 200] - HTTP 200 but JS shell (5,454 bytes) - content not verifiable by curl; NAIDs also 17370358, 6860337, 102279222, 176246316, 176246318 (from blog)
- [finding-aid] https://museum.nps.gov/Media/00001/Gett%2041137,%20Commission%20General%20Maps%20and%20Drawings,00635923399151792978.pdf  [HTTP 206] - 290,844 bytes
- [portal] https://www.nps.gov/gett/learn/historyculture/library-resource-guide.htm  [HTTP 206]

**Format:** Scanned maps via NARA Catalog (JS app; API needs key - not verified) and NPS museum PDFs
**Size:** unknown
**OCR quality:** n/a
**Rights:** public domain (US Government records) - basis: 17 U.S.C. 105; RG 77 federal records
- Rights statement URL: https://www.copyright.gov/title17/92chap1.html
- Statement text: federal works not copyrightable; NARA blog states copies via Cartographic Research Room, no rights statement
- Caveat: Dealer pages report a 28-map Bachelder 'hourly' set - I could NOT confirm its repository or digitisation; contact NARA Cartographic (College Park) and GNMP archivist.
**Extraction (difficulty 4/5):** Resolve NAIDs via NARA Catalog (requires a browser or API key); download high-res TIFF/JPEG; queue for georeferencing (SRC-09).
- Tools: NARA Catalog API v2 (key), IIIF where offered
- Step: Confirm existence of Bachelder hourly maps
- Step: Request scans if not online
- Step: Georeference
**Expected records** (basis: MEASURED from blog):
- maps: 5 named RG 77 items + Bachelder 28-map set (unverified)
**Data types added:** time-stamped Bachelder tactical maps (if found) - the single best 'minute-by-minute' cartographic source, Cope topography, Warren survey
**Quality / bias notes:**
- If the 28 hourly maps exist digitally they should outrank all other cartographic sources for tick placement.
**Effort:** M (1-2 discovery; XL to digitise)  |  **Depends on:** SRC-09  |  **Audit refs:** C4, D3

### SRC-21  [P2 | rank 27]  Livermore, Thomas L. - Numbers and Losses in the Civil War in America, 1861-65 (1900/1901)
*Category:* reference_statistics  |  *Publisher/year:* 1900/1901

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/numberslosses00liverich  [HTTP 200] - UC copy; 174 images; 307 KB; NOT_IN_COPYRIGHT

**Format:** OCR text
**Size:** 307 KB
**OCR quality:** excellent (proxy 0.965)
**Rights:** public domain - basis: 1901
- Rights statement URL: https://archive.org/details/numberslosses00liverich
- Statement text: NOT_IN_COPYRIGHT
**Extraction (difficulty 2/5):** Gettysburg chapter tables of army strength/losses (both sides) for cross-checking OR returns (extract both sides' strength/loss claims verbatim from the text).
- Tools: python
- Step: Extract Gettysburg tables
- Step: Compare with OR Pt1 No.13/15 and Pt2 No.427
**Expected records** (basis: ESTIMATE):
- tables: a few battle-level tables
**Data types added:** army strengths/losses (aggregate), methodology notes
**Quality / bias notes:**
- Aggregate only; Confederate strength figures are contested; present as range.
**Effort:** S (0.5)  |  **Depends on:** none  |  **Audit refs:** H10

### SRC-25  [P2 | rank 28]  Evans, Clement A. (ed.) - Confederate Military History (12 vols., 1899)
*Category:* regimental_histories  |  *Publisher/year:* Atlanta: Confederate Publishing Co., 1899

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/confedmilhist01evanrich  [HTTP 200] - vol.1; 804 images; 1,697 KB; NOT_IN_COPYRIGHT
- [primary-text] https://archive.org/details/confedmilhist03evanrich  [HTTP 200] - metadata says vol.02; 364 images (id numbering does not match volume numbering - map via /metadata 'volume')
- [primary-text] https://archive.org/details/confedmilhist04evanrich  [HTTP 200]
- [primary-text] https://archive.org/details/confedmilhist05evanrich  [HTTP 200]
- [primary-text] https://archive.org/details/confedmilhist08evanrich  [HTTP 200]
- [primary-text] https://archive.org/details/confedmilhist10evanrich  [HTTP 200]
- [primary-text] https://archive.org/details/confedmilhist11evanrich  [HTTP 200]
- [primary-text] https://archive.org/details/confedmilhist12evanrich  [HTTP 200]

**Format:** OCR text
**Size:** 0.7-1.7 MB per volume
**OCR quality:** good (proxy 0.9) - vol '02' item 0.90
**Rights:** public domain - basis: published 1899
- Rights statement URL: https://archive.org/details/confedmilhist01evanrich
- Statement text: NOT_IN_COPYRIGHT (UC copy)
- Caveat: avoid modern reprints
**Extraction (difficulty 3/5):** State volumes (Virginia, NC, SC, Georgia, Alabama, Mississippi, Louisiana...) - extract Gettysburg passages by state and unit; map via state prefix.
- Tools: python, keyword window extraction
- Step: Volume->state map
- Step: Extract unit passages
**Expected records** (basis: ESTIMATE):
- passages: 100-300 across states
**Data types added:** state-level Confederate narrative, brigade/regiment summaries
**Quality / bias notes:**
- Heavily Lost Cause; 1899 popular history - lowest evidentiary weight in the catalog; tag 'secondary_period_advocacy'.
**Effort:** M (2)  |  **Depends on:** none  |  **Audit refs:** H8

### SRC-26  [P2 | rank 29]  Smaller state/regiment commemorative reports: Vermont (1890), Maryland (1891), Illinois (1892), Indiana (1913), Rhode Island (1914), Virginia (1917), Ohio (1887), Connecticut (1884-87), Massachusetts monuments (Roe, 1910)
*Category:* state_monument_commission  |  *Publisher/year:* 1884-1917

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/vermontmonuments00verm  [HTTP 200] - Vermont commissioners 1890; 78 images; 85 KB; LoC 'unaware of any copyright restrictions'
- [primary-text] https://archive.org/details/reportofstateofm00mary  [HTTP 200] - Maryland 1891; 178 images; 301 KB
- [primary-text] https://archive.org/details/illinoismonument00beve  [HTTP 200] - Illinois monuments at Gettysburg 1892; 74 images; 131 KB
- [primary-text] https://archive.org/details/indianaatfiftiet00pick  [HTTP 200] - Indiana at the fiftieth anniversary 1913; 158 images; 212 KB
- [primary-text] https://archive.org/details/reportofrhodeisl00rhod  [HTTP 200] - Rhode Island 1914; 36 images; 55 KB
- [primary-text] https://archive.org/details/ceremoniesattend00virg  [HTTP 200] - Virginia memorial 1917; 78 images; 137 KB
- [primary-text] https://archive.org/details/dedicationofohio00ohio  [HTTP 200] - Ohio memorials 1887; 46 images; 13 KB text (short)
- [primary-text] https://archive.org/details/fifthconnecticut00unit  [HTTP 200] - 5th CT 1887; 42 images
- [primary-text] https://archive.org/details/17thconnecticutv00unit  [HTTP 200] - 17th CT 1884; 56 images
- [primary-text] https://archive.org/details/27thConnecticutVolunteersDedicationOfTheMonumentAtGettysburg1885  [HTTP 200] - 27th CT 1885
- [primary-text] https://archive.org/details/monumentstablets00roea  [HTTP 200] - Roe 1910 'Monuments, tablets and other memorials erected in Massachusetts...'; 232 images; 370 KB

**Format:** OCR text
**Size:** 13-370 KB each
**OCR quality:** good (proxy 0.906) - NJ 0.906 as class proxy; others not individually measured
**Rights:** public domain - basis: published 1884-1917
- Rights statement URL: https://archive.org/details/vermontmonuments00verm
- Statement text: LoC/IA statuses per item (NOT_IN_COPYRIGHT or 'unaware of any copyright restrictions')
**Extraction (difficulty 2/5):** Small texts; per-unit sections or inscription lists; treat each as one 'commemorative report' document with unit tags.
- Tools: python
- Step: Ingest whole as documents
- Step: Tag units manually/alias table
**Expected records** (basis: MEASURED site coverage: VT 9, IN 5, CT 5, MD 4, IL 3, DE 2, MN 1, RI 1 (+ OH 14, MA 18, WI 6, NH 3, WV 4 without a dedicated book found)):
- units: ~40 units covered directly
**Data types added:** monument inscriptions, speeches, unit summaries
**Quality / bias notes:**
- Ohio (13 KB) and Rhode Island (55 KB) volumes are thin; Massachusetts has no dedicated Gettysburg commission book in IA title search (Roe covers all MA memorials).
**Effort:** M (1-2)  |  **Depends on:** none  |  **Audit refs:** new

### SRC-29  [P2 | rank 30]  Gettysburg Address - five manuscript versions (Nicolay, Hay, Everett, Bancroft, Bliss) + Everett oration + contemporaneous reports
*Category:* addresses_speeches  |  *Publisher/year:* 1863-64

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-portal] https://www.loc.gov/exhibits/gettysburg-address/  [HTTP 200] - LoC holds Nicolay and Hay copies (fetched summary); Everett copy Illinois State Historical Library; Bancroft copy Cornell; Bliss copy White House
- [primary-text] https://www.loc.gov/exhibits/gettysburg-address/ext/trans-nicolay-copy.html  [HTTP 200] - 200 OK; other 'trans-*-copy' URLs I guessed returned 404
- [comparison] https://exhibits.library.cornell.edu/gettysburg/feature/the-five-copies  [HTTP 200] - 200 OK
- [clean-text] https://www.gutenberg.org/ebooks/4  [HTTP 200] - 200 OK

**Format:** HTML transcriptions; manuscript images (LoC Abraham Lincoln Papers)
**Size:** ~270 words each
**OCR quality:** n/a (hand-keyed transcriptions)
**Rights:** public domain - basis: 1863-64 works of A. Lincoln
- Rights statement URL: https://www.gutenberg.org/policy/license.html
- Statement text: Gutenberg license page; LoC exhibit pages state no reuse limits in the fetched summary
- Caveat: LoC manuscript image item pages returned HTTP 403 to my scripted client - fetch by hand.
**Extraction (difficulty 1/5):** Manual: store 5 versions + variant diff (word-level) + provenance notes.
- Tools: difflib
- Step: Type/paste five texts
- Step: Compute diff table
- Step: Add a 'Nov 19, 1863' vignette with dedication context
**Expected records** (basis: MEASURED):
- documents: 5
**Data types added:** canonical speech text + variants, dedication context
**Quality / bias notes:**
- Fixed documents; only the 'which version is canonical' editorial choice matters.
**Effort:** S (0.25)  |  **Depends on:** none  |  **Audit refs:** new

### SRC-31  [P2 | rank 31]  Project Gutenberg - Gettysburg-related e-texts (Haskell #33121; Drake #49530; Storrick #50504; H.D. Longstreet #44459; Bond #57392; Doubleday #20762; Tilberg #56209; Lincoln #4)
*Category:* clean_text_seed  |  *Publisher/year:* various 1863-1962 originals

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://www.gutenberg.org/ebooks/33121  [HTTP 504 - first fetch on 2026-09-30 returned HTTP 200 (page read), later attempts returned transient 504 gateway timeout] - release July 9 2010; text file https://www.gutenberg.org/cache/epub/33121/pg33121.txt = 248,690 bytes (measured); produced from IA scans by DP
- [primary-text] https://www.gutenberg.org/ebooks/49530  [HTTP 504 - first fetch on 2026-09-30 returned HTTP 200 (page read), later attempts returned transient 504 gateway timeout]
- [primary-text] https://www.gutenberg.org/ebooks/50504  [HTTP 200]
- [primary-text] https://www.gutenberg.org/ebooks/44459  [HTTP 504 - first fetch on 2026-09-30 returned HTTP 200 (page read), later attempts returned transient 504 gateway timeout] - partisan 1904 defence of Longstreet
- [primary-text] https://www.gutenberg.org/ebooks/57392  [HTTP 504 - first fetch on 2026-09-30 returned HTTP 200 (page read), later attempts returned transient 504 gateway timeout]
- [policy] https://www.gutenberg.org/policy/robot_access.html  [read via WebFetch] - site is 'intended for human users only'; bulk via wget -w 2 -m -H 'https://www.gutenberg.org/robot/harvest?filetypes[]=txt' or private mirror; catalog offline formats
- [rights-statement] https://www.gutenberg.org/policy/license.html  [HTTP 206] - public-domain texts in the US; trademark terms apply to the PG name

**Format:** plain text / HTML / EPUB
**Size:** Haskell 249 KB
**OCR quality:** excellent
**Rights:** public domain in the U.S. (Gutenberg) - basis: works published before 1931; PG license page
- Rights statement URL: https://www.gutenberg.org/policy/license.html
- Statement text: eBook 'for the use of anyone anywhere in the United States and most other parts of the world at no cost and with almost no restrictions whatsoever' (from #33121 header)
- Caveat: Tilberg (NPS-published) - check per-book author/date; Gutendex API returned 503 and gutenberg.org search 504 at check time (transient) - could not enumerate catalog by API.
**Extraction (difficulty 1/5):** Download the plain-text via the robot harvest or mirror; strip PG boilerplate; paragraph-chunk.
- Tools: wget with -w 2, python
- Step: Fetch 8 books
- Step: Strip header/footer
- Step: Tag author/year
**Expected records** (basis: MEASURED):
- books: 8
**Data types added:** Haskell eyewitness (Hancock's aide) with timings, secondary narratives (Drake, Storrick, Doubleday)
**Quality / bias notes:**
- Haskell (1863 letter, published 1908) is a classic; Doubleday (1882) is a partisan Union general's narrative; H.D. Longstreet (1904) is advocacy.
**Effort:** S (0.5)  |  **Depends on:** none  |  **Audit refs:** new

### SRC-32  [P2 | rank 32]  Wikimedia Commons - Gettysburg categories (secondary image source / cross-check)
*Category:* photographs  |  *Publisher/year:* n/a

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [portal] https://commons.wikimedia.org/wiki/Category:Battle_of_Gettysburg  [HTTP 200] - API: https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Battle_of_Gettysburg
- [rights-statement] https://commons.wikimedia.org/wiki/Commons:Licensing  [HTTP 200] - per-file license templates (PD-US-expired etc.) must be read per file

**Format:** MediaWiki API JSON; originals via upload.wikimedia.org
**Size:** 296 files in main category; Maps category 16 files; O'Sullivan 27; Gettysburg Address 57 (measured)
**OCR quality:** n/a
**Rights:** varies per file (mostly PD-US) - basis: per-file template
- Rights statement URL: https://commons.wikimedia.org/wiki/Commons:Licensing
- Statement text: each file page carries its own license; only accept PD-Old/PD-US/PD-USGov/CC0/CC-BY(-SA with attribution)
- Caveat: Small relative to LoC; use mainly for maps and modern diagrams under CC-BY(-SA) - watch SA obligations.
**Extraction (difficulty 2/5):** MediaWiki API: list category members, fetch extmetadata (LicenseShortName, Artist, Credit), filter allow-list.
- Tools: python
- Step: List members
- Step: License allow-list
- Step: Download thumbnails
**Expected records** (basis: MEASURED):
- files: 296
**Data types added:** images, maps, license metadata
**Quality / bias notes:**
- Captions are community-written; provenance varies.
**Effort:** S (0.5-1)  |  **Depends on:** none  |  **Audit refs:** new

### SRC-33  [P2 | rank 33]  NPS History e-Library (npshistory.com) - Gettysburg administrative histories, Cultural Landscape Reports, Gettysburg Seminar Papers, 'National Park Civil War Series: The Battle of Gettysburg'
*Category:* nps_secondary  |  *Publisher/year:* NPS 1930s-2010s

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [portal] https://npshistory.com/publications/gett/index.htm  [HTTP 206]
- [portal] https://npshistory.com/series/symposia/gettysburg_seminars/index.htm  [HTTP 206] - scholarly essays from NPS-hosted seminars (1992 onward)
- [portal] https://npshistory.com/publications/civil_war_series/16/  [HTTP 206]

**Format:** PDF/HTML
**Size:** hundreds of PDFs
**OCR quality:** unknown
**Rights:** mixed: federal works are public domain; contractor/outside-author papers may be copyrighted - basis: 17 U.S.C. 105
- Rights statement URL: https://www.nps.gov/aboutus/disclaimer.htm
- Statement text: NPS disclaimer page (fetched 206); verify authorship per PDF
- Caveat: Seminar papers are often by outside historians - do NOT assume PD; check the byline/acknowledgements per paper.
**Extraction (difficulty 3/5):** Selective ingestion of NPS-authored booklets and CLR fact tables only; cite scholarly seminar papers rather than copying.
- Tools: pdftotext
- Step: Inventory by author/date
- Step: Ingest NPS-authored only
**Expected records** (basis: ESTIMATE):
- docs: 10-30 usable
**Data types added:** modern scholarship pointers, cultural-landscape descriptions (terrain features), management history
**Quality / bias notes:**
- Modern secondary literature - good for correcting Bachelder-era claims; use as 'interpretive', label accordingly.
**Effort:** M (2)  |  **Depends on:** none  |  **Audit refs:** new

### SRC-36  [P2 | rank 34]  HathiTrust Digital Library - use for metadata and rights verification only (not bulk text)
*Category:* aggregator_metadata  |  *Publisher/year:* n/a

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [api] https://catalog.hathitrust.org/api/volumes/brief/htid/coo.31924077699761.json  [HTTP 206] - returns 862 items for the OR record incl. rightsCode/usRightsString
- [policy] https://babel.hathitrust.org/robots.txt  [HTTP 206] - for '*' user-agents: 'Disallow: /cgi/' with Crawl-delay 1; named search bots allowed /cgi/pt
- [docs] https://www.hathitrust.org/member-libraries/resources-for-librarians/data-resources/bibliographic-api/  [search-result only (direct fetch blocked)] - 403 to scripted fetch; located via web search; states API is for small numbers of items

**Format:** JSON metadata; page text only through babel (blocked to scripts - Cloudflare 403)
**Size:** n/a
**OCR quality:** n/a
**Rights:** rights codes per volume (pd = public domain worldwide/US) - basis: HathiTrust rights determination
- Rights statement URL: https://catalog.hathitrust.org/api/volumes/brief/htid/coo.31924077699761.json
- Statement text: rightsCode 'pd'; usRightsString 'Full view'
- Caveat: babel HTML fetches by script are disallowed by robots.txt and blocked (403) - use IA copies for text; use Hathi to confirm 'pd' and to give readers a canonical link.
**Extraction (difficulty 2/5):** Bib API lookups only; record htid + rightsCode in the registry; provide Hathi deep links (page seq) for human citation.
- Tools: python
- Step: One API call per item
- Step: Store rights snapshot
**Expected records** (basis: MEASURED):
- or_v27_full_view_copies: Pt1: coo/uc1/uc1(a0013564893)/mdp/uga1/chi; Pt2 and Pt3 similarly (17 items matched for v.27 in record 000625514)
**Data types added:** rights snapshots, alternate copies, canonical citations
**Quality / bias notes:**
- Excellent as a provenance/rights oracle; not an ingestion source.
**Effort:** S (0.25)  |  **Depends on:** none  |  **Audit refs:** new

### SRC-34  [P3 | rank 35]  Confederate Veteran (serial, 1893-1932) - adjacent source (candidate for hist-sources part 2)
*Category:* participant_narratives  |  *Publisher/year:* Nashville, 1893-1932

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/confederateveter01conf  [HTTP 200] - v.1 (1893); 442 images; 2,898 KB; in-vocab proxy 0.835 (lowest OCR of the periodicals tested)
- [primary-text] https://archive.org/details/confederateveter19conf  [HTTP 200] - v.19 (1911); 694 images

**Format:** OCR text per volume
**Size:** ~2-3 MB per volume; 40 volumes
**OCR quality:** fair (proxy 0.835)
**Rights:** public domain for issues published <= 1930 - basis: publication date
- Rights statement URL: https://archive.org/details/confederateveter01conf
- Statement text: IA terms
- Caveat: Issues 1931-1932 are NOT yet safely PD - cut at 1930.
**Extraction (difficulty 4/5):** Keyword-scored article extraction (very large corpus); human triage.
- Tools: python
- Step: Keyword score
- Step: Manual shortlist
**Expected records** (basis: ESTIMATE):
- articles: hundreds of anecdotes; quality varies
**Data types added:** veteran reminiscences, obituaries, monument dedications
**Quality / bias notes:**
- Lost Cause periodical; anecdotal.
**Effort:** L (3-5)  |  **Depends on:** none  |  **Audit refs:** new

### SRC-35  [P3 | rank 36]  Gardner's Photographic Sketch Book of the War (1866) - original captions
*Category:* photographs  |  *Publisher/year:* 1866

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [primary-text] https://archive.org/details/GardnersPhotographicSketchBookOfTheWar  [HTTP 200] - IA item with almost no OCR text (sample: 194 tokens / 33 KB) - image-only; captions must be re-OCR'd or taken from LoC records

**Format:** page images
**Size:** n/a
**OCR quality:** unusable text (proxy 0.046)
**Rights:** public domain - basis: 1866
- Rights statement URL: https://archive.org/details/GardnersPhotographicSketchBookOfTheWar
- Statement text: IA terms
- Caveat: A 1959 reprint item (gardnersphotogra0000gard) exists on IA - not PD.
**Extraction (difficulty 3/5):** Re-OCR the ~ dozen Gettysburg plates' captions; compare with LoC titles to flag known misidentifications.
- Tools: Tesseract
- Step: Re-OCR captions
- Step: Flag errors
**Expected records** (basis: ESTIMATE):
- captions: ~12 Gettysburg plates
**Data types added:** 1866 captions (with later-disproved claims)
**Quality / bias notes:**
- Gardner's captions themselves contain errors (e.g., attribution of locations); use with correction notes.
**Effort:** S (0.5)  |  **Depends on:** SRC-10  |  **Audit refs:** new

### SRC-37  [P3 | rank 37]  David Rumsey Map Collection (Stanford) - Gettysburg maps (Warren, Hotchkiss) - DISPLAY-ONLY, non-commercial license
*Category:* historic_maps  |  *Publisher/year:* n/a

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [record] http://www.davidrumsey.com/maps1100223-26924.html  [read via WebFetch] - 1895; 43 x 70 cm; 1:23,000; record page states CC BY-NC-SA 2.0 and 'copyrighted by Cartography Associates ... non-commercial use only'
- [rights-statement] https://www.davidrumsey.com/about/copyright-and-permissions  [read via WebFetch] - states CC BY-NC-SA 3.0; credit line 'David Rumsey Map Collection, David Rumsey Map Center, Stanford University Libraries'; only items with a download button may be used beyond display

**Format:** Luna viewer / downloads
**Size:** n/a
**OCR quality:** n/a
**Rights:** NON-COMMERCIAL license on scans (CC BY-NC-SA 3.0 per about page; 2.0 on record page - inconsistent) - basis: Rumsey terms
- Rights statement URL: https://www.davidrumsey.com/about/copyright-and-permissions
- Statement text: This work is licensed under a Creative Commons License (CC BY-NC-SA 3.0); non-commercial; credit required
- Caveat: If the Gettysburg site carries ads/donations/partnerships it may be 'commercial' - do NOT redistribute Rumsey scans; use the same PD maps from LoC/NARA instead.
**Extraction (difficulty 1/5):** Do not ingest. Link out only.
- Step: Link-out card
**Expected records** (basis: n/a):
- records: 0
**Data types added:** link-out only
**Quality / bias notes:**
- Luna site served an access-verification interstitial to my scripted fetch (page content unreadable).
**Effort:** S (0)  |  **Depends on:** none  |  **Audit refs:** new

### SRC-38  [P3 | rank 38]  eHistory (Ohio State) - Official Records transcriptions - NOT VERIFIED
*Category:* official_records  |  *Publisher/year:* n/a

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [portal] https://ehistory.osu.edu/books/official-records  [NOT VERIFIED (HTTP 403)] - HTTP 403 to both curl and WebFetch; contents, structure and license could not be verified. Do not depend on it; IA/Hathi cover the same OR volumes.

**Format:** unknown
**Size:** unknown
**OCR quality:** unverified
**Rights:** UNVERIFIED - basis: site blocked
- Rights statement URL: https://ehistory.osu.edu/books/official-records
- Statement text: not retrievable
- Caveat: Treat as unusable programmatically.
**Extraction (difficulty 0/5):** none
**Expected records** (basis: n/a):
- records: 0
**Data types added:** 
**Quality / bias notes:**
**Effort:** S (0)  |  **Depends on:** none  |  **Audit refs:** new

### SRC-39  [INFRA | rank 39]  Internet Archive access APIs (advancedsearch, metadata, download, OCR derivatives) - the fetch layer for ~80% of the catalog
*Category:* infrastructure_api  |  *Publisher/year:* n/a

**Canonical URLs (each fetched 2026-09-30; status in brackets)**
- [search-api] https://archive.org/advancedsearch.php?q=identifier%3Awarofrebellion271unit&fl%5B%5D=identifier&rows=1&output=json  [HTTP 200] - used for ~60 discovery queries; add &sort[]=downloads+desc; fields fl[]=identifier,title,volume,date,imagecount,creator
- [metadata-api] https://archive.org/metadata/warofrebellion271unit  [HTTP 200] - returns files[] with names/sizes/formats and metadata{possible-copyright-status, licenseurl, imagecount, ocr, scanningcenter}
- [download] https://archive.org/download/warofrebellion271unit/warofrebellion271unit_djvu.txt  [HTTP 206 (redirects)] - pattern https://archive.org/download/<id>/<filename from /metadata>; derivatives seen: _djvu.txt, _djvu.xml, _hocr.html, _hocr_searchtext.txt.gz, _hocr_pageindex.json.gz, _page_numbers.json, _scandata.xml, _abbyy.gz, _chocr.html.gz, _jp2.zip, PDF
- [docs] https://archive.org/developers/  [HTTP 206] - documents the APIs; no hard numeric rate limit found in the fetched excerpt
- [rights-statement] https://archive.org/about/terms  [HTTP 200] - referenced as the rights baseline; per-item status in metadata possible-copyright-status (e.g. NOT_IN_COPYRIGHT; 'The Library of Congress is unaware of any copyright restrictions for this item.')

**Format:** JSON APIs + static file downloads (no key needed for read)
**Size:** n/a; OR27 item sizes 2.3-2.6 GB with images, 3.4-4.0 MB text
**OCR quality:** n/a
**Rights:** per-item (see each source card) - basis: IA Terms + per-item metadata
- Rights statement URL: https://archive.org/about/terms
- Statement text: Terms of Use page (fetched); rights determined per item from metadata and original imprint date
- Caveat: Reprint/lending items exist alongside PD originals - filter by date <= 1930 and access-restricted flags.
- Caveat: Full-text search-inside beta endpoint (services/search/beta/page_production ... service_backend=fts) returned 'succeeded: false' for my parameters - not verified; use local keyword indexing instead.
**Extraction (difficulty 1/5):** Use /metadata to pick files; download _djvu.txt (+_djvu.xml for page-level text) with a polite 1-3 req/s, resumable, sha256 manifest.
- Tools: python requests, ia CLI optional
- Step: metadata -> file names
- Step: download
- Step: verify size vs metadata
- Step: store rights snapshot
**Expected records** (basis: MEASURED):
- items_in_catalog: about 110 IA identifiers cited
**Data types added:** all IA-hosted text sources
**Quality / bias notes:**
- Multiple scans of the same book exist; pick by imagecount and the OCR proxy (see Appendix A).
- Emory-derived items name files with underscores (01300611_3315_djvu.txt).
**Effort:** S (0.5 (part of finding 12))  |  **Depends on:** none  |  **Audit refs:** new


## 5. Excluded / permission-required sources (do not ingest as-is)

### X-01  The Bachelder Papers: Gettysburg in Their Own Words (Ladd & Ladd, Morningside 1994-95)
- Status: COPYRIGHTED transcription/edition - do not ingest
- Evidence: IA item bachelderpapersg0001unse is a lending-library scan (Morningside, Dayton OH, 1994; tesseract OCR 1.36 MB text) - metadata shows no public-domain status; the underlying 1863-1894 letters are old but the Ladds' transcription/annotation and the IA lending copy are not open.
- URL: https://archive.org/details/bachelderpapersg0001unse  [HTTP 200]
- Path to use: Contact David & Audrey Ladd / Morningside for a licence for excerpts OR go to originals (X-02) and transcribe afresh. Citing (bibliographic) is fine.

### X-02  John B. Bachelder Papers, 1863-1894 (New Hampshire Historical Society) - originals
- Status: PERMISSION + FEES REQUIRED for reproduction
- Evidence: NHHS page: 10 boxes + 7 volumes (7.26 linear ft); finding aid PDF RS64984_Bachelder_John_B._Papers_1921.001.pdf; rights text: 'For permission to reproduce this image, please add the image to your cart and proceed through the Image Request checkout process.' Fees $25 previously digitised / $50 not digitised (per item).
- URL: https://www.nhhistory.org/object/273079/john-b-bachelder-papers-1863-1894  [HTTP 200]
- URL: https://www.nhhistory.org/NHHS/files/3b/3bc41ad2-6ef4-4a55-94fd-9d571eabd8d9.pdf  [HTTP 206]
- Path to use: The letters are pre-1900 and likely PD as texts, but NHHS controls access/imaging; budget for targeted item requests (e.g. letters about 20th Maine/Little Round Top, Peach Orchard) or visit in person and photograph under NHHS reading-room rules.

### X-03  Gettysburg Stone Sentinels (gettysburg.stonesentinels.com)
- Status: COPYRIGHTED compilation ((c)2026 Steve A. Hawks) - cross-check only
- Evidence: Unit pages give inscriptions, casualties and OR reports per unit; footer '(c)2026 Steve A. Hawks'.
- URL: https://gettysburg.stonesentinels.com/  [HTTP 200]
- Path to use: Do not scrape. Re-derive from PD primaries (SRC-01/03/04/22). Optionally ask the owner for a licence; use as QA oracle by reading.

### X-04  New York State Military Museum unit-history pages
- Status: ALL RIGHTS RESERVED footer - cross-check only
- Evidence: Footer '(c)2026 New York State Military Museum and Veterans Research Center. All rights reserved.'
- URL: https://museum.dmna.ny.gov/unit-history/conflict/us-civil-war-1861-1865  [read via WebFetch]
- Path to use: Ingest from the underlying 1900/1902 Final Report (SRC-03).

### X-05  Adams Sentinel (1826-1867) / Star and Banner / Star and Sentinel - Gettysburg newspapers
- Status: NOT FREELY AVAILABLE - subscription (Newspapers/NewspaperArchive) via Gettysburg College
- Evidence: Gettysburg College libguide table: Adams Sentinel Nov 19 1800-May 21 1867, Star and Banner (Mar 20 1862-Mar 10 1864 for 1863 coverage) - 'Newspaper Archive (subscription); microfilm'; LoC title record sn83032079 shows digitized: False (measured).
- URL: https://libguides.gettysburg.edu/c.php?g=1049707&p=7618872  [HTTP 200]
- Path to use: Ask Gettysburg College Special Collections/Musselman Library about a research-use licence or in-person microfilm imaging; otherwise rely on The Compiler (SRC-27).

### X-06  Busey & Martin, Regimental Strengths and Losses at Gettysburg; Pfanz; Desjardin; Hessler & Motts; Moe (secondary books cited in the site's own OOB files)
- Status: COPYRIGHTED books - provenance risk in EXISTING site data
- Evidence: deploy/data/oob/union_regiments_i_ii_corps.json metadata.sources lists 'Busey, John W. and Martin, David G. -- Regimental Strengths and Losses at Gettysburg (Longstreet House, 1994)', Pfanz (UNC Press 2001/1987), Desjardin (1995), Hessler & Motts (Savas Beatie 2015), Moe (1993), plus OR and Dawes (1890).
- Path to use: Facts (numbers) are not copyrightable but a curated compilation can be; replace strengths/casualties by PD-derived values (OR returns No.13/15 + Fox + Guild) with a documented reconciliation table, keep the Busey/Martin numbers only if counsel agrees, and cite them as 'see also'.

### X-07  Supplement to the Official Records (Broadfoot) and other 1990s reprints/derivatives
- Status: COPYRIGHTED - not verified in this session
- Evidence: Not fetched; listed because reprint/derivative items on IA (e.g. 1971 National Historical Society OR reprint warrebellionaco00cowlgoog; 1959 Dyer reprint) are visible and must be avoided.
- URL: https://archive.org/details/warrebellionaco00cowlgoog  [HTTP 200]
- Path to use: Always use original-imprint scans (GPO 1880-1901).


## 6. Coverage gaps

### G-01  Wisconsin
- Finding: No Wisconsin Gettysburg commission volume found on IA by title search; UW-Madison catalog lists 'Report of Commissioners to Care for Gettysburg Battle Monuments, 1892' (digital availability UNVERIFIED); Wisconsin Historical Society holds photographs of the seven Wisconsin monuments (dedicated June 30 1888). Site has 6 WI units (measured: 2nd, 3rd, 5th, 6th, 7th, 26th Infantry).
- URL: https://search.library.wisc.edu/catalog/999597763302121  [HTTP 200]
- URL: https://www.wisconsinhistory.org/record/image/W014DMX  [HTTP 200]
- Workaround: Use OR reports (Dawes, Robinson, Mansfield: OR27-1 Nos. 34-36), Curtis, Dawes 'Service with the Sixth Wisconsin' (1890 - verify IA), Haskell, Wisconsin History Commission Reprints No.1.

### G-02  Massachusetts, Delaware, New Hampshire, West Virginia, Confederate state commissions (NC, SC, GA, AL, MS, LA, TX, FL, TN)
- Finding: No dedicated Gettysburg monument-commission book found by IA title search; Massachusetts covered only by Roe (1910) 'Monuments, tablets ...'. Virginia has a 1917 dedication book (SRC-26). Confederate state monuments date mostly 1900s-1960s+.
- URL: https://archive.org/details/monumentstablets00roea  [HTTP 200]
- Workaround: Use Clark NC (SRC-12), CMH (SRC-25), Polley/Oates (SRC-24), SHSP (SRC-08), OR Pt2 (SRC-02), GNMP lists (SRC-22).

### G-03  Bachelder 28 hourly maps
- Finding: Dealer pages describe 28 time-stamped 'hourly' Bachelder maps (14 for July 1) produced for the War Department (1880s); repository/digitisation not verified (not found in LoC JSON search; NARA blog lists only 5 RG 77 maps).
- URL: https://unwritten-record.blogs.archives.gov/2018/07/03/mapping-the-battle-of-gettysburg/  [read via WebFetch]
- Workaround: Query NARA (RG 77, Civil Works Map File) and GNMP; if unavailable, treat Bachelder 1876 day sheets as the finest verified troop-position maps.

### G-04  'Bachelder Project' / NYS Library / Gettysburg College Bachelder holdings
- Finding: Searches found no digital project by the name 'Bachelder Project' and no NYS Library or Gettysburg College digital Bachelder collection; only NHHS (physical papers + item images), LoC maps, NARA maps, and the Ladd edition. NYS Library digital Civil War page lists the New York Final Report on the Battlefield of Gettysburg (3 vols) and 'Letters describing the Battles of Gettysburg and Vicksburg' (digitised July 2013) but no Bachelder item; GNMP holds miscellaneous Bachelder papers (Box B-12 per web search).
- URL: https://nysl.nysed.gov/scandocs/civilwar  [HTTP 200, TLS certificate problem (fetched with curl -k; see card note)]
- Workaround: Direct outreach to NHHS, NYS Library Manuscripts & Special Collections and Gettysburg College Special Collections (see GettDigital https://gettdigital.gettysburg.edu/ which is reachable but holds college-centric collections).


## 7. Cross-cutting design: coverage matrix, rights governance, extraction playbook

### 7.1 Coverage matrix (which source gives which data type)

| Data type the Historian needs | Primary sources (catalog id) | Notes |
|---|---|---|
| Unit reports (regiment -> army) | SRC-01, SRC-02 | ~296 regiment/battery-level items; brigade/division reports give hierarchy |
| Clock times / timeline anchors | SRC-06 (dispatches), SRC-01/02 (reports), SRC-11 (itinerary, day-level), SRC-09/30 (Bachelder maps, if hourly set found) | 5,420 regex hits (heuristic) |
| First-person narrative / quotes | SRC-07, SRC-08, SRC-13, SRC-14-17, SRC-24, SRC-31 (Haskell) | tag perspective + lag |
| Casualties / strengths | SRC-01 (Nos. 13, 15), SRC-02 (No. 427), SRC-05, SRC-19, SRC-20, SRC-21 | validate sums; reconcile |
| Commanders and succession | SRC-01/02 (report headers), SRC-05/19/20 | site already has commander_successions.json - use to verify |
| Place names / gazetteer | SRC-23 (guides), SRC-09 (Bachelder/Warren labels), SRC-01/02 (report text), SRC-22 | 30 mapped terrain features today |
| Maps (georeferenced) | SRC-09, SRC-30, SRC-11 (atlas plates) | Rumsey excluded (NC) |
| Images | SRC-10, SRC-32 | rights-gated; aftermath only |
| Monuments / memorial record | SRC-22, SRC-03/04/14-17/26 | memorial positions differ from battle positions |
| Local civilian / newspaper voice | SRC-27 (after re-OCR), SRC-28 | Adams Sentinel not available |
| Speeches / addresses | SRC-29 (Gettysburg Address), SRC-03/04 (dedication addresses) | |
| Modern interpretation | SRC-33 (NPS), SRC-13 | label 'interpretive' |

### 7.2 Rights governance (concrete rules)

1. **Allow-list, not block-list.** A source may enter the index only if its registry record has `status` in {`PD-US-pre-1931`, `PD-US-gov`, `LoC-no-known-restrictions`, `NDNP-PD`, `PG-PD`, `permission-granted`} and a captured `statement_text` + `statement_url`. Everything in section 5 is `permission-required` or `excluded` until a written grant is logged.
2. **Original imprint only.** IA fetcher rejects items whose `date` > 1930, whose publisher is a reprint house (National Historical Society 1971, Morningside 1994, Yoseloff 1959, Dover 1959), or whose metadata shows lending/`access-restricted-item`.
3. **Per-item photo gating (LoC).** Accept only when `rights_advisory` begins "No known restrictions on publication" AND the `notes` field has no "Copyright" line (3 of 185 records have one; 12 have no advisory). Store the statement verbatim.
4. **Credit lines.** LoC: "Library of Congress, Prints and Photographs Division" + LC-DIG id (photos); "Library of Congress, Geography and Map Division" (maps). IA: cite original imprint + IA identifier + printed page. PNA: "Pennsylvania Newspaper Archive (Penn State University Libraries / NDNP)".
5. **Third-party compilations are cross-check only** (Stone Sentinels (c) Steve A. Hawks; NYSMM all rights reserved; Rumsey non-commercial). Reading them to QA our own extraction is fine; copying their text or structure is not.
6. **Quote hygiene for post-1930 secondary works** (Pfanz, Desjardin, Busey & Martin): never in the corpus; cite bibliographically only.
7. **Permission outreach drafts** are in Appendix D (drafts only - nothing was sent).

### 7.3 Extraction playbook

**Pipeline stages** (each stage writes JSONL + a manifest line; every stage is idempotent):

1. `fetch` - per-host token bucket, identifying User-Agent, sha256 manifest, IA file names read from `/metadata/<id>` (never guessed).
2. `normalize` - NFC, de-hyphenate line breaks, repair long-s/ligatures, collapse OCR double spaces (IA text has many: "Twentieth  Maine"), keep raw alongside.
3. `segment` - source-specific (report headers, articles, regiment sections, dispatch headers, table rows) -> `documents.jsonl`.
4. `link` - unit alias table -> `unit_id`; gazetteer -> `place_key`; date/time parser -> `time_min`.
5. `tag` - perspective (side/role/lag/genre/bias tags), rights, OCR score.
6. `chunk` - paragraph windows of ~150-300 words with 1-paragraph overlap, always carrying citation fields.
7. `qa` - 100-passage audit per source + gold questions (finding 16).

**Record schemas (minimum fields)**

```json
// report / narrative passage
{"doc_id":"OR27-1-196","source_id":"SRC-01","ia_id":"warofrebellion271unit","leaf":"<n>","printed_page":"622-<end>",
 "author":"Chamberlain, Joshua L.","rank":"Col.","unit_text":"Twentieth Maine Infantry","unit_id":"U-20ME","level":"regiment",
 "date_written":"1863-07-06","perspective":{"side":"union","role":"regimental","genre":"official_report","lag_days":4},
 "ocr_score":0.98,"license":"PD-US-gov-1889","text":"..."}
// time anchor
{"anchor_id":"OR27-1-196#a3","doc_id":"OR27-1-196","unit_id":"U-20ME","place":"Little Round Top","date":"1863-07-02",
 "time_text":"Somewhere near 4 p. m.","time_min":960,"modifier":"about","tol_min":10,"quote":"..."}
// casualty row
{"unit_id":"U-20ME","source_id":"SRC-05","killed":"<int>","wounded":"<int>","missing":"<int>","total":"<int>","strength":"<int|null>","checksum_ok":"<bool>"}   // illustrative placeholders, not real values
```

**Code sketches (pseudo-Python; adapt at implementation time)**

```python
# 1) Internet Archive: choose files from the item's own file list
meta = get(f"https://archive.org/metadata/{ident}").json()
txt  = next(f["name"] for f in meta["files"] if f["name"].endswith("_djvu.txt"))   # e.g. 01300611_3315_djvu.txt
xml  = next((f["name"] for f in meta["files"] if f["name"].endswith("_djvu.xml")), None)
pn   = next((f["name"] for f in meta["files"] if f["name"].endswith("_page_numbers.json")), None)
assert meta["metadata"].get("date","0")[:4] <= "1930" and not meta["metadata"].get("access-restricted-item")

# 2) OR segmentation: ToC first, then body
toc  = parse_toc(text, start=text.index("REPORTS."))                      # first occurrence of each 'No. N.'
body = re.split(r"\n\s*N[o0O][.,]? ?(\d+)[.,!]? ?[^\n]{0,6}?\s*(?=Reports?|Itinerary|Return|Abstract|Organization)", text)
# fill misses by fuzzy match: rapidfuzz.process.extractOne(header_line, toc_authors)

# 3) Time anchors
TIME = re.compile(r"(?i)\b(?:about|at|near(?:ly)?|by|until|before|after|from)?\s*(\d{1,2})(?:[:.](\d{2}))?\s*(?:o.clock\s*)?([ap])\.?\s?m\b")
# noon / daybreak / sunset / dusk handled by a small lexicon; store modifier + tolerance

# 4) LoC paging with the documented 20/min limit
for sp in range(1, pages+1):
    r = get(f"https://www.loc.gov/collections/civil-war-glass-negatives/?fo=json&c=50&q=gettysburg&sp={sp}")
    time.sleep(3.2)

# 5) Unit alias generation
ORD = {"first":1, ..., "one hundred and fiftieth":150}
unit = parse_unit("Fifty-sixth Pennsylvania Infantry")  # -> ('PA', 56, 'inf')
```

**Special cases to plan for:** OR numbering has no page/form-feed markers in `_djvu.txt`; OCR of Fox tables is column-flattened; Emory-sourced IA items use underscores in file names; IA hosts multiple scans of the same book (choose by OCR proxy and `imagecount`); LoC HTML pages may 403 - use `?fo=json`.

---

## 8. Phasing, effort and yield

| Phase | Scope | Items | Effort (person-days, ESTIMATE) | Exit criterion |
|---|---|---|---|---|
| 0 - Foundations | fetch infra, rights registry, unit alias table, OCR gate | 12, 11, 02, 13 | 5-9 | 570/570 units aliased; fetcher passes dry-run; rights CLI blocks reprints |
| 1 - Backbone | OR27 Pt1-3, NY + PA state books, Fox/casualty table, time anchors, citation model | 01, 03 (NY/PA), 04, 06, 14 | 14-24 | 589 OR entries parsed; 149 NY+PA units with narratives; anchors CSV vs 137 events |
| 2 - Depth | B&L v3, SHSP shortlist, Joint Committee, other state books, Clark, Bates, Phisterer, Dyer; photos; monuments; Gettysburg Address | 05, 03 (rest), 08, 10, 15 | 12-20 | ~500 unit sections; 40+ photos; QA >= 95% |
| 3 - Spatial and local voice | georeference Warren/Bachelder; NARA hourly-map inquiry; Chronicling America curation; Compiler re-OCR | 07, 09 | 12-25+ | 4 sheets RMS < 15 m; 50+ cleaned articles |
| Continuous | QA harness, budget doc | 16, 17 | 2-4 | gold-set recall@5 >= 0.8 |

Total ESTIMATE: 45-80 person-days for P0+P1, dominated by maps (XL) and the Compiler re-OCR (XL); Phases 0-2 alone (~30-55 d) deliver the large majority of Historian depth.

**Why this order.** Phase 0/1 items are prerequisites for every downstream feature (alias table, rights, citations) and produce measurable audit wins (C4 time anchors, H7 alias cleanup, H8 grounded answers). Maps and newspapers are high-cost, lower-marginal-yield for text Q&A and are therefore last.


## 9. Plan items (fix specs)

### hist-sources-1-01  Ingest Official Records Series I Vol.27 Parts 1-3 (589 numbered report entries + ~2,200 dispatches) as the backbone unit-report corpus
- Severity: high  |  Effort: L  |  Audit refs: H8, C4  |  Depends on: hist-sources-1-02, hist-sources-1-12
- Evidence: IA items warofrebellion271unit / 272unit / 273unit (UIUC scans, ABBYY 11, 500 ppi): OCR text 3,970,479 / 3,880,513 / 3,406,041 bytes (measured 2026-09-30), in-vocabulary OCR proxy 0.984 (Chamberlain report OR27-1 No.196 p.622 reads cleanly). OCR ToC parse: reports numbered 1-378 (Pt1) and 379-589 (Pt2); Union Gettysburg items Nos.5-375, Confederate ANV Nos.424-589; ~296 regiment/battery-level reports (208 Union + 88 Confederate; heuristic +/-10%). HathiTrust Bib API rightsCode 'pd' / 'Full view' for coo.31924077699761, coo.31924077728255, coo.31924077700262. Site today: historian.html:48 states it answers only from '467 regimental records, 24 narrative vignettes, 137 chronology events, and 30 mapped terrain features' and historian.html:76-79 fetches only /data/oob, /data/vignettes*, /data/chronology*, /data/terrain.json.
- Root cause: The Ask-the-Historian corpus is the site's own ~0.8 MB of hand-written JSON; none of the primary reports it is derived from are ingested, so answers cannot cite or quote sources and retrieval has almost nothing to match (audit H8: 'why did Lee lose the war' -> Archer Captured).
- Fix: 1) fetch_ia.py: for each id read /metadata/<id>, pick the *_djvu.txt, *_djvu.xml and *_page_numbers.json names FROM THE FILE LIST (never build names from the id - Emory items use underscores), save to raw/ with sha256 + fetch date in manifest.jsonl. 2) or27_segment.py: strip running heads ('Chap. XXXIX.] THE GETTYSBURG CAMPAIGN. 623'), parse ToC (first occurrence of 'No. N.' between 'REPORTS.' and first body header), split body on r'\n\s*N[o0O][.,]? ?(\d+)[.,!]? ?[^\n]{0,6}?\s*(Reports?|Itinerary|Return|Abstract|Organization)' then fuzzy-match remaining numbers to ToC author strings (naive regex recovers 302/378 in Pt1 and 160/211 in Pt2). 3) Emit reports.jsonl {report_id:'OR27-1-196', or_series:'I', vol:27, part:1, no:196, author, rank, unit_text, unit_id (via alias table), level, date_line, page_start, page_end, leaf_start, text}. 4) Part 3: split on dispatch headings, keep timestamp text. 5) Keep 1880-1901 GPO scans only (avoid IA 1971 reprint warrebellionaco00cowlgoog).
- Acceptance test: (a) reports.jsonl contains >= 570 of 589 numbered entries with author+unit parsed; (b) 20 randomly sampled reports match the printed page (leaf->page_numbers.json) and first/last 10 words; (c) OR27-1 No.196 (Chamberlain) resolves to unit U-20ME starting at printed page 622; (d) every record carries source_id, ia_id, leaf, printed_page, license 'PD-US-gov-1889', fetched_at; (e) pipeline is idempotent (re-run yields identical sha256 for outputs).
- Metric/grade moved: Historian answer groundedness/citation coverage (H8); content depth; feeds time verification (C4)

### hist-sources-1-02  Build the unit alias/crosswalk table joining 570 site unit records to OR, Fox, Phisterer, Clark, Dyer and monument-list naming
- Severity: high  |  Effort: M  |  Audit refs: H7, H10  |  Depends on: none
- Evidence: Deployed data/oob/*.json contain 467 regiment_id + 103 battery_id records (570 unique; 329 Union, 241 Confederate; measured) with ids like U-20ME, C-15AL and one alias row {regiment_id:'U-14BK', designation:'14th Brooklyn (alias for U-84NY)', alias_for:'U-84NY'} (the source of audit H7). 55 Union and 48 Confederate records have state=null. OR headers spell units out ('Col. Joshua L. Chamberlain, Twentieth Maine Infantry', 'Fifty-sixth Pennsylvania', 'Eighty-fourth New York (Fourteenth Militia)').
- Root cause: No canonical unit key or alias registry: the app stores a display string as the designation and a dev-log alias row; every external source uses a different naming scheme (spelled-out ordinals, militia numbers, battery letters, commander-named batteries).
- Fix: Create data/source/unit_aliases.json: {unit_id:'U-84NY', canonical:'84th New York Infantry (14th Brooklyn)', aliases:['Fourteenth Militia','14th Brooklyn','14th N.Y.S.M.','Eighty-fourth New York'], state:'NY', arm:'inf', brigade_id, corps_id, or_names:[...], fox_key:'84th New York', phisterer_key:'84th Infantry', monument_names:[...]}. Generate 80% automatically: ordinal parser (First..Two hundred fiftieth -> int), state map, arm map (Infantry/Cavalry/Battery/Artillery/Sharpshooters/Legion/Battalion), then rapidfuzz on (state,number,arm) against OR ToC author strings, Fox headings, Phisterer entries and GNMP monument lists; review the ~20% residual by hand. Remove 'alias for' text from user-facing designation (H7) and expose aliases only as search synonyms. Fill state=null rows from the join.
- Acceptance test: 100% of the 570 unit ids have canonical name, arm, state (0 nulls); >= 95% link to at least one OR report or Fox/Phisterer entry (documented list of the rest); the 14th Brooklyn/84th NY case resolves both ways; a unit test feeds 30 raw OR header strings and expects the right unit_id for all.
- Metric/grade moved: Data integrity; enables all per-unit source linking; removes user-visible dev copy (H7)

### hist-sources-1-03  Ingest the state monument-commission corpus in priority order: New York Final Report, Pennsylvania at Gettysburg, then Maine/NJ/Michigan/Minnesota and small states
- Severity: high  |  Effort: L  |  Audit refs: H8  |  Depends on: hist-sources-1-02, hist-sources-1-12
- Evidence: Measured site coverage: NY 75 + PA 74 = 149 of 570 unit records (26%). IA: finalreportongettys01burgrich (vol.1, 548 imgs, 1,435,851 bytes, NOT_IN_COPYRIGHT; text states 'sixty-eight New York regiments or battalions of infantry present' and 'nineteen New York batteries'); pennsylvaniaatge05penn (1893 v1, 638 imgs) + pennsgettysburg01reynrich/02reynrich (1914 v1-2) + pennsylvaniaatg03penn (v3); maineatgettysbu01commgoog (701 imgs, 1.6 MB); finalreportofget00newj + newjerseytroopsi00intoom (NJ); cu31924030924736 (Michigan 1889); minnesotacivil01minnrich; small volumes for VT/MD/IL/IN/RI/VA/OH/CT (13-370 KB each). Gaps (no dedicated book found): WI, MA (only Roe 1910), DE, NH, WV, Confederate states.
- Root cause: State commissions collected veteran-written regimental histories, inscriptions and dedication speeches in the 1880s-1910s; none of this narrative depth exists in the site's 467 one-line 'key_action' strings (e.g. U-20ME carries a 2-3 sentence key_action string and a flag_notes line).
- Fix: Per book: (1) canonical edition pick (PA: 1914 superset; NY: vol.1 Fox narrative + per-regiment sketches + vol.3 monument data); (2) segment by regiment heading using the book's own contents page + the alias table; (3) emit sections.jsonl {doc_id, unit_id, section_type: narrative|address|inscription|roster, author, year, text, page}; (4) attach provenance tag 'veteran_memory_1893' etc.; (5) store editions as variants, dedupe by normalized-text hash. Do NY and PA first (149 units), then ME/NJ/MI/MN (35 units), then the small volumes as whole documents with unit tags.
- Acceptance test: Every NY and PA unit record has >= 1 narrative section linked (target 90%); 25 spot-checked sections reproduce the printed page text; each section has ia_id + leaf + printed page; unit coverage report lists units without a state-book section.
- Metric/grade moved: Content depth for 75-149+ regiments; historian answer quality for unit-specific questions

### hist-sources-1-04  Replace copyrighted-compilation provenance in the OOB data with a PD-derived casualty/strength table (OR returns + Fox + Phisterer + Dyer + Livermore) and a documented reconciliation policy
- Severity: high  |  Effort: L  |  Audit refs: H10, C4  |  Depends on: hist-sources-1-01, hist-sources-1-02
- Evidence: deploy/data/oob/union_regiments_i_ii_corps.json metadata.sources lists Busey & Martin (Longstreet House 1994), Pfanz (UNC Press 1987/2001), Hessler & Motts (Savas Beatie 2015), Moe (1993), Desjardin (1995). Unit records carry strength, casualties and (for some) casualty_percentage fields. Fox (1889) IA reglossescivilwar00foxwrich (2,255,231 bytes; NOT_IN_COPYRIGHT) but its OCR tables contain digit errors ('(5,024', '30S', '000', '4,2 lo'), so raw scraping is unsafe; OR27-1 No.13 (Return of Casualties at Gettysburg) and No.15 (general return), OR27-2 No.427 (Guild) are the PD primaries.
- Root cause: Numbers were compiled from secondary books; facts are not copyrightable but a curated compilation may be, and the site cannot show per-number provenance or explain why sources differ.
- Fix: Build casualty_sources.jsonl with one row per (unit_id, source, killed, wounded, missing, total, strength) for OR returns, Fox, Phisterer, Dyer, Livermore (aggregates). Parse Fox tables by rebuilding columns (hOCR word boxes or row-sum checksum: K+W+M must equal total +/-0), reject rows failing the checksum into a manual queue. Publish a reconciliation column set (or_value, fox_value, site_value, delta, note) and a rule: site value = OR return where present, else Fox, else Dyer; keep Busey/Martin only as 'see also' after counsel review. Add 'source' badge to unit cards.
- Acceptance test: For 100% of units with an OR return or Fox row, site casualties == rule value; checksum failures < 3% after manual queue; a diff report lists all units where OR and Fox differ by > 10% with explanation; oob files' metadata.sources no longer lists copyrighted books as the numeric source.
- Metric/grade moved: Legal/provenance risk; data accuracy (C4/H10 class); trust

### hist-sources-1-05  Ingest participant narratives (Battles & Leaders v3, SHSP v1-43, Joint Committee v1, Haskell/Oates/Curtis/Holcombe/Polley) with mandatory perspective/bias tags
- Severity: medium  |  Effort: L  |  Audit refs: H8  |  Depends on: hist-sources-1-12
- Evidence: IA battlesleadersof03john (786 imgs, 3,251,232 bytes, OCR proxy 0.966) - OCR contents lists ~25 Gettysburg articles pp.244-~440 (Longstreet 244, Hunt 255/290/369, Gibbon 313, Melcher 314 '20th Maine at Little Round Top', Law 318, Kershaw 331, Alexander 357...). SHSP vols 1-43: 49.0 MB, 2,949 'Gettysburg' mentions; densest vols 4 (312), 37 (253), 5 (204). Joint Committee v1 (reportofjointcomm01unit): 345 'Gettysburg' / 212 'Sickles' mentions; witness headings include Meade, Warren, Sickles, Howe, Birney, Doubleday, Pleasonton, Hancock, Butterfield, Gibbon, Hunt. Curtis 24th Michigan: 549 Gettysburg mentions.
- Root cause: Contested postwar narratives (Longstreet/Early-Allan, Sickles vs Meade) will be presented as neutral fact by a keyword retriever unless each passage carries author, date written, side and controversy tags.
- Fix: Schema fields: perspective {side:'union|confederate|civilian', role:'general|staff|regimental|private|civilian', written_year, lag_years, genre:'official_report|memoir|testimony|address|periodical', bias_tags:['lost_cause','controversy:Longstreet-Allan','partisan_committee_1864']}. Segment B&L by contents (title/author/page), SHSP by article with Gettysburg-density scoring (>= N mentions/1,000 words) then human shortlist (~150), Joint Committee by witness. UI rule: answers that cite tagged passages must show a 'perspective' chip and, for controversy tags, at least one opposing-side passage.
- Acceptance test: 100% of narrative passages carry perspective+lag fields; SHSP shortlist reviewed (>=150 articles) with reviewer initials; a test question about Longstreet's July 2 delay returns passages from >= 2 sides with visible chips.
- Metric/grade moved: Historical accuracy/fairness; historian trust; H8

### hist-sources-1-06  Extract ~5,400 clock-time expressions and dated dispatches from the OR and use them as ground-truth time anchors to reconcile the site's timeline (C4)
- Severity: high  |  Effort: L  |  Audit refs: C4  |  Depends on: hist-sources-1-01, hist-sources-1-02
- Evidence: Regex count over OR text (heuristic; includes false positives): 2,269 clock-time expressions in Pt1, 947 in Pt2, 2,204 in Pt3 (total 5,420); 225 'July 1-3, 1863' date strings in Pt3. OR27-1 also holds the Itinerary (No.7) and IA itineraryofarmy00united (80 imgs, NOT_IN_COPYRIGHT). Audit C4 lists data labels such as Longstreet 7:30am, Vincent 8:25am, Pickett's Charge 11:05am vs history ~4pm/4:30pm/3pm; BRIEF time-facts CSVs exist in plan-work.
- Root cause: The timeline was authored from memory/secondary summaries; no machine-checkable anchor set exists, so contradictions (dusk at 12:10pm) survive.
- Fix: time_anchors.py: regex grammar for (\d{1,2})(?:[:.](\d{2}))?\s*(?:o.clock)?\s*([ap])\.?\s?m\b, 'noon', 'daybreak', 'sunset', 'dusk', 'about/near/before/after' modifiers; attach to nearest preceding event sentence with unit + place via alias table + gazetteer (SRC-23). Output time_anchors.jsonl {anchor_id, source_ref, unit_id, place, date (July 1-3), time_text, time_min (local minutes since midnight), modifier, confidence, quote}. Timezone note: OR times are local mean/sun time; store +/-10 min tolerance. Then diff against chronology_day*.json event times and the 675-tick clock and emit a discrepancy CSV (event, site_time, anchor_median, n_anchors, IQR).
- Acceptance test: >= 3,000 anchors parsed with unit or place tag; precision >= 90% on a 200-anchor hand-labelled sample; discrepancy CSV covers all 137 chronology events with n_anchors and median; the 8 flagged C4 examples each show >= 2 independent anchors.
- Metric/grade moved: Historical accuracy (C4); enables honest 'reported times' UI

### hist-sources-1-07  Georeference LoC Bachelder (1876/1883/1863) and Warren maps; locate the reported 28 time-stamped Bachelder maps (NARA RG 77 / GNMP) before digitising troop positions
- Severity: medium  |  Effort: XL  |  Audit refs: D3, C4  |  Depends on: hist-sources-1-11
- Evidence: LoC items verified via ?fo=json: 99447491 (Bachelder 1876, 3 sheets, 1:12,000, topography engraved by Julia Bien, positions by L.E. Neuman), 99447492 (1883 ed.), 99448794 (Warren, from the Jubal Early Collection, 'base for Bachelder'), 93517377 (1863 isometrical), 99448798/99448799 (Woeltje & Cutting 1888 with landowner names). IIIF info.json verified 200 at tile.loc.gov (first-day sheet 12.5% render = 1,036x1,344 px). LoC G&M rights: 'free to use and reuse unless a Rights Advisory statement is present'. NARA blog (fetched) lists 5 RG 77 Gettysburg maps with NAIDs (305570, 17370358, 6860337, 102279222, 176246316, 176246318). Dealer pages describe 28 hourly Bachelder maps - not verified in any repository I could read.
- Root cause: The map has no historically georeferenced base or troop-position layer; positions/timing come from memory-based placement files.
- Fix: 1) Pull item JSON + IIIF info.json for the 8 LoC items (<= 20 requests/min; cache). 2) Georeference Warren first (25-40 GCPs: road intersections, Codori/Trostle/Weikert buildings, Seminary, cemetery gates; thin-plate spline; RMS < 15 m) in Allmaps or QGIS; then Bachelder sheets to Warren. 3) Publish PMTiles/raster tiles as an optional 'Historic map' overlay with Library of Congress credit line. 4) Ask NARA Cartographic (College Park) and GNMP archivist whether the 28 hourly maps exist digitally; if yes they become the top-priority placement source. 5) Only then digitise Bachelder symbols to GeoJSON (day, position class first/intermediate/evening, unit_id).
- Acceptance test: Warren + 3 Bachelder sheets georeferenced with RMS < 15 m and 10 independent check points < 25 m; overlay toggle renders at z12-17 without console errors; NARA/GNMP inquiry answered in writing (yes/no + access route); attribution string matches LoC credit line.
- Metric/grade moved: Content depth; placement accuracy (D3); feeds C4 spatial checks

### hist-sources-1-08  Curate 40-75 rights-gated LoC photographs (Gardner/O'Sullivan/Gibson, July 5-7 1863 aftermath) for the Historian and Ground Remembers pages
- Severity: medium  |  Effort: M  |  Audit refs: S1  |  Depends on: hist-sources-1-12
- Evidence: LoC collection API civil-war-glass-negatives q=gettysburg returns 185 records (4 pages of 50); 75 have created_published containing '1863 July.'; contributors O'Sullivan 34, Gardner 31, Gibson 15, Smith 15. Rights: 118 records carry 'No known restrictions on publication. For information, see "Civil war photographs, 1861-1865," https://www.loc.gov/rr/print/res/120_cwar.html', 55 carry 'No known restrictions on publication.', 12 carry none; 3 have a 1917 'Copyright J224990' note (studio copy prints). LoC title flags misattribution: 'Dead Confederate sharpshooter at foot of Little Round Top [i.e., Devil's Den]'.
- Root cause: No period imagery in the Historian; audit S1 found sub-pages that are only a search box.
- Fix: photos.py: paginate with 3-s spacing (JSON limit 20/min); keep id, title, date, contributor, notes, rights_advisory, image_url; rule: accept only rights_advisory startswith 'No known restrictions' AND notes lack 'Copyright'; download service_medium (r.jpg) only for curated ids; convert to AVIF/WebP with 3 widths; store photos.json {lcid, lc_dig_id, caption_loc, caption_site, photographer, date_text, place_key, unit_ids, credit:'Library of Congress, Prints and Photographs Division, LC-DIG-...'}; label all as 'aftermath (photographed ~July 5-7 or later)' and never attach to battle ticks; add caption-correction notes where LoC notes a correction.
- Acceptance test: photos.json has >= 40 approved entries each with rights_advisory text stored verbatim and credit line; zero entries with missing rights or 'Copyright' notes; images served <= 150 KB at 800 px with width/height set (no CLS); alt text for all.
- Metric/grade moved: Content richness; accessibility (alt text), CLS if dims set

### hist-sources-1-09  Newspapers: curated Chronicling America harvest now; re-OCR The Compiler (Pennsylvania Newspaper Archive) later; open licence talks for the Adams Sentinel
- Severity: low  |  Effort: XL  |  Audit refs: new  |  Depends on: hist-sources-1-12, hist-sources-1-13
- Evidence: Chronicling America (loc.gov API) returns 1,425 full-text pages mentioning 'gettysburg' for 1863-07-04..07-31 (New-York Daily Tribune 76, New York Herald 69, Chicago Daily Tribune 48, Cleveland Morning Leader 48, Worcester Daily Spy 41, Portland Daily Press 36). No Gettysburg-published 1863 title turned up in CA title queries (Adams Sentinel record sn83032079 is title-level only, digitized False). The Compiler (Gettysburg) 1857-66 IS at panewsarchive.psu.edu (51 issues in 1863; no July 6 issue) but OCR is poor: in-vocabulary proxy 0.43-0.48 on 4 pages of 1863-07-13 vs 0.95-0.98 for IA books; page 2 begins 'BATTLES 0F GETTYSBURG. "Our uguallyquict null unpretnullmg lit tle town of Gettysburg has become hiutnric."'. Adams Sentinel/Star and Banner/Star and Sentinel are 'Newspaper Archive (subscription)' per Gettysburg College libguide.
- Root cause: Local contemporary voices are absent from the Historian; the free local paper's OCR is unusable as-is.
- Fix: Phase A (M): ca_harvest.py - fixed query list x July 4-15, 1863, facet by title, cache JSON, download OCR for ~200 pages, extract ~50-150 telegram-bulletin articles with headers. Phase B (XL, deferred): re-OCR ~80 Compiler pages (Jul 13-Nov 30) from PNA IIIF images with Tesseract 5/Kraken, LLM post-correction, 10-page gold set to report CER, article segmentation. Phase C (S): email Gettysburg College Special Collections/Musselman Library about research licence for Adams Sentinel 1863.
- Acceptance test: Phase A: >= 50 cleaned articles with title/date/page/url and rights statement; Phase B: gold-set CER <= 5% and article count report; Phase C: written reply logged in governance register.
- Metric/grade moved: Content depth (local/civilian perspective); H8 breadth

### hist-sources-1-10  Parse GNMP monument/marker lists (1903-1921 IA, 1932/1993 NPS) and Commission annual reports into a monument + landscape-change register
- Severity: low  |  Effort: M  |  Audit refs: new  |  Depends on: hist-sources-1-02
- Evidence: npshistory.com/publications/gett/mon-locations-1932.pdf (2,095,190 bytes) has a text layer: pdftotext -layout gives 139,713 chars with rows 'Regiment | Brigade | Corps | Location' by state and arm (e.g. '14 Smyth ... North Hancock Avenue'). 1993 PDF 7,014,723 bytes. IA: locationofmonume00unit (1903), 02unit (1912), 03unit (1916), 01unit (1921; OCR proxy 0.829). GDG hosts annual Commission reports 1893-1933 (index verified; TLS certificate expired).
- Root cause: Site data/monuments.json exists but has no per-unit inscription/location provenance or dating.
- Fix: Parse tables into monuments_register.jsonl {edition_year, state, arm, unit_text, unit_id, brigade, corps, location_text}; diff editions to date each monument; mark all as 'memorial position (not battle-time)'; from annual reports capture avenue construction and land-purchase dates to flag terrain changes; re-source GDG transcriptions from HathiTrust/IA to avoid the expired-cert host.
- Acceptance test: 1932 register >= 95% of rows parsed with unit_id linked; 30-row manual QA >= 95% correct; each monument record shows edition year and the disclaimer flag.
- Metric/grade moved: Content depth; accuracy of location claims

### hist-sources-1-11  Licensing governance: per-source rights registry, exclusion list and permission outreach (Ladd/Bachelder Papers, NHHS, Stone Sentinels, NYSMM, Rumsey, Busey & Martin)
- Severity: high  |  Effort: M  |  Audit refs: new  |  Depends on: none
- Evidence: IA bachelderpapersg0001unse = Morningside 1994 lending scan (not open). NHHS: 'For permission to reproduce this image, please add the image to your cart and proceed through the Image Request checkout process', fees $25/$50. Stone Sentinels footer '(c)2026 Steve A. Hawks'. NYSMM footer '(c)2026 ... All rights reserved.' Rumsey: CC BY-NC-SA 3.0 (about page) vs CC BY-NC-SA 2.0 (record page) - inconsistent, non-commercial. IA also hosts non-PD reprints (1971 OR reprint warrebellionaco00cowlgoog; 1959 Dyer).
- Root cause: A historian feature that quotes text at scale needs an auditable rights basis per passage; today none exists.
- Fix: Add rights.json entries {source_id, status:'PD-US|LoC-no-known-restrictions|permission-required|excluded', basis, statement_text, statement_url, verified_at, reviewer}; enforce in the ingest CLI (refuse sources without rights.status in allow-list); require original-imprint checks (year <= 1930, publisher, not reprint) in the IA fetcher; send permission requests for X-01/X-02/X-03/X-05 (templates in report); publish an /about-sources page listing every source, licence and credit line.
- Acceptance test: CLI blocks a test run on warrebellionaco00cowlgoog (1971 reprint) and on an item without rights; /about-sources lists 100% of ingested sources with statement URL; permission log has dated entries for NHHS, Ladd/Morningside, Gettysburg College.
- Metric/grade moved: Legal/governance; trust; docs

### hist-sources-1-12  Polite, resumable fetch infrastructure with raw-source cache, manifest and per-host rate limits
- Severity: medium  |  Effort: M  |  Audit refs: new  |  Depends on: none
- Evidence: Measured behaviour: loc.gov JSON API documented at 20 req/min (1-hour block; image/text 150/min) - HTML item pages and /manifest.json returned HTTP 403 to my script at times while ?fo=json and tile.loc.gov kept working; HathiTrust babel robots.txt 'Disallow: /cgi/' (Crawl-delay 1) + Cloudflare 403; Project Gutenberg 'intended for human users only' (bulk via robot/harvest with wget -w 2) and returned 503/504 intermittently; Pennsylvania Newspaper Archive intermittently times out; Emory-sourced IA items use underscores in file names (01300611_3315_djvu.txt vs id 01300611.3315.emory.edu).
- Root cause: Each source has different limits, formats and failure modes; ad-hoc scripts will get IPs blocked or silently ingest wrong files.
- Fix: tools/ingest/fetch.py with per-host token buckets (loc.gov 0.3 req/s; archive.org 2 req/s; panewsarchive 0.5 req/s; gutenberg mirror/harvest only; hathitrust: Bib API only), identifying User-Agent with contact email, ETag/If-None-Match caching, sha256 manifest, retry with backoff on 429/5xx, hard-stop on 403 with human-review message, IA helper that reads /metadata to choose files, size guard (skip > 100 MB unless --allow-big), resumable state file.
- Acceptance test: Dry-run against 20 mixed URLs never exceeds host limits (logged); re-run downloads 0 bytes (304/cache hit); on injected 403 the tool stops and prints remediation; manifest contains sha256, size, fetched_at, source_id for every file.
- Metric/grade moved: Reliability of the data pipeline; enables all ingest items

### hist-sources-1-13  OCR quality gates and targeted re-OCR: measure every source, re-OCR the poor ones (Compiler, Confederate Veteran, Gardner captions, Atlas)
- Severity: medium  |  Effort: M  |  Audit refs: H8  |  Depends on: hist-sources-1-12
- Evidence: Measured in-vocabulary proxy (1.0 best): OR27-1 0.984, OR27-3 0.967, Fox prose 0.977, NY Final Report v1 0.968, Battles&Leaders v3 0.966, Joint Committee 0.960, Phisterer v1 0.943, PA at Gettysburg 0.935-0.949, Clark NC v2 0.933, Maine at Gettysburg 0.892, Bates v1 0.878, Wert 0.867, Confederate Veteran v1 0.835, GNMP 1921 list 0.829, Atlas 0.685, Compiler 1863-07-13 0.43-0.48, Gardner Sketch Book 0.046 (image-only).
- Root cause: OCR quality varies by an order of magnitude; without a gate, garbled text enters embeddings and quotes.
- Fix: ocr_gate.py: compute proxy per document/section against the growing vocabulary; thresholds: >= 0.90 auto-accept; 0.80-0.90 accept with spell-repair and flag; < 0.80 quarantine for re-OCR. For quarantined sources download page images (IA JP2 zip or PNA IIIF) and re-OCR with Tesseract 5 (lang eng, --psm 1/4 column-aware) or Kraken; keep both texts with an 'ocr_engine' field. Add numeric-table validators (row sums) for Fox and casualty returns.
- Acceptance test: Every ingested document has ocr_score; documents < 0.80 never reach the retrieval index; re-OCR raises the Compiler sample proxy above 0.85 on a 10-page gold set.
- Metric/grade moved: Answer accuracy; quote fidelity

### hist-sources-1-14  Page-accurate citation model (IA leaf -> printed page -> deep link) for every quoted passage
- Severity: medium  |  Effort: M  |  Audit refs: H8  |  Depends on: hist-sources-1-01
- Evidence: IA *_page_numbers.json for warofrebellion271unit maps 1,188 leaves to printed pages (leaf 401 -> '383', leaf 703 -> '683'); *_djvu.txt has NO form-feed page markers (0 found), so page boundaries need *_djvu.xml (46.6 MB, one <OBJECT> per leaf) or running-head regex; Chamberlain report starts OR p.622 (Part 1, leaf ~640). HathiTrust deep links are babel.hathitrust.org/cgi/pt?id=coo.31924077699761;seq=N (HTML blocked to scripts but fine for human links).
- Root cause: Without page mapping the Historian can cite only 'Official Records' rather than 'OR Ser. I, vol. 27, pt. 1, p. 623', so answers are unverifiable.
- Fix: For each IA item stream-parse djvu.xml (lxml.iterparse) to get text per leaf, join with page_numbers.json to get printed page (fill gaps by interpolation), store leaf and printed_page on every chunk; generate two deep links per citation: archive.org/details/<id>?view=theater&ui=embed#page/n<leaf>/mode/1up and the Hathi seq link when an htid mapping exists (Bib API). Citation formatter: 'OR, Ser. I, vol. 27, pt. 1, p. 623 (Chamberlain, 20th Maine)'.
- Acceptance test: 100 random chunks: printed page matches the scan in 98+; citation strings render for 100% of chunks; links open the right page for 20 manual checks.
- Metric/grade moved: Verifiability/trust; docs polish

### hist-sources-1-15  Close source-coverage gaps: Wisconsin, Massachusetts, Delaware, New Hampshire, West Virginia, Confederate state monument commissions; outreach for Bachelder holdings
- Severity: low  |  Effort: S  |  Audit refs: new  |  Depends on: hist-sources-1-03
- Evidence: IA title searches found no Gettysburg commission volume for WI/MA/DE/NH/WV; UW-Madison catalog record 'Report of Commissioners to Care for Gettysburg Battle Monuments, 1892' exists (digital status unverified); Wisconsin Historical Society holds monument photographs. Site units: WI 6, MA 18, NH 3, DE 2, WV 4. No digital 'Bachelder Project', NYS Library or Gettysburg College Bachelder collection was found (NHHS holds the physical papers: 10 boxes + 7 volumes; finding aid PDF verified).
- Root cause: Some states never published a single commission volume online (or it is not on IA); Confederate states mostly memorialised after 1900.
- Fix: Workaround coverage matrix: WI via OR Nos.34-36 (Mansfield/Dawes/Robinson), Curtis, Haskell, Wisconsin History Commission Reprints No.1; MA via Roe 1910 + OR + B&L; Confederate via OR Pt2 + Clark + CMH + SHSP + Polley/Oates. Email UW-Madison/WHS for scan status; ask NHHS for item-level quote/permission for ~10 targeted Bachelder letters.
- Acceptance test: Coverage report lists per state: units, sources available, sources missing; outreach log has dated entries; each gap has a stated workaround.
- Metric/grade moved: Content coverage transparency

### hist-sources-1-16  Source-level QA harness: 100-passage random audit per source plus a 25-question retrieval gold set
- Severity: medium  |  Effort: M  |  Audit refs: H8  |  Depends on: hist-sources-1-01, hist-sources-1-03
- Evidence: Audit H8: 'why did Lee lose the war' returned Pickett + 'Archer Captured'; long vignettes dumped as walls of text. historian.html:48 promises every answer 'traces back to a real row of data'.
- Root cause: No evaluation exists to show that new sources improve answers rather than add noise.
- Fix: Create eval/gold.yaml with 25 questions across unit facts (20th Maine commander/position), time (when did Pickett's Charge begin), causation (Lee's July 3 decision), bias (Longstreet at Gettysburg), place (Peach Orchard), each with accepted source ids + page. Per source, sample 100 passages, check text fidelity vs scan, unit link correctness, license flag; report pass rate in CI. Track recall@5 and citation-precision before/after each source is added.
- Acceptance test: Each source has a QA report >= 95% pass; gold-set recall@5 >= 0.8 and citation precision >= 0.9 after P0 sources; regressions fail CI.
- Metric/grade moved: Historian quality (H8); reliability

### hist-sources-1-17  Corpus size and hosting budget for P0/P1 sources (raw ~75 MB P0 text; 20-50k chunks) to inform retrieval architecture
- Severity: low  |  Effort: S  |  Audit refs: P2, P3  |  Depends on: hist-sources-1-01, hist-sources-1-03
- Evidence: Measured raw OCR sizes: OR27 11.26 MB (3.97+3.88+3.41), Battles&Leaders v3 3.27 MB, SHSP v1-43 49.0 MB, NY Final Report v1 1.44 MB (vols 2-3 ~1.5-1.7 MB each), PA at Gettysburg ~2 MB/volume, Fox 2.26 MB, Clark NC ~1.8-2.2 MB/vol, Phisterer 3.6-3.9 MB/vol, Dyer 14.7 MB, Bates 6.6-9.1 MB/vol. P0 raw (OR + B&L + SHSP + NY + PA + Fox) ~= 75 MB; Gettysburg-filtered SHSP would shrink 49 MB to a few MB.
- Root cause: Site is static Netlify hosting; retrieval design (client-side vs edge vs hybrid) depends on corpus size.
- Fix: Store raw in a private bucket or repo LFS (not in the deploy); publish only derived, filtered passages (~30 MB, est. 20-50k chunks of ~250 words) as sharded JSON/JSONL + a compact BM25 index, embeddings computed offline and shipped as a quantised binary if a semantic tier is chosen; keep any LLM tier server-side. Coordinate with the retrieval-architecture agent.
- Acceptance test: Budget doc lists bytes per shard, gzip/brotli sizes, chunk counts; initial route payload for the Historian stays < 150 KB (index shards lazy-loaded).
- Metric/grade moved: Performance (LCP/INP) of the Historian page; hosting cost


## 10. Open questions, unverified items and decisions needed from the owner

**Decisions for Mike**
1. *Numbers policy:* should site casualty/strength values switch to PD-derived (OR returns > Fox > Dyer) with Busey & Martin demoted to "see also"? (finding 04). Counsel review of the existing OOB files' provenance is advisable.
2. *Perspective labelling:* accept mandatory "perspective" chips (Union/Confederate/civilian; official report/memoir/testimony; Lost-Cause and partisan-committee tags) on every quoted passage? (finding 05).
3. *Budget for permissions:* NHHS charges $25 (already digitised) / $50 (not digitised) per Bachelder image; are ~10 targeted requests (~$250-500) acceptable? Would you approve contacting Morningside/the Ladds and Gettysburg College (drafts in Appendix D; nothing has been sent)?
4. *Depth of Confederate coverage:* only ~88 Confederate regiment/battery-level OR reports exist for 241 Confederate unit records; accept regimental coverage from Clark (NC only), CMH, SHSP and memoirs, or invest in additional Confederate sources in part 2?

**Unverified / could not be checked (do not treat as facts)**
- Whether Bachelder's 28 time-stamped "hourly" maps exist digitally, and where (dealer pages only).
- eHistory (OSU) contents/licence (403); HathiTrust Data API terms and hathifiles page (403 to scripts); NARA Catalog record contents (JS shell); Rumsey record contents beyond the WebFetch summary.
- Digital availability of the Wisconsin commissioners' 1892 report (UW-Madison catalog record only).
- Which IA item is volume 2 vs 3 of the NY Final Report (`cu31924092924970` 542 imgs vs `cu31924092924996` 634 imgs); confirm at ingest by reading the title pages.
- Exact count of Gettysburg-relevant SHSP articles (only keyword counts measured) and of Fox rows for Gettysburg (only structure sampled).
- Total number of monuments/markers in the GNMP lists (only text-layer presence and row structure verified).
- Atlas plate numbers beyond 43 and 95 (OCR index ambiguous).
- NDNP/PNA has no explicit reuse statement on the PNA "About" page; the public-domain position rests on the LoC Chronicling America guide.
- Gutenberg ebook pages returned HTTP 200 on first fetch and 504 on later attempts (transient gateway timeouts); Gutendex returned 503.

**Things I deliberately did not do:** no browser tools; no building; no writes outside the plan-work scratch folder; no emails sent; no scraping of copyrighted or ToS-restricted sites (Stone Sentinels, NYSMM, Rumsey, HathiTrust babel pages).

---

## Appendix C. Reproducing the key measurements

- OR ToC/counting: `plan-work/tmp-hist-sources-1/or_toc.py` (reads `or27_1.txt`, `or27_2.txt`); classification snippet in the report methodology; time-expression regex in section 7.3.
- SHSP counts: `shsp_count.py` -> `shsp_counts.json` (43 volumes, 49,044,672 bytes, 2,949 'Gettysburg' hits).
- OCR proxy: `ocrq.py` -> `ocrq.json` (range samples at 40% of each text) and the PNA page check.
- LoC photo statistics: `loc_p1..p4.json` (4 pages of the civil-war-glass-negatives 'gettysburg' query) -> 185 records, 75 with '1863 July.'
- Site unit counts: read-only walk over deployed `data/oob/*.json` (records with `regiment_id`/`battery_id`).
- Catalog build and URL verification: `build_catalog.py` (writes `hist-sources-1.catalog.json`).

## Appendix D. Draft permission requests (NOT SENT - for the owner to review and send)

**D1 - New Hampshire Historical Society (Bachelder Papers, RS64984 / 1921.001)**
"Hello - I run gettysburginteractivemap.com, a non-commercial educational visualisation of the battle. I would like to license or obtain scans of about ten letters in the John B. Bachelder Papers (1863-1894) relating to the 20th Maine and the Peach Orchard, for quotation with full credit to NHHS. Could you confirm (1) which of the items are already digitised, (2) the per-item fee and licence terms for web display with attribution, and (3) whether short transcribed excerpts may be quoted without image reproduction? Thank you."

**D2 - Morningside House / David and Audrey Ladd (The Bachelder Papers: Gettysburg in Their Own Words, 3 vols., 1994-95)**
"We would like to quote a small number of passages (with full citation) from your edition in an educational, non-commercial web feature. Please let us know if you can grant permission for excerpts of up to N words per letter and the required credit line, or whether we should instead obtain the original letters from the New Hampshire Historical Society and transcribe them ourselves."

**D3 - Gettysburg College Special Collections / Musselman Library (Adams Sentinel 1863; Star and Banner)**
"Your libguide notes the Adams Sentinel (1800-1867) and Star and Banner are available via Newspaper Archive and microfilm. For an educational non-commercial site we would like to use ~30 articles from July-November 1863. Is there a research-use licence, or can Special Collections provide page images and permission for short quotations with credit?"

**D4 - Stone Sentinels (Steve A. Hawks)**
"Your site is an excellent reference. We do not copy it; we would like to cross-check our own transcriptions of public-domain regimental histories against your unit pages, and possibly link to them. Please tell us your preferred linking/credit approach."

**D5 - NARA Cartographic Branch (College Park) / GNMP archivist**
"Do the 28 time-stamped tactical maps prepared by John B. Bachelder for the War Department (c. 1880-86) survive in RG 77 (Civil Works Map File) or in the Gettysburg NMP archives, and are they digitised? If not, what is the process and cost for scans suitable for georeferencing?"


## Appendix A. OCR quality table (measured proxy)

| IA id | in-vocab proxy | sampled tokens | text KB |
|---|---|---|---|
| battlesleadersof03john | 0.966 | 17391 | 3251 |
| numberslosses00liverich | 0.965 | 12400 | 307 |
| reportofjointcomm01unit | 0.96 | 16992 | 3401 |
| southernhistoric4187sout | 0.95 | 17282 | 865 |
| pennsgettysburg02reynrich | 0.949 | 17666 | 1987 |
| 01897724.3053.emory.edu | 0.948 | 17744 | 2258 |
| newyorkinwarofre01phisrich | 0.943 | 15342 | 3638 |
| hoodstexasbriga00poll | 0.943 | 17797 | 902 |
| newjerseytroopsi00intoom | 0.939 | 17481 | 619 |
| pennsylvaniaatge05penn | 0.935 | 17906 | 1978 |
| 01300611.3315.emory.edu | 0.933 | 17325 | 1971 |
| historyoftwentyf00curti | 0.93 | 17524 | 1211 |
| armylifeprivates00gerr | 0.926 | 18490 | 708 |
| historyoffirstre00minn | 0.925 | 17689 | 1016 |
| 08697590.3359.emory.edu | 0.921 | 12121 | 14698 |
| gettysburgwhereh00vand | 0.916 | 15597 | 359 |
| passingofarmiesa00cham | 0.914 | 17910 | 726 |
| southernhistoric3719sout | 0.913 | 17490 | 941 |
| finalreportofget00newj | 0.906 | 17438 | 391 |
| cu31924030924736 | 0.905 | 20599 | 352 |
| confedmilhist03evanrich | 0.9 | 16408 | 712 |
| minnesotacivil01minnrich | 0.895 | 16114 | 4160 |
| itineraryofarmy00united | 0.895 | 7521 | 155 |
| gettysburgwhatto00bach | 0.894 | 12860 | 268 |
| maineatgettysbu01commgoog | 0.892 | 16495 | 1627 |
| historyofpennsyl01bate | 0.878 | 12647 | 6608 |
| acompletehandbo00wertgoog | 0.867 | 20176 | 568 |
| confederateveter01conf | 0.835 | 17375 | 2898 |
| locationofmonume01unit | 0.829 | 4518 | 82 |
| atlastoaccompany00unit | 0.685 | 6677 | 398 |
| GardnersPhotographicSketchBookOfTheWar | 0.046 | 194 | 33 |
| panewsarchive Compiler 1863-07-13 seq-1..4 | 0.48 / 0.46 / 0.43 / 0.43 | ~5,000 each | ~45-51 |


## Appendix B. URL verification summary (catalog URLs, 2026-09-30)

- blocked / None: 1
- curl / 200: 126
- curl / 206: 15
- curl / 404: 1
- curl / 504: 4
- curl-insecure / 200: 1
- curl-insecure / 206: 1
- curl-range / 206: 22
- search-only / None: 2
- webfetch / None: 12


Catalog URLs that did not return 200/206 at final check:
- SRC-28 https://chroniclingamerica.loc.gov/search/pages/results/?andtext=gettysburg&format=json HTTP 404
- SRC-31 https://www.gutenberg.org/ebooks/33121 HTTP 504
- SRC-31 https://www.gutenberg.org/ebooks/49530 HTTP 504
- SRC-31 https://www.gutenberg.org/ebooks/44459 HTTP 504
- SRC-31 https://www.gutenberg.org/ebooks/57392 HTTP 504


## Verification

Adversarial verifier pass, 2026-09-30. Method: re-opened the deployed files (`historian.html`, `data/oob/*.json`), re-downloaded the cited IA OCR texts (OR27 Pt1-3, NY Final Report v1/v3, Fox, B&L v3, Joint Committee, Curtis, SHSP v4/5/37, page_numbers.json, scandata.xml), re-queried the IA metadata API for every one of the 107 archive.org identifiers cited, re-curled all non-IA catalog URLs, re-queried the HathiTrust Bib API, the LoC item/collection/Chronicling America JSON APIs and the Wikimedia Commons category API, and re-derived the counts with independent scripts (scratch: `C:/Users/mlege/AppData/Local/Temp/claude/vh1/`). Limits: WebSearch hit its spend limit mid-pass; `panewsarchive.psu.edu` and most `gutenberg.org` pages timed out (HTTP 000/504) for me, so those were checked only against the specialist's cached copies (PNA) or marked unverifiable (Gutenberg ids 33121/49530/44459/50504). Nothing was modified.

### Verdict table

| Finding | Verdict | What I re-checked and what is wrong / right |
|---|---|---|
| 01 OR27 backbone | CORRECTED | Real and reproducible: all three IA items exist with the exact byte sizes; HathiTrust rightsCode `pd` / "Full view" for coo.31924077699761, coo.31924077728255, coo.31924077700262 (the Bib API returns the whole 862-item series record; these three are in it with enumcron ser.1:v.27:pt.1/2/3); ToC numbering (No. 196 = Chamberlain, 20th Maine; 5 Hooker; 6 Meade; 7 Itinerary; 9 Organization; 13 Return of Casualties; 424 Organization ANV; 426 Lee; 427 Guild; 589 Roll of Honor) all match. PROBLEMS: (a) the prescribed segmentation regex returns 0 matches on the raw `_djvu.txt` because the file separates words with double spaces ("No.  196."); after collapsing whitespace it recovers 303/378 (Pt1) and 162/211 (Pt2), matching the claimed 302/160. The fix omits a whitespace/encoding normalisation step (the text also contains U+FFFD in place of dashes/quotes). (b) The title's "~2,200 dispatches" is wrong: 2,204 is the Pt3 clock-time count, not a dispatch count; my dateline heuristic finds ~1,380 dated Pt3 items (the card itself estimates 1,000-1,500 at line 318, contradicting the title). (c) "Union Gettysburg items Nos. 5-375 (~371)" overcounts: the range includes staff/signal/ordnance/quartermaster items (Nos. 16-28), non-Gettysburg casualty returns (Nos. 10-12, 14: Brandy Station, Aldie, Upperville, Wapping Heights); the Confederate range 424-589 includes non-Gettysburg items (Nos. 484-487 Louisiana regiments at Winchester, 475 Williamsport, 448 Funkstown, 439 July 10-11 ops) and No. 428 = Union Medals of Honor. The 88 Confederate regiment-level figure is heuristic; my independent classifier gave 116 (it counts artillery-battalion commanders), so "+/-10%" is optimistic. (d) The card says the 1971 NHS reprint (warrebellionaco00cowlgoog) "is NOT public domain"; its IA metadata says NOT_IN_COPYRIGHT. Excluding it is prudent, but the statement is stronger than the evidence (a reprint of a federal work is PD except for new matter). Effort L is realistic. |
| 02 Unit alias table | CORRECTED | Counts confirmed (467 regiment_id + 103 battery_id = 570 unique, 329 U / 241 C; state counts NY 75, PA 74 etc.; alias row U-14BK is in `union_regiments_i_ii_corps.json`). Corrections: (a) the "55 Union + 48 Confederate records with state=null" are exactly the 103 battery records, which have NO `state` key at all (a schema gap, not 103 bad regiments; all 467 regiment records have a state). Some "state" values are not states: 'Regular Army' 15, 'Multi-state' 1. Maryland is 5 not 4; Texas 3, Florida 3, Tennessee 3, Arkansas 1 are missing from the specialist's list. (b) 570 includes the alias row, so the true unit count is 569; and `U-14BK` is ALSO listed in `union_oob_brigades.json` `regiment_ids` next to `U-84NY` (["U-76NY","U-84NY","U-95NY","U-147NY","U-56PA","U-14BK"]), so that brigade double-counts the regiment. The fix (remove alias text from designation, expose aliases as synonyms) must also remove U-14BK from that list or the roster keeps a phantom regiment. (c) Battery ids are label-based ('C-ART-Manly', 'U-ART-C1NY'); the ordinal parser in the fix does not cover them: a battery/commander name table (~103 rows, manual) is needed. |
| 03 State monument corpus | CORRECTED (minor) | NY facts confirmed verbatim in vol.1 ("sixty-eight New York regiments or battalions of infantry present", "nineteen New York batteries"); all cited IA ids exist with the claimed sizes/image counts (PA 1893 v1/v2, PA 1914 v1-3, Maine 701 imgs / 1,627,370 B, NJ, MI, MN, small states). Corrections: the NY per-regiment inscription + historical-sketch material is spread over ALL THREE volumes (vol.1 has 0 hits for Ninety-first; vol.3 opens with the 137th NY), not "vol.1 sketches + vol.3 monument data"; a cleanly volume-labelled vol.3 exists (`finalreportonbat0003unse`, 626 imgs, 1,560,166 B) and a labelled vol.1 duplicate (`finalreportonbat0001dani`), while the report lists only ambiguous unlabelled `cu3192409292497x/96` ids. Fox's own preface says each regiment's movements are "fully described elsewhere in the historical sketches and addresses published in this report". Effort L is realistic. |
| 04 PD casualty table | CORRECTED | Provenance claim confirmed (`union_regiments_i_ii_corps.json` metadata.sources lists Busey & Martin, Pfanz, Hessler & Motts, Moe, Desjardin, Dawes) and the Fox digit errors are real and exactly as quoted ('(5,024', '30S', '000', '4,2 lo'). Corrections: (a) Fox is Union-only, so 241 of 570 units (42%) have no Fox row; the OR27-2 Addenda "Return of Casualties in the Army of Northern Virginia" (Guild, pp. ~338-345) DOES give Confederate regiment-level K/W/M and is the right PD counterpart, but the report never says so, its OCR is column-scrambled (numbers come out as separate blocks with markers like '+66', '*78', ',888', '2^78'), so it needs djvu.xml word coordinates, and the table's own note says regimental sums do not tally with brigade totals. (b) Only casualties are replaceable: no PD source gives regiment-level STRENGTH for Confederate units (OR No. 424 lists organisation without strengths; the abstract returns are corps/division level), so the acceptance test "site value == rule value for 100% of units with an OR or Fox row" silently exempts every Confederate strength. (c) The root cause is incomplete: 88 of 103 battery records have templated strengths (4 guns = 80: 56 records; 6 guns = 107: 32 records) and 36 regiments have casualties = 0; these are placeholders, not "compiled from secondary books", and need an explicit `estimated` flag. (d) `metadata.sources` exists in 11 of 14 oob files (it is not only in `union_regiments_i_ii_corps.json`); the three `confederate_regiments_*` files (171 records) have `metadata` = null, so their provenance is undocumented. Effort L is optimistic given the Guild-table reconstruction. |
| 05 Participant narratives | CONFIRMED | B&L v3 contents (fetched): Longstreet 244, Mosby/Robertson 251/253, Hunt 255 and 290, Halstead 284, Richards 289, Gibbon 313, Melcher 314, Grindlay 315, Law 318, Kershaw 331, Longstreet 339 -> matches. SHSP: I recomputed vols 4/5/37 = 312/204/253 exactly, and the stored per-volume counts sum to 2,949 across 43 vols / 49.04 MB. Joint Committee 345 'Gettysburg' / 212 'Sickles' exact; witness headings (Meade, Warren, Butterfield, Hancock ...) present. Curtis 549 is for `historyoftwentyf00curti` (the other copy `24thmichiganiron00curtrich` gives 538). Bias-tag design is sound; effort L fair. |
| 06 Time anchors | CORRECTED | Regex counts reproduce only after whitespace collapse: 2,258 / 944 / 2,201 (claimed 2,269 / 947 / 2,204; within 0.5%). The headline overstates usefulness: Pt3 spans June 3-Aug 3 and only ~100 of ~1,374 dated Pt3 items are dated July 1-3 (~168 of 2,201 clock times, ~8%); Pt1/Pt2 also include June/July non-battle reports. A realistic July 1-3 anchor pool is a few thousand at most, not 5,420, and the report's own SRC-01 notes (reports contradict each other by 1-3 h; Fox's preface says officers differ "three hours or more") conflict with the title "ground-truth". The "225 'July 1-3, 1863' date strings" is actually 225 occurrences of `July [123], 1863` (85/74/66); the literal string "July 1-3, 1863" appears once (an index line). The fix is workable if framed as testimony statistics (median/IQR, which it already proposes). |
| 07 Georeference maps | CONFIRMED (note) | LoC items 99447491, 99447492, 99448794, 93517377, 99448798, 99448799 all return 200 with the stated titles; 99447491 = Bachelder, published Boston 1876, 3 sheets, Scale 1:12,000 (the LoC `date` field says 1879); 99447492 = 1883 new edition of the 1876 positions; 99448794 = Warren, "From the Jubal Early Collection", base for Bachelder; rights: G&M "free to use and reuse unless a Rights Advisory statement is present"; 93517377 "No known restrictions on publication". tile.loc.gov IIIF info.json answers. Leventhal: 'No known copyright restrictions', IIIF manifest, 208 MB primary TIF, Scale 1:12,000 confirmed. The "28 hourly Bachelder maps" exist only as dealer listings (Horse Soldier says 28; a forum thread says 27); NPS finding aid `Gett 41137` (GNPC Maps and Drawings 1893-1922) confirms the Commission made hour-by-hour first-day position maps 1895-1910, an additional lead the report does not mention. The RMS < 15 m target and XL effort could not be verified. |
| 08 LoC photographs | CORRECTED (minor) | The collection query returns 185 results in 4 pages of 50 (page 5 = 404); 75 have created_published containing '1863 July' (O'Sullivan 24, Gardner 21, Gibson 13, Brady 3); rights: 118 "No known restrictions ... 120_cwar" + 55 "No known restrictions" + 12 blank; 3 records have a 'Copyright' note; the caption-correction example is real ("[i.e., Devil's Den]"). Correction: 10 of the 185 rows are LoC essay/bibliography pages (no `item` block), so there are 175 photographic records and the "12 with no rights statement" are mostly those 10 pages. The rights gate ('No known restrictions' AND no Copyright note) is sound. |
| 09 Newspapers | CONFIRMED (partly unverifiable) | Chronicling America total 1,425 (pagination `total`) and the top-title facets (Tribune 76, Herald 69, Chicago Tribune 48, Cleveland Leader 48, Worcester Spy 41, Portland Press 36) reproduce; the old chroniclingamerica.loc.gov search URL 404s as stated. PNA: the cached index shows 51 Compiler issues in 1863, July issues only 13/20/27 (no July 6); cached OCR of 1863-07-13 seq-2 is garbage, but the quoted 'BATTLES 0F GETTYSBURG' line is at line 305 of the page text, not its beginning ("begins" is wrong). I could not reach the PNA host (timeouts) so the 0.43-0.48 proxy is UNVERIFIABLE live. The Gettysburg College libguide confirms The Adams Sentinel and The Compiler (and Star and Banner 1862-64) are "online via the Newspaper Archive database via Gettysburg College"; The Compiler is therefore also in a commercial archive (possibly better OCR, licence-restricted). |
| 10 Monument register | CORRECTED (effort) | `mon-locations-1932.pdf` = 2,095,190 B, 41 pages; `pdftotext -layout` = 139,713 chars (exact); 1993 PDF = 7,014,723 B; IA 1903/1912/1916/1921 lists exist; GDG certificate expired 2015-05-06 (openssl). But the `-layout` output is NOT clean rows: under CONNECTICUT the brigade/corps/location cells of one regiment print on a different line than its regiment number ("McDougall ... 12 Slocum Avenue south Culps Hill" precedes "14 Smyth"), with OCR typos ('Sloeum', 'Cuips'). Parsing needs word-bbox/y clustering or the IA editions; effort M is optimistic (M-L). |
| 11 Rights governance | CORRECTED | Evidence confirmed: `bachelderpapersg0001unse` is `access-restricted-item: true` (1994 Morningside); the NHHS page says "For permission to reproduce this image, please add the image to your cart..." and lists $25/image (previously digitised) / $50/image (not), but those are REPRODUCTION fees; separate licensing/permission fees ($25-$100) also apply; Bachelder's own 1863-94 letters are old enough to be public domain, so the barrier is ownership/access terms, not copyright. Stone Sentinels "(c)2026 Steve A. Hawks", NYSMM "All rights reserved", Rumsey by-nc-sa/3.0 (about page) vs by-nc-sa/2.0 (record page) all reproduce. FLAW in the proposed IA gate "date <= 1930": the IA item `date` is the series start, not the volume date (OR items = 1880; Confederate Veteran issues of 1902-1929 carry date 1893; SHSP and Gardner items have `date` = null), so the gate both passes post-1930 Confederate Veteran issues (the run goes to 1932) and cannot evaluate SHSP; 1984 reprint scans of the same journal exist as separate items (`confederateveter17cunn_0` etc., date 1984). See MISSED-1. |
| 12 Fetch infrastructure | CONFIRMED | loc.gov limits page read: JSON/YAML 20 req/min, text and image services 150/min, 1-hour block, 100,000-item paging cap (also: MARCXML endpoint 30/min with a 72-hour block, and the block countdown resets on any request made during the block, so "retry with backoff" must stop while blocked). HathiTrust babel robots.txt: `User-agent: *` Crawl-delay 1, `Disallow: /cgi/` confirmed. Emory file-name underscore rule confirmed (`01300611_3315_djvu.txt` 200, `01300611.3315.emory.edu_djvu.txt` 404). Gutenberg 504s reproduced. The proposed 0.3 req/s (18/min) leaves only 10% headroom under the 20/min cap; use 0.2 req/s. |
| 13 OCR gates | UNVERIFIABLE (partly confirmed) | The proxy vocabulary was not reproduced; Fox digit errors, Compiler garbage and clean OR text were confirmed individually. Design is reasonable. |
| 14 Page-accurate citations | CORRECTED | Confirmed: page_numbers.json leaf 401 -> '383', 703 -> '683', Chamberlain starts at OR p. 622; djvu.txt has zero form feeds. BUG in the deep-link recipe (`#page/n<leaf>`): page_numbers.json `leafNum` is the scandata leaf number (0..1192, 1,188 entries, gaps at 470/471/886/887), while the BookReader index `n` counts only access leaves; scandata.xml flags six leaves `addToAccessFormats=false` (0, 470, 471, 886, 887, 1193). Empirically, `archive.org/download/warofrebellion271unit/page/n641_w800.jpg` renders printed page 624 (Chamberlain's report, p. 624), whereas page_numbers.json lists leafNum 641 as '621' and 644 as '624': n = leafNum - 3 there, and -5 after leaf 887. Every stored `leaf_start/leaf_end` and every generated deep link would land 3-5 pages off unless the pipeline derives the reader index from scandata.xml (or links by printed page). |
| 15 Coverage gaps | CORRECTED | Wisconsin History Commission Reprints No. 1 exists (`battleofgettysbu0000unse_f9x3`, 1910). The Massachusetts gap is narrower than stated: `dedicationofmonu00bowe` (Dedication of the monuments of the 7th, 10th and 37th Mass. Vols. at Gettysburg, 1886) and `reportofjointsp00bost` (Mass. burial committee, 1863) exist; also `reportofnewyorkb00newy` (NY Board of Commissioners, Gettysburg monuments, 1887). None is in the report or catalog. The UW-Madison catalog record exists (digital status unverified). |
| 16 QA harness | UNVERIFIABLE (design) | Cited evidence is real: `historian.html:48` promises "shown as a source link below each answer"; the audit H8 'Archer Captured' example is at audit line 59. The proposal is sound; there is nothing to measure. |
| 17 Corpus budget | CONFIRMED | Sizes re-derived from IA metadata: OR 11.26 MB, B&L 3.25, SHSP 49.04, NY v1 1.44 (+v3 1.56, v2 ~1.7), Fox 2.26 -> ~75 MB. Caveat: 30 MB of derived text cannot be fetched up front by a page that today loads ~0.8 MB (`historian.html:76-79`); lazy shard loading and an index-first design are mandatory, which the finding only implies. |

### Other checks that came out clean (no action)
- `historian.html:48` states 467 / 24 / 137 / 30 exactly as quoted; `historian.html:76-79` fetch lists match (line numbers correct).
- 107 of 107 IA identifiers cited exist; sizes/image counts match for every one I compared (OR27 x3, NY v1, PA, Battles & Leaders, Fox, Itinerary, Maine, Phisterer 1-6, Bates 1-5, CMH, SHSP, Clark v1-5).
- 197 catalog URLs: all non-IA URLs returned the recorded status or a transient timeout (PNA, Gutenberg); no dead links found.
- Wikimedia Commons Category:Battle_of_Gettysburg = 296 files (API); Rumsey, NHHS, Stone Sentinels, NYSMM statements as quoted.

### MISSED issues in scope

1. (high) The IA rights gate cannot work as specified: `date <= 1930` is defeated by series-start dates (Confederate Veteran 1902-1929 issues = date 1893; OR = 1880; SHSP and Gardner = null; reprint scans dated 1984 sit beside originals). Fix: gate on a hand-curated identifier allow-list plus parsed volume year (from `volume` like 'v.19(1911)' or the title), publisher, and a recorded reviewer; treat `possible-copyright-status` = None as "unknown", not "ok" (most OR/B&L/Clark/Oates/Dyer items have None).
2. (medium) OCR text normalisation is missing from the pipeline: raw `_djvu.txt` has double-spaced words and U+FFFD glyphs; the prescribed regexes return 0 matches until whitespace is collapsed. Add a `normalize_ocr()` step (collapse `[ \t]+`, map U+FFFD to an em dash by context, de-hyphenate line breaks like "Poto- mac") with a unit test on OR27-1 No. 196.
3. (medium) The alias row also lives in `data/oob/union_oob_brigades.json` `regiment_ids` (U-84NY and U-14BK both listed for the same brigade), so removing the alias record alone leaves a dangling id; remove it there and from any strength roll-up that sums `regiment_ids`.
4. (medium) OOB numbers include placeholders: 88 of 103 batteries have templated strengths (4 guns = 80, 6 guns = 107) and 36 regiments show 0 casualties; the PD table must mark these `estimated` and prefer OR artillery returns / Fox / Phisterer, otherwise the Historian will quote formula values as history.
5. (medium) Confederate regiment-level casualties: the OR27-2 Addenda "Return of Casualties in the ANV" (Guild, pp. ~338-345) is the PD counterpart to Fox for the 241 Confederate units but is not named in finding 04 and its OCR is column-scrambled; plan djvu.xml coordinate parsing plus a reconciliation rule for its documented regimental-vs-brigade mismatches; state explicitly that Confederate STRENGTH has no PD regimental source.
6. (medium) Page-link bug (see verdict 14): derive the BookReader index from scandata.xml `addToAccessFormats`, store both `scan_leaf` and `reader_index`, and add a test that fetches `page/n<idx>_w400.jpg` for 5 sampled citations and OCRs the printed folio.
7. (low) Undocumented provenance: the three `confederate_regiments_*` files (171 records) carry no `metadata.sources` (null; the other 11 of 14 oob files do list sources, mostly Busey & Martin plus OR); the report cites only one file. Add a provenance-audit step before "replace copyrighted provenance".
8. (low) Unlisted cheap sources: NY Board of Commissioners report 1887 (`reportofnewyorkb00newy`), Massachusetts regimental dedication volume 1886 (`dedicationofmonu00bowe`), Mass. burial committee 1863 (`reportofjointsp00bost`), labelled NY Final Report vol.3 (`finalreportonbat0003unse`) and vol.1 (`finalreportonbat0001dani`), and the GNPC "Interpretive Maps" hour-by-hour first-day maps 1895-1910 described in NPS finding aid `Gett 41137`.
