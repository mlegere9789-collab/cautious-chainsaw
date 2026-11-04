#!/usr/bin/env node
// docs/accept/triage/gen_triage.mjs - writes regression_waivers.proposed.json and triage-table.json from the single table below.
//   node docs/accept/triage/gen_triage.mjs [--anchors release/R1c/anchors.json] [--pass docs/accept/dryrun/pass-1.json]
// The defect ids D01..D53 are the rows of "Check 3" in docs/accept/dryrun/pass-1.md in report order.  Nothing here touches tools/accept/regression_waivers.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const anchors = JSON.parse(fs.readFileSync(path.resolve(REPO, arg('anchors', 'release/R1c/anchors.json')), 'utf8'));
const pass = JSON.parse(fs.readFileSync(path.resolve(REPO, arg('pass', 'docs/accept/dryrun/pass-1.json')), 'utf8'));
const screens = Object.fromEntries(pass.checks.find((c) => c.id === '3').raw.screens.map((s) => [s.tag, s]));
const pageIds = (file) => anchors.patches.filter((p) => p.target === file).map((p) => p.id);
const bundleIds = anchors.patches.filter((p) => ['js', 'help', 'book', 'css'].includes(p.target)).map((p) => p.id);
const DATE = '2026-10-20';
const PROPOSED = 'PROPOSED by the regression triage; to be recorded by the integrator after review (the owner decision / documentation it rests on is in `evidence`)';

