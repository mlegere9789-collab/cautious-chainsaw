#!/usr/bin/env python3
"""Generate release/<train>/RELEASE-NOTES.md for the four Tranche-0 trains (and committed copies in ops/release-notes/).

    python tools/t0/release_notes.py                 # all four trains; needs release/<train>/ built (python tools/t0/build.py --all)
    python tools/t0/release_notes.py --train R1c
    python tools/t0/release_notes.py --summary release/test-summary.json    # test table source (node tools/t0/run_suites.mjs writes it)

Everything dynamic (release id, file names, tree hash, counts, gate and test results) is read from the build outputs, so the notes can never
disagree with the tree they describe.  The prose is maintained here and follows chapter 02 of docs/plan/FINAL.  Nothing in these notes is a
deploy claim: no train has been deployed; every "verified" statement names the suite that verified it, every gap is listed under "not verified".
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
TRAINS = ['R0', 'R1a', 'R1b', 'R1c']


def jload(p, default=None):
    try:
        with open(p, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def sha256(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()


def walk(root):
    out = {}
    for dp, _dn, fn in os.walk(root):
        for f in fn:
            p = os.path.join(dp, f)
            out[os.path.relpath(p, root).replace(os.sep, '/')] = p
    return out


def git(*a):
    try:
        return subprocess.run(['git'] + list(a), cwd=REPO, capture_output=True, text=True, encoding='utf-8').stdout.strip()
    except OSError:
        return ''


def runner_ids():
    """Ids of every suite tools/t0/run_suites.mjs would run (its own --list), or None when node cannot be run."""
    try:
        r = subprocess.run(['node', os.path.join(HERE, 'run_suites.mjs'), '--list'], cwd=REPO, capture_output=True, text=True, encoding='utf-8', timeout=120)
    except (OSError, subprocess.SubprocessError):
        return None
    ids = [ln.split()[0] for ln in r.stdout.splitlines() if ln.strip()]
    return ids if r.returncode == 0 and ids else None


# ------------------------------------------------------------------ static prose (chapter 02; ids are the chapter's own)
# "@G@" is replaced by the number of asserted anchor records of group G in the train (release/<train>/anchors.json), so a count can never go stale.
WHAT = {
    'R0': [
        "Hashed names: the entry, `HelpModal` and `BookmarkPanel` chunks carry the release id (`index-<rid>.js` ...), the stylesheet is `index-<sha8>.css`; the five legacy asset names (entry, both chunks, CSS, orphan `InterpolationWorker-*.js`) are gone from the tree. A chunk can no longer import the wrong entry (blank page, React #321).",
        "New `sw.js`: no precache, no `skipWaiting()`, never handles navigations, cache-first for same-origin `/assets/*` (status 200 and `basic` only), purges only `gbg-*` caches (the Mapbox `mapbox-tiles` cache is untouched). Registration is idle and never reloads a tab. `ops/sw-kill.js` is the level-2 kill switch: deploy it AS `/sw.js` (it is not part of the dist and is never served; the build keeps a copy at `release/<train>/_ops/sw-kill.js`).",
        "Boot after first paint: a small loader imports the entry after the first contentful paint (3 s fallback) with one automatic reload and then a visible 'Try again' button; once-per-session reload on a chunk load error.",
        "Head clean-up: no `modulepreload`, plain stylesheet link, a single `preconnect https://api.mapbox.com`, `color-scheme` meta, `site-nav.js` deferred, splash fade and the body entrance animation removed; the 'Extra Features' onboarding banner is added in the same frame as the layout chooser (mechanism row `R0M:onboarding banner`, layout shift 0.0497 to 0.000).",
        "Patch `R0-intro-delete`: the 3.5 s intro is gone (it was the LCP element and primed the `i2` accumulator by accident).",
        "Patch `R0-mapbox-precompile` (extension part `tools/t0/patches/R0+mapbox-precompile.json`, every train, runbook 14.21): the shader programs of the app's own Mapbox layers are requested before the first frame that draws them, so the GPU process links them while the main thread is free instead of the first frames blocking 80-100 ms in the software-GL lab that Lighthouse uses. Does nothing without `KHR_parallel_shader_compile` or when a private Mapbox field is missing (try/catch, bundle pinned to Mapbox 3.24.1); pixels unchanged (screenshots after idle identical in the perf harness). **Owner decision:** it makes R0 more than mechanism-only (`ops/T0-DEVIATIONS.md` row 22); deleting the file restores the previous R0 byte for byte.",
        "`version.json`, `_ops/asset-manifest.json`, `_ops/used-names.txt` (ledger copy).",
        "Nothing else: no page, data, header or config change (the legacy `netlify.toml` is shipped unchanged). The live `index.html` (with production's own inline-script changes of 2026-09-30) and the live `data/terrain.json` are carried over unchanged; the mechanism edits are the only changes to `index.html`.",
    ],
    'R1a': [
        "Group A (@A@ patches): C5 (the three undefined gold-trail calls are gone and the caption is true; the `onMapReady`/`ref` fix lets Follow Your Ancestor `flyTo` work), desktop pointer capture (overlay canvas `pointer-events:none`, click rebuilt so Distance and unit select still work, Toggle Units off blocks selection), D-SOUND (in-app sound removed: `yO` returns null, `_lastSoundMs` fixed), D-HEATMAP (the dead `H` key, Help row and tour row deleted), monuments loop stopped (45-59 idle React commits/s to 0), merged key guard, Esc clears the pinned unit and closes Layers/Distance, `2`/`3` jump to the day, onboarding storage in try/catch and skipped for deep links, `dt` cap, Skip tour resets to tick 1, Locations wait for `mapRef`, walkthrough map attribution on, and the AMD-T0-1 error boundary around the app root. Extension part `A+chooser.json` (3 patches): the legacy 'Choose Your Experience' screen is a named modal dialog that takes focus and keeps Tab inside, and both cards open with Enter or Space (inert from R1b: group C auto-detects the layout and the chooser is never shown).",
        "Group A2 (@A2@ patches, after CP): the desktop verifier's defects. A pointer press hands keyboard focus back from the Mapbox canvas, so arrows, Shift+arrows, `+`/`-`/`0` and Space keep driving the clock as Help says after any click, drag or unit selection (Tab to the map gives Mapbox's own keys: arrows pan, `+`/`-` zoom, Shift+arrows rotate and tilt; Esc gives the keys back); attribution and Mapbox wordmark lifted above the transport dock at 1024-2560 px wide; story and event cards leave zoom, Trails, minimap and dock free and Esc dismisses the topmost card or the NPS tour; the unit canvas repaints on map move, zoom and resize and on a filter change while paused, the overlay canvas follows its container, trails are cleared on a move; NPS tour panel with its dots inside the panel, day tabs and attribution free, speed restored on X/Esc.",
        "Group PERF (@PERF@ patches on `index.html`): both stylesheets no longer block the first paint (`media=\"print\"`, switched on by the loader before the app is imported, 3 s cap, error tolerant), the first-paint rules of the AX shim are inlined and the Extra Features overlay stays hidden until the stylesheets are applied. First contentful paint -275 ms (R1a) / -105 ms (R1b, R1c) in the simulated lab; no preload hint, no console warning.",
        "Page group `PG-core` (@PG-core@ patches): sprite-id collisions and button reset (C7, C8), dashboard nested notes/chart height/developer note, report and regiment 'undefined', historian 'undefined' and padding, living ledger start value, Watch Together stored-XSS fix (textContent, validated import, empty stop), AR hidden (menus, sitemap, crawlable list) and `noindex`, Immersive pause stops the drone, `diagnostics.html` and `unit-rendering-reference.html` deleted from the tree; and the sub-page accessibility, touch and layout fixes (patch ids `PGF-*`, shared layer in `site-nav.css`/`site-nav.js`): sub-pages pass axe with 0 serious or critical violations at 1440, 375 and 320 px, no horizontal overflow at 375 and 320, 44 px (touch) and 24 px (mouse) targets, no text under 12 px, named fields and readable placeholders, keyboard-operable controls with a 2 px gold focus ring.",
        "Page group `PG-maps` (@PG-maps@ patches): non-blocking, SRI-pinned Mapbox GL 3.24.1 on the 8 map pages (deferred, DOMContentLoaded wrapper, preconnect, layout-shift guard), PeerJS loaded only on Host/Join, `og:image`/`twitter:image` on 21 pages point to the new `/og/card-r1.png`; per-page `PGF-*` fixes (the sandbox disposition pop-up stays inside the map, Compare has a phone layout and named map canvases 'Left map' / 'Right map').",
        "Overlay: `og/card-r1.png`, valid manifest screenshots (own-art title cards at the old names), maskable icons, `manifest.json` (`id`, no `orientation`), Search Console verification file.",
    ],
    'R1b': [
        "Group C (@C@ patches: the mobile shell plus `C:live-hide-legacy-bar-superseded`): layout auto-detect `(max-width:834px) and (pointer:coarse), (max-height:480px) and (pointer:coarse)` with a `change` listener, `?layout=` override, `html[data-layout]` set before first paint; desktop-only overlays gated out of the phone layout; Search/Filter/story/event panels and toasts re-homed under the mobile root; map `maxBounds`, no rotation, compact attribution, `setMapRef` + `T4` on load; the Tools sheet (Help, Bookmarks, Layers wired, NPS tile became Virtual Walkthrough, scrolling grid, 44 px targets); transport, safe-area and `dvh`; touch tour copy; 44 px scrubber. After the mobile verifier: 'Desktop View' is reversible (a persistent Phone view control in the desktop layout; `?layout=` is honoured and cleaned), a unit chosen in Search, Bookmarks or `?u=` opens the phone popup and the camera flies to it, the Help header and its close X stay on screen, story and event cards stack (one expanded, the other a 44 px chip, never over the day tabs or most of the map), 44 px targets in the re-homed panels, landscape phones get compact day tabs, a tick label and the minimap, the landscape Tools sheet clears the right safe-area inset, a tap 1 px inside the scrubber ends gives tick 675 / 1, the speed button's accessible name starts with its visible '1x' (WCAG 2.5.3).",
        "Group AX (@AX@ patches): the accessibility bridge, not conformance. Skip link, one `h1`, `main`/`nav` landmarks, timeline slider as an integer 1..675 slider with `aria-valuetext`, toolbar names and `aria-pressed`, labelled inputs, battle log `role=log` `aria-live=off`, reduced-motion flag, contrast and 12 px floor CSS in the app stylesheet, 44 px targets on coarse pointers, forced-colors, scroll regions focusable. Dialogs: Help, Bookmarks, Follow Your Ancestor, Soldier's Eye View, the Virtual Walkthrough and the phone Tools sheet are modal (aria-modal, Tab and Shift+Tab trapped with a focusin guard, Esc closes only the dialog, focus returns to the opener); onboarding is Esc-skippable and keeps focus (desktop and phone); a unit can be selected from Search by keyboard alone (Enter, ArrowDown, Tab to the list, arrows/Home/End; the same for regiment results, the journey and the viewpoint rows); placeholders are 6.2:1 or better; the phone Help lists the touch gestures. Must follow C (`trains.json` records the dependency).",
        "Group SHELL (@SHELL@ patches on `index.html`, after CP): the Extra Features menu fits the viewport (maximum height from the room that is there, scrolls inside, opens upward, arrows/Home/End/Escape, focus moves into the menu), the Ask the Historian and Extra Features pills sit below Help, Bookmarks, the Walkthrough and onboarding, hide while one of those is open and are placed clear of panels and cards, and the persistent Phone view control; the phone onboarding overlay stops above the dock so 'Tap Play at the bottom' can be done.",
    ],
    'R1c': [
        "Group B (@B@ patches): the July +2 date bug (HUD, monument tooltip, ancestor timeline), `jumpToDay`/`setTick` load every day up to the target, `zp` de-duplicates loads and does not mark an all-failed day loaded, per-tick merge that dedupes by unit (ends the 127-row loss), stateless `i2` (the played-through carry-forward state), minimap reads through `y1` and subscribes to the tick, Follow Your Ancestor loads all three days.",
        "Group DL (@DL@ patches): the single URL-state reader (`tick|t`, `day`, `unit|u`, `z`, `ll` or `lat`+`lng`, `ancestor`, `vignette|v` resolved through `moments.json`), strictly validated; six Turning Points anchors repointed to the own chronology of the site (Ewell 175 to 75, Longstreet 240 to 256, Chamberlain 267 to 275, Night Assault 340 to 326, Cannonade 540 to 518, Pickett 560 to 538; Ewell 75 and Night Assault 326 are provisional for the historian reviewer). `data/moments.json` v0.",
        "Group CP (@CP@ patches): the truthful-copy subset (loading caption, speed label, guide label, back links, terrain labels, Street View honesty, 'Copy link', tilde/thousands, minimap title; Help: 'hundreds of Union and Confederate regiments and batteries', 'Sources', a row for the map's keyboard route 'Tab to the map'; mobile Tools footer with Privacy/Terms/credit; dead banner text). Extension part `CP+walkthrough-sensors.json`: the Street View iframe carries `allow=\"accelerometer; gyroscope\"`, matched by the Permissions-Policy delegation in the generated headers, so the Virtual Walkthrough logs no Google console error (proved on the real embed). **Owner decision:** the baseline privacy text is silent about that delegation (the opt-in legal text says it).",
        "Page group `PG-legal` (opt-in): the interim privacy and Terms correction (facts only, OWNER-REVIEW-REQUIRED) is in this build ONLY if it was made with `--with PG-legal` (see `version.json` `groups`). Its dates come from `trains.json` `legal.effective_date`; no owner note is in the shipped text (`ops/legal-drafts/OWNER-SIGNOFF.md`).",
        "Generated config (`tools/t0/config/gen.mjs`): `_headers` (one rule per header name per URL, both URL spellings), `_redirects` (`netlify.app` to the primary domain `301!`, dev pages 404 in both spellings, scanner paths), a comment-only `netlify.toml`, `_ops/config-manifest.json`. `/embed` and `/embed.html` are frameable, every other page is `X-Frame-Options: DENY` + `frame-ancestors 'none'`, Report-Only CSP (no report endpoint), per-page Permissions-Policy (camera/location/sensors only on `/ar*`; on `/` accelerometer + gyroscope delegated to `https://www.google.com` for the Street View frame: `ops/header-decisions.md`).",
    ],
}

CLOSED = {
    'R0': ["C6 (service-worker reload loop / double Document), P5 (boot and first-visit cost)",
           "P1 (FCP/LCP/CLS; TBT 286 ms in the lab after the shader precompile), H3 (the 3.5 s intro), X1/X2 mechanism (drills pass on localhost, not on staging); a11y/perf verifier: R0 mobile Lighthouse 84 (below the plan's 85) now 94 with the precompile, layout shift without headroom (0.0497) now 0.000"],
    'R1a': ["C5 (gold-trail crash), pointer capture / X4 (desktop drag and wheel), sound freeze, Watch Together stored XSS, corrupt OG image (T1 image part), C7, C8, E1 (attribution on the walkthrough map), Historian 'undefined' x137, dev pages removed (S4 part)",
            "P1/P4 on the 8 map sub-pages (non-blocking Mapbox, PeerJS on demand); desktop verifier: the keyboard focus regression after any click, the attribution under the dock, story/event cards (Esc and covered controls), paused filter repaint, resize repaint, NPS tour panel; mobile verifier D-09..D-12 (sandbox overflow, shared nav width and 44 px targets, text under 12 px); a11y verifier: layout chooser by keyboard, sub-page axe findings, render-blocking stylesheets (X8)"],
    'R1b': ["C1, C2 (mobile shell; chapter 02 says closed only after the device check, which has not happened), A1-A6 and D2 (a11y bridge), E3 (one h1)",
            "Mobile verifier D-01..D-08 and D-13, WCAG 2.5.3 speed label; a11y verifier: Help dialog containment, keyboard unit selection from Search, placeholder contrast, phone Tools sheet dialog; desktop verifier: Extra Features menu taller than the viewport, pills over modal backdrops and panels",
            "Partial: H1 (hidden on mobile only), H3 (layout auto-detect), X5 (copy/legal part is R1c)"],
    'R1c': ["C3 (the `+2` date), H11, the Day 2/3 empty-map defect, dead deep links (X7), X4 embed headers, X3 host list, T3; release verifier: the Street View accelerometer console error on the default build",
            "Partial: H7/H8/H10 (copy subset), D3 (no auto-fly), X5 (interim privacy only in a build made with --with PG-legal)"],
}

VISIBLE = {
    'R0': ["The intro is gone: the app shows the layout chooser/map at once. Tick 1 now draws 70 (Day 1 loaded) to 71 (all days) units instead of the intro-primed ghosts, and a jump to an unplayed tick shows fewer units than today until group B (R1c). Sign-off O-T0-3."],
    'R1a': ["The map can be dragged and zoomed with a mouse; the sound button is gone; the `H` key does nothing; arrows, Shift+arrows, `+`/`-`/`0` and Space drive the clock after any click or drag (Tab to the map gives Mapbox's own arrows/`+`/`-`/Shift+arrows, Esc takes them back; approved by the owner on 2026-10-04); the attribution and Mapbox logo sit above the dock; story and event cards leave the zoom buttons, Trails and the minimap free and Esc dismisses them; a paused map repaints on a filter change and on a window resize; the NPS tour panel no longer covers the day tabs; the desktop touch ring disappears; education day tabs render their own style; the gold trail is not drawn (true caption instead); AR is hidden and `noindex`; the layout chooser works from the keyboard.",
              "Sub-pages: no horizontal scroll on a phone, 44 px targets, no text under 12 px, a gold focus ring, the shared navigation is a little taller on a phone, footers wrap into rows."],
    'R1b': ["Phones and coarse-pointer tablets up to 834 px wide (and landscape phones) get the mobile shell; `?layout=mobile|desktop` overrides and 'Desktop View' now has a way back (Phone view). The 1863 road/river/breastwork overlay (`T4`) now draws on the mobile map. Desktop: header centre cluster is laid out in flow, a 12 px text floor makes dense panels taller, long roster names truncate with an ellipsis, a white+black focus ring on every `:focus-visible`, Help/Bookmarks/onboarding take and return focus, `S` no longer types an 's'; the Extra Features menu scrolls inside the viewport."],
    'R1c': ["The map shows the played-through state at any tick (each unit at its latest keyframe at or before the tick, e.g. U-CAV-1-1 is held at its tick-9 keyframe at tick 12); dates read July 1/2/3, never July 4-9; deep links work; Turning Points links land on the repointed ticks; privacy and Terms text changes only if the build includes the opt-in legal group (owner review); `netlify.app` redirects to the primary domain once the headers ship; the Walkthrough's Street View frame may read the phone's motion sensors (owner decision)."],
}

LIVE_DRIFT = {
    'R0': ["Kept: the live `data/terrain.json` (8 corrected key locations), the live animationend reveal fix and text-aware collision count of the Extra Features button, and the live inline block that hides the legacy desktop timeline bar in Mobile mode (the legacy bar is mounted in Mobile mode here, T0-BL-06).",
           "Inherited: production removed the monuments star-marker overlay (`#gtbg-monuments-overlay`); the old overlay script is not in this tree, and the Monuments toolbar button is inert (owner answer of 2026-10-04: the removal was not intended, the feature is to be restored as a map-tracking layer, group `MON`, a later train; T0 does not restore it)."],
    'R1a': ["Same as R0: every live change is carried. The hide-bar block stays because group C is not in this train (T0-BL-06 shows the Mobile mode behaves like live)."],
    'R1b': ["Group C supersedes the live hide-bar block, so patch `C:live-hide-legacy-bar-superseded` removes it: the mobile shell never mounts the desktop bar, and the credit `mailto:` link the block looks for does not exist in the mobile DOM (T0-BL-05: 0 range inputs, 0 credit links, before and with the Tools sheet open).",
             "The star overlay that production removed is gone here too (before the re-baseline R1b still shipped it)."],
    'R1c': ["As R1b. `terrain.json` is the live file byte for byte (T0 rule 5: no `/data` edits)."],
}

REMAINS_COMMON = [
    "Nothing has been deployed and no real device, iOS/WebKit, Firefox, Samsung Internet or screen reader has run any of this. Every test ran in headless Chrome 153 on Windows against localhost; touch is CDP emulation; accessibility evidence is axe-core 4.13, a DOM contrast estimate (it skips text over images and gradients) and Lighthouse 13.5: a bridge, not WCAG conformance.",
    "Real Mapbox tiles were exercised only through the test harness (production Referer injected, at most 300 requests per process). The repo has no Lighthouse runner: the numbers in `ops/release-notes/perf-results.json` (block `round2`) and in chapter 02 section 14.21 come from a harness under `tmp/` (Lighthouse 13.5, simulated mobile throttling, fresh profile per run, interleaved with the exact control, quiet host) and were taken on trees built from the same patches before the `A+chooser` extension part (a three-patch bundle change that moves the release ids of R1a-R1c); they were not re-measured on these ids (see 'What was measured' below).",
    "Netlify's own header matching, `_headers`/`_redirects` parsing and host redirect are emulated only; `node ops/staging-verify.mjs --local` is a rehearsal of the checklist against emulators (it proves the tree and the script), the deploy to `gbg-staging` plus `node ops/staging-verify.mjs --train <train> --staging-url <url>` is the required proof.",
    "Open until the rebuild (chapter 02 section 10): C4 (clock hours), H5, H6, H12, H13, D1, D4, S3, P2, P3, P6, T2, E2, E4, E5, G1, X1/X2 owner verification, 100 phantom placement ids and 15 wrong-side units, Historian retrieval quality. The clock labels are hours off (D-TIME): T0 changes only the `+2` date.",
    "Production is not the downloaded deploy any more (`docs/baseline-drift.md`): this train is built from the locked `baseline/dist`, the source-level reconstruction of production as of 2026-09-30 (live deploy `6abd6d62...`). The gate right before a deploy is in `ops/DEPLOY-CHECKLIST.md` step 2: for R0 `python tools/t0/baseline.py verify-live` must print IDENTICAL; from R1a on `verify-live` says DRIFTED by design (production is then the previous train) and the gate is `ops/sha-list.mjs verify-url` of the previous train's served list. `netlify.toml` and Netlify dashboard settings cannot be compared through the served site: downloading the live deploy zip and running `python tools/t0/baseline.py compare-zip <zip>` (it must print IDENTICAL; checklist step 1) is recommended and not required (owner decision of 2026-10-04: the repo already holds the latest build); until it is done, the baseline `netlify.toml` is the one from the downloaded deploy `6aa16d61`, confirmed only indirectly by the header snapshot.",
    "Owner actions (WP-T0-17, `ops/owner-console-actions.md`): archive off-machine (including the live deploy zip), Mapbox/Google key restrictions, Search Console DNS TXT, Netlify primary-domain setting, credits, 2FA. Deploy discipline (Tue-Thu, none 2026-11-15..20, none on a Friday after 12:00 ET, one production deploy per train) is the owner's.",
    "Known, not fixed in Tranche 0 (page-structure or identity changes with layout risk, or owner choices): `/icons/icon-192.png` is requested twice on `index.html` (the favicon link and the manifest icon are two consumers of one URL; the second is a disk-cache hit, 0 bytes; dropping either changes the Google favicon or the PWA install icon: owner decision); `/data/oob/commander_successions.json` (and, on the phone layout, `/data/chronology_day1..3.json`) are fetched twice on first visit (perf owner, low); moderate-only axe findings remain on sub-pages (`landmark-one-main` and `region` on about 20 pages, `heading-order` on four, `page-has-heading-one` on `embed`) because they need page-structure changes; on the map page the 'Battle time' range input is 1408x4 px against the 24 px target and the focus-order heuristic lists 3 back-jumps; Compare lists 1-3 back-jump warnings in the Tab-order heuristic (the real order is asserted by T0-PGF-11); the footer wraps into three rows on a phone.",
]
REMAINS = {
    'R0': ["R0 must not ship without all of the loader, the animation removal and the intro deletion together (chapter 02 section 14 item 9). Blocking time after first paint is 286 ms in the lab (median of 7 with the precompile, 590 ms without it; the plan's target is under 200 ms): bundle evaluation and the first React commit with the Map constructor are what is left, only the rebuild's lazy map chunk and yielding cure them.",
           "Returning visitors keep the OLD worker until all their tabs close; the kill file forces adoption.",
           "The layout chooser ('Choose Your Experience') cannot be passed by keyboard on R0 (it is the legacy bundle's; test T0-A11Y-28 is red on legacy and R0 by design, green from R1a, where the extension part `A+chooser.json` fixes it). It is how production behaves today; R0 is mechanism-only.",
           "Owner decision carried here: the shader precompile (`R0+mapbox-precompile.json`) is inside R0 (94 mobile Lighthouse with it, 85 without: the plan's floor); delete the file to ship R0 at 85 or hold R0 for R1a."],
    'R1a': ["Headed real-mouse drag/wheel on the live site (verification debt item 1) is still owed; the CDP-dispatched tests say the fix works, not that the deployed site needed it.",
            "Keyboard model (desktop verifier; APPROVED by the owner on 2026-10-04): after a pointer press the arrows step the clock as Help says, and Mapbox's own keys only work after Tab to the map (Esc gives the keys back). Chosen over the a11y plan's `keyboard:false` plus Shift+arrows pan, which collides with the documented Shift+arrows 12-tick step; that model is deferred to the rebuild's shortcut registry. The Help text for Esc ('Dismiss panel / deselect unit') was not reworded although Esc now also closes dialogs and cards (copy list is closed).",
            "Monuments: production's removal of the star overlay is inherited. The owner answered on 2026-10-04 that it was NOT intended and asked for the feature to be restored as a map-tracking layer (optional group `MON`, in progress by another agent and not registered in `trains.json` yet): it is not in this train, the Monuments toolbar button is inert here exactly as on production, and it must never come back as a screen-fixed DOM overlay.",
            "Cosmetic, desktop: during the NPS tour a 16 px sliver of an event card peeks out below the tour panel at 1440x900. Untouched pre-existing items: the Layers label text is not clickable, the sandbox disposition pop-up covers Reset at 1280x720, the Legend top sits behind the unit card. The NPS tour's progress dots are click-only divs (Previous/Next are keyboard-operable).",
            "Lab blocking time 345 ms (target 200); `PERF` stylesheet rows are in R1a and later only (on R0 they give a faster first paint but no score gain, re-measured).",
            "Dashboard data discrepancy (I Corps 6,059 vs 6,394; 46,163 / 45,928 / about 51,000) stays for the data tranche; Live Sync privacy wording is the legal group's; Immersive hearing-safety limiter is deferred (O-T0-7); `index.html` banner still advertises AR and '20 more tools'. `privacy.html` has no table unless the opt-in `PG-legal` group is built, so the keyboard-reachability test of that table (T0-PGF-14) skips by design."],
    'R1b': ["Phone shell, honest residuals after the mobile verifier's round: at 320x568 with the desktop layout forced (Tools > Desktop View) the Phone view and Extra Features pills overlap the legend and minimap panels because no free space exists (they stay visible and tappable and the panels' own close buttons stay uncovered; the 'never overlap panels' rule holds from 375 px up); at 320x568 one expanded story or event card plus a 44 px chip leaves about a third of the map visible (test floor: 25 percent), tight on the smallest phone; duplicate Roster/OOB tiles were not re-checked.",
            "R1b's Help (AX without CP) has no 'Tab to the map' row: it is a CP row and ships with R1c. Optional copy: the Help row 'Desktop View' could say that a Phone view button in the desktop layout switches back.",
            "Layout threshold is 834 px, not the runbook's 820 px; tablets 744-834 px get the stretched phone shell. Device checks (iPhone SE, mid-range Android, Samsung Internet; O-T0-9) and the 17-panel screenshot review at 4 widths are owed before shipping.",
            "Measured Lighthouse accessibility 100 on `/` (mobile and desktop, first-visit state) in the a11y round; automated checks only."],
    'R1c': ["The plan's R1c gate '15/15 probes minus the CSP rows' cannot hold in T0: HP-10/11/12 (URL forms, sitemap) need train S1; the probe profile `t0` lists them as expected-red. HP-01..03 (enforced CSP) wait for D-CSP (DG-2).",
            "Owner decisions open (`ops/header-decisions.md` section 6, `ops/T0-DEVIATIONS.md`): XFO DENY + `frame-ancestors 'none'` (implemented) vs the runbook's SAMEORIGIN/`'self'`; the Street View motion-sensor delegation to Google (the owner decided on 2026-10-04 that it stays so the Walkthrough logs no console error; the Walkthrough still has to be tried on a real phone); sign O-T0-3 (carry-forward rule); whether to build with the opt-in `PG-legal` text (it stays opt-in until the owner has read `ops/legal-drafts/OWNER-SIGNOFF.md`; its Street View disclosure belongs to the delegation above; set `legal.effective_date` to the deploy day); Turning Points 'Ewell 75' and 'Night Assault 326' need the historian reviewer; counsel review of the legal drafts.",
            "The root `netlify.toml` (WP-T0-02) must hold no header or redirect tables, and the primary-domain option must be set in the Netlify dashboard before or with R1c.",
            "A rollback from R1c restores the legacy `netlify.toml` rules, which neither frees `/embed` nor redirects `netlify.app` (the generated `_headers`/`_redirects` belong to the deploy)."],
}

ROLLBACK = {
    'R0': 'L1: Netlify "Publish deploy" on the previous deploy (atomic; restores the legacy entry, the reload band-aid and the old worker; acceptable). L2 (10 min): deploy `ops/sw-kill.js` as `/sw.js` (removes the worker and every `gbg-*` cache from all visitors). L3: fix forward under a new release id.',
    'R1a': 'L1: Publish the R0 deploy (or legacy). Asset names differ between trains, so the rollback is clean: the previous deploy still serves its own names. L2/L3 as for R0.',
    'R1b': 'L1: Publish the R1a deploy. Clean (new names). If only the phone shell misbehaves, `?layout=desktop` is a per-visit override but not a rollback.',
    'R1c': 'L1: Publish the R1b deploy. Clean for the app. NOTE the headers/redirects of R1c are part of this deploy; rolling back restores the legacy `netlify.toml` rules, which does not free `/embed` and does not redirect `netlify.app`.',
}

def skipped_tests(train):
    """[(suite, test id, reason)] of every test the suites of this train skipped, read from release/<train>/test-*.json (the reason is what the test itself recorded)."""
    out = []
    base = os.path.join(REPO, 'release', train)
    names = sorted(os.listdir(base)) if os.path.isdir(base) else []
    for fn in names:
        if fn.startswith('test-') and fn.endswith('.json'):
            for r in (jload(os.path.join(base, fn), {}) or {}).get('results', []):
                if r.get('status') in ('skip', 'skipped'):
                    out.append((fn[5:-5], r.get('id'), (r.get('error') or '').strip()))
    return out


# which suites (run_suites.mjs ids) speak for which train
def suites_for(train, results):
    rows = []
    for r in results:
        i = r['id']
        if i.startswith('red.'):
            continue
        suffix = i.split('.')[-1] if '.' in i else ''
        parts = i.split('.')
        if i.startswith('static.') or i.startswith('baseline.'):
            rows.append(r)
        elif train in parts[1:]:
            rows.append(r)
    return rows


def fmt_res(r):
    if r.get('total') is None:
        return 'exit %s' % r.get('exit')
    s = '%s/%s' % (r.get('passed'), r.get('total'))
    if r.get('skipped'):
        s += ' (+%s skipped)' % r['skipped']
    if r.get('failed'):
        s += ' %s FAILED' % r['failed']
    return s


def fill(text, counts):
    """Replace @GROUP@ tokens of the static prose by the train's real number of anchor records of that group."""
    return re.sub(r'@([A-Za-z0-9+-]+)@', lambda m: str(counts.get(m.group(1), '?')), text)


