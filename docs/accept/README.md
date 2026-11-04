# End-of-mission acceptance harness (`tools/accept/`)

Automates the owner's order in `docs/battle-theatre/GOVERNANCE/FINAL-ACCEPTANCE.md`: **eight consecutive fresh clean passes** over one unchanged candidate, any defect resets the count to 0.
Nothing in this folder touches the site, `tools/t0`, `tests/t0` or `release/`; it only reads them. Everything it writes goes to `docs/accept/` (plus a throw-away temp directory).

## Run it

```
# one pass (any candidate: a zip, or an unzipped dist directory)
node tools/accept/run_pass.mjs --candidate deliver/gettysburg-R1c-2531699e-PRODUCTION.zip --pass 1 --baseline baseline/dist

# the acceptance: 8 passes in a row, stops at the first defect, writes docs/accept/EIGHT-PASS-LOG.md
node tools/accept/run_eight.mjs --candidate deliver/<final>.zip --baseline baseline/dist --soak-seconds 600
#   add --full to run the whole tools/t0/run_suites.mjs in check 6 (about 2.5 h per pass)
#   add --dry-run for a rehearsal (soak 120 s by default, writes docs/accept/dryrun/, can never report success)

# the copy audit alone
node tools/accept/copy_audit.mjs deliver/<final>.zip          # --json out.json, --show-whitelisted
node tools/accept/copy_audit.selftest.mjs                      # plants every kind of leak and proves each is found
```

Useful `run_pass.mjs` options: `--only 2,8` (development; the pass is then INCOMPLETE and can never be clean), `--routes historian,index` (same), `--soak-seconds N`
(default 120; acceptance needs 600), `--frame-seconds N` (animation sampling, default 12), `--tile-cap N` (Mapbox requests per pass, default 20000), `--port-base N` (default 8700),
`--input-scope app|all`, `--input-parts sweep,keyboard,map,prefs`, `--cpu-throttle-phone 4` (Lighthouse-mobile-like CPU slowdown for the phone Web Vitals; `1` disables),
`--soak-shells desktop,phone`, `--repack auto|none|<train>`, `--expect-sha <hex>` / `--prev-sha <hex>`, `--keep-scratch`, `--trace`.
Exit codes: `0` CLEAN, `1` defects, `3` incomplete (a check or part of a check did not run), `2` bad usage, `4` harness crash.

Outputs per pass: `docs/accept/passes/pass-N.json` (everything, machine-readable, with raw sections), `pass-N.md` (commands, versions, metrics, defects, notes), and
`pass-N-artifacts/` (screenshots, diff images, verify_release JSON; git-ignored). `run_eight.mjs` archives the previous run's files under `passes/archive/<time>/` before starting.

## What "fresh" means here

Every pass is its own process. The candidate zip is unzipped into a brand-new temp directory, served from there by `tools/t0/serve.mjs` (Netlify-like pretty URLs, 404.html) behind a thin proxy
(`tools/accept/lib/netlify_server.mjs`) that applies the candidate's own `_headers` and `_redirects`. Every Chrome session gets a brand-new profile directory (no cache, no storage, no service worker),
through the project's own harness `tests/t0/lib.mjs` (system Chrome, CDP, the capped Referer-injecting Mapbox side channel). The only thing read from another pass is the previous zip hash (check 1).
`run_eight.mjs` records the zip SHA-256, a digest of this harness plus the project harness/verifier/packer, the baseline tree and the built dist of the train before **and** after every pass; if any
of them moves, the run is ABORTED (no code or candidate change allowed in between) and success is never reported.

## The eight checks, what each one does, and when it is a defect

A pass is **CLEAN** only if all eight checks ran completely and found **zero** defects. A check, or a part of a check, that did not run is recorded as `NOT RUN` / `PARTIAL` with the reason; it is never a pass.

