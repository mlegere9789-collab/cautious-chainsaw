# Historical reviewer charter (draft)

> **Status: DRAFT. Nothing here is approved by the owner, and nothing here ships or is published until the owner approves it.** No reviewer has been named. This charter is the one-page standard the plan calls for (D-HIST-REVIEW, WP-DEC-10); every number in it is a proposal or an estimate marked [E] that the owner and the reviewer must confirm. The role does not exist until a named person accepts it in writing.

## 1. Purpose

The Gettysburg Interactive Map shows unit positions, casualties and, above all, **times**. Every historical time on the site is currently an unreviewed reconstruction: 129 researched fact rows (confidence H/M/L 18/66/45), 33 proposed clock anchors (12 solid, 13 medium, 5 needing a historian, 3 design) and 27 content defects that no clock can fix. The AI toolchain that produced the proposals cannot certify them: an A+ claim on historical accuracy needs a non-author artefact (D-EVIDENCE), and this role produces it.

The reviewer turns rows from `proposed` into `reviewed`, `contested` or `deferred` with a citation, so the site can say what it knows and how sure it is. If no reviewer is found by 2027-01-31 (DG-3) the site ships labelled instead: every time printed with "about", an "Unreviewed reconstruction" pill, and no claim of accuracy.

## 2. Scope: what the reviewer decides

| item | count | where it lives |
|---|---|---|
| The five needs-historian anchors: t75 Lee's order, t90 XII Corps/Johnson, t248 Sickles's advance, t275 the 20th Maine charge, t538 the infantry step-off | 5 | `docs/editorial/anchor-review-packet.md`, one page each |
| Spot checks of the weak anchors (S anchors on M-confidence rows or failing the evidence rule, anchors with no strong source family): t1, t5, t28, t36, t53, t302, t326, t500, t515, t556; plus the anchors least predictable from their neighbours | 10 flagged, a few more by leave-one-out | same packet, section 4 |
| Fact rows with confidence L or tag S/L that feed an anchor or a displayed time | 45 rows (of 129) | `docs/plan/data/time-facts.csv` |
| Content defects: 4 wrong-day, 12 misordered, 9 composite events, 2 unverified quotations; text corrections (V-020, V-021, V-022, t324, t100); Pickett's placements | 27 events plus text items | `docs/editorial/time-audit.md` section 4 (the triage) |
| Quotation sources and attributions (the Avery note, the Lincoln line, the Alexander notes) | about 5 | triage table |
| Wording of contested times: a single "about" time, or a range with "Sources differ" | per item | decision record |

**Not the reviewer's to decide** (owner): scope, product wording and names, the design conventions (local mean time, first-light day tabs, "about" threshold, night policy), the three design anchors and the circular t5, and whether July 4 items become epilogue cards. The reviewer is not asked to write code, to judge the interface, or to approve anything outside history.

## 3. Standard of evidence

1. **Evidence classes.** Primary (an Official Records report, a participant's own account, a dated dispatch), scholarship (Pfanz, Coddington, Sears, Hessler, Wert, Gottfried, Busey and Martin, Desjardin, Hess and similar, cited by page), compilation (Stone Sentinels, The History Junkie, Civil War Cycling: **low authority**, an uncited timeline is a cross-check, never proof), search summary and recollection (**not evidence**: they say where to look). A time is `S` (solid) only with one primary report or two independent strong sources; the rule is mechanical and the tool flags the exceptions.
2. **Contested-fact rule.** Keep the disagreement visible: a range, the sources, the reviewer's reading. Choose one display time inside every credible range where possible; show "between about X and Y" with a "Sources differ" link only where the choice would change the story order.
3. **Time base.** Local mean time as the sources report it (no time zones existed in 1863; EST would be about nine minutes later). Every displayed time is rounded to five minutes and carries "about" until the item is signed and its uncertainty is under ten minutes.
4. **Quotations.** Verbatim with a source and page, or paraphrased and labelled as a paraphrase. No reconstructed dialogue presented as a quotation.
5. **Responsible language.** Period language is quoted with a note; sensitive content follows the owner's policy (Explore mode notes and a hide toggle; Classroom collapses it).
6. **What "cannot verify" means.** Saying so is a valid, valuable decision. The row stays `proposed` and keeps its "about" wording; nothing is lost.

## 4. Time commitment [E, owner decision 1]

- The time programme adds about **31-51 reviewer hours** (five anchors 4-8 h; 45 low-confidence rows 8-11 h; 27 defects 9-14 h; text and quotes 3-5 h; Pickett 3-6 h; other claims 2-4 h; read-through 2-3 h) on top of the Historian programme's 59-95 h.
- Default cadence proposed: 5-6 hours a week for 8-10 weeks (December 2026 to January 2027), then 3-4 hours a week for maintenance, a quarterly corrections review and a 100-answer audit of the Historian.
- These estimates exceed the 3-4 hours a week the register assumed. If the reviewer can give less, the order in the packet (hero moment first) means the most valuable items are done first and the rest stay `proposed`.

## 5. Second reader

A volunteer guide, teacher or Round Table member confirms a **30% sample** of the reviewer's decisions independently. The batch is accepted when Cohen's kappa on the sample is at least 0.6 (the standard used for the Historian audit). The second reader does not need to be a specialist; they confirm that the citation supports the claim.

## 6. Deliverables

- One `decisions.jsonl` line per decision (schema in `docs/editorial/sign-off-states.md`), committed by the owner. Decisions are keyed by item id, not by text, so they survive regeneration.
- A short note on anything the reviewer could not verify and which source would settle it (the packet lists the unread works per anchor).
- A yes/no per row on whether the row's published wording ("about", range, "Sources differ") is acceptable.

## 7. Independence and conflicts

The reviewer did not author the anchors and is not the second reader. Any relationship with a source, publisher or the site is declared before the first decision. The reviewer can veto any claim on the site that they judge unsupported; a veto changes the item to `contested` or `withdrawn` and the owner decides the wording.

## 8. Credit and publication

With the reviewer's permission the site names them (and the second reader) on the Sources & Times page and beside each correction. They may choose no credit; the site then says "reviewed by a named historian on file". Nothing is published under their name without their approval of the exact wording.

## 9. Fallback when nobody is named

Rows stay `proposed`. Every time prints with "about"; the pill "Unreviewed reconstruction" appears on the clock popover, the event card footer and Historian answers; the phrases "reviewed", "verified" and "accurate to the minute" are barred by CI (TM-V18); hour pages and the dated share image are held. The site ships and improves; it does not claim what has not been checked.

## 10. Timeline (gates from the register)

| gate | date | what |
|---|---|---|
| DG-2 | 2026-11-30 | a reviewer and a second reader are named, or the fallback is chosen |
| sprint | 2026-12 to 2027-01-31 | decisions arrive; the developer regenerates anchors, golden table and `dv` after each batch |
| DG-3 | 2027-01-31 | D-TIME sign-off, or the labelled fallback |
| target | 2027-06-01 | reviewed clock live, three weeks before the anniversary freeze |

## 11. What the owner must provide (open)

1. The reviewer's and second reader's names, hours per week, credit preference, and terms of engagement (compensation is not decided here; none is assumed).
2. Permission to send the three drafted, unsent permission emails (NPS CWSS, Gettysburg NMP Research Center, ACHS/Musselman) that widen source access.
3. The contact address for corrections (register: `corrections@` on the domain, D-CONTACT); acknowledgement within three days is a target [E], not a promise, until the owner confirms it.
4. The owner's decisions on the design anchors, the "about" threshold (10 or 20 minutes) and the night policy.

Nothing in this charter has been sent to anyone.
