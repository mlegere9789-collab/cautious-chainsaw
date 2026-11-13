"""Authored backlog entries, first half of wave 1 (page and bundle candidates, security, copy truth).

Every entry names the exact check. `short` is the sentence handed to an engineer in the dispatch list (under 290 characters). `owed` lists what a
container cannot prove (real browser, GPU, device, live site) and is never claimed. Facts quoted here were measured on release/R1g/dist on 2026-11-13
(copy_lint counts, tag census, file sizes); the engineer re-measures them first and records any difference.
"""

CAND = 'candidates/r1h/%s/'


def cand_files(i, extra=()):
    return [CAND % i + 'group.json', CAND % i + 'overlay/', CAND % i + 'test.mjs', CAND % i + 'STATUS.json', CAND % i + 'HANDOFF.md'] + list(extra)


WAVE1A = {}


def A(i, **kw):
    kw.setdefault('wave', 1)
    WAVE1A[i] = kw


A('ver-hist-node', area='historian', route='source-rebuild', size='S',
  value='Unblocks every historian verification under the default node of the container; all later historian items are checked with it.',
  files=['tools/historian/ingest/times.mjs', 'tests/historian/times-node22.test.mjs', 'candidates/r1h/ver-hist-node/STATUS.json', 'candidates/r1h/ver-hist-node/HANDOFF.md'],
  reads=['tests/historian/atime.test.mjs', 'tests/historian/verify-ingest-clock.test.mjs'],
  acceptance=(
      'Red first: under the default node (v22.23.4) `node --test tests/historian/atime.test.mjs` fails to load tools/historian/ingest/times.mjs (SyntaxError: the regular-expression modifier group (?-i:...) in the MER pattern needs V8 12.5 or later). '
      'Done when (1) times.mjs contains no modifier group and keeps the exact readings: new tests/historian/times-node22.test.mjs pins at least 12 readings (read: "a. m.", "A. M.", "P.M.", "AM", "10 p.m."; not read: bare lower-case "am"/"pm" as in "1 am informed", and "Am"), '
      'and the offsets and values of the 23 cases of tests/historian/atime.test.mjs are unchanged; (2) under the default node `node --test tests/historian/*.test.mjs` loads every file (zero "failed to load") and its pass, fail and skip totals are identical to the same command under /opt/node24/bin/node on the same tree '
      '(both totals recorded in STATUS.json; run through tools/horde/bench.sh); (3) atime.test.mjs passes 23 of 23 under both nodes. No test is skipped, loosened or deleted to get there (git diff of tests/historian shows only the one new file).'),
  short='Red: under default node 22.23.4 tests/historian files fail to load (times.mjs modifier group). Done: no modifier group, same readings (new pinned test); the full tests/historian run under node 22 equals the node 24 totals; atime 23/23 on both; no test loosened.',
  owed='The full-suite run is heavy: it goes through tools/horde/bench.sh and may wait for its turn.')

A('wp-infra-28b', area='pages', route='candidate-group', size='S',
  value='Closes the last open security items of Live Sync (guessable room codes, unbounded host connections, unvalidated guest messages).',
  files=cand_files('wp-infra-28b'), touches=['watch-together.html'],
  reads=['release/R1g/dist/watch-together.html', 'tests/t0/wtpeer.spec.mjs', 'docs/plan/FINAL/09-infra-security-privacy-pwa.md (WP-INFRA-28)'],
  acceptance=(
      'candidates/r1h/wp-infra-28b/group.json (PG-r1h-wp-infra-28b, target watch-together.html only, every anchor asserted once) plus test.mjs that runs the patched page script in node:vm with a fake PeerJS and fake DOM. Assertions: '
      '(1) room codes: randomCode() draws with crypto.getRandomValues, no Math.random is left in the code path (source assertion), codes have 6 characters from a 28-character alphabet without look-alike letters (the alphabet is listed in the test), 2,000 generated codes are all valid and at least 1,990 are distinct; '
      '(2) host cap: of 25 incoming connections the first 20 are kept and connections 21..25 are closed (conn.close called, not added to the list); '
      '(3) the guest handler (conn.on("data")) passes to goToTick only an object {type:"goto", tick: integer 1..675, note: string <= 280 characters with control characters stripped}; 20 fuzz payloads (null, array, string, number, extra keys including __proto__, tick 0, 676, 1.5, "5", NaN, Infinity, a note of 281 characters, a note with <img onerror>, a nested object, a 10 MB string) never reach goToTick, and a valid payload does, its note shown as text only; '
      '(4) the visible sentence that says "5-letter code" says 6 characters, and the page makes no claim of "real time". Red on release/R1g/dist (Math.random, no cap, unvalidated data), green on the scratch tree. '
      'Coordination: wp-content-09b owns every other REALTIME and TICK hit of watch-together.html; this group owns only the Live Sync sentence and the code, cap and validation lines; anchors must not overlap.'),
  short='Group on watch-together.html with a node:vm test: 6-char codes from crypto.getRandomValues (28-char alphabet, no Math.random), host closes connections 21+, guest accepts only {goto, tick int 1..675, note<=280}; 20 fuzz payloads rejected. Red on R1g, green with the group.',
  owed='Two real browsers hosting and joining over PeerJS (tests/t0/wtpeer.spec.mjs T0-WTP-01..04 on the full train, through the machine lock) is for the release workstream.')