// ---------------------------------------------------------------- evidence snippets (file:line verified 2026-10-20)
const E = {
  orphan: [
    { doc: 'tools/t0/trains.json', line: 11, quote: '"orphans": ["assets/InterpolationWorker-ufiwa2-e.js"],' },
    { doc: 'tools/t0/README.md', line: 57, quote: 'deletes the five legacy assets (entry, both chunks, CSS, orphan `InterpolationWorker-*.js`)' },
    { doc: 'docs/plan/FINAL/05-performance-to-green.md', line: 34, quote: '`InterpolationWorker` (672 B) unreferenced' },
    { doc: 'docs/plan/FINAL/04-time-model-and-historical-accuracy.md', line: 51, quote: 'time-facts-09: `InterpolationWorker` is dead code.' },
    { doc: 'ops/release-notes/R1c.md', line: 19, quote: 'Files removed from the baseline: ... `assets/InterpolationWorker-ufiwa2-e.js` ...' },
  ],
  manifest: [
    { doc: 'ops/T0-DEVIATIONS.md', line: 16, quote: 'row 8: `orientation` deleted, `id: "/"` added; ... two NEW maskable icons; the two existing icons say `purpose: "any"`' },
    { doc: 'docs/plan/FINAL/02-tranche0-hotfix-runbook.md', line: 180, quote: '`manifest.json`: add `"id":"/"`, delete `orientation` and the two corrupt `screenshots` entries' },
    { doc: 'docs/plan/FINAL/01-decision-register.md', line: 192, quote: 'manifest orientation lock removed' },
    { doc: 'docs/plan/FINAL/01-decision-register.md', line: 237, quote: 'set `manifest.id = "/"` NOW ... drop `orientation`' },
    { doc: 'docs/plan/FINAL/16-audit-corrections-and-new-findings.md', line: 57, quote: '`orientation` affects only an installed standalone PWA, not a browser tab; but landscape is unusable (map 141 px at 812x375)' },
    { doc: 'docs/plan/FINAL/07-accessibility.md', line: 264, quote: 'WCAG 1.3.4 fail -> pass (orientation removed ...)' },
    { doc: 'tools/t0/assets-src/build_assets.py', line: 196, quote: "bad.append('manifest still has orientation')" },
  ],
  subpage: [
    { doc: 'ops/release-notes/R1a.md', line: 48, quote: 'Sub-pages: no horizontal scroll on a phone, 44 px targets, no text under 12 px, a gold focus ring, the shared navigation is a little taller on a phone, footers wrap into rows.' },
    { doc: 'tools/t0/patches/PG-core.json', quote: 'PGF-nav-css, PGC-css-reserve-mounts, PGC-css-footer-contrast, PGC-css-footer-link-contrast, PGC-css-group-why-contrast (patch notes carry the reasons)' },
    { doc: 'ops/T0-DEVIATIONS.md', line: 25, quote: 'row 17: `PG-core` also carries page copy and a11y fixes ... one pass over each page' },
    { doc: 'ops/T0-DEVIATIONS.md', line: 21, quote: 'row 13: the owner authorised the full plan; the closed list was a floor' },
  ],
  gtbgFill: [{ doc: 'tools/t0/patches/PG-core.json', quote: 'PGC-css-reserve-mounts: reserve the nav height; keep main about a screen tall so the JS-injected footer starts below the fold (the footer CLS was 0.09-0.55; comment in site-nav.css)' }],
  mapPages: [
    { doc: 'tools/t0/patches/PG-maps.json', quote: 'description: WP-T0-13 (8 map pages: non-blocking Mapbox GL with SRI, PeerJS on demand) and WP-T0-14 (og:image/twitter:image -> /og/card-r1.png on 21 pages)' },
    { doc: 'ops/T0-DEVIATIONS.md', line: 24, quote: 'row 16: WP-T0-13: non-blocking Mapbox, plus SRI on `mapbox-gl.js`, `mapbox-gl.css` and PeerJS (fails closed) and 7 CLS guards' },
    { doc: 'ops/release-notes/R1a.md', line: 41, quote: 'P1/P4 on the 8 map sub-pages (non-blocking Mapbox, PeerJS on demand)' },
  ],
  ar: [
    { doc: 'docs/plan/FINAL/11-copy-docs-content.md', line: 364, quote: 'ar.html:56 "...which we haven\'t been able to do from here." -> "Battlefield AR needs a phone with a camera, GPS and compass, and works best outdoors on the field. ..." + D-AR (Beta)' },
    { doc: 'tools/t0/patches/PG-core.json', quote: 'PGC-ar-notice, PGC-ar-noindex, PGC-nav-hide-ar, PGC-sitemap-ar (D-SCOPE-TIERS hide-now)' },
    { doc: 'ops/release-notes/R1a.md', line: 47, quote: 'AR is hidden and `noindex`' },
  ],
  dashboard: [
    { doc: 'docs/plan/FINAL/11-copy-docs-content.md', line: 365, quote: 'dashboard.html:261-263, :244-248 "Data note: ... should be reconciled"; card `highest_single_regiment_rate` / `undefined` -> delete the footnote code; cards "Most compressed fight, Union", ...' },
    { doc: 'docs/plan/FINAL/08a-subpages-A-B.md', line: 169, quote: 'Nested `highest_single_regiment_rate` prints the raw key + `undefined` ... developer "Data note" and glyphs (`:257-265`); fixed 1000 px SVG ... a modeled curve labelled "effective strength"' },
    { doc: 'docs/plan/FINAL/08a-subpages-A-B.md', line: 171, quote: 'WP-17 reconciliation: Keep U-I `total_casualties` 6,059 ... recompute every `overall_rate` (U-I 49.6 vs 52.3, C-CAV 6.1 vs 5.1)' },
    { doc: 'docs/decisions/OWNER-DECISIONS-2026-10-05.md', line: 7, quote: 'Wrong displayed data must be fixed. Every displayed time, place, number and name is either verified against a cited source, labelled as an estimate with its uncertainty, or removed.' },
    { doc: 'tools/t0/patches-next/DATA.json', quote: 'DATA-cas-UI-day1 (OR 27/1 p.174, p.187: I Corps 6,059; Day 1 = 6,059 minus the 335 allocated to Day 3), DATA-dash-card-union, DATA-dash-card-conf' },
  ],
  historian: [
    { doc: 'tools/t0/patches/PG-core.json', quote: 'PGC-hist-how (pages-C-16: hard-coded counts and the claim that every answer links to a row of data -- chronology answers had no source), PGC-hist-src-note, PGC-hist-chron (all 137 chronology answers printed "undefined")' },
    { doc: 'docs/plan/FINAL/11-copy-docs-content.md', line: 104, quote: 'Historian `historian.html:113-125`: one implementation, owned by WP-HIST-01 (chapter 14 section E, same R1 release)' },
  ],
  viewshed: [
    { doc: 'docs/plan/FINAL/11-copy-docs-content.md', line: 363, quote: 'viewshed.html:46 "Earlier drafts of this tool tried..." -> "Elevation only. This page ranks the height of 30 places on the field. It is not a line-of-sight map: trees, buildings, fences and gun smoke often decided what a soldier could see."' },
    { doc: 'docs/plan/FINAL/01-decision-register.md', line: 310, quote: 'D-VIEWSHED DEFAULT: state "Elevation only. Line-of-sight maps are not shown on this page"' },
    { doc: 'tools/t0/patches/PG-core.json', quote: 'PGC-viewshed-caveat (docs-copy / chapter 11 Appendix A row 1)' },
  ],
  index: [
    { doc: 'ops/release-notes/R0.md', line: 48, quote: 'The intro is gone: the app shows the layout chooser/map at once. Tick 1 now draws 70 (Day 1 loaded) to 71 (all days) units instead of the intro-primed ghosts ... Sign-off O-T0-3.' },
    { doc: 'docs/plan/FINAL/02-tranche0-hotfix-runbook.md', line: 330, quote: '`R0-intro-delete` removes that, so R0 ... is the first release that draws 70-71 units at tick 1 ... until WP-T0-07\'s stateless `i2` ships.' },
    { doc: 'docs/plan/FINAL/01-decision-register.md', line: 257, quote: 'D-ENTRY DEFAULT 1: No modal gates: layout by CSS/`matchMedia` with a Settings override; fast-forward, chooser, onboarding modal and injected banner deleted' },
    { doc: 'ops/T0-DEVIATIONS.md', line: 22, quote: 'row 14: D-SHELL / WP-T0-08: layout query 820 px -> 834 px ... Needs the owner: **yes** when the devices have been tried' },
    { doc: 'ops/T0-DEVIATIONS.md', line: 32, quote: 'row 24: ... from R1b group C auto-detects the layout and the chooser is never shown' },
    { doc: 'ops/release-notes/R1b.md', line: 27, quote: 'Group C: layout auto-detect `(max-width:834px) and (pointer:coarse), (max-height:480px) and (pointer:coarse)` ... the Tools sheet (Help, Bookmarks, Layers wired, NPS tile became Virtual Walkthrough ...)' },
  ],
  indexCopy: [
    { doc: 'tools/t0/patches/CP.json', quote: 'cp:b10 "1x (real time)" -> "1x (base speed)" ("real time" is not true after the time model); cp:b11 "Download Website Tutorial PDF" -> "User Guide (PDF)" (matches the site footer label)' },
    { doc: 'docs/plan/FINAL/11-copy-docs-content.md', line: 376, quote: 'row 14: "1x (real time)"; "Tick 538/675" -> "1x" + tooltip "Base playback speed"' },
  ],
  sound: [
    { doc: 'docs/plan/FINAL/01-decision-register.md', line: 300, quote: 'D-SOUND DEFAULT. Remove: delete `yO`/`vO` ... (T0 patch B ...); fix banner, guide, Help.' },
    { doc: 'docs/plan/FINAL/16-audit-corrections-and-new-findings.md', line: 106, quote: 'NF-05 `CanvasRenderer` is an undefined global: turning sound on freezes playback or blanks the app (owner wanted no audio: D-SOUND)' },
    { doc: 'ops/release-notes/R1a.md', line: 47, quote: 'the sound button is gone' },
    { doc: 'tools/t0/patches/A.json', quote: 'A-sound-remove-button (D-SOUND default): function yO(){return null}; bug:B-sound-ReferenceError' },
  ],
  date: [
    { doc: 'ops/release-notes/R1c.md', line: 27, quote: 'Group B (13 patches): the July +2 date bug (HUD, monument tooltip, ancestor timeline) ...' },
    { doc: 'docs/decisions/OWNER-DECISIONS-2026-10-05.md', line: 3, quote: 'They supersede the T0 rule "no clock-label changes except +2" (the +2 date fix is the one clock-label change that rule always allowed; the clock itself is corrected by group CLOCK)' },
    { doc: 'tools/t0/patches/B.json', quote: 'bug:D1-hud-date' },
  ],
  phone: [
    { doc: 'docs/plan/FINAL/06-ux-ui-mobile-desktop.md', line: 46, quote: 'F3: Search, Filter, story, event card and unit panels sit under the opaque mobile root: invisible on phones. 14 mobile tiles (5 dead: Layers, Bookmarks, Help, NPS Auto Tour, Monuments ...)' },
    { doc: 'docs/plan/FINAL/16-audit-corrections-and-new-findings.md', line: 103, quote: 'NF-02: 15 desktop overlays render with no layout guard in the Mobile layout; `IO` ties the mobile root at z100 and covers dock and Tools sheet' },
    { doc: 'docs/plan/FINAL/16-audit-corrections-and-new-findings.md', line: 105, quote: 'NF-04: Five of 14 mobile Tools tiles are dead (Help, Bookmarks, Map Layers, Monuments, NPS Auto Tour); Walkthrough, Distance, Locations, Sound have no mobile entry.' },
    { doc: 'tools/t0/patches/C.json', quote: 'mob:HF-1a (gate desktop overlays out of the phone layout), HF-6a (drop dead Monuments tile), HF-6b (NPS tour tile -> Virtual Walkthrough), HF-6f (Ask the Historian tile), HF-6g (append the Extra Features groups to the sheet)' },
    { doc: 'ops/release-notes/R1b.md', line: 46, quote: 'Phones and coarse-pointer tablets up to 834 px wide (and landscape phones) get the mobile shell ...' },
  ],
  timeline: [{ doc: 'tools/t0/patches/AX.json', quote: 'AX: timeline slider as an integer 1..675 slider with `aria-valuetext` (R1b.md:28)' }],
};

