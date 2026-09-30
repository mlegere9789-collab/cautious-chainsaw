# hist-sources-2 - Ask the Historian: SOURCE CATALOG, part 2 (modern / open / government data)

Specialist: hist-sources-2. Date of research: 2026-09-29/30. Scope: NO-BUILD plan. Nothing in the site folders was modified; all scratch work is in `plan-work/tmp-hist-sources-2/`. Companion machine-readable file: `plan-work/hist-sources-2.catalog.json` (46 sources, 135 verified URLs).

All line numbers cited for the site refer to `C:/Users/mlege/AppData/Local/Temp/claude/site/deploy/...` (the deployed tree) or to `plan-work/bundle.pretty.js` (stated each time). This report is research, not legal advice; every rights conclusion should be confirmed by the owner (and where noted, by the rights holder in writing).

---

## 0. Executive summary

**What is possible now (all verified on 2026-09-30):**

1. **A real "find my ancestor" lookup.** The NPS Civil War Soldiers and Sailors System (CWSS) is "no longer maintained and updated" (NPS wording) and has no API, but a public S3 mirror holds the NPS data by request (`jrnold-nps-cwss`, 39 files, ~7.7 GB). `Soldiers_Personz.tsv` is 1,194,562,274 bytes (~6.26 M index cards, estimate from a measured 190.75 bytes/row; NPS says 6.3 M cards). A 400 KB sample was 42% Confederate (884 of 2,097 rows). Unit codes such as `UNY0071RI` / `CVA0021RC` give a deterministic join to the site's regiment ids (`U-20ME` -> `UME0020RI`). Today `find-ancestor.html:48` only lets people narrow "by state, or by a commander's surname". **Redistribution status needs written NPS confirmation (Phase 0).**
2. **A real evidence layer for time.** *Official Records, Ser. I, Vol. 27, Parts 1-3* are on Internet Archive (3,578 pages; 11,257,033 bytes of OCR), public domain. They are the right corpus to settle the clock conflict (audit C4): the site's own data puts "LONGSTREET'S ASSAULT BEGINS" at tick 256 = "7:30am" (`data/chronology_day2.json:23`) and "PICKETT'S CHARGE BEGINS" at "11:05am" (`data/chronology_day3.json:35`).
3. **Monuments: 867 candidates from OpenStreetMap vs the site's 512.** 177 OSM historic elements lie more than 60 m from any of the site's 512 monuments (131 more than 100 m); 38 of those 177 are named Confederate; 20 of the site's monuments have *no* OSM feature within 60 m (suspect coordinates or OSM gaps). Only 9 of the 512 site monuments carry a `src` value (`bundle.pretty.js:104437-110597`).
4. **A real viewshed.** USGS 3DEP 1 m DEM tiles exist for the whole battlefield (4 GeoTIFFs, 469-485 MB each, published 2020-03-30); `viewshed.html:46` says a real viewshed "needs full terrain elevation data (a digital elevation raster)". Public-domain LoC scans of the Warren/Bachelder maps allow an "1863 landscape" layer.
5. **Primary human voices:** civilian books (Pierce 1889, Buehler 1900, Hoke 1887, Jacobs 1864, Bates 1875), state monument-dedication volumes (Maine, Pennsylvania, New York, Michigan, Minnesota), a July 1863 weather record (Prof. Jacobs), 1,560 Chronicling America newspaper pages for July 1863, and the 1864/65 Soldiers' National Cemetery burial lists - all public domain.

**What must stay link-out only (Tier C):** American Battlefield Trust (ToS forbids scraping and "use ... for artificial intelligence technologies such as large language models"), Ancestry family (Fold3, Find a Grave; ToS forbids programmatic access beyond human use and ML training), FamilySearch, Adams County Historical Society ("Reproduction ... prohibited without the express permission"), HMDB bulk (non-commercial only), Stone Sentinels (copyright reserved), NHGIS (no redistribution).

**What does *not* exist (negative results, do not chase):** a public NPS GIS layer of monuments/fences/orchards/cannon/tablets (national POI layer has 7 GETT points); a Dyer/NPS list of Confederate units at Gettysburg (300 units, all Union); a ready-made Gettysburg order-of-battle JSON/CSV on GitHub/Zenodo; Gettysburg National Cemetery burials in the CWSS mirror (0 of 5,672 cemetery rows mention Gettysburg); a bulk dataset of damage claims.

**Risks to manage:** (a) the CWSS mirror is third-party, unlicensed on paper, and a 2012/2015 snapshot; (b) the site's current OOB metadata cites copyrighted books (Busey & Martin 1994; Pfanz; Desjardin; Moe; Hessler) - facts are not copyrightable but a governance note and PD cross-sources (OR, Fox, NPS) reduce exposure; (c) CC BY-SA (Wikipedia) and ODbL (OSM) obligations must be implemented in a *static* site without infecting the site's own vignettes; (d) the Historian today eager-loads 15 JSON files (317,788 bytes raw) at page load (`historian.html:67-79`) - the expansion must be lazy/sharded to protect LCP/INP.

---

## 1. Method and evidence quality

- Live probes with `curl`, Python, WebFetch, WebSearch on 2026-09-29/30. No login, no API key registration, no account creation. No large file was downloaded to disk: big files were sampled with HTTP `Range` requests or streamed through a pipe for counting; only small analysis outputs are in `tmp-hist-sources-2/`.
- Every canonical URL in the catalog was fetched (HTTP 200 or 206 in `url_verification.json`; 59 x 206 because the check used a 2 KB range). Exceptions and quirks are listed in Appendix A (LoC web resource pages, HathiTrust, DPLA docs, ehistory.osu.edu and hmdb via WebFetch return 403 to non-browser clients; the JSON APIs work).
- Evidence quality tags used in the catalog: **primary text read** (script read the page/JSON/README), **fetch-summarizer** (small-model summary of a page; quotes must be re-read before public use), **search snippet** (weakest). Where a claim is only from a search snippet, this report says UNVERIFIED.
- Things I tried that failed and are therefore *not* verified: Gutendex / Gutenberg catalog (timeouts, 503/504), DPLA API docs (403), Kaggle (needs login), GDG battlefield-histories site (TLS certificate expired, fetch refused), NARA Catalog API (no key requested), NPS Data API record counts (no key requested), Smithsonian API beyond `DEMO_KEY`.

## 2. What the Historian ingests today (baseline)

| Fact | Evidence |
|---|---|
| Statement to users: "answers only from this site's own published data -- 467 regimental records, 24 narrative vignettes, 137 chronology events, and 30 mapped terrain features. It is a search-and-synthesis tool, not a live AI model" | `historian.html:48` |
| Eagerly fetches 8 OOB files + 3 vignette files + 3 chronology files + `terrain.json` on load (15 files, 317,788 bytes raw) | `historian.html:67-79`; sizes summed from `data/oob/*.json`, `data/vignettes_part*.json`, `data/chronology_day*.json`, `data/terrain.json` |
| OOB source metadata cites copyrighted books (Busey & Martin 1994; Pfanz; Hessler & Motts; Moe; Desjardin) plus OR Vol. 27 | `data/oob/union_regiments_i_ii_corps.json:7-8` |
| Sitewide monument list: 512 records `{no,name,honors,loc,lat,lon,mn,side,group,src}` embedded in the JS bundle (~158 KB pretty-printed, est. 60-80 KB minified); side split Union 457 / Confederate 40 / Other 15; `src` non-empty for 9 records; `mn` non-empty for 461 | `bundle.pretty.js:104437` (`_A = [`) to `:110597` (`no: 512`); sample `:104984-104996` |
| A second, separate `data/monuments.json` holds only 9 state monuments with a note "This is a starting set ... not the park's full ~1,328 monuments and markers" | `data/monuments.json:2` |
| Find-ancestor asks users for state or commander surname, not the ancestor's name | `find-ancestor.html:48` |
| Viewshed page admits it is not a viewshed | `viewshed.html:46` |
| Terrain data: 30 key locations with a single `elevation_ft` value each | `data/terrain.json:22-24` |
| Time labels used by the data: Longstreet 7:30am (tick 256), McGilvery line 11:05am (tick 299), Johnson at "dusk" 12:10pm (tick 314), Pickett 11:05am (tick 538); tick 1 = 5:00am on each day | `data/chronology_day2.json:23,44,50`; `data/chronology_day3.json:35`; `tick_formula` at line 5 of each chronology file |

## 3. Rights-tier policy (recommended, enforce in the build)

| Tier | Meaning | Examples |
|---|---|---|
| **A** | Public domain / CC0 / notice-only. May be ingested, redistributed in derived shards and indexed. | OR Vol 27, Fox 1889, Dyer 1908, NPS documents, LoC PD items, USGS, Census 1860 PDFs, CC0 Wikidata, Smithsonian CC0 rows |
| **B** | Reusable with attribution and/or share-alike. Ingest only into separate files with per-record license + attribution. | Wikipedia (CC BY-SA 4.0), OSM (ODbL), Commons files (per file), ACW Battle Data (CC BY 4.0), WarOfTheRebellion corpus (MIT), Freesound CC BY |
| **C** | Link-out only. Never fetch, store, embed or feed to a model. | American Battlefield Trust, Ancestry/Fold3/Find a Grave, FamilySearch, ACHS, HMDB bulk, Stone Sentinels, NHGIS, blog summaries |
| **A-pending** | Believed public; needs written confirmation. | CWSS bulk mirror (SRC-10) and derived prisoner subset (SRC-43) |

**Build-time enforcement sketch** (`data/sources.yaml` + CI):

```yaml
- id: SRC-19
  name: "War of the Rebellion, Ser. I, Vol. 27, pts 1-3"
  tier: A
  license: "US Government work, 1889 (public domain)"
  rights_url: "https://archive.org/about/terms.php"
  retrieved: "2026-09-30"
  checksum_sha256: "<filled by build>"
  attribution: "Official Records, Ser. I, Vol. 27 (US War Department, 1889), via Internet Archive"
  may_index: true
  may_redistribute: true
```

CI rule: every passage/record in `build/*.jsonl` must carry `source_id`; build fails if `tier == C`, if `license` is missing, or if a `B` record lacks `attribution`. A generator renders `/sources.html` from this file (title, license, permalink/oldid, retrieval date).



---

## 4. Source catalog (46 sources)

Summary table (details follow; the JSON catalog has the same content).