| # | Check | What it does | Defect when |
|---|---|---|---|
| 1 | Deterministic zip | structure of the zip (files at the root, sorted, CRCs, no comment, portable names); SHA-256 against the previous pass, `--expect-sha` and the `<zip>.sha256` sidecar; re-packs `release/<train>/dist` with `tools/ship/pack_zip.py` into a temp file | any hash differs, repack differs, zip comment/entry comments, wrapper folder; **NOT RUN** if there is nothing to compare with |
| 2 | Static hygiene | parses every HTML (structural lint: unclosed/stray tags, duplicate ids/attributes, doctype, lang, title, viewport), CSS (balance), JS (acorn), JSON, inline scripts/styles; crawls every internal reference of every HTML/CSS/JS/manifest/sitemap/robots over HTTP (200, MIME type, fragments); finds `http://` resources; loads **every route** in a fresh Chrome (Mapbox pages with real tiles) collecting console error/warning, `pageerror`, failed and >=400 requests, CSP report-only violations, broken images/fragments, missing map canvas; service worker install, control after reload, cache, **update drill** (changed `sw.js`, waiting worker, no page reload, new cache after the old tabs close, old cache purged) | any single one of those |
| 3 | Regression vs published build | `--baseline` (baseline/dist = production deploy 6abd6d62): file list (hash-normalised asset names), JSON data files structurally (removed keys, shrunk arrays), every route and both URL spellings answer 200, per route at 1440x900 and 390x844: **pixelmatch-style screenshot diff** (YIQ 0.1, anti-aliasing exempt; regions and bbox reported, diff PNGs kept), visible text lines lost, controls without a counterpart (matched by tag and any of aria-label/text/title/placeholder/value/label). Map canvases are hidden before the shot | anything missing or worse, diff ratio over 0.2 %, unless an **owner-approved** entry in `tools/accept/regression_waivers.json` explains it (then it is a note with the reason) |
| 4 | Input matrix | desktop 1440x900 (mouse + keyboard) and phone 390x844 (touch, mobile emulation): every control in the accessibility tree (CDP `Accessibility.getFullAXTree`) of every route and of the first-visit onboarding is activated by click/tap, Enter, Space, typing, arrows as its role allows; latency = input to first DOM change to next paint (+ Event Timing); long tasks in the interaction window; no-response detection (DOM, focus, scroll, URL, then a pixel comparison); controls without accessible name; keyboard Tab walk (reachability, order, covered/off-screen focus, positive tabindex, **focus visibility** by outline/shadow/pixels); map gestures on the app (wheel, drag, ctrl+wheel pinch, right-drag, double-click, keys / swipe, two-finger pinch, double-tap) with latency to `movestart` and frame times; dark/light scheme contrast and `prefers-reduced-motion` (no infinite CSS animation) on every route | latency > 100 ms, any long task > 50 ms in an interaction, no response, unnamed control, uncovered/unreachable control, invisible focus, gesture without effect, p95 frame > 20 ms during a gesture, console errors |
| 5 | Performance | cold (cache/storage/SW cleared) Web Vitals per route on both shells: LCP, CLS (largest 5 s window), FCP, TBT proxy; INP from 30 real clicks on the app; rAF frame-time distribution while the animation plays at **1x and 4x** (desktop and phone); JS heap after forced GC over the soak, DOM node and listener counts, heartbeat for hangs, crash detection | outside `thresholds.json` (see below) |
| 6 | Accuracy | `tools/t0/verify_release.mjs` run on the **candidate bytes** (a temp release dir whose `<train>/dist` is the unzipped candidate); the fast subset of `tests/t0` suites and Node-only data/clock/historian suites listed with reasons in `tools/accept/accuracy_subset.json`; `--full` runs `tools/t0/run_suites.mjs` | any non-zero exit, candidate differs from `release/<train>/dist` |
| 7 | Visual QA | every route at 360, 390, 768, 1024, 1440, 1920 px (<= 1024 px with touch + mobile emulation) plus the app's first-visit modal: screenshots, horizontal overflow, clipped text, overlapping and covered elements, axe (color-contrast, image-alt, role/svg/input/area alt, names, labels, title, lang, viewport, ARIA validity), tap targets, alt text quality, layout shift, text under 12 px, placeholder text (lorem, TODO, undefined, NaN, `{{ }}`), default-browser styling leaks | any of those over its threshold |
| 8 | Copy audit | `copy_audit.mjs` over every shipped byte | any non-whitelisted finding |

