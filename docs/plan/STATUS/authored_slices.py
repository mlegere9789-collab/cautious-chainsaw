"""Slices: an item whose plan text covers more than one deliverable is cut into entries that can each be built and checked alone.

The parent becomes an umbrella (it closes when every slice is done), so no part of the plan item is dropped: the slice that is not built yet is
a backlog entry of its own with its own dependencies. A slice id is the parent id plus a hyphenated word."""

SLICES = {
    'wp-hist-22': {
        'note': 'Unit and place page-data export: the unit leg needs only the registry and the corpus; the place leg needs the place linkers (WP-HIST-14) and the places file of WP-DATA-14a.',
        'slices': [
            dict(id='wp-hist-22-units', title='Unit page-data export: one units/<slug>.json per unit with cited excerpts (slice of WP-HIST-22)', wave=1, area='historian', route='source-rebuild', size='M',
                 value='Unit pages, Ask the Historian and the SEO pages all need one export of what the corpus says per unit, with citations and rights fields.',
                 files=['historian-src/export/units.mjs', 'historian-src/export/schema.units.json', 'tests/historian/export-units.test.mjs', 'candidates/r1h/wp-hist-22-units/STATUS.json', 'candidates/r1h/wp-hist-22-units/HANDOFF.md'],
                 reads=['data-src/build/unit_index.json', 'data-src/build/unit_registry.json', 'historian-src/corpus/or27/manifest.json', 'historian-src/corpus/or27/reports.json', 'historian-src/core', 'docs/plan/FINAL/14-ask-the-historian-expansion.md (WP-HIST-22)'],
                 depends_on=[],
                 acceptance=(
                     'Red first: tests/historian/export-units.test.mjs fails before the exporter exists. `node historian-src/export/units.mjs --out tmp/r1h-cand/wp-hist-22-units/export` writes one `units/<slug>.json` per unit of data-src/build/unit_index.json that has at least one Official Records passage (and none for the alias stub U-14BK), each with at most three excerpts of at most 120 words, every excerpt carrying its citation (volume, part, report id, printed page), the scan address, the licence id (from docs/historian/sources.yaml) and `reviewer: null`; '
                     'the build is deterministic (two runs byte-identical, content-hashed file names listed in an index). The test asserts: schema validity of every file, the word limits, every excerpt is a verbatim substring of the corpus text of the report named in its citation (no rewriting), no excerpt from a source that is not Tier A or B in the registry, the alias stub has no file, and a unit with no passage has no file and is listed in the index with `reason: "no passage"`. '
                     'Runs under node 22 and 24 (after ver-hist-node) or states which; the export ships nowhere (HANDOFF.md). This is the units slice of WP-HIST-22; the places slice is the entry wp-hist-22-places and the item is not closed until both are done.'),
                 short='historian-src/export/units.mjs: one units/<slug>.json per unit with <=3 excerpts of <=120 words, each verbatim from a cited corpus report with citation, scan address, licence id, reviewer null; no file for the alias stub; deterministic; schema, verbatim and tier checks. Units slice only.',
                 owed='Unit pages themselves wait for the SEO thin-content gate (WP-SEO-15). The place leg is wp-hist-22-places.'),
            dict(id='wp-hist-22-places', title='Place page-data export: one places/<slug>.json per place with cited excerpts (slice of WP-HIST-22)', wave=None, area='historian', route='source-rebuild', size='M',
                 value='The place half of the same export; it cannot start before the place linkers and the places file exist.',
                 files=['historian-src/export/places.mjs', 'historian-src/export/schema.places.json', 'tests/historian/export-places.test.mjs', 'candidates/r1h/wp-hist-22-places/STATUS.json', 'candidates/r1h/wp-hist-22-places/HANDOFF.md'],
                 reads=['data-src/geo/places.json (wp-data-14a)', 'historian-src/core/linker.js', 'historian-src/export/units.mjs (wp-hist-22-units)'],
                 depends_on=['wp-hist-22-units', 'wp-hist-14', 'wp-data-14a'],
                 acceptance=(
                     'Red first: tests/historian/export-places.test.mjs fails before the exporter exists. The same export as the units slice for places: one `places/<slug>.json` per place of data-src/geo/places.json that has at least one corpus passage linked by the place linkers of WP-HIST-14, at most three excerpts of at most 120 words each with citation, scan address, licence id and `reviewer: null`, deterministic and content-hashed, '
                     'no excerpt that is not a verbatim substring of the cited report, no place whose coordinate conflict is unresolved presented with a chosen coordinate (the file carries each source value and `chosen: null`, as in places.json). The test reuses the units slice\'s checks (shared helper, not copied) and adds the place-linker precision figure that WP-HIST-14 measured; if that measurement is not on record the file says "unmeasured" and the item states it. Not closed before wp-hist-22-units.'),
                 short='Same export for places: places/<slug>.json from data-src/geo/places.json with passages linked by the WP-HIST-14 place linkers, verbatim excerpts with citation and licence, coordinates carried with chosen:null; waits for wp-hist-22-units, wp-hist-14 and wp-data-14a.',
                 owed='Place-linker recall (plan wants 0.85) needs a second labeller: owner side.'),
        ],
    },
}


