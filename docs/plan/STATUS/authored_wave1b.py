"""Authored backlog entries, second half of wave 1 (data, time, historian, rebuild foundation, remaining candidates)."""
from authored_wave1a import cand_files

WAVE1B = {}


def A(i, **kw):
    kw.setdefault('wave', 1)
    WAVE1B[i] = kw


A('audit-h5', area='bundle', route='candidate-group', size='S',
  value='A visible defect on the main map: the Follow Ancestor list sorts designations as text ("102nd" before "10th").',
  files=cand_files('audit-h5'), touches=['assets/index-<release id>.js (target js, one anchor)'],
  reads=['release/R1g/dist/assets/index-52cec836.js (component Zk, the sort of Xe)', 'docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md row B11 (OD-13)', 'docs/plan/FINAL/16-audit-corrections-and-new-findings.md (AUDIT-H5)'],
  acceptance=(
      'Group R1H-audit-h5 (not named PG-*: it patches the bundle, target js) with ONE patch whose find is `Xe.sort((xt,It)=>xt.name.localeCompare(It.name))`, expect 1 (asserted once on the R1g bundle: the anchor count is 1 today), replacing the comparator by a numeric-aware one (`localeCompare(It.name,void 0,{numeric:!0})`) '
      'that also ranks equal designations deterministically by unit_id. Test.mjs: red on the untouched bundle, green on the scratch tree: it reads the patched bundle text, extracts the new comparator and sorts a fixed list of 12 real designations from release/R1g/dist/data/oob/*.json that contain the counting pairs ("10th", "102nd", "11th", "1st", "2nd", "20th", "26th") and asserts natural order and a stable result when run twice; '
      'a second assertion proves no other localeCompare site of the bundle changed (the bundle differs from the base by exactly the one replaced string). OD-13 rule (row B11): the spec is written first and the registered patch exists only because the anchor asserts once. '
      'HANDOFF.md names the group file, that it anchors on the finished R1g text, its place after group PERF6 in group_order, and that the Walkthrough guard (tests/t0/walkthrough-guard.spec.mjs) must stay green on the full build (not run here).'),
  short='Bundle group R1H-audit-h5: one asserted-once patch makes the Follow Ancestor list sort numerically ("10th" before "102nd"); test sorts 12 real designations (red on R1g, green with group) and proves no other bundle byte changed. Walkthrough guard run is for the full build.',
  owed='Journeys/walkthrough-guard on the full train (browser, lock).')

A('wp-time-06', area='data', route='candidate-group', size='S',
  value='The shipped data schema still states "430,000+" records and 600-700 units per tick; chronology still carries a typed tick formula.',
  files=cand_files('wp-time-06', ['tools/time/relabel-data.mjs (only to add --group-out)']), touches=['data/placement_schema.json', 'data/placements_*.json (chunk descriptions)', 'data/chronology_day1.json', 'data/chronology_day2.json', 'data/chronology_day3.json'],
  reads=['tools/time/relabel-data.mjs', 'tools/time/rules.mjs (TM-V3, TM-V4, TM-V13)', 'docs/plan/FINAL/04-time-model-and-historical-accuracy.md (WP-TIME-06)'],
  acceptance=(
      'tools/time/relabel-data.mjs gains `--group-out <file>` which writes a patch group (target data/...) computed against release/R1g/dist/data (not legacy), taken to candidates/r1h/wp-time-06/group.json; every anchor asserted once or its true count. Test.mjs, red on R1g and green on the scratch tree: '
      '(1) data/placement_schema.json no longer contains "430,000" nor "600-700", each day\'s real_time string equals the one the time module (src/lib/time) computes for that day\'s first and last tick, and the record_count description equals what the placement files hold; '
      '(2) the `tick_formula` metadata of the three chronology files is a pointer to time_anchors.json (the string names the file), and no chronology `time` value is changed by this group (the rows keep the strings the CLOCK group wrote; only metadata changes); '
      '(3) JSON still parses; the TM-V3, TM-V4 and TM-V13 checks of tools/time/rules.mjs run against the scratch data report no finding for the touched fields (run `node tools/time/validate.mjs` logic through its exported rules on the scratch tree, or the equivalent assertions in test.mjs). '
      'The existing `npm run time:check` and `node --test tests/time/*.test.mjs` stay green (638 of 638 on 2026-11-13). Nothing outside the listed metadata fields changes (a diff of the scratch tree against R1g lists only those files and keys).'),
  short='relabel-data.mjs --group-out writes a data patch group against R1g: placement_schema.json loses "430,000+" and "600-700" and gets the model\'s day spans; chronology tick_formula becomes a pointer; no chronology time changes; TM-V3/V4/V13 clean; tests/time stay 638/638.',
  owed='Visual check of the Historian page timeline (browser).')

