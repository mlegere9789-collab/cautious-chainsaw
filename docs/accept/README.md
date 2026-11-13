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

# the runners themselves (child environment behind a proxy, load average in every summary); no browser, under a minute
node tools/t0/tests/runner_selftest.mjs                        # --online adds one real fetch through the harness (see "Behind a proxy" below)
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

## Behind a proxy, and the load of the machine

Both are handled by the runners themselves (`tools/t0/child_env.mjs`, used by `tools/t0/run_suites.mjs` and by `runCmd` / `runCmdAsync` in `tools/accept/lib/util.mjs`); no environment has to be prepared by hand.

**Proxy.** On a machine whose outbound HTTPS goes through a proxy that re-terminates TLS (`HTTPS_PROXY` or `https_proxy` is set to a non-empty value; the cloud container of the release work is such a machine),
Node's own `fetch()` ignores the proxy unless `NODE_USE_ENV_PROXY=1` is set and trusts the proxy's certificate only through `NODE_EXTRA_CA_CERTS`. A suite that downloads a file with Node
(`tests/t0/pages-maps.spec.mjs` and `pages-fixes.spec.mjs` fetch the pinned, SRI-checked Mapbox GL library once into `tmp/<agent>/vendor`; `pages-maps` is in the check 6 subset) then ends in `TypeError: fetch failed` before its first test.
So, when a proxy is set, every child process gets

| variable | value | only if |
|---|---|---|
| `NODE_USE_ENV_PROXY` | `1` | the variable is not set |
| `NODE_EXTRA_CA_CERTS` | `/root/.ccr/ca-bundle.crt` | the variable is not set **and** that file exists |
| `NODE_OPTIONS` | the value it has, then ` --disable-warning=UNDICI-EHPA` (that one flag, appended; a missing or empty value becomes just the flag) | the rule turns `NODE_USE_ENV_PROXY` on in this very call, the runner's Node reads that variable (22.21 and later 22.x, 24 and later), and the flag, `--no-warnings` or `NODE_NO_WARNINGS=1` is not there already |

Why the third row. Node 22 writes two warning lines to stderr (`[UNDICI-EHPA] Warning: EnvHttpProxyAgent is experimental ...`) at the start of **every** process that has `NODE_USE_ENV_PROXY=1`.
A test that reads the merged stdout and stderr of a Node child then sees output it never sees without a proxy. That happened: case 16 of `tools/t0/tests/baseline_selftest.py` (suite `static.baseline`)
parses the last line of `node`'s output as JSON, and in the first run with the proxy-aware runner (2026-11-13) `static.baseline` was 16/17 (`JSONDecodeError`; 17/17 in every earlier log).
The flag silences that one warning code and no other, so a child behind the runners has the same stdout and stderr as on a machine with no proxy. Case 16 now also takes "the last line that is a
JSON object", so it passes when somebody sets the variable by hand, too (red-first: the old file fails with the variable set, passes without it; the new file passes both ways).

"Every child process" is: each suite and each parallel slice of `run_suites.mjs`; each pass that `run_eight.mjs` starts; `verify_release.mjs`, every suite and step of check 6 and the `--full` run of `run_suites.mjs`; the packer and the PDF probe.
The variables are inherited, so the Node processes that a Python suite starts have them too.
**Nothing else changes:** with no proxy the environment is handed on exactly as before (the same object), and a variable that is already set, to any value including the empty string, is never overwritten
(`NODE_OPTIONS` is the one value that is extended, by the one flag above, and only when the rule itself turned `NODE_USE_ENV_PROXY` on: a caller that sets `NODE_USE_ENV_PROXY` itself, even to `0`, keeps its choice and its `NODE_OPTIONS`).
A `run_suites` summary says what happened in `childEnv` (`{ "httpsProxy": true, "added": ["NODE_USE_ENV_PROXY"], "extended": ["NODE_OPTIONS"] }`: `added` are names that had no value, `extended` names that had one and got the flag appended;
names only, neither the proxy address nor a value is ever written), and its second console line says the same (`child environment + NODE_USE_ENV_PROXY, NODE_OPTIONS (extended) (an HTTPS proxy is set)`).