| ID | Source | Tier | Priority | Effort |
|---|---|---|---|---|
| SRC-01 | NPS Data Store (IRMA): Gettysburg cultural landscape, history, and monument reports | A | P0 (landscape + monument pro | L |
| SRC-02 | NPS GIS packages for Gettysburg NMP (tracts/boundary, geology, vegetation map, land cover) | A | P2 | M |
| SRC-03 | NPS public national ArcGIS layers (roads, trails, buildings, parking, POIs) filtered to GETT | A | P3 | S |
| SRC-04 | NPS Data API (developer.nps.gov) | A | P2 | S |
| SRC-05 | NPS Gettysburg NMP 'History & Culture' web pages (orders of battle, commanders, civilians, places, monument pages) | A | P0 | M |
| SRC-06 | NPS Civil War Series: The Battle of Gettysburg (handbook text, hosted on npshistory.com) | A | P1 | S |
| SRC-07 | Gettysburg Seminar Papers (NPS/GNMP symposium essays, 1995-2018) | C until verified | P2 | S |
| SRC-08 | CWSAC battle summaries (Gettysburg = PA002) and CWSAC State Report Update (Pennsylvania) | A | P1 | S |
| SRC-09 | NPS Civil War Soldiers and Sailors System (CWSS) website | A | P0 (as link-out/verification | S |
| SRC-10 | CWSS bulk data snapshot (jrnold-nps-cwss public S3 bucket; 'received by request from NPS') | A-pending | P0 | L (roster ETL) + XL (battery |
| SRC-11 | American Civil War Battle Data (compiled datasets incl. NPS/CWSAC/CWSS/Dyer/Fox/Phisterer) | B | P1 | S |
| SRC-12 | NPS Museum collections and NPGallery (images/objects) | B | P3 | M |
| SRC-13 | NARA Catalog API v2 (finding aids, maps, records descriptions) | A | P3 | S |
| SRC-14 | NARA Compiled Military Service Records on Fold3 / Ancestry / Find a Grave / FamilySearch (commercial front-ends) | C | P2 (link-out) | S |
| SRC-15 | Library of Congress: loc.gov JSON API, Chronicling America, Maps, Prints & Photographs | A | P1 (maps P0) | L (newspapers) / M (maps dow |
| SRC-16 | Historic maps as data: Warren survey (1868-69) via Bachelder 1876, Bachelder isometric 1863, GBMA 1894, Adams County 1858 (georeferencing project) | A | P1 | XL |
| SRC-17 | HathiTrust (Bibliographic API open; Data API by key) | A/B item-level | P3 | S |
| SRC-18 | Internet Archive: Advanced Search, metadata, OCR text downloads, and full-text search (beta) | A | P0 | L |
| SRC-19 | War of the Rebellion (Official Records), Series I, Volume 27 (Gettysburg Campaign), Parts 1-3 | A | P0 | L |
| SRC-20 | Fox, Regimental Losses in the American Civil War 1861-1865 (1889) | A | P1 | L |
| SRC-21 | Dyer, A Compendium of the War of the Rebellion (1908) - unit histories | A | P1 | S |
| SRC-22 | State-at-Gettysburg and monument-dedication volumes (regimental narratives) + Vanderslice + GBMA history | A | P1 | L |
| SRC-23 | Civilian narratives and reporters (Pierce, Buehler, Hoke, Jacobs, Bates) + NPS 'Civilians at Gettysburg' | A | P0 | M |
| SRC-24 | July 1863 weather at Gettysburg (Prof. Michael Jacobs meteorological observations) | A | P0 | S |
| SRC-25 | Soldiers' National Cemetery reports (1864, revised 1865): burial lists with names, regiments, companies | A | P1 | L |
| SRC-26 | Medical: Medical and Surgical History of the War of the Rebellion; Camp Letterman information | A / C | P3 | L |
| SRC-27 | 1860 Census: Agriculture of the United States in 1860 (Kennedy, 1864) and Population volume; NHGIS alternative | A | P2 | S |
| SRC-28 | Civil War damage claims (Adams County) - PA State Archives claim volumes; ACHS Damage Claims Index; NPS narrative examples | C for ACHS index; A for  | P1 | L |
| SRC-29 | USGS 3DEP elevation (1 m DEM, lidar point cloud, 1/9 and 1/3 arc-second) via TNM Access API | A | P0 | L |
| SRC-30 | USGS Historical Topographic Maps: Gettysburg quadrangles (1908, 1942, 1944, 1951, 1990, 1994) | A | P2 | M |
| SRC-31 | Mapbox Terrain-DEM v1 (in-SDK elevation, no export) | B | P2 | S |
| SRC-32 | PASDA / Adams County GIS (parcels, lidar/imagery indexes) and historic aerials | B | P3 | M |
| SRC-33 | Smithsonian Open Access (NMAH/NPG etc.) - CC0 images and metadata | A | P2 | S |
| SRC-34 | Wikipedia (English) - battle articles, orders of battle, commander biographies | B | P1 | M |
| SRC-35 | Wikidata (CC0) - identifiers and enrichment | A | P2 | S |
| SRC-36 | Wikimedia Commons - Gettysburg photographs, maps, monuments/tablets | A/B per file | P1 | M |
| SRC-37 | Wikisource (transcribed texts: cyclopedias, SHSP items, court case) | A/B per page | P3 | S |
| SRC-38 | OpenStreetMap - monuments, memorials, tablets, cannon positions in the battlefield bbox | B | P0 | M |
| SRC-39 | Historical Marker Database (HMDB) | C for bulk ingestion unt | P2 | S (link-out) / M (with permi |
| SRC-40 | American Battlefield Trust (ABT) | C | P2 (link-out) | S |
| SRC-41 | Stone Sentinels (gettysburg.stonesentinels.com) and companion sites; Emerging Civil War; Gettysburg Compiler; Gettysburg Daily | C | P3 | S |
| SRC-42 | Gettysburg College Special Collections (GettDigital, Cupola), Adams County Historical Society (Gettysburg History), Gettysburg Foundation | C until permission | P2 | M (outreach) |
| SRC-43 | Prisoner-of-war and hospital records related to Gettysburg (Fort McHenry table in CWSS; Fort Delaware Society; NARA registers) | A-pending | P2 | M |
| SRC-44 | WarOfTheRebellion annotated corpus (University of Texas at Austin, MIT) | A/B | P2 | M |
| SRC-45 | Other GitHub / Kaggle / Zenodo / Civil War Data 150 searches (negative results) | n/a | - | S (re-check) |
| SRC-46 | Freesound and other audio (cannon/ambience) - media rights | A | P3 | S |


### SRC-01 - NPS Data Store (IRMA): Gettysburg cultural landscape, history, and monument reports

Publisher: National Park Service (Olmsted Center for Landscape Preservation, NER, GNMP). Category: government-documents.

- **URLs:**
  - canonical: https://irma.nps.gov/DataStore/
  - api_search: https://irmaservices.nps.gov/datastore/v7/rest/QuickSearch?q=<query>&top=25&skip=0
  - api_profile: https://irmaservices.nps.gov/datastore/v7/rest/Profile/<referenceId>
  - download_pattern: https://irma.nps.gov/DataStore/DownloadFile/<fileId>
  - rights_statement: https://www.nps.gov/aboutus/disclaimer.htm
- **Format:** PDF (born-digital 2004-2026 reports; scanned 1907/1970s items), JSON metadata API (unauthenticated, verified; v6 endpoint returned HTTP 500)
- **Size:** ~745 MB of PDFs for the 10 items with a measured byte size (sum of HTTP HEAD Content-Length values below; 2 more items unmeasured); extracted text expected 5-8 MB (estimate, measure in Phase 0)
- **API limits / access:** No key, no documented numeric limit observed; a 25-item QuickSearch loop with 19 queries hit gateway 504s once; throttle to <=1 req/s and cache.
- **License / rights statement:** US federal work: NPS 'Copyright and Public Domain' statement (disclaimer page): 'Copyright law does not protect any work of the U.S. Government'; material created by NPS 'generally considered in the public domain'; attribution 'appreciated'; BUT 'Not all materials ... are in the public domain. Some content is protected by third party rights' (photos, drawings, quoted text inside reports).
- **Rights statement URL:** https://www.nps.gov/aboutus/disclaimer.htm
- **Evidence quality of the rights reading:** fetch-summarizer quotes (page read via WebFetch); re-read before publishing wording
- **Rights tier:** A (text) / B (embedded third-party figures: link, do not copy images)
- **Extraction / normalization method:** pdftotext -layout for born-digital; OCR (ocrmypdf) for scanned 1907/1970s items; split by heading; build 'landscape_feature' records (feature_type=orchard|woodlot|fence|farm_lane|farmstead|road|field, name, 1863_status, current_status, treatment, page, quote) from the 'Landscape Characteristics' inventories; keep page numbers for citation; never republish figures/photos (third-party rights).
- **Record counts:** ~3,500 PDF pages across the 12 items (sum of the verified page counts, excluding the 1982/1973/1978 items); expected 800-1,500 landscape_feature records (estimate)
- **Historian questions it enables:**
  - Was the Peach Orchard an orchard in 1863 and what stood there?
  - Which woodlots/fences/farm lanes existed at Culp's Hill / Wheatfield / Emmitsburg Road?
  - What was restored 1999-2014 vs still missing?
  - Which monuments were placed where and when (1907 book)?
  - History of the park and cemetery (Unrau 1991)
- **Quality notes:** Authoritative but modern-author synthesis of 1863 conditions; each CLR states its own period of significance (Record of Treatment: 1863-1938). Treat as 'NPS landscape historians' interpretation', not 1863 primary.
- **Verified items:**
  - referenceId: 2186022; title: Gettysburg Landscape: Cultural Landscapes Inventory (2025 update); pages: 118; fileId: 733629; bytes: 6972170; note: smallest, best first target
  - referenceId: 2293618; title: CLR First Day - Union 1st Corps Battlefield (2021); pages: 580; fileId: 672770; bytes: 170160982
  - referenceId: 2288417; title: CLI First Day - Union 1st Corps Battlefield (2021); pages: 148; fileId: 719489
  - referenceId: 2242136; title: Little Round Top CLR, Treatment & Management Plan (2012); pages: 178; fileId: 580673; bytes: 63950146
  - referenceId: 2288635; title: Little Round Top CLI (2026 update); pages: 109; fileId: 761474; bytes: 68972693
  - referenceId: 2223481; title: Defense of Cemetery Hill CLR (2004); pages: 215; fileId: 526565; bytes: 30207496
  - referenceId: 2188403; title: The 1863 Landscape: Treatment Philosophy (2004); pages: 140; fileId: 472822; bytes: 33729297
  - referenceId: 2257218; title: CLR for GNMP, Record of Treatment Vol I & II (2018; period of significance 1863-1938); pages: 470 + 374; fileIds: 621486; 621487
  - referenceId: 2313784; title: Treatment Philosophy and Guidelines, Battlefield Commemorative Area (2025); pages: 198; fileId: 731087; bytes: 85725914
  - referenceId: 2248348; title: CLR for Gettysburg National Cemetery (2017); pages: 464; fileId: 593500; bytes: 270675783
  - referenceId: 2196766; title: Administrative History: GNMP and National Cemetery (Unrau, 1991); pages: 449; fileId: 472789; bytes: 13217713
  - referenceId: 2196751; title: The Gettysburg National Park: Location of the Monuments, Markers and Tablets (1907); pages: 58; fileId: 472768; bytes: 1220721
- **Items not publicly downloadable:**
  - referenceId: 2268160; title: Location of the Monuments, Markers, and Tablets (Feb 1982); observed: DownloadFile/632513 returned an HTML page (21,937 B) not a PDF on 2026-09-30
  - referenceId: 2268162; title: The Biology of an 1860 Farm (Slyder farm, 1973); observed: DownloadFile/632515 returned HTML (21,937 B)
  - referenceId: 2268163; title: Preliminary Survey/Proposal for Conservation of the Sculptural Monuments (1978); observed: DownloadFile/632516 not checked; sibling files returned HTML
- **Risks:** 170-270 MB PDFs: run OCR/extract in CI or locally; do not commit PDFs; Some Data Store items are not public (see items_not_publicly_downloadable)
- **Priority:** P0 (landscape + monument provenance)
- **Effort:** L

### SRC-02 - NPS GIS packages for Gettysburg NMP (tracts/boundary, geology, vegetation map, land cover)

Publisher: NPS Land Resources Division; NPS Geologic Resources Inventory; NPS Inventory & Monitoring. Category: gis.

- **URLs:**
  - tracts: https://irma.nps.gov/DataStore/DownloadFile/698026 (gett_tracts.zip, 560,645 B, ref 2302050, issued 2023-12-31)
  - geology: ref 1041800: gett_geology_gpkg.zip 3,927,125 B (fileId 663816); gett_geology_gdb.zip 2,250,029 B (670432); gett_geology_kml.zip (663857)
  - geology_quad: ref 1041801 Gettysburg 15' quadrangle (gtty_geology_*.zip)
  - vegetation_map: ref 2233298 gett_eisegisdata.zip 513,325 B (fileId 617323) and 519,894 B (610918), 2006, association-level vegetation map
  - vegetation_plots: ref 2314554: 12 CSV files (GETT_EISE_Plots.csv, AA_Species, Locations ...) 2022
  - landcover: ref 2167054 GETT_Landcover_Data.zip 2,307,878 B (NOAA C-CAP 1996/2001/2006)
- **Format:** Shapefile / File GDB / GeoPackage / KML / CSV
- **Size:** 0.5-4 MB each (all sizes verified by HTTP HEAD)
- **API limits / access:** None (same Data Store).
- **License / rights statement:** Same NPS public-domain statement as SRC-01.
- **Rights statement URL:** https://www.nps.gov/aboutus/disclaimer.htm
- **Evidence quality of the rights reading:** fetch-summarizer quotes
- **Rights tier:** A
- **Extraction / normalization method:** ogr2ogr to GeoJSON (EPSG:4326), simplify to 1 m; keep attribute tables; only use as MODERN context layers (not 1863).
- **Record counts:** tract polygons: not counted (measure); vegetation map polygons: not counted
- **Historian questions it enables:**
  - What geology underlies Devil's Den (diabase boulders)?
  - What forest cover is on Culp's Hill TODAY vs the 1863 woodlots?
  - Park boundary vs. tract history
- **Quality notes:** Modern conditions only. There is NO public NPS layer for monuments, fences, orchards, cannon or tablets (see SRC-03 and gap G-01).
- **Risks:** Do not present modern vegetation as 1863 vegetation
- **Priority:** P2
- **Effort:** M

### SRC-03 - NPS public national ArcGIS layers (roads, trails, buildings, parking, POIs) filtered to GETT

Publisher: NPS National Geospatial Program. Category: gis.

- **URLs:**
  - service_root: https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/
  - roads: https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_Roads/FeatureServer/0/query?where=UNITCODE%3D%27GETT%27&outFields=*&f=geojson
  - trails: .../NPS_Public_Trails/FeatureServer/0
  - buildings: .../NPS_Public_Buildings/FeatureServer/0
  - parking: .../NPS_Public_ParkingLots/FeatureServer/0
  - pois: .../NPS_Public_POIs/FeatureServer/0
  - hub: https://public-nps.opendata.arcgis.com/
- **Format:** ArcGIS FeatureServer (f=geojson supported); maxRecordCount 2000
- **Size:** tiny
- **API limits / access:** No key; standard ArcGIS Server; paging by resultOffset.
- **License / rights statement:** NPS public data; dataset descriptions say features are 'appropriate for public sharing'; see NPS disclaimer.
- **Rights statement URL:** https://www.nps.gov/aboutus/disclaimer.htm
- **Evidence quality of the rights reading:** service metadata read directly (JSON)
- **Rights tier:** A
- **Extraction / normalization method:** Query UNITCODE='GETT'; verified counts 2026-09-30: roads 55, trails 480, buildings 19, parking lots 26, POIs 7 (6 parking lots + 1 visitor center).
- **Record counts:** roads: 55; trails: 480; buildings: 19; parking_lots: 26; pois: 7
- **Historian questions it enables:**
  - Where can I park near Little Round Top?
  - Which modern avenues correspond to 1863 roads (only with SRC-15 georeferenced maps)
- **Quality notes:** MODERN park infrastructure only. The national POI layer has just 7 GETT points and no monuments. The NPS does not publish GNMP monument/fence/orchard/cannon/tablet GIS in these public services.
- **Risks:** Do not imply these are 1863 features
- **Priority:** P3
- **Effort:** S

### SRC-04 - NPS Data API (developer.nps.gov)

Publisher: NPS Digital Services. Category: api.

- **URLs:**
  - base: https://developer.nps.gov/api/v1/
  - docs: https://www.nps.gov/subjects/developer/index.htm
  - guides_rate_limits: https://www.nps.gov/subjects/developer/guides.htm
  - get_started: https://www.nps.gov/subjects/developer/get-started.htm
  - data_api_overview: https://www.nps.gov/subjects/digital/nps-data-api.htm
- **Format:** JSON over HTTPS; API key in header or query
- **Size:** small
- **API limits / access:** Free 40-character API key; default 1,000 requests per hour per key (rolling hour; exceeding -> HTTP 429 and block until the hour lapses); X-RateLimit-Limit / X-RateLimit-Remaining response headers (verified from the Guides page). Unauthenticated call returned 403.
- **License / rights statement:** Content is NPS-authored (see disclaimer statement); the guide points to the Disclaimer page for reuse; no separate API license text found.
- **Rights statement URL:** https://www.nps.gov/aboutus/disclaimer.htm
- **Evidence quality of the rights reading:** fetch-summarizer; rate limit also matches independent search snippet
- **Rights tier:** A
- **Extraction / normalization method:** One-time build script: /parks?parkCode=gett, /places, /people, /articles, /lessonplans, /multimedia filtered by parkCode=gett; store as normalized JSON with NPS URL + retrieved date. DO NOT put the key in the client bundle (build-time only, key in Netlify env var).
- **Record counts:** not counted (needs a key; I did not register one)
- **Historian questions it enables:**
  - NPS-authored short articles/lesson plans about people and places for grounding answers
- **Quality notes:** Endpoint list per NPS 'Data API' page: alerts, articles, people, places, campgrounds, events, lesson plans, news releases, parks, visitor centers. Exact GETT record counts UNVERIFIED (no key used).
- **Risks:** Registering a key is an account action for the site owner, not done here
- **Priority:** P2
- **Effort:** S

### SRC-05 - NPS Gettysburg NMP 'History & Culture' web pages (orders of battle, commanders, civilians, places, monument pages)

Publisher: Gettysburg National Military Park, NPS. Category: government-web.

- **URLs:**
  - index: https://www.nps.gov/gett/learn/historyculture/index.htm
  - aop_oob: https://www.nps.gov/gett/learn/historyculture/aop-orderofbattle.htm (last updated Jan 8, 2026)
  - anv_oob: https://www.nps.gov/gett/learn/historyculture/anv-orderofbattle.htm
  - civilians: https://www.nps.gov/articles/000/civilians-at-gettysburg.htm
  - federals: https://www.nps.gov/articles/000/federals-gettysburg.htm
  - confederates: https://www.nps.gov/articles/000/confederates-gettysburg.htm
  - us_monuments: https://www.nps.gov/gett/learn/historyculture/united-states-monuments.htm
  - confederate_monuments: https://www.nps.gov/gett/learn/historyculture/confederate-monuments.htm
  - places: https://www.nps.gov/gett/learn/historyculture/places.htm (6 articles: First Day's Battlefield, US Line, Confederate Line, East Cavalry Field, Town, National Cemetery)
  - collections: https://www.nps.gov/gett/learn/historyculture/collections.htm (approx. 1.2 million objects)
  - research_center: https://www.nps.gov/gett/learn/historyculture/research-center.htm
  - library_guide: https://www.nps.gov/gett/learn/historyculture/library-resource-guide.htm
- **Format:** HTML
- **Size:** AoP page ~81 KB, ANV page ~86 KB
- **API limits / access:** Polite crawling only (not an API); ~15 pages total.
- **License / rights statement:** NPS statement (see SRC-01): NPS-created material generally public domain; embedded photos often credited to LoC or third parties.
- **Rights statement URL:** https://www.nps.gov/aboutus/disclaimer.htm
- **Evidence quality of the rights reading:** pages fetched and parsed; rights via summarizer
- **Rights tier:** A (text) / B (images)
- **Extraction / normalization method:** Regex parse of OOB lines 'Unit- Col. Name (w), Capt. Name (k|c|w/c|MOH)' -> {corps, division, brigade, unit_string, commanders[{name, rank, status_flags}]}; roughly 352 (AoP) and 265 (ANV) unit-like lines by regex (estimate, includes batteries and headquarters lines). Use as an INDEPENDENT cross-check of the site's 467-unit OOB and commander-fate fields.
- **Record counts:** ~617 unit-like lines (regex estimate); 6 place articles; 4 people/commander articles; 12 Confederate monument pages (11 state monuments + Soldiers and Sailors Monument) + 5 US monument pages (Delaware, Indiana, Kentucky, Pennsylvania, Lincoln Speech Memorial)
- **Historian questions it enables:**
  - Who commanded the Iron Brigade and who replaced him when wounded?
  - Which brigade was the 20th Maine in?
  - Civilian stories: John Burns etc.
- **Quality notes:** No strengths/casualties; commander succession flags only. The site's own OOB metadata cites Busey & Martin (copyrighted); this NPS page gives a PD-safe second source for commanders.
- **Depends on:** SRC-10
- **Risks:** HTML structure can change: pin retrieval date + hash
- **Priority:** P0
- **Effort:** M

### SRC-06 - NPS Civil War Series: The Battle of Gettysburg (handbook text, hosted on npshistory.com)

Publisher: National Park Service (handbook); hosted by npshistory.com (unofficial NPS history archive). Category: government-documents.

- **URLs:**
  - section_page: https://npshistory.com/publications/civil_war_series/16/sec20.htm
- **Format:** HTML sections (20+)
- **Size:** small
- **API limits / access:** None (static).
- **License / rights statement:** NPS-authored handbook (federal work); the mirrored page carries no rights statement; treat as public domain but cite NPS as author and npshistory.com as host.
- **Rights statement URL:** https://www.nps.gov/aboutus/disclaimer.htm
- **Evidence quality of the rights reading:** page fetched via WebFetch
- **Rights tier:** A
- **Extraction / normalization method:** Scrape 20+ section pages, keep section titles as topics; contains the damage-claims narrative (e.g., Catherine Trostle farm: '27 acres wheat destroyed, worth $600.00', '32 acres Grass' $650, '20 tons of Hay' $300).
- **Record counts:** 20+ sections
- **Historian questions it enables:**
  - Farm-level wartime damage facts (wheat acreage lost) for Wheatfield-type questions
  - Battle narrative by location
- **Quality notes:** Older NPS handbook; narrative is dated versus Pfanz/Hessler. Use for damage-claim anecdotes and orientation, not for tactical timing.
- **Risks:** npshistory.com is a mirror; prefer nps.gov URL if the same text exists
- **Priority:** P1
- **Effort:** S

### SRC-07 - Gettysburg Seminar Papers (NPS/GNMP symposium essays, 1995-2018)

Publisher: Gettysburg National Military Park (hosted at npshistory.com). Category: scholarship.

- **URLs:**
  - index: https://npshistory.com/series/symposia/gettysburg_seminars/index.htm
  - example_pdf: https://npshistory.com/series/symposia/gettysburg_seminars/13/essay5.pdf (1,643,678 B)
- **Format:** PDF per essay
- **Size:** ~1-3 MB each
- **API limits / access:** None.
- **License / rights statement:** Index page states no reuse terms; essays are by outside scholars so copyright status is UNVERIFIED -> treat as link-out/quote-with-citation only.
- **Evidence quality of the rights reading:** index fetched (published vols 4-13, 15, 16; vols 1-3 and 14 'no papers published')
- **Rights tier:** C until verified
- **Extraction / normalization method:** Link-out registry with title/author/volume; short fair-use quotes only.
- **Record counts:** 12 published volumes
- **Historian questions it enables:**
  - Where can I read scholarly debate on X (Sickles at the Peach Orchard, Culp's Hill, Pickett's Charge timing)?
- **Quality notes:** Peer-quality essays; excellent for 'further reading' and for validating timings.
- **Risks:** Do not ingest full text until rights are confirmed with GNMP
- **Priority:** P2
- **Effort:** S

### SRC-08 - CWSAC battle summaries (Gettysburg = PA002) and CWSAC State Report Update (Pennsylvania)

Publisher: NPS American Battlefield Protection Program. Category: government-web.

- **URLs:**
  - battle_record: https://www.nps.gov/civilwar/search-battles-detail.htm?battleCode=PA002
  - battle_search: https://www.nps.gov/civilwar/search-battles.htm
  - battle_units_search: https://www.nps.gov/civilwar/search-battle-units.htm
  - cws2_pa_update_pdf: https://npshistory.com/publications/battlefield/cwsac/updates/pa.pdf (4,261,280 B)
- **Format:** HTML fields (Other Name, Campaign, Date(s), Principal Commanders, Forces Engaged, Estimated Casualties, Description, Results, Preservation Priority) + PDF
- **Size:** small
- **API limits / access:** None (HTML).
- **License / rights statement:** NPS federal work (see SRC-01).
- **Rights statement URL:** https://www.nps.gov/aboutus/disclaimer.htm
- **Evidence quality of the rights reading:** fetched
- **Rights tier:** A
- **Extraction / normalization method:** PA002 values read: forces 158,343 total (US 83,289 / CS 75,054); estimated casualties 51,000 (US 23,000 / CS 28,000); result Union victory; Reference PA002; preservation I.2; significance A; study area 43,522.59 ac, core 8,585.47 ac, potential NR boundary 33,993.87 ac (from the CC BY dataset SRC-11). CWSAC identified 384 battles (SRC-11 cwsac_battles.csv 384 rows).
- **Record counts:** 384 CWSAC battles; 1 Gettysburg record
- **Historian questions it enables:**
  - Official NPS force/casualty estimates and preservation status
  - How does Gettysburg rank among the 384 principal battles?
- **Quality notes:** NPS round-number casualty estimates (23,000/28,000) differ from ABT-published figures (23,049/28,063): Historian must show ranges + source attribution, not one silent number.
- **Priority:** P1
- **Effort:** S

### SRC-09 - NPS Civil War Soldiers and Sailors System (CWSS) website

Publisher: National Park Service. Category: genealogy.

- **URLs:**
  - overview: https://www.nps.gov/civilwar/soldiers-and-sailors-database.htm
  - records_origin: https://home.nps.gov/civilwar/soldiers-and-sailors-recordsorigin.htm
  - search_soldiers: https://www.nps.gov/civilwar/search-soldiers.htm
  - search_battle_units: https://www.nps.gov/civilwar/search-battle-units.htm
  - search_monuments: https://www.nps.gov/civilwar/search-monuments.htm
  - search_cemeteries: https://www.nps.gov/civilwar/search-cemeteries.htm
  - search_prisoners: https://www.nps.gov/civilwar/search-prisoners.htm
- **Format:** HTML search forms; NO public API or bulk download on nps.gov
- **Size:** n/a
- **API limits / access:** No API. Do not scrape the search forms (unpublished limits; use SRC-10 for bulk).
- **License / rights statement:** Page says: 'This database is no longer maintained and updated.' (verbatim, fetched 2026-09-30). No rights statement on the page; NPS-general statement applies. Records origin: ~6.3 million General Index Cards from NARA Compiled Military Service Records (cards created from the 1880s), ~3.5 million soldiers; digitized 1993-2000 by volunteers in 36+ states using LDS software, edited by Genealogical Society of Utah / Family Groups Society; 18,000 sailors; regiment histories from Dyer; Andersonville & Fort McHenry prisoners; Medals of Honor.
- **Rights statement URL:** https://home.nps.gov/civilwar/soldiers-and-sailors-recordsorigin.htm
- **Evidence quality of the rights reading:** fetch-summarizer
- **Rights tier:** A (federal) with a documentation caveat on the volunteer-compiled index
- **Extraction / normalization method:** Use only as the verification/link-out target: deep link https://www.nps.gov/civilwar/search-soldiers.htm (no documented name-prefill URL parameters: UNVERIFIED).
- **Record counts:** 6M+ soldier records, 18,000 sailors, 4,000+ regiment histories (NPS overview page)
- **Historian questions it enables:**
  - Ancestor lookup verification link
  - Regiment history text (via SRC-10)
- **Quality notes:** Index cards, not proof of presence at Gettysburg; Confederate muster rolls obtained 'with the permission and assistance of the Governors of the eleven states' (NPS wording) -> completeness varies by state.
- **Risks:** Site is unmaintained: it may vanish; keep own extract (SRC-10)
- **Priority:** P0 (as link-out/verification)
- **Effort:** S

### SRC-10 - CWSS bulk data snapshot (jrnold-nps-cwss public S3 bucket; 'received by request from NPS')

Publisher: Jeffrey Arnold (mirror) of NPS data; README: 'Data ... received by request from the National Park Service'. Category: genealogy.

- **URLs:**
  - readme: https://raw.githubusercontent.com/jrnold/cwss/master/README.md (repo archived 2026-08-29, no license file, GitHub API license=None)
  - bucket_listing: https://jrnold-nps-cwss.s3.amazonaws.com/?list-type=2 (39 keys, listing is public)
  - soldiers_tsv: https://jrnold-nps-cwss.s3.amazonaws.com/new/tsv/Soldiers_Personz.tsv (1,194,562,274 B)
  - regiments_tsv: https://jrnold-nps-cwss.s3.amazonaws.com/new/tsv/Regiments_Unitz.tsv (9,308,412 B)
  - notes_tsv: https://jrnold-nps-cwss.s3.amazonaws.com/new/tsv/Soldiers_notez.tsv (342,195,545 B)
  - fortmchenry_tsv: https://jrnold-nps-cwss.s3.amazonaws.com/new/tsv/Prisoners_FtMcHenry.tsv (850,570 B)
  - sqlite: https://jrnold-nps-cwss.s3.amazonaws.com/new/nps_cwss.sqlite3 (2,197,368,832 B)
- **Format:** Tab-separated (UTF-8-ish, CR/LF inside HTML fields), SQLite, MSSQL .bak; total ~7.7 GB per README; snapshot dates 2012-10-31 (.bak) / 2015-12-13 (tsv)
- **Size:** Soldiers_Personz 1.19 GB; Soldiers_notez 342 MB; focus 173 MB; MEMORIAL 28.9 MB; Regiments_Unitz 9.3 MB; Prisoners_Andersonville 8.6 MB; Cemeteries_Info 0.83 MB; Prisoners_FtMcHenry 0.85 MB; Medal_Ofhonor 0.35 MB
- **API limits / access:** S3 anonymous GET; no published limits. Use HTTP Range to sample; stream-filter the 1.19 GB file once in CI (est. 5-15 min) rather than downloading interactively.
- **License / rights statement:** No license file in the mirror repo (GitHub license=None). Upstream: NPS (federal) index of NARA cards (public records); NPS 'records origin' credits volunteers + GSU. Status of the compiled database as 'public domain' is NOT stated on the NPS page -> Phase-0 task: obtain written confirmation from NPS (aboutus/contactus) before publishing derived shards; until then treat as Tier A-pending.
- **Rights statement URL:** https://github.com/jrnold/cwss
- **Evidence quality of the rights reading:** README and bucket listing read directly; row samples fetched by HTTP Range
- **Rights tier:** A-pending (legal confirmation)
- **Extraction / normalization method:** 1) Build crosswalk site regiment_id -> CWSS unit code: U-20ME -> UME0020RI (side U/C + 2-letter state, 4-digit ordinal, arm code RI/RC/RAH/YAL...). 2) Stream Soldiers_Personz.tsv, keep rows where PER_UNIT_CODE in the ~467-unit crosswalk and PER_ISDELETE='False'. 3) Normalize: trim, title-case, split 'PER_AKA_NAME_ORIG' ('Asa P./Lacy') into alias list, rank codes via Rankz.tsv, company letters. 4) Emit per-regiment JSON shards (compact arrays) + a surname-prefix index. 5) Attach REG_HISTORY/REG_LONGHISTORY from Regiments_Unitz.tsv (Dyer text with HTML links to old NPS battle URLs: strip tags, keep text).
- **Record counts:** Soldiers_Personz ~6.26M rows (estimate = 1,194,562,274 B / 190.75 B per row measured on a 400 KB sample; matches NPS '6.3 million' cards). Sample of 2,097 rows: 1,213 Union / 884 Confederate (42%). Gettysburg-unit subset ESTIMATED 420k-700k cards (assumes 900-1,500 cards per unit x 467 units; MEASURE in Phase 0). Cemeteries_Info: 5,672 rows, covers Poplar Grove (Petersburg) burial places, NO Gettysburg rows (0 of 5,672 mention Gettysburg).
- **Historian questions it enables:**
  - Who was in the 20th Maine / Company K? (name roster)
  - REAL ancestor lookup by the ancestor's own surname + state (today's find-ancestor.html only filters by state or commander surname)
  - How many men named X served in the 1st Minnesota?
  - Regiment history paragraph (Dyer) for each Union and Confederate unit
  - Confederate POW notes captured at Gettysburg (Fort McHenry table has notes like 'Gettysburg 07/03/63')
- **Quality notes:** Index cards record service anywhere 1861-65, NOT presence at Gettysburg; duplicates and spelling variants inflate counts; Confederate coverage uneven by state. Soldiers_Personz first rows are admin test records (PER_LAST_NAME 'admin1'); filter. State totals file shows e.g. AL 2,842 Union / 197,427 Confederate cards. MEMORIAL.tsv (28.9 MB) rows such as 'Isaac Bibb', unit code UUS0028RI00C, plaque B-43 appear to be memorial-plaque names for U.S. Colored Troops (my interpretation of sampled rows, UNVERIFIED) and are not needed for Gettysburg.
- **Site evidence:** file: C:/Users/mlege/AppData/Local/Temp/claude/site/deploy/find-ancestor.html; line: 48; snippet: Search by state, or by a commander's surname, to narrow down which of the 467 Union and Confederate regiments and batteries at Gettysburg your ancestor may have served in.
- **Depends on:** SRC-05 for the crosswalk
- **Risks:** Third-party mirror may disappear: archive needed slices in the owner's own storage; Rights confirmation pending; Do not ship 1.2 GB; only regiment shards (~6-12 MB brotli estimate)
- **Priority:** P0
- **Effort:** L (roster ETL) + XL (battery/independent unit crosswalk)

### SRC-11 - American Civil War Battle Data (compiled datasets incl. NPS/CWSAC/CWSS/Dyer/Fox/Phisterer)

Publisher: Jeffrey B. Arnold (figshare 10.6084/m9.figshare.1515995 v14). Category: structured-dataset.

- **URLs:**
  - figshare_api: https://api.figshare.com/v2/articles/1515995 (acw_battle_data.zip 2,526,832 B, published 2018-03-19)
  - github: https://github.com/jrnold/acw_battle_data (build/acw_battle_data/*.csv)
  - docs: https://acw-battle-data.readthedocs.io/en/latest/data.html (87 datasets)