A('wp-data-05b', area='data', route='candidate-group', size='S',
  value='Shipped data still carries authoring notes and one string naming a video channel; derived strengths carry no basis.',
  files=cand_files('wp-data-05b', ['data-src/policy/release_exclusions.json', 'tests/data/release_exclusions.test.mjs']), touches=['data/oob/*.json', 'data/chronology_day2.json', 'data/chronology_day3.json', 'data/density_*.json'],
  reads=['release/R1g/dist/data', 'data-src/policy/source_tiers.json', 'data-src/authorities', 'docs/plan/FINAL/13-data-quality-and-accuracy.md (WP-DATA-05, WP-DATA-09)'],
  acceptance=(
      'Group on data/*.json (regex patches with exact asserted counts) plus data-src/policy/release_exclusions.json and tests. Red on R1g, green on the scratch tree: (1) the authoring keys "flag", "flag_notes", "data_correction" and "supplements_file" occur 0 times in the patched data files (on R1g: 4, 60, 1 and 11 occurrences; the bundle and the pages read none of them: grep of release/R1g/dist html and js is empty); '
      '(2) no data string names a video channel or "YouTube" (R1g: 1, in oob/union_artillery.json, Hall\'s Battery); the sentence is dropped, never reworded into a claim; '
      '(3) every JSON file still parses and every value that is not an authoring key is unchanged (the test diffs parsed trees: only the removed keys differ); '
      '(4) a basis field "facts-only" is added only to strengths that data-src/authorities already records as Busey and Martin derived; no new attribution is invented, a field without that record gets nothing, and the list of touched fields is in HANDOFF.md; '
      '(5) data-src/policy/release_exclusions.json lists the exclusions of the first dataset release (positions, Busey and Martin derived numbers, the Historian corpus) and tests/data/release_exclusions.test.mjs fails when a listed field appears in the scratch tree (seeded red case included). `node --test tests/data/*.test.mjs` and `npm run data:check` stay green.'),
  short='Data group on R1g: authoring keys flag, flag_notes, data_correction, supplements_file (4/60/1/11 today) and the one video-channel string removed, all else equal in parsed form; facts-only basis only where data-src/authorities says so; exclusions file, seeded-leak test.',
  owed='Counsel and owner decisions on rights actions (WP-DATA-05a) stay owner-only; this item does not apply them.')

A('wp-data-23a', area='data', route='source-rebuild', size='S',
  value='No claim of "Reviewed" is checkable today: no decisions file, no rule H001, no coverage figure.',
  files=['data-src/review/decisions.jsonl', 'data-src/review/decisions.schema.json', 'data-src/review/README.md', 'tools/data/rules/v2_rules.mjs (H001: deferred -> implemented, small Edit)', 'tools/data/review_coverage.mjs', 'tests/data/review.test.mjs', 'candidates/r1h/wp-data-23a/STATUS.json', 'candidates/r1h/wp-data-23a/HANDOFF.md'],
  reads=['docs/editorial/sign-off-states.md', 'docs/editorial/reviewer-charter.md', 'tools/time/rules.mjs (TM-V18)', 'tools/data/rules/define.mjs', 'tools/data/rules/v2_rules.mjs (existing deferred H001 stub)'],
  acceptance=(
      'Red first: tests/data/review.test.mjs fails before the code exists. Done when: (1) data-src/review/decisions.jsonl exists (empty: no decision is invented) with decisions.schema.json (id, subject, value, basis, citation, reviewer, date, state in open|proposed|reviewed|confirmed|signed|contested|deferred|withdrawn, as in sign-off-states.md; the toolchain may write only open and proposed); '
      '(2) rule H001, which already exists in tools/data/rules/v2_rules.mjs as a deferred stub (status deferred, blocked_by decisions.jsonl), is implemented there by a small Edit (status implemented, a real run()) and fails on a seeded string "Reviewed by ..." / "accurate to the minute" in a candidate dataset or page text when no signed decision with that subject exists, passes when one exists, and a decision whose reviewer is empty never counts; the test has the seeded red case and the green case; '
      '(3) tools/data/review_coverage.mjs prints and writes data-src/review/coverage.json: per dataset the share of records whose rev is owner or historian (0 today for every dataset, stated, not rounded up) and exits non-zero if any record claims rev owner|historian without a signed decision; '
      '(4) the validator ratchet is not loosened: `node tools/data/validate.mjs`, `npm run data:check` and `node --test tests/data/*.test.mjs` are green and tools/data/baseline.json only gains the new rule\'s true count (0 if none). No reviewer is named; no file says anything was reviewed.'),
  short='Empty data-src/review/decisions.jsonl with schema; implement the deferred rule H001 (no "Reviewed"/"accurate to the minute" without a signed decision; seeded red, green with a row); coverage report 0% stated; baseline not loosened; data:check and tests/data green.',
  owed='A named reviewer and the reviewed-coverage KPI going live are owner steps (charter).')

