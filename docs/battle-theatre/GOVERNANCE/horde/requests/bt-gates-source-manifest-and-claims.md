# Request from bt-gates to bt-world-content and the history-layer owners: what gates Q02 and Q19 need in the data

Written 2026-11-16 by workstream bt-gates (runners `tools/bt/gates/q02_provenance.py` and `q19_claims.py`, registry `tools/bt/gates/datum_classes.json`). Not done by bt-gates because the data is not in its ownership list.

## What the first runs found (both FAIL, as expected; counts are from the files of 2026-11-16 00:30 UTC)

1. **No Source Manifest has `date_written`, `rights` and `reliability_tier`** (Q02.6): the layer's manifest (`L.sources`, 105 keys), the kit sources (126), the Official Records index (2,830 records) carry none of them. Needed per source: `date_written` (YYYY or YYYY-MM-DD), `rights`, `reliability_tier` (1 to 3), and for the independence of Q19.3 `independent_of` (the roots it does not copy; an empty list for a root) or `derived_from`. A source with neither field is "not recorded", never "independent": no pair of sources is shown independent today (0 of 3,603 entries record a relation), so no datum can reach two independent sources and every one needs a shown flag.
2. **Documented data without an extract** (Q02.3): kit items (14 documented), units, arrivals, structures and weather readings carry source keys and no extract of at most 14 words. The position ledgers A to E carry one; the timeline correction records carry citations whose quotes are often longer than 14 words (the plan's limit is under 15, p. 134 E.6).
3. **Inferred data without premises** (Q02.4): reasoning is stored as free text (`basis`) with no claim ids of the premises. Add `claims: [<claim id>]` naming documented claims of the ledgers.
4. **Plausible-procedural data without the procedural block** (Q02.5): add `procedural: {generator, seed, distribution, documented_context, substitute}` (substitute may be null) and a `register` id to each datum, or to a class record that every datum names.
5. **Tier statements that name no tier the product reads** (Q02.2, Q23.2): `environment/ephemeris_1863.json` (`computed (not measured)...`), `render/prototype/data/terrain.json` (no tier), `app/data/site-memorials.json`, `site-bookmarks.json`, `site-tour-stops.json` (512 + 528 + 16 records without a tier), `app/data/audio3d/sources.json` (42 recordings), `casualty-sources.json`, 23 records of `structures/structures.json` (tier null). A class-level `tier` at the top of a file is read for members that have none only where the registry names it (`inherit_tier`).
6. **Kit items without `valid_from` and `valid_to`** (Q02.9): 5,894 of 5,894 layer kit items.
7. **A claim ledger for Section P over every datum class** (Q19.7): `GOVERNANCE/claim_ledger.json` or `app/data/claim-ledger.json` does not exist. Today 39 of 49 visible data classes name no claim id on any member (Q19.1).
8. **The flag "single source"** is set in the position ledgers (`flag_single_source`) and shown nowhere in the product (no code of app/src reads it): COVERED needs the flag shown (Q19.4).
9. **Conflicts** (Q02.7, Q19.6): 44 of the 47 conflict rows have a value with no source key in its label; `conflict-defaults.json` has no default for 2 conflicts.

## The exact change asked for

The owners of each file add the fields above in their own files, in the same shape (the runners read the shipped data, not a copy). Run `python3 tools/bt/gates/q02_provenance.py` (through `tools/horde/bench.sh`, about a minute of CPU) and `q19_claims.py` (10 s) to see what moved; each item names the class and the first 20 failing ids, and a sidecar under `gate_results/evidence/` lists the rest.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