# WP-ARCH-10 is cut in two on 2026-11-14 so that the unbuilt half of WP-ARCH-09 has an entry of its own (Law clause 1: nothing of a plan item is
# dropped when the foundation half of WP-ARCH-09 closes). The survey (items-A.json, WP-ARCH-09) says "the unbuilt half of the Fix (lint stack,
# browserslist from D-BROWSERS, toolchain smoke) together with WP-ARCH-10 once npm installs are done under the machine lock".
SLICES['wp-arch-10'] = {
    'note': ('Build, chunks, budgets, hash scheme (M-L in the plan) is cut into the toolchain slice, which carries the half of WP-ARCH-09 that is not built '
             '(pinned installs, lint, style and dead-code tools with seeded-violation fixtures, the one-day toolchain smoke), and the build slice, which is WP-ARCH-10 proper '
             'and is sliced again before it is dispatched (size L). Browserslist, es-check and the WebGL2 gate stub of WP-ARCH-09 are entry wp-dec-12.'),
    'slices': [
        dict(id='wp-arch-10-toolchain', title='Toolchain half of WP-ARCH-09, carried with WP-ARCH-10: pinned installs, lint, style and dead-code tools with seeded-violation fixtures, the one-day toolchain smoke (slice of WP-ARCH-10)',
             wave=2, area='rebuild', route='source-rebuild', size='M',
             value='Without pinned tools and the smoke, none of the rebuild entries after the foundation can run a lint or a build; this is the half of WP-ARCH-09 that the foundation record leaves open.',
             files=['src/package.json', 'src/app/package.json', 'src/eslint.config.mjs', 'src/stylelint.config.mjs', 'src/knip.json', 'src/toolchain/', 'src/STACK.md (rows N1, N2, N5 and section 5, small Edit)',
                    'docs/battle-theatre/GOVERNANCE/horde/requests/main-site-wp-arch-10-toolchain.md', 'candidates/r1h/wp-arch-10-toolchain/STATUS.json', 'candidates/r1h/wp-arch-10-toolchain/HANDOFF.md',
                    'candidates/r1h/wp-arch-10-toolchain/evidence/'],
             reads=['src/STACK.md (rows N1 to N12, section 5)', 'src/package.json', 'src/tsconfig.base.json', 'src/config/mapbox.js', 'docs/plan/FINAL/03-source-rebuild-and-parity.md (WP-ARCH-09, WP-ARCH-10, section 8 item 1)',
                    'docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md rows A10, C03, W09-1 to W09-5', 'docs/battle-theatre/GOVERNANCE/horde/requests/main-site-wp-arch-09.md', 'candidates/r1h/wp-dec-12 (browserslist, es-check)'],
             depends_on=['wp-arch-09'],
             acceptance=(
                 'Carries the unbuilt half of the plan\'s WP-ARCH-09 Fix that the survey assigned to the first dependency install (the foundation half is entry wp-arch-09, done; browserslist, es-check and the WebGL2 gate stub are entry wp-dec-12, which runs in the same batch: this entry does not wait for its files and reads the D-BROWSERS floor from the register text itself, and a test compares the two floors once the files of wp-dec-12 exist and skips loudly until then). '
                 'Red first: src/toolchain/toolchain.test.mjs (node:test; runs on Node 22.23.4 and on 24; legs that need installed tools skip loudly when none are installed) fails before any of the following exists. Done when '
                 '(1) src/app/package.json (private, "@gtbg/app", type module) pins react and react-dom 18.3.1, zustand 5.x and mapbox-gl 3.24.1, and src/package.json pins as devDependencies typescript 5.9.x (row N1), vite 8.x (row N2), eslint with typescript-eslint, eslint-plugin-react-hooks and eslint-plugin-jsx-a11y, stylelint, knip, size-limit with its file plugin and es-check: every version exact (no caret, tilde, range or tag), each read from the registry on the day it is installed (one request per second, dated in src/STACK.md section 5), and rows N1, N2 and N5 of src/STACK.md name the pinned versions by small Edit with their way back; Astro is not installed here (its spike is WP-DEC-04). '
                 '(2) src/eslint.config.mjs (flat config) holds typescript-eslint strict-type-checked, react-hooks, jsx-a11y strict, `no-restricted-imports` for mapbox-gl outside src/app/map/lib/map/**, and the five bans of the plan (`attributionControl:false`, `innerHTML` with data, `Math.random` in the engine, day arithmetic, a zero-selector `useStore()`); src/toolchain/fixtures/ holds one violating file and one clean twin per rule: linting the violating files exits non-zero and names the rule, linting the twins exits 0. '
                 '(3) src/stylelint.config.mjs rejects a raw hex colour, a numeric z-index and a font-size under 12 px, with the same fixture pairs; src/knip.json reports 0 findings over this entry\'s own files; size-limit runs once on the smoke output and its figure is recorded (the budgets are entry wp-arch-10-build). '
                 '(4) The one-day toolchain smoke of the plan: a hello-world app under src/toolchain/smoke built with the pinned Vite gives named chunk groups, hashed file names and first-party source maps; es-check passes on the output at the floor of D-BROWSERS; src/config/mapbox.js is bundled with envPrefix "PUBLIC_" and a production build fails closed without the token; every Vite, TypeScript and typescript-eslint option name that chapter 03 section 8 item 1 lists as unverified is recorded as verified or wrong in evidence/toolchain-options.txt. '
                 '(5) The installs are proved in a scratch tree under tmp/r1h-cand/wp-arch-10-toolchain (a copy of the root package.json with the workspace lines of the wp-arch-09 request note, next to the real src/) through tools/horde/bench.sh: `npm ci` and the lint, style, knip and test commands pass there; the lock delta and what the root still needs (the tools as root devDependencies or one more workspace, the lock refresh) are the request note main-site-wp-arch-10-toolchain.md; the root package.json and package-lock.json are not edited. '
                 'The gates are configured for the whole of src/, but this entry\'s pass criteria cover only src/config, src/toolchain and src/foundation.test.mjs: findings in any other file (src/lib/time, and the files that other entries of the same batch add meanwhile, for example src/spec/golden and src/lib/time/intensity.js) are listed in HANDOFF.md, neither fixed nor hidden here. No existing test, gate or baseline is loosened and no rule is relaxed to silence a finding; pnpm stays a selectable alternative (rows C03, W09-2).'),
             short='Toolchain half of WP-ARCH-09: exact pins (React 18.3.1, zustand 5, mapbox-gl 3.24.1, TS 5.9.x, Vite 8, ESLint stack, stylelint, knip, size-limit, es-check); lint and style rules each proved red/green by fixtures; one-day Vite smoke; proved in a scratch install, root edits by request note.',
             owed='A clean-install CI run needs the owner-enabled CI (register D-CI-HOST); the Astro spike is WP-DEC-04; the root package.json and lock are the release workstream\'s.'),
        dict(id='wp-arch-10-build', title='Build, chunk groups, budgets and hash scheme: WP-ARCH-10 proper (slice of WP-ARCH-10)',
             wave=None, area='rebuild', route='source-rebuild', size='L',
             value='The rebuilt app cannot ship without a deterministic build, hashed names and byte budgets; it is the second half of WP-ARCH-10.',
             files=['src/build/', 'src/app/', 'src/budgets/', 'candidates/r1h/wp-arch-10-build/STATUS.json', 'candidates/r1h/wp-arch-10-build/HANDOFF.md'],
             reads=['docs/plan/FINAL/03-source-rebuild-and-parity.md (WP-ARCH-10, section 4.6 chunk map and byte budgets)', 'src/STACK.md', 'src/toolchain (entry wp-arch-10-toolchain)', 'tools/t0/build.py (the interim rename rule)'],
             depends_on=['wp-arch-10-toolchain'],
             acceptance=(
                 'Size L: slice into entries of at most M before dispatch (split_hint), each with its own red-first test. The plan\'s WP-ARCH-10 Fix and Accept, whole: one build command runs the data build, the map build, the Astro build, `mount-legacy`, `gen-netlify-config` and the gates and writes `deploy-manifest.json` (path to sha256 and size) and `version.json` (app, data, timeModel, sha; `builtAt` from the commit date so builds stay deterministic); '
                 'chunk groups of plan section 4.6 with a `shared` chunk so lazy chunks never import the entry; `modulePreload.polyfill:false`; first-party source maps published `noindex`; `THIRD-PARTY-NOTICES.txt`; `assert-hashed-assets.mjs` compares names with the last production manifest (manifest compare plus double build, because Vite\'s `[hash]` is not the sha256 of the file); `verify-deploy.mjs` (every referenced asset exists with exact case, no orphans); `/assets/*` and `/data/v2/*` immutable only once these gates exist. '
                 'Accept: one patched byte without a rename fails CI; double build identical; no lazy chunk imports the entry; `size-limit` fails on a 5 percent rise of a chunk budget of section 4.6 (brotli, per chunk), and a budget raise needs a `budget-raise` label and an ADR. Nothing in release/R1g/dist changes.'),
             short='Size L, slice before dispatch: deterministic one-command build with deploy-manifest.json and version.json, chunk groups with a shared chunk, hashed-name and deploy gates, THIRD-PARTY-NOTICES, size-limit budgets that fail on +5 percent; double build identical.',
             owed='Real-device timing and the clean CI run are owed (owner-enabled CI); budgets are measured as bytes only.',
             needs_split=True,
             split_hint=['(a) build driver: deterministic build command, deploy-manifest.json, version.json (builtAt from the commit date), mount-legacy and gen-netlify-config hooks; double build identical',
                         '(b) gates: assert-hashed-assets.mjs against the last production manifest, verify-deploy.mjs (referenced assets exist with exact case, no orphans), one patched byte without a rename fails',
                         '(c) chunk groups and budgets: section 4.6 chunk map with a shared chunk, modulePreload.polyfill false, source maps noindex, THIRD-PARTY-NOTICES.txt, size-limit per chunk failing at +5 percent']),
    ],
}


