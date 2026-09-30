# Contributing to the data

How to add, change, verify and correct data for the Gettysburg map. Scope: WP-DATA-01/02/03/06/07/08/19/20 as built so far (chapter 13, `docs/plan/FINAL/13-data-quality-and-accuracy.md`). Everything here is a **candidate** process: nothing is deployed, and the served data has not been edited.

## 1. Ground rules

1. **`legacy/` is the byte-exact baseline of record** (Netlify deploy 6aa16d61, 2026-09-09). Never edit `legacy/dist/data/**` or the deployed bundle. `node tools/data/manifest.mjs verify` (the *legacy-roundtrip* check) fails if a byte changes.
2. **Nothing that changes displayed history ships from here.** Any change to a clock label, a position, a casualty figure or a commander is a *candidate* until the historian has decided it (D-TIME, D-HIST-REVIEW). Candidates live under `data-src/build/`.
3. **Never guess a side.** A unit's side comes from the OOB file it is in, never from the `U-`/`C-` prefix. The only automated side change is the wrong-prefix rule (state code contradicts the prefix *and* the opposite-side twin exists).
4. **Every number needs an authority.** Figures are stored as facts with `auth`, `basis`, `edition`, `page`; a citation nobody has checked is `claimed_only` and is never presented as a source.
5. **Say what you could not verify.** A rule that cannot run is reported SKIPPED and **the ratchet fails on it** (unless the rule was already `deferred` when the baseline was written; `notApplicable()` is accepted only for a partial input such as an in-memory data set, never in the full CLI run); a heuristic is reported PARTIAL; a value read from scrambled OCR says so.

## 2. Where things live

| Path | What | Owner |
|---|---|---|
| `legacy/dist/data/**` | the 71 served JSON files, frozen | nobody edits |
| `data-src/legacy-manifest.tsv`, `data.lock.json`, `version.json`, `CHANGELOG.md` | frozen manifest, name-to-hash lock, `data_version`, changelog | `tools/data/manifest.mjs` |
| `data-src/schemas/*.schema.json` | JSON Schema 2020-12, closed (`additionalProperties:false`) | data |
| `data-src/authorities/authorities.json` | casualty and strength authorities with source, edition, page, verification status | data + historian |
| `data-src/policy/*.json` | source tiers, retired literals | data + counsel |
| `data-src/build/**` | generated candidates: `unit_registry.json`, `id_crosswalk.json`, `unit_aliases.json`, `id_collisions.json`, `unit_index.json`, `facts.json`, `data-manifest.json`, `data-quality-report.json`, `legacy-rights-audit.csv`, `candidates/*` (VI Corps brigades, battery compat shape, notable intensity, adjudication register, Confederate cavalry commanders, roll-ups) | generated, committed |
| `tools/data/validate.mjs`, `baseline.json`, `expiry.mjs` | the validator (68 rules), its ratchet baseline, and the explicit expiry gate | data |
| `tools/data/{unit_registry,facts,rights_audit,manifest}.mjs` | generators | data |
| `docs/data/baseline-report.md`, `rights-audit.md` | generated reports | generated, committed |
| `tests/data/*.test.mjs` | `node:test` suites | data |

`data-src/time/**`, `tools/t0/**`, `tests/t0/**`, `ops/**` and `release/**` belong to other workstreams: do not edit them.

## 3. Commands

