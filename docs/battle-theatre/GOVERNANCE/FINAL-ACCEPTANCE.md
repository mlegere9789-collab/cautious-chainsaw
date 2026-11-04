# End-of-mission acceptance (owner order, 2026-10-19). Runs LAST, after all build work, before any zip or release is handed over.

Owner's words, kept as the checklist: "recheck everything 8 times freshly in a row for any errors, bugs, and anything that will prevent the performance metrics all being good (green). Everything must run crash free with reliable and lightning quick buttery smooth accurate reactions and for every user input. Must look like this website was produced by a big time apex of the design world design firm because everything looks so mindblowingly flawless and professional looking. This needs to give no DIY vibes. No mention of AI's use in building the site. Ensure the tutorial PDF is updated as well. Ensure nothing is broken from the current published site build."

## The 8 fresh passes
"Freshly" = each pass starts from a clean checkout of the candidate, a clean browser profile, no cached results, and the previous pass's findings are not consulted until the pass ends. A pass counts only if it finds zero defects; any defect fixed resets the count to 0. Eight CONSECUTIVE clean passes are required. Passes are logged in `docs/battle-theatre/GOVERNANCE/final-passes/pass-N.md` with commands, versions and raw output paths.

Each pass runs, in this order:
1. Build the candidate zip from source with the deterministic packer; compare hash to the previous pass (must be identical).
2. Static hygiene: HTML/CSS/JS parse, no unresolved globals, no console errors/warnings on load, no failed network requests, no mixed content, no broken links or missing images (every internal link and asset), headers (_headers), service worker install/update path.
3. Regression against the CURRENT PUBLISHED build (production deploy 6abd6d62...): every route, every page, every feature that worked on it still works; screenshot diffs of unchanged screens; data diffs of unchanged data. Nothing may be worse.
4. Input matrix on desktop and phone shells: every button, control, key, drag, wheel, pinch, tab/focus order, screen reader names, reduced-motion, dark/light, with response-latency measured per input (target: visible reaction within 100 ms, no long task over 50 ms during interaction).
5. Performance: Lighthouse/Web Vitals-style metrics (LCP, CLS, INP/TBT), frame-time during map animation at 1x and 4x, memory growth over a 10-minute soak, crash-free soak. All must be in the green band; any amber/red is a defect.
6. Accuracy: the site's own data checks and test suites (`tools/t0/run_suites.mjs`, `verify_release.mjs`), clock oracle, monuments checks; no claim of "zero errors".
7. Visual QA at 360, 390, 768, 1024, 1440, 1920 widths: alignment, spacing, type scale, contrast (WCAG AA), consistent components, no placeholder text, no clipped text, no layout shift, no default-browser styling leaks, polished empty/loading/error states.
8. Copy audit (see below).

## Copy audit rules (site as shipped, not internal repo docs)
- No mention of AI, Claude, Anthropic, "generated", "language model", "agent", "LLM", "automated by" as the way the site was built, in any shipped file: HTML, JS strings, JSON data, PDFs (including metadata: Author, Producer, Creator, Title), images' EXIF/XMP, source maps, comments, `_headers`, manifest, og tags, README or notes included in the zip, and the zip's comment/file names. Product features that are genuinely user-facing (for example the "Ask the Historian" page) may keep their own name and description but must not describe how the site was built.
- Owner-confirm markers and internal notes (for example `[OWNER TO CONFIRM]`) must not be visible in the shipped site.
- DEC-006 (owner, 2026-10-19): the PDF's "reviewed by automated subagents; not reviewed by a historian" label is dropped; the Battle Theatre is back in scope for the public site, with no mention of how it was built.

## Tutorial PDF
- Locate the tutorial PDF (it is part of the current site build; confirm path before editing), update it to match every changed control, screen and feature in the candidate, re-export, and check: page count and text match the shipped UI, screenshots current, fonts embedded, links work, metadata clean (no tool names), accessible tags, file size sane.

## Hard stop rules
- Nothing is handed over as "done" while any pass finds a defect.
- Failure of the 8-in-a-row requirement is reported with the defect list; it is never waived.
- I do not claim zero errors; the log states what was run and what was not (no real devices, no Safari/Firefox unless actually run).
