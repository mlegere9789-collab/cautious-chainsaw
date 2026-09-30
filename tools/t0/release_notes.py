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


# ------------------------------------------------------------------ static prose (chapter 02; ids are the chapter's own)
WHAT = {
    'R0': [
        'Hashed names: the entry, `HelpModal` and `BookmarkPanel` chunks carry the release id (`index-<rid>.js` ...), the stylesheet is `index-<sha8>.css`; the five legacy asset names (entry, both chunks, CSS, orphan `InterpolationWorker-*.js`) are gone from the tree. A chunk can no longer import the wrong entry (blank page, React #321).',
        'New `sw.js`: no precache, no `skipWaiting()`, never handles navigations, cache-first for same-origin `/assets/*` (status 200 and `basic` only), purges only `gbg-*` caches (the Mapbox `mapbox-tiles` cache is untouched). Registration is idle and never reloads a tab. `_ops/sw-kill.js` (= `ops/sw-kill.js`) is the level-2 kill switch: deploy it AS `/sw.js`.',
        'Boot after first paint: a small loader imports the entry after the first contentful paint (3 s fallback) with one automatic reload and then a visible "Try again" button; once-per-session reload on a chunk load error.',
        'Head clean-up: no `modulepreload`, plain stylesheet link, a single `preconnect https://api.mapbox.com`, `color-scheme` meta, `site-nav.js` deferred, splash fade and the body entrance animation removed.',
        'Patch `R0-intro-delete`: the 3.5 s intro is gone (it was the LCP element and primed the `i2` accumulator by accident).',
        '`version.json`, `_ops/asset-manifest.json`, `_ops/used-names.txt` (ledger copy).',
        'Nothing else: no page, data, header or config change (the legacy `netlify.toml` is shipped unchanged). The live `index.html` (with production\'s own inline-script changes of 2026-09-30) and the live `data/terrain.json` are carried over unchanged; the mechanism edits are the only changes to `index.html`.',
    ],
    'R1a': [
        'Group A (25 patches): C5 (the three undefined gold-trail calls are gone and the caption is true; the `onMapReady`/`ref` fix lets Follow Your Ancestor `flyTo` work), desktop pointer capture (overlay canvas `pointer-events:none`, click rebuilt so Distance and unit select still work, Toggle Units off blocks selection), D-SOUND (in-app sound removed: `yO` returns null, `_lastSoundMs` fixed), D-HEATMAP (the dead `H` key, Help row and tour row deleted), monuments loop stopped (45-59 idle React commits/s to 0), merged key guard, Esc clears the pinned unit and closes Layers/Distance, `2`/`3` jump to the day, onboarding storage in try/catch and skipped for deep links, `dt` cap, Skip tour resets to tick 1, Locations wait for `mapRef`, walkthrough map attribution on, and the AMD-T0-1 error boundary around the app root (moved here from the optional group EB).',
        'Page group `PG-core` (118 patches): sprite-id collisions and button reset (C7, C8), dashboard nested notes/chart height/developer note, report and regiment "undefined", historian "undefined" and padding, living ledger start value, Watch Together stored-XSS fix (textContent, validated import, empty stop), AR hidden (menus, sitemap, crawlable list) and `noindex`, Immersive pause stops the drone, `diagnostics.html` and `unit-rendering-reference.html` deleted from the tree.',
        'Page group `PG-maps` (77 patches): non-blocking, SRI-pinned Mapbox GL 3.24.1 on the 8 map pages (deferred, DOMContentLoaded wrapper, preconnect, layout-shift guard), PeerJS loaded only on Host/Join, `og:image`/`twitter:image` on 21 pages point to the new `/og/card-r1.png`.',
        'Overlay: `og/card-r1.png`, valid manifest screenshots (own-art title cards at the old names), maskable icons, `manifest.json` (`id`, no `orientation`), Search Console verification file.',
    ],
    'R1b': [
        'Group C (73 patches: the 72 of the mobile group plus `C:live-hide-legacy-bar-superseded`): the mobile shell. Layout auto-detect `(max-width:834px) and (pointer:coarse), (max-height:480px) and (pointer:coarse)` with a `change` listener, `?layout=` override, `html[data-layout]` set before first paint; desktop-only overlays gated out of the phone layout; Search/Filter/story/event panels and toasts re-homed under the mobile root; map `maxBounds`, no rotation, compact attribution, `setMapRef` + `T4` on load; the Tools sheet (Help, Bookmarks, Layers wired, NPS tile became Virtual Walkthrough, scrolling grid, 44 px targets); transport, safe-area and `dvh`; touch tour copy; 44 px scrubber.',
        'Group AX (61 patches): the accessibility bridge, not conformance. Skip link, one `h1`, `main`/`nav` landmarks, timeline slider as an integer 1..675 slider with `aria-valuetext`, toolbar names and `aria-pressed`, labelled inputs, dialog focus for Help/Bookmarks/onboarding, battle log `role=log` `aria-live=off`, reduced-motion flag, contrast and 12 px floor CSS in the app stylesheet, 44 px targets on coarse pointers, forced-colors, scroll regions focusable. Must follow C (`trains.json` records the dependency).',
    ],
    'R1c': [
        'Group B (13 patches): the July +2 date bug (HUD, monument tooltip, ancestor timeline), `jumpToDay`/`setTick` load every day up to the target, `zp` de-duplicates loads and does not mark an all-failed day loaded, per-tick merge that dedupes by unit (ends the 127-row loss), stateless `i2` (the played-through carry-forward state), minimap reads through `y1` and subscribes to the tick, Follow Your Ancestor loads all three days.',
        'Group DL (7 patches): the single URL-state reader (`tick|t`, `day`, `unit|u`, `z`, `ll` or `lat`+`lng`, `ancestor`, `vignette|v` resolved through `moments.json`), strictly validated; six Turning Points anchors repointed to the own chronology of the site (Ewell 175 to 75, Longstreet 240 to 256, Chamberlain 267 to 275, Night Assault 340 to 326, Cannonade 540 to 518, Pickett 560 to 538; Ewell 75 and Night Assault 326 are provisional for the historian reviewer). `data/moments.json` v0.',
        'Group CP (20 patches): the truthful-copy subset (loading caption, speed label, guide label, back links, terrain labels, Street View honesty, "Copy link", tilde/thousands, minimap title; Help: "hundreds of Union and Confederate regiments and batteries", "Sources"; mobile Tools footer with Privacy/Terms/credit; dead banner text).',
        'Page group `PG-legal` (10 patches): interim privacy and Terms correction (facts only). OWNER-REVIEW-REQUIRED; it ships in R1c by default, delete `tools/t0/patches/PG-legal.json` to hold it back.',
        'Generated config (`tools/t0/config/gen.mjs`): `_headers` (26 documents, 71 header blocks, one rule per header name per URL), `_redirects` (23 rules: `netlify.app` to the primary domain `301!`, dev pages 404 in both spellings, scanner paths), a comment-only `netlify.toml`, `_ops/config-manifest.json`. `/embed` and `/embed.html` are frameable, every other page is `X-Frame-Options: DENY` + `frame-ancestors \'none\'`, Report-Only CSP (no report endpoint), per-page Permissions-Policy.',
    ],
}