A('wp-content-09b', area='pages', route='candidate-group', size='S',
  value='Removes the claims the site cannot back ("minute by minute", "real time", "tick") from pages a visitor reads; rule A47 and A35.',
  files=cand_files('wp-content-09b'), touches=['living-ledger.html', 'site-nav.js', 'index.html', 'immersive.html', 'watch-together.html'],
  reads=['docs/content/STYLEGUIDE.md', 'tools/copy/copy_lint.mjs', 'docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md rows A35, A47'],
  acceptance=(
      'Group on living-ledger.html (meta description, og:description, subtitle and the JSON-LD description: one new sentence without "minute by minute", used identically in description and og:description), site-nav.js (the Ledger menu description), '
      'index.html (only the two non-meta strings that say "minute by minute"; the meta description of index.html is untouched, it waits for train S2), immersive.html (the "real time" caveat reworded, or kept if STYLEGUIDE allows it, with the reason written in HANDOFF.md), '
      'watch-together.html (every TICK label: aria-label, placeholder, stop label, caption, message; every REALTIME hit except the Live Sync sentence that belongs to wp-infra-28b). '
      'Test: `node tools/copy/copy_lint.mjs <scratch files> --no-baseline --rules REALTIME,TICK` reports 0 on every touched file; on release/R1g/dist the same rules report REALTIME 12 (immersive 1, index 2, living-ledger 4, manifest 2, site-nav 1, watch-together 2) and TICK 9 on pages (watch-together 7, cinematic-export 2). '
      'cinematic-export.html belongs to wp-pagec-24 and manifest.json to wp-infra-23b. No title, name or tab label changes (rows A01, A29), no clock string changes, no new claim. Existing element ids, aria-labels used by tests/t0 specs are kept unless the spec text is quoted in HANDOFF.md as needing the release workstream\'s update.'),
  short='Group removing "minute by minute", "real time" and "tick" wording from living-ledger, site-nav.js, index (non-meta), immersive, watch-together; copy_lint REALTIME,TICK = 0 on touched files (R1g: 12 and 9); names and meta of index untouched.',
  owed='Visual check of the Ledger and Watch Together pages and the tests/t0 specs that quote the old strings (copy.spec, a11y.spec): release workstream, full train, through the lock.')

A('wp-infra-23b', area='pages', route='candidate-group', size='S',
  value='The installed-app manifest still carries three retired claims; adds lang, a tagged start URL and shortcuts.',
  files=cand_files('wp-infra-23b'), touches=['manifest.json'],
  reads=['release/R1g/dist/manifest.json', 'release/R1g/dist/index.html', 'tests/t0/images.spec.mjs (T0-RIMG-12)'],
  acceptance=(
      'Group on manifest.json (every anchor once) with a test that parses the patched file: description equals, character for character after entity decoding, the meta description of release/R1g/dist/index.html and contains none of "real time", "five-minute", "467"; '
      'lang is "en-US"; start_url is "/?source=pwa"; id stays "/", name stays "Gettysburg Animated Battlefield Map" and short_name "Gettysburg" (rows A01, A29: identity waits for train S2); '
      'shortcuts holds exactly three entries named "Ask the Historian", "Search" and "Turning Points" whose urls resolve to pages of the tree (both spellings exist) and whose icons, if given, exist in the tree and are 192x192; the icon list is unchanged; '
      '`node tools/copy/copy_lint.mjs <patched manifest.json> --no-baseline` reports 0 findings (red on R1g: REALTIME 2). Red on release/R1g/dist (no lang, start_url "/", no shortcuts, three retired claims), green with the group.'),
  short='Group on manifest.json: description equals the home meta description (no "real time", "five-minute", "467"), lang en-US, start_url /?source=pwa, three shortcuts that resolve; id, name, short_name, icons unchanged; copy_lint 0. Red on R1g, green with group.',
  owed='T0-RIMG-12 (Chrome installability errors) needs the full train and a browser: release workstream, through the lock.')