A('wp-hist-36', area='historian', route='source-rebuild', size='S',
  value='Nothing re-checks the Historian corpus or its source links after the build; a silent change would go unseen.',
  files=['tools/historian/ops/corpus-integrity.mjs', 'tools/historian/ops/monthly-links.mjs', 'historian-src/ops/log/.gitkeep', 'tests/historian/ops.test.mjs', 'candidates/r1h/wp-hist-36/STATUS.json', 'candidates/r1h/wp-hist-36/HANDOFF.md'],
  reads=['tools/sources-qc/probe-links.mjs', 'historian-src/corpus/or27/manifest.json', 'docs/historian/sources.yaml', 'data-src/sources-v2/registry.json'],
  acceptance=(
      'Red first: tests/historian/ops.test.mjs fails before the scripts exist. Done when: (1) `node tools/historian/ops/corpus-integrity.mjs` hashes (a) every source of historian-src/corpus/or27/manifest.json against its cached raw file (the cache path the fetcher of tools/historian/ingest/fetch.mjs uses; those raw files are git-ignored and are NOT in this container today, so this leg reports each as "not present: cannot verify" and exits 3, never as ok) and '
      '(b) the three local library copies in tmp/library/or27 against tmp/library/or27/MANIFEST.json (present here); one line per leg and item, the process exit code is the worst leg (1 a mismatch, 3 something absent, 0 all verified) and `--only library` runs leg (b) alone (exit 0 here); a flipped byte in a scratch copy exits 1 naming the item (test); (2) `node tools/historian/ops/monthly-links.mjs --dry-run` lists the links it would probe (count equal to the registry rows with a url) and sends nothing; `--run` probes at most one request per second per host, never contacts the hosts recorded as blocked (babel.hathitrust.org, ehistory.osu.edu: printed as "blocked: not retried"), records a refused host as blocked, and appends one JSON line (date, counts, failures) to historian-src/ops/log/<YYYY-MM>.jsonl; the test runs it against a local HTTP server and proves the rate limit and the blocked-host rule; '
      '(3) no network is used by the test suite; one real `--run` is not required (and, if made, stays under 100 requests and is recorded in HANDOFF.md). Works under the default node (22.23.4) and node 24.'),
  short='tools/historian/ops: corpus-integrity (sha256 of manifest sources and 3 local OR27 copies; absent raw files exit 3, never ok; flipped byte exits 1) and monthly-links (dry-run list; --run max 1 req/s/host, blocked hosts never retried, dated log line); tests use a local server.',
  owed='Scheduling and alerts are WP-INFRA-08b; the monthly review itself is the owner\'s routine.')

A('wp-data-04a', area='data', route='source-rebuild', size='S',
  value='The rights audit describes legacy/dist, not the data that ships (R1g); counsel and owner must judge what visitors get.',
  files=['tools/data/rights_audit.mjs', 'data-src/build/shipped-rights-audit.csv', 'tests/data/rights_audit_shipped.test.mjs', 'candidates/r1h/wp-data-04a/rights-audit.shipped.md', 'candidates/r1h/wp-data-04a/STATUS.json', 'candidates/r1h/wp-data-04a/HANDOFF.md'],
  reads=['tools/data/rights_audit.mjs', 'docs/data/rights-audit.md', 'data-src/build/legacy-rights-audit.csv', 'release/R1g/dist/data'],
  acceptance=(
      'rights_audit.mjs gains `--data-dir <dir>`, `--csv <file>` and `--md <file>` (defaults unchanged, so `node tools/data/rights_audit.mjs --check` and `npm run data:check` still reproduce docs/data/rights-audit.md and data-src/build/legacy-rights-audit.csv byte for byte). Red first: tests/data/rights_audit_shipped.test.mjs fails before the option exists. '
      'Done when `node tools/data/rights_audit.mjs --data-dir release/R1g/dist/data --csv data-src/build/shipped-rights-audit.csv --md candidates/r1h/wp-data-04a/rights-audit.shipped.md` writes one row per file of release/R1g/dist/data and per bundle dataset of the R1g entry bundle (the row count and the file list are asserted against the tree), every row has an action from the closed set (keep facts-only, credit, replace, remove), '
      'the report states which rows differ from the legacy audit (files the DATA group changed) and lists them, no action is marked applied (owner and counsel decide: WP-DATA-05a), and the 18 legacy monument coordinates stay listed as L001 rows. The doc output goes to the candidate folder because docs/data is not in this workstream; HANDOFF.md says where the owner reads it.'),
  short='rights_audit.mjs --data-dir/--csv/--md: audit the data that R1g ships (row per data file and bundle dataset, closed action set, diff against the legacy audit listed, nothing applied); defaults unchanged so data:check still reproduces the old outputs byte for byte.',
  owed='Owner and counsel decide the actions (WP-DATA-05a).')

A('wp-dec-12', area='infra', route='candidate-group', size='S',
  value='No documented browser floor, no syntax gate: nothing stops a build from shipping syntax an older supported browser cannot parse.',
  files=cand_files('wp-dec-12', ['candidates/r1h/wp-dec-12/docs/BROWSERS.md', 'candidates/r1h/wp-dec-12/browserslist', 'candidates/r1h/wp-dec-12/tools/es-check.mjs', 'candidates/r1h/wp-dec-12/tools/webgl2-gate.mjs']), touches=['none (docs and gates only; nothing ships)'],
  reads=['docs/plan/FINAL/01-decision-register.md (D-BROWSERS)', 'release/R1g/dist/assets', 'node_modules/acorn'],
  acceptance=(
      'The folder holds docs/BROWSERS.md (support floor with the reasoning from D-BROWSERS, in-app browsers, WebGL2 requirement, what is unsupported and how it fails), browserslist (the same floor as queries), tools/es-check.mjs (uses the installed acorn to parse every .js of a dist with the ecmaVersion that the floor allows, exits 1 naming file and position on the first failure) and tools/webgl2-gate.mjs (a stub that reads the entry bundle and the pages and fails when a page requires WebGL2 without the documented fallback message). '
      'test.mjs: es-check over release/R1g/dist/assets exits 0 at the chosen ecmaVersion and exits 1 on a scratch copy with one seeded newer syntax token (red-first: the seeded case is the red case); the webgl2 stub passes on R1g and fails on a seeded page. '
      'Floor numbers are taken from the register text, never invented; where the register gives none, the file says "not decided: owner" and the check uses the bundle\'s own measured ecmaVersion. HANDOFF.md tells the release workstream where to move the files (docs/BROWSERS.md, browserslist at the repository root, the two scripts into tools/).'),
  short='Candidate docs/BROWSERS.md, browserslist, tools/es-check.mjs (acorn over every dist .js, seeded newer syntax = red) and a WebGL2 gate stub; floor numbers from the register only; passes on release/R1g/dist assets; nothing ships.',
  owed='Real-device and in-app browser matrix (owner and device cloud).')