CLOSED = {
    'R0': ['C6 (service-worker reload loop / double Document), P5 (boot and first-visit cost)', 'P1 (FCP/LCP/CLS; TBT rises), H3 (the 3.5 s intro), X1/X2 mechanism (drills pass on localhost, not on staging)'],
    'R1a': ['C5 (gold-trail crash), pointer capture / X4 (desktop drag and wheel), sound freeze, Watch Together stored XSS, corrupt OG image (T1 image part), C7, C8, E1 (attribution on the walkthrough map), Historian "undefined" x137, dev pages removed (S4 part)', 'P1/P4 on the 8 map sub-pages (non-blocking Mapbox, PeerJS on demand)'],
    'R1b': ['C1, C2 (mobile shell; chapter 02 says closed only after the device check, which has not happened), A1-A6 and D2 (a11y bridge), E3 (one h1)', 'Partial: H1 (hidden on mobile only), H3 (layout auto-detect), X5 (copy/legal part is R1c)'],
    'R1c': ['C3 (the `+2` date), H11, the Day 2/3 empty-map defect, dead deep links (X7), X4 embed headers, X3 host list, T3', 'Partial: H7/H8/H10 (copy subset), D3 (no auto-fly), X5 (interim privacy via PG-legal)'],
}

VISIBLE = {
    'R0': ['The intro is gone: the app shows the layout chooser/map at once. Tick 1 now draws 70 (Day 1 loaded) to 71 (all days) units instead of the intro-primed ghosts, and a jump to an unplayed tick shows fewer units than today until group B (R1c). Sign-off O-T0-3.'],
    'R1a': ['The map can be dragged and zoomed with a mouse; the sound button is gone; the `H` key does nothing; Left/Right arrows and `+`/`-` pan/zoom the map after the map canvas has focus (the plan\'s merged key guard) while Help still says arrows step the tick; Space does not toggle play while a toolbar button has focus; the desktop touch ring disappears; education day tabs render their own style; the gold trail is not drawn (true caption instead); AR is hidden and `noindex`.'],
    'R1b': ['Phones and coarse-pointer tablets up to 834 px wide (and landscape phones) get the mobile shell; `?layout=mobile|desktop` overrides. The 1863 road/river/breastwork overlay (`T4`) now draws on the mobile map. Desktop: header centre cluster is laid out in flow, a 12 px text floor makes dense panels taller, long roster names truncate with an ellipsis, a white+black focus ring on every `:focus-visible`, Help/Bookmarks/onboarding take and return focus, `S` no longer types an "s".'],
    'R1c': ['The map shows the played-through state at any tick (each unit at its latest keyframe at or before the tick, e.g. U-CAV-1-1 is held at its tick-9 keyframe at tick 12); dates read July 1/2/3, never July 4-9; deep links work; Turning Points links land on the repointed ticks; privacy and Terms text changes (owner review); `netlify.app` redirects to the primary domain once the headers ship.'],
}