# Remainders of two wave-1 entries (keep_parent: the parent stays a build entry with its own record; the slice carries the rest of the plan item, so closing the
# parent drops nothing). Both were named in the survey's next step of the item and are outside the parent's write set.
SLICES['wp-data-14a'] = {
    'keep_parent': True,
    'note': 'WP-DATA-14a: the entry wp-data-14a builds the data files (extent, places, separation proposal); the minimap constant of the bundle is a bundle patch, the slice wp-data-14a-minimap.',
    'slices': [
        dict(id='wp-data-14a-minimap', title='Minimap bounds constant of the bundle follows the map extent (bundle patch, slice of WP-DATA-14a)',
             wave=None, area='bundle', route='candidate-group', size='S',
             value='The minimap draws the battlefield inside a fixed box whose east edge stops short of the approach corridors and East Cavalry Field extent that the extent file will list.',
             files=['candidates/r1h/wp-data-14a-minimap/group.json', 'candidates/r1h/wp-data-14a-minimap/overlay/', 'candidates/r1h/wp-data-14a-minimap/test.mjs',
                    'candidates/r1h/wp-data-14a-minimap/STATUS.json', 'candidates/r1h/wp-data-14a-minimap/HANDOFF.md'],
             touches=['assets/index-<release id>.js (target js, one anchor)'],
             reads=['release/R1g/dist/assets/index-52cec836.js (the constant {latMin:39.77,latMax:39.855,lngMin:-77.28,lngMax:-77.185} read by b_ and the minimap component)', 'data-src/geo/map_extent.json (entry wp-data-14a)',
                    'docs/plan/FINAL/13-data-quality-and-accuracy.md (WP-DATA-14)', 'docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md row B15'],
             depends_on=['wp-data-14a'],
             acceptance=(
                 'Group R1H-wp-data-14a-minimap (target js, one anchor asserted once: the constant `Wa={latMin:39.77,latMax:39.855,lngMin:-77.28,lngMax:-77.185}` of the R1g bundle) widens the east edge of the minimap box to the east edge that data-src/geo/map_extent.json states (about -77.15 in the plan; the value is read from that file when the entry wp-data-14a has written it, and the test fails if the patched constant differs from the file), '
                 'without changing the other three edges or any other byte of the bundle (the bundle differs from the base by exactly the one replaced string). Test.mjs reads the patched bundle text, extracts the constant and checks that every unit position of release/R1g/dist/data that the extent file lists as inside the map extent projects inside the minimap (x in 0..160, y in 0..120 by the bundle\'s own projection b_), red on R1g (positions east of -77.185 fall outside) and green with the group. '
                 'The Virtual Walkthrough and the Monuments section are untouched (no anchor in their code); HANDOFF.md names the group file, its place after group PERF6 and after R1H-audit-h5 in group_order, and that the walkthrough guard must stay green on the full build (not run here).'),
             short='Bundle group: widen the minimap box east edge (constant Wa, one anchor asserted once) to the east edge in data-src/geo/map_extent.json; test projects every in-extent position inside the 160x120 minimap (red on R1g); no other byte changes. Waits for wp-data-14a.',
             owed='A look at the minimap in a real browser and the walkthrough guard on the full train (browser, lock): release workstream.'),
    ],
}

