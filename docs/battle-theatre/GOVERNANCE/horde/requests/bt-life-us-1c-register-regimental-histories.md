# Request from bt-life (group us-1c) to the owner of the OA11 source registry: three regimental histories that are local but not citable

Date: 2026-11-15. From: workstream bt-life, evidence group us-1c (I Corps). To: the owner of `tools/bt/life/build_sources.py`, `docs/battle-theatre/GOVERNANCE/library/acquired*.json` and `docs/battle-theatre/life/evidence/sources.json`.

## What

The evidence validator accepts a quote only from a text listed in `life/evidence/sources.json`. Three public-domain regimental histories of I Corps units are on this machine (fetched from archive.org by earlier workstreams, one request per item, no account, no purchase) but are not in that registry, so no row may cite them. They hold the only statements of three works this group owns:

| text | archive.org item | copy (sha256 matches the kit ledger `horde/requests/bt-oob-kit-us-1c-library.md`) | what it settles |
|---|---|---|---|
| R. R. Dawes, Service with the Sixth Wisconsin Volunteers (1890) | `servsixthwiscon00dawerich` | `tmp/life-us-1c/lib/DAWES-1890.txt` sha256 `b168059e595763a9d53e209a09d286f84ce60cb55a67654e28cabd18e9c367a7` | E-02 and S-014: "In the wagon were a dozen spades and shovels"; the digging in relays; the night alarm; the muster of 30 June |
| O. B. Curtis, History of the Twenty-fourth Michigan of the Iron Brigade (1891) | `24thmichiganiron00curtrich` | `tmp/life-us-1c/lib/CURTIS-24MI-1891.txt` sha256 `722f4b6fe42095cc8e85aba788402fbd63e41129794cd522af43fffa7be9f1f9` | E-02 (the remnant intrenching: "the first night" and "the next morning"); the camps of 26 and 27 June; breakfast and prayer on 1 July; the pursuit |
| C. E. Davis, Three Years in the Army: the Thirteenth Massachusetts Volunteers (1894) | `threeyearsinarmy00davis` | `tmp/life-us-1c/lib/DAVIS-13MA-1894.txt` sha256 `bfbdb08986b3c8e28ef6e9d9b443d5e1e94d9290f8cb4b381d774dd5877e3330` | W-13MA-RIFLE-PIT; the 13th Massachusetts' earthworks at the seminary by Doubleday's order (E-01); hardtack at 6-7 p. m. on 1 July; the skirmish line of 50 men; coffee at dawn on 4 July |

Four more local histories of the same corps were fetched by the oob-kit workstream and are likewise not registered; this group has NOT read them for evidence (owed): B. F. Cook, The Webster Regiment (12th Massachusetts, 1882, `websterregiment00cookrich`); A. R. Small, The Sixteenth Maine (1886, `sixteenthmainere00smal`); A. P. Smith, History of the 76th Regiment New York Volunteers (1867, `infantryhist00smitrich`); G. G. Benedict, Vermont in the Civil War, vol. 2 (1886, `vermontincivilwa02bene`). Copies, same sha256 as the kit ledger, are in `tmp/life-us-1c/lib/`. The oob-kit directory `tmp/kit-us-1c/lib/` holds twelve more (88th Pennsylvania, 9th New York State Militia, 150th Pennsylvania, 20th New York State Militia, 14th Brooklyn, 142nd Pennsylvania ...): none read for evidence.

## Why

Gate OA-G11 and the plan (PLAN.md 9, "every work assigned to it has rows or a registered gap") need E-02's tools and W-13MA-RIFLE-PIT; the only non-lead statements are in these texts. Until the registry takes them the group carries registered gaps (`EG-LIFE-0102`, `0103`, `0105`, `0109`, `0110`) and a staged file of rows.

## The exact change asked

1. In `build_sources.py` add class rules before the `NY|PA|ME|MI|...` rule: `(r'^DAWES-', 'memoir_narrative', 'participant memoir (retrospective)')` and `(r'^(CURTIS|DAVIS|COOK|SMALL|SMITH|BENEDICT)-', 'regimental_volume', 'state or regimental volume ...')`.
2. Add the three (later the other four) to a library pointer file read by the builder (an `acquired_*.json` item: `id`, `title`, `local_path`, `archive_identifier`), with `local_path` set to a copy that will not be cleaned (the copies in `tmp/life-us-1c/lib/` are the group's scratch; `tmp/library/ws9/` is the place of the other texts). Ids used by the staged rows: `DAWES-1890`, `CURTIS-24MI-1891`, `DAVIS-13MA-1894` (and `COOK-12MA-1882`, `SMALL-16ME-1886`, `SMITH-76NY-1867`, `BENEDICT-VT-1886` for the others).
3. Run `python3 -I tools/bt/life/build_sources.py`.

## What is waiting

`tmp/life-us-1c/pending/us-1c.pending.jsonl`: 25 staged rows (ids `us-1c-L301`-`L321`, `R301`-`R323`) built by `tmp/life-us-1c/build_pending.py` from `tmp/life-us-1c/rows_p.py`. With a registry overlay (`tmp/life-us-1c/ovl.py`, `vovl.py`) the file validates (0 errors) and the merged file (the 261 rows of `us-1c.jsonl` plus the 25) validates with 0 errors and 0 warnings (`tmp/life-us-1c/pending/us-1c.merged.jsonl`). After the registry change the group's builder (`python3 -I tmp/life-us-1c/build.py rows_a rows_b rows_c rows_c2 rows_c3 rows_d rows_e rows_f rows_g rows_h rows_i rows_j rows_p`) writes `us-1c.jsonl` with them; or any engineer can append the 25 lines to `us-1c.jsonl` (ids are reserved and do not collide). Nothing here is claimed documented until then; the gap rows say so.

## Owner-only acts

None: public-domain texts, openly readable, fetched without an account.