// ---------------------------------------------------------------- page table
const SUB = ['aftermath', 'ar', 'dashboard', 'documentary', 'education', 'embed', 'find-ancestor', 'historian', 'living-ledger', 'privacy', 'regiment', 'report', 'search', 'terms', 'turning-points', 'camera', 'cinematic-export', 'compare', 'ground-remembers', 'immersive', 'sandbox', 'viewshed', 'watch-together'];
const MAPP = new Set(['camera', 'cinematic-export', 'compare', 'ground-remembers', 'immersive', 'sandbox', 'viewshed', 'watch-together']);
const FILL = new Set(['search', 'dashboard', 'documentary', 'education', 'living-ledger', 'historian']);
const PAGE_CAUSE = {
  aftermath: 'back link and footer links 44 px, intro 14 px, dates 12 px, caveat 13 px (PGF-css-aftermath); text is identical',
  ar: 'caveat paragraph replaced (PGC-ar-notice), noindex (PGC-ar-noindex), 12 px text (PGF-css-ar)',
  dashboard: 'chart scales with its card and no longer overflows a phone (published page was 448 px wide at 390), titled stat cards instead of a raw key and "undefined", developer data note and warning glyphs removed, legend entries are keyboard buttons (PGC-dash-*, PGF-css-dashboard, PGF-dashboard-legend-*)',
  documentary: 'sub 14 px, eyebrow 12 px, main kept about one screen tall (PGF-css-documentary, PGC-fill-documentary)',
  education: 'back link keeps its own 14 px, main kept about one screen tall (PGF-css-education, PGC-fill-education)',
  embed: '12 px text, readable link colour, 44 px link and button targets (PGF-css-embed; the page is iframed on other sites)',
  'find-ancestor': 'labels on the two inputs, 44 px result rows, 12-14 px text (PGF-label-*, PGF-css-find-ancestor)',
  historian: 'how-it-works sentence rewritten with computed counts, answers carry a source line, 44 px source links, main kept about one screen tall (page is now taller than 900 px at 1440), no per-message jump (PGC-hist-*, PGF-*, PGC-fill-historian)',
  'living-ledger': 'main kept about one screen tall, cumulative curve fixed (tick 1 read 4 and tick 675 read 47,001 against a period total of 46,163: PGC-ledger-curve), 12 px labels, labelled speed select',
  privacy: 'Back-to-map link and mailto links are 44 px targets, wide tables scroll in a focusable region (PGF-css-privacy, PGF-privacy-tablewrap); the text is unchanged (the legal group is opt-in and not in this build)',
  regiment: 'search box id renamed (the sprite symbol id="search" won getElementById: PGC-regiment-input), alias stubs no longer searchable (PGC-regiment-alias), missing casualty rate computed (PGC-regiment-rate), 44 px result rows (PGF-css-regiment)',
  report: 'search box id renamed (PGC-report-input), alias stubs no longer searchable, rows without data hidden instead of printed as a dash (PGC-report-show), 44 px keyboard result rows (PGF-report-match-kbd)',
  search: 'filter chips 44 px with a background of their own (PGC-search-chip: 1.10:1 contrast before), labelled search box, 12-13 px result tags (PGF-css-search), main kept about one screen tall',
  terms: 'Back-to-map and mailto links are 44 px targets (PGF-css-terms); the text is unchanged',
  'turning-points': 'six anchor ticks repointed to the site\'s own chronology (DL-turning-points-anchor x6: Ewell 175 -> 75, Longstreet 240 -> 256, Chamberlain 267 -> 275, Night Assault 340 -> 326, Cannonade 540 -> 518, Pickett 560 -> 538), 12 px labels (PGF-css-turning-points)',
  camera: 'Mapbox script/stylesheet non-blocking with SRI, DOMContentLoaded wrapper (maps:camera:*), 14 px sub (PGF-css-camera); the 59 % diff is the c3 screenshot method (section 7.3), the map itself renders identically',
  'cinematic-export': 'non-blocking Mapbox (maps:cinematic-export:*), labels bound to their inputs (PGF-label-cinematic-*), loading notice out of flow (CLS), 12 px labels',
  compare: 'non-blocking Mapbox, split container hidden with visibility instead of display (CLS), toggle row wraps, phone layout, named sliders and canvases (PGF-compare-*, PGC-compare-toggle-wrap, PGC-a11y-compare-slider-*)',
  'ground-remembers': 'non-blocking Mapbox, slider label shrinks to the screen (PGF-css-ground-remembers), 14 px sub, 13 px caveat',
  immersive: 'non-blocking Mapbox, Pause now silences the drone (PGC-imm-pause), labelled volume, inert map until the sound gate is passed (PGF-immersive-gate-*)',
  sandbox: 'non-blocking Mapbox, map wrapped so the edit pop-up stays inside it (PGF-sandbox-wrap, PGF-sandbox-popup), hint and list colours raised for contrast, phone layout (PGF-css-sandbox)',
  viewshed: 'non-blocking Mapbox, caveat shortened to "Elevation only ..." (PGC-viewshed-caveat), select shrinks to the screen (PGF-css-viewshed)',
  'watch-together': 'non-blocking Mapbox, PeerJS loaded on demand with SRI (maps:watch-together:peerjs-*), imported tours validated and rendered with textContent (PGC-wt-*: stored XSS), labelled inputs, 44 px controls (PGF-wt-*)',
};
const KEY_REQUIRE = {
  ar: ['PGC-ar-notice', 'PGC-ar-noindex'], dashboard: ['PGC-dash-cards', 'PGC-dash-footnote', 'PGC-dash-legend-warning', 'PGC-dash-chart-note'], historian: ['PGC-hist-how', 'PGC-hist-src-note'],
  viewshed: ['PGC-viewshed-caveat'], 'turning-points': ['DL-turning-points-anchor 175->75 (Ewell\'s Discretion on Cemete)'], 'living-ledger': ['PGC-ledger-curve'],
};
const CTRL_NONE = { lostAllowed: [] };
const SHIFT = (tag) => { const s = screens[tag]; if (!s) return null; const dh = s.cand[1] - s.base[1]; return { maxRatioPercent: Math.max(0.5, Math.ceil(Math.max(s.diffRatio * 100 * 1.5, s.diffRatio * 100 + 0.5) * 10) / 10), maxHeightDelta: Math.max(60, Math.ceil(Math.abs(dh) * 1.5 / 10) * 10), observedPercent: Math.round(s.diffRatio * 100000) / 1000, observedHeightDelta: dh }; };

