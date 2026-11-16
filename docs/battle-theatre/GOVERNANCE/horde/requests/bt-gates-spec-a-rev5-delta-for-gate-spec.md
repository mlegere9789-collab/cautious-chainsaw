# Request from bt-gates (GATE-SPEC-A revision 5, 2026-11-16): what the next reconciliation, the runner owners and the conflicts workstream are asked to take over

Written by the workstream that owns `GOVERNANCE/gate_results/GATE-SPEC-A.md`. Nothing here changes a file outside that workstream's ownership; each item names who acts. Section numbers are those of GATE-SPEC-A.md revision 5 (section 11.8 lists every change, 11.9 compares the runners of 2026-11-16 with the file).

## 1. For the next reconciliation of `GATE-SPEC.md` (the judge step of `tools/horde/workflows/bt-gate-engine.mjs`)

`GATE-SPEC.md` was last reconciled against revision 3 of Spec A and the fourth pass of Spec B (the delta of revision 4 is in `bt-gates-spec-a-rev4-delta-for-gate-spec.md` and is still open). Revision 5 adds:

1. **Class CF under the owner's order of 2026-11-16** (`DEC-OWNER-2026-11-16` point 4): 3.8 CF-1 to CF-5 and CF-7 to CF-9, new CF-9 (the resolution record and the table of the four classes), the CF row of the summary table in section 3, 2.2, U-17, 1.6 (three standing scenarios and the values added by research), Q02.7, Q04.1, Q19.6, Z.5, A-63, A-66, A-67, DD-G22. The rule in one line: a conflict passes only with a validated resolution record of class settled, weighted or irreducible; gap never passes; the first delegated default of 2026-11-11 is not a resolution.
2. **Q27 without a cap** (`DEC-OWNER-2026-11-16` point 5): the reads, Q27.1 to Q27.5, the owner step, T-Q27-1, the glance row, section 9, A-62, DD-G21. The three spend and compute caps and the per-job spend limit are `none` by the order; the five other guards of Appendix F stay open; a quantity that no file records is `not measured` (BLOCKED-INPUT, never estimated); the stop condition is tested with a synthetic cap.
3. **The owner's PC** (`DEC-OWNER-2026-11-16` point 3): U-10 (what a `gpu` record holds), U-16, A-64, DD-G23, section 9.
4. **Judgment parts**: U-29, the new 1.10 (the table of what no program decides and the verification record `bt-gate-verification/1`), A-65, DD-G24, and the effort level of a verification run in U-11.
5. **Q20.6 and the reads of Q20: 17 states, not 14.** The table of B.6.15.7 on p. 89 prints 17 rows; no page says 14 (A-61, DD-G25). If `GATE-SPEC.md` repeats 14, correct it.
6. **Q25.1**: the ledgers of acquired sources that the workstreams keep are rows of the list.
7. **1.1 item rule**: `GATE-SPEC.md` 1.1 already has it; Spec A now has it too.
8. Section 9 states of 2026-11-16 (correction records 430 and 2,997, vegetation 589 claims, the new hooks of `GATE-HOOKS.md`, the existence of the runners), and 11.8 and 11.9.

## 2. For the owners of the runners under `tools/bt/gates/` (same workstream, other engineers)