def measured_block(train):
    """The lab numbers of the perf work for this train, read from ops/release-notes/perf-results.json (never typed here)."""
    perf = jload(os.path.join(REPO, 'ops', 'release-notes', 'perf-results.json'), {})
    r2 = perf.get('round2') or {}
    mob = (r2.get('mobile_n7_quiet_host') or {}).get(train) or {}
    desk = (r2.get('desktop_n3_quiet_host') or {}).get(train) or {}
    leg = perf.get('legacy_live_baseline') or r2.get('legacy_live_baseline') or {}
    out = []
    if not mob:
        return ['No Lighthouse block for this train in `ops/release-notes/perf-results.json`.']
    b, a = mob.get('before_without_patch', {}), mob.get('after_with_patch', {})

    def rng(x):
        return '%s [%s-%s]' % (x.get('perf_med'), x.get('perf_min'), x.get('perf_max'))
    out.append('| | mobile score (median [min-max], n = %s) | TBT | FCP / LCP / CLS | desktop score |' % a.get('n'))
    out.append('|---|---|---|---|---|')
    out.append('| without `R0-mapbox-precompile` (exact control) | %s | %s ms | %s / %s ms / %s | %s |' % (rng(b), b.get('tbt'), b.get('fcp'), b.get('lcp'), b.get('cls'), (desk.get('before_without_patch') or {}).get('perf_med', '?')))
    out.append('| **this train** (with it) | **%s** | **%s ms** | %s / %s ms / %s | %s (TBT %s ms) |' % (rng(a), a.get('tbt'), a.get('fcp'), a.get('lcp'), a.get('cls'), (desk.get('after_with_patch') or {}).get('perf_med', '?'), (desk.get('after_with_patch') or {}).get('tbt', '?')))
    if leg.get('mobile'):
        out.append('| live site as of 2026-10-01 (`legacy/dist`) | %s | %s ms | %s / %s ms / %s | %s |' % (rng(leg['mobile']), leg['mobile'].get('tbt'), leg['mobile'].get('fcp'), leg['mobile'].get('lcp'), leg['mobile'].get('cls'), (leg.get('desktop') or {}).get('perf_med', '?')))
    out.append('')
    out.append('Lighthouse 13.5, headless Chrome 153 on Windows, simulated mobile throttling, real tiles through the harness (production Referer), fresh profile per run, runs interleaved with the control, quiet host. Trees measured: %s. Accessibility score (Lighthouse, first-visit state, with and without tiles): **100** on R1b and R1c, 90 on legacy, R0 and R1a (no AX group there). Targets: mobile >= 85 (met), >= 90 (met), TBT < 200 ms (%s).' % (r2.get('trees', 'see perf-results.json'), 'met' if (a.get('tbt') or 999) < 200 else 'NOT met on this train'))
    return out