// ---------------------------------------------------------------- defects (order of docs/accept/dryrun/pass-1.md, check 3)
const D = [];
const add = (code, where, kind, route, extra) => D.push({ id: 'D' + String(D.length + 1).padStart(2, '0'), code, where, kind, route, ...extra });
add('file-missing', 'assets/InterpolationWorker-ufiwa2-e.js', 'file', 'assets/InterpolationWorker-ufiwa2-e.js', { cls: 'INTENTIONAL', basis: 'B' });
add('data-regressed', 'manifest.json (/orientation key removed)', 'data', 'manifest.json', { cls: 'INTENTIONAL', basis: 'B' });
const shot = (page, vp) => `${page === 'index' ? 'index' : page}@${vp}`;
const ORDER = [ // pass-1 order
  ['aftermath', ['screenshot'], [1440, 390]], ['ar', ['text', 'screenshot'], [1440, 390]], ['dashboard', ['text', 'screenshot'], [1440, 390]], ['documentary', ['screenshot'], [1440, 390]],
  ['education', ['screenshot'], [1440, 390]], ['embed', ['screenshot'], [1440, 390]], ['find-ancestor', ['screenshot'], [1440, 390]], ['historian', ['text', 'screenshot'], [1440, 390]],
  ['living-ledger', ['screenshot'], [1440, 390]], ['privacy', ['screenshot'], [1440, 390]], ['regiment', ['screenshot'], [1440, 390]], ['report', ['screenshot'], [1440, 390]],
  ['search', ['screenshot'], [1440, 390]], ['terms', ['screenshot'], [1440, 390]], ['turning-points', ['screenshot'], [1440, 390]],
  ['camera', ['screenshot'], [1440]], ['cinematic-export', ['screenshot'], [1440]], ['compare', ['screenshot'], [1440]], ['ground-remembers', ['screenshot'], [1440]], ['immersive', ['screenshot'], [1440]],
  ['index', ['text', 'controls', 'screenshot'], [1440, 390]], ['sandbox', ['screenshot'], [1440]], ['viewshed', ['text', 'screenshot'], [1440]], ['watch-together', ['screenshot'], [1440]],
];
// interleave exactly like the report: per page and viewport the text row comes before the screenshot row; index lists text, controls, screenshot per viewport
for (const [page, kinds, vps] of ORDER) {
  for (const vp of vps) {
    for (const k of kinds) {
      if (page === 'ar' || page === 'dashboard' || page === 'historian' || page === 'viewshed' || page === 'index') { /* order handled by the sort of kinds below */ }
      const where = shot(page, vp);
      const cls = page === 'dashboard' ? 'CONDITIONAL' : 'INTENTIONAL';
      add(k === 'text' ? 'text-missing' : k === 'controls' ? 'control-missing' : 'screenshot-differs', where, k === 'screenshot' ? 'screenshot' : k, page === 'index' ? '/' : '/' + page, { cls, basis: page === 'dashboard' ? 'A/B' : 'B', page, vp });
    }
  }
}
// the report lists the rows of a page as: per viewport (text, screenshot) -- the order below re-sorts to the report order
const REPORT_ORDER = ['aftermath@1440:screenshot', 'aftermath@390:screenshot', 'ar@1440:text', 'ar@1440:screenshot', 'ar@390:text', 'ar@390:screenshot', 'dashboard@1440:text', 'dashboard@1440:screenshot', 'dashboard@390:text', 'dashboard@390:screenshot',
  'documentary@1440:screenshot', 'documentary@390:screenshot', 'education@1440:screenshot', 'education@390:screenshot', 'embed@1440:screenshot', 'embed@390:screenshot', 'find-ancestor@1440:screenshot', 'find-ancestor@390:screenshot',
  'historian@1440:text', 'historian@1440:screenshot', 'historian@390:text', 'historian@390:screenshot', 'living-ledger@1440:screenshot', 'living-ledger@390:screenshot', 'privacy@1440:screenshot', 'privacy@390:screenshot',
  'regiment@1440:screenshot', 'regiment@390:screenshot', 'report@1440:screenshot', 'report@390:screenshot', 'search@1440:screenshot', 'search@390:screenshot', 'terms@1440:screenshot', 'terms@390:screenshot', 'turning-points@1440:screenshot', 'turning-points@390:screenshot',
  'camera@1440:screenshot', 'cinematic-export@1440:screenshot', 'compare@1440:screenshot', 'ground-remembers@1440:screenshot', 'immersive@1440:screenshot',
  'index@1440:text', 'index@1440:controls', 'index@1440:screenshot', 'index@390:text', 'index@390:controls', 'index@390:screenshot', 'sandbox@1440:screenshot', 'viewshed@1440:text', 'viewshed@1440:screenshot', 'watch-together@1440:screenshot'];
const head = D.slice(0, 2), body = D.slice(2);
body.sort((a, b) => REPORT_ORDER.indexOf(`${a.where}:${a.kind}`) - REPORT_ORDER.indexOf(`${b.where}:${b.kind}`));
const defects = [...head, ...body].map((d, i) => ({ ...d, id: 'D' + String(i + 1).padStart(2, '0') }));
if (defects.length !== 53) throw new Error('expected 53 defects, built ' + defects.length);

// ---------------------------------------------------------------- waivers
const waivers = []; const W = (w) => { waivers.push({ date: DATE, approvedBy: PROPOSED, ...w }); return w.id; };
const idsOf = (kind, route) => defects.filter((d) => d.kind === kind && d.route === route).map((d) => d.id);

W({ id: 'W-file-InterpolationWorker', kind: 'file', target: 'assets/InterpolationWorker-ufiwa2-e.js', defects: idsOf('file', 'assets/InterpolationWorker-ufiwa2-e.js'), class: 'INTENTIONAL', approvalBasis: 'B: repo documentation (build mechanism, plan chapters 04/05, release notes); no owner decision needed, nothing user-visible',
  reason: 'Orphan build artefact deleted on purpose by the R0 mechanism: the 672-byte script (a main-thread-free lerp of lat/lng/bearing/strength between two ticks) is named by no file of the published build (not the entry bundle, not index.html, not sw.js), so the published app never started it. The map animation is the bundle\'s own requestAnimationFrame loop, which the candidate keeps (groups B and later change what it draws, not that it exists).',
  evidence: E.orphan,
  assertions: [
    { id: 'baseline-bytes', type: 'baseline-file-sha', file: 'assets/InterpolationWorker-ufiwa2-e.js', sha256: 'a44f17c2727fd84ee437c9f732884767a2fdf305c6c082731c6d96dc6b7c865b' },
    { id: 'never-referenced', type: 'unreferenced', file: 'assets/InterpolationWorker-ufiwa2-e.js', token: 'InterpolationWorker' },
    { id: 'hash-token', type: 'unreferenced', file: 'assets/InterpolationWorker-ufiwa2-e.js', token: 'ufiwa2' },
    { id: 'no-app-worker', type: 'no-same-origin-worker' },
    { id: 'absent', type: 'file-absent', file: 'assets/InterpolationWorker-ufiwa2-e.js' },
  ] });

W({ id: 'W-data-manifest', kind: 'data', target: 'manifest.json', defects: idsOf('data', 'manifest.json'), class: 'INTENTIONAL', approvalBasis: 'B: plan default WP-T0-14 / D-SHELL, listed as deviation row 8 with "Needs the owner: no"',
  reason: 'The published manifest says "orientation": "landscape". On an installed (standalone) PWA that locks the app to landscape on phones, which the phone shell (portrait, 390x844 and the other portrait widths of tests/t0/mobile-matrix.spec.mjs) is built for; WCAG 1.3.4 fails with it. Removing the key lets the installed app follow the device. Browser tabs were never affected. The same edit adds "id": "/", two maskable icons and keeps every other key; nothing else was removed.',
  evidence: E.manifest,
  assertions: [
    { id: 'manifest-shape', type: 'manifest' },
    { id: 'build-guard', type: 'contains', file: 'manifest.json', regex: '"id"\\s*:\\s*"/"' },
    { id: 'portrait-phone', type: 'overflow', route: '/', vp: [390, 844] },
  ] });