### Thresholds (`tools/accept/thresholds.json`; a value outside the band is a defect, amber does not exist)

LCP <= 2500 ms, CLS <= 0.1, INP <= 200 ms, TBT proxy <= 200 ms, p95 frame time <= 20 ms (desktop and phone), >1 % of frames over 100 ms is jank, response to input <= 100 ms,
long tasks per interaction 0 (>50 ms), heap growth <= 10 % over the soak (also DOM nodes/listeners <= +25 %), tap targets >= 44 px up to 1024 px width and >= 24 px above, text >= 12 px, CLS per page load <= 0.1.
Never loosen a threshold to make a pass clean; a threshold change changes the harness digest and aborts a run in progress.

### The copy audit (`tools/accept/copy_audit.mjs`)

Scans every file of the candidate: zip entry names, zip comment and entry comments; text/HTML/CSS/JSON/XML/SVG/TOML/`_headers`/`_redirects`/source maps as raw text with word-boundary rules (HTML is split into
comments, attributes, meta/og tags, titles, visible text and inline scripts); JavaScript (files and inline) **only string literals, template text and comments** via the acorn tokenizer, so minified identifiers such as `Ai`
or `agent` never match; PDF Info dictionary (raw and normalised), XMP, text of every page, outline, links, attachments, fonts, plus raw printable strings (`pdf_probe.py`, pypdf); PNG `tEXt/zTXt/iTXt/eXIf/iCCP`/unknown chunks and
bytes after `IEND`, JPEG `APPn/COM` and trailing bytes, WebP `EXIF/XMP/ICCP`, GIF comments; other binaries by printable strings. Rules: claude, anthropic, openai, chatgpt, gpt-, copilot, gemini, llm, language model,
artificial intelligence, AI (whole word, which covers `AI-` and ` AI `), A.I., machine-generated, generated by, auto-generated, subagent, agent (not `user agent`), prompt, OWNER TO CONFIRM, lorem ipsum, TODO/FIXME/XXX,
DO NOT EDIT, `(anonymous)`, `(unspecified)`, the DEC-006 label wording, PDF Producer/Creator (empty, or exactly the site's name, and never a tool or vendor name; raw PDF strings are read outside the compressed stream bodies, whose decoded text, XMP, outline, links and fonts are scanned separately), shipped README/notes/`.md`/`.map`/dot files.
`tools/accept/copy_whitelist.json` holds `{file, regex, reason}` entries (file may be a glob; the regex is tested against the ~40 characters around the match); whitelisted hits are still listed with their reason.
It is empty on purpose: a product feature such as the Ask the Historian page ("not an AI") is a decision for the owner, who adds an entry with the reason.

## Judgement calls built into the checks (all visible in the pass reports; change them only by an owner decision)

- **Modals and overlays.** The first-visit onboarding card is not `role=dialog`, so its four controls are found by hit-testing; each is activated on a fresh load (activating one dismisses it) and the controls behind it are exercised in the main state. A full-screen overlay that carries its own button (the Immersive sound gate) switches off the covered/overlap tests for that page; so does the onboarding state in check 7.
- **State.** Every control of the app gets a fresh page load (the app keeps UI state such as hidden menus and open panels). On other pages a control that is covered/not focusable gets one fresh load and is judged again.
- **Repeat activations.** If Enter/Space reaches a button (a click event arrives) but nothing visibly changes because an earlier mode already changed that state, it is a note (`repeat-activation-no-change`), not a defect. A key press that produces no click at all is a defect.
- **Not activated, by design:** external links, `mailto:`/`tel:`, PDF/download links (reachability is proven by check 2), skip links with the pointer (they are off-screen until focused: Enter only).
- **Skipped in check 7:** content of a closed `<details>`, screen-reader-only text, elements fully off-screen. Mapbox attribution and logo targets under the minimum are reported as a **note** (`third-party-small-target`), not counted: the owner decides whether to enlarge them.
- **Tap targets:** 44 px at widths up to 1024 px (touch emulation), 24 px above. **Default font** leak is flagged only when more than half of the visible text is set in the browser default serif.
- **Response latency:** measured from the event that activated the control (a tap's `touchend`, a Space key's `keyup`, a click) to the second animation frame after the first DOM change, so the 50 ms hold of an artificial tap is not charged to the site. Navigations are judged by first contentful paint of the new page (limit 1000 ms), not by the 100 ms rule.
- **Sampling that costs Mapbox map loads:** one pass uses roughly 250-400 Mapbox map loads (skus) and 4000-5000 tile requests (the pass JSON reports both); the default cap is 20000 requests (`--tile-cap`).

## What is NOT covered (read before trusting a green)

- **Real devices.** No iOS/WebKit, no Android Chrome, no Samsung Internet; "phone" is Chrome with mobile emulation and CDP touch events. No real notch/safe-area/`dvh` behaviour, no real keyboard on a phone.
- **Safari and Firefox.** Only the system Chrome (version recorded in each pass), headless.
- **Lighthouse CI proper.** There is no Lighthouse run here: Web Vitals come from the Performance API of a local, unthrottled-network run (CPU 4x on the phone shell by default, `--cpu-throttle-phone`), TBT is a proxy
  (long tasks from FCP to 3 s after load), INP comes from scripted clicks. Treat the numbers as indicative, not as Lighthouse scores.
- **GPU.** Headless Chrome uses whatever GPU/software renderer the host provides (the WebGL renderer string is recorded); on SwiftShader the frame times are pessimistic, on a fast GPU optimistic.
- **Netlify's edge.** Only the generated `_headers` and `_redirects` are emulated (no compression, no CDN, no host-based rules, no `netlify.toml` tables). Header correctness on the real deploy needs `tests/t0/prod-probe.mjs` / `ops/headers-probe.mjs` after publishing.
- **External resources** (Google, NPS, Mapbox beyond the capped side channel) are not exercised for correctness; external links are listed, not requested. The map pages load `mapbox-gl.js` from `api.mapbox.com` at runtime.
- **Mapbox usage.** The tile side channel is capped per pass (default 20000 requests; Mapbox bills map loads, one sku per initialisation: each pass reports how many it used). If the map cannot load (restricted token, outage, cap reached) the parts that need it are recorded NOT RUN and the pass is not clean.
- **Accuracy.** Check 6 runs a fast subset unless `--full`; passing suites show the machinery is consistent with its own expectations, not that the historical anchors are correct.
- **Human judgement.** Design polish ("big-design-firm" quality), copy tone, the tutorial PDF's page-by-page match with the UI, and screen-reader use are not automated; check 7 stores screenshots for review, check 8 only reads the PDF's text and metadata.
- **Time-dependent content.** Pages whose text or pixels change with the date/time can differ between baseline and candidate runs and need a waiver with a reason.

## Files

```
tools/accept/run_pass.mjs        one fresh pass            tools/accept/thresholds.json       the green band
tools/accept/run_eight.mjs       the 8-in-a-row driver     tools/accept/copy_whitelist.json   owner-approved copy exceptions
tools/accept/copy_audit.mjs      copy audit (+ .selftest)  tools/accept/regression_waivers.json  owner-approved regressions (check 3)
tools/accept/pdf_probe.py        PDF metadata/text dump    tools/accept/accuracy_subset.json  check 6 subset and why
tools/accept/checks/c1..c8_*.mjs the eight checks          tools/accept/lib/*                 server, browser, parsers, image diff, input machinery
```
