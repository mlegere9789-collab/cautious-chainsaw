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