Limits, so nobody reads more into it:
- A suite started **by hand** (`node tests/t0/pages-fixes.spec.mjs ...`) gets no help: start it through a runner, or set the two variables yourself.
- The runner's own process is not changed. `run_pass.mjs` fetches only from its local servers in-process; Chrome reads the proxy from the environment by itself.
- Node older than 22.21 (and every 23.x) ignores `NODE_USE_ENV_PROXY`. There the rule still sets it (harmless) but adds no `NODE_OPTIONS` flag: there is no warning to silence, and an old Node refuses a flag it does not know.
  The Node version that decides is the runner's own; a different `node` on the `PATH` of a child is assumed to be the same install (true here: `/usr/local/bin/node` is a link to `/opt/node22/bin/node`).
- A caller that sets `NODE_USE_ENV_PROXY=1` itself (what this README used to advise for a suite started by hand) keeps its choice, and with it Node's two warning lines in every Node process: the rule leaves what the caller set alone.
  Set `NODE_OPTIONS=--disable-warning=UNDICI-EHPA` as well when the output of such a run is read by a program.
- The CA bundle path is the cloud container's. On another machine with a TLS-intercepting proxy set `NODE_EXTRA_CA_CERTS` yourself (it is then kept).
- Requests of a suite to its own local servers (`127.0.0.1`) stay direct as long as `HTTP_PROXY` is not set or `NO_PROXY` lists them (true on every machine used so far).

**Load.** A timing result is only evidence together with the load it was measured at, so every runner writes down the machine's 1-minute load average (`os.loadavg()[0]`, two decimals) at the start and at the end of what it runs:

| where | fields |
|---|---|
| `run_suites.mjs` summary (`--json`, default `release/test-summary.json`) | every row: `load1Start`, `load1End`; the run: `load1: { start, end }`, `machine: { platform, cpus, node }`; console line of every suite: `load a>b` (kept by `--merge`, read back by `--import-log`; rows of logs written before 2026-11-13 have `null`) |
| `docs/accept/passes/pass-N.json` | the pass: `env.load1Start`, `env.load1End`; every check: `checks[].load1Start`, `load1End`; every command: `checks[].commands[].load1Start`, `load1End`; every suite of check 6: `raw.suites[].load1Start`, `load1End` of that check |
| `pass-N.md` | a row "Load average (1 min)" in the head table, a column "Load (1 min) start > end" in the summary, `load a>b` after every command |
| `docs/accept/eight-pass-state.json`, `EIGHT-PASS-LOG.md` | every pass: `load1Start`, `load1End`; one line under the table of a run (runs recorded before 2026-11-13 have none) |

Windows has no load average (Node reports 0 there), so on Windows the fields are `null` and the reports say "n/a": a missing measurement, never a zero.
The tools only record the load. They never drop, relabel or repeat a result because of it: whether a timing failure measured on a busy machine is repeated is decided by whoever reads the log, and the failed pass stays failed.