LIVE_DRIFT = {
    'R0': ['Kept: the live `data/terrain.json` (8 corrected key locations), the live animationend reveal fix and text-aware collision count of the Extra Features button, and the live inline block that hides the legacy desktop timeline bar in Mobile mode (the legacy bar is mounted in Mobile mode here, so dropping the block would revert a live fix).',
           'Inherited: production removed the monuments star-marker overlay (`#gtbg-monuments-overlay`); the old overlay script is not in this tree.'],
    'R1a': ['Same as R0: every live change is carried. The hide-bar block stays because group C is not in this train (T0-BL-06 shows the Mobile mode behaves like live).'],
    'R1b': ['Group C supersedes the live hide-bar block, so patch `C:live-hide-legacy-bar-superseded` removes it: the mobile shell never mounts the desktop bar, and the credit `mailto:` link the block looks for does not exist in the mobile DOM (T0-BL-05: 0 range inputs, 0 credit links, before and with the Tools sheet open). The other live changes are kept.',
             'The star overlay that production removed is gone here too (before the re-baseline R1b still shipped it).'],
    'R1c': ['As R1b. `terrain.json` is the live file byte for byte (T0 rule 5: no `/data` edits).'],
}

REMAINS_COMMON = [
    'Nothing has been deployed and no real device, iOS/WebKit, Firefox or Samsung Internet has run any of this. Every test ran in headless Chrome 153 on Windows against localhost; touch is CDP emulation.',
    'Real Mapbox tiles were exercised only through the test harness (production Referer injected, at most 300 requests per run); no Lighthouse run exists (no runner in the repo), so the plan\'s Lighthouse gates (mobile >= 85, desktop >= 95, a11y >= 97) are unmeasured.',
    'Netlify\'s own header matching, `_headers`/`_redirects` parsing and host redirect are emulated only; a `gbg-staging` deploy with `node ops/headers-probe.mjs` and `tests/t0/prod-probe.mjs --parity` is the required proof.',
    'Open until the rebuild (chapter 02 section 10): C4 (clock hours), H5, H6, H12, H13, D1, D4, S3, P2, P3, P6, T2, E2, E4, E5, G1, X1/X2 owner verification, 100 phantom placement ids and 15 wrong-side units, Historian retrieval quality. The clock labels are hours off (D-TIME): T0 changes only the `+2` date.',
    'Production is not the downloaded deploy any more (`docs/baseline-drift.md`): this train is built from the locked `baseline/dist`, the source-level reconstruction of production as of 2026-09-30 (live deploy `6abd6d62...`). `python tools/t0/baseline.py verify-live` must print IDENTICAL immediately before deploying; `netlify.toml` and Netlify dashboard settings cannot be compared by bytes (only through headers), and the live deploy zip has not been archived yet (owner action).',
    'Owner actions (WP-T0-17, `ops/owner-console-actions.md`): archive off-machine, Mapbox/Google key restrictions, Search Console DNS TXT, Netlify primary-domain setting, credits, 2FA. Deploy discipline (Tue-Thu, none 2026-11-15..20, one production deploy per train) is the owner\'s.',
]
REMAINS = {
    'R0': ['R0 must not ship without all of the loader, the animation removal and the intro deletion together (chapter 02 section 14 item 9). Blocking time after first paint rises (bundle evaluation no longer hides before FCP); only the rebuild\'s chunking cures it.', 'Returning visitors keep the OLD worker until all their tabs close; the kill file forces adoption.'],
    'R1a': ['Headed real-mouse drag/wheel on the live site (verification debt item 1) is still owed; the CDP-dispatched tests say the fix works, not that the deployed site needed it.', 'Dashboard data discrepancy (I Corps 6,059 vs 6,394; 46,163 / 45,928 / about 51,000) stays for the data tranche; Live Sync privacy wording is the legal group\'s; Immersive hearing-safety limiter is deferred (O-T0-7); `index.html` banner still advertises AR and "20 more tools".'],
    'R1b': ['Residual visual defects on the phone shell (see `owner_review_needed` of the mobile group: story+event cards cover most of a 320x568 map, landscape hides the day tabs, Search -> unit pick does not fly or open the popup, Help still lists keyboard shortcuts, dense toast and story cards, duplicate Roster/OOB tiles, Esc does not close the Tools sheet).', 'Layout threshold is 834 px, not the runbook\'s 820 px; tablets 744-834 px get the stretched phone shell. Device checks (iPhone SE, mid-range Android, Samsung Internet; O-T0-9) and the 17-panel screenshot review at 4 widths are owed before shipping.'],
    'R1c': ['The plan\'s R1c gate "15/15 probes minus the CSP rows" cannot hold in T0: HP-10/11/12 (URL forms, sitemap) need train S1; the probe profile `t0` lists them as expected-red. HP-01..03 (enforced CSP) wait for D-CSP (DG-2).', 'Owner decisions open: XFO DENY + `frame-ancestors \'none\'` (implemented) vs the runbook\'s SAMEORIGIN/`\'self\'`; sign O-T0-3 (carry-forward rule); PG-legal text and its `[OWNER TO CONFIRM]` markers (Netlify Web Analytics, RUM); Turning Points "Ewell 75" and "Night Assault 326" need the historian reviewer; counsel review of the legal drafts.', 'The root `netlify.toml` (WP-T0-02) must hold no header or redirect tables, and the primary-domain option must be set in the Netlify dashboard before or with R1c.'],
}