// shared layer
W({ id: 'W-shared-subpage-layer', kind: 'screenshot', target: '(shared nav and footer of every sub-page)', defects: [], class: 'INTENTIONAL', approvalBasis: 'B: documented in ops/release-notes/R1a.md:48 ("Visible behaviour changes to sign off") and T0-DEVIATIONS row 17; owner sign-off of that list is not recorded in docs/decisions',
  reason: 'Cause of the position shifts behind most screenshot defects: shared navigation bar with 44 px controls inside the same 55 px bar and a reserved 55 px mount, footer re-flowed into 44 px rows with contrast-corrected colours, no page-entrance fade, no infinite glow animation, zero-specificity button reset.',
  evidence: E.subpage,
  assertions: [
    { id: 'css-layer', type: 'contains', file: 'site-nav.css', text: 'Sub-page shared layer (pages-fixes)' },
    { id: 'css-mount', type: 'contains', file: 'site-nav.css', regex: '#gtbg-nav-mount\\s*\\{\\s*display:\\s*block;\\s*min-height:\\s*55px' },
    { id: 'css-footer-contrast', type: 'contains', file: 'site-nav.css', text: '#gtbg-footer a { color: #9aa3b8;' },
    { id: 'css-no-fade', type: 'not-contains', file: 'site-nav.css', text: 'gtbg-page-in 340ms' },
    { id: 'css-no-glow', type: 'not-contains', file: 'site-nav.css', text: 'animation: gtbg-pin-glow 3.4s' },
    { id: 'ledger', type: 'ledger', files: ['site-nav.css', 'site-nav.js'], allowIds: [...pageIds('site-nav.css'), ...pageIds('site-nav.js')], requireIds: ['PGF-nav-css', 'PGC-css-reserve-mounts', 'PGC-css-footer-contrast', 'R0M:site-nav.css body entrance animation removed'] },
  ] });

const textExp = {
  ar: { lostAllowed: ['re:^This needs a phone: its camera, GPS, and compass, all live'], gainedRequired: ['re:^Beta\\. Battlefield AR needs a phone with a camera, GPS and compass'] },
  dashboard: { lostAllowed: ['re:^\\(\\d+(\\.\\d+)?% casualties ⚠\\)$', 'U-III (Third Corps)', 'MOST COMPRESSED UNION', 're:^Nearly 4,200 casualties', "C-I-3 (Pickett's Division)", 'MOST COMPRESSED CONFEDERATE', 're:^Approximately 2,700 casualties', "U-XII and C-II-2 (Culp's Hill)", 'LONGEST SUSTAINED ACTION', 're:^Seven hours of continuous fighting', 'highest_single_regiment_rate', 'HIGHEST SINGLE REGIMENT RATE', 'undefined', 're:^⚠ Data note: '],
    gainedRequired: ['re:^These curves are modeled from each corps', 'Third Corps', 'MOST COMPRESSED FIGHT, UNION', 'MOST INTENSE HALF HOUR, CONFEDERATE', 'LONGEST SUSTAINED FIGHT', 're:^HIGHEST REGIMENTAL LOSS RATE|^A HEAVY CONFEDERATE REGIMENT LOSS'] },
  historian: { lostAllowed: ["re:^This runs entirely in your browser and answers only from this site's own published data"], gainedRequired: ["re:^Answers come only from this site's own records"] },
  viewshed: { lostAllowed: ['re:^⚠ This shows relative elevation, not a computed sightline'], gainedRequired: ['re:^⚠ Elevation only\\.'] },
};
const pageWaiver = (page) => {
  const vps = [...new Set(defects.filter((d) => d.page === page).map((d) => d.vp))];
  const file = page + '.html';
  const exp = textExp[page] || {};
  const ledger = { id: 'ledger', type: 'ledger', files: [file], allowIds: pageIds(file), requireIds: KEY_REQUIRE[page] || [] };
  const linked = ['embed', 'privacy', 'terms'].includes(page) ? null : { id: 'shared-layer-linked', type: 'contains', file, regex: '/site-nav\\.css\\?v=[0-9a-f]{8}' };
  const lines = vps.map((vp) => ({ id: `text-${vp}`, type: 'lines', route: '/' + page, vp: [vp, vp === 390 ? 844 : 900], lostAllowed: exp.lostAllowed || [], gainedRequired: exp.gainedRequired || [] }));
  const controls = { id: 'controls-1440', type: 'controls', route: '/' + page, vp: [1440, 900], ...CTRL_NONE };
  const overflow = { id: 'no-overflow-390', type: 'overflow', route: '/' + page, vp: [390, 844] };
  const budgets = vps.map((vp) => { const b = SHIFT(`${page}@${vp}`); return b && { id: `screenshot-budget-${vp}`, type: 'screens-budget', tag: `${page}@${vp}`, maxRatioPercent: b.maxRatioPercent, maxHeightDelta: b.maxHeightDelta, observed: { percent: b.observedPercent, heightDelta: b.observedHeightDelta } }; }).filter(Boolean);
  const browserChecks = [];
  if (page === 'dashboard') browserChecks.push({ id: 'dom', type: 'browser', check: 'dashboard-dom' });
  if (page === 'ar') browserChecks.push({ id: 'ar-stays-reachable', type: 'browser', check: 'ar-hidden' });
  if (page === 'historian') browserChecks.push({ id: 'claims', type: 'browser', check: 'historian' });
  if (page === 'viewshed') browserChecks.push({ id: 'viewshed-ranks-30', type: 'browser', check: 'viewshed' });
  const ev = [...E.subpage.slice(0, 2)];
  if (MAPP.has(page)) ev.push(...E.mapPages);
  if (FILL.has(page)) ev.push(...E.gtbgFill);
  if (page === 'ar') ev.push(...E.ar);
  if (page === 'dashboard') ev.push(...E.dashboard);
  if (page === 'historian') ev.push(...E.historian);
  if (page === 'viewshed') ev.push(...E.viewshed);
  return { evidence: ev, text: [ledger, ...lines, controls, ...browserChecks], screenshot: [ledger, linked, lines[0], controls, overflow, ...budgets, ...browserChecks].filter(Boolean) };
};
for (const page of SUB) {
  const pw = pageWaiver(page);
  const kinds = [...new Set(defects.filter((d) => d.page === page).map((d) => d.kind))];
  const cond = page === 'dashboard';
  for (const k of kinds) {
    const ds = defects.filter((d) => d.page === page && d.kind === k).map((d) => d.id);
    const extra = [];
    if (cond) extra.push({ id: 'source-data-consistent', type: 'data-dashboard-no-mismatch' });
    W({ id: `W-${k}-${page}`, kind: k, target: '/' + page, defects: ds, dependsOn: k === 'screenshot' ? ['W-shared-subpage-layer'] : [], class: cond ? 'CONDITIONAL' : 'INTENTIONAL',
      approvalBasis: cond ? 'A for the data fix (owner decision 2026-10-05 item 3, group DATA); B for the layout and copy' : page === 'historian' && k === 'text' ? 'B (copy rows of the docs-copy chapter; the "not an AI" wording itself is an owner decision, see COPY2 and tools/accept/copy_whitelist.json)' : 'B: documented in the release notes and the patch ledger',
      reason: `${PAGE_CAUSE[page]}.${cond ? ' VALID ONLY WHILE the casualty data no longer contradicts itself (assertion source-data-consistent): R1c alone fails it, the DATA group passes it.' : ''}`,
      evidence: pw.evidence, patches: pageIds(page + '.html'), assertions: [...pw[k === 'screenshot' ? 'screenshot' : 'text'], ...extra] });
  }
}

