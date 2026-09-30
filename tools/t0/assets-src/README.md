# tools/t0/assets-src - WP-T0-13 / WP-T0-14 sources

Everything the map sub-pages / social-card work needs that is not a plain patch. The **built artifacts are committed** (overlay + `PG-maps.json`), so a normal
`python tools/t0/build.py --train R1a` never runs Chrome or the network.

| file | what |
|---|---|
| `card.html` | own vector/typographic art (D-MEDIA: no third-party basemap imagery, no screenshot). `#og` 1200x630, `#day1` / `#day3` 1280x720. Seeded PRNG, no network, no Date. Name-neutral: no product name, no counts, no clock claims |
| `render.mjs` | headless system Chrome (playwright-core, profile `tmp/t0-maps/chrome-profile/render`) -> raw PNGs |
| `build_assets.py` | render + convert to 8-bit RGB + write `overlay/common/{og/card-r1.png, screenshots/day1.png, screenshots/day3.png, icons/icon-maskable-{192,512}.png, manifest.json, google0dca4879c9657741.html}` + `assets.lock.json`. `--check` re-verifies without Chrome |
| `check_images.py` | T0-IMG-01: Pillow full-decode of every og/twitter image, every manifest icon/screenshot (declared size, single purposes, maskable safe zone), `apple-touch-icon.png`, `favicon.ico`, the GSC file. Exit 1 on any problem (39 on `legacy/dist`, 0 on R1a) |
| `sri.json` | SRI pins (sha384) for `mapbox-gl.js`, `mapbox-gl.css` (both 3.24.1) and `peerjs@1.5.4/dist/peerjs.min.js`, with the fetch evidence |
| `gen_pg_maps.mjs` | generates `tools/t0/patches/PG-maps.json` (77 patches) from `legacy/dist`, asserting every anchor; `--check` fails when the committed JSON is stale |

```
node   tools/t0/assets-src/gen_pg_maps.mjs [--check]
python tools/t0/assets-src/build_assets.py [--check]
python tools/t0/assets-src/check_images.py --dist release/R1a/dist
node   tests/t0/pages-maps.spec.mjs [--dist <dist>] [--filter re] [--expect-red] [--online] [--perf ...]
```

## Decisions worth knowing

* **OG card path.** New file `/og/card-r1.png` (crawlers cache og:image by URL, so a new path refreshes previews); `og:image`/`twitter:image` are patched on all
  21 pages (32 patches, single-line anchors). The corrupt `screenshots/day1.png` / `day3.png` are ALSO replaced (valid 1280x720 RGB) so any stale reference
  still resolves to a decodable image, and they remain the manifest screenshots.
* **Manifest screenshots are title cards, not app screenshots.** They are labelled with the existing text and drawn from the same abstract art (no basemap, no UI).
  Real UI screenshots on an own basemap wait for the rebuild (D-MEDIA). Dropping the two `screenshots` entries is a one-line change in `build_assets.py`.
* **Maskable icons get new names** (`/icons/*` is `immutable`, one year): `icon-maskable-192/512.png`, full-bleed `#0a0a14`, the existing star + slider scaled
  into the 80 % safe circle (measured 0.36 of the size, limit 0.40). The two existing icons keep their bytes and names and now say `"purpose": "any"`.
* **CLS guard (found by measuring).** With the library off the critical path, first paint now happens ~2 s before the data arrives, so the "Loading ..." placeholder
  (and compare's hidden panes) were on screen when they disappeared: CLS 0.17 compare, 0.07 cinematic-export, 0.06 immersive, 0.05 watch-together (it was 0 before). Patch ids
  `maps:*:cls-*` take the placeholder out of the flow (absolute) and hide compare's panes with `visibility` instead of `display`; the final layout is unchanged. Test `PG-02b`.
* **Known side effect, owner of `site-nav.js` to decide:** the shared nav renders at DOMContentLoaded, which now waits for the deferred library, so on a slow link the nav bar (space reserved by
  PG-core, no shift) appears after first paint. `site-nav.js` runs at the end of `<body>`, so it could render immediately instead of waiting for DCL.
* **SRI** on the Mapbox files fails closed (a changed byte stream behind the v3.24.1 URL blocks the library). `sri.json` says how to drop it (patch ids `maps:*:css`, `maps:*:js`).
* **Manifest is replaced as a whole file** (overlay) because it is tiny and CRLF; every unchanged field is echoed from `legacy/dist/manifest.json` by the generator,
  never retyped (`name`, `short_name`, `description` stay identical: identity changes are Train S2).
* **Old service worker.** Returning visitors keep the OLD manifest/icons until the v5 worker is replaced (it precaches `/manifest.json` and the icons cache-first, section WP-T0-14 risk); the new images are served to everyone at once.
