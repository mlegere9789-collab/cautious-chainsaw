# Image inventory of the built site and what the IMG group does about it

Owner requirement: the site uses **only actual images of Gettysburg**. This is the inventory of every image the built site serves or references, how each one was classified, what was done, and the counts before and after. Read with `LEDGER.md` (licence ledger of what ships now) and `ledger.json`.

Measured on 2026-10-19 with `python tools/t0/images/inventory.py --dist <tree>`; the raw results are `inventory-baseline.json` (production as captured on 2026-09-30, `baseline/dist`), `inventory-before.json` (`release/R1c/dist`, release id 2531699e, without IMG) and `inventory-after.json` (R1c built with IMG, `tools/t0/images/img_build.py`). Every file was opened and looked at, not classified by name.

## 1. Counts

| | production (`baseline/dist`) | R1c without IMG | **R1c with IMG** |
|---|---|---|---|
| image files served (raster + svg) | 8 (7 + 1) | 11 (10 + 1) | **12 (11 + 1)** |
| NOT-GETTYSBURG (generic or generated art) | 7 | 10 | **0** |
| UNKNOWN provenance | 0 | 0 | **0** |
| real image of Gettysburg (in the ledger) | 0 | 0 | **11** |
| UI-glyph sprite (not a picture; kept) | 1 | 1 | 1 |
| image files that do not decode | **2** (`screenshots/day1.png`, `day3.png`) | 0 | 0 |
| image references (img, icon links, og/twitter, manifest, css url) | 39 | 41 | 42 |
| pages with an og:image / distinct og:image files | 21 / 1 (the corrupt `day3.png`) | 21 / 1 (`og/card-r1.png`, generated art) | **21 / 1 (`og/gettysburg-card.jpg`, a photograph)** |
| `<img>` elements in pages / with alt text | 0 / 0 | 0 / 0 | **3 / 3** (each in a `<figure>` with a provenance caption) |
| `og:image:alt` + `twitter:image:alt` tags | 0 | 0 | **21 + 11** |
| manifest icons / manifest "screenshots" | 2 / 2 | 4 / 2 | **4 / 0** |
| bytes of image files | 49,153 | 384,478 | 840,054 (+455,576 vs R1c) |
| inline `<svg>` elements (UI glyph uses and one chart) | 5 | 6 | 6 |
| PDF pictures (`user-guide.pdf`) | 0 | 0 | 0 |

Production's social image problem, confirmed with a byte-level decoder and with Pillow: all 21 pages that name an og:image point at `screenshots/day3.png`, and that file (like `day1.png`) is corrupt: its header declares an 8-bit RGB image but the pixel data is RGBA-sized (3,687,120 bytes = 720 x (1 + 1280 x 4); an RGB header needs 2,765,520). Pillow and a strict decoder refuse it ("unrecognized data stream contents"); Chrome accepts it and paints a flat grey rectangle with a green line (`evidence/prod-day3-in-chrome.png`), so a link preview shows nothing recognisable. R1c already replaced the file by a valid generated card (`og/card-r1.png`), which is valid but is not an image of Gettysburg.

## 2. File by file (what each served image was, and what happened)