```
node tools/data/validate.mjs                 # all rules, ratchet against tools/data/baseline.json (exit 1 on new / stale / not-run / rule-state; prints the expiry report, never fails on the date)
node tools/data/validate.mjs --list          # the catalogue: 60 core + 8 v2 rules, status implemented / partial / deferred
node tools/data/validate.mjs --rules R001,S007 -v   # an unknown id exits 2, and so does a selection that --no-site leaves empty: judging zero rules is not a pass
node tools/data/validate.mjs --now 2026-09-30       # pin the clock (only the expiry report reads it; every test pins it)
node tools/data/validate.mjs --retire-rule R001 --reason "..."   # only after the rule was deliberately removed from the code
node tools/data/validate.mjs --accept-rule-change R001 --reason "..."   # a rule was deliberately deferred / lowered from E to W (logged; its baseline entries go with it)
node tools/data/validate.mjs --renew R001 --until 2027-06-30 --reason "..."   # move one baseline expiry (logged; at most 366 days ahead of the clock)
node tools/data/expiry.mjs [--now D] [--warn-days 30]   # the expiry gate: warns 30 days before an `expires` date, exit 1 after it (run it in CI next to data:check)
node tools/data/validate.mjs --strict        # W rules fail too
node tools/data/validate.mjs --no-site       # quick local run: leaves out the rules flagged `site: true` (they read legacy/dist html and the bundle)
node tools/data/validate.mjs --enforce-expiry   # the same run, and an expired baseline entry fails too
node tools/data/validate.mjs --report docs/data/baseline-report.md
node tools/data/unit_registry.mjs [--check]  # registry, crosswalk, collisions, VI Corps candidates, unit index, battery shim
node tools/data/facts.mjs [--check]          # data-src/build/facts.json
node tools/data/rights_audit.mjs [--check]   # docs/data/rights-audit.md + legacy-rights-audit.csv
node tools/data/manifest.mjs verify|candidate|bump <x.y.z> "<why>"
node tools/data/emit_legacy.mjs --verify     # legacy-compat emitter: byte-exact copy + value-only patches from data-src/patches/*.json
node --test "tests/data/*.test.mjs"          # all data tests (npm run data:test)
npm run data:check                           # verify + validate + every --check (its verdict does not depend on the date)
```

## 4. The validator and the ratchet

