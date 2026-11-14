# Overrides of the kit tables

The kit tables (`../kit_specs.json`, `../weapons.json`, `../artillery_batteries.json`, `../cavalry_units.json`) are rebuilt by `tools/bt/build_kit_data.py`. Evidence from the Official Records and the state volumes reaches them through the files in this folder, applied inside that build.

- `<group>.json`: compiled from the accepted lines of `../evidence/<group>.jsonl` by `python -I tools/bt/kit_overrides.py compile`. Do not edit; fix the evidence line and compile again.
- `manual.json` (may be absent): the one hand-written file. Every operation needs a `why` and either `evidence_ids` or a `decision` id.
- A guard in an operation that no longer holds makes the build fail and name the operation.
- A compile writes no operation whose result fails the kit data checks: such a line is listed in the file under `unapplied` (reason `KIT DATA CHECK`, with the check's message), as is every line that the rules leave to the verified tables (`routed` marks those by design).

Checks: `python -I tools/bt/kit_overrides.py check` (kit data checks on base plus overrides, then the packer's copy audit over every string of the four tables) and `... status` (does each committed table equal what the build makes?). `... compile --dry-run [--group G]` shows what a compile would produce and writes nothing. The rules are in `../evidence/PLAN.md`, section 8. With no `*.json` file here the build output is unchanged.