- **Format:** CSV + datapackage.json
- **Size:** 2.5 MB zip
- **API limits / access:** GitHub raw / figshare; none.
- **License / rights statement:** figshare API: license 'CC BY 4.0'; README: documentation CC-BY 4.0, code BSD-3-Clause. CAUTION: the CC BY grant is the compiler's; upstream sources vary (NPS/Dyer/Fox/Phisterer/Livermore/Bodart are public domain; Clodfelter/Kennedy/Thorpe slices may carry upstream copyright) -> use only the NPS/CWSAC/Dyer/Fox/Phisterer/Livermore/Bodart tables.
- **Rights statement URL:** https://api.figshare.com/v2/articles/1515995
- **Evidence quality of the rights reading:** figshare JSON + README read directly
- **Rights tier:** B (CC BY 4.0 attribution) for the safe slices
- **Extraction / normalization method:** Join nps_battle_units.csv (17,993 rows; unit_code == CWSS code) to nps_units.csv (7,011 units: 3,246 US + 3,765 CS; 1,163 with dbpedia_uri) -> Wikipedia/DBpedia link per unit. For PA002: 300 Union units (all src=DYER; ZERO Confederate units because Dyer's Compendium is Union-only).
- **Record counts:** nps_battles 381; cwsac_battles 384; dyer_engagements 9,972; fox_forces 408; phisterer_engagements 2,259; thorpe_engagements 4,342; PA002 units 300 (US only)
- **Historian questions it enables:**
  - Crosswalk key for units (CWSS code) incl. DBpedia link for 1,163 units
  - Which Union units did Dyer credit with Gettysburg? (300) vs the site's ~280 Union units - a reconciliation test
  - Battle-level comparisons (how many battles had >50,000 casualties)
- **Quality notes:** Gettysburg Confederate participation must come from NPS ANV OOB / OR / Busey, not from Dyer. Note Dyer's list is 300 units while the site holds ~279 'U-' IDs in regiment files - reconcile.
- **Risks:** CC BY attribution required on /sources page
- **Priority:** P1
- **Effort:** S

### SRC-12 - NPS Museum collections and NPGallery (images/objects)

Publisher: NPS Museum Management Program / NPGallery. Category: images.

- **URLs:**
  - museum: https://museum.nps.gov/
  - npgallery: https://npgallery.nps.gov/
  - gnmp_collections: https://www.nps.gov/gett/learn/historyculture/collections.htm
- **Format:** Web search UIs (no bulk export verified)
- **Size:** GNMP collection approx. 1.2 million objects (NPS statement)
- **API limits / access:** Unknown; no documented API verified.
- **License / rights statement:** NPS photos generally public domain with third-party exceptions (NPS statement, SRC-01); donor/copyright exceptions per item.
- **Rights statement URL:** https://www.nps.gov/aboutus/disclaimer.htm
- **Evidence quality of the rights reading:** fetch
- **Rights tier:** B (item-level check)
- **Extraction / normalization method:** Manual curation of ~50-100 images (Cyclorama, hospital bed tags, maps) with per-item credit; no scraping.
- **Record counts:** n/a
- **Historian questions it enables:**
  - Illustrating answers with NPS object photos
- **Quality notes:** Search endpoints not stable/documented.
- **Risks:** Item rights
- **Priority:** P3
- **Effort:** M

### SRC-13 - NARA Catalog API v2 (finding aids, maps, records descriptions)

Publisher: US National Archives and Records Administration. Category: api.

- **URLs:**
  - base: https://catalog.archives.gov/api/v2/api-docs/
  - readme: https://raw.githubusercontent.com/usnationalarchives/Catalog-API/master/README.md
  - civil_war_resources: https://www.archives.gov/research/military/civil-war/resources
  - blog_maps: https://unwritten-record.blogs.archives.gov/2018/07/03/mapping-the-battle-of-gettysburg/
- **Format:** JSON REST
- **Size:** n/a
- **API limits / access:** Key by email (Catalog_API@nara.gov); 10,000 queries per month per key, then blocked until the 1st of next month (README, read directly).
- **License / rights statement:** README: 'NARA's archival metadata is all assumed to be in the public domain, as a work of the federal government, with only rare exceptions'; digital images generally public domain; check each record's 'Use Restrictions'.
- **Rights statement URL:** https://github.com/usnationalarchives/Catalog-API
- **Evidence quality of the rights reading:** README read directly (raw)
- **Rights tier:** A
- **Extraction / normalization method:** Use for finding NARA-held Warren survey maps and CMSR series descriptions; CMSR microfilm M594 (Union, 225 rolls) and M861 (Confederate, 74 rolls, 'typically less complete') per NARA page.
- **Record counts:** not queried (no key)
- **Historian questions it enables:**
  - Pointers to primary maps and record series for citations
- **Quality notes:** Does not give soldier-level data.
- **Risks:** Key request is an account action for the owner
- **Priority:** P3
- **Effort:** S

### SRC-14 - NARA Compiled Military Service Records on Fold3 / Ancestry / Find a Grave / FamilySearch (commercial front-ends)

Publisher: Ancestry.com family (Fold3, Find a Grave, Newspapers.com), FamilySearch. Category: genealogy-commercial.

- **URLs:**
  - ancestry_terms: https://www.ancestry.com/c/legal/termsandconditions
  - fold3: https://www.fold3.com/go/about
  - findagrave_gnc: https://www.findagrave.com/cemetery/1584934/gettysburg-national-cemetery
  - findagrave_robots: https://www.findagrave.com/robots.txt
  - familysearch_terms: https://www.familysearch.org/en/legal/terms
- **Format:** Web only
- **Size:** Find a Grave: Gettysburg National Cemetery page shows 7,131 memorials (2026-09-30)
- **API limits / access:** No public APIs for this use.
- **License / rights statement:** Ancestry T&Cs (cover Ancestry, Newspapers.com, Find a Grave, Fold3): users agree 'Not to access, acquire, copy, or monitor any portion of the Services by any manual, automated, or programmatic method that exceeds the intended standard human use of the Services; or to use any data or content from the Services to train, develop, or fine-tune any machine learning model, algorithm, or artificial intelligence system' (read directly from the terms page text). FamilySearch terms: no 'bulk download, ... scrape content, or otherwise harvest any information'; personal non-commercial use; 'may not post content from this site on another website ... without our permission' (fetch-summarizer). Find a Grave robots.txt disallows /memorial/search and /cemetery/*/memorial-search.
- **Rights statement URL:** https://www.ancestry.com/c/legal/termsandconditions
- **Evidence quality of the rights reading:** Ancestry: primary text read; FamilySearch: summarizer; robots: read directly
- **Rights tier:** C (link-out only; NEVER ingest, scrape, or feed to any model)
- **Extraction / normalization method:** Provide per-soldier 'Look up on Find a Grave / Fold3 / FamilySearch / NPS CWSS' outbound links built from name+state search URLs; no fetching.
- **Record counts:** n/a
- **Historian questions it enables:**
  - Ancestor next steps (service file images, burial photos) via user-initiated links
- **Quality notes:** Fold3/Ancestry images are of PD NARA records but the hosting service's terms still bind automated access.
- **Depends on:** SRC-10
- **Risks:** Any automated access violates terms; also blocks future LLM training on this content
- **Priority:** P2 (link-out)
- **Effort:** S

### SRC-15 - Library of Congress: loc.gov JSON API, Chronicling America, Maps, Prints & Photographs

Publisher: Library of Congress. Category: api+collections.

- **URLs:**
  - api_docs: https://www.loc.gov/apis/json-and-yaml/
  - limits: https://www.loc.gov/apis/json-and-yaml/working-within-limits/
  - chronicling_america_status: https://www.loc.gov/apis/additional-apis/chronicling-america-api/
  - ca_bulk_ocr: https://chroniclingamerica.loc.gov/data/ocr/
  - legal: https://www.loc.gov/legal/
  - maps_items: https://www.loc.gov/item/lva0000067/ (Bachelder 1876, 3 maps, from 200 ft/inch survey under Warren); https://www.loc.gov/item/2007630423/ (Bachelder isometric 1863); https://www.loc.gov/item/99447503/ (GBMA map 1894, ca. 1:12,000); https://www.loc.gov/item/99447498/ (Gettysburg battlefield 1863); https://www.loc.gov/item/2004629148/ and /2004629149/ (Map of Adams Co., Pennsylvania, 1858)
  - search_examples: https://www.loc.gov/collections/chronicling-america/?q=gettysburg&dates=1863-07-03/1863-07-10&fo=json&c=5; https://www.loc.gov/collections/civil-war-maps/?q=Gettysburg&fo=json; https://www.loc.gov/collections/civil-war-glass-negatives/?q=Gettysburg&fo=json
- **Format:** JSON (?fo=json), IIIF images, OCR text via tile.loc.gov text-services
- **Size:** OCR page text ~ tens of KB each
- **API limits / access:** No key. loc.gov JSON/YAML API: 20 requests/minute (1-hour block); Text Services 150/min; Image Services 150/min; Streaming 60/min; MARCXML 30/min (72-hour block that resets if you keep calling); max 1,000 items/page; deep paging limit 100,000 (page read via WebFetch). Web resource pages return 403 to non-browser clients: use ?fo=json.
- **License / rights statement:** Chronicling America item rights field (read directly): 'The Library of Congress believes that the newspapers in Chronicling America are in the public domain or have no known copyright restrictions.' Geography & Map items (read directly): 'free to use and reuse unless a Rights Advisory statement is present ... Credit Line: Library of Congress, Geography and Map Division.' Prints & Photographs items: 'The Library of Congress does not own rights to material in its collections. Therefore, it does not license or charge permission fees ...' (researcher must assess).
- **Rights statement URL:** https://www.loc.gov/legal/
- **Evidence quality of the rights reading:** item JSON rights fields read directly; legal page via summarizer
- **Rights tier:** A (US public-domain items) - check Rights Advisory per item
- **Extraction / normalization method:** Chronicling America: query 'gettysburg' 1863-07-03..1863-07-31 (verified: 437 page hits for Jul 3-10; 1,560 for Jul 1-31; top titles NY Daily Tribune 28, NY Herald 26, Worcester Daily Spy 17, Chicago Daily Tribune 15), fetch OCR through the result's fulltext_file, chunk to passages, tag 'newspaper' + date + paper; ~1,600 pages x ~10-25 KB OCR = est. 16-40 MB raw. Maps: download IIIF/JPEG for Bachelder 1876 / GBMA 1894 / Adams 1858 and georeference (SRC-16). Rate: <=15 req/min in the build script, cache everything.
- **Record counts:** Chronicling America 'gettysburg' pages: 437 (Jul 3-10 1863), 1,560 (Jul 1-31 1863); Civil War Maps collection: 130 Gettysburg hits; Civil War glass negatives: 185 Gettysburg hits; photos search 'Gettysburg 1863 Gardner O'Sullivan' 9 hits
- **Historian questions it enables:**
  - What did Northern/Southern papers report on July 4-10, 1863?
  - What did the field look like (photographs) in July 1863?
  - Farm/owner names on the 1858 Adams County map (LoC 2004629148/9)
  - Which maps show fences/woods (Warren survey)?
- **Quality notes:** Newspaper OCR is noisy (example page OCR: 'V ill I 6 THE RUTLAND WEEKLY HKItAM ...'); wartime reports were often wrong or contradictory - present as 'what the press reported', never as fact. Old chroniclingamerica.loc.gov API retired 2025; use loc.gov API only.
- **Risks:** 429 blocks last 1 hour: implement back-off; Bulk OCR tarballs are 175-770 MB per batch (not needed)
- **Priority:** P1 (maps P0)
- **Effort:** L (newspapers) / M (maps download)

### SRC-16 - Historic maps as data: Warren survey (1868-69) via Bachelder 1876, Bachelder isometric 1863, GBMA 1894, Adams County 1858 (georeferencing project)

Publisher: LoC Geography & Map Division (public domain scans); NARA RG 77 originals. Category: historic-maps.

- **URLs:**
  - bachelder_1876: https://www.loc.gov/item/lva0000067/
  - bachelder_isometric_1863: https://www.loc.gov/item/2007630423/
  - gbma_1894: https://www.loc.gov/item/99447503/
  - adams_1858: https://www.loc.gov/item/2004629148/
  - nara_blog: https://unwritten-record.blogs.archives.gov/2018/07/03/mapping-the-battle-of-gettysburg/
- **Format:** IIIF/JPEG/GIF scans; produce GeoJSON + optional XYZ raster tiles
- **Size:** each scan tens of MB at full res
- **API limits / access:** See SRC-15.
- **License / rights statement:** Free to use and reuse unless Rights Advisory (see SRC-15 rights quote); credit 'Library of Congress, Geography and Map Division'.
- **Rights statement URL:** https://www.loc.gov/legal/
- **Evidence quality of the rights reading:** rights fields read directly
- **Rights tier:** A
- **Extraction / normalization method:** Georeference with 8-15 ground control points per sheet (Allmaps or QGIS), then hand-trace: roads, farm lanes, woodlots, orchards, fence lines, building footprints with owner names; tag each feature with map, year, and 'year gap vs 1863' (the Warren survey is dated 1868-69 in search results, i.e. five years after the battle - the LoC record text I read says only that the survey was 'ordered by Brevet Major General A. A. Humphreys ... and conducted under' Warren, so confirm the year on the LoC page; the isometric drawing is dated 1863).
- **Record counts:** est. 300-600 traced features for the core battlefield (estimate)
- **Historian questions it enables:**
  - Was there a fence along the Emmitsburg Road at X?
  - Which farm stood where, and whose was it?
  - What did woods vs. open ground look like on the Warren map?
- **Quality notes:** Warren/Bachelder woods reflect 1868-76 not July 1863; reconcile with NPS CLR '1863 Landscape' (SRC-01). Cite both.
- **Depends on:** SRC-01; SRC-15
- **Risks:** Interpretation risk: keep 'traced from map, not surveyed' provenance on every feature
- **Priority:** P1
- **Effort:** XL

### SRC-17 - HathiTrust (Bibliographic API open; Data API by key)

Publisher: HathiTrust. Category: api.

- **URLs:**
  - bib_api_example: https://catalog.hathitrust.org/api/volumes/brief/oclc/424023.json
  - key_request: https://babel.hathitrust.org/cgi/kgs/request
- **Format:** JSON / XML
- **Size:** n/a
- **API limits / access:** Bibliographic API: none published (verified working, unauthenticated). Data API: 2-legged OAuth key; per search snippets ~10,000-volume practical cap and Google-digitized PD volumes only from approved IPs; hathitrust.org docs and babel.hathitrust.org return 403 to non-browser clients so details are UNVERIFIED.
- **License / rights statement:** Item-level (rightsCode e.g. 'ic', 'pd'); PD volumes downloadable per HathiTrust policy.
- **Evidence quality of the rights reading:** bib API JSON read; Data API details from search snippets only
- **Rights tier:** A/B item-level
- **Extraction / normalization method:** Use only to resolve bibliographic records for citations; use Internet Archive (SRC-18) for OCR text (no key needed).
- **Record counts:** n/a
- **Historian questions it enables:**
  - Stable catalog links for cited books
- **Quality notes:** Redundant with IA for our PD corpus.
- **Priority:** P3
- **Effort:** S

### SRC-18 - Internet Archive: Advanced Search, metadata, OCR text downloads, and full-text search (beta)

Publisher: Internet Archive. Category: api+texts.

- **URLs:**
  - advancedsearch: https://archive.org/advancedsearch.php?q=<query>&fl[]=identifier&rows=50&output=json
  - metadata: https://archive.org/metadata/<identifier>
  - ocr_text: https://archive.org/download/<identifier>/<identifier>_djvu.txt
  - fts_beta: https://archive.org/services/search/beta/page_production/?service_backend=fts&user_query=<q>&hits_per_page=20&page=1 (undocumented; worked unauthenticated on 2026-09-30)
- **Format:** JSON, plain-text OCR (_djvu.txt), hOCR/DjVu XML, PDF
- **Size:** see items (OCR text 0.05-4 MB each)
- **API limits / access:** No published numeric limits; be polite (<=1 request/s, cache, identify the client in the User-Agent). FTS beta endpoint is not a supported contract: wrap behind a build script, never call from the browser.
- **License / rights statement:** Item-level; pre-1929 US-published works are in the US public domain; IA items may carry licenseurl/possible-copyright-status metadata (e.g., newyorkatgettysb00foxw 'NOT_IN_COPYRIGHT'; Dyer Google-Books scan bub_gb_OBkNAQAAMAAJ carries licenseurl publicdomain/mark/1.0). Post-1929 reprints (e.g., 1959/1994 editions) may be copyrighted: use original-date scans only.
- **Rights statement URL:** https://archive.org/about/terms.php
- **Evidence quality of the rights reading:** metadata JSON read; policy page not fetched
- **Rights tier:** A (original pre-1929 scans)
- **Extraction / normalization method:** Download _djvu.txt (OCR), keep page breaks (form feed), clean hyphenation and running heads, chunk by section; store archive identifier + page image number for citation.
- **Record counts:** advancedsearch counts: 802 texts with subject 'Gettysburg, Battle of, Gettysburg, Pa., 1863'; 711 'war of the rebellion ... official records' texts; 113 Battles and Leaders items; 167 Confederate Veteran items (1893-1932); 380 Southern Historical Society Papers hits
- **Historian questions it enables:**
  - Full-text passage retrieval over PD primary/secondary works
  - Quotable regimental narratives with page citations
- **Quality notes:** OCR quality varies; prefer HathiTrust/Google/LoC scans of same edition when IA scan is poor; do a 1% manual QA sample.
- **Risks:** Copyright status per item must be logged in the registry (edition year!)
- **Priority:** P0
- **Effort:** L

### SRC-19 - War of the Rebellion (Official Records), Series I, Volume 27 (Gettysburg Campaign), Parts 1-3

Publisher: US War Department (1889); scans on Internet Archive. Category: primary-source.

- **URLs:**
  - part1: https://archive.org/details/warofrebellion271unit
  - part2: https://archive.org/details/warofrebellion272unit
  - part3: https://archive.org/details/warofrebellion273unit
  - ocr: https://archive.org/download/warofrebellion271unit/warofrebellion271unit_djvu.txt
- **Format:** OCR text (djvu.txt): 3,970,479 + 3,880,513 + 3,406,041 = 11,257,033 bytes; 1,190 + 1,132 + 1,256 = 3,578 scanned pages
- **Size:** 11.3 MB raw text
- **API limits / access:** IA (see SRC-18).
- **License / rights statement:** US government publication of 1889 (public domain); scans on IA carry no rights metadata in the items checked.
- **Rights statement URL:** https://archive.org/about/terms.php
- **Evidence quality of the rights reading:** metadata JSON read directly (page counts and file sizes)
- **Rights tier:** A
- **Extraction / normalization method:** Segment into reports: split on headings 'No. NN. Reports of ...' / 'Abstract from returns'; for each report capture author, rank, unit, date, page; extract time mentions with a regex family ('about 4 p. m.', 'at daybreak', 'at 3 o'clock') into {text, minutes_since_midnight|null, confidence, day}; map unit mentions ('Twentieth Maine', '20th Me.') to site IDs via alias table; extract place mentions (Devil's Den, Peach Orchard, Wheat-field, Emmitsburg road ...) against a gazetteer built from terrain.json + OSM names + NPS CLR features. Embed sentences later. Keep the OR citation form 'O.R., Ser. I, Vol. 27, pt. 1, p. NNN'.
- **Record counts:** 3,578 pages; number of reports UNVERIFIED (expected several hundred; count during segmentation)
- **Historian questions it enables:**
  - What did Colonel Chamberlain report about the 20th Maine?
  - When did Longstreet's attack begin according to the participants' own reports? (evidence for the clock conflict C4)
  - Which regiments reported fighting at the Wheatfield and when?
  - Official casualty returns by unit (Union) as a PD alternative to Busey & Martin
- **Quality notes:** Times in OR reports are approximate and mutually inconsistent (that is itself historical evidence): store them as evidence with variance, never as a single truth. OCR needs QA on numbers/tables.
- **Depends on:** SRC-05 alias table
- **Risks:** Table OCR (returns) is poor: manual QA for returns pages
- **Priority:** P0
- **Effort:** L
- **audit_refs:** C4

### SRC-20 - Fox, Regimental Losses in the American Civil War 1861-1865 (1889)

Publisher: William F. Fox; IA scan regimentallosses00infoxw. Category: statistics.

- **URLs:**
  - ia: https://archive.org/details/regimentallosses00infoxw
  - ocr: https://archive.org/download/regimentallosses00infoxw/regimentallosses00infoxw_djvu.txt
- **Format:** OCR text 2,193,581 B; 618 pages
- **Size:** 2.2 MB
- **API limits / access:** IA.
- **License / rights statement:** 1889 publication; public domain.
- **Evidence quality of the rights reading:** IA metadata read
- **Rights tier:** A
- **Extraction / normalization method:** Semi-automated table extraction (regiment, killed, wounded, missing, aggregate) for Union regiments engaged at Gettysburg; QA by double-entry on a sample of 50 regiments; join through the crosswalk.
- **Record counts:** Gettysburg rows: not counted (measure)
- **Historian questions it enables:**
  - Regiment casualty figures with a PD citation
  - Cross-check of site's casualty numbers (currently sourced to Busey & Martin 1994, copyrighted)
- **Quality notes:** Fox is the 1889 standard for Union losses; Confederate coverage is much weaker (do not assume).
- **Depends on:** SRC-10 crosswalk
- **Risks:** OCR of multi-column tables
- **Priority:** P1
- **Effort:** L

### SRC-21 - Dyer, A Compendium of the War of the Rebellion (1908) - unit histories

Publisher: Frederick H. Dyer; IA/Google scans; also embedded in CWSS REG_HISTORY. Category: unit-histories.

- **URLs:**
  - ia_1908: https://archive.org/details/bub_gb_OBkNAQAAMAAJ (licenseurl publicdomain/mark/1.0)
  - ia_1959_reprint_vol1: https://archive.org/details/compendiumofwaro0001dyer (OCR 4,057,457 B; reprint - prefer the 1908 scan)
- **Format:** OCR text; or use the CWSS Regiments_Unitz.tsv text (already structured by unit code)
- **Size:** 4 MB per volume
- **API limits / access:** IA.
- **License / rights statement:** 1908; public domain.
- **Evidence quality of the rights reading:** IA search result licenseurl read
- **Rights tier:** A
- **Extraction / normalization method:** Prefer CWSS REG_HISTORY/REG_LONGHISTORY (already keyed by unit_code and containing Dyer text with 'Attached to ... Corps' and 'SERVICE' paragraphs); use IA only to verify.
- **Record counts:** ~3,246 US units in nps_units.csv; Dyer covers Union only
- **Historian questions it enables:**
  - Regiment service history ('Attached to 2nd Brigade, 3rd Division, 5th Corps ... Gettysburg July 1-3')
- **Quality notes:** Union only; Confederate unit histories need other sources (state histories, Confederate Military History (IA: 72 hits), OR).
- **Depends on:** SRC-10
- **Priority:** P1
- **Effort:** S

### SRC-22 - State-at-Gettysburg and monument-dedication volumes (regimental narratives) + Vanderslice + GBMA history

Publisher: State monument commissions (1889-1914); Vanderslice (1897/1899). Category: secondary-pd.

- **URLs:**
  - maine: https://archive.org/details/maineatgettysbur01main (OCR 1,606,755 B, 696 pp)
  - pennsylvania_vol2_1914: https://archive.org/details/pennsylvaniaatg02penn (OCR 2,013,624 B, 826 pp)
  - new_york: https://archive.org/details/newyorkatgettysb0001unse (Vols I & II, 1900)
  - michigan_1889: https://archive.org/details/cu31924030924736
  - minnesota_1890: https://archive.org/details/minnesotacivil01minnrich
  - vanderslice_1899: https://archive.org/details/thenandnowgetty00vandrich (OCR 373,618 B)
  - gbma_history_1897: https://archive.org/details/gettysburghistor00vand
- **Format:** OCR text
- **Size:** ~10-15 MB raw for the set
- **API limits / access:** IA.
- **License / rights statement:** Published 1889-1914; public domain (US).
- **Evidence quality of the rights reading:** IA metadata read
- **Rights tier:** A
- **Extraction / normalization method:** Chunk by regiment section; attach to unit IDs via alias table; keep page numbers; capture dedication-speech passages separately labeled 'reminiscence (retrospective)'.
- **Record counts:** Maine 696 pp; PA vol.2 826 pp; others not counted
- **Historian questions it enables:**
  - What did the 20th Maine's own historian say about the bayonet charge?
  - Regiment-level narrative for hundreds of units
  - Where exactly did the regiment stand (Vanderslice 'where and how the regiments fought')
- **Quality notes:** Veteran memory 20-50 years later: label as retrospective; good for color and positions, weak for timing.
- **Depends on:** SRC-18; SRC-10
- **Risks:** Do not use post-1929 reprints
- **Priority:** P1
- **Effort:** L

### SRC-23 - Civilian narratives and reporters (Pierce, Buehler, Hoke, Jacobs, Bates) + NPS 'Civilians at Gettysburg'

Publisher: Various authors 1864-1900 (IA scans); NPS article. Category: primary-source.

- **URLs:**
  - pierce_1889: https://archive.org/details/atgettysburgorwh00alle
  - buehler_1900: https://archive.org/details/recollectionsofr00bueh
  - hoke_1887: https://archive.org/details/greatinvasionof100hoke
  - jacobs_1864: https://archive.org/details/notesonrebelinv00jacogoog
  - bates_1875: https://archive.org/details/battlegettysbur00bategoog
  - nps_civilians: https://www.nps.gov/articles/000/civilians-at-gettysburg.htm
- **Format:** OCR text
- **Size:** <1 MB each
- **API limits / access:** IA.
- **License / rights statement:** Published 1864-1900: public domain; NPS article: NPS statement.
- **Evidence quality of the rights reading:** IA metadata read
- **Rights tier:** A
- **Extraction / normalization method:** Paragraph-level passages tagged: witness, age/residence, day, place (Baltimore St, Cemetery Hill, Culp's Hill, Seminary), sense (sound/sight/smell), account_date (retrospective flag: Pierce wrote in 1889 at ~15->41 y).
- **Record counts:** 5 books + 1 NPS article (Sarah Broadhead's diary was NOT found on IA by title search: UNVERIFIED)
- **Historian questions it enables:**
  - What did civilians see and hear on July 1-3?
  - What happened in the town on the night of July 1?
  - How did civilians describe the smell/sound of the cannonade?
- **Quality notes:** Retrospective accounts vary in reliability; label each with writing date; do not present as verified fact.
- **Depends on:** SRC-18
- **Risks:** Gettysburg College / ACHS diaries and letters are separate (SRC-30): Tier C
- **Priority:** P0
- **Effort:** M

### SRC-24 - July 1863 weather at Gettysburg (Prof. Michael Jacobs meteorological observations)

Publisher: M. Jacobs, Pennsylvania College (1864 'Notes on the Rebel invasion...'); summaries by Emerging Civil War / CivilWarTalk. Category: primary-source.

- **URLs:**
  - primary_ocr: https://archive.org/download/notesonrebelinva00gett/notesonrebelinva00gett_djvu.txt (83,032 B; 66 pp)
  - ia_1864: https://archive.org/details/notesonrebelinv00jacogoog
  - secondary_summary: https://emergingcivilwar.com/2023/02/22/the-thunder-seemed-tame-weather-at-the-battle-of-gettysburg/
- **Format:** OCR text -> hand-keyed 3 days x 3 readings table
- **Size:** <100 KB
- **API limits / access:** IA.
- **License / rights statement:** 1864 publication: public domain; the summaries are copyrighted (do not copy, link only).
- **Evidence quality of the rights reading:** Secondary values seen in one search result only (NOT yet checked against the primary text)
- **Rights tier:** A (primary) / C (blog summaries)
- **Extraction / normalization method:** Hand-key from the primary: date, 7am/2pm/9pm temperature (F), wind, sky, rain. Values reported by the secondary summary (VERIFY against primary before shipping): Jul 1 72/76/74 cloudy, ~12 mph S breeze; Jul 2 74/81/76 clearing afternoon; Jul 3 73/87/76, storm, 'the thunder seemed tame, after the artillery firing of the afternoon'; Jul 4 rain >1 inch.
- **Record counts:** ~12 rows
- **Historian questions it enables:**
  - What was the weather during Pickett's Charge?
  - Why was the retreat so muddy?
  - How hot was it when the Wheatfield was fought?
- **Quality notes:** Single-station record from town; excellent as the only quantitative weather; also feeds the ground-condition context.
- **Risks:** Do not ship the secondary-summary numbers unverified
- **Priority:** P0
- **Effort:** S

### SRC-25 - Soldiers' National Cemetery reports (1864, revised 1865): burial lists with names, regiments, companies

Publisher: Pennsylvania Select Committee / Soldiers' National Cemetery Association (1864-65); IA scans. Category: primary-source.

- **URLs:**
  - revised_1865_a: https://archive.org/details/revisedreportofs01penn
  - revised_1865_b: https://archive.org/details/revisedrepor2743penn
  - report_1864: https://archive.org/details/reportofselectcopenn
  - association_charter_1864: https://archive.org/details/charterproceedin00sold
- **Format:** OCR text with tabular lists
- **Size:** ~1-2 MB
- **API limits / access:** IA.
- **License / rights statement:** 1864-65 publications: public domain.
- **Evidence quality of the rights reading:** IA search results read (titles/dates); contents of the lists NOT yet inspected
- **Rights tier:** A
- **Extraction / normalization method:** OCR + parse burial tables per state section: {name, rank, company, regiment, state, grave/plot}; QA sample of 200 rows.
- **Record counts:** UNVERIFIED count (search snippet: nearly 3,500 Union soldiers buried in 1863-64)
- **Historian questions it enables:**
  - Where is Private X buried? Which regiments lost men buried in the National Cemetery?
  - Dead by state/unit (Union) from a PD source
- **Quality notes:** Only Union dead in the Soldiers' National Cemetery; Confederate dead were later removed to Southern cemeteries (1870s) - not in these lists. The CWSS mirror has NO Gettysburg cemetery rows (checked).
- **Depends on:** SRC-18
- **Risks:** OCR of tabular names: manual QA
- **Priority:** P1
- **Effort:** L

### SRC-26 - Medical: Medical and Surgical History of the War of the Rebellion; Camp Letterman information

Publisher: US Surgeon General's Office (1870-1888); IA scans; NMCWM (article). Category: primary-source.

- **URLs:**
  - ia_example: https://archive.org/details/medicalsurgical32barnrich
  - nmcwm_camp_letterman: https://www.civilwarmed.org/camp-letterman/
- **Format:** OCR text
- **Size:** multi-MB per volume
- **API limits / access:** IA.
- **License / rights statement:** 1870s publication: public domain; NMCWM article copyrighted (link only).
- **Evidence quality of the rights reading:** IA hits read; Camp Letterman patient-record availability comes from a forum thread (weak) - UNVERIFIED
- **Rights tier:** A / C
- **Extraction / normalization method:** Selective: wound statistics and Gettysburg case narratives only; do not attempt whole-volume ingestion in phase 1.
- **Record counts:** 45 IA hits for the title
- **Historian questions it enables:**
  - What kinds of wounds were common at Gettysburg?
  - Camp Letterman timeline (opened July 20, closed Nov 20, 1863 per NMCWM/search snippets)
- **Quality notes:** Search snippets claim 14,000 Union + 6,800 Confederate patients and no comprehensive patient list; verify before publishing numbers.
- **Risks:** Sensitive content: age-appropriate framing
- **Priority:** P3
- **Effort:** L

### SRC-27 - 1860 Census: Agriculture of the United States in 1860 (Kennedy, 1864) and Population volume; NHGIS alternative

Publisher: US Census Bureau (PD); IPUMS NHGIS (restricted redistribution). Category: statistics.

- **URLs:**
  - census_pdf: https://www2.census.gov/library/publications/decennial/1860/agriculture/1860b-01.pdf
  - census_page: https://www.census.gov/library/publications/1864/dec/1860b.html
  - ia: https://archive.org/details/cu31924096440932
  - nhgis_terms: https://www.nhgis.org/ipums-nhgis-terms-use
- **Format:** PDF tables (Adams County PA rows: wheat, rye, oats, corn, hay, livestock)
- **Size:** PDF (multi-MB)
- **API limits / access:** None.
- **License / rights statement:** Census Bureau publications are US government works (public domain). NHGIS (search snippet, terms page URL verified 200): 'you will not redistribute the data without permission' -> DO NOT ship NHGIS extracts.
- **Rights statement URL:** https://www.nhgis.org/ipums-nhgis-terms-use
- **Evidence quality of the rights reading:** Census PDF reachable (200 application/pdf); NHGIS wording from search snippet
- **Rights tier:** A (Census PDF) / C (NHGIS)
- **Extraction / normalization method:** Hand-key the Adams County, PA rows (a few dozen numbers) from the PDF; store with page number and 'crop year 1859' note.
- **Record counts:** ~30-60 numbers
- **Historian questions it enables:**
  - How much wheat did Adams County grow (1859 crop)?
  - Context for Wheatfield questions (county-level only!)
- **Quality notes:** County totals cannot tell the height/ripeness of a specific field on July 2, 1863.
- **Risks:** Never let the Historian imply farm-level data from county totals
- **Priority:** P2
- **Effort:** S

### SRC-28 - Civil War damage claims (Adams County) - PA State Archives claim volumes; ACHS Damage Claims Index; NPS narrative examples

Publisher: Pennsylvania State Archives; Adams County Historical Society (Gettysburg History); NPS. Category: primary-source.

- **URLs:**
  - nps_example: https://npshistory.com/publications/civil_war_series/16/sec20.htm
  - achs_research: https://gettysburghistory.org/research/
- **Format:** Bound volumes/microfilm; ACHS index (research room); NPS narrative HTML
- **Size:** n/a
- **API limits / access:** No public API found.
- **License / rights statement:** State archive records are public records (rights not checked); ACHS page: 'Reproduction of any of the materials found below is prohibited without the express permission of Gettysburg History.' (read directly).
- **Rights statement URL:** https://gettysburghistory.org/research/
- **Evidence quality of the rights reading:** ACHS text read directly; PA Archives holding statement from a search snippet (claims applications 1871-1879, arranged by county/surname) UNVERIFIED at source
- **Rights tier:** C for ACHS index; A for state archive originals after verification
- **Extraction / normalization method:** Phase-1: transcribe only the examples already printed in the NPS handbook (e.g., Catherine Trostle: 27 acres wheat, 9 acres corn, 32 acres grass, 6,400 fence rails). Phase-2: request permission from ACHS / arrange transcription from PA Archives volumes.
- **Record counts:** Adams County claim count UNVERIFIED
- **Historian questions it enables:**
  - How many acres of wheat did the Trostle farm lose?
  - Which farms lost fences/crops and how much (damage claims)?
- **Quality notes:** Claims are self-interested and partial; they document what was destroyed, not what stood on July 2.
- **Risks:** Permission needed for ACHS; private-individual descendants: names are 1860s people (low sensitivity)
- **Priority:** P1
- **Effort:** L

### SRC-29 - USGS 3DEP elevation (1 m DEM, lidar point cloud, 1/9 and 1/3 arc-second) via TNM Access API

Publisher: US Geological Survey. Category: terrain.

- **URLs:**
  - tnm_api: https://tnmaccess.nationalmap.gov/api/v1/products?datasets=Digital%20Elevation%20Model%20(DEM)%201%20meter&bbox=-77.29,39.77,-77.16,39.86&outputFormat=JSON
  - dem_1m_tiles: https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/PA_South_Central_B1_2017/TIFF/USGS_one_meter_x30y441_PA_South_Central_B1_2017.tif (485,186,601 B); ...x30y442... (479,387,976 B); ...x31y441... (468,996,588 B); ...x31y442... (469,898,363 B)
  - lidar_LPC: project PA_17County_D24, published 2026-05-04, 236 LAZ tiles returned for the bbox (86-108 MB each)
  - credit_policy: https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits
- **Format:** GeoTIFF (1 m), LAZ point clouds, IMG
- **Size:** 4 tiles ~1.9 GB in total for 1 m DEM; derived 5 m grid ~9 MB raw (est.)
- **API limits / access:** No key; TNM Access API and public S3 (no documented limits).
- **License / rights statement:** 'USGS-authored or produced data and information are considered to be in the U.S. Public Domain.' Credit requested: 'U.S. Geological Survey' / 'Department of the Interior/USGS' (fetch-summarizer).
- **Rights statement URL:** https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits
- **Evidence quality of the rights reading:** TNM API JSON read; policy via summarizer
- **Rights tier:** A
- **Extraction / normalization method:** gdalwarp -t_srs EPSG:32618 -tr 5 5 -te <bbox> to merge/clip; write 16-bit PNG height grid (5 m: about 2,200 x 2,000 cells = 4.4M cells ~ 9 MB raw, est. 3-5 MB PNG) and a 10 m grid (~1-2 MB); derive slope/aspect/hillshade; build optional Terrain-RGB tiles (own data) for the map. Viewshed: browser Web Worker line-of-sight with observer height 1.65 m (5 ft 5 in), target height 1.5 m, earth curvature/refraction correction (small under 5 km).
- **Record counts:** bbox 39.77-39.86 N, 77.29-77.16 W is roughly 10 km x 11 km (~110 km2 = ~110 M 1 m cells; computed)
- **Historian questions it enables:**
  - Could Lee see Little Round Top from Seminary Ridge? (viewshed, deterministic)
  - How steep is the climb up Culp's Hill / Round Top? (slope)
  - Elevation at the Angle / Copse of Trees
- **Quality notes:** Bare-earth LiDAR shows TODAY's terrain (roads, railroad cut and park grading present) and no 1863 trees; combine with 1863 woodlot polygons (SRC-16/SRC-01). This DEM is what the site's 'What They Could See' page should be built on (audit H8: it is not a viewshed today).
- **Depends on:** SRC-16 for vegetation blockers
- **Risks:** Large source downloads (1.9 GB): do in CI/local only, not committed
- **Priority:** P0
- **Effort:** L
- **audit_refs:** H8, S3

### SRC-30 - USGS Historical Topographic Maps: Gettysburg quadrangles (1908, 1942, 1944, 1951, 1990, 1994)

Publisher: USGS TNM Historical Topographic Map Collection. Category: historic-maps.

- **URLs:**
  - tnm_api: https://tnmaccess.nationalmap.gov/api/v1/products?datasets=Historical%20Topographic%20Maps&bbox=-77.26,39.80,-77.20,39.83&outputFormat=JSON
- **Format:** GeoPDF + GeoTIFF
- **Size:** 7.35-8.13 MB (1908 1:62,500 editions: 6 listed); 8.5 MB (1942 1:125,000); 6.2 MB (1944 1:31,680); 8.6-9.5 MB (1951 1:24,000)
- **API limits / access:** TNM API/S3 (no key).
- **License / rights statement:** USGS public domain (see SRC-29), credit USGS.
- **Rights statement URL:** https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits
- **Evidence quality of the rights reading:** TNM API JSON read
- **Rights tier:** A
- **Extraction / normalization method:** Use GeoTIFF for contour/road comparison and place names (1908 is the closest USGS depiction to the early-park landscape); extract farm labels if legible.
- **Record counts:** 52 results in the bbox across scales/editions; Gettysburg-titled editions: 1908 (x6), 1942, 1944, 1951 (x7), 1990, 1994
- **Historian questions it enables:**
  - How did the road network look in 1908 vs today?
  - Contour cross-check of the DEM
- **Quality notes:** 1908 is 45 years after the battle; quarrying and road changes since 1863.
- **Priority:** P2
- **Effort:** M

### SRC-31 - Mapbox Terrain-DEM v1 (in-SDK elevation, no export)

Publisher: Mapbox. Category: terrain.

- **URLs:**
  - tileset_doc: https://docs.mapbox.com/data/tilesets/reference/mapbox-terrain-dem-v1/
  - tos: https://www.mapbox.com/legal/tos
- **Format:** Raster-DEM tiles (Terrain-RGB): height = -10000 + ((R*256*256 + G*256 + B) * 0.1)
- **Size:** n/a
- **API limits / access:** Through Mapbox GL JS quota/pricing of the site's token.
- **License / rights statement:** Doc: 'Available in Mapbox SDK's only' (GL JS, iOS, Android, Flutter); not available via the Raster Tiles API; multiple source datasets by location/zoom; attribution required. Do NOT download/cache tiles as files.
- **Rights statement URL:** https://docs.mapbox.com/data/tilesets/reference/mapbox-terrain-dem-v1/
- **Evidence quality of the rights reading:** fetch-summarizer; the ToS excerpt fetched did not include tile-caching clauses (UNVERIFIED which product-terms clause applies)
- **Rights tier:** B (in-SDK use only)
- **Extraction / normalization method:** Use map.queryTerrainElevation(lngLat) for live elevation readouts in the main map (data up to zoom 14); for viewshed/slope use the own 3DEP-derived grid (SRC-29) so results are deterministic and citable.
- **Record counts:** n/a
- **Historian questions it enables:**
  - Elevation readout on tap/hover
- **Quality notes:** Vertical precision 0.1 m increments but real resolution limited; source data undisclosed.
- **Risks:** Cinematic Export/recording of Mapbox tiles: check Mapbox product terms before promoting exports (open question)
- **Priority:** P2
- **Effort:** S

### SRC-32 - PASDA / Adams County GIS (parcels, lidar/imagery indexes) and historic aerials

Publisher: Pennsylvania Spatial Data Access (Penn State); Adams County GIS Hub. Category: gis.

- **URLs:**
  - pasda: https://www.pasda.psu.edu/
  - adams_hub: https://gis-hub-adamsgis.hub.arcgis.com/
  - pa_lidar_page: https://pa-geo-data-pennmap.hub.arcgis.com/pages/lidar-and-imagery-build
  - parcels_search: https://www.pasda.psu.edu/uci/SearchResults.aspx?Keyword=adams%20county%20parcels
- **Format:** Shapefile ZIP, KMZ, GeoJSON, ArcGIS services (Adams County Parcels 2026: pattern .../download/adamscounty/AdamsCounty_Parcels<YYYYMM>.zip)
- **Size:** not measured
- **API limits / access:** Not stated.
- **License / rights statement:** PASDA: 'Standard PSU legal statements and copyright information apply' (no license text seen). Parcel attributes contain CURRENT owner names/addresses: privacy risk -> strip attributes.
- **Rights statement URL:** https://www.pasda.psu.edu/
- **Evidence quality of the rights reading:** PASDA search page fetched; lidar page content not retrievable via fetch tool (UNVERIFIED specifics)
- **Rights tier:** B (verify) + privacy rule
- **Extraction / normalization method:** Use geometry only (no owner fields) to align historic farm outlines with modern boundaries; PAMAP/USGS lidar already covered by SRC-29.
- **Record counts:** n/a
- **Historian questions it enables:**
  - Where is the Rose farm relative to today's parcels/park boundary?
- **Quality notes:** Parcels are modern; farm names for 1863 come from historic maps (SRC-16) and NPS farm histories.
- **Depends on:** SRC-16
- **Risks:** Do not publish private owner info
- **Priority:** P3
- **Effort:** M

### SRC-33 - Smithsonian Open Access (NMAH/NPG etc.) - CC0 images and metadata

Publisher: Smithsonian Institution. Category: images.

- **URLs:**
  - api: https://api.si.edu/openaccess/api/v1.0/search?q=gettysburg&api_key=<key>
  - open_access: https://www.si.edu/openaccess
- **Format:** JSON API (api.data.gov key; DEMO_KEY works for low-volume tests)
- **Size:** n/a
- **API limits / access:** api.data.gov key limits apply (DEMO_KEY is heavily limited; register a key for build use - owner action).
- **License / rights statement:** Sampled records show metadata_usage.access = 'CC0'.
- **Rights statement URL:** https://www.si.edu/openaccess
- **Evidence quality of the rights reading:** API JSON read (3 sample rows)
- **Rights tier:** A (CC0 rows only)
- **Extraction / normalization method:** Query 'gettysburg' with online_media_type Images; filter access=='CC0'; store title, unit, media URL, credit.
- **Record counts:** 737 records match 'gettysburg'; 236 with images (2026-09-30)
- **Historian questions it enables:**
  - Portraits and objects (NMAH/NPG) to illustrate commanders and material culture
- **Quality notes:** Many hits are not battle-related (e.g., memorial coins); curate.
- **Risks:** Filter to CC0 only
- **Priority:** P2
- **Effort:** S

### SRC-34 - Wikipedia (English) - battle articles, orders of battle, commander biographies

Publisher: Wikimedia Foundation / volunteer editors. Category: encyclopedia.

- **URLs:**
  - battle: https://en.wikipedia.org/wiki/Battle_of_Gettysburg (wikitext 134,435 B)
  - day1: https://en.wikipedia.org/wiki/Battle_of_Gettysburg,_first_day (57,043 B)
  - day2: https://en.wikipedia.org/wiki/Battle_of_Gettysburg,_second_day (52,541 B)
  - oob_union: https://en.wikipedia.org/wiki/Battle_of_Gettysburg_order_of_battle:_Union (60,906 B)
  - oob_confederate: https://en.wikipedia.org/wiki/Battle_of_Gettysburg_order_of_battle:_Confederate (38,288 B)
  - reuse_guidance: https://en.wikipedia.org/wiki/Wikipedia:Reusing_Wikipedia_content
  - terms: https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use
  - api_limits: https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits
- **Format:** MediaWiki API (action=query&prop=extracts|revisions), REST, wikitext/HTML
- **Size:** ~0.5 MB for the 6 key articles
- **API limits / access:** Verified table (fetch of the Rate_limits page + observed HTTP 429 when the client was unidentified): unidentified IP 10 req/min; requests with a meaningful User-Agent incl. contact info 200 req/min; 429 with Retry-After. Use a descriptive User-Agent (project + contact).
- **License / rights statement:** Text: CC BY-SA 4.0 (and GFDL for older text) per Terms of Use section 7. Reuse page (fetch-summarizer): attribute by hyperlink to the article, or a stable copy, or an author list; 'If you make modifications or additions ... you must license them under the Creative Commons Attribution-Share-Alike License 4.0 or later'; 'indicate in a reasonable fashion that the original work has been modified'; include a license notice with link http://creativecommons.org/licenses/by-sa/4.0/ ; each media file has separate licensing on its own page.
- **Rights statement URL:** https://en.wikipedia.org/wiki/Wikipedia:Reusing_Wikipedia_content
- **Evidence quality of the rights reading:** fetch-summarizer (reuse + ToU); rate limits read from the MediaWiki page
- **Rights tier:** B (CC BY-SA 4.0 - attribution + share-alike on adaptations)
- **Extraction / normalization method:** Fetch rendered extracts + oldid permalink + timestamp; store {title, revid, retrieved_at, license:'CC BY-SA 4.0', url:'https://en.wikipedia.org/w/index.php?title=...&oldid=...', text_hash}. Use ONLY for context, commander biographies and 'how do other reference works describe it' - NOT as the source of orders of battle (use NPS/OR: SRC-05/SRC-19). Static-site compliance pattern: (1) every Wikipedia-derived passage rendered in its own labeled block with 'Source: Wikipedia, <article>, CC BY-SA 4.0' linking the oldid permalink and the license; (2) /sources.html lists all articles + revision ids + the change note ('condensed/excerpted'); (3) keep Wikipedia-derived excerpts as separate JSON files with their own LICENSE header so share-alike scope is clear and does not attach to the site's original vignettes; (4) do not paraphrase-blend Wikipedia text into site-authored vignettes.
- **Record counts:** 6 articles above + ~130 commander/unit biographies (estimate; count via the crosswalk)
- **Historian questions it enables:**
  - Biography snippets for corps/division/brigade commanders
  - 'What do reference works say?' side-by-side with primary sources
  - Links to further reading
- **Quality notes:** Tertiary source; article quality varies; the OOB pages are large hand-edited lists (Union 60,906 B; Confederate 38,288 B) - good for cross-checking spelling/rank, not authoritative.
- **Risks:** ShareAlike contagion if blended: keep separation; 429 blocks: identify client and cache
- **Priority:** P1
- **Effort:** M

### SRC-35 - Wikidata (CC0) - identifiers and enrichment

Publisher: Wikimedia Foundation. Category: linked-data.

- **URLs:**
  - battle_item: https://www.wikidata.org/wiki/Q33132 (Battle of Gettysburg)
  - sparql: https://query.wikidata.org/sparql (User-Agent required)
  - licensing: https://www.wikidata.org/wiki/Wikidata:Licensing
- **Format:** SPARQL JSON, JSON entity dumps
- **Size:** small
- **API limits / access:** Same Wikimedia limits as SRC-34; SPARQL timeout 60 s.
- **License / rights statement:** 'All structured data (i.e. the main, Property, Lexeme, and EntitySchema namespaces) is released into the public domain under Creative Commons Zero.' Text in other namespaces: CC BY-SA 4.0 (fetch-summarizer).
- **Rights statement URL:** https://www.wikidata.org/wiki/Wikidata:Licensing
- **Evidence quality of the rights reading:** fetch-summarizer; SPARQL results read directly
- **Rights tier:** A (structured data)
- **Extraction / normalization method:** Measured 2026-09-30: 87 items with 'significant event' P607 = Q33132 (mostly people); 88 items via P607 -> part-of chain; 4,116 items with P607 = American Civil War (Q8676); 174 geolocated items within 8 km of the town (14 cemeteries, 8 sculptures, 4 monuments, 4 battles, ...); only 2 items with participant-in P1344 = Q33132. Use to attach QIDs, P18 images (Commons) and Wikipedia sitelinks to commanders and to the 1,163 units that have DBpedia URIs (SRC-11).
- **Record counts:** 87 people/items tied to Gettysburg; 174 nearby geolocated items
- **Historian questions it enables:**
  - Cross-links and images for commanders
  - Disambiguation (which 'John Buford')
- **Quality notes:** NOT a source for regiment rosters or unit positions (only 2 units have P1344 Gettysburg). Gettysburg monuments are largely absent (4 'monument' instances nearby).
- **Depends on:** SRC-10; SRC-11
- **Priority:** P2
- **Effort:** S

### SRC-36 - Wikimedia Commons - Gettysburg photographs, maps, monuments/tablets

Publisher: Wikimedia Commons contributors. Category: images.

- **URLs:**
  - nmp: https://commons.wikimedia.org/wiki/Category:Gettysburg_National_Military_Park
  - battlefield: https://commons.wikimedia.org/wiki/Category:Gettysburg_Battlefield
  - battle: https://commons.wikimedia.org/wiki/Category:Battle_of_Gettysburg
  - api: https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=extmetadata|url|size&titles=File:<name>&format=json
- **Format:** Image files + extmetadata (LicenseShortName, Artist, Credit, AttributionRequired, UsageTerms)
- **Size:** n/a
- **API limits / access:** Wikimedia limits (SRC-34).
- **License / rights statement:** Per-file: PD-USGov, PD-old, CC0, CC BY, CC BY-SA and others; 'It is the responsibility of the reuser to determine how a license applies' (Wikipedia reuse page).
- **Rights statement URL:** https://en.wikipedia.org/wiki/Wikipedia:Reusing_Wikipedia_content
- **Evidence quality of the rights reading:** category counts read directly via the API on 2026-09-30
- **Rights tier:** A/B per file (build-time allowlist)
- **Extraction / normalization method:** Measured category sizes: 'Gettysburg National Military Park' 462 (422 files, 40 subcats); 'Gettysburg Battlefield' 338 (314 files, 23 subcats); 'Battle of Gettysburg' 311 (296 files, 14 subcats); 'Gettysburg National Cemetery' 117 (110 files); 'Maps of the Battle of Gettysburg' 20 (16 files). Subcategories of interest: 'Battle of Gettysburg memorials', 'Gettysburg National Military Park - markers, plaques and tablets', 'Cannons in Gettysburg National Military Park', 'Maps of Gettysburg National Military Park', 'Annual reports to the Secretary of War (1893-1901)', farm categories (Bushman, Leister, Trostle, Slyder, Codori, Wisler). Allowlist rule at build time: keep only files whose LicenseShortName matches ^(Public domain|PD|CC0|CC BY( |-)?[0-9.]*|CC BY-SA)$; store credit string; reject 'GFDL only', 'CC BY-NC', 'fair use'.
- **Record counts:** ~1,000 files across the categories (counted above; overlapping)
- **Historian questions it enables:**
  - Photos of monuments/tablets to illustrate answers
  - Tablet-text transcription source (photographs of War Department tablets)
- **Quality notes:** Modern photographs of PD monument text: the text is PD (1890s tablets are federal/state works), the photo license is per-file.
- **Risks:** Attribution strings for CC BY/CC BY-SA files must appear next to each image
- **Priority:** P1
- **Effort:** M

### SRC-37 - Wikisource (transcribed texts: cyclopedias, SHSP items, court case)

Publisher: Wikimedia Foundation. Category: texts.

- **URLs:**
  - api: https://en.wikisource.org/w/api.php?action=query&list=search&srsearch=Gettysburg&format=json
- **Format:** MediaWiki API
- **Size:** small
- **API limits / access:** Wikimedia limits (SRC-34); one retry hit HTTP 429 earlier in the session.
- **License / rights statement:** Hosted transcriptions of public-domain works; page-level license templates vary (verify per page).
- **Rights statement URL:** https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use
- **Evidence quality of the rights reading:** totalhits read directly
- **Rights tier:** A/B per page
- **Extraction / normalization method:** Optional: pick 20-30 specific pages (e.g., 'The American Cyclopaedia (1879)/Gettysburg, Battle of' 15,888 B; 'United States v. Gettysburg Electric Railway Company' 10,426 B; SHSP appendix to Rodes' report).
- **Record counts:** 1,036 search hits for 'Gettysburg' (mostly short pages)
- **Historian questions it enables:**
  - Legal history of the battlefield park (US v. Gettysburg Electric Railway)
  - SHSP transcriptions of Confederate reports
- **Quality notes:** Sparse and uneven; the IA/OR route is more complete.
- **Priority:** P3
- **Effort:** S

### SRC-38 - OpenStreetMap - monuments, memorials, tablets, cannon positions in the battlefield bbox

Publisher: OpenStreetMap contributors. Category: geodata.

- **URLs:**
  - overpass: https://overpass-api.de/api/interpreter (POST data=<query>; a User-Agent header is REQUIRED: HTTP 406 without one)
  - copyright: https://www.openstreetmap.org/copyright
  - query_used: [out:json][timeout:60];(node["historic"~"memorial|monument|cannon|battlefield|ruins|building"](39.77,-77.29,39.86,-77.16);way["historic"~"memorial|monument|cannon|battlefield"](39.77,-77.29,39.86,-77.16););out tags center;
- **Format:** Overpass JSON (tags + center)
- **Size:** 189 KB for the query above
- **API limits / access:** Public Overpass instance: fair-use (identify client, low volume); build-time only.
- **License / rights statement:** ODbL 1.0: 'OpenStreetMap is open data, licensed under the Open Data Commons Open Database License (ODbL)'; 'You are free to copy, distribute, transmit and adapt our data, as long as you credit OpenStreetMap and its contributors.' 'If you alter or build upon our data, you may distribute the result only under the same license.' The API response itself states 'The data included in this document is from www.openstreetmap.org. The data is made available under ODbL.'
- **Rights statement URL:** https://www.openstreetmap.org/copyright
- **Evidence quality of the rights reading:** copyright page via summarizer; Overpass response 'copyright' field read directly
- **Rights tier:** B (ODbL: attribution + share-alike for derived DATABASE)
- **Extraction / normalization method:** Measured 2026-09-30 (OSM base 2026-09-30T04:07:31Z): 867 elements with coordinates (790 historic=monument; 77 historic=memorial: 32 plaque, 24 statue, 12 unspecified, 8 grave, 1 stone), 852 named, 131 with an 'inscription' tag, 9 with wikidata, 2 with wikipedia, 0 with image/commons tags. Match to the site's 512 monuments (bundle.pretty.js:104442-110597) by distance + normalized name: 302 OSM elements are >30 m from any site monument, 177 are >60 m, 131 are >100 m; of the 177, 38 are named Confederate ('CS ...'/'CSA') and 39 'US ...' (site's side split is Union 457 / Confederate 40 / Other 15). Conversely 20 of the site's 512 monuments have NO OSM feature within 60 m (suspect coordinates or OSM gaps). ODbL compliance pattern: publish the OSM-derived monument dataset as its OWN file (e.g. /data/monuments_osm.geojson) with an ODbL LICENSE + 'Contains information from OpenStreetMap' notice; the site (a 'Produced Work') needs attribution only; do not merge OSM attributes into the site's proprietary JSON.
- **Record counts:** osm_historic_elements: 867; named: 852; with_inscription: 131; site_monuments: 512; osm_gt60m_from_any_site_monument: 177; site_monuments_without_osm_within_60m: 20
- **Historian questions it enables:**
  - Which monuments/tablets are near the Angle / Little Round Top?
  - Where is the Confederate marker for Benning's Brigade?
  - Inscription text for ~131 monuments/plaques
  - Validation of the site's 512 coordinates
- **Quality notes:** Crowd-sourced: names are abbreviations ('106th PA Curry', 'US HQ 5th Corps Artillery Brigade Martin'); need normalization; positions typically surveyed from photos/GPS, accuracy unknown. Only 9 of the site's 512 monuments have a `src` provenance value (bundle lines ~104442-110597).
- **Site evidence:** file: bundle.pretty.js; lines: 104442-110597; snippet: no: 46, name: "Pennsylvania State Memorial", lat: 39.807588, lon: -77.235153, mn: "MN 260", side: "Union", group: "United States & State Monuments", src: ""
- **Depends on:** SRC-10 crosswalk (unit names)
- **Risks:** Share-alike scope; Do not overwrite site data with OSM: treat as candidates + validate against SRC-01 1907 book
- **Priority:** P0
- **Effort:** M

### SRC-39 - Historical Marker Database (HMDB)

Publisher: HMdb.org LLC. Category: crowd-database.

- **URLs:**
  - copyright: https://www.hmdb.org/copyright.asp
  - terms: https://www.hmdb.org/terms.asp
  - gettysburg_results: https://www.hmdb.org/results.asp?Search=Place&Town=Gettysburg&State=Pennsylvania
  - robots: https://www.hmdb.org/robots.txt (Disallow: /PhotoFullSize.asp, /map.asp; Crawl-delay 0.1)
- **Format:** HTML pages (marker id 'db m<ID>'), no public API found
- **Size:** n/a
- **API limits / access:** No API; robots.txt permits /results.asp and marker pages; scripted bulk copying is not explicitly licensed.
- **License / rights statement:** Copyright page (read directly): '1. You may make copies of the pages, information and most images on this site without requesting permission if you follow the requirement set forth in the second paragraph ... 2. ... you must attribute what you copy to HMdb.org ... 3. You may not use content from this site commercially without written permission ... Commercial use also includes the receipt of any compensation from the publishing, display, or mirroring of any content from this site, even when received by a not-for-profit ... 4. Displaying pages or images ... in a frame ... is considered copying ... 5. Linking to pages on this site is not copying.' Certain images carry restricted rights. Terms: information 'may be incomplete, out-of-date, obsolete, or incorrect'.
- **Rights statement URL:** https://www.hmdb.org/copyright.asp
- **Evidence quality of the rights reading:** primary text read
- **Rights tier:** C for bulk ingestion until written permission; A for deep links
- **Extraction / normalization method:** Store only {hmdb_id, title, lat/lng if displayed} as LINK-OUT records (facts), never inscription text or photos, unless HMDB grants written permission for a derivative dataset (ask; effort S). Gettysburg PA search shows '1227 entries match your criteria' (2026-09-30) - includes markers and war memorials (also town markers).
- **Record counts:** 1,227 entries (Gettysburg, PA; markers + war memorials)
- **Historian questions it enables:**
  - Deep-link chips 'Read the marker on HMdb.org' in monument popups
  - Discovery of markers not in OSM (via manual review)
- **Quality notes:** Volunteer-transcribed inscriptions; excellent coverage; commercial-use restriction is broad (any compensation, even by a non-profit): if the site ever sells anything or carries ads, HMDB-derived content must go.
- **Depends on:** SRC-38
- **Risks:** Broad non-commercial clause
- **Priority:** P2
- **Effort:** S (link-out) / M (with permission)

### SRC-40 - American Battlefield Trust (ABT)

Publisher: American Battlefield Trust. Category: advocacy-site.

- **URLs:**
  - terms: https://www.battlefields.org/about/accountability/terms-service (last updated October 2025)
  - cite: https://www.battlefields.org/learn/articles/how-cite-american-battlefield-trust
  - gettysburg: https://www.battlefields.org/learn/civil-war/battles/gettysburg
- **Format:** HTML, videos, animated maps
- **Size:** n/a
- **API limits / access:** None; scraping prohibited.
- **License / rights statement:** Terms of Service (fetch-summarizer quotes): content 'proprietary property of American Battlefield Trust or our licensors or users'; 'limited, nonexclusive, nontransferable, nonsublicensable license ... for your own personal use'; prohibited: 'sell, resell or use commercially', 'data mining, robots or similar data gathering, web scraping, web harvesting, web data extraction', 'use ... for artificial intelligence technologies such as large language models, generative AI', 'download (other than the page caching) any portion of the Sites'; allowed: 'text hyperlink to the Sites for noncommercial purposes' but no logos or 'framing techniques' without written consent. Citation page: 'These conventions do not imply any permissions to re-post or re-use American Battlefield Trust materials without express consent from the Trust.'
- **Rights statement URL:** https://www.battlefields.org/about/accountability/terms-service
- **Evidence quality of the rights reading:** fetch-summarizer (re-read exact ToS before quoting publicly)
- **Rights tier:** C (link-out only; explicit AI/scraping ban)
- **Extraction / normalization method:** Text hyperlinks only: 'Learn more at American Battlefield Trust' on relevant answers. Do NOT feed ABT text to the retrieval index or any LLM. ABT-published casualty figures (US 23,049; CS 28,063; total 51,112 per the Gettysburg page) may be cited as facts with attribution, but prefer NPS/CWSAC or OR-derived figures.
- **Record counts:** n/a
- **Historian questions it enables:**
  - Outbound learning links (animated maps, biographies)
- **Quality notes:** High-quality educational content, but rights-restricted. Numbers differ from NPS round estimates (23,000/28,000): present as ranges.
- **Risks:** Any ingestion breaches ToS
- **Priority:** P2 (link-out)
- **Effort:** S

### SRC-41 - Stone Sentinels (gettysburg.stonesentinels.com) and companion sites; Emerging Civil War; Gettysburg Compiler; Gettysburg Daily

Publisher: Steve A. Hawks (Stone Sentinels: '(c)2026 Steve A. Hawks'); Emerging Civil War; Gettysburg College students; Gettysburg Daily. Category: enthusiast-sites.

- **URLs:**
  - stone_sentinels: https://gettysburg.stonesentinels.com/
  - compiler: https://gettysburgcompiler.org/
  - gettysburg_daily: https://www.gettysburgdaily.com/
  - ecw_weather: https://emergingcivilwar.com/2023/02/22/the-thunder-seemed-tame-weather-at-the-battle-of-gettysburg/
- **Format:** HTML
- **Size:** n/a
- **API limits / access:** None.
- **License / rights statement:** Copyright reserved by the authors ('(c)2026 Steve A. Hawks' is the only statement on the Stone Sentinels home page). No reuse license found.
- **Rights statement URL:** https://gettysburg.stonesentinels.com/
- **Evidence quality of the rights reading:** stone sentinels via fetch; others by URL check only
- **Rights tier:** C (link-out only)
- **Extraction / normalization method:** Curated 'Further reading' outbound links; the existing site already cites Stone Sentinels in 3 monument entries in data/monuments.json (source: 'Stone Sentinels: State of Indiana monument' etc.): keep as citation, do not copy text/photos.
- **Record counts:** n/a
- **Historian questions it enables:**
  - Farm/monument background reading (outbound)
- **Quality notes:** Very useful monument photographs and farm histories; rights-restricted.
- **Priority:** P3
- **Effort:** S

### SRC-42 - Gettysburg College Special Collections (GettDigital, Cupola), Adams County Historical Society (Gettysburg History), Gettysburg Foundation

Publisher: Musselman Library; Gettysburg History (ACHS); Gettysburg Foundation. Category: local-archives.

- **URLs:**
  - gettdigital: https://gettdigital.gettysburg.edu/ (Quartex portal; robots disallows /login and /cms)
  - special_collections: https://www.gettysburg.edu/special-collections/
  - cupola: https://cupola.gettysburg.edu/
  - achs: https://gettysburghistory.org/research/
  - foundation: https://www.gettysburgfoundation.org/
- **Format:** Quartex/CONTENTdm-style item pages; research-room finding aids
- **Size:** ACHS: 'more than one million historic items' (ACHS page)
- **API limits / access:** No public APIs verified.
- **License / rights statement:** ACHS (read directly): 'Reproduction of any of the materials found below is prohibited without the express permission of Gettysburg History.' GettDigital: item-level Copyright/Terms pages exist in the footer (not read).
- **Rights statement URL:** https://gettysburghistory.org/research/
- **Evidence quality of the rights reading:** ACHS page text read directly; GettDigital home page read (no item-level rights read)
- **Rights tier:** C until permission (outbound links) 
- **Extraction / normalization method:** Outreach plan: email Special Collections + ACHS asking permission to (a) index item titles/abstracts and link out, (b) reproduce 5-10 selected letters/diaries with credit. Until then link-out only.
- **Record counts:** n/a
- **Historian questions it enables:**
  - Civilian and soldier letters/diaries with archival credit (after permission)
  - Damage Claims Index (ACHS)
- **Quality notes:** Best local primary material, but access requires partnership; ACHS research room is open Thu-Sat with fees (page).
- **Risks:** Do not scrape GettDigital
- **Priority:** P2
- **Effort:** M (outreach)

### SRC-43 - Prisoner-of-war and hospital records related to Gettysburg (Fort McHenry table in CWSS; Fort Delaware Society; NARA registers)

Publisher: NPS CWSS (mirror), Fort Delaware Society, NARA, FamilySearch. Category: records.

- **URLs:**
  - cwss_fortmchenry: https://jrnold-nps-cwss.s3.amazonaws.com/new/tsv/Prisoners_FtMcHenry.tsv (850,570 B)
  - fort_delaware_society_queries: http://www.fortdelaware.org/Prisoner%20&%20Garrison%20Queries.htm (found via search; not fetched)
- **Format:** TSV (PRM_TYPE PW/PP, PRM_NAME, PRM_REGISTRATIONDATE, PRM_RESIDENCE (unit), PRM_DISP, PRM_NOTES)
- **Size:** ~0.85 MB (about 5,000 rows, estimate 850,570 B / ~170 B per row)
- **API limits / access:** Not applicable.
- **License / rights statement:** CWSS-derived (SRC-10 caveats). Fort Delaware Society answers individual queries by email (no bulk terms known). NARA registers viewable free at NARA facilities.
- **Evidence quality of the rights reading:** two sample rows read: e.g. 'PW Crudup, A.D. 1863-10-22 47 NC ... Gettysburg 07/03/63'
- **Rights tier:** A-pending (SRC-10) / C (Fort Delaware DB)
- **Extraction / normalization method:** Filter PRM_NOTES for 'Gettysburg' (count unknown; measure) to build a 'Confederates captured at Gettysburg held at Fort McHenry' lookup; link to NPS record.
- **Record counts:** Gettysburg-note subset UNKNOWN (measure)
- **Historian questions it enables:**
  - Was my Confederate ancestor captured at Gettysburg? (partial: Fort McHenry only)
- **Quality notes:** Only one prison's register; many Gettysburg prisoners went on to Fort Delaware/Point Lookout/Johnson's Island; note completeness limits explicitly.
- **Depends on:** SRC-10
- **Risks:** Sensitive: present neutrally
- **Priority:** P2
- **Effort:** M

### SRC-44 - WarOfTheRebellion annotated corpus (University of Texas at Austin, MIT)

Publisher: UT Austin (Grant DeLozier et al.; GeoAnnotate). Category: nlp-corpus.

- **URLs:**
  - github: https://github.com/utcompling/WarOfTheRebellion
  - docgeo_json: DocGeo/wotr-docgeo-jan-5-2016-625pm-by-vol.json (19,679,249 B) and ...80-0-20-by-split.json (19,671,062 B)
  - toponym_json: Toponym/json/wotr-topo-train.json (8,603,222 B), wotr-topo-test.json (1,935,679 B)
- **Format:** JSON: spans of corrected OCR text by OR volume with GeoJSON points/polygons and named entities (person, org, place)
- **Size:** ~50 MB total JSON (2,275 files in the repo)
- **API limits / access:** GitHub raw.
- **License / rights statement:** MIT License, (c) 2016 University of Texas at Austin (LICENSE file read directly) - permits use/copy/modify/publish.
- **Rights statement URL:** https://github.com/utcompling/WarOfTheRebellion
- **Evidence quality of the rights reading:** README + license read directly
- **Rights tier:** A/B (MIT: keep notice)
- **Extraction / normalization method:** Use as (1) a geographic-entity training/lookup resource to geotag OR place mentions; (2) possible corrected-OCR text if it includes volume 27 (UNVERIFIED - the volume coverage was not inspected).
- **Record counts:** repo has 2,275 files; span counts UNKNOWN
- **Historian questions it enables:**
  - Toponym resolution for OR passages (Pfanz-style local names still need a local gazetteer)
- **Quality notes:** Sparse local Gettysburg place names (Peach Orchard, Devil's Den) are unlikely to be in a national gazetteer: use SRC-38/SRC-01 lists.
- **Depends on:** SRC-19
- **Priority:** P2
- **Effort:** M

### SRC-45 - Other GitHub / Kaggle / Zenodo / Civil War Data 150 searches (negative results)

Publisher: various. Category: negative-results.

- **URLs:**
  - github_search: https://api.github.com/search/repositories?q=gettysburg (264 repos; none data-focused)
  - zenodo: https://zenodo.org/api/records?q=gettysburg (124 hits; top 20 by recency irrelevant)
  - cwd150: https://www.civilwardata150.net/ (site returns 200; linked-data project; downloadable dataset NOT verified)
  - rejected_gpl: https://github.com/AdmiralEM/dataset-civil_war_records (GPL-3.0; OR volumes 1-4 only)
- **Format:** n/a
- **Size:** n/a
- **API limits / access:** GitHub unauthenticated search: 10 requests/min (observed rate_limit resource: search limit 10).
- **License / rights statement:** n/a
- **Evidence quality of the rights reading:** searches run 2026-09-30; single-word GitHub queries worked, multi-word AND queries returned 0 (query syntax), Kaggle not directly searchable without a login/API key (web search found no dataset)
- **Rights tier:** n/a
- **Extraction / normalization method:** Conclusion: no ready-made Gettysburg order-of-battle JSON/CSV, regiment roster dataset, or casualty-by-regiment table exists on GitHub/Zenodo that is better than SRC-05/10/11/19/20. AdmiralEM's OR dataset stops at volume 4 (not Gettysburg; GPL-3.0 would also copyleft the corpus). mbaker21231/CivilWarSurgeryPublic (Dr. Edmund Andrews surgery data) exists (search result) but was NOT inspected.
- **Record counts:** n/a
- **Quality notes:** Kaggle search UNVERIFIED (no key/login used). Re-check with an authenticated Kaggle API before ruling out.
- **Priority:** -
- **Effort:** S (re-check)

### SRC-46 - Freesound and other audio (cannon/ambience) - media rights

Publisher: Freesound (Music Technology Group, UPF). Category: audio.

- **URLs:**
  - faq: https://freesound.org/help/faq/
- **Format:** WAV/MP3/OGG + per-sound licence
- **Size:** n/a
- **API limits / access:** API key required (not verified).
- **License / rights statement:** Freesound (fetch-summarizer): CC0 (do 'pretty much what you want ... could even sell'), CC BY (credit creators), CC BY-NC (no earning money; commercial use prohibited), Sampling+ (retired).
- **Rights statement URL:** https://freesound.org/help/faq/
- **Evidence quality of the rights reading:** fetch-summarizer
- **Rights tier:** A (CC0) / B (CC BY) / C (CC BY-NC)
- **Extraction / normalization method:** For Immersive/cannon audio: allowlist CC0 and CC BY only; record sound id, author, license, URL in /sources.html; avoid CC BY-NC even if the site is non-commercial today (future monetization risk).
- **Record counts:** n/a
- **Historian questions it enables:**
  - Ambient/cannon sound for the immersive page with lawful credit
- **Quality notes:** Recordings of modern reproduction cannon are not 1863 acoustics: label as 'modern recording'.
- **Priority:** P3
- **Effort:** S

---

## 5. Crosswalk design (one key for every source)

One row per site unit so every source joins on the same key; enables 'who was in the 20th Maine?', OR-report tagging, monument-to-unit links, and DBpedia/Wikipedia links.

**Keys**

- `site_id`: regiment_id in data/oob/*.json, e.g. U-20ME, C-2SC, U-1ME-CAV (467 units incl. batteries per site UI; 487 dict rows counted when iterating the OOB files: 279 'U', 196 'C', 12 without id)
- `cwss_unit_code`: e.g. UME0020RI (Union Maine 20th Regiment Infantry), CVA0021RC (Confederate Virginia 21st Cavalry), UNY0071RI, UPA0028RI, UCT0002YAL (2nd Independent Battery CT Light Artillery)
- `dbpedia_uri`: nps_units.csv column, present for 1,163 of 7,011 units
- `nps_oob_string`: e.g. '19th Indiana Infantry- Col. Samuel J. Williams' from the NPS pages
- `or_alias_table`: hand-curated ordinal spellings: Twentieth Maine / 20th Me. / 20th Maine Vol. Inf.
- `monument_ids`: site monument 'no' (1-512) and mn ('MN 267'); OSM osm_id; HMDB db m<ID>

**Algorithm**

1. parse site_id with ^(U|C)-(\d+)([A-Z]{2})(?:-(CAV|ART|SS|SHARP))?$ -> side, ordinal, state
1. cwss_unit_code = side + STATE + zero_pad(ordinal, 4) + arm  where arm: infantry RI, cavalry RC, heavy artillery RAH; (verify arm code inventory from Regiments_Unitz.tsv REG_ARM/REG_TYPE)
1. batteries and independent units ('2nd Independent Battery, Connecticut Light Artillery' = UCT0002YAL; Confederate battery names like 'Carter's Battery'): fuzzy name match to Regiments_Unitz REG_UNIT_NAME + manual review CSV
1. US Regulars (site group 'United States Regular & Sharpshooter Units', 23 monuments) map to UUS.... codes: manual
1. emit crosswalk.csv + unmatched.csv; unit-test: >= 99% of infantry/cavalry matched automatically; every batteries row human-reviewed; CI fails if a site id disappears

**Reconciliation checks**

- site ~279 U- ids vs Dyer/NPS 300 Union units at Gettysburg (nps_battle_units PA002): list symmetric difference; investigate each
- site commander names vs NPS AoP/ANV OOB pages (352 + 265 unit-like lines by regex)
- site casualty numbers vs Fox 1889 for Union regiments (P1)

---

## 6. What each question needs (question matrix / eval seed)

| Question | Mode | Sources | Answerability | Guardrail |
|---|---|---|---|---|
| Who was in the 20th Maine? | structured lookup | SRC-10 roster shard UME0020RI; SRC-05 commanders; SRC-21 Dyer history; SRC-22 Maine at Gettysburg; SRC-19 OR report | exact for index-card roster ('served in the regiment 1861-65'); NOT proof of presence at Gettysburg | always print the caveat + link to NPS CWSS + Fold3/FamilySearch search (link-out) |
| Was my ancestor John Lacey at Gettysburg with the 71st New York? | name lookup + evidence | SRC-10; SRC-20 Fox losses; SRC-19 OR returns | partial: can say he appears on 71st NY cards; presence at Gettysburg needs muster/casualty records | no inference from regiment membership to battle presence without a returns citation |
| What did civilians see and hear? | passage retrieval | SRC-23 Pierce/Buehler/Hoke/Jacobs/Bates; SRC-05 civilians article; SRC-24 weather | evidence-based, subjective | cite witness + writing date; label retrospective |
| How deep was the wheat at the Wheatfield? | evidence synthesis (no direct data) | SRC-28 damage claims (acres); SRC-27 1860 Ag census (county totals); SRC-19/22 soldier descriptions; SRC-01 CLR (Rose farm); SRC-24 weather | NO dataset records stalk height; answer only with what witnesses said (e.g., crop state: standing vs harvested) and explicitly state that height is unknown | refuse to invent a number; show each snippet with author and date |
| Could Lee see Little Round Top from Seminary Ridge? | computation | SRC-29 DEM viewshed; SRC-16 woods (1868-76 maps); SRC-01 1863 woodlots | terrain-only yes/no; vegetation blockers uncertain | show assumptions (observer height, no trees vs trees) |
| What was the weather when Pickett's Charge began? | table lookup | SRC-24 | 3 readings/day; 2 pm reading 87 F (verify primary) | state station is in town and readings are 7 am/2 pm/9 pm |
| When did Longstreet's assault start? | evidence table | SRC-19 OR reports; SRC-22 regimental narratives; SRC-34 Wikipedia (context) | range of participant claims (~4 pm is the standard scholarly consensus but the historian must show reports) | ties to audit C4; display distribution of times in reports |
| Which monuments are near the Angle? | geo lookup | site 512 monuments; SRC-38 OSM 867; SRC-01 1907 book; SRC-39 HMDB links | exact for included coordinates | show provenance and 'location approximate' badge |
| Who commanded the Iron Brigade and what happened to him? | structured lookup | SRC-05 OOB (Meredith w; Robinson); SRC-34 bio | exact | cite NPS page + retrieval date |
| What did the newspapers say on July 4, 1863? | passage retrieval | SRC-15 Chronicling America (437 pages Jul 3-10) | what the press reported | label as contemporary reports (often wrong) |
| How many acres of wheat did the Trostle farm lose? | fact lookup | SRC-06 / SRC-28 | 27 acres wheat destroyed ($600) per claim | claim, not measurement |
| Where is Private X buried? | table lookup | SRC-25 cemetery reports | Union burials in Soldiers' National Cemetery only | state that Confederate dead were removed to the South in the 1870s (verify wording from the source) |
| How steep is Culp's Hill? | computation | SRC-29 | exact for today's terrain | label 'today's ground' |

---

## 7. Image / audio / media rights for the feature

| Media | Source | Rights | Action | How verified |
|---|---|---|---|---|
| 1863 photographs (Gardner, O'Sullivan, Brady studio) | LoC Prints & Photographs (SRC-15) | LoC does not own rights; 1863 photos are public domain by age but the researcher must assess each item; keep the LoC credit line and call number | Store lccn/URL + credit; check Rights Advisory field per item | LoC item JSON rights text read |
| Historic maps (Bachelder, Warren, GBMA, 1858 county map) | LoC Geography & Map (SRC-15/16) | Free to use and reuse unless Rights Advisory present; credit line 'Library of Congress, Geography and Map Division' | Credit line in the map layer attribution | item JSON rights text read |
| Newspapers 1863 | Chronicling America | Public domain or no known copyright restrictions (LoC statement) | Cite title/date/page URL | item JSON rights text read |
| NPS photos, diagrams, museum objects | nps.gov, museum.nps.gov, NPGallery | NPS-created works public domain; third-party items marked; some pages embed LoC or donor images | Item-level check; credit 'NPS Photo' where shown | NPS disclaimer via summarizer |
| Wikimedia Commons photos of monuments and tablets | Commons (SRC-36) | Per-file licenses (PD, CC0, CC BY, CC BY-SA...) | Build-time allowlist + credit string beside each image; reject NC/ND/GFDL-only | category counts read; license rule from Wikipedia reuse page |
| Portraits and objects | Smithsonian Open Access (SRC-33) | CC0 rows only (sample rows show CC0) | Filter access==CC0 | API rows read |
| Audio (cannon, ambience) | Freesound (SRC-46) | CC0 / CC BY / CC BY-NC per sound | CC0 and CC BY only; credits page | FAQ via summarizer |
| Text-to-speech read-aloud of answers | Browser SpeechSynthesis | No third-party media rights issue; voices vary by device | None | n/a |
| ABT maps/videos/photos | battlefields.org (SRC-40) | Proprietary; ToS forbids scraping, downloading, framing, AI use | Text links only | ToS via summarizer |
| HMDB photos and inscriptions | hmdb.org (SRC-39) | Copy with attribution for non-commercial use; commercial use needs written permission; some images restricted | Link-out; ask permission for datasets | copyright page read directly |
| Fold3 / Ancestry / Find a Grave / FamilySearch images | SRC-14 | Automated access and AI use prohibited by terms | User-initiated outbound links only | Ancestry terms text read directly; FamilySearch via summarizer |
| Google Maps / Street View imagery (already used by the site) | Google | Not researched here | Keep to official embeds; do not cache or scrape; verify current Google Maps Platform terms (open question) | NOT verified |
| Mapbox tiles/terrain (already used) | Mapbox (SRC-31) | Terrain-DEM: SDK-only; attribution required | No tile export; verify product terms before promoting Cinematic Export of map video | doc via summarizer; ToS clause NOT found |
| Site-authored vignettes and historian copy | Owner | Owner copyright; sources cited in JSON metadata include copyrighted books (Busey & Martin 1994, Pfanz, Desjardin, Moe, Hessler) | Governance review: facts vs. expression; add LICENSE/NOTICE; (not legal advice) | data/oob/*.json metadata.sources read |

### 7.1 Gaps and negative results

| ID | Gap | Evidence | Workaround |
|---|---|---|---|
| G-01 | No public NPS GIS for monuments, tablets, cannon positions, fences, orchards or woodlots (only tracts, geology, vegetation, C-CAP, and 7 GETT POIs / 55 roads / 480 trails). | SRC-02/03 measured counts; Hub search for 'gettysburg' returned no NPS monument layer | OSM (867) + 1907 book + NPS CLR inventories + georeferenced Warren/Bachelder maps; ask GNMP Research Center for a monument/cannon inventory (contact via research-center page) |
| G-02 | Dyer/NPS battle-unit table lists ZERO Confederate units at Gettysburg (PA002 = 300 Union units only). | nps_battle_units.csv PA002 rows: 300, belligerent all 'US', src all 'DYER' | NPS ANV OOB page + OR Vol 27 pt 2 + site OOB |
| G-03 | Gettysburg National Cemetery burials are not in the CWSS mirror (Cemeteries_Info has 5,672 rows, none mention Gettysburg). | streamed count on 2026-09-30 | Soldiers' National Cemetery reports 1864/65 (SRC-25); Find a Grave link-out only |
| G-04 | No dataset gives regiment 'present at Gettysburg' rosters (who actually marched), only service index cards. | CWSS records origin: index cards from muster rolls | Caveat + returns/casualty lists; do not claim presence |
| G-05 | CWSS mirror is a snapshot (2012/2015) by a third party; NPS says the site 'is no longer maintained'. | NPS overview page; bucket LastModified 2015-12-13 | Copy needed shards into owner's storage; seek NPS written confirmation and any newer export |
| G-06 | 1863 vegetation/fence data are interpretations (CLR) or 1868+ maps; no 1863 survey. | Warren survey 1868-69; CLR period of significance 1863-1938 | Label provenance; show uncertainty |
| G-07 | Camp Letterman patient roster: none found (weak forum evidence). | civilwartalk thread quoted in search (unverified) | Do not promise; link NMCWM article |
| G-08 | Adams County damage-claims data is not available in bulk. | ACHS: reproduction prohibited; PA Archives volumes not digitized (unverified) | Permission + selective transcription |
| G-09 | Kaggle and DPLA were not directly checked (no key/login; DPLA docs returned 403). | fetch results | Owner-authenticated re-check (S) |
| G-10 | Sarah Broadhead diary and Gutenberg-hosted memoirs not verified (Gutendex/Gutenberg search timed out or returned 503/504). | tool errors 2026-09-30 | Re-run later; IA title search did not find the Broadhead diary |

### 7.2 Build-time rate budget

All third-party fetches happen at BUILD time in CI/local scripts with a descriptive User-Agent and on-disk cache; the shipped Historian makes zero third-party requests (keeps CSP connect-src 'self' and privacy page simple).

- loc.gov JSON API: 20 req/min -> target 12 req/min (1-hour block on violation)
- loc.gov text/image services: 150 req/min -> target 60/min
- Wikimedia APIs: 200 req/min with contact User-Agent (10/min unidentified) -> target 60/min
- NPS Data API: 1,000 req/hour per key -> target 500/hour
- NARA Catalog API: 10,000 queries/month per key -> target <2,000/month
- Internet Archive: unpublished -> 1 req/s, sequential downloads
- Overpass: fair-use -> 1 query per build
- GitHub API (unauthenticated): 60 core/hr and 10 search/min -> use raw.githubusercontent.com
- S3 (jrnold-nps-cwss): anonymous; stream once and cache slices

## 8. Compliance implementation on a static site (CC BY-SA, ODbL, CC BY, MIT)

**Wikipedia / Commons (CC BY-SA 4.0 and per-file licenses)**

- Store Wikipedia-derived text only in `data/ext/wikipedia_excerpts.json`, one record per excerpt: `{id, title, revid, permalink, retrieved, license:"CC BY-SA 4.0", license_url:"https://creativecommons.org/licenses/by-sa/4.0/", modified:true|false, text}`; ship a `LICENSE-CC-BY-SA-4.0.txt` next to it.
- Render each excerpt as its own labeled block: `Source: Wikipedia, "<title>", revision <revid> (link), CC BY-SA 4.0 (link). Excerpted/condensed.` The Wikipedia reuse page (fetch-summarizer) accepts a hyperlink to the article/stable copy or an author list, requires that modifications be shared under CC BY-SA 4.0 or later, requires a change note and a license notice with a link.
- **Never blend** Wikipedia sentences into composed answers or the site's own vignettes: a composed answer would be an adaptation and pull the share-alike obligation onto it. The answer composer must output excerpt blocks (quote-only) or restate facts in the site's own words from Tier A sources.
- `/sources.html` lists each article + permalink + retrieval date; the article history page is the author list.
- Commons images: build-time allowlist on `extmetadata.LicenseShortName`; caption "Photo: <Artist>, <License>, via Wikimedia Commons" linking the file page; reject NC/ND/"GFDL only"/fair-use.

**OpenStreetMap (ODbL 1.0)**

- Ship OSM-derived monuments as their own file (`data/ext/monuments_osm.geojson`) with `LICENSE-ODbL.txt` and a notice "Contains information from OpenStreetMap, which is made available under the Open Database License (ODbL). (c) OpenStreetMap contributors." Add a custom attribution entry to the map's attribution control whenever the layer is visible.
- Two options: **(1, lowest risk)** use OSM only to *validate* the site's 512 coordinates and to *propose* candidates; take corrected coordinates from PD sources (1907 NPS book, NPS monument pages, own field/orthophoto check) and keep OSM-derived rows in the separate ODbL file; **(2)** merge and publish the merged monument database itself under ODbL. Recommendation: option 1. (Not legal advice.)

**ACW Battle Data (CC BY 4.0)**: credit line "Arnold, J. B., American Civil War Battle Data (v14), figshare, doi:10.6084/m9.figshare.1515995, CC BY 4.0" in `/sources.html`.

**WarOfTheRebellion corpus (MIT)**: keep the MIT license text and "Copyright (c) 2016, University of Texas at Austin" in `THIRD_PARTY_LICENSES.md`.

**Government sources (NPS/USGS/LoC/Census)**: credit lines as requested by each agency (NPS "appreciated"; USGS "U.S. Geological Survey"; LoC "Library of Congress, Geography and Map Division").

**HMDB link chips**: link only; if any HMDB facts are displayed add "From HMdb.org".

## 9. Pipeline, delivery, and size budgets

```
historian-data/                      (lives in the real source repo once N1 is fixed)
  sources.yaml                       registry: tier, license, attribution, rights_url
  sources.lock.json                  url, retrieved_at, sha256, bytes, license snapshot
  fetch/*.py                         one script per source; obey RATE_BUDGET; User-Agent
                                     "GettysburgInteractiveMapBuild/1.0 (+https://gettysburginteractivemap.com/terms.html; contact <owner>)"
  raw/                               git-ignored downloads (PDFs, TSV, JSON)
  normalize/*.py                     -> normalized/*.jsonl (evidence records, crosswalk, roster rows)
  qa/*.py                            schema, tier gate, license allowlist, OCR/number sampling
  build/                             -> site data/historian/ (content-hashed shards + manifest)
```

**Evidence-record schema (JSONL, one per retrievable passage/row/feature):**

```json
{
  "id": "OR27-1-p0622-r0007-s014",
  "source_id": "SRC-19",
  "kind": "report_passage",
  "text": "...",
  "citation": {"short": "O.R., Ser. I, vol. 27, pt. 1, p. 622", "url": "https://archive.org/details/warofrebellion271unit", "locator": {"page": 622}},
  "date": {"day": 2, "clock_text": "about 4 p. m.", "minutes": 960, "time_confidence": "stated"},
  "unit_ids": ["U-20ME"], "place_ids": ["LOC-003"], "people": ["Joshua L. Chamberlain"],
  "author": "...", "written": "1863-07-06", "retrospective": false,
  "license": "PD-US-Gov", "tier": "A", "attribution": null
}
```

**Size budgets (ESTIMATES until Phase 0 measures them):**

| Corpus | Raw | Shipped (brotli, est.) | Delivery |
|---|---|---|---|
| Roster shards (420k-700k cards; 467 shards) | 25-42 MB | 6-12 MB total; 13-26 KB per shard | lazy per regiment |
| Surname-prefix index | ~4-6 MB | 1-2 MB | lazy per prefix |
| OR Vol 27 passages + inverted index | 11.3 MB OCR | 3 MB text + 2-3 MB index | worker, lazy after first query |
| State volumes + Vanderslice + Dyer | 10-15 MB | 3-4 MB | lazy |
| Newspapers (select ~300 pages) | 3-8 MB | ~3 MB | lazy, optional |
| Monuments (site 512 + OSM 867) | <0.5 MB | <0.15 MB | on monument view |
| 3DEP grid (5 m, 16-bit PNG) | ~9 MB | 3-5 MB PNG | only on viewshed page |
| Optional embeddings (384-d int8, ~40k passages) | ~15 MB | ~15 MB | opt-in phase |

Total lazy payload target: <= 40 MB brotli, **zero** added to first paint. The current Historian page fetches 15 files / 317,788 bytes eagerly (`historian.html:67-79`); replace with `manifest.json` (<= 5 KB) + on-demand shards + a Web Worker for search so INP stays green (audit P1). Shards get content-hashed names and `Cache-Control: immutable` (same rule the site already uses for hashed assets). All third-party fetching is build-time; runtime CSP `connect-src 'self'`.

---

## 10. Plan items (findings)

Effort scale: S < 0.5 d, M 0.5-2 d, L 2-5 d, XL > 5 d. Severity here reflects risk/value to the Historian expansion (no item below is a live-site outage).

### hist-sources-2-01 - Source registry and rights-tier gate (enforced in CI)
- **Severity:** high. **Effort:** M. **audit_refs:** [H8]
- **Evidence:** `historian.html:48` ("answers only from this site's own published data ... 467 regimental records, 24 narrative vignettes, 137 chronology events, and 30 mapped terrain features"); `data/oob/union_regiments_i_ii_corps.json:7-8` (free-text `sources` incl. "Busey, John W. and Martin, David G. -- Regimental Strengths and Losses at Gettysburg (Longstreet House, 1994)"); `bundle.pretty.js:104437-110597` (512 monuments, `src: ""` on 503 of them).
- **Root cause:** no per-record provenance or license model; no attribution surface; nothing prevents a Tier C source (ABT, Ancestry family) from entering a future index.
- **Fix:** add `historian-data/sources.yaml` (schema in section 3), `qa/tier_gate.py` (fail if any output record lacks `source_id`/`license`, or references a tier-C id, or a tier-B record lacks `attribution`), and a generator for `/sources.html`. Add `THIRD_PARTY_LICENSES.md`.
- **Acceptance test:** `python qa/tier_gate.py` fails on a synthetic record with `source_id: SRC-40`; passes on the real build; `/sources.html` lists every source id with license link and retrieval date; 100% of Historian answers show a source chip.
- **Moves:** Legal/privacy B+ -> A; content trust; supports Historian rebrand (H8). **Depends on:** none.

### hist-sources-2-02 - Phase-0 permissions and confirmations (written)
- **Severity:** high. **Effort:** S (owner emails, ~2 h) + waiting time. **audit_refs:** []
- **Evidence:** NPS CWSS page: "This database is no longer maintained and updated." (`https://www.nps.gov/civilwar/soldiers-and-sailors-database.htm`, fetched 2026-09-30); mirror README has no license and GitHub API `license: None` (`https://github.com/jrnold/cwss`); ACHS: "Reproduction of any of the materials found below is prohibited without the express permission of Gettysburg History." (`https://gettysburghistory.org/research/`); HMDB copyright page para. 3 (commercial use needs written permission).
- **Root cause:** several high-value sources have unclear or restrictive rights and depend on third-party goodwill.
- **Fix:** send four short emails and file the replies under `legal/`: (1) NPS (via `https://www.nps.gov/aboutus/contactus.htm`): confirm public-domain status of CWSS data for redistribution as derived, per-regiment roster shards, ask whether a newer export exists; (2) GNMP Research Center (`https://www.nps.gov/gett/learn/historyculture/research-center.htm`): ask for any monument/marker/cannon/tablet inventory or GIS; (3) HMDB (optional): written permission for a derived 1,227-record link/coordinate dataset; (4) Gettysburg History (ACHS) and Musselman Library Special Collections: permission to link/index titles and to reproduce 5-10 items with credit.
- **Acceptance test:** each reply is stored with date; `sources.yaml` tier updated (A-pending -> A, or record removed); no shard built from SRC-10 is published before the NPS reply.
- **Moves:** unblocks 04, 09, 25. **Depends on:** none.

### hist-sources-2-03 - Unit crosswalk (site id <-> CWSS/Dyer code <-> DBpedia <-> OOB page <-> monuments) with reconciliation report
- **Severity:** high. **Effort:** L (infantry/cavalry S-M; batteries/independents/regulars L). **audit_refs:** [H10]
- **Evidence:** site ids `U-20ME`, `C-2SC`, `U-1ME-CAV` (`data/oob/*.json`; 487 list rows iterated: 279 `U-`, 196 `C-`, 12 without id such as corps artillery brigades); CWSS codes `UME0020RI`/`CVA0021RC`/`UCT0002YAL` (sampled from `Soldiers_Personz.tsv`, `Regiments_Unitz.tsv`, `nps_units.csv`); NPS/Dyer PA002 has 300 Union units and 0 Confederate (`nps_battle_units.csv`); `nps_units.csv` has 7,011 units of which 1,163 carry `dbpedia_uri`.
- **Root cause:** every source names units differently; no shared key exists, so cross-source questions cannot be answered and count drift (467 vs "445+", audit H10) cannot be tested.
- **Fix:**
  ```python
  ID_RE = re.compile(r'^(?P<side>[UC])-(?P<num>\d+)(?P<st>[A-Z]{2})(?:-(?P<arm>CAV|ART|SS))?$')
  ARM = {None: 'RI', 'CAV': 'RC'}            # extend after inventorying Regiments_Unitz REG_ARM/REG_TYPE
  def cwss_code(site_id):
      m = ID_RE.match(site_id)
      if not m or m['arm'] in ('ART', 'SS'): return None     # -> fuzzy name match + manual review
      return f"{m['side']}{m['st']}{int(m['num']):04d}{ARM[m['arm']]}"
  ```
  Emit `crosswalk.csv` (site_id, cwss_code, dbpedia_uri, nps_oob_string, or_alias_list, monument_nos) and `unmatched.csv`; add `qa/test_crosswalk.py`.
- **Acceptance test:** >= 99% of infantry/cavalry rows auto-matched; every battery/regular row human-reviewed and committed; symmetric-difference report vs the 300 Dyer/NPS Union units committed; CI fails when a site id has no crosswalk row.
- **Moves:** content consistency (H10); unlocks 04, 05, 07, 14. **Depends on:** none.

### hist-sources-2-04 - CWSS roster shards and real ancestor lookup
- **Severity:** high. **Effort:** XL (ETL L + battery crosswalk in 03 + UI M). **audit_refs:** [H5]
- **Evidence:** `find-ancestor.html:48` ("Search by state, or by a commander's surname ... which of the 467 ... regiments and batteries ... your ancestor may have served in"); mirror table `Soldiers_Personz.tsv` 1,194,562,274 B; sampled rows e.g. `James / Lacey / U / 71 N.Y. Infantry. / UNY0071RI / I / Corpl. / CPL ...`; Confederate rows e.g. `John S.E. / McGee / C / 21 Virgnia Cavalry, (Peters' Regiment) / CVA0021RC / E,K / Private / PVT ...`.
- **Root cause:** the site holds no soldier-level data, so it can only guess from commander names.
- **Fix:** (1) copy the needed slice of the mirror into the owner's own storage after 02; (2) stream-filter:
  ```python
  keep = set(crosswalk_codes)                        # ~467 units
  for row in csv.reader(open_stream('Soldiers_Personz.tsv'), delimiter='\t'):
      if row[4] in keep and row[18] == 'False':      # PER_UNIT_CODE, PER_ISDELETE
          shard[row[4]].append([row[1].strip(), row[0].strip(), row[5], row[7], row[9], alias(row[10])])
  ```
  (3) write `data/historian/roster/<site_id>.<hash>.json` = `{"u":"U-20ME","code":"UME0020RI","cards":[[last,first,company,rank_in,rank_out,alias],...]}` + `index/<3-letter-prefix>.<hash>.json` mapping to `[unit_index, count]`; (4) UI (Find Ancestor page): surname (+ optional first name, state) -> list of matching cards grouped by regiment, each linking to the regiment page, with a fixed caveat: "This is an index card of service in this regiment sometime 1861-65. It does not by itself show he was present at Gettysburg." plus outbound links to NPS CWSS, Fold3, FamilySearch, Find a Grave (Tier C, user-initiated).
- **Acceptance test:** searching known names returns them in the right unit (commanders printed on the NPS OOB pages: Chamberlain in 20th Maine, Dawes in 6th Wisconsin, Fairchild in 2nd Wisconsin, Colvill in 1st Minnesota, Oates in 15th Alabama, Burgwyn in 26th North Carolina - all confirmed present on `aop-orderofbattle.htm` / `anv-orderofbattle.htm` on 2026-09-30, absence from the cards would flag a crosswalk or filter bug); median shard <= 30 KB brotli; a query fetches <= 4 shards; Chrome trace shows INP < 200 ms on a mobile profile; page adds 0 bytes to first load.
- **Moves:** function/content depth (A -> A+), Ancestor feature honesty. **Depends on:** 02, 03.

### hist-sources-2-05 - Official Records Vol. 27 ingestion (report passages with time evidence)
- **Severity:** high. **Effort:** L. **audit_refs:** [C4]
- **Evidence:** IA items `warofrebellion271unit` (1,190 pp; 3,970,479 B OCR), `warofrebellion272unit` (1,132 pp; 3,880,513 B), `warofrebellion273unit` (1,256 pp; 3,406,041 B); site labels: `data/chronology_day2.json:23` tick 256 "7:30am" "LONGSTREET'S ASSAULT BEGINS"; `data/chronology_day3.json:35` tick 538 "11:05am" "PICKETT'S CHARGE BEGINS"; `data/chronology_day2.json:50` tick 314 "12:10pm" "at dusk".
- **Root cause:** the timeline was authored without a cited clock evidence table; the Historian therefore cannot answer "when" questions honestly.
- **Fix:** download the three `_djvu.txt` files at build time; clean (de-hyphenate, strip running heads/page numbers, keep page markers); segment on report headings (`No. NN. Report of ...`); per report store author, rank, unit, date, page; regex family for times (`about 4 p. m.`, `at daybreak`, `at 3 o'clock`) -> `{clock_text, minutes|null, confidence}`; unit aliases from the crosswalk (`Twentieth Maine`/`20th Me.` -> `U-20ME`); place aliases from `terrain.json` + OSM names + CLR features; write evidence records (schema in section 9).
- **Acceptance test:** >= 95% of pages assigned to a report; 100-passage manual sample has < 2% word errors and correct page numbers; every passage carries `O.R., Ser. I, vol. 27, pt. N, p. NNN`; a "when did X start?" query returns >= 3 dated participant statements where they exist.
- **Moves:** Historical consistency (C- -> toward A), Historian trust. **Depends on:** 01, 03.

### hist-sources-2-06 - Chronology-vs-evidence table for all 137 events (deliverable for the time work)
- **Severity:** high. **Effort:** M (after 05). **audit_refs:** [C4]
- **Evidence:** `tick_formula` lines (`data/chronology_day1.json:5`, `day2:5`, `day3:5`: "Tick 1 = 5:00am ... Each tick = 5 minutes"); tick 12 labeled `6:00am` while the same event text says "approximately 7:30am" (`data/chronology_day1.json:19`).
- **Root cause:** ticks are uniformly spaced but events were placed by narrative order, not by clock evidence.
- **Fix:** generate `event_time_evidence.csv` with columns `tick, data_time, event, or_citations, or_minutes_min, or_minutes_max, delta_minutes, confidence, note`; publish the distribution; hand off to the time/data agents to re-time ticks or relabel.
- **Acceptance test:** all 137 events have either >= 1 cited time or an explicit "no report time found"; a reviewer can trace each proposed time to a page number.
- **Depends on:** 05.

### hist-sources-2-07 - Cross-check the site's OOB and commander fates against the NPS AoP/ANV pages
- **Severity:** medium. **Effort:** M. **audit_refs:** [H10]
- **Evidence:** NPS pages (`.../aop-orderofbattle.htm` "Last updated: January 8, 2026"; `.../anv-orderofbattle.htm`); lines like `19th Indiana Infantry- Col. Samuel J. Williams`, `24th Michigan Infantry- Col. Henry A. Morrow (w), Capt. Albert M. Edwards`; site record `U-19IN` commander `Colonel Samuel Williams ... "fate": "Wounded July 1"` (`data/oob/union_regiments_i_ii_corps.json`).
- **Root cause:** the OOB is sourced from copyrighted books with no independent check.
- **Fix:** regex parse `^(?P<unit>.+?)- (?P<cmdrs>.+)$` then split commanders on `, ` with status flags `(w)`, `(k)`, `(c)`, `(w/c)`, `(MOH)`; join via crosswalk; produce `oob_diff.csv` (missing units, extra units, commander/succession differences, status flag differences).
- **Acceptance test:** diff report reviewed; every discrepancy resolved or annotated with a citation; unit count reconciles to the number shown in the UI.
- **Depends on:** 03.

### hist-sources-2-08 - Monument validation and expansion from OpenStreetMap (ODbL, separate file)
- **Severity:** high. **Effort:** L. **audit_refs:** []
- **Evidence:** 512 site monuments (`bundle.pretty.js:104437-110597`; Union 457 / Confederate 40 / Other 15); OSM bbox query (39.77,-77.29,39.86,-77.16) returned 867 historic monument/memorial elements (790 monument, 77 memorial), 852 named, 131 with `inscription`; overlap script `tmp-hist-sources-2/monument_osm_overlap.py`; 177 OSM elements > 60 m from any site monument (131 > 100 m; 302 > 30 m); 38 of the 177 are named `CS ...`/Confederate, 39 `US ...`; 20 site monuments have no OSM feature within 60 m; 32 site latitudes have only 4 decimals and 3 have 3 decimals (~11 m and ~110 m resolution).
- **Root cause:** the monument list has weak provenance and a Union-heavy composition; there is no independent coordinate check.
- **Fix:**
  ```python
  # match rule
  score = token_overlap(norm(site.name), norm(osm.name))          # norm: '106th PA Curry' -> {'106th','pennsylvania','curry'}
  matched = (score >= 0.6 and dist_m <= 60)
  # outputs
  monuments_osm.geojson      # ODbL, all 867 with tags + match status
  monument_qa.csv            # site_no, nearest_osm_id, dist_m, name_score, flag
  ```
  Treat the 177 unmatched as *candidates* (badge "unverified") until confirmed by the 1907 NPS book or NPS pages; resolve the 20 site monuments without OSM features; publish attribution as in section 8 (option 1).
- **Acceptance test:** `monument_qa.csv` reviewed; each of the 20 suspect coordinates fixed or annotated; >= 38 Confederate tablets added only with a second evidence source; OSM attribution visible whenever the layer is on; ODbL file has license header.
- **Moves:** content depth; Union/Confederate balance. **Depends on:** 03 (unit names), 09.

### hist-sources-2-09 - Provenance for all 512 monuments (fill `src`, `mn`) from PD documents
- **Severity:** medium. **Effort:** L (manual). **audit_refs:** []
- **Evidence:** `src` non-empty for 9 of 512 records; `mn` values like "MN 260" (meaning undocumented in the bundle; probably the NPS monument number - UNVERIFIED); 1907 book (`irma.nps.gov/DataStore/DownloadFile/472768`, 1,220,721 B, 58 pp) and 1932 list (`https://npshistory.com/publications/gett/mon-locations-1932.pdf`, 2,095,190 B); NPS monument pages listed in `united-states-monuments.htm` / `confederate-monuments.htm`.
- **Root cause:** provenance was never stored per record.
- **Fix:** OCR both PDFs, parse monument names/locations into a lookup, match to the 512, write `src` values such as `"NPS 1907 Location of Monuments p. 23"`; move the array out of the JS bundle into `data/monuments_v2.json` loaded when the monument layer/walkthrough opens (the pretty-printed literal is ~158 KB; est. 60-80 KB minified) - requires a source rebuild (audit N1).
- **Acceptance test:** 100% of records have `src`; the bundle no longer contains the literal; walkthrough still lists 512+ items.
- **Depends on:** N1 (real source), 08.

### hist-sources-2-10 - 3DEP DEM grid and a genuine viewshed
- **Severity:** high. **Effort:** L. **audit_refs:** [H7, H8]
- **Evidence:** `viewshed.html:46` ("This shows relative elevation, not a computed sightline. A genuine viewshed analysis needs full terrain elevation data (a digital elevation raster) ..."); `data/terrain.json` 30 locations with one `elevation_ft` each; TNM API: four 1 m tiles `USGS_one_meter_x30y441 / x30y442 / x31y441 / x31y442 _PA_South_Central_B1_2017.tif`, 468,996,588-485,186,601 B each.
- **Root cause:** the page has no raster to compute from.
- **Fix:** in CI/local: `gdalbuildvrt` + `gdalwarp -t_srs EPSG:32618 -tr 5 5 -te <bbox> -r average` -> `gdal_translate -ot UInt16 -scale` -> 16-bit PNG height grid (~2,200 x 2,000 cells; est. 3-5 MB PNG) and a 10 m fallback (1-2 MB); ship with metadata `{crs, origin, cell, zmin, zmax, source, credit}`; Web Worker line-of-sight with observer 1.65 m, target 1.5 m and earth-curvature correction; UI shows assumptions and a "no trees / with 1863 woodlots" toggle once 11 exists. Credit "U.S. Geological Survey".
- **Acceptance test:** known pairs give plausible results (Little Round Top summit sees the Wheatfield; Cemetery Hill sees Seminary Ridge); a run on the 5 m grid completes < 2 s on a mid-tier phone; page states DEM is today's bare-earth terrain.
- **Moves:** function honesty (H8), A -> A+ for that feature. **Depends on:** 21.

### hist-sources-2-11 - 1863 landscape layer (NPS CLR inventories + georeferenced Warren/Bachelder maps)
- **Severity:** medium. **Effort:** XL. **audit_refs:** []
- **Evidence:** `historian.html:48` ("30 mapped terrain features"); CLR files: 2186022 (2025 CLI, 118 pp, 6,972,170 B), 2293618 (First Day CLR, 580 pp, 170,160,982 B), 2242136 (Little Round Top CLR, 178 pp), 2188403 ("The 1863 Landscape", 140 pp), 2257218 (Record of Treatment: "Period of significance: 1863-1938"); LoC maps `lva0000067` (Bachelder 1876, from a 200 ft/inch survey under Warren), `2007630423` (Bachelder isometric 1863), `99447503` (GBMA 1894, ca. 1:12,000), `2004629148` (Adams County 1858).
- **Root cause:** no structured 1863 landscape data exists in the app; the Historian cannot answer "was it an orchard/woods/fence in 1863?".
- **Fix:** (a) extract `landscape_feature` records from the CLR/CLI inventories with page citations; (b) georeference the LoC scans (Allmaps/QGIS, 8-15 control points per sheet), trace roads/lanes/woodlots/orchards/fences/buildings into GeoJSON with `{map, map_year, gap_years_vs_1863, confidence}`; (c) label everything "traced from map / interpreted by NPS", never "surveyed".
- **Acceptance test:** >= 300 traced features on the core battlefield; every feature has a map + year + confidence; "Was the Peach Orchard an orchard in 1863?" returns a cited CLR page and a map feature.
- **Depends on:** 10 (vegetation blockers), 01.

### hist-sources-2-12 - Weather table from Prof. Jacobs (July 1-4, 1863)
- **Severity:** medium. **Effort:** S. **audit_refs:** []
- **Evidence:** IA `notesonrebelinva00gett` (83,032 B OCR, 66 pp) and `notesonrebelinv00jacogoog` (1864); values seen only in a secondary summary (Emerging Civil War): Jul 1 72/76/74, Jul 2 74/81/76, Jul 3 73/87/76 (storm), Jul 4 rain > 1 inch - **not yet checked against the primary text**.
- **Root cause:** no weather data anywhere in the app.
- **Fix:** hand-key a 4-day x 3-reading table from the primary (`date, hour, temp_F, wind, sky, rain, page`); store as Tier A; tag readings as "town station".
- **Acceptance test:** each row has a page citation; a second person re-checks all values; "weather when Pickett's Charge began" returns the 2 pm reading with caveat.
- **Depends on:** none.

### hist-sources-2-13 - Civilian corpus (Pierce, Buehler, Hoke, Jacobs, Bates, NPS article)
- **Severity:** medium. **Effort:** M. **audit_refs:** []
- **Evidence:** IA ids `atgettysburgorwh00alle`, `recollectionsofr00bueh`, `greatinvasionof100hoke`, `notesonrebelinv00jacogoog`, `battlegettysbur00bategoog`; NPS `https://www.nps.gov/articles/000/civilians-at-gettysburg.htm`.
- **Root cause:** the Historian has 24 vignettes and no civilian testimony.
- **Fix:** paragraph passages tagged `{witness, age_at_battle, residence, day, place, sense, written_year, retrospective:true}`; sensory keyword index (smell, sound, dust, heat, rain).
- **Acceptance test:** "what did civilians see?" returns >= 3 witnesses with dates and titles; each passage shows the writing year.
- **Depends on:** 01, 23.

### hist-sources-2-14 - Regiment narratives (state volumes, Vanderslice, Dyer via CWSS)
- **Severity:** medium. **Effort:** L. **audit_refs:** []
- **Evidence:** IA ids `maineatgettysbur01main` (1,606,755 B), `pennsylvaniaatg02penn` (2,013,624 B), `newyorkatgettysb0001unse`, `cu31924030924736`, `minnesotacivil01minnrich`, `thenandnowgetty00vandrich` (373,618 B); CWSS `Regiments_Unitz.tsv` (Dyer text).
- **Root cause:** regiment records have one-line `key_action` strings (e.g., `"key_action": "Iron Brigade left flank -- Herbst Woods charge July 1. 68% casualties."`).
- **Fix:** chunk by regiment section, attach to unit ids, flag retrospective; strip HTML from Dyer text; give each regiment page a "History" and "Their own words" panel.
- **Acceptance test:** >= 80% of Union regiments and >= 50% of Confederate regiments have at least one narrative passage or an explicit "none found"; every passage cites volume+page.
- **Depends on:** 03.

### hist-sources-2-15 - Fox 1889 casualty layer and a governance note on Busey & Martin
- **Severity:** medium. **Effort:** L. **audit_refs:** []
- **Evidence:** `data/oob/union_regiments_i_ii_corps.json:7-8` cites Busey & Martin (1994); IA `regimentallosses00infoxw` (618 pp, 2,193,581 B OCR).
- **Root cause:** casualty/strength figures rest on one copyrighted compilation.
- **Fix:** extract Fox rows for Union regiments engaged at Gettysburg, join by crosswalk, compare with the site's numbers, publish differences; keep facts (not book wording) and cite; add a `NOTICE` explaining that regimental figures are factual data from published sources and are cross-checked against Fox/OR.
- **Acceptance test:** double-entry check on 50 regiments; a discrepancy list; site UI shows the source per figure.
- **Depends on:** 03, 05.

### hist-sources-2-16 - July 1863 newspapers (Chronicling America) as "what the press reported"
- **Severity:** low. **Effort:** L. **audit_refs:** []
- **Evidence:** loc.gov API counts (2026-09-30): `q=gettysburg`, 1863-07-03..10 -> 437 pages; July 1-31 -> 1,560 pages; limit 20 requests/min.
- **Fix:** build script with <= 12 req/min, cache JSON + OCR; rank pages by term density; ship ~300 curated pages; label as contemporary press.
- **Acceptance test:** no 429s; each passage carries paper, date, page URL; UI label "reported in the press - often wrong".
- **Depends on:** 21.

### hist-sources-2-17 - Soldiers' National Cemetery burial lists (1864/65) as Union burials layer
- **Severity:** low. **Effort:** L. **audit_refs:** []
- **Evidence:** IA `revisedreportofs01penn`, `revisedrepor2743penn`, `reportofselectcopenn`; CWSS mirror `Cemeteries_Info.tsv` has 5,672 rows and 0 Gettysburg rows.
- **Fix:** OCR-parse per-state tables to `{name, rank, company, regiment, state, plot}`; QA 200 rows; clearly label "Union burials in the Soldiers' National Cemetery as of the 1865 report".
- **Acceptance test:** parse yield reported; manual sample error < 3%; Find a Grave link-out only.
- **Depends on:** 03.

### hist-sources-2-18 - Implement attribution/compliance for CC BY-SA, ODbL, CC BY, MIT and gov credit lines
- **Severity:** high. **Effort:** M. **audit_refs:** [X5]
- **Evidence:** Wikipedia reuse page (attribution + share-alike + change note); OSM copyright page (ODbL; "If you alter or build upon our data, you may distribute the result only under the same license."); figshare API license `CC BY 4.0`; `WarOfTheRebellion` LICENSE (MIT). Site has no `/sources.html` (sitemap lists 20 URLs; audit E5).
- **Fix:** section 8 (separate files, excerpt-only rendering, `/sources.html`, `THIRD_PARTY_LICENSES.md`, attribution control entry).
- **Acceptance test:** every B-tier record renders attribution; a link checker confirms permalinks; a legal-style checklist in the repo passes.
- **Depends on:** 01.

### hist-sources-2-19 - Tier C link-out registry (ABT, Fold3, Find a Grave, FamilySearch, HMDB, Stone Sentinels, ACHS)
- **Severity:** medium. **Effort:** S. **audit_refs:** []
- **Evidence:** ABT ToS (fetch-summarizer): forbids "web scraping" and "use ... for artificial intelligence technologies such as large language models"; Ancestry T&Cs (text read): forbids automated access beyond human use and use "to train, develop, or fine-tune any machine learning model"; Find a Grave `robots.txt`: `Disallow: /memorial/search`; HMDB copyright (text read).
- **Fix:** `data/linkouts.json` `{source_id, label, url_template, terms_url}` rendered as buttons; a CI grep that fails if any of these hosts appear in `fetch/` scripts.
- **Acceptance test:** no fetch script contacts `battlefields.org`, `fold3.com`, `findagrave.com`, `familysearch.org` or `hmdb.org` for content (an optional link checker may send HEAD requests only); ABT/Ancestry text never enters `normalized/`.
- **Depends on:** 01.

### hist-sources-2-20 - Media rights register and image/audio allowlist
- **Severity:** medium. **Effort:** S-M. **audit_refs:** []
- **Evidence:** section 7 table; Commons categories (462 / 338 / 311 files+subcats) with per-file licenses; Freesound licenses (CC0/CC BY/CC BY-NC).
- **Fix:** `media_register.csv` `{asset, source_url, license, credit, retrieved, tier}` plus CI allowlist (CC0, PD*, CC BY, CC BY-SA); captions render credit; audio credits page.
- **Acceptance test:** build fails on an image without a register row or with a disallowed license.
- **Depends on:** 01.

### hist-sources-2-21 - Reproducible data pipeline (lockfile, caching, rate budgets, CI)
- **Severity:** medium. **Effort:** M. **audit_refs:** [N1, X3]
- **Evidence:** no real source project exists (audit N1); rate limits verified: loc.gov 20/min, Wikimedia 10/min unidentified vs 200/min with contact User-Agent, NPS API 1,000/hr, NARA 10,000/month, GitHub search 10/min; CSP is Report-Only (audit X3).
- **Fix:** section 9 tree; `sources.lock.json` with sha256; scripts read `RATE_BUDGET` from the catalog; monthly CI job produces a diff PR; runtime CSP `connect-src 'self'` only.
- **Acceptance test:** re-running the pipeline on a clean machine reproduces identical shard hashes; no 429s in logs; the shipped app makes zero third-party requests from the Historian.
- **Depends on:** N1.

### hist-sources-2-22 - Lazy, sharded delivery and a performance budget for the expanded Historian
- **Severity:** high. **Effort:** M. **audit_refs:** [P1, P3]
- **Evidence:** `historian.html:67-79` fetches 15 JSON files (317,788 B raw) with `Promise.all` before answering; audit P1 (INP/LCP Poor) and P3 (~30 JSON fetches on load).
- **Root cause:** one-shot eager load does not scale to 40 MB of corpora.
- **Fix:** `manifest.json` (<= 5 KB) + content-hashed shards fetched on demand + Web Worker for tokenization/BM25; input handlers must return in < 50 ms; add `<link rel="prefetch">` only after first interaction.
- **Acceptance test:** Lighthouse mobile on `/historian.html` >= 95 perf with the full corpora present; INP < 200 ms at p75 in a 100-query script; first-load bytes <= today's (~11 KB HTML + < 100 KB brotli data).
- **Depends on:** 23.

### hist-sources-2-23 - Evidence-record schema and validators
- **Severity:** medium. **Effort:** S. **audit_refs:** []
- **Evidence:** the current corpus builds entries in ad-hoc shapes inside `historian.html` (`kind: 'vignette', text, weight: 1.3, srcHref: ...` at ~line 104-110).
- **Fix:** adopt the JSONL schema in section 9 with JSON Schema validation in CI (`ajv`/`jsonschema`); every source normalizer emits it.
- **Acceptance test:** 100% of records validate; `tier` and `license` present; citations resolve (HTTP 200) in a link check.
- **Depends on:** 01.

### hist-sources-2-24 - Answer guardrails and evaluation seed from the question matrix
- **Severity:** medium. **Effort:** S. **audit_refs:** [H8]
- **Evidence:** section 6 matrix; audit H8 ("why did Lee lose the war" -> Archer Captured).
- **Fix:** commit the 13 questions as `eval/questions.jsonl` with expected source ids and an "answerability class" (exact / derivable / evidence-only / no direct data); rule: for "no direct data" questions (e.g., wheat height) the Historian must say what is known, cite >= 2 passages, and refuse to invent numbers.
- **Acceptance test:** eval run passes 13/13 on class + citation; a wheat-height question returns "unknown; here is what witnesses said" not a number.
- **Depends on:** 05, 13, 25.

### hist-sources-2-25 - Farm-level evidence: damage claims (permission) and the Trostle example
- **Severity:** low. **Effort:** L. **audit_refs:** []
- **Evidence:** NPS Civil War Series page: "27 acres wheat destroyed, worth $600.00", "32 acres Grass", "20 tons of Hay" (`https://npshistory.com/publications/civil_war_series/16/sec20.htm`); ACHS statement on reproduction.
- **Fix:** Phase 1: transcribe the examples printed in the NPS handbook (Tier A); Phase 2: after 02, request ACHS/State Archives cooperation; store `{farm, claimant, crop, acres, value, source}`.
- **Acceptance test:** each record cites page; UI states "claims are self-reported losses".
- **Depends on:** 02.

### hist-sources-2-26 - Prisoners and hospitals (Fort McHenry subset; Medical & Surgical History extracts)
- **Severity:** low. **Effort:** M. **audit_refs:** []
- **Evidence:** `Prisoners_FtMcHenry.tsv` (850,570 B) sample row `PW / Crudup, A.D. / 1863-10-22 / 47 NC / ... / Gettysburg 07/03/63`; IA `medicalsurgical32barnrich`.
- **Fix:** filter `PRM_NOTES` containing "Gettysburg" after 02; extract only Gettysburg wound statistics/cases; disclaim "no complete Camp Letterman roster is known" (UNVERIFIED claim from a forum thread - verify).
- **Acceptance test:** count of Gettysburg-note rows reported; disclaimers present.
- **Depends on:** 02, 03.

### hist-sources-2-27 - Re-check the unverified items
- **Severity:** low. **Effort:** S. **audit_refs:** []
- **Evidence:** Kaggle not searchable without login; DPLA docs 403; Gutendex/Gutenberg timeouts; Sarah Broadhead diary not found on IA; NPS Data API counts need a key; Wikisource 429.
- **Fix:** owner-authenticated re-checks and a note in `sources.yaml` for each.
- **Acceptance test:** each item marked verified or dropped.
- **Depends on:** none.

---

## 11. Phased schedule

(See catalog `phases`.) Phase 0 (1 wk): 02, measurements, registry. Phase 1 (3-4 wks): 03, 04, 05, 06, 07, 08, 10, 12, 13, 22. Phase 2 (3-5 wks): 09, 11, 14, 15, 16, 17, 18, 19, 20, 23, 24. Phase 3 (ongoing): 25, 26, 27 plus outreach outcomes.

## 12. Open questions for the owner

1. Will the site remain strictly non-commercial (no ads, no sales)? It changes what HMDB and Freesound CC BY-NC content could ever be allowed.
2. Is the owner willing to email NPS/ACHS/Gettysburg College/HMDB (account-free actions, but they are messages sent in the owner's name)?
3. Which Mapbox and Google Maps Platform terms apply to Cinematic Export video and Street View captions (not researched here)?
4. Confirm the meaning of the monument field `mn` ("MN 260") - probably the NPS monument number, unverified.


---

## Appendix A. URL verification log (2026-09-30)

Status 200 = full page/JSON; 206 = partial (checked with a 2 KB `Range` request). Notes: LoC web resource pages, HathiTrust web pages, DPLA docs, ehistory.osu.edu answered 403 to non-browser clients (not listed as verified pages; the JSON APIs were used instead). `gdg.org` had an expired TLS certificate and is not cited.

| Status | URL |
|---|---|
| 206 | https://www.nps.gov/civilwar/soldiers-and-sailors-database.htm |
| 200 | https://home.nps.gov/civilwar/soldiers-and-sailors-recordsorigin.htm |
| 206 | https://www.nps.gov/civilwar/search-soldiers.htm |
| 206 | https://www.nps.gov/civilwar/search-battles-detail.htm?battleCode=PA002 |
| 206 | https://www.nps.gov/civilwar/search-battle-units.htm |
| 206 | https://www.nps.gov/civilwar/search-monuments.htm |
| 206 | https://www.nps.gov/civilwar/search-cemeteries.htm |
| 206 | https://www.nps.gov/civilwar/search-prisoners.htm |
| 200 | https://jrnold-nps-cwss.s3.amazonaws.com/?list-type=2 |
| 206 | https://github.com/jrnold/cwss |
| 206 | https://github.com/jrnold/acw_battle_data |
| 200 | https://acw-battle-data.readthedocs.io/en/latest/data.html |
| 200 | https://api.figshare.com/v2/articles/1515995 |
| 200 | https://irma.nps.gov/DataStore/ |
| 200 | https://irmaservices.nps.gov/datastore/v7/rest/Profile/2257218 |
| 200 | https://irmaservices.nps.gov/datastore/v7/rest/QuickSearch?q=gettysburg&top=3&skip=0 |
| 200 | https://irma.nps.gov/DataStore/DownloadFile/472768 |
| 206 | https://irma.nps.gov/DataStore/DownloadFile/698026 |
| 206 | https://irma.nps.gov/DataStore/DownloadFile/610918 |
| 206 | https://irma.nps.gov/DataStore/DownloadFile/421888 |
| 206 | https://irma.nps.gov/DataStore/DownloadFile/663816 |
| 200 | https://irma.nps.gov/DataStore/DownloadFile/672770 |
| 200 | https://irma.nps.gov/DataStore/DownloadFile/733629 |
| 200 | https://irma.nps.gov/DataStore/DownloadFile/472789 |
| 200 | https://irma.nps.gov/DataStore/DownloadFile/472822 |
| 200 | https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_Roads/FeatureServer/0?f=json |
| 200 | https://public-nps.opendata.arcgis.com/ |
| 206 | https://www.nps.gov/subjects/developer/guides.htm |
| 206 | https://www.nps.gov/subjects/developer/get-started.htm |
| 206 | https://www.nps.gov/subjects/developer/index.htm |
| 206 | https://www.nps.gov/aboutus/disclaimer.htm |
| 206 | https://www.nps.gov/gett/learn/historyculture/index.htm |
| 206 | https://www.nps.gov/gett/learn/historyculture/aop-orderofbattle.htm |
| 206 | https://www.nps.gov/gett/learn/historyculture/anv-orderofbattle.htm |
| 206 | https://www.nps.gov/articles/000/civilians-at-gettysburg.htm |
| 206 | https://www.nps.gov/articles/000/federals-gettysburg.htm |
| 206 | https://www.nps.gov/articles/000/confederates-gettysburg.htm |
| 206 | https://www.nps.gov/gett/learn/historyculture/united-states-monuments.htm |
| 206 | https://www.nps.gov/gett/learn/historyculture/confederate-monuments.htm |
| 206 | https://www.nps.gov/gett/learn/historyculture/collections.htm |
| 206 | https://www.nps.gov/gett/learn/historyculture/research-center.htm |
| 206 | https://www.nps.gov/gett/learn/historyculture/library-resource-guide.htm |
| 206 | https://www.nps.gov/gett/learn/historyculture/places.htm |
| 206 | https://npshistory.com/publications/civil_war_series/16/sec20.htm |
| 206 | https://npshistory.com/series/symposia/gettysburg_seminars/index.htm |
| 206 | https://npshistory.com/publications/battlefield/cwsac/updates/pa.pdf |
| 206 | https://npshistory.com/publications/gett/mon-locations-1932.pdf |
| 206 | https://museum.nps.gov/ |
| 200 | https://npgallery.nps.gov/ |
| 206 | https://raw.githubusercontent.com/usnationalarchives/Catalog-API/master/README.md |
| 206 | https://www.archives.gov/research/military/civil-war/resources |
| 206 | https://unwritten-record.blogs.archives.gov/2018/07/03/mapping-the-battle-of-gettysburg/ |
| 206 | https://www.loc.gov/apis/json-and-yaml/working-within-limits/ |
| 206 | https://www.loc.gov/apis/additional-apis/chronicling-america-api/ |
| 206 | https://chroniclingamerica.loc.gov/data/ocr/ |
| 206 | https://www.loc.gov/legal/ |
| 206 | https://www.loc.gov/item/2004629148/?fo=json |
| 206 | https://www.loc.gov/item/2018666316/?fo=json |
| 206 | https://www.loc.gov/item/lva0000067/?fo=json |
| 206 | https://www.loc.gov/item/2007630423/?fo=json |
| 206 | https://www.loc.gov/item/99447503/?fo=json |
| 206 | https://www.loc.gov/item/99447498/?fo=json |
| 206 | https://catalog.hathitrust.org/api/volumes/brief/oclc/424023.json |
| 200 | https://archive.org/metadata/warofrebellion271unit |
| 200 | https://archive.org/metadata/warofrebellion272unit |
| 200 | https://archive.org/metadata/warofrebellion273unit |
| 200 | https://archive.org/metadata/regimentallosses00infoxw |
| 200 | https://archive.org/metadata/compendiumofwaro0001dyer |
| 200 | https://archive.org/metadata/gettysburgthenno00vand |
| 200 | https://archive.org/metadata/gettysburghistor00vand |
| 200 | https://archive.org/metadata/maineatgettysbur01main |
| 200 | https://archive.org/metadata/pennsylvaniaatg02penn |
| 200 | https://archive.org/metadata/newyorkatgettysb0001unse |
| 200 | https://archive.org/metadata/cu31924030924736 |
| 200 | https://archive.org/metadata/minnesotacivil01minnrich |
| 200 | https://archive.org/metadata/atgettysburgorwh00alle |
| 200 | https://archive.org/metadata/recollectionsofr00bueh |
| 200 | https://archive.org/metadata/greatinvasionof100hoke |
| 200 | https://archive.org/metadata/notesonrebelinv00jacogoog |
| 200 | https://archive.org/metadata/battlegettysbur00bategoog |
| 200 | https://archive.org/metadata/revisedreportofs01penn |
| 200 | https://archive.org/metadata/reportofselectcopenn |
| 200 | https://archive.org/metadata/medicalsurgical32barnrich |
| 200 | https://archive.org/metadata/GardnersPhotographicSketchBookOfTheWar |
| 200 | https://archive.org/metadata/bachelderpapersg0001unse |
| 200 | https://archive.org/metadata/cu31924096440932 |
| 206 | https://www2.census.gov/library/publications/decennial/1860/agriculture/1860b-01.pdf |
| 200 | https://www.census.gov/library/publications/1864/dec/1860b.html |
| 200 | https://en.wikipedia.org/wiki/Battle_of_Gettysburg_order_of_battle:_Union |
| 200 | https://en.wikipedia.org/wiki/Battle_of_Gettysburg_order_of_battle:_Confederate |
| 200 | https://en.wikipedia.org/wiki/Wikipedia:Reusing_Wikipedia_content |
| 200 | https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use |
| 200 | https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits |
| 200 | https://www.wikidata.org/wiki/Wikidata:Licensing |
| 200 | https://www.wikidata.org/wiki/Q33132 |
| 206 | https://query.wikidata.org/ |
| 200 | https://commons.wikimedia.org/wiki/Category:Gettysburg_National_Military_Park |
| 200 | https://commons.wikimedia.org/wiki/Category:Gettysburg_Battlefield |
| 200 | https://commons.wikimedia.org/wiki/Category:Battle_of_Gettysburg |
| 200 | https://overpass-api.de/api/status |
| 200 | https://www.openstreetmap.org/copyright |
| 200 | https://www.hmdb.org/copyright.asp |
| 200 | https://www.hmdb.org/terms.asp |
| 200 | https://www.hmdb.org/results.asp?Search=Place&Town=Gettysburg&State=Pennsylvania |
| 200 | https://www.findagrave.com/cemetery/2130381/gettysburg-national-cemetery |
| 206 | https://www.findagrave.com/robots.txt |
| 200 | https://www.ancestry.com/c/legal/termsandconditions |
| 200 | https://www.familysearch.org/en/legal/terms |
| 200 | https://www.fold3.com/go/about |
| 200 | https://www.battlefields.org/about/accountability/terms-service |
| 200 | https://www.battlefields.org/learn/articles/how-cite-american-battlefield-trust |
| 200 | https://www.battlefields.org/learn/civil-war/battles/gettysburg |
| 200 | https://gettysburg.stonesentinels.com/ |
| 200 | https://gettdigital.gettysburg.edu/ |
| 200 | https://www.gettysburg.edu/special-collections/ |
| 200 | https://gettysburghistory.org/research/ |
| 200 | https://gettysburgcompiler.org/ |
| 206 | https://www.civilwarmed.org/camp-letterman/ |
| 200 | https://www.civilwardata150.net/ |
| 200 | https://tnmaccess.nationalmap.gov/api/v1/products?datasets=Digital%20Elevation%20Model%20(DEM)%201%20meter&bbox=-77.26,39.80,-77.20,39.83&max=1&outputFormat=JSON |
| 206 | https://prd-tnm.s3.amazonaws.com/StagedProducts/Elevation/1m/Projects/PA_South_Central_B1_2017/TIFF/USGS_one_meter_x30y441_PA_South_Central_B1_2017.tif |
| 206 | https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits |
| 206 | https://docs.mapbox.com/data/tilesets/reference/mapbox-terrain-dem-v1/ |
| 200 | https://www.mapbox.com/legal/tos |
| 206 | https://www.pasda.psu.edu/ |
| 200 | https://gis-hub-adamsgis.hub.arcgis.com/ |
| 200 | https://pa-geo-data-pennmap.hub.arcgis.com/pages/lidar-and-imagery-build |
| 206 | https://www.nhgis.org/ipums-nhgis-terms-use |
| 200 | https://api.si.edu/openaccess/api/v1.0/search?q=gettysburg&start=0&rows=0&api_key=DEMO_KEY |
| 200 | https://freesound.org/help/faq/ |
| 206 | https://github.com/utcompling/WarOfTheRebellion |
| 206 | https://github.com/AdmiralEM/dataset-civil_war_records |
| 200 | https://zenodo.org/api/records?q=gettysburg&size=1 |
| 200 | https://www.findagrave.com/cemetery/1584934/gettysburg-national-cemetery |
| 200 | https://archive.org/metadata/thenandnowgetty00vandrich |

## Appendix B. Reproducible analysis scripts (in `plan-work/tmp-hist-sources-2/`)

- `monument_osm_overlap.py` - counts the 512 embedded monuments and their `src`/`mn` fields; the distance-matching snippet used for the OSM comparison is reproduced in finding 08.
- `osm_hist.json` - raw Overpass response (867 elements).
- `cwss_bucket.xml` - S3 bucket listing (39 keys).
- `url_verification.json`, `urls.txt`, `verify_urls.py` - URL verification.
- `build_catalog*.py` - generators for the catalog JSON.


---

## Verification

Adversarial verifier pass, 2026-09-30. Scope: all 27 findings (10 high, 13 medium, 4 low; no criticals). Everything below was re-run or re-fetched by the verifier; line numbers refer to `bundle.pretty.js` (this folder) or the DEPLOY_DIR files. Scratch files stayed outside `plan-work/` and the site folders. The specialist's research is mostly accurate: every URL, byte size, count and quote I re-checked matched except the items marked CORRECTED. The main defects are (a) the unit crosswalk rule does not generalize (80% auto-match, not 99%), (b) the OR page-marker and weather-table premises are wrong for the cited IA files, (c) the 16-bit PNG height grid, (d) monument provenance items that cannot be reached from the cited 1907/1932 documents, and (e) Tier C sources are already inside shipped site data, which the report never flags.

### Re-checks that CONFIRMED the report's numbers (no change needed)

- `historian.html:48` sentence; fetches at `historian.html:67-79` (`OOB_FILES` at 67, `Promise.all` at 75-79); the 15 files sum to exactly 317,788 B; corpus entries at `historian.html:89,97,107,110`.
- `find-ancestor.html:48`, `viewshed.html:46` quotes; `data/terrain.json` = 30 `key_locations`, each with `elevation_ft` (lines 22-24 sampled); 24 vignettes; chronology 42+49+46 = 137 events; `tick_formula` at line 5 of each file; ticks at `chronology_day1.json:19`, `day2:23,44,50`, `day3:35` and the "approximately 7:30am" text at day1:19.
- Monuments: 512 records; Union 457 / Confederate 40 / Other 15; `src` non-empty 9 (503 empty); `mn` non-empty 461; latitudes with 4 decimals 32 and 3 decimals 3; pretty-printed array 157,800 chars.
- OSM: re-ran `monument_osm_overlap.py` (identical output: 177/131/302 unmatched at 60/100/30 m, 20 site monuments with no OSM feature within 60 m, 38 CS / 39 US / 100 other) and re-queried Overpass live at 05:02Z: 867 elements (790 monument, 77 memorial), 852 named, 131 with `inscription`.
- CWSS mirror: bucket has 39 keys (sum 8.2 GB = the README's 7.7 GiB); `Soldiers_Personz.tsv` = 1,194,562,274 B, Last-Modified 2015-12-13; GitHub API `license: null`, `archived: true`; column layout matches the fix code (idx 4 `PER_UNIT_CODE`, 5 company, 7/9 rank codes, 10 AKA, 18 `PER_ISDELETE`, 24 fields); sample row `James / Lacey / U / 71 N.Y. Infantry. / UNY0071RI / I / Corpl.` exists; `Regiments_Unitz.tsv` 9,308,412 B; `Cemeteries_Info.tsv` 5,672 rows, 0 mention Gettysburg; `UME0020RI`, `CVA0021RC`, `UCT0002YAL` all exist.
- figshare `acw_battle_data.zip` 2,526,832 B, license CC BY 4.0, v14; `nps_units.csv` 7,011 units (3,246 US / 3,765 Confederate; 1,163 dbpedia_uri); `nps_battle_units.csv` 17,993 rows; PA002 = 300 rows, all US, all `DYER`; all 300 codes exist in `Regiments_Unitz`.
- IA: `warofrebellion271/272/273unit` = Ser. I vol. 27 pts 1-3, 1,190/1,132/1,256 imagecount, `_djvu.txt` 3,970,479/3,880,513/3,406,041 B; all other cited IA ids exist with the stated sizes/page counts (`maineatgettysbur01main` 1,606,755; `pennsylvaniaatg02penn` 2,013,624; `thenandnowgetty00vandrich` 373,618; `regimentallosses00infoxw` 618 pp / 2,193,581; `medicalsurgical32barnrich`; the three cemetery-report ids).
- NPS: Data Store profiles for 2186022/2293618/2242136/2188403/2257218/2196751 exist, visibility Public, fileIds 733629/672770/580673/472822/621486+621487/472768; HEAD sizes 6,972,170 / 170,160,982 / 63,950,146 / 33,729,297 / 1,220,721 match; 1932 list PDF 2,095,190 B matches; NPS disclaimer wording verified (public domain only for works "prepared by an officer or employee").
- USGS TNM: exactly four 1 m tiles `x30y441/x30y442/x31y441/x31y442`, 468,996,588-485,186,601 B, published 2020-03-30.
- LoC: `lva0000067`, `2007630423`, `99447503`, `2004629148` are the described maps; Chronicling America counts 437 (Jul 3-10) and 1,560 (Jul 1-31); loc.gov JSON API limit 20/min with 1-hour block (the page adds that the block countdown resets on any request during the block).
- Rates: Wikimedia 10/min unidentified vs 200/min with compliant User-Agent (mediawiki.org rate-limit page); NPS API 1,000/hour; NARA 10,000 queries/month; ABT terms of service (primary text, last updated Oct 2025) forbid web scraping and AI use; Ancestry T&C quote verbatim; Find a Grave `robots.txt` `Disallow: /memorial/search`; CWSS "no longer maintained"; ACHS "Reproduction ... prohibited" sentence (it scopes to "the materials found below" on the Research Room page); NPS CWSS records-origin page says 6.3 million General Index Cards and ~3.5 million soldiers; NPS AoP page "Last updated: January 8, 2026" with the quoted lines (ANV page: December 22, 2025); Commons category sizes 462/338/311/117/20; `utcompling/WarOfTheRebellion` is MIT; HMDB Gettysburg list says 1,227 markers; Trostle claim text (`sec20.htm`) matches.
- 32-URL random re-check of the catalog: 26 answered (200/206); 5 returned 403 to non-browser clients (hmdb.org x2, usgs.gov, loc.gov item JSON with a browser UA, zenodo with a browser UA; the zenodo API works with a plain UA) and 1 IA metadata call timed out (it answers on retry); all consistent with the report's Appendix A caveats.

### Verdict table

| ID | Sev | Verdict | Notes (what was checked / the correction) |
|---|---|---|---|
| 01 | high | CORRECTED | Evidence real, but the range is off and the root cause is understated. `_A = [` is at `bundle.pretty.js:104440` (not 104437); `no: 512` is at 110597 (correct); the array closes at 110609. "Nothing stops a Tier C source from entering" is already false: all 9 non-empty `src` strings are Stone Sentinels (5: lines 104475, 104932, 106138, 108468, 110569) or HMDB (4: 110071, 110180, 110496, 110533), and `data/monuments.json` (loaded at `index.html:677`) cites Wikipedia x6 and Stone Sentinels x3. The gate must run retroactively (see MISSED-1). The fix itself would work. |
| 02 | high | CONFIRMED | All four quotes verified. Nuances: HMDB paragraphs 1-2 permit non-commercial copying with attribution, so that email is optional; the ACHS sentence covers the Research Room holdings listed on that page; the GitHub `archived` flag is true but `2026-08-29` is `updated_at`, not proven to be the archive date. |
| 03 | high | CORRECTED | See "Crosswalk measurement" below. The formula auto-matches 375/467 (80.3%) and would attach USCT rosters to Regular regiments; the 99% acceptance test is unreachable. |
| 04 | high | CORRECTED | Code, columns, sizes, sample row verified; commanders Chamberlain/Dawes/Fairchild/Colvill/Burgwyn confirmed on the NPS pages (Oates: the "15th Alabama Infantry-" line is split from its commander text by link markup). Corrections: the "42% Confederate in a 400 KB sample" is not representative because the file is sorted by surname (400 KB samples at byte 0 / 100M / 300M / 500M / 800M / 1.1G gave 35 / 37 / 26 / 45 / 62 / 47% Confederate); the 420k-700k card estimate is still unmeasured; soldier rows carry the same suffixed unit codes as `Regiments_Unitz` (e.g. `CVA0002RI01`), so finding 03's suffix logic is a hard prerequisite; the acceptance "a query fetches <= 4 shards" only holds if the index returns counts and the UI lazy-loads shards on expand (a surname like Smith appears in hundreds of units). csv default parsing (tab delimiter, quoted fields, `\r\r\n` terminators) worked on a 10,564-row sample (24 fields on every complete row). |
| 05 | high | CORRECTED | See "OR ingestion" below: `_djvu.txt` has no page markers; the segmentation heading regex must tolerate OCR whitespace; Part 3 needs a dispatch-header segmenter (MISSED-3). |
| 06 | high | CORRECTED | Evidence exact. Effort M is optimistic: the candidate table is M, but a human must adjudicate 137 events against multiple OR passages each (L). The table must also state which clock its `data_time` uses (audit C4 says the map clock and the data labels differ by an hour). Depends on the MISSED-3 dispatch timestamps for the best precision. |
| 07 | med | CONFIRMED | NPS lines exact. Parse the DOM, not text lines: the units sit in `<p style="margin-left:40px">` blocks separated by `<br />` and some commander names are hyperlinks (to NPS official-report pages), which splits 8 lines in the AoP text ("24th Michigan Infantry-" then the linked name). My line-level count is 333 (AoP) / 232 (ANV) vs the report's 352/265 estimates. The NPS commander links are an extra source the report did not list. |
| 08 | high | CONFIRMED | Numbers reproduce (script re-run and live Overpass). The 177 unmatched are mostly real park tablets (e.g. "CS HQ Ramseur NC Brigade", "2nd US Artillery Battery A Calef's Battery", "6th WI Dawes"); 68 of them lie north of lat 39.822 (Oak Ridge, town, cavalry fields). Name matching will be weak (OSM uses "CS HQ ...", "US 2nd Reg ME ..."; the site uses "26th North Carolina Infantry Monument"), so the 0.6 token-overlap threshold needs a manual review pass. |
| 09 | med | CORRECTED | (a) Size: the array in `bundle.min.js` starts at char offset 2,124,258 and runs ~110,937 chars (~111 KB minified, ~18 KB gzip), not "60-80 KB". (b) Start line 104440. (c) The 1907 book (58 pp, 38.8k chars of text) and the 1932 list (140k chars, columns scrambled by `pdftotext -layout`) list avenue locations, not coordinates, and cannot cover monuments dedicated after 1932 (Alabama State Monument dedicated Nov 1933 and Tennessee Monument completed 1982, from web-search result summaries of NPS/Wikipedia pages, not re-read on the pages themselves; the site list also has the Longstreet statue, Civil War Women's Memorial, "Return Visit" Lincoln statue, Friend to Friend Masonic Memorial, many `MN 7xx-8xx` items). So "100% of records have `src`" is unreachable from those two PDFs, and the current `src` field records coordinate provenance, which those PDFs cannot supply. Split into `id_src` (identity/description) and `coord_src`. (d) Effort L stays. |
| 10 | high | CORRECTED | Tiles/sizes verified; bbox 39.77-39.86 x -77.29..-77.16 is ~10 km x 11 km so a 5 m grid is ~2,000 x 2,220 cells (report correct). Flaw: a 16-bit grayscale PNG cannot be read at full precision in the browser through `<canvas>`/`getImageData` (canvas is 8 bits per channel; platform behavior, not tested here). Ship the grid as a Mapbox terrain-RGB style PNG (R*65536+G*256+B), or raw Uint16 `.bin` with brotli read via `fetch().arrayBuffer()`, or use a JS PNG decoder; keep the `gdalwarp` steps. |
| 11 | med | CONFIRMED | IDs, sizes, LoC items verified. The finding cites Data Store reference ids (2186022...) while downloads use file ids (733629...); list both. Page counts (118/580/178/140) not re-checked. Tier A for contractor-authored CLRs: see MISSED-5. |
| 12 | med | CORRECTED | The cited primary does not contain the table. I fetched the OCR of all four IA copies of Jacobs' Notes (`notesonrebelinva00gett`, `notesonrebelinv00jacogoog`, `notesonrebelinva00jaco` (1864), `notesonrebelinva00jaco_0` (1888)): zero hits for meteorolog/thermometer/temperature/degrees/cloudy; they contain only incidental weather (rain mentions at lines 498 and 578 of the first file) and a "thunder-storm" simile for the cannonade at line 1510, not a readings table. The fetch summary of the Emerging Civil War article attributes the readings to the 1864 Lippincott Notes and to a Star and Sentinel (Gettysburg) republication of Aug 11, 1885, and says it gives no July 4 readings, so "Jul 4 rain > 1 inch" is not supported by that page. Hand-keying from "the primary" is not an S task until the real primary (the 1885 newspaper or a Smithsonian observer record) is located: re-scope to M with a source-hunt first step. |
| 13 | med | CONFIRMED | All five ids exist; 3 carry `NOT_IN_COPYRIGHT`. Buehler's IA date is "[19--]"; the report's "1900" is unverified. |
| 14 | med | CORRECTED | The fix and sizes are right, but Confederate unit histories in `Regiments_Unitz` are not Dyer (Dyer is Union-only, as SRC-21 itself says; SRC-10's question list and finding 14 blur this). Measured with a proper CSV parse: 7,002 records; `REG_HISTORY` present for 2,466/3,250 Union and 1,184/3,752 Confederate units (523/729 Confederate infantry regiments); Confederate texts carry 1999 CWSS edit dates in `REG_NOTES` (e.g. `6/8/99`), are hard-wrapped with `\r\r\n\r\r\n` between every line, and embed dead `http://www.nps.gov/history/hps/abpp/battles/xx.htm` links; their authorship and rights are not stated. Treat them as A-pending together with SRC-10. |
| 15 | med | CONFIRMED | `oob/union_regiments_i_ii_corps.json:7-8` verified; `terms.html:30` names Busey & Martin publicly. Fox covers Union regiments; the 193 `C-` regiments' figures get no PD cross-check from this finding. |
| 16 | low | CONFIRMED | Counts and the rate limit verified. |
| 17 | low | CONFIRMED | IA ids and the 0-Gettysburg-rows claim verified. |
| 18 | high | CORRECTED (minor) | Licenses verified (figshare CC BY 4.0; WarOfTheRebellion MIT). The sitemap has 21 `<loc>` entries (home + 20), not 20; still no /sources.html, privacy or terms. |
| 19 | med | CORRECTED | ABT/Ancestry/Find a Grave verified from primary text. HMDB is not "link-out only" by its own terms: paragraphs 1-2 allow copying with attribution ("From HMdb.org") for non-commercial use; only commercial use needs written permission. Label it "B-NC, attribution", keep the CI guard for automated scraping, and note that 4 shipped monument rows already derive coordinates from HMDB (MISSED-1). FamilySearch terms remain fetch-summarizer only. |
| 20 | med | CONFIRMED | Commons counts verified; Freesound licenses not re-checked (UNVERIFIED). |
| 21 | med | CONFIRMED | Rate limits verified except GitHub search 10/min (not re-run). "Runtime CSP `connect-src 'self'` only" needs a per-path header: the live `/historian.html` header is the sitewide Report-Only policy naming Mapbox/PeerJS hosts. |
| 22 | high | CONFIRMED | Lines, byte sum and `Promise.all` verified. |
| 23 | med | CONFIRMED | Lines 89/97/107/110 verified (the "~104-110" range is right). |
| 24 | med | CONFIRMED | Section 6 has 13 questions as claimed. |
| 25 | low | CONFIRMED | Trostle text verified (Cumberland Township claim: 27 acres wheat $600.00; 32 acres Grass $650.00; 20 tons hay $300.00). Note Trostle is a different farm from the Rose Wheatfield used in question 4. |
| 26 | low | CORRECTED | The count is knowable now: 811 of 5,184 `Prisoners_FtMcHenry.tsv` records mention Gettysburg in `PRM_NOTES`. |
| 27 | low | CONFIRMED (updated) | Re-checked: Gutendex answers (13 hits for "gettysburg"); Wikisource API answers 200; Kaggle search page 200 (data still needs login); DPLA docs 403; gutenberg.org search 504; Broadhead diary not found by IA title search or Gutendex "lady of gettysburg" (still unverified elsewhere). |

### Crosswalk measurement (finding 03)

Site file facts (`data/oob/*.json` key is `regiment_id`, not `id`): the 8 regiment files hold 467 `regiments` rows (274 `U-`, 193 `C-`) plus 8 `horse_artillery` and 5 `brigades` rows (480 list rows, not 487; 279 `U-` and 196 `C-` reproduce only if brigades are excluded).

- The specified `ID_RE` does not match 49 of the 467 regiment ids (10.5%) plus 1 `-SS` id: suffix families `-B`, `-R`, `-R-F`, `-1`/`-2`, `-b`, `-XII`, `-EH`, `-S`, `-T`, `-P`, `-E`, `-M`, `-H`, `-MTD`, `-CSA` and name-based ids (`C-Cobb-GA`, `U-Purnell-MD`, `C-McClanahan-ART`, `C-VA-PA-CAV`). Only 371 plain + 46 `-CAV` = 417 ids derive a code.
- Of those 417 derived codes only 375 exist in `Regiments_Unitz` (overall 375/467 = 80.3%). 42 fail because CWSS disambiguates same-numbered units with suffixes (`UDE0001RI01`, `UMI0001RI01`, `CGA0007RI01`, `CVA0003RI01..03`, `UNY0002RC01`) and because US Regulars are state code `UR`, not `US` (`UUR0004RI` = "4th Regiment, US Infantry (Regular Army)"). Report Section 5 line 1367 says Regulars map to `UUS....`; `UUS` is the US Colored Troops (`UUS0004RI00C` = 4th US Colored Infantry), so a fuzzy prefix match would silently join the wrong men.
- A corrected rule (exact code first; `US`->`UR`; else suffix candidates disambiguated by the PA002 Dyer list, then by name filters such as "3 months", "Militia", "Colored") resolves 409/467 (87.6%): 384 exact, 16 via PA002, 9 by suffix filter; 50 off-grammar ids need a hand table, 7 are ambiguous (`C-3AR`, `C-3VA`, `C-2VA`, `C-1NC`, `C-2MS`, `U-1MI-CAV`, `C-5VA-CAV`), 1 has no candidate (the alias row `U-14BK`). Replace the 99% acceptance test with: 100% of ids resolved or explicitly listed in `unmatched.csv`, a name-based sanity check on every exact hit, and the 300 PA002 codes reconciled. Effort L stays.

### OR ingestion (finding 05)

- `warofrebellion271unit_djvu.txt`: 3,954,662 chars, 110,793 lines, 0 form-feed characters. Page boundaries are not in `_djvu.txt`, so "keep page markers" and the acceptance test "every passage carries ... p. NNN" cannot be met from it. Use `<id>_page_numbers.json` (200,256 B for Part 1: leaf to printed page, 1,170 of 1,188 leaves filled) with `<id>_hocr_searchtext.txt.gz` + `<id>_hocr_pageindex.json.gz`, or `<id>_djvu.xml` (46.6 MB for Part 1).
- Headings are OCR'd with double spaces and line breaks (`No.  1. \n\nReport  of  Maj.  Gen.  Henry  W.  Halleck`); a strict `No. NN. Report of` regex finds 0 hits, a whitespace-tolerant one finds 290 in Part 1. Normalize first.
- Feasibility is good: Part 1 has 2,179 `N a. m./p. m.` mentions, 507 `hh:mm` forms, 292 "o'clock", 28 daybreak, 28 dusk, 20 sunset (half-hour OCR artifacts like "3J p. m." appear in Jacobs' pamphlet but were rare, 2 hits, in OR Part 1).

### MISSED issues (in this specialist's scope)

1. **Tier C/B sources are already inside shipped data (high).** Evidence: `bundle.pretty.js:104475, 104932, 106138, 108468, 110569` (Stone Sentinels), `110071, 110180, 110496, 110533` (HMDB markers 17965/15142/14539/16865); `data/monuments.json` lines 10/18/34/42/50/66 (Wikipedia) and 26/58/74 (Stone Sentinels), loaded at `index.html:677`; the report's own tier table puts Stone Sentinels in Tier C and Wikipedia in Tier B with attribution. Fix: retro-audit those 18 coordinates (replace from OSM-verified/NPS/PD sources or a field check, or keep with a "From HMdb.org"/Wikipedia credit on /sources.html), list them as `legacy` rows in `sources.yaml`, and make the CI gate scan `data/*.json` and the extracted monument array too.
2. **Regulars mapped to the wrong CWSS prefix (high).** Report Section 5 (line 1367) says `UUS....`; CWSS uses `UUR....` for the Regular Army (22 `UUR` codes are in PA002) and `UUS....` for USCT. Fix: state map `US -> UR`, plus a test that the matched `REG_UNIT_NAME` contains "Regular Army" iff the site id state is `US`.
3. **OR Part 3 timestamped dispatches are not in the plan (high).** `warofrebellion273unit_djvu.txt` has 118 dispatch headers of the form `July 2, 1863—3.40 a. m.` / `July 1, 1863 — 6 a. m.` (125 with a date-dash-digit pattern), each with sender and recipient; the specified `No. NN. Report of` segmenter finds none of them. They are contemporaneous, not retrospective, and are the best evidence for audit C4 and finding 06. Fix: add a dispatch segmenter (date-dash-time header line, then sender/recipient lines), store `{sender, recipient, clock_text, minutes, page}` and rank contemporaneous times above retrospective report times in the evidence table. Effort M.
4. **The "467 regimental records" headline includes an alias row (medium).** `data/oob/union_regiments_i_ii_corps.json:26` is `U-14BK`, "14th Brooklyn (alias for U-84NY)", `alias_for: "U-84NY"`, strength 0, and it is counted in `metadata.total_regiments` (77). `historian.html:48` and `find-ancestor.html:48` both print 467. The crosswalk must collapse `alias_for` rows (466 distinct units), and the CI id inventory should own the off-grammar id families. Fix: add an `alias_for` rule to `test_crosswalk.py` and correct the UI count once the OOB is reconciled.
5. **Tier A for contractor- or partner-authored NPS reports is too generous (medium).** Data Store profile 2242136 cites "Einhorn, Yaffee Prescott, Contractor and Others. 2012"; 2293618 is Auwaerter et al. of the Olmsted Center with partner owners (`@partner.nps.gov`). The NPS disclaimer grants public-domain status to works "prepared by an officer or employee of the U.S. Government" and says "not all materials ... are in the public domain". Fix: record author affiliation and the PDF's own copyright/credit page per document in `sources.yaml`; treat contractor-authored CLRs as A-pending (quote with citation, no figure reuse) until checked.
6. **Data-entry artifact in user-visible monument text (low).** `bundle.pretty.js:110600` (record 512, Jennie Wade Memorial) has `honors: "... (WGS-84 decimal degrees). MN ID"`; `honors` is rendered at `bundle.pretty.js:110704`. Fix: rewrite the text and add a CI lint over `honors`/`loc` for `WGS`, `decimal`, `MN ID`, `http`.
7. **Weather source location unknown (medium).** Covered in the finding 12 correction: no cited IA scan holds the readings, so the Section 6 weather question (row 6, "2 pm reading 87 F") currently rests on a secondary summary. Add a "locate primary" step and mark the row unanswerable until then.

### Not verified by this pass

CLR PDF page counts (118/580/178/140/470+374); the NPS Data Store "not publicly downloadable" items (632513/632515/632516); Freesound licenses and FAQ; FamilySearch and Fold3 terms; Smithsonian Open Access CC0 statement; the Wikipedia reuse-page paraphrase; USGS credit wording; NHGIS terms; DPLA; whether `WarOfTheRebellion` includes vol. 27; Camp Letterman roster; the estimate of 420k-700k Gettysburg-unit soldier cards; shard sizes and build times (all budgets are still estimates).