| File (before) | Where used | What it shows | Actual image of Gettysburg? | Class | Action | After |
|---|---|---|---|---|---|---|
| `favicon.ico` (32 px) | tab icon: `/favicon.ico` and `<link rel=icon sizes=any>` in `index.html` | a gold five-point star on a dark tile | no: a generic symbol, no place | NOT-GETTYSBURG | replaced | `favicon.ico` 16/32/48 px, crop of the 1863 Evergreen Cemetery gatehouse photograph |
| `apple-touch-icon.png`, `apple-touch-icon-precomposed.png` (180) | `<link rel=apple-touch-icon>` in `index.html`; iOS legacy path | the same star | no | NOT-GETTYSBURG | replaced (same names) | gatehouse crop, 180 px |
| `icons/icon-192.png`, `icons/icon-512.png` | `index.html` `<link rel=icon>`, `manifest.json` (purpose any) | star with a time-slider bar | no | NOT-GETTYSBURG | replaced under NEW names (`icons/gettysburg-192.png`, `-512.png`): the legacy `netlify.toml` serves `/icons/*` immutable for a year, so a changed file under an old name would never reach returning visitors | rounded gatehouse crop with a gold keyline |
| `icons/icon-maskable-192.png`, `-512.png` | `manifest.json` (maskable) | the star, full bleed | no | NOT-GETTYSBURG | replaced under new names | `icons/gettysburg-maskable-192.png`, `-512.png` (full-bleed crop, subject inside the central 80 percent) |
| `og/card-r1.png` (1200x630) | `og:image` / `twitter:image` on all 21 pages that have one (production: `screenshots/day3.png`) | gold title text, red and blue dots and drawn contour lines on near-black | no: generated art; the contours and dots are not real terrain or real positions | NOT-GETTYSBURG | replaced under a new name (social crawlers cache by URL) | `og/gettysburg-card.jpg` 1200x630, T. H. O'Sullivan's 1863 view from Seminary Ridge with the site title; `og:image:type/width/height/alt` added |
| `screenshots/day1.png`, `day3.png` (1280x720) | `manifest.json` `screenshots` (production also names `day3.png` as og:image) | generated title cards "First contact on McPherson's Ridge" and "Pickett's Charge" | no; and they were never screenshots of the app | NOT-GETTYSBURG (production: corrupt) | **removed** from the tree and from the manifest. A manifest screenshot must show the app; a photograph would also be a false "screenshot". Real app screenshots can be added once the 1863 basemap ships | none |
| `icons.svg` | not referenced by any page (site-nav.js inlines its own copy and only mentions the file in a comment) | sprite of 19 stroke-line interface glyphs (compass, search, clock, menu, camera, ...) | not a picture of anything: UI controls | UI-GLYPH | **kept**; listed for the owner. Finding: it is not well-formed XML (a `--` inside its comment) and nothing loads it | unchanged |
| inline `<svg>` (index 5, dashboard 1) | the Extra Features button, phone-view button, eye toggle (UI glyph uses) and the strength chart of `dashboard.html` | UI glyphs; a data chart | not pictures | UI-GLYPH / chart | kept | unchanged |
| `user-guide.pdf` | link from the site | text and vector tables on dark pages (6 pages) | contains no raster image, no XObject | n/a | none needed | unchanged |

Photos in pages: none. The pages named in the brief (education, aftermath, ground-remembers, camera, ar, and every other page) contain no `<img>`, `<picture>`, `srcset`, video poster or CSS `url()` image: backgrounds are `linear-gradient` and `radial-gradient` only. `ar.html` has a `<video>` element, which shows the visitor's own live camera, not a site image. The unit marks, dots and monument stars of the map are drawn by the app, not image files.

## 3. Imagery the site loads at run time (not in the tree, not changed by IMG)

| Source | Where | What | Actual image of Gettysburg? | Note |
|---|---|---|---|---|
| Mapbox `satellite-v9` raster tiles | the main map (`index.html`, 3 map instances in the entry bundle) and 7 sub-pages: camera, cinematic-export, compare, immersive, sandbox, viewshed, watch-together | present-day satellite photography (Mapbox / Maxar) | **yes, but of 2020s Gettysburg, not 1863** | licence-restricted (Mapbox terms); the 1863 reconstruction of the basemap is the job of the separate basemap1863 pipeline. IMG does not touch bundle code. Until that ships the map background shows modern roads, buildings and trees |
| Mapbox `dark-v11` / `light-v11` vector styles | `ground-remembers.html`, `compare.html` | vector map, not imagery | n/a | same dependency |
| Google Street View embed (`google.com/maps/embed/v1/streetview`) | the walkthrough in `index.html` | present-day street-level photography | yes, modern | Google licence; not 1863. Out of IMG scope; listed for the owner |
| two `data:image` strings in the entry bundle | Mapbox GL feature detection (1x1 WebP, colour-lookup prefix) | probes, not pictures | n/a | library internals |
| `https://www.nps.gov/media/video/...` | links in the walkthrough data | links to NPS pages | n/a | not embedded images |

## 4. What IMG ships now

Eleven derivative files of five public-domain 1863 photographs (Library of Congress, U.S. National Archives, The Metropolitan Museum of Art Open Access); details, licences, hashes and attribution lines are in `LEDGER.md`.

* Social card on 21 pages, favicon, apple-touch icons, four manifest icons: all crops or resizes of the photographs (the card also carries the site title). Nothing is drawn, generated or retouched.
* Three captioned figures: `education.html` (Gettysburg from the west, 1863), `turning-points.html` (interior of breastworks on Round Top, July 1863), `aftermath.html` (the Trostle farm with dead horses, July 1863; the caption says the photograph shows dead animals). Each has alt text, width/height, a `<figure>`, a caption with the photographer, date, the repository record link and the licence.
* The manifest has no `screenshots` any more.

## 5. Decisions and items for the owner