**Self-test** (`node tools/t0/tests/runner_selftest.mjs`, row `static.runner` of `run_suites.mjs`; no browser, no network). It starts the real runners with `NODE_OPTIONS=--require tools/t0/tests/env_probe.cjs`, so every Node process below them writes down its environment
(names and a hash of each value), and compares each child with its runner variable by variable: no proxy (nothing differs but the three variables the runner always set), proxy with both variables unset, both set, one set, the lower-case spelling, an empty value,
a suite of four parallel processes, the Node processes below a Python suite, `runCmd` / `runCmdAsync`, and a real two-check pass of `run_pass.mjs`; then the load fields in the summary, on the console, after `--merge` and after `--import-log`.
The only variable that may differ between a parent and a child besides the added ones is `NODE_OPTIONS`, and the test says exactly how: the parent's value, then the one flag, nothing else; `RUN-01` is the rule as a table (composition of `NODE_OPTIONS`,
the Node versions that read `NODE_USE_ENV_PROXY`, every case where the flag must not be added). `RUN-15` runs a real Node child that raises one other warning: behind the runners its stderr has that warning and no proxy warning, the same child with
`NODE_USE_ENV_PROXY=1` set by hand prints the proxy warning (the negative control that proves the test can see it; the test is skipped, not passed, on a Node that prints none), and a caller that sets the variable itself keeps its choice.
Every scenario is built by the self-test (the proxy variables of the calling shell are removed first, and so are a `--no-warnings` and a `NODE_NO_WARNINGS` of the calling shell), so it passes whether or not the shell has `HTTPS_PROXY`.
`--online` adds one real request: a child started through the harness fetches the pinned Mapbox GL stylesheet with Node's `fetch()` and gets the pinned bytes, and, behind a proxy, the same child started without the harness fails (negative control).
Not proven by it: Windows (never run there), and `run_eight.mjs` end to end (it writes the acceptance log; its passes start through the same `runCmdAsync`).

## The record of the R1g regression (`R1G-SUITES.json`)

`docs/accept/R1G-SUITES.json` lists **every suite id** that `node tools/t0/run_suites.mjs --r1-dist release/R1g/dist --no-red --no-network` defines (taken from the runner's own `--list`, 80 ids on 2026-11-13: the 79 of the earlier runs plus `static.runner`),
and for each one its **last known result** (status, result text, seconds, tiles, load where recorded, the failing tests the runner printed, the last output lines of a failed row) with the **log and line** it was read from, the same suite's earlier results (newest first), and
`never_reached` for a suite that has no row in any log (none today: the full run of 2026-11-11 has a row for all 79 suites of its table, 51 of them OK). A stopped re-run that selected a suite and ended before it is named in `newer_runs_that_stopped_before_it`:
the last result is then older than the latest attempt. It records and does not judge: a red row stays red here, whatever the reason; diagnoses live in `R1G-STATUS.md`, and each run's `conditions` (in `sources`) say what its record shows and whose diagnosis a sentence repeats.

```
node tools/t0/r1g/suites_status.mjs            # write docs/accept/R1G-SUITES.json from the logs
node tools/t0/r1g/suites_status.mjs --check    # exit 1 if the file differs from what the logs give now (a new suite row, a changed log); the "generated" time is ignored
```

Inputs: `tools/t0/r1g/suites_sources.json` and the run logs and summaries in `docs/accept/r1g-suite-logs/`, which are byte-identical copies (`cmp`) of files written under the git-ignored `tmp/`, so everything the generator reads is in git and `--check` works on a fresh checkout
(a checkout has no file times, so every source entry carries the `time_utc` the runs are ordered by). To add a run: copy its console log and its `--json` summary into that folder, add an entry (`time_utc`, `conditions`: only what a record shows, naming the record), regenerate, run `--check`.
A result belongs to the tree and the runner of its own run, not to today's; the durations are of the cloud machine (4 vCPU container, software GL), and the logs written before 2026-11-13 have no load.

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
tools/t0/child_env.mjs           child environment behind a proxy (NODE_USE_ENV_PROXY, NODE_EXTRA_CA_CERTS, the quiet flag in NODE_OPTIONS), load average (shared with tools/t0/run_suites.mjs; part of the harness digest)
tools/t0/tests/runner_selftest.mjs  self-test of both runners (+ env_probe.cjs, its preload)
tools/t0/r1g/suites_status.mjs   writes / checks docs/accept/R1G-SUITES.json     tools/t0/r1g/suites_sources.json   its runs, with conditions
docs/accept/r1g-suite-logs/      archived run logs and summaries it reads (byte-identical copies of files under tmp/)
```