ROLLBACK = {
    'R0': 'L1: Netlify "Publish deploy" on the previous deploy (atomic; restores the legacy entry, the reload band-aid and the old worker; acceptable). L2 (10 min): deploy `ops/sw-kill.js` as `/sw.js` (removes the worker and every `gbg-*` cache from all visitors). L3: fix forward under a new release id.',
    'R1a': 'L1: Publish the R0 deploy (or legacy). Asset names differ between trains, so the rollback is clean: the previous deploy still serves its own names. L2/L3 as for R0.',
    'R1b': 'L1: Publish the R1a deploy. Clean (new names). If only the phone shell misbehaves, `?layout=desktop` is a per-visit override but not a rollback.',
    'R1c': 'L1: Publish the R1b deploy. Clean for the app. NOTE the headers/redirects of R1c are part of this deploy; rolling back restores the legacy `netlify.toml` rules, which does not free `/embed` and does not redirect `netlify.app`.',
}

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
        w('- ' + b)
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
        w('')
        w('| suite id | result | seconds | tiles | what |')
        w('|---|---|---|---|---|')
        for r in rows:
            what = r['title']
            if r['id'].startswith('mobile.'):
                what += ' (19 results = 13 distinct tests: MOB-02..06 and MOB-12 run once per orientation slice; each slice has its own 300-request cap)'
            w('| `%s` | %s %s | %s | %s | %s |' % (r['id'], 'PASS' if r.get('ok') else 'FAIL', fmt_res(r), r.get('seconds', ''), r.get('tiles') or '', what))
        if any(r.get('skipped') for r in rows):
            w('')
            w('Skipped tests are by design: a test of a group that the train does not contain (B, DL, C on R1a; DL and B on R1b) skips itself, and A11Y-14 (real tiles) runs as the separate `a11y.R1c.tiles` suite. No test failed.')
        ran = {r['id'] for r in rows}
        missing = [r['id'] for r in summary['results'] if not r['id'].startswith('red.') and not r['id'].startswith('static.') and r['id'] not in ran and train not in r['id'].split('.')[1:]]
        w('')
        w('Not run on this train (run on the train named in the suite id): %s.' % (', '.join('`%s`' % m for m in missing) or 'none'))
        if train == 'R1b':
            w('The page groups (`PG-core`, `PG-maps`) are identical in R1a, R1b and R1c by construction and are exercised on R1a and R1c; `pagescore.*`/`pagesmaps.*` did not run on the R1b tree itself.')
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
    w('## Not verified / what remains')
    w('')
    for b in REMAINS[train]:
        w('- ' + b)
    for b in REMAINS_COMMON:
        w('- ' + b)
    w('')
    w('## Deploy and rollback (nothing here was executed)')
    w('')
    w('Deploy (owner, per `ops/RELEASE-RUNBOOK.md`): **run `python tools/t0/baseline.py verify-live` first and deploy only on IDENTICAL (exit 0)**; stage first (`gbg-staging`, noindex), run `node tests/t0/prod-probe.mjs --base <staging> --train %s --staging --dist release/%s/dist`, then `netlify deploy --dir release/%s/dist --prod --message "%s %s"` from inside the dist folder. Tuesday to Thursday only, none in 2026-11-15..20, one production deploy per train. After deploy run `python tools/t0/ledger.py record --dist release/%s/dist --train %s --rid %s` and commit `ops/used-names.txt`.' % (train, train, train, train, ver.get('release'), train, train, ver.get('release')))
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