A('wp-hist-01b', area='pages', route='candidate-group', size='S',
  value='The shipped Ask the Historian page is the only front door of the Historian: unlabelled 15 px input, no live region, no retry, persona wording.',
  files=cand_files('wp-hist-01b'), touches=['historian.html'],
  reads=['release/R1g/dist/historian.html', 'tests/t0/pages-core.spec.mjs', 'docs/content/STYLEGUIDE.md'],
  acceptance=(
      'Group on historian.html (head tags untouched: wp-seo-04b owns og and description) with a test, red on R1g and green with the group: (1) the #ask input is at least 16 px (font-size 16px) and has a visible <label for="ask">; '
      '(2) a polite live region (role="status" or aria-live="polite") receives the answer count or the "no result" text; (3) each of the 15 data fetches of the page has a failure path that shows an inline message with a Retry button that runs the load again: the test runs the page script in node:vm with a rejecting fetch stub and a minimal DOM stub and asserts the button appears and that clicking it calls the loader again; '
      '(4) the persona strings ("I couldn\'t find anything specific ...", "I\'m ready. Ask me about ...") are replaced by the style-guide wording ("Ask the Historian: a search of the site\'s records" family, no first person): `node tools/copy/copy_lint.mjs <scratch historian.html> --no-baseline --rules AIPERSONA` reports 0 (red on R1g: 2 hits on this file). '
      'Superseded when the candidate page of WP-HIST-11 ships; HANDOFF.md says so.'),
  short='Group on historian.html: 16 px labelled input, polite live region, inline Retry on a failed load (node:vm test with a rejecting fetch), persona wording replaced; copy_lint AIPERSONA = 0 on the file (R1g: 2). Head tags untouched. Red on R1g, green with group.',
  owed='Playwright with fetches blocked and axe (pages-core in the release workstream).')

A('wp-pagec-30', area='pages', route='candidate-group', size='S',
  value='The 404 page is a dead end today (no navigation, no landmark, no search).',
  files=cand_files('wp-pagec-30'), touches=['404.html'],
  reads=['release/R1g/dist/404.html', 'release/R1g/dist/site-nav.js'],
  acceptance=(
      'Group on 404.html with a test, red on R1g (no nav, no main, no search entry) and green with the group: a skip link to #main, a <nav aria-label> with at least Map, Search, Historian and Turning Points whose hrefs resolve to files of the tree, the existing content wrapped in <main id="main">, '
      'and a search entry that does what the destination can do: search.html reads no query parameter today (no URLSearchParams or location.search in the file), so the group adds a link labelled "Search everything" to the search page (the test greps search.html for a query-parameter reader and, only if one exists, requires a <form role="search" method="get"> with a labelled input that uses exactly that parameter name); '
      'noindex kept, title and h1 text unchanged (A01), the pages-fixes rules (12 px floor, 44 px targets: assert the existing a.cta rule is still present) kept, no external request added, copy_lint 0 findings on the file.'),
  short='Group on 404.html: skip link, nav with resolving links, <main id=main>, a link to the search page (a form only if search.html reads a query parameter: it reads none today), noindex and title/h1 unchanged, 44 px rules kept, copy_lint 0. Red on R1g, green with group.',
  owed='Lighthouse accessibility 100 and the 404 status on missing paths in both spellings (header matter, release workstream).')

