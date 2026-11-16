# Request from bt-life (group us-1c) to the owner of the OA11 source registry: regimental histories that are local but not citable

Date: 2026-11-15. From: workstream bt-life, evidence group us-1c (I Corps). To: the owner of `tools/bt/life/build_sources.py`, `docs/battle-theatre/GOVERNANCE/library/acquired*.json` and `docs/battle-theatre/life/evidence/sources.json`.

## What

The evidence validator accepts a quote only from a text listed in `life/evidence/sources.json`. Public-domain regimental histories of I Corps units are on this machine (fetched from archive.org by earlier workstreams, one request per item, no account, no purchase) but are not in that registry, so no row may cite them. The first three hold the only statements of three works this group owns (E-02, W-13MA-RIFLE-PIT, S-014):

| text | archive.org item | copy (sha256 matches the kit ledger `horde/requests/bt-oob-kit-us-1c-library.md`) | what it settles |
|---|---|---|---|
| R. R. Dawes, Service with the Sixth Wisconsin Volunteers (1890) | `servsixthwiscon00dawerich` | `tmp/life-us-1c/lib/DAWES-1890.txt` sha256 `b168059e595763a9d53e209a09d286f84ce60cb55a67654e28cabd18e9c367a7` | E-02 and S-014: "In the wagon were a dozen spades and shovels"; the digging in relays; the night alarm; the muster of 30 June |
| O. B. Curtis, History of the Twenty-fourth Michigan of the Iron Brigade (1891) | `24thmichiganiron00curtrich` | `tmp/life-us-1c/lib/CURTIS-24MI-1891.txt` sha256 `722f4b6fe42095cc8e85aba788402fbd63e41129794cd522af43fffa7be9f1f9` | E-02 (the remnant intrenching: "the first night" and "the next morning"); the camps of 26 and 27 June; breakfast and prayer on 1 July; the pursuit |
| C. E. Davis, Three Years in the Army: the Thirteenth Massachusetts Volunteers (1894) | `threeyearsinarmy00davis` | `tmp/life-us-1c/lib/DAVIS-13MA-1894.txt` sha256 `bfbdb08986b3c8e28ef6e9d9b443d5e1e94d9290f8cb4b381d774dd5877e3330` | W-13MA-RIFLE-PIT; the 13th Massachusetts' earthworks at the seminary by Doubleday's order (E-01); hardtack at 6-7 p. m. on 1 July; the skirmish line of 50 men; coffee at dawn on 4 July |

Two more were read for a few statements each and are staged the same way: B. F. Cook, History of the Twelfth Massachusetts Volunteers, the Webster Regiment (1882, `websterregiment00cookrich`, copy `tmp/life-us-1c/lib/COOK-12MA-1882.txt`, sha256 `217db358359e24249c7b0803b28244ed35e3e84b22aa74e894486ae7696e0340`; the camps of 29-30 June and the works of 8 and 10 July of the 12th Massachusetts, the only rows of that regiment) and A. R. Small, The Sixteenth Maine Regiment in the War of the Rebellion (1886, `sixteenthmainere00smal`, copy `tmp/life-us-1c/lib/SMALL-16ME-1886.txt`, sha256 `3845f130acd381b7779f4dbc3bbbe602616bdc09f950756d4570bc88d01f882f`; the camps of 26-27 June and the picket of 27 June of the 16th Maine, and an hour of departure on 30 June that differs from the Official Records).

Two further local histories of the same corps were NOT read for evidence (owed): A. P. Smith, History of the 76th Regiment New York Volunteers (1867, `infantryhist00smitrich`, copy `tmp/life-us-1c/lib/SMITH-76NY-1867.txt`, sha256 `5c74756553774d95bc12105d09ccd4fe110068f4a5ad467c326a0c5a80ee85f1`) and G. G. Benedict, Vermont in the Civil War, vol. 2 (1886, `vermontincivilwa02bene`, copy `tmp/life-us-1c/lib/BENEDICT-VT-1886.txt`, sha256 `53437ad1219dcbb2cfa33bf9d40e03d818f0238d10182e41911764b35feb6827`); the 76th New York and the 14th Vermont have no row in the evidence file. The oob-kit directory `tmp/kit-us-1c/lib/` holds twelve more (88th Pennsylvania, 9th New York State Militia, 150th Pennsylvania, 20th New York State Militia, 14th Brooklyn, 142nd Pennsylvania ...): none read for evidence.

## Two more histories, third run (2026-11-16): ids `WILLIAMS-14VT-1864` and `SMITH-76NY-1867`