1. **Icons and logos made for the site** are allowed only if they depict Gettysburg. The star icons did not; they are replaced by crops of the Evergreen Cemetery gatehouse (it stood on Cemetery Hill in 1863 and still stands). If a different emblem is wanted (a monument, a landscape), say so; the crops are one line each in `tools/t0/images/build_images.py`.
2. `icons.svg` and the inline UI glyphs are interface controls, kept; list for restyling only. `icons.svg` is unreferenced and malformed XML: delete it or fix its comment (not done: other tools mention the file).
3. The map imagery (section 3) is still modern satellite and Street View until the basemap1863 pipeline replaces it. This is the largest remaining gap against the requirement and it is not an image file in the site tree.
4. No Google, Bing, Maxar or Mapbox imagery was used for anything IMG ships.
5. `user-guide.pdf` shows the site contact address `gettysburginteractivemap@gmail.com` on its pages. It is not the owner's personal address (that address occurs nowhere in the dist, checked by grep and in the PDF text); noted only because the brief says the personal address must appear nowhere.
6. The new files have new names; the old files are deleted from the dist, so old cached social cards are not reused.

## 6. The eight checks (all run 2026-10-19; commands in `tools/t0/images/README.md`)

| # | Check | Result |
|---|---|---|
| 1 | Byte-level decode of every image file and every referenced image (PNG chunk CRCs and pixel size, JPEG markers and EOI, ICO entries, SVG) + HTTP 200 and image content type through a Netlify-like server | T0-RIMG-01 pass; fails on `baseline/dist` for the two corrupt screenshots (T0-RIMG-02, Chrome, is lenient about them: it decodes the file and paints it grey) |
| 2 | Real Chrome decodes all 12 image files (`img.decode`, natural size equals the byte size) | T0-RIMG-02 pass |
| 3 | Source records re-read at the institutions: Met API (isPublicDomain true, title, artist, 1863, accession, primaryImage = our file), LoC item JSON (date 1863 July, rights "No known restrictions on publication.", plate 39) with LoC's own service image correlated with our master, Commons NARA template and sha1 | `verification.json` (see section 7 for its state) |
| 4 | Pixel provenance: `build_images.py --check` rebuilds every derivative and the ledger from the sha256-pinned sources and compares bytes | T0-RIMG-11 pass |
| 5 | Visual inspection of every derivative against its source (crops contain no mount, handwriting or paper edge: edge brightness equals interior brightness) and of the three pages at 1440, 375 and 320 px | screenshots in `tmp/b1863/images/shots/`; T0-RIMG-10 pass (loads, caption visible, contrast 6.4 to 8.5, no overflow) |
| 6 | Ledger and licences: every served image is a ledger row with the same sha256, every source has id, creator, date, repository, record URL, licence, type, how checked and what is uncertain; allow-list of hosts and licences | T0-RIMG-03, 04, 09 pass |
| 7 | Red-first and mutants: the 6 feature tests fail on `release/R1c/dist` (without IMG), pass with IMG; 10 mutants of a good tree (truncated PNG, flipped JPEG byte, alt removed, caption removed, og:image back on the old name, manifest size lie, hot-linked image, JPEG without EOI, generic star added back, 10 px caption) each turn the intended test red; a mutated anchor stops the build | `selftest.py` |
| 8 | Reproducibility and gates: two builds with IMG have the identical tree digest; the full gated R1c build with IMG passes all 10 gates (parse, unresolved-globals, anchors: 585 records 0 failed, ledger, references, no-legacy-asset-names, r0-mechanism, no-owner-notes, data-untouched, bytes); the control build (`--without-img`) is the stock tree | see `README.md` |

## 7. What is not claimed

* The photographs are 1863 views of the ground. They are not aerial, they are not of the armies in action, and the Round Top and Trostle prints were exposed in July 1863 after the fighting (the Met prints are dated 1863 without a month). Nothing is said to be "1:1" or "100 percent" anything.
* Attribution to O'Sullivan follows the repositories' records; the albumen prints in the NARA and LoC plates were printed by Gardner about 1865-66 from the 1863 negatives (handwritten on the mounts, and in the LoC record).
* NARA's own catalogue page could not be read by script (it needs JavaScript and an API key); for the two NARA plates the checks are the Commons NARA template (ARC number, local identifier, date, author, PD-USGov), the Commons sha1 of the exact file, and the handwritten caption "Neg. by T.H. O'Sullivan, July 1863" visible on the plate.
* The brick building in the gatehouse photograph is called the Evergreen Cemetery gatehouse (Commons category); LoC titles the photograph "Gateway of cemetery, Gettysburg".
