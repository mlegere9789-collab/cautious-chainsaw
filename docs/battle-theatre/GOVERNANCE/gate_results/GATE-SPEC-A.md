# GATE-SPEC-A: the 28 gates defined from the governing text

Written 2026-11-13 (UTC) by workstream bt-gates. Source of every requirement below: `BIBLE/plan-clean.txt`, the 144-page "Gettysburg Total War animation plan, version 2" (marker `=== PAGE n ===` equals the printed "page n of 144"). Read for this file: Part E, THE UNBREAKABLE LAW and Sections A-Z (pp. 132-138), the Section Q gate table (p. 136), the sub-requirement model of Section F (p. 134), the Section Z checklist (p. 138), Appendices A, B, E and F (pp. 138-139, 142-143), and the Part B, C and D passages that each gate points to. Project rules come from `CLAUDE.md`; decisions from `GOVERNANCE/decision_log.md` and `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md` (DD-nn). Companion: `GATE-SPEC-B.md` (the same gates seen from the code: what exists, what is missing).

What this file is: the definition a runner must implement and a reviewer must apply. It sets no `passes` flag, runs no gate, edits no data and lowers nothing. A number quoted here was read from a named page or file. Where the plan gives no number the file says "the plan gives no figure" and marks anything it adopts as ADOPTED-PROVISIONAL with the reason; it is never presented as the plan's.

**Ambiguity rule.** Where the text can be read two ways, this file takes the reading under which fewer items can reach PASS (the stricter reading) and lists the ambiguity in section 8 as A-nn. The looser reading is never used silently.

**Citation form.** `(p. 136, Q)` is page 136, Part E Section Q. `(p. 62, B.2.5)` is page 62, Part B section B.2.5. `(App. B, p. 139)` is an appendix. `(p. 130, D.7)` is Part D.

## Contents

1. Common machinery (terms, universal rules U-01..U-24, evidence statuses, tiers, register links, scenarios and time, results and the `passes` protocol, thresholds)
2. The sub-requirement model and its eleven classes (population, domain gates)
3. Pass rules per class (TL, SS, WK, GE, PE, CT, CF, EP, TOP, OA)
4. The 28 gates, Q01 to Q28 (property, inputs, item, result, when it can pass, what is registered instead)
5. Requirement-level checks RC-R01..RC-R22 and the top-level `.0000` rows
6. The milestone checklist of Section Z as an executable test
7. Threshold registry and decisions to record
8. Ambiguity register A-01..A-52 (stricter reading adopted)
9. What the gates need from other workstreams (inputs owed)
10. Page index

---

## 1. Common machinery

### 1.1 Terms