SLICES['wp-time-18'] = {
    'keep_parent': True,
    'note': 'WP-TIME-18: the entry wp-time-18 builds the module function and its test; the page rows (Ledger and Dashboard show the rate) are the slice wp-time-18-pages.',
    'slices': [
        dict(id='wp-time-18-pages', title='Ledger and Dashboard show the casualty rate per battle-minute from the module (slice of WP-TIME-18)',
             wave=None, area='pages', route='candidate-group', size='M',
             value='The plan wants the per-minute rate on the two pages every casualty figure points at; the module function alone shows nothing to a visitor.',
             files=['candidates/r1h/wp-time-18-pages/group.json', 'candidates/r1h/wp-time-18-pages/overlay/', 'candidates/r1h/wp-time-18-pages/test.mjs', 'candidates/r1h/wp-time-18-pages/STATUS.json', 'candidates/r1h/wp-time-18-pages/HANDOFF.md'],
             touches=['living-ledger.html', 'dashboard.html'],
             reads=['src/lib/time/intensity.js (entry wp-time-18)', 'release/R1g/dist/living-ledger.html', 'release/R1g/dist/dashboard.html', 'tools/time/build-clock-patches.mjs (how the module is inlined into pages)',
                    'docs/plan/FINAL/04-time-model-and-historical-accuracy.md (WP-TIME-18)', 'docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md rows A14, A47'],
             depends_on=['wp-time-18'],
             acceptance=(
                 'Candidate rows on living-ledger.html and dashboard.html show the casualty rate as a figure per battle-minute (never per tick; no "tick" or "real time" wording, rows A14 and A47) computed by the `intensity()` function of src/lib/time, inlined into the pages the way the CLOCK group inlines the module (the inlined text equals the module: a test compares them), '
                 'labelled "modelled" and with the basis of the casualty series it uses (a series the data does not support is not shown, with the visible sentence that says so); the totals the two pages print stay equal to each other (the plan\'s acceptance: Ledger totals equal Dashboard totals) and to the module\'s totals. '
                 'Test.mjs (node:vm with the real data files read from the tree): red on R1g (no rate on either page), green with the group; the rate printed for Pickett\'s Charge divided by the rate printed for Culp\'s Hill is at least 10 when the series supports both windows, otherwise the test states which and the slice stays open; every anchor is asserted once and disjoint from wp-page-18 (dashboard chart alternative), wp-content-09b and wp-pagec-27. '
                 'No existing tests/t0 spec is edited: the specs that quote the changed rows are named in HANDOFF.md for the release workstream.'),
             short='Candidate rows on Ledger and Dashboard print the casualty rate per battle-minute from the module (inlined as CLOCK does), labelled modelled with its basis; Ledger and Dashboard totals stay equal; Pickett/Culp ratio >= 10 where the data supports it. Waits for wp-time-18.',
             owed='A visual check of both pages and the tests/t0 specs that quote them (browser, lock): release workstream; the series choice rests on wp-data-08d.'),
    ],
}