| Gate | What revision 5 asks | Reference |
|---|---|---|
| Q02, Q19, Q10, Q23, Q28, OA rows | read `GOVERNANCE/gate_results/verification/*.json` when present, apply the verdicts of 1.10 to the items they name (agree is PASS for the judgment part, disagree is FAIL, cannot_confirm stays NOT-RUN), never write one; put the exact question of each owed judgment part in `owed` | U-29, 1.10 |
| Q02.7, Q19.6 (class CF) | when `GOVERNANCE/conflicts/resolutions/C-nnn.json` exist: run `tools/bt/conflicts/validate_resolution.py C-nnn --complete`, re-match every quotation in the stored text yourself, read the class, tier and default, and apply the class table of CF-9; with no resolution record the row has no resolved default | 3.8 CF-3, CF-7, CF-9 |
| Q03 | the departure half of Q03.1 class 1 (a soldier whose unit has left is absent) is not checked by the runner today (DD-G-Q03-09): either check it or read the record of Q04.4 as an input and keep the verdict INCOMPLETE until then | Q03.1, 11.9 |
| Q04 | report every change of an arrival minimum against the previous record (`Q04.prev.json`), so that a moved gate is visible (A-66) | Q04.1 |
| Q25 | read the other ledgers of acquired sources named in Q25.1 (`kit/evidence/sources.json`, `life/evidence/sources.json` and `acquired_period.json`, `medical/sources-remote.json`, `town/evidence/ledger-families.json`, `rosters/SOURCES.csv`, `GOVERNANCE/conflicts/SOURCES.md`) and list the ledgers read in the record; a source in a ledger and in no status row is FAIL (p. 138, Z.7) | Q25.1 |
| Q27 (to be written) | the request note `bt-gates-q27-no-cap.md` stands; add: the five other guards are BLOCKED-INPUT until the owner gives a value or `none`, per-phase figures that no file records are `not measured`, and the stop condition is exercised on a scratch copy of the budget file with a synthetic cap | Q27.1 to Q27.5, A-62 |
| all | read thresholds from `GOVERNANCE/gate_results/thresholds.json` (1.8) or record why a constant is used; the runners hold constants today; the file now exists and is generated from section 7 of Spec A by `GOVERNANCE/gate_results/spec-a-evidence/gen_thresholds.py` (41 rows, 4 UNSET: a gate with an UNSET threshold is INCOMPLETE) | 1.8, section 7 |

## 3. For the conflicts workstream (bt-conflicts; it owns `GOVERNANCE/conflicts/**` and `tools/bt/conflicts/**`)

The gate for the class CF will read your resolution records. `PLAN.md` did not exist at about 02:50 UTC, so these are properties and not field names; please keep each one in the record format and say in `PLAN.md` how it is named, so that the runner can read it without guessing:

1. every value of the PDF row and every value the research added, each with source keys, a tier and, for a value that was not chosen, the reason; none dropped;
2. the default (a value or a range), the class (settled, weighted, irreducible, gap), the tier, and whether the PDF default and the first delegated default hold, with the reason if not;
3. the plain-English source-panel text of at most 400 characters;
4. every quotation with the source id, printed page, offsets and the verbatim words, so that the gate can re-match it (the gate does not read a stored validation flag);
5. for irreducible and gap: the failed searches (library or host, locator or query, date, result), which the gate counts as the search log of the register entry (1.5, L3 b);
6. the timeline rows, gates and data files that carry the value;
7. when a value moves an arrival gate (Q04.1: for example Pickett 04:36 or Stuart 19:32), a request note that names the unit, the old and the new minimum and the source; a value that rests on a lead never moves a gate (A-66).

Two requests for the integrate step: (a) give a conflict of class gap a status that cannot be read as a resolution (for example a status that says the research found no source), because the register status `RESOLVED_DELEGATED_2026_11_16` would otherwise be shown beside a default that is a marked gap; (b) when the register entry of a settled, weighted or irreducible conflict is set to `decided` (delegated), keep its reconstruction, marking and owner-decision fields (Z.3).

## 4. For the owner

One sentence closes Q27.1: give a value, or `none`, for the five guards of Appendix F that are not spend caps (per-job turn limit, concurrency limit for headless jobs, GPU power and temperature guard, no-progress halt, cache snapshot interval). The three spend and compute caps and the per-job spend limit need nothing: they are `none` by the order of 2026-11-16. A run on the owner's PC needs a folder of that PC served to the session (Settings, Claude Code, Remote Control in the desktop app); `list_computer_folders` returned none at about 02:40 UTC.
