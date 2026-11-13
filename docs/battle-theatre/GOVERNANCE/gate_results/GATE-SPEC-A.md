# GATE-SPEC-A: the 28 gates defined from the governing text

Written 2026-11-13 (UTC) by workstream bt-gates. Source of every requirement below: `BIBLE/plan-clean.txt`, the 144-page "Gettysburg Total War animation plan, version 2" (marker `=== PAGE n ===` equals the printed "page n of 144"). Read for this file: Part E, THE UNBREAKABLE LAW and Sections A-Z (pp. 132-138), the Section Q gate table (p. 136), the sub-requirement model of Section F (p. 134), the Section Z checklist (p. 138), Appendices A, B, E and F (pp. 138-139, 142-143), and the Part B, C and D passages that each gate points to. Project rules come from `CLAUDE.md`; decisions from `GOVERNANCE/decision_log.md` and `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md` (DD-nn). Companion: `GATE-SPEC-B.md` (the same gates seen from the code: what exists, what is missing).

What this file is: the definition a runner must implement and a reviewer must apply. It sets no `passes` flag, runs no gate, edits no data and lowers nothing. A number quoted here was read from a named page or file. Where the plan gives no number the file says "the plan gives no figure" and marks anything it adopts as ADOPTED-PROVISIONAL with the reason; it is never presented as the plan's.

**Ambiguity rule.** Where the text can be read two ways, this file takes the reading under which fewer items can reach PASS (the stricter reading) and lists the ambiguity in section 8 as A-nn. The looser reading is never used silently.

**Key rulings in one place** (grounds in sections 1 and 8):
1. `passes=true` needs every applicable gate of the sub-requirement to give PASS and the class rule of section 3 to hold; a gate verdict of PASS is necessary and never sufficient (U-01, A-02).
2. A link to an open register entry is never a pass. A non-passing sub-requirement is LINKED, or LINKED-ACTIVE when its entry is complete, marked in the product, backed by a dated search of the acquired library and implemented as a reconstruction (L3); Q18 counts PASSING or LINKED-ACTIVE (1.5, U-04, A-03, A-05).
3. A tier is only as high as its evidence status allows: `documented` needs a non-lead source whose short extract the runner re-matches at run time; open-gap content, failed lookups, unsupported claims and lead-only support never pass (1.3, U-02).
4. Each state-schedule row is judged by the gates of every object it names; an object no gate covers (a road, a cemetery ground) blocks the row; an empty domain is never a pass (2.4, U-03).
5. A top-level `.0000` row passes only when its gates and the plan's own requirement tests (section 5) pass and every child is PASSING; R03.0000 never passes; coverage of a top-level row is derived from its children (3.9, A-40).
6. A threshold the plan does not give is either an existing value adopted as a floor under a recorded delegated decision (DD-G01 to DD-G06) or UNSET, and an unset one makes the gate INCOMPLETE (1.8, section 7).
7. Anything that needs the real GPU, a listener, the owner's caps or a purchase is NOT-RUN or INCOMPLETE here, listed as owed, never claimed (U-10, U-16).

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
- **U-03 No vacuous pass.** An empty domain gives BLOCKED-INPUT, never PASS. An S-R whose every listed gate is N/A for it cannot pass by that; it needs the domain gate of 2.4 to pass, otherwise it stays LINKED.
- **U-04 Linked is not passing.** "Every sub-requirement passing or linked to an open register entry with an active reconstruction" (p. 134, F; p. 136, Q18; p. 138, Z.1) are two different states. A link never turns a FAIL, NOT-RUN or COVERED item into PASS (A-03).
- **U-05 No lowering, no skipping.** "Never lower a threshold to pass" (p. 136, Q). A gate, threshold, scenario, row or class is never narrowed, disabled or skipped to make an item pass (p. 138, Z "lowering a threshold to pass"; Law cl. 1, 8).
- **U-06 Scope of time.** The whole window: 1863-06-26 00:00 through 1863-07-14 23:59 local mean time (LMT = UTC minus 5 h 09 min, p. 111, B.10.2), plus the epilogue days 1863-11-18 and 1863-11-19. The start is June 26 (p. 136, O.3), the end is the owner's chosen end, the notes covering the retreat through about July 14 (p. 137, T.4), and the epilogue is R22 (p. 133, A; pp. 116-117, B.12). Narrowing is an owner decision (p. 130, D.8.2.2; DD-20 keeps the full window). All three days and all nights are in scope (p. 138, Y.12).
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
- **U-17 Delegated defaults.** The owner delegated the default view of conflicts on 2026-11-11 (DELEGATED-DECISIONS header). A default chosen under that delegation is the default for Q02, Q19 and class CF only while (a) it is recorded as the entry C-nnn of section A of the delegated decisions (called DD-C-nnn in this file) and as `conflicts.C-nnn.default_scenario_id` in `decisions/conflict_defaults.json`, (b) the product labels it "Default chosen under delegated authority, reversible by the owner" with its tier, (c) the PDF default and every other value stay selectable. The word DECIDED is never written to `decision_log.md` for it.
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