A('wp-data-16', area='data', route='source-rebuild', size='M',
  value='The 16 tour stops, tutorial steps and 20 timeline markers live as literals in the bundle with wrong ticks; moving them into data is the prerequisite for the rebuild to read them.',
  files=['data-src/embedded/tour.json', 'data-src/embedded/tutorial.json', 'data-src/embedded/markers.json', 'data-src/schemas/embedded.schema.json', 'tools/data/embedded.mjs', 'tests/data/embedded.test.mjs', 'candidates/r1h/wp-data-16/STATUS.json', 'candidates/r1h/wp-data-16/HANDOFF.md'],
  reads=['tools/data/lib/bundle_extract.mjs', 'release/R1g/dist/assets/index-52cec836.js', 'release/R1g/dist/data/moments.json', 'tools/t0/MON-README.md', 'docs/plan/FINAL/13-data-quality-and-accuracy.md (WP-DATA-16)'],
  acceptance=(
      'Red first: tests/data/embedded.test.mjs fails before the files exist. `node tools/data/embedded.mjs` extracts from the entry bundle of release/R1g/dist (through tools/data/lib/bundle_extract.mjs) the tour stops (16), tutorial steps and timeline markers (and, only as a cross-check, the 20 story markers) and writes data-src/embedded/{tour,tutorial,markers}.json with the schema data-src/schemas/embedded.schema.json; `--check` reproduces them byte for byte. '
      'The test asserts: counts (16 tour stops; the tutorial and marker counts equal the bundle\'s, printed by the extractor), every file validates against the schema, every tick of a marker equals the tick of the moment it names in data/moments.json (ids and ticks come from moments.json: a marker with no moment is listed in an explicit `unmatched` array of the file, never silently given a tick), '
      'stops 3 and 5 are marked as having no Street View pano, and the "First shot" marker at tick 17 is carried as a conflict record (chronology t17 is the first Union artillery fire; the vignette V-001 sits at tick 12): both readings kept, none chosen (Law: carry conflicts). A lint rule in the same test: no literal tick number in the generated component data outside the ticks derived from moments.json. '
      'Nothing is written into the bundle or any shipped file (the bundle can read these only after the rebuild or an amendment); `npm run data:check` and tests/data stay green.'),
  short='tools/data/embedded.mjs extracts 16 tour stops, tutorial steps and timeline markers from the R1g bundle into data-src/embedded/*.json with a schema; marker ticks come from moments.json (unmatched listed, tick 17 "First shot" kept as a conflict); --check byte-exact; nothing shipped.',
  owed='Bundle read of these files waits for the rebuild or an owner-approved amendment.')

A('wp-data-15a', area='data', route='source-rebuild', size='M',
  value='512 monuments exist only inside the bundle with no sources; one dataset with separated provenance is the base for every monuments claim (the Monuments section itself is untouched).',
  files=['data-src/monuments/monuments.json', 'data-src/monuments/cleaning-list.json', 'tools/data/monuments_extract.mjs', 'tests/data/monuments_dataset.test.mjs', 'candidates/r1h/wp-data-15a/STATUS.json', 'candidates/r1h/wp-data-15a/HANDOFF.md'],
  reads=['tools/data/lib/bundle_extract.mjs', 'data-src/schemas/monuments_overlay.schema.json', 'data-src/build/legacy-rights-audit.csv', 'release/R1g/dist/assets/index-52cec836.js', 'docs/plan/FINAL/13-data-quality-and-accuracy.md (WP-DATA-15)'],
  acceptance=(
      'Red first: tests/data/monuments_dataset.test.mjs fails before the dataset exists. `node tools/data/monuments_extract.mjs` extracts the monuments array from the R1g entry bundle and writes data-src/monuments/monuments.json with {id, no, name, honors, loc, lat, lng, side, group, mn, story, id_src, coord_src, coord_basis (documented|corroborated|unverified), unit_ids, rev, prov}, `id_src` and `coord_src` separate, `rev` "none", and data-src/monuments/cleaning-list.json with each cleaning finding as data: '
      'the record-512 text artefact, the duplicate MN 96, the 51 blank mn, the monuments outside the map extent, identical coordinate pairs, and the "1,328 monuments" claim (cite or drop: carried as an open row). The test asserts: 512 records (the count printed by the extractor from the bundle), 512 unique `no` after the documented cleaning, every row has id_src or the explicit value "none", coord_basis is "unverified" for every row without a source (no basis is upgraded without a citation in the file), '
      'the M001 checks (the `monumentIssues` function behind rule M001 in tools/data/rules/v2_rules.mjs) applied to the new file report exactly the findings that cleaning-list.json lists as open (each one is a row there, none hidden, none repaired by invention: a blank mn stays blank and listed), while rule M001 on the bundle keeps its baselined 612 findings; the 18 legacy coordinates stay flagged as L001 rows; `--check` is byte-exact. The shipped data/monuments.json (9 rows) and the bundle array are untouched (the Monuments section and the Walkthrough are protected). `npm run data:check` and tests/data stay green.'),
  short='tools/data/monuments_extract.mjs writes data-src/monuments/monuments.json (512 rows, id_src and coord_src separate, coord_basis unverified unless cited, rev none) and a cleaning list; M001-style findings = open cleaning rows; L001 rows kept; bundle and shipped monuments untouched.',
  owed='OSM and NPS location validation (WP-DATA-15b) and rights decisions are separate items.')