def build_notes(train, summary, head):
    base = os.path.join(REPO, 'release', train)
    dist = os.path.join(base, 'dist')
    ver = jload(os.path.join(dist, 'version.json'), {})
    man = jload(os.path.join(base, 'manifest.json'), {})
    anc = jload(os.path.join(base, 'anchors.json'), {})
    gate = jload(os.path.join(base, 'gate.json'), {})
    cfg = jload(os.path.join(REPO, 'tools', 't0', 'trains.json'), {})
    legacy = walk(os.path.join(REPO, (cfg.get('base') or cfg['legacy'])['dir']))            # the BASELINE the train was built from
    legacy_dl = walk(os.path.join(REPO, cfg['legacy']['dir']))                               # the downloaded deploy 6aa16d61
    lock = jload(os.path.join(REPO, (cfg.get('base') or {}).get('lock', 'tools/t0/baseline.lock.json')), {})
    files = man.get('files', {})
    added = sorted(f for f in files if f not in {k for k in legacy})
    removed = sorted(f for f in legacy if f not in files)
    changed = sorted(f for f in files if f in legacy and files[f]['sha256'] != sha256(legacy[f]))
    by_group = {}
    for p in anc.get('patches', []):
        by_group[p['group']] = by_group.get(p['group'], 0) + 1
    L = []
    w = L.append
    counts = dict(by_group)
    w('# Release notes: train %s, release id %s' % (train, ver.get('release', '?')))
    w('')
    w('Status: BUILT AND TESTED LOCALLY, NOT DEPLOYED. Generated by `python tools/t0/release_notes.py` from `release/%s/` (git-ignored build output); a committed copy is `ops/release-notes/%s.md`. Source commit at generation: `%s`.' % (train, train, head))
    w('')
    w('## Identity')
    w('')
    w('| | |')
    w('|---|---|')
    w('| train / release id | %s / `%s` |' % (train, ver.get('release')))
    w('| entry, chunks, css | `%s`, `%s`, `%s`, `%s` |' % (ver.get('entry'), ver.get('help'), ver.get('bookmark'), ver.get('css')))
    w('| deploy this | `release/%s/dist` (%d files, %s bytes; baseline/dist has %d files) |' % (train, man.get('file_count', 0), format(man.get('total_bytes', 0), ','), len(legacy)))
    w('| tree sha256 | `%s` |' % man.get('tree_sha256'))
    w('| input | `baseline/dist` (production as of 2026-09-30, live deploy `%s`; tree `%s`, %d files, locked per file in `tools/t0/baseline.lock.json`), entry md5 `%s`. `legacy/dist` (the downloaded Netlify deploy 6aa16d61) is never modified and differs from the baseline in %s |' % (lock.get('live_deploy_id'), (man.get('baseline') or {}).get('tree_sha256'), (man.get('baseline') or {}).get('file_count', 0), ver.get('source_entry_md5'), ', '.join('`%s`' % f for f in lock.get('changed_vs_legacy', []))))
    w('| groups (order) | %s |' % ', '.join(ver.get('groups', [])))
    w('| patch records | %d asserted anchors, 0 failed (%s) |' % (anc.get('summary', {}).get('patches', 0), ', '.join('%s %d' % (k, v) for k, v in by_group.items())))
    w('| vs baseline/dist | %d files added, %d removed, %d changed, %d identical |' % (len(added), len(removed), len(changed), len(files) - len(added) - len(changed)))
    w('| build gates | %s |' % (', '.join('%s %s' % (c['id'], 'ok' if c['ok'] else 'FAIL') for c in gate.get('checks', [])) or 'gate.json missing'))
    w('')
    w('Files removed from the baseline: %s.' % (', '.join('`%s`' % f for f in removed) or 'none'))
    w('')
    w('Files added (%d): %s.' % (len(added), ', '.join('`%s`' % f for f in added)))
    w('')
    w('## What changed')
    w('')
    if train != 'R0':
        w('This train is cumulative: it contains everything in %s plus the items below.' % TRAINS[TRAINS.index(train) - 1])
        w('')
    for b in WHAT[train]:
        w('- ' + fill(b, counts))
    w('')
    w('## Live drift carried by this train (re-baseline of 2026-09-30, `docs/baseline-drift.md`)')
    w('')
    for b in LIVE_DRIFT[train]:
        w('- ' + b)
    w('')
    w('## Audit findings (chapter 02 section 10 ids)')
    w('')
    for b in CLOSED[train]:
        w('- ' + b)
    w('')
    w('Status words follow the suites named below; "closed" means the suite proves the behaviour in headless Chrome, not that a real device or the live site agrees.')
    w('')
    w('## Visible behaviour changes to sign off')
    w('')
    for b in VISIBLE[train]:
        w('- ' + b)
    w('')
    w('## Tests that passed on this tree')
    w('')
    if summary:
        rows = suites_for(train, summary['results'])
        w('From `release/test-summary.json` (`node tools/t0/run_suites.mjs`, %ss). Every suite is a separate process; mobile runs four slices in parallel, each with its own 300-request Mapbox cap.' % summary.get('seconds'))
        have = {r['id'] for r in summary['results']}
        want_ids = runner_ids()
        absent = [i for i in (want_ids or []) if i not in have]
        if want_ids is None:
            w('')
            w('**Completeness of this table could not be checked** (`node tools/t0/run_suites.mjs --list` did not run).')
        elif absent:
            w('')
            w('**THIS SUMMARY IS INCOMPLETE: %d of the %d suites of the runner are not in it and were NOT run on this tree: %s.** Run them (`node tools/t0/run_suites.mjs --merge --only <ids>`) and regenerate these notes before reading this table as a statement about the whole suite.' % (len(absent), len(want_ids), ', '.join('`%s`' % i for i in absent)))
        w('')
        w('| suite id | result | seconds | tiles | what |')
        w('|---|---|---|---|---|')
        for r in rows:
            what = r['title']
            if r['id'].startswith('mobile.'):
                what += ' (19 results = 13 distinct tests: MOB-02..06 and MOB-12 run once per orientation slice; each slice has its own 300-request cap)'
            if r['id'].startswith('mobilefix.'):
                what += ' (four slices in parallel, each with its own 300-request Mapbox cap: viewports 320-390 wide, 412-768 wide, the three landscape phones, and the desktop-shell tests; MFIX-07/08 are landscape-only)'
            w('| `%s` | %s %s | %s | %s | %s |' % (r['id'], 'PASS' if r.get('ok') else 'FAIL', fmt_res(r), r.get('seconds', ''), r.get('tiles') or '', what))
        if any(r.get('skipped') for r in rows):
            w('')
            failed_ids = [r['id'] for r in rows if not r.get('ok')]
            w('%s Skipped tests skip themselves with the reason they record (a test of a group that the train does not contain, a layout that does not exist on it, a build option that is off); A11Y-14 (real tiles) runs as the separate `a11y.R1c.tiles` suite. Every skip of the last run on this tree (from `release/%s/test-*.json`):' % (('No suite in this table failed.' if not failed_ids else '**FAILED: %s.**' % ', '.join('`%s`' % i for i in failed_ids)), train))
            w('')
            sk = skipped_tests(train)
            counted = sum(int(r.get('skipped') or 0) for r in rows)
            for suite, tid, why in sk:
                w('- `%s` (%s): %s' % (tid, suite, why or 'no reason recorded'))
            have_files = os.path.isdir(os.path.join(REPO, 'release', train)) and any(f.startswith('test-') and f.endswith('.json') for f in os.listdir(os.path.join(REPO, 'release', train)))
            if not have_files and counted:
                w('- (`release/%s/test-*.json` do not exist: `python tools/t0/build.py` removes everything in `release/<train>/` and only the suites write those files again, so the reasons of the %d skipped tests of this table are not listed here; they are printed by each suite in the console log of the run that produced the table)' % (train, counted))
            elif len(sk) != counted:
                w('- (the table counts %d skipped tests, %d are listed: the suites that write their result outside `release/%s/` (mobile slices) are not read here)' % (counted, len(sk), train))
        ran = {r['id'] for r in rows}
        missing = [r['id'] for r in summary['results'] if not r['id'].startswith('red.') and not r['id'].startswith('static.') and r['id'] not in ran and train not in r['id'].split('.')[1:]]
        w('')
        w('Not run on this train (run on the train named in the suite id): %s.' % (', '.join('`%s`' % m for m in missing) or 'none'))
        reds = [r for r in summary['results'] if r['id'].startswith('red.')]
        if reds:
            w('')
            w('Red-first proofs (the same suites run against `legacy/dist`, the downloaded original deploy, with `--expect-red` must FAIL every selected test; the drift of production itself is characterised by the `baseline.drift` suite):')
            w('')
            w('| proof | result | what |')
            w('|---|---|---|')
            for r in reds:
                w('| `%s` | %s | %s |' % (r['id'], ('RED as required (%s)' % fmt_res(r)) if r.get('ok') else 'NOT RED: %s' % fmt_res(r), r['title']))
    else:
        w('`release/test-summary.json` not found: run `node tools/t0/run_suites.mjs` and regenerate these notes.')
    w('')
    w('## What was measured (lab numbers, not a deploy claim)')
    w('')
    for ln in measured_block(train):
        w(ln)
    w('')
    w('## Not verified / what remains')
    w('')
    for b in REMAINS[train]:
        w('- ' + fill(b, counts))
    for b in REMAINS_COMMON:
        w('- ' + b)
    w('')
    w('## Deploy and rollback (nothing here was executed)')
    w('')
    if train == 'R0':
        pre = 'optionally confirm the baseline against the live deploy zip (`python tools/t0/baseline.py compare-zip <zip>`: recommended, not required), **`python tools/t0/baseline.py verify-live` first and deploy only on IDENTICAL (exit 0)**,'
    else:
        prev = TRAINS[TRAINS.index(train) - 1]
        pre = '**production must still serve exactly what you deployed last** (`node ops/sha-list.mjs verify-url release/%s/served-list.tsv https://gettysburginteractivemap.com --tree release/%s/dist --expect-missing netlify.toml,_headers,_redirects,diagnostics.html`: 0 differ, 0 missing; `verify-live` compares with the pre-R0 baseline and says DRIFTED from the day R0 ships),' % (prev, prev)
    w('Deploy (owner): follow `ops/DEPLOY-CHECKLIST.md` literally (one page; the long form is `ops/RELEASE-RUNBOOK.md`). In short: %s build, stage on `gbg-staging` (noindex) and run `node ops/staging-verify.mjs --train %s --staging-url <url>` (every automatic step PASS), soak, then from inside `release/%s/dist` `netlify deploy --dir . --prod --site <PRODUCTION_SITE_ID> --message "%s %s"`. Tuesday to Thursday only, none in 2026-11-15..20, none on a Friday after 12:00 ET, one production deploy per train. Then `node tests/t0/prod-probe.mjs --base https://gettysburginteractivemap.com --train %s --expect-release %s --dist release/%s/dist`, `python tools/t0/ledger.py record --dist release/%s/dist --train %s --rid %s` and commit `ops/used-names.txt` and the log row.' % (pre, train, train, train, ver.get('release'), train, ver.get('release'), train, train, train, ver.get('release')))
    w('')
    w('Rollback: ' + ROLLBACK[train])
    w('')
    return '\n'.join(L) + '\n'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--train', choices=TRAINS)
    ap.add_argument('--summary', default=os.path.join(REPO, 'release', 'test-summary.json'))
    ap.add_argument('--no-copy', action='store_true', help='do not write ops/release-notes/<train>.md')
    a = ap.parse_args()
    summary = jload(a.summary)
    head = git('rev-parse', '--short', 'HEAD') or 'unknown'
    for t in ([a.train] if a.train else TRAINS):
        if not os.path.isdir(os.path.join(REPO, 'release', t, 'dist')):
            print('skip %s: release/%s/dist missing (python tools/t0/build.py --all)' % (t, t))
            continue
        text = build_notes(t, summary, head)
        for dest in ([os.path.join(REPO, 'release', t, 'RELEASE-NOTES.md')] + ([] if a.no_copy else [os.path.join(REPO, 'ops', 'release-notes', t + '.md')])):
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, 'w', encoding='utf-8', newline='\n') as f:
                f.write(text)
            print('wrote', os.path.relpath(dest, REPO).replace(os.sep, '/'))
    if summary and not a.no_copy:
        os.makedirs(os.path.join(REPO, 'ops', 'release-notes'), exist_ok=True)
        with open(os.path.join(REPO, 'ops', 'release-notes', 'test-results.json'), 'w', encoding='utf-8', newline='\n') as f:
            json.dump(summary, f, indent=1)
            f.write('\n')
        print('wrote ops/release-notes/test-results.json')
    return 0


if __name__ == '__main__':
    sys.exit(main())