// ---------------------------------------------------------------- the index page (app)
const idxLedgerBundle = { id: 'bundle-ledger', type: 'ledger', files: ['js', 'help', 'book', 'css'], allowIds: bundleIds, requireIds: ['R0-intro-delete (perf-cwv-04)', 'bug:D1-hud-date', 'cp:b10', 'cp:b11', 'A-sound-remove-button (D-SOUND default)', 'mob:HF-1a AO gate desktop overlays', 'mob:HF-5a layout init', 'mob:HF-6a drop dead Monuments tile', 'mob:HF-6b NPS tour tile -> Virtual Walkthrough', 'mob:HF-6f historian tile + desktop view', 'mob:HF-6g append Extra Features groups to sheet'] };
const idxLedgerPage = { id: 'page-ledger', type: 'ledger', files: ['index.html'], allowIds: pageIds('index.html'), requireIds: ['R0M:module script -> boot-after-first-paint loader', 'SHELL-phone-button'] };
const TILES = ['Search', 'Filter', 'Order of Battle', 'Unit Roster', "Soldier's View", 'Follow Ancestor', 'Map Layers', 'Virtual Walkthrough', 'Legend', 'Bookmarks', 'Help', 'Mini Map', 'Ask the Historian', 'Desktop View'];
const OPENS = { Search: { input: true }, Filter: { text: 'Filters' }, 'Order of Battle': { text: 'Order of Battle' }, 'Unit Roster': { text: 'All Battle Units' }, "Soldier's View": { dialog: true }, 'Follow Ancestor': { dialog: true }, 'Map Layers': { text: 'Map Layers' }, 'Virtual Walkthrough': { dialog: true }, Legend: { text: 'Legend' }, Bookmarks: { dialog: true }, Help: { dialog: true }, 'Ask the Historian': { url: '/historian.html' }, 'Desktop View': { text: 'Phone view' } };
const LEG = '(Line of Battle|Holding position|Charging Line|Advancing to attack|Skirmish Line|Screening / scouting|Chaotic Retreat|Broken and falling back|Line of March|Moving toward action|Reserve|Held back awaiting orders|Bivouac|Encamped overnight|Deployed Artillery|Guns in battery, firing|Limbered Artillery|Guns moving|Mounted Cavalry|Cavalry in formation|Dismounted Cavalry|Cavalry fighting on foot)';
const idxAll = ['index@1440:text', 'index@1440:controls', 'index@1440:screenshot', 'index@390:text', 'index@390:controls', 'index@390:screenshot'];
const idxIds = (k, vp) => defects.filter((d) => d.page === 'index' && d.kind === k && d.vp === vp).map((d) => d.id);
const chooserLines = ['Choose Your Experience', 'SELECT THE FORMAT THAT BEST FITS YOUR DEVICE', '🖥', 'Desktop', 're:^Full-featured experience with side panels', 're:^Select Desktop', '📱', 'Mobile', 're:^Touch-optimized layout', 're:^Select Mobile', 'You can switch at any time from the settings menu'];
const HARNESS = 'HARNESS DEFECT behind most of this row: tools/accept/checks/c3_regression.mjs calls lib.chooseLayout, which gives up after 1.5 s because the published app only shows its "Choose Your Experience" screen after the ~3.5 s intro fast-forward; the baseline was therefore captured AT the chooser. The assertions below compare the real published app (chooser clicked through, tick 1) with the candidate.';
W({ id: 'W-text-index-1440', kind: 'text', target: '/', defects: [...idxIds('text', 1440), ...idxIds('text', 390)], dependsOn: [], class: 'INTENTIONAL', approvalBasis: 'B: plan defaults D-ENTRY and D-SOUND, the +2 date fix that the T0 plan always allowed, copy rows CP; the O-T0-3 intro deletion and the O-T0-9 device bound still need the owner\'s yes',
  reason: `${HARNESS} Real differences at 1440: "Download Website Tutorial PDF" is now "User Guide (PDF)" (same href); tick-1 HUD reads July 1, 1863 (published: July 3, the +2 bug); tick 1 draws 70 units (published: 72 intro-primed ghosts standing at later positions, O-T0-3); "1x (real time)" is "1x (base speed)"; the sound button is gone (D-SOUND). The layout chooser is deleted: the layout is chosen by media query and a Phone view control returns from the desktop layout.`,
  evidence: [...E.index, ...E.indexCopy, ...E.sound, ...E.date],
  assertions: [
    idxLedgerPage, idxLedgerBundle,
    { id: 'no-chooser-and-layout-override', type: 'browser', check: 'no-chooser' },
    { id: 'desktop-replacements', type: 'browser', check: 'index-desktop' },
    { id: 'lines-1440', type: 'lines', route: '/', vp: [1440, 900], lostAllowed: ['Download Website Tutorial PDF', '72 units · tick 1', 'July 3, 1863', '1x (real time)', '🔇', ...chooserLines], gainedRequired: ['User Guide (PDF)', 're:^\\d+ units · ', 'July 1, 1863', '1x (base speed)'] },
    { id: 'lines-390', type: 'lines', route: '/', vp: [390, 844], lostAllowed: ['Extra Features', 'Disposition', 'Sides', 'Size', `re:^${LEG}$`, '1 units · tick 1', 'July 3, 1863', '1x (real time)', '🎖 NPS Auto Tour', '🔇', ...chooserLines], gainedRequired: ['re:^⋯ Tools$'] },
  ] });