A('wp-data-14a', area='data', route='source-rebuild', size='M',
  value='The 49 off-map approach rows and the stacked units break geometry rules; place coordinates disagree by up to 2.1 km between six lists.',
  files=['data-src/geo/map_extent.json', 'data-src/geo/places.json', 'tools/data/geo_build.mjs', 'tests/data/geo_build.test.mjs', 'candidates/r1h/wp-data-14a/STATUS.json', 'candidates/r1h/wp-data-14a/HANDOFF.md'],
  reads=['tools/data/rules/geometry_rules.mjs', 'data-src/schemas/terrain.schema.json', 'release/R1g/dist/data', 'release/R1g/dist/assets/index-52cec836.js', 'docs/plan/FINAL/13-data-quality-and-accuracy.md (WP-DATA-14)'],
  acceptance=(
      'Red first: tests/data/geo_build.test.mjs fails before the files exist. `node tools/data/geo_build.mjs` writes data-src/geo/map_extent.json (east edge about -77.15 as the plan states, with the rows outside the old box listed as off_map approach corridors by id: the extent file lists them, the shipped data is not rewritten) and data-src/geo/places.json {id, name, aliases, lat, lng, zoom, kind, src} merging the six place lists read from the R1g bundle and data files, '
      'with the spread per place (metres between the largest and smallest coordinate of the six sources) recorded; coordinates are never averaged into a new claim: the file keeps each source\'s value and marks `chosen: null` until the reviewer confirms (carry conflicts). The test asserts: rule S005 count on the extent (R1g: 106 rows outside the legacy box, 49 baselined) is explained row by row (off_map listed or reported as a defect), '
      'G004 (stacked units under 15 m, 35 found) is reported with the unit pairs in a `separation-proposal` array and nothing is moved in shipped data, places.json has an entry for every place named by the bundle\'s Soldier\'s Eye, tour and story-marker lists (counts printed), `--check` is byte-exact. `npm run data:check` and tests/data stay green; no rule is loosened.'),
  short='tools/data/geo_build.mjs writes data-src/geo/map_extent.json (east edge ~-77.15, off-map rows listed by id) and places.json merging the six place lists with per-place spread and chosen:null until a reviewer confirms; G004 pairs proposed, shipped data untouched; --check byte-exact.',
  owed='Reviewer confirmation of the 30 places and East Cavalry Field, DEM re-sample (3DEP unreachable here: owner-only).')

A('wp-data-08d', area='data', route='source-rebuild', size='M',
  value='The Ledger and Dashboard totals cannot be reconciled per minute: no per-tick casualty series exists, rule N008 is deferred.',
  files=['data-src/build/candidates/casualty_timeline.json', 'tools/data/casualty_timeline.mjs', 'tools/data/rules/numbers_rules.mjs (activate N008 by a small Edit)', 'tests/data/casualty_timeline.test.mjs', 'candidates/r1h/wp-data-08d/STATUS.json', 'candidates/r1h/wp-data-08d/HANDOFF.md'],
  reads=['release/R1g/dist/data/casualty_apportionment.json', 'src/lib/time', 'data-src/build/candidates/notable_intensity.json', 'tools/data/rules/numbers_rules.mjs', 'docs/plan/FINAL/13-data-quality-and-accuracy.md (WP-DATA-08)'],
  acceptance=(
      'Red first: tests/data/casualty_timeline.test.mjs fails before the file exists. `node tools/data/casualty_timeline.mjs` spreads each unit\'s casualties over its combat ticks by ONE declared rule (the rule text is in the file header: proportional to the unit\'s presence ticks inside its recorded engagement window from the corrected clock and the placement data; no unit casualty outside its window) '
      'and writes data-src/build/candidates/casualty_timeline.json labelled `series: "modelled"`, with a per-unit checksum. The test asserts: for every unit the sum of its per-tick values equals its declared total exactly, the grand total equals the sum of the declared totals, no negative or fractional value (largest-remainder allocation, deterministic), '
      'the series is non-decreasing when accumulated, a tick outside every window has 0, rule N008 ("sum of per-tick casualty deltas equals the declared total") moves from deferred to active in tools/data/rules/numbers_rules.mjs and passes on the file, and `--check` is byte-exact. Totals stay ranges or labelled values exactly as data-src/authorities holds them (no figure is picked where sources conflict: the timeline is produced per authority value that exists and says which). '
      '`npm run data:check` and tests/data stay green; the baseline only gains the true N008 count.'),
  short='tools/data/casualty_timeline.mjs spreads each unit\'s casualties over its combat ticks by one declared rule (largest remainder), labelled modelled; per-unit and grand totals equal the declared totals exactly; N008 activated and passing; --check byte-exact; no conflicting figure picked.',
  owed='Page rows that read the series (Ledger, Dashboard) are a later item.')

