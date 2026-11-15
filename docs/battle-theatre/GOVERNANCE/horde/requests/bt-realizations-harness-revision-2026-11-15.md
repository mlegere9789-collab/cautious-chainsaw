# bt-realizations -> bt-gates, bt-gate-engine and the shard workstreams: what the realization harness gained on 2026-11-15 (resumed run)

Owner of the harness: bt-realizations (`tools/bt/realize`, README.md there). Written 2026-11-15. The harness id stays `bt-realize-1`: rules were added and none was loosened; the harness digest changes (`node tools/bt/realize/check.mjs --digests`), so a `RESULTS.json` computed before this note is stale by its own digest and a full run replaces it.

Nothing in this note blocks the gate runner: the format of a record, the fields of `RESULTS.json` and the functions named in `bt-realizations-gate-hooks-rows.md` are unchanged.

## 1. New assertion fields (all of them can only tighten a check, none loosens one)

| assertion | new fields | rule | decision |
|---|---|---|---|
| `sky` | `sun_alt`, `sun_az`, `moon_alt`, `moon_az`, `tol_deg` | an angle a row prints is matched to half a unit of the last digit the check's own `quote` prints it with (`altitude 37.9` to 0.05 degrees, `altitude 10` and `azimuth 125` to 0.5), never less than 0.05 (`tolerances.json sky`); an azimuth is compared the short way round; the number must be printed in the quote (`number_not_in_quote`); a record may tighten with `tol_deg`, never widen (`tolerance_wider_than_stated`) | DD-RZ-13 |
| `weather` | `wind_from_in` | a list of points of the 16-point compass the wind blows FROM (`["S", "SSW"]`); a point stands for 22.5 degrees, the arc closed at both ends; only a minute for which the environment layer RECORDS a direction counts (`wind.directionRecorded`: 1 to 3 July today; the picture draws the same default of 191.25 degrees at every other minute and the check says so); a list of all 16 points is `assert_vacuous` | DD-RZ-14 |
| `casualty` | `killed_approx`, `wounded_approx`, `missing_approx`, `events_approx` with `tol_pct`; `killed_max`, `wounded_max`, `missing_max`, `events_max` | a number of men a row prints is matched to the men the stage shows leaving the line (one event per man down) within 10 per cent (`tolerances.json units.casualties`), the number printed in the check's quote; a record may ask for a smaller share, never a larger; a row that says no man falls is a maximum of 0. A minimum of one man (`events_min: 1`) remains the floor of a minimum and says nothing about "about 800 casualties" | DD-RZ-16 |
| `not_queryable` | `words`, `capability` | a probe that never holds, for a `not_realized` record whose row says something no assertion can ask the product about (vegetation, sound, smoke and dust, civilians, a named man); it fails with `assertion_unavailable`; a realized record cannot carry one (`not_queryable_in_realized`) | DD-RZ-17 |

A scratch comparison of 2026-11-15 found that the 13 rows that print a sun or moon angle (T1-158, T1-195, T1-196, T1-220, T1-223, T1-224, T2-135, T2-188, T2-212, T2-246, T3-035, T3-081, T3-102) agree with the drawn sky to 0.43 degrees or less, so the sky rows of the timeline can be realized by a record; three real rows were run as scratch records with the new fields (T1-196 realized; T2-135 realized with the part "shining into Union faces" listed in `not_shown`; T1-195 realized in all four scenarios of its group, with the fog listed in `not_shown`) and are not in any shard file: they belong to the shard that owns the row.

## 2. A malformed record is a result, never a crash (DD-RZ-15)

* `runRecord` never throws: the static validation names a field of the wrong shape (`checks_missing`, `entities_bad`, `assert_bad`, `missing_missing`, `scenario_excludes_bad` ...), and an exception that gets past it is the problem `record_crash` with its message. The row is not realized; it is never a realization.
* `record_file_problems` now also lists a line that is no record (one JSON object with a string `id`), a record for a row the timeline does not have (a typo of an id: `T2-O75`), and a record the harness could not run. While it is not empty `q17.ok` and `q17.ok_strict` are false.
* **Exit code**: `check.mjs` exits with 1 whenever `record_file_problems` is not empty (before: only for a duplicate or a line that did not parse). The report is written all the same: **a runner that treats a non-zero exit as "no report" has to read the file anyway**.

## 3. Author tools

`q.mjs structs <words>` (the ids of the structure records, drawn objects, schedule rows `S-nnn` and hospitals `H-nn` a name finds), `q.mjs works [words]` (the earthworks and gun positions `E-nn`), and `q.mjs sky` / `q.mjs weather` now print the numbers the new assertions are matched to (azimuths, the moon's altitude and azimuth, the wind direction, whether it is recorded).

## 4. What GATE-SPEC.md could say (the gate does not need any of it to run)

* 6.2, the rows `weather_sky` and `casualty_flow`: the assertion fields above; the row `not_realized`: the probe `not_queryable`.
* 6.4 V11: the vacuity list gains a `wind_from_in` that lists all 16 points; V5: the floors a record may not loosen gain `tol_deg` (the half unit of the printed digits) and `tol_pct` of a casualty check (10 per cent); V3: the numbers of `sun_alt`, `sun_az`, `moon_alt`, `moon_az` and of the `*_approx` fields occur in the check's own quote.
* 6.3: `record_file_problems` and the exit code of section 2.
* 6.6: the harness still has no assertion that reads the vegetation layer; the rows that need it are recorded with `not_queryable` until the assertion is written (`bt-realizations-vegetation-assertion.md`, updated 2026-11-15).

## 5. How it is checked

The three test files of `tests/governance` (`realize.test.mjs`, `realize-rules.test.mjs`, `realize-inputs.test.mjs`) hold a wrong record for each new rule, and `mutate.mjs` removes or changes each rule in a scratch copy and requires a test to fail; the counts and the outcome of the last run are in the `progress.md` line of this date for bt-realizations and in `GOVERNANCE/realizations/MUTATION-CHECK.json`.

-- nothing is asked of any workstream; if GATE-SPEC.md is revised for the points of section 4, append `-- handled: ...` here with `>>`.