W({ id: 'W-controls-index-1440', kind: 'controls', target: '/', defects: [...idxIds('controls', 1440), ...idxIds('controls', 390)], dependsOn: [], class: 'INTENTIONAL', approvalBasis: 'B (plan defaults, release notes R0/R1a/R1b; AX group names the slider)',
  reason: `${HARNESS} Real differences at 1440: the guide link is renamed, the timeline slider (published name "0") is now "Battle time", the dead-since-D-SOUND sound button is removed. At 390 the desktop overlays that leaked into the published phone layout (Extra Features pill and menu, Ask the Historian pin, the desktop legend panel with Disposition/Sides/Size, NPS Auto Tour, sound) are gated out and re-homed: the Extra Features menu is the "More tools" part of the Tools sheet, Ask the Historian is a tile, the legend is the Legend tile, the glyph-only prev/next buttons are named "Step back/forward 5 minutes". The published "NPS Auto Tour" tile never worked on a phone (it called the layout setter with true), so the tile became the Virtual Walkthrough.`,
  evidence: [...E.phone, ...E.index, ...E.sound, ...E.timeline],
  assertions: [
    idxLedgerBundle,
    { id: 'controls-1440', type: 'controls', route: '/', vp: [1440, 900], lostAllowed: ['a|Download Website Tutorial PDF', 'input|0', 'button|🔇'], candidateHas: ['a|User Guide (PDF)', 'input|Battle time'] },
    { id: 'controls-390', type: 'controls', route: '/', vp: [390, 844], lostAllowed: ['button|Hide Extra Features menu', 'a|Ask the Historian', 'button|Extra Features ▾', 'button|◀', 'button|▶', 'button|Disposition', 'button|Sides', 'button|Size', 'button|✕', 'button|🎖 NPS Auto Tour', 'button|🔇'], candidateHas: ['re:^button\|.*Tools$', 're:^button\|(Step back 5 minutes|Previous step)$', 're:^button\|(Step forward 5 minutes|Next step)$'] },
    { id: 'phone-shell-rehoming', type: 'browser', check: 'phone-shell', tiles: TILES, opens: OPENS },
  ] });
for (const vp of [1440, 390]) {
  W({ id: `W-screenshot-index-${vp}`, kind: 'screenshot', target: '/', defects: idxIds('screenshot', vp), dependsOn: [], class: 'INTENTIONAL', approvalBasis: 'B as W-text-index-1440 and W-controls-index-1440',
    reason: `${HARNESS} The pixel diff compares the published chooser screen with the candidate map, so the ratio says nothing about the app. Against the real published app the visible differences are: no intro-primed ghost units at tick 1 (O-T0-3), HUD date July 1, the guide link, no sound button${vp === 390 ? ', and the phone shell instead of the leaked desktop overlays' : ''}.`,
    evidence: [...E.index, ...(vp === 390 ? E.phone : [])],
    assertions: [idxLedgerPage, { id: 'no-chooser-and-layout-override', type: 'browser', check: 'no-chooser' }, { id: 'desktop-replacements', type: 'browser', check: 'index-desktop' }, ...(vp === 390 ? [{ id: 'phone-shell-rehoming', type: 'browser', check: 'phone-shell', tiles: TILES, opens: OPENS }] : [])] });
}

// ---------------------------------------------------------------- not in the 53: data files the DATA group will change (predicted for the final candidate, see REGRESSION-TRIAGE.md section 5)
W({ id: 'W-data-DATA-group', kind: 'data', target: 'data/**', defects: [], dependsOn: [], class: 'CONDITIONAL', approvalBasis: 'A: owner decision 2026-10-05 item 3 (wrong displayed data must be fixed: verified, labelled as an estimate, or removed)',
  reason: 'NOT one of the 53 defects of the R1c dry run (R1c edits no /data file). Check 3 flags a data file when a key disappears or an array shrinks. The DATA group does both on purpose (about 33 files: unsupported commander fates and position notes removed, contradictory or pre-arrival duplicate position rows removed, the raw `highest_single_regiment_rate` note replaced); each of its 2,364 data patches is listed with class, source and what was before in docs/data-audit/fixes.json. This waiver is valid for a data file only while a patch of a group with a recorded decision accounts for it.',
  evidence: [{ doc: 'docs/decisions/OWNER-DECISIONS-2026-10-05.md', line: 7, quote: 'Every displayed time, place, number and name is either verified against a cited source, labelled as an estimate with its uncertainty, or removed.' }, { doc: 'tools/t0/DATA-README.md', quote: 'About 2,470 small, exact edits. Each one says what it finds ..., what it puts instead, which source it rests on, and what was wrong before ... What nothing supports is taken out.' }],
  assertions: [{ id: 'every-changed-data-file-is-accounted-for', type: 'data-changes-accounted', allowAdded: ['data/moments.json'], addedEvidence: 'ops/release-notes/R1c.md:21 and :28 (group DL adds data/moments.json v0; it is a new file, not a change of a published one)' }] });

const out = {
  _comment: 'PROPOSED waivers for check 3 (regression against the published build), produced by the regression triage of 2026-10-20 (docs/accept/triage/REGRESSION-TRIAGE.md). NOT applied: tools/accept/regression_waivers.json is unchanged. Every entry names the defect ids it covers, the decision or documentation it rests on (evidence), and automated assertions (docs/accept/triage/assert_waivers.mjs) that prove the intentional replacement exists in the candidate and that nothing else changed on that surface; a waiver is valid only while all of them pass (and the waivers it dependsOn). `waivers` (33) cover the 53 defects; `supportingChecks` holds the shared sub-page layer that the screenshot waivers depend on; `predictedForFinalBuild` holds the data waiver for the DATA group, which has no defect in the R1c dry run but will have about 33 in the final one. Fields kind/target/reason/approvedBy/date keep the format of regression_waivers.json. approvedBy is deliberately NOT a person: the integrator records who accepted it.',
  schema: 'regression_waivers.proposed/1',
  candidate: { build: 'R1c 2531699e', zip: 'deliver/gettysburg-R1c-2531699e-PRODUCTION.zip', sha256: pass.candidate.sha256, note: 'the CONDITIONAL entry fails on this zip by design; re-run assert_waivers.mjs on the final zip with --anchors <its release/<train>/anchors.json>' },
  allowGroups: {
    CLOCK: 'docs/decisions/OWNER-DECISIONS-2026-10-05.md:6 (correct the clock now)',
    DATA: 'docs/decisions/OWNER-DECISIONS-2026-10-05.md:7 (wrong displayed data must be fixed); docs/data-audit/AUDIT.md',
    MON: 'docs/decisions/OWNER-DECISIONS-2026-10-04.md:5 and OWNER-DECISIONS-2026-10-05.md:8 (restore the Monuments feature)',
    ANIM: 'docs/decisions/OWNER-DECISIONS-2026-10-05.md:9 (smooth professional unit movement)',
    POLISH: 'tools/t0/POLISH-README.md (fixes of the independent reviewer\'s defects on R1c); CLAUDE.md:32 (design polish is part of the acceptance)',
    'PG-polish': 'tools/t0/POLISH-README.md; CLAUDE.md:32',
    COPY2: 'CLAUDE.md:32 (copy audit: nothing about AI or how the site was built in any shipped file)',
    PERF2: 'tools/t0/patches-next/PERF2.json (candidate, not registered: Unit Roster slices, Monuments precompile; the acceptance thresholds, CLAUDE.md:32 "performance all green")',
    'PG-perf2': 'tools/t0/patches-next/PG-perf2.json (candidate, not registered: shader precompile on compare, ground-remembers, immersive, viewshed; no style diff on compare)',
    IMG: 'docs/decisions/OWNER-DECISIONS-2026-10-19.md:4 (only actual images of Gettysburg)',
    BASE1863: 'docs/decisions/OWNER-DECISIONS-2026-10-19.md:3 (1863 reconstruction as the main-map background)',
    R0M: 'tools/t0/README.md:57 (the R0 mechanism rows)',
  },
  waivers: waivers.filter((w) => w.defects.length),
  supportingChecks: waivers.filter((w) => w.id === 'W-shared-subpage-layer'),
  predictedForFinalBuild: waivers.filter((w) => w.id === 'W-data-DATA-group'),
};
fs.writeFileSync(path.join(HERE, 'regression_waivers.proposed.json'), JSON.stringify(out, null, 2) + '\n');
const covered = new Set(waivers.flatMap((w) => w.defects)); const missing = defects.filter((d) => !covered.has(d.id));
if (missing.length) throw new Error('defects without a waiver: ' + missing.map((d) => d.id).join(','));
const table = defects.map((d) => ({ id: d.id, code: d.code, where: d.where, kind: d.kind, route: d.route, class: d.cls, basis: d.basis, waiver: waivers.filter((w) => w.defects.includes(d.id)).map((w) => w.id), budget: d.kind === 'screenshot' && d.page !== 'index' ? SHIFT(d.where) : null }));
fs.writeFileSync(path.join(HERE, 'triage-table.json'), JSON.stringify({ candidate: out.candidate, defects: table }, null, 2) + '\n');
console.log(`${defects.length} defects, ${waivers.length} waivers, ${waivers.reduce((n, w) => n + w.assertions.length, 0)} assertions`);

