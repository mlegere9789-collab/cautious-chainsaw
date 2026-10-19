# IMG: the site uses only actual images of Gettysburg

Optional patch group (owner requirement 2026-10-19). Replaces every generic or corrupt image the built site served (star icons, generated title cards, the corrupt `screenshots/day*.png` that production still names as og:image) by derivatives of public-domain 1863 photographs, adds three captioned period photographs, removes the PWA "screenshots" that were never screenshots, and adds a licence ledger and a test. Nothing is registered in `trains.json`; nothing under `release/` is touched.

* What was found and why: `docs/basemap1863/site-images/INVENTORY.md`
* Licence ledger (every shipped file: what it shows, source, licence, attribution, derivation, sha256): `docs/basemap1863/site-images/LEDGER.md` (+ `ledger.json`)
* Test: `tests/t0/images.spec.mjs` (T0-IMG-01..11, X)

## Use

```
python tools/t0/images/fetch_sources.py                       # the 5 source photographs, sha256-pinned, into tmp/b1863/images/sources/ (polite: 1 request per 6 s)
python tools/t0/images/build_images.py                        # derivatives -> tools/t0/images/overlay/common/** and the ledger (committed; --check compares)
python tools/t0/images/gen_patches.py                         # tools/t0/patches-next/IMG.json + IMG-overlay.json from a built R1c (--check compares)
python tools/t0/images/img_build.py --train R1c --out tmp/b1863/images/img-R1c       # a train WITH IMG (gates on; --no-gate for speed; --without-img = control)
node tests/t0/images.spec.mjs --dist tmp/b1863/images/img-R1c/dist                    # 12 tests, 0 Mapbox requests
node tests/t0/images.spec.mjs --dist release/R1c/dist --expect-red                    # red-first: every feature test fails on a tree without IMG
python tools/t0/images/inventory.py --dist <tree> [--json out.json]                   # counts and classification of every image of a tree
python tools/t0/images/verify_sources.py                                              # re-read the institutions' records (Met API, LoC JSON, Commons NARA template)
python tools/t0/images/selftest.py                                                    # wrapper refusal, determinism, mutated anchors, 10 mutants of a good tree
```
Ports: `T0_PORT_BASE=9740` (static server 9740, Chrome 9741); scratch `tmp/images/`. Builds run at below-normal priority.

## How the group is wired (why a wrapper)

`tools/t0/build.py` loads only groups that `trains.json` names, and `trains.json` is not ours, so `img_build.py` (same pattern as `tools/t0/mon/mon_build.py`):

* reads `trains.json` in memory (nothing written back) and calls `build.py`'s `build_train` with `--patches` and `--overlay` pointing at scratch copies under `tmp/`;
* stages `tools/t0/patches-next/IMG.json` into the scratch patch directory as the **page group** `PG-zimg` (optional, requested with `--with`). Page groups run in file-name order after every fixed group, i.e. after `PG-maps`, whose `og:image` text (`og/card-r1.png`) the IMG anchors expect. As a fixed or bundle group IMG would run before PG-maps and its anchors would not exist;
* stages the overlay: removes `og/card-r1.png`, the two maskable icons and the two `screenshots/*` from the scratch copy of `tools/t0/overlay/common`, edits its `manifest.json` with the asserted rows of `IMG-overlay.json` (a row that does not match exactly once stops the build, so a later change of that manifest cannot be reverted silently; CRLF is preserved), and copies `tools/t0/images/overlay/common/**` in;
* `IMG.json` itself: 21 `og:image` rows, 11 `twitter:image` rows (each asserted `expect: 1` on its page, with `og:image:type/width/height/alt` added), 3 figure rows (anchor `</header>` on education, turning-points, aftermath), 1 icon link row on `index.html`, and `delete` of the four baseline files `icons/icon-192.png`, `icons/icon-512.png`, `screenshots/day1.png`, `screenshots/day3.png`.

New files get new names (`og/gettysburg-card.jpg`, `icons/gettysburg-*.png`, `img/*.jpg`): the legacy `netlify.toml` serves `/icons/*` immutable for a year and social crawlers cache by URL, so no file is replaced under an old name except the three root icon files (`favicon.ico`, `apple-touch-icon*.png`), which are not immutable.

## Integration (owner of `trains.json`)

1. `git mv tools/t0/patches-next/IMG.json tools/t0/patches/PG-zimg.json`, set `"group": "PG-zimg"`, `"train": "R1a"` (drop `"optional": true`, or leave it and build with `--with PG-zimg`).
2. Copy `tools/t0/images/overlay/common/**` into `tools/t0/overlay/common/`; delete `tools/t0/overlay/common/screenshots/*`, `og/card-r1.png`, `icons/icon-maskable-*.png`; apply the two rows of `IMG-overlay.json` to `tools/t0/overlay/common/manifest.json`.
3. `python tools/t0/images/gen_patches.py --check` and `node tests/t0/images.spec.mjs --dist release/R1c/dist` must then pass.

## Licences and honesty

Sources are only public-domain or openly licensed: the Metropolitan Museum of Art Open Access API (CC0), the Library of Congress (rights statement "No known restrictions on publication"), the U.S. National Archives (via the Wikimedia Commons file pages that cite the ARC records). `fetch_sources.py` refuses any other host. Nothing from Google Earth, Google Maps, Bing, Maxar or Mapbox is used. Derivatives are crops and resizes (the social card also has the site title over a crop); nothing is generated, painted or retouched. No aerial or satellite photograph of 1863 exists; none is shown or implied. The reconstructed 1863 basemap is a separate, labelled reconstruction.

Limits: the test reads the ledger from `docs/basemap1863/site-images/`; Georgia Bold and Segoe UI (Windows font folder, not redistributed) are needed only to regenerate the card; the NARA catalogue could not be read by script (see INVENTORY.md section 7); Chrome checks are headless Chrome on Windows.