A('wp-pagec-33', area='pages', route='candidate-group', size='S',
  value='The embed widget is iframed on other sites: no h1, three data fetches for one vignette.',
  files=cand_files('wp-pagec-33'), touches=['embed.html'],
  reads=['release/R1g/dist/embed.html', 'release/R1g/dist/data/vignettes_part1.json'],
  acceptance=(
      'Group on embed.html with a node:vm test (stubbed fetch counting calls, minimal DOM), red on R1g and green with the group: (1) the headline element is an <h1> (exactly one h1 in the file); (2) a request with ?vignette=<id> performs exactly one fetch of /data/vignettes_part<N>.json where N is derived from the id and the part sizes read from the three files in the tree, '
      'and falls back to the other parts only when the id is not found there (an unknown id ends in the error state after at most 3 fetches); the default "on this day" pick performs exactly one fetch; (3) loading is role="status" and the error state role="alert"; '
      '(4) the call-to-action link keeps target="_top" and its href format; (5) the iframe payload (embed.html bytes plus the one JSON part) is reported in HANDOFF.md against the plan limit of 15 KB (the parts are 13.7 to 15.9 KB: say so, do not claim the limit is met if it is not). Red on R1g: 3 fetches.'),
  short='Group on embed.html: headline is the single h1, one vignettes part fetched per view (3 on R1g; fallback only when the id is missing), loading role=status, error role=alert, CTA unchanged; node:vm test counts fetches. Payload vs the 15 KB limit reported, not claimed.',
  owed='axe inside an iframe and light/dark host screenshots (browser, release workstream).')

A('wp-pagec-24', area='pages', route='candidate-group', size='S',
  value='Cinematic Export promises a "narrated flyover video" it cannot produce (no audio) and calls MediaRecorder without checking it exists.',
  files=cand_files('wp-pagec-24'), touches=['cinematic-export.html'],
  reads=['release/R1g/dist/cinematic-export.html', 'docs/plan/FINAL/08b-subpages-C.md (WP-PAGEC-24)'],
  acceptance=(
      'Group on cinematic-export.html with a test, red on R1g and green with the group: (1) the meta description, og:description and any twitter or JSON-LD description no longer say "narrated" or "flyover" and describe what the page does (a silent video recorded from the map); description and og:description are identical (wp-seo-04b relies on this); '
      '(2) the page script checks `typeof MediaRecorder` and the supported mime type before recording and otherwise shows a specific message in a role="alert" element naming what is missing (node:vm test with and without a MediaRecorder stub: no throw, message shown, the Record button disabled); '
      '(3) the two TICK words (label "tick") are replaced; copy_lint --rules REALTIME,TICK,AIPERSONA reports 0 on the file (red on R1g: TICK 2); (4) title and h1 unchanged (A01). Rights decision stays with row A15 (Record is kept; the owned-basemap move is WP-PAGEC-25).'),
  short='Group on cinematic-export.html: no "narrated flyover" claim (description = og:description), MediaRecorder existence and mime check with a role=alert message and disabled Record (node:vm test), TICK words replaced, copy_lint 0. Red on R1g, green with group.',
  owed='Browser matrix for the recorder (Chrome, Firefox, Safari 17/18.4+, iOS): owner machines and the release workstream.')

A('wp-seo-04b', area='pages', route='candidate-group', size='S',
  value='Share previews and crawlers see a different description than the page says on 10 of 21 pages; no og:site_name anywhere; privacy and terms have no cards.',
  files=cand_files('wp-seo-04b'), touches=['*.html (23 pages)'],
  reads=['release/R1g/dist/*.html', 'tools/t0/seo/gen_zseo.py', 'tests/t0/seo.spec.mjs (T0-SEO-10)'],
  acceptance=(
      'A generator candidates/r1h/wp-seo-04b/gen.mjs writes group.json (one patch per page, every anchor asserted once) and test.mjs walks every *.html of the tree, red on R1g and green with the group: '
      '(1) on the 23 pages that have a meta description (the 21 that also have og tags, plus privacy.html and terms.html) og:site_name is present (the current site name, unchanged: A01), og:locale is "en_US", og:type, og:title, og:url (equal to the canonical already on the page), og:image and twitter:card are present; '
      '(2) og:description equals the meta description after entity decoding on all 23 pages (R1g: 10 differ: ar, cinematic-export, find-ancestor, ground-remembers, historian, immersive, living-ledger, regiment, turning-points, watch-together); '
      'living-ledger.html (wp-content-09b) and cinematic-export.html (wp-pagec-24) get their equality from those groups, so this group adds only their site_name and locale tags on other anchors, and its test accepts equality from either source; '
      '(3) privacy.html and terms.html get the card tags with an existing image of the tree; 404.html and embed.html (no description) and google0dca4879c9657741.html are left alone; no canonical, title or description text is changed by this group. Identity stays for train S2.'),
  short='Generator + group: on the 23 described pages add og:site_name, og:locale, og:type/title/url/image, twitter:card (also privacy, terms) and make og:description equal the meta description (10 differ on R1g). No canonical/title/description change. Test walks every page; red on R1g.',
  owed='The identity-file lines for the changed pages (tools/t0/identity-*.json) and T0-SEO-10 extension are the release workstream\'s; HANDOFF.md lists them.')