A('wp-time-05', area='time', route='source-rebuild', size='M',
  value='Permanent moment ids are irreversible once shipped; six hand-kept moment lists disagree today.',
  files=['data-src/time/moments.v1.json', 'data-src/time/tick-migrations.json', 'tools/time/build-moments.mjs', 'tests/time/moments-v1.test.mjs', 'candidates/r1h/wp-time-05/STATUS.json', 'candidates/r1h/wp-time-05/HANDOFF.md'],
  reads=['data-src/time/moment_refs.json', 'release/R1g/dist/data/moments.json', 'release/R1g/dist/data/chronology_day1.json', 'tools/time/rules.mjs (TM-V5, TM-V19, TM-V20)', 'docs/plan/FINAL/04-time-model-and-historical-accuracy.md (WP-TIME-05)'],
  acceptance=(
      'Red first: tests/time/moments-v1.test.mjs fails before the registry exists. `node tools/time/build-moments.mjs` builds data-src/time/moments.v1.json from the chronology rows, vignettes, successions and tour stops that data-src/time/moment_refs.json groups, with a permanent `id` per moment (never derived from a tick; the shipped v0 ids of data/moments.json keep their values), `tick`, `dv`, the source references, and writes data-src/time/tick-migrations.json mapping each v0 tick to its v1 moment. '
      'The test asserts: ids unique and permanent (a second build with a shuffled input order gives the same ids), every v0 moment id of release/R1g/dist/data/moments.json is present with the same id, each reference of moment_refs.json lands on exactly one moment or is listed as unplaced (none dropped silently); the groups whose files disagree on the tick (TM-V5 finds 10 today: first shot 12/17, Ewell 75/175, Hancock 550/554, ...) are each ONE registry moment with every file\'s tick carried and `conflict: true`, and no tick is chosen (carry conflicts: the owner or a reviewer picks); TM-V19 passes on the registry, TM-V20 no longer skips (tick-migrations.json exists and covers every moved moment, 0 moved), and TM-V5 evaluated on the registry reports exactly those 10 open conflicts, never fewer and never hidden (no rule is loosened); deleting any hand-kept source list in a scratch copy breaks the build (the seeded red case), and `--check` is byte-exact. `npm run time:check` and `node --test tests/time/*.test.mjs` stay green. Review-once note in HANDOFF.md: ids are irreversible, the owner confirms the id scheme before a train uses them.'),
  short='tools/time/build-moments.mjs builds data-src/time/moments.v1.json (permanent ids; v0 ids unchanged; every moment_refs reference placed or unplaced; the 10 tick conflicts carried, none chosen) and tick-migrations.json; TM-V19/V20 pass; shuffled input, same ids.',
  owed='Owner confirmation of the id scheme before any train consumes it.')

A('wp-time-18', area='time', route='source-rebuild', size='M',
  value='Per-minute intensity is the number every "how fierce" claim and Ledger curve should come from; today there is none.',
  files=['src/lib/time/intensity.js', 'src/lib/time/index.d.ts (add the types by small Edit)', 'tests/time/intensity.test.mjs', 'candidates/r1h/wp-time-18/STATUS.json', 'candidates/r1h/wp-time-18/HANDOFF.md'],
  reads=['src/lib/time/model.js', 'src/lib/time/index.js', 'data-src/build/candidates/notable_intensity.json', 'release/R1g/dist/data/casualty_apportionment.json', 'docs/plan/FINAL/04-time-model-and-historical-accuracy.md (WP-TIME-18)'],
  acceptance=(
      'Red first: tests/time/intensity.test.mjs fails before the module exists. src/lib/time/intensity.js exports a pure `intensity(window, series)` (casualties or engaged units per battle-minute over a time window, using the model\'s tick-to-minute mapping, so a tick that spans 5 minutes and one that spans 20 give per-minute rates, not per-tick counts) and `rate(unit|total, fromTick, toTick)`; no wall clock, no randomness; typed in index.d.ts. '
      'The test asserts the plan\'s accept rule on real data: intensity of Pickett\'s Charge divided by intensity of Culp\'s Hill (windows taken from data-src/time anchors and the casualty series available in data-src/build/candidates) is at least 10; the sum over adjacent windows equals the sum over the union (additivity); a zero-length window throws a named error; results are identical across two runs; '
      'the Ledger total and the Dashboard total computed through the module on the same data are equal. If the available casualty series cannot support a window the test says which and the item stays open (no number is invented). `node --test tests/time/*.test.mjs` and `npm run time:check` stay green (638 of 638 before this item); no existing test is edited except to add the new module to a listing.'),
  short='src/lib/time/intensity.js: pure per-battle-minute intensity/rate over a window, typed; test on real data: Pickett\'s Charge >= 10x Culp\'s Hill, additive over adjacent windows, zero-length throws, Ledger total = Dashboard total; tests/time stay green. No number invented.',
  owed='Page rows on Ledger and Dashboard use the module later.')

