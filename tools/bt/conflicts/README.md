# tools/bt/conflicts: tools of the research of the 47 source conflicts

The plan, the record format and the rubric are in `docs/battle-theatre/GOVERNANCE/conflicts/PLAN.md`; the enumerations in `schema.json` beside it. Run every program with `python3 -I`.

| program | what it does |
|---|---|
| `validate_resolution.py` | validates one resolution (`C-001`), a file, `--all [--complete]`; `--self-test` plants defects in a valid fixture and demands that each is caught; `--schema` |
| `find_passage.py` | locates a quote or a regular expression in a text of the ledger and prints the citation fields (source, part, page, page basis, offsets) |
| `add_source.py` | appends one source to the ledger `SOURCES.md` under a file lock (hashes the file, finds its page model); `--from-town ID`, `--from-life ID` |
| `build_sources.py` | seeds sections 1-9 of `SOURCES.md` and `ledger-families.json` (section 10, the rows researchers appended, is kept); `--check` re-hashes every local text |
| `probe_candidates.py` | asks archive.org (metadata API, one request per 1.2 s) which items answer the catalogue of `candidates.py`; feeds section 9 of the ledger and the dossiers |
| `build_dossiers.py` | builds the 47 dossiers and `dossiers/INDEX.md` (heavy: through `tools/horde/bench.sh`); `--index`, `--check`, or ids |
| `check_dossier_sources.py` | checks that every source the 47 dossiers cite (passage sources, Official Records record ids, the keys of section 6, the PDF source keys, the `source_id` of quoted shard lines) has a row in the ledger `SOURCES.md`, or is declared in the script as a spelling of one or as a record with no text, with its reason; exit 1 on a gap |
| `write_ready.py` | writes `GOVERNANCE/conflicts/READY.json` only when the self-test passes, the 47 dossiers exist with every section, the ledger hashes are true and every source the dossiers cite is in the ledger |
| `summarize.py` | counts by class and tier, defaults that changed, gaps and readers that must change, from the resolution files |

Libraries: `cfl_lib.py` (paths, register, PDF row and glossary, the town engine), `cfl_cite.py` (the citation checker: wrapper of `tools/bt/town/validate_evidence.py` `check_cite`), `cfl_parse.py` (clock expressions, numbers, days, banned copy), `cfl_search.py` (proximity probes and offsets), `cfl_selftest.py`, `dossier_profiles.py` (what to look for per conflict), `candidates.py` (sources to acquire). Fixtures: `selftest/` (`make_base.py` regenerates `c001-valid.json` and, with `--c015`, `c015-valid.json`). Tests: `tests/test_validate_resolution.py` (`python3 -I -m unittest discover -s tools/bt/conflicts/tests`) and, for the whole kit, `tests/governance/conflicts/test_validate_resolution.py` (`python3 -I tests/governance/conflicts/test_validate_resolution.py`, run through `tools/horde/bench.sh`): it loads the unit tests above, plants the four named defects (a fabricated quote, a dropped value, a documented tier on a lead-only source, a missing reason) in a copy of the valid fixture and hands them to the real command line, and checks the 47 dossiers, the sources they cite, the self-test result and `READY.json`.

Nothing here reads the network except `probe_candidates.py` (archive.org, public metadata) and nothing here edits another workstream's file: the town validator is imported, not edited.