| text | archive.org item | copy (sha256 matches the kit ledger `bt-oob-kit-us-1c-library.md` and `-library-2.md`) | what it gives |
|---|---|---|---|
| Williams, Life in Camp: a History of the Nine Months' Service of the Fourteenth Vermont Regiment (1864) | `lifeincampahist00willgoog` | `tmp/life-us-1c/lib/WILLIAMS-14VT-1864.txt`, sha256 `0d0d4aa02435576aa26a4a8d1dcb5d627d89d4bdf7d5806ab43892e4fb3e3a1c` | the campaign diary of the Fourteenth Vermont (Stannard's brigade) from 26 June to 14 July: 18 staged rows (reveille at 5 a. m., the waits for the passing corps, the camps and halts of each day with hours, the nights without shelter, "Took breakfast at three o'clock and marched at four" on 7 July, three days' rations issued on 9 July, "busily engaged in fortifying" on 10 July): the first rows of the 14th Vermont |
| A. P. Smith, History of the Seventy-sixth Regiment New York Volunteers (1867) | `infantryhist00smitrich` | `tmp/life-us-1c/lib/SMITH-76NY-1867.txt`, sha256 `5c74756553774d95bc12105d09ccd4fe110068f4a5ad467c326a0c5a80ee85f1` | the regiment of Cutler's brigade that led the corps into Gettysburg: 8 staged rows (the cherries eaten at the halt before noon on 1 July, the fences removed in the advance, the wet arms put in order, the muster for pay on 30 June, the camp of 9 July at South Mountain): the first rows of the 76th New York |

Both are public domain, fetched from archive.org by earlier workstreams (one request per item, no account); class `regimental_volume` like the other five. In `build_sources.py` the rule `(r'^(CURTIS|DAVIS|COOK|SMALL|SMITH|BENEDICT)-', ...)` already covers SMITH; add WILLIAMS to it. The staged rows are in `tmp/life-us-1c/rows_q.py` (Williams) and `rows_r.py` (Smith); `tmp/life-us-1c/pending/us-1c.pending.jsonl` now holds 61 staged rows.

## Why

Gate OA-G11 and the plan (PLAN.md 9, "every work assigned to it has rows or a registered gap") need E-02's tools and W-13MA-RIFLE-PIT; the only non-lead statements are in these texts. Until the registry takes them the group carries registered gaps (`EG-LIFE-0102`, `0103`, `0105`, `0109`, `0110`) and a staged file of rows.

## The exact change asked

1. In `build_sources.py` add class rules before the `NY|PA|ME|MI|...` rule: `(r'^DAWES-', 'memoir_narrative', 'participant memoir (retrospective)')` and `(r'^(CURTIS|DAVIS|COOK|SMALL|SMITH|BENEDICT)-', 'regimental_volume', 'state or regimental volume ...')`.
2. Add the five (later the other two) to a library pointer file read by the builder (an `acquired_*.json` item: `id`, `title`, `local_path`, `archive_identifier`), with `local_path` set to a copy that will not be cleaned (the copies in `tmp/life-us-1c/lib/` are the group's scratch; `tmp/library/ws9/` is the place of the other texts). Ids used by the staged rows: `DAWES-1890`, `CURTIS-24MI-1891`, `DAVIS-13MA-1894`, `COOK-12MA-1882`, `SMALL-16ME-1886` (and `SMITH-76NY-1867`, `BENEDICT-VT-1886` when read).
3. Run `python3 -I tools/bt/life/build_sources.py`.

## What is waiting (updated 2026-11-16, third run)

The staged rows are no longer appended as 35 lines: three scenarios (E01-ARRIVAL, E02-24MI-WHEN, 16ME-30JUN-8-vs-9) name rows of the main file, and every member of a scenario must list every other member. Use the builder or the merged file: `cd tmp/life-us-1c && python3 -I build.py rows_a rows_b rows_c rows_c2 rows_c3 rows_d rows_e rows_f rows_g rows_h rows_i rows_j rows_k rows_l rows_m rows_n rows_p rows_q rows_r` writes `docs/battle-theatre/life/evidence/us-1c.jsonl` with the staged rows in (the ids of the existing rows are pinned and do not move), or copy `tmp/life-us-1c/pending/us-1c.merged.jsonl` (358 lines at the time of writing: the 297 rows of the file and 61 staged rows; validated with a registry overlay: 0 errors, 0 warnings). The paragraph below is the earlier text.

## What is waiting (earlier text)

`tmp/life-us-1c/pending/us-1c.pending.jsonl`: 35 staged rows (ids `us-1c-L301`-`L332`, `R301`-`R344`) built by `tmp/life-us-1c/build_pending.py` from `tmp/life-us-1c/rows_p.py`. With a registry overlay (`tmp/life-us-1c/ovl.py`, `vovl.py`) the file validates (0 errors) and the merged file (the 297 rows of `us-1c.jsonl` plus the 35: 332 rows) validates with 0 errors and 0 warnings (`tmp/life-us-1c/pending/us-1c.merged.jsonl`). After the registry change the group's builder (`python3 -I tmp/life-us-1c/build.py rows_a rows_b rows_c rows_c2 rows_c3 rows_d rows_e rows_f rows_g rows_h rows_i rows_j rows_k rows_l rows_m rows_n rows_p`) writes `us-1c.jsonl` with them; or any engineer can append the 35 lines to `us-1c.jsonl` (ids are reserved and do not collide). Nothing here is claimed documented until then; the gap rows say so.

## Owner-only acts

None: public-domain texts, openly readable, fetched without an account.