A('wp-arch-09', area='rebuild', route='source-rebuild', size='M',
  value='Foundation of the whole rebuild chain (WP-ARCH-10..33): until a workspace, layout and config module exist, nothing else of the rebuild can start.',
  files=['src/README.md', 'src/app/README.md', 'src/lib/README.md', 'src/package.json', 'src/config/mapbox.js', 'src/config/tokens.test.mjs', 'src/tsconfig.base.json', 'src/STACK.md', 'docs/battle-theatre/GOVERNANCE/horde/requests/main-site-wp-arch-09.md', 'candidates/r1h/wp-arch-09/STATUS.json', 'candidates/r1h/wp-arch-09/HANDOFF.md'],
  reads=['package.json', 'docs/plan/FINAL/03-source-rebuild-and-parity.md (WP-ARCH-09)', 'docs/decisions/DELEGATED-DECISIONS-MAIN-SITE.md rows A10, A11', 'src/lib/time'],
  acceptance=(
      'Layout: packages/<name> of the plan maps to src/lib/<name> (src/lib/time exists) and apps/web to src/app; tests of new areas sit beside the code (src/<area>/tests) because tests/ is shared; this mapping is recorded in src/STACK.md with the stack choices that the register fixes (React 18.3.1 exact per row A10, Mapbox GL behind a facade, strict TypeScript for new files, Node 24 for the toolchain with the container default 22.23.4 still able to run every test of this workstream) '
      'and each choice the register leaves open is written as "not decided: owner" with the conservative default and the way back. `src/config/mapbox.js` is the one config module of the map token: it reads PUBLIC_MAPBOX_TOKEN, throws a named error when it is unset in a production build, embeds no token literal, and is the only reader of that variable (the test greps src/ for /pk\\.eyJ/ and for other readers of the variable: both must be empty/absent), '
      'src/tsconfig.base.json is strict, and `node --test src/config/tokens.test.mjs` passes. A private src/package.json (workspaces ["lib/*", "app"]) is created; the root package.json is not in this workstream and stays untouched: the exact two-line change that wires the workspace is written as a request note (docs/battle-theatre/GOVERNANCE/horde/requests/main-site-wp-arch-09.md); no dependency is installed in this item. Red first: tokens.test.mjs fails before src/config/mapbox.js exists. `node --test tests/time/*.test.mjs` stays green (src/lib/time unchanged).'),
  short='Rebuild foundation under src/: layout mapping (packages->src/lib, apps/web->src/app, tests beside code), src/STACK.md with register choices and "not decided" rows, one Mapbox token config module with test, strict tsconfig base, src/package.json; root package.json by request note.',
  owed='Clean-install CI (`install --frozen-lockfile && build && test`) needs the owner-enabled CI; token rotation is an owner step.')

A('wp-arch-06', area='rebuild', route='source-rebuild', size='M',
  value='A golden frame set from the reference rule is the parity anchor for the rebuilt unit engine (WP-ARCH-14) and the renderer.',
  files=['src/spec/golden/frames.v1.json (or sharded files under src/spec/golden/)', 'src/spec/golden/build-goldens.mjs', 'src/spec/golden/goldens.test.mjs', 'candidates/r1h/wp-arch-06/STATUS.json', 'candidates/r1h/wp-arch-06/HANDOFF.md'],
  reads=['release/R1g/dist/data (placements, keyframes)', 'tools/t0/anim/src/engine/', 'tools/t0/anim/test/fingerprint.R1e.json', 'docs/plan/FINAL/03-source-rebuild-and-parity.md (WP-ARCH-06)'],
  acceptance=(
      'Red first: goldens.test.mjs fails before the goldens exist. `node src/spec/golden/build-goldens.mjs` computes, for each of the 675 ticks, the unit frames (id, lat, lng, bearing, strength, disposition) from the R1g data by the shipped carry-forward and interpolation rules as implemented in the ANIM engine sources (tools/t0/anim/src/engine) read-only, and writes the goldens with a content hash; `--check` is byte-exact. '
      'The test asserts: 675 ticks present; tick 1 has 71 units (the figure the plan and the carry-forward decision A05 state); a random walk over ticks (seeded, 200 steps) gives frames equal to a cold computation of the same tick (history-independence); the engine fingerprints of tools/t0/anim/test/fingerprint.R1e.json agree with the goldens on the ticks they cover (disagreements are listed, not hidden); '
      'a mutation of the carry-forward rule in a scratch copy flips exactly the expected tests (seeded red); the whole suite runs in under 30 s on this machine without a browser. If a plan figure (71 units) does not hold on the data, the test records the measured value and the item says so; no golden is edited to match a claim.'),
  short='src/spec/golden: goldens for 675 ticks from R1g data by the shipped rules (ANIM engine read-only), content-hashed, --check byte-exact; test: tick 1 has 71 units, seeded random walks equal cold computation, fingerprint cross-check, mutation flips the expected tests, under 30 s.',
  owed='Equality with rendered pixels is WP-ARCH-07/18 (browser).')