| Term | Definition |
|---|---|
| Item | The smallest thing one gate judges: a unit in a scenario, a timeline row, one state change of one object, a datum, a night frame region. Each gate in section 4 names its item. |
| Sub-requirement (S-R) | A row of `requirements.json` `sub_requirements` (966 rows: 957 `origin: pdf`, 9 `origin: owner_chat`). Its text is never edited (p. 134, F: "you may never delete or reword one"). |
| Item result | One of PASS, COVERED, FAIL, NOT-RUN, BLOCKED-INPUT, N/A (table below). |
| Gate verdict | PASS, FAIL or INCOMPLETE for a whole gate (table below). |
| Link level | L0 to L3: how far a sub-requirement is tied to an open Evidence-Gap Register entry (1.5). |
| S-R status | PASSING, LINKED-ACTIVE, LINKED, UNLINKED (1.5). |
| Evidence status | The state of the underlying row's evidence: the vocabulary of `source_status` (1.3). |
| Effective tier | The tier the product may show for a row or datum after the correction overlay (1.4). |
| Scenario set S* | Every selectable combination of source-conflict values that can reach an item (1.6). |
| Renderer class | `node`, `python`, `swgl` (software GL) or `gpu` (the owner's GPU) (U-10). |

**Item results.**

| Result | Meaning |
|---|---|
| PASS | The property holds for this item and a run record names the evidence. |
| COVERED | The item does not meet the PASS branch, but the gate's own text provides a register or flag branch ("or is flagged with an open register entry", "or a flag", "blocked with register entry") and that branch is fully met. Counts toward a gate verdict only where the gate text provides the branch; never toward `passes`. |
| FAIL | The property is violated (an entity before its arrival window, a modern object in the scene, an unmarked procedural item, a missing datum). |
| NOT-RUN | The check could not be executed in the available environment (real GPU, missing tool, host blocked). The record states why. Non-passing. |
| BLOCKED-INPUT | An input the gate names does not exist or is not eligible (no documented camera position, no verified OOB table, no cap set). Non-passing. No vacuous pass (U-03). |
| N/A | The gate's domain excludes the item. N/A never satisfies an item whose every listed gate is N/A (U-03). |

**Gate verdict.** PASS: at least one in-domain item exists, every in-domain item is PASS (or COVERED where the gate text allows it), and no item is FAIL, NOT-RUN or BLOCKED-INPUT. FAIL: at least one FAIL. INCOMPLETE: no FAIL, but at least one NOT-RUN or BLOCKED-INPUT, or an empty domain.

### 1.2 Universal rules (apply to every gate and every class)

Each rule cites the text it comes from.

- **U-01 Gate-pass is necessary, not sufficient.** "A sub-requirement passes only when its gate passes" (p. 136, Q). `passes=true` needs all of: (a) every applicable gate in `gate_ids` gives item result PASS for this sub-requirement's items (A-02); (b) the class rule of section 3; (c) P2 to P6 of U-02. `gate_ids` with several gates is a conjunction.
- **U-02 What PASS means for a sub-requirement.** P1 item results PASS under (a). P2 evidence sufficiency: the tier the product shows does not exceed the evidence status (1.3, 1.4). P3 marking: every non-documented content of the item is marked (Q23 item PASS). P4 conflicts: every source conflict that reaches the item is carried as a selectable scenario and the item passes in each (A-06). P5 no content gap: an item whose own content is an open gap, a failed lookup, an unsupported claim or lead-only support never passes. P6 provenance of the run: command, versions, input hashes, renderer class and date are recorded (1.7), and any renderer-dependent part marked owed on the GPU is listed as owed.
- **U-03 No vacuous pass.** An empty domain gives BLOCKED-INPUT, never PASS. An S-R whose every listed gate is N/A for it cannot pass by that; it needs the domain gate of 2.3 to pass, otherwise it stays LINKED.
- **U-04 Linked is not passing.** "Every sub-requirement passing or linked to an open register entry with an active reconstruction" (p. 134, F; p. 136, Q18; p. 138, Z.1) are two different states. A link never turns a FAIL, NOT-RUN or COVERED item into PASS (A-03).
- **U-05 No lowering, no skipping.** "Never lower a threshold to pass" (p. 136, Q). A gate, threshold, scenario, row or class is never narrowed, disabled or skipped to make an item pass (p. 138, Z "lowering a threshold to pass"; Law cl. 1, 8).
- **U-06 Scope of time.** The whole window: 1863-06-26 00:00 through 1863-07-14 23:59 local mean time (LMT = UTC minus 5 h 09 min, p. 111, B.10.2), plus the epilogue day 1863-11-18 and 1863-11-19 (p. 136, O.3; p. 137, T.4; p. 116, B.12). Narrowing is an owner decision (p. 130, D.8.2.2; DD-20 keeps the full window). All three days and all nights are in scope (p. 138, Y.12).
- **U-07 Scope of scenarios.** Every check that depends on a source conflict is run over S* (1.6). "Scan every frame range of every scenario" (p. 136, Q04).
- **U-08 Evidence.** A datum is `documented` only with a non-lead source that states exactly it and a short extract (p. 134, E.2; p. 136, P.3; App. B p. 139). Wikipedia, forums, blogs, auction listings and wikis are leads (p. 134, E.1, E.2, E.7). A quotation is at most under 15 words (p. 134, E.6; App. B).
- **U-09 Never fabricate.** No invented quotation, measurement, name, time, number, citation or URL; a failed lookup is recorded as failed (p. 132, Law cl. 4). A gate result never contains an extract the runner did not match in the stored source text.
- **U-10 Renderer class.** A node or python result cannot certify a property defined on the picture. A software-GL (`swgl`) picture result is valid for properties that do not depend on the GPU (pixel statistics of a deterministic shader, draw-list contents, pixel identity between two runs) and is recorded as `PASS@swgl` with "real-GPU confirmation owed". Frame time, GPU memory and the real-GPU baseline need `gpu`; the runner records NOT-RUN with the reason (the container has no GPU). A visual result is claimed only for frames that were looked at.
- **U-11 Independent verification.** A fresh-context verification run per milestone, told to flag only correctness and requirement gaps (p. 136, Q, last paragraph; p. 137, X.5). "Do not self-certify what you have not run" (p. 136, Q). The record of that run is part of the milestone (Q27.5).
- **U-12 Records decide.** `passes` is a pure function of the latest valid run records (1.7). A record expires when an input hash it names changes. A failing or missing record sets `passes=false`.
- **U-13 Where the record or physics makes literal compliance impossible** the item is not exempt (Law cl. 3, 5): the strongest evidence-based reconstruction is built, registered (tier, marking, owner question), marked in the product and escalated (Law cl. 3 a-d, p. 132). The item is then at most LINKED-ACTIVE.
- **U-14 Visible gaps.** A missing-evidence item is shown as a marked gap (Law cl. 7, p. 132; p. 9, B.2: "open gap ... generate no behaviour and surface as map markers"). A concealed gap is a violation: FAIL for Q23.
- **U-15 Reading the product.** Gates test what the page loads and draws (the shipped data, the draw lists, the audio graph), not only the source data. The history layer is read-only to renderers (p. 134, D).
- **U-16 Owner-only acts.** A gate that needs an account, licence acceptance, payment, third-party contact, deployment or a cap value (D.8, p. 130) is INCOMPLETE with the exact owner step written next to it. Claude never performs the act (p. 132, Law cl. 2; standing constraints in CLAUDE.md).
- **U-17 Delegated defaults.** The owner delegated the default view of conflicts on 2026-11-11 (DELEGATED-DECISIONS header). A default chosen under that delegation is the default for Q02, Q19 and class CF only while (a) it is recorded as DD-C-nnn or in `decisions/conflict_defaults.json`, (b) the product labels it "Default chosen under delegated authority, reversible by the owner" with its tier, (c) the PDF default and every other value stay selectable. The word DECIDED is never written to `decision_log.md` for it.
- **U-18 Clocks.** All times are LMT as printed. The roughly 20-minute Union/Confederate clock difference is carried as uncertainty and not applied (p. 9, B.2; p. 62, B.2.5).
- **U-19 Row identity.** Day-header rows of the timeline are not events (p. 9, B.2) and are not sub-requirements. Row ids T1-001.., T2-001.., T3-001.. (T3-131 absent) and E-001..E-014 are stable (p. 9).
- **U-20 Thresholds.** Section 1.8: only recorded thresholds are used; an unrecorded one makes the gate INCOMPLETE.
- **U-21 Fresh state.** A run starts from the committed inputs plus the working-tree data it names by hash; it never reads a result file as if it were an input (GATE-SPEC-B 5.4).
- **U-22 Heavy runs** go through `tools/horde/bench.sh` (at most two heavy jobs, timing runs alone). A run that was waiting for the lock is not a failure.
- **U-23 Copy audit.** Gate outputs under `GOVERNANCE` are not shipped. A gate assertion that reads shipped files (Q23, Q02) never writes or quotes how the site was produced into shipped files (FINAL-ACCEPTANCE copy audit; DEC-006).
- **U-24 Product marking after DEC-006.** The "reviewed by automated subagents" label is dropped (DEC-006). Tier marking of non-documented content stays (Q23), as does the register (CLAUDE.md).

### 1.3 Evidence statuses: the vocabulary of `source_status`

`source_status` currently holds one value, `seeded_unverified`, on all 966 rows, and `check_governance.py` refuses `passes=true` on a PDF row that still has it. The lifecycle below is the vocabulary gate scripts write (only gate scripts, never by hand; each change is logged with the run id).

| Status | Meaning | May the S-R pass? |
|---|---|---|
| `seeded_unverified` | Text and tier come from the PDF; no primary check yet (CLAUDE.md: "Timeline rows are `seeded_unverified` until checked against a primary source"). | No |
| `verified_primary` | A non-lead source (tier 1 to 3 of p. 134, E.1) supports exactly the claim; a short verbatim extract (under 15 words) was re-matched by the runner in the stored source text at the cited page or span (citation checker, p. 126, D.4.3 step 11); numbers in the claim appear in the span. | Yes, for effective tier `documented` |
| `verified_inferred` | Effective tier `inferred`: a `reasoning` chain is recorded and every premise is itself `verified_primary` (App. B, p. 139). | Yes, for effective tier `inferred` |
| `procedural_registered` | Effective tier `plausible-procedural`: complete `procedural` block (generator and version, seed, distribution, documented_context, substitute), an open register entry, and a recorded exhaustive search of the acquired library for the gap (Law cl. 3a). | Yes, for effective tier `plausible-procedural` |
| `partially_verified` | Some component claims verified, others not. Rows cannot be split or reworded, so the unverified part is re-tiered by a correction record; until then the row cannot pass. | No |
| `gap_registered` | The content is an open gap with a register entry (no behaviour generated; marker shown). | No |
| `failed_lookup` | A lookup was performed and failed; recorded with host, locator, date and response. | No |
| `claim_unsupported` | The source was read and does not support the claim, or a recheck of the extract failed (`recheck_failed`). The tier must be revised. | No |
| `lead_only` | Only lead sources support the claim (Wikipedia, forum, blog, auction page). The tier cannot be `documented`. | No |

Mapping from the vocabularies that exist today (candidates only; the gate re-checks, U-12):

| Existing value | Candidate status |
|---|---|
| `timeline_verified.jsonl` `status_effective`: `verified_against_or_text` | `verified_primary` (documented rows) or `verified_inferred` (inferred rows with premises) |
| `partially_verified` | `partially_verified` |
| `gap` | `gap_registered` |
| `inferred` | `verified_inferred` only if reasoning and premises are recorded, else `partially_verified` |
| `failed_lookup` | `failed_lookup` |
| `claim_unsupported_by_or_text`, `recheck_failed` | `claim_unsupported` |
| `subreq_links.json` `status`: `verified`, `gap`, `inferred`, `failed_lookup` | same mapping; the row's own note says "Evidence link only. passes stays false until the gate is run" |
| `structures/state_schedule.json` `claim_support_verified: true` | `verified_primary` |
| `weak_source: true` with no non-weak key | `lead_only` |

### 1.4 Tiers (App. B, p. 139) and the effective tier

- `documented`: at least one non-lead source with a short extract; the claim matches the source. `inferred`: `reasoning` required. `plausible-procedural`: `procedural` block required, and a register entry when the gap affects a requirement. Items affecting a visible result need two sources with distinct `independent_of` roots or a flag. `render_flag`: 0 documented, 1 inferred, 2 plausible-procedural. Every structure or vegetation state change carries a `state_schedule`; every kit item carries `validity` dates.
- "Open gaps are not a tier: they are register entries" (p. 133, B). The timeline uses the category `open gap` for rows (p. 9, B.2). It is shown as a marked gap, not as content.
- C.10 (p. 121): substitute content (modern motion bases, synthesized audio, open textures) is recorded in the asset manifest with licence, source and method and "never receives a documented tier".
- **Effective tier** of a timeline row or datum, in order of precedence: (1) an accepted correction record (`timeline_corrections/`, `evidence_corrections/`) with a citation and passage; (2) `timeline_verified.jsonl` `tier` as adopted by DD-08 and DD-09; (3) the seed tier (`timeline_seed.jsonl`, never rewritten). The effective tier can only be lower than or equal to what the evidence status allows (U-02 P2). Promotion needs a matched citation. A demotion is always allowed.

### 1.5 Register links: "open", "active reconstruction", link levels

"Open register entry" uses the status vocabulary of Appendix A (p. 138): `open`, `awaiting owner`, `decided`, `closed`. A sub-requirement's link counts only for `open` and `awaiting owner` (A-04). A `decided` entry means the owner (or delegate) has chosen: the decision is implemented and the sub-requirement must then pass on its own. `closed` entries do not count (two exist today: EG-0007, EG-0025). Entries are never deleted (p. 137, R).

| Level | Condition (all runner-checkable) |
|---|---|
| L0 UNLINKED | No `register_ids` entry with status `open` or `awaiting owner`. This is "unfinished work, not an exception" (p. 134, F). |
| L1 LINKED-RECORD | At least one open entry whose fields are all present and non-placeholder: `title, rids, cat, desc, why, searched, subst, recon, tier, marking, status` plus the owner-decision field `owner_q` (p. 138, Z.3: "a reconstruction, a marking and an owner-decision field"). The marker text "not stated by the shard proposal" counts as missing. |
| L2 LINKED-MARKED | L1, and the marking is in the product for this item (Q23 item PASS for the item; for a gap, the visible gap marker with its register link). |
| L3 LINKED-ACTIVE | L2, and (b) `searched` holds a dated, machine-readable `search_log` (or a linked lookup file) whose records name the acquired sources that could settle the gap and a result, found or negative, dated on or after that source was acquired (Law cl. 3a: "exhausting the free primary-source library ... before settling for less"); and (c) the reconstruction named in `recon` is present in the product build for this item (a datum, draw object, scenario or realization record that lists the register id in its `register_ids` and is loaded by the page), or, where the reconstruction is "show a marked gap, generate no behaviour", the marker object exists. |

**S-R status.** PASSING: `passes=true`. LINKED-ACTIVE: not passing, L3. LINKED: not passing, L1 or L2. UNLINKED: L0. The coverage condition of Q18 is PASSING or LINKED-ACTIVE (A-05). The existing `check_coverage.py` counts any entry whose status is not `closed` as a link (L1 at best); that is the weaker reading and is reported as such, never as Q18 coverage.

**Top-level rows (`.0000`).** Their text is the aggregation "all child sub-requirements pass or link ..." so their own link level is derived: COVERED-BY-CHILDREN when every child is PASSING or LINKED-ACTIVE. Their own `passes` follows 3.9 (A-40).

### 1.6 Scenario space, time grid, entity classes

- **Scenario.** A function from every conflict C-001..C-047 (and the further conflicts the plan prints elsewhere, A-31) to one of its values: the "All values" column of the register (pp. 62-63, B.2.5). Two scenarios named by the plan: the PDF recommended defaults (the "Recommended default" column, still PENDING OWNER) and the delegated defaults (`decisions/conflict_defaults.json`). Every value stays selectable (p. 62: "no alternative is deleted; every value ... remains selectable").
- **S\*** (the scan set). The assignment of values to conflicts is expanded as the full Cartesian product inside each interaction group (conflicts that reach a common unit, event, object or channel; the product's `layer.meta.linkedConflicts` and the ledger's gate chains give the groups) and independently across groups. The runner emits the group structure and the argument that the checked property factors over groups. Additionally S\* contains the two extremal scenarios (every conflict at its earliest value, every conflict at its latest) and both named defaults. A property that does not factor over groups is checked on the full product.
- **Time grid.** Every integer minute LMT of the window of U-06, plus both sides (minus one second, plus one second) of every window boundary of every event, state change, arrival, departure, sunrise, sunset, moonrise, moonset and light-source start or end. "Every time" in a gate text means this grid. Rows without a clock minute (295 `phrase_only`, 1 `no_date` in `timeline_windows.jsonl`) are tested on the bounds of their date or part-of-day window and on a seeded sample inside it (A-18).
- **Entity classes.** Soldiers (including officers, colour bearers, musicians, stretcher bearers), horses (ridden, led, draught), guns, limbers, caissons, wagons, ambulances, forge and battery wagon, flags and guidons, casualties on the ground, hospital contents, effects and sounds caused by a unit's actions. A gate that says "no entity" or "every unit" covers all of them in one scan.

### 1.7 Result records and the `passes` protocol

A run writes `GOVERNANCE/gate_results/runs/<UTC stamp>-<gate>/result.json` and updates `GOVERNANCE/gate_results/latest/<gate>.json`. Minimum fields:

```
{ "gate": "Q07", "checks": ["Q07.1", ...], "run_id": "...", "started_utc": "...", "finished_utc": "...",
  "renderer_class": "node|python|swgl|gpu", "tool_versions": {...},
  "inputs": [ { "path": "...", "sha256": "..." } ],
  "thresholds": [ { "id": "T-Q10-1", "value": ..., "decision": "DD-G02" } ],
  "scenario_set": { "id": "...", "groups": [...], "count": N },
  "time_grid": { "step_s": 60, "boundaries": true },
  "items": [ { "item_id": "R14.S-062", "check": "Q07.4", "result": "PASS|COVERED|FAIL|NOT-RUN|BLOCKED-INPUT|N/A",
               "evidence": { ... }, "register_ids": [ ... ], "reason": "..." } ],
  "verdict": "PASS|FAIL|INCOMPLETE", "counts": { ... }, "owed": [ "real-GPU confirmation: ..." ] }
```

- A script, not a person, derives S-R status from the latest valid records and writes `passes`, `source_status`, `register_ids` and `owner_decision_ids` in `requirements.json` as a textual patch (the method of `link_subreqs.py`: other bytes unchanged, idempotent). It writes nothing else, and never `text`, `id`, `origin`, `gate_ids`.
- `passes` is recomputed at every run. It is true exactly when 1.2 U-01 and U-02 hold on the latest valid records for every item of the sub-requirement. A regression sets it back to false and the change is logged in `progress.md`.
- A record is valid while every input hash it names is unchanged. The runner names the data files, code files and source-text hashes it read.
- `check_governance.py` already refuses `passes=true` on `seeded_unverified` PDF rows; the protocol adds: refuse `passes=true` with no run record, with a record older than an input, or with `NOT-RUN` or `BLOCKED-INPUT` in any applicable gate.

### 1.8 Thresholds

"Never lower a threshold to pass; thresholds are set at gate creation from the vertical slice and changed only by owner decision" (p. 136, Q). The plan prints numbers only where this file cites a page for them (for example the 100 random jump times, p. 130, D.7 phase 12). For the others:

1. The threshold registry (section 7) lists each threshold id, the plan's words, the plan's figure (or "none"), the value in code today (from GATE-SPEC-B 5.1), and the value adopted.
2. A recorded threshold has a decision id (DD-Gnn in `DELEGATED-DECISIONS-2026-11-11.md`). A runner reads thresholds from `GOVERNANCE/gate_results/thresholds.json`; a threshold with no decision id makes the gate INCOMPLETE ("threshold not recorded"), never PASS.
3. A value may be tightened by recording a stricter one. It may not be loosened without a recorded owner decision.
4. Values taken from a measurement (frame time, reprojection error) are re-measured at the first run on the real GPU and the stricter of measured and recorded applies.

---