* Rules are grouped S (schema/structure), R (references/identity), C (coverage), G (geometry/motion), N (numbers), T (time), X (text), P (provenance), F (facts), K (corpus), L (rights), D (release) and the v2 rules D002, M001, E001, U001, H001, G007, G008, P004. Each rule carries its severity (`E` fails CI, `W` warns), its status and the specialist baseline it is compared with (`--list`, and section 2 of `docs/data/baseline-report.md`).
* `tools/data/baseline.json` is **today's known violations** as fingerprints (`rule|key`). CI fails when a violation appears that is not in it (a *new* violation) and when an entry no longer occurs (*stale*: the fix must delete exactly its entry). Every entry carries an `expires` date: see *Baseline expiry* below. `W` rules only warn on new violations; stale entries fail for both.
* **A fix must shrink the baseline in the same change:** `node tools/data/validate.mjs --tighten` deletes stale entries and never adds any. If a change legitimately introduces violations, `--rebaseline <RULE> --reason "..."` records who/why in `baseline.history`; reviewers should treat that as an exception.
* Metric rules (P001, P003) ratchet a number instead of a set: getting worse fails, getting better must be tightened. P001 counts the records that carry a non-empty `source`/`sources`/`src`/`citation(s)` value or a `prov.src` list; no class is assumed to be at zero.
* **A rule that stops running is a failure, never a pass.** `run()` returns `null` when an input is missing (a guard file deleted, the deploy tree absent): the ratchet then fails an E rule (warns a W rule, `--strict` fails it) and always fails a rule that has baseline entries (`baselined_rule_not_run`: the entries cannot be told from fixed ones). Every input a rule names counts, not only the first one it reads: U001 needs `data-src/build/unit_index.json`, `unit_registry.json` **and** all five pages it checks, and returns `null` when any is missing (a rule never skips one half of itself and reports "ok"). `notApplicable(reason)` is for rules that do not apply to an input by design (an in-memory data set for D001/D002, `--no-site` for the site scans) and **fails in the full CLI run**; `status: 'deferred'` rules carry `blocked_by` (`defineRule` throws without it). Deleting `data-src/version.json` or `data.lock.json` therefore fails D001/D002.
* **A rule cannot be switched off or softened by editing one word.** `baseline.json` records `rule_state` (`{sev, status}` of every registered rule). A rule that was `implemented`/`partial` when the baseline was written and is `deferred` now fails (`rule_deferred`), and so does an E rule that became W (`severity_lowered`), even when the rule has no baseline entries. `--accept-rule-change ID --reason "..."` records a deliberate change in `baseline.history` (and drops the entries of a rule that no longer runs); `--tighten` only records rules that became stricter.
* **Judging zero rules is not a pass**, at every level: `runRules` throws on an empty or unknown selection, `validate.mjs` exits 2 on `--rules` ids that `--no-site` would leave out (`--rules F001 --no-site`), `--init-baseline` refuses `--rules` / `--no-site` (a baseline built from a subset would drop the other rules' entries), and the ratchet fails an empty result set. The list of site rules is derived from `site: true` on the rules, not typed in the CLI.
* **Rules must stay registered.** `tools/data/rules/index.mjs` imports every family strictly (no silently skipped module) and `baseline.json` records `catalogue`, the ids of every registered rule: dropping a rule from the code fails the ratchet (`unregistered_rule`) even if it had no entries. `--tighten` adds newly registered ids to the catalogue (and their `rule_state`) and never removes one; `--retire-rule <ID> --reason` is the deliberate way out. A baseline that lost `catalogue`, `rule_state`, `history`, `rules`, its `schema`/`generated`, or an entry's `expires`/`keys`/`count` fails as `baseline_malformed`: the guard is never relaxed by deleting the field it reads, and `--tighten` refuses to rebuild a missing `catalogue`/`rule_state` from the code (restore it from git, or re-create the baseline deliberately with `--init-baseline --force`, which logs to the history).
* **Baseline expiry (no silent time bomb).** Known violations are debt with a due date. The verdict of `validate.mjs` (and so `data:check`) does **not** depend on the date: it cannot start failing on a day nobody chose. Instead the date is explicit and visible:
  * every `validate.mjs` run prints the **expiry report** (next dates, entries inside the warning window, expired entries);
  * `node tools/data/expiry.mjs` is the gate for it. Run it in CI next to `npm run data:check` (it needs no other input than `baseline.json`): it **warns from 30 days before** an `expires` date (`::warning::` annotations under GitHub Actions), **exits 1 from the day after** it while violations are still baselined, and exits 1 for an entry without a usable date (an entry that never expires never comes due). `--now` pins the clock (the default is today's UTC date; it is read in one place, `isoDate()` in `lib/util.mjs`, and no rule reads it), `--warn-days` moves the window;
  * `validate.mjs --enforce-expiry` makes the ordinary run fail on an expired entry as well;
  * **renew** with `node tools/data/validate.mjs --renew RULE --until YYYY-MM-DD --reason "..."`: logged in `baseline.history`, never further than 366 days ahead of the clock (a baseline is not a permanent allowlist). Family defaults live in `FAMILY_EXPIRY` (`tools/data/rules/define.mjs`); a baseline cannot be created already expired (`--init-baseline` throws). Tests never read the wall clock: they pass `--now`/`NOW` and derive every date from the baseline.
* G003 is the qa-ci DV-07 check (chapter 13: the same check under two ids): infantry 150, artillery 250, cavalry 400 m per model-minute, segments over 300 m, `snap: true` exempt, on the linear file clock (5:00 am at the first tick of each day, so tick 225 to 226 spans the night: 320 min). It finds **six** candidates, the same count as qa-ci, but **not the same six**: five of the six keys qa-ci lists match (`U-8NY-CAV` 3-4, `U-I-2-2` 52-53, `C-I-3-3` 550-551, `U-20ME` 264-265, `C-7TN` 9-14). qa-ci's sixth, `U-8IL` 1-3, is not reproduced and G003 flags `C-I-3-1` 548-549 instead; both trace to a (unit, tick) key stated twice with different coordinates (`U-8IL` tick 3, `C-I-3-1` tick 548), which this suite resolves by last writer wins (one row per unit and tick, the order the app applies the files) while qa-ci's prototype walks every raw row. The baseline report (section 3) derives this comparison from the data on every run; do not write "reproduced" for a count.
* **Adding a rule:** put it in `tools/data/rules/<family>_rules.mjs` with `defineRule({id, sev, family, wp, status, title, spec_baseline, run})` (add `site: true` if it reads the deploy tree or the bundle; a test runs every rule with the site inputs switched off and fails on an unflagged rule that changes), keep total rules <= 70 (chapter 13), add a seeded fixture to `tests/data/seeded_defects.test.mjs` (the suite asserts every runnable rule has one), run `--tighten` so the catalogue and `rule_state` record it, and use `--rebaseline` (never a hand edit) for its entries. `--init-baseline --force` is for creating the very first baseline only (it logs to the history).
* **Adding a schema:** put it in `data-src/schemas/`, map the file in `tools/data/lib/schemas.mjs`, keep it closed. New-format (v2) schemas must not loosen the legacy ones.

## 5. Adding or changing data

Until the authoring repository is cut over (WP-DATA-01 step 2) there is no editable copy of the served data. The path is:

1. **State the change as a candidate**: a small JSON document under `data-src/build/candidates/` (or a value patch in a pull request description) that names each record id, `before`, `after`, a citation with locator (volume and page, not just a book), and the reviewer.
2. **Run the validator** against the *proposed* tree (copy `legacy/dist/data` to a scratch directory, apply the patch, `node tools/data/validate.mjs --data-dir <dir> --baseline tools/data/baseline.json`). The change must not add violations and should remove some.
3. **Value-only patches go through the emitter.** Put the edit in `data-src/patches/<id>.json` (`{id, description, citation, reviewer, edits:[{file, pointer, before, after}]}`); `node tools/data/emit_legacy.mjs --out <dir>` (default `tmp/data-emit`, git-ignored: never commit a second copy of the served data) copies the tree and changes ONLY the bytes of each patched value. It refuses a wrong `before`, a non-scalar value (that is a shape change), a string stored with an escaped encoding it cannot reproduce, and any write under `legacy/`: the guard resolves symlinks and junctions, ignores letter case and `..`, and replaces (never writes through) a link or hard link at a destination. Numbers are matched by value, so a coordinate stored as `39.814100` can be patched; the replacement is written as `JSON.stringify(after)`. With no patches its output equals `legacy-manifest.tsv` (checked by `--verify` and by the tests). Renames and shape changes are not patches: they go to `/data/v2`.
4. **Never hot-edit the deploy.** Legacy names keep their shape until cutover; value-only edits ship atomically through the compat emitter (chapter 13 WP-DATA-09), after R0, never as a rename.
5. **Record it**: bump `data_version`, add a CHANGELOG entry, append the version and content hash (`node tools/data/manifest.mjs bump 0.9.1 "why"`, then edit `data-src/CHANGELOG.md`). Rule D001 fails a changed tree without both, rule D002 fails a served name that comes back with other bytes.

### Versioning

`data_version` describes **bytes**: MAJOR = an id removed or renamed without an alias, a schema break, a change of unit or tick semantics; MINOR = new records, fields or sources; PATCH = corrections. Legacy is `0.9.0`; the first validated release is `1.0.0`. `dv` is the **clock calibration stamp** and belongs to chapter 04: links without `dv` mean 1; this tooling copies it into the manifest and never bumps it. Id merges are absorbed by aliases (they stay resolvable for two MAJOR versions), position corrections change `data_version` only.

CHANGELOG sections are Added / Changed / Corrected / Removed. Each **Corrected** entry carries `{record_id, before, after, citation, reviewer, date, dv_impact}`.

### Provenance fields (per record, target shape)

```
prov: { src: [{ id, loc }], basis: documented | reconstructed | derived | schematic | estimated,
        conf: A | B | C, rev: none | owner | historian, lic: PD-USGov | CC-BY-SA-4.0 | permission | facts-only }
```

* `src.id` must exist in the source registry (`sources.yaml`, WP-DATA-04) and carry a **tier**: A (public domain or notice-only), B (attribution / share-alike), C (link-out only: never fetched, stored or embedded), A-pending, legacy. A locator plus a reviewer makes a source `verified`; a citation string with neither is `claimed_only`.
* **Tier C never enters data.** Tier B needs a per-record licence and an attribution surface. Busey and Martin figures are facts-only with attribution, edition and page (Q-DATA-3); the open dataset excludes B&M-derived per-regiment numbers and positions until counsel clears them (D-LICENSE refinement, D-LEGAL step 3).
* `documented` is reserved for a position a source states for that place and time: it stays at **0** until a source is attached. Schematic staging (59 of 73 tick-1 rows) and rounded coordinates (379 rows under 4 decimals) are `schematic`.
* Every legacy row that already came from a Tier B/C source is listed in `docs/data/rights-audit.md` with a proposed action (rule L001 lists them).

### Published text

Strings a page can show or index are *published*; `flag`, `flag_notes`, `data_correction`, `chunk`, `supplements_file(s)` are *authoring* and must not ship. Published text: em dash (U+2014) not ` -- `, no internal ids (`U-20ME`, `US-001`), no `undefined/null/NaN/TODO`, ordinals correct, vignette paragraphs as `paragraphs[]`, `key_action` >= 40 characters or null. Quoted passages are never normalised.

### Counts and totals

Never type a count. Counts come from `data-src/build/facts.json` (`{{facts.units.total}}` and friends); the retired literals (`467`, `445+`, `51,000`, `467 regiments and batteries`, `28,000` as a Confederate total) are listed in `data-src/policy/retired_literals.json` and rule F001 counts them. Every printed count should carry a `title`/`aria-label` naming its basis (`facts.units.basis`).

A derived number counts what it names and nothing else: `facts.placements.ticks_with_rows` / `ticks_without_rows` count only the ticks of the tick model the chronology files declare (a row at tick 9999 fills none of them; such rows are counted in `rows_outside_tick_model`, and every distinct row tick in `distinct_row_ticks`). The "measured" column of the baseline report is computed from the data: a test parses `tools/data/lib/measure.mjs` and fails on a typed number inside a measured expression (only 0, 1 and the percent scale 100 are allowed; thresholds and probe ticks are named constants). The "expected" column is the only place a chapter number is typed.

## 6. Units, ids and the crosswalk

* `unit_registry.json` lists the **569 distinct units** (465 regiments + 104 batteries; `U-14BK` is an alias stub, the horse battery `C-McClanahan-ART` filed among the regiments is counted as a battery) with side, chain, commanders, own keyframes, rights tag and `needs_historian`.
* `id_crosswalk.json` maps each of the **95 placed ids that have no OOB record** to a proposal with a rule, evidence and confidence. **Confidence is per placement row** (`row_confidence[]`, `rows_by_confidence`): each row is judged on its own note, evidence in a sibling row does not vouch for it, and the id's `confidence` is its weakest row (`combined_notes_confidence` keeps the verdict on the concatenated notes). Only an id whose every row is `high` is auto (`unit_aliases.json` `proposed_auto`); every other id is `needs_historian`. Hard rules, checked in code: never map a regiment-shaped id to a brigade; never change a side except through the wrong-prefix rule; ambiguous matches stay `none` with the candidates listed.
* `id_collisions.json` lists ids that exist but are used for a second formation. Re-key the **row**, never the OOB record; rows whose targets are each other's sources at one tick form an `atomic_group` and must be applied as one permutation with a dry-run diff.
* `candidates/vi_corps_brigades.json` holds the 8 missing VI Corps brigades, paired to the Official Records by regiment overlap.
* Aliases (`U-14BK` -> "14th Brooklyn") are search synonyms, not rows (Q-DATA-8, owner decision pending).

## 7. Corrections workflow (target, WP-DATA-22)

Intake: the Report-a-problem form prefilled with page, unit or moment id, `data_version` and `dv` (no accounts, 90-day retention). Triage labels: factual, source, rendering, rights/takedown, sensitive. SLA: acknowledge within 3 days, fix within 30 (Historian passages 14), rights/takedown acted on within 24 hours. The reviewer writes the decision as a `decisions.jsonl` row (states `open -> proposed -> reviewed -> confirmed -> signed`); contested facts show a **range plus sources** and are logged "disputed", not "corrected". A fix is a pull request against the data with a CHANGELOG `Corrected` entry that cites a source (rule D001) and per-record `updated`/`rev`. None of this is built yet: today `mailto:` is the only channel.

## 8. Known limits of this tooling (read before trusting a number)

* R007, R011, C001, C003, G002, G003, G008, N005, N007, T001-T004, X004, X005, R008, K001 and P001-P003 are **PARTIAL**: they measure the legacy shape with interim definitions stated in their `note` (see `--list` and `docs/data/baseline-report.md` section 4).
* C005, G001, N008, E001, H001 and P004 are **SKIPPED** (`deferred`) because their inputs do not exist yet (track presence fields, land mask, casualty timeline, DEM samples, decisions log, source registry); they do not fail the ratchet while `rule_state` records them as deferred, and would the day they gain baseline entries without running. Deferring any other rule is a logged decision (`--accept-rule-change`), not an edit.
* The rights audit gives every row one of the four WP-DATA-04 actions (`replace | credit | keep facts-only | remove`), the reasoning sits in `plan` / `action_detail`, and a data file with no decided disposition makes the generator throw. It covers the six bundle datasets the plan names (monuments, story markers, tour stops, tutorial, timeline markers, roads) plus the narrated tour and three GeoJSON overlays. Its actions are proposals for the owner and counsel.
* Clock rules use the files' own linear formula; the 33-anchor proposal in `docs/plan/data/time-facts-anchors.csv` is read only for an informational count and is unsigned.
* The authority table marks each value `verified_ocr`, `verified_ocr_scrambled`, `secondary_unverified` or `chapter_verified_not_rechecked`; the Busey and Martin book was **not** opened.
* Nothing here has been run in a browser; consumers (the bundle, static pages) were only scanned as text.