A('wp-page-18', area='pages', route='candidate-group', size='S',
  value='The Casualty Dashboard chart has no text alternative and no loading or error state; it is the page every figure of the site points at.',
  files=cand_files('wp-page-18'), touches=['dashboard.html'],
  reads=['release/R1g/dist/dashboard.html', 'release/R1g/dist/data/casualty_apportionment.json', 'docs/plan/FINAL/08a-subpages-A-B.md (WP-PAGE-18)'],
  acceptance=(
      'Group on dashboard.html with a node:vm test (minimal DOM, real data files read from the tree), red on R1g and green with the group: (1) a data-table alternative: a <details> holding a <table> with a caption, scoped headers and one row per corps and day built from the same data the chart draws, so a screen-reader user can read every corps; '
      'the totals in the table equal the totals the chart code computes (asserted from the same arrays); (2) loading state (role="status") and error state (role="alert" with a Retry button) for the data fetch, shown when fetch rejects or returns a non-ok status (stubbed); '
      '(3) the existing named chart region, the keyboard legend with pressed state and the viewBox are kept (assert the PGC-dash-svg, PGF-dashboard-legend and PGC-a11y-dashboard-chart-wrap markers still present); (4) no new external request; copy_lint 0 on the file. '
      'The plan\'s re-layout at container width (WP-PAGE-18 full) is not part of this slice and is not claimed.'),
  short='Group on dashboard.html: a <details><table> alternative with caption and scoped headers whose totals equal the chart\'s, loading role=status and error role=alert with Retry (node:vm tests), existing chart markers kept. Red on R1g, green with group; re-layout not claimed.',
  owed='Responsive layout 320 to 2560 px, axe and contrast (browser; release workstream).')

A('wp-infra-21b', area='infra', route='candidate-group', size='S',
  value='No security.txt is published; a reporter has no documented way to reach the owner about a vulnerability.',
  files=cand_files('wp-infra-21b', ['candidates/r1h/wp-infra-21b/overlay/well-known/security.txt', 'docs/battle-theatre/GOVERNANCE/horde/requests/main-site-wp-infra-21b.md']), touches=['well-known/security.txt (new overlay file)'],
  reads=['ops/legal-drafts/contact-architecture.md section 7', 'release/R1g/dist/privacy.html', 'docs/plan/FINAL/09-infra-security-privacy-pwa.md (WP-INFRA-21 step 5)'],
  acceptance=(
      'Overlay file well-known/security.txt and a test, red on R1g (no such file) and green with the overlay: RFC 9116 fields: `Contact: mailto:security@gettysburginteractivemap.com` exactly as drafted in ops/legal-drafts/contact-architecture.md section 7 (the test reads that draft and requires the same value; no personal mailbox: `grep -ri "@gmail.com"` on the file is empty), '
      '`Expires:` an ISO 8601 UTC timestamp at least 60 days and at most 366 days after the build date (trains.json legal.effective_date when set, otherwise the date written in the file header; the test fails under 60 days of validity), `Preferred-Languages: en`, `Canonical: https://gettysburginteractivemap.com/.well-known/security.txt`, UTF-8, LF, ends with a newline. '
      'HANDOFF.md says the file must not be registered until the owner has made the security@ alias receive mail (owner-only step of WP-INFRA-21: forwarder and DNS), and carries the exact request to the release workstream (docs/battle-theatre/GOVERNANCE/horde/requests/main-site-wp-infra-21b.md): the rewrite row `/.well-known/* /well-known/:splat 200` and a `Content-Type: text/plain; charset=utf-8` header rule for /well-known/* in tools/t0/config/gen.mjs, and the check that the built tree serves it 200 text/plain. Mail forwarder and DMARC are not in this item.'),
  short='Overlay well-known/security.txt (RFC 9116: Contact = the drafted security@ role address, Expires 60..366 days ahead, Canonical, Preferred-Languages); test fails under 60 days; HANDOFF gates registration on the owner making the alias work; request note for rewrite and text/plain.',
  owed='The rewrite and header live in tools/t0/config/gen.mjs (release workstream); 200 text/plain on a built train is checked there.')