- **Scenario.** A function from every conflict C-001..C-047 (and the further conflicts the plan prints elsewhere, A-31) to one of its values: the "All values" column of the register (pp. 62-63, B.2.5). Two scenarios are always in the set: the PDF recommended defaults (the "Recommended default" column, still PENDING OWNER) and the delegated defaults (`decisions/conflict_defaults.json`, a project decision of 2026-11-11, not the plan's). Every value stays selectable (p. 62: "no alternative is deleted; every value ... remains selectable").
- **S\*** (the scan set). The assignment of values to conflicts is expanded as the full Cartesian product inside each interaction group (conflicts that reach a common unit, event, object or channel; the product's `layer.meta.linkedConflicts` and the ledger's gate chains give the groups) and independently across groups. The runner emits the group structure and the argument that the checked property factors over groups. Additionally S\* contains the two extremal scenarios (every conflict at its earliest value, every conflict at its latest) and both named defaults. A property that does not factor over groups is checked on the full product.
- **Time grid.** Every integer minute LMT of the window of U-06, plus both sides (minus one second, plus one second) of every window boundary of every event, state change, arrival, departure, sunrise, sunset, moonrise, moonset and light-source start or end. "Every time" in a gate text means this grid. Rows without a clock minute (295 `phrase_only`, 1 `no_date` in `timeline_windows.jsonl`) are tested on the bounds of their date or part-of-day window and on a seeded sample inside it (A-18).
- **Entity classes.** Soldiers (including officers, colour bearers, musicians, stretcher bearers), horses (ridden, led, draught), guns, limbers, caissons, wagons, ambulances, forge and battery wagon, flags and guidons, casualties on the ground, hospital contents, effects and sounds caused by a unit's actions. A gate that says "no entity" or "every unit" covers all of them in one scan.

### 1.7 Result records and the `passes` protocol

A run writes `GOVERNANCE/gate_results/runs/<UTC stamp>-<gate>/result.json` and updates `GOVERNANCE/gate_results/latest/<gate>.json`. Minimum fields:

```
{ "gate": "Q07", "checks": ["Q07.1", ...], "run_id": "...", "started_utc": "...", "finished_utc": "...",
  "renderer_class": "node|python|swgl|gpu", "tool_versions": {...},
  "inputs": [ { "path": "...", "sha256": "..." } ],
  "thresholds": [ { "id": "T-Q10-1", "value": ..., "decision": "DD-G03" } ],
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

## 2. The sub-requirement model and its classes

### 2.1 What the plan says (p. 134, F)

Each sub-requirement has `id`, `requirement_id`, `text`, `source_status`, `register_ids`, `gate_ids`, `passes` ("true only when its gate test passes") and `owner_decision_ids`. "You may change only `passes` and links; you may add sub-requirements; you may never delete or reword one. Every commit message references the sub-requirement IDs it advances. A coverage report must show that all 21 requirement IDs have sub-requirements, and that 100% of sub-requirements are either passing or linked to an open register entry awaiting an owner decision with work continuing on the best reconstruction; anything else is unfinished work, not an exception." The requirement count is 22 (R22 added after review: p. 133, A; p. 123, D.1 V15; p. 143, App. E; p. 136, Q28), which A-01 settles.

"Expected sub-requirement populations (generate them from the data, do not hand-type): one per regiment, battery and troop for kit (R10, R17); one per timeline row (R11); one per structure and per state change (R13, R14); one per terrain source (R12); one per vegetation polygon class (R20); one per library source batch (R21)."

### 2.2 The classes in `requirements.json` on 2026-11-13

| Code | Class | Ids | Count | `gate_ids` | Underlying data |
|---|---|---|---|---|---|
| TL | Timeline rows | R11.0001 to R11.0691 | 691 | Q17, Q12 | `timeline_seed.jsonl`, `timeline_verified.jsonl`, `timeline_windows.jsonl` |
| EP | Epilogue rows (B.12.2) | R22.0001 to R22.0014 | 14 | Q28, Q17 | `epilogue_seed.jsonl` (E-001 to E-014) |
| SS | State-schedule entries | R14.S-001 to R14.S-088 | 88 | Q07, Q09 | `structures/state_schedule.json` (S-001..S-079 from B.8.7, S-080..S-088 from B.12.3) |
| WK | Construction chronology | R14.E-01 to R14.E-18 | 18 | Q08 | `structures/structures.json`, `works_stages.json` |
| GE | Gun emplacements | R13.G-01 to R13.G-18 | 18 | Q14 | `structures.json`, `kit/artillery_batteries.json` |
| PE | Pre-existing features | R13.P-01 to R13.P-14 | 14 | Q03 | `structures.json` |
| CT | Terrain source catalogue | R12.001 to R12.045 | 45 | Q25, Q16 | B.9 tables 1 to 5 (pp. 104-109), `library/status*.json` |
| CF | Source conflicts | R03.C-001 to R03.C-047 | 47 | Q02, Q19 | `conflict_register.json`, `conflicts_structured.json`, `decisions/conflict_defaults.json` |
| TOP | Top-level acceptance | R01.0000 to R22.0000 | 22 | the requirement's gates (App. E) | n/a |
| OA | Owner chat additions | OA01.0000 to OA09.0000 | 9 | none | owner chat, `decision_log.md`, DD-nn |
| | Total | | 966 | | |

The timeline rows map to R11 ids in table order (R11.0001 = T1-001, R11.0226 = T2-001, R11.0474 = T3-001, R11.0501 = T3-028; T3-131 is absent). Timeline rows are `T1` 225, `T2` 248, `T3` 218.

### 2.3 Populations the plan expects that `requirements.json` does not have

Q18 (p. 136) and Section F (p. 134) make these part of "all requirement IDs have sub-requirements". Today they are missing, so Q18 cannot pass (A-11). A runner reports each as `FAIL: population missing`, and the generator (not in this workstream's ownership) must create them from the data without hand-typing:

| Plan population (p. 134, F) | Requirement | Source data | Count today |
|---|---|---|---|
| one per regiment, battery and troop for kit | R10, R17 | the verified OOB (Q01); `kit/kit_specs.json` 135 units, `kit/artillery_batteries.json` 125, `kit/cavalry_units.json` 62; `history/units.json` 726 units | 726 units at least |
| one per structure | R13 | `structures/structures.json` 130 records by id prefix (`bld` 41, `E` 18, `G` 18, `FEN` 16, `P` 14, `WS` 9, `RD` 8, `ENV` 4, `GROUP` 1, `PERSON` 1) plus 23 hospital sites in `structures/hospitals.json`; R13.P (14), R13.G (18) and R14.E (18) already exist | 80 records have no sub-requirement of their own (41 buildings, 16 fences, 9 epilogue states, 8 roads, 4 environment objects, 1 group, 1 person), plus 23 hospital sites |
| one per state change | R13, R14 | the S rows exist (88); the schedule rows with several objects or phases carry one state change each | covered by SS |
| one per vegetation polygon class | R20 | `vegetation_states` classes (field, woodlot, orchard, yard; crop and tree classes) | none exist |
| one per library source batch | R21 | Appendix C.1 rows and `library/status*.json` batches | none exist |

### 2.4 Domain gates for state-schedule rows (class SS)

The two listed gates (Q07, Q09) do not fit every S row: the schedule names fences, buildings, hospitals, works, gun emplacements, environment objects, a person, a road and nine epilogue states. Counted by object-id prefix in `state_schedule.json`: `bld-` alone 21, `H-` and `bld-` 14, `E-` 12, `WS-` 9, `FEN-` 6, `G-` 6, `H-` 4, `ENV-` 3, `FEN-`+`bld-` 3, `E-`+`G-` 2, one each of `P`, `E`+`FEN`, `ENV`+`FEN`, `FEN`+`P`, `GROUP`, `PERSON`+`bld`, `P`+`bld`, `RD`+`bld`; two rows are `out_of_battle_scope` (S-078, S-079).

An S row is judged by the gates of **each object it names**, by prefix. The row passes only if every object passes (A-12).

| Object-id prefix | Meaning | Gates that judge the state change | Also |
|---|---|---|---|
| `bld-` (with `#part`) | building, barn, house, church, station, gatehouse | Q09 | Q03.3 (exists on its date), Q23 |
| `H-` | hospital site | Q09 (use state) and Q26 (activity in its interval) | Q03.3 |
| `FEN-`, `P-01`..`P-14` | fence, wall, gate | Q07 | rule PE for the P ids |
| `E-` | earthwork, breastwork, barricade | Q08 | Q04 for the builder unit |
| `G-` | gun emplacement | Q08 when prepared; Q14 | |
| `WS-` | epilogue state S-080..S-088 | Q28 | Q07 for a fence or wall in the state (S-082 iron fence, S-084 broken fences); Q21 for ground cover (S-084, S-085); Q11 and Q22 for S-086 sun and sky |
| `ENV-` | environment object | by channel: crop (S-033) Q21; water and weather (S-069 Plum Run) Q22; a held position (S-067 withdrawal) Q04, Q05, Q06; a cemetery ground (S-045, with a `FEN-` object): Q07 for the fence part; the ground part has no gate, BLOCKED-INPUT (A-12) | |
| `GROUP-` | group of sites (S-070 hospital sites in cold rain) | Q26 and Q22 | |
| `PERSON-` | a named person (S-072 Armistead dies on July 5) | Q26 (casualty flow) and Q02 | |
| `RD-` | road or railroad (S-076 traffic resumes July 10) | none: no PDF gate judges a road state. BLOCKED-INPUT until a road-state check is defined (A-12) | Q03.3 |
| any other prefix | | BLOCKED-INPUT: the mapping table is extended by a recorded decision, never by treating the row as N/A | |

**Out-of-window rows (S-078, S-079; also any later row such as the 1895 and 1910 fires).** The transition lies outside the window (p. 102, B.8.7: "Not part of the battle animation"). The item is a negative check: for every grid time in the window the object's state equals `from_state`, the info card states the later date with its source, and the product never draws the transition. PASS needs that and the evidence status of 1.3.

**Rows the engine must never schedule** (p. 102, B.8.7, last paragraph): the McPherson barn does not burn on July 1 or at any time in the battle; the Bliss buildings do not burn on July 2; the Emmitsburg Road fences are not destroyed before July 2-3; no avenue exists before the park era. They are global assertions of Q09 (the first two), Q07 (the third) and Q03.4 (the fourth) and fail the gate if violated, whatever the row-level results.

### 2.5 Which gate judges which class

| Gate | TL | EP | SS | WK | GE | PE | CT | CF | TOP | OA |
|---|---|---|---|---|---|---|---|---|---|---|
| Q01 | | | | | | | | | R04, R10 | |
| Q02 | | | | | | | | yes | R03 | |
| Q03 | | | | | | yes | | | R02, R04, R10, R13, R17 | |
| Q04 | | | | | | | | | R16, R17 | |
| Q05 | | | | | | | | | R17 | |
| Q06 | | | | | | | | | R17 | |
| Q07 | | | yes | | | | | | R02, R13, R14 | |
| Q08 | | | | yes | prepared | | | | R02, R05, R13, R14 | |
| Q09 | | | yes | | | | | | R02, R13 | |
| Q10 | | | | | | | | | R18 | |
| Q11 | | | | | | | | | R15, R18 | |
| Q12 | yes | | | | | | | | R01, R07, R11, R19 | |
| Q13 | | | | | | | | | R03, R06 | |
| Q14 | | | | | yes | | | | R03, R04 | |
| Q15 | | | | | | | | | R01 | |
| Q16 | | | | | | | photographs | | R02, R12 | |
| Q17 | yes | yes | | | | | | | R05, R07, R11 | |
| Q18 | | | | | | | | | R01 (all) | |
| Q19 | | | | | | | | yes | R03, R21 | |
| Q20 | | | | | | | | | R04, R16 | |
| Q21 | | | | | | | | | R20 | |
| Q22 | | | | | | | | | R15 | |
| Q23 | | | | | | | | | R03 | |
| Q24 | | | | | | | | | R01, R19 | |
| Q25 | | | | | | | yes | | R08, R12, R21 | |
| Q26 | | | | | | | | | R05, R13 | |
| Q27 | | | | | | | | | R08, R09 | |
| Q28 | | yes | S-080..S-088 | | | | | | R22 | |

Gate checks run over their whole scope, not only over the items that carry the gate id. For example Q04 scans every unit and every entity class although only R16.0000 and R17.0000 carry Q04; a TL row passes Q17 and Q12 only when Q04, Q05, Q06 and Q23 also hold for the units and content it realizes (3.1, TL-7).

---

## 3. Pass rules per class

Each class lists: the item, the evidence status the underlying row needs, the conditions that together give `passes=true`, how a link counts (LINKED, not passing), and what is never passing. "Registered" always means an entry of L3 (1.5) unless the text says L1. Class rules add to, never replace, 1.2 U-01 and U-02.

### 3.1 TL: timeline rows R11.0001 to R11.0691

**S-R text.** "Timeline row T1-001 (tier documented) has a visual realization or an open register entry." The tier in brackets is the seed tier.
**Underlying row.** `timeline_seed.jsonl` (`id, page, tier, time_window_raw, text_raw`), `timeline_verified.jsonl` (`tier, status_effective, citation, passage_ref, register_refs, or_recheck`), `timeline_windows.jsonl` (`earliest, latest, default, parse_status, band`).
**Gates.** Q17 (item: the row), Q12 (item: the row's seek targets). Q04, Q05, Q06, Q23, Q10 apply to the content the row realizes (TL-6, TL-7, TL-10).

- **TL-1 Effective tier.** 1.4. Information on 2026-11-13 (not a rule): seed tiers documented 580, inferred 55, open gap 44, plausible-procedural 12; after DD-08 and DD-09 the overlay holds documented 452, inferred 144, open gap 76, plausible-procedural 19. `status_effective`: verified_against_or_text 265, partially_verified 200, gap 130, inferred 44, failed_lookup 22, claim_unsupported_by_or_text 22, recheck_failed 8.
- **TL-2 Row kinds and the meaning of "visual realization".**

| Kind | Description | What counts as the realization |
|---|---|---|
| K1 scene event | units, guns, people, vehicles at a place | scripted scene content in the layer: a presence, arrival, march, deployment, fire, activity or state event, at a time inside the row's window in the scenario, for units contained in the row's Units cell, at a place within the row's Place cell (to its position uncertainty) |
| K2 environment | weather, sun, moon, fog, wetness | the environment channels hold the row's value at the row's time (Q22, Q11) |
| K3 structure or hospital | a named object changes state | the object's state change (the same item as the SS row; Q07, Q09, Q26) |
| K4 context | an order, decision or event with no scene consequence (an administrative decision, an off-field act) | none by itself: a card in the Events list is not a visual realization. A row with a verifiable scene consequence (for example T1-001: two wagons per brigade shows as the train of each brigade) is K1, not K4 |
| K5 open gap | the row says what is missing | the marked gap in the evidence layer (p. 9, B.2); no behaviour |
| K6 night | the row carries NIGHT | K1 to K3 plus Q10 at the row time for every unit and activity in view |

  A **realization record** (format owned by the realization workstream) holds `row_id`, `kind`, `realized: [{t_start, t_end, subjects[], probe, expected, observed_ref}]`, `scenario_set`, `register_ids`. It is **valid** when the Q17 query harness runs `probe` at the stated times, in every scenario of the row's conflict group, and `observed` equals `expected`, and `t_start..t_end` lies inside the row's window for that scenario. The canonical time is the midpoint of the documented range unless a participant's primary report exists (p. 9, B.2: an engine rule, not a historical claim).
- **TL-3 Evidence status needed.** Effective tier documented: `verified_primary`. Inferred: `verified_inferred`. Plausible-procedural: `procedural_registered`. Any other status, or effective tier `open gap`: no pass. The runner re-matches the row's `citation` and `passage_ref` quote in the stored source text at run time (tmp/library/or27 through `tools/bt/or27_find.py`, or the named non-lead source); a stored `verified` flag is not evidence.
- **TL-4 Realization.** Q17.2 valid for kinds K1, K2, K3, K6. K4 and K5 never pass.
- **TL-5 Scrub (Q12) per row.** Seek targets: the row window's earliest, default and latest. Rows with no clock minute (`phrase_only`, `no_date`): the bounds of the date or part-of-day window and three seeded interior times. For each target and each scenario of the row's group: the state digest after a random-access seek equals the digest after sequential playback at that time, and the round trip A to B to A returns the identical digest (p. 4 coverage map 12: "scrubbing round trip is bit-identical"); no unit pops.
- **TL-6 Units.** Q04, Q05, Q06 hold for the row's units at the realized times: nothing before its arrival window, speeds within range, a continuous path from the previous position.
- **TL-7 Marking and independence.** Q23 holds for the realized content (tier flag shown). A documented row whose datum has one independent source carries the visible flag "single source" (Q19); a visible datum with two independent non-lead sources needs none.
- **TL-8 Conflicts.** Every value of every conflict named in the row's conflict column (C-nnn) is a selectable scenario and the realization record is valid under each value, or the record states which values it excludes and why. The row is shown as a window, not a falsely exact minute (p. 124, D.2 V4).
- **TL-9 Passes.** TL-3 and TL-4 and TL-5 and TL-6 and TL-7 and TL-8.
- **TL-10 Linked (not passing) when** any of TL-3 to TL-8 cannot be met: effective tier open gap; status partially_verified, gap_registered, failed_lookup, claim_unsupported or lead_only; kind K4 or K5; realization absent or invalid; Q12 or Q10 not run. The entry must be L3. For an open-gap row the entry is the one the plan's gap table names: "Gaps and sources to acquire" (T1 p. 22; T2 p. 38; T3 p. 57) with the settling source, and `searched` shows that source was read or was unreachable (negative result with host and date). For a plausible-procedural row the entry holds the exhaustive search (Law cl. 3a).
- **TL-11 Never passing.** A row whose realization is a card only; a row realized by an unmarked procedural fill; a row that is `K5`.
- **TL-12 Gate-level coverage versus passing.** Q17 is a coverage gate: a K4 or K5 row with an L3 entry is COVERED (gate verdict PASS can include it), and its S-R stays LINKED-ACTIVE.

### 3.2 EP: epilogue rows R22.0001 to R22.0014 (E-001 to E-014, B.12.2)

**S-R text.** "Epilogue row E-001 (PDF tier documented; sources are encyclopedia/blog leads, so verify before use) is realized or registered." **Gates.** Q28, Q17. **Underlying row.** `epilogue_seed.jsonl`.

- **EP-1 Evidence.** The rows cite W-CONS (a Wikipedia article that flags several of its own claims), GC-COMP (a student blog post) and EWH (a popular compilation page): all leads (p. 117, B.12 "Evidence quality"; p. 134, E.1, E.2). Effective tier documented needs a non-lead source read in the audit: Hale's report, the Associated Press and Philadelphia Press reports (Chronicling America), the Lincoln manuscripts and papers (Library of Congress), NPS and ABT pages, Lamon, Hay, Nicolay, Wills papers (p. 117: "They are the Phase 1 targets for this section"; p. 118, B.12.5). Until read, the row is `lead_only` and cannot pass.
- **EP-2 Lincoln items.** Where a row states anything about Lincoln's clothing, voice, wording, seat, horse or manner, the item passes only if each such attribute has two independent non-lead sources read in the audit, otherwise the product marks it "reconstruction" (render_flag 1 or 2) on screen and in the card (p. 136, Q28). The wording of the Address shown is a selectable alternative in the conflict register (A-31); the default is the text reporters printed on the day, the revised copies stay available (p. 118, B.12.4).
- **EP-3 Conflicts carried.** E-004 start (09:30 or about 11:00), E-005 arrival (about noon), E-006 start (derived backward from the 16:00 end; the range flagged), E-007 weather (cloudy clearing at the prayer, default, versus a perfect morning), E-010 order (hymn after Everett or Glee Club ode before Lincoln, both selectable), E-011 reaction (muted default, applause alternative) and wording, E-013 salute (one source). Each is a selectable scenario with its sources.
- **EP-4 Film path.** The jump is a presentation device, labeled in the viewer as a time jump (p. 117, B.12.1); the chapter is its own time chapter on the scrubbable timeline; the viewer can leave the front-row viewpoint; the default path goes from the end of July 4 to November 19; rows T3-168 onward remain scrubbable as optional chapters and are not on the default film path (p. 117).
- **EP-5 Passes.** EP-1 (effective tier and evidence), EP-2, EP-3, a valid realization (3.1 TL-2 kinds K1, K2) at the row's time inside the chapter, Q12 over the chapter's seek targets, Q23 marking, and the Q28 per-row checks (tier present). Linked when any fails, L3 entries as in 3.1 TL-10 (EG-0022 and EG-0120 exist for the Lincoln gap and the Address).

### 3.3 SS: state-schedule entries R14.S-001 to R14.S-088

**S-R text.** "State-schedule entry S-001 changes state at its documented window." **Gates.** Q07, Q09 as listed; the gates that actually judge a row are those of 2.4 for each object it names.

- **SS-1 Domain.** Every object named by the row passes the gates of 2.4. A row with an unmapped object, or an `RD-` object, cannot pass.
- **SS-2 Evidence status.** Documented tier: `verified_primary` for the transition and its window (the schedule's `claim_support_verified` must be true and re-matched). A row whose every cited key is weak (Wikipedia, Stone Sentinels, forums, the blogs the plan flags) was already lowered to inferred by the structures workstream (`tier_reason`: "downgraded: PDF printed documented but every cited key is weak"); it needs `verified_inferred` (reasoning and verified premises) to pass. A row with tier `contested` carries every value as a selectable scenario.
- **SS-3 Window.** `time.window = [earliest, latest, default]`. A clock window: the change is shown inside it. A date-only or "morning" window: "the window is the plain reading of the source and the entry is flagged" (p. 100, B.8.7 header); the flag is visible in the product and the row cites its source for the date. `earliest` not printed ("by X"): the change is placed at the latest bound and flagged. Windows are never reversed and never invented.
- **SS-4 State function.** For every grid time and every scenario `state_at(object, t)` equals `from_state` before the window, `to_state` after it, and a transitional state inside it. Backward scrubbing reverses every transition (p. 100, B.8.7). Progressive states (burning, a work rising, a fence breaking) are progressive in the draw state; the transition is visible: the draw state before the window start differs from the draw state after its end, and at least one intermediate draw state or a progressive parameter exists strictly inside any window longer than one minute. For a point change the visible span is the product's declared transition duration, a recorded threshold (T-SS-1).
- **SS-5 Shown.** The object is drawn in the state at that time (draw list and, for a software-GL sample, pixels). An object with no geometry (the structures README counts 11 records without geometry and 5 with only a point) fails; it must be modelled (Law cl. 1: "too many fences" is never a reason).
- **SS-6 Cause.** Where the plan names a cause the cause appears in the window: soldiers pulling rails, shell strikes, crossing and breaking of fences (p. 137, V.2), the 14th Connecticut firing the Bliss buildings (p. 137, V.4), wounded arriving at a hospital, the builder unit at a work. An unsourced cause is shown plausible-procedural and marked.
- **SS-7 Conflicts.** The date flags and conflicts are scenarios: S-001 June 26 or 27, S-037 Sherfy barn (C-026), S-077 Camp Letterman opening (C-044), S-062 fence loss times.
- **SS-8 Passes.** SS-1, SS-2, SS-3 (flag shown where required), SS-4, SS-5, SS-6, SS-7, and the global assertions of 2.4 hold.
- **SS-9 Linked (not passing).** A flagged window whose source is unresolved with an L3 entry (COVERED in Q07 and Q09); an undrawn object; an `RD-` row; a row whose transition has only lead support.
- **SS-10 Out-of-window rows** (S-078, S-079): 2.4, passes on the negative check plus the evidence status of the stated later date.
- **SS-11 Epilogue states** (S-080 to S-088, B.12.3): judged by Q28 (a tier on every state; the conflicts S-081 start date October 17 or 27, S-083 platform position carried as scenarios; S-085 and S-086 are `inferred` with the reasoning shown, S-086 derived from the ephemeris at 39.82 N in the PDF versus 39.83 N in B.10.2, A-17), plus Q07 for fences and Q21 for ground cover. Q07 and Q09 are N/A for them unless the state names a fence or a building.

### 3.4 WK: construction chronology R14.E-01 to R14.E-18

**S-R text.** "Construction chronology entry E-01 is built on screen, never pre-placed." **Gate.** Q08. The text is a catch-all; the row's own B.7.2 content (pp. 90-92) fixes its type, and the check follows the type (A-15).

| Type | Rows (B.7.2) | Check |
|---|---|---|
| Construction | E-01 Seminary rail barricade, E-02 Culp's Hill north slope (6th Wisconsin, about a dozen spades), E-03 123rd NY works, E-04 Cemetery Hill "fortified" (method and time unknown), E-05 Greene's main line (about 06:00 July 2, 3 to 4 h, about 5 ft, about 300 yd), E-06 traverse, E-07 Kane and Wadsworth's men, E-08 Williams's division (Lockwood position an open gap), E-09 extension at 18:30 (about 800 yd), E-12 East Cemetery Hill lunettes (builder unknown, existing by about 16:00), E-14 Weed's stone breastworks | Q08.1 to Q08.4, Q08.7 |
| Occupation | E-10 Steuart's brigade in the empty lower works after dark July 2 ("Occupation, not construction") | the works exist from E-05, E-07 and E-08, are empty from 18:30 until the occupation, the occupying units pass Q04, no construction animation |
| Damage | E-11 shelling and retaking on July 3 (about 04:00 to 11:00) | stage 6 "damaged" appears inside the window, shelling events by the named batteries |
| No construction | E-13 Vincent's brigade (natural ledges), E-15 Hazlett's guns hand-hauled (no prepared emplacement), E-16 Ward and Smith at Devil's Den (no works) | no work object exists at that place at any time in any scenario; the guns and units appear as the G rows say; the "no works" fact is marked |
| Open gap | E-17 rail works on Cemetery Ridge (PDF: "No source found ... Do not animate rail piles as documented"), E-18 Confederate works | nothing drawn as documented; anything drawn is flagged plausible-procedural; the gap marker is shown |

- **WK-1 E-17 and the delegated decision.** DD-02 chose "built on screen in the Official Records window; PDF wording kept as scenario" (Hancock OR27-1-R076 p. 370; Gibbon R098 p. 416). The row then follows the construction type, with documented existence and materials and plausible-procedural dimensions registered. The PDF reading is a selectable scenario in which nothing is drawn as documented. E-03 (DD-03: morning of July 2 instead of July 1) and E-05 (start conflict: night of July 1-2 or about 06:00) are scenarios the same way; DD-04 and DD-05 change G-03, G-11, G-12, G-18, P-14 (see 3.5, 3.6).
- **WK-2 Evidence status** by component, as the row prints it (for example E-01 "documented (existence, method); inferred (start window)"): each component needs its status of 1.3. Weak-source-only components (E-04 "Soft", Wikipedia) are `lead_only` until a non-lead source is read.
- **WK-3 Crew (Q08.3).** The builder unit named in the row is the crew (present by Q04); the tool count is the printed one (E-02: about a dozen spades; the tool count is capped at 12 for that regiment, p. 93, B.7.4); where the builder is unknown the work is built on screen "by a labeled stand-in crew" flagged "builder unknown" (p. 90, B.7.1; E-12, E-04).
- **WK-4 Passes** (construction type): Q08.1 to Q08.4 and Q08.7 PASS, WK-2, Q23 marking of every plausible-procedural parameter (B.7.4 labeled assumptions 1 to 5: stage shares, regiment offsets, thickness and profile, the Seminary barricade height and rails, tool mix), scenario coverage. Other types pass on their check in the table plus WK-2.
- **WK-5 Linked (not passing).** E-18, E-17 while only the PDF reading is accepted, E-04 on lead support, rows whose builder, time or position is an open gap, works not yet drawn (a registered unfinished build).
- **WK-6 No modern profile.** No 1863 profile is derived from modern rebuilt works (Culp's Hill, Little Round Top, Cemetery Ridge walls 48 to 52 in.; p. 94, B.7.6; p. 134 CLAUDE.md hard rule). The profile is the qualitative one (log close-fence with stone and earth, about 5 ft), tier inferred.

### 3.5 GE: gun emplacements R13.G-01 to R13.G-18

**S-R text.** "Gun emplacement G-01 carries gun type/count and prepared-vs-improvised state." **Gate.** Q14 as listed. Section 4, Q08 also names gun emplacements, so prepared emplacements also pass Q08 (A-13).

- **GE-1 Record.** Each G record holds the gun type(s) and count(s) with sources and tier, the state as the PDF prints it (prepared, improvised, "no works described"), the positions by time (B.6.14.7, p. 81) and the battery's presence window. Ranges stay ranges where the plan prints them: G-11 6 to 23 guns as batteries arrived and left; G-13 about 80 to as many as 120 Union guns; G-14 138 to 179 estimates, reasoned 142 to 155 (p. 94, B.7.5); G-16 Hurt's guns (two Whitworths plus two 3-inch rifles, versus Miller's two guns near the Peach Orchard) as a conflict.
- **GE-2 Q14 item.** The piece type is in the verified weapons table; the count at each grid time equals the verified battery table for that battery (a documented range stays a range); no gun exists before the battery's arrival (Q04) or after a documented loss.
- **GE-3 State rules (p. 94, B.7.5 "Engine rules").** Prepared emplacements (G-03 lunettes, G-12 in-line ridge battery) are built on screen like any work (Q08). Improvised positions (G-01, G-05, G-06, G-07, G-10, G-11) get no earth: guns unlimbered on natural ground with trail marks, hand-hauling or prolonge retirement where sourced. "No works described" positions are open-ground battery positions logged as a gap. DD-04 (Stevens' Knoll earthworks for G-18, per-gun small earthworks for G-03 on the evening of July 1, G-11 split into 11a improvised and 11b a slight earthwork on July 3, G-12 no earthwork at Cushing with the wall pre-existing) is applied as the default with the PDF reading selectable; both pass their checks.
- **GE-4 Evidence.** Documented components need `verified_primary` from the Official Records reports (Hunt, Wainwright, Alexander, Cabell, Carter, Hazard, Whittier and others, local in tmp/library/or27), not Wikipedia, Stone Sentinels, HistoryNet or forum keys (the plan says several G rows rest on them). Conflicts (G-10 losses 65 horses or 80 of 88) are scenarios.
- **GE-5 Passes.** GE-2 and GE-3 and GE-4, Q04 and Q06 for the battery and its train, and Q23 marking. Linked (not passing): a "no works described" gap with only a logged gap, a count that is only a PDF range with no verified battery table, an emplacement not yet drawn.

### 3.6 PE: pre-existing features R13.P-01 to R13.P-14

**S-R text.** "Pre-existing feature P-01 is present at frame one, never animated as construction." **Gate.** Q03 ("every 1863 structure exists on its date"). **Source.** B.7.3 (p. 92), B.7.1 (p. 90).

- **PE-1 Present at frame one.** In every scenario the object exists at the first grid time (1863-06-26 00:00) with progress 1 and has no construction state, mesh or clip at any time. The Angle wall is the clearest case (P-01; p. 90, B.7.1).
- **PE-2 Damage only as sourced.** P-04: damage by fire or trampling only if sourced. P-10 (Emmitsburg Road double post-and-rail fences, Peach Orchard and Wheatfield fences and walls): destruction is handled by the B.8.7 schedule (class SS, S-062 and neighbours), never by construction. P-12 (unfinished railroad grade and cut) is terrain, not construction; the cut dimensions are an open gap. P-13 height: 24 in. (a critic) against the rebuilt 48 to 52 in. is a conflict carried as scenarios; the rebuilt walls are never the source of an 1863 profile (p. 97, B.8.3; p. 94, B.7.6).
- **PE-3 Evidence status.** P-01 and the other documented rows need a non-lead source (NPS-Angle is non-lead; Wikipedia and Stone Sentinels keys are leads). P-02 and P-14 are `inferred`: `verified_inferred`. DD-05 leaves the two P-14 walls (Chamberlain's sharpshooter wall, 20th Maine Company B) an open gap while walls documented as built get construction states under class WK.
- **PE-4 Passes.** PE-1, PE-2, PE-3, Q03.3, Q23 marking, and no work or segment of class WK overlaps the object's geometry with a construction state. **Linked (not passing).** P-14's two walls; any P row on lead support only.

### 3.7 CT: terrain source catalogue R12.001 to R12.045

**S-R text.** "Terrain source catalog item #1 has a status and is used or registered." **Gates.** Q25, Q16. **Items.** B.9.1 (p. 104): Table 1 maps and drawings #1 to #13, Table 2 park GIS, reconstructions and restoration studies #14 to #20, Table 3 modern geodata #21 to #31, Table 4 photographs, paintings and documents #32 to #41, Table 5 ecology and orchard sources #42 to #45. Each item carries a reliability tier R1 to R4 (p. 104) and a licence column.

- **CT-1 Status.** The item has exactly one terminal status in `library/status*.json`: `ingested`, `blocked` with an open register entry id, `scheduled` with a reason and a queue entry, or `print-only` with an acquisition-target register entry (p. 126, D.4.3 stage 14 names read, blocked with reason, print-only as terminal). The status words of D.2 V5 (p. 124: read, partly read, blocked, print-only) map: read to `ingested`; partly read must be split into an ingested part and a remainder that is scheduled or blocked, each with its own record (A-28).
- **CT-2 Used or registered.** `ingested` is used when a built terrain, structure or vegetation layer names the source id in its `source_ids` ("each terrain layer names its source", p. 5 coverage map 5; p. 123, D.2 O2). An ingested source that no layer uses is registered with the reason (for example "resolution too coarse"). The register branch ("or registered") makes the item LINKED, not passing.
- **CT-3 Q16 domain.** Q16 judges only items whose Type is photograph (Table 4: #32 Gardner, O'Sullivan and Gibson, #33 LOC Civil War Photographs, #34 Frassanito rephotography, #35 NPS Then and Now, #36 Tyson and Tipton, #37 Perisho, and any other item of Type Photographs). For them Q16 passes only when at least one of the item's photographs has a documented camera position and a recorded verdict `match`. Maps, geodata and documents are N/A for Q16 and are judged by Q25 alone (Q25 is applicable to all 45, so no vacuous pass, U-03).
- **CT-4 R4 sources.** An R4 source (artistic or composite work, forum or blog claim: #20 game and model maps, #40 the Philippoteaux Cyclorama) is never the sole basis of any object ("Never the sole basis for any object", p. 104).
- **CT-5 Passes.** CT-1 with status `ingested` (all of it), CT-2 used, rights recorded for the source (p. 134, G.4: "record rights"), tier R1 to R4 recorded, CT-3 where in domain, CT-4. **Linked (not passing).** Every `blocked`, `print-only`, `scheduled`, partial and ingested-but-unused item, each with an L3 entry that names the next acquisition step (never "for now", Law cl. 1).

### 3.8 CF: source conflicts R03.C-001 to R03.C-047

**S-R text.** "Conflict C-001 (...) carries every value as a selectable scenario; default is an owner decision." **Gates.** Q02, Q19. **Source.** B.2.5 (pp. 62-63): columns "All values (with source keys)", "Recommended default", "Selectable alternatives".

- **CF-1 Record.** `conflicts_structured.json` and `decisions/conflict_defaults.json` hold every printed value (the "All values" cell) and every value the Official Records add (marked "OR, added", for example Humphreys at 01:00), each with source keys, tier and a `scenario_id`; the "Recommended default" (PENDING OWNER) and the delegated default (`decisions/conflict_defaults.json`) are recorded separately; no alternative is deleted (p. 62: "every value in the 'All values' column remains selectable in the viewer"). The recommended default is not always one of the values (C-001: about 01:00 is not in the list); it is stored as a value of its own, tier plausible-procedural (a constructed default: "chosen for coherence ... not because an alternative is disproved", p. 62).
- **CF-2 Selectable and visible.** The viewer's scenario switch lists every value; choosing it changes the downstream state of the units, rows and objects named in `layer.meta.linkedConflicts`; the on-screen source panel shows the chosen value with the rejected ones and their sources (p. 62, B.2.5). Where the default is a range (C-014, C-034, C-046, C-047) the viewer shows the range, not a single figure (p. 63, notes on the register; p. 135, N).
- **CF-3 Default.** The default in the product is the delegated default, labeled "Default chosen under delegated authority, reversible by the owner" with its tier (U-17), or the PDF default where the delegated decision keeps it (eight are plausible-procedural: C-005, C-007, C-012, C-016, C-023, C-026, C-042, C-045 keep the PDF value marked, DEC log 2026-11-11). A conflict with no recorded default has no default view and cannot pass.
- **CF-4 Evidence (Q02, Q19).** Each value has a source key and a tier, an extract where the tier is documented, and for a visible value two independent non-lead sources or a flag. A value that rests on a lead only (C-008 about 09:00 "forum, weak, CWT") is carried as selectable and flagged weak, is never the default and is never shown as documented.
- **CF-5 Register.** One open entry per conflict of category "source conflict" with the competing values (D.7 phase 7 exit test: "every conflict has a register entry", p. 129); L3 for the conflict's linked work. 45 of 47 are linked to an open entry today (L1 at best).
- **CF-6 Downstream.** Every timeline row, schedule row or object named by the conflict passes Q04, Q05, Q06, Q12 under each value.
- **CF-7 Passes.** CF-1 to CF-6 hold. The sub-requirement then lists the delegated decision id in `owner_decision_ids`. If the owner reverses a default, `passes` is recomputed (U-12). **Linked (not passing).** A conflict whose values are not all selectable, whose default is not recorded, or whose downstream rows fail under a value.
- **CF-8 Conflicts the plan prints outside B.2.5.** Several are carried elsewhere (p. 134, E.5 list; B.6.14.1 conflicting values; B.12 epilogue; S-001 June 26 or 27; the Spencer-at-Hanover and requirement-count items of DEC-005). Q02 and Q19 treat them the same way; they have no R03.C row and the gate reports them as `UNREGISTERED CONFLICT` until a conflict id exists (A-31).

### 3.9 TOP: top-level rows R01.0000 to R22.0000

**S-R text.** "Top-level acceptance: all child sub-requirements pass or link to an open register entry with active reconstruction." The gate list of each row is the requirement's gates from App. E (p. 142-143).

- **TOP-1 Coverage (derived link).** COVERED-BY-CHILDREN when every child is PASSING or LINKED-ACTIVE (this is the Q18 coverage condition, A-40). A requirement with no children cannot be covered; a requirement whose expected populations are missing (2.3) is not covered.
- **TOP-2 Passes** when all of: (a) every gate in the row's `gate_ids` has verdict PASS at global scope, restricted to the requirement's scope (Q04 over cavalry units for R16; Q03 over every manifest for R10 and R17); (b) every requirement-level check RC-Rnn of section 5 passes; (c) every child is PASSING (not merely LINKED-ACTIVE); (d) no applicable check is NOT-RUN or owed on the GPU; (e) the C.9 verdict class of the requirement does not forbid it.
- **TOP-3 C.9 verdict classes (p. 121).** "Enormous but possible" (R01, R06, R07 as O1, O6, O7; R09, R12, R15, R19, R21 as V2, V5, V8, V12, V14): all children must pass, no registered remainder. "Possible with labeled reconstruction" (R02, R04, R05, R08, R10, R11, R13, R14, R16, R17, R18, R20, as O2, O4, O5, V1, V3, V4, V6, V7, V9, V10, V11, V13): the remainder generated procedurally and marked may pass as `procedural_registered` content; an open-gap child still blocks (TOP-2c). "Literally impossible" (O3, R03): R03.0000 never passes, because individual action at every minute, real 1863 audio, the exact atmosphere and a single true combat order are not in the record (p. 121, C.9; DEC-003 and DD-16: "Never claim 100%"). R22 is not in C.9 (added later): it follows "possible with labeled reconstruction" with the B.12.4 gaps (Lincoln's clothing, voice, wording) as marked reconstruction.
- **TOP-4 Never passing without a recorded interpretation.** A requirement whose literal reading is impossible stays unmet; only a recorded owner decision may reinterpret it (Law cl. 6, p. 132). DD-16's wording is a statement of what is claimed, not a reinterpretation of R03.

### 3.10 OA: owner chat additions OA01.0000 to OA09.0000

These nine rows have `origin: owner_chat` and no `gate_ids`. They are kept apart from the plan's wording (CLAUDE.md). An S-R "passes only when its gate passes" (p. 136, Q), so a gate must exist: the derived gates OA-G01 to OA-G09 below define one for each from the owner's words, using plan gates wherever they apply. Any threshold is a recorded decision (1.8). The runner reports them separately from the 957 plan rows.

| Row | Owner text (requirements.json) | Derived gate: checks | Plan gates used | PASS needs | Linked (not passing) when |
|---|---|---|---|---|---|
| OA01 | Battle Theatre is a separate page or section with its own renderer, entry button and Back with no leaked WebGL or audio; read-only reuse of the 16 tour stops and 512 monuments as camera bookmarks | (a) the Theatre loads as its own page or section with its own renderer instance and an entry button on the main site; (b) after Back, no WebGL context and no audio context owned by the Theatre is live, across repeated enter and back cycles (the cycle count is a recorded threshold T-OA01-1); (c) the bookmarks are derived read-only at load from the main site's 16 tour stops and 512 monuments, counts equal the main-site data at build, no write path, main-site data hash unchanged; (d) the Virtual Walkthrough and Monuments sections still work (regression against the published build, FINAL-ACCEPTANCE step 3) | Q24 (screens) | a, b, c, d on `swgl` browser runs (API-level facts); real-device behavior listed as owed | any of a to d fails or is not run |
| OA02 | Every soldier individually animated; total rendered equals the number present (one-to-one, no performance capping without a recorded owner decision) | (a) for every unit, scenario and grid time the instance count equals the present strength (strength figure of the verified OOB for the scenario minus those removed or departed), impostors and LOD tiers counted as instances; (b) no cap constant or budget limit on the figure count exists in the code; (c) every instance has its own animation phase and variant drawn from the counter-based generator (run seed, agent id, time bucket; p. 125, D.3.2); (d) the individual-level content is marked plausible-procedural (EG-0001) | Q01.6, Q15, Q23 | a to d at the upper end of every strength range and at the default | any count differs, any cap exists, or a figure is not individually seeded |
| OA03 | Complete roster section of both armies (names need not appear in the animation); source and rights per name. The PDF has no roster requirement | (a) every unit of the verified OOB has a roster record or a registered gap with the count of names missing; (b) every name row has source id, rights status and tier; (c) the section is in the product; (d) only public-domain or openly readable sources, no logins, no circumvention (standing constraint, DEC-019 clarification) | Q02, Q25 | every unit's roster complete against the best surviving lawful public source, plus a. Not literally satisfiable for the Confederate army (only about one third of company muster rolls survive, p. 9, B.1) | any unit with a registered gap: LINKED-ACTIVE (EG-0129). OA03 cannot pass without a recorded interpretation of "complete" (A-41) |
| OA04 | Rufus Dawes and all named commanders accurate in uniform, equipment and weapons; where no source exists the gap is registered per Law cl. 3, not invented | (a) a `people` record for every officer named in the verified OOB and the Official Records, lieutenant to general (p. 135, K.7); (b) each appearance field (height, build, hair, facial hair, dress, horse, equipment, insignia) has a source and tier or a register entry; (c) dress, equipment and weapons pass Q03 on the date; (d) Rufus Dawes has his own record; (e) no appearance is invented | Q03, Q02, Q23 | every named commander's uniform, equipment and weapons `verified_primary` (A-42: the owner's own "where no source exists the gap is registered" is the register branch, which makes the item LINKED) | any commander on a registered gap (B.4 documents appearance for only a handful: p. 65; EG-0004) |
| OA05 | Real period-accurate weapon audio per individual shot. Conflicts with the PDF labeling: DEC-001 | (a) every shot has its own audio event with its own source position and time (Q13.4); (b) each sample is a recording of the right weapon type with a licence-checked ledger row and the sample type matches the weapon; (c) disclosure per DD-14 (panel and overlay; never called period sound; no 1863 recording exists, p. 137, S.1); (d) Q13 holds | Q13, Q23 | a to d, every shot type served by a recording (a shot type with only synthesis is flagged synthesized and the owner's "real recordings" is unmet for it) | any shot type without a licensed recording; "period-accurate" is never claimed |
| OA06 | Unit activity, orientation and position match the record: owner target well over 97%, measured on documented unit-level quantities | measure M = quantities whose product value lies inside the documented value or window and its uncertainty, divided by all documented unit-level quantities. The denominator D is every documented unit-level quantity of the claim ledger (unit position region and window, activity class, orientation or formation), tier `documented` and `verified_primary`, fixed by that rule; D may only grow | Q04, Q05, Q06, Q19 | M at least 97% (T-OA06-1, the owner's figure) on the default scenario and each scenario the quantity belongs to; per-quantity results published; D not narrowed | M below 97%, or D not machine-listed (A-41: "well over" has no number; the floor 97% is used and the actual is reported) |
| OA07 | Hollywood-grade human movement including artillery fire and impact; no standard relaxed silently; shortfalls reported | (a) every clip class of the required motion set (p. 135, M.2) exists, tagged source type and tier; (b) programmatic checks against the manual's step list and timing; (c) the animation report's measured limits (stance-foot slip, joint limits, hand-to-grip error in transitions, clip coverage, gear springs) are all met or each shortfall is a register entry; (d) artillery fire, recoil and impact match the ordnance data (Q14); (e) frames were looked at | Q05, Q14, Q23 | a to e with no open shortfall. "Hollywood-grade" is not machine-decidable (p. 131, D.9 "needs human art direction"); a recorded acceptance of the reviewed frames is part of PASS | any reported shortfall (the 2026-10-31 animation report lists joint limits, hand-to-grip error, motion coverage G9 and G7 as NOT MET) |
| OA08 | Every event from first shot to withdrawal is on the timeline and playable | the interval runs from the first-contact row of July 1 (about 07:30, with the first Union shot) to the last row of the Confederate withdrawal: the stricter reading takes the retreat rows through Falling Waters on July 14, which the plan keeps as optional chapters (p. 117, B.12; A-43), not only the night of July 4 (T3-162 to T3-167). Every timeline row in it is listed in the Events list, jumpable, and its realization plays (TL rules) or, for an open-gap row, its gap marker shows | Q17, Q12 | every row in the interval PASS (TL-9) or gap-marked K5; none merely linked without a visible marker | any row in the interval without a Events entry, a jump, or a marker |
| OA09 | Main-map background is a source-traced July 1863 reconstruction (B.9 pipeline); the site uses only actual Gettysburg images | (a) the background layer's chain of sources from B.9 with the pipeline steps and residuals (B.9.2, p. 109; G.2 and G.3, p. 134) and the 1863 elevation-surface step; (b) an image manifest for every image of every shipped file of the whole site (main map, Virtual Walkthrough, Monuments, Battle Theatre, tutorial PDF), each with subject (actual Gettysburg), source, rights and date; no stock, placeholder or generated imagery (DD-12 keeps the full scope); (c) no modern object in the 1863 background (Q03.4) | Q03, Q16, Q25 | a, b, c complete over the whole site | any image without provenance or any non-Gettysburg image; the audit is not yet done (DD-12) |

Owner-only steps in this class: none that Claude performs; permission requests to third parties for rosters were withdrawn by DEC-019 (the owner: no permissions needed, public sources).

---

## 4. The 28 gates

Every gate section has the same parts. **Text**: the gate's words from the Section Q table (p. 136), with `gates.json` agreeing. **Reads**: the plan passages that define the terms. **Checks**: the property split into numbered checks Qnn.k that a runner emits results for. **Inputs**, **Item and result**, **Can pass when**, **Registered instead** (what must exist for an item that cannot pass; it is COVERED only where the gate text allows, otherwise the gate stays not passing and the S-R is LINKED), **Judges** (sub-requirements) and **Runs** (renderer class, owed parts). Where GATE-SPEC-B 4 describes what exists today, this file says only "state: see SPEC-B Qnn".

**At a glance.** "Register branch" is yes where the gate's own text lets a register entry or a flag stand in for the property (so COVERED exists for that gate). Renderer classes are those of U-10; "owed" lists what a container run cannot settle.

| Gate | Item | Register branch in the gate text | Renderer class | Owed or not runnable here |
|---|---|---|---|---|
| Q01 | unit, check, scenario | no | python, node | needs the verified OOB table |
| Q02 | datum | no | python, node | datum census |
| Q03 | manifest, structure, ground feature class, regression case | no | python, node, swgl sample | modern-ground audit |
| Q04 | unit, entity class, scenario | no | node, swgl sample | none |
| Q05 | entity segment | yes (offset and missing-range items) | node | none |
| Q06 | unit, scenario | no (an inferred path is allowed by the text) | node | none |
| Q07 | object, transition, scenario | yes (flagged window) | python, node, swgl | real-GPU confirmation of pictures |
| Q08 | work, check, scenario | yes (completion flagged) | node, python, swgl | real-GPU confirmation of pictures |
| Q09 | building part, transition, scenario | yes (flagged window, A-46) | python, node, swgl | real-GPU confirmation of pictures |
| Q10 | night time, view, scenario, entity or activity | no | node, swgl | real-GPU confirmation of frames |
| Q11 | date or minute, quantity | no | python, node | none |
| Q12 | seek pair, scenario | no | node, swgl | latency on the real GPU; cross-machine digests |
| Q13 | source event, listener, time; woods cell | no | node, swgl (offline audio) | listening to the mix |
| Q14 | weapon class and event; battery and time | yes (W.1 gaps) | python, node | needs the verified battery table |
| Q15 | scene, agent count, camera path | no | gpu only | not runnable here |
| Q16 | photograph | no | swgl, python | needs a documented camera position |
| Q17 | timeline row | yes (open entry) | python, node | needs realization records |
| Q18 | sub-requirement | yes (linked) | python | needs the expected populations |
| Q19 | visible datum | yes (flag) | python, node | needs the claim ledger |
| Q20 | cavalry unit, check | no | node, python | needs the verified OOB and action table |
| Q21 | polygon class, date, parameter | no | node, python, swgl | needs the vegetation schedule |
| Q22 | channel, grid time, scenario | no | python, node, swgl | real-GPU confirmation of drawn weather |
| Q23 | content item or class | no | python, node, swgl | none |
| Q24 | baseline entry | no | swgl | real-GPU baseline owed |
| Q25 | source row | yes (blocked, scheduled, print-only) | python | owner-only steps |
| Q26 | casualty event; hospital and interval | no | node | needs the flow data |
| Q27 | phase and cap; milestone | no | python | owner approves the caps |
| Q28 | row, state, Lincoln attribute, film path, jump | yes (Lincoln attributes marked) | python, node, swgl | needs the Nov 19 scene and film path |

### Q01 Unit counts and strengths match the verified OOB table

**Text (p. 136).** "Unit counts and strengths match the verified OOB table."
**Reads.** O.1 (p. 135): ingest the OOB from the Official Records and Busey and Martin, cross-checked with the NPS and Wikipedia lists, "verify every regiment, battery and troop; commander; brigade assignment; and strength", add regimental and company commanders where known, "the coverage test compares unit counts and strengths in the history layer with the verified OOB (Gate Q01)"; cavalry and horse artillery are first-class units. N (p. 135): carry ranges and sources for every count; never collapse a range without a decision-log entry; strengths for rendering come from the chosen default and soldiers are instanced one-to-one up to the strength figure with no capping. B.1 (p. 9): "Any 'number of soldiers to animate' must therefore be a range with a declared basis." K.1 (p. 135): kit manifest for every regiment, battery, troop and company-level unit including cavalry, horse artillery, engineers, signal, provost, ambulance, ordnance, headquarters and medical staff. D.7 phase 2 exit tests (p. 129): "Unit counts reconcile with OOB; every strength has a source range; no unit without presence window".

**Checks.**
- **Q01.1 The table.** A verified OOB table exists: per unit id, name, army, corps, division, brigade, branch, commander(s), strength as a range `[low, high]` with declared basis, source ids and tier, and a presence-window reference (Q04). Built from the OR "Organization of the Army ..." lists (OR27-1-R009, OR27-2-R424) and the abstracts of returns (OR27-1-R008, OR27-2-R425); each documented value carries a non-lead source and a matched extract (U-08). Covers every unit class of K.1.
- **Q01.2 Unit set.** The history layer's unit set (drawn and registered not-drawn) is in bijection with the table through an id map, level by level (army, corps, division, brigade, regiment, battalion, battery, troop, staff, medical, signal, provost, ambulance, ordnance). A unit in the layer and not in the table, a table unit missing from the layer, or a mismatch of commander or brigade is FAIL. Units documented as never or only partly on the field (13th and 58th Va, 44th NC and Corse's brigade, Robertson, Jones and Imboden; p. 62) are table rows with that status and are never drawn except in the detached role stated.
- **Q01.3 Strength.** For every unit and every strength scenario, the layer's strength is a member of the table's value set or lies in its range, with the same basis; a single printed figure is allowed only as one source's value, labeled; no range is collapsed.
- **Q01.4 Roll-ups.** Sums per brigade, division, corps and army equal the table's roll-ups within the sum of the ranges, and the army totals lie inside the verified totals; B.1's secondary figures (Union 93,500 to 104,256; Confederate 65,000 to 75,000, possibly 80,000; p. 9) are leads and are not the reference.
- **Q01.5 Presence window.** Every unit has an arrivals record with window, place, route and sources (O.2, p. 135; D.7 phase 2).
- **Q01.6 One-to-one.** For every unit, scenario and grid time, rendered instances equal present strength (strength minus those removed or departed); impostor and LOD tiers count as instances; no cap constant exists (N; shared with OA02).
- **Q01.7 Commander and assignment** equal the table.

**Inputs.** The verified table (`kit/verified_oob.json`, announced, not present), `history/units.json` (726 units), `history/arrivals.json`, `history/not_on_field.json`, the id map, the strength scenarios, the local OR text (tmp/library/or27, `or27_index.json`). **Item.** (unit, check, scenario). **Result.** PASS or FAIL for every check; COVERED does not exist (the gate text has no register branch). A unit whose strength has no verified source is a table row with a gap range and a register entry (tier plausible-procedural); Q01 then compares against that flagged value.
**Can pass when** the table exists and is verified (every documented value `verified_primary`), every Q01.2 to Q01.7 item PASSes in every strength scenario. With no table: BLOCKED-INPUT.
**Registered instead.** A unit or strength that the Official Records do not give: an open entry (evidence missing) with the range used, its basis and the library search; Busey and Martin and Coddington are print-only and cited, not ingested (p. 126, D.4.2).
**Judges.** R04.0000, R10.0000; scope all units. **Runs.** python and node; no GPU. State: see SPEC-B Q01. Ambiguity: A-34.

### Q02 Provenance completeness

**Text (p. 136).** "Provenance completeness: no datum without source and tier; no documented tier without a source extract."
**Reads.** D (p. 134): the history layer's tables are `units, people, places, events, orders, positions, movements, activities, arrivals, departures, equipment_items, kit_manifests, uniform_specs, ordnance, structures, terrain_features, vegetation_states, weather_states, sources, claims, claim_support, conflicts, register_entries`. P.1 (p. 136): "No datum without provenance enters the history layer or the product. Render-time flags carry the tier into the engine." App. B (p. 139) rules. E.2, E.7 (p. 134): leads never support a documented datum alone.

**Checks.**
- **Q02.1 Census.** Every datum class the page loads (the history layer tables above, the data files behind the shell's load list, every audio sample, texture, model and clip, and every UI text that states a fact) is in a datum-class registry with its provenance mapping. A class loaded by the page and absent from the registry is FAIL (the census is itself checked by diffing the page's load list against the registry).
- **Q02.2 Tier and source.** Every datum has a tier in {documented, inferred, plausible-procedural} and at least one source id, or the reasoning of an inferred datum, or the `procedural` block of a plausible-procedural one. Open gaps are register entries and render as gap markers, not as data.
- **Q02.3 Documented needs an extract.** tier documented: at least one source whose type is not `encyclopedia-lead` or `forum-lead` (nor a blog, wiki or auction page), a `quote_or_extract` under 15 words that the runner finds in the stored source text at the cited page or span, numbers in the claim inside the span (citation checker, p. 126, D.4.3 stage 11), and the claim equals what the span supports.
- **Q02.4 Inferred** has `reasoning` whose premises are documented data with claim ids.
- **Q02.5 Plausible-procedural** has the complete `procedural` block and, where the gap affects a requirement, an open register id.
- **Q02.6 Sources.** Each source id resolves in the Source Manifest with `date_written`, `rights`, `reliability_tier`; copyrighted works store spans and pointers, not text (App. B).
- **Q02.7 Conflicts.** Every conflict lists all values with sources (B.2.5); feeds class CF.
- **Q02.8 Quarantine.** No documented datum rests on a lead alone (E.7); a lead-supported datum is inferred or plausible-procedural, flagged weak.
- **Q02.9 Validity.** Every kit item has `valid_from` and `valid_to`; every structure, fence, field and vegetation state change has a `state_schedule` (App. B).

**Inputs.** The datum-class registry (to be written by the census), all loaded data, `claims`/`claim_support` ledgers, the Source Manifest, stored extracts (tmp/library). **Item.** a datum (a row of a table). **Result.** PASS or FAIL; a missing source is never COVERED: the datum is removed, or re-tiered with its procedural block, or shown as a gap marker. **Can pass when** the census is complete and no datum FAILs. **Registered instead.** For a needed datum with no source: a register entry (evidence missing) and a gap marker in the product, not a datum. **Judges.** R03.0000 and the CF rows (Q02.7). **Runs.** python and node. State: see SPEC-B Q02. Ambiguities: A-07, A-45.

### Q03 No anachronisms

**Text (p. 136).** "No anachronisms. Every item in every manifest is valid on its date and for its unit (dress, arms, badges, flags, equipment, vehicles, structures); every 1863 structure exists on its date; no modern object (monuments, avenues, fences, signs, wires, markers) appears."
**Reads.** K.9 (p. 135): every kit item has `valid_from` and `valid_to`; the build rejects items outside July 1863 for the unit. B.6.12 Validation test (p. 76): seven failure classes. E.4 (p. 134): the known corrections. B.7.3 (p. 92) pre-existing features; B.7.6 (p. 94) and B.8.3 (p. 97) the modern rebuilt walls; B.8.7 (p. 102) "no avenue exists before the park era". G (p. 134): reconcile modern and historic ground.

**Checks.**
- **Q03.1 Kit validator over every soldier drawn** (not only the unit specs), the seven classes of B.6.12 (p. 76): (1) presence (a soldier whose unit has not arrived or has left is absent); (2) the anachronism list: Type III Richmond Depot jackets; M1863 rifle-musket; Henry rifle; Spencer carbine on any unit before June 30 or on any unit other than the 5th Michigan (all) and part of the 6th Michigan after that date; Zouave items on the 5th NY, 140th NY, 155th PA or any Louisiana soldier; Berdan green on any other unit; Wheat's Tiger or Coppens' Zouave dress; green hatband on the Irish Brigade or medics; Whitworth rifle in infantry hands by default; kepi on a Confederate private by default; (3) wrong-unit items (weapon equals the unit assignment or the army default distribution; badge shape belongs to the corps; no Union soldier carries a Confederate item); (4) branch correctness (artillery scarlet, cavalry yellow, infantry sky blue; the green band only for Ambulance Corps); (5) tier completeness (every field has a tier; a documented field has a source key); (6) reproducibility (the same seed gives identical kit); (7) a seeded sample audit on a turntable against the unit's reference images.
- **Q03.2 Validity on the date.** Every item is valid on each scene date of U-06; the checker uses the scene date, including 1863-11-18 and 19 for the epilogue crowd and Lincoln. Flags: the national colour's star count is checked against the statute for each scene date (the figures evidence records 34 through July 3 and 35 from July 4; the plan prints no star count); the ANV battle flag star count (12 or 13) is a selectable alternative (DD-01).
- **Q03.3 Structures exist on their date.** Every drawn building, fence, wall, work, road, bridge and hospital has an existence interval and a state schedule; none is present before it was built or after it was destroyed or removed (the Rose barn burned in 1910 and the Codori barn came down in 1882: both stand throughout; the McPherson house burned in 1895: stands throughout).
- **Q03.4 No modern object.** No rendered object and no feature of the rendered ground belongs to a class absent in 1863: monuments, avenues, modern roads and lots, post-1863 buildings, towers, signs, wires and poles, modern fences, markers. Checked twice: (a) the object registry (any object with `valid_from` after the scene date is FAIL); (b) a ground audit: the terrain and aerial layers are classified and every modern feature is removed, painted out or replaced by the 1863 reconstruction layer with a recorded correction (G.3, p. 134). A disclosure that "the ground is the modern landscape" is not a pass. The four global assertions of 2.4 apply (no avenue).
- **Q03.5 Pre-existing features** (class PE): present at frame one, never constructed.
- **Q03.6 Regression set** of the known corrections (p. 126, D.4.3 stage 12; p. 134, E.4), each its own item: 5th NY not at Gettysburg; 140th NY regulation blue; 146th NY and 114th PA Zouave; McPherson barn not burned on July 1; Bliss house and barn burned the morning of July 3 by the 14th Connecticut; the Angle wall pre-existing; Spencers not on Buford's line on July 1; Cope's survey August to October 1863; the Devil's Den photograph staged on July 6; Louisiana regiments as ordinary ANV infantry. The set must still pass after every data change. (DD-07 makes the Heth shoes motive the shown default; that item is a narrative claim and not a Q03 item.)
- **Q03.7 Vehicles and equipment.** Limbers, caissons, wagons, ambulances, forge and battery wagon (B.6.14.4, p. 80) are types valid for 1863 and for the army.

**Inputs.** `kit/*.json`, `app/data/kit-crosswalk.json`, the kit validator `tools/bt/check_kit.py` and its figure check, `structures/*.json` and `app/data/structures3d.json`, the ground layers and their classification, the correction regression set. **Item.** a manifest, a structure, a ground feature class, a regression case. **Result.** PASS or FAIL; disputed items are carried as selectable variants and each variant must itself pass (the validator's DISPUTED_FLAGGED is acceptable only when both variants pass); a validator failure is logged to the register "rather than waived" (p. 76) and the gate stays FAIL. **Can pass when** every item PASSes, including Q03.4(b). **Registered instead.** Disputed kit (Berdan green or blue, 140th NY): both variants selectable, entry open. **Judges.** PE rows, R02, R04, R10, R13, R17 top rows. **Runs.** python, node; the sample audit renders on `swgl`. State: see SPEC-B Q03. Ambiguity: A-33.

### Q04 Arrival check

**Text (p. 136).** "Arrival check. No entity of a unit exists in the scene before its arrival window opens; scan every frame range of every scenario."
**Reads.** O.2 (pp. 135-136): "No unit, soldier, horse, gun, wagon or flag of a unit appears in the scene before its arrival window opens. Ranges are carried: a unit is not shown before the earliest documented arrival time unless an owner decision chooses another scenario." Units with an unrecorded arrival "get an inferred window from their documented march, with a register entry". "Before arrival the unit may exist only as an approaching column on the road network at the correct place and time (visible only if on the battlefield map region)". The day-2 arrivals (V Corps, parts of III and VI Corps, Longstreet's divisions, Stuart's cavalry on the evening of July 2) are absent before then; the B.2.4 ledger is "the arrival source of truth; conflicts are scenarios". B.2.5 animation gating rules (p. 63): never-on-field units are not drawn; unknown arrivals appear "no earlier than the next documented event that required them ... tagged inferred"; Stuart's brigades gated to the evening of July 2 (Hampton's rear guard and Hunterstown exempt); Pickett to the morning of July 3.

**Checks.**
- **Q04.1 Absolute invariant.** In every scenario of S*, presence is zero for every entity class (1.6) of unit u at every grid time earlier than the minimum over all documented values of u's arrival window (the earliest source-supported time).
- **Q04.2 Scenario-local invariant.** Presence in scenario s is zero before the arrival window start that s selects (A-35).
- **Q04.3 Entry.** The first presence of a unit is as an approaching column that enters the loaded ground at the road and time its route gives, not as a deployed unit (shared with Q06).
- **Q04.4 Departure.** After a documented departure the unit leaves by a march or is replaced by its dead and wounded where documented (O.2); an entity never vanishes.
- **Q04.5 Unknown arrivals.** Not earlier than the next documented event that requires the unit; tier inferred; register entry.
- **Q04.6 Named cases.** V Corps, II Corps, Longstreet, Stuart's brigades, Pickett, the VI Corps; units never or partly on the field.
- **Q04.7 Effects.** A sound, shot, smoke or casualty caused by a unit's action does not exist before the unit's arrival.

**Inputs.** `history/units.json`, `arrivals.json`, `not_on_field.json`, the conflict scenarios, the layer, the draw lists, the audio events. **Item.** (unit, entity class, scenario). **Result.** PASS or FAIL. The scan is exhaustive over the grid and boundaries (1.6) in state, and confirmed in a software-GL browser at a sample of times (`arrival.spec`). **Can pass when** zero FAIL over S* and all entity classes. **Registered instead.** Unrecorded arrival times: an inferred window and an open entry; the check then runs against that window. **Judges.** R16.0000, R17.0000. **Runs.** node; picture sample `swgl`. State: see SPEC-B Q04.

### Q05 Position-time plausibility

**Text (p. 136).** "Position-time plausibility: speeds on foot, horse, limber, wagon and in column within documented ranges; no teleport; continuous trajectories."
**Reads.** M.1 (p. 135): drill motion is encoded from the Hardee and Casey manuals; O.2 (p. 136): "march rate checked (Gate Q05)", "at documented or plausible rates". The plan prints no speeds; the documented ranges are the drill manuals (common time 90 steps of 28 in. a minute, quick time and route step 110 of 28 in., double quick 165 of 33 in., urgent 180: `app/data/anim3d/drill-timing.json`) and the horse and horse-artillery gait tables (Wheeler 1863, Cooper 1861, Instruction for Field Artillery 1863: `gait-sources.json`).

**Checks.**
- **Q05.1 Speed ranges by mover class.** Mover classes: foot individual, foot column, foot line (wheel and deploy), cavalry mount, horse artillery team, limber and gun team, caisson, wagon and ambulance, stretcher team, led horses. Each has a documented range with a source for its declared gait. At every grid step no entity's speed exceeds the upper bound of its class and gait; a segment declared as constant-gait has its mean speed inside the gait's documented range (both ends, A-32).
- **Q05.2 No teleport.** Displacement between consecutive steps is at most `v_max * dt` plus the position resolution, for every entity in every scenario; the only discontinuities are the documented entries and exits off the loaded ground and mount and dismount at the same place.
- **Q05.3 Continuous trajectories.** Positions are continuous; each path begins where the previous ended within 1 m (T-Q05-1) or at the unit's entry; heading change is bounded by the formation's extent (a rigid train does not turn faster than its far end can move).
- **Q05.4 Documented time against documented rate.** Where documented place and time imply a rate above the class bound, the layer keeps the bound, reports the lateness as an offset and holds an open entry; it never speeds or teleports to meet the time (COVERED for that item).
- **Q05.5 Missing ranges.** A mover class with no documented range (the plan gives none for wagons, limbers or "in column") is BLOCKED-INPUT: an open entry is registered, a conservative bound (the foot range) is applied with tier inferred, and the item is COVERED until a source is read.

**Inputs.** The layer's paths and events, the stage tables, the drill and gait tables, `kit` train data. **Item.** (unit or entity, segment, scenario). **Result.** PASS, COVERED (Q05.4, Q05.5), FAIL. **Can pass when** no FAIL and every COVERED item has an L3 entry. **Registered instead.** (a) A documented time that the documented rate cannot meet: the offset and an open entry (Q05.4); (b) a mover class with no documented range: an open entry and the conservative bound (Q05.5). Nothing may be registered in place of a speed, teleport or continuity failure. **Judges.** R17.0000. **Runs.** node. State: see SPEC-B Q05. Ambiguity: A-32.

### Q06 March-to-position check

**Text (p. 136).** "March-to-position check. Every unit has a continuous documented or inferred path from its previous position to its fighting position; no unit appears already deployed."
**Reads.** O.2 (p. 136): "Arrival is a march, not a spawn. Units march from their previous documented position to their fighting position along documented or inferred routes (roads, lanes, fields), at documented or plausible rates, in column of march, then deploy into line or the documented formation, then occupy their position." D.3.4 (p. 125); D.7 phase 7 exit tests (p. 129): "Per-unit time continuity; no unit before arrival; no unit in two places".

**Checks.**
- **Q06.1 Path chain.** For every unit with a fighting position: an ordered chain of legs from its previous position (documented or the last documented night position; or the loaded-ground edge for a unit coming from outside it) to the fighting position, each leg with route (road, lane or field), times, rate (Q05), tier (documented or inferred) and sources, continuous in space and time.
- **Q06.2 Not deployed on appearance.** The first presence is column of march; a deployment event with a formation change precedes line; then occupation. A deployment duration comes from the drill manuals where they give one; the repository holds none (DEC-008 uses 90 s as a tuning value), so the duration is plausible-procedural, marked and registered (A-38).
- **Q06.3 Every unit.** Every unit of the verified OOB that was on the field has a chain. A unit with no documented previous position gets an inferred chain from the ledger (nearest road of its line of command, DEC-015 sibling roads, EG-0070), tier inferred or plausible-procedural, marked. A unit with no path is FAIL (a path can always be inferred; "too many units" is never a reason, Law cl. 1).
- **Q06.4 Departure** by a march in reverse (Q04.4).
- **Q06.5 Outside the map.** A previous position outside the loaded ground becomes an entry at the edge at the correct place and time.

**Inputs.** `layer.units[].render` and `approach`, `layer.plans`, `placement.json`, `sibling-approach.json`, `daypositions.json`, the ledger. **Item.** (unit, scenario). **Result.** PASS or FAIL; a documented-or-inferred leg is acceptable by the gate text; its tier is shown. **Can pass when** no unit lacks a chain. **Registered instead.** For inferred or procedural legs: the register entry the leg names. **Judges.** R17.0000. **Runs.** node. State: see SPEC-B Q06 (108 open-gap leaf units today). Ambiguity: A-38.

### Q07 Fence and wall state-change times

**Text (p. 136).** "Fence and wall state-change times. Each damaged, dismantled, burned or flattened fence, wall or gate changes state at its documented time window (or is flagged with an open register entry); intact before, damaged after, and the transition is visible."
**Reads.** V.2 (p. 137): fences are modular segments (post-and-rail, worm or snake rail, board, stone wall) with a state schedule "intact, rails pulled for breastworks or fuel, rails knocked down by shot, flattened by marching units, burned"; "each state change has a time window and a source. The animation shows the damage events (soldiers pulling rails, shell strikes, crossing and breaking of fences, for example along the Emmitsburg Road) at the right time". B.8.3 (p. 97) fence types; B.8.7 (pp. 100-102) schedule; B.8.8 (p. 102) variants: fence segments intact, splintered, breached, missing; stone walls intact, scattered stones (triggers fire, pull-down), "seeded per segment". G.7 (p. 134): each fence segment and wall is a `structures` row with a state schedule keyed to time. D.2 V7 test (p. 124): "render a fence before and after its damage event".

**Checks.**
- **Q07.1 Registry.** Every fence, wall and gate of the 1863 landscape (the structures registry, class P ids, `FEN-` records, the B.8.3 types, gates, yard pickets) has a `state_schedule`: for each damaged, dismantled, burned or flattened event the sources document, a window `[earliest, latest, default]`, trigger, tier and source, or an open register entry that flags the unresolved window.
- **Q07.2 Order.** `intact` before the window start, `to_state` after its end, windows not reversed, states in a legal order.
- **Q07.3 Pure state and scrubbing.** `state_at(object, t, scenario)` is a pure function of time; backward scrubbing reverses every transition (p. 100, B.8.7).
- **Q07.4 Visible.** SS-4 (3.3): draw state differs before and after; an intermediate or progressive state inside the window; confirmed on pixels for a software-GL sample and on draw lists for all.
- **Q07.5 Cause events.** The plan's damage events appear in the window: men pulling rails, shell strikes, crossing and breaking, burning; an unsourced cause is shown plausible-procedural and marked.
- **Q07.6 Named assertion.** The Emmitsburg Road fences are not destroyed before July 2 to 3 (p. 102): intact at the step-off, splintered or breached inside the windows of S-062 and its neighbours.
- **Q07.7 Scenarios.** Every alternative window is selectable and passes.
- **Q07.8 Drawn.** Every fence or wall that has a documented state change is drawn. A record with no geometry is FAIL (Law cl. 1), registered as unfinished build.

**Inputs.** `structures/structures.json`, `state_schedule.json` (class SS), `app/data/structures3d.json`, the draw lists, the Warren, Bachelder and NPS sources for lines. **Item.** (object, transition, scenario). **Result.** PASS; COVERED when the window is unresolved and an L3 entry plus the visible flag and the plain-reading window are present (the gate text allows it); FAIL. **Can pass when** no FAIL and every COVERED item has its entry. **Registered instead.** An unresolved window: an open L3 entry, the visible flag and the plain-reading window (COVERED). An object that is not drawn cannot be registered instead: it is FAIL until built (Law cl. 1). **Judges.** SS rows (fence objects), R02.0000, R13.0000, R14.0000. **Runs.** python and node; pictures `swgl`. State: see SPEC-B Q07. Ambiguities: A-12, A-48 (minimum visible span for a point change).

### Q08 No pre-placed earthworks

**Text (p. 136).** "No pre-placed earthworks. Every earthwork, breastwork and gun emplacement is absent before its construction start, passes through documented construction states (staking, digging, piling, completion), and carries a work crew in the construction interval; completion times match sources or are flagged."
**Reads.** B.7.1 (p. 90): "No earthwork, breastwork, barricade, lunette or gun pit is pre-placed in the scene ... constructed on screen, by the unit that built it, inside the time window the sources give. A work that the notes cannot attribute to a builder or a time ... is still built on screen, by a labeled stand-in crew, and is flagged 'builder unknown'." B.7.4 (p. 93): stages 0 bare ground, 1 layout, 2 felling and gathering, 3 stacking, 4 head logs and concealment, 5 completed, 6 damaged; "the state is a function of scenario time, so scrubbing backward un-builds the work"; stages 3 and 4 can be re-entered. V.3 (p. 137): construction state machine (layout, digging or log laying, parapet build-up, headlog and traverse where documented, completion). B.7.5 (p. 94) engine rules for G rows. B.7.6 (p. 94): no profile from modern rebuilt works.

**Checks.**
- **Q08.1 Absent before start.** For every work of class WK of the construction type, and every prepared emplacement (G-03, G-12, and those DD-04 builds), in every scenario, progress is 0 and no mesh exists at every grid time before the start window; an unknown start is the earliest time the builder's presence or the row allows, flagged.
- **Q08.2 Documented states, in order.** The work passes through the stages in order: staking or layout, digging or felling and gathering, piling or stacking, completion; plus head logs, traverse and extension where the row documents them. A segment's stage shares and offsets are plausible-procedural, seeded, marked (B.7.4 assumptions 1 to 2). The three stage vocabularies (Q08 text, B.7.4, V.3) are mapped: staking = layout; digging = felling and gathering or digging; piling = stacking or parapet build-up (A-14).
- **Q08.3 Crew.** During every interval in which progress changes at least one crew is present and working at the work: the builder unit's soldiers (present by Q04) or the labeled stand-in crew "builder unknown"; tools as printed (E-02 about a dozen spades, tool count capped at 12 for that regiment).
- **Q08.4 Completion.** The completion time equals the source's window (E-05: start about 06:00, end 09:00 to 10:00 as default; outer bounds about 10:00 and about noon), or is flagged with an open entry.
- **Q08.5 No pre-existing work built.** Class PE objects never get construction (Q03.5); rail piles on Cemetery Ridge (E-17) are not animated as documented unless an accepted correction (DD-02) makes them documented; Little Round Top stone breastworks carry the NPS versus Wikipedia dating conflict as scenarios.
- **Q08.6 Emplacements** by B.7.5: prepared built on screen, improvised no earth, "no works described" open ground with a logged gap.
- **Q08.7 No modern profile** (B.7.6): thickness and profile numerics are labeled assumptions, tier plausible-procedural.
- **Q08.8 Damage** stage 6 appears inside its documented window (E-11).

**Inputs.** `structures.json`, `works_stages.json`, `app/data/works3d.json`, the draw lists, DD-02 to DD-05, OR reports. **Item.** (work or prepared emplacement, check, scenario). **Result.** PASS; COVERED where "completion times ... are flagged" (open L3 entry plus visible flag); FAIL. **Can pass when** every work and prepared emplacement of the record has a decision (drawn and passing, or registered with the reason it is not yet drawn, which is FAIL until built) and no FAIL. **Registered instead.** Unknown thickness, head-log size and tool lists beyond the dozen spades (B.7.8 gaps): plausible-procedural, marked. **Judges.** WK rows, R02, R05, R13, R14 top rows; GE rows that are prepared. **Runs.** node, python; pictures `swgl`. State: see SPEC-B Q08. Ambiguities: A-13, A-14, A-15, A-51.

### Q09 Building states

**Text (p. 136).** "Building states (intact, damaged, burning, burned, loopholed, hospital use) change at documented times; the Bliss buildings burn July 3 morning; the McPherson barn does not burn July 1."
**Reads.** B.8.2 (pp. 94-97) the building table (45 and more structures, with parts); B.8.7 (pp. 100-102); B.8.8 (p. 102) damage-state asset classes: barns and houses with documented fires (Bliss house and barn, Sherfy barn): intact, burning (progressive), burned shell or ruin; buildings with shell or bullet damage (Sherfy house, Trostle barn, Leister, Wade, Seminary, Rummel, gatehouse): intact, lightly damaged, damaged, decal sets at documented locations; hospital props; V.4 (p. 137) fire, shell damage, loopholing, hospital conversion and looting follow the schedule. E.4 (p. 134) and V.4: the Bliss barn and house were burned deliberately on the morning of July 3 by the 14th Connecticut; the McPherson barn did not burn on July 1 (it survives; the house burned in 1895).

**Checks.**
- **Q09.1 Registry.** Every building part has a state schedule; the state vocabulary is the six of the gate plus looted and ruin where the schedule says so.
- **Q09.2 Transition times.** Each transition happens inside its documented window (SS-3 rules; a date-only or "morning" window is the plain reading, flagged, A-46); backward scrubbing reverses it.
- **Q09.3 Progressive.** Burning is progressive and ends as a burned shell or ruin; shelled and loopholed states are decal and geometry sets at documented locations; decal counts beyond a documented count (Wade house 150 and more strikes) are plausible-procedural and marked (p. 102).
- **Q09.4 Named assertions** (global, any violation fails the gate): the Bliss house and barn burn on the morning of July 3 and not on July 2; the McPherson barn never burns in the window; the Sherfy barn fire lies inside its flagged window (July 2 evening or July 3, scenario of C-026); the Rose barn (1910), Codori barn (1882) and McPherson house (1895) are unchanged inside the window.
- **Q09.5 Hospital use.** A hospital site is in `hospital use` exactly in its documented interval (the activity is Q26).
- **Q09.6 Drawn.** Every building is drawn with geometry; the structures README counts 11 records with no geometry and 5 with only a point: FAIL until modelled.
- **Q09.7 Cause.** Fires have their cause event (shelling, the 14th Connecticut detail) in the window.

**Inputs.** `structures.json`, `state_schedule.json`, `hospitals.json`, `app/data/structures3d.json`, the draw lists, conflict C-026. **Item.** (building part, transition, scenario) and the global assertions. **Result.** PASS; COVERED for a flagged plain-reading window with an L3 entry (A-46); FAIL. **Can pass when** no FAIL, the four global assertions hold, and every COVERED item has its L3 entry. **Registered instead.** A date-only or "morning" window: an open L3 entry, the visible flag and the plain-reading window (COVERED, A-46); damage decals beyond a documented count are plausible-procedural and marked (p. 102). **Judges.** SS rows (building and hospital objects), R02, R13 top rows. **Runs.** python and node; pictures `swgl`. State: see SPEC-B Q09.

### Q10 Night visibility check

**Text (p. 136).** "Night visibility check. At every night time, render test frames and assert minimum luminance and contrast for every unit and activity in view; the sky is dimmed; moon and stars follow the ephemeris."
**Reads.** L.5 (p. 135): "Night is clearly night: sky dimmed, stars and the ephemeris-driven moon visible, color grade cooler and darker. Everything and every activity stays visible, only dimmer: use an exposure and tone-mapping model with a guaranteed luminance floor so that no unit, structure or activity falls below a minimum readable level (Gate Q10). Night must not be implemented as black." B.10.5 acceptance criteria 1 to 6 (p. 114): the clock drives one timeline value; "Sun below -0.833 degrees means sky darkened according to the twilight bands; at astronomical night the sky is clearly dark with stars (where cloud permits) and the moon where it is above the horizon"; "Readability floor. At every instant, a viewer can identify units, activity and terrain features in the free camera at gameplay distance. This is an artistic exposure choice ... stated openly"; light sources tied to the timeline are visible and plausible; cloud cover per night follows B.10.2 (overcast July 1 to 2, cirrus July 2 to 3, 7/10 cumulus with gaps July 3 to 4, wet July 4 to 5); "Night does not hide the Evidence tier display: unit markers and tier tags stay legible at night". D.2 V11 test (p. 124): "the luminance histogram stays inside the 'readable' band at all night hours; every night activity cites a source or a plausible-procedural tag". L.6: every night has an activity schedule per unit.

**Checks.**
- **Q10.1 Night set.** The night times are every grid time with the sun's altitude below -0.833 degrees (twilight included; the timeline's NIGHT marker, civil dusk to civil dawn, is a subset, p. 9).
- **Q10.2 Readability floor on frames.** For every night time of the picture grid (every 10 minutes and at every state change of a night activity or light source: T-Q10-6) and every weather scenario, for the free-camera views at gameplay distance and for the framing of each night activity. Frame metrics, as `app/tests/sky.spec.mjs` measures them on the 8-bit sRGB frame with luminance Y = 0.2126 R + 0.7152 G + 0.0722 B: the mean (T-Q10-1), the 5th percentile (T-Q10-2), the share of pixels with Y under 8 (T-Q10-3), and the Michelson contrast (p95 minus p5) over (p95 plus p5) (T-Q10-4). Entity metrics, for every unit, structure and activity in view (projected area at least T-Q10-7): the region's mean Y is at least T-Q10-1 (the guaranteed floor of L.5 is the minimum readable level for every region, not only for the frame), and the Michelson contrast of the region's mean against the mean of its surrounding ring is at least T-Q10-9. The analytic floor (exposure, tone map, fill) is also checked at every grid minute.
- **Q10.3 Night reads as night.** Night luminance is below the same view at day (T-Q10-5), the sky dims monotonically with the sun's depression through the twilight bands, stars are present where the cloud table permits.
- **Q10.4 Ephemeris.** The moon in the frame is where Q11's table puts it, with the phase; it is absent when below the horizon or hidden by the night's cloud; stars follow the sidereal time.
- **Q10.5 Light sources.** Fires, lanterns, burning buildings, muzzle and shell flashes that the timeline places exist at their place and time, are visible, flicker, and are physically placed (L.5); an unsourced light is inferred or procedural and marked.
- **Q10.6 Tier display legible.** Unit markers and tier tags have contrast of at least 3:1 against their background at night (T-Q10-8, the WCAG AA non-text figure the main-site acceptance already applies).
- **Q10.7 Night activities.** Each NIGHT row and each night's per-unit schedule (fires, cooking, sleeping, picket, march, digging, artillery moving, burying, carrying and treating the wounded, foraging, wagons) is realized and in view passes Q10.2; where sources are silent the unit's documented posture plus a labeled routine is shown and the gap registered (L.6).
- **Q10.8 Disclosure.** The product declares the readability boost in its settings (p. 114, limits note: "the boost factors are artistic, not physical, and the product declares this in its settings"); the default is the readable setting; the "physically dim" comparison toggle the plan allows is optional.

**Inputs.** The ephemeris table (Q11), the weather timeline (Q22), the layer's night activities, the rendered frames (`swgl` here, `gpu` owed), the exposure and tone-map code. **Item.** (night time, view, scenario, entity or activity in view). **Result.** PASS or FAIL; a frame with any entity below the floor is FAIL; no COVERED. Pixel statistics from software rendering are recorded `PASS@swgl`; the same frames on the real GPU are owed and listed. **Can pass when** thresholds are recorded, the grid is complete and no FAIL. **Registered instead.** Night practice that no source gives (fires, pickets, lanterns): plausible-procedural routine, marked, entry open (B.10.7). **Judges.** R18.0000. **Runs.** node (analytic floor), `swgl` (frames). State: see SPEC-B Q10. Ambiguity: A-16.

### Q11 Ephemeris check

**Text (p. 136).** "Ephemeris check: sun and moon values equal an independent ephemeris at the site and times."
**Reads.** L.1 (p. 135): compute sun and moon positions and phases from an ephemeris for the exact latitude, longitude and times for the whole window; "Do not trust a website table; verify the moon phase independently. All sky, shadow and moonlight values derive from the ephemeris (Gate Q11)." B.10.2 (p. 111): time is local mean time, "UTC minus 5 h 09 m"; the PDF's table was computed with astropy 8.0.2 builtin ephemeris at 39.83 N, 77.23 W, 170 m with sun thresholds -0.833, -6, -12, -18 degrees; "The only independent check is the full moon time, which matches the published value to within one minute; rise and set times are not independently checked against USNO"; the computed times are astronomical-horizon times and "the engine should apply the local horizon from the terrain model, not a fixed offset". Full moon July 1 06:46 UT (p. 3); moon waning gibbous 99% on July 1 to 68% on July 5 (p. 114, B.10.5 step 5); moonrise July 1 19:53 (p. 9).

**Checks.**
- **Q11.1 Values.** For every grid minute of the whole window (June 26 to July 14 and November 18 to 19) the product's own runtime functions give sun altitude and azimuth, moon altitude and azimuth, illuminated fraction and phase, and the day's sunrise, sunset, civil, nautical and astronomical twilight and moonrise and moonset; each equals the reference within the recorded tolerances (T-Q11-1 to T-Q11-5).
- **Q11.2 Independence.** At least two reference methods that share neither code nor coefficient tables with the product and differ in theory (for example a numerical ephemeris through an established library and an analytic series), plus the anchor facts above. A shared quantity (the Delta T model for 1863) is named and its effect bounded against an independent Delta T source. Agreement between the product's table and its own generator is not independence.
- **Q11.3 Site and clock.** One site (39.83 N, 77.23 W, 170 m per B.10.2) and LMT = UTC - 5 h 09 m everywhere (the S-086 row prints 39.82 N, a defect of the plan, A-17).
- **Q11.4 Local horizon.** Rise and set times in the product include the terrain horizon from the terrain model; the check compares the astronomical-horizon values to the reference and the product's local-horizon values to the terrain-derived horizon.
- **Q11.5 Used values.** The rendered sun and moon in frames sit at the table's altitudes and azimuths and cast shadows in the right direction (checked on `swgl` frames: shadow azimuth equals sun azimuth plus 180 degrees within the tolerance).

**Inputs.** The reference implementations (python; astropy or an equivalent installed from PyPI, not present in the container by default), the product's astronomy code and tables, `environment/` data. **Item.** (date or minute, quantity). **Result.** PASS or FAIL. **Can pass when** two independent references agree with the product on the whole grid. **Registered instead.** Nothing replaces a numeric disagreement: a value outside tolerance is FAIL. Named limits are registered with their bound: the Delta T shared by the methods, the common ancestry of the lunar series, the terrain horizon model (inferred). **Judges.** R15.0000, R18.0000. **Runs.** python (about 30 s of recomputation, through the lock) and node. State: see SPEC-B Q11. Ambiguity: A-17.

### Q12 Scrub test

**Text (p. 136).** "Scrub test. Random-access seeks (forward and backward, including jumps across the whole window) produce state identical to sequential playback at the same time; no unit pops; the cache header seed and code version match."
**Reads.** T.2 and T.3 (p. 137): event-sourced cache with snapshots; the cache header holds "the deterministic seed, code version, scenario id and the input hash"; two-way navigation "with state identical to forward playback (Gate Q12). Backward play uses stored snapshots and reversible visual state (fence, earthwork, building, vegetation and weather states are functions of time, not accumulated side effects)". D.3.2.1 (p. 125): counter-based generator keyed by (run seed, agent id, time bucket). D.2 V12 (p. 124): "from any time t1 to t2, the world state equals the state reached by playing forward; jump latency within budget". D.7 phase 12 (p. 130): "Jump tests at 100 random times". Coverage map 12 (p. 4): "scrubbing round trip is bit-identical".

**Checks.**
- **Q12.1 Seek identity.** For every sampled pair (t1, t2), forward and backward and across the whole window, the digest of the state after a random-access seek to t2 equals the digest of sequential playback at t2.
- **Q12.2 Round trip.** The seek A to B and back to A reproduces A's digest bit for bit.
- **Q12.3 Samples.** At least 100 random jump times (p. 130), every timeline row's seek targets (TL-5), both window ends, every snapshot boundary and one step either side, every event boundary; over the default, the two extremal and every other scenario the property factors over (1.6). The runner records the random seed.
- **Q12.4 The digest.** `StateDigest(t, scenario)` is a hash over the canonical serialization of every time-dependent layer: unit presence, positions, formations and activities; every entity table (soldiers, horses, guns, vehicles, flags); casualties and hospital contents; structure state buffers (fences, buildings, works, hospitals); vegetation states; weather and environment channels; sun, moon and light sources; effects by cause; scheduled sounds; figure animation phases. The layer list is a registry; a time-dependent layer outside the digest is a FAIL of the census (as in Q02.1).
- **Q12.5 No pops.** Between consecutive frames no entity appears, vanishes or jumps except at documented entries and exits; checked also immediately after a seek.
- **Q12.6 Header.** The cache header's seed equals the project seed, the code version equals the running code's, the scenario id equals the requested one, the input hash equals the recomputed one; a mismatch must make the cache refused, and using a mismatching cache is FAIL.
- **Q12.7 Determinism.** The same seed and inputs give byte-identical caches and digests on two runs; the digests are also recorded for the owner's machine (floating-point differences across machines are the reason D.3.2.1 asks for fixed-point or tightly controlled code; the cross-machine comparison is owed).
- **Q12.8 Latency.** A jump completes within a recorded budget (T-Q12-1; the plan says "within budget" and sets none: INCOMPLETE until recorded).
- **Q12.9 UI.** The scrubber, jump-to-event, speed change and bookmarks end in the same digest (`swgl` browser).

**Inputs.** `sim/cache.mjs`, the stage and all layer functions, the scenario set. **Item.** (seek pair, scenario). **Result.** PASS or FAIL. **Can pass when** zero FAIL over the sample set of Q12.3 in every scenario of S*, the layer registry of the digest is complete, the header check holds, and T-Q12-1 is recorded and met. **Registered instead.** Nothing: a failing seek is a defect; a time-dependent layer outside the digest is a FAIL of the registry, not COVERED. **Judges.** every TL row (its seek targets), R01, R07, R11, R19 top rows. **Runs.** node for state; `swgl` for the scrubber; `gpu` owed for latency. State: see SPEC-B Q12. Ambiguities: A-18, A-19.

### Q13 Audio

**Text (p. 136).** "Audio delay equals distance divided by the speed of sound at the modeled temperature; attenuation and occlusion tests; silence in empty woods except documented ambient."
**Reads.** S (p. 137): S.2 "Model each source with its own position and time. Delay = distance divided by the speed of sound at the modeled temperature. Apply distance attenuation, frequency-dependent atmospheric absorption, ground effect and terrain occlusion." S.3 acoustic shadows and refraction "show shadow zones only as scenarios, tag them plausible-procedural, and register the gap". S.4 (R06) "sources outside the viewer's range are rendered with correct delay and attenuation; woods without events are silent except documented ambient sound (weather, insects, birds, horses where a source exists, otherwise procedural and tagged)". S.5 voice culling and aggregate beds "only as optimizations that preserve per-source timing and distance relationships". S.6 music only as the period sources document. D.2 O6 test (p. 124): "delay equals distance over c at the day's temperature; loudness falls monotonically with distance; woods with no active sources emit only natural ambience". D.7 phase 10 (p. 130): "attenuation monotonic; silent-woods test; voice cull budget". C.6 (p. 119): c is about 343 m/s at 20 C (about 3 s per km).

**Checks.**
- **Q13.1 Delay.** For every sound event of the real layer (each shot, burst, explosion, hoofbeat, voice the layer emits), listener position and grid time: the scheduled arrival minus the emission time equals `d / c(T(t))` within T-Q13-1, where `d` is the straight-line distance from the source position at emission to the listener at arrival and `c(T)` is the speed of sound in air at the temperature `T(t)` the weather state holds at that time (the same value the scene uses, Q22). The baseline carries no wind or refraction term (A-20). Tested on fire events from the real layer, not only on synthetic ones, and on an analytic grid.
- **Q13.2 Attenuation, absorption, ground, occlusion.** Level falls monotonically with distance in every band; absorption is frequency-dependent; a listener behind a ridge or building (line of sight blocked) receives additional attenuation against the same listener in the open at equal distance; ground effect is present for grazing paths.
- **Q13.3 Silent woods.** A listener in woods with no active source in range hears only documented ambient: weather, insects, birds, horses where a source exists, otherwise procedural and tagged. No gunfire or artillery bed plays where the cache holds no source; checked over the real woods cells across the whole timeline.
- **Q13.4 Per source.** Each source has its own position and time; culling and aggregate beds keep per-source arrival times and distance relationships (the optimization is documented).
- **Q13.5 Shadow scenarios.** Acoustic-shadow and refraction models are selectable scenarios with adjustable wind and temperature profile, tagged plausible-procedural, with the gap registered; the baseline excludes them. The documented anchors (Ewell's party not hearing Longstreet's signal on July 2; the Pittsburgh claim; the Ellis attribution unverified, p. 119) are comparison cases and are shown as such, not as facts.
- **Q13.6 Music** exists only where a period source documents it (regimental bands, drums, bugle calls); sourced bugle calls and guidon patterns are a register item (p. 137, S.6).
- **Q13.7 Provenance.** Every sample or synthesis recipe is in the audio ledger with licence, source and method; none is CC BY-SA, NC or ND where the release forbids it (`shippable` false); synthesized sound is flagged as modern reconstruction in the register and in the product per DD-14 (disclosure in the "what you are seeing" panel and the overlay; never called period sound; a modern recording is not 1863 audio).
- **Q13.8 Audible from anywhere.** For R06: no culling radius changes a source's arrival time or order; a far source is heard at its delayed time.

**Inputs.** The audio planner and the graph (`app/src/audio3d`), the weather state (Q22), the layer's fire events, the audio ledger. **Item.** (source event, listener, time) and (woods cell, time). **Result.** PASS or FAIL; no COVERED. **Can pass when** all samples PASS, including the real-layer and woods scans. **Registered instead.** Black-powder acoustics have no sourced study (p. 137, S.1, p. 119): register; the synthesis stays tier plausible-procedural. **Judges.** R03.0000, R06.0000 (and OA05). **Runs.** node and an `OfflineAudioContext` browser run on `swgl` (no GPU involved); listening to the mix is not attainable here and is listed as owed. State: see SPEC-B Q13. Ambiguity: A-20, A-52.

### Q14 Ordnance

**Text (p. 136).** "Ordnance ranges, elevations and rates of fire within documented figures; per-battery gun counts match the verified battery table."
**Reads.** W.1 (p. 137): a verified weapons table with sources (infantry arms, cavalry arms, bayonets, artillery with ammunition, ranges, rates, crew roles, limber and caisson loads); figures to confirm from primary text: "Napoleon 12-pdr crew of nine, shot to about 1,680 yd at 5 degrees; 3-inch rifle shot to 1,830 yd at 5 degrees; Springfield effective 200-400 yd; infantry loads (40 rounds in the box, 20 in pockets or knapsack, 60 total ...)". Gaps "(Blakely specifications, per-elevation range tables, chest rounds, recoil distance, fuse models, Confederate crew size) are register entries until a primary manual or ordnance report (Gibbon, the 1861 Ordnance Manual) is read". W.2: every battery has a record (commander, guns by type and number, section positions by time, horses and teams, ammunition expended, casualties, position changes) ingested from the Official Records. B.6.14.1 (pp. 78-79) piece table with the conflicting values shown as ranges (Napoleon shot 1,619 to 1,680 yd, canister 350 to 400 yd, 10-pdr Parrott 1,850 to 1,900 yd at 5 degrees, crew 8 or 9, guns on the field 366 to 372 Union and 281 to 282 Confederate). B.6.14.2 (p. 79) ammunition and fuzes; B.6.14.3 (p. 80) cycle time "about 20-30 seconds per round for a trained detachment" (inferred); B.6.11 (p. 75) muskets "2-3 rounds a minute typical".

**Checks.**
- **Q14.1 Weapons table** exists with sources and tiers for every weapon the product fires, conflicts as ranges.
- **Q14.2 Ranges and elevations.** For every projectile event the range does not exceed the documented figure for its type at the nearest documented elevation not below the shot's elevation; elevations lie inside the documented points or a calibrated model labeled inferred whose output at each documented point equals the documented figure within the documented spread. Where a per-elevation table is not documented (W.1 gap) the item is COVERED by its register entry, not PASS.
- **Q14.3 Ammunition by range band.** Canister inside 350 to 400 yd (double canister inside about 100), solid shot, shell and case beyond (p. 80, the plan's inference, tier inferred); a depiction of defective Confederate fuzes and overshooting on July 3 where documented (p. 137, V.1), marked.
- **Q14.4 Rates of fire.** Over every sliding 60-second window no piece or soldier fires faster than the documented maximum of its weapon (artillery cycle, musket 2 to 3 a minute, documented breechloader rates); a slower rate is allowed.
- **Q14.5 Gun counts.** For every battery and grid time, guns present by type and number equal the verified battery table (documented ranges stay ranges: G-11, G-13, G-14); army totals lie inside 366 to 372 and 281 to 282 as ranges; the July 3 counts are ranges (p. 137, W.3).
- **Q14.6 Ammunition.** Expenditure does not exceed the documented per-battery stock or documented expenditure (typical six-Napoleon stock 288 solid shot, 288 spherical case, 96 shell, 96 canister; Smith's 4th NY 240 rounds; Wheeler's 13th NY 850 rounds).
- **Q14.7 Crew.** Eight or nine per piece is a selectable scenario; crew roles and the drill state machine follow the manuals (p. 79).

**Inputs.** `kit/weapons.json`, `kit/artillery_batteries.json`, the verified battery table (`kit/verified_batteries.json`, announced, not present), the fire events, the OR battery reports. **Item.** (weapon class, event) and (battery, time). **Result.** PASS; COVERED only for the documented-gap items of W.1 (open L3 entry); FAIL. **Can pass when** the verified battery table exists and no FAIL. **Registered instead.** The W.1 gaps. **Judges.** GE rows, R03.0000, R04.0000. **Runs.** python and node. State: see SPEC-B Q14. Ambiguity: A-47.

### Q15 Frame-time budget

**Text (p. 136).** "Frame-time budget at target agent counts in the headless benchmark."
**Reads.** C.1 and D.2 O1 (pp. 119, 123): "Headless benchmark scenes at rising agent counts with measured frame-time"; D.6.1 (p. 128): "an empty scene, then a crowd scene at rising agent counts, then a single film-grade frame", recorded in the hardware profile; D.7 phase 12 (p. 130): "frame-time at target agent counts". N (p. 135): soldiers instanced one-to-one up to the strength figure, no capping for performance without an owner decision. DD-15 and DD-27: the product is the browser viewer, WebGL2 by default, WebGPU only on request and unseen.

**Checks.**
- **Q15.1 Scenes.** Benchmark scenes at rising agent counts (empty, rising steps, the default scenario's full one-to-one count, and the upper end of the strength ranges of both armies) with camera paths: overview, descent into the densest moments (the Angle on July 3, the Wheatfield, the cannonade), a night scene with light sources, a storm scene, a time-lapse.
- **Q15.2 Measurement.** Per-frame CPU and GPU time on the owner's GPU (the one in `GOVERNANCE/hardware_profile.json`) in a headless run, after a fixed warm-up, over a fixed duration; p50, p95, p99; renderer API, resolution, power and thermal state recorded. WebGL2 and WebGPU are recorded separately.
- **Q15.3 Budget.** p95 within the recorded budget (T-Q15-1 to T-Q15-4: p95 20 ms paced, p95 10 ms CPU plus GPU uncapped, no long task over 50 ms, input answered within 100 ms; the 20, 50 and 100 stand in the main-site acceptance thresholds).
- **Q15.4 No capping.** The counts in Q15.1 are one-to-one; level of detail changes how a soldier is drawn, never whether; a pass reached by dropping soldiers is FAIL.
- **Q15.5 Jump latency** (shared with Q12.8).

**Inputs.** The benchmark harness, `GOVERNANCE/hardware_profile.json`, the real layer's counts. **Item.** (scene, agent count, camera path). **Result.** PASS, FAIL or NOT-RUN. **Can pass when** run on the owner's GPU with every scene inside the budget. **Registered instead.** Nothing: if the budget cannot be met without capping, the stop condition applies and the question goes to the owner (p. 135, N; p. 128, D.5.12); the gate is FAIL meanwhile. **Judges.** R01.0000. **Runs.** `gpu` only. The container has software rendering only; a runner here records NOT-RUN with that reason and claims no frame time. State: see SPEC-B Q15. Ambiguity: A-09, A-08.

### Q16 Photo-match

**Text (p. 136).** "Photo-match tests at known camera positions of period photographs (staged-photograph flags respected)."
**Reads.** G.5 (p. 134): procedural rock "validated by photo-match at documented camera positions". K.4 (p. 135): "The Devil's Den photograph is staged and cannot be used as a candid reference for posture or arms." X.5 (e) (p. 137): reviewers "check the render against photographs (Gate Q16)". D.7 phases 4, 5, 13, 15 (pp. 129-130): photo-match tests at known 1863 camera positions; Q28's chapter against the 1863 photographs. B.9 Table 4 (p. 107): photographs with camera positions and rephotography (Frassanito), the NPS Then and Now pages.

**Checks.**
- **Q16.1 The set P.** Photographs made in 1863 (the plan's examples: Gardner and O'Sullivan from July 5 to 7, Brady, the identified November 19 photographs) with a documented camera position (a non-lead source states it; a position derived from the match itself does not count) and its uncertainty. A photograph without a documented position is BLOCKED-INPUT and is registered.
- **Q16.2 Render.** The scene is rendered from the documented position and orientation at the photograph's date and time of day (structure states such as the Leister wall as photographed on July 6 and the gatehouse on July 7, weather, vegetation, shadows from the ephemeris).
- **Q16.3 Registration.** At least the recorded minimum number of stable landmarks (buildings unchanged since 1863 used as control points, wall lines, outcrops, ridge lines) are matched; per-landmark reprojection error and the RMS are recorded and compared with the recorded threshold (T-Q16-1, unset until the first documented position exists).
- **Q16.4 Verdict.** match, partial or mismatch, decided by the thresholds and recorded with the residual table. A verdict written only by eye is not a pass.
- **Q16.5 Staged.** A staged photograph (the Devil's Den sharpshooter pair, July 6) is used for geometry only; its posture, arms and bodies are not used as candid reference; the match report says so.
- **Q16.6 Corrections.** Any change to terrain, rocks or objects made to improve a match is a recorded correction with its source (G.3); nothing is tuned silently.

**Inputs.** `tools/bt/photomatch` (catalogue of 109 records, poses, renderer, verdicts), `app/docs/PHOTOMATCH.md`, the library images, the NPS texts. **Item.** a photograph of P. **Result.** PASS, FAIL, BLOCKED-INPUT, NOT-RUN. **Can pass when** P is not empty and every item is PASS; with P empty: INCOMPLETE. **Registered instead.** The camera position unknown: an open entry with the negative searches (NPS Then and Now pages, Frassanito, which is print-only and a purchase is an owner-only act, DD-26). **Judges.** the CT rows of photograph type, R02.0000, R12.0000, R22 (chapter). **Runs.** renders `swgl` (the geometry match does not depend on the GPU), composition python. State: see SPEC-B Q16. Ambiguity: A-21.

### Q17 Coverage of the timeline

**Text (p. 136).** "Coverage: every timeline row has a visual realization or an open register entry."
**Reads.** D.2 O7 (p. 124): "Coverage matrix: every timeline row either has a visual realization or a register entry"; coverage map O7 (p. 5): "No gap larger than a stated interval without a labeled procedural fill". O.4 (p. 136): "Every unit-time slot has an activity (Section M.6) and a position region with uncertainty. A slot with no sourced activity is filled with the unit's last documented state plus a labeled routine, never left empty and never silently invented." B.2 (p. 9): open-gap rows generate no behaviour and surface as map markers; plausible-procedural rows generate seeded visibly flagged behaviour. B.12.2 (p. 117): the epilogue rows are timeline rows ("E-prefixed, same tiers as B.2").

**Checks.**
- **Q17.1 Row set.** The 691 rows of T1, T2, T3 and the 14 epilogue rows E-001..E-014: 705 rows. The scan reads both seed files.
- **Q17.2 Realization.** The row's realization record is valid (3.1 TL-2): executed by the query harness in every scenario of the row's group, expected equals observed, inside the window.
- **Q17.3 Register alternative.** An open L3 entry (1.5) for the row and, for an open-gap row, the visible marker at the right time and place; for a plausible-procedural fallback, the marked seeded behaviour.
- **Q17.4 Slot coverage.** For every unit and every grid time between its arrival and departure there is an activity and a position region with uncertainty, sourced or a labeled routine; no slot is empty and none is unlabeled (O.4).
- **Q17.5 Gap markers** exist for every open-gap row in the evidence layer.

**Item.** a row. **Result.** PASS (valid realization), COVERED (Q17.3), FAIL (neither). The gate verdict is PASS when every row is PASS or COVERED. The S-R `passes` needs the item PASS and TL-3 to TL-8; a COVERED row is LINKED-ACTIVE. **Inputs.** `GOVERNANCE/realizations/`, the query harness, the timeline files, the register. **Can pass when** no row is FAIL; today the realizations folder is empty, so every row is COVERED at best. **Registered instead.** This is the gate's own register branch: an open L3 entry, and for an open-gap row the visible marker, for a plausible-procedural fallback the marked seeded behaviour; the entry names the settling source of the plan's gap table. **Judges.** TL rows, EP rows, R05.0000, R07.0000, R11.0000. **Runs.** python and node. State: see SPEC-B Q17. Ambiguities: A-10, A-37.

### Q18 Requirement coverage

**Text (p. 136).** "Requirement coverage: all 21 requirement IDs have sub-requirements, each passing or linked to an open register entry with an active reconstruction."
**Reads.** F (p. 134): "100% of sub-requirements are either passing or linked to an open register entry awaiting an owner decision with work continuing on the best reconstruction; anything else is unfinished work, not an exception." Z.1 to Z.3 (p. 138). The requirement set is R01 to R22 (A-01) and the nine owner-chat rows.

**Checks.**
- **Q18.1 Requirements.** R01 to R22 (22) have wording equal to `_req_src.json` (never edited) and each has at least one sub-requirement; OA01 to OA09 are present.
- **Q18.2 Coverage.** Every sub-requirement is PASSING or LINKED-ACTIVE (L3, 1.5); top-level rows by derivation (3.9). The report gives counts per status and per class, and lists every UNLINKED, LINKED (L1, L2) and each reason.
- **Q18.3 Populations.** Each expected population of 2.3 exists; a missing one is FAIL.
- **Q18.4 Register integrity.** Every linked entry resolves, is open or awaiting owner, has all Section R fields (`id`, requirement ids, description, why literal 100% is impossible or blocked, evidence searched with negative results, reconstruction method, tier, marking, impact, owner decision requested, status, decision date; p. 136-137, R) plus a reconstruction, a marking and an owner-decision field (Z.3); entries are never deleted.
- **Q18.5 Flags honest.** No `passes=true` without a valid run record (1.7); none with `seeded_unverified`; none with NOT-RUN or BLOCKED-INPUT in an applicable gate.
- **Q18.6 Wording.** No sub-requirement text has changed since seeding (F); additions only.

**Item.** a sub-requirement; plus the structural checks. **Result.** PASS or FAIL. **Can pass when** zero UNLINKED, zero L1 or L2 among non-passing rows, populations complete. This is a structure-and-honesty gate; it can pass while most S-Rs are LINKED-ACTIVE. **Inputs.** `requirements.json`, `_req_src.json`, `register_index.json` and `register/*.md`, the source data of the expected populations (2.3), `subreq_links.json`, the latest run records. **Registered instead.** Nothing: Q18 is the check that the registered alternative exists; a sub-requirement with neither a pass nor an L3 link is unfinished work. **Judges.** R01.0000 (and Z.2). **Runs.** python. State: see SPEC-B Q18 (458 unlinked at that time). Ambiguities: A-01, A-05, A-11, A-40.

### Q19 Claim ledger

**Text (p. 136).** "Claim ledger: every visible-result datum has two independent sources or a flag; no lead-only support."
**Reads.** P.2 to P.4 (p. 136): the claim ledger (claims, claim_support, conflicts; character-offset spans, not copied text); "A datum is documented only when a ledger claim from a non-lead source supports exactly it; a datum affecting a visible result needs two independent sources or an explicit flag (Gate Q19). Corroboration counts only independent witnesses (two accounts copying the same report are one)"; the ledger is built once and queried. App. B (p. 139): items affecting a visible result need two sources with distinct `independent_of` roots or a flag. D.4.3 stage 7 (p. 126): "a claim reaches tier documented when at least two independent sources support it, or one Tier 1 source. Single-source claims are kept and marked single-source. Derivative sources ... are linked and do not count as independent." Coverage map 14 (p. 4): "Every record has at least two sources or a gap tag; the citation checker finds each quote span; conflicts are listed". E.7 (p. 134): quarantine of forum, blog, Wikipedia, auction sources.

**Checks.**
- **Q19.1 Visible data census.** Every datum whose value changes what is seen or heard (positions and times, counts, kit items, structures' states, weather and sky values, sound properties, vegetation states, hospital and casualty content) is in the census, by class, with its claim ids.
- **Q19.2 Ledger link.** Each visible datum names claim ids that resolve in `claims` and `claim_support` to a span in a stored source.
- **Q19.3 Independence.** Two sources are independent when neither is in the other's `independent_of` ancestry and they share no root (a root is the source both copy, for example the Official Records). A state monument volume that quotes the Official Records is derivative; the 1876 Bachelder troop maps are a compilation of the Official Records and testimony, not an independent witness; a later account that copies an earlier one is linked and counts once; leads (Wikipedia, forums, blogs, auction pages, wikis) never count.
- **Q19.4 Two or a flag.** A visible datum has at least two independent non-lead sources, or carries an explicit flag shown in the product ("single source", "lead only", "inferred", "procedural"; the render flag of Q23). One Tier 1 source does not remove the need for the flag (A-07).
- **Q19.5 No lead-only support** of any documented datum.
- **Q19.6 Conflicts.** Claims that disagree on time, place, number or sequence are grouped in `conflicts`; each value's support is computed by Q19.3; the default view's choice is recorded (class CF).
- **Q19.7 Built once.** Later sessions query the ledger and do not re-derive claims (P.4); a claim without a span fails.

**Inputs.** The claim ledger (announced by another workstream; the position ledgers `history/positions/*.jsonl` and troop-map claims exist today), the Source Manifest with `independent_of`, `date_written` and reliability tiers, the census of Q19.1. **Item.** a visible datum. **Result.** PASS (two independent non-lead sources), COVERED (the flag is shown), FAIL. **Can pass when** the ledger covers the census and no datum is FAIL. **Registered instead.** The flag, plus an entry for the missing second source naming where it would come from. **Judges.** CF rows (with Q02), R03.0000, R21.0000. **Runs.** python and node. State: see SPEC-B Q19. Ambiguities: A-07, A-22.

### Q20 Cavalry presence

**Text (p. 136).** "Cavalry presence: every documented cavalry unit appears at its documented times with its manifest, horses and arms."
**Reads.** K.8 (p. 135): "Cavalry kit is first-class: Union cavalry and Confederate cavalry get the same manifest depth, plus horse furniture, horse color and type distributions, guidons, and weapons (sabers, carbines, revolvers). Spencer, Sharps, Burnside, Gallager, Smith, Merrill and Colt arms are assigned per regiment with the July 1 versus July 3 Spencer distinction preserved." B.6.15 (pp. 85-90): the Union Cavalry Corps and Confederate cavalry orders of battle (B.6.15.1, B.6.15.2, p. 85), the action table in time order from June 26 to July 16 with conflicts as ranges (B.6.15.3, p. 86), dress, arms, horses, tactics, and the 14-state list for the engine (B.6.15.6 and B.6.15.7, p. 89; conflicts B.6.15.8; gaps B.6.15.9). Coverage map 9 and D.2 V9 (pp. 4, 124): "Each cavalry fight (Buford July 1, Hunterstown, Brinkerhoff Ridge, East and South Cavalry Fields, pursuit) has timed rows; Spencer carbines appear only where sourced"; "gait cycle foot-contact test".

**Checks.**
- **Q20.1 The set.** Every cavalry unit of the verified OOB (regiments, troops, horse-artillery batteries) of both armies, including those documented as detached or absent (those are never drawn, with the record).
- **Q20.2 Times.** Each unit is present exactly in the intervals of its documented actions (the B.6.15.3 table as a machine table, with conflicts as scenarios: Stuart's arrival, the East Cavalry Field start at 13:00 or 15:00, Hunterstown), arrives and leaves by march (Q04, Q05, Q06).
- **Q20.3 Manifest.** Each unit has its manifest (K.1, K.8) for every soldier type present: trooper, horse holder, officer, trumpeter, sharpshooter-like skirmishers where documented.
- **Q20.4 Horses.** Counts by rider, led and draught horses; one trooper in four holds four horses when dismounted (p. 89); horse colour and type distributions, furniture and condition per regiment; horse casualties.
- **Q20.5 Arms.** Carbine, revolver and sabre per regiment from the sources; Spencers only in the 5th Michigan (all) and part of the 6th Michigan on July 3, never on Buford's line on July 1; no Henry (Q03).
- **Q20.6 States.** The 14 states of B.6.15.7 (march column to absent) are time-keyed per unit; the dismounted fights show horse holders, thin skirmish lines and breechloader reloading; the charges show the documented ground.

**Inputs.** `kit/cavalry_units.json`, `app/src/history/cavalry.mjs`, the verified OOB (Q01), the action table. **Item.** (cavalry unit, check). **Result.** PASS or FAIL. **Can pass when** every documented unit passes Q20.2 to Q20.6. **Registered instead.** Brigade-level dress and arms that are thin (B.6.15 gaps): inferred or plausible-procedural, marked, registered. **Judges.** R04.0000, R16.0000. **Runs.** node, python; foot-contact test of gaits per D.2 V9. State: see SPEC-B Q20. Ambiguity: A-23.

### Q21 Vegetation state check

**Text (p. 136).** "Vegetation state check: crop, canopy and ground-cover state per field per date within the documented-or-ranged schedule."
**Reads.** L.7 (p. 135): a `vegetation_states` schedule per field, woodlot, orchard and yard: "crop type, height and color range for the date (wheat harvest state in the Wheatfield, corn, oats, hay, pasture), tree leaf-out and canopy density for early July, orchard fruit state (unsourced in the notes; register the gap), undergrowth, and battle damage to trees and crops over time (trampling, shell damage, fire, stripped branches ...). ... every value is tagged and ranged. Grass height has no sourced value in the notes." G.6 (p. 134): "Crops are attributes per field with documented-or-assumed status and height ranges, never a single invented value"; chestnut and other post-1863 changes as a documented correction layer, verified before use. B.10.3 (p. 112). D.2 V13 test (p. 124): "Every vegetation polygon cites a source or is tagged inferred; field state at time t matches the state schedule".

**Checks.**
- **Q21.1 Schedule.** For every polygon class (field, woodlot, orchard, yard, and the classes the sources name) and every date of the window plus November 19, a `vegetation_states` entry gives crop or tree type, height range, colour range, canopy density, leaf-out, fruit state, undergrowth, ground cover (grass height, wetness) and damage events, each with tier and sources or a register entry; no single invented value.
- **Q21.2 Scene equals schedule.** At sampled times the scene's realized parameters (crop height distribution, placed tree counts and canopy, leaf coverage, ground-cover state) lie inside the schedule's value or range. A scene that draws no trees or crops, or draws the modern aerial vegetation, is FAIL.
- **Q21.3 Events.** Documented changes occur in their windows and reverse on backward scrub (the Wheatfield wheat trampled or clipped from about 16:30 on July 2, S-033; orchard damage; the felling for the Culp's Hill works; fire and stripped branches where sourced).
- **Q21.4 Anachronism.** No species or plant structure later than 1863; the chestnut question is a correction layer verified before use.
- **Q21.5 Pictures.** Photo-match of vegetation against 1863 photographs where a documented position exists (Q16).
- **Q21.6 November 19.** Late autumn: trees assumed leaf-off or nearly so, grass dormant, inferred (S-085).

**Inputs.** The vegetation schedule (announced; absent today), the scene's vegetation generator and instance data, `claims_*` vegetation ledgers, NPS vegetation and landscape reports. **Item.** (polygon class, date, parameter). **Result.** PASS or FAIL (the scene departs from the schedule or is absent); an unsourced value is a ranged, tagged, registered schedule value, so the scene can match it. The evidence for the schedule is judged by Q02 and the class rule of R20. **Can pass when** the schedule exists and the scene matches it. **Registered instead.** Crop state per field, grass height, fruit state, species composition of the Slaughter Pen and Round Tops: ranged, plausible-procedural, entries open (B.10.7). **Judges.** R20.0000. **Runs.** python and node; `swgl` pictures. State: see SPEC-B Q21 (cannot pass on inputs). Ambiguity: A-24.

### Q22 Weather state check

**Text (p. 136).** "Weather state check: scene weather matches the weather timeline at every time."
**Reads.** L.2 and L.3 (p. 135): `weather_states` built from documented records ("temperatures and conditions per day, fog at July 2 dawn, afternoon drizzle July 2, thunderstorms July 3, heavy rain from late July 3 into July 4 (1.39 in on July 4 per the notes' source), Plum Run overflow"); the wind conflict (12 mph versus about 2 mph) carried, with 2 to 6 mph rendered pending resolution; "Do not use the unsourced '88F on July 1' or climatological records as 1863 observations"; humidity, dew point, pressure and visibility modelled, plausible-procedural, parameters exposed; rain wets ground, raises mud, floods low ground; the dry July 2 to 3 ground versus the soggy July 4 ground is a state change tied to the timeline. L.8: insects, birds, dust, mud, standing water, creek levels, fog, rain and clouds are driven by the weather timeline and ground wetness. L.9. B.10.1 (p. 110) tables (Jacobs's 7 am, 2 pm and 9 pm readings through secondary summaries); B.10.5 step 16 (p. 114): one timeline value drives light, fog, cloud, rain, wetness and exposure; presets cross-fade over 10 to 30 simulated minutes. D.2 V8 (p. 124): "Weather timeline matches the B.10 table".

**Checks.**
- **Q22.1 Timeline.** The weather timeline exists with every documented value, its tier and its source or its plausible-procedural parameters, and equals the B.10.1 table (values and tier) including the wind range and both wind scenarios (C-045).
- **Q22.2 Scene equals timeline.** At every grid minute and for every weather scenario, each channel of the scene (precipitation type and rate, cloud cover, wetness, wind vector, fog density, temperature, creek level, mud and dust) equals the timeline at that time; during a cross-fade it equals the documented interpolation of the preset.
- **Q22.3 One state.** Every consumer reads the same state object: the renderer, the audio planner (temperature for Q13), the effects (wind drift of smoke and dust), the ground (mud, ricochet), vegetation, the sky (Q10, Q11). Two copies that can diverge are FAIL.
- **Q22.4 Tiers.** No condition is presented as documented without a source (L.9); modelled parameters are marked.
- **Q22.5 Drawn.** The weather state is actually drawn or heard on every supported renderer path; a state that is computed and not drawn (a renderer path that draws nothing) is not a pass for that path (DD-27 records that WebGPU draws nothing of weather yet).

**Inputs.** The weather timeline (`environment/`), `app/src/weather3d`, the `Environment` state, the plan's text. **Item.** (channel, grid time, scenario). **Result.** PASS or FAIL. **Can pass when** the whole grid passes in every scenario on each renderer path claimed. **Registered instead.** Humidity, dew point, pressure, visibility, July 4 rain timing, rain at night July 1 to 2 (B.10.7): modelled, tagged, entries open. **Judges.** R15.0000. **Runs.** python and node; the drawn state on `swgl` WebGL2. State: see SPEC-B Q22. Ambiguity: A-25.

### Q23 Marking check

**Text (p. 136).** "Marking check: every non-documented item carries a render flag; no unmarked procedural content."
**Reads.** U (p. 137): provenance overlay showing tiers by colour or glyph at the unit and object level, "hover or click shows source and register link. A published 'what you are seeing' document accompanies the product. No unmarked synthesized content may appear as documented (Gate Q23)." App. B (p. 139): `render_flag` 0 documented, 1 inferred, 2 plausible-procedural. C.10 (p. 121): a substitute "shown with that mark in the product's overlay", never documented. Z (p. 138): "labeling procedural content as documented; hiding a gap in the product" are forbidden. B.10.5 criterion 6 (p. 114): tier tags legible at night. DD-14 (audio disclosure in the panel and overlay), DD-22 (tier marks visible by default), DEC-006 (the process label dropped; tier marking stays).

**Checks.**
- **Q23.1 Census of content classes** drawn or heard: units, figures and their items, officers' and commanders' appearance, horses, guns, the artillery train, works, fences, buildings, markers, roads, the ground, vegetation, weather, effects (smoke, fire, muzzle flash, blood, mud), sounds, casualties, hospital activity, animation clips, the Events list and cards, the epilogue (Lincoln, crowd, platform). A class loaded and absent from the census is FAIL.
- **Q23.2 Flag in data.** Every item whose tier is not documented has `render_flag` 1 or 2 (open gaps have the gap marker class); a generator output with no `procedural` block or flag is FAIL.
- **Q23.3 Flag in the product.** With the overlay at its default state, every visible entity of every class with flag 1 or 2 shows the glyph or colour plus dash (never colour alone); its card shows the tier, the source and the register link; sampled in frames and checked exhaustively on draw lists.
- **Q23.4 Substitutes.** Modern motion bases, synthesized or modern-recorded audio, open textures and models carry the "modern reconstruction" mark in the asset manifest, the register and the overlay (DD-14 for audio).
- **Q23.5 Individual level.** Individual soldiers' positions, actions and faces are marked plausible-procedural (EG-0001: "Tier overlay glyph 2 on every individual").
- **Q23.6 Night.** Marks legible at night (Q10.6).
- **Q23.7 Register.** Every register entry with a tier other than documented has a non-placeholder `marking` (the existing check, necessary and not sufficient).
- **Q23.8 Gaps visible.** Every open gap in scope has its visible marker (U-14).

**Inputs.** The draw lists, the overlay code, `extensions.mjs` hooks `tierName`, `tierMark`, `tierMark.style` (a `null` tier on visible content is an unmarked item), the data's flags. **Item.** a content item or class. **Result.** PASS or FAIL. **Can pass when** every class is in the census and no item is unmarked. **Registered instead.** Nothing: an unmarked item is FAIL. The register holds the gap (tier, marking text); the mark must also be in the product. **Judges.** R03.0000. **Runs.** python (register), node (data and draw lists), `swgl` (that the marks are visible). State: see SPEC-B Q23. Ambiguities: A-26, A-52.

### Q24 Screenshot regression for the viewer

**Text (p. 136).** "Screenshot regression for the viewer."
**Reads.** App. E (p. 142): gate for R01 and R19. D.7 phase 12 (p. 130): the viewer with time navigation; "path re-render reproducible". The plan gives no baseline, tolerance or view list (A-27).

**Checks.**
- **Q24.1 Baseline set B.** A named set of (view, time, scenario, renderer class, viewport, interface state) covering: every panel and mode of the viewer, the scrubber states, bookmarks, the scenario switch, the provenance overlay on and off, day, night, weather, the epilogue chapter, at the desktop, tablet and phone viewport widths FINAL-ACCEPTANCE uses.
- **Q24.2 Compare.** Each fresh screenshot equals its baseline within the recorded tolerance (a per-pixel colour threshold and a differing-pixel ratio, T-Q24-1, T-Q24-2; the main-site values 0.1 and 0.002 are the ceilings).
- **Q24.3 Baselines are pinned.** Each baseline has a hash, the renderer class, the build and the decision that approved it. The runner never writes or replaces a baseline; a change in intended appearance needs a recorded decision first. A software-GL baseline can detect change between software runs and cannot certify the real GPU's picture, which has its own baseline made on the owner's machine (owed).
- **Q24.4 Determinism.** Two runs on one build give equal screenshots within the noise floor (measured and recorded); a non-deterministic frame is made deterministic (fixed seed, time and viewport) or excluded with a register entry.
- **Q24.5 Re-render.** A saved camera path re-renders identically from its cache hash (D.2 O1, p. 123).

**Inputs.** The viewer, the browser harness, the baseline folder. **Item.** a baseline entry. **Result.** PASS, FAIL or NOT-RUN (a renderer class without a baseline). **Can pass when** every entry of B PASSes on each renderer class claimed. **Registered instead.** Nothing for a FAIL: it is a regression. **Judges.** R01.0000, R19.0000 (and the screens of OA01). **Runs.** `swgl` here; `gpu` baseline owed. State: see SPEC-B Q24.

### Q25 Library audit coverage

**Text (p. 136).** "Library audit coverage: every source in the acquisition list is ingested, blocked with register entry, or scheduled with a reason."
**Reads.** X.1 (p. 137): "Execute the acquisition list in Appendix C.1 end to end", ordered: Official Records vol. 27 (all three parts), the state monument-commission volumes, regimental histories, Southern Historical Society Papers (keyword-filtered), Battles and Leaders, Fox, Dyer, Phisterer, Fremantle and the other witness accounts, NPS publications and the Gettysburg Seminar Papers, Chronicling America and other newspapers (as news-spread evidence only), LOC maps and photographs, the biography and memoir sets; "Track each source's status (scheduled, ingested, blocked, partial) in library/status.json and register blocks." X.3 (a) to (k): per-source audit steps (copy, edition and OCR quality and a second witness, for the Official Records a diff of the eHistory transcription against HathiTrust or Internet Archive scans; clean OCR; split and extract; reliability tier and date written; claims; conflicts; prefer sources closer to the event; detect copying; record negative results; update the ledger and `library/status.json`; "open register entries for unreadable or blocked sources"). X.4: throttle about one request per second, check terms and robots rules, private working store for public-domain OCR, never redistribute copyrighted text. D.4.2 (p. 126) print-only works are acquisition targets; D.4.3 stage 14 (p. 126): terminal statuses read, blocked with reason, print-only. Z.7 (p. 138): "the library status file shows no source silently skipped (Q25)". Appendix C.1 (pp. 139-142): C.1.1 Official Records and maps, C.1.2 terrain data, C.1.3 narrative, unit and biography sources, C.1.4 autonomous-method sources.

**Checks.**
- **Q25.1 The list.** A machine list of acquisition rows: every row of Appendix C.1.1 to C.1.4, every category of X.1, the 45 catalogue items of B.9, the reachable library of D.4.1, each with a stable id; aliases merged. The list is regenerated from the plan text and diffed against the status files; a row with no status is FAIL (silently skipped).
- **Q25.2 One terminal status per row.** `ingested`; `blocked` with an open register id and a recorded failed lookup (host, locator, date, response; no circumvention); `scheduled` with a reason, a named next action and a work-queue entry (never "for now": Law cl. 1 forbids indefinite deferral); `print-only` with an acquisition-target register entry. The extra words in use today (`partial`, `viewer-only`, `licence-checked`, `targeted-lookup-only`, `finder-not-authority`, `blocked-to-prior-research`) are not statuses of the gate; each must be mapped to one of the four, a partial one by splitting it into an ingested part and a remainder that is scheduled or blocked (A-28).
- **Q25.3 Evidence of ingestion.** The file hashes, acquisition date, rights and licence note, OCR quality and, for the Official Records, the second-witness diff where a witness is reachable (X.3 a); full text of public-domain works only in the private store.
- **Q25.4 Terms and rights.** The request log respects the throttle; terms and robots were checked and recorded; blocked hosts (on 2026-11-13 babel.hathitrust.org and ehistory.osu.edu answered with their own bot block) are recorded as blocked and not retried or circumvented; copyrighted works (Busey and Martin, Coddington, Pfanz, the Ladd edition, Thomas, Jensen, Coco, Gottfried, Warner) are cited and consulted where lawfully reachable, never bulk-copied (p. 134, E.6).
- **Q25.5 Assets.** Each motion clip, sample, texture and model has a licence, source and method in the asset manifest; items tagged non-commercial are excluded from any release export (p. 121, C.10).
- **Q25.6 Owner-only acts** (purchases, accounts, permission requests) are listed as exact owner steps, never done by Claude.

**Inputs.** `library/status.json`, `status_2.json`, `acquired*.json`, `candidates.json`, the regenerated list, the register. **Item.** a source row. **Result.** PASS (`ingested` with its evidence), COVERED (blocked, scheduled or print-only with their records; the gate text lists them as acceptable), FAIL (no status or an incomplete record). The gate verdict is PASS when every row is PASS or COVERED. For the R12 and R21 sub-requirements only PASS (and "used", CT-2) counts toward `passes`. **Can pass when** the regenerated list equals the status files row for row and no row is FAIL. **Registered instead.** Blocked: the failed lookup and an open entry; scheduled: reason, next action and a queue entry; print-only: an acquisition-target entry; owner-only steps written out as exact steps. **Judges.** CT rows, R08.0000, R12.0000, R21.0000. **Runs.** python. State: see SPEC-B Q25. Ambiguities: A-28, A-51.

### Q26 Casualty and hospital flow

**Text (p. 136).** "Casualty and hospital flow: every casualty event has a carry path to an aid station, field hospital or burial; field hospitals show the documented activity in the documented interval."
**Reads.** D.3.2.3 to D.3.2.5 (p. 125): the loss-constraint solver assigns casualty events across the unit's documented engagement windows so totals "match the documented killed/wounded/missing counts within their stated source range" (documented at regimental total, plausible-procedural at individual level); known fates are pinned; "Wounded flow. Casualty events spawn the evacuation chain (stretcher or walking wounded, ambulance, regimental and divisional hospital, Letterman system) with times from the medical notes". B.8.5 (pp. 97-99): Letterman roles (regimental aid, division and corps hospitals, general hospital, Ambulance Corps, ambulances per unit), the hospital table (B.8.5.2), night operations (B.8.5.3: tables by lantern, amputated limbs piled at Weikert, rain on July 4), carrying and evacuation behaviours with time windows (B.8.5.4, p. 99), horses and livestock (B.8.6, p. 99). B.8.8 must-show 6 (p. 102): operating tables by lantern at Spangler (S-049), amputation pile at Weikert (S-047), ambulance flow, rain on exposed wounded (S-070), burial and horse burning after July 4. D.7 phase 8 exit (p. 130): "Regimental totals match documented losses within source range; same seed same output; time-jump equals forward play". Z (p. 138): "leaving cavalry, field hospitals or casualty carrying out" is forbidden.

**Checks.**
- **Q26.1 Every casualty event has a path.** For every killed, wounded, missing or captured event (from the solver and the pinned fates): wounded have a carry path (walking, helped, stretcher, ambulance) to a regimental aid station, a division or corps field hospital or a general hospital; killed have a documented disposition (left where they fell until a burial party, shallow grave beside the place or trench with headboard where known, the Spangler orchard burials); missing and captured have the documented disposition (prisoner collection, or a flagged count not animated). No casualty is left without a path and none vanishes.
- **Q26.2 Path validity.** The path is continuous, within the bearer, ambulance and walking ranges of Q05, ends at a documented site (B.8.5.2) inside that site's documented operating interval, in the documented sequence and windows of B.8.5.4; tier shown (inferred or plausible-procedural where unsourced).
- **Q26.3 Hospitals show the documented activity** inside the documented interval and nowhere else: the opening and closing times, surgeon and staff counts as ranges, operating tables by lantern at night, the amputation pile, wounded counts as ranges (the Spangler count is the conflict C-038), ambulance flow, rain on exposed wounded on July 4, hand-offs (Weikert to Rock Creek and White Run, III and V Corps overnight, Granite Schoolhouse on July 3), Camp Letterman from its construction on July 10 (opening July 20 or 22 is C-044; closing November 20, 1863 or January 1864 is a disputed value, p. 134, E.5).
- **Q26.4 Totals.** Regimental casualty totals equal the documented losses within the source range; the same seed gives the same output; a time jump equals forward play (D.7 phase 8).
- **Q26.5 Ambulance Corps and trains.** Counts follow the documented ratios and the trains' dates (p. 98); vehicles pass Q03.
- **Q26.6 Horses.** Horse casualties and carcasses at the documented farms and battery positions at the documented times, the remainder flagged plausible-procedural (B.8.6).

**Inputs.** The casualty events and flow data (announced by the world-content workstream; not present), `structures/hospitals.json` (23 sites), the solver output, the cache. **Item.** a casualty event; a hospital site and interval. **Result.** PASS or FAIL. **Can pass when** the flow exists and every event and every site passes. **Registered instead.** Litter-bearer detail, hospital rosters and many construction times are gaps (p. 5, coverage map O5): plausible-procedural, marked, entries open. **Judges.** R05.0000, R13.0000 and the SS rows with `H-`, `GROUP-` and `PERSON-` objects. **Runs.** node. State: see SPEC-B Q26 (cannot pass on inputs). Ambiguity: A-29.

### Q27 Budget gate

**Text (p. 136).** "Budget gate: spend and compute against the Appendix F caps reported; cap breach triggers the stop condition (Section C and D.5.12)." `gates.json` appends the paragraph that follows the table in the plan: "Run a fresh-context verification subagent for each milestone with instructions to flag only correctness and requirement gaps. Do not self-certify what you have not run." (A-30)
**Reads.** C.1 (p. 133): every phase has a token and dollar cap in `budget/phase_budget.json`; "A cap hit is logged to the Decision Log only if finishing the phase would exceed it; the cap is raised only by the owner. Caps pace work; they never remove work." App. F (p. 143): caps are blank until the vertical slice is measured; "only the owner may raise them"; per-unit costs, retry factor, contingency 1.25; GPU hours as a planning number and a power and thermal guard; global guards: per-job turn limit, per-job spend limit, concurrency limit, GPU guard, no-progress halt, cache snapshot interval. D.5.12 (p. 128): phase cap; maximum retries; "No new passing features in N sessions halts the loop and writes a report for the owner"; "A phase that exits the budget with failing exit tests is not marked complete; it is escalated"; a spend-rate pause at 50% of features. Z (p. 138): "letting a budget cap remove a requirement" is forbidden. J (p. 134): `progress.md` records spend against cap.

**Checks.**
- **Q27.1 Caps set.** Every phase row of App. F (phases 0 to 13, the reserve) and every global guard has a value and an owner-approved flag. Setting or approving a cap is an owner-only act (DD-25: no cap change by Claude); with caps null the gate is BLOCKED-INPUT.
- **Q27.2 Spend recorded.** Per phase: tokens, dollars, GPU hours, wall clock, storage, failure and retry counts, from machine records.
- **Q27.3 Reported.** Each milestone report states spend against every cap and guard, including the reserve.
- **Q27.4 Stop condition.** When a cap is hit the phase halts, the report is written, the Decision Log gets the entry if finishing would exceed the cap, the phase is not marked complete when its exit tests fail, and no requirement, item or check is dropped because of the cap.
- **Q27.5 Independent verification.** Each milestone has a record of a fresh-context verification run (id, date, instructions "flag only correctness and requirement gaps", findings, disposition of every finding).

**Inputs.** `budget/phase_budget.json`, spend logs, `progress.md`, the decision log. **Item.** (phase or guard, cap) and (milestone, verification record). **Result.** PASS, FAIL or BLOCKED-INPUT. **Owner step.** Approve the caps after the vertical slice (D.8.2 item 10). **Can pass when** caps are set and approved, spend is recorded and reported for every phase and guard, any cap breach was stopped and escalated, and each milestone has its verification record. **Registered instead.** Nothing: with no cap there is nothing to be inside of; the gate is BLOCKED-INPUT and the owner step is written. **Judges.** R08.0000, R09.0000. **Runs.** python. State: see SPEC-B Q27.

### Q28 Epilogue gate (R22)

**Text (p. 136).** "Epilogue gate (R22): the Nov 19 chapter has every B.12.2 row and every S-080 to S-088 state with a tier; Lincoln's clothing, voice and wording are used only where two sources were read in the audit and otherwise marked reconstruction in the viewer; the version of the address shown is a selectable alternative in the conflict register; no off-Gettysburg event appears in the film path; the jump is labeled as a device."
**Reads.** B.12 (pp. 116-119): B.12.1 the jump (p. 117), B.12.2 rows E-001 to E-014 (pp. 117-118), B.12.3 states S-080 to S-088 (p. 118), B.12.4 Lincoln and the front-row viewpoint (p. 118), B.12.6 (p. 119). A (p. 133) R22: "The default film path ends with the July 4 events at Gettysburg ... At the end of July 4 the animation swirls and jumps to the Gettysburg cemetery on November 19, 1863, and from the point of view of a person in the front row shows an accurate version of Lincoln taking the stage and giving the Gettysburg Address. Events outside Gettysburg are not shown." D.7 phase 15 (p. 130): "Gate Q28; photo-match against the 1863 photographs; sound intelligibility check from the front row".

**Checks.**
- **Q28.1 Rows.** The November 18 and 19 chapter contains each of E-001 to E-014 with tier, source and the conflict or gap note; none dropped.
- **Q28.2 States.** Each of S-080 to S-088 is present as the state it prints, with a tier; the conflicts S-081 (Oct 17 or Oct 27) and S-083 (platform position, Evergreen side per Wills 1992 and Frassanito 1995 against earlier park materials) are selectable.
- **Q28.3 Lincoln.** For each attribute of Lincoln (clothing, hat, gloves, mourning band, boots, height, face, posture, voice, accent, wording, seat, horse): used as fact only where two independent non-lead sources were read in the audit and are in the ledger; otherwise shown as reconstruction on screen and in the card. The voice is synthesized from the descriptions and labeled a reconstruction, never a recording (no recording of Lincoln exists, p. 118). The figure is built from the 1863 photographs under the commanders' likeness rule (p. 119, B.12.6).
- **Q28.4 Address versions.** The version of the Address shown is one of the values of a conflict record in the register (a new conflict id; A-31) that lists as selectable alternatives the text as delivered and taken down by Hale, the text the reporters printed on the day (the default, p. 118), the Associated Press and Philadelphia Press texts, and each manuscript copy; each version carries its source and its word count only if read; nothing is claimed beyond the sources.
- **Q28.5 Film path is Gettysburg only.** The default film path is an explicit list of rows; every row's place is inside the Gettysburg area (loaded ground, town, cemetery) per the gazetteer; none of T3-168 and later (Monterey Pass, the pursuit, Williamsport, Falling Waters) is on it; those stay scrubbable as optional chapters (p. 117). A journey to Gettysburg is not shown; Lincoln's arrival at the station is.
- **Q28.6 The jump is a device.** The viewer labels the transition as a time jump, not as history; the world state is interpolated through the documented intervening changes (the August purchase of the 17 acres, the layout work, burial parties, the start of reinterments, the season from midsummer to late autumn) with tier plausible-procedural for the interpolation (p. 117, B.12.1).
- **Q28.7 Chapter and scrub.** November 19 is its own time chapter on the same scrubbable timeline; the viewer can scrub within it and leave the front-row viewpoint for the free camera (Q12 over the chapter).
- **Q28.8 Front row.** The viewpoint is a generic period audience member at eye height in front of the platform; seat, distance and sight lines are computed from the platform footprint once S-083 is settled; speech intelligibility at the front row is a computed result (p. 118).
- **Q28.9 Pacing.** Everett's oration is compressed with a visible time-skip; Lincoln's remarks play in real time, paced to the shorter range (under two minutes, EWH; a few minutes at most, W-CONS; p. 118); the crowd is a range (15,000 to 20,000) with plausible-procedural composition (S-087).
- **Q28.10 Photographs.** Photo-match of the chapter against the 1863 photographs (Q16), among them the two procession photographs reported as identified at the Library of Congress in 2006 (a W-CONS claim, to verify before use).

**Inputs.** `epilogue_seed.jsonl`, `structures/state_schedule.json` rows S-080..S-088, the conflict register (to be extended), the film-path object (not present), the Nov 19 scene (not drawn), Hale, the Associated Press and Philadelphia Press reports, the Lincoln manuscripts. **Item.** a row, a state, a Lincoln attribute, the Address version, the film path, the jump. **Result.** PASS or FAIL; COVERED only for the Lincoln attributes marked reconstruction (the gate text allows it). **Can pass when** every item is PASS or COVERED as stated. **Registered instead.** Lincoln's clothing, voice, wording and seat, the start of the ceremony, the platform footprint (EG-0022, EG-0120). **Judges.** EP rows, R22.0000, S-080..S-088. **Runs.** python and node for data; labels `swgl`; the speech-intelligibility computation node. State: see SPEC-B Q28 (cannot pass on inputs). Ambiguities: A-31, A-36, A-48.

---

## 5. Requirement-level checks and the top-level rows

The "Test" columns of D.2 (pp. 123-124) and of the coverage map (pp. 4-5) are the plan's own machine-checkable tests per requirement. Appendix E (pp. 142-143) maps each requirement to gates; the gates are necessary and the tests below are added to them (TOP-2b, A-40). IDs follow the plan: O1 to O7 are R01 to R07, V1 to V14 are R08 to R21, V15 is R22.

| Row | Gates (App. E) | C.9 verdict (p. 121) | Requirement-level checks RC (the plan's tests; all must pass with the gates and the children for `passes`) |
|---|---|---|---|
| R01.0000 | Q12 Q15 Q18 Q24 | enormous but possible (two renderers on one data layer) | RC-R01.1 headless benchmark at rising agent counts with measured frame time (Q15); RC-R01.2 a saved camera path re-renders bit-reproducibly from the cache hash; RC-R01.3 an offline render of a sample path passes the independent review; RC-R01.4 the U (p. 137) interface set exists: free camera with unlimited flight over the whole field and time range, smooth two-way scrubbing and speed control, unit and soldier selection showing unit, time, activity, kit manifest and sources, saved camera paths, a timeline bar with the B.2 event markers, day and night shading and weather, the scenario switch, the provenance overlay |
| R02.0000 | Q03 Q07 Q08 Q09 Q16 | possible with labeled reconstruction | RC-R02.1 height error report against lidar and against Warren (G.3: residuals per area); RC-R02.2 photo-match reprojection error at known 1863 camera positions (Q16); RC-R02.3 feature-count coverage against the B.7 and B.8 registers: every E, P, G, building, fence, wall, road and hospital of the record is present or its absence is a registered unfinished build (FAIL until built) |
| R03.0000 | Q02 Q13 Q14 Q19 Q23 | literally impossible | RC-R03.1 every history-layer row has source, tier and window; RC-R03.2 the overlay lists the tier of any visible element and renders each tier distinctly; RC-R03.3 sound delay equals distance over c. Never passes (TOP-3) |
| R04.0000 | Q01 Q03 Q14 Q20 | possible with labeled reconstruction | RC-R04.1 every manifest line cites a ledger claim or a gap entry; RC-R04.2 per-regiment spec completeness report; RC-R04.3 the known-correction tests; RC-R04.4 commander records list their sources and, where none exists, a registered gap and a marked reconstruction |
| R05.0000 | Q08 Q17 Q26 | possible with labeled reconstruction | RC-R05.1 each preparatory event (Buford's scouting from June 29 and 30, works, casualty carriage, hospital flows) has a cited claim; RC-R05.2 the viewer shows the event inside its window and not outside; RC-R05.3 each has a timeline row and an animation state; RC-R05.4 hospital sites match the tablet texts |
| R06.0000 | Q13 | enormous but possible | RC-R06.1 audio-delay unit test; RC-R06.2 loudness falls monotonically with distance; RC-R06.3 woods with no active source emit only natural ambience |
| R07.0000 | Q12 Q17 | enormous but possible | RC-R07.1 coverage matrix over June 26 to July 14 (and the epilogue): every row realized or registered; RC-R07.2 no gap larger than a stated interval without a labeled procedural fill (Q17.4: the stated interval is zero) |
| R08.0000 | Q25 Q27 | possible with labeled reconstruction | RC-R08.1 a scan of the plan, Part E and CLAUDE.md for any step that needs owner-supplied capture, crews, recordings, permits, historians or hardware returns zero; RC-R08.2 the asset manifest has a licence for every file; RC-R08.3 an overnight queue completes unattended (owed on the GPU) |
| R09.0000 | Q27 | enormous but possible | RC-R09.1 every phase has a budget file and the driver stops at the cap; RC-R09.2 a rerun with unchanged inputs skips finished work (hash check); RC-R09.3 each job reports cost and turns against a cap |
| R10.0000 | Q01 Q03 | possible with labeled reconstruction | RC-R10.1 kit-manifest completeness report; RC-R10.2 regression checks for each known correction; RC-R10.3 no manifest line without a claim id or a gap id |
| R11.0000 | Q12 Q17 | possible with labeled reconstruction | RC-R11.1 monotonic time per unit; RC-R11.2 no unit in two places; RC-R11.3 arrival before first appearance; RC-R11.4 every conflict has a register entry |
| R12.0000 | Q16 Q25 | enormous but possible | RC-R12.1 every catalogue item has a status; RC-R12.2 each terrain layer names its source |
| R13.0000 | Q03 Q07 Q08 Q09 Q26 | possible with labeled reconstruction | RC-R13.1 every B.8 element has a state schedule or a gap entry; RC-R13.2 the viewer state at time t equals the schedule; RC-R13.3 photo-match against 1863 photographs; RC-R13.4 each element lists a source or an inferred tag |
| R14.0000 | Q07 Q08 | possible with labeled reconstruction | RC-R14.1 scrub test: a fence before and after its damage event; RC-R14.2 an earthwork at a time before its start (absent) and at stages between start and finish |
| R15.0000 | Q11 Q22 | enormous but possible | RC-R15.1 the weather timeline matches the B.10 table; RC-R15.2 rendered sun and moon altitudes and azimuths match the ephemeris table at test times; RC-R15.3 the weather state matches Jacobs's readings for each day |
| R16.0000 | Q04 Q20 | possible with labeled reconstruction | RC-R16.1 cavalry units appear in the timeline checks; RC-R16.2 gait-cycle foot-contact test; RC-R16.3 each cavalry fight has timed rows; RC-R16.4 Spencer carbines appear only where sourced |
| R17.0000 | Q03 Q04 Q05 Q06 | possible with labeled reconstruction | RC-R17.1 zero agent instances for any unit before its documented arrival; RC-R17.2 trajectory continuity from the arrival point to the fighting position; RC-R17.3 sample audit of agents against kit records |
| R18.0000 | Q10 Q11 | possible with labeled reconstruction | RC-R18.1 night luminance histogram inside the readable band at all night hours; RC-R18.2 every night activity cites a source or a plausible-procedural tag and maps to a timeline row; RC-R18.3 every active agent visible |
| R19.0000 | Q12 Q24 | enormous but possible | RC-R19.1 from any t1 to t2 the world state equals the state reached by playing forward; RC-R19.2 jump latency within budget; RC-R19.3 the scrubbing round trip is bit-identical |
| R20.0000 | Q21 | possible with labeled reconstruction | RC-R20.1 every vegetation polygon cites a source or is tagged inferred; RC-R20.2 field state at time t matches the state schedule; RC-R20.3 photo-match against 1863 photographs where a position is documented |
| R21.0000 | Q19 Q25 | enormous but possible | RC-R21.1 source manifest status for every item; RC-R21.2 claim-ledger coverage report; RC-R21.3 the conflict list; RC-R21.4 the adversarial review log; RC-R21.5 every record has two sources or a gap tag and the citation checker finds each quote span |
| R22.0000 | Q28 | not in C.9 (added later); treated as possible with labeled reconstruction | RC-R22.1 Q28; RC-R22.2 photo-match against 1863 photographs (Q16); RC-R22.3 front-row speech intelligibility computed (p. 130, D.7 phase 15) |

A top-level row's `passes` follows 3.9 TOP-2. Its derived coverage (3.9 TOP-1) follows its children whatever the RC results.

---

## 6. The milestone checklist of Section Z as an executable test

"Before reporting any milestone complete, confirm: 1. every in-scope sub-requirement passes or is linked to an open register entry with an active reconstruction; 2. all 21 requirement IDs are represented and none dropped (Gate Q18); 3. every register entry has a reconstruction, a marking and an owner-decision field; 4. no datum lacks provenance and no `documented` tier rests on a lead (Q02, Q19); 5. conflicts are carried as scenarios; 6. machine gates Q03-Q12, Q23 pass; 7. the library status file shows no source silently skipped (Q25); 8. the Decision Log is current and no item waits on the owner except legal acts in Part D.8 and scope decisions; 9. `progress.md` is honest about what was not done and what spend was used against the caps. If any answer is no, the milestone is not complete." (p. 138, Z). CLAUDE.md adds: no milestone is reported complete unless this checklist is true and `check_governance.py` passes.

| Z | Test (all must be true) | Defined by |
|---|---|---|
| Z.1 | every in-scope sub-requirement is PASSING or LINKED-ACTIVE (L3); "in scope" is the requirement set of the milestone, never narrowed without a recorded decision | Q18.2, 1.5 |
| Z.2 | R01 to R22 and OA01 to OA09 present, wording unchanged, expected populations exist | Q18.1, Q18.3, Q18.6 |
| Z.3 | every register entry has `recon`, `marking`, `owner_q` non-placeholder; none deleted | Q18.4, Q23.7 |
| Z.4 | Q02 verdict PASS and Q19 verdict PASS (COVERED flags allowed where the gate text allows them) | Q02, Q19 |
| Z.5 | every conflict of B.2.5 and of the other lists (A-31) has all values selectable, a recorded default (U-17) and an open entry | CF-1 to CF-7 |
| Z.6 | Q03, Q04, Q05, Q06, Q07, Q08, Q09, Q10, Q11, Q12 and Q23 have verdict PASS. The stricter reading adds every gate of every requirement inside the milestone's scope (a milestone that includes sound includes Q13; one that includes cavalry, Q20; one that includes the epilogue, Q28), because Z.1 would otherwise be satisfied while a gate of an included requirement is red (A-39) | the gate sections |
| Z.7 | Q25 verdict PASS: no source row without a terminal status | Q25.1 |
| Z.8 | `decision_log.md` has an entry for every escalation trigger of H (p. 134: a register entry opened; a source conflict that changes a visible result; any request to cut scope; any change to the D.8 account list; any cap exceeded; the default timeline when sources conflict; how uncertain content is displayed; whether historian review is wanted; the slice acceptance); no line says DECIDED without an owner entry; no OPEN item remains except owner-only acts (D.8.1) and scope decisions; delegated decisions are recorded as DELEGATED | decision log checks |
| Z.9 | `progress.md` lists, for the milestone, what was not run or is owed (every NOT-RUN and `swgl`-only result, owed GPU runs, listening), what failed, and spend against caps (Q27.3) | Q27.3, U-10 |

**Not a gate, and part of any release.** `FINAL-ACCEPTANCE.md` (eight consecutive clean fresh passes, regression against the published build, performance in the green band, visual QA, tutorial PDF, copy audit) runs last before any zip or milestone is handed over; its logs are `GOVERNANCE/final-passes/pass-N.md`. A gate PASS never substitutes for a pass of it.

---

## 7. Threshold registry and the decisions to record

The plan prints a figure only where the "Plan" column names a page. "In code" is the value found in the repository (GATE-SPEC-B 5.1). ADOPTED-PROVISIONAL means: the value is used as the floor (never loosened), it is to be recorded as a delegated decision (the DD-G entries below), and it is re-measured at the first run on the real GPU or from the first measurement named. UNSET means the plan gives no figure and the repository has none: the gate is INCOMPLETE until a value and a decision id are recorded (1.8). Values are for `GOVERNANCE/gate_results/thresholds.json`, each with the metric it is measured in (a threshold without its metric is not recorded; the luminance metrics of Q10 are those of `app/tests/sky.spec.mjs`).

| Id | Gate | Plan | In code | Adopted | Status |
|---|---|---|---|---|---|
| T-Q05-1 | Q05 path joins | none ("continuous trajectories") | within 1 m | 1.0 m | ADOPTED-PROVISIONAL (DD-G01) |
| T-Q05-2 | Q05 speed bounds | none; sources are the manuals (p. 135, M.1) | double-quick bound times 1.0001 | the manual figures per gait and mover class; upper bound exact up to the rounding factor 1.0001 | ADOPTED-PROVISIONAL (DD-G01) |
| T-Q06-1 | Q06 deployment duration | none | 90 s tuning value (DEC-008) | the manual figure when read; until then 90 s, plausible-procedural, marked | ADOPTED-PROVISIONAL (DD-G01) |
| T-Q07-1 (T-SS-1) | Q07, Q09 visible span of a point change | none | declared transition tables of the structures layer | the product's declared transition duration, read and recorded in each run | ADOPTED-PROVISIONAL (DD-G02) |
| T-Q08-1 | Q08 tool count | 12 spades for the 6th Wisconsin (p. 93) | 12 | 12 | PLAN |
| T-Q10-1 | Q10 frame and region mean luminance | none | mean at least 24 of 255 | 24 of 255 | ADOPTED-PROVISIONAL (DD-G03) |
| T-Q10-2 | Q10 | none | 5th percentile at least 6 | 6 | ADOPTED-PROVISIONAL (DD-G03) |
| T-Q10-3 | Q10 | none | under 2% of pixels below 8 | 2% below 8 | ADOPTED-PROVISIONAL (DD-G03) |
| T-Q10-4 | Q10 frame Michelson contrast (p95, p5) | none | at least 0.2 | 0.2 | ADOPTED-PROVISIONAL (DD-G03) |
| T-Q10-5 | Q10 night against day | none | night under 0.75 of day; lowest floor setting mean at least 12 | 0.75; 12 | ADOPTED-PROVISIONAL (DD-G03) |
| T-Q10-6 | Q10 picture grid | none ("every night time") | ten sample times | every 10 minutes and at every night-activity or light-source state change, analytic floor at every minute | ADOPTED-PROVISIONAL (DD-G03) |
| T-Q10-7 | Q10 minimum projected size of an entity "in view" | none | none | UNSET: the runner records the size the selection hit-test uses; INCOMPLETE until recorded | UNSET |
| T-Q10-8 | Q10 tier-tag contrast at night | none ("stay legible", p. 114) | none | 3:1 (the WCAG AA non-text figure FINAL-ACCEPTANCE already uses) | ADOPTED-PROVISIONAL (DD-G03) |
| T-Q10-9 | Q10 entity-against-surround Michelson contrast | none | none (the existing 0.2 is a frame metric) | UNSET: the runner measures the same metric on the day frames of the same views and the value is recorded by decision; INCOMPLETE until then | UNSET |
| T-Q11-1 | Q11 sun altitude and azimuth | none | 0.05 degrees | 0.05 degrees | ADOPTED-PROVISIONAL (DD-G04) |
| T-Q11-2 | Q11 moon altitude, azimuth, phase angle | none | 0.5 degrees | 0.5 degrees | ADOPTED-PROVISIONAL (DD-G04) |
| T-Q11-3 | Q11 rise, set, twilight times | none | 2.0 minutes | 2.0 minutes | ADOPTED-PROVISIONAL (DD-G04) |
| T-Q11-4 | Q11 full-moon instant | within one minute of the published value (p. 111, B.10.2) | 1.0 minute | 1.0 minute | PLAN |
| T-Q11-5 | Q11 stored table against product | none | 0.0006 degrees | 0.0006 degrees | ADOPTED-PROVISIONAL (DD-G04) |
| T-Q11-6 | Q11 shadow azimuth in frames | none | none | equal to T-Q11-1 | ADOPTED-PROVISIONAL (DD-G04) |
| T-Q12-1 | Q12 jump latency | "within budget" (p. 124), no figure | none | UNSET; measured on the real GPU | UNSET |
| T-Q12-2 | Q12 random jump times | 100 (p. 130, D.7 phase 12) | not tested at that size | at least 100, forward and backward | PLAN |
| T-Q13-1 | Q13 delay | none ("within tolerance", p. 5) | 1 ms | 1 ms | ADOPTED-PROVISIONAL (DD-G05) |
| T-Q15-1 | Q15 p95 paced | none | 20 ms | 20 ms | ADOPTED-PROVISIONAL (DD-G05) |
| T-Q15-2 | Q15 CPU plus GPU p95 uncapped | none | 10 ms | 10 ms | ADOPTED-PROVISIONAL (DD-G05) |
| T-Q15-3 | Q15 long task | none | 50 ms | 50 ms | ADOPTED-PROVISIONAL (DD-G05) |
| T-Q15-4 | Q15 input answer | none | 100 ms | 100 ms | ADOPTED-PROVISIONAL (DD-G05) |
| T-Q16-1 | Q16 reprojection RMS and landmark count | none | none (verdicts written by eye) | UNSET until the first documented camera position exists | UNSET |
| T-Q22-1 | Q22 continuous channels | none | none | the precision of the timeline value (temperature to one degree F as printed; discrete channels exact) | ADOPTED-PROVISIONAL (DD-G05) |
| T-Q24-1 | Q24 per-pixel colour threshold | none | 0.1 (main site) | at most 0.1 | ADOPTED-PROVISIONAL (DD-G05) |
| T-Q24-2 | Q24 differing-pixel ratio | none | 0.002 (main site) | at most 0.002 | ADOPTED-PROVISIONAL (DD-G05) |
| T-OA01-1 | OA01 enter and back cycles | none (owner) | the count in `leak.spec` | that count, recorded | ADOPTED-PROVISIONAL (DD-G06) |
| T-OA06-1 | OA06 documented share | owner: "well over 97%" | none | 97% as the floor, actual reported | OWNER FIGURE |
| T-Q27-1 | Q27 caps, guards, N sessions | none (Appendix F blank, p. 143) | all null | owner-approved values only | OWNER |

**Decisions to record** by appending to `decisions/DELEGATED-DECISIONS-2026-11-11.md` (delegated, reversible, no gate lowered, nothing narrowed):

- **DD-G01** thresholds of Q05 and Q06 (T-Q05-1, T-Q05-2, T-Q06-1).
- **DD-G02** the visible span of a transition (T-Q07-1).
- **DD-G03** the night thresholds and grid (T-Q10-1 to T-Q10-6, T-Q10-8).
- **DD-G04** the ephemeris tolerances (T-Q11-1 to T-Q11-3, T-Q11-5, T-Q11-6).
- **DD-G05** thresholds of Q13, Q15, Q22, Q24 as provisional floors, to be re-measured on the real GPU.
- **DD-G06** the reading rules of this file that settle an ambiguity in the stricter direction: linked is not passing (A-03), "open" means open or awaiting owner (A-04), the link levels and "active reconstruction" (A-05), the `source_status` vocabulary (1.3), no vacuous pass (U-03), derived coverage of top-level rows (A-40), domain gates for S rows (A-12), the cycle count of OA01.

---

## 8. Ambiguity register

Each entry says where the text is unclear, the reading adopted (always the one under which fewer items can pass), and where it acts.

| Id | Where | Ambiguity | Reading adopted (stricter) | Acts in |
|---|---|---|---|---|
| A-01 | p. 132 Law cl. 1, p. 123 D.1, p. 134 F, p. 136 Q18 (21) against p. 133 A, p. 123 V15, p. 143 App. E, p. 136 Q28 (22) | how many requirements | 22 (R01 to R22) plus OA01 to OA09; `gates.json` keeps the printed words | Q18.1, 2.1 |
| A-02 | p. 136 Q: "its gate" against `gate_ids` lists | one gate or all listed gates | every applicable listed gate must pass (conjunction); necessary, not sufficient | U-01 |
| A-03 | p. 134 F, p. 136 Q18, Z.1 ("passing or linked"); sub-requirement texts "or an open register entry", "or registered" | does linking count as passing | no: two states; the register branch gives COVERED or LINKED | U-04, all classes |
| A-04 | p. 138 App. A statuses against the code's "not closed" | what is an open entry | `open` and `awaiting owner` only; `decided` means implement and pass | 1.5 |
| A-05 | p. 134 F "work continuing on the best reconstruction"; p. 136 Q18 "active reconstruction" | undefined | L3: complete fields, marking in product, dated library search, reconstruction present in the build | 1.5, Q18.2 |
| A-06 | p. 62 B.2.5, p. 133 B | what "carried as a selectable scenario" requires | every value reachable in the viewer, changing downstream state, with chosen and rejected values and sources shown | CF-2, U-02 P4 |
| A-07 | p. 136 Q02 and p. 139 App. B (one non-lead source and an extract); p. 126 D.4.3 stage 7 (two independent sources or one Tier 1); p. 136 Q19 (two independent sources or a flag) | what makes a datum documented | `documented` needs one non-lead source and a matched extract (necessary); the independence class (two independent, or one) is computed and a visible datum with fewer than two independent non-lead sources carries the flag even for one Tier 1 source | Q02.3, Q19.4 |
| A-08 | p. 136 Q: thresholds "from the vertical slice"; no slice, no figures | where thresholds come from | only recorded thresholds; unset makes the gate INCOMPLETE; existing values adopted as floors | 1.8, section 7 |
| A-09 | p. 136 Q15 | "target agent counts" | one-to-one at the default and at the upper end of the strength ranges, never capped | Q15.1, Q15.4 |
| A-10 | p. 136 Q17 | "visual realization" is not defined | a realization record validated by the query harness in every scenario of the row's group | TL-2 |
| A-11 | p. 134 F expected populations | the sub-requirements for kit units, structures, vegetation classes and library batches are missing | Q18 FAIL until generated from the data | 2.3 |
| A-12 | p. 136 Q07, Q09 against the 88 S rows | S rows name objects that are not fences or buildings | gates by object prefix; every object must pass; unmapped or road rows cannot pass | 2.4 |
| A-13 | p. 136 Q08 names gun emplacements; R13.G carries Q14 only | which gate judges a prepared emplacement | both | 3.5, Q08 |
| A-14 | p. 136 Q08 (staking, digging, piling, completion), p. 93 B.7.4 (seven stages), p. 137 V.3 | stage names differ | all in order; staking = layout, digging = felling or digging, piling = stacking or parapet | Q08.2 |
| A-15 | p. 90 to 92 B.7.2; R14.E text "is built on screen" | E rows that are occupation, damage, no construction or open gap | per-type checks; a negative is verified, an open gap never passes | 3.4 |
| A-16 | p. 136 Q10; p. 114 B.10.5 | "every night time", "every unit and activity in view", what is night | all grid times with sun below -0.833 degrees; per-entity regions; picture grid of T-Q10-6 | Q10 |
| A-17 | p. 111 B.10.2 (39.83 N) against p. 118 S-086 (39.82 N); "independent" | which site, what independent means | 39.83 N with the defect recorded; two methods sharing no code or coefficients | Q11.2, Q11.3 |
| A-18 | 295 phrase-only and 1 no-date rows | targets for Q12, Q10, Q17 when no clock minute | the bounds of the date or part-of-day window and a seeded sample inside | TL-5 |
| A-19 | p. 136 Q12 | "state identical" and "header ... match" | digest over a registry of all time-dependent layers; header equals the build, a stale cache refused | Q12.4, Q12.6 |
| A-20 | p. 137 S.2 (distance over the speed of sound) | wind term in the delay | baseline has none; wind and refraction only as labeled scenarios | Q13.1 |
| A-21 | p. 136 Q16 | "known camera positions", match metric | a non-lead documented position; threshold unset until one exists; verdict by metric | Q16 |
| A-22 | p. 136 Q19, p. 136 P.3 | what is a visible-result datum, independence | census by class; the independence graph of `independent_of` | Q19.1, Q19.3 |
| A-23 | p. 136 Q20 | "documented cavalry unit", "documented times" | the verified OOB; the action table as a machine table | Q20.1, Q20.2 |
| A-24 | p. 136 Q21; p. 135 L.7 | "documented-or-ranged" | a ranged value needs tag, register entry and range; the scene must lie inside | Q21 |
| A-25 | p. 136 Q22 | "scene weather matches the timeline" when parts are modelled | one state object for every consumer; modelled parameters part of the timeline, tagged | Q22.2, Q22.3 |
| A-26 | p. 136 Q23 | what is an item, whether the overlay is on | census by class; overlay on by default (DD-22) | Q23 |
| A-27 | p. 136 Q24 | no baseline, no tolerance, one renderer assumed | pinned baselines per renderer class; software cannot certify the real GPU | Q24 |
| A-28 | p. 137 X.1 (scheduled, ingested, blocked, partial), p. 136 Q25 (three), p. 126 D.4.3 (read, blocked, print-only) | which statuses | four terminal statuses; partial is split | Q25.2, CT-1 |
| A-29 | p. 136 Q26 | what is a casualty event | every killed, wounded, missing and captured event including procedural individuals; each with a disposition | Q26.1 |
| A-30 | p. 136 Q27 and the paragraph after the table | is the verification sentence part of Q27 | yes, as Q27.5, and a universal rule | U-11, Q27 |
| A-31 | p. 62-63 B.2.5 (47); p. 136 Q28; E.5 (p. 134); B.6.14.1; B.12; S-001 | conflicts the plan prints outside C-001 to C-047 | every one is a conflict needing a record and selectable values; the register file and `check_governance.py` (fixed at 47) change together | CF-8, Q28.4 |
| A-32 | p. 136 Q05 | "documented ranges" for wagons, limbers, "in column"; lower bounds | upper bound always; lower bound for declared constant-gait segments; a missing range is BLOCKED-INPUT and COVERED | Q05.1, Q05.5 |
| A-33 | p. 136 Q03 | no modern object while the ground is today's aerial | the ground must be audited and corrected; a disclosure is not a pass | Q03.4 |
| A-34 | p. 136 Q01 | what the "verified OOB table" is | built from the Official Records with ranges and basis; the layer must equal it | Q01.1 |
| A-35 | p. 135-136 O.2 | "not before the earliest ... unless an owner decision chooses another scenario" | both an absolute invariant and a per-scenario one | Q04.1, Q04.2 |
| A-36 | `requirements.json` S-080..S-088 (Q07, Q09) against p. 136 Q28 | which gate | Q28 for the state, plus the gate of any fence, ground cover or sky it names | 3.3 SS-11 |
| A-37 | p. 124 D.2 O7; B.2 rows | timeline rows with no scene consequence | a card is not a visual realization; they are LINKED | TL-2 K4 |
| A-38 | p. 136 Q06 | "fighting position", deployment duration | the first documented position at which the unit fights or holds; the duration plausible-procedural until read | Q06.2 |
| A-39 | p. 138 Z.6 | only Q03 to Q12 and Q23 named | plus the gates of every requirement in the milestone's scope | section 6 |
| A-40 | top-level texts; p. 134 F | the top-level row's own link and pass | derived coverage; `passes` needs all children PASSING and the RC checks | 3.9 |
| A-41 | OA03, OA06 owner words | "complete roster", "well over 97%" | OA03 cannot pass without a recorded interpretation; OA06 floor 97% with the actual reported | 3.10 |
| A-42 | OA04 owner words include "where no source exists the gap is registered" | does the register branch pass | no: LINKED | 3.10 |
| A-43 | OA08 "withdrawal" | how far | through the retreat rows to Falling Waters | 3.10 |
| A-44 | p. 135 M.4 cites "Gate Q05, Q06" for clip checks | the gate numbers do not fit clip review | clip checks are OA07 and animation checks; Q05 and Q06 judge unit movement and are also applied to locomotion clips | OA07 |
| A-45 | p. 134 D; p. 136 P.1 | what counts as a datum | every row of every history table, every loaded data file and asset, every fact stated in the interface | Q02.1 |
| A-46 | p. 136 Q09 has no flag branch; p. 100 B.8.7 header flags date-only windows | may a flagged plain-reading window pass Q09 | COVERED, not PASS | Q09.2 |
| A-47 | p. 137 W.1 gaps; p. 136 Q14 | "within documented figures" with no per-elevation tables | COVERED by the register until read, not PASS | Q14.2 |
| A-48 | p. 136 Q07 "visible" | how long | the product's declared transition duration, recorded | SS-4, T-Q07-1 |
| A-49 | p. 136 Q "Run in CI" | no CI exists | runners under the machine lock, records as 1.7 | U-22 |
| A-50 | p. 9 B.2 | the roughly 20-minute clock offset between armies | not applied, carried as uncertainty | U-18 |
| A-51 | p. 136 Q08 "carries a work crew"; p. 90 B.7.1 | stand-in crews | allowed only flagged "builder unknown" | Q08.3 |
| A-52 | p. 121 C.10, p. 137 S.1 (label all audio modern reconstruction) against DEC-001 and DD-14 | audio marking | disclosure in the panel and overlay, never called period sound; tier marking stays | Q13.7, Q23.4 |

---

## 9. What the gates need from other workstreams (inputs owed)

State on 2026-11-13 from the working tree; the inputs are named in the task context as in production by the workstreams shown. A runner reads whatever exists when it runs; an absent input makes the affected items BLOCKED-INPUT, never PASS.

| Input | Gates and classes | Producer | State |
|---|---|---|---|
| Verified OOB table (`kit/verified_oob.json`) | Q01, Q04, Q20, OA02 to OA04 | bt-oob-kit | absent |
| Verified battery table (`kit/verified_batteries.json`) | Q14, GE rows | bt-oob-kit | absent |
| Claim ledger over all datum classes, `independent_of` graph | Q02, Q19, CF rows, TL-3 | bt-world-content | absent (position and troop-map ledgers exist) |
| Realization records and the query harness | Q17, TL, EP, OA08 | bt-realizations | `GOVERNANCE/realizations/` empty |
| Correction records (`timeline_corrections/`, `evidence_corrections/`) | effective tier, TL, SS, WK, GE, PE, EP | bt-timeline-closure, bt-evidence-closure | absent |
| Vegetation schedule and scene vegetation | Q21, R20 | bt-world-content | absent |
| Casualty and hospital flow data | Q26 | bt-world-content | absent (`hospitals.json` has the 23 sites) |
| Building-state and fence-state completion (geometry for every record) | Q07, Q09, SS | bt-world-content, bt-units-positions | partial (records without geometry) |
| Exported check functions | all picture and state gates | bt-renderer | `app/docs/GATE-HOOKS.md` lists the extension and tier-mark hooks only |
| Film path object, November 19 scene, Address conflict record | Q28, EP | bt-renderer, bt-evidence-closure | absent |
| Conflict register beyond C-001..C-047 and `check_governance.py` made to match | CF-8, Q28.4 | bt-evidence-closure with this workstream | absent; `check_governance.py` fixes 47 |
| Sub-requirement populations of 2.3 | Q18 | the owner of `seed_register.py` (request note `horde/requests/bt-gates-subreq-populations.md`) | absent |
| Camera positions of period photographs | Q16, CT | bt-web-evidence | none documented in the sources read |
| Thresholds file and the DD-G entries | all | this workstream | to be written with the runners |
| A real-GPU run (frame time, GPU-class baseline, confirmation of `swgl` pictures) | Q15, Q24, Q10, Q22, Q07, Q09 pictures | the owner's machine | owed; not attainable in the container |
| Caps approved by the owner | Q27 | the owner | blank (Appendix F) |
| Python packages for the independent ephemeris | Q11 | this workstream (PyPI reachable) | astropy absent |
| Any second Official Records witness (HathiTrust, eHistory) | Q25.3 | bt-web-evidence | hosts answered with bot blocks on 2026-11-13: blocked, not retried |

Owner-only steps these gates stop at (never done by Claude, p. 130, D.8.1; CLAUDE.md): approving the caps (Q27); purchases of print-only sources such as Frassanito and the Coates and Thomas appendix (Q16, Q25); any account, licence or permission request (Q25); deployment of any build; a real-GPU run on the owner's machine (Q15, Q24).

---

## 10. Page index

| Topic | Pages |
|---|---|
| The Law (clauses 1 to 8) | 132 |
| Requirements R01 to R22, definitions, tiers, boundary of authority | 133 |
| Session protocol, efficiency rules, budget caps | 133 |
| History layer tables (D), evidence rules (E), sub-requirement model (F), terrain pipeline (G), decisions (H), infrastructure (I), journal (J) | 134 |
| Kit (K), lighting, weather, vegetation and night (L), motion (M), numbers (N), order of battle and arrival rules (O.1, O.2 start) | 135 |
| Arrival rules continued (O.2 to O.5), provenance and claim ledger (P), quality gates Q01 to Q28 (Q), register start (R) | 136 |
| Register end, sound (S), timeline and cache (T), interface and marking (U), effects and state change (V), weapons (W), source audit (X) | 137 |
| Milestones (Y), the forbidden list and final checklist (Z), Appendix A, Appendix B start | 138 |
| Appendix B end, Appendix C.1 sources | 139 to 142 |
| Appendix E traceability matrix, Appendix F budget | 142 to 143 |
| Coverage map (tests per requirement) | 4 to 5 |
| B.0, B.1 strengths and casualties, B.2 master timeline rules and columns | 8 to 9 |
| B.2.4 arrival and departure ledger | 59 to 63 |
| B.2.5 conflict register C-001..C-047 and animation gating rules | 62 to 63 |
| B.3 order of battle, B.4 commanders, B.5 identifiability | 64 to 66 |
| B.6.11 ammunition and loading, B.6.12 kit manifest and validator, B.6.13 gaps | 75 to 76 |
| B.6.14 artillery (pieces, ammunition, drill, orders of battle, July 3 cannonade) | 78 to 85 |
| B.6.15 cavalry (orders of battle, action table, tactics, states) | 85 to 90 |
| B.7 fortifications: B.7.2 chronology E-01..E-18, B.7.3 pre-existing P-01..P-14, B.7.4 stages, B.7.5 gun emplacements G-01..G-18, B.7.6 modern profile | 90 to 94 |
| B.8.2 buildings, B.8.3 fences, B.8.4 roads, B.8.5 hospitals, B.8.6 horses | 94 to 99 |
| B.8.7 time-keyed schedule S-001..S-079, B.8.8 must-show and asset classes | 100 to 102 |
| B.9 terrain source catalogue (45 items; tables 1 to 5) | 103 to 109 |
| B.10.1 weather, B.10.2 astronomy, B.10.3 vegetation | 110 to 112 |
| B.10.4 smoke, dust and sound, B.10.5 the 24/7 day-night specification | 113 to 114 |
| B.10.6, B.10.7 pipeline and gaps, B.11 unverified items | 115 to 116 |
| B.12 epilogue: jump, rows E-001..E-014, states S-080..S-088, Lincoln | 116 to 119 |
| C.2 scrubbing, C.4 limits of "100%", C.6 audio, C.9 verdicts, C.10 substitutes | 119 to 122 |
| D.1 requirements, D.2 assessment (tests), D.3 architecture | 123 to 125 |
| D.4 source audit pipeline | 125 to 127 |
| D.5 efficiency (D.5.12 stop conditions), D.6 GPU plan | 127 to 129 |
| D.7 phases and exit tests, D.8 owner steps and decisions, D.9 risks | 129 to 131 |

**Repository files named in this specification** (all under `docs/battle-theatre/` unless a path says otherwise): `BIBLE/plan-clean.txt`; `GOVERNANCE/requirements.json`, `gates.json`, `register_index.json`, `register_aliases.json`, `subreq_links.json`, `timeline_seed.jsonl`, `timeline_verified.jsonl`, `timeline_windows.jsonl`, `epilogue_seed.jsonl`, `conflict_register.json`, `conflicts_structured.json`, `decision_log.md`, `decisions/DELEGATED-DECISIONS-2026-11-11.md`, `decisions/conflict_defaults.json`, `library/status*.json`, `budget/phase_budget.json`, `hardware_profile.json`, `FINAL-ACCEPTANCE.md`; `structures/structures.json`, `state_schedule.json`, `works_stages.json`, `hospitals.json`; `kit/*.json`; `history/units.json`; `app/docs/GATE-HOOKS.md`; and `tools/bt/check_governance.py`, `check_coverage.py`, `link_subreqs.py`, `register_from_proposed.py`.