A('wp-content-01b', area='pages', route='candidate-group', size='S',
  value='The home page and the nav still describe the Historian as a "search-and-answer assistant"; one data row carries database wording; two gaps are phrased as facts about the past.',
  files=cand_files('wp-content-01b'), touches=['index.html', 'site-nav.js', 'data/oob/union_regiments_i_ii_corps.json', 'the two ABSENCE files named by the lint'],
  reads=['docs/content/STYLEGUIDE.md', 'tools/copy/copy_lint.mjs'],
  acceptance=(
      'Group, red on R1g and green with the group: `node tools/copy/copy_lint.mjs <scratch files> --no-baseline --rules AIPERSONA,ALIAS,ABSENCE` reports 0 on the touched files while R1g reports AIPERSONA 4 (historian.html 2, which belong to wp-hist-01b, plus index.html and site-nav.js: "search-and-answer assistant"), ALIAS 1 (the alias stub designation in data/oob/union_regiments_i_ii_corps.json) and ABSENCE 2. '
      'The new wording follows STYLEGUIDE ("Ask the Historian: a search of the site\'s records"); the alias row\'s designation is replaced by neutral wording that keeps `alias_for` intact (the search synonym U-14BK stays working: assert alias_for and the id are unchanged, row B15); the two ABSENCE strings are rephrased to say what is not recorded, not that something did not happen. '
      'No title, name or meta description of index.html changes (rows A01, A29), index.html strings outside the meta description only; historian.html is not touched (wp-hist-01b). JSON still parses and only the one designation field differs in parsed form.'),
  short='Group removing "search-and-answer assistant" (index.html, site-nav.js), the alias stub\'s database wording (alias_for kept) and two absence-as-fact strings; copy_lint AIPERSONA,ALIAS,ABSENCE = 0 on touched files (R1g: 4/1/2); historian.html left to wp-hist-01b; no title or meta change.',
  owed='Visual check; the Historian search of U-14BK in a browser.')

A('wp-time-08', area='data', route='candidate-group', size='S',
  value='Two quotations in the chronology (t525, t530) have no matched primary wording; Law 4 forbids shipping a quote that cannot be matched.',
  files=cand_files('wp-time-08', ['candidates/r1h/wp-time-08/evidence.json']), touches=['data/chronology_day3.json'],
  reads=['tmp/library/or27 (Official Records vol. 27 parts 1-3)', 'tmp/library/ws9 (99 public-domain texts)', 'tools/bt/or27_find.py', 'tools/t0/CLOCK-README.md', 'release/R1g/dist/data/chronology_day3.json'],
  acceptance=(
      'evidence.json holds, for each of the chronology rows t525 and t530: the current text, every search made (pattern, part or text, result count), and the outcome. Outcome "found": a source (OR Ser. I vol. 27 part, report id, printed page as `python -I tools/bt/or27_find.py` cites it, or the ws9 title and page) and a short verbatim quote that `python -I tools/bt/or27_find.py --verify "<quote>"` confirms (the test runs it and requires exit 0); the row then carries the quote with its source key. '
      'Outcome "not found": the lookup is recorded as FAILED with the searches, and the quotation marks are removed from the row (the sentence stays as a plain statement only if the same sentence is supported by a non-lead source, otherwise the claim is reworded to what the record supports, or marked as a visible gap). Group.json patches data/chronology_day3.json accordingly (anchors asserted once), test.mjs checks the patched rows, that no other row changes, that every remaining quotation mark of the two rows has a verified source in evidence.json, and the JSON parses. '
      'No quote is written that the matcher did not confirm; a quote found only on a blog, Wikipedia or from memory is not a source.'),
  short='Research + data patch: find the primary wording for the t525/t530 quotations in local OR27/ws9 (verbatim, confirmed by or27_find --verify) or record the lookup as failed and remove the quote marks; evidence.json lists every search; only those two rows change.',
  owed='A historian\'s confirmation of the wording remains owner-side.')

A('wp-pagec-12', area='pages', route='candidate-group', size='S',
  value='The hidden AR page asks for the camera before motion permission and leaves the camera and position watch running after a failure.',
  files=cand_files('wp-pagec-12'), touches=['ar.html'],
  reads=['release/R1g/dist/ar.html', 'docs/plan/FINAL/08b-subpages-C.md (WP-PAGEC-12)'],
  acceptance=(
      'Group on ar.html (noindex, hidden notice and start feedback kept; head tags untouched) with a node:vm test using fake navigator.mediaDevices, DeviceOrientationEvent.requestPermission and navigator.geolocation, red on R1g and green with the group: (1) motion permission is requested first and its call precedes getUserMedia and watchPosition in the call log; '
      '(2) after a denial of any of the three permissions no track is live (every MediaStreamTrack.stop called) and the position watch is cleared (clearWatch called with the id); (3) the Exit control stops the stream and clears the watch; (4) each failure code of geolocation and getUserMedia shows its own message (a distinct string per code, in a role="alert" element); '
      '(5) the page remains hidden: noindex, out of the nav list and the sitemap, notice present (assert the PGC-ar markers unchanged). Rows A03 and A53 apply: AR stays in scope, hidden until WP-PAGEC-12..14 pass.'),
  short='Group on ar.html with a node:vm test and fake media/orientation/geolocation: motion permission requested first; after any denial no live track and clearWatch called; Exit stops both; distinct role=alert message per error code; page stays noindex and hidden. Red on R1g.',
  owed='A real iPhone (iOS 17/18) and Android run is owner-side (on-site device test).')
