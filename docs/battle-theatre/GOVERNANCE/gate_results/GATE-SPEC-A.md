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
| `ENV-` | environment object | by channel: crop (S-033) Q21; water and weather (S-069 Plum Run) Q22; a held position (S-067 withdrawal) Q04, Q05, Q06; a cemetery ground (S-045) Q09 for its building part and Q07 for its fence part | |
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
| K4 context | an order, decision or event with no scene consequence (an administrative decision, an off-field act) | none by itself: a card in the Events list is not a visual realization. A realization exists only if a scene consequence is verifiable (for example T1-001: two wagons per brigade shows as the train of each brigade) |
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

- **CF-1 Record.** `conflicts_structured.json` holds every printed value (the "All values" cell), each with source keys, tier and a `scenario_id`; the "Recommended default" (PENDING OWNER) and the delegated default (`decisions/conflict_defaults.json`) are recorded separately; no alternative is deleted (p. 62: "every value in the 'All values' column remains selectable in the viewer"). The recommended default is not always one of the values (C-001: about 01:00 is not in the list); it is stored as a value of its own, tier plausible-procedural (a constructed default: "chosen for coherence ... not because an alternative is disproved", p. 62).
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
