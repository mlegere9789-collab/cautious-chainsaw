# User guide (tutorial PDF)

`docs/guide/out/user-guide.pdf` is the tutorial the site links as **User Guide (PDF)**. It is built from the current site, not written by hand into a PDF: the words live in `content.json`, the pictures are captured from a running build, and the numbered markers on the pictures are drawn from the measured positions of the controls they point at.

This guide was built from the Release 1 candidate, train **R1d** (build `753e318f`; its release zip is packed by `tools/ship/pack_zip.py --train R1d`). The cover and the page feet carry the month of the update, not a release name.

## What is where

| Path | What it is |
|---|---|
| `docs/guide/content.json` | **The only file to edit for a new release.** Release name and build id, PDF metadata, every chapter and block (text, steps, tables, key tables, figures with their numbered notes), and the definition of every screenshot (page to open, steps to reach the state, area to crop, and the selector of every control to mark). |
| `docs/guide/shots/` | The captured pictures (`*.jpg`) and `shots.json` (picture sizes and the measured box of every marked control, plus a hash of each shot's definition). Generated; committed so the PDF can be rebuilt without a browser session on the site. |
| `docs/guide/src/guide.html`, `guide.css`, `fonts/` | The page that Chrome prints. `guide.html` is generated; `guide.css` holds the layout (Letter, running heads and feet, type scale, components); `fonts/` holds Inter and Source Serif 4 (SIL Open Font License 1.1, licence texts included). |
| `docs/guide/out/user-guide.pdf`, `build-report.json` | The deliverable and a record of the build (pages, size, SHA-256, chapter start pages, content hash). |
| `tools/guide/shots.mjs` | Captures the pictures from a site build and records the boxes. |
| `tools/guide/build.mjs` | Renders `guide.html`, prints it to PDF with headless Chrome (tagged PDF, outline), fills in the contents page numbers, replaces the metadata. |
| `tools/guide/verify.mjs` | The acceptance checks (below). |
| `tools/guide/lib/` | Helpers: `site.mjs` (find and serve a build, run steps), `render.mjs` (content to HTML, SVG callouts), `pdf.mjs`, `post.py` (metadata), `pdfinfo.py` (reads the PDF for the checks), `fill.py` (how full each page is). |

The older candidate generator in `tools/guide/build-guide.mjs`, `guide-content.mjs`, `features.json` and `candidates/user-guide/` is separate and is not used by this pipeline.

## Rebuild for a new release

Requirements: Node 24, the repository's `node_modules` (playwright-core), Google Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe` (or set `GUIDE_CHROME`), Python 3.11 with `pypdf` and `PyMuPDF`.

1. Build the release as usual and have its production zip (or its `dist` folder) ready.
2. Edit `docs/guide/content.json`:
   * `release`: `train`, `build` (the release id in the zip's `version.json`), `zip` (path of the production zip), `label`, `updated`, `date` (`YYYY-MM-DD`, written into the PDF metadata).
   * Change any chapter text that the release changed. Prose uses a small markup: `**On-screen label**`, `[[Key]]`, `` `code` ``, `[text](url)`, `{play} {prev} {next} {back12} {fwd12}`, `{train}`, `{release}`.
   * For a new control, add a callout to the relevant figure (`{ "n": 3, "el": "name", "title": …, "text": … }`) and add `name` to that shot's `elements` with a selector. For a new page, add a card to chapter 7 and a `shots` entry.
   * A `shots` entry says how to reach the state: `url` and optional `steps` (`goto`, `click`, `clickAt`, `press`, `type`, `fill`, `select`, `hover`, `wait`, `waitFor`, `hide`, `scrollTop`), `device` (`desktop` is 1440 x 900, `phone` is 390 x 844), `clip` (a rectangle, a selector, or `panelOf` a text to crop to the dialog that holds it), `outScale` (output pixels per CSS pixel), `elements` (selector, or `{ "sel", "pad" }`, or `{ "union": [selectors] }`).
3. `node tools/guide/shots.mjs --zip deliver/<new>.zip` (all shots) or `--only id,id` (some). It opens the site in headless Chrome through the repository's capped test harness (the production Referer is injected on Mapbox requests; the budget is 1,500 requests per run, set with `--tile-cap`). A shot fails if a named control is missing, which is how a changed UI is noticed.
4. `node tools/guide/build.mjs --png` writes `docs/guide/out/user-guide.pdf` and, with `--png`, one picture per page in `tmp/guide/pages/` to look at. Look at every page.
5. `node tools/guide/verify.mjs` must report every check as passed. Add `--no-site` to check the file alone, `--zip`/`--dist` to point at another build.

## What `verify.mjs` checks

* **File**: under 6 MB, Letter size, build report equals the file, content and shots unchanged since the build.
* **Metadata**: Title `Gettysburg Interactive Map: User Guide`, Author `Gettysburg Interactive Map`, Subject, Keywords, Creator and Producer equal to the site name, an XMP packet with the same title and author, language `en-US`, viewer opens on the bookmarks and shows the title.
* **Copy audit**: regular expressions for AI and tool mentions (assistants, language models, document and PDF software, browsers, languages, "anonymous", "unknown", "generated by", and so on) run on the extracted text, the Info dictionary, the XMP packet, every PDF object, the prose of `content.json` and the visible text of `guide.html`.
* **Fonts**: every font embedded, only Inter and Source Serif 4 used, nothing under 6.5 pt.
* **Text and content**: text selectable on every page; every string of `content.json` is found in the PDF text; they appear in order, page by page.
* **Accessibility**: tagged PDF, one H1 per chapter, alternative text on figures, tagged tables with header cells and tagged lists, document language.
* **Outline and links**: a bookmark for every chapter and for the headings; the contents page numbers are the pages the chapters start on; the contents list links to every chapter; every external link goes to the site or its contact address; every page named in chapter 7 has a link.
* **Live build** (skipped with `--no-site`): the build under test is the one the guide documents; every control named in a figure exists at its stated selector and is visible; the toolbar and the Extra Features menu in the guide equal the live ones in both directions; the Help dialog lists the documented keys; the documented keys and the link settings of chapter 6 behave as written; every page of chapter 7 opens and has the controls named for it; the phone layout has its Tools sheet with the named buttons.

## How it gets into the deploy zip

The site ships `/user-guide.pdf`. In the train builds it comes unchanged from `baseline/dist/user-guide.pdf` (14,321 bytes, `baseline.lock.json` entry `user-guide.pdf`, SHA-256 `b235403d…`). Production has not changed this file since the downloaded deploy, so the overlay guard allows replacing it (the guard only refuses `index.html` and `data/terrain.json`).

**Registered in train R1d (2026-10-21):** `python tools/t0/r1d_prepare.py` copies `docs/guide/out/user-guide.pdf` to `tools/t0/overlay/R1d/user-guide.pdf`, which `python tools/t0/build.py --train R1d` lays over `dist/user-guide.pdf` after the page phase (listed in `manifest.json` under `overlay[].replaced`). The published trains (R0 to R1c) keep the 14,321-byte guide of the downloaded deploy (`baseline.lock.json` entry `user-guide.pdf`, SHA-256 `b235403d...`); `verify-live` pins that file, so a later train that ships the new guide needs its own pin.

After every rebuild of the guide: run `node tools/guide/verify.mjs --zip <the zip that will be deployed>`, copy the PDF into the overlay (`python tools/t0/r1d_prepare.py`), rebuild R1d, repack, and prove the zip carries the PDF whose hash `docs/guide/out/build-report.json` records.

Nothing in this folder edits the release system; the overlay copy is a one-line change for whoever packs the release.

## Design notes

* Page: US Letter, 0.85 in side margins, running head (name, chapter) and foot (release, page number), cover without head and foot.
* Type: Source Serif 4 for headings and lead text, Inter for everything else; scale 7 / 8.5 / 9.5 / 12.5 / 15 / 22 / 30 / 58 pt on a 14 pt baseline.
* Colour: the site's ink `#0a0a14`, panel `#12121e` and gold `#c9a24b`, with a deeper gold (`#7d5f14`, 5.6:1 on the paper) for small text on the warm white page.
* Callouts: a numbered gold badge and an outline per control, drawn in SVG from the boxes measured on the live page, so a marker cannot drift from its control.
* Pictures are captured at 1.3 to 2 output pixels per CSS pixel; phone pictures at 1.6.