// ---------------------------------------------------------------- markdown rows for REGRESSION-TRIAGE.md (tmp/triage/defect-table.md; the narrative is written by hand)
const TEXT_CAUSE = {
  ar: 'the long caveat paragraph is replaced by a shorter "Beta." notice (same facts: needs a phone, camera/GPS/compass, nothing uploaded; drops "which we haven\'t been able to do from here" and adds that compass accuracy varies and the page is not in the menu)',
  dashboard: 'the warning glyphs ("52.3% casualties ⚠", "5.1% casualties ⚠") and the "Data note" footnote are gone; stat cards show titles instead of the raw key `highest_single_regiment_rate` and `undefined`; "U-III (Third Corps)" -> "Third Corps", "C-I-3 (Pickett\'s Division)" -> "Pickett\'s Division", " -- " -> an em dash',
  historian: 'the how-it-works sentence now says "Answers come only from this site\'s own records (466 regiments, 24 stories, 137 events, 30 places). This is a search of those records, not an AI." (counts computed from the data; the false claim that every answer links to a data row is gone; chronology answers carry a source line)',
  viewshed: 'the build-narration caveat ("Earlier drafts of this tool ...") is replaced by "Elevation only. This page ranks the height of 30 places on the field. It is not a line-of-sight map ..."',
};
const rows = defects.map((d) => {
  const w = waivers.filter((x) => x.defects.includes(d.id)).map((x) => x.id).join(', ');
  let cause, dec;
  if (d.kind === 'file') { cause = 'orphan script never referenced by the published app'; dec = 'trains.json:11; README:57; plan 05:34, 04:51; R1c.md:19'; }
  else if (d.kind === 'data') { cause = '`orientation: landscape` removed (installed phone app no longer locked to landscape); `id`, maskable icons added'; dec = 'T0-DEVIATIONS row 8 (line 16); register 192/237; audit 16:57; WCAG 1.3.4 (07:264)'; }
  else if (d.page === 'index' && d.kind === 'text') { cause = d.vp === 1440 ? 'HARNESS: baseline captured at the chooser. Real: guide label, July 1 date (was July 3), 70 units (was 72 ghosts), "1x (base speed)", no sound button, chooser deleted' : 'HARNESS: baseline captured at the chooser. Real: phone shell instead of leaked desktop overlays (Extra Features pill, desktop legend panel, HUD, NPS Auto Tour, sound), no chooser'; dec = 'R0.md:48 + O-T0-3; register 257 (D-ENTRY); T0-DEVIATIONS 22/24; R1b.md:27,46; CP cp:b10/b11; D-SOUND; B bug:D1-hud-date'; }
  else if (d.page === 'index' && d.kind === 'controls') { cause = d.vp === 1440 ? 'HARNESS: baseline at the chooser. Real: guide link renamed, slider "0" -> "Battle time", sound button removed' : 'HARNESS: baseline at the chooser. Real: Extra Features pill -> Tools sheet "More tools", Ask the Historian pin -> tile, legend panel -> Legend tile, prev/next -> named Step buttons, dead NPS tile -> Virtual Walkthrough, sound removed'; dec = 'plan 06:46, 16:103-106; C HF-1a/6a/6b/6f/6g; AX; D-SOUND'; }
  else if (d.page === 'index') { cause = 'HARNESS: the baseline shot is the chooser screen; real differences listed under the text and controls rows'; dec = 'as D' + defects.find((x) => x.page === 'index' && x.kind === 'text' && x.vp === d.vp).id.slice(1); }
  else if (d.kind === 'text') { cause = TEXT_CAUSE[d.page]; dec = { ar: 'plan 11:364; PGC-ar-notice; R1a.md:47', dashboard: 'plan 11:365, 08a:169-171; PGC-dash-*; owner 10-05:7 (DATA)', historian: 'PGC-hist-how/-src-note/-chron', viewshed: 'plan 11:363; register 310; PGC-viewshed-caveat' }[d.page]; }
  else { const s = screens[d.where]; const dh = s ? s.cand[1] - s.base[1] : 0; cause = `${PAGE_CAUSE[d.page]} (page ${s ? s.base.join('x') + ' -> ' + s.cand.join('x') : ''}, ${dh >= 0 ? '+' : ''}${dh} px; ${(s.diffRatio * 100).toFixed(2)} %)`; dec = 'shared layer (R1a.md:48, PGF-nav-css) + ' + pageIds(d.page + '.html').filter((i) => /^(PGF|PGC|DL|maps)/.test(i) && !/^PGC-v-|og-image|twitter-image/.test(i)).slice(0, 5).join(', ') + (pageIds(d.page + '.html').length > 8 ? ', ...' : ''); }
  const cls = d.cls === 'CONDITIONAL' ? '**REAL in R1c alone**; INTENTIONAL with DATA (A+B)' : `INTENTIONAL (${d.basis})`;
  return `| ${d.id} | ${d.code} \`${d.where}\` | ${cls} | ${cause} | ${dec} | ${w} |`;
});
fs.mkdirSync(path.join(REPO, 'tmp', 'triage'), { recursive: true });
fs.writeFileSync(path.join(REPO, 'tmp', 'triage', 'defect-table.md'), '| ID | Defect (pass-1, check 3) | Class | Cause: what changed for the visitor | Decision / patches | Waiver |\n|---|---|---|---|---|---|\n' + rows.join('\n') + '\n');
